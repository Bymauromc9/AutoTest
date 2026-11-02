/*!
 * data/examenes.js — exámenes completos (el parcial real 23-24 y cuatro simulacros).
 * Cada examen: { title, sub, test: [10 preguntas], ex: [DPLL, Tableaux, Resolución] }.
 * Exporta FLI.EXAMS.
 */
(function (FLI) {
  "use strict";
/*    Formato del 1er parcial: 10 preguntas tipo test (+0,6 acierto, −0,2 fallo) y 3 ejercicios (0,75 + 2 + 1,25).
   test: {t, q, o, a, e, w?, tbl?}   ex: {kind, pts, q, f, check:{o,a}, sol:{pre?, steps? | tree? | fit?, end}} */
const ENUN={
  DPLL:"Aplica la técnica de DPLL, explicando las reglas que se van aplicando, e indica si el siguiente conjunto de fórmulas bien formadas es satisfacible. En caso de serlo, indica un modelo.",
  TAB:"Demuestra si el siguiente razonamiento es válido utilizando la técnica de Tableaux Semánticos, mediante la técnica de refutación. Indica si el razonamiento es válido o no. En caso de no ser válido, indica un contraejemplo. Explica e indica todos los tipos de fórmulas que aplicas.",
  RES:"Demuestra el siguiente razonamiento mediante el método de Resolución por estrategia conjunto soporte mediante notación fitting, aplicando también simplificación. Recuerda explicar todos los pasos realizados."
};
const CHK_SAT={o:["Satisfacible","Insatisfacible"]}, CHK_VAL={o:["Válido","No válido"]}, CHK_RES={o:["Válido (se llega a □)","No válido (no se llega a □)"]};
const REFUT="Refutación: añadimos la conclusión negada a las premisas. El razonamiento es válido si el tableau se CIERRA (todas las hojas con un literal y su opuesto).";
const EXAMS=[
/* ---------- EXAMEN 1: el parcial real 23-24 ---------- */
{title:"Parcial 1 · curso 23-24",sub:"El examen real del curso pasado.",
test:[
 {t:1,q:"La ley del tercio excluido establece que:",o:["A partir de una oración contradictoria se puede obtener cualquier oración: `¬p ⊢ q`","Las oraciones con doble implicación son verdaderas y falsas a la vez: `(p ↔ ¬p) ⊢ V ∧ F`","Una oración lógica es verdadera o es falsa, no puede existir una tercera opción: `p ∨ ¬p`","Una oración lógica no puede ser, a la vez, tanto verdadera como falsa: `¬(p ∨ ¬p)`"],a:2,e:"Tercio excluido: sólo hay dos valores posibles, V o F, sin tercera opción. Por eso `p ∨ ¬p` es siempre V.",w:{0:"Eso recuerda a la ley de inconsistencia (de una contradicción se sigue cualquier cosa), no al tercio excluido.",3:"«No puede ser a la vez V y F» es el principio de NO CONTRADICCIÓN (y además la fórmula escrita, `¬(p ∨ ¬p)`, es una contradicción)."}},
 {t:2,q:"Si F es un conjunto satisfacible de oraciones, entonces:",o:["Al quitar una oración Fᵢ cualquiera, el conjunto F−{Fᵢ} siempre será insatisfacible.","Al añadir una oración Fᵢ cualquiera, el conjunto F∪{Fᵢ} podría ser satisfacible o insatisfacible.","Al añadir una oración Fᵢ cualquiera, el conjunto F∪{Fᵢ} seguirá siendo satisfacible.","Al quitar una oración Fᵢ cualquiera, el conjunto F−{Fᵢ} podría ser satisfacible o insatisfacible."],a:1,e:"Añadir una fórmula puede quitar todos los modelos (ej.: `{p}` + `¬p`) o no quitarlos. Quitar fórmulas nunca quita modelos: F−{Fᵢ} sigue siendo satisfacible seguro.",w:{0:"Quitar fórmulas sólo puede añadir modelos: F−{Fᵢ} sigue siendo satisfacible.",2:"Contraejemplo: `{p}` es satisfacible, pero `{p, ¬p}` no.",3:"Quitar fórmulas nunca estropea la satisfacibilidad: será satisfacible siempre."}},
 {t:4,q:"Dada la fórmula bien formada `ε = ¬((r → ¬q) ∧ ¬p)`, realiza su forma normal conjuntiva (FNC) y selecciona la respuesta correcta:",o:["FNC: `ε = (r ∨ ¬p) ∧ (¬p ∨ ¬q)` y es una contradicción.","FNC: `ε = (r ∨ ¬p) ∧ (p ∨ q)` y es una tautología.","FNC: `ε = (r ∨ ¬p) ∧ (p ∨ ¬q)` y es contingente.","FNC: `ε = (r ∨ p) ∧ (p ∨ q)` y es contingente."],a:3,e:"`¬((¬r ∨ ¬q) ∧ ¬p)` → De Morgan: `¬(¬r ∨ ¬q) ∨ ¬¬p` → `(r ∧ q) ∨ p` → distributiva: `(r ∨ p) ∧ (q ∨ p)`. Es V con p=V y F con p=F, r=F: contingente."},
 {t:3,q:"Un sistema deductivo es completo:",o:["Siempre y cuando también sea un sistema de razonamiento sólido.","Si se demuestra que `{α₁,…,αₙ} ⊢ β`, se puede comprobar que `{α₁,…,αₙ} ⊨ β`.","Si se comprueba que `{α₁,…,αₙ} ⊨ β`, se puede demostrar que `{α₁,…,αₙ} ⊢ β`.","Si β es una contradicción, entonces se puede demostrar que β es un teorema."],a:2,e:"Completo: todo lo que es válido semánticamente (⊨) se puede demostrar sintácticamente (⊢).",w:{1:"Eso es la SOLIDEZ (corrección): lo demostrado es válido.",0:"Solidez y completitud son propiedades independientes."}},
 {t:4,q:"¿Cuál de las siguientes técnicas SAT vistas en clase permite demostrar de manera directa que una fórmula dada es una tautología?",o:["DPLL","Resolución","Árboles Semánticos","Tableaux Semánticos"],a:2,e:"El árbol semántico se aplica directamente a la fórmula (sin pasarla a FNC): si todas las hojas son nodos ÉXITO, es una tautología. Resolución y tableaux sólo detectan insatisfacibilidad. Ojo: los apuntes también citan DPLL para el planteamiento directo, pero sólo tras pasar a FNC y si la regla de la tautología deja ∅; por eso la opción que trabaja «de manera directa» sobre la fórmula dada es el árbol semántico.",w:{1:"Resolución sólo garantiza insatisfacibilidad; no sirve directamente para tautologías.",3:"Para ver que Φ es tautología con tableaux hay que construir el de ¬Φ y ver que se cierra: no es directo."}},
 {t:2,q:"Dada la fórmula bien formada `(q → ¬p) ∨ (¬r → ¬p)`, ¿cuál de las siguientes fórmulas es equivalente a la fórmula dada?",o:["La fórmula equivalente es `p → (r ∨ ¬q)`","La fórmula equivalente es `¬p → (¬r ∨ ¬q)`","La fórmula equivalente es `(q → ¬p) ∨ ¬r`","La fórmula equivalente es `¬p ∨ (¬r → ¬p)`"],a:0,e:"`(¬q ∨ ¬p) ∨ (r ∨ ¬p)` ≡ `¬p ∨ ¬q ∨ r`. Y `p → (r ∨ ¬q)` ≡ `¬p ∨ r ∨ ¬q`: es la misma.",w:{1:"`¬p → (¬r ∨ ¬q)` ≡ `p ∨ ¬r ∨ ¬q`: cambia el signo de p y de r.",2:"Da `¬q ∨ ¬p ∨ ¬r`: r aparece negada.",3:"`¬p ∨ (r ∨ ¬p)` ≡ `¬p ∨ r`: se ha perdido el `¬q`."}},
 {t:2,q:"Consideremos el conjunto insatisfacible de fórmulas C = {C1, C2} con la siguiente evaluación:",tbl:{h:["p","q","C1","C2"],r:[["V","V","V","F"],["V","F","F","V"],["F","V","F","V"],["F","F","V","F"]]},o:["La evaluación de `C1 → C2` siempre es verdadera (tautología)","La evaluación de `C1 → ¬C2` siempre es falsa (contradicción)","La evaluación de `¬C1 → ¬C2` siempre es falsa (contradicción)","La evaluación de `¬C1 → C2` siempre es verdadera (tautología)"],a:3,e:"En la tabla, C2 vale siempre lo contrario que C1 (C2 ≡ ¬C1). Entonces `¬C1 → C2` ≡ `¬C1 → ¬C1`, que es siempre V.",w:{0:"Falla en la fila 1: V → F = F.",1:"`C1 → ¬C2` ≡ `C1 → C1`: es siempre V, no F.",2:"`¬C1 → ¬C2` ≡ `¬C1 → C1` ≡ C1: es contingente."}},
 {t:5,q:"Indica la respuesta correcta respecto a la Lógica Categórica:",o:["Nos permite expresar las relaciones entre categorías teniendo en cuenta la pertenencia de los elementos a cada categoría.","Nos permite expresar las operaciones entre objetos, no siempre teniendo en cuenta las categorías.","No nos permite expresar la relación entre el objeto y la categoría.","La respuesta a y c son correctas."],a:0,e:"La lógica categórica trabaja con categorías (clases) y las relaciones entre ellas: «todo S es P», «ningún S es P», «algún S es P», «algún S no es P», atendiendo a qué elementos pertenecen a cada categoría. Sí expresa la relación objeto-categoría (pertenencia), así que C es falsa y, con ella, D."},
 {t:5,q:"¿Es la fórmula `∀x (S(x) → ¬P(x))` alguna de las Proposiciones Categóricas en su Forma Normal?",o:["Es una Proposición Universal Afirmativa.","Es una Proposición Universal Negativa.","Es una Proposición Particular Afirmativa.","Es una Proposición Particular Negativa."],a:1,e:"Dice «ningún S es P» (todo lo que es S no es P). Las cuatro formas: universal afirmativa `∀x (S(x) → P(x))`, universal negativa `∀x (S(x) → ¬P(x))`, particular afirmativa `∃x (S(x) ∧ P(x))`, particular negativa `∃x (S(x) ∧ ¬P(x))`."},
 {t:2,q:"Si ε es una tautología y γ una contradicción, se puede afirmar que:",o:["`⊨ ε ∧ γ`","`⊨ ¬ε ∨ γ`","`⊨ ε ∧ ¬γ`","`⊨ ¬γ → ¬ε`"],a:2,e:"ε = V y ¬γ = V en todas las interpretaciones, así que `ε ∧ ¬γ` es una tautología.",w:{0:"V ∧ F = F siempre: es una contradicción.",1:"F ∨ F = F siempre.",3:"V → F = F siempre."}}
],
ex:[
 {kind:"DPLL",pts:0.75,q:ENUN.DPLL,f:"`ε = {t ∨ p, p ∨ q, ¬q ∨ r, ¬r ∨ s, ¬s ∨ ¬p}`",check:Object.assign({a:0},CHK_SAT),sol:{
   pre:["Forma clausal: `{{t, p}; {p, q}; {¬q, r}; {¬r, s}; {¬s, ¬p}}`."],
   steps:["Regla de la tautología: ninguna cláusula tiene un literal y su opuesto → no se aplica.","Propagación unitaria: no hay cláusulas unitarias.","Literal puro: `t` (no aparece `¬t`). Propagamos: `ξ(t) = {{p, q}; {¬q, r}; {¬r, s}; {¬s, ¬p}}`.","Ya no hay unitarias, ni literales puros, ni cláusulas subsumidas (inclusión) → regla de RAMIFICACIÓN por `p`.",[1,"Rama `p`: `ξ(t, p) = {{¬q, r}; {¬r, s}; {¬s}}`."],[1,"Unitaria `¬s`: `ξ(t, p, ¬s) = {{¬q, r}; {¬r}}`."],[1,"Unitaria `¬r`: `ξ(t, p, ¬s, ¬r) = {{¬q}}`."],[1,"Unitaria `¬q`: `ξ(t, p, ¬s, ¬r, ¬q) = ∅`."]],
   end:"Llegamos al conjunto vacío de cláusulas ∅ → SATISFACIBLE. Modelo: ν(t)=V, ν(p)=V, ν(s)=F, ν(r)=F, ν(q)=F. No hace falta explorar la rama `¬p`."}},
 {kind:"Tableaux",pts:2,q:ENUN.TAB,f:"`{¬(p → q), ¬(¬p ∧ ¬r), ¬p → s, ¬r} ⊨ ¬s`",check:Object.assign({a:1},CHK_VAL),sol:{
   pre:[REFUT],
   tree:{steps:["Raíz: `¬(p → q)`, `¬(¬p ∧ ¬r)`, `¬p → s`, `¬r`, `¬¬s`","Doble negación: `¬¬s` → `s`.","α-fórmula `¬(p → q)` → en el mismo nodo: `p`, `¬q`."],
     split:{why:"β-fórmula `¬(¬p ∧ ¬r)` → dos ramas: `¬¬p` | `¬¬r`",br:[
       {lab:"`¬¬p` → `p` (doble negación)",split:{why:"β-fórmula `¬p → s` → dos ramas: `¬¬p` | `s`",br:[
         {lab:"`¬¬p` → `p`",end:{t:"ABIERTA. Literales: `p`, `¬q`, `¬r`, `s`"}},
         {lab:"`s`",end:{t:"ABIERTA. Literales: `p`, `¬q`, `¬r`, `s`"}}]}},
       {lab:"`¬¬r` → `r` (doble negación)",end:{c:1,t:"CERRADA: `r` y `¬r`"}}]}},
   end:"El tableau queda ABIERTO → el razonamiento NO es válido. Contraejemplo (hoja abierta): ν(p)=V, ν(q)=F, ν(r)=F, ν(s)=V. Con ella las cuatro premisas valen V y la conclusión `¬s` vale F."}},
 {kind:"Resolución",pts:1.25,q:ENUN.RES,f:"`{p → (q → r), ¬(p → r)} ⊨ ¬q`",check:Object.assign({a:0},CHK_RES),sol:{
   pre:["Premisas a FNC: `p → (q → r)` ≡ `¬p ∨ ¬q ∨ r`; `¬(p → r)` ≡ `p ∧ ¬r` (dos cláusulas).","Conclusión negada (conjunto soporte): `¬¬q` ≡ `q`."],
   fit:[["1","{¬p, ¬q, r}","Premisa"],["2","{p}","Premisa"],["3","{¬r}","Premisa"],["4","{q}","Conjunto soporte (CS)"],["5","{¬p, r}","Rq(1, 4) · CS · Subsumida(1) · Puro q (4)"],["6","{r}","Rp(2, 5) · CS · Subsumida(5) · Puro p (2)"],["7","□","Rr(3, 6) · CS"]],
   end:"Hemos llegado a la cláusula vacía □ usando refutación → el razonamiento es VÁLIDO."}}
]},
/* ---------- EXAMEN 2 ---------- */
{title:"Simulacro 2",sub:"Mismo formato que el parcial, preguntas nuevas.",
test:[
 {t:1,q:"El principio de no contradicción establece que:",o:["Toda oración es verdadera o falsa, sin tercera opción: `p ∨ ¬p`","De una contradicción se puede obtener cualquier oración.","Una oración no puede ser verdadera y falsa a la vez: `¬(p ∧ ¬p)`","Dos oraciones contradictorias pueden ser verdaderas si son contingentes."],a:2,e:"No contradicción: un hecho y su contrario no pueden darse a la vez. `p ∧ ¬p` es siempre F, así que `¬(p ∧ ¬p)` es siempre V.",w:{0:"Eso es la ley del tercio excluido.",1:"Eso es la ley de inconsistencia `{β, ¬β} ⊨ α`."}},
 {t:2,q:"Si F es un conjunto insatisfacible de oraciones, entonces:",o:["Al añadir una oración Fᵢ cualquiera, F∪{Fᵢ} podría ser satisfacible.","Al añadir una oración Fᵢ cualquiera, F∪{Fᵢ} seguirá siendo insatisfacible.","Al quitar una oración Fᵢ cualquiera, F−{Fᵢ} seguirá siendo insatisfacible.","Al quitar una oración Fᵢ cualquiera, F−{Fᵢ} será siempre satisfacible."],a:1,e:"Añadir fórmulas sólo puede quitar modelos; si no había ninguno, sigue sin haberlo. Al quitar, en cambio, puede pasar cualquier cosa.",w:{2:"Contraejemplo: `{p, ¬p}` es insatisfacible, pero quitando `¬p` queda `{p}`, satisfacible.",3:"Contraejemplo: `{p, ¬p, q ∧ ¬q}` sin `p` sigue siendo insatisfacible."}},
 {t:4,q:"Dada la fbf `ε = ¬(p → (q ∧ ¬r))`, realiza su FNC y selecciona la respuesta correcta:",o:["FNC: `ε = (¬p ∨ ¬q) ∧ r` y es contingente.","FNC: `ε = p ∧ (¬q ∨ r)` y es una tautología.","FNC: `ε = p ∧ (¬q ∨ r)` y es contingente.","FNC: `ε = p ∧ ¬q ∧ r` y es una contradicción."],a:2,e:"`¬(¬p ∨ (q ∧ ¬r))` → De Morgan: `p ∧ ¬(q ∧ ¬r)` → De Morgan: `p ∧ (¬q ∨ r)`. Es V con p=V, q=F y F con p=F: contingente.",w:{1:"La FNC es correcta, pero con p=F vale F: no es tautología."}},
 {t:3,q:"Un sistema deductivo es sólido (correcto):",o:["Si se comprueba que `{α₁,…,αₙ} ⊨ β`, se puede demostrar que `{α₁,…,αₙ} ⊢ β`.","Si se demuestra que `{α₁,…,αₙ} ⊢ β`, se puede comprobar que `{α₁,…,αₙ} ⊨ β`.","Si en él se pueden demostrar β y ¬β.","Sólo si también es completo."],a:1,e:"Sólido: todo lo que se demuestra (⊢) es válido (⊨). Así se puede trabajar sintácticamente con rigor sin usar técnicas SAT.",w:{0:"Eso es la COMPLETITUD.",2:"Eso sería un sistema inconsistente."}},
 {t:4,q:"¿Cuál de las siguientes técnicas SAT NO puede aplicarse directamente para demostrar que una fórmula es una tautología?",o:["Tablas de verdad","Árboles semánticos","DPLL (tras pasar a FNC, con la regla de la tautología)","Tableaux semánticos"],a:3,e:"Los apuntes lo dicen expresamente: ni Resolución ni Tableaux sirven directamente para tautologías, porque sólo detectan insatisfacibilidad. Para ver que Φ es tautología con tableaux hay que hacer el de ¬Φ."},
 {t:2,q:"Dada la fbf `(p → q) ∧ (p → r)`, ¿cuál es equivalente?",o:["`(p ∧ q) → r`","`p → (q ∧ r)`","`(p → q) → r`","`p ∨ (¬q ∧ ¬r)`"],a:1,e:"`(¬p ∨ q) ∧ (¬p ∨ r)` ≡ `¬p ∨ (q ∧ r)` (distributiva al revés) ≡ `p → (q ∧ r)`.",w:{0:"`(p ∧ q) → r` ≡ `¬p ∨ ¬q ∨ r`: es otra fórmula.",3:"Tiene p sin negar y q, r negadas: es justo al revés."}},
 {t:2,q:"Sean C1 y C2 dos fórmulas con la siguiente evaluación:",tbl:{h:["p","q","C1","C2"],r:[["V","V","V","V"],["V","F","V","F"],["F","V","F","F"],["F","F","F","F"]]},o:["`{C1} ⊨ C2`","`{C2} ⊨ C1`","`C1 ≡ C2`","`C1 ∧ ¬C2` es una contradicción"],a:1,e:"En todas las filas donde C2 es V (sólo la 1.ª), C1 también es V: C1 es consecuencia de C2.",w:{0:"Fila 2: C1 = V y C2 = F. Es un contraejemplo.",2:"Valen distinto en la fila 2.",3:"En la fila 2, `C1 ∧ ¬C2` = V ∧ V = V."}},
 {t:5,q:"La proposición categórica «Algún S no es P» se formaliza como:",o:["`∃x (S(x) ∧ ¬P(x))`","`∃x (S(x) → ¬P(x))`","`∀x (S(x) → ¬P(x))`","`¬∃x (S(x) ∧ P(x))`"],a:0,e:"Es la particular negativa: existe algún elemento que es S y no es P. Con el existencial se usa ∧, no →.",w:{1:"Con ∃ y → la fórmula se cumple con cualquier elemento que no sea S: no dice lo que queremos.",2:"Eso es la universal negativa («ningún S es P»).",3:"Equivale a «ningún S es P» (universal negativa)."}},
 {t:3,q:"La lógica proposicional L0 es:",o:["Decidible","Semidecidible","Indecidible","Decidible sólo para fórmulas en FNC"],a:0,e:"Siempre hay un número finito de interpretaciones (2ⁿ), así que siempre se puede determinar consistencia e inconsistencia. La lógica de predicados L1 sólo es semidecidible."},
 {t:2,q:"Si ε es una contradicción y γ es cualquier fórmula, se puede afirmar que:",o:["`⊨ γ → ε`","`⊨ ε ∨ γ`","`⊨ ε ∧ γ`","`⊨ ε → γ`"],a:3,e:"ε es F en todas las interpretaciones; una implicación con antecedente F es siempre V. Por eso `ε → γ` es tautología, sea γ lo que sea.",w:{0:"`γ → ε` ≡ `¬γ`: depende de γ.",1:"`F ∨ γ` ≡ γ: depende de γ.",2:"F ∧ γ = F siempre."}}
],
ex:[
 {kind:"DPLL",pts:0.75,q:ENUN.DPLL,f:"`ε = {p ∨ q, ¬p ∨ r, ¬q ∨ r, ¬r ∨ s, ¬s ∨ ¬r}`",check:Object.assign({a:1},CHK_SAT),sol:{
   pre:["Forma clausal: `{{p, q}; {¬p, r}; {¬q, r}; {¬r, s}; {¬s, ¬r}}`."],
   steps:["Regla de la tautología: no se aplica.","Propagación unitaria: no hay cláusulas unitarias.","Literal puro: todos los átomos aparecen con los dos signos → no hay.","Inclusión: ninguna cláusula está contenida en otra.","RAMIFICACIÓN por `r`.",[1,"Rama `r`: `ξ(r) = {{p, q}; {s}; {¬s}}`."],[1,"Unitaria `s`: `ξ(r, s) = {{p, q}; □}` → aparece la cláusula vacía. Backtracking."],[1,"Rama `¬r`: `ξ(¬r) = {{p, q}; {¬p}; {¬q}}`."],[1,"Unitaria `¬p`: `ξ(¬r, ¬p) = {{q}; {¬q}}`."],[1,"Unitaria `q`: `ξ(¬r, ¬p, q) = {□}`."]],
   end:"Las dos ramas de la ramificación terminan en la cláusula vacía □ → el conjunto es INSATISFACIBLE (no hay modelo)."}},
 {kind:"Tableaux",pts:2,q:ENUN.TAB,f:"`{p → q ∨ r, ¬r, q → s, p} ⊨ s`",check:Object.assign({a:0},CHK_VAL),sol:{
   pre:[REFUT,"Por prioridad, `p → q ∨ r` se lee `p → (q ∨ r)`."],
   tree:{steps:["Raíz: `p → (q ∨ r)`, `¬r`, `q → s`, `p`, `¬s`"],
     split:{why:"β-fórmula `p → (q ∨ r)` → dos ramas: `¬p` | `q ∨ r`",br:[
       {lab:"`¬p`",end:{c:1,t:"CERRADA: `p` y `¬p`"}},
       {lab:"`q ∨ r`",split:{why:"β-fórmula `q ∨ r` → dos ramas: `q` | `r`",br:[
         {lab:"`q`",split:{why:"β-fórmula `q → s` → dos ramas: `¬q` | `s`",br:[
           {lab:"`¬q`",end:{c:1,t:"CERRADA: `q` y `¬q`"}},
           {lab:"`s`",end:{c:1,t:"CERRADA: `s` y `¬s`"}}]}},
         {lab:"`r`",end:{c:1,t:"CERRADA: `r` y `¬r`"}}]}}]}},
   end:"Todas las hojas están CERRADAS → la conjunción de premisas y conclusión negada es insatisfacible → el razonamiento es VÁLIDO."}},
 {kind:"Resolución",pts:1.25,q:ENUN.RES,f:"`{p ∨ q, p → r, q → s, ¬s} ⊨ r`",check:Object.assign({a:0},CHK_RES),sol:{
   pre:["Premisas a FNC: `p ∨ q`; `p → r` ≡ `¬p ∨ r`; `q → s` ≡ `¬q ∨ s`; `¬s`.","Conclusión negada (conjunto soporte): `¬r`."],
   fit:[["1","{p, q}","Premisa"],["2","{¬p, r}","Premisa"],["3","{¬q, s}","Premisa"],["4","{¬s}","Premisa"],["5","{¬r}","Conjunto soporte (CS)"],["6","{¬p}","Rr(2, 5) · CS · Subsumida(2) · Puro ¬r (5)"],["7","{q}","Rp(1, 6) · CS · Subsumida(1) · Puro ¬p (6)"],["8","{s}","Rq(3, 7) · CS · Subsumida(3) · Puro q (7)"],["9","□","Rs(4, 8) · CS"]],
   end:"Llegamos a la cláusula vacía □ → el razonamiento es VÁLIDO."}}
]},
/* ---------- EXAMEN 3 ---------- */
{title:"Simulacro 3",sub:"Mismo formato que el parcial, preguntas nuevas.",
test:[
 {t:1,q:"Un razonamiento es válido cuando:",o:["Las premisas y la conclusión son verdaderas.","La conclusión es una tautología.","Si las premisas fueran verdaderas, la conclusión lo sería necesariamente.","Las premisas son satisfacibles."],a:2,e:"Validez = es imposible que las premisas sean V y la conclusión F. No depende de si de hecho lo son.",w:{0:"Premisas y conclusión pueden ser verdaderas sin que la conclusión se siga de las premisas.",1:"No hace falta: sólo tiene que ser V cuando las premisas lo son."}},
 {t:2,q:"El conjunto F = {`p → q`, `p`, `¬q`} es:",o:["Satisfacible, con ν(p)=V y ν(q)=F","Satisfacible, con ν(p)=F","Insatisfacible","Un conjunto de contradicciones"],a:2,e:"`p` obliga a p=V y `¬q` a q=F; entonces `p → q` = V → F = F. No hay ninguna interpretación que haga V a las tres.",w:{0:"Con esa interpretación `p → q` vale F.",1:"Entonces la fórmula `p` vale F.",3:"Cada fórmula por separado es satisfacible; lo que es insatisfacible es el conjunto."}},
 {t:4,q:"Dada la fbf `ε = (p ↔ q) ∨ r`, realiza su FNC y selecciona la respuesta correcta:",o:["FNC: `ε = (¬p ∨ q) ∧ (p ∨ ¬q) ∧ r` y es contingente.","FNC: `ε = (p ∨ q ∨ r) ∧ (¬p ∨ ¬q ∨ r)` y es contingente.","FNC: `ε = (¬p ∨ q ∨ r) ∧ (p ∨ ¬q ∨ r)` y es una tautología.","FNC: `ε = (¬p ∨ q ∨ r) ∧ (p ∨ ¬q ∨ r)` y es contingente."],a:3,e:"`p ↔ q` ≡ `(¬p ∨ q) ∧ (¬q ∨ p)`; distributiva con `∨ r`: `(¬p ∨ q ∨ r) ∧ (p ∨ ¬q ∨ r)`. Es F con p=V, q=F, r=F: contingente.",w:{0:"La r tiene que repartirse en cada cláusula, no quedar aparte con ∧.",2:"Con p=V, q=F, r=F vale F: no es tautología."}},
 {t:3,q:"Una teoría es semidecidible cuando:",o:["Existen procedimientos para determinar la inconsistencia y sólo a veces la consistencia.","Existen procedimientos para determinar tanto la consistencia como la inconsistencia.","No es posible determinar ni la consistencia ni la inconsistencia.","Sólo es posible determinar la consistencia."],a:0,e:"Decidible: ambas. Semidecidible: la inconsistencia sí, la consistencia sólo a veces (es el caso de L1). Indecidible: ninguna.",w:{1:"Eso es decidible.",2:"Eso es indecidible."}},
 {t:4,q:"En el algoritmo DPLL, tras aplicar la regla de ramificación, una rama llega a la cláusula vacía □. Entonces:",o:["La fórmula es insatisfacible.","Hay que hacer backtracking y probar la otra rama.","La fórmula es una tautología.","Se elimina la cláusula vacía y se sigue propagando."],a:1,e:"Una rama con □ sólo cierra ESA rama. Sólo es insatisfacible si todas las ramas acaban en □.",w:{0:"Sólo si todas las ramas acaban en □ (o no se ha ramificado)."}},
 {t:2,q:"Dada la fbf `¬(p ∨ ¬q) → r`, ¿cuál es equivalente?",o:["`(¬p ∧ q) ∧ r`","`q → (p ∨ r)`","`¬p ∨ q ∨ r`","`q ∧ ¬p → ¬r`"],a:1,e:"`¬¬(p ∨ ¬q) ∨ r` ≡ `p ∨ ¬q ∨ r`. Y `q → (p ∨ r)` ≡ `¬q ∨ p ∨ r`: la misma.",w:{2:"Cambia los signos de p y q.",3:"Da `¬q ∨ p ∨ ¬r`: r aparece negada."}},
 {t:2,q:"La fórmula `(p → q) ∨ (q → p)` es:",o:["Contingente","Una contradicción","Una tautología","Insatisfacible"],a:2,e:"`¬p ∨ q ∨ ¬q ∨ p`: contiene `q ∨ ¬q`, así que es siempre V. Curioso pero cierto: de cualquier par de proposiciones, una implica a la otra.",w:{0:"No hay ninguna fila F: para que fuese F haría falta q=F (primera) y q=V (segunda) a la vez."}},
 {t:5,q:"«Ningún alumno está matriculado» corresponde a la forma normal categórica:",o:["Universal afirmativa","Universal negativa","Particular afirmativa","Particular negativa"],a:1,e:"«Ningún S es P»: `∀x (A(x) → ¬M(x))`, universal negativa. En un diagrama de Euler, los dos círculos no se tocan."},
 {t:2,q:"«Iré a la playa sólo si hace sol» (p: voy a la playa, q: hace sol) se formaliza como:",o:["`q → p`","`p ↔ q`","`¬q → p`","`p → q`"],a:3,e:"Lo que va detrás de «sólo si» es el consecuente: si he ido a la playa, es que hacía sol.",w:{0:"Esa sería «iré a la playa SI hace sol».",1:"Eso sería «si y sólo si»."}},
 {t:3,q:"Para validar `{α₁,…,αₙ} ⊨ β` por refutación hay que comprobar que:",o:["`α₁ ∧ … ∧ αₙ ∧ ¬β` es una contradicción.","`α₁ ∧ … ∧ αₙ → β` es una tautología.","`α₁ ∧ … ∧ αₙ ∧ β` es satisfacible.","`¬β` es una tautología."],a:0,e:"Refutación: premisas + conclusión negada; si es imposible que se cumplan a la vez, el razonamiento es válido.",w:{1:"Ese es el planteamiento DIRECTO (también correcto, pero es el otro)."}}
],
ex:[
 {kind:"DPLL",pts:0.75,q:ENUN.DPLL,f:"`ε = {p ∨ q ∨ r, ¬p ∨ ¬q, ¬p ∨ ¬r, ¬q ∨ ¬r, p ∨ ¬q}`",check:Object.assign({a:0},CHK_SAT),sol:{
   pre:["Forma clausal: `{{p, q, r}; {¬p, ¬q}; {¬p, ¬r}; {¬q, ¬r}; {p, ¬q}}`."],
   steps:["Regla de la tautología: no se aplica.","Propagación unitaria: no hay cláusulas unitarias.","Literal puro: no hay (p, q y r aparecen con los dos signos).","Inclusión: no hay cláusulas subsumidas.","RAMIFICACIÓN por `q`.",[1,"Rama `q`: `ξ(q) = {{¬p}; {¬p, ¬r}; {¬r}; {p}}`."],[1,"Unitaria `¬p`: `ξ(q, ¬p) = {{¬r}; □}` → cláusula vacía (de `{p}`). Backtracking."],[1,"Rama `¬q`: `ξ(¬q) = {{p, r}; {¬p, ¬r}}`."],[1,"No hay unitarias ni puros → nueva RAMIFICACIÓN por `p`."],[1,"Rama `p`: `ξ(¬q, p) = {{¬r}}`."],[1,"Unitaria `¬r`: `ξ(¬q, p, ¬r) = ∅`."]],
   end:"Llegamos a ∅ → SATISFACIBLE. Modelo: ν(q)=F, ν(p)=V, ν(r)=F. (Otro modelo válido: ν(q)=F, ν(p)=F, ν(r)=V.)"}},
 {kind:"Tableaux",pts:2,q:ENUN.TAB,f:"`{p → q, ¬(q ∧ r), r ∨ s} ⊨ ¬p`",check:Object.assign({a:1},CHK_VAL),sol:{
   pre:[REFUT],
   tree:{steps:["Raíz: `p → q`, `¬(q ∧ r)`, `r ∨ s`, `¬¬p`","Doble negación: `¬¬p` → `p`."],
     split:{why:"β-fórmula `p → q` → dos ramas: `¬p` | `q`",br:[
       {lab:"`¬p`",end:{c:1,t:"CERRADA: `p` y `¬p`"}},
       {lab:"`q`",split:{why:"β-fórmula `¬(q ∧ r)` → dos ramas: `¬q` | `¬r`",br:[
         {lab:"`¬q`",end:{c:1,t:"CERRADA: `q` y `¬q`"}},
         {lab:"`¬r`",split:{why:"β-fórmula `r ∨ s` → dos ramas: `r` | `s`",br:[
           {lab:"`r`",end:{c:1,t:"CERRADA: `r` y `¬r`"}},
           {lab:"`s`",end:{t:"ABIERTA. Literales: `p`, `q`, `¬r`, `s`"}}]}}]}}]}},
   end:"Queda una hoja ABIERTA → el razonamiento NO es válido. Contraejemplo: ν(p)=V, ν(q)=V, ν(r)=F, ν(s)=V (premisas V, conclusión `¬p` = F)."}},
 {kind:"Resolución",pts:1.25,q:ENUN.RES,f:"`{p → q, r → s, p ∨ r} ⊨ q ∨ s`",check:Object.assign({a:0},CHK_RES),sol:{
   pre:["Premisas a FNC: `¬p ∨ q`; `¬r ∨ s`; `p ∨ r`.","Conclusión negada: `¬(q ∨ s)` ≡ `¬q ∧ ¬s` → el conjunto soporte tiene DOS cláusulas: `{¬q}` y `{¬s}`."],
   fit:[["1","{¬p, q}","Premisa"],["2","{¬r, s}","Premisa"],["3","{p, r}","Premisa"],["4","{¬q}","Conjunto soporte (CS)"],["5","{¬s}","Conjunto soporte (CS)"],["6","{¬p}","Rq(1, 4) · CS · Subsumida(1) · Puro ¬q (4)"],["7","{¬r}","Rs(2, 5) · CS · Subsumida(2) · Puro ¬s (5)"],["8","{r}","Rp(3, 6) · CS · Subsumida(3) · Puro ¬p (6)"],["9","□","Rr(7, 8) · CS"]],
   end:"Llegamos a □ → el razonamiento es VÁLIDO (es el dilema constructivo)."}}
]},
/* ---------- EXAMEN 4 ---------- */
{title:"Simulacro 4",sub:"Mismo formato que el parcial, preguntas nuevas.",
test:[
 {t:1,q:"Los componentes de la lógica clásica son:",o:["Alfabeto, retórica, semántica y tablas de verdad.","Un lenguaje formal, una formalización, una semántica y un sistema de demostración axiomática.","Premisas, conclusión, contraejemplo y modelo.","Sintaxis, pragmática, retórica y semántica."],a:1,e:"1) Lenguaje formal (alfabeto + sintaxis → fbf), 2) formalización (del lenguaje natural al formal), 3) semántica (evaluación), 4) sistema de demostración axiomática (equivalencias e implicaciones lógicas)."},
 {t:2,q:"Si F es un conjunto satisfacible y α es una tautología, entonces F∪{α}:",o:["Podría volverse insatisfacible.","Pasa a ser una tautología.","Sigue siendo satisfacible.","Pasa a ser insatisfacible."],a:2,e:"La tautología es V en todas las interpretaciones, así que no quita ningún modelo: los modelos de F lo siguen siendo.",w:{0:"Eso pasa al añadir una fórmula cualquiera, pero una tautología nunca quita modelos.",1:"El conjunto sólo sería «tautológico» si todas sus fórmulas lo fueran."}},
 {t:4,q:"Dada la fbf `ε = (p → q) → r`, realiza su FNC y selecciona la respuesta correcta:",o:["FNC: `ε = (p ∨ r) ∧ (¬q ∨ r)` y es contingente.","FNC: `ε = ¬p ∨ q ∨ r` y es contingente.","FNC: `ε = (p ∨ r) ∧ (q ∨ r)` y es contingente.","FNC: `ε = (¬p ∨ r) ∧ (¬q ∨ r)` y es contingente."],a:0,e:"`¬(¬p ∨ q) ∨ r` → De Morgan: `(p ∧ ¬q) ∨ r` → distributiva: `(p ∨ r) ∧ (¬q ∨ r)`.",w:{1:"Eso sería la FNC de `p → (q → r)`. La → no es asociativa.",3:"Al negar `¬p ∨ q` queda `p ∧ ¬q`: p sin negar."}},
 {t:3,q:"El teorema de la deducción sintáctica permite afirmar que:",o:["Si `{α₁,…,αₙ} ⊢ β`, entonces `{α₁,…,αₙ₋₁} ⊢ αₙ → β`.","Si `{α₁,…,αₙ} ⊢ β`, entonces `⊨ β`.","Toda tautología es un axioma.","`⊢` y `⊨` son el mismo símbolo."],a:0,e:"Una premisa puede pasar a ser el antecedente de la conclusión. En la práctica: para demostrar `α → β`, se añade α como premisa y se deriva β."},
 {t:4,q:"Sobre el método de Resolución, ¿qué afirmación es correcta?",o:["Permite obtener un modelo de la fórmula.","Sirve para demostrar directamente que una fórmula es una tautología.","No necesita pasar la fórmula a forma clausal.","Si se obtiene la cláusula vacía □, el conjunto de cláusulas es insatisfacible."],a:3,e:"Resolución está pensada para la insatisfacibilidad: si aparece □, el conjunto es insatisfacible. No da interpretaciones y trabaja con forma clausal."},
 {t:2,q:"Dada la fbf `¬(p → q) ∨ ¬(q → p)`, ¿cuál es equivalente?",o:["`¬p ↔ ¬q`","`(p ∧ q) ∨ (¬p ∧ ¬q)`","`¬(p ↔ q)`","`¬p ∨ ¬q`"],a:2,e:"`(p ∧ ¬q) ∨ (q ∧ ¬p)`: es V justo cuando p y q valen distinto, es decir, `¬(p ↔ q)`.",w:{0:"`¬p ↔ ¬q` ≡ `p ↔ q`: justo lo contrario.",1:"Eso es `p ↔ q`."}},
 {t:2,q:"Sean α y β dos fórmulas con la siguiente evaluación:",tbl:{h:["p","q","α","β"],r:[["V","V","V","V"],["V","F","F","V"],["F","V","V","V"],["F","F","V","F"]]},o:["`α ∧ β` es una contradicción","`{α} ⊨ β`","`α ≡ β`","`α ∨ β` es una tautología"],a:3,e:"En cada fila, al menos una de las dos vale V (fila 2: β; fila 4: α), así que `α ∨ β` es siempre V. (α es `p → q` y β es `p ∨ q`.)",w:{0:"En la fila 1 ambas valen V.",1:"Fila 4: α = V y β = F.",2:"Valen distinto en las filas 2 y 4."}},
 {t:5,q:"Dado el conjunto A = {2, {3}, 3, {5}}, ¿cuál de estas afirmaciones es FALSA?",o:["`2 ∈ A`","`{2} ⊆ A`","`{2} ∈ A`","`{5} ∈ A`"],a:2,e:"Los elementos de A son 2, {3}, 3 y {5}. El conjunto {2} no es uno de ellos (∈ falso), aunque sí es un subconjunto porque 2 ∈ A (⊆ verdadero).",w:{1:"Es verdadera: todo elemento de {2} (el 2) pertenece a A.",3:"Es verdadera: {5} aparece tal cual como elemento de A."}},
 {t:2,q:"«Es necesario estudiar para aprobar» (p: estudio, q: apruebo) se formaliza como:",o:["`p → q`","`q → p`","`p ∧ q`","`p ↔ q`"],a:1,e:"Lo necesario va a la derecha: si apruebo, es que he estudiado. Estudiar no garantiza aprobar.",w:{0:"Eso diría que estudiar es SUFICIENTE para aprobar."}},
 {t:3,q:"Si el conjunto de premisas {α₁,…,αₙ} es insatisfacible, entonces:",o:["No se sigue ninguna conclusión.","Sólo se siguen tautologías.","`{α₁,…,αₙ} ⊨ β` para cualquier fórmula β.","`α₁ ∧ … ∧ αₙ → β` es una contradicción."],a:2,e:"No hay ninguna interpretación con todas las premisas V, así que nunca hay contraejemplo: se sigue cualquier β (ley de inconsistencia).",w:{3:"Al revés: con antecedente siempre F, la implicación es siempre V (tautología)."}}
],
ex:[
 {kind:"DPLL",pts:0.75,q:"Transforma la siguiente fórmula a forma clausal y aplica la técnica de DPLL, explicando las reglas que se van aplicando, para indicar si es satisfacible. En caso de serlo, indica un modelo.",f:"`φ = (p → q) ∧ (q → r ∨ s) ∧ (r → ¬p) ∧ p`",check:Object.assign({a:0},CHK_SAT),sol:{
   pre:["`p → q` ≡ `¬p ∨ q`; `q → (r ∨ s)` ≡ `¬q ∨ r ∨ s`; `r → ¬p` ≡ `¬r ∨ ¬p`.","Forma clausal: `{{¬p, q}; {¬q, r, s}; {¬r, ¬p}; {p}}`."],
   steps:["Regla de la tautología: no se aplica.","Unitaria `p`: `ξ(p) = {{q}; {¬q, r, s}; {¬r}}`.","Unitaria `q`: `ξ(p, q) = {{r, s}; {¬r}}`.","Unitaria `¬r`: `ξ(p, q, ¬r) = {{s}}`.","Unitaria `s`: `ξ(p, q, ¬r, s) = ∅`."],
   end:"Llegamos a ∅ sin necesidad de ramificar → SATISFACIBLE. Modelo: ν(p)=V, ν(q)=V, ν(r)=F, ν(s)=V."}},
 {kind:"Tableaux",pts:2,q:ENUN.TAB,f:"`{p ↔ q, q → r, ¬r} ⊨ ¬p`",check:Object.assign({a:0},CHK_VAL),sol:{
   pre:[REFUT],
   tree:{steps:["Raíz: `p ↔ q`, `q → r`, `¬r`, `¬¬p`","Doble negación: `¬¬p` → `p`.","α-fórmula `p ↔ q` → en el mismo nodo: `p → q`, `q → p`."],
     split:{why:"β-fórmula `p → q` → dos ramas: `¬p` | `q`",br:[
       {lab:"`¬p`",end:{c:1,t:"CERRADA: `p` y `¬p`"}},
       {lab:"`q`",split:{why:"β-fórmula `q → r` → dos ramas: `¬q` | `r`",br:[
         {lab:"`¬q`",end:{c:1,t:"CERRADA: `q` y `¬q`"}},
         {lab:"`r`",end:{c:1,t:"CERRADA: `r` y `¬r`"}}]}}]}},
   end:"Todas las hojas CERRADAS (no hace falta descomponer `q → p`) → el razonamiento es VÁLIDO."}},
 {kind:"Resolución",pts:1.25,q:ENUN.RES,f:"`{¬p ∨ q, ¬(q ∧ ¬r), ¬r ∨ s} ⊨ p → s`",check:Object.assign({a:0},CHK_RES),sol:{
   pre:["Premisas a FNC: `¬p ∨ q`; `¬(q ∧ ¬r)` ≡ `¬q ∨ r`; `¬r ∨ s`.","Conclusión negada: `¬(p → s)` ≡ `p ∧ ¬s` → conjunto soporte: `{p}` y `{¬s}`."],
   fit:[["1","{¬p, q}","Premisa"],["2","{¬q, r}","Premisa"],["3","{¬r, s}","Premisa"],["4","{p}","Conjunto soporte (CS)"],["5","{¬s}","Conjunto soporte (CS)"],["6","{q}","Rp(1, 4) · CS · Subsumida(1) · Puro p (4)"],["7","{r}","Rq(2, 6) · CS · Subsumida(2) · Puro q (6)"],["8","{s}","Rr(3, 7) · CS · Subsumida(3) · Puro r (7)"],["9","□","Rs(5, 8) · CS"]],
   end:"Llegamos a □ → el razonamiento es VÁLIDO."}}
]},
/* ---------- EXAMEN 5 ---------- */
{title:"Simulacro 5",sub:"Mismo formato que el parcial, preguntas nuevas.",
test:[
 {t:1,q:"Una proposición es:",o:["Cualquier oración del lenguaje natural.","Una pregunta cuya respuesta es sí o no.","Un enunciado con términos referenciales.","Una fórmula mal formada."],a:2,e:"Oración (entidad lingüística) → enunciado (declarativa con pretensión de verdad) → proposición (enunciado con términos referenciales).",w:{1:"Una pregunta no es declarativa: no es verdadera ni falsa."}},
 {t:2,q:"El conjunto F = {`p ∨ q`, `¬p`, `¬q ∨ r`} es:",o:["Insatisfacible","Satisfacible, con un único modelo: ν(p)=F, ν(q)=V, ν(r)=V","Satisfacible, con ν(p)=V","Una tautología"],a:1,e:"`¬p` obliga a p=F; entonces `p ∨ q` obliga a q=V; y `¬q ∨ r` obliga a r=V. Sólo queda una interpretación posible.",w:{2:"`¬p` sería F."}},
 {t:4,q:"Dada la fbf `ε = ¬(p ∨ q) ∨ (p ∧ r)`, realiza su FNC y selecciona la respuesta correcta:",o:["FNC: `ε = (¬p ∨ r) ∧ (p ∨ ¬q) ∧ (¬q ∨ r)` y es una tautología.","FNC: `ε = (¬p ∨ ¬q) ∧ (p ∨ r)` y es contingente.","FNC: `ε = (p ∨ q) ∧ (¬p ∨ ¬r)` y es contingente.","FNC: `ε = (¬p ∨ r) ∧ (p ∨ ¬q) ∧ (¬q ∨ r)` y es contingente."],a:3,e:"`(¬p ∧ ¬q) ∨ (p ∧ r)` → distributiva: `(¬p ∨ p) ∧ (¬p ∨ r) ∧ (¬q ∨ p) ∧ (¬q ∨ r)` → la cláusula `¬p ∨ p` es V y se elimina. Con p=V, r=F vale F: contingente.",w:{0:"La FNC es correcta, pero con p=V, r=F vale F."}},
 {t:3,q:"Una teoría es inconsistente si:",o:["En ella se puede demostrar una fórmula y su negación.","No tiene ningún teorema.","No es axiomatizable.","Es completa."],a:0,e:"Consistente: puede demostrarse β o ¬β, pero no las dos. Si se demuestran ambas, se sigue cualquier cosa."},
 {t:4,q:"Si TODOS los nodos hoja de un árbol semántico son nodos FALLO, la fórmula es:",o:["Una tautología","Satisfacible","Contingente","Insatisfacible (contradicción)"],a:3,e:"Ninguna interpretación la hace V. Resumen: algún éxito → satisfacible; todos éxito → tautología; algún fallo → falseable; todos fallo → contradicción."},
 {t:2,q:"¿Cuál de las siguientes fórmulas NO es equivalente a `p → q`?",o:["`¬q → ¬p`","`q → p`","`¬p ∨ q`","`¬(p ∧ ¬q)`"],a:1,e:"`q → p` es la recíproca: difiere con p=V, q=F (la original es F y la recíproca V). Las demás son contraposición, interdefinición y su forma con ∧.",w:{0:"Es la contrarrecíproca: sí es equivalente.",3:"`¬(p ∧ ¬q)` ≡ `¬p ∨ q`: sí es equivalente."}},
 {t:4,q:"En un tableau semántico, la fórmula `¬(p ↔ q)` es:",o:["Una α-fórmula con componentes `p → q` y `q → p`","Una β-fórmula con ramas `¬(p → q)` | `¬(q → p)`","Una β-fórmula con ramas `p` | `q`","Un literal"],a:1,e:"`¬(p ↔ q)` ≡ `¬((p → q) ∧ (q → p))` ≡ `¬(p → q) ∨ ¬(q → p)`: comportamiento disyuntivo, una componente en cada rama.",w:{0:"Esa es la descomposición de `p ↔ q` (sin negar)."}},
 {t:5,q:"«Todos los alumnos llegan puntuales» (A: alumno, P: llega puntual) se formaliza como:",o:["`∀x (A(x) ∧ P(x))`","`∃x (A(x) ∧ P(x))`","`∀x (A(x) → P(x))`","`∃x (A(x) → P(x))`"],a:2,e:"Universal afirmativa: todo lo que es alumno llega puntual. Con ∀ se usa →; con ∃, ∧.",w:{0:"Eso diría que TODO el universo son alumnos puntuales."}},
 {t:2,q:"¿Cuántas interpretaciones tiene la fórmula `(p → q) ∧ (r ∨ ¬s) ∧ p`?",o:["8","12","16","4"],a:2,e:"Tiene 4 átomos distintos (p, q, r, s) → 2⁴ = 16. Que p aparezca dos veces no cuenta doble."},
 {t:2,q:"Si ε es una tautología y γ es cualquier fórmula, se puede afirmar que:",o:["`⊨ γ → ε`","`⊨ ε → γ`","`⊨ ε ∧ γ`","`⊨ ¬ε ∨ γ`"],a:0,e:"El consecuente ε es siempre V, y una implicación con consecuente V es siempre V.",w:{1:"`V → γ` ≡ γ: depende de γ.",2:"`V ∧ γ` ≡ γ: depende de γ.",3:"`F ∨ γ` ≡ γ: depende de γ."}}
],
ex:[
 {kind:"DPLL",pts:0.75,q:ENUN.DPLL,f:"`ε = {p ∨ q, p ∨ q ∨ ¬r, ¬p ∨ r, ¬q ∨ ¬r, ¬p ∨ ¬q}`",check:Object.assign({a:0},CHK_SAT),sol:{
   pre:["Forma clausal: `{{p, q}; {p, q, ¬r}; {¬p, r}; {¬q, ¬r}; {¬p, ¬q}}`."],
   steps:["Regla de la tautología: no se aplica.","Propagación unitaria: no hay cláusulas unitarias.","Literal puro: no hay.","Regla de INCLUSIÓN: `{p, q} ⊆ {p, q, ¬r}` → eliminamos `{p, q, ¬r}`. Queda `{{p, q}; {¬p, r}; {¬q, ¬r}; {¬p, ¬q}}`.","Sigue sin haber unitarias ni puros → RAMIFICACIÓN por `p`.",[1,"Rama `p`: `ξ(p) = {{r}; {¬q, ¬r}; {¬q}}`."],[1,"Unitaria `r`: `ξ(p, r) = {{¬q}}`."],[1,"Unitaria `¬q`: `ξ(p, r, ¬q) = ∅`."]],
   end:"Llegamos a ∅ → SATISFACIBLE. Modelo: ν(p)=V, ν(r)=V, ν(q)=F."}},
 {kind:"Tableaux",pts:2,q:ENUN.TAB,f:"`{p → q ∨ r, ¬q, ¬(s ∧ r)} ⊨ ¬p`",check:Object.assign({a:1},CHK_VAL),sol:{
   pre:[REFUT,"Por prioridad, `p → q ∨ r` se lee `p → (q ∨ r)`."],
   tree:{steps:["Raíz: `p → (q ∨ r)`, `¬q`, `¬(s ∧ r)`, `¬¬p`","Doble negación: `¬¬p` → `p`."],
     split:{why:"β-fórmula `p → (q ∨ r)` → dos ramas: `¬p` | `q ∨ r`",br:[
       {lab:"`¬p`",end:{c:1,t:"CERRADA: `p` y `¬p`"}},
       {lab:"`q ∨ r`",split:{why:"β-fórmula `q ∨ r` → dos ramas: `q` | `r`",br:[
         {lab:"`q`",end:{c:1,t:"CERRADA: `q` y `¬q`"}},
         {lab:"`r`",split:{why:"β-fórmula `¬(s ∧ r)` → dos ramas: `¬s` | `¬r`",br:[
           {lab:"`¬s`",end:{t:"ABIERTA. Literales: `p`, `¬q`, `r`, `¬s`"}},
           {lab:"`¬r`",end:{c:1,t:"CERRADA: `r` y `¬r`"}}]}}]}}]}},
   end:"Queda una hoja ABIERTA → el razonamiento NO es válido. Contraejemplo: ν(p)=V, ν(q)=F, ν(r)=V, ν(s)=F."}},
 {kind:"Resolución",pts:1.25,q:ENUN.RES,f:"`{p → q, q → r, r → s, p ∨ t, t → s} ⊨ s`",check:Object.assign({a:0},CHK_RES),sol:{
   pre:["Premisas a FNC: `¬p ∨ q`; `¬q ∨ r`; `¬r ∨ s`; `p ∨ t`; `¬t ∨ s`.","Conclusión negada (conjunto soporte): `¬s`."],
   fit:[["1","{¬p, q}","Premisa"],["2","{¬q, r}","Premisa"],["3","{¬r, s}","Premisa"],["4","{p, t}","Premisa"],["5","{¬t, s}","Premisa"],["6","{¬s}","Conjunto soporte (CS)"],["7","{¬r}","Rs(3, 6) · CS · Subsumida(3)"],["8","{¬t}","Rs(5, 6) · CS · Subsumida(5) · Puro ¬s (6)"],["9","{¬q}","Rr(2, 7) · CS · Subsumida(2) · Puro ¬r (7)"],["10","{p}","Rt(4, 8) · CS · Subsumida(4) · Puro ¬t (8)"],["11","{¬p}","Rq(1, 9) · CS · Subsumida(1) · Puro ¬q (9)"],["12","□","Rp(10, 11) · CS"]],
   end:"Llegamos a □ → el razonamiento es VÁLIDO. Fíjate en el paso 7: `¬s` todavía no es puro porque `s` sigue en la cláusula 5; sólo lo es tras el paso 8."}}
]}
];

  FLI.EXAMS = EXAMS;
})(window.FLI = window.FLI || {});
