/*!
 * guia.js — guía de prácticas de FLI (6 partes) con dos herramientas interactivas:
 * el analizador de fórmulas y el comprobador de razonamientos.
 * La parte activa va en el hash (#parte-3) para poder enlazarla.
 * Requiere: assets/js/core.js, fli/js/formulas.js, fli/js/logic.js.
 */
(function () {
  "use strict";
  const { store, esc } = window.App;
  const { SYM, paint, F, fx, branchHTML } = window.FLI;
  const { CONV, OPNAME, parse: lparse, show: lshow, evaluate: lev, atoms: latoms, subformulas: lsubs, rows: lrows } = window.FLI.Logic;
  const S = { conv: store("fli-conv") === "teoria" ? "teoria" : "guia" };

const KCLS={"¬":"k-not","∧":"k-and","∨":"k-or","→":"k-imp","↔":"k-iff"};
function synHTML(n){
  if(n.t!=="op") return `<div class="nd"><span class="at">${n.t==="k"?(n.v?"V":"F"):esc(n.v)}</span></div>`;
  const kids=n.op==="¬"?[n.a]:[n.l,n.r];
  return `<div class="nd"><span class="op ${KCLS[n.op]}">${n.op}</span><span class="sub">${esc(lshow(n,true))}</span></div><div class="ch">${kids.map(synHTML).join("")}</div>`;
}
function ttTable(vs,cols,rowCls){
  const R=lrows(vs);
  return `<div class="tw"><table class="tt"><thead><tr>${vs.map(v=>`<th>${esc(v)}</th>`).join("")}${cols.map(c=>`<th${c.main?' class="main"':""}>${paint(esc(c.label))}</th>`).join("")}</tr></thead><tbody>${R.map(a=>{const vals=cols.map(c=>lev(c.n,a)); return `<tr class="${rowCls?rowCls(vals):""}">${vs.map(v=>`<td>${a[v]?"V":"F"}</td>`).join("")}${vals.map((x,j)=>`<td class="${x?"v":"fz"}${cols[j].main?" main":""}">${x?"V":"F"}</td>`).join("")}</tr>`;}).join("")}</tbody></table></div>`;
}
function analyzeHTML(src,conv){
  let n; try{ n=lparse(src,conv); }catch(e){ return `<p class="err">✘ No es una fbf. ${esc(e.message)}</p>`; }
  const vs=[...latoms(n)].sort(), subs=lsubs(n);
  const main=n.t==="op"?`${paint(n.op)} · ${OPNAME[n.op]}`:"ninguna: es una fórmula atómica";
  let vals=null, cls="";
  if(vs.length<=8){ vals=lrows(vs).map(a=>lev(n,a)); const t=vals.filter(Boolean).length; cls= t===vals.length?"<b>Tautología</b> (válida): verdadera en las "+t+" interpretaciones.":t===0?"<b>Contradicción</b> (insatisfacible): falsa en las "+vals.length+" interpretaciones.":`<b>Contingente</b>: satisfacible pero no válida (${t} de ${vals.length} filas verdaderas).`; }
  return `<p class="okv">✔ Es una fbf</p>
    <div class="tw" style="border:0;background:none"><table class="t"><tbody>
      <tr><td><b>Con todos los paréntesis</b></td><td>${F(lshow(n,true))}</td></tr>
      <tr><td><b>Conectiva principal</b></td><td>${main}</td></tr></tbody></table></div>
    <h4 style="margin:0">Árbol sintáctico</h4><div class="syn">${synHTML(n)}</div>
    ${subs.length?`<h4 style="margin:0">Orden de aplicación</h4><ol>${subs.map((x,k)=>`<li>Se aplica ${paint(x.n.op)}: ${F(x.s)}${k===subs.length-1?" <span class=\"pill\">define la fbf</span>":""}</li>`).join("")}</ol>`:""}
    <h4 style="margin:0">Tabla de verdad</h4>
    ${vs.length<=6?ttTable(vs,subs.map((x,k)=>({label:x.s,n:x.n,main:k===subs.length-1})).concat(subs.length?[]:[{label:lshow(n,true),n,main:true}])):`<p class="muted">Con ${vs.length} letras la tabla tendría ${2**vs.length} filas; sólo muestro la clasificación.</p>`}
    ${cls?`<p class="callout">${cls}</p>`:""}`;
}
function checkHTML(prems,concl,conv){
  const P=[]; let C;
  for(let k=0;k<prems.length;k++){ if(!prems[k].trim()) continue; try{ P.push({src:prems[k],n:lparse(prems[k],conv)}); }catch(e){ return `<p class="err">✘ La premisa ${k+1} no es una fbf. ${esc(e.message)}</p>`; } }
  try{ C={src:concl,n:lparse(concl,conv)}; }catch(e){ return `<p class="err">✘ La conclusión no es una fbf. ${esc(e.message)}</p>`; }
  const set=new Set(); P.forEach(p=>latoms(p.n,set)); latoms(C.n,set); const vs=[...set].sort();
  if(vs.length>7) return `<p class="err">Demasiadas letras (${vs.length}) para una tabla legible: usa como máximo 7.</p>`;
  const R=lrows(vs); let good=0, cx=null;
  R.forEach(a=>{ if(P.every(p=>lev(p.n,a))){ good++; if(!lev(C.n,a)&&!cx) cx=a; } });
  const sch=`{ ${P.map(p=>lshow(p.n,true)).join(", ")} } ⊨ ${lshow(C.n,true)}`;
  const cols=P.map((p,k)=>({label:lshow(p.n,true),n:p.n})).concat([{label:lshow(C.n,true),n:C.n,main:true}]);
  const np=P.length;
  return `<p>${F(sch)}</p>
    ${cx?`<p class="badv">✘ No válido</p><p>Contraejemplo: ${vs.map(v=>`${esc(v)} = ${cx[v]?"V":"F"}`).join(", ")}. Con esa interpretación todas las premisas son verdaderas y la conclusión es falsa, así que no existe ninguna demostración.</p>`
       :`<p class="okv">✔ Válido</p><p>No existe ninguna interpretación que haga verdaderas todas las premisas y falsa la conclusión, así que la deducción se puede demostrar.</p>`}
    <p class="muted">De las ${R.length} interpretaciones posibles, en ${good} se cumplen todas las premisas. En verde, las filas donde además se cumple la conclusión; en rojo, las que son contraejemplo.</p>
    ${ttTable(vs,cols,vals=>{ const allP=vals.slice(0,np).every(Boolean); return allP?(vals[np]?"good":"cx"):""; })}`;
}

/* ---------- Guía de prácticas ---------- */
const GP=[["1","Sintaxis"],["2","Formalizar"],["3","Tablas de verdad"],["4","Deducción natural"],["5","Tableaux"],["6","Chuleta y errores"]];
function T(head,rows,stack){ return `<div class="tw"><table class="t${stack?" stack":""}"><thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,j)=>`<td data-l="${esc(String(head[j]).replace(/<[^>]+>/g,""))}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; }
const f=x=>F(x);
function proof(title,lines){
  return `<div class="tool" style="border-width:1px;border-color:var(--line)"><b>${title}</b><div class="tw" style="border:0"><table class="fitp"><tbody>${lines.map(([n,fo,j,d])=>`<tr class="${/^Supuesto/.test(j)?"sup":""}"><td class="n">${n}</td><td class="fo" style="--d:${d||0}">${paint(esc(fo))}</td><td class="ju">${esc(j)}</td></tr>`).join("")}</tbody></table></div></div>`;
}
const DICT=[
 ["¬α",["No α","Es falso que α","No es el caso que α","No sucede que α","No es cierto que α","Ni α"]],
 ["α ∧ β",["α y (e) β","No sólo α sino también β","α , (;) β","α pero β","α y además β","α aunque β","α además de β","α sin embargo β","α y sobre todo β","α no obstante β","α y también β","α a pesar de β","α junto con β"]],
 ["α ∨ β",["α o β","Bien α, bien β","O bien α o bien β","Tan pronto α como β","Ya α, ya β"]],
 ["α → β",["Si α entonces β","Si α, (;) β","Siempre que α, β","Puesto que α, β","Es suficiente α para que β","Es necesario β para que α","α sólo si β","Sólo α si β","β porque α","β ya que α","No α a menos que β","A no ser que β no α","α cuando β → ¡ojo! se formaliza β → α"]],
 ["α ↔ β",["α si y sólo si β","α equivale a β","α, es decir β","α, o sea β","α cuando y sólo cuando β","α es suficiente y necesaria para que β"]],
 ["α ⊨ β",["α luego β","α por consiguiente β","α así que β","α así pues β","α por lo tanto β"]]
];
const norm=s=>s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
function dictHTML(q){
  const nq=norm(q||"").trim();
  const rows=DICT.map(([c,ex])=>{ const hits=ex.filter(x=>!nq||norm(x).includes(nq)); if(!hits.length) return ""; return `<div class="dg"><span class="cn">${paint(esc(c))}${c==="α ⊨ β"?' <small class="muted" style="font-family:var(--f-body);font-size:12px">razonamiento</small>':""}</span><div class="chips">${hits.map(x=>`<span class="${nq?"hit":""}">${esc(x)}</span>`).join("")}</div></div>`; }).join("");
  return rows||`<p class="muted">Ningún nexo coincide con «${esc(q)}».</p>`;
}
function rule(nm,box,prem,concl,ds){ return `<div class="rg"><span class="nm">${nm}</span>${box?`<span class="bx">${box}</span>`:""}<div class="sc">${prem.map(p=>`<span>${paint(esc(p))}</span>`).join("")}<span class="bar"></span><span>${paint(esc(concl))}</span></div><span class="ds">${ds}</span></div>`; }

const GUIDE={
"1"(){ return `
<div class="parthead"><span class="eyebrow">Parte 1</span><h2>El lenguaje L0: sintaxis</h2><p>Qué se puede escribir y qué no. Es la base de todo lo demás: si una expresión no es fórmula bien formada, no hay nada que calcular ni que demostrar.</p></div>
<section><h3>Qué es una proposición</h3>
<p>La lógica proposicional sólo trabaja con oraciones enunciativas: las que afirman o niegan algo y por tanto se pueden calificar de verdaderas o falsas. Las preguntas, las órdenes y los deseos quedan fuera.</p>
<p>Una proposición es una oración enunciativa que no puede descomponerse en partes que sean, a su vez, proposiciones. Si la puedes partir por un «y», un «o» o un «si… entonces», no es una proposición simple, sino una oración compuesta.</p>
${T(["Frase","¿Proposición?","Por qué"],[["Juan es alto","Sí","Afirma un hecho, es V o F"],["Llueve","Sí","Simple y con sentido completo"],["Llueve y hace frío","No","Se descompone en dos proposiciones"],["¿Qué hora es?","No","Interrogativa: no es ni verdadera ni falsa"],["Cierra la puerta","No","Exhortativa: no afirma ni niega nada"]],1)}
<p class="callout"><b class="big">Regla de oro: las proposiciones se definen en positivo.</b><br>Si la frase dice «no vino a la fiesta», la proposición es P: «vino a la fiesta» y tú escribes ${f("¬P")}. La negación la pones con la conectiva, nunca la escondes dentro de la letra. Si la metieras dentro, la fórmula sería sólo P y perderías la estructura: después no podrías aplicarle ninguna regla que hable de ¬, como la doble negación o la reducción al absurdo.</p>
</section>
<section><h3>El alfabeto</h3>
${T(["Pieza","Símbolos","Para qué sirve"],[["Constantes","V, F","Los dos valores de verdad"],["Átomos o letras proposicionales","p, q, r, s…","Uno por cada proposición simple"],["Conectivas",paint("¬ ∧ ∨ → ↔"),"Unen o modifican proposiciones"],["Auxiliares","( ) [ ] { }","Agrupan y deshacen ambigüedades"]],1)}
</section>
<section><h3>Fórmula bien formada (fbf)</h3>
<p>Una fbf es una expresión que pertenece de verdad al lenguaje. Se construye con cuatro reglas, aplicadas tantas veces como haga falta:</p>
<ol><li>Todo átomo es una fbf. También lo son las constantes V y F.</li><li>Si α es una fbf, entonces ${f("¬α")} es una fbf.</li><li>Si α y β son fbf, entonces ${f("(α ∧ β)")}, ${f("(α ∨ β)")}, ${f("(α → β)")} y ${f("(α ↔ β)")} son fbf.</li><li>Nada más es una fbf.</li></ol>
<p>Para comprobar si algo es fbf se aplica el proceso hacia abajo: miras la conectiva principal, dices qué regla la genera, y esa regla te exige que sus partes sean a su vez fbf. Repites hasta llegar a átomos, que lo son por definición. Así se contesta el ejercicio 1 de la relación.</p>
${T(["Expresión","¿fbf?","Motivo"],[[f("p → q ∨ r"),"Sí","La prioridad la lee como "+f("p → (q ∨ r)")],[f("¬¬p"),"Sí","La negación se puede encadenar"],[f("p ∧ ∨ q"),"No","Dos conectivas binarias seguidas: falta un operando"],[f("p ¬ q"),"No","La negación es unaria, no une dos fórmulas"],[f("(p ∧ q"),"No","Paréntesis sin cerrar"],[f("p ⊢ q"),"No","⊢ no es una conectiva: es metalenguaje"]],1)}
</section>
<section><h3>Prioridad de las conectivas</h3>
<p>Los paréntesis se pueden ahorrar porque las conectivas tienen un orden fijo. De mayor a menor fuerza, según la guía:</p>
<div class="chain"><span class="lv">1 ${paint("¬")}</span><span class="gt">›</span><span class="lv">2 ${paint("∧")}</span><span class="gt">›</span><span class="lv">3 ${paint("∨")}</span><span class="gt">›</span><span class="lv">4 ${paint("→")}</span><span class="gt">›</span><span class="lv">5 ${paint("↔")}</span></div>
<p>«Más fuerte» significa que agarra menos texto a su alrededor. La negación sólo afecta a lo mínimo que tenga a su derecha; el bicondicional parte la fórmula entera en dos mitades.</p>
${T(["Sin paréntesis","Se lee como","Conectiva principal"],[[f("¬p ∧ q"),f("(¬p) ∧ q"),paint("∧")],[f("¬(p ∧ q)"),f("¬(p ∧ q)"),paint("¬")],[f("p ∧ q ∨ r"),f("(p ∧ q) ∨ r"),paint("∨")],[f("p → q ∧ r"),f("p → (q ∧ r)"),paint("→")],[f("p ∨ q ↔ ¬r"),f("(p ∨ q) ↔ (¬r)"),paint("↔")]],1)}
<p class="callout"><b>Las dos cosas que se llaman «prioridad» y conviene no mezclar.</b> La <b>prioridad de agarre</b> es la escalera de arriba: dice dónde van los paréntesis implícitos, y la gana ¬. La <b>conectiva principal</b> o dominante es la última en aplicarse, la de agarre más débil dentro de esa fórmula concreta, y es la que da nombre a la fbf («esto es un condicional»). En ${f("¬p ∧ q → r")} la primera en calcularse es ¬ y la dominante es →: la fbf es un condicional.</p>
<p class="callout"><b>Cuando la misma conectiva se repite.</b> Según la guía, ∧ y ∨ se agrupan por la izquierda y → por la derecha: ${f("p → q → r")} es ${f("p → (q → r)")}. Los apuntes no fijan este detalle; es el convenio del libro de referencia (Huth y Ryan) y es lo que hace que el ejercicio 1.b tenga sentido. Aun así, cuando escribas tú una fórmula desde cero, pon el paréntesis: no cuesta nada y elimina la duda.</p>
<p class="callout warn"><b>Ojo, dos convenios distintos.</b> Las diapositivas de teoría (y el autotest, los exámenes y la relación de ejercicios de teoría) ponen ∧ y ∨ al mismo nivel, → y ↔ al mismo nivel, y agrupan de izquierda a derecha: ${f("p → q → r")} = ${f("(p → q) → r")}. La guía de prácticas sigue el convenio de Huth y Ryan. Sólo se notan en fórmulas como ${f("p ∨ q ∧ r")} o cadenas de →. En el examen, ante la duda, <b>pon paréntesis</b>. El analizador de abajo te deja elegir el convenio.</p>
</section>
<section><h3>El árbol sintáctico</h3>
<p>El árbol dibuja la estructura: en la raíz va la conectiva principal y en las hojas los átomos. Dos fórmulas representan la misma oración si y sólo si tienen el mismo árbol. Es la herramienta para contestar la segunda parte del ejercicio 1.</p>
</section>
${toolAnalyzer()}
<p class="callout"><b>Cómo usarlo para el ejercicio 1.</b> Analiza las dos fórmulas por separado y compara los árboles, no el texto. Si los árboles coinciden, representan la misma oración; si no, no. Mira también la línea «conectiva principal»: si una es un condicional y la otra una disyunción, ya está contestado.</p>`; },

"2"(){ return `
<div class="parthead"><span class="eyebrow">Parte 2</span><h2>Formalizar: del castellano a la fórmula</h2><p>La parte con más trampas de toda la asignatura, porque el lenguaje natural dice lo mismo de muchas maneras y a veces en otro orden.</p></div>
<section><h3>El método, en cuatro pasos</h3>
<p>Formalizar no es traducir palabra por palabra: es analizar qué dice la oración y escribirlo en el lenguaje formal. El orden de los pasos importa.</p>
<ol class="checklist"><li>Lee la frase entera y localiza las partes que son proposiciones simples.</li><li>Identifica el nexo y escribe su patrón general con α y β («No α a menos que β») junto a su forma lógica (${f("α → β")}). Este paso decide la conectiva y, en los condicionales, quién va delante de la flecha.</li><li>Escribe la signatura: una letra por proposición, siempre en sentido positivo y como oración completa con sujeto y verbo.</li><li>Sustituye α y β por lo que valgan en esta frase concreta y escribe la fbf.</li></ol>
<p class="callout"><b>Por qué el nexo va antes que la signatura.</b> Si escribes las letras primero, es muy fácil colocarlas en el orden en que aparecen en la frase. Pero en «No te vendo el coche ya que no me ofreces el dinero», la causa se dice la segunda y es la que va delante de la flecha. El patrón del nexo te da el orden correcto antes de que puedas equivocarte.</p>
<p><b>Las tres reglas que ahorran la mayoría de los errores:</b></p>
<ul><li><b>No añadas nada que la oración no diga.</b> Ni contexto, ni implicaciones que tú das por supuestas.</li><li><b>Mantén un criterio homogéneo:</b> si decides que «pero» es ∧, lo es en todo el ejercicio.</li><li><b>Parafrasea las frases dudosas:</b> dilas con otras palabras sin cambiar el sentido y verás cuál es la condición y cuál el resultado.</li></ul>
</section>
<section><h3>Un ejemplo completo</h3>
<p>«Mi coche no tiene tantos caballos como el tuyo, pero corre más.»</p>
${T(["Paso","Resultado","Nota"],[["1","P: «mi coche tiene tantos caballos como el tuyo»","proposición en positivo"],["2","Q: «mi coche corre más que el tuyo»","proposición en positivo"],["3",f("¬P ∧ Q"),"«no» + «pero»"]],1)}
<p>Fíjate en dos cosas: «pero» se traduce como conjunción, porque lógicamente afirma las dos partes, y la negación se saca fuera del átomo.</p>
</section>
<section><h3>El condicional, por dentro</h3>
<p>En ${f("P → Q")}, P es el antecedente (la condición) y Q el consecuente (el resultado). Ese orden no siempre coincide con el orden de las palabras en la frase. Las dos lecturas que hay que memorizar:</p>
${T(["Expresión","Se formaliza","Regla para recordarlo"],[["P es suficiente para Q",f("P → Q"),"Con P basta: lo suficiente va delante"],["P es necesario para Q",f("Q → P"),"Sin P no hay Q: lo necesario va detrás"]],1)}
</section>
<section><h3>Las trampas clásicas</h3>
${T(["Expresión","Formaliza","Por qué"],[["P si Q",f("Q → P"),"«si» marca la condición: Q es el antecedente aunque vaya detrás"],["P sólo si Q",f("P → Q"),"Q es lo imprescindible: si hay P, hay Q"],["P porque Q",f("Q → P"),"La causa es el antecedente, aunque se diga la segunda"],["No P a menos que Q",f("P → Q"),"El «no» ya está dentro del patrón: no se escribe otra vez"],["Ni P ni Q",f("¬P ∧ ¬Q"),"Niega las dos cosas a la vez, no una u otra"],["P pero Q",f("P ∧ Q"),"El contraste es pragmático; lógicamente afirma las dos"],["No sólo P sino también Q",f("P ∧ Q"),"El «no» es parte de la locución, no niega nada"],["Es necesario Q para P",f("P → Q"),"Sin Q no hay P"],["Es suficiente P para Q",f("P → Q"),"Con P basta para tener Q"]],1)}
<p class="callout warn"><b>El error que más se repite en toda la relación.</b> Hay nexos que ya llevan el «no» dentro del patrón. «No α a menos que β» equivale a ${f("α → β")}, sin ninguna negación en la solución. Si además escribes ¬, estás negando dos veces lo mismo.<br>Compáralo con «α sólo si β», que también da ${f("α → β")} pero donde un «no» que aparezca en la frase sí es una negación real que hay que escribir. En el ejercicio 3.c, «No voy al cine a menos que no llueva», hay dos «no» y sólo uno llega a la fórmula: ${f("p → ¬q")}.</p>
</section>
<section><h3>Diccionario de nexos</h3>
<p>La misma conectiva se esconde tras muchas expresiones. Cuando una expresión cumple la misma función lógica que «no», «y», «o», «si» o «si y sólo si», se formaliza con esa conectiva aunque suene distinta.</p>
<div class="tool" style="border-width:1px"><label for="dictq">Escribe para filtrar (por ejemplo «menos», «porque», «cuando»)<input type="text" id="dictq" autocomplete="off" placeholder="nexo…" style="font-family:var(--f-body)"></label><div class="dict" id="dictout">${dictHTML("")}</div></div>
</section>
<section><h3>Razonamiento o condicional</h3>
<p>Hay frases que no son un condicional aunque lo parezcan: las que presentan información ya ocurrida y sacan una conclusión de ella. Compara:</p>
${T(["Frase","Se formaliza","Motivo"],[["Si cerramos a las 20:00, no podemos venderte nada",f("P → Q"),"El antecedente es una condición hipotética"],["Hemos cerrado a las 20:00, por lo tanto no podemos venderte nada",f("P ⊢ Q"),"El antecedente ya ha ocurrido: es una premisa"]],1)}
<p>Los nexos «luego», «así que», «por lo tanto», «por consiguiente» y «así pues» anuncian una conclusión, no un consecuente. Se marcan con ⊨ (nivel semántico) o con ⊢ (nivel sintáctico).</p>
<p>Para formalizar un razonamiento: separa las premisas de la conclusión, formaliza cada parte por separado y escribe el esquema completo, por ejemplo ${f("{P → Q, ¬P → R} ⊢ (P ∨ ¬P) → S")}.</p>
<p class="callout"><b>Formalizar no es juzgar.</b> «Voy al cine luego llueve» se formaliza ${f("p ⊨ q")} y la formalización es correcta, aunque el razonamiento sea malísimo. Comprobar si un razonamiento es válido es otro trabajo distinto, el de las tablas de verdad y la deducción natural.</p>
<p class="callout warn"><b>Los símbolos que nunca van dentro de una fbf.</b> ⊨, ⊢ y ≡ pertenecen al metalenguaje: hablan <i>sobre</i> las fórmulas. No son conectivas, no se pueden negar ni combinar con ∧, y no pueden aparecer dentro de una fórmula. Sólo separan premisas de conclusión, o relacionan dos fórmulas.</p>
</section>`; },

"3"(){ return `
<div class="parthead"><span class="eyebrow">Parte 3</span><h2>Semántica: tablas de verdad</h2><p>Qué significa cada conectiva, cómo se clasifica una fórmula y cómo se comprueba si un razonamiento es válido probando todas las interpretaciones.</p></div>
<section><h3>Qué hace cada conectiva</h3>
${T(["Símbolo","Nombre","Se lee","Es verdadera cuando…"],[[paint("¬"),"Negación","«no», «no es cierto que»","lo que niega es falso. Invierte el valor"],[paint("∧"),"Conjunción","«y», «pero», «aunque»","las dos partes son verdaderas. Basta una falsa para tumbarla"],[paint("∨"),"Disyunción","«o», «o bien»","al menos una es verdadera. Es inclusiva: si se cumplen las dos, también"],[paint("→"),"Condicional","«si… entonces», «sólo si»","no ocurre que el antecedente sea verdadero y el consecuente falso. Sólo falla en V → F"],[paint("↔"),"Bicondicional","«si y sólo si», «equivale a»","las dos partes tienen el mismo valor"]],1)}
<p class="callout"><b>Si te quedas con una sola fila, que sea la segunda</b> (p = V, q = F). El condicional sólo es falso cuando la promesa se rompe: antecedente verdadero y consecuente falso. En los otros tres casos es verdadero, incluso cuando el antecedente es falso. Por eso «si 2+2=5 entonces soy el Papa» es una fórmula verdadera. La tabla completa la tienes en <a href="../teoria/chuletas.html#conectivas">Teoría → Chuletas → Conectivas</a>.</p>
</section>
<section><h3>Cómo se construye una tabla</h3>
<ul><li>Con n letras distintas hay 2ⁿ filas: 2 letras dan 4 filas, 3 dan 8, 4 dan 16, 5 dan 32.</li><li>Se pone una columna por cada letra y luego una por cada subfórmula, de dentro hacia fuera, hasta la fórmula completa.</li><li>El orden habitual de las filas es contar en binario con V arriba: la primera fila es todo V y la última todo F.</li><li>La última columna es la de la fórmula completa, y es la que decide el tipo de oración.</li></ul>
${T(["Tipo","Columna final","¿Satisfacible?","Qué significa"],[["Tautología (válida)","Todo V","Sí","Verdadera en cualquier interpretación"],["Contingente","Hay V y F","Sí","Verdadera en unas interpretaciones y falsa en otras"],["Contradicción (insatisfacible)","Todo F","No","Falsa en cualquier interpretación"]],1)}
<p>Satisfacible quiere decir que existe al menos una fila que la hace verdadera. Por tanto las tautologías y las contingentes son satisfacibles, y sólo las contradicciones no lo son. Esto es lo que pregunta el ejercicio 4.</p>
<p class="callout"><b>Atajo para no hacer la tabla entera.</b> Para saber si ${f("α → β")} es tautología no hace falta rellenarlo todo: basta con buscar si puede darse el único caso malo, antecedente V y consecuente F. Si demuestras que ese caso es imposible, es tautología. Es la misma idea que está detrás de los tableaux de la parte 5.</p>
</section>
<section><h3>Consecuencia lógica y equivalencia</h3>
<p>Un razonamiento ${f("{α₁, …, αₙ} ⊨ β")} es válido cuando no existe ninguna interpretación que haga verdaderas todas las premisas y falsa la conclusión. Para comprobarlo con tablas: construye la tabla de todas las premisas y de la conclusión, quédate sólo con las filas donde todas las premisas son verdaderas y mira la conclusión en esas filas. Si en todas ellas es verdadera, es válido.</p>
<p>Una interpretación que hace verdaderas las premisas y falsa la conclusión es un <b>contraejemplo</b>, y basta uno para tumbar el razonamiento.</p>
<p>Dos fórmulas son equivalentes (${f("α ≡ β")}) cuando tienen la misma columna final, fila a fila. Equivale a decir que ${f("α ↔ β")} es una tautología, y también a que ${f("α ⊢ β")} y ${f("β ⊢ α")}.</p>
</section>
${toolChecker()}
<p class="callout"><b>Para qué te sirve de verdad.</b> Antes de pelearte con una demostración, comprueba que el razonamiento es válido. Si el comprobador te da un contraejemplo, no existe ninguna demostración y lo que tienes mal es la formalización, no la deducción. Eso ahorra mucho tiempo perdido.</p>`; },

"4"(){ return `
<div class="parthead"><span class="eyebrow">Parte 4</span><h2>Deducción natural</h2><p>Derivar la conclusión a partir de las premisas aplicando reglas, sin mirar valores de verdad. Es lo que más peso tiene en las prácticas.</p></div>
<section><h3>Los dos niveles</h3>
<p>Con tablas compruebas que la conclusión se sigue de las premisas probando todas las interpretaciones: es el nivel semántico, y se escribe ⊨. Con deducción natural la derivas aplicando reglas: es el nivel sintáctico, y se escribe ⊢.</p>
<p>En L0 los dos siempre dan la misma respuesta, porque el sistema es correcto (todo lo que se deduce es válido) y completo (todo lo válido se puede deducir). La ventaja de la deducción es el tamaño: con diez letras una tabla tiene 1024 filas, y una demostración suele caber en diez líneas. La desventaja es que hay que buscarla.</p>
<p>El sistema tiene dos piezas: los axiomas, que son las premisas del problema, y 13 reglas básicas. Nada más.</p>
</section>
<section><h3>La notación Fitting</h3>
<p>Cada línea lleva su número, la fórmula y la justificación, que dice qué regla has aplicado y sobre qué líneas. Las premisas van primero, sin justificar. Cuando haces un supuesto, abres una caja (aquí, la barra vertical): dentro derivas lo que necesites y al cerrarla obtienes una conclusión que ya no depende de él. La última línea, siempre fuera de toda caja, es la conclusión del problema.</p>
${proof("Ejemplo: "+f("{ p → q, ¬q } ⊢ ¬p"),[["1","p → q","Premisa",0],["2","¬q","Premisa",0],["3","p","Supuesto (para I¬)",1],["4","q","E→ 1, 3",1],["5","q ∧ ¬q","I∧ 4, 2",1],["6","¬p","I¬ 3-5",0]])}
</section>
<section><h3>El alcance de las cajas</h3>
<p class="callout"><b>La regla, tal como la dan los apuntes:</b> una regla puede usar una o dos fbf que estén por encima suya en la demostración, salvo que estén en una caja ya cerrada.</p>
<p>Todo lo que derivas dentro de una caja depende del supuesto que la abre. Cuando la cierras, ese supuesto deja de estar en vigor y todo lo que dependía de él desaparece con él. Lo único que sobrevive es la línea que genera la propia regla de cierre, justo debajo de la caja. En el ejemplo de arriba, las líneas 3, 4 y 5 ya no pueden citarse después de la línea 6. La línea 6 sí, porque está fuera.</p>
<p>Dentro de una caja sí puedes usar los supuestos de las cajas que la contienen, porque siguen abiertas. Las cajas se cierran en orden inverso al que se abren, igual que los paréntesis.</p>
<p class="callout warn"><b>El error típico en el examen:</b> cerrar una caja y, tres líneas después, citar algo que quedó dentro. Es tentador porque la fórmula sigue escrita en el papel, pero ya no vale. Antes de citar una línea, mira si hay alguna caja cerrada entre ella y donde estás.</p>
</section>
<section><h3>Las 13 reglas básicas</h3>
<p>Cada conectiva tiene una regla para introducirla (construir una fórmula que la lleve) y otra para eliminarla (aprovechar una que ya la tiene). A eso se añaden la doble negación, la iteración y CONTRA.</p>
<div class="rulegrid">
${rule("I∧","",["α    β"],"α ∧ β","Si tienes las dos por separado, puedes juntarlas.")}
${rule("E∧","",["α ∧ β"],"α  ·  β","De una conjunción sacas cualquiera de sus partes.")}
${rule("I∨","",["α"],"α ∨ β  ·  β ∨ α","Con una parte basta: β puede ser cualquier fbf.")}
${rule("E∨","prueba por casos · dos cajas",["α ∨ β","[supón α … γ]  [supón β … γ]"],"γ","Si γ sale en los dos casos, γ es cierta pase lo que pase.")}
${rule("I→","teorema de la deducción · una caja",["[supón α … obtén β]"],"α → β","La forma estándar de demostrar un condicional.")}
${rule("E→","modus ponens",["α → β    α"],"β","Si se cumple la condición, tienes el resultado.")}
${rule("I¬","reducción al absurdo · una caja",["[supón α … obtén β ∧ ¬β]"],"¬α","Si suponer α rompe el sistema, α era falsa.")}
${rule("E¬","reducción al absurdo · una caja",["[supón ¬α … obtén β ∧ ¬β]"],"α","La versión para demostrar una fórmula afirmada.")}
${rule("E¬¬","",["¬¬α"],"α","Dos negaciones se cancelan.")}
${rule("I↔","",["α → β    β → α"],"α ↔ β","Necesitas los dos condicionales, uno en cada sentido.")}
${rule("E↔","",["α ↔ β"],"α → β  ·  β → α","Un bicondicional guarda dentro dos condicionales.")}
${rule("IT","iteración",["α"],"α","Repite una línea para tenerla donde la necesitas.")}
${rule("CONTRA","",["α    ¬α"],"β","De una contradicción se sigue cualquier fbf.")}
</div>
<p class="callout"><b>Sólo cuatro reglas abren caja:</b> E∨ (dos cajas) y I→, I¬, E¬ (una cada una). Las otras nueve trabajan con líneas que ya tienes.</p>
<p class="callout warn"><b>No confundas CONTRA con la reducción al absurdo.</b> En I¬ y E¬ abres una caja con un supuesto y buscas una contradicción dentro; al cerrarla concluyes lo contrario de lo que supusiste. En CONTRA no hay supuesto ni caja: si ya tienes α y ¬α a la vista, de ahí puedes escribir la fórmula que necesites. Lo usarás sobre todo para que las dos cajas de una prueba por casos acaben en la misma fórmula.</p>
</section>
<section><h3>Las seis estrategias</h3>
<p>Las reglas dicen qué es legal; las estrategias dicen qué conviene. Casi siempre es la forma de la conclusión la que decide por dónde empezar.</p>
${T(["Si la conclusión es…","Estrategia","Qué haces"],[[f("α → β"),"Teorema de la deducción · I→","Caja con supuesto α hasta obtener β; cerrar con I→"],[f("¬α"),"Reducción al absurdo · I¬","Caja con supuesto α hasta β ∧ ¬β"],["α (afirmada)","Reducción al absurdo · E¬","Caja con supuesto ¬α hasta β ∧ ¬β"],[f("α ∧ β"),"Conclusiones parciales","Conseguir cada parte por separado y unirlas con I∧"],[f("α ∨ β"),"Conclusiones parciales","Basta con una de las dos: I∨ añade la otra"],["⊢ φ (sin premisas)","Demostración de teoremas","Empezar con caja: teorema de la deducción o absurdo"],["hay una premisa "+f("α ∨ β"),"Prueba por casos · E∨","Una caja por rama; las dos acaban en la misma γ"]],1)}
<p class="callout"><b>Consejo práctico:</b> empieza siempre por lo que no cuesta nada. Aplica primero las reglas que no necesitan supuestos (E∧, E→, E↔, E¬¬) para desmontar las premisas. Muchas veces, después de eso, la demostración ya está casi hecha. Abre cajas sólo cuando la conclusión te lo pida.</p>
</section>
<section><h3>Las cinco situaciones, con un ejemplo de cada una</h3>
<p><b>Deducción directa · sin ningún supuesto.</b> Las premisas ya contienen todo. Aquí E¬¬ limpia la doble negación e I∧ construye el antecedente exacto que E→ necesita, porque tener p y q sueltas no es tener ${f("p ∧ q")}.</p>
${proof(f("{ (p ∧ q) → (r ∧ s), ¬¬p, q } ⊢ s"),[["1","(p ∧ q) → (r ∧ s)","Premisa"],["2","¬¬p","Premisa"],["3","q","Premisa"],["4","p","E¬¬ 2"],["5","p ∧ q","I∧ 4, 3"],["6","r ∧ s","E→ 1, 5"],["7","s","E∧ 6"]])}
<p><b>Teorema de la deducción · conclusión con forma α → β.</b> Dos condicionales anidados, dos cajas. En la línea 4 se usan los supuestos de las dos cajas a la vez, y se puede porque ninguna se ha cerrado todavía.</p>
${proof(f("{ (p ∧ q) → r } ⊢ p → (q → r)"),[["1","(p ∧ q) → r","Premisa",0],["2","p","Supuesto (para I→)",1],["3","q","Supuesto (para I→)",2],["4","p ∧ q","I∧ 2, 3",2],["5","r","E→ 1, 4",2],["6","q → r","I→ 3-5",1],["7","p → (q → r)","I→ 2-6",0]])}
<p><b>Prueba por casos · hay una premisa disyuntiva.</b> Cada caso da un resultado distinto, r en uno y s en otro, pero E∨ exige que las dos cajas terminen en la misma fórmula. Por eso se da un paso más con I∨ en cada una hasta ${f("r ∨ s")}.</p>
${proof(f("{ p ∨ q, p → r, q → s } ⊢ r ∨ s"),[["1","p ∨ q","Premisa",0],["2","p → r","Premisa",0],["3","q → s","Premisa",0],["4","p","Supuesto (para E∨)",1],["5","r","E→ 2, 4",1],["6","r ∨ s","I∨ 5",1],["7","q","Supuesto (para E∨)",1],["8","s","E→ 3, 7",1],["9","r ∨ s","I∨ 8",1],["10","r ∨ s","E∨ 1, 4-6, 7-9",0]])}
<p><b>Reducción al absurdo · conclusión negada.</b> Se supone lo contrario de la conclusión y se busca una contradicción. La contradicción se escribe con la forma ${f("β ∧ ¬β")} en una sola línea, no como dos líneas sueltas.</p>
${proof(f("{ (p ∧ q) → r, r → s, ¬s ∧ p } ⊢ ¬q"),[["1","(p ∧ q) → r","Premisa",0],["2","r → s","Premisa",0],["3","¬s ∧ p","Premisa",0],["4","¬s","E∧ 3",0],["5","p","E∧ 3",0],["6","q","Supuesto (para I¬)",1],["7","p ∧ q","I∧ 5, 6",1],["8","r","E→ 1, 7",1],["9","s","E→ 2, 8",1],["10","s ∧ ¬s","I∧ 9, 4",1],["11","¬q","I¬ 6-10",0]])}
<p><b>CONTRA e IT · las dos reglas que parecen tontas.</b> En el caso q hay p y ¬p a la vista, así que CONTRA permite escribir directamente la r que hace falta, sin abrir caja. En el caso r, el supuesto ya es la fórmula buscada, pero la caja tiene que <i>terminar</i> en ella: para eso sirve IT.</p>
${proof(f("{ p → (q ∨ r), q → ¬p } ⊢ p → r"),[["1","p → q ∨ r","Premisa",0],["2","q → ¬p","Premisa",0],["3","p","Supuesto (para I→)",1],["4","q ∨ r","E→ 1, 3",1],["5","q","Supuesto (para E∨)",2],["6","¬p","E→ 2, 5",2],["7","r","CONTRA 3, 6",2],["8","r","Supuesto (para E∨)",2],["9","r","IT 8",2],["10","r","E∨ 4, 5-7, 8-9",1],["11","p → r","I→ 3-10",0]])}
</section>
<section><h3>Reglas derivadas</h3>
<p>Cualquier problema ya demostrado puede convertirse en una regla nueva del sistema. Los apuntes destacan tres:</p>
<div class="rulegrid">
${rule("MT","modus tollens",["α → β    ¬β"],"¬α","Si falta el resultado, no se dio la condición.")}
${rule("SD","silogismo disyuntivo",["α ∨ β    ¬α"],"β","Descartada una rama, queda la otra.")}
${rule("SH","silogismo hipotético",["α → β    β → γ"],"α → γ","Los condicionales encadenan.")}
</div>
<p class="callout warn"><b>Cuándo puedes usarlas:</b> sólo si el enunciado no lo prohíbe. Los ejercicios 6 y 11 piden expresamente las 13 reglas básicas, así que allí hay que demostrar el modus tollens entero cada vez. En un ejercicio que no lo prohíba, «MT 2, 4» en una línea te ahorra cuatro.</p>
</section>
<section><h3>Equivalencias</h3>
<p>Dos fbf son equivalentes (${f("α ≡ β")}) cuando se deducen la una de la otra en las dos direcciones. Demostrar una equivalencia son dos demostraciones, una por sentido. Una vez demostrada, también puede usarse como regla derivada.</p>
${T(["Ley","Equivalencias"],[["De Morgan",f("¬(α ∧ β) ≡ ¬α ∨ ¬β")+" "+f("¬(α ∨ β) ≡ ¬α ∧ ¬β")],["Conmutativas",f("α ∧ β ≡ β ∧ α")+" "+f("α ∨ β ≡ β ∨ α")],["Doble negación",f("α ≡ ¬¬α")],["Asociativas",f("(α ∧ β) ∧ γ ≡ α ∧ (β ∧ γ)")+" "+f("(α ∨ β) ∨ γ ≡ α ∨ (β ∨ γ)")],["Distributivas",f("α ∧ (β ∨ γ) ≡ (α ∧ β) ∨ (α ∧ γ)")+" "+f("α ∨ (β ∧ γ) ≡ (α ∨ β) ∧ (α ∨ γ)")],["Transposición",f("α → β ≡ ¬β → ¬α")]],1)}
<p><b>Ejemplo: De Morgan demostrada en las dos direcciones.</b> Ida: dos reducciones al absurdo independientes, una por cada mitad de la conjunción.</p>
${proof(f("{ ¬(p ∨ q) } ⊢ ¬p ∧ ¬q"),[["1","¬(p ∨ q)","Premisa",0],["2","p","Supuesto (para I¬)",1],["3","p ∨ q","I∨ 2",1],["4","(p ∨ q) ∧ ¬(p ∨ q)","I∧ 3, 1",1],["5","¬p","I¬ 2-4",0],["6","q","Supuesto (para I¬)",1],["7","p ∨ q","I∨ 6",1],["8","(p ∨ q) ∧ ¬(p ∨ q)","I∧ 7, 1",1],["9","¬q","I¬ 6-8",0],["10","¬p ∧ ¬q","I∧ 5, 9",0]])}
<p>Vuelta: aquí está el truco de CONTRA. En el caso q la contradicción natural sería ${f("q ∧ ¬q")}, pero E∨ exige que las dos cajas acaben igual, así que se escribe la misma ${f("p ∧ ¬p")} del otro caso.</p>
${proof(f("{ ¬p ∧ ¬q } ⊢ ¬(p ∨ q)"),[["1","¬p ∧ ¬q","Premisa",0],["2","¬p","E∧ 1",0],["3","¬q","E∧ 1",0],["4","p ∨ q","Supuesto (para I¬)",1],["5","p","Supuesto (para E∨)",2],["6","p ∧ ¬p","I∧ 5, 2",2],["7","q","Supuesto (para E∨)",2],["8","p ∧ ¬p","CONTRA 7, 3",2],["9","p ∧ ¬p","E∨ 4, 5-6, 7-8",1],["10","¬(p ∨ q)","I¬ 4-9",0]])}
</section>`; },

"5"(){ return `
<div class="parthead"><span class="eyebrow">Parte 5</span><h2>Tableaux semánticos</h2><p>Una técnica SAT: en vez de derivar la conclusión, se busca el contraejemplo. Si no existe, el razonamiento es válido.</p></div>
<section><h3>La idea</h3>
<p>Un razonamiento es válido si no existe ninguna interpretación que haga verdaderas todas las premisas y falsa la conclusión. El tableau busca exactamente esa interpretación. Si la encuentra, tienes el contraejemplo; si demuestra que no puede existir, el razonamiento es válido. A diferencia de la deducción natural, es mecánico: no hay que elegir estrategia, sólo aplicar reglas hasta que no queden fórmulas que descomponer.</p>
<ol><li>Se escriben las premisas y la negación de la conclusión. Esa es la situación que buscamos: todo verdadero a la vez.</li><li>Se descomponen las fórmulas con las reglas de abajo, hasta que sólo queden letras, afirmadas o negadas.</li><li>Una rama que contiene una fórmula y su negación es imposible y se cierra (✗).</li><li>Si todas las ramas se cierran, el contraejemplo no existe y el razonamiento es válido. Si alguna queda abierta, sus letras te dan un contraejemplo concreto.</li></ol>
${T(["Reglas α · no ramifican","Añaden a la rama","Reglas β · ramifican","Rama izq. | rama der."],[[f("α ∧ β"),f("α")+", "+f("β"),f("α ∨ β"),f("α")+" | "+f("β")],[f("¬(α ∨ β)"),f("¬α")+", "+f("¬β"),f("¬(α ∧ β)"),f("¬α")+" | "+f("¬β")],[f("¬(α → β)"),f("α")+", "+f("¬β"),f("α → β"),f("¬α")+" | "+f("β")],[f("¬¬α"),f("α"),f("α ↔ β"),f("α")+", "+f("β")+" | "+f("¬α")+", "+f("¬β")],["","",f("¬(α ↔ β)"),f("α")+", "+f("¬β")+" | "+f("¬α")+", "+f("β")]],1)}
<p class="callout"><b>Truco para que el árbol salga pequeño:</b> aplica primero todas las reglas α, que no ramifican, y después las β, empezando por las que cierran alguna rama enseguida. Cada vez que ramificas, el árbol se duplica. En cada línea conviene anotar de qué línea sale.</p>
<p class="callout warn"><b>Sobre la notación.</b> La guía usa la notación estándar (árbol con reglas α y β, líneas numeradas y cierre marcado con ✗) y trata ${f("α ↔ β")} como β-regla. En las diapositivas de teoría ${f("α ↔ β")} aparece como α-fórmula con componentes ${f("α → β")} y ${f("β → α")}: las dos formas son correctas y llegan al mismo resultado. Si en clase lo dibujáis de otra forma, adapta la presentación; el razonamiento es el mismo.</p>
</section>
<section><h3>Un tableau completo</h3>
<p>Es el ejercicio 8: el razonamiento de Rosa, el mismo que el 7 pero resuelto por este método. Partimos de las dos premisas y de la conclusión negada, ${f("¬(q ∨ r)")}.</p>
<div class="tool" style="border-width:1px;border-color:var(--line)"><div class="tree">${branchHTML({steps:["1 · `(p → q) ∧ (¬p → r)` — premisa","2 · `p ∨ ¬p` — premisa","3 · `¬(q ∨ r)` — conclusión negada","4 · `p → q` — de 1 (α)","5 · `¬p → r` — de 1 (α)","6 · `¬q` — de 3 (α)","7 · `¬r` — de 3 (α)"],split:{why:"Ramificamos la línea 4, `p → q` (β)",br:[{lab:"8 · `¬p` (de 4)",split:{why:"Ramificamos la línea 5, `¬p → r` (β)",br:[{lab:"9 · `¬¬p` (de 5)",end:{c:1,t:"cierra con 8 y 9"}},{lab:"10 · `r` (de 5)",end:{c:1,t:"cierra con 7 y 10"}}]}},{lab:"11 · `q` (de 4)",end:{c:1,t:"cierra con 6 y 11"}}]}})}</div></div>
<p>Líneas 4 a 7: reglas α, sin ramificar. La conjunción de la línea 1 da sus dos condicionales, y la disyunción negada de la 3 da ¬q y ¬r. Después se ramifica la línea 4: o bien ¬p, o bien q. La rama de q cierra enseguida con ¬q. La de ¬p necesita ramificar la línea 5: ¬¬p cierra con ¬p, y r cierra con ¬r. Las tres ramas se cierran: el razonamiento es válido.</p>
<p>Fíjate en que la premisa 2, ${f("p ∨ ¬p")}, no ha hecho falta. Es una tautología, verdadera en cualquier interpretación, así que no puede ayudar a descartar nada. En la deducción natural del ejercicio 7, en cambio, era imprescindible: es la disyunción que abre la prueba por casos.</p>
</section>
<section><h3>Los tres métodos, comparados</h3>
${T(["","Tablas de verdad","Deducción natural","Tableau semántico"],[["<b>Qué demuestra</b>","Validez, ⊨","Deducción correcta, ⊢","Validez, ⊨"],["<b>Nivel</b>","Semántico","Sintáctico","Semántico"],["<b>Cómo se trabaja</b>","Mecánico pero crece 2ⁿ","Hay que elegir estrategia","Mecánico: reglas hasta cerrar"],["<b>Si NO es válido</b>","Ves la fila del contraejemplo","No encuentras la demostración, sin saber si existe","Queda una rama abierta con el contraejemplo"],["<b>Tamaño</b>","32 filas con 5 letras","Suele caber en 10 líneas","Depende de cuántas β haya"]],1)}
<p class="callout"><b>Por qué los tres coinciden siempre:</b> la deducción natural de L0 es correcta y completa. Todo lo que se deduce es válido, y todo lo válido se puede deducir. Por eso ⊢ y ⊨ dan siempre la misma respuesta, y por eso puedes comprobar con una tabla antes de ponerte a demostrar.</p>
</section>`; },

"6"(){ return `
<div class="parthead"><span class="eyebrow">Parte 6</span><h2>Chuleta y errores típicos</h2><p>Lo esencial de un vistazo y la lista de comprobación antes de entregar.</p></div>
<section><h3>Resumen de un vistazo</h3>
${T(["Si el enunciado dice…","Lo que te pide","Dónde mirar"],[["«¿Es fbf? ¿Representan la misma oración?»","Reglas de formación + árbol sintáctico","Parte 1"],["«Definir una signatura y construir las fbf»","Nexo → signatura → solución","Parte 2"],["«Comprobar el tipo de oración por tablas»","Tautología / contingente / contradicción","Parte 3"],["«¿Qué puedes decir sobre la satisfacibilidad?»","¿Hay alguna fila verdadera?","Parte 3"],["«Formalizar el razonamiento»","Separar premisas y conclusión; ⊢, no →","Parte 2"],["«¿Es una deducción correcta?»","Demostrar por deducción natural","Parte 4"],["«Utilizando las 13 reglas básicas»","Sin MT, SD ni SH","Parte 4"],["«¿Es un razonamiento válido? Técnica SAT»","Tableau semántico","Parte 5"]],1)}
</section>
<section><h3>Los errores que más se repiten</h3>
${T(["Error","Por qué está mal"],[["Meter la negación dentro del átomo","Pierdes la estructura: luego no puedes aplicar ninguna regla que hable de ¬"],["Escribir ¬ con «no α a menos que β»","El «no» ya forma parte del patrón del nexo: lo estarías contando dos veces"],["Confundir suficiente con necesario","Lo suficiente va delante de la flecha; lo necesario, detrás"],["Formalizar «luego» o «por lo tanto» como →","Anuncian una conclusión, no un consecuente: es ⊢"],["Meter ⊢ o ⊨ dentro de una fórmula","No son conectivas, son metalenguaje"],["Citar una línea de una caja ya cerrada","Se dedujo bajo un supuesto que ya has retirado"],["Cerrar las dos cajas de E∨ en fórmulas distintas","La regla exige la misma γ: ajusta con I∨, IT o CONTRA"],["Aplicar E→ sin el antecedente exacto","Tener p y q sueltas no es tener p ∧ q: únelas con I∧"],["Escribir la contradicción en dos líneas sueltas","I¬ y E¬ exigen la forma β ∧ ¬β en una sola línea"],["Confundir CONTRA con la reducción al absurdo","CONTRA no abre caja ni concluye lo contrario de nada"],["Terminar la demostración dentro de una caja","La conclusión no puede depender de ningún supuesto"],["Olvidar negar la conclusión en un tableau","El tableau busca el contraejemplo: parte de la conclusión negada"]],1)}
</section>
<section><h3>Antes de entregar</h3>
<p><b>Si has formalizado</b></p>
<ul class="checklist"><li>¿Todas las letras están definidas en positivo y como oraciones completas con sujeto y verbo?</li><li>¿Cada ¬ de la fórmula corresponde a un «no» real de la frase, y no a uno que ya estaba en el patrón del nexo?</li><li>¿He parafraseado los condicionales para confirmar quién es el antecedente?</li><li>¿He usado el mismo criterio en todos los apartados del ejercicio?</li><li>¿He añadido algo que la frase no decía?</li></ul>
<p><b>Si has demostrado</b></p>
<ul class="checklist"><li>¿Cada línea cita sólo líneas que están por encima y fuera de cajas cerradas?</li><li>¿Cada caja empieza con un supuesto y termina en lo que su regla de cierre necesita?</li><li>¿Las dos cajas de cada E∨ acaban en la misma fórmula?</li><li>¿La última línea es la conclusión del enunciado y está fuera de toda caja?</li><li>Si el enunciado pedía las 13 básicas, ¿he evitado MT, SD y SH?</li></ul>
<p><b>Si has hecho un tableau</b></p>
<ul class="checklist"><li>¿La raíz son las premisas y la conclusión negada?</li><li>¿He aplicado antes las reglas α que las β?</li><li>¿Cada línea indica de qué línea sale?</li><li>¿He marcado con qué par de fórmulas cierra cada rama?</li><li>Si alguna rama ha quedado abierta, ¿he escrito el contraejemplo que da?</li></ul>
</section>
<p class="muted" style="font-size:14px">Material construido a partir de los apuntes «Formalización en lógica proposicional (L0)» y «Sistemas de deducción natural en lógica proposicional (L0)», y de la relación de ejercicios de prácticas (sesiones 1 a 5), Facultad de Informática, Universidad de Murcia. Referencias: Enric Sesa i Nogueras, <i>Lògica d'enunciats</i> (UOC, 2003); Michael Huth y Mark Ryan, <i>Logic in Computer Science</i> (CUP, 2004). Si algún criterio de tu profesor difiere de lo escrito aquí, manda el suyo.</p>`; }
};

const KEYS=["¬","∧","∨","→","↔","(",")"];
function convSelect(id){ const c=S.conv||"guia"; return `<label for="${id}">Convenio de prioridad<select id="${id}" data-conv>${Object.keys(CONV).map(k=>`<option value="${k}"${k===c?" selected":""}>${esc(CONV[k].name)}</option>`).join("")}</select></label>`; }
function keysHTML(){ return `<div class="keys" aria-label="Insertar símbolo">${KEYS.map(k=>`<button type="button" data-ins="${k}">${paint(k)}</button>`).join("")}</div>`; }
function toolAnalyzer(){
  const v=S.anf!=null?S.anf:"(¬p ∧ q) → (r ∨ ¬s)";
  return `<div class="tool" id="tool-an"><div class="exh"><span class="eyebrow">Herramienta</span><span class="pts">Analizador de fórmulas</span></div>
    <p class="muted" style="font-size:15px">Escribe cualquier fórmula: te digo si es fbf, cómo se lee con todos los paréntesis, su conectiva principal, el árbol sintáctico, el orden de aplicación y la tabla de verdad. También vale escribir con el teclado: <code class="f" style="font-variant-ligatures:none">~</code> o <code class="f">!</code> para ¬, <code class="f">&amp;</code> para ∧, <code class="f">|</code> para ∨, <code class="f" style="font-variant-ligatures:none">-&gt;</code> para → y <code class="f" style="font-variant-ligatures:none">&lt;-&gt;</code> para ↔.</p>
    <label for="anin">Fórmula<input type="text" id="anin" value="${esc(v)}" autocomplete="off" spellcheck="false"></label>
    ${keysHTML()}${convSelect("anconv")}
    <div id="anout" style="display:flex;flex-direction:column;gap:10px">${analyzeHTML(v,S.conv||"guia")}</div></div>`;
}
function toolChecker(){
  const P=S.chp||["(p → q) ∧ (¬p → r)","p ∨ ¬p"], C=S.chc!=null?S.chc:"q ∨ r";
  return `<div class="tool" id="tool-ch"><div class="exh"><span class="eyebrow">Herramienta</span><span class="pts">Comprobador de razonamientos</span></div>
    <p class="muted" style="font-size:15px">Mete tus premisas y la conclusión. Viene cargado el ejercicio 7.</p>
    <div id="chprems" style="display:flex;flex-direction:column;gap:8px">${P.map((p,k)=>`<label>Premisa ${k+1}<input type="text" data-prem="${k}" value="${esc(p)}" autocomplete="off" spellcheck="false"></label>`).join("")}</div>
    <div class="row"><button type="button" class="btn ghost" id="chadd">+ Añadir premisa</button>${P.length>1?`<button type="button" class="btn ghost" id="chdel">− Quitar la última</button>`:""}</div>
    <label for="chconc">Conclusión<input type="text" id="chconc" value="${esc(C)}" autocomplete="off" spellcheck="false"></label>
    ${keysHTML()}${convSelect("chconv")}
    <div id="chout" style="display:flex;flex-direction:column;gap:10px">${checkHTML(P,C,S.conv||"guia")}</div></div>`;
}
let lastInput=null;
function bindGuide(root){
  root.querySelectorAll("input[type=text]").forEach(i=>i.addEventListener("focus",()=>{lastInput=i;}));
  root.querySelectorAll("[data-ins]").forEach(b=>b.onclick=()=>{
    const tool=b.closest(".tool"); let inp=lastInput&&tool.contains(lastInput)?lastInput:tool.querySelector("input[type=text]");
    const s=inp.selectionStart??inp.value.length, e=inp.selectionEnd??inp.value.length;
    inp.value=inp.value.slice(0,s)+b.dataset.ins+inp.value.slice(e); inp.focus(); inp.setSelectionRange(s+b.dataset.ins.length,s+b.dataset.ins.length);
    inp.dispatchEvent(new Event("input"));
  });
  const an=root.querySelector("#anin"); if(an) an.oninput=()=>{ S.anf=an.value; root.querySelector("#anout").innerHTML=analyzeHTML(an.value,S.conv||"guia"); };
  const ch=root.id==="tool-ch"?root:root.querySelector("#tool-ch");
  if(ch){
    const upd=()=>{ S.chp=[...ch.querySelectorAll("[data-prem]")].map(x=>x.value); S.chc=ch.querySelector("#chconc").value; ch.querySelector("#chout").innerHTML=checkHTML(S.chp,S.chc,S.conv||"guia"); };
    ch.querySelectorAll("[data-prem],#chconc").forEach(x=>x.oninput=upd);
    ch.querySelector("#chadd").onclick=()=>{ upd(); S.chp.push(""); ch.outerHTML=toolChecker(); const n=document.getElementById("tool-ch"); bindGuide(n); n.querySelector(`[data-prem="${S.chp.length-1}"]`).focus(); };
    const del=ch.querySelector("#chdel"); if(del) del.onclick=()=>{ upd(); S.chp.pop(); ch.outerHTML=toolChecker(); bindGuide(document.getElementById("tool-ch")); };
  }
  root.querySelectorAll("[data-conv]").forEach(s=>s.onchange=()=>{ S.conv=s.value; store("fli-conv",S.conv);
    root.querySelectorAll("[data-conv]").forEach(o=>o.value=S.conv);
    if(an) an.oninput(); const c=root.querySelector("#tool-ch"); if(c){ c.querySelector("#chout").innerHTML=checkHTML(S.chp||[...c.querySelectorAll("[data-prem]")].map(x=>x.value),c.querySelector("#chconc").value,S.conv); } });
  const dq=root.querySelector("#dictq"); if(dq) dq.oninput=()=>{ root.querySelector("#dictout").innerHTML=dictHTML(dq.value); };
}

/* ---------- Render de la página ---------- */
function currentPart(){
  const m=/^#parte-(\d)$/.exec(location.hash);
  if(m&&GUIDE[m[1]]) return m[1];
  const s=String(store("fli-gpart")||"1"); return GUIDE[s]?s:"1";
}
function guideRender(){
  const part=currentPart(), box=document.getElementById("app");
  const nav=`<nav class="partnav" aria-label="Partes de la guía">${GP.map(([k,l])=>`<a class="tab${k===part?" on":""}"${k===part?' aria-current="page"':""} href="#parte-${k}">${k} · ${l}</a>`).join("")}</nav>`;
  const idx=GP.findIndex(x=>x[0]===part), prev=GP[idx-1], nextp=GP[idx+1];
  box.innerHTML=`<header class="top"><span class="eyebrow">Prácticas · Lógica proposicional L0</span><h1>Guía de prácticas</h1>
    <p class="muted">Sintaxis, formalización, tablas de verdad, deducción natural y tableaux, con el analizador de fórmulas y el comprobador de razonamientos.</p></header>
    <div class="guide">${nav}${GUIDE[part]()}
    <div class="actions">${prev?`<a class="btn ghost" href="#parte-${prev[0]}">← Parte ${prev[0]} · ${prev[1]}</a>`:"<span></span>"}${nextp?`<a class="btn" href="#parte-${nextp[0]}">Parte ${nextp[0]} · ${nextp[1]} →</a>`:""}</div></div>`;
  store("fli-gpart",part);
  bindGuide(box);
}
window.addEventListener("hashchange",()=>{ guideRender(); const g=document.querySelector(".partnav"); if(g) window.scrollTo(0,g.getBoundingClientRect().top+window.scrollY-16); });
guideRender();
})();
