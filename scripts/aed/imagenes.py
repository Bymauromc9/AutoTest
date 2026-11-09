#!/usr/bin/env python3
"""
scripts/aed/imagenes.py — prepara las imágenes de las diapositivas que usan las guías de AED I (aed/img/*.webp).

    python3 scripts/aed/imagenes.py CARPETA [--todas]

CARPETA tiene los PDF de la teoría: tema0.pdf … tema4.pdf (las presentaciones de clase exportadas a PDF, p. ej.
con «soffice --headless --convert-to pdf temaN.pptx») y tema1-grupo3.pdf … tema4-grupo3.pdf (los apuntes del
grupo 3). Busca en scripts/aed/contenido/ las <fig src="…"> y convierte sólo esas páginas: «t2-39» es la
diapositiva 39 del tema 2 y «g3-t2-40», la página 40 de los apuntes del grupo 3 del tema 2.
Las que ya existen no se vuelven a hacer (salvo con --todas). Necesita pdftoppm (poppler-utils) y Pillow.
Las imágenes quedan a 960 px de ancho en WebP.
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
CONTENIDO = Path(__file__).resolve().parent / "contenido"
SALIDA = RAIZ / "aed" / "img"
ANCHO = 960


def usadas():
    out = set()
    for f in CONTENIDO.glob("*.html"):
        out.update(re.findall(r'<fig\s[^>]*src="([^"]+)"', f.read_text(encoding="utf-8")))
    return sorted(out)


def main():
    args = [a for a in sys.argv[1:] if a != "--todas"]
    if len(args) != 1:
        sys.exit(__doc__)
    carpeta, todas = Path(args[0]), "--todas" in sys.argv
    SALIDA.mkdir(parents=True, exist_ok=True)
    for src in usadas():
        m = re.fullmatch(r"(g3-)?t(\d)-(\d+)", src)
        if not m:
            print("nombre raro, se salta:", src, file=sys.stderr)
            continue
        if (SALIDA / f"{src}.webp").exists() and not todas:
            continue
        pdf = carpeta / (f"tema{m.group(2)}-grupo3.pdf" if m.group(1) else f"tema{m.group(2)}.pdf")
        pag = int(m.group(3))
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(["pdftoppm", "-r", "150", "-png", "-f", str(pag), "-l", str(pag), "-singlefile",
                            str(pdf), str(Path(tmp) / "p")], check=True)
            im = Image.open(Path(tmp) / "p.png").convert("RGB")
            im = im.resize((ANCHO, round(im.height * ANCHO / im.width)), Image.LANCZOS)
            im.save(SALIDA / f"{src}.webp", "WEBP", quality=80, method=6)
        print(src)


if __name__ == "__main__":
    main()
