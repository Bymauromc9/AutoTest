/*!
 * ranking.js — página ranking.html: leaderboard global (total, esta semana y por asignatura).
 * La pestaña elegida va en el ancla (#semana, #fli…) para poder enlazarla.
 */
(function () {
  "use strict";
  const { esc, icon, ROOT, SUBJECTS } = window.App;
  const C = window.Cuentas;
  const out = document.getElementById("rk"), me = document.getElementById("rk-me"), nav = document.getElementById("rk-tabs");
  if (!out || !C) return;
  const TABLAS = [{ id: "total", label: "General" }, { id: "semana", label: "Esta semana" }].concat(SUBJECTS.map((s) => ({ id: s.id, label: s.short })));
  const fmt = C.fmt;
  const av = (n) => `<span class="cta-av" aria-hidden="true">${esc((n || "?").charAt(0).toUpperCase())}</span>`;
  let tabla = TABLAS.some((t) => t.id === location.hash.slice(1)) ? location.hash.slice(1) : "total";

  function tabs() {
    nav.innerHTML = TABLAS.map((t) => `<a class="tab${t.id === tabla ? " on" : ""}" href="#${t.id}"${t.id === tabla ? ' aria-current="true"' : ""}>${esc(t.label)}</a>`).join("");
  }
  async function pintar() {
    tabs();
    const ses = C.actual();
    if (!(await C.servidor())) {
      me.innerHTML = "";
      out.innerHTML = `<p class="callout warn">${location.protocol === "file:" ? "El ranking necesita la web publicada: abierta desde un archivo no hay conexión con el servidor." : "El ranking no está disponible ahora mismo (el servidor de cuentas no está configurado o no responde)."}</p>`;
      return;
    }
    if (ses && ses.local) me.innerHTML = `<p class="callout">Estás con un <b>perfil local</b>: sus puntos no entran en el ranking. <a href="${ROOT}cuenta.html?cambiar=1">Crea una cuenta</a> para aparecer.</p>`;
    out.setAttribute("aria-busy", "true");
    let d;
    try { d = await C.ranking(tabla); }
    catch (e) { out.innerHTML = `<p class="callout warn">${esc(e.message)}</p>`; out.removeAttribute("aria-busy"); return; }
    out.removeAttribute("aria-busy");
    const nombre = TABLAS.find((t) => t.id === tabla).label;
    if (d.yo && !(ses && ses.local)) {
      me.innerHTML = `<div class="rk-me"><span class="rk-me__pos">${d.yo.pos ? "#" + d.yo.pos : "—"}</span><span class="rk-me__txt"><b>${esc(d.yo.nombre)}, ${d.yo.pos ? "vas en el puesto " + d.yo.pos : "todavía no tienes puntos aquí"}</b>
        <small>${fmt(d.yo.puntos)} puntos · ${esc(nombre)}${d.yo.pos ? "" : " · termina un test para entrar en la tabla"}</small></span></div>`;
    }
    if (!d.filas.length) {
      out.innerHTML = `<div class="rk-list"><p class="rk-empty">${icon("trophy")}<br>Nadie tiene puntos ${tabla === "semana" ? "esta semana" : "aquí"} todavía. ¡El primer test que termines te pone arriba!</p></div>`;
      return;
    }
    out.innerHTML = `<ol class="rk-list" aria-label="Ranking ${esc(nombre)}">${d.filas.map((f) => `
      <li class="rk-row${f.pos <= 3 ? " top" + f.pos : ""}${f.yo ? " is-me" : ""}"${f.yo ? ' aria-current="true"' : ""}>
        <span class="rk-pos">${f.pos}</span>${av(f.nombre)}
        <span class="rk-name"><b>${esc(f.nombre)}${f.yo ? " (tú)" : ""}</b><small>${fmt(f.tests)} ${f.tests === 1 ? "test" : "tests"}</small></span>
        <span class="rk-pts">${fmt(f.puntos)}<small>puntos</small></span>
      </li>`).join("")}</ol>`;
  }
  window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (TABLAS.some((t) => t.id === h)) { tabla = h; pintar(); } });
  // Si hay puntos pendientes de enviar, se envían antes de pintar para que salgan ya.
  Promise.resolve(C.enviar()).finally(pintar);
})();
