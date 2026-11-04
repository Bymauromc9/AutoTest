#!/usr/bin/env node
/*!
 * scripts/pdf/generar.js — genera los PDFs descargables de la web.
 *
 *   cd scripts/pdf && npm install && npx playwright install chromium   (la primera vez)
 *   node scripts/pdf/generar.js                                        (desde la raíz del repo)
 *
 * Lee el registro de asignaturas (App.SUBJECTS de assets/js/core.js), abre cada página en Chrome sin
 * ventana, la convierte en una versión para papel (resoluciones abiertas, autotest con las respuestas,
 * exámenes con la solución, todas las pestañas de las chuletas…) y la imprime en PDF. Después une las
 * define los bloques (Teoría, Prácticas…) y la asignatura completa, y escribe pdf/manifest.json, que es
 * lo que lee assets/js/pdf.js para poner los botones. Los bloques los une el navegador al descargarlos.
 *
 * Opciones:  --solo fc/teoria/guia.html   regenera sólo esa página (para probar)
 *            --todo                        vuelve a imprimir todas aunque su contenido no haya cambiado
 */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const { chromium } = require("playwright");
const { PDFDocument } = require("pdf-lib");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "pdf");
const SITE = "autotestfliprimerparcial.vercel.app";
const FECHA_FIJA = new Date("2026-01-01T00:00:00Z");   // metadatos fijos: el PDF sólo cambia si cambia el contenido
// Recursos que son herramientas interactivas o duplican otra página: no tienen sentido en papel.
const KINDS_FUERA = new Set(["herramientas", "simulador", "simulacro", "general"]);

const args = process.argv.slice(2);
const TODO = args.includes("--todo");   // vuelve a imprimir todas las páginas aunque no hayan cambiado
const SOLO = args.includes("--solo") ? args[args.indexOf("--solo") + 1] : null;

/* ---------------- servidor estático local ---------------- */
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
function servidor() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      if (req.url.startsWith("/api/")) { res.writeHead(404); return res.end(); }
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); return res.end("404"); }
        res.writeHead(200, { "Content-Type": TIPOS[path.extname(f).toLowerCase()] || "application/octet-stream" });
        res.end(data);
      });
    });
    srv.listen(0, "127.0.0.1", () => resolve(srv));
  });
}

/* ---------------- CSS de impresión común ---------------- */
const CSS_PDF = `
@page { size: A4; }
html, body { background: #fff !important; }
body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.site-nav, .skip-link, .ai-ui, .pdf-ui, .tabbar, .side, aside.side, .toc-toggle, .soltools, .reset, .card-tools, label.done,
.drill, .partnav, .tabs, .actions, .qtools, .hub-note, .ip-pages, .fc-pages, .column, #swap, #quit, .selfg, .score, .grid-nav,
noscript { display: none !important; }
.shell { display: block !important; max-width: none !important; padding: 0 !important; margin: 0 !important; }
main, #app, .wrap { max-width: none !important; width: auto !important; margin: 0 !important; padding: 0 !important; }
details > summary { list-style: none; }
details > summary::-webkit-details-marker { display: none; }
article, .card, .qcard, .box, .callout, figure, pre, .codeblk, .formula, tr, .km, .tool, .pdfq, .expl ol.steps > li, img { break-inside: avoid; }
h1, h2, h3, h4, .card-head, .tema-head { break-after: avoid; }
.tema, .pdf-part + .pdf-part { break-before: page; }
.topic { display: block !important; }
.prose p, .prose ul, .prose ol, .box, .deep, .expl, .lead, .lede, .note, .expl p, .expl ul, .expl ol, ol.steps > li { max-width: none !important; }
.fig { max-width: 115mm !important; }
.fig img, .prose img { max-height: 105mm; width: auto !important; max-width: 100%; }
.tablewrap, .tw { overflow: visible !important; }
pre, pre code { white-space: pre-wrap !important; word-break: break-word; }
a { color: inherit; text-decoration: none; }
.pdfh { font: 800 22px "Bricolage Grotesque", system-ui, sans-serif; margin: 0 0 6px; }
.pdfsub { color: #5a6573; margin: 0 0 18px; font-size: 13px; }
.pdftopic { font: 800 17px "Bricolage Grotesque", system-ui, sans-serif; margin: 22px 0 10px; padding-bottom: 4px; border-bottom: 2px solid #27467A; color: #15202C; break-after: avoid; }
.pdfq { margin: 0 0 12px; padding: 9px 12px; border: 1px solid #D7DDE4; border-radius: 8px; font-size: 12.5px; line-height: 1.45; color: #15202C; }
.pdfq .n { font-weight: 800; color: #27467A; margin-right: 4px; }
.pdfq p { margin: 0 0 6px; }
.pdfq ol { list-style: none; margin: 0 0 6px; padding: 0; }
.pdfq li { padding: 2px 6px; border-radius: 4px; margin: 1px 0; }
.pdfq li b.k { display: inline-block; width: 1.4em; color: #5a6573; }
.pdfq li.ok { background: #E2F2E8; color: #14532D; font-weight: 700; }
.pdfq li.ok b.k { color: #14532D; }
.pdfq .e { color: #3b4652; font-size: 12px; border-left: 3px solid #27467A; padding-left: 8px; margin: 4px 0 0; }
.pdfq code, .pdfq .f { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: .92em; }
.pdf-part > h2.pdf-parth { font: 800 20px "Bricolage Grotesque", system-ui, sans-serif; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 2px solid #27467A; }
`;

/* ---------------- preparadores (se ejecutan dentro de la página) ---------------- */
// Si cambia este fichero (CSS, preparadores, cabecera…), cambian todas las huellas y se reimprime todo.
const VERSION = crypto.createHash("sha1").update(fs.readFileSync(__filename)).digest("hex");
// Común: tema claro, resoluciones abiertas y fuera lo interactivo.
async function prepararComun(page) {
  await page.evaluate((css) => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("ai-open");
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    document.querySelectorAll("details").forEach((d) => { d.open = true; });
    document.querySelectorAll("input[type=checkbox]").forEach((c) => { c.checked = false; });
    document.querySelectorAll("img[loading=lazy]").forEach((i) => { i.loading = "eager"; });
  }, CSS_PDF);
}

// Autotest (FLI, FC, IP): todo el banco de preguntas, por temas, con la correcta marcada y la explicación.
async function prepararAutotest(page) {
  await page.evaluate(() => {
    const NS = [window.FLI, window.FC, window.IP].find((n) => n && n.BANK && n.TOPICS);
    if (!NS) throw new Error("No encuentro el banco de preguntas");
    const fmt = NS.fmt || ((s) => s);
    const L = NS.LETTERS || ["A", "B", "C", "D", "E", "F"];
    // Barajado fijo por pregunta: en el PDF la correcta no está siempre en la A, y sale igual cada vez.
    const rnd = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const orden = NS.ORDER || Object.keys(NS.TOPICS).map(Number).sort((a, b) => a - b);
    const tabla = (tbl) => tbl && tbl.h ? `<table class="t"><thead><tr>${tbl.h.map((h) => `<th>${fmt(h)}</th>`).join("")}</tr></thead><tbody>${tbl.r.map((r) => `<tr>${r.map((c) => `<td>${fmt(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "";
    let n = 0;
    const temas = orden.map((t) => {
      const T = NS.TOPICS[t]; const qs = NS.BANK.filter((b) => b.t === t);
      if (!qs.length) return "";
      return `<h2 class="pdftopic">${(T.label || "Tema " + t)} · ${T.name}</h2>` + qs.map((q) => {
        n++;
        const r = rnd(q.id * 7919 + 13); const idx = q.o.map((_, k) => k);
        for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
        return `<div class="pdfq"><p><span class="n">${n}.</span>${fmt(q.q)}</p>${tabla(q.tbl)}<ol>${idx.map((k, j) => `<li class="${k === q.a ? "ok" : ""}"><b class="k">${L[j]}</b>${fmt(q.o[k])}${k === q.a ? " ✔" : ""}</li>`).join("")}</ol>${q.e ? `<p class="e">${fmt(q.e)}</p>` : ""}</div>`;
      }).join("");
    }).join("");
    const h1 = (document.querySelector("h1") || {}).textContent || document.title;
    document.getElementById("app").innerHTML = `<h1 class="pdfh">${h1}</h1><p class="pdfsub">Banco completo: ${n} preguntas con la respuesta correcta marcada (✔) y su explicación.</p>${temas}`;
  });
}

// Chuletas de FLI: todas las pestañas seguidas.
async function prepararChuletas(page) {
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll("[data-tab]")].map((a) => [a.dataset.tab, a.textContent.trim()]);
    const partes = tabs.map(([k, l]) => {
      document.querySelector(`[data-tab="${k}"]`).click();
      const s = document.querySelector(".sheet");
      return `<section class="pdf-part"><h2 class="pdf-parth">${l}</h2>${s ? s.innerHTML : ""}</section>`;
    });
    const top = document.querySelector("header.top");
    document.getElementById("app").innerHTML = (top ? top.outerHTML : "") + partes.join("");
  });
}

// Guía de prácticas de FLI: las seis partes seguidas.
async function prepararGuiaFLI(page) {
  await page.evaluate(async () => {
    const espera = () => new Promise((r) => setTimeout(r, 60));
    const partes = [...document.querySelectorAll(".partnav a")].map((a) => [a.getAttribute("href"), a.textContent.trim()]);
    const html = [];
    for (const [h, l] of partes) {
      location.hash = h; await espera();
      const g = document.querySelector(".guide").cloneNode(true);
      g.querySelectorAll(".partnav, .actions").forEach((x) => x.remove());
      html.push(`<section class="pdf-part"><h2 class="pdf-parth">Parte ${l}</h2>${g.innerHTML}</section>`);
    }
    const top = document.querySelector("header.top");
    document.getElementById("app").innerHTML = (top ? top.outerHTML : "") + `<div class="guide">${html.join("")}</div>`;
  });
}

// Equivalencias: la lista completa del banco.
async function prepararEquivalencias(page) {
  await page.evaluate(() => {
    const b = document.getElementById("cheatbtn"); if (b) b.click();
    const btn = document.getElementById("cheatbtn");
    const sec = btn && (btn.closest("section") || btn.parentElement.parentElement);
    const head = document.querySelector("#app header");
    if (btn) btn.remove();
    document.getElementById("app").innerHTML = (head ? head.outerHTML : "") + (sec ? sec.outerHTML : "");
  });
}

// Exámenes de FLI: cada examen entregado en blanco muestra su corrección completa con la solución.
async function prepararExamenes(page, url) {
  const total = await page.evaluate(() => (window.FLI && window.FLI.EXAMS || []).length);
  const partes = [];
  for (let i = 0; i < total; i++) {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(url, { waitUntil: "networkidle" });
    const titulo = await page.evaluate((k) => window.FLI.EXAMS[k].title, i);
    await page.evaluate(() => { window.confirm = () => true; });
    const botones = page.locator("main button", { hasText: /^Empezar$/ });
    await botones.nth(i).click();
    await page.locator("button", { hasText: /Entregar/ }).first().click();
    await page.waitForTimeout(150);
    partes.push(await page.evaluate((t) => {
      const app = document.getElementById("app");
      app.querySelectorAll(".qhead, .score, .selfg, .actions, nav, .grid, [class*=grid]").forEach((x) => { if (!x.closest(".qcard")) x.remove(); });
      app.querySelectorAll(".qcard .selfg").forEach((x) => x.remove());
      app.querySelectorAll(".verdict-line").forEach((v) => {
        v.textContent = v.textContent.replace(/^–\s*En blanco\s*·\s*0\s*·\s*la correcta es la\s*/i, "Respuesta correcta: ").replace(/^No marcaste resultado\.\s*/i, "");
        v.classList.remove("blank"); v.classList.add("ok");
      });
      // Fuera la cuadrícula de navegación y los títulos de «Parte 1 · Test» se conservan.
      return `<section class="pdf-part"><h2 class="pdf-parth">${t}</h2>${app.innerHTML}</section>`;
    }, titulo));
  }
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate((html) => {
    document.getElementById("app").innerHTML = `<h1 class="pdfh">Exámenes completos con solución</h1><p class="pdfsub">Test (+0,6 / −0,2) con la respuesta correcta y su explicación, y ejercicios resueltos paso a paso.</p>` + html;
  }, partes.join(""));
}

const PREPARADORES = [
  [/\/autotest\.html$/, prepararAutotest],
  [/^fli\/teoria\/chuletas\.html$/, prepararChuletas],
  [/^fli\/practicas\/guia\.html$/, prepararGuiaFLI],
  [/^fli\/teoria\/equivalencias\.html$/, prepararEquivalencias],
  [/^fli\/teoria\/examenes\.html$/, prepararExamenes]
];

/* ---------------- utilidades ---------------- */
const slug = (s) => s.replace(/\.html$/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
const limpio = (s) => String(s).replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
const escHTML = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
async function normalizar(bytes, titulo) {
  const doc = await PDFDocument.load(bytes);
  doc.setTitle(titulo); doc.setAuthor("AutoTest · " + SITE); doc.setCreator("AutoTest"); doc.setProducer("AutoTest");
  doc.setCreationDate(FECHA_FIJA); doc.setModificationDate(FECHA_FIJA);
  return { doc, bytes: await doc.save({ useObjectStreams: true }) };
}
function cabecera(asig, titulo) {
  return `<div style="font:8px Helvetica,Arial,sans-serif;color:#7a8592;width:100%;padding:0 14mm;display:flex;justify-content:space-between">
    <span>${escHTML(asig)}</span><span>${escHTML(titulo)}</span></div>`;
}
function pie() {
  return `<div style="font:8px Helvetica,Arial,sans-serif;color:#7a8592;width:100%;padding:0 14mm;display:flex;justify-content:space-between">
    <span>${SITE}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`;
}
const OPC_PDF = (asig, titulo) => ({
  format: "A4", printBackground: true, displayHeaderFooter: true,
  headerTemplate: cabecera(asig, titulo), footerTemplate: pie(),
  margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" }
});

/* ---------------- principal ---------------- */
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let PREVIO = {};
  try { if (!TODO) PREVIO = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8")); } catch (e) { PREVIO = {}; }
  const srv = await servidor();
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  // Cada página se imprime en un contexto nuevo: así no hereda fuentes en caché de la anterior y el
  // PDF sale idéntico byte a byte mientras no cambie el contenido.
  async function nuevaPagina() {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 1400 }, colorScheme: "light", reducedMotion: "reduce" });
    await ctx.addInitScript(() => { try { localStorage.setItem("app-theme", JSON.stringify("light")); } catch (e) { /* nada */ } });
    const pg = await ctx.newPage();
    pg.on("pageerror", (e) => console.warn("  aviso JS:", e.message));
    return pg;
  }
  let page = await nuevaPagina();

  await page.goto(base + "index.html", { waitUntil: "domcontentloaded" });
  const REG = await page.evaluate(() => ({
    subjects: window.App.SUBJECTS.map((s) => ({ id: s.id, short: s.short, name: s.name, groups: s.groups || null,
      resources: s.resources.map((r) => ({ id: r.id, sec: r.sec, group: r.group || "", kind: r.kind, title: r.title, href: r.href })) })),
    sections: window.App.SECTIONS.map((s) => ({ id: s.id, label: s.label })),
    kinds: Object.keys(window.App.KINDS)
  }));

  // Páginas únicas de cada asignatura, en el orden de la portada (sección → bloque → tipo).
  const manifest = { paginas: {}, bloques: [], asignaturas: {} };   // sin fecha: sólo cambia si cambia algún PDF
  const plan = [];
  for (const S of REG.subjects) {
    const gOrder = S.groups ? Object.keys(S.groups) : [];
    const ordenRec = (a, b) => REG.sections.findIndex((x) => x.id === a.sec) - REG.sections.findIndex((x) => x.id === b.sec)
      || (gOrder.indexOf(a.group) - gOrder.indexOf(b.group)) || (REG.kinds.indexOf(a.kind) - REG.kinds.indexOf(b.kind));
    const vistos = new Set();
    const recursos = S.resources.filter((r) => !KINDS_FUERA.has(r.kind)).sort(ordenRec).filter((r) => {
      const p = r.href.split("#")[0]; if (vistos.has(p)) return false; vistos.add(p); r.path = p; return true;
    });
    plan.push({ S, recursos });
  }

  // 1) Un PDF por página
  for (const { S, recursos } of plan) {
    for (const r of recursos) {
      if (SOLO && r.path !== SOLO) continue;
      const url = base + r.path;
      const file = slug(r.path) + ".pdf";
      process.stdout.write(`· ${r.path} … `);
      await page.context().close(); page = await nuevaPagina();
      await page.goto(url, { waitUntil: "networkidle" });
      const prep = PREPARADORES.find(([re]) => re.test(r.path));
      if (prep) await prep[1](page, url);
      await prepararComun(page);
      // Fuentes: se cargan todas antes de imprimir (si no, según lo rápido que lleguen, el PDF sale distinto).
      await page.evaluate(async () => {
        void document.body.offsetHeight;
        await Promise.all([...document.fonts].map((f) => f.load().catch(() => null)));
        await document.fonts.ready;
        await Promise.all([...document.images].map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
      });
      await page.waitForTimeout(300);
      // Huella del contenido que se va a imprimir (HTML final + estilos + versión del generador). Chrome no
      // genera siempre los mismos bytes (nombra distinto las fuentes variables), así que el PDF anterior se
      // conserva si la huella no ha cambiado: en git sólo cambian los PDFs cuyo contenido cambia.
      const contenido = await page.evaluate(() => {
        const b = document.body.cloneNode(true);
        b.querySelectorAll(".site-nav, .ai-ui, .pdf-ui, .drill, script, noscript").forEach((x) => x.remove());
        const css = [...document.styleSheets].map((sh) => { try { return [...sh.cssRules].map((r) => r.cssText).join("\n"); } catch (e) { return sh.href || ""; } }).join("\n");
        return b.innerHTML + "\n" + css;
      });
      const huella = crypto.createHash("sha1").update(VERSION + r.title + S.short + S.name + contenido).digest("hex").slice(0, 16);
      const ant = PREVIO.paginas && PREVIO.paginas[r.path];
      if (ant && ant.huella === huella && ant.file === file && fs.existsSync(path.join(OUT, file))) {
        manifest.paginas[r.path] = Object.assign({}, ant, { title: r.title, subject: S.id, sec: r.sec, group: r.group, descarga: limpio(`${S.short} - ${r.title}.pdf`) });
        console.log("sin cambios");
        continue;
      }
      const crudo = await page.pdf(OPC_PDF(S.short + " · " + S.name, r.title));
      const { doc, bytes } = await normalizar(crudo, `${S.short} · ${r.title}`);
      fs.writeFileSync(path.join(OUT, file), bytes);
      manifest.paginas[r.path] = { file, title: r.title, subject: S.id, sec: r.sec, group: r.group, descarga: limpio(`${S.short} - ${r.title}.pdf`),
        paginas: doc.getPageCount(), bytes: bytes.length, huella };
      console.log(`${doc.getPageCount()} págs, ${(bytes.length / 1048576).toFixed(1)} MB`);
    }
  }

  // 2) Bloques (sección, y sección · grupo si hay varios) y asignatura completa. No se guardan como PDF:
  //    el navegador los une al pulsar el botón (assets/js/pdf.js), con portada e índice. Así el
  //    repositorio sólo guarda un PDF por página y los bloques siempre están al día.
  for (const { S, recursos } of plan) {
    const asig = `${S.short} · ${S.name}`;
    const partes = (lista) => lista.map((r) => r.path).filter((p) => manifest.paginas[p] || SOLO);
    for (const sec of REG.sections) {
      const enSec = recursos.filter((r) => r.sec === sec.id);
      if (!enSec.length) continue;
      manifest.bloques.push({ id: `${S.id}-${sec.id}`, subject: S.id, sec: sec.id, group: "", asig, title: sec.label,
        descarga: limpio(`${S.short} - ${sec.label}.pdf`), partes: partes(enSec) });
      const grupos = [...new Set(enSec.map((r) => r.group).filter(Boolean))];
      if (grupos.length > 1) for (const g of grupos) {
        manifest.bloques.push({ id: `${S.id}-${sec.id}-${slug(g)}`, subject: S.id, sec: sec.id, group: g, asig,
          title: `${sec.label} · ${g}${S.groups && S.groups[g] ? " (" + S.groups[g] + ")" : ""}`,
          descarga: limpio(`${S.short} - ${sec.label} ${g}.pdf`), partes: partes(enSec.filter((r) => r.group === g)) });
      }
    }
    manifest.asignaturas[S.id] = { id: `${S.id}-completa`, subject: S.id, asig, title: "Asignatura completa",
      descarga: limpio(`${S.short} - Asignatura completa.pdf`), partes: partes(recursos) };
  }

  // Si sólo se ha generado una página, se conserva el resto del manifest anterior.
  const mf = path.join(OUT, "manifest.json");
  if (SOLO && fs.existsSync(mf)) {
    const prev = JSON.parse(fs.readFileSync(mf, "utf8"));
    Object.assign(prev.paginas, manifest.paginas);
    prev.bloques = manifest.bloques; prev.asignaturas = manifest.asignaturas;
    fs.writeFileSync(mf, JSON.stringify(prev, null, 1));
  } else {
    // Borra PDFs que ya no corresponden a ninguna página ni bloque.
    const vivos = new Set(Object.values(manifest.paginas).map((p) => p.file));
    for (const f of fs.readdirSync(OUT)) if (f.endsWith(".pdf") && !vivos.has(f)) fs.unlinkSync(path.join(OUT, f));
    fs.writeFileSync(mf, JSON.stringify(manifest, null, 1));
  }
  await browser.close(); srv.close();
  console.log("Listo:", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
