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
    this.inSenda = () => false;
    this.streets = []; this.areas = []; this.barrios = [];
    this.spawn = { x: w * 8, y: h * 8 }; this.spawnName = 'el inicio';
    this.CH = 16; // tiles por chunk (256 unidades; con resolución ×2, 512 px de lienzo)
    this.cache = new Map(); this.MAXCACHE = 64;
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
  // vehículos empujados (estacionados o del tránsito) que tienen que moverse solos hasta frenar
  wake(car, impact) {
    if (!this.dynamic) this.dynamic = new Set();
    if (car.ai) car.ai.stun = Math.max(car.ai.stun || 0, 0.6 + Math.min(1.6, impact / 120));
    else if (!car.driven) this.dynamic.add(car);
  }
  updateDynamic(dt) {
    if (!this.dynamic) return;
    for (const c of this.dynamic) {
      if (c.driven || c.ai) { this.dynamic.delete(c); continue; }
      c.physics(dt, 0, 0, false, true);
      if (Math.hypot(c.vx, c.vy) < 2 && Math.abs(c.w) < 0.05) { c.vx = c.vy = c.w = 0; c.v = 0; c.px = c.x; c.py = c.y; c.pa = c.a; this.dynamic.delete(c); }
    }
  }
  // marca en el piso (frenadas): se pinta sobre el bloque ya dibujado; se borra sola cuando el bloque sale de la caché
  markLine(x0, y0, x1, y1, col) {
    const PX = this.CH * VR.TILE, done = new Set();
    for (const [x, y] of [[x0, y0], [x1, y1]]) {
      const cx = Math.floor(x / PX), cy = Math.floor(y / PX), key = cx + ',' + cy;
      if (done.has(key)) continue; done.add(key);
      const c = this.cache.get(key); if (!c) continue;
      const g = c.ground.getContext('2d'); g.setTransform(c.R, 0, 0, c.R, 0, 0);
      g.strokeStyle = col; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath();
      g.moveTo(x0 - cx * PX, y0 - cy * PX); g.lineTo(x1 - cx * PX, y1 - cy * PX); g.stroke();
    }
  }
  mark(px, py, col) {
    const PX = this.CH * VR.TILE, cx = Math.floor(px / PX), cy = Math.floor(py / PX), c = this.cache.get(cx + ',' + cy);
    if (!c) return;
    const g = c.ground.getContext('2d'); g.setTransform(c.R, 0, 0, c.R, 0, 0); g.fillStyle = col; g.fillRect(Math.round(px - cx * PX) - 1, Math.round(py - cy * PX) - 1, 2, 2);
  }
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
    this.index = Array.from({ length: cw * chh }, () => ({ t: [], d: [], r: [] }));
    const add = (list, item, px0, py0, px1, py1) => {
      for (let cy = Math.max(0, Math.floor(py0 / CH)); cy <= Math.min(chh - 1, Math.floor(py1 / CH)); cy++)
        for (let cx = Math.max(0, Math.floor(px0 / CH)); cx <= Math.min(cw - 1, Math.floor(px1 / CH)); cx++)
          this.index[cy * cw + cx][list].push(item);
    };
    const S = VR.TILE;
    for (const t of this.trees) { const cx = t.x * S + 8, cy = t.y * S - 4; add('t', t, cx - t.r - 8, cy - t.r - 8, cx + t.r + 8, cy + t.r + 12); }
    for (const d of this.decals) add('d', d, d.x * S, d.y * S, (d.x + d.w) * S, (d.y + d.h) * S);
    for (const e of this.diag || []) { const m = e.hs + 40; add('r', e, Math.min(e.ax, e.bx) - m, Math.min(e.ay, e.by) - m, Math.max(e.ax, e.bx) + m, Math.max(e.ay, e.by) + m); }
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
    const R = VR.RES, ground = VR.canvas(PX * R, PX * R), g = ground.getContext('2d');
    g.scale(R, R);
    const idx = this.index[cy * this.cw + cx];
    const tx0 = cx * N, ty0 = cy * N, tx1 = Math.min(this.w, tx0 + N), ty1 = Math.min(this.h, ty0 + N);
    const T = VR.T;
    g.save(); g.translate(-ox, -oy);
    // 1) piso
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) {
      let t = this.tiles[ty * this.w + tx];
      if (t === T.TREE) { const n = this.get(tx - 1, ty), n2 = this.get(tx + 1, ty); if (n === T.PLAZADIRT || n2 === T.PLAZADIRT) t = T.PLAZADIRT; }
      if (VR.GROUND_OF[t] !== undefined) t = VR.GROUND_OF[t];
      VR.tileset.draw(g, t, (VR.hash(tx, ty, 99) * 4) | 0, tx * S, ty * S);
    }
    VR.curWorld = this;
    // 2) decorados de piso (canchas, monumentos)
    for (const d of idx.d) VR.decor[d.kind] && VR.decor[d.kind](g, d);
    // 3) cordones, orillas, líneas y cebras (autotiling según vecinos)
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) {
      const t = this.tiles[ty * this.w + tx], x = tx * S, y = ty * S;
      if (t === T.SIDEWALK || t === T.BUILDING || t === T.CHECKER || t === T.PAVING) {
        const RL = VR.ROADLIKE, curb = (dx, dy) => { const n = this.get(tx + dx, ty + dy); return n >= 0 && RL[n] === 1 && n !== T.DIRTROAD; };
        // cordón (con resolución ×2 se dibuja con medias unidades: canto claro, cara y sombra sobre la calle)
        if (curb(0, -1)) { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x, y - 1, S, 1); g.fillStyle = '#d8d2c4'; g.fillRect(x, y, S, 1.5); g.fillStyle = '#f6f2e8'; g.fillRect(x, y, S, 0.5); g.fillStyle = '#8f897c'; g.fillRect(x, y + 1.5, S, 0.5); }
        if (curb(0, 1)) { g.fillStyle = '#ebe6da'; g.fillRect(x, y + S - 2.5, S, 1); g.fillStyle = '#a49e90'; g.fillRect(x, y + S - 1.5, S, 1); g.fillStyle = '#4a4850'; g.fillRect(x, y + S - 0.5, S, 0.5); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y + S, S, 1); }
        if (curb(-1, 0)) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x - 1, y, 1, S); g.fillStyle = '#e6e0d2'; g.fillRect(x, y, 1.5, S); g.fillStyle = '#f6f2e8'; g.fillRect(x, y, 0.5, S); g.fillStyle = '#9d978a'; g.fillRect(x + 1.5, y, 0.5, S); }
        if (curb(1, 0)) { g.fillStyle = 'rgba(0,0,0,.24)'; g.fillRect(x + S, y, 1, S); g.fillStyle = '#e6e0d2'; g.fillRect(x + S - 1.5, y, 1.5, S); g.fillStyle = '#8a8478'; g.fillRect(x + S - 0.5, y, 0.5, S); g.fillStyle = '#f6f2e8'; g.fillRect(x + S - 2, y, 0.5, S); }
        // canteros de las plazas: borde bajo de cemento blanco donde la laja se junta con el pasto o la tierra
        if (t === T.PAVING && this.plazaSet && this.plazaSet.has(this.area[ty * this.w + tx])) {
          const G = (dx, dy) => { const n = this.get(tx + dx, ty + dy); return (n === T.GRASS || n === T.PLAZADIRT || n === T.TREE || n === T.DIRT) && !this.inSenda(tx + dx, ty + dy); };
          const wc = '#ebe8e0', sc = 'rgba(0,0,0,.22)';
          if (G(0, -1)) { g.fillStyle = wc; g.fillRect(x, y, S, 1); g.fillStyle = sc; g.fillRect(x, y + 1, S, 0.5); }
          if (G(0, 1)) { g.fillStyle = wc; g.fillRect(x, y + S - 1.5, S, 1.5); g.fillStyle = '#b4b0a6'; g.fillRect(x, y + S - 0.5, S, 0.5); }
          if (G(-1, 0)) { g.fillStyle = wc; g.fillRect(x, y, 1, S); g.fillStyle = sc; g.fillRect(x + 1, y, 0.5, S); }
          if (G(1, 0)) { g.fillStyle = wc; g.fillRect(x + S - 1, y, 1, S); g.fillStyle = '#c4c0b6'; g.fillRect(x + S - 1, y, 0.5, S); }
        }
        // macetas contra las fachadas (05/11/2026): arbusto redondo, flores o lengua de suegra, en macetas de barro
        if (t === T.SIDEWALK && this.b(tx, ty - 1) && !this.b(tx, ty + 1) && VR.hash(tx, ty, 307) < 0.07) VR.drawPot(g, x + 3 + VR.hash(tx, ty, 308) * 4, y + 2, (VR.hash(tx, ty, 309) * 3) | 0, VR.hash(tx, ty, 310));
        if (t === T.CHECKER) { // frente a la Municipalidad el cordón está pintado de amarillo (Street View, enero 2025)
          g.fillStyle = '#e8c430';
          if (curb(0, -1)) g.fillRect(x, y, S, 1.5); if (curb(0, 1)) g.fillRect(x, y + S - 2.5, S, 1.5);
          if (curb(-1, 0)) g.fillRect(x, y, 1.5, S); if (curb(1, 0)) g.fillRect(x + S - 1.5, y, 1.5, S);
        }
        // tapas de registro en la vereda (de vez en cuando, cerca del cordón)
        if (t === T.SIDEWALK && (curb(0, -1) || curb(0, 1) || curb(-1, 0) || curb(1, 0)) && VR.hash(tx, ty, 301) < 0.035) {
          const hx = x + 5, hy = y + 5; g.fillStyle = '#5c5850'; g.fillRect(hx, hy, 6, 6); g.fillStyle = '#8e897e'; g.fillRect(hx + 0.5, hy + 0.5, 5, 5);
          g.fillStyle = '#6e6a62'; for (let k = 1.5; k < 5.5; k += 1.5) g.fillRect(hx + 0.5, hy + k, 5, 0.5); g.fillStyle = '#b4aea2'; g.fillRect(hx + 0.5, hy + 0.5, 5, 0.5);
        }
      } else if (t === T.ROAD || t === T.STONE) { // rejillas de desagüe junto al cordón y alguna tapa redonda en el asfalto
        const side = (dx, dy) => this.get(tx + dx, ty + dy) === T.SIDEWALK;
        if (VR.hash(tx, ty, 311) < 0.05) {
          const R = (rx, ry, w, h) => { g.fillStyle = '#2a2a2e'; g.fillRect(rx, ry, w, h); g.fillStyle = '#6a6a70'; if (w > h) for (let k = 0.5; k < w; k += 1) g.fillRect(rx + k, ry + 0.5, 0.5, h - 1); else for (let k = 0.5; k < h; k += 1) g.fillRect(rx + 0.5, ry + k, w - 1, 0.5); };
          if (side(0, -1)) R(x + 5, y + 1, 6, 2.5); else if (side(0, 1)) R(x + 5, y + S - 3.5, 6, 2.5); else if (side(-1, 0)) R(x + 1, y + 5, 2.5, 6); else if (side(1, 0)) R(x + S - 3.5, y + 5, 2.5, 6);
        }
        if (t === T.ROAD && VR.hash(tx, ty, 317) < 0.006 && !side(0, -1) && !side(0, 1) && !side(-1, 0) && !side(1, 0)) {
          g.fillStyle = '#3e3e44'; g.beginPath(); g.arc(x + 8, y + 8, 3.5, 0, 7); g.fill(); g.fillStyle = '#6c6c72'; g.beginPath(); g.arc(x + 8, y + 8, 3, 0, 7); g.fill();
          g.fillStyle = '#56565c'; for (let k = -2; k <= 2; k += 1) g.fillRect(x + 6, y + 8 + k - 0.25, 4, 0.5);
        }
      } else if (t === T.DIRTROAD) { // borde de la calle de tierra: pasto ralo más oscuro
        const edge = (dx, dy) => { const n = this.get(tx + dx, ty + dy); return n >= 0 && VR.ROADLIKE[n] !== 1 && n !== T.SIDEWALK && n !== T.CHECKER; };
        g.fillStyle = 'rgba(70,40,20,.35)';
        if (edge(0, -1)) g.fillRect(x, y, S, 2);
        if (edge(0, 1)) g.fillRect(x, y + S - 2, S, 2);
        if (edge(-1, 0)) g.fillRect(x, y, 2, S);
        if (edge(1, 0)) g.fillRect(x + S - 2, y, 2, S);
      } else if (t === T.LAGUNA) { // orilla de la laguna Ykua Pytã: barro oscuro y un brillo verde claro; el borde del sendero lo pinta aparte
        const bank = (dx, dy) => { const n = this.get(tx + dx, ty + dy); return n !== T.LAGUNA && n !== -1 && n !== T.PAVING && n !== T.MONUMENT && n !== T.LADRILLO; };
        if (bank(0, -1)) { g.fillStyle = '#4a4030'; g.fillRect(x, y, S, 2); g.fillStyle = '#9db27a'; g.fillRect(x, y + 2, S, 0.75); }
        if (bank(0, 1)) { g.fillStyle = '#3e5a34'; g.fillRect(x, y + S - 3, S, 1); g.fillStyle = '#4a4030'; g.fillRect(x, y + S - 2, S, 2); }
        if (bank(-1, 0)) { g.fillStyle = '#4a4030'; g.fillRect(x, y, 2, S); g.fillStyle = '#9db27a'; g.fillRect(x + 2, y, 0.75, S); }
        if (bank(1, 0)) { g.fillStyle = '#4a4030'; g.fillRect(x + S - 2, y, 2, S); }
      } else if (t === T.SENDERO) { // borde de piedra blanca del camino de la laguna donde se junta con el pasto o la tierra
        const G = (dx, dy) => { const n = this.get(tx + dx, ty + dy); return n === T.GRASS || n === T.PLAZADIRT || n === T.TREE || n === T.DIRT; };
        const wc = '#ece9e0', sc = 'rgba(0,0,0,.2)';
        if (G(0, -1)) { g.fillStyle = wc; g.fillRect(x, y, S, 1); g.fillStyle = sc; g.fillRect(x, y + 1, S, 0.5); }
        if (G(0, 1)) { g.fillStyle = wc; g.fillRect(x, y + S - 1.5, S, 1.5); g.fillStyle = '#b4b0a6'; g.fillRect(x, y + S - 0.5, S, 0.5); }
        if (G(-1, 0)) { g.fillStyle = wc; g.fillRect(x, y, 1, S); g.fillStyle = sc; g.fillRect(x + 1, y, 0.5, S); }
        if (G(1, 0)) { g.fillStyle = wc; g.fillRect(x + S - 1, y, 1, S); g.fillStyle = '#c4c0b6'; g.fillRect(x + S - 1, y, 0.5, S); }
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
      else if (l === 3 || l === 4) { // cebra: barras blancas gastadas (3 = la calle va de norte a sur, 4 = de este a oeste)
        const V = l === 3;
        for (let i = 1.5; i < S; i += 5.33) {
          g.fillStyle = '#dedcd4'; V ? g.fillRect(x + i, y, 2.8, S) : g.fillRect(x, y + i, S, 2.8);
          g.fillStyle = 'rgba(70,70,76,.45)';
          for (let k = 0; k < 6; k++) { const h = VR.hash(tx * 7 + k, ty * 5 + (i | 0), 331); if (h < 0.5) { const o = h * 2 * S, w = 0.5 + VR.hash(tx, ty + k, 337) * 1.5; V ? g.fillRect(x + i + (k % 3) * 0.9, y + o, 0.5, w) : g.fillRect(x + o, y + i + (k % 3) * 0.9, w, 0.5); } }
        }
      }
    }
    // 3b) calles en diagonal (05/11/2026): las baldosas quedan escalonadas, así que encima se dibujan lisas
    if (idx.r.length) VR.drawDiagonals(g, this, idx.r, tx0, ty0, tx1, ty1);
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
    for (const t of idx.t) {
      g.fillStyle = '#4b2f1b'; g.fillRect(t.x * S + 6, t.y * S + 2, 4, 10); g.fillStyle = '#6e4628'; g.fillRect(t.x * S + 6, t.y * S + 2, 2, 10);
      if (this.calSet && this.calSet.has(this.area[t.y * this.w + t.x])) { // tronco pintado con cal (Street View de la plaza)
        g.fillStyle = '#e9e7df'; g.fillRect(t.x * S + 6, t.y * S + 6, 4, 6); g.fillStyle = '#ffffff'; g.fillRect(t.x * S + 6, t.y * S + 6, 1.5, 6); g.fillStyle = '#c4c0b4'; g.fillRect(t.x * S + 9, t.y * S + 6, 1, 6);
      }
    }
    // 6) edificios: se dibujan por columnas (cada tramo vertical de un mismo edificio: techo arriba, fachada abajo)
    for (let tx = tx0; tx < tx1; tx++) {
      let ty = ty0;
      while (ty < ty1) {
        const id = this.b(tx, ty);
        if (!id) { ty++; continue; }
        let top = ty; while (this.b(tx, top - 1) === id) top--;
        let bot = ty; while (this.b(tx, bot + 1) === id) bot++;
        if (!this.special || id !== this.special.muni) VR.drawBuildingColumn(g, this, tx, top, bot + 1, id);
        ty = bot + 1;
      }
    }
    // 7) edificios dibujados a mano (lugares emblemáticos), encima de todo lo del piso
    for (const d of idx.d) VR.decorOver[d.kind] && VR.decorOver[d.kind](g, d);
    g.restore();
    return { ground, R };
  }

  draw(ctx, camX, camY, sw, sh) {
    const PX = this.CH * VR.TILE;
    const c0 = Math.max(0, Math.floor(camX / PX)), c1 = Math.min(this.cw - 1, Math.floor((camX + sw) / PX));
    const r0 = Math.max(0, Math.floor(camY / PX)), r1 = Math.min(this.chh - 1, Math.floor((camY + sh) / PX));
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++)
      ctx.drawImage(this.chunk(cx, cy).ground, cx * PX - camX, cy * PX - camY, PX, PX);
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
        out.push({ sy: t.y * S + 12, draw: (ctx) => { const cimg = VR.canopy(t.r, t.pal); ctx.drawImage(cimg, x - camX, y - camY, cimg.lw, cimg.lw); } });
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
    [246, 242, 230], [232, 230, 222], [234, 156, 132], [70, 64, 60], [230, 242, 242], [214, 192, 152], [64, 64, 70]], // 14 = gris carbón (arcos de Mcal. López) // 8 = catedral, 9 = públicos, 10 = salmón, 11 = gris oscuro (Gleu), 12 = blanco turquesa (Universitaria), 13 = beige (café de la esquina)
  roofs: [
    [[178, 82, 52], [160, 70, 46], [190, 98, 60], [150, 60, 40], [200, 92, 58], [124, 52, 38]], // teja
    [[150, 156, 162], [124, 132, 140], [92, 110, 128], [176, 180, 186], [96, 140, 170], [62, 120, 86]], // chapa
    [[178, 172, 160], [160, 156, 148], [190, 186, 176], [206, 202, 192], [170, 162, 150], [150, 150, 150]], // losa
  ],
  awnings: ['#c8402e', '#2e6fc8', '#2e9a5a', '#d08a1e'],
  types: ['teja', 'chapa', 'losa'],
};

// ---------- un tramo vertical de edificio: techo arriba, fachada sur abajo (vista 3/4) ----------
// Con resolución ×2 (05/11/2026) se dibuja con medias unidades: tejas en hileras con luz y sombra, chapa
// acanalada, losa con manchas, pretil y canaleta; en la fachada, zócalo, ventanas con marco, vidrio con reflejo
// y alféizar, rejas finas, puertas con picaporte, persianas de los negocios y toldos con festón. Variaciones por
// edificio (aire acondicionado, tanque, balcón, persiana a medio subir) salen del número de edificio.
VR.drawBuildingColumn = (g, world, tx, ty0, ty1, id) => {
  const b = world.buildings[id - 1], S = VR.TILE, H0 = VR.hash;
  const X = tx * S, Yt = ty0 * S, Yb = ty1 * S, H = Yb - Yt;
  let fh = Math.min(6 + b.floors * 14, H - 6); if (fh < 10) fh = Math.min(H, 10);
  const re = Yb - fh; // fin del techo
  const sh = (c, k) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
  const rect = (x, y, w, h, col) => { const a = Math.max(x, X), z = Math.min(x + w, X + S); if (z > a && h > 0) { g.fillStyle = col; g.fillRect(a, y, z - a, h); } };
  const L = (t) => world.b(tx - 1, t), R = (t) => world.b(tx + 1, t);
  const v = (k) => H0(id, k, 977); // variaciones propias de cada edificio
  // ---- techo ----
  if (re > Yt) {
    const rh = re - Yt;
    g.fillStyle = sh(b.roof, 1); g.fillRect(X, Yt, S, rh);
    if (b.rt === 'teja') { // hileras de tejas: cada teja con su tono, luz arriba y sombra abajo
      for (let yy = Yt - (Yt % 3); yy < re; yy += 3) {
        const row = (yy / 3) | 0;
        for (let xx = X - ((row & 1) ? 1.5 : 0); xx < X + S; xx += 3) {
          const k = 0.9 + H0(xx * 2 | 0, row, id) * 0.2, y0 = Math.max(yy, Yt), h = Math.min(yy + 3, re) - y0; if (h <= 0) continue;
          const x0 = Math.max(xx, X), w = Math.min(xx + 3, X + S) - x0; if (w <= 0) continue;
          g.fillStyle = sh(b.roof, k); g.fillRect(x0, y0, w, h);
          g.fillStyle = sh(b.roof, k * 1.18); g.fillRect(x0, y0, Math.min(w, 1), Math.min(h, 2));
          if (xx + 2.5 > X && xx + 2.5 < X + S) { g.fillStyle = sh(b.roof, 0.7); g.fillRect(xx + 2.5, y0, 0.5, h); }
        }
        if (yy + 2.5 < re && yy + 2.5 >= Yt) { g.fillStyle = sh(b.roof, 0.62); g.fillRect(X, yy + 2.5, S, 0.5); }
      }
    } else if (b.rt === 'chapa') { // chapa acanalada, con alguna mancha de óxido
      for (let xx = X; xx < X + S; xx += 2) { g.fillStyle = sh(b.roof, 1.14); g.fillRect(xx, Yt, 0.5, rh); g.fillStyle = sh(b.roof, 0.8); g.fillRect(xx + 1.5, Yt, 0.5, rh); }
      for (let yy = Yt + 7; yy < re - 1; yy += 18) { g.fillStyle = sh(b.roof, 0.86); g.fillRect(X, yy, S, 0.5); } // solapes
      if (v(1) < 0.3) for (let k = 0; k < 3; k++) { const h = H0(tx, k, id); if (h < 0.5) { g.fillStyle = 'rgba(150,80,40,.35)'; g.fillRect(X + h * 24, Yt + H0(k, tx, id) * rh, 2.5, 1.5); } }
    } else { // losa: hormigón con manchas, pretil, desagüe
      for (let yy = Yt; yy < re; yy += 2) for (let xx = X; xx < X + S; xx += 2) { const h = H0(xx, yy, id); if (h < 0.2) { g.fillStyle = sh(b.roof, 0.93); g.fillRect(xx, yy, 2, 2); } else if (h > 0.9) { g.fillStyle = sh(b.roof, 1.05); g.fillRect(xx, yy, 1, 1); } }
      g.fillStyle = sh(b.roof, 1.15); g.fillRect(X, Yt, S, 1.5); g.fillStyle = sh(b.roof, 0.85); g.fillRect(X, Yt + 1.5, S, 0.5);
      if (tx === b.x1 - 1 && rh >= 16) { // tanque de agua
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X + 3, Yt + 5, 10, 10);
        g.fillStyle = '#2d3d52'; g.fillRect(X + 2, Yt + 4, 9, 9); g.fillStyle = '#4f6a8a'; g.fillRect(X + 2.5, Yt + 4.5, 8, 3); g.fillStyle = '#7f9aba'; g.fillRect(X + 3, Yt + 5, 3, 1);
        g.fillStyle = '#1c2838'; g.beginPath(); g.arc(X + 6.5, Yt + 9.5, 1.6, 0, 7); g.fill();
      }
      if (tx === b.x0 + 1 && rh >= 14 && v(2) < 0.5) { // aire acondicionado en el techo
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X + 3, Yt + 6, 8, 6); g.fillStyle = '#d8d8d2'; g.fillRect(X + 2, Yt + 5, 8, 6); g.fillStyle = '#9a9a96'; g.beginPath(); g.arc(X + 6, Yt + 8, 2.2, 0, 7); g.fill(); g.fillStyle = '#5a5a58'; g.fillRect(X + 4, Yt + 7.75, 4, 0.5); g.fillRect(X + 5.75, Yt + 6, 0.5, 4);
      }
    }
    g.fillStyle = sh(b.roof, 1.2); g.fillRect(X, Yt, S, 0.5);
    for (let t = ty0; t < ty1; t++) {
      const y0 = t * S, y1 = Math.min(re, y0 + S); if (y1 <= y0) break;
      const l = L(t), r = R(t);
      if (l !== id) { g.fillStyle = l ? sh(b.roof, 0.5) : sh(b.roof, 1.22); g.fillRect(X, y0, 1, y1 - y0); }
      if (r !== id) { g.fillStyle = sh(b.roof, 0.6); g.fillRect(X + S - 1, y0, 1, y1 - y0); }
    }
    // alero / canaleta sobre la fachada
    g.fillStyle = sh(b.roof, 0.55); g.fillRect(X, re - 2, S, 1); g.fillStyle = sh(b.roof, 0.78); g.fillRect(X, re - 1, S, 0.5); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(X, re - 0.5, S, 0.5);
  }
  // ---- fachada ----
  const fy = Math.max(Yt, re);
  g.fillStyle = sh(b.wall, 1); g.fillRect(X, fy, S, Yb - fy);
  for (let yy = fy + 1; yy < Yb; yy += 2) for (let xx = X; xx < X + S; xx += 2) if (H0(xx, yy, id + 5) < 0.12) { g.fillStyle = sh(b.wall, 0.95); g.fillRect(xx, yy, 1, 1); } // revoque
  g.fillStyle = sh(b.wall, 0.78); g.fillRect(X, fy, S, 1.5);
  g.fillStyle = sh(b.wall, 1.12); g.fillRect(X, fy + 1.5, S, 0.5);
  const lb = L(ty1 - 1), rb = R(ty1 - 1);
  const glass = '#2c4258', glassHi = '#7fa3c0', glassMid = '#3c5878', bx = b.x0 * S;
  const win = (wx, wy, w, h) => { // ventana con marco, vidrio con reflejo y alféizar
    rect(wx - 0.5, wy - 0.5, w + 1, h + 1, sh(b.wall, 0.62));
    rect(wx, wy, w, h, glass); rect(wx, wy, w, h * 0.45, glassMid);
    rect(wx + 1, wy + 0.5, 0.5, h * 0.5, glassHi); rect(wx + 1.5, wy + 0.5, 0.5, h * 0.25, glassHi);
    rect(wx + w / 2 - 0.25, wy, 0.5, h, sh(b.wall, 0.75)); // hoja
    rect(wx - 1, wy + h + 0.5, w + 2, 1, sh(b.wall, 1.18)); rect(wx - 1, wy + h + 1.5, w + 2, 0.5, sh(b.wall, 0.6));
  };
  // pisos de arriba: ventanas (y algún balcón)
  for (let f = b.floors - 1; f >= 1; f--) {
    const wy = fy + 4 + (b.floors - 1 - f) * 14;
    if (wy + 8 > Yb - 15) continue;
    const balc = v(10 + f) < 0.25;
    for (let wx = bx + 4; wx < X + S; wx += 11) {
      if (wx + 6 <= X) continue;
      win(wx, wy, 6, 7);
      if (balc) { rect(wx - 1.5, wy + 7, 9, 2, sh(b.wall, 0.8)); for (let k = 0; k < 9; k += 1.5) rect(wx - 1.5 + k, wy + 3.5, 0.5, 3.5, '#2a2a30'); rect(wx - 1.5, wy + 3.5, 9, 0.5, '#2a2a30'); }
      else if (v(20 + f) < 0.35 && ((wx / 11) | 0) % 3 === 1) { rect(wx + 0.5, wy + 7.5, 5, 3, '#e6e6e0'); rect(wx + 1, wy + 8, 4, 0.5, '#9a9a96'); rect(wx + 1, wy + 9, 4, 0.5, '#9a9a96'); } // aire acondicionado
    }
  }
  // planta baja
  const gy = Yb - 15;
  if (gy >= fy + 1) {
    if (b.shop) {
      const a = X + (lb === id ? 0 : 3), z = X + S - (rb === id ? 0 : 3);
      const half = v(30) < 0.3; // persiana a medio subir
      g.fillStyle = glass; g.fillRect(a, gy + 4, z - a, 10);
      g.fillStyle = glassMid; g.fillRect(a, gy + 4, z - a, 4);
      g.fillStyle = glassHi; for (let x = a; x < z; x += 0.5) if ((x * 2 | 0) % 18 === 4) { g.fillRect(x, gy + 5, 0.5, 4); g.fillRect(x + 1, gy + 5, 0.5, 2); }
      // mercadería en la vidriera
      for (let x = a + 1; x < z - 1; x += 2) { const h = H0(x * 2 | 0, ty1, id); if (h < 0.45) { g.fillStyle = ['#c84a3a', '#e8c040', '#4a8ac8', '#e8e4dc', '#6aa84a'][(h * 11 | 0) % 5]; g.fillRect(x, gy + 10.5 - h * 4, 1.5, 3 + h * 4); } }
      if (half) { g.fillStyle = '#9a9ca0'; g.fillRect(a, gy + 4, z - a, 5); g.fillStyle = '#7a7c80'; for (let y = gy + 4.5; y < gy + 9; y += 1) g.fillRect(a, y, z - a, 0.5); }
      g.fillStyle = sh(b.wall, 0.7); for (let x = a; x < z; x++) if (x % 12 === 0) g.fillRect(x, gy + 4, 1, 10);
      // toldo a rayas con festón
      for (let x = X + (lb === id ? 0 : 1); x < X + S - (rb === id ? 0 : 1); x += 0.5) {
        const st = ((x / 2) | 0) & 1; g.fillStyle = st ? '#f1ece0' : b.awning; g.fillRect(x, gy - 0.5, 0.5, 4);
        if (((x * 2) | 0) % 4 < 2) { g.fillStyle = st ? '#d8d2c4' : sh([parseInt(b.awning.slice(1, 3), 16), parseInt(b.awning.slice(3, 5), 16), parseInt(b.awning.slice(5, 7), 16)], 0.8); g.fillRect(x, gy + 3.5, 0.5, 1); }
      }
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(X, gy - 0.5, S, 0.5);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(a, gy + 4.5, z - a, 1);
    } else {
      const doorHere = tx === b.door, dx = X + 4;
      if (doorHere) {
        g.fillStyle = sh(b.wall, 0.6); g.fillRect(dx - 1, gy + 1, 10, 13);
        g.fillStyle = '#5a3720'; g.fillRect(dx, gy + 2, 8, 12); g.fillStyle = '#7a4d2c'; g.fillRect(dx + 0.5, gy + 2.5, 7, 11.5);
        g.fillStyle = '#6a4226'; g.fillRect(dx + 1.5, gy + 3.5, 2, 4); g.fillRect(dx + 4.5, gy + 3.5, 2, 4); g.fillRect(dx + 1.5, gy + 9, 2, 4); g.fillRect(dx + 4.5, gy + 9, 2, 4); // tableros
        g.fillStyle = '#e0c060'; g.fillRect(dx + 6, gy + 8, 1, 1); g.fillStyle = sh(b.wall, 1.15); g.fillRect(dx - 1, gy + 14, 10, 1); // picaporte y umbral
      }
      for (let wx = bx + 4; wx < X + S; wx += 11) {
        if (wx + 6 <= X || (doorHere && wx + 6 > dx - 1 && wx < dx + 9)) continue;
        win(wx, gy + 4, 6, 6);
        for (let k = 0.5; k < 6; k += 1.5) rect(wx + k, gy + 3.5, 0.5, 7, '#2a2a30'); // rejas
        rect(wx - 0.5, gy + 3.5, 7, 0.5, '#2a2a30'); rect(wx - 0.5, gy + 6.5, 7, 0.5, '#2a2a30');
      }
    }
  }
  // zócalo, medianeras y sombra al pie
  g.fillStyle = sh(b.wall, 0.72); g.fillRect(X, Yb - 1.5, S, 1); g.fillStyle = sh(b.wall, 0.5); g.fillRect(X, Yb - 0.5, S, 0.5);
  if (rb !== id) { g.fillStyle = sh(b.wall, 0.62); g.fillRect(X + S - 1, fy, 1, Yb - fy); }
  if (lb && lb !== id) { g.fillStyle = sh(b.wall, 0.5); g.fillRect(X, fy, 1, Yb - fy); }
  else if (!lb) { g.fillStyle = sh(b.wall, 1.12); g.fillRect(X, fy, 0.5, Yb - fy); }
};

// ---------- calles en diagonal (Ruta 8 por Santa Lucía y otras; Leandro, 05/11/2026) ----------
// Las baldosas de 2 m solo pueden ser horizontales o verticales: una calle en diagonal queda en escalera. Para que
// se vea bien, cada tramo de la red de calles que va en diagonal (entre 12° y 78°) se dibuja encima, liso:
// primero la vereda (una banda un poco más ancha que tapa los escalones), después la calzada con su piso, el
// pedacito de las calles que llegan a cada esquina (para que la vereda no las tape) y los cordones. La colisión
// sigue usando las baldosas.
VR.findDiagonals = (R) => {
  if (!R) return [];
  const S = VR.TILE, N = R.nodes, E = R.edges, adj = new Map(), out = [];
  const node = (i) => [N[i * 2], N[i * 2 + 1]];
  for (let i = 0; i < E.length; i += 4) for (const n of [E[i], E[i + 1]]) { let l = adj.get(n); if (!l) adj.set(n, l = []); l.push(i); }
  const MAIN = ['trunk', 'primary', 'secondary', 'tertiary'];
  const info = (i) => { const k = E[i + 2] & 15, [ax, ay] = node(E[i]), [bx, by] = node(E[i + 1]); return { a: E[i], b: E[i + 1], ax, ay, bx, by, surf: E[i + 2] >> 4, hr: R.widths[k] * S / 2, sw: (R.swidths ? R.swidths[k] : 1) * S, main: MAIN.includes(R.kinds[k]) }; };
  const isDiag = (e) => { const L = Math.hypot(e.bx - e.ax, e.by - e.ay), ang = Math.atan2(Math.abs(e.by - e.ay), Math.abs(e.bx - e.ax)) * 180 / Math.PI; return L > 24 && ang > 12 && ang < 78; };
  for (let i = 0; i < E.length; i += 4) {
    const e = info(i); if (!isDiag(e)) continue;
    e.side = e.surf !== VR.T.DIRTROAD && e.sw > 0;
    e.hs = e.hr + (e.side ? e.sw : 0) + 8;
    e.stubs = []; e.cut = {};
    for (const [n, px, py] of [[e.a, e.ax, e.ay], [e.b, e.bx, e.by]]) {
      const others = (adj.get(n) || []).filter((j) => j !== i).map(info);
      let cut = 0;
      for (const o of others) {
        const ox = o.a === n ? o.bx : o.ax, oy = o.a === n ? o.by : o.ay, L = Math.hypot(ox - px, oy - py) || 1, l = Math.min(L, e.hs + 20);
        e.stubs.push({ ax: px, ay: py, bx: px + (ox - px) / L * l, by: py + (oy - py) / L * l, hr: o.hr, surf: o.surf });
        if (others.length >= 2 || !isDiag(o)) cut = Math.max(cut, o.hr + 6);
      }
      e.cut[n] = cut;
    }
    out.push(e);
  }
  return out;
};
VR.drawDiagonals = (g, world, list, tx0, ty0, tx1, ty1) => {
  const S = VR.TILE, T = VR.T;
  const band = (path, ax, ay, bx, by, h, capA = true, capB = true) => {
    const L = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / L * h, ny = (bx - ax) / L * h;
    path.moveTo(ax + nx, ay + ny); path.lineTo(bx + nx, by + ny); path.lineTo(bx - nx, by - ny); path.lineTo(ax - nx, ay - ny); path.closePath();
    if (capA) { path.moveTo(ax + h, ay); path.arc(ax, ay, h, 0, Math.PI * 2); }
    if (capB) { path.moveTo(bx + h, by); path.arc(bx, by, h, 0, Math.PI * 2); }
  };
  const fill = (path, type) => {
    g.save(); g.clip(path, 'nonzero');
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) VR.tileset.draw(g, type, (VR.hash(tx, ty, 99) * 4) | 0, tx * S, ty * S);
    g.restore();
  };
  // 1) veredas: en tiras cortas a cada lado; donde del otro lado hay otra calle (un cruce), esa tira no va
  const isRd = (px, py) => { const t = world.get(Math.floor(px / S), Math.floor(py / S)); return t === T.ROAD || t === T.STONE || t === T.DIRTROAD; };
  const side = new Path2D(); let anySide = false;
  for (const e of list) {
    if (!e.side) continue;
    const L = Math.hypot(e.bx - e.ax, e.by - e.ay), ux = (e.bx - e.ax) / L, uy = (e.by - e.ay) / L, nx = -uy, ny = ux, st = 6;
    e.ok = { '-1': [], '1': [] };
    for (const sd of [-1, 1]) for (let t = 0; t < L; t += st) {
      const t2 = Math.min(L, t + st + 0.5), tm = (t + t2) / 2, ox = e.ax + ux * tm + nx * sd * (e.hs - 5), oy = e.ay + uy * tm + ny * sd * (e.hs - 5);
      const ok = !isRd(ox, oy); e.ok[sd].push(ok); if (!ok) continue;
      const a0 = e.hr - 2, a1 = e.hs;
      side.moveTo(e.ax + ux * t + nx * sd * a0, e.ay + uy * t + ny * sd * a0); side.lineTo(e.ax + ux * t2 + nx * sd * a0, e.ay + uy * t2 + ny * sd * a0);
      side.lineTo(e.ax + ux * t2 + nx * sd * a1, e.ay + uy * t2 + ny * sd * a1); side.lineTo(e.ax + ux * t + nx * sd * a1, e.ay + uy * t + ny * sd * a1); side.closePath(); anySide = true;
    }
    for (const [n, px, py] of [[e.a, e.ax, e.ay], [e.b, e.bx, e.by]]) if (!e.cut[n]) { side.moveTo(px + e.hs, py); side.arc(px, py, e.hs, 0, Math.PI * 2); } // curva entre dos tramos en diagonal
  }
  if (anySide) fill(side, T.SIDEWALK);
  // 2) calzadas (y los pedacitos de las calles que llegan), agrupadas por piso
  const bySurf = new Map(), add = (surf, f) => { let p = bySurf.get(surf); if (!p) bySurf.set(surf, p = new Path2D()); f(p); };
  for (const e of list) {
    add(e.surf, (p) => band(p, e.ax, e.ay, e.bx, e.by, e.hr));
    for (const s of e.stubs) add(s.surf, (p) => band(p, s.ax, s.ay, s.bx, s.by, s.hr, true, false));
  }
  for (const surf of [T.DIRTROAD, T.STONE, T.ROAD]) if (bySurf.has(surf)) fill(bySurf.get(surf), surf); // el asfalto gana en los cruces
  // 2b) línea amarilla del medio en las rutas y avenidas de asfalto (cortada en los cruces)
  g.save(); g.setLineDash([9, 7]); g.lineCap = 'butt'; g.strokeStyle = '#e2bf45'; g.lineWidth = 2;
  for (const e of list) {
    if (!e.main || e.surf !== T.ROAD) continue;
    const L = Math.hypot(e.bx - e.ax, e.by - e.ay), ux = (e.bx - e.ax) / L, uy = (e.by - e.ay) / L, c0 = (e.cut[e.a] || 0) + 6, c1 = L - (e.cut[e.b] || 0) - 6;
    if (c1 - c0 < 8) continue;
    g.lineDashOffset = -((e.ax * ux + e.ay * uy + c0) % 16);
    g.beginPath(); g.moveTo(e.ax + ux * c0, e.ay + uy * c0); g.lineTo(e.ax + ux * c1, e.ay + uy * c1); g.stroke();
  }
  g.restore();
  // 3) cordones a los costados de la calzada, solo donde hay vereda de ese lado
  g.lineCap = 'butt';
  for (const e of list) {
    if (!e.side || !e.ok) continue;
    const L = Math.hypot(e.bx - e.ax, e.by - e.ay), ux = (e.bx - e.ax) / L, uy = (e.by - e.ay) / L, nx = -uy, ny = ux, st = 6;
    const c0 = e.cut[e.a] || 0, c1 = L - (e.cut[e.b] || 0);
    for (const sd of [-1, 1]) {
      const okl = e.ok[sd]; let t = 0;
      for (let k = 0; k < okl.length; k++) {
        if (!okl[k]) continue; let k2 = k; while (k2 + 1 < okl.length && okl[k2 + 1]) k2++;
        const t0 = Math.max(c0, k * st), t1 = Math.min(c1, (k2 + 1) * st); k = k2; if (t1 - t0 < 2) continue;
        const o = sd * (e.hr + 0.8), x0 = e.ax + ux * t0 + nx * o, y0 = e.ay + uy * t0 + ny * o, x1 = e.ax + ux * t1 + nx * o, y1 = e.ay + uy * t1 + ny * o;
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x0 - nx * sd, y0 - ny * sd + 0.6); g.lineTo(x1 - nx * sd, y1 - ny * sd + 0.6); g.stroke();
        g.strokeStyle = '#d8d2c4'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        g.strokeStyle = '#f6f2e8'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x0 + nx * sd * 0.5, y0 + ny * sd * 0.5); g.lineTo(x1 + nx * sd * 0.5, y1 + ny * sd * 0.5); g.stroke();
      }
    }
  }
};

// ---------- maceta vista desde arriba (en unidades del mundo, con detalle de medio píxel) ----------
VR.drawPot = (g, x, y, kind, h) => {
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 4.5, y + 8, 4.2, 1.6, 0, 0, 7); g.fill();
  g.fillStyle = '#7a3a22'; g.fillRect(x + 1, y + 4, 7, 4.5); g.fillStyle = '#b4583a'; g.fillRect(x + 1, y + 4, 7, 3.5);   // maceta
  g.fillStyle = '#d0784e'; g.fillRect(x + 1, y + 4, 2, 3.5); g.fillStyle = '#8e4428'; g.fillRect(x + 0.5, y + 3.5, 8, 1);   // luz y borde
  if (kind === 2) { // lengua de suegra: hojas verticales con borde amarillo
    for (let i = 0; i < 6; i++) { const lx = x + 1.5 + i * 1.1, top = y - 3.5 + VR.hash(i, h * 99, 5) * 2.5; g.fillStyle = '#c8b850'; g.fillRect(lx, top, 1, y + 4 - top); g.fillStyle = i % 2 ? '#2f6a34' : '#3f8a44'; g.fillRect(lx + 0.25, top + 0.5, 0.5, y + 3.5 - top); }
    return;
  }
  const blobs = [[4.5, 1.5, 3.2], [2.5, 2.8, 2.2], [6.5, 2.8, 2.2], [4.5, -0.5, 2.2]];
  for (const [bx, by, r] of blobs) { g.fillStyle = '#285c26'; g.beginPath(); g.arc(x + bx, y + by, r + 0.5, 0, 7); g.fill(); }
  for (const [bx, by, r] of blobs) { g.fillStyle = '#3f8a3c'; g.beginPath(); g.arc(x + bx, y + by, r, 0, 7); g.fill(); g.fillStyle = '#62ad54'; g.beginPath(); g.arc(x + bx - r * 0.35, y + by - r * 0.35, r * 0.45, 0, 7); g.fill(); }
  if (kind === 1) { const col = h < 0.5 ? ['#e04a6a', '#ff9ab0'] : ['#f2d040', '#fff3a0']; for (let i = 0; i < 7; i++) { const fx = x + 1.5 + VR.hash(i, h * 77, 3) * 6, fy = y - 1.5 + VR.hash(i, h * 77, 4) * 5; g.fillStyle = col[0]; g.fillRect(fx, fy, 1, 1); g.fillStyle = col[1]; g.fillRect(fx, fy, 0.5, 0.5); } }
};

// ---------- decorados ----------
VR.decor = {
  cuartel(g, d) { // piso de cemento del cuartel de bomberos, con juntas y manchas de aceite
    const S = VR.TILE, X = (d.x + 3) * S, Y = d.y * S, W = (d.w - 3) * S, H = Math.min(d.h + 2, d.ry - d.y) * S;
    g.fillStyle = '#b4b2ac'; g.fillRect(X, Y, W, H);
    for (let yy = Y; yy < Y + H; yy += 2) for (let xx = X; xx < X + W; xx += 2) { const h = VR.hash(xx, yy, 517); if (h < 0.12) { g.fillStyle = '#a8a6a0'; g.fillRect(xx, yy, 2, 2); } else if (h > 0.96) { g.fillStyle = '#c4c2bc'; g.fillRect(xx, yy, 1, 1); } }
    g.fillStyle = '#96948e'; for (let x = X + 32; x < X + W; x += 32) g.fillRect(x, Y, 0.5, H); for (let y = Y + 32; y < Y + H; y += 32) g.fillRect(X, y, W, 0.5);
    for (const [ox, oy] of [[30, 60], [78, 66]]) { g.fillStyle = 'rgba(40,36,30,.25)'; g.beginPath(); g.ellipse(X + ox, Y + oy, 7, 10, 0, 0, 7); g.fill(); }
  },
  senda(g, d) { // camino diagonal de la plaza: laja lisa, con cordoncitos blancos de los canteros a los costados
    const S = VR.TILE, ax = d.ax * S, ay = d.ay * S, bx = d.bx * S, by = d.by * S, hw = d.hw * S;
    const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux;
    g.save(); g.beginPath(); g.moveTo(ax + nx * hw, ay + ny * hw); g.lineTo(bx + nx * hw, by + ny * hw); g.lineTo(bx - nx * hw, by - ny * hw); g.lineTo(ax - nx * hw, ay - ny * hw); g.closePath(); g.clip();
    for (let ty = d.y; ty < d.y + d.h; ty++) for (let tx = d.x; tx < d.x + d.w; tx++) {
      const px = tx * S + 8 - ax, py = ty * S + 8 - ay, along = px * ux + py * uy, across = Math.abs(px * nx + py * ny);
      if (along < -S || along > L + S || across > hw + S) continue;
      VR.tileset.draw(g, VR.T.PAVING, (VR.hash(tx, ty, 99) * 4) | 0, tx * S, ty * S);
    }
    g.restore();
    g.lineCap = 'butt';
    // cordoncitos solo donde del otro lado hay cantero (pasto o tierra), no sobre la laja de las esquinas
    const W = VR.curWorld, T = VR.T, green = (px, py) => { const t = W ? W.get(Math.floor(px / S), Math.floor(py / S)) : T.GRASS; return t === T.GRASS || t === T.PLAZADIRT || t === T.TREE || t === T.DIRT; };
    const runs = [];
    for (const sd of [-1, 1]) { let st = null; const N = Math.ceil(L / 2);
      for (let i = 0; i <= N; i++) { const t = i / N, ok = green(ax + ux * L * t + nx * sd * (hw + 3), ay + uy * L * t + ny * sd * (hw + 3));
        if (ok && st === null) st = t; if ((!ok || i === N) && st !== null) { runs.push([st, t, sd]); st = null; } } }
    for (const [t0, t1, sd] of runs) {
      const o = sd * (hw + 0.6), x0 = ax + ux * L * t0 + nx * o, y0 = ay + uy * L * t0 + ny * o, x1 = ax + ux * L * t1 + nx * o, y1 = ay + uy * L * t1 + ny * o;
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 0.6, y0 + 0.8); g.lineTo(x1 + 0.6, y1 + 0.8); g.stroke();
      g.strokeStyle = '#ebe8e0'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x0 - nx * 0.3, y0 - ny * 0.3); g.lineTo(x1 - nx * 0.3, y1 - ny * 0.3); g.stroke();
    }
  },
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
  monumento_bajo(g, d) { // fuente con borde de ladrillo (foto de la plaza de Leandro)
    const S = VR.TILE, X = d.x * S, Y = d.y * S;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X + 3, Y + 4, 32, 32);
    g.fillStyle = '#8e3f2b'; g.fillRect(X - 2, Y - 2, 36, 36);
    g.fillStyle = '#b5573c'; g.fillRect(X, Y, 32, 32); g.fillStyle = '#c8705a'; g.fillRect(X, Y, 32, 2); g.fillRect(X, Y, 2, 32);
    g.fillStyle = '#3e74b8'; g.fillRect(X + 4, Y + 4, 24, 24);
    g.fillStyle = '#6fa4dc'; for (let k = 0; k < 4; k++) g.fillRect(X + 6 + ((k * 7 + ((performance.now() / 300) | 0)) % 18), Y + 7 + k * 5, 4, 1);
    g.fillStyle = '#e8e4da'; g.fillRect(X + 13, Y + 13, 6, 6); g.fillStyle = '#ffffff'; g.fillRect(X + 15, Y + 12, 2, 2);
  },
  mastiles(g, d) { // base de los mástiles frente a la Municipalidad, con dos pedestales para los leones
    const S = VR.TILE, X = d.x * S, Y = d.y * S;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X + 3, Y + 4, 48, 32);
    g.fillStyle = '#b5573c'; g.fillRect(X, Y, 48, 32); g.fillStyle = '#e8e4da'; g.fillRect(X + 2, Y + 2, 44, 10);
    g.fillStyle = '#d8d4cc'; g.fillRect(X + 16, Y + 12, 16, 18);
    g.fillStyle = '#8e3f2b'; g.fillRect(X, Y + 28, 48, 4);
    for (const px of [X + 2, X + 34]) { g.fillStyle = '#c8705a'; g.fillRect(px, Y + 14, 12, 14); g.fillStyle = '#3f8a4a'; g.fillRect(px + 1, Y + 14, 10, 3); }
  },
  monumento(g, d) { // base de piedra (la parte alta se ordena con los personajes)
    const S = VR.TILE, X = d.x * S, Y = d.y * S;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X + 4, Y + 6, 32, 30);
    g.fillStyle = '#8f8a80'; g.fillRect(X, Y, 32, 32); g.fillStyle = '#b8b2a6'; g.fillRect(X + 2, Y + 2, 28, 18);
    g.fillStyle = '#6d685f'; g.fillRect(X, Y + 28, 32, 4); g.fillStyle = '#a49e92'; g.fillRect(X + 4, Y + 20, 24, 8);
    g.fillStyle = '#c9a54a'; g.fillRect(X + 12, Y + 22, 8, 4); // placa
  },
};
// ---------- Municipalidad de Villarrica (vista satelital, fotos de referencia y Leandro, 03/11/2026) ----------
// Edificio neoclásico de dos pisos color salmón con molduras crema; techos planos grises en franjas con borde
// de teja. Fachada principal al OESTE (hacia la Plaza de los Héroes): pórtico con frontón, escudo, escarapela y
// bandera. Al SUR, la entrada del Teatro Municipal: como la cámara ve las fachadas sur, se ve de frente.
// Colores: hoy está pintada de blanco (Street View, enero 2025); antes era salmón con molduras crema.
VR.MUNI = { SAL: '#eeece6', SAL_D: '#c9c5bc', SAL_L: '#ffffff', CREAM: '#ffffff', CREAM_D: '#d6d2c8', TEJA: '#b5573c', TEJA_D: '#8e3f2b', GLASS: '#3a3f4c' };
VR.MUNI_OLD = { SAL: '#e99c82', SAL_D: '#c97a62', SAL_L: '#f4b8a0', CREAM: '#f2deae', CREAM_D: '#cdb582' };
VR.decorOver = {
  // frente de un negocio que mira al este (a la plaza): toldo/alero sobre la vereda, cartel y detalles
  frente(g, d) {
    const S = VR.TILE, X = d.x * S, Y = d.y * S + 2, H = d.h * S - 4;
    const st = { antana: ['#1a1a1e', '#f04a2a', 'deportes'], gleu: ['#3a2c22', '#e8e0d0', 'pub'], marimer: ['#f4efe4', '#c8963a', 'heladeria'],
      universitaria: ['#2a9aa0', '#ffffff', 'coop'], farma: ['#2e7fc8', '#3aa64a', 'farma'],
      credito: ['#f2efe6', '#3cc87a', 'credito'], lila: ['#8a3aa8', '#e8a8f0', 'lila'], banco: ['#1f3f9a', '#e8eefc', 'banco'] }[d.style] || ['#888', '#fff', ''];
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(X, Y + 3, 9, H);
    g.fillStyle = st[0]; g.fillRect(X, Y, 7, H);                       // alero / cartel
    g.fillStyle = st[1]; g.fillRect(X + 2, Y + 3, 3, H - 6);
    if (d.style === 'marimer') { // luces cálidas del frente
      for (let y = Y + 4; y < Y + H - 2; y += 6) { g.fillStyle = 'rgba(255,214,120,.35)'; g.fillRect(X + 6, y - 2, 8, 5); g.fillStyle = '#ffe9a8'; g.fillRect(X + 7, y, 2, 2); }
    }
    if (d.style === 'universitaria') { for (let y = Y; y < Y + H; y += 10) { g.fillStyle = '#e8fbfb'; g.fillRect(X, y, 7, 2); } }
    if (d.style === 'gleu') { for (let y = Y + 2; y < Y + H; y += 8) { g.fillStyle = '#6a4a30'; g.fillRect(X + 1, y, 5, 5); } }
  },
  anfiteatro(g, d) { // gradas blancas de 3 escalones (forma de U abierta al este), piso hundido y escenario bajo
    const S = VR.TILE, X = d.x * S, Y = d.y * S, X1 = X + d.w * S, Y1 = Y + d.h * S;
    const poly = (k) => { // contorno a k px hacia adentro, con las esquinas del oeste cortadas en diagonal
      const c = Math.max(4, 22 - k * 0.6), x0 = X + k, y0 = Y + k, y1 = Y1 - k;
      g.beginPath(); g.moveTo(X1, y0); g.lineTo(x0 + c, y0); g.lineTo(x0, y0 + c); g.lineTo(x0, y1 - c); g.lineTo(x0 + c, y1); g.lineTo(X1, y1); g.closePath(); g.fill();
    };
    g.fillStyle = 'rgba(0,0,0,.18)'; poly(-2);
    for (let i = 0; i < 3; i++) { // escalón: cara de arriba clara y contrahuella en sombra
      g.fillStyle = '#efebe3'; poly(i * 8); g.fillStyle = '#b9b3a7'; poly(i * 8 + 6);
    }
    g.fillStyle = '#d3cdc1'; poly(24); // piso de cemento
    g.fillStyle = 'rgba(0,0,0,.08)';
    for (let x = X + 40; x < X1; x += 24) g.fillRect(x, Y + 25, 1, d.h * S - 50); // juntas
    // escenario: plataforma baja con escalón al oeste
    const sx = X + d.sx * S, sy = Y + d.sy * S, sw = X1 - sx, sh = 6 * S;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(sx - 6, sy + 3, sw + 6, sh);
    g.fillStyle = '#c9c3b7'; g.fillRect(sx - 6, sy + 6, 6, sh - 12);
    g.fillStyle = '#e9e5dd'; g.fillRect(sx, sy, sw, sh);
    g.fillStyle = '#b0aa9e'; g.fillRect(sx, sy, 3, sh); g.fillRect(sx, sy + sh - 3, sw, 3);
  },
  cartel(g, d) { // cartel sobre la fachada sur (la que mira a la calle de abajo), entre la planta baja y el piso de arriba
    const S = VR.TILE, X = d.x * S + 3, Y = (d.y + 1) * S - 22, W = d.w * S - 6;
    if (d.style === 'banco') {
      g.fillStyle = '#1f3f9a'; g.fillRect(X, Y, W, 6); g.fillStyle = '#e8eefc'; g.fillRect(X + 4, Y + 2, Math.min(28, W - 12), 2);
      g.fillStyle = '#3aa64a'; g.fillRect(X + W - 7, Y + 1, 4, 4);
    } else if (d.style === 'cafe') {
      g.fillStyle = '#3a2c22'; g.fillRect(X + 4, Y - 1, Math.min(26, W - 8), 7); g.fillStyle = '#ffe2a0'; g.fillRect(X + 7, Y + 2, Math.min(20, W - 14), 1);
      g.fillStyle = 'rgba(255,214,140,.35)'; g.fillRect(X, Y + 7, W, 3);
    }
  },
  esquina(g, d) { // esquina redondeada: cordón curvo; en la plaza, pintado de amarillo y con rampas azules (Street View)
    const S = VR.TILE, R = d.r * S, q = d.q, sx = q[1] === 'w' ? 1 : -1, sy = q[0] === 'n' ? 1 : -1;
    const ox = d.cx * S, oy = d.cy * S, cx = ox + sx * R, cy = oy + sy * R, X = d.x * S, Y = d.y * S;
    const inT = d.t !== undefined ? d.t : VR.T.PAVING, rdT = d.rt !== undefined ? d.rt : VR.T.ROAD, plaza = d.p !== 0;
    g.save(); g.beginPath(); g.rect(X, Y, R, R); g.clip();
    for (let ty = d.y; ty < d.y + d.r; ty++) for (let tx = d.x; tx < d.x + d.r; tx++) VR.tileset.draw(g, rdT, (VR.hash(tx, ty, 99) * 4) | 0, tx * S, ty * S);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(cx + 0.8, cy + 1, R + 0.6, 0, 7); g.fill(); // sombra del cordón
    g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
    for (let ty = d.y; ty < d.y + d.r; ty++) for (let tx = d.x; tx < d.x + d.r; tx++) VR.tileset.draw(g, inT, (VR.hash(tx, ty, 99) * 4) | 0, tx * S, ty * S);
    g.restore();
    g.save(); g.beginPath(); g.rect(X, Y, R, R); g.clip();
    if (plaza) {
      g.strokeStyle = '#a89a5a'; g.lineWidth = 2.2; g.beginPath(); g.arc(cx, cy, R - 1, 0, 7); g.stroke();
      g.strokeStyle = '#e8b830'; g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, R - 1, 0, 7); g.stroke();      // cordón amarillo
      g.strokeStyle = '#f8d860'; g.lineWidth = 0.5; g.beginPath(); g.arc(cx, cy, R - 1.6, 0, 7); g.stroke();
    } else { // cordón común: canto claro y cara gris, como los rectos
      g.strokeStyle = '#8f897c'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R - 1, 0, 7); g.stroke();
      g.strokeStyle = '#d8d2c4'; g.lineWidth = 1.4; g.beginPath(); g.arc(cx, cy, R - 1.1, 0, 7); g.stroke();
      g.strokeStyle = '#f6f2e8'; g.lineWidth = 0.5; g.beginPath(); g.arc(cx, cy, R - 0.6, 0, 7); g.stroke();
    }
    g.restore();
    if (!plaza) return;
    // dos rampas, una hacia cada cruce, sobre la curva
    const base = Math.atan2(-sy, -sx); // dirección de la esquina vista desde el centro
    for (const off of [-0.5, 0.5]) {
      const a = base + off, px = cx + Math.cos(a) * (R - 2.5), py = cy + Math.sin(a) * (R - 2.5);
      g.save(); g.translate(px, py); g.rotate(a + Math.PI / 2);
      g.fillStyle = '#e8b830'; g.fillRect(-4.2, -1.5, 8.4, 6); g.fillStyle = '#2e5aa8'; g.fillRect(-3.2, -1.5, 6.4, 5.5); g.fillStyle = '#4a7ad0'; g.fillRect(-3.2, -1.5, 6.4, 1);
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0.4, 0.2, 0.55, 0, 7); g.fill(); g.fillRect(0.1, 0.8, 0.6, 1.4); g.fillRect(0.1, 1.9, 1.5, 0.5);
      g.strokeStyle = '#ffffff'; g.lineWidth = 0.45; g.beginPath(); g.arc(0.1, 2.5, 1.1, 0.3, Math.PI * 1.7); g.stroke();
      g.restore();
    }
  },
  galeria(g, d) { // casona colonial blanca con galería de arcos sobre la vereda (Mcal. López y Gral. Díaz)
    const S = VR.TILE, X0 = d.x * S, X1 = (d.x + d.w) * S, Yb = (d.y + 1) * S, top = Yb - 34;
    g.fillStyle = '#f2f0ea'; g.fillRect(X0, top, X1 - X0, Yb - top);
    g.fillStyle = '#d8d4ca'; g.fillRect(X0, top, X1 - X0, 2); g.fillStyle = '#ffffff'; g.fillRect(X0, top, X1 - X0, 0.5);
    for (let x = X0 + 1; x < X1 - 1; x += 2) { g.fillStyle = '#c4c0b6'; g.fillRect(x, top + 2.5, 1, 1); } // dentículos de la cornisa
    g.fillStyle = '#e4e0d6'; g.fillRect(X0, top + 4, X1 - X0, 1.5);
    const n = Math.max(1, Math.floor((X1 - X0) / 18)), step = (X1 - X0) / n;
    for (let i = 0; i < n; i++) {
      const cx = X0 + step * (i + 0.5), w = step - 7, x = cx - w / 2, y0 = top + 8, r = w / 2;
      g.fillStyle = '#4a4440'; g.beginPath(); g.moveTo(x, Yb - 1); g.lineTo(x, y0 + r); g.arc(cx, y0 + r, r, Math.PI, 0); g.lineTo(x + w, Yb - 1); g.closePath(); g.fill(); // hueco del arco (sombra de la galería)
      g.fillStyle = '#6a625a'; g.fillRect(x + 1.5, y0 + r + 3, w - 3, Yb - y0 - r - 5);                                     // fondo: vidriera del local
      g.fillStyle = '#8aa0b4'; g.fillRect(x + 2, y0 + r + 4, w - 4, 6); g.fillStyle = '#b8c8d8'; g.fillRect(x + 2.5, y0 + r + 4.5, 1, 4);
      if (i === n - 1) { // tienda de ropa: maniquí en la vidriera de la esquina
        const mx = cx + 1; g.fillStyle = '#1a1a1e'; g.fillRect(mx - 2.5, Yb - 15, 5, 12); g.fillStyle = '#f4f2ec'; g.fillRect(mx - 2, Yb - 14.5, 4, 5); g.fillStyle = '#5a6a8a'; g.fillRect(mx - 2, Yb - 9.5, 4, 5.5); g.fillStyle = '#ece8e0'; g.fillRect(mx - 1, Yb - 17.5, 2, 2.5);
      } else if (i === n - 2) { // librería: cartel blanco con letras rojas (sin nombre)
        g.fillStyle = '#1a1a1e'; g.fillRect(cx - 7.5, y0 + 1.5, 15, 7); g.fillStyle = '#fbfaf6'; g.fillRect(cx - 7, y0 + 2, 14, 6); g.fillStyle = '#c8302a'; g.fillRect(cx - 5.5, y0 + 3, 11, 1.5); g.fillRect(cx - 4, y0 + 5.5, 8, 1);
      }
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, y0 + r, r + 1, Math.PI, 0); g.arc(cx, y0 + r, r, 0, Math.PI, true); g.closePath(); g.fill(); // moldura del arco
    }
    for (let i = 0; i <= n; i++) { const px = X0 + step * i - 2; g.fillStyle = '#ffffff'; g.fillRect(Math.max(X0, px), top + 6, 4, Yb - top - 6); g.fillStyle = '#c8c4ba'; g.fillRect(Math.max(X0, px) + 3.5, top + 6, 0.5, Yb - top - 6); g.fillStyle = '#e4e0d6'; g.fillRect(Math.max(X0, px) - 0.5, Yb - 3, 5, 3); } // pilastras
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X0, Yb, X1 - X0, 2);
  },
  cuartel(g, d) { // casita amarilla del cuartel (vista 3/4: techo de chapa arriba, frente amarillo al sur)
    const S = VR.TILE, X = d.x * S, Y = d.y * S, W = 3 * S, H = 3 * S, fy = Y + H - 22;
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(X + W, Y + 4, 5, H - 2); g.fillRect(X + 4, Y + H, W, 3);
    g.fillStyle = '#c8ccce'; g.fillRect(X, Y, W, fy - Y); for (let x = X + 1; x < X + W; x += 2) { g.fillStyle = '#e0e4e6'; g.fillRect(x, Y, 0.5, fy - Y); g.fillStyle = '#a4a8ac'; g.fillRect(x + 1.2, Y, 0.5, fy - Y); }
    g.fillStyle = '#8a8e92'; g.fillRect(X, fy - 2, W, 2);
    g.fillStyle = '#ecd66a'; g.fillRect(X, fy, W, Y + H - fy); g.fillStyle = '#f8e888'; g.fillRect(X, fy, 1, Y + H - fy); g.fillStyle = '#c8b048'; g.fillRect(X + W - 1, fy, 1, Y + H - fy);
    g.fillStyle = '#d4bc50'; g.fillRect(X, Y + H - 2, W, 2);                                                          // zócalo
    g.fillStyle = '#5a3a20'; g.fillRect(X + 8, fy + 5, 9, 17); g.fillStyle = '#8a5a32'; g.fillRect(X + 8.5, fy + 5.5, 8, 16.5); g.fillStyle = '#7a4c28'; for (let k = 10; k < 16; k += 2) g.fillRect(X + k, fy + 6, 0.5, 16); g.fillStyle = '#e0c060'; g.fillRect(X + 15, fy + 13, 1, 1); // puerta de madera
    g.fillStyle = '#2a2a30'; g.fillRect(X + 26, fy + 6, 8, 7); g.fillStyle = '#4a5a6a'; g.fillRect(X + 26.5, fy + 6.5, 7, 6); // ventana
    g.fillStyle = '#fff6c8'; g.fillRect(X + 22, fy + 3, 2, 1.5); // farolito
  },
  taller(g, d) { // taller "Pyahu": persiana gris, cartel amarillo con llave, cubiertas apiladas y manchas de aceite
    const S = VR.TILE, X = d.x * S + 2, W = d.w * S - 4, Y = (d.y + 1) * S - 9, mid = X + (W >> 1);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(X + 2, Y + 3, W, 9);
    for (let x = X; x < X + W; x++) { g.fillStyle = ((x - X) >> 2) & 1 ? '#2a2a2e' : '#e8b830'; g.fillRect(x, Y + 6, 1, 3); }
    g.fillStyle = '#6a6e76'; g.fillRect(X, Y, W, 6); g.fillStyle = '#80848c'; for (let y = Y + 1; y < Y + 6; y += 2) g.fillRect(X, y, W, 1);
    g.fillStyle = '#2a2a30'; g.fillRect(mid - 14, Y - 1, 28, 8); g.fillStyle = '#e8b830'; g.fillRect(mid - 13, Y, 26, 6);
    g.fillStyle = '#2a2a30'; g.fillRect(mid - 4, Y + 2, 8, 2); g.fillRect(mid - 6, Y + 1, 2, 4); g.fillRect(mid + 4, Y + 1, 2, 4); // llave
    for (const [tx, ty] of [[X + 4, Y - 10], [X + 4, Y - 6], [X + W - 9, Y - 8]]) { g.fillStyle = '#16161a'; g.beginPath(); g.ellipse(tx + 2.5, ty + 2, 3, 2.2, 0, 0, 7); g.fill(); g.fillStyle = '#4a4a52'; g.fillRect(tx + 1.5, ty + 1.5, 2, 1); }
    g.fillStyle = 'rgba(20,18,16,.35)'; g.beginPath(); g.ellipse(mid - 10, Y - 6, 6, 2.5, 0, 0, 7); g.ellipse(mid + 12, Y - 4, 4, 2, 0, 0, 7); g.fill();
  },
  tienda(g, d) { // tienda de ropa "Ao Porã" (05/11/2026): mira al norte, así que desde arriba se ve el toldo sobre la vereda
    const S = VR.TILE, X = d.x * S + 2, W = d.w * S - 4, Y = (d.y + 1) * S - 9, mid = X + (W >> 1);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(X + 2, Y + 3, W, 9);
    for (let x = X; x < X + W; x++) { g.fillStyle = ((x - X) >> 2) & 1 ? '#f4efe6' : '#d0407a'; g.fillRect(x, Y, 1, 8); }
    g.fillStyle = '#9a2a58'; g.fillRect(X, Y + 7, W, 2);                                   // borde del toldo
    for (let x = X + 1; x < X + W; x += 4) { g.fillStyle = '#f4efe6'; g.fillRect(x, Y + 9, 2, 1); } // flecos
    g.fillStyle = '#3a3a44'; g.fillRect(mid - 9, Y + 1, 18, 7); g.fillStyle = '#ffd9ea'; g.fillRect(mid - 7, Y + 3, 14, 1); g.fillRect(mid - 5, Y + 5, 10, 1); // cartel chico
    g.fillStyle = '#7a3a52'; g.fillRect(mid - 8, Y - 4, 16, 3); g.fillStyle = '#c8607e'; g.fillRect(mid - 8, Y - 4, 16, 1); // alfombra de la entrada
  },
  arcos(g, d) { // Mcal. López, lado norte (video de Leandro): edificio gris carbón con arcos altos y una puerta roja
    const S = VR.TILE, X0 = d.x * S, X1 = (d.x + d.w) * S, Yb = (d.y + 1) * S, top = Yb - 33;
    g.fillStyle = '#404048'; g.fillRect(X0, top, X1 - X0, Yb - top);                                          // la fachada entera, lisa
    for (let yy = top + 2; yy < Yb; yy += 2) for (let xx = X0; xx < X1; xx += 2) if (VR.hash(xx, yy, 71) < 0.1) { g.fillStyle = '#46464e'; g.fillRect(xx, yy, 1, 1); }
    g.fillStyle = '#4a4a52'; g.fillRect(X0, top, X1 - X0, 2); g.fillStyle = '#76767e'; g.fillRect(X0, top, X1 - X0, 0.5); // cornisa
    const n = Math.max(2, Math.floor((X1 - X0 - 4) / 13)), step = (X1 - X0) / n;
    for (let i = 0; i < n; i++) {
      const cx = X0 + step * (i + 0.5), w = Math.min(9, step - 4), x = cx - w / 2, y0 = top + 4, r = w / 2;
      g.fillStyle = '#5a5a62'; g.beginPath(); g.moveTo(x - 1, Yb - 1); g.lineTo(x - 1, y0 + r); g.arc(cx, y0 + r, r + 1, Math.PI, 0); g.lineTo(x + w + 1, Yb - 1); g.closePath(); g.fill(); // marco
      const red = i === Math.floor(n * 0.6);
      g.fillStyle = red ? '#a8302c' : '#24242a'; g.beginPath(); g.moveTo(x, Yb - 1); g.lineTo(x, y0 + r); g.arc(cx, y0 + r, r, Math.PI, 0); g.lineTo(x + w, Yb - 1); g.closePath(); g.fill();
      if (red) { g.fillStyle = '#c84a42'; g.fillRect(x + 0.5, y0 + r, 1, Yb - y0 - r - 2); g.fillStyle = '#e0c060'; g.fillRect(cx + 1.5, Yb - 9, 1, 1); }
      else { g.fillStyle = '#34343c'; for (let k = 1; k < w; k += 1.5) g.fillRect(x + k, y0 + r + 1, 0.5, Yb - y0 - r - 3); g.fillStyle = '#44444c'; g.fillRect(x, y0 + r + 6, w, 0.5); } // persianas de hierro
    }
    g.fillStyle = '#3a3a40'; g.fillRect(X0, Yb - 1.5, X1 - X0, 1.5);
  },
  pilastras(g, d) { // Mcal. López, lado sur: locales blancos con pilastras de piedra y marquesinas negras (miran al norte)
    const S = VR.TILE, X0 = d.x * S, X1 = (d.x + d.w) * S, Y = (d.y + 1) * S;
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(X0, Y - 2, X1 - X0, 2);
    g.fillStyle = '#f4f2ec'; g.fillRect(X0, Y, X1 - X0, 3); g.fillStyle = '#d8d4cc'; g.fillRect(X0, Y + 2.5, X1 - X0, 0.5);       // pretil blanco
    for (let x = X0 + 1; x < X1 - 1; x += 11) { g.fillStyle = '#8a6a4c'; g.fillRect(x, Y - 1, 3, 4.5); g.fillStyle = '#a8866a'; g.fillRect(x, Y - 1, 3, 1); g.fillStyle = '#6a5038'; g.fillRect(x + 2.5, Y - 1, 0.5, 4.5); } // pilastras de piedra
    for (let x = X0 + 6.5; x < X1 - 8; x += 22) { // marquesinas negras curvas sobre las puertas
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 4.5, Y - 1, 5, 3.5, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#1c1c22'; g.beginPath(); g.ellipse(x + 4, Y - 0.5, 4.5, 4, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#3a3a44'; g.beginPath(); g.ellipse(x + 4, Y - 0.5, 3.5, 3, 0, Math.PI, Math.PI * 1.5); g.fill();
    }
  },
  sillas(g, d) { // mesas y sillas plásticas rojas bajo los árboles, sector sudoeste de la plaza (Street View)
    const S = VR.TILE, X = d.x * S, Y = d.y * S, red = '#d0282a', redD = '#8e1a1c', redL = '#f05048';
    for (let k = 0; k < 5; k++) {
      const tx = X + 6 + ((k * 23) % (d.w * S - 18)), ty = Y + 6 + ((k * 17) % (d.h * S - 18));
      g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(tx + 6, ty + 7, 8, 5, 0, 0, 7); g.fill();
      for (const [cx, cy] of [[-5, 2], [13, 3], [4, -5], [5, 12]]) { g.fillStyle = redD; g.fillRect(tx + cx, ty + cy, 4.5, 4.5); g.fillStyle = red; g.fillRect(tx + cx, ty + cy, 4, 4); g.fillStyle = redL; g.fillRect(tx + cx, ty + cy, 4, 1); } // sillas
      g.fillStyle = redD; g.fillRect(tx - 0.5, ty - 0.5, 12, 11); g.fillStyle = red; g.fillRect(tx, ty, 11, 10); g.fillStyle = redL; g.fillRect(tx, ty, 11, 1.5); g.fillRect(tx, ty, 1.5, 10); // mesa
    }
  },
  juegos(g, d) { // juegos infantiles amarillos al norte de la plaza (Street View): arenero, tobogán y hamacas
    const S = VR.TILE, X = d.x * S, Y = d.y * S, W = d.w * S, H = d.h * S;
    g.fillStyle = '#c8a878'; g.fillRect(X, Y, W, H); g.fillStyle = '#d8bc8c'; for (let i = 0; i < 40; i++) g.fillRect(X + VR.hash(i, 1, 9) * W, Y + VR.hash(i, 2, 9) * H, 1, 1); // arena
    g.fillStyle = '#8a6a44'; g.fillRect(X, Y, W, 1); g.fillRect(X, Y + H - 1, W, 1); g.fillRect(X, Y, 1, H); g.fillRect(X + W - 1, Y, 1, H);
  },
  mesas(g, d) { // mesitas de madera y macetas en la vereda, frente al café
    const S = VR.TILE, X = d.x * S, Y = d.y * S + 3;
    for (let k = 0, x = X + 6; x < X + d.w * S - 14 && k < 3; x += 22, k++) {
      g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x + 1, Y + 2, 10, 8);
      g.fillStyle = '#8a5a32'; g.fillRect(x, Y, 10, 8); g.fillStyle = '#a8703e'; g.fillRect(x, Y, 10, 2);
      g.fillStyle = '#6a4424'; g.fillRect(x - 4, Y + 1, 3, 6); g.fillRect(x + 11, Y + 1, 3, 6);
    }
    for (const x of [X + 1, X + d.w * S - 8]) { g.fillStyle = '#7a4a2a'; g.fillRect(x, Y + 3, 7, 6); g.fillStyle = '#3f8a3a'; g.fillRect(x - 1, Y - 1, 9, 5); g.fillStyle = '#5aa84a'; g.fillRect(x + 1, Y - 2, 4, 3); }
  },
  terraza(g, d) { // mesas y sillas en el borde de la plaza, frente a la heladería, y tachos rojos
    const S = VR.TILE, X = d.x * S, Y = d.y * S;
    for (let k = 0; k < 4; k++) {
      const tx = X + 8 + (k % 2) * 18, ty = Y + 10 + k * 30;
      g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(tx + 1, ty + 2, 12, 12);
      g.fillStyle = '#d8d6d0'; g.fillRect(tx - 5, ty + 3, 4, 6); g.fillRect(tx + 13, ty + 3, 4, 6); g.fillRect(tx + 4, ty - 5, 6, 4); g.fillRect(tx + 4, ty + 13, 6, 4);
      g.fillStyle = '#f2f0ea'; g.fillRect(tx, ty, 12, 12); g.fillStyle = '#c8c4ba'; g.fillRect(tx, ty + 10, 12, 2);
    }
    for (const ty of [Y + 2, Y + d.h * S - 12]) { g.fillStyle = '#1f1d1a'; g.fillRect(X - 2, ty - 1, 10, 10); g.fillStyle = '#c8322a'; g.fillRect(X - 1, ty, 8, 8); g.fillStyle = '#e8584a'; g.fillRect(X - 1, ty, 3, 8); }
  },
  muni(g, d) {
    const S = VR.TILE, C = VR.MUNI, X0 = d.bx * S, Y0 = d.y * S, W = d.bw * S, H = d.bh * S, FH = 40, RE = Y0 + H - FH;
    // techo: borde de teja y franjas de losa gris con parapetos crema
    g.fillStyle = C.TEJA; g.fillRect(X0, Y0, W, RE - Y0);
    for (let y = Y0 + 2; y < RE; y += 4) { g.fillStyle = C.TEJA_D; g.fillRect(X0, y, W, 1); }
    const inset = 10, strips = 3, sw = (W - inset * 2) / strips;
    for (let i = 0; i < strips; i++) {
      const x = Math.round(X0 + inset + i * sw);
      g.fillStyle = C.CREAM_D; g.fillRect(x, Y0 + inset - 2, Math.round(sw), RE - Y0 - inset * 2 + 4);
      g.fillStyle = i === 1 ? '#c9c5bb' : '#b9b5ab'; g.fillRect(x + 2, Y0 + inset, Math.round(sw) - 4, RE - Y0 - inset * 2);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 2, Y0 + inset, Math.round(sw) - 4, 2);
    }
    g.fillStyle = C.CREAM; g.fillRect(X0, Y0, W, 2); g.fillRect(X0, Y0, 2, RE - Y0); g.fillRect(X0 + W - 2, Y0, 2, RE - Y0);
    // fachada sur (dos pisos): salmón, cornisa y faja crema, ventanas con arco, pilastras
    g.fillStyle = C.CREAM; g.fillRect(X0, RE, W, 4); g.fillStyle = C.CREAM_D; g.fillRect(X0, RE + 4, W, 1);
    g.fillStyle = C.SAL; g.fillRect(X0, RE + 5, W, FH - 5);
    g.fillStyle = C.CREAM; g.fillRect(X0, RE + 21, W, 2);
    g.fillStyle = C.SAL_D; g.fillRect(X0, Y0 + H - 3, W, 3);
    const tcx = X0 + d.tx * S + 8, tw = 64; // entrada del teatro (centro de la fachada sur)
    for (let x = X0 + 6; x < X0 + W - 10; x += 16) {
      if (Math.abs(x + 8 - tcx) < tw / 2 + 4) continue;
      g.fillStyle = C.CREAM; g.fillRect(x, RE + 5, 3, FH - 8);
      for (const wy of [RE + 8, RE + 25]) {
        g.fillStyle = C.CREAM; g.fillRect(x + 6, wy, 7, 11); g.fillStyle = C.GLASS; g.fillRect(x + 7, wy + 2, 5, 9);
        g.fillStyle = C.CREAM; g.fillRect(x + 7, wy + 1, 5, 1);
      }
    }
    g.fillStyle = C.SAL_L; g.fillRect(X0, RE + 5, 2, FH - 8);
    // entrada del Teatro Municipal (Street View, enero 2025): arriba una fila de ventanas en arco, abajo tres
    // arcos grandes; adelante, escalinata
    {
      // (foto de Leandro, 05/11/2026) fachada blanca: cartel iluminado celeste arriba, 6 ventanas en arco con
      // banderas, cornisa, tres arcos grandes con puertas de madera y vidrio, luces en la base
      const x0 = tcx - tw / 2, top = RE - 6, bot = Y0 + H, WH = '#f2f0ea', WD = '#d4d0c6', WL = '#ffffff';
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x0 + 3, top + 3, tw, bot - top);
      g.fillStyle = WH; g.fillRect(x0, top, tw, bot - top);                                   // muro blanco
      g.fillStyle = WD; g.fillRect(x0 + tw - 3, top, 3, bot - top); g.fillStyle = WL; g.fillRect(x0, top, 2, bot - top);
      // ático con el cartel iluminado
      g.fillStyle = '#d8f2ff'; g.fillRect(x0 + 8, top - 6, tw - 16, 7); g.fillStyle = '#4ac0f0'; g.fillRect(x0 + 9, top - 5, tw - 18, 5);
      g.fillStyle = 'rgba(120,220,255,.35)'; g.fillRect(x0 + 6, top - 8, tw - 12, 11);
      g.save(); g.fillStyle = '#ffffff'; g.font = 'bold 3.6px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TEATRO MUNICIPAL DE VILLARRICA', tcx, top - 2.4, tw - 20); g.restore();
      g.fillStyle = WD; g.fillRect(x0 - 2, top + 1, tw + 4, 2); g.fillStyle = WL; g.fillRect(x0 - 2, top + 1, tw + 4, 1); // cornisa alta
      // piso alto: 6 ventanas en arco con banderas paraguayas entre ellas
      const fy = top + 6;
      for (let k = 0; k < 6; k++) {
        const wx = x0 + 6 + k * 9.2;
        g.fillStyle = WD; g.fillRect(wx - 1, fy, 8, 12); g.fillStyle = '#2a3a5a'; g.fillRect(wx, fy + 2, 6, 10); g.fillRect(wx + 1, fy + 1, 4, 1);
        g.fillStyle = '#5a7ab8'; g.fillRect(wx + 1, fy + 3, 2, 4); g.fillStyle = WL; g.fillRect(wx, fy + 7, 6, 1); g.fillRect(wx + 3, fy + 2, 1, 10);
        if (k < 5) { const fx = wx + 7.4; g.fillStyle = '#8a8a90'; g.fillRect(fx, fy + 1, 0.6, 9); g.fillStyle = '#d52b1e'; g.fillRect(fx + 0.6, fy + 1, 2.6, 1); g.fillStyle = '#ffffff'; g.fillRect(fx + 0.6, fy + 2, 2.6, 1); g.fillStyle = '#0038a8'; g.fillRect(fx + 0.6, fy + 3, 2.6, 1); }
      }
      g.fillStyle = WD; g.fillRect(x0 - 3, fy + 13, tw + 6, 3); g.fillStyle = WL; g.fillRect(x0 - 3, fy + 13, tw + 6, 1); // cornisa del medio
      // planta baja: tres arcos grandes con puertas de madera y vidrio cuadriculado
      const ay = fy + 17, ah = bot - ay - 2;
      for (let k = 0; k < 3; k++) {
        const ax = x0 + 7 + k * 18;
        g.fillStyle = WD; g.fillRect(ax - 1, ay, 15, ah + 1); g.fillStyle = '#e8e4da'; g.fillRect(ax + 2, ay - 1, 9, 2);
        g.fillStyle = '#9a4a1c'; g.fillRect(ax, ay + 2, 13, ah - 1); g.fillRect(ax + 2, ay + 1, 9, 1);
        g.fillStyle = '#f0b878'; for (let yy = ay + 3; yy < ay + ah; yy += 3) for (let xx = ax + 1; xx < ax + 12; xx += 3) g.fillRect(xx, yy, 2, 2);
        g.fillStyle = '#6a3010'; g.fillRect(ax + 6, ay + 2, 1, ah - 1);
      }
      for (let k = 0; k < 4; k++) { const lx = x0 + 4 + k * 18.6; g.fillStyle = '#fff6c8'; g.fillRect(lx, bot - 2, 3, 1); g.fillStyle = 'rgba(255,240,190,.35)'; g.fillRect(lx - 1, bot - 9, 5, 7); } // luces en la base
      // escalinata
      const by = Y0 + H;
      for (let k = 0; k < 3; k++) { g.fillStyle = k % 2 ? '#d8d6d0' : '#eceae4'; g.fillRect(x0 - 4 - k * 3, by + k * 3, tw + 8 + k * 6, 3); }
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0 - 10, by + 9, tw + 20, 2);
    }
    // pórtico principal hacia el oeste (plaza): techo a dos aguas visto desde arriba, frontón al oeste,
    // columnas dobles asomando, cara sur con dos pisos de columnas; escudo y escarapela
    {
      const ph = 84, pw = 40, px = X0 - pw + 6, y = Y0 + d.p1 * S - ph / 2;
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(px + 4, y + 6, pw, ph);
      g.fillStyle = C.TEJA; g.fillRect(px, y, pw, ph / 2); g.fillStyle = C.TEJA_D; g.fillRect(px, y + ph / 2, pw, ph / 2);
      for (let k = 0; k < pw; k += 4) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(px + k, y, 1, ph); }
      g.fillStyle = '#d07056'; g.fillRect(px, y + ph / 2 - 1, pw, 2);
      g.fillStyle = C.CREAM; g.fillRect(px, y, 4, ph); g.fillRect(px, y, pw, 2); g.fillRect(px, y + ph - 2, pw, 2);
      g.fillStyle = C.CREAM_D; g.fillRect(px, y + ph / 2 - 1, 4, 2);
      for (let k = 6; k < ph - 4; k += 12) { g.fillStyle = '#fff3d2'; g.fillRect(px - 4, y + k, 4, 4); g.fillRect(px - 4, y + k + 5, 4, 4); g.fillStyle = C.CREAM_D; g.fillRect(px - 4, y + k, 1, 9); }
      g.fillStyle = C.SAL_D; g.fillRect(px - 4, y + ph, pw + 4, 26);
      for (let k = 0; k < pw; k += 7) { g.fillStyle = C.CREAM; g.fillRect(px - 2 + k, y + ph, 3, 26); g.fillStyle = C.CREAM_D; g.fillRect(px + k, y + ph, 1, 26); }
      g.fillStyle = C.CREAM; g.fillRect(px - 4, y + ph + 12, pw + 4, 2); g.fillRect(px - 4, y + ph, pw + 4, 2);
      const ex = px + 2, ey = y + ph / 2;
      g.fillStyle = '#f7f3e8'; g.beginPath(); g.arc(ex, ey, 4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c8322a'; g.fillRect(ex - 1, ey - 2, 2, 4);
      const rx = px - 9, ry = y + ph / 2;
      g.fillStyle = '#c8322a'; g.beginPath(); g.arc(rx, ry, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(rx, ry, 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1f4fa8'; g.beginPath(); g.arc(rx, ry, 2, 0, Math.PI * 2); g.fill();
    }
    // cantero redondo con flores alrededor del busto (frente a la entrada)
    {
      const bx = (d.bx - 5) * S + 8, by = (d.y + d.p1) * S + 8;
      g.fillStyle = '#d6d2c8'; g.beginPath(); g.arc(bx, by, 17, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#4f8a3a'; g.beginPath(); g.arc(bx, by, 15, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; g.fillStyle = k % 3 ? '#e8493a' : '#f0c43a'; g.fillRect(Math.round(bx + Math.cos(a) * 11) - 1, Math.round(by + Math.sin(a) * 11) - 1, 2, 2); }
    }
  },
};
VR.decorTop = {
  guirnaldas(d) { // luces colgadas en zigzag sobre las 4 calles que rodean la Plaza de los Héroes
    const S = VR.TILE, X0 = d.x * S, X1 = (d.x + d.w) * S, Y0 = d.y * S, Y1 = (d.y + d.h) * S;
    return [{ sy: Y1 + 400, draw(g) {
      const tw = performance.now() / 500, V = d.dir === 'v';
      // 'v': cruzan una calle este-oeste (de norte a sur); si no, una calle norte-sur (de oeste a este)
      for (let u = V ? X0 : Y0; u < (V ? X1 : Y1); u += 48) {
        const pt = (k) => { const f = k / 12, sag = Math.sin(f * Math.PI) * 4; return V ? [u + 24 * f + sag, Y0 + (Y1 - Y0) * f] : [X0 + (X1 - X0) * f, u + 24 * f + sag]; };
        g.strokeStyle = 'rgba(30,30,30,.55)'; g.lineWidth = 1; g.beginPath();
        for (let k = 0; k <= 12; k++) { const [x, y] = pt(k); k ? g.lineTo(x, y + 1) : g.moveTo(x, y + 1); }
        g.stroke();
        for (let k = 0; k <= 12; k++) {
          const [x, yy] = pt(k), y = u;
          const on = 0.75 + 0.25 * Math.sin(tw + k * 1.7 + y);
          g.fillStyle = `rgba(255,236,170,${0.25 * on})`; g.fillRect(Math.round(x) - 2, Math.round(yy) - 1, 5, 5);
          g.fillStyle = '#fff7d8'; g.fillRect(Math.round(x), Math.round(yy) + 1, 2, 2);
          if (VR.night && k % 4 === 2) VR.night.add(x, yy + 6, 24, '255,224,150', 0.4);
        }
      }
    } }];
  },
  cuartel(d) { // galpón de chapa a dos aguas sobre columnas de reticulado; el techo se ve levantado (vista 3/4)
    const S = VR.TILE, X0 = (d.x + 3) * S - 4, X1 = (d.x + d.w) * S + 4, Y0 = d.y * S - 6, Y1 = (d.y + d.h) * S, L = 26, mid = (X0 + X1) / 2;
    const col = (g, x) => { g.fillStyle = '#1a1a1e'; g.fillRect(x - 2, Y1 - L, 4, L); g.fillStyle = '#6a6a72'; g.fillRect(x - 1.5, Y1 - L, 0.75, L); g.fillRect(x + 0.75, Y1 - L, 0.75, L);
      g.fillStyle = '#8a8a92'; for (let y = Y1 - L; y < Y1; y += 3) { g.fillRect(x - 1.5, y, 3, 0.5); g.fillRect(x - 1.25, y + 1.5, 0.5, 0.5); } };
    return [{ sy: Y1 + 2, draw(g) {
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(X0 + 6, Y0 - L + 8, X1 - X0, Y1 - Y0); // sombra del techo en el piso
      for (const x of [X0 + 3, mid, X1 - 3]) col(g, x);
      // techo: dos aguas con la cumbrera de norte a sur; chapa acanalada (líneas de este a oeste)
      const top = Y0 - L, bot = Y1 - L;
      g.fillStyle = '#1a1a1e'; g.fillRect(X0 - 1, top - 1, X1 - X0 + 2, bot - top + 2);
      g.fillStyle = '#8a8478'; g.fillRect(X0, top, mid - X0, bot - top); g.fillStyle = '#6a665e'; g.fillRect(mid, top, X1 - mid, bot - top);
      for (let y = top + 1; y < bot; y += 2) { g.fillStyle = '#a49e90'; g.fillRect(X0, y, mid - X0, 0.5); g.fillStyle = '#7e7a70'; g.fillRect(mid, y, X1 - mid, 0.5); }
      for (let i = 0; i < 6; i++) { const h = VR.hash(i, d.x, 41); if (h < 0.6) { g.fillStyle = 'rgba(140,70,30,.35)'; g.fillRect(X0 + h * (X1 - X0 - 10), top + VR.hash(i, d.y, 43) * (bot - top - 6), 6, 3); } } // óxido
      g.fillStyle = '#b8b2a4'; g.fillRect(mid - 1, top, 2, bot - top); g.fillStyle = '#d0cabc'; g.fillRect(mid - 1, top, 0.75, bot - top); // cumbrera
      // frente: viga de reticulado (zigzag) debajo del alero
      g.fillStyle = '#1a1a1e'; g.fillRect(X0, bot, X1 - X0, 5); g.fillStyle = '#5a5a62'; g.fillRect(X0, bot + 0.5, X1 - X0, 1); g.fillRect(X0, bot + 3.5, X1 - X0, 1);
      g.strokeStyle = '#7a7a84'; g.lineWidth = 0.6; g.beginPath(); for (let x = X0, k = 0; x <= X1; x += 3, k++) { const y = k % 2 ? bot + 1 : bot + 4; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      g.fillStyle = '#fff6d0'; for (const x of [X0 + 24, mid + 24]) g.fillRect(x, bot + 5.5, 2, 1.5); // lamparitas
    } }];
  },
  pilastras(d) { // arbustos en macetas junto a las vidrieras y un cartel colgante azul (sin texto)
    const S = VR.TILE, X0 = d.x * S, X1 = (d.x + d.w) * S, Y = (d.y + 1) * S;
    const parts = [];
    for (let x = X0 + 14; x < X1 - 8; x += 22) parts.push({ sy: Y - 1, draw(g) { VR.drawPot(g, x, Y - 9, 0, 0.3); } });
    if (d.n === 3) { const px = X0 + (X1 - X0) * 0.4; parts.push({ sy: Y + 1, draw(g) {
      g.fillStyle = '#2a2a30'; g.fillRect(px, Y - 26, 1, 26); g.fillRect(px - 6, Y - 26, 7, 1);
      g.fillStyle = '#1a1a1e'; g.fillRect(px - 7, Y - 25, 7, 16); g.fillStyle = '#2a4aa8'; g.fillRect(px - 6.5, Y - 24.5, 6, 15); g.fillStyle = '#e8c040'; g.fillRect(px - 5.5, Y - 21, 4, 1); g.fillRect(px - 5.5, Y - 15, 4, 1); g.fillStyle = '#5a7ad8'; g.fillRect(px - 6.5, Y - 24.5, 6, 1.5);
    } }); }
    return parts;
  },
  topiarios(d) { // frente a la financiera: arbolitos podados en bola, en macetas negras, y tachos de basura negros
    const S = VR.TILE, X0 = d.x * S, X1 = (d.x + d.w) * S, Y = (d.y + 1) * S - 2, parts = [];
    let k = 0; const n = Math.min(7, Math.floor((X1 - X0 - 12) / 24)), start = X0 + 10;
    for (let x = start; k < n; x += 24, k++) {
      const tree = k % 2 === 0, cx = x;
      parts.push({ sy: Y, draw(g) {
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(cx + 1.5, Y + 0.5, 4, 1.5, 0, 0, 7); g.fill();
        if (tree) {
          g.fillStyle = '#1a1a1e'; g.fillRect(cx - 3, Y - 6, 6, 6.5); g.fillStyle = '#34343c'; g.fillRect(cx - 3, Y - 6, 6, 1.5); // maceta
          g.fillStyle = '#5a3a20'; g.fillRect(cx - 0.5, Y - 13, 1, 7);                                                        // tronquito
          for (const [r, col, ox, oy] of [[5, '#1f4a22', 0.5, 0.5], [4.5, '#2f6a30', 0, 0], [2.5, '#4f9a48', -1.3, -1.3], [1, '#7cc070', -2, -2]]) { g.fillStyle = col; g.beginPath(); g.arc(cx + ox, Y - 17 + oy, r, 0, 7); g.fill(); }
        } else { // tacho de basura
          g.fillStyle = '#121216'; g.fillRect(cx - 2.5, Y - 9, 5, 9.5); g.fillStyle = '#2c2c34'; g.fillRect(cx - 2.5, Y - 9, 5, 1.5); g.fillStyle = '#3c3c46'; g.fillRect(cx - 2, Y - 7, 1, 6);
        }
      } });
    }
    return parts;
  },
  banco(d) { // banco de plaza (05/11/2026): tablas de madera marrón, hierro negro; la gente sentada la pone VR.Peds
    const S = VR.TILE, X = d.x * S, Y = d.y * S;
    const sl = ['#5a3418', '#7a4a24', '#a06a3a'], iron = '#18181c'; // madera marrón (foto 360 de la plaza)
    if (d.fa !== undefined) { // banco girado (camino diagonal y esquinas): se dibuja como el de frente, rotado
      return [{ sy: d.py + 3, draw(g) {
        g.save(); g.translate(d.px, d.py); g.rotate(d.fa - Math.PI / 2);
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(-7, -1, 16, 9);
        g.fillStyle = iron; g.fillRect(-8.5, -8.5, 17, 15);
        for (const px of [-7, 5.5]) { g.fillStyle = '#3a3a42'; g.fillRect(px, -8, 1.5, 14); }
        for (let i = 0; i < 2; i++) { const yy = -8 + i * 2.6; g.fillStyle = sl[0]; g.fillRect(-8, yy, 16, 2.2); g.fillStyle = sl[1]; g.fillRect(-8, yy, 16, 1.2); g.fillStyle = sl[2]; g.fillRect(-8, yy, 16, 0.5); }
        for (let i = 0; i < 3; i++) { const yy = -2.5 + i * 2.6; g.fillStyle = sl[0]; g.fillRect(-8, yy, 16, 2.2); g.fillStyle = sl[1]; g.fillRect(-8, yy, 16, 1.4); g.fillStyle = sl[2]; g.fillRect(-8, yy, 16, 0.5); }
        g.restore();
      } }];
    }
    return [{ sy: Y + 3, draw(g) {
      if (d.f === 's') { // respaldo al norte, la gente mira a la cámara
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(X + 1, Y + 6, 16, 9);
        g.fillStyle = iron; g.fillRect(X - 0.5, Y - 4.5, 17, 18.5);                             // contorno
        for (const px of [X + 1, X + 13.5]) { g.fillStyle = '#3a3a42'; g.fillRect(px, Y - 4, 1.5, 17.5); }
        for (let i = 0; i < 3; i++) { const y = Y - 4 + i * 2.6; g.fillStyle = sl[0]; g.fillRect(X, y, 16, 2.2); g.fillStyle = sl[1]; g.fillRect(X, y, 16, 1.2); g.fillStyle = sl[2]; g.fillRect(X, y, 16, 0.5); } // respaldo
        for (let i = 0; i < 3; i++) { const y = Y + 5 + i * 2.6; g.fillStyle = sl[0]; g.fillRect(X, y, 16, 2.2); g.fillStyle = sl[1]; g.fillRect(X, y, 16, 1.4); g.fillStyle = sl[2]; g.fillRect(X, y, 16, 0.5); } // asiento
        g.fillStyle = '#3a3a42'; g.fillRect(X + 1, Y + 12.8, 1.5, 1.2); g.fillRect(X + 13.5, Y + 12.8, 1.5, 1.2);
      } else { // a lo largo de un camino norte-sur: respaldo al oeste ('e') o al este ('o')
        const L = d.f === 'e', bx = L ? X + 0.5 : X + 12.5, sx = L ? X + 4 : X + 4.5;
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(X + 3, Y + 1, 12, 17);
        g.fillStyle = iron; g.fillRect(Math.min(bx, sx) - 0.5, Y - 3.5, 12.5, 19);                 // contorno
        for (let i = 0; i < 3; i++) { const x = sx + i * 2.4; g.fillStyle = sl[0]; g.fillRect(x, Y - 3, 2.1, 18); g.fillStyle = sl[1]; g.fillRect(x, Y - 3, 1.3, 18); g.fillStyle = sl[2]; g.fillRect(x, Y - 3, 0.5, 18); } // asiento
        g.fillStyle = sl[0]; g.fillRect(bx, Y - 3, 3, 18); g.fillStyle = sl[1]; g.fillRect(bx, Y - 3, 1.6, 18); g.fillStyle = sl[2]; g.fillRect(bx, Y - 3, 0.5, 18); // respaldo
        g.fillStyle = '#3a3a42'; for (const yy of [Y - 2, Y + 12.5]) g.fillRect(Math.min(bx, sx), yy, 11, 1.2);
      }
    } }];
  },
  tienda(d) { // maniquíes en la vereda a los costados de la entrada y un perchero con ropa
    const S = VR.TILE, X = d.x * S + 2, W = d.w * S - 4, mid = X + (W >> 1), fy = (d.y + 1) * S - 3;
    const mani = (g, x, c1, c2) => {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 3, fy - 1, 8, 3);
      g.fillStyle = '#2a2a30'; g.fillRect(x - 2, fy, 6, 1); g.fillRect(x, fy - 6, 2, 6);  // base y pie
      g.fillStyle = '#1a1a1e'; g.fillRect(x - 3, fy - 17, 8, 11);                        // contorno del torso
      g.fillStyle = c2; g.fillRect(x - 2, fy - 10, 6, 4);                                 // pantalón/pollera
      g.fillStyle = c1; g.fillRect(x - 2, fy - 16, 6, 7); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x - 2, fy - 16, 2, 7);
      g.fillStyle = '#1a1a1e'; g.fillRect(x - 1, fy - 22, 4, 5); g.fillStyle = '#ece8e0'; g.fillRect(x, fy - 21, 2, 4); // cabeza
    };
    return [{ sy: fy, draw(g) {
      mani(g, mid - 22, '#e86aa0', '#2c4a7b'); mani(g, mid + 20, '#3b9a5a', '#2c2c34');
      if (W > 90) { // perchero con remeras de colores
        const px = X + 8; g.fillStyle = '#1a1a1e'; g.fillRect(px - 1, fy - 18, 26, 2); g.fillRect(px, fy - 18, 1, 18); g.fillRect(px + 23, fy - 18, 1, 18);
        ['#c8322a', '#f2efe6', '#2e6fc8', '#e8b830', '#7a4ab0'].forEach((c, i) => { g.fillStyle = '#1a1a1e'; g.fillRect(px + 2 + i * 4, fy - 17, 5, 9); g.fillStyle = c; g.fillRect(px + 3 + i * 4, fy - 16, 3, 7); });
      }
    } }];
  },
  banderas(d) { // fila de mástiles con banderas paraguayas al norte del anfiteatro
    const S = VR.TILE, X0 = d.x * S + 6, X1 = (d.x + d.w) * S - 4, Y = d.y * S + 10, t = performance.now() / 260;
    return [{ sy: Y + 2, draw(g) {
      for (let px = X0, n = 0; px <= X1; px += 15, n++) {
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px - 1, Y, 4, 2);
        g.fillStyle = '#5a5852'; g.fillRect(px, Y - 46, 2, 46); g.fillStyle = '#e8e6e0'; g.fillRect(px, Y - 46, 1, 46);
        for (let i = 0; i < 12; i++) {
          const o = Math.round(Math.sin(t + i * 0.5 + n) * 1.2), x = px + 2 + i;
          g.fillStyle = '#d0302a'; g.fillRect(x, Y - 46 + o, 1, 3); g.fillStyle = '#ffffff'; g.fillRect(x, Y - 43 + o, 1, 3); g.fillStyle = '#2050a8'; g.fillRect(x, Y - 40 + o, 1, 3);
        }
      }
    } }];
  },
  mastiles(d) { // dos mástiles (bandera paraguaya y una blanca, como en la foto) y dos leones
    const S = VR.TILE, X = d.x * S, Y = d.y * S, t = performance.now() / 260;
    const flag = (g, fx, fy, cols) => {
      for (let i = 0; i < 16; i++) {
        const o = Math.round(Math.sin(t + i * 0.45) * 1.5), x = fx + 2 + i;
        cols.forEach((c, k) => { g.fillStyle = c; g.fillRect(x, fy + o + k * (12 / cols.length), 1, 12 / cols.length); });
      }
    };
    return [{ sy: Y + 30, draw(g) {
      for (const [px, cols] of [[X + 20, ['#d0302a', '#ffffff', '#2050a8']], [X + 28, ['#ffffff']]]) {
        g.fillStyle = '#1f1d1a'; g.fillRect(px - 1, Y - 52, 3, 62); g.fillStyle = '#dcd8d0'; g.fillRect(px, Y - 52, 1, 62);
        flag(g, px, Y - 52, cols);
      }
      for (const px of [X + 4, X + 36]) { // leones de bronce sobre los pedestales
        g.fillStyle = '#1f1d1a'; g.fillRect(px - 1, Y + 1, 10, 14);
        g.fillStyle = '#7a6a48'; g.fillRect(px, Y + 6, 8, 8); g.fillStyle = '#9a8a60'; g.fillRect(px + 1, Y + 2, 6, 6); g.fillStyle = '#5a4c32'; g.fillRect(px + 2, Y + 4, 1, 1); g.fillRect(px + 5, Y + 4, 1, 1);
      }
    } }];
  },
  muni(d) { // bandera en el frontón principal (flamea) y busto frente a la entrada
    const S = VR.TILE, X0 = d.bx * S, py = (d.y + d.p1) * S;
    const fx = X0 - 34, fy = py - 26;
    return [{ sy: py + 30, draw(g) {
      g.fillStyle = '#1f1d1a'; g.fillRect(fx - 1, fy - 46, 3, 48); g.fillStyle = '#d8d4cc'; g.fillRect(fx, fy - 46, 1, 48);
      const t = performance.now() / 260;
      for (let i = 0; i < 18; i++) {
        const o = Math.round(Math.sin(t + i * 0.45) * 1.5), x = fx - 2 - i; // flamea hacia el oeste
        g.fillStyle = '#d0302a'; g.fillRect(x, fy - 46 + o, 1, 4);
        g.fillStyle = '#ffffff'; g.fillRect(x, fy - 42 + o, 1, 4);
        g.fillStyle = '#2050a8'; g.fillRect(x, fy - 38 + o, 1, 4);
      }
    } }, { sy: py + 10, draw(g) {
      const X = (d.bx - 5) * S, Y = py;
      g.fillStyle = '#1f1d1a'; g.fillRect(X + 1, Y - 13, 14, 26);
      g.fillStyle = '#eeece6'; g.fillRect(X + 2, Y - 4, 12, 16); g.fillStyle = '#ffffff'; g.fillRect(X + 2, Y - 4, 4, 16);
      g.fillStyle = '#c9c5bc'; g.fillRect(X + 2, Y + 9, 12, 3);
      g.fillStyle = '#7d7a74'; g.fillRect(X + 4, Y - 12, 8, 8); g.fillStyle = '#a19d95'; g.fillRect(X + 5, Y - 12, 3, 6);
      g.fillStyle = '#5f5c56'; g.fillRect(X + 3, Y - 6, 10, 3);
    } }];
  },
  cancha(d) { // arcos (uno en cada punta)
    const S = VR.TILE, X = d.x * S, W = d.w * S, Y = d.y * S, H = d.h * S, cx = X + (W >> 1);
    return [Y + 4, Y + H - 4].map((gy) => ({ sy: gy, draw(g) {
      g.fillStyle = '#1f1d1a'; g.fillRect(cx - 10, gy - 11, 20, 4); g.fillRect(cx - 10, gy - 11, 4, 12); g.fillRect(cx + 6, gy - 11, 4, 12);
      g.fillStyle = '#f4f2ec'; g.fillRect(cx - 9, gy - 10, 18, 2); g.fillRect(cx - 9, gy - 10, 2, 10); g.fillRect(cx + 7, gy - 10, 2, 10);
      g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = -7; i < 7; i += 2) g.fillRect(cx + i, gy - 8, 1, 8);
    } }));
  },
  monumento(d) { // pórtico blanco de dos columnas con friso y medallones, sobre escalones, y leones dorados (Street View)
    const S = VR.TILE, X = d.x * S + 16, Y = d.y * S + 24;
    const lion = (g, x, y) => {
      g.fillStyle = '#1f1d1a'; g.fillRect(x - 4.5, y - 3.5, 9, 5); g.fillStyle = '#2f7a3a'; g.fillRect(x - 4, y - 3, 8, 4); g.fillStyle = '#4a9a54'; g.fillRect(x - 4, y - 3, 8, 1); // pedestal verde
      g.fillStyle = '#5a4418'; g.fillRect(x - 3, y - 9.5, 6, 6.5); g.fillStyle = '#c8a040'; g.fillRect(x - 2.5, y - 9, 5, 6); g.fillStyle = '#e8c860'; g.fillRect(x - 2.5, y - 9, 2, 3); // león sentado
      g.fillStyle = '#a07a2a'; g.fillRect(x - 2, y - 11, 4, 2.5); g.fillStyle = '#e0b850'; g.fillRect(x - 1.5, y - 10.5, 1.5, 1.5);
    };
    return [{ sy: Y + 2, draw(g) {
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(X - 13, Y - 2, 30, 5);
      g.fillStyle = '#8e3f2b'; g.fillRect(X - 15, Y - 4, 30, 5); g.fillStyle = '#b5573c'; g.fillRect(X - 15, Y - 4, 30, 1.5);   // escalón de ladrillo
      g.fillStyle = '#2f7a3a'; g.fillRect(X - 13, Y - 7, 26, 3.5); g.fillStyle = '#4a9a54'; g.fillRect(X - 13, Y - 7, 26, 1);    // escalón verde
      g.fillStyle = '#1f1d1a'; g.fillRect(X - 12.5, Y - 40, 25, 34);
      for (const cx of [X - 11, X + 5]) { g.fillStyle = '#e8e6de'; g.fillRect(cx, Y - 34, 6, 27); g.fillStyle = '#ffffff'; g.fillRect(cx, Y - 34, 2, 27); g.fillStyle = '#b8b4aa'; g.fillRect(cx + 5, Y - 34, 1, 27); } // columnas
      g.fillStyle = 'rgba(40,36,30,.35)'; g.fillRect(X - 5, Y - 34, 10, 27); g.fillStyle = '#7a6a4a'; g.fillRect(X - 3, Y - 16, 6, 9); g.fillStyle = '#9a8a62'; g.fillRect(X - 3, Y - 16, 6, 1.5); // placa al medio
      g.fillStyle = '#e8e6de'; g.fillRect(X - 12, Y - 39.5, 24, 6); g.fillStyle = '#ffffff'; g.fillRect(X - 12, Y - 39.5, 24, 1.5);   // friso
      g.fillStyle = '#5a5246'; g.beginPath(); g.arc(X - 6, Y - 36.5, 1.6, 0, 7); g.arc(X + 6, Y - 36.5, 1.6, 0, 7); g.fill(); g.fillRect(X - 3, Y - 37.5, 6, 2); // medallones y placa
    } }, { sy: Y + 4, draw(g) { lion(g, X - 20, Y + 2); lion(g, X + 20, Y + 2); } }];
  },
  juegos(d) { // tobogán y hamacas amarillas
    const S = VR.TILE, X = d.x * S, Y = d.y * S, W = d.w * S;
    return [{ sy: Y + 30, draw(g) {
      const yl = '#e8b820', ylD = '#a8800c', blk = '#1f1d1a';
      // hamacas: pórtico amarillo con dos asientos
      const hx = X + 6, hy = Y + 26;
      g.fillStyle = blk; g.fillRect(hx - 1, hy - 21, 22, 3); g.fillStyle = yl; g.fillRect(hx - 0.5, hy - 20.5, 21, 2);
      for (const px of [hx, hx + 18]) { g.fillStyle = blk; g.fillRect(px - 0.5, hy - 20, 3, 20); g.fillStyle = yl; g.fillRect(px, hy - 19.5, 2, 19.5); g.fillStyle = ylD; g.fillRect(px + 1.5, hy - 19.5, 0.5, 19.5); }
      for (const sx of [hx + 5, hx + 12]) { g.fillStyle = '#5a5a60'; g.fillRect(sx, hy - 18.5, 0.5, 13); g.fillRect(sx + 3.5, hy - 18.5, 0.5, 13); g.fillStyle = blk; g.fillRect(sx - 0.5, hy - 6, 5, 2.5); g.fillStyle = '#d0282a'; g.fillRect(sx, hy - 5.5, 4, 1.5); }
      // tobogán: escalera y rampa
      const tx = X + W - 18, ty = Y + 34;
      g.fillStyle = blk; g.fillRect(tx - 0.5, ty - 24, 6, 24); g.fillStyle = '#9a9aa2'; for (let k = 0; k < 6; k++) g.fillRect(tx, ty - 22 + k * 4, 5, 1); g.fillStyle = '#5a5a60'; g.fillRect(tx, ty - 24, 1, 24); g.fillRect(tx + 4, ty - 24, 1, 24);
      g.fillStyle = blk; g.fillRect(tx - 1, ty - 27, 8, 4); g.fillStyle = yl; g.fillRect(tx - 0.5, ty - 26.5, 7, 3);
      g.fillStyle = blk; g.beginPath(); g.moveTo(tx + 6, ty - 26); g.lineTo(tx + 16, ty - 2); g.lineTo(tx + 16, ty + 1); g.lineTo(tx + 10, ty + 1); g.lineTo(tx + 2, ty - 24); g.closePath(); g.fill();
      g.fillStyle = yl; g.beginPath(); g.moveTo(tx + 6, ty - 25); g.lineTo(tx + 15, ty - 2); g.lineTo(tx + 15, ty); g.lineTo(tx + 10.5, ty); g.lineTo(tx + 3, ty - 23.5); g.closePath(); g.fill();
      g.fillStyle = '#f8dc60'; g.beginPath(); g.moveTo(tx + 5, ty - 24.5); g.lineTo(tx + 6.5, ty - 24.5); g.lineTo(tx + 15, ty - 1); g.lineTo(tx + 13.5, ty - 1); g.closePath(); g.fill();
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
  w.sendas = (meta.decals || []).filter((d) => d.kind === 'senda');
  { const c = (meta.decals || []).find((d) => d.kind === 'cuartel'); if (c) w.firehouse = { x: (c.x + 6) * VR.TILE, y: (c.ry + 1) * VR.TILE + 2, d: c }; }
  w.inSenda = (tx, ty) => { for (const d of w.sendas) { const ux = d.bx - d.ax, uy = d.by - d.ay, L = Math.hypot(ux, uy), px = tx + 0.5 - d.ax, py = ty + 0.5 - d.ay, t = (px * ux + py * uy) / (L * L);
    if (t > -0.02 && t < 1.02 && Math.abs(px * uy - py * ux) / L < d.hw + 0.9) return true; } return false; };
  w.plazaSet = new Set(); (meta.areas || []).forEach((n, i) => { if (/plaza/i.test(n)) w.plazaSet.add(i + 1); });
  w.calSet = new Set(w.plazaSet); (meta.areas || []).forEach((n, i) => { if (/parque manuel ortiz/i.test(n)) w.calSet.add(i + 1); }); // troncos pintados con cal (plazas y parque Ortiz Guerrero)
  { const t = (meta.decals || []).find((d) => d.kind === 'tienda'), T = VR.T; // taller (05/11/2026): cerca del Centro, misma vereda que la tienda, hacia el oeste
    if (t) for (let x = t.x - 6; x > t.x - 120; x--) { let ok = true; for (let k = 0; k < 7 && ok; k++) ok = w.get(x - k, t.y) === T.SIDEWALK && w.get(x - k, t.y + 1) === T.BUILDING; if (ok) { meta.decals.push({ kind: 'taller', x: x - 6, y: t.y, w: 7, h: 1 }); break; } } }
  w.streets = meta.streets; w.areas = meta.areas; w.barrios = meta.barrios || []; w.barrioLabels = meta.barrioLabels || []; w.labels = meta.labels; w.decals = meta.decals;
  w.spawn = meta.spawn; w.spawnName = 'la Plaza de los Héroes'; w.credit = meta.credit; w.id = 'villarrica-' + meta.w + 'x' + meta.h;
  w.roads = meta.roads || null; w.special = meta.special || {};
  w.diag = VR.findDiagonals(w.roads);
  w.buildIndex();
  return w;
};
