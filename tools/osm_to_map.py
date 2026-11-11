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
GRASS, ROAD, SIDEWALK, BUILDING, PAVING, TREE, MONUMENT, DIRT, WATER, STONE, DIRTROAD, CHECKER, PLAZADIRT, LAGUNA, SENDERO, LADRILLO = range(16)
# LAGUNA: agua verde oliva de la laguna Ykua Pytã; SENDERO: tierra clara apisonada; LADRILLO: piso de ladrillo del parque (10/11/2026)
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
    'Municipalidad de Villarrica': {'floors': 2, 'roof': 'losa', 'roofc': 0, 'wallc': 10, 'label': 'Municipalidad'},
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
            pave = border | east | ring
            # camino diagonal (Street View y satélite, 05/11/2026): piedra laja con canteros de borde blanco; las
            # celdas quedan de tierra (sin árboles) y el camino liso lo dibuja el decorado 'senda'
            pathm = (dist <= 2.0) & sub & ~pave
            HW = 1.5
            A_ = (x0b + ax_, y0b + ay_); B_ = (x0b + bx_, y0b + by_)
            segs, cur = [], None
            for k in range(0, 101):
                t_ = k / 100; qx, qy = A_[0] + (B_[0] - A_[0]) * t_, A_[1] + (B_[1] - A_[1]) * t_
                ok = 0 <= int(qy) - y0b < pathm.shape[0] and 0 <= int(qx) - x0b < pathm.shape[1] and pathm[int(qy) - y0b, int(qx) - x0b]
                if ok and cur is None: cur = t_
                if not ok and cur is not None: segs.append([round(cur, 3), round(t_, 3)]); cur = None
            if cur is not None: segs.append([round(cur, 3), 1.0])
            ang_ = math.atan2(B_[1] - A_[1], B_[0] - A_[0]); nx_, ny_ = -math.sin(ang_), math.cos(ang_)
            decals.append({'kind': 'senda', 'x': int(min(A_[0], B_[0])) - 2, 'y': int(min(A_[1], B_[1])) - 2, 'w': int(abs(B_[0] - A_[0])) + 5, 'h': int(abs(A_[1] - B_[1])) + 5,
                           'ax': round(A_[0], 2), 'ay': round(A_[1], 2), 'bx': round(B_[0], 2), 'by': round(B_[1], 2), 'hw': HW, 'segs': segs})
            plen = math.hypot(B_[0] - A_[0], B_[1] - A_[1]); bench_cells = []
            for t0_, t1_ in segs:
                L_ = (t1_ - t0_) * plen; n_b = int(L_ // 6)
                for i_ in range(n_b):
                    t_ = t0_ + (i_ + 0.5) / max(1, n_b) * (t1_ - t0_); sd = 1 if i_ % 2 == 0 else -1
                    qx = A_[0] + (B_[0] - A_[0]) * t_ + nx_ * sd * (HW + 0.75); qy = A_[1] + (B_[1] - A_[1]) * t_ + ny_ * sd * (HW + 0.75)
                    fa = math.atan2(-ny_ * sd, -nx_ * sd)  # mira hacia el camino
                    decals.append({'kind': 'banco', 'x': int(qx), 'y': int(qy), 'w': 1, 'h': 1, 'f': 'd', 'px': round(qx * 16, 1), 'py': round(qy * 16, 1), 'fa': round(fa, 3)})
                    bench_cells.append((int(qx), int(qy)))
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
        if heroes:
            tsub[pathm & ~keep] = PLAZADIRT
            for bx2, by2 in bench_cells:
                tsub[max(0, by2 - y0b - 1):by2 - y0b + 2, max(0, bx2 - x0b - 1):bx2 - x0b + 2][sub[max(0, by2 - y0b - 1):by2 - y0b + 2, max(0, bx2 - x0b - 1):bx2 - x0b + 2] & (tsub[max(0, by2 - y0b - 1):by2 - y0b + 2, max(0, bx2 - x0b - 1):bx2 - x0b + 2] == GRASS)] = PLAZADIRT
        if 'Héroes' in p['name']:
            tiles[cy - 1:cy + 1, cx - 1:cx + 1] = MONUMENT
            decals.append({'kind': 'monumento', 'x': cx - 1, 'y': cy - 1, 'w': 2, 'h': 2})
        cand = list(zip(*np.nonzero((tsub == GRASS) & sub)))
        cand = [(x + x0b, y + y0b) for y, x in cand]
        rnd.shuffle(cand)
        if heroes:  # copas grandes y tupidas, casi sin huecos
            # Street View (enero 2025, 05/11/2026): juegos infantiles amarillos al norte, al oeste del centro, y
            # mesas y sillas plásticas rojas en el sector sudoeste. Ahí no van árboles.
            jx, jy = int(x0b + 0.36 * Wd), int(y0b + 0.12 * Hd)
            sx_, sy_ = int(x0b + 0.16 * Wd), int(y0b + 0.55 * Hd)
            free_ = lambda x, y, w, h: [(cx_, cy_) for (cx_, cy_) in cand if not (x - 1 <= cx_ <= x + w and y - 1 <= cy_ <= y + h)]
            cand = free_(jx, jy, 4, 3); cand = free_(sx_, sy_, 4, 4)
            decals.append({'kind': 'juegos', 'x': jx, 'y': jy, 'w': 4, 'h': 3})
            decals.append({'kind': 'sillas', 'x': sx_, 'y': sy_, 'w': 4, 'h': 4})
            plant(cand, 0.95, 2, lambda x, y: (x, y, rnd.randint(16, 20), 3 if rnd.random() < 0.12 else rnd.choice([0, 0, 1, 1, 2])))
            # bajo los árboles el piso es tierra con pasto ralo (Street View), no pasto parejo
            nz_ = noise[y0b:y1b, x0b:x1b]
            tsub[sub & (tsub == GRASS) & (nz_ < 0.6)] = PLAZADIRT
        elif is_park:
            plant(cand, 0.6, 3, lambda x, y: (x, y, rnd.randint(10, 14), rnd.choice([0, 1, 1, 3])))
        else:
            plant(cand, 0.55, 4, lambda x, y: (x, y, rnd.randint(10, 13), 3 if rnd.random() < 0.3 else rnd.randint(0, 1)))
        if p['named']:
            labels.append({'text': p['name'], 'x': int(cx * 16 + 8), 'y': int(y0b * 16 + (24 if is_park else -4))})

    # ---------- Municipalidad: manzana arbolada con el edificio en el medio (vista satelital y Leandro, 03/11/2026) ----------
    # Edificio rectangular de dos pisos, techos planos con borde de teja. La fachada principal (pórtico con frontón,
    # escudo, escarapela y bandera) mira al OESTE, hacia la Plaza de los Héroes; en el SUR está la entrada del
    # Teatro Municipal. Jardín arbolado, palmeras y busto frente a la entrada principal.
    special = {}
    muni = next((i for i, b in enumerate(buildings) if b['tags'].get('name') == 'Municipalidad de Villarrica'), None)
    if muni is not None and (bid == muni + 1).any():
        ys, xs = np.nonzero(bid == muni + 1)
        bx0, bx1, by0, by1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
        roadlike = np.isin(tiles, (ROAD, STONE, DIRTROAD, SIDEWALK))
        rect = np.zeros_like(roadlike); rect[by0:by1 + 1, bx0:bx1 + 1] = True; rect &= ~roadlike
        bid[rect] = muni + 1; tiles[rect] = BUILDING
        # la manzana: relleno desde el edificio hasta las veredas
        block = np.zeros_like(roadlike)
        from collections import deque
        q = deque([(bx0, by0)]); block[by0, bx0] = True; n_ = 0
        while q and n_ < 60000:
            x, y = q.popleft(); n_ += 1
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx_, ny_ = x + dx, y + dy
                if 0 <= nx_ < W and 0 <= ny_ < H and not block[ny_, nx_] and not roadlike[ny_, nx_]:
                    block[ny_, nx_] = True; q.append((nx_, ny_))
        yard = block & ~rect
        other = yard & (bid > 0)
        bid[other] = 0
        tiles[yard] = GRASS
        area_names.append('Municipalidad de Villarrica'); area[yard] = len(area_names)
        bh = by1 - by0 + 1
        bw_ = bx1 - bx0 + 1
        y1p = by0 + bh // 2                      # pórtico principal, en el medio de la fachada oeste
        xtc = bx0 + bw_ // 2                     # entrada del teatro, en el medio de la fachada sur
        gy_, gx_ = np.mgrid[0:H, 0:W]
        # patio de baldosas al oeste (hacia la plaza) y camino hasta la vereda de General Díaz
        apron = yard & (gx_ < bx0) & (gx_ >= bx0 - 5) & (gy_ >= y1p - 7) & (gy_ <= y1p + 7)
        paths = yard & (gx_ < bx0) & (np.abs(gy_ - y1p) <= 1)
        # explanada del teatro al sur y camino hasta Mcal. Estigarribia
        tapron = yard & (gy_ > by1) & (gy_ <= by1 + 4) & (np.abs(gx_ - xtc) <= 5)
        tpath = yard & (gy_ > by1) & (np.abs(gx_ - xtc) <= 1)
        tiles[apron | paths | tapron | tpath] = CHECKER
        # veredas de la manzana: baldosas en damero gris y blanco (Street View, enero 2025)
        tiles[dilate(yard, 3) & (tiles == SIDEWALK)] = CHECKER
        # palmeras en canteros a los dos lados del camino de la entrada principal
        palms = []
        for px_ in (bx0 - 2, bx0 - 5):
            for py_ in (y1p - 9, y1p + 9):
                if 0 <= px_ < W and yard[py_, px_]:
                    tiles[py_ - 1:py_ + 1, px_ - 1:px_ + 1] = GRASS
                    tree_at[py_, px_] = True; trees.append((px_, py_, 10, 4)); palms.append((px_, py_))
        cand = list(zip(*np.nonzero(yard & (tiles == GRASS))))
        cand = [(x, y) for y, x in cand if not (bx0 - 12 < x < bx0 and y1p - 11 < y < y1p + 11) and not (abs(x - xtc) < 7 and by1 < y < by1 + 6)]
        rnd.shuffle(cand)
        plant(cand, 0.7, 2, lambda x, y: (x, y, rnd.randint(12, 16), rnd.choice([0, 0, 1, 1, 2, 3])))
        decals.append({'kind': 'muni', 'x': bx0 - 8, 'y': by0, 'w': bw_ + 8, 'h': bh + 4, 'bx': bx0, 'bw': bw_, 'bh': bh, 'p1': y1p - by0, 'tx': xtc - bx0})
        tiles[y1p:y1p + 1, bx0 - 5:bx0 - 4] = MONUMENT  # pedestal del busto (sólido)
        # en la plaza, frente a la entrada: base con dos mástiles y dos leones (foto de Leandro)
        if 'Plaza de los Héroes' in area_names:
            pid = area_names.index('Plaza de los Héroes') + 1
            row = np.nonzero(area[y1p] == pid)[0]
            if len(row):
                mx_ = int(row.max()) - 3
                tiles[y1p - 1:y1p + 1, mx_:mx_ + 3] = MONUMENT
                decals.append({'kind': 'mastiles', 'x': mx_, 'y': y1p - 1, 'w': 3, 'h': 2})
                # "anfiteatro" (video de Leandro, 03/11/2026): gradas blancas de 3 escalones del lado oeste del sector
                # de baldosas, mirando al este, a la Municipalidad; piso de cemento hundido; escenario bajo frente a la
                # entrada; una fila de mástiles con banderas paraguayas del lado norte y guirnaldas por encima
                pc_ = np.nonzero((area == pid).any(axis=0))[0]; Wp = int(pc_.max() - pc_.min() + 1)
                ax0, ax1 = int(pc_.min() + 0.6 * Wp), mx_ - 2
                ay0, ay1 = y1p - 6, y1p + 6
                sx0 = ax1 - 2
                box = (slice(ay0, ay1 + 1), slice(ax0, mx_))
                tiles[box] = np.where(tiles[box] == MONUMENT, MONUMENT, PAVING)
                trees[:] = [t for t in trees if not (ax0 - 1 <= t[0] <= mx_ + 3 and ay0 - 2 <= t[1] <= ay1 + 1)]
                tiles[y1p - 3:y1p + 3, sx0 + 1:ax1 + 1] = MONUMENT  # escenario (sólido, bajito)
                decals.append({'kind': 'anfiteatro', 'x': ax0, 'y': ay0, 'w': ax1 - ax0 + 1, 'h': ay1 - ay0 + 1, 'sx': sx0 - ax0, 'sy': y1p - 3 - ay0})
                decals.append({'kind': 'banderas', 'x': ax0, 'y': ay0 - 1, 'w': mx_ - ax0, 'h': 1})
                decals.append({'kind': 'guirnaldas', 'x': ax0, 'y': ay0, 'w': ax1 - ax0 + 1, 'h': ay1 - ay0 + 1})
                print('anfiteatro: %d x %d baldosas' % (ax1 - ax0 + 1, ay1 - ay0 + 1))
        special['muni'] = muni + 1
        print('Municipalidad: edificio %dx%d tiles, manzana %d tiles' % (bx1 - bx0 + 1, bh, int(yard.sum())))

    # ---------- Centro: las casas llegan hasta la vereda (Leandro, 04/11/2026) ----------
    # OSM dibuja los edificios un poco adentro de la línea municipal y la vereda queda angosta: el pasto entre la
    # vereda y la fachada (o entre dos casas, contra la vereda) se vuelve vereda, así las esquinas no parecen patios.
    if 'Centro' in barrio_names:
        cen = barrio == barrio_names.index('Centro') + 1
        gap_ = np.isin(tiles, (GRASS, DIRT)) & (area == 0) & cen
        near_sw = dilate(tiles == SIDEWALK, 4)
        near_b = dilate(tiles == BUILDING, 4)
        fill = gap_ & near_sw & near_b
        if special.get('muni'):
            fill[max(0, by0 - 14):by1 + 15, max(0, bx0 - 14):bx1 + 15] = False  # la manzana arbolada de la Municipalidad queda como está
        tiles[fill] = SIDEWALK
        print('Centro: %d baldosas de pasto pasan a vereda' % int(fill.sum()))

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
    # tajy (lapachos): parte de los rosados pasan a ser amarillos (tajy sa'yju), y algunos árboles comunes
    # de veredas y patios florecen en amarillo o rosado
    trees = [(x, y, r, 5 if (pal == 3 and rnd.random() < 0.45) or (pal in (0, 1, 2) and rnd.random() < 0.035) else pal) for x, y, r, pal in trees]
    for x, y, _, _ in trees:
        tiles[y, x] = TREE

    # ---------- edificios: renumerar y datos ----------
    ids = np.unique(bid[bid > 0])
    remap = np.zeros(len(buildings) + 1, np.int32)
    remap[ids] = np.arange(1, len(ids) + 1)
    bid = remap[bid]
    special = {k: int(remap[v]) for k, v in special.items()}
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

    # ---------- frente oeste de la Plaza de los Héroes (Coronel Bogado), según el video de Leandro (03/11/2026) ----------
    # De sur a norte: tienda de deportes, pub, Heladería y Cafetería Marimer, Cooperativa Universitaria y farmacia.
    # Las fachadas miran al este (a la plaza): se ven desde arriba como toldo/cartel sobre la vereda y con el nombre.
    # (latitudes: orden del video y posiciones de Google Maps; OSM tiene la heladería un poco más al sur)
    FRENTE = [('Antana Deportes', -25.78092, 'antana', 2, 4), ('Gleu Pub', -25.78085, 'gleu', 2, 11),
              ('Heladería Marimer', -25.78078, 'marimer', 2, 4), ('Cooperativa Universitaria', -25.78068, 'universitaria', 3, 12),
              ('Farmacia', -25.78058, 'farma', 2, 4)]
    hero = area_names.index('Plaza de los Héroes') + 1 if 'Plaza de los Héroes' in area_names else 0
    rows_done = []
    if hero:
        cols = np.nonzero((area == hero).any(axis=0))[0]
        px0 = int(cols.min())
        used = set()
        prow = np.nonzero((area == hero).any(axis=1))[0]
        seq = []
        for y in range(int(prow.min()), int(prow.max()) + 1):
            for x in range(px0, max(0, px0 - 30), -1):
                if bid[y, x] > 0:
                    if not seq or seq[-1][0] != int(bid[y, x]): seq.append((int(bid[y, x]), y, x))
                    break
        # los 5 edificios que dan a la plaza, de sur a norte, en el orden del video
        for (name, lat, style, fl, wc_), (b_id, y, bx_) in zip(FRENTE, reversed(seq)):
            ys_ = np.nonzero(bid[:, bx_] == b_id)[0]
            ya_, yb_ = int(ys_.min()), int(ys_.max())
            o = (b_id - 1) * 8
            bdata[o + 2] = fl; bdata[o + 5] = wc_; bdata[o + 6] = 1
            decals.append({'kind': 'frente', 'style': style, 'x': bx_ + 1, 'y': ya_, 'w': 2, 'h': yb_ - ya_ + 1})
            if style == 'marimer':  # solo los nombres que ayudan a ubicarse (Leandro: no hace falta poner todos)
                labels.append({'text': name, 'x': (bx_ + 1) * 16 + 12, 'y': ((ya_ + yb_) // 2) * 16 + 6, 'small': 1})
            rows_done.append((ya_, yb_, bx_, style))
        if rows_done:
            ya_ = min(r[0] for r in rows_done); yb_ = max(r[1] for r in rows_done); xe = max(r[2] for r in rows_done)
            # mesas de la heladería en el borde de la plaza (las guirnaldas van más abajo, en las 4 calles)
            ym = next(((r[0] + r[1]) // 2 for r in rows_done if r[3] == 'marimer'), ya_)
            decals.append({'kind': 'terraza', 'x': px0, 'y': ym - 4, 'w': 3, 'h': 9})
    print('frente oeste de la plaza: %d negocios' % len(rows_done))

    # ---------- guirnaldas de luces en las 4 calles que rodean la Plaza de los Héroes (Leandro, 03/11/2026) ----------
    if hero:
        pr = np.nonzero((area == hero).any(axis=1))[0]; pc = np.nonzero((area == hero).any(axis=0))[0]
        y0p, y1p_, x0p, x1p = int(pr.min()), int(pr.max()), int(pc.min()), int(pc.max())
        STREETY = (ROAD, SIDEWALK, STONE, DIRTROAD)
        def gap(xs, ys, dx, dy):  # ancho de la calle (con veredas) desde el borde de la plaza hacia afuera
            out = []
            for x, y in zip(xs, ys):
                n = 0
                while n < 30 and 0 <= x + dx * (n + 1) < W and 0 <= y + dy * (n + 1) < H and tiles[y + dy * (n + 1), x + dx * (n + 1)] in STREETY:
                    n += 1
                if 4 <= n < 30: out.append(n)
            return int(np.median(out)) if out else 0
        sx = list(range(x0p + 4, x1p - 3, 6)); sy_ = list(range(y0p + 4, y1p_ - 3, 6))
        n_ = gap(sx, [y0p] * len(sx), 0, -1); s_ = gap(sx, [y1p_] * len(sx), 0, 1)
        w_ = gap([x0p] * len(sy_), sy_, -1, 0); e_ = gap([x1p] * len(sy_), sy_, 1, 0)
        if n_: decals.append({'kind': 'guirnaldas', 'dir': 'v', 'x': x0p, 'y': y0p - n_, 'w': x1p - x0p + 1, 'h': n_ + 1})
        if s_: decals.append({'kind': 'guirnaldas', 'dir': 'v', 'x': x0p, 'y': y1p_, 'w': x1p - x0p + 1, 'h': s_ + 1})
        if w_: decals.append({'kind': 'guirnaldas', 'x': x0p - w_, 'y': y0p, 'w': w_ + 1, 'h': y1p_ - y0p + 1})
        if e_: decals.append({'kind': 'guirnaldas', 'x': x1p, 'y': y0p, 'w': e_ + 1, 'h': y1p_ - y0p + 1})
        print('guirnaldas: N %d, S %d, O %d, E %d baldosas' % (n_, s_, w_, e_))

        # ---------- esquina noroeste de la plaza: Mcal. López y Coronel Bogado (video de Leandro, 03/11/2026) ----------
        # SO: casona blanca de esquina con cornisa y puertas en arco, negocio de créditos (cartel verde) y al lado
        # un local chico con cartel lila; NO: banco moderno, blanco con vidrieras y cartel azul; NE: local beige con
        # cafetería (luz cálida, mesitas de madera y plantas en la vereda) y al lado una casa blanca de 2 pisos con
        # balcón. Sin nombres ni marcas: solo colores.
        def corner_bid(xa, xb, ya, yb, px, py):
            best, bd = 0, 1e9
            for y in range(max(0, ya), min(H, yb)):
                for x in range(max(0, xa), min(W, xb)):
                    if bid[y, x] > 0:
                        d = (x - px) ** 2 + (y - py) ** 2
                        if d < bd: bd, best = d, int(bid[y, x])
            return best
        def bbox(b):
            ys, xs = np.nonzero(bid[max(0, y0p - 60):y0p + 60, max(0, x0p - 60):x0p + 60] == b)
            return int(xs.min()) + max(0, x0p - 60), int(xs.max()) + max(0, x0p - 60), int(ys.min()) + max(0, y0p - 60), int(ys.max()) + max(0, y0p - 60)
        def bbox_any(b):
            ys, xs = np.nonzero(bid[max(0, y1p_ - 20):y1p_ + 80, max(0, x0p - 60):x1p + 60] == b)
            return int(xs.min()) + max(0, x0p - 60), int(xs.max()) + max(0, x0p - 60), int(ys.min()) + max(0, y1p_ - 20), int(ys.max()) + max(0, y1p_ - 20)
        def setb(b, fl, wc, shop, awn):
            o = (b - 1) * 8; bdata[o + 2] = fl; bdata[o + 5] = wc; bdata[o + 6] = shop; bdata[o + 7] = awn
        xw, yn = x0p - w_, y0p - n_  # borde de las fachadas (oeste de Coronel Bogado, norte de Mcal. López)
        done = []
        so = corner_bid(xw - 10, xw, y0p - 1, y0p + 10, xw - 1, y0p)
        if so:
            x0_, x1_, y0_, y1_ = bbox(so); setb(so, 2, 8, 1, 2)
            decals.append({'kind': 'frente', 'style': 'credito', 'x': x1_ + 1, 'y': y0_, 'w': 2, 'h': y1_ - y0_ + 1})
            done.append('SO')
            lila = corner_bid(xw - 4, xw, y1_ + 1, y1_ + 8, xw - 1, y1_ + 1)
            if lila and lila != so:
                a0, a1, b0, b1 = bbox(lila); setb(lila, 1, 8, 1, 0)
                decals.append({'kind': 'frente', 'style': 'lila', 'x': a1 + 1, 'y': b0, 'w': 2, 'h': b1 - b0 + 1})
        no = corner_bid(xw - 10, xw, yn - 10, yn, xw - 1, yn - 1)
        if no:
            x0_, x1_, y0_, y1_ = bbox(no); setb(no, 2, 9, 1, 1)
            decals.append({'kind': 'cartel', 'style': 'banco', 'x': x0_, 'y': y1_, 'w': x1_ - x0_ + 1, 'h': 1})
            decals.append({'kind': 'frente', 'style': 'banco', 'x': x1_ + 1, 'y': y0_, 'w': 2, 'h': y1_ - y0_ + 1})
            done.append('NO')
        ne = corner_bid(x0p - 1, x0p + 10, yn - 10, yn, x0p, yn - 1)
        if ne:
            x0_, x1_, y0_, y1_ = bbox(ne); setb(ne, 1, 13, 1, 3)
            decals.append({'kind': 'cartel', 'style': 'cafe', 'x': x0_, 'y': y1_, 'w': x1_ - x0_ + 1, 'h': 1})
            decals.append({'kind': 'mesas', 'x': x0_, 'y': y1_ + 1, 'w': x1_ - x0_ + 1, 'h': 1})
            done.append('NE')
            vec = corner_bid(x1_ + 1, x1_ + 6, y1_ - 3, y1_ + 1, x1_ + 1, y1_)
            if vec and vec != ne: setb(vec, 2, 8, 0, 0)
        print('esquina noroeste:', ' '.join(done))

        # ---------- Mcal. López al oeste de Coronel Bogado (video de Leandro, 04/11/2026; reenviado el 05/11) ----------
        # Mirando al oeste desde el banco: del lado norte, un edificio gris oscuro con arcos altos (y puerta roja);
        # del lado sur, después de la financiera (que tiene arbolitos en macetas y tachos negros en la vereda), una
        # fila de locales blancos de 2 pisos con pilastras de piedra marrón, marquesinas negras curvas sobre las
        # puertas, vidrieras con maniquíes y plantas. Autos estacionados en fila contra el cordón sur.
        def row_ids(y, xa, xb):
            out = []
            for x in range(xa, xb, -1):
                b_ = int(bid[y, x]) if 0 <= x < W else 0
                if b_ and (not out or out[-1][0] != b_):
                    out.append([b_, x, x])
                elif b_ and out:
                    out[-1][2] = x
            return out
        if no and so:
            nx0, nx1, ny0, ny1 = bbox(no)
            north = [r for r in row_ids(ny1, nx0 - 1, nx0 - 45) if r[0] != no]
            sx0, sx1, sy0, sy1 = bbox(so)
            south = [r for r in row_ids(sy0, sx0 - 1, sx0 - 45) if r[0] not in (so, lila)]
            print('Mcal. López oeste, norte:', [(r[0], r[2], r[1]) for r in north[:6]], 'sur:', [(r[0], r[2], r[1]) for r in south[:8]])
            # norte: el primer edificio grande al oeste del banco es el gris oscuro con arcos
            for r in north[:2]:
                a0, a1, b0, b1 = bbox(r[0])
                if a1 - a0 < 4: continue
                setb(r[0], 2, 14, 0, 0)
                decals.append({'kind': 'arcos', 'x': a0, 'y': b1, 'w': a1 - a0 + 1, 'h': 1})
                print('  arcos: edificio %d, x %d-%d, y %d-%d' % (r[0], a0, a1, b0, b1))
                break
            # sur: locales blancos con pilastras marrones hasta ~40 m al oeste de la financiera
            ls = []
            for r in south:
                a0, a1, b0, b1 = bbox(r[0])
                if sx0 - a1 > 22: break
                setb(r[0], 2, 8, 0, 0); ls.append((a0, a1, b0))
                decals.append({'kind': 'pilastras', 'x': a0, 'y': b0 - 1, 'w': a1 - a0 + 1, 'h': 1, 'n': len(ls)})
            # financiera: arbolitos en macetas y tachos negros sobre Mcal. López
            decals.append({'kind': 'topiarios', 'x': sx0, 'y': sy0 - 1, 'w': sx1 - sx0 + 1, 'h': 1})
            # autos en fila contra el cordón sur, desde la esquina hasta el final de los locales
            xs_end = min([l[0] for l in ls] + [sx0])
            curb_y = sy0 - 1
            while curb_y > 0 and tiles[curb_y, sx0] in (SIDEWALK, CHECKER): curb_y -= 1
            decals.append({'kind': 'fila', 'x': int(xs_end), 'y': int(curb_y), 'w': int(sx1 - xs_end - 2), 'h': 1, 'dir': 'o'})
            print('Mcal. López oeste: arcos al norte, %d locales al sur, fila de autos en y=%d' % (len(ls), curb_y))

        # ---------- tienda de ropa: esquina sudoeste, del otro lado de la calle sur (Leandro, 05/11/2026) ----------
        # Nombre inventado ("Ao Porã": ropa linda). Es el primer edificio al sur de la calle sur de la plaza, en la
        # esquina con Coronel Bogado; mira al norte (a la plaza), así que su frente se ve como toldo y vidriera sobre
        # la vereda, con maniquíes. La puerta (decorado 'tienda') es donde se entra a comprar.
        ys0 = y1p_ + s_  # primera fila de edificios del otro lado de la calle sur
        ti = corner_bid(x0p - 1, x0p + 12, ys0, ys0 + 10, x0p, ys0)
        if ti:
            x0_, x1_, y0_, y1_ = bbox_any(ti)
            setb(ti, 2, 4, 1, 0)
            sw0 = y0_ - 1  # vereda de la tienda (la fila de arriba del edificio)
            decals.append({'kind': 'tienda', 'x': x0_, 'y': sw0, 'w': x1_ - x0_ + 1, 'h': 1})
            labels.append({'text': 'Ao Porã · ropa', 'x': (x0_ + x1_ + 1) * 8, 'y': y0_ * 16 + 20, 'small': 1})
            print('tienda de ropa: edificio %d, x %d-%d, y %d-%d, vereda y=%d, plaza x %d-%d y %d-%d' % (ti, x0_, x1_, y0_, y1_, sw0, x0p, x1p, y0p, y1p_))

    # ---------- bancos en las plazas (05/11/2026): al borde de los caminos, de espaldas al pasto ----------
    # f = hacia dónde mira la gente sentada: 's' (al sur, de frente a la cámara), 'e' o 'o'.
    rb = np.random.default_rng(23)
    benches = []
    plazas = [i + 1 for i, n in enumerate(area_names) if 'Plaza' in n or 'plaza' in n]
    if plazas:
        inplaza = np.isin(area, plazas)
        ys_, xs_ = np.nonzero(inplaza & (tiles == PAVING))
        green = lambda y, x: 0 <= y < H and 0 <= x < W and tiles[y, x] in (GRASS, TREE, PLAZADIRT)
        for y, x in zip(ys_, xs_):
            if y < 2 or x < 2 or y >= H - 2 or x >= W - 2:
                continue
            f = None
            if green(y - 1, x) and tiles[y + 1, x] == PAVING and tiles[y, x - 1] == PAVING and tiles[y, x + 1] == PAVING: f = 's'
            elif green(y, x - 1) and tiles[y, x + 1] == PAVING and tiles[y - 1, x] == PAVING and tiles[y + 1, x] == PAVING: f = 'e'
            elif green(y, x + 1) and tiles[y, x - 1] == PAVING and tiles[y - 1, x] == PAVING and tiles[y + 1, x] == PAVING: f = 'o'
            if not f or rb.random() > 0.45:
                continue
            if any(abs(by - y) + abs(bx - x) < 6 for by, bx in benches[-60:]):
                continue
            if any(d_['kind'] in ('anfiteatro', 'terraza', 'mastiles', 'monumento', 'monumento_bajo') and d_['x'] - 2 <= x <= d_['x'] + d_['w'] + 1 and d_['y'] - 2 <= y <= d_['y'] + d_['h'] + 1 for d_ in decals):
                continue
            benches.append((y, x))
            decals.append({'kind': 'banco', 'x': int(x), 'y': int(y), 'w': 1, 'h': 1, 'f': f})
    print('bancos en las plazas: %d' % len(benches))

    # ---------- parque Manuel Ortiz Guerrero (laguna Ykua Pytã): plano de Claude del 10/11/2026 ----------
    # Ver claude/parque-ykua-plan.md. Todo se ubica desde la máscara de agua de la laguna y el polígono del parque
    # (no con números fijos), así sobrevive a una actualización de OpenStreetMap. Los dibujos están en
    # src/world/parque.js; acá se deciden las posiciones, el piso (agua verde, sendero de tierra clara, ladrillo),
    # los árboles tupidos con tronco pintado con cal, los bancos y los faroles del anillo.
    if 'Parque Manuel Ortiz Guerrero' in area_names:
        pk = area_names.index('Parque Manuel Ortiz Guerrero') + 1
        pys_, pxs_ = np.nonzero(area == pk)
        px0, px1, py0, py1 = int(pxs_.min()), int(pxs_.max()), int(pys_.min()), int(pys_.max())
        pbox = np.zeros((H, W), bool); pbox[py0:py1 + 1, px0:px1 + 1] = True
        lag = (tiles == WATER) & pbox
        ly_, lx_ = np.nonzero(lag)
        if len(lx_) > 200:
            lx0, lx1, ly0, ly1 = int(lx_.min()), int(lx_.max()), int(ly_.min()), int(ly_.max())
            lcx, lcy = int(lx_.mean()), int(ly_.mean())
            row_l = {int(y): (int(np.nonzero(lag[y])[0].min()), int(np.nonzero(lag[y])[0].max())) for y in range(ly0, ly1 + 1) if lag[y].any()}
            col_t = {int(x): (int(np.nonzero(lag[:, x])[0].min()), int(np.nonzero(lag[:, x])[0].max())) for x in range(lx0, lx1 + 1) if lag[:, x].any()}
            tiles[lag] = LAGUNA
            near3 = dilate(lag, 3)
            land = (GRASS, DIRT, PLAZADIRT, TREE, SENDERO, PAVING)
            ring0 = (tiles == PAVING) & near3 & (area == pk)
            tiles[ring0] = SENDERO  # el camino de la laguna: de laja a tierra clara apisonada
            reserved = np.zeros((H, W), bool)   # donde no van árboles ni bancos

            def reserve(xa, ya, xb, yb):  # saca los árboles de un rectángulo (baldosas, incluido) y lo reserva
                xa, ya, xb, yb = max(0, xa), max(0, ya), min(W - 1, xb), min(H - 1, yb)
                keep = []
                for t in trees:
                    if xa <= t[0] <= xb and ya <= t[1] <= yb:
                        tiles[t[1], t[0]] = GRASS; tree_at[t[1], t[0]] = False
                    else:
                        keep.append(t)
                trees[:] = keep
                reserved[ya:yb + 1, xa:xb + 1] = True

            def paint(xa, ya, xb, yb, kind, only=None):  # cambia el tipo de las baldosas de un rectángulo (sin pisar calles ni edificios)
                for y in range(max(0, ya), min(H, yb + 1)):
                    for x in range(max(0, xa), min(W, xb + 1)):
                        t = tiles[y, x]
                        if (only is not None and t not in only) or (only is None and t in (ROAD, STONE, DIRTROAD, BUILDING, SIDEWALK, MONUMENT)):
                            continue
                        tiles[y, x] = kind
                        if kind in (SENDERO, LADRILLO, MONUMENT): area[y, x] = pk

            def is_lag(x, y): return 0 <= y < H and 0 <= x < W and bool(lag[int(y), int(x)])

            # -- Fuente de los Enamorados (Leandro): en la franja entre la fachada este del estadio y el camino de
            #    Gral. Caballero; pileta hexagonal de mosaico, nicho blanco con arcos terracota atrás, capillita
            #    terracota con cúpula al norte y motos contra la fachada --
            bl = (tiles == BUILDING)

            def facade(y):  # borde este del estadio en esa fila (el edificio más cercano al oeste del parque)
                a = max(0, px0 - 40); xs = np.nonzero(bl[y, a:px0 - 1])[0]
                return int(xs.max()) + a if len(xs) else None
            yt = ly0 + 1
            fxs = [v for v in (facade(y) for y in range(yt - 3, yt + 4)) if v is not None]
            if fxs and px0 - max(fxs) - 1 >= 5:
                fx = max(fxs)
                pxp, nx = px0 - 4, fx + 1
                reserve(fx + 1, yt - 8, px0 - 1, yt + 8)
                paint(fx + 1, yt - 2, px0 - 1, yt + 4, LADRILLO)
                paint(pxp, yt, pxp + 2, yt + 2, MONUMENT)      # la pileta (sólida)
                paint(nx, yt, nx, yt + 2, MONUMENT)            # el nicho
                paint(pxp + 1, yt - 4, pxp + 1, yt - 4, MONUMENT)  # la capillita
                decals.append({'kind': 'fuente_amor', 'x': fx + 1, 'y': yt - 1, 'w': px0 - fx - 1, 'h': 5, 'px': pxp, 'py': yt, 'nx': nx})
                decals.append({'kind': 'capillita', 'x': pxp, 'y': yt - 7, 'w': 3, 'h': 4, 'bx': pxp + 1, 'by': yt - 4})
                pts = []
                for k in range(3):
                    yy = (yt - 7) * 16 + 8 + k * 14; f_ = facade(yt - 7 + k // 2) or fx
                    pts.append([(f_ + 1) * 16 + 13, yy, round(math.pi / 2 - 0.06 + (0.12 if k == 1 else 0), 3)])
                decals.append({'kind': 'motosparque', 'x': fx + 1, 'y': yt - 8, 'w': 2, 'h': 3, 'pts': pts})
                labels.append({'text': 'Fuente de los Enamorados', 'x': (pxp + 1) * 16 + 8, 'y': (yt + 5) * 16 + 2, 'small': 1})
                print('fuente de los enamorados: pileta en x %d, y %d (fachada del estadio en x=%d)' % (pxp, yt, fx))

            # -- Embarcadero de los cisnes: costa norte, un poco al este del medio --
            xe = int(lcx + 0.12 * (lx1 - lx0))
            while xe not in col_t and xe < lx1: xe += 1
            yn = col_t[xe][0]
            reserve(xe - 7, yn - 7, xe + 7, yn - 1)
            paint(xe - 4, yn - 3, xe + 4, yn - 1, LADRILLO)
            paint(xe - 1, yn, xe + 1, yn + 1, PAVING)          # el muelle: se camina (las tablas las pinta el decorado)
            sw_ = []
            for dx_, dy_, col_, a_ in ((-3.4, 1.8, 'azul', 1.25), (3.9, 2.9, 'azul', 1.9), (0.6, 4.6, 'blanco', 2.9)):
                if is_lag(int(xe + dx_), int(yn + dy_)): sw_.append([round(xe + dx_, 2), round(yn + dy_, 2), col_, a_])
            bote = [round(xe + 2.9, 2), round(yn + 0.7, 2), -0.3] if is_lag(xe + 2, yn + 1) else None
            decals.append({'kind': 'embarcadero', 'x': xe - 7, 'y': yn - 3, 'w': 15, 'h': 10, 'xe': xe, 'yn': yn, 'cisnes': sw_, 'bote': bote})
            decals.append({'kind': 'banco', 'azul': 1, 'x': xe + 3, 'y': yn - 2, 'w': 1, 'h': 1, 'f': 'd', 'px': (xe + 3) * 16 + 8, 'py': (yn - 2) * 16 + 8, 'fa': round(math.pi / 2, 3)})
            labels.append({'text': 'Paseo en cisne', 'x': xe * 16 + 8, 'y': (yn - 4) * 16 + 4, 'small': 1})

            # -- plataforma flotante en el centro de la laguna y dos surtidores --
            cxp_, cyp_ = lcx + 3, lcy - 2
            if all(is_lag(cxp_ + i, cyp_ + j) for i in range(-3, 5) for j in range(-1, 4)):
                paint(cxp_ - 1, cyp_ - 1, cxp_ + 1, cyp_ + 1, MONUMENT, only=(LAGUNA,))
                decals.append({'kind': 'plataforma', 'x': cxp_ - 2, 'y': cyp_ - 2, 'w': 5, 'h': 5})
                for jx, jy in ((cxp_ + 3, cyp_ - 1), (cxp_ + 3, cyp_ + 2)):
                    decals.append({'kind': 'surtidor', 'x': jx - 1, 'y': jy - 3, 'w': 3, 'h': 4, 'px': jx * 16 + 8, 'py': jy * 16 + 8})

            # -- glorieta de columnas: costa este, un poco al norte del medio --
            yc = int(ly0 + 0.42 * (ly1 - ly0))
            while yc not in row_l and yc < ly1: yc += 1
            x0t = row_l[yc][1] - 1
            reserve(x0t - 1, yc - 9, x0t + 12, yc + 6)
            paint(x0t, yc - 5, x0t + 7, yc + 5, LADRILLO)
            decals.append({'kind': 'glorieta', 'x': x0t - 1, 'y': yc - 7, 'w': 11, 'h': 15, 'x0': x0t, 'cx': x0t + 3, 'cy': yc, 'rx': 3, 'ry': 4})
            decals.append({'kind': 'banderas_v', 'x': x0t + 9, 'y': yc - 8, 'w': 2, 'h': 14, 'n': 10, 'y0': yc - 5})

            # -- pasarela con balaustres y pérgola: oeste, entre el camino de Gral. Caballero y la laguna --
            yp = lcy - 1
            while yp not in row_l and yp < ly1: yp += 1
            lw_ = row_l[yp][0]
            reserve(lw_ - 14, yp - 7, lw_ - 2, yp + 5)
            paint(lw_ - 13, yp, lw_ - 3, yp + 2, SENDERO, only=(GRASS, DIRT, PLAZADIRT, TREE, SENDERO))
            decals.append({'kind': 'balaustres', 'x': lw_ - 11, 'y': yp - 1, 'w': 9, 'h': 5, 'x0': lw_ - 10, 'x1': lw_ - 3, 'y0': yp, 'y1': yp + 3})
            decals.append({'kind': 'pergola', 'x': lw_ - 10, 'y': yp - 7, 'w': 6, 'h': 5, 'px': lw_ - 9, 'py': yp - 6, 'pw': 4, 'ph': 3})

            # -- monumento al Panambi Vera: noroeste de la laguna, en la orilla --
            kk = int(np.argmin(lx_ + ly_)); sx_, sy_ = int(lx_[kk]), int(ly_[kk])
            cxo, cyo = sx_ - 2.5, sy_ - 1.5
            reserve(int(cxo) - 5, int(cyo) - 6, int(cxo) + 4, int(cyo) + 3)
            bx_, by_ = int(round(cxo)) - 1, int(round(cyo)) - 1
            paint(bx_, by_, bx_ + 1, by_ + 1, MONUMENT)
            decals.append({'kind': 'panambi', 'x': int(cxo) - 4, 'y': int(cyo) - 6, 'w': 9, 'h': 10, 'cx': round(cxo * 16 + 8, 1), 'cy': round(cyo * 16 + 8, 1), 'bx': bx_, 'by': by_})
            labels.append({'text': 'Panambi Vera', 'x': int(cxo * 16 + 8), 'y': int((cyo - 3.6) * 16)})

            # -- recorrido de la costa norte (Street View, 10/11/2026; punto de Leandro ~76 % hacia el este y pegado a la costa
            #    norte): hacia el noreste, la cancha sintética con alambrado; al oeste de la cancha, la naciente (hondonada con
            #    escalera y paredes de piedra); en la orilla, jardineras blancas con arbolitos --
            fxa = int(lx0 + 0.74 * (lx1 - lx0 + 1)); fxb = fxa + 11
            ytop = min(col_t[x][0] for x in range(fxa, fxb + 1) if x in col_t)
            fyb = ytop - 6; fya = fyb - 6
            reserve(fxa - 1, fya - 1, fxb + 1, fyb + 1)
            paint(fxa, fya, fxb, fyb, GRASS)
            decals.append({'kind': 'cancha_sint', 'x': fxa, 'y': fya, 'w': 12, 'h': 7})
            nx0 = fxa - 9; ny0 = fya - 5
            reserve(nx0 - 1, ny0 - 1, nx0 + 7, ny0 + 6)
            paint(nx0, ny0, nx0 + 6, ny0 + 4, PLAZADIRT)
            decals.append({'kind': 'naciente', 'x': nx0, 'y': ny0, 'w': 7, 'h': 5})
            # caminos secundarios de tierra con bordes blancos: de la costa a la naciente y de la costa a la entrada de la cancha
            for cxp, cya, cyb in ((nx0 + 3, ny0 + 5, None), (fxa + 5, fyb + 2, None)):
                if cxp in col_t:
                    cyb = col_t[cxp][0] - 3
                    if cxp == nx0 + 3: cyb = min(cyb, cya + 5)  # este camino termina contra la plaza de ladrillo del embarcadero
                    if cyb > cya:
                        reserve(cxp - 1, cya, cxp + 2, cyb)
                        paint(cxp, cya, cxp + 1, cyb, PLAZADIRT, only=(GRASS, DIRT, PLAZADIRT, TREE))
                        decals.append({'kind': 'camino_tierra', 'x': cxp, 'y': cya, 'w': 2, 'h': cyb - cya + 1})
            vx_ = int(lx0 + 0.76 * (lx1 - lx0 + 1))
            jard = [[x, col_t[x][0] - 2] for x in (vx_ - 5, vx_ - 1, vx_ + 3) if x in col_t]
            if jard: decals.append({'kind': 'jardineras', 'x': min(a for a, _ in jard) - 1, 'y': min(b for _, b in jard) - 1, 'w': 12, 'h': 4, 'pts': jard})

            # -- juegos infantiles al este de la glorieta (Leandro: "más o menos por ahí"; no hay quiosco ni baños) --
            def find_spot(w, h, cx, cy, rad=22):
                for r in range(0, rad):
                    for dy in range(-r, r + 1):
                        for dx in range(-r, r + 1):
                            if max(abs(dx), abs(dy)) != r: continue
                            x, y = cx + dx, cy + dy
                            sub = tiles[y:y + h, x:x + w]
                            if sub.shape == (h, w) and np.isin(sub, (GRASS, DIRT, PLAZADIRT, TREE)).all() and (area[y:y + h, x:x + w] == pk).all() and not reserved[max(0, y - 1):y + h + 1, max(0, x - 1):x + w + 1].any():
                                return x, y
                return None
            sj = find_spot(4, 3, x0t + 4, yc + 11)
            if sj:
                reserve(sj[0] - 1, sj[1] - 1, sj[0] + 4, sj[1] + 3)
                paint(sj[0], sj[1], sj[0] + 3, sj[1] + 2, PLAZADIRT)
                decals.append({'kind': 'juegos', 'x': sj[0], 'y': sj[1], 'w': 4, 'h': 3})
                labels.append({'text': 'Juegos', 'x': sj[0] * 16 + 32, 'y': sj[1] * 16 + 3 * 16 + 12, 'small': 1})

            # -- orilla sur: troncos caídos y matas, sobre Curupayty --
            lg = []
            for k in range(5):
                x = lcx - 9 + int(k * 4.4) + rnd.randint(0, 2)
                if x in col_t: lg.append([round(x + rnd.random(), 2), round(col_t[x][1] + 1.6 + rnd.random() * 0.4, 2), round(rnd.uniform(-0.5, 0.5) + (math.pi / 2 if k % 3 == 1 else 0), 2), rnd.randint(22, 34)])
            decals.append({'kind': 'troncos', 'x': lcx - 11, 'y': ly1 - 1, 'w': 24, 'h': 6, 'pts': lg})

            # -- el anillo de la laguna: faroles blancos cada ~7 baldosas y bancos de madera mirando al agua --
            ring = (tiles == SENDERO) & near3 & (area == pk) & ~reserved
            rys, rxs = np.nonzero(ring)
            order = np.argsort(np.arctan2(rys - lcy, (rxs - lcx) * 1.0))
            near1 = dilate(lag, 1)
            lamps, bench_at = [], []
            for i_ in order:
                y, x = int(rys[i_]), int(rxs[i_])
                if near1[y, x]: continue
                if any(abs(a - x) + abs(b - y) < 8 for a, b in lamps): continue
                lamps.append((x, y)); decals.append({'kind': 'farol_parque', 'x': x, 'y': y - 2, 'w': 1, 'h': 3})
            for i_ in order:
                y, x = int(rys[i_]), int(rxs[i_])
                if near1[y, x] or (x, y) in lamps: continue
                if any(abs(a - x) + abs(b - y) < 6 for a, b in bench_at) or any(abs(a - x) + abs(b - y) < 3 for a, b in lamps): continue
                wt = None
                for r_ in range(1, 5):
                    for dy_ in range(-r_, r_ + 1):
                        for dx_ in range(-r_, r_ + 1):
                            if wt is None and max(abs(dx_), abs(dy_)) == r_ and is_lag(x + dx_, y + dy_): wt = (x + dx_, y + dy_)
                if wt is None: continue
                fa = math.atan2(wt[1] - y, wt[0] - x)
                bench_at.append((x, y))
                decals.append({'kind': 'banco', 'azul': 1, 'x': x, 'y': y, 'w': 1, 'h': 1, 'f': 'd', 'px': round((x + 0.5) * 16, 1), 'py': round((y + 0.5) * 16, 1), 'fa': round(fa, 3)})

            # -- árboles tupidos con tronco pintado con cal (como la Plaza de los Héroes); cerca del agua queda pasto
            #    abierto (carpinchos); palmeras al oeste y al sudeste; algún tajy --
            keep = []
            for t in trees:
                if area[t[1], t[0]] == pk and not reserved[t[1], t[0]]:
                    tiles[t[1], t[0]] = GRASS; tree_at[t[1], t[0]] = False
                else:
                    keep.append(t)
            trees[:] = keep
            near7 = dilate(lag, 7)
            roadish = dilate(np.isin(tiles, (ROAD, STONE, DIRTROAD, SIDEWALK, BUILDING, MONUMENT, LADRILLO)), 1)
            okk = (tiles == GRASS) & (area == pk) & ~reserved & ~roadish
            n0 = len(trees)
            # palmeras: borde oeste del parque (sobre el camino de Gral. Caballero) y rincón sudeste
            for (xa_, xb_, ya_, yb_, step) in ((px0 + 2, px0 + 6, py0 + 6, ly0 + 8, 6), (lx1 + 6, lx1 + 24, ly1 - 6, py1 - 4, 5)):
                ys3, xs3 = np.nonzero(okk[ya_:yb_ + 1, xa_:xb_ + 1]); cc = [(int(x) + xa_, int(y) + ya_) for y, x in zip(ys3, xs3)]; rnd.shuffle(cc)
                got = []
                for x, y in cc:
                    if any(abs(a - x) + abs(b - y) < step for a, b in got) or tree_at[max(0, y - 1):y + 2, max(0, x - 1):x + 2].any(): continue
                    got.append((x, y)); tree_at[y, x] = True; trees.append((x, y, rnd.randint(12, 15), 4))
            ys2, xs2 = np.nonzero(okk & ~near7)
            cand = [(int(x), int(y)) for y, x in zip(ys2, xs2)]; rnd.shuffle(cand)
            def tpal():  # 12 % tajy rosado y de esos casi la mitad amarillo (idea de Deisy), el resto verdes
                p_ = 3 if rnd.random() < 0.12 else rnd.choice([0, 0, 1, 1, 2])
                return 5 if (p_ == 3 and rnd.random() < 0.45) else p_
            xeast = lx0 + 0.55 * (lx1 - lx0)  # sector este: árboles más altos (copas más grandes) y más juntos
            plant(cand, 0.97, 2, lambda x, y: (x, y, rnd.randint(19, 23) if x > xeast else rnd.randint(15, 19), tpal()))
            ys2, xs2 = np.nonzero(okk & near7)
            cand = [(int(x), int(y)) for y, x in zip(ys2, xs2)]; rnd.shuffle(cand)
            plant(cand, 0.2, 4, lambda x, y: (x, y, rnd.randint(11, 14), rnd.choice([0, 1, 1, 3, 5])))
            for x, y, _, _ in trees[n0:]:
                tiles[y, x] = TREE
            # bajo los árboles tupidos, tierra parda con pasto ralo (como la plaza)
            dens = np.zeros((H, W), bool)
            for x, y, r_, _ in trees[n0:]:
                if r_ >= 15: dens[max(0, y - 1):y + 2, max(0, x - 1):x + 2] = True
            dens = dilate(dens, 1) & (tiles == GRASS) & (area == pk) & ~near7 & ~reserved & (noise < 0.42)
            tiles[dens] = PLAZADIRT
            # tierra colorada con pasto ralo alrededor de toda la laguna (Street View: el piso del parque es tierra roja, no pasto parejo)
            tiles[(tiles == GRASS) & (area == pk) & ~reserved & (noise < 0.6)] = DIRT
            print('parque Ortiz Guerrero: laguna x %d-%d, y %d-%d; embarcadero en x=%d, glorieta en y=%d, pasarela en y=%d; %d árboles nuevos, %d bancos, %d faroles' %
                  (lx0, lx1, ly0, ly1, xe, yc, yp, len(trees) - n0, len(bench_at), len(lamps)))

    # ---------- alrededor de la Plaza de los Héroes (Street View de Leandro, 05/11/2026) ----------
    # La vereda de la plaza es de la misma piedra laja que adentro, hasta el cordón. Las cuatro esquinas son
    # redondeadas (radio ~6 m), con el cordón pintado de amarillo y dos rampas azules para sillas de ruedas, una
    # hacia cada cruce. En cada esquina hay un banco en diagonal que mira a la esquina.
    rounded = np.zeros((H, W), bool)
    if hero:
        ROADS_ = (ROAD, STONE, DIRTROAD)
        def width_out(xs_, ys_, dx, dy):
            out = []
            for x, y in zip(xs_, ys_):
                n = 0
                while n < 6 and tiles[y + dy * (n + 1), x + dx * (n + 1)] not in ROADS_ and tiles[y + dy * (n + 1), x + dx * (n + 1)] != BUILDING: n += 1
                out.append(n)
            return int(np.median(out)) if out else 0
        my_, mx_ = (y0p + y1p_) // 2, (x0p + x1p) // 2
        wN = width_out([mx_ - 6, mx_, mx_ + 6], [y0p] * 3, 0, -1); wS = width_out([mx_ - 6, mx_, mx_ + 6], [y1p_] * 3, 0, 1)
        wW = width_out([x0p] * 3, [my_ - 6, my_, my_ + 6], -1, 0); wE = width_out([x1p] * 3, [my_ - 6, my_, my_ + 6], 1, 0)
        X0, X1, Y0, Y1 = x0p - wW, x1p + wE, y0p - wN, y1p_ + wS
        ring_ = np.zeros((H, W), bool); ring_[Y0:Y1 + 1, X0:X1 + 1] = True; ring_[y0p:y1p_ + 1, x0p:x1p + 1] = False
        conv = ring_ & np.isin(tiles, (SIDEWALK, GRASS, DIRT, TREE, CHECKER, PAVING))
        tiles[conv] = PAVING
        trees[:] = [t for t in trees if not conv[t[1], t[0]]]
        R_ = 3
        for (cxe, cye, sx_, sy_, q) in ((X1 + 1, Y0, -1, 1, 'ne'), (X0, Y0, 1, 1, 'nw'), (X1 + 1, Y1 + 1, -1, -1, 'se'), (X0, Y1 + 1, 1, -1, 'sw')):
            ccx, ccy = cxe + sx_ * R_, cye + sy_ * R_
            for k_ in range(R_):
                for j_ in range(R_):
                    x = cxe + (sx_ * k_ if sx_ > 0 else -k_ - 1); y = cye + (sy_ * j_ if sy_ > 0 else -j_ - 1)
                    if math.hypot(x + 0.5 - ccx, y + 0.5 - ccy) > R_:
                        tiles[y, x] = ROAD; rounded[y, x] = True
            decals.append({'kind': 'esquina', 'x': min(cxe, ccx), 'y': min(cye, ccy), 'w': R_, 'h': R_, 'cx': cxe, 'cy': cye, 'q': q, 'r': R_, 't': PAVING, 'rt': ROAD, 'p': 1})
            # banco en diagonal mirando a la esquina, en el centro del arco, y sin árboles alrededor
            bxc, byc = ccx + sx_ * 0.6, ccy + sy_ * 0.6
            fa = math.atan2(-sy_, -sx_)
            decals.append({'kind': 'banco', 'x': int(bxc), 'y': int(byc), 'w': 1, 'h': 1, 'f': 'd', 'px': round(bxc * 16, 1), 'py': round(byc * 16, 1), 'fa': round(fa, 3)})
            clr = lambda x, y: abs(x + 0.5 - bxc) < 2.6 and abs(y + 0.5 - byc) < 2.6
            trees[:] = [t for t in trees if not clr(t[0], t[1])]
            for y in range(int(byc) - 2, int(byc) + 3):
                for x in range(int(bxc) - 2, int(bxc) + 3):
                    if clr(x, y) and tiles[y, x] in (TREE, GRASS, PLAZADIRT, DIRT): tiles[y, x] = PAVING
        print('plaza: vereda de laja N%d S%d O%d E%d, 4 esquinas redondeadas' % (wN, wS, wW, wE))

        # ---------- galería colonial en la esquina de Mcal. López y Gral. Díaz (Street View de Leandro) ----------
        # Del otro lado de Mcal. López, frente a la esquina noreste de la plaza: casona blanca de una planta alta con
        # arcos sobre la vereda, pilastras y cornisa; adentro, una librería y una tienda de ropa con maniquíes.
        if no is not None:
            gal = corner_bid(x1p - 14, x1p + 2, yn - 14, yn, x1p, yn - 1)
            if gal and gal not in (ne, no, so):
                ys, xs = np.nonzero(bid[yn - 30:yn, x1p - 40:x1p + 3] == gal)
                ga0, ga1, gb1 = int(xs.min()) + x1p - 40, int(xs.max()) + x1p - 40, int(ys.max()) + yn - 30
                setb(gal, 2, 8, 0, 0)
                decals.append({'kind': 'galeria', 'x': ga0, 'y': gb1, 'w': ga1 - ga0 + 1, 'h': 1})
                print('galería: edificio %d, x %d-%d, y %d' % (gal, ga0, ga1, gb1))

    # ---------- cuartel de bomberos en la Plaza Silvio Pettirossi (foto de Leandro, 05/11/2026) ----------
    # En la esquina sudoeste de la plaza (Bahía Negra y San Roque González): un galpón de chapa a dos aguas sobre
    # columnas de reticulado, piso de cemento, los camiones adentro mirando a San Roque González y, al oeste, una
    # casita amarilla con puerta de madera. De acá salen los bomberos.
    if 'Plaza Silvio Pettirossi' in area_names:
        pi_ = area_names.index('Plaza Silvio Pettirossi') + 1
        ys_, xs_ = np.nonzero(area == pi_)
        qx0, qx1, qy0, qy1 = int(xs_.min()), int(xs_.max()), int(ys_.min()), int(ys_.max())
        sx0 = qx0 + 1
        SW_, SH_ = 9, 6
        # San Roque González: primera fila de calle bajando por la columna del medio del galpón
        ry = qy0
        while ry < qy1 and tiles[ry, sx0 + 5] not in (ROAD, STONE, DIRTROAD): ry += 1
        y1s = ry - 2; y0s = y1s - SH_ + 1; bot = ry - 1
        for y in range(y0s - 1, ry):
            for x in range(sx0, sx0 + SW_ + 1):
                if tiles[y, x] in (GRASS, TREE, DIRT, PAVING, PLAZADIRT, BUILDING): tiles[y, x] = SIDEWALK; bid[y, x] = 0
        trees[:] = [t for t in trees if not (sx0 - 2 <= t[0] <= sx0 + SW_ + 2 and y0s - 3 <= t[1] <= bot + 1)]
        for y in range(y0s, y0s + 3):
            for x in range(sx0, sx0 + 3): tiles[y, x] = MONUMENT  # casita amarilla (sólida)
        decals.append({'kind': 'cuartel', 'x': sx0, 'y': y0s, 'w': SW_, 'h': SH_, 'ry': ry})
        print('cuartel de bomberos: x %d-%d, y %d-%d, calle en y=%d (%s)' % (sx0, sx0 + SW_ - 1, y0s, y1s, ry, 'ok' if tiles[ry, sx0 + 6] in (ROAD, STONE, DIRTROAD) else 'sin calle'))

    # ---------- cebras en las esquinas del Centro (05/11/2026) ----------
    # Cada cruce (celdas que pisan 2 calles o más) es un rectángulo; en cada brazo, justo afuera del cruce, se pintan
    # 2 baldosas (4 m) de cebra sobre el asfalto, de cordón a cordón. Solo en el barrio Centro.
    from scipy import ndimage
    if 'Centro' in barrio_names:
        centro = barrio == barrio_names.index('Centro') + 1
        paved_rd = tiles == ROAD  # en el empedrado casi no se pintan
        lab, n_inter = ndimage.label((cover >= 2) & paved_rd & centro)
        n_z = 0
        for sl in ndimage.find_objects(lab):
            y0_, y1_, x0_, x1_ = sl[0].start, sl[0].stop - 1, sl[1].start, sl[1].stop - 1
            if (y1_ - y0_) < 2 or (x1_ - x0_) < 2:
                continue
            # (11/11/2026: se probó dejar 1 baldosa de calle lisa antes de la cebra, GAP = 1; Leandro dijo que estaban bien
            # como estaban, así que GAP = 0. Lo que faltaba era la raya de pare, que se pinta más abajo.)
            GAP = 0
            arms = [(range(y0_ - 2 - GAP, y0_ - GAP), range(x0_, x1_ + 1), 3), (range(y1_ + 1 + GAP, y1_ + 3 + GAP), range(x0_, x1_ + 1), 3),
                    (range(y0_, y1_ + 1), range(x0_ - 2 - GAP, x0_ - GAP), 4), (range(y0_, y1_ + 1), range(x1_ + 1 + GAP, x1_ + 3 + GAP), 4)]
            road_at = lambda y, x: 0 <= y < H and 0 <= x < W and tiles[y, x] in (ROAD, STONE, DIRTROAD) and not rounded[y, x]
            for ys_, xs_, val in arms:
                cells = [(y, x) for y in ys_ for x in xs_ if 0 <= y < H and 0 <= x < W and paved_rd[y, x]]
                # el brazo tiene que ser una calle que sale del cruce: a sus costados, vereda (no más calle)
                if val == 3 and any(road_at(y, x0_ - 1) or road_at(y, x1_ + 1) for y in ys_):
                    continue
                if val == 4 and any(road_at(y0_ - 1, x) or road_at(y1_ + 1, x) for x in xs_):
                    continue
                if len(cells) >= 6:
                    for y, x in cells:
                        line[y, x] = val
                    n_z += 1
                    # raya de pare (11/11/2026, fotos de Leandro): línea blanca perpendicular a la calle, de cordón a cordón,
                    # en la baldosa de afuera de la cebra (la que queda más lejos del cruce). `line` 17 y 18: calle N-S,
                    # el cruce queda al sur (17) o al norte (18); 19 y 20: calle E-O, el cruce queda al este (19) o al oeste (20).
                    if val == 3: oy, ox, sv = (min(ys_) - 1, None, 17) if ys_[0] < y0_ else (max(ys_) + 1, None, 18)
                    else: oy, ox, sv = (None, min(xs_) - 1, 19) if xs_[0] < x0_ else (None, max(xs_) + 1, 20)
                    for y, x in ([(oy, xx) for xx in xs_] if oy is not None else [(yy, ox) for yy in ys_]):
                        if 0 <= y < H and 0 <= x < W and paved_rd[y, x] and line[y, x] == 0 and not rounded[y, x]:
                            line[y, x] = sv
        print('cebras: %d en %d cruces del Centro' % (n_z, n_inter))

        # ---------- rayitas de estacionamiento de motos en el Centro (11/11/2026, fotos de Leandro) ----------
        # En las calles del Centro las motos se estacionan en batería (de punta contra el cordón) y la única pintura son
        # rayitas blancas sueltas, perpendiculares al cordón, cada ~1 m; sin línea de borde ni de fondo. Los autos se
        # estacionan en fila pegados al cordón, con el cajón marcado solo en las esquinas (como un encuadre).
        # Valores de `line` (dibujo: `VR.drawBay` en world.js): 5-8 = rayitas de moto; 9-12 = cajón de auto, fila pegada al
        # cordón, y 13-16 = fila de al lado (esquinas pintadas en las dos); 17-20 = raya de pare (ver cebras). En cada grupo
        # el valor dice dónde está el cordón: sur, norte, este, oeste. `VR.parkCars` (car.js) las lee y acomoda las motos
        # entre rayitas y los autos en el centro de cada cajón.
        # Solo en asfalto, en calles de 4 baldosas o más (en las de 4, de un solo lado por tramo), rectas, a 4 baldosas
        # o más de un cruce. Las cuadras de la plaza las marca `VR.parkCars` según donde pone las motos a mano.
        SW_ = (SIDEWALK, CHECKER, PAVING)
        near_x = ndimage.binary_dilation((cover >= 2) & (tiles == ROAD), structure=np.ones((3, 3), bool), iterations=4)
        no_bay = np.zeros((H, W), bool)
        for nm_ in ('Plaza de los Héroes', 'Plaza Silvio Pettirossi'):
            if nm_ in area_names:
                ys_, xs_ = np.nonzero(area == area_names.index(nm_) + 1)
                no_bay[max(0, ys_.min() - 8):ys_.max() + 9, max(0, xs_.min() - 8):xs_.max() + 9] = True
        for d_ in decals:
            if d_['kind'] in ('fila', 'motosparque', 'cuartel'):
                no_bay[max(0, d_['y'] - 6):d_['y'] + d_.get('h', 1) + 6, max(0, d_['x'] - 6):d_['x'] + d_.get('w', 1) + 6] = True
        isroad = lambda y, x: 0 <= y < H and 0 <= x < W and tiles[y, x] == ROAD and not rounded[y, x] and line[y, x] == 0
        iscurb = lambda y, x: 0 <= y < H and 0 <= x < W and tiles[y, x] in SW_
        n_bay = n_car = 0
        assign = {}   # se aplica al final, así las celdas ya pintadas no le molestan a las vecinas
        ys_c, xs_c = np.nonzero(centro & (tiles == ROAD))
        for y, x in zip(ys_c.tolist(), xs_c.tolist()):
            if line[y, x] or (y, x) in assign or near_x[y, x] or no_bay[y, x] or y < 8 or x < 8 or y > H - 9 or x > W - 9:
                continue
            for side, dy, dx in ((0, 1, 0), (1, -1, 0), (2, 0, 1), (3, 0, -1)):   # lado del cordón: sur, norte, este, oeste
                if not iscurb(y + dy, x + dx):
                    continue
                wd = 0                                   # ancho de la calle hacia adentro (>= 4 baldosas de asfalto)
                while wd < 6 and isroad(y - dy * wd, x - dx * wd): wd += 1
                if wd < 4:
                    continue
                ax_y, ax_x = (0, 1) if dy else (1, 0)    # eje a lo largo del cordón
                ok = True
                for i in range(-3, 4):                   # cordón recto +-3 baldosas a lo largo
                    yy, xx = y + ax_y * i, x + ax_x * i
                    if not (isroad(yy, xx) and isroad(yy - dy, xx - dx) and iscurb(yy + dy, xx + dx) and not near_x[yy, xx] and not no_bay[yy, xx]):
                        ok = False; break
                if not ok:
                    continue
                # por bloques de 8 baldosas a lo largo de la cuadra: ~25 % sin pintar, ~35 % rayitas de moto, ~40 % cajones de auto
                u = x if dy else y
                h_ = ((u // 8) * 73856093 ^ (((y if dy else x) // 6) + side * 19349663) * 83492791) & 0xffff
                if h_ % 100 < 25:
                    continue
                # calle de 4 baldosas (8 m): de un solo lado por tramo, para que quede lugar para dos filas de tránsito
                if wd == 4 and ((h_ >> 9) & 1) != (side & 1):
                    continue
                # un lado de la calle para autos (sur/este) y el opuesto para motos (norte/oeste), como en la calle real
                if side in (1, 3):
                    assign[(y, x)] = 5 + side; n_bay += 1
                else:
                    assign[(y, x)] = 9 + side; n_car += 1
                    assign.setdefault((y - dy, x - dx), 13 + side)
                break
        for (y, x), v in assign.items():
            line[y, x] = v
        print('rayitas de moto: %d baldosas, cajones de auto: %d baldosas' % (n_bay, n_car))

    # ---------- esquinas redondeadas en toda la ciudad (Leandro, 05/11/2026: "no es solo la plaza") ----------
    # En cada cruce de calles con vereda, la punta de la vereda de cada manzana se redondea (radio 4 m, o 2 m si
    # la vereda es angosta). La baldosa de la punta pasa a calle y el decorado 'esquina' dibuja la curva lisa.
    SIDEW = (SIDEWALK, CHECKER, PAVING)
    RD = (ROAD, STONE, DIRTROAD)
    lab2, n2 = ndimage.label((cover >= 2) & np.isin(tiles, RD))
    done_c, n_round = set(), 0
    plaza_c = []
    for d_ in decals:
        if d_['kind'] == 'esquina': done_c.add((d_['cx'], d_['cy'])); plaza_c.append((d_['cx'], d_['cy']))
    for sl in ndimage.find_objects(lab2):
        y0_, y1_, x0_, x1_ = sl[0].start, sl[0].stop - 1, sl[1].start, sl[1].stop - 1
        if y0_ < 4 or x0_ < 4 or y1_ > H - 5 or x1_ > W - 5:
            continue
        rt = int(tiles[(y0_ + y1_) // 2, (x0_ + x1_) // 2])
        # (borde x, borde y, dirección hacia adentro de la manzana, cuadrante de la manzana)
        for cxe, cye, sx_, sy_, q in ((x1_ + 1, y0_, 1, -1, 'sw'), (x0_, y0_, -1, -1, 'se'), (x1_ + 1, y1_ + 1, 1, 1, 'nw'), (x0_, y1_ + 1, -1, 1, 'ne')):
            # la punta de la manzana: la celda de vereda más cercana al cruce con calle a los dos lados (afuera);
            # se busca un poco alrededor porque el cruce no siempre es un rectángulo justo
            c0x = cxe if sx_ > 0 else cxe - 1; c0y = cye if sy_ > 0 else cye - 1
            best = None
            for ddx in range(-2, 4):
                for ddy in range(-2, 4):
                    x, y = c0x + sx_ * ddx, c0y + sy_ * ddy
                    if tiles[y, x] in SIDEW and tiles[y, x - sx_] in RD and tiles[y - sy_, x] in RD and tiles[y - sy_, x - sx_] in RD:
                        sc_ = abs(ddx) + abs(ddy)
                        if best is None or sc_ < best[0]: best = (sc_, x, y)
            if not best:
                continue
            cx_cell, cy_cell = best[1], best[2]
            cxe = cx_cell if sx_ > 0 else cx_cell + 1; cye = cy_cell if sy_ > 0 else cy_cell + 1
            if (cxe, cye) in done_c or rounded[cy_cell, cx_cell] or any(abs(px_ - cxe) <= 4 and abs(py_ - cye) <= 4 for px_, py_ in plaza_c):
                continue
            # una esquina de verdad: la calle corre recta pegada a la vereda hacia los dos lados (3 baldosas). Si el borde
            # de la calle da un escalón (diagonales, retornos, senderos que llegan a la calle) no se redondea (10/11/2026)
            if not (all(tiles[cy_cell - sy_, cx_cell + sx_ * k] in RD for k in range(3)) and all(tiles[cy_cell + sy_ * k, cx_cell - sx_] in RD for k in range(3))):
                continue
            t0 = tiles[cy_cell, cx_cell]
            R_ = 0
            for r_try in (2, 1):
                ok = True
                for k_ in range(r_try):
                    for j_ in range(r_try):
                        if tiles[cy_cell + sy_ * j_, cx_cell + sx_ * k_] not in SIDEW: ok = False
                if ok: R_ = r_try; break
            if not R_:
                continue
            ccx, ccy = cxe + sx_ * R_, cye + sy_ * R_
            cut = False
            for k_ in range(R_):
                for j_ in range(R_):
                    x, y = cx_cell + sx_ * k_, cy_cell + sy_ * j_
                    if math.hypot(x + 0.5 - ccx, y + 0.5 - ccy) > R_:
                        tiles[y, x] = rt; line[y, x] = 0; rounded[y, x] = True; cut = True
            decals.append({'kind': 'esquina', 'x': min(cxe, ccx), 'y': min(cye, ccy), 'w': R_, 'h': R_, 'cx': cxe, 'cy': cye, 'q': q, 'r': R_, 't': int(t0), 'rt': rt, 'p': 0})
            done_c.add((cxe, cye)); n_round += 1
    print('esquinas redondeadas: %d' % n_round)

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
    roads = {'kinds': KINDS, 'widths': [ROADS[k][0] for k in KINDS], 'swidths': [ROADS[k][1] for k in KINDS], 'nodes': gnodes, 'edges': gedges}
    meta = {'w': W, 'h': H, 'roads': roads, 'special': special, 'streets': names, 'areas': area_names, 'barrios': barrio_names, 'barrioLabels': blabels, 'labels': labels, 'decals': decals,
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
                        (40, 100, 40), (230, 230, 230), (168, 92, 58), (70, 130, 200), (96, 92, 90), (150, 84, 52), (190, 188, 184), (140, 114, 86), (86, 106, 70), (206, 188, 152), (168, 92, 66)], np.uint8)
        img = pal[tiles]
        img[line > 0] = (226, 191, 69)
        Image.fromarray(img).save(preview)


if __name__ == '__main__':
    main(*sys.argv[1:])
