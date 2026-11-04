/*!
 * api/cuenta.js — cuentas de usuario, progreso guardado y puntos del ranking.
 *
 * GET  /api/cuenta                         → { ok, configurado }
 * POST /api/cuenta  { accion, ... }        (las acciones con sesión llevan Authorization: Bearer <token>)
 *   registro   { nombre, pass }            → { token, nombre, puntos, tests }
 *   entrar     { nombre, pass }            → { token, nombre, puntos, tests }
 *   salir                                  → { ok }
 *   yo                                     → { nombre, puntos, tests, posicion }
 *   progreso                               → { t, data }      (progreso guardado en la cuenta)
 *   guardar    { t, data }                 → { ok, t }
 *   puntos     { evento, asig, tipo, aciertos, total }  → { sumados, puntos, tests }
 *
 * Puntos: 10 por acierto, +25 si el test (de 10 preguntas o más) sale perfecto. Se calculan aquí, no en
 * el navegador, con límites (200 preguntas por test, 40 tests por hora) y cada evento cuenta una vez.
 */
"use strict";
const db = require("./_db");
const { redis, hashObj, json } = db;

const MAX_PROGRESO = 300000;            // bytes del JSON del progreso
const MAX_FALLOS = 10, VENTANA_FALLOS_S = 15 * 60;
const MAX_EVENTOS_HORA = 40, MAX_PREGUNTAS = 200;   // «Todas» las preguntas de un tema pueden ser más de 100
const TIPOS = ["autotest", "general", "simulacro", "examen", "equivalencias"];

/* Límite de registros por IP (en memoria: best effort, cada instancia lleva su cuenta). */
const registros = new Map();
function puedeRegistrar(ip) {
  const ahora = Date.now(), r = registros.get(ip) || { t: ahora, n: 0 };
  if (ahora - r.t > 3600000) { r.t = ahora; r.n = 0; }
  r.n++; registros.set(ip, r);
  if (registros.size > 5000) registros.clear();
  return r.n <= 8;
}

async function datosUsuario(id) {
  const [u, pos] = await redis(["HGETALL", "user:" + id], ["ZREVRANK", "lb", id]);
  const o = hashObj(u);
  return { nombre: o.name, puntos: Number(o.points || 0), tests: Number(o.tests || 0), posicion: pos == null ? null : pos + 1 };
}

async function nuevaSesion(id) {
  const token = db.nuevoToken();
  await redis(["SET", "sess:" + token, id, "EX", db.SESION_S]);
  return token;
}

module.exports = async function handler(req, res) {
  if (!db.origenValido(req)) return json(res, 403, { error: "Origen no permitido" });
  if (req.method === "GET") return json(res, 200, { ok: true, configurado: db.configurado() });
  if (req.method !== "POST") return json(res, 405, { error: "Método no permitido" });
  if (!db.configurado()) return json(res, 503, { error: "Las cuentas no están configuradas en el servidor.", configurado: false });

  const body = await db.leerJSON(req);
  const accion = String(body.accion || "");

  try {
    /* ---------- Registro ---------- */
    if (accion === "registro") {
      const nombre = String(body.nombre || "").normalize("NFC").trim(), pass = String(body.pass || "");
      if (!db.NOMBRE_RE.test(nombre)) return json(res, 400, { error: "El usuario debe tener de 3 a 20 letras, números, «_», «.» o «-», sin espacios." });
      if (pass.length < 6 || pass.length > 200) return json(res, 400, { error: "La contraseña debe tener al menos 6 caracteres." });
      if (!puedeRegistrar(db.ipDe(req))) return json(res, 429, { error: "Demasiados registros desde esta conexión. Prueba dentro de un rato." });
      const id = db.idDe(nombre);
      const [creado] = await redis(["HSETNX", "user:" + id, "name", nombre]);
      if (!creado) return json(res, 409, { error: "Ese nombre de usuario ya existe. Elige otro o entra con él." });
      try {
        const salt = require("crypto").randomBytes(16).toString("hex");
        const hash = await db.hashPass(pass, salt);
        await redis(["HSET", "user:" + id, "salt", salt, "hash", hash, "created", Date.now(), "points", 0, "tests", 0]);
      } catch (e) {
        await redis(["DEL", "user:" + id]).catch(() => {});   // que el nombre no quede ocupado a medias
        throw e;
      }
      const token = await nuevaSesion(id);
      return json(res, 200, { token, nombre, puntos: 0, tests: 0 });
    }

    /* ---------- Entrar ---------- */
    if (accion === "entrar") {
      const id = db.idDe(body.nombre), pass = String(body.pass || "");
      if (!id || !pass) return json(res, 400, { error: "Escribe tu usuario y tu contraseña." });
      const [fallos, u] = await redis(["GET", "fail:" + id], ["HGETALL", "user:" + id]);
      if (Number(fallos || 0) >= MAX_FALLOS) return json(res, 429, { error: "Demasiados intentos fallidos. Espera 15 minutos y vuelve a probar." });
      const o = hashObj(u);
      const bien = o.hash && o.salt && db.igual(await db.hashPass(pass, o.salt), o.hash);
      if (!bien) {
        await redis(["INCR", "fail:" + id], ["EXPIRE", "fail:" + id, VENTANA_FALLOS_S]);
        return json(res, 401, { error: "Usuario o contraseña incorrectos." });
      }
      await redis(["DEL", "fail:" + id]);
      const token = await nuevaSesion(id);
      return json(res, 200, { token, nombre: o.name, puntos: Number(o.points || 0), tests: Number(o.tests || 0) });
    }

    /* ---------- Acciones con sesión ---------- */
    const yo = await db.usuarioDe(req);
    if (!yo) return json(res, 401, { error: "La sesión ha caducado. Vuelve a entrar.", sesion: false });

    if (accion === "salir") { await redis(["DEL", "sess:" + yo.token]); return json(res, 200, { ok: true }); }

    if (accion === "yo") return json(res, 200, await datosUsuario(yo.id));

    if (accion === "progreso") {
      const [p] = await redis(["GET", "prog:" + yo.id]);
      let v = null; try { v = p ? JSON.parse(p) : null; } catch (e) { v = null; }
      return json(res, 200, v || { t: 0, data: {} });
    }

    if (accion === "guardar") {
      const data = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : null;
      if (!data) return json(res, 400, { error: "Progreso no válido" });
      const limpio = {};
      for (const [k, v] of Object.entries(data)) if (/^[a-zA-Z0-9_:-]{1,60}$/.test(k) && typeof v === "string") limpio[k] = v;
      const t = Number(body.t) || Date.now();
      const s = JSON.stringify({ t, data: limpio });
      if (s.length > MAX_PROGRESO) return json(res, 413, { error: "El progreso es demasiado grande" });
      await redis(["SET", "prog:" + yo.id, s]);
      return json(res, 200, { ok: true, t });
    }

    if (accion === "puntos") {
      const evento = String(body.evento || ""), asig = String(body.asig || ""), tipo = String(body.tipo || "");
      const total = Math.floor(Number(body.total)), aciertos = Math.floor(Number(body.aciertos));
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(evento) || !db.ASIGNATURAS.includes(asig) || !TIPOS.includes(tipo) ||
          !(total >= 1 && total <= MAX_PREGUNTAS) || !(aciertos >= 0 && aciertos <= total)) {
        return json(res, 400, { error: "Resultado no válido" });
      }
      const hora = "rl:" + yo.id + ":" + Math.floor(Date.now() / 3600000);
      const [nuevo, n] = await redis(["SET", "ev:" + yo.id + ":" + evento, 1, "NX", "EX", 30 * 86400], ["INCR", hora], ["EXPIRE", hora, 3700]);
      if (nuevo !== "OK") { const d = await datosUsuario(yo.id); return json(res, 200, { sumados: 0, repetido: true, ...d }); }
      if (n > MAX_EVENTOS_HORA) { const d = await datosUsuario(yo.id); return json(res, 429, { error: "Has terminado muchos tests en poco tiempo; los puntos de este no se suman.", sumados: 0, ...d }); }
      const pts = aciertos * 10 + (aciertos === total && total >= 10 ? 25 : 0);
      const w = "lb:w:" + db.semana();
      const r = await redis(
        ["HINCRBY", "user:" + yo.id, "points", pts],
        ["HINCRBY", "user:" + yo.id, "tests", 1],
        ["ZINCRBY", "lb", pts, yo.id],
        ["ZINCRBY", w, pts, yo.id], ["EXPIRE", w, 60 * 86400],
        ["ZINCRBY", "lb:s:" + asig, pts, yo.id],
        ["ZREVRANK", "lb", yo.id]
      );
      return json(res, 200, { sumados: pts, puntos: Number(r[0]), tests: Number(r[1]), posicion: r[6] == null ? null : r[6] + 1 });
    }

    return json(res, 400, { error: "Acción desconocida" });
  } catch (e) {
    return json(res, 502, { error: "No se pudo acceder a la base de datos. Prueba en un momento." });
  }
};
