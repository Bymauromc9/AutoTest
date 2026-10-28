/*!
 * chuletas.js — página de chuletas visuales de FLI (pestañas y tarjetas de práctica).
 * Requiere: assets/js/core.js, fli/js/formulas.js, fli/js/data/chuletas.js.
 */
(function () {
  "use strict";
  const { store, shuffle, esc } = window.App;
  const { SYM, paint, F, fx } = window.FLI;
  const { SHEET_TABS, NEXOS, NEXO_ERR, DRILL_NEXOS, EQUIV, NOT_EQUIV, DRILL_EQUIV, RULES, DRILL_RULES } = window.FLI.Chuletas;
  const app = document.getElementById("app");

const DRILLS={};
function drillHTML(id,title,cards){
  let d=DRILLS[id];
  if(!d||d.cards!==cards){ d=DRILLS[id]={cards,order:shuffle(cards.map((_,k)=>k)),i:0,shown:false}; }
  const c=cards[d.order[d.i]];
  return `<section class="drill" data-drill="${id}" data-title="${esc(title)}">
    <div class="drill-head"><h3>${title}</h3><span class="kbd">Tarjeta ${d.i+1} de ${cards.length}</span></div>
    <p class="drill-front">${fx(c.f)}</p>
    ${d.shown?`<div class="drill-back"><p class="ans">${fx(c.b)}</p>${c.n?`<p class="muted">${fx(c.n)}</p>`:""}</div>`:""}
    <div class="actions">
      ${d.shown?`<button class="btn" data-act="next">Siguiente tarjeta</button>`:`<button class="btn" data-act="show">Ver respuesta</button>`}
      <button class="skip" data-act="shuffle">Barajar y empezar de nuevo</button>
    </div></section>`;
}
function bindDrills(root){
  root.querySelectorAll(".drill [data-act]").forEach(b=>b.onclick=()=>{
    const sec=b.closest(".drill"), id=sec.dataset.drill, d=DRILLS[id], act=b.dataset.act;
    if(act==="show") d.shown=true;
    else if(act==="next"){ d.shown=false; d.i++; if(d.i>=d.cards.length){ d.order=shuffle(d.order); d.i=0; } }
    else if(act==="shuffle"){ d.order=shuffle(d.order); d.i=0; d.shown=false; }
    const tmp=document.createElement("div"); tmp.innerHTML=drillHTML(id,sec.dataset.title,d.cards);
    const fresh=tmp.firstElementChild; sec.replaceWith(fresh); bindDrills(fresh);
    const nb=fresh.querySelector('[data-act="next"],[data-act="show"]'); if(nb) nb.focus({preventScroll:true});
  });
}

/* ---- Pestañas ---- */
const SHEETS={
conectivas(){
  const R=[[1,1],[1,0],[0,1],[0,0]];
  const cols=[["p",(p,q)=>p],["q",(p,q)=>q],["¬p",(p)=>!p],["p ∧ q",(p,q)=>p&&q],["p ∨ q",(p,q)=>p||q],["p → q",(p,q)=>!p||q],["p ↔ q",(p,q)=>p===q]];
  const vals=cols.map(([,f])=>R.map(([p,q])=>!!f(!!p,!!q)));
  const head=cols.map(([h],j)=>`<th>${j<2?h:F(h)}</th>`).join("");
  const body=R.map((_,i)=>`<tr>${cols.map((c,j)=>{const v=vals[j][i]; const key=j>=3&&vals[j].filter(x=>x===v).length===1; return `<td class="tv ${v?"tv-v":"tv-f"}${key?" key":""}">${v?"V":"F"}</td>`;}).join("")}</tr>`).join("");
  const rules=[["not","Negación","se lee «no»","Cambia el valor: V pasa a F y F pasa a V."],["and","Conjunción","se lee «y»","Sólo es <b>V</b> si las dos son V. Basta un F para que sea F."],["or","Disyunción","se lee «o»","Sólo es <b>F</b> si las dos son F. Basta un V para que sea V."],["imp","Implicación","se lee «si… entonces…»","Sólo es <b>F</b> en el caso V → F (la promesa rota). Si el antecedente es F, vale V siempre."],["iff","Doble implicación","se lee «si y sólo si»","Es <b>V</b> cuando las dos valen lo mismo (V,V o F,F)."]];
  return `
  <section><h3>Tabla de verdad de las conectivas</h3>
    <p class="lead">Las casillas recuadradas son las «raras» de cada columna: si te sabes esa, te sabes toda la columna.</p>
    <div class="tw"><table class="t truth"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
  </section>
  <section><h3>Una regla para cada conectiva</h3>
    <div class="cards">${rules.map(([k,n,s,t])=>`<div class="rc k-${k}"><span class="sym">${SYM[k]}</span><h4>${n}</h4><span class="say">${s}</span><p>${t}</p></div>`).join("")}</div>
    <p class="callout"><b class="big">Truco de la implicación:</b> piensa en una promesa, «si sacas un 10, te compro un helado». Sólo te he engañado si sacas el 10 (V) y no hay helado (F). Si no sacas el 10, haga lo que haga, no he roto la promesa. Por eso «si el agua hierve a 50 ºC, los elefantes vuelan» es <b>verdadera</b> (F → F).</p>
  </section>
  <section><h3>Prioridad: quién se agrupa primero</h3>
    <div class="chain"><span class="lv">( )</span><span class="gt">›</span><span class="lv">${paint("¬")}</span><span class="gt">›</span><span class="lv">${paint("∧  ∨")}</span><span class="gt">›</span><span class="lv">${paint("→  ↔")}</span></div>
    <p class="lead">Si empatan en prioridad, se agrupa de <b>izquierda a derecha</b>.</p>
    <div class="tw"><table class="t"><thead><tr><th>Escrito</th><th>Se lee</th></tr></thead><tbody>
      <tr><td>${F("¬p ∨ q")}</td><td>${F("(¬p) ∨ q")}</td></tr>
      <tr><td>${F("p ∧ q → r")}</td><td>${F("(p ∧ q) → r")}</td></tr>
      <tr><td>${F("p → q ∨ r")}</td><td>${F("p → (q ∨ r)")}</td></tr>
      <tr><td>${F("p → q → r")}</td><td>${F("(p → q) → r")} <span class="note">(izquierda a derecha)</span></td></tr>
      <tr><td>${F("¬p ∧ q ↔ r")}</td><td>${F("((¬p) ∧ q) ↔ r")}</td></tr>
    </tbody></table></div>
  </section>
  <section><h3>¿Cuántas filas tiene la tabla?</h3>
    <p>Con <b>n</b> átomos distintos hay <b>2ⁿ</b> interpretaciones: 1 → 2 · 2 → 4 · 3 → 8 · 4 → 16 · 5 → 32.</p>
    <p class="callout">Para rellenarla sin olvidar ninguna fila (ejemplo con 3 átomos): la primera columna va de 4 en 4 (<code class="f">VVVVFFFF</code>), la segunda de 2 en 2 (<code class="f">VVFFVVFF</code>) y la última alterna (<code class="f">VFVFVFVF</code>).</p>
  </section>`;
},
nexos(){
  const rows=NEXOS.map(g=>`<tr class="grp k-${g.k}"><td colspan="3">${SYM[g.k]} · ${g.name}</td></tr>`+g.rows.map(([fr,fo,no])=>`<tr><td data-l="En castellano">${esc(fr).split(" · ").map(x=>"«"+x.replace(/\b([pq])\b/g,"<b>$1</b>")+"»").join(", ")}</td><td data-l="Fórmula" class="fcell">${F(fo)}</td><td data-l="Ojo" class="note">${esc(no)}</td></tr>`).join("")).join("");
  const errs=NEXO_ERR.map(([fr,leg,ok,bad,why])=>`<tr><td data-l="Frase">«${esc(fr)}»<br><span class="note">${esc(leg)}</span></td><td data-l="Correcto" class="fcell">✔ ${F(ok)}</td><td data-l="Error típico" class="fcell">✘ ${F(bad)}</td><td data-l="Por qué" class="note">${esc(why)}</td></tr>`).join("");
  return `
  <section><h3>La flecha: qué va a cada lado</h3>
    <div class="arrowfig">
      <div class="node"><span class="lbl">ANTECEDENTE · IZQUIERDA</span><span class="big">p</span><span class="role">Condición SUFICIENTE</span><span class="muted" style="font-size:14px">Si se da, garantiza la otra.</span>
        <ul><li>si <b>p</b>, …</li><li>cuando <b>p</b>, …</li><li>siempre que <b>p</b>, …</li><li><b>p</b> es suficiente para…</li><li>basta <b>p</b> para…</li></ul></div>
      <div class="arr" aria-hidden="true">→</div>
      <div class="node"><span class="lbl">CONSECUENTE · DERECHA</span><span class="big">q</span><span class="role">Condición NECESARIA</span><span class="muted" style="font-size:14px">Sin ella, no puede darse la otra.</span>
        <ul><li>… entonces <b>q</b></li><li>… sólo si <b>q</b></li><li><b>q</b> es necesario para…</li><li>no hay … sin <b>q</b></li></ul></div>
    </div>
    <p class="callout"><b class="big">La regla de oro:</b> lo que va detrás de <b>«si»</b> es el <b>origen</b> de la flecha. Lo que va detrás de <b>«sólo si»</b> es la <b>punta</b> de la flecha. El orden de la frase no importa: busca esas palabras.<br>
    <span class="muted">Otra forma de verlo: pregúntate «¿qué me <b>garantiza</b> qué?». Lo que garantiza va a la izquierda.</span></p>
  </section>
  <section><h3>Tabla de nexos</h3>
    <div class="legendc">${Object.keys(SYM).map(k=>`<span><span class="c-${k}" style="font-family:var(--f-mono)">${SYM[k]}</span> ${{not:"no",and:"y",or:"o",imp:"si… entonces",iff:"si y sólo si"}[k]}</span>`).join("")}</div>
    <div class="tw"><table class="t stack"><thead><tr><th>En castellano</th><th>Fórmula</th><th>Ojo</th></tr></thead><tbody>${rows}</tbody></table></div>
  </section>
  <section><h3>Los errores que más se repiten</h3>
    <div class="tw"><table class="t stack"><thead><tr><th>Frase</th><th>Correcto</th><th>Error típico</th><th>Por qué</th></tr></thead><tbody>${errs}</tbody></table></div>
  </section>
  ${drillHTML("nexos","Ponte a prueba: formaliza la frase",DRILL_NEXOS)}`;
},
equiv(){
  const rows=EQUIV.map(g=>`<tr class="grp k-${g.k}"><td colspan="3">${esc(g.g)}</td></tr>`+g.rows.map(([n,f,t,star])=>`<tr><td data-l="Nombre"><b>${esc(n)}</b>${star?'<span class="star" title="Aparece en la tabla de equivalencias de las diapositivas">diapositiva</span>':""}</td><td data-l="Equivalencia" class="fcell">${F(f)}</td><td data-l="Truco" class="note">${paint(esc(t))}</td></tr>`).join("")).join("");
  const neq=NOT_EQUIV.map(([a,b,w])=>`<tr><td data-l="Fórmula" class="fcell">${F(a)}</td><td data-l="NO equivale a" class="fcell">✘ ${F(b)}</td><td data-l="Contraejemplo" class="note">${fx(w)}</td></tr>`).join("");
  return `
  <section><h3>Tabla de equivalencias</h3>
    <p class="lead"><code class="f">≡</code> significa que las dos fórmulas tienen la misma tabla de verdad, así que puedes <b>sustituir</b> una por otra en cualquier sitio y en los dos sentidos. Las marcadas con <span class="star">diapositiva</span> son las de la tabla de clase; las demás también te harán falta.</p>
    <div class="tw"><table class="t stack"><thead><tr><th>Nombre</th><th>Equivalencia</th><th>Truco</th></tr></thead><tbody>${rows}</tbody></table></div>
  </section>
  <section><h3>Las 4 caras de una implicación</h3>
    <div class="sq">
      <div class="g1"><small>Original</small>${F("p → q")}<span>Si llueve, me mojo.</span></div>
      <div class="g2"><small>Recíproca</small>${F("q → p")}<span>Si me mojo, llueve.</span></div>
      <div class="g1"><small>Contrarrecíproca</small>${F("¬q → ¬p")}<span>Si no me mojo, no llueve.</span></div>
      <div class="g2"><small>Contraria</small>${F("¬p → ¬q")}<span>Si no llueve, no me mojo.</span></div>
    </div>
    <p class="callout">Las del <b>mismo color</b> son equivalentes entre sí: original ≡ contrarrecíproca (verde) y recíproca ≡ contraria (morado). Pero la original <b>no</b> equivale a la recíproca: puedo mojarme sin que llueva (una manguera).</p>
  </section>
  <section><h3>Parecen equivalentes… y NO lo son</h3>
    <div class="tw"><table class="t stack"><thead><tr><th>Fórmula</th><th>NO equivale a</th><th>Contraejemplo</th></tr></thead><tbody>${neq}</tbody></table></div>
    <p class="lead">Para demostrar que dos fórmulas <b>no</b> son equivalentes basta una interpretación donde valgan distinto. Para demostrar que <b>sí</b> lo son, hay que transformar una en la otra con la tabla de arriba (o comparar las tablas de verdad completas).</p>
  </section>
  <section><h3>Receta para pasar a FNC (en este orden)</h3>
    <ol style="margin:0;padding-left:22px;display:flex;flex-direction:column;gap:4px">
      <li>Eliminar ${F("↔")} y ${F("→")} (interdefiniciones).</li>
      <li>Meter las negaciones hacia dentro (De Morgan).</li>
      <li>Quitar dobles negaciones.</li>
      <li>Distributiva de ${F("∨")} sobre ${F("∧")}: ${F("α ∨ (β ∧ γ) ≡ (α ∨ β) ∧ (α ∨ γ)")}.</li>
      <li>Quitar paréntesis sobrantes (asociatividad).</li>
      <li>Simplificar: cláusulas con ${F("p ∨ ¬p")} desaparecen (son V), literales repetidos se escriben una vez.</li>
    </ol>
  </section>
  ${drillHTML("equiv","Ponte a prueba: ¿a qué equivale?",DRILL_EQUIV)}`;
},
impl(){
  const rows=RULES.map(([n,f,p,e])=>`<tr><td data-l="Nombre"><b>${esc(n)}</b></td><td data-l="Esquema" class="fcell">${F(f)}</td><td data-l="En palabras">${esc(p)}${e?`<br><span class="note">${esc(e)}</span>`:""}</td></tr>`).join("");
  return `
  <section><h3>≡ y ⊨ no son lo mismo</h3>
    <div class="cards">
      <div class="rc k-iff"><span class="sym">≡</span><h4>Equivalencia lógica</h4><p>Funciona en los <b>dos sentidos</b>. Sirve para <b>sustituir</b> una fórmula por otra.</p><p>${F("α ≡ β")} ⟺ ${F("α ↔ β")} es tautología.</p></div>
      <div class="rc k-imp"><span class="sym">⊨</span><h4>Implicación lógica</h4><p>Funciona en <b>un solo sentido</b>. Sirve para <b>deducir</b> una conclusión de unas premisas.</p><p>${F("α ⊨ β")} ⟺ ${F("α → β")} es tautología.</p></div>
    </div>
  </section>
  <section><h3>Con ${F("p → q")} en la mano…</h3>
    <div class="mp">
      <div class="yes"><span class="v">✔ Tengo p ⇒ q</span>${F("{p → q, p} ⊨ q")}<span>Modus ponens</span></div>
      <div class="yes"><span class="v">✔ Tengo ¬q ⇒ ¬p</span>${F("{p → q, ¬q} ⊨ ¬p")}<span>Modus tollens</span></div>
      <div class="no"><span class="v">✘ Tengo q ⇒ ¿p?</span>${F("{p → q, q} ⊭ p")}<span>Falacia: afirmar el consecuente</span></div>
      <div class="no"><span class="v">✘ Tengo ¬p ⇒ ¿¬q?</span>${F("{p → q, ¬p} ⊭ ¬q")}<span>Falacia: negar el antecedente</span></div>
    </div>
    <p class="callout warn">Las dos falacias fallan con el mismo contraejemplo: <b>p = F, q = V</b>. «Si llueve, el suelo se moja. El suelo está mojado.» No puedo concluir que haya llovido: alguien ha podido regar.</p>
  </section>
  <section><h3>Implicaciones lógicas de clase</h3>
    <div class="tw"><table class="t stack"><thead><tr><th>Nombre</th><th>Esquema</th><th>En palabras</th></tr></thead><tbody>${rows}</tbody></table></div>
  </section>
  ${drillHTML("impl","Ponte a prueba: ¿qué se concluye?",DRILL_RULES)}`;
},
clasif(){
  const mini=s=>`<span class="mini">${s.split("").map(c=>`<span class="cell ${c==="V"?"ok":"bad"}">${c}</span>`).join("")}</span>`;
  return `
  <section><h3>Tipos de fórmulas según su última columna</h3>
    <div class="spectrum">
      <div class="brace b-sat">SATISFACIBLE · al menos una V</div>
      <div class="box"><b>Tautología</b>${mini("VVVV")}<span class="muted">todas V</span></div>
      <div class="box"><b>Contingente</b>${mini("VFVV")}<span class="muted">hay V y hay F</span></div>
      <div class="box"><b>Contradicción</b>${mini("FFFF")}<span class="muted">todas F (insatisfacible)</span></div>
      <div class="brace b-fal">FALSEABLE · al menos una F</div>
    </div>
    <p class="callout">Toda tautología es satisfacible · toda contradicción es falseable · contingente = satisfacible <b>y</b> falseable. Lo contrario no se cumple: una fórmula satisfacible no tiene por qué ser tautología.</p>
  </section>
  <section><h3>Al negar una fórmula</h3>
    <div class="tw"><table class="t"><thead><tr><th>Si α es…</th><th>entonces ¬α es…</th></tr></thead><tbody>
      <tr><td>Tautología</td><td>Contradicción</td></tr><tr><td>Contradicción</td><td>Tautología</td></tr><tr><td>Contingente</td><td>Contingente</td></tr>
    </tbody></table></div>
  </section>
  <section><h3>Validez de un razonamiento: dos planteamientos</h3>
    <div class="cards">
      <div class="rc k-imp"><span class="sym">→</span><h4>Directo</h4><p>${F("α₁ ∧ … ∧ αₙ → β")} es <b>tautología</b>.</p></div>
      <div class="rc k-not"><span class="sym">¬</span><h4>Refutación</h4><p>${F("α₁ ∧ … ∧ αₙ ∧ ¬β")} es <b>contradicción</b>.</p></div>
    </div>
    <p class="lead">Los dos dicen lo mismo: es imposible que las premisas sean V y la conclusión F.</p>
  </section>
  <section><h3>Conjuntos de fórmulas</h3>
    <div class="tw"><table class="t stack"><thead><tr><th>Situación</th><th>Resultado</th></tr></thead><tbody>
      <tr><td data-l="Situación">Conjunto satisfacible + otra fbf</td><td data-l="Resultado">Puede dejar de ser satisfacible (${F("{p}")} + ${F("¬p")}).</td></tr>
      <tr><td data-l="Situación">Conjunto insatisfacible + lo que sea</td><td data-l="Resultado">Sigue siendo insatisfacible: añadir fórmulas sólo quita modelos.</td></tr>
      <tr><td data-l="Situación">Conjunto que contiene una contradicción</td><td data-l="Resultado">Insatisfacible.</td></tr>
      <tr><td data-l="Situación">Premisas insatisfacibles</td><td data-l="Resultado">Se sigue cualquier conclusión (ley de inconsistencia).</td></tr>
    </tbody></table></div>
  </section>`;
}
};

/* Pestaña activa: se toma del hash (#nexos, #equiv…) para poder enlazar a una chuleta concreta;
   si no hay hash, se recuerda la última abierta. */
function currentTab(){
  const h=decodeURIComponent(location.hash.slice(1));
  if(SHEETS[h]) return h;
  const s=store("fli-tab"); return SHEETS[s]?s:"conectivas";
}
function sheets(){
  const tab=currentTab();
  app.innerHTML=`
  <header class="top"><span class="eyebrow">Teoría · Tema 2</span><h1>Chuletas visuales</h1>
    <p class="muted">Para memorizar: tablas de verdad, del castellano a las conectivas, equivalencias, reglas de inferencia y clasificación de fórmulas, con tarjetas de práctica.</p></header>
  <nav class="tabs" role="tablist" aria-label="Chuletas">${SHEET_TABS.map(([k,l])=>`<a role="tab" class="tab${k===tab?" on":""}" aria-selected="${k===tab}" href="#${k}" data-tab="${k}">${l}</a>`).join("")}</nav>
  <div class="sheet" role="tabpanel">${SHEETS[tab]()}</div>
  <div class="actions" style="justify-content:flex-start"><a class="btn ghost" href="autotest.html">Practicar con el autotest</a></div>`;
  app.querySelectorAll("[data-tab]").forEach(b=>b.onclick=(ev)=>{ ev.preventDefault(); store("fli-tab",b.dataset.tab); history.replaceState(null,"","#"+b.dataset.tab); sheets(); });
  bindDrills(app);
}


window.addEventListener("hashchange", sheets);
sheets();
})();
