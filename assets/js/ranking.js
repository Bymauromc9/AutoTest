/*!
 * ranking.js — página ranking.html: leaderboard global (total, esta semana y por asignatura).
 * La pestaña elegida va en el ancla (#semana, #fli…) para poder enlazarla.
 */
(function () {
  "use strict";
  const { esc, icon, ROOT, SUBJECTS } = window.App;
  const C = window.Cuentas;
  const reto = document.getElementById("rk-reto");
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
    const I = window.Insignias;
    let cat = {};
    if (I) { try { cat = I.porId(await I.catalogo()); } catch (e) { cat = {}; } }
    // Hasta 3 insignias junto al nombre: las destacadas de su vitrina o, si no ha elegido, las más raras.
    const insDe = (f) => {
      if (!I) return "";
      let ids = (f.vitrina || []).filter((id) => cat[id] && f.insignias[id]);
      if (!ids.length) ids = I.ordenar(Object.keys(f.insignias || {}).filter((id) => cat[id]).map((id) => cat[id])).map((x) => x.id);
      const n = Object.keys(f.insignias || {}).filter((id) => cat[id]).length;
      const ver = ids.slice(0, 3);
      return ver.length ? `<span class="rk-ins">${ver.map((id) => I.mini(cat[id])).join("")}${n > ver.length ? `<small>+${n - ver.length}</small>` : ""}</span>` : "";
    };
    out.innerHTML = `<ol class="rk-list" aria-label="Ranking ${esc(nombre)}">${d.filas.map((f) => `
      <li class="rk-row${f.pos <= 3 ? " top" + f.pos : ""}${f.yo ? " is-me" : ""}"${f.yo ? ' aria-current="true"' : ""}>
        <span class="rk-pos">${f.pos}</span>${av(f.nombre)}
        <span class="rk-name"><a class="rk-link" href="${ROOT}perfil.html?u=${encodeURIComponent(f.uid)}"><b>${esc(f.nombre)}${f.yo ? " (tú)" : ""}</b></a><small>${fmt(f.tests)} ${f.tests === 1 ? "test" : "tests"}${insDe(f)}</small></span>
        <span class="rk-pts">${fmt(f.puntos)}<small>puntos</small></span>
      </li>`).join("")}</ol>`;
  }
  /* Reto semanal: los 3 primeros de «Esta semana» se llevan una insignia (la entrega un administrador el lunes). */
  async function pintarReto() {
    if (!reto) return;
    const I = window.Insignias;
    let cat = {}, ult = null;
    try { cat = I ? I.porId(await I.catalogo()) : {}; } catch (e) { cat = {}; }
    if (!cat.semana_oro) { reto.hidden = true; return; }
    try { ult = (await C.retos(1))[0] || null; } catch (e) { ult = null; }
    let gan = [];
    try { gan = ult ? JSON.parse(ult.ganadores || "[]") : []; } catch (e) { gan = []; }
    const premio = ["semana_oro", "semana_plata", "semana_bronce"].filter((id) => cat[id]).map((id) => I.html(cat[id], { tam: "sm" })).join("");
    const fin = new Date(); fin.setDate(fin.getDate() + ((7 - fin.getDay()) % 7)); fin.setHours(23, 59, 0, 0);
    const quedan = Math.max(0, Math.ceil((fin - Date.now()) / 86400000));
    reto.innerHTML = `<div class="rk-reto__in">
      <div class="rk-reto__premio" aria-hidden="true">${premio}</div>
      <div class="rk-reto__txt"><b>Reto de la semana</b>
        <small>Los 3 primeros de <a href="#semana">«Esta semana»</a> se llevan su insignia para la vitrina. ${quedan <= 0 ? "Se cierra hoy a medianoche." : quedan === 1 ? "Queda 1 día." : "Quedan " + quedan + " días."}</small>
        ${gan.length ? `<small class="rk-reto__gan">Última semana: ${gan.slice(0, 3).map((g) => `${["🥇", "🥈", "🥉"][Math.min(2, (g.pos || 1) - 1)]} <a href="${ROOT}perfil.html?u=${encodeURIComponent(g.uid)}">${esc(g.nombre)}</a>`).join(" · ")}</small>` : ""}
      </div></div>`;
    reto.hidden = false;
  }
  pintarReto();
  window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (TABLAS.some((t) => t.id === h)) { tabla = h; pintar(); } });
  // Si hay puntos pendientes de enviar, se envían antes de pintar para que salgan ya.
  Promise.resolve(C.enviar()).finally(pintar);
})();
