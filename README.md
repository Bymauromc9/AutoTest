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
  img/favicon.svg
fli/                        Fundamentos Lógicos de la Informática
  index.html                Portada de FLI con las secciones Teoría y Prácticas y el progreso guardado
  teoria/
    autotest.html           Tests por tema y test general
    examenes.html           Parcial real 23-24 y simulacros, con corrección
    chuletas.html           Chuletas visuales (enlazables por pestaña: chuletas.html#nexos)
    equivalencias.html      Test de equivalencias de L0
    ejercicios.html         94 ejercicios de teoría con soluciones
  practicas/
    guia.html               Guía de prácticas con analizador y comprobador (enlazable: guia.html#parte-4)
    ejercicios.html         83 ejercicios de prácticas con soluciones
  css/
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
```

Cada página carga sólo lo que necesita, en este orden: `core.js` (en el `<head>`, para aplicar el tema
antes de pintar), las utilidades y los datos de la asignatura, y por último el script de la página.

## Convenciones

- **Sin módulos ES ni `fetch`**: así todo funciona abriendo los ficheros con doble clic (`file://`),
  donde los navegadores bloquean esas dos cosas. Los datos van en ficheros `.js`.
- **Espacios de nombres**: `window.App` (común) y `window.FLI` (asignatura). Cada script está envuelto
  en una función autoejecutable con `"use strict"` y sólo expone lo que exporta.
- **Barra superior**: la genera `core.js` a partir de atributos del `<body>`:
  `data-root` (ruta a la raíz: `""`, `"../"`, `"../../"`), `data-subject` (`fli`),
  `data-area` (`teoria` | `practicas` | `auto`) y `data-title` (miga de pan).
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
| `fli-ejercicios-hechos`, `fli-practicas-hechos` | Ejercicios marcados como hechos |
| `fli-tab`, `fli-gpart`, `fli-conv` | Última chuleta, parte de la guía y convenio de prioridad |
| `eq-settings`, `eq-best` | Opciones y mejor nota del test de equivalencias |

El test del autotest en curso se guarda en `sessionStorage` (sobrevive a recargas, no a cerrar la pestaña).
