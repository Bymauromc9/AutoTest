#!/usr/bin/env python3
"""
scripts/aed/generar.py — genera las páginas de AED I (aed/**/*.html) a partir de scripts/aed/contenido/.

    python3 scripts/aed/generar.py            (desde la raíz del repo; sólo usa la biblioteca estándar)

Cada fichero de contenido empieza con un comentario con los datos de la página (salida, titulo, descripcion,
eyebrow, h1, ops, lead, marca, sym, body, paginas, pie…) y usa las etiquetas comunes de las guías
(scripts/guias/marcado.py: <tema>, <ap>, <ej>/<sol>, <box>, <deep>, <res>) más estas, propias de AED:

Código
    <code t="Pseudocódigo" lang="pseudo|cpp|maude">…</code>   bloque de código resaltado (sin tocar su contenido)
Diapositivas de clase
    <fig src="t2-39" alt="Texto alternativo">Pie de foto</fig>   aed/img/t2-39.webp (tema 2, diapositiva 39);
                                     «g3-t2-40» es la página 40 de los apuntes del grupo 3 del tema 2
    <figs>…varias <fig>…</figs>                                 en fila cuando hay sitio
Dibujos
    <ab t="Título">13(8(3(*1,),9),23)</ab>     árbol binario: etiqueta(izq,der); un hijo vacío se deja en blanco.
                                               *x nodo nuevo, !x nodo desbalanceado, ~x nodo que se quita;
                                               x^2 anota un número junto al nodo (altura, factor de balanceo…)
    <bt p="4">[37]([9 14]([1 5],[10],[22 25]),[60]([51 55],[70]))</bt>   árbol B de orden p
    <hc>2180|541||33|…</hc>                    tabla de dispersión cerrada (una celda por cubeta; *x resalta,
                                               «#» marca de elemento eliminado)
    <ha b="10">0: 2180; 3: 33 543; …</ha>      tabla de dispersión abierta (cubeta: lista de elementos)
    <arr i="1">5 5 4 5 -2 5</arr>              array con sus índices (empezando en i; *x resalta)
    <gr t="Título">                            grafo: primera línea, los nodos con su posición (nombre@x,y;
    a@0,60 b@90,0 c@90,120                     *x resalta el nodo, !x lo marca); después, las aristas:
    a-b:2 *a>c:3 ~b>c                          u-v no dirigida, u>v dirigida, :etiqueta opcional;
    </gr>                                      *arista resaltada (del árbol, del camino…), ~arista discontinua.
                                               Las aristas entre el mismo par de nodos se curvan solas.
"""
import html
import json
import re
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "guias"))
from marcado import (RAIZ, FUENTES, ATR, ErrorContenido, attrs, cajas, estructura, compactar,   # noqa: E402
                     comprobar_restos, leer, sincronizar_registro, totales)

CONTENIDO = Path(__file__).resolve().parent / "contenido"
IMG = RAIZ / "aed" / "img"
ETIQUETAS = ["tema", "ap", "ej", "sol", "box", "deep", "res", "fig", "figs", "ab", "bt", "hc", "ha", "arr", "gr"]


# ---------------------------------------------------------------- código
PALABRAS = {
    "pseudo": r"operaci[oó]n|operac|si|entonces|sino|finsi|mientras|hacer|finmientras|para|finpara|cada|devolver|tipo|registro|"
              r"finregistro|var|variables|acabar|hasta|NOT|AND|OR|NUEVO|Iterador|TAD|Fin|Operaci[oó]n|Requiere|Modifica|Calcula|"
              r"NOMBRE|CONJUNTOS|SINTAXIS|SEM[AÁ]NTICA|SI|ERROR|Error|finsi|fin_si|fin_mientras|fin_para",
    "cpp": r"int|long|unsigned|double|float|char|bool|void|class|struct|private|public|protected|return|for|while|if|else|new|"
           r"delete|const|using|namespace|template|typename|true|false|NULL|nullptr|auto|friend|operator|this|include|"
           r"string|list|vector|static|inline|do|break|continue",
    "maude": r"fmod|endfm|protecting|including|sorts?|subsorts?|ops?|vars?|eq|ceq|if|then|else|fi|red|in|quit|ctor|comm|assoc",
}


def resaltar(codigo, lang):
    """Resaltado estático: palabras clave (tk-k), cadenas (tk-s) y comentarios (tk-c). Recibe el texto sin escapar."""
    pal = PALABRAS.get(lang)
    comentario = {"maude": r"\*\*\*.*$|---.*$"}.get(lang, r"//.*$")
    partes = []
    for linea in codigo.split("\n"):
        m = re.search(comentario, linea)
        cuerpo, com = (linea[:m.start()], linea[m.start():]) if m else (linea, "")
        trozos = re.split(r'("(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)\')', cuerpo)
        out = []
        for i, t in enumerate(trozos):
            if i % 2:
                out.append(f'<span class="tk-s">{html.escape(t, quote=False)}</span>')
            else:
                t = html.escape(t, quote=False)
                if pal:
                    t = re.sub(r"(?<![\w#])(" + pal + r")(?![\w])", r'<span class="tk-k">\1</span>', t)
                out.append(t)
        if com:
            out.append(f'<span class="tk-c">{html.escape(com, quote=False)}</span>')
        partes.append("".join(out))
    return "\n".join(partes)


def bloques_codigo(s, guardados):
    """Saca los bloques de código antes de procesar nada (no se toca su contenido) y deja una marca."""
    def uno(m):
        a = attrs(m.group(1))
        codigo = html.unescape(m.group(2)).strip("\n")   # se puede escribir «<» o «&lt;»: se escapa al final
        lineas = codigo.split("\n")
        sangria = min((len(l) - len(l.lstrip()) for l in lineas if l.strip()), default=0)
        codigo = "\n".join(l[sangria:] for l in lineas).rstrip()
        lang = a.get("lang", "pseudo")
        titulo = f'<p class="code-t">{a["t"]}</p>' if a.get("t") else ""
        clase = "codeblk" + (" " + a["k"] if a.get("k") else "")
        guardados.append(f'<div class="{clase}">{titulo}<pre><code class="lang-{lang}">{resaltar(codigo, lang)}</code></pre></div>')
        return f"\x00COD{len(guardados) - 1}\x00"
    # Sólo los <code> con atributos son bloques; <code>…</code> a secas es código en línea y se queda como está.
    return re.sub(r"<code" + ATR.replace(")*)", ")+)", 1) + r">(.*?)</code>", uno, s, flags=re.S)


# ---------------------------------------------------------------- diapositivas
def tam_webp(ruta):
    """(ancho, alto) de una imagen WebP leyendo su cabecera (VP8, VP8L o VP8X)."""
    b = ruta.read_bytes()[:30]
    if b[:4] != b"RIFF" or b[8:12] != b"WEBP":
        raise ErrorContenido(f"{ruta.name} no es una imagen WebP")
    tipo = b[12:16]
    if tipo == b"VP8 ":
        w, h = struct.unpack("<HH", b[26:30])
        return w & 0x3FFF, h & 0x3FFF
    if tipo == b"VP8L":
        v = int.from_bytes(b[21:25], "little")
        return (v & 0x3FFF) + 1, ((v >> 14) & 0x3FFF) + 1
    if tipo == b"VP8X":
        return int.from_bytes(b[24:27], "little") + 1, int.from_bytes(b[27:30], "little") + 1
    raise ErrorContenido(f"{ruta.name}: formato WebP desconocido")


def origen_diapositiva(src):
    m = re.fullmatch(r"(g3-)?t(\d)-(\d+)", src)
    if not m:
        raise ErrorContenido("diapositiva con nombre raro: " + src)
    tema, n = m.group(2), int(m.group(3))
    return f"apuntes del grupo 3, tema {tema}, pág. {n}" if m.group(1) else f"tema {tema}, diapositiva {n}"


def figuras(s, root, usadas):
    def fig(m):
        a = attrs(m.group(1))
        src = a.get("src", "")
        ruta = IMG / (src + ".webp")
        if not ruta.exists():
            raise ErrorContenido("no existe la imagen " + str(ruta.relative_to(RAIZ)) + " (genérala con scripts/aed/imagenes.py)")
        usadas.add(src)
        w, h = tam_webp(ruta)
        alt = html.escape(a.get("alt") or re.sub(r"<[^>]+>", "", m.group(2)).strip(), quote=True)
        pie = m.group(2).strip()
        return (f'<figure class="fig slide"><img src="{root}aed/img/{src}.webp" alt="{alt}" loading="lazy" decoding="async" '
                f'width="{w}" height="{h}"><figcaption>{pie}{" " if pie else ""}<span class="slide-src">{origen_diapositiva(src)}</span></figcaption></figure>')
    s = re.sub(r"<fig" + ATR + r">(.*?)</fig>", fig, s, flags=re.S)
    return re.sub(r"<figs>(.*?)</figs>", r'<div class="figs">\1</div>', s, flags=re.S)


# ---------------------------------------------------------------- dibujos: árboles
def leer_binario(texto):
    """'13(8(3,),23)' → nodo {e, izq, der, marca, nota} (o None)."""
    texto = re.sub(r"\s+", "", texto)
    pos = 0

    def nodo():
        nonlocal pos
        if pos >= len(texto) or texto[pos] in ",)":
            return None
        m = re.match(r"([*!~]?)([^(),^]+)(?:\^([^(),]+))?", texto[pos:])
        if not m:
            raise ErrorContenido("árbol mal escrito cerca de: " + texto[pos:pos + 12])
        pos += m.end()
        n = {"e": m.group(2), "marca": m.group(1), "nota": m.group(3), "izq": None, "der": None}
        if pos < len(texto) and texto[pos] == "(":
            pos += 1
            n["izq"] = nodo()
            if texto[pos] != ",":
                raise ErrorContenido("falta la coma entre los hijos en: " + texto)
            pos += 1
            n["der"] = nodo()
            if texto[pos] != ")":
                raise ErrorContenido("falta «)» en: " + texto)
            pos += 1
        return n
    raiz = nodo()
    if pos != len(texto):
        raise ErrorContenido("sobra texto en el árbol: " + texto[pos:])
    return raiz


def svg_binario(texto, titulo):
    raiz = leer_binario(texto)
    nodos, x = [], [0]

    def colocar(n, d):
        if not n:
            return
        colocar(n["izq"], d + 1)
        n["x"], n["y"] = x[0], d
        x[0] += 1
        nodos.append(n)
        colocar(n["der"], d + 1)
    colocar(raiz, 0)
    DX, DY, R, M = 40, 54, 16, 24
    alto = max(n["y"] for n in nodos)
    W, H = (len(nodos) - 1) * DX + 2 * M + 16, alto * DY + 2 * M + 8
    px = lambda n: M + 8 + n["x"] * DX
    py = lambda n: M + 4 + n["y"] * DY
    lineas, circulos = [], []
    for n in nodos:
        for h in (n["izq"], n["der"]):
            if h:
                clase = "ar del" if h["marca"] == "~" else "ar"
                lineas.append(f'<line class="{clase}" x1="{px(n)}" y1="{py(n)}" x2="{px(h)}" y2="{py(h)}"/>')
    for n in nodos:
        clase = {"*": "nd new", "!": "nd bad", "~": "nd del"}.get(n["marca"], "nd")
        e = html.escape(n["e"])
        circulos.append(f'<g class="{clase}"><circle cx="{px(n)}" cy="{py(n)}" r="{R}"/>'
                        f'<text x="{px(n)}" y="{py(n) + 4.5}" text-anchor="middle">{e}</text></g>')
        if n["nota"]:
            circulos.append(f'<text class="nota" x="{px(n) + R + 2}" y="{py(n) - R + 4}">{html.escape(n["nota"])}</text>')
    etiqueta = html.escape(html.unescape(titulo) or "Árbol: " + re.sub(r"[*!~]|\^[^(),]+", "", texto), quote=True)
    cap = f"<figcaption>{titulo}</figcaption>" if titulo else ""
    return (f'<figure class="dg tree"><svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{etiqueta}">'
            f'{"".join(lineas)}{"".join(circulos)}</svg>{cap}</figure>')


def leer_btree(texto):
    texto = texto.strip()
    pos = 0

    def nodo():
        nonlocal pos
        while texto[pos] == " ":
            pos += 1
        if texto[pos] != "[":
            raise ErrorContenido("árbol B mal escrito cerca de: " + texto[pos:pos + 12])
        fin = texto.index("]", pos)
        n = {"k": texto[pos + 1:fin].split(), "h": []}
        pos = fin + 1
        if pos < len(texto) and texto[pos] == "(":
            pos += 1
            while True:
                n["h"].append(nodo())
                if texto[pos] == ",":
                    pos += 1
                    continue
                if texto[pos] == ")":
                    pos += 1
                    break
                raise ErrorContenido("árbol B: falta «,» o «)» en " + texto)
        return n
    raiz = nodo()
    return raiz


def svg_btree(texto, p, titulo):
    raiz = leer_btree(texto)
    huecos = max(p - 1, 1)
    KW, KH, GAP, DY, M = 30, 28, 14, 64, 10
    ancho = huecos * KW

    def colocar(n, d, x0):
        """Coloca el subárbol desde x0 y devuelve hasta dónde llega."""
        n["d"] = d
        if not n["h"]:
            n["x"] = x0
            return x0 + ancho
        x = x0
        for i, h in enumerate(n["h"]):
            x = colocar(h, d + 1, x + (GAP if i else 0))
        n["x"] = (n["h"][0]["x"] + n["h"][-1]["x"]) / 2
        return x
    fin = colocar(raiz, 0, M)
    todos = []

    def recorrer(n):
        todos.append(n)
        for h in n["h"]:
            recorrer(h)
    recorrer(raiz)
    prof = max(n["d"] for n in todos)
    W, H = fin + M, prof * DY + KH + 2 * M
    partes = []
    for n in todos:
        y = M + n["d"] * DY
        for i, h in enumerate(n["h"]):
            partes.append(f'<line class="ar" x1="{n["x"] + i * KW:.1f}" y1="{y + KH}" x2="{h["x"] + ancho / 2:.1f}" y2="{M + h["d"] * DY}"/>')
    for n in todos:
        y = M + n["d"] * DY
        if len(n["k"]) > huecos:
            raise ErrorContenido(f"árbol B de orden {p}: un nodo tiene {len(n['k'])} claves")
        for i in range(huecos):
            k = n["k"][i] if i < len(n["k"]) else ""
            clase = "bk" + (" new" if k.startswith("*") else "") + ("" if k else " vacio")
            k = k.lstrip("*")
            partes.append(f'<g class="{clase}"><rect x="{n["x"] + i * KW:.1f}" y="{y}" width="{KW}" height="{KH}"/>'
                          + (f'<text x="{n["x"] + i * KW + KW / 2:.1f}" y="{y + KH / 2 + 4.5}" text-anchor="middle">{html.escape(k)}</text>' if k else "") + "</g>")
    etiqueta = html.escape(html.unescape(titulo) or f"Árbol B de orden {p}", quote=True)
    cap = f"<figcaption>{titulo}</figcaption>" if titulo else ""
    return (f'<figure class="dg tree btree"><svg viewBox="0 0 {W:.0f} {H}" width="{W:.0f}" height="{H}" role="img" aria-label="{etiqueta}">'
            f'{"".join(partes)}</svg>{cap}</figure>')


# ---------------------------------------------------------------- dibujos: tablas y arrays
def celda(v):
    v = v.strip()
    if v == "#":
        return '<td class="borr" title="Marca de elemento eliminado">✕</td>'
    if v.startswith("*"):
        return f'<td class="hl">{html.escape(v[1:])}</td>'
    return f"<td>{html.escape(v)}</td>" if v else '<td class="vac"></td>'


def tabla_cerrada(a, cuerpo):
    celdas = cuerpo.strip().split("|")
    if a.get("b") and int(a["b"]) != len(celdas):
        raise ErrorContenido(f"la tabla cerrada tiene {len(celdas)} cubetas y b={a['b']}")
    cab = "".join(f"<th>{i}</th>" for i in range(len(celdas)))
    cap = f'<p class="dg-cap">{a["t"]}</p>' if a.get("t") else ""
    return f'<div class="ht">{cap}<table class="fit"><tr>{cab}</tr><tr>{"".join(celda(c) for c in celdas)}</tr></table></div>'


VACIA = '<span class="nil">vacía</span>'


def tabla_abierta(a, cuerpo):
    b = int(a.get("b", 10))
    cubetas = {}
    for trozo in filter(None, (t.strip() for t in cuerpo.split(";"))):
        i, _, resto = trozo.partition(":")
        cubetas[int(i)] = resto.split()
    filas = []
    for i in range(b):
        elems = cubetas.get(i, [])
        lista = "".join(f'<span class="nd{" hl" if e.startswith("*") else ""}">{html.escape(e.lstrip("*"))}</span>' for e in elems)
        filas.append(f'<li><span class="cub">{i}</span>{lista or VACIA}</li>')
    cap = f'<p class="dg-cap">{a["t"]}</p>' if a.get("t") else ""
    return f'<div class="hta">{cap}<ol>{"".join(filas)}</ol></div>'


def array(a, cuerpo):
    vals = cuerpo.split()
    i0 = int(a.get("i", 0))
    cab = "".join(f"<th>{i0 + i}</th>" for i in range(len(vals)))
    cap = f'<p class="dg-cap">{a["t"]}</p>' if a.get("t") else ""
    nombre = f'<th class="nom" rowspan="2">{html.escape(a["n"])}</th>' if a.get("n") else ""
    return f'<div class="ht arr">{cap}<table class="fit"><tr>{nombre}{cab}</tr><tr>{"".join(celda(v) for v in vals)}</tr></table></div>'


# ---------------------------------------------------------------- dibujos: grafos
NODO_GR = re.compile(r"([*!]?)([^@\s]+)@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$")
ARISTA_GR = re.compile(r"([*~]?)([^\s>:-]+)([->])([^\s>:-]+)(?::(\S+))?$")
GRAFOS = [0]   # contador para que cada <svg> tenga sus propios id de marcadores


def svg_grafo(texto, titulo):
    lineas = [l.split() for l in texto.strip().split("\n") if l.strip()]
    if not lineas:
        raise ErrorContenido("grafo vacío")
    nodos = {}
    for tok in lineas[0]:
        m = NODO_GR.match(tok)
        if not m:
            raise ErrorContenido(f"grafo: nodo mal escrito «{tok}» (se espera nombre@x,y)")
        nodos[m.group(2)] = {"marca": m.group(1), "x": float(m.group(3)), "y": float(m.group(4))}
    aristas = []
    for tok in (t for l in lineas[1:] for t in l):
        m = ARISTA_GR.match(tok)
        if not m or m.group(2) not in nodos or m.group(4) not in nodos:
            raise ErrorContenido(f"grafo: arista mal escrita o con un nodo desconocido «{tok}»")
        aristas.append({"marca": m.group(1), "u": m.group(2), "v": m.group(4), "dir": m.group(3) == ">", "et": m.group(5)})
    R, M = 15, 26
    xs = [n["x"] for n in nodos.values()]
    ys = [n["y"] for n in nodos.values()]
    x0, y0 = min(xs) - R - M, min(ys) - R - M
    W, H = max(xs) - x0 + R + M, max(ys) - y0 + R + M
    GRAFOS[0] += 1
    gid = f"g{GRAFOS[0]}"
    pares = {}
    for a in aristas:
        pares.setdefault(tuple(sorted((a["u"], a["v"]))), []).append(a)
    trazos, etiquetas = [], []
    for (p, q), grupo in pares.items():
        for i, a in enumerate(grupo):
            desp = (i - (len(grupo) - 1) / 2) * 30          # separación entre aristas paralelas
            P, Q = nodos[p], nodos[q]
            dx, dy = Q["x"] - P["x"], Q["y"] - P["y"]
            lon = (dx * dx + dy * dy) ** .5 or 1
            nx, ny = -dy / lon, dx / lon                     # normal respecto al sentido p → q
            mx, my = (P["x"] + Q["x"]) / 2, (P["y"] + Q["y"]) / 2
            cx, cy = mx + 2 * desp * nx, my + 2 * desp * ny  # punto de control: el vértice de la curva queda a «desp»
            A, B = nodos[a["u"]], nodos[a["v"]]

            def recorte(ext, ctrl):
                ux, uy = ctrl[0] - ext["x"], ctrl[1] - ext["y"]
                d = (ux * ux + uy * uy) ** .5 or 1
                return ext["x"] + ux / d * R, ext["y"] + uy / d * R
            ax, ay = recorte(A, (cx, cy))
            bx, by = recorte(B, (cx, cy))
            if a["dir"]:   # deja sitio a la punta de la flecha
                ux, uy = bx - cx, by - cy
                d = (ux * ux + uy * uy) ** .5 or 1
                bx, by = bx - ux / d * 2, by - uy / d * 2
            clase = "ed" + {"*": " hl", "~": " dash"}.get(a["marca"], "")
            punta = f' marker-end="url(#{gid}{"h" if a["marca"] == "*" else "n"})"' if a["dir"] else ""
            d_ = (f"M{ax - x0:.1f},{ay - y0:.1f} Q{cx - x0:.1f},{cy - y0:.1f} {bx - x0:.1f},{by - y0:.1f}" if desp
                  else f"M{ax - x0:.1f},{ay - y0:.1f} L{bx - x0:.1f},{by - y0:.1f}")
            trazos.append(f'<path class="{clase}" d="{d_}"{punta}/>')
            if a["et"]:
                ex, ey = mx + desp * nx - x0, my + desp * ny - y0
                etiquetas.append(f'<text class="et{" hl" if a["marca"] == "*" else ""}" x="{ex:.1f}" y="{ey + 4:.1f}" '
                                 f'text-anchor="middle">{html.escape(a["et"])}</text>')
    circulos = []
    for nombre, n in nodos.items():
        clase = {"*": "nd new", "!": "nd bad"}.get(n["marca"], "nd")
        circulos.append(f'<g class="{clase}"><circle cx="{n["x"] - x0:.1f}" cy="{n["y"] - y0:.1f}" r="{R}"/>'
                        f'<text x="{n["x"] - x0:.1f}" y="{n["y"] - y0 + 4.5:.1f}" text-anchor="middle">{html.escape(nombre)}</text></g>')
    defs = ""
    if any(a["dir"] for a in aristas):
        defs = ("<defs>" + "".join(
            f'<marker id="{gid}{k}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse">'
            f'<path class="punta{" hl" if k == "h" else ""}" d="M0,0 L10,5 L0,10 z"/></marker>' for k in "nh") + "</defs>")
    etiqueta = html.escape(html.unescape(titulo) or "Grafo", quote=True)
    cap = f"<figcaption>{titulo}</figcaption>" if titulo else ""
    return (f'<figure class="dg graph"><svg viewBox="0 0 {W:.0f} {H:.0f}" width="{W:.0f}" height="{H:.0f}" role="img" aria-label="{etiqueta}">'
            f'{defs}{"".join(trazos)}{"".join(etiquetas)}{"".join(circulos)}</svg>{cap}</figure>')


def dibujos(s):
    s = re.sub(r"<ab" + ATR + r">(.*?)</ab>", lambda m: svg_binario(m.group(2), attrs(m.group(1)).get("t", "")), s, flags=re.S)
    s = re.sub(r"<bt" + ATR + r">(.*?)</bt>", lambda m: svg_btree(m.group(2), int(attrs(m.group(1)).get("p", 5)), attrs(m.group(1)).get("t", "")), s, flags=re.S)
    s = re.sub(r"<hc" + ATR + r">(.*?)</hc>", lambda m: tabla_cerrada(attrs(m.group(1)), m.group(2)), s, flags=re.S)
    s = re.sub(r"<ha" + ATR + r">(.*?)</ha>", lambda m: tabla_abierta(attrs(m.group(1)), m.group(2)), s, flags=re.S)
    s = re.sub(r"<arr" + ATR + r">(.*?)</arr>", lambda m: array(attrs(m.group(1)), m.group(2)), s, flags=re.S)
    s = re.sub(r"<gr" + ATR + r">(.*?)</gr>", lambda m: svg_grafo(m.group(2), attrs(m.group(1)).get("t", "")), s, flags=re.S)
    return s


# ---------------------------------------------------------------- página
def pagina(meta, cuerpo, toc, total_ej):
    salida = meta["salida"]
    root = "../" * salida.count("/")
    body = {"data-root": root, "data-subject": "aed", "data-title": meta["titulo"]}
    body.update(meta.get("body", {}))
    if total_ej and "data-storage-key" not in body:
        raise ErrorContenido(salida + ": tiene ejercicios pero no data-storage-key")
    body_attrs = " ".join(f'{k}="{html.escape(str(v), quote=True)}"' for k, v in body.items())
    paginas = ""
    if meta.get("paginas"):
        enl = []
        for href, txt in meta["paginas"]:
            actual = ' aria-current="page"' if href == Path(salida).name else ""
            enl.append(f'<a href="{href}"{actual}>{txt}</a>')
        paginas = f'<nav class="aed-pages" aria-label="Páginas de AED I">{"".join(enl)}</nav>'
    soltools = ""
    if total_ej:
        soltools = ('<div class="soltools"><button type="button" class="btn-sol" data-sol="open">Abrir todas las soluciones</button>'
                    '<button type="button" class="btn-sol" data-sol="close">Cerrarlas</button>'
                    f'<span class="soltools-note">{meta.get("nota_sol", "Intenta cada problema antes de abrir su solución y márcalo como hecho.")}</span></div>')
    foot = f'\n    <p class="foot">{meta["pie"]}</p>' if meta.get("pie") else ""
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{meta["titulo"]} · AED I</title>
<meta name="description" content="{html.escape(meta["descripcion"], quote=True)}">
<link rel="icon" href="{root}assets/img/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="{root}manifest.webmanifest">
<link rel="apple-touch-icon" href="{root}assets/img/apple-touch-icon.png">
<meta name="theme-color" content="#F9F8F6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#191919" media="(prefers-color-scheme: dark)">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FUENTES}">
<link rel="stylesheet" href="{root}assets/css/nav.css">
<link rel="stylesheet" href="{root}assets/css/guia.css">
<link rel="stylesheet" href="{root}aed/css/aed.css">
<script src="{root}assets/js/core.js"></script>
</head>
<body {body_attrs}>
<!-- Generado por scripts/aed/generar.py a partir de scripts/aed/contenido/: no lo edites a mano. -->
<a class="skip-link" href="#app">Saltar al contenido</a>
<div class="shell">
  <aside class="side" id="side">
    <div class="side-top">
      <p class="side-brand"><span class="sym">{meta.get("sym", "{ }")}</span> {meta["marca"]}</p>
      <button class="toc-toggle" id="toc-toggle" type="button" aria-expanded="false" aria-controls="side">Índice</button>
    </div>
    <nav class="toc" aria-label="Índice"><p class="toc-label">{meta.get("toc_label", "Partes")}</p><ol class="toc-temas">{toc}</ol></nav>
  </aside>
  <main id="app" tabindex="-1">
<header class="hero"><p class="eyebrow">{meta["eyebrow"]}</p><h1>{meta["h1"]} <span class="ops">{meta.get("ops", "")}</span></h1><p class="lead">{meta["lead"]}</p>{paginas}</header>{soltools}{cuerpo}{foot}
  </main>
</div>
<script src="{root}assets/js/guia.js"></script>
</body>
</html>
"""


def generar(fichero, usadas):
    meta, s = leer(fichero)
    guardados = []
    s = bloques_codigo(s, guardados)
    root = "../" * meta["salida"].count("/")
    s = figuras(s, root, usadas)
    s = dibujos(s)
    s = cajas(s)
    s, toc, total_ej = estructura(s, True)
    s = compactar(s)                     # antes de devolver el código: dentro de <pre> los saltos cuentan
    for i, c in enumerate(guardados):
        s = s.replace(f"\x00COD{i}\x00", c)
    comprobar_restos(fichero.name, s, ETIQUETAS)
    destino = RAIZ / meta["salida"]
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(pagina(meta, s, toc, total_ej), encoding="utf-8", newline="\n")
    tot = totales(meta, s, total_ej)
    if meta.get("ejercicios_en_registro") is False:   # p. ej. los ejemplos resueltos de la guía: no son un recurso
        tot.pop(meta["body"].get("data-storage-key"), None)
    return meta["salida"], total_ej, len(guardados), tot


def main():
    ficheros = sorted(CONTENIDO.glob("*.html"))
    if len(sys.argv) > 1:
        ficheros = [f for f in ficheros if any(a in f.name for a in sys.argv[1:])]
    errores, tot, usadas = 0, {}, set()
    for f in ficheros:
        try:
            salida, nej, ncod, t = generar(f, usadas)
            tot.update(t)
            print(f"{salida:34} {nej:4} ejercicios {ncod:4} bloques de código")
        except (ErrorContenido, json.JSONDecodeError, KeyError, ValueError) as e:
            errores += 1
            print(f"ERROR en {f.name}: {e}", file=sys.stderr)
    sincronizar_registro(tot)
    if len(sys.argv) == 1:   # con todas las páginas: avisa de imágenes que ya no usa ninguna
        sobran = sorted(p.stem for p in IMG.glob("*.webp") if p.stem not in usadas)
        if sobran:
            print("aviso: imágenes sin usar en aed/img: " + ", ".join(sobran), file=sys.stderr)
    sys.exit(1 if errores else 0)


if __name__ == "__main__":
    main()
