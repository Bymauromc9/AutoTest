/*!
 * api/_db.js — utilidades comunes de las funciones de cuentas y ranking (no es una ruta: Vercel no
 * publica los ficheros de api/ que empiezan por «_»).
 *
 * Base de datos: Upstash Redis por su API REST (sin dependencias). Al conectar Upstash al proyecto en
 * Vercel (Storage → Upstash → Redis) se crean solas las variables KV_REST_API_URL y KV_REST_API_TOKEN
 * (o UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN, según la versión de la integración).
 *
 * Claves en Redis:
 *   user:<id>        hash  name, salt, hash, created, points, tests
 *   sess:<token>     texto id de usuario (caduca a los 180 días)
 *   prog:<id>        texto JSON { t, data } con el progreso guardado de la cuenta
 *   lb               zset  puntos totales           lb:w:<año>-W<semana>  zset  puntos de la semana
 *   lb:s:<asig>      zset  puntos por asignatura    ev:<id>:<evento>      marca anti-duplicados
 */
"use strict";
const crypto = require("crypto");

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const configurado = () => Boolean(URL_ && TOKEN);

/** Ejecuta varios comandos de Redis en una sola petición; devuelve sus resultados en orden. */
async function redis(...cmds) {
  const r = await fetch(URL_.replace(/\/+$/, "") + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds)
  });
  if (!r.ok) throw new Error("Redis " + r.status);
  const out = await r.json();
  return out.map((x) => { if (x.error) throw new Error(x.error); return x.result; });
}
const hashObj = (arr) => { const o = {}; if (Array.isArray(arr)) for (let i = 0; i < arr.length; i += 2) o[arr[i]] = arr[i + 1]; return o; };

/* ---------- Petición / respuesta ---------- */
function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}
async function leerJSON(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  let raw = "";
  for await (const c of req) { raw += c; if (raw.length > 400000) break; }
  try { return JSON.parse(raw || "{}"); } catch (e) { return {}; }
}
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
const ipDe = (req) => String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();

/* ---------- Contraseñas y sesiones ---------- */
function hashPass(pass, salt) {
  return new Promise((ok, ko) => crypto.scrypt(pass, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? ko(e) : ok(k.toString("hex"))));
}
function igual(a, b) {
  const x = Buffer.from(String(a), "hex"), y = Buffer.from(String(b), "hex");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const nuevoToken = () => crypto.randomBytes(32).toString("base64url");
const SESION_S = 180 * 24 * 3600;

/** Usuario de la sesión (cabecera Authorization: Bearer <token>) o null. */
async function usuarioDe(req) {
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,})$/.exec(req.headers.authorization || "");
  if (!m) return null;
  const [id] = await redis(["GET", "sess:" + m[1]]);
  if (!id) return null;
  return { id, token: m[1] };
}

/* ---------- Nombres de usuario ---------- */
const NOMBRE_RE = /^[\p{L}\p{N}_.-]{3,20}$/u;
const idDe = (nombre) => String(nombre || "").normalize("NFC").trim().toLowerCase();

/* ---------- Semana (para el ranking semanal), en hora de Madrid ---------- */
function semana(d = new Date()) {
  const madrid = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const t = new Date(Date.UTC(madrid.getFullYear(), madrid.getMonth(), madrid.getDate()));
  const dia = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dia);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t - y0) / 86400000 + 1) / 7);
  return t.getUTCFullYear() + "-W" + String(w).padStart(2, "0");
}

const ASIGNATURAS = ["fli", "fc", "ip"];

module.exports = { redis, hashObj, configurado, json, leerJSON, origenValido, ipDe, hashPass, igual, nuevoToken, SESION_S, usuarioDe, NOMBRE_RE, idDe, semana, ASIGNATURAS };
