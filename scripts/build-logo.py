#!/usr/bin/env python3
"""Regenera los iconos de la app a partir del logo oficial (brand/logo-original.jpg).

El logo está diseñado para fondo claro, así que se usa tal cual sobre una tarjeta blanca.
Si algún día hay una versión mayor o en vector, reemplaza brand/logo-original.* y vuelve a ejecutar:
    python3 scripts/build-logo.py
Requiere Pillow.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "brand" / "logo-original.jpg"
PUB = ROOT / "public"
WHITE = (255, 255, 255)

src = Image.open(SRC).convert("RGB")
w, h = src.size

# 1) Caja del logo: todo lo que no es el blanco de fondo.
px = src.load()
xs, ys = [], []
for y in range(h):
    for x in range(w):
        if min(px[x, y]) < 205:
            xs.append(x); ys.append(y)
box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
logo = src.crop(box)
print("logo:", logo.size, "caja:", box)


def master(side: int, fill: float) -> Image.Image:
    """Lienzo blanco cuadrado con el logo centrado, ocupando `fill` del lado (por la altura)."""
    scale = side * fill / logo.height
    size = (round(logo.width * scale), round(logo.height * scale))
    big = logo.resize(size, Image.LANCZOS)
    if scale > 1:  # al agrandar se pierde nitidez: un poco de máscara de enfoque
        big = big.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    canvas = Image.new("RGB", (side, side), WHITE)
    canvas.paste(big, ((side - size[0]) // 2, (side - size[1]) // 2))
    return canvas


def rounded(img: Image.Image, radius_ratio: float = 0.22) -> Image.Image:
    img = img.convert("RGBA")
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *img.size), radius=round(img.width * radius_ratio), fill=255)
    img.putalpha(mask)
    return img


# 2) Iconos de la app instalable
rounded(master(192, 0.74)).save(PUB / "icon-192.png")
rounded(master(512, 0.74)).save(PUB / "icon-512.png")
master(512, 0.56).save(PUB / "icon-maskable-512.png")   # fondo a sangre; el logo cabe en la zona segura de Android
master(180, 0.70).save(PUB / "apple-touch-icon.png")    # iOS redondea solo las esquinas
rounded(master(64, 0.78), 0.2).save(PUB / "favicon-64.png")

# 3) Logo dentro de la app (WebP, tarjeta blanca de esquinas redondas)
rounded(master(256, 0.76)).save(PUB / "logo.webp", "WEBP", quality=92, method=6)
print("listo")
