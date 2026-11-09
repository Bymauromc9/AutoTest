/*!
 * sw.js — service worker de la web instalable (PWA). Lo registra assets/js/pwa.js.
 *
 *   · Sin conexión: cada página y recurso de la web que se abre se guarda en la caché. Se pide siempre
 *     primero a la red (así se ve siempre lo último publicado) y, si no hay conexión, se sirve lo guardado.
 *     Si una página no está guardada, se enseña offline.html. Las fuentes de Google y las librerías de
 *     CDN (casi nunca cambian) se sirven de la caché y se actualizan en segundo plano.
 *   · Notificaciones push: muestra las que manda api/push.js (avisos del panel de administración) y, al
 *     tocarlas, abre la web (o la pestaña que ya estaba abierta) en el enlace del aviso.
 *
 * Está en la raíz para que su alcance cubra toda la web. Para vaciar las cachés de todos los usuarios,
 * sube VERSION.
 */
"use strict";

const VERSION = "v1";
const CACHE = "web-" + VERSION;           // páginas y recursos propios
const CACHE_EXT = "ext-" + VERSION;       // fuentes y librerías de otros dominios
const BASE = new URL("./", self.location).href;

// Lo mínimo para que la portada funcione sin conexión desde el primer momento.
const PRECARGA = [
  "index.html", "offline.html", "cuenta.html", "manifest.webmanifest",
  "assets/css/base.css", "assets/css/nav.css", "assets/css/hub.css", "assets/css/portal.css", "assets/css/cuentas.css",
  "assets/css/insignias.css", "assets/css/asistente.css", "assets/css/pdf.css", "assets/css/reportes.css", "assets/css/retro.css",
  "assets/js/core.js", "assets/js/portal.js", "assets/js/cuentas.js", "assets/js/acceso.js", "assets/js/estadisticas.js",
  "assets/js/insignias.js", "assets/js/asistente.js", "assets/js/pdf.js", "assets/js/reportes.js", "assets/js/retro.js",
  "assets/js/pwa.js", "assets/img/favicon.svg", "assets/img/icon-192.png", "assets/img/badge-96.png"
];
// Otros dominios que se guardan (el resto, p. ej. Firebase o SageMathCell, va siempre a la red).
const EXTERNOS = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com)\//;
// Lo propio que no se guarda: la API y los PDF (pesan y se descargan aparte).
const NO_GUARDAR = /\/api\/|\.pdf$/i;

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Uno a uno: si falta alguno, no se pierde el resto.
    await Promise.all(PRECARGA.map((p) => c.add(new Request(BASE + p, { cache: "reload" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k !== CACHE_EXT) await caches.delete(k);
    await self.clients.claim();
  })());
});

/** Red primero; si falla, lo guardado. Las páginas sin guardar acaban en offline.html. */
async function redPrimero(req) {
  const c = await caches.open(CACHE);
  try {
    const r = await fetch(req);
    if (r.ok && r.type === "basic") c.put(req, r.clone()).catch(() => {});
    return r;
  } catch (err) {
    const guardada = await c.match(req) || await c.match(req, { ignoreSearch: true });
    if (guardada) return guardada;
    if (req.mode === "navigate") return (await c.match(BASE + "offline.html")) || Response.error();
    throw err;
  }
}

/** Caché primero y actualización en segundo plano (para fuentes y librerías externas). */
async function cacheYActualiza(e) {
  const c = await caches.open(CACHE_EXT);
  const guardada = await c.match(e.request);
  const red = fetch(e.request).then((r) => {
    if (r.ok || r.type === "opaque") c.put(e.request, r.clone()).catch(() => {});
    return r;
  }).catch(() => guardada);
  if (guardada) { e.waitUntil(red); return guardada; }
  return red;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.href.startsWith(BASE)) {
    if (NO_GUARDAR.test(url.pathname)) return;
    e.respondWith(redPrimero(req));
  } else if (EXTERNOS.test(url.href)) {
    e.respondWith(cacheYActualiza(e));
  }
});

/* ---------- Notificaciones push (las envía api/push.js) ---------- */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  const titulo = d.title || "Aviso";
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.body || "",
    icon: BASE + "assets/img/icon-192.png",
    badge: BASE + "assets/img/badge-96.png",
    tag: d.tag || "aviso",               // un aviso nuevo sustituye al anterior en vez de acumularse
    renotify: true,
    lang: "es",
    data: { url: d.url || "" }
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const destino = new URL((e.notification.data && e.notification.data.url) || "index.html", BASE).href;
  e.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Si la web ya está abierta, se usa esa ventana.
    for (const w of abiertas) {
      if (w.url.startsWith(BASE) && "focus" in w) {
        await w.focus();
        if (w.url !== destino && "navigate" in w) { try { await w.navigate(destino); } catch (err) { /* otra pestaña */ } }
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(destino);
  })());
});

// Si el navegador cambia la suscripción (caduca o se renueva), se avisa a las páginas abiertas para que
// la vuelvan a guardar en Firestore (lo hace assets/js/pwa.js al abrirse).
self.addEventListener("pushsubscriptionchange", (e) => {
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((ws) => ws.forEach((w) => w.postMessage({ tipo: "push-renovar" }))));
});
