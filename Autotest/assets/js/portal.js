/*!
 * portal.js — portada del sitio: una tarjeta por asignatura a partir de App.SUBJECTS (assets/js/core.js).
 */
(function () {
  "use strict";
  const { SUBJECTS, esc } = window.App;
  const list = document.getElementById("subjects");
  if (!list) return;
  list.innerHTML = SUBJECTS.map((s) => `
    <li class="subject">
      <a class="subject__link" href="${esc(s.home)}">
        <span class="subject__short">${esc(s.short)}</span>
        <span class="subject__body">
          <span class="subject__name">${esc(s.name)}</span>
          <span class="subject__desc">${esc(s.desc)}</span>
          <span class="subject__sections">${s.sections.map((x) => `<span>${esc(x.label)}</span>`).join("")}</span>
        </span>
        <span class="subject__go" aria-hidden="true">→</span>
      </a>
    </li>`).join("");
})();
