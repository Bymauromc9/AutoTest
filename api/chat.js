/*!
 * api/chat.js — función de Vercel del asistente de IA.
 *
 * El navegador nunca ve la clave: la página manda la conversación y el contexto de la página que se
 * está viendo, esta función añade las instrucciones del tutor y llama a la API de Anthropic con la
 * clave guardada en la variable de entorno ANTHROPIC_API_KEY. La respuesta vuelve como texto en
 * streaming (se va pintando mientras se escribe).
 *
 * Variables de entorno (Vercel → Project → Settings → Environment Variables):
 *   ANTHROPIC_API_KEY   obligatoria
 *   ASISTENTE_MODEL     opcional (por defecto claude-sonnet-5-5; claude-haiku-5-5 es más barato)
 *   ASISTENTE_ORIGENES  opcional: dominios extra permitidos, separados por comas
 *
 * GET  /api/chat  → { ok, configurado, modelo }  (para que la página sepa si está listo)
 * POST /api/chat  → { messages: [{role, content}], context: {...} }  → texto en streaming
 */
"use strict";

const MODEL = process.env.ASISTENTE_MODEL || "claude-sonnet-5-5";
const MAX_TOKENS = 1600;
const MAX_MENSAJES = 24;           // turnos que se mandan a la API (los más recientes)
const MAX_CHARS_MENSAJE = 6000;
const MAX_CHARS_CONTEXTO = 22000;

/* Límite sencillo por IP (best effort: cada instancia lleva su propia cuenta). */
const VENTANA_MS = 10 * 60 * 1000, MAX_POR_VENTANA = 40;
const uso = new Map();
function permitido(ip) {
  const ahora = Date.now();
  const r = uso.get(ip) || { t: ahora, n: 0 };
  if (ahora - r.t > VENTANA_MS) { r.t = ahora; r.n = 0; }
  r.n++;
  uso.set(ip, r);
  if (uso.size > 5000) uso.clear();
  return r.n <= MAX_POR_VENTANA;
}

/* Sólo se atiende a la propia web (y a los dominios que se añadan a mano). */
function origenValido(req) {
  const origin = req.headers.origin;
  if (!origin) return true;                       // peticiones del mismo origen sin cabecera Origin
  let host;
  try { host = new URL(origin).host; } catch (e) { return false; }
  if (host === req.headers.host || host === req.headers["x-forwarded-host"]) return true;
  if (/^localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$/.test(host)) return true;
  const extra = (process.env.ASISTENTE_ORIGENES || "").split(",").map((s) => s.trim()).filter(Boolean);
  return extra.includes(host);
}

const recorta = (s, n) => { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n) + "\n[…recortado]" : s; };

function instrucciones(ctx) {
  const asignaturas = {
    fli: "Fundamentos Lógicos de la Informática (lógica proposicional L0 y de predicados L1)",
    fc: "Fundamentos de Computadores (representación de la información, circuitos combinacionales, Linux, ensamblador x86-64 y redes)",
    ip: "Introducción a la Programación (notación algorítmica SP de clase y C++ con Geany y g++)",
    gohp: "Gestión de Organizaciones y Habilidades Profesionales (la empresa y su entorno, teorías de la administración, planificación estratégica, organización, producción y punto muerto, marketing, inversión y financiación con VAN y TIR, dirección y motivación, y recursos humanos)",
    amd: "Álgebra y Matemática Discreta (espacios vectoriales, producto escalar, aplicaciones lineales, diagonalización y SVD, aritmética modular y prácticas con SageMath)"
  };
  const asig = asignaturas[ctx.asignatura] || "las asignaturas de 1.º del Grado en Ingeniería Informática";
  return [
    "Eres el asistente de estudio de una web de apuntes de 1.º del Grado en Ingeniería Informática de la Universidad de Murcia.",
    "El estudiante está leyendo una página de " + asig + " y te pregunta porque algo no le ha quedado claro.",
    "",
    "Cómo responder:",
    "- Responde siempre en español, con un tono cercano y claro, como un buen compañero que ya aprobó la asignatura.",
    "- Básate en el contenido de la página que se te da abajo: usa la misma notación, los mismos nombres y los mismos ejemplos que la página, para que el estudiante pueda seguirte mirando las dos cosas a la vez.",
    "- Si te piden explicarlo con otras palabras, cambia de verdad el enfoque: una analogía, un ejemplo nuevo con números pequeños o el razonamiento paso a paso. No repitas el texto de la página.",
    "- Cuando haya una fórmula o un procedimiento, explica de dónde sale y para qué sirve cada parte, y haz una traza o un ejemplo numérico comprobado.",
    "- Si la página tuviera un error, dilo con claridad y explica cuál sería lo correcto.",
    "- Si es un ejercicio y el estudiante sólo quiere una pista, dale una pista y no la solución completa.",
    "- Sé conciso: empieza por la idea clave y desarrolla sólo lo necesario. Usa Markdown sencillo (negrita, listas, `código`, bloques ``` para código o trazas). No uses tablas anchas ni LaTeX: escribe las fórmulas en texto plano (x², √, ≤, →, ∧, ∨, ¬).",
    "- Si la pregunta no tiene nada que ver con el estudio, responde brevemente y reconduce hacia la asignatura.",
    "",
    "<pagina>",
    "Título: " + recorta(ctx.titulo, 200),
    "Dirección: " + recorta(ctx.ruta, 300),
    "Sección que tiene en pantalla: " + recorta(ctx.seccion, 300),
    ctx.indice ? "Índice de la página:\n" + recorta(ctx.indice, 3000) : "",
    "Contenido de la sección visible:",
    recorta(ctx.texto, MAX_CHARS_CONTEXTO),
    "</pagina>",
    ctx.seleccion ? "\n<texto_seleccionado>\n" + recorta(ctx.seleccion, 4000) + "\n</texto_seleccionado>\nEl estudiante ha seleccionado este fragmento: céntrate en él." : ""
  ].join("\n");
}

function leerCuerpo(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string") { try { return Promise.resolve(JSON.parse(req.body)); } catch (e) { return Promise.resolve(null); } }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 200000) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { resolve(null); } });
    req.on("error", () => resolve(null));
  });
}

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;

  if (req.method === "GET") return json(res, 200, { ok: true, configurado: !!key, modelo: MODEL });
  if (req.method !== "POST") return json(res, 405, { error: "Método no permitido" });
  if (!origenValido(req)) return json(res, 403, { error: "Origen no permitido" });
  if (!key) return json(res, 503, { error: "Falta configurar ANTHROPIC_API_KEY en Vercel." });

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  if (!permitido(ip)) return json(res, 429, { error: "Demasiadas preguntas seguidas. Espera unos minutos." });

  const body = await leerCuerpo(req);
  if (!body || !Array.isArray(body.messages)) return json(res, 400, { error: "Petición mal formada" });

  // Limpia la conversación: sólo user/assistant, alternando y empezando por user.
  let mensajes = body.messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: recorta(m.content.trim(), MAX_CHARS_MENSAJE) }))
    .slice(-MAX_MENSAJES);
  while (mensajes.length && mensajes[0].role !== "user") mensajes.shift();
  const limpios = [];
  for (const m of mensajes) {
    if (limpios.length && limpios[limpios.length - 1].role === m.role) limpios[limpios.length - 1].content += "\n\n" + m.content;
    else limpios.push(m);
  }
  if (!limpios.length || limpios[limpios.length - 1].role !== "user") return json(res, 400, { error: "Falta la pregunta" });

  const ctx = body.context && typeof body.context === "object" ? body.context : {};

  let api;
  try {
    api = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: instrucciones(ctx), messages: limpios, stream: true })
    });
  } catch (e) {
    return json(res, 502, { error: "No se pudo contactar con el servicio de IA." });
  }
  if (!api.ok || !api.body) {
    let detalle = "";
    try { detalle = (await api.json()).error?.message || ""; } catch (e) { /* sin detalle */ }
    const status = api.status === 429 ? 429 : 502;
    return json(res, status, { error: api.status === 429 ? "El servicio de IA está saturado; prueba en un momento." : "El servicio de IA ha devuelto un error (" + api.status + ").", detalle });
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Accel-Buffering", "no");

  // Convierte el SSE de Anthropic en texto plano que el navegador va pintando.
  const reader = api.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const evento = buf.slice(0, i); buf = buf.slice(i + 2);
        const linea = evento.split("\n").find((l) => l.startsWith("data:"));
        if (!linea) continue;
        let d; try { d = JSON.parse(linea.slice(5).trim()); } catch (e) { continue; }
        if (d.type === "content_block_delta" && d.delta && d.delta.type === "text_delta") res.write(d.delta.text);
        else if (d.type === "message_delta" && d.delta && d.delta.stop_reason === "max_tokens") res.write("\n\n_(Respuesta cortada por longitud: pídeme que continúe.)_");
        else if (d.type === "error") res.write("\n\n_(Error del servicio de IA: " + (d.error && d.error.message || "desconocido") + ")_");
      }
    }
  } catch (e) {
    res.write("\n\n_(Se ha cortado la conexión con el servicio de IA.)_");
  }
  res.end();
};
