// Barrio de prueba (Etapa 0): 4×4 manzanas generadas, con plaza y canchita.
// En la Etapa 1 esto se reemplaza por el centro real de Villarrica armado desde OpenStreetMap.
'use strict';
VR.makeTestMap = () => {
  const T = VR.T, P = 24, BL = 4, N = BL * P + 5;
  const w = new VR.World(N, N), rnd = VR.rng(20061);
  const pick = (a) => a[(rnd() * a.length) | 0];
  // calles, veredas, líneas y cebras
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const mx = x % P, my = y % P, rx = mx < 5 || x >= BL * P, ry = my < 5 || y >= BL * P;
    const sx = mx === 5 || mx === 6 || mx >= P - 2, sy = my === 5 || my === 6 || my >= P - 2;
    let t = T.GRASS;
    if (rx || ry) t = T.ROAD; else if (sx || sy) t = T.SIDEWALK;
    w.set(x, y, t);
    const i = y * N + x;
    if (ry && !rx) w.line[i] = (mx === 5 || mx === 6 || mx === P - 1 || mx === P - 2) ? 4 : (my === 2 ? 1 : 0);
    if (rx && !ry) w.line[i] = (my === 5 || my === 6 || my === P - 1 || my === P - 2) ? 3 : (mx === 2 ? 2 : 0);
  }
  const WALLS = [[236, 222, 186], [230, 196, 140], [214, 164, 150], [176, 204, 214], [240, 236, 226], [190, 214, 170], [226, 182, 110], [200, 184, 214]];
  const ROOFS = { teja: [[178, 82, 52], [160, 70, 46], [190, 98, 60]], chapa: [[150, 156, 162], [124, 132, 140], [92, 110, 128]], losa: [[178, 172, 160], [160, 156, 148]] };
  const AWN = ['#c8402e', '#2e6fc8', '#2e9a5a', '#d08a1e'];
  const house = (x, y, bw, bh, facesStreet) => {
    if (rnd() < 0.12) { // baldío con un árbol
      if (bw >= 2 && bh >= 2) w.addTree(x + ((bw / 2) | 0), y + ((bh / 2) | 0), 9 + ((rnd() * 4) | 0), (rnd() * 3) | 0);
      return;
    }
    const roofType = pick(['teja', 'teja', 'chapa', 'losa']);
    let floors = rnd() < 0.72 ? 1 : rnd() < 0.85 ? 2 : 3;
    while (floors > 1 && 6 + floors * 14 > bh * 16 - 10) floors--;
    w.addBuilding({ x, y, w: bw, h: bh, floors, roofType, roof: pick(ROOFS[roofType]), wall: pick(WALLS), shop: facesStreet && rnd() < 0.35, awning: pick(AWN) });
  };
  // reparte un tramo en lotes de 3 a 6 tiles
  const split = (len) => { const out = []; let r = len; while (r > 0) { let s = 3 + ((rnd() * 4) | 0); if (r - s < 3) s = r; out.push(s); r -= s; } return out; };
  const block = (bx, by) => {
    const x0 = bx * P + 7, y0 = by * P + 7, S = 15;
    if (bx === 1 && by === 1) return plaza(x0, y0, S);
    if (bx === 2 && by === 2) return cancha(x0, y0, S);
    const dt = 5 + ((rnd() * 2) | 0), db = 5 + ((rnd() * 2) | 0);
    let x = x0; for (const s of split(S)) { house(x, y0, s, dt, true); x += s; }
    x = x0; for (const s of split(S)) { house(x, y0 + S - db, s, db, true); x += s; }
    const midY = y0 + dt, midH = S - dt - db;
    if (midH >= 3) {
      house(x0, midY, 4, midH, true); house(x0 + S - 4, midY, 4, midH, true);
      // patio del medio con árboles
      for (let k = 0; k < 3; k++) { const tx = x0 + 5 + ((rnd() * 5) | 0), ty = midY + ((rnd() * midH) | 0); if (w.get(tx, ty) === T.GRASS) w.addTree(tx, ty, 8 + ((rnd() * 4) | 0), (rnd() * 3) | 0); }
    }
  };
  const plaza = (x0, y0, S) => {
    const c = x0 + 7;
    for (let y = y0; y < y0 + S; y++) for (let x = x0; x < x0 + S; x++) {
      const edge = x === x0 || y === y0 || x === x0 + S - 1 || y === y0 + S - 1;
      const cross = Math.abs(x - c) <= 0 || Math.abs(y - c + x0 - y0) <= 0;
      const diag = Math.abs((x - x0) - (y - y0)) <= 0 || Math.abs((x - x0) + (y - y0) - (S - 1)) <= 0;
      const ring = Math.max(Math.abs(x - c), Math.abs(y - (y0 + 7))) <= 2;
      if (edge || cross || diag || ring) w.set(x, y, T.PAVING);
    }
    for (let y = y0 + 6; y <= y0 + 7; y++) for (let x = c - 1; x <= c; x++) w.set(x, y, T.MONUMENT);
    w.decals.push({ kind: 'monumento', x: c - 1, y: y0 + 6, w: 2, h: 2 });
    for (let k = 0; k < 40; k++) {
      const tx = x0 + 1 + ((rnd() * (S - 2)) | 0), ty = y0 + 1 + ((rnd() * (S - 2)) | 0);
      if (w.get(tx, ty) !== T.GRASS || w.trees.some((t) => Math.abs(t.x - tx) + Math.abs(t.y - ty) < 3)) continue;
      w.addTree(tx, ty, 10 + ((rnd() * 4) | 0), rnd() < 0.3 ? 3 : (rnd() * 2) | 0);
    }
    w.labels.push({ text: 'Plaza de prueba', x: (c) * 16, y: (y0 - 1) * 16 });
  };
  const cancha = (x0, y0, S) => {
    for (let y = y0 + 1; y < y0 + S - 1; y++) for (let x = x0 + 3; x < x0 + S - 3; x++) w.set(x, y, T.DIRT);
    w.decals.push({ kind: 'cancha', x: x0 + 3, y: y0 + 1, w: S - 6, h: S - 2 });
    for (const ty of [y0 + 2, y0 + 6, y0 + 10]) { w.addTree(x0 + 1, ty, 10, 2); w.addTree(x0 + S - 2, ty + 2, 10, 2); }
  };
  for (let by = 0; by < BL; by++) for (let bx = 0; bx < BL; bx++) block(bx, by);
  w.spawn = { x: (P + 14) * 16 + 8, y: (2 * P - 2) * 16 + 10 };
  w.buildIndex();
  return w;
};
