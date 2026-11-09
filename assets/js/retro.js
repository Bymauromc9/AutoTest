/*!
 * retro.js — modo terminal «de castigo» (fósforo verde, letra de máquina y líneas de pantalla CRT).
 *
 * Easter egg escondido: se activa escribiendo «castigo» en cualquier página (fuera de un campo de texto).
 * Se quita así:
 *   teclado   Espacio dos veces seguidas
 *   móvil     dos toques rápidos en la pantalla
 * No se avisa de cómo quitarlo (es la gracia); sólo hay una pista en la consola del navegador.
 * Lo recuerda el navegador (clave app-retro) y se aplica en todas las páginas. El estado y el tema los
 * lleva core.js (App.retro); aquí se reconoce el gesto de salida y se pinta la animación.
 * Estilos: assets/css/retro.css. Requiere: assets/js/core.js.
 */
(function () {
  "use strict";
  if (!window.App || !window.App.retro || window.Retro) return;
  const R = window.App.retro;
  const DOBLE = 600;           // ms máximos entre las dos pulsaciones o los dos toques

  // Easter egg: escribir «castigo» (fuera de un campo de texto) activa el modo.
  const CLAVE = "castigo";
  let tecleado = "";
  document.addEventListener("keydown", (e) => {
    if (R.get() || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || editable(e.target)) return;
    tecleado = (tecleado + e.key.toLowerCase()).slice(-CLAVE.length);
    if (tecleado === CLAVE) { tecleado = ""; castigo(); }
  });

  // Teclado: Espacio, Espacio.
  const editable = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName));
  let ultimoEspacio = 0;
  document.addEventListener("keydown", (e) => {
    if (!R.get()) return;
    if (e.key !== " " || e.repeat || e.ctrlKey || e.metaKey || e.altKey || editable(e.target)) { ultimoEspacio = 0; return; }
    const ahora = Date.now();
    if (ahora - ultimoEspacio < DOBLE) { e.preventDefault(); ultimoEspacio = 0; salir(); }
    else ultimoEspacio = ahora;
  });

  // Móvil: dos toques rápidos en el mismo sitio (sin arrastrar).
  let ini = null, ultimoToque = null;
  document.addEventListener("touchstart", (e) => {
    ini = R.get() && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null;
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!ini || !e.changedTouches.length) return;
    const t = e.changedTouches[0], ahora = Date.now();
    const toque = Math.abs(t.clientX - ini.x) < 12 && Math.abs(t.clientY - ini.y) < 12 && ahora - ini.t < 350;
    ini = null;
    if (!toque) { ultimoToque = null; return; }
    const p = ultimoToque;
    if (p && ahora - p.t < DOBLE && Math.abs(t.clientX - p.x) < 40 && Math.abs(t.clientY - p.y) < 40) { ultimoToque = null; salir(); }
    else ultimoToque = { x: t.clientX, y: t.clientY, t: ahora };
  }, { passive: true });

  const LINEAS_ON = [
    "> aviso --cerrar",
    "[ OK ] Aviso cerrado",
    "[ !! ] Aviso de los administradores ignorado",
    "[ !! ] Activando el protocolo de castigo…",
    "[ OK ] Bienvenido a 1983."
  ];
  const LINEAS_OFF = ["> exit", "Has escapado. Volviendo al siglo XXI…"];
  const reducido = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  let capa = null;
  /** Pantalla de «arranque» que escribe unas líneas y desaparece sola (o al tocarla). */
  function animar(lineas, alFinal) {
    if (capa) capa.remove();
    capa = document.createElement("div");
    capa.className = "retro-boot";
    capa.setAttribute("role", "status");
    capa.setAttribute("aria-live", "polite");
    const pre = document.createElement("pre");
    capa.appendChild(pre);
    document.body.appendChild(capa);
    const el = capa;
    let cerrado = false;
    const cerrar = () => {
      if (cerrado) return; cerrado = true;
      el.classList.add("is-out");
      setTimeout(() => { el.remove(); if (capa === el) capa = null; }, reducido() ? 0 : 250);
    };
    el.addEventListener("click", cerrar);
    if (alFinal) alFinal();
    if (reducido()) { pre.textContent = lineas.join("\n"); setTimeout(cerrar, 1800); return; }
    const texto = lineas.join("\n");
    let i = 0;
    (function escribir() {
      if (cerrado) return;
      i = Math.min(texto.length, i + 3);
      pre.textContent = texto.slice(0, i);
      if (i < texto.length) setTimeout(escribir, 16);
      else setTimeout(cerrar, 1100);
    })();
  }

  /** Lo llama core.js al cerrar el aviso de los administradores. */
  function castigo() { if (!R.get()) animar(LINEAS_ON, () => R.set(true)); }
  function salir() { if (R.get()) animar(LINEAS_OFF, () => R.set(false)); }

  if (R.get() && window.console && console.log) {
    console.log("%c¿Atrapado? Pulsa ␣ ␣", "color:#3f3;background:#000;font:600 13px monospace;padding:4px 8px");
  }
  window.Retro = Object.freeze({ castigo, salir });
})();
