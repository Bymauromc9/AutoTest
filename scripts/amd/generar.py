#!/usr/bin/env python3
"""
scripts/amd/generar.py — genera las páginas de AMD (amd/**/*.html) a partir de scripts/amd/contenido/.

    python3 scripts/amd/generar.py            (desde la raíz del repo; sólo usa la biblioteca estándar)

Cada fichero de contenido es HTML con unas pocas etiquetas cortas que aquí se convierten en el marcado de
las guías (assets/css/guia.css + amd/css/amd.css). Empieza con un comentario con los datos de la página:

    <!--{"salida": "amd/teoria/guia.html", "titulo": "Guía de teoría", "descripcion": "…",
         "eyebrow": "…", "h1": "Guía de teoría", "ops": "Aᵀ λ ⊥", "lead": "…", "marca": "AMD · Teoría",
         "body": {"data-estudio-key": "amd-teoria-estudio"}, "ejercicios": false}-->

Etiquetas de estructura
    <tema id="t1" n="1" t="Título" lede="Entradilla" eyebrow="Tema 1">…</tema>   bloque del índice
    <ap id="t1-1" n="1.1" t="Título">…</ap>                                       apartado (topic)
    <ej id="h1-1a" n="Ejercicio 1 (a)" t="Título">enunciado <sol>resolución</sol></ej>   ejercicio con «Hecho»
                                  (en las páginas con SageMath lleva su cuaderno «Tu SageMath»; cuaderno="no" lo quita)
    <box k="tip|warn" t="Título">…</box>   <deep t="Título">…</deep>   <res>resultado</res>
Notación matemática
    <m>1 2 | 3; 4 5 | 6</m>       matriz (filas con «;», columnas con espacios; si hay comas o <m c>, con comas);
                                  «|» separa la columna ampliada; <m det> determinante; <m sm> más pequeña
    <sys>x + y = 1; 2x − y = 0</sys>   sistema con llave y los «=» alineados
    <fr>1|2</fr> fracción   <r>2</r> raíz   <op>F₂ − 2F₁</op> paso de Gauss   <md>…</md> fórmula en bloque
SageMath
    <sage t="Título">código</sage>  celda ejecutable (assets/js/sage.js); <salida>…</salida> justo detrás
                                    añade la salida de referencia (texto) o <salida img="ruta.png">.
    Una página usa SageMath si su «body» trae data-sage-key: entonces cada ejercicio lleva un cuaderno
    (<div class="sage-nb">) y el <body> puede declarar los ficheros de la sesión (data-sage-datos,
    data-sage-ficheros, data-sage-prep: ver assets/js/sage.js). Con "cuadernos": false en los datos de la
    página, sus ejercicios no llevan cuaderno (las hojas de teoría, que son de lápiz y papel).
"""
import html
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CONTENIDO = Path(__file__).resolve().parent / "contenido"
FUENTES = ("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;"
           "12..96,800&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+Math&family=Source+Serif+4:ital,"
           "opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap")


class ErrorContenido(Exception):
    pass


def attrs(texto):
    """Atributos de una etiqueta corta: k="v" o banderas sueltas (det, sm)."""
    out = {}
    for m in re.finditer(r"""([\w-]+)(?:="([^"]*)"|='([^']*)')?""", texto or ""):
        v = m.group(2) if m.group(2) is not None else m.group(3)
        out[m.group(1)] = v if v is not None else True
    return out


# ---------------------------------------------------------------- notación matemática
def celdas(fila, comas):
    fila = fila.strip()
    return [c.strip() for c in fila.split(",")] if comas else fila.split()


def matriz(a, cuerpo):
    filas = [f for f in cuerpo.strip().split(";")]
    comas = "," in cuerpo or bool(a.get("c"))   # con comas (o <m c>), cada entrada puede llevar espacios (x₁ − 2x₂)
    tabla, barra = [], None
    for f in filas:
        if "|" in f:
            izq, der = f.split("|", 1)
            ci, cd = celdas(izq, comas), celdas(der, comas)
            if barra is None:
                barra = len(ci)
            elif barra != len(ci):
                raise ErrorContenido("matriz ampliada con la barra en columnas distintas: " + cuerpo)
            tabla.append(ci + cd)
        else:
            tabla.append(celdas(f, comas))
    ncol = max(len(f) for f in tabla)
    for f in tabla:
        if len(f) != ncol:
            raise ErrorContenido("matriz con filas de distinta longitud: " + cuerpo)
    clases = ["mx"] + [k for k in ("det", "sm") if a.get(k)]   # «c» sólo cambia cómo se leen las entradas
    partes = []
    for f in tabla:
        for j, c in enumerate(f):
            cls = []
            if barra is not None and j == barra:
                cls.append("ab")
            if c.startswith("!"):
                cls.append("pv"); c = c[1:]
            partes.append(f'<span class="{" ".join(cls)}">{c}</span>' if cls else f"<span>{c}</span>")
    return f'<span class="{" ".join(clases)}" style="--c:{ncol}">{"".join(partes)}</span>'


def sistema(cuerpo):
    filas = [f.strip() for f in cuerpo.split(";") if f.strip()]
    partes = []
    for f in filas:
        m = re.match(r"(.*?)\s*(=|≤|≥|<|>|≡)\s*(.*)$", f)
        if not m:
            raise ErrorContenido("ecuación sin «=»: " + f)
        partes.append(f'<span class="l">{m.group(1)}</span><span class="e">{m.group(2)}</span><span class="r">{m.group(3)}</span>')
    return f'<span class="sys">{"".join(partes)}</span>'


def notacion(s):
    s = re.sub(r"<m(\s[^>]*)?>(.*?)</m>", lambda m: matriz(attrs(m.group(1)), m.group(2)), s, flags=re.S)
    s = re.sub(r"<sys>(.*?)</sys>", lambda m: sistema(m.group(1)), s, flags=re.S)
    s = re.sub(r"<fr>(.*?)\|(.*?)</fr>", r'<span class="fr"><span>\1</span><span>\2</span></span>', s, flags=re.S)
    s = re.sub(r"<r>(.*?)</r>", r'<span class="sq">√<span>\1</span></span>', s, flags=re.S)
    s = re.sub(r"<op>(.*?)</op>", r'<span class="op"><small>\1</small><span>~</span></span>', s, flags=re.S)
    s = re.sub(r"<md( l)?>(.*?)</md>", lambda m: f'<span class="md{" l" if m.group(1) else ""}">{m.group(2)}</span>', s, flags=re.S)
    return s


# ---------------------------------------------------------------- SageMath
def sage_celdas(s, guardadas):
    """Saca el código de las celdas antes de procesar nada (no se toca su contenido) y deja una marca."""
    def una(m):
        a = attrs(m.group(1))
        codigo = m.group(2).strip("\n")
        lineas = codigo.split("\n")
        sangria = min((len(l) - len(l.lstrip()) for l in lineas if l.strip()), default=0)
        codigo = "\n".join(l[sangria:] for l in lineas).rstrip()
        salida = ""
        if m.group(3) is not None:
            sa = attrs(m.group(3))
            if sa.get("img"):
                salida = f'<div class="sage-out"><p>Salida</p><img src="{sa["img"]}" alt="{html.escape(sa.get("alt", "Gráfica que dibuja SageMath"))}" loading="lazy"></div>'
            texto = (m.group(4) or "").strip("\n")
            if texto.strip():
                salida += f'<div class="sage-out"><p>Salida</p><pre>{html.escape(texto)}</pre></div>'
        titulo = f'<p class="sage-t">{a["t"]}</p>' if a.get("t") else ""
        guardadas.append(f'<div class="sage">{titulo}<pre><code class="lang-sage">{html.escape(codigo)}</code></pre>{salida}</div>')
        return f"\x00SAGE{len(guardadas) - 1}\x00"
    patron = r"<sage(\s[^>]*)?>(.*?)</sage>(?:\s*<salida(\s[^>]*)?>(.*?)</salida>)?"
    return re.sub(patron, una, s, flags=re.S)


# ---------------------------------------------------------------- estructura
def cajas(s):
    def box(m):
        a = attrs(m.group(1))
        k = a.get("k", "")
        t = f'<p class="box-t">{a["t"]}</p>' if a.get("t") else ""
        return f'<div class="box{" " + k if k else ""}">{t}{m.group(2)}</div>'
    for _ in range(2):   # una caja puede contener otra
        s = re.sub(r"<box(\s[^>]*)?>((?:(?!<box[\s>]).)*?)</box>", box, s, flags=re.S)
    s = re.sub(r"<deep(\s[^>]*)?>(.*?)</deep>", lambda m: f'<details class="deep"><summary class="deep-t">{attrs(m.group(1)).get("t", "Más a fondo")}</summary>{m.group(2)}</details>', s, flags=re.S)
    s = re.sub(r"<res>(.*?)</res>", r'<p class="result"><span class="result-l">Resultado</span>\1</p>', s, flags=re.S)
    return s


def ejercicios(s, tema_id, vistos, cuadernos):
    def ej(m):
        a = attrs(m.group(1))
        eid = a.get("id") or ""
        if not eid or eid in vistos:
            raise ErrorContenido("ejercicio sin id o con id repetido: " + eid)
        vistos.add(eid)
        cuerpo = m.group(2)
        sol = ""
        ms = re.search(r"<sol>(.*)</sol>", cuerpo, flags=re.S)
        if ms:
            sol = f'<details class="sol"><summary>Resolución explicada</summary><div class="sol-body">{ms.group(1)}</div></details>'
            cuerpo = cuerpo[:ms.start()] + cuerpo[ms.end():]
        titulo = f' <span class="card-title">· {a["t"]}</span>' if a.get("t") else ""
        nb = f'<div class="sage-nb" data-nb="{eid}"></div>' if cuadernos and a.get("cuaderno") != "no" else ""
        return (f'<article class="card ex" data-tema="{tema_id}" id="e-{eid}"><div class="card-head">'
                f'<span class="card-num">{a.get("n", "Ejercicio")}{titulo}</span><span class="card-tools">'
                f'<label class="done" for="d-{eid}"><input data-key="{eid}" id="d-{eid}" type="checkbox"><span>Hecho</span></label>'
                f'</span></div><div class="card-body">{cuerpo}{nb}{sol}</div></article>')
    return re.sub(r"<ej(\s[^>]*)>(.*?)</ej>", ej, s, flags=re.S)


def estructura(s, con_ejercicios, cuadernos=False):
    toc, vistos, ids = [], set(), set()
    total_ej = 0

    def tema(m):
        nonlocal total_ej
        a = attrs(m.group(1))
        tid = a["id"]
        cuerpo = m.group(2)
        temas_ap = []

        def ap(mm):
            b = attrs(mm.group(1))
            aid = b["id"]
            if aid in ids:
                raise ErrorContenido("id repetido: " + aid)
            ids.add(aid)
            temas_ap.append((aid, b.get("n", ""), b["t"]))
            return (f'<section class="topic" id="{aid}"><h3><span class="tnum">{b.get("n", "")}</span><span>{b["t"]}</span></h3>'
                    f'<div class="prose">{mm.group(2)}</div></section>')
        cuerpo = re.sub(r"<ap(\s[^>]*)>(.*?)</ap>", ap, cuerpo, flags=re.S)
        antes = len(vistos)
        cuerpo = ejercicios(cuerpo, tid, vistos, cuadernos)
        total_ej += len(vistos) - antes
        prog = f'<span class="prog" data-prog="{tid}"></span>' if con_ejercicios and len(vistos) > antes else "<span></span>"
        sub = "".join(f'<li><a href="#{i}"><span class="tnum">{n}</span>{t}</a></li>' for i, n, t in temas_ap)
        toc.append(f'<li><a class="toc-tema" href="#{tid}"><span class="tn">{a.get("n", "")}</span><span class="tname">{a["t"]}</span>{prog}</a>'
                   f'<ol class="toc-topics">{sub}</ol></li>')
        lede = f'<p class="lede">{a["lede"]}</p>' if a.get("lede") else ""
        eyebrow = a.get("eyebrow", "Tema " + a.get("n", ""))
        return (f'<section class="tema guide" id="{tid}"><header class="tema-head"><p class="eyebrow">{eyebrow}</p>'
                f'<h2>{a["t"]}</h2>{lede}</header>{cuerpo}</section>')
    s = re.sub(r"<tema(\s[^>]*)>(.*?)</tema>", tema, s, flags=re.S)
    return s, "".join(toc), total_ej


# ---------------------------------------------------------------- página
def ficheros_descarga(body, root):
    """Enlaces de descarga de los ficheros de la sesión (data-sage-ficheros): nombres en data-sage-datos o rutas «/…»."""
    carpeta = body.get("data-sage-datos", "").lstrip("/")
    enlaces = []
    for f in filter(None, (x.strip() for x in body.get("data-sage-ficheros", "").split(","))):
        ruta = f[1:] if f.startswith("/") else carpeta + f
        if not (RAIZ / ruta).exists():
            print(f"aviso: no existe {ruta} (está en data-sage-ficheros)", file=sys.stderr)
        nombre = html.escape(ruta.rsplit("/", 1)[-1])
        enlaces.append(f'<li><a href="{root}{html.escape(ruta, quote=True)}" download>{nombre}</a></li>')
    return "".join(enlaces)


def pagina(meta, cuerpo, toc, total_ej, usa_sage):
    salida = meta["salida"]
    nivel = salida.count("/")
    root = "../" * nivel
    body = {"data-root": root, "data-subject": "amd", "data-title": meta["titulo"]}
    body.update(meta.get("body", {}))
    if total_ej and "data-storage-key" not in body:
        raise ErrorContenido(salida + ": tiene ejercicios pero no data-storage-key")
    body_attrs = " ".join(f'{k}="{html.escape(str(v), quote=True)}"' for k, v in body.items())
    css = [f"{root}assets/css/nav.css", f"{root}assets/css/guia.css", f"{root}amd/css/amd.css"]
    js = [f"{root}assets/js/guia.js"]
    if usa_sage:
        css.append(f"{root}assets/css/sage.css")
        js.append(f"{root}assets/js/sage.js")
    links = "\n".join(f'<link rel="stylesheet" href="{c}">' for c in css)
    scripts = "\n".join(f'<script src="{j}"></script>' for j in js)
    paginas = ""
    if meta.get("paginas"):
        enl = []
        for href, txt in meta["paginas"]:
            actual = ' aria-current="page"' if href == Path(salida).name else ""
            enl.append(f'<a href="{href}"{actual}>{txt}</a>')
        paginas = f'<nav class="amd-pages" aria-label="{meta.get("paginas_label", "Páginas")}">{"".join(enl)}</nav>'
    soltools = ""
    if total_ej:
        soltools = ('<div class="soltools"><button type="button" class="btn-sol" data-sol="open">Abrir todas las resoluciones</button>'
                    '<button type="button" class="btn-sol" data-sol="close">Cerrarlas</button>'
                    f'<span class="soltools-note">{meta.get("nota_sol", "Intenta cada ejercicio antes de abrir su resolución y márcalo como hecho.")}</span></div>')
    foot = f'\n    <p class="foot">{meta["pie"]}</p>' if meta.get("pie") else ""
    descargas = ficheros_descarga(body, root)
    if descargas:
        foot += f'\n    <div class="foot"><p>Ficheros de esta página, para usarlos en tu SageMath:</p><ul class="files">{descargas}</ul></div>'
    if usa_sage:
        foot += ('\n    <p class="foot">Las celdas de SageMath se ejecutan en <a href="https://sagecell.sagemath.org/" '
                 'rel="noopener">SageMathCell</a>, el servicio público del proyecto SageMath.</p>')
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{meta["titulo"]} · AMD</title>
<meta name="description" content="{html.escape(meta["descripcion"], quote=True)}">
<link rel="icon" href="{root}assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FUENTES}">
{links}
<script src="{root}assets/js/core.js"></script>
</head>
<body {body_attrs}>
<!-- Generado por scripts/amd/generar.py a partir de scripts/amd/contenido/: no lo edites a mano. -->
<a class="skip-link" href="#app">Saltar al contenido</a>
<div class="shell">
  <aside class="side" id="side">
    <div class="side-top">
      <p class="side-brand"><span class="sym">{meta.get("sym", "λ")}</span> {meta["marca"]}</p>
      <button class="toc-toggle" id="toc-toggle" type="button" aria-expanded="false" aria-controls="side">Índice</button>
    </div>
    <nav class="toc" aria-label="Índice"><p class="toc-label">{meta.get("toc_label", "Partes")}</p><ol class="toc-temas">{toc}</ol></nav>
  </aside>
  <main id="app" tabindex="-1">
<header class="hero"><p class="eyebrow">{meta["eyebrow"]}</p><h1>{meta["h1"]} <span class="ops">{meta.get("ops", "")}</span></h1><p class="lead">{meta["lead"]}</p>{paginas}</header>{soltools}{cuerpo}{foot}
  </main>
</div>
{scripts}
</body>
</html>
"""


def generar(fichero):
    texto = fichero.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--(.*?)-->", texto, flags=re.S)
    if not m:
        raise ErrorContenido(fichero.name + ": falta el comentario inicial con los datos de la página")
    meta = json.loads(m.group(1))
    s = texto[m.end():]
    # Comentarios del autor: fuera (no van a la web).
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    guardadas = []
    s = sage_celdas(s, guardadas)
    s = notacion(s)
    s = cajas(s)
    usa_sage = bool(meta.get("body", {}).get("data-sage-key"))
    s, toc, total_ej = estructura(s, True, cuadernos=usa_sage and meta.get("cuadernos", True))
    for i, c in enumerate(guardadas):
        s = s.replace(f"\x00SAGE{i}\x00", c)
    s = re.sub(r">\s*\n\s*<", "><", s.strip())       # HTML compacto (como el resto de guías)
    s = re.sub(r"\n{2,}", "\n", s)
    restos = re.findall(r"</?(?:tema|ap|ej|sol|box|deep|res|m|sys|fr|r|op|md|sage|salida)[\s>]", s)
    if restos:
        raise ErrorContenido(fichero.name + ": etiquetas sin convertir: " + ", ".join(sorted(set(restos))))
    destino = RAIZ / meta["salida"]
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(pagina(meta, s, toc, total_ej, usa_sage or bool(guardadas)), encoding="utf-8", newline="\n")
    body = meta.get("body", {})
    totales = {}
    if total_ej:
        totales[body["data-storage-key"]] = total_ej
    if body.get("data-estudio-key"):
        totales[body["data-estudio-key"]] = s.count('<section class="topic"')
    return meta["salida"], total_ej, len(guardadas), totales


def sincronizar_registro(totales):
    """Pone en el registro de assets/js/core.js el total de ejercicios / apartados de cada página."""
    core = RAIZ / "assets" / "js" / "core.js"
    s = core.read_text(encoding="utf-8")
    for clave, n in totales.items():
        s, k = re.subn(r'(key: "' + re.escape(clave) + r'",[^}]*?total: )\d+', lambda m: m.group(1) + str(n), s)
        if not k:
            print(f"aviso: {clave} no está en el registro de core.js", file=sys.stderr)
    core.write_text(s, encoding="utf-8", newline="\n")


def main():
    ficheros = sorted(CONTENIDO.glob("*.html"))
    if len(sys.argv) > 1:
        ficheros = [f for f in ficheros if any(a in f.name for a in sys.argv[1:])]
    errores, totales = 0, {}
    for f in ficheros:
        try:
            salida, nej, nsage, tot = generar(f)
            totales.update(tot)
            print(f"{salida:38} {nej:4} ejercicios {nsage:4} celdas Sage")
        except (ErrorContenido, json.JSONDecodeError, KeyError) as e:
            errores += 1
            print(f"ERROR en {f.name}: {e}", file=sys.stderr)
    sincronizar_registro(totales)
    sys.exit(1 if errores else 0)


if __name__ == "__main__":
    main()
