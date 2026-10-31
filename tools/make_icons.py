"""Genera los íconos (pixel art original): una esquina de plaza vista desde arriba, con un lapacho rosado."""
import pathlib
from PIL import Image, ImageDraw

root = pathlib.Path(__file__).resolve().parent.parent / 'icons'
root.mkdir(exist_ok=True)


def art():
    im = Image.new('RGB', (32, 32), (76, 76, 84))  # asfalto
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 18, 18], fill=(92, 158, 58))  # pasto de la plaza
    d.rectangle([19, 0, 21, 21], fill=(190, 182, 166)); d.rectangle([0, 19, 21, 21], fill=(190, 182, 166))  # vereda
    for y in range(24, 32, 1):
        pass
    for x in range(1, 18, 4):
        d.rectangle([x, 24, x + 1, 30], fill=(232, 230, 224))  # cebra
    d.rectangle([25, 2, 26, 6], fill=(226, 191, 69)); d.rectangle([25, 10, 26, 14], fill=(226, 191, 69))  # línea amarilla
    d.ellipse([3, 4, 17, 17], fill=(30, 50, 20))  # sombra copa
    d.ellipse([1, 1, 15, 15], fill=(196, 82, 158)); d.ellipse([3, 3, 9, 9], fill=(236, 140, 200))  # lapacho
    d.point([(11, 11), (12, 10), (10, 12)], fill=(150, 52, 120))
    # muñequito
    d.rectangle([23, 19, 26, 24], fill=(210, 60, 44)); d.rectangle([23, 15, 26, 18], fill=(201, 139, 92)); d.rectangle([23, 15, 26, 16], fill=(42, 27, 18))
    d.rectangle([23, 25, 24, 27], fill=(44, 62, 107)); d.rectangle([25, 25, 26, 27], fill=(30, 43, 77))
    return im


a = art()
for size in (192, 512):
    a.resize((size, size), Image.NEAREST).save(root / f'icon-{size}.png')
a.resize((64, 64), Image.NEAREST).save(root / 'favicon.png')
m = Image.new('RGB', (512, 512), (15, 15, 18))
m.paste(a.resize((352, 352), Image.NEAREST), (80, 80))
m.save(root / 'maskable-512.png')
print('íconos listos en', root)
