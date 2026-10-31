// Mundo: grilla de tiles, edificios, árboles y decorados; se dibuja por bloques (chunks) pre-renderizados.
'use strict';
VR.World = class {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.tiles = new Uint8Array(w * h);
    this.line = new Uint8Array(w * h); // 1 = línea central E-O, 2 = N-S, 3 = cebra de barras verticales, 4 = cebra horizontal
    this.buildings = []; this.trees = []; this.decals = []; this.labels = [];
    this.spawn = { x: w * 8, y: h * 8 };
    this.CH = 32; // tiles por chunk (512 px)
    this.cache = new Map(); this.MAXCACHE = 48;
    this.index = null;
  }
  get(tx, ty) { return tx < 0 || ty < 0 || tx >= this.w || ty >= this.h ? -1 : this.tiles[ty * this.w + tx]; }
  set(tx, ty, t) { if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.tiles[ty * this.w + tx] = t; }
  solid(tx, ty) { const t = this.get(tx, ty); return t < 0 || VR.SOLID[t] === 1; }
  // ¿La caja [x0,x1)×[y0,y1) en píxeles toca algo sólido?
  hits(x0, y0, x1, y1) {
    const S = VR.TILE;
    for (let ty = Math.floor(y0 / S); ty <= Math.floor((y1 - 0.001) / S); ty++)
      for (let tx = Math.floor(x0 / S); tx <= Math.floor((x1 - 0.001) / S); tx++)
        if (this.solid(tx, ty)) return true;
    return false;
  }
  addBuilding(b) { this.buildings.push(b); for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) this.set(x, y, VR.T.BUILDING); }
  addTree(tx, ty, r, pal) { this.trees.push({ x: tx, y: ty, r, pal }); this.set(tx, ty, VR.T.TREE); }

  // Índice espacial: qué edificios/árboles tocan cada chunk (con margen para sombras y copas).
  buildIndex() {
    const CH = this.CH * VR.TILE, cw = Math.ceil(this.w / this.CH), chh = Math.ceil(this.h / this.CH);
    this.index = Array.from({ length: cw * chh }, () => ({ b: [], t: [], d: [] }));
    const add = (list, item, px0, py0, px1, py1) => {
      for (let cy = Math.max(0, Math.floor(py0 / CH)); cy <= Math.min(chh - 1, Math.floor(py1 / CH)); cy++)
        for (let cx = Math.max(0, Math.floor(px0 / CH)); cx <= Math.min(cw - 1, Math.floor(px1 / CH)); cx++)
          this.index[cy * cw + cx][list].push(item);
    };
    const S = VR.TILE;
    for (const b of this.buildings) add('b', b, b.x * S, b.y * S, (b.x + b.w) * S + 8, (b.y + b.h) * S + 8);
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

  renderChunk(cx, cy) {
    const S = VR.TILE, N = this.CH, PX = N * S, ox = cx * PX, oy = cy * PX;
    const ground = VR.canvas(PX, PX), g = ground.getContext('2d');
    const idx = this.index[cy * this.cw + cx];
    g.save(); g.translate(-ox, -oy);
    // 1) piso
    for (let ty = cy * N; ty < Math.min(this.h, cy * N + N); ty++) for (let tx = cx * N; tx < Math.min(this.w, cx * N + N); tx++) {
      let t = this.tiles[ty * this.w + tx];
      if (VR.GROUND_OF[t] !== undefined) t = VR.GROUND_OF[t];
      VR.tileset.draw(g, t, (VR.hash(tx, ty, 99) * 4) | 0, tx * S, ty * S);
    }
    // 2) decorados de piso (canchas, etc.)
    for (const d of idx.d) VR.decor[d.kind] && VR.decor[d.kind](g, d);
    // 3) cordones, líneas y cebras (autotiling según vecinos)
    for (let ty = cy * N; ty < Math.min(this.h, cy * N + N); ty++) for (let tx = cx * N; tx < Math.min(this.w, cx * N + N); tx++) {
      const t = this.tiles[ty * this.w + tx], x = tx * S, y = ty * S;
      if (t === VR.T.SIDEWALK || t === VR.T.BUILDING) {
        const R = VR.T.ROAD;
        if (this.get(tx, ty - 1) === R) { g.fillStyle = '#e4ded0'; g.fillRect(x, y, S, 1); g.fillStyle = '#7d776c'; g.fillRect(x, y + 1, S, 1); }
        if (this.get(tx, ty + 1) === R) { g.fillStyle = '#e4ded0'; g.fillRect(x, y + S - 2, S, 1); g.fillStyle = '#3c3c44'; g.fillRect(x, y + S - 1, S, 1); }
        if (this.get(tx - 1, ty) === R) { g.fillStyle = '#e4ded0'; g.fillRect(x, y, 1, S); g.fillStyle = '#9d978a'; g.fillRect(x + 1, y, 1, S); }
        if (this.get(tx + 1, ty) === R) { g.fillStyle = '#e4ded0'; g.fillRect(x + S - 1, y, 1, S); g.fillStyle = '#9d978a'; g.fillRect(x + S - 2, y, 1, S); }
      }
      const l = this.line[ty * this.w + tx];
      if (!l) continue;
      if (l === 1) { g.fillStyle = '#e2bf45'; g.fillRect(x + 2, y + 7, 9, 2); }
      else if (l === 2) { g.fillStyle = '#e2bf45'; g.fillRect(x + 7, y + 2, 2, 9); }
      else if (l === 3) { g.fillStyle = '#e8e6e0'; for (let i = 1; i < S; i += 5) g.fillRect(x + i, y + 1, 3, S - 2); }
      else if (l === 4) { g.fillStyle = '#e8e6e0'; for (let i = 1; i < S; i += 5) g.fillRect(x + 1, y + i, S - 2, 3); }
    }
    // 4) sombras de árboles y edificios (sol del noroeste)
    g.fillStyle = 'rgba(10,20,10,.28)';
    for (const t of idx.t) { g.beginPath(); g.ellipse(t.x * S + 11, t.y * S + 4, t.r, t.r * 0.7, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.26)';
    for (const b of idx.b) { g.fillRect((b.x + b.w) * S, b.y * S + 5, 5, b.h * S - 2); g.fillRect(b.x * S + 5, (b.y + b.h) * S, b.w * S, 3); }
    // 5) troncos y edificios
    for (const t of idx.t) { g.fillStyle = '#4b2f1b'; g.fillRect(t.x * S + 6, t.y * S + 2, 4, 10); g.fillStyle = '#6e4628'; g.fillRect(t.x * S + 6, t.y * S + 2, 2, 10); }
    for (const b of idx.b) VR.drawBuilding(g, b);
    g.restore();

    return { ground };
  }

  draw(ctx, camX, camY, sw, sh) {
    const PX = this.CH * VR.TILE;
    const c0 = Math.max(0, Math.floor(camX / PX)), c1 = Math.min(this.cw - 1, Math.floor((camX + sw) / PX));
    const r0 = Math.max(0, Math.floor(camY / PX)), r1 = Math.min(this.chh - 1, Math.floor((camY + sh) / PX));
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      ctx.drawImage(this.chunk(cx, cy).ground, cx * PX - camX, cy * PX - camY);
    }
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

// ---------- edificios: techo arriba, fachada sur abajo (vista 3/4) ----------
VR.drawBuilding = (g, b) => {
  const S = VR.TILE, X = b.x * S, Y = b.y * S, W = b.w * S, H = b.h * S;
  const fh = Math.min(H - 8, 6 + b.floors * 14), rh = H - fh;
  const shade = (c, k) => c.map((v) => VR.clamp(Math.round(v * k), 0, 255));
  const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  // techo
  g.fillStyle = css(b.roof); g.fillRect(X, Y, W, rh);
  if (b.roofType === 'teja') {
    g.fillStyle = css(shade(b.roof, 0.78));
    for (let yy = Y + 3; yy < Y + rh - 1; yy += 4) { g.fillRect(X, yy, W, 1); for (let xx = X + ((yy >> 2) & 1) * 3; xx < X + W; xx += 6) g.fillRect(xx, yy - 3, 1, 3); }
  } else if (b.roofType === 'chapa') {
    g.fillStyle = css(shade(b.roof, 0.82)); for (let xx = X + 2; xx < X + W; xx += 4) g.fillRect(xx, Y, 1, rh);
    g.fillStyle = css(shade(b.roof, 1.12)); for (let xx = X + 3; xx < X + W; xx += 4) g.fillRect(xx, Y, 1, rh);
  } else { // losa: tanque de agua y manchas
    g.fillStyle = css(shade(b.roof, 0.9)); g.fillRect(X + 2, Y + 2, W - 4, 1);
    if (W >= 32 && rh >= 18) {
      const tx = X + W - 14, ty = Y + 3;
      g.fillStyle = '#2d3d52'; g.fillRect(tx, ty, 9, 9); g.fillStyle = '#4f6a8a'; g.fillRect(tx + 1, ty + 1, 7, 3);
    }
  }
  g.fillStyle = css(shade(b.roof, 1.18)); g.fillRect(X, Y, W, 1); g.fillRect(X, Y, 1, rh);
  g.fillStyle = css(shade(b.roof, 0.62)); g.fillRect(X + W - 1, Y, 1, rh); g.fillRect(X, Y + rh - 2, W, 2);
  // fachada
  const fy = Y + rh;
  g.fillStyle = css(b.wall); g.fillRect(X, fy, W, fh);
  g.fillStyle = css(shade(b.wall, 0.8)); g.fillRect(X, fy, W, 2); g.fillRect(X + W - 1, fy, 1, fh);
  g.fillStyle = css(shade(b.wall, 0.55)); g.fillRect(X, fy + fh - 1, W, 1);
  const glass = '#2c4258', glassHi = '#7fa3c0';
  // pisos de arriba: ventanas
  for (let f = b.floors - 1; f >= 1; f--) {
    const wy = fy + 4 + (b.floors - 1 - f) * 14;
    for (let wx = X + 4; wx + 6 <= X + W - 3; wx += 11) {
      g.fillStyle = glass; g.fillRect(wx, wy, 6, 7); g.fillStyle = glassHi; g.fillRect(wx + 1, wy + 1, 1, 2);
      g.fillStyle = css(shade(b.wall, 1.15)); g.fillRect(wx - 1, wy + 7, 8, 1);
    }
  }
  // planta baja: local con toldo, o casa con puerta y ventanas
  const gy = fy + fh - 15;
  if (b.shop) {
    g.fillStyle = glass; g.fillRect(X + 3, gy + 4, W - 6, 10);
    g.fillStyle = glassHi; for (let wx = X + 5; wx < X + W - 5; wx += 9) g.fillRect(wx, gy + 5, 1, 3);
    g.fillStyle = css(shade(b.wall, 0.7)); for (let wx = X + 3 + 12; wx < X + W - 6; wx += 12) g.fillRect(wx, gy + 4, 1, 10);
    for (let wx = X + 1, i = 0; wx < X + W - 1; wx += 4, i++) { g.fillStyle = i & 1 ? '#f1ece0' : b.awning; g.fillRect(wx, gy, Math.min(4, X + W - 1 - wx), 4); }
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(X + 1, gy + 4, W - 2, 1);
  } else {
    const dx = X + ((W / 2) | 0) - 4;
    g.fillStyle = '#5a3720'; g.fillRect(dx, gy + 2, 8, 12); g.fillStyle = '#7a4d2c'; g.fillRect(dx + 1, gy + 3, 6, 11);
    g.fillStyle = '#e0c060'; g.fillRect(dx + 5, gy + 8, 1, 1);
    for (let wx = X + 4; wx + 6 <= X + W - 3; wx += 11) {
      if (wx + 6 > dx - 1 && wx < dx + 9) continue;
      g.fillStyle = glass; g.fillRect(wx, gy + 4, 6, 6); g.fillStyle = glassHi; g.fillRect(wx + 1, gy + 5, 1, 2);
      g.fillStyle = '#3b3b40'; for (let k = 0; k < 6; k += 2) g.fillRect(wx + k, gy + 4, 1, 6); // rejas
    }
  }
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
  monumento(g, d) { // base de piedra (la parte alta va en la capa de arriba)
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
