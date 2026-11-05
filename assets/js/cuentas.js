/*!
 * cuentas.js — cuentas de usuario (lo carga core.js en todas las páginas).
 *
 *   · Cada cuenta tiene su propio progreso. Las páginas siguen guardando en localStorage con las claves
 *     de siempre (fli-…, fc-…, ip-…, gohp-…, eq-…, app-last…); aquí se guarda una copia por cuenta («u:<id>»),
 *     se sube al servidor y, al cambiar de cuenta, se cambia el contenido de esas claves.
 *   · Los puntos (App.puntos, al terminar un test) van a una cola («app-pend») que se envía a Firebase.
 *   · Sin conexión se pueden crear perfiles locales: sólo en este navegador y sin ranking.
 *
 *   · Administradores: cuentas con la «custom claim» admin del token (la da scripts/admin/admin.js). Aquí
 *     sólo se lee para enseñar el enlace al panel; lo que pueden hacer lo deciden las reglas de Firestore.
 *   · Configuración de la web (aviso y fechas de exámenes, config/web): se trae en segundo plano y se
 *     aplica con App.config.actualizar.
 *   · Cuentas.datos: acceso a Firestore con la sesión activa (lo usan el panel y los reportes).
 *
 * localStorage:  app-sesion (cuenta activa) · app-cuentas (cuentas usadas en este dispositivo)
 *                app-owner (de quién es el progreso que hay ahora en las claves) · app-sync · app-pend · u:<id>
 *                app-admin (id de la cuenta activa si es administradora)
 */
(function () {
  "use strict";
  if (window.Cuentas || !window.App) return;
  const App = window.App;
  const { store, esc, esProgreso } = App;
  const K = { ses: "app-sesion", lista: "app-cuentas", owner: "app-owner", pend: "app-pend", sync: "app-sync" };
  const idDe = (n) => String(n || "").normalize("NFC").trim().toLowerCase();
  const fmt = (n) => Number(n || 0).toLocaleString("es-ES");
  const puntosDe = (ev) => ev.aciertos * 10 + (ev.aciertos === ev.total && ev.total >= 10 ? 25 : 0);

  /* ---------------- Servidor: Firebase (Authentication + Firestore, por su API REST) ----------------
     Configuración del proyecto (es pública: va en el código de la web). Las reglas de seguridad están en
     firestore.rules. Cada usuario es una cuenta de Firebase con el correo <usuario>@<DOMINIO> (no se
     manda ningún correo) y tiene dos documentos: usuarios/<uid> (nombre y puntos: el ranking) y
     progreso/<uid> (su progreso guardado). «token» en las cuentas es el refresh token de Firebase. */
  const FIREBASE = {
    apiKey: "AIzaSyAqV-8REggjWvCOVJidLkM34slQ17rVxfA",
    projectId: "web-ing-inf"
  };
  const DOMINIO = "usuarios.web-ing-inf.firebaseapp.com";
  const AUTH = "https://identitytoolkit.googleapis.com/v1/accounts:";
  const TOKEN = "https://securetoken.googleapis.com/v1/token?key=" + FIREBASE.apiKey;
  const DB = "https://firestore.googleapis.com/v1/projects/" + FIREBASE.projectId + "/databases/(default)/documents";
  const DOC = "projects/" + FIREBASE.projectId + "/databases/(default)/documents/";
  const NOMBRE_RE = /^[\p{L}\p{N}_-]{3,20}$/u;
  /** Parte local del correo: el usuario en minúsculas y sin tildes (Peña → pena). */
  const correoDe = (n) => idDe(n).normalize("NFD").replace(/[̀-ͯ]/g, "");
  /** Semana actual (lunes a domingo, hora de Madrid en invierno): la misma cuenta que firestore.rules. */
  const semana = () => "w" + Math.floor((Date.now() + 262800000) / 604800000);
  const ASIG = ["fli", "fc", "ip", "gohp"];

  function fallo(msg, status, codigo) { const e = new Error(msg); e.status = status; e.codigo = codigo; return e; }
  const MENSAJES = {
    EMAIL_EXISTS: [409, "Ese nombre de usuario ya existe. Elige otro o entra con él."],
    INVALID_LOGIN_CREDENTIALS: [401, "Usuario o contraseña incorrectos."],
    INVALID_PASSWORD: [401, "Usuario o contraseña incorrectos."],
    EMAIL_NOT_FOUND: [401, "Usuario o contraseña incorrectos."],
    TOO_MANY_ATTEMPTS_TRY_LATER: [429, "Demasiados intentos. Espera unos minutos y vuelve a probar."],
    WEAK_PASSWORD: [400, "La contraseña debe tener al menos 6 caracteres."],
    USER_DISABLED: [403, "Esta cuenta está desactivada."],
    OPERATION_NOT_ALLOWED: [503, "El inicio de sesión con contraseña no está activado en Firebase."],
    TOKEN_EXPIRED: [401, "La sesión ha caducado. Vuelve a entrar."],
    INVALID_REFRESH_TOKEN: [401, "La sesión ha caducado. Vuelve a entrar."],
    USER_NOT_FOUND: [401, "Esta cuenta ya no existe."]
  };
  async function pedir(url, opts) {
    let r;
    try { r = await fetch(url, opts); } catch (e) { throw fallo("Sin conexión con el servidor. Comprueba tu conexión.", 0); }
    let d = {};
    try { d = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) {
      const err = (Array.isArray(d) ? d[0] && d[0].error : d.error) || {};
      const cod = String(err.message || err.status || "").split(/[ :]/)[0];
      const m = MENSAJES[cod];
      if (m) throw fallo(m[1], m[0], cod);
      if (r.status === 403) throw fallo("El servidor ha rechazado la operación.", 403, "PERMISSION_DENIED");
      throw fallo("Error del servidor (" + r.status + "). Prueba en un momento.", r.status >= 500 ? 502 : r.status, cod);
    }
    return d;
  }
  const json = (body, keepalive) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: Boolean(keepalive) });

  /* Tokens: el id token dura una hora; se renueva con el refresh token y se guarda en la pestaña.
     «adm»: si el token lleva la claim admin (se lee del propio token; no hace falta comprobar su firma
     porque sólo sirve para enseñar el enlace al panel: el servidor vuelve a comprobarlo en cada escritura). */
  function claimsDe(idToken) {
    try {
      const p = String(idToken).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(p + "===".slice((p.length + 3) % 4));
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    } catch (e) { return {}; }
  }
  async function sesionDe(refresh, forzar) {
    const c = App.session("app-idt") || {};
    if (!forzar && c.r === refresh && c.exp > Date.now() + 60000) return c;
    const d = await pedir(TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(refresh) });
    const n = { r: refresh, t: d.id_token, uid: d.user_id, adm: claimsDe(d.id_token).admin === true, exp: Date.now() + (Number(d.expires_in) || 3600) * 1000 };
    App.session("app-idt", n);
    return n;
  }
  function guardarSesion(d) { App.session("app-idt", { r: d.refreshToken, t: d.idToken, uid: d.localId, adm: claimsDe(d.idToken).admin === true, exp: Date.now() + (Number(d.expiresIn) || 3600) * 1000 }); }

  /* Firestore: valores ↔ JS */
  function val(x) {
    if (x === null || x === undefined) return { nullValue: null };
    if (typeof x === "number") return { integerValue: String(Math.round(x)) };
    if (typeof x === "boolean") return { booleanValue: x };
    if (x instanceof Date) return { timestampValue: x.toISOString() };
    if (Array.isArray(x)) return { arrayValue: { values: x.map(val) } };
    if (typeof x === "object") { const fields = {}; Object.keys(x).forEach((k) => { fields[k] = val(x[k]); }); return { mapValue: { fields } }; }
    return { stringValue: String(x) };
  }
  function valorDe(v) {
    if (!v) return null;
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return Number(v.doubleValue);
    if ("stringValue" in v) return v.stringValue;
    if ("booleanValue" in v) return v.booleanValue;
    if ("timestampValue" in v) return v.timestampValue;
    if ("mapValue" in v) return leer(v.mapValue);
    if ("arrayValue" in v) return ((v.arrayValue && v.arrayValue.values) || []).map(valorDe);
    return null;
  }
  function leer(doc) {
    const o = {}, f = (doc && doc.fields) || {};
    for (const k in f) o[k] = valorDe(f[k]);
    return o;
  }
  const cab = (s) => s ? { Authorization: "Bearer " + s.t } : {};
  async function docGet(ruta, s) {
    try { return leer(await pedir(DB + "/" + ruta, { headers: cab(s), cache: "no-store" })); }
    catch (e) { if (e.status === 404) return null; throw e; }
  }
  function commit(writes, s, keepalive) {
    const o = json({ writes }, keepalive); o.headers.Authorization = "Bearer " + s.t;
    return pedir(DB + ":commit", o);
  }
  function crearUsuario(s, nombre) {
    return commit([{ update: { name: DOC + "usuarios/" + s.uid, fields: { nombre: val(nombre), id: val(correoDe(nombre)), puntos: val(0), tests: val(0) } },
      currentDocument: { exists: false },
      updateTransforms: [{ fieldPath: "ultimo", setToServerValue: "REQUEST_TIME" }, { fieldPath: "creado", setToServerValue: "REQUEST_TIME" }] }], s);
  }
  async function posicion(campo, puntos) {
    if (!(puntos > 0)) return null;
    const d = await pedir(DB + ":runAggregationQuery", json({ structuredAggregationQuery: {
      structuredQuery: { from: [{ collectionId: "usuarios" }], where: { fieldFilter: { field: { fieldPath: campo }, op: "GREATER_THAN", value: val(puntos) } } },
      aggregations: [{ alias: "n", count: {} }] } }));
    const r = Array.isArray(d) && d[0] && d[0].result;
    return r ? Number(r.aggregateFields.n.integerValue) + 1 : null;
  }

  /** Mismas acciones (y respuestas) que tenía /api/cuenta, ahora contra Firebase. */
  async function api(ruta, accion, datos, token, keepalive) {
    datos = datos || {};
    if (accion === "registro" || accion === "entrar") {
      const nombre = String(datos.nombre || "").normalize("NFC").trim(), pass = String(datos.pass || "");
      if (accion === "registro") {
        if (!NOMBRE_RE.test(nombre) || !/^[a-z0-9_-]+$/.test(correoDe(nombre))) throw fallo("El usuario debe tener de 3 a 20 letras, números, «_» o «-», sin espacios.", 400);
        if (pass.length < 6) throw fallo("La contraseña debe tener al menos 6 caracteres.", 400);
      } else if (!nombre || !pass) throw fallo("Escribe tu usuario y tu contraseña.", 400);
      const d = await pedir(AUTH + (accion === "registro" ? "signUp" : "signInWithPassword") + "?key=" + FIREBASE.apiKey,
        json({ email: correoDe(nombre) + "@" + DOMINIO, password: pass, returnSecureToken: true }));
      guardarSesion(d);
      const s = await sesionDe(d.refreshToken);
      let u = await docGet("usuarios/" + s.uid, s);
      if (!u) { await crearUsuario(s, nombre); u = { nombre, puntos: 0, tests: 0 }; }   // también si el registro se cortó a medias
      return { token: d.refreshToken, nombre: u.nombre, puntos: u.puntos || 0, tests: u.tests || 0 };
    }
    if (accion === "salir") { const c = App.session("app-idt"); if (c && c.r === token) App.session("app-idt", null); return { ok: true }; }

    const s = await sesionDe(token);
    if (accion === "yo") {
      const u = (await docGet("usuarios/" + s.uid, s)) || {};
      return { nombre: u.nombre, puntos: u.puntos || 0, tests: u.tests || 0, posicion: await posicion("puntos", u.puntos || 0).catch(() => null) };
    }
    if (accion === "progreso") {
      const p = await docGet("progreso/" + s.uid, s);
      let data = {};
      try { data = p && p.json ? JSON.parse(p.json) : {}; } catch (e) { data = {}; }
      return { t: (p && p.t) || 0, data };
    }
    if (accion === "guardar") {
      await commit([{ update: { name: DOC + "progreso/" + s.uid, fields: { t: val(Number(datos.t) || Date.now()), json: val(JSON.stringify(datos.data || {})) } } }], s, keepalive);
      return { ok: true, t: datos.t };
    }
    if (accion === "puntos") {
      const total = Math.floor(Number(datos.total)), aciertos = Math.floor(Number(datos.aciertos));
      if (!ASIG.includes(datos.asig) || !(total >= 1 && total <= 200) || !(aciertos >= 0 && aciertos <= total)) throw fallo("Resultado no válido", 400);
      const pts = aciertos * 10 + (aciertos === total && total >= 10 ? 25 : 0);
      const inc = (f, n) => ({ fieldPath: f, increment: val(n) });
      let r;
      try {
        r = await commit([{ transform: { document: DOC + "usuarios/" + s.uid, fieldTransforms: [
          inc("puntos", pts), inc("tests", 1), inc(datos.asig, pts), inc(semana(), pts), { fieldPath: "ultimo", setToServerValue: "REQUEST_TIME" }] },
          currentDocument: { exists: true } }], s);
      } catch (e) {
        // Rechazado por las reglas (test terminado demasiado deprisa, cambio de semana…): se reintenta luego.
        if (e.status === 403 || e.status === 400) throw fallo("Puntos pendientes de confirmar", 503, "REINTENTAR");
        throw e;
      }
      const tr = (r.writeResults && r.writeResults[0] && r.writeResults[0].transformResults) || [];
      const puntos = Number((tr[0] && tr[0].integerValue) || 0), tests = Number((tr[1] && tr[1].integerValue) || 0);
      return { sumados: pts, puntos, tests, posicion: await posicion("puntos", puntos).catch(() => null) };
    }
    throw fallo("Acción desconocida", 400);
  }

  /** ¿Hay servidor de cuentas? (sin conexión, sólo perfiles locales) */
  function servidor() { return Promise.resolve(navigator.onLine !== false); }

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
    store("app-admin", null);                      // el rol se vuelve a comprobar con el token de esta cuenta
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
    if (!NOMBRE_RE.test(nombre)) return Promise.reject(new Error("El nombre debe tener de 3 a 20 letras, números, «_» o «-», sin espacios."));
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
    store(K.owner, null); store(K.ses, null); store(K.sync, null); store("app-admin", null);
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
  let enviando = false, reintento = null;
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
          if (mia && window.Insignias) window.Insignias.revisar().catch(() => {});      // ¿alguna insignia nueva?
        } catch (e) {
          if (e.status === 401) { caducada(c.id); continue; }
          if (e.status === 400) { quitar(); continue; }
          if (e.codigo === "REINTENTAR") {
            // Las reglas no lo han aceptado todavía: se reintenta cada 30 s (como mucho 20 veces).
            const cola = store(K.pend) || [], x = cola.find((y) => y.evento === ev.evento);
            if (x) { x.intentos = (x.intentos || 0) + 1; store(K.pend, x.intentos > 20 ? cola.filter((y) => y !== x) : cola); }
            clearTimeout(reintento); reintento = setTimeout(enviar, 30000);
          }
          break;                                            // sin conexión: se reintenta más tarde
        }
      }
    } finally { enviando = false; }
  }

  /* ---------------- Ranking y datos de la cuenta ---------------- */
  /** Ranking: { filas: [{ pos, nombre, puntos, tests, yo }], yo: { nombre, puntos, pos } | null } */
  async function fetchRanking(tabla, token) {
    const campo = tabla === "semana" ? semana() : ASIG.includes(tabla) ? tabla : "puntos";
    const d = await pedir(DB + ":runQuery", json({ structuredQuery: { from: [{ collectionId: "usuarios" }],
      orderBy: [{ field: { fieldPath: campo }, direction: "DESCENDING" }], limit: 50 } }));
    let s = null;
    if (token) { try { s = await sesionDe(token); } catch (e) { s = null; } }
    let pos = 0, prev = null;
    const filas = (Array.isArray(d) ? d : []).filter((x) => x.document).map((x) => {
      const u = leer(x.document), uid = x.document.name.split("/").pop();
      return { uid, nombre: u.nombre || "?", puntos: Number(u[campo] || 0), tests: Number(u.tests || 0), bloqueado: u.bloqueado === true, insignias: u.insignias || {}, vitrina: Array.isArray(u.vitrina) ? u.vitrina : [] };
    }).filter((f) => f.puntos > 0 && !f.bloqueado).map((f, i) => {
      if (f.puntos !== prev) { pos = i + 1; prev = f.puntos; }   // empates: misma posición
      return { pos, uid: f.uid, nombre: f.nombre, puntos: f.puntos, tests: f.tests, insignias: f.insignias, vitrina: f.vitrina, yo: Boolean(s && s.uid === f.uid) };
    });
    let yo = null;
    if (s) {
      const u = (await docGet("usuarios/" + s.uid, s).catch(() => null)) || {};
      const puntos = Number(u[campo] || 0);
      yo = { nombre: u.nombre, puntos, pos: await posicion(campo, puntos).catch(() => null) };
    }
    return { tabla, filas, yo };
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

  /* ---------------- Administradores ---------------- */
  function marcarAdmin(id) {
    store("app-admin", id || null);
    document.querySelectorAll(".site-nav__admin").forEach((a) => { a.hidden = !id; });
  }
  /** ¿La cuenta activa es administradora? forzar: pide un token nuevo (recoge un cambio de rol reciente). */
  async function esAdmin(forzar) {
    const ses = actual();
    if (!ses || !ses.token) { marcarAdmin(null); return false; }
    try {
      const s = await sesionDe(ses.token, forzar);
      marcarAdmin(s.adm ? ses.id : null);
      return Boolean(s.adm);
    } catch (e) {
      if (e.status === 401) { caducada(ses.id); marcarAdmin(null); return false; }
      return store("app-admin") === ses.id;          // sin conexión: lo último que se supo
    }
  }

  /* ---------------- Configuración de la web (config/web) ----------------
     Pública: la lee cualquiera. Se trae como mucho una vez cada 5 minutos por pestaña. */
  const CAMPOS_CONFIG = ["aviso", "avisoTipo", "avisoEnlace", "avisoTextoEnlace", "avisoHasta", "avisoId", "examenes"];
  function limpiarConfig(d) {
    const cfg = {};
    if (d) CAMPOS_CONFIG.forEach((k) => { if (typeof d[k] === "string" && d[k] !== "") cfg[k] = d[k]; });
    return cfg;
  }
  async function cargarConfig(forzar) {
    const t = App.session("app-config-t");
    if (!forzar && t && Date.now() - t < 300000) return App.config.get();
    App.session("app-config-t", Date.now());
    const d = await docGet("config/web");
    const cfg = limpiarConfig(d);
    App.config.actualizar(cfg);
    return cfg;
  }

  /* ---------------- Acceso a los datos con la sesión activa ----------------
     Lo usan el panel de administración (assets/js/admin.js) y los reportes (assets/js/reportes.js).
     Qué se puede leer o escribir lo deciden las reglas de Firestore (firestore.rules). */
  async function sesionActiva(forzar) {
    const ses = actual();
    if (!ses || !ses.token) throw fallo("Entra con tu cuenta (no con un perfil local).", 401);
    try { return await sesionDe(ses.token, forzar); }
    catch (e) { if (e.status === 401) caducada(ses.id); throw e; }
  }
  /** Documentos de una consulta: [{ _id, _t (última modificación), …campos }] */
  async function consultar(structuredQuery) {
    const s = await sesionActiva();
    const o = json({ structuredQuery }); o.headers.Authorization = "Bearer " + s.t;
    const d = await pedir(DB + ":runQuery", o);
    return (Array.isArray(d) ? d : []).filter((x) => x.document)
      .map((x) => Object.assign({ _id: x.document.name.split("/").pop(), _t: x.document.updateTime }, leer(x.document)));
  }
  /** Un documento ({ _id, _t, …campos }) o null si no existe. */
  async function leerDoc(ruta) {
    const s = await sesionActiva();
    try {
      const d = await pedir(DB + "/" + ruta, { headers: cab(s), cache: "no-store" });
      return Object.assign({ _id: d.name.split("/").pop(), _t: d.updateTime }, leer(d));
    } catch (e) { if (e.status === 404) return null; throw e; }
  }
  async function escribir(writes) { return commit(writes, await sesionActiva()); }
  /** Id aleatorio de 20 caracteres, como los que genera Firestore. */
  function nuevoId() {
    const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", r = new Uint8Array(20);
    crypto.getRandomValues(r);
    return Array.from(r, (x) => abc[x % abc.length]).join("");
  }
  const datos = Object.freeze({ sesion: sesionActiva, consultar, leer: leerDoc, escribir, ruta: (r) => DOC + r, valor: val, semana, nuevoId });

  /* ---------------- Perfiles públicos e insignias (lo lee cualquiera; ver firestore.rules) ---------------- */
  /** Perfil público de una cuenta por su uid o por su nombre de usuario: { uid, nombre, puntos, tests, … } o null. */
  async function perfil(q) {
    if (q.uid) { const u = await docGet("usuarios/" + encodeURIComponent(q.uid)); return u ? Object.assign({ uid: q.uid }, u) : null; }
    const d = await pedir(DB + ":runQuery", json({ structuredQuery: { from: [{ collectionId: "usuarios" }],
      where: { fieldFilter: { field: { fieldPath: "id" }, op: "EQUAL", value: val(correoDe(q.nombre || "")) } }, limit: 1 } }));
    const x = (Array.isArray(d) ? d : []).find((y) => y.document);
    return x ? Object.assign({ uid: x.document.name.split("/").pop() }, leer(x.document)) : null;
  }
  /** Catálogo de insignias (insignias/<id>), ordenado. */
  async function catalogo() {
    const d = await pedir(DB + ":runQuery", json({ structuredQuery: { from: [{ collectionId: "insignias" }] } }));
    return (Array.isArray(d) ? d : []).filter((x) => x.document).map((x) => Object.assign({ id: x.document.name.split("/").pop() }, leer(x.document)))
      .sort((a, b) => (a.orden || 0) - (b.orden || 0) || String(a.nombre).localeCompare(String(b.nombre)));
  }
  /** Retos semanales cerrados (retos/<semana>), del más reciente al más antiguo. */
  async function retos(n) {
    const d = await pedir(DB + ":runQuery", json({ structuredQuery: { from: [{ collectionId: "retos" }], orderBy: [{ field: { fieldPath: "cerrado" }, direction: "DESCENDING" }], limit: n || 4 } }));
    return (Array.isArray(d) ? d : []).filter((x) => x.document).map((x) => Object.assign({ id: x.document.name.split("/").pop() }, leer(x.document)));
  }
  /** Para insignias.js: reclamar una insignia automática (una por escritura; las reglas comprueban que te la has ganado). */
  async function reclamarInsignia(id) {
    const s = await sesionActiva();
    return commit([{ update: { name: DOC + "usuarios/" + s.uid, fields: { insignias: { mapValue: { fields: { [id]: { mapValue: { fields: { n: val(1) } } } } } }, reclamada: val(id) } },
      updateMask: { fieldPaths: ["insignias." + id, "reclamada"] },
      updateTransforms: [{ fieldPath: "insignias." + id + ".f", setToServerValue: "REQUEST_TIME" }], currentDocument: { exists: true } }], s);
  }
  /** Elige las insignias destacadas de tu vitrina (hasta 6, de las que tienes). */
  async function guardarVitrina(ids) {
    const s = await sesionActiva();
    return commit([{ update: { name: DOC + "usuarios/" + s.uid, fields: { vitrina: val(ids.slice(0, 6)) } }, updateMask: { fieldPaths: ["vitrina"] }, currentDocument: { exists: true } }], s);
  }
  /** uid de la cuenta activa (o null). */
  async function miUid() { try { return (await sesionActiva()).uid; } catch (e) { return null; } }

  window.Cuentas = Object.freeze({ servidor, lista, actual, progresoSuelto, registrar, entrar, elegir, crearLocal, salir, olvidar, enviar, sincronizar,
    ranking: (t) => fetchRanking(t, (actual() || {}).token), yo, toast, idDe, puntosDe, fmt, esAdmin, cargarConfig, limpiarConfig, datos,
    perfil, catalogo, retos, reclamarInsignia, guardarVitrina, miUid, posicion: (campo, pts) => posicion(campo, pts).catch(() => null) });

  /* ---------------- En cada página ---------------- */
  function iniciar() {
    cargarConfig().catch(() => {});
    if (!actual()) return;
    esAdmin().catch(() => {});
    traer().catch(() => {});
    enviar();
    setInterval(() => sincronizar(), 20000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") sincronizar(true); });
    window.addEventListener("pagehide", () => sincronizar(true));
    window.addEventListener("online", enviar);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
