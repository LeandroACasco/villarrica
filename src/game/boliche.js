// Boliches y pubs por dentro (14/11/2026, pedido de Leandro): solo abren de noche (cuando el juego está de noche). Un solo interior
// con pista de baile iluminada, DJ (o pantalla de karaoke), barra, mesas, gente bailando y un patovica en la puerta; cambia el color
// del neón y el nombre por local. Usa el motor VR.Salon. Todo el arte es propio, sin logos.
(function () {
  const H = VR.hash, pick = (a) => a[(Math.random() * a.length) | 0];
  const LOCALES = {
    bambuddha: { id: 'bambuddha', n: 'Bambuddha', neon: '#ff3fa8', rgb: '255,63,168', tipo: 'disco' },
    gleu: { id: 'gleu', n: 'Gleu Pub', neon: '#3fd0ff', rgb: '63,208,255', tipo: 'pub' },
    blue: { id: 'blue', n: 'Blue Karaoke', neon: '#4f7bff', rgb: '79,123,255', tipo: 'karaoke' },
    estacion: { id: 'estacion', n: 'La Nueva Estación', neon: '#ffb03f', rgb: '255,176,63', tipo: 'pub' },
  };
  VR.BOLICHES = LOCALES;
  VR.bolicheAbierto = () => !!(VR.night && VR.night.level > 0.6);   // solo de noche
  const W = 400, HH = 300;
  const MENU = [['Cerveza', 15000, 6], ['Fernet con coca', 25000, 4], ['Caipiriña', 22000, 4], ['Gaseosa', 6000, 6], ['Agua mineral', 3500, 3], ['Papas fritas', 18000, 30], ['Picada para compartir', 45000, 60]];
  const FRASES = {
    dj: ['🎧 El DJ levanta un dedo: «Ya te pongo tu tema». No te pone tu tema.', '🎧 Los parlantes te hacen vibrar hasta las muelas.', '🎧 «¡Manos arriba, Villarrica!» Nadie baja las manos.'],
    karaoke: ['🎤 Cantás desafinado y el público aplaude de lástima.', '🎤 Una señora canta con tanta pasión que nadie quiere pedir el micrófono.', '🎤 La pantalla muestra puras notas musicales. Te sabés la mitad, el resto lo inventás.'],
    mesa: ['🍺 Una mesa pegajosa. Nadie sabe de qué.', '🪑 Alguien dejó un abrigo. Por las dudas no lo toques.', '🥤 Un vaso a medio terminar. No es tuyo, no es de nadie.'],
    patovica: ['🕴 El patovica te mira de arriba abajo: «Pasá, pasá. Portate bien».', '🕴 «Sin problemas adentro, ¿ok?»'],
  };
  VR.crearBoliche = function (o) {
    let rnd = 61; const rd = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647, seeded = () => VR.av2Random(rd);
    const staff = (top, g, i) => { const L = seeded(); L.gender = g; L.top = top; L.topColor = 3; L.bottom = 'vestir'; L.bottomColor = 3; L.shoes = 'zapatos'; L.shoesColor = 3; L.hat = 'ninguno'; L.beard = 'no'; L.build = 'normal'; L.hair = g === 'f' ? ['colita', 'largo', 'rodete'][i % 3] : 'corto'; for (const k in L) if (L[k] === true) L[k] = false; return L; };
    const adultos = Array.from({ length: 16 }, () => { const L = seeded(); L.hat = L.hat === 'casco' ? 'ninguno' : L.hat; L.mochila = false; L.termo = false; return L; });
    const bar = staff('camisa', 'f', 0), dj = staff('remera', 'm', 1), patovica = (() => { const L = staff('camisa', 'm', 2); L.build = 'fornido'; return L; })();
    let gente = [], fx = [], baila = 0;
    const fmt = (n) => VR.fmtGs(n);
    const objs = () => [
      { id: 'puerta', x: 170, y: 292, w: 60, h: 10, ax: 200, ay: 284, r: 28, h2: '🚪 ACCIÓN: salir', ghost: true },
      { id: 'barra', x: 226, y: 44, w: 156, h: 20, ax: 304, ay: 78, r: 34, h2: '🍹 ACCIÓN: pedir en la barra' },
      { id: 'dj', x: 22, y: 44, w: 92, h: 22, ax: 68, ay: 78, r: 34, h2: S.local.tipo === 'karaoke' ? '🎤 ACCIÓN: cantar' : '🎧 ACCIÓN: hablar con el DJ' },
      { id: 'pista', x: 120, y: 112, w: 160, h: 80, ax: 200, ay: 152, r: 38, h2: '💃 ACCIÓN: bailar', ghost: true },
      ...[[26, 132], [26, 180], [346, 132], [346, 180]].map(([x, y], i) => ({ id: 'mesa' + i, x, y, w: 28, h: 14, ax: x + 14, ay: y + 20, r: 24, h2: '🍺 ACCIÓN: mirar la mesa' })),
    ];
    function bg(g, s, me) {
      const L = me.local;
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const rr = (x, y, w, h, c, r = 2) => { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
      const lin = (x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach((c, i) => q.addColorStop(i / (st.length - 1), c)); return q; };
      const T = (t, x, y, sz, c, al = 'center', mw) => { g.font = '700 ' + sz + 'px system-ui'; g.textAlign = al; g.fillStyle = c; if (mw) g.fillText(t, x, y, mw); else g.fillText(t, x, y); g.textAlign = 'left'; };
      R(0, 0, W, HH, '#0b0a12');
      // piso oscuro con brillo
      for (let y = 40; y < HH - 10; y += 16) for (let x = 8; x < W - 8; x += 16) R(x, y, 16, 16, ((x + y) / 16) % 2 ? '#15121e' : '#110f19');
      g.fillStyle = lin(0, 40, 0, HH, ['rgba(255,255,255,.05)', 'rgba(255,255,255,0)']); g.fillRect(8, 40, W - 16, HH - 50);
      // pared del fondo con franja de neón y cartel
      R(8, 0, W - 16, 42, lin(0, 0, 0, 42, ['#1b1626', '#100d18'])); R(8, 40, W - 16, 2, L.neon); R(8, 42, W - 16, 6, 'rgba(' + L.rgb + ',.18)');
      rr(120, 5, 160, 20, '#0b0a12', 4); g.strokeStyle = L.neon; g.lineWidth = 1.3; g.beginPath(); g.roundRect(120, 5, 160, 20, 4); g.stroke(); T(L.n.toUpperCase(), 200, 19.4, 11, L.neon, 'center', 150);
      R(0, 12, 8, HH - 12, '#1a1624'); R(W - 8, 12, 8, HH - 12, '#1a1624'); R(0, 0, W, 12, '#07060b');
      // DJ (o karaoke)
      rr(22, 44, 92, 22, lin(0, 44, 0, 66, ['#2a2538', '#17131f']), 2); R(22, 44, 92, 1.2, 'rgba(255,255,255,.25)');
      if (L.tipo === 'karaoke') { rr(34, 20, 68, 22, '#050408', 2); g.strokeStyle = L.neon; g.lineWidth = 1; g.beginPath(); g.roundRect(34, 20, 68, 22, 2); g.stroke(); T('♪ ♫ KARAOKE ♫ ♪', 68, 34, 7, L.neon, 'center', 60); rr(40, 52, 4, 8, '#888'); }
      else { rr(40, 49, 56, 9, '#0c0b12', 1.5); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#ff3f8f' : '#3fd0ff'; g.beginPath(); g.arc(48 + i * 8, 53.5, 2.2, 0, 7); g.fill(); } }
      for (const sx of [10, 114]) { rr(sx, 40, 14, 36, '#0a090f', 2); for (const cy of [50, 64]) { g.fillStyle = '#26232f'; g.beginPath(); g.arc(sx + 7, cy, 4.4, 0, 7); g.fill(); g.fillStyle = '#0a090f'; g.beginPath(); g.arc(sx + 7, cy, 1.8, 0, 7); g.fill(); } }
      // barra con botellas
      R(226, 28, 156, 2, 'rgba(' + L.rgb + ',.5)'); rr(226, 30, 156, 10, '#1a1624', 1); for (let i = 0; i < 24; i++) { g.fillStyle = ['#2e8a52', '#c8322a', '#e8b830', '#2e6fc8', '#e87a2a', '#7a4ab0'][(i * 7 + ((H(i, 3, 4) * 6) | 0)) % 6]; g.fillRect(230 + i * 6.3, 31, 3, 8); }
      rr(226, 44, 156, 20, lin(0, 44, 0, 64, ['#4a3a2a', '#2a2018']), 2); R(226, 44, 156, 2, '#8a6a46'); R(226, 63, 156, 1.5, 'rgba(' + L.rgb + ',.6)');
      for (let i = 0; i < 5; i++) { rr(236 + i * 28, 66, 9, 5, '#2a2434', 2); R(239.5 + i * 28, 71, 2, 6, '#555'); R(235 + i * 28, 77, 11, 1.5, '#555'); }
      // mesas con banquitos
      for (const [x, y] of [[26, 132], [26, 180], [346, 132], [346, 180]]) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + 14, y + 16, 17, 5, 0, 0, 7); g.fill(); rr(x, y, 28, 14, '#2c2438', 3); R(x + 1, y, 26, 1.4, 'rgba(' + L.rgb + ',.55)'); g.fillStyle = '#ddd'; g.fillRect(x + 6, y + 4, 3, 4); g.fillRect(x + 17, y + 6, 3, 4); for (const dx of [-5, 29]) { g.fillStyle = '#3a2f4a'; g.beginPath(); g.ellipse(x + 14 + dx, y + 20, 4, 2.4, 0, 0, 7); g.fill(); } }
      // pared frontal y puerta
      R(0, HH - 10, W, 10, '#07060b'); R(170, HH - 11, 60, 11, '#2b2f3a'); R(172, HH - 10, 56, 10, 'rgba(' + L.rgb + ',.3)'); T('SALIDA', 200, HH - 2.4, 5.4, '#ffd84a');
      // pista (base oscura; las luces van encima, animadas)
      R(120, 112, 160, 80, '#0a0910'); g.strokeStyle = 'rgba(' + L.rgb + ',.7)'; g.lineWidth = 1; g.strokeRect(120.5, 112.5, 159, 79);
    }
    function crear(me) {
      gente = []; fx = [];
      for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28, r = Math.random(); gente.push({ look: adultos[i % adultos.length], x: 200 + Math.cos(a) * 62 * r, y: 152 + Math.sin(a) * 28 * r, ph: Math.random() * 6, kind: 'baila' }); }
      for (let i = 0; i < 3; i++) gente.push({ look: adultos[(12 + i) % adultos.length], x: 252 + i * 34, y: 82, ph: Math.random() * 6, kind: 'barra' });
      [[40, 156, 'down'], [40, 204, 'down'], [372, 156, 'down'], [372, 204, 'down']].forEach(([x, y], i) => gente.push({ look: adultos[(i * 3) % adultos.length], x, y, ph: i, kind: 'mesa' }));
    }
    const menu = () => {
      const op = MENU.map(([n, p, h]) => [n + ' · ' + fmt(p), () => { if (o.come) o.come(p, h, n + ' en ' + S.local.n, 0); return menu(); }]); op.push(['Nada, gracias', () => false]);
      return [{ quien: 'sis', titulo: '🍹 ' + S.local.n, txt: 'Barman: «¿Qué te sirvo?» Tenés ' + fmt(VR.Wallet.get()) + '.', op }];
    };
    const S = new VR.Salon({
      W, H: HH, start: { x: 200, y: 274, dir: 'up' }, bounds: [16, 78, 384, 288], objs, bg, key: () => S.local.id,
      enter: (me) => { crear(me); baila = 0; me.decir('🎶 ' + me.local.n + ' · Abierto de noche. Pedí algo en la barra o bailá en la pista.', 4); },
      items: (me) => {
        const it = [{ sy: 52, f: (g) => me.figura(g, bar, 304, 52, 'down', false, 0) }, { sy: 54, f: (g) => me.figura(g, dj, 68, 56, 'down', false, 0) }, { sy: 284, f: (g) => me.figura(g, patovica, 160, 284, 'right', false, 0) }];
        for (const p of gente) {
          const b = p.kind === 'baila' ? Math.abs(Math.sin(me.t * 5 + p.ph)) * 1.8 : 0, sx = p.kind === 'baila' ? Math.sin(me.t * 2.4 + p.ph) * 1.2 : 0;
          it.push({ sy: p.y, f: (g) => me.figura(g, p.look, p.x + sx, p.y - b, p.kind === 'mesa' ? 'up' : 'down', false, 0) });
        }
        return it;
      },
      over: (c, me) => {   // luces de la pista, rayos y bola espejada (cada cuadro)
        const t = me.t, L = me.local; c.save(); c.globalCompositeOperation = 'lighter';
        for (let j = 0; j < 5; j++) for (let i = 0; i < 10; i++) { const k = Math.sin(t * 2.6 + i * 0.9 + j * 1.3) * 0.5 + 0.5, hue = (t * 40 + i * 28 + j * 50) % 360; c.fillStyle = 'hsla(' + hue + ',90%,55%,' + (0.1 + k * 0.28) + ')'; c.fillRect(121 + i * 16, 113 + j * 16, 15, 15); }
        for (let b = 0; b < 4; b++) { const a = Math.sin(t * 1.1 + b * 1.7) * 0.9, x0 = 130 + b * 46, hue = (t * 60 + b * 80) % 360; const q = c.createLinearGradient(x0, 44, x0 + a * 70, 170); q.addColorStop(0, 'hsla(' + hue + ',100%,65%,.28)'); q.addColorStop(1, 'hsla(' + hue + ',100%,65%,0)'); c.fillStyle = q; c.beginPath(); c.moveTo(x0 - 2, 44); c.lineTo(x0 + 2, 44); c.lineTo(x0 + a * 70 + 14, 170); c.lineTo(x0 + a * 70 - 14, 170); c.fill(); }
        c.restore();
        c.fillStyle = '#cfd4e0'; c.beginPath(); c.arc(200, 100, 6, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 6; i++) { const a = t * 2 + i * 1.05; c.fillRect(200 + Math.cos(a) * 4 - 0.6, 100 + Math.sin(a) * 3.4 - 0.6, 1.4, 1.4); } c.fillStyle = '#555'; c.fillRect(199.6, 44, 0.8, 52);
        if (baila > 0) { for (let i = 0; i < 4; i++) { c.font = '700 8px system-ui'; c.fillStyle = ['#ff7ac8', '#7ad0ff', '#ffe07a', '#9aff7a'][i]; c.fillText(i % 2 ? '♪' : '♫', me.px - 14 + i * 9, me.py - 36 - ((t * 20 + i * 9) % 22)); } }
        c.fillStyle = 'rgba(' + L.rgb + ',' + (0.05 + 0.03 * Math.sin(t * 6)) + ')'; c.fillRect(8, 42, W - 16, HH - 52);   // tinte general del neón
      },
      tick: (dt, me) => { if (baila > 0) baila -= dt; },
      act: (ob, me) => { const k = ob.id;
        if (k === 'puerta') me.salir();
        else if (k === 'barra') o.menu && o.menu(menu());
        else if (k === 'pista') { baila = 4; me.decir(pick(['💃 Bailás un rato. Dos pasos para la izquierda, uno para la derecha, y listo.', '🕺 Te movés como podés. La gente aplaude o se ríe, no se sabe.', '🎶 Se te pega el ritmo. Mañana te duelen las piernas.']), 3.2); }
        else if (k === 'dj') me.decir(pick(me.local.tipo === 'karaoke' ? FRASES.karaoke : FRASES.dj), 3.4);
        else me.decir(pick(FRASES.mesa), 3);
      },
    }, { player: o.player, busy: o.busy });
    S.local = LOCALES.bambuddha;
    S.abrir = (id) => { S.local = LOCALES[id] || LOCALES.bambuddha; S.entrar(); };
    return S;
  };
})();
