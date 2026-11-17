// Carteles de calle en las esquinas (17/11/2026, fotos de Leandro del Centro): poste con una chapa blanca por calle (nombre)
// y al lado otra con la flecha del sentido (una flecha si es de mano única, doble si va para los dos lados).
// Las posiciones y los sentidos salen de tools/osm_to_map.py (decal `cartel_calle`: px, py = pie del poste, pl = [[nombre, 'h'|'v', 'E'|'W'|'N'|'S'|'']]).
'use strict';
(() => {
  const S = VR.TILE;
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const poly = (g, c, pts) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const arrow = (g, cx, cy, dir) => { // flecha de 5 × 3,4 unidades apuntando a E, W, N o S
    const v = dir === 'N' || dir === 'S', k = dir === 'W' || dir === 'N' ? -1 : 1, L = 2.6, h = 1.7, t = 0.55;
    const P = (a, b) => v ? [cx + b, cy + a * k] : [cx + a * k, cy + b];
    poly(g, '#14171c', [P(-L, -t), P(0.2, -t), P(0.2, -h), P(L, 0), P(0.2, h), P(0.2, t), P(-L, t)]);
  };
  VR.decorTop.cartel_calle = (d) => {
    const x = d.px, y = d.py, rows = d.pl || [];
    return [{ sy: y + 1, draw(g) {
      R(g, 'rgba(0,0,0,.22)', x - 1, y - 0.5, 9, 1.6);                                   // sombra en el piso
      R(g, '#3a3d44', x - 1.1, y - 31, 2.2, 31); R(g, '#c9ccd2', x - 0.7, y - 31, 1.1, 31); // poste
      R(g, '#3a3d44', x - 1.6, y - 32, 3.2, 1.4);
      g.save(); g.textBaseline = 'middle'; g.textAlign = 'center';
      rows.forEach(([nm, ax, dr], i) => {
        const ry = y - 29 + i * 8.2;
        let fs = 3.6; g.font = `bold ${fs}px Arial, sans-serif`;
        let tw = g.measureText(nm).width; if (tw > 30) { fs = Math.max(2.4, fs * 30 / tw); g.font = `bold ${fs}px Arial, sans-serif`; tw = g.measureText(nm).width; }
        const w = Math.max(14, tw + 3), x0 = x - w / 2 - 4.5;                            // chapa del nombre + chapa de la flecha, centradas en el poste
        R(g, '#1c3a63', x0 - 0.6, ry - 0.6, w + 1.2, 6.2); R(g, '#f4f3ee', x0, ry, w, 5);
        g.fillStyle = '#14171c'; g.fillText(nm, x0 + w / 2, ry + 2.6);
        const ax0 = x0 + w + 1.2;
        R(g, '#1c3a63', ax0 - 0.6, ry - 0.6, 9.2, 6.2); R(g, '#f4f3ee', ax0, ry, 8, 5);
        if (dr) arrow(g, ax0 + 4, ry + 2.5, dr);
        else { arrow(g, ax0 + 4, ry + 2.5, ax === 'h' ? 'E' : 'S'); arrow(g, ax0 + 4, ry + 2.5, ax === 'h' ? 'W' : 'N'); }
      });
      g.restore();
    } }];
  };
})();
