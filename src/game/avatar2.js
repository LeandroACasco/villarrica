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
      largo: ['Largo', 25000], rulos: ['Rulos', 30000], colita: ['Colita', 20000], rodete: ['Rodete', 20000], trenza: ['Trenza', 30000], pelado: ['Pelado', 0] },
    top: { remera: ['Remera', 35000], musculosa: ['Musculosa', 25000], polo: ['Chomba', 60000], camiseta: ['Camiseta a rayas', 95000], camisa: ['Camisa manga larga', 85000],
      camisaCorta: ['Camisa manga corta', 75000], buzo: ['Buzo con capucha', 120000], campera: ['Campera abierta', 160000], top: ['Top', 30000] },
    bottom: { jean: ['Jean', 110000], cargo: ['Pantalón cargo', 120000], jogging: ['Jogging', 70000], vestir: ['Pantalón de vestir', 130000], bermuda: ['Bermuda', 55000],
      short: ['Short', 40000], pollera: ['Pollera', 65000], calza: ['Calza', 50000] },
    shoes: { zapatillas: ['Zapatillas', 150000], botitas: ['Zapatillas altas', 180000], chinelas: ['Chinelas', 20000], zapatos: ['Zapatos', 200000], botines: ['Botines', 180000] },
    hat: { ninguno: ['Sin gorra', 0], gorra: ['Gorra', 30000], gorraAtras: ['Gorra para atrás', 30000], gorro: ['Gorro de lana', 35000], piri: ['Sombrero piri', 45000] },
    extra: { lentes: ['Lentes de sol', 25000], anteojos: ['Anteojos', 90000], mochila: ['Mochila', 90000], termo: ['Termo de tereré', 60000], reloj: ['Reloj', 70000], cadenita: ['Cadenita', 40000] },
    beard: { no: ['Sin barba', 0], bigote: ['Bigote', 0], barba: ['Barba', 0], candado: ['Candado', 0] },
    build: { flaco: ['Flaco', 0], normal: ['Normal', 0], fornido: ['Fornido', 0], panza: ['Con panza', 0] },
  };
  VR.AV2_CAT = CAT;
  VR.AV2_DEFAULT = { skin: 2, build: 'normal', hair: 'corto', hairColor: 1, beard: 'no', top: 'remera', topColor: 0, topColor2: 1, bottom: 'jean', bottomColor: 0,
    shoes: 'zapatillas', shoesColor: 1, hat: 'ninguno', hatColor: 3, lentes: false, anteojos: false, mochila: false, termo: false, reloj: false, cadenita: false, packColor: 4, print: false };
  VR.av2Price = (L) => {
    let t = CAT.hair[L.hair][1] + CAT.top[L.top][1] + CAT.bottom[L.bottom][1] + CAT.shoes[L.shoes][1] + CAT.hat[L.hat][1];
    for (const k in CAT.extra) if (L[k]) t += CAT.extra[k][1];
    return t;
  };
  VR.av2Random = (rnd = Math.random) => {
    const pick = (o) => { const k = Object.keys(o); return k[(rnd() * k.length) | 0]; }, n = (a) => (rnd() * a.length) | 0;
    const L = { skin: n(CAT.skin), build: pick(CAT.build), hair: pick(CAT.hair), hairColor: rnd() < 0.85 ? n(CAT.hairColor.slice(0, 5)) : n(CAT.hairColor), beard: rnd() < 0.3 ? pick(CAT.beard) : 'no',
      top: pick(CAT.top), topColor: n(CAT.cloth), topColor2: n(CAT.cloth), bottom: pick(CAT.bottom), bottomColor: n(CAT.cloth), shoes: pick(CAT.shoes), shoesColor: n(CAT.cloth),
      hat: rnd() < 0.3 ? pick(CAT.hat) : 'ninguno', hatColor: n(CAT.cloth), packColor: n(CAT.cloth), print: rnd() < 0.4 };
    for (const k in CAT.extra) L[k] = rnd() < 0.14;
    if (L.lentes && L.anteojos) L.anteojos = false;
    return L;
  };

  // ---------- esqueleto (unidades de una grilla de 16×32; el suelo está en y = 31.6) ----------
  const D2R = Math.PI / 180;
  function skeleton(L, dir, anim, ph) {
    const bd = { flaco: [0.9, 0.92], normal: [1, 1], fornido: [1.14, 1.06], panza: [1.06, 1.18] }[L.build] || [1, 1];
    const sw = bd[0], ww = bd[1];
    const T = 2 * Math.PI * ph, run = anim === 'run', walk = anim === 'walk';
    const S = { sw, ww, dir, anim, run };
    if (dir !== 'left' && dir !== 'right') {
      // de frente / de espaldas
      const lift = (p) => (walk ? 1.1 : run ? 3.2 : 0) * Math.max(0, Math.sin(p));
      const lL = lift(T), lR = lift(T + Math.PI);
      const bob = run ? -0.8 * Math.abs(Math.sin(T)) : walk ? -0.35 * Math.abs(Math.sin(T)) : 0;
      S.bob = bob;
      S.head = [8, 3.65 + bob];
      S.sh = [[8 - 3.3 * sw, 7.3 + bob], [8 + 3.3 * sw, 7.3 + bob]];
      S.hip = [[8 - 1.25 * ww, 16.7 + bob], [8 + 1.25 * ww, 16.7 + bob]];
      S.knee = [[6.75 - (run ? 0.2 : 0), 23.1 - lL * 0.55 + bob * 0.5], [9.25 + (run ? 0.2 : 0), 23.1 - lR * 0.55 + bob * 0.5]];
      S.ank = [[6.75, 29.7 - lL], [9.25, 29.7 - lR]];
      const swing = walk ? 0.7 * Math.sin(T) : 0;
      if (run) {
        const a = Math.sin(T);
        S.elb = [[4.2, 11.6 + bob], [11.8, 11.6 + bob]];
        S.wri = [[5.0 + Math.max(0, a) * 0.9, 13.8 - Math.max(0, a) * 3 + bob], [11.0 - Math.max(0, -a) * 0.9, 13.8 - Math.max(0, -a) * 3 + bob]];
      } else {
        S.elb = [[4.35 * (2 - sw) + 0.0 * sw + (sw - 1) * -1.2, 12.3 + bob + swing * 0.4], [16 - (4.35 * (2 - sw) + (sw - 1) * -1.2), 12.3 + bob - swing * 0.4]];
        S.wri = [[S.elb[0][0] - 0.1, 16.4 + bob + swing], [S.elb[1][0] + 0.1, 16.4 + bob - swing]];
      }
      return S;
    }
    // de perfil (mirando a la derecha; la izquierda se espeja)
    const lean = run ? 7 : walk ? 1.5 : 0;
    const legA = (p) => (run ? 42 : walk ? 24 : 0) * Math.sin(p);
    const kneeB = (p) => run ? 20 + 70 * Math.max(0, Math.sin(p - 1.2)) + 10 : walk ? 6 + 26 * Math.max(0, Math.sin(p - 1.0)) : 3;
    const hip = [8, 16.6];
    const leg = (p) => {
      const a = legA(p) * D2R, b = a - kneeB(p) * D2R;
      const k = [hip[0] + Math.sin(a) * 6.4, hip[1] + Math.cos(a) * 6.4];
      const an = [k[0] + Math.sin(b) * 6.6, k[1] + Math.cos(b) * 6.6];
      return [k, an];
    };
    const near = leg(T), far = leg(T + Math.PI);
    const low = Math.max(near[1][1], far[1][1]);
    const bob = 29.7 - low;
    const sh = (v) => [v[0], v[1] + bob];
    S.bob = bob; S.lean = lean;
    S.hip = [hip[0], hip[1] + bob];
    S.kneeN = sh(near[0]); S.ankN = sh(near[1]); S.kneeF = sh(far[0]); S.ankF = sh(far[1]);
    const lx = Math.sin(lean * D2R);
    S.neck = [8 + lx * 9, 6.4 + bob]; S.head = [8.3 + lx * 10.5, 3.65 + bob];
    S.shoulder = [8 + lx * 8.8, 7.6 + bob];
    const arm = (p) => {
      const a = (run ? -38 : walk ? -20 : 0) * Math.sin(p) * D2R + (run ? 0.25 : 0), bend = (run ? 88 : walk ? 14 : 6) * D2R;
      const e = [S.shoulder[0] + Math.sin(a) * 4.9, S.shoulder[1] + Math.cos(a) * 4.9];
      const w = [e[0] + Math.sin(a + bend) * 4.2, e[1] + Math.cos(a + bend) * 4.2];
      return [e, w];
    };
    const an = arm(T), af = arm(T + Math.PI);
    S.elbN = an[0]; S.wriN = an[1]; S.elbF = af[0]; S.wriF = af[1];
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
    const longSleeve = L.top === 'camisa' || L.top === 'buzo' || L.top === 'campera';
    const sleeveLen = L.top === 'musculosa' || L.top === 'top' ? 0 : longSleeve ? 1 : 0.45;
    const legLen = { short: 0.42, bermuda: 0.62, pollera: 0, calza: 0.92 }[L.bottom] ?? 1;
    const longHair = L.hair === 'largo' || L.hair === 'trenza';

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
        const b = S.bob, e = ext || 0, belly = L.build === 'panza' ? 0.6 : 0;
        return [[sL[0] - e, sL[1] - 0.3], [sR[0] + e, sR[1] - 0.3], [8 + (2.9 * sw + e), 10.6 + b], [8 + (2.25 * ww + belly + e), 14.4 + b], [8 + 2.45 * ww + e, 15.6 + b], [8 - 2.45 * ww - e, 15.6 + b], [8 - (2.25 * ww + belly + e), 14.4 + b], [8 - (2.9 * sw + e), 10.6 + b]];
      };
      const skinTorso = paint((g) => { poly(g, torsoPts(0)); }, skin, { shade: skinD });
      const hasTop = L.top !== 'top';
      let topMask = null;
      const bulky = L.top === 'buzo' || L.top === 'campera' ? 0.35 : 0;
      if (L.top === 'top') topMask = paint((g) => poly(g, [[8 - 2.7 * sw, 8.6 + S.bob], [8 + 2.7 * sw, 8.6 + S.bob], [8 + 2.5 * sw, 12 + S.bob], [8 - 2.5 * sw, 12 + S.bob]]), topC);
      else if (L.top === 'musculosa') topMask = paint((g) => { poly(g, torsoPts(0).map(([x, y], i) => i < 2 ? [8 + (x - 8) * 0.72, y + 0.3] : [x, y])); }, topC);
      else topMask = paint((g) => { poly(g, torsoPts(bulky)); }, L.top === 'campera' ? top2 : topC);
      if (L.top === 'campera') { // campera abierta: dos paneles a los costados con la remera de adentro
        paint((g) => { const T = torsoPts(bulky); poly(g, [T[0], [8 - 0.9, T[0][1]], [8 - 1.1, 15.8 + S.bob], T[5], T[6], T[7]]); poly(g, [[8 + 0.9, T[1][1]], T[1], T[2], T[3], T[4], [8 + 1.1, 15.8 + S.bob]]); }, topC);
        if (k >= 2) { pix(8 - 1.3, 13 + S.bob, SH(topC, 0.7), Math.round(0.9 * k), P); pix(8 + 0.6, 13 + S.bob, SH(topC, 0.7), Math.round(0.9 * k), P); }
      }
      if (L.top === 'camiseta') paint(null, top2, { mask: raster((g) => { for (let x = -4; x <= 4; x += 1.6) g.fillRect(8 + x, 6, 0.75, 11); }), clip: topMask, light: false, sep: false });
      if (L.print && (L.top === 'remera' || L.top === 'musculosa') && front && k >= 2) paint((g) => { g.fillRect(8 - 1.4, 9.6 + S.bob, 2.8, 2.2); }, top2, { sep: false, light: false });
      if (front && hasTop) {
        // cuello: redondo (remera), en V (camiseta), con solapa (chomba, camisa), capucha (buzo)
        if (L.top === 'remera' || L.top === 'musculosa' || L.top === 'camiseta') paint((g) => ell(g, 8, 7.1 + S.bob, 1.15, 0.75), skin, { shade: skinD, sep: k >= 2 });
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
        if (L.top === 'campera') paint((g) => ell(g, 8, 7.1 + S.bob, 1.05, 0.7), skin, { shade: skinD });
      }
      if (back && L.top === 'buzo') paint((g) => ell(g, 8, 7.6 + S.bob, 2.4, 1.4), SH(topC, 0.86));
      if (L.mochila) {
        if (front) for (const x of [-1.9, 1.9]) paint((g) => g.fillRect(8 + x * sw - 0.35, 7.1 + S.bob, 0.7, 6.4), SH(packC, 0.8), { light: false });
        else { paint((g) => { g.beginPath(); g.roundRect(8 - 2.4, 8.2 + S.bob, 4.8, 6.4, 0.9); g.fill(); }, packC); paint((g) => { g.beginPath(); g.roundRect(8 - 1.6, 11.6 + S.bob, 3.2, 2.2, 0.5); g.fill(); }, SH(packC, 0.85)); }
      }
      if (L.cadenita && front && L.top !== 'buzo') { for (let t = -1; t <= 1; t += 0.25) pix(8 + t * 1.1, 7.6 + Math.abs(t) * -0.5 + 0.9 + S.bob, '#e8c860', P, P); }
      // brazos: piel, manga encima, mano
      for (const [s0, e0, w0, right] of [[sL, eL, wL, false], [sR, eR, wR, true]]) {
        paint((g) => { cap(g, s0, e0, 1.75 * sw, 1.45); cap(g, e0, w0, 1.45, 1.2); }, skin, { shade: skinD });
        if (sleeveLen > 0) {
          const end = sleeveLen >= 1 ? w0 : lerp(s0, e0, sleeveLen * 1.6);
          paint((g) => { cap(g, s0, sleeveLen >= 1 ? e0 : end, (2.05 + bulky) * sw, 1.85 + bulky); if (sleeveLen >= 1) cap(g, e0, w0, 1.7 + bulky, 1.5 + bulky); }, topC, { shade: SH(topC, 0.72) });
          if (sleeveLen >= 1 && k >= 2) pix(w0[0] - 0.75, w0[1] - 0.2, SH(topC, 0.78), Math.round(1.5 * k), P); // puño
        }
        paint((g) => ell(g, w0[0], w0[1] + 0.75, 0.72, 0.85), skin, { shade: skinD });
        if (L.reloj && !right && k >= 2) pix(w0[0] - 0.6, w0[1] - 0.15, '#2a2a30', Math.round(1.2 * k), Math.max(1, Math.round(0.45 * k)));
        if (L.termo && right) {
          paint((g) => { g.beginPath(); g.roundRect(w0[0] - 0.6, w0[1] - 1.6, 1.2, 3.6, 0.3); g.fill(); }, '#2e6fc8');
          if (k >= 2) { pix(w0[0] - 0.6, w0[1] - 1.6, '#d8dce4', Math.round(1.2 * k), P); pix(w0[0] - 0.6, w0[1] + 1.3, '#d8dce4', Math.round(1.2 * k), P); }
        }
      }
      // cuello y cabeza
      paint((g) => g.fillRect(8 - 0.75, 5.6 + S.bob, 1.5, 1.8), skinD, { light: false });
      const [hx, hy] = S.head;
      paint((g) => { ell(g, hx, hy, 1.95, 2.35); ell(g, hx, hy + 1.2, 1.55, 1.5); }, skin, { shade: skinD });
      paint((g) => { ell(g, hx - 2.0, hy + 0.2, 0.42, 0.65); ell(g, hx + 2.0, hy + 0.2, 0.42, 0.65); }, skinD, { light: false, sep: false });
      if (front) {
        // cara
        const ey = hy + 0.05;
        if (k >= 3) {
          for (const sx of [-1, 1]) { pix(hx + sx * 0.85 - 0.45, ey, '#f4f0e6', Math.round(0.9 * k), P); pix(hx + sx * 0.85 - (sx < 0 ? 0 : 0.0), ey, '#1a1410', P, P + (k >= 4 ? 1 : 0)); }
        } else for (const sx of [-1, 1]) pix(hx + sx * 0.8 - 0.2, ey, '#1a1410', P, P);
        if (L.hair !== 'pelado' && L.hair !== 'rapado') for (const sx of [-1, 1]) pix(hx + sx * 0.85 - 0.5, ey - 0.6, SH(hair, 0.9), Math.round(1.0 * k), P);
        if (k >= 2) { pix(hx + 0.05, hy + 0.7, skinD, P, Math.max(1, Math.round(0.6 * k))); pix(hx - 0.45, hy + 1.6, SH(skin, 0.62), Math.round(0.9 * k), P); }
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
      const torso = (ext) => { const e = ext || 0, belly = L.build === 'panza' ? 0.8 : 0;
        return [[S.shoulder[0] - 1.6 * sw - e, S.shoulder[1] - 0.4], [S.shoulder[0] + 1.3 * sw + e, S.shoulder[1] - 0.6], [8 + lx * 5 + 1.9 * sw + e, 11 + b], [8 + lx * 2 + 1.6 * ww + belly + e, 14.4 + b], [8 + 1.7 * ww + e, 16.2 + b], [8 - 1.6 * ww - e, 16.2 + b], [8 + lx * 2 - 1.4 * ww - e, 14 + b], [8 + lx * 5 - 1.9 * sw - e, 10.8 + b]]; };
      const armDraw = (e, w, near) => {
        const sc = near ? 1 : 0.86, s0 = S.shoulder;
        paint((g) => { cap(g, s0, e, 1.6, 1.4); cap(g, e, w, 1.4, 1.2); }, near ? skin : skinD, { shade: SH(skin, 0.7) });
        if (sleeveLen > 0) paint((g) => { const end = sleeveLen >= 1 ? e : lerp(s0, e, sleeveLen * 1.6); cap(g, s0, end, 2.0, 1.8); if (sleeveLen >= 1) cap(g, e, w, 1.7, 1.5); }, near ? topC : SH(topC, 0.82));
        paint((g) => ell(g, w[0] + 0.2, w[1] + 0.6, 0.75, 0.8), near ? skin : skinD, { shade: skinD });
        if (near && L.termo) paint((g) => { g.beginPath(); g.roundRect(w[0] - 0.4, w[1] - 1.5, 1.2, 3.6, 0.3); g.fill(); }, '#2e6fc8');
        void sc;
      };
      const legDraw = (kn, an, near) => {
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
        paint((g) => { g.beginPath(); g.roundRect(an[0] - 1.0, an[1] + 0.2, 2.9, 1.35, [0.3, 0.9, 0.5, 0.3]); g.fill(); if (L.shoes === 'botitas' || L.shoes === 'botines') g.fillRect(an[0] - 0.9, an[1] - 1.1, 1.8, 1.6); }, SH(sc, c));
        if (L.shoes === 'zapatillas' || L.shoes === 'botitas') pix(an[0] - 1.0, an[1] + 1.3, '#f2efe6', Math.round(2.9 * k), P);
        if (L.shoes === 'chinelas') { pix(an[0] - 1.0, an[1] + 1.35, shoeC, Math.round(3 * k), P); pix(an[0] + 0.2, an[1] + 0.3, shoeC, P, Math.round(0.8 * k)); }
      };
      if (longHair) paint((g) => { poly(g, [[S.head[0] - 2.2, S.head[1] - 0.5], [S.head[0] + 0.2, S.head[1]], [S.head[0] - 0.4, 11 + b], [S.head[0] - 2.6, 11 + b]]); }, SH(hair, 0.82), { light: false });
      armDraw(S.elbF, S.wriF, false);
      legDraw(S.kneeF, S.ankF, false);
      if (L.mochila) paint((g) => { g.beginPath(); g.roundRect(S.shoulder[0] - 3.6, 8 + b, 2.2, 6.2, 0.7); g.fill(); }, packC);
      if (L.bottom === 'pollera') paint((g) => poly(g, [[8 - 1.8, 14.6 + b], [8 + 1.9, 14.6 + b], [8 + 3, 21 + b], [8 - 2.8, 21 + b]]), botC);
      const bulky = L.top === 'buzo' || L.top === 'campera' ? 0.3 : 0;
      paint((g) => poly(g, torso(0)), skin, { shade: skinD });
      const tm = L.top === 'top' ? paint((g) => { const T = torso(0); poly(g, [[T[7][0], 8.6 + b], [T[2][0], 8.6 + b], [T[2][0], 12 + b], [T[7][0], 12 + b]]); }, topC)
        : paint((g) => poly(g, torso(L.top === 'musculosa' ? -0.2 : bulky)), topC);
      if (L.top === 'camiseta') paint(null, top2, { mask: raster((g) => { for (let x = -4; x <= 4; x += 1.6) g.fillRect(8 + x, 6, 0.75, 11); }), clip: tm, light: false, sep: false });
      if (L.top === 'buzo') paint((g) => { ell(g, S.neck[0] - 1.2, S.neck[1] + 0.8, 1.4, 1.2); }, SH(topC, 0.85));
      if (L.top === 'campera' && k >= 2) pix(S.shoulder[0] + 1.0, 8.6 + b, top2, Math.round(0.8 * k), Math.round(6 * k));
      if (legLen > 0 && L.bottom !== 'pollera') paint((g) => { const T = torso(0); g.fillRect(T[5][0], 14.8 + b, T[4][0] - T[5][0], 2); }, botC);
      legDraw(S.kneeN, S.ankN, true);
      armDraw(S.elbN, S.wriN, true);
      if (L.reloj && k >= 2) pix(S.wriN[0] - 0.4, S.wriN[1] - 0.2, '#2a2a30', Math.round(1.1 * k), Math.max(1, Math.round(0.45 * k)));
      // cuello y cabeza de perfil
      paint((g) => cap(g, S.neck, [S.neck[0] + 0.2, S.neck[1] - 1], 1.5, 1.5), skinD, { light: false });
      const [hx, hy] = S.head;
      paint((g) => { ell(g, hx, hy, 2.0, 2.35); ell(g, hx + 0.45, hy + 1.25, 1.6, 1.4); poly(g, [[hx + 1.8, hy - 0.1], [hx + 2.55, hy + 0.85], [hx + 1.8, hy + 1.0]]); }, skin, { shade: skinD });
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
        if (st === 'colita') paint((g) => { ell(g, hx, hy + 2.1, 0.6, 0.6); cap(g, [hx, hy + 2.3], [hx + 0.2, hy + 5.2], 1.0, 0.6); }, H2, { shade: HD });
        if (st === 'rodete') paint((g) => ell(g, hx, hy - 1.9, 1.1, 0.9), H2, { shade: HD });
      } else if (!sideV) {
        // de frente
        if (st === 'rapado') paint((g) => cap0(g, -0.05), SH(hair, 0.8), { light: false });
        else if (st === 'degrade') { paint((g) => { g.beginPath(); g.ellipse(hx, hy - 0.8, 2.0, 1.7, 0, Math.PI, Math.PI * 2); g.fill(); }, H2, { shade: HD }); paint((g) => { g.fillRect(hx - 2.1, hy - 0.9, 0.5, 1.2); g.fillRect(hx + 1.6, hy - 0.9, 0.5, 1.2); }, SH(hair, 0.75), { light: false, sep: false }); }
        else if (st === 'rulos') paint((g) => { for (let a = Math.PI * 0.95; a <= Math.PI * 2.05; a += 0.35) ell(g, hx + Math.cos(a) * 1.9, hy - 0.4 + Math.sin(a) * 1.9, 0.9, 0.9); ell(g, hx, hy - 1.2, 1.9, 1.2); ell(g, hx - 2.1, hy + 0.5, 0.6, 0.9); ell(g, hx + 2.1, hy + 0.5, 0.6, 0.9); }, H2, { shade: HD });
        else {
          paint((g) => { cap0(g, 0.05); if (st === 'flequillo') poly(g, [[hx - 2.0, hy - 0.8], [hx + 1.6, hy - 0.9], [hx + 0.6, hy - 0.05], [hx - 1.9, hy - 0.2]]);
            if (st === 'corto' || st === 'peinadoAtras' || st === 'colita' || st === 'rodete') { g.fillRect(hx - 2.15, hy - 0.6, 0.55, 1.0); g.fillRect(hx + 1.6, hy - 0.6, 0.55, 1.0); }
            if (longHair) { g.fillRect(hx - 2.35, hy - 0.6, 0.75, 4.8); g.fillRect(hx + 1.6, hy - 0.6, 0.75, 4.8); } }, H2, { shade: HD });
          if (st === 'peinadoAtras' && k >= 2) pix(hx - 1.2, hy - 1.9, SH(hair, 1.4), Math.round(2.4 * k), P);
          if (st === 'corto' && k >= 2) pix(hx - 1.5, hy - 1.7, SH(hair, 1.35), Math.round(1.2 * k), P);
          if (st === 'rodete') paint((g) => ell(g, hx, hy - 2.55, 1.0, 0.75), H2, { shade: HD });
        }
      } else {
        // de perfil (mirando a la derecha)
        if (st === 'rapado') paint((g) => { g.beginPath(); g.ellipse(hx - 0.2, hy - 0.4, 2.05, 2.0, 0, Math.PI * 0.95, Math.PI * 2.0); g.fill(); g.fillRect(hx - 2.2, hy - 0.5, 1.6, 1.6); }, SH(hair, 0.8), { light: false });
        else if (st === 'rulos') paint((g) => { for (let a = Math.PI * 0.6; a <= Math.PI * 2.0; a += 0.35) ell(g, hx - 0.3 + Math.cos(a) * 1.9, hy - 0.4 + Math.sin(a) * 1.9, 0.9, 0.9); ell(g, hx - 0.6, hy - 0.6, 1.8, 1.4); }, H2, { shade: HD });
        else {
          paint((g) => { g.beginPath(); g.ellipse(hx - 0.25, hy - 0.5, 2.15, 2.0, 0, Math.PI * 0.95, Math.PI * 2.02); g.fill(); g.fillRect(hx - 2.35, hy - 0.6, 1.9, st === 'degrade' ? 1.0 : 2.0);
            if (st === 'flequillo') poly(g, [[hx + 0.4, hy - 1.6], [hx + 2.0, hy - 0.9], [hx + 1.4, hy - 0.3]]);
            if (longHair) g.fillRect(hx - 2.5, hy - 0.4, 1.5, 4.6); }, H2, { shade: HD });
          if (st === 'colita') paint((g) => cap(g, [hx - 2.2, hy + 0.2], [hx - 3.0, hy + 3.0], 1.0, 0.6), H2, { shade: HD });
          if (st === 'rodete') paint((g) => ell(g, hx - 1.4, hy - 2.0, 0.95, 0.8), H2, { shade: HD });
          if (st === 'trenza') paint((g) => { for (let i = 0; i < 4; i++) ell(g, hx - 2.0 - i * 0.15, hy + 4.4 + i * 1.0, 0.6, 0.55); }, H2, { shade: HD });
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
