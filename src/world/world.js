// Mundo: grilla de tiles, edificios de cualquier forma, árboles y decorados.
// Se dibuja por bloques (chunks) de 32×32 tiles que se pre-renderizan y se guardan en caché.
'use strict';
VR.World = class {
  constructor(w, h) {
    this.w = w; this.h = h;
    const N = w * h;
    this.tiles = new Uint8Array(N);
    this.line = new Uint8Array(N);   // 1 = línea amarilla E-O, 2 = N-S, 3 = cebra de barras verticales, 4 = cebra horizontal
    this.street = new Uint8Array(N); // índice+1 en this.streets (calle más cercana)
    this.area = new Uint8Array(N);   // índice+1 en this.areas (plazas y parques)
    this.barrio = new Uint8Array(N); // índice+1 en this.barrios (barrios del INE)
    this.bid = new Uint16Array(N);   // edificio de cada celda (índice+1 en this.buildings)
    this.buildings = []; this.trees = []; this.decals = []; this.labels = [];
    this.streets = []; this.areas = []; this.barrios = [];
    this.spawn = { x: w * 8, y: h * 8 }; this.spawnName = 'el inicio';
    this.CH = 32; // tiles por chunk (512 px)
    this.cache = new Map(); this.MAXCACHE = 40;
    this.index = null;
    this.boxGrid = new Map(); // cosas que se mueven o no son baldosas (autos): grilla de 64 px
    this.id = 'w' + w + 'x' + h;
  }
  get(tx, ty) { return tx < 0 || ty < 0 || tx >= this.w || ty >= this.h ? -1 : this.tiles[ty * this.w + tx]; }
  set(tx, ty, t) { if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.tiles[ty * this.w + tx] = t; }
  b(tx, ty) { return tx < 0 || ty < 0 || tx >= this.w || ty >= this.h ? 0 : this.bid[ty * this.w + tx]; }
  solid(tx, ty) { const t = this.get(tx, ty); return t < 0 || VR.SOLID[t] === 1; }
  // ¿La caja [x0,x1)×[y0,y1) en píxeles toca algo sólido?
  hits(x0, y0, x1, y1) {
    const S = VR.TILE;
    for (let ty = Math.floor(y0 / S); ty <= Math.floor((y1 - 0.001) / S); ty++)
      for (let tx = Math.floor(x0 / S); tx <= Math.floor((x1 - 0.001) / S); tx++)
        if (this.solid(tx, ty)) return true;
    return this.boxOverlap(x0, y0, x1, y1);
  }
  // ---------- autos (cajas en una grilla de 64 px) ----------
  _cells(b, fn) { for (let cy = Math.floor(b.y0 / 64); cy <= Math.floor(b.y1 / 64); cy++) for (let cx = Math.floor(b.x0 / 64); cx <= Math.floor(b.x1 / 64); cx++) fn(cx + cy * 65536); }
  addBox(obj) { const b = obj.box(); obj._box = b; this._cells(b, (k) => { let l = this.boxGrid.get(k); if (!l) this.boxGrid.set(k, l = []); l.push(b); }); }
  removeBox(obj) { const b = obj._box; if (!b) return; this._cells(b, (k) => { const l = this.boxGrid.get(k); if (l) { const i = l.indexOf(b); if (i >= 0) l.splice(i, 1); } }); obj._box = null; }
  moveBox(obj) { if (obj._box) this.removeBox(obj); this.addBox(obj); }
  boxAt(px, py, except) {
    const l = this.boxGrid.get(Math.floor(px / 64) + Math.floor(py / 64) * 65536);
    if (l) for (const b of l) if (b.car !== except && px >= b.x0 && px < b.x1 && py >= b.y0 && py < b.y1) return b.car;
    return null;
  }
  boxOverlap(x0, y0, x1, y1, except) {
    let hit = false;
    this._cells({ x0, y0, x1, y1 }, (k) => { const l = this.boxGrid.get(k); if (l && !hit) for (const b of l) if (b.car !== except && x0 < b.x1 && x1 > b.x0 && y0 < b.y1 && y1 > b.y0) { hit = true; break; } });
    return hit;
  }
  carsIn(x0, y0, x1, y1, out) {
    const seen = new Set();
    this._cells({ x0, y0, x1, y1 }, (k) => { const l = this.boxGrid.get(k); if (l) for (const b of l) if (!seen.has(b.car)) { seen.add(b.car); out.push(b.car); } });
    return out;
  }
  // Nombre del lugar donde está una posición (plaza/parque, o la calle más cercana).
  placeName(px, py) {
    const tx = Math.floor(px / VR.TILE), ty = Math.floor(py / VR.TILE);
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return null;
    const i = ty * this.w + tx;
    if (this.area[i]) return this.areas[this.area[i] - 1];
    if (this.street[i]) return this.streets[this.street[i] - 1];
    for (let r = 1; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x >= 0 && y >= 0 && x < this.w && y < this.h && this.street[y * this.w + x]) return this.streets[this.street[y * this.w + x] - 1];
    }
    return null;
  }
  barrioName(px, py) {
    const tx = Math.floor(px / VR.TILE), ty = Math.floor(py / VR.TILE);
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return null;
    const b = this.barrio[ty * this.w + tx];
    return b ? this.barrios[b - 1] : null;
  }
  // edificio rectangular (barrio de prueba)
  addBuilding(b) {
    this.buildings.push({ x0: b.x, x1: b.x + b.w - 1, door: b.x + (b.w >> 1), floors: b.floors, rt: b.roofType, roof: b.roof, wall: b.wall, shop: b.shop, awning: b.awning });
    const id = this.buildings.length;
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { this.set(x, y, VR.T.BUILDING); this.bid[y * this.w + x] = id; }
  }
  addTree(tx, ty, r, pal) { this.trees.push({ x: tx, y: ty, r, pal }); this.set(tx, ty, VR.T.TREE); }

  // Índice espacial: qué árboles y decorados tocan cada chunk (con margen para sombras y copas).
  buildIndex() {
    const CH = this.CH * VR.TILE, cw = Math.ceil(this.w / this.CH), chh = Math.ceil(this.h / this.CH);
    this.index = Array.from({ length: cw * chh }, () => ({ t: [], d: [] }));
    const add = (list, item, px0, py0, px1, py1) => {
      for (let cy = Math.max(0, Math.floor(py0 / CH)); cy <= Math.min(chh - 1, Math.floor(py1 / CH)); cy++)
        for (let cx = Math.max(0, Math.floor(px0 / CH)); cx <= Math.min(cw - 1, Math.floor(px1 / CH)); cx++)
          this.index[cy * cw + cx][list].push(item);
    };
    const S = VR.TILE;
    for (const t of this.trees) { const cx = t.x * S + 8, cy = t.y * S - 4; add('t', t, cx - t.r - 8, cy - t.r - 8, cx + t.r + 8, cy + t.r + 12); }
    for (const d of this.decals) add('d', d, d.x * S, d.y * S, (d.x + d.w) * S, (d.y + d.h) * S);
    this.cw = cw; this.chh = chh;
  }

  chunk(cx, cy) {
    const key = cx + ',' + cy;
    let c = this.cache.get(key);
    if (c) { this.cache.delete(key); this.cache.set(key, c); return c; } // LRU
    c = this.renderChunk(cx, cy);
    this.cache.set(key, c);
    if (this.cache.size > this.MAXCACHE) this.cache.delete(this.cache.keys().next().value);
    return c;
  }
  // Pre-dibuja de a un chunk vecino por cuadro, para que no haya tirones al cruzar de bloque.
  warm(camX, camY, sw, sh) {
    const PX = this.CH * VR.TILE;
    const c0 = Math.floor((camX - PX / 2) / PX), c1 = Math.floor((camX + sw + PX / 2) / PX);
    const r0 = Math.floor((camY - PX / 2) / PX), r1 = Math.floor((camY + sh + PX / 2) / PX);
    for (let cy = Math.max(0, r0); cy <= Math.min(this.chh - 1, r1); cy++) for (let cx = Math.max(0, c0); cx <= Math.min(this.cw - 1, c1); cx++)
      if (!this.cache.has(cx + ',' + cy)) { this.chunk(cx, cy); return; }
  }

  renderChunk(cx, cy) {
    const S = VR.TILE, N = this.CH, PX = N * S, ox = cx * PX, oy = cy * PX;
    const ground = VR.canvas(PX, PX), g = ground.getContext('2d');
    const idx = this.index[cy * this.cw + cx];
    const tx0 = cx * N, ty0 = cy * N, tx1 = Math.min(this.w, tx0 + N), ty1 = Math.min(this.h, ty0 + N);
    const T = VR.T;
    g.save(); g.translate(-ox, -oy);
    // 1) piso
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) {
      let t = this.tiles[ty * this.w + tx];
      if (VR.GROUND_OF[t] !== undefined) t = VR.GROUND_OF[t];
      VR.tileset.draw(g, t, (VR.hash(tx, ty, 99) * 4) | 0, tx * S, ty * S);
    }
    // 2) decorados de piso (canchas, monumentos)
    for (const d of idx.d) VR.decor[d.kind] && VR.decor[d.kind](g, d);
    // 3) cordones, orillas, líneas y cebras (autotiling según vecinos)
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) {
      const t = this.tiles[ty * this.w + tx], x = tx * S, y = ty * S;
      if (t === T.SIDEWALK || t === T.BUILDING) {
        const RL = VR.ROADLIKE, curb = (dx, dy) => { const n = this.get(tx + dx, ty + dy); return n >= 0 && RL[n] === 1 && n !== T.DIRTROAD; };
        if (curb(0, -1)) { g.fillStyle = '#e4ded0'; g.fillRect(x, y, S, 1); g.fillStyle = '#7d776c'; g.fillRect(x, y + 1, S, 1); }
        if (curb(0, 1)) { g.fillStyle = '#e4ded0'; g.fillRect(x, y + S - 2, S, 1); g.fillStyle = '#3c3c44'; g.fillRect(x, y + S - 1, S, 1); }
        if (curb(-1, 0)) { g.fillStyle = '#e4ded0'; g.fillRect(x, y, 1, S); g.fillStyle = '#9d978a'; g.fillRect(x + 1, y, 1, S); }
        if (curb(1, 0)) { g.fillStyle = '#e4ded0'; g.fillRect(x + S - 1, y, 1, S); g.fillStyle = '#9d978a'; g.fillRect(x + S - 2, y, 1, S); }
      } else if (t === T.DIRTROAD) { // borde de la calle de tierra: pasto ralo más oscuro
        const edge = (dx, dy) => { const n = this.get(tx + dx, ty + dy); return n >= 0 && VR.ROADLIKE[n] !== 1 && n !== T.SIDEWALK; };
        g.fillStyle = 'rgba(70,40,20,.35)';
        if (edge(0, -1)) g.fillRect(x, y, S, 2);
        if (edge(0, 1)) g.fillRect(x, y + S - 2, S, 2);
        if (edge(-1, 0)) g.fillRect(x, y, 2, S);
        if (edge(1, 0)) g.fillRect(x + S - 2, y, 2, S);
      } else if (t === T.WATER) {
        const W = T.WATER, bank = (dx, dy) => { const n = this.get(tx + dx, ty + dy); return n !== W && n !== -1; };
        if (bank(0, -1)) { g.fillStyle = '#6b5a3a'; g.fillRect(x, y, S, 2); g.fillStyle = '#9cc6e6'; g.fillRect(x, y + 2, S, 1); }
        if (bank(0, 1)) { g.fillStyle = '#3f6fa8'; g.fillRect(x, y + S - 3, S, 1); g.fillStyle = '#6b5a3a'; g.fillRect(x, y + S - 2, S, 2); }
        if (bank(-1, 0)) { g.fillStyle = '#6b5a3a'; g.fillRect(x, y, 2, S); }
        if (bank(1, 0)) { g.fillStyle = '#6b5a3a'; g.fillRect(x + S - 2, y, 2, S); }
      }
      const l = this.line[ty * this.w + tx];
      if (!l) continue;
      if (l === 1) { g.fillStyle = '#e2bf45'; g.fillRect(x + 2, y + 7, 9, 2); }
      else if (l === 2) { g.fillStyle = '#e2bf45'; g.fillRect(x + 7, y + 2, 2, 9); }
      else if (l === 3) { g.fillStyle = '#e8e6e0'; for (let i = 1; i < S; i += 5) g.fillRect(x + i, y + 1, 3, S - 2); }
      else if (l === 4) { g.fillStyle = '#e8e6e0'; for (let i = 1; i < S; i += 5) g.fillRect(x + 1, y + i, S - 2, 3); }
    }
    // 4) sombras (sol del noroeste): árboles, y edificios hacia el este y el sur
    g.fillStyle = 'rgba(10,20,10,.28)';
    for (const t of idx.t) { g.beginPath(); g.ellipse(t.x * S + 11, t.y * S + 4, t.r, t.r * 0.7, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.26)';
    for (let ty = ty0 - 1; ty < ty1; ty++) for (let tx = tx0 - 1; tx < tx1; tx++) {
      if (!this.b(tx, ty)) continue;
      if (!this.b(tx + 1, ty)) g.fillRect((tx + 1) * S, ty * S + (this.b(tx, ty - 1) ? 0 : 5), 5, S);
      if (!this.b(tx, ty + 1)) g.fillRect(tx * S + (this.b(tx - 1, ty) ? 0 : 5), (ty + 1) * S, S, 3);
    }
    // 5) troncos
    for (const t of idx.t) { g.fillStyle = '#4b2f1b'; g.fillRect(t.x * S + 6, t.y * S + 2, 4, 10); g.fillStyle = '#6e4628'; g.fillRect(t.x * S + 6, t.y * S + 2, 2, 10); }
    // 6) edificios: se dibujan por columnas (cada tramo vertical de un mismo edificio: techo arriba, fachada abajo)
    for (let tx = tx0; tx < tx1; tx++) {
      let ty = ty0;
      while (ty < ty1) {
        const id = this.b(tx, ty);
        if (!id) { ty++; continue; }
        let top = ty; while (this.b(tx, top - 1) === id) top--;
        let bot = ty; while (this.b(tx, bot + 1) === id) bot++;
        VR.drawBuildingColumn(g, this, tx, top, bot + 1, id);
        ty = bot + 1;
      }
    }
    g.restore();
    return { ground };
  }

  draw(ctx, camX, camY, sw, sh) {
    const PX = this.CH * VR.TILE;
    const c0 = Math.max(0, Math.floor(camX / PX)), c1 = Math.min(this.cw - 1, Math.floor((camX + sw) / PX));
    const r0 = Math.max(0, Math.floor(camY / PX)), r1 = Math.min(this.chh - 1, Math.floor((camY + sh) / PX));
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++)
      ctx.drawImage(this.chunk(cx, cy).ground, cx * PX - camX, cy * PX - camY);
  }
  // Cosas altas visibles (copas, obelisco, arcos): se ordenan por Y junto con los personajes.
  collectTall(camX, camY, sw, sh, out) {
    const PX = this.CH * VR.TILE, S = VR.TILE, seen = new Set();
    const c0 = Math.max(0, Math.floor(camX / PX)), c1 = Math.min(this.cw - 1, Math.floor((camX + sw) / PX));
    const r0 = Math.max(0, Math.floor(camY / PX)), r1 = Math.min(this.chh - 1, Math.floor((camY + sh) / PX));
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      const idx = this.index[cy * this.cw + cx];
      for (const t of idx.t) {
        if (seen.has(t)) continue; seen.add(t);
        const x = t.x * S + 8 - t.r - 1, y = t.y * S - 6 - t.r - 1;
        if (x > camX + sw || y > camY + sh || x + t.r * 2 + 3 < camX || y + t.r * 2 + 3 < camY) continue;
        out.push({ sy: t.y * S + 12, draw: (ctx) => ctx.drawImage(VR.canopy(t.r, t.pal), x - camX, y - camY) });
      }
      for (const d of idx.d) {
        if (seen.has(d) || !VR.decorTop[d.kind]) continue; seen.add(d);
        for (const part of VR.decorTop[d.kind](d)) out.push({ sy: part.sy, draw: (ctx) => { ctx.save(); ctx.translate(-camX, -camY); part.draw(ctx); ctx.restore(); } });
      }
    }
  }
};

// ---------- paleta de edificios (los índices los usa tools/osm_to_map.py) ----------
VR.BPAL = {
  walls: [[236, 222, 186], [230, 196, 140], [214, 164, 150], [176, 204, 214], [240, 236, 226], [190, 214, 170], [226, 182, 110], [200, 184, 214],
    [246, 242, 230], [232, 230, 222]], // 8 = catedral, 9 = edificios públicos
  roofs: [
    [[178, 82, 52], [160, 70, 46], [190, 98, 60], [150, 60, 40], [200, 92, 58], [124, 52, 38]], // teja
    [[150, 156, 162], [124, 132, 140], [92, 110, 128], [176, 180, 186], [96, 140, 170], [62, 120, 86]], // chapa
    [[178, 172, 160], [160, 156, 148], [190, 186, 176], [206, 202, 192], [170, 162, 150], [150, 150, 150]], // losa
  ],
  awnings: ['#c8402e', '#2e6fc8', '#2e9a5a', '#d08a1e'],
  types: ['teja', 'chapa', 'losa'],
};

// ---------- un tramo vertical de edificio: techo arriba, fachada sur abajo (vista 3/4) ----------
VR.drawBuildingColumn = (g, world, tx, ty0, ty1, id) => {
  const b = world.buildings[id - 1], S = VR.TILE;
  const X = tx * S, Yt = ty0 * S, Yb = ty1 * S, H = Yb - Yt;
  let fh = Math.min(6 + b.floors * 14, H - 6); if (fh < 10) fh = Math.min(H, 10);
  const re = Yb - fh; // fin del techo
  const sh = (c, k) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
  const rect = (x, y, w, h, col) => { const a = Math.max(x, X), z = Math.min(x + w, X + S); if (z > a && h > 0) { g.fillStyle = col; g.fillRect(a, y, z - a, h); } };
  const L = (t) => world.b(tx - 1, t), R = (t) => world.b(tx + 1, t);
  // techo
  if (re > Yt) {
    g.fillStyle = sh(b.roof, 1); g.fillRect(X, Yt, S, re - Yt);
    if (b.rt === 'teja') {
      g.fillStyle = sh(b.roof, 0.78);
      for (let yy = Yt + 3 - (Yt % 4); yy < re - 2; yy += 4) {
        if (yy < Yt) continue;
        g.fillRect(X, yy, S, 1);
        for (let xx = X; xx < X + S; xx++) if ((xx + ((yy >> 2) & 1) * 3) % 6 === 0) g.fillRect(xx, Math.max(Yt, yy - 3), 1, yy - Math.max(Yt, yy - 3));
      }
    } else if (b.rt === 'chapa') {
      g.fillStyle = sh(b.roof, 0.82); for (let xx = X + 2; xx < X + S; xx += 4) g.fillRect(xx, Yt, 1, re - Yt);
      g.fillStyle = sh(b.roof, 1.12); for (let xx = X + 3; xx < X + S; xx += 4) g.fillRect(xx, Yt, 1, re - Yt);
    } else {
      g.fillStyle = sh(b.roof, 0.9); g.fillRect(X, Yt + 2, S, 1);
      if (tx === b.x1 - 1 && re - Yt >= 16) { // tanque de agua
        g.fillStyle = '#2d3d52'; g.fillRect(X + 2, Yt + 4, 9, 9); g.fillStyle = '#4f6a8a'; g.fillRect(X + 3, Yt + 5, 7, 3);
      }
    }
    g.fillStyle = sh(b.roof, 1.18); g.fillRect(X, Yt, S, 1);
    for (let t = ty0; t < ty1; t++) {
      const y0 = t * S, y1 = Math.min(re, y0 + S); if (y1 <= y0) break;
      const l = L(t), r = R(t);
      if (l !== id) { g.fillStyle = l ? sh(b.roof, 0.5) : sh(b.roof, 1.18); g.fillRect(X, y0, 1, y1 - y0); }
      if (r !== id) { g.fillStyle = sh(b.roof, 0.62); g.fillRect(X + S - 1, y0, 1, y1 - y0); }
    }
    g.fillStyle = sh(b.roof, 0.62); g.fillRect(X, re - 2, S, 2);
  }
  // fachada
  const fy = Math.max(Yt, re);
  g.fillStyle = sh(b.wall, 1); g.fillRect(X, fy, S, Yb - fy);
  g.fillStyle = sh(b.wall, 0.8); g.fillRect(X, fy, S, 2);
  g.fillStyle = sh(b.wall, 0.55); g.fillRect(X, Yb - 1, S, 1);
  const lb = L(ty1 - 1), rb = R(ty1 - 1);
  const glass = '#2c4258', glassHi = '#7fa3c0', bx = b.x0 * S;
  // pisos de arriba: ventanas
  for (let f = b.floors - 1; f >= 1; f--) {
    const wy = fy + 4 + (b.floors - 1 - f) * 14;
    if (wy + 8 > Yb - 15) continue;
    for (let wx = bx + 4; wx < X + S; wx += 11) {
      if (wx + 6 <= X) continue;
      rect(wx, wy, 6, 7, glass); rect(wx + 1, wy + 1, 1, 2, glassHi); rect(wx - 1, wy + 7, 8, 1, sh(b.wall, 1.15));
    }
  }
  // planta baja
  const gy = Yb - 15;
  if (gy >= fy + 1) {
    if (b.shop) {
      const a = X + (lb === id ? 0 : 3), z = X + S - (rb === id ? 0 : 3);
      g.fillStyle = glass; g.fillRect(a, gy + 4, z - a, 10);
      g.fillStyle = glassHi; for (let x = a; x < z; x++) if (x % 9 === 2) g.fillRect(x, gy + 5, 1, 3);
      g.fillStyle = sh(b.wall, 0.7); for (let x = a; x < z; x++) if (x % 12 === 0) g.fillRect(x, gy + 4, 1, 10);
      for (let x = X + (lb === id ? 0 : 1); x < X + S - (rb === id ? 0 : 1); x++) { g.fillStyle = ((x >> 2) & 1) ? '#f1ece0' : b.awning; g.fillRect(x, gy, 1, 4); }
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(a, gy + 4, z - a, 1);
    } else {
      const doorHere = tx === b.door, dx = X + 4;
      if (doorHere) {
        g.fillStyle = '#5a3720'; g.fillRect(dx, gy + 2, 8, 12); g.fillStyle = '#7a4d2c'; g.fillRect(dx + 1, gy + 3, 6, 11);
        g.fillStyle = '#e0c060'; g.fillRect(dx + 5, gy + 8, 1, 1);
      }
      for (let wx = bx + 4; wx < X + S; wx += 11) {
        if (wx + 6 <= X || (doorHere && wx + 6 > dx - 1 && wx < dx + 9)) continue;
        rect(wx, gy + 4, 6, 6, glass); rect(wx + 1, gy + 5, 1, 2, glassHi);
        for (let k = 0; k < 6; k += 2) rect(wx + k, gy + 4, 1, 6, '#3b3b40'); // rejas
      }
    }
  }
  // bordes y medianeras
  if (rb !== id) { g.fillStyle = sh(b.wall, 0.62); g.fillRect(X + S - 1, fy, 1, Yb - fy); }
  if (lb && lb !== id) { g.fillStyle = sh(b.wall, 0.5); g.fillRect(X, fy, 1, Yb - fy); }
};

// ---------- decorados ----------
VR.decor = {
  cancha(g, d) { // canchita de tierra colorada con líneas de cal
    const S = VR.TILE, X = d.x * S, Y = d.y * S, W = d.w * S, H = d.h * S;
    g.fillStyle = '#e9e2d0';
    g.fillRect(X + 4, Y + 4, W - 8, 1); g.fillRect(X + 4, Y + H - 5, W - 8, 1);
    g.fillRect(X + 4, Y + 4, 1, H - 8); g.fillRect(X + W - 5, Y + 4, 1, H - 8);
    g.fillRect(X + 4, Y + (H >> 1), W - 8, 1);
    g.beginPath(); g.strokeStyle = '#e9e2d0'; g.lineWidth = 1; g.arc(X + W / 2, Y + H / 2 + 0.5, 14, 0, Math.PI * 2); g.stroke();
    g.fillRect(X + (W >> 1) - 16, Y + 4, 1, 16); g.fillRect(X + (W >> 1) + 15, Y + 4, 1, 16); g.fillRect(X + (W >> 1) - 16, Y + 20, 32, 1);
    g.fillRect(X + (W >> 1) - 16, Y + H - 21, 1, 16); g.fillRect(X + (W >> 1) + 15, Y + H - 21, 1, 16); g.fillRect(X + (W >> 1) - 16, Y + H - 21, 32, 1);
  },
  monumento(g, d) { // base de piedra (la parte alta se ordena con los personajes)
    const S = VR.TILE, X = d.x * S, Y = d.y * S;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X + 4, Y + 6, 32, 30);
    g.fillStyle = '#8f8a80'; g.fillRect(X, Y, 32, 32); g.fillStyle = '#b8b2a6'; g.fillRect(X + 2, Y + 2, 28, 18);
    g.fillStyle = '#6d685f'; g.fillRect(X, Y + 28, 32, 4); g.fillStyle = '#a49e92'; g.fillRect(X + 4, Y + 20, 24, 8);
    g.fillStyle = '#c9a54a'; g.fillRect(X + 12, Y + 22, 8, 4); // placa
  },
};
VR.decorTop = {
  cancha(d) { // arcos (uno en cada punta)
    const S = VR.TILE, X = d.x * S, W = d.w * S, Y = d.y * S, H = d.h * S, cx = X + (W >> 1);
    return [Y + 4, Y + H - 4].map((gy) => ({ sy: gy, draw(g) {
      g.fillStyle = '#1f1d1a'; g.fillRect(cx - 10, gy - 11, 20, 4); g.fillRect(cx - 10, gy - 11, 4, 12); g.fillRect(cx + 6, gy - 11, 4, 12);
      g.fillStyle = '#f4f2ec'; g.fillRect(cx - 9, gy - 10, 18, 2); g.fillRect(cx - 9, gy - 10, 2, 10); g.fillRect(cx + 7, gy - 10, 2, 10);
      g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = -7; i < 7; i += 2) g.fillRect(cx + i, gy - 8, 1, 8);
    } }));
  },
  monumento(d) { // obelisco
    const S = VR.TILE, X = d.x * S + 16, Y = d.y * S + 6;
    return [{ sy: d.y * S + 30, draw(g) {
      g.fillStyle = '#1f1d1a'; g.fillRect(X - 6, Y - 40, 12, 42);
      g.fillStyle = '#d9d3c5'; g.fillRect(X - 5, Y - 36, 10, 37); g.fillStyle = '#f1ece0'; g.fillRect(X - 5, Y - 36, 4, 37);
      g.fillStyle = '#a8a294'; g.fillRect(X + 3, Y - 36, 2, 37);
      g.fillStyle = '#1f1d1a'; g.fillRect(X - 3, Y - 44, 6, 4); g.fillRect(X - 1, Y - 46, 2, 2);
      g.fillStyle = '#d9d3c5'; g.fillRect(X - 2, Y - 43, 4, 7); g.fillStyle = '#f1ece0'; g.fillRect(X - 2, Y - 43, 2, 7);
    } }];
  },
};

// ---------- carga del mapa armado con tools/osm_to_map.py ----------
VR.loadMap = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo bajar el mapa (' + res.status + ')');
  const raw = Inflate.inflateRaw(new Uint8Array(await res.arrayBuffer()), 0, 52000000);
  const jl = raw[0] | (raw[1] << 8) | (raw[2] << 16) | (raw[3] << 24);
  const meta = JSON.parse(new TextDecoder().decode(raw.subarray(4, 4 + jl)));
  const w = new VR.World(meta.w, meta.h), N = meta.w * meta.h;
  let o = 4 + jl;
  const u8 = () => { const a = raw.subarray(o, o + N); o += N; return a; }; // vistas, sin copiar
  const u16 = (n) => { const a = new Uint16Array(raw.slice(o, o + n * 2).buffer); o += n * 2; return a; };
  w.tiles = u8(); w.line = u8(); w.street = u8(); w.area = u8(); if (meta.barrios) w.barrio = u8(); w.bid = u16(N);
  const bd = u16(meta.nb * 8), tr = u16(meta.nt * 4), P = VR.BPAL;
  for (let i = 0; i < meta.nb; i++) {
    const [x0, x1, floors, rt, rc, wc, shop, awn] = bd.subarray(i * 8, i * 8 + 8);
    w.buildings.push({ x0, x1, door: (x0 + x1) >> 1, floors, rt: P.types[rt], roof: P.roofs[rt][rc], wall: P.walls[wc], shop: !!shop, awning: P.awnings[awn] });
  }
  for (let i = 0; i < meta.nt; i++) w.trees.push({ x: tr[i * 4], y: tr[i * 4 + 1], r: tr[i * 4 + 2], pal: tr[i * 4 + 3] });
  w.streets = meta.streets; w.areas = meta.areas; w.barrios = meta.barrios || []; w.barrioLabels = meta.barrioLabels || []; w.labels = meta.labels; w.decals = meta.decals;
  w.spawn = meta.spawn; w.spawnName = 'la Plaza de los Héroes'; w.credit = meta.credit; w.id = 'villarrica-' + meta.w + 'x' + meta.h;
  w.roads = meta.roads || null;
  w.buildIndex();
  return w;
};
