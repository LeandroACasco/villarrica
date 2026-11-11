// Vista de costado en alta (04/11/2026): el mismo perfil de cada vehículo, dibujado con trazos y degradés a
// 5× (320×180) para el taller y la tarjeta al subirte: chapa con luz y sombra, vidrios con reflejo, burletes,
// manijas, espejos, guardabarros, llantas de verdad (de chapa, deportivas, cromadas, negras, doradas), discos de
// freno, faros con lente, motores con aletas, cadenas, amortiguadores. Diseños propios por categoría, sin marcas.
'use strict';
(() => {
  const SH = (h, k) => VR.shadeHex(h, k);
  const CHROME = ['#f4f6fa', '#9aa0aa', '#e6eaf0', '#6a707a', '#c8ccd4'];
  const lin = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };
  const rrect = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const pathPts = (g, pts, r = 1.4) => { // contorno suavizado con arcos en cada vértice
    const n = pts.length; g.beginPath();
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const s = mid(pts[n - 1], pts[0]); g.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], m = mid(p, q); g.arcTo(p[0], p[1], m[0], m[1], r); }
    g.closePath();
  };
  // rueda: cubierta, llanta según el estilo, disco y bulones
  const wheelHD = (g, cx, cy, r, style, fat) => {
    g.save();
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(cx, cy + r * 0.95, r * 1.1, r * 0.22, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = lin(g, cx, cy - r, cx, cy + r, ['#2c2c30', '#141416', '#1e1e22']); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 0.25; for (let a = 0; a < Math.PI * 2; a += Math.PI / 14) { g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92); g.lineTo(cx + Math.cos(a) * r * 0.99, cy + Math.sin(a) * r * 0.99); g.stroke(); }
    const rr = r * (fat ? 0.6 : 0.68);
    const RC = { serie: ['#a8acb4', '#6a6e76'], deportivas: ['#dfe3ea', '#8a9099'], cromadas: ['#ffffff', '#9aa2ae'], negras: ['#4a4a52', '#18181c'], doradas: ['#f0d070', '#9a7a28'] }[style] || ['#a8acb4', '#6a6e76'];
    g.fillStyle = '#26262a'; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
    g.fillStyle = lin(g, cx - rr, cy - rr, cx + rr, cy + rr, ['#8a8e96', '#4a4e56']); g.beginPath(); g.arc(cx, cy, rr * 0.72, 0, Math.PI * 2); g.fill(); // disco
    g.fillStyle = lin(g, cx - rr, cy - rr, cx + rr, cy + rr, [RC[0], RC[1], RC[0]]);
    if (style === 'serie' || !style) {
      g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.arc(cx, cy, rr * 0.82, 0, Math.PI * 2, true); g.fill();
      g.beginPath(); g.arc(cx, cy, rr * 0.62, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a2a30'; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3; g.beginPath(); g.ellipse(cx + Math.cos(a) * rr * 0.72, cy + Math.sin(a) * rr * 0.72, rr * 0.1, rr * 0.08, a, 0, Math.PI * 2); g.fill(); }
    } else {
      const n = style === 'cromadas' ? 10 : 5, w = style === 'cromadas' ? 0.12 : 0.22;
      g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.arc(cx, cy, rr * 0.88, 0, Math.PI * 2, true); g.fill();
      for (let k = 0; k < n; k++) { const a = k * Math.PI * 2 / n - Math.PI / 2; g.beginPath(); g.moveTo(cx + Math.cos(a - w * 0.6) * rr * 0.2, cy + Math.sin(a - w * 0.6) * rr * 0.2); g.lineTo(cx + Math.cos(a - w) * rr * 0.9, cy + Math.sin(a - w) * rr * 0.9); g.lineTo(cx + Math.cos(a + w) * rr * 0.9, cy + Math.sin(a + w) * rr * 0.9); g.lineTo(cx + Math.cos(a + w * 0.6) * rr * 0.2, cy + Math.sin(a + w * 0.6) * rr * 0.2); g.closePath(); g.fill(); }
      g.beginPath(); g.arc(cx, cy, rr * 0.26, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(cx - rr * 0.35, cy - rr * 0.4, rr * 0.22, rr * 0.1, -0.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#18181c'; g.beginPath(); g.arc(cx, cy, rr * 0.12, 0, Math.PI * 2); g.fill();
    g.restore();
  };
  // rueda de moto con rayos o de aleación
  const motoWheel = (g, cx, cy, r, style, spokes = true) => {
    g.save();
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(cx, cy + r * 0.95, r * 1.05, r * 0.2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#18181a'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.arc(cx, cy, r * 0.78, 0, Math.PI * 2, true); g.fill('evenodd');
    const RC = { serie: '#b4b8c0', deportivas: '#dfe3ea', cromadas: '#ffffff', negras: '#3a3a42', doradas: '#e8c050' }[style] || '#b4b8c0';
    g.strokeStyle = RC; g.lineWidth = 0.55; g.beginPath(); g.arc(cx, cy, r * 0.76, 0, Math.PI * 2); g.stroke();
    if (spokes && (style === 'serie' || !style || style === 'cromadas')) { g.lineWidth = 0.14; for (let k = 0; k < 18; k++) { const a = k * Math.PI / 9; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.14, cy + Math.sin(a) * r * 0.14); g.lineTo(cx + Math.cos(a + 0.5) * r * 0.74, cy + Math.sin(a + 0.5) * r * 0.74); g.stroke(); } }
    else { g.fillStyle = RC; for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; g.save(); g.translate(cx, cy); g.rotate(a); g.beginPath(); g.moveTo(-0.35, 0); g.quadraticCurveTo(r * 0.3, -r * 0.25, r * 0.75, -0.3); g.lineTo(r * 0.75, 0.3); g.quadraticCurveTo(r * 0.3, r * 0.05, 0.35, 0.3); g.fill(); g.restore(); } }
    g.fillStyle = lin(g, cx - r * 0.4, cy, cx + r * 0.4, cy, ['#8a8e96', '#c8ccd4', '#6a6e76']); g.beginPath(); g.arc(cx, cy, r * 0.42, 0, Math.PI * 2); g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1; // disco
    g.fillStyle = '#2a2a30'; g.beginPath(); g.arc(cx, cy, r * 0.16, 0, Math.PI * 2); g.fill();
    g.restore();
  };
  const headlight = (g, x, y, w, h, xen, r = 0.8) => { rrect(g, x, y, w, h, r); g.fillStyle = lin(g, x, y, x + w, y + h, xen ? ['#ffffff', '#cfe4ff', '#7aa8e0'] : ['#ffffff', '#fff2c0', '#c8a860']); g.fill(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 0.25; g.stroke(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(x + w * 0.35, y + h * 0.35, w * 0.18, h * 0.16, 0, 0, Math.PI * 2); g.fill(); };
  const taillight = (g, x, y, w, h) => { rrect(g, x, y, w, h, 0.5); g.fillStyle = lin(g, x, y, x, y + h, ['#ff7a6a', '#d8241a', '#8a1410']); g.fill(); g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + w * 0.2, y + h * 0.15, w * 0.5, h * 0.18); };
  const neonGlow = (g, x0, x1, y, t) => { if (!t.neon || t.neon === 'no' || !VR.NEON) return; const cx = (x0 + x1) / 2, rw = (x1 - x0) / 2 + 4; const gr = g.createRadialGradient(cx, y, 0, cx, y, rw); gr.addColorStop(0, `rgba(${VR.NEON[t.neon]},.9)`); gr.addColorStop(0.5, `rgba(${VR.NEON[t.neon]},.35)`); gr.addColorStop(1, `rgba(${VR.NEON[t.neon]},0)`); g.save(); g.translate(cx, y); g.scale(1, 0.13); g.translate(-cx, -y); g.fillStyle = gr; g.fillRect(cx - rw, y - rw, rw * 2, rw * 2); g.restore(); };

  // ---------- autos ----------
  const carHD = (g, m, pal, t) => {
    const M = VR.CAR_MODELS[m], c = M.sideShape, [C, D, L] = pal, S2 = VR.tunePal(t.color2 ?? 11)[0], LL = t.llantas || 'serie';
    const gl = t.polarizado == 2 ? ['#3a4450', '#0e1218', '#1a2028'] : t.polarizado == 1 ? ['#8aa0b8', '#2a3646', '#3c4c60'] : ['#c8dcec', '#4a6680', '#6c8aa8'];
    const lo = +t.bajo ? 1.6 : 0, wr = c.wr + 0.3;
    neonGlow(g, c.tailx + 4, c.nose - 4, 31.5, t);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse((c.tailx + c.nose) / 2, 33, (c.nose - c.tailx) / 2 + 1, 1.3, 0, 0, Math.PI * 2); g.fill();
    // carrocería en una capa aparte: contorno suave, arcos de las ruedas recortados, luz y sombra encima
    const lay = VR.canvas(g.canvas.width, g.canvas.height), b = lay.getContext('2d'); b.setTransform(g.getTransform());
    b.translate(0, lo);
    const pts = c.body.filter((p) => !c.wheels.some((w) => Math.abs(p[0] - w) <= c.wr + 1.6 && p[1] > 20));
    pathPts(b, pts, 1.6); b.fillStyle = C; b.fill();
    b.globalCompositeOperation = 'source-atop';
    b.fillStyle = lin(b, 0, c.yr - 1, 0, c.sill, [SH(L, 1.08), L, C, C, SH(C, 0.82), SH(D, 0.8)]); b.fillRect(0, 0, 64, 36);
    b.fillStyle = 'rgba(255,255,255,.35)'; b.fillRect(c.tailx, c.belt + 1.6, c.nose - c.tailx, 0.35);          // reflejo del hombro
    b.fillStyle = 'rgba(0,0,0,.18)'; b.fillRect(c.tailx, c.sill - 4.2, c.nose - c.tailx, 0.3);                  // moldura
    if (t.franja === 'costado') { b.fillStyle = S2; b.fillRect(c.tailx, c.belt + 3.2, c.nose - c.tailx, 1.6); b.fillStyle = 'rgba(255,255,255,.25)'; b.fillRect(c.tailx, c.belt + 3.2, c.nose - c.tailx, 0.4); }
    else if (t.franja && t.franja !== 'no') { b.fillStyle = S2; b.fillRect(c.rx0 - 1, c.yr - 0.6, c.rx1 - c.rx0 + 2, 1); b.fillRect(c.hood[0], c.hood[1] - 0.8, c.nose - c.hood[0], 1.1); }
    if (t.techo === 'negro') { b.fillStyle = '#1e1e24'; b.fillRect(c.rx0 - 2, c.yr - 2, c.rx1 - c.rx0 + 4, 2.3); }
    b.fillStyle = lin(b, 0, c.sill - 2.6, 0, c.sill, ['#3a3a40', '#1c1c20']); b.fillRect(c.tailx - 1, c.sill - 2.4, c.nose - c.tailx + 2, 2.6); // zócalo y paragolpes
    b.globalCompositeOperation = 'destination-out';
    for (const x of c.wheels) { b.beginPath(); b.arc(x, 28, wr + 1.1, 0, Math.PI * 2); b.fill(); }
    b.globalCompositeOperation = 'source-over';
    for (const x of c.wheels) { b.strokeStyle = SH(D, 0.7); b.lineWidth = 0.6; b.beginPath(); b.arc(x, 28, wr + 1.3, Math.PI * 1.08, Math.PI * 1.92); b.stroke(); }
    // vidrios con marco y reflejo
    for (const w of c.win) {
      pathPts(b, w, 0.7); b.fillStyle = '#16181c'; b.fill();
      b.save(); b.translate(0.35, 0.35); const sc = 1; pathPts(b, w.map(([x, y]) => [x - 0.35, y - 0.35]), 0.6); b.restore();
      const ys = w.map((p) => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
      b.save(); pathPts(b, w.map(([x, y], i) => [x + (x < (w[0][0] + w[2][0]) / 2 ? 0.45 : -0.45), y + (y < (y0 + y1) / 2 ? 0.45 : -0.3)]), 0.5); b.clip();
      b.fillStyle = lin(b, 0, y0, 0, y1, gl); b.fillRect(0, y0, 64, y1 - y0);
      b.fillStyle = 'rgba(255,255,255,.28)'; b.beginPath(); const xm = Math.min(...w.map((p) => p[0])); b.moveTo(xm + 2, y1); b.lineTo(xm + 5, y0); b.lineTo(xm + 6.5, y0); b.lineTo(xm + 3.5, y1); b.fill();
      b.restore();
    }
    for (const x of c.pillars || []) { b.fillStyle = '#1a1a1e'; b.fillRect(x - 0.1, c.yr + 0.8, 1.1, c.belt - c.yr - 0.6); }
    b.fillStyle = 'rgba(0,0,0,.55)'; b.fillRect(c.win[0][3] ? Math.min(...c.win.flat().map((p) => p[0])) : 0, c.belt + 0.1, Math.max(...c.win.flat().map((p) => p[0])) - Math.min(...c.win.flat().map((p) => p[0])), 0.45); // burlete
    // puertas, manijas, espejo
    for (const x of c.doors) { b.strokeStyle = 'rgba(0,0,0,.45)'; b.lineWidth = 0.28; b.beginPath(); b.moveTo(x + 0.5, c.belt + 0.5); b.quadraticCurveTo(x + 0.2, (c.belt + c.sill) / 2, x + 0.5, c.sill - 2.6); b.stroke(); b.fillStyle = SH(C, 0.7); rrect(b, x - 3.4, c.belt + 2.2, 2.4, 0.7, 0.3); b.fill(); b.fillStyle = 'rgba(255,255,255,.5)'; b.fillRect(x - 3.2, c.belt + 2.25, 2, 0.2); }
    const mx = c.hood[0] - 1.5; b.fillStyle = SH(C, 0.85); rrect(b, mx - 1.6, c.belt - 1.6, 2.8, 1.7, 0.6); b.fill(); b.fillStyle = '#1a1a1e'; b.fillRect(mx - 0.4, c.belt, 0.8, 0.8);
    // faros, luces, parrilla, patente, escape
    headlight(b, c.nose - 4.2, c.hood[1] + 0.6, 4, 2.4, t.faros === 'xenon');
    b.fillStyle = '#1a1a1e'; rrect(b, c.nose - 1.6, c.hood[1] + 3.4, 1.8, 3.4, 0.4); b.fill(); b.strokeStyle = '#4a4a52'; b.lineWidth = 0.2; for (let y = c.hood[1] + 3.9; y < c.hood[1] + 6.6; y += 0.8) { b.beginPath(); b.moveTo(c.nose - 1.4, y); b.lineTo(c.nose, y); b.stroke(); }
    taillight(b, c.tailx - 0.2, c.tailTop + 0.6, 2.2, 3.4);
    b.fillStyle = '#f2f0ea'; b.fillRect(c.tailx - 0.4, c.tailTop + 5.2, 0.6, 2.4);
    if (t.escape === 'deportivo') { b.fillStyle = lin(b, 0, c.sill - 2, 0, c.sill, CHROME); rrect(b, c.tailx - 2.4, c.sill - 2.2, 4, 1.6, 0.8); b.fill(); b.fillStyle = '#101012'; b.beginPath(); b.ellipse(c.tailx - 2.1, c.sill - 1.4, 0.35, 0.6, 0, 0, Math.PI * 2); b.fill(); }
    // caja de la camioneta, barra, auxilio, barras de techo, defensa
    if (c.bed) { b.fillStyle = SH(C, 0.62); b.fillRect(c.bed[0], c.bed[1] - 0.2, c.bed[2] - c.bed[0], 0.8); b.fillStyle = 'rgba(255,255,255,.35)'; b.fillRect(c.bed[0], c.bed[1] - 0.2, c.bed[2] - c.bed[0], 0.25); b.strokeStyle = 'rgba(0,0,0,.35)'; b.lineWidth = 0.25; b.beginPath(); b.moveTo(c.bed[0] + 1, c.bed[1] + 1.2); b.lineTo(c.bed[0] + 1, c.sill - 3); b.stroke();
      if (c.rollbar) { b.strokeStyle = lin(b, 0, c.bed[1] - 5, 0, c.bed[1], CHROME); b.lineWidth = 0.9; b.lineCap = 'round'; b.beginPath(); b.moveTo(c.bed[2] - 6, c.bed[1]); b.lineTo(c.bed[2] - 5, c.bed[1] - 4.4); b.lineTo(c.bed[2] - 1, c.bed[1] - 4.4); b.lineTo(c.bed[2] - 0.6, c.bed[1]); b.stroke(); } }
    if (c.rails || t.techo === 'parrilla') { b.fillStyle = '#26262c'; rrect(b, c.rx0 + 1, c.yr - 2.2, c.rx1 - c.rx0 - 2, 0.9, 0.4); b.fill(); for (const x of [c.rx0 + 2, (c.rx0 + c.rx1) / 2, c.rx1 - 3]) b.fillRect(x, c.yr - 1.4, 0.8, 1.4); }
    if (c.spare) { const sx = c.tailx - 1.2, sy = c.spare; b.fillStyle = '#16161a'; b.beginPath(); b.ellipse(sx, sy, 1.6, 4.6, 0, 0, Math.PI * 2); b.fill(); b.fillStyle = M.base && m === 'suvmed' ? C : '#3a3a42'; b.beginPath(); b.ellipse(sx - 0.4, sy, 1.1, 3.6, 0, 0, Math.PI * 2); b.fill(); b.fillStyle = 'rgba(255,255,255,.25)'; b.fillRect(sx - 1, sy - 3, 0.4, 3); }
    if (c.bull) { b.strokeStyle = '#1e1e22'; b.lineWidth = 0.9; b.beginPath(); b.moveTo(c.nose + 0.2, c.sill - 2); b.lineTo(c.nose + 1, c.hood[1] + 2.5); b.lineTo(c.nose - 1, c.hood[1] + 1.8); b.stroke(); }
    if (t.aleron === 'chico' && !c.bed) { b.fillStyle = SH(C, 0.75); rrect(b, c.tailx - 0.6, c.tailTop - 1.8, 7, 1.6, 0.6); b.fill(); }
    if (c.scoop) { b.fillStyle = SH(C, 0.7); rrect(b, c.hood[0] + 2.5, c.hood[1] - 1.4, 6, 1.6, 0.6); b.fill(); b.fillStyle = '#1a1a1e'; b.fillRect(c.hood[0] + 3.2, c.hood[1] - 1, 4.6, 0.5); }
    if (c.lip && t.aleron !== 'grande') { b.fillStyle = SH(C, 0.7); rrect(b, c.tailx - 0.4, c.tailTop - 1.2, 6, 1.2, 0.5); b.fill(); }
    if ((t.aleron === 'grande' || (c.wing && t.aleron !== 'chico')) && !c.bed) { b.fillStyle = '#26262c'; b.fillRect(c.tailx + 1.6, c.tailTop - 4, 0.9, 4); b.fillStyle = lin(b, 0, c.tailTop - 6, 0, c.tailTop - 4, [L, C, D]); rrect(b, c.tailx - 2.5, c.tailTop - 6.2, 11, 2.2, 0.8); b.fill(); }
    if (M.emer) {
      const band = M.emer === 'policia' ? '#1e3a8a' : '#c8241a', x0 = c.tailx + 0.5, x1 = c.nose - 4.5;
      b.globalCompositeOperation = 'source-atop';
      b.fillStyle = band; b.fillRect(x0, c.belt + 5.2, x1 - x0, 1.5); b.fillStyle = M.emer === 'policia' ? '#5a8ad8' : '#f2f0ea'; b.fillRect(x0, c.belt + 6.7, x1 - x0, 0.45);
      b.globalCompositeOperation = 'source-over';
      b.fillStyle = band; b.font = '700 2.3px system-ui, sans-serif'; b.textAlign = 'center'; b.textBaseline = 'middle';
      b.fillText(M.emer === 'policia' ? 'POLICÍA' : 'EMERGENCIAS', M.emer === 'policia' ? (c.doors[0] + c.doors[1]) / 2 - 2 : (c.tailx + c.doors[0]) / 2 + 3, c.belt + 3.2);
      const lx = M.emer === 'ambulancia' ? c.rx1 - 9 : (c.rx0 + c.rx1) / 2 - 5, L2 = M.lights.map((q) => `rgb(${q})`);
      b.fillStyle = '#1e1e24'; rrect(b, lx, c.yr - 1.8, 10, 1.9, 0.6); b.fill();
      b.fillStyle = L2[0]; rrect(b, lx + 0.5, c.yr - 1.6, 4.3, 1.3, 0.5); b.fill(); b.fillStyle = L2[1]; rrect(b, lx + 5.2, c.yr - 1.6, 4.3, 1.3, 0.5); b.fill();
      b.fillStyle = 'rgba(255,255,255,.55)'; b.fillRect(lx + 1, c.yr - 1.5, 8, 0.3);
      if (M.emer === 'ambulancia') { b.fillStyle = L2[0]; rrect(b, c.tailx + 0.5, c.yr - 1.4, 3, 1.4, 0.4); b.fill(); b.fillStyle = '#e8ecf2'; b.fillRect(c.tailx + 1, c.yr + 3, 0.4, 8); }
    }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(lay, 0, 0); g.restore();
    // luz de los faros xenón
    if (t.faros === 'xenon') { const gr = g.createRadialGradient(c.nose, c.hood[1] + 2, 0, c.nose, c.hood[1] + 2, 6); gr.addColorStop(0, 'rgba(200,225,255,.6)'); gr.addColorStop(1, 'rgba(200,225,255,0)'); g.fillStyle = gr; g.fillRect(c.nose - 6, c.hood[1] - 4, 12, 12); }
    for (const x of c.wheels) wheelHD(g, x, 28, wr, LL, true);
  };

  // ---------- camión de bomberos ----------
  const bombaHD = (g, pal) => {
    const [C, D, L] = pal;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(32, 33.4, 31, 1.2, 0, 0, Math.PI * 2); g.fill();
    // caja con persianas
    g.fillStyle = lin(g, 0, 6, 0, 27, [L, C, C, D]); rrect(g, 1, 6.5, 41, 19.5, 0.6); g.fill();
    for (const [x, w] of [[3, 11], [15.5, 11], [28, 11]]) { g.fillStyle = lin(g, x, 0, x + w, 0, ['#c8ccd4', '#e8ecf2', '#9aa0aa']); rrect(g, x, 8.5, w, 12, 0.4); g.fill(); g.strokeStyle = '#7a7e88'; g.lineWidth = 0.18; for (let y = 9.3; y < 20.4; y += 0.8) { g.beginPath(); g.moveTo(x + 0.2, y); g.lineTo(x + w - 0.2, y); g.stroke(); } g.fillStyle = '#3a3a40'; g.fillRect(x + w / 2 - 1, 19.6, 2, 0.6); }
    g.fillStyle = '#c8241a'; g.fillRect(1, 21.6, 41, 1.4); g.fillStyle = '#1a1a1e'; g.font = '700 2.4px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BOMBEROS', 35, 24.4);
    g.fillStyle = '#26262a'; g.fillRect(1, 26, 41, 1.4);
    // escalera arriba y en la cola
    g.strokeStyle = '#e8ecf2'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(3, 4.4); g.lineTo(43, 4.4); g.moveTo(3, 5.8); g.lineTo(43, 5.8); g.stroke(); g.lineWidth = 0.3; for (let x = 4; x < 43; x += 1.8) { g.beginPath(); g.moveTo(x, 4.4); g.lineTo(x, 5.8); g.stroke(); }
    g.fillStyle = '#9aa0aa'; g.fillRect(6, 5.8, 0.6, 0.8); g.fillRect(38, 5.8, 0.6, 0.8);
    g.strokeStyle = '#d8dce4'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(0.4, 7); g.lineTo(0.4, 25); g.moveTo(1.6, 7); g.lineTo(1.6, 25); g.stroke(); for (let y = 8; y < 25; y += 1.6) { g.beginPath(); g.moveTo(0.4, y); g.lineTo(1.6, y); g.stroke(); }
    taillight(g, 1.2, 25.2, 1.6, 1.6);
    // cabina
    pathPts(g, [[42, 27], [42, 6], [53, 5.4], [57, 11], [61, 13.5], [62, 27]], 1.2); g.fillStyle = lin(g, 0, 5, 0, 27, [L, C, C, D]); g.fill();
    pathPts(g, [[44, 7.2], [52.4, 7], [55.6, 12.6], [44, 12.6]], 0.6); g.fillStyle = lin(g, 0, 7, 0, 12.6, ['#c8dcec', '#4a6680', '#6c8aa8']); g.fill();
    g.fillStyle = '#1a1a1e'; g.fillRect(48.6, 7, 0.9, 5.6); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(49, 13, 0.3, 11);
    g.fillStyle = SH(C, 0.7); rrect(g, 45, 14.6, 2.4, 0.7, 0.3); g.fill();
    g.fillStyle = '#1e1e24'; rrect(g, 46, 3.2, 11, 2, 0.6); g.fill(); g.fillStyle = '#e8302a'; rrect(g, 46.5, 3.4, 4.6, 1.4, 0.5); g.fill(); g.fillStyle = '#ffffff'; rrect(g, 51.6, 3.4, 4.6, 1.4, 0.5); g.fill();
    g.fillStyle = '#1a1a1e'; rrect(g, 60.6, 14.6, 1.8, 6, 0.4); g.fill(); headlight(g, 59, 14, 2.6, 2.6, false);
    g.fillStyle = lin(g, 0, 25, 0, 28, ['#3a3a40', '#18181c']); rrect(g, 41, 25.4, 22.6, 2.6, 0.6); g.fill();
    g.fillStyle = '#1e1e22'; g.fillRect(55.8, 9.6, 0.6, 3); g.beginPath(); g.ellipse(55.6, 9.2, 1, 1.4, 0, 0, Math.PI * 2); g.fill();
    for (const x of [11, 19, 52]) { g.fillStyle = '#0e0e10'; g.beginPath(); g.arc(x, 28, 6.4, Math.PI, 0); g.fill(); }
    for (const x of [11, 19, 52]) wheelHD(g, x, 28.4, 5.6, 'serie', true);
  };

  // ---------- karumbe ----------
  const karumbeHD = (g) => {
    const W = ['#b08858', '#8a6a44', '#5e4628'], HB = ['#a06a3a', '#7a4a28', '#4a2c16'];
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(34, 33, 30, 1.3, 0, 0, Math.PI * 2); g.fill();
    // carro
    g.fillStyle = lin(g, 0, 12, 0, 22, W); rrect(g, 3, 12.5, 31, 8, 0.6); g.fill();
    g.strokeStyle = 'rgba(60,40,20,.7)'; g.lineWidth = 0.3; for (let y = 14.5; y < 20.5; y += 2) { g.beginPath(); g.moveTo(3.2, y); g.lineTo(33.8, y); g.stroke(); }
    for (const x of [4.5, 12, 19.5, 27, 32.5]) { g.fillStyle = '#4a3420'; g.fillRect(x, 11.5, 0.9, 10); }
    g.fillStyle = '#4a3420'; g.fillRect(2.6, 11.2, 31.8, 1);
    g.fillStyle = lin(g, 0, 7, 0, 12.5, ['#e0c878', '#b89a50']); rrect(g, 7, 8, 7, 4.6, 1.4); g.fill();                 // bolsas
    g.fillStyle = lin(g, 0, 8, 0, 12.5, ['#86ae4a', '#4a7a2a']); g.beginPath(); g.ellipse(18, 10.6, 3.4, 2.4, 0, 0, Math.PI * 2); g.fill(); // mandioca y verdura
    g.fillStyle = '#c87a3a'; for (const x of [22.5, 24, 25.5]) { g.beginPath(); g.ellipse(x, 11.4, 0.6, 1.4, 0.5, 0, Math.PI * 2); g.fill(); }
    // carrero
    g.fillStyle = '#2c3e6b'; rrect(g, 28, 9.6, 5.4, 2.6, 0.8); g.fill(); g.fillRect(31.8, 9.6, 1.6, 5);
    g.fillStyle = lin(g, 27, 3, 33, 10, ['#f6f2e8', '#d8d2c0', '#a8a294']); rrect(g, 28.2, 3.6, 4.8, 6.4, 1.6); g.fill();
    g.fillStyle = '#c98b5c'; g.beginPath(); g.ellipse(31, 1.9, 1.5, 1.7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = lin(g, 0, -0.6, 0, 1.2, ['#f4e4a8', '#c8a860']); g.beginPath(); g.ellipse(31, 0.9, 3.6, 0.7, 0, 0, Math.PI * 2); g.fill(); rrect(g, 29.4, -1.2, 3.2, 2, 0.8); g.fill();
    g.strokeStyle = '#c98b5c'; g.lineWidth = 0.9; g.lineCap = 'round'; g.beginPath(); g.moveTo(32.4, 5); g.lineTo(35, 8.4); g.stroke();
    g.strokeStyle = '#3a2a1c'; g.lineWidth = 0.22; g.beginPath(); g.moveTo(35.2, 8.4); g.quadraticCurveTo(44, 10, 55, 9.5); g.stroke();   // riendas
    // vara y arnés
    g.strokeStyle = '#5a4430'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(33, 16.5); g.lineTo(49, 15); g.stroke();
    // caballo
    const legs = [[44.5, 0.06], [46.6, -0.12], [53.4, 0.1], [55.4, -0.08]];
    legs.forEach(([x, a], i) => { g.save(); g.translate(x, 18); g.rotate(a); g.fillStyle = lin(g, -1, 0, 1, 0, i % 2 ? [HB[1], HB[2]] : [HB[0], HB[1]]); rrect(g, -0.75, 0, 1.5, 10, 0.6); g.fill(); g.fillStyle = '#2a2420'; rrect(g, -0.9, 9.4, 1.8, 1.4, 0.4); g.fill(); g.restore(); });
    g.fillStyle = lin(g, 0, 11, 0, 20, [HB[0], HB[1], HB[2]]); g.beginPath(); g.ellipse(50, 15.4, 7.4, 4.4, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(54.6, 13); g.quadraticCurveTo(57.5, 8, 59.5, 4.6); g.lineTo(62.6, 6.2); g.quadraticCurveTo(59, 11, 57.6, 16); g.closePath(); g.fill();   // cuello
    g.beginPath(); g.ellipse(61.4, 6.6, 1.7, 2.8, 0.75, 0, Math.PI * 2); g.fill();                                                           // cabeza
    g.fillStyle = HB[2]; g.beginPath(); g.moveTo(59.6, 3.6); g.lineTo(60.2, 1.8); g.lineTo(60.8, 3.8); g.fill();
    g.strokeStyle = '#2a1a10'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(55, 12.2); g.quadraticCurveTo(57.6, 7.6, 59.4, 4.2); g.stroke();      // crin
    g.lineWidth = 1.2; g.beginPath(); g.moveTo(42.8, 13.4); g.quadraticCurveTo(41, 17, 41.8, 22); g.stroke();                                 // cola
    g.fillStyle = '#3a2a1c'; rrect(g, 47, 12.4, 1.2, 7.4, 0.4); g.fill(); rrect(g, 42.8, 14.6, 14, 0.9, 0.4); g.fill();                     // arnés
    g.fillStyle = '#101010'; g.beginPath(); g.arc(61.9, 5.6, 0.35, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(48.5, 13, 4.6, 1.3, -0.1, 0, Math.PI * 2); g.fill();
    // rueda grande de rayos
    g.save(); g.fillStyle = '#2a2018'; g.beginPath(); g.arc(19, 22.5, 9.4, 0, Math.PI * 2); g.arc(19, 22.5, 8.1, 0, Math.PI * 2, true); g.fill('evenodd');
    g.strokeStyle = '#6a5030'; g.lineWidth = 0.7; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.beginPath(); g.moveTo(19, 22.5); g.lineTo(19 + Math.cos(a) * 8.2, 22.5 + Math.sin(a) * 8.2); g.stroke(); }
    g.fillStyle = '#8a8e96'; g.beginPath(); g.arc(19, 22.5, 1.4, 0, Math.PI * 2); g.fill(); g.restore();
  };

  // ---------- motos ----------
  const motoHD = (g, kind, pal, t) => {
    const [C, D, L] = pal, S2 = VR.tunePal(t.color2 ?? 11)[0], FR = t.franja && t.franja !== 'no', LL = t.llantas || 'serie', xen = t.faros === 'xenon';
    const body = (pts, r = 1) => { pathPts(g, pts, r); g.fillStyle = lin(g, 0, Math.min(...pts.map((p) => p[1])), 0, Math.max(...pts.map((p) => p[1])), [SH(L, 1.05), C, C, D]); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.25; g.stroke(); };
    const tube = (pts, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };
    const chromeTube = (pts, w) => { tube(pts, w, '#7a7e88'); tube(pts, w * 0.55, '#e6eaf0'); tube(pts, w * 0.18, '#ffffff'); };
    const seat = (x, y, w, h, r = 1.4) => { rrect(g, x, y, w, h, [r, r, 0.5, 0.5]); g.fillStyle = lin(g, 0, y, 0, y + h, ['#4a4a52', '#26262a', '#18181c']); g.fill(); g.strokeStyle = 'rgba(255,255,255,.18)'; g.setLineDash([0.5, 0.5]); g.lineWidth = 0.18; g.beginPath(); g.moveTo(x + 1, y + 0.8); g.lineTo(x + w - 1, y + 0.8); g.stroke(); g.setLineDash([]); };
    const engine = (x, y, w, h) => { rrect(g, x, y, w, h, 1); g.fillStyle = lin(g, x, y, x + w, y + h, ['#c8ccd4', '#8a8e96', '#5a5e66']); g.fill(); g.strokeStyle = '#4a4e56'; g.lineWidth = 0.3; for (let yy = y + 1; yy < y + h * 0.6; yy += 0.9) { g.beginPath(); g.moveTo(x + 0.6, yy); g.lineTo(x + w * 0.7, yy); g.stroke(); } g.fillStyle = '#3a3a40'; g.beginPath(); g.arc(x + w * 0.65, y + h * 0.72, h * 0.22, 0, Math.PI * 2); g.fill(); g.fillStyle = '#9aa0a8'; g.beginPath(); g.arc(x + w * 0.65, y + h * 0.72, h * 0.12, 0, Math.PI * 2); g.fill(); };
    const shock = (x0, y0, x1, y1) => { tube([[x0, y0], [x1, y1]], 1, '#2a2a30'); g.strokeStyle = '#d83a2a'; g.lineWidth = 0.35; const n = 7; for (let i = 0; i <= n; i++) { const k = 0.15 + i / n * 0.7, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k; g.beginPath(); g.moveTo(x - 0.9, y + 0.3); g.lineTo(x + 0.9, y - 0.3); g.stroke(); } };
    const chain = (x0, x1, y) => { g.strokeStyle = '#3a3a40'; g.lineWidth = 0.6; g.setLineDash([0.4, 0.3]); g.beginPath(); g.moveTo(x0, y - 1.2); g.lineTo(x1, y - 0.8); g.moveTo(x0, y + 1.2); g.lineTo(x1, y + 0.8); g.stroke(); g.setLineDash([]); };
    const mirror = (x, y) => { tube([[x, y + 3], [x - 0.6, y]], 0.3, '#9aa0a8'); g.fillStyle = '#26262c'; g.beginPath(); g.ellipse(x - 0.7, y - 0.4, 1, 0.7, -0.2, 0, Math.PI * 2); g.fill(); g.fillStyle = '#8aa0b8'; g.beginPath(); g.ellipse(x - 0.8, y - 0.5, 0.6, 0.4, -0.2, 0, Math.PI * 2); g.fill(); };
    const shadow = (x0, x1) => { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse((x0 + x1) / 2, 33.6, (x1 - x0) / 2, 1, 0, 0, Math.PI * 2); g.fill(); };
    if (kind === 'cub') {
      neonGlow(g, 12, 50, 32, t); shadow(4, 58);
      motoWheel(g, 12, 27.5, 6, LL);
      tube([[12, 27.5], [26, 25]], 1.3, '#2a2a30'); chain(14, 26, 26.4); shock(15, 16, 13, 26);
      engine(23, 19.5, 9, 6.5);
      chromeTube([[30, 25.5], [22, 25.4], [8, 24.2]], 1.2); if (t.escape === 'deportivo') { chromeTube([[10, 23], [5, 22.2]], 1.6); } else { g.fillStyle = '#4a4e56'; rrect(g, 7, 23.2, 2.4, 1.6, 0.6); g.fill(); }
      body([[6, 20], [9, 15.6], [15, 14.2], [34, 14.6], [37, 17.5], [33, 21], [26, 21.8], [14, 22.6], [8, 22.8]], 1.6);    // carenado trasero largo
      if (FR) { g.fillStyle = S2; g.beginPath(); g.moveTo(12, 18); g.lineTo(33, 16.6); g.lineTo(32, 18.2); g.lineTo(12, 19.4); g.fill(); }
      else { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(14, 18, 16, 0.5); }
      seat(13, 11.6, 21, 3.2, 1.6);
      g.fillStyle = '#2a2a30'; rrect(g, 34, 21.2, 9, 1.4, 0.5); g.fill();                                               // piso
      body([[37, 22.5], [41, 15], [45.5, 9.5], [49, 8.6], [50.5, 10.5], [46, 18], [42.5, 23.4]], 1.4);                 // escudo
      chromeTube([[48.2, 9.5], [50, 27.5]], 1.1); motoWheel(g, 50, 27.5, 6, LL);
      g.fillStyle = C; rrect(g, 46.6, 20.4, 7.2, 1.6, 0.8); g.fill();                                                  // guardabarros
      tube([[44.5, 7.2], [51.5, 6.4]], 0.8, '#2a2a2e'); mirror(46, 4.2);
      body([[47.6, 7.6], [52.6, 7], [53.8, 10.2], [49.8, 11.2]], 0.8); headlight(g, 51.6, 8, 2.6, 2.4, xen, 0.9);
      taillight(g, 5.2, 18.2, 2.6, 1.8);
    } else if (kind === 'mini') {
      neonGlow(g, 12, 50, 32, t); shadow(4, 58);
      motoWheel(g, 13, 26.5, 7.2, LL, false); tube([[13, 26.5], [27, 24]], 1.3, '#2a2a30'); chain(15, 27, 25.4); shock(18, 15.5, 15, 25);
      engine(25, 18.4, 10, 7);
      if (t.escape === 'deportivo') chromeTube([[33, 24.6], [20, 22.6], [9, 19.2]], 1.6); else chromeTube([[33, 24.6], [24, 24.2], [16, 21.4]], 1.2);
      body([[4, 14.6], [8, 11.8], [27, 11.6], [27, 15.6], [10, 16.8], [5, 17]], 1.2); seat(8, 10.4, 19, 2.6, 1.2);
      body([[25, 13.6], [28.5, 10.2], [40, 9.6], [44.6, 13.6], [42, 19.6], [28.6, 20.4]], 2.2);                       // tanque gordo
      if (FR) { g.fillStyle = S2; g.fillRect(28.5, 13.2, 14, 1.4); if (t.franja === 'carrera') g.fillRect(28.5, 15.4, 13, 0.9); }
      g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(33, 11.6, 4, 0.8, -0.05, 0, Math.PI * 2); g.fill();
      chromeTube([[44.5, 9], [48.8, 26.5]], 1.4); motoWheel(g, 49, 26.5, 7.2, LL, false);
      g.fillStyle = C; rrect(g, 44.2, 18.2, 9, 1.8, 0.9); g.fill();
      tube([[42.5, 4.4], [49, 4]], 0.8, '#2a2a2e'); mirror(43.6, 2);
      g.fillStyle = '#26262c'; g.beginPath(); g.arc(50.2, 9.6, 3.5, 0, Math.PI * 2); g.fill(); g.fillStyle = lin(g, 47, 7, 53, 12, xen ? ['#ffffff', '#cfe4ff', '#7aa8e0'] : ['#ffffff', '#fff2c0', '#c8a860']); g.beginPath(); g.arc(50.6, 9.6, 2.6, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(49.8, 8.8, 0.8, 0, Math.PI * 2); g.fill();
      taillight(g, 3.6, 14.4, 2, 1.8);
    } else if (kind === 'calle') {
      neonGlow(g, 12, 52, 32, t); shadow(4, 60);
      motoWheel(g, 12, 26.5, 7, LL, LL === 'serie' ? false : LL === 'cromadas'); tube([[12, 26.5], [29, 22]], 1.4, '#2a2a30'); chain(14, 29, 24.8); shock(22, 14.6, 17, 23.6);
      tube([[29, 21], [33, 10.5], [46, 9.6]], 1, '#2a2a30');                                                                 // chasis
      engine(28, 15.6, 13, 8.4);
      for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#6a6e76' : '#c8ccd4'; g.fillRect(29.5 + i * 1.6, 15.8, 0.8, 4); }
      chromeTube([[34, 23.6], [26, 24], [10, 20.6]], 1.4); if (t.escape === 'deportivo') { chromeTube([[16, 21.4], [4, 18.4]], 2.2); g.fillStyle = '#101012'; g.beginPath(); g.ellipse(3.8, 18.3, 0.5, 1, 0.25, 0, Math.PI * 2); g.fill(); } else { chromeTube([[14, 21], [6, 19.2]], 1.9); }
      body([[3, 13.8], [10, 11.4], [16, 11.2], [15.6, 14.4], [9, 15.6], [4, 15.6]], 0.8);                           // colín
      g.strokeStyle = CHROME[2]; g.lineWidth = 0.5; g.beginPath(); g.moveTo(3, 10.6); g.lineTo(11, 9.6); g.moveTo(3.4, 10.6); g.lineTo(4, 13.6); g.stroke();   // parrilla
      seat(10, 9.8, 18, 2.6, 1.2);
      body([[26, 11.6], [28.6, 7.4], [42, 6.8], [46.6, 10.2], [45, 15.4], [30, 16]], 2.2);                             // tanque grande
      g.fillStyle = FR ? S2 : L; g.fillRect(29, 10.2, 15.6, FR && t.franja === 'centro' ? 2.4 : 1.2); if (FR && t.franja === 'carrera') g.fillRect(29, 12.4, 15, 0.9);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(35, 8.2, 5, 0.8, -0.05, 0, Math.PI * 2); g.fill();
      chromeTube([[46.6, 6], [51.4, 26.5]], 1.3); motoWheel(g, 51, 26.5, 7, LL, LL === 'serie' ? false : LL === 'cromadas');
      g.fillStyle = C; rrect(g, 46.4, 18.4, 9, 1.7, 0.85); g.fill();
      tube([[43.6, 4.2], [50.4, 3.4]], 0.8, '#2a2a2e'); mirror(45.2, 1.6);
      body([[48, 5.4], [54.6, 5.2], [56.4, 9.6], [55, 13.4], [50, 13]], 1);                                              // visera y faro
      headlight(g, 52.6, 7.6, 3.2, 3.4, xen, 1); g.fillStyle = 'rgba(160,190,220,.5)'; g.beginPath(); g.moveTo(49, 5.4); g.lineTo(53.4, 2.6); g.lineTo(54.6, 5.2); g.fill();
      taillight(g, 2.4, 12.6, 2.2, 1.8);
    } else if (kind === 'carga') {
      neonGlow(g, 8, 56, 32, t); shadow(2, 62);
      motoWheel(g, 12, 27.5, 5.6, LL, false);
      g.fillStyle = lin(g, 0, 7, 0, 23, [L, C, C, D]); rrect(g, 1.4, 8, 33, 14.6, 0.6); g.fill();                    // caja
      g.strokeStyle = SH(C, 0.6); g.lineWidth = 0.35; for (let x = 4; x < 34; x += 5) { g.beginPath(); g.moveTo(x, 8.4); g.lineTo(x, 22.4); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(1.6, 8.3, 32.6, 0.4);
      if (FR) { g.fillStyle = S2; g.fillRect(1.6, 16.6, 32.6, 1.6); }
      g.fillStyle = D; for (let x = 2; x < 35; x += 4) g.fillRect(x, 3.6, 0.8, 4.6); g.fillRect(1.4, 3.2, 33, 0.9);   // barandas
      g.fillStyle = '#2a2a30'; g.fillRect(1.4, 22.4, 33, 1.4);
      tube([[35, 22], [36, 4]], 1.2, '#3a3a40');                                                                           // respaldo
      engine(37, 18.6, 9, 6.4); chromeTube([[44, 24.6], [36, 24.4]], 1.1);
      seat(36.4, 13.6, 12, 2.6, 1.2);
      body([[40, 13.4], [43, 10.6], [51.6, 10.4], [52, 15], [44, 16.6]], 1.6);
      chromeTube([[50.4, 8.4], [54.6, 28]], 1.2); motoWheel(g, 55, 28, 5.2, LL, false);
      g.fillStyle = C; rrect(g, 51, 20.8, 8, 1.6, 0.8); g.fill();
      tube([[48, 6.4], [54.6, 5.8]], 0.8, '#2a2a2e'); mirror(49.4, 3.6);
      headlight(g, 54.8, 9, 3, 3, xen, 1);
      taillight(g, 0.6, 9.4, 1.6, 2.4);
    } else if (kind === 'pati') {
      neonGlow(g, 10, 52, 32, t); shadow(6, 56);
      motoWheel(g, 12, 29, 4.2, LL, false); motoWheel(g, 50, 29, 4.2, LL, false);
      g.fillStyle = lin(g, 0, 25, 0, 28.6, ['#4a4a52', '#26262a', '#18181c']); rrect(g, 11, 25.4, 38, 3, 1.2); g.fill();    // tabla
      g.fillStyle = C; rrect(g, 12, 25.2, 36, 1, 0.5); g.fill();
      g.fillStyle = '#3a3a42'; for (let x = 15; x < 46; x += 2) g.fillRect(x, 25.6, 1, 0.3);
      tube([[48, 25.5], [50.6, 3.6]], 1.6, '#3a3a42'); tube([[48, 25.5], [50.6, 3.6]], 0.5, C);
      tube([[46.4, 3.2], [55.4, 2.6]], 1, '#2a2a2e'); g.fillStyle = '#d8dce4'; rrect(g, 45.6, 2.4, 1.8, 1.4, 0.5); g.fill(); rrect(g, 54.4, 1.8, 1.8, 1.4, 0.5); g.fill();
      headlight(g, 50.6, 8.6, 2.2, 1.8, xen, 0.7); taillight(g, 9.4, 25, 2, 1.4);
      tube([[12, 29], [14, 26]], 0.8, '#2a2a30');
    }
  };

  // ---------- colectivos (10/11/2026) ----------
  // Pintura por colores y silueta, sin logos, letras ni nombres de empresa (regla del proyecto). Frente a la derecha.
  const busWheels = (g, xs, r, cy) => { for (const x of xs) { g.fillStyle = '#0e0e10'; g.beginPath(); g.arc(x, cy, r + 1.3, Math.PI, 0); g.fill(); } for (const x of xs) wheelHD(g, x, cy, r, 'serie', true); }; // arcos y ruedas
  const busGlass = (g, a, b, y0, y1, dark) => { rrect(g, a, y0, b - a, y1 - y0, 0.9); g.fillStyle = lin(g, 0, y0, 0, y1, dark ? ['#3a4a5e', '#10161e', '#0a0e14'] : ['#7a96b0', '#26364a', '#14202e']); g.fill(); g.fillStyle = 'rgba(255,255,255,.26)'; g.beginPath(); g.moveTo(a + 2, y1); g.lineTo(a + 5, y0); g.lineTo(a + 6.6, y0); g.lineTo(a + 3.6, y1); g.fill(); };
  // Colectivo urbano blanco con franjas verde, roja y amarilla
  const busIndepHD = (g, pal) => {
    const [C, D, L] = pal, GRN = '#1f8a3c', RED = '#d02a26', YEL = '#f0c828';
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(32, 34.2, 31, 1.2, 0, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(0, 28.2); g.scale(1, 0.92); g.translate(0, -26.4); // más bajo y largo, como el colectivo de verdad
    g.save();
    pathPts(g, [[2, 26.4], [2, 6.4], [4, 4.6], [58, 4.6], [61.2, 6.4], [62.4, 10], [62.4, 26.4]], 1.4); g.fillStyle = lin(g, 0, 4.6, 0, 26.4, [L, C, C, D]); g.fill(); g.clip();
    g.fillStyle = GRN; g.fillRect(0, 4.6, 64, 1.5); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 4.8, 64, 0.35);   // franja verde del techo
    g.save(); g.beginPath(); g.rect(0, 16.4, 64, 12); g.clip();                                                         // franjas en diagonal
    const sw = (dy, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(66, 28.6 + dy); g.bezierCurveTo(46, 24.8 + dy, 26, 24 + dy, -2, 17.4 + dy); g.stroke(); };
    sw(1.9, 3.4, GRN); sw(-1.2, 2.1, RED); sw(-3.3, 1.7, YEL); sw(-5.3, 0.9, RED);
    g.fillStyle = GRN; g.beginPath(); g.moveTo(64, 27); g.lineTo(64, 15.6); g.bezierCurveTo(58, 16.6, 54, 20, 50, 27); g.closePath(); g.fill(); // trompa verde
    g.strokeStyle = YEL; g.lineWidth = 0.6; g.beginPath(); g.moveTo(64, 15.6); g.bezierCurveTo(58, 16.6, 54, 20, 50, 27); g.stroke();
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(2, 16.5, 61, 0.3);
    for (const [a, b] of [[5.2, 16.2], [17.6, 28.6], [30, 41], [42.4, 51.4]]) {                                         // ventanillas corredizas
      busGlass(g, a, b, 8, 16);
      g.strokeStyle = 'rgba(245,245,245,.9)'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(a, 12); g.lineTo(b, 12); g.stroke();
    }
    busGlass(g, 53.6, 60.4, 8, 24); g.strokeStyle = '#f2f0ea'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(57, 8); g.lineTo(57, 24); g.stroke(); // puerta de adelante
    g.fillStyle = '#c8ccd4'; g.fillRect(56.2, 15, 0.5, 2.4); g.fillRect(57.4, 15, 0.5, 2.4);
    g.restore();
    g.fillStyle = '#2a2a2e'; rrect(g, 1.2, 25.6, 62.4, 1.8, 0.6); g.fill();                                           // paragolpes
    g.fillStyle = lin(g, 0, 2.6, 0, 4.6, ['#e8ecf2', '#9aa0aa']); rrect(g, 25, 2.9, 9, 1.8, 0.7); g.fill();          // ventilación del techo
    g.fillStyle = '#1e1e22'; rrect(g, 61, 7.6, 2.6, 6.4, 1); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(61.4, 8, 0.5, 4);   // espejo grande
    headlight(g, 60.6, 19.6, 3, 2.8, false, 0.9); taillight(g, 0.4, 20.4, 1.8, 3.4);
    g.restore();
    busWheels(g, [16.6, 49.6], 5.1, 29.4);
  };
  // Micro de larga distancia: blanco, trompa roja, franjas amarilla, naranja y azul
  const busGuaiHD = (g, pal) => {
    const [C, D, L] = pal, NAVY = '#2a2f8c', ORG = '#ee7a14', YEL = '#f4b81c';
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(32, 34.4, 31.4, 1.2, 0, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(0, 28.4); g.scale(1, 0.9); g.translate(0, -26.4); // bajo y largo, de ruta
    g.save();
    pathPts(g, [[1.6, 26.4], [1.6, 5.8], [3.4, 3.6], [53, 3.4], [57.4, 4.6], [61.8, 15], [62.8, 26.4]], 1.6); g.fillStyle = lin(g, 0, 3.4, 0, 26.4, [L, C, C, D]); g.fill(); g.clip();
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(2, 4.2, 54, 0.35);
    busGlass(g, 4, 55.4, 6.4, 16.2, true);                                                                             // ventanas panorámicas
    g.fillStyle = C; for (const x of [14.2, 24.4, 34.6, 44.8]) g.fillRect(x, 6.4, 0.55, 9.8);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(8, 16.2); g.lineTo(13, 6.4); g.lineTo(16, 6.4); g.lineTo(11, 16.2); g.fill();
    g.beginPath(); g.moveTo(30, 16.2); g.lineTo(35, 6.4); g.lineTo(37.4, 6.4); g.lineTo(32.4, 16.2); g.fill();
    g.beginPath(); g.moveTo(55.4, 5.6); g.lineTo(58.6, 5.4); g.lineTo(62, 14.8); g.lineTo(62, 16.8); g.lineTo(55.8, 16.8); g.closePath();   // parabrisas
    g.fillStyle = lin(g, 0, 5.4, 0, 16.8, ['#6f8aa4', '#1b2634', '#0e141c']); g.fill();
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(56, 6.6, 3.6, 0.9);
    g.save(); g.beginPath(); g.rect(0, 16.6, 64, 12); g.clip();                                                         // pintura de abajo
    g.fillStyle = NAVY; g.fillRect(1.6, 16.4, 4.6, 11);
    g.fillStyle = lin(g, 0, 16.4, 0, 27, ['#ffd24a', YEL, '#d89a10']); g.beginPath(); g.moveTo(6, 16.4); g.lineTo(40, 16.4); g.lineTo(47, 27); g.lineTo(6, 27); g.fill();
    g.fillStyle = ORG; g.beginPath(); g.moveTo(40, 16.4); g.lineTo(44.2, 16.4); g.lineTo(51.2, 27); g.lineTo(47, 27); g.fill();
    g.fillStyle = NAVY; g.beginPath(); g.moveTo(46.2, 16.4); g.lineTo(49.6, 16.4); g.lineTo(56.6, 27); g.lineTo(53.2, 27); g.fill();
    g.fillStyle = NAVY; g.fillRect(1.6, 24.4, 60, 2.6);                                                                 // zócalo azul
    g.fillStyle = lin(g, 0, 15.6, 0, 27, ['#e04a4a', '#c4262e', '#8e1a20']); g.beginPath(); g.moveTo(64, 27); g.lineTo(64, 15.4); g.lineTo(60, 16.6); g.lineTo(56.2, 27); g.fill(); // trompa roja
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 0.25; for (const x of [16, 28]) { g.beginPath(); g.moveTo(x, 17.4); g.lineTo(x, 24); g.stroke(); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 0.8, 20, 1.6, 0.4); } // bodegas
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(2, 16.8, 58, 0.3);
    g.restore();
    g.fillStyle = '#2a2a2e'; rrect(g, 1.2, 25.8, 62.6, 1.6, 0.6); g.fill();
    g.fillStyle = lin(g, 0, 1.4, 0, 3.6, ['#e8ecf2', '#8a909a']); rrect(g, 21, 1.8, 16, 2, 0.8); g.fill();            // aire acondicionado
    g.fillStyle = '#c4262e'; rrect(g, 59.4, 8.6, 3.8, 2.4, 1); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(60, 9, 2, 0.5);   // espejo rojo
    headlight(g, 60.8, 18, 3.4, 2.4, false, 0.8); taillight(g, 0.4, 19.4, 1.8, 3.6);
    g.restore();
    busWheels(g, [16, 49], 5.2, 29.6);
  };

  VR.drawSideHD = (kind, pal, t = {}, W = 320, H = 180) => {
    const c = VR.canvas(W, H), g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.scale(W / 64, H / 36);
    if (kind === 'car') kind = 'mita';
    if (kind === 'karumbe') karumbeHD(g);
    else if (kind === 'busindep') busIndepHD(g, pal);
    else if (kind === 'busguai') busGuaiHD(g, pal);
    else if (kind === 'bomba') bombaHD(g, pal);
    else if (VR.CAR_MODELS[kind]) carHD(g, kind, pal, t);
    else motoHD(g, kind, pal, t);
    return c;
  };
})();
