/*!
 * estadisticas.js — «Tus estadísticas» en cuenta.html (#estadisticas).
 *   · Resumen: tests terminados, nota media, aciertos, racha de días y preguntas en el repaso de fallos.
 *   · Actividad de las últimas 16 semanas (tests por día).
 *   · Por asignatura: evolución de tus notas, cada tema (mejor nota, tests, media, fallos por repasar) y tu
 *     punto débil, con el enlace para practicarlo.
 * Sale de lo que guarda este navegador y tu cuenta (App.historial, App.repaso y las mejores notas): sólo lo ves tú.
 * Requiere: assets/js/core.js.
 */
(function () {
  "use strict";
  const { SUBJECTS, store, esc, icon, historial, repaso, progress, ROOT, sesion, cursos } = window.App;
  const box = document.getElementById("est");
  if (!box || !sesion() || new URLSearchParams(location.search).has("cambiar")) return;
  const n1 = (x) => (Math.round(x * 10) / 10).toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt = (x) => Number(x || 0).toLocaleString("es-ES");
  const DIA = 86400000;
  const clave = (d) => { const x = new Date(d); return x.getFullYear() + "-" + (x.getMonth() + 1) + "-" + x.getDate(); };
  const colorNota = (x) => x == null ? "var(--line)" : x >= 7 ? "var(--ok)" : x >= 5 ? "var(--warn)" : "var(--bad)";
  const TIPOS = { autotest: "autotest", general: "test general", simulacro: "simulacro", repaso: "repaso", examen: "examen", equivalencias: "equivalencias" };
  let elegida = (store("app-est-asig") || "");

  function racha(dias) {
    let actual = 0, mejor = 0, run = 0;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    // racha actual: hacia atrás desde hoy (si hoy aún no hay, desde ayer)
    let d = hoy.getTime(); if (!dias.has(clave(d))) d -= DIA;
    while (dias.has(clave(d))) { actual++; d -= DIA; }
    const todas = [...dias].map((k) => { const [y, m, dd] = k.split("-").map(Number); return new Date(y, m - 1, dd).getTime(); }).sort((a, b) => a - b);
    todas.forEach((t, i) => { run = i && Math.round((t - todas[i - 1]) / DIA) === 1 ? run + 1 : 1; mejor = Math.max(mejor, run); });
    return { actual, mejor };
  }

  function heatmap(porDia) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) - 15 * 7);
    const celdas = [];
    for (let t = lunes.getTime(); t <= hoy.getTime() + 6 * DIA; t += DIA) {
      const k = clave(t), n = porDia[k] || 0, futuro = t > hoy.getTime();
      const lv = n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4;
      const f = new Date(t).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
      celdas.push(futuro ? `<i style="visibility:hidden"></i>` : `<i class="h${lv}${t === hoy.getTime() ? " hoy" : ""}" title="${esc(f)}: ${n} ${n === 1 ? "test" : "tests"}"></i>`);
    }
    return `<div class="heat" role="img" aria-label="Tests por día en las últimas 16 semanas">${celdas.join("")}</div>
      <div class="heat-leg">menos <i style="background:var(--line)"></i><i class="h1" style="background:color-mix(in srgb,var(--ok) 35%,var(--line))"></i><i style="background:color-mix(in srgb,var(--ok) 60%,var(--line))"></i><i style="background:color-mix(in srgb,var(--ok) 82%,var(--line))"></i><i style="background:var(--ok)"></i> más · cada columna es una semana (de lunes a domingo)</div>`;
  }

  function grafica(h) {
    const pts = h.slice(-30);
    if (pts.length < 2) return `<p class="est-nada">${pts.length ? "Con un test más verás aquí cómo evolucionan tus notas." : "Todavía no hay tests terminados aquí. Cuando hagas alguno verás cómo evolucionan tus notas."}</p>`;
    const W = 640, H = 200, L = 30, R = 10, T = 12, B = 26;
    const X = (i) => L + (W - L - R) * (pts.length === 1 ? 0.5 : i / (pts.length - 1)), Y = (v) => T + (H - T - B) * (1 - v / 10);
    const linea = pts.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.nota).toFixed(1)).join(" ");
    const area = linea + ` L${X(pts.length - 1).toFixed(1)} ${Y(0)} L${X(0).toFixed(1)} ${Y(0)} Z`;
    const media = pts.reduce((a, p) => a + p.nota, 0) / pts.length;
    const ejes = [0, 5, 10].map((v) => `<line class="ax" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join("");
    const f0 = new Date(pts[0].d).toLocaleDateString("es-ES", { day: "numeric", month: "short" }), f1 = new Date(pts[pts.length - 1].d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    return `<svg class="est-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Notas de tus últimos ${pts.length} tests, media ${n1(media)}">
      ${ejes}<path class="area" d="${area}" opacity=".7"/><path class="ln" d="${linea}"/>
      <line class="avg" x1="${L}" x2="${W - R}" y1="${Y(media)}" y2="${Y(media)}"/><text x="${W - R}" y="${Y(media) - 5}" text-anchor="end">media ${n1(media)}</text>
      ${pts.map((p, i) => `<circle class="${p.tipo === "simulacro" ? "sim" : ""}" cx="${X(i).toFixed(1)}" cy="${Y(p.nota).toFixed(1)}" r="3.5"><title>${esc(new Date(p.d).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))} · ${esc(TIPOS[p.tipo] || p.tipo)}${p.tema && p.tema !== "G" && p.tema !== "R" ? " del tema " + esc(p.tema) : ""}: ${n1(p.nota)}</title></circle>`).join("")}
      <text x="${L}" y="${H - 6}">${esc(f0)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${esc(f1)}</text>
    </svg>`;
  }

  function tendencia(h) {
    if (h.length < 6) return "";
    const k = Math.min(10, Math.floor(h.length / 2));
    const a = h.slice(-k), b = h.slice(-2 * k, -k);
    const ma = a.reduce((x, p) => x + p.nota, 0) / a.length, mb = b.reduce((x, p) => x + p.nota, 0) / b.length, d = ma - mb;
    if (Math.abs(d) < 0.3) return `<p class="muted">Vas estable: media de ${n1(ma)} en tus últimos ${k} tests.</p>`;
    return `<p class="muted">${d > 0 ? "📈 Mejorando" : "📉 Bajando"}: ${n1(ma)} de media en tus últimos ${k} tests frente a ${n1(mb)} en los ${k} anteriores (${d > 0 ? "+" : ""}${n1(d)}).</p>`;
  }

  function asignatura(s) {
    const h = historial.de(s.id);
    const at = s.resources.find((r) => r.progress && r.progress.t === "autotest");
    const R = repaso.resumen(s.id);
    const recursos = s.resources.map((r) => ({ r, p: progress.resource(r) })).filter((x) => x.p && x.p.total);
    let temas = "", tip = "";
    if (at) {
      const p = at.progress;
      const filas = p.topics.map((t) => {
        const best = store(p.prefix + t), hs = h.filter((x) => x.tema === String(t));
        const media = hs.length ? hs.reduce((a, x) => a + x.nota, 0) / hs.length : null;
        return { t, nombre: (p.names && p.names[t]) || "Tema " + t, best, n: hs.length, media, rep: R.porTema[t] || 0 };
      });
      const hechos = filas.filter((f) => f.best != null);
      const debil = hechos.length ? hechos.slice().sort((a, b) => a.best - b.best || b.rep - a.rep)[0] : null;
      const sinHacer = filas.filter((f) => f.best == null);
      const href = ROOT + at.href;
      temas = `<div class="est-wrap"><table class="est-temas"><thead><tr><th>Tema</th><th>Mejor nota</th><th class="n opt">Tests</th><th class="n opt">Media</th><th class="n">Por repasar</th></tr></thead><tbody>
        ${filas.map((f) => `<tr${debil && f.t === debil.t && debil.best < 7 ? ' class="debil"' : ""}><td><a href="${esc(href)}#test-${f.t}">${esc(f.nombre)}</a></td>
          <td><span class="nota-bar"><span class="m"><i style="width:${f.best != null ? f.best * 10 : 0}%;background:${colorNota(f.best)}"></i></span><b>${f.best != null ? n1(f.best) : "—"}</b></span></td>
          <td class="n opt">${f.n || "—"}</td><td class="n opt">${f.media != null ? n1(f.media) : "—"}</td><td class="n">${f.rep || "—"}</td></tr>`).join("")}</tbody></table></div>`;
      if (debil && debil.best < 7) tip = `<p class="est-tip">🎯 <b>Tu punto débil ahora mismo: ${esc(debil.nombre)}</b> (mejor nota ${n1(debil.best)}${debil.rep ? `, ${debil.rep} ${debil.rep === 1 ? "pregunta" : "preguntas"} por repasar` : ""}). <a href="${esc(href)}#test-${debil.t}">Hacer un test de ese tema →</a></p>`;
      else if (sinHacer.length) tip = `<p class="est-tip">🧭 Te ${sinHacer.length === 1 ? "queda 1 tema" : "quedan " + sinHacer.length + " temas"} sin probar en el autotest: <a href="${esc(href)}#test-${sinHacer[0].t}">${esc(sinHacer[0].nombre)} →</a></p>`;
      if (R.hoy) tip += `<p class="est-tip">↻ Tienes <b>${R.hoy}</b> ${R.hoy === 1 ? "pregunta" : "preguntas"} del repaso de fallos para hoy. <a href="${esc(href)}#test-R">Repasar ahora →</a></p>`;
    }
    const porTipo = {};
    h.forEach((x) => { porTipo[x.tipo] = (porTipo[x.tipo] || 0) + 1; });
    return `
      <div class="est-card"><h3>${esc(s.short)} · evolución de tus notas</h3>${grafica(h)}${tendencia(h)}
        ${h.length ? `<p class="muted">${Object.keys(porTipo).map((k) => `${porTipo[k]} ${esc(TIPOS[k] || k)}${porTipo[k] === 1 || /s$/.test(TIPOS[k] || k) ? "" : "s"}`).join(" · ")}${h.some((x) => x.tipo === "simulacro") ? " · los puntos naranjas son simulacros" : ""}</p>` : ""}</div>
      ${at ? `<div class="est-card"><h3>${esc(s.short)} · por temas</h3>${temas}${tip}</div>` : ""}
      ${recursos.length ? `<div class="est-card"><h3>${esc(s.short)} · avance del material</h3><ul class="bars">${recursos.map((x) => `<li><span>${esc(x.r.title)}</span><span class="m"><i style="width:${Math.round(100 * Math.min(1, x.p.done / x.p.total))}%"></i></span><b>${x.p.done}/${x.p.total}</b></li>`).join("")}</ul>
        <p class="muted">Repaso de fallos: ${R.total ? `${R.total} preguntas (${R.hoy} para hoy)` : "vacío"}${R.dominadas ? ` · ${R.dominadas} dominadas` : ""}.</p></div>` : ""}`;
  }

  function pintar() {
    // Las asignaturas de los cursos de la cuenta y, de las demás, sólo las que tengan tests hechos.
    const todos = SUBJECTS.map((s) => ({ s, h: historial.de(s.id) })).filter((x) => cursos.tiene(x.s.curso) || x.h.length);
    const h = todos.flatMap((x) => x.h);
    const porDia = {}; h.forEach((x) => { const k = clave(x.d); porDia[k] = (porDia[k] || 0) + 1; });
    const r = racha(new Set(Object.keys(porDia)));
    const ult = h.slice().sort((a, b) => a.d - b.d).slice(-20);
    const media = ult.length ? ult.reduce((a, x) => a + x.nota, 0) / ult.length : null;
    const ok = h.reduce((a, x) => a + x.ok, 0), n = h.reduce((a, x) => a + x.n, 0);
    const rep = SUBJECTS.map((s) => repaso.resumen(s.id));
    const repHoy = rep.reduce((a, x) => a + x.hoy, 0), repTot = rep.reduce((a, x) => a + x.total, 0);
    // Por defecto, la asignatura del último test.
    const ultimoDe = (x) => (x.h.length ? x.h[x.h.length - 1].d : 0);
    if (!todos.some((x) => x.s.id === elegida)) elegida = todos.slice().sort((a, b) => ultimoDe(b) - ultimoDe(a))[0].s.id;
    const S = SUBJECTS.find((s) => s.id === elegida);
    box.innerHTML = `<section class="est" id="estadisticas" aria-labelledby="h-est">
      <h2 id="h-est">${icon("chart")}Tus estadísticas</h2>
      <p class="est-sub">Sólo las ves tú. Salen de los tests que terminas${h.length ? "" : " (se empiezan a contar desde hoy: las notas de antes sólo aparecen como «mejor nota» de cada tema)"}.</p>
      <div class="est-card"><div class="est-tiles">
        <div><b>${fmt(h.length)}</b><span>tests terminados</span></div>
        <div><b>${media != null ? n1(media) : "—"}</b><span>nota media (últimos 20)</span></div>
        <div><b>${n ? Math.round(ok / n * 100) + "%" : "—"}</b><span>de aciertos</span></div>
        <div><b>${r.actual ? "🔥 " + r.actual : "0"}</b><span>${r.actual === 1 ? "día seguido" : "días seguidos"} (récord: ${r.mejor})</span></div>
        <div><b>${repHoy}<small style="font-size:15px;color:var(--muted)">/${repTot}</small></b><span>para repasar hoy</span></div>
      </div></div>
      <div class="est-card"><h3>Actividad</h3>${heatmap(porDia)}</div>
      <div class="est-chips" role="group" aria-label="Asignatura">${todos.map(({ s }) => `<button type="button" data-s="${s.id}" aria-pressed="${s.id === elegida}">${esc(s.short)}</button>`).join("")}</div>
      ${asignatura(S)}
    </section>`;
    box.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => { elegida = b.dataset.s; store("app-est-asig", elegida); pintar(); }));
  }
  pintar();
  window.addEventListener("app:cursos", pintar);   // en «Tu cuenta», al cambiar de cursos
  if (location.hash === "#estadisticas") setTimeout(() => { const t = document.getElementById("estadisticas"); if (t) t.scrollIntoView(); }, 50);
})();
