/*!
 * data/chuletas.js — contenido de las chuletas: nexos, equivalencias, reglas de inferencia y tarjetas de práctica.
 * Exporta FLI.Chuletas.
 */
(function (FLI) {
  "use strict";
const SHEET_TABS=[["conectivas","Conectivas"],["nexos","Nexos → fórmulas"],["equiv","Equivalencias"],["impl","Reglas de inferencia"],["clasif","Clasificación"]];

const NEXOS=[
 {k:"not",name:"Negación",rows:[
  ["no p · no es cierto que p · es falso que p · no ocurre que p","¬p",""]]},
 {k:"and",name:"Conjunción",rows:[
  ["p y q · p pero q · p aunque q · p; sin embargo, q · p; no obstante, q · tanto p como q · p, además, q","p ∧ q","«Pero», «aunque» y «sin embargo» suenan a contraste, pero en lógica sólo dicen que pasan las dos cosas."],
  ["p pero no q · p y no q","p ∧ ¬q",""],
  ["ni p ni q","¬p ∧ ¬q","No pasa ninguna de las dos. Equivale a ¬(p ∨ q)."]]},
 {k:"or",name:"Disyunción",rows:[
  ["p o q · o p o q · o bien p o bien q","p ∨ q","En lógica la «o» es inclusiva: también es V si pasan las dos."],
  ["p a menos que q · p salvo que q · p excepto si q","¬q → p","«A menos que» = «si no». Equivale a p ∨ q."],
  ["no ambas · no es cierto que p y q","¬(p ∧ q)","Al menos una no pasa. Equivale a ¬p ∨ ¬q."]]},
 {k:"imp",name:"Implicación",rows:[
  ["si p, (entonces) q · q si p · cuando p, q · siempre que p, q · en caso de que p, q","p → q","Lo que va detrás de «si / cuando / siempre que» es el ANTECEDENTE (izquierda)."],
  ["p sólo si q · sólo si q, p","p → q","Lo que va detrás de «sólo si» es el CONSECUENTE (derecha). ¡Al revés que «si»!"],
  ["p es suficiente para q · basta p para q","p → q","Lo suficiente va a la izquierda."],
  ["q es necesario para p · p requiere q · no hay p sin q","p → q","Lo necesario va a la derecha."],
  ["p implica q","p → q",""]]},
 {k:"iff",name:"Doble implicación",rows:[
  ["p si y sólo si q · p cuando y sólo cuando q · p equivale a q","p ↔ q","Las dos flechas a la vez: p → q y q → p."],
  ["p es necesario y suficiente para q","p ↔ q",""]]}
];
const NEXO_ERR=[
 ["Voy a la fiesta sólo si me invitan","p: voy · q: me invitan","p → q","q → p","Detrás de «sólo si» va la punta de la flecha: si he ido, es que me invitaron."],
 ["Voy a la fiesta si me invitan","p: voy · q: me invitan","q → p","p → q","Detrás de «si» va el origen: la invitación garantiza que voy."],
 ["Tener carnet es necesario para conducir","p: tengo carnet · q: conduzco","q → p","p → q","Lo necesario va a la derecha: si conduzco, tengo carnet (tener carnet no garantiza conducir)."],
 ["Ni estudio ni trabajo","p: estudio · q: trabajo","¬p ∧ ¬q","¬(p ∧ q)","¬(p ∧ q) sólo dice «no las dos a la vez»: podría estudiar sin trabajar."],
 ["No es cierto que si estudio apruebe","p: estudio · q: apruebo","¬(p → q) · p ∧ ¬q","¬p → ¬q","Negar una implicación no es negar sus partes. Significa: estudio y no apruebo."],
 ["Salgo a menos que llueva","p: salgo · q: llueve","¬q → p","q → ¬p","«A menos que» = «si no». Si no llueve, salgo; si llueve, no se dice nada."],
 ["Estudio pero no apruebo","p: estudio · q: apruebo","p ∧ ¬q","p ∨ ¬q","«Pero» es una ∧."]
];
const DRILL_NEXOS=[
 {f:"«Voy a la fiesta sólo si me invitan»  (p: voy · q: me invitan)",b:"`p → q`",n:"Detrás de «sólo si» va el consecuente."},
 {f:"«Voy a la fiesta si me invitan»  (p: voy · q: me invitan)",b:"`q → p`",n:"Detrás de «si» va el antecedente."},
 {f:"«Saldré a menos que llueva»  (p: salgo · q: llueve)",b:"`¬q → p`  (≡ `p ∨ q`)",n:"«A menos que» = «si no»."},
 {f:"«Ni estudio ni trabajo»  (p: estudio · q: trabajo)",b:"`¬p ∧ ¬q`",n:"Equivale a `¬(p ∨ q)`."},
 {f:"«No es verdad que estudie y trabaje»  (p: estudio · q: trabajo)",b:"`¬(p ∧ q)`  (≡ `¬p ∨ ¬q`)",n:"No las dos a la vez."},
 {f:"«Estudio pero no apruebo»  (p: estudio · q: apruebo)",b:"`p ∧ ¬q`",n:"«Pero» es una conjunción."},
 {f:"«Apruebo aunque no estudio»  (p: estudio · q: apruebo)",b:"`q ∧ ¬p`",n:"«Aunque» también es una conjunción."},
 {f:"«Tener carnet es necesario para conducir»  (p: tengo carnet · q: conduzco)",b:"`q → p`",n:"Lo necesario va a la derecha."},
 {f:"«Aprobar es suficiente para pasar de curso»  (p: apruebo · q: paso de curso)",b:"`p → q`",n:"Lo suficiente va a la izquierda."},
 {f:"«Me baño si y sólo si hace calor»  (p: me baño · q: hace calor)",b:"`p ↔ q`"},
 {f:"«Siempre que llueve, se moja el suelo»  (p: llueve · q: el suelo se moja)",b:"`p → q`",n:"«Siempre que» funciona como «si»."},
 {f:"«No hay humo sin fuego»  (p: hay humo · q: hay fuego)",b:"`p → q`",n:"El fuego es necesario para el humo: si hay humo, hay fuego."},
 {f:"«Si no estudio, no apruebo»  (p: estudio · q: apruebo)",b:"`¬p → ¬q`  (≡ `q → p`)",n:"Por contraposición: si apruebo, es que he estudiado."},
 {f:"«O llueve o hace sol»  (p: llueve · q: hace sol)",b:"`p ∨ q`"},
 {f:"«No es cierto que si estudio apruebe»  (p: estudio · q: apruebo)",b:"`¬(p → q)`  (≡ `p ∧ ¬q`)",n:"Estudio y, aun así, no apruebo."},
 {f:"«Sólo si hace sol, salgo»  (p: hace sol · q: salgo)",b:"`q → p`",n:"Da igual el orden de la frase: detrás de «sólo si» está p, así que p va a la derecha."},
 {f:"«Cuando hace frío, me abrigo»  (p: hace frío · q: me abrigo)",b:"`p → q`"},
 {f:"«Si llueve y hace frío, me quedo en casa»  (p: llueve · q: hace frío · r: me quedo)",b:"`p ∧ q → r`",n:"Por prioridad se lee `(p ∧ q) → r`."},
 {f:"«Si llueve, me quedo en casa o voy al cine»  (p: llueve · q: me quedo · r: voy al cine)",b:"`p → q ∨ r`",n:"Se lee `p → (q ∨ r)`."},
 {f:"«Aprobar el examen es necesario y suficiente para aprobar la asignatura»  (p: apruebo el examen · q: apruebo la asignatura)",b:"`p ↔ q`"}
];
const EQUIV=[
 {g:"1 · Quitar → y ↔ (el primer paso de la FNC)",k:"imp",rows:[
  ["Interdefinición de la implicación","α → β ≡ ¬α ∨ β · α → β ≡ ¬(α ∧ ¬β)","Niega lo de delante y cambia → por ∨.",1],
  ["Interdefinición de la doble implicación","α ↔ β ≡ (α → β) ∧ (β → α)","Son las dos flechas a la vez.",0],
  ["Negación de la implicación","¬(α → β) ≡ α ∧ ¬β","La única forma de romper la promesa: se da α y falla β.",0]]},
 {g:"2 · Mover las negaciones",k:"not",rows:[
  ["Doble negación","¬¬α ≡ α","Dos «no» se anulan.",0],
  ["De Morgan: conjunción de negaciones","¬α ∧ ¬β ≡ ¬(α ∨ β)","La ¬ entra en el paréntesis y la ∨ se vuelve ∧.",1],
  ["De Morgan: disyunción de negaciones","¬α ∨ ¬β ≡ ¬(α ∧ β)","La ¬ entra en el paréntesis y la ∧ se vuelve ∨.",1]]},
 {g:"3 · Reordenar y repartir",k:"and",rows:[
  ["Conmutativa","α ∧ β ≡ β ∧ α · α ∨ β ≡ β ∨ α · α ↔ β ≡ β ↔ α","Vale para ∧, ∨ y ↔. ¡NUNCA para →!",0],
  ["Asociatividad","α ∧ (β ∧ γ) ≡ (α ∧ β) ∧ γ · α ∨ (β ∨ γ) ≡ (α ∨ β) ∨ γ","Si toda la cadena es de ∧ (o toda de ∨), los paréntesis dan igual.",1],
  ["Distributiva conjunción / disyunción","α ∧ (β ∨ γ) ≡ (α ∧ β) ∨ (α ∧ γ)","Como en aritmética: a·(b+c) = a·b + a·c.",1],
  ["Distributiva disyunción / conjunción","α ∨ (β ∧ γ) ≡ (α ∨ β) ∧ (α ∨ γ)","La que se usa para llegar a la FNC: la ∨ se reparte sobre la ∧.",1]]},
 {g:"4 · Transformar implicaciones",k:"iff",rows:[
  ["Contraposición","α → β ≡ ¬β → ¬α","Dale la vuelta y niega las dos.",1],
  ["Exportación / Importación","(α ∧ β) → γ ≡ α → (β → γ)","Dos condiciones juntas = una condición dentro de la otra.",1]]},
 {g:"5 · Simplificar",k:"or",rows:[
  ["Epistemológicas","α ∧ ¬α ≡ F · α ∨ ¬α ≡ V","No contradicción y tercio excluido.",1],
  ["Idempotencia","α ∧ α ≡ α · α ∨ α ≡ α","Repetir no añade nada.",0],
  ["Absorción","α ∧ (α ∨ β) ≡ α · α ∨ (α ∧ β) ≡ α","Lo de fuera «se come» al paréntesis que lo contiene.",0],
  ["Elemento neutro","α ∧ V ≡ α · α ∨ F ≡ α","V no cambia una ∧; F no cambia una ∨.",0],
  ["Elemento absorbente","α ∨ V ≡ V · α ∧ F ≡ F","Un V salva la ∨; un F hunde la ∧.",0]]}
];
const NOT_EQUIV=[
 ["p → q","q → p","Con p=V, q=F: la primera es F y la segunda V. (Es la recíproca.)"],
 ["p → q","¬p → ¬q","Con p=F, q=V: la primera es V y la segunda F. (Es la contraria.)"],
 ["¬(p ∧ q)","¬p ∧ ¬q","Con p=V, q=F: la primera es V y la segunda F. Al aplicar De Morgan hay que cambiar ∧ por ∨."],
 ["¬(p → q)","¬p → ¬q","Con p=F, q=F: la primera es F y la segunda V. Negar una implicación da `p ∧ ¬q`."],
 ["(p → q) → r","p → (q → r)","Con p=F, r=F: la primera es F y la segunda V. La → no es asociativa."]
];
const DRILL_EQUIV=[
 {f:"`α → β` ≡ ?",b:"`¬α ∨ β`",n:"Interdefinición de la implicación."},
 {f:"`¬(α → β)` ≡ ?",b:"`α ∧ ¬β`",n:"La implicación sólo es F si α es V y β es F."},
 {f:"`α ↔ β` ≡ ?",b:"`(α → β) ∧ (β → α)`",n:"Interdefinición de la doble implicación."},
 {f:"`¬(α ∧ β)` ≡ ?",b:"`¬α ∨ ¬β`",n:"De Morgan: la ∧ pasa a ∨."},
 {f:"`¬(α ∨ β)` ≡ ?",b:"`¬α ∧ ¬β`",n:"De Morgan: la ∨ pasa a ∧."},
 {f:"`¬¬α` ≡ ?",b:"`α`",n:"Doble negación."},
 {f:"`α → β` ≡ ? (con otra implicación)",b:"`¬β → ¬α`",n:"Contraposición."},
 {f:"`(α ∧ β) → γ` ≡ ?",b:"`α → (β → γ)`",n:"Exportación."},
 {f:"`α ∨ (β ∧ γ)` ≡ ?",b:"`(α ∨ β) ∧ (α ∨ γ)`",n:"Distributiva de ∨ sobre ∧ (la de la FNC)."},
 {f:"`α ∧ (β ∨ γ)` ≡ ?",b:"`(α ∧ β) ∨ (α ∧ γ)`",n:"Distributiva de ∧ sobre ∨."},
 {f:"`α ∧ (α ∨ β)` ≡ ?",b:"`α`",n:"Absorción."},
 {f:"`α ∨ ¬α` ≡ ?",b:"V",n:"Tercio excluido."},
 {f:"`α ∧ ¬α` ≡ ?",b:"F",n:"No contradicción."},
 {f:"`α ∨ F` ≡ ?",b:"`α`",n:"F es el neutro de la ∨."},
 {f:"`α ∧ F` ≡ ?",b:"F",n:"F es absorbente para la ∧."},
 {f:"¿Es cierto que `p → q` ≡ `q → p`?",b:"NO",n:"Es la recíproca. Contraejemplo: p=V, q=F."},
 {f:"¿Es cierto que `p → q` ≡ `¬q → ¬p`?",b:"SÍ",n:"Es la contrarrecíproca (contraposición)."},
 {f:"¿Es cierto que `(p → q) → r` ≡ `p → (q → r)`?",b:"NO",n:"Contraejemplo: p=F, r=F."}
];
const RULES=[
 ["Ley de combinación","{α, β} ⊨ α ∧ β","Si tengo las dos, tengo su «y».","Llueve. Hace frío. ⇒ Llueve y hace frío."],
 ["Leyes de simplificación","{α ∧ β} ⊨ α · {α ∧ β} ⊨ β","De una «y» me quedo con la parte que quiera.","Llueve y hace frío ⇒ Llueve."],
 ["Leyes de adición","{α} ⊨ α ∨ β · {β} ⊨ α ∨ β","A algo verdadero le puedo añadir «o lo que sea».","Llueve ⇒ Llueve o nieva."],
 ["Modus ponens","{α → β, α} ⊨ β","Se cumple la condición ⇒ se cumple lo prometido.","Si llueve, me mojo. Llueve. ⇒ Me mojo."],
 ["Modus tollens","{α → β, ¬β} ⊨ ¬α","No se cumple lo prometido ⇒ no se dio la condición.","Si llueve, me mojo. No me mojo. ⇒ No llueve."],
 ["Silogismo hipotético","{α → β, β → γ} ⊨ α → γ","Encadenar flechas (transitividad).","Si estudio, apruebo; si apruebo, lo celebro ⇒ Si estudio, lo celebro."],
 ["Silogismos disyuntivos","{α ∨ β, ¬α} ⊨ β · {α ∨ β, ¬β} ⊨ α","De una «o», descarto una opción y me queda la otra.","Café o té. No quiero café. ⇒ Té."],
 ["Prueba por casos","{α → β, ¬α → β} ⊨ β","Pase lo que pase con α, sale β.","Si llueve, me quedo; si no llueve, me quedo ⇒ Me quedo."],
 ["Eliminación de la equivalencia","{α ↔ β} ⊨ α → β · {α ↔ β} ⊨ β → α","De la doble flecha saco cualquiera de las dos.",""],
 ["Introducción de la equivalencia","{α → β, β → α} ⊨ α ↔ β","Con las dos flechas monto la doble.",""],
 ["Ley de inconsistencia","{β, ¬β} ⊨ α","De una contradicción se sigue cualquier cosa.",""]
];
const DRILL_RULES=[
 {f:"Premisas: `p → q` y `p`. ¿Qué concluyo?",b:"`q`",n:"Modus ponens."},
 {f:"Premisas: `p → q` y `¬q`. ¿Qué concluyo?",b:"`¬p`",n:"Modus tollens."},
 {f:"Premisas: `p → q` y `q → r`. ¿Qué concluyo?",b:"`p → r`",n:"Silogismo hipotético."},
 {f:"Premisas: `p ∨ q` y `¬p`. ¿Qué concluyo?",b:"`q`",n:"Silogismo disyuntivo."},
 {f:"Premisa: `p ∧ q`. ¿Qué puedo concluir?",b:"`p` (o `q`)",n:"Simplificación."},
 {f:"Premisa: `p`. ¿Puedo concluir `p ∨ r`?",b:"SÍ",n:"Adición."},
 {f:"Premisas: `p` y `q`. ¿Qué concluyo?",b:"`p ∧ q`",n:"Combinación."},
 {f:"Premisas: `p → r` y `¬p → r`. ¿Qué concluyo?",b:"`r`",n:"Prueba por casos."},
 {f:"Premisa: `p ↔ q`. ¿Puedo concluir `q → p`?",b:"SÍ",n:"Eliminación de la equivalencia."},
 {f:"Premisas: `p → q` y `q → p`. ¿Qué concluyo?",b:"`p ↔ q`",n:"Introducción de la equivalencia."},
 {f:"Premisas: `p` y `¬p`. ¿Qué concluyo?",b:"Cualquier fórmula",n:"Ley de inconsistencia."},
 {f:"Premisas: `p → q` y `q`. ¿Puedo concluir `p`?",b:"NO",n:"Falacia de afirmar el consecuente. Contraejemplo: p=F, q=V."},
 {f:"Premisas: `p → q` y `¬p`. ¿Puedo concluir `¬q`?",b:"NO",n:"Falacia de negar el antecedente. Contraejemplo: p=F, q=V."}
];


  FLI.Chuletas = { SHEET_TABS, NEXOS, NEXO_ERR, DRILL_NEXOS, EQUIV, NOT_EQUIV, DRILL_EQUIV, RULES, DRILL_RULES };
})(window.FLI = window.FLI || {});
