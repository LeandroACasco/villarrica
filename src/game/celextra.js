// Apps extra del celular (19/11/2026, pedido de Leandro): ⏰ Alarma, 📻 Radio (sintetizada, con cuatro... tres emisoras inventadas), 🌤 Clima, 📰 Noticias,
// 🍔 Ñembo'u (delivery), ❤️ Salud, 🎮 Juegos (carpeta) y 📞 llamadas a los contactos. Cada app es html(k, X) + init(k, body, X) → stop().
// X = { vida, esc, gs, B (Buzon), toast, paint(), app(), go(f), net() } lo arma main.js.
VR.CelX = (() => {
  const A = () => VR.audio, mf = (n) => 440 * Math.pow(2, (n - 69) / 12), pad = (n) => String(n).padStart(2, '0');
  const hm = (m) => pad((m / 60) | 0) + ':' + pad(m % 60);
  const rng = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const APPS = [['alarma', '⏰', 'Alarma', '#ff9a5a', false], ['radio', '📻', 'Radio', '#c8a0ff', false], ['clima', '🌤', 'Clima', '#6ac8ff', true], ['noti', '📰', 'Noticias', '#e6e6e6', true],
    ['deliv', '🍔', "Ñembo'u", '#ff6b4a', true], ['salud', '❤️', 'Salud', '#ff7a8a', false], ['juegos', '🎮', 'Juegos', '#9bbc0f', false], ['tere', '🧉', 'Tereré', '#3b9d5a', true], ['calc', '🧮', 'Calculadora', '#ff9a5a', false], ['notas', '📝', 'Notas', '#ffd84a', false], ['crono', '⏱', 'Cronómetro', '#6ac8ff', false], ['musica', '🎧', 'Música', '#c8a0ff', false], ['banco', '💰', 'Banco+', '#3cc87a', true], ['tienda', '🛍', 'Tienda de apps', '#ff6b9a', false], ['sos', '🆘', 'Emergencia', '#ff4a4a', false], ['ajustes', '⚙️', 'Ajustes', '#9aa3b2', false]];

  // ================= Apps nuevas (v2.04): calculadora, notas, cronómetro, música, banco+, tienda, emergencia, Tereré (fotos y mensajes) =================
  const PREMIUM = { crono: 3000, musica: 6000, banco: 8000 };
  const tiene = (k) => !PREMIUM[k] || cfgA().apps.includes(k);
  const cfgA = () => { const c = cfg(); c.apps = c.apps || []; c.ahorro = c.ahorro || 0; c.ahDia = c.ahDia || V.dia; return c; };
  const hms = (ms) => { const t = Math.max(0, Math.floor(ms / 10)), c = t % 100, s = Math.floor(t / 100) % 60, m = Math.floor(t / 6000); return pad(m) + ':' + pad(s) + '.' + pad(c); };
  // --- calculadora ---
  const calc = { d: '0', a: null, op: null, nuevo: true };
  function calcTecla(k) {
    if (/\d/.test(k)) { calc.d = calc.nuevo || calc.d === '0' ? k : calc.d + k; calc.nuevo = false; }
    else if (k === ',') { if (calc.nuevo) { calc.d = '0,'; calc.nuevo = false; } else if (!calc.d.includes(',')) calc.d += ','; }
    else if (k === 'C') { calc.d = '0'; calc.a = null; calc.op = null; calc.nuevo = true; }
    else if (k === '±') calc.d = calc.d.startsWith('-') ? calc.d.slice(1) : (calc.d === '0' ? '0' : '-' + calc.d);
    else if (k === '%') calc.d = String(parseFloat(calc.d.replace(',', '.')) / 100).replace('.', ',');
    else { const x = parseFloat(calc.d.replace(',', '.')); if (calc.op && !calc.nuevo) { calc.a = opera(calc.a, x, calc.op); calc.d = fmtC(calc.a); } else calc.a = x; calc.op = k === '=' ? null : k; calc.nuevo = true; }
  }
  const opera = (a, b, o) => (o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : o === '÷' ? (b === 0 ? NaN : a / b) : b);
  const fmtC = (n) => (Number.isFinite(n) ? String(Math.round(n * 1e8) / 1e8).replace('.', ',') : 'Error');
  // --- cronómetro / temporizador ---
  const cr = { run: false, t0: 0, acc: 0, vueltas: [], tmr: null, tmrEnd: 0, tmrMin: 5 };
  const crT = () => cr.acc + (cr.run ? performance.now() - cr.t0 : 0);
  // --- música: pistas que usan el sintetizador de la radio con distintas semillas ---
  const PISTAS = [['Tarde en el Ykuá', 'guarania', 0], ['Ñande Rendá', 'guarania', 1], ['Polca del mercado', 'polca', 0], ['Polca de feria', 'polca', 3], ['Noche de cumbia', 'cumbia', 0], ['Cumbia del lago', 'cumbia', 2], ['Ruta 8', 'rock', 0], ['Garaje', 'rock', 4]];
  let pista = -1;
  const sonar = (i) => { pista = (i + PISTAS.length) % PISTAS.length; Radio.set(PISTAS[pista][1], PISTAS[pista][2]); };
  // --- Tereré: fotos tuyas y mensajes directos ---
  const COMF = ['¡Qué linda foto!', 'Se ve genial', 'Mba\'éichapa esa foto', 'Pasá la ubicación', '🔥🔥🔥', 'Divino che'];
  const RDM = ['Jajaja, qué bueno. ¿Y vos qué hacés?', 'Dale, nos vemos por la plaza.', 'Gracias che, estoy a full hoy.', 'Pasame tu número… ah no, ya lo tengo censurado, jaja.', 'Ahí te aviso, ndaje.', 'Qué lindo que escribas, ¡un abrazo!'];
  const MEDM = ['Hola, ¿cómo andás?', '¿Vamos a tomar tereré?', 'Me gustó tu publicación', '¿Sabés dónde hay buena chipa?'];
  const dms = () => { const M = mias(); M.dm = M.dm || {}; return M.dm; };
  function entraDM(i, t) { const D = dms(), k = String(i); D[k] = D[k] || { m: [], un: false }; D[k].m.push({ de: 'el', t }); D[k].un = true; V.save(); }
  const sinLeerDM = () => Object.values(dms()).filter((d) => d.un).length;
  function miniatura(u, cb) { const im = new Image(); im.onload = () => { const w = 200, h = Math.round(im.height * w / im.width), c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h); cb(c.toDataURL('image/jpeg', 0.6)); }; im.onerror = () => cb(null); im.src = u; }

  // ---- Tereré: la red social de Villarrica (todo inventado). Feed del día con vecinos; vos publicás y te van llegando likes y comentarios ----
  const GENTE = [['Cinthia Vera', '👩', 'cara', 11], ['Chino Ayala', '🧑', 'cara', 23], ['Doña Chela', '👵'], ['Kike Mbohasa', '🛵'], ['Tía Norma', '👩‍🦳'], ['Pablo Ñandú', '🧔', 'dib', 5], ['Lorena Ykuá', '👱‍♀️', 'cara', 37], ['El Gringo', '🧑‍🦰', 'lago', 2]]; // 3er dato: tipo de foto de perfil (la mayoría usa un emoji, como en la vida real)
  const POSTS = ['Hoy el calor está para tereré con menta. ¿Quién se suma a la plaza?', 'Se me pinchó la goma en la ruta, ¡qué día, ndaje!', 'Mañana feria en el mercado, lleguen temprano.', 'Ojo con la zona de la terminal esta noche, mucho movimiento.', 'Se corta la luz otra vez... paciencia nomás.', 'Vendo bici usada, buen estado. Consulten por privado.'];
  const ESC = { chipa: ['Chipa recién salida del horno, pasen nomás.', 'Tereré y chipa, la combinación perfecta.'], lago: ['Qué lindo atardecer sobre el lago, miren.', 'Domingo de lago y tranquilidad.'], gato: ['Alguien vio mi gato? Es naranja y anda por el barrio Ykuá.', 'Mi gato se adueñó de la casa, ndaje.'], moto: ['Pedí un Mbohasa y el conductor era un divino, 5 estrellas.', 'Mi moto nueva, ¡a rodar!'], helado: ['El helado de Marimer con este calor, no hay como eso.', 'Dos bochas y a la plaza.'], bomberos: ['Los bomberos hicieron un trabajo bárbaro hoy, gracias.'], plaza: ['Tarde linda en la plaza, vengan.', 'Cumple de mi abuela, vengan todos al asado.'], asado: ['Asado con mandioca, el mejor plan del sábado.', 'Cumple de mi abuela, vengan todos al asado.'] };
  // ---- fotos dibujadas con canvas (pixeladas, originales); se cachean por escena+semilla ----
  const FOTOS = new Map();
  function dibuja(sc, sd, w, h) {
    const key = sc + sd + w; if (FOTOS.has(key)) return FOTOS.get(key); const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), r = rng(sd * 97 + 5), W = w, H = h;
    const rc = (x, y, a, b, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(a), Math.round(b)); }, ci = (x, y, rad, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); };
    const cielo = (a, b) => { const q = g.createLinearGradient(0, 0, 0, H); q.addColorStop(0, a); q.addColorStop(1, b); g.fillStyle = q; g.fillRect(0, 0, W, H); };
    const dia = r() < 0.5;
    if (sc === 'chipa') { rc(0, 0, W, H, '#8a5a30'); for (let y = 0; y < H; y += 12) rc(0, y, W, 1, '#6e4624'); ci(W * 0.4, H * 0.55, H * 0.33, '#f2ece0'); ci(W * 0.4, H * 0.55, H * 0.26, '#e2d8c4'); for (let k = 0; k < 4 + ((r() * 3) | 0); k++) { const a = r() * 6.28, d = r() * H * 0.14; ci(W * 0.4 + Math.cos(a) * d, H * 0.55 + Math.sin(a) * d, H * 0.07, '#e8b550'); ci(W * 0.4 + Math.cos(a) * d, H * 0.55 + Math.sin(a) * d, H * 0.03, '#f4d27a'); } rc(W * 0.72, H * 0.38, W * 0.14, H * 0.4, '#8a9099'); rc(W * 0.72, H * 0.38, W * 0.14, H * 0.05, '#b8bec8'); rc(W * 0.8, H * 0.12, 2, H * 0.3, '#c8c8d0'); for (let k = 0; k < 3; k++) rc(W * 0.4 - 6 + k * 6, H * 0.12 - ((k * 3) % 5), 1, 8, 'rgba(255,255,255,.35)'); }
    else if (sc === 'lago') { cielo(dia ? '#6ab6ee' : '#ff9a5a', dia ? '#d8f0ff' : '#ffd8a0'); ci(W * (0.25 + r() * 0.5), H * 0.38, H * 0.1, dia ? '#fff6c0' : '#ffe9a8'); g.fillStyle = '#3f6e4a'; g.beginPath(); g.moveTo(0, H * 0.55); g.lineTo(W * 0.2, H * 0.4); g.lineTo(W * 0.45, H * 0.52); g.lineTo(W * 0.7, H * 0.36); g.lineTo(W, H * 0.55); g.lineTo(W, H * 0.6); g.lineTo(0, H * 0.6); g.fill(); rc(0, H * 0.6, W, H * 0.4, dia ? '#3d92c8' : '#c87a5a'); for (let k = 0; k < 7; k++) rc(r() * W, H * 0.64 + r() * H * 0.32, 10 + r() * 14, 1, 'rgba(255,255,255,.5)'); const bx = W * (0.2 + r() * 0.5); rc(bx, H * 0.7, 18, 4, '#7a4a28'); rc(bx + 8, H * 0.55, 1, 15, '#ddd'); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(bx + 9, H * 0.55); g.lineTo(bx + 16, H * 0.68); g.lineTo(bx + 9, H * 0.68); g.fill(); }
    else if (sc === 'gato') { rc(0, 0, W, H, ['#e8d8c0', '#c8d8e0', '#e0c8d0'][(r() * 3) | 0]); rc(0, H * 0.72, W, H * 0.28, '#9a7a58'); const cx = W * 0.5, cy = H * 0.58, col = ['#e8923a', '#444', '#d8d8d8'][(r() * 3) | 0]; ci(cx, cy + 10, 22, col); ci(cx, cy - 12, 14, col); g.fillStyle = col; g.beginPath(); g.moveTo(cx - 14, cy - 16); g.lineTo(cx - 11, cy - 32); g.lineTo(cx - 3, cy - 22); g.fill(); g.beginPath(); g.moveTo(cx + 14, cy - 16); g.lineTo(cx + 11, cy - 32); g.lineTo(cx + 3, cy - 22); g.fill(); rc(cx - 8, cy - 14, 4, 4, '#9be07a'); rc(cx + 4, cy - 14, 4, 4, '#9be07a'); rc(cx - 7, cy - 13, 1, 3, '#000'); rc(cx + 5, cy - 13, 1, 3, '#000'); rc(cx - 1, cy - 8, 3, 2, '#ff8fa0'); g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.moveTo(cx + 20, cy + 14); g.quadraticCurveTo(cx + 44, cy + 4, cx + 36, cy - 14); g.stroke(); }
    else if (sc === 'moto') { cielo(dia ? '#8ac8f0' : '#2a2a5a', dia ? '#e8f4ff' : '#6a5a8a'); rc(0, H * 0.78, W, H * 0.22, '#55585e'); rc(0, H * 0.87, W, 1, '#e8d84a'); const x = W * 0.3, y = H * 0.74, col = ['#d83a3a', '#2a6ad8', '#f0c020'][(r() * 3) | 0]; ci(x, y, 11, '#222'); ci(x, y, 5, '#999'); ci(x + 54, y, 11, '#222'); ci(x + 54, y, 5, '#999'); rc(x + 6, y - 20, 42, 10, col); rc(x + 30, y - 28, 16, 8, '#333'); rc(x + 44, y - 26, 12, 3, '#555'); rc(x + 6, y - 12, 8, 14, '#444'); rc(x + 56, y - 20, 4, 6, '#fff6a0'); }
    else if (sc === 'helado') { rc(0, 0, W, H, ['#ffd8e8', '#d8f0ff', '#fff0c0'][(r() * 3) | 0]); const cx = W * 0.5; g.fillStyle = '#d8a050'; g.beginPath(); g.moveTo(cx - 16, H * 0.5); g.lineTo(cx + 16, H * 0.5); g.lineTo(cx, H * 0.95); g.fill(); for (let k = 0; k < 6; k++) rc(cx - 12 + k * 4, H * 0.55 + k % 2 * 4, 1, 14, '#b88030'); ci(cx, H * 0.42, 17, ['#ff8fb8', '#8fe0c0', '#fff'][(r() * 3) | 0]); ci(cx, H * 0.24, 15, ['#a0603a', '#ffe06a', '#c8a0ff'][(r() * 3) | 0]); ci(cx + 6, H * 0.12, 3, '#d82a3a'); rc(cx - 6, H * 0.22, 2, 2, '#fff'); rc(cx + 4, H * 0.28, 2, 2, '#fff'); }
    else if (sc === 'bomberos') { cielo('#8ac8f0', '#dff0ff'); rc(0, H * 0.78, W, H * 0.22, '#55585e'); rc(W * 0.12, H * 0.42, W * 0.5, H * 0.34, '#d82a2a'); rc(W * 0.62, H * 0.5, W * 0.2, H * 0.26, '#c82020'); rc(W * 0.66, H * 0.54, W * 0.12, H * 0.1, '#9ad8ff'); rc(W * 0.14, H * 0.36, W * 0.44, 4, '#c8c8d0'); for (let k = 0; k < 9; k++) rc(W * 0.14 + k * 6, H * 0.32, 1, 6, '#c8c8d0'); rc(W * 0.12, H * 0.58, W * 0.5, 3, '#f8e8a0'); ci(W * 0.25, H * 0.78, 8, '#222'); ci(W * 0.7, H * 0.78, 8, '#222'); ci(W * 0.37, H * 0.4, 2, r() < 0.5 ? '#ff4a4a' : '#4ab0ff'); }
    else if (sc === 'plaza') { cielo(dia ? '#8ac8f0' : '#ff9a6a', dia ? '#dff0ff' : '#ffe0a0'); rc(0, H * 0.62, W, H * 0.38, '#5aa850'); rc(W * 0.1, H * 0.78, W * 0.8, 4, '#d8c8a0'); for (let k = 0; k < 3; k++) { const x = W * (0.2 + k * 0.3 + r() * 0.05); rc(x - 2, H * 0.4, 4, H * 0.3, '#7a5230'); ci(x, H * 0.34, 14 + r() * 5, '#3f8a3a'); ci(x - 6, H * 0.4, 9, '#4a9a42'); } rc(W * 0.38, H * 0.68, 30, 3, '#8a5a30'); rc(W * 0.38, H * 0.72, 2, 6, '#5a3a20'); rc(W * 0.38 + 28, H * 0.72, 2, 6, '#5a3a20'); }
    else if (sc === 'asado') { cielo('#10182e', '#3a2a4a'); for (let k = 0; k < 14; k++) rc(r() * W, r() * H * 0.4, 1, 1, '#fff'); rc(W * 0.15, H * 0.6, W * 0.7, H * 0.18, '#444'); rc(W * 0.15, H * 0.78, W * 0.7, 4, '#222'); for (let k = 0; k < 14; k++) rc(W * 0.16 + k * 7, H * 0.74 + r() * 3, 5, 3, r() < 0.5 ? '#ff6a2a' : '#c83a1a'); for (let k = 0; k < 4; k++) { rc(W * 0.22 + k * 28, H * 0.56, 20, 6, ['#b8502a', '#e8a060', '#8a3a20'][k % 3]); rc(W * 0.22 + k * 28, H * 0.56, 20, 1, '#f0c090'); } for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(255,170,60,.7)'; g.beginPath(); g.moveTo(W * 0.2 + k * 28, H * 0.74); g.lineTo(W * 0.2 + k * 28 + 5, H * 0.6 - r() * 8); g.lineTo(W * 0.2 + k * 28 + 10, H * 0.74); g.fill(); } }
    const f = (r() * 4) | 0; if (f === 1) { g.globalCompositeOperation = 'multiply'; rc(0, 0, W, H, '#d8b88a'); } else if (f === 2) { g.globalCompositeOperation = 'screen'; rc(0, 0, W, H, '#302830'); } g.globalCompositeOperation = 'source-over'; // 0 normal · 1 sepia · 2 brillante · 3 normal
    const u = c.toDataURL(); FOTOS.set(key, u); return u;
  }
  function cara(sd, sz) { const key = 'cara' + sd + sz, hit = FOTOS.get(key); if (hit) return hit; const c = document.createElement('canvas'); c.width = 16; c.height = 16; const g = c.getContext('2d'), r = rng(sd * 53), rc = (x, y, a, b, col) => { g.fillStyle = col; g.fillRect(x, y, a, b); };
    const piel = ['#f2c8a0', '#e0a878', '#b87a50', '#8a5a38'][(r() * 4) | 0], pelo = ['#2a1a10', '#5a3a20', '#c8a050', '#1a1a1a', '#8a2a1a'][(r() * 5) | 0], fo = ['#3a6ad8', '#d83a6a', '#3aa85a', '#8a5ad8'][(r() * 4) | 0]; rc(0, 0, 16, 16, fo); rc(2, 12, 12, 4, ['#e8e8e8', '#2a2a2a', '#c83a3a'][(r() * 3) | 0]); rc(4, 3, 8, 10, piel); rc(3, 2, 10, 3, pelo); if (r() < 0.5) { rc(3, 2, 2, 9, pelo); rc(11, 2, 2, 9, pelo); } rc(5, 7, 2, 2, '#fff'); rc(9, 7, 2, 2, '#fff'); rc(6, 7, 1, 2, '#111'); rc(10, 7, 1, 2, '#111'); rc(6, 11, 4, 1, '#a03a3a'); const u = c.toDataURL(); FOTOS.set(key, u); return u; }
  function dibujito(sd) { const key = 'dib' + sd, hit = FOTOS.get(key); if (hit) return hit; const c = document.createElement('canvas'); c.width = 16; c.height = 16; const g = c.getContext('2d'), rc = (x, y, a, b, col) => { g.fillStyle = col; g.fillRect(x, y, a, b); }; rc(0, 0, 16, 16, '#ffd8f0'); rc(3, 2, 10, 5, '#5a3ad8'); rc(2, 4, 3, 8, '#5a3ad8'); rc(11, 4, 3, 8, '#5a3ad8'); rc(4, 5, 8, 8, '#ffe0c8'); rc(4, 5, 8, 2, '#5a3ad8'); rc(5, 8, 3, 3, '#2a1a5a'); rc(9, 8, 3, 3, '#2a1a5a'); rc(5, 8, 1, 1, '#fff'); rc(9, 8, 1, 1, '#fff'); rc(7, 12, 2, 1, '#e86a8a'); const u = c.toDataURL(); FOTOS.set(key, u); return u; } // personaje de dibujito original
  const av = (g, sz) => { sz = sz || 26; const st = 'width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;vertical-align:middle;object-fit:cover;image-rendering:pixelated'; if (g[2] === 'cara') return '<img src="' + cara(g[3], sz) + '" style="' + st + '">'; if (g[2] === 'dib') return '<img src="' + dibujito(g[3]) + '" style="' + st + '">'; if (g[2] === 'lago') return '<img src="' + dibuja('lago', g[3], 60, 60) + '" style="' + st + '">'; return g[1]; };
  const COMS = ['Jajaja qué grande', '¡Genial!', 'Ahí voy', 'Pavê, me encantó', 'Qué bueno che', 'Totalmente de acuerdo', 'Mba\'éichapa, ¡qué buena!', '👏👏👏'];
  const sos = { amb: 0 };
  const mias = () => (V.s.tere = V.s.tere || { mis: [], lk: {} });
  function feed() { const r = rng(Math.floor(V.s.min / 1440) * 31 + 7), n = 6, L = [], K = Object.keys(ESC); for (let i = 0; i < n; i++) { const g = GENTE[(r() * GENTE.length) | 0], foto = r() < 0.62; let t, sc = null; if (foto) { sc = K[(r() * K.length) | 0]; t = ESC[sc][(r() * ESC[sc].length) | 0]; } else t = POSTS[(r() * POSTS.length) | 0]; L.push({ id: V.dia + '_' + i, g, t, sc, sd: ((r() * 1000) | 0) + 1, l: 2 + ((r() * 40) | 0), c: r() < 0.5 ? COMS[(r() * COMS.length) | 0] : '', h: (V.s.min % 1440) - ((i * 97) % 600) }); } return L; }
  function reacc(p) { const T = V.s.min - p.min, r = rng(p.min | 0), L = p.img ? COMF : COMS; return { l: Math.min(60, Math.floor(T / 4) + ((r() * 3) | 0) + (p.img ? 5 : 0)), cs: Array.from({ length: Math.min(3, Math.floor(T / 25)) }, (_, i) => { const q = (r() * GENTE.length) | 0; return [GENTE[q], L[(r() * L.length) | 0], q]; }) }; }
  // ---- personalización: fondos, tonos y orden de apps (se guarda en s.cel) ----
  const FONDOS = [['noche', 'Noche', 'linear-gradient(#10182e,#2a1a4a)', 0], ['lapacho', 'Lapacho', 'linear-gradient(#ff8fc0,#8a2f7a)', 8000], ['ykua', 'Ykuá', 'linear-gradient(#1c5a8a,#7fd0e8)', 8000], ['campo', 'Campo', 'linear-gradient(#2f6a2f,#d8c860)', 8000], ['atardecer', 'Atardecer', 'linear-gradient(#ff6b4a,#3a1a5a)', 12000], ['retro', 'Verde retro', 'linear-gradient(#0f380f,#306230)', 5000]];
  const TONOS = [['cl', 'Clásico', 0], ['gu', 'Guarania', 12000], ['cu', 'Cumbia', 12000], ['di', 'Digital', 8000], ['ro', 'Rock', 15000]];
  const cfg = () => (V.s.cel = V.s.cel || { fondo: 'noche', tono: 'cl', fondos: ['noche'], tonos: ['cl'], orden: [] });
  const NOTAS = { cl: [[440, 480]], gu: [[64, 67, 71, 69, 67, 64].map(mf)], cu: [[57, 60, 64, 60].map(mf)], di: [[880, 1175, 880, 1175]], ro: [[82, 98, 82, 123]] };
  function sonarTono(id) { const t = id || cfg().tono, L = NOTAS[t] ? NOTAS[t][0] : NOTAS.cl[0]; L.forEach((f, i) => setTimeout(() => { try { A().tone(f, t === 'cl' ? 0.9 : 0.22, { type: t === 'ro' ? 'sawtooth' : t === 'di' ? 'square' : 'sine', vol: 0.05 }); } catch (e) { /* sin audio */ } }, t === 'cl' ? 0 : i * 240)); }
  // ícono de Dina Run: carita de la gata en pixel art 16×16 (se dibuja una vez y se usa como imagen)
  const iconoDina = (() => { try { const c = document.createElement('canvas'); c.width = 16; c.height = 16; const g = c.getContext('2d'), R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    R(0, 0, 16, 16, '#ff9fcf'); R(0, 12, 16, 4, '#7ad07a'); R(1, 1, 3, 1, '#fff'); R(11, 2, 4, 1, '#fff'); // cielo rosa y pasto
    R(3, 2, 3, 4, '#f09a3a'); R(10, 2, 3, 4, '#f09a3a'); R(4, 3, 1, 2, '#ff7a8a'); R(11, 3, 1, 2, '#ff7a8a'); // orejas
    R(2, 5, 12, 8, '#f09a3a'); R(3, 4, 10, 1, '#f09a3a'); R(3, 13, 10, 1, '#f09a3a'); // cara
    R(4, 5, 1, 2, '#c87820'); R(7, 5, 2, 1, '#c87820'); R(11, 5, 1, 2, '#c87820'); // rayas
    R(4, 7, 3, 3, '#fff'); R(9, 7, 3, 3, '#fff'); R(5, 8, 2, 2, '#222'); R(10, 8, 2, 2, '#222'); R(5, 8, 1, 1, '#fff'); R(10, 8, 1, 1, '#fff'); // ojos
    R(7, 10, 2, 1, '#ff5a7a'); R(7, 11, 1, 1, '#222'); R(8, 11, 1, 1, '#222'); // nariz y boca
    R(0, 10, 3, 1, '#fff'); R(13, 10, 3, 1, '#fff'); R(1, 12, 2, 1, '#fff'); R(13, 12, 2, 1, '#fff'); // bigotes
    R(11, 11, 3, 3, '#e8303a'); R(11, 10, 3, 1, '#3aa83a'); R(12, 12, 1, 1, '#ffe6a0'); // frutilla
    return c.toDataURL(); } catch (e) { return ''; } })();
  const GAMES = [['culebra', '🐍', 'Culebra', '#9bbc0f'], ['tateti', '❌', 'Ta-te-tí', '#ff8a8a'], ['memoria', '🃏', 'Memoria', '#ffd84a'], ['bloques', '🧱', 'Bloques', '#5ac8fa'], ['rebote', '🏓', 'Rebote', '#7fe08a'], ['dinarun', iconoDina ? '<img class="icoPx" src="' + iconoDina + '">' : '🐱', 'Dina Run', '#ff9fcf']];
  let V = null, X0 = null;

  // ---------------- Radio: tres emisoras inventadas, música propia sintetizada (guarania, polca y cumbia) ----------------
  const Radio = VR.Radio = {
    k: null, tm: 0, step: 0, nx: 0, mel: [], linea: '', ORDEN: ['guarania', 'polca', 'cumbia', 'rock', 'noti'],
    E: {
      guarania: { fm: '98.1', n: 'Ñandutí FM', d: 'Guaranias: arpegios lentos de guitarra', sd: 0.36, len: 6, sc: [57, 59, 60, 62, 64, 65, 68, 69, 72],
        prog: [[45, [57, 60, 64]], [50, [57, 62, 65]], [52, [56, 59, 64]], [45, [57, 60, 64]], [48, [55, 60, 64]], [43, [55, 59, 62]], [52, [56, 59, 64]], [45, [57, 60, 64]]] },
      polca: { fm: '91.5', n: 'Polca Pyahu', d: 'Polcas rápidas y alegres', sd: 0.165, len: 6, sc: [60, 62, 64, 67, 69, 72, 74, 76],
        prog: [[48, [60, 64, 67]], [43, [59, 62, 67]], [48, [60, 64, 67]], [43, [59, 62, 67]], [48, [60, 64, 67]], [41, [57, 60, 65]], [43, [59, 62, 67]], [48, [60, 64, 67]]] },
      cumbia: { fm: '104.7', n: 'Cumbia del Ykuá', d: 'Cumbia bailable', sd: 0.163, len: 16, sc: [69, 72, 74, 76, 79, 81],
        prog: [[45, [57, 60, 64]], [45, [57, 60, 64]], [50, [57, 62, 65]], [52, [56, 59, 64]]] },
      rock: { fm: '99.3', n: 'La Poderosa', d: 'Rock con guitarras pesadas', sd: 0.14, len: 16, sc: [64, 67, 69, 71, 74, 76],
        prog: [[40, [52, 59]], [40, [52, 59]], [45, [57, 64]], [43, [55, 62]]] },
      noti: { fm: '88.3', n: 'Radio Villarrica · Noticias', d: 'Noticiero con locutor y publicidades', sd: 0.5, len: 16, sc: [60, 64, 67], prog: [[48, [60, 64, 67]], [53, [57, 60, 65]], [55, [59, 62, 67]], [48, [60, 64, 67]]] },
    },
    // publicidades locales (inventadas) que lee el locutor del noticiero
    ADS: ['Chipería Doña Chela: la chipa más rica de la plaza, calentita todos los días.', 'Heladería Marimer: el helado que combina con el calor de Villarrica.', 'Ao Porã, ropa y peluquería: lucí bien y usá casco.',
      'Mbohasa: pedí tu viaje desde el celular y viajá seguro.', 'Ñembo\'u: tu comida en la puerta, sin moverte de casa.', 'Bomberos voluntarios: tu colecta salva vidas.', 'Taller del barrio: revisión gratis de frenos esta semana.', 'Parrilla La Fogata: asado con mandioca, el mejor plan del sábado.'],
    voz(txt) { try { if (!window.speechSynthesis || !A().on) return; const u = new SpeechSynthesisUtterance(txt), vs = speechSynthesis.getVoices(), v = vs.find((q) => /^es[-_](PY|AR|419|MX|US)/i.test(q.lang)) || vs.find((q) => /^es/i.test(q.lang)); if (v) u.voice = v; u.lang = v ? v.lang : 'es-ES'; u.rate = 0.98; u.volume = Math.min(1, A().vol + 0.2); speechSynthesis.speak(u); } catch (e) { /* sin voz */ } },
    locutor() { const h = V ? V.hhmm : ''; const L = this.cola && this.cola.length ? this.cola : (this.cola = ['Radio Villarrica, las noticias de las ' + h + '.'].concat(noticias().slice(0, 4), [this.ADS[(Math.random() * this.ADS.length) | 0]]));
      const t = L.shift(); this.linea = t; this.voz(t); },
    // melodía de un compás: camina por la escala cerca de la nota más alta del acorde; es la misma cada vez que vuelve el compás (la música «gira»)
    compas(E, bar, hook) {
      const r = rng(bar * 131 + (this.k.length * 17) + (hook ? 7 : 0) + (this.off || 0) * 977), ch = E.prog[bar % E.prog.length][1]; let i = Math.max(0, E.sc.findIndex((n) => n >= ch[2])); this.mel = [];
      for (let j = 0; j < E.len; j++) { const a = r(), b = r(); i = Math.max(0, Math.min(E.sc.length - 1, i + (b < 0.33 ? -1 : b > 0.66 ? 1 : 0))); this.mel.push(a < (this.k === 'polca' ? 0.9 : this.k === 'cumbia' ? 0.45 : this.k === 'rock' ? 0.5 : 0.62) ? E.sc[i] : null); }
    },
    play(E, step, at) {
      const T = (f, d, o) => A().tone(f, d, Object.assign({ at }, o)), bar = Math.floor(step / E.len), i = step % E.len, [root, ch] = E.prog[bar % E.prog.length], sd = E.sd;
      if (i === 0) this.compas(E, bar, this.k === 'cumbia' && bar % 2 === 1);
      const mel = this.k === 'noti' ? null : this.mel[i];
      if (this.k === 'guarania') {
        if (i === 0) T(mf(root), sd * 5, { type: 'triangle', vol: 0.07, lp: 900 });
        if (i === 2 || i === 4) ch.forEach((n, q) => T(mf(n), sd * 1.9, { type: 'triangle', vol: 0.032, lp: 1800, at: at + q * 0.035 }));
        if (mel) { T(mf(mel), sd * 1.6, { type: 'sine', vol: 0.05 }); T(mf(mel + 12), sd * 0.8, { type: 'triangle', vol: 0.012, lp: 2600 }); }
      } else if (this.k === 'polca') {
        if (i === 0) T(mf(root), sd * 1.6, { type: 'triangle', vol: 0.08, lp: 800 }); if (i === 3) T(mf(root + 7), sd * 1.6, { type: 'triangle', vol: 0.07, lp: 800 });
        if (i === 1 || i === 2 || i === 4 || i === 5) ch.forEach((n) => T(mf(n), sd * 0.7, { type: 'square', vol: 0.011, lp: 1500 }));
        if (mel) T(mf(mel), sd * 0.9, { type: 'triangle', vol: 0.055, lp: 3200 });
      } else if (this.k === 'rock') {
        if (i === 0 || i === 6 || i === 8 || i === 10) T(80, 0.14, { type: 'sine', vol: 0.12, f2: 40 }); if (i === 4 || i === 12) A().noise(0.13, { vol: 0.07, lp: 4500, hp: 900, at }); if (i % 2 === 0) A().noise(0.03, { vol: 0.02, lp: 9000, hp: 6500, at });
        if (i % 2 === 0) T(mf(root + 12), sd * 1.6, { type: 'sawtooth', vol: 0.04, lp: 1100 }); if (i === 0 || i === 8) ch.forEach((n) => T(mf(n), sd * 6, { type: 'sawtooth', vol: 0.03, lp: 1500 }));
        if (mel) T(mf(mel), sd * 2.2, { type: 'square', vol: 0.028, lp: 2600 });
      } else if (this.k === 'noti') {
        if (i === 0) { ch.forEach((n, q) => T(mf(n), sd * 6, { type: 'sine', vol: 0.02, at: at + q * 0.02 })); if (step % 64 === 0) { [72, 76, 79, 84].forEach((n, q) => T(mf(n), 0.18, { type: 'triangle', vol: 0.05, at: at + q * 0.14 })); } }
        if (step % 48 === 8) this.locutor();
      } else {
        if (i % 4 === 0) T(90, 0.12, { type: 'sine', vol: 0.09, f2: 50 });
        if (i % 2 === 0) A().noise(0.04, { vol: i % 4 === 2 ? 0.035 : 0.02, lp: 9000, hp: 5000, at }); if (i % 4 === 3) A().noise(0.03, { vol: 0.018, lp: 9000, hp: 6000, at });
        if (i === 0 || i === 6 || i === 8 || i === 11) T(mf(root + (i === 6 ? 7 : i === 11 ? 12 : 0)), sd * 2.4, { type: 'triangle', vol: 0.08, lp: 700 });
        if (i % 4 === 2) ch.forEach((n) => T(mf(n), sd * 1.5, { type: 'square', vol: 0.016, lp: 1400 }));
        if (mel) T(mf(mel), sd * 1.8, { type: 'square', vol: 0.03, lp: 2200 });
      }
    },
    sched() { const a = A(), ac = a.ctx(); if (!ac || !this.k) return; const E = this.E[this.k]; if (this.nx < ac.currentTime) this.nx = ac.currentTime + 0.05;
      while (this.nx < ac.currentTime + 0.3) { this.play(E, this.step, this.nx - ac.currentTime); this.step++; this.nx += E.sd; } },
    set(k, off) { clearInterval(this.tm); this.off = off || 0; try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* sin voz */ } this.cola = null; this.linea = ''; this.k = k || null; this.step = 0; this.nx = 0; try { VR.store.set('radio', this.k || ''); } catch (e) { /* sin guardado */ }
      if (this.k) { A().noise(0.35, { vol: 0.05, lp: 5000, hp: 1200 }); this.tm = setInterval(() => this.sched(), 70); } },
    sig() { const i = this.k ? this.ORDEN.indexOf(this.k) : -1, n = i + 1 < this.ORDEN.length ? this.ORDEN[i + 1] : null; this.set(n); const E = n && this.E[n];
      if (VR.toast) VR.toast(E ? '📻 ' + E.fm + ' FM · ' + E.n : '📻 Radio apagada'); },
  };

  // ---------------- Alarma ----------------
  const alarmas = () => V.s.alarmas || (V.s.alarmas = []), LBL = ['Despertar', 'Misión', 'Pagar la pieza', 'Vender chipa', 'Cita con Kike', 'Alarma'];
  let ring = null, last = 0;
  function suena(a) {
    if (ring) return; const ov = document.createElement('div'); ov.className = 'alOv'; ov.innerHTML = '<b>⏰ ' + hm(a.m) + '</b><span>' + X0.esc(a.lbl) + '</span><div><button data-p>Posponer 5 min</button><button data-s>Parar</button></div>'; document.body.append(ov);
    const beep = () => { for (let q = 0; q < 3; q++) A().tone(1175, 0.1, { type: 'square', vol: 0.06, at: q * 0.16 }); try { if (navigator.vibrate) navigator.vibrate([120, 80, 120]); } catch (e) { /* sin vibración */ } };
    beep(); const iv = setInterval(beep, 1100), parar = () => { clearInterval(iv); clearTimeout(to); ov.remove(); ring = null; }, to = setTimeout(parar, 30000);
    ov.querySelector('[data-s]').onclick = parar; ov.querySelector('[data-p]').onclick = () => { alarmas().push({ m: (a.m + 5) % 1440, lbl: a.lbl, on: true, tmp: true }); V.save(); parar(); }; ring = { parar };
  }
  // ---------------- Delivery (Ñembo'u) ----------------
  const ENVIO = 5000, LOCALES = [
    { id: 'chela', n: 'Chipería Doña Chela', ico: '🥐', it: [['chipa', 'Chipa', 5000, '🥐', 12], ['mbeju', 'Mbejú', 7000, '🥞', 15], ['empa', 'Empanada', 6000, '🥟', 14]] },
    { id: 'chespis', n: 'Chespis', ico: '🍔', it: [['hamb', 'Hamburguesa', 25000, '🍔', 30], ['lomi', 'Lomito', 32000, '🥪', 34], ['gas', 'Gaseosa', 8000, '🥤', 4]] },
    { id: 'marimer', n: 'Heladería Marimer', ico: '🍦', it: [['helado', 'Helado', 10000, '🍦', 8], ['kilo', 'Helado de 1 kilo', 45000, '🍨', 30]] },
    { id: 'parri', n: 'Parrilla La Fogata', ico: '🥩', it: [['asado', 'Asado con mandioca', 45000, '🥩', 40], ['sopa', 'Sopa paraguaya', 12000, '🍰', 16], ['tere', 'Tereré para llevar', 9000, '🧉', 6]] },
  ];
  let cart = {};
  const pedidos = () => V.s.pedidos || (V.s.pedidos = []);
  // el pedido llega cuando se cumple la hora; si hay camino, un repartidor en moto sale de una esquina y te lo trae (VR.Reparto); si no, te lo dejan en la puerta
  function dar(p, enMano) {
    V.s.pedidos = pedidos().filter((q) => q !== p);
    for (const it of p.it) VR.Inv.add({ k: 'comida:' + it.k, n: it.n, ico: it.ico, tipo: 'comida', h: it.h, cu: 0 }, it.c);
    VR.Buzon.add('sis', '🛵 Tu pedido de ' + p.n + (enMano ? ' llegó: el repartidor te lo dio en mano.' : ' llegó: te lo dejaron en la puerta de tu pieza.') + ' Está en la mochila.', V, null, true);
    if (VR.toast) VR.toast('🛵 ¡Llegó tu pedido de ' + p.n + '! Mirá la mochila'); try { A().coin(); } catch (e) { /* sin audio */ } V.save();
  }
  const puedeRepartir = () => !document.body.classList.contains('adentro') && !(VR.pieza && VR.pieza.on);
  function entregas() {
    const P = pedidos(); if (!P.length) return; const due = P.filter((p) => p.t <= V.s.min); if (!due.length) return; const R = VR.reparto;
    for (const p of due) {
      if (p.rep) continue; // ya hay un repartidor en camino con éste
      if (!R || !puedeRepartir()) { dar(p, false); continue; }
      if (R.r || R.pend) { if (p.espera === undefined) p.espera = V.s.min; if (V.s.min - p.espera > 20) dar(p, false); continue; } // otro repartidor está en la calle
      if (R.salir(p)) p.rep = 1; else dar(p, false);
    }
  }
  // ---------------- Noticias ----------------
  const POOL = ['Vecinos piden más semáforos y cebras en las avenidas del Centro', 'La chipa a 5.000 Gs.: los clientes dicen que «ya está cara», las vendedoras que la harina subió',
    'Colectivos del Centro con demoras por el tránsito de la hora pico', 'Bomberos voluntarios invitan a la colecta solidaria de este mes', 'Feria artesanal frente a la Catedral: se vende ñandutí y cerámica',
    'Parque Ykuá: los cisnes ya tienen crías y la gente se junta a mirarlas', 'Mbohasa suma conductores: ahora hay autos más rápidos y más tranquilos', 'Jornada de adopción: perritos de la calle buscan casa',
    'Ofertas del súper: yerba y tereré al 2x1 este fin de semana', 'Noche movida en el Centro: los boliches abren hasta tarde el sábado', 'Policía recuerda: sin casco, la multa es de 1.287.847 Gs. (11 jornales)',
    'Arreglan baches de la ruta: pedimos paciencia y que no corran', 'Escuelas y colegios: empiezan los ensayos del acto patrio', 'El Hospital Regional atiende gratis las dos primeras visitas, recuerdan',
    'Taller mecánico del barrio ofrece revisión gratis de frenos', 'Se juntan firmas para una plaza más con sombra en Santa Lucía'];
  function noticias() {
    const s = V.s, S = (k) => VR.Stats.get(k), C = VR.clima && VR.clima.f || {}, din = [];
    if (C.lluvia > 0.3) din.push('Lluvia en Villarrica: calles anegadas en Santa Lucía y tránsito lento'); else if (C.calor > 0.6) din.push('Calor fuerte: recomiendan tereré fresco y buscar la sombra'); else if (C.frio > 0.6) din.push('Frío en la ciudad: sacá el poncho y abrigate para salir temprano');
    if (S('atropellado')) din.push('Peatón atropellado en el Centro: quedó internado y fuera de peligro'); if (S('peatones')) din.push('Alerta vecinal: un conductor imprudente atropelló a varios peatones y la Policía lo busca');
    if (S('multas')) din.push('Operativo de tránsito: multan a motociclistas que andaban sin casco'); if (S('comisaria')) din.push('Jornada movida en la Comisaría: varias personas demoradas por disturbios');
    if (S('desmayos')) din.push('Un joven se desmayó de hambre en la calle: piden que nadie salga sin desayunar');
    const r = rng(Math.floor(s.min / 1440) + 99), pool = POOL.slice(), out = din.slice(0, 3); while (out.length < 6 && pool.length) out.push(pool.splice((r() * pool.length) | 0, 1)[0]); return out;
  }
  // ---------------- Clima ----------------
  const URL7 = 'https://api.open-meteo.com/v1/forecast?latitude=-25.75&longitude=-56.43&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=America%2FAsuncion&forecast_days=7';
  const TIP = [[33, 21], [32, 21], [30, 19], [27, 16], [23, 12], [20, 9], [20, 9], [23, 10], [26, 13], [28, 16], [30, 18], [32, 20]], DS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const icon = (c) => (c >= 95 ? '⛈' : (c >= 51 && c <= 67) || (c >= 80 && c <= 82) ? '🌧' : c >= 45 && c <= 48 ? '🌫' : c === 3 ? '☁️' : c >= 1 ? '🌤' : '☀️');
  let SEM = null, semLoad = false;
  function semana(X) {
    if (SEM !== null || semLoad) return; try { const c = JSON.parse(VR.store.get('climaSem', 'null')); if (c && c.d && Date.now() - c.t < 3 * 3600e3) { SEM = c.d; return; } } catch (e) { /* sin caché */ }
    semLoad = true; fetch(URL7).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((j) => { const d = j.daily; SEM = d.time.map((t, i) => ({ t, mx: Math.round(d.temperature_2m_max[i]), mn: Math.round(d.temperature_2m_min[i]), ll: d.precipitation_probability_max[i], c: d.weather_code[i] }));
      VR.store.set('climaSem', JSON.stringify({ t: Date.now(), d: SEM })); }).catch(() => { SEM = false; }).finally(() => { semLoad = false; if (X.app() === 'clima') X.paint(); });
  }
  // ---------------- llamadas ----------------
  let call = null, rt = [], inc = null; const HOLA = { kike: '¡Ey, {hermano|hermana}! ¿Qué necesitás?', ramona: 'Hola, {hijo|hija}. ¿Todo bien con la pieza?', chela: 'Mba’éichapa, ¿querés chipa?', lucas: 'Marimer, buenas. ¿Qué le sirvo?', mirta: 'Ao Porã, buenas. ¿En qué le ayudo?', benitez: 'Bomberos voluntarios, dígame.' };

  // llamada entrante (19/11/2026): un contacto con un recordatorio a veces llama en vez de escribir. Suena 14 s; si no atendés queda la llamada perdida
  // y el mensaje sin leer. Al atender se abre el celular en la llamada y su primera frase es el mismo mensaje. Solo con saldo y con el juego andando.
  function entrante(id, txt, prob) {
    const c = VR.CONTACTOS[id]; if (!c || !V || inc || call || !(V.s.saldo > 0) || (prob !== undefined && Math.random() > prob)) return false;
    if (VR.loop.paused || document.querySelector('dialog[open]') || (VR.Dialogo && VR.Dialogo.abierto)) return false;
    const ov = document.createElement('div'); ov.className = 'inOv'; ov.innerHTML = '<i class="chAv">' + c[1] + '</i><div><b>' + X0.esc(c[0]) + '</b><span>📞 te está llamando…</span></div><button class="no" data-no title="Rechazar">📵</button><button class="si" data-si title="Atender">📞</button>'; document.body.append(ov);
    const ring = () => { sonarTono(); try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) { /* sin vibración */ } };
    const fin = () => { clearInterval(iv); clearTimeout(to); ov.remove(); inc = null; }; ring(); const iv = setInterval(ring, 2200), to = setTimeout(() => { fin(); X0.toast('📵 Llamada perdida de ' + c[0]); }, 14000);
    ov.querySelector('[data-no]').onclick = fin; ov.querySelector('[data-si]').onclick = () => { fin(); X0.B.leerDe(id); call = { id, st: 'on', yo: '', resp: '', hola: txt }; A().blip(); X0.cel('call:' + id); };
    inc = { fin }; return true;
  }
  const has = (k) => typeof k === 'string' && (APPS.some((a) => a[0] === k) || k.startsWith('tere') || k === 'juegos' || k.startsWith('call:') || k.startsWith('deliv:') || GAMES.some((g) => g[0] === k && k !== 'culebra'));
  const bar = (v, c) => '<div class="sBar"><i style="width:' + Math.max(0, Math.min(100, v)) + '%;background:' + c + '"></i></div>';

  function html(k, X) {
    const { vida: v, esc, gs } = X, s = v.s; let h = '';
    if (k === 'alarma') {
      const L = alarmas(); h = '<h3>⏰ Alarma</h3><p>Suena con la hora del juego (ahora son las ' + v.hhmm + ').</p>' +
        L.map((a, i) => '<div class="alRow"><input type="time" data-al="' + i + '" value="' + hm(a.m) + '"><select data-alb="' + i + '">' + LBL.map((l) => '<option' + (l === a.lbl ? ' selected' : '') + '>' + l + '</option>').join('') + '</select><button data-alt="' + i + '" title="Activar">' + (a.on ? '🔔' : '🔕') + '</button><button data-ald="' + i + '" title="Borrar">🗑</button></div>').join('') +
        (L.length ? '' : '<p>No tenés alarmas. Poné una para no llegar tarde a la misión o al cobro de la pieza.</p>') + '<button class="cbtn" data-aln>➕ Nueva alarma</button>';
    } else if (k === 'radio') {
      const E = Radio.E, on = Radio.k && E[Radio.k]; h = '<h3>📻 Radio</h3><div class="rdDial"><b>' + (on ? on.fm + ' FM' : '— apagada —') + '</b><span>' + (on ? on.n : 'Elegí una emisora') + '</span>' + (Radio.linea ? '<em class="rdLin">🎙 ' + esc(Radio.linea) + '</em>' : '') + '<div class="rdBars' + (on ? ' on' : '') + '"><i></i><i></i><i></i><i></i><i></i></div></div>' +
        Radio.ORDEN.map((q) => '<button class="cbtn opc" data-rd="' + q + '"><span class="oi">📻</span><span class="ot"><b>' + E[q].fm + ' · ' + E[q].n + '</b><small>' + E[q].d + '</small></span><span class="op">' + (Radio.k === q ? '🔊' : '▶') + '</span></button>').join('') +
        (on ? '<button class="cbtn sec" data-rd="">⏹ Apagar</button>' : '') + '<p>Sigue sonando mientras jugás. Con el auto o la moto, la tecla R cambia de emisora.</p>';
    } else if (k === 'clima') {
      const C = VR.clima, d = C.data, f = C.f, now = d && typeof d.temp === 'number' ? Math.round(d.temp) + '°' : (TIP[new Date().getMonth()][0] - 4) + '°';
      const ic = f.lluvia > 0.3 ? '🌧' : f.nube > 0.8 ? '☁️' : f.calor > 0.6 ? '☀️' : f.nube > 0.4 ? '🌤' : f.frio > 0.5 ? '🥶' : '🌤';
      h = '<h3>🌤 Clima</h3><div class="clNow"><i>' + ic + '</i><b>' + now + '</b><span>' + esc(C.label || 'Villarrica') + (d && typeof d.viento === 'number' ? ' · viento ' + Math.round(d.viento) + ' km/h' : '') + '</span></div>';
      const r = d && C.hm(d.rise), st = d && C.hm(d.set), fh = (x) => Math.floor(x) + ':' + pad(Math.round((x % 1) * 60)); if (r && st) h += '<p>🌅 Sale el sol a las ' + fh(r) + ' · 🌇 se pone a las ' + fh(st) + '</p>';
      semana(X); h += '<h4>Próximos 7 días</h4>';
      if (SEM) h += SEM.map((q, i) => '<div class="clDia"><span>' + (i ? DS[new Date(q.t + 'T12:00').getDay()] : 'Hoy') + '</span><i>' + icon(q.c) + '</i><small>💧 ' + (q.ll == null ? '—' : q.ll + '%') + '</small><b>' + q.mx + '° <em>' + q.mn + '°</em></b></div>').join('');
      else if (SEM === null) h += '<p>Buscando el pronóstico…</p>'; else { const [mx, mn] = TIP[new Date().getMonth()]; h += '<p>Sin internet: clima típico de esta época.</p><div class="clDia"><span>Hoy</span><i>🌤</i><small></small><b>' + mx + '° <em>' + mn + '°</em></b></div>'; }
      h += '<p style="font-size:11px">Pronóstico real de Villarrica (Open-Meteo). El clima del juego puede ser fijo desde el menú.</p>';
    } else if (k === 'noti') {
      h = '<h3>📰 Villarrica Hoy</h3><p>Edición del ' + v.diaSemana + ' · día ' + v.dia + '</p>' + noticias().map((t, i) => '<div class="noti' + (i === 0 ? ' top' : '') + '"><b>' + esc(t) + '</b></div>').join('');
    } else if (k === 'deliv') {
      h = "<h3>🍔 Ñembo'u</h3><p>Pedí comida y te la dejan en la mochila (se paga con la billetera electrónica: tenés " + gs(s.banco) + '). Envío ' + gs(ENVIO) + '.</p>';
      const P = pedidos(); if (P.length) h += '<h4>🛵 En camino</h4>' + P.map((p) => '<div class="row2"><span>' + esc(p.n) + '</span><b>~' + Math.max(1, Math.round(p.t - s.min)) + ' min</b></div>').join('');
      h += LOCALES.map((l) => '<button class="cbtn opc" data-a="deliv:' + l.id + '"><span class="oi">' + l.ico + '</span><span class="ot"><b>' + esc(l.n) + '</b><small>' + l.it.map((q) => q[1]).join(' · ') + '</small></span></button>').join('');
    } else if (k.startsWith('deliv:')) {
      const l = LOCALES.find((q) => q.id === k.slice(6)); if (!l) return '<p>No existe ese local.</p>'; let tot = 0, cant = 0;
      h = '<h3>' + l.ico + ' ' + esc(l.n) + '</h3>' + l.it.map((q) => { const c = cart[q[0]] || 0; tot += c * q[2]; cant += c;
        return '<div class="row2"><span>' + q[3] + ' ' + q[1] + '<br><small style="color:#9ab">' + gs(q[2]) + ' · +' + q[4] + '% de hambre</small></span><span class="stp"><button data-dm="' + q[0] + '">−</button><b>' + c + '</b><button data-dp="' + q[0] + '">+</button></span></div>'; }).join('');
      const tt = tot + ENVIO; h += '<button class="cbtn" data-dpd="' + l.id + '"' + (!cant || s.banco < tt ? ' disabled' : '') + '>' + (cant ? 'Pedir · ' + gs(tt) : 'Elegí algo') + '</button><button class="cbtn sec" data-a="deliv">⬅ Volver</button>';
    } else if (k === 'salud') {
      const hp = VR.getHp ? VR.getHp() : 100, ham = s.hambre, gasto = s.mov.filter((m) => m[2] < 0 && m[0] === v.dia).reduce((a, m) => a - m[2], 0);
      h = '<h3>❤️ Salud</h3><div class="row2"><span>❤ Vida</span><b>' + Math.round(hp) + '%</b></div>' + bar(hp, hp < 35 ? '#ff5a5a' : '#6fe08a') + '<div class="row2"><span>🍽 Hambre</span><b>' + Math.round(ham) + '/100</b></div>' + bar(ham, ham < 30 ? '#ff9a3a' : '#ffd84a') +
        '<div class="row2"><span>📶 Saldo</span><b>' + (s.saldo > 0 ? Math.ceil(s.saldo) + ' días' : 'sin saldo') + '</b></div><div class="row2"><span>💸 Gastado hoy</span><b>' + gs(gasto) + '</b></div>' + (v.deudaTotal() > 0 ? '<div class="row2" style="color:#ff8a7a"><span>⚠ Deudas</span><b>' + gs(v.deudaTotal()) + '</b></div>' : '') +
        '<p>' + (ham < 30 ? '🍽 Tenés hambre: comé algo de la mochila o pedí en Ñembo\'u.' : hp < 50 ? '🩹 Andá más despacio: la vida baja con los golpes y se recupera sola. El hospital es el último recurso.' : '✔ Estás bien. Seguí así.') + '</p>' +
        (ham < 50 ? '<button class="cbtn" data-a="deliv">🍔 Pedir comida</button>' : '');
    } else if (k === 'tere') {
      const M = mias(), hm2 = (m) => { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(Math.floor(m % 60)); }, nDM = sinLeerDM();
      h = '<h3>🧉 Tereré</h3><div class="tpub"><input id="tePub" maxlength="120" placeholder="¿Qué estás pensando, che?"><button class="mini" data-tpub>Publicar</button></div><div class="tpub"><button class="mini" data-a="tere:foto">📷 Con una foto</button><button class="mini" data-a="tere:dms">💬 Mensajes' + (nDM ? ' (' + nDM + ')' : '') + '</button></div>';
      for (const p of M.mis.slice().reverse().slice(0, 6)) { const R = reacc(p); h += '<div class="tpost yo"><b>🙂 Vos</b> <small>' + hm2(p.min) + '</small><p>' + esc(p.t) + '</p>' + (p.img ? '<img class="tfoto" style="image-rendering:auto" src="' + p.img + '">' : '') + '<small>👍 ' + R.l + (R.cs.length ? ' · 💬 ' + R.cs.length : '') + '</small>' + R.cs.map((q) => '<div class="tcom"><b>' + av(q[0], 16) + ' ' + q[0][0] + ':</b> ' + esc(q[1]) + '</div>').join('') + '</div>'; }
      const fd = feed(); for (let q = 0; q < fd.length; q++) { const p = fd[q], me = M.lk[p.id], gi = GENTE.indexOf(p.g); h += '<div class="tpost"><b>' + av(p.g) + ' ' + p.g[0] + '</b> <small>' + hm2(p.h) + '</small><p>' + esc(p.t) + '</p>' + (p.sc ? '<img class="tfoto" src="' + dibuja(p.sc, p.sd, 120, 75) + '">' : '') + '<small><button class="mini" data-tlk="' + p.id + '">' + (me ? '👍 Te gusta' : '👍 Me gusta') + '</button> <button class="mini" data-a="tere:' + gi + '">💬</button> ' + (p.l + (me ? 1 : 0)) + '</small>' + (p.c ? '<div class="tcom"><b>💬</b> ' + esc(p.c) + '</div>' : '') + '</div>'; }
    } else if (k === 'tere:foto') {
      const L = VR.Fotos ? VR.Fotos.list() : [];
      h = '<h3>📷 Foto para Tereré</h3>' + (L.length ? '<p>Elegí una foto de tu galería:</p><div class="gal">' + L.map((f, i) => '<img data-tph="' + i + '" src="' + f.u + '">').join('') + '</div>' : '<p>Todavía no sacaste fotos. Abrí la 📷 Cámara (probá la selfie) y volvé.</p>') + '<button class="cbtn sec" data-a="tere">⬅ Volver</button>';
    } else if (k === 'tere:dms') {
      const D = dms(), ids = Object.keys(D).filter((q) => D[q].m.length);
      h = '<h3>💬 Mensajes de Tereré</h3>' + (ids.length ? ids.map((q) => { const g = GENTE[+q], u = D[q].m[D[q].m.length - 1]; return '<button class="cbtn sec" data-a="tere:' + q + '" style="text-align:left">' + av(g, 20) + ' <b>' + g[0] + '</b>' + (D[q].un ? ' 🔴' : '') + '<br><small>' + esc(u.t.slice(0, 50)) + '</small></button>'; }).join('') : '<p>No tenés conversaciones. Tocá el 💬 de una publicación para escribirle a alguien.</p>') + '<button class="cbtn sec" data-a="tere">⬅ Volver</button>';
    } else if (/^tere:\d+$/.test(k)) {
      const gi = +k.slice(5), g = GENTE[gi]; if (!g) return '<p>No existe.</p>'; const D = dms(), d = D[gi] || { m: [] }; if (D[gi]) D[gi].un = false;
      h = '<h3>' + av(g, 24) + ' ' + g[0] + '</h3><div class="dmBox">' + (d.m.length ? d.m.map((m) => '<div class="bub ' + (m.de === 'yo' ? 'yo' : 'el') + '">' + esc(m.t) + '</div>').join('') : '<p>Escribile algo:</p>') + '</div><div class="chRep">' + MEDM.map((t, q) => '<button class="rep" data-tdm="' + gi + ':' + q + '">' + esc(t) + '</button>').join('') + '</div><button class="cbtn sec" data-a="tere:dms">⬅ Mensajes</button>';
    } else if (k === 'calc') {
      const T = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', ',', '=']; 
      h = '<h3>🧮 Calculadora</h3><div class="calcD">' + esc(calc.d) + '</div><div class="calcG">' + T.map((t) => '<button class="ck' + (/[÷×−+=]/.test(t) ? ' op' : '') + (t === '0' ? ' z' : '') + '" data-ck="' + t + '">' + t + '</button>').join('') + '</div>';
    } else if (k === 'notas') {
      h = '<h3>📝 Notas</h3><textarea id="notaTx" class="notaTx" placeholder="Anotá lo que quieras: precios, direcciones, deudas…">' + esc(cfg().nota || '') + '</textarea><p style="font-size:11px">Se guarda solo.</p>';
    } else if (k === 'crono') {
      if (!tiene('crono')) return '<p>Esta app se compra en la 🛍 Tienda de apps.</p><button class="cbtn" data-a="tienda">🛍 Ir a la tienda</button>';
      const resta = cr.tmr ? Math.max(0, cr.tmrEnd - Date.now()) : 0;
      h = '<h3>⏱ Cronómetro</h3><div class="calcD" id="crD">' + hms(crT()) + '</div><div class="tpub"><button class="mini" data-cr="go">' + (cr.run ? '⏸ Pausa' : '▶ Iniciar') + '</button><button class="mini" data-cr="lap"' + (cr.run ? '' : ' disabled') + '>🏁 Vuelta</button><button class="mini" data-cr="rst">↺ Reiniciar</button></div>' + cr.vueltas.slice().reverse().slice(0, 5).map((v2, q) => '<div class="row2"><span>Vuelta ' + (cr.vueltas.length - q) + '</span><b>' + hms(v2) + '</b></div>').join('') +
        '<h4>⏳ Temporizador</h4><div class="calcD" id="tmD">' + (cr.tmr ? hms(resta) : pad(cr.tmrMin) + ':00.00') + '</div><div class="tpub"><button class="mini" data-tm="-1">−1 min</button><button class="mini" data-tm="1">+1 min</button><button class="mini" data-tm="go">' + (cr.tmr ? '⏹ Cancelar' : '▶ Empezar') + '</button></div>';
    } else if (k === 'musica') {
      if (!tiene('musica')) return '<p>Esta app se compra en la 🛍 Tienda de apps.</p><button class="cbtn" data-a="tienda">🛍 Ir a la tienda</button>';
      const on = pista >= 0 && Radio.k;
      h = '<h3>🎧 Música</h3><div class="row2"><span>' + (on ? '🎵 ' + PISTAS[pista][0] : 'Elegí una pista') + '</span><span><button class="mini" data-mu="prev">⏮</button> <button class="mini" data-mu="stop">' + (on ? '⏹' : '▶') + '</button> <button class="mini" data-mu="next">⏭</button></span></div>' + PISTAS.map((q, i) => '<button class="cbtn sec" data-mu="' + i + '" style="text-align:left">' + (on && pista === i ? '🔊 ' : '🎵 ') + q[0] + ' <small>· ' + q[1] + '</small></button>').join('') + '<p style="font-size:11px">Sintetizada en el momento, todo original.</p>';
    } else if (k === 'banco') {
      if (!tiene('banco')) return '<p>Esta app se compra en la 🛍 Tienda de apps.</p><button class="cbtn" data-a="tienda">🛍 Ir a la tienda</button>';
      const c = cfgA(), d = V.dia - c.ahDia; if (d > 0 && c.ahorro > 0) { c.ahorro = Math.round(c.ahorro * Math.pow(1.01, d)); } c.ahDia = V.dia;
      h = '<h3>💰 Banco+</h3><div class="row2"><span>🏦 Billetera electrónica</span><b>' + gs(s.banco) + '</b></div><div class="row2"><span>🐷 Caja de ahorro (1 % por día)</span><b>' + gs(c.ahorro) + '</b></div><div class="tpub"><button class="mini" data-ah="10000">+10.000</button><button class="mini" data-ah="50000">+50.000</button><button class="mini" data-ah="todo">Depositar todo</button><button class="mini" data-ah="ret">Retirar</button></div>' +
        '<div class="row2"><span>💳 Deuda total</span><b>' + gs(v.deudaTotal()) + '</b></div><h4>Últimos movimientos</h4>' + s.mov.slice(0, 12).map((m) => '<div class="row2"><span>' + esc(m[3]) + '</span><span style="color:' + (m[2] < 0 ? '#ff8a7a' : '#9fe0a0') + '">' + (m[2] > 0 ? '+' : '') + gs(m[2]) + '</span></div>').join('') + '<p style="font-size:11px">Los préstamos se piden en la 🏦 Billetera.</p>';
    } else if (k === 'tienda') {
      const c = cfgA();
      h = '<h3>🛍 Tienda de apps</h3><p>Apps extra para tu celular. Se pagan con la billetera electrónica (tenés ' + gs(s.banco) + ').</p>' + Object.keys(PREMIUM).map((a) => { const A2 = APPS.find((q) => q[0] === a); return '<div class="row2"><span>' + A2[1] + ' ' + A2[2] + '</span>' + (c.apps.includes(a) ? '<b>✔ Instalada</b>' : '<button class="mini" data-bapp="' + a + '"' + (s.banco < PREMIUM[a] ? ' disabled' : '') + '>Comprar ' + gs(PREMIUM[a]) + '</button>') + '</div>'; }).join('');
    } else if (k === 'sos') {
      const hp = VR.getHp ? VR.getHp() : 100;
      h = '<h3>🆘 Emergencia</h3><p>Pedí ayuda. Hace falta saldo para llamar.</p><button class="cbtn" data-sos="amb"' + (hp >= 100 ? ' disabled' : '') + '>🚑 Ambulancia · te cura (25.000 Gs.)</button><button class="cbtn" data-sos="bom">🚒 Bomberos · llamar a Benítez</button><button class="cbtn" data-sos="pol">🚓 Policía · marcar la comisaría en el GPS</button>' + (sos.amb ? '<p>🚑 La ambulancia va en camino…</p>' : '');
    } else if (k === 'ajustes') {
      const c = cfg(), tr = (n) => (n ? gs(n) : 'gratis');
      h = '<h3>⚙️ Ajustes</h3><h4>🖼 Fondo de pantalla</h4><div class="fdGr">' + FONDOS.map(([id, n, bg, p]) => '<button class="fd' + (c.fondo === id ? ' sel' : '') + '" data-fd="' + id + '" style="background:' + bg + '"><b>' + n + '</b><small>' + (c.fondos.includes(id) ? (c.fondo === id ? '✔ puesto' : 'tuyo') : gs(p)) + '</small></button>').join('') + '</div>' +
        '<h4>🔔 Tono de llamada</h4>' + TONOS.map(([id, n, p]) => '<div class="row2"><span>' + (c.tono === id ? '✔ ' : '') + n + '</span><span><button class="mini" data-tp="' + id + '">▶</button> <button class="mini" data-tu="' + id + '">' + (c.tonos.includes(id) ? (c.tono === id ? 'En uso' : 'Usar') : 'Comprar ' + tr(p)) + '</button></span></div>').join('') +
        '<h4>📱 Orden de las apps</h4><p style="font-size:12px">Tocá ⬆ para llevar una app al principio de la pantalla.</p><div class="fdOrd">' + ordenar(X.todas || []).map(([a, i, n]) => '<button class="mini" data-up="' + a + '">⬆ ' + n.replace(/<[^>]*>/g, '') + '</button>').join('') + '</div><button class="cbtn sec" data-ordr>Restablecer orden</button>';
    } else if (k === 'juegos') {
      h = '<h3>🎮 Juegos</h3><div class="apps">' + GAMES.map(([g, i, n, c]) => '<button class="app" data-a="' + g + '"><i style="background:' + c + '">' + i + '</i>' + n + '</button>').join('') + '</div>';
    } else if (k.startsWith('call:')) {
      const id = k.slice(5), B = X.B, c = VR.CONTACTOS[id]; if (!c) return '<p>No existe ese contacto.</p>';
      h = '<div class="callBox"><i class="chAv big">' + c[1] + '</i><b>' + esc(c[0]) + '</b><span>' + (call && call.st === 'on' ? '📞 En llamada' : call && call.st === 'fin' ? 'Llamada terminada' : '📞 Llamando…') + '</span>';
      if (call && call.st === 'on') { h += '<div class="bub el">' + esc(VR.gt(call.hola || HOLA[id] || 'Hola, ¿qué tal?')) + '</div>' + (call.resp ? '<div class="bub yo">' + esc(call.yo) + '</div><div class="bub el">' + esc(call.resp) + '</div>' : '');
        if (!call.yo) h += '<div class="chRep">' + B.opciones(id).map((o, q) => '<button class="rep" data-cr="' + q + '">' + esc(o.t) + '</button>').join('') + '</div>'; }
      h += '<button class="cbtn hang" data-hang>' + (call && call.st === 'fin' ? '⬅ Volver' : '📵 Colgar') + '</button></div>';
    }
    return h;
  }

  function init(k, body, X) {
    if (VR.Juegos && VR.Juegos[k]) return VR.Juegos[k](body);
    const { vida: v } = X, $$ = (sel, f) => body.querySelectorAll(sel).forEach(f);
    if (k.startsWith('tere:')) {
      const M = mias();
      $$('[data-tph]', (e) => e.onclick = () => { const f = VR.Fotos.list()[+e.dataset.tph]; if (!f) return; miniatura(f.u, (img) => { if (!img) return; M.mis.push({ t: 'Mi foto', min: v.s.min, img }); while (M.mis.filter((q) => q.img).length > 4) M.mis.splice(M.mis.findIndex((q) => q.img), 1); v.save(); try { A().coin(); } catch (x) { /* sin audio */ } X.go2('tere'); }); });
      $$('[data-tdm]', (e) => e.onclick = () => { const [gi, q] = e.dataset.tdm.split(':').map(Number), D = dms(); D[gi] = D[gi] || { m: [], un: false }; D[gi].m.push({ de: 'yo', t: MEDM[q] }); v.save(); X.paint(); setTimeout(() => { entraDM(gi, RDM[(Math.random() * RDM.length) | 0]); D[gi].un = X.app() !== 'tere:' + gi; if (X.app() === 'tere:' + gi) { D[gi].un = false; X.paint(); } }, 1400); });
      return;
    }
    if (k === 'calc') { $$('[data-ck]', (e) => e.onclick = () => { calcTecla(e.dataset.ck); X.paint(); }); return; }
    if (k === 'notas') { const t = body.querySelector('#notaTx'); t.oninput = () => { cfg().nota = t.value; }; t.onchange = () => v.save(); return () => v.save(); }
    if (k === 'crono') {
      const tick = setInterval(() => { const a = body.querySelector('#crD'), b = body.querySelector('#tmD'); if (a) a.textContent = hms(crT()); if (b && cr.tmr) b.textContent = hms(cr.tmrEnd - Date.now()); }, 50);
      $$('[data-cr]', (e) => e.onclick = () => { const a = e.dataset.cr; if (a === 'go') { if (cr.run) { cr.acc = crT(); cr.run = false; } else { cr.t0 = performance.now(); cr.run = true; } } else if (a === 'lap') cr.vueltas.push(crT()); else { cr.run = false; cr.acc = 0; cr.vueltas = []; } X.paint(); });
      $$('[data-tm]', (e) => e.onclick = () => { const a = e.dataset.tm; if (a === 'go') { if (cr.tmr) { clearTimeout(cr.tmr); cr.tmr = null; } else { cr.tmrEnd = Date.now() + cr.tmrMin * 60000; cr.tmr = setTimeout(() => { cr.tmr = null; X0.toast('⏳ ¡Terminó el temporizador!'); for (let q = 0; q < 4; q++) setTimeout(() => { try { A().tone(880, 0.2, { type: 'square', vol: 0.05 }); } catch (x) { /* sin audio */ } }, q * 300); }, cr.tmrMin * 60000); } } else cr.tmrMin = Math.max(1, Math.min(60, cr.tmrMin + +a)); X.paint(); });
      return () => clearInterval(tick);
    }
    if (k === 'musica') { $$('[data-mu]', (e) => e.onclick = () => { const a = e.dataset.mu; if (a === 'stop') { if (Radio.k) { Radio.set(null); } else sonar(pista < 0 ? 0 : pista); } else if (a === 'next') sonar(pista + 1); else if (a === 'prev') sonar(pista - 1); else sonar(+a); X.paint(); }); return; }
    if (k === 'banco') {
      const c = cfgA(), sv = () => { v.save(); X.paint(); };
      $$('[data-ah]', (e) => e.onclick = () => { const a = e.dataset.ah; if (a === 'ret') { if (c.ahorro > 0) { v.banco(c.ahorro, '🐷 Retiro de caja de ahorro'); c.ahorro = 0; } } else { const n = a === 'todo' ? s0().banco : +a; if (n > 0 && s0().banco >= n) { v.banco(-n, '🐷 Depósito en caja de ahorro'); c.ahorro += n; c.ahDia = v.dia; } } sv(); });
      return;
    }
    if (k === 'tienda') { const c = cfgA(); $$('[data-bapp]', (e) => e.onclick = () => { const a = e.dataset.bapp; if (!c.apps.includes(a) && v.pagaBanco(PREMIUM[a], 'App ' + a)) { c.apps.push(a); v.save(); X0.toast('🛍 App instalada'); } X.paint(); }); return; }
    if (k === 'sos') {
      $$('[data-sos]', (e) => e.onclick = () => { const a = e.dataset.sos;
        if (a === 'amb') { if (sos.amb) return; if (!v.cobrarODeber) return; v.cobrarODeber(25000, '🚑 Ambulancia'); sos.amb = 1; X0.toast('🚑 La ambulancia va en camino…'); setTimeout(() => { sos.amb = 0; if (VR.heal) VR.heal(100); X0.toast('🚑 Te atendieron en el lugar: estás recuperado'); try { A().coin(); } catch (x) { /* sin audio */ } }, 9000); }
        else if (a === 'bom') VR.CelX.llamar('benitez');
        else if (X.comisaria) { const q = X.comisaria(); if (q) { X.dest({ x: q.x, y: q.y, name: 'Comisaría' }); X0.toast('🚓 Marqué la comisaría en el GPS'); } else X0.toast('🚓 No hay comisaría cerca en este mapa'); }
        X.paint(); });
      return;
    }
    if (k === 'tere') {
      const M = mias();
      $$('[data-tpub]', (e) => e.onclick = () => { const t = body.querySelector('#tePub').value.trim(); if (!t) return; M.mis.push({ t, min: v.s.min }); if (M.mis.length > 20) M.mis.shift(); v.save(); try { A().coin(); } catch (x) { /* sin audio */ } X.paint(); });
      $$('.tfoto', (e) => e.onclick = () => e.classList.toggle('big'));
      $$('[data-tlk]', (e) => e.onclick = () => { M.lk[e.dataset.tlk] = !M.lk[e.dataset.tlk]; v.save(); X.paint(); });
      return;
    }
    if (k === 'ajustes') {
      const c = cfg(), sv = () => { v.save(); X.paint(); };
      $$('[data-fd]', (e) => e.onclick = () => { const f = FONDOS.find((q) => q[0] === e.dataset.fd); if (!c.fondos.includes(f[0])) { if (!v.pagaBanco(f[3], 'Fondo ' + f[1])) return; c.fondos.push(f[0]); } c.fondo = f[0]; sv(); });
      $$('[data-tp]', (e) => e.onclick = () => sonarTono(e.dataset.tp));
      $$('[data-tu]', (e) => e.onclick = () => { const t = TONOS.find((q) => q[0] === e.dataset.tu); if (!c.tonos.includes(t[0])) { if (!v.pagaBanco(t[2], 'Tono ' + t[1])) return; c.tonos.push(t[0]); } c.tono = t[0]; sonarTono(t[0]); sv(); });
      $$('[data-up]', (e) => e.onclick = () => { c.orden = [e.dataset.up].concat((c.orden || []).filter((q) => q !== e.dataset.up)); sv(); });
      $$('[data-ordr]', (e) => e.onclick = () => { c.orden = []; sv(); });
      return;
    }
    if (k === 'alarma') {
      const L = alarmas(), sv = () => v.save();
      $$('[data-al]', (e) => e.onchange = () => { const m = /(\d+):(\d+)/.exec(e.value); if (m) { L[+e.dataset.al].m = +m[1] * 60 + +m[2]; sv(); } });
      $$('[data-alb]', (e) => e.onchange = () => { L[+e.dataset.alb].lbl = e.value; sv(); });
      $$('[data-alt]', (e) => e.onclick = () => { const a = L[+e.dataset.alt]; a.on = !a.on; sv(); X.paint(); });
      $$('[data-ald]', (e) => e.onclick = () => { L.splice(+e.dataset.ald, 1); sv(); X.paint(); });
      $$('[data-aln]', (e) => e.onclick = () => { if (L.length >= 6) { X.toast('⏰ Ya tenés 6 alarmas'); return; } L.push({ m: 420, lbl: 'Despertar', on: true }); sv(); X.paint(); });
    } else if (k === 'radio') {
      $$('[data-rd]', (e) => e.onclick = () => { Radio.set(e.dataset.rd); X.paint(); });
    } else if (k.startsWith('deliv:')) {
      const l = LOCALES.find((q) => q.id === k.slice(6));
      $$('[data-dp]', (e) => e.onclick = () => { cart[e.dataset.dp] = Math.min(9, (cart[e.dataset.dp] || 0) + 1); X.paint(); });
      $$('[data-dm]', (e) => e.onclick = () => { cart[e.dataset.dm] = Math.max(0, (cart[e.dataset.dm] || 0) - 1); X.paint(); });
      $$('[data-dpd]', (e) => e.onclick = () => { const it = l.it.filter((q) => cart[q[0]]).map((q) => ({ k: q[0], n: q[1], ico: q[3], h: q[4], c: cart[q[0]], p: q[2] })), tot = it.reduce((a, q) => a + q.p * q.c, 0) + ENVIO;
        if (!v.pagaBanco(tot, "Ñembo'u: " + l.n)) { X.paint(); return; } pedidos().push({ n: l.n, t: v.s.min + 16 + Math.random() * 14, it }); v.save(); cart = {}; X.toast('🛵 Pedido hecho: ya sale de ' + l.n); X.go2('deliv'); });
    } else if (k.startsWith('call:')) {
      const id = k.slice(5), B = X.B, tm = []; if (!call || call.id !== id) call = { id, st: 'ring', yo: '', resp: '' };
      const colgar = () => { tm.forEach(clearTimeout); rt.forEach(clearTimeout); rt = []; call = null; X.go2('agenda'); };
      $$("[data-hang]", (e) => e.onclick = () => { if (call && call.st === 'on') { call.st = 'fin'; } colgar(); });
      $$('[data-cr]', (e) => e.onclick = () => { const q = +e.dataset.cr, o = B.opciones(id)[q]; if (!o) return; call.yo = o.t; call.resp = '…'; const a = B.responder(id, q); X.paint();
        rt.push(setTimeout(() => { const m = B.ultimo(id); if (!call) return; call.resp = m && !m.yo ? m.txt : 'Dale, hablamos.'; B.leerDe(id); if (X.app() === 'call:' + id) X.paint(); if (a) rt.push(setTimeout(() => { if (B.CIERRA.includes(a)) X.go(() => B.hacer(a)); else { B.hacer(a); if (X.app() === 'call:' + id) X.paint(); } }, 1400)); }, 2100)); });
      if (call.st === 'ring') { const ring = () => { A().tone(440, 0.9, { type: 'sine', vol: 0.05 }); A().tone(480, 0.9, { type: 'sine', vol: 0.05 }); }; ring(); tm.push(setTimeout(ring, 1700));
        tm.push(setTimeout(() => { if (!call || call.id !== id) return; call.st = 'on'; A().blip(); if (X.app() === 'call:' + id) X.paint(); }, 3500)); }
      return () => { tm.forEach(clearTimeout); if (!/^call:/.test(X.app())) { rt.forEach(clearTimeout); rt = []; call = null; } };
    }
    return null;
  }
  // Repartidor de Ñembo'u: un Mbohasa sin pasajero. Sale de una esquina fuera de pantalla, llega hasta vos, te da el pedido y se va por donde vino.
  VR.Reparto = class extends VR.Mbohasa {
    constructor(o) { super(Object.assign({ toast: () => {}, dialogo: () => {}, pagar: () => true, yo: () => null, tengoCasco: () => false, manejando: () => false, bajar: () => {} }, o)); this.pend = null; }
    salir(p) { this.pend = p; if (!this.pedir('moto', 0, { name: 'tu casa' }, { modelo: 'cub', kv: 1.05 })) { this.pend = null; return false; } this.r.home = { x: this.v.x, y: this.v.y }; if (VR.toast) VR.toast('🛵 El repartidor de Ñembo\'u ya va para tu zona'); return true; }
    quitar() { const p = this.pend; this.pend = null; super.quitar(); if (p) dar(p, false); } // si no pudo llegar, te lo dejan en la puerta
    update(dt) {
      const r = this.r, v = this.v;
      if (r && v && r.st === 'espera' && this.pend) {
        v.physics(dt, 0, 0, true, true); r.wait += dt; const f = this.player, d = Math.hypot(f.x - v.x, f.y - v.y);
        if (d < 120 || r.wait > 25) { const p = this.pend; this.pend = null; dar(p, d < 160); const Q = this.ruta(v.x, v.y, r.home.x, r.home.y); if (Q && Q.length >= 6) { r.P = Q; r.st = 'sale'; r.t = 0; } else super.quitar(); }
        return;
      }
      super.update(dt);
    }
  };
  const s0 = () => V.s;
  const ordenar = (L) => { const o = (V && V.s.cel && V.s.cel.orden) || []; return L.slice().sort((a, b) => { const x = o.indexOf(a[0]), y = o.indexOf(b[0]); return (x < 0 ? 999 : x) - (y < 0 ? 999 : y); }); };
  return { APPS, GAMES, has, ordenar, tiene, sinLeerDM, fondo: () => { const f = FONDOS.find((q) => q[0] === cfg().fondo); return f ? f[2] : ''; }, sonarTono, html, init, Radio, llamar: (id) => { call = { id, st: 'ring', yo: '', resp: '' }; }, entrante,
    // cada llamada que hacés gasta 0,1 día de saldo (las que te hacen son gratis)
    cobraLlamada() { if (!(V.s.saldo >= 0.1)) { X0.toast('📵 No te alcanza el saldo para llamar'); return false; } V.s.saldo = Math.max(0, V.s.saldo - 0.1); V.save(); return true; },
    arrancar(vida, X) { V = vida; X0 = X; last = Math.floor(V.s.min); pedidos().forEach((p) => { delete p.rep; delete p.espera; });
      setInterval(() => { const hud = document.getElementById('radioHud'), sp = document.getElementById('tab'); if (!hud || !sp) return; const on = Radio.k && !sp.hidden; hud.hidden = !on; if (on) { const E = Radio.E[Radio.k]; hud.textContent = '📻 ' + E.fm + ' · ' + (Radio.k === 'noti' && Radio.linea ? Radio.linea.slice(0, 60) : E.n); hud.style.top = (sp.getBoundingClientRect().bottom + 4) + 'px'; } }, 500);
      setInterval(() => { const cur = Math.floor(V.s.min); if (cur !== last) { for (let t = Math.max(last + 1, cur - 180); t <= cur; t++) { const L = alarmas(), a = L.find((q) => q.on && q.m === t % 1440); if (a) { if (a.tmp) L.splice(L.indexOf(a), 1); V.save(); suena(a); break; } } last = cur; } entregas(); }, 400); } };
})();
