/*!
 * comunidad.js — comunidad de una asignatura: publicaciones (preguntas, materiales y debates), respuestas,
 * «me gusta» y el panel de entregas y fechas, con el botón del Aula Virtual.
 *
 *   · Los archivos NO se suben: se comparten ENLACES (Drive, Wuolah, el Aula Virtual…). Es ilimitado y gratis.
 *   · Todo se guarda en Firestore, anidado por asignatura para no necesitar índices (comunidad/<asig>/posts/…),
 *     con las reglas de firestore.rules. Hace falta una cuenta de verdad (los perfiles locales no escriben).
 *   · Las entregas salen de App.entregas (las del código) combinadas con la colección «entregas» (las del panel).
 *
 * Requiere: <body data-subject="…">, assets/js/core.js y assets/js/cuentas.js. Lo carga la página comunidad.html.
 */
(function () {
  "use strict";
  const App = window.App;
  if (!App) return;
  const { esc, icon, daysTo } = App;
  const body = document.body, root = body.dataset.root || "";
  const S = App.SUBJECTS.find((s) => s.id === body.dataset.subject);
  const app = document.getElementById("app");
  if (!S || !app) return;
  document.title = "Comunidad · " + S.short;

  const TIPOS = { pregunta: { label: "Pregunta", ico: "chat" }, material: { label: "Material", ico: "link" }, debate: { label: "Debate", ico: "megaphone" } };
  const MAX = { titulo: 140, texto: 4000, resp: 3000, enlaceTexto: 80 };
  const base = "comunidad/" + S.id;
  const D = () => window.Cuentas && window.Cuentas.datos;
  const toast = (t, m) => window.Cuentas && window.Cuentas.toast(t, m);

  const st = { uid: null, nombre: "", admin: false, posts: null, likes: {}, entregas: null, filtro: "todo", abierto: null, respuestas: {}, cargando: false };

  /* ---------------- Utilidades ---------------- */
  function hace(iso) {
    const t = iso ? new Date(iso).getTime() : 0;
    if (!t) return "";
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return "ahora";
    const m = s / 60; if (m < 60) return "hace " + Math.floor(m) + " min";
    const h = m / 60; if (h < 24) return "hace " + Math.floor(h) + " h";
    const d = h / 24; if (d < 7) return "hace " + Math.floor(d) + " d";
    return new Date(t).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }
  function conEnlaces(t) {
    return esc(String(t || "")).replace(/(https?:\/\/[^\s<]+[^\s<.,;:)])/g,
      (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer nofollow">${u}</a>`).replace(/\n/g, "<br>");
  }
  function botonEnlace(url, txt) {
    if (!url) return "";
    let host = ""; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
    return `<a class="cm-enlace" href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow">${icon("link")}<span>${esc(txt || host)}</span>${icon("external", "cm-ext")}</a>`;
  }
  function cuenta(limite) {
    const d = daysTo(limite);
    if (d < 0) return { txt: "cerrada", cls: "pasada" };
    if (d === 0) return { txt: "hoy", cls: "hoy" };
    if (d === 1) return { txt: "mañana", cls: "pronto" };
    return { txt: "en " + d + " días", cls: d <= 3 ? "pronto" : "" };
  }
  const fechaLarga = (limite) => { const [y, m, d] = limite.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }); };
  const perfilHref = (nombre) => root + "perfil.html?n=" + encodeURIComponent(String(nombre || "").toLowerCase());

  /* ---------------- Datos ---------------- */
  async function cargarPosts() {
    const d = D();
    const posts = await d.consultar({ from: [{ collectionId: "posts" }],
      orderBy: [{ field: { fieldPath: "creado" }, direction: "DESCENDING" }], limit: 40 }, base);
    // Fijadas primero, el resto por fecha (como vienen).
    posts.sort((a, b) => (b.fijado ? 1 : 0) - (a.fijado ? 1 : 0));
    st.posts = posts;
    // ¿Cuáles me gustan ya? (una lectura por publicación; sólo las que hay en pantalla).
    const mios = await Promise.all(posts.map((p) => d.leer(base + "/posts/" + p._id + "/megusta/" + st.uid).then((x) => !!x).catch(() => false)));
    st.likes = {}; posts.forEach((p, i) => { st.likes[p._id] = mios[i]; });
  }
  async function cargarEntregas() {
    const d = D();
    let propias = [];
    try {
      propias = await d.consultar({ from: [{ collectionId: "entregas" }],
        orderBy: [{ field: { fieldPath: "limite" }, direction: "ASCENDING" }], limit: 200 });
    } catch (e) { propias = []; }
    const delCodigo = App.entregas.codigo().filter((e) => e.asig === S.id).map((e) => Object.assign({ _code: true }, e));
    const todas = delCodigo.concat(propias.filter((e) => e.asig === S.id))
      .filter((e) => e.limite && daysTo(e.limite) >= 0)
      .sort((a, b) => (a.limite < b.limite ? -1 : a.limite > b.limite ? 1 : 0));
    st.entregas = todas;
  }
  async function cargarRespuestas(id) {
    const d = D();
    const r = await d.consultar({ from: [{ collectionId: "respuestas" }],
      orderBy: [{ field: { fieldPath: "creado" }, direction: "ASCENDING" }], limit: 200 }, base + "/posts/" + id);
    st.respuestas[id] = r;
  }

  /* ---------------- Render ---------------- */
  function entregasPanel() {
    const list = st.entregas;
    const cuerpo = list == null
      ? `<p class="cm-cargando">Cargando entregas…</p>`
      : list.length
        ? `<ul class="cm-entregas">${list.slice(0, 8).map((e) => {
            const c = cuenta(e.limite);
            return `<li class="cm-entrega"><span class="cm-ent-dia cm-${c.cls}">${c.txt}</span>
              <span class="cm-ent-cuerpo"><b>${esc(e.titulo)}</b>
                <small>${esc(fechaLarga(e.limite))}${e.hora ? " · " + esc(e.hora) : ""}${e._code ? "" : ' · <span class="cm-ent-por">añadida por ' + esc(e.por || "un admin") + "</span>"}</small>
                ${e.nota ? `<small class="cm-ent-nota">${esc(e.nota)}</small>` : ""}</span>
              ${e.enlace ? botonEnlace(e.enlace, "Abrir") : ""}</li>`;
          }).join("")}</ul>`
        : `<p class="cm-vacio">No hay entregas próximas apuntadas. Las añaden los administradores desde el panel.</p>`;
    return `<section class="cm-card cm-fechas" id="entregas" aria-labelledby="cm-fechas-t">
      <header class="cm-card-h"><span class="cm-card-ico">${icon("calendar")}</span>
        <div><span class="eyebrow">Entregas y fechas</span><h2 id="cm-fechas-t">¿Qué toca entregar?</h2></div>
        <a class="cm-aula" href="${App.AULA_VIRTUAL}" target="_blank" rel="noopener noreferrer">${icon("external")}<span>Aula Virtual</span></a>
      </header>${cuerpo}</section>`;
  }

  function composer() {
    return `<section class="cm-card cm-nuevo">
      <button type="button" class="cm-nuevo-abrir" id="cm-abrir">${icon("pencil")}<span>Escribir una publicación…</span></button>
      <form class="cm-form" id="cm-form" hidden>
        <div class="cm-tipos" role="group" aria-label="Tipo de publicación">
          ${Object.keys(TIPOS).map((k, i) => `<label class="cm-tipo"><input type="radio" name="cm-tipo" value="${k}"${i === 0 ? " checked" : ""}>${icon(TIPOS[k].ico)}<span>${TIPOS[k].label}</span></label>`).join("")}
        </div>
        <input class="cm-in" id="cm-titulo" type="text" maxlength="${MAX.titulo}" placeholder="Título (p. ej. «Duda del ejercicio 3 de la práctica 7»)" required>
        <textarea class="cm-in" id="cm-texto" rows="4" maxlength="${MAX.texto}" placeholder="Explica tu duda, o di qué material compartes. Pega el enlace aquí mismo si quieres."></textarea>
        <div class="cm-enlace-fila">
          <input class="cm-in" id="cm-enlace" type="url" maxlength="600" placeholder="Enlace (opcional): Drive, Wuolah, el Aula Virtual…">
          <input class="cm-in" id="cm-enlace-txt" type="text" maxlength="${MAX.enlaceTexto}" placeholder="Nombre del enlace (opcional)">
        </div>
        <p class="cm-err" role="alert" hidden></p>
        <div class="cm-form-acts">
          <button type="button" class="cm-btn ghost" id="cm-cancelar">Cancelar</button>
          <button type="submit" class="cm-btn">${icon("send")}<span>Publicar</span></button>
        </div>
      </form></section>`;
  }

  function postCard(p) {
    const tipo = TIPOS[p.tipo] || TIPOS.debate;
    const mio = p.uid === st.uid, liked = st.likes[p._id];
    const nResp = p.respuestas || 0;
    const resuelto = p.tipo === "pregunta" && p.resuelto;
    return `<article class="cm-post${p.fijado ? " cm-fijado" : ""}${resuelto ? " cm-resuelto" : ""}" data-id="${p._id}">
      <div class="cm-post-top">
        <span class="cm-tag cm-tag-${p.tipo}">${icon(tipo.ico)}${tipo.label}</span>
        ${p.fijado ? `<span class="cm-tag cm-tag-fijado">${icon("pin")}Fijada</span>` : ""}
        ${resuelto ? `<span class="cm-tag cm-tag-ok">${icon("check")}Resuelta</span>` : ""}
        <span class="cm-post-meta"><a href="${perfilHref(p.nombre)}">${esc(p.nombre)}</a> · ${esc(hace(p.creado))}</span>
      </div>
      <h3 class="cm-post-t">${esc(p.titulo)}</h3>
      ${p.texto ? `<div class="cm-post-txt">${conEnlaces(p.texto)}</div>` : ""}
      ${p.enlace ? botonEnlace(p.enlace, p.enlaceTexto) : ""}
      <div class="cm-post-acts">
        <button type="button" class="cm-act cm-like${liked ? " on" : ""}" data-act="like" aria-pressed="${liked ? "true" : "false"}">${icon("heart")}<span>${p.likes || 0}</span></button>
        <button type="button" class="cm-act cm-resp" data-act="ver">${icon("chat")}<span>${nResp}${nResp === 1 ? " respuesta" : " respuestas"}</span></button>
        ${mio && p.tipo === "pregunta" ? `<button type="button" class="cm-act" data-act="resuelto">${icon("check")}<span>${p.resuelto ? "Reabrir" : "Marcar resuelta"}</span></button>` : ""}
        <span class="cm-act-sep"></span>
        ${mio || st.admin ? `<button type="button" class="cm-act cm-del" data-act="borrar" title="Borrar">${icon("trash")}</button>` : `<button type="button" class="cm-act" data-act="reportar" title="Reportar">${icon("alert")}</button>`}
        ${st.admin ? `<button type="button" class="cm-act" data-act="fijar" title="${p.fijado ? "Dejar de fijar" : "Fijar arriba"}">${icon("pin")}</button>` : ""}
      </div>
      <div class="cm-respuestas" hidden></div>
    </article>`;
  }

  function respuestasHtml(id) {
    const list = st.respuestas[id];
    if (!list) return `<p class="cm-cargando">Cargando respuestas…</p>`;
    const items = list.map((r) => {
      const mio = r.uid === st.uid;
      return `<li class="cm-r" data-r="${r._id}">
        <div class="cm-r-top"><a href="${perfilHref(r.nombre)}">${esc(r.nombre)}</a> · ${esc(hace(r.creado))}
          ${mio || st.admin ? `<button type="button" class="cm-r-del" data-act="borrar-r" data-r="${r._id}" title="Borrar">${icon("trash")}</button>` : ""}</div>
        <div class="cm-r-txt">${conEnlaces(r.texto)}</div>${r.enlace ? botonEnlace(r.enlace, r.enlaceTexto) : ""}</li>`;
    }).join("");
    return `<ul class="cm-r-list">${items || '<li class="cm-vacio">Todavía no hay respuestas. ¡Sé el primero en ayudar!</li>'}</ul>
      <form class="cm-r-form" data-id="${id}">
        <textarea class="cm-in" rows="2" maxlength="${MAX.resp}" placeholder="Escribe una respuesta…" required></textarea>
        <input class="cm-in cm-r-enlace" type="url" maxlength="600" placeholder="Enlace (opcional)">
        <button type="submit" class="cm-btn cm-btn-sm">${icon("send")}<span>Responder</span></button>
      </form>`;
  }

  function feed() {
    if (st.posts == null) return `<p class="cm-cargando cm-feed-cargando">Cargando la comunidad…</p>`;
    const vis = st.posts.filter((p) => st.filtro === "todo" || p.tipo === st.filtro || (st.filtro === "sinresp" && p.tipo === "pregunta" && !(p.respuestas > 0) && !p.resuelto));
    const chips = [["todo", "Todo"], ["pregunta", "Preguntas"], ["material", "Materiales"], ["debate", "Debates"], ["sinresp", "Sin responder"]];
    return `<div class="cm-filtros" role="group" aria-label="Filtrar publicaciones">
        ${chips.map(([k, l]) => `<button type="button" class="cm-chip${st.filtro === k ? " on" : ""}" data-f="${k}" aria-pressed="${st.filtro === k}">${esc(l)}</button>`).join("")}
      </div>
      ${vis.length ? `<div class="cm-feed">${vis.map(postCard).join("")}</div>`
        : `<p class="cm-vacio cm-feed-vacio">${st.posts.length ? "No hay publicaciones de este tipo." : "Aún no hay nada por aquí. ¡Abre tú la primera publicación!"}</p>`}`;
  }

  function pintar() {
    app.innerHTML = `
      <header class="cm-hero">
        <span class="eyebrow">${S.curso}.º Grado en Ingeniería Informática · Comunidad</span>
        <div class="cm-hero-t"><span class="hub-badge">${esc(S.short)}</span><h1>Comunidad de ${esc(S.name)}</h1></div>
        <p class="lead">Pregunta tus dudas, comparte apuntes y enlaces y echa una mano a los demás. Los archivos no se suben: se comparte el enlace (Drive, Wuolah, el Aula Virtual…).</p>
      </header>
      ${entregasPanel()}
      ${composer()}
      ${feed()}`;
    enganchar();
  }

  /* ---------------- Interacción ---------------- */
  function enganchar() {
    const abrir = app.querySelector("#cm-abrir"), form = app.querySelector("#cm-form");
    if (abrir && form) {
      abrir.addEventListener("click", () => { abrir.hidden = true; form.hidden = false; form.querySelector("#cm-titulo").focus(); });
      app.querySelector("#cm-cancelar").addEventListener("click", () => { form.hidden = true; abrir.hidden = false; });
      form.addEventListener("submit", enviarPost);
    }
    app.querySelectorAll(".cm-chip").forEach((b) => b.addEventListener("click", () => { st.filtro = b.dataset.f; pintar(); }));
    app.querySelectorAll(".cm-post").forEach((card) => card.addEventListener("click", (e) => accionPost(e, card)));
  }

  function errorForm(form, msg) { const e = form.querySelector(".cm-err"); if (e) { e.textContent = msg; e.hidden = !msg; } }

  async function enviarPost(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const tipo = (form.querySelector('input[name="cm-tipo"]:checked') || {}).value || "debate";
    const titulo = form.querySelector("#cm-titulo").value.trim();
    const texto = form.querySelector("#cm-texto").value.trim();
    const enlace = form.querySelector("#cm-enlace").value.trim();
    const enlaceTxt = form.querySelector("#cm-enlace-txt").value.trim();
    if (titulo.length < 3) return errorForm(form, "Ponle un título un poco más largo.");
    if (enlace && !/^https?:\/\/.+/.test(enlace)) return errorForm(form, "El enlace debe empezar por http:// o https://");
    if (!texto && !enlace) return errorForm(form, "Escribe algo o añade un enlace.");
    errorForm(form, "");
    form.querySelectorAll("input, textarea, button").forEach((x) => { x.disabled = true; });
    try {
      const d = D(), v = d.valor, id = d.nuevoId();
      const fields = { uid: v(st.uid), nombre: v(st.nombre), tipo: v(tipo), titulo: v(titulo.slice(0, MAX.titulo)),
        texto: v(texto.slice(0, MAX.texto)), likes: v(0), respuestas: v(0), fijado: v(false), resuelto: v(false) };
      if (enlace) { fields.enlace = v(enlace.slice(0, 600)); if (enlaceTxt) fields.enlaceTexto = v(enlaceTxt.slice(0, MAX.enlaceTexto)); }
      await d.escribir([{ update: { name: d.ruta(base + "/posts/" + id), fields },
        currentDocument: { exists: false }, updateTransforms: [{ fieldPath: "creado", setToServerValue: "REQUEST_TIME" }] }]);
      st.posts = null; await cargarPosts();
      st.filtro = "todo"; pintar();
      toast("Publicado", "Tu publicación ya está en la comunidad.");
    } catch (ex) {
      form.querySelectorAll("input, textarea, button").forEach((x) => { x.disabled = false; });
      errorForm(form, ex.status === 403 ? "Tu cuenta no puede publicar ahora mismo." : (ex.message || "No se ha podido publicar. Prueba en un momento."));
    }
  }

  async function accionPost(e, card) {
    const btn = e.target.closest("[data-act]");
    const id = card.dataset.id;
    const p = st.posts.find((x) => x._id === id);
    if (!p || !btn) return;
    const act = btn.dataset.act;
    if (act === "like") return toggleLike(p, btn);
    if (act === "ver") return verRespuestas(p, card);
    if (act === "borrar") return borrarPost(p, card);
    if (act === "resuelto") return marcarResuelto(p);
    if (act === "fijar") return fijar(p);
    if (act === "reportar") return reportar(p);
    if (act === "borrar-r") return borrarRespuesta(p, btn.dataset.r, card);
  }

  async function toggleLike(p, btn) {
    const liked = st.likes[p._id], d = D(), v = d.valor;
    const path = base + "/posts/" + p._id;
    // Optimista.
    st.likes[p._id] = !liked; p.likes = Math.max(0, (p.likes || 0) + (liked ? -1 : 1));
    btn.classList.toggle("on", !liked); btn.querySelector("span").textContent = p.likes; btn.setAttribute("aria-pressed", String(!liked));
    try {
      const meg = d.ruta(path + "/megusta/" + st.uid);
      const incr = { transform: { document: d.ruta(path), fieldTransforms: [{ fieldPath: "likes", increment: v(liked ? -1 : 1) }] }, currentDocument: { exists: true } };
      if (liked) await d.escribir([{ delete: meg }, incr]);
      else await d.escribir([{ update: { name: meg, fields: {} }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: "creado", setToServerValue: "REQUEST_TIME" }] }, incr]);
    } catch (ex) {
      // Deshacer si falla.
      st.likes[p._id] = liked; p.likes = Math.max(0, (p.likes || 0) + (liked ? 1 : -1));
      btn.classList.toggle("on", liked); btn.querySelector("span").textContent = p.likes; btn.setAttribute("aria-pressed", String(liked));
      toast("No se ha podido", "Prueba otra vez en un momento.");
    }
  }

  async function verRespuestas(p, card) {
    const cont = card.querySelector(".cm-respuestas");
    if (!cont.hidden) { cont.hidden = true; cont.innerHTML = ""; st.abierto = null; return; }
    st.abierto = p._id; cont.hidden = false; cont.innerHTML = `<p class="cm-cargando">Cargando respuestas…</p>`;
    try { if (!st.respuestas[p._id]) await cargarRespuestas(p._id); } catch (e) { cont.innerHTML = `<p class="cm-err">No se han podido cargar.</p>`; return; }
    cont.innerHTML = respuestasHtml(p._id);
    cont.querySelector(".cm-r-form").addEventListener("submit", (e) => enviarRespuesta(e, p, card));
  }

  async function enviarRespuesta(e, p, card) {
    e.preventDefault();
    const form = e.currentTarget;
    const texto = form.querySelector("textarea").value.trim();
    const enlace = form.querySelector(".cm-r-enlace").value.trim();
    if (!texto) return;
    if (enlace && !/^https?:\/\/.+/.test(enlace)) { toast("Enlace no válido", "Debe empezar por http:// o https://"); return; }
    form.querySelectorAll("textarea, input, button").forEach((x) => { x.disabled = true; });
    try {
      const d = D(), v = d.valor, rid = d.nuevoId(), path = base + "/posts/" + p._id;
      const fields = { uid: v(st.uid), nombre: v(st.nombre), texto: v(texto.slice(0, MAX.resp)) };
      if (enlace) fields.enlace = v(enlace.slice(0, 600));
      await d.escribir([
        { update: { name: d.ruta(path + "/respuestas/" + rid), fields }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: "creado", setToServerValue: "REQUEST_TIME" }] },
        { transform: { document: d.ruta(path), fieldTransforms: [{ fieldPath: "respuestas", increment: v(1) }] }, currentDocument: { exists: true } }
      ]);
      p.respuestas = (p.respuestas || 0) + 1;
      await cargarRespuestas(p._id);
      const cont = card.querySelector(".cm-respuestas");
      cont.innerHTML = respuestasHtml(p._id);
      cont.querySelector(".cm-r-form").addEventListener("submit", (ev) => enviarRespuesta(ev, p, card));
      const rb = card.querySelector('[data-act="ver"] span'); if (rb) rb.textContent = p.respuestas + (p.respuestas === 1 ? " respuesta" : " respuestas");
    } catch (ex) {
      form.querySelectorAll("textarea, input, button").forEach((x) => { x.disabled = false; });
      toast("No se ha podido", ex.status === 403 ? "Tu cuenta no puede responder ahora mismo." : "Prueba en un momento.");
    }
  }

  async function borrarRespuesta(p, rid, card) {
    if (!confirm("¿Borrar esta respuesta?")) return;
    try {
      const d = D(), v = d.valor, path = base + "/posts/" + p._id;
      await d.escribir([
        { delete: d.ruta(path + "/respuestas/" + rid) },
        { transform: { document: d.ruta(path), fieldTransforms: [{ fieldPath: "respuestas", increment: v(-1) }] }, currentDocument: { exists: true } }
      ]);
      p.respuestas = Math.max(0, (p.respuestas || 0) - 1);
      st.respuestas[p._id] = (st.respuestas[p._id] || []).filter((r) => r._id !== rid);
      const cont = card.querySelector(".cm-respuestas");
      cont.innerHTML = respuestasHtml(p._id);
      cont.querySelector(".cm-r-form").addEventListener("submit", (ev) => enviarRespuesta(ev, p, card));
      const rb = card.querySelector('[data-act="ver"] span'); if (rb) rb.textContent = p.respuestas + (p.respuestas === 1 ? " respuesta" : " respuestas");
    } catch (ex) { toast("No se ha podido", "Prueba en un momento."); }
  }

  async function borrarPost(p, card) {
    if (!confirm("¿Borrar esta publicación? No se puede deshacer.")) return;
    try {
      await D().escribir([{ delete: D().ruta(base + "/posts/" + p._id) }]);
      st.posts = st.posts.filter((x) => x !== p); card.remove();
      if (!st.posts.length) pintar();
    } catch (ex) { toast("No se ha podido", "Prueba en un momento."); }
  }

  async function marcarResuelto(p) {
    try {
      const d = D(), v = d.valor, nuevo = !p.resuelto;
      await d.escribir([{ update: { name: d.ruta(base + "/posts/" + p._id), fields: { resuelto: v(nuevo) } }, updateMask: { fieldPaths: ["resuelto"] }, currentDocument: { exists: true } }]);
      p.resuelto = nuevo; pintar();
    } catch (ex) { toast("No se ha podido", "Prueba en un momento."); }
  }

  async function fijar(p) {
    try {
      const d = D(), v = d.valor, nuevo = !p.fijado;
      await d.escribir([{ update: { name: d.ruta(base + "/posts/" + p._id), fields: { fijado: v(nuevo) } }, updateMask: { fieldPaths: ["fijado"] }, currentDocument: { exists: true } }]);
      p.fijado = nuevo; st.posts.sort((a, b) => (b.fijado ? 1 : 0) - (a.fijado ? 1 : 0)); pintar();
    } catch (ex) { toast("No se ha podido", "Sólo los administradores pueden fijar."); }
  }

  async function reportar(p) {
    const motivo = prompt("¿Qué pasa con esta publicación? (lo verá un administrador)");
    if (!motivo || !motivo.trim()) return;
    try {
      const d = D(), v = d.valor;
      await d.escribir([{ update: { name: d.ruta("reportes/" + d.nuevoId()), fields: {
        uid: v(st.uid), nombre: v(st.nombre), pagina: v(S.id + "/comunidad.html"), titulo: v("Comunidad · " + S.short),
        contexto: v("Publicación de " + p.nombre + ": «" + String(p.titulo).slice(0, 120) + "»"),
        texto: v(motivo.trim().slice(0, 1500)), estado: v("abierto") } },
        currentDocument: { exists: false }, updateTransforms: [{ fieldPath: "creado", setToServerValue: "REQUEST_TIME" }] }]);
      toast("Gracias por avisar", "Un administrador lo revisará.");
    } catch (ex) { toast("No se ha podido", "Prueba en un momento."); }
  }

  /* ---------------- Arranque ---------------- */
  function sinCuenta() {
    app.innerHTML = `<header class="cm-hero"><div class="cm-hero-t"><span class="hub-badge">${esc(S.short)}</span><h1>Comunidad de ${esc(S.name)}</h1></div></header>
      <section class="cm-card"><p class="cm-vacio">Entra con tu cuenta para ver y participar en la comunidad.</p>
        <p style="text-align:center"><a class="cm-btn" href="${root}cuenta.html?volver=${encodeURIComponent(location.href)}">Entrar o crear cuenta</a></p></section>`;
  }

  async function iniciar() {
    const C = window.Cuentas;
    const ses = C && C.actual();
    if (!C || !ses || ses.local) { sinCuenta(); return; }
    st.nombre = ses.nombre || "";
    try { st.uid = await C.miUid(); } catch (e) { st.uid = null; }
    if (!st.uid) { sinCuenta(); return; }
    try { st.admin = await C.esAdmin(); } catch (e) { st.admin = false; }
    pintar();                                   // ya con los esqueletos de carga
    cargarEntregas().then(() => { const el = app.querySelector("#entregas"); if (el) el.outerHTML = entregasPanel(); }).catch(() => {});
    try { await cargarPosts(); } catch (e) { st.posts = []; toast("No se ha podido cargar", "Prueba a recargar la página."); }
    pintar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
