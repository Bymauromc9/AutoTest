/*!
 * plan.js — plan de estudio (lo carga core.js; se pinta en el #plan de la portada y de cada asignatura).
 *
 *   Cada uno lo activa o lo desactiva y lo ajusta a su gusto (⚙): asignaturas, días de la semana que estudia,
 *   minutos al día, si prioriza el examen más cercano o reparte por igual, cuántos días antes de cada examen
 *   pasa a «sólo repaso» y qué entra (teoría, ejercicios, tests y repaso de fallos).
 *
 *   Con eso, cada día calcula qué toca: lo que te queda de cada asignatura (apartados de teoría sin estudiar,
 *   ejercicios sin hacer, temas del autotest sin aprobar con 7, preguntas del repaso de fallos) repartido entre
 *   los días de estudio que quedan hasta su examen. En los últimos días, simulacros, test general y repaso.
 *   Las tareas se marcan solas al hacerlas (o a mano) y el plan del día no cambia hasta mañana o hasta que
 *   cambies los ajustes.
 *
 *   localStorage: app-plan (ajustes) · app-plan-hoy (el plan de hoy: tareas, hechas y de dónde partías).
 *   Las dos van con el progreso de la cuenta (App.esProgreso).
 * Requiere: assets/js/core.js.
 */
(function () {
  "use strict";
  const App = window.App;
  if (!App || window.Plan) return;
  const { SUBJECTS, store, esc, icon, daysTo, repaso, historial } = App;
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const CORTO = ["D", "L", "M", "X", "J", "V", "S"];
  const MIN = { teoria: 12, ejercicio: 10, tema: 15, repaso: 0.5, simulacro: 60, general: 20, chuleta: 15 };
  const POR_DEFECTO = () => ({ on: false, v: 1, asig: Object.fromEntries(SUBJECTS.map((s) => [s.id, true])), dias: [1, 2, 3, 4, 5], min: 90,
    modo: "cercano", final: 5, incluir: { teoria: true, ejercicios: true, tests: true, repaso: true }, donde: { portada: true, asignaturas: true }, visto: false });
  const cfg = () => Object.assign(POR_DEFECTO(), store("app-plan") || {});
  const guardar = (c) => store("app-plan", c);
  const hoyK = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  const cuenta = (key) => { const d = store(key); return d && typeof d === "object" ? Object.keys(d).filter((k) => k[0] !== "_").length : 0; };
  const root = () => (document.body && document.body.dataset.root) || "";
  const minTxt = (m) => m >= 60 ? Math.floor(m / 60) + " h" + (m % 60 ? " " + Math.round(m % 60) + " min" : "") : Math.round(m) + " min";

  /** Días de estudio desde hoy (incluido) hasta antes del día «hasta» (no incluido). */
  function diasEstudio(c, hasta) {
    let n = 0; const d = new Date(); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < hasta; i++) { if (c.dias.includes((d.getDay() + i) % 7)) n++; }
    return n;
  }
  const esDiaDeEstudio = (c) => c.dias.includes(new Date().getDay());

  /** Lo que le queda a una asignatura, por tipo, con su recurso. */
  function pendiente(s, c) {
    const out = { teoria: [], ejercicios: [], temas: [], repaso: 0, simulacro: null, general: null, chuleta: null, autotest: null };
    s.resources.forEach((r) => {
      const p = r.progress;
      if (r.kind === "simulacro") out.simulacro = r;
      if (r.kind === "general") out.general = r;
      if (r.kind === "chuleta") out.chuleta = r;
      if (!p) return;
      if (p.t === "estudio" && c.incluir.teoria) { const q = (p.total || 0) - cuenta(p.key); if (q > 0) out.teoria.push({ r, q }); }
      if (p.t === "hechos" && c.incluir.ejercicios) { const q = (p.total || 0) - cuenta(p.key); if (q > 0) out.ejercicios.push({ r, q }); }
      if (p.t === "autotest") {
        out.autotest = r;
        if (c.incluir.tests) p.topics.forEach((t) => { const b = store(p.prefix + t); if (b == null || b < 7) out.temas.push({ r, t, b, nombre: (p.names && p.names[t]) || "Tema " + t }); });
      }
    });
    if (c.incluir.repaso) out.repaso = repaso.resumen(s.id).hoy;
    out.min = out.teoria.reduce((a, x) => a + x.q * MIN.teoria, 0) + out.ejercicios.reduce((a, x) => a + x.q * MIN.ejercicio, 0) + out.temas.length * MIN.tema;
    return out;
  }

  /** Situación de cada asignatura incluida: días al examen, minutos que le quedan y lo que necesita al día. */
  function situacion(c) {
    return SUBJECTS.filter((s) => c.asig[s.id] !== false).map((s) => {
      const dEx = s.exam ? daysTo(s.exam.date) : null;
      if (dEx != null && dEx < 0) return null;
      const horizonte = dEx != null ? dEx : 42;                    // sin fecha: como si fuera dentro de 6 semanas
      const P = pendiente(s, c);
      const finalYa = dEx != null && dEx <= c.final;
      const normales = Math.max(0, diasEstudio(c, Math.max(0, horizonte - c.final)));
      const necesita = finalYa ? 75 : normales ? P.min / normales : P.min;
      return { s, dEx, P, finalYa, normales, necesita, sinFecha: dEx == null };
    }).filter(Boolean);
  }

  /** Genera las tareas de hoy. */
  function generar(c) {
    const sit = situacion(c).filter((x) => x.necesita > 0 || x.P.repaso || x.finalYa);
    const peso = (x) => x.necesita * (c.modo === "cercano" ? (x.sinFecha ? 0.5 : 2 / (1 + x.dEx / 14)) : 1);
    const total = sit.reduce((a, x) => a + peso(x), 0) || 1;
    const tareas = [];
    sit.forEach((x) => {
      const s = x.s, P = x.P;
      let cupo = c.min * peso(x) / total;
      const add = (t) => { tareas.push(Object.assign({ s: s.id }, t)); };
      if (P.repaso && P.autotest) { const m = Math.max(5, P.repaso * MIN.repaso); add({ id: s.id + ":repaso", tipo: "repaso", texto: `Repaso de fallos: ${P.repaso} ${P.repaso === 1 ? "pregunta" : "preguntas"}`, href: P.autotest.href + "#test-R", min: m }); cupo -= m; }
      if (x.finalYa) {
        if (P.simulacro && cupo > 25) { add({ id: s.id + ":sim", tipo: "simulacro", texto: "Simulacro con reloj", href: P.simulacro.href, min: MIN.simulacro }); cupo -= MIN.simulacro; }
        if (P.general && cupo > 0) { add({ id: s.id + ":general", tipo: "general", texto: "Test general", href: P.general.href, min: MIN.general }); cupo -= MIN.general; }
        if (P.chuleta && cupo > 0) { add({ id: s.id + ":chuleta", tipo: "manual", texto: "Repasar la chuleta", href: P.chuleta.href, min: MIN.chuleta }); cupo -= MIN.chuleta; }
        P.temas.sort((a, b) => (a.b == null ? -1 : a.b) - (b.b == null ? -1 : b.b)).slice(0, cupo > 0 ? Math.max(1, Math.round(cupo / MIN.tema)) : 0)
          .forEach((t) => add({ id: s.id + ":tema:" + t.t, tipo: "tema", tema: String(t.t), texto: `Autotest: ${t.nombre}${t.b != null ? " (tu mejor nota: " + String(Math.round(t.b * 10) / 10).replace(".", ",") + ")" : ""}`, href: t.r.href + "#test-" + t.t, min: MIN.tema }));
        return;
      }
      if (cupo < 8 || !P.min) return;
      const partes = [["teoria", P.teoria.reduce((a, y) => a + y.q * MIN.teoria, 0)], ["ejercicios", P.ejercicios.reduce((a, y) => a + y.q * MIN.ejercicio, 0)], ["temas", P.temas.length * MIN.tema]];
      partes.forEach(([k, m]) => {
        if (!m) return;
        const cuota = cupo * m / P.min;
        if (k === "teoria" || k === "ejercicios") {
          const unidad = k === "teoria" ? MIN.teoria : MIN.ejercicio;
          let n = Math.max(1, Math.round(cuota / unidad));
          P[k].forEach((y) => {
            if (n <= 0) return;
            const q = Math.min(n, y.q); n -= q;
            add({ id: s.id + ":" + y.r.id, tipo: "contar", key: y.r.progress.key, n: q,
              texto: k === "teoria" ? `${y.r.title}: estudia ${q} ${q === 1 ? "apartado" : "apartados"}` : `${y.r.title}: haz ${q} ${q === 1 ? "ejercicio" : "ejercicios"}`,
              href: y.r.href, min: q * unidad });
          });
        } else {
          const n = Math.max(1, Math.round(cuota / MIN.tema));
          P.temas.sort((a, b) => (a.b == null ? -1 : a.b) - (b.b == null ? -1 : b.b)).slice(0, n)
            .forEach((t) => add({ id: s.id + ":tema:" + t.t, tipo: "tema", tema: String(t.t), texto: `Autotest: ${t.nombre}${t.b != null ? " (tu mejor nota: " + String(Math.round(t.b * 10) / 10).replace(".", ",") + ")" : ""}`, href: t.r.href + "#test-" + t.t, min: MIN.tema }));
        }
      });
    });
    const base = {};
    tareas.filter((t) => t.key).forEach((t) => { base[t.key] = cuenta(t.key); });
    return { fecha: hoyK(), v: c.v, tareas, hechas: {}, base, extra: false };
  }

  /** El plan de hoy (lo genera la primera vez que se mira cada día o al cambiar los ajustes). */
  function hoy(c, forzar) {
    let h = store("app-plan-hoy");
    if (forzar || !h || h.fecha !== hoyK() || h.v !== c.v) { const extra = h && h.fecha === hoyK() && h.extra; h = generar(c); h.extra = Boolean(extra); store("app-plan-hoy", h); }
    return h;
  }
  /** ¿Hecha? Cuenta lo que has avanzado hoy desde que se hizo el plan (o si la marcaste a mano). */
  function estado(t, h) {
    if (h.hechas[t.id]) return { hecha: true, txt: "" };
    const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
    const deHoy = historial.de(t.s).filter((x) => x.d >= hoy0.getTime());
    if (t.tipo === "contar") { const n = Math.max(0, cuenta(t.key) - (h.base[t.key] || 0)); return { hecha: n >= t.n, txt: `${Math.min(n, t.n)}/${t.n}` }; }
    if (t.tipo === "repaso") { const r = repaso.resumen(t.s).hoy; return { hecha: r === 0 || deHoy.some((x) => x.tipo === "repaso"), txt: r ? `quedan ${r}` : "" }; }
    if (t.tipo === "tema") return { hecha: deHoy.some((x) => x.tema === t.tema && x.tipo === "autotest"), txt: "" };
    if (t.tipo === "simulacro") return { hecha: deHoy.some((x) => x.tipo === "simulacro"), txt: "" };
    if (t.tipo === "general") return { hecha: deHoy.some((x) => x.tipo === "general"), txt: "" };
    return { hecha: false, txt: "" };
  }

  /* ---------------- Pintar ---------------- */
  function pintar() {
    const el = document.getElementById("plan");
    if (!el) return;
    const c = cfg(), sub = document.body.dataset.subject || "", enHub = Boolean(sub);
    if (!c.on) {
      el.innerHTML = enHub || c.visto ? (enHub ? "" : `<p class="plan-off">${icon("plan")} Plan de estudio desactivado · <button type="button" class="plan-link" data-plan-cfg>Activarlo</button></p>`)
        : `<section class="plan plan--invita"><span class="plan-ico">${icon("plan")}</span><div><b>¿Te hago un plan de estudio?</b><small>Dime qué días estudias y cuánto tiempo, y cada día te digo qué toca de cada asignatura hasta sus exámenes. Lo ajustas o lo apagas cuando quieras.</small></div>
          <span class="plan-acts"><button type="button" class="btn" data-plan-cfg>Crear mi plan</button><button type="button" class="btn ghost" data-plan-no>Ahora no</button></span></section>`;
      enlazar(el); return;
    }
    if ((enHub && !c.donde.asignaturas) || (!enHub && !c.donde.portada)) { el.innerHTML = ""; return; }
    const h = hoy(c);
    const descanso = !esDiaDeEstudio(c) && !h.extra;
    const tareas = h.tareas.filter((t) => !enHub || t.s === sub);
    const sit = situacion(c);
    const est = tareas.map((t) => ({ t, e: estado(t, h) }));
    const hechas = est.filter((x) => x.e.hecha).length;
    const minutos = tareas.reduce((a, t) => a + t.min, 0);
    const nombre = (id) => (SUBJECTS.find((s) => s.id === id) || {}).short || id;
    const necesita = sit.reduce((a, x) => a + x.necesita, 0);
    let proximo = "";
    if (descanso) { for (let i = 1; i <= 7; i++) { const d = (new Date().getDay() + i) % 7; if (c.dias.includes(d)) { proximo = i === 1 ? "mañana" : "el " + DIAS[d]; break; } } }
    const lista = est.length ? `<ol class="plan-list">${est.map(({ t, e }) => `<li class="${e.hecha ? "is-done" : ""}">
        <label class="plan-chk"><input type="checkbox" data-t="${esc(t.id)}"${e.hecha ? " checked" : ""}><span class="visually-hidden">Hecha</span></label>
        ${enHub ? "" : `<span class="plan-asig">${esc(nombre(t.s))}</span>`}
        <a class="plan-t" href="${esc(root() + t.href)}">${esc(t.texto)}</a>
        <span class="plan-min">${e.txt ? `<b>${esc(e.txt)}</b> · ` : ""}${minTxt(t.min)}</span></li>`).join("")}</ol>`
      : `<p class="plan-vacio">${enHub ? "Hoy no te toca nada de esta asignatura: el plan lo dedica a las demás." : "No te queda nada pendiente en las asignaturas de tu plan. ¡Enhorabuena! Repasa con los tests generales o añade asignaturas en ⚙."}</p>`;
    const estados = enHub ? sit.filter((x) => x.s.id === sub) : sit;
    el.innerHTML = `<section class="plan${descanso ? " is-descanso" : ""}" aria-labelledby="plan-h">
      <header class="plan-head"><span class="plan-ico">${icon("plan")}</span>
        <div><h2 id="plan-h">${descanso ? "Hoy descansas" : enHub ? "Tu plan de hoy para " + esc(nombre(sub)) : "Tu plan de hoy"}</h2>
          <small>${descanso ? `Según tu plan hoy no estudias. El próximo día es ${esc(proximo || "—")}.` : !tareas.length ? "Nada pendiente para hoy" : `${tareas.length} ${tareas.length === 1 ? "tarea" : "tareas"} · unos ${minTxt(minutos)} · ${hechas}/${tareas.length} hechas`}</small></div>
        <span class="plan-acts">${descanso ? `<button type="button" class="btn ghost" data-plan-extra>Estudiar igualmente</button>` : ""}<button type="button" class="plan-gear" data-plan-cfg title="Ajustar el plan" aria-label="Ajustar el plan">${icon("gear")}</button></span>
      </header>
      ${descanso ? "" : `${tareas.length ? `<div class="plan-bar" aria-hidden="true"><i style="width:${Math.round(100 * hechas / tareas.length)}%"></i></div>` : ""}${lista}`}
      ${estados.length ? `<ul class="plan-sit">${estados.map((x) => `<li><b>${esc(x.s.short)}</b> ${x.sinFecha ? "sin fecha de examen" : x.dEx === 0 ? "examen hoy" : "examen en " + x.dEx + (x.dEx === 1 ? " día" : " días")} · ${x.finalYa ? "fase de repaso final" : x.P.min ? `te quedan ~${minTxt(x.P.min)} de material · ${x.normales} ${x.normales === 1 ? "día" : "días"} de estudio` : "material al día"}</li>`).join("")}</ul>` : ""}
      ${!enHub && necesita > c.min * 1.1 ? `<p class="plan-aviso">⚠️ Con ${minTxt(c.min)} al día no llegas a todo antes de los exámenes: necesitarías unos <b>${minTxt(Math.ceil(necesita / 5) * 5)}</b>. Súbelo en ⚙ o prioriza.</p>` : ""}
      ${enHub ? `<p class="plan-pie"><a href="${esc(root())}index.html">Ver el plan completo →</a></p>` : ""}
    </section>`;
    enlazar(el);
    el.querySelectorAll("[data-t]").forEach((x) => x.addEventListener("change", () => {
      const hh = store("app-plan-hoy") || h; hh.hechas = hh.hechas || {};
      if (x.checked) hh.hechas[x.dataset.t] = true; else delete hh.hechas[x.dataset.t];
      store("app-plan-hoy", hh); pintar();
    }));
  }
  function enlazar(el) {
    el.querySelectorAll("[data-plan-cfg]").forEach((b) => { b.onclick = ajustes; });
    const no = el.querySelector("[data-plan-no]");
    if (no) no.onclick = () => { const c = cfg(); c.visto = true; guardar(c); pintar(); };
    const ex = el.querySelector("[data-plan-extra]");
    if (ex) ex.onclick = () => { const c = cfg(), h = hoy(c); h.extra = true; store("app-plan-hoy", h); pintar(); };
  }

  /* ---------------- Ajustes ---------------- */
  let dlg = null;
  function ajustes() {
    const c = cfg();
    if (!dlg) { dlg = document.createElement("dialog"); dlg.className = "plan-dlg"; document.body.appendChild(dlg); }
    dlg.innerHTML = `<form method="dialog" class="plan-form" id="plan-form">
      <header><h2>${icon("plan")} Tu plan de estudio</h2><button type="button" class="plan-x" value="cancel" aria-label="Cerrar">×</button></header>
      <label class="plan-switch"><input type="checkbox" name="on" checked><span>Plan activado</span><small>(desmárcalo para apagarlo)</small></label>
      <fieldset><legend>Asignaturas</legend><div class="plan-opts">${SUBJECTS.map((s) => `<label><input type="checkbox" name="asig" value="${s.id}"${c.asig[s.id] !== false ? " checked" : ""}> ${esc(s.short)} <small>${s.exam ? "examen el " + esc(s.exam.label.split(" · ")[0]) : "sin fecha"}</small></label>`).join("")}</div></fieldset>
      <fieldset><legend>Días que estudias</legend><div class="plan-dias">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label title="${DIAS[d]}"><input type="checkbox" name="dias" value="${d}"${c.dias.includes(d) ? " checked" : ""}><span>${CORTO[d]}</span></label>`).join("")}</div></fieldset>
      <label>Tiempo al día<select name="min">${[30, 45, 60, 90, 120, 150, 180, 240].map((m) => `<option value="${m}"${c.min === m ? " selected" : ""}>${minTxt(m)}</option>`).join("")}</select></label>
      <fieldset><legend>Cómo repartirlo</legend>
        <label><input type="radio" name="modo" value="cercano"${c.modo !== "igual" ? " checked" : ""}> Primero el examen más cercano</label>
        <label><input type="radio" name="modo" value="igual"${c.modo === "igual" ? " checked" : ""}> Según lo que le quede a cada una</label></fieldset>
      <label>Antes de cada examen, días de sólo repaso (simulacros, test general, chuleta)<select name="final">${[0, 3, 5, 7, 10].map((d) => `<option value="${d}"${c.final === d ? " selected" : ""}>${d ? d + " días" : "ninguno"}</option>`).join("")}</select></label>
      <fieldset><legend>Qué entra</legend><div class="plan-opts">
        <label><input type="checkbox" name="inc" value="teoria"${c.incluir.teoria ? " checked" : ""}> Teoría</label>
        <label><input type="checkbox" name="inc" value="ejercicios"${c.incluir.ejercicios ? " checked" : ""}> Ejercicios y prácticas</label>
        <label><input type="checkbox" name="inc" value="tests"${c.incluir.tests ? " checked" : ""}> Autotest por temas</label>
        <label><input type="checkbox" name="inc" value="repaso"${c.incluir.repaso ? " checked" : ""}> Repaso de fallos</label></div></fieldset>
      <fieldset><legend>Dónde verlo</legend><div class="plan-opts">
        <label><input type="checkbox" name="donde" value="portada"${c.donde.portada ? " checked" : ""}> En la portada</label>
        <label><input type="checkbox" name="donde" value="asignaturas"${c.donde.asignaturas ? " checked" : ""}> En la portada de cada asignatura</label></div></fieldset>
      <p class="plan-nota">El plan de hoy se recalcula al guardar. Las tareas se marcan solas cuando las haces (o márcalas tú).</p>
      <div class="plan-acts"><button type="submit" class="btn" value="ok">Guardar</button><button type="button" class="btn ghost plan-x" value="cancel">Cancelar</button></div>
    </form>`;
    const f = dlg.querySelector("form");
    dlg.querySelectorAll(".plan-x").forEach((b) => { b.onclick = () => dlg.close(); });
    f.onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(f), all = (k) => fd.getAll(k);
      const dias = all("dias").map(Number);
      const n = Object.assign(cfg(), {
        on: fd.has("on"), v: (c.v || 1) + 1, visto: true,
        asig: Object.fromEntries(SUBJECTS.map((s) => [s.id, all("asig").includes(s.id)])),
        dias: dias.length ? dias : [1, 2, 3, 4, 5], min: Number(fd.get("min")) || 60, modo: fd.get("modo") === "igual" ? "igual" : "cercano", final: Number(fd.get("final")) || 0,
        incluir: { teoria: all("inc").includes("teoria"), ejercicios: all("inc").includes("ejercicios"), tests: all("inc").includes("tests"), repaso: all("inc").includes("repaso") },
        donde: { portada: all("donde").includes("portada"), asignaturas: all("donde").includes("asignaturas") }
      });
      guardar(n); dlg.close(); pintar();
    };
    dlg.showModal();
  }

  window.Plan = Object.freeze({ pintar, ajustes, situacion: () => situacion(cfg()) });
  function iniciar() { pintar(); window.addEventListener("app:config", () => setTimeout(pintar, 0)); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
  // Si vuelves a la pestaña (p. ej. tras hacer un test en otra), se actualiza lo hecho.
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pintar(); });
})();
