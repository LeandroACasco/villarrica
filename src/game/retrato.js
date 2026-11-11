// Caritas de diálogo (11/11/2026): el mismo avatar del juego, dibujado grande (k = 16) y con una cara propia
// (ojos con iris y brillo, cejas, nariz, boca y arrugas) que cambia de expresión. Solo se usa en los diálogos:
// la tienda y el juego usan el avatar normal (`VR.av2Render` sin `_face`, nada cambia).
(function () {
  const EXPR = { // bt: inclinación de las cejas (+ = punta de adentro hacia abajo), by: altura de cejas, eo: apertura de ojos, boca
    neutral: { bt: 0, by: 0, eo: 1, m: 'n' }, feliz: { bt: -0.05, by: -0.08, eo: 0.55, m: 'f', squint: true }, enojado: { bt: 0.42, by: 0.1, eo: 0.72, m: 'e' },
    triste: { bt: -0.42, by: 0.02, eo: 0.82, m: 't' }, sorpresa: { bt: -0.1, by: -0.32, eo: 1.3, m: 'o' }, duda: { bt: 0.18, by: -0.04, eo: 0.9, m: 'd', one: true },
  };
  const EDAD = { ramona: 'mayor', cirilo: 'mayor', chela: 'mayor' };
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const cache = new Map();
  function face(E, open, edad, ojos, pass) {
    const p1 = pass !== 2, p2 = pass !== 1;
    return (c) => {
      const { hx, hy, paint, SH, skin, hair, fem, L } = c, ey = hy + 0.05, flat = { flat: true, sep: false, light: false };
      const dark = '#1a1410', lum = (h) => { const v = hex(h); return v[0] * 0.3 + v[1] * 0.6 + v[2] * 0.1; };
      const ell = (x, y, rx, ry, r = 0) => (g) => { g.beginPath(); g.ellipse(x, y, rx, ry, r, 0, 7); g.fill(); };
      const line = (w, pts) => (g) => { g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0], pts[1]); if (pts.length === 6) g.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); else g.lineTo(pts[2], pts[3]); g.stroke(); };
      const lipC = fem ? '#b2444a' : SH(skin, 0.55), browC = lum(hair) > 150 ? '#8a7a68' : SH(hair, 0.85);
      // mejillas (mujeres y cuando está contento)
      if (p1 && (fem || E.m === 'f')) for (const s of [-1, 1]) paint(ell(hx + s * 1.2, hy + 1.0, 0.42, 0.24), mix(skin, '#e0606a', fem ? 0.28 : 0.2), flat);
      // barba (antes de la boca)
      const bc = SH(hair, 0.95);
      if (p1 && L.beard === 'barba') paint(ell(hx, hy + 1.85, 1.5, 0.95), bc, flat);
      if (p1 && (L.beard === 'candado' || L.beard === 'chivita')) paint(ell(hx, hy + 2.05, 0.5, 0.42), bc, flat);
      // ojos
      if (p2) for (const s of [-1, 1]) {
        const x = hx + s * 0.9;
        if (E.squint) { paint(line(0.17, [x - 0.46, ey + 0.1, x, ey - 0.38, x + 0.46, ey + 0.1]), dark, flat); }
        else {
          const ry = 0.3 * E.eo;
          paint(ell(x, ey, 0.48, ry), '#f6f2ea', flat);
          paint(ell(x + s * -0.02, ey + 0.02, 0.25, Math.min(0.27, ry * 0.95)), ojos, flat);
          paint(ell(x, ey + 0.02, 0.12, Math.min(0.13, ry * 0.5)), '#0d0a08', flat);
          paint(ell(x - 0.09, ey - 0.07, 0.065, 0.065), '#fff', flat);
          paint((g) => { g.lineWidth = fem ? 0.17 : 0.13; g.lineCap = 'round'; g.beginPath(); g.ellipse(x, ey, 0.5, ry + 0.03, 0, Math.PI * 1.02, Math.PI * 1.98); g.stroke(); }, dark, flat);
          if (fem) paint(line(0.09, [x + s * 0.45, ey - 0.06, x + s * 0.68, ey - 0.2]), dark, flat);
          paint((g) => { g.lineWidth = 0.06; g.beginPath(); g.ellipse(x, ey + 0.02, 0.45, ry, 0, 0.15, Math.PI - 0.15); g.stroke(); }, SH(skin, 0.72), flat);
        }
        if (edad) paint(line(0.05, [x + s * 0.55, ey + 0.05, x + s * 0.85, ey + 0.0]), SH(skin, 0.72), flat), paint(line(0.05, [x + s * 0.55, ey + 0.18, x + s * 0.82, ey + 0.3]), SH(skin, 0.72), flat);
      }
      // cejas
      if (p2) for (const s of [-1, 1]) {
        const lift = E.one && s > 0 ? -0.22 : 0, yI = hy - 0.62 + E.by + E.bt * 0.45 + lift, yO = hy - 0.62 + E.by - E.bt * 0.25 + lift;
        paint(line(fem ? 0.15 : 0.22, [hx + s * 0.3, yI, hx + s * 0.85, Math.min(yI, yO) - 0.1, hx + s * 1.45, yO + 0.05]), browC, flat);
      }
      // nariz
      if (p1) paint(line(0.12, [hx - 0.26, hy + 0.88, hx, hy + 1.0, hx + 0.26, hy + 0.88]), SH(skin, 0.6), flat);
      if (p1) paint(line(0.08, [hx + 0.12, hy + 0.35, hx + 0.2, hy + 0.8]), SH(skin, 0.82), flat);
      if (p1 && edad) for (const s of [-1, 1]) paint(line(0.06, [hx + s * 0.95, hy + 1.0, hx + s * 1.1, hy + 1.6]), SH(skin, 0.74), flat);
      // bigote / candado
      if (p1 && (L.beard === 'bigote' || L.beard === 'candado')) { paint(ell(hx - 0.45, hy + 1.22, 0.55, 0.2, -0.2), bc, flat); paint(ell(hx + 0.45, hy + 1.22, 0.55, 0.2, 0.2), bc, flat); }
      // boca
      const my = hy + 1.62;
      const M = E.m;
      if (!p1) { /* la boca va en el primer pase */ } else if (open) {
        const rx = M === 'o' ? 0.34 : M === 'f' ? 0.62 : 0.5, ry = M === 'o' ? 0.46 : 0.3;
        paint(ell(hx, my + 0.05, rx, ry), '#3a1410', flat);
        if (M !== 'o') paint((g) => { g.beginPath(); g.rect(hx - rx * 0.8, my - ry * 0.85, rx * 1.6, ry * 0.5); g.fill(); }, '#f2eee4', flat);
        paint(ell(hx, my + ry * 0.55, rx * 0.55, ry * 0.4), '#c0605a', flat);
        paint((g) => { g.lineWidth = 0.1; g.beginPath(); g.ellipse(hx, my + 0.05, rx + 0.03, ry + 0.03, 0, 0, 7); g.stroke(); }, lipC, flat);
      } else if (M === 'f') {
        paint((g) => { g.beginPath(); g.moveTo(hx - 0.65, my - 0.05); g.quadraticCurveTo(hx, my + 0.62, hx + 0.65, my - 0.05); g.closePath(); g.fill(); }, '#f2eee4', flat);
        paint(line(0.13, [hx - 0.68, my - 0.08, hx, my + 0.5, hx + 0.68, my - 0.08]), lipC, flat);
      } else if (M === 'o') paint((g) => { g.lineWidth = 0.14; g.beginPath(); g.ellipse(hx, my + 0.05, 0.26, 0.34, 0, 0, 7); g.stroke(); }, lipC, flat);
      else if (M === 'e') paint(line(0.14, [hx - 0.5, my + 0.12, hx, my - 0.06, hx + 0.5, my + 0.12]), lipC, flat);
      else if (M === 't') paint(line(0.14, [hx - 0.5, my + 0.15, hx, my - 0.1, hx + 0.5, my + 0.15]), lipC, flat);
      else if (M === 'd') paint(line(0.14, [hx - 0.5, my + 0.1, hx, my, hx + 0.5, my - 0.12]), lipC, flat);
      else paint(line(0.14, [hx - 0.48, my - 0.02, hx, my + 0.16, hx + 0.48, my - 0.02]), lipC, flat);
      // lentes
      if (p2 && L.lentes) { paint((g) => { g.beginPath(); for (const s of [-1, 1]) { g.roundRect ? g.roundRect(hx + (s < 0 ? -1.95 : 0.2), ey - 0.32, 1.75, 0.82, 0.25) : g.rect(hx + (s < 0 ? -1.95 : 0.2), ey - 0.32, 1.75, 0.82); } g.fill(); g.fillRect(hx - 0.25, ey - 0.15, 0.5, 0.14); }, '#16161c', flat); paint(line(0.07, [hx - 1.7, ey - 0.15, hx - 1.3, ey - 0.15]), '#6a7890', flat); }
      if (p2 && L.anteojos) paint((g) => { g.lineWidth = 0.11; g.beginPath(); for (const s of [-1, 1]) { g.roundRect ? g.roundRect(hx + (s < 0 ? -1.9 : 0.15), ey - 0.4, 1.75, 0.95, 0.3) : g.rect(hx + (s < 0 ? -1.9 : 0.15), ey - 0.4, 1.75, 0.95); } g.moveTo(hx - 0.15, ey - 0.05); g.lineTo(hx + 0.15, ey - 0.05); g.stroke(); }, '#2a2420', flat);
    };
  }
  // look: el del personaje; id: para el caché; exp: neutral | feliz | enojado | triste | sorpresa | duda; open: boca abierta (hablando)
  VR.retrato = (look, id, exp, open, color) => {
    const key = (id || JSON.stringify(look)) + '|' + exp + '|' + (open ? 1 : 0);
    if (id && cache.has(key)) return cache.get(key);
    const E = EXPR[exp] || EXPR.neutral, K = 16, L = Object.assign({}, VR.AV2_DEFAULT, look, { _face: null });
    const ojos = look.ojos || (L.skin >= 4 ? '#2a1a10' : L.hairColor === 4 || L.hairColor === 8 ? '#4a7a98' : '#4a2e1a');
    L._face = face(E, open, EDAD[id], ojos, 1); L._face2 = face(E, open, EDAD[id], ojos, 2);
    const full = VR.av2Render(L, 'down', 'idle', 0, K), S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const col = color || '#ffd84a', gr = g.createRadialGradient(S / 2, S * 0.35, 4, S / 2, S / 2, S * 0.8); gr.addColorStop(0, col); gr.addColorStop(1, '#14161c'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(full, 3 * K, 0.5 * K, 10 * K, 10 * K, 0, 4, S, S);
    const v = g.createLinearGradient(0, S * 0.7, 0, S); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = v; g.fillRect(0, 0, S, S);
    if (id) cache.set(key, c); return c;
  };
})();
