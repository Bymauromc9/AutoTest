/*!
 * l1.js — páginas de prácticas de L1: resoluciones plegables (abrir/cerrar todas, abrir la del
 * ejercicio enlazado y abrirlas todas al imprimir). Requiere: fli/js/ejercicios.js.
 */
(function () {
  "use strict";
  var sols = Array.prototype.slice.call(document.querySelectorAll("details.sol"));
  document.querySelectorAll("[data-sol]").forEach(function (b) {
    b.addEventListener("click", function () {
      var open = b.getAttribute("data-sol") === "open";
      sols.forEach(function (d) { d.open = open; });
    });
  });
  function openTarget() {
    var id = location.hash.slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    var d = el && (el.matches("details.sol") ? el : el.querySelector && el.querySelector("details.sol"));
    if (d) d.open = true;
  }
  window.addEventListener("hashchange", openTarget);
  openTarget();
  var was = [];
  window.addEventListener("beforeprint", function () { was = sols.map(function (d) { return d.open; }); sols.forEach(function (d) { d.open = true; }); });
  window.addEventListener("afterprint", function () { sols.forEach(function (d, i) { d.open = was[i]; }); });
})();
