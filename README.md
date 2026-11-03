# Material de estudio

Sitio web estático con material de estudio por asignaturas. No necesita instalación ni servidor:
abre `index.html` con doble clic. También funciona servido desde cualquier hosting estático
(GitHub Pages, Netlify…) o con `python3 -m http.server` desde esta carpeta.

## Estructura

```
index.html                  Portada: una tarjeta por asignatura
assets/
  css/base.css              Tokens de diseño (colores, tipografías, tema oscuro) y componentes genéricos
  css/nav.css               Barra superior común (autosuficiente: sirve también en páginas con estilos propios)
  css/portal.css            Estilos de la portada
  js/core.js                Registro de asignaturas, tema claro/oscuro, almacenamiento y barra superior
  js/portal.js              Pinta las tarjetas de la portada a partir del registro
  js/asistente.js           Asistente de IA en un panel paralelo (lo carga core.js en todas las páginas)
  css/asistente.css         Estilos del panel del asistente
api/
  chat.js                   Función de Vercel que llama a la IA (la clave va en una variable de entorno)
vercel.json                 Tiempo máximo de la función del asistente
  img/favicon.svg
fli/                        Fundamentos Lógicos de la Informática
  index.html                Portada de FLI: bloque L0 y bloque L1, cada uno con Teoría y Prácticas, y el progreso guardado
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
    inicio.css              Bloques L0 / L1 de la portada de FLI
    fli.css                 Componentes de FLI (fórmulas, autotest, chuletas, exámenes, guía)
    ejercicios.css          Páginas de ejercicios con índice lateral
    equivalencias.css       Test de equivalencias
  js/
    formulas.js             Utilidades compartidas: colorear conectivas, fórmulas, árboles de tableaux
    logic.js                Motor de lógica proposicional (análisis, evaluación, subfórmulas)
    autotest.js · examenes.js · chuletas.js · guia.js · equivalencias.js · ejercicios.js · inicio.js
    data/
      banco.js              Banco de preguntas del autotest
      examenes.js           Exámenes completos
      chuletas.js           Contenido de las chuletas y tarjetas
fc/                         Fundamentos de Computadores (temas 1–6)
  index.html                Portada de FC: Teoría y Prácticas, con el progreso guardado
  teoria/
    guia.html               Guía de teoría de los seis temas y formulario (enlazable: guia.html#t3-2)
    autotest.html           Tests por tema (266 preguntas) y test general
  practicas/
    guia.html               Boletines 1–6 explicados, 43 ejercicios resueltos y dos herramientas
                            (mini-okteta en #p2-3 y calculadora de red en #p6-2)
  css/
    fc.css                  Componentes del autotest
    guia.css                Guías con índice lateral, cajas, mapas de Karnaugh y herramientas
    inicio.css              Portada de FC
  js/
    util.js                 FC.fmt y FC.LETTERS
    autotest.js · inicio.js · guia.js · herramientas.js
    data/banco.js           Banco de preguntas del autotest
  img/                      Figuras de los apuntes (buses, placas base de la tarea 1)
ip/                         Introducción a la Programación (temas 0–4 y prácticas 1–6)
  index.html                Portada de IP: Teoría y Prácticas, con el progreso guardado
  teoria/
    guia.html               Guía de teoría de los temas 0–4, simulador de la máquina secuencial (#t4-8)
                            y anexos: SP → C++ (#a-1), esquemas (#a-2) y códigos de Wooclap (#a-3)
    autotest.html           Tests de cada tema, del C++ de prácticas (170 preguntas) y test general
  practicas/
    guia.html               Prácticas 1–6 explicadas con 44 ejercicios resueltos (SP, C++ y ejecución real)
  css/
    guia.css                Guías (copia de fc/css/guia.css sin Karnaugh) + resaltado de código y simulador
    ip.css                  Componentes del autotest
    inicio.css              Portada de IP
  js/
    util.js                 IP.fmt y IP.LETTERS
    autotest.js · inicio.js
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
- **Barra superior**: la genera `core.js` a partir de atributos del `<body>`:
  `data-root` (ruta a la raíz: `""`, `"../"`, `"../../"`), `data-subject` (`fli`),
  `data-area` (`teoria` | `practicas` para L0, `l1-teoria` | `l1-practicas` para L1, o `auto`) y `data-title`
  (miga de pan). Las secciones con `group` en `SUBJECTS` se pintan agrupadas (L0 · Teoría | Prácticas, L1 · …).
- **Tema**: claro u oscuro según el sistema; el botón de la barra lo fija para todas las páginas
  (`<html data-theme="light|dark">`). Todas las hojas de estilo definen las dos paletas.

## Añadir una asignatura

1. Crea su carpeta (por ejemplo `mates/`) con su `index.html` y sus páginas. Copia la cabecera de
   cualquier página de `fli/` y ajusta `data-root`, `data-subject` y las rutas.
2. Añade una entrada a `SUBJECTS` en `assets/js/core.js`:
   ```js
   { id: "mates", short: "MAT", name: "Matemáticas", desc: "…", home: "mates/index.html",
     sections: [{ id: "teoria", label: "Teoría", href: "mates/index.html#teoria" }] }
   ```
   La portada y la barra superior la incluyen automáticamente.
3. Usa `assets/css/base.css` para que comparta colores, tipografías, tema oscuro y componentes.
   Si necesita estilos o utilidades propias, ponlos en `mates/css/` y `mates/js/` con su propio espacio
   de nombres (`window.MATES`).

## Datos guardados en el navegador

Todo se guarda sólo en el navegador (`localStorage`), nunca se envía a ningún sitio.

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
| `ip-settings`, `ip-seen`, `ip-best-0` … `ip-best-5`, `ip-best-G` | Opciones, preguntas vistas y mejores notas del autotest de IP (5 = bloque de C++) |
| `ip-practicas-hechos` | Ejercicios de prácticas de IP marcados como hechos |
| `ip-teoria-visto`, `ip-practicas-visto` | Última parte vista de cada guía de IP |

El test del autotest en curso se guarda en `sessionStorage` (sobrevive a recargas, no a cerrar la pestaña).


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

### Configuración en Vercel

El navegador nunca ve la clave: la página llama a `/api/chat` y esa función habla con la API de
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
