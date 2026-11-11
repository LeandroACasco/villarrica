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
  };
  function isRoadSide(w, tx, ty, s) { const n = w.get(tx + (s === 2 ? -1 : s === 3 ? 1 : 0), ty + (s === 0 ? -1 : s === 1 ? 1 : 0)); return n >= 0 && VR.ROADLIKE[n] === 1 && n !== VR.T.DIRTROAD; }
})();
