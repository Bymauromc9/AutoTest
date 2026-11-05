/*!
 * util.js — utilidades de GOHP compartidas por varias páginas.
 *   GOHP.LETTERS   letras de las opciones del autotest
 *   GOHP.fmt(s)    escapa el texto y muestra lo que va entre `acentos graves` como código
 * Requiere assets/js/core.js.
 */
(function (GOHP) {
  "use strict";
  const esc = window.App.esc;
  const LETTERS = ["A", "B", "C", "D", "E"];
  // Potencias: 2^(n−1) → 2<sup>n−1</sup>, 2^32 → 2<sup>32</sup>, 2^−126 → 2<sup>−126</sup>
  function sup(s) { return s.replace(/\^\(([^)]+)\)/g, "<sup>$1</sup>").replace(/\^(−?[0-9a-zA-Z]+)/g, "<sup>$1</sup>"); }
  function fmt(s) { return sup(esc(s)).replace(/`([^`]+)`/g, '<code class="f">$1</code>'); }
  Object.assign(GOHP, { LETTERS, fmt });
})(window.GOHP = window.GOHP || {});
