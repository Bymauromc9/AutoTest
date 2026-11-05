/*!
 * simulacro.js — simulacro del test de GOHP con las reglas de la guía docente:
 *   40 preguntas de cuatro opciones de los temas 1–10 (4 de cada uno; el seminario no entra), nota sobre 10,
 *   cada fallo resta 1/3 de acierto, las preguntas en blanco no cuentan y hace falta un 4 para hacer media.
 * Las preguntas se ven todas a la vez, como en el papel; se puede cambiar o quitar una respuesta hasta entregar.
 * El simulacro en curso (con la hora límite) se guarda en sessionStorage: sobrevive a recargar la página.
 * Mejor nota en localStorage «gohp-sim-best» e historial en «gohp-sim-hist».
 * Requiere: assets/js/core.js, gohp/js/util.js, gohp/js/data/banco.js.
 */
(function () {
  "use strict";
  const { store, session, shuffle, esc, icon } = window.App;
  const { BANK, TOPICS, EXAM_IDS, EXAM_MIX, fmt } = window.GOHP;
  const LET = ["a", "b", "c", "d"];
  const STATE = "gohp-sim-state";
  const app = document.getElementById("app");
  let S = null, tick = null, armed = false;

  const n2 = (x) => x.toFixed(2).replace(".", ",");
  const n1 = (x) => x.toFixed(1).replace(".", ",");

  function grade() {
    let ok = 0, bad = 0, blank = 0; const byT = {};
    S.ids.forEach((id, i) => {
      const q = BANK[id], a = S.ans[i]; byT[q.t] = byT[q.t] || { ok: 0, bad: 0, n: 0 }; byT[q.t].n++;
      if (a == null) blank++; else if (a === q.a) { ok++; byT[q.t].ok++; } else { bad++; byT[q.t].bad++; }
    });
    const net = Math.max(0, ok - bad / 3);
    return { ok, bad, blank, net, nota: Math.round(net / S.ids.length * 10 * 100) / 100, byT, n: S.ids.length };
  }

  /* ---------- Inicio ---------- */
  function home() {
    stop(); S = null; session(STATE, null);
    const best = store("gohp-sim-best"), hist = store("gohp-sim-hist") || [];
    const total = Object.values(EXAM_IDS).reduce((a, x) => a + x.length, 0);
    const rows = hist.slice(-8).reverse().map((h) => {
      const d = new Date(h.d);
      return `<tr><td data-l="Fecha">${d.toLocaleDateString("es-ES")} ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</td>
        <td data-l="Nota"><b>${n2(h.nota)}</b> / 10</td><td data-l="Aciertos · fallos · blanco">${h.ok} · ${h.bad} · ${h.blank}</td></tr>`;
    }).join("");
    app.innerHTML = `
    <header class="top">
      <span class="eyebrow">Examen · Test</span>
      <h1>Simulacro del test</h1>
      <p class="muted">Cuarenta preguntas tipo examen, cuatro de cada tema, con la penalización de la guía docente. Hazlo de una sentada, sin apuntes. Hay ${total} preguntas en el banco, así que cada simulacro es distinto.</p>
    </header>
    <div class="callout"><b class="big">Reglas</b>
      <ul class="rules">
        <li>40 preguntas de cuatro opciones; la nota del test va <b>sobre 10</b>.</li>
        <li><b>Cada fallo resta 1/3</b> (3 fallos anulan 1 acierto). Las que dejes en blanco ni suman ni restan.</li><li>En el examen real necesitas al menos un <b>4 sobre 10</b> en el test para hacer media con la parte práctica.</li>
        <li>Reparto: 4 preguntas de cada uno de los temas 1 a 10.</li>
        <li>Puedes cambiar o quitar una respuesta (tócala otra vez) hasta que entregues.</li>
      </ul></div>
    <div class="callout warn"><b class="big">¿Contestar o dejar en blanco?</b>
      <p style="margin:.3em 0 0">Al azar entre cuatro opciones la media sale a cero: aciertas 1 de cada 4 y los 3 fallos la anulan. Si descartas una opción, contestar ya compensa (de media ganas); si no, déjala en blanco.</p></div>
    <div class="settings" role="group" aria-label="Opciones del simulacro">
      <label for="sim-time">Reloj
        <select id="sim-time"><option value="60">60 minutos</option><option value="45">45 minutos</option><option value="30">30 minutos</option><option value="0">Sin reloj</option></select></label>
      ${best != null ? `<span class="best">Mejor nota: <b>${n2(best)}</b> / 10</span>` : ""}
    </div>
    <div class="actions" style="justify-content:flex-start"><button class="btn" id="sim-start" type="button">${icon("timer")}Empezar simulacro</button>
      <a class="btn ghost" href="guia.html">Guía del examen</a></div>
    ${rows ? `<section aria-labelledby="h-hist"><h2 id="h-hist" style="font-size:20px;margin-bottom:10px">Tus últimos simulacros</h2>
      <div class="tw"><table class="t stack"><thead><tr><th>Fecha</th><th>Nota</th><th>Aciertos · fallos · blanco</th></tr></thead><tbody>${rows}</tbody></table></div></section>` : ""}`;
    const sel = document.getElementById("sim-time"); sel.value = String(store("gohp-sim-time") ?? 60);
    sel.onchange = () => store("gohp-sim-time", +sel.value);
    document.getElementById("sim-start").onclick = () => begin(+sel.value);
  }

  /* ---------- Simulacro ---------- */
  function begin(mins) {
    let ids = [];
    Object.keys(EXAM_MIX).forEach((t) => { ids = ids.concat(shuffle(EXAM_IDS[t]).slice(0, EXAM_MIX[t])); });
    ids = shuffle(ids);
    // Las opciones se barajan una vez por simulacro (en el banco la correcta va siempre la primera).
    const ord = ids.map((id) => shuffle(BANK[id].o.map((_, k) => k)));
    S = { ids, ord, ans: new Array(ids.length).fill(null), end: mins ? Date.now() + mins * 60000 : 0, done: false };
    save(); run(); window.scrollTo(0, 0);
  }
  function save() { session(STATE, S); }
  /** Orden en que se muestran las opciones de la pregunta i (simulacros guardados antes de barajarlas: el del banco). */
  function optOrder(i) { return (S.ord && S.ord[i]) || BANK[S.ids[i]].o.map((_, k) => k); }
  const letra = (i, k) => LET[optOrder(i).indexOf(k)];

  function run() {
    const cards = S.ids.map((id, i) => {
      const q = BANK[id], ord = optOrder(i);
      return `<article class="qcard sim-q" id="q${i}" aria-labelledby="qt${i}">
        <div class="sim-qh"><span class="sim-n">${i + 1}</span><span class="tag">Tema ${q.t}</span></div>
        <p class="qtext" id="qt${i}">${fmt(q.q)}</p>
        <div class="opts" role="radiogroup" aria-labelledby="qt${i}">${ord.map((k, p) =>
          `<button class="opt" type="button" role="radio" aria-checked="${S.ans[i] === k}" data-i="${i}" data-k="${k}"><span class="k">${LET[p]}</span><span class="t">${fmt(q.o[k])}</span></button>`).join("")}</div>
      </article>`;
    }).join("");
    app.innerHTML = `
    <div class="sim-bar" role="region" aria-label="Estado del simulacro">
      <span class="sim-clock" id="sim-clock" aria-live="off">—</span>
      <span class="sim-count" id="sim-count"></span>
      <button class="btn" id="sim-hand" type="button">Entregar</button>
    </div>
    <details class="sim-sheet"><summary>Hoja de respuestas</summary><div class="column" id="sim-sheet"></div></details>
    ${cards}
    <div class="actions"><button class="btn ghost" id="sim-quit" type="button">Abandonar</button><button class="btn" id="sim-hand2" type="button">Entregar el simulacro</button></div>`;
    app.querySelectorAll(".opt").forEach((b) => b.onclick = () => pick(+b.dataset.i, +b.dataset.k));
    document.getElementById("sim-hand").onclick = handIn;
    document.getElementById("sim-hand2").onclick = handIn;
    document.getElementById("sim-quit").onclick = () => { if (confirm("¿Abandonar el simulacro? Se perderán las respuestas.")) home(); };
    sheet(); clock();
    stop(); if (S.end) tick = setInterval(clock, 1000);
  }
  function pick(i, k) {
    S.ans[i] = S.ans[i] === k ? null : k; save(); disarm();
    document.querySelectorAll(`#q${i} .opt`).forEach((b) => b.setAttribute("aria-checked", String(S.ans[i] === +b.dataset.k)));
    sheet();
  }
  function sheet() {
    const n = S.ans.filter((a) => a != null).length;
    document.getElementById("sim-count").innerHTML = `<b>${n}</b>/${S.ids.length} contestadas`;
    const el = document.getElementById("sim-sheet");
    el.innerHTML = S.ans.map((a, i) => `<a class="cell${a != null ? " now" : ""}" href="#q${i}" title="Pregunta ${i + 1}">${a != null ? letra(i, a) : i + 1}</a>`).join("");
  }
  function clock() {
    const c = document.getElementById("sim-clock"); if (!c) return;
    if (!S.end) { c.textContent = "sin reloj"; return; }
    const left = Math.max(0, Math.round((S.end - Date.now()) / 1000));
    c.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
    c.classList.toggle("low", left < 300);
    if (left <= 0) { stop(); finish(true); }
  }
  function stop() { if (tick) { clearInterval(tick); tick = null; } }
  function disarm() { armed = false; ["sim-hand", "sim-hand2"].forEach((id) => { const b = document.getElementById(id); if (b) b.textContent = id === "sim-hand" ? "Entregar" : "Entregar el simulacro"; }); }
  function handIn() {
    const blank = S.ans.filter((a) => a == null).length;
    if (blank && !armed) {
      armed = true;
      ["sim-hand", "sim-hand2"].forEach((id) => { document.getElementById(id).textContent = `${blank} en blanco · pulsa otra vez`; });
      return;
    }
    finish(false);
  }

  /* ---------- Resultados ---------- */
  function finish(timeout) {
    stop(); S.done = true;
    const g = grade();
    const best = store("gohp-sim-best"); if (best == null || g.nota > best) store("gohp-sim-best", g.nota);
    if (window.App && window.App.puntos) window.App.puntos({ asig: "gohp", tipo: "simulacro", aciertos: g.ok, total: g.n, nota: g.nota });
    // Repaso de fallos: las falladas y las que se dejaron en blanco vuelven a salir en el autotest.
    if (window.App && window.App.repaso) S.ids.forEach((id, i) => window.App.repaso.anotar("gohp", BANK[id], S.ans[i] === BANK[id].a));   // ranking
    const hist = store("gohp-sim-hist") || []; hist.push({ d: Date.now(), nota: g.nota, ok: g.ok, bad: g.bad, blank: g.blank });
    store("gohp-sim-hist", hist.slice(-30));
    session(STATE, null);
    const bars = Object.keys(g.byT).sort().map((t) => {
      const b = g.byT[t], pct = b.ok / b.n * 100;
      return `<div class="bar"><span>Tema ${t}</span><div class="track"><div class="fill" style="width:${pct}%;background:${pct < 50 ? "var(--bad)" : pct < 75 ? "var(--warn)" : "var(--ok)"}"></div></div><span class="v">${b.ok}/${b.n}</span></div>`;
    }).join("");
    const weak = Object.keys(g.byT).filter((t) => g.byT[t].ok / g.byT[t].n < 0.5);
    const review = S.ids.map((id, i) => ({ q: BANK[id], i, a: S.ans[i] })).filter((x) => x.a !== x.q.a).map((x) => {
      const blank = x.a == null;
      return `<div class="ritem${blank ? " blank" : ""}"><span class="tag">Pregunta ${x.i + 1} · Tema ${x.q.t} · ${esc(TOPICS[x.q.t].name)}</span>
        <p><b>${fmt(x.q.q)}</b></p>
        <p class="yours">${blank ? "La dejaste en blanco." : `Tu respuesta: ${letra(x.i, x.a)}) ${fmt(x.q.o[x.a])}`}</p>
        <p class="right">Correcta: ${letra(x.i, x.q.a)}) ${fmt(x.q.o[x.q.a])}</p><p>${fmt(x.q.e)}</p></div>`;
    }).join("");
    const msg = g.nota >= 8 ? "Muy buen test: así llegas al examen con ventaja." : g.nota >= 4 ? "Superas el mínimo de 4 para hacer media. Repasa los temas en rojo." : "No llegarías al 4 que hace falta: mira qué temas fallan y vuelve a intentarlo.";
    app.innerHTML = `
    ${timeout ? `<p class="callout warn"><b class="big">Se acabó el tiempo.</b> Se ha corregido con lo que tenías contestado.</p>` : ""}
    <header class="top"><span class="eyebrow">Simulacro · resultado</span><h1>${msg}</h1></header>
    <section class="score">
      <div class="big">${n2(g.nota)}<small> / 10</small></div>
      <div class="stats">
        <div><b>${g.ok}</b><span>Aciertos</span></div><div><b>${g.bad}</b><span>Fallos</span></div>
        <div><b>${g.blank}</b><span>En blanco</span></div><div><b>${n1(g.net)}</b><span>Netas</span></div>
      </div>
      <p class="muted" style="margin:0;font-size:14px;flex-basis:100%">${g.ok} aciertos − ${g.bad} fallos ÷ 3 = ${n1(g.net)} netas de ${g.n} → ${n1(g.net)} ÷ ${g.n} × 10.</p>
    </section>
    <div class="bytopic"><h3>Por temas</h3>${bars}</div>
    ${weak.length ? `<p class="callout">Repasa primero: ${weak.map((t) => `<a href="../teoria/guia.html#t${t}">tema ${t} (${esc(TOPICS[t].name)})</a>`).join(", ")}.</p>` : ""}
    <div class="actions" style="justify-content:flex-start"><button class="btn" id="sim-again" type="button">Otro simulacro</button>
      <a class="btn ghost" href="../teoria/chuleta.html">Repasar la chuleta</a></div>
    <section class="review" aria-label="Repaso"><h3>Fallos y preguntas en blanco</h3>${review || `<div class="perfect"><b>Sin fallos.</b> Un 10.</div>`}</section>`;
    document.getElementById("sim-again").onclick = home;
    window.scrollTo(0, 0);
  }

  /* ---------- Arranque: retoma el simulacro en curso si lo hay ---------- */
  const saved = session(STATE);
  if (saved && Array.isArray(saved.ids) && saved.ids.length && saved.ids.every((id) => BANK[id]) && !saved.done) {
    S = saved;
    if (S.end && S.end <= Date.now()) finish(true); else run();
  } else home();
})();
