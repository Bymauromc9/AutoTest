/*!
 * inicio.js — portada de FLI: muestra el progreso guardado (mejores notas, exámenes en curso,
 * ejercicios hechos) junto a cada recurso. Sólo lee localStorage: no modifica nada.
 * Requiere: assets/js/core.js.
 */
(function () {
  "use strict";
  const { store } = window.App;
  const n1 = (x) => Number(x).toFixed(1);
  const n2 = (x) => Number(x).toFixed(2).replace(".", ",");
  const count = (key) => { const d = store(key); return d && typeof d === "object" ? Object.keys(d).length : 0; };

  const progress = {
    autotest() {
      const done = [1, 2, 3, 4].map((t) => store("fli-best-" + t)).filter((x) => x != null);
      const g = store("fli-best-G");
      if (!done.length && g == null) return "";
      return [done.length ? `${done.length} de 4 temas hechos` : "", g != null ? `test general: <b>${n1(g)}</b>` : ""].filter(Boolean).join(" · ");
    },
    examenes() {
      const cur = store("fli-exam-current");
      const bests = [0, 1, 2, 3, 4, 5].map((i) => store("fli-exam-best-" + i)).filter((x) => x != null);
      const parts = [];
      if (cur && !cur.done) parts.push("<b>examen en curso</b>");
      if (bests.length) parts.push(`mejor nota <b>${n2(Math.max(...bests))}</b>`);
      return parts.join(" · ");
    },
    equivalencias() { const b = store("eq-best"); return b != null ? `mejor nota <b>${n1(b)}</b>` : ""; },
    guia() { const p = store("fli-gpart"); return p ? `última parte vista: ${p}` : ""; },
    hechos(el) { const n = count(el.dataset.key), total = Number(el.dataset.total); return n ? `<b>${n}</b> de ${total} hechos` : ""; }
  };

  document.querySelectorAll("[data-progress]").forEach((el) => {
    const fn = progress[el.dataset.progress];
    const html = fn ? fn(el) : "";
    if (html) { el.innerHTML = html; el.hidden = false; }
  });
})();
