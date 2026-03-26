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
// Active nav link on scroll — project pages
// Targets .nav-back links and div/section anchors
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  const navBackLinks = document.querySelectorAll(".project-nav-right .nav-back");
  if (!navBackLinks.length) return;

  const anchors = Array.from(navBackLinks)
    .map(link => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return null;
      return document.getElementById(href.slice(1));
    })
    .filter(Boolean);

  function activateProjectNav() {
    let current = "";
    anchors.forEach(el => {
      if (window.scrollY >= el.offsetTop - 120) {
        current = el.id;
      }
    });
    navBackLinks.forEach(link => {
      link.classList.remove("is-active");
      const href = link.getAttribute("href");
      if (href === `#${current}`) {
        link.classList.add("is-active");
      }
    });
  }

  window.addEventListener("scroll", activateProjectNav, { passive: true });
  activateProjectNav();
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
    var link = document.createElement('a');
    link.className = 'linkedin-post';
    link.href = post.url;
    link.target = '_blank';
    link.rel = 'noopener';

    link.innerHTML =
      '<div class="linkedin-post-top">' +
        '<p class="linkedin-post-label" data-i18n="linkedin.post">' + (localStorage.getItem('lang') === 'fr' ? 'Publication' : 'Post') + '</p>' +
        '<span class="linkedin-post-open" data-i18n="linkedin.open">' + (localStorage.getItem('lang') === 'fr' ? 'Ouvrir' : 'Open') + '</span>' +
      '</div>' +
      '<div class="linkedin-post-body">' +
        '<img class="linkedin-preview" src="' + post.image + '" alt="' + escapeAttr(post.title) + '" loading="lazy">' +
        '<div class="linkedin-caption">' +
          '<p class="linkedin-caption-title"><em>\u201C' + escapeHtml(post.title) + '\u201D</em></p>' +
          '<p class="linkedin-caption-by">by Leda Skenderi</p>' +
        '</div>' +
      '</div>';

    return link;
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

// -------------------------
// i18n — Language toggle
// -------------------------
(function () {
  var translations = {
    en: {
      // Nav
      'nav.about':   'About',
      'nav.contact': 'Contact',
      'nav.projects':'Projects',
      'nav.linkedin':'LinkedIn',
      'nav.home':    'Home',
      // Hero
      'hero.headline': 'FASHION PRODUCT DEVELOPMENT<br>&amp; RESPONSIBLE INNOVATION',
      'hero.meta1': 'From materials to market, contributing to collections that align creativity, sustainability, and business strategy.',
      'hero.meta2': 'MBA Candidate in Luxury Goods and Fashion Industries,',
      'hero.meta3': 'MODART International.',
      // About
      'about.title': 'ABOUT',
      'about.subheading': 'My expertise exists at the intersection of <strong>luxury strategy</strong>, <strong>sustainability</strong>, and <strong>cultural insight</strong>.',
      'about.p1': 'With a background in life sciences and an MBA in luxury goods and fashion industries, I bring an <strong>analytical approach to problem solving</strong>, whether that is applied to brand or product development. My studies and professional experiences trained me in <strong>systems thinking</strong> and <strong>sustainable strategies for long-term impact</strong>. Today, I apply that mindset to the evolving challenges in the luxury sector.',
      'about.p2': 'I am particularly interested in how consumer expectations are shifting toward transparency, material literacy, and cultural relevance. <strong>As sustainability moves from narrative to necessity, brands must rethink not only what they produce, but how they position, communicate, and operationalize responsibility.</strong>',
      'about.p3': '<strong>I am building a career dedicated to shaping brands that are not only desirable, but responsible and structurally intelligent.</strong>',
      // Contact
      'contact.title':   'CONTACT',
      'contact.lead':    'I am open to discussing <strong>luxury brand strategy</strong>, <strong>sustainability integration</strong> and <strong>product development</strong>.',
      'contact.sub':     'For professional inquiries, collaborations, or opportunities you can reach out to me via:',
      'contact.email':   'Email',
      'contact.linkedin':'LinkedIn',
      // CV
      'cv.title':    'CURRICULUM VITAE',
      'cv.open':     'Open PDF',
      'cv.download': 'Download',
      // Projects
      'projects.title':  'PROJECTS',
      'project1.field':  'Strategic Marketing &amp; Sustainable Development',
      'project1.desc':   'Inspired by my LinkedIn post \u201cSustainability is like smoking,\u201d this conceptual project explores the idea that sustainability progresses through systems rather than moral messaging.',
      'project2.field':  'Trend Forecasting',
      'project2.desc':   'Trend analysis project exploring how digital hyperexposure transforms intimacy into cultural material.',
      'project3.field':  'Merchandising Strategy',
      'project3.desc':   'Strategic merchandising project focused on a Chanel capsule collection in a seasonal retail setting.',
      'project4.field':  'Marketing Analysis',
      'project4.desc':   'Strategic marketing project analyzing the international expansion potential of Deadwood Studios, a sustainable fashion brand specializing in upcycled leather.',
      // LinkedIn
      'linkedin.title': 'LINKEDIN',
      'linkedin.post':  'Post',
      'linkedin.open':  'Open',
      // Project page nav
      'nav.pitch_deck': 'Pitch Deck',
      'nav.video':      'Video',
      // Project Pages Generic
      'p.pdf_title': 'Project PDF',
      // Project 1 Detailed
      'p1.title': 'Stella McCartney × Marlboro',
      'p1.p1': 'This conceptual project was developed as part of the Fashion Communication course and originated from a personal LinkedIn post titled “Sustainability is like smoking.” In this reflection, I argued that awareness alone does not drive behavioral change; instead, systems, social norms, and structural constraints are what enable real transformation.',
      'p1.p2': 'Building on this idea, I imagined a fictional collaboration between Stella McCartney and Marlboro, repurposing a historically harmful symbol into a tool for awareness and material innovation. The cigarette butt—an emblematic pollutant—is reimagined as a responsible, innovative material integrated into a fashion capsule and a broader communication strategy.',
      'p1.p3': 'My approach combined brand DNA analysis, material innovation research, critical storytelling, and the development of products and activations designed to make sustainability more visible, desirable, and culturally embedded.',
      // Project 2 Detailed
      'p2.title': 'L’INTIMITÉ EST MORTE, VIVE L’INTIMITÉ',
      'p2.p1': 'This project was developed as part of a trend analysis assignment and explores the concept of Intimacy Collapse—a cultural shift in which the boundary between private and public life erodes under the effects of hyperconnectivity, oversharing, and the attention economy.',
      'p2.p2': 'My work focused on analyzing this societal transformation—emotional, bodily, and aesthetic—and translating it into fashion, beauty, and experiential signals. I structured the project around a central concept supported by cultural, artistic, and media references.',
      'p2.p3': 'This project demonstrates my ability to decode complex cultural dynamics and transform them into coherent, actionable creative directions for fashion and communication.',
      // Project 3 Detailed
      'p3.title': 'Chanel Capsule — Courchevel',
      'p3.p1': 'This project involved designing a complete merchandising plan for a Chanel capsule collection in a seasonal boutique in Courchevel. The objective was to translate the brand’s DNA—timeless elegance, iconic codes, and desirability—into a coherent and high-performing retail experience.',
      'p3.p2': 'I worked across the entire project scope: analysis of Chanel’s brand DNA, concept development (Celestial Bodies), customer storytelling, visual merchandising, customer journey design, and KPI monitoring including revenue estimation.',
      'p3.p3': 'This work demonstrates my ability to align creative vision, luxury standards, and business logic within a premium retail environment.',
      // Project 4 Detailed
      'p4.title': 'Deadwood PROJECT',
      'p4.p1': 'This project focused on the strategic analysis of Deadwood Studios, a fashion brand specializing in upcycled leather, as part of the Marketing Strategy course at MODART International.',
      'p4.p2': 'I contributed to the overall brand assessment through market analysis, competitive benchmarking, and strategic reflection on positioning and the marketing mix, grounded in the study of sustainable fashion trends.',
      'p4.p3': 'The project culminated in a strategic recommendation for international expansion, demonstrating my ability to connect sustainability, branding, and business performance.',
      // Footer
      'footer.text':   'Property of Leda Skenderi',
      'footer.credit': 'Creative Copyright A.Slimani \u00a9 2026',
    },
    fr: {
      // Nav
      'nav.about':   'À propos',
      'nav.contact': 'Contact',
      'nav.projects':'Projets',
      'nav.linkedin':'LinkedIn',
      'nav.home':    'Accueil',
      // Hero
      'hero.headline': 'DÉVELOPPEMENT PRODUIT MODE<br>&amp; INNOVATION RESPONSABLE',
      'hero.meta1': 'Des matières au marché, je contribue à des collections alliant créativité, durabilité et stratégie commerciale.',
      'hero.meta2': 'Candidate au MBA Luxury Goods and Fashion Industries,',
      'hero.meta3': 'MODART International.',
      // About
      'about.title': 'À PROPOS',
      'about.subheading': 'Mon expertise se situe à l’intersection de la <strong>stratégie luxe</strong>, de la <strong>durabilité</strong> et de l’<strong>analyse culturelle</strong>.',
      'about.p1': 'Forte d’un parcours en sciences de la vie et d’un MBA en management du luxe, j’adopte une <strong>rigueur analytique</strong> appliquée au développement de marque et de produit. Ma formation m’a familiarisée avec l’<strong>approche systémique</strong> et le pilotage de <strong>stratégies durables à impact pérenne</strong>. Aujourd’hui, je mets cet état d’esprit au service des nouveaux paradigmes du secteur du luxe.',
      'about.p2': 'Je porte une attention particulière à l’évolution des attentes clients vers la transparence, la culture matière et la résonance culturelle. <strong>Alors que la durabilité devient un impératif structurel, les marques doivent repenser leurs modes de production, leur positionnement et l’opérationnalisation de leur responsabilité.</strong>',
      'about.p3': '<strong>Je forge un parcours professionnel dédié à l’accompagnement de marques non seulement désirables, mais responsables et structurellement intelligentes.</strong>',
      // Contact
      'contact.title':   'CONTACT',
      'contact.lead':    'Je suis ouverte à tout échange sur la <strong>stratégie de marque luxe</strong>, l’<strong>intégration RSE</strong> et le <strong>développement produit</strong>.',
      'contact.sub':     'Pour toute demande professionnelle, collaboration ou opportunité, vous pouvez me joindre via :',
      'contact.email':   'Email',
      'contact.linkedin':'LinkedIn',
      // CV
      'cv.title':    'CURRICULUM VITAE',
      'cv.open':     'Ouvrir PDF',
      'cv.download': 'Télécharger',
      // Projects
      'projects.title':  'PROJETS',
      'project1.field':  'Marketing Stratégique &amp; Développement Durable',
      'project1.desc':   'Inspiré par mon post LinkedIn « La durabilité est comme le tabagisme », ce projet prospectif explore l’idée que la durabilité progresse par les systèmes plutôt que par la morale.',
      'project2.field':  'Prospective des Tendances',
      'project2.desc':   'Analyse prospective explorant comment l’hyperexposition numérique transforme l’intimité en matériau culturel.',
      'project3.field':  'Stratégie Merchandising',
      'project3.desc':   'Plan de merchandising stratégique pour une collection capsule Chanel dans un environnement retail saisonnier.',
      'project4.field':  'Analyse Marketing',
      'project4.desc':   'Analyse marketing évaluant le potentiel d’expansion internationale de Deadwood Studios, marque spécialisée dans le cuir upcyclé.',
      // LinkedIn
      'linkedin.title': 'LINKEDIN',
      'linkedin.post':  'Publication',
      'linkedin.open':  'Ouvrir',
      // Project page nav
      'nav.pitch_deck': 'Présentation',
      'nav.video':      'Vidéo',
      // Project Pages Generic
      'p.pdf_title': 'PDF du Projet',
      // Project 1 Detailed
      'p1.title': 'Stella McCartney × Marlboro',
      'p1.p1': 'Ce projet prospectif, développé dans le cadre du cours Fashion Communication, tire son origine d’une réflexion publiée sur LinkedIn intitulée « La durabilité est comme le tabagisme ». J’y soutenais que la sensibilisation seule ne suffit pas au changement ; ce sont les systèmes et les normes sociales qui permettent une transformation réelle.',
      'p1.p2': 'En m’appuyant sur ce concept, j’ai imaginé une collaboration entre Stella McCartney et Marlboro, détournant un symbole historiquement nocif en un vecteur d’innovation matière. Le mégot de cigarette est réinventé comme un matériau innovant intégré à une collection capsule et une stratégie de communication globale.',
      'p1.p3': 'Ma démarche a combiné analyse de l’ADN de marque, recherche en innovation textile et storytelling critique pour rendre la durabilité plus visible, désirable et culturellement ancrée.',
      // Project 2 Detailed
      'p2.title': 'L’INTIMITÉ EST MORTE, VIVE L’INTIMITÉ',
      'p2.p1': 'Ce projet de prospective explore le concept d’Intimacy Collapse — un basculement culturel où la frontière entre sphères privée et publique s’efface sous l’effet de l’hyperconnexion et de l’économie de l’attention.',
      'p2.p2': 'Mon travail a porté sur l’analyse de cette mutation sociétale (émotionnelle, corporelle, esthétique) pour la traduire en signaux mode, beauté et expérientiels, structurés autour de moodboards exprimant la vulnérabilité comme langage social.',
      'p2.p3': 'Ce projet démontre ma capacité à décoder des dynamiques culturelles complexes pour les transformer en directions créatives actionnables.',
      // Project 3 Detailed
      'p3.title': 'Chanel Capsule — Courchevel',
      'p3.p1': 'Conception d’un plan de merchandising complet pour une collection capsule Chanel au sein d’une boutique saisonnière à Courchevel. L’objectif était de traduire l’ADN de la Maison en une expérience retail cohérente et performante.',
      'p3.p2': 'J’ai piloté l’ensemble du périmètre : analyse des codes de marque, développement du concept (Celestial Bodies), storytelling client, identité visuelle, parcours client et suivi des KPIs incluant l’estimation du chiffre d’affaires.',
      'p3.p3': 'Ce travail illustre mon aptitude à aligner vision créative, standards du luxe et logique business dans un environnement retail premium.',
      // Project 4 Detailed
      'p4.title': 'PROJET DEADWOOD',
      'p4.p1': 'Analyse stratégique de Deadwood Studios, marque de mode spécialisée dans le cuir upcyclé, réalisée dans le cadre du cours Marketing Strategy à MODART International.',
      'p4.p2': 'J’ai contribué à l’évaluation globale de la marque via une analyse de marché, un benchmark concurrentiel et une réflexion stratégique sur le positionnement et le mix marketing, ancrée dans l’étude des tendances de mode durable.',
      'p4.p3': 'Le projet a abouti à une recommandation stratégique d’expansion internationale (flagship à Copenhague), connectant durabilité, branding et performance commerciale.',
      // Footer
      'footer.text':   'Propriété de Leda Skenderi',
      'footer.credit': 'Droits créatifs A.Slimani © 2026',
    }
  };

  var currentLang = localStorage.getItem('lang') || 'en';

  function applyLanguage(lang) {
    var t = translations[lang];
    if (!t) return;

    // Update all [data-i18n] elements
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) {
        el.innerHTML = t[key];
      }
    });

    // Update lang-toggle button label(s) — show the OTHER language
    document.querySelectorAll('.lang-label').forEach(function (el) {
      el.textContent = lang === 'en' ? 'FR' : 'EN';
    });

    // Show correct flag: French flag in EN mode, UK flag in FR mode
    document.querySelectorAll('.flag-fr').forEach(function (svg) {
      svg.style.display = lang === 'en' ? '' : 'none';
    });
    document.querySelectorAll('.flag-en').forEach(function (svg) {
      svg.style.display = lang === 'fr' ? 'inline-block' : 'none';
    });

    document.documentElement.lang = lang;
    currentLang = lang;
    localStorage.setItem('lang', lang);
  }

  function initLangToggle() {
    applyLanguage(currentLang);

    document.querySelectorAll('.lang-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyLanguage(currentLang === 'en' ? 'fr' : 'en');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLangToggle);
  } else {
    initLangToggle();
  }
}());


// -------------------------
// Scroll animations + Hero parallax
// -------------------------
document.addEventListener('DOMContentLoaded', function () {

  // --- Section card reveals ---
  var cardSelectors = [
    '.about-card',
    '.contact-card',
    '.cv-card',
    '.projects-card',
    '.linkedin-card',
  ];
  cardSelectors.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.classList.add('anim-fade-up');
    });
  });

  // Project index cards — stagger individually
  document.querySelectorAll('.project-card').forEach(function (el, i) {
    el.classList.add('anim-fade-up');
    el.style.transitionDelay = (i * 0.09) + 's';
  });

  // Project page cards — stagger sequentially down the stack
  document.querySelectorAll('.project-page-stack > *').forEach(function (el, i) {
    el.classList.add('anim-fade-up');
    el.style.transitionDelay = (i * 0.12) + 's';
  });

  // IntersectionObserver reveal
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.anim-fade-up').forEach(function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.anim-fade-up').forEach(function (el) {
      io.observe(el);
    });
  }

  // --- Hero detail parallax (desktop only — details are hidden via CSS on mobile) ---
  // CSS controls opacity. JS owns ALL transform movement: entry slide-in + scroll parallax.
  // This avoids any CSS/JS cascade conflict on the transform property.
  var heroWrap = document.querySelector('.hero-wrap');

  var details = [
    { el: document.querySelector('.hero-detail-01'), tx: 18, ty: -22, ySpeed: 0.32 },
    { el: document.querySelector('.hero-detail-02'), tx: 30, ty:   0, ySpeed: 0.52, xSpeed: 0.06 },
    { el: document.querySelector('.hero-detail-03'), tx: 14, ty:  26, ySpeed: 0.42 },
  ];

  var hasDetails = details.some(function (d) { return d.el; });

  if (heroWrap && hasDetails) {
    var ENTRY_DELAYS   = [400, 620, 840];
    var ENTRY_DURATION = 880;
    var parallaxReady  = [false, false, false];

    // Set entry offsets immediately (elements are opacity:0 so invisible)
    details.forEach(function (d) {
      if (d.el) d.el.style.transform = 'translate(' + d.tx + 'px,' + d.ty + 'px)';
    });

    // Slide each detail to its resting position, then hand off to parallax
    details.forEach(function (d, i) {
      if (!d.el) return;
      setTimeout(function () {
        if (parallaxReady[i]) return; // user already scrolled — skip entry
        d.el.style.transition = 'transform ' + ENTRY_DURATION + 'ms cubic-bezier(0.16, 1, 0.3, 1)';
        d.el.style.transform  = 'translate(0px, 0px)';

        setTimeout(function () {
          parallaxReady[i]      = true;
          d.el.style.transition = '';
          d.el.style.transform  = 'translate(0px, 0px)';
        }, ENTRY_DURATION + 32);
      }, ENTRY_DELAYS[i]);
    });

    function applyParallax() {
      var sy = window.scrollY;
      details.forEach(function (d, i) {
        if (!d.el || !parallaxReady[i]) return;
        var ty = -sy * d.ySpeed;
        var tx = d.xSpeed ? sy * d.xSpeed : 0;
        d.el.style.transform = 'translateY(' + ty + 'px)' + (tx ? ' translateX(' + tx + 'px)' : '');
      });
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      // First scroll cancels any pending entry transitions and goes straight to parallax
      details.forEach(function (d, i) {
        if (!d.el || parallaxReady[i]) return;
        parallaxReady[i]      = true;
        d.el.style.transition = '';
      });

      if (!ticking) {
        requestAnimationFrame(function () {
          applyParallax();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }
});
