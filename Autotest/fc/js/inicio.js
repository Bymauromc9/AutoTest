/*!
 * inicio.js — portada de FC: muestra el progreso guardado (mejores notas del autotest, ejercicios de
 * prácticas hechos, última parte vista de cada guía) junto a cada recurso. Sólo lee localStorage.
 * Requiere: assets/js/core.js.
 */
(function () {
  "use strict";
  const { store } = window.App;
  const n1 = (x) => Number(x).toFixed(1);
  const count = (key) => { const d = store(key); return d && typeof d === "object" ? Object.keys(d).length : 0; };

  const progress = {
    autotest() {
      const done = [1, 2, 3, 4, 5, 6].map((t) => store("fc-best-" + t)).filter((x) => x != null);
      const g = store("fc-best-G");
      if (!done.length && g == null) return "";
      return [done.length ? `${done.length} de 6 temas hechos` : "", g != null ? `test general: <b>${n1(g)}</b>` : ""].filter(Boolean).join(" · ");
    },
    hechos(el) { const n = count(el.dataset.key), total = Number(el.dataset.total); return n ? `<b>${n}</b> de ${total} hechos` : ""; },
    visto(el) { const p = store(el.dataset.key); return p && p.label ? `última parte vista: ${App.esc(p.label)}` : ""; }
  };

  document.querySelectorAll("[data-progress]").forEach((el) => {
    const fn = progress[el.dataset.progress];
    const html = fn ? fn(el) : "";
    if (html) { el.innerHTML = html; el.hidden = false; }
  });
})();
