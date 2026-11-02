/*!
 * examenes.js — página de exámenes completos de FLI: lista, realización con cronómetro y corrección.
 * El examen en curso se guarda en localStorage («Continuar» funciona aunque cierres la página).
 * Requiere: assets/js/core.js, fli/js/formulas.js, fli/js/data/examenes.js.
 */
(function () {
  "use strict";
  const { store, session, shuffle, esc } = window.App;
  const { LETTERS, paint, fx, branchHTML, EXAMS } = window.FLI;
  const app = document.getElementById("app");
  const S = { view: "list", exam: null };

function fmtN(n){ return (Math.round(n*100)/100).toFixed(2).replace(".",","); }
function examParts(X){
  if(X.id===0) return {title:"Examen aleatorio",test:X.pick.test.map(([e,i])=>EXAMS[e].test[i]),ex:X.pick.ex.map(([e,i])=>EXAMS[e].ex[i])};
  const E=EXAMS[X.id-1]; return {title:E.title,test:E.test,ex:E.ex};
}
function startExam(id,fresh){
  if(!fresh&&S.exam&&!S.exam.done&&S.exam.id===id){ S.exam.t0=Date.now(); go("exam"); return; }
  const X={id,ans:new Array(10).fill(null),res:[null,null,null],self:[null,null,null],done:false,t0:Date.now(),acc:0,el:0};
  if(id===0){
    const all=[]; EXAMS.forEach((E,e)=>E.test.forEach((_,i)=>all.push([e,i])));
    X.pick={test:shuffle(all).slice(0,10),ex:[0,1,2].map(k=>[Math.floor(Math.random()*EXAMS.length),k])};
  }
  S.exam=X; save(); go("exam");
}
function elapsed(){ const X=S.exam; if(!X) return 0; return X.done? X.el : (X.acc||0)+(Date.now()-X.t0); }
function clock(ms){ const s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor(s%3600/60), ss=s%60; return (h?h+":":"")+String(m).padStart(h?2:1,"0")+":"+String(ss).padStart(2,"0"); }
setInterval(()=>{ if(S.view==="exam"){ const t=document.getElementById("timer"); if(t) t.textContent="⏱ "+clock(elapsed()); } },1000);

function tblHTML(t){ return `<div class="tw" style="align-self:center"><table class="t qtbl"><thead><tr>${t.h.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${t.r.map(r=>`<tr>${r.map(c=>`<td class="tv ${c==="V"?"tv-v":"tv-f"}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; }
function gridHTML(X,P,graded){
  return `<div class="ansgrid" aria-label="Cuadro de respuestas">${P.test.map((q,k)=>{
    const a=X.ans[k]; let cls="v";
    if(graded) cls+= a==null?" blank":a===q.a?" ok":" bad";
    return `<a href="#eq${k}"><span class="n">${k+1}</span><span class="${cls}">${a==null?(graded?"–":""):LETTERS[a]}</span></a>`;
  }).join("")}</div>`;
}
function examLabel(X){ return X.id===0?"Examen aleatorio":X.id===1?"Examen 1 · real":"Examen "+X.id; }

function examView(){
  const X=S.exam, P=examParts(X);
  const answered=X.ans.filter(a=>a!=null).length;
  app.innerHTML=`
  <div class="qhead"><div><span class="eyebrow">${examLabel(X)} · Fundamentos Lógicos de la Informática</span><h2>${esc(P.title)}</h2></div>
    <div class="qtools"><span class="timer" id="timer">⏱ ${clock(elapsed())}</span><button class="btn ghost" id="exquit">Salir</button></div></div>
  <p class="callout rules"><b>Test de teoría (6 puntos):</b> cada acierto vale 0,6 y cada fallo resta 0,2; en blanco no resta. Pulsa otra vez una respuesta para dejarla en blanco.<br><b>Ejercicios (4 puntos):</b> resuélvelos en papel. Al entregar verás la solución paso a paso y te puntuarás tú.<br><span class="muted">Si sales, tus respuestas se guardan y puedes continuar luego.</span></p>
  <section class="sheet" style="gap:14px">
    <h3>Test de teoría</h3>
    <div id="grid">${gridHTML(X,P,false)}</div>
    ${P.test.map((q,k)=>`<article class="qcard" id="eq${k}">
      <p class="qtext"><span class="qn">${k+1}.</span>${fx(q.q)}</p>${q.tbl?tblHTML(q.tbl):""}
      <div class="opts">${q.o.map((o,j)=>`<button class="opt${X.ans[k]===j?" sel":""}" aria-pressed="${X.ans[k]===j}" data-q="${k}" data-k="${j}"><span class="k">${LETTERS[j]}</span><span class="t">${fx(o)}</span></button>`).join("")}</div>
    </article>`).join("")}
    <h3 style="margin-top:12px">Ejercicios de teoría</h3>
    ${P.ex.map((e,k)=>`<article class="qcard">
      <div class="exh"><span class="eyebrow">Ejercicio ${k+1} · ${e.kind}</span><span class="pts">${fmtN(e.pts)} puntos</span></div>
      <p style="margin:0">${fx(e.q)}</p><p class="bigf">${fx(e.f)}</p>
      <p class="muted" style="margin:0">Hazlo en papel. Cuando acabes, marca el resultado que te ha salido:</p>
      <div class="opts row">${e.check.o.map((o,j)=>`<button class="opt${X.res[k]===j?" sel":""}" aria-pressed="${X.res[k]===j}" data-x="${k}" data-k="${j}"><span class="k">${LETTERS[j]}</span><span class="t">${fx(o)}</span></button>`).join("")}</div>
    </article>`).join("")}
  </section>
  <div class="actions"><span class="muted" id="count">${answered} de 10 preguntas respondidas</span><button class="btn" id="submit">Entregar examen</button></div>`;
  app.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{
    const k=+b.dataset.q, j=+b.dataset.k; X.ans[k]= X.ans[k]===j? null : j;
    b.parentElement.querySelectorAll(".opt").forEach(o=>{const on=X.ans[k]===+o.dataset.k; o.classList.toggle("sel",on); o.setAttribute("aria-pressed",on);});
    document.getElementById("grid").innerHTML=gridHTML(X,P,false);
    document.getElementById("count").textContent=X.ans.filter(a=>a!=null).length+" de 10 preguntas respondidas";
    save();
  });
  app.querySelectorAll("[data-x]").forEach(b=>b.onclick=()=>{
    const k=+b.dataset.x, j=+b.dataset.k; X.res[k]= X.res[k]===j? null : j; save();
    b.parentElement.querySelectorAll(".opt").forEach(o=>{const on=X.res[k]===+o.dataset.k; o.classList.toggle("sel",on); o.setAttribute("aria-pressed",on);});
  });
  document.getElementById("exquit").onclick=()=>{ X.acc=elapsed(); X.t0=Date.now(); save(); go("list"); };
  document.getElementById("submit").onclick=()=>{ X.el=elapsed(); X.done=true; save(); go("examres"); };
}

function examGrade(){
  const X=S.exam, P=examParts(X); let ok=0,bad=0,blank=0;
  P.test.forEach((q,k)=>{const a=X.ans[k]; if(a==null) blank++; else if(a===q.a) ok++; else bad++;});
  const test=Math.max(0,ok*0.6-bad*0.2);
  let exs=0,pending=0; P.ex.forEach((e,k)=>{const s=X.self[k]; if(s==null) pending++; else exs+=s*e.pts;});
  return {ok,bad,blank,test,exs,pending,total:test+exs};
}
function solHTML(e){
  const s=e.sol; let h=`<div class="solbox"><h4>Solución paso a paso</h4>`;
  if(s.pre) h+=`<ul class="solpre">${s.pre.map(x=>`<li>${fx(x)}</li>`).join("")}</ul>`;
  if(s.steps){ let first=true; h+=`<ol class="steps">${s.steps.map(x=>{ if(Array.isArray(x)){ const lab=x[1].startsWith("Rama")?" first":""; return `<li class="lv1${lab}">${fx(x[1])}</li>`; } return `<li>${fx(x)}</li>`; }).join("")}</ol>`; }
  if(s.tree) h+=`<div class="tree">${branchHTML(s.tree)}</div>`;
  if(s.fit) h+=`<div class="tw"><table class="t fit"><thead><tr><th>#</th><th>Cláusula</th><th>Justificación</th></tr></thead><tbody>${s.fit.map(([n,c,j])=>`<tr><td>${n}</td><td><code class="f">${paint(esc(c))}</code></td><td>${fx(j).replace(/\bR([a-z])\(/g,"R<sub>$1</sub>(")}</td></tr>`).join("")}</tbody></table></div>`;
  h+=`<p class="callout">${fx(s.end)}</p></div>`;
  return h;
}

function examResults(){
  const X=S.exam, P=examParts(X), g=examGrade();
  if(g.pending===0){ const key="fli-exam-best-"+X.id, prev=store(key); if(prev==null||g.total>prev) store(key,Math.round(g.total*100)/100); }
  const msg = g.pending? "Examen entregado: puntúa tus ejercicios abajo" : g.total>=9?"Sobresaliente. Estás listo.":g.total>=7?"Notable. Repasa los fallos y listo.":g.total>=5?"Aprobado. Repasa los fallos para ir más seguro.":"Suspenso por ahora: revisa las explicaciones y vuelve a intentarlo.";
  const testHTML=P.test.map((q,k)=>{
    const a=X.ans[k], st=a==null?"blank":a===q.a?"ok":"bad";
    const verdict=st==="ok"?"✔ Correcta · +0,6":st==="bad"?`✘ Incorrecta · −0,2 · la correcta es la ${LETTERS[q.a]}`:`– En blanco · 0 · la correcta es la ${LETTERS[q.a]}`;
    return `<article class="qcard" id="eq${k}">
      <span class="tag kbd">Pregunta ${k+1} · Tema ${q.t}</span>
      <p class="qtext"><span class="qn">${k+1}.</span>${fx(q.q)}</p>${q.tbl?tblHTML(q.tbl):""}
      <div class="opts">${q.o.map((o,j)=>`<button class="opt ${j===q.a?"correct":j===a?"wrong":"dim"}" disabled><span class="k">${LETTERS[j]}</span><span class="t">${fx(o)}</span></button>`).join("")}</div>
      <p class="verdict-line ${st}" style="margin:0">${verdict}</p>
      <p style="margin:0">${fx(q.e)}</p>
      ${a!=null&&a!==q.a&&q.w&&q.w[a]?`<p class="muted" style="margin:0"><b>Por qué la ${LETTERS[a]} no:</b> ${fx(q.w[a])}</p>`:""}
    </article>`;
  }).join("");
  const exHTML=P.ex.map((e,k)=>{
    const r=X.res[k], okr=r===e.check.a;
    const levels=[[1,`Todo bien · ${fmtN(e.pts)}`],[0.5,`Resultado bien, pero con fallos en el procedimiento · ${fmtN(e.pts/2)}`],[0,"Mal o en blanco · 0"]];
    return `<article class="qcard">
      <div class="exh"><span class="eyebrow">Ejercicio ${k+1} · ${e.kind}</span><span class="pts">${fmtN(e.pts)} puntos</span></div>
      <p style="margin:0">${fx(e.q)}</p><p class="bigf">${fx(e.f)}</p>
      <p class="verdict-line ${r==null?"blank":okr?"ok":"bad"}" style="margin:0">${r==null?"No marcaste resultado. ":okr?"✔ Tu resultado es correcto: ":"✘ Tu resultado no es correcto. "}${r==null||!okr?"Resultado correcto: ":""}${esc(e.check.o[e.check.a])}</p>
      ${solHTML(e)}
      <div class="selfg"><b>¿Cuánto te pondrías?</b><span class="muted" style="font-size:14px">Compara con la solución: ¿has nombrado cada regla aplicada (tautología, unitaria, literal puro, inclusión, ramificación · α/β · subsumida/puro) y has dado el modelo o el contraejemplo cuando tocaba? Si el resultado final está mal, no te pongas más de la mitad.</span>
        <div class="opts">${levels.map(([v,l])=>`<button class="opt${X.self[k]===v?" sel":""}" aria-pressed="${X.self[k]===v}" data-self="${k}" data-v="${v}"><span class="k">${v===1?"✔":v===0.5?"½":"✘"}</span><span class="t">${l}</span></button>`).join("")}</div></div>
    </article>`;
  }).join("");
  app.innerHTML=`
  <div class="qhead"><div><span class="eyebrow">${examLabel(X)} · corrección</span><h2>${msg}</h2></div></div>
  <section class="score">
    <div class="big">${g.pending?fmtN(g.test+g.exs):fmtN(g.total)}<small> / 10</small></div>
    <div class="stats">
      <div><b>${fmtN(g.test)}</b><span>Test / 6</span></div>
      <div><b>${g.pending?`<span class="pending">${3-g.pending} de 3</span>`:fmtN(g.exs)}</b><span>${g.pending?"Ejercicios puntuados":"Ejercicios / 4"}</span></div>
      <div><b>${g.ok}·${g.bad}·${g.blank}</b><span>Aciertos · fallos · blanco</span></div>
      <div><b>${clock(elapsed())}</b><span>Tiempo</span></div>
    </div>
    <p class="muted" style="margin:0;font-size:14px;flex-basis:100%">${g.pending?"La nota es provisional hasta que puntúes los 3 ejercicios.":"Test: aciertos × 0,6 − fallos × 0,2. Ejercicios: tu autoevaluación."}</p>
  </section>
  ${gridHTML(X,P,true)}
  <div class="actions" style="justify-content:flex-start">
    <button class="btn" id="exagain">${X.id===0?"Otro examen aleatorio":"Repetir este examen"}</button>
    <a class="btn ghost" href="chuletas.html" target="_blank" rel="noopener">Repasar con las chuletas ↗</a>
    <button class="btn ghost" id="exhome">Ver todos los exámenes</button>
  </div>
  <section class="sheet" style="gap:14px"><h3>Parte 1 · Test de teoría</h3>${testHTML}<h3 style="margin-top:12px">Parte 2 · Ejercicios</h3>${exHTML}</section>`;
  app.querySelectorAll("[data-self]").forEach(b=>b.onclick=()=>{ const y=window.scrollY; X.self[+b.dataset.self]=+b.dataset.v; save(); examResults(); window.scrollTo(0,y); });
  document.getElementById("exagain").onclick=()=>startExam(X.id,true);
  document.getElementById("exhome").onclick=()=>go("list");
}
/* ---------- Lista de exámenes ---------- */
function list(){
  const cur=S.exam&&!S.exam.done?S.exam.id:null;
  const row=(id,num,title,sub,general)=>{ const best=store("fli-exam-best-"+id), cont=cur===id;
    return `<div class="test-row${general?" general":""}"><div class="num">${num}</div>
      <div class="info"><h3>${esc(title)}</h3><p>${esc(sub)}</p>${cont?`<span class="best"><b>En curso</b> · ${S.exam.ans.filter(a=>a!=null).length} de 10 respondidas</span>`:best!=null?`<span class="best">mejor nota <b>${fmtN(best)}</b></span>`:""}</div>
      <button class="btn${cont?" ghost":""}" data-exam="${id}">${cont?"Continuar":"Empezar"}</button></div>`; };
  app.innerHTML=`
  <header class="top"><span class="eyebrow">Teoría · Como el día del examen</span><h1>Exámenes completos</h1>
    <p class="muted">Mismo formato que el 1.er parcial: 10 preguntas tipo test (+0,6 por acierto, −0,2 por fallo) y 3 ejercicios (DPLL 0,75 · Tableaux 2 · Resolución 1,25). No ves las respuestas hasta entregar; después tienes la corrección completa y la solución paso a paso de los ejercicios.</p></header>
  <section class="tests" aria-label="Exámenes completos">
    ${EXAMS.map((E,i)=>row(i+1,"E"+(i+1),E.title,E.sub,false)).join("")}
    ${row(0,"?","Examen aleatorio","10 preguntas al azar de todos los exámenes y un ejercicio de cada tipo. Cada vez sale uno distinto.",true)}
  </section>
  ${cur!=null?`<p class="muted" style="margin:0;font-size:14px">Sólo puede haber un examen en curso: si empiezas otro, se descarta el que tienes a medias.</p>`:""}`;
  app.querySelectorAll("[data-exam]").forEach(b=>b.onclick=()=>startExam(parseInt(b.dataset.exam,10)));
}

/* ---------- Navegación entre vistas y persistencia ---------- */
const CUR_KEY="fli-exam-current", VIEW_KEY="fli-exam-view";
function save(){ store(CUR_KEY,S.exam); }
function go(view){ S.view=view; session(VIEW_KEY,view); render(); window.scrollTo(0,0); }
function render(){ if(S.view==="exam"&&S.exam&&!S.exam.done) examView(); else if(S.view==="examres"&&S.exam&&S.exam.done) examResults(); else { S.view="list"; list(); } }
// Al salir de la página se acumula el tiempo transcurrido; al volver, el cronómetro sigue desde ahí.
window.addEventListener("pagehide",()=>{ const X=S.exam; if(X&&!X.done){ X.acc=elapsed(); X.t0=Date.now(); save(); } });

/* ---------- Arranque ---------- */
(function boot(){
  const X=store(CUR_KEY);
  if(X&&typeof X==="object"&&Array.isArray(X.ans)&&(X.id===0?X.pick:EXAMS[X.id-1])){ S.exam=X; if(!X.done) X.t0=Date.now(); }
  S.view=session(VIEW_KEY)||"list";
  render();
})();
})();
