/*!
 * cuentas.js — cuentas de usuario (lo carga core.js en todas las páginas).
 *
 *   · Cada cuenta tiene su propio progreso. Las páginas siguen guardando en localStorage con las claves
 *     de siempre (fli-…, fc-…, ip-…, eq-…, app-last…); aquí se guarda una copia por cuenta («u:<id>»),
 *     se sube al servidor y, al cambiar de cuenta, se cambia el contenido de esas claves.
 *   · Los puntos (App.puntos, al terminar un test) van a una cola («app-pend») que se envía a /api/cuenta.
 *   · Si el servidor no tiene cuentas configuradas (o la web se abre con doble clic), se pueden crear
 *     perfiles locales: sólo en este navegador y sin ranking.
 *
 * localStorage:  app-sesion (cuenta activa) · app-cuentas (cuentas usadas en este dispositivo)
 *                app-owner (de quién es el progreso que hay ahora en las claves) · app-sync · app-pend · u:<id>
 */
(function () {
  "use strict";
  if (window.Cuentas || !window.App) return;
  const App = window.App;
  const { store, esc, esProgreso } = App;
  const API = App.ROOT + "api/";
  const K = { ses: "app-sesion", lista: "app-cuentas", owner: "app-owner", pend: "app-pend", sync: "app-sync" };
  const idDe = (n) => String(n || "").normalize("NFC").trim().toLowerCase();
  const fmt = (n) => Number(n || 0).toLocaleString("es-ES");
  const puntosDe = (ev) => ev.aciertos * 10 + (ev.aciertos === ev.total && ev.total >= 10 ? 25 : 0);

  /* ---------------- Servidor ---------------- */
  let srv = null;
  /** ¿Hay cuentas en el servidor? (Promise<boolean>; false abierta con doble clic o sin configurar) */
  function servidor() {
    if (!/^https?:$/.test(location.protocol)) return Promise.resolve(false);
    if (!srv) srv = fetch(API + "cuenta", { cache: "no-store" }).then((r) => r.ok ? r.json() : {}).then((d) => Boolean(d.configurado)).catch(() => false);
    return srv;
  }
  async function api(ruta, accion, datos, token, keepalive) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    const r = await fetch(API + ruta, accion == null ? { headers, cache: "no-store" } :
      { method: "POST", headers, body: JSON.stringify(Object.assign({ accion }, datos || {})), keepalive: Boolean(keepalive) });
    let d = {};
    try { d = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) { const e = new Error(d.error || "Error " + r.status); e.status = r.status; e.datos = d; throw e; }
    return d;
  }

  /* ---------------- Cuentas de este dispositivo ---------------- */
  const lista = () => (store(K.lista) || []).filter((c) => c && c.id);
  const actual = () => store(K.ses);
  function guardarCuenta(c) {
    const l = lista(), prev = l.find((x) => x.id === c.id) || {};
    const nueva = Object.assign({}, prev, c, { last: Date.now() });
    store(K.lista, [nueva].concat(l.filter((x) => x.id !== c.id)).slice(0, 12));
    const ses = actual();
    if (ses && ses.id === c.id) store(K.ses, { id: nueva.id, nombre: nueva.nombre, token: nueva.token || null, local: Boolean(nueva.local) });
    return nueva;
  }
  function cambiarCuenta(id, cambios) { const c = lista().find((x) => x.id === id); return c ? guardarCuenta(Object.assign({}, c, cambios)) : null; }

  /* ---------------- Progreso ---------------- */
  function recoger() {
    const data = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (esProgreso(k)) data[k] = localStorage.getItem(k); } } catch (e) { /* sin almacenamiento */ }
    return data;
  }
  function aplicar(data) {
    try {
      const fuera = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (esProgreso(k)) fuera.push(k); }
      fuera.forEach((k) => localStorage.removeItem(k));
      Object.keys(data || {}).forEach((k) => { if (esProgreso(k) && typeof data[k] === "string") localStorage.setItem(k, data[k]); });
    } catch (e) { /* sin almacenamiento */ }
  }
  function huella(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ":" + s.length; }

  /** Detecta cambios en el progreso, guarda la copia local de la cuenta y la sube si hace falta. */
  function sincronizar(keepalive) {
    const ses = actual();
    if (!ses || store(K.owner) !== ses.id) return Promise.resolve();
    const data = recoger(), s = JSON.stringify(data), h = huella(s);
    let st = store(K.sync);
    if (!st || st.id !== ses.id) st = { id: ses.id, h: null, t: 0, subido: 0 };
    if (h !== st.h) { st.h = h; st.t = Date.now(); store("u:" + ses.id, { t: st.t, data }); store(K.sync, st); }
    if (!ses.token || st.subido >= st.t) return Promise.resolve();
    const t = st.t;
    return servidor().then((ok) => ok && api("cuenta", "guardar", { t, data }, ses.token, keepalive && s.length < 60000).then(() => {
      const x = store(K.sync); if (x && x.id === ses.id && x.t === t) { x.subido = t; store(K.sync, x); }
    })).catch((e) => { if (e && e.status === 401) caducada(ses.id); });
  }

  /** Si otro dispositivo ha guardado progreso más reciente en la cuenta, lo trae. */
  async function traer() {
    const ses = actual();
    if (!ses || !ses.token || store(K.owner) !== ses.id) return;
    const ult = App.session("app-pull");
    if (ult && Date.now() - ult < 120000) return;
    App.session("app-pull", Date.now());
    if (!(await servidor())) return;
    await sincronizar();
    let p;
    try { p = await api("cuenta", "progreso", {}, ses.token); } catch (e) { if (e.status === 401) caducada(ses.id); return; }
    const st = store(K.sync) || {};
    if (!p || !(p.t > (st.t || 0))) return;
    const antes = JSON.stringify(recoger());
    aplicar(p.data);
    const ahora = recoger(), s = JSON.stringify(ahora);
    store("u:" + ses.id, { t: p.t, data: ahora });
    store(K.sync, { id: ses.id, h: huella(s), t: p.t, subido: p.t });
    if (s !== antes) toast("Progreso actualizado", "Se ha traído lo que hiciste en otro dispositivo.", { texto: "Recargar", fn: () => location.reload() });
  }

  function caducada(id) {
    const c = cambiarCuenta(id, { token: null });
    const ses = actual();
    if (c && ses && ses.id === id) toast("Tu sesión ha caducado", "Vuelve a entrar para guardar tu progreso y tus puntos.", { texto: "Entrar", href: App.ROOT + "cuenta.html?entrar=" + encodeURIComponent(c.nombre) });
  }

  /**
   * Pone una cuenta como activa: guarda el progreso de la anterior y carga el de esta.
   * c: { id, nombre, token?, local? } · o.adoptar: quedarse con el progreso que hay ahora en el navegador.
   */
  async function activar(c, o) {
    o = o || {};
    const owner = store(K.owner), ses = actual();
    if (owner) {
      if (ses && ses.id === owner) await Promise.race([sincronizar(), new Promise((r) => setTimeout(r, 4000))]);
      else store("u:" + owner, { t: Date.now(), data: recoger() });
    }
    const huerfano = !owner && Object.keys(recoger()).length > 0;
    const adoptar = o.adoptar == null ? huerfano : Boolean(o.adoptar);
    const local = store("u:" + c.id) || { t: 0, data: {} };
    let remoto = null;
    if (c.token) {
      try { remoto = await api("cuenta", "progreso", {}, c.token); }
      catch (e) { if (e.status === 401) { cambiarCuenta(c.id, { token: null }); throw e; } }
    }
    const mejor = remoto && remoto.t >= local.t ? remoto : local;
    if (adoptar) aplicar(Object.assign({}, mejor.data, recoger()));
    else aplicar(mejor.data);
    const data = recoger(), s = JSON.stringify(data);
    const t = adoptar ? Date.now() : (mejor.t || 0);
    store("u:" + c.id, { t, data });
    store(K.sync, { id: c.id, h: huella(s), t, subido: remoto ? remoto.t : 0 });
    store(K.owner, c.id);
    store(K.ses, { id: c.id, nombre: c.nombre, token: c.token || null, local: Boolean(c.local) });
    guardarCuenta(c);
    App.session("app-pull", Date.now());
    await sincronizar();
    enviar();
    return c;
  }

  /* ---------------- Entrar, registrarse, salir ---------------- */
  async function registrar(nombre, pass, adoptar) {
    const d = await api("cuenta", "registro", { nombre, pass });
    return activar({ id: idDe(d.nombre), nombre: d.nombre, token: d.token, puntos: d.puntos, tests: d.tests }, { adoptar });
  }
  async function entrar(nombre, pass) {
    const d = await api("cuenta", "entrar", { nombre, pass });
    return activar({ id: idDe(d.nombre), nombre: d.nombre, token: d.token, puntos: d.puntos, tests: d.tests });
  }
  /** Entra en una cuenta ya usada en este dispositivo (sin contraseña mientras su sesión siga abierta). */
  function elegir(id) {
    const c = lista().find((x) => x.id === id);
    if (!c) return Promise.reject(new Error("No está esa cuenta"));
    if (!c.local && !c.token) { const e = new Error("Escribe la contraseña"); e.status = 401; return Promise.reject(e); }
    return activar(c);
  }
  function crearLocal(nombre, adoptar) {
    nombre = String(nombre || "").normalize("NFC").trim();
    if (!/^[\p{L}\p{N}_.-]{3,20}$/u.test(nombre)) return Promise.reject(new Error("El nombre debe tener de 3 a 20 letras, números, «_», «.» o «-», sin espacios."));
    const id = "local:" + idDe(nombre);
    const prev = lista().find((x) => x.id === id);
    return activar(prev || { id, nombre, local: true, puntos: 0, tests: 0 }, prev ? {} : { adoptar });
  }
  /** Cierra la sesión: guarda y sube el progreso, y deja el navegador sin progreso de nadie. */
  async function salir() {
    const ses = actual();
    if (!ses) return;
    await Promise.race([sincronizar(), new Promise((r) => setTimeout(r, 4000))]);
    const st = store(K.sync);
    if (ses.token) {
      api("cuenta", "salir", {}, ses.token).catch(() => {});
      // Si el progreso ya está en la cuenta, no hace falta dejar copia en este dispositivo.
      if (st && st.id === ses.id && st.subido >= st.t) store("u:" + ses.id, null);
      cambiarCuenta(ses.id, { token: null });
    }
    aplicar({});
    store(K.owner, null); store(K.ses, null); store(K.sync, null);
  }
  /** Quita una cuenta de la lista de este dispositivo (no la borra del servidor). */
  function olvidar(id) {
    const ses = actual();
    if (ses && ses.id === id) return;
    const c = lista().find((x) => x.id === id);
    if (c && c.token) api("cuenta", "salir", {}, c.token).catch(() => {});
    store(K.lista, lista().filter((x) => x.id !== id));
    store("u:" + id, null);
  }

  /* ---------------- Puntos ---------------- */
  let enviando = false;
  async function enviar() {
    if (enviando) return;
    enviando = true;
    try {
      const online = await servidor();
      for (;;) {
        const cola = store(K.pend) || [];
        const ev = cola.find((e) => { const c = lista().find((x) => x.id === e.u); return !c || c.local || (online && c.token); });
        if (!ev) break;
        const quitar = () => store(K.pend, (store(K.pend) || []).filter((e) => e.evento !== ev.evento));
        const c = lista().find((x) => x.id === ev.u);
        const mia = (actual() || {}).id === ev.u;
        if (!c) { quitar(); continue; }
        if (c.local) {
          const pts = puntosDe(ev), n = cambiarCuenta(c.id, { puntos: (c.puntos || 0) + pts, tests: (c.tests || 0) + 1 });
          quitar();
          if (mia && pts) toast("+" + fmt(pts) + " puntos", "Llevas " + fmt(n.puntos) + " en este perfil local (no entra en el ranking).");
          continue;
        }
        try {
          const r = await api("cuenta", "puntos", { evento: ev.evento, asig: ev.asig, tipo: ev.tipo, aciertos: ev.aciertos, total: ev.total }, c.token);
          quitar();
          cambiarCuenta(c.id, { puntos: r.puntos, tests: r.tests, posicion: r.posicion });
          if (mia && r.sumados) toast("+" + fmt(r.sumados) + " puntos", "Llevas " + fmt(r.puntos) + (r.posicion ? " · puesto " + r.posicion + " del ranking" : ""), { texto: "Ranking", href: App.ROOT + "ranking.html" });
        } catch (e) {
          if (e.status === 401) { caducada(c.id); continue; }
          if (e.status === 400 || e.status === 429) { quitar(); if (mia && e.status === 429) toast("Puntos no sumados", e.message); continue; }
          break;                                            // sin conexión: se reintenta más tarde
        }
      }
    } finally { enviando = false; }
  }

  /* ---------------- Ranking y datos de la cuenta ---------------- */
  async function fetchRanking(tabla, token) {
    const headers = token ? { Authorization: "Bearer " + token } : {};
    const r = await fetch(API + "ranking?tabla=" + encodeURIComponent(tabla || "total"), { headers, cache: "no-store" });
    let d = {};
    try { d = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) { const e = new Error(d.error || "Error " + r.status); e.status = r.status; throw e; }
    return d;
  }
  async function yo() {
    const ses = actual();
    if (!ses) return null;
    const c = lista().find((x) => x.id === ses.id) || {};
    if (ses.local || !ses.token || !(await servidor())) return { nombre: ses.nombre, puntos: c.puntos || 0, tests: c.tests || 0, posicion: null, local: ses.local };
    try {
      const d = await api("cuenta", "yo", {}, ses.token);
      cambiarCuenta(ses.id, { puntos: d.puntos, tests: d.tests, posicion: d.posicion });
      return d;
    } catch (e) {
      if (e.status === 401) caducada(ses.id);
      return { nombre: ses.nombre, puntos: c.puntos || 0, tests: c.tests || 0, posicion: c.posicion || null };
    }
  }

  /* ---------------- Avisos ---------------- */
  let caja = null;
  function toast(titulo, texto, accion) {
    if (!document.body) return;
    if (!caja) { caja = document.createElement("div"); caja.className = "cta-toasts"; caja.setAttribute("role", "status"); caja.setAttribute("aria-live", "polite"); document.body.appendChild(caja); }
    const t = document.createElement("div");
    t.className = "cta-toast";
    const btn = accion ? (accion.href ? `<a class="cta-toast__btn" href="${esc(accion.href)}">${esc(accion.texto)}</a>` : `<button type="button" class="cta-toast__btn">${esc(accion.texto)}</button>`) : "";
    t.innerHTML = `<span class="cta-toast__ico">${App.icon(titulo.charAt(0) === "+" ? "trophy" : "user")}</span><span class="cta-toast__txt"><b>${esc(titulo)}</b>${texto ? `<small>${esc(texto)}</small>` : ""}</span>${btn}<button type="button" class="cta-toast__x" aria-label="Cerrar">×</button>`;
    caja.appendChild(t);
    const cerrar = () => { t.classList.add("is-out"); setTimeout(() => t.remove(), 250); };
    t.querySelector(".cta-toast__x").onclick = cerrar;
    const b = t.querySelector("button.cta-toast__btn");
    if (b && accion.fn) b.onclick = () => { cerrar(); accion.fn(); };
    setTimeout(cerrar, accion ? 9000 : 5000);
  }

  /** ¿Hay progreso en este navegador que no es de ninguna cuenta? (p. ej. de antes de que hubiera cuentas) */
  const progresoSuelto = () => !store(K.owner) && Object.keys(recoger()).length > 0;

  window.Cuentas = Object.freeze({ servidor, lista, actual, progresoSuelto, registrar, entrar, elegir, crearLocal, salir, olvidar, enviar, sincronizar, ranking: (t) => fetchRanking(t, (actual() || {}).token), yo, toast, idDe, puntosDe, fmt });

  /* ---------------- En cada página ---------------- */
  function iniciar() {
    if (!actual()) return;
    traer().catch(() => {});
    enviar();
    setInterval(() => sincronizar(), 20000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") sincronizar(true); });
    window.addEventListener("pagehide", () => sincronizar(true));
    window.addEventListener("online", enviar);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
