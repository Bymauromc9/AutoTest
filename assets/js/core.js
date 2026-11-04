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
 *   App.puntos     suma puntos al ranking al terminar un test ({ asig, tipo, aciertos, total }; ver cuentas.js)
 *   App.sesion()   cuenta activa ({ id, nombre, token, local }) o null
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
     Cada recurso: id, sec (teoria|practicas|examen), group (opcional, p. ej. L0/L1), kind (App.KINDS), title, desc,
     href (desde la raíz) y progress (qué progreso guardado mostrar; ver App.progress.resource). */
  const SUBJECTS = [
    {
      id: "fli",
      short: "FLI",
      name: "Fundamentos Lógicos de la Informática",
      desc: "Lógica proposicional (L0) y lógica de predicados (L1).",
      home: "fli/index.html",
      exam: { date: "2026-12-04", label: "4 de diciembre de 2026", href: "fli/teoria/examenes.html", cta: "practica con el parcial real y los simulacros" },
      intro: "La asignatura tiene dos bloques: lógica proposicional (L0, temas 1–4 y sesiones 1–5) y lógica de predicados (L1, sesiones 6–12). Aquí tienes la teoría, las prácticas y la preparación del examen de los dos.",
      groups: { L0: "Lógica proposicional", L1: "Lógica de predicados" },
      sub: { teoria: "Temas 1–4", practicas: "Sesiones 1–12", examen: "Parcial y simulacros" },
      empty: { "teoria/L1": "Todavía no hay material de teoría de L1. Mientras tanto, la guía de prácticas de L1 explica toda la base teórica que se usa en las sesiones." },
      resources: [
        { id: "chuletas", sec: "teoria", group: "L0", kind: "chuleta", title: "Chuletas visuales", href: "fli/teoria/chuletas.html",
          desc: "Tablas de verdad, del castellano a las conectivas, equivalencias, reglas de inferencia y clasificación, con tarjetas para memorizar." },
        { id: "autotest", sec: "teoria", group: "L0", kind: "autotest", title: "Autotest por temas", href: "fli/teoria/autotest.html",
          desc: "Tests de cada tema con corrección inmediata y la explicación de cada respuesta.", progress: { t: "autotest", prefix: "fli-best-", topics: [1, 2, 3, 4] } },
        { id: "equivalencias", sec: "teoria", group: "L0", kind: "drill", title: "Equivalencias de L0", href: "fli/teoria/equivalencias.html",
          desc: "Test sólo con fórmulas: elige la equivalente o decide si dos fórmulas lo son. Si fallas, contraejemplo y tabla de verdad.", progress: { t: "best", key: "eq-best" } },
        { id: "ejercicios-t", sec: "teoria", group: "L0", kind: "ejercicios", title: "Ejercicios por tema", href: "fli/teoria/ejercicios.html",
          desc: "94 ejercicios de teoría separados por tópico, con bloque integrador en cada tema y todas las soluciones.", progress: { t: "hechos", key: "fli-ejercicios-hechos", total: 94 } },
        { id: "guia-p", sec: "practicas", group: "L0", kind: "guia", title: "Guía de prácticas", href: "fli/practicas/guia.html",
          desc: "Sintaxis, formalización, tablas de verdad, deducción natural y tableaux, con el analizador de fórmulas y el comprobador de razonamientos.", progress: { t: "text", key: "fli-gpart", label: "última parte vista" } },
        { id: "ejercicios-p", sec: "practicas", group: "L0", kind: "ejercicios", title: "Ejercicios de prácticas", href: "fli/practicas/ejercicios.html",
          desc: "Sesiones 1 a 5: formalización y deducción natural resueltas y propuestas, y los ejemplos de los apuntes. 83 ejercicios.", progress: { t: "hechos", key: "fli-practicas-hechos", total: 83 } },
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
          desc: "Más de 500 preguntas por temas con corrección inmediata, la explicación de cada respuesta y tandas nuevas sin repetir.", progress: { t: "autotest", prefix: "fc-best-", topics: [1, 2, 3, 4, 5, 6] } },
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
      short: "IP",
      name: "Introducción a la Programación",
      desc: "Algoritmos con la notación de clase y su traducción a C++.",
      home: "ip/index.html",
      intro: "Cinco temas de teoría (algoritmos, léxico y casos, acciones y funciones, iteración y secuencias) con la notación algorítmica de clase, y seis prácticas en C++ con Geany y g++.",
      exams: [
        { date: "2026-11-20", name: "2.º parcial", label: "20 de noviembre de 2026 · 2.º parcial", href: "ip/teoria/autotest.html", cta: "repasa con el autotest por temas" },
        { date: "2026-12-18", name: "Examen final", label: "18 de diciembre de 2026 · examen final", href: "ip/teoria/autotest.html#test-G", cta: "practica con el test general" }
      ],
      sub: { teoria: "Temas 0–4", practicas: "Prácticas 1–6", examen: "Repaso final" },
      empty: { "examen": "Todavía no hay exámenes de convocatorias anteriores de IP. Cuando estén, aparecerán aquí con su solución." },
      resources: [
        { id: "guia-t", sec: "teoria", kind: "guia", title: "Guía de teoría", href: "ip/teoria/guia.html",
          desc: "Los cinco temas con la notación SP y su traducción a C++: tipos, casos, acciones y funciones, iteraciones y esquemas de recorrido y búsqueda.", progress: { t: "estudio", key: "ip-teoria-estudio", visto: "ip-teoria-visto", total: 35 } },
        { id: "chuleta", sec: "teoria", kind: "chuleta", title: "Chuletas: SP → C++ y esquemas", href: "ip/teoria/guia.html#a-1",
          desc: "Todas las equivalencias entre la notación SP y C++ en una tabla, y los esquemas de recorrido y búsqueda." },
        { id: "autotest", sec: "teoria", kind: "autotest", title: "Autotest por temas", href: "ip/teoria/autotest.html",
          desc: "170 preguntas por tema y un bloque del C++ de prácticas, con corrección inmediata y explicación.", progress: { t: "autotest", prefix: "ip-best-", topics: [0, 1, 2, 3, 4, 5] } },
        { id: "simulador", sec: "teoria", kind: "simulador", title: "Simulador de la máquina secuencial", href: "ip/teoria/guia.html#t4-8",
          desc: "Ejecuta paso a paso un recorrido, una búsqueda y la meseta mayor: parte izquierda, elemento actual, variables e invariante." },
        { id: "guia-p", sec: "practicas", kind: "guia", title: "Guía de prácticas", href: "ip/practicas/guia.html",
          desc: "Geany y g++, léxico y estados, casos, struct y subprogramas, iteraciones y secuencias: 44 ejercicios con el programa y una ejecución real.", progress: { t: "hechos", key: "ip-practicas-hechos", total: 44 } },
        { id: "general", sec: "examen", kind: "general", title: "Test general", href: "ip/teoria/autotest.html#test-G",
          desc: "30 preguntas de todos los temas y del C++ de prácticas, repartidas según su peso.", progress: { t: "best", key: "ip-best-G", scale: 10 } }
      ]
    }
  ];

  /* Asignaturas con varios exámenes (parciales y final, en «exams»): «exam» es el próximo que queda y
     «examsLeft» los que vienen después. Las que tienen uno solo lo ponen directamente en «exam». */
  SUBJECTS.forEach((s) => {
    if (!Array.isArray(s.exams) || !s.exams.length) return;
    const list = s.exams.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const i = list.findIndex((e) => daysTo(e.date) >= 0);
    s.exam = i >= 0 ? list[i] : list[list.length - 1];
    s.examsLeft = i >= 0 ? list.slice(i + 1) : [];
  });

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
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z"/>',
    user: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    logout: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
    swapuser: '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 19.5a6 6 0 0 1 12 0"/><path d="M16 5h5M19 3l2 2-2 2M21 12h-5M18 10l-2 2 2 2"/>'
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
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
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
  window.addEventListener("storage", (e) => { if (e.key === THEME_KEY) { applyTheme(store(THEME_KEY)); syncThemeButton(); } });

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
  /** Progreso guardado de la cuenta: todo lo de las asignaturas y «continuar donde lo dejaste». */
  const esProgreso = (k) => /^(fli|fc|ip|eq)-|^app-last/.test(k);
  /** Suma puntos al ranking al terminar un test: { asig, tipo, aciertos, total }. Se guarda en una
      cola local y cuentas.js la envía (sirve también sin conexión: se manda más tarde). */
  function puntos(r) {
    const ses = store(SESION_KEY);
    if (!ses || !r || !(r.total > 0)) return;
    const ev = { u: ses.id, evento: Date.now().toString(36) + Math.random().toString(36).slice(2, 10), asig: r.asig, tipo: r.tipo,
      aciertos: Math.max(0, Math.round(r.aciertos)), total: Math.round(r.total), t: Date.now() };
    const cola = store("app-pend") || [];
    cola.push(ev); store("app-pend", cola.slice(-100));
    if (window.Cuentas) window.Cuentas.enviar();
  }

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
    const ses = store(SESION_KEY);
    const acct = ses ? `<a class="site-nav__icon" href="${root}ranking.html" title="Ranking global" aria-label="Ranking global">${icon("trophy")}</a>` +
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
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildNav);
  else buildNav();

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
    // Botones de descarga en PDF (ver assets/js/pdf.js y scripts/pdf/generar.js)
    const pcss = document.createElement("link");
    pcss.rel = "stylesheet"; pcss.href = base + "css/pdf.css";
    document.head.appendChild(pcss);
    const pjs = document.createElement("script");
    pjs.src = base + "js/pdf.js"; pjs.defer = true;
    document.head.appendChild(pjs);
  })();

  window.App = Object.freeze({
    SUBJECTS, SECTIONS, KINDS, store, session, shuffle, esc, icon, daysTo, puntos, esProgreso,
    ROOT: ROOT_URL, sesion: () => store(SESION_KEY),
    progress: Object.freeze({ resource: resourceProgress, subject: subjectProgress }),
    theme: Object.freeze({ get: effective, set: setTheme, toggle: toggleTheme })
  });
})();
