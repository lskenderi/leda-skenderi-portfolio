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
   * LinkedIn Polaroid Cards
   * ─────────────────────────────────────────────────────────────
   * Fetches posts.json from the same folder as index.html,
   * then renders polaroid cards into #linkedin-track.
   *
   * To add a new post: add one object to posts.json and commit.
   * {
   *   "title": "Your post title",
   *   "image": "images/your-image.jpg",
   *   "url":   "https://www.linkedin.com/feed/update/urn:li:activity:..."
   * }
   * ─────────────────────────────────────────────────────────────
   */

  function buildCard(post) {
    var article = document.createElement('article');
    article.className = 'linkedin-post';

    article.innerHTML =
      '<div class="linkedin-post-top">' +
        '<p class="linkedin-post-label">Post</p>' +
        '<a class="linkedin-post-open" href="' + post.url + '" target="_blank" rel="noopener">Open</a>' +
      '</div>' +
      '<div class="linkedin-post-body">' +
        '<img class="linkedin-preview" src="' + post.image + '" alt="' + escapeAttr(post.title) + '" loading="lazy">' +
        '<div class="linkedin-caption">' +
          '<p class="linkedin-caption-title"><em>\u201C' + escapeHtml(post.title) + '\u201D</em></p>' +
          '<p class="linkedin-caption-by">by Leda Skenderi</p>' +
        '</div>' +
      '</div>';

    return article;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
  }

  function init() {
    var track = document.getElementById('linkedin-track');
    if (!track) return;

    fetch('posts.json?v=' + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error('Could not load posts.json');
        return res.json();
      })
      .then(function (posts) {
        posts.forEach(function (post) {
          track.appendChild(buildCard(post));
        });
      })
      .catch(function (err) {
        console.warn('LinkedIn posts failed to load:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());