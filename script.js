// -------------------------
// Mobile header dropdown
// -------------------------
const headerEl = document.querySelector(".site-header");
const toggleBtn = document.querySelector(".nav-toggle");
const mobileMenu = document.querySelector("#mobile-menu");

function setMenu(open) {
  if (!headerEl || !toggleBtn || !mobileMenu) return;

  headerEl.classList.toggle("is-menu-open", open);
  mobileMenu.classList.toggle("is-open", open);

  toggleBtn.setAttribute("aria-expanded", String(open));
  toggleBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    const isOpen = toggleBtn.getAttribute("aria-expanded") === "true";
    setMenu(!isOpen);
  });
}

// Close after clicking any mobile menu link
if (mobileMenu) {
  mobileMenu.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    setMenu(false);
  });
}

// Close on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

// Close if resizing to desktop (prevents “stuck open”)
window.addEventListener("resize", () => {
  if (window.innerWidth > 900) setMenu(false);
});


// -------------------------
// Slideshow (10 images)
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  const slides = Array.from({ length: 10 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return `images/hero-${n}.jpg`;
  });

  const slideEls = document.querySelectorAll(".hero-slideshow .slide");
  if (slideEls.length < 2) return;

  const [a, b] = slideEls;

  const FADE_MS = 1800;     // must match CSS transition duration
  const INTERVAL_MS = 4000; // time per slide (includes fade)

  let index = 0;
  let showingA = true;
  let locked = false;
  let timer = null;

  function preload(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  // init
  a.src = slides[index];
  a.classList.add("is-visible");
  b.classList.remove("is-visible");

  // preload ahead
  new Image().src = slides[(index + 1) % slides.length];
  new Image().src = slides[(index + 2) % slides.length];

  async function nextSlide() {
    if (locked) return;
    locked = true;

    const incoming = showingA ? b : a;
    const outgoing = showingA ? a : b;

    const nextIndex = (index + 1) % slides.length;
    const nextSrc = slides[nextIndex];

    await preload(nextSrc);

    // set incoming while hidden
    incoming.src = nextSrc;

    // force layout so opacity transition is consistent
    incoming.offsetHeight;

    // true crossfade (same duration every time)
    incoming.classList.add("is-visible");
    outgoing.classList.remove("is-visible");

    window.setTimeout(() => {
      showingA = !showingA;
      index = nextIndex;
      locked = false;

      // keep preloading ahead
      new Image().src = slides[(index + 1) % slides.length];
      new Image().src = slides[(index + 2) % slides.length];
    }, FADE_MS);
  }

  // Use recursive timeout (more consistent timing than setInterval during heavy repaints)
  function loop() {
    timer = window.setTimeout(async () => {
      await nextSlide();
      loop();
    }, INTERVAL_MS);
  }

  loop();

  // optional: pause when tab is hidden (prevents timing drift)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (timer) window.clearTimeout(timer);
      timer = null;
      locked = false;
    } else {
      if (!timer) loop();
    }
  });
});


// -------------------------
// Active nav link on scroll
// Works for desktop .nav-link only (mobile menu links don’t need bold active)
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav .nav-link");

  function activateNav() {
    let current = "";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 120;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("is-active");
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("is-active");
      }
    });
  }

  window.addEventListener("scroll", activateNav, { passive: true });
  activateNav();
});


// -------------------------
// LinkedIn carousel arrows (index page)
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  const track = document.querySelector(".linkedin-track");
  const prev = document.querySelector(".linkedin-arrow.prev");
  const next = document.querySelector(".linkedin-arrow.next");
  if (!track || !prev || !next) return;

  function cardStep() {
    const card = track.querySelector(".linkedin-post");
    if (!card) return 320;
    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || "16") || 16;
    return card.getBoundingClientRect().width + gap;
  }

  prev.addEventListener("click", () => {
    track.scrollBy({ left: -cardStep(), behavior: "smooth" });
  });

  next.addEventListener("click", () => {
    track.scrollBy({ left: cardStep(), behavior: "smooth" });
  });
});

(function () {
  /**
   * LinkedIn Embed Loader
   * ─────────────────────────────────────────────────────────────
   * Strategy:
   *  1. Use IntersectionObserver to load iframes only when visible
   *     (avoids LinkedIn rate-limiting from simultaneous requests).
   *  2. Stagger each card's iframe by 300ms so they don't all fire
   *     at once even when multiple are in view.
   *  3. On error OR if the iframe loads a blank/404 page, retry
   *     once after a 4-second delay by re-assigning src.
   *  4. After 2 failed attempts, show a graceful fallback link
   *     so the user can still reach the post.
   * ─────────────────────────────────────────────────────────────
   */

  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 4000;
  const STAGGER_MS = 300;

  function loadIframe(iframe, attempt) {
    attempt = attempt || 1;

    const src = iframe.dataset.src;
    if (!src) return;

    // Assign (or re-assign) src to trigger a fresh load
    iframe.src = ''; // force a reload if retrying
    iframe.src = src;

    iframe.addEventListener('load', function onLoad() {
      iframe.removeEventListener('load', onLoad);

      // Best cross-origin heuristic: if we CAN access contentDocument,
      // LinkedIn served a same-origin error page (blank). Retry.
      // If blocked (cross-origin), the real embed loaded successfully.
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc && (!doc.body || doc.body.innerHTML.trim() === '')) {
          scheduleRetry(iframe, attempt);
        }
      } catch (e) {
        // Cross-origin block = LinkedIn's real embed loaded ✓
      }
    }, { once: true });

    iframe.addEventListener('error', function onError() {
      iframe.removeEventListener('error', onError);
      scheduleRetry(iframe, attempt);
    }, { once: true });
  }

  function scheduleRetry(iframe, attempt) {
    if (attempt >= MAX_RETRIES) {
      showFallback(iframe);
      return;
    }
    setTimeout(function () {
      loadIframe(iframe, attempt + 1);
    }, RETRY_DELAY_MS);
  }

  function showFallback(iframe) {
    const wrapper = iframe.closest('.linkedin-embed');
    if (!wrapper) return;

    const post = iframe.closest('.linkedin-post');

    // Read the post title stored in data-title on the article element
    const title = (post && post.dataset.title) ? post.dataset.title : '';

    wrapper.innerHTML =
      '<div class="linkedin-embed-fallback">' +
        (title
          ? '<p class="fallback-quote">\u201C' + title + '\u201D</p>' +
            '<p class="fallback-byline">\u2014 by Leda Skenderi</p>'
          : '<p class="fallback-byline">\u2014 by Leda Skenderi</p>'
        ) +
        '<span class="fallback-cta">Click on Open to read</span>' +
      '</div>';
  }

  // ── IntersectionObserver setup ──────────────────────────────

  function initLinkedInEmbeds() {
    const iframes = document.querySelectorAll('.linkedin-embed iframe[data-src]');
    if (!iframes.length) return;

    let staggerIndex = 0;

    // Fallback for old browsers: load all immediately
    if (!('IntersectionObserver' in window)) {
      iframes.forEach(function (iframe) { loadIframe(iframe, 1); });
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        const iframe = entry.target;
        observer.unobserve(iframe);

        const delay = staggerIndex * STAGGER_MS;
        staggerIndex++;

        setTimeout(function () {
          loadIframe(iframe, 1);
        }, delay);
      });
    }, {
      rootMargin: '150px 0px', // pre-load slightly before visible
      threshold: 0
    });

    iframes.forEach(function (iframe) {
      observer.observe(iframe);
    });
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLinkedInEmbeds);
  } else {
    initLinkedInEmbeds();
  }

}());
