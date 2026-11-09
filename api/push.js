/*!
 * api/push.js — función de Vercel que envía notificaciones push a todos los dispositivos suscritos.
 *
 * La llama el panel de administración al publicar un aviso. No necesita credenciales de Firebase:
 * lee las suscripciones (colección push/ de Firestore) con el token del propio administrador, así que es
 * Firestore, con sus reglas, quien comprueba que quien llama es administrador (sólo ellos pueden leerlas).
 * Las suscripciones que el servicio de push da por caducadas (404/410) se borran.
 *
 * Variables de entorno (Vercel → Project → Settings → Environment Variables):
 *   VAPID_PUBLIC_KEY    obligatoria (base64url, 65 bytes; mismo formato que la librería web-push; ver el README)
 *   VAPID_PRIVATE_KEY   obligatoria (base64url, 32 bytes) — secreta
 *   VAPID_SUBJECT       opcional: contacto para los servicios de push (por defecto mailto:admin@<dominio>)
 *   FIREBASE_PROJECT_ID opcional (por defecto web-ing-inf, el de assets/js/cuentas.js)
 *
 * GET  /api/push  → { ok, configurado, publicKey }   (la página la usa para suscribirse)
 * POST /api/push  → { titulo, texto, url?, tag?, soloMias? } con «Authorization: Bearer <id token de un admin>»
 *                 → { ok, total, enviadas, fallidas, borradas, errores: [{ servicio, status, detalle }] }
 *   soloMias: true  sólo a los dispositivos del administrador que llama (notificación de prueba)
 */
"use strict";

const { enviar } = require("./_webpush.js");

const PROYECTO = process.env.FIREBASE_PROJECT_ID || "web-ing-inf";
const DB = "https://firestore.googleapis.com/v1/projects/" + PROYECTO + "/databases/(default)/documents";
const EN_PARALELO = 20;

/* Sólo se atiende a la propia web (igual que api/chat.js). */
function origenValido(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  let host;
  try { host = new URL(origin).host; } catch (e) { return false; }
  if (host === req.headers.host || host === req.headers["x-forwarded-host"]) return true;
  if (/^localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$/.test(host)) return true;
  const extra = (process.env.ASISTENTE_ORIGENES || "").split(",").map((s) => s.trim()).filter(Boolean);
  return extra.includes(host);
}

function vapid(req) {
  const publicKey = (process.env.VAPID_PUBLIC_KEY || "").trim(), privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
  if (!publicKey || !privateKey) return null;
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost").split(":")[0];
  return { publicKey, privateKey, subject: process.env.VAPID_SUBJECT || "mailto:admin@" + host };
}

/** Claims del token sin verificar la firma: sólo para rechazar pronto a quien no es admin (Firestore lo verifica). */
function claims(token) {
  try { return JSON.parse(Buffer.from(String(token).split(".")[1], "base64url").toString("utf8")); } catch (e) { return {}; }
}

async function leerBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const trozos = [];
  for await (const t of req) trozos.push(t);
  return JSON.parse(Buffer.concat(trozos).toString("utf8") || "{}");
}

/** Todas las suscripciones: [{ id, endpoint, keys: { p256dh, auth } }]. Lanza { status } si Firestore se niega. */
async function suscripciones(token) {
  const out = [];
  let pagina = "";
  do {
    const url = DB + "/push?pageSize=300&mask.fieldPaths=uid&mask.fieldPaths=endpoint&mask.fieldPaths=p256dh&mask.fieldPaths=auth" + (pagina ? "&pageToken=" + encodeURIComponent(pagina) : "");
    const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    if (!r.ok) { const e = new Error("Firestore " + r.status); e.status = r.status; throw e; }
    const d = await r.json();
    for (const doc of d.documents || []) {
      const f = doc.fields || {}, s = (k) => (f[k] && f[k].stringValue) || "";
      if (s("endpoint") && s("p256dh") && s("auth")) out.push({ id: doc.name.split("/").pop(), uid: s("uid"), endpoint: s("endpoint"), keys: { p256dh: s("p256dh"), auth: s("auth") } });
    }
    pagina = d.nextPageToken || "";
  } while (pagina && out.length < 20000);
  return out;
}

const recorta = (s, n) => { s = String(s == null ? "" : s).trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!origenValido(req)) { res.status(403).json({ ok: false, error: "Origen no permitido" }); return; }
  const v = vapid(req);

  if (req.method === "GET") { res.status(200).json({ ok: true, configurado: Boolean(v), publicKey: v ? v.publicKey : null }); return; }
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); res.status(405).json({ ok: false, error: "Método no permitido" }); return; }
  if (!v) { res.status(503).json({ ok: false, error: "Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en Vercel" }); return; }

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token || claims(token).admin !== true) { res.status(403).json({ ok: false, error: "Sólo para administradores" }); return; }

  let b;
  try { b = await leerBody(req); } catch (e) { res.status(400).json({ ok: false, error: "JSON no válido" }); return; }
  const titulo = recorta(b.titulo, 80), texto = recorta(b.texto, 300);
  if (!texto) { res.status(400).json({ ok: false, error: "Falta el texto" }); return; }
  // Sólo enlaces a la propia web (rutas relativas) o https.
  const url = typeof b.url === "string" && /^(https:\/\/|[a-z0-9_./#?=&-]+$)/i.test(b.url) && !/^\/\//.test(b.url) ? b.url.slice(0, 300) : "";
  const mensaje = { title: titulo || "Aviso", body: texto, url, tag: recorta(b.tag || "aviso", 40) };

  let subs;
  try { subs = await suscripciones(token); }
  catch (e) {
    const s = e.status === 401 || e.status === 403 ? 403 : 502;
    res.status(s).json({ ok: false, error: s === 403 ? "Firestore no deja leer las suscripciones (¿eres administrador? ¿están publicadas las reglas?)" : "No se pudo leer Firestore" });
    return;
  }

  // Prueba: sólo los dispositivos de quien llama (su uid va en el token, que Firestore ya ha validado al leer).
  if (b.soloMias === true) { const yo = claims(token).user_id || claims(token).sub; subs = subs.filter((s) => s.uid && s.uid === yo); }

  let enviadas = 0, fallidas = 0;
  const caducadas = [], errores = [];
  for (let i = 0; i < subs.length; i += EN_PARALELO) {
    const lote = subs.slice(i, i + EN_PARALELO);
    const rs = await Promise.all(lote.map((s) => enviar(s, mensaje, v, { ttl: 3 * 86400, tema: "aviso" })
      .catch((e) => ({ ok: false, status: 0, detalle: "Error inesperado: " + (e && e.message || e) }))));
    rs.forEach((r, k) => {
      if (r.ok) { enviadas++; return; }
      fallidas++;
      if (r.caducada) caducadas.push(lote[k].id);
      let servicio = "?";
      try { servicio = new URL(lote[k].endpoint).host; } catch (e) { /* endpoint raro */ }
      if (errores.length < 10) errores.push({ servicio, status: r.status, detalle: r.detalle || "" });
    });
  }
  // Las caducadas se borran (las reglas dejan a los administradores borrar suscripciones).
  let borradas = 0;
  await Promise.all(caducadas.map((id) => fetch(DB + "/push/" + id, { method: "DELETE", headers: { Authorization: "Bearer " + token } })
    .then((r) => { if (r.ok) borradas++; }).catch(() => {})));

  if (errores.length) console.error("push: fallos", JSON.stringify(errores));   // también en los logs de Vercel
  res.status(200).json({ ok: true, total: subs.length, enviadas, fallidas, borradas, errores });
};
