/*!
 * inicio.js — portada de IP: muestra el progreso guardado (mejores notas del autotest, ejercicios de
 * prácticas hechos, última parte vista de cada guía) junto a cada recurso. Sólo lee localStorage.
 * Copia adaptada de fc/js/inicio.js. Requiere: assets/js/core.js.
 */
(function () {
  "use strict";
  const { store } = window.App;
  const n1 = (x) => Number(x).toFixed(1);
  const count = (key) => { const d = store(key); return d && typeof d === "object" ? Object.keys(d).length : 0; };
  const BLOQUES = [0, 1, 2, 3, 4, 6, 5];   // temas 0–5 (el 5 es el bloque 6) y el de C++ (ip/js/data/banco.js)

  const progress = {
    autotest() {
      const done = BLOQUES.map((t) => store("ip-best-" + t)).filter((x) => x != null);
      const g = store("ip-best-G");
      if (!done.length && g == null) return "";
      return [done.length ? `${done.length} de ${BLOQUES.length} bloques hechos` : "", g != null ? `test general: <b>${n1(g)}</b>` : ""].filter(Boolean).join(" · ");
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
