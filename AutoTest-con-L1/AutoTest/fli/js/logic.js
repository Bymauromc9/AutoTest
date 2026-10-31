/*!
 * logic.js — motor de lógica proposicional L0: análisis sintáctico con dos convenios de prioridad,
 * evaluación, átomos, subfórmulas e interpretaciones. Sin dependencias del DOM.
 * Exporta FLI.Logic.
 */
(function (FLI) {
  "use strict";
const CONV={
  teoria:{pr:{"∧":2,"∨":2,"→":1,"↔":1},ra:{},name:"Teoría (diapositivas): ¬ › ∧ ∨ › → ↔, a igual prioridad de izquierda a derecha"},
  guia:{pr:{"∧":4,"∨":3,"→":2,"↔":1},ra:{"→":1},name:"Guía de prácticas (Huth y Ryan): ¬ › ∧ › ∨ › → › ↔, la → agrupa por la derecha"}
};
const OPNAME={"¬":"negación","∧":"conjunción","∨":"disyunción","→":"condicional","↔":"bicondicional"};
function lparse(src,conv){
  const C=CONV[conv]||CONV.guia;
  const s=String(src).replace(/<->|<=>/g,"↔").replace(/->|=>/g,"→").replace(/[~!]/g,"¬").replace(/&/g,"∧").replace(/\|/g,"∨").replace(/[\[{]/g,"(").replace(/[\]}]/g,")");
  const tk=[];
  for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(/\s/.test(ch)) continue;
    if(/[a-z]/.test(ch)){ let v=ch; while(i+1<s.length&&/[0-9]/.test(s[i+1])) v+=s[++i]; tk.push({t:"at",v}); }
    else if(ch==="V"||ch==="F") tk.push({t:"k",v:ch});
    else if("¬∧∨→↔()".includes(ch)) tk.push({t:"op",v:ch});
    else if("⊢⊨≡".includes(ch)) throw new Error(`«${ch}» no es una conectiva: pertenece al metalenguaje y no puede ir dentro de una fbf.`);
    else throw new Error(`El símbolo «${ch}» no pertenece al alfabeto de L0.`);
  }
  if(!tk.length) throw new Error("Escribe una fórmula.");
  let i=0; const peek=()=>tk[i], eat=()=>tk[i++];
  function unary(){
    const t=eat();
    if(!t) throw new Error("Falta un operando al final de la fórmula.");
    if(t.t==="at") return {t:"at",v:t.v};
    if(t.t==="k") return {t:"k",v:t.v==="V"};
    if(t.v==="¬") return {t:"op",op:"¬",a:unary()};
    if(t.v==="("){ const e=expr(0); const c=eat(); if(!c||c.v!==")") throw new Error("Hay un paréntesis sin cerrar."); return e; }
    if(t.v===")") throw new Error("Sobra un paréntesis de cierre «)» o falta un operando antes de él.");
    throw new Error(`Falta un operando antes de «${t.v}»: es una conectiva binaria y necesita una fbf a cada lado.`);
  }
  function expr(minP){
    let l=unary();
    for(;;){
      const t=peek();
      if(!t) break;
      if(t.t!=="op"||t.v==="("||t.v==="¬"){ if(t.v===")") break; throw new Error(t.v==="¬"?"La negación es unaria: no puede unir dos fórmulas (falta una conectiva binaria).":"Hay dos fórmulas seguidas sin ninguna conectiva que las una."); }
      if(!(t.v in C.pr)) break;
      const p=C.pr[t.v]; if(p<minP) break;
      eat(); const r=expr(C.ra[t.v]?p:p+1); l={t:"op",op:t.v,l,r};
    }
    return l;
  }
  const e=expr(0);
  if(i<tk.length) throw new Error(tk[i].v===")"?"Sobra un paréntesis de cierre «)».":"La fórmula tiene texto sobrante.");
  return e;
}
function lshow(n,top){
  if(n.t==="at") return n.v; if(n.t==="k") return n.v?"V":"F";
  if(n.op==="¬") return "¬"+lshow(n.a);
  const s=lshow(n.l)+" "+n.op+" "+lshow(n.r); return top?s:"("+s+")";
}
function lev(n,a){ if(n.t==="at") return a[n.v]; if(n.t==="k") return n.v; if(n.op==="¬") return !lev(n.a,a); const l=lev(n.l,a),r=lev(n.r,a); return n.op==="∧"?l&&r:n.op==="∨"?l||r:n.op==="→"?(!l||r):l===r; }
function latoms(n,set){ set=set||new Set(); if(n.t==="at") set.add(n.v); else if(n.t==="op"){ if(n.op==="¬") latoms(n.a,set); else { latoms(n.l,set); latoms(n.r,set); } } return set; }
function lsubs(n,out){ out=out||[]; if(n.t==="op"){ if(n.op==="¬") lsubs(n.a,out); else { lsubs(n.l,out); lsubs(n.r,out); } const s=lshow(n,true); if(!out.some(x=>x.s===s)) out.push({s,n}); } return out; }
function lrows(vs){ const out=[]; for(let k=0;k<(1<<vs.length);k++){ const a={}; vs.forEach((v,j)=>{a[v]=!((k>>(vs.length-1-j))&1);}); out.push(a);} return out; }

  FLI.Logic = { CONV, OPNAME, parse: lparse, show: lshow, evaluate: lev, atoms: latoms, subformulas: lsubs, rows: lrows };
})(window.FLI = window.FLI || {});
