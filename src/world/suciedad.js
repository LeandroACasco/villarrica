// Vida en las calles (11/11/2026): arena y tierra contra el cordón, basuritas, grietas, baches, parches, manchas de aceite y pastito.
// Todo se pinta una sola vez en el piso de cada bloque (cero costo por cuadro). Varía por baldosa (VR.hash) y por barrio:
// casi limpio en el Centro, mucho más gastado y sucio en el resto. Lo llama world.js desde el paso 3 de cada bloque.
(function () {
  const S = 16, H = VR.hash;
  const GREEN = ['#5f9a3c', '#7cb850', '#4a7a30'], SAND = ['#b9895c', '#c9a878', '#a8764c'];
  function factor(w, tx, ty) { const b = w.barrio && w.barrios ? w.barrios[w.barrio[ty * w.w + tx] - 1] : ''; return b === 'Centro' ? 0.4 : 1; }
  const isCurb = (w, tx, ty) => { const n = w.get(tx, ty); return n === VR.T.SIDEWALK || n === VR.T.PAVING || n === VR.T.CHECKER; };
  // arena / tierra que baja hacia el cordón: una franja irregular con granitos
  function sand(g, x, y, side, tx, ty, depth, seed) {
    for (let i = 0; i < S; i++) {
      const n = H(tx * S + i, ty, seed + side), d = depth * (0.25 + n * 0.9); if (d < 0.6) continue;
      const c = SAND[(H(tx, ty * S + i, seed + 7) * 3) | 0]; g.fillStyle = c; g.globalAlpha = (seed === 425 ? 0.22 : 0.6) + n * 0.3;
      if (side === 0) g.fillRect(x + i, y, 1, d); else if (side === 1) g.fillRect(x + i, y + S - d, 1, d); else if (side === 2) g.fillRect(x, y + i, d, 1); else g.fillRect(x + S - d, y + i, d, 1);
    }
    g.globalAlpha = 1;
    for (let k = 0; k < 4; k++) { const a = H(tx, ty, seed + 20 + k) * S, b = H(tx, ty, seed + 30 + k) * (depth + 2) + 0.5; g.fillStyle = k % 2 ? '#d8c39a' : '#8e6a44'; const px = side < 2 ? x + a : (side === 2 ? x + b : x + S - b), py = side < 2 ? (side === 0 ? y + b : y + S - b) : y + a; g.fillRect(px, py, 0.5, 0.5); }
  }
  function tuft(g, x, y, seed, tx, ty) { for (let k = 0; k < 4; k++) { g.fillStyle = GREEN[k % 3]; const h = 1 + H(tx, ty, seed + k) * 1.5; g.fillRect(x + k * 0.5 - 1, y - h, 0.5, h); } }
  function litter(g, x, y, kind, a) {
    g.fillStyle = 'rgba(0,0,0,.28)';
    if (kind === 0) { g.fillRect(x + 0.4, y + 0.4, 2, 1.5); g.fillStyle = '#f1eee6'; g.fillRect(x, y, 2, 1.5); g.fillStyle = '#c9c4b8'; g.fillRect(x + 1, y + 0.5, 0.5, 1); }
    else if (kind === 1) { g.fillRect(x + 0.4, y + 0.4, 1, 2.5); g.fillStyle = a ? '#3f8f4a' : '#cfe6ee'; g.fillRect(x, y, 1, 2.5); g.fillStyle = '#fff'; g.fillRect(x, y, 0.5, 1); }
    else if (kind === 2) { g.fillRect(x + 0.4, y + 0.4, 1.5, 1); g.fillStyle = '#efe6c8'; g.fillRect(x, y, 1.5, 1); }
    else if (kind === 3) { g.fillRect(x + 0.4, y + 0.4, 1, 1.5); g.fillStyle = a ? '#d83a30' : '#b9bcc4'; g.fillRect(x, y, 1, 1.5); g.fillStyle = '#e8e8ee'; g.fillRect(x, y, 1, 0.5); }
    else if (kind === 4) { g.fillStyle = '#7a5a2a'; g.fillRect(x, y, 1, 0.5); g.fillStyle = '#8a8a3a'; g.fillRect(x + 1.5, y + 1, 1, 0.5); g.fillStyle = '#9a6a30'; g.fillRect(x + 0.5, y + 1.5, 0.5, 0.5); }
    else { g.fillRect(x + 0.4, y + 0.4, 3, 2); g.fillStyle = '#a98258'; g.fillRect(x, y, 3, 2); g.fillStyle = '#8c6a44'; g.fillRect(x, y + 1, 3, 0.5); }
  }
  function litterNear(g, x, y, tx, ty, sides, p, seed) {
    if (H(tx, ty, seed) >= p) return; const n = 1 + (H(tx, ty, seed + 1) < 0.3 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const s = sides.length ? sides[(H(tx, ty, seed + 2 + k) * sides.length) | 0] : -1, a = 1 + H(tx, ty, seed + 5 + k) * 12, d = 1 + H(tx, ty, seed + 8 + k) * 4;
      const px = s < 0 ? x + a : s < 2 ? x + a : (s === 2 ? x + d : x + S - d - 2), py = s < 0 ? y + 1 + H(tx, ty, seed + 11 + k) * 12 : s < 2 ? (s === 0 ? y + d : y + S - d - 2) : y + a;
      litter(g, px, py, (H(tx, ty, seed + 14 + k) * 6) | 0, H(tx, ty, seed + 17 + k) < 0.5);
    }
  }
  function crack(g, x, y, tx, ty, seed) {
    let cx = x + 1 + H(tx, ty, seed) * 14, cy = y + 1 + H(tx, ty, seed + 1) * 14, an = H(tx, ty, seed + 2) * 6.28; const pts = [[cx, cy]], n = 4 + ((H(tx, ty, seed + 3) * 4) | 0);
    for (let i = 0; i < n; i++) { an += (H(tx, ty, seed + 10 + i) - 0.5) * 1.6; cx += Math.cos(an) * 2.2; cy += Math.sin(an) * 2.2; cx = Math.max(x + 0.5, Math.min(x + S - 0.5, cx)); cy = Math.max(y + 0.5, Math.min(y + S - 0.5, cy)); pts.push([cx, cy]); }
    g.lineCap = 'round'; for (const [col, off, wd] of [['rgba(255,255,255,.10)', 0.5, 0.5], ['rgba(10,10,14,.8)', 0, 0.7]]) { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0] + off, p[1] + off) : g.moveTo(p[0] + off, p[1] + off))); g.stroke(); }
  }
  function pothole(g, x, y, tx, ty) {
    const cx = x + 5 + H(tx, ty, 61) * 6, cy = y + 5 + H(tx, ty, 62) * 6, rx = 2 + H(tx, ty, 63) * 1.6, ry = 1.4 + H(tx, ty, 64) * 1.2;
    g.fillStyle = 'rgba(150,150,156,.45)'; g.beginPath(); g.ellipse(cx, cy, rx + 0.9, ry + 0.8, 0, 0, 7); g.fill();
    g.fillStyle = '#26262b'; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill(); g.fillStyle = '#3a3a40'; g.beginPath(); g.ellipse(cx - 0.4, cy - 0.3, rx * 0.55, ry * 0.5, 0, 0, 7); g.fill();
    g.fillStyle = '#8a8a90'; for (let k = 0; k < 3; k++) g.fillRect(cx + (H(tx, ty, 65 + k) - 0.5) * (rx * 2 + 3), cy + ry + 0.8 + H(tx, ty, 70 + k), 0.5, 0.5);
  }
  VR.grime = function (g, w, tx, ty, t, x, y) {
    const T = VR.T, f = factor(w, tx, ty), sides = []; // 0 arriba, 1 abajo, 2 izquierda, 3 derecha
    if (t === T.ROAD || t === T.STONE) {
      if (isCurb(w, tx, ty - 1)) sides.push(0); if (isCurb(w, tx, ty + 1)) sides.push(1); if (isCurb(w, tx - 1, ty)) sides.push(2); if (isCurb(w, tx + 1, ty)) sides.push(3);
      for (const s of sides) { if (H(tx, ty, 400 + s) < 0.7 * f + 0.15) { const dp = (1.5 + H(tx, ty, 410 + s) * 2.6) * (0.55 + f * 0.6) + (sides.length > 1 ? 1 : 0); sand(g, x, y, s, tx, ty, dp + 1.5, 425); sand(g, x, y, s, tx, ty, dp, 420); }; }
      litterNear(g, x, y, tx, ty, sides, sides.length ? 0.17 * f + 0.03 : 0.02 * f, 440);
      if (sides.length && H(tx, ty, 450) < 0.1 * f) { const s = sides[0], a = 2 + H(tx, ty, 451) * 12; tuft(g, s < 2 ? x + a : (s === 2 ? x + 1 : x + S - 1), s === 0 ? y + 2.5 : s === 1 ? y + S - 0.5 : y + a, 452, tx, ty); }
      if (t === T.ROAD) {
        if (H(tx, ty, 460) < 0.1 * f + 0.01) crack(g, x, y, tx, ty, 461);
        if (H(tx, ty, 480) < 0.004 + 0.012 * f) pothole(g, x, y, tx, ty);
        if (H(tx, ty, 490) < 0.025 * f) { g.fillStyle = 'rgba(8,8,12,.24)'; g.beginPath(); g.ellipse(x + 4 + H(tx, ty, 491) * 8, y + 4 + H(tx, ty, 492) * 8, 3, 1.8, H(tx, ty, 493) * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(40,60,90,.14)'; g.beginPath(); g.ellipse(x + 8, y + 8, 1.6, 0.9, 0, 0, 7); g.fill(); }
        if (H(tx, ty, 500) < 0.02 * f) { const pw = 6 + H(tx, ty, 501) * 7, ph = 5 + H(tx, ty, 502) * 6, px = x + H(tx, ty, 503) * (S - pw), py = y + H(tx, ty, 504) * (S - ph); g.fillStyle = H(tx, ty, 505) < 0.5 ? 'rgba(20,20,26,.18)' : 'rgba(255,255,255,.07)'; g.fillRect(px, py, pw, ph); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(px, py + ph, pw, 0.5); g.fillRect(px + pw, py, 0.5, ph + 0.5); }
      } else { // empedrado: pasto y tierra entre las piedras, alguna piedra suelta
        if (H(tx, ty, 520) < 0.1 * f) { const a = x + 2 + H(tx, ty, 521) * 11, b = y + 2 + H(tx, ty, 522) * 11; tuft(g, a, b, 523, tx, ty); }
        if (H(tx, ty, 530) < 0.04 * f) { g.fillStyle = 'rgba(70,45,25,.45)'; g.fillRect(x + 2 + H(tx, ty, 531) * 8, y + 2 + H(tx, ty, 532) * 8, 3, 2.5); g.fillStyle = '#c9a878'; g.fillRect(x + 3, y + 3, 0.5, 0.5); }
      }
    } else if (t === T.SIDEWALK) {
      if (isRoadSide(w, tx, ty, 0)) sides.push(0); if (isRoadSide(w, tx, ty, 1)) sides.push(1); if (isRoadSide(w, tx, ty, 2)) sides.push(2); if (isRoadSide(w, tx, ty, 3)) sides.push(3);
      for (const s of sides) if (H(tx, ty, 600 + s) < 0.16 * f) { // polvo de tierra que se subió a la vereda
        const a = 1 + H(tx, ty, 610 + s) * 9, len = 3 + H(tx, ty, 620 + s) * 5; g.fillStyle = SAND[(H(tx, ty, 630 + s) * 3) | 0]; g.globalAlpha = 0.6;
        if (s < 2) g.fillRect(x + a, s === 0 ? y + 2 : y + S - 3.5, len, 1.2); else g.fillRect(s === 2 ? x + 2 : x + S - 3.5, y + a, 1.2, len); g.globalAlpha = 1; }
      if (sides.length) { litterNear(g, x, y, tx, ty, sides, 0.06 * f, 640); if (H(tx, ty, 660) < 0.07 * f) { const s = sides[0], a = 2 + H(tx, ty, 661) * 11; tuft(g, s < 2 ? x + a : (s === 2 ? x + 2.5 : x + S - 2.5), s === 0 ? y + 3 : s === 1 ? y + S - 2 : y + a, 662, tx, ty); } }
      else if (H(tx, ty, 670) < 0.012 * f) litterNear(g, x, y, tx, ty, [], 1, 671);
    } else if (t === T.DIRTROAD) {
      for (let k = 0; k < 3; k++) if (H(tx, ty, 700 + k) < 0.2) { g.fillStyle = k % 2 ? '#d8b88c' : '#7a5232'; g.fillRect(x + H(tx, ty, 710 + k) * 15, y + H(tx, ty, 720 + k) * 15, 1, 0.5 + H(tx, ty, 730 + k)); }
      if (H(tx, ty, 740) < 0.03) litterNear(g, x, y, tx, ty, [], 1, 741);
    }
    VR.grime2(g, w, tx, ty, t, x, y, f, sides);
  };

  // ---- segunda tanda (11/11/2026): charcos, cordón gastado, raíces y baldosas rotas, tachos, obras ----
  function charco(g, x, y, tx, ty, barro) {
    const cx = x + 5 + H(tx, ty, 800) * 6, cy = y + 5 + H(tx, ty, 801) * 6, rx = 3 + H(tx, ty, 802) * 3.5, ry = 1.8 + H(tx, ty, 803) * 2.2, rot = H(tx, ty, 804) * 3;
    g.fillStyle = barro ? 'rgba(60,40,28,.35)' : 'rgba(10,14,22,.28)'; g.beginPath(); g.ellipse(cx, cy, rx + 0.8, ry + 0.6, rot, 0, 7); g.fill();
    g.fillStyle = barro ? 'rgba(130,98,74,.75)' : 'rgba(118,146,170,.7)'; g.beginPath(); g.ellipse(cx, cy, rx, ry, rot, 0, 7); g.fill();
    g.fillStyle = barro ? 'rgba(190,160,128,.5)' : 'rgba(205,222,236,.6)'; g.beginPath(); g.ellipse(cx - rx * 0.2, cy - ry * 0.25, rx * 0.5, ry * 0.35, rot, 0, 7); g.fill();
  }
  function edgeRect(g, s, x, y, a, len, d0, dd) { if (s === 0) g.fillRect(x + a, y + d0, len, dd); else if (s === 1) g.fillRect(x + a, y + S - d0 - dd, len, dd); else if (s === 2) g.fillRect(x + d0, y + a, dd, len); else g.fillRect(x + S - d0 - dd, y + a, dd, len); }
  function tacho(g, x, y, tx, ty) {
    const cx = x + 4 + H(tx, ty, 900) * 8, cy = y + 4 + H(tx, ty, 901) * 8;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(cx + 1.2, cy + 1.4, 3, 2.6, 0, 0, 7); g.fill();
    g.fillStyle = '#2b2d33'; g.beginPath(); g.arc(cx, cy, 2.8, 0, 7); g.fill(); g.fillStyle = '#4a4d56'; g.beginPath(); g.arc(cx - 0.3, cy - 0.3, 2.2, 0, 7); g.fill(); g.fillStyle = '#5d616c'; g.beginPath(); g.arc(cx - 0.5, cy - 0.5, 0.9, 0, 7); g.fill();
    if (H(tx, ty, 902) < 0.6) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(cx + 3.4, cy + 0.6, 3, 2.4); g.fillStyle = H(tx, ty, 903) < 0.5 ? '#1c1c20' : '#d8d4c8'; g.beginPath(); g.ellipse(cx + 4.6, cy + 1.6, 1.8, 1.5, 0, 0, 7); g.fill(); g.fillStyle = '#ffffff22'; g.fillRect(cx + 4, cy + 1, 0.8, 0.5); }
  }
  function obra(g, x, y, tx, ty) {
    const k = (H(tx, ty, 910) * 3) | 0, cx = x + 3 + H(tx, ty, 911) * 6, cy = y + 4 + H(tx, ty, 912) * 6;
    if (k === 0) { for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) { const bx = cx + c * 2.4 + r * 1.2, by = cy + r * 1.3; g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(bx + 0.4, by + 0.4, 2.2, 1.2); g.fillStyle = (c + r) % 2 ? '#b5502f' : '#c8623c'; g.fillRect(bx, by, 2.2, 1.2); g.fillStyle = '#e2916a'; g.fillRect(bx, by, 2.2, 0.4); } }
    else if (k === 1) { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(cx + 3.4, cy + 2.2, 4.4, 2.8, 0, 0, 7); g.fill(); g.fillStyle = '#b08d5c'; g.beginPath(); g.ellipse(cx + 3, cy + 1.8, 4.2, 2.6, 0, 0, 7); g.fill(); g.fillStyle = '#cdb07e'; g.beginPath(); g.ellipse(cx + 2.4, cy + 1.2, 2.4, 1.4, 0, 0, 7); g.fill(); g.fillStyle = '#7c5c36'; g.fillRect(cx + 5, cy + 2.6, 0.5, 0.5); g.fillRect(cx + 1, cy + 2.8, 0.5, 0.5); }
    else { for (let b = 0; b < 3; b++) { const bx = cx + (b % 2) * 3.2, by = cy + b * 1.8; g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(bx + 0.5, by + 0.5, 4.4, 2.2); g.fillStyle = b === 1 ? '#c9c5b8' : '#b7b4aa'; g.fillRect(bx, by, 4.4, 2.2); g.fillStyle = '#8f8c82'; g.fillRect(bx + 0.5, by + 1, 3.4, 0.4); g.fillStyle = '#e4e0d4'; g.fillRect(bx, by, 4.4, 0.4); } }
    for (let c = 0; c < 4; c++) { g.fillStyle = c % 2 ? '#9a9890' : '#b9b3a4'; g.fillRect(x + H(tx, ty, 920 + c) * 14, y + H(tx, ty, 930 + c) * 14, 1 + H(tx, ty, 940 + c), 0.8); }
  }
  function raices(g, x, y, tx, ty, nx, ny) {
    const cx = x + S / 2 + nx * S / 2, cy = y + S / 2 + ny * S / 2;
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + 2, y + 2, S - 4, S - 4); g.strokeStyle = 'rgba(30,24,18,.7)'; g.lineWidth = 0.6; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const an = Math.atan2(y + S / 2 - cy, x + S / 2 - cx) + (k - 1) * 0.7 + (H(tx, ty, 950 + k) - 0.5) * 0.5; g.beginPath(); g.moveTo(x + S / 2 - Math.cos(an) * 5, y + S / 2 - Math.sin(an) * 5); g.lineTo(x + S / 2 + Math.cos(an) * 6, y + S / 2 + Math.sin(an) * 6); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 2, y + S - 2.5, S - 4, 0.8); g.fillStyle = '#6b5a40'; g.fillRect(x + 6 + H(tx, ty, 960) * 4, y + 6, 1.2, 0.8);
  }
  VR.grime2 = function (g, w, tx, ty, t, x, y, f, sides) {
    const T = VR.T;
    if (t === T.ROAD || t === T.STONE) { if (H(tx, ty, 790) < 0.004 + 0.011 * f) charco(g, x, y, tx, ty, false); }
    else if (t === T.DIRTROAD) { if (H(tx, ty, 790) < 0.05) charco(g, x, y, tx, ty, true); }
    else if (t === T.SIDEWALK) {
      for (const s of sides) { // cordón: pintura blanca descascarada y algún pedazo roto
        const r = H(tx, ty, 970 + s); if (r < 0.14 * f + 0.02) { g.fillStyle = 'rgba(236,232,222,.85)'; edgeRect(g, s, x, y, 1 + H(tx, ty, 975) * 3, 6 + H(tx, ty, 976) * 8, 0, 1.4); g.fillStyle = 'rgba(120,114,102,.6)'; edgeRect(g, s, x, y, 3 + H(tx, ty, 977) * 6, 1.5, 0, 1.4); }
        else if (r > 0.97 - 0.03 * f) { g.fillStyle = '#3a3830'; edgeRect(g, s, x, y, 4 + H(tx, ty, 978) * 7, 2, 0, 1.4); g.fillStyle = '#bdb7aa'; edgeRect(g, s, x, y, 6 + H(tx, ty, 979) * 5, 0.6, 1.4, 0.5); }
      }
      let tree = null; for (let dy = -1; dy <= 1 && !tree; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && w.get(tx + dx, ty + dy) === T.TREE) { tree = [dx, dy]; break; }
      if (tree && H(tx, ty, 985) < 0.6) raices(g, x, y, tx, ty, tree[0], tree[1]);
      else if (H(tx, ty, 990) < 0.05 * f) { g.strokeStyle = 'rgba(30,26,20,.65)'; g.lineWidth = 0.6; const a = H(tx, ty, 991) * 8; g.beginPath(); g.moveTo(x + 1, y + 3 + a); g.lineTo(x + 6, y + 4 + a); g.lineTo(x + 9, y + 2 + a); g.lineTo(x + 15, y + 5 + a); g.stroke(); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x + 6, y + 5 + a, 3, 1.2); }
      if (sides.length && H(tx, ty, 995) < 0.012 + 0.02 * f) tacho(g, x, y, tx, ty);
      if (!sides.length || true) { const nb = w.b(tx, ty - 1) || w.b(tx, ty + 1) || w.b(tx - 1, ty) || w.b(tx + 1, ty); if (nb && H(tx, ty, 997) < 0.012 * f) obra(g, x, y, tx, ty); }
    }
  };
  function isRoadSide(w, tx, ty, s) { const n = w.get(tx + (s === 2 ? -1 : s === 3 ? 1 : 0), ty + (s === 0 ? -1 : s === 1 ? 1 : 0)); return n >= 0 && VR.ROADLIKE[n] === 1 && n !== VR.T.DIRTROAD; }
})();
