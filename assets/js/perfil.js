/*!
 * perfil.js — perfil público (perfil.html): puntos, puesto, puntos por asignatura y vitrina de insignias.
 *   perfil.html?u=<uid>        el perfil de esa cuenta (enlazado desde el ranking)
 *   perfil.html?n=<usuario>    el de ese nombre de usuario
 *   perfil.html                el tuyo: además eliges las destacadas de tu vitrina y ves las que te faltan
 * Requiere: assets/js/core.js, assets/js/cuentas.js y assets/js/insignias.js.
 */
(function () {
  "use strict";
  const { esc, icon, ROOT, SUBJECTS, sesion } = window.App;
  const C = window.Cuentas, I = window.Insignias;
  const box = document.getElementById("perfil");
  if (!box || !C || !I) return;
  const q = new URLSearchParams(location.search), fmt = C.fmt;
  const ses = sesion();
  let U = null, CAT = [], mio = false, editando = false, sel = [];

  const hace = (ts) => {
    if (!ts) return "nunca";
    const d = Math.floor((Date.now() - new Date(ts)) / 86400000);
    return d <= 0 ? "hoy" : d === 1 ? "ayer" : d < 30 ? "hace " + d + " días" : "el " + I.fechaCorta(ts);
  };

  async function cargar() {
    if (!(await C.servidor())) { box.innerHTML = `<p class="callout warn">Los perfiles necesitan conexión con el servidor.</p>`; return; }
    const miUid = ses && !ses.local ? await C.miUid() : null;
    const uid = q.get("u") || (!q.get("n") ? miUid : null);
    if (!uid && !q.get("n")) {
      box.innerHTML = `<p class="callout">${ses && ses.local ? "Los perfiles locales no tienen perfil público." : "Entra con tu cuenta para ver tu perfil."} <a href="${ROOT}ranking.html">Ver el ranking</a></p>`;
      return;
    }
    try { [U, CAT] = await Promise.all([C.perfil(uid ? { uid } : { nombre: q.get("n") }), I.catalogo()]); }
    catch (e) { box.innerHTML = `<p class="callout warn">${esc(e.message || "No se ha podido cargar el perfil.")}</p>`; return; }
    if (!U) { box.innerHTML = `<p class="callout warn">No hay ninguna cuenta con ese nombre. <a href="${ROOT}ranking.html">Ver el ranking</a></p>`; return; }
    mio = Boolean(miUid && miUid === U.uid);
    document.title = U.nombre + " · Perfil";
    if (mio) { const n = await I.revisar(true).catch(() => []); if (n.length) U = (await C.perfil({ uid: U.uid })) || U; }
    U.pos = await C.posicion("puntos", U.puntos || 0);
    pintar();
  }

  function vitrinaDe() {
    const m = I.porId(CAT), tiene = U.insignias || {};
    const ganadas = Object.keys(tiene).filter((id) => m[id]).map((id) => ({ d: m[id], e: tiene[id] || {} }));
    const dest = (Array.isArray(U.vitrina) ? U.vitrina : []).filter((id) => tiene[id] && m[id]);
    return { m, tiene, ganadas, dest };
  }

  function pintar() {
    const V = vitrinaDe();
    const semana = C.datos.semana();
    const asigs = SUBJECTS.map((s) => ({ s, n: U[s.id] || 0 }));
    const maxA = Math.max(1, ...asigs.map((x) => x.n));
    const destacadas = V.dest.map((id) => V.m[id]);
    const resto = I.ordenar(V.ganadas.map((x) => x.d)).filter((d) => !V.dest.includes(d.id) || editando);
    const pieDe = (d) => { const e = V.tiene[d.id] || {}; return `<small>${esc(d.desc || "")}</small>${e.m ? `<small><i>${esc(e.m)}</i></small>` : ""}${e.f ? `<small>${esc(I.fechaCorta(e.f))}</small>` : ""}`; };
    const una = (d, tam) => editando
      ? I.html(d, { tam: "md", n: (V.tiene[d.id] || {}).n, boton: `data-ins="${esc(d.id)}" aria-pressed="${sel.includes(d.id)}"`, sel: sel.includes(d.id) })
      : I.html(d, { tam: tam || "md", n: (V.tiene[d.id] || {}).n, f: (V.tiene[d.id] || {}).f, m: (V.tiene[d.id] || {}).m, pie: tam === "lg" ? pieDe(d) : "" });
    const faltan = mio ? I.ordenar(CAT.filter((d) => d.activa !== false && !V.tiene[d.id])) : [];
    box.innerHTML = `
      <header class="perfil-hero">
        <span class="perfil-av" aria-hidden="true">${esc((U.nombre || "?").charAt(0).toUpperCase())}</span>
        <div><span class="eyebrow">${mio ? "Tu perfil público" : "Perfil"}</span><h1>${esc(U.nombre)}${U.bloqueado ? ' <span class="cta-tag">bloqueada</span>' : ""}</h1>
          <p>${U.pos ? `Puesto <b>#${U.pos}</b> del ranking · ` : ""}en la web desde ${esc(I.fechaCorta(U.creado) || "—")} · último test ${esc(hace(U.ultimo))}</p>
          ${destacadas.length && !editando ? `<div class="perfil-dest" aria-label="Insignias destacadas">${destacadas.map((d) => I.html(d, { tam: "sm" })).join("")}</div>` : ""}</div>
      </header>
      <div class="perfil-tiles">
        <div><b>${fmt(U.puntos)}</b><span>puntos</span></div>
        <div><b>${fmt(U[semana])}</b><span>esta semana</span></div>
        <div><b>${fmt(U.tests)}</b><span>tests terminados</span></div>
        <div><b>${V.ganadas.length}<small style="font-size:15px;color:var(--muted)">/${CAT.length}</small></b><span>insignias</span></div>
      </div>

      <section class="perfil-sec" aria-labelledby="h-vit">
        <h2 id="h-vit">${icon("medal")}Vitrina de insignias</h2>
        ${mio ? `<div class="vit-bar"><p>${editando ? `Elige hasta <b>6</b> para destacar (salen junto a tu nombre en el ranking): <b id="vit-n">${sel.length}</b>/6` : "Las destacadas salen junto a tu nombre en el ranking."}</p>
          <span>${editando ? `<button type="button" class="btn" id="vit-ok">Guardar</button> <button type="button" class="btn ghost" id="vit-no">Cancelar</button>` : V.ganadas.length ? `<button type="button" class="btn ghost" id="vit-ed">${icon("star")}Elegir destacadas</button>` : ""}</span></div>
          <p class="callout warn" id="vit-err" hidden></p>` : ""}
        <div class="vitrina">
          ${destacadas.length && !editando ? `<h3>Destacadas</h3><div class="vitrina-row destacadas">${destacadas.map((d) => una(d, "lg")).join("")}</div>` : ""}
          ${resto.length ? `<h3>${editando ? "Todas tus insignias" : destacadas.length ? "Las demás" : "Todas"}</h3><div class="vitrina-row">${resto.map((d) => una(d)).join("")}</div>` : ""}
          ${!V.ganadas.length ? `<p class="vitrina-vacia">${mio ? "Todavía no tienes insignias. Termina tu primer test y caerá la primera." : "Todavía no tiene insignias."}</p>` : ""}
        </div>
      </section>

      ${mio && faltan.length && !editando ? `<section class="perfil-sec" aria-labelledby="h-faltan">
        <h2 id="h-faltan">${icon("flag")}Por conseguir</h2>
        <div class="porconseguir">${faltan.map((d) => {
          const auto = d.tipo === "auto" && I.CAMPOS[d.campo];
          const v = auto ? Math.min(U[d.campo] || 0, d.umbral) : 0;
          const pie = auto ? `<small>${fmt(v)} / ${fmt(d.umbral)} ${esc(I.CAMPOS[d.campo])}</small><span class="ins-prog"><i style="width:${Math.round(100 * v / d.umbral)}%"></i></span>`
            : `<small>${esc(d.desc || "La entrega un administrador.")}</small>`;
          return I.html(d, { bloqueada: true, pie });
        }).join("")}</div>
      </section>` : ""}

      <section class="perfil-sec" aria-labelledby="h-asig">
        <h2 id="h-asig">${icon("chart")}Puntos por asignatura</h2>
        <ul class="bars">${asigs.map((x) => `<li><span>${esc(x.s.short)}</span><span class="m"><i style="width:${Math.round(100 * x.n / maxA)}%"></i></span><b>${fmt(x.n)}</b></li>`).join("")}</ul>
      </section>
      <p class="muted"><a href="${ROOT}ranking.html">${icon("trophy")} Ver el ranking</a>${mio ? ` · <a href="${ROOT}cuenta.html#estadisticas">Tus estadísticas</a>` : ""}</p>`;
    if (!mio) return;
    const ed = document.getElementById("vit-ed");
    if (ed) ed.onclick = () => { editando = true; sel = V.dest.slice(); pintar(); };
    const no = document.getElementById("vit-no");
    if (no) no.onclick = () => { editando = false; pintar(); };
    box.querySelectorAll("[data-ins]").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.ins, i = sel.indexOf(id);
      if (i >= 0) sel.splice(i, 1); else if (sel.length < 6) sel.push(id); else { C.toast("Como mucho 6", "Quita una antes de elegir otra."); return; }
      pintar();
    }));
    const ok = document.getElementById("vit-ok");
    if (ok) ok.onclick = async () => {
      ok.disabled = true;
      try { await C.guardarVitrina(sel); U.vitrina = sel.slice(); editando = false; pintar(); C.toast("Vitrina guardada", "Tus destacadas ya salen en el ranking."); }
      catch (e) { const er = document.getElementById("vit-err"); er.textContent = e.status === 403 ? "No se ha podido guardar (¿están publicadas las reglas nuevas de Firestore?)." : (e.message || "No se ha podido guardar."); er.hidden = false; ok.disabled = false; }
    };
  }
  cargar();
})();
