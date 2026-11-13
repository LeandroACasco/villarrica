// Más animales (13/11/2026, pedido de Leandro). Todo es local de cada jugador y solo se mueve lo que está cerca de la cámara.
// - Afueras de Santa Lucía y San Miguel: caballos, cerdos, cabras, ovejas y teros en el pasto abierto.
// - Patios de los barrios: gallos, gallinas y pollitos (los pollitos siguen a la mamá).
// - Gatos callejeros en todos los barrios (se duermen en bollito y se escapan si te acercás).
// - Loros en los árboles (salen en bandada chillando) y urubúes dando vueltas arriba, con su sombra.
// - De noche: murciélagos, luciérnagas (con su lucecita) y grillos y sapos de fondo, más en las afueras.
// Se engancha en `VR.Fauna` (fauna.js): `fauna.granja.update(...)` y `fauna.granja.collect(...)`.
'use strict';
(() => {
  const T = VR.T, S = VR.TILE, P = 2;
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
  const set = (...l) => { const a = new Uint8Array(16); for (const t of l) a[t] = 1; return a; };
  const FARM = set(T.GRASS, T.DIRT), YARD = set(T.GRASS, T.DIRT, T.DIRTROAD, T.SIDEWALK);

  // ---------- sprites por código, píxel nítido con contorno ----------
  function sprite(w, h, fn, line) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const px = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(ww)), Math.max(1, Math.round(hh))); };
    const ell = (cx, cy, rx, ry, col) => { g.fillStyle = col; for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1); } };
    fn(px, ell);
    if (line) {
      const im = g.getImageData(0, 0, w, h), d = im.data, A = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0, out = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!A(x, y) && (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1))) out.push(x, y);
      g.fillStyle = line; for (let i = 0; i < out.length; i += 2) g.fillRect(out[i], out[i + 1], 1, 1);
    }
    return c;
  }
  const flip = (c) => { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; };
  const cache = new Map();
  const get = (key, mk) => { let v = cache.get(key); if (!v) { v = mk(); cache.set(key, v); } return v; };
  const OL = '#2b1c14', HOOF = '#2e2018';
  // patas de a pares: i 0 y 1 lejos (más oscuras), 2 y 3 cerca; f alterna cuál sube
  const legs = (px, xs, y, len, w, col, far, f) => xs.forEach((x, i) => { const up = (i === 0 || i === 3) ? f === 1 : f === 0; px(x, up ? y - 1 : y, w, up ? len - 2 : len, i < 2 ? far : col); px(x, y + len - (up ? 3 : 1), w, 1, HOOF); });

  // ---------- cuadrúpedos de costado (mirando a la derecha) ----------
  const HORSE = [{ b: '#8a4f2a', s: '#5f3519', m: '#2a1a12', l: '#a4663a' }, { b: '#a85a2a', s: '#7a3f1c', m: '#6b3418', l: '#c47a44' }, { b: '#c9c7c0', s: '#9a978e', m: '#6e6c66', l: '#e6e4de' }, { b: '#2d2a2b', s: '#1a1818', m: '#121010', l: '#45403f' }, { b: '#efe8da', s: '#c4baa6', m: '#3a2a20', l: '#fff', p: '#8a4f2a' }];
  function horseSide(v, f, low) {
    const C = HORSE[v], hy = low ? 9 : 0;
    return sprite(58, 42, (px, ell) => {
      legs(px, [14, 19, 40, 45], 24, 15, 3, C.b, C.s, f);
      px(1, 14, 3, 12, C.m); px(3, 12, 3, 6, C.m); // cola
      ell(28, 19, 19, 8.5, C.b); ell(28, 24, 17, 3.5, C.s); ell(26, 15, 14, 3.5, C.l);
      if (C.p) { ell(18, 17, 6, 4, C.p); ell(34, 21, 5, 3.5, C.p); }
      ell(42, 14 + hy * 0.5, 5, 9 - (low ? 3 : 0), C.b); // cuello
      px(37, 6 + hy * 0.4, 3, 11, C.m); // crin
      ell(49, 8 + hy, 6.5, 4, C.b); px(53, 9 + hy, 5, 5, C.s); px(56, 11 + hy, 2, 2, '#e2a89a');
      px(48, 3 + hy, 2, 4, C.b); px(46, 2 + hy, 2, 3, C.m); px(50, 7 + hy, 1, 1, '#14100c');
    }, OL);
  }
  const PIG = [{ b: '#e8a7a0', s: '#c47f79', n: '#d98a86' }, { b: '#e8b9b0', s: '#c78f88', n: '#d98a86', p: '#3a3030' }, { b: '#9a6a48', s: '#6f4a30', n: '#b27d5e' }];
  function pigSide(v, f, low) {
    const C = PIG[v], hy = low ? 3 : 0;
    return sprite(38, 24, (px, ell) => {
      legs(px, [9, 12, 22, 25], 15, 7, 3, C.b, C.s, f);
      px(1, 8, 2, 3, C.s); px(0, 7, 2, 2, C.s); // colita enroscada
      ell(15, 12, 13, 7, C.b); ell(15, 16, 11, 3, C.s); if (C.p) { ell(10, 9, 5, 3.5, C.p); ell(22, 13, 4, 3, C.p); }
      ell(28, 12 + hy, 5.5, 5, C.b); ell(33.5, 13 + hy, 3, 3, C.n); px(33, 12 + hy, 1, 1, '#6a3a38'); px(34, 14 + hy, 1, 1, '#6a3a38');
      px(26, 6 + hy, 3, 3, C.s); px(29, 10 + hy, 1, 1, '#14100c');
    }, OL);
  }
  const GOAT = [{ b: '#efeadf', s: '#c8c1b0', d: '#6a5a46' }, { b: '#9a7048', s: '#6c4a2c', d: '#2a1c12' }, { b: '#efeadf', s: '#c8c1b0', d: '#3a2c24', p: '#3a2c24' }];
  function goatSide(v, f, low) {
    const C = GOAT[v], hy = low ? 8 : 0;
    return sprite(36, 32, (px, ell) => {
      legs(px, [9, 12, 23, 26], 18, 11, 2, C.b, C.s, f);
      px(3, 10, 3, 3, C.b); // colita parada
      ell(17, 14, 12, 5.8, C.b); ell(17, 18, 10, 2.5, C.s); if (C.p) { ell(12, 12, 5, 3, C.p); ell(23, 16, 4, 2.5, C.p); }
      ell(27, 9 + hy * 0.6, 3, 6 - (low ? 3 : 0), C.b);
      ell(30, 6 + hy, 4, 3.2, C.b); px(33, 7 + hy, 3, 3, C.d); px(32, 10 + hy, 2, 3, C.b); px(32, 11 + hy, 1, 2, C.d); // barba
      px(27, 1 + hy, 1, 4, C.d); px(29, 0 + hy, 1, 3, C.d); px(26, 5 + hy, 3, 2, C.s); px(31, 5 + hy, 1, 1, '#14100c');
    }, OL);
  }
  const SHEEP = [{ w: '#f2efe6', s: '#cfcabb', f: '#2c2420' }, { w: '#e8e2d2', s: '#c4bba4', f: '#6a4a34' }, { w: '#3b3835', s: '#222', f: '#1a1614' }];
  function sheepSide(v, f, low) {
    const C = SHEEP[v], hy = low ? 5 : 0;
    return sprite(36, 28, (px, ell) => {
      legs(px, [10, 13, 22, 25], 17, 8, 2, C.f, C.f, f);
      ell(17, 12, 12, 8, C.w); ell(11, 9, 5, 4, C.w); ell(22, 8, 5, 4, C.w); ell(17, 17, 10, 3, C.s);
      for (const [x, y] of [[8, 11], [14, 7], [20, 12], [25, 9], [16, 15]]) px(x, y, 2, 2, C.s);
      ell(29, 11 + hy, 3.5, 3.8, C.f); px(26, 7 + hy, 3, 3, C.w); px(25, 10 + hy, 2, 3, C.f); px(31, 9 + hy, 1, 1, '#d8d0c0');
    }, OL);
  }
  const CAT = [{ b: '#d98a3e', s: '#a85f1f', t: '#b86a2a', l: '#f2c58a' }, { b: '#8e8e92', s: '#5e5e64', t: '#5e5e64', l: '#c4c4c8' }, { b: '#26262a', s: '#16161a', l: '#f2f0ea', w: 1 }, { b: '#f0eee8', s: '#c8c4b8', l: '#fff' }, { b: '#2a2a2e', s: '#18181b', l: '#3a3a40' }];
  function catSide(v, f, low) {
    const C = CAT[v];
    return sprite(26, 20, (px, ell) => {
      if (low) { // echado en bollito
        ell(11, 14, 8, 4.5, C.b); ell(11, 17, 7, 2, C.s); ell(19, 12, 3.8, 3.4, C.b); px(17, 8, 2, 3, C.b); px(20, 8, 2, 3, C.b); px(20, 12, 1, 1, '#14100c');
        px(3, 15, 9, 2, C.s); if (C.w) { px(18, 14, 4, 2, C.l); px(5, 16, 3, 1, C.l); }
        return;
      }
      legs(px, [6, 8, 14, 16], 12, 6, 2, C.b, C.s, f);
      px(2, 4, 2, 6, C.b); px(3, 2, 2, 3, C.b); // cola parada
      ell(11, 10, 7.5, 3.8, C.b); if (C.t) { px(8, 7, 1, 3, C.t); px(11, 7, 1, 3, C.t); px(14, 7, 1, 3, C.t); }
      ell(19, 6, 3.6, 3.2, C.b); px(17, 2, 2, 3, C.b); px(20, 2, 2, 3, C.b); px(20, 6, 1, 1, '#14100c'); px(22, 7, 1, 1, '#d98a86');
      if (C.w) { px(17, 8, 4, 2, C.l); px(14, 16, 2, 1, C.l); px(6, 16, 2, 1, C.l); }
    }, OL);
  }
  const SIDE = { caballo: [horseSide, 5], cerdo: [pigSide, 3], cabra: [goatSide, 3], oveja: [sheepSide, 3], gato: [catSide, 5] };

  // vistas de frente y de espaldas, una sola función con medidas por especie
  const FRONT = {
    caballo: { W: 26, H: 38, bw: 9, bh: 12, by: 17, hw: 4, hh: 7, hy: 25, ly: 24, lh: 12, ear: 3, mane: 1 },
    cerdo: { W: 20, H: 22, bw: 7.5, bh: 7, by: 11, hw: 5, hh: 4.5, hy: 15, ly: 14, lh: 6, snout: 1, ear: 2 },
    cabra: { W: 18, H: 28, bw: 5.5, bh: 8, by: 14, hw: 3.3, hh: 5, hy: 18, ly: 18, lh: 9, horn: 1, ear: 2 },
    oveja: { W: 20, H: 26, bw: 7.5, bh: 8.5, by: 13, hw: 3.3, hh: 4.5, hy: 18, ly: 18, lh: 7, wool: 1, ear: 2 },
    gato: { W: 14, H: 18, bw: 4.5, bh: 5, by: 10, hw: 3.6, hh: 3.2, hy: 11, ly: 12, lh: 4, cat: 1, ear: 2 },
  };
  function frontImg(k, v, f, back) {
    const F = FRONT[k], pal = k === 'caballo' ? HORSE[v] : k === 'cerdo' ? PIG[v] : k === 'cabra' ? GOAT[v] : k === 'oveja' ? SHEEP[v] : CAT[v], cx = F.W / 2;
    const B = pal.b || pal.w, Sd = pal.s, face = pal.f || pal.d || pal.m || pal.b;
    return sprite(F.W, F.H, (px, ell) => {
      const lw = Math.max(2, Math.round(F.bw / 3));
      px(cx - F.bw * 0.6, F.ly - (f ? 1 : 0), lw, F.lh, pal.f || Sd); px(cx + F.bw * 0.6 - lw, F.ly - (f ? 0 : 1), lw, F.lh, pal.f || Sd);
      ell(cx, F.by, F.bw, F.bh, B); ell(cx, F.by + F.bh * 0.35, F.bw * 0.75, F.bh * 0.5, Sd);
      if (F.mane && !back) px(cx - 1, F.hy - F.hh - 1, 2, F.hh * 2 + 2, pal.m);
      if (back) {
        px(cx - 1, F.by - 2, 2, F.bh * 0.9, pal.m || Sd); // cola
        ell(cx, F.hy - F.hh * 0.4, F.hw * 0.7, F.hh * 0.5, B);
        if (F.ear) { px(cx - F.hw, F.hy - F.hh - 1, 2, 2, Sd); px(cx + F.hw - 2, F.hy - F.hh - 1, 2, 2, Sd); }
      } else {
        ell(cx, F.hy, F.hw, F.hh, F.wool ? face : B);
        if (F.wool) { px(cx - F.hw, F.hy - F.hh - 1, F.hw * 2, 2, pal.w); }
        if (F.snout) { ell(cx, F.hy + 2, 3, 2.2, pal.n); px(cx - 1, F.hy + 2, 1, 1, '#6a3a38'); px(cx + 1, F.hy + 2, 1, 1, '#6a3a38'); }
        else if (k === 'caballo') { px(cx - 2, F.hy + F.hh - 2, 4, 3, pal.s); }
        else if (!F.cat) px(cx - 2, F.hy + F.hh - 2, 4, 2, face === B ? Sd : face);
        px(cx - F.hw * 0.6, F.hy - 1, 1, 1, '#14100c'); px(cx + F.hw * 0.6 - 1, F.hy - 1, 1, 1, '#14100c');
        if (F.ear) { px(cx - F.hw - 1, F.hy - F.hh, 2, 2, F.wool ? face : Sd); px(cx + F.hw - 1, F.hy - F.hh, 2, 2, F.wool ? face : Sd); }
        if (F.horn) { px(cx - 2, F.hy - F.hh - 3, 1, 3, pal.d); px(cx + 1, F.hy - F.hh - 3, 1, 3, pal.d); px(cx - 1, F.hy + F.hh, 2, 2, pal.d); }
      }
    }, OL);
  }
  const quadImg = (k, v, dir, f, low) => get(k + v + dir + f + (low ? 'l' : ''), () => dir === 'r' ? SIDE[k][0](v, f, low) : dir === 'l' ? flip(quadImg(k, v, 'r', f, low)) : frontImg(k, v, f, dir === 'u'));

  // ---------- aves (de costado, mirando a la derecha) ----------
  const HEN = [{ b: '#f2efe6', s: '#cfc9bb', t: '#cfc9bb' }, { b: '#b5662c', s: '#8a4a1e', t: '#6a3414' }, { b: '#6f5a4a', s: '#4a3b30', t: '#2a2018' }, { b: '#e8e2d2', s: '#8a8070', t: '#4a4036' }];
  function henSide(v, f, peck, gallo) {
    const C = gallo ? { b: '#a8541e', s: '#7a3a14', t: '#1f4a3a' } : HEN[v], k = gallo ? 1.2 : 1, q = (x) => x * k, hy = peck ? 5 : 0;
    return sprite(Math.ceil(q(24)), Math.ceil(q(24)), (px, ell) => {
      px(q(8), q(15), 1, q(5), '#d9a830'); px(q(11) + (f ? 1 : 0), q(15), 1, q(5), '#d9a830'); px(q(7), q(19) + 1, 3, 1, '#d9a830'); px(q(10) + (f ? 1 : 0), q(19) + 1, 3, 1, '#d9a830');
      ell(q(10), q(12), q(6.5), q(4.8), C.b); ell(q(10), q(14.5), q(5), q(2.2), C.s);
      for (let i = 0; i < 3; i++) px(q(1) + i, q(6) + i * 2 - (gallo ? 3 : 0), q(3), q(3), C.t); // cola
      if (gallo) { px(q(0), q(2), 2, q(6), C.t); px(q(2), q(0), 2, q(5), '#d4622a'); }
      px(q(14), q(8) + hy * 0.4, 2, q(5), C.b);
      ell(q(17.5), q(6) + hy, q(2.7), q(2.5), C.b); px(q(19.5), q(6) + hy, 2, 1, '#e8a030'); px(q(18), q(5) + hy, 1, 1, '#14100c');
      px(q(16.5), q(2.5) + hy, 2, gallo ? 3 : 2, '#d4332a'); px(q(19), q(7.5) + hy, 1, 2, '#d4332a'); // cresta y barbilla
    }, OL);
  }
  const chickSide = (f) => get('pollo' + f, () => sprite(12, 11, (px, ell) => { px(4, 8, 1, 2, '#e8892c'); px(6 + f, 8, 1, 2, '#e8892c'); ell(5.5, 6, 3.6, 3, '#f3d54a'); ell(8.5, 4, 2, 2, '#f3d54a'); px(10, 4, 1, 1, '#e8892c'); px(9, 3, 1, 1, '#14100c'); }, OL));
  const heni = (v, dir, f, peck, gallo) => get('h' + v + dir + f + peck + (gallo ? 'g' : ''), () => dir === 'r' ? henSide(v, f, peck, gallo) : flip(heni(v, 'r', f, peck, gallo)));
  const teroSide = (f, peck) => get('tero' + f + peck, () => sprite(28, 26, (px, ell) => {
    const hy = peck ? 4 : 0;
    px(10, 14, 1, 9, '#c8704a'); px(13 + f, 14, 1, 9, '#c8704a');
    ell(12, 11, 7.5, 4.8, '#8a7a5e'); ell(12, 14, 6, 3, '#f1eee6'); ell(17.5, 10, 3, 3.5, '#161616'); // pecho negro
    px(3, 9, 4, 3, '#5a4a38'); px(1, 10, 3, 2, '#2a2420');
    px(15, 5 + hy * 0.3, 3, 5, '#f1eee6');
    ell(19, 5 + hy, 2.7, 2.5, '#f1eee6'); px(18, 3 + hy, 3, 2, '#161616'); px(16, 1 + hy, 2, 3, '#161616'); px(21, 5 + hy, 3, 1, '#e8a030'); px(20, 4 + hy, 1, 1, '#c8302a');
  }, OL));
  const teroI = (dir, f, peck) => dir === 'r' ? teroSide(f, peck) : get('tero_l' + f + peck, () => flip(teroSide(f, peck)));

  // aves volando, vistas desde arriba y mirando al norte: body, wing, tip, span, len
  const FLY = {
    tero: { b: '#8a7a5e', w: '#f1eee6', t: '#161616', span: 26, len: 12 }, loro: { b: '#3f9a3a', w: '#4aae3a', t: '#2a6ad0', span: 20, len: 12 },
    urubu: { b: '#1c1a1a', w: '#262222', t: '#0e0c0c', span: 34, len: 14 }, murci: { b: '#201a22', w: '#2c2430', t: '#120e14', span: 16, len: 7 },
  };
  function flySprite(k, f) {
    const F = FLY[k], W = F.span + 2, H = F.len + 6, cx = W / 2, half = F.span / 2;
    return sprite(W, H, (px, ell) => {
      for (let x = 1; x <= half; x++) {
        const u = x / half, y = 6 + (f ? -u * 2 + 1 : u * 3) + u * u * 3, th = Math.max(1, Math.round(5 * (1 - u * 0.6)));
        const col = u > 0.78 ? F.t : F.w;
        px(cx - x - 1, y, 1, th, col); px(cx + x, y, 1, th, col);
      }
      ell(cx, 8, 2.6, F.len / 2, F.b); ell(cx, 3, 1.6, 1.8, F.b);
      if (k === 'loro') { px(cx - 1, 2, 2, 1, '#d4332a'); px(cx - 1, 13, 2, 3, '#2a6ad0'); }
    }, null);
  }
  const flyImg = (k, f) => get('fly' + k + f, () => flySprite(k, f));
  const parrotPerch = () => get('loroP', () => sprite(10, 15, (px, ell) => { px(3, 11, 1, 3, '#3a8a30'); px(5, 11, 1, 3, '#2a6ad0'); ell(5, 8, 2.8, 4, '#3f9a3a'); ell(5, 3.5, 2.4, 2.4, '#3f9a3a'); px(4, 1, 2, 1, '#d4332a'); px(6, 4, 2, 2, '#e6d8a0'); px(4, 3, 1, 1, '#14100c'); px(6, 9, 1, 3, '#2a6ad0'); }, OL));

  // ---------- reglas por especie ----------
  // r: radio del que no se aleja de su casa; walk/flee: velocidades; trig: a qué distancia se asusta [parado, caminando/corriendo, vehículo]
  const SP = {
    caballo: { r: 90, walk: 7, flee: 52, trig: [18, 50, 120], ok: FARM, s: [1, 1.1], snd: [16, 36] },
    cerdo: { r: 55, walk: 6, flee: 34, trig: [16, 44, 95], ok: FARM, s: [0.95, 1.1], snd: [12, 26] },
    cabra: { r: 80, walk: 8, flee: 46, trig: [20, 52, 110], ok: FARM, s: [0.95, 1.1], snd: [9, 22] },
    oveja: { r: 70, walk: 6, flee: 40, trig: [22, 54, 110], ok: FARM, s: [0.95, 1.1], snd: [9, 22] },
    gato: { r: 46, walk: 9, flee: 58, trig: [20, 42, 100], ok: YARD, s: [0.95, 1.1], snd: [20, 50] },
    gallina: { r: 40, walk: 8, flee: 42, trig: [14, 36, 90], ok: YARD, s: [1, 1.1], snd: [6, 14], bird: 1 },
    pollo: { r: 30, walk: 9, flee: 40, trig: [12, 32, 80], ok: YARD, s: [1, 1], bird: 1, chick: 1 },
    tero: { r: 70, walk: 10, flee: 46, trig: [26, 60, 120], ok: FARM, s: [1, 1], snd: [7, 18], bird: 1, fly: 1 },
  };

  VR.Granja = class {
    constructor(world, fauna) { this.world = world; this.fauna = fauna; this.ready = false; this.groups = []; this.roosts = []; this.flocks = []; this.vultures = []; this.bats = []; this.flies = []; this.t = 0; this.snd = 6; }
    tile(x, y) { return this.world.get(Math.floor(x / S), Math.floor(y / S)); }
    ok(x, y, set) { const t = this.tile(x, y); return t >= 0 && set[t] === 1 && !this.world.hits(x - 4, y - 3, x + 4, y + 2); }
    night() { return (VR.night && VR.night.level) || 0; }
    outer(x, y) { const n = this.world.barrioName(x, y); return !!n && /santa luc|san miguel/i.test(n); }

    init() {
      this.ready = true;
      const W = this.world, w = W.w, h = W.h, tiles = W.tiles, names = W.barrios || [];
      if (!W.barrio) return;
      const outerB = new Set(), inB = new Set(); // índices de barrio
      names.forEach((n, i) => { if (/santa luc[ií]a|san miguel/i.test(n)) outerB.add(i + 1); if (!/^centro$/i.test(n)) inB.add(i + 1); });
      const res = (L, cap, n, v) => { if (L.length < cap) L.push(v); else { const j = (Math.random() * n) | 0; if (j < cap) L[j] = v; } };
      const past = [], yard = [], cats = [], trees = [], cnt = { y: 0, c: 0, t: 0 };
      const B = (x, y) => tiles[y * w + x] === T.BUILDING;
      for (let y = 8; y < h - 8; y += 3) for (let x = 8; x < w - 8; x += 3) {
        const b = W.barrio[y * w + x], t = tiles[y * w + x];
        if (t === T.TREE) { if (b) res(trees, 500, ++cnt.t, [x * S + 8, y * S + 8]); continue; }
        if (!b) continue;
        if (outerB.has(b) && FARM[t]) {
          let good = true; for (let dy = -4; dy <= 4 && good; dy += 2) for (let dx = -4; dx <= 4; dx += 2) if (!FARM[tiles[(y + dy) * w + x + dx]]) { good = false; break; }
          if (good) { past.push([x * S + 8, y * S + 8]); continue; }
        }
        if (YARD[t] && (B(x + 4, y) || B(x - 4, y) || B(x, y + 4) || B(x, y - 4))) {
          if (inB.has(b) && t !== T.SIDEWALK) res(yard, 400, ++cnt.y, [x * S + 8, y * S + 8]);
          if (t !== T.DIRTROAD) res(cats, 260, ++cnt.c, [x * S + 8, y * S + 8]);
        }
      }
      this.roosts = trees;
      const vac = (this.fauna.vacas && this.fauna.vacas.herds) || [];
      const placed = [], free = (x, y, d) => vac.every((hd) => Math.hypot(hd.hx - x, hd.hy - y) > 220) && placed.every((p) => Math.hypot(p[0] - x, p[1] - y) > d);
      const mkEnt = (k, x, y, v, extra) => { const sp = SP[k]; return Object.assign({ k, x, y, hx: x, hy: y, v, s: rnd(sp.s[0], sp.s[1]), dir: pick(['l', 'r', 'd']), anim: Math.random() * 3, mode: 'graze', wt: rnd(1, 8), tx: x, ty: y, flee: 0, alt: 0 }, extra || {}); };
      const spot = (cx, cy, k, d, set) => { for (let j = 0; j < 16; j++) { const a = rnd(0, 6.28), r = rnd(5, d), qx = cx + Math.cos(a) * r, qy = cy + Math.sin(a) * r; if (this.ok(qx, qy, set)) return [qx, qy]; } return [cx, cy]; };
      const herd = (k, n, count, sep, vars) => {
        let tries = 0, made = 0;
        while (made < n && past.length && tries++ < 500) {
          const [hx, hy] = pick(past); if (!free(hx, hy, sep)) continue;
          placed.push([hx, hy]); made++;
          const c = count[0] + ((Math.random() * (count[1] - count[0] + 1)) | 0), list = [], vv = k === 'oveja' ? pick([0, 0, 0, 1, 1, 2]) : (Math.random() * vars) | 0;
          for (let i = 0; i < c; i++) { const [x, y] = spot(hx, hy, k, 36, FARM); list.push(mkEnt(k, x, y, Math.random() < 0.7 ? vv : k === 'oveja' ? pick([0, 0, 1]) : (Math.random() * vars) | 0)); }
          this.groups.push({ k, hx, hy, list, snd: rnd(3, 14) });
        }
      };
      herd('caballo', 7, [1, 3], 300, 5); herd('cerdo', 5, [2, 4], 260, 3); herd('cabra', 5, [3, 5], 260, 3); herd('oveja', 5, [3, 6], 260, 3); herd('tero', 10, [2, 3], 200, 1);
      // gallinas: un gallo, 2 a 4 gallinas y pollitos en patios de los barrios
      let ny = 0, tr = 0;
      while (ny < 38 && yard.length && tr++ < 600) {
        const [hx, hy] = pick(yard); if (!this.ok(hx, hy, YARD) || placed.some((p) => Math.hypot(p[0] - hx, p[1] - hy) < 150)) continue;
        placed.push([hx, hy]); ny++;
        const list = [], nh = 2 + ((Math.random() * 3) | 0), nc = (Math.random() * 5) | 0;
        const [gx, gy] = spot(hx, hy, 'gallina', 22, YARD); list.push(mkEnt('gallina', gx, gy, 0, { gallo: true, s: 1 }));
        const hens = []; for (let i = 0; i < nh; i++) { const [x, y] = spot(hx, hy, 'gallina', 26, YARD); const e = mkEnt('gallina', x, y, (Math.random() * 4) | 0); list.push(e); hens.push(e); }
        for (let i = 0; i < nc; i++) { const m = pick(hens), [x, y] = spot(m.x, m.y, 'pollo', 10, YARD); list.push(mkEnt('pollo', x, y, 0, { m, ox: rnd(-9, 9), oy: rnd(-7, 7) })); }
        this.groups.push({ k: 'gallina', hx, hy, list, snd: rnd(3, 10) });
      }
      // gatos: uno por lugar, sueltos
      let nc = 0; tr = 0;
      while (nc < 46 && cats.length && tr++ < 800) {
        const [hx, hy] = pick(cats); if (!this.ok(hx, hy, YARD) || placed.some((p) => Math.hypot(p[0] - hx, p[1] - hy) < 110)) continue;
        placed.push([hx, hy]); nc++;
        this.groups.push({ k: 'gato', hx, hy, list: [mkEnt('gato', hx, hy, (Math.random() * 5) | 0, { mode: Math.random() < 0.5 ? 'graze' : 'walk' })], snd: rnd(5, 30) });
      }
      // loros: bandadas en copas de árboles, de a 5 a 9
      if (trees.length > 10) for (let i = 0; i < 12; i++) {
        const [rx, ry] = pick(trees), n = 5 + ((Math.random() * 5) | 0), birds = [];
        for (let j = 0; j < n; j++) birds.push({ x: rx + rnd(-12, 12), y: ry + rnd(-8, 8), ox: rnd(-12, 12), oy: rnd(-8, 8), alt: 18 + rnd(0, 8), anim: Math.random() * 3, dir: Math.random() < 0.5 ? 'l' : 'r', delay: 0 });
        this.flocks.push({ rx, ry, birds, mode: 'perch', wt: rnd(8, 40), dx: rx, dy: ry, t: 0 });
      }
      // urubúes: grupos de 2 a 4 dando vueltas sobre las afueras
      for (let i = 0; i < 5 && past.length; i++) { const [cx, cy] = pick(past), n = 2 + ((Math.random() * 3) | 0); this.vultures.push({ cx, cy, rad: rnd(70, 120), w: (Math.random() < 0.5 ? -1 : 1) * rnd(0.22, 0.4), ph: rnd(0, 6.28), n, alt: rnd(54, 74) }); }
    }

    update(dt, cam, th, scares) {
      if (!this.ready) { if (this.fauna.vacas && this.fauna.vacas.ready) this.init(); else return; }
      this.t += dt; this.snd -= dt;
      for (const g of this.groups) {
        if (Math.abs(g.hx - cam.x) > 850 || Math.abs(g.hy - cam.y) > 660) continue;
        for (const e of g.list) this.upd(e, g, dt, th, scares);
        g.snd -= dt;
        if (g.snd <= 0) {
          const sp = SP[g.k], e = pick(g.list), near = Math.hypot(e.x - cam.x, e.y - cam.y) < 420;
          if (VR.audio && VR.audio.animal && near) {
            if (g.k === 'gallina') VR.audio.animal(e.gallo || Math.random() < 0.18 ? 'gallo' : 'gallina', e.x, e.y);
            else if (g.k === 'gato') { if (Math.hypot(e.x - cam.x, e.y - cam.y) < 160) VR.audio.animal('gato', e.x, e.y); }
            else VR.audio.animal(g.k, e.x, e.y);
          }
          g.snd = sp ? rnd(sp.snd[0], sp.snd[1]) : 20;
          if (g.k === 'gallina') g.snd = rnd(5, 13);
          if (g.k === 'gato') g.snd = rnd(25, 60);
        }
      }
      this.updFlocks(dt, cam, th, scares);
      for (const v of this.vultures) v.ph += v.w * dt;
      this.updNight(dt, cam);
    }

    upd(e, g, dt, th, scares) {
      const sp = SP[e.k];
      e.anim += dt * (e.mode === 'graze' ? 1.4 : e.flee > 0 ? 8 : 3.6);
      if (e.fly) { // tero en vuelo corto
        e.fly -= dt; const nx = e.x + e.fx * 52 * dt, ny = e.y + e.fy * 52 * dt; if (this.tile(nx, ny) >= 0) { e.x = nx; e.y = ny; }
        e.alt = Math.sin(Math.PI * Math.min(1, Math.max(0, 1 - e.fly / e.flyT))) * 16; e.dir = e.fx > 0 ? 'r' : 'l';
        if (e.fly <= 0) { e.fly = 0; e.alt = 0; e.mode = 'graze'; e.wt = rnd(4, 9); e.hx = e.x; e.hy = e.y; g.hx = e.x; g.hy = e.y; }
        return;
      }
      let fx = 0, fy = 0, run = 0;
      for (const t of th) { if (t.r) continue; const dx = e.x - t.x, dy = e.y - t.y, d = Math.hypot(dx, dy) || 1, lim = t.sp > 70 ? sp.trig[2] : t.sp > 0 ? sp.trig[1] : sp.trig[0]; if (d < lim) { fx += dx / d; fy += dy / d; run = Math.max(run, t.sp > 70 ? 2 : 1); } }
      for (const s of scares) { const dx = e.x - s.x, dy = e.y - s.y, d = Math.hypot(dx, dy) || 1; if (d < s.r) { fx += dx / d; fy += dy / d; run = 2; } }
      if (fx || fy) {
        const m = Math.hypot(fx, fy) || 1; e.fx = fx / m; e.fy = fy / m;
        if (sp.fly && run >= 1 && !e.fly && Math.random() < 0.08 + run * 0.04) { e.fly = e.flyT = rnd(1.6, 2.6); e.mode = 'walk'; if (VR.audio && VR.audio.animal) VR.audio.animal('tero', e.x, e.y); return; }
        e.flee = 1.1; e.run = run; e.mode = 'walk';
        if (e.k === 'gato' && Math.random() < 0.02 && VR.audio && VR.audio.animal) VR.audio.animal('gato', e.x, e.y);
      }
      if (e.flee > 0) {
        e.flee -= dt; const s = sp.flee * (e.run === 2 ? 1 : 0.6), nx = e.x + e.fx * s * dt, ny = e.y + e.fy * s * dt;
        if (this.ok(nx, ny, sp.ok)) { e.x = nx; e.y = ny; e.dir = Math.abs(e.fx) > Math.abs(e.fy) ? (e.fx > 0 ? 'r' : 'l') : (e.fy > 0 ? 'd' : 'u'); } else e.flee = 0;
        e.alt = sp.bird ? Math.abs(Math.sin(e.anim * 1.5)) * 2.2 : 0;
        if (e.flee <= 0) { e.mode = 'graze'; e.wt = rnd(2, 6); e.alt = 0; }
        return;
      }
      e.alt = 0;
      if (e.m) { // pollito: va detrás de la mamá
        const tx = e.m.x + e.ox, ty = e.m.y + e.oy, dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
        if (d > 5) { const nx = e.x + dx / d * 11 * dt, ny = e.y + dy / d * 11 * dt; if (this.ok(nx, ny, sp.ok)) { e.x = nx; e.y = ny; e.mode = 'walk'; e.dir = dx > 0 ? 'r' : 'l'; } }
        else { e.mode = 'graze'; if (Math.random() < 0.01) { e.ox = rnd(-9, 9); e.oy = rnd(-7, 7); } }
        return;
      }
      e.wt -= dt;
      if (e.mode === 'graze') {
        if (e.wt <= 0) { for (let j = 0; j < 8; j++) { const a = rnd(0, 6.28), r = rnd(8, 26), qx = e.x + Math.cos(a) * r, qy = e.y + Math.sin(a) * r; if (Math.hypot(qx - g.hx, qy - g.hy) < sp.r && this.ok(qx, qy, sp.ok)) { e.tx = qx; e.ty = qy; e.mode = 'walk'; break; } } e.wt = rnd(2, e.k === 'gato' ? 14 : 7); }
      } else {
        const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
        if (d < 2 || e.wt < -8) { e.mode = 'graze'; e.wt = rnd(4, e.k === 'gato' ? 20 : 12); }
        else { const nx = e.x + dx / d * sp.walk * dt, ny = e.y + dy / d * sp.walk * dt; if (this.ok(nx, ny, sp.ok)) { e.x = nx; e.y = ny; e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); } else { e.mode = 'graze'; e.wt = rnd(3, 6); } }
      }
    }

    updFlocks(dt, cam, th, scares) {
      for (const f of this.flocks) {
        if (Math.abs(f.rx - cam.x) > 1000 || Math.abs(f.ry - cam.y) > 800) continue;
        f.wt -= dt;
        if (f.mode === 'perch') {
          let go = f.wt <= 0;
          for (const t of th) { if (t.r) continue; if (Math.hypot(f.rx - t.x, f.ry - t.y) < (t.sp > 70 ? 110 : t.sp > 0 ? 55 : 24)) go = true; }
          for (const s of scares) if (Math.hypot(f.rx - s.x, f.ry - s.y) < s.r) go = true;
          if (go && this.roosts.length > 3) {
            let best = null; for (let k = 0; k < 20 && !best; k++) { const r = pick(this.roosts), d = Math.hypot(r[0] - f.rx, r[1] - f.ry); if (d > 160 && d < 520) best = r; }
            if (best) { f.mode = 'fly'; f.dx = best[0]; f.dy = best[1]; f.t = 0; for (const b of f.birds) b.delay = rnd(0, 0.5); if (VR.audio && VR.audio.animal) { VR.audio.animal('loro', f.rx, f.ry); } } else f.wt = rnd(15, 40);
          }
        } else {
          f.t += dt; let arrived = 0;
          for (const b of f.birds) {
            if (b.delay > 0) { b.delay -= dt; continue; }
            b.anim += dt * 14; const tx = f.dx + b.ox, ty = f.dy + b.oy, dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
            if (d < 4) { b.alt += (20 - b.alt) * Math.min(1, dt * 4); arrived++; b.x = tx; b.y = ty; continue; }
            const sp = 78; b.x += dx / d * sp * dt; b.y += dy / d * sp * dt; b.dir = dx > 0 ? 'r' : 'l'; b.vx = dx / d; b.vy = dy / d;
            b.alt += (Math.min(36, 20 + d * 0.15) - b.alt) * Math.min(1, dt * 3);
          }
          if (f.t > 0.8 && Math.random() < dt * 0.5 && VR.audio && VR.audio.animal) VR.audio.animal('loro', f.birds[0].x, f.birds[0].y);
          if (arrived === f.birds.length) { f.mode = 'perch'; f.rx = f.dx; f.ry = f.dy; f.wt = rnd(25, 70); }
        }
      }
    }

    updNight(dt, cam) {
      const nl = this.night(), outer = this.outer(cam.x, cam.y);
      if (VR.audio && VR.audio.grillos) VR.audio.grillos(nl > 0.5 ? (nl - 0.5) * 2 * (outer ? 1 : 0.4) : 0);
      if (nl > 0.55 && this.snd <= 0 && VR.audio && VR.audio.animal) { VR.audio.animal('sapo', cam.x + rnd(-120, 120), cam.y + rnd(-90, 90)); this.snd = outer ? rnd(2, 6) : rnd(8, 20); }
      // murciélagos
      const want = nl > 0.75 ? (outer ? 7 : 3) : 0;
      while (this.bats.length < want) { const a = rnd(0, 6.28), r = rnd(120, 300); this.bats.push({ x: cam.x + Math.cos(a) * r, y: cam.y + Math.sin(a) * r, a: rnd(0, 6.28), sp: rnd(38, 60), anim: Math.random() * 5, alt: rnd(22, 40), ph: rnd(0, 6.28) }); }
      if (this.bats.length > want) this.bats.length = want;
      for (const b of this.bats) {
        b.anim += dt * 22; b.a += Math.sin(this.t * 1.7 + b.ph) * 3.2 * dt + rnd(-1, 1) * 2 * dt; b.x += Math.cos(b.a) * b.sp * dt; b.y += Math.sin(b.a) * b.sp * dt; b.alt = 28 + Math.sin(this.t * 2 + b.ph) * 8;
        if (Math.abs(b.x - cam.x) > 360 || Math.abs(b.y - cam.y) > 280) { const a = rnd(0, 6.28); b.x = cam.x + Math.cos(a) * 280; b.y = cam.y + Math.sin(a) * 220; b.a = a + 3.14; }
      }
      // luciérnagas: solo en las afueras
      const fw = nl > 0.6 && outer ? 18 : 0;
      while (this.flies.length < fw) this.flies.push({ x: cam.x + rnd(-300, 300), y: cam.y + rnd(-220, 220), a: rnd(0, 6.28), ph: rnd(0, 6.28), alt: rnd(4, 14) });
      if (this.flies.length > fw) this.flies.length -= 1;
      for (const f of this.flies) {
        f.a += rnd(-1, 1) * 3 * dt; f.x += Math.cos(f.a) * 6 * dt; f.y += Math.sin(f.a) * 6 * dt; f.alt = 9 + Math.sin(this.t * 0.8 + f.ph) * 5;
        if (Math.abs(f.x - cam.x) > 340 || Math.abs(f.y - cam.y) > 260 || !(this.tile(f.x, f.y) === T.GRASS || this.tile(f.x, f.y) === T.DIRT)) { f.x = cam.x + rnd(-300, 300); f.y = cam.y + rnd(-220, 220); }
        const glow = Math.max(0, Math.sin(this.t * 2.1 + f.ph * 3)); if (glow > 0.2 && VR.night) VR.night.add(f.x, f.y - f.alt, 14, '190,255,90', 0.55 * glow);
      }
    }

    collect(cx, cy, sw, sh, tall) {
      if (!this.ready) return;
      const vis = (x, y, m = 40) => x - cx > -m && x - cx < sw + m && y - cy > -m - 20 && y - cy < sh + m + 20;
      for (const g of this.groups) for (const e of g.list) {
        if (!vis(e.x, e.y)) continue;
        const sp = SP[e.k], moving = e.mode === 'walk' || e.flee > 0, f = moving ? (Math.floor(e.anim) & 1) : 0, low = e.mode === 'graze';
        let img, hop = e.alt || 0;
        if (e.k === 'gallina') img = heni(e.v, e.dir === 'l' ? 'l' : 'r', f, low && !moving ? 1 : 0, !!e.gallo);
        else if (e.k === 'pollo') { img = chickSide(f); if (e.dir === 'l') img = get('pollo_l' + f, () => flip(chickSide(f))); }
        else if (e.k === 'tero') img = teroI(e.dir === 'l' ? 'l' : 'r', f, low && !moving ? 1 : 0);
        else img = quadImg(e.k, e.v, e.dir, f, e.k === 'gato' ? (low && e.wt > 2) : low && (e.dir === 'l' || e.dir === 'r'));
        if (e.fly) { // tero volando: va arriba de todo, con su sombra en el piso
          const fi = flyImg('tero', Math.floor(e.anim * 2) & 1), a = Math.atan2(e.fy, e.fx) + Math.PI / 2;
          tall.push({ sy: e.y, draw: (g2) => { g2.fillStyle = 'rgba(0,0,0,0.18)'; g2.beginPath(); g2.ellipse(e.x - cx, e.y - cy, 7, 2.4, 0, 0, 6.283); g2.fill(); } });
          tall.push({ sy: 1e7 + e.y, draw: (g2) => { g2.save(); g2.translate(e.x - cx, e.y - cy - e.alt - 4); g2.rotate(a); g2.drawImage(fi, -fi.width / 4, -fi.height / 4, fi.width / 2, fi.height / 2); g2.restore(); } });
          continue;
        }
        const w = img.width / P * e.s, hh = img.height / P * e.s;
        tall.push({ sy: e.y, draw: (g2) => { g2.fillStyle = 'rgba(0,0,0,0.22)'; g2.beginPath(); g2.ellipse(e.x - cx, e.y - cy - 1, w * 0.42, Math.max(1.4, hh * 0.12), 0, 0, 6.283); g2.fill(); g2.drawImage(img, Math.round(e.x - cx - w / 2), Math.round(e.y - cy - hh + 2 - hop), w, hh); } });
      }
      // loros: posados arriba de las copas o volando
      for (const fl of this.flocks) for (const b of fl.birds) {
        if (!vis(b.x, b.y - b.alt, 60)) continue;
        if (fl.mode === 'perch' || (b.delay > 0)) {
          const img = parrotPerch(); tall.push({ sy: 1e7 + b.y, draw: (g) => { const im = b.dir === 'l' ? get('loroPl', () => flip(parrotPerch())) : img; g.drawImage(im, Math.round(b.x - cx - 2.5), Math.round(b.y - cy - b.alt - 7), 5, 7.5); } });
        } else {
          const fi = flyImg('loro', Math.floor(b.anim) & 1), a = Math.atan2(b.vy || 0, b.vx || 1) + Math.PI / 2;
          tall.push({ sy: 1e7 + b.y, draw: (g) => { g.fillStyle = 'rgba(0,0,0,0.14)'; g.beginPath(); g.ellipse(b.x - cx, b.y - cy, 4, 1.4, 0, 0, 6.283); g.fill(); g.save(); g.translate(b.x - cx, b.y - cy - b.alt); g.rotate(a); g.drawImage(fi, -fi.width / 4, -fi.height / 4, fi.width / 2, fi.height / 2); g.restore(); } });
        }
      }
      // urubúes: vuelan en círculo con las alas abiertas
      for (const v of this.vultures) {
        if (!vis(v.cx, v.cy, v.rad + 40)) continue;
        for (let i = 0; i < v.n; i++) {
          const ph = v.ph + i * (6.283 / v.n), x = v.cx + Math.cos(ph) * v.rad, y = v.cy + Math.sin(ph) * v.rad * 0.8, hd = ph + (v.w > 0 ? Math.PI / 2 : -Math.PI / 2), fi = flyImg('urubu', 0), alt = v.alt + Math.sin(this.t * 0.5 + i) * 3;
          tall.push({ sy: y, draw: (g) => { g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(x - cx + 6, y - cy + 4, 9, 3.2, 0, 0, 6.283); g.fill(); } });
          tall.push({ sy: 1e7 + y, draw: (g) => { g.save(); g.translate(x - cx, y - cy - alt); g.rotate(hd + Math.PI / 2); g.drawImage(fi, -fi.width / 4, -fi.height / 4, fi.width / 2, fi.height / 2); g.restore(); } });
        }
      }
      for (const b of this.bats) {
        if (!vis(b.x, b.y - b.alt, 30)) continue;
        const fi = flyImg('murci', Math.floor(b.anim) & 1);
        tall.push({ sy: 1e7 + b.y, draw: (g) => { g.save(); g.translate(b.x - cx, b.y - cy - b.alt); g.rotate(b.a + Math.PI / 2); g.drawImage(fi, -fi.width / 4, -fi.height / 4, fi.width / 2, fi.height / 2); g.restore(); } });
      }
      for (const f of this.flies) {
        if (!vis(f.x, f.y, 10)) continue;
        const glow = Math.max(0, Math.sin(this.t * 2.1 + f.ph * 3));
        tall.push({ sy: 1e7 + f.y, draw: (g) => { const x = f.x - cx, y = f.y - cy - f.alt; g.fillStyle = 'rgba(210,255,120,' + (0.25 + glow * 0.75).toFixed(2) + ')'; g.fillRect(Math.round(x), Math.round(y), 1.5, 1.5); if (glow > 0.3) { g.fillStyle = 'rgba(190,255,90,' + (glow * 0.18).toFixed(2) + ')'; g.beginPath(); g.arc(x + 0.7, y + 0.7, 3.4, 0, 6.283); g.fill(); } } });
      }
    }
  };
})();
