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
 *
 * Requiere: assets/js/core.js y assets/js/cuentas.js (Cuentas.datos: Firestore con la sesión activa).
 */
(function () {
  "use strict";
  const { esc, icon, ROOT, SUBJECTS, config, daysTo } = window.App;
  const C = window.Cuentas;
  const box = document.getElementById("adm"), nav = document.getElementById("adm-tabs");
  if (!box || !C) return;
  const D = C.datos, v = D.valor, fmt = C.fmt;
  const ASIG = SUBJECTS.map((s) => ({ id: s.id, short: s.short }));
  const TABS = [
    { id: "resumen", label: "Resumen" }, { id: "usuarios", label: "Usuarios" }, { id: "avisos", label: "Aviso" },
    { id: "examenes", label: "Exámenes" }, { id: "reportes", label: "Reportes" }
  ];
  const st = { usuarios: [], reportes: [], cfg: {}, cargado: false, filtroRep: "abierto", buscar: "", filtroUsu: "todas" };
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
  async function cargarTodo() {
    const r = await Promise.allSettled([cargarUsuarios(), cargarReportes(), cargarConfig()]);
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
  const VISTAS = { resumen, usuarios, avisos, examenes, reportes };
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
        Object.assign(u, await cambiarUsuario(uid, () => ({ puntos: 0, fli: 0, fc: 0, ip: 0, [semana]: 0 })));
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
