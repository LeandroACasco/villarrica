"""Convierte un .osm de OpenStreetMap (y los barrios del INE) en el mapa del juego (docs/map.bin).

  python3 tools/osm_to_map.py data/villarrica.osm.gz docs/map.bin [preview.png]

Escala: 1 tile = 2 m. Pasos:
  1. Proyección a metros y **damero rectificado**: se gira la ciudad para que su grilla quede alineada
     con la pantalla y cada calle casi recta se lleva a una fila o columna fija. Las calles diagonales de
     verdad quedan diagonales. Todo lo demás (edificios, plazas, agua, barrios) se corre con un campo de
     desplazamiento suave que sale de cómo se movieron las calles.
  2. Rasterizado: calles por tipo y por superficie (asfalto, empedrado, tierra), veredas, edificios,
     plazas y parques, agua, montes, árboles, carteles, nombre de calle, de plaza y de barrio por celda.
  3. Un único archivo comprimido con todas las capas.
"""
import gzip, json, math, pathlib, random, struct, sys, zlib
import xml.etree.ElementTree as ET
from collections import defaultdict

import numpy as np
from PIL import Image, ImageDraw

M_PER_TILE = 2.0
ROOT = pathlib.Path(__file__).resolve().parent.parent
BARRIOS = ROOT / 'data/barrios_ine.json'
# tipos de tile (iguales a VR.T en src/world/tiles.js)
GRASS, ROAD, SIDEWALK, BUILDING, PAVING, TREE, MONUMENT, DIRT, WATER, STONE, DIRTROAD = range(11)
# ancho de calzada y de vereda (en tiles) según el tipo de calle
ROADS = {
    'trunk': (6, 2), 'primary': (6, 2), 'secondary': (5, 1.5), 'tertiary': (5, 1.5), 'trunk_link': (4, 1), 'tertiary_link': (4, 1),
    'residential': (4, 1.5), 'unclassified': (4, 1.5), 'living_street': (3, 1), 'service': (2.5, 0),
}
PATHS = {'footway': 1.5, 'pedestrian': 2, 'path': 1, 'track': 2.5}
MAIN = ('trunk', 'primary', 'secondary', 'tertiary')
SNAP_DEG = 10.0     # una calle a menos de esto de la grilla se endereza
MAX_SPREAD = 150.0  # tiles: más que esto (300 m) ya no es una calle recta: se endereza por tramos
ROOF_TYPES = ['teja', 'chapa', 'losa']
BARRIO_NAMES = {'Estacion': 'Estación', 'Santa Lucia': 'Santa Lucía'}
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


def surface_tile(tags):
    s = tags.get('surface', '')
    if s in ('unpaved', 'dirt', 'ground', 'sand', 'earth', 'gravel', 'compacted', 'grass'):
        return DIRTROAD
    if s in ('cobblestone', 'sett', 'paving_stones', 'unhewn_cobblestone'):
        return STONE
    if s in ('asphalt', 'paved', 'concrete'):
        return ROAD
    return ROAD if tags.get('highway') in MAIN else STONE  # sin dato: en Villarrica casi todo es empedrado


# ---------------------------------------------------------------- 1. geometría
class UF:
    def __init__(self): self.p = {}
    def find(self, a):
        p = self.p
        p.setdefault(a, a)
        while p[a] != a:
            p[a] = p[p[a]]; a = p[a]
        return a
    def union(self, a, b): self.p[self.find(a)] = self.find(b)


def rectify(nodes, drive, box):
    """nodes: id -> (x, y) en tiles. drive: listas de ids de nodos de calles. Devuelve nodos nuevos."""
    x0, y0, x1, y1 = box
    inside = lambda q: x0 <= q[0] <= x1 and y0 <= q[1] <= y1
    segs = [(a, b) for w in drive for a, b in zip(w, w[1:]) if a != b and inside(nodes[a]) and inside(nodes[b])]
    # ángulo dominante del damero (media circular de 4θ, pesada por largo), solo con las zonas regulares
    L = np.array([math.dist(nodes[a], nodes[b]) for a, b in segs])
    A = np.array([math.atan2(nodes[b][1] - nodes[a][1], nodes[b][0] - nodes[a][0]) for a, b in segs])
    th = math.atan2((L * np.sin(4 * A)).sum(), (L * np.cos(4 * A)).sum()) / 4
    for _ in range(3):  # refinar ignorando lo que no es damero
        dev = ((A - th) + math.pi / 4) % (math.pi / 2) - math.pi / 4
        k = np.abs(dev) < math.radians(10)
        th = math.atan2((L[k] * np.sin(4 * A[k])).sum(), (L[k] * np.cos(4 * A[k])).sum()) / 4
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    c, s = math.cos(-th), math.sin(-th)
    rot = {i: (cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c) for i, (x, y) in nodes.items()}
    # enderezar: unir nodos de tramos casi horizontales (misma fila) y casi verticales (misma columna)
    uh, uv = UF(), UF()
    tol = math.radians(SNAP_DEG)
    for w in drive:
        for a, b in zip(w, w[1:]):
            if a == b:
                continue
            (xa, ya), (xb, yb) = rot[a], rot[b]
            ang = math.atan2(yb - ya, xb - xa) % math.pi
            if min(ang, math.pi - ang) < tol:
                uh.union(a, b)
            elif abs(ang - math.pi / 2) < tol:
                uv.union(a, b)
    new = dict(rot)
    stats = {'h': 0, 'v': 0, 'split': 0}

    def snap(uf, axis):
        groups = defaultdict(list)
        for n in uf.p:
            groups[uf.find(n)].append(n)
        for g in groups.values():
            other = 1 - axis
            g.sort(key=lambda n: rot[n][other])
            # tramos: se corta cuando la calle se desvía más de MAX_SPREAD
            parts, cur, lo, hi = [], [], None, None
            for n in g:
                v = rot[n][axis]
                if cur and (max(hi, v) - min(lo, v) > MAX_SPREAD):
                    parts.append(cur); cur, lo, hi = [], None, None
                cur.append(n); lo = v if lo is None else min(lo, v); hi = v if hi is None else max(hi, v)
            parts.append(cur)
            stats['split'] += len(parts) - 1
            for part in parts:
                val = float(np.median([rot[n][axis] for n in part]))
                for n in part:
                    q = list(new[n]); q[axis] = val; new[n] = tuple(q)
            stats['h' if axis == 1 else 'v'] += 1

    snap(uh, 1)
    snap(uv, 0)
    return new, rot, math.degrees(th), stats, (cx, cy, c, s)


def displacement_field(moved, rot, w, h, cell=12):
    """Campo de desplazamiento suave (en una grilla gruesa) a partir de los nodos de calles."""
    gw, gh = w // cell + 2, h // cell + 2
    sx, sy, n = np.zeros((gh, gw)), np.zeros((gh, gw)), np.zeros((gh, gw))
    for i, (x, y) in moved.items():
        ox, oy = rot[i]
        gx, gy = int(ox // cell), int(oy // cell)
        if 0 <= gx < gw and 0 <= gy < gh:
            sx[gy, gx] += x - ox; sy[gy, gx] += y - oy; n[gy, gx] += 1
    known = n > 0
    dx = np.where(known, sx / np.maximum(n, 1), 0.0)
    dy = np.where(known, sy / np.maximum(n, 1), 0.0)
    # rellenar huecos y suavizar (difusión), sin tocar mucho las celdas con calles
    for it in range(120):
        px, py = np.pad(dx, 1, mode='edge'), np.pad(dy, 1, mode='edge')
        ax = (px[:-2, 1:-1] + px[2:, 1:-1] + px[1:-1, :-2] + px[1:-1, 2:]) / 4
        ay = (py[:-2, 1:-1] + py[2:, 1:-1] + py[1:-1, :-2] + py[1:-1, 2:]) / 4
        dx = np.where(known, 0.5 * dx + 0.5 * ax, ax)
        dy = np.where(known, 0.5 * dy + 0.5 * ay, ay)

    def at(x, y):
        fx, fy = x / cell - 0.5, y / cell - 0.5
        ix, iy = int(math.floor(fx)), int(math.floor(fy))
        tx, ty = fx - ix, fy - iy
        ix, iy = min(max(ix, 0), gw - 2), min(max(iy, 0), gh - 2)
        d = []
        for F in (dx, dy):
            d.append((F[iy, ix] * (1 - tx) + F[iy, ix + 1] * tx) * (1 - ty) + (F[iy + 1, ix] * (1 - tx) + F[iy + 1, ix + 1] * tx) * ty)
        return d
    return at


def main(src, out, preview=None):
    rnd = random.Random(2006)
    root = ET.parse(gzip.open(src) if str(src).endswith('.gz') else src).getroot()
    b = root.find('bounds').attrib
    mnla, mxla, mnlo, mxlo = (float(b[k]) for k in ('minlat', 'maxlat', 'minlon', 'maxlon'))
    kx = 111320 * math.cos(math.radians((mnla + mxla) / 2)) / M_PER_TILE
    ky = 110570 / M_PER_TILE
    W0, H0 = (mxlo - mnlo) * kx, (mxla - mnla) * ky
    proj = lambda lat, lon: ((lon - mnlo) * kx, (mxla - lat) * ky)
    nodes = {n.get('id'): proj(float(n.get('lat')), float(n.get('lon'))) for n in root.iter('node')}
    raw_ways = []
    for w in root.iter('way'):
        tags = {t.get('k'): t.get('v') for t in w.findall('tag')}
        ids = [n.get('ref') for n in w.findall('nd') if n.get('ref') in nodes]
        if len(ids) >= 2:
            raw_ways.append((tags, ids))
    # multipolígonos (edificios grandes, agua, parques): se usa el anillo exterior más largo
    wayids = {w.get('id'): [n.get('ref') for n in w.findall('nd') if n.get('ref') in nodes] for w in root.iter('way')}
    for r in root.iter('relation'):
        tags = {t.get('k'): t.get('v') for t in r.findall('tag')}
        if tags.get('type') != 'multipolygon':
            continue
        outers = [wayids.get(m.get('ref')) for m in r.findall('member') if m.get('type') == 'way' and m.get('role') == 'outer']
        outers = [o for o in outers if o and len(o) >= 3]
        if outers:
            raw_ways.append((tags, max(outers, key=len)))

    drive = [ids for t, ids in raw_ways if t.get('highway') in ROADS and t.get('area') != 'yes']
    new, rot, ang, st, R = rectify(nodes, drive, (0, 0, W0, H0))
    print('damero girado %.2f°, %d filas y %d columnas enderezadas (%d cortes por tramos)' % (ang, st['h'], st['v'], st['split']))
    road_nodes = {i for ids in drive for i in ids}
    moved = {i: new[i] for i in road_nodes}
    at = displacement_field(moved, rot, int(W0) + 60, int(H0) + 60)
    cx, cy, c, s = R

    def place(x, y):  # cualquier punto proyectado → mapa rectificado
        rx, ry = cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c
        d = at(rx, ry)
        return rx + d[0], ry + d[1]

    final = {}
    for i in nodes:
        if i in road_nodes:
            final[i] = new[i]
        else:
            rx, ry = rot[i]
            d = at(rx, ry)
            final[i] = (rx + d[0], ry + d[1])
    # marco: la caja original girada, recortada a lo que tiene contenido
    corners = [place(x, y) for x, y in ((0, 0), (W0, 0), (0, H0), (W0, H0))]
    xs, ys = sorted(q[0] for q in corners), sorted(q[1] for q in corners)
    fx0, fx1, fy0, fy1 = xs[1], xs[2], ys[1], ys[2]  # rectángulo interior (sin esquinas vacías)
    W, H = int(fx1 - fx0), int(fy1 - fy0)
    T = lambda q: (q[0] - fx0, q[1] - fy0)
    ways = [(tags, [T(final[i]) for i in ids]) for tags, ids in raw_ways]

    # ---------- red de calles para el tránsito (nodos en px, tramos con tipo y sentido) ----------
    KINDS = list(ROADS)
    gidx, gnodes, gedges = {}, [], []
    def gnode(i):
        if i not in gidx:
            x, y = T(final[i]); gidx[i] = len(gnodes) // 2; gnodes.extend([int(round(x * 16)), int(round(y * 16))])
        return gidx[i]
    for tags, ids in raw_ways:
        hw = tags.get('highway')
        if hw not in ROADS or tags.get('area') == 'yes':
            continue
        ow = tags.get('oneway')
        ow = 1 if ow in ('yes', 'true', '1') else -1 if ow == '-1' else 0
        if tags.get('junction') == 'roundabout' and not ow:
            ow = 1
        surf = surface_tile(tags)
        for a, b2 in zip(ids, ids[1:]):
            if a == b2:
                continue
            gedges.extend([gnode(a), gnode(b2), KINDS.index(hw) | (surf << 4), ow & 3])
    print('red de calles: %d nodos, %d tramos' % (len(gnodes) // 2, len(gedges) // 4))
    print('mapa %d x %d tiles (%.1f x %.1f km), %d vías' % (W, H, W * 2 / 1000, H * 2 / 1000, len(ways)))

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

    # ---------- barrios (INE) ----------
    barrio_im, brd = canvas()
    barrio_names = []
    try:
        gj = json.loads(BARRIOS.read_text())
        for f in gj['features']:
            nm = f['properties']['barrio']
            nm = BARRIO_NAMES.get(nm, nm)
            barrio_names.append(nm)
            g = f['geometry']
            polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
            for pl in polys:
                poly(brd, [T(place(*proj(la, lo))) for lo, la in pl[0]], len(barrio_names))
    except FileNotFoundError:
        print('(sin barrios del INE)')

    # ---------- áreas ----------
    wood_im, wd = canvas()
    water_im, wa = canvas()
    park_im, pd = canvas()
    bld_im, bd = canvas('I')
    parks, buildings = [], []
    for tags, pts in ways:
        if tags.get('natural') == 'wood' or tags.get('landuse') in ('forest', 'grass', 'meadow') or tags.get('landcover') == 'trees':
            poly(wd, pts, 1)
        if tags.get('natural') == 'water':
            poly(wa, pts, 1)
        if tags.get('leisure') in ('park', 'garden') and len(parks) < 250:
            parks.append({'name': tags.get('name') or 'Plaza', 'named': bool(tags.get('name')), 'pts': pts})
            poly(pd, pts, len(parks))
    for tags, pts in ways:
        if 'building' in tags and len(buildings) < 65000:
            buildings.append({'tags': tags, 'pts': pts})
            poly(bd, pts, len(buildings))

    # ---------- calles ----------
    side_im, sd = canvas()
    road_im, rd = canvas()
    path_im, ptd = canvas()
    street_im, std = canvas()
    line_im, ld = canvas()
    cover = np.zeros((H, W), np.int32)
    names = []
    drive_w = [(t, p) for t, p in ways if t.get('highway') in ROADS and t.get('area') != 'yes']
    # orden de dibujo: tierra < empedrado < asfalto, y las principales al final (ganan en las esquinas)
    rank = {DIRTROAD: 0, STONE: 1, ROAD: 2}
    drive_w.sort(key=lambda tp: (1 if tp[0]['highway'] in MAIN else 0, rank[surface_tile(tp[0])]))
    for tags, pts in drive_w:
        rw, sw = ROADS[tags['highway']]
        if sw and surface_tile(tags) != DIRTROAD:
            line(sd, pts, 1, rw + 2 * sw)
    for k, (tags, pts) in enumerate(drive_w):
        rw, sw = ROADS[tags['highway']]
        line(rd, pts, surface_tile(tags) + 1, rw)
        # cuántas calles distintas pisan cada celda (para saber dónde hay esquinas)
        one = Image.new('L', (W, H), 0); od = ImageDraw.Draw(one)
        line(od, pts, 1, rw)
        bx = one.getbbox()
        if bx:
            cover[bx[1]:bx[3], bx[0]:bx[2]] += np.asarray(one.crop(bx), np.int32)
        nm = tags.get('name')
        if nm:
            nm = nm.replace('Blás', 'Blas').replace('António', 'Antonio')
            if nm not in names and len(names) < 250:
                names.append(nm)
            if nm in names:
                line(std, pts, names.index(nm) + 1, rw + 2 * max(sw, 1.5))
        if tags['highway'] in MAIN and surface_tile(tags) == ROAD:  # línea amarilla del medio
            for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
                ld.line([(x0 - 0.5, y0 - 0.5), (x1 - 0.5, y1 - 0.5)], fill=1 if abs(x1 - x0) >= abs(y1 - y0) else 2, width=1)
    for tags, pts in ways:
        if tags.get('highway') in PATHS:
            line(ptd, pts, 1 if tags['highway'] != 'track' else 2, PATHS[tags['highway']])

    A = lambda im: np.asarray(im).copy()
    wood, water, park, bid = A(wood_im), A(water_im), A(park_im), A(bld_im).astype(np.int32)
    side, road, path, street, lines, barrio = A(side_im), A(road_im), A(path_im), A(street_im), A(line_im), A(barrio_im)

    # ---------- composición ----------
    tiles = np.full((H, W), GRASS, np.uint8)
    # manchas de tierra colorada en los patios (ruido suave)
    g = np.random.default_rng(11).random((H // 7 + 2, W // 7 + 2))
    yy, xx = np.mgrid[0:H, 0:W] / 7.0
    x0, y0 = xx.astype(int), yy.astype(int)
    fx, fy = xx - x0, yy - y0
    noise = (g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx) * (1 - fy) + (g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx) * fy
    del yy, xx, x0, y0, fx, fy
    tiles[noise > 0.74] = DIRT
    tiles[park > 0] = GRASS
    tiles[wood > 0] = GRASS
    tiles[path == 2] = DIRT
    tiles[path == 1] = PAVING
    tiles[water > 0] = WATER
    paved = (side > 0) | (road > 0)
    bid[paved | (water > 0)] = 0
    counts = np.bincount(bid.ravel(), minlength=len(buildings) + 1)
    small = np.where(counts < 3)[0]
    bid[np.isin(bid, small[small > 0])] = 0
    tiles[bid > 0] = BUILDING
    tiles[side > 0] = SIDEWALK
    tiles[road > 0] = road[road > 0] - 1
    line = np.where((tiles == ROAD) & (cover == 1), lines, 0).astype(np.uint8)
    inter = cover >= 2
    near = inter.copy()
    for _ in range(3):
        n2 = near.copy(); n2[1:] |= near[:-1]; n2[:-1] |= near[1:]; n2[:, 1:] |= near[:, :-1]; n2[:, :-1] |= near[:, 1:]; near = n2
    line[near] = 0
    area = np.zeros((H, W), np.uint8)
    area_names = []
    trees, decals, labels = [], [], []
    tree_at = np.zeros((H, W), bool)

    def plant(cands, prob, spacing, make):
        for x, y in cands:
            if rnd.random() >= prob:
                continue
            if tree_at[max(0, y - spacing + 1):y + spacing, max(0, x - spacing + 1):x + spacing].any():
                continue
            tree_at[y, x] = True
            trees.append(make(int(x), int(y)))

    def dilate(m, n):
        for _ in range(n):
            m2 = m.copy(); m2[1:] |= m[:-1]; m2[:-1] |= m[1:]; m2[:, 1:] |= m[:, :-1]; m2[:, :-1] |= m[:, 1:]; m = m2
        return m

    # ---------- plazas y parques ----------
    for i, p in enumerate(parks):
        m = (park == i + 1) & ((tiles == GRASS) | (tiles == DIRT))
        ys, xs = np.nonzero(m)
        if len(xs) < 20:
            continue
        y0b, y1b, x0b, x1b = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        sub = m[y0b:y1b, x0b:x1b]
        area_names.append(p['name'])
        area[y0b:y1b, x0b:x1b][sub] = len(area_names)
        cx, cy = int(xs.mean()), int(ys.mean())
        is_park = 'parque' in p['name'].lower()
        big = len(xs) > 500
        # borde: celdas de la plaza con un vecino fuera
        inner = sub.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) + (((2, 0), (-2, 0), (0, 2), (0, -2)) if big and 'Héroes' not in p['name'] else ()):
            sh = np.zeros_like(sub)
            ya, yb = max(0, dy), sub.shape[0] + min(0, dy)
            xa, xb = max(0, dx), sub.shape[1] + min(0, dx)
            sh[ya - dy:yb - dy, xa - dx:xb - dx] = sub[ya:yb, xa:xb]
            inner &= sh
        border = sub & ~inner
        gy, gx = np.mgrid[y0b:y1b, x0b:x1b]
        ddx, ddy = gx - cx, gy - cy
        hw, hh = (x1b - x0b) / 2, (y1b - y0b) / 2
        heroes = 'Héroes' in p['name']
        if heroes:
            # Plaza de los Héroes según la vista satelital (Leandro, 03/11/2026): casi un bosque, un camino
            # diagonal del sudoeste al noreste, el monumento cerca del centro (un poco al oeste) y, del lado
            # este, un sector abierto de baldosas con dos monumentos chicos.
            u = (gx - x0b) / max(1, x1b - x0b - 1); v = (gy - y0b) / max(1, y1b - y0b - 1)
            Wd, Hd = x1b - x0b, y1b - y0b
            # distancia (en tiles) a la recta del camino diagonal
            ax_, ay_, bx_, by_ = 0.04 * Wd, 0.96 * Hd, 0.96 * Wd, 0.06 * Hd
            px_, py_ = gx - x0b, gy - y0b
            dist = np.abs((bx_ - ax_) * (ay_ - py_) - (ax_ - px_) * (by_ - ay_)) / math.hypot(bx_ - ax_, by_ - ay_)
            east = (u > 0.66) & (v > 0.2) & (v < 0.97) & ((u - 0.66) * 1.6 > (0.34 - v))
            mx, my = int(x0b + 0.49 * Wd), int(y0b + 0.44 * Hd)
            ring = (np.abs(gx - mx) <= 3) & (np.abs(gy - my) <= 3)
            pave = border | (dist <= 1.3) | east | ring
            # hoyos de árbol en el sector de baldosas (cada 5 tiles)
            pits = east & (((gx - x0b) % 5) == 2) & (((gy - y0b) % 5) == 2) & ~((u > 0.8) & (u < 0.96) & (((v > 0.3) & (v < 0.5)) | ((v > 0.62) & (v < 0.82))))
            pave &= ~pits
            cx, cy = mx + 1, my + 1
            for mu, mv in ((0.88, 0.40), (0.87, 0.72)):
                dxm, dym = int(x0b + mu * Wd), int(y0b + mv * Hd)
                tiles[dym:dym + 2, dxm:dxm + 2] = MONUMENT
                decals.append({'kind': 'monumento_bajo', 'x': dxm, 'y': dym, 'w': 2, 'h': 2})
        elif is_park:
            wsub = dilate(water[y0b:y1b, x0b:x1b] > 0, 2) & sub
            pave = border | wsub
        else:
            cross = (np.abs(ddx) <= (1 if big else 0)) | (np.abs(ddy) <= (1 if big else 0))
            diag = big & (np.minimum(np.abs(ddx * hh - ddy * hw), np.abs(ddx * hh + ddy * hw)) <= 0.9 * max(hw, hh))
            ring = big & (np.maximum(np.abs(ddx), np.abs(ddy)) <= 4)
            pave = border | cross | diag | ring
        tsub = tiles[y0b:y1b, x0b:x1b]
        keep = tsub == MONUMENT
        tsub[sub & pave & ~keep] = PAVING
        tsub[sub & ~pave & ~keep] = GRASS
        if 'Héroes' in p['name']:
            tiles[cy - 1:cy + 1, cx - 1:cx + 1] = MONUMENT
            decals.append({'kind': 'monumento', 'x': cx - 1, 'y': cy - 1, 'w': 2, 'h': 2})
        cand = list(zip(*np.nonzero((tsub == GRASS) & sub)))
        cand = [(x + x0b, y + y0b) for y, x in cand]
        rnd.shuffle(cand)
        if heroes:  # copas grandes y tupidas, casi sin huecos
            plant(cand, 0.95, 2, lambda x, y: (x, y, rnd.randint(16, 20), 3 if rnd.random() < 0.12 else rnd.choice([0, 0, 1, 1, 2])))
        elif is_park:
            plant(cand, 0.6, 3, lambda x, y: (x, y, rnd.randint(10, 14), rnd.choice([0, 1, 1, 3])))
        else:
            plant(cand, 0.55, 4, lambda x, y: (x, y, rnd.randint(10, 13), 3 if rnd.random() < 0.3 else rnd.randint(0, 1)))
        if p['named']:
            labels.append({'text': p['name'], 'x': int(cx * 16 + 8), 'y': int(y0b * 16 + (24 if is_park else -4))})

    # ---------- árboles en montes y patios ----------
    busy = np.isin(tiles, (ROAD, STONE, DIRTROAD, SIDEWALK, BUILDING, WATER))
    busy = dilate(busy, 1)
    free = np.isin(tiles, (GRASS, DIRT)) & ~busy & (area == 0)
    free[0] = free[-1] = False; free[:, 0] = free[:, -1] = False
    for m, prob, spc, mk in ((free & (wood > 0), 0.5, 3, lambda x, y: (x, y, rnd.randint(9, 13), rnd.randint(0, 2))),
                             (free & (wood == 0), 0.05, 5, lambda x, y: (x, y, rnd.randint(8, 12), 3 if rnd.random() < 0.15 else rnd.randint(0, 2)))):
        ys, xs = np.nonzero(m)
        order = np.random.default_rng(len(xs)).permutation(len(xs))
        plant(zip(xs[order], ys[order]), prob, spc, mk)
    for x, y, _, _ in trees:
        tiles[y, x] = TREE

    # ---------- edificios: renumerar y datos ----------
    ids = np.unique(bid[bid > 0])
    remap = np.zeros(len(buildings) + 1, np.int32)
    remap[ids] = np.arange(1, len(ids) + 1)
    bid = remap[bid]
    bdata = []
    main_street = set(i + 1 for i, n in enumerate(names) if any(k in n for k in ('Mariscal López', 'General Díaz', 'Alejo García', 'Carlos Antonio López', 'Natalicio Talavera', 'Humaitá')))
    # caja de cada edificio de una sola pasada
    flat = bid.ravel()
    nz = np.nonzero(flat)[0]
    bys, bxs = nz // W, nz % W
    bv = flat[nz]
    n_b = len(ids) + 1
    xmin = np.full(n_b, W); xmax = np.zeros(n_b, int); ymin = np.full(n_b, H); ymax = np.zeros(n_b, int)
    np.minimum.at(xmin, bv, bxs); np.maximum.at(xmax, bv, bxs); np.minimum.at(ymin, bv, bys); np.maximum.at(ymax, bv, bys)
    xsum = np.bincount(bv, weights=bxs, minlength=n_b); cnt = np.bincount(bv, minlength=n_b)
    for new_id, old in enumerate(ids, 1):
        tags = buildings[old - 1]['tags']
        xm = int(xsum[new_id] / cnt[new_id])
        below = street[min(H - 1, ymax[new_id] + 2), xm]
        lm = LANDMARKS.get(tags.get('name', ''))
        try:
            floors = int(float(tags.get('building:levels', '0')))
        except ValueError:
            floors = 0
        if lm:
            floors, rt, rc, wc, shop = lm['floors'], ROOF_TYPES.index(lm['roof']), N_ROOFS + lm['roofc'], lm['wallc'], lm.get('shop', 0)
            labels.append({'text': lm['label'], 'x': int(xm * 16 + 8), 'y': int(ymin[new_id] * 16 - 12)})
        else:
            if not floors:
                floors = 1 if rnd.random() < 0.7 else 2 if rnd.random() < 0.85 else 3
            rt = rnd.choice([0, 0, 1, 2])
            rc, wc = rnd.randrange(N_ROOFS), rnd.randrange(N_WALLS)
            shop = 1 if (tags.get('shop') or tags.get('amenity') in ('bank', 'pharmacy', 'restaurant', 'cafe') or
                         (below in main_street and rnd.random() < 0.6) or rnd.random() < 0.12) else 0
        floors = max(1, min(4, floors))
        bdata += [int(xmin[new_id]), int(xmax[new_id]), floors, rt, rc, wc, shop, rnd.randrange(N_AWN)]

    # ---------- punto de inicio: vereda al sur de la Plaza de los Héroes ----------
    spawn = {'x': W * 8, 'y': H * 8}
    for i, p in enumerate(parks):
        if 'Héroes' in p['name']:
            ys, xs = np.nonzero(park == i + 1)
            cx, y = int(xs.mean()), int(ys.max())
            while y < H - 1 and tiles[y, cx] != SIDEWALK:
                y += 1
            while y < H - 1 and tiles[y + 1, cx] == SIDEWALK:
                y += 1
            spawn = {'x': cx * 16 + 8, 'y': y * 16 + 6}

    # ---------- nombres de barrio para el mapa ----------
    blabels = []
    for i, nm in enumerate(barrio_names):
        ys, xs = np.nonzero(barrio[::4, ::4] == i + 1)
        if len(xs):
            blabels.append({'text': nm, 'x': int(np.median(xs)) * 4 * 16, 'y': int(np.median(ys)) * 4 * 16})

    # ---------- empaquetar ----------
    roads = {'kinds': KINDS, 'widths': [ROADS[k][0] for k in KINDS], 'nodes': gnodes, 'edges': gedges}
    meta = {'w': W, 'h': H, 'roads': roads, 'streets': names, 'areas': area_names, 'barrios': barrio_names, 'barrioLabels': blabels, 'labels': labels, 'decals': decals,
            'spawn': spawn, 'nb': len(ids), 'nt': len(trees), 'bounds': [mnla, mnlo, mxla, mxlo], 'rot': round(ang, 3),
            'credit': '© colaboradores de OpenStreetMap (ODbL) · barrios: INE Paraguay'}
    js = json.dumps(meta, ensure_ascii=False).encode()
    tarr = np.array([v for t in trees for v in t], np.uint16)
    payload = b''.join([struct.pack('<I', len(js)), js, tiles.tobytes(), line.tobytes(), street.astype(np.uint8).tobytes(),
                        area.tobytes(), barrio.astype(np.uint8).tobytes(), bid.astype('<u2').tobytes(),
                        np.array(bdata, '<u2').tobytes(), tarr.astype('<u2').tobytes()])
    comp = zlib.compressobj(9, zlib.DEFLATED, -15)
    data = comp.compress(payload) + comp.flush()
    open(out, 'wb').write(data)
    print('%s: %d edificios, %d árboles, %d calles con nombre, %d plazas/parques, %d barrios, %d bytes (%d sin comprimir)' %
          (out, len(ids), len(trees), len(names), len(area_names), len(barrio_names), len(data), len(payload)))

    if preview:
        pal = np.array([(92, 158, 58), (120, 120, 128), (200, 192, 176), (200, 120, 90), (196, 146, 108),
                        (40, 100, 40), (230, 230, 230), (168, 92, 58), (70, 130, 200), (96, 92, 90), (150, 84, 52)], np.uint8)
        img = pal[tiles]
        img[line > 0] = (226, 191, 69)
        Image.fromarray(img).save(preview)


if __name__ == '__main__':
    main(*sys.argv[1:])
