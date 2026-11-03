/*!
 * portal.js — portada del sitio a partir de App.SUBJECTS (assets/js/core.js):
 * «continuar donde lo dejaste», próximo examen y una tarjeta por asignatura con su progreso.
 */
(function () {
  "use strict";
  const { SUBJECTS, SECTIONS, store, esc, icon, daysTo, progress } = window.App;
  const list = document.getElementById("subjects");
  if (!list) return;

  list.innerHTML = SUBJECTS.map((s) => {
    const pct = progress.subject(s);
    const counts = SECTIONS.map((x) => ({ x, n: s.resources.filter((r) => r.sec === x.id).length }));
    const exam = s.exam && daysTo(s.exam.date) >= 0 ? `<span class="subject__exam">${icon("calendar")}Examen en ${daysTo(s.exam.date)} días</span>` : "";
    return `
    <li class="subject">
      <a class="subject__link" href="${esc(s.home)}">
        <span class="subject__top"><span class="subject__short">${esc(s.short)}</span>${exam}<span class="subject__go">${icon("chevron")}</span></span>
        <span class="subject__name">${esc(s.name)}</span>
        <span class="subject__desc">${esc(s.desc)}</span>
        <span class="subject__sections">${counts.map((c) => `<span>${icon(c.x.icon)}${esc(c.x.label)} <b>${c.n}</b></span>`).join("")}</span>
        <span class="subject__prog"><span class="res-bar"><span style="width:${pct}%"></span></span><span class="subject__pct">${pct}%</span></span>
      </a>
    </li>`;
  }).join("");

  // Continuar con el último recurso abierto, en cualquier asignatura.
  const last = store("app-last");
  const s = last && SUBJECTS.find((x) => x.id === last.s);
  const r = s && s.resources.find((x) => x.id === last.r);
  const box = document.getElementById("continue");
  if (box && r) {
    box.innerHTML = `<a class="continue" href="${esc(r.href)}">${icon("arrow")}<span><small>Continuar donde lo dejaste · ${esc(s.short)}</small><b>${esc(r.title)}</b></span></a>`;
    box.hidden = false;
  }
})();
