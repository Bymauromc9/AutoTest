/*!
 * asistente.js — asistente de IA en un panel paralelo a la página.
 *
 * Lo carga core.js en todas las páginas. Añade:
 *   · un botón flotante «Pregunta a la IA» que abre un panel a la derecha (abajo en el móvil),
 *     de modo que la página y el asistente se ven a la vez; el panel se puede redimensionar;
 *   · un botón «Preguntar» que aparece al seleccionar texto de la página;
 *   · atajos («Explícamelo con otras palabras», «Dame un ejemplo»…).
 * Cada pregunta viaja con el contexto de lo que se está viendo: título de la página, la sección
 * que hay en pantalla (incluidas las resoluciones plegadas) y el texto seleccionado, si lo hay.
 * La conversación se guarda en esta pestaña (sessionStorage) y el panel sigue abierto al cambiar
 * de página. La llamada a la IA la hace la función de Vercel /api/chat (la clave no está aquí).
 *
 * Desactivarlo en una página: <body data-ai="off">.  Otro servidor: window.ASISTENTE_API = "https://…/api/chat".
 */
(function () {
  "use strict";
  if (window.__asistente) return;
  window.__asistente = true;

  const API = window.ASISTENTE_API || "/api/chat";
  const KEY_CHAT = "ai-chat-v1", KEY_OPEN = "ai-open", KEY_SIZE = "ai-size";
  const MAX_HISTORIAL = 40;

  const ss = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* ======================= Contexto de la página ======================= */
  const BLOQUE = /^(P|DIV|LI|UL|OL|TR|TABLE|THEAD|TBODY|H1|H2|H3|H4|H5|H6|PRE|SECTION|ARTICLE|DETAILS|SUMMARY|HEADER|FOOTER|FIGURE|FIGCAPTION|BLOCKQUOTE|DL|DT|DD|FORM|FIELDSET|LABEL)$/;
  const SALTAR = /^(SCRIPT|STYLE|NOSCRIPT|SVG|BUTTON|INPUT|SELECT|TEXTAREA|TEMPLATE|IFRAME|CANVAS)$/;

  // Texto de un elemento conservando saltos de línea y celdas, incluido lo que está dentro de
  // <details> cerrados (las resoluciones), que innerText no devuelve.
  function textoDe(el, limite) {
    const partes = [];
    let n = 0;
    (function walk(node) {
      if (n > limite) return;
      if (node.nodeType === 3) { const t = node.nodeValue; partes.push(t); n += t.length; return; }
      if (node.nodeType !== 1) return;
      const tag = node.tagName;
      if (SALTAR.test(tag) || node.classList.contains("ai-ui") || node.getAttribute("aria-hidden") === "true" && tag === "SPAN") return;
      if (tag === "BR") { partes.push("\n"); return; }
      if (tag === "PRE") { partes.push("\n" + node.textContent + "\n"); n += node.textContent.length; return; }
      const bloque = BLOQUE.test(tag);
      if (bloque) partes.push("\n");
      if (tag === "SUMMARY") partes.push("▸ ");
      for (const c of node.childNodes) walk(c);
      if (tag === "TD" || tag === "TH") partes.push(" | ");
      if (bloque) partes.push("\n");
    })(el);
    return partes.join("").replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function principal() { return document.querySelector("main") || document.getElementById("app") || document.body; }

  const CONTENEDORES = "article.card, .qcard, section.topic, section.tema, article, section[id], section";
  function seccionVisible() {
    const main = principal();
    const r = main.getBoundingClientRect();
    // Zona de la página que se ve de verdad (sin el panel encima).
    const abierto = panel && panel.classList.contains("is-open");
    const derecha = Math.min(r.right, window.innerWidth - (abierto && !movil() ? panel.offsetWidth : 0));
    const izquierda = Math.max(r.left, 0);
    const x = Math.round((izquierda + derecha) / 2);
    const altoVisible = abierto && movil() ? window.innerHeight - panel.offsetHeight : window.innerHeight;
    const alturas = [0.3, 0.45, 0.2, 0.6];
    for (const f of alturas) {
      const el = document.elementFromPoint(x, altoVisible * f);
      if (el && main.contains(el) && !el.closest(".ai-ui")) {
        let s = el.closest(CONTENEDORES);
        if (!s || !main.contains(s)) s = main;
        // Si el trozo es muy corto (una tarjeta pequeña), sube un nivel para dar más contexto.
        if (s !== main && textoDe(s, 800).length < 600) {
          const padre = s.parentElement && s.parentElement.closest(CONTENEDORES);
          if (padre && main.contains(padre)) s = padre;
        }
        return s;
      }
    }
    return main;
  }

  function tituloDe(el) {
    if (!el) return "";
    const h = el.matches("article.card") ? el.querySelector(".card-num") : el.querySelector("h1, h2, h3, h4, .card-num, .qhead h2");
    return h ? h.textContent.replace(/\s+/g, " ").trim() : "";
  }

  function indicePagina() {
    const hs = [...principal().querySelectorAll("h1, h2, h3")].slice(0, 80);
    return hs.map((h) => (h.tagName === "H3" ? "  · " : "· ") + h.textContent.replace(/\s+/g, " ").trim()).join("\n");
  }

  function contexto() {
    const s = seccionVisible();
    const main = principal();
    let texto = textoDe(s, 20000);
    // Si la sección es enorme, quédate con la parte que está en pantalla y su alrededor.
    if (texto.length > 18000) texto = texto.slice(0, 18000);
    const sec = tituloDe(s) || (s === main ? "toda la página" : "");
    return {
      titulo: document.title,
      ruta: location.pathname + location.hash,
      asignatura: document.body.dataset.subject || "",
      seccion: sec,
      indice: indicePagina(),
      texto: texto
    };
  }

  /* ======================= Markdown mínimo y seguro ======================= */
  function md(src) {
    const bloques = [];
    src = String(src).replace(/```[a-zA-Z+]*\n?([\s\S]*?)(```|$)/g, (m, code) => {
      bloques.push(code.replace(/\n$/, ""));
      return "\u0000" + (bloques.length - 1) + "\u0000";
    });
    const inline = (t) => esc(t)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, "$1<i>$2</i>")
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<i>$2</i>");
    const out = [];
    let lista = null, parrafo = [];
    const cierraP = () => { if (parrafo.length) { out.push("<p>" + parrafo.map(inline).join("<br>") + "</p>"); parrafo = []; } };
    const cierraL = () => { if (lista) { out.push("</" + lista + ">"); lista = null; } };
    for (const linea of src.split("\n")) {
      const blk = linea.match(/^\u0000(\d+)\u0000$/);
      const h = linea.match(/^(#{1,4})\s+(.*)$/);
      const ul = linea.match(/^\s*[-*•]\s+(.*)$/);
      const ol = linea.match(/^\s*(\d+)[.)]\s+(.*)$/);
      if (blk) { cierraP(); cierraL(); out.push("<pre><code>" + esc(bloques[+blk[1]]) + "</code></pre>"); }
      else if (h) { cierraP(); cierraL(); out.push("<p class=\"ai-h\">" + inline(h[2]) + "</p>"); }
      else if (ul) { cierraP(); if (lista !== "ul") { cierraL(); out.push("<ul>"); lista = "ul"; } out.push("<li>" + inline(ul[1]) + "</li>"); }
      else if (ol) { cierraP(); if (lista !== "ol") { cierraL(); out.push("<ol>"); lista = "ol"; } out.push("<li>" + inline(ol[2]) + "</li>"); }
      else if (!linea.trim()) { cierraP(); cierraL(); }
      else { cierraL(); parrafo.push(linea); }
    }
    cierraP(); cierraL();
    return out.join("").replace(/\u0000(\d+)\u0000/g, (m, i) => "<pre><code>" + esc(bloques[+i]) + "</code></pre>");
  }


  /* ======================= Proveedores de IA =======================
     · «web»: la función /api/chat con la clave de la web (si el dueño la ha configurado).
     · «claude» / «gemini»: la clave de cada estudiante, guardada sólo en su navegador
       (localStorage). La petición va directamente del navegador a Anthropic o a Google:
       no pasa por el servidor de la web y cada uno gasta de su propia cuenta. */
  const KEY_CFG = "ai-config-v1";
  const PROVEEDORES = {
    web: { nombre: "La IA de la web", corto: "IA de la web" },
    claude: { nombre: "Claude (Anthropic) con mi clave", corto: "Claude · tu clave",
      modelos: ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"], url: "https://console.anthropic.com/settings/keys", ej: "sk-ant-…" },
    gemini: { nombre: "Gemini (Google) con mi clave", corto: "Gemini · tu clave",
      modelos: ["gemini-3.8-flash"], url: "https://aistudio.google.com/apikey", ej: "AIza…" }
  };
  function cfg() {
    const c = ls.get(KEY_CFG) || {};
    return { proveedor: PROVEEDORES[c.proveedor] ? c.proveedor : "web", claves: c.claves || {}, modelos: c.modelos || {} };
  }
  const modeloDe = (c, p) => String(c.modelos[p] || PROVEEDORES[p].modelos[0]).trim();

  // Las mismas instrucciones que usa api/chat.js, para cuando se habla directamente con la IA.
  function instrucciones(ctx) {
    const asignaturas = {
      fli: "Fundamentos Lógicos de la Informática (lógica proposicional L0 y de predicados L1)",
      fc: "Fundamentos de Computadores (representación de la información, circuitos combinacionales, Linux, ensamblador x86-64 y redes)",
      ip: "Introducción a la Programación (notación algorítmica SP de clase y C++ con Geany y g++)"
    };
    const recorta = (t, n) => { t = String(t || ""); return t.length > n ? t.slice(0, n) + "\n[…recortado]" : t; };
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
      recorta(ctx.texto, 22000),
      "</pagina>",
      ctx.seleccion ? "\n<texto_seleccionado>\n" + recorta(ctx.seleccion, 4000) + "\n</texto_seleccionado>\nEl estudiante ha seleccionado este fragmento: céntrate en él." : ""
    ].join("\n");
  }

  // Conversación válida para las API: empieza por el usuario y alterna los turnos.
  function limpiar(mensajes) {
    const out = [];
    for (const m of mensajes) {
      if (!m.content || !m.content.trim()) continue;
      if (!out.length && m.role !== "user") continue;
      if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += "\n\n" + m.content;
      else out.push({ role: m.role, content: m.content });
    }
    return out;
  }

  async function* lineas(resp) {
    const reader = resp.body.getReader(), dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.search(/\r?\n/)) >= 0) {
        const l = buf.slice(0, i); buf = buf.slice(buf[i] === "\r" ? i + 2 : i + 1);
        yield l;
      }
    }
    buf += dec.decode();
    if (buf) yield buf;
  }

  async function errorDe(r, quien) {
    let detalle = "";
    try { const j = await r.json(); detalle = (j.error && (j.error.message || j.error)) || j.message || ""; } catch (e) { /* sin JSON */ }
    detalle = String(detalle || "");
    if (quien === "web") {
      if (r.status === 404) return "No encuentro el servicio de la web (/api/chat). Puedes usar tu propia clave de Claude o de Gemini en ⚙ Ajustes.";
      if (r.status === 503) return "La web no tiene configurada su clave de IA. Usa tu propia clave de Claude o de Gemini en ⚙ Ajustes.";
      return detalle || "No se ha podido obtener respuesta (" + r.status + ").";
    }
    const nombre = quien === "claude" ? "Claude" : "Gemini";
    if (r.status === 401 || r.status === 403 || /api[ _-]?key/i.test(detalle)) return "La clave de " + nombre + " no es válida o no tiene permiso. Revísala en ⚙ Ajustes.";
    if (r.status === 429) return "Has llegado al límite de uso de tu clave de " + nombre + " (o se ha quedado sin saldo). Espera un poco o revisa tu cuenta.";
    if (r.status === 404) return "El modelo «" + modeloDe(cfg(), quien) + "» no existe para tu clave de " + nombre + ". Cámbialo en ⚙ Ajustes.";
    return nombre + " ha devuelto un error (" + r.status + ")" + (detalle ? ": " + detalle : ".");
  }

  async function* viaWeb(mensajes, ctx, signal) {
    const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: mensajes, context: ctx }), signal });
    if (!r.ok || !r.body) throw new Error(await errorDe(r, "web"));
    const reader = r.body.getReader(), dec = new TextDecoder();
    for (;;) { const { done, value } = await reader.read(); if (done) break; yield dec.decode(value, { stream: true }); }
  }

  async function* viaClaude(mensajes, ctx, c, signal) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal,
      headers: { "content-type": "application/json", "x-api-key": c.claves.claude.trim(), "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: modeloDe(c, "claude"), max_tokens: 1600, system: instrucciones(ctx), messages: limpiar(mensajes), stream: true })
    });
    if (!r.ok || !r.body) throw new Error(await errorDe(r, "claude"));
    for await (const l of lineas(r)) {
      if (!l.startsWith("data:")) continue;
      let d; try { d = JSON.parse(l.slice(5)); } catch (e) { continue; }
      if (d.type === "content_block_delta" && d.delta && d.delta.type === "text_delta") yield d.delta.text;
      else if (d.type === "message_delta" && d.delta && d.delta.stop_reason === "max_tokens") yield "\n\n_(Respuesta cortada por longitud: pídeme que continúe.)_";
      else if (d.type === "error") throw new Error("Claude: " + (d.error && d.error.message || "error desconocido"));
    }
  }

  async function* viaGemini(mensajes, ctx, c, signal) {
    const modelo = modeloDe(c, "gemini").replace(/^models\//, "");
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(modelo) + ":streamGenerateContent?alt=sse", {
      method: "POST", signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": c.claves.gemini.trim() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instrucciones(ctx) }] },
        contents: limpiar(mensajes).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: 4096 }
      })
    });
    if (!r.ok || !r.body) throw new Error(await errorDe(r, "gemini"));
    for await (const l of lineas(r)) {
      if (!l.startsWith("data:")) continue;
      let d; try { d = JSON.parse(l.slice(5)); } catch (e) { continue; }
      if (d.error) throw new Error("Gemini: " + (d.error.message || "error desconocido"));
      if (d.promptFeedback && d.promptFeedback.blockReason) yield "_(Gemini ha bloqueado la pregunta: " + d.promptFeedback.blockReason + ".)_";
      const cand = d.candidates && d.candidates[0];
      if (!cand) continue;
      const partes = (cand.content && cand.content.parts) || [];
      const t = partes.filter((x) => !x.thought && typeof x.text === "string").map((x) => x.text).join("");
      if (t) yield t;
      if (cand.finishReason === "MAX_TOKENS") yield "\n\n_(Respuesta cortada por longitud: pídeme que continúe.)_";
      else if (cand.finishReason === "SAFETY") yield "\n\n_(Gemini ha cortado la respuesta por sus filtros de seguridad.)_";
    }
  }

  /* ======================= Interfaz ======================= */
  let panel, log, input, enviarBtn, pararBtn, ctxChip, selChip, lanzador, popSel;
  let historial = ss.get(KEY_CHAT) || [];
  let seleccion = "";
  let enCurso = null;
  let estadoServidor = null;   // null = sin comprobar, true / false

  const ATAJOS = [
    ["Explícamelo con otras palabras", "Explícamelo con otras palabras, con un enfoque distinto al de la página."],
    ["Paso a paso", "Explícamelo paso a paso, como si fuera la primera vez que lo veo."],
    ["Un ejemplo", "Ponme un ejemplo nuevo resuelto, con números pequeños, y compruébalo."],
    ["¿De dónde sale la fórmula?", "¿De dónde sale la fórmula o el procedimiento que aparece aquí y para qué sirve cada parte?"],
    ["Errores típicos", "¿Qué errores típicos se cometen con esto y cómo evitarlos?"],
    ["Ponme a prueba", "Hazme una pregunta corta para comprobar si lo he entendido (no me des la respuesta hasta que conteste)."]
  ];

  function crearUI() {
    lanzador = document.createElement("button");
    lanzador.type = "button";
    lanzador.className = "ai-ui ai-launch";
    lanzador.innerHTML = '<span class="ai-launch__i" aria-hidden="true">✦</span><span class="ai-launch__t">Pregunta a la IA</span>';
    lanzador.setAttribute("aria-label", "Abrir el asistente de IA");
    lanzador.addEventListener("click", () => abrir(true));

    panel = document.createElement("aside");
    panel.className = "ai-ui ai-panel";
    panel.setAttribute("aria-label", "Asistente de IA");
    panel.innerHTML =
      '<div class="ai-resize" role="separator" aria-orientation="vertical" aria-label="Cambiar el tamaño del asistente" tabindex="0"></div>' +
      '<header class="ai-head">' +
        '<div class="ai-head__t"><span class="ai-dot" aria-hidden="true">✦</span><b>Asistente</b><span class="ai-sub"></span></div>' +
        '<div class="ai-head__b">' +
          '<button type="button" class="ai-ib" data-a="ajustes" title="Elegir la IA y tu clave" aria-label="Ajustes del asistente" aria-expanded="false">⚙</button>' +
          '<button type="button" class="ai-ib" data-a="nuevo" title="Nueva conversación" aria-label="Nueva conversación">⟲</button>' +
          '<button type="button" class="ai-ib" data-a="cerrar" title="Cerrar (Esc)" aria-label="Cerrar el asistente">✕</button>' +
        '</div>' +
      '</header>' +
      '<p class="ai-ctx" aria-live="polite"><span class="ai-ctx__l">Viendo:</span> <span class="ai-ctx__v"></span></p>' +
      '<div class="ai-cfg" hidden></div>' +
      '<div class="ai-log" role="log" aria-live="polite"></div>' +
      '<div class="ai-quick" role="group" aria-label="Preguntas rápidas"></div>' +
      '<form class="ai-form">' +
        '<div class="ai-sel" hidden><span class="ai-sel__l">Fragmento</span><span class="ai-sel__t"></span><button type="button" class="ai-sel__x" aria-label="Quitar el fragmento">✕</button></div>' +
        '<div class="ai-row">' +
          '<textarea class="ai-in" rows="2" placeholder="¿Qué no entiendes? Pregunta sobre lo que tienes en pantalla…" aria-label="Tu pregunta"></textarea>' +
          '<button type="submit" class="ai-send" aria-label="Enviar">➤</button>' +
          '<button type="button" class="ai-stop" aria-label="Parar" hidden>■</button>' +
        '</div>' +
        '<p class="ai-foot">Selecciona texto de la página para preguntar por él. La IA puede equivocarse: contrástalo con los apuntes.</p>' +
      '</form>';

    log = panel.querySelector(".ai-log");
    input = panel.querySelector(".ai-in");
    enviarBtn = panel.querySelector(".ai-send");
    pararBtn = panel.querySelector(".ai-stop");
    ctxChip = panel.querySelector(".ai-ctx__v");
    selChip = panel.querySelector(".ai-sel");

    const quick = panel.querySelector(".ai-quick");
    ATAJOS.forEach(([t, q]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "ai-chip"; b.textContent = t;
      b.addEventListener("click", () => enviar(q, t));
      quick.appendChild(b);
    });

    panel.querySelector('[data-a="cerrar"]').addEventListener("click", () => cerrar());
    panel.querySelector('[data-a="ajustes"]').addEventListener("click", () => mostrarAjustes(panel.querySelector(".ai-cfg").hidden));
    panel.querySelector('[data-a="nuevo"]').addEventListener("click", () => {
      if (enCurso) enCurso.abort();
      historial = []; ss.set(KEY_CHAT, historial); pintarHistorial();
    });
    panel.querySelector(".ai-sel__x").addEventListener("click", () => fijarSeleccion(""));
    panel.querySelector(".ai-form").addEventListener("submit", (e) => { e.preventDefault(); enviar(input.value); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviar(input.value); }
    });
    input.addEventListener("input", autoAltura);
    pararBtn.addEventListener("click", () => { if (enCurso) enCurso.abort(); });
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); cerrar(); lanzador.focus(); } });

    prepararRedimension(panel.querySelector(".ai-resize"));

    popSel = document.createElement("button");
    popSel.type = "button";
    popSel.className = "ai-ui ai-pop";
    popSel.innerHTML = '<span aria-hidden="true">✦</span> Preguntar a la IA';
    popSel.hidden = true;
    popSel.addEventListener("mousedown", (e) => e.preventDefault());   // no perder la selección
    popSel.addEventListener("click", () => {
      const t = textoSeleccionado();
      popSel.hidden = true;
      if (t) fijarSeleccion(t);
      abrir(true);
    });

    document.body.append(lanzador, panel, popSel);
    pintarHistorial();
    pintarProveedor();
  }

  function autoAltura() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 160) + "px"; }

  /* ---------- abrir / cerrar y tamaño ---------- */
  const movil = () => window.matchMedia("(max-width: 820px)").matches;
  function aplicarTamano() {
    const t = ls.get(KEY_SIZE) || {};
    const w = Math.max(320, Math.min(t.w || 420, Math.round(window.innerWidth * 0.62)));
    const h = Math.max(220, Math.min(t.h || Math.round(window.innerHeight * 0.52), Math.round(window.innerHeight * 0.8)));
    document.documentElement.style.setProperty("--ai-w", w + "px");
    document.documentElement.style.setProperty("--ai-h", h + "px");
  }
  // Al abrir, cerrar o redimensionar el panel la página cambia de ancho y el texto se recoloca:
  // se fija el elemento que estaba arriba de la pantalla y se vuelve a poner en el mismo sitio.
  function conservarPosicion(cambio) {
    // Ancla: el primer bloque de texto pequeño que asoma por arriba de la pantalla.
    let ancla = null, y0 = 0;
    for (const el of principal().querySelectorAll("h1, h2, h3, h4, p, li, pre, tr, summary, .card-head, .qtext")) {
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.bottom > 40) { ancla = el; y0 = r.top; break; }
    }
    // El «scroll anchoring» del navegador también corrige la posición, y los dos ajustes se sumarían.
    const raiz = document.documentElement;
    raiz.style.overflowAnchor = "none"; document.body.style.overflowAnchor = "none";
    cambio();
    if (ancla && window.scrollY > 0) {
      const d = ancla.getBoundingClientRect().top - y0;
      if (Math.abs(d) > 1) window.scrollTo({ top: window.scrollY + d, behavior: "instant" });
    }
    requestAnimationFrame(() => { raiz.style.overflowAnchor = ""; document.body.style.overflowAnchor = ""; });
  }
  function abrir(foco) {
    conservarPosicion(() => { aplicarTamano(); document.documentElement.classList.add("ai-open"); });
    panel.classList.add("is-open");
    lanzador.setAttribute("aria-expanded", "true");
    ss.set(KEY_OPEN, true);
    actualizarContexto();
    comprobarServidor();
    if (foco) setTimeout(() => input.focus({ preventScroll: true }), 30);
  }
  function cerrar() {
    conservarPosicion(() => document.documentElement.classList.remove("ai-open"));
    panel.classList.remove("is-open");
    lanzador.setAttribute("aria-expanded", "false");
    ss.set(KEY_OPEN, false);
  }
  function prepararRedimension(h) {
    let inicio = null;
    const mover = (e) => {
      if (!inicio) return;
      const p = e.touches ? e.touches[0] : e;
      const t = ls.get(KEY_SIZE) || {};
      if (movil()) t.h = Math.round(window.innerHeight - p.clientY);
      else t.w = Math.round(window.innerWidth - p.clientX);
      ls.set(KEY_SIZE, t); conservarPosicion(aplicarTamano);
      e.preventDefault();
    };
    const fin = () => { inicio = null; document.documentElement.classList.remove("ai-resizing"); };
    const empezar = (e) => { inicio = true; document.documentElement.classList.add("ai-resizing"); e.preventDefault(); };
    h.addEventListener("mousedown", empezar);
    h.addEventListener("touchstart", empezar, { passive: false });
    window.addEventListener("mousemove", mover);
    window.addEventListener("touchmove", mover, { passive: false });
    window.addEventListener("mouseup", fin);
    window.addEventListener("touchend", fin);
    h.addEventListener("keydown", (e) => {
      const t = ls.get(KEY_SIZE) || {};
      const paso = e.shiftKey ? 80 : 30;
      if (movil()) {
        if (e.key === "ArrowUp") t.h = (t.h || window.innerHeight * 0.52) + paso;
        else if (e.key === "ArrowDown") t.h = (t.h || window.innerHeight * 0.52) - paso;
        else return;
      } else {
        if (e.key === "ArrowLeft") t.w = (t.w || 420) + paso;
        else if (e.key === "ArrowRight") t.w = (t.w || 420) - paso;
        else return;
      }
      e.preventDefault(); ls.set(KEY_SIZE, t); aplicarTamano();
    });
    window.addEventListener("resize", aplicarTamano);
  }

  /* ---------- contexto visible en la cabecera ---------- */
  let ctxTimer = 0;
  function actualizarContexto() {
    if (!panel || !panel.classList.contains("is-open")) return;   // sin interfaz (data-ai="off")
    const s = seccionVisible();
    const t = tituloDe(s);
    const pagina = (document.body.dataset.title || document.title.split("·")[0]).trim();
    ctxChip.textContent = pagina + (t && t !== pagina ? " › " + t : "");
  }
  window.addEventListener("scroll", () => { clearTimeout(ctxTimer); ctxTimer = setTimeout(actualizarContexto, 150); }, { passive: true });

  /* ---------- selección de texto ---------- */
  function textoSeleccionado() {
    const s = window.getSelection && window.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return "";
    const nodo = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement);
    if (!nodo || nodo.closest(".ai-ui") || !principal().contains(nodo)) return "";
    return s.toString().replace(/\s+\n/g, "\n").trim().slice(0, 4000);
  }
  function fijarSeleccion(t) {
    seleccion = t;
    selChip.hidden = !t;
    selChip.querySelector(".ai-sel__t").textContent = t.length > 160 ? t.slice(0, 160) + "…" : t;
    input.placeholder = t ? "¿Qué no entiendes de este fragmento?" : "¿Qué no entiendes? Pregunta sobre lo que tienes en pantalla…";
  }
  function mostrarPop() {
    if (!popSel) return;                         // sin interfaz (página con data-ai="off")
    const t = textoSeleccionado();
    if (!t || t.length < 2) { popSel.hidden = true; return; }
    const r = window.getSelection().getRangeAt(0).getBoundingClientRect();
    if (!r || (!r.width && !r.height) || r.bottom < 0 || r.top > window.innerHeight) { popSel.hidden = true; return; }
    popSel.hidden = false;
    const w = popSel.offsetWidth || 170;
    const x = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
    const y = r.bottom + 8 + 40 < window.innerHeight ? r.bottom + 8 : Math.max(8, r.top - 44);
    popSel.style.left = x + "px";
    popSel.style.top = y + "px";
  }
  let selTimer = 0;
  document.addEventListener("selectionchange", () => { clearTimeout(selTimer); selTimer = setTimeout(mostrarPop, 220); });
  window.addEventListener("scroll", () => { clearTimeout(selTimer); selTimer = setTimeout(mostrarPop, 120); }, { passive: true });

  /* ---------- mensajes ---------- */
  function pintarHistorial() {
    log.innerHTML = "";
    if (!historial.length) {
      const b = document.createElement("div");
      b.className = "ai-hello";
      b.innerHTML = "<p><b>Hola.</b> Pregúntame lo que no entiendas de esta página: te lo explico de otra manera, con un ejemplo o paso a paso.</p>" +
        "<p>Uso lo que tienes en pantalla como contexto. Si seleccionas un trozo del texto, me centro en él.</p>";
      log.appendChild(b);
    }
    historial.forEach((m) => burbuja(m.role, m.content, m.meta));
    log.scrollTop = log.scrollHeight;
  }
  function burbuja(role, content, meta) {
    const d = document.createElement("div");
    d.className = "ai-msg ai-msg--" + (role === "user" ? "u" : "a");
    if (role === "user") {
      d.innerHTML = (meta && meta.sel ? '<blockquote class="ai-q">' + esc(meta.sel.length > 220 ? meta.sel.slice(0, 220) + "…" : meta.sel) + "</blockquote>" : "") +
        "<p>" + esc(meta && meta.visible || content).replace(/\n/g, "<br>") + "</p>" +
        (meta && meta.donde ? '<span class="ai-where">' + esc(meta.donde) + "</span>" : "");
    } else {
      d.innerHTML = md(content);
    }
    const hola = log.querySelector(".ai-hello");
    if (hola) hola.remove();
    log.appendChild(d);
    return d;
  }
  function aviso(html, tipo) {
    const d = document.createElement("div");
    d.className = "ai-msg ai-msg--n" + (tipo ? " is-" + tipo : "");
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }


  /* ---------- ajustes: qué IA usar y la clave de cada uno ---------- */
  function pintarProveedor() {
    const c = cfg();
    const sub = panel.querySelector(".ai-sub");
    sub.textContent = PROVEEDORES[c.proveedor].corto + (c.proveedor !== "web" ? " · " + modeloDe(c, c.proveedor) : "");
  }
  function mostrarAjustes(si) {
    const box = panel.querySelector(".ai-cfg");
    const btn = panel.querySelector('[data-a="ajustes"]');
    btn.setAttribute("aria-expanded", si ? "true" : "false");
    box.hidden = !si;
    log.hidden = si;
    panel.querySelector(".ai-quick").hidden = si;
    panel.querySelector(".ai-form").hidden = si;
    if (!si) { pintarProveedor(); return; }
    const c = cfg();
    const fila = (p) => {
      const P = PROVEEDORES[p];
      if (p === "web") return '<label class="ai-opt"><input type="radio" name="ai-prov" value="web"' + (c.proveedor === "web" ? " checked" : "") + '><span><b>' + P.nombre + '</b><small>Sin configurar nada, si el dueño de la web ha puesto su clave.</small></span></label>';
      return '<label class="ai-opt"><input type="radio" name="ai-prov" value="' + p + '"' + (c.proveedor === p ? " checked" : "") + '><span><b>' + P.nombre + '</b><small>Gastas de tu cuenta. <a href="' + P.url + '" target="_blank" rel="noopener">Consigue una clave ↗</a></small></span></label>' +
        '<div class="ai-keys" data-p="' + p + '">' +
          '<label>Clave<input type="password" autocomplete="off" spellcheck="false" data-k="' + p + '" placeholder="' + P.ej + '" value="' + esc(c.claves[p] || "") + '"></label>' +
          '<label>Modelo<input type="text" list="ai-mod-' + p + '" spellcheck="false" data-m="' + p + '" value="' + esc(modeloDe(c, p)) + '"></label>' +
          '<datalist id="ai-mod-' + p + '">' + P.modelos.map((m) => '<option value="' + m + '">').join("") + '</datalist>' +
        '</div>';
    };
    box.innerHTML =
      '<p class="ai-cfg__t">¿Qué IA quieres usar?</p>' +
      '<div class="ai-opts">' + ["web", "claude", "gemini"].map(fila).join("") + '</div>' +
      '<p class="ai-cfg__n">Tu clave se guarda <b>sólo en este navegador</b> y se envía directamente a Anthropic o a Google; no pasa por el servidor de la web. No la guardes en un ordenador compartido.</p>' +
      '<div class="ai-cfg__b"><button type="button" class="ai-btn" data-c="guardar">Guardar</button><button type="button" class="ai-btn ai-btn--g" data-c="probar">Probar</button><button type="button" class="ai-btn ai-btn--g" data-c="borrar">Borrar mis claves</button></div>' +
      '<p class="ai-cfg__s" aria-live="polite"></p>';
    const estado = box.querySelector(".ai-cfg__s");
    const leer = () => {
      const n = cfg();
      const sel = box.querySelector('input[name="ai-prov"]:checked');
      n.proveedor = sel ? sel.value : "web";
      box.querySelectorAll("[data-k]").forEach((i) => { n.claves[i.dataset.k] = i.value.trim(); });
      box.querySelectorAll("[data-m]").forEach((i) => { n.modelos[i.dataset.m] = i.value.trim() || PROVEEDORES[i.dataset.m].modelos[0]; });
      return n;
    };
    const marcar = () => box.querySelectorAll(".ai-keys").forEach((k) => {
      k.classList.toggle("is-on", (box.querySelector('input[name="ai-prov"]:checked') || {}).value === k.dataset.p);
    });
    box.querySelectorAll('input[name="ai-prov"]').forEach((r) => r.addEventListener("change", marcar));
    marcar();
    box.querySelector('[data-c="guardar"]').addEventListener("click", () => {
      const n = leer();
      if (n.proveedor !== "web" && !n.claves[n.proveedor]) { estado.textContent = "Pega tu clave de " + (n.proveedor === "claude" ? "Claude" : "Gemini") + " para usarla."; return; }
      ls.set(KEY_CFG, n);
      mostrarAjustes(false);
      aviso("Listo: ahora respondo con <b>" + esc(PROVEEDORES[n.proveedor].corto) + "</b>" + (n.proveedor !== "web" ? " (" + esc(modeloDe(n, n.proveedor)) + ")" : "") + ".");
    });
    box.querySelector('[data-c="borrar"]').addEventListener("click", () => {
      ls.set(KEY_CFG, { proveedor: "web", claves: {}, modelos: cfg().modelos });
      estado.textContent = "Claves borradas de este navegador.";
      mostrarAjustes(true);
      box.querySelector(".ai-cfg__s").textContent = "Claves borradas de este navegador.";
    });
    box.querySelector('[data-c="probar"]').addEventListener("click", async () => {
      const n = leer();
      if (n.proveedor === "web") {
        estado.textContent = "Comprobando la IA de la web…";
        try { const r = await fetch(API, { cache: "no-store" }); const j = r.ok ? await r.json() : null;
          estado.textContent = j && j.configurado ? "✓ La IA de la web está disponible." : "✗ La web no tiene configurada su clave: usa la tuya.";
        } catch (e) { estado.textContent = "✗ No se puede conectar con la IA de la web."; }
        return;
      }
      if (!n.claves[n.proveedor]) { estado.textContent = "Primero pega tu clave."; return; }
      estado.textContent = "Probando la clave…";
      try {
        const gen = (n.proveedor === "claude" ? viaClaude : viaGemini)([{ role: "user", content: "Responde sólo: OK" }], { titulo: "Prueba" }, n);
        let t = ""; for await (const x of gen) { t += x; if (t.length > 20) break; }
        estado.textContent = "✓ Funciona (" + modeloDe(n, n.proveedor) + "). Pulsa Guardar.";
      } catch (e) { estado.textContent = "✗ " + (e.message || "No ha funcionado."); }
    });
    const primero = box.querySelector('input[name="ai-prov"]:checked');
    if (primero) primero.focus();
  }

  async function comprobarServidor() {
    if (estadoServidor !== null || cfg().proveedor !== "web") return;
    const boton = ' <button type="button" class="ai-btn ai-btn--s" data-ir="ajustes">Usar mi clave de Claude o Gemini</button>';
    const sinIA = (texto) => {
      aviso(texto + boton, "warn");
      const b = log.querySelector('.ai-msg--n:last-child [data-ir="ajustes"]');
      if (b) b.addEventListener("click", () => mostrarAjustes(true));
    };
    if (location.protocol === "file:") {
      estadoServidor = false;
      sinIA("Abierta desde un archivo, la web no tiene su propia IA. Puedes usar tu clave:");
      return;
    }
    try {
      const r = await fetch(API, { method: "GET", cache: "no-store" });
      const j = r.ok ? await r.json() : null;
      estadoServidor = !!(j && j.configurado);
      if (!estadoServidor) sinIA("La web no tiene configurada su propia IA. Para usar el asistente, pon tu clave (cada uno gasta de la suya):");
    } catch (e) {
      estadoServidor = false;
      sinIA("No se puede conectar con la IA de la web.");
    }
  }

  async function enviar(texto, etiqueta) {
    texto = String(texto || "").trim();
    if (!texto || enCurso) return;
    const ctx = contexto();
    const sel = seleccion;
    const contenido = (sel ? "Sobre este fragmento de la página:\n«" + sel.slice(0, 1500) + "»\n\n" : "") + texto;
    const donde = (ctx.seccion ? ctx.seccion : ctx.titulo).slice(0, 90);
    const meta = { visible: etiqueta || texto, sel: sel, donde: "En: " + donde };
    historial.push({ role: "user", content: contenido, meta: meta });
    burbuja("user", contenido, meta);
    input.value = ""; autoAltura();
    fijarSeleccion("");
    const salida = burbuja("assistant", "");
    salida.classList.add("is-typing");
    salida.innerHTML = '<span class="ai-typing" aria-label="Escribiendo"><i></i><i></i><i></i></span>';
    log.scrollTop = log.scrollHeight;

    enCurso = new AbortController();
    enviarBtn.hidden = true; pararBtn.hidden = false;
    let respuesta = "";
    try {
      const c = cfg();
      const mensajes = historial.slice(-24).map((m) => ({ role: m.role, content: m.content }));
      const ctxCompleto = Object.assign(ctx, { seleccion: sel });
      let flujo;
      if (c.proveedor === "web") flujo = viaWeb(mensajes, ctxCompleto, enCurso.signal);
      else if (!c.claves[c.proveedor]) throw new Error("Falta tu clave de " + (c.proveedor === "claude" ? "Claude" : "Gemini") + ": ponla en ⚙ Ajustes.");
      else flujo = (c.proveedor === "claude" ? viaClaude : viaGemini)(mensajes, ctxCompleto, c, enCurso.signal);
      let ultimo = 0;
      for await (const trozo of flujo) {
        respuesta += trozo;
        const ahora = performance.now();
        if (ahora - ultimo > 60) {
          salida.classList.remove("is-typing");
          salida.innerHTML = md(respuesta);
          ultimo = ahora;
          const cerca = log.scrollHeight - log.scrollTop - log.clientHeight < 140;
          if (cerca) log.scrollTop = log.scrollHeight;
        }
      }
    } catch (e) {
      if (e.name === "AbortError") respuesta += (respuesta ? "\n\n" : "") + "_(Parado.)_";
      else {
        salida.remove();
        historial.pop();
        aviso(esc(e.message || "Error de conexión."), "err");
        if (/Ajustes/.test(e.message || "")) {
          const b = document.createElement("button"); b.type = "button"; b.className = "ai-btn ai-btn--s"; b.textContent = "Abrir ajustes";
          b.addEventListener("click", () => mostrarAjustes(true)); log.lastElementChild.appendChild(b);
        }
        input.value = texto; autoAltura();
        respuesta = null;
      }
    } finally {
      enCurso = null;
      enviarBtn.hidden = false; pararBtn.hidden = true;
    }
    if (respuesta !== null) {
      salida.classList.remove("is-typing");
      salida.innerHTML = md(respuesta || "_(Sin respuesta.)_");
      historial.push({ role: "assistant", content: respuesta });
      if (historial.length > MAX_HISTORIAL) historial = historial.slice(-MAX_HISTORIAL);
      ss.set(KEY_CHAT, historial);
    }
  }

  /* ======================= Arranque ======================= */
  function iniciar() {
    if (document.body.dataset.ai === "off") return;
    crearUI();
    if (ss.get(KEY_OPEN)) abrir(false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
