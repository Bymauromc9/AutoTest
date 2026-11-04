# Material de estudio

Sitio web estático con material de estudio por asignaturas. No necesita instalación ni servidor:
abre `index.html` con doble clic. También funciona servido desde cualquier hosting estático
(GitHub Pages, Netlify…) o con `python3 -m http.server` desde esta carpeta.

## Estructura

```
index.html                  Portada: tu cuenta y el top 5, cuenta atrás de los exámenes, «continuar» y una tarjeta por asignatura
cuenta.html                 Entrar, crear cuenta o elegir una de las cuentas usadas en el dispositivo; «Tu cuenta»
ranking.html                Leaderboard global: general, esta semana y por asignatura
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
  css/cuentas.css           Acceso, ranking, avisos de puntos y bloque de cuenta de la portada
  css/asistente.css         Estilos del panel del asistente
api/
  chat.js                   Función de Vercel que llama a la IA (la clave va en una variable de entorno)
vercel.json                 Tiempo máximo de la función del asistente
firestore.rules             Reglas de seguridad de Firestore (cuentas, progreso y ranking)
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
    css/l1.css              Estilos propios de L1 (se carga después de fli/css/ejercicios.css)
    js/l1.js                Resoluciones plegables (abrir/cerrar todas, abrir la enlazada, abrir al imprimir)
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
    guia.css                Guías con índice lateral, cajas, mapas de Karnaugh y herramientas
  js/
    util.js                 FC.fmt y FC.LETTERS
    autotest.js · guia.js · herramientas.js
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
    guia.css                Guías (copia de fc/css/guia.css sin Karnaugh) + resaltado de código y simulador
    ip.css                  Componentes del autotest
  js/
    util.js                 IP.fmt y IP.LETTERS
    autotest.js
    guia.js                 Índice, progreso, resoluciones plegables y resaltado de C++ y de la notación SP
    maquina.js              Simulador de la máquina secuencial (primer modelo)
    data/banco.js           Banco de preguntas del autotest (IP.ORDER: temas 0–4 y bloque 5 = C++)
```

Cada página carga sólo lo que necesita, en este orden: `core.js` (en el `<head>`, para aplicar el tema
antes de pintar), las utilidades y los datos de la asignatura, y por último el script de la página.

## Convenciones

- **Sin módulos ES ni `fetch`**: así todo funciona abriendo los ficheros con doble clic (`file://`),
  donde los navegadores bloquean esas dos cosas. Los datos van en ficheros `.js`.
- **Espacios de nombres**: `window.App` (común), `window.FLI`, `window.FC` y `window.IP` (asignaturas). Cada script está envuelto
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

## Datos guardados en el navegador

Las páginas guardan el progreso en el navegador (`localStorage`) con las claves de abajo. Con una cuenta,
`assets/js/cuentas.js` guarda además una copia por cuenta y la sube al servidor (ver «Cuentas y ranking»).

| Clave | Qué guarda |
|---|---|
| `app-theme` | Tema elegido (común a todas las asignaturas) |
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
| `ip-settings`, `ip-seen`, `ip-best-0` … `ip-best-5`, `ip-best-G` | Opciones, preguntas vistas y mejores notas del autotest de IP (5 = bloque de C++) |
| `ip-practicas-hechos` | Ejercicios de prácticas de IP marcados como hechos |
| `ip-teoria-visto`, `ip-practicas-visto` | Última parte vista de cada guía de IP |

El test del autotest y el simulacro en curso se guardan en `sessionStorage` (sobreviven a recargas, no a cerrar la pestaña).


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
  perfecto. Para que otro test sume puntos: `App.puntos({ asig, tipo, aciertos, total })`.
- **Sin conexión** se pueden crear **perfiles locales**, que guardan el progreso sólo en ese navegador
  y no entran en el ranking.

### Firebase (proyecto `web-ing-inf`)

- **Authentication** con correo y contraseña: cada usuario es `<usuario>@usuarios.web-ing-inf.firebaseapp.com`
  (en minúsculas y sin tildes; no se manda ningún correo). Firebase impide dos usuarios iguales.
- **Firestore**: `usuarios/<uid>` (nombre, puntos, tests, puntos por asignatura `fli`/`fc`/`ip` y de cada
  semana `w<n>`; es público porque es el ranking) y `progreso/<uid>` (el progreso; sólo su dueño).
- **Reglas** (`firestore.rules`, se pegan en Firestore → Reglas → Publicar): cada uno sólo puede sumar
  sus propios puntos, de un test en un test, con el mismo valor en el total, en una asignatura y en la
  semana, y nunca más de los que da tiempo a ganar desde su último test.
- La configuración (`apiKey`, `projectId`) está al principio de `assets/js/cuentas.js`; es pública.
- Se usa la API REST de Firebase con `fetch`, sin cargar su SDK.
