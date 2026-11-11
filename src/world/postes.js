// Postes y cables (11/11/2026): postes de hormigón sobre la vereda cada ~30 m, con crucetas, aisladores y a veces un transformador,
// unidos por cables que cuelgan. Se arman una vez al cargar a lo largo de la red de calles y se dibujan como objetos altos
// (se ordenan con la gente y los vehículos); los cables van por encima de todo.
(function () {
  const S = VR.TILE, B = 256, H = VR.hash;
  const P = VR.postes = { list: [], grid: new Map(), built: false };
  P.build = function (W) {
    P.built = true; const R = W.roads; if (!R) return; const T = VR.T, E = R.edges, N = R.nodes, list = P.list;
    const ok = (x, y) => { const n = W.get(Math.floor(x / S), Math.floor(y / S)); return n === T.SIDEWALK || n === T.GRASS || n === T.DIRT; };
    for (let i = 0; i < E.length; i += 4) {
      const kind = R.kinds[E[i + 2] & 15]; if (kind === 'footway' || kind === 'path' || kind === 'service' || kind === 'steps') continue;
      const ax = N[E[i] * 2], ay = N[E[i] * 2 + 1], bx = N[E[i + 1] * 2], by = N[E[i + 1] * 2 + 1], L = Math.hypot(bx - ax, by - ay); if (L < 60) continue;
      const ux = (bx - ax) / L, uy = (by - ay) / L, side = ((i >> 2) & 1) ? 1 : -1, off0 = R.widths[E[i + 2] & 15] * S / 2 + 3, centro = W.barrioName(ax, ay) === 'Centro';
      const gap = centro ? 360 : 288; let prev = null;
      for (let s = 30 + H(i, 1, 7) * 60; s < L - 24; s += gap * (0.85 + H(i, s | 0, 9) * 0.3)) {
        let placed = null;
        for (let k = 0; k < 4 && !placed; k++) { const off = off0 + k * 5, x = ax + ux * s - uy * off * side, y = ay + uy * s + ux * off * side; if (ok(x, y) && ok(x, y - 6)) placed = { x, y }; }
        if (!placed) { prev = null; continue; }
        const p = { x: placed.x, y: placed.y, tr: H(i, s | 0, 11) < 0.14, nx: -uy * side, ny: ux * side, next: null, dx: ux, dy: uy };
        if (prev) prev.next = p; prev = p; list.push(p);
        const key = Math.floor(p.x / B) + ',' + Math.floor(p.y / B); let a = P.grid.get(key); if (!a) P.grid.set(key, a = []); a.push(p);
      }
    }
  };
  const R2 = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  function drawPole(g, p) {
    const x = Math.round(p.x), y = Math.round(p.y), hgt = 40;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.moveTo(x - 1.5, y); g.lineTo(x + 1.5, y); g.lineTo(x + 15, y + 6); g.lineTo(x + 11, y + 7); g.fill();
    R2(g, '#6e695e', x - 2.4, y - 2, 4.8, 2.4); R2(g, '#8b8679', x - 2, y - 2, 3.2, 1.8);
    R2(g, '#7f7a6e', x - 1.6, y - hgt, 3.2, hgt - 1); R2(g, '#bdb8aa', x - 1.6, y - hgt, 1.4, hgt - 1); R2(g, '#d6d1c4', x - 1.6, y - hgt, 0.5, hgt - 1); R2(g, '#5f5a50', x + 0.9, y - hgt, 0.7, hgt - 1);
    for (let k = 1; k < 5; k++) R2(g, 'rgba(0,0,0,.12)', x - 1.6, y - k * 7.5, 3.2, 0.5);
    if (p.tr) { R2(g, '#4f5258', x - 3.5, y - 33, 7, 8.5); R2(g, '#7e828b', x - 3.5, y - 33, 2.8, 8.5); R2(g, '#a6aab3', x - 3.5, y - 33, 7, 1); R2(g, '#35373c', x - 3.5, y - 25.5, 7, 1); }
    R2(g, '#5a4630', x - 8, y - hgt + 2, 16, 1.8); R2(g, '#7a6244', x - 8, y - hgt + 2, 16, 0.6);
    for (const dx of [-7, 0, 7]) { R2(g, '#2a2c34', dx + x - 0.9, y - hgt - 1.2, 1.8, 3.2); R2(g, '#c9d6de', dx + x - 0.7, y - hgt - 1.6, 1.4, 1.6); }
  }
  P.collect = function (W, camX, camY, sw, sh, out) {
    if (!P.built) P.build(W); if (!P.list.length) return;
    const x0 = Math.floor((camX - 140) / B), x1 = Math.floor((camX + sw + 140) / B), y0 = Math.floor((camY - 40) / B), y1 = Math.floor((camY + sh + 120) / B), vis = [];
    for (let by = y0; by <= y1; by++) for (let bx = x0; bx <= x1; bx++) { const a = P.grid.get(bx + ',' + by); if (a) for (const p of a) vis.push(p); }
    // también los postes de la burbuja vecina cuyo cable llega a la pantalla
    for (let by = y0 - 1; by <= y1 + 1; by++) for (const bx of [x0 - 1, x1 + 1]) { const a = P.grid.get(bx + ',' + by); if (a) for (const p of a) if (p.next) vis.push(p); }
    for (let by of [y0 - 1, y1 + 1]) for (let bx = x0; bx <= x1; bx++) { const a = P.grid.get(bx + ',' + by); if (a) for (const p of a) if (p.next) vis.push(p); }
    if (!vis.length) return;
    for (const p of vis) {
      if (p.x < camX - 40 || p.x > camX + sw + 40 || p.y < camY - 10 || p.y > camY + sh + 80) continue;
      out.push({ sy: p.y + 0.5, draw: (ctx) => { ctx.save(); ctx.translate(-camX, -camY); drawPole(ctx, p); ctx.restore(); } });
    }
    out.push({ sy: 1e8, draw: (ctx) => {
      ctx.save(); ctx.translate(-camX, -camY); ctx.lineCap = 'round';
      for (const p of vis) { const q = p.next; if (!q) continue; const ty = 40 - 1;
        for (const o of [-7, 0, 7]) {
          const ax = p.x + o, ay = p.y - ty, bx = q.x + o, by = q.y - ty, d = Math.hypot(bx - ax, by - ay), sag = Math.min(9, d * 0.045);
          if (Math.max(ax, bx) < camX - 10 || Math.min(ax, bx) > camX + sw + 10 || Math.max(ay, by) < camY - 20 || Math.min(ay, by) > camY + sh + 20) continue;
          ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(ax + 1, ay + ty + 2); ctx.quadraticCurveTo((ax + bx) / 2 + 1, (ay + by) / 2 + ty + 2 + sag * 0.3, bx + 1, by + ty + 2); ctx.stroke();
          ctx.strokeStyle = 'rgba(18,18,24,.85)'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag * 2, bx, by); ctx.stroke();
        } }
      ctx.restore(); } });
  };
})();
