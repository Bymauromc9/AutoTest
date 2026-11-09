/*!
 * admin.js — panel de administración (admin.html). Sólo para cuentas con el rol de administrador
 * (node scripts/admin/admin.js admin <usuario>); las reglas de Firestore lo vuelven a exigir en cada
 * escritura, así que este fichero sólo organiza la interfaz.
 *
 *   #resumen    cifras de la web, lo más activo de la semana y lo que hay publicado
 *   #usuarios   buscar cuentas, corregir puntos, ponerlos a cero y bloquear (sus puntos no cuentan
 *               y deja de salir en el ranking). Borrar cuentas y cambiar contraseñas: en la terminal.
 *   #avisos     el aviso que sale debajo de la barra en toda la web (config/web)
 *   #examenes   las fechas de la cuenta atrás (config/web → examenes); sin cambios, las del código
 *   #reportes   los errores que mandan los usuarios con «Reportar un error» (reportes/<id>)
 *   #insignias  el reto semanal (entregar las insignias de la semana), el catálogo, el creador de insignias
 *               y darlas o quitarlas a la gente (insignias/<id>, usuarios/<uid>.insignias, retos/<semana>)
 *
 * Requiere: assets/js/core.js y assets/js/cuentas.js (Cuentas.datos: Firestore con la sesión activa).
 */
(function () {
  "use strict";
  const { esc, icon, ROOT, SUBJECTS, config, daysTo } = window.App;
  const C = window.Cuentas, I = window.Insignias;
  const box = document.getElementById("adm"), nav = document.getElementById("adm-tabs");
  if (!box || !C) return;
  const D = C.datos, v = D.valor, fmt = C.fmt;
  const ASIG = SUBJECTS.map((s) => ({ id: s.id, short: s.short }));
  const TABS = [
    { id: "resumen", label: "Resumen" }, { id: "usuarios", label: "Usuarios" }, { id: "avisos", label: "Aviso" },
    { id: "examenes", label: "Exámenes" }, { id: "reportes", label: "Reportes" }, { id: "insignias", label: "Insignias" }
  ];
  const st = { usuarios: [], reportes: [], cfg: {}, cargado: false, filtroRep: "abierto", buscar: "", filtroUsu: "todas", cat: [], retos: [] };
  let tab = TABS.some((t) => t.id === location.hash.slice(1)) ? location.hash.slice(1) : "resumen";

  /* ---------------- Utilidades ---------------- */
  const fecha = (ts) => ts ? new Date(ts).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const fechaLarga = (iso) => { const [y, m, d] = iso.split("-").map(Number); return d + " de " + MESES[m - 1] + " de " + y; };
  const hoy = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const semana = D.semana();
  const msgError = (e) => e && e.status === 403
    ? "Firebase ha rechazado el cambio. Comprueba que has publicado las reglas nuevas (firestore.rules) y que tu cuenta sigue siendo administradora."
    : (e && e.message) || "Algo ha fallado. Prueba otra vez.";
  function aviso(msg, tipo) {
    const el = document.getElementById("adm-msg");
    if (!el) return;
    el.className = "callout adm-msg" + (tipo === "error" ? " warn" : "");
    el.textContent = msg; el.hidden = !msg;
    if (msg && tipo !== "error") setTimeout(() => { if (el.textContent === msg) el.hidden = true; }, 5000);
  }
  /** Botón de dos pasos para acciones que no se pueden deshacer. */
  function confirmar(btn, fn) {
    let armado = false, t;
    const txt = btn.textContent;
    btn.addEventListener("click", () => {
      if (!armado) { armado = true; btn.textContent = "Pulsa otra vez para confirmar"; btn.classList.add("is-armed"); t = setTimeout(() => { armado = false; btn.textContent = txt; btn.classList.remove("is-armed"); }, 3500); return; }
      clearTimeout(t); armado = false; btn.textContent = txt; btn.classList.remove("is-armed"); fn();
    });
  }
  function ocupado(el, on) { el.querySelectorAll("button, input, select, textarea").forEach((x) => { x.disabled = on; }); el.setAttribute("aria-busy", on ? "true" : "false"); }

  /* ---------------- Datos ---------------- */
  async function cargarUsuarios() {
    st.usuarios = await D.consultar({ from: [{ collectionId: "usuarios" }], orderBy: [{ field: { fieldPath: "puntos" }, direction: "DESCENDING" }] });
  }
  async function cargarReportes() {
    st.reportes = await D.consultar({ from: [{ collectionId: "reportes" }], orderBy: [{ field: { fieldPath: "creado" }, direction: "DESCENDING" }], limit: 300 });
  }
  async function cargarConfig() { st.cfg = await C.cargarConfig(true); }
  async function cargarInsignias() {
    const [cat, retos] = await Promise.all([C.catalogo(), C.retos(12).catch(() => [])]);
    st.cat = cat; st.retos = retos;
    if (I) I.catalogo(true).catch(() => {});        // refresca la caché de la pestaña
  }
  async function cargarTodo() {
    const r = await Promise.allSettled([cargarUsuarios(), cargarReportes(), cargarConfig(), cargarInsignias()]);
    const fallo = r.find((x) => x.status === "rejected");
    st.cargado = true;
    if (fallo) throw fallo.reason;
  }

  /* ---------------- Pestañas ---------------- */
  function pintarTabs() {
    const abiertos = st.reportes.filter((r) => r.estado !== "resuelto").length;
    nav.innerHTML = TABS.map((t) => `<a class="tab${t.id === tab ? " on" : ""}" href="#${t.id}"${t.id === tab ? ' aria-current="page"' : ""}>${esc(t.label)}${t.id === "reportes" && abiertos ? ` <span class="adm-badge">${abiertos}</span>` : ""}</a>`).join("");
    nav.hidden = false;
  }
  const VISTAS = { resumen, usuarios, avisos, examenes, reportes, insignias };
  function pintar() {
    pintarTabs();
    box.innerHTML = `<p class="callout adm-msg" id="adm-msg" role="status" hidden></p><div id="adm-vista"></div>`;
    VISTAS[tab](document.getElementById("adm-vista"));
  }
  window.addEventListener("hashchange", () => {
    const h = location.hash.slice(1);
    if (st.cargado && TABS.some((t) => t.id === h) && h !== tab) { tab = h; pintar(); }
  });

  /* ---------------- Resumen ---------------- */
  function resumen(el) {
    const U = st.usuarios;
    const activos = U.filter((u) => (u[semana] || 0) > 0);
    const tests = U.reduce((a, u) => a + (u.tests || 0), 0);
    const abiertos = st.reportes.filter((r) => r.estado !== "resuelto").length;
    const porAsig = ASIG.map((a) => ({ a, n: U.filter((u) => !u.bloqueado).reduce((s, u) => s + (u[a.id] || 0), 0) }));
    const maxA = Math.max(1, ...porAsig.map((x) => x.n));
    const top = activos.filter((u) => !u.bloqueado).sort((a, b) => (b[semana] || 0) - (a[semana] || 0)).slice(0, 5);
    const c = st.cfg, avisoActivo = c.aviso && (!c.avisoHasta || daysTo(c.avisoHasta) >= 0);
    el.innerHTML = `
      <div class="adm-tiles">
        <div class="adm-tile"><b>${fmt(U.length)}</b><span>cuentas</span></div>
        <div class="adm-tile"><b>${fmt(activos.length)}</b><span>han hecho tests esta semana</span></div>
        <div class="adm-tile"><b>${fmt(tests)}</b><span>tests terminados en total</span></div>
        <a class="adm-tile${abiertos ? " is-alert" : ""}" href="#reportes"><b>${fmt(abiertos)}</b><span>${abiertos === 1 ? "reporte sin revisar" : "reportes sin revisar"}</span></a>
      </div>
      <div class="adm-cols">
        <section class="adm-card"><h2>Los más activos esta semana</h2>
          ${top.length ? `<ol class="adm-top">${top.map((u) => `<li><span>${esc(u.nombre)}</span><b>${fmt(u[semana])}</b></li>`).join("")}</ol>` : `<p class="muted">Nadie ha hecho tests esta semana todavía.</p>`}
        </section>
        <section class="adm-card"><h2>Puntos por asignatura</h2>
          <ul class="adm-bars">${porAsig.map((x) => `<li><span>${esc(x.a.short)}</span><span class="adm-meter"><i style="width:${Math.round(100 * x.n / maxA)}%"></i></span><b>${fmt(x.n)}</b></li>`).join("")}</ul>
        </section>
        <section class="adm-card"><h2>Publicado ahora</h2>
          <p><b>Aviso:</b> ${avisoActivo ? esc(c.aviso) + (c.avisoHasta ? ` <span class="muted">(hasta el ${esc(fechaLarga(c.avisoHasta))})</span>` : "") : '<span class="muted">ninguno</span>'} · <a href="#avisos">${avisoActivo ? "cambiar" : "poner uno"}</a></p>
          <p><b>Exámenes:</b> ${SUBJECTS.map((s) => `${esc(s.short)} ${s.exam ? esc(fechaLarga(s.exam.date)) : '<span class="muted">sin fecha</span>'}`).join(" · ")} · <a href="#examenes">cambiar</a></p>
          <p class="muted">${c.examenes ? "Las fechas de exámenes están cambiadas desde el panel." : "Las fechas de exámenes son las del código."}</p>
        </section>
      </div>`;
  }

  /* ---------------- Usuarios ---------------- */
  function usuarios(el) {
    el.innerHTML = `
      <div class="adm-bar">
        <label class="adm-search"><span class="visually-hidden">Buscar usuario</span><input type="search" id="u-q" placeholder="Buscar usuario…" value="${esc(st.buscar)}" autocomplete="off"></label>
        <label><span class="visually-hidden">Mostrar</span><select id="u-f">
          <option value="todas"${st.filtroUsu === "todas" ? " selected" : ""}>Todas las cuentas</option>
          <option value="bloqueadas"${st.filtroUsu === "bloqueadas" ? " selected" : ""}>Bloqueadas</option>
          <option value="admins"${st.filtroUsu === "admins" ? " selected" : ""}>Administradores</option>
          <option value="semana"${st.filtroUsu === "semana" ? " selected" : ""}>Activas esta semana</option>
        </select></label>
        <button type="button" class="btn ghost" id="u-rec">Recargar</button>
      </div>
      <div class="adm-table" id="u-tabla"></div>
      <p class="muted adm-nota">Borrar una cuenta o cambiarle la contraseña se hace desde la terminal (scripts/admin): el panel te da el comando al abrir cada cuenta.</p>`;
    const q = el.querySelector("#u-q"), f = el.querySelector("#u-f");
    q.addEventListener("input", () => { st.buscar = q.value; tabla(); });
    f.addEventListener("change", () => { st.filtroUsu = f.value; tabla(); });
    el.querySelector("#u-rec").addEventListener("click", async (e) => {
      e.currentTarget.disabled = true;
      try { await cargarUsuarios(); tabla(); aviso("Lista actualizada."); } catch (ex) { aviso(msgError(ex), "error"); }
      e.currentTarget.disabled = false;
    });
    tabla();
  }
  function tabla() {
    const t = document.getElementById("u-tabla");
    if (!t) return;
    const n = C.idDe(st.buscar);
    const lista = st.usuarios.filter((u) => (!n || C.idDe(u.nombre).includes(n))
      && (st.filtroUsu !== "bloqueadas" || u.bloqueado) && (st.filtroUsu !== "admins" || u.admin) && (st.filtroUsu !== "semana" || (u[semana] || 0) > 0));
    if (!lista.length) { t.innerHTML = `<p class="muted adm-empty">No hay ninguna cuenta con ese filtro.</p>`; return; }
    t.innerHTML = `<table><thead><tr><th>Usuario</th><th class="n">Puntos</th>${ASIG.map((a) => `<th class="n">${esc(a.short)}</th>`).join("")}<th class="n">Semana</th><th class="n">Tests</th><th>Último test</th><th><span class="visually-hidden">Acciones</span></th></tr></thead>
      <tbody>${lista.map((u) => `<tr${u.bloqueado ? ' class="is-blocked"' : ""}>
        <td><b>${esc(u.nombre)}</b>${u.admin ? '<span class="adm-tag">admin</span>' : ""}${u.bloqueado ? '<span class="adm-tag bad">bloqueada</span>' : ""}</td>
        <td class="n">${fmt(u.puntos)}</td>${ASIG.map((a) => `<td class="n">${fmt(u[a.id])}</td>`).join("")}<td class="n">${fmt(u[semana])}</td><td class="n">${fmt(u.tests)}</td>
        <td>${fecha(u.ultimo)}</td><td><button type="button" class="btn ghost adm-sm" data-u="${esc(u._id)}">Gestionar</button></td></tr>`).join("")}</tbody></table>`;
    t.querySelectorAll("[data-u]").forEach((b) => b.addEventListener("click", () => gestionar(b.dataset.u)));
  }

  /** Lee la cuenta al día y escribe los campos indicados, si nadie la ha cambiado entre medias. */
  async function cambiarUsuario(uid, calcular) {
    const u = await D.leer("usuarios/" + uid);
    if (!u) throw new Error("Esa cuenta ya no existe.");
    const campos = calcular(u);
    const fields = {};
    Object.keys(campos).forEach((k) => { fields[k] = v(campos[k]); });
    await D.escribir([{ update: { name: D.ruta("usuarios/" + uid), fields }, updateMask: { fieldPaths: Object.keys(campos) }, currentDocument: { updateTime: u._t } }]);
    return Object.assign(u, campos);
  }

  let dlg = null;
  function gestionar(uid) {
    const u = st.usuarios.find((x) => x._id === uid);
    if (!u) return;
    if (!dlg) { dlg = document.createElement("dialog"); dlg.className = "adm-dlg"; document.body.appendChild(dlg); }
    const id = C.idDe(u.nombre);
    dlg.innerHTML = `<div class="adm-dlg__in">
      <header><h2>${esc(u.nombre)}</h2><button type="button" class="adm-x" aria-label="Cerrar">×</button></header>
      <p class="muted">${fmt(u.puntos)} puntos · ${fmt(u.tests)} tests · ${fmt(u[semana])} esta semana${u.bloqueado ? " · <b>bloqueada</b>" : ""}${u.admin ? " · administrador" : ""}<br>Cuenta creada: ${fecha(u.creado)} · último test: ${fecha(u.ultimo)}</p>
      <p class="callout warn adm-dlg__err" role="alert" hidden></p>

      <section class="adm-sec"><h3>Corregir puntos</h3>
        <p class="muted">Suma o resta puntos en una asignatura (y en el total). Úsalo para deshacer puntos conseguidos con trampas o compensar un fallo de la web. Nunca baja de 0.</p>
        <div class="adm-row">
          <label>Asignatura<select id="g-asig">${ASIG.map((a) => `<option value="${a.id}">${esc(a.short)} (${fmt(u[a.id])})</option>`).join("")}</select></label>
          <label>Puntos (negativo para restar)<input type="number" id="g-n" step="5" value="0" inputmode="numeric"></label>
        </div>
        <label class="adm-chk"><input type="checkbox" id="g-sem" checked> Aplicarlo también al ranking de esta semana</label>
        <p class="adm-prev" id="g-prev"></p>
        <button type="button" class="btn" id="g-ok">Aplicar corrección</button>
      </section>

      <section class="adm-sec"><h3>Poner a cero</h3>
        <p class="muted">Deja sus puntos a 0 en el total, en cada asignatura y en esta semana. Conserva la cuenta, el número de tests y su progreso.</p>
        <button type="button" class="btn danger" id="g-cero">Poner sus puntos a cero</button>
      </section>

      <section class="adm-sec"><h3>${u.bloqueado ? "Desbloquear" : "Bloquear"}</h3>
        <p class="muted">${u.bloqueado ? "Volverá a salir en el ranking y sus próximos tests volverán a sumar puntos." : "Deja de salir en el ranking, sus tests ya no suman puntos y no puede mandar reportes. Puede seguir estudiando con normalidad."}</p>
        <button type="button" class="btn ${u.bloqueado ? "" : "danger"}" id="g-bloq">${u.bloqueado ? "Desbloquear la cuenta" : "Bloquear la cuenta"}</button>
      </section>

      <section class="adm-sec"><h3>Insignias</h3>
        <div id="g-ins"></div>
      </section>

      <section class="adm-sec"><h3>Desde la terminal</h3>
        <p class="muted">En la carpeta scripts/admin, con la clave de Firebase:</p>
        <ul class="adm-cmds">
          <li><code>node admin.js resetear ${esc(id)} &lt;contraseña nueva&gt;</code><span>cambia su contraseña</span></li>
          <li><code>node admin.js borrar ${esc(id)}</code><span>borra la cuenta entera</span></li>
          <li><code>node admin.js ${u.admin ? "quitar-admin" : "admin"} ${esc(id)}</code><span>${u.admin ? "le quita" : "le da"} el acceso a este panel</span></li>
        </ul>
      </section>
    </div>`;
    const err = dlg.querySelector(".adm-dlg__err");
    const fallo = (e) => { err.textContent = msgError(e); err.hidden = false; ocupado(dlg, false); };
    const hecho = async (txt) => { dlg.close(); aviso(txt); tabla(); };
    dlg.querySelector(".adm-x").onclick = () => dlg.close();

    const sel = dlg.querySelector("#g-asig"), num = dlg.querySelector("#g-n"), sem = dlg.querySelector("#g-sem"), prev = dlg.querySelector("#g-prev");
    const efectivo = (x) => { const n = Math.trunc(Number(num.value) || 0); return Math.max(n, -(x[sel.value] || 0)); };
    const previsualizar = () => {
      const n = efectivo(u);
      prev.textContent = n ? `Total: ${fmt(u.puntos)} → ${fmt(Math.max(0, u.puntos + n))} · ${sel.value.toUpperCase()}: ${fmt(u[sel.value])} → ${fmt((u[sel.value] || 0) + n)}` +
        (sem.checked ? ` · semana: ${fmt(u[semana])} → ${fmt(Math.max(0, (u[semana] || 0) + n))}` : "") : "Escribe cuántos puntos sumar o restar.";
    };
    [sel, num, sem].forEach((x) => x.addEventListener("input", previsualizar));
    previsualizar();
    dlg.querySelector("#g-ok").onclick = async () => {
      if (!efectivo(u)) { num.focus(); return; }
      ocupado(dlg, true);
      try {
        const asig = sel.value, conSemana = sem.checked;
        const nuevo = await cambiarUsuario(uid, (x) => {
          const n = efectivo(x), r = { puntos: Math.max(0, (x.puntos || 0) + n), [asig]: (x[asig] || 0) + n };
          if (conSemana) r[semana] = Math.max(0, (x[semana] || 0) + n);
          return r;
        });
        Object.assign(u, nuevo);
        hecho(`Puntos de ${u.nombre} corregidos: ahora tiene ${fmt(u.puntos)}.`);
      } catch (e) { fallo(e); }
    };
    confirmar(dlg.querySelector("#g-cero"), async () => {
      ocupado(dlg, true);
      try {
        Object.assign(u, await cambiarUsuario(uid, () => ({ puntos: 0, fli: 0, fc: 0, ip: 0, gohp: 0, amd: 0, aed: 0, [semana]: 0 })));
        hecho(`Los puntos de ${u.nombre} están a cero.`);
      } catch (e) { fallo(e); }
    });
    const bloq = dlg.querySelector("#g-bloq");
    const cambiarBloqueo = async () => {
      ocupado(dlg, true);
      try {
        Object.assign(u, await cambiarUsuario(uid, (x) => ({ bloqueado: !x.bloqueado })));
        hecho(u.bloqueado ? `${u.nombre} está bloqueada: ya no sale en el ranking.` : `${u.nombre} está desbloqueada.`);
      } catch (e) { fallo(e); }
    };
    if (u.bloqueado) bloq.onclick = cambiarBloqueo; else confirmar(bloq, cambiarBloqueo);
    insigniasDeUsuario(dlg.querySelector("#g-ins"), u, fallo);
    dlg.showModal();
  }

  /* ---------------- Aviso ---------------- */
  function avisos(el) {
    const c = st.cfg;
    el.innerHTML = `
      <div class="adm-cols adm-cols--2">
        <form class="adm-card adm-form" id="av-form" novalidate>
          <h2>Aviso para toda la web</h2>
          <p class="muted">Sale debajo de la barra superior en todas las páginas, hasta la fecha que pongas. Cada usuario puede cerrarlo; si publicas uno nuevo, vuelve a salir.</p>
          <label>Texto del aviso<textarea id="av-t" rows="3" maxlength="500" required placeholder="Por ejemplo: el examen de FC se ha movido al 20 de enero.">${esc(c.aviso || "")}</textarea><small class="adm-count" id="av-n"></small></label>
          <fieldset class="adm-radios"><legend>Tipo</legend>
            <label><input type="radio" name="av-tipo" value="info"${c.avisoTipo !== "importante" ? " checked" : ""}> Información</label>
            <label><input type="radio" name="av-tipo" value="importante"${c.avisoTipo === "importante" ? " checked" : ""}> Importante (en naranja)</label>
          </fieldset>
          <div class="adm-row">
            <label>Enlace (opcional)<input type="text" id="av-l" maxlength="300" placeholder="fc/examen/guia.html o https://…" value="${esc(c.avisoEnlace || "")}"></label>
            <label>Texto del enlace<input type="text" id="av-lt" maxlength="60" placeholder="Más información" value="${esc(c.avisoTextoEnlace || "")}"></label>
          </div>
          <label>Mostrar hasta el día (incluido; vacío = hasta que lo quites)<input type="date" id="av-h" min="${hoy()}" value="${esc(c.avisoHasta || "")}"></label>
          <div class="adm-acts">
            <button type="submit" class="btn">Publicar aviso</button>
            ${c.aviso ? '<button type="button" class="btn danger" id="av-quitar">Quitar el aviso</button>' : ""}
          </div>
        </form>
        <section class="adm-card"><h2>Vista previa</h2><div id="av-prev"></div>
          <p class="muted">${c.aviso ? "Publicado " + (c.avisoHasta ? "hasta el " + esc(fechaLarga(c.avisoHasta)) : "sin fecha de fin") + "." : "Ahora mismo no hay ningún aviso publicado."}</p>
        </section>
      </div>`;
    const t = el.querySelector("#av-t"), l = el.querySelector("#av-l"), lt = el.querySelector("#av-lt"), h = el.querySelector("#av-h"), n = el.querySelector("#av-n");
    const tipo = () => (el.querySelector('input[name="av-tipo"]:checked') || {}).value || "info";
    const prev = () => {
      n.textContent = t.value.length + " / 500";
      const imp = tipo() === "importante";
      el.querySelector("#av-prev").innerHTML = t.value.trim() ? `<div class="site-aviso${imp ? " is-importante" : ""}"><div class="site-aviso__in">${icon(imp ? "alert" : "megaphone")}<p>${esc(t.value.trim())}${l.value.trim() ? ` <a href="#" onclick="return false">${esc(lt.value.trim() || "Más información")}</a>` : ""}</p><span class="site-aviso__x" aria-hidden="true">×</span></div></div>` : `<p class="muted">Escribe el texto para verlo aquí.</p>`;
    };
    el.querySelectorAll("textarea, input").forEach((x) => x.addEventListener("input", prev));
    prev();
    const form = el.querySelector("#av-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const texto = t.value.trim();
      if (!texto) { aviso("Escribe el texto del aviso.", "error"); t.focus(); return; }
      if (l.value.trim() && /^(javascript|data|vbscript):/i.test(l.value.trim())) { aviso("Ese enlace no está permitido.", "error"); l.focus(); return; }
      await guardarConfig(form, { aviso: texto, avisoTipo: tipo(), avisoEnlace: l.value.trim(), avisoTextoEnlace: lt.value.trim(), avisoHasta: h.value, avisoId: Date.now().toString(36) }, "Aviso publicado: ya sale en toda la web.");
    });
    const quitar = el.querySelector("#av-quitar");
    if (quitar) confirmar(quitar, () => guardarConfig(form, { aviso: "", avisoTipo: "info", avisoEnlace: "", avisoTextoEnlace: "", avisoHasta: "", avisoId: "" }, "Aviso quitado."));
  }

  /** Escribe config/web entera (las reglas piden todos los campos) con los cambios indicados. */
  async function guardarConfig(form, cambios, ok) {
    const c = Object.assign({ aviso: "", avisoTipo: "info", avisoEnlace: "", avisoTextoEnlace: "", avisoHasta: "", avisoId: "", examenes: "" }, st.cfg, cambios);
    const fields = {};
    ["aviso", "avisoTipo", "avisoEnlace", "avisoTextoEnlace", "avisoHasta", "avisoId", "examenes"].forEach((k) => { fields[k] = v(String(c[k] || "")); });
    fields.avisoTipo = v(c.avisoTipo === "importante" ? "importante" : "info");
    fields.por = v(String((C.actual() || {}).nombre || "").slice(0, 40));
    ocupado(form, true);
    try {
      await D.escribir([{ update: { name: D.ruta("config/web"), fields }, updateTransforms: [{ fieldPath: "actualizado", setToServerValue: "REQUEST_TIME" }] }]);
      st.cfg = C.limpiarConfig(c);
      config.actualizar(st.cfg);                     // se ve ya en esta pestaña
      pintar();
      aviso(ok);
    } catch (e) { ocupado(form, false); aviso(msgError(e), "error"); }
  }

  /* ---------------- Exámenes ---------------- */
  const CODIGO = config.examenesCodigo();
  /** Fila editable a partir de un examen { date, label, name }: el detalle es lo que va tras la fecha. */
  function fila(e) {
    const base = fechaLarga(e.date), resto = String(e.label || "").startsWith(base) ? String(e.label).slice(base.length) : "";
    return { date: e.date, name: e.name || "", detalle: resto.split(" · ")[0].replace(/^,\s*/, "") };
  }
  const etiqueta = (r) => fechaLarga(r.date) + (r.detalle ? ", " + r.detalle : "") + (r.name ? " · " + r.name : "");
  function examenes(el) {
    let propios = {};
    try { propios = st.cfg.examenes ? JSON.parse(st.cfg.examenes) : {}; } catch (e) { propios = {}; }
    const ed = {};
    SUBJECTS.forEach((s) => {
      const suyos = Array.isArray(propios[s.id]);
      ed[s.id] = { propio: suyos, filas: (suyos ? propios[s.id] : CODIGO[s.id]).map(fila) };
    });
    el.innerHTML = `<form class="adm-form" id="ex-form" novalidate>
      <p class="muted">Son las fechas de la cuenta atrás de la portada y de cada asignatura. Si una asignatura tiene parciales, añade una fila por examen: siempre se muestra el próximo que queda.</p>
      <div class="adm-exams" id="ex-list"></div>
      <div class="adm-acts"><button type="submit" class="btn">Guardar fechas</button></div>
    </form>`;
    const list = el.querySelector("#ex-list");
    function pintarEx() {
      list.innerHTML = SUBJECTS.map((s) => {
        const e = ed[s.id];
        return `<section class="adm-card adm-exam" data-s="${s.id}">
          <header><h2>${esc(s.short)} <small>${esc(s.name)}</small></h2><span class="adm-tag${e.propio ? " on" : ""}">${e.propio ? "cambiadas en el panel" : "fechas del código"}</span></header>
          ${e.filas.length ? `<div class="adm-ex-rows">${e.filas.map((r, i) => `<div class="adm-ex-row" data-i="${i}">
            <label>Fecha<input type="date" data-k="date" value="${esc(r.date)}" required></label>
            <label>Nombre (opcional)<input type="text" data-k="name" maxlength="40" placeholder="2.º parcial" value="${esc(r.name)}"></label>
            <label>Detalle (opcional)<input type="text" data-k="detalle" maxlength="60" placeholder="por la tarde" value="${esc(r.detalle)}"></label>
            <button type="button" class="adm-x" data-del="${i}" aria-label="Quitar este examen" title="Quitar este examen">×</button>
            <p class="adm-ex-lbl">${r.date ? "Se verá: " + esc(etiqueta(r)) : ""}</p></div>`).join("")}</div>` : `<p class="muted">Sin fecha: la portada dirá «fecha del examen por confirmar».</p>`}
          <div class="adm-acts"><button type="button" class="btn ghost adm-sm" data-add>Añadir examen</button>${e.propio ? '<button type="button" class="btn ghost adm-sm" data-reset>Volver a las fechas del código</button>' : ""}</div>
        </section>`;
      }).join("");
      list.querySelectorAll(".adm-exam").forEach((sec) => {
        const e = ed[sec.dataset.s];
        sec.querySelectorAll("input[data-k]").forEach((inp) => inp.addEventListener("input", () => {
          const r = e.filas[Number(inp.closest(".adm-ex-row").dataset.i)];
          r[inp.dataset.k] = inp.value.trim(); e.propio = true;
          sec.querySelector(".adm-tag").textContent = "cambiadas en el panel"; sec.querySelector(".adm-tag").classList.add("on");
          inp.closest(".adm-ex-row").querySelector(".adm-ex-lbl").textContent = r.date ? "Se verá: " + etiqueta(r) : "";
        }));
        sec.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { e.filas.splice(Number(b.dataset.del), 1); e.propio = true; pintarEx(); }));
        sec.querySelector("[data-add]").addEventListener("click", () => { e.filas.push({ date: "", name: "", detalle: "" }); e.propio = true; pintarEx(); });
        const reset = sec.querySelector("[data-reset]");
        if (reset) reset.addEventListener("click", () => { e.propio = false; e.filas = CODIGO[sec.dataset.s].map(fila); pintarEx(); });
      });
    }
    pintarEx();
    const form = el.querySelector("#ex-form");
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const out = {};
      for (const s of SUBJECTS) {
        const e = ed[s.id];
        if (!e.propio) continue;
        if (e.filas.some((r) => !/^\d{4}-\d{2}-\d{2}$/.test(r.date))) { aviso(`Falta la fecha de algún examen de ${s.short}.`, "error"); return; }
        out[s.id] = e.filas.map((r) => Object.assign({ date: r.date, label: etiqueta(r) }, r.name ? { name: r.name } : {}));
      }
      await guardarConfig(form, { examenes: Object.keys(out).length ? JSON.stringify(out) : "" }, "Fechas guardadas: la cuenta atrás ya está al día.");
    });
  }

  /* ---------------- Reportes ---------------- */
  function reportes(el) {
    const F = [{ id: "abierto", label: "Sin revisar" }, { id: "resuelto", label: "Resueltos" }, { id: "todos", label: "Todos" }];
    const lista = st.reportes.filter((r) => st.filtroRep === "todos" || (st.filtroRep === "resuelto" ? r.estado === "resuelto" : r.estado !== "resuelto"));
    el.innerHTML = `<div class="adm-bar">
        <div class="tabs" role="group" aria-label="Filtrar reportes">${F.map((f) => `<button type="button" class="tab${f.id === st.filtroRep ? " on" : ""}" data-f="${f.id}" aria-pressed="${f.id === st.filtroRep}">${esc(f.label)} <span class="adm-n">${st.reportes.filter((r) => f.id === "todos" || (f.id === "resuelto" ? r.estado === "resuelto" : r.estado !== "resuelto")).length}</span></button>`).join("")}</div>
        <button type="button" class="btn ghost" id="r-rec">Recargar</button>
      </div>
      ${lista.length ? `<ul class="adm-reps">${lista.map((r) => `<li class="adm-rep${r.estado === "resuelto" ? " is-done" : ""}" data-r="${esc(r._id)}">
        <header><b>${esc(r.titulo || r.pagina)}</b><span class="muted">${esc(r.nombre)} · ${fecha(r.creado)}</span></header>
        ${r.contexto ? `<p class="adm-rep__ctx">${esc(r.contexto)}</p>` : ""}
        <p class="adm-rep__txt">${esc(r.texto)}</p>
        <div class="adm-acts">
          <a class="btn ghost adm-sm" href="${esc(ROOT + r.pagina)}" target="_blank" rel="noopener">Abrir la página</a>
          <button type="button" class="btn adm-sm${r.estado === "resuelto" ? " ghost" : ""}" data-estado>${r.estado === "resuelto" ? "Reabrir" : "Marcar como resuelto"}</button>
          <button type="button" class="btn danger adm-sm" data-borrar>Borrar</button>
        </div></li>`).join("")}</ul>`
      : `<p class="muted adm-empty">${st.filtroRep === "abierto" ? "No hay reportes sin revisar. ¡Todo al día!" : "No hay reportes aquí."}</p>`}`;
    el.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => { st.filtroRep = b.dataset.f; reportes(el); }));
    el.querySelector("#r-rec").addEventListener("click", async (e) => {
      e.currentTarget.disabled = true;
      try { await cargarReportes(); pintar(); aviso("Reportes actualizados."); } catch (ex) { aviso(msgError(ex), "error"); e.currentTarget.disabled = false; }
    });
    el.querySelectorAll(".adm-rep").forEach((li) => {
      const r = st.reportes.find((x) => x._id === li.dataset.r);
      li.querySelector("[data-estado]").addEventListener("click", async () => {
        const nuevo = r.estado === "resuelto" ? "abierto" : "resuelto";
        ocupado(li, true);
        try {
          await D.escribir([{ update: { name: D.ruta("reportes/" + r._id), fields: { estado: v(nuevo) } }, updateMask: { fieldPaths: ["estado"] }, currentDocument: { exists: true } }]);
          r.estado = nuevo; pintarTabs(); reportes(el);
        } catch (e) { ocupado(li, false); aviso(msgError(e), "error"); }
      });
      confirmar(li.querySelector("[data-borrar]"), async () => {
        ocupado(li, true);
        try {
          await D.escribir([{ delete: D.ruta("reportes/" + r._id) }]);
          st.reportes = st.reportes.filter((x) => x !== r); pintarTabs(); reportes(el); aviso("Reporte borrado.");
        } catch (e) { ocupado(li, false); aviso(msgError(e), "error"); }
      });
    });
  }

  /* ---------------- Insignias ---------------- */
  const catPorId = () => { const m = {}; st.cat.forEach((d) => { m[d.id] = d; }); return m; };
  const titulares = (id) => st.usuarios.filter((u) => u.insignias && u.insignias[id]);
  /** Mapa de insignias listo para escribir: las fechas, como fecha (al leerlas llegan como texto). */
  function limpiarMapa(ins) {
    const o = {};
    Object.keys(ins || {}).forEach((k) => { const e = ins[k] || {}; o[k] = Object.assign({ n: e.n || 1 }, e.f ? { f: new Date(e.f) } : {}, e.m ? { m: String(e.m).slice(0, 120) } : {}); });
    return o;
  }
  /** Da (o vuelve a dar: suma una vez más) una insignia a una cuenta. */
  function dar(uid, id, motivo) {
    return cambiarUsuario(uid, (x) => {
      const ins = limpiarMapa(x.insignias), prev = ins[id];
      ins[id] = Object.assign({ f: new Date(), n: ((prev && prev.n) || 0) + 1 }, motivo ? { m: motivo.slice(0, 120) } : prev && prev.m ? { m: prev.m } : {});
      return { insignias: ins };
    });
  }
  function quitar(uid, id) {
    return cambiarUsuario(uid, (x) => {
      const ins = limpiarMapa(x.insignias); delete ins[id];
      return { insignias: ins, vitrina: (Array.isArray(x.vitrina) ? x.vitrina : []).filter((v2) => v2 !== id) };
    });
  }
  function editarEntrada(uid, id, cambios) {
    return cambiarUsuario(uid, (x) => {
      const ins = limpiarMapa(x.insignias); if (!ins[id]) throw new Error("Ya no tiene esa insignia.");
      if (cambios.n != null) ins[id].n = Math.max(1, Math.min(999, Math.trunc(cambios.n) || 1));
      if (cambios.m != null) { if (cambios.m.trim()) ins[id].m = cambios.m.trim().slice(0, 120); else delete ins[id].m; }
      return { insignias: ins };
    });
  }

  /** Sección «Insignias» del diálogo de un usuario: las suyas (cambiar motivo y veces, quitar) y dar otra. */
  function insigniasDeUsuario(el, u, fallo) {
    const m = catPorId();
    const pintarIns = () => {
      const suyas = Object.keys(u.insignias || {}).filter((id) => m[id]);
      el.innerHTML = `${suyas.length ? `<ul class="adm-ins-list">${suyas.map((id) => { const e = u.insignias[id] || {}; return `<li data-id="${esc(id)}">
          ${I ? I.html(m[id], { tam: "sm" }) : ""}<span class="adm-ins-txt"><b>${esc(m[id].nombre)}</b><small class="muted">${e.f ? esc(I.fechaCorta(e.f)) : ""}${m[id].tipo === "auto" ? " · automática" : ""}</small></span>
          <label class="adm-ins-m"><span class="visually-hidden">Motivo</span><input type="text" maxlength="120" placeholder="Motivo (opcional)" value="${esc(e.m || "")}"></label>
          <label class="adm-ins-x"><span class="visually-hidden">Veces</span><input type="number" min="1" max="999" value="${e.n || 1}" title="Veces que la ha ganado"></label>
          <button type="button" class="btn ghost adm-sm" data-save>Guardar</button><button type="button" class="btn danger adm-sm" data-del>Quitar</button></li>`; }).join("")}</ul>`
        : `<p class="muted">No tiene ninguna insignia.</p>`}
        ${st.cat.length ? `<div class="adm-row">
          <label>Dar una insignia<select id="gi-sel">${st.cat.map((d) => `<option value="${esc(d.id)}">${esc(d.nombre)}${u.insignias && u.insignias[d.id] ? " (ya la tiene: suma una vez más)" : ""}</option>`).join("")}</select></label>
          <label>Motivo (opcional)<input type="text" id="gi-m" maxlength="120" placeholder="Por ejemplo: reportó 5 erratas"></label>
        </div><button type="button" class="btn" id="gi-ok">Dar la insignia</button>` : `<p class="muted">Aún no hay insignias: créalas en la pestaña <a href="#insignias">Insignias</a>.</p>`}`;
      el.querySelectorAll("li[data-id]").forEach((li) => {
        const id = li.dataset.id;
        li.querySelector("[data-save]").onclick = async () => {
          ocupado(el, true);
          try { Object.assign(u, await editarEntrada(u._id, id, { m: li.querySelector(".adm-ins-m input").value, n: Number(li.querySelector(".adm-ins-x input").value) })); ocupado(el, false); pintarIns(); aviso("Insignia actualizada."); }
          catch (e) { fallo(e); }
        };
        confirmar(li.querySelector("[data-del]"), async () => {
          ocupado(el, true);
          try { Object.assign(u, await quitar(u._id, id)); ocupado(el, false); pintarIns(); aviso(`Insignia quitada a ${u.nombre}.`); }
          catch (e) { fallo(e); }
        });
      });
      const ok = el.querySelector("#gi-ok");
      if (ok) ok.onclick = async () => {
        const id = el.querySelector("#gi-sel").value;
        ocupado(el, true);
        try { Object.assign(u, await dar(u._id, id, el.querySelector("#gi-m").value.trim())); ocupado(el, false); pintarIns(); aviso(`${u.nombre} tiene ya «${m[id].nombre}».`); }
        catch (e) { fallo(e); }
      };
    };
    pintarIns();
  }

  /* Pack inicial: automáticas por tests y puntos, una por asignatura y las especiales (retos y colaboración). */
  const PACK = [
    ["primer_test", "Primer paso", "Terminar tu primer test.", "🚀", "circulo", "bronce", "comun", "auto", "tests", 1],
    ["tests_10", "Constante", "Terminar 10 tests.", "📚", "escudo", "plata", "comun", "auto", "tests", 10],
    ["tests_50", "Incansable", "Terminar 50 tests.", "🔥", "hexagono", "oro", "rara", "auto", "tests", 50],
    ["tests_100", "Centurión", "Terminar 100 tests.", "🛡️", "escudo", "zafiro", "epica", "auto", "tests", 100],
    ["tests_250", "Máquina de tests", "Terminar 250 tests.", "⚙️", "estrella", "noche", "legendaria", "auto", "tests", 250],
    ["puntos_1000", "Mil puntos", "Llegar a 1000 puntos.", "💯", "circulo", "plata", "comun", "auto", "puntos", 1000],
    ["puntos_5000", "Cinco mil", "Llegar a 5000 puntos.", "💎", "rombo", "zafiro", "rara", "auto", "puntos", 5000],
    ["puntos_10000", "Diez mil", "Llegar a 10 000 puntos.", "👑", "estrella", "oro", "epica", "auto", "puntos", 10000],
    ["puntos_25000", "Leyenda", "Llegar a 25 000 puntos.", "🌌", "estrella", "arcoiris", "legendaria", "auto", "puntos", 25000],
    ["fli_2000", "Lógico de verdad", "2000 puntos en FLI.", "🧠", "hexagono", "amatista", "rara", "auto", "fli", 2000],
    ["fc_2000", "Hacker del bit", "2000 puntos en FC.", "💾", "hexagono", "esmeralda", "rara", "auto", "fc", 2000],
    ["ip_2000", "Programador", "2000 puntos en IP.", "💻", "hexagono", "zafiro", "rara", "auto", "ip", 2000],
    ["gohp_2000", "Empresario", "2000 puntos en GOHP.", "💼", "hexagono", "rubi", "rara", "auto", "gohp", 2000],
    ["amd_2000", "Matemático", "2000 puntos en AMD.", "🧮", "hexagono", "oro", "rara", "auto", "amd", 2000],
    ["aed_2000", "Arquitecto de datos", "2000 puntos en AED I.", "🌳", "hexagono", "esmeralda", "rara", "auto", "aed", 2000],
    ["semana_oro", "Campeón de la semana", "Primero del ranking semanal.", "🥇", "medalla", "oro", "epica", "manual", "", 0],
    ["semana_plata", "Subcampeón de la semana", "Segundo del ranking semanal.", "🥈", "medalla", "plata", "rara", "manual", "", 0],
    ["semana_bronce", "Podio de la semana", "Tercero del ranking semanal.", "🥉", "medalla", "bronce", "rara", "manual", "", 0],
    ["cazaerratas", "Cazaerratas", "Reportar errores que se han corregido.", "🐞", "escudo", "esmeralda", "rara", "manual", "", 0],
    ["colaborador", "Colaborador", "Aportar material o ideas a la web.", "🤝", "circulo", "amatista", "epica", "manual", "", 0],
    ["fundador", "Fundador", "Estar en la web desde el principio.", "🏛️", "estrella", "noche", "legendaria", "manual", "", 0]
  ].map(([id, nombre, desc, icono, forma, color, rareza, tipo, campo, umbral], i) => ({ id, nombre, desc, icono, forma, color, rareza, tipo, campo, umbral, orden: (i + 1) * 10, activa: true }));

  async function guardarInsignia(d, nueva) {
    const fields = {
      nombre: v(d.nombre), desc: v(d.desc || ""), icono: v(d.icono), forma: v(d.forma), color: v(d.color), rareza: v(d.rareza),
      tipo: v(d.tipo), campo: v(d.tipo === "auto" ? d.campo : ""), umbral: v(d.tipo === "auto" ? Math.max(1, Math.trunc(d.umbral) || 1) : 0),
      orden: v(Math.max(0, Math.trunc(d.orden) || 0)), activa: v(d.activa !== false), por: v(String((C.actual() || {}).nombre || "").slice(0, 40))
    };
    await D.escribir([Object.assign({ update: { name: D.ruta("insignias/" + d.id), fields }, updateTransforms: [{ fieldPath: "actualizado", setToServerValue: "REQUEST_TIME" }] },
      nueva ? { currentDocument: { exists: false } } : {})]);
  }

  /* Semanas: el mismo número que cuentas.js (lunes a domingo, hora de Madrid en invierno). */
  const SEM_MS = 604800000, SEM_OFF = 262800000;
  const numSemana = (w) => Number(String(w).slice(1));
  const inicioSemana = (w) => new Date(numSemana(w) * SEM_MS - SEM_OFF);
  function etiquetaSemana(w) {
    const a = inicioSemana(w), b = new Date(a.getTime() + 6 * 86400000);
    const f = (d, mes) => d.toLocaleDateString("es-ES", mes ? { day: "numeric", month: "long" } : { day: "numeric" });
    return "semana del " + (a.getMonth() === b.getMonth() ? f(a) : f(a, true)) + " al " + f(b, true);
  }
  /** Podio de una semana: los que más puntos sacaron (con empates, el mismo puesto). */
  function podio(w) {
    let pos = 0, prev = null;
    return st.usuarios.filter((u) => !u.bloqueado && (u[w] || 0) > 0).sort((a, b) => (b[w] || 0) - (a[w] || 0))
      .map((u, i) => { if (u[w] !== prev) { pos = i + 1; prev = u[w]; } return { uid: u._id, nombre: u.nombre, puntos: u[w], pos }; })
      .filter((x) => x.pos <= 3);
  }

  function insignias(el) {
    if (!I) { el.innerHTML = `<p class="callout warn">No se ha cargado assets/js/insignias.js.</p>`; return; }
    const m = catPorId(), faltanPack = PACK.filter((d) => !m[d.id]);
    const actual = semana, n = numSemana(actual);
    const cerradas = new Set(st.retos.map((r) => r.id));
    const pendientes = [1, 2, 3].map((k) => "w" + (n - k)).filter((w) => !cerradas.has(w) && podio(w).length);
    const premios = ["semana_oro", "semana_plata", "semana_bronce"];
    const listo = premios.every((id) => m[id]);
    el.innerHTML = `
      <section class="adm-card adm-reto"><h2>${icon("trophy")} Reto semanal</h2>
        <p class="muted">Cada semana, los 3 primeros de «Esta semana» se llevan su insignia (${premios.map((id) => m[id] ? esc(m[id].nombre) : id).join(", ")}). El lunes, entra aquí y entrégalas: se suman a su vitrina (si repiten, «×2», «×3»…) y salen como ganadores en el ranking.</p>
        ${!listo ? `<p class="callout warn">Faltan las insignias del reto (${premios.filter((id) => !m[id]).join(", ")}). Créalas con el pack inicial de abajo.</p>` : ""}
        ${pendientes.length ? pendientes.map((w) => `<div class="adm-reto__sem" data-w="${w}"><h3>${esc(etiquetaSemana(w))}</h3>
            <ol class="adm-top">${podio(w).map((x) => `<li><span>${["🥇", "🥈", "🥉"][x.pos - 1]} ${esc(x.nombre)}</span><b>${fmt(x.puntos)}</b></li>`).join("")}</ol>
            <button type="button" class="btn" data-cerrar="${w}"${listo ? "" : " disabled"}>Entregar las insignias de esta semana</button></div>`).join("")
          : `<p class="muted">No hay semanas pendientes de entregar. La semana actual (${esc(etiquetaSemana(actual))}) se entrega a partir del lunes.</p>`}
        ${st.retos.length ? `<details class="adm-reto__hist"><summary>Semanas ya entregadas (${st.retos.length})</summary><ul>${st.retos.map((r) => { let g = []; try { g = JSON.parse(r.ganadores || "[]"); } catch (e) { g = []; } return `<li><b>${esc(etiquetaSemana(r.id))}</b>: ${g.map((x) => `${["🥇", "🥈", "🥉"][Math.min(2, x.pos - 1)]} ${esc(x.nombre)}`).join(" · ") || "sin ganadores"}</li>`; }).join("")}</ul></details>` : ""}
      </section>

      <section class="adm-card"><div class="adm-ins-head"><h2>${icon("medal")} Catálogo <small class="muted">${st.cat.length} insignias</small></h2>
        <span class="adm-acts"><button type="button" class="btn" id="in-nueva">Crear una insignia</button>${faltanPack.length ? `<button type="button" class="btn ghost" id="in-pack">${st.cat.length ? `Añadir las ${faltanPack.length} que faltan del pack inicial` : "Crear el pack inicial (" + PACK.length + " insignias)"}</button>` : ""}</span></div>
        ${st.cat.length ? `<div class="adm-ins-grid">${st.cat.map((d) => `<div class="adm-ins-card${d.activa === false ? " is-off" : ""}">
            ${I.html(d, { tam: "md", pie: `<small>${d.tipo === "auto" ? "Automática: " + fmt(d.umbral) + " " + esc(I.CAMPOS[d.campo] || d.campo) : "Manual"}${d.activa === false ? " · desactivada" : ""}</small><small>${titulares(d.id).length === 1 ? "1 la tiene" : titulares(d.id).length + " la tienen"}</small>` })}
            <span class="adm-acts"><button type="button" class="btn ghost adm-sm" data-edit="${esc(d.id)}">Editar</button><button type="button" class="btn ghost adm-sm" data-dar="${esc(d.id)}">Dar / quitar</button></span></div>`).join("")}</div>`
          : `<p class="muted">Todavía no hay insignias. Empieza con el pack inicial: insignias automáticas por tests y puntos, una por asignatura, las tres del reto semanal y algunas especiales para dar a mano.</p>`}
      </section>
      <div id="in-editor"></div>`;
    el.querySelectorAll("[data-cerrar]").forEach((b) => confirmar(b, () => cerrarSemana(b.dataset.cerrar, b.closest(".adm-reto__sem"))));
    el.querySelector("#in-nueva").onclick = () => editor(null);
    const pack = el.querySelector("#in-pack");
    if (pack) pack.onclick = async () => {
      ocupado(el, true);
      try {
        for (const d of faltanPack) await guardarInsignia(d, true);
        await cargarInsignias(); pintar(); aviso(`Creadas ${faltanPack.length} insignias. Las automáticas se reparten solas en cuanto cada uno abre la web.`);
      } catch (e) { ocupado(el, false); aviso(msgError(e), "error"); }
    };
    el.querySelectorAll("[data-edit]").forEach((b) => { b.onclick = () => editor(m[b.dataset.edit]); });
    el.querySelectorAll("[data-dar]").forEach((b) => { b.onclick = () => repartir(m[b.dataset.dar]); });
  }

  async function cerrarSemana(w, caja) {
    const g = podio(w), premio = ["semana_oro", "semana_plata", "semana_bronce"];
    ocupado(caja, true);
    try {
      for (const x of g) {
        const u = st.usuarios.find((y) => y._id === x.uid);
        const nuevo = await dar(x.uid, premio[x.pos - 1], etiquetaSemana(w).replace(/^semana/, "Semana") + ": " + fmt(x.puntos) + " puntos");
        if (u) Object.assign(u, nuevo);
      }
      await D.escribir([{ update: { name: D.ruta("retos/" + w), fields: { ganadores: v(JSON.stringify(g).slice(0, 2000)), por: v(String((C.actual() || {}).nombre || "").slice(0, 40)) } },
        currentDocument: { exists: false }, updateTransforms: [{ fieldPath: "cerrado", setToServerValue: "REQUEST_TIME" }] }]);
      await cargarInsignias(); pintar(); aviso(`Insignias de la ${etiquetaSemana(w)} entregadas a ${g.map((x) => x.nombre).join(", ")}.`);
    } catch (e) { ocupado(caja, false); aviso(msgError(e), "error"); }
  }

  const slug = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^([0-9])/, "i$1").slice(0, 36) || "insignia";
  const EMOJIS = ["🏅", "🥇", "🏆", "⭐", "🔥", "🚀", "💎", "👑", "🧠", "💡", "📚", "✍️", "🎯", "⚡", "🛡️", "⚙️", "💾", "💻", "🧮", "📈", "💼", "🤝", "🐞", "🌙", "☕", "🎓", "🧩", "🦉", "🌌", "🍀", "🎉", "∀", "Σ", "λ", "€", "</>"];

  /** Creador y editor de insignias, con vista previa en directo. */
  function editor(def) {
    const nueva = !def;
    const d = Object.assign({ id: "", nombre: "", desc: "", icono: "🏅", forma: "escudo", color: "oro", rareza: "rara", tipo: "manual", campo: "puntos", umbral: 1000, orden: (st.cat.length + 1) * 10, activa: true }, def || {});
    const box2 = document.getElementById("in-editor");
    box2.innerHTML = `<form class="adm-card adm-form adm-ins-ed" id="ie-form" novalidate>
      <div class="adm-ins-head"><h2>${nueva ? "Nueva insignia" : "Editar «" + esc(d.nombre) + "»"}</h2><button type="button" class="adm-x" id="ie-x" aria-label="Cerrar el editor">×</button></div>
      <div class="adm-ins-ed__cols">
        <div class="adm-ins-ed__campos">
          <div class="adm-row">
            <label>Nombre<input type="text" id="ie-nombre" maxlength="40" required value="${esc(d.nombre)}" placeholder="Rey del VAN"></label>
            <label>Identificador${nueva ? "" : " (no se puede cambiar)"}<input type="text" id="ie-id" maxlength="40" pattern="[a-z][a-z0-9_]{1,39}" value="${esc(d.id)}" ${nueva ? "" : "disabled"} placeholder="se rellena solo"></label>
          </div>
          <label>Descripción (cómo se consigue)<input type="text" id="ie-desc" maxlength="200" value="${esc(d.desc || "")}" placeholder="Sacar un 10 en el simulacro de GOHP"></label>
          <label>Icono (emoji o hasta 3 caracteres)<input type="text" id="ie-icono" maxlength="16" required value="${esc(d.icono)}"></label>
          <div class="adm-emojis" role="group" aria-label="Iconos sugeridos">${EMOJIS.map((e) => `<button type="button" data-emoji="${esc(e)}">${esc(e)}</button>`).join("")}</div>
          <fieldset class="adm-radios adm-ins-opts"><legend>Forma</legend>${Object.keys(I.FORMAS).map((f) => `<label title="${esc(I.FORMAS[f])}"><input type="radio" name="ie-forma" value="${f}"${d.forma === f ? " checked" : ""}><span class="adm-ins-op">${I.svg({ icono: "", forma: f, color: "plata", rareza: "comun" }, { label: I.FORMAS[f] })}</span><small>${esc(I.FORMAS[f])}</small></label>`).join("")}</fieldset>
          <fieldset class="adm-radios adm-ins-opts"><legend>Color</legend>${Object.keys(I.COLORES).map((c) => `<label title="${esc(I.COLORES[c].n)}"><input type="radio" name="ie-color" value="${c}"${d.color === c ? " checked" : ""}><span class="adm-ins-sw" style="background:${c === "arcoiris" ? "linear-gradient(135deg,#FF5F6D,#FFC371,#47E891,#3FA9F5,#A66CF0)" : `linear-gradient(135deg,${I.COLORES[c].c[0]},${I.COLORES[c].c[1]} 55%,${I.COLORES[c].c[2]})`}"></span><small>${esc(I.COLORES[c].n)}</small></label>`).join("")}</fieldset>
          <div class="adm-row">
            <label>Rareza<select id="ie-rareza">${Object.keys(I.RAREZAS).map((r) => `<option value="${r}"${d.rareza === r ? " selected" : ""}>${esc(I.RAREZAS[r])}</option>`).join("")}</select></label>
            <label>Orden en el catálogo<input type="number" id="ie-orden" min="0" step="10" value="${d.orden || 0}"></label>
          </div>
          <fieldset class="adm-radios"><legend>Cómo se consigue</legend>
            <label><input type="radio" name="ie-tipo" value="manual"${d.tipo !== "auto" ? " checked" : ""}> La doy yo (manual)</label>
            <label><input type="radio" name="ie-tipo" value="auto"${d.tipo === "auto" ? " checked" : ""}> Se gana sola al llegar a…</label>
          </fieldset>
          <div class="adm-row" id="ie-auto">
            <label>Campo<select id="ie-campo">${Object.keys(I.CAMPOS).map((c) => `<option value="${c}"${d.campo === c ? " selected" : ""}>${esc(I.CAMPOS[c])}</option>`).join("")}</select></label>
            <label>Umbral<input type="number" id="ie-umbral" min="1" step="1" value="${d.umbral || 1}"></label>
          </div>
          <label class="adm-chk"><input type="checkbox" id="ie-activa"${d.activa !== false ? " checked" : ""}> Activa (desactivada: no se puede ganar sola, pero quien la tenga la conserva)</label>
        </div>
        <div class="adm-ins-ed__prev" aria-live="polite"><p class="muted">Vista previa</p><div id="ie-prev"></div></div>
      </div>
      <p class="callout warn" id="ie-err" hidden></p>
      <div class="adm-acts"><button type="submit" class="btn">${nueva ? "Crear la insignia" : "Guardar los cambios"}</button>${nueva ? "" : `<button type="button" class="btn danger" id="ie-del">Borrar la insignia</button>`}</div>
    </form>`;
    const f = box2.querySelector("#ie-form"), $ = (id) => f.querySelector("#" + id);
    let idTocado = !nueva;
    const leerForm = () => ({
      id: nueva ? $("ie-id").value.trim() : d.id, nombre: $("ie-nombre").value.trim(), desc: $("ie-desc").value.trim(), icono: $("ie-icono").value.trim() || "★",
      forma: (f.querySelector('input[name="ie-forma"]:checked') || {}).value || "escudo", color: (f.querySelector('input[name="ie-color"]:checked') || {}).value || "oro",
      rareza: $("ie-rareza").value, tipo: (f.querySelector('input[name="ie-tipo"]:checked') || {}).value || "manual", campo: $("ie-campo").value,
      umbral: Number($("ie-umbral").value), orden: Number($("ie-orden").value), activa: $("ie-activa").checked
    });
    const prev = () => {
      const x = leerForm();
      $("ie-auto").hidden = x.tipo !== "auto";
      $("ie-prev").innerHTML = I.html(Object.assign({}, x, { nombre: x.nombre || "Nombre" }), { tam: "lg", pie: `<small>${esc(x.desc || "")}</small>` }) +
        `<div class="adm-ins-ed__mini">${I.html(x, { tam: "sm" })}${I.mini(x)}<span class="muted">así sale en el ranking</span></div>`;
    };
    f.addEventListener("input", (e) => {
      if (nueva && e.target.id === "ie-nombre" && !idTocado) $("ie-id").value = slug(e.target.value);
      if (e.target.id === "ie-id") idTocado = true;
      prev();
    });
    f.addEventListener("change", prev);
    f.querySelectorAll("[data-emoji]").forEach((b) => { b.onclick = () => { $("ie-icono").value = b.dataset.emoji; prev(); }; });
    $("ie-x").onclick = () => { box2.innerHTML = ""; };
    prev();
    box2.scrollIntoView({ behavior: "smooth", block: "start" });
    const err = (t) => { $("ie-err").textContent = t; $("ie-err").hidden = !t; };
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const x = leerForm();
      if (x.nombre.length < 2) { err("Ponle un nombre (2 letras como mínimo)."); $("ie-nombre").focus(); return; }
      if (!/^[a-z][a-z0-9_]{1,39}$/.test(x.id)) { err("El identificador sólo puede tener minúsculas, números y «_», y empezar por una letra."); $("ie-id").focus(); return; }
      if (nueva && catPorId()[x.id]) { err("Ya hay una insignia con ese identificador."); $("ie-id").focus(); return; }
      if (x.tipo === "auto" && !(x.umbral >= 1)) { err("El umbral tiene que ser 1 o más."); $("ie-umbral").focus(); return; }
      err(""); ocupado(f, true);
      try { await guardarInsignia(x, nueva); await cargarInsignias(); pintar(); aviso(nueva ? `Insignia «${x.nombre}» creada.` : `Insignia «${x.nombre}» guardada.`); }
      catch (ex) { ocupado(f, false); err(msgError(ex)); }
    });
    const del = $("ie-del");
    if (del) confirmar(del, async () => {
      const t = titulares(d.id);
      ocupado(f, true);
      try {
        for (const u of t) Object.assign(u, await quitar(u._id, d.id));
        await D.escribir([{ delete: D.ruta("insignias/" + d.id) }]);
        await cargarInsignias(); pintar(); aviso(`Insignia «${d.nombre}» borrada${t.length ? " (y quitada a " + t.length + (t.length === 1 ? " persona" : " personas") + ")" : ""}.`);
      } catch (ex) { ocupado(f, false); err(msgError(ex)); }
    });
  }

  /** Dar o quitar una insignia a varias personas a la vez. */
  function repartir(def) {
    const box2 = document.getElementById("in-editor");
    let filtro = "";
    const marcados = new Set();
    box2.innerHTML = `<section class="adm-card adm-form" id="ir-box">
      <div class="adm-ins-head"><h2>${I.html(def, { tam: "sm" })} ${esc(def.nombre)}: dar o quitar</h2><button type="button" class="adm-x" id="ir-x" aria-label="Cerrar">×</button></div>
      <label class="adm-search"><span class="visually-hidden">Buscar usuario</span><input type="search" id="ir-q" placeholder="Buscar usuario…" autocomplete="off"></label>
      <div class="adm-ir-list" id="ir-list"></div>
      <label>Motivo (opcional, se ve en su vitrina)<input type="text" id="ir-m" maxlength="120"></label>
      <div class="adm-acts"><button type="button" class="btn" id="ir-dar">Dar a los marcados</button><button type="button" class="btn danger" id="ir-quitar">Quitar a los marcados</button><span class="muted" id="ir-n"></span></div>
    </section>`;
    const lista = box2.querySelector("#ir-list"), q2 = box2.querySelector("#ir-q");
    const pintarL = () => {
      const n = C.idDe(filtro);
      const us = st.usuarios.filter((u) => !n || C.idDe(u.nombre).includes(n)).slice(0, 200);
      lista.innerHTML = us.map((u) => { const e = u.insignias && u.insignias[def.id]; return `<label class="adm-chk"><input type="checkbox" value="${esc(u._id)}"${marcados.has(u._id) ? " checked" : ""}> <b>${esc(u.nombre)}</b> <span class="muted">${fmt(u.puntos)} pts${e ? ` · la tiene${e.n > 1 ? " ×" + e.n : ""}` : ""}</span></label>`; }).join("") || `<p class="muted">Nadie con ese nombre.</p>`;
      lista.querySelectorAll("input").forEach((c) => { c.onchange = () => { if (c.checked) marcados.add(c.value); else marcados.delete(c.value); box2.querySelector("#ir-n").textContent = marcados.size + " marcados"; }; });
    };
    q2.oninput = () => { filtro = q2.value; pintarL(); };
    box2.querySelector("#ir-x").onclick = () => { box2.innerHTML = ""; };
    const lote = async (fn, txt) => {
      if (!marcados.size) { aviso("Marca al menos a una persona.", "error"); return; }
      const sec = box2.querySelector("#ir-box"); ocupado(sec, true);
      try {
        for (const uid of marcados) { const u = st.usuarios.find((x) => x._id === uid); const r = await fn(uid); if (u) Object.assign(u, r); }
        pintar(); aviso(txt);
      } catch (e) { ocupado(sec, false); aviso(msgError(e), "error"); }
    };
    box2.querySelector("#ir-dar").onclick = () => lote((uid) => dar(uid, def.id, box2.querySelector("#ir-m").value.trim()), `«${def.nombre}» entregada a ${marcados.size} ${marcados.size === 1 ? "persona" : "personas"}.`);
    confirmar(box2.querySelector("#ir-quitar"), () => lote((uid) => quitar(uid, def.id), `«${def.nombre}» quitada a ${marcados.size} ${marcados.size === 1 ? "persona" : "personas"}.`));
    pintarL();
    box2.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------------- Arranque: sólo para administradores ---------------- */
  async function iniciar() {
    const ses = C.actual();
    if (!ses || ses.local) {
      box.innerHTML = `<p class="callout warn">El panel de administración necesita una cuenta (no un perfil local). <a href="${ROOT}cuenta.html?cambiar=1">Entra con tu cuenta</a>.</p>`;
      return;
    }
    let admin = false;
    try { admin = await C.esAdmin(true); } catch (e) { admin = false; }
    if (!admin) {
      box.innerHTML = `<section class="callout warn"><b>Esta cuenta no es administradora.</b>
        <p>Para darle acceso, en la carpeta <code>scripts/admin</code> del proyecto ejecuta <code>node admin.js admin ${esc(C.idDe(ses.nombre))}</code>. Si ya lo has hecho, recarga esta página en un minuto o cierra sesión y vuelve a entrar.</p></section>`;
      return;
    }
    box.innerHTML = `<p class="muted">Cargando datos…</p>`;
    let error = null;
    try { await cargarTodo(); } catch (e) { error = e; }
    if (error && !st.usuarios.length) { box.innerHTML = `<p class="callout warn">${esc(msgError(error))}</p>`; return; }
    pintar();
    if (error) aviso(msgError(error), "error");     // p. ej. los reportes, si las reglas aún no están publicadas
  }
  iniciar();
})();
