// Apps extra del celular (19/11/2026, pedido de Leandro): ⏰ Alarma, 📻 Radio (sintetizada, con cuatro... tres emisoras inventadas), 🌤 Clima, 📰 Noticias,
// 🍔 Ñembo'u (delivery), ❤️ Salud, 🎮 Juegos (carpeta) y 📞 llamadas a los contactos. Cada app es html(k, X) + init(k, body, X) → stop().
// X = { vida, esc, gs, B (Buzon), toast, paint(), app(), go(f), net() } lo arma main.js.
VR.CelX = (() => {
  const A = () => VR.audio, mf = (n) => 440 * Math.pow(2, (n - 69) / 12), pad = (n) => String(n).padStart(2, '0');
  const hm = (m) => pad((m / 60) | 0) + ':' + pad(m % 60);
  const rng = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const APPS = [['alarma', '⏰', 'Alarma', '#ff9a5a', false], ['radio', '📻', 'Radio', '#c8a0ff', false], ['clima', '🌤', 'Clima', '#6ac8ff', true], ['noti', '📰', 'Noticias', '#e6e6e6', true],
    ['deliv', '🍔', "Ñembo'u", '#ff6b4a', true], ['salud', '❤️', 'Salud', '#ff7a8a', false], ['juegos', '🎮', 'Juegos', '#9bbc0f', false], ['tere', '🧉', 'Tereré', '#3b9d5a', true], ['ajustes', '⚙️', 'Ajustes', '#9aa3b2', false]];
  // ---- Tereré: la red social de Villarrica (todo inventado). Feed del día con vecinos; vos publicás y te van llegando likes y comentarios ----
  const GENTE = [['Cinthia Vera', '👩'], ['Chino Ayala', '🧑'], ['Doña Chela', '👵'], ['Kike Mbohasa', '🛵'], ['Tía Norma', '👩‍🦳'], ['Pablo Ñandú', '🧔'], ['Lorena Ykuá', '👱‍♀️'], ['El Gringo', '🧑‍🦰']];
  const POSTS = ['Hoy el calor está para tereré con menta. ¿Quién se suma a la plaza?', 'Se me pinchó la goma en la ruta, ¡qué día, ndaje!', 'Chipa recién salida del horno, pasen nomás.', 'Alguien vio mi gato? Es naranja y anda por el barrio Ykuá.', 'Qué lindo atardecer sobre el lago, miren.', 'Mañana feria en el mercado, lleguen temprano.', 'Pedí un Mbohasa y el conductor era un divino, 5 estrellas.', 'Ojo con la zona de la terminal esta noche, mucho movimiento.', 'Cumple de mi abuela, vengan todos al asado.', 'Se corta la luz otra vez... paciencia nomás.', 'Los bomberos hicieron un trabajo bárbaro hoy, gracias.', 'Vendo bici usada, buen estado. Consulten por privado.'];
  const COMS = ['Jajaja qué grande', '¡Genial!', 'Ahí voy', 'Pavê, me encantó', 'Qué bueno che', 'Totalmente de acuerdo', 'Mba\'éichapa, ¡qué buena!', '👏👏👏'];
  const mias = () => (V.s.tere = V.s.tere || { mis: [], lk: {} });
  function feed() { const r = rng(Math.floor(V.s.min / 1440) * 31 + 7), n = 6, L = []; for (let i = 0; i < n; i++) { const g = GENTE[(r() * GENTE.length) | 0], t = POSTS[(r() * POSTS.length) | 0]; L.push({ id: V.dia + '_' + i, g, t, l: 2 + ((r() * 40) | 0), c: r() < 0.5 ? COMS[(r() * COMS.length) | 0] : '', h: (V.s.min % 1440) - ((i * 97) % 600) }); } return L; }
  function reacc(p) { const T = V.s.min - p.min, r = rng(p.min | 0); return { l: Math.min(60, Math.floor(T / 4) + ((r() * 3) | 0)), cs: Array.from({ length: Math.min(3, Math.floor(T / 25)) }, (_, i) => [GENTE[(r() * GENTE.length) | 0], COMS[(r() * COMS.length) | 0]]) }; }
  // ---- personalización: fondos, tonos y orden de apps (se guarda en s.cel) ----
  const FONDOS = [['noche', 'Noche', 'linear-gradient(#10182e,#2a1a4a)', 0], ['lapacho', 'Lapacho', 'linear-gradient(#ff8fc0,#8a2f7a)', 8000], ['ykua', 'Ykuá', 'linear-gradient(#1c5a8a,#7fd0e8)', 8000], ['campo', 'Campo', 'linear-gradient(#2f6a2f,#d8c860)', 8000], ['atardecer', 'Atardecer', 'linear-gradient(#ff6b4a,#3a1a5a)', 12000], ['retro', 'Verde retro', 'linear-gradient(#0f380f,#306230)', 5000]];
  const TONOS = [['cl', 'Clásico', 0], ['gu', 'Guarania', 12000], ['cu', 'Cumbia', 12000], ['di', 'Digital', 8000], ['ro', 'Rock', 15000]];
  const cfg = () => (V.s.cel = V.s.cel || { fondo: 'noche', tono: 'cl', fondos: ['noche'], tonos: ['cl'], orden: [] });
  const NOTAS = { cl: [[440, 480]], gu: [[64, 67, 71, 69, 67, 64].map(mf)], cu: [[57, 60, 64, 60].map(mf)], di: [[880, 1175, 880, 1175]], ro: [[82, 98, 82, 123]] };
  function sonarTono(id) { const t = id || cfg().tono, L = NOTAS[t] ? NOTAS[t][0] : NOTAS.cl[0]; L.forEach((f, i) => setTimeout(() => { try { A().tone(f, t === 'cl' ? 0.9 : 0.22, { type: t === 'ro' ? 'sawtooth' : t === 'di' ? 'square' : 'sine', vol: 0.05 }); } catch (e) { /* sin audio */ } }, t === 'cl' ? 0 : i * 240)); }
  const GAMES = [['culebra', '🐍', 'Culebra', '#9bbc0f'], ['tateti', '❌', 'Ta-te-tí', '#ff8a8a'], ['memoria', '🃏', 'Memoria', '#ffd84a'], ['bloques', '🧱', 'Bloques', '#5ac8fa'], ['rebote', '🏓', 'Rebote', '#7fe08a']];
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
      const r = rng(bar * 131 + (this.k.length * 17) + (hook ? 7 : 0)), ch = E.prog[bar % E.prog.length][1]; let i = Math.max(0, E.sc.findIndex((n) => n >= ch[2])); this.mel = [];
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
    set(k) { clearInterval(this.tm); try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* sin voz */ } this.cola = null; this.linea = ''; this.k = k || null; this.step = 0; this.nx = 0; try { VR.store.set('radio', this.k || ''); } catch (e) { /* sin guardado */ }
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
  let call = null, rt = [], inc = null; const HOLA = { kike: '¡Ey, hermano! ¿Qué necesitás?', ramona: 'Hola, hijo. ¿Todo bien con la pieza?', chela: 'Mba’éichapa, ¿querés chipa?', lucas: 'Marimer, buenas. ¿Qué le sirvo?', mirta: 'Ao Porã, buenas. ¿En qué le ayudo?', benitez: 'Bomberos voluntarios, dígame.' };

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
  const has = (k) => typeof k === 'string' && (APPS.some((a) => a[0] === k) || k === 'tere' || k === 'juegos' || k.startsWith('call:') || k.startsWith('deliv:') || GAMES.some((g) => g[0] === k && k !== 'culebra'));
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
      const M = mias(), hm2 = (m) => { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(Math.floor(m % 60)); };
      h = '<h3>🧉 Tereré</h3><div class="tpub"><input id="tePub" maxlength="120" placeholder="¿Qué estás pensando, che?"><button class="mini" data-tpub>Publicar</button></div>';
      for (const p of M.mis.slice().reverse().slice(0, 6)) { const R = reacc(p); h += '<div class="tpost yo"><b>🙂 Vos</b> <small>' + hm2(p.min) + '</small><p>' + esc(p.t) + '</p><small>👍 ' + R.l + (R.cs.length ? ' · 💬 ' + R.cs.length : '') + '</small>' + R.cs.map((q) => '<div class="tcom"><b>' + q[0][1] + ' ' + q[0][0] + ':</b> ' + esc(q[1]) + '</div>').join('') + '</div>'; }
      for (const p of feed()) { const me = M.lk[p.id]; h += '<div class="tpost"><b>' + p.g[1] + ' ' + p.g[0] + '</b> <small>' + hm2(p.h) + '</small><p>' + esc(p.t) + '</p><small><button class="mini" data-tlk="' + p.id + '">' + (me ? '👍 Te gusta' : '👍 Me gusta') + '</button> ' + (p.l + (me ? 1 : 0)) + '</small>' + (p.c ? '<div class="tcom"><b>💬</b> ' + esc(p.c) + '</div>' : '') + '</div>'; }
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
      if (call && call.st === 'on') { h += '<div class="bub el">' + esc(call.hola || HOLA[id] || 'Hola, ¿qué tal?') + '</div>' + (call.resp ? '<div class="bub yo">' + esc(call.yo) + '</div><div class="bub el">' + esc(call.resp) + '</div>' : '');
        if (!call.yo) h += '<div class="chRep">' + B.opciones(id).map((o, q) => '<button class="rep" data-cr="' + q + '">' + esc(o.t) + '</button>').join('') + '</div>'; }
      h += '<button class="cbtn hang" data-hang>' + (call && call.st === 'fin' ? '⬅ Volver' : '📵 Colgar') + '</button></div>';
    }
    return h;
  }

  function init(k, body, X) {
    if (VR.Juegos && VR.Juegos[k]) return VR.Juegos[k](body);
    const { vida: v } = X, $$ = (sel, f) => body.querySelectorAll(sel).forEach(f);
    if (k === 'tere') {
      const M = mias();
      $$('[data-tpub]', (e) => e.onclick = () => { const t = body.querySelector('#tePub').value.trim(); if (!t) return; M.mis.push({ t, min: v.s.min }); if (M.mis.length > 20) M.mis.shift(); v.save(); try { A().coin(); } catch (x) { /* sin audio */ } X.paint(); });
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
  const ordenar = (L) => { const o = (V && V.s.cel && V.s.cel.orden) || []; return L.slice().sort((a, b) => { const x = o.indexOf(a[0]), y = o.indexOf(b[0]); return (x < 0 ? 999 : x) - (y < 0 ? 999 : y); }); };
  return { APPS, GAMES, has, ordenar, fondo: () => { const f = FONDOS.find((q) => q[0] === cfg().fondo); return f ? f[2] : ''; }, sonarTono, html, init, Radio, llamar: (id) => { call = { id, st: 'ring', yo: '', resp: '' }; }, entrante,
    // cada llamada que hacés gasta 0,1 día de saldo (las que te hacen son gratis)
    cobraLlamada() { if (!(V.s.saldo >= 0.1)) { X0.toast('📵 No te alcanza el saldo para llamar'); return false; } V.s.saldo = Math.max(0, V.s.saldo - 0.1); V.save(); return true; },
    arrancar(vida, X) { V = vida; X0 = X; last = Math.floor(V.s.min); pedidos().forEach((p) => { delete p.rep; delete p.espera; });
      setInterval(() => { const hud = document.getElementById('radioHud'), sp = document.getElementById('speed'); if (!hud || !sp) return; const on = Radio.k && !sp.hidden; hud.hidden = !on; if (on) { const E = Radio.E[Radio.k]; hud.textContent = '📻 ' + E.fm + ' · ' + (Radio.k === 'noti' && Radio.linea ? Radio.linea.slice(0, 60) : E.n); hud.style.top = (sp.getBoundingClientRect().bottom + 4) + 'px'; } }, 500);
      setInterval(() => { const cur = Math.floor(V.s.min); if (cur !== last) { for (let t = Math.max(last + 1, cur - 180); t <= cur; t++) { const L = alarmas(), a = L.find((q) => q.on && q.m === t % 1440); if (a) { if (a.tmp) L.splice(L.indexOf(a), 1); V.save(); suena(a); break; } } last = cur; } entregas(); }, 400); } };
})();
