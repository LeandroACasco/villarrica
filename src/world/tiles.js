// Tiles generados por código (16×16), con 4 variantes cada uno para que el piso no se vea repetido.
'use strict';
VR.T = { GRASS: 0, ROAD: 1, SIDEWALK: 2, BUILDING: 3, PAVING: 4, TREE: 5, MONUMENT: 6, DIRT: 7 };
VR.SOLID = new Uint8Array(16); VR.SOLID[VR.T.BUILDING] = 1; VR.SOLID[VR.T.TREE] = 1; VR.SOLID[VR.T.MONUMENT] = 1;
// tile que se dibuja debajo de cada tipo
VR.GROUND_OF = { [VR.T.TREE]: VR.T.GRASS, [VR.T.BUILDING]: VR.T.SIDEWALK, [VR.T.MONUMENT]: VR.T.PAVING };

VR.tileset = (() => {
  const S = VR.TILE, VARS = 4, TYPES = 8;
  const c = VR.canvas(S * VARS, S * TYPES), ctx = c.getContext('2d');
  const img = ctx.createImageData(c.width, c.height), d = img.data;
  const put = (x, y, r, g, b) => { const i = (y * c.width + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; };
  const n = (x, y, s) => VR.hash(x, y, s);
  for (let t = 0; t < TYPES; t++) for (let v = 0; v < VARS; v++) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const gx = v * S + x, gy = t * S + y, h = n(gx, gy, t * 7 + 1), h2 = n(gx, gy, t * 13 + 5);
    let r, g, b;
    switch (t) {
      case VR.T.GRASS: {
        r = 92; g = 158; b = 58;
        if (h < 0.18) { r -= 18; g -= 22; b -= 10; } else if (h > 0.9) { r += 22; g += 22; b += 8; }
        if (h2 > 0.985) { r = 222; g = 214; b = 96; } // florcitas
        break;
      }
      case VR.T.ROAD: {
        const k = (h - 0.5) * 12 | 0; r = 76 + k; g = 76 + k; b = 84 + k;
        if (h2 > 0.992) { r -= 22; g -= 22; b -= 22; }
        break;
      }
      case VR.T.SIDEWALK: {
        const k = (h - 0.5) * 10 | 0; r = 190 + k; g = 182 + k; b = 166 + k;
        if (x % 8 === 0 || y % 8 === 0) { r -= 26; g -= 26; b -= 26; }
        break;
      }
      case VR.T.PAVING: { // baldosas rojizas de plaza, en damero
        const k = (h - 0.5) * 10 | 0, alt = ((x >> 2) + (y >> 2) + v) & 1;
        r = (alt ? 196 : 182) + k; g = (alt ? 146 : 132) + k; b = (alt ? 108 : 98) + k;
        if (x % 4 === 0 || y % 4 === 0) { r -= 22; g -= 22; b -= 20; }
        break;
      }
      case VR.T.DIRT: { // tierra colorada
        const k = (h - 0.5) * 16 | 0; r = 168 + k; g = 92 + k; b = 58 + k;
        if (h2 > 0.96) { r += 20; g += 16; b += 12; }
        break;
      }
      default: r = 255; g = 0; b = 255;
    }
    put(gx, gy, r, g, b);
  }
  ctx.putImageData(img, 0, 0);
  return { canvas: c, VARS, draw(dst, type, v, x, y) { dst.drawImage(c, (v % VARS) * S, type * S, S, S, x, y, S, S); } };
})();

// Copas de árboles pre-dibujadas (círculos con luz arriba a la izquierda y contorno oscuro).
VR.canopy = (() => {
  const cache = new Map();
  const PAL = [
    [[48, 102, 40], [72, 138, 52], [110, 176, 70]],
    [[40, 94, 52], [62, 128, 64], [98, 166, 84]],
    [[70, 104, 36], [104, 140, 46], [150, 182, 70]], // lapacho sin flor / más amarillento
    [[150, 52, 120], [196, 82, 158], [236, 140, 200]], // lapacho rosado
  ];
  return (r, pal) => {
    const key = r + ':' + pal;
    let c = cache.get(key);
    if (c) return c;
    const S = r * 2 + 3;
    c = VR.canvas(S, S);
    const x = c.getContext('2d'), P = PAL[pal % PAL.length];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const q = dx * dx + dy * dy;
      // borde irregular
      const edge = r * r * (0.82 + 0.18 * VR.hash(dx, dy, r + pal * 31));
      if (q > edge) continue;
      const sh = (dx + dy) / r, hn = VR.hash(dx * 3, dy * 5, pal);
      let col = P[1];
      if (sh > 0.55 || (sh > 0.1 && hn < 0.25)) col = P[0];
      else if (sh < -0.6 || (sh < -0.15 && hn > 0.7)) col = P[2];
      x.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      x.fillRect(dx + r + 1, dy + r + 1, 1, 1);
    }
    VR.gfx.outline(c, '#1d2a14');
    cache.set(key, c);
    return c;
  };
})();
