/*!
 * api/_webpush.js — envío de notificaciones Web Push sin dependencias (lo usa api/push.js).
 *
 * Implementa los dos estándares que hacen falta, con WebCrypto (Node 18+ y navegadores):
 *   · VAPID (RFC 8292): un JWT ES256 firmado con la clave privada de la web identifica al remitente.
 *   · Cifrado del mensaje «aes128gcm» (RFC 8291 + RFC 8188): sólo el navegador suscrito puede leerlo.
 * Al empezar por «_», Vercel no lo publica como ruta: es sólo un módulo.
 *
 * Claves VAPID: dos cadenas base64url (el mismo formato que la librería web-push):
 *   publicKey  = punto P-256 sin comprimir (65 bytes)   privateKey = escalar d (32 bytes)
 */
"use strict";

const webcrypto = globalThis.crypto && globalThis.crypto.subtle ? globalThis.crypto : require("node:crypto").webcrypto;
const subtle = webcrypto.subtle;
const enc = new TextEncoder();

/* ---------- base64url ---------- */
function b64u(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function deB64u(str) {
  const s = String(str).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function unir(...partes) {
  const n = partes.reduce((t, p) => t + p.length, 0), out = new Uint8Array(n);
  let o = 0;
  for (const p of partes) { out.set(p, o); o += p.length; }
  return out;
}

/* ---------- HMAC-SHA256 (para HKDF) ---------- */
async function hmac(clave, datos) {
  const k = await subtle.importKey("raw", clave, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await subtle.sign("HMAC", k, datos));
}

/* ---------- VAPID ---------- */
/** Clave privada de firma a partir de las dos cadenas base64url. */
async function clavePrivada(publicKey, privateKey) {
  const pub = deB64u(publicKey);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error("VAPID_PUBLIC_KEY no es una clave P-256 válida");
  const jwk = { kty: "EC", crv: "P-256", d: privateKey, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true };
  return subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}
/** Cabecera Authorization «vapid t=…, k=…» para el servicio de push del endpoint. */
async function cabeceraVapid(endpoint, vapid) {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 3600;     // 1 h: Apple no admite más; Google y Mozilla, hasta 24 h
  const cab = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const cuerpo = b64u(enc.encode(JSON.stringify({ aud, exp, sub: vapid.subject })));
  const firmado = cab + "." + cuerpo;
  const k = vapid._clave || (vapid._clave = await clavePrivada(vapid.publicKey, vapid.privateKey));
  const firma = new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, enc.encode(firmado)));  // r||s (64 bytes)
  return "vapid t=" + firmado + "." + b64u(firma) + ", k=" + vapid.publicKey;
}

/* ---------- Cifrado aes128gcm (RFC 8291) ---------- */
/**
 * Cifra `texto` para una suscripción { keys: { p256dh, auth } }.
 * Devuelve el cuerpo listo para enviar: salt(16) · rs(4) · idlen(1) · clave pública efímera(65) · datos cifrados.
 * `efimera` y `salt` sólo se pasan en las pruebas (para comprobar contra vectores conocidos).
 */
async function cifrar(texto, sub, efimera, salt) {
  const uaPublic = deB64u(sub.keys.p256dh), authSecret = deB64u(sub.keys.auth);
  if (uaPublic.length !== 65 || authSecret.length < 16) throw new Error("Suscripción con claves no válidas");
  const par = efimera || await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await subtle.exportKey("raw", par.publicKey));
  const uaKey = await subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await subtle.deriveBits({ name: "ECDH", public: uaKey }, par.privateKey, 256));
  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || ua_public || as_public, 32)
  const prkKey = await hmac(authSecret, ecdh);
  const ikm = (await hmac(prkKey, unir(enc.encode("WebPush: info\0"), uaPublic, asPublic, Uint8Array.of(1)))).slice(0, 32);
  // CEK y nonce = HKDF(salt, IKM, …)
  const sal = salt || webcrypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(sal, ikm);
  const cek = (await hmac(prk, unir(enc.encode("Content-Encoding: aes128gcm\0"), Uint8Array.of(1)))).slice(0, 16);
  const nonce = (await hmac(prk, unir(enc.encode("Content-Encoding: nonce\0"), Uint8Array.of(1)))).slice(0, 12);
  // Un solo registro: el texto seguido del delimitador 0x02 (último registro, sin relleno).
  const plano = unir(enc.encode(texto), Uint8Array.of(2));
  const k = await subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const cifrado = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, k, plano));
  const rs = 4096;
  const cabecera = unir(sal, Uint8Array.of(rs >>> 24 & 255, rs >>> 16 & 255, rs >>> 8 & 255, rs & 255), Uint8Array.of(asPublic.length), asPublic);
  return unir(cabecera, cifrado);
}

/**
 * Envía un mensaje a una suscripción { endpoint, keys: { p256dh, auth } }.
 * Devuelve { ok, status, caducada, detalle } — caducada = el servicio dice que ya no existe (404/410): hay que
 * borrarla; detalle = lo que respondió el servicio de push (o el error) cuando falla, para poder diagnosticarlo.
 */
async function enviar(sub, mensaje, vapid, opts) {
  const o = opts || {};
  let cuerpo, autorizacion;
  try {
    cuerpo = await cifrar(typeof mensaje === "string" ? mensaje : JSON.stringify(mensaje), sub);
    autorizacion = await cabeceraVapid(sub.endpoint, vapid);
  } catch (e) { return { ok: false, status: 0, caducada: false, detalle: "Error al preparar el mensaje: " + (e && e.message || e) }; }
  let r;
  try {
    r = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: autorizacion,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(o.ttl || 86400),
        Urgency: o.urgencia || "normal",
        // «Topic» (o.tema) es opcional; Apple (web.push.apple.com) responde 400 BadWebPushTopic, así que no se usa por defecto.
        ...(o.tema ? { Topic: o.tema } : {})
      },
      body: cuerpo
    });
  } catch (e) { return { ok: false, status: 0, caducada: false, detalle: "Sin respuesta del servicio de push: " + (e && (e.cause && e.cause.message || e.message) || e) }; }
  const ok = r.status >= 200 && r.status < 300;
  let detalle = "";
  if (!ok) { try { detalle = (await r.text()).replace(/\s+/g, " ").slice(0, 300); } catch (e) { /* sin cuerpo */ } }
  return { ok, status: r.status, caducada: r.status === 404 || r.status === 410, detalle };
}

module.exports = { enviar, cifrar, cabeceraVapid, b64u, deB64u };
