// Fauna (10/11/2026, pedido de Leandro): carpinchos, patos, pececitos y palomas.
// - Carpinchos: manadas que pastan cerca de la laguna Ykua Pytã, se meten al agua y la cruzan nadando (se les ve
//   la cabeza y el lomo). Si pasás corriendo o con un vehículo se apartan sin apurarse. Nunca se lastiman.
// - Patos: nadan en fila detrás del primero y cada tanto vuelan de una orilla a la otra (o se asustan con un cisne
//   cerca). A veces bajan a la orilla y caminan un rato.
// - Pececitos: cardúmenes oscuros bajo el agua turbia, alguno anaranjado; de vez en cuando uno salta.
// - Palomas: bandadas en la laguna, la Plaza de los Héroes y las demás plazas; si te acercás salen volando y bajan
//   más lejos. También vuelan con tiros, explosiones y gente que se dispersa (peds.scatter).
// - Vacas (12/11/2026, pedido de Leandro): manadas que pastan en el pasto abierto de Santa Lucía y San Miguel (`VR.Vacas`, al final).
// Todo es local de cada jugador (no viaja online) y solo se mueve lo que está cerca de la cámara.
'use strict';
(() => {
  const T = VR.T, S = VR.TILE, P = 2; // P: píxeles del sprite por unidad del mundo
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
  const CAPY_LAND = new Uint8Array(16); for (const t of [T.GRASS, T.DIRT, T.PLAZADIRT, T.PAVING, T.SENDERO, T.LADRILLO]) CAPY_LAND[t] = 1;

  // ---------- sprites por código, píxel nítido con contorno ----------
  function sprite(w, h, fn, line) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const px = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), ww, hh); };
    const ell = (cx, cy, rx, ry, col) => { g.fillStyle = col; for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1); } };
    fn(px, ell);
    if (line) { // contorno oscuro de 1 px alrededor de lo pintado
      const im = g.getImageData(0, 0, w, h), d = im.data, A = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0, out = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!A(x, y) && (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1))) out.push(x, y);
      g.fillStyle = line; for (let i = 0; i < out.length; i += 2) g.fillRect(out[i], out[i + 1], 1, 1);
    }
    return c;
  }
  const flip = (c) => { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; };
  const cache = new Map();
  const get = (key, mk) => { let v = cache.get(key); if (!v) { v = mk(); cache.set(key, v); } return v; };

  // carpincho de costado (mirando a la derecha), de frente (abajo) y de espaldas (arriba); s = tamaño (crías 0,7)
  const CAPY = { b: '#8a5a34', l: '#a8743f', d: '#684223', h: '#7a4f2d', n: '#3a2516', e: '#140d08', o: '#2e1d12' };
  function capySide(s, f, graze) {
    const W = Math.ceil(36 * s), H = Math.ceil(24 * s), q = (v) => v * s;
    return sprite(W, H, (px, ell) => {
      const leg = (x, up) => px(q(x), q(up ? 16 : 17), Math.max(2, q(3)), Math.max(2, q(up ? 5 : 5)), CAPY.d);
      leg(7, f === 1); leg(11, f === 0); leg(23, f === 0); leg(26, f === 1);
      ell(q(16), q(13), q(11.5), q(6.8), CAPY.b);
      ell(q(15), q(10.5), q(9), q(3.4), CAPY.l);
      px(q(7), q(16), q(18), Math.max(1, q(2)), CAPY.d);
      const hy = graze ? 4 : 0;
      ell(q(27), q(9 + hy), q(5.2), q(4.4), CAPY.h);
      px(q(28), q(7 + hy), q(6), q(7), CAPY.h);
      px(q(28), q(6 + hy), q(4), Math.max(1, q(1.5)), CAPY.l);
      px(q(33), q(9 + hy), Math.max(1, q(1.5)), Math.max(1, q(2.5)), CAPY.n);
      px(q(28), q(8 + hy), 1, 1, CAPY.e);
      px(q(23.5), q(4.5 + hy), Math.max(2, q(2.5)), Math.max(2, q(2.5)), CAPY.d);
    }, CAPY.o);
  }
  function capyFront(s, f, back) {
    const W = Math.ceil(24 * s), H = Math.ceil(24 * s), q = (v) => v * s;
    return sprite(W, H, (px, ell) => {
      px(q(6), q(back ? 18 : 19) - (f ? 1 : 0), Math.max(2, q(3)), Math.max(2, q(4)), CAPY.d);
      px(q(15), q(back ? 18 : 19) - (f ? 0 : 1), Math.max(2, q(3)), Math.max(2, q(4)), CAPY.d);
      ell(q(12), q(12), q(8.5), q(7.5), CAPY.b);
      ell(q(12), q(10), q(6.5), q(4), CAPY.l);
      if (back) { ell(q(12), q(4.5), q(4.5), q(3.5), CAPY.h); px(q(7.5), q(2), Math.max(2, q(2)), Math.max(2, q(2)), CAPY.d); px(q(15), q(2), Math.max(2, q(2)), Math.max(2, q(2)), CAPY.d); }
      else {
        ell(q(12), q(15), q(6), q(5.5), CAPY.h); px(q(9), q(11), q(6), Math.max(1, q(1.5)), CAPY.l);
        px(q(6), q(9.5), Math.max(2, q(2)), Math.max(2, q(2)), CAPY.d); px(q(16), q(9.5), Math.max(2, q(2)), Math.max(2, q(2)), CAPY.d);
        px(q(8.5), q(13.5), 1, 1, CAPY.e); px(q(14.5), q(13.5), 1, 1, CAPY.e);
        px(q(10), q(18), Math.max(2, q(4)), Math.max(1, q(2)), CAPY.n);
      }
    }, CAPY.o);
  }
  function capyImg(s, dir, f, graze) {
    return get('c' + s + dir + f + (graze ? 'g' : ''), () => dir === 'r' ? capySide(s, f, graze) : dir === 'l' ? flip(capyImg(s, 'r', f, graze)) : capyFront(s, f, dir === 'u'));
  }

  // pato nadando o caminando (de costado) y volando (desde arriba); col = [cuerpo, sombra, cabeza]
  const DUCKS = [['#f2efe6', '#c9c3b3', '#f2efe6'], ['#f2efe6', '#c9c3b3', '#f2efe6'], ['#8a6a4a', '#5f4632', '#3f6b4a'], ['#7d6248', '#574330', '#7d6248'], ['#2b2b30', '#18181c', '#e9e5da']];
  function duckSide(ci, walk, f) {
    const c = DUCKS[ci];
    return sprite(20, 16, (px, ell) => {
      if (walk) { px(7, 12 + (f ? 0 : 1), 2, 3 - (f ? 0 : 1), '#e8892c'); px(10, 12 + (f ? 1 : 0), 2, 3 - (f ? 1 : 0), '#e8892c'); }
      ell(9, 9, 7, 4, c[0]); px(2, 6, 3, 3, c[0]); px(1, 6, 2, 2, c[1]);
      px(5, 9, 8, 2, c[1]); px(6, 7, 6, 2, c[1]);
      ell(14.5, 4, 3, 3, c[2]); px(13, 6, 3, 3, c[2]);
      px(17, 4, 3, 2, '#e8892c'); px(15, 3, 1, 1, '#111');
      if (ci === 4) px(14, 5, 3, 2, '#c43b2a'); // pato criollo: cara roja
    }, '#2a2620');
  }
  function duckFly(ci, f) {
    const c = DUCKS[ci];
    return sprite(24, 16, (px, ell) => {
      const wy = f ? 3 : 7;
      px(2, wy, 9, 3, c[1]); px(13, wy, 9, 3, c[1]); px(1, wy + 1, 3, 2, c[0]); px(20, wy + 1, 3, 2, c[0]);
      ell(12, 8, 3.2, 6, c[0]); ell(12, 3, 2.2, 2.2, c[2]); px(11, 0, 2, 1, '#e8892c'); px(11, 13, 2, 2, c[1]);
    }, '#2a2620');
  }
  const duckImg = (ci, dir, walk, f) => get('d' + ci + dir + (walk ? 'w' : 's') + f, () => dir === 'r' ? duckSide(ci, walk, f) : flip(duckImg(ci, 'r', walk, f)));
  const duckFlyImg = (ci, f) => get('df' + ci + f, () => duckFly(ci, f));

  // paloma: de costado (picoteando o no) y volando
  const PIG = [['#8e919c', '#6b6e78', '#5f6270'], ['#a3a6b0', '#7a7d88', '#686b78'], ['#7b7470', '#5a5450', '#4c4744'], ['#d9d7d2', '#b3b0aa', '#9a978f']];
  function pigSide(ci, peck, f) {
    const c = PIG[ci];
    return sprite(14, 12, (px, ell) => {
      px(5, 9, 1, 2 - f, '#d77a7a'); px(7, 9, 1, 2 - (1 - f), '#d77a7a');
      ell(6, 7, 4.6, 2.8, c[0]); px(1, 6, 2, 2, c[1]); px(4, 6, 4, 2, c[1]); px(5, 7, 1, 1, '#2c2c34'); px(7, 7, 1, 1, '#2c2c34');
      const hy = peck ? 3 : 0;
      ell(10, 3.5 + hy, 2.2, 2.2, c[2]); px(9, 5 + hy, 2, 1, '#5d8f70'); px(8, 5 + hy, 1, 1, '#7d5f93');
      px(12, 3 + hy, 2, 1, '#3a3a3a'); px(10, 3 + hy, 1, 1, '#d8692c');
    }, '#23232a');
  }
  function pigFly(ci, f) {
    const c = PIG[ci];
    return sprite(18, 12, (px, ell) => {
      const wy = f ? 2 : 5;
      px(1, wy, 6, 2, c[1]); px(11, wy, 6, 2, c[1]); px(0, wy + 1, 2, 2, '#3a3a44'); px(16, wy + 1, 2, 2, '#3a3a44');
      ell(9, 6, 2.4, 4.2, c[0]); ell(9, 2.5, 1.8, 1.8, c[2]); px(8, 9, 3, 2, c[1]);
    }, '#23232a');
  }
  const pigImg = (ci, dir, peck, f) => get('p' + ci + dir + (peck ? 'k' : '') + f, () => dir === 'r' ? pigSide(ci, peck, f) : flip(pigImg(ci, 'r', peck, f)));
  const pigFlyImg = (ci, f) => get('pf' + ci + f, () => pigFly(ci, f));

  // garza blanca (mirando a la derecha): parada con patas largas y cuello en S, o en vuelo con las alas abiertas
  function heronStand(f) {
    return sprite(26, 30, (px, ell) => {
      px(10, 17, 1, 11 - f, '#b8963c'); px(13, 17, 1, 11 - (1 - f), '#b8963c'); px(9, 28 - f, 3, 1, '#8a6a28'); px(12, 28 - (1 - f), 3, 1, '#8a6a28');
      ell(11, 14, 7, 3.8, '#f4f4f0'); ell(10, 15.5, 6, 2, '#d6dade'); px(2, 12, 5, 2, '#e8eaec'); ell(10, 13, 4.6, 2.2, '#e6e8ea');
      px(16, 9, 2, 6, '#f4f4f0'); px(17, 5, 2, 5, '#f4f4f0'); px(16, 7, 1, 2, '#f4f4f0');
      ell(18.5, 3.6, 2.4, 1.8, '#f6f6f2'); px(20, 3, 6, 1, '#e8b020'); px(19, 2, 1, 1, '#16161a'); px(14, 6, 3, 1, '#f4f4f0');
    }, '#2b2f36');
  }
  function heronFly(f) {
    return sprite(34, 22, (px, ell) => {
      const wy = f ? 2 : 8;
      ell(17, wy + 3, 14, 2.4, '#f2f4f4'); px(2, wy + 3, 6, 2, '#2f343a'); px(26, wy + 3, 6, 2, '#2f343a');
      ell(17, 11, 5.6, 2.6, '#f6f6f2'); px(22, 8, 5, 2, '#f6f6f2'); ell(27, 8, 2, 1.6, '#f6f6f2'); px(28, 8, 4, 1, '#e8b020'); px(7, 10, 8, 1, '#f2f2ee'); px(5, 14, 7, 1, '#b8963c');
    }, '#2b2f36');
  }
  const heronImg = (dir, f) => get('hs' + dir + f, () => dir === 'r' ? heronStand(f) : flip(heronImg('r', f)));
  const heronFlyImg = (dir, f) => get('hf' + dir + f, () => dir === 'r' ? heronFly(f) : flip(heronFly(f)));
  const flap = (x, y, n = 3) => { const A = VR.audio; if (!A || !A.on) return; const v = A.near(x, y, 380) * 0.07; if (v <= 0.005) return; for (let i = 0; i < n; i++) A.noise(0.05, { vol: v, lp: 2200, hp: 400, at: i * 0.07 }); };
  const quack = (x, y) => { const A = VR.audio; if (!A || !A.on) return; const v = A.near(x, y, 420) * 0.05; if (v <= 0.005) return; A.tone(560, 0.08, { type: 'sawtooth', vol: v, f2: 380, lp: 1600 }); A.tone(540, 0.09, { type: 'sawtooth', vol: v, f2: 360, lp: 1600, at: 0.13 }); };

  VR.Fauna = class {
    constructor(world) {
      this.world = world; this.ready = false; this.t = 0;
      this.herds = []; this.ducks = []; this.fish = []; this.flocks = []; this.rip = []; this.herons = [];
      this.scares = []; this.vacas = new VR.Vacas(world); this.granja = new VR.Granja(world, this);
    }
    tile(x, y) { return this.world.get(Math.floor(x / S), Math.floor(y / S)); }
    water(x, y) { return this.tile(x, y) === T.LAGUNA; }
    capyOk(x, y) { const t = this.tile(x, y); return t === T.LAGUNA || (t >= 0 && CAPY_LAND[t] === 1 && !this.world.hits(x - 3, y - 3, x + 3, y)); }
    // la primera vez: busca la laguna, sus orillas, el pasto de alrededor y los lugares de las palomas
    init() {
      this.ready = true;
      const W = this.world, w = W.w, tiles = W.tiles, water = [];
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let i = 0; i < tiles.length; i++) if (tiles[i] === T.LAGUNA) { const x = i % w, y = (i / w) | 0; water.push(i); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      this.lake = water.length ? { x0: x0 * S, y0: y0 * S, x1: (x1 + 1) * S, y1: (y1 + 1) * S } : null;
      if (this.lake) {
        const open = [], shore = [], graze = [], isW = (x, y) => W.get(x, y) === T.LAGUNA;
        for (const i of water) { const x = i % w, y = (i / w) | 0; if (isW(x - 2, y) && isW(x + 2, y) && isW(x, y - 2) && isW(x, y + 2)) open.push([x * S + 8, y * S + 8]); }
        for (let y = y0 - 8; y <= y1 + 8; y++) for (let x = x0 - 8; x <= x1 + 8; x++) {
          const t = W.get(x, y); if (t < 0 || !CAPY_LAND[t]) continue;
          let near = 99; for (let dy = -7; dy <= 7 && near > 1; dy++) for (let dx = -7; dx <= 7; dx++) if (isW(x + dx, y + dy)) near = Math.min(near, Math.max(Math.abs(dx), Math.abs(dy)));
          if (near === 1) shore.push([x * S + 8, y * S + 8]);
          if (near <= 7 && (t === T.GRASS || t === T.DIRT)) graze.push([x * S + 8, y * S + 8]);
        }
        this.open = open; this.shore = shore.filter(([x, y]) => this.capyOk(x, y)); this.graze = graze.filter(([x, y]) => this.capyOk(x, y));
        // dos manadas de carpinchos (5 y 3, con crías) y una bandada de 7 patos
        for (const n of [5, 3]) {
          if (!this.graze.length) break;
          const [hx, hy] = pick(this.graze), list = [];
          for (let k = 0; k < n; k++) { const sp = this.nearSpot(this.graze, hx, hy, 40) || [hx, hy]; list.push({ x: sp[0], y: sp[1], s: k >= n - (n > 3 ? 2 : 1) ? 0.9 : 1.3, dir: pick(['l', 'r', 'd']), anim: Math.random() * 2, graze: true, tx: sp[0], ty: sp[1], gt: rnd(0, 4), swim: false }); }
          this.herds.push({ list, state: 'graze', t: rnd(3, 8), trail: [], path: null, lastCross: -40 + Math.random() * 30 });
        }
        if (this.open.length) {
          const [dx, dy] = pick(this.open);
          for (let k = 0; k < 7; k++) this.ducks.push({ x: dx - k * 8, y: dy + rnd(-2, 2), ci: k < 3 ? 0 : k === 3 ? 4 : 1 + (k % 3), dir: 'r', alt: 0, mode: 'swim', delay: 0, anim: Math.random() * 2 });
          this.duckState = { t: rnd(25, 45), tx: dx, ty: dy, trail: [], nt: 0, land: 0 };
          // cardúmenes de pececitos
          for (let k = 0; k < 8; k++) {
            const [fx, fy] = pick(this.open), list = [];
            const n = 7 + ((Math.random() * 7) | 0);
            for (let j = 0; j < n; j++) list.push({ ox: rnd(-16, 16), oy: rnd(-11, 11), ph: rnd(0, 6.3), sz: rnd(0.8, 1.25), or: Math.random() < 0.12 });
            this.fish.push({ x: fx, y: fy, a: rnd(0, 6.3), v: rnd(6, 12), tx: fx, ty: fy, list, dart: 0 });
          }
        }
      }
      if (this.shore && this.shore.length) { // 3 garzas blancas paradas en la orilla, separadas entre sí
        for (let k = 0; k < 40 && this.herons.length < 3; k++) { const p = pick(this.shore); if (this.herons.every((h) => Math.hypot(h.x - p[0], h.y - p[1]) > 110)) this.herons.push({ x: p[0], y: p[1], dir: Math.random() < 0.5 ? 'l' : 'r', mode: 'stand', alt: 0, anim: Math.random() * 3, wt: rnd(4, 9), cool: 0 }); }
      }
      // palomas: 3 bandadas en el parque y 2 en cada plaza con nombre
      const want = new Map(); let parkId = 0;
      (W.areas || []).forEach((n, i) => { if (/parque manuel ortiz/i.test(n)) { parkId = i + 1; want.set(i + 1, 3); } else if (/plaza/i.test(n)) want.set(i + 1, /héroes/i.test(n) ? 3 : 2); });
      const PIG_OK = new Uint8Array(16); for (const t of [T.PAVING, T.PLAZADIRT, T.SENDERO, T.LADRILLO, T.SIDEWALK, T.DIRT, T.GRASS, T.CHECKER]) PIG_OK[t] = 1;
      const cand = new Map(), seen = new Map();
      for (let i = 0; i < W.area.length; i++) {
        const a = W.area[i]; if (!a || !want.has(a)) continue; const t = tiles[i]; if (!PIG_OK[t] || (t === T.GRASS && a !== parkId)) continue;
        const n = (seen.get(a) || 0) + 1; seen.set(a, n); let L = cand.get(a); if (!L) cand.set(a, L = []);
        if (L.length < 60) L.push(i); else { const j = (Math.random() * n) | 0; if (j < 60) L[j] = i; } // muestra al azar
      }
      for (const [a, L] of cand) for (let k = 0; k < want.get(a) && L.length; k++) {
        const i = L.splice((Math.random() * L.length) | 0, 1)[0], hx = (i % w) * S + 8, hy = ((i / w) | 0) * S + 8;
        if (this.world.hits(hx - 4, hy - 4, hx + 4, hy)) continue;
        const birds = [], n = 6 + ((Math.random() * 6) | 0);
        for (let j = 0; j < n; j++) birds.push({ x: hx + rnd(-14, 14), y: hy + rnd(-10, 10), ci: Math.random() < 0.65 ? 0 : 1 + ((Math.random() * 3) | 0), dir: Math.random() < 0.5 ? 'l' : 'r', alt: 0, vx: 0, vy: 0, wt: rnd(0, 2), peck: 0, anim: Math.random() * 2, delay: 0, gx: 0, gy: 0 });
        this.flocks.push({ hx, hy, birds, fly: 0, cool: 0, tx: hx, ty: hy });
      }
    }
    nearSpot(list, x, y, r) { for (let k = 0; k < 25; k++) { const p = pick(list); if (Math.hypot(p[0] - x, p[1] - y) < r) return p; } return null; }
    // asustar: tiros, explosiones, gente que sale corriendo (lo llama peds.scatter)
    scare(x, y, r) { this.scares.push({ x, y, r: Math.max(r, 90) }); }
    ripple(x, y, r = 10, life = 1.2) { if (this.rip.length < 60) this.rip.push({ x, y, r, t: 0, life }); }

    // threats: [{x, y, sp, r}] cosas que asustan (vos a pie o en un vehículo, los cisnes)
    update(dt, cam, threats) {
      if (!this.ready) this.init();
      this.t += dt;
      const L = this.lake, near = L && cam.x > L.x0 - 900 && cam.x < L.x1 + 900 && cam.y > L.y0 - 700 && cam.y < L.y1 + 700;
      for (const r of this.rip) r.t += dt; this.rip = this.rip.filter((r) => r.t < r.life);
      if (near) { if (!this.netOn) { for (const h of this.herds) this.updHerd(h, dt, threats); this.updDucks(dt, threats); this.updHerons(dt, threats); } this.updFish(dt, threats); }
      if (VR.audio && VR.audio.lago) { const dx = Math.max(L ? L.x0 - cam.x : 1e4, 0, L ? cam.x - L.x1 : 0), dy = Math.max(L ? L.y0 - cam.y : 1e4, 0, L ? cam.y - L.y1 : 0); VR.audio.lago(L ? Math.max(0, 1 - Math.hypot(dx, dy) / 260) : 0); } // sonido de la laguna: se oye cerca de la orilla
      if (this.netOn) this.netStep(dt);
      else for (const f of this.flocks) if (Math.abs(f.hx - cam.x) < 1100 && Math.abs(f.hy - cam.y) < 900) this.updFlock(f, dt, threats, cam);
      this.vacas.update(dt, cam, threats, this.scares); this.granja.update(dt, cam, threats, this.scares);
      this.scares.length = 0;
    }

    // ---------- carpinchos ----------
    updHerd(h, dt, threats) {
      const lead = h.list[0];
      // asustados: si algo rápido o muy cerca pasa al lado, se apartan sin correr
      for (const th of threats) {
        if (th.water) continue;
        const d = Math.hypot(th.x - lead.x, th.y - lead.y), r = th.r || (th.sp > 60 ? 70 : th.sp > 25 ? 40 : 22);
        if (d < r && h.state !== 'flee' && !lead.swim) {
          const a = Math.atan2(lead.y - th.y, lead.x - th.x); let best = null;
          for (let k = 0; k < 8 && !best; k++) { const aa = a + rnd(-0.8, 0.8), x = lead.x + Math.cos(aa) * 60, y = lead.y + Math.sin(aa) * 60; if (this.capyOk(x, y) && this.tile(x, y) !== T.LAGUNA) best = [x, y]; }
          if (best) { h.state = 'flee'; h.path = [best]; h.t = 3; }
        }
      }
      h.t -= dt;
      if (h.state === 'graze' && h.t <= 0) {
        if (this.t - h.lastCross > 55 && Math.random() < 0.4) this.tryCross(h);
        if (h.state === 'graze') { const G = this.nearSpot(this.graze, lead.x, lead.y, 110); if (G) { h.path = [G]; h.state = 'walk'; } else h.t = rnd(3, 6); }
      }
      // el primero sigue el camino; los demás, el rastro del primero
      const moving = h.state !== 'graze';
      if (moving) {
        const tgt = h.path && h.path[0];
        if (!tgt) { h.state = 'graze'; h.t = rnd(5, 12); for (const c of h.list) { const G = this.nearSpot(this.graze, c.x, c.y, 30); c.tx = G ? G[0] : c.x; c.ty = G ? G[1] : c.y; } }
        else if (this.step(lead, tgt[0], tgt[1], (lead.swim ? 12 : 14) * (h.state === 'flee' ? 1.8 : 1), dt)) h.path.shift();
        if (h.state === 'flee' && h.t <= 0 && h.path && h.path.length) h.path.length = 0;
        const last = h.trail[h.trail.length - 1];
        if (!last || Math.hypot(last[0] - lead.x, last[1] - lead.y) > 3) { h.trail.push([lead.x, lead.y]); if (h.trail.length > 240) h.trail.shift(); }
        for (let k = 1; k < h.list.length; k++) {
          const c = h.list[k]; let need = k * 17, i = h.trail.length - 1, p = h.trail[i] || [lead.x, lead.y];
          while (i > 0 && need > 0) { need -= Math.hypot(h.trail[i][0] - h.trail[i - 1][0], h.trail[i][1] - h.trail[i - 1][1]); i--; p = h.trail[i]; }
          const far = Math.hypot(p[0] - c.x, p[1] - c.y);
          if (far > 2) this.step(c, p[0], p[1], (c.swim ? 12 : 14) * (far > 30 ? 1.5 : 1) * (h.state === 'flee' ? 1.8 : 1), dt, true); else c.graze = false;
        }
      } else {
        for (const c of h.list) {
          c.gt -= dt;
          if (Math.hypot(c.tx - c.x, c.ty - c.y) > 2) this.step(c, c.tx, c.ty, 9, dt, true);
          else { c.graze = true; c.anim += dt * 1.2; if (c.gt <= 0) { c.gt = rnd(4, 10); const G = this.nearSpot(this.graze, c.x, c.y, 26); if (G) { c.tx = G[0]; c.ty = G[1]; } } }
        }
        h.trail.length = 0;
      }
    }
    // cruzar la laguna nadando: de una orilla cercana a otra lejos, en línea recta por el agua
    tryCross(h) {
      const lead = h.list[0]; if (this.shore.length < 4) return false;
      const A = this.nearSpot(this.shore, lead.x, lead.y, 160) || this.nearest(this.shore, lead.x, lead.y);
      for (let k = 0; k < 60; k++) {
        const B = pick(this.shore), D = Math.hypot(B[0] - A[0], B[1] - A[1]); if (D < 200) continue;
        let land = 0; for (let s = 14; s < D - 14; s += 6) if (!this.water(A[0] + (B[0] - A[0]) * s / D, A[1] + (B[1] - A[1]) * s / D)) land++;
        if (land === 0) { const G = this.nearSpot(this.graze, B[0], B[1], 80) || B; h.path = [A, B, G]; h.state = 'cross'; h.lastCross = this.t; return true; }
      }
      return false;
    }
    nearest(list, x, y) { let b = list[0], bd = 1e9; for (const p of list) { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; b = p; } } return b; }
    // un paso hacia (tx, ty); true si llegó
    step(c, tx, ty, sp, dt, loose) {
      const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
      if (d < 2) return true;
      const m = Math.min(d, sp * dt), nx = c.x + dx / d * m, ny = c.y + dy / d * m;
      c.x = nx; c.y = ny; // el camino ya se eligió por lugares libres: no se traba nunca
      c.graze = false; c.anim += dt * (sp / 6);
      c.dir = Math.abs(dx) > Math.abs(dy) * 0.7 ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
      const sw = this.water(c.x, c.y);
      if (sw !== c.swim) { c.swim = sw; this.ripple(c.x, c.y, 14, 1.4); }
      return false;
    }

    // ---------- patos ----------
    updDucks(dt, threats) {
      const D = this.ducks, st = this.duckState; if (!D.length) return;
      const lead = D[0];
      st.t -= dt;
      let scared = false;
      for (const th of threats) { const d = Math.hypot(th.x - lead.x, th.y - lead.y); if (d < (th.water ? 46 : th.sp > 60 ? 60 : 28)) scared = true; }
      for (const s of this.scares) if (Math.hypot(s.x - lead.x, s.y - lead.y) < s.r + 60) scared = true;
      const flying = D.some((d) => d.mode === 'fly');
      if (!flying && (st.t <= 0 || scared) && this.open.length) {
        // volar de un lado al otro: a veces bajan a la orilla y caminan un rato
        let dest = null;
        for (let k = 0; k < 30 && !dest; k++) { const p = Math.random() < 0.25 && this.shore.length ? pick(this.shore) : pick(this.open); if (Math.hypot(p[0] - lead.x, p[1] - lead.y) > 180) dest = p; }
        if (dest) {
          st.land = this.water(dest[0], dest[1]) ? 0 : 1; st.t = rnd(30, 60); st.tx = dest[0]; st.ty = dest[1]; st.trail.length = 0;
          D.forEach((d, k) => { d.mode = 'fly'; d.delay = k * rnd(0.08, 0.2) + (scared ? 0 : 0.3); d.fx0 = d.x; d.fy0 = d.y; d.fx1 = dest[0] - k * 7 + rnd(-4, 4); d.fy1 = dest[1] + rnd(-6, 6); d.ft = 0; });
          quack(lead.x, lead.y); flap(lead.x, lead.y, 4);
        }
      }
      for (let k = 0; k < D.length; k++) {
        const d = D[k];
        if (d.mode === 'fly') {
          if (d.delay > 0) { d.delay -= dt; continue; }
          const L = Math.hypot(d.fx1 - d.fx0, d.fy1 - d.fy0), T0 = Math.max(1.2, L / 85);
          d.ft += dt / T0; const u = Math.min(1, d.ft);
          d.x = d.fx0 + (d.fx1 - d.fx0) * u; d.y = d.fy0 + (d.fy1 - d.fy0) * u; d.alt = Math.sin(Math.PI * u) * Math.min(34, 10 + L * 0.08);
          d.dir = d.fx1 > d.fx0 ? 'r' : 'l'; d.anim += dt * 9;
          if (u >= 1) { d.alt = 0; d.mode = this.water(d.x, d.y) ? 'swim' : 'walk'; d.wt = rnd(6, 12); if (d.mode === 'swim') this.ripple(d.x, d.y, 12, 1.3); }
          continue;
        }
        if (d.mode === 'walk') { // en la orilla: caminan un poco y vuelven al agua
          d.wt -= dt; d.anim += dt * 4;
          if (d.wt <= 0) { if (!d.goal) d.goal = this.nearest(this.open, d.x, d.y); if (this.stepDuck(d, d.goal[0], d.goal[1], 10, dt)) { d.goal = null; d.mode = 'swim'; } if (this.water(d.x, d.y) && d.mode === 'walk') { d.mode = 'swim'; d.goal = null; this.ripple(d.x, d.y, 10, 1.1); } }
          else if (Math.random() < dt * 0.5) d.dir = d.dir === 'l' ? 'r' : 'l';
          continue;
        }
        d.anim += dt * 2;
        if (k === 0) {
          if (Math.hypot(st.tx - d.x, st.ty - d.y) < 6 || !this.water(st.tx, st.ty)) { const p = this.nearSpot(this.open, d.x, d.y, 160) || pick(this.open); st.tx = p[0]; st.ty = p[1]; }
          this.stepDuck(d, st.tx, st.ty, 9, dt);
          const last = st.trail[st.trail.length - 1];
          if (!last || Math.hypot(last[0] - d.x, last[1] - d.y) > 2) { st.trail.push([d.x, d.y]); if (st.trail.length > 120) st.trail.shift(); }
          if (Math.random() < dt * 0.06) quack(d.x, d.y);
        } else if (D[0].mode === 'swim') {
          let need = k * 8, i = st.trail.length - 1, p = st.trail[i];
          if (!p) continue;
          while (i > 0 && need > 0) { need -= Math.hypot(st.trail[i][0] - st.trail[i - 1][0], st.trail[i][1] - st.trail[i - 1][1]); i--; p = st.trail[i]; }
          const far = Math.hypot(p[0] - d.x, p[1] - d.y);
          if (far > 1.5) this.stepDuck(d, p[0], p[1], far > 25 ? 16 : 10, dt);
        }
      }
    }
    // ---------- online: el anfitrión manda sus animales; cerca del anfitrión, los invitados ven esos (como el tránsito) ----------
    snap(px, py) {
      if (!this.ready) return undefined;
      const D4 = ['l', 'r', 'u', 'd'], M3 = ['swim', 'walk', 'fly'], r = Math.round;
      const p = []; this.flocks.forEach((f, i) => { if (Math.abs(f.hx - px) < 1300 && Math.abs(f.hy - py) < 1100) p.push([i, f.birds.map((b) => [r(b.x), r(b.y), b.ci, b.dir === 'r' ? 1 : 0, r(b.alt), (b.flying && b.delay <= 0 ? 1 : 0) | (b.peck > 0 ? 2 : 0) | (b.walk > 0 ? 4 : 0)])]); });
      return {
        h: this.herds.map((h) => h.list.map((c) => [r(c.x), r(c.y), D4.indexOf(c.dir), (c.swim ? 1 : 0) | (c.graze ? 2 : 0), c.s < 1 ? 1 : 0])),
        d: this.ducks.map((d) => [r(d.x), r(d.y), d.dir === 'r' ? 1 : 0, M3.indexOf(d.mode), r(d.alt), d.ci]),
        g: this.herons.map((h) => [r(h.x), r(h.y), h.dir === 'r' ? 1 : 0, h.mode === 'fly' ? 1 : 0, r(h.alt)]),
        p,
      };
    }
    netBegin() { if (this.netOn) return; if (!this.ready) this.init(); this.own = { herds: this.herds, ducks: this.ducks, herons: this.herons, flocks: this.flocks }; this.herds = []; this.ducks = []; this.herons = []; this.flocks = []; this.netF = new Map(); this.netS = null; this.netOn = true; }
    netEnd() { if (!this.netOn) return; Object.assign(this, this.own); this.own = null; this.netOn = false; }
    netSet(S) { if (this.netOn && S) this.netS = S; }
    netStep(dt) {
      const S = this.netS; if (!S) return;
      const k = Math.min(1, dt * 8), D4 = ['l', 'r', 'u', 'd'], M3 = ['swim', 'walk', 'fly'];
      const mv = (o, x, y) => { const d = Math.hypot(x - o.x, y - o.y); if (d > 60) { o.x = x; o.y = y; } else { o.x += (x - o.x) * k; o.y += (y - o.y) * k; } return d; };
      this.herds.length = S.h.length;
      S.h.forEach((L, i) => {
        const h = this.herds[i] || (this.herds[i] = { list: [] }); h.list.length = L.length;
        L.forEach(([x, y, di, fl, baby], j) => { const c = h.list[j] || (h.list[j] = { x, y, anim: Math.random() * 2 }); const d = mv(c, x, y); c.dir = D4[di] || 'd'; c.swim = !!(fl & 1); c.graze = !!(fl & 2); c.s = baby ? 0.9 : 1.3; c.anim += dt * (d > 0.4 ? 6 : 1); });
      });
      this.ducks.length = S.d.length;
      S.d.forEach(([x, y, dr, mi, alt, ci], i) => { const o = this.ducks[i] || (this.ducks[i] = { x, y, alt: 0, anim: Math.random() * 2 }); mv(o, x, y); o.dir = dr ? 'r' : 'l'; o.mode = M3[mi] || 'swim'; o.alt += (alt - o.alt) * k; o.ci = ci; o.anim += dt * (o.mode === 'fly' ? 9 : 2); });
      this.herons.length = S.g.length;
      S.g.forEach(([x, y, dr, fly, alt], i) => { const o = this.herons[i] || (this.herons[i] = { x, y, alt: 0, anim: 0 }); mv(o, x, y); o.dir = dr ? 'r' : 'l'; o.mode = fly ? 'fly' : 'stand'; o.alt += (alt - o.alt) * k; o.anim += dt * (fly ? 9 : 1.2); });
      const keep = new Map();
      for (const [fi, B] of S.p) {
        const f = this.netF.get(fi) || { hx: 0, hy: 0, birds: [] }; keep.set(fi, f); f.birds.length = B.length;
        B.forEach(([x, y, ci, dr, alt, fl], j) => { const b = f.birds[j] || (f.birds[j] = { x, y, alt: 0, anim: Math.random() * 2, delay: 0 }); mv(b, x, y); b.ci = ci; b.dir = dr ? 'r' : 'l'; b.alt += (alt - b.alt) * k; b.flying = !!(fl & 1); b.peck = fl & 2 ? 1 : 0; b.walk = fl & 4 ? 1 : 0; b.anim += dt * (b.flying ? 9 : 3); });
        if (B.length) { f.hx = B[0][0]; f.hy = B[0][1]; }
      }
      this.netF = keep; this.flocks = [...keep.values()];
    }
    // ---------- garzas: paradas en la orilla; si te acercás, vuelan a otro lado ----------
    updHerons(dt, threats) {
      for (const h of this.herons) {
        h.anim += dt * (h.mode === 'fly' ? 9 : 1.2); h.cool -= dt;
        if (h.mode === 'fly') {
          const dx = h.tx - h.x, dy = h.ty - h.y, L = Math.hypot(dx, dy), sp = 52;
          if (L < 3) { h.mode = 'stand'; h.alt = 0; h.wt = rnd(5, 10); h.cool = 3; continue; }
          h.x += dx / L * sp * dt; h.y += dy / L * sp * dt; if (Math.abs(dx) > 1) h.dir = dx > 0 ? 'r' : 'l';
          h.alt = Math.min(h.alt + dt * 40, 18, L * 0.6);
          continue;
        }
        let hit = null;
        if (h.cool <= 0) {
          for (const th of threats) { if (th.water) continue; const r = th.r || (th.sp > 60 ? 95 : th.sp > 15 ? 64 : 42); if (Math.hypot(th.x - h.x, th.y - h.y) < r) { hit = th; break; } }
          if (!hit) for (const s of this.scares) if (Math.hypot(s.x - h.x, s.y - h.y) < s.r) { hit = s; break; }
        }
        if (hit) {
          let dest = null; for (let k = 0; k < 30 && !dest; k++) { const p = pick(this.shore); const d1 = Math.hypot(p[0] - h.x, p[1] - h.y); if (d1 > 140 && d1 < 420 && Math.hypot(p[0] - hit.x, p[1] - hit.y) > 110) dest = p; }
          if (dest) { h.mode = 'fly'; h.tx = dest[0]; h.ty = dest[1]; h.alt = 1; flap(h.x, h.y, 4); } else h.cool = 2;
          continue;
        }
        h.wt -= dt; // de a ratos camina un paso o gira la cabeza
        if (h.wt <= 0) { h.wt = rnd(4, 10); const nx = h.x + rnd(-9, 9), ny = h.y + rnd(-5, 5); if (this.tile(nx, ny) >= 0 && this.capyOk(nx, ny) && !this.water(nx, ny)) { h.dir = nx > h.x ? 'r' : 'l'; h.x = nx; h.y = ny; } else h.dir = h.dir === 'l' ? 'r' : 'l'; }
      }
    }
    stepDuck(d, tx, ty, sp, dt) {
      const dx = tx - d.x, dy = ty - d.y, L = Math.hypot(dx, dy); if (L < 1.5) return true;
      const m = Math.min(L, sp * dt), nx = d.x + dx / L * m, ny = d.y + dy / L * m;
      if (d.mode === 'swim' && !this.water(nx, ny)) return true; // no se sube a la orilla nadando
      d.x = nx; d.y = ny; if (Math.abs(dx) > 0.3) d.dir = dx > 0 ? 'r' : 'l'; return false;
    }

    // ---------- pececitos ----------
    updFish(dt, threats) {
      for (const s of this.fish) {
        let flee = null;
        for (const th of threats) if (th.water && Math.hypot(th.x - s.x, th.y - s.y) < 40) flee = th;
        if (flee) { const a = Math.atan2(s.y - flee.y, s.x - flee.x), x = s.x + Math.cos(a) * 60, y = s.y + Math.sin(a) * 60; if (this.water(x, y)) { s.tx = x; s.ty = y; s.dart = 1.2; } }
        if (s.dart > 0) s.dart -= dt;
        const dx = s.tx - s.x, dy = s.ty - s.y, L = Math.hypot(dx, dy);
        if (L < 8 && Math.random() < dt * 0.7) { const p = this.nearSpot(this.open, s.x, s.y, 120) || pick(this.open); s.tx = p[0] + rnd(-6, 6); s.ty = p[1] + rnd(-6, 6); }
        const want = Math.atan2(dy, dx); let da = want - s.a; da = Math.atan2(Math.sin(da), Math.cos(da));
        s.a += Math.max(-2.5 * dt, Math.min(2.5 * dt, da));
        const sp = (L < 8 ? 2 : s.v) * (s.dart > 0 ? 4 : 1), nx = s.x + Math.cos(s.a) * sp * dt, ny = s.y + Math.sin(s.a) * sp * dt;
        if (this.water(nx, ny) && this.water(nx + Math.cos(s.a) * 10, ny + Math.sin(s.a) * 10)) { s.x = nx; s.y = ny; } else { s.a += Math.PI * 0.6; const p = pick(this.open); s.tx = p[0]; s.ty = p[1]; }
        // alguno sube a la superficie o salta
        if (Math.random() < dt * 0.05) { const f = pick(s.list); this.ripple(s.x + f.ox, s.y + f.oy, 6, 1); }
        if (Math.random() < dt * 0.012 && !this.jump) { const f = pick(s.list); this.jump = { x: s.x + f.ox, y: s.y + f.oy, a: s.a, t: 0, or: f.or }; this.ripple(this.jump.x, this.jump.y, 8, 1); }
      }
      if (this.jump) { this.jump.t += dt; if (this.jump.t > 0.55) { const j = this.jump; this.ripple(j.x + Math.cos(j.a) * 9, j.y + Math.sin(j.a) * 9, 10, 1.2); this.jump = null; } }
    }

    // ---------- palomas ----------
    updFlock(f, dt, threats, cam) {
      f.cool -= dt;
      let threat = null;
      if (!f.fly && f.cool <= 0) {
        for (const th of threats) { if (th.water) continue; const r = th.r || (th.sp > 60 ? 85 : th.sp > 20 ? 55 : 38); for (const b of f.birds) if (Math.hypot(th.x - b.x, th.y - b.y) < r) { threat = th; break; } if (threat) break; }
        for (const s of this.scares) for (const b of f.birds) if (Math.hypot(s.x - b.x, s.y - b.y) < s.r) { threat = s; break; }
      }
      if (threat) {
        // salen volando lejos de lo que las asustó y bajan en un lugar libre a 120-260 unidades
        const cx = f.birds.reduce((a, b) => a + b.x, 0) / f.birds.length, cy = f.birds.reduce((a, b) => a + b.y, 0) / f.birds.length;
        const a0 = Math.atan2(cy - threat.y, cx - threat.x); let dest = null;
        for (let k = 0; k < 24 && !dest; k++) { const a = a0 + rnd(-1, 1), r = rnd(120, 260), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, t = this.tile(x, y); if (t >= 0 && !VR.SOLID[t] && !this.world.hits(x - 6, y - 6, x + 6, y)) dest = [x, y]; }
        if (!dest) dest = [f.hx, f.hy];
        f.fly = 1; f.tx = dest[0]; f.ty = dest[1];
        for (const b of f.birds) { b.delay = rnd(0, 0.35); b.fx0 = b.x; b.fy0 = b.y; b.fx1 = dest[0] + rnd(-16, 16); b.fy1 = dest[1] + rnd(-11, 11); b.ft = 0; b.flying = true; }
        flap(cx, cy, 5);
      }
      let air = 0;
      for (const b of f.birds) {
        if (b.flying) {
          if (b.delay > 0) { b.delay -= dt; air++; continue; }
          const L = Math.hypot(b.fx1 - b.fx0, b.fy1 - b.fy0), T0 = Math.max(1.4, L / 95); b.ft += dt / T0;
          const u = Math.min(1, b.ft), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
          b.x = b.fx0 + (b.fx1 - b.fx0) * e; b.y = b.fy0 + (b.fy1 - b.fy0) * e; b.alt = Math.min(1, u * 4, (1 - u) * 3.5) * 28;
          b.dir = b.fx1 > b.fx0 ? 'r' : 'l'; b.anim += dt * 14;
          if (u >= 1) { b.flying = false; b.alt = 0; b.wt = rnd(0.5, 2); } else air++;
          continue;
        }
        // en el piso: caminan a pasitos y picotean
        b.wt -= dt; b.anim += dt * 6;
        if (b.peck > 0) b.peck -= dt;
        if (b.wt <= 0) {
          b.wt = rnd(0.6, 2.4);
          if (Math.random() < 0.45) b.peck = rnd(0.3, 0.9);
          else { const a = rnd(0, 6.28), d = rnd(3, 9), x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d; if (Math.hypot(x - f.tx, y - f.ty) < 26) { const t = this.tile(x, y); if (t >= 0 && !VR.SOLID[t]) { b.gx = x; b.gy = y; b.walk = 0.8; b.dir = x > b.x ? 'r' : 'l'; } } }
        }
        if (b.walk > 0) { b.walk -= dt; const m = Math.min(1, dt * 8); b.x += (b.gx - b.x) * m * 0.5; b.y += (b.gy - b.y) * m * 0.5; }
      }
      if (f.fly && !air) { f.fly = 0; f.cool = 1.2; }
      // si quedaron lejos de casa y nadie las ve, vuelven solas
      if (!f.fly && Math.hypot(f.tx - f.hx, f.ty - f.hy) > 30 && Math.hypot(cam.x - f.hx, cam.y - f.hy) > 700 && Math.hypot(cam.x - f.tx, cam.y - f.ty) > 700) {
        f.tx = f.hx; f.ty = f.hy; for (const b of f.birds) { b.x = f.hx + rnd(-14, 14); b.y = f.hy + rnd(-10, 10); }
      }
    }

    // ---------- dibujo ----------
    // a ras del agua y del piso: peces, ondas, sombras de lo que vuela, carpinchos y patos nadando
    drawGround(ctx, cx, cy, sw, sh) {
      if (!this.ready) return;
      const inV = (x, y, m = 40) => x - cx > -m && x - cx < sw + m && y - cy > -m && y - cy < sh + m;
      const L = this.lake, lakeV = L && L.x1 > cx - 40 && L.x0 < cx + sw + 40 && L.y1 > cy - 40 && L.y0 < cy + sh + 40, t = this.t;
      if (lakeV) {
        for (const s of this.fish) {
          if (!inV(s.x, s.y, 30)) continue;
          const ca = Math.cos(s.a), sa = Math.sin(s.a);
          for (const f of s.list) {
            const w = Math.sin(t * 3 + f.ph) * 1.6, x = s.x + f.ox * ca - f.oy * sa + w * -sa, y = s.y + f.ox * sa + f.oy * ca + w * ca;
            const a = s.a + Math.sin(t * 6 + f.ph) * 0.25, L2 = 2.6 * f.sz;
            ctx.fillStyle = f.or ? 'rgba(214,124,46,0.55)' : 'rgba(22,32,16,0.32)';
            ctx.beginPath(); ctx.ellipse(x - cx, y - cy, L2, L2 * 0.42, a, 0, 6.283); ctx.fill();
            ctx.beginPath(); ctx.moveTo(x - cx - Math.cos(a) * L2 * 0.9, y - cy - Math.sin(a) * L2 * 0.9);
            ctx.lineTo(x - cx - Math.cos(a) * L2 * 1.7 - Math.sin(a) * 1.1, y - cy - Math.sin(a) * L2 * 1.7 + Math.cos(a) * 1.1);
            ctx.lineTo(x - cx - Math.cos(a) * L2 * 1.7 + Math.sin(a) * 1.1, y - cy - Math.sin(a) * L2 * 1.7 - Math.cos(a) * 1.1); ctx.fill();
          }
        }
      }
      ctx.lineWidth = 0.75;
      for (const r of this.rip) {
        if (!inV(r.x, r.y)) continue;
        const u = r.t / r.life; ctx.strokeStyle = 'rgba(220,232,200,' + (0.55 * (1 - u)).toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(r.x - cx, r.y - cy, 2 + r.r * u, (2 + r.r * u) * 0.55, 0, 0, 6.283); ctx.stroke();
      }
      if (this.jump && inV(this.jump.x, this.jump.y)) { // pez saltando
        const j = this.jump, u = j.t / 0.55, x = j.x + Math.cos(j.a) * 9 * u - cx, y = j.y + Math.sin(j.a) * 9 * u - cy - Math.sin(Math.PI * u) * 7;
        ctx.fillStyle = j.or ? '#d77c2e' : '#9aa38c'; ctx.beginPath(); ctx.ellipse(x, y, 2.6, 1.1, j.a + (u - 0.5) * 1.6, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(230,240,220,0.8)'; ctx.fillRect(x - 2, y + 2, 1, 1); ctx.fillRect(x + 2, y + 1, 1, 1);
      }
      // sombras de lo que vuela
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      const sh_ = (x, y, w) => { if (inV(x, y)) { ctx.beginPath(); ctx.ellipse(x - cx, y - cy, w, w * 0.45, 0, 0, 6.283); ctx.fill(); } };
      for (const d of this.ducks) if (d.alt > 0.5) sh_(d.x, d.y, 4.5);
      for (const f of this.flocks) for (const b of f.birds) if (b.alt > 0.5) sh_(b.x, b.y, 3);
      // nadando: estela en V y el cuerpo a ras del agua
      if (lakeV) {
        const wake = (x, y, dir, w) => { const k = dir === 'r' ? -1 : dir === 'l' ? 1 : 0; ctx.strokeStyle = 'rgba(220,232,200,0.35)'; ctx.beginPath(); ctx.moveTo(x - cx + k * 2, y - cy); ctx.lineTo(x - cx + k * (w + 6), y - cy - 3); ctx.moveTo(x - cx + k * 2, y - cy + 1); ctx.lineTo(x - cx + k * (w + 6), y - cy + 4); ctx.stroke(); };
        for (const d of this.ducks) if (d.mode === 'swim' && inV(d.x, d.y)) {
          wake(d.x, d.y, d.dir, 4);
          const img = duckImg(d.ci, d.dir, false, 0), bob = Math.sin(d.anim) > 0 ? 0 : 0.5;
          ctx.drawImage(img, 0, 0, img.width, 12, Math.round(d.x - cx - 5), Math.round(d.y - cy - 6 + bob), 10, 6);
        }
        for (const h of this.herds) for (const c of h.list) if (c.swim && inV(c.x, c.y)) {
          const img = capyImg(c.s, c.dir, 0, false), w = img.width / P, cut = Math.round(img.height * (c.dir === 'u' || c.dir === 'd' ? 0.45 : 0.42)), bob = Math.sin(c.anim * 2) * 0.4;
          wake(c.x, c.y, c.dir, w / 2);
          ctx.drawImage(img, 0, 0, img.width, cut, Math.round(c.x - cx - w / 2), Math.round(c.y - cy - cut / P + 1 + bob), w, cut / P);
          ctx.strokeStyle = 'rgba(220,232,200,0.45)'; ctx.beginPath(); ctx.ellipse(c.x - cx, c.y - cy + 1, w * 0.45, 1.6, 0, 0, 6.283); ctx.stroke();
        }
      }
    }
    // lo que tiene altura (en tierra o volando): se ordena con la gente; lo que vuela, arriba de todo
    collect(cx, cy, sw, sh, tall) {
      if (!this.ready) return;
      this.vacas.collect(cx, cy, sw, sh, tall); this.granja.collect(cx, cy, sw, sh, tall);
      const inV = (x, y) => x - cx > -40 && x - cx < sw + 40 && y - cy > -60 && y - cy < sh + 60;
      for (const h of this.herds) for (const c of h.list) {
        if (c.swim || !inV(c.x, c.y)) continue;
        const f = c.graze ? (Math.sin(c.anim) > 0.6 ? 1 : 0) : (Math.floor(c.anim) & 1);
        const img = capyImg(c.s, c.dir, c.graze ? 0 : f, c.graze && (c.dir === 'l' || c.dir === 'r') && f === 1), w = img.width / P, hh = img.height / P;
        tall.push({ sy: c.y, draw: (g) => { g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(c.x - cx, c.y - cy - 1, w * 0.42, 2.2, 0, 0, 6.283); g.fill(); g.drawImage(img, Math.round(c.x - cx - w / 2), Math.round(c.y - cy - hh + 1), w, hh); } });
      }
      for (const h of this.herons) {
        if (!inV(h.x, h.y)) continue;
        if (h.mode === 'fly') { const img = heronFlyImg(h.dir, Math.floor(h.anim) & 1); tall.push({ sy: 1e7 + h.y, draw: (g) => { g.fillStyle = 'rgba(0,0,0,0.16)'; g.beginPath(); g.ellipse(h.x - cx, h.y - cy, 7, 2, 0, 0, 6.283); g.fill(); g.drawImage(img, Math.round(h.x - cx - 8.5), Math.round(h.y - cy - h.alt - 12), 17, 11); } }); }
        else { const img = heronImg(h.dir, Math.floor(h.anim) & 1); tall.push({ sy: h.y, draw: (g) => { g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(h.x - cx, h.y - cy - 1, 5, 1.6, 0, 0, 6.283); g.fill(); g.drawImage(img, Math.round(h.x - cx - 6.5), Math.round(h.y - cy - 14), 13, 15); } }); }
      }
      for (const d of this.ducks) {
        if (!inV(d.x, d.y) || d.mode === 'swim') continue;
        if (d.mode === 'fly' && d.alt > 0.5) { const img = duckFlyImg(d.ci, Math.floor(d.anim) & 1); tall.push({ sy: 1e7 + d.y, draw: (g) => g.drawImage(img, Math.round(d.x - cx - 6), Math.round(d.y - cy - d.alt - 8), 12, 8) }); }
        else { const img = duckImg(d.ci, d.dir, true, Math.floor(d.anim) & 1); tall.push({ sy: d.y, draw: (g) => g.drawImage(img, Math.round(d.x - cx - 5), Math.round(d.y - cy - 8), 10, 8) }); }
      }
      for (const f of this.flocks) for (const b of f.birds) {
        if (!inV(b.x, b.y - b.alt)) continue;
        if (b.alt > 0.5 || (b.flying && b.delay <= 0)) { const img = pigFlyImg(b.ci, Math.floor(b.anim) & 1); tall.push({ sy: 1e7 + b.y, draw: (g) => g.drawImage(img, Math.round(b.x - cx - 4.5), Math.round(b.y - cy - b.alt - 6), 9, 6) }); }
        else { const img = pigImg(b.ci, b.dir, b.peck > 0 && Math.sin(b.anim * 2) > 0, b.walk > 0 ? Math.floor(b.anim) & 1 : 0); tall.push({ sy: b.y, draw: (g) => g.drawImage(img, Math.round(b.x - cx - 3.5), Math.round(b.y - cy - 6), 7, 6) }); }
      }
    }
  };

  // ---------- vacas ----------
  // seis pelajes: 0 holando, 1 holando con más negro, 2 marrón y blanca, 3 criolla marrón, 4 negra, 5 crema
  const COWS = [
    { b: '#f1eee6', s: '#cfc9bb', p: '#26262b', pt: [[12, 9, 6, 4], [24, 14, 7, 4.5], [30, 8, 3.5, 3], [8, 15, 3, 3]] },
    { b: '#ece8de', s: '#c6c0b0', p: '#2a2a2f', pt: [[10, 10, 8, 5], [22, 8, 6, 4], [28, 15, 6, 4], [16, 16, 4, 3], [33, 10, 3.5, 3.5]] },
    { b: '#efe9dc', s: '#c9c0aa', p: '#8e5a34', pt: [[13, 10, 7, 4.5], [25, 15, 6, 4], [31, 9, 4, 3.5]] },
    { b: '#9a6a40', s: '#6f4a2a', p: '#b27d4e', pt: [[16, 9, 9, 3], [27, 14, 5, 3]] },
    { b: '#34343a', s: '#1f1f24', p: '#44444b', pt: [[16, 9, 9, 3], [25, 13, 5, 3]] },
    { b: '#e6d5b4', s: '#bba98a', p: '#d2bd96', pt: [[15, 9, 8, 3.5], [26, 14, 5, 3]] },
  ];
  const COW_O = '#2b1c14', COW_PINK = '#e6a39a', COW_HORN = '#e9e1c8';
  function cowSide(v, s, f, graze) {
    const C = COWS[v], W = Math.ceil(46 * s), H = Math.ceil(30 * s), q = (x) => x * s;
    return sprite(W, H, (px, ell) => {
      const leg = (x, up, back) => { px(q(x), q(up ? 18 : 19), Math.max(2, q(3.4)), Math.max(3, q(up ? 6 : 7)), back ? C.s : C.b); px(q(x), q(up ? 23 : 25), Math.max(2, q(3.4)), Math.max(1, q(1.6)), '#3b2a1c'); };
      leg(10, f === 1, true); leg(14, f === 0, true); leg(28, f === 0, false); leg(32, f === 1, false);
      px(q(2), q(9), Math.max(1, q(1.6)), q(11), C.p === '#26262b' || C.p === '#2a2a2f' ? C.p : C.s); px(q(1), q(19), Math.max(2, q(3)), Math.max(2, q(3)), C.p === '#44444b' ? C.s : '#2a2a2f'); // cola con mechón
      ell(q(21), q(14), q(15), q(7.6), C.b);
      ell(q(21), q(18), q(13.5), q(3.4), C.s);
      for (const [cx, cy, rx, ry] of C.pt) ell(q(cx + 6), q(cy + 2), q(rx), q(ry), C.p);
      px(q(18), q(19), q(5), Math.max(2, q(3)), COW_PINK); // ubre
      const hy = graze ? 8 : 0;
      ell(q(33), q(10 + hy * 0.6), q(5.6), q(5.6), C.b); // pescuezo
      ell(q(39), q(11 + hy), q(5), q(4.2), C.b); // cabeza
      px(q(41.5), q(12 + hy), q(4), q(4), COW_PINK); // hocico
      px(q(44), q(13 + hy), Math.max(1, q(1)), Math.max(1, q(1.5)), '#8a4b46');
      if (C.p !== C.b) ell(q(37), q(9.5 + hy), q(3), q(2.6), C.p === '#8e5a34' || C.p === '#b27d4e' || C.p === '#d2bd96' ? C.p : C.p);
      px(q(38), q(9 + hy), 1, 1, '#14100c'); // ojo
      px(q(35.2), q(6.5 + hy), Math.max(2, q(3)), Math.max(1, q(1.5)), C.s); // oreja
      px(q(37), q(5.5 + hy), Math.max(1, q(1.4)), Math.max(1, q(2)), COW_HORN); // cuerno
    }, COW_O);
  }
  function cowFront(v, s, f, back) {
    const C = COWS[v], W = Math.ceil(28 * s), H = Math.ceil(32 * s), q = (x) => x * s;
    return sprite(W, H, (px, ell) => {
      px(q(6), q(back ? 22 : 23) - (f ? 1 : 0), Math.max(3, q(4)), Math.max(3, q(7)), C.s); px(q(18), q(back ? 22 : 23) - (f ? 0 : 1), Math.max(3, q(4)), Math.max(3, q(7)), C.s);
      ell(q(14), q(14), q(10), q(10.5), C.b);
      for (const [cx, cy, rx, ry] of C.pt) ell(q(cx * 0.55 + 4), q(cy + 4), q(rx * 0.8), q(ry * 0.8), C.p);
      if (back) { px(q(13), q(8), Math.max(1, q(1.6)), q(13), C.s); px(q(12), q(21), Math.max(2, q(3)), Math.max(2, q(3)), '#2a2a2f'); ell(q(14), q(5), q(4), q(3), C.b); px(q(8), q(3), Math.max(2, q(3)), Math.max(1, q(1.5)), C.s); px(q(19), q(3), Math.max(2, q(3)), Math.max(1, q(1.5)), C.s); }
      else {
        ell(q(14), q(21), q(5.2), q(5.6), C.b); px(q(10.5), q(22), q(7), q(5), COW_PINK); px(q(11.5), q(24), 1, 1, '#8a4b46'); px(q(15.5), q(24), 1, 1, '#8a4b46');
        px(q(10), q(17.5), 1, 1, '#14100c'); px(q(17), q(17.5), 1, 1, '#14100c');
        px(q(5), q(15.5), Math.max(3, q(4)), Math.max(1, q(1.6)), C.s); px(q(19), q(15.5), Math.max(3, q(4)), Math.max(1, q(1.6)), C.s);
        px(q(7), q(13.5), Math.max(1, q(1.4)), Math.max(1, q(2)), COW_HORN); px(q(20), q(13.5), Math.max(1, q(1.4)), Math.max(1, q(2)), COW_HORN);
      }
    }, COW_O);
  }
  function cowImg(v, s, dir, f, graze) {
    return get('v' + v + s + dir + f + (graze ? 'g' : ''), () => dir === 'r' ? cowSide(v, s, f, graze) : dir === 'l' ? flip(cowImg(v, s, 'r', f, graze)) : cowFront(v, s, f, dir === 'u'));
  }

  VR.Vacas = class {
    constructor(world) { this.world = world; this.ready = false; this.herds = []; this.t = 0; this.mu = 5; }
    tile(x, y) { return this.world.get(Math.floor(x / S), Math.floor(y / S)); }
    ok(x, y) { const t = this.tile(x, y); return (t === T.GRASS || t === T.DIRT) && !this.world.hits(x - 5, y - 3, x + 5, y + 2); }
    init() {
      this.ready = true;
      const W = this.world, w = W.w, h = W.h, tiles = W.tiles, names = W.barrios || [], OK = new Uint8Array(16); OK[T.GRASS] = 1; OK[T.DIRT] = 1;
      if (!W.barrio) return;
      const want = new Map(); names.forEach((n, i) => { if (/santa luc[ií]a/i.test(n)) want.set(i + 1, 9); else if (/san miguel/i.test(n)) want.set(i + 1, 7); });
      const cand = new Map(); for (const b of want.keys()) cand.set(b, []);
      for (let y = 8; y < h - 8; y += 3) for (let x = 8; x < w - 8; x += 3) {
        const b = W.barrio[y * w + x]; if (!want.has(b)) continue;
        let good = true; for (let dy = -4; dy <= 4 && good; dy += 2) for (let dx = -4; dx <= 4; dx += 2) if (!OK[tiles[(y + dy) * w + x + dx]]) { good = false; break; }
        if (good) cand.get(b).push([x * S + 8, y * S + 8]);
      }
      for (const [b, L] of cand) {
        let n = want.get(b), tries = 0; const mine = [];
        while (n > 0 && L.length && tries++ < 400) {
          const [hx, hy] = pick(L);
          if (mine.some((m) => Math.hypot(m[0] - hx, m[1] - hy) < 340)) continue;
          mine.push([hx, hy]); n--;
          const k = 3 + ((Math.random() * 4) | 0), vv = pick([0, 0, 1, 2, 3, 3, 4, 5]), list = [];
          for (let i = 0; i < k; i++) {
            let x = hx, y = hy; for (let j = 0; j < 14; j++) { const a = rnd(0, 6.28), r = rnd(6, 44), qx = hx + Math.cos(a) * r, qy = hy + Math.sin(a) * r; if (this.ok(qx, qy) && list.every((c) => Math.hypot(c.x - qx, c.y - qy) > 15)) { x = qx; y = qy; break; } }
            list.push({ x, y, v: Math.random() < 0.7 ? vv : pick([0, 1, 2, 3, 4, 5]), s: i === k - 1 && k > 3 ? 0.68 : rnd(1.08, 1.2), dir: pick(['l', 'r', 'd']), anim: Math.random() * 3, mode: 'graze', wt: rnd(2, 9), tx: x, ty: y, flee: 0 });
          }
          this.herds.push({ hx, hy, list });
        }
      }
    }
    update(dt, cam, th, scares) {
      if (!this.ready) this.init();
      this.t += dt; this.mu -= dt;
      for (const hd of this.herds) {
        if (Math.abs(hd.hx - cam.x) > 800 || Math.abs(hd.hy - cam.y) > 640) continue;
        for (const c of hd.list) {
          c.anim += dt * (c.mode === 'graze' ? 1.4 : c.flee > 0 ? 7 : 3.4);
          let fx = 0, fy = 0, run = 0;
          for (const t of th) { if (t.r) continue; const dx = c.x - t.x, dy = c.y - t.y, d = Math.hypot(dx, dy) || 1, lim = t.sp > 70 ? 110 : t.sp > 0 ? 48 : 20; if (d < lim) { fx += dx / d; fy += dy / d; run = Math.max(run, t.sp > 70 ? 2 : 1); } }
          for (const s of scares) { const dx = c.x - s.x, dy = c.y - s.y, d = Math.hypot(dx, dy) || 1; if (d < s.r) { fx += dx / d; fy += dy / d; run = 2; } }
          if (fx || fy) { const m = Math.hypot(fx, fy) || 1; c.flee = 1.2; c.fx = fx / m; c.fy = fy / m; c.run = run; c.mode = 'walk'; }
          if (c.flee > 0) {
            c.flee -= dt; const sp = c.run === 2 ? 34 : 17, nx = c.x + c.fx * sp * dt, ny = c.y + c.fy * sp * dt;
            if (this.ok(nx, ny)) { c.x = nx; c.y = ny; c.dir = Math.abs(c.fx) > Math.abs(c.fy) ? (c.fx > 0 ? 'r' : 'l') : (c.fy > 0 ? 'd' : 'u'); } else c.flee = 0;
            if (c.flee <= 0) { c.mode = 'graze'; c.wt = rnd(3, 7); c.tx = c.x; c.ty = c.y; }
            continue;
          }
          c.wt -= dt;
          if (c.mode === 'graze') { if (c.wt <= 0) { for (let j = 0; j < 8; j++) { const a = rnd(0, 6.28), r = rnd(10, 30), qx = c.x + Math.cos(a) * r, qy = c.y + Math.sin(a) * r; if (Math.hypot(qx - hd.hx, qy - hd.hy) < 80 && this.ok(qx, qy)) { c.tx = qx; c.ty = qy; c.mode = 'walk'; break; } } c.wt = rnd(2, 6); } }
          else {
            const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
            if (d < 2 || c.wt < -8) { c.mode = 'graze'; c.wt = rnd(5, 13); }
            else { const nx = c.x + dx / d * 7 * dt, ny = c.y + dy / d * 7 * dt; if (this.ok(nx, ny)) { c.x = nx; c.y = ny; c.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); } else { c.mode = 'graze'; c.wt = rnd(3, 6); } }
          }
        }
        if (this.mu <= 0 && VR.audio && VR.audio.muu) { const c = hd.list[(Math.random() * hd.list.length) | 0]; VR.audio.muu(c.x, c.y); this.mu = rnd(7, 16); }
      }
    }
    collect(cx, cy, sw, sh, tall) {
      if (!this.ready) return;
      for (const hd of this.herds) for (const c of hd.list) {
        if (c.x - cx < -40 || c.x - cx > sw + 40 || c.y - cy < -50 || c.y - cy > sh + 50) continue;
        const moving = c.mode === 'walk' || c.flee > 0, f = moving ? (Math.floor(c.anim) & 1) : 0, gz = c.mode === 'graze' && (c.dir === 'l' || c.dir === 'r');
        const img = cowImg(c.v, c.s, c.dir, f, gz), w = img.width / P, hh = img.height / P;
        tall.push({ sy: c.y, draw: (g) => { g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(c.x - cx, c.y - cy - 1, w * 0.42, 3, 0, 0, 6.283); g.fill(); g.drawImage(img, Math.round(c.x - cx - w / 2), Math.round(c.y - cy - hh + 2), w, hh); } });
      }
    }
  };
})();
