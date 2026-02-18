# Copilot instructions for this repo

**Project snapshot:** single-file static portfolio: `index.html` (no build system, no package.json). The HTML links `style.css` and `script.js` but these files are not present in the repository.

## High-level goal ✅
- Keep this repo a minimal, responsive, accessible static portfolio page. Changes should be previewable by opening `index.html` in a browser or running a simple static server (e.g. `python -m http.server` or VS Code Live Server).

## Key files and patterns 🔧
- `index.html` — single source of truth for content and structure. Important elements to reference:
  - Header/nav uses anchors: `#about`, `#projects`, `#contact`. Keep navigation and section `id`s in sync.
  - Uses semantic sections: `<header>`, `<main>`, `<section id="hero">`, `<footer>`.
  - Head includes `<meta name="viewport">` and `lang="en"` — mobile-first and accessibility are expected.
- `style.css` — expected stylesheet (create at repo root). Keep styles simple and responsive; prefer mobile-first rules.
- `script.js` — expected JS entry (create at root). Wrap behavior in `DOMContentLoaded` and scope selectors to the document root.

## Local dev & verification ✅
- Preview quickly: `open index.html` or serve: `python -m http.server 8000` then visit `http://localhost:8000`.
- Run Lighthouse or the browser's device toolbar to verify mobile/responsive behavior.
- Check accessibility basics: `lang` attribute, heading order, `alt` attributes for images, and visible focus states for links.

## When modifying or adding features ✍️
- Add new sections using `<section id="your-id">` and add a corresponding `<li><a href="#your-id">...</a></li>` in the nav.
- Keep presentation in `style.css` and behavior in `script.js` (don't inline new styles/scripts unless small proof-of-concepts).
- If adding external assets (images, fonts), place them under a new `assets/` folder and reference with relative paths (`assets/...`).

## Examples (exact, copy-paste) 🧾
- Minimal script entry:

```
document.addEventListener('DOMContentLoaded', () => {
  // Example: smooth-scrolling for in-page nav
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      document.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
    });
  });
});
```

- Minimal CSS starting point:

```
/* style.css */
:root { --bg: #fff; --text: #222; }
html,body{height:100%;margin:0;font-family:system-ui,Arial,Helvetica,sans-serif;color:var(--text);} 
header nav ul{display:flex;gap:1rem;list-style:none;padding:1rem;margin:0}
```

## Known gaps & constraints ⚠️
- No automated tests or CI configured; prefer small iterative PRs with manual browser testing.
- No backend — features requiring server logic (contact forms, data storage) should use third-party services (Formspree / Netlify Forms) or a new backend outside the repo.

## PR checklist for reviewers ✅
- Does `index.html` remain semantic and accessible? (headings, `alt`, `lang`)
- Are new assets in `assets/` and referenced by relative paths?
- Are interactive behaviors isolated in `script.js` and wrapped with `DOMContentLoaded`?
- Is the change previewable in a browser without build steps?

---
If any of these points are unclear or you want this guidance expanded (tests, CI, deploy notes), tell me which areas to iterate on and I will update this file.