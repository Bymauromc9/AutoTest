/*!
 * portal.js — portada del sitio a partir de App.SUBJECTS (assets/js/core.js):
 * «continuar donde lo dejaste», próximo examen y una tarjeta por asignatura con su progreso.
 */
(function () {
  "use strict";
  const { SUBJECTS, SECTIONS, store, esc, icon, daysTo, progress } = window.App;
  const list = document.getElementById("subjects");
  if (!list) return;

  function pintarAsignaturas() {
    list.innerHTML = SUBJECTS.map((s) => {
      const pct = progress.subject(s);
      const counts = SECTIONS.map((x) => ({ x, n: s.resources.filter((r) => r.sec === x.id).length }));
      const exam = s.exam && daysTo(s.exam.date) >= 0 ? `<span class="subject__exam">${icon("calendar")}Examen en ${daysTo(s.exam.date)} días</span>` : "";
      return `
      <li class="subject">
        <a class="subject__link" href="${esc(s.home)}">
          <span class="subject__top"><span class="subject__short">${esc(s.short)}</span>${exam}<span class="subject__go">${icon("chevron")}</span></span>
          <span class="subject__name">${esc(s.name)}</span>
          <span class="subject__desc">${esc(s.desc)}</span>
          <span class="subject__sections">${counts.map((c) => `<span>${icon(c.x.icon)}${esc(c.x.label)} <b>${c.n}</b></span>`).join("")}</span>
          <span class="subject__prog"><span class="res-bar"><span style="width:${pct}%"></span></span><span class="subject__pct">${pct}%</span></span>
        </a>
      </li>`;
    }).join("");
  }
  pintarAsignaturas();
  // Si llegan fechas de exámenes nuevas (panel de administración), se repinta.
  window.addEventListener("app:config", pintarAsignaturas);

  // Continuar con el último recurso abierto, en cualquier asignatura.
  const last = store("app-last");
  const s = last && SUBJECTS.find((x) => x.id === last.s);
  const r = s && s.resources.find((x) => x.id === last.r);
  const box = document.getElementById("continue");
  if (box && r) {
    box.innerHTML = `<a class="continue" href="${esc(r.href)}">${icon("arrow")}<span><small>Continuar donde lo dejaste · ${esc(s.short)}</small><b>${esc(r.title)}</b></span></a>`;
    box.hidden = false;
  }
})();

/* Cuenta (puntos y puesto), mini ranking y cuenta atrás de los exámenes. */
(function () {
  "use strict";
  const { SUBJECTS, esc, icon, daysTo, sesion, ROOT } = window.App;

  const ex = document.getElementById("exams");
  function pintarExamenes() {
    const items = SUBJECTS.map((s) => {
      if (!s.exam) return `<div class="exam-cd is-tbd"><span class="exam-cd__n">?</span><span class="exam-cd__t"><b>${esc(s.short)}</b><small class="exam-cd__l">fecha del examen por confirmar</small><small class="exam-cd__s">sin fecha</small></span></div>`;
      const d = daysTo(s.exam.date);
      if (d < 0) return "";
      const txt = d === 0 ? "¡es hoy!" : d === 1 ? "día para el examen" : "días para el examen";
      const [y, m, dd] = s.exam.date.split("-").map(Number);
      const corta = new Date(y, m - 1, dd).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
      return `<a class="exam-cd" href="${esc(s.exam.href || s.home)}" title="${esc(s.name)} · ${esc(s.exam.label)}"><span class="exam-cd__n">${d}</span><span class="exam-cd__t"><b>${esc(s.short)}${s.exam.name ? " · " + esc(s.exam.name) : ""}</b><small class="exam-cd__l">${txt} · ${esc(s.exam.label.split(" · ")[0])}${(s.examsLeft || []).length ? " · luego " + s.examsLeft.map((e) => esc(e.name || "examen") + " en " + daysTo(e.date) + " días").join(", ") : ""}</small><small class="exam-cd__s">${d === 1 ? "día" : "días"} · ${esc(corta)}</small></span></a>`;
    }).join("");
    ex.innerHTML = items;
    ex.hidden = !items;
  }
  if (ex) { pintarExamenes(); window.addEventListener("app:config", pintarExamenes); }

  const box = document.getElementById("cuenta-strip");
  const ses = sesion();
  if (!box || !ses) return;
  const av = (n, local) => `<span class="cta-av${local ? " cta-av--local" : ""}" aria-hidden="true">${esc((n || "?").charAt(0).toUpperCase())}</span>`;
  function pintar(d, top) {
    const fmt = (n) => Number(n || 0).toLocaleString("es-ES");
    const extra = ses.local ? "perfil local · no entra en el ranking" : d.posicion ? `puesto <b>#${d.posicion}</b> del ranking` : "termina un test para entrar en el ranking";
    const mini = top && top.length ? `<ol class="cta-mini" aria-label="Los primeros del ranking">${top.slice(0, 5).map((f) =>
      `<li${f.yo ? ' class="is-me"' : ""}><span class="p">${f.pos}</span><span class="n">${esc(f.nombre)}${f.yo ? " (tú)" : ""}</span><span class="v">${fmt(f.puntos)}</span></li>`).join("")}</ol>` : "";
    box.innerHTML = `<section class="cta-strip" aria-label="Tu cuenta">
      ${av(ses.nombre, ses.local)}<span class="cta-strip__who"><b>Hola, ${esc(ses.nombre)}</b><small><b>${fmt(d.puntos)}</b> puntos · ${extra}</small></span>
      <span class="cta-strip__links"><a class="btn ghost" href="${ROOT}ranking.html">${icon("trophy")}Ranking</a><a class="btn ghost" href="${ROOT}cuenta.html?cambiar=1" title="Cambiar de cuenta">${icon("swapuser")}Cambiar</a></span>
      ${mini}</section>`;
  }
  const cache = (window.Cuentas ? window.Cuentas.lista() : (window.App.store("app-cuentas") || [])).find((c) => c.id === ses.id) || {};
  pintar({ puntos: cache.puntos || 0, posicion: cache.posicion || null });
  // cuentas.js llega después (lo carga core.js): datos al día y los cinco primeros.
  function cuandoCuentas(fn, n) { if (window.Cuentas) fn(window.Cuentas); else if ((n || 0) < 50) setTimeout(() => cuandoCuentas(fn, (n || 0) + 1), 100); }
  cuandoCuentas(async (C) => {
    const d = await C.yo();
    let top = null;
    if (!ses.local && (await C.servidor())) { try { top = (await C.ranking("total")).filas; } catch (e) { top = null; } }
    pintar(d || {}, top);
  });
})();
