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
   *  1. Image (.linkedin-preview) is visible by default as placeholder.
   *  2. IntersectionObserver triggers iframe load when card is near viewport.
   *  3. Iframes are staggered 300ms apart to avoid LinkedIn rate-limiting.
   *  4. On successful load (cross-origin block = real embed) → hide preview.
   *  5. On blank/error page → retry once after 4s.
   *  6. After MAX_RETRIES → show text fallback. Preview hides, fallback shows.
   * ─────────────────────────────────────────────────────────────
   */

  var MAX_RETRIES  = 2;
  var RETRY_DELAY  = 4000;
  var STAGGER      = 300;

  // ── Preview helpers ─────────────────────────────────────────

  function getPreview(iframe) {
    var post = iframe.closest('.linkedin-post');
    return post ? post.querySelector('.linkedin-preview') : null;
  }

  function hidePreview(iframe) {
    var preview = getPreview(iframe);
    if (!preview) return;
    preview.style.transition = 'opacity 0.4s ease';
    preview.style.opacity = '0';
    setTimeout(function () { preview.style.display = 'none'; }, 420);
  }

  // ── Core load logic ─────────────────────────────────────────

  function loadIframe(iframe, attempt) {
    attempt = attempt || 1;

    var src = iframe.dataset.src;
    if (!src) return;

    iframe.src = '';
    iframe.src = src;

    iframe.addEventListener('load', function onLoad() {
      iframe.removeEventListener('load', onLoad);

      try {
        // If we can READ the document, LinkedIn returned a same-origin
        // error page (blank). Treat as failure and retry.
        var doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc && (!doc.body || doc.body.innerHTML.trim() === '')) {
          scheduleRetry(iframe, attempt);
          return;
        }
        // If we CAN read it and it has content, still treat as failure
        // (LinkedIn shouldn't be same-origin in production).
        scheduleRetry(iframe, attempt);
      } catch (e) {
        // Cross-origin SecurityError = LinkedIn's real embed loaded ✓
        hidePreview(iframe);
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
    }, RETRY_DELAY);
  }

  // ── Fallback ────────────────────────────────────────────────

  function showFallback(iframe) {
    // Hide preview — the text fallback takes its role
    hidePreview(iframe);

    var wrapper = iframe.closest('.linkedin-embed');
    if (!wrapper) return;

    var post    = iframe.closest('.linkedin-post');
    var rawTitle = (post && post.dataset.title) ? post.dataset.title : '';

    // Decode HTML entities (e.g. &ldquo; &amp;) for display
    var tmp = document.createElement('textarea');
    tmp.innerHTML = rawTitle;
    var title = tmp.value;

    wrapper.innerHTML =
      '<div class="linkedin-embed-fallback">' +
        (title
          ? '<p class="fallback-quote"><em>\u201C' + title + '\u201D</em></p>' +
            '<p class="fallback-byline">\u2014 by Leda Skenderi</p>'
          : '<p class="fallback-byline">\u2014 by Leda Skenderi</p>'
        ) +
        '<span class="fallback-cta">Click the Open button to view full post</span>' +
      '</div>';
  }

  // ── IntersectionObserver ────────────────────────────────────

  function initLinkedInEmbeds() {
    var iframes = document.querySelectorAll('.linkedin-embed iframe[data-src]');
    if (!iframes.length) return;

    var staggerIndex = 0;

    if (!('IntersectionObserver' in window)) {
      iframes.forEach(function (iframe) { loadIframe(iframe, 1); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var iframe = entry.target;
        observer.unobserve(iframe);

        var delay = staggerIndex * STAGGER;
        staggerIndex++;

        setTimeout(function () { loadIframe(iframe, 1); }, delay);
      });
    }, {
      rootMargin: '150px 0px',
      threshold: 0
    });

    iframes.forEach(function (iframe) { observer.observe(iframe); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLinkedInEmbeds);
  } else {
    initLinkedInEmbeds();
  }

}());
