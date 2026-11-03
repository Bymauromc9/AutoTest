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
        '<div class="ai-head__t"><span class="ai-dot" aria-hidden="true">✦</span><b>Asistente</b><span class="ai-sub">conoce la página que estás viendo</span></div>' +
        '<div class="ai-head__b">' +
          '<button type="button" class="ai-ib" data-a="nuevo" title="Nueva conversación" aria-label="Nueva conversación">⟲</button>' +
          '<button type="button" class="ai-ib" data-a="cerrar" title="Cerrar (Esc)" aria-label="Cerrar el asistente">✕</button>' +
        '</div>' +
      '</header>' +
      '<p class="ai-ctx" aria-live="polite"><span class="ai-ctx__l">Viendo:</span> <span class="ai-ctx__v"></span></p>' +
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
    if (!panel.classList.contains("is-open")) return;
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

  async function comprobarServidor() {
    if (estadoServidor !== null) return;
    if (location.protocol === "file:") {
      estadoServidor = false;
      aviso("El asistente necesita la web publicada en Vercel: abierta desde un archivo local no puede llamar a la IA.", "warn");
      return;
    }
    try {
      const r = await fetch(API, { method: "GET", cache: "no-store" });
      const j = r.ok ? await r.json() : null;
      estadoServidor = !!(j && j.configurado);
      if (j && !j.configurado) aviso("El asistente está instalado pero falta la clave de la IA. Añade <code>ANTHROPIC_API_KEY</code> en Vercel → Settings → Environment Variables y vuelve a desplegar.", "warn");
      if (!j) aviso("No encuentro el servicio del asistente (<code>/api/chat</code>). Comprueba que el proyecto está desplegado en Vercel con la carpeta <code>api</code>.", "warn");
    } catch (e) {
      estadoServidor = false;
      aviso("No se puede conectar con el servicio del asistente ahora mismo.", "warn");
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
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historial.slice(-24).map((m) => ({ role: m.role, content: m.content })),
          context: Object.assign(ctx, { seleccion: sel })
        }),
        signal: enCurso.signal
      });
      if (!r.ok || !r.body) {
        let msg = "No se ha podido obtener respuesta (" + r.status + ").";
        try { const j = await r.json(); if (j.error) msg = j.error; } catch (e) { /* sin JSON */ }
        if (r.status === 404) msg = "No encuentro el servicio del asistente (/api/chat). Hay que desplegar la web en Vercel con la carpeta api.";
        throw new Error(msg);
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let ultimo = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        respuesta += dec.decode(value, { stream: true });
        const ahora = performance.now();
        if (ahora - ultimo > 60) {
          salida.classList.remove("is-typing");
          salida.innerHTML = md(respuesta);
          ultimo = ahora;
          const cerca = log.scrollHeight - log.scrollTop - log.clientHeight < 140;
          if (cerca) log.scrollTop = log.scrollHeight;
        }
      }
      respuesta += dec.decode();
    } catch (e) {
      if (e.name === "AbortError") respuesta += (respuesta ? "\n\n" : "") + "_(Parado.)_";
      else {
        salida.remove();
        historial.pop();
        aviso(esc(e.message || "Error de conexión."), "err");
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
