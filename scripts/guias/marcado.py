"""
scripts/guias/marcado.py — piezas comunes de los generadores de guías (scripts/amd/generar.py y
scripts/aed/generar.py). Sólo usa la biblioteca estándar.

Cada fichero de contenido es HTML con unas pocas etiquetas cortas que se convierten en el marcado de las
guías (assets/css/guia.css). Empieza con un comentario con los datos de la página en JSON:

    <!--{"salida": "aed/teoria/guia.html", "titulo": "Guía de teoría", …}-->

Etiquetas comunes
    <tema id="t1" n="1" t="Título" lede="Entradilla" eyebrow="Tema 1">…</tema>   bloque del índice
    <ap id="t1-1" n="1.1" t="Título">…</ap>                                       apartado (topic)
    <ej id="h1-1a" n="Ejercicio 1 (a)" t="Título">enunciado <sol>resolución</sol></ej>   ejercicio con «Hecho»
    <box k="tip|warn|def" t="Título">…</box>   <deep t="Título">…</deep>   <res>resultado</res>
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
FUENTES = ("https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14."
           ".32,500;0,14..32,600;1,14..32,400&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+Math&display=swap")


class ErrorContenido(Exception):
    pass


# Atributos de una etiqueta: k="v", k='v' o banderas sueltas, con «>» permitido entre comillas (p. ej. «h1 > h2»).
# Lo usan las etiquetas propias de cada generador; las comunes (<tema>, <ap>, <ej>, <box>, <deep>) acaban en el
# primer «>», así que en sus atributos no se escribe «>» (se pone &gt;).
ATR = r"""((?:\s+[\w-]+(?:="[^"]*"|='[^']*')?)*)\s*"""


def attrs(texto):
    """Atributos de una etiqueta corta: k="v" o banderas sueltas (det, sm)."""
    out = {}
    for m in re.finditer(r"""([\w-]+)(?:="([^"]*)"|='([^']*)')?""", texto or ""):
        v = m.group(2) if m.group(2) is not None else m.group(3)
        out[m.group(1)] = v if v is not None else True
    return out


def leer(fichero):
    """(datos de la página, cuerpo sin el comentario inicial ni los comentarios del autor)."""
    texto = fichero.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--(.*?)-->", texto, flags=re.S)
    if not m:
        raise ErrorContenido(fichero.name + ": falta el comentario inicial con los datos de la página")
    meta = json.loads(m.group(1))
    cuerpo = re.sub(r"<!--.*?-->", "", texto[m.end():], flags=re.S)   # los comentarios no van a la web
    return meta, cuerpo


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
    """<ej> → tarjeta con «Hecho» y resolución plegable. cuadernos: añade el cuaderno de SageMath (AMD)."""
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
            sol = f'<details class="sol"><summary>{a.get("sol", "Resolución explicada")}</summary><div class="sol-body">{ms.group(1)}</div></details>'
            cuerpo = cuerpo[:ms.start()] + cuerpo[ms.end():]
        titulo = f' <span class="card-title">· {a["t"]}</span>' if a.get("t") else ""
        nb = f'<div class="sage-nb" data-nb="{eid}"></div>' if cuadernos and a.get("cuaderno") != "no" else ""
        return (f'<article class="card ex" data-tema="{tema_id}" id="e-{eid}"><div class="card-head">'
                f'<span class="card-num">{a.get("n", "Ejercicio")}{titulo}</span><span class="card-tools">'
                f'<label class="done" for="d-{eid}"><input data-key="{eid}" id="d-{eid}" type="checkbox"><span>Hecho</span></label>'
                f'</span></div><div class="card-body">{cuerpo}{nb}{sol}</div></article>')
    return re.sub(r"<ej(\s[^>]*)>(.*?)</ej>", ej, s, flags=re.S)


def estructura(s, con_ejercicios, cuadernos=False):
    """Temas, apartados y ejercicios → (HTML, índice lateral, número de ejercicios)."""
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


def compactar(s):
    """HTML compacto (como el resto de guías): sin saltos entre etiquetas ni líneas vacías."""
    s = re.sub(r">\s*\n\s*<", "><", s.strip())
    return re.sub(r"\n{2,}", "\n", s)


def comprobar_restos(nombre, s, etiquetas):
    restos = re.findall(r"</?(?:" + "|".join(etiquetas) + r")[\s>]", s)
    if restos:
        raise ErrorContenido(nombre + ": etiquetas sin convertir: " + ", ".join(sorted(set(restos))))


def totales(meta, s, total_ej):
    """Totales que van al registro de core.js: ejercicios de la página y apartados de la guía."""
    body = meta.get("body", {})
    out = {}
    if total_ej:
        out[body["data-storage-key"]] = total_ej
    if body.get("data-estudio-key"):
        out[body["data-estudio-key"]] = s.count('<section class="topic"')
    return out


def sincronizar_registro(tot):
    """Pone en el registro de assets/js/core.js el total de ejercicios / apartados de cada página."""
    core = RAIZ / "assets" / "js" / "core.js"
    s = core.read_text(encoding="utf-8")
    for clave, n in tot.items():
        s, k = re.subn(r'(key: "' + re.escape(clave) + r'",[^}]*?total: )\d+', lambda m: m.group(1) + str(n), s)
        if not k:
            print(f"aviso: {clave} no está en el registro de core.js", file=sys.stderr)
    core.write_text(s, encoding="utf-8", newline="\n")
