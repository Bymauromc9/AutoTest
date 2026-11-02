/*!
 * equivalencias.js — test de equivalencias de L0 (sólo fórmulas): elegir la equivalente o decidir si dos
 * fórmulas son equivalentes; contraejemplo, tabla de verdad y derivación paso a paso. Motor lógico propio.
 */
(function () {
"use strict";
/* =================== MOTOR LÓGICO =================== */
// Prioridad: ¬  >  ∧ ∨  >  → ↔  (a igual prioridad, de izquierda a derecha)
function tokenize(s){
  const out=[]; for(const ch of s.replace(/\s+/g,"")){
    if("αβγ".includes(ch)) out.push({t:"var",v:ch});
    else if(ch==="V"||ch==="F") out.push({t:"const",v:ch==="V"});
    else out.push({t:"op",v:ch});
  } return out;
}
function parse(s){
  const tk=tokenize(s); let i=0;
  const peek=()=>tk[i], eat=()=>tk[i++];
  function atom(){ const x=eat(); if(!x) throw Error("fin inesperado: "+s);
    if(x.t==="var") return {t:"var",n:x.v};
    if(x.t==="const") return {t:"const",v:x.v};
    if(x.v==="¬") return {t:"not",a:atom()};
    if(x.v==="("){ const e=imp(); const c=eat(); if(!c||c.v!==")") throw Error("falta ) en "+s); return e; }
    throw Error("símbolo inesperado "+x.v+" en "+s);
  }
  function andor(){ let l=atom(); while(peek()&&(peek().v==="∧"||peek().v==="∨")){const op=eat().v; l={t:"bin",op,l,r:atom()};} return l; }
  function imp(){ let l=andor(); while(peek()&&(peek().v==="→"||peek().v==="↔")){const op=eat().v; l={t:"bin",op,l,r:andor()};} return l; }
  const e=imp(); if(i!==tk.length) throw Error("sobra texto en "+s); return e;
}
function ev(n,a){
  switch(n.t){case"var":return a[n.n];case"const":return n.v;case"not":return !ev(n.a,a);
  default:{const l=ev(n.l,a),r=ev(n.r,a);
    return n.op==="∧"?l&&r:n.op==="∨"?l||r:n.op==="→"?(!l||r):(l===r);}}
}
function varsOf(...ss){ const set=new Set(); ss.forEach(s=>{for(const ch of s) if("αβγ".includes(ch)) set.add(ch);}); return [...set].sort((x,y)=>"αβγ".indexOf(x)-"αβγ".indexOf(y)); }
function rows(vars){ const n=vars.length, out=[]; for(let k=0;k<(1<<n);k++){ const a={}; vars.forEach((v,j)=>{a[v]=!((k>>(n-1-j))&1);}); out.push(a);} return out; }
const CACHE={}; const P=s=>CACHE[s]||(CACHE[s]=parse(s));
function equiv(f,g){ const vs=varsOf(f,g); return rows(vs).every(a=>ev(P(f),a)===ev(P(g),a)); }
function counterex(f,g){ const vs=varsOf(f,g); for(const a of rows(vs)) if(ev(P(f),a)!==ev(P(g),a)) return {a,vs,fv:ev(P(f),a),gv:ev(P(g),a)}; return null; }
const VF=b=>b?"V":"F";

/* =================== BANCO DE EQUIVALENCIAS ===================
   L ≡ R. dR: fórmulas que NO son equivalentes (se usan como distractores cuando se pide R);
   dL: distractores cuando se da R y se pide L. d: derivación paso a paso (opcional). */
const EQ=[
 {L:"α→β",R:"¬α∨β",dR:["α∨¬β","¬α∧β","α∨β","¬(α∨β)"],dL:["β→α","¬α→¬β","α∧¬β"]},
 {L:"α→β",R:"¬(α∧¬β)",dR:["¬(¬α∧β)","¬α∧β","¬(α∧β)"],dL:["β→α","¬α→¬β","α→¬β"],d:["¬(α∧¬β)","¬α∨¬¬β","¬α∨β","α→β"]},
 {L:"α→β",R:"¬β→¬α",dR:["¬α→¬β","β→α","¬β∧¬α"],dL:["β→α","¬α→¬β","α∧β"],d:["¬β→¬α","¬¬β∨¬α","β∨¬α","¬α∨β","α→β"]},
 {L:"¬(α→β)",R:"α∧¬β",dR:["¬α→¬β","¬α∧β","¬α∨¬β"],dL:["¬α→¬β","¬(β→α)","¬(α∧β)"],d:["¬(α→β)","¬(¬α∨β)","¬¬α∧¬β","α∧¬β"]},
 {L:"α∨β",R:"¬α→β",dR:["α→β","¬α→¬β","¬(α→β)"],dL:["α∧β","¬α∨β","α→β"],d:["¬α→β","¬¬α∨β","α∨β"]},
 {L:"α↔β",R:"(α→β)∧(β→α)",dR:["(α→β)∨(β→α)","(α→β)∧(¬β→¬α)","(α→β)∧β"],dL:["α→β","β→α","¬α↔β"]},
 {L:"α↔β",R:"(¬α∨β)∧(α∨¬β)",dR:["(¬α∨β)∧(¬α∨¬β)","(¬α∧β)∨(α∧¬β)","(¬α∨β)∨(α∨¬β)"],dL:["¬(α↔β)","α→β","α∧β"],d:["α↔β","(α→β)∧(β→α)","(¬α∨β)∧(¬β∨α)","(¬α∨β)∧(α∨¬β)"]},
 {L:"α↔β",R:"(α∧β)∨(¬α∧¬β)",dR:["(α∧β)∨(α∧¬β)","(α∨β)∧(¬α∨¬β)","(α∧¬β)∨(¬α∧β)"],dL:["α→β","¬(α↔β)","α∨β"]},
 {L:"¬(α↔β)",R:"(α∧¬β)∨(¬α∧β)",dR:["(α∧β)∨(¬α∧¬β)","¬α↔¬β","(α∧¬β)∧(¬α∧β)"],dL:["α↔β","¬α↔¬β","¬(α→β)"]},
 {L:"¬(α↔β)",R:"¬α↔β",dR:["¬α↔¬β","α↔β","¬α→β"],dL:["α↔β","¬α↔¬β","¬(α→β)"]},
 {L:"¬(α∨β)",R:"¬α∧¬β",dR:["¬α∨¬β","α∧β","¬α∨β"],dL:["¬(α∧β)","¬α∨¬β","¬α∨β"]},
 {L:"¬(α∧β)",R:"¬α∨¬β",dR:["¬α∧¬β","¬α∧β","α∨β"],dL:["¬(α∨β)","¬α∧¬β","α∧¬β"]},
 {L:"(α∧β)→γ",R:"α→(β→γ)",dR:["(α→β)→γ","(α→γ)∧(β→γ)","α∧(β→γ)"],dL:["(α∨β)→γ","(α→β)→γ","α∧(β→γ)"],d:["α→(β→γ)","¬α∨(¬β∨γ)","(¬α∨¬β)∨γ","¬(α∧β)∨γ","(α∧β)→γ"]},
 {L:"(α∨β)→γ",R:"(α→γ)∧(β→γ)",dR:["(α→γ)∨(β→γ)","(α∧β)→γ","α∨(β→γ)"],dL:["(α∧β)→γ","α→(β→γ)","(α→β)→γ"],d:["(α∨β)→γ","¬(α∨β)∨γ","(¬α∧¬β)∨γ","(¬α∨γ)∧(¬β∨γ)","(α→γ)∧(β→γ)"]},
 {L:"(α∧β)→γ",R:"(α→γ)∨(β→γ)",dR:["(α→γ)∧(β→γ)","(α∨β)→γ","α→(β∧γ)"],dL:["(α∨β)→γ","(α→β)→γ","α∧(β→γ)"],d:["(α→γ)∨(β→γ)","(¬α∨γ)∨(¬β∨γ)","(¬α∨¬β)∨γ","¬(α∧β)∨γ","(α∧β)→γ"]},
 {L:"α→(β∧γ)",R:"(α→β)∧(α→γ)",dR:["(α→β)∨(α→γ)","(α∧β)→γ","(α→β)∧γ"],dL:["(α∧β)→γ","α→(β∨γ)","(α→β)→γ"],d:["α→(β∧γ)","¬α∨(β∧γ)","(¬α∨β)∧(¬α∨γ)","(α→β)∧(α→γ)"]},
 {L:"α→(β∨γ)",R:"(α→β)∨γ",dR:["(α→β)∧γ","(α∨β)→γ","(α→β)∧(α→γ)"],dL:["α→(β∧γ)","(α∨β)→γ","α∧(β∨γ)"],d:["(α→β)∨γ","(¬α∨β)∨γ","¬α∨(β∨γ)","α→(β∨γ)"]},
 {L:"α→(β→γ)",R:"β→(α→γ)",dR:["(α→β)→γ","γ→(β→α)","(β→α)→γ"],dL:["(α→β)→γ","γ→(β→α)","(β→α)→γ"],d:["α→(β→γ)","(α∧β)→γ","(β∧α)→γ","β→(α→γ)"]},
 {L:"α∧(β∨γ)",R:"(α∧β)∨(α∧γ)",dR:["(α∨β)∧(α∨γ)","(α∧β)∨γ","(α∧β)∧(α∧γ)"],dL:["α∨(β∧γ)","(α∧β)∨γ","α∧(β∧γ)"]},
 {L:"α∨(β∧γ)",R:"(α∨β)∧(α∨γ)",dR:["(α∧β)∨(α∧γ)","(α∨β)∧γ","(α∨β)∨(α∨γ)"],dL:["α∧(β∨γ)","(α∨β)∧γ","α∨(β∨γ)"]},
 {L:"α∧(β∧γ)",R:"(α∧β)∧γ",dR:["(α∧β)∨γ","(α∨β)∧γ","α∧(β∨γ)"],dL:["α∨(β∧γ)","α∧(β∨γ)","α∨(β∨γ)"]},
 {L:"α∨(β∨γ)",R:"(α∨β)∨γ",dR:["(α∨β)∧γ","(α∧β)∨γ","α∨(β∧γ)"],dL:["α∧(β∨γ)","α∨(β∧γ)","α∧(β∧γ)"]},
 {L:"α∧β",R:"β∧α",dR:["β∨α","¬β∧¬α","β→α"],dL:["α∨β","α→β","¬α∧¬β"]},
 {L:"α∨β",R:"β∨α",dR:["β∧α","¬β∨¬α","¬β→¬α"],dL:["α∧β","α→β","¬α∨¬β"]},
 {L:"α∧¬α",R:"F",dR:["V","α","¬α"],dL:["α∨¬α","α→¬α","α↔α"]},
 {L:"α∨¬α",R:"V",dR:["F","α","¬α"],dL:["α∧¬α","¬α→α","α↔¬α"]},
 {L:"¬¬α",R:"α",dR:["¬α","V","F"],dL:["¬α","α∧¬α","α∨¬α"]},
 {L:"α∧α",R:"α",dR:["V","¬α","F"],dL:["α∧¬α","α∨¬α","¬α∨¬α"]},
 {L:"α∨α",R:"α",dR:["V","¬α","F"],dL:["α∨¬α","¬α∧¬α","α∧¬α"]},
 {L:"α∧V",R:"α",dR:["V","F","¬α"],dL:["α∨V","α∧F","¬α∧V"]},
 {L:"α∨F",R:"α",dR:["F","V","¬α"],dL:["α∧F","α∨V","¬α∨F"]},
 {L:"α∧F",R:"F",dR:["α","V","¬α"],dL:["α∨F","α∧V","α∨¬α"]},
 {L:"α∨V",R:"V",dR:["α","F","¬α"],dL:["α∧V","α∨F","α∧¬α"]},
 {L:"α∧(α∨β)",R:"α",dR:["β","α∧β","α∨β"],dL:["α∨β","α∧β","β∧(α∨β)"],d:["α∧(α∨β)","(α∨F)∧(α∨β)","α∨(F∧β)","α∨F","α"]},
 {L:"α∨(α∧β)",R:"α",dR:["β","α∧β","α∨β"],dL:["α∨β","α∧β","β∨(α∧β)"],d:["α∨(α∧β)","(α∧V)∨(α∧β)","α∧(V∨β)","α∧V","α"]},
 {L:"α→¬α",R:"¬α",dR:["α","F","V"],dL:["¬α→α","α→α","α∧¬α"],d:["α→¬α","¬α∨¬α","¬α"]},
 {L:"¬α→α",R:"α",dR:["¬α","V","F"],dL:["α→¬α","α→α","α∨¬α"],d:["¬α→α","¬¬α∨α","α∨α","α"]},
 {L:"α→α",R:"V",dR:["F","α","¬α"],dL:["α→¬α","α∧¬α","¬α→α"]}
];
// Parejas que NO son equivalentes (errores típicos) para el modo «¿Son equivalentes?»
const FALSE_PAIRS=[["α→β","β→α"],["α→β","¬α→¬β"],["¬(α→β)","¬α→¬β"],["¬(α∧β)","¬α∧¬β"],["¬(α∨β)","¬α∨¬β"],["(α→β)→γ","α→(β→γ)"],
 ["(α∨β)→γ","(α→γ)∨(β→γ)"],["(α∧β)→γ","(α→γ)∧(β→γ)"],["α∨(β∧γ)","(α∨β)∧γ"],["α∧(β∨γ)","(α∧β)∨γ"],["¬(α↔β)","¬α↔¬β"],["α→β","α∨¬β"],
 ["α↔β","(α→β)∨(β→α)"],["¬(α→β)","¬α∧β"],["α∨β","α→β"],["(α∧β)→γ","α∧(β→γ)"],["α↔β","(α∧β)∨(α∧¬β)"],["α∧(α∨β)","α∧β"],["¬α→β","α→¬β"],["α→¬α","F"]];

/* Validación del banco al cargar (descarta cualquier distractor que resultase equivalente) */
EQ.forEach(e=>{
  if(!equiv(e.L,e.R)) console.error("NO equivalente:",e.L,e.R);
  e.dR=e.dR.filter(x=>!equiv(x,e.R)); e.dL=e.dL.filter(x=>!equiv(x,e.L));
  if(e.d) for(let k=1;k<e.d.length;k++) if(!equiv(e.d[k-1],e.d[k])) console.error("paso no equivalente",e.d[k-1],e.d[k]);
});
FALSE_PAIRS.forEach(p=>{ if(equiv(p[0],p[1])) console.error("pareja falsa que sí es equivalente",p); });

/* =================== ESTADO =================== */
const S={view:"home",qs:[],i:0,ans:[],n:"20",mode:"mix",showTT:false,showCheat:false};
function store(k,v){try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k,JSON.stringify(v)); }catch(e){return null;}}
const saved=store("eq-settings"); if(saved){S.n=saved.n||S.n; S.mode=saved.mode||S.mode;}
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const LET=["A","B","C","D"];
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
const F=s=>`<span class="f">${esc(s)}</span>`;

function makeChoice(e){
  const dir=Math.random()<0.5?"LR":"RL";
  const given=dir==="LR"?e.L:e.R, right=dir==="LR"?e.R:e.L, pool=dir==="LR"?e.dR:e.dL;
  const ds=shuffle(pool.filter(x=>x!==right)).slice(0,3);
  const opts=shuffle([right,...ds]);
  return {type:"choice",given,right,opts,a:opts.indexOf(right),e};
}
function makeYN(){
  if(Math.random()<0.5){ const e=pick(EQ); const sw=Math.random()<0.5; return {type:"yn",f:sw?e.R:e.L,g:sw?e.L:e.R,truth:true,e}; }
  const p=pick(FALSE_PAIRS); const sw=Math.random()<0.5; return {type:"yn",f:sw?p[1]:p[0],g:sw?p[0]:p[1],truth:false};
}
function build(){
  const n=parseInt(S.n,10); const out=[]; let pool=shuffle(EQ), k=0; const seen=new Set();
  while(out.length<n){
    let q;
    const wantYN = S.mode==="yn" || (S.mode==="mix" && Math.random()<0.35);
    if(wantYN) q=makeYN(); else { if(k>=pool.length){pool=shuffle(EQ);k=0;} q=makeChoice(pool[k++]); }
    const key=q.type==="yn"?q.f+"|"+q.g:q.given+"|"+q.right;
    if(seen.has(key) && seen.size < EQ.length+FALSE_PAIRS.length-2) continue;
    seen.add(key); out.push(q);
  }
  return out;
}
function start(items){ S.qs=items||build(); S.i=0; S.ans=new Array(S.qs.length).fill(undefined); S.showTT=false; S.view="quiz"; render(); window.scrollTo(0,0); }
const isOk=(q,a)=>q.type==="choice"? a===q.a : (a===0)===q.truth;

/* =================== VISTAS =================== */
const app=document.getElementById("app");
function render(){ S.view==="home"?home():S.view==="quiz"?quiz():results(); }

function cheatHTML(){
  const seen=new Set(); const rowsH=[];
  EQ.forEach(e=>{ const k=e.L+"≡"+e.R; if(seen.has(k))return; seen.add(k); rowsH.push(`<div class="l">${esc(e.L)}</div><div class="eq">≡</div><div>${esc(e.R)}</div>`); });
  return `<div class="cheat">${rowsH.join("")}</div>`;
}
function home(){
  const best=store("eq-best");
  app.innerHTML=`
  <header style="display:flex;flex-direction:column;gap:8px">
    <span class="eyebrow">FLI · Tema 2 · Equivalencia lógica</span>
    <h1>Equivalencias de L0</h1>
    <p class="muted">Sólo fórmulas, sin nombres. Te doy una fórmula y eliges cuál es equivalente, o decides si dos fórmulas son equivalentes. Si fallas, te enseño una interpretación donde no coinciden y la tabla de verdad.</p>
  </header>
  <section class="panel">
    <div class="settings">
      <label for="mode">Tipo de preguntas
        <select id="mode">
          <option value="mix"${S.mode==="mix"?" selected":""}>Mixto</option>
          <option value="choice"${S.mode==="choice"?" selected":""}>Elegir la equivalente</option>
          <option value="yn"${S.mode==="yn"?" selected":""}>¿Son equivalentes? (sí / no)</option>
        </select></label>
      <label for="n">Número de preguntas
        <select id="n">
          ${["10","20","30","40"].map(v=>`<option value="${v}"${S.n===v?" selected":""}>${v}</option>`).join("")}
        </select></label>
    </div>
    <div class="row"><button class="btn" id="go">Empezar</button>
      <span class="best">${EQ.length} equivalencias en el banco${best!=null?` · mejor nota <b>${best.toFixed(1)}</b>`:""}</span></div>
  </section>
  <section class="panel">
    <div class="row" style="justify-content:space-between"><h3>Repasar todas antes de empezar</h3>
      <button class="btn ghost" id="cheatbtn">${S.showCheat?"Ocultar":"Mostrar"}</button></div>
    ${S.showCheat?cheatHTML():`<p class="muted" style="font-size:15px">Todas las equivalencias del banco, una por línea. Ocúltalas antes de hacer el test.</p>`}
  </section>
  <p class="kbd">Atajos: 1–4 o A–D para responder (S / N en sí-no) · Intro para seguir · T para la tabla de verdad.</p>`;
  document.getElementById("go").onclick=()=>start();
  document.getElementById("mode").onchange=e=>{S.mode=e.target.value;store("eq-settings",{n:S.n,mode:S.mode});};
  document.getElementById("n").onchange=e=>{S.n=e.target.value;store("eq-settings",{n:S.n,mode:S.mode});};
  document.getElementById("cheatbtn").onclick=()=>{S.showCheat=!S.showCheat;home();};
}

function column(){
  return S.qs.map((q,k)=>{const a=S.ans[k];let c="cell",t=k+1;
    if(a!==undefined){ if(isOk(q,a)){c+=" ok";t="V";} else {c+=" bad";t="F";} }
    if(k===S.i&&S.view==="quiz") c+=" now"; return `<span class="${c}">${t}</span>`;}).join("");
}
function ttHTML(cols){ // cols: [{label, f}]
  const vs=varsOf(...cols.map(c=>c.f)); const R=rows(vs);
  const head=vs.map(v=>`<th>${v}</th>`).join("")+cols.map(c=>`<th>${esc(c.label||c.f)}</th>`).join("");
  const body=R.map(a=>{ const vals=cols.map(c=>ev(P(c.f),a)); const diff=vals.some(v=>v!==vals[0]);
    return `<tr class="${diff?"diff":""}">${vs.map(v=>`<td>${VF(a[v])}</td>`).join("")}${vals.map(v=>`<td class="${v?"v":"fz"}">${VF(v)}</td>`).join("")}</tr>`;}).join("");
  return `<div class="tt-wrap"><table class="tt"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function cxText(f,g){
  const c=counterex(f,g); if(!c) return "";
  const asg=c.vs.map(v=>`${v} = ${VF(c.a[v])}`).join(", ");
  return `<p>Contraejemplo: con <b>${esc(asg)}</b>, ${F(f)} vale <b>${VF(c.fv)}</b> pero ${F(g)} vale <b>${VF(c.gv)}</b>. Con una sola interpretación en la que difieran ya no son equivalentes.</p>`;
}
function chainHTML(e){
  if(!e||!e.d) return "";
  return `<div class="chain">${e.d.map((s,k)=>`<div>${k?"≡ ":"&nbsp;&nbsp;"}${esc(s)}</div>`).join("")}</div>`;
}

function quiz(){
  const q=S.qs[S.i], a=S.ans[S.i], done=a!==undefined, n=S.qs.length, last=S.i===n-1;
  let stem, opts, fb="", prompt;
  if(q.type==="choice"){
    prompt="¿Cuál de estas fórmulas es equivalente?";
    stem=`${esc(q.given)} <span class="q">≡ ?</span>`;
    opts=`<div class="opts">${q.opts.map((o,k)=>{let c="opt"; if(done){ if(k===q.a)c+=" correct"; else if(k===a)c+=" wrong"; else c+=" dim"; }
      return `<button class="${c}" data-k="${k}" id="o${k}"${done?" disabled":""}><span class="k">${LET[k]}</span><span class="t">${esc(o)}</span></button>`;}).join("")}</div>`;
    if(done){
      const ok=a===q.a;
      const cols=[{f:q.given},{f:q.right}]; if(!ok) cols.push({f:q.opts[a]});
      fb=`<div class="feedback ${ok?"ok":"bad"}" role="status">
        <span class="verdict">${ok?"Correcto":"Incorrecto"}</span>
        <div class="rule">${esc(q.given)} ≡ ${esc(q.right)}</div>
        ${!ok?cxText(q.given,q.opts[a]):""}
        ${q.e.d?`<p class="muted" style="font-size:15px">Paso a paso:</p>${chainHTML(q.e)}`:""}
        <button class="linkbtn" id="tt">${S.showTT?"Ocultar":"Ver"} tabla de verdad</button>
        ${S.showTT?ttHTML(cols):""}
      </div>`;
    }
  } else {
    prompt="¿Son lógicamente equivalentes?";
    stem=`${esc(q.f)} <span class="q">≡?</span> ${esc(q.g)}`;
    const labels=["Sí","No"], right=q.truth?0:1;
    opts=`<div class="opts two">${labels.map((o,k)=>{let c="opt"; if(done){ if(k===right)c+=" correct"; else if(k===a)c+=" wrong"; else c+=" dim"; }
      return `<button class="${c}" data-k="${k}" id="o${k}"${done?" disabled":""}><span class="k">${k?"N":"S"}</span><span class="t">${o}</span></button>`;}).join("")}</div>`;
    if(done){
      const ok=isOk(q,a);
      fb=`<div class="feedback ${ok?"ok":"bad"}" role="status">
        <span class="verdict">${ok?"Correcto":"Incorrecto"}: ${q.truth?"sí son equivalentes":"no son equivalentes"}</span>
        ${q.truth?`<div class="rule">${esc(q.f)} ≡ ${esc(q.g)}</div>${q.e&&q.e.d?`<p class="muted" style="font-size:15px">Paso a paso:</p>${chainHTML(q.e)}`:`<p>Tienen la misma columna en todas las interpretaciones.</p>`}`
                 :cxText(q.f,q.g)}
        <button class="linkbtn" id="tt">${S.showTT?"Ocultar":"Ver"} tabla de verdad</button>
        ${S.showTT?ttHTML([{f:q.f},{f:q.g}]):""}
      </div>`;
    }
  }
  app.innerHTML=`
  <div class="qhead"><div><span class="eyebrow">Equivalencias de L0</span><h2>Pregunta ${S.i+1} de ${n}</h2></div><button class="btn ghost" id="quit">Salir</button></div>
  <div class="column">${column()}</div>
  <article class="panel">
    <p class="prompt">${prompt}</p>
    <div class="stem">${stem}</div>
    ${opts}
    ${fb}
    ${done?`<div class="actions"><span class="kbd">Intro: ${last?"ver resultados":"siguiente"} · T: tabla</span><button class="btn" id="next">${last?"Ver resultados":"Siguiente"}</button></div>`:""}
  </article>`;
  app.querySelectorAll(".opt").forEach(b=>b.onclick=()=>answer(parseInt(b.dataset.k,10)));
  const t=document.getElementById("tt"); if(t) t.onclick=()=>{S.showTT=!S.showTT;quiz();};
  const nx=document.getElementById("next"); if(nx){nx.onclick=next; nx.focus({preventScroll:true});}
  document.getElementById("quit").onclick=()=>{S.view="home";render();};
}
function answer(k){ if(S.ans[S.i]!==undefined) return; S.ans[S.i]=k; quiz(); }
function next(){ S.showTT=false; if(S.i<S.qs.length-1){S.i++;quiz();window.scrollTo({top:0});} else finish(); }
function finish(){ const g=grade(); const b=store("eq-best"); if(b==null||g.nota>b) store("eq-best",g.nota); S.view="results"; render(); window.scrollTo(0,0); }
function grade(){ let ok=0; S.qs.forEach((q,k)=>{ if(isOk(q,S.ans[k])) ok++; }); const n=S.qs.length; return {ok,bad:n-ok,n,nota:Math.round(ok/n*100)/10}; }

function results(){
  const g=grade();
  const failed=S.qs.map((q,k)=>({q,k,a:S.ans[k]})).filter(x=>!isOk(x.q,x.a));
  const msg=g.nota>=9?"Las tienes dominadas.":g.nota>=7?"Muy bien. Repasa las falladas.":g.nota>=5?"Aprobado, pero repasa la lista.":"Vuelve a la lista de repaso y repite las falladas.";
  const rev=failed.length?failed.map(x=>{
    if(x.q.type==="choice") return `<div class="ritem"><span class="kbd">Pregunta ${x.k+1}</span>
      <p class="yours">Elegiste: ${F(x.q.given+" ≡ "+x.q.opts[x.a])}</p>
      <p class="right">Correcta: ${F(x.q.given+" ≡ "+x.q.right)}</p>${cxText(x.q.given,x.q.opts[x.a])}</div>`;
    return `<div class="ritem"><span class="kbd">Pregunta ${x.k+1}</span>
      <p>${F(x.q.f+"  ≡?  "+x.q.g)}</p>
      <p class="right">${x.q.truth?"Sí son equivalentes.":"No son equivalentes."}</p>${x.q.truth?"":cxText(x.q.f,x.q.g)}</div>`;
  }).join(""):`<div class="panel" style="border-color:var(--ok)"><b>Sin fallos.</b></div>`;
  app.innerHTML=`
  <div class="qhead"><div><span class="eyebrow">Resultados</span><h2>${msg}</h2></div></div>
  <div class="column">${column()}</div>
  <section class="panel"><div class="score"><div class="big">${g.nota.toFixed(1)}<small> / 10</small></div>
    <div class="stats"><div><b>${g.ok}</b><span>Aciertos</span></div><div><b>${g.bad}</b><span>Fallos</span></div></div></div></section>
  <div class="row">
    ${failed.length?`<button class="btn" id="retry">Repetir las ${failed.length} falladas</button>`:""}
    <button class="btn ghost" id="again">Nuevo test</button><button class="btn ghost" id="home">Inicio</button></div>
  <section style="display:flex;flex-direction:column;gap:10px"><h3>Repaso de fallos</h3>${rev}</section>`;
  const r=document.getElementById("retry"); if(r) r.onclick=()=>start(failed.map(x=>{const q=Object.assign({},x.q); if(q.type==="choice"){q.opts=shuffle(q.opts);q.a=q.opts.indexOf(q.right);} return q;}));
  document.getElementById("again").onclick=()=>start();
  document.getElementById("home").onclick=()=>{S.view="home";render();};
}

document.addEventListener("keydown",e=>{
  if(S.view!=="quiz"||e.altKey||e.ctrlKey||e.metaKey) return;
  const q=S.qs[S.i], done=S.ans[S.i]!==undefined, k=e.key.toUpperCase();
  if(!done){
    if(q.type==="choice"){ let i=-1; if(/^[1-4]$/.test(k)) i=+k-1; else if(LET.includes(k)) i=LET.indexOf(k); if(i>=0&&i<q.opts.length){e.preventDefault();answer(i);} }
    else { if(k==="S"||k==="1"){e.preventDefault();answer(0);} else if(k==="N"||k==="2"){e.preventDefault();answer(1);} }
  } else {
    if(e.key==="Enter"){ const ae=document.activeElement; if(ae&&ae.tagName==="BUTTON"&&ae.id!=="next") return; e.preventDefault(); next(); }
    else if(k==="T"){ e.preventDefault(); S.showTT=!S.showTT; quiz(); }
  }
});
render();
})();
