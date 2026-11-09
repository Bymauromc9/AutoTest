#!/usr/bin/env python3
"""Genera los iconos de la app instalable (PWA) en assets/img/, sin dependencias.

    python3 scripts/pwa/iconos.py

El dibujo es el del favicon (assets/img/favicon.svg): el símbolo ⊨ en blanco sobre el azul de acento.
  icon-192.png, icon-512.png    esquinas redondeadas («any»: escritorio, lista de apps)
  icon-maskable-512.png         a sangre, con el símbolo dentro de la zona segura (Android lo recorta)
  apple-touch-icon.png          180 px a sangre (iOS redondea las esquinas)
  badge-96.png                  sólo el símbolo, blanco sobre transparente (barra de notificaciones de Android)
Se dibuja a 4× y se reduce para suavizar los bordes.
"""
import struct
import zlib
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = RAIZ / "assets" / "img"
AZUL = (0x25, 0x63, 0xC0)
BLANCO = (255, 255, 255)
SS = 4  # supermuestreo


def dentro_redondeado(x, y, x0, y0, w, h, r):
    """¿El punto (x, y) cae dentro del rectángulo de esquinas redondeadas?"""
    if x < x0 or y < y0 or x >= x0 + w or y >= y0 + h:
        return False
    cx = min(max(x, x0 + r), x0 + w - r)
    cy = min(max(y, y0 + r), y0 + h - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def icono(tam, fondo=True, redondo=False, escala=1.0):
    n = tam * SS
    # Símbolo ⊨ en una caja de 100×100 centrada y escalada (las mismas proporciones que el favicon).
    barras = [(29, 24, 8, 52), (37, 38, 35, 8), (37, 54, 35, 8)]
    k = n / 100 * escala
    off = (n - 100 * k) / 2
    rects = [(off + x * k, off + y * k, w * k, h * k, 2 * k) for x, y, w, h in barras]
    radio = n * 0.22 if redondo else 0
    filas = []
    for py in range(tam):
        fila = bytearray()
        for px in range(tam):
            acc = [0, 0, 0, 0]
            for sy in range(SS):
                for sx in range(SS):
                    x, y = px * SS + sx + 0.5, py * SS + sy + 0.5
                    if any(dentro_redondeado(x, y, *r) for r in rects):
                        c, a = BLANCO, 255
                    elif fondo and (not redondo or dentro_redondeado(x, y, 0, 0, n, n, radio)):
                        c, a = AZUL, 255
                    else:
                        c, a = (0, 0, 0), 0
                    acc[0] += c[0] * a; acc[1] += c[1] * a; acc[2] += c[2] * a; acc[3] += a
            m = SS * SS
            alfa = acc[3] / m
            if alfa:
                fila += bytes((round(acc[0] / acc[3]), round(acc[1] / acc[3]), round(acc[2] / acc[3]), round(alfa)))
            else:
                fila += b"\0\0\0\0"
        filas.append(b"\0" + bytes(fila))
    return png(tam, tam, b"".join(filas))


def png(w, h, datos):
    def trozo(tipo, d):
        return struct.pack(">I", len(d)) + tipo + d + struct.pack(">I", zlib.crc32(tipo + d) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + trozo(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + trozo(b"IDAT", zlib.compress(datos, 9)) + trozo(b"IEND", b""))


if __name__ == "__main__":
    SALIDA.mkdir(parents=True, exist_ok=True)
    for nombre, tam, kw in [
        ("icon-192.png", 192, dict(redondo=True, escala=0.9)),
        ("icon-512.png", 512, dict(redondo=True, escala=0.9)),
        ("icon-maskable-512.png", 512, dict(escala=0.62)),
        ("apple-touch-icon.png", 180, dict(escala=0.85)),
        ("badge-96.png", 96, dict(fondo=False, escala=1.1)),
    ]:
        (SALIDA / nombre).write_bytes(icono(tam, **kw))
        print("escrito", SALIDA / nombre)
