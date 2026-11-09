# Material de estudio

Sitio web estático con material de estudio por asignaturas. No necesita instalación ni servidor:
abre `index.html` con doble clic. También funciona servido desde cualquier hosting estático
(GitHub Pages, Netlify…) o con `python3 -m http.server` desde esta carpeta.

## Estructura

```
index.html                  Portada: tu cuenta y el top 5, cuenta atrás de los exámenes, «continuar» y una tarjeta por asignatura
cuenta.html                 Entrar, crear cuenta o elegir una de las cuentas usadas en el dispositivo; «Tu cuenta»
ranking.html                Leaderboard global: general, esta semana y por asignatura, con el reto semanal
perfil.html                 Perfil público de cada cuenta (?u=<uid> o ?n=<usuario>): puntos, puesto y vitrina de insignias
admin.html                  Panel de administración (sólo cuentas administradoras): usuarios, aviso, exámenes y reportes
assets/
  css/base.css              Tokens de diseño (colores, tipografías, tema oscuro) y componentes genéricos
  css/nav.css               Navegación común: barra superior, chips de la sección y barra inferior en el móvil
  css/hub.css               Portada de cada asignatura (resumen de progreso, secciones, tarjetas por tipo)
  css/portal.css            Estilos de la portada
  js/core.js                Registro de asignaturas y recursos, iconos, progreso, tema, almacenamiento y navegación
  js/hub.js                 Pinta la portada de una asignatura a partir del registro
  js/portal.js              Pinta las tarjetas de la portada a partir del registro
  js/asistente.js           Asistente de IA en un panel paralelo (lo carga core.js en todas las páginas)
  js/cuentas.js             Cuentas con Firebase: progreso de cada cuenta, sincronización y puntos (lo carga core.js)
  js/acceso.js · ranking.js Páginas cuenta.html y ranking.html
  js/perfil.js              Perfil público (perfil.html); en el tuyo eliges las destacadas de tu vitrina
  js/insignias.js           Insignias: dibujo (SVG), catálogo y las automáticas que se reclaman solas (lo carga core.js)
  js/estadisticas.js        «Tus estadísticas» en cuenta.html: evolución de notas, temas, actividad y racha
  js/admin.js               Panel de administración (admin.html)
  js/reportes.js            «Reportar un error» de la barra superior (lo carga core.js)
  js/retro.js               Broma: al cerrar el aviso de los administradores la web pasa a modo terminal;
                            se quita con Espacio dos veces (en el móvil, dos toques)
  css/cuentas.css           Acceso, ranking, avisos de puntos y bloque de cuenta de la portada
  css/insignias.css         Insignias, vitrina, perfil público y estadísticas
  css/asistente.css         Estilos del panel del asistente
  css/admin.css             Estilos del panel de administración
  css/reportes.css          Diálogo «Reportar un error» (autosuficiente, como nav.css)
  css/retro.css             Estilos del modo terminal (fósforo verde sobre cualquier página)
  css/guia.css              Guías con índice lateral (FC, IP, GOHP, AMD y L1): estructura, temas, cajas, ejercicios,
                            «Más a fondo» plegable, subrayador y piezas para los diagramas (.dg)
  js/guia.js                Guías con índice lateral: «Hecho», progreso, índice, plegables, «Marcar como
                            estudiado», pestaña y mapa de cada tema y leyenda
api/
  chat.js                   Función de Vercel que llama a la IA (la clave va en una variable de entorno)
vercel.json                 Tiempo máximo de la función del asistente
firestore.rules             Reglas de seguridad de Firestore (cuentas, progreso, ranking, configuración y reportes)
  img/favicon.svg
fli/                        Fundamentos Lógicos de la Informática
  index.html                Portada de FLI (la genera assets/js/hub.js): Teoría, Prácticas y Examen, con L0 y L1 dentro
  teoria/
    autotest.html           Tests por tema y test general
    examenes.html           Parcial real 23-24 y simulacros, con corrección
    chuletas.html           Chuletas visuales (enlazables por pestaña: chuletas.html#nexos)
    equivalencias.html      Test de equivalencias de L0
    ejercicios.html         94 ejercicios de teoría con soluciones
  practicas/
    guia.html               Guía de prácticas con analizador y comprobador (enlazable: guia.html#parte-4)
    ejercicios.html         83 ejercicios de prácticas con soluciones
  l1/                       Lógica de predicados (L1). La teoría aún no tiene páginas.
    practicas/
      guia.html             Guía de prácticas de L1 explicada parte por parte (enlazable: guia.html#g6)
      clase.html            Ejercicios de clase 12–32 (sesiones 6–12) resueltos y explicados
      resueltos.html        Resueltos oficiales explicados y propuestos resueltos
      niveles.html          Nivel 1 (resumen) y niveles 2–5 con todos los ejercicios por dificultad
    css/l1.css              Estilos propios de las páginas de ejercicios de L1 (después de fli/css/ejercicios.css);
                            la guía de L1 usa assets/css/guia.css y assets/js/guia.js
    js/l1.js                Resoluciones plegables de las páginas de ejercicios de L1
  css/
    fli.css                 Componentes de FLI (fórmulas, autotest, chuletas, exámenes, guía)
    ejercicios.css          Páginas de ejercicios con índice lateral
    equivalencias.css       Test de equivalencias
  js/
    formulas.js             Utilidades compartidas: colorear conectivas, fórmulas, árboles de tableaux
    logic.js                Motor de lógica proposicional (análisis, evaluación, subfórmulas)
    autotest.js · examenes.js · chuletas.js · guia.js · equivalencias.js · ejercicios.js
    data/
      banco.js              Banco de preguntas del autotest
      examenes.js           Exámenes completos
      chuletas.js           Contenido de las chuletas y tarjetas
fc/                         Fundamentos de Computadores (temas 1–6)
  index.html                Portada de FC (la genera assets/js/hub.js)
  teoria/
    guia.html               Guía de teoría de los seis temas y formulario (enlazable: guia.html#t3-2),
                            con «Marcar como estudiado» en cada apartado
    chuleta.html            Fórmulas, conversión, Linux, ensamblador, redes y errores frecuentes
    autotest.html           Tests por tema (519 preguntas, 253 de ellas de exámenes) y test general (#test-G)
  practicas/
    guia.html               Boletines 1–6 explicados, 43 ejercicios resueltos y dos herramientas
                            (mini-okteta en #p2-3 y calculadora de red en #p6-2)
    herramientas.html       Todas las calculadoras: rendimiento, mini-okteta, bases, C2 con pasos, PPM,
                            Karnaugh, chmod y red IP (enlazables: herramientas.html#h-karnaugh)
  examen/
    guia.html               Cómo es el examen, por dónde empezar y 9 problemas de convocatorias resueltos
    simulacro.html          Simulacro del test: 40 preguntas x:1, reparto 5/7/7/7/7/7, reloj y penalización oficial
  css/
    fc.css                  Componentes del autotest y del simulacro
    guia.css                Añadidos de FC a assets/css/guia.css: mapas de Karnaugh y herramientas
  js/
    util.js                 FC.fmt y FC.LETTERS
    autotest.js · herramientas.js
    simulacro.js            Simulacro del test con las reglas del examen real
    calculadoras.js         Calculadoras de la página de herramientas (salvo mini-okteta y red IP)
    data/banco.js           Banco de preguntas (x:1 = de examen, tres opciones, sin barajar opciones)
  img/                      Figuras de los apuntes (buses, placas base de la tarea 1)
ip/                         Introducción a la Programación (temas 0–4 y prácticas 1–6)
  index.html                Portada de IP (la genera assets/js/hub.js)
  teoria/
    guia.html               Guía de teoría de los temas 0–4, simulador de la máquina secuencial (#t4-8)
                            y anexos: SP → C++ (#a-1), esquemas (#a-2) y códigos de Wooclap (#a-3)
    autotest.html           Tests de cada tema, del C++ de prácticas (170 preguntas) y test general
  practicas/
    guia.html               Prácticas 1–6 explicadas con 44 ejercicios resueltos (SP, C++ y ejecución real)
  css/
    guia.css                Añadidos de IP a assets/css/guia.css: resaltado de código y simulador
    ip.css                  Componentes del autotest
  js/
    util.js                 IP.fmt y IP.LETTERS
    autotest.js
    resaltado.js            Resaltado de C++ y de la notación SP (el resto de la guía es assets/js/guia.js)
    maquina.js              Simulador de la máquina secuencial (primer modelo)
    data/banco.js           Banco de preguntas del autotest (IP.ORDER: temas 0–4 y bloque 5 = C++)
gohp/                       Gestión de Organizaciones y Habilidades Profesionales (temas 1–10 y seminario de ética)
  index.html                Portada de GOHP (la genera assets/js/hub.js)
  teoria/
    guia.html               Guía de teoría de los diez temas y del seminario (62 apartados)
    chuleta.html            Chuleta: empresa, teorías, estrategias, fórmulas de producción e inversión, motivación
    autotest.html           Tests de cada tema (unas 300 preguntas) y test general; penalización −1/3 opcional
  practicas/
    guia.html               Prácticas 1–10 resueltas (41 ejercicios; resolución propia, no oficial)
    herramientas.html       Calculadoras: punto muerto, fabricar o comprar, productividad, VAN/TIR, coste efectivo y TAE
  examen/
    guia.html               Cómo es el examen (8 de enero de 2027), qué estudiar y 8 problemas tipo examen
    simulacro.html          Simulacro del test: 40 preguntas (4 por tema), reloj y −1/3 por fallo, nota sobre 10
  css/
    guia.css                Añadidos de GOHP a assets/css/guia.css: organigramas, matrices DAFO, gráfico del punto muerto
    gohp.css                Componentes del autotest y del simulacro
  js/
    util.js                 GOHP.fmt y GOHP.LETTERS
    autotest.js
    simulacro.js
    herramientas.js         Calculadoras de la página de herramientas
    data/banco.js           Banco de preguntas (GOHP.TOPICS; tema 11 = seminario, no entra en el simulacro)
amd/                        Álgebra y Matemática Discreta (temas 0–5 y prácticas 1–9 con SageMath). Salvo el autotest,
                            sus páginas las genera scripts/amd/generar.py (ver «AMD: páginas generadas y SageMath»)
  index.html                Portada de AMD (la genera assets/js/hub.js)
  teoria/
    guia.html               Guía de teoría: repaso de bachillerato y temas 1–5, con celdas de SageMath
    ejercicios.html         Hojas 1–4 y ejercicios de clase resueltos (177 ejercicios)
    autotest.html           Tests de los temas 1–5, test general (#test-G) y repaso de fallos (#test-R)
  practicas/
    p1.html … p9.html       Las nueve prácticas resueltas y explicadas; cada ejercicio con su cuaderno «Tu SageMath»
    sage.html               Consola de SageMath y chuleta de órdenes
    datos/p1 … datos/p9     Ficheros de las prácticas (.sobj, triangular.sage, .obj, imágenes)
  examen/
    parciales.html          Primeros parciales 2025-26 resueltos y simulacros del 2.º parcial y de prácticas
  sage/geometria.py         Módulo de dibujo de la asignatura (una sola copia: la versión corregida de la práctica 7)
  css/amd.css               Matrices, sistemas y fracciones (notación de las guías de AMD)
  css/autotest.css          Componentes del autotest (copia de ip/css/ip.css)
  js/util.js · autotest.js  AMD.fmt / AMD.LETTERS y el autotest (copia de los de IP)
  js/data/banco.js          Banco de preguntas del autotest (AMD.ORDER: temas 1–5)
assets/js/sage.js           SageMath en la web: celdas y cuadernos (SageMathCell); assets/css/sage.css, sus estilos
scripts/amd/
  generar.py                Convierte scripts/amd/contenido/*.html en las páginas de AMD
  contenido/                Fuente de cada página: etiquetas cortas para matrices, sistemas, ejercicios y celdas
```

Cada página carga sólo lo que necesita, en este orden: `core.js` (en el `<head>`, para aplicar el tema
antes de pintar), las utilidades y los datos de la asignatura, y por último el script de la página.

## Convenciones

- **Sin módulos ES ni `fetch`**: así todo funciona abriendo los ficheros con doble clic (`file://`),
  donde los navegadores bloquean esas dos cosas. Los datos van en ficheros `.js`.
- **Espacios de nombres**: `window.App` (común), `window.FLI`, `window.FC`, `window.IP` y `window.GOHP` (asignaturas). Cada script está envuelto
  en una función autoejecutable con `"use strict"` y sólo expone lo que exporta.
- **Estructura común**: toda asignatura tiene tres secciones, **Teoría · Prácticas · Examen**, y sus recursos son
  de un tipo fijo (`App.KINDS`: guía, chuleta, autotest, práctica, ejercicios, simulador, herramientas, examen,
  simulacro, test general) que decide el icono, el color y el orden dentro de la sección. Los bloques de una
  asignatura (L0 / L1 en FLI) son grupos dentro de cada sección.
- **Navegación**: la genera `core.js` a partir de `App.SUBJECTS` y de los atributos del `<body>`:
  `data-root` (ruta a la raíz: `""`, `"../"`, `"../../"`), `data-subject` (`fc`), `data-hub` (en la portada de la
  asignatura) y `data-title` (opcional; si no, el título del recurso). La sección y el recurso actuales se deducen
  de la URL. En el móvil, la barra inferior (Inicio · Teoría · Prácticas · Examen) queda al alcance del pulgar y,
  en las guías, el índice se queda fijo arriba.
- **Enlaces directos**: los autotests aceptan `#test-G` (test general) o `#test-3` (tema 3).
- **Tema**: claro u oscuro según el sistema; el botón de la barra lo fija para todas las páginas
  (`<html data-theme="light|dark">`). Todas las hojas de estilo definen las dos paletas.
- **Guías con índice lateral** (`assets/css/guia.css` + `assets/js/guia.js`, y después lo propio de la asignatura):
  cada `section.tema` toma un color de separador según su posición; los términos en `<b>` del texto corrido salen
  con subrayador; las cajas son `.box` (información), `.box.tip` (ejemplo), `.box.warn` (ojo) y `.box.def`; la
  ampliación va en `<details class="deep"><summary class="deep-t">Más a fondo · …</summary> … </details>` (plegada,
  se abre al enlazar algo de dentro, al imprimir y en los PDF). Los diagramas son `<figure class="dg">` con piezas
  HTML (`.dg-flow`, `.dg-chain`, `.dg-pyr`, `.dg-bits`, `.dg-mem`, `.dg-enc`, `.dg-grid`, `.dg-c2`) o SVG en
  línea que usa las clases `.bx`, `.bt`, `.bk`, `.ar`… para que se adapten al tema claro y oscuro.

## Añadir una asignatura

1. Crea su carpeta (por ejemplo `mates/`). Su `index.html` es una copia de `fc/index.html` cambiando
   `data-subject`; sus páginas, una copia de la cabecera de cualquier página de `fc/` ajustando las rutas.
2. Añade una entrada a `SUBJECTS` en `assets/js/core.js` con sus recursos:
   ```js
   { id: "mates", short: "MAT", name: "Matemáticas", desc: "…", intro: "…", home: "mates/index.html",
     sub: { teoria: "Temas 1–5", practicas: "…", examen: "…" },
     exam: { date: "2027-01-20", label: "20 de enero de 2027", href: "mates/examen/guia.html" },  // opcional
     // o, con parciales: exams: [{ date, name: "1.er parcial", label, href, cta }, …] (se muestra el próximo)
     resources: [
       { id: "guia-t", sec: "teoria", kind: "guia", title: "Guía de teoría", desc: "…", href: "mates/teoria/guia.html",
         progress: { t: "estudio", key: "mates-teoria-estudio", total: 20 } }
     ] }
   ```
   La portada, la portada de la asignatura y la navegación la incluyen automáticamente, con su progreso.
3. Usa `assets/css/base.css` para que comparta colores, tipografías, tema oscuro y componentes.
   Si necesita estilos o utilidades propias, ponlos en `mates/css/` y `mates/js/` con su propio espacio
   de nombres (`window.MATES`).
4. Para que cuente en el ranking y su progreso se guarde con la cuenta: añade su id a `ASIG` en
   `assets/js/cuentas.js`, a `esProgreso` en `assets/js/core.js` y a `firestore.rules` (`unaAsignatura()`
   y las listas `hasOnly` y `natural` del dueño y del administrador), y publica las reglas con
   `node scripts/admin/admin.js reglas`. Opcional: su descripción para la IA en `api/chat.js` y `assets/js/asistente.js`,
   y una insignia automática por sus puntos (`CAMPOS` en `assets/js/insignias.js`, la lista `campo` de
   `firestore.rules` y el pack inicial de `assets/js/admin.js`).

## AMD: páginas generadas y SageMath

Las páginas de teoría, prácticas y exámenes de AMD no se editan a mano: su fuente está en
`scripts/amd/contenido/` y se generan con

```
python3 scripts/amd/generar.py            # todas (o: python3 scripts/amd/generar.py p8 para filtrar)
```

El script (sólo biblioteca estándar de Python) convierte etiquetas cortas en el HTML de las guías
(`<tema>`, `<ap>`, `<ej>…<sol>…</sol></ej>`, `<box>`, `<res>`, `<m>1 2; 3 4</m>` para matrices,
`<sys>` para sistemas, `<fr>a|b</fr>` para fracciones, `<sage t="…">código</sage>` para celdas), pone a cada
ejercicio de las páginas con SageMath su cuaderno y la lista de ficheros descargables, y actualiza en
`assets/js/core.js` el número de ejercicios y de apartados de cada página. El comentario inicial de cada
fuente (JSON) da el título, la salida y los atributos del `<body>`.

**SageMath** (`assets/js/sage.js`) se ejecuta en **SageMathCell** (sagecell.sagemath.org), el servicio
público del proyecto SageMath: nada que instalar ni servidor que mantener (JupyterLab necesitaría uno y
JupyterLite no puede ejecutar SageMath). Su cliente se descarga al ejecutar la primera celda.

- Todas las celdas de una página comparten una sesión. Las de la resolución se ven como código y se
  convierten en editor al ejecutarlas. Cada ejercicio de las prácticas y del examen tiene además un
  cuaderno **«Tu SageMath»**: celdas para escribir las propias órdenes, que se añaden («＋ Celda debajo»,
  «Añadir celda»), se quitan y se ejecutan una a una (Mayús+Intro) o todas; el código se guarda en el
  navegador (`sage-cuaderno:<página>`; no viaja con la cuenta).
- Ficheros de la sesión: el `<body>` los declara con `data-sage-datos` (carpeta), `data-sage-ficheros`
  (nombres en esa carpeta o rutas desde la raíz como `/amd/sage/geometria.py`) y `data-sage-prep` (código
  que se ejecuta después, por ejemplo `from geometria import *`). Al abrir la sesión, una celda oculta los
  deja en la carpeta de trabajo: el navegador los lee de la propia web y se los manda, y los de más de 2 MB
  (o todos si la página se abre con doble clic) los descarga el servidor de **raw.githubusercontent.com**,
  porque los núcleos de SageMathCell sólo pueden conectarse a una lista cerrada de sitios (GitHub sí,
  Vercel no). Si cambia el repositorio o la rama, cambia `GITHUB` en `assets/js/sage.js`.
- Dos detalles de SageMathCell que `sage.js` esquiva: el código pedido mientras el núcleo se conecta
  saldría en la primera celda (por eso nada se ejecuta hasta que el núcleo está abierto), y el núcleo se
  cierra a los 15 minutos sin uso (se detecta y la siguiente ejecución abre otro y repite la preparación).

## Datos guardados en el navegador

Las páginas guardan el progreso en el navegador (`localStorage`) con las claves de abajo. Con una cuenta,
`assets/js/cuentas.js` guarda además una copia por cuenta y la sube al servidor (ver «Cuentas y ranking»).

| Clave | Qué guarda |
|---|---|
| `app-theme` | Tema elegido (común a todas las asignaturas) |
| `app-retro` | Modo terminal «de castigo» activado (por cerrar el aviso) |
| `fli-settings`, `fli-seen` | Opciones del autotest y preguntas ya vistas |
| `fli-best-1` … `fli-best-4`, `fli-best-G` | Mejores notas del autotest |
| `fli-exam-current`, `fli-exam-best-N` | Examen en curso y mejores notas de cada examen |
| `fli-ejercicios-hechos`, `fli-practicas-hechos` | Ejercicios marcados como hechos (L0) |
| `fli-l1-clase-hechos`, `fli-l1-resueltos-hechos`, `fli-l1-niveles-hechos` | Ejercicios marcados como hechos (L1) |
| `fli-tab`, `fli-gpart`, `fli-conv` | Última chuleta, parte de la guía y convenio de prioridad |
| `eq-settings`, `eq-best` | Opciones y mejor nota del test de equivalencias |
| `fc-settings`, `fc-seen`, `fc-best-1` … `fc-best-6`, `fc-best-G` | Opciones, preguntas vistas y mejores notas del autotest de FC |
| `fc-practicas-hechos` | Ejercicios de prácticas de FC marcados como hechos |
| `fc-teoria-visto`, `fc-practicas-visto` | Última parte vista de cada guía de FC |
| `fc-teoria-estudio`, `ip-teoria-estudio` | Apartados de la guía de teoría marcados como estudiados (`_total`: nº de apartados) |
| `fc-examen-hechos` | Problemas de la guía del examen de FC marcados como hechos |
| `fc-sim-best`, `fc-sim-hist`, `fc-sim-time` | Mejor nota (sobre 4), historial y reloj elegido del simulacro de FC |
| `app-last`, `app-last-<asignatura>` | Último recurso abierto («Continuar donde lo dejaste») |
| `app-sesion`, `app-cuentas` | Cuenta activa y cuentas usadas en este dispositivo (con su sesión) |
| `app-owner`, `app-sync`, `u:<cuenta>` | De quién es el progreso cargado, estado de la sincronización y copia del progreso de cada cuenta |
| `app-pend` | Puntos pendientes de enviar al ranking (si no había conexión) |
| `app-config`, `app-aviso-visto` | Copia del aviso y las fechas de examen publicadas desde el panel, y último aviso cerrado |
| `ip-settings`, `ip-seen`, `ip-best-0` … `ip-best-5`, `ip-best-G` | Opciones, preguntas vistas y mejores notas del autotest de IP (5 = bloque de C++) |
| `ip-practicas-hechos` | Ejercicios de prácticas de IP marcados como hechos |
| `ip-teoria-visto`, `ip-practicas-visto` | Última parte vista de cada guía de IP |
| `gohp-settings`, `gohp-seen`, `gohp-best-1` … `gohp-best-11`, `gohp-best-G` | Opciones, preguntas vistas y mejores notas del autotest de GOHP (11 = seminario) |
| `gohp-teoria-estudio`, `gohp-teoria-visto`, `gohp-practicas-hechos`, `gohp-practicas-visto`, `gohp-examen-hechos` | Avance en las guías de GOHP |
| `gohp-sim-best`, `gohp-sim-hist`, `gohp-sim-time` | Mejor nota (sobre 10), historial y reloj elegido del simulacro de GOHP |
| `amd-settings`, `amd-seen`, `amd-best-1` … `amd-best-5`, `amd-best-G` | Opciones, preguntas vistas y mejores notas del autotest de AMD |
| `amd-teoria-estudio`, `amd-ejercicios-hechos`, `amd-p1-hechos` … `amd-p9-hechos`, `amd-examen-hechos` | Apartados estudiados y ejercicios hechos de AMD |
| `amd-teoria-visto`, `amd-ejercicios-visto`, `amd-p1-visto` … `amd-p9-visto`, `amd-sage-visto`, `amd-examen-visto` | Última parte vista de cada página de AMD |
| `sage-cuaderno:<página>` | Código de los cuadernos «Tu SageMath» de cada página (sólo en este navegador) |

| `<asig>-repaso` | Repaso de fallos de cada asignatura: `{ huella: { b: caja 0–4, d: cuándo toca, f: fallos, t: tema }, _dom }` |
| `<asig>-hist` | Últimos 400 tests terminados: `{ d, tipo, tema, ok, n, nota }` (estadísticas) |
| `app-est-asig` | Asignatura elegida en «Tus estadísticas» |

El test del autotest y el simulacro en curso se guardan en `sessionStorage` (sobreviven a recargas, no a cerrar la pestaña).

## Repaso de fallos y estadísticas

- **Repaso de fallos** (`App.repaso` en core.js, en los cinco autotests y en los simulacros): cada pregunta
  fallada o en blanco entra en la caja 0 y se puede repasar ya desde la portada del autotest («Repaso de
  fallos», o el enlace `autotest.html#test-R`). Acertarla cuando toca la sube de caja y la programa a 1, 3, 7
  y 14 días; acertada en la última se da por dominada. Las preguntas se identifican por una huella del
  enunciado, así que reordenar o ampliar el banco no las pierde.
- **Estadísticas** (cuenta.html#estadisticas): salen de `App.historial`, que apunta cada test que llama a
  `App.puntos` (pásale también `nota` sobre 10 y `tema` para que salgan bien).


## Asistente de IA

Todas las páginas tienen un botón **«Pregunta a la IA»** (abajo a la derecha). Abre un panel al lado
de la página (abajo en el móvil), así que se ven las dos cosas a la vez; el panel se puede
redimensionar arrastrando su borde y sigue abierto al cambiar de página.

- Cada pregunta se envía con el **contexto de lo que se está viendo**: el título de la página, la
  sección que hay en pantalla (incluidas las resoluciones plegadas) y el índice de la página.
- Al **seleccionar texto** aparece un botón «Preguntar a la IA» que manda ese fragmento.
- Atajos: «Explícamelo con otras palabras», «Paso a paso», «Un ejemplo», «¿De dónde sale la
  fórmula?», «Errores típicos» y «Ponme a prueba».
- La conversación se guarda en la pestaña (sessionStorage); el botón ⟲ empieza una nueva.

### Qué IA responde (⚙ en el panel)

- **Con la clave de cada estudiante (Claude o Gemini).** En ⚙ Ajustes se elige el proveedor, se pega
  la clave propia (Anthropic: https://console.anthropic.com/settings/keys · Google:
  https://aistudio.google.com/apikey) y, si se quiere, otro modelo. La clave se guarda sólo en ese
  navegador (localStorage) y la petición va directamente del navegador a Anthropic o a Google, sin
  pasar por el servidor: cada uno gasta de su cuenta. Funciona aunque la web no tenga clave propia e
  incluso abierta desde un archivo. Modelos por defecto: `claude-sonnet-5-5` y `gemini-3.8-flash`.
- **Con la clave de la web** (opción por defecto). Sólo funciona si el dueño la configura en Vercel
  (abajo). Si no está configurada, el panel invita a usar la clave propia.

### Configuración de la clave de la web en Vercel (opcional)

El navegador nunca ve esta clave: la página llama a `/api/chat` y esa función habla con la API de
Anthropic.

1. Crea una clave en https://console.anthropic.com (API Keys) y añade saldo.
2. En Vercel → el proyecto → **Settings → Environment Variables**, añade `ANTHROPIC_API_KEY`.
3. Opcional: `ASISTENTE_MODEL` (por defecto `claude-sonnet-5-5`; `claude-haiku-5-5` es más barato) y
   `ASISTENTE_ORIGENES` (otros dominios desde los que se permite usarlo, separados por comas).
4. Vuelve a desplegar (Deployments → Redeploy) para que la función lea la variable.

`GET /api/chat` devuelve `{ configurado: true|false }` para comprobarlo. La función limita la
longitud de los mensajes y el número de preguntas por IP, y sólo acepta peticiones de la propia web.
Abierta con doble clic (`file://`) la web funciona igual, pero el asistente avisa de que necesita
estar publicada. Para desactivarlo en una página: `<body data-ai="off">`.

## Descargas en PDF

Cada página tiene un botón **PDF** en la barra superior, y la portada de cada asignatura tiene uno por
sección (Teoría, Prácticas, Examen), uno por bloque (L0 / L1) y «Toda la asignatura en PDF».

- **Un PDF por página**, generado de antemano con Chrome (texto seleccionable). Las páginas
  interactivas salen en versión para papel: el autotest con todo el banco de preguntas, la respuesta
  correcta marcada y su explicación; los exámenes con la solución; las chuletas y la guía de FLI con
  todas sus pestañas; todas las resoluciones abiertas.
- **Bloques y asignatura completa**: el navegador los monta al pulsar el botón, uniendo los PDFs de sus
  páginas con portada e índice (`assets/js/pdf.js` + `assets/vendor/pdf-lib.min.js`, que sólo se carga
  al pulsar). Así el repositorio guarda un solo PDF por página.
- Qué entra en cada bloque sale del registro `App.SUBJECTS` de `core.js`: una página nueva registrada
  allí entra sola en su sección. No se incluyen las herramientas interactivas, el simulador, el
  simulacro ni los enlaces al test general.

### Generarlos

```
cd scripts/pdf && npm install && npx playwright install chromium   # la primera vez
node scripts/pdf/generar.js                                        # desde la raíz del repositorio
```

El script escribe los PDFs y `pdf/manifest.json` en `pdf/`. Guarda una huella del contenido de cada
página y sólo vuelve a imprimir las que han cambiado (`--todo` las reimprime todas; `--solo ruta.html`
sólo una). **No hace falta ejecutarlo a mano**: el flujo `.github/workflows/pdfs.yml` lo ejecuta en
GitHub cada vez que se sube un cambio a `master` y, si algún PDF cambia, hace un commit con ellos.


## Cuentas y ranking

Al entrar en la web hay que **crear una cuenta o elegir una** (cuenta.html). Cada cuenta tiene su
propio progreso, que se guarda en Firebase y la sigue a cualquier dispositivo, y cada test terminado
suma puntos en el **ranking global** (ranking.html: general, esta semana y por asignatura).

- **Elegir cuenta**: cada dispositivo recuerda las cuentas que se han usado en él; mientras su sesión
  siga abierta se entra con un toque. «Cerrar sesión» la deja en la lista pero pide la contraseña.
- **Progreso**: las páginas siguen usando sus claves de `localStorage`; al cambiar de cuenta,
  `cuentas.js` guarda el de la anterior y carga el de la nueva. Se sube cada 20 s si ha cambiado y al
  salir de la página, y se trae si otro dispositivo guardó algo más reciente. Al crear la primera
  cuenta se puede quedar con el progreso que ya había en el navegador.
- **Puntos**: 10 por acierto al terminar un autotest, un test general, el simulacro de FC, el test de
  equivalencias o la parte de test de un examen de FLI; +25 si un test de 10 preguntas o más sale
  perfecto. Para que otro test sume puntos: `App.puntos({ asig, tipo, aciertos, total, nota, tema })`.
- **Perfil público** (perfil.html, enlazado desde el ranking): puntos, puesto, puntos por asignatura y la
  **vitrina de insignias**. En el tuyo eliges hasta 6 destacadas (salen junto a tu nombre en el ranking) y
  ves las que te faltan con su progreso.
- **Insignias** (`insignias/<id>`): las **automáticas** (por puntos, tests o puntos de una asignatura) se
  reclaman solas al abrir la web o al sumar puntos, y las reglas comprueban con su definición que te las has
  ganado; las **manuales** las da un administrador. En el panel (admin.html#insignias): pack inicial de 19,
  creador con vista previa (forma, color, rareza, icono), editar, borrar, dar o quitar a varias personas a la
  vez y, en cada usuario, cambiar el motivo o las veces. **Reto semanal**: el lunes, el panel enseña el podio
  de la semana anterior y con un botón entrega 🥇🥈🥉 (`semana_oro`, `semana_plata`, `semana_bronce`) y lo
  apunta en `retos/<semana>`, que el ranking enseña como «Última semana».
- **Sin conexión** se pueden crear **perfiles locales**, que guardan el progreso sólo en ese navegador
  y no entran en el ranking.

### Firebase (proyecto `web-ing-inf`)

- **Authentication** con correo y contraseña: cada usuario es `<usuario>@usuarios.web-ing-inf.firebaseapp.com`
  (en minúsculas y sin tildes; no se manda ningún correo). Firebase impide dos usuarios iguales.
- **Firestore**: `usuarios/<uid>` (nombre, puntos, tests, puntos por asignatura `fli`/`fc`/`ip`/`gohp`/`amd` y de cada
  semana `w<n>`; es público porque es el ranking), `progreso/<uid>` (el progreso; sólo su dueño),
  `config/web` (el aviso y las fechas de examen del panel; lo lee cualquiera, lo escribe un administrador)
  `reportes/<id>` (los errores que reportan los usuarios; sólo los leen los administradores),
  `insignias/<id>` (el catálogo; lo lee cualquiera, lo escribe un administrador) y `retos/<semana>`
  (ganadores de cada reto semanal entregado). Las insignias de cada uno van en `usuarios/<uid>.insignias`
  y sus destacadas en `usuarios/<uid>.vitrina`.
- **Reglas** (`firestore.rules`, se pegan en Firestore → Reglas → Publicar): cada uno sólo puede sumar
  sus propios puntos, de un test en un test, con el mismo valor en el total, en una asignatura y en la
  semana, y nunca más de los que da tiempo a ganar desde su último test. Un administrador (claim
  `admin` en su sesión) puede además corregir puntos, bloquear cuentas, publicar `config/web` y gestionar
  los reportes. **Cada vez que cambie `firestore.rules` hay que volver a publicarlas.**
- La configuración (`apiKey`, `projectId`) está al principio de `assets/js/cuentas.js`; es pública.
- Se usa la API REST de Firebase con `fetch`, sin cargar su SDK.

### Administrar las cuentas (scripts/admin)

Las contraseñas las guarda Firebase cifradas: nadie puede verlas, ni desde la consola. Para resetear
una contraseña olvidada sin perder los puntos ni el progreso, o borrar una cuenta del todo, está
`scripts/admin/admin.js`, que se ejecuta en tu ordenador:

```
cd scripts/admin
npm install                                   (sólo la primera vez)
node admin.js listar                          todas las cuentas con sus puntos y su último acceso
node admin.js resetear <usuario> <contraseña> contraseña nueva; conserva puntos y progreso
node admin.js borrar <usuario>                borra cuenta, puntos y progreso (pide confirmación)
```

En Windows sin Node instalado vale `admin listar` (etc.) dentro de `scripts\admin`: `admin.cmd` usa
el Node portátil de `scripts\admin\node\node.exe` si está (se descarga el `.zip` de Windows de
nodejs.org y se copia ahí su `node.exe`; no se sube a GitHub) y, si no, el Node instalado.

Necesita la **clave de administrador** en `scripts/admin/clave-admin.json`: Firebase → ⚙ Configuración
del proyecto → Cuentas de servicio → «Generar nueva clave privada». Esa clave da control total del
proyecto: no se comparte ni se sube (`.gitignore` la excluye). Si se filtra, se revoca en Google Cloud →
IAM → Cuentas de servicio → Claves.

### Panel de administración (admin.html)

Sólo lo ven las cuentas administradoras: les aparece un escudo en la barra superior y un enlace en
«Tu cuenta». Lo que no se puede hacer desde la web (contraseñas, borrar cuentas, dar o quitar el
permiso de administrador) se hace con `scripts/admin/admin.js`:

```
node admin.js admin <usuario>                 le da acceso al panel (entra abriendo admin.html o «Tu cuenta»)
node admin.js quitar-admin <usuario>          se lo quita (una sesión ya abierta puede conservarlo hasta 1 h)
node admin.js admins                          lista quién es administrador
node admin.js reglas                          publica firestore.rules (guarda antes las publicadas en reglas-anteriores.rules)
```

Pestañas del panel:

- **Resumen**: cuentas, tests, puntos, cuentas activas esta semana, top de la semana, puntos por
  asignatura y reportes sin revisar.
- **Usuarios**: buscar y filtrar cuentas. «Gestionar» permite sumar o restar puntos en una asignatura
  (y en la semana), ponerlos a cero y **bloquear** la cuenta: deja de salir en el ranking, no suma
  puntos y no puede mandar reportes. Muestra también los comandos de terminal para esa cuenta.
- **Aviso**: un aviso para todas las páginas (normal o importante, con enlace y fecha de caducidad
  opcionales). Cada usuario puede cerrarlo; un aviso nuevo vuelve a salir. Ojo: quien lo cierra se
  lleva de broma el modo terminal (fósforo verde) hasta que pulse Espacio dos veces (dos toques en el móvil).
- **Exámenes**: las fechas de la cuenta atrás de la portada y de cada asignatura. Si no se tocan se usan
  las de `assets/js/core.js`; «Volver a las del código» borra las del panel.
- **Reportes**: lo que mandan los usuarios con el botón ⚠ de la barra superior, con la página (y el
  apartado), la pregunta o el texto seleccionado. Se marcan como resueltos o se borran.

Las páginas leen `config/web` como mucho cada 5 minutos y lo guardan en `app-config`, así que un
cambio puede tardar ese tiempo en verse en un navegador que ya tenía la web abierta.

