/*!
 * core.js — utilidades comunes a todas las páginas del sitio.
 *
 *   App.SUBJECTS   registro de asignaturas: secciones (Teoría · Prácticas · Examen) y recursos de cada una.
 *                  La portada, la portada de cada asignatura y la navegación se generan a partir de él.
 *   App.KINDS      tipos de recurso (guía, chuleta, autotest…) con su icono y su orden canónico
 *   App.icon(n)    icono SVG en línea
 *   App.progress   progreso guardado de un recurso o de una asignatura entera
 *   App.store      lectura/escritura en localStorage con JSON y tolerante a errores
 *   App.session    igual, pero en sessionStorage (estado de una sesión de estudio)
 *   App.shuffle    copia barajada de un array (Fisher–Yates)
 *   App.esc        escapa texto para insertarlo como HTML
 *   App.theme      tema claro / oscuro compartido por todas las páginas
 *   App.retro      modo terminal «de castigo» al cerrar el aviso (ver assets/js/retro.js): get(), set(on), toggle()
 *   App.puntos     suma puntos al ranking al terminar un test ({ asig, tipo, aciertos, total, nota?, tema? }; ver cuentas.js)
 *   App.repaso     repaso de fallos con repetición espaciada (anotar, pendientes, resumen)
 *   App.historial  tests terminados de cada asignatura (para las estadísticas)
 *   App.sesion()   cuenta activa ({ id, nombre, token, local }) o null
 *   App.cursos     cursos de la cuenta (1.º, 2.º…): get(), set(lista), tiene(n), asignaturas(), selector(el) y LISTA
 *   App.config     configuración que se cambia desde el panel de administración (aviso y fechas de
 *                  exámenes): get(), actualizar(cfg) y examenesCodigo() (las fechas que trae el código)
 *
 * Sin cuenta activa, cualquier página manda a cuenta.html para entrar o registrarse (<html data-auth="off">
 * lo desactiva en una página).
 *
 * Se carga en el <head> SIN defer: aplica el tema antes de pintar la página (evita el parpadeo)
 * y, cuando el DOM está listo, inserta la navegación según los data-* del <body>:
 *   data-root     ruta relativa a la raíz del sitio ("" en la raíz, "../" en fc/, "../../" en fc/teoria/)
 *   data-subject  id de la asignatura (clave de App.SUBJECTS); vacío en la portada
 *   data-hub      presente en la portada de una asignatura
 *   data-title    título corto de la página (opcional: por defecto, el del recurso del registro)
 * La sección activa y el recurso actual se deducen comparando la URL con los recursos del registro.
 */
(function () {
  "use strict";
  // Ruta de este script (sirve para cargar el asistente desde cualquier carpeta).
  const CORE_SRC = document.currentScript && document.currentScript.src;
  // Raíz del sitio, deducida de la ruta de este script (…/assets/js/core.js → …/).
  const ROOT_URL = CORE_SRC ? CORE_SRC.replace(/assets\/js\/core\.js(\?.*)?$/, "") : "";

  /* ---------- Tipos de recurso ----------
     Todas las asignaturas usan los mismos tipos, con el mismo icono y en el mismo orden dentro de cada sección. */
  const KINDS = {
    guia:        { label: "Guía",         icon: "book" },
    chuleta:     { label: "Chuleta",      icon: "sheet" },
    autotest:    { label: "Autotest",     icon: "check" },
    drill:       { label: "Práctica",     icon: "swap" },
    ejercicios:  { label: "Ejercicios",   icon: "pencil" },
    simulador:   { label: "Simulador",    icon: "play" },
    herramientas:{ label: "Herramientas", icon: "sliders" },
    examen:      { label: "Examen",       icon: "clipboard" },
    simulacro:   { label: "Simulacro",    icon: "timer" },
    general:     { label: "Test general", icon: "sigma" }
  };

  /* ---------- Las tres secciones de toda asignatura ---------- */
  const SECTIONS = [
    { id: "teoria", label: "Teoría", icon: "book" },
    { id: "practicas", label: "Prácticas", icon: "terminal" },
    { id: "examen", label: "Examen", icon: "flag" }
  ];

  /* ---------- Registro de asignaturas ----------
     Cada asignatura: id, curso (1, 2…; ver App.cursos), short, name, desc, home, intro, exam/exams, sub y resources.
     Cada recurso: id, sec (teoria|practicas|examen), group (opcional, p. ej. L0/L1), kind (App.KINDS), title, desc,
     href (desde la raíz) y progress (qué progreso guardado mostrar; ver App.progress.resource). */
  const SUBJECTS = [
    {
      id: "fli",
      curso: 1,
      short: "FLI",
      name: "Fundamentos Lógicos de la Informática",
      desc: "Lógica proposicional (L0) y lógica de predicados (L1).",
      home: "fli/index.html",
      exam: { date: "2026-12-04", label: "4 de diciembre de 2026", href: "fli/teoria/examenes.html", cta: "practica con el parcial real y los simulacros" },
      intro: "La asignatura tiene dos bloques: lógica proposicional (L0, temas 1–4 y sesiones 1–5) y lógica de predicados (L1, temas 5–8 y sesiones 6–12). Aquí tienes la teoría, las prácticas y la preparación del examen de los dos.",
      groups: { L0: "Lógica proposicional", L1: "Lógica de predicados" },
      sub: { teoria: "Temas 1–8", practicas: "Sesiones 1–12", examen: "Parcial y simulacros" },
      resources: [
        { id: "chuletas", sec: "teoria", group: "L0", kind: "chuleta", title: "Chuletas visuales", href: "fli/teoria/chuletas.html",
          desc: "Tablas de verdad, del castellano a las conectivas, equivalencias, reglas de inferencia y clasificación, con tarjetas para memorizar." },
        { id: "autotest", sec: "teoria", group: "L0", kind: "autotest", title: "Autotest por temas", href: "fli/teoria/autotest.html",
          desc: "Tests de cada tema con corrección inmediata y la explicación de cada respuesta.", progress: { t: "autotest", prefix: "fli-best-", topics: [1, 2, 3, 4], names: { 1: "Introducción a la lógica", 2: "Lógica proposicional (L0)", 3: "Razonamientos", 4: "Problema SAT en L0" } } },
        { id: "equivalencias", sec: "teoria", group: "L0", kind: "drill", title: "Equivalencias de L0", href: "fli/teoria/equivalencias.html",
          desc: "Test sólo con fórmulas: elige la equivalente o decide si dos fórmulas lo son. Si fallas, contraejemplo y tabla de verdad.", progress: { t: "best", key: "eq-best" } },
        { id: "ejercicios-t", sec: "teoria", group: "L0", kind: "ejercicios", title: "Ejercicios por tema", href: "fli/teoria/ejercicios.html",
          desc: "94 ejercicios de teoría separados por tópico, con bloque integrador en cada tema y todas las soluciones.", progress: { t: "hechos", key: "fli-ejercicios-hechos", total: 94 } },
        { id: "guia-p", sec: "practicas", group: "L0", kind: "guia", title: "Guía de prácticas", href: "fli/practicas/guia.html",
          desc: "Sintaxis, formalización, tablas de verdad, deducción natural y tableaux, con el analizador de fórmulas y el comprobador de razonamientos.", progress: { t: "text", key: "fli-gpart", label: "última parte vista" } },
        { id: "ejercicios-p", sec: "practicas", group: "L0", kind: "ejercicios", title: "Ejercicios de prácticas", href: "fli/practicas/ejercicios.html",
          desc: "Sesiones 1 a 5: formalización y deducción natural resueltas y propuestas, y los ejemplos de los apuntes. 83 ejercicios.", progress: { t: "hechos", key: "fli-practicas-hechos", total: 83 } },
        { id: "l1-guia-t", sec: "teoria", group: "L1", kind: "guia", title: "Guía de teoría de L1", href: "fli/l1/teoria/guia.html",
          desc: "Temas 5 a 8: conjuntos y lógica categórica, sintaxis e interpretación de L1, sustituciones y equivalencias, tableaux, Skolem, unificación y resolución, con los ejercicios de teoría resueltos.", progress: { t: "estudio", key: "fli-l1-teoria-estudio", visto: "fli-l1-teoria-visto", total: 22 } },
        { id: "l1-autotest", sec: "teoria", group: "L1", kind: "autotest", title: "Autotest de L1", href: "fli/teoria/autotest.html",
          desc: "Preguntas de los temas 5 a 8 con corrección inmediata y explicación (el mismo autotest de L0, temas 5 a 8).", progress: { t: "autotest", prefix: "fli-best-", topics: [5, 6, 7, 8], names: { 5: "Lógica categórica y de relaciones", 6: "Lógica de predicados", 7: "Razonamientos en L1", 8: "Problema SAT en L1" } } },
        { id: "l1-guia", sec: "practicas", group: "L1", kind: "guia", title: "Guía de prácticas de L1", href: "fli/l1/practicas/guia.html",
          desc: "Lógica categórica, formalización, sintaxis, interpretación en un mundo, deducción natural con cuantificadores y SAT en L1." },
        { id: "l1-clase", sec: "practicas", group: "L1", kind: "ejercicios", title: "Ejercicios de clase", href: "fli/l1/practicas/clase.html",
          desc: "La relación de las sesiones 6 a 12 (ejercicios 12–32) resuelta y explicada apartado por apartado.", progress: { t: "hechos", key: "fli-l1-clase-hechos", total: 52 } },
        { id: "l1-resueltos", sec: "practicas", group: "L1", kind: "ejercicios", title: "Resueltos y propuestos", href: "fli/l1/practicas/resueltos.html",
          desc: "Los resueltos oficiales explicados paso a paso y los propuestos resueltos, en orden.", progress: { t: "hechos", key: "fli-l1-resueltos-hechos", total: 18 } },
        { id: "l1-niveles", sec: "practicas", group: "L1", kind: "ejercicios", title: "Práctica por niveles", href: "fli/l1/practicas/niveles.html",
          desc: "Nivel 1: lo que vas a tener que hacer. Niveles 2 a 5: todos los ejercicios de menor a mayor dificultad.", progress: { t: "hechos", key: "fli-l1-niveles-hechos", total: 70 } },
        { id: "examenes", sec: "examen", kind: "examen", title: "Exámenes completos", href: "fli/teoria/examenes.html",
          desc: "El parcial real 23-24 y cuatro simulacros con el mismo formato: test (+0,6 / −0,2) y DPLL, Tableaux y Resolución resueltos paso a paso.", progress: { t: "fliexam" } },
        { id: "general", sec: "examen", kind: "general", title: "Test general", href: "fli/teoria/autotest.html#test-G",
          desc: "30 preguntas de los cuatro temas de L0 con el peso de cada tema.", progress: { t: "best", key: "fli-best-G", scale: 10 } }
      ]
    },
    {
      id: "fc",
      curso: 1,
      short: "FC",
      name: "Fundamentos de Computadores",
      desc: "Del bit a la red: representación, circuitos, Linux, x86-64 y redes.",
      home: "fc/index.html",
      intro: "Seis temas: introducción al computador, representación de la información, circuitos combinacionales, sistemas operativos (Linux), lenguajes del computador (x86-64) y redes. Teoría, prácticas y todo lo necesario para el examen.",
      exam: { date: "2027-01-13", label: "13 de enero de 2027, por la tarde", href: "fc/examen/guia.html" },
      sub: { teoria: "Temas 1–6", practicas: "Boletines 1–6", examen: "Test + problemas" },
      resources: [
        { id: "guia-t", sec: "teoria", kind: "guia", title: "Guía de teoría", href: "fc/teoria/guia.html",
          desc: "Los seis temas: definiciones, ejemplos resueltos tipo examen (C2, IEEE 754, Karnaugh, rendimiento, CIDR…) y las trampas del test.", progress: { t: "estudio", key: "fc-teoria-estudio", visto: "fc-teoria-visto", total: 36 } },
        { id: "chuleta", sec: "teoria", kind: "chuleta", title: "Chuleta", href: "fc/teoria/chuleta.html",
          desc: "Todas las fórmulas, la tabla de conversión, los comandos de Linux, el ensamblador y los errores que más puntos cuestan, en una página." },
        { id: "autotest", sec: "teoria", kind: "autotest", title: "Autotest por temas", href: "fc/teoria/autotest.html",
          desc: "Más de 500 preguntas por temas con corrección inmediata, la explicación de cada respuesta y tandas nuevas sin repetir.", progress: { t: "autotest", prefix: "fc-best-", topics: [1, 2, 3, 4, 5, 6], names: { 1: "Introducción", 2: "Representación de la información", 3: "Circuitos combinacionales", 4: "Sistemas operativos (Linux)", 5: "Lenguajes del computador", 6: "Redes de ordenadores" } } },
        { id: "guia-p", sec: "practicas", kind: "guia", title: "Guía de prácticas", href: "fc/practicas/guia.html",
          desc: "Cada boletín explicado (placa base, okteta y PPM, TkGate, Linux, gcc y gdb, red y HTTP) con 43 ejercicios resueltos paso a paso.", progress: { t: "hechos", key: "fc-practicas-hechos", total: 43 } },
        { id: "herramientas", sec: "practicas", kind: "herramientas", title: "Herramientas", href: "fc/practicas/herramientas.html",
          desc: "Mini‑okteta, conversor de bases, complemento a 2 con pasos, Karnaugh, píxeles PPM, permisos, subredes y rendimiento, para comprobar lo que hagas a mano." },
        { id: "guia-e", sec: "examen", kind: "examen", title: "Guía del examen", href: "fc/examen/guia.html",
          desc: "Cómo es y cómo se puntúa, por dónde empezar a estudiar, el método de cada problema y 9 problemas de convocatorias anteriores resueltos.", progress: { t: "hechos", key: "fc-examen-hechos", total: 9 } },
        { id: "simulacro", sec: "examen", kind: "simulacro", title: "Simulacro del test", href: "fc/examen/simulacro.html",
          desc: "40 preguntas tipo examen de tres opciones con el reparto real por temas, reloj y la penalización oficial (2 fallos anulan 1 acierto).", progress: { t: "sim", key: "fc-sim-best" } },
        { id: "general", sec: "examen", kind: "general", title: "Test general", href: "fc/teoria/autotest.html#test-G",
          desc: "30 preguntas de los seis temas con corrección inmediata: para repasar sin reloj.", progress: { t: "best", key: "fc-best-G", scale: 10 } }
      ]
    },
    {
      id: "ip",
      curso: 1,
      short: "IP",
      name: "Introducción a la Programación",
      desc: "Algoritmos con la notación de clase y su traducción a C++.",
      home: "ip/index.html",
      intro: "Seis temas de teoría (algoritmos, léxico y casos, acciones y funciones, iteración, secuencias y tablas) con la notación algorítmica de clase, siete prácticas en C++ con Geany y g++ y los exámenes de secuencias de otros años resueltos.",
      exams: [
        { date: "2026-11-20", name: "2.º parcial", label: "20 de noviembre de 2026 · 2.º parcial", href: "ip/examen/guia.html", cta: "practica con los exámenes de otros años resueltos" },
        { date: "2026-12-18", name: "Examen final", label: "18 de diciembre de 2026 · examen final", href: "ip/teoria/autotest.html#test-G", cta: "practica con el test general" }
      ],
      sub: { teoria: "Temas 0–5", practicas: "Prácticas 1–7", examen: "Exámenes de secuencias resueltos" },
      resources: [
        { id: "guia-t", sec: "teoria", kind: "guia", title: "Guía de teoría", href: "ip/teoria/guia.html",
          desc: "Los seis temas con la notación SP y su traducción a C++: tipos, casos, acciones y funciones, iteraciones, esquemas de recorrido y búsqueda, tablas y ordenación.", progress: { t: "estudio", key: "ip-teoria-estudio", visto: "ip-teoria-visto", total: 40 } },
        { id: "chuleta", sec: "teoria", kind: "chuleta", title: "Chuletas: SP → C++ y esquemas", href: "ip/teoria/guia.html#a-1",
          desc: "Todas las equivalencias entre la notación SP y C++ en una tabla, y los esquemas de recorrido y búsqueda." },
        { id: "autotest", sec: "teoria", kind: "autotest", title: "Autotest por temas", href: "ip/teoria/autotest.html",
          desc: "198 preguntas por tema (también del tema 5, tablas y ordenación) y un bloque del C++ de prácticas, con corrección inmediata y explicación.", progress: { t: "autotest", prefix: "ip-best-", topics: [0, 1, 2, 3, 4, 6, 5], names: { 0: "Algoritmos, programas y procesos", 1: "Léxico y organización", 2: "Acciones, funciones y tablas", 3: "La iteración", 4: "Secuencias y esquemas", 6: "Tablas y ordenación", 5: "C++ de prácticas" } } },
        { id: "simulador", sec: "teoria", kind: "simulador", title: "Simulador de la máquina secuencial", href: "ip/teoria/guia.html#t4-8",
          desc: "Ejecuta paso a paso un recorrido, una búsqueda y la meseta mayor: parte izquierda, elemento actual, variables e invariante." },
        { id: "guia-p", sec: "practicas", kind: "guia", title: "Guía de prácticas", href: "ip/practicas/guia.html",
          desc: "Geany y g++, léxico y estados, casos, struct y subprogramas, iteraciones, secuencias y tablas: 51 ejercicios con el programa y una ejecución real.", progress: { t: "hechos", key: "ip-practicas-hechos", total: 51 } },
        { id: "guia-e", sec: "examen", kind: "examen", title: "Guía del examen", href: "ip/examen/guia.html",
          desc: "Cómo son los ejercicios de secuencias, el método que da la nota y 14 exámenes y problemas de otros años resueltos (diciembre 2022 y 2023, noviembre 2019, junio, la hoja de secuencias y el 1.er parcial de 2026).", progress: { t: "hechos", key: "ip-examen-hechos", total: 14 } },
        { id: "general", sec: "examen", kind: "general", title: "Test general", href: "ip/teoria/autotest.html#test-G",
          desc: "30 preguntas de todos los temas y del C++ de prácticas, repartidas según su peso.", progress: { t: "best", key: "ip-best-G", scale: 10 } }
      ]
    },
    {
      id: "gohp",
      curso: 1,
      short: "GOHP",
      name: "Gestión de Organizaciones y Habilidades Profesionales",
      desc: "La empresa por dentro: estrategia, organización, producción, marketing, finanzas y personas.",
      home: "gohp/index.html",
      intro: "Diez temas: la empresa, las teorías de la administración, el entorno, la planificación, la organización, la producción, el marketing, las finanzas, la dirección y los recursos humanos, más el seminario de ética. Teoría, prácticas resueltas, calculadoras y todo lo necesario para el examen.",
      exam: { date: "2027-01-08", label: "8 de enero de 2027 · test + parte escrita", href: "gohp/examen/guia.html" },
      sub: { teoria: "Temas 1–10", practicas: "Prácticas 1–10", examen: "Test + parte escrita" },
      resources: [
        { id: "guia-t", sec: "teoria", kind: "guia", title: "Guía de teoría", href: "gohp/teoria/guia.html",
          desc: "Los diez temas y el seminario de ética: definiciones, cálculos resueltos (productividad, punto muerto, VAN y TIR) y las trampas del test.", progress: { t: "estudio", key: "gohp-teoria-estudio", visto: "gohp-teoria-visto", total: 62 } },
        { id: "chuleta", sec: "teoria", kind: "chuleta", title: "Chuleta", href: "gohp/teoria/chuleta.html",
          desc: "Tamaños y formas de empresa, teorías, estrategias, todas las fórmulas de producción e inversión y las teorías de la motivación, en una página." },
        { id: "autotest", sec: "teoria", kind: "autotest", title: "Autotest por temas", href: "gohp/teoria/autotest.html",
          desc: "Unas 300 preguntas de los diez temas y del seminario con corrección inmediata, explicación y la penalización del examen (−1/3).", progress: { t: "autotest", prefix: "gohp-best-", topics: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], names: { 1: "La empresa", 2: "La administración", 3: "El entorno", 4: "Planificación", 5: "Organización", 6: "Producción", 7: "Marketing", 8: "Finanzas", 9: "Dirección", 10: "Recursos humanos" } } },
        { id: "guia-p", sec: "practicas", kind: "guia", title: "Guía de prácticas", href: "gohp/practicas/guia.html",
          desc: "Las prácticas de los diez temas resueltas: casos de empresa, organigramas y todos los problemas de producción e inversión paso a paso (41 ejercicios).", progress: { t: "hechos", key: "gohp-practicas-hechos", total: 41 } },
        { id: "herramientas", sec: "practicas", kind: "herramientas", title: "Herramientas", href: "gohp/practicas/herramientas.html",
          desc: "Punto muerto y beneficio objetivo, fabricar o comprar, productividad, VAN, TIR, pay-back y coste efectivo con TAE, con todos los pasos." },
        { id: "guia-e", sec: "examen", kind: "examen", title: "Guía del examen", href: "gohp/examen/guia.html",
          desc: "Cómo es el examen, los mínimos, la penalización del test, qué estudiar primero y 8 problemas tipo examen resueltos.", progress: { t: "hechos", key: "gohp-examen-hechos", total: 8 } },
        { id: "simulacro", sec: "examen", kind: "simulacro", title: "Simulacro del test", href: "gohp/examen/simulacro.html",
          desc: "40 preguntas de cuatro opciones, 4 de cada tema, con reloj y la penalización del examen (cada fallo resta 1/3). Nota sobre 10.", progress: { t: "best", key: "gohp-sim-best" } },
        { id: "general", sec: "examen", kind: "general", title: "Test general", href: "gohp/teoria/autotest.html#test-G",
          desc: "30 preguntas de los diez temas con corrección inmediata: para repasar sin reloj.", progress: { t: "best", key: "gohp-best-G", scale: 10 } }
      ]
    },
    {
      id: "amd",
      curso: 1,
      short: "AMD",
      name: "Álgebra y Matemática Discreta",
      desc: "Espacios vectoriales, producto escalar, aplicaciones lineales, diagonalización y aritmética modular, con SageMath.",
      home: "amd/index.html",
      intro: "Cinco temas de teoría (espacios vectoriales, producto escalar, aplicaciones lineales, diagonalización y SVD, y aritmética modular) con sus hojas de ejercicios resueltas, y once prácticas con SageMath que puedes ejecutar aquí mismo, sin instalar nada.",
      exams: [
        { date: "2026-12-17", name: "2.º parcial y global", label: "17 de diciembre de 2026, por la mañana · 2.º parcial y examen global", href: "amd/examen/parciales.html", cta: "repasa con los parciales resueltos y el simulacro" }
      ],
      sub: { teoria: "Temas 0–5", practicas: "Prácticas 1–11 con SageMath", examen: "Parciales y examen de prácticas" },
      resources: [
        { id: "guia-t", sec: "teoria", kind: "guia", title: "Guía de teoría", href: "amd/teoria/guia.html",
          desc: "Repaso de bachillerato y los cinco temas: definiciones, métodos paso a paso, ejemplos resueltos y las órdenes de SageMath de cada cálculo.", progress: { t: "estudio", key: "amd-teoria-estudio", visto: "amd-teoria-visto", total: 36 } },
        { id: "ejercicios", sec: "teoria", kind: "ejercicios", title: "Hojas de ejercicios resueltas", href: "amd/teoria/ejercicios.html",
          desc: "Las hojas 1 a 4 y los ejercicios de clase resueltos y explicados apartado por apartado, con la comprobación en SageMath.", progress: { t: "hechos", key: "amd-ejercicios-hechos", total: 177 } },
        { id: "autotest", sec: "teoria", kind: "autotest", title: "Autotest por temas", href: "amd/teoria/autotest.html",
          desc: "Preguntas de los cinco temas con corrección inmediata y la explicación de cada respuesta.", progress: { t: "autotest", prefix: "amd-best-", topics: [1, 2, 3, 4, 5], names: { 1: "Espacios vectoriales", 2: "Producto escalar", 3: "Aplicaciones lineales", 4: "Diagonalización y SVD", 5: "Aritmética modular" } } },
        { id: "sage", sec: "practicas", kind: "herramientas", title: "SageMath en la web", href: "amd/practicas/sage.html",
          desc: "Una consola de SageMath que funciona en el navegador y la chuleta con todas las órdenes que se usan en las prácticas." },
        { id: "p1", sec: "practicas", kind: "ejercicios", title: "Práctica 1 · Sistemas de ecuaciones", href: "amd/practicas/p1.html",
          desc: "Matrices en SageMath, matriz ampliada, rref y clasificación de sistemas (SCD, SCI, SI) con soluciones comprobadas.", progress: { t: "hechos", key: "amd-p1-hechos", total: 11 } },
        { id: "p2", sec: "practicas", kind: "ejercicios", title: "Práctica 2 · Bases, coordenadas y rango", href: "amd/practicas/p2.html",
          desc: "Independencia, sistemas generadores, bases y coordenadas con matrices grandes guardadas en ficheros .sobj.", progress: { t: "hechos", key: "amd-p2-hechos", total: 9 } },
        { id: "p3", sec: "practicas", kind: "ejercicios", title: "Práctica 3 · Factorización LU y Cholesky", href: "amd/practicas/p3.html",
          desc: "Matrices elementales, la descomposición LU (con y sin permutación), Cholesky y sus aplicaciones a imágenes.", progress: { t: "hechos", key: "amd-p3-hechos", total: 8 } },
        { id: "p4", sec: "practicas", kind: "ejercicios", title: "Práctica 4 · Subespacios", href: "amd/practicas/p4.html",
          desc: "Paramétricas e implícitas, dimensión, suma e intersección y un recomendador de películas con subespacios.", progress: { t: "hechos", key: "amd-p4-hechos", total: 14 } },
        { id: "p5", sec: "practicas", kind: "ejercicios", title: "Práctica 5 · Gram-Schmidt y QR", href: "amd/practicas/p5.html",
          desc: "Bases ortonormales, proyecciones, la descomposición QR y la resolución de sistemas triangulares.", progress: { t: "hechos", key: "amd-p5-hechos", total: 11 } },
        { id: "p6", sec: "practicas", kind: "ejercicios", title: "Práctica 6 · Mínimos cuadrados", href: "amd/practicas/p6.html",
          desc: "La mejor solución de un sistema incompatible, rectas y curvas de regresión y ajuste de datos reales.", progress: { t: "hechos", key: "amd-p6-hechos", total: 9 } },
        { id: "p7", sec: "practicas", kind: "ejercicios", title: "Práctica 7 · Geometría en 3D", href: "amd/practicas/p7.html",
          desc: "Rectas y planos afines: ecuaciones, bases adaptadas, posiciones relativas, interpolación lineal, distancias, raycasting y la cámara pinhole.", progress: { t: "hechos", key: "amd-p7-hechos", total: 12 } },
        { id: "p8", sec: "practicas", kind: "ejercicios", title: "Práctica 8 · Construir figuras en 3D", href: "amd/practicas/p8.html",
          desc: "Polígonos, estrellas, pirámides y prismas colocados en cualquier plano del espacio con bases ortonormales adaptadas.", progress: { t: "hechos", key: "amd-p8-hechos", total: 13 } },
        { id: "p9", sec: "practicas", kind: "ejercicios", title: "Práctica 9 · Aplicaciones lineales", href: "amd/practicas/p9.html",
          desc: "Giros, simetrías respecto a rectas y planos y dilataciones aplicadas a piezas 2D y modelos 3D: un avión, un bosque, mosaicos y una animación.", progress: { t: "hechos", key: "amd-p9-hechos", total: 13 } },
        { id: "p10", sec: "practicas", kind: "ejercicios", title: "Práctica 10 · Aplicaciones lineales en el espacio", href: "amd/practicas/p10.html",
          desc: "Giros alrededor de una recta, proyecciones oblicuas y sombras, diagonalización y A¹⁰⁰⁰⁰, vistas de un prisma y escenas 3D: una escalera, Stonehenge, un templete y una noria.", progress: { t: "hechos", key: "amd-p10-hechos", total: 14 } },
        { id: "p11", sec: "practicas", kind: "ejercicios", title: "Práctica 11 · Diagonalización ortogonal y SVD", href: "amd/practicas/p11.html",
          desc: "Bases ortonormales de vectores propios, A = P·D·Pᵗ, la descomposición en valores singulares comprobada paso a paso, qué hace A·Aᵗ con un cubo y una deformación animada.", progress: { t: "hechos", key: "amd-p11-hechos", total: 7 } },
        { id: "parciales", sec: "examen", kind: "examen", title: "Exámenes resueltos", href: "amd/examen/parciales.html",
          desc: "Los primeros parciales del curso 2025-26 resueltos (con sus erratas corregidas) y simulacros del segundo parcial y del examen de prácticas con SageMath.", progress: { t: "hechos", key: "amd-examen-hechos", total: 23 } },
        { id: "general", sec: "examen", kind: "general", title: "Test general", href: "amd/teoria/autotest.html#test-G",
          desc: "30 preguntas de los cinco temas repartidas según su peso.", progress: { t: "best", key: "amd-best-G", scale: 10 } }
      ]
    },
    {
      id: "aed",
      curso: 2,
      short: "AED I",
      name: "Algoritmos y Estructuras de Datos I",
      desc: "TAD y especificaciones, tablas de dispersión, árboles (trie, AVL, B) y grafos.",
      home: "aed/index.html",
      intro: "Cuatro temas de estructuras de datos: abstracciones y especificaciones formales, conjuntos y diccionarios con tablas de dispersión, representación de conjuntos con árboles (trie, relaciones de equivalencia, AVL y árboles B) y grafos. Con las diapositivas de clase, exámenes de otros cursos resueltos y la guía de la práctica en C++.",
      exams: [
        { date: "2026-11-16", name: "Parcial de los temas 2 y 3", label: "16 de noviembre de 2026 · parcial de los temas 2 y 3", href: "aed/teoria/autotest.html", cta: "repasa los temas 2 y 3 con el autotest" },
        { date: "2026-11-22", name: "Entrega de la práctica", label: "22 de noviembre de 2026 · entrega de la práctica y de la memoria", href: "aed/practicas/guia.html", cta: "repasa la guía de la práctica" },
        { date: "2026-12-11", name: "Investigación en grafos", label: "11 de diciembre de 2026 · actividad de investigación en grafos", href: "aed/teoria/guia.html#t4", cta: "repasa el tema 4" }
      ],
      sub: { teoria: "Temas 0–4", practicas: "Práctica: tienda online en C++", examen: "Exámenes de otros cursos" },
      resources: [
        { id: "guia-t", sec: "teoria", kind: "guia", title: "Guía de teoría", href: "aed/teoria/guia.html",
          desc: "Los cinco temas con las diapositivas de clase: especificaciones, dispersión, tries, AVL, árboles B y grafos, con ejemplos paso a paso y el coste de cada operación.", progress: { t: "estudio", key: "aed-teoria-estudio", visto: "aed-teoria-visto", total: 72 } },
        { id: "chuleta", sec: "teoria", kind: "chuleta", title: "Chuleta de costes y algoritmos", href: "aed/teoria/guia.html#r",
          desc: "Todas las estructuras con el coste de sus operaciones y su memoria, y los algoritmos de grafos con su esquema, en una sola parte." },
        { id: "autotest", sec: "teoria", kind: "autotest", title: "Autotest por temas", href: "aed/teoria/autotest.html",
          desc: "Preguntas de los cuatro temas con corrección inmediata y la explicación de cada respuesta.", progress: { t: "autotest", prefix: "aed-best-", topics: [1, 2, 3, 4], names: { 1: "Abstracciones y especificaciones", 2: "Conjuntos y diccionarios", 3: "Conjuntos con árboles", 4: "Grafos" } } },
        { id: "ejercicios", sec: "teoria", kind: "ejercicios", title: "Ejercicios de examen", href: "aed/teoria/ejercicios.html",
          desc: "Las relaciones de ejercicios de examen de los cuatro temas y la hoja de dispersión del grupo 3, cada ejercicio con su solución explicada.", progress: { t: "hechos", key: "aed-ejercicios-hechos", total: 153 } },
        { id: "guia-p", sec: "practicas", kind: "guia", title: "Guía de la práctica", href: "aed/practicas/guia.html",
          desc: "La tienda online paso a paso: C++ de las sesiones, Mooshak, módulos y makefile, la tabla de dispersión de palabras, el árbol de precios y la memoria.", progress: { t: "estudio", key: "aed-practica-estudio", visto: "aed-practica-visto", total: 16 } },
        { id: "examenes", sec: "examen", kind: "examen", title: "Exámenes resueltos", href: "aed/examen/examenes.html",
          desc: "Exámenes de convocatorias anteriores con su solución explicada: un problema por tema, como en el examen final.", progress: { t: "hechos", key: "aed-examen-hechos", total: 12 } },
        { id: "general", sec: "examen", kind: "general", title: "Test general", href: "aed/teoria/autotest.html#test-G",
          desc: "30 preguntas de los cuatro temas repartidas según su peso.", progress: { t: "best", key: "aed-best-G", scale: 10 } }
      ]
    }
  ];

  /* ---------- Fechas de exámenes ----------
     En el código, cada asignatura trae un examen («exam») o varios («exams»: parciales y final). Desde el
     panel de administración se pueden cambiar sin tocar el código (App.config → «examenes»: { fli: [{ date,
     label, name }], … }; el enlace y la frase de cada examen se toman del código). Al aplicarlas, cada
     asignatura queda con «exams» (todos), «exam» (el próximo que queda) y «examsLeft» (los siguientes). */
  const EXAMENES_CODIGO = {};
  SUBJECTS.forEach((s) => {
    EXAMENES_CODIGO[s.id] = (Array.isArray(s.exams) ? s.exams : s.exam ? [s.exam] : []).map((e) => Object.assign({}, e));
  });
  function aplicarExamenes(propios) {
    SUBJECTS.forEach((s) => {
      const base = EXAMENES_CODIGO[s.id];
      const suyos = propios && Array.isArray(propios[s.id]) ? propios[s.id].filter((e) => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date)) : null;
      const list = (suyos ? suyos.map((e, i) => {
        const b = base[i] || base[base.length - 1] || {};
        return { date: e.date, label: String(e.label || e.date), name: e.name ? String(e.name) : undefined, href: b.href || s.home, cta: b.cta };
      }) : base.map((e) => Object.assign({}, e))).sort((a, b) => (a.date < b.date ? -1 : 1));
      s.exams = list;
      if (!list.length) { s.exam = null; s.examsLeft = []; return; }
      const i = list.findIndex((e) => daysTo(e.date) >= 0);
      s.exam = i >= 0 ? list[i] : list[list.length - 1];
      s.examsLeft = i >= 0 ? list.slice(i + 1) : [];
    });
  }

  /* ---------- Entregas y Aula Virtual ----------
     El Aula Virtual de la UMU se abre en otra pestaña: la propia UMU no permite mostrarlo dentro de otra web
     (cabecera X-Frame-Options), así que no se puede incrustar ni pedir aquí la contraseña universitaria.
     Las entregas y fechas límite que trae el código salen siempre; el panel de administración añade más en
     Firestore (colección «entregas»), que la página de comunidad combina con estas. Cada una:
     { asig, titulo, limite: 'YYYY-MM-DD', hora?: 'HH:MM', enlace?, nota? }. */
  const AULA_VIRTUAL = "https://aulavirtual.um.es/";
  const ENTREGAS_CODIGO = [
    { asig: "gohp", titulo: "Seminario de Ética y Aspectos Sociales: trabajo práctico", limite: "2026-11-29", hora: "23:59",
      nota: "Reflexión personal de 3–4 páginas en PDF (fuente de 12 puntos). Se pide que sea propia, sin ChatGPT ni herramientas similares." }
  ];
  /** Entregas del código de una asignatura que aún no han pasado, de la más próxima a la más lejana. */
  function entregasCodigoDe(asig) {
    return ENTREGAS_CODIGO.filter((e) => e.asig === asig && daysTo(e.limite) >= 0)
      .slice().sort((a, b) => (a.limite < b.limite ? -1 : 1));
  }

  /* ---------- Almacenamiento ---------- */
  function makeStore(getStorage) {
    return function (key, value) {
      try {
        const s = getStorage();
        if (value === undefined) return JSON.parse(s.getItem(key));
        if (value === null) { s.removeItem(key); return null; }
        s.setItem(key, JSON.stringify(value));
        return value;
      } catch (e) { return null; }
    };
  }
  const store = makeStore(() => window.localStorage);
  const session = makeStore(() => window.sessionStorage);

  /* ---------- Cursos ----------
     Cada asignatura es de un curso («curso» en SUBJECTS) y cada cuenta elige de qué cursos tiene asignaturas:
     pueden ser varios (alguna pendiente de 1.º, convalidaciones…). La portada, la cuenta atrás y las
     estadísticas enseñan sólo las de esos cursos; las demás siguen abiertas desde su enlace.
     Se guarda en «app-cursos» ([1], [1, 2]…), que va con el progreso de la cuenta (ver esProgreso), así que la
     elección sigue a cada uno en cualquier dispositivo. Sin elegir nada, 1.º: el curso de todas las cuentas que
     había antes de que hubiera varios. Al cambiar, se lanza el evento «app:cursos». */
  const CURSOS = Object.freeze([1, 2].map((n) => Object.freeze({ n, nombre: n + ".º", largo: n + ".º curso" })));
  const CURSOS_KEY = "app-cursos", CURSOS_POR_DEFECTO = [1];
  const cursosValidos = (l) => (Array.isArray(l) ? Array.from(new Set(l.map(Number))) : [])
    .filter((n) => CURSOS.some((c) => c.n === n)).sort((a, b) => a - b);
  function misCursos() { const l = cursosValidos(store(CURSOS_KEY)); return l.length ? l : CURSOS_POR_DEFECTO.slice(); }
  /** Cambia los cursos de la cuenta (al menos uno) y devuelve los que quedan. */
  function ponerCursos(lista) {
    const l = cursosValidos(lista);
    if (!l.length) return misCursos();
    store(CURSOS_KEY, l);
    window.dispatchEvent(new CustomEvent("app:cursos", { detail: l.slice() }));
    return l;
  }
  const asignaturasDe = (lista) => { const l = lista ? cursosValidos(lista) : misCursos(); return SUBJECTS.filter((s) => l.includes(s.curso)); };
  /**
   * Selector de cursos (portada y «Tu cuenta»): un botón por curso que se activa y se desactiva; siempre queda
   * al menos uno. Con o.local = true sólo cambia la selección del propio selector (o.get()) sin guardarla,
   * para el formulario de crear cuenta. Estilos: .cursos en assets/css/base.css.
   */
  function selectorCursos(el, o) {
    o = o || {};
    let sel = o.inicial ? cursosValidos(o.inicial) : misCursos();
    if (!sel.length) sel = CURSOS_POR_DEFECTO.slice();
    const id = "cursos-l-" + Math.random().toString(36).slice(2, 8);
    function pintar() {
      if (!o.local) sel = misCursos();
      el.classList.add("cursos");
      el.innerHTML = `<span class="cursos__l" id="${id}">${esc(o.titulo || "Tus cursos")}</span>
        <span class="cursos__opts" role="group" aria-labelledby="${id}">${CURSOS.map((c) => {
          const on = sel.includes(c.n), unico = on && sel.length === 1, n = asignaturasDe([c.n]).length;
          return `<button type="button" class="cursos__b" data-curso="${c.n}" aria-pressed="${on}"${unico ? ' aria-disabled="true" title="Tiene que quedar al menos un curso"' : ""}>${esc(c.nombre)}<small>${n} ${n === 1 ? "asignatura" : "asignaturas"}</small></button>`;
        }).join("")}</span>${o.ayuda ? `<small class="cursos__h">${esc(o.ayuda)}</small>` : ""}`;
      el.hidden = false;
    }
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-curso]");
      if (!b || b.getAttribute("aria-disabled") === "true") return;
      const n = Number(b.dataset.curso);
      const nueva = sel.includes(n) ? sel.filter((x) => x !== n) : sel.concat(n);
      if (o.local) { sel = cursosValidos(nueva); pintar(); } else ponerCursos(nueva);   // «app:cursos» lo repinta
      const otro = el.querySelector(`[data-curso="${n}"]`); if (otro) otro.focus();
    });
    if (!o.local) window.addEventListener("app:cursos", pintar);
    pintar();
    return { get: () => sel.slice() };
  }
  const cursos = Object.freeze({
    LISTA: CURSOS,
    get: misCursos,
    set: ponerCursos,
    tiene: (n) => misCursos().includes(Number(n)),
    /** Asignaturas de los cursos de la cuenta (o de los que se pasen), en el orden del registro. */
    asignaturas: asignaturasDe,
    selector: selectorCursos
  });

  /* ---------- Configuración de la web (aviso y fechas de exámenes) ----------
     La escribe el panel de administración en Firestore (config/web) y cuentas.js la trae en segundo plano.
     Aquí se guarda una copia («app-config») para aplicarla al instante al abrir la página siguiente; si
     llega una distinta, se aplica, se repinta el aviso y se lanza el evento «app:config» (la portada y la
     de cada asignatura repintan la cuenta atrás). */
  const CONFIG_KEY = "app-config", AVISO_VISTO = "app-aviso-visto";
  let CONFIG = store(CONFIG_KEY) || {};
  function examenesDe(cfg) { try { return cfg && cfg.examenes ? JSON.parse(cfg.examenes) : null; } catch (e) { return null; } }
  aplicarExamenes(examenesDe(CONFIG));
  function actualizarConfig(cfg) {
    cfg = cfg && typeof cfg === "object" ? cfg : {};
    if (JSON.stringify(cfg) === JSON.stringify(CONFIG)) return false;
    CONFIG = cfg; store(CONFIG_KEY, cfg);
    aplicarExamenes(examenesDe(cfg));
    pintarAviso();
    window.dispatchEvent(new CustomEvent("app:config"));
    return true;
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  /* ---------- Iconos (trazo, 24×24, heredan el color del texto) ---------- */
  const ICONS = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8.5 7.5h7"/>',
    sheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    check: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M8 12.5l2.8 2.8L16.5 9"/>',
    swap: '<path d="M4 8h15M15.5 4.5L19 8l-3.5 3.5M20 16H5M8.5 12.5L5 16l3.5 3.5"/>',
    pencil: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 7.5l2 2"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5.5 3.5-5.5 3.5z"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3h6v1.5"/><path d="M9 11h6M9 15h4"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5M18.5 6.5l1.5-1.5"/>',
    sigma: '<path d="M18 5H6.5l6 7-6 7H18"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9.5l3 2.5-3 2.5M12.5 15H17"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z"/>',
    user: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    logout: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
    swapuser: '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 19.5a6 6 0 0 1 12 0"/><path d="M16 5h5M19 3l2 2-2 2M21 12h-5M18 10l-2 2 2 2"/>',
    alert: '<path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17.2v.1"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M9 12l2 2 4-4"/>',
    megaphone: '<path d="M4 10v4a1 1 0 0 0 1 1h3l6 4V5L8 9H5a1 1 0 0 0-1 1z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    medal: '<path d="M8 3l2.5 6M16 3l-2.5 6"/><circle cx="12" cy="15" r="6"/><path d="M12 12.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M7.5 15l3.5-4 3 2.5 5-6"/>',
    repeat: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 4v4.7h-4.7"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.3M4 20v-4.7h4.7"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    download: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    chat: '<path d="M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3.5V16.5H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/>',
    heart: '<path d="M12 20s-7-4.6-9.2-8.4C1.1 8.3 2.7 5 6 5c2 0 3.2 1.2 4 2.4C10.8 6.2 12 5 14 5c3.3 0 4.9 3.3 3.2 6.6C19 15.4 12 20 12 20z"/>',
    link: '<path d="M9.5 14.5l5-5"/><path d="M8 11l-2 2a3.5 3.5 0 0 0 5 5l2-2"/><path d="M16 13l2-2a3.5 3.5 0 0 0-5-5l-2 2"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/>',
    send: '<path d="M21 4L3 11l6 2.5L12 20l3-6 6-10z"/><path d="M9 13.5L21 4"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/>',
    pin: '<path d="M9 4h6l-1 6 3 2.5V14H7v-1.5L10 10 9 4z"/><path d="M12 14v6"/>',
  };
  function icon(name, cls) {
    return `<svg class="ico${cls ? " " + cls : ""}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;
  }

  /* ---------- Progreso guardado ---------- */
  const n1 = (x) => Number(x).toFixed(1).replace(".", ",");
  const n2 = (x) => Number(x).toFixed(2).replace(".", ",");
  const count = (key) => { const d = store(key); return d && typeof d === "object" ? Object.keys(d).filter((k) => k[0] !== "_").length : 0; };
  /** Progreso de un recurso: { text (HTML corto), done, total } o null si no hay nada guardado. */
  function resourceProgress(r) {
    const p = r.progress; if (!p) return null;
    if (p.t === "autotest") {
      const best = p.topics.map((t) => store(p.prefix + t)).filter((x) => x != null);
      if (!best.length) return { text: "", done: 0, total: p.topics.length };
      const avg = best.reduce((a, b) => a + b, 0) / best.length;
      return { text: `<b>${best.length}</b> de ${p.topics.length} temas · media <b>${n1(avg)}</b>`, done: best.length, total: p.topics.length };
    }
    if (p.t === "hechos") { const n = count(p.key); return { text: n ? `<b>${n}</b> de ${p.total} hechos` : "", done: n, total: p.total }; }
    if (p.t === "estudio") {
      const d = store(p.key) || {}; const total = d._total || p.total || 0; const n = count(p.key);
      const v = p.visto && store(p.visto);
      const parts = [];
      if (total) parts.push(`<b>${n}</b> de ${total} apartados estudiados`);
      if (v && v.label) parts.push(`última parte: ${esc(v.label)}`);
      return { text: parts.join(" · "), done: n, total };
    }
    if (p.t === "best") { const b = store(p.key); return b == null ? null : { text: `mejor nota <b>${n1(b)}</b>` }; }
    if (p.t === "sim") { const b = store(p.key); return b == null ? null : { text: `mejor nota <b>${n2(b)}</b> / 4` }; }
    if (p.t === "text") { const v = store(p.key); return v ? { text: `${esc(p.label)}: ${esc(v)}` } : null; }
    if (p.t === "fliexam") {
      const cur = store("fli-exam-current");
      const bests = [0, 1, 2, 3, 4, 5].map((i) => store("fli-exam-best-" + i)).filter((x) => x != null);
      const parts = [];
      if (cur && !cur.done) parts.push("<b>examen en curso</b>");
      if (bests.length) parts.push(`mejor nota <b>${n2(Math.max(...bests))}</b>`);
      return parts.length ? { text: parts.join(" · ") } : null;
    }
    return null;
  }
  /** Progreso global de una asignatura: media de las fracciones de sus recursos medibles (0–100). */
  function subjectProgress(s) {
    const fr = s.resources.map(resourceProgress).filter((p) => p && p.total);
    if (!fr.length) return 0;
    return Math.round(fr.reduce((a, p) => a + Math.min(1, p.done / p.total), 0) / fr.length * 100);
  }
  function daysTo(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const t = new Date(y, m - 1, d), now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((t - now) / 86400000);
  }

  /* ---------- Tema claro / oscuro ---------- */
  const THEME_KEY = "app-theme";
  const RETRO_KEY = "app-retro";
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const retroOn = () => store(RETRO_KEY) === 1;
  /** El modo terminal va sobre el tema oscuro, sin tocar el tema que eligió el usuario. */
  function applyTheme(t) {
    const html = document.documentElement;
    if (retroOn()) { html.setAttribute("data-retro", ""); t = "dark"; } else html.removeAttribute("data-retro");
    if (t === "light" || t === "dark") html.setAttribute("data-theme", t);
    else html.removeAttribute("data-theme");
  }
  function setRetro(on) {
    store(RETRO_KEY, on ? 1 : null);
    applyTheme(store(THEME_KEY)); syncThemeButton();
    return retroOn();
  }
  function effective() {
    const t = document.documentElement.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return media && media.matches ? "dark" : "light";
  }
  function setTheme(t) { store(THEME_KEY, t || null); applyTheme(t); syncThemeButton(); }
  function toggleTheme() { setTheme(effective() === "dark" ? "light" : "dark"); }
  function syncThemeButton() {
    const b = document.getElementById("theme-toggle");
    if (!b) return;
    const dark = effective() === "dark";
    b.innerHTML = icon(dark ? "sun" : "moon");
    b.setAttribute("aria-label", dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    b.title = b.getAttribute("aria-label");
  }
  applyTheme(store(THEME_KEY));
  if (media && media.addEventListener) media.addEventListener("change", syncThemeButton);
  // Si el tema se cambia en otra pestaña, se aplica también aquí.
  window.addEventListener("storage", (e) => { if (e.key === THEME_KEY || e.key === RETRO_KEY) { applyTheme(store(THEME_KEY)); syncThemeButton(); } });

  /* ---------- Cuentas: hay que entrar o registrarse para usar la web ----------
     La cuenta activa está en «app-sesion» (la gestiona assets/js/cuentas.js). Sin ella, cualquier página
     manda a cuenta.html (que vuelve después a la página pedida). <html data-auth="off"> lo desactiva. */
  const SESION_KEY = "app-sesion";
  const enCuenta = /\/cuenta\.html$/.test(decodeURIComponent(location.pathname));
  const sinSesion = !store(SESION_KEY) && !enCuenta && ROOT_URL && document.documentElement.dataset.auth !== "off";
  if (sinSesion) {
    document.documentElement.style.visibility = "hidden";
    location.replace(ROOT_URL + "cuenta.html?volver=" + encodeURIComponent(location.href));
  }
  /** Progreso guardado de la cuenta: todo lo de las asignaturas, «continuar donde lo dejaste» y los cursos. */
  const esProgreso = (k) => /^(fli|fc|ip|gohp|amd|aed|eq)-|^app-(last|cursos)/.test(k);
  /** Suma puntos al ranking al terminar un test: { asig, tipo, aciertos, total }. Se guarda en una
      cola local y cuentas.js la envía (sirve también sin conexión: se manda más tarde). */
  function puntos(r) {
    if (r && r.total > 0) historial.anotar(r);
    const ses = store(SESION_KEY);
    if (!ses || !r || !(r.total > 0)) return;
    const ev = { u: ses.id, evento: Date.now().toString(36) + Math.random().toString(36).slice(2, 10), asig: r.asig, tipo: r.tipo,
      aciertos: Math.max(0, Math.round(r.aciertos)), total: Math.round(r.total), t: Date.now() };
    const cola = store("app-pend") || [];
    cola.push(ev); store("app-pend", cola.slice(-100));
    if (window.Cuentas) window.Cuentas.enviar();
  }

  /* ---------- Historial de tests (para las estadísticas de «Tu cuenta») ----------
     «<asig>-hist»: los últimos 400 tests terminados de cada asignatura: { d: fecha (ms), tipo, tema, ok, n, nota }.
     Lo apunta App.puntos, que llaman todos los tests al terminar (va con el progreso de la cuenta). */
  const historial = Object.freeze({
    anotar(r) {
      if (!r.asig) return;
      const k = r.asig + "-hist", h = store(k) || [];
      const nota = typeof r.nota === "number" && isFinite(r.nota) ? Math.round(r.nota * 100) / 100 : Math.round(r.aciertos / r.total * 1000) / 100;
      h.push({ d: Date.now(), tipo: r.tipo || "test", tema: r.tema != null ? String(r.tema) : "", ok: Math.round(r.aciertos), n: Math.round(r.total), nota });
      store(k, h.slice(-400));
    },
    de: (asig) => (store(asig + "-hist") || []).filter((x) => x && x.d && x.n > 0)
  });

  /* ---------- Repaso de fallos (repetición espaciada, en todos los autotests) ----------
     «<asig>-repaso»: { <huella de la pregunta>: { b: caja 0–4, d: cuándo toca (ms), f: veces fallada, t: tema }, _dom: dominadas }.
     Fallar (o dejar en blanco) una pregunta la mete en la caja 0, para repasarla ya. Acertarla cuando le toca la sube
     de caja y la vuelve a programar dentro de 1, 3, 7 y 14 días; acertada en la caja 4 se da por dominada y sale del
     repaso. La huella es del enunciado, así que no cambia aunque se reordene el banco. */
  const DIAS_CAJA = [1, 3, 7, 14];
  const DIA = 86400000;
  function huella(texto) { let h = 5381; const t = String(texto || ""); for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + t.length.toString(36); }
  /** Medianoche de hoy + n días: lo que «toca» un día se puede repasar desde primera hora. */
  const diaMas = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() + n * DIA; };
  const repaso = Object.freeze({
    huella,
    mazo: (asig) => store(asig + "-repaso") || {},
    /** Apunta una respuesta: ok = acertada. item = la pregunta del banco ({ q, t }). */
    anotar(asig, item, ok) {
      if (!asig || !item || !item.q) return;
      const k = asig + "-repaso", m = store(k) || {}, h = huella(item.q), e = m[h], ahora = Date.now();
      if (!ok) m[h] = { b: 0, d: ahora, f: ((e && e.f) || 0) + 1, t: item.t };
      else if (e && e.d <= ahora) {
        if (e.b >= DIAS_CAJA.length) { delete m[h]; m._dom = (m._dom || 0) + 1; }
        else m[h] = { b: e.b + 1, d: diaMas(DIAS_CAJA[e.b]), f: e.f || 1, t: e.t != null ? e.t : item.t };
      } else return;
      store(k, m);
    },
    /** Huellas de las preguntas que tocan ahora, de la más atrasada a la más reciente. */
    pendientes(asig) {
      const m = store(asig + "-repaso") || {}, ahora = Date.now();
      return Object.keys(m).filter((h) => h[0] !== "_" && m[h].d <= ahora).sort((a, b) => m[a].d - m[b].d);
    },
    /** { total, hoy, cajas: [n0…n4], proximo (ms | null), dominadas, porTema: { t: n } } */
    resumen(asig) {
      const m = store(asig + "-repaso") || {}, ahora = Date.now(), ks = Object.keys(m).filter((h) => h[0] !== "_");
      const cajas = [0, 0, 0, 0, 0], porTema = {};
      let hoy = 0, proximo = null;
      ks.forEach((h) => { const e = m[h]; cajas[Math.min(4, e.b | 0)]++; porTema[e.t] = (porTema[e.t] || 0) + 1; if (e.d <= ahora) hoy++; else if (proximo == null || e.d < proximo) proximo = e.d; });
      return { total: ks.length, hoy, cajas, proximo, dominadas: m._dom || 0, porTema };
    }
  });

  /* ---------- Recurso actual ---------- */
  function abs(root, href) { try { return new URL(root + href, location.href); } catch (e) { return null; } }
  function samePath(a, b) { return decodeURIComponent(a.pathname).replace(/\/index\.html$/, "/") === decodeURIComponent(b.pathname).replace(/\/index\.html$/, "/"); }
  function findCurrent(subject, root) {
    if (!subject) return null;
    const here = new URL(location.href);
    const hits = subject.resources.filter((r) => { const u = abs(root, r.href); return u && samePath(u, here); });
    return hits.find((r) => r.href.indexOf("#") < 0) || hits[0] || null;
  }

  /* ---------- Navegación ----------
     · Barra superior: miga de pan (⌂ / Asignatura / Sección / Página), pestañas de sección (escritorio) y tema.
     · Fila de recursos de la sección actual (chips con desplazamiento horizontal).
     · En el móvil, barra inferior fija con Inicio · Teoría · Prácticas · Examen (al alcance del pulgar). */
  function buildNav() {
    const body = document.body;
    if (!body || sinSesion || body.dataset.nav === "off" || document.querySelector(".site-nav")) return;
    const root = body.dataset.root || "";
    const subject = SUBJECTS.find((s) => s.id === body.dataset.subject);
    const isHub = body.hasAttribute("data-hub");
    const cur = findCurrent(subject, root);
    const area = cur ? cur.sec : "";
    const title = body.dataset.title || (cur ? cur.title : "");
    // «Continuar donde lo dejaste» (portada y portada de la asignatura).
    if (subject && cur) { const v = { s: subject.id, r: cur.id, at: Date.now() }; store("app-last", v); store("app-last-" + subject.id, v); }

    const nav = document.createElement("header");
    nav.className = "site-nav";
    const secOf = (id) => SECTIONS.find((x) => x.id === id);
    let crumbs = `<a class="site-nav__home" href="${root}index.html" title="Todas las asignaturas">${icon("home")}<span class="site-nav__label">Asignaturas</span></a>`;
    if (subject) {
      crumbs += `<span class="site-nav__sep" aria-hidden="true">/</span><a class="site-nav__subject" href="${root}${subject.home}" title="${esc(subject.name)}">${esc(subject.short)}</a>`;
      if (area) crumbs += `<span class="site-nav__sep site-nav__d" aria-hidden="true">/</span><a class="site-nav__sec site-nav__d" href="${root}${subject.home}#${area}">${esc(secOf(area).label)}</a>`;
      if (title && !isHub) crumbs += `<span class="site-nav__sep" aria-hidden="true">/</span><span class="site-nav__page" aria-current="page">${esc(title)}</span>`;
    }
    const tabs = subject ? `<nav class="site-nav__tabs" aria-label="Secciones de ${esc(subject.short)}">${SECTIONS.map((s) =>
      `<a href="${root}${subject.home}#${s.id}" data-sec="${s.id}"${s.id === area ? ' aria-current="true"' : ""}>${esc(s.label)}</a>`).join("")}</nav>` : "";

    // Chips con los recursos de la sección actual (no en la portada de la asignatura, que ya los lista todos).
    let chips = "";
    if (subject && area && !isHub) {
      const list = subject.resources.filter((r) => r.sec === area);
      if (list.length > 1) {
        chips = `<nav class="site-nav__res" aria-label="${esc(secOf(area).label)} de ${esc(subject.short)}"><div class="site-nav__res-in">${list.map((r) =>
          `<a href="${root}${r.href}"${r === cur ? ' aria-current="page"' : ""}>${icon(KINDS[r.kind].icon)}<span>${esc(r.title)}</span></a>`).join("")}</div></nav>`;
      }
    }
    // Ranking y cuenta (inicial del usuario), junto al botón del tema.
    // Reportar un error (sólo con cuenta: los perfiles locales no pueden escribir en el servidor) y, para los
    // administradores, el panel (cuentas.js lo muestra u oculta al comprobar el rol en el token).
    const ses = store(SESION_KEY);
    const esAdmin = Boolean(ses && store("app-admin") === ses.id);
    const acct = ses ? `<a class="site-nav__icon" href="${root}ranking.html" title="Ranking global" aria-label="Ranking global">${icon("trophy")}</a>` +
      (ses.local ? "" : `<button type="button" class="site-nav__icon" data-reportar title="Reportar un error" aria-label="Reportar un error">${icon("alert")}</button>`) +
      `<a class="site-nav__icon site-nav__admin" href="${root}admin.html" title="Panel de administración" aria-label="Panel de administración"${esAdmin ? "" : " hidden"}>${icon("shield")}</a>` +
      `<a class="site-nav__acct" href="${root}cuenta.html" title="Tu cuenta: ${esc(ses.nombre)}" aria-label="Tu cuenta: ${esc(ses.nombre)}">${esc((ses.nombre || "?").charAt(0).toUpperCase())}</a>` : "";
    nav.innerHTML = `<div class="site-nav__inner"><div class="site-nav__crumbs">${crumbs}</div>${tabs}${acct}<button type="button" class="site-nav__theme" id="theme-toggle"></button></div>${chips}`;
    // La barra va justo después del enlace «Saltar al contenido», que debe ser lo primero al tabular.
    const skip = body.querySelector(":scope > .skip-link");
    body.insertBefore(nav, skip ? skip.nextSibling : body.firstChild);
    const curChip = nav.querySelector('.site-nav__res a[aria-current="page"]');
    if (curChip && curChip.scrollIntoView) { const box = curChip.parentElement; box.scrollLeft = curChip.offsetLeft - 16; }

    if (subject) {
      const bar = document.createElement("nav");
      bar.className = "tabbar";
      bar.setAttribute("aria-label", "Secciones de " + subject.short);
      bar.innerHTML = `<a href="${root}${subject.home}" data-sec=""${isHub && !location.hash ? ' aria-current="true"' : ""}>${icon("grid")}<span>${esc(subject.short)}</span></a>` +
        SECTIONS.map((s) => `<a href="${root}${subject.home}#${s.id}" data-sec="${s.id}"${s.id === area ? ' aria-current="true"' : ""}>${icon(s.icon)}<span>${esc(s.label)}</span></a>`).join("");
      body.appendChild(bar);
      body.classList.add("has-tabbar");
      // En la portada de la asignatura, la pestaña activa sigue al ancla (#teoria, #practicas…).
      if (isHub) {
        const sync = () => {
          const h0 = location.hash.slice(1), h = SECTIONS.some((s) => s.id === h0) ? h0 : "";
          document.querySelectorAll(".tabbar a, .site-nav__tabs a").forEach((a) => {
            if ((a.dataset.sec || "") === h) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
          });
        };
        window.addEventListener("hashchange", sync); sync();
      }
    }
    body.classList.add("has-site-nav");
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
    syncThemeButton();
    pintarAviso();
    if (subject) botonVolver(root + subject.home + (area ? "#" + area : ""), area ? secOf(area).label + " de " + subject.short : subject.short);
  }

  /* ---------- Volver y subir ----------
     · En las páginas con índice lateral, la cabecera del índice («GOHP · Teoría») se queda a la vista al
       bajar (fija arriba en el móvil, columna fija en el escritorio). Su símbolo pasa a ser un botón «←»
       que vuelve a la sección de la asignatura, como la miga de pan, sin tener que subir hasta arriba.
     · En todas las páginas, botón flotante «↑» para subir arriba; sale al bajar algo más de media pantalla. */
  function botonVolver(href, destino) {
    const brand = document.querySelector(".side-brand");
    if (!brand || brand.querySelector(".side-back")) return;
    const a = document.createElement("a");
    a.className = "side-back";
    a.href = href;
    a.title = "Volver a " + destino;
    a.setAttribute("aria-label", a.title);
    a.innerHTML = icon("back");
    const sym = brand.querySelector(".sym");
    if (sym) sym.replaceWith(a); else brand.insertBefore(a, brand.firstChild);
  }
  function botonSubir() {
    const body = document.body;
    if (!body || sinSesion || document.querySelector(".to-top")) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "to-top";
    b.title = "Subir arriba";
    b.setAttribute("aria-label", "Subir arriba");
    b.innerHTML = icon("up");
    b.addEventListener("click", () => {
      const suave = !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
      window.scrollTo({ top: 0, behavior: suave ? "smooth" : "auto" });
    });
    body.appendChild(b);
    // Sale en cuanto se ha bajado un poco (media pantalla, como mucho 480 px), también en páginas medianas.
    let pendiente = false;
    const mirar = () => { pendiente = false; b.classList.toggle("is-on", window.scrollY > Math.min(window.innerHeight * 0.6, 480)); };
    window.addEventListener("scroll", () => { if (!pendiente) { pendiente = true; requestAnimationFrame(mirar); } }, { passive: true });
    mirar();
  }

  /* ---------- Aviso para toda la web (lo pone un administrador desde el panel) ----------
     Va debajo de la barra superior hasta la fecha de «avisoHasta» (incluida). Cada usuario puede cerrarlo:
     se recuerda por su «avisoId», así que un aviso nuevo vuelve a salir. */
  function enlaceAviso(u) {
    u = String(u || "").trim();
    if (!u || /^(javascript|data|vbscript):/i.test(u)) return "";
    return /^(https?:\/\/|\/|#)/i.test(u) ? u : ROOT_URL + u;
  }
  function pintarAviso() {
    const nav = document.querySelector(".site-nav");
    if (!nav) return;
    const c = CONFIG;
    let el = document.querySelector(".site-aviso");
    // Sólo en la portada del sitio: en el resto de páginas (guías, tests…) quitaría sitio al contenido.
    const enPortada = !!document.querySelector("main.portal");
    const vigente = enPortada && c.aviso && (!c.avisoHasta || daysTo(c.avisoHasta) >= 0) && store(AVISO_VISTO) !== (c.avisoId || c.aviso);
    if (!vigente) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.setAttribute("role", "status"); nav.insertAdjacentElement("afterend", el); }
    el.className = "site-aviso" + (c.avisoTipo === "importante" ? " is-importante" : "");
    const href = enlaceAviso(c.avisoEnlace);
    el.innerHTML = `<div class="site-aviso__in">${icon(c.avisoTipo === "importante" ? "alert" : "megaphone")}<p>${esc(c.aviso)}` +
      `${href ? ` <a href="${esc(href)}">${esc(c.avisoTextoEnlace || "Más información")}</a>` : ""}</p>` +
      `<button type="button" class="site-aviso__mas" aria-expanded="false" hidden>Ver más</button>` +
      `<button type="button" class="site-aviso__x" aria-label="Ocultar este aviso" title="Ocultar este aviso">×</button></div>`;
    el.querySelector(".site-aviso__x").onclick = () => { store(AVISO_VISTO, c.avisoId || c.aviso); el.remove(); };
    // Una sola línea; si no cabe, «Ver más» lo despliega.
    const p = el.querySelector("p"), mas = el.querySelector(".site-aviso__mas");
    const medir = () => { if (!el.classList.contains("is-open")) mas.hidden = !(p.scrollHeight > p.clientHeight + 2); };
    medir();
    if (!pintarAviso.r) { pintarAviso.r = true; window.addEventListener("resize", () => { const m = document.querySelector(".site-aviso"); if (m && m._medir) m._medir(); }); }
    el._medir = medir;
    mas.onclick = () => {
      const abierto = el.classList.toggle("is-open");
      mas.setAttribute("aria-expanded", String(abierto));
      mas.textContent = abierto ? "Ver menos" : "Ver más";
    };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { buildNav(); botonSubir(); });
  else { buildNav(); botonSubir(); }

  /* ---------- Asistente de IA (panel paralelo; ver assets/js/asistente.js) ---------- */
  (function cargarAsistente() {
    const src = CORE_SRC || "";
    const base = src.replace(/js\/core\.js(\?.*)?$/, "");
    if (!base || base === src) return;
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = base + "css/asistente.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = base + "js/asistente.js"; js.defer = true;
    document.head.appendChild(js);
    // Cuentas: sincroniza el progreso con la cuenta y envía los puntos (ver assets/js/cuentas.js)
    const ccss = document.createElement("link");
    ccss.rel = "stylesheet"; ccss.href = base + "css/cuentas.css";
    document.head.appendChild(ccss);
    const cjs = document.createElement("script");
    cjs.src = base + "js/cuentas.js"; cjs.defer = true;
    document.head.appendChild(cjs);
    // Insignias: dibujo, catálogo y las que se ganan solas (ver assets/js/insignias.js)
    const icss = document.createElement("link");
    icss.rel = "stylesheet"; icss.href = base + "css/insignias.css";
    document.head.appendChild(icss);
    const ijs = document.createElement("script");
    ijs.src = base + "js/insignias.js"; ijs.defer = true;
    document.head.appendChild(ijs);
    // Botones de descarga en PDF (ver assets/js/pdf.js y scripts/pdf/generar.js)
    const pcss = document.createElement("link");
    pcss.rel = "stylesheet"; pcss.href = base + "css/pdf.css";
    document.head.appendChild(pcss);
    const pjs = document.createElement("script");
    pjs.src = base + "js/pdf.js"; pjs.defer = true;
    document.head.appendChild(pjs);
    // Reportar un error (botón de la barra superior; ver assets/js/reportes.js)
    const rcss = document.createElement("link");
    rcss.rel = "stylesheet"; rcss.href = base + "css/reportes.css";
    document.head.appendChild(rcss);
    const rjs = document.createElement("script");
    rjs.src = base + "js/reportes.js"; rjs.defer = true;
    document.head.appendChild(rjs);
    // Modo terminal «de castigo» al cerrar el aviso (ver assets/js/retro.js). Si está activo, su hoja bloquea el
    // primer pintado para que la página no aparezca un instante con su aspecto normal.
    const tcss = document.createElement("link");
    tcss.rel = "stylesheet"; tcss.href = base + "css/retro.css";
    if (retroOn()) tcss.setAttribute("blocking", "render");
    document.head.appendChild(tcss);
    const tjs = document.createElement("script");
    tjs.src = base + "js/retro.js"; tjs.defer = true;
    document.head.appendChild(tjs);
    // Web instalable (PWA), uso sin conexión y notificaciones push (ver assets/js/pwa.js y sw.js)
    const wjs = document.createElement("script");
    wjs.src = base + "js/pwa.js"; wjs.defer = true;
    document.head.appendChild(wjs);
  })();

  window.App = Object.freeze({
    SUBJECTS, SECTIONS, KINDS, store, session, shuffle, esc, icon, daysTo, puntos, esProgreso, repaso, historial, cursos,
    ROOT: ROOT_URL, sesion: () => store(SESION_KEY), AULA_VIRTUAL,
    entregas: Object.freeze({ codigo: () => ENTREGAS_CODIGO.map((e) => Object.assign({}, e)), codigoDe: entregasCodigoDe }),
    config: Object.freeze({ get: () => CONFIG, actualizar: actualizarConfig, examenesCodigo: () => JSON.parse(JSON.stringify(EXAMENES_CODIGO)) }),
    progress: Object.freeze({ resource: resourceProgress, subject: subjectProgress }),
    theme: Object.freeze({ get: effective, set: setTheme, toggle: toggleTheme }),
    retro: Object.freeze({ get: retroOn, set: setRetro, toggle: () => setRetro(!retroOn()) })
  });
})();
