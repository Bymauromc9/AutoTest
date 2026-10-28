/*!
 * autotest.js — página del autotest de FLI: tests por tema, test general, cambio de tanda y resultados.
 * Requiere: assets/js/core.js, fli/js/formulas.js, fli/js/data/banco.js.
 */
(function () {
  "use strict";
  const { store, session, shuffle } = window.App;
  const { BANK, TOPICS, TOPIC_IDS, GENERAL_MIX, LETTERS, fmt } = window.FLI;

/* ======================= ESTADO ======================= */
const S = {view:"home", key:null, qs:[], i:0, ans:[], len:"20", penalty:false, batch:1, flash:false};
const saved = store("fli-settings"); if(saved){S.len=saved.len||S.len; S.penalty=!!saved.penalty;}

/* Registro de preguntas ya vistas: los tests nuevos y el botón «Cambiar preguntas» dan prioridad a las que aún no han salido */
const SEEN = new Set((store("fli-seen")||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<BANK.length));
function saveSeen(){ store("fli-seen",[...SEEN]); }

function prep(item){ // baraja opciones conservando correcta y notas
  const idx=shuffle(item.o.map((_,k)=>k));
  return {src:item, id:item.id, t:item.t, q:item.q, e:item.e, o:idx.map(k=>item.o[k]), a:idx.indexOf(item.a), w:idx.map(k=>(item.w&&item.w[k])||null)};
}
/* Elige n preguntas del tema t que NO estén en «exclude», priorizando las no vistas */
function pickTopic(t,n,exclude){
  const topic=TOPIC_IDS[t]||[];
  const cand=topic.filter(i=>!exclude.has(i));
  let out=shuffle(cand.filter(i=>!SEEN.has(i))).slice(0,n);
  if(out.length<n){
    // Ya han salido todas las del tema: empieza una ronda nueva (las de la tanda actual cuentan como vistas)
    topic.forEach(i=>{ if(!exclude.has(i)) SEEN.delete(i); });
    const taken=new Set(out);
    out=out.concat(shuffle(cand.filter(i=>!taken.has(i))).slice(0,n-out.length));
  }
  if(out.length<n){ // el tema no tiene suficientes preguntas distintas
    out=out.concat(shuffle(topic.filter(i=>exclude.has(i))).slice(0,n-out.length));
  }
  return out;
}
function buildFrom(counts, exclude){
  let ids=[];
  for(const t in counts){ ids=ids.concat(pickTopic(parseInt(t,10), counts[t], exclude)); }
  ids=shuffle(ids);
  ids.forEach(i=>SEEN.add(i)); saveSeen();
  return ids.map(i=>prep(BANK[i]));
}
function buildTest(key){
  let counts;
  if(key==="G") counts=Object.assign({},GENERAL_MIX);
  else { const n=TOPIC_IDS[key].length; counts={[key]: S.len==="all"? n : Math.min(n, parseInt(S.len,10))}; }
  return buildFrom(counts, new Set());
}
function currentCounts(){ const c={}; S.qs.forEach(q=>{c[q.t]=(c[q.t]||0)+1;}); return c; }
function newAvailable(){ // cuántas preguntas distintas de las actuales hay en el banco para estos temas
  const cur=new Set(S.qs.map(q=>q.id)); const c=currentCounts(); let n=0;
  for(const t in c){ n+=TOPIC_IDS[t].filter(i=>!cur.has(i)).length; }
  return n;
}
function changeQuestions(){
  if(newAvailable()===0) return;
  const cur=new Set(S.qs.map(q=>q.id));
  S.qs=buildFrom(currentCounts(), cur);
  S.i=0; S.ans=new Array(S.qs.length).fill(undefined); S.batch=(S.batch||1)+1; S.flash=true;
  quiz(); window.scrollTo(0,0);
}
function start(key, items){
  S.key=key; S.qs=items?items.map(x=>prep(x.src)):buildTest(key); S.i=0; S.ans=new Array(S.qs.length).fill(undefined); S.batch=1; S.flash=false; S.view="quiz"; render(); window.scrollTo(0,0);
}
function grade(){
  let ok=0,bad=0,blank=0;
  S.qs.forEach((q,k)=>{const a=S.ans[k]; if(a===null) blank++; else if(a===q.a) ok++; else bad++;});
  const n=S.qs.length;
  let raw = S.penalty ? ok - bad/3 : ok;
  if(raw<0) raw=0;
  const nota = n? Math.round(raw/n*100)/10 : 0;
  return {ok,bad,blank,n,nota};
}

/* ======================= VISTAS ======================= */
const app=document.getElementById("app");

/* El test en curso se guarda en sessionStorage: sobrevive a recargas y a ir y volver de otra página. */
const STATE_KEY="fli-autotest-state";
function persist(){
  // JSON convierte undefined en null, y null significa «en blanco»: las no respondidas se guardan como -1.
  session(STATE_KEY,{view:S.view,key:S.key,i:S.i,ans:S.ans.map(a=>a===undefined?-1:a),batch:S.batch,
    qs:S.qs.map(q=>({id:q.id,t:q.t,q:q.q,e:q.e,o:q.o,a:q.a,w:q.w}))});
}
function restore(){
  const d=session(STATE_KEY);
  if(!d||!Array.isArray(d.qs)||!d.qs.length||!d.qs.every(q=>BANK[q.id])) return;
  S.qs=d.qs.map(q=>Object.assign(q,{src:BANK[q.id]}));
  S.key=d.key; S.i=Math.min(d.i|0,S.qs.length-1); S.batch=d.batch||1;
  S.ans=S.qs.map((_,k)=>{ const a=Array.isArray(d.ans)?d.ans[k]:-1; return a===-1||a===undefined?undefined:a; });
  S.view=d.view==="quiz"||d.view==="results"?d.view:"home";
}
function render(){ if(S.view==="quiz") quiz(); else if(S.view==="results") results(); else home(); persist(); }

function testLabel(key){return key==="G"?"Test general":"Tema "+key;}

function home(){
  S.view="home";
  const rows=[1,2,3,4].map(t=>{
    const n=TOPIC_IDS[t].length, best=store("fli-best-"+t);
    return `<div class="test-row"><div class="num">${t}</div>
      <div class="info"><h3>${TOPICS[t].name}</h3><p>${TOPICS[t].desc}</p>
      <span class="best">${n} preguntas en el banco${best!=null?` · mejor nota <b>${best.toFixed(1)}</b>`:""}</span></div>
      <button class="btn" data-start="${t}">Empezar</button></div>`;
  }).join("");
  const bestG=store("fli-best-G");
  app.innerHTML=`
  <header class="top">
    <span class="eyebrow">Teoría · Temas 1–4</span>
    <h1>Autotest de FLI</h1>
    <p class="muted">Elige un tema o el test general. Al responder cada pregunta verás al momento si es correcta y por qué; al final tienes la nota y el repaso de tus fallos. Las preguntas y las respuestas salen siempre en orden aleatorio, y dentro de cada test el botón <b>↻ Cambiar preguntas</b> carga una tanda nueva con preguntas distintas.</p>
    <div class="legend"><span><span class="cell ok">V</span> acierto</span><span><span class="cell bad">F</span> fallo</span><span><span class="cell blank">–</span> en blanco</span></div>
  </header>
  <div class="settings" role="group" aria-label="Opciones del test">
    <label for="len">Preguntas por tema
      <select id="len">
        <option value="10"${S.len==="10"?" selected":""}>10</option>
        <option value="20"${S.len==="20"?" selected":""}>20</option>
        <option value="all"${S.len==="all"?" selected":""}>Todas</option>
      </select></label>
    <label for="pen"><input type="checkbox" id="pen"${S.penalty?" checked":""}> Restar 1/3 por fallo (como en muchos exámenes)</label>
  </div>
  <section class="tests" aria-label="Tests por tema">${rows}
    <div class="test-row general"><div class="num">∀</div>
      <div class="info"><h3>Test general</h3><p>30 preguntas al azar de los cuatro temas, con el peso de cada tema en el examen.</p>
      <span class="best">${BANK.length} preguntas en total${bestG!=null?` · mejor nota <b>${bestG.toFixed(1)}</b>`:""}</span></div>
      <button class="btn" data-start="G">Empezar</button></div>
  </section>
  <p class="kbd">Atajos: 1–4 o A–D para responder · 0 para dejar en blanco · Intro para pasar a la siguiente.</p>`;
  app.querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>start(b.dataset.start==="G"?"G":parseInt(b.dataset.start,10)));
  document.getElementById("len").onchange=e=>{S.len=e.target.value; store("fli-settings",{len:S.len,penalty:S.penalty});};
  document.getElementById("pen").onchange=e=>{S.penalty=e.target.checked; store("fli-settings",{len:S.len,penalty:S.penalty});};
}

function columnHTML(){
  return S.qs.map((q,k)=>{
    const a=S.ans[k]; let c="cell", txt=k+1;
    if(a===null){c+=" blank";txt="–";} else if(a!==undefined){ if(a===q.a){c+=" ok";txt="V";} else {c+=" bad";txt="F";} }
    if(k===S.i && S.view==="quiz") c+=" now";
    return `<span class="${c}" title="Pregunta ${k+1}">${txt}</span>`;
  }).join("");
}

function quiz(){
  const q=S.qs[S.i], a=S.ans[S.i], answered=a!==undefined, n=S.qs.length;
  const opts=q.o.map((o,k)=>{
    let cls="opt";
    if(answered){ if(k===q.a) cls+=" correct"; else if(k===a) cls+=" wrong"; else cls+=" dim"; }
    return `<button class="${cls}" data-k="${k}" id="opt${k}"${answered?" disabled":""}><span class="k">${LETTERS[k]}</span><span class="t">${fmt(o)}</span></button>`;
  }).join("");
  let fb="";
  if(answered){
    if(a===null) fb=`<div class="feedback blank" role="status"><span class="verdict">En blanco</span><p>La correcta es la <b>${LETTERS[q.a]}</b>: ${fmt(q.o[q.a])}</p><p>${fmt(q.e)}</p></div>`;
    else if(a===q.a) fb=`<div class="feedback ok" role="status"><span class="verdict">Correcto</span><p>${fmt(q.e)}</p></div>`;
    else fb=`<div class="feedback bad" role="status"><span class="verdict">Incorrecto · la correcta es la ${LETTERS[q.a]}</span>
      <p><b>${fmt(q.o[q.a])}</b></p><p>${fmt(q.e)}</p>
      ${q.w[a]?`<p class="why"><b>Por qué tu respuesta (${LETTERS[a]}) no es correcta:</b> ${fmt(q.w[a])}</p>`:""}</div>`;
  }
  const last=S.i===n-1;
  const canSwap=newAvailable()>0;
  app.innerHTML=`
  <div class="qhead"><div><span class="eyebrow">${testLabel(S.key)}${S.key==="G"?" · Tema "+q.t:""}${S.batch>1?" · Tanda "+S.batch:""}</span><h2>Pregunta ${S.i+1} de ${n}</h2></div>
    <div class="qtools">
      <button class="btn ghost" id="swap"${canSwap?"":" disabled"} title="${canSwap?"Sustituye todas las preguntas de este test por otras distintas del banco":"Ya estás usando todas las preguntas de este tema"}">↻ Cambiar preguntas</button>
      <a class="btn ghost" href="chuletas.html" target="_blank" rel="noopener">Chuletas ↗</a>
      <button class="btn ghost" id="quit">Salir</button>
    </div></div>
  ${S.flash?`<p class="swapnote" role="status">Nuevas preguntas cargadas: ninguna se repite de la tanda anterior.</p>`:""}
  <div class="column" aria-label="Columna de evaluación">${columnHTML()}</div>
  <article class="qcard">
    <p class="qtext">${fmt(q.q)}</p>
    <div class="opts">${opts}</div>
    ${fb}
    <div class="actions">
      ${answered?`<span class="kbd">Intro: ${last?"ver resultados":"siguiente"}</span>`:`<button class="skip" id="blank">No lo sé (dejar en blanco)</button>`}
      ${answered?`<button class="btn" id="next">${last?"Ver resultados":"Siguiente"}</button>`:""}
    </div>
  </article>`;
  app.querySelectorAll(".opt").forEach(b=>b.onclick=()=>answer(parseInt(b.dataset.k,10)));
  const bl=document.getElementById("blank"); if(bl) bl.onclick=()=>answer(null);
  const nx=document.getElementById("next"); if(nx){nx.onclick=next; nx.focus({preventScroll:true});}
  document.getElementById("swap").onclick=changeQuestions;
  document.getElementById("quit").onclick=()=>{S.view="home";render();window.scrollTo(0,0);};
  persist();
}
function answer(k){ if(S.ans[S.i]!==undefined) return; S.ans[S.i]=k; S.flash=false; quiz(); }
function next(){ S.flash=false; if(S.i<S.qs.length-1){S.i++; quiz(); window.scrollTo({top:0});} else { finish(); } }
function finish(){
  const g=grade(); const prev=store("fli-best-"+S.key);
  if(prev==null||g.nota>prev) store("fli-best-"+S.key,g.nota);
  S.view="results"; render(); window.scrollTo(0,0);
}

function results(){
  const g=grade();
  const failed=S.qs.map((q,k)=>({q,k,a:S.ans[k]})).filter(x=>x.a!==x.q.a);
  let topicBars="";
  if(S.key==="G"){
    topicBars=`<div class="bytopic"><h3>Por temas</h3>`+[1,2,3,4].map(t=>{
      const qs=S.qs.map((q,k)=>({q,k})).filter(x=>x.q.t===t); const ok=qs.filter(x=>S.ans[x.k]===x.q.a).length;
      const pct=qs.length?ok/qs.length*100:0;
      return `<div class="bar"><span>Tema ${t}</span><div class="track"><div class="fill" style="width:${pct}%"></div></div><span class="v">${ok}/${qs.length}</span></div>`;
    }).join("")+`</div>`;
  }
  const msg = g.nota>=9?"Excelente: dominas este bloque.":g.nota>=7?"Muy bien. Repasa los fallos de abajo y estarás listo.":g.nota>=5?"Aprobado, pero hay conceptos que conviene repasar.":"Toca repasar: lee las explicaciones de los fallos y vuelve a intentarlo.";
  const review = failed.length? failed.map(x=>{
    const blank=x.a===null;
    return `<div class="ritem${blank?" blank":""}"><span class="tag">Pregunta ${x.k+1}${S.key==="G"?" · Tema "+x.q.t:""}</span>
      <p><b>${fmt(x.q.q)}</b></p>
      <p class="yours">${blank?"La dejaste en blanco.":`Tu respuesta: ${LETTERS[x.a]}) ${fmt(x.q.o[x.a])}`}</p>
      <p class="right">Correcta: ${LETTERS[x.q.a]}) ${fmt(x.q.o[x.q.a])}</p>
      <p>${fmt(x.q.e)}</p>
      ${!blank&&x.q.w[x.a]?`<p class="muted"><b>Por qué la tuya no:</b> ${fmt(x.q.w[x.a])}</p>`:""}</div>`;
  }).join("") : `<div class="perfect"><b>Sin fallos.</b> Prueba con otro tema o con el test general.</div>`;
  app.innerHTML=`
  <div class="qhead"><div><span class="eyebrow">${testLabel(S.key)} · resultados</span><h2>${msg}</h2></div></div>
  <div class="column" aria-label="Columna de evaluación">${columnHTML()}</div>
  <section class="score">
    <div class="big">${g.nota.toFixed(1)}<small> / 10</small></div>
    <div class="stats">
      <div><b>${g.ok}</b><span>Aciertos</span></div>
      <div><b>${g.bad}</b><span>Fallos</span></div>
      <div><b>${g.blank}</b><span>En blanco</span></div>
    </div>
    <p class="muted" style="margin:0;font-size:14px;flex-basis:100%">${S.penalty?"Nota con penalización: cada fallo resta 1/3 de acierto; las preguntas en blanco no restan.":"Nota sin penalización (puedes activarla en la portada del autotest)."}</p>
  </section>
  ${topicBars}
  <div class="actions" style="justify-content:flex-start">
    ${failed.length?`<button class="btn" id="retry">Repetir sólo las ${failed.length} falladas</button>`:""}
    <button class="btn ghost" id="again">Nuevo test con otras preguntas (${testLabel(S.key)})</button>
    <a class="btn ghost" href="chuletas.html" target="_blank" rel="noopener">Repasar con las chuletas ↗</a>
    <button class="btn ghost" id="home">Volver al inicio</button>
  </div>
  <section class="review" aria-label="Repaso de fallos"><h3>Repaso de fallos y preguntas en blanco</h3>${review}</section>`;
  const r=document.getElementById("retry"); if(r) r.onclick=()=>start(S.key, failed.map(x=>x.q));
  document.getElementById("again").onclick=()=>start(S.key);
  document.getElementById("home").onclick=()=>{S.view="home";render();window.scrollTo(0,0);};
}

/* ---------- Teclado ---------- */
document.addEventListener("keydown",e=>{
  if(S.view!=="quiz"||e.altKey||e.ctrlKey||e.metaKey) return;
  const q=S.qs[S.i]; const answered=S.ans[S.i]!==undefined;
  if(!answered){
    let k=-1; const key=e.key.toUpperCase();
    if(/^[1-5]$/.test(key)) k=parseInt(key,10)-1; else if(LETTERS.includes(key)) k=LETTERS.indexOf(key);
    if(k>=0&&k<q.o.length){e.preventDefault();answer(k);} else if(key==="0"){e.preventDefault();answer(null);}
  } else if(e.key==="Enter"){ if(document.activeElement&&document.activeElement.id&&document.activeElement.id!=="next"&&document.activeElement.tagName==="BUTTON") return; e.preventDefault(); next(); }
});


/* ---------- Arranque ---------- */
restore();
render();
})();
