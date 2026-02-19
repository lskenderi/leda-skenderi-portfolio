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
   *  1. IntersectionObserver loads iframes only when visible.
   *  2. Stagger 300ms between each to avoid rate-limiting.
   *  3. The post image acts as a placeholder — visible by default,
   *     hidden the moment the iframe confirms a successful load.
   *  4. On error / blank page → retry once after 4s.
   *  5. After MAX_RETRIES failures → show text fallback,
   *     image stays hidden (fallback replaces the embed area only).
   * ─────────────────────────────────────────────────────────────
   */

  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 4000;
  const STAGGER_MS = 300;

  function getPlaceholder(iframe) {
    // The <img> that sits as a sibling before .linkedin-embed in the card
    var post = iframe.closest('.linkedin-post');
    return post ? post.querySelector('img.linkedin-placeholder') : null;
  }

  function hidePlaceholder(iframe) {
    var img = getPlaceholder(iframe);
    if (img) {
      img.style.transition = 'opacity 0.4s ease';
      img.style.opacity = '0';
      // Remove from flow after fade so card height collapses cleanly
      setTimeout(function () { img.style.display = 'none'; }, 420);
    }
  }

  function loadIframe(iframe, attempt) {
    attempt = attempt || 1;

    var src = iframe.dataset.src;
    if (!src) return;

    iframe.src = '';
    iframe.src = src;

    iframe.addEventListener('load', function onLoad() {
      iframe.removeEventListener('load', onLoad);

      try {
        var doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc && (!doc.body || doc.body.innerHTML.trim() === '')) {
          // Blank doc = LinkedIn error page, retry
          scheduleRetry(iframe, attempt);
          return;
        }
      } catch (e) {
        // Cross-origin block = real embed loaded successfully ✓
      }

      // Success — hide the placeholder image
      hidePlaceholder(iframe);

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

  function hidePreview(iframe) {
    const post = iframe.closest('.linkedin-post');
    if (!post) return;
    const preview = post.querySelector('.linkedin-preview');
    if (preview) preview.style.display = 'none';
  }

    function showFallback(iframe) {
    // On final failure: replace embed area with text fallback.
    // Placeholder image also hides — fallback text takes its role.
    hidePlaceholder(iframe);

    var wrapper = iframe.closest('.linkedin-embed');
    if (!wrapper) return;

    var post = iframe.closest('.linkedin-post');
    var rawTitle = (post && post.dataset.title) ? post.dataset.title : '';

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

  // ── IntersectionObserver setup ──────────────────────────────

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

        var delay = staggerIndex * STAGGER_MS;
        staggerIndex++;

        setTimeout(function () {
          loadIframe(iframe, 1);
        }, delay);
      });
    }, {
      rootMargin: '150px 0px',
      threshold: 0
    });

    iframes.forEach(function (iframe) {
      observer.observe(iframe);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLinkedInEmbeds);
  } else {
    initLinkedInEmbeds();
  }

}());
