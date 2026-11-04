/*!
 * api/ranking.js — leaderboard global.
 *
 * GET /api/ranking?tabla=total|semana|fli|fc|ip   → { tabla, semana, filas: [{ pos, nombre, puntos, tests }], yo }
 *   Con Authorization: Bearer <token>, «yo» trae la posición y los puntos de quien pregunta en esa tabla
 *   aunque no esté entre los 50 primeros.
 */
"use strict";
const db = require("./_db");
const { redis, json } = db;
const TOP = 50;

module.exports = async function handler(req, res) {
  if (!db.origenValido(req)) return json(res, 403, { error: "Origen no permitido" });
  if (req.method !== "GET") return json(res, 405, { error: "Método no permitido" });
  if (!db.configurado()) return json(res, 503, { error: "El ranking no está configurado en el servidor.", configurado: false });

  const url = new URL(req.url, "http://x");
  const tabla = url.searchParams.get("tabla") || "total";
  const sem = db.semana();
  const clave = tabla === "total" ? "lb" : tabla === "semana" ? "lb:w:" + sem : db.ASIGNATURAS.includes(tabla) ? "lb:s:" + tabla : null;
  if (!clave) return json(res, 400, { error: "Tabla desconocida" });

  try {
    const [top] = await redis(["ZRANGE", clave, 0, TOP - 1, "REV", "WITHSCORES"]);
    const ids = [], pts = [];
    for (let i = 0; i < (top || []).length; i += 2) { ids.push(top[i]); pts.push(Number(top[i + 1])); }
    const datos = ids.length ? await redis(...ids.map((id) => ["HMGET", "user:" + id, "name", "tests"])) : [];
    // Empates: misma puntuación, misma posición.
    let pos = 0, prev = null;
    const filas = ids.map((id, i) => {
      if (pts[i] !== prev) { pos = i + 1; prev = pts[i]; }
      return { pos, id, nombre: (datos[i] && datos[i][0]) || id, puntos: pts[i], tests: Number((datos[i] && datos[i][1]) || 0) };
    }).filter((f) => f.puntos > 0);

    let yo = null;
    const sesion = await db.usuarioDe(req).catch(() => null);
    if (sesion) {
      const [r, s, n] = await redis(["ZREVRANK", clave, sesion.id], ["ZSCORE", clave, sesion.id], ["HGET", "user:" + sesion.id, "name"]);
      const puntos = Number(s || 0);
      let p = null;
      if (r != null && puntos > 0) { const [mas] = await redis(["ZCOUNT", clave, "(" + puntos, "+inf"]); p = Number(mas) + 1; }
      yo = { id: sesion.id, nombre: n, puntos, pos: p };
    }
    res.setHeader("Cache-Control", "no-store");
    return json(res, 200, { tabla, semana: sem, filas: filas.map(({ id, ...f }) => ({ ...f, yo: Boolean(yo && yo.id === id) })), yo: yo && { nombre: yo.nombre, puntos: yo.puntos, pos: yo.pos } });
  } catch (e) {
    return json(res, 502, { error: "No se pudo leer el ranking. Prueba en un momento." });
  }
};
