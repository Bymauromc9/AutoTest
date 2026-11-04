/*!
 * pdf.js — botones para descargar el contenido en PDF (lo carga core.js en todas las páginas).
 *
 *   · En cada página: botón «PDF» en la barra superior → el PDF de esa página.
 *   · En la portada de cada asignatura: «PDF» en cada sección (Teoría, Prácticas, Examen), en cada
 *     bloque (L0 / L1) y «Toda la asignatura en PDF» arriba.
 *
 * Los PDFs de cada página los genera scripts/pdf/generar.js (carpeta pdf/ y pdf/manifest.json).
 * Los de bloque y asignatura se montan aquí, en el navegador, al pulsar: se descargan los PDFs de sus
 * páginas, se unen con pdf-lib (assets/vendor, sólo se carga al pulsar) y se añade una portada con el
 * índice. Si no existe pdf/manifest.json, no aparece ningún botón.
 */
(function () {
  "use strict";
  if (window.__pdfUI) return;
  window.__pdfUI = true;

  const body = document.body;
  const BASE = new URL(body.dataset.root || "", location.href);              // raíz de la web
  const MANIFEST = new URL("pdf/manifest.json", BASE);
  const LIB = new URL("assets/vendor/pdf-lib.min.js", BASE);
  const cache = {};                                                          // id → Blob ya montado

  const ICO = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5"/><path d="M5 19h14"/></svg>';
  const mb = (b) => Math.max(0.1, b / 1048576).toFixed(1).replace(".", ",") + " MB";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function rutaActual() {
    let p = decodeURIComponent(location.pathname);
    const b = decodeURIComponent(BASE.pathname);
    if (p.startsWith(b)) p = p.slice(b.length);
    p = p.replace(/^\/+/, "");
    return p === "" || p.endsWith("/") ? p + "index.html" : p;
  }

  /* ---------------- descarga ---------------- */
  function guardar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nombre; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  let libPromise = null;
  function cargarLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (!libPromise) libPromise = new Promise((ok, ko) => {
      const s = document.createElement("script");
      s.src = LIB.href; s.onload = () => ok(window.PDFLib); s.onerror = () => { libPromise = null; ko(new Error("No se pudo cargar el creador de PDF")); };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  // Une los PDFs de las páginas de un bloque y le pone portada con índice.
  async function montar(bloque, M, progreso) {
    const L = await cargarLib();
    const { PDFDocument, StandardFonts, rgb } = L;
    const partes = bloque.partes.map((p) => M.paginas[p]).filter(Boolean);
    let hechas = 0;
    const docs = await Promise.all(partes.map(async (p) => {
      const r = await fetch(new URL("pdf/" + p.file, BASE), { cache: "no-cache" });
      if (!r.ok) throw new Error("Falta " + p.file);
      const d = await PDFDocument.load(await r.arrayBuffer());
      progreso(++hechas, partes.length);
      return d;
    }));
    const out = await PDFDocument.create();
    out.setTitle(bloque.asig + " · " + bloque.title); out.setAuthor("AutoTest"); out.setCreator("AutoTest");

    // Portada (Helvetica: cubre tildes, ñ y «·»)
    const A4 = [595.28, 841.89];
    const pg = out.addPage(A4);
    const f = await out.embedFont(StandardFonts.Helvetica), fb = await out.embedFont(StandardFonts.HelveticaBold);
    const azul = rgb(0.153, 0.275, 0.478), tinta = rgb(0.08, 0.125, 0.17), gris = rgb(0.45, 0.5, 0.56), linea = rgb(0.86, 0.88, 0.91);
    const txt = (s) => String(s).replace(/[^\u0000-ÿ·–—…‘’“”€]/g, "");   // sólo lo que Helvetica sabe dibujar
    const total = 1 + docs.reduce((a, d) => a + d.getPageCount(), 0);
    let y = 760;
    pg.drawText(txt(bloque.asig).toUpperCase(), { x: 50, y, size: 9, font: fb, color: azul }); y -= 40;
    const palabras = txt(bloque.title).split(" "); let lineaT = "";
    for (const w of palabras) { const t = lineaT ? lineaT + " " + w : w; if (fb.widthOfTextAtSize(t, 30) > 495) { pg.drawText(lineaT, { x: 50, y, size: 30, font: fb, color: tinta }); y -= 36; lineaT = w; } else lineaT = t; }
    pg.drawText(lineaT, { x: 50, y, size: 30, font: fb, color: tinta }); y -= 26;
    const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
    pg.drawText(`${partes.length} ${partes.length === 1 ? "apartado" : "apartados"} · ${total} páginas · ${fecha}`, { x: 50, y, size: 12, font: f, color: gris }); y -= 70;
    pg.drawText("Contenido", { x: 50, y, size: 13, font: fb, color: tinta }); y -= 8;
    pg.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1.5, color: azul }); y -= 22;
    let n = 2;
    partes.forEach((p, k) => {
      const num = "pág. " + n;
      pg.drawText(txt(p.title), { x: 50, y, size: 12, font: f, color: tinta });
      pg.drawText(num, { x: 545 - fb.widthOfTextAtSize(num, 11), y, size: 11, font: fb, color: azul });
      y -= 9; pg.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.6, color: linea }); y -= 17;
      n += docs[k].getPageCount();
    });
    pg.drawText("Generado a partir de " + BASE.host + ". Cada apartado conserva su numeración en el pie de página.", { x: 50, y: 50, size: 8.5, font: f, color: gris });

    for (const d of docs) (await out.copyPages(d, d.getPageIndices())).forEach((p) => out.addPage(p));
    return new Blob([await out.save()], { type: "application/pdf" });
  }

  /* ---------------- botones ---------------- */
  function boton(cls, etiqueta, titulo) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "pdf-ui pdf-btn " + cls;
    b.innerHTML = ICO + `<span class="pdf-btn__t">${esc(etiqueta)}</span>`;
    b.title = titulo; b.setAttribute("aria-label", titulo);
    return b;
  }
  function conEstado(b, fn) {
    b.addEventListener("click", async (e) => {
      e.preventDefault(); e.stopPropagation();
      if (b.disabled) return;
      const t = b.querySelector(".pdf-btn__t"), antes = t.textContent;
      b.disabled = true; b.classList.add("is-busy");
      try { await fn((txt) => { t.textContent = txt; }); }
      catch (err) { console.warn(err); t.textContent = "No se pudo crear"; await new Promise((r) => setTimeout(r, 2500)); }
      finally { t.textContent = antes; b.disabled = false; b.classList.remove("is-busy"); }
    });
    return b;
  }
  function descargaPagina(M, ruta, etiqueta, cls) {
    const p = M.paginas[ruta];
    const b = boton(cls, etiqueta, `Descargar «${p.title}» en PDF (${p.paginas} págs., ${mb(p.bytes)})`);
    return conEstado(b, async (estado) => {
      estado("Descargando…");
      const r = await fetch(new URL("pdf/" + p.file, BASE), { cache: "no-cache" });
      if (!r.ok) throw new Error("Falta " + p.file);
      guardar(await r.blob(), p.descarga);
    });
  }
  function descargaBloque(M, bl, etiqueta, cls) {
    const partes = bl.partes.map((x) => M.paginas[x]).filter(Boolean);
    if (!partes.length) return null;
    const pags = partes.reduce((a, x) => a + x.paginas, 0), bytes = partes.reduce((a, x) => a + x.bytes, 0);
    const b = boton(cls, etiqueta, `Descargar «${bl.asig} · ${bl.title}» en un solo PDF: ${partes.length} ${partes.length === 1 ? "apartado" : "apartados"}, unas ${pags} págs., ${mb(bytes)}`);
    return conEstado(b, async (estado) => {
      if (!cache[bl.id]) {
        estado("Preparando…");
        cache[bl.id] = await montar(bl, M, (i, n) => estado(`Preparando ${i}/${n}…`));
      }
      guardar(cache[bl.id], bl.descarga);
    });
  }

  function ponerEnPagina(M) {
    const ruta = rutaActual();
    if (!M.paginas[ruta]) return;
    const nav = document.querySelector(".site-nav__inner");
    const theme = document.getElementById("theme-toggle");
    if (!nav || nav.querySelector(".pdf-btn")) return;
    const b = descargaPagina(M, ruta, "PDF", "pdf-btn--nav");
    if (theme && theme.parentNode === nav) nav.insertBefore(b, theme); else nav.appendChild(b);
  }

  function ponerEnPortada(M) {
    const subj = body.dataset.subject;
    if (!subj) return;
    const app = document.getElementById("app");
    const asig = M.asignaturas[subj];
    const hero = app && app.querySelector(".hub-hero");
    if (hero && asig && !hero.querySelector(".pdf-btn")) {
      const b = descargaBloque(M, asig, "Toda la asignatura en PDF", "pdf-btn--hero");
      if (b) { const cont = hero.querySelector(".continue"); const fila = document.createElement("div"); fila.className = "pdf-ui pdf-row"; fila.appendChild(b);
        if (cont) cont.insertAdjacentElement("afterend", fila); else hero.appendChild(fila); }
    }
    M.bloques.filter((b) => b.subject === subj).forEach((bl) => {
      const sec = app && app.querySelector(`.hub-sec#${CSS.escape(bl.sec)}`);
      if (!sec) return;
      if (!bl.group) {
        const h = sec.querySelector(".hub-sec-h");
        if (h && !h.querySelector(".pdf-btn")) { const b = descargaBloque(M, bl, "PDF", "pdf-btn--sec"); if (b) h.appendChild(b); }
      } else {
        const gh = [...sec.querySelectorAll(".res-gh")].find((h) => { const t = h.querySelector(".gtag"); return t && t.textContent.trim() === bl.group; });
        if (gh && !gh.querySelector(".pdf-btn")) { const b = descargaBloque(M, bl, "PDF", "pdf-btn--grp"); if (b) gh.appendChild(b); }
      }
    });
  }

  async function iniciar() {
    let M;
    try {
      const r = await fetch(MANIFEST, { cache: "no-cache" });
      if (!r.ok) return;
      M = await r.json();
    } catch (e) { return; }
    if (!M || !M.paginas) return;
    M.bloques = M.bloques || []; M.asignaturas = M.asignaturas || {};
    const aplicar = () => { ponerEnPagina(M); if (body.hasAttribute("data-hub")) ponerEnPortada(M); };
    aplicar();
    // La portada de la asignatura y la barra superior se pintan con JavaScript: si se vuelven a pintar, se recolocan los botones.
    const app = document.getElementById("app");
    if (app && body.hasAttribute("data-hub")) new MutationObserver(() => aplicar()).observe(app, { childList: true });
    const nav = document.querySelector(".site-nav");
    if (nav) new MutationObserver(() => aplicar()).observe(nav, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
