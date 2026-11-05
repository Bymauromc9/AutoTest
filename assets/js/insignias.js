/*!
 * insignias.js — insignias de la web (lo carga core.js en todas las páginas).
 *
 *   · Catálogo: insignias/<id> en Firestore (lo crea y edita un administrador en admin.html#insignias).
 *     Cada una: nombre, desc, icono (emoji), forma, color, rareza y tipo:
 *       manual  la da un administrador (retos semanales, cazaerratas…)
 *       auto    se gana sola al llegar a un umbral de un campo de la cuenta (puntos, tests o puntos de una
 *               asignatura): la web la reclama y las reglas de Firestore comprueban que se la ha ganado.
 *   · Las de cada cuenta están en usuarios/<uid>.insignias = { <id>: { f: fecha, n: veces, m?: motivo } } y las
 *     destacadas de su vitrina en usuarios/<uid>.vitrina (hasta 6). Todo es público: se ve en perfil.html.
 *
 *   Insignias.svg(def)              dibujo de una insignia (SVG en línea)
 *   Insignias.html(def, opciones)   insignia con su nombre: { tam: "sm"|"md"|"lg", bloqueada, n, f, m, pie }
 *   Insignias.mini(def)             icono pequeño (para el ranking)
 *   Insignias.catalogo(forzar)      catálogo (caché de 5 minutos en la pestaña)
 *   Insignias.revisar(forzar)       reclama las automáticas que la cuenta activa ya se ha ganado
 *   Insignias.FORMAS, COLORES, RAREZAS, CAMPOS   valores admitidos (los mismos que firestore.rules)
 * Requiere: assets/js/core.js y, para el catálogo y reclamar, assets/js/cuentas.js.
 */
(function () {
  "use strict";
  if (window.Insignias || !window.App) return;
  const { esc, session, sesion } = window.App;

  const FORMAS = { escudo: "Escudo", hexagono: "Hexágono", circulo: "Círculo", estrella: "Sello", medalla: "Medalla con cinta", rombo: "Rombo" };
  const COLORES = {
    bronce: { n: "Bronce", c: ["#FBE0C3", "#D3955D", "#8A5229", "#5E3416"] },
    plata: { n: "Plata", c: ["#FFFFFF", "#C9D1DA", "#7F8A97", "#4C5561"] },
    oro: { n: "Oro", c: ["#FFF6C2", "#F5C531", "#B47D06", "#7A5200"] },
    esmeralda: { n: "Esmeralda", c: ["#CFFBE1", "#34C77A", "#137042", "#0A4227"] },
    zafiro: { n: "Zafiro", c: ["#D3E4FF", "#4483F0", "#1A4396", "#0E275C"] },
    rubi: { n: "Rubí", c: ["#FFD3D9", "#E8445A", "#931428", "#5C0A17"] },
    amatista: { n: "Amatista", c: ["#F0DEFF", "#A66CF0", "#5A2899", "#371660"] },
    noche: { n: "Noche", c: ["#8C9BB2", "#3A4659", "#151C27", "#06090E"] },
    arcoiris: { n: "Arcoíris", c: ["#FFFFFF", "#F5C531", "#7A3FD1", "#24124A"] }
  };
  const RAREZAS = { comun: "Común", rara: "Rara", epica: "Épica", legendaria: "Legendaria" };
  const CAMPOS = { puntos: "puntos totales", tests: "tests terminados", fli: "puntos de FLI", fc: "puntos de FC", ip: "puntos de IP", gohp: "puntos de GOHP" };
  const ORDEN_RAREZA = { legendaria: 0, epica: 1, rara: 2, comun: 3 };

  /* ---------------- Dibujo ---------------- */
  let seq = 0;
  function poligono(n, r1, r2, cx, cy, giro) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (Math.PI / n) * i + (giro || 0), r = i % 2 ? r2 : r1;
      pts.push((cx + r * Math.sin(a)).toFixed(2) + "," + (cy - r * Math.cos(a)).toFixed(2));
    }
    return pts.join(" ");
  }
  /** Contorno de la forma (escala 1 = exterior; 0.84 = cara interior), centrado en 50,54. */
  function forma(f, k) {
    const cx = 50, cy = 54;
    const T = (x, y) => (cx + (x - cx) * k).toFixed(2) + "," + (cy + (y - cy) * k).toFixed(2);
    switch (f) {
      case "hexagono": return `<polygon points="${[[50, 6], [92, 30], [92, 78], [50, 102], [8, 78], [8, 30]].map((p) => T(p[0], p[1])).join(" ")}"/>`;
      case "circulo": return `<circle cx="${cx}" cy="${cy}" r="${(46 * k).toFixed(2)}"/>`;
      case "estrella": return `<polygon points="${poligono(14, 48 * k, 41 * k, cx, cy)}"/>`;
      case "rombo": return `<polygon points="${[[50, 4], [96, 54], [50, 104], [4, 54]].map((p) => T(p[0], p[1])).join(" ")}"/>`;
      case "medalla": return `<circle cx="${cx}" cy="${cy + 6}" r="${(40 * k).toFixed(2)}"/>`;
      default: { // escudo
        const P = (x, y) => T(x, y).replace(",", " ");
        return `<path d="M${P(50, 4)} L${P(92, 17)} L${P(92, 50)} C${P(92, 77)} ${P(73, 95)} ${P(50, 105)} C${P(27, 95)} ${P(8, 77)} ${P(8, 50)} L${P(8, 17)} Z"/>`;
      }
    }
  }
  /** SVG de una insignia. def: { icono, forma, color, rareza }. */
  function svg(def, op) {
    op = op || {};
    const id = "ins" + (++seq), col = (COLORES[def.color] || COLORES.oro).c, f = FORMAS[def.forma] ? def.forma : "escudo";
    const rar = RAREZAS[def.rareza] ? def.rareza : "comun";
    const arco = def.color === "arcoiris";
    const grad = arco
      ? `<linearGradient id="${id}o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF5F6D"/><stop offset=".25" stop-color="#FFC371"/><stop offset=".5" stop-color="#47E891"/><stop offset=".75" stop-color="#3FA9F5"/><stop offset="1" stop-color="#A66CF0"/></linearGradient>
         <radialGradient id="${id}i" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#3B2A6E"/><stop offset="1" stop-color="#140B2E"/></radialGradient>`
      : `<linearGradient id="${id}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col[1]}"/><stop offset=".55" stop-color="${col[2]}"/><stop offset="1" stop-color="${col[3]}"/></linearGradient>
         <radialGradient id="${id}i" cx=".35" cy=".28" r=".95"><stop offset="0" stop-color="${col[0]}"/><stop offset=".55" stop-color="${col[1]}"/><stop offset="1" stop-color="${col[2]}"/></radialGradient>`;
    const cinta = f === "medalla"
      ? `<path d="M30 2 L44 2 L56 30 L42 34 Z" fill="${arco ? "#3FA9F5" : col[2]}"/><path d="M70 2 L56 2 L44 30 L58 34 Z" fill="${arco ? "#A66CF0" : col[1]}"/><path d="M30 2 L44 2 L56 30 L42 34 Z M70 2 L56 2 L44 30 L58 34 Z" fill="#000" opacity=".12"/>` : "";
    const chispas = rar === "epica" || rar === "legendaria"
      ? `<g class="ins-chispas" fill="#fff">${[[16, 20, 3.2], [86, 26, 2.6], [84, 88, 2.2], [14, 84, 2.8]].map(([x, y, r]) => `<polygon points="${poligono(4, r * 1.6, r * 0.45, x, y)}"/>`).join("")}</g>` : "";
    const anillo = rar !== "comun" ? `<g fill="none" stroke="${arco ? "#fff" : col[0]}" stroke-width="1.2" opacity="${rar === "rara" ? ".55" : ".8"}" stroke-dasharray="${rar === "rara" ? "2 3" : "none"}">${forma(f, 0.74)}</g>` : "";
    const brillo = rar === "legendaria"
      ? `<clipPath id="${id}c">${forma(f, 1)}</clipPath><g clip-path="url(#${id}c)"><rect class="ins-brillo" x="-60" y="-10" width="26" height="140" fill="#fff" opacity=".35" transform="rotate(20)"/></g>` : "";
    const ink = def.color === "noche" || arco ? "#fff" : col[3];
    const icono = String(def.icono || "★").slice(0, 16);
    return `<svg class="ins-svg r-${rar}" viewBox="0 0 100 110" role="img" aria-label="${esc(op.label || def.nombre || "Insignia")}" focusable="false">
      <defs>${grad}</defs>${cinta}
      <g fill="#000" opacity=".18" transform="translate(0 3)">${forma(f, 1)}</g>
      <g fill="url(#${id}o)">${forma(f, 1)}</g>
      <g fill="url(#${id}i)">${forma(f, 0.84)}</g>
      ${anillo}
      <path d="M22 34 Q50 12 78 34" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".28"/>
      <text x="50" y="${f === "medalla" ? 63 : 57}" text-anchor="middle" dominant-baseline="middle" font-size="${icono.length > 2 && !/\p{Extended_Pictographic}/u.test(icono) ? 22 : 36}" font-family="'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',var(--f-display),sans-serif" font-weight="800" fill="${ink}">${esc(icono)}</text>
      ${chispas}${brillo}
    </svg>`;
  }
  const fechaCorta = (ts) => { const d = ts ? new Date(ts) : null; return d && !isNaN(d) ? d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : ""; };
  /** Insignia con su nombre. op: { tam, bloqueada, n, f, m, pie (HTML), boton (atributos), sel } */
  function html(def, op) {
    op = op || {};
    const tam = op.tam || "md", rar = RAREZAS[def.rareza] ? def.rareza : "comun";
    const tit = `${def.nombre}${op.n > 1 ? " ×" + op.n : ""} · ${RAREZAS[rar]}${def.desc ? " — " + def.desc : ""}${op.f ? " · " + fechaCorta(op.f) : ""}${op.m ? " · " + op.m : ""}`;
    const tag = op.boton ? "button" : "figure";
    return `<${tag} class="ins ins--${tam} r-${rar}${op.bloqueada ? " is-locked" : ""}${op.sel ? " is-sel" : ""}"${op.boton ? ` type="button" ${op.boton}` : ""} title="${esc(tit)}">
      <span class="ins-art">${svg(def, { label: def.nombre })}${op.n > 1 ? `<span class="ins-n">×${op.n}</span>` : ""}${op.sel ? '<span class="ins-star" aria-hidden="true">★</span>' : ""}</span>
      ${tam === "sm" ? "" : `<${op.boton ? "span" : "figcaption"} class="ins-cap"><b>${esc(def.nombre)}</b><small class="ins-rar">${RAREZAS[rar]}</small>${op.pie || ""}</${op.boton ? "span" : "figcaption"}>`}
    </${tag}>`;
  }
  const mini = (def) => `<span class="ins-mini r-${RAREZAS[def.rareza] ? def.rareza : "comun"}" title="${esc(def.nombre)}">${svg(def, { label: def.nombre })}</span>`;

  /* ---------------- Catálogo y reclamar las automáticas ---------------- */
  const CAT_KEY = "app-ins-cat";
  async function catalogo(forzar) {
    const c = session(CAT_KEY);
    if (!forzar && c && Date.now() - c.t < 300000 && Array.isArray(c.lista)) return c.lista;
    if (!window.Cuentas) return (c && c.lista) || [];
    const lista = await window.Cuentas.catalogo();
    session(CAT_KEY, { t: Date.now(), lista });
    return lista;
  }
  const porId = (lista) => { const m = {}; lista.forEach((d) => { m[d.id] = d; }); return m; };
  /** Orden para mostrar: rareza (de legendaria a común) y luego el orden del catálogo. */
  const ordenar = (defs) => defs.slice().sort((a, b) => (ORDEN_RAREZA[a.rareza] ?? 9) - (ORDEN_RAREZA[b.rareza] ?? 9) || (a.orden || 0) - (b.orden || 0));

  let revisando = null;
  async function revisar(forzar) {
    const ses = sesion(), C = window.Cuentas;
    if (!ses || ses.local || !C) return [];
    if (revisando) return revisando;
    const ult = session("app-ins-rev");
    if (!forzar && ult && Date.now() - ult < 60000) return [];
    session("app-ins-rev", Date.now());
    revisando = (async () => {
      const uid = await C.miUid(); if (!uid) return [];
      const [u, cat] = await Promise.all([C.perfil({ uid }), catalogo(forzar)]);
      if (!u || u.bloqueado) return [];
      const tiene = u.insignias || {}, nuevas = [];
      for (const d of cat) {
        if (d.tipo !== "auto" || !d.activa || tiene[d.id] || !CAMPOS[d.campo] || !((u[d.campo] || 0) >= d.umbral)) continue;
        try { await C.reclamarInsignia(d.id); nuevas.push(d); } catch (e) { /* las reglas no la dan aún: otra vez será */ }
      }
      nuevas.forEach((d, i) => setTimeout(() => C.toast("+ Insignia: " + d.nombre, (d.desc || "¡Ya está en tu vitrina!"), { texto: "Ver", href: window.App.ROOT + "perfil.html" }), i * 1200));
      if (nuevas.length) window.dispatchEvent(new CustomEvent("app:insignias", { detail: nuevas }));
      return nuevas;
    })().finally(() => { revisando = null; });
    return revisando;
  }

  window.Insignias = Object.freeze({ FORMAS, COLORES, RAREZAS, CAMPOS, svg, html, mini, catalogo, porId, ordenar, revisar, fechaCorta });

  // Al abrir cualquier página con cuenta: por si se ha ganado alguna (p. ej. con puntos de otro dispositivo).
  function alCargar() { setTimeout(() => { revisar().catch(() => {}); }, 2500); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", alCargar); else alCargar();
})();
