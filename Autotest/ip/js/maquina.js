/*!
 * maquina.js — simulador de la máquina secuencial (primer modelo de acceso) de la guía de teoría de IP.
 * Ejecuta paso a paso tres algoritmos del tema 4 sobre una cinta de caracteres terminada en la marca '#':
 * muestra la parte izquierda, el elemento actual, la línea que se ejecuta, las variables y el invariante.
 * Marcado esperado: <section class="tool maq" id="maq"> con los elementos #maq-alg, #maq-txt, #maq-c, … (ver guia.html).
 * Requiere: assets/js/core.js (App.esc).
 */
(function () {
  "use strict";
  var root = document.getElementById("maq");
  if (!root) return;
  var esc = window.App.esc;
  var MF = "#";
  var $ = function (id) { return document.getElementById(id); };

  /* Cada algoritmo: líneas de pseudocódigo, invariante y un generador que va «ejecutando» líneas.
     El generador recibe la máquina M (con comenzar, avanzar, ea) y el objeto de variables V. */
  var ALGS = {
    longitud: {
      nombre: "Longitud de un texto (recorrido, esquema 1)",
      texto: "esto es un ejemplo#",
      lineas: [
        "Comenzar (S); conta ← 0;",
        "MIENTRAS EA (S) ≠ MarcaFin HACER",
        "    conta ← conta + 1;",
        "    Avanzar (S)",
        "FIN_MIENTRAS;",
        "Escribir (conta)"
      ],
      inv: "conta = número de elementos de la parte izquierda (Piz)",
      run: function* (M, V) {
        M.comenzar(); V.conta = 0; yield 0;
        for (;;) {
          yield 1; if (M.ea() === MF) break;
          V.conta++; yield 2;
          M.avanzar(); yield 3;
        }
        yield 4;
        M.escribir(String(V.conta)); yield 5;
      }
    },
    busqueda: {
      nombre: "¿Aparece el carácter c? (búsqueda)",
      texto: "hola mundo#",
      usaC: true,
      lineas: [
        "Comenzar (S);",
        "MIENTRAS (EA (S) ≠ MarcaFin) Y (EA (S) ≠ c) HACER",
        "    Avanzar (S)",
        "FIN_MIENTRAS;",
        "SEGÚN EA (S)",
        "    EA (S) = MarcaFin : Escribir (\"No aparece\");",
        "    EA (S) ≠ MarcaFin : Escribir (\"Aparece\");",
        "FIN_SEGÚN"
      ],
      inv: "Ningún elemento de la parte izquierda es igual a c",
      run: function* (M, V, c) {
        M.comenzar(); yield 0;
        for (;;) {
          yield 1; if (M.ea() === MF || M.ea() === c) break;
          M.avanzar(); yield 2;
        }
        yield 3; yield 4;
        if (M.ea() === MF) { M.escribir("No aparece"); yield 5; }
        else { M.escribir("Aparece"); yield 6; }
        yield 7;
      }
    },
    meseta: {
      nombre: "Meseta mayor (recorrido, esquema 3)",
      texto: "aabbbcbbbbd#",
      lineas: [
        "Comenzar (S);",
        "SEGÚN EA (S)",
        "  EA (S) = MarcaFin : Escribir (\"Secuencia vacía\");",
        "  EA (S) ≠ MarcaFin : p ← 1; m ← 1; u ← EA (S);",
        "    ITERAR",
        "      Avanzar (S)",
        "      DETENER EA (S) = MarcaFin;",
        "      SI EA (S) = u ENTONCES m ← m + 1 SI_NO m ← 1 FIN_SI;",
        "      SI m > p ENTONCES p ← m FIN_SI;",
        "      u ← EA (S)",
        "    FIN_ITERAR;",
        "    Escribir (p)",
        "FIN_SEGÚN"
      ],
      inv: "p = meseta mayor de Piz, m = longitud de la última meseta de Piz, u = último de Piz",
      run: function* (M, V) {
        M.comenzar(); yield 0; yield 1;
        if (M.ea() === MF) { M.escribir("Secuencia vacía"); yield 2; yield 12; return; }
        V.p = 1; V.m = 1; V.u = M.ea(); yield 3; yield 4;
        for (;;) {
          M.avanzar(); yield 5;
          yield 6; if (M.ea() === MF) break;
          if (M.ea() === V.u) V.m++; else V.m = 1; yield 7;
          if (V.m > V.p) V.p = V.m; yield 8;
          V.u = M.ea(); yield 9;
        }
        yield 10;
        M.escribir(String(V.p)); yield 11; yield 12;
      }
    }
  };

  var sel = $("maq-alg"), txt = $("maq-txt"), cIn = $("maq-c"), cWrap = $("maq-c-wrap");
  var bPaso = $("maq-paso"), bFin = $("maq-fin"), bReset = $("maq-reset");
  var state = null;

  function cinta(s) {
    // la cinta es el texto hasta la primera '#', siempre terminada en la marca
    var i = s.indexOf(MF);
    return (i < 0 ? s : s.slice(0, i)) + MF;
  }
  function reset() {
    var alg = ALGS[sel.value];
    cWrap.hidden = !alg.usaC;
    var S = cinta(txt.value);
    var M = {
      S: S, pos: -1, salida: [],
      comenzar: function () { this.pos = 0; },
      avanzar: function () { if (this.pos < this.S.length - 1) this.pos++; },
      ea: function () { return this.S.charAt(this.pos); },
      escribir: function (x) { this.salida.push(x); }
    };
    var V = {};
    var c = (cIn.value || " ").charAt(0);
    state = { alg: alg, M: M, V: V, gen: alg.run(M, V, c), line: -1, done: false, pasos: 0 };
    draw();
  }
  function paso() {
    if (!state || state.done) return;
    var r = state.gen.next();
    if (r.done) { state.done = true; state.line = -1; }
    else { state.line = r.value; state.pasos++; }
    draw();
  }
  function hastaFin() {
    var guard = 0;
    while (state && !state.done && guard++ < 5000) paso();
  }
  function show(ch) { return ch === " " ? "␣" : esc(ch); }
  function draw() {
    var st = state, M = st.M;
    $("maq-cinta").innerHTML = M.S.split("").map(function (ch, i) {
      var cls = "celda";
      if (M.pos >= 0 && i < M.pos) cls += " piz";
      if (i === M.pos) cls += " ea";
      if (i === M.S.length - 1) cls += " mf";
      return '<span class="' + cls + '"><span class="ix">' + (i + 1) + "</span>" + show(ch) + "</span>";
    }).join("");
    $("maq-code").innerHTML = st.alg.lineas.map(function (l, i) {
      return "<li" + (i === st.line ? ' class="cur"' : "") + ">" + esc(l) + "</li>";
    }).join("");
    var rows = [["EA (S)", M.pos < 0 ? "—" : (M.ea() === MF ? "MarcaFin" : "'" + show(M.ea()) + "'")],
                ["Piz", M.pos < 0 ? "—" : "[" + M.S.slice(0, M.pos).split("").map(show).join(", ") + "]"]];
    Object.keys(st.V).forEach(function (k) {
      var v = st.V[k];
      rows.push([k, typeof v === "string" ? "'" + show(v) + "'" : String(v)]);
    });
    $("maq-vars").innerHTML = "<tbody>" + rows.map(function (r) { return "<tr><th scope=\"row\">" + esc(r[0]) + "</th><td>" + r[1] + "</td></tr>"; }).join("") + "</tbody>";
    $("maq-inv").innerHTML = "<b>Invariante:</b> " + esc(st.alg.inv);
    $("maq-out").textContent = M.salida.length ? M.salida.join(" ") : "—";
    $("maq-msg").textContent = st.done ? "Fin del algoritmo (" + st.pasos + " pasos)." : (st.pasos ? "Paso " + st.pasos + ": se acaba de ejecutar la línea resaltada." : "Pulsa «Paso» para ejecutar la primera línea.");
    bPaso.disabled = st.done; bFin.disabled = st.done;
  }

  sel.innerHTML = Object.keys(ALGS).map(function (k) { return '<option value="' + k + '">' + esc(ALGS[k].nombre) + "</option>"; }).join("");
  sel.addEventListener("change", function () { txt.value = ALGS[sel.value].texto; reset(); });
  txt.addEventListener("input", reset);
  cIn.addEventListener("input", reset);
  bPaso.addEventListener("click", paso);
  bFin.addEventListener("click", hastaFin);
  bReset.addEventListener("click", reset);
  txt.value = ALGS[sel.value].texto;
  reset();
})();
