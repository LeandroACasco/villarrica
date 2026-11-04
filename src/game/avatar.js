// Avatar: el protagonista armado píxel a píxel por capas (cuerpo, pelo, ropa, calzado y accesorios), cada una
// dibujada a mano en una grilla de 16×24 y pintada con la paleta que elige el jugador. Así se puede cambiar de
// peinado, comprar ropa nueva y combinar todo sin redibujar el personaje. Animaciones: quieto, caminar y correr,
// en 4 direcciones. Todo original.
'use strict';
(function () {
  const VR = (typeof window !== 'undefined' && window.VR) || (window.VR = {});
  const W = 16, H = 24;

  // ---------- catálogo (nombres de tienda y precios en guaraníes) ----------
  const CAT = {
    skin: [['#f1c9a5', '#d6a47e'], ['#e0aa7e', '#bd875c'], ['#c98b5c', '#a76c42'], ['#b07850', '#8e5a36'], ['#8f5b38', '#6f4328'], ['#6b4026', '#52301c']],
    hairColor: [['#1a1410', '#0e0b08', '#3a2e24'], ['#2a1b12', '#1a100a', '#4e3424'], ['#4a2e1a', '#321e10', '#6e4a2e'], ['#8a5a2a', '#653f1c', '#b07c44'],
      ['#d8b060', '#b08c40', '#f0d48c'], ['#a8a4a0', '#807c78', '#d0ccc8'], ['#8a2a22', '#621c16', '#b44a3a'], ['#2a4ab0', '#1c3480', '#4e6ed0']],
    hair: {
      corto: { name: 'Corto clásico', price: 15000 }, rapado: { name: 'Rapado', price: 10000 }, largo: { name: 'Largo', price: 25000 },
      rulos: { name: 'Rulos', price: 30000 }, colita: { name: 'Colita', price: 20000 }, cresta: { name: 'Cresta', price: 35000 }, pelado: { name: 'Pelado', price: 0 },
    },
    top: {
      remera: { name: 'Remera', price: 35000 }, musculosa: { name: 'Musculosa', price: 25000 }, camisa: { name: 'Camisa manga larga', price: 85000 },
      buzo: { name: 'Buzo con capucha', price: 120000 }, camiseta: { name: 'Camiseta a rayas', price: 95000 }, polo: { name: 'Chomba', price: 60000 },
    },
    bottom: {
      jean: { name: 'Jean', price: 110000 }, short: { name: 'Short', price: 40000 }, bermuda: { name: 'Bermuda', price: 55000 },
      jogging: { name: 'Jogging', price: 70000 }, pollera: { name: 'Pollera', price: 65000 },
    },
    shoes: { zapatillas: { name: 'Zapatillas', price: 150000 }, chinelas: { name: 'Chinelas', price: 20000 }, botines: { name: 'Botines', price: 180000 } },
    hat: { ninguno: { name: 'Sin gorra', price: 0 }, gorra: { name: 'Gorra', price: 30000 }, gorraAtras: { name: 'Gorra para atrás', price: 30000 }, gorro: { name: 'Gorro de lana', price: 35000 } },
    eyes: { puntos: { name: 'Puntitos' }, felices: { name: 'Felices' }, redondos: { name: 'Grandes' } },
    style: { kiut: { name: 'Kiut (estilo Sofía)' }, clasico: { name: 'Clásico' } },
    extra: { lentes: { name: 'Lentes de sol', price: 25000 }, mochila: { name: 'Mochila', price: 90000 }, termo: { name: 'Termo de tereré', price: 60000 } },
    cloth: [['#d23c2c', '#9f2a20'], ['#f2efe6', '#c4beb0'], ['#2e6fc8', '#1f4c8c'], ['#30303a', '#18181e'], ['#3b9a5a', '#286a3d'], ['#e8b830', '#a8841c'],
      ['#7a4ab0', '#563480'], ['#e86aa0', '#b04876'], ['#e87a2a', '#a8561c'], ['#58b8c8', '#3a8a98'], ['#8a6a48', '#644c32'], ['#6a7a3a', '#4c5a28'], ['#a8d8f0', '#80b4d4'], ['#f4a8c8', '#d888a8']],
    denim: [['#2c4a7b', '#1e3358'], ['#4a6a9a', '#34507a'], ['#2a2a32', '#18181e'], ['#6a6258', '#4c463e'], ['#b8b0a0', '#8e8676']],
  };
  VR.AVATAR_CAT = CAT;
  VR.AVATAR_DEFAULT = { skin: 2, hair: 'corto', hairColor: 1, top: 'remera', topColor: 0, topColor2: 1, bottom: 'jean', bottomColor: 0, shoes: 'zapatillas', shoesColor: 1,
    hat: 'ninguno', hatColor: 2, lentes: false, mochila: false, termo: false, extraColor: 4, eyes: 'puntos', style: 'kiut' };

  // ---------- cabezas (dibujadas a mano) ----------
  // S piel, s sombra de piel, W blanco del ojo, E pupila, M boca, N nariz
  const HEAD = {
    down: [
      '................',
      '.....SSSSSS.....',
      '....SSSSSSSs....',
      '....SSSSSSSs....',
      '...sSWESSEWSs...',
      '....SSSSNSSs....',
      '....SSSMMSSs....',
      '.....SSSSSs.....',
      '......ssss......',
    ],
    up: [
      '................',
      '.....SSSSSS.....',
      '....SSSSSSSs....',
      '....SSSSSSSs....',
      '...sSSSSSSSSs...',
      '....SSSSSSSs....',
      '....SSSSSSSs....',
      '.....SSSSSs.....',
      '......ssss......',
    ],
    side: [
      '................',
      '.....SSSSSS.....',
      '....SSSSSSSS....',
      '....SSSSSSSSS...',
      '....SSsSSSWES...',
      '....SSsSSSSSSS..',
      '....SSSSSSSMS...',
      '.....SSSSSSS....',
      '......sss.......',
    ],
  };
  // ---------- peinados: H pelo, h sombra, L brillo ----------
  const HAIR = {
    corto: {
      down: ['......HHHH......', '....HHHLLHHH....', '...HHHLHHHHHh...', '...hHHH..HHHh...'],
      up: ['......HHHH......', '....HHHLLHHH....', '...HHHHLHHHHh...', '...HHHHHHHHHh...', '....HHHHHHHh....', '....HHHHHHHh....', '.....hHHHHh.....'],
      side: ['.....HHHH.......', '....HHHLLHH.....', '...HHHHHHHHH....', '...HHHHH.HHh....', '...HHH..........', '...hHH..........', '....hh..........'],
    },
    rapado: {
      down: ['................', '....hhhhhhhh....', '...h.h.hh.h.h...'],
      up: ['................', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhhhhhhhhh...', '....hhhhhhhh....', '.....hhhhhh.....'],
      side: ['................', '....hhhhhhh.....', '...hhhhhhhhh....', '...hhhh.........', '...hhh..........', '....hh..........'],
    },
    largo: {
      down: ['......HHHH......', '....HHHLLHHH....', '...HHHLHHHHHh...', '...HHHH..HHHh...', '...HH......Hh...', '...HH......Hh...', '...HH......Hh...', '...hH......hh...', '...h........h...', '...h........h...'],
      up: ['......HHHH......', '....HHHLLHHH....', '...HHHHLHHHHh...', '...HHHHHHHHHh...', '...HHHHHHHHHh...', '...HHHHHHHHHh...', '...HHHHHHHHHh...', '...hHHHHHHHHh...', '....HHHHHHHh....', '....hHHHHHhh....', '.....hhhhhh.....'],
      side: ['.....HHHH.......', '....HHHLLHH.....', '...HHHHHHHHH....', '...HHHHH.HHh....', '..HHHHH.........', '..HHHH..........', '..HHHH..........', '..hHHH..........', '..hHHh..........', '...hh...........'],
    },
    rulos: {
      down: ['.....HLHHLH.....', '...HHHHHHHHHH...', '..HHLHHHHHLHHh..', '..HHHHH..HHHHh..', '..hHH......HHh..', '...h........h...'],
      up: ['.....HLHHLH.....', '...HHHHHHHHHH...', '..HHLHHHHHLHHh..', '..HHHHHHHHHHHh..', '..HHHLHHHHLHHh..', '..hHHHHHHHHHhh..', '...hHHHHHHHhh...', '....hhhhhhhh....'],
      side: ['....HLHHLH......', '...HHHHHHHHH....', '..HHLHHHHHLHH...', '..HHHHHHH.HHh...', '..HHHHH.........', '..HHHH..........', '..hHHH..........', '...hh...........'],
    },
    colita: {
      down: ['......LHHH......', '....HHHHHHHH....', '...hHHHLHHHHh...', '...h........h...'],
      up: ['......LHHH......', '....HHHHHHHH....', '...hHHHLHHHHh...', '...HHHHHHHHHh...', '....HHHHHHHh....', '....hHHHHHHh....', '......HHh.......', '......HHh.......', '......Hhh.......', '.......h........'],
      side: ['.....LHHH.......', '....HHHHHHH.....', '...HHHHHHHHH....', '...HHHH...h.....', '..HHHH..........', '.HHhh...........', '.HHh............', '.Hh.............', '.h..............'],
    },
    cresta: {
      down: ['.......LH.......', '......HLHH......', '.....hHHHHh.....', '....h......h....'],
      up: ['.......LH.......', '......HLHH......', '.....hHHHHh.....', '.....hHHHHh.....', '......hHHh......', '.......hh.......'],
      side: ['......LHH.......', '.....HLHHHH.....', '....hHHHHHh.....', '...hh...........'],
    },
    pelado: { down: [], up: [], side: [] },
  };
  // gorra: C tela, c sombra, v visera
  const HAT = {
    gorra: {
      down: ['.....CCCCCC.....', '....CCCcCCCCc...', '...CCCCCCCCCCc..', '...vvvvvvvvvvv..'],
      up: ['.....CCCCCC.....', '....CCCCcCCCc...', '...CCCCCCCCCCc..', '...cCCCCCCCCCc..', '.......cc.......'],
      side: ['.....CCCCC......', '....CCCCcCCC....', '...CCCCCCCCCC...', '...cCCCCCvvvvvv.'],
    },
    gorraAtras: {
      down: ['.....CCCCCC.....', '....CCCcCCCCc...', '...CCCCCCCCCCc..', '...cCCCCCCCCCc..', '.......cc.......'],
      up: ['.....CCCCCC.....', '....CCCCcCCCc...', '...CCCCCCCCCCc..', '...vvvvvvvvvvv..'],
      side: ['.....CCCCC......', '....CCCCcCCC....', '...CCCCCCCCCC...', 'vvvvvCCCCCCc....'],
    },
  };

  // ---------- poses: [piernas, brazos, salto] por cuadro ----------
  // frente/espalda: cada pierna se acorta (pie levantado) unos píxeles; brazos: d = corrimiento, bent = doblado
  const POSE_F = {
    idle: [{ l: 0, r: 0, al: 0, ar: 0, bob: 0 }],
    walk: [{ l: 0, r: 0, al: 0, ar: 0, bob: 0 }, { l: 0, r: 1, al: 1, ar: -1, bob: -1 }, { l: 0, r: 0, al: 0, ar: 0, bob: 0 }, { l: 1, r: 0, al: -1, ar: 1, bob: -1 }],
    run: [{ l: 0, r: 3, al: 2, ar: -2, bob: 0, bent: 1 }, { l: 1, r: 1, al: 0, ar: 0, bob: -2, bent: 1 }, { l: 3, r: 0, al: -2, ar: 2, bob: 0, bent: 1 }, { l: 1, r: 1, al: 0, ar: 0, bob: -2, bent: 1 }],
  };
  // perfil: rodilla y pie de cada pierna (a = cercana, b = lejana), mano y codo de cada brazo
  const POSE_S = {
    idle: [{ a: [[8, 19], [8, 22]], b: [[7, 19], [7, 22]], ha: [[7, 13], [7, 15]], hb: [[8, 13], [8, 15]], bob: 0, lean: 0 }],
    walk: [
      { a: [[9, 19], [10, 22]], b: [[7, 19], [5, 22]], ha: [[6, 13], [5, 15]], hb: [[9, 13], [10, 15]], bob: 0, lean: 0 },
      { a: [[8, 19], [8, 22]], b: [[8, 19], [7, 21]], ha: [[7, 13], [7, 15]], hb: [[8, 13], [8, 15]], bob: -1, lean: 0 },
      { a: [[7, 19], [5, 22]], b: [[9, 19], [10, 22]], ha: [[9, 13], [10, 15]], hb: [[6, 13], [5, 15]], bob: 0, lean: 0 },
      { a: [[8, 19], [7, 21]], b: [[8, 19], [8, 22]], ha: [[8, 13], [8, 15]], hb: [[7, 13], [7, 15]], bob: -1, lean: 0 },
    ],
    run: [
      { a: [[11, 17], [12, 21]], b: [[6, 19], [3, 20]], ha: [[5, 12], [4, 10]], hb: [[9, 13], [11, 11]], bob: 0, lean: 1 },
      { a: [[10, 17], [9, 20]], b: [[6, 18], [4, 18]], ha: [[7, 13], [8, 11]], hb: [[8, 13], [7, 11]], bob: -2, lean: 1 },
      { a: [[6, 19], [3, 20]], b: [[11, 17], [12, 21]], ha: [[9, 13], [11, 11]], hb: [[5, 12], [4, 10]], bob: 0, lean: 1 },
      { a: [[6, 18], [4, 18]], b: [[10, 17], [9, 20]], ha: [[8, 13], [7, 11]], hb: [[7, 13], [8, 11]], bob: -2, lean: 1 },
    ],
  };

  // ---------- armado de un cuadro ----------
  function compose(look, dir, anim, f) {
    const g = Array.from({ length: H }, () => new Array(W).fill('.'));
    const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
    const putIf = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H && g[y][x] === '.') g[y][x] = c; };
    const stamp = (rows, dx, dy, keep) => rows.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') (keep ? putIf : put)(x + dx, y + dy, c); }));
    const line = (x0, y0, x1, y1, c, w = 1) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let k = 0; k < w; k++) put(x + k, y, c); }
    };
    const side = dir === 'left' || dir === 'right', D = side ? 'side' : dir;
    const top = look.top, bot = look.bottom, longSleeve = top === 'camisa' || top === 'buzo', noSleeve = top === 'musculosa';
    const skirt = bot === 'pollera', shortLeg = bot === 'short' ? 18 : bot === 'bermuda' ? 19 : skirt ? 17 : 99;
    let hand = null, handBack = null;
    if (!side) {
      const P = POSE_F[anim][f % POSE_F[anim].length], b = P.bob;
      const front = D === 'down';
      // piernas (U muslo, D pantorrilla; minúscula = lado en sombra)
      for (const [x0, lift, sh] of [[5, P.l, false], [8, P.r, true]]) {
        const foot = 21 - lift;
        for (let y = 15; y <= foot; y++) for (let x = x0; x < x0 + 3; x++) {
          const shade = sh ? x === x0 + 2 || x === x0 : x === x0 + 2;
          const low = y >= shortLeg;
          put(x, y, low ? (shade ? 'd' : 'D') : (shade ? 'u' : 'U'));
        }
        for (let x = x0; x < x0 + 3; x++) { put(x, foot + 1, 'F'); put(x, foot + 2, 'f'); }
        if (front && look.shoes === 'zapatillas') put(x0 + 1, foot + 1, 'k');
      }
      if (skirt) { for (let y = 14; y <= 17; y++) for (let x = 4 - (y > 15 ? 1 : 0); x <= 11 + (y > 15 ? 1 : 0); x++) put(x, y, x > 8 ? 'u' : 'U'); }
      // torso
      const torso = [
        '....TTTTTTTT....',
        '...TTTTTTTTTt...',
        '...TTTTTTTTTt...',
        '....TTTTTTTt....',
        '....TTTTTTTt....',
        '.....BBBBBB.....',
      ];
      stamp(torso, 0, 9 + b);
      if (front && (top === 'remera' || top === 'camiseta' || top === 'musculosa')) { put(7, 9 + b, 's'); put(8, 9 + b, 's'); put(7, 10 + b, 's'); }
      if (front && top === 'polo') { put(6, 9 + b, 'k'); put(9, 9 + b, 'k'); put(7, 9 + b, 's'); put(8, 9 + b, 's'); put(7, 10 + b, 'k'); put(8, 10 + b, 'k'); }
      if (front && top === 'camisa') { put(6, 9 + b, 'k'); put(9, 9 + b, 'k'); put(7, 9 + b, 's'); put(8, 9 + b, 's'); for (let y = 10; y <= 13; y++) put(7, y + b, y % 2 ? 't' : 'k'); }
      if (top === 'buzo') { for (let x = 5; x <= 10; x++) put(x, 14 + b, 'T'); if (front) { for (let x = 5; x <= 10; x++) put(x, 12 + b, 't'); put(6, 9 + b, 't'); put(9, 9 + b, 't'); put(7, 10 + b, 'k'); put(8, 10 + b, 'k'); } else { for (let x = 5; x <= 10; x++) put(x, 9 + b, 't'); put(6, 8 + b, 't'); put(9, 8 + b, 't'); } }
      if (top === 'camiseta') for (let y = 9; y <= 13; y++) for (const x of [5, 8, 11]) if (g[y + b][x] === 'T' || g[y + b][x] === 't') put(x, y + b, 'k');
      if (top === 'remera' && front && look.topColor2 !== undefined && look.print) { put(6, 11 + b, 'k'); put(7, 11 + b, 'k'); put(6, 12 + b, 'k'); }
      if (noSleeve) { put(3, 10 + b, 'S'); put(12, 10 + b, 's'); put(3, 11 + b, 'S'); put(12, 11 + b, 's'); }
      // brazos
      for (const [x, d, sh] of [[2, P.al, false], [13, P.ar, true]]) {
        const A = noSleeve ? (sh ? 's' : 'S') : (sh ? 'Q' : 'A'), a = longSleeve ? (sh ? 'Q' : 'A') : (sh ? 's' : 'S'), G = sh ? 'g' : 'G';
        if (P.bent) {
          const fwd = d > 0;
          put(x, 10 + b, A); put(x, 11 + b, A);
          if (fwd) { put(x, 12 + b, a); put(x + (sh ? -1 : 1), 12 + b, G); if (sh) hand = [x - 1, 12 + b]; else handBack = [x + 1, 12 + b]; }
          else { put(x, 12 + b, a); put(x, 13 + b, G); if (sh) hand = [x, 13 + b]; else handBack = [x, 13 + b]; }
        } else {
          const o = d;
          put(x, 10 + b, A); put(x, 11 + b, A); put(x, 12 + b + Math.max(0, o), a); put(x, 13 + b + Math.max(0, o), a); if (o < 0) put(x, 12 + b, a);
          put(x, 14 + b + o, G);
          if (sh) hand = [x, 14 + b + o]; else handBack = [x, 14 + b + o];
        }
      }
      // mochila (tiras adelante, mochila atrás)
      if (look.mochila) {
        if (front) { for (let y = 10; y <= 13; y++) { put(4, y + b, 'p'); put(11, y + b, 'p'); } }
        else stamp(['....PPPPPP......'.slice(0, 16), '....PPPPPPp.....', '....PPkkPPp.....', '....PPPPPPp.....', '....pPPPPpp.....'].map((r) => r.padEnd(16, '.')), 1, 9 + b);
      }
      // cabeza, pelo, gorra, lentes
      stamp(HEAD[D], 0, 0 + b);
      const hs = HAIR[look.hair][D];
      if (look.hat !== 'ninguno') { stamp(hs.slice(3), 0, 3 + b); stamp((HAT[look.hat] || HAT.gorra)[D], 0, b); }
      else stamp(hs, 0, b);
      if (look.lentes && front) { for (let x = 4; x <= 11; x++) put(x, 4 + b, x === 7 || x === 8 ? 'o' : 'O'); }
    } else {
      const P = POSE_S[anim][f % POSE_S[anim].length], b = P.bob, ln = P.lean;
      const leg = (k, f2, near) => {
        const hip = [7.5, 15], U = near ? 'U' : 'u', Dc = near ? 'D' : 'd';
        const seg = (p, q, from) => { const n = Math.max(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1]), 1); for (let i = 0; i <= n; i++) { const x = p[0] + (q[0] - p[0]) * i / n, y = p[1] + (q[1] - p[1]) * i / n; const low = y >= shortLeg; put(x, y, low ? Dc : (from || U)); put(x + 1, y, low ? Dc : (from || U)); } };
        seg(hip, k); seg(k, f2);
        // pie hacia adelante (derecha)
        put(f2[0], f2[1] + 1, 'F'); put(f2[0] + 1, f2[1] + 1, 'F'); put(f2[0] + 2, f2[1] + 1, 'F');
        put(f2[0], f2[1] + 2, 'f'); put(f2[0] + 1, f2[1] + 2, 'f'); put(f2[0] + 2, f2[1] + 2, 'f');
      };
      const arm = (e, h2, near) => {
        const sh = [7 + ln, 10 + b], A = noSleeve ? (near ? 'S' : 's') : (near ? 'A' : 'Q'), a = longSleeve ? (near ? 'A' : 'Q') : (near ? 'S' : 's');
        const E = [e[0] + ln, e[1] + b], Hh = [h2[0] + ln, h2[1] + b];
        line(sh[0], sh[1], E[0], E[1], A); line(E[0], E[1], Hh[0], Hh[1], a); put(Hh[0], Hh[1], near ? 'G' : 'g');
        return Hh;
      };
      handBack = arm(P.hb[0], P.hb[1], false);
      if (look.mochila) stamp(['PPP', 'PPP', 'PkP', 'PPP', 'pPp'].map((r) => r.padStart(6, '.').padEnd(16, '.')), -1 + ln, 10 + b);
      leg(P.b[0], P.b[1], false);
      if (skirt) for (let y = 14; y <= 17; y++) for (let x = 5 - (y > 15 ? 1 : 0); x <= 10 + (y > 15 ? 1 : 0); x++) put(x, y, x > 8 ? 'u' : 'U');
      const torso = ['.....TTTTTT.....', '.....TTTTTTt....', '.....TTTTTTt....', '.....TTTTTTt....', '.....TTTTTt.....', '......BBBB......'];
      stamp(torso, ln, 9 + b);
      if (top === 'buzo') { for (let x = 6; x <= 9; x++) put(x + ln, 14 + b, 'T'); put(5 + ln, 8 + b, 't'); put(5 + ln, 9 + b, 't'); }
      if (top === 'camiseta') for (let y = 9; y <= 13; y++) for (const x of [6, 9]) put(x + ln, y + b, 'k');
      if (top === 'polo' || top === 'camisa') { put(9 + ln, 9 + b, 'k'); put(10 + ln, 9 + b, 'k'); }
      if (skirt) for (let y = 14; y <= 17; y++) for (let x = 5 - (y > 15 ? 1 : 0); x <= 10 + (y > 15 ? 1 : 0); x++) put(x, y, x > 8 ? 'u' : 'U');
      leg(P.a[0], P.a[1], true);
      hand = arm(P.ha[0], P.ha[1], true);
      stamp(HEAD.side, ln, b);
      const hs = HAIR[look.hair].side;
      if (look.hat !== 'ninguno') { stamp(hs.slice(3), ln, 3 + b); stamp((HAT[look.hat] || HAT.gorra).side, ln, b); }
      else stamp(hs, ln, b);
      if (look.lentes) { put(10 + ln, 4 + b, 'O'); put(11 + ln, 4 + b, 'O'); put(12 + ln, 4 + b, 'O'); put(9 + ln, 4 + b, 'o'); }
    }
    // termo de tereré en la mano de adelante
    if (look.termo && hand) {
      const [hx, hy] = hand;
      for (let y = 0; y < 4; y++) { put(hx + (side ? 1 : 0), hy - 1 + y, y === 0 ? 'r' : 'R'); }
      put(hx + (side ? 1 : 0), hy + 3, 'r');
    }
    if (dir === 'left') g.forEach((r) => r.reverse());
    return g;
  }


  // =====================================================================================================
  // Estilo Kiut (como los dibujos de Sofía para Kiut Studio): cabeza grande y redonda (casi la mitad del
  // cuerpo), cara simple con ojitos (puntitos, felices o grandes), cachetes rosados, cuerpo chiquito con
  // bracitos y piernitas cortas, colores planos y contorno oscuro parejo. Misma grilla de 16×24.
  // =====================================================================================================
  const KHEAD = [
    '................', '................',
    '.....SSSSSS.....', '...SSSSSSSSSS...', '..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..',
    '..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..', '...SSSSSSSSSS...', '.....SSSSSS.....',
  ];
  const KHAIR = {
    corto: {
      down: ['....HHHHHHHH....', '..HHHHHHHHHHHH..', '.HHHHHHLLHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHH.HHHH.HHHH.', '.HH..........HH.', '.HH..........HH.', '.H............H.'],
      up: ['....HHHHHHHH....', '..HHHHHHHHHHHH..', '.HHHHHHLLHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '..HHHHHHHHHHHH..', '...hHHHHHHHHh...'],
      side: ['....HHHHHHH.....', '..HHHHHHHHHHH...', '.HHHHHHLLHHHHH..', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHH.HHH..', '.HHHHHHH........', '.HHHHHH.........', '.HHHHH..........', '..HHH...........'],
    },
    largo: {
      down: ['....HHHHHHHH....', '..HHHHHHHHHHHH..', '.HHHHHHLLHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHH.HHHH.HHHH.', 'HHH..........HHH', 'HHH..........HHH', '.HH..........HH.', 'HHH..........HHH',
        'HH............HH', 'HHH..........HHH', '.HHH........HHH.', 'HHH..........HHH', '.HH..........HH.', 'HH............HH', '.h............h.'],
      up: ['....HHHHHHHH....', '..HHHHHHHHHHHH..', '.HHHHHHLLHHHHHH.', 'HHHHHHHHHHHHHHHH', 'HHHHHHHHHHHHHHHH', '.HHHHHHHHHHHHHH.', 'HHHHHHHHHHHHHHHH', 'HHHHHHHHHHHHHHHH', '.HHHHHHHHHHHHHH.', 'HHHHHHHHHHHHHHHH',
        'HHHHHHHHHHHHHHHH', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', 'HHHHHHHHHHHHHHH.', '.HHHHHHHHHHHHH..', 'HHHHHHHHHHHHHH..', '.hHhhHhhHhhHh...'],
      side: ['....HHHHHHH.....', '..HHHHHHHHHHH...', '.HHHHHHLLHHHHH..', 'HHHHHHHHHHHHHHH.', 'HHHHHHHHHHHHHHH.', 'HHHHHHHHHH.HHH..', 'HHHHHHHH........', 'HHHHHHH.........', '.HHHHHH.........', 'HHHHHH..........',
        'HHHHH...........', '.HHHHH..........', 'HHHHH...........', '.HHHH...........', 'HHHH............', '.HH.............', '.h..............'],
    },
    colita: {
      down: ['....HHHHHHHH....', '..HHHHHHHHHHHH..', '.HHHHHHLLHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHH.HHHHHH.HHH.', '.HH..........HH.', 'HHH..........HH.', 'HHH...........H.', 'HH..............', 'HHH.............', '.HH.............', '.HH.............', '..h.............'],
      up: ['....HHHHHHHH....', '..HHHHHHHHHHHH..', '.HHHHHHLLHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', 'HHHHHHHHHHHHHHH.', 'HHHHHHHHHHHHHHH.', 'HHHHHHHHHHHHHH..', 'HHHhHHHHHHHHh...', '..HH............', '..HH............', '...h............'],
      side: ['....HHHHHHH.....', '..HHHHHHHHHHH...', '.HHHHHHLLHHHHH..', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHH.HHH..', '.HHHHHHH........', 'HHHHHH..........', 'HHHHH...........', 'HHH.............', 'HHH.............', '.HH.............', '.h..............'],
    },
    rulos: {
      down: ['...HHLHHHHLH....', '.HHHHHHHHHHHHHH.', 'HHHHLHHHHHHLHHHH', 'HHHHHHHHHHHHHHHH', 'HHHHHHHHHHHHHHHH', 'HHHHHHHHHHHHHHHH', 'HHH..H....H..HHH', 'HH............HH', 'HHH..........HHH', '.HH..........HH.', '.H............H.'],
      up: ['...HHLHHHHLH....', '.HHHHHHHHHHHHHH.', 'HHHHLHHHHHHLHHHH', 'HHHHHHHHHHHHHHHH', 'HHHHHHHLHHHHHHHH', 'HHHHHHHHHHHHHHHH', 'HHHHLHHHHHHLHHHH', 'HHHHHHHHHHHHHHHH', 'HHHHHHHHHHHHHHHH', '.HHHHHHHHHHHHHH.', '..hHHHHHHHHHHh..'],
      side: ['...HHLHHHHLH....', '.HHHHHHHHHHHHH..', 'HHHHLHHHHHHLHHH.', 'HHHHHHHHHHHHHHHH', 'HHHHHHHHHHHHHHHH', 'HHHHHHHHHH.HHH..', 'HHHHHHHH........', 'HHHHHHH.........', 'HHHHHHH.........', '.HHHHH..........', '..hh............'],
    },
    rapado: {
      down: ['................', '.....hhhhhh.....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..h..........h..'],
      up: ['................', '.....hhhhhh.....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhh..', '...hhhhhhhhhh...'],
      side: ['................', '.....hhhhhh.....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hhhhhh........', '..hhhhh.........', '..hhhh..........', '...hh...........'],
    },
  };
  KHAIR.cresta = KHAIR.corto;
  KHAIR.pelado = { down: [], up: [], side: [] };
  const KHAT = {
    gorra: { down: ['....CCCCCCCC....', '..CCCCCCCCCCCC..', '.CCCCCCLCCCCCCC.', '.CCCCCCCCCCCCCC.', 'vvvvvvvvvvvvvvvv'],
      up: ['....CCCCCCCC....', '..CCCCCCCCCCCC..', '.CCCCCCLCCCCCCC.', '.CCCCCCCCCCCCCC.', '.cCCCCCCCCCCCCc.', '.......cc.......'],
      side: ['....CCCCCCC.....', '..CCCCCCCCCCC...', '.CCCCCCLCCCCCC..', '.CCCCCCCCCCCCCC.', '.cCCCCCCCvvvvvvv'] },
    gorro: { down: ['......CCCC......', '...CCCCCCCCCC...', '..CCCCCCCCCCCC..', '.CCCCCCCCCCCCCC.', '.cccccccccccccc.'],
      up: ['......CCCC......', '...CCCCCCCCCC...', '..CCCCCCCCCCCC..', '.CCCCCCCCCCCCCC.', '.cccccccccccccc.'],
      side: ['.....CCCC.......', '...CCCCCCCCC....', '..CCCCCCCCCCC...', '.CCCCCCCCCCCCC..', '.ccccccccccccc..'] },
  };
  KHAT.gorraAtras = { down: KHAT.gorra.up, up: KHAT.gorra.down.slice(0, 4).concat(['vvvvvvvvvvvvvvvv']), side: ['....CCCCCCC.....', '..CCCCCCCCCCC...', '.CCCCCCLCCCCCC..', '.CCCCCCCCCCCCCC.', 'vvvvvvvCCCCCCCc.'] };
  const KPOSE = {
    idle: [{ l: 0, r: 0, al: 0, ar: 0, bob: 0 }],
    walk: [{ l: 0, r: 0, al: 0, ar: 0, bob: 0 }, { l: 0, r: 1, al: 1, ar: -1, bob: -1 }, { l: 0, r: 0, al: 0, ar: 0, bob: 0 }, { l: 1, r: 0, al: -1, ar: 1, bob: -1 }],
    run: [{ l: 0, r: 2, al: 2, ar: -1, bob: 0, sp: 1 }, { l: 1, r: 1, al: 1, ar: 1, bob: -1, sp: 0 }, { l: 2, r: 0, al: -1, ar: 2, bob: 0, sp: -1 }, { l: 1, r: 1, al: 1, ar: 1, bob: -1, sp: 0 }],
  };
  const KSIDE = {
    idle: [{ a: 0, b: 0, la: 0, lb: 0, h: 0, bob: 0, lean: 0 }],
    walk: [{ a: 1, b: -1, la: 0, lb: 0, h: -1, bob: 0, lean: 0 }, { a: 0, b: 0, la: 0, lb: 1, h: 0, bob: -1, lean: 0 }, { a: -1, b: 1, la: 0, lb: 0, h: 1, bob: 0, lean: 0 }, { a: 0, b: 0, la: 1, lb: 0, h: 0, bob: -1, lean: 0 }],
    run: [{ a: 2, b: -2, la: 1, lb: 0, h: -2, bob: 0, lean: 1 }, { a: 1, b: -1, la: 1, lb: 2, h: 0, bob: -1, lean: 1 }, { a: -2, b: 2, la: 0, lb: 1, h: 2, bob: 0, lean: 1 }, { a: -1, b: 1, la: 2, lb: 1, h: 0, bob: -1, lean: 1 }],
  };
  function composeKiut(look, dir, anim, f) {
    const g = Array.from({ length: H }, () => new Array(W).fill('.'));
    const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
    const stamp = (rows, dx, dy) => rows.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') put(x + dx, y + dy, c); }));
    const side = dir === 'left' || dir === 'right', D = side ? 'side' : dir, front = D === 'down';
    const top = look.top, bot = look.bottom, longSleeve = top === 'camisa' || top === 'buzo', noSleeve = top === 'musculosa';
    const skirt = bot === 'pollera', shorts = bot === 'short' || bot === 'bermuda' || skirt;
    let hand = null;
    const face = (dx, b, sideFace) => {
      const ex = sideFace ? [10] : [5, 10];
      for (const x of ex) {
        const X = x + dx;
        if (look.eyes === 'felices') { put(X - 1, 8 + b, 'E'); put(X, 7 + b, 'E'); put(X + 1, 8 + b, 'E'); }
        else if (look.eyes === 'redondos') { const x0 = X - 1; put(x0 + 1, 5 + b, 'E'); put(x0 + 2, 5 + b, 'E'); put(x0, 6 + b, 'E'); put(x0 + 3, 6 + b, 'E'); put(x0, 7 + b, 'E'); put(x0 + 3, 7 + b, 'E'); put(x0 + 1, 8 + b, 'E'); put(x0 + 2, 8 + b, 'E'); put(x0 + 1, 6 + b, 'W'); put(x0 + 2, 6 + b, 'W'); put(x0 + 1, 7 + b, 'W'); put(x0 + 2, 7 + b, 'E'); }
        else { put(X, 7 + b, 'E'); put(X, 8 + b, 'E'); }
      }
      if (sideFace) { put(11 + dx, 9 + b, 'K'); put(12 + dx, 9 + b, 'K'); put(12 + dx, 10 + b, 'M'); }
      else { put(3 + dx, 9 + b, 'K'); put(4 + dx, 9 + b, 'K'); put(11 + dx, 9 + b, 'K'); put(12 + dx, 9 + b, 'K'); put(7 + dx, 10 + b, 'M'); put(8 + dx, 10 + b, 'M'); }
      if (look.lentes) { const r = 7 + b; if (sideFace) { put(9 + dx, r, 'O'); put(10 + dx, r, 'O'); put(11 + dx, r, 'O'); } else for (const x of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) put(x + dx, r, x === 7 || x === 8 ? 'o' : 'O'); }
    };
    if (!side) {
      const P = KPOSE[anim][f % KPOSE[anim].length], b = P.bob, sp = P.sp || 0;
      // piernitas
      for (const [x0, lift, dx] of [[5, P.l, -Math.abs(sp)], [9, P.r, Math.abs(sp)]]) {
        const yb = 20 - lift;
        for (let y = 17; y <= yb; y++) for (let x = x0; x < x0 + 2; x++) put(x + (y > 18 ? dx : 0), y, shorts && y >= 18 ? 'D' : 'U');
        for (let x = x0 - (x0 < 8 ? 1 : 0); x < x0 + 2 + (x0 > 8 ? 1 : 0); x++) { put(x + dx, yb + 1, 'F'); put(x + dx, yb + 2, 'f'); }
      }
      for (let x = 5; x <= 10; x++) put(x, 17, 'U');
      if (skirt) { for (let x = 4; x <= 11; x++) put(x, 16 + b, 'U'); for (let x = 3; x <= 12; x++) { put(x, 17 + b, 'U'); put(x, 18 + b, x > 9 ? 'u' : 'U'); } }
      // cuerpito
      stamp(['.....TTTTTT.....', '....TTTTTTTT....', '....TTTTTTTT....', '....TTTTTTTT....', '.....TTTTTT.....'], 0, 12 + b);
      if (front) {
        if (top === 'polo' || top === 'camisa') { put(6, 12 + b, 'k'); put(9, 12 + b, 'k'); }
        if (top === 'camisa') for (let y = 12; y <= 16; y++) { put(7, y + b, 'k'); put(8, y + b, 'k'); }
        if (top === 'buzo') { for (let x = 5; x <= 10; x++) put(x, 15 + b, 't'); put(7, 13 + b, 'k'); put(8, 13 + b, 'k'); }
        if (look.print && top === 'remera') { put(7, 14 + b, 'k'); put(8, 14 + b, 'k'); }
      } else if (top === 'buzo') for (let x = 5; x <= 10; x++) put(x, 12 + b, 't');
      if (top === 'camiseta') for (let y = 12; y <= 16; y++) for (const x of [5, 8, 10]) if (g[y + b][x] === 'T') put(x, y + b, 'k');
      if (noSleeve) { put(4, 13 + b, 'S'); put(11, 13 + b, 'S'); }
      // bracitos
      for (const [x, o, out] of [[3, P.al, -1], [12, P.ar, 1]]) {
        const up = anim === 'run' ? -1 : 0, A = noSleeve ? 'S' : 'A', a = longSleeve ? 'A' : 'S';
        put(x, 13 + b + up, A); put(x, 14 + b + o + up, a); put(x + (anim === 'run' ? out : 0), 15 + b + o + up, 'G');
        if (x === 12) hand = [x, 15 + b + o + up];
      }
      if (look.mochila) { if (front) { put(5, 13 + b, 'p'); put(10, 13 + b, 'p'); put(5, 14 + b, 'p'); put(10, 14 + b, 'p'); } else stamp(['.....PPPPPP.....', '.....PPPPPP.....', '.....PPkkPP.....', '.....pPPPPp.....'], 0, 12 + b); }
      stamp(KHEAD, 0, b);
      if (front) face(0, b, false);
      const hs = KHAIR[look.hair][D];
      stamp(hs, 0, b);
      if (look.hat !== 'ninguno') stamp((KHAT[look.hat] || KHAT.gorra)[D], 0, b);
    } else {
      const P = KSIDE[anim][f % KSIDE[anim].length], b = P.bob, ln = P.lean;
      // pierna lejana, cuerpo, pierna cercana
      const leg = (dx, lift, c, cl) => {
        const yb = 20 - lift;
        for (let y = 17; y <= yb; y++) { put(7 + (y > 18 ? dx : 0), y, shorts && y >= 18 ? cl : c); put(8 + (y > 18 ? dx : 0), y, shorts && y >= 18 ? cl : c); }
        for (let x = 7; x <= 9; x++) { put(x + dx, yb + 1, 'F'); put(x + dx, yb + 2, 'f'); }
      };
      leg(P.b, P.lb, 'u', 'd');
      if (look.mochila) stamp(['...PPP', '...PPP', '...PkP', '...pPp'].map((r) => r.padEnd(16, '.')), ln, 12 + b);
      stamp(['......TTTT......', '.....TTTTTT.....', '.....TTTTTT.....', '.....TTTTTT.....', '......TTTT......'], ln, 12 + b);
      if (top === 'camiseta') for (let y = 12; y <= 16; y++) put(8 + ln, y + b, 'k');
      if (skirt) { for (let x = 5; x <= 10; x++) put(x + ln, 16 + b, 'U'); for (let x = 4; x <= 11; x++) { put(x + ln, 17 + b, 'U'); put(x + ln, 18 + b, 'U'); } }
      leg(P.a, P.la, 'U', 'D');
      // bracito de adelante
      const A = noSleeve ? 'S' : 'A', a = longSleeve ? 'A' : 'S', hx = 8 + ln + P.h, up = anim === 'run' ? -1 : 0;
      put(8 + ln, 13 + b, A); put(8 + ln + Math.sign(P.h), 14 + b + up, a); put(hx, 15 + b + up, 'G'); hand = [hx, 15 + b + up];
      stamp(KHEAD, ln, b);
      face(ln, b, true);
      stamp(KHAIR[look.hair].side, ln, b);
      if (look.hat !== 'ninguno') stamp((KHAT[look.hat] || KHAT.gorra).side, ln, b);
    }
    if (look.termo && hand) { const [hx, hy] = hand; put(hx, hy - 2, 'r'); put(hx, hy - 1, 'R'); put(hx, hy, 'R'); put(hx, hy + 1, 'R'); }
    if (dir === 'left') g.forEach((r) => r.reverse());
    return g;
  }

  // ---------- colores ----------
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mul = (c, k) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  function palette(look) {
    const [sk, skD] = CAT.skin[look.skin], [hr, hrD, hrL] = CAT.hairColor[look.hairColor];
    const [tp, tpD] = CAT.cloth[look.topColor], [t2] = CAT.cloth[look.topColor2 ?? 1];
    const bc = look.bottom === 'jean' ? CAT.denim[look.bottomColor % CAT.denim.length] : CAT.cloth[look.bottomColor % CAT.cloth.length];
    const [sh] = CAT.cloth[look.shoesColor], [hc, hcD] = CAT.cloth[look.hatColor], [xc, xcD] = CAT.cloth[look.extraColor];
    const P = {
      S: sk, s: skD, W: '#f6f2ea', E: '#1a1210', M: VR.shadeHex ? VR.shadeHex(skD, 0.82) : skD, N: skD,
      H: hr, h: hrD, L: hrL,
      T: tp, t: tpD, k: t2, A: tp, Q: tpD,
      G: sk, g: skD, B: look.bottom === 'jogging' || look.bottom === 'pollera' ? bc[0] : '#2a2420',
      U: bc[0], u: bc[1], D: bc[0], d: bc[1],
      C: hc, c: hcD, v: hcD, O: '#18181e', o: '#3a3a44', P: xc, p: xcD, R: '#2e6fc8', r: '#d8dce4', K: '#f4a0b0',
    };
    if (look.bottom === 'short' || look.bottom === 'bermuda' || look.bottom === 'pollera') { P.D = sk; P.d = skD; }
    if (look.shoes === 'zapatillas') { P.F = sh; P.f = '#f2efe6'; }
    else if (look.shoes === 'chinelas') { P.F = sk; P.f = sh; }
    else { P.F = '#5a3a22'; P.f = '#2e1e12'; }
    if (look.top === 'camisa' || look.top === 'polo' || look.top === 'buzo') P.k = look.top === 'camisa' ? '#f2efe6' : t2;
    return P;
  }

  // ---------- pintar con contorno selectivo (más oscuro que el color vecino) ----------
  function paint(grid, pal, solid) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
    const col = {}; for (const k in pal) col[k] = hex(pal[k]);
    const at = (px, py) => (px < 0 || py < 0 || px >= W || py >= H) ? '.' : grid[py][px];
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      const ch = grid[y][xx], o = (y * W + xx) * 4;
      if (ch !== '.') { const [r, g2, b] = col[ch] || [255, 0, 255]; d[o] = r; d[o + 1] = g2; d[o + 2] = b; d[o + 3] = 255; continue; }
      let nb = null;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const n = at(xx + dx, y + dy); if (n !== '.') { nb = n; break; } }
      if (nb) { const [r, g2, b] = solid ? [30, 26, 32] : mul(col[nb] || [40, 30, 30], 0.32); d[o] = r + (solid ? 0 : 8); d[o + 1] = g2 + (solid ? 0 : 6); d[o + 2] = b + (solid ? 0 : 8); d[o + 3] = 255; }
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  // el equipo de Kiut Studio, como los dibujó Sofía
  VR.AVATAR_PRESETS = {
    Leandro: { style: 'kiut', skin: 0, hair: 'corto', hairColor: 0, eyes: 'felices', top: 'polo', topColor: 3, topColor2: 3, bottom: 'jean', bottomColor: 2, shoes: 'zapatillas', shoesColor: 3 },
    Sofi: { style: 'kiut', skin: 0, hair: 'largo', hairColor: 2, eyes: 'felices', top: 'remera', topColor: 1, bottom: 'pollera', bottomColor: 12, shoes: 'zapatillas', shoesColor: 1 },
    'Sofi con buzo': { style: 'kiut', skin: 0, hair: 'largo', hairColor: 3, eyes: 'felices', top: 'buzo', topColor: 13, topColor2: 1, bottom: 'pollera', bottomColor: 12, shoes: 'zapatillas', shoesColor: 12, hat: 'gorro', hatColor: 13 },
    Deisy: { style: 'kiut', skin: 0, hair: 'colita', hairColor: 4, eyes: 'felices', top: 'camisa', topColor: 13, topColor2: 12, bottom: 'jean', bottomColor: 2, shoes: 'zapatillas', shoesColor: 3 },
    Cinthia: { style: 'kiut', skin: 0, hair: 'largo', hairColor: 5, eyes: 'redondos', top: 'remera', topColor: 12, bottom: 'jean', bottomColor: 2, shoes: 'zapatillas', shoesColor: 3 },
    Nora: { style: 'kiut', skin: 3, hair: 'largo', hairColor: 5, eyes: 'redondos', top: 'remera', topColor: 12, bottom: 'short', bottomColor: 3, shoes: 'zapatillas', shoesColor: 3 },
  };
  VR.ANIMS = { idle: 1, walk: 4, run: 4 };
  // hoja completa del avatar: { down|up|left|right: { idle: [c], walk: [c×4], run: [c×4] } }
  VR.makeAvatar = (look) => {
    look = Object.assign({}, VR.AVATAR_DEFAULT, look || {});
    const pal = palette(look), out = {};
    for (const dir of ['down', 'up', 'right', 'left']) {
      out[dir] = {};
      const kiut = look.style === 'kiut';
      for (const an in VR.ANIMS) out[dir][an] = Array.from({ length: VR.ANIMS[an] }, (_, f) => paint((kiut ? composeKiut : compose)(look, dir, an, f), pal, kiut));
    }
    return out;
  };
  VR.avatarPrice = (look) => {
    let t = CAT.hair[look.hair].price + CAT.top[look.top].price + CAT.bottom[look.bottom].price + CAT.shoes[look.shoes].price + CAT.hat[look.hat].price;
    for (const k of ['lentes', 'mochila', 'termo']) if (look[k]) t += CAT.extra[k].price;
    return t;
  };
  VR.randomLook = (rnd = Math.random) => {
    const pick = (o) => { const k = Object.keys(o); return k[(rnd() * k.length) | 0]; }, n = (a) => (rnd() * a.length) | 0;
    return { skin: n(CAT.skin), hair: pick(CAT.hair), hairColor: rnd() < 0.8 ? n(CAT.hairColor.slice(0, 5)) : n(CAT.hairColor), top: pick(CAT.top), topColor: n(CAT.cloth), topColor2: n(CAT.cloth),
      bottom: pick(CAT.bottom), bottomColor: n(CAT.cloth), shoes: pick(CAT.shoes), shoesColor: n(CAT.cloth), hat: rnd() < 0.3 ? pick(CAT.hat) : 'ninguno', hatColor: n(CAT.cloth),
      lentes: rnd() < 0.15, mochila: rnd() < 0.2, termo: rnd() < 0.15, extraColor: n(CAT.cloth), print: rnd() < 0.4, eyes: pick(CAT.eyes) };
  };
})();
