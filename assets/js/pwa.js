/*!
 * pwa.js — web instalable y notificaciones push (lo carga core.js en todas las páginas).
 *
 *   · Registra el service worker (sw.js, en la raíz): páginas guardadas para usar sin conexión y
 *     notificaciones. No hace nada abriendo los ficheros con doble clic (file://), donde no existen.
 *   · Instalar: guarda el aviso «beforeinstallprompt» del navegador para poder ofrecer un botón
 *     «Instalar la app» (en «Tu cuenta»). En iOS no existe: allí se explica cómo añadirla a la pantalla de inicio.
 *   · Notificaciones: suscribe este dispositivo al servicio de push del navegador con la clave pública de
 *     api/push.js y guarda la suscripción en Firestore (push/<huella del endpoint>, ver firestore.rules).
 *     Cuando un administrador publica un aviso, api/push.js la usa para mandar la notificación.
 *
 * window.Pwa: soporte(), instalada(), puedeInstalar(), instalar(), esIOS(),
 *             push.estado() → "no-soportado" | "configurar" | "instalar-ios" | "denegado" | "activo" | "inactivo",
 *             push.activar(), push.desactivar()
 * Eventos en window: «pwa:instalable» (cambió si se puede instalar), «pwa:push» (cambió el estado).
 * localStorage: app-push (huella de la suscripción de este dispositivo, si está activa)
 */
(function () {
  "use strict";
  if (window.Pwa || !window.App) return;
  const App = window.App;
  const ROOT = App.ROOT || "";
  const CLAVE = "app-push";
  const soporteSW = "serviceWorker" in navigator && /^https?:$/.test(location.protocol) && (window.isSecureContext !== false);
  const soportePush = soporteSW && "PushManager" in window && "Notification" in window;
  const esIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const instalada = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  const avisar = (n) => window.dispatchEvent(new Event(n));

  /* ---------- Service worker ---------- */
  let registro = null;
  const listo = soporteSW && ROOT
    ? navigator.serviceWorker.register(ROOT + "sw.js", { scope: ROOT }).then((r) => (registro = r)).catch(() => null)
    : Promise.resolve(null);

  /* ---------- Instalar ---------- */
  let aviso = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); aviso = e; avisar("pwa:instalable"); });
  window.addEventListener("appinstalled", () => { aviso = null; avisar("pwa:instalable"); });
  async function instalar() {
    if (!aviso) return false;
    aviso.prompt();
    const r = await aviso.userChoice.catch(() => ({}));
    aviso = null; avisar("pwa:instalable");
    return r.outcome === "accepted";
  }

  /* ---------- Push ---------- */
  let publica;                                     // clave pública VAPID (de api/push.js); null = sin configurar
  async function clavePublica() {
    if (publica !== undefined) return publica;
    try {
      const r = await fetch(ROOT + "api/push", { cache: "no-store" });
      const d = r.ok ? await r.json() : {};
      publica = d.configurado && d.publicKey ? d.publicKey : null;
    } catch (e) { publica = null; }
    return publica;
  }
  const deB64u = (s) => { s = s.replace(/-/g, "+").replace(/_/g, "/"); const b = atob(s + "===".slice((s.length + 3) % 4)); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
  const aB64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  /** Id del documento: los primeros 40 caracteres hex del SHA-256 del endpoint (el mismo dispositivo, el mismo id). */
  async function huella(endpoint) {
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
    return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
  }
  const cuentas = () => window.Cuentas && window.Cuentas.datos;
  async function guardar(sub) {
    const D = cuentas();
    if (!D) throw new Error("Las cuentas aún no están listas. Prueba en un momento.");
    const s = await D.sesion();
    const j = sub.toJSON(), id = await huella(j.endpoint);
    await D.escribir([{
      update: { name: D.ruta("push/" + id), fields: { uid: D.valor(s.uid), endpoint: D.valor(j.endpoint), p256dh: D.valor(j.keys.p256dh), auth: D.valor(j.keys.auth) } },
      updateTransforms: [{ fieldPath: "creado", setToServerValue: "REQUEST_TIME" }]
    }]);
    App.store(CLAVE, id);
    return id;
  }
  async function borrar(id) {
    const D = cuentas();
    if (!D || !id) return;
    try { await D.escribir([{ delete: D.ruta("push/" + id) }]); } catch (e) { /* ya no existía o sin sesión */ }
  }
  async function suscripcion() { const r = await listo; return r && r.pushManager ? r.pushManager.getSubscription() : null; }

  async function estado() {
    if (!soportePush) return esIOS() && !instalada() ? "instalar-ios" : "no-soportado";
    if (!(await clavePublica())) return "configurar";
    if (Notification.permission === "denied") return "denegado";
    const sub = await suscripcion().catch(() => null);
    return sub && App.store(CLAVE) ? "activo" : "inactivo";
  }
  async function activar() {
    if (!soportePush) throw new Error(esIOS() ? "En iPhone y iPad, primero añade la web a la pantalla de inicio y ábrela desde allí." : "Este navegador no admite notificaciones.");
    const clave = await clavePublica();
    if (!clave) throw new Error("Las notificaciones aún no están configuradas en el servidor.");
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") { avisar("pwa:push"); throw new Error(permiso === "denied" ? "Has bloqueado las notificaciones. Actívalas en los ajustes del navegador para esta web." : "No se ha dado permiso para las notificaciones."); }
    const r = await listo;
    if (!r) throw new Error("No se pudo preparar el servicio de notificaciones.");
    await navigator.serviceWorker.ready;
    let sub = await r.pushManager.getSubscription();
    // Si la suscripción es de otra clave (se cambiaron las claves VAPID), se rehace.
    if (sub && sub.options && sub.options.applicationServerKey && aB64u(sub.options.applicationServerKey) !== clave) { await sub.unsubscribe(); sub = null; }
    if (!sub) sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deB64u(clave) });
    await guardar(sub);
    avisar("pwa:push");
  }
  async function desactivar() {
    const sub = await suscripcion().catch(() => null);
    const id = App.store(CLAVE) || (sub ? await huella(sub.endpoint) : null);
    if (sub) await sub.unsubscribe().catch(() => {});
    await borrar(id);
    App.store(CLAVE, null);
    avisar("pwa:push");
  }

  // Si está activa, al abrir la web se vuelve a guardar (por si cambió la cuenta o el navegador renovó la suscripción).
  async function revisar() {
    if (!soportePush || !App.store(CLAVE) || Notification.permission !== "granted") return;
    const sub = await suscripcion().catch(() => null);
    if (!sub) { App.store(CLAVE, null); return; }
    const ultimo = App.store("app-push-rev") || 0;
    if (Date.now() - ultimo < 864e5) return;                    // como mucho una vez al día
    const esperar = (n) => (cuentas() ? Promise.resolve() : n > 0 ? new Promise((ok) => setTimeout(ok, 300)).then(() => esperar(n - 1)) : Promise.reject());
    try { await esperar(30); await guardar(sub); App.store("app-push-rev", Date.now()); } catch (e) { /* se reintenta otro día */ }
  }
  if (soportePush) {
    navigator.serviceWorker.addEventListener("message", (e) => { if (e.data && e.data.tipo === "push-renovar") { App.store("app-push-rev", 0); revisar(); } });
    setTimeout(revisar, 4000);
  }

  window.Pwa = Object.freeze({
    soporte: () => soporteSW, instalada, puedeInstalar: () => Boolean(aviso), instalar, esIOS,
    push: Object.freeze({ estado, activar, desactivar })
  });
})();
