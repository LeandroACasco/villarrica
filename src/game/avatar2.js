// Avatar 2 (04/11/2026): persona adulta armada con un esqueleto y prendas por capas, que se dibuja a cualquier
// resolución con píxeles nítidos: 16×32 en el juego y 48×96 (o más) en la tienda, donde se distinguen las
// costuras, los bolsillos, los botones y los cordones. Cada capa se rasteriza sin suavizado, se pinta con luz
// del lado izquierdo y sombra del derecho, se separa de la capa de abajo con una línea más oscura y al final
// todo lleva un contorno oscuro. Animaciones por fase (quieto, caminar, correr) en 4 direcciones. Original.
'use strict';
(function () {
  const VR = window.VR || (window.VR = {});
  const SH = (h, k) => { const n = parseInt(h.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0'); return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255); };
  const RGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  // ---------- catálogo de la tienda (precios en guaraníes) ----------
  const CAT = {
    skin: ['#f1c9a5', '#e0aa7e', '#c98b5c', '#b07850', '#8f5b38', '#6b4026'],
    hairColor: ['#16110d', '#2a1b12', '#4a2e1a', '#7a4e24', '#c8a050', '#9c9890', '#8a2a22'],
    cloth: ['#c8322a', '#f2efe6', '#2e6fc8', '#2c2c34', '#3b9a5a', '#e8b830', '#7a4ab0', '#e86aa0', '#e87a2a', '#4aa8b8', '#8a6a48', '#6a7a3a', '#a8d0ec', '#1e3a6a', '#9a9aa2', '#5a2a2a'],
    denim: ['#2c4a7b', '#4a6a9a', '#2a2a32', '#6a6258', '#c8c0ae'],
    hair: { corto: ['Corto', 15000], degrade: ['Degradé', 25000], rapado: ['Rapado', 10000], peinadoAtras: ['Para atrás', 20000], flequillo: ['Flequillo', 20000],
      medio: ['Hasta los hombros', 25000], largo: ['Largo lacio', 25000], onduladoFlequillo: ['Ondulado con flequillo', 35000], ondulado: ['Largo ondulado', 30000], rulos: ['Rulos', 30000], colita: ['Colita', 20000], colitaLado: ['Colita al costado', 20000], rodete: ['Rodete', 20000], trenza: ['Trenza', 30000], pelado: ['Pelado', 0] },
    top: { remera: ['Remera', 35000], musculosa: ['Musculosa', 25000], polo: ['Chomba', 60000], camiseta: ['Camiseta a rayas', 95000], camisa: ['Camisa manga larga', 85000],
      camisaCorta: ['Camisa manga corta', 75000], buzo: ['Buzo con capucha', 120000], campera: ['Campera abierta', 160000], puffer: ['Campera inflable', 220000], hoodieAbierto: ['Campera con capucha', 150000], sueter: ['Buzo liso', 90000], top: ['Top', 30000] },
    bottom: { jean: ['Jean', 110000], cargo: ['Pantalón cargo', 120000], jogging: ['Jogging', 70000], vestir: ['Pantalón de vestir', 130000], bermuda: ['Bermuda', 55000], cargoShort: ['Short cargo', 60000],
      short: ['Short', 40000], pollera: ['Pollera', 65000], calza: ['Calza', 50000] },
    shoes: { zapatillas: ['Zapatillas', 150000], botitas: ['Zapatillas altas', 180000], chinelas: ['Chinelas', 20000], zapatos: ['Zapatos', 200000], botines: ['Botines', 180000] },
    hat: { ninguno: ['Sin gorra', 0], gorra: ['Gorra', 30000], gorraAtras: ['Gorra para atrás', 30000], gorro: ['Gorro de lana', 35000], piri: ['Sombrero piri', 45000] },
    extra: { lentes: ['Lentes de sol', 25000], anteojos: ['Anteojos', 90000], mochila: ['Mochila', 90000], termo: ['Termo de tereré', 60000], reloj: ['Reloj', 70000], cadenita: ['Cadenita', 40000] },
    beard: { no: ['Sin barba', 0], bigote: ['Bigote', 0], barba: ['Barba', 0], candado: ['Candado', 0] },
    build: { flaco: ['Flaco', 0], normal: ['Normal', 0], fornido: ['Fornido', 0], panza: ['Con panza', 0] },
    gender: { m: ['Hombre', 0], f: ['Mujer', 0] },
  };
  VR.AV2_CAT = CAT;
  VR.AV2_DEFAULT = { gender: 'm', skin: 2, build: 'normal', hair: 'corto', hairColor: 1, beard: 'no', top: 'remera', topColor: 0, topColor2: 1, bottom: 'jean', bottomColor: 0,
    shoes: 'zapatillas', shoesColor: 1, hat: 'ninguno', hatColor: 3, lentes: false, anteojos: false, mochila: false, termo: false, reloj: false, cadenita: false, packColor: 4, print: false };
  VR.av2Price = (L) => {
    let t = CAT.hair[L.hair][1] + CAT.top[L.top][1] + CAT.bottom[L.bottom][1] + CAT.shoes[L.shoes][1] + CAT.hat[L.hat][1];
    for (const k in CAT.extra) if (L[k]) t += CAT.extra[k][1];
    return t;
  };
  VR.av2Random = (rnd = Math.random) => {
    const pick = (o) => { const k = Object.keys(o); return k[(rnd() * k.length) | 0]; }, n = (a) => (rnd() * a.length) | 0;
    const gender = rnd() < 0.5 ? 'f' : 'm';
    const L = { gender, skin: n(CAT.skin), build: pick(CAT.build), hair: pick(CAT.hair), hairColor: rnd() < 0.85 ? n(CAT.hairColor.slice(0, 5)) : n(CAT.hairColor), beard: rnd() < 0.3 ? pick(CAT.beard) : 'no',
      top: pick(CAT.top), topColor: n(CAT.cloth), topColor2: n(CAT.cloth), bottom: pick(CAT.bottom), bottomColor: n(CAT.cloth), shoes: pick(CAT.shoes), shoesColor: n(CAT.cloth),
      hat: rnd() < 0.3 ? pick(CAT.hat) : 'ninguno', hatColor: n(CAT.cloth), packColor: n(CAT.cloth), print: rnd() < 0.4 };
    for (const k in CAT.extra) L[k] = rnd() < 0.14;
    if (L.lentes && L.anteojos) L.anteojos = false;
    if (gender === 'f') { L.beard = 'no'; if (rnd() < 0.7) L.hair = ['largo', 'ondulado', 'colita', 'colitaLado', 'rodete', 'trenza'][(rnd() * 6) | 0]; }
    else { if (L.top === 'top') L.top = 'remera'; if (L.bottom === 'pollera' || L.bottom === 'calza') L.bottom = 'jean'; if (['trenza', 'rodete', 'colitaLado', 'ondulado'].includes(L.hair)) L.hair = 'corto'; }
    return L;
  };

  // ---------- esqueleto (unidades de una grilla de 16×32; el suelo está en y = 31.6) ----------
  // Ciclos con poses clave (como en animación tradicional):
  //  caminar: contacto (talón al piso, piernas abiertas) → bajada (rodilla absorbe, cuerpo más bajo) →
  //           paso (pierna de apoyo recta, cuerpo más alto) → subida (empuja con la punta) → contacto.
  //  correr:  contacto → bajada (compresión) → empuje → vuelo (los dos pies en el aire, talón a la cola) →
  //           rodilla arriba → contacto. Brazos opuestos a las piernas, con retraso; inclinación hacia adelante.
  const D2R = Math.PI / 180;
  // [fase 0..1, ángulo del muslo (°, + adelante), flexión de rodilla (°), ángulo del pie (°, + punta arriba)]
  const LEG_WALK = [[0, 26, 4, 14], [0.1, 18, 16, 0], [0.25, 2, 6, 0], [0.4, -16, 6, -8], [0.5, -24, 14, -26], [0.62, -16, 42, -20], [0.75, 6, 58, -4], [0.88, 24, 26, 8], [1, 26, 4, 14]];
  const LEG_RUN = [[0, 30, 22, 6], [0.1, 14, 40, 0], [0.24, -26, 12, -18], [0.36, -40, 52, -30], [0.5, -22, 112, -30], [0.66, 30, 102, -10], [0.82, 54, 62, 6], [1, 30, 22, 6]];
  const key = (tab, t) => {
    t = ((t % 1) + 1) % 1;
    for (let i = 0; i < tab.length - 1; i++) {
      const [t0, ...a] = tab[i], [t1, ...b] = tab[i + 1];
      if (t >= t0 && t <= t1) { let u = (t - t0) / (t1 - t0); u = u * u * (3 - 2 * u); return a.map((v, j) => v + (b[j] - v) * u); }
    }
    return tab[0].slice(1);
  };
  function skeleton(L, dir, anim, ph) {
    const fem = L.gender === 'f';
    const bd = { flaco: [0.9, 0.92], normal: [1, 1], fornido: [1.14, 1.06], panza: [1.06, 1.18] }[L.build] || [1, 1];
    const sw = bd[0] * (fem ? 0.84 : 1), ww = bd[1] * (fem ? 0.84 : 1), hipW = fem ? 1.18 : 1;
    const run = anim === 'run', walk = anim === 'walk', moving = run || walk;
    const S = { sw, ww, hipW, fem, dir, anim, run };
    const L1 = 6.5, L2 = 6.5;
    const tab = run ? LEG_RUN : LEG_WALK;
    const legAt = (t) => moving ? key(tab, t) : [0, 4, 0];
    const lN = legAt(ph), lF = legAt(ph + 0.5);
    const legPts = (hip, [th, kn, fa]) => {
      const a = th * D2R, b2 = (th - kn) * D2R;
      const k2 = [hip[0] + Math.sin(a) * L1, hip[1] + Math.cos(a) * L1];
      const an = [k2[0] + Math.sin(b2) * L2, k2[1] + Math.cos(b2) * L2];
      return [k2, an, fa];
    };
    // altura del cuerpo: caminando, el pie de apoyo toca el piso; corriendo, curva de rebote con vuelo
    const hip0 = [8, 17.0];
    const pN = legPts(hip0, lN), pF = legPts(hip0, lF);
    let bodyY;
    if (run) { const c = Math.cos(4 * Math.PI * (ph - 0.1)); bodyY = 30.0 - Math.max(pN[1][1], pF[1][1]); bodyY = Math.min(bodyY, 0.5) - 0.9 * Math.max(0, -c) - 0.25; }
    else bodyY = 30.0 - Math.max(pN[1][1], pF[1][1]);
    if (!moving) bodyY = 30.0 - pN[1][1];
    S.bob = bodyY;
    // brazos: opuestos a la pierna del mismo lado, con un poco de retraso
    const armAt = (t) => {
      const s = Math.sin(2 * Math.PI * (t - 0.06));
      if (run) return [-44 * s + 6, 88 + 12 * s];
      if (walk) return [-24 * s, 12 + 14 * Math.max(0, -s)];
      return [0, 6];
    };
    const aN = armAt(ph), aF = armAt(ph + 0.5);
    const lean = run ? 10 : walk ? 2 : 0;
    if (dir === 'left' || dir === 'right') {
      const lx = Math.sin(lean * D2R);
      const hip = [8, 17.0 + bodyY];
      const N = legPts(hip, lN), F = legPts(hip, lF);
      S.hip = hip; S.kneeN = N[0]; S.ankN = N[1]; S.footN = N[2]; S.kneeF = F[0]; S.ankF = F[1]; S.footF = F[2];
      S.lean = lean; S.lx = lx;
      const hbob = moving ? 0.25 * Math.sin(4 * Math.PI * (ph - 0.15)) : 0; // la cabeza acompaña con retraso
      S.shoulder = [8 + lx * 9.2, 8.4 + bodyY];
      S.neck = [8 + lx * 10.2, 7.0 + bodyY];
      S.head = [8.35 + lx * 12.2, 3.9 + bodyY + hbob * 0.3];
      const arm = ([ang, bend]) => {
        const a = ang * D2R, b2 = (ang + bend) * D2R;
        const e = [S.shoulder[0] + Math.sin(a) * 4.7, S.shoulder[1] + Math.cos(a) * 4.7];
        return [e, [e[0] + Math.sin(b2) * 4.0, e[1] + Math.cos(b2) * 4.0]];
      };
      const AN = arm(aN), AF = arm(aF);
      S.elbN = AN[0]; S.wriN = AN[1]; S.elbF = AF[0]; S.wriF = AF[1];
      S.hair = moving ? -bodyY * 0.4 : 0;
      return S;
    }
    // de frente / de espaldas: las mismas piernas proyectadas. Lo que va hacia la cámara baja un poco (vista 3/4).
    const toward = dir === 'down' ? 1 : -1;
    const sway = moving ? (run ? 0.2 : 0.35) * Math.sin(2 * Math.PI * ph) : 0; // la cadera se va hacia la pierna de apoyo
    const tilt = moving ? 0.22 * Math.sin(2 * Math.PI * ph) : 0;               // hombros al revés de la cadera
    const proj = (hx, hy, [th, kn]) => {
      const a = th * D2R, b2 = (th - kn) * D2R;
      const kx = hx, ky = hy + Math.cos(a) * L1 + Math.sin(a) * L1 * 0.22 * toward;
      const ax = hx, ay = ky + Math.cos(b2) * L2 + Math.sin(b2) * L2 * 0.22 * toward;
      return [[kx, ky], [ax, ay]];
    };
    const hy = 17.0 + bodyY, hx = 8 + sway;
    // pierna izquierda de la pantalla = derecha del personaje cuando mira a la cámara
    const lLeft = dir === 'down' ? lF : lN, lRight = dir === 'down' ? lN : lF;
    const PL = proj(hx - 1.3 * ww * hipW, hy, lLeft), PR = proj(hx + 1.3 * ww * hipW, hy, lRight);
    S.hip = [[hx - 1.3 * ww * hipW, hy], [hx + 1.3 * ww * hipW, hy]];
    S.knee = [PL[0], PR[0]]; S.ank = [PL[1], PR[1]];
    if (run) { S.knee[0][0] -= 0.25; S.knee[1][0] += 0.25; }
    const shY = 8.5 + bodyY, sx = 8 - sway * 0.4;
    S.sh = [[sx - 3.1 * sw, shY + tilt], [sx + 3.1 * sw, shY - tilt]];
    S.neckBase = [sx, 7.1 + bodyY];
    S.head = [sx - sway * 0.2, 3.9 + bodyY];
    const armF = (side, [ang, bend], shp) => {
      const a = ang * D2R, b2 = (ang + bend) * D2R;
      const out = side * (run ? 0.5 : 0.35);
      const e = [shp[0] + out * 0.6, shp[1] + Math.cos(a) * 4.7 + Math.sin(a) * 4.7 * 0.22 * toward];
      const w = [e[0] + (run ? -side * Math.sin(Math.max(0, a)) * 1.6 : out * 0.2), e[1] + Math.cos(b2) * 4.0 + Math.sin(b2) * 4.0 * 0.22 * toward];
      return [e, w];
    };
    const aLeft = dir === 'down' ? aN : aF, aRight = dir === 'down' ? aF : aN; // brazo opuesto a la pierna del mismo lado
    const EL = armF(-1, aLeft, S.sh[0]), ER = armF(1, aRight, S.sh[1]);
    S.elb = [EL[0], ER[0]]; S.wri = [EL[1], ER[1]];
    S.hair = moving ? -bodyY * 0.4 : 0;
    return S;
  }

  // ---------- render ----------
  function render(L, dir, anim, ph, k) {
    const W = 16 * k, H = 32 * k;
    const out = new Uint8ClampedArray(W * H * 4), lay = new Int16Array(W * H).fill(-1);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    let layerN = 0;
    const mirror = dir === 'left', side = dir === 'left' || dir === 'right', back = dir === 'up';
    const S = skeleton(L, dir, anim, ph);
    // --- formas en unidades de la grilla ---
    const cap = (g, a, b, w0, w1) => { // segmento con grosor que se afina, extremos redondos
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1e-3, nx = -dy / l, ny = dx / l;
      g.beginPath(); g.moveTo(a[0] + nx * w0 / 2, a[1] + ny * w0 / 2); g.lineTo(b[0] + nx * w1 / 2, b[1] + ny * w1 / 2); g.lineTo(b[0] - nx * w1 / 2, b[1] - ny * w1 / 2); g.lineTo(a[0] - nx * w0 / 2, a[1] - ny * w0 / 2); g.closePath(); g.fill();
      g.beginPath(); g.arc(a[0], a[1], w0 / 2, 0, 7); g.fill(); g.beginPath(); g.arc(b[0], b[1], w1 / 2, 0, 7); g.fill();
    };
    const ell = (g, x, y, rx, ry, r = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, r, 0, 7); g.fill(); };
    const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    // --- rasterizar una forma a máscara nítida ---
    const raster = (fn) => {
      cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, W, H);
      cx.setTransform(mirror ? -k : k, 0, 0, k, mirror ? W : 0, 0); cx.fillStyle = '#fff'; cx.strokeStyle = '#fff';
      fn(cx);
      const d = cx.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H);
      for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 118 ? 1 : 0;
      return m;
    };
    const setPx = (i, c) => { out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255; };
    // pinta una capa: base, luz a la izquierda, sombra a la derecha (y abajo), línea de separación con lo de abajo
    const paint = (fn, base, o = {}) => {
      const m = o.mask || raster(fn);
      if (o.clip) for (let i = 0; i < m.length; i++) m[i] &= o.clip[i];
      const B = RGB(base), Sd = RGB(o.shade || SH(base, 0.74)), Li = RGB(o.light || SH(base, 1.16)), id = layerN++;
      const s = Math.max(1, Math.round(k * (o.band || 0.45)));
      const lightSide = mirror ? 1 : -1; // la luz viene de la izquierda de la pantalla
      if (o.sep !== false && k >= 2) {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x; if (m[i] || out[i * 4 + 3] === 0) continue;
          if ((x > 0 && m[i - 1]) || (x < W - 1 && m[i + 1]) || (y > 0 && m[i - W]) || (y < H - 1 && m[i + W])) {
            out[i * 4] *= 0.72; out[i * 4 + 1] *= 0.72; out[i * 4 + 2] *= 0.72;
          }
        }
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (!m[i]) continue;
        let c = B;
        if (o.flat !== true) {
          const sx = mirror ? -1 : 1;
          const rx = x + s * sx, lx = x - s * sx;
          const shadeHere = rx < 0 || rx >= W || !m[y * W + rx] || (o.shadeBottom && (y + s >= H || !m[(y + s) * W + x]));
          const lightHere = lx < 0 || lx >= W || !m[y * W + lx];
          if (shadeHere && !lightHere) c = Sd; else if (lightHere && !shadeHere && o.light !== false) c = Li;
          void lightSide;
        }
        setPx(i, c); lay[i] = id;
      }
      return m;
    };
    const pix = (x, y, col, w = 1, h = 1) => { // píxeles sueltos en coordenadas de la grilla (para la cara y detalles)
      const X0 = Math.round(x * k), Y0 = Math.round(y * k), c = RGB(col);
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        let X = X0 + xx; if (mirror) X = W - 1 - X; const Y = Y0 + yy;
        if (X >= 0 && Y >= 0 && X < W && Y < H) setPx(Y * W + X, c);
      }
    };
    const P = Math.max(1, Math.round(k / 3)); // tamaño de un "detalle" en píxeles reales
    // --- colores ---
    const skin = CAT.skin[L.skin], skinD = SH(skin, 0.8), hair = CAT.hairColor[L.hairColor];
    const topC = CAT.cloth[L.topColor], top2 = CAT.cloth[L.topColor2];
    const botC = (L.bottom === 'jean' ? CAT.denim : CAT.cloth)[L.bottomColor % (L.bottom === 'jean' ? CAT.denim.length : CAT.cloth.length)];
    const shoeC = CAT.cloth[L.shoesColor], hatC = CAT.cloth[L.hatColor], packC = CAT.cloth[L.packColor];
    const sw = S.sw, ww = S.ww;
    const OPEN = L.top === 'campera' || L.top === 'puffer' || L.top === 'hoodieAbierto';
    const LONGTOP = OPEN || L.top === 'sueter' || L.top === 'buzo'; // prendas que tapan la cintura del pantalón
    const longSleeve = L.top === 'camisa' || L.top === 'buzo' || L.top === 'sueter' || OPEN;
    const sleeveLen = L.top === 'musculosa' || L.top === 'top' ? 0 : longSleeve ? 1 : 0.45;
    const legLen = { short: 0.26, cargoShort: 0.28, bermuda: 0.58, pollera: 0, calza: 0.92 }[L.bottom] ?? 1;
    const wavy = L.hair === 'ondulado' || L.hair === 'onduladoFlequillo';
    const longHair = L.hair === 'largo' || L.hair === 'trenza' || wavy;
    const midHair = L.hair === 'medio';

    if (!side) {
      const front = !back;
      const [hL, hR] = S.hip, [kL, kR] = S.knee, [aL, aR] = S.ank, [sL, sR] = S.sh, [eL, eR] = S.elb, [wL, wR] = S.wri;
      // pelo largo por detrás del cuerpo (de frente)
      if (longHair && front) paint((g) => { poly(g, [[8 - 2.6, 3.5 + S.bob], [8 + 2.6, 3.5 + S.bob], [8 + 2.9, 10.8 + S.bob], [8 - 2.9, 10.8 + S.bob]]); }, SH(hair, 0.8), { light: false });
      if (L.mochila && front) paint((g) => { g.fillRect(8 - 3.4 * sw, 8 + S.bob, 6.8 * sw, 7); }, SH(packC, 0.7), { light: false });
      // piernas (piel) y pantalón encima
      for (const [h, kn, an] of [[hL, kL, aL], [hR, kR, aR]]) paint((g) => { cap(g, h, kn, 2.2 * ww, 1.8); cap(g, kn, an, 1.8, 1.3); }, skin, { shade: skinD });
      if (L.bottom === 'pollera') {
        paint((g) => poly(g, [[8 - 2.4 * ww, 14.6 + S.bob], [8 + 2.4 * ww, 14.6 + S.bob], [8 + 3.2 * ww, 21.2 + S.bob], [8 - 3.2 * ww, 21.2 + S.bob]]), botC);
        if (k >= 2) for (const x of [-1.5, 0, 1.5]) pix(8 + x * ww, 18 + S.bob, SH(botC, 0.78), P, Math.round(3 * k));
      } else {
        const wide = L.bottom === 'cargo' || L.bottom === 'jogging' ? 0.35 : L.bottom === 'calza' ? -0.3 : 0;
        for (const [h, kn, an, rightLeg] of [[hL, kL, aL, false], [hR, kR, aR, true]]) {
          const end = legLen >= 1 ? an : legLen > 0.5 ? lerp(kn, an, (legLen - 0.5) * 2) : lerp(h, kn, legLen * 2);
          const kn2 = legLen > 0.5 ? kn : end;
          paint((g) => { cap(g, h, kn2, (2.6 + wide) * ww, 2.2 + wide); if (legLen > 0.5) cap(g, kn, end, 2.2 + wide, L.bottom === 'jogging' ? 1.6 : 1.85 + wide); }, botC, { shade: SH(botC, 0.72) });
          if (k >= 2) {
            if (L.bottom === 'jean' || L.bottom === 'vestir') pix(kn[0] + (rightLeg ? -0.5 : 0.3), kn[1] + 0.2, SH(botC, 0.78), P, P); // pliegue en la rodilla
            if (L.bottom === 'jogging') for (let t = 0; t <= 1; t += 0.08) { const p = lerp(h, end, t); pix(p[0] + (rightLeg ? 0.9 : -1.1), p[1], '#f2efe6', P, P); }
            if (L.bottom === 'cargoShort') { const p = lerp(h, kn, 0.55); pix(p[0] + (rightLeg ? 0.3 : -1.3), p[1], SH(botC, 0.72), Math.round(1 * k), Math.round(1.0 * k)); }
            if (L.bottom === 'cargo') { const p = lerp(h, kn, 0.75); pix(p[0] + (rightLeg ? 0.4 : -1.4), p[1], SH(botC, 0.72), Math.round(1 * k), Math.round(1.2 * k)); }
            if (L.bottom === 'jean' && legLen >= 1) pix(end[0] - 0.9, end[1] - 0.2, SH(botC, 1.25), Math.round(1.8 * k), P); // dobladillo
          }
        }
        if (legLen > 0) paint((g) => g.fillRect(8 - 2.5 * ww, 14.6 + S.bob, 5 * ww, 2.6), botC, { shade: SH(botC, 0.72) }); // cadera
        if (front && k >= 2 && (L.bottom === 'jean' || L.bottom === 'cargo' || L.bottom === 'vestir' || L.bottom === 'bermuda')) {
          pix(8 - 0.1, 15.2 + S.bob, SH(botC, 0.7), P, Math.round(1.6 * k)); // bragueta
          pix(8 - 2.2 * ww, 15.1 + S.bob, SH(botC, 0.75), Math.round(0.9 * k), P); pix(8 + 1.4 * ww, 15.1 + S.bob, SH(botC, 0.75), Math.round(0.9 * k), P); // bolsillos
        }
      }
      // calzado
      for (const an of [aL, aR]) {
        if (L.shoes === 'chinelas') {
          paint((g) => ell(g, an[0], an[1] + 1.05, 1.15, 0.55), shoeC, { light: false });
          paint((g) => ell(g, an[0], an[1] + 0.75, 0.85, 0.5), skin, { shade: skinD });
          if (k >= 2) pix(an[0] - 0.5, an[1] + 0.55, SH(shoeC, 0.8), Math.round(1 * k), P);
        } else {
          const tall = L.shoes === 'botitas' || L.shoes === 'botines';
          const c = L.shoes === 'botines' ? '#5a3a22' : L.shoes === 'zapatos' ? '#2a1e16' : shoeC;
          paint((g) => { ell(g, an[0], an[1] + 0.9, 1.3, 0.85); if (tall) g.fillRect(an[0] - 0.85, an[1] - 1.2, 1.7, 1.8); }, c);
          if (L.shoes === 'zapatillas' || L.shoes === 'botitas') { pix(an[0] - 1.2, an[1] + 1.45, '#f2efe6', Math.round(2.4 * k), P); if (k >= 2 && front) { pix(an[0] - 0.35, an[1] + 0.3, '#f2efe6', P, P); pix(an[0] - 0.35, an[1] + 0.75, '#f2efe6', P, P); } }
        }
      }
      // torso
      const torsoPts = (ext) => {
        const b = S.bob, e = ext || 0, belly = L.build === 'panza' ? 0.6 : 0, nb = S.neckBase, f = S.fem;
        const [L0, R0] = S.sh, wy = 13.6 + b, hy2 = (LONGTOP && ext >= 0 ? 17.5 : 16.6) + b;
        const wx = (f ? 1.85 : 2.3) * ww + belly + (LONGTOP ? 0.2 : 0), hx2 = (f ? 2.75 : 2.45) * ww + (LONGTOP ? 0.35 : 0);
        return [[nb[0] - 1.0 - e * 0.3, nb[1]], [L0[0] + 1.0, L0[1] - 0.75 - e * 0.5], [L0[0] - 0.15 - e, L0[1] + 0.2], [L0[0] + 0.35 - e, L0[1] + 2.3], [8 - wx - e, wy], [8 - hx2 - e, hy2], [8 + hx2 + e, hy2], [8 + wx + e, wy],
          [R0[0] - 0.35 + e, R0[1] + 2.3], [R0[0] + 0.15 + e, R0[1] + 0.2], [R0[0] - 1.0, R0[1] - 0.75 - e * 0.5], [nb[0] + 1.0 + e * 0.3, nb[1]]];
      };
      const skinTorso = paint((g) => { poly(g, torsoPts(0)); }, skin, { shade: skinD });
      const hasTop = L.top !== 'top';
      let topMask = null;
      const bulky = L.top === 'puffer' ? 0.6 : L.top === 'buzo' || OPEN ? 0.35 : L.top === 'sueter' ? 0.25 : 0;
      if (L.top === 'top') topMask = paint((g) => poly(g, [[8 - 2.7 * sw, 8.6 + S.bob], [8 + 2.7 * sw, 8.6 + S.bob], [8 + 2.5 * sw, 12 + S.bob], [8 - 2.5 * sw, 12 + S.bob]]), topC);
      else if (L.top === 'musculosa') topMask = paint((g) => { poly(g, torsoPts(0).map(([x, y], i) => i < 2 ? [8 + (x - 8) * 0.72, y + 0.3] : [x, y])); }, topC);
      else topMask = paint((g) => { poly(g, torsoPts(OPEN ? 0 : bulky)); }, OPEN ? top2 : topC);
      if (S.fem && front && k >= 2 && L.top !== 'top') { const y = 10.9 + S.bob; pix(8 - 2.0 * sw, y, SH(OPEN ? top2 : topC, 0.8), Math.round(1.5 * k), P); pix(8 + 0.5 * sw, y, SH(OPEN ? top2 : topC, 0.8), Math.round(1.5 * k), P); }
      if (OPEN) { // campera abierta: dos paneles a los costados y lo de adentro en el medio
        const T = torsoPts(bulky), n = T.length, half = n / 2, gap = L.top === 'puffer' ? 0.8 : 0.95;
        const left = [], right = [];
        for (let i = 0; i < half; i++) left.push(T[i]);
        for (let i = half; i < n; i++) right.push(T[i]);
        paint((g) => { poly(g, [...left, [8 - gap, 16.0 + S.bob], [8 - gap * 0.8, T[0][1] + 0.3]]); }, topC);
        paint((g) => { poly(g, [[8 + gap * 0.8, T[n - 1][1] + 0.3], [8 + gap, 16.0 + S.bob], ...right]); }, topC);
        if (L.top === 'puffer' && k >= 2) for (let y = 9; y <= 16.6; y += 1.3) { for (const [x0, w] of [[8 - 3.2 * sw, 3.2 * sw - gap], [8 + gap, 3.2 * sw - gap]]) { pix(x0, y + S.bob, SH(topC, 0.55), Math.round(w * k), P); pix(x0 + 0.3, y + S.bob - 0.55, SH(topC, 1.45), Math.round((w - 0.6) * k), P); } }
        if (L.top === 'puffer') paint((g) => { g.fillRect(8 - 2.0, 6.7 + S.bob, 4.0, 0.9); }, SH(topC, 0.85), { light: false }); // cuello alto
        if (L.top === 'hoodieAbierto') { paint((g) => { ell(g, 8, 7.2 + S.bob, 2.3, 0.95); }, SH(topC, 0.82), { light: false }); if (k >= 2) { pix(8 - gap - 0.3, 7.9 + S.bob, '#f2efe6', P, Math.round(2.2 * k)); pix(8 + gap, 7.9 + S.bob, '#f2efe6', P, Math.round(2.2 * k)); } }
        if (L.top === 'campera' && k >= 2) { pix(8 - 1.3, 13 + S.bob, SH(topC, 0.7), Math.round(0.9 * k), P); pix(8 + 0.6, 13 + S.bob, SH(topC, 0.7), Math.round(0.9 * k), P); }
        if (k >= 2) pix(8 - gap - 0.15, 8 + S.bob, SH(topC, 0.6), P, Math.round(8 * k)); // cierre
      }
      if (L.top === 'camiseta') paint(null, top2, { mask: raster((g) => { for (let x = -4; x <= 4; x += 1.6) g.fillRect(8 + x, 6, 0.75, 11); }), clip: topMask, light: false, sep: false });
      if (L.print && (L.top === 'remera' || L.top === 'musculosa') && front && k >= 2) paint((g) => { g.fillRect(8 - 1.4, 9.6 + S.bob, 2.8, 2.2); }, top2, { sep: false, light: false });
      if (front && hasTop) {
        // cuello: redondo (remera), en V (camiseta), con solapa (chomba, camisa), capucha (buzo)
        if (L.top === 'remera' || L.top === 'musculosa' || L.top === 'camiseta' || L.top === 'sueter') paint((g) => ell(g, 8, 7.1 + S.bob, 1.15, 0.75), skin, { shade: skinD, sep: k >= 2 });
        if (L.top === 'polo' || L.top === 'camisa' || L.top === 'camisaCorta') {
          paint((g) => poly(g, [[8 - 0.9, 7 + S.bob], [8 + 0.9, 7 + S.bob], [8, 8.4 + S.bob]]), skin, { shade: skinD });
          const col = L.top === 'polo' ? top2 : SH(topC, 1.12);
          paint((g) => { poly(g, [[8 - 1.6, 6.9 + S.bob], [8 - 0.2, 7.3 + S.bob], [8 - 0.6, 8.6 + S.bob]]); poly(g, [[8 + 1.6, 6.9 + S.bob], [8 + 0.2, 7.3 + S.bob], [8 + 0.6, 8.6 + S.bob]]); }, col, { light: false });
          if (k >= 2) { const n = L.top === 'polo' ? 2 : 5; for (let i = 0; i < n; i++) pix(8 - 0.15, 8.9 + i * 1.3 + S.bob, '#f4f1e8', P, P); if (L.top !== 'polo') pix(8 - 0.05, 8.6 + S.bob, SH(topC, 0.75), P, Math.round(6.6 * k)); }
        }
        if (L.top === 'buzo') {
          paint((g) => { ell(g, 8, 7.2 + S.bob, 2.2, 0.9); }, SH(topC, 0.8), { light: false });
          if (k >= 2) { pix(8 - 0.7, 7.8 + S.bob, '#f2efe6', P, Math.round(1.6 * k)); pix(8 + 0.5, 7.8 + S.bob, '#f2efe6', P, Math.round(1.6 * k)); }
          paint((g) => { poly(g, [[8 - 1.9, 12 + S.bob], [8 + 1.9, 12 + S.bob], [8 + 2.2, 14.3 + S.bob], [8 - 2.2, 14.3 + S.bob]]); }, SH(topC, 0.9), { light: false }); // bolsillo canguro
          paint((g) => g.fillRect(8 - 2.6 * ww, 14.9 + S.bob, 5.2 * ww, 0.9), SH(topC, 0.82), { light: false }); // elástico
        }
        if (L.top === 'campera' || L.top === 'hoodieAbierto') paint((g) => ell(g, 8, 7.1 + S.bob, 1.05, 0.7), skin, { shade: skinD });
        if (L.top === 'puffer') { paint((g) => poly(g, [[8 - 0.8, 7.2 + S.bob], [8 + 0.8, 7.2 + S.bob], [8, 8.6 + S.bob]]), skin, { shade: skinD }); paint((g) => { poly(g, [[8 - 1.3, 7.1 + S.bob], [8 - 0.2, 7.4 + S.bob], [8 - 0.5, 8.5 + S.bob]]); poly(g, [[8 + 1.3, 7.1 + S.bob], [8 + 0.2, 7.4 + S.bob], [8 + 0.5, 8.5 + S.bob]]); }, SH(top2, 1.1), { light: false }); }
      }
      if (back && (L.top === 'buzo' || L.top === 'hoodieAbierto')) paint((g) => ell(g, 8, 7.6 + S.bob, 2.4, 1.4), SH(topC, 0.86));
      if (back && L.top === 'puffer' && k >= 2) for (let y = 9; y <= 15.4; y += 1.25) pix(8 - 3.0 * sw, y + S.bob, SH(topC, 0.62), Math.round(6 * sw * k), P);
      if (L.mochila) {
        if (front) for (const x of [-1.9, 1.9]) paint((g) => g.fillRect(8 + x * sw - 0.35, 7.1 + S.bob, 0.7, 6.4), SH(packC, 0.8), { light: false });
        else { paint((g) => { g.beginPath(); g.roundRect(8 - 2.4, 8.2 + S.bob, 4.8, 6.4, 0.9); g.fill(); }, packC); paint((g) => { g.beginPath(); g.roundRect(8 - 1.6, 11.6 + S.bob, 3.2, 2.2, 0.5); g.fill(); }, SH(packC, 0.85)); }
      }
      if (L.cadenita && front && L.top !== 'buzo') { for (let t = -1; t <= 1; t += 0.25) pix(8 + t * 1.1, 7.6 + Math.abs(t) * -0.5 + 0.9 + S.bob, '#e8c860', P, P); }
      // brazos: piel, manga encima, mano
      for (const [s0, e0, w0, right] of [[sL, eL, wL, false], [sR, eR, wR, true]]) {
        paint((g) => { cap(g, s0, e0, 1.95 * sw, 1.6); cap(g, e0, w0, 1.6, 1.3); }, skin, { shade: skinD });
        if (sleeveLen > 0) {
          const end = sleeveLen >= 1 ? w0 : lerp(s0, e0, sleeveLen * 1.6);
          paint((g) => { cap(g, s0, sleeveLen >= 1 ? e0 : end, (2.05 + bulky) * sw, 1.85 + bulky); if (sleeveLen >= 1) cap(g, e0, w0, 1.7 + bulky, 1.5 + bulky); }, topC, { shade: SH(topC, 0.72) });
          if (sleeveLen >= 1 && k >= 2) pix(w0[0] - 0.75, w0[1] - 0.2, SH(topC, 0.78), Math.round(1.5 * k), P); // puño
          if (L.top === 'puffer' && k >= 2) for (let t = 0.2; t < 1; t += 0.22) { const q = lerp(s0, w0, t); pix(q[0] - 0.9, q[1], SH(topC, 0.62), Math.round(1.8 * k), P); }
        }
        paint((g) => { ell(g, w0[0], w0[1] + 0.8, 0.82, 0.95); }, skin, { shade: skinD });
        if (L.reloj && !right && k >= 2) pix(w0[0] - 0.6, w0[1] - 0.15, '#2a2a30', Math.round(1.2 * k), Math.max(1, Math.round(0.45 * k)));
        if (L.termo && right) {
          paint((g) => { g.beginPath(); g.roundRect(w0[0] - 0.6, w0[1] - 1.6, 1.2, 3.6, 0.3); g.fill(); }, '#2e6fc8');
          if (k >= 2) { pix(w0[0] - 0.6, w0[1] - 1.6, '#d8dce4', Math.round(1.2 * k), P); pix(w0[0] - 0.6, w0[1] + 1.3, '#d8dce4', Math.round(1.2 * k), P); }
        }
      }
      // cuello y cabeza
      paint((g) => g.fillRect(S.head[0] - 0.7, 5.8 + S.bob, 1.4, 1.8), skinD, { light: false });
      const [hx, hy] = S.head;
      paint((g) => { ell(g, hx, hy, 2.0, 2.4); ell(g, hx, hy + 1.25, S.fem ? 1.45 : 1.6, 1.5); }, skin, { shade: skinD });
      paint((g) => { ell(g, hx - 2.0, hy + 0.2, 0.42, 0.65); ell(g, hx + 2.0, hy + 0.2, 0.42, 0.65); }, skinD, { light: false, sep: false });
      if (front) {
        // cara
        const ey = hy + 0.05;
        if (k >= 3) {
          for (const sx of [-1, 1]) { pix(hx + sx * 0.85 - 0.45, ey, '#f4f0e6', Math.round(0.9 * k), P); pix(hx + sx * 0.85 - (sx < 0 ? 0 : 0.0), ey, '#1a1410', P, P + (k >= 4 ? 1 : 0)); }
        } else for (const sx of [-1, 1]) pix(hx + sx * 0.8 - 0.2, ey, '#1a1410', P, P);
        if (L.hair !== 'pelado' && L.hair !== 'rapado') for (const sx of [-1, 1]) pix(hx + sx * 0.85 - 0.5, ey - 0.6, SH(hair, 0.9), Math.round(1.0 * k), P);
        if (S.fem && k >= 2) { pix(hx - 1.55, ey - 0.25, '#1a1410', P, P); pix(hx + 1.25, ey - 0.25, '#1a1410', P, P); }
        if (k >= 2) { pix(hx + 0.05, hy + 0.7, skinD, P, Math.max(1, Math.round(0.6 * k))); pix(hx - 0.45, hy + 1.6, S.fem ? '#c0605a' : SH(skin, 0.62), Math.round(0.9 * k), P); }
        if (L.beard !== 'no') {
          const bc = SH(hair, 1.0);
          if (L.beard === 'bigote' || L.beard === 'candado') pix(hx - 0.6, hy + 1.25, bc, Math.round(1.3 * k), P);
          if (L.beard === 'barba') paint((g) => { ell(g, hx, hy + 1.9, 1.6, 1.0); }, bc, { light: false, sep: false });
          if (L.beard === 'candado') pix(hx - 0.35, hy + 1.95, bc, Math.round(0.8 * k), Math.round(0.6 * k));
          if (L.beard === 'barba') pix(hx - 0.45, hy + 1.55, SH(skin, 0.6), Math.round(0.9 * k), P);
        }
        if (L.lentes) { paint((g) => { g.fillRect(hx - 1.75, ey - 0.25, 1.5, 0.75); g.fillRect(hx + 0.25, ey - 0.25, 1.5, 0.75); g.fillRect(hx - 0.3, ey - 0.15, 0.6, 0.3); }, '#18181e', { light: false, sep: false }); }
        if (L.anteojos && k >= 2) { const c = '#2a2420'; pix(hx - 1.7, ey - 0.35, c, Math.round(1.45 * k), P); pix(hx + 0.3, ey - 0.35, c, Math.round(1.45 * k), P); pix(hx - 1.7, ey + 0.5, c, Math.round(1.45 * k), P); pix(hx + 0.3, ey + 0.5, c, Math.round(1.45 * k), P); }
      }
      drawHair(true);
    } else {
      // ---------- perfil ----------
      const b = S.bob, lx = Math.sin(S.lean * D2R);
      const torso = (ext) => { const e = ext || 0, belly = L.build === 'panza' ? 0.8 : 0, f = S.fem, sh0 = S.shoulder;
        const chest = f ? 2.15 : 1.95;
        return [[S.neck[0] - 0.9 - e, S.neck[1]], [S.neck[0] + 0.8 + e, S.neck[1] + 0.1], [sh0[0] + 1.5 * sw + e, sh0[1] + 0.4], [8 + lx * 5.5 + chest * sw + e, 10.9 + b], [8 + lx * 2.5 + (f ? 1.4 : 1.6) * ww + belly + e, 13.9 + b],
          [8 + (LONGTOP ? 2.0 : 1.7) * ww + e, (LONGTOP ? 17.3 : 16.4) + b], [8 - (f ? 2.0 : 1.7) * ww - (LONGTOP ? 0.3 : 0) - e, (LONGTOP ? 17.5 : 16.6) + b], [8 + lx * 2 - (f ? 1.3 : 1.45) * ww - e, 13.6 + b], [8 + lx * 5 - 1.9 * sw - e, 10.4 + b], [sh0[0] - 1.6 * sw - e, sh0[1] + 0.2]]; };
      const armDraw = (e, w, near) => {
        const sc = near ? 1 : 0.86, s0 = S.shoulder;
        paint((g) => { cap(g, s0, e, 1.6, 1.4); cap(g, e, w, 1.4, 1.2); }, near ? skin : skinD, { shade: SH(skin, 0.7) });
        if (sleeveLen > 0) paint((g) => { const end = sleeveLen >= 1 ? e : lerp(s0, e, sleeveLen * 1.6); cap(g, s0, end, 2.0, 1.8); if (sleeveLen >= 1) cap(g, e, w, 1.7, 1.5); }, near ? topC : SH(topC, 0.82));
        paint((g) => ell(g, w[0] + 0.2, w[1] + 0.6, 0.75, 0.8), near ? skin : skinD, { shade: skinD });
        if (near && L.termo) paint((g) => { g.beginPath(); g.roundRect(w[0] - 0.4, w[1] - 1.5, 1.2, 3.6, 0.3); g.fill(); }, '#2e6fc8');
        void sc;
      };
      const legDraw = (kn, an, near, fa = 0) => {
        const c = near ? 1 : 0.84;
        paint((g) => { cap(g, S.hip, kn, 2.4 * ww, 1.9); cap(g, kn, an, 1.9, 1.3); }, SH(skin, c), { shade: SH(skin, 0.7 * c) });
        if (L.bottom !== 'pollera' && legLen > 0) {
          const end = legLen >= 1 ? an : legLen > 0.5 ? lerp(kn, an, (legLen - 0.5) * 2) : lerp(S.hip, kn, legLen * 2);
          const wide = L.bottom === 'cargo' || L.bottom === 'jogging' ? 0.35 : L.bottom === 'calza' ? -0.3 : 0;
          paint((g) => { cap(g, S.hip, legLen > 0.5 ? kn : end, (2.7 + wide) * ww, 2.3 + wide); if (legLen > 0.5) cap(g, kn, end, 2.3 + wide, 1.9 + wide); }, SH(botC, c), { shade: SH(botC, 0.7 * c) });
          if (near && k >= 2 && L.bottom === 'jogging') for (let t = 0; t <= 1; t += 0.08) { const p = lerp(S.hip, end, t); pix(p[0] - 0.1, p[1], '#f2efe6', P, P); }
          if (near && k >= 2 && L.bottom === 'cargo') { const p = lerp(S.hip, kn, 0.7); pix(p[0] - 0.6, p[1], SH(botC, 0.7), Math.round(1.2 * k), Math.round(1.3 * k)); }
        }
        // zapato apuntando hacia adelante
        const sc = L.shoes === 'botines' ? '#5a3a22' : L.shoes === 'zapatos' ? '#2a1e16' : L.shoes === 'chinelas' ? skin : shoeC;
        paint((g) => { g.save(); g.translate(an[0], an[1] + 0.5); g.rotate(-fa * D2R); g.beginPath(); g.roundRect(-1.0, -0.3, 2.9, 1.35, [0.3, 0.9, 0.5, 0.3]); g.fill(); if (L.shoes === 'botitas' || L.shoes === 'botines') g.fillRect(-0.9, -1.6, 1.8, 1.6); g.restore(); }, SH(sc, c));
        if (L.shoes === 'zapatillas' || L.shoes === 'botitas') pix(an[0] - 1.0, an[1] + 1.3, '#f2efe6', Math.round(2.9 * k), P);
        if (L.shoes === 'chinelas') { pix(an[0] - 1.0, an[1] + 1.35, shoeC, Math.round(3 * k), P); pix(an[0] + 0.2, an[1] + 0.3, shoeC, P, Math.round(0.8 * k)); }
      };
      if (longHair) paint((g) => { poly(g, [[S.head[0] - 2.2, S.head[1] - 0.5], [S.head[0] + 0.2, S.head[1]], [S.head[0] - 0.4, 11 + b], [S.head[0] - 2.6, 11 + b]]); }, SH(hair, 0.82), { light: false });
      armDraw(S.elbF, S.wriF, false);
      legDraw(S.kneeF, S.ankF, false, S.footF);
      if (L.mochila) paint((g) => { g.beginPath(); g.roundRect(S.shoulder[0] - 3.6, 8 + b, 2.2, 6.2, 0.7); g.fill(); }, packC);
      if (L.bottom === 'pollera') paint((g) => poly(g, [[8 - 1.8, 14.6 + b], [8 + 1.9, 14.6 + b], [8 + 3, 21 + b], [8 - 2.8, 21 + b]]), botC);
      const bulky = L.top === 'puffer' ? 0.55 : L.top === 'buzo' || OPEN ? 0.3 : 0;
      paint((g) => poly(g, torso(0)), skin, { shade: skinD });
      const tm = L.top === 'top' ? paint((g) => { const T = torso(0); poly(g, [[T[7][0], 8.6 + b], [T[2][0], 8.6 + b], [T[2][0], 12 + b], [T[7][0], 12 + b]]); }, topC)
        : paint((g) => poly(g, torso(L.top === 'musculosa' ? -0.2 : bulky)), topC);
      if (L.top === 'camiseta') paint(null, top2, { mask: raster((g) => { for (let x = -4; x <= 4; x += 1.6) g.fillRect(8 + x, 6, 0.75, 11); }), clip: tm, light: false, sep: false });
      if (L.top === 'buzo' || L.top === 'hoodieAbierto') paint((g) => { ell(g, S.neck[0] - 1.2, S.neck[1] + 0.8, 1.4, 1.2); }, SH(topC, 0.85));
      if (L.top === 'puffer' && k >= 2) for (let y = 9; y <= 15.4; y += 1.25) pix(8 + lx * 5 - 2.2 * sw, y + b, SH(topC, 0.62), Math.round(4.2 * sw * k), P);
      if (OPEN && k >= 2) pix(S.shoulder[0] + 1.0 + (L.top === 'puffer' ? 0.4 : 0), 8.6 + b, top2, Math.round(0.8 * k), Math.round(6 * k));
      if (legLen > 0 && L.bottom !== 'pollera') paint((g) => { const T = torso(0); g.fillRect(T[5][0], 14.8 + b, T[4][0] - T[5][0], 2); }, botC);
      legDraw(S.kneeN, S.ankN, true, S.footN);
      armDraw(S.elbN, S.wriN, true);
      if (L.reloj && k >= 2) pix(S.wriN[0] - 0.4, S.wriN[1] - 0.2, '#2a2a30', Math.round(1.1 * k), Math.max(1, Math.round(0.45 * k)));
      // cuello y cabeza de perfil
      paint((g) => cap(g, [S.neck[0], S.neck[1] + 0.3], [S.head[0] - 0.2, S.head[1] + 1.8], 1.5, 1.5), skinD, { light: false });
      const [hx, hy] = S.head;
      paint((g) => { ell(g, hx, hy, 2.05, 2.4); ell(g, hx + 0.45, hy + 1.25, S.fem ? 1.45 : 1.6, 1.4); poly(g, [[hx + 1.8, hy - 0.1], [hx + 2.55, hy + 0.85], [hx + 1.8, hy + 1.0]]); }, skin, { shade: skinD });
      paint((g) => ell(g, hx - 0.55, hy + 0.25, 0.45, 0.65), skinD, { light: false, sep: false });
      if (k >= 3) { pix(hx + 1.05, hy + 0.05, '#f4f0e6', Math.round(0.6 * k), P); pix(hx + 1.35, hy + 0.05, '#1a1410', P, P); } else pix(hx + 1.2, hy + 0.05, '#1a1410', P, P);
      if (L.hair !== 'pelado' && L.hair !== 'rapado') pix(hx + 0.8, hy - 0.55, SH(hair, 0.9), Math.round(0.9 * k), P);
      if (k >= 2) pix(hx + 1.6, hy + 1.6, SH(skin, 0.62), Math.round(0.6 * k), P);
      if (L.beard === 'barba') paint((g) => ell(g, hx + 0.6, hy + 1.8, 1.4, 0.9), hair, { light: false, sep: false });
      if (L.beard === 'bigote' || L.beard === 'candado') pix(hx + 1.4, hy + 1.25, hair, Math.round(0.9 * k), P);
      if (L.lentes) paint((g) => g.fillRect(hx + 0.6, hy - 0.25, 1.4, 0.7), '#18181e', { light: false, sep: false });
      if (L.anteojos && k >= 2) { pix(hx + 0.6, hy - 0.35, '#2a2420', Math.round(1.4 * k), P); pix(hx + 0.6, hy + 0.5, '#2a2420', Math.round(1.4 * k), P); pix(hx - 0.5, hy - 0.1, '#2a2420', Math.round(1.1 * k), P); }
      drawHair(false);
    }

    // ---------- pelo y sombreros (comunes a todas las vistas) ----------
    function drawHair(frontish) {
      const [hx, hy] = S.head, sideV = side, H2 = hair, HD = SH(hair, 0.72);
      const cap0 = (g, extra = 0) => { g.beginPath(); g.ellipse(hx + (sideV ? -0.2 : 0), hy - 0.55, 2.15 + extra, 1.95 + extra, 0, Math.PI * 1.0, Math.PI * 2.0); g.fill(); g.fillRect(hx - 2.15 - extra + (sideV ? -0.2 : 0), hy - 0.6, 4.3 + 2 * extra, 0.6); };
      const st = L.hair;
      if (st === 'pelado') { if (k >= 2) pix(hx - 0.9, hy - 1.7, SH(skin, 1.15), Math.round(1 * k), P); }
      else if (back) {
        // de espaldas: el pelo tapa toda la cabeza
        paint((g) => { ell(g, hx, hy - 0.1, st === 'rulos' ? 2.5 : 2.08, st === 'rulos' ? 2.6 : 2.35); if (st !== 'rapado' && st !== 'degrade') g.fillRect(hx - 1.7, hy, 3.4, 1.7); }, st === 'rapado' ? SH(hair, 0.82) : H2, { shade: HD });
        if (st === 'degrade' || st === 'rapado') paint((g) => g.fillRect(hx - 1.6, hy + 0.9, 3.2, 1.1), SH(skin, 0.92), { light: false, sep: false });
        if (longHair) paint((g) => { poly(g, [[hx - 2.1, hy], [hx + 2.1, hy], [hx + 2.4, 10.6 + S.bob], [hx - 2.4, 10.6 + S.bob]]); }, H2, { shade: HD });
        if (st === 'trenza') paint((g) => { for (let i = 0; i < 5; i++) ell(g, hx, 9.8 + S.bob + i * 1.0, 0.7, 0.6); }, H2, { shade: HD });
        if (st === 'medio') paint((g) => { g.beginPath(); g.roundRect(hx - 2.3, hy - 0.5, 4.6, 4.0 + S.hair * 0.2, 0.8); g.fill(); }, H2, { shade: HD });
        if (wavy) paint((g) => { for (let i = 0; i < 6; i++) { const o = (i % 2) * 0.35; ell(g, hx - 2.4 + o, hy + 0.8 + i * 1.45 + S.hair * 0.3, 0.95, 0.95); ell(g, hx + 2.4 - o, hy + 0.8 + i * 1.45 + S.hair * 0.3, 0.95, 0.95); ell(g, hx, hy + 2 + i * 1.3, 1.9, 0.9); } }, H2, { shade: HD });
        if (st === 'colitaLado') paint((g) => cap(g, [hx + 1.6, hy + 0.8], [hx + 2.4, hy + 5.0 + S.hair * 0.3], 1.1, 0.7), H2, { shade: HD });
        if (st === 'colita') paint((g) => { ell(g, hx, hy + 2.1, 0.6, 0.6); cap(g, [hx, hy + 2.3], [hx + 0.2, hy + 5.2], 1.0, 0.6); }, H2, { shade: HD });
        if (st === 'rodete') paint((g) => ell(g, hx, hy - 1.9, 1.1, 0.9), H2, { shade: HD });
      } else if (!sideV) {
        // de frente
        if (st === 'rapado') paint((g) => cap0(g, -0.05), SH(hair, 0.8), { light: false });
        else if (st === 'degrade') { paint((g) => { g.beginPath(); g.ellipse(hx, hy - 0.8, 2.0, 1.7, 0, Math.PI, Math.PI * 2); g.fill(); }, H2, { shade: HD }); paint((g) => { g.fillRect(hx - 2.1, hy - 0.9, 0.5, 1.2); g.fillRect(hx + 1.6, hy - 0.9, 0.5, 1.2); }, SH(hair, 0.75), { light: false, sep: false }); }
        else if (st === 'rulos') paint((g) => { for (let a = Math.PI * 0.95; a <= Math.PI * 2.05; a += 0.35) ell(g, hx + Math.cos(a) * 1.9, hy - 0.4 + Math.sin(a) * 1.9, 0.9, 0.9); ell(g, hx, hy - 1.2, 1.9, 1.2); ell(g, hx - 2.1, hy + 0.5, 0.6, 0.9); ell(g, hx + 2.1, hy + 0.5, 0.6, 0.9); }, H2, { shade: HD });
        else {
          paint((g) => { cap0(g, 0.05); if (st === 'flequillo') poly(g, [[hx - 2.0, hy - 0.8], [hx + 1.6, hy - 0.9], [hx + 0.6, hy - 0.05], [hx - 1.9, hy - 0.2]]);
            if (st === 'corto' || st === 'peinadoAtras' || st === 'colita' || st === 'rodete' || st === 'colitaLado') { g.fillRect(hx - 2.15, hy - 0.6, 0.55, 1.0); g.fillRect(hx + 1.6, hy - 0.6, 0.55, 1.0); }
            if (st === 'onduladoFlequillo') poly(g, [[hx - 2.0, hy - 0.9], [hx + 2.0, hy - 0.9], [hx + 1.9, hy - 0.25], [hx + 0.6, hy - 0.45], [hx - 0.4, hy - 0.2], [hx - 1.9, hy - 0.35]]);
            if (midHair) { poly(g, [[hx - 0.2, hy - 2.3], [hx - 2.0, hy - 1.0], [hx - 2.6, hy + 0.6], [hx - 2.5, hy + 3.4 + S.hair * 0.2], [hx - 1.5, hy + 3.2], [hx - 1.5, hy - 0.4], [hx - 0.6, hy - 1.2]]); poly(g, [[hx + 0.2, hy - 2.3], [hx + 2.0, hy - 1.0], [hx + 2.6, hy + 0.6], [hx + 2.5, hy + 3.4 + S.hair * 0.2], [hx + 1.5, hy + 3.2], [hx + 1.5, hy - 0.4], [hx + 0.6, hy - 1.2]]); }
            if (longHair) { g.fillRect(hx - 2.35, hy - 0.6, 0.75, 4.8 + S.hair * 0.3); g.fillRect(hx + 1.6, hy - 0.6, 0.75, 4.8 + S.hair * 0.3); } }, H2, { shade: HD });
          if (st === 'peinadoAtras' && k >= 2) pix(hx - 1.2, hy - 1.9, SH(hair, 1.4), Math.round(2.4 * k), P);
          if (st === 'corto' && k >= 2) pix(hx - 1.5, hy - 1.7, SH(hair, 1.35), Math.round(1.2 * k), P);
          if (midHair && k >= 2) { pix(hx - 0.05, hy - 2.25, SH(skin, 0.9), P, Math.round(0.6 * k)); pix(hx - 1.6, hy - 1.6, SH(hair, 1.6), Math.round(0.9 * k), P); pix(hx + 0.8, hy - 1.6, SH(hair, 1.6), Math.round(0.9 * k), P); }
          if (st === 'rodete') paint((g) => ell(g, hx, hy - 2.55, 1.0, 0.75), H2, { shade: HD });
          if (wavy) paint((g) => { for (let i = 0; i < 6; i++) { const o = (i % 2) * 0.4; ell(g, hx - 2.35 - o, hy + 0.4 + i * 1.25 + S.hair * 0.3, 0.95, 0.9); ell(g, hx + 2.35 + o, hy + 0.4 + i * 1.25 + S.hair * 0.3, 0.95, 0.9); } }, H2, { shade: HD });
          if (st === 'colitaLado') paint((g) => { ell(g, hx - 2.1, hy + 0.9, 0.7, 0.7); cap(g, [hx - 2.2, hy + 1.2], [hx - 2.7, hy + 5.4 + S.hair * 0.3], 1.1, 0.7); }, H2, { shade: HD });
        }
      } else {
        // de perfil (mirando a la derecha)
        if (st === 'rapado') paint((g) => { g.beginPath(); g.ellipse(hx - 0.2, hy - 0.4, 2.05, 2.0, 0, Math.PI * 0.95, Math.PI * 2.0); g.fill(); g.fillRect(hx - 2.2, hy - 0.5, 1.6, 1.6); }, SH(hair, 0.8), { light: false });
        else if (st === 'rulos') paint((g) => { for (let a = Math.PI * 0.6; a <= Math.PI * 2.0; a += 0.35) ell(g, hx - 0.3 + Math.cos(a) * 1.9, hy - 0.4 + Math.sin(a) * 1.9, 0.9, 0.9); ell(g, hx - 0.6, hy - 0.6, 1.8, 1.4); }, H2, { shade: HD });
        else {
          paint((g) => { g.beginPath(); g.ellipse(hx - 0.25, hy - 0.5, 2.15, 2.0, 0, Math.PI * 0.95, Math.PI * 2.02); g.fill(); g.fillRect(hx - 2.35, hy - 0.6, 1.9, st === 'degrade' ? 1.0 : 2.0);
            if (st === 'flequillo') poly(g, [[hx + 0.4, hy - 1.6], [hx + 2.0, hy - 0.9], [hx + 1.4, hy - 0.3]]);
            if (longHair) g.fillRect(hx - 2.5, hy - 0.4, 1.5, 4.6);
            if (midHair) { g.beginPath(); g.roundRect(hx - 2.6, hy - 0.6, 2.2, 3.7 + S.hair * 0.2, 0.6); g.fill(); }
            if (st === 'onduladoFlequillo') poly(g, [[hx + 0.2, hy - 1.7], [hx + 2.0, hy - 1.0], [hx + 1.6, hy - 0.35], [hx + 0.5, hy - 0.7]]); }, H2, { shade: HD });
          if (st === 'colita') paint((g) => cap(g, [hx - 2.2, hy + 0.2], [hx - 3.0 - S.lx * 4, hy + 3.0 + S.hair * 0.4], 1.0, 0.6), H2, { shade: HD });
          if (st === 'rodete') paint((g) => ell(g, hx - 1.4, hy - 2.0, 0.95, 0.8), H2, { shade: HD });
          if (st === 'trenza') paint((g) => { for (let i = 0; i < 4; i++) ell(g, hx - 2.0 - i * 0.15 - S.lx * 3, hy + 4.4 + i * 1.0 + S.hair * 0.3, 0.6, 0.55); }, H2, { shade: HD });
          if (wavy) paint((g) => { for (let i = 0; i < 6; i++) ell(g, hx - 1.9 - (i % 2) * 0.45 - S.lx * 2.5, hy + 0.6 + i * 1.25 + S.hair * 0.3, 1.0, 0.95); }, H2, { shade: HD });
          if (st === 'colitaLado') paint((g) => cap(g, [hx - 1.4, hy + 0.8], [hx - 1.9 - S.lx * 3, hy + 5.0 + S.hair * 0.3], 1.0, 0.65), H2, { shade: HD });
        }
      }
      // sombreros
      const hat = L.hat;
      if (hat === 'gorra' || hat === 'gorraAtras') {
        const visorFront = (hat === 'gorra') !== back;
        paint((g) => { g.beginPath(); g.ellipse(hx + (sideV ? -0.15 : 0), hy - 0.75, 2.25, 1.95, 0, Math.PI, Math.PI * 2); g.fill(); g.fillRect(hx - 2.25 + (sideV ? -0.15 : 0), hy - 0.85, 4.5, 0.55); }, hatC, { shade: SH(hatC, 0.72) });
        if (sideV) paint((g) => { const d = hat === 'gorra' ? 1 : -1; g.beginPath(); g.ellipse(hx + d * 2.3, hy - 0.55, 1.35, 0.38, 0, 0, 7); g.fill(); }, SH(hatC, 0.78), { light: false });
        else if (visorFront) paint((g) => { g.beginPath(); g.ellipse(hx, hy - 0.4, 2.35, 0.55, 0, 0, Math.PI); g.fill(); }, SH(hatC, 0.72), { light: false });
        else if (k >= 2) pix(hx - 0.6, hy - 0.6, SH(hatC, 0.6), Math.round(1.2 * k), Math.round(0.4 * k));
        if (k >= 2 && !sideV) pix(hx - 0.15, hy - 2.7, SH(hatC, 0.7), P, P);
      } else if (hat === 'gorro') {
        paint((g) => { g.beginPath(); g.ellipse(hx + (sideV ? -0.2 : 0), hy - 0.85, 2.2, 2.2, 0, Math.PI, Math.PI * 2); g.fill(); g.fillRect(hx - 2.2 + (sideV ? -0.2 : 0), hy - 0.9, 4.4, 0.4); }, hatC, { shade: SH(hatC, 0.75) });
        paint((g) => g.fillRect(hx - 2.25 + (sideV ? -0.2 : 0), hy - 0.75, 4.5, 0.85), SH(hatC, 0.85), { light: false });
        if (k >= 2) for (let x = -1.8; x <= 1.8; x += 0.7) pix(hx + x, hy - 1.9, SH(hatC, 0.82), P, Math.round(1.0 * k));
      } else if (hat === 'piri') { // sombrero de paja
        paint((g) => { g.beginPath(); g.ellipse(hx, hy - 0.55, sideV ? 3.4 : 3.3, sideV ? 0.55 : 0.7, 0, 0, 7); g.fill(); }, '#d8b870', { shade: '#a88a48' });
        paint((g) => { g.beginPath(); g.ellipse(hx, hy - 1.1, 1.9, 1.6, 0, Math.PI, Math.PI * 2); g.fill(); g.fillRect(hx - 1.9, hy - 1.15, 3.8, 0.55); }, '#e4c880', { shade: '#b09450' });
        paint((g) => g.fillRect(hx - 1.9, hy - 1.15, 3.8, 0.45), '#3a2a1a', { light: false, sep: false });
      }
      void frontish;
    }

    // ---------- contorno oscuro ----------
    const fin = new Uint8ClampedArray(out);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (out[i * 4 + 3]) continue;
      let n = -1;
      if (x > 0 && out[(i - 1) * 4 + 3]) n = i - 1; else if (x < W - 1 && out[(i + 1) * 4 + 3]) n = i + 1; else if (y > 0 && out[(i - W) * 4 + 3]) n = i - W; else if (y < H - 1 && out[(i + W) * 4 + 3]) n = i + W;
      if (n >= 0) { fin[i * 4] = out[n * 4] * 0.28 + 10; fin[i * 4 + 1] = out[n * 4 + 1] * 0.26 + 8; fin[i * 4 + 2] = out[n * 4 + 2] * 0.28 + 12; fin[i * 4 + 3] = 255; }
    }
    const res = document.createElement('canvas'); res.width = W; res.height = H;
    res.getContext('2d').putImageData(new ImageData(fin, W, H), 0, 0);
    return res;
  }

  VR.av2Render = render;
  // hoja de animaciones: { down|up|right|left: { idle: [..], walk: [..], run: [..] } }
  VR.av2Sheet = (look, k = 1, n = { idle: 1, walk: 6, run: 6 }) => {
    const L = Object.assign({}, VR.AV2_DEFAULT, look), out = {};
    for (const d of ['down', 'up', 'right', 'left']) { out[d] = {}; for (const a in n) out[d][a] = Array.from({ length: n[a] }, (_, i) => render(L, d, a, i / n[a], k)); }
    return out;
  };
})();
