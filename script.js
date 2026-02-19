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
   * LinkedIn Embed Loader — Polaroid Strategy
   * ─────────────────────────────────────────────────────────────
   * Default state: each card shows image + caption (polaroid).
   * On successful iframe load: swap the polaroid body for the live iframe.
   * On failure after retries: do nothing — polaroid stays, looks great.
   * ─────────────────────────────────────────────────────────────
   */

  var MAX_RETRIES = 2;
  var RETRY_DELAY = 4000;
  var STAGGER     = 300;

  function loadEmbed(post, attempt) {
    attempt = attempt || 1;

    var src = post.dataset.embed;
    if (!src) return;

    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.allowFullscreen = true;
    iframe.title = post.querySelector('.linkedin-caption-title')
                       ? post.querySelector('.linkedin-caption-title').textContent
                       : 'LinkedIn post';

    iframe.addEventListener('load', function () {
      try {
        // If we can read the doc, it's a same-origin error page — retry
        var doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc && (!doc.body || doc.body.innerHTML.trim() === '')) {
          scheduleRetry(post, attempt);
          return;
        }
        // Readable + has content — still likely an error in prod, retry
        scheduleRetry(post, attempt);
      } catch (e) {
        // Cross-origin SecurityError = real LinkedIn embed loaded ✓
        // Swap the polaroid body for the live iframe
        swapToEmbed(post, iframe);
      }
    }, { once: true });

    iframe.addEventListener('error', function () {
      scheduleRetry(post, attempt);
    }, { once: true });

    // Attach offscreen so it starts loading
    iframe.style.position = 'absolute';
    iframe.style.opacity  = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
  }

  function scheduleRetry(post, attempt) {
    // Clean up any offscreen iframe before retrying
    var orphan = document.body.querySelector('iframe[src="' + post.dataset.embed + '"]');
    if (orphan) orphan.remove();

    if (attempt >= MAX_RETRIES) {
      // Max retries hit — polaroid stays, nothing more to do
      return;
    }
    setTimeout(function () { loadEmbed(post, attempt + 1); }, RETRY_DELAY);
  }

  function swapToEmbed(post, iframe) {
    var body = post.querySelector('.linkedin-post-body');
    if (!body) return;

    // Remove offscreen clone, create a fresh visible one
    iframe.remove();

    var container = document.createElement('div');
    container.className = 'linkedin-embed-active';

    var liveIframe = document.createElement('iframe');
    liveIframe.src = post.dataset.embed;
    liveIframe.allowFullscreen = true;
    liveIframe.title = post.dataset.title || 'LinkedIn post';

    container.appendChild(liveIframe);

    // Fade the polaroid out, then replace
    body.style.transition = 'opacity 0.3s ease';
    body.style.opacity = '0';
    setTimeout(function () {
      body.replaceWith(container);
    }, 320);
  }

  // ── IntersectionObserver ────────────────────────────────────

  function init() {
    var posts = document.querySelectorAll('.linkedin-post[data-embed]');
    if (!posts.length) return;

    var staggerIndex = 0;

    if (!('IntersectionObserver' in window)) {
      posts.forEach(function (post) { loadEmbed(post, 1); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var post = entry.target;
        observer.unobserve(post);

        var delay = staggerIndex * STAGGER;
        staggerIndex++;

        setTimeout(function () { loadEmbed(post, 1); }, delay);
      });
    }, {
      rootMargin: '150px 0px',
      threshold: 0
    });

    posts.forEach(function (post) { observer.observe(post); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());