/*!
 * formulas.js — utilidades de FLI compartidas por varias páginas.
 *   FLI.CONN, FLI.SYM   conectivas y su clase de color
 *   FLI.paint(s)        colorea las conectivas de un texto ya escapado
 *   FLI.F(f)            fórmula (o varias separadas por " · ") como <code class="f">
 *   FLI.fx(s)           texto con fórmulas entre `acentos graves`, coloreadas
 *   FLI.fmt(s)          igual que fx pero sin colorear (enunciados del autotest)
 *   FLI.branchHTML(b)   árbol de un tableau (ramas, pasos y hojas cerradas/abiertas)
 * Requiere assets/js/core.js.
 */
(function (FLI) {
  "use strict";
  const esc = window.App.esc;

  const CONN = { "¬": "not", "∧": "and", "∨": "or", "→": "imp", "↔": "iff" };
  const SYM = { not: "¬", and: "∧", or: "∨", imp: "→", iff: "↔" };
  const LETTERS = ["A", "B", "C", "D", "E"];

  function paint(s) { return String(s).replace(/[¬∧∨→↔]/g, (c) => '<span class="c-' + CONN[c] + '">' + c + "</span>"); }
  function F(f) { return String(f).split(" · ").map((x) => '<code class="f">' + paint(esc(x)) + "</code>").join(" "); }
  function fx(s) { return esc(s).replace(/`([^`]+)`/g, (m, f) => '<code class="f">' + paint(f) + "</code>"); }
  function fmt(s) { return esc(s).replace(/`([^`]+)`/g, '<code class="f">$1</code>'); }

  /* Árbol de tableau: {lab?, steps?: [texto], split?: {why, br: [rama, ...]}, end?: {c: cerrada?, t}} */
  function branchHTML(b) {
    return `<div class="br">${b.lab ? `<div class="blab">${fx(b.lab)}</div>` : ""}${(b.steps || []).map((s) => `<div class="bstep">${fx(s)}</div>`).join("")}${b.split ? `<div class="bsplit">${fx(b.split.why)}</div><div class="kids">${b.split.br.map(branchHTML).join("")}</div>` : ""}${b.end ? `<div class="bend ${b.end.c ? "closed" : "open"}">${b.end.c ? "✘ " : "○ "}${fx(b.end.t)}</div>` : ""}</div>`;
  }

  Object.assign(FLI, { CONN, SYM, LETTERS, paint, F, fx, fmt, branchHTML });
})(window.FLI = window.FLI || {});
