/*!
 * resaltado.js — resaltado de sintaxis de las guías de IP, sin dependencias: palabras clave, tipos,
 * cadenas y comentarios de los bloques <code class="lang-cpp"> (C++) y <code class="lang-sp"> (notación SP).
 * Los colores están en ip/css/guia.css (.tk-k, .tk-t, .tk-s, .tk-c, .tk-p).
 */
(function () {
  "use strict";
  var esc = function (t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var L = '[A-Za-zÁÉÍÓÚÜÑáéíóúüñ_0-9]';
  function words(list) { return '(?<!' + L + ')(?:' + list.join('|') + ')(?!' + L + ')'; }
  var RULES = {
    cpp: [
      ['c', '//[^\n]*|/\\*[\\s\\S]*?\\*/'],
      ['s', '"(?:[^"\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\n]|\\\\.)*\''],
      ['p', '#include\\s*<[^>\n]*>|#\\w+'],
      ['k', words(['using', 'namespace', 'return', 'if', 'else', 'switch', 'case', 'default', 'break', 'while', 'do', 'for', 'const', 'struct', 'true', 'false', 'not', 'and', 'or'])],
      ['t', words(['int', 'float', 'double', 'char', 'bool', 'void', 'long', 'short', 'unsigned', 'string', 'cin', 'cout', 'endl', 'getline', 'boolalpha'])]
    ],
    sp: [
      ['c', '//[^\n]*|\\{[^}\n]*\\}'],
      ['s', '"[^"\n]*"|“[^”\n]*”|\'[^\'\n]*\''],
      ['k', words(['LÉXICO', 'Léxico', 'LEXICO', 'ALGORITMO', 'Algoritmo', 'FIN', 'Fin', 'SI', 'ENTONCES', 'SI_NO', 'SINO', 'FIN_SI', 'SEGÚN', 'FIN_SEGÚN', 'EN_OTRO_CASO', 'MIENTRAS', 'HACER', 'FIN_MIENTRAS', 'REPETIR', 'HASTA', 'QUE', 'ITERAR', 'DETENER', 'FIN_ITERAR', 'RECORRIENDO', 'FIN_RECORRIENDO', 'EN SENTIDO INVERSO', 'Y', 'O', 'NO', 'DIV', 'MOD', 'YDESPUÉS', 'ODESPUÉS', 'TIPO', 'Tabla', 'TABLA', 'de', 'acción', 'función', 'dato–resultado', 'dato-resultado', 'dato', 'resultado', 'PRE', 'POST', 'Pre', 'Post', 'Inv'])],
      ['t', words(['Entero', 'Real', 'Booleano', 'Carácter', 'Verdadero', 'Falso', 'MarcaFin', 'Leer', 'Escribir', 'Comenzar', 'Avanzar', 'EA', 'Crear', 'Registrar', 'Marcar', 'FDS', 'Iniciar', 'EsVacía', 'EsÚltimo', 'secuencia', 'Secuencia'])]
    ]
  };
  function highlight(code, lang) {
    var rules = RULES[lang]; if (!rules) return;
    var re = new RegExp(rules.map(function (r) { return '(' + r[1] + ')'; }).join('|'), 'gu');
    var src = code.textContent, out = '', last = 0, m;
    while ((m = re.exec(src)) !== null) {
      if (m[0] === '') { re.lastIndex++; continue; }
      var k = 1; while (m[k] === undefined) k++;
      out += esc(src.slice(last, m.index)) + '<span class="tk-' + rules[k - 1][0] + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    code.innerHTML = out + esc(src.slice(last));
  }
  try {
    document.querySelectorAll('code.lang-cpp, code.lang-sp').forEach(function (c) { highlight(c, c.classList.contains('lang-cpp') ? 'cpp' : 'sp'); });
  } catch (e) { /* navegador sin lookbehind: el código se queda sin colores */ }
})();
