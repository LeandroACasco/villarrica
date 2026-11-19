// Iglesias y colegios (18/11/2026, pedido de Leandro): diseño genérico encima del edificio de OSM. Los nombres son reales (son
// instituciones, no marcas); los dibujos son genéricos hasta que haya fotos de cada uno. Las puertas y la gente que entra y sale: game/flujo.js.
// Decals (tools/osm_to_map.py): { kind: 'iglesia' | 'colegio', name, uni, nodraw, x, y, w, h } (baldosas; la fachada mira al sur).
'use strict';
(() => {
  const S = VR.TILE;
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const arco = (g, c, x, y, w, h) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill(); };
  const txt = (g, s, cx, cy, maxW, col, size) => {
    let fs = size; g.font = 'bold ' + fs + 'px sans-serif';
    while (fs > 3.2 && g.measureText(s).width > maxW) { fs -= 0.4; g.font = 'bold ' + fs + 'px sans-serif'; }
    g.fillStyle = col; g.fillText(s, cx, cy);
  };
  VR.decorOver.iglesia = (g, d) => {
    if (d.nodraw) return;
    const X0 = d.x * S, X1 = (d.x + d.w) * S, Yt = d.y * S, Yb = (d.y + d.h) * S, FH = 20, RE = Yb - FH, W = X1 - X0, cx = (X0 + X1) / 2;
    if (RE - Yt < 8 || W < 28) return;
    // techo: cumbrera clara y la cruz
    R(g, 'rgba(255,255,255,.18)', X0 + 3, (Yt + RE) / 2 - 0.6, W - 6, 1.2);
    const cy = Yt + (RE - Yt) * 0.42;
    R(g, 'rgba(0,0,0,.25)', cx - 3.5, cy - 8, 8, 18); R(g, 'rgba(0,0,0,.25)', cx - 8, cy - 2.5, 17, 7);
    R(g, '#f1ede2', cx - 2.5, cy - 9, 5, 18); R(g, '#f1ede2', cx - 8, cy - 3.5, 16, 5);
    R(g, '#c9a24a', cx - 1, cy - 9, 2, 18); R(g, '#c9a24a', cx - 8, cy - 1.7, 16, 1.6);
    // campanario sobre el frente: techo en pirámide visto desde arriba
    if (W >= 44 && RE - Yt > 26) {
      const tw = 16, tx = cx - tw / 2, ty = RE - tw - 3;
      R(g, 'rgba(0,0,0,.28)', tx + 2, ty + 2, tw, tw); R(g, '#e9e4d6', tx, ty, tw, tw);
      g.fillStyle = '#b4472f'; g.beginPath(); g.moveTo(tx + 1, ty + 1); g.lineTo(tx + tw - 1, ty + 1); g.lineTo(cx, ty + tw / 2); g.closePath(); g.fill();
      g.fillStyle = '#8f3320'; g.beginPath(); g.moveTo(tx + 1, ty + 1); g.lineTo(cx, ty + tw / 2); g.lineTo(tx + 1, ty + tw - 1); g.closePath(); g.fill();
      g.fillStyle = '#d65a3c'; g.beginPath(); g.moveTo(tx + tw - 1, ty + 1); g.lineTo(cx, ty + tw / 2); g.lineTo(tx + tw - 1, ty + tw - 1); g.closePath(); g.fill();
      g.fillStyle = '#a23c27'; g.beginPath(); g.moveTo(tx + 1, ty + tw - 1); g.lineTo(cx, ty + tw / 2); g.lineTo(tx + tw - 1, ty + tw - 1); g.closePath(); g.fill();
    }
    // fachada (mira al sur): pared clara, puerta de madera en arco, vitrales y escalones
    R(g, '#efeadc', X0, RE, W, FH); R(g, '#d8d1bd', X0, RE, W, 2); R(g, 'rgba(0,0,0,.12)', X0, RE + 2, W, 1);
    const dw = Math.min(12, W * 0.28), dx = cx - dw / 2;
    arco(g, '#5a3a22', dx, RE + 4, dw, FH - 4); arco(g, '#7a5232', dx + 1.2, RE + 5.2, dw - 2.4, FH - 5.2); R(g, '#3e2616', cx - 0.4, RE + 9, 0.8, FH - 9);
    for (const sx of [X0 + 4, X1 - 4 - 5]) if (sx + 5 < dx - 2 || sx > dx + dw + 2) { arco(g, '#3a5a8a', sx, RE + 5, 5, 9); arco(g, '#7fa8d8', sx + 0.9, RE + 6, 3.2, 7); R(g, '#e8d070', sx + 2.3, RE + 6.5, 0.5, 6.5); }
    R(g, '#c4bfae', dx - 3, Yb - 3, dw + 6, 1.6); R(g, '#b0ab9a', dx - 5, Yb - 1.5, dw + 10, 1.5);
    R(g, 'rgba(0,0,0,.28)', X0, Yb, W, 2);
  };
  VR.decorOver.colegio = (g, d) => {
    if (d.nodraw) return;   // Colegio Don Bosco: diseño propio en world/donbosco.js
    const X0 = d.x * S, X1 = (d.x + d.w) * S, Yt = d.y * S, Yb = (d.y + d.h) * S, FH = 20, RE = Yb - FH, W = X1 - X0, cx = (X0 + X1) / 2;
    if (RE - Yt < 8 || W < 28) return;
    const C = d.uni ? ['#3a4a5e', '#222c3a'] : ['#2e6fc8', '#1e4a8a'];
    // techo: pretil de color y una franja
    R(g, C[0], X0, Yt, W, 2.5); R(g, C[0], X0, Yt, 2.5, RE - Yt); R(g, C[0], X1 - 2.5, Yt, 2.5, RE - Yt); R(g, C[1], X0 + 2.5, Yt + 2.5, W - 5, 1);
    // bandera de Paraguay en un mástil sobre el frente, a un costado
    const fx = X0 + Math.min(14, W * 0.2), fy = RE - 6;
    R(g, 'rgba(0,0,0,.25)', fx + 1, fy + 1, 9, 6); R(g, '#d52b1e', fx, fy - 5, 10, 2); R(g, '#f6f6f2', fx, fy - 3, 10, 2); R(g, '#0038a8', fx, fy - 1, 10, 2); R(g, '#6a6a70', fx - 0.7, fy - 6, 0.8, 9);
    // fachada: pared crema con franja de color y el nombre
    R(g, '#f0ead8', X0, RE, W, FH); R(g, C[0], X0, RE, W, 6.5); R(g, C[1], X0, RE + 6.5, W, 1);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (d.name) txt(g, d.name, cx, RE + 3.5, W - 8, '#ffffff', 5);
    // puertas dobles con alero, ventanas con reja
    const dw = Math.min(14, W * 0.3), dx = cx - dw / 2, gy = RE + 9;
    R(g, '#3a3a40', dx - 1, gy - 1, dw + 2, FH - 7); R(g, '#8fb4cc', dx, gy, dw / 2 - 0.4, FH - 9); R(g, '#8fb4cc', dx + dw / 2 + 0.4, gy, dw / 2 - 0.4, FH - 9);
    R(g, 'rgba(255,255,255,.35)', dx + 1, gy + 1, 2, FH - 11); R(g, C[0], dx - 3, gy - 3, dw + 6, 2); R(g, 'rgba(0,0,0,.25)', dx - 3, gy - 1, dw + 6, 1);
    for (let x = X0 + 4; x < X1 - 8; x += 11) if (x + 7 < dx - 3 || x > dx + dw + 3) { R(g, '#3a3a40', x - 0.6, gy - 0.6, 8.2, 7.2); R(g, '#9ec6dc', x, gy, 7, 6); R(g, '#3a3a40', x + 3.4, gy, 0.6, 6); }
    R(g, 'rgba(0,0,0,.28)', X0, Yb, W, 2);
    g.textAlign = 'start'; g.textBaseline = 'alphabetic';
  };
})();
