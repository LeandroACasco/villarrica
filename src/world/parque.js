// Parque Manuel Ortiz Guerrero (laguna Ykua Pytã): lugares dibujados a mano (10/11/2026, plano: claude/parque-ykua-plan.md).
// Las posiciones salen de tools/osm_to_map.py (decals: fuente_amor, capillita, panambi, embarcadero, plataforma, surtidor,
// glorieta, banderas_v, balaustres, pergola, troncos, farol_parque, motosparque). El piso va en VR.decor (se pinta una vez en
// el chunk); lo que tiene altura va en VR.decorTop (se ordena con la gente por la altura en pantalla, así se puede pasar
// por delante o por detrás). El sol está al noroeste: las sombras caen hacia el sudeste.
'use strict';
(() => {
  const S = VR.TILE, H = VR.hash;
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const disc = (g, c, x, y, rx, ry) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const poly = (g, c, pts) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const shade = (g, x, y, w, h, a = 0.25) => R(g, `rgba(0,0,0,${a})`, x, y, w, h);
  const floor = (g, type, xa, ya, xb, yb) => { // repinta baldosas de un tipo en un rectángulo de baldosas (inclusive)
    for (let ty = ya; ty <= yb; ty++) for (let tx = xa; tx <= xb; tx++) VR.tileset.draw(g, type, (H(tx, ty, 99) * 4) | 0, tx * S, ty * S);
  };
  const now = () => performance.now();

  // ---------------------------------------------------------------- Fuente de los Enamorados
  // Pileta hexagonal de mosaico celeste grisáceo, seca o con poca agua; atrás (al oeste, contra el estadio), un nicho
  // blanco con arcos terracota y un caño; piso de ladrillo y una tarima de madera del lado del camino.
  VR.decor.fuente_amor = (g, d) => {
    floor(g, VR.T.LADRILLO, d.x, d.y, d.x + d.w - 1, d.y + d.h - 1);
    const cx = (d.px + 1.5) * S, cy = (d.py + 1.5) * S, Rr = 23.5, hex = (r, k = 0) => Array.from({ length: 6 }, (_, i) => [cx + Math.cos(i * Math.PI / 3 + k) * r, cy + Math.sin(i * Math.PI / 3 + k) * r * 0.866 / 0.866]);
    // tarima de madera entre la pileta y el camino
    const wx = (d.px + 3) * S, wy = d.py * S;
    for (let i = 0; i < 24; i++) { R(g, i % 2 ? '#8a5a34' : '#9c6a3e', wx, wy + i * 2, S, 2); R(g, 'rgba(0,0,0,.35)', wx, wy + i * 2 + 1.5, S, 0.5); }
    R(g, '#5e3a20', wx, wy, 1, 48); shade(g, wx + S - 1, wy, 1, 48, 0.3);
    // sombra y borde
    poly(g, 'rgba(0,0,0,.28)', hex(Rr).map(([x, y]) => [x + 3, y + 3]));
    poly(g, '#8e8a80', hex(Rr)); poly(g, '#d8d2c4', hex(Rr - 1)); poly(g, '#b8b2a4', hex(Rr - 3.2));
    // fondo de mosaico: cuadraditos de 2 × 2 en celeste grisáceo
    g.save(); g.beginPath(); hex(Rr - 4).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
    for (let y = cy - 24; y < cy + 24; y += 2) for (let x = cx - 24; x < cx + 24; x += 2) {
      const h = H((x / 2) | 0, (y / 2) | 0, 611), k = (h - 0.5) * 16;
      R(g, `rgb(${136 + k | 0},${172 + k | 0},${178 + k | 0})`, x, y, 2, 2);
      if (h > 0.93) R(g, 'rgba(255,255,255,.35)', x, y, 2, 2); else if (h < 0.06) R(g, 'rgba(40,60,70,.35)', x, y, 2, 2);
    }
    R(g, 'rgba(60,80,88,.5)', cx - 24, cy - 24, 48, 1); // juntas de las caras del hexágono (sombra del borde de arriba)
    // poca agua: un charco verdoso del lado sur y algunas hojas secas
    disc(g, 'rgba(98,128,112,.85)', cx + 2, cy + 8, 11, 6); disc(g, 'rgba(150,176,160,.55)', cx - 1, cy + 6.5, 7, 3.4);
    for (let i = 0; i < 9; i++) R(g, i % 2 ? '#b07a3a' : '#7a5028', cx - 16 + H(i, d.px, 613) * 32, cy - 12 + H(i, d.py, 617) * 26, 1.6, 1);
    g.restore();
    // surtidor central chiquito (de piedra)
    disc(g, 'rgba(0,0,0,.25)', cx + 1.5, cy + 1.5, 4, 3.2); disc(g, '#9a968c', cx, cy, 3.6, 3); disc(g, '#cfc9bc', cx - 0.4, cy - 0.5, 2.6, 2.1); disc(g, '#6e8a90', cx, cy - 0.3, 1.3, 1);
  };
  VR.decorTop.fuente_amor = (d) => {
    const X = d.nx * S + 1, Y = d.py * S, Wd = 14, Hh = 3 * S, up = 8;
    return [{ sy: Y + Hh + 1, draw(g) {
      shade(g, X + 5, Y + 4, Wd + 3, Hh, 0.22);
      R(g, '#6a665e', X - 0.5, Y - up - 0.5, Wd + 1, Hh + up + 1);                       // contorno
      R(g, '#efece4', X, Y - up, Wd, Hh); R(g, '#ffffff', X, Y - up, 1, Hh); R(g, '#cfcabe', X + Wd - 1.5, Y - up, 1.5, Hh); // techo del nicho (blanco)
      R(g, '#dcd8cc', X, Y + Hh - up, Wd, up); R(g, '#bdb8aa', X, Y + Hh - 1.5, Wd, 1.5);  // cara sur
      // arcos terracota sobre el costado este (3 hornacinas) y el caño que da a la pileta
      for (let i = 0; i < 3; i++) {
        const ay = Y - up + 3 + i * 14;
        R(g, '#b9572f', X + 8, ay, 5, 11); R(g, '#7a3a20', X + 9.5, ay + 3, 2, 8);
        g.fillStyle = '#b9572f'; g.beginPath(); g.ellipse(X + 10.5, ay + 1.5, 2.6, 2.6, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#7a3a20'; g.beginPath(); g.ellipse(X + 10.5, ay + 3.2, 1.2, 1.4, 0, Math.PI, 0); g.fill();
      }
      R(g, '#5a5e64', X + 10, Y + 22 - up, 8, 2.4); R(g, '#9aa0a6', X + 10, Y + 22 - up, 8, 0.8); R(g, '#3a3e44', X + 17, Y + 22.4 - up, 1.4, 3); // caño
      R(g, '#b9572f', X, Y - up, 14, 1.5);                                                // borde de teja
    } }];
  };

  // ---------------------------------------------------------------- Capillita terracota y blanca con cúpula
  VR.decor.capillita = (g, d) => { floor(g, VR.T.LADRILLO, d.bx, d.by, d.bx, d.by); };
  VR.decorTop.capillita = (d) => {
    const bx = d.bx * S + 8, by = (d.by + 1) * S;
    return [{ sy: by, draw(g) {
      poly(g, 'rgba(0,0,0,.25)', [[bx + 6, by], [bx + 15, by - 4], [bx + 15, by - 14], [bx + 8, by - 18], [bx + 5, by - 10]]);
      R(g, '#2a1a14', bx - 7.5, by - 11, 15, 11.5);                                         // contorno
      R(g, '#c6663e', bx - 7, by - 10.5, 14, 10.5); R(g, '#d98258', bx - 7, by - 10.5, 14, 1.5); R(g, '#9a4a2a', bx - 7, by - 2, 14, 2);
      R(g, '#f4f0e6', bx - 7, by - 10.5, 2, 10.5); R(g, '#f4f0e6', bx + 5, by - 10.5, 2, 10.5);   // pilastras blancas
      g.fillStyle = '#f4f0e6'; g.beginPath(); g.ellipse(bx, by - 6.2, 3.2, 3.4, 0, Math.PI, 0); g.fill(); R(g, '#f4f0e6', bx - 3.2, by - 6.2, 6.4, 6.2);
      g.fillStyle = '#4a2c1a'; g.beginPath(); g.ellipse(bx, by - 5.6, 2.3, 2.7, 0, Math.PI, 0); g.fill(); R(g, '#4a2c1a', bx - 2.3, by - 5.6, 4.6, 5.6); R(g, '#7a5232', bx - 2.3, by - 5.6, 1, 5.6); // puerta
      R(g, '#2a1a14', bx - 7.5, by - 15.5, 15, 5.5); R(g, '#f4f0e6', bx - 7, by - 15, 14, 4.5); R(g, '#c6663e', bx - 7, by - 12, 14, 1.2); // cornisa
      disc(g, '#2a1a14', bx, by - 20.5, 7.6, 6.6); disc(g, '#ece7da', bx, by - 20.5, 7, 6); disc(g, '#fbf9f2', bx - 2, by - 22.5, 3.4, 2.8); disc(g, 'rgba(140,120,100,.4)', bx + 3.6, by - 18.2, 3.2, 2.6); // cúpula
      R(g, '#c6663e', bx - 7, by - 16.6, 14, 1.2);                                            // aro terracota
      R(g, '#ece7da', bx - 1, by - 28, 2, 3.5); R(g, '#c6663e', bx - 0.5, by - 32, 1, 4.5); R(g, '#c6663e', bx - 2, by - 30.5, 4, 1); // linterna y cruz
    } }];
  };

  // ---------------------------------------------------------------- Monumento al Panambi Vera (tumba del poeta)
  // Tronco tallado con hiedra y una mariposa naranja arriba, base de piedra con la placa del retrato (poeta con sombrero)
  // y otra con versos; cantero ovalado de pasto con borde de ladrillo y baranda de hierro negra del lado del agua.
  VR.decor.panambi = (g, d) => {
    const cx = d.cx, cy = d.cy, rx = 3 * S, ry = 2 * S;
    shade(g, 0, 0, 0, 0);
    disc(g, 'rgba(0,0,0,.25)', cx + 2, cy + 2.5, rx + 4, ry + 4);
    disc(g, '#7a3c28', cx, cy, rx + 4, ry + 4); disc(g, '#b25a3e', cx, cy, rx + 3, ry + 3); disc(g, '#d6a07e', cx, cy, rx + 1.4, ry + 1.4);
    g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.clip();
    for (let ty = Math.floor((cy - ry) / S); ty * S < cy + ry; ty++) for (let tx = Math.floor((cx - rx) / S); tx * S < cx + rx; tx++) VR.tileset.draw(g, VR.T.GRASS, (H(tx, ty, 99) * 4) | 0, tx * S, ty * S);
    for (let i = 0; i < 26; i++) { const a = H(i, d.bx, 641) * 6.28, r = 0.55 + H(i, d.by, 643) * 0.4; R(g, ['#f4e6a0', '#f0f0f0', '#e8a0c0', '#f08a50'][i & 3], cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, 1.2, 1.2); } // florcitas
    g.restore();
    // baranda de hierro negra del lado del agua (sudeste): barrotes finos con rematecitos
    const a0 = -0.25, a1 = 1.9, N = 26;
    g.strokeStyle = '#17171b'; g.lineWidth = 1.1; g.beginPath(); g.ellipse(cx, cy, rx + 5.5, ry + 5.5, 0, a0, a1); g.stroke();
    g.lineWidth = 0.7; g.beginPath(); g.ellipse(cx, cy, rx + 3.2, ry + 3.2, 0, a0, a1); g.stroke();
    for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * i / N, x = cx + Math.cos(a) * (rx + 5.5), y = cy + Math.sin(a) * (ry + 5.5); R(g, '#17171b', x - 0.4, y - 2.2, 0.8, 2.4); R(g, '#4a4a52', x - 0.7, y - 2.8, 1.4, 0.8); }
    // base de rocas grises amontonadas (2 × 2 baldosas) con una forma oscura tallada a la derecha
    const X = d.bx * S, Y = d.by * S;
    disc(g, 'rgba(0,0,0,.22)', X + 18, Y + 22, 21, 11);
    const rock = (x, y, rx, ry, k) => { disc(g, '#4a4842', x, y + 0.6, rx + 0.8, ry + 0.8); disc(g, k ? '#9a988f' : '#8e8c86', x, y, rx, ry); disc(g, '#b4b2a8', x - rx * 0.3, y - ry * 0.35, rx * 0.55, ry * 0.45); disc(g, 'rgba(0,0,0,.18)', x + rx * 0.3, y + ry * 0.4, rx * 0.5, ry * 0.4); };
    [[6, 22, 7, 5, 0], [14, 25, 8, 5.5, 1], [24, 24, 8, 5, 0], [10, 17, 6, 4.5, 1], [21, 18, 6.5, 4.5, 0], [29, 19, 4.5, 4, 1], [4, 15, 4, 3.5, 0]].forEach(([a, b, c, e, k]) => rock(X + a, Y + b, c, e, k));
    poly(g, '#1a1a1e', [[X + 25, Y + 19], [X + 28, Y + 8], [X + 31, Y + 11], [X + 32, Y + 22], [X + 27, Y + 24]]); poly(g, '#34343a', [[X + 27, Y + 12], [X + 29, Y + 9], [X + 30, Y + 16], [X + 28, Y + 20]]); // forma oscura
    // placa del retrato: marco marrón con el poeta de sombrero marrón, apoyada en las rocas
    R(g, '#2c2018', X + 8, Y + 19, 12, 9); R(g, '#7a5430', X + 8.6, Y + 19.6, 10.8, 7.8); R(g, '#cfc3a4', X + 10, Y + 21, 8, 5);
    disc(g, '#d8b08a', X + 14, Y + 24, 1.7, 2); R(g, '#5a3a1c', X + 11.6, Y + 21.6, 4.8, 1); R(g, '#6e4624', X + 12.6, Y + 20.8, 2.8, 1.2); R(g, '#2a2a30', X + 12.4, Y + 25.6, 3.2, 1.2);
    // placa blanca con los versos
    R(g, '#8a8780', X + 1.5, Y + 24, 8, 6); R(g, '#f2f0ea', X + 2, Y + 24.4, 7, 5);
    for (let i = 0; i < 3; i++) R(g, '#6a665e', X + 3, Y + 25.6 + i * 1.3, 4 + H(i, d.bx, 659) * 2, 0.5);
  };
  VR.decorTop.panambi = (d) => {
    const X = d.bx * S, Y = d.by * S, mx = X + 14, by = Y + 14;
    return [{ sy: Y + 33, draw(g) {
      const t = now() / 1000, LT = '#c98f55', MD = '#b57c44', DK = '#a8703a', OL = '#3a2412';
      const br = (pts, w0, w1) => { // rama: lista de puntos, ancho que se afina
        for (let pass = 0; pass < 3; pass++) for (let i = 0; i < pts.length - 1; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], a = w0 + (w1 - w0) * i / (pts.length - 1), b = w0 + (w1 - w0) * (i + 1) / (pts.length - 1);
          const c = pass === 0 ? OL : pass === 1 ? MD : LT, o = pass === 0 ? 1.6 : pass === 1 ? 0 : -1.2;
          if (pass === 2 && (a + o < 0.6)) continue;
          poly(g, c, [[x0 - a / 2 - o / 2, y0], [x0 + a / 2 + o / 2, y0], [x1 + b / 2 + o / 2, y1], [x1 - b / 2 - o / 2, y1]].map(([x, y], j) => [pass === 2 ? (j % 2 ? x - 0.9 : x - 0.4) - (j % 2 ? a * 0.1 : 0) : x, y]));
        }
      };
      poly(g, 'rgba(0,0,0,.24)', [[mx - 4, by], [mx + 5, by], [mx + 26, by + 9], [mx + 12, by + 9]]);
      // tronco retorcido (se tuerce de izquierda a derecha) y ramas bifurcadas sin hojas
      const trunk = [[mx, by], [mx - 1.5, by - 9], [mx + 1, by - 18], [mx - 1, by - 27], [mx + 0.5, by - 34]];
      br(trunk, 11, 7);
      br([[mx + 0.5, by - 34], [mx - 4, by - 41], [mx - 7, by - 50], [mx - 8, by - 57]], 5, 1.4);
      br([[mx + 0.5, by - 34], [mx + 3, by - 43], [mx + 3.5, by - 52], [mx + 5.5, by - 59]], 4.6, 1.4);
      br([[mx - 3.5, by - 42], [mx - 0.5, by - 48], [mx - 0.5, by - 55]], 2.4, 1);
      br([[mx + 3, by - 44], [mx + 8, by - 48], [mx + 10, by - 53]], 2.2, 0.9);
      for (let i = 0; i < 8; i++) { const yy = by - 3 - i * 4, xx = mx - 3.5 + H(i, d.bx, 663) * 6; R(g, DK, xx, yy, 0.8, 3.5); R(g, '#dcae78', xx - 0.9, yy, 0.6, 2.4); } // vetas talladas
      R(g, OL, mx - 1.5, by - 22, 3, 1.1); R(g, '#e0b27c', mx - 1.2, by - 22.4, 1.6, 0.6);                      // hueco tallado
      // enredaderas verde azuladas: espiral en el tronco y un cordón que cuelga
      const gr = ['#1f7a6a', '#2f9a82', '#58b89a', '#7ed0a8'];
      for (let i = 0; i < 38; i++) { const f = i / 37, yy = by - 2 - f * 40, xx = mx + Math.sin(f * 11) * 5.2 * (1 - f * 0.4); R(g, gr[(H(i, d.by, 679) * 4) | 0], xx - 1, yy, 2.2, 1.8); }
      R(g, '#2f9a82', mx - 7, by - 24, 1, 22); for (let i = 0; i < 7; i++) R(g, gr[1 + (i & 1)], mx - 7.8, by - 22 + i * 3, 2, 1.4);
      R(g, '#2f9a82', mx + 5.5, by - 40, 0.9, 12);
      // mariposa naranja y negra arriba (aletea)
      const f = 0.9, bx = mx + 5.5, byy = by - 63; // escultura: quieta
      disc(g, '#1c1410', bx - 2.9 * f - 0.6, byy - 0.8, 2.9 * f + 0.7, 2.3); disc(g, '#1c1410', bx + 2.9 * f + 0.6, byy - 0.8, 2.9 * f + 0.7, 2.3);
      disc(g, '#f08a1c', bx - 2.6 * f - 0.5, byy - 0.8, 2.6 * f + 0.3, 1.9); disc(g, '#f08a1c', bx + 2.6 * f + 0.5, byy - 0.8, 2.6 * f + 0.3, 1.9);
      disc(g, '#f6a94a', bx - 2.3 * f - 0.4, byy + 0.9, 1.7 * f + 0.4, 1.3); disc(g, '#f6a94a', bx + 2.3 * f + 0.4, byy + 0.9, 1.7 * f + 0.4, 1.3);
      R(g, '#1c1410', bx - 0.4, byy - 1.8, 0.8, 4);
    } }];
  };

  // ---------------------------------------------------------------- Embarcadero de los cisnes (costa norte)
  VR.drawCisne = (g, x, y, ang, col) => { // cisne de pedal visto desde arriba (frente hacia −y), 2 asientos
    const P = col === 'azul' ? { b: '#3468c4', d: '#244c96', l: '#6a9ae0', n: '#2c58b0' } : { b: '#f4f4f0', d: '#c4c8cc', l: '#ffffff', n: '#ecece8' };
    g.save(); g.translate(x, y); g.rotate(ang);
    g.strokeStyle = 'rgba(210,235,215,.35)'; g.lineWidth = 0.6; g.beginPath(); g.ellipse(0, 0, 10.5, 15.5, 0, 0, 7); g.stroke();   // ondas
    disc(g, 'rgba(10,20,10,.3)', 1.6, 2, 7.5, 12);                                                  // sombra en el agua
    disc(g, '#1e2230', 0, 0, 7.4, 11.6); disc(g, P.b, 0, 0, 6.8, 11); disc(g, P.l, -1.6, -1.8, 3.4, 7); disc(g, P.d, 3.2, 2.5, 3, 7);  // casco
    g.strokeStyle = P.d; g.lineWidth = 0.8; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 2, -3); g.quadraticCurveTo(sd * 6.4, 2, sd * 3.6, 10); g.stroke(); }   // alas en relieve
    disc(g, '#20222c', -2.4, 1.2, 2.1, 2.4); disc(g, '#20222c', 2.4, 1.2, 2.1, 2.4); disc(g, P.d, -2.4, 1.4, 1.5, 1.8); disc(g, P.d, 2.4, 1.4, 1.5, 1.8); // asientos
    R(g, '#2a2a30', -3.6, 5.2, 7.2, 1);                                                            // barra de pedales
    // cuello largo y curvo (en S suave) con la cabeza adelante y pico naranja
    const NK = [[0, -7], [3.6, -11], [-1.6, -16], [1.4, -21]];
    const neck = (w, c) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(NK[0][0], NK[0][1]); g.bezierCurveTo(NK[1][0], NK[1][1], NK[2][0], NK[2][1], NK[3][0], NK[3][1]); g.stroke(); };
    neck(4.2, '#1e2230'); neck(3, P.n); neck(0.9, P.l);
    disc(g, '#1e2230', 1.4, -22.4, 2.8, 2.8); disc(g, P.n, 1.4, -22.4, 2.3, 2.3); poly(g, '#e87a1c', [[0.2, -23.8], [2.6, -23.8], [1.4, -27.4]]); R(g, '#16161a', 2.4, -23, 0.8, 0.8);
    g.restore();
  };
  VR.decor.embarcadero = (g, d) => {
    const X = (d.xe - 1) * S, Y = (d.yn - 1) * S, Wd = 3 * S, Hh = 3 * S;
    // agua: sombra del muelle, ondas, cisnes y el bote
    shade(g, X + 3, (d.yn) * S + 2, Wd, 2 * S + 3, 0.32);
    const t = Math.sin(now() / 700) * 0.05;
    if (d.bote) { // bote de remo amarrado al muelle
      const [bx, by, ba] = d.bote; g.save(); g.translate(bx * S, by * S); g.rotate(ba);
      disc(g, 'rgba(10,20,10,.3)', 1.5, 1.8, 5.2, 11.6); disc(g, '#2a2420', 0, 0, 5.2, 11.4); disc(g, '#ece6d6', 0, 0, 4.6, 10.8); disc(g, '#8a6a42', 0, 0.6, 3.1, 8.6); disc(g, '#6a4e2e', 0, 0.6, 2.4, 7.4);
      R(g, '#3a6ab0', -4.6, -1, 9.2, 1.1); R(g, '#9a7a4e', -3, -2, 6, 1); R(g, '#9a7a4e', -3, 3.4, 6, 1); R(g, '#c8c0a8', -5.2, -0.4, -2.4, 0.9); R(g, '#c8c0a8', 5.2, 3.6, 2.6, 0.9); // remos
      g.restore();
      g.strokeStyle = '#d8cfb0'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(bx * S - 4, by * S - 8); g.lineTo(X + Wd - 1, Y + 2.2 * S); g.stroke();
    }
    // el muelle: tablas de madera a lo ancho, con dos largueros y postes
    shade(g, X - 1, Y + 1, Wd + 3, Hh + 2, 0.18);
    for (let i = 0; i < Hh / 3; i++) {
      const yy = Y + i * 3, k = H(i, d.xe, 701);
      R(g, '#3a2616', X, yy, Wd, 3); R(g, k < 0.5 ? '#a0703e' : '#b48048', X, yy, Wd, 2.2); R(g, 'rgba(255,225,170,.35)', X, yy, Wd, 0.6);
      R(g, 'rgba(0,0,0,.28)', X + H(i, d.xe, 703) * 30, yy + 0.4, 1 + H(i, d.xe, 705) * 6, 1.4);   // veta oscura
      R(g, '#2a2018', X + 2, yy + 1, 0.8, 0.8); R(g, '#2a2018', X + Wd - 3, yy + 1, 0.8, 0.8);     // clavos
    }
    R(g, '#4a3220', X, Y, 2.4, Hh); R(g, '#6a4a2e', X, Y, 0.8, Hh); R(g, '#4a3220', X + Wd - 2.4, Y, 2.4, Hh); R(g, '#3a2616', X + Wd - 0.8, Y, 0.8, Hh);
    for (let i = 0; i < 4; i++) for (const px of [X - 1.2, X + Wd - 1.8]) { const yy = Y + 1 + i * (Hh - 6) / 3; disc(g, '#2c1e12', px + 1.6, yy + 1.6, 2.2, 2.2); disc(g, '#7a5632', px + 1.4, yy + 1.2, 1.5, 1.5); }  // postes
    R(g, '#2a1a10', X, Y + Hh - 1.2, Wd, 1.2); // punta del muelle sobre el agua
  };
  VR.decorTop.embarcadero = (d) => {
    const X = (d.xe - 1) * S, by = (d.yn - 1) * S - 2, Wd = 3 * S;
    return [{ sy: by + 3, draw(g) {
      // portón rústico de madera marrón rojiza: dos postes con travesaño y dos hojas abiertas de tablas verticales
      const wood = (x, y, w, h) => { R(g, '#2a140e', x - 0.5, y - 0.5, w + 1, h + 1); R(g, '#7a3a26', x, y, w, h); R(g, '#9a5236', x, y, 1, h); R(g, '#5a2818', x + w - 1, y, 1, h); };
      shade(g, X + 3, by - 2, Wd, 4, 0.22);
      wood(X - 1, by - 28, 5, 28); wood(X + Wd - 4, by - 28, 5, 28);                       // postes
      wood(X - 2, by - 30, Wd + 4, 4); for (let i = 0; i < 9; i++) R(g, '#5a2818', X - 1 + i * 5.6, by - 30, 0.6, 4); // travesaño con tablas
      R(g, '#3a1c12', X + 3, by - 26, Wd - 7, 1);                                           // cartelito de madera sin texto
      for (const sd of [-1, 1]) { // hojas abiertas hacia afuera, achatadas
        const x0 = sd < 0 ? X + 3.5 : X + Wd - 3.5;
        for (let i = 0; i < 4; i++) { const xx = x0 + sd * (i * 2.8 + 0.5) - (sd < 0 ? 2.6 : 0), hh = 20 - i * 1.4; R(g, '#2a140e', xx - 0.3, by - hh - 1, 3, hh + 1.6); R(g, i % 2 ? '#8a4630' : '#7a3a26', xx, by - hh, 2.4, hh); R(g, '#a85c3c', xx, by - hh, 0.6, hh); }
      }
      R(g, '#3a3a40', X + 4.5, by - 14, 1.6, 1.2); R(g, '#3a3a40', X + Wd - 6, by - 14, 1.6, 1.2); // bisagras
    } }];
  };

  // ---------------------------------------------------------------- Plataforma flotante y surtidores
  VR.decor.plataforma = (g, d) => {
    const X = (d.x + 1) * S, Y = (d.y + 1) * S, N = 3 * S;
    shade(g, X + 3, Y + 4, N + 2, N + 2, 0.3);
    R(g, '#2a3034', X - 1, Y - 1, N + 2, N + 2); R(g, '#7a9098', X, Y, N, N);                               // flotadores (borde gris azulado)
    for (let i = 0; i < 12; i++) { R(g, i % 2 ? '#8aa0a8' : '#6a828a', X + i * 4, Y, 4, 2.6); R(g, i % 2 ? '#8aa0a8' : '#6a828a', X + i * 4, Y + N - 2.6, 4, 2.6); R(g, i % 2 ? '#8aa0a8' : '#6a828a', X, Y + i * 4, 2.6, 4); R(g, i % 2 ? '#8aa0a8' : '#6a828a', X + N - 2.6, Y + i * 4, 2.6, 4); }
    for (let j = 0; j < 14; j++) { // cubierta clara de tablas
      const yy = Y + 3 + j * 3, k = H(j, d.x, 721);
      R(g, k < 0.5 ? '#e4d4b0' : '#d6c49c', X + 3, yy, N - 6, 2.4); R(g, 'rgba(255,255,255,.4)', X + 3, yy, N - 6, 0.6); R(g, 'rgba(60,40,20,.35)', X + 3, yy + 2.4, N - 6, 0.6);
    }
    for (const [cx, cy] of [[X + 4, Y + 4], [X + N - 4, Y + 4], [X + 4, Y + N - 4], [X + N - 4, Y + N - 4]]) { disc(g, '#1c3a6a', cx, cy, 3.2, 3.2); disc(g, '#3a78c4', cx - 0.3, cy - 0.3, 2.6, 2.6); disc(g, '#8ab8ec', cx - 0.9, cy - 0.9, 1.1, 1.1); } // barriles azules
    R(g, '#4a3a28', X + N / 2 - 1, Y + N / 2 - 1, 2, 2);
  };
  VR.decorTop.surtidor = (d) => [{ sy: d.py + 3, draw(g) {
    const t = now() / 1000, ph = d.px * 0.013, hgt = 17 + Math.sin(t * 2.3 + ph) * 3;
    disc(g, 'rgba(235,250,240,.28)', d.px, d.py + 1, 8 + Math.sin(t * 3 + ph) * 1.2, 4.4); disc(g, 'rgba(235,250,240,.5)', d.px, d.py + 1, 5, 2.6);   // espuma de abajo
    g.strokeStyle = 'rgba(235,250,255,.8)'; g.lineWidth = 0.7; g.beginPath(); g.ellipse(d.px, d.py + 1, 6 + ((t * 4 + ph) % 3), 3.2 + ((t * 4 + ph) % 3) * 0.5, 0, 0, 7); g.stroke();
    poly(g, 'rgba(245,252,255,.95)', [[d.px - 1.6, d.py + 1], [d.px + 1.6, d.py + 1], [d.px + 0.8, d.py - hgt], [d.px - 0.8, d.py - hgt]]);
    poly(g, 'rgba(180,215,235,.7)', [[d.px + 0.2, d.py + 1], [d.px + 1.6, d.py + 1], [d.px + 0.8, d.py - hgt], [d.px + 0.2, d.py - hgt]]);
    for (let i = 0; i < 12; i++) { // gotas que caen alrededor de la punta
      const a = i / 12 * 6.283 + ph, k = ((t * 1.7 + i * 0.37) % 1), r = 2 + k * 6.5, yy = d.py - hgt + 2 + k * k * (hgt - 1);
      R(g, `rgba(235,248,255,${0.9 - k * 0.5})`, d.px + Math.cos(a) * r - 0.5, yy + Math.sin(a) * r * 0.45, 1, 1);
    }
  } }];

  // ---------------------------------------------------------------- Glorieta de columnas (costa este)
  // Peristilo curvo en semicírculo abierto hacia la laguna, columnas blancas sobre base y dintel amarillo ocre; terraza
  // de ladrillo que entra un poco al agua con baranda naranja y blanca.
  VR.decor.glorieta = (g, d) => {
    const cx = d.cx * S, cy = d.cy * S, rx = d.rx * S, ry = d.ry * S, tx = d.x0 * S;
    // piso de la glorieta: media luna de piedra clara con un escalón
    g.save(); g.beginPath(); g.rect(cx, cy - ry - 8, rx + 12, ry * 2 + 16); g.clip();
    disc(g, 'rgba(0,0,0,.18)', cx + 1.5, cy + 2, rx + 7.5, ry + 7.5); disc(g, '#b89a5a', cx, cy, rx + 7, ry + 7); disc(g, '#e4cd96', cx, cy, rx + 5.4, ry + 5.4); disc(g, '#d6bc7e', cx, cy, rx + 2, ry + 2);
    g.restore();
    // baranda naranja y blanca sobre el borde del agua de la terraza
    const by0 = (d.cy - 5) * S, by1 = (d.cy + 6) * S, bx = tx + 1;
    R(g, 'rgba(0,0,0,.25)', bx - 1.5, by0 + 2, 2.4, by1 - by0); R(g, '#f2eee6', bx - 1, by0, 2.2, by1 - by0); R(g, '#cfc9bc', bx + 0.4, by0, 0.8, by1 - by0);
    for (let y = by0 + 1; y < by1 - 2; y += 4) { R(g, (((y - by0) / 4) | 0) % 2 ? '#f2eee6' : '#e27a28', bx - 2.2, y, 4.4, 2); R(g, 'rgba(255,255,255,.4)', bx - 2.2, y, 4.4, 0.6); }
    R(g, '#e27a28', bx - 2.2, by0, 12, 1.6); R(g, '#f2eee6', bx - 2.2, by0 + 1.6, 12, 1); R(g, '#e27a28', bx - 2.2, by1 - 2, 12, 1.6); R(g, '#f2eee6', bx - 2.2, by1 - 3.2, 12, 1.2);
  };
  VR.decorTop.glorieta = (d) => {
    const cx = d.cx * S, cy = d.cy * S, rx = d.rx * S, ry = d.ry * S, N = 9, Hc = 22, out = [];
    let prev = null;
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + i * Math.PI / (N - 1), bx = cx + Math.cos(a) * rx, by = cy + Math.sin(a) * ry, p = prev;
      out.push({ sy: by + 4, draw(g) {
        // dintel ocre que viene de la columna anterior (a la altura de los capiteles)
        if (p) {
          g.lineCap = 'butt';
          g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 5; g.beginPath(); g.moveTo(p[0] + 2, p[1] - Hc + 4); g.lineTo(bx + 2, by - Hc + 4); g.stroke();
          g.strokeStyle = '#8a6a22'; g.lineWidth = 5.4; g.beginPath(); g.moveTo(p[0], p[1] - Hc - 0.8); g.lineTo(bx, by - Hc - 0.8); g.stroke();
          g.strokeStyle = '#d8b04a'; g.lineWidth = 4.2; g.beginPath(); g.moveTo(p[0], p[1] - Hc - 1.2); g.lineTo(bx, by - Hc - 1.2); g.stroke();
          g.strokeStyle = '#f0d088'; g.lineWidth = 1; g.beginPath(); g.moveTo(p[0], p[1] - Hc - 2.8); g.lineTo(bx, by - Hc - 2.8); g.stroke();
        }
        poly(g, 'rgba(0,0,0,.22)', [[bx + 1, by], [bx + 5, by], [bx + 12, by + 5], [bx + 8, by + 5]]);
        R(g, '#6a4e1a', bx - 3.8, by - 3.6, 7.6, 4.2); R(g, '#d8b04a', bx - 3.4, by - 3.2, 6.8, 3.4); R(g, '#f0d088', bx - 3.4, by - 3.2, 6.8, 0.8);             // base
        R(g, '#6a6a66', bx - 2.8, by - Hc + 2.6, 5.6, Hc - 6); R(g, '#f6f4ee', bx - 2.4, by - Hc + 2.6, 4.8, Hc - 6); R(g, '#ffffff', bx - 2.4, by - Hc + 2.6, 1.3, Hc - 6); R(g, '#c8c6bc', bx + 1.2, by - Hc + 2.6, 1.2, Hc - 6); // fuste
        R(g, '#6a4e1a', bx - 4, by - Hc - 0.4, 8, 3.4); R(g, '#e0b852', bx - 3.6, by - Hc, 7.2, 2.6); R(g, '#f0d088', bx - 3.6, by - Hc, 7.2, 0.8);              // capitel
      } });
      prev = [bx, by];
    }
    return out;
  };

  // ---------------------------------------------------------------- Fila de mástiles (vertical), detrás de la glorieta
  VR.decorTop.banderas_v = (d) => {
    const out = [];
    for (let i = 0; i < d.n; i++) {
      const Y = (d.y0 + i) * S + 12, X = d.x * S + 8 + i * 3;
      out.push({ sy: Y + 2, draw(g) {
        const t = now() / 260;
        R(g, 'rgba(0,0,0,.25)', X - 1, Y, 4, 2); R(g, '#5a5852', X, Y - 46, 2, 46); R(g, '#e8e6e0', X, Y - 46, 1, 46); R(g, '#d8d4c4', X - 0.5, Y - 47, 3, 1.4); R(g, '#8a8a84', X - 1, Y - 2, 4, 2);
        for (let k = 0; k < 12; k++) {
          const o = Math.round(Math.sin(t + k * 0.5 + i) * 1.2), x = X + 2 + k;
          R(g, '#d0302a', x, Y - 46 + o, 1, 3); R(g, '#ffffff', x, Y - 43 + o, 1, 3); R(g, '#2050a8', x, Y - 40 + o, 1, 3);
        }
      } });
    }
    return out;
  };

  // ---------------------------------------------------------------- Pasarela de balaustres y pérgola (costa oeste)
  VR.decorTop.balaustres = (d) => {
    const X0 = d.x0 * S, X1 = (d.x1 + 1) * S, rail = (y, sy) => ({ sy, draw(g) {
      shade(g, X0 + 2, y + 2, X1 - X0, 3, 0.2);
      R(g, '#e8e4d8', X0, y - 6.2, X1 - X0, 1.8); R(g, '#ffffff', X0, y - 6.2, X1 - X0, 0.6); R(g, '#bdb8aa', X0, y - 4.6, X1 - X0, 0.5);   // pasamanos
      for (let x = X0 + 2; x < X1 - 2; x += 3.2) { R(g, '#bdb8aa', x + 0.8, y - 4.4, 0.8, 4.6); R(g, '#f8f6ee', x, y - 4.4, 1.2, 4.6); R(g, '#c8c4b6', x - 0.2, y - 2.6, 1.6, 0.6); }  // balaustres
      R(g, '#d8d2c0', X0, y - 0.4, X1 - X0, 1.2);                                                                                          // base
      for (let x = X0; x <= X1 - 4; x += 32) { // pilares amarillos cada 2 baldosas
        R(g, '#6a4e1a', x - 0.5, y - 15.5, 6, 16.5); R(g, '#d8b04a', x, y - 15, 5, 15.5); R(g, '#f0d088', x, y - 15, 1.4, 15.5); R(g, '#a8842a', x + 3.6, y - 15, 1.4, 15.5);
        R(g, '#6a4e1a', x - 1.4, y - 17.6, 7.8, 3); R(g, '#f0d088', x - 1, y - 17.2, 7, 2.2); R(g, '#fff0c0', x - 1, y - 17.2, 7, 0.6);
      }
    } });
    return [rail(d.y0 * S + 3, d.y0 * S + 3), rail(d.y1 * S - 2, d.y1 * S - 2)];
  };
  VR.decorTop.pergola = (d) => {
    const X = d.px * S, Y = d.py * S, W = d.pw * S, Hh = d.ph * S, Hp = 26, base = Y + Hh;
    return [{ sy: base + 2, draw(g) {
      const post = (x, y) => { R(g, '#2c1c10', x - 1.9, y - Hp, 3.8, Hp + 1); R(g, '#7a5632', x - 1.5, y - Hp, 3, Hp); R(g, '#a07848', x - 1.5, y - Hp, 1, Hp); R(g, '#503820', x + 0.6, y - Hp, 0.9, Hp); };
      for (let y = Y; y < base; y += 3) R(g, 'rgba(20,40,10,.16)', X + 3, y + 6, W, 1.4);                  // rayas de sombra en el piso
      for (const x of [X, X + W / 2, X + W]) post(x, Y + 1);                                               // postes de atrás
      // techo: vigas a lo largo y travesaños, con la enredadera encima
      const tY = Y - Hp, tH = Hh;
      for (let x = X - 2; x <= X + W + 2; x += 7) { R(g, '#2c1c10', x - 0.4, tY - 0.8, 3, tH + 2); R(g, '#8a6438', x, tY - 0.4, 2.2, tH + 1.4); R(g, '#b08850', x, tY - 0.4, 0.8, tH + 1.4); }
      for (let y = tY; y <= tY + tH; y += 8) { R(g, '#2c1c10', X - 3, y - 0.4, W + 6, 2.4); R(g, '#6a4a2a', X - 3, y, W + 6, 1.6); }
      for (let i = 0; i < 150; i++) { // hojas y racimos
        const x = X - 3 + H(i, d.px, 731) * (W + 6), y = tY - 1 + H(i, d.py, 733) * (tH + 3), k = H(i, d.px, 737);
        if (k < 0.4) continue;
        R(g, ['#2c6a30', '#3e8a40', '#58a64a', '#7cc05a'][(H(i, d.py, 739) * 4) | 0], x, y, 2.6, 2);
        if (H(i, d.px, 741) > 0.97) R(g, '#e08ad0', x, y, 1.6, 1.6);                                       // florcitas lilas
      }
      for (const x of [X, X + W / 2, X + W]) post(x, base);                                                // postes de adelante
      for (let i = 0; i < 5; i++) { const x = X + (i + 0.5) * W / 5; R(g, '#3e8a40', x, tY + tH - 1, 1.2, 6 + H(i, d.px, 743) * 7); R(g, '#58a64a', x - 0.6, tY + tH + 4 + H(i, d.px, 745) * 6, 2.4, 1.6); } // enredadera que cuelga
    } }];
  };

  // ---------------------------------------------------------------- Orilla sur: troncos caídos y matas
  VR.decor.troncos = (g, d) => {
    const reed = (x, y, n, sd) => { for (let i = 0; i < n; i++) { const bx = x + (i - n / 2) * 1.5, h = 5 + H(i, sd, 751) * 5, lean = (H(i, sd, 753) - 0.5) * 3; g.strokeStyle = i % 2 ? '#3a6a2a' : '#5a8a38'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(bx, y); g.lineTo(bx + lean, y - h); g.stroke(); } };
    d.pts.forEach(([tx, ty, ang, len], k) => {
      const x = tx * S, y = ty * S;
      reed(x - len / 2 - 6, y + 4, 6, k * 3 + 1); reed(x + len / 2 + 5, y + 6, 5, k * 3 + 2);
      g.save(); g.translate(x, y); g.rotate(ang);
      disc(g, 'rgba(0,0,0,.28)', 1.6, 2.2, len / 2, 3.8);
      g.fillStyle = '#2a1a10'; g.beginPath(); g.roundRect(-len / 2 - 0.6, -3.6, len + 1.2, 7.2, 3); g.fill();
      g.fillStyle = '#6e4a2c'; g.beginPath(); g.roundRect(-len / 2, -3, len, 6, 2.6); g.fill();
      R(g, '#9a6e44', -len / 2 + 1, -3, len - 2, 1.4); R(g, '#4a301c', -len / 2 + 1, 1.6, len - 2, 1.2);
      for (let i = 0; i < 6; i++) R(g, '#3e2816', -len / 2 + 2 + H(i, k, 757) * (len - 5), -2 + H(i, k, 759) * 4, 3 + H(i, k, 761) * 4, 0.6);   // grietas de la corteza
      disc(g, '#c8a070', len / 2 - 0.4, 0, 1.2, 3); disc(g, '#a07848', len / 2 - 0.4, 0, 0.6, 1.6);                                              // corte con anillos
      R(g, '#4a301c', -2, -5.4, 1.6, 2.6);                                                                                                       // muñón
      g.restore();
    });
  };

  // ---------------------------------------------------------------- Farol blanco del anillo de la laguna
  VR.decorTop.farol_parque = (d) => {
    const x = d.x * S + 8, y = (d.y + 2) * S + 11;
    return [{ sy: y + 1, draw(g) {
      shade(g, x + 1, y - 1, 9, 2.4, 0.22);
      R(g, '#2a2a30', x - 2.8, y - 3, 5.6, 3.2); R(g, '#8a8a90', x - 2.4, y - 2.8, 4.8, 2.2); R(g, '#d8d6d0', x - 1.6, y - 5, 3.2, 2.4);
      R(g, '#2a2a30', x - 1.7, y - 27, 3.4, 23); R(g, '#f2f0ea', x - 1.2, y - 27, 2.4, 23); R(g, '#c4c2ba', x + 0.4, y - 27, 0.8, 23);
      R(g, '#2a2a30', x - 3.6, y - 29, 7.2, 2.6); R(g, '#d8d6d0', x - 3, y - 28.6, 6, 1.4);
      disc(g, '#2a2a30', x, y - 33, 4.6, 4.8); disc(g, '#fbf6e2', x, y - 33, 4, 4.2); disc(g, '#ffffff', x - 1.2, y - 34.4, 1.6, 1.6); R(g, '#2a2a30', x - 2.4, y - 38.4, 4.8, 1.6);
    } }];
  };

  // ---------------------------------------------------------------- Cancha sintética (noreste de la laguna, Street View 10/11/2026)
  // Césped sintético verde oscuro con franjas de corte, líneas blancas, dos arcos y alambrado alto con postes; la entrada
  // es un hueco en el lado sur (del lado del sendero). 12 × 7 baldosas (~24 × 14 m).
  VR.decor.cancha_sint = (g, d) => {
    const X = d.x * S, Y = d.y * S, W = d.w * S, Hh = d.h * S;
    R(g, '#2b6b34', X, Y, W, Hh);
    for (let i = 0; i < d.w * 2; i++) R(g, i % 2 ? '#2f7439' : '#296630', X + i * 16, Y, 16, Hh);
    for (let k = 0; k < 90; k++) R(g, H(k, d.x, 77) < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)', X + H(k, 3, d.y) * W, Y + H(k, 5, d.y) * Hh, 2, 1);
    const L = '#eef0e6', m = 5;
    R(g, L, X + m, Y + m, W - 2 * m, 1); R(g, L, X + m, Y + Hh - m - 1, W - 2 * m, 1); R(g, L, X + m, Y + m, 1, Hh - 2 * m); R(g, L, X + W - m - 1, Y + m, 1, Hh - 2 * m);
    R(g, L, X + (W >> 1), Y + m, 1, Hh - 2 * m);
    g.strokeStyle = L; g.lineWidth = 1; g.beginPath(); g.arc(X + W / 2 + 0.5, Y + Hh / 2, 11, 0, Math.PI * 2); g.stroke();
    for (const e of [0, 1]) { // áreas y arcos
      const ax = e ? X + W - m - 15 : X + m, gx = e ? X + W - m - 1 : X + m;
      R(g, L, ax, Y + (Hh >> 1) - 14, 15, 1); R(g, L, ax, Y + (Hh >> 1) + 14, 15, 1); R(g, L, e ? ax : ax + 14, Y + (Hh >> 1) - 14, 1, 29);
      R(g, 'rgba(0,0,0,.3)', gx - (e ? 0 : 1), Y + (Hh >> 1) - 7, 4, 15); R(g, '#e8e8e2', gx - (e ? 2 : 0), Y + (Hh >> 1) - 8, 3, 1); R(g, '#e8e8e2', gx - (e ? 2 : 0), Y + (Hh >> 1) + 7, 3, 1); R(g, '#e8e8e2', gx - (e ? 2 : -1), Y + (Hh >> 1) - 8, 1, 16);
    }
  };
  VR.decorTop.cancha_sint = (d) => {
    const X = d.x * S, Y = d.y * S, W = d.w * S, Hh = d.h * S, gate = [X + W / 2 - 14, X + W / 2 + 14], out = [], post = 2;
    const fence = (g, x0, y0, x1, y1, tall) => { // alambrado: postes grises y malla clara
      const bx = Math.min(x0, x1), by = Math.min(y0, y1) - tall, bw = Math.max(1, Math.abs(x1 - x0)), bh = Math.max(1, Math.abs(y1 - y0)) + tall; g.fillStyle = 'rgba(214,220,210,.55)'; g.fillRect(bx, by, bw, bh); g.strokeStyle = 'rgba(60,66,60,.6)'; g.lineWidth = 0.45; g.beginPath(); for (let k = -bh; k < bw; k += 2.5) { g.moveTo(bx + k, by + bh); g.lineTo(bx + k + bh, by); } g.stroke();
      g.strokeStyle = 'rgba(40,44,40,.55)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x0, y0 - tall); g.lineTo(x1, y1 - tall); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    };
    // lados norte, este y oeste: se ordenan por su altura en pantalla; el sur, con la entrada
    out.push({ sy: Y, draw(g) { fence(g, X, Y, X + W, Y, 12); for (let x = X; x <= X + W; x += 24) { R(g, '#6a6e68', x - 0.8, Y - 12, 1.6, 12); } } });
    out.push({ sy: Y + Hh * 0.5, draw(g) { for (const x of [X, X + W - 1]) { fence(g, x, Y, x, Y + Hh, 12); for (let y = Y; y <= Y + Hh; y += 24) R(g, '#6a6e68', x - 0.8 + (x === X ? 0 : 1), y - 12, 1.6, 12); } } });
    out.push({ sy: Y + Hh + 1, draw(g) {
      for (const [a, b] of [[X, gate[0]], [gate[1], X + W]]) { g.fillStyle = 'rgba(210,214,206,.35)'; g.fillRect(a, Y + Hh - 12, b - a, 12); g.strokeStyle = 'rgba(40,44,40,.55)'; g.lineWidth = 0.5; g.strokeRect(a, Y + Hh - 12, b - a, 12); }
      for (const x of [X, gate[0], gate[1], X + W - 1]) R(g, '#6a6e68', x - 0.8, Y + Hh - 13, 1.6, 13);
    } });
    return out;
  };

  // ---------------------------------------------------------------- Naciente (el ykua que da el nombre a la laguna)
  // Hondonada de tierra oscura y húmeda entre paredes de piedra, con una escalera de cemento que baja desde el sur.
  VR.decor.naciente = (g, d) => {
    const X = d.x * S, Y = d.y * S, W = d.w * S, Hh = d.h * S, cx = X + W / 2, cy = Y + Hh / 2;
    g.save(); g.beginPath(); g.ellipse(cx, cy, W / 2 - 2, Hh / 2 - 2, 0, 0, Math.PI * 2); g.clip();
    R(g, '#4a3326', X, Y, W, Hh);
    for (let k = 0; k < 70; k++) R(g, H(k, d.x, 31) < 0.5 ? '#3a281d' : '#5a3f2e', X + H(k, 2, d.y) * W, Y + H(k, 6, d.y) * Hh, 3 + H(k, 9, d.x) * 5, 2);
    disc(g, 'rgba(72,92,60,.45)', cx + 6, cy - 4, 14, 8);                          // humedad y musgo
    g.restore();
    // paredes de piedra al norte, este y oeste
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * (1.05 + 0.9 * i / 25), x = cx + Math.cos(a) * (W / 2 - 3), y = cy + Math.sin(a) * (Hh / 2 - 3), w = 7 + H(i, d.x, 41) * 4, h = 5 + H(i, d.y, 43) * 3, t = H(i, 7, 47);
      R(g, 'rgba(0,0,0,.35)', x - w / 2 + 1, y - h / 2 + 2, w, h);
      R(g, t < 0.33 ? '#8c8a82' : t < 0.66 ? '#a39f94' : '#756f64', x - w / 2, y - h / 2, w, h); R(g, 'rgba(255,255,255,.18)', x - w / 2, y - h / 2, w, 1);
    }
    // escalera de cemento hacia el sur, con muro blanco al costado
    const sx = cx - 9, sy = Y + Hh - 22;
    for (let i = 0; i < 5; i++) { R(g, i % 2 ? '#d9d6cc' : '#e8e5db', sx, sy + i * 4.4, 18, 4.4); R(g, 'rgba(0,0,0,.25)', sx, sy + i * 4.4 + 3.6, 18, 0.8); }
    R(g, '#ecebe4', sx - 3, sy - 2, 3, 24); R(g, 'rgba(0,0,0,.25)', sx + 18, sy - 1, 1, 22); R(g, '#ecebe4', sx + 18, sy - 2, 2.4, 24);
    disc(g, '#3f7a34', X + W - 12, Y + 14, 6, 5); disc(g, '#4c8c3c', X + W - 13, Y + 13, 4, 3); // mata verde
  };

  // ---------------------------------------------------------------- Jardineras blancas de la costa norte
  VR.decor.jardineras = (g, d) => {
    for (const [tx, ty] of d.pts) {
      const x = tx * S - 4, y = ty * S + 2;
      R(g, 'rgba(0,0,0,.3)', x + 2, y + 5, 24, 10);
      R(g, '#9a988f', x, y, 24, 11); R(g, '#f1efe8', x + 0.8, y + 0.8, 22.4, 9); R(g, '#d8d6cc', x + 1.6, y + 7, 20.8, 2.4); R(g, '#3d6d30', x + 2.5, y + 2, 19, 4);
      for (let k = 0; k < 7; k++) R(g, H(k, tx, 88) < 0.5 ? '#4f8a3c' : '#2f5a28', x + 3 + k * 2.8, y + 1.4 + H(k, ty, 91) * 2, 2, 3);
    }
  };
})();

// Orilla y sendero curvos (10/11/2026, pedido de Leandro). En baldosas de 2 m la laguna y su sendero quedan
// escalonados; la forma real (OSM y la vista satelital) es lisa. Se suaviza la máscara de baldosas (agua y agua +
// sendero) con un desenfoque gaussiano y se corta a la mitad: los escalones en diagonal quedan rectos y las esquinas,
// redondeadas. Encima del piso se dibujan, a 1 px por unidad: sendero, barro de la orilla, agua y el borde de piedra
// blanca. Las baldosas no cambian (choques, cisnes y fauna siguen igual). Lo arma VR.lagoonOf la primera vez.
VR.lagoonOf = (W) => {
  if (W._lag !== undefined) return W._lag;
  W._lag = null;
  const T = VR.T, S = VR.TILE, CH = W.CH, w = W.w;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i = 0; i < W.tiles.length; i++) if (W.tiles[i] === T.LAGUNA) { const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  // región alineada a los chunks, con margen
  const cx0 = Math.floor((x0 - 7) / CH), cy0 = Math.floor((y0 - 7) / CH), cx1 = Math.floor((x1 + 7) / CH), cy1 = Math.floor((y1 + 7) / CH);
  const rx = cx0 * CH, ry = cy0 * CH, gw = (cx1 - cx0 + 1) * CH, gh = (cy1 - cy0 + 1) * CH;
  const at = (x, y) => W.get(rx + x, ry + y);
  // distancia (en baldosas, Chebyshev) al agua, hasta 6
  const dist = new Uint8Array(gw * gh).fill(9), q = [];
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (at(x, y) === T.LAGUNA) { dist[y * gw + x] = 0; q.push(x, y); }
  for (let h = 0; h < q.length; h += 2) { const x = q[h], y = q[h + 1], d = dist[y * gw + x]; if (d >= 6) continue; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= gw || Y >= gh) continue; const k = Y * gw + X; if (dist[k] > d + 1) { dist[k] = d + 1; q.push(X, Y); } } }
  // máscaras: agua, y agua + sendero del anillo (+ ladrillo y monumentos pegados, para que el borde no tenga muescas)
  const mW = new Float32Array(gw * gh), mU = new Float32Array(gw * gh), ring = new Uint8Array(gw * gh);
  for (let k = 0; k < gw * gh; k++) {
    const t = at(k % gw, (k / gw) | 0), d = dist[k];
    if (t === T.LAGUNA) { mW[k] = 1; mU[k] = 1; ring[k] = 1; }
    else if (d <= 3 && t === T.SENDERO) { mU[k] = 1; ring[k] = 2; }
    else if (d <= 3 && (t === T.LADRILLO || t === T.MONUMENT)) { mU[k] = 1; ring[k] = 3; }
  }
  const blur = (m) => { // gaussiano separable, sigma 1 baldosa
    const K = [0.004, 0.054, 0.242, 0.4, 0.242, 0.054, 0.004], tmp = new Float32Array(m.length), o = new Float32Array(m.length);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let s = 0; for (let i = -3; i <= 3; i++) s += K[i + 3] * m[y * gw + Math.min(gw - 1, Math.max(0, x + i))]; tmp[y * gw + x] = s; }
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let s = 0; for (let i = -3; i <= 3; i++) s += K[i + 3] * tmp[Math.min(gh - 1, Math.max(0, y + i)) * gw + x]; o[y * gw + x] = s; }
    return o;
  };
  const fW = blur(mW), fU = blur(mU);
  const PW = gw * S, PH = gh * S, mk = () => { const c = VR.canvas(PW, PH); return [c, c.getContext('2d').createImageData(PW, PH)]; };
  const [cWat, iWat] = mk(), [cPath, iPath] = mk(), [cLine, iLine] = mk(), [cStrip, iStrip] = mk();
  const bil = (f, u, v) => { // u, v en baldosas (centro de baldosa = entero)
    const x = Math.max(0, Math.min(gw - 1.001, u)), y = Math.max(0, Math.min(gh - 1.001, v)), xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, k = yi * gw + xi;
    return (f[k] * (1 - fx) + f[k + 1] * fx) * (1 - fy) + (f[k + gw] * (1 - fx) + f[k + gw + 1] * fx) * fy;
  };
  const put = (im, i, r, g, b, a) => { const d = im.data; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a; };
  for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) {
    const u = (px + 0.5) / S - 0.5, v = (py + 0.5) / S - 0.5, i = (py * PW + px) * 4;
    const w_ = bil(fW, u, v), u_ = bil(fU, u, v);
    if (w_ > 0.5) { put(iWat, i, 0, 0, 0, 255); if (w_ < 0.535) put(iLine, i, 157, 178, 122, 200); continue; } // agua (y brillo verde en la orilla)
    if (w_ > 0.43) { put(iLine, i, 74, 64, 48, 255); continue; }                                            // barro oscuro de la orilla
    if (u_ > 0.5 && w_ > 0.17) { put(iStrip, i, 0, 0, 0, 255); continue; }                                  // franja de tierra colorada entre el agua y el sendero (Street View, 1-2 m)
    if (u_ > 0.5) {
      put(iPath, i, 0, 0, 0, 255);
      if (w_ > 0.135 && w_ <= 0.17) { put(iLine, i, 232, 228, 218, 255); continue; }                         // cordón blanco del lado del agua
      const t = W.get(rx + Math.floor(px / S), ry + Math.floor(py / S));
      if (u_ < 0.53 && t !== T.LADRILLO && !(t === T.SENDERO && dist[Math.floor(py / S) * gw + Math.floor(px / S)] > 3)) put(iLine, i, 236, 233, 224, 255); // piedra blanca del borde
    } else if (u_ > 0.505 - 0.03) {
      const t = W.get(rx + Math.floor(px / S), ry + Math.floor(py / S));
      if (t !== T.SENDERO && t !== T.LADRILLO) put(iLine, i, 0, 0, 0, 50); // sombrita del borde sobre el pasto
    }
  }
  cWat.getContext('2d').putImageData(iWat, 0, 0); cPath.getContext('2d').putImageData(iPath, 0, 0); cStrip.getContext('2d').putImageData(iStrip, 0, 0); cLine.getContext('2d').putImageData(iLine, 0, 0);
  return (W._lag = { rx, ry, gw, gh, dist, ring, cWat, cPath, cLine, cStrip,
    // ¿la baldosa la dibuja la orilla curva? (así no se pintan encima los bordes escalonados de antes)
    owns: (tx, ty) => { const x = tx - rx, y = ty - ry; return x >= 0 && y >= 0 && x < gw && y < gh && (ring[y * gw + x] === 1 || ring[y * gw + x] === 2); } });
};
// paso 1b del chunk: pasto donde estaba el escalón, después sendero, agua y bordes lisos
VR.drawLagoon = (g, W, tx0, ty0, tx1, ty1) => {
  const L = VR.lagoonOf(W); if (!L) return;
  if (tx1 <= L.rx || ty1 <= L.ry || tx0 >= L.rx + L.gw || ty0 >= L.ry + L.gh) return;
  const T = VR.T, S = VR.TILE, R = VR.RES, ox = tx0 * S, oy = ty0 * S, cw = (tx1 - tx0) * S, chh = (ty1 - ty0) * S;
  // 1) las baldosas del anillo y del agua pasan a pasto (o tierra si al lado hay tierra)
  for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) {
    if (!L.owns(tx, ty)) continue;
    let gt = T.GRASS; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = W.get(tx + dx, ty + dy); if ((n === T.PLAZADIRT || n === T.DIRT) && !L.owns(tx + dx, ty + dy)) gt = n; }
    VR.tileset.draw(g, gt, (VR.hash(tx, ty, 99) * 4) | 0, tx * S, ty * S);
  }
  // 2) sendero y agua: su textura recortada con la máscara lisa
  const tmp = VR._lagTmp || (VR._lagTmp = VR.canvas(16 * S * R, 16 * S * R)), tc = tmp.getContext('2d');
  const layer = (type, mask) => {
    tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, tmp.width, tmp.height);
    tc.setTransform(R, 0, 0, R, -ox * R, -oy * R);
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) VR.tileset.draw(tc, type, (VR.hash(tx, ty, 99) * 4) | 0, tx * S, ty * S);
    tc.setTransform(1, 0, 0, 1, 0, 0); tc.imageSmoothingEnabled = false; tc.globalCompositeOperation = 'destination-in';
    tc.drawImage(mask, ox - L.rx * S, oy - L.ry * S, cw, chh, 0, 0, cw * R, chh * R);
    tc.globalCompositeOperation = 'source-over';
    g.drawImage(tmp, 0, 0, cw * R, chh * R, ox, oy, cw, chh);
  };
  const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
  layer(T.SENDERO, L.cPath); layer(T.DIRT, L.cStrip); layer(T.LAGUNA, L.cWat);
  g.drawImage(L.cLine, ox - L.rx * S, oy - L.ry * S, cw, chh, ox, oy, cw, chh);
  // 3) el ladrillo y los monumentos pegados al agua quedan como estaban
  for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) {
    const x = tx - L.rx, y = ty - L.ry; if (x < 0 || y < 0 || x >= L.gw || y >= L.gh) continue;
    const t = W.get(tx, ty); if ((t === T.LADRILLO || t === T.MONUMENT) && L.dist[y * L.gw + x] <= 4) VR.tileset.draw(g, VR.GROUND_OF[t] !== undefined ? VR.GROUND_OF[t] : t, (VR.hash(tx, ty, 99) * 4) | 0, tx * S, ty * S);
  }
  g.imageSmoothingEnabled = sm;
};
