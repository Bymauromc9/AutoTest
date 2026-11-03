/*!
 * hub.js — portada de una asignatura, generada a partir de App.SUBJECTS (assets/js/core.js).
 * Todas las asignaturas tienen así la misma estructura:
 *   cabecera (nombre, presentación, resumen de progreso y «continuar») →
 *   Teoría → Prácticas → Examen, cada sección con sus recursos en el orden canónico de App.KINDS
 *   y, si la asignatura los tiene, agrupados por bloques (L0 / L1).
 * Requiere: assets/js/core.js y <body data-subject="…" data-hub>.
 */
(function () {
  "use strict";
  const { SUBJECTS, SECTIONS, KINDS, store, esc, icon, daysTo, progress } = window.App;
  const body = document.body, root = body.dataset.root || "";
  const S = SUBJECTS.find((s) => s.id === body.dataset.subject);
  const app = document.getElementById("app");
  if (!S || !app) return;
  const ORDER = Object.keys(KINDS);
  const byKind = (a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind);

  function card(r) {
    const p = progress.resource(r);
    const frac = p && p.total ? Math.min(1, p.done / p.total) : null;
    const meta = p && p.text ? `<span class="res-meta">${p.text}</span>` : "";
    const bar = frac != null && p.done ? `<span class="res-bar" aria-hidden="true"><span style="width:${Math.round(frac * 100)}%"></span></span>` : "";
    return `<li><a class="res k-${r.kind}" href="${root}${r.href}">
      <span class="res-ico">${icon(KINDS[r.kind].icon)}</span>
      <span class="res-body"><span class="res-kind">${esc(KINDS[r.kind].label)}</span><span class="res-t">${esc(r.title)}</span>
      <span class="res-d">${esc(r.desc)}</span>${meta}${bar}</span>
      <span class="res-go">${icon("chevron")}</span></a></li>`;
  }
  function empty(text) { return `<p class="res-empty">${esc(text)}</p>`; }

  function examCard() {
    if (!S.exam) return "";
    const d = daysTo(S.exam.date);
    const when = d > 1 ? `Faltan <b>${d}</b> días` : d === 1 ? "<b>Mañana</b>" : d === 0 ? "<b>Hoy</b>" : "Convocatoria pasada";
    return `<a class="exam-card" href="${root}${S.exam.href}">
      <span class="exam-days"><span class="n">${d >= 0 ? d : "—"}</span><span class="l">${d === 1 ? "día" : "días"}</span></span>
      <span class="exam-txt"><span class="res-kind">Próximo examen</span><span class="res-t">${when}</span><span class="res-d">${esc(S.exam.label)} · ${esc(S.exam.cta || "cómo es y cómo prepararlo")}</span></span>
      <span class="res-go">${icon("chevron")}</span></a>`;
  }

  function section(sec) {
    const list = S.resources.filter((r) => r.sec === sec.id);
    const groups = S.groups ? Object.keys(S.groups) : [""];
    let inner = "";
    if (S.groups && list.some((r) => r.group)) {
      groups.forEach((g) => {
        const items = list.filter((r) => r.group === g).sort(byKind);
        const msg = S.empty && S.empty[sec.id + "/" + g];
        if (!items.length && !msg) return;
        inner += `<div class="res-group"><h3 class="res-gh"><span class="gtag">${esc(g)}</span>${esc(S.groups[g])}</h3>
          ${items.length ? `<ul class="res-grid">${items.map(card).join("")}</ul>` : empty(msg)}</div>`;
      });
      const loose = list.filter((r) => !r.group).sort(byKind);
      if (loose.length) inner += `<ul class="res-grid">${loose.map(card).join("")}</ul>`;
    } else {
      const items = list.slice().sort(byKind);
      inner = items.length ? `<ul class="res-grid">${items.map(card).join("")}</ul>` : "";
    }
    const msg = S.empty && S.empty[sec.id];
    if (msg) inner += empty(msg);
    if (sec.id === "examen") inner = examCard() + inner;
    return `<section class="hub-sec" id="${sec.id}" aria-labelledby="h-${sec.id}">
      <header class="hub-sec-h"><span class="hub-sec-ico">${icon(sec.icon)}</span>
        <div><span class="eyebrow">${esc((S.sub && S.sub[sec.id]) || "")}</span><h2 id="h-${sec.id}">${esc(sec.label)}</h2></div>
        <span class="hub-sec-n">${list.length} ${list.length === 1 ? "recurso" : "recursos"}</span></header>
      ${inner}</section>`;
  }

  function stats() {
    const ps = S.resources.map((r) => ({ r, p: progress.resource(r) }));
    const sum = (f) => ps.filter((x) => x.p && x.p.total && f(x.r)).reduce((a, x) => [a[0] + x.p.done, a[1] + x.p.total], [0, 0]);
    const tiles = [];
    const pct = progress.subject(S);
    tiles.push(`<div class="tile tile-main"><span class="v">${pct}<small>%</small></span><span class="l">progreso total</span><span class="res-bar"><span style="width:${pct}%"></span></span></div>`);
    const [ta, tt] = sum((r) => r.progress.t === "autotest");
    if (tt) tiles.push(`<div class="tile"><span class="v">${ta}<small>/${tt}</small></span><span class="l">temas del autotest</span></div>`);
    const [ea, et] = sum((r) => r.progress.t === "hechos");
    if (et) tiles.push(`<div class="tile"><span class="v">${ea}<small>/${et}</small></span><span class="l">ejercicios hechos</span></div>`);
    const [sa, st] = sum((r) => r.progress.t === "estudio");
    if (st) tiles.push(`<div class="tile"><span class="v">${sa}<small>/${st}</small></span><span class="l">apartados estudiados</span></div>`);
    if (S.exam) { const d = daysTo(S.exam.date); if (d >= 0) tiles.push(`<div class="tile tile-exam"><span class="v">${d}</span><span class="l">días para el examen</span></div>`); }
    return `<div class="tiles">${tiles.join("")}</div>`;
  }

  function cont() {
    const last = store("app-last-" + S.id);
    const r = last && S.resources.find((x) => x.id === last.r);
    if (!r) {
      const first = S.resources.find((x) => x.sec === "teoria") || S.resources[0];
      return `<a class="continue" href="${root}${first.href}">${icon("arrow")}<span><small>Empieza por aquí</small><b>${esc(first.title)}</b></span></a>`;
    }
    return `<a class="continue" href="${root}${r.href}">${icon("arrow")}<span><small>Continuar donde lo dejaste</small><b>${esc(r.title)}</b></span></a>`;
  }

  document.title = S.short + " · " + S.name;
  app.innerHTML = `
    <header class="hub-hero">
      <span class="eyebrow">1.º Grado en Ingeniería Informática · Universidad de Murcia</span>
      <div class="hub-title"><span class="hub-badge" aria-hidden="true">${esc(S.short)}</span><h1>${esc(S.name)}</h1></div>
      <p class="lead">${esc(S.intro)}</p>
      ${stats()}
      ${cont()}
    </header>
    ${SECTIONS.map(section).join("")}
    <p class="muted hub-note">Tu progreso se guarda sólo en este navegador.</p>`;

  // Al desplazarse, la sección visible se marca en la barra inferior y en las pestañas.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = en.target.id;
        document.querySelectorAll(".tabbar a, .site-nav__tabs a").forEach((a) => {
          if ((a.dataset.sec || "") === id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-35% 0px -60% 0px" });
    app.querySelectorAll(".hub-sec, .hub-hero").forEach((s) => io.observe(s));
  }
  // Si se llega con un ancla (#examen), se baja a esa sección ya pintada.
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
})();
