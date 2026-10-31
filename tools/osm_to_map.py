"""Convierte un .osm de OpenStreetMap en el mapa del juego (docs/map.bin).

  python3 tools/osm_to_map.py data/centro.osm docs/map.bin [preview.png]

Escala: 1 tile = 2 m. El resultado es un único archivo comprimido con:
  - tiles (tipo de piso por celda), líneas pintadas, calle y zona de cada celda, edificio de cada celda
  - datos de cada edificio (pisos, techo, colores, si es local), árboles, carteles y nombres
"""
import json, math, random, struct, sys, zlib
import xml.etree.ElementTree as ET
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

M_PER_TILE = 2.0
# tipos de tile (iguales a VR.T en src/world/tiles.js)
GRASS, ROAD, SIDEWALK, BUILDING, PAVING, TREE, MONUMENT, DIRT, WATER = range(9)
# ancho de calzada y de vereda (en tiles) según el tipo de calle
ROADS = {
    'trunk': (6, 2), 'primary': (6, 2), 'secondary': (5, 1.5), 'tertiary': (5, 1.5),
    'residential': (4, 1.5), 'unclassified': (4, 1.5), 'living_street': (3, 1), 'service': (2.5, 0),
}
PATHS = {'footway': 1.5, 'pedestrian': 2, 'path': 1, 'track': 2}
MAIN = ('trunk', 'primary', 'secondary', 'tertiary')
ROOF_TYPES = ['teja', 'chapa', 'losa']
# lugares que se marcan a mano porque OSM no los tiene como área
PARQUE_OG = {'name': 'Parque Manuel Ortiz Guerrero', 'lat': -25.78300, 'lon': -56.43995}
# lugares destacados: se les pone cartel y colores propios
LANDMARKS = {
    'Catedral de Villarrica': {'floors': 3, 'roof': 'teja', 'roofc': 1, 'wallc': 8, 'label': 'Catedral'},
    'Municipalidad de Villarrica': {'floors': 2, 'roof': 'losa', 'roofc': 0, 'wallc': 9, 'label': 'Municipalidad'},
    'Gobernacion del Guaira': {'floors': 2, 'roof': 'losa', 'roofc': 0, 'wallc': 9, 'label': 'Gobernación'},
    'Palacio de Justicia': {'floors': 2, 'roof': 'losa', 'roofc': 1, 'wallc': 4, 'label': 'Palacio de Justicia'},
    'Terminal de Omnibus': {'floors': 1, 'roof': 'chapa', 'roofc': 0, 'wallc': 4, 'label': 'Terminal de Ómnibus'},
    'MERCADO 1': {'floors': 1, 'roof': 'chapa', 'roofc': 1, 'wallc': 1, 'label': 'Mercado 1', 'shop': 1},
    'Mercado 2': {'floors': 1, 'roof': 'chapa', 'roofc': 1, 'wallc': 1, 'label': 'Mercado 2', 'shop': 1},
    'Club El Porvenir Guaireño': {'floors': 1, 'roof': 'chapa', 'roofc': 2, 'wallc': 3, 'label': 'Club Porvenir Guaireño'},
    'Don Bosco': {'floors': 2, 'roof': 'teja', 'roofc': 0, 'wallc': 0, 'label': 'Colegio Don Bosco'},
}
N_WALLS, N_ROOFS, N_AWN = 8, 3, 4  # cantidad de colores comunes en la paleta de JS


def main(src, out, preview=None):
    rnd = random.Random(2006)
    root = ET.parse(src).getroot()
    b = root.find('bounds').attrib
    mnla, mxla, mnlo, mxlo = (float(b[k]) for k in ('minlat', 'maxlat', 'minlon', 'maxlon'))
    kx = 111320 * math.cos(math.radians((mnla + mxla) / 2)) / M_PER_TILE
    ky = 110570 / M_PER_TILE
    W, H = int((mxlo - mnlo) * kx), int((mxla - mnla) * ky)
    proj = lambda lat, lon: ((lon - mnlo) * kx, (mxla - lat) * ky)
    nodes = {n.get('id'): proj(float(n.get('lat')), float(n.get('lon'))) for n in root.iter('node')}
    ways = []
    for w in root.iter('way'):
        tags = {t.get('k'): t.get('v') for t in w.findall('tag')}
        pts = [nodes[n.get('ref')] for n in w.findall('nd') if n.get('ref') in nodes]
        if len(pts) >= 2:
            ways.append((tags, pts))
    print('mapa %d x %d tiles (%d x %d m), %d vías' % (W, H, W * 2, H * 2, len(ways)))

    def canvas(mode='L'):
        im = Image.new(mode, (W, H), 0)
        return im, ImageDraw.Draw(im)

    def poly(draw, pts, val):
        if len(pts) >= 3:
            draw.polygon([(x - 0.5, y - 0.5) for x, y in pts], fill=val)

    def line(draw, pts, val, width):
        pts = [(x - 0.5, y - 0.5) for x, y in pts]
        draw.line(pts, fill=val, width=max(1, int(round(width))), joint='curve')
        r = width / 2
        for x, y in (pts[0], pts[-1]):
            draw.ellipse([x - r, y - r, x + r, y + r], fill=val)

    # ---------- áreas ----------
    wood_im, wd = canvas()
    water_im, wa = canvas()
    park_im, pd = canvas()
    bld_im, bd = canvas('I')
    parks, buildings = [], []
    for tags, pts in ways:
        if tags.get('natural') == 'wood' or tags.get('landuse') in ('forest', 'grass', 'meadow'):
            poly(wd, pts, 1)
        if tags.get('natural') == 'water':
            poly(wa, pts, 1)
        if tags.get('leisure') in ('park', 'garden'):
            parks.append({'name': tags.get('name') or 'Plaza', 'named': bool(tags.get('name')), 'pts': pts})
            poly(pd, pts, len(parks))
    for tags, pts in ways:
        if 'building' in tags:
            buildings.append({'tags': tags, 'pts': pts})
            poly(bd, pts, len(buildings))

    # ---------- calles ----------
    side_im, sd = canvas()
    road_im, rd = canvas()
    path_im, ptd = canvas()
    street_im, std = canvas()
    line_im, ld = canvas()
    cover = np.zeros((H, W), np.uint8)
    names = []
    drive = [(t, p) for t, p in ways if t.get('highway') in ROADS and t.get('area') != 'yes']
    drive.sort(key=lambda tp: 1 if tp[0]['highway'] in MAIN else 0)  # las principales al final: ganan en las esquinas
    for tags, pts in drive:
        rw, sw = ROADS[tags['highway']]
        if sw:
            line(sd, pts, 1, rw + 2 * sw)
    for tags, pts in drive:
        rw, sw = ROADS[tags['highway']]
        line(rd, pts, 1, rw)
        one, od = canvas()
        line(od, pts, 1, rw)
        cover += np.asarray(one, np.uint8)
        nm = tags.get('name')
        if nm:
            nm = nm.replace('Blás', 'Blas')
            if nm not in names:
                names.append(nm)
            line(std, pts, names.index(nm) + 1, rw + 2 * max(sw, 1.5))
        if tags['highway'] in MAIN:  # línea amarilla del medio
            for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
                ld.line([(x0 - 0.5, y0 - 0.5), (x1 - 0.5, y1 - 0.5)], fill=1 if abs(x1 - x0) >= abs(y1 - y0) else 2, width=1)
    for tags, pts in ways:
        if tags.get('highway') in PATHS:
            line(ptd, pts, 1 if tags['highway'] != 'track' else 2, PATHS[tags['highway']])

    A = lambda im: np.asarray(im).copy()
    wood, water, park, bid = A(wood_im), A(water_im), A(park_im), A(bld_im).astype(np.int32)
    side, road, path, street, lines = A(side_im), A(road_im), A(path_im), A(street_im), A(line_im)

    # ---------- composición ----------
    tiles = np.full((H, W), GRASS, np.uint8)
    # manchas de tierra colorada en los patios (ruido suave: grilla gruesa al azar, interpolada)
    g = np.random.default_rng(11).random((H // 7 + 2, W // 7 + 2))
    yy, xx = np.mgrid[0:H, 0:W] / 7.0
    x0, y0 = xx.astype(int), yy.astype(int)
    fx, fy = xx - x0, yy - y0
    noise = (g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx) * (1 - fy) + (g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx) * fy
    tiles[noise > 0.74] = DIRT
    tiles[park > 0] = GRASS
    tiles[wood > 0] = GRASS
    tiles[path == 2] = DIRT
    tiles[path == 1] = PAVING
    tiles[water > 0] = WATER
    paved = (side > 0) | (road > 0)
    bid[paved | (water > 0)] = 0
    # edificios muy chicos después de recortar: afuera
    counts = np.bincount(bid.ravel(), minlength=len(buildings) + 1)
    small = np.where(counts < 3)[0]
    bid[np.isin(bid, small[small > 0])] = 0
    tiles[bid > 0] = BUILDING
    tiles[side > 0] = SIDEWALK
    tiles[road > 0] = ROAD
    line = np.where((road > 0) & (cover == 1), lines, 0).astype(np.uint8)
    # sin línea amarilla cerca de las esquinas
    inter = (cover >= 2)
    near = np.zeros_like(inter)
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            if abs(dx) + abs(dy) <= 3:
                near |= np.roll(np.roll(inter, dy, 0), dx, 1)
    line[(road > 0) & (cover == 1) & near] = 0
    area = np.zeros((H, W), np.uint8)
    area_names = []
    trees, decals, labels = [], [], []

    def ok_tree(x, y, spacing):
        return all(abs(t[0] - x) + abs(t[1] - y) >= spacing for t in trees[-400:])

    # ---------- plazas ----------
    for i, p in enumerate(parks):
        m = park == i + 1
        m &= (tiles == GRASS) | (tiles == DIRT)
        ys, xs = np.nonzero(m)
        if len(xs) < 20:
            continue
        area_names.append(p['name'])
        area[m] = len(area_names)
        cx, cy = int(xs.mean()), int(ys.mean())
        hw, hh = (xs.max() - xs.min()) / 2, (ys.max() - ys.min()) / 2
        big = len(xs) > 500
        for x, y in zip(xs, ys):
            border = any(not m[y + dy, x + dx] if 0 <= y + dy < H and 0 <= x + dx < W else True
                         for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2)) if big or abs(dx) + abs(dy) == 1)
            dx, dy = x - cx, y - cy
            cross = abs(dx) <= (1 if big else 0) or abs(dy) <= (1 if big else 0)
            diag = big and min(abs(dx * hh - dy * hw), abs(dx * hh + dy * hw)) <= 0.9 * max(hw, hh)
            ring = big and max(abs(dx), abs(dy)) <= 4
            tiles[y, x] = PAVING if (border or cross or diag or ring) else GRASS
        if 'Héroes' in p['name']:
            for y in range(cy - 1, cy + 1):
                for x in range(cx - 1, cx + 1):
                    tiles[y, x] = MONUMENT
            decals.append({'kind': 'monumento', 'x': cx - 1, 'y': cy - 1, 'w': 2, 'h': 2})
        for x, y in sorted(zip(xs, ys), key=lambda q: rnd.random()):
            if tiles[y, x] == GRASS and rnd.random() < 0.55 and ok_tree(x, y, 4):
                trees.append((int(x), int(y), rnd.randint(10, 13), 3 if rnd.random() < 0.3 else rnd.randint(0, 1)))
        if p['named']:
            labels.append({'text': p['name'], 'x': int(cx * 16 + 8), 'y': int(ys.min() * 16 - 4)})

    # ---------- Parque Manuel Ortiz Guerrero (a mano: OSM solo tiene la laguna) ----------
    sx, sy = proj(PARQUE_OG['lat'], PARQUE_OG['lon'])
    sx, sy = int(sx), int(sy)
    if 0 <= sx < W and 0 <= sy < H:
        seen = np.zeros((H, W), bool)
        q = deque([(sx, sy)]); seen[sy, sx] = True; region = []
        while q and len(region) < 9000:
            x, y = q.popleft(); region.append((x, y))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and not seen[ny, nx] and tiles[ny, nx] not in (ROAD, SIDEWALK):
                    seen[ny, nx] = True; q.append((nx, ny))
        area_names.append(PARQUE_OG['name'])
        wmask = tiles == WATER
        dil = wmask.copy()
        for _ in range(2):
            d2 = dil.copy()
            d2[1:] |= dil[:-1]; d2[:-1] |= dil[1:]; d2[:, 1:] |= dil[:, :-1]; d2[:, :-1] |= dil[:, 1:]
            dil = d2
        for x, y in region:
            area[y, x] = len(area_names)
            if tiles[y, x] in (GRASS, DIRT):
                edge = any(not (0 <= x + dx < W and 0 <= y + dy < H) or tiles[y + dy, x + dx] in (ROAD, SIDEWALK)
                           for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                tiles[y, x] = PAVING if (edge or dil[y, x]) else GRASS
        for x, y in sorted(region, key=lambda q: rnd.random()):
            if tiles[y, x] == GRASS and rnd.random() < 0.6 and ok_tree(x, y, 3):
                trees.append((x, y, rnd.randint(10, 14), rnd.choice([0, 1, 1, 3])))
        ys = [y for _, y in region]
        labels.append({'text': PARQUE_OG['name'], 'x': sx * 16, 'y': (min(ys) + 2) * 16})
        print('parque Ortiz Guerrero: %d tiles' % len(region))

    # ---------- árboles en montes y patios ----------
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if tiles[y, x] not in (GRASS, DIRT) or area[y, x]:
                continue
            nb = tiles[y - 1:y + 2, x - 1:x + 2]
            if (nb == ROAD).any() or (nb == SIDEWALK).any() or (nb == BUILDING).any() or (nb == WATER).any():
                continue
            if wood[y, x] and rnd.random() < 0.5 and ok_tree(x, y, 3):
                trees.append((x, y, rnd.randint(9, 13), rnd.randint(0, 2)))
            elif not wood[y, x] and rnd.random() < 0.05 and ok_tree(x, y, 5):
                trees.append((x, y, rnd.randint(8, 12), 3 if rnd.random() < 0.15 else rnd.randint(0, 2)))
    for x, y, _, _ in trees:
        tiles[y, x] = TREE

    # ---------- edificios: renumerar y datos ----------
    ids = np.unique(bid[bid > 0])
    remap = np.zeros(len(buildings) + 1, np.int32)
    remap[ids] = np.arange(1, len(ids) + 1)
    bid = remap[bid]
    bdata = []
    main_street = set(i + 1 for i, n in enumerate(names) if any(k in n for k in ('Mariscal López', 'General Díaz', 'Alejo García', 'Carlos António López', 'Natalicio Talavera', 'Humaitá')))
    for new, old in enumerate(ids, 1):
        tags = buildings[old - 1]['tags']
        ys, xs = np.nonzero(bid == new)
        # ¿da a una calle comercial?
        y1 = ys.max()
        below = street[min(H - 1, y1 + 2), int(xs.mean())]
        lm = LANDMARKS.get(tags.get('name', ''))
        try:
            floors = int(float(tags.get('building:levels', '0')))
        except ValueError:
            floors = 0
        if lm:
            floors, rt, rc, wc, shop = lm['floors'], ROOF_TYPES.index(lm['roof']), N_ROOFS + lm['roofc'], lm['wallc'], lm.get('shop', 0)
            labels.append({'text': lm['label'], 'x': int(xs.mean() * 16 + 8), 'y': int(ys.min() * 16 - 12)})
        else:
            if not floors:
                floors = 1 if rnd.random() < 0.7 else 2 if rnd.random() < 0.85 else 3
            rt = rnd.choice([0, 0, 1, 2])
            rc, wc = rnd.randrange(N_ROOFS), rnd.randrange(N_WALLS)
            shop = 1 if (tags.get('shop') or tags.get('amenity') in ('bank', 'pharmacy', 'restaurant', 'cafe') or
                         (below in main_street and rnd.random() < 0.6) or rnd.random() < 0.12) else 0
        floors = max(1, min(4, floors))
        bdata += [int(xs.min()), int(xs.max()), floors, rt, rc, wc, shop, rnd.randrange(N_AWN)]

    # ---------- punto de inicio: vereda al sur de la Plaza de los Héroes ----------
    spawn = {'x': W * 8, 'y': H * 8}
    for p, i in zip(parks, range(len(parks))):
        if 'Héroes' in p['name']:
            ys, xs = np.nonzero(park == i + 1)
            cx, y = int(xs.mean()), int(ys.max())
            while y < H - 1 and tiles[y, cx] != SIDEWALK:
                y += 1
            while y < H - 1 and tiles[y + 1, cx] == SIDEWALK:
                y += 1
            spawn = {'x': cx * 16 + 8, 'y': y * 16 + 6}

    # ---------- empaquetar ----------
    meta = {'w': W, 'h': H, 'streets': names, 'areas': area_names, 'labels': labels, 'decals': decals,
            'spawn': spawn, 'nb': len(ids), 'nt': len(trees), 'bounds': [mnla, mnlo, mxla, mxlo],
            'credit': '© colaboradores de OpenStreetMap (ODbL)'}
    js = json.dumps(meta, ensure_ascii=False).encode()
    tarr = np.array([v for t in trees for v in t], np.uint16)
    payload = (struct.pack('<I', len(js)) + js + tiles.tobytes() + line.tobytes() + street.astype(np.uint8).tobytes()
               + area.tobytes() + bid.astype('<u2').tobytes() + np.array(bdata, '<u2').tobytes() + tarr.astype('<u2').tobytes())
    comp = zlib.compressobj(9, zlib.DEFLATED, -15)
    data = comp.compress(payload) + comp.flush()
    open(out, 'wb').write(data)
    print('%s: %d edificios, %d árboles, %d calles con nombre, %d bytes (%d sin comprimir)' %
          (out, len(ids), len(trees), len(names), len(data), len(payload)))

    if preview:
        pal = np.array([(92, 158, 58), (76, 76, 84), (190, 182, 166), (200, 120, 90), (196, 146, 108),
                        (40, 100, 40), (230, 230, 230), (168, 92, 58), (70, 130, 200)], np.uint8)
        img = pal[tiles]
        img[line > 0] = (226, 191, 69)
        Image.fromarray(img).save(preview)


if __name__ == '__main__':
    main(*sys.argv[1:])
