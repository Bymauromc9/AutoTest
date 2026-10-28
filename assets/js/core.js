/*!
 * core.js — utilidades comunes a todas las páginas del sitio.
 *
 *   App.SUBJECTS   registro de asignaturas (portada y barra superior se generan a partir de él)
 *   App.store      lectura/escritura en localStorage con JSON y tolerante a errores
 *   App.session    igual, pero en sessionStorage (estado de una sesión de estudio)
 *   App.shuffle    copia barajada de un array (Fisher–Yates)
 *   App.esc        escapa texto para insertarlo como HTML
 *   App.theme      tema claro / oscuro compartido por todas las páginas
 *
 * Se carga en el <head> SIN defer: aplica el tema antes de pintar la página (evita el parpadeo)
 * y, cuando el DOM está listo, inserta la barra superior según los data-* del <body>:
 *   data-root     ruta relativa a la raíz del sitio ("" en la raíz, "../" en fli/, "../../" en fli/teoria/)
 *   data-subject  id de la asignatura (clave de App.SUBJECTS); vacío en la portada
 *   data-area     sección activa de la asignatura ("teoria" | "practicas"), o "auto" para deducirla del hash (#practicas)
 *   data-title    título corto de la página para la miga de pan (opcional)
 */
(function () {
  "use strict";

  /* ---------- Registro de asignaturas ----------
     Para añadir una asignatura: crea su carpeta (p. ej. "mates/") con su index.html y añade aquí una entrada. */
  const SUBJECTS = [
    {
      id: "fli",
      short: "FLI",
      name: "Fundamentos Lógicos de la Informática",
      desc: "Lógica proposicional, razonamientos y problema SAT: autotest, exámenes, chuletas, ejercicios de teoría y prácticas.",
      home: "fli/index.html",
      sections: [
        { id: "teoria", label: "Teoría", href: "fli/index.html#teoria" },
        { id: "practicas", label: "Prácticas", href: "fli/index.html#practicas" }
      ]
    }
  ];

  /* ---------- Almacenamiento ---------- */
  function makeStore(getStorage) {
    return function (key, value) {
      try {
        const s = getStorage();
        if (value === undefined) return JSON.parse(s.getItem(key));
        if (value === null) { s.removeItem(key); return null; }
        s.setItem(key, JSON.stringify(value));
        return value;
      } catch (e) { return null; }
    };
  }
  const store = makeStore(() => window.localStorage);
  const session = makeStore(() => window.sessionStorage);

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  /* ---------- Tema claro / oscuro ---------- */
  const THEME_KEY = "app-theme";
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  function effective() {
    const t = document.documentElement.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return media && media.matches ? "dark" : "light";
  }
  function setTheme(t) { store(THEME_KEY, t || null); applyTheme(t); syncThemeButton(); }
  function toggleTheme() { setTheme(effective() === "dark" ? "light" : "dark"); }
  function syncThemeButton() {
    const b = document.getElementById("theme-toggle");
    if (!b) return;
    const dark = effective() === "dark";
    b.textContent = dark ? "☀" : "☾";
    b.setAttribute("aria-label", dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    b.title = b.getAttribute("aria-label");
  }
  applyTheme(store(THEME_KEY));
  if (media && media.addEventListener) media.addEventListener("change", syncThemeButton);
  // Si el tema se cambia en otra pestaña, se aplica también aquí.
  window.addEventListener("storage", (e) => { if (e.key === THEME_KEY) { applyTheme(store(THEME_KEY)); syncThemeButton(); } });

  /* ---------- Barra superior ---------- */
  function areaFromHash(subject) {
    const h = location.hash.slice(1);
    return subject && subject.sections.some((s) => s.id === h) ? h : (subject ? subject.sections[0].id : "");
  }
  function buildNav() {
    const body = document.body;
    if (!body || body.dataset.nav === "off" || document.querySelector(".site-nav")) return;
    const root = body.dataset.root || "";
    const subject = SUBJECTS.find((s) => s.id === body.dataset.subject);
    const autoArea = body.dataset.area === "auto";
    const area = autoArea ? areaFromHash(subject) : (body.dataset.area || "");
    const title = body.dataset.title || "";
    const nav = document.createElement("header");
    nav.className = "site-nav";
    let crumbs = `<a class="site-nav__home" href="${root}index.html" title="Todas las asignaturas"><span aria-hidden="true">⌂</span><span class="site-nav__label">Asignaturas</span></a>`;
    if (subject) {
      crumbs += `<span class="site-nav__sep" aria-hidden="true">/</span><a class="site-nav__subject" href="${root}${subject.home}" title="${esc(subject.name)}">${esc(subject.short)}</a>`;
      if (title) crumbs += `<span class="site-nav__sep" aria-hidden="true">/</span><span class="site-nav__page" aria-current="page">${esc(title)}</span>`;
    }
    const tabs = subject
      ? `<nav class="site-nav__tabs" aria-label="Secciones de ${esc(subject.short)}">${subject.sections.map((s) => `<a href="${root}${s.href}"${s.id === area ? ' aria-current="true"' : ""}>${esc(s.label)}</a>`).join("")}</nav>`
      : "";
    nav.innerHTML = `<div class="site-nav__inner"><div class="site-nav__crumbs">${crumbs}</div>${tabs}<button type="button" class="site-nav__theme" id="theme-toggle"></button></div>`;
    // La barra va justo después del enlace «Saltar al contenido», que debe ser lo primero al tabular.
    const skip = body.querySelector(":scope > .skip-link");
    body.insertBefore(nav, skip ? skip.nextSibling : body.firstChild);
    if (autoArea) window.addEventListener("hashchange", () => {
      const a = areaFromHash(subject);
      nav.querySelectorAll(".site-nav__tabs a").forEach((x, i) => { if (subject.sections[i].id === a) x.setAttribute("aria-current", "true"); else x.removeAttribute("aria-current"); });
    });
    body.classList.add("has-site-nav");
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
    syncThemeButton();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildNav);
  else buildNav();

  window.App = Object.freeze({
    SUBJECTS, store, session, shuffle, esc,
    theme: Object.freeze({ get: effective, set: setTheme, toggle: toggleTheme })
  });
})();
