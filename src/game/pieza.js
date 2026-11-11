// El interior de la pieza (11/11/2026): una escena aparte, chica, vista desde arriba. Cama (dormir), ropero, anafe, limpiar,
// gato, cucaracha, vecinos que se escuchan por la pared y muebles que se compran en el celular (app Mercadito).
// El estado vive en `vida.s.pieza` (items, manchas, gato). El juego queda en pausa mientras estás adentro.
(function () {
  const W = 256, H = 224, FLOOR = 56;
  VR.PIEZA_ITEMS = [
    { k: 'colchon', n: 'Colchón nuevo', ico: '🛏', p: 350000, d: 'Dormir te cura todo y ya no chilla como chancho.' },
    { k: 'ventilador', n: 'Ventilador de pie', ico: '🌀', p: 180000, d: 'Dormís mejor con el calor de Villarrica.' },
    { k: 'heladera', n: 'Heladera', ico: '🧊', p: 900000, d: 'Una vez por día picás algo fresco (gratis).' },
    { k: 'tv', n: 'Tele', ico: '📺', p: 650000, d: 'Para ver cualquier cosa. Menos la novela, esa es de la vecina.' },
    { k: 'sillon', n: 'Sillón', ico: '🛋', p: 400000, d: 'Descansás un rato y recuperás hambre... de sillón.' },
    { k: 'cortinas', n: 'Cortinas', ico: '🪟', p: 60000, d: 'Los vecinos dejan de verte en calzoncillos.' },
    { k: 'alfombra', n: 'Alfombra', ico: '🟫', p: 90000, d: 'Tapa la mancha de 2019. Al gato le encanta.' },
    { k: 'planta', n: 'Lengua de suegra', ico: '🪴', p: 30000, d: 'Se llama así por algo. Aguanta todo.' },
  ];
  const VECINOS = ['🔊 (Pared) Doña Nelly: «¡Bajá esa radio, che, que es martes!»', '🔊 (Pared) Alguien ensaya guitarra. Siempre la misma nota. Siempre.', '🔊 (Pared) «Nde, ¿quién se llevó mi cuchara?» «¡Yo no fui!»', '🔊 (Pared) Un gallo. A las tres de la tarde. Nadie sabe por qué.', '🔊 (Pared) Gritos de gol. Parece que el Cerro metió uno. O no, quizás se cayó una olla.', '🔊 (Techo) Algo rodó. Algo grande. Después, silencio sospechoso.'];
  const TELE = ['📺 Noticiero: «Nuevo bache en Mcal. López. El bache ya tiene su propio nombre.»', '📺 Novela: «¡Tú no eres mi hijo!» «¡Tampoco soy tu padre!» Muy bien escrita.', '📺 Partido: el árbitro fue a mirar el VAR y no volvió.', '📺 Publicidad de un colchón que "cambia tu vida". Tu colchón te mira mal.', '📺 Programa de cocina: hacen chipa con trufa. Ña Ramona se rió desde la otra pared.'];
  const GATO = ['🐈 Mbarakaja te mira con desprecio. Después se acuesta en tu cama.', '🐈 Ronronea. Es un motor de moto, pero más suave.', '🐈 Te trajo un regalo: media cucaracha. Qué cariño.', '🐈 Se estira. Ocupa toda la alfombra. Es su pieza ahora.'];
  const MANCHAS = [[108, 100], [40, 160], [190, 176], [130, 188], [150, 128], [226, 188]];
  VR.Pieza = class {
    constructor(o) { Object.assign(this, o); this.on = false; this.t = 0; this.say = null;
      const d = this.el = document.createElement('div'); d.id = 'piezaView'; d.hidden = true;
      d.innerHTML = '<canvas></canvas><div id="pzHint"></div><button id="pzOut" title="Salir">🚪 Salir</button>'; document.body.append(d);
      this.cv = d.querySelector('canvas'); this.g = this.cv.getContext('2d'); this.hint = d.querySelector('#pzHint'); this.off = document.createElement('canvas'); this.off.width = W; this.off.height = H; this.og = this.off.getContext('2d');
      d.querySelector('#pzOut').onclick = () => this.salir(); addEventListener('resize', () => this.fit());
    }
    get P() { return this.vida.s.pieza; }
    has(k) { return !!(this.P.items && this.P.items[k]); }
    fit() { const u = Math.max(1, Math.min(innerWidth / W, (innerHeight - 52) / H) * 0.96); this.u = u; this.cv.width = Math.round(W * u); this.cv.height = Math.round(H * u); this.cv.style.width = this.cv.width + 'px'; this.cv.style.height = this.cv.height + 'px'; }
    entrar() {
      if (this.on) return; const P = this.P; P.items = P.items || {}; P.manchas = P.manchas | 0;
      this.on = true; this.el.hidden = false; document.body.classList.add('adentro'); this.fit();
      VR.input.releaseAll(); VR.input.enabled = true; VR.loop.paused = true;
      this.px = 40; this.py = 200; this.dir = 'up'; this.anim = 0; this.vecT = 12 + Math.random() * 10; this.roach = this.limpias() < 5 ? { x: 150, y: 150, a: 0 } : null;
      this.cat = P.gato ? { x: 130, y: 135, tx: 130, ty: 135, w: 3 } : null; this.last = performance.now(); requestAnimationFrame((t) => this.loop(t));
      this.decir('🏠 ' + (this.limpias() < 3 ? 'Tu pieza. Huele a humedad y a decisiones.' : 'Tu pieza. Ya parece un hogar.'));
    }
    salir() { if (!this.on) return; this.on = false; this.el.hidden = true; document.body.classList.remove('adentro'); VR.input.releaseAll(); VR.input.enabled = true; VR.loop.paused = false; }
    limpias() { let n = 0; for (let i = 0; i < 6; i++) if (this.P.manchas & (1 << i)) n++; return n; }
    decir(t, s = 3.2) { this.say = { t, s }; }
    // objetos con los que se puede hacer algo: caja sólida (x, y, w, h), punto de acción (ax, ay) y radio
    objs() {
      const P = this.P, o = [
        { id: 'cama', x: 12, y: 60, w: 58, h: 90, ax: 42, ay: 158, r: 28, h2: '🛏 ACCIÓN: dormir' },
        { id: 'ropero', x: 98, y: 30, w: 42, h: 44, ax: 119, ay: 88, r: 26, h2: '👕 ACCIÓN: ropero' },
        { id: 'radio', x: 72, y: 60, w: 18, h: 16, ax: 81, ay: 88, r: 20, h2: '📻 ACCIÓN: radio' },
        { id: 'ventana', x: 150, y: 10, w: 50, h: 40, ax: 175, ay: 74, r: 24, h2: '🪟 ACCIÓN: mirar afuera' },
        { id: 'anafe', x: 176, y: 96, w: 62, h: 34, ax: 206, ay: 142, r: 28, h2: '🍵 ACCIÓN: preparar mate cocido' },
        { id: 'puerta', x: 24, y: 214, w: 32, h: 10, ax: 40, ay: 206, r: 22, h2: '🚪 ACCIÓN: salir', ghost: true },
        { id: 'heladera', x: 212, y: 34, w: 30, h: 56, ax: 227, ay: 100, r: 20, h2: this.has('heladera') ? '🧊 ACCIÓN: picar algo' : '🧊 ACCIÓN: la conservadora' },
      ];
      if (this.has('tv')) o.push({ id: 'tv', x: 102, y: 144, w: 44, h: 34, ax: 124, ay: 196, r: 26, h2: '📺 ACCIÓN: mirar la tele' });
      if (this.has('sillon')) o.push({ id: 'sillon', x: 168, y: 160, w: 60, h: 36, ax: 198, ay: 204, r: 26, h2: '🛋 ACCIÓN: descansar' });
      MANCHAS.forEach(([x, y], i) => { if (!(P.manchas & (1 << i))) o.push({ id: 'mancha' + i, x: x - 8, y: y - 6, w: 16, h: 12, ax: x, ay: y, r: 16, h2: '🧹 ACCIÓN: limpiar', ghost: true }); });
      if (this.cat) o.push({ id: 'gato', x: this.cat.x - 7, y: this.cat.y - 5, w: 14, h: 10, ax: this.cat.x, ay: this.cat.y + 2, r: 20, h2: '🐈 ACCIÓN: acariciar a Mbarakaja', ghost: true });
      if (this.roach) o.push({ id: 'cuca', x: this.roach.x - 5, y: this.roach.y - 4, w: 10, h: 8, ax: this.roach.x, ay: this.roach.y, r: 16, h2: '🩴 ACCIÓN: ¡chinelazo!', ghost: true });
      return o;
    }
    blocked(x, y) { // pies (x, y) contra paredes y muebles sólidos
      if (x < 16 || x > 240 || y < FLOOR + 22 || y > 212) return true;
      for (const o of this.objs()) if (!o.ghost && x > o.x - 4 && x < o.x + o.w + 4 && y > o.y + o.h * 0.3 - 2 && y < o.y + o.h + 4) return true;
      return false;
    }
    act(o) {
      const P = this.P, V = this.vida, k = o.id;
      if (k === 'puerta') this.salir();
      else if (k === 'ropero') this.ropero(() => { VR.loop.paused = true; VR.input.releaseAll(); VR.input.enabled = true; });
      else if (k === 'cama') {
        const txt = V.puedeDormir() ? 'Son las ' + V.hhmm + '. ' + (this.has('colchon') ? 'El colchón nuevo te abraza.' : 'El colchón chilla como un chancho en San Juan.') : 'Todavía es temprano (se duerme desde las 18:00). El colchón igual te mira con ganas.';
        VR.Dialogo.show([{ quien: 'sis', titulo: '🛏 Tu cama', txt, op: [['😴 Dormir hasta las 6:00', () => { if (V.dormir()) { this.px = 42; this.py = 170; this.dir = 'down'; this.decir('☀ Buen día. ' + (this.has('ventilador') ? 'Dormiste fresquito.' : 'Dormiste transpirando, pero dormiste.')); } return false; }], ['Mejor no', () => false]] }]);
      } else if (k === 'radio') { V.s.min += 5; V.sync(); this.decir(['📻 Suena una polka. Sin lírica: es solo guitarra y arpa. Se te mueve el pie.', '📻 Una radio AM: «…y el tránsito en la avenida, hoy, como siempre, mal.»', '📻 Se corta. La golpeás. Vuelve. Así funciona la tecnología paraguaya.'][(Math.random() * 3) | 0]); }
      else if (k === 'ventana') this.decir(['🪟 Afuera: un señor corre atrás de su gorra con mucha dignidad.', '🪟 Afuera: una moto pasa con cuatro personas y una heladera. Normal.', '🪟 Afuera: un perro te mira. Te juzga. Se va.', this.has('cortinas') ? '🪟 Las cortinas se mueven con la brisa. Elegante.' : '🪟 Un vecino te saluda. Estás en calzoncillos. Ambos fingen.'][(Math.random() * 4) | 0]);
      else if (k === 'anafe') { if (V.s.hambre >= 95) this.decir('🍵 No tenés hambre. El mate cocido te mira, dolido.'); else { V.s.min += 10; V.s.hambre = Math.min(100, V.s.hambre + 6); V.sync(); this.decir('🍵 Mate cocido con pan viejo. Cinco estrellas en el ranking de los pobres. (+6 hambre)'); } }
      else if (k === 'heladera') {
        if (!this.has('heladera')) this.decir('🧊 La conservadora: hielo derretido, un tomate y la promesa de una heladera.');
        else { const dia = Math.floor(V.s.min / 1440); if (P.heladDia === dia) this.decir('🧊 Ya picaste hoy. La heladera guarda silencio, juzgándote.'); else { P.heladDia = dia; V.s.hambre = Math.min(100, V.s.hambre + 10); V.sync(); this.decir('🧊 Sobras de ayer, frías y perfectas. (+10 hambre)'); } }
      } else if (k === 'tv') { V.s.min += 30; V.sync(); this.decir(TELE[(Math.random() * TELE.length) | 0]); }
      else if (k === 'sillon') { V.s.min += 20; V.sync(); this.decir('🛋 Te hundís en el sillón. Pasan 20 minutos. No hiciste nada y estuvo perfecto.'); }
      else if (k === 'gato') this.decir(GATO[(Math.random() * GATO.length) | 0]);
      else if (k === 'cuca') { this.roach = null; this.decir('🩴 ¡Chinelazo! Estaba en la pieza desde antes que vos. Descanse en paz.'); }
      else if (k.startsWith('mancha')) {
        const i = +k.slice(6); P.manchas |= 1 << i; V.s.min += 8; V.sync(); const n = this.limpias();
        this.decir(['🧹 Restregás. La mancha tiene historia, pero se va.', '🧹 Esta mancha parecía un mapa de Sudamérica. Ya no.', '🧹 Ñanduti de telaraña fuera.', '🧹 Un tesoro: ¡500 Gs. bajo la mugre!', '🧹 Casi no queda nada. Estás en modo mamá.', '🧹 ¡Todo limpio! Hasta brilla.'][n - 1] || '🧹 Limpiaste.');
        if (n === 3 && !P.gato) { P.gato = true; this.cat = { x: 130, y: 135, tx: 130, ty: 135, w: 3 }; setTimeout(() => this.decir('🐈 Un gato flaco entró por la ventana. Se llama Mbarakaja. Ya es tuyo.', 4.5), 1800); }
        if (n === 6 && !P.premio) { P.premio = true; VR.Wallet.add(20000, 'Ña Ramona (propina por la pieza limpia)'); setTimeout(() => this.decir('🏠 Ña Ramona asomó: «¡Qué linda quedó! Tomá para el mate.» (+20.000 Gs.)', 4.5), 1800); }
      }
    }
    loop(t) {
      if (!this.on) return; const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t; this.t += dt;
      VR.loop.paused = true; // el menú del lugar reanuda el juego al cerrarse: acá adentro siempre en pausa
      VR.input.poll(); const busy = VR.Dialogo.abierto || this.busy();
      if (!busy) this.update(dt); else { this.moving = false; }
      this.draw(); VR.input.consume(); requestAnimationFrame((tt) => this.loop(tt));
    }
    update(dt) {
      const ax = VR.input.ax, ay = VR.input.ay, sp = 58, run = VR.input.down('run') ? 1.5 : 1; this.moving = false;
      if (ax || ay) { const nx = this.px + ax * sp * run * dt, ny = this.py + ay * sp * run * dt; if (!this.blocked(nx, this.py)) this.px = nx; if (!this.blocked(this.px, ny)) this.py = ny; this.moving = true; this.anim += dt * 9 * run; this.dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : (ay > 0 ? 'down' : 'up'); }
      // la cosa más cercana en rango
      let best = null, bd = 1e9; for (const o of this.objs()) { const d = Math.hypot(o.ax - this.px, o.ay - this.py); if (d < o.r && d < bd) { best = o; bd = d; } }
      this.near = best; this.hint.textContent = best ? best.h2 : ''; this.hint.classList.toggle('on', !!best);
      if (best && VR.input.pressed('action')) this.act(best);
      if (this.say && (this.say.s -= dt) <= 0) this.say = null;
      if ((this.vecT -= dt) <= 0) { this.vecT = 25 + Math.random() * 25; this.decir(VECINOS[(Math.random() * VECINOS.length) | 0], 4.2); }
      const c = this.cat; if (c) { c.w -= dt; if (c.w <= 0) { c.w = 3 + Math.random() * 5; const pts = [[40, 150], [130, 135], [200, 170], [120, 190], [90, 110]]; const p = pts[(Math.random() * pts.length) | 0]; c.tx = p[0]; c.ty = p[1]; } const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy); if (d > 1) { c.x += dx / d * 14 * dt; c.y += dy / d * 14 * dt; } c.mov = d > 1; }
      const r = this.roach; if (r) { r.a += (Math.random() - 0.5) * 3 * dt; r.x += Math.cos(r.a) * 26 * dt; r.y += Math.sin(r.a) * 26 * dt; if (r.x < 20 || r.x > 236) r.a = Math.PI - r.a; if (r.y < 84 || r.y > 206) r.a = -r.a; r.x = Math.max(20, Math.min(236, r.x)); r.y = Math.max(84, Math.min(206, r.y)); }
    }
    draw() {
      const g = this.og, P = this.P; g.imageSmoothingEnabled = false; this.room(g);
      const items = [], pl = { sy: this.py, f: () => this.drawPlayer(g) }; items.push(pl); if (this.cat) items.push({ sy: this.cat.y, f: () => this.drawCat(g) }); if (this.roach) items.push({ sy: this.roach.y, f: () => { g.fillStyle = '#2a1608'; g.beginPath(); g.ellipse(this.roach.x, this.roach.y, 4, 2.4, this.roach.a, 0, 7); g.fill(); g.fillStyle = '#5a3418'; g.fillRect(this.roach.x - 1, this.roach.y - 1, 2, 1); } });
      items.sort((a, b) => a.sy - b.sy).forEach((i) => i.f()); void P;
      const c = this.g, u = this.u; c.imageSmoothingEnabled = false; c.clearRect(0, 0, this.cv.width, this.cv.height); c.drawImage(this.off, 0, 0, this.cv.width, this.cv.height);
      if (this.say) { const w = Math.min(this.cv.width - 20, 520), x = (this.cv.width - w) / 2, y = 10; c.font = '700 ' + Math.max(12, 5.5 * u) + 'px system-ui'; const words = this.say.t.split(' '); let lines = [], ln = ''; for (const wd of words) { if (c.measureText(ln + wd).width > w - 24) { lines.push(ln); ln = ''; } ln += wd + ' '; } lines.push(ln); const lh = Math.max(15, 7 * u);
        c.fillStyle = 'rgba(14,16,24,.92)'; c.strokeStyle = '#ffd84a'; c.lineWidth = 2; c.beginPath(); c.roundRect(x, y, w, lines.length * lh + 14, 10); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.textBaseline = 'top'; lines.forEach((l, i) => c.fillText(l, x + 12, y + 8 + i * lh)); }
    }
    drawPlayer(g) {
      const spr = this.player.sprites; if (!spr) return; const img = this.moving ? spr.get(this.dir, 'walk', Math.floor(this.anim) % 8) : spr.get(this.dir, 'idle', 0);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(this.px, this.py, 9, 3.4, 0, 0, 7); g.fill(); g.drawImage(img, this.px - 15, this.py - 56, 30, 60);
    }
    drawCat(g) {
      const c = this.cat, x = Math.round(c.x), y = Math.round(c.y), t = this.t; g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 8, y + 1, 16, 3);
      g.fillStyle = '#c98a3a'; g.fillRect(x - 7, y - 5, 14, 7); g.fillStyle = '#e8b060'; g.fillRect(x - 7, y - 5, 14, 2); g.fillStyle = '#a06a28'; g.fillRect(x - 3, y - 4, 2, 5); g.fillRect(x + 2, y - 4, 2, 5);
      g.fillStyle = '#c98a3a'; g.fillRect(x + 6, y - 9, 6, 6); g.fillStyle = '#e8b060'; g.fillRect(x + 6, y - 9, 6, 2); g.fillRect(x + 6, y - 11, 2, 2); g.fillRect(x + 10, y - 11, 2, 2); g.fillStyle = '#1a1410'; g.fillRect(x + 8, y - 7, 1, 1); g.fillRect(x + 10, y - 7, 1, 1);
      g.fillStyle = '#a06a28'; g.fillRect(x - 11 + Math.round(Math.sin(t * 4)), y - 6, 4, 2);
    }
    // el cuarto: pared, piso, mugre y los muebles (los que no se compraron no aparecen)
    room(g) {
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, P = this.P, it = (k) => this.has(k);
      R(0, 0, W, H, '#2a2018'); R(8, 0, W - 16, FLOOR, '#b9c9a8'); R(8, 0, W - 16, 4, '#9aab8a'); R(8, FLOOR - 4, W - 16, 4, '#7a6a52'); // pared verde descascarada
      for (let i = 0; i < 9; i++) R(12 + i * 27 + (i % 3) * 5, 8 + (i % 4) * 9, 9 + (i % 3) * 4, 6, '#a4b392'); // descascarado
      for (let y = FLOOR; y < H - 8; y += 20) for (let x = 8; x < W - 8; x += 20) { const o = ((x / 20 + y / 20) | 0) % 2; R(x, y, 20, 20, o ? '#b8553c' : '#a8482f'); R(x, y, 20, 1, '#8a3a26'); R(x, y, 1, 20, '#8a3a26'); if (((x * 7 + y * 3) % 5) === 0) R(x + 5, y + 6, 6, 1, '#c8705a'); } // cerámica roja gastada
      R(8, H - 8, W - 16, 8, '#4a3a2c'); R(24, H - 10, 32, 10, '#1a1410'); R(26, H - 9, 28, 9, '#3a2a1c'); // zócalo y puerta (abajo)
      R(0, FLOOR, 8, H - FLOOR, '#7a6a52'); R(W - 8, FLOOR, 8, H - FLOOR, '#7a6a52');
      if (it('alfombra')) { R(80, 118, 96, 56, '#2f6b86'); R(84, 122, 88, 48, '#3f86a8'); for (let x = 88; x < 168; x += 8) R(x, 126, 3, 40, '#e8c060'); R(80, 118, 96, 2, '#1f4a60'); }
      // mugre (manchas todavía sin limpiar) y telarañas
      MANCHAS.forEach(([x, y], i) => { if (!(P.manchas & (1 << i))) { R(x - 8, y - 4, 16, 8, 'rgba(40,24,10,.45)'); R(x - 5, y - 6, 10, 12, 'rgba(40,24,10,.45)'); R(x - 3, y - 2, 4, 2, 'rgba(20,10,4,.5)'); } });
      if (this.limpias() < 3) { R(10, FLOOR + 2, 14, 1, '#e8e8e8'); R(10, FLOOR + 2, 1, 14, '#e8e8e8'); R(14, FLOOR + 4, 8, 1, '#e8e8e8'); R(W - 24, FLOOR + 2, 14, 1, '#e8e8e8'); R(W - 11, FLOOR + 2, 1, 14, '#e8e8e8'); }
      // ventana (+ cortinas)
      R(150, 10, 50, 40, '#5a4a3a'); R(153, 13, 44, 34, '#8cc8e8'); R(153, 13, 44, 12, '#b8e0f4'); R(174, 13, 2, 34, '#5a4a3a'); R(153, 29, 44, 2, '#5a4a3a'); R(158, 20, 6, 3, '#fff'); R(182, 34, 8, 3, '#6aa850');
      if (it('cortinas')) { R(150, 8, 54, 5, '#7a4a8a'); R(150, 8, 14, 44, '#9a5aaa'); R(190, 8, 14, 44, '#9a5aaa'); for (let y = 12; y < 50; y += 6) { R(154, y, 1, 4, '#7a3a8a'); R(194, y, 1, 4, '#7a3a8a'); } }
      // cama (cabecera arriba)
      R(12, 60, 58, 90, '#6a4a2a'); R(15, 64, 52, 82, it('colchon') ? '#e8e2d2' : '#c8b88a'); R(15, 64, 52, 2, '#fff'); R(20, 68, 42, 14, it('colchon') ? '#fff' : '#ddd'); R(15, 92, 52, 54, it('colchon') ? '#3f7fc8' : '#9a4a3a'); R(15, 92, 52, 3, it('colchon') ? '#5f9fe8' : '#b86a5a');
      for (let y = 100; y < 146; y += 9) R(15, y, 52, 1, 'rgba(0,0,0,.14)'); if (!it('colchon')) { R(30, 112, 12, 8, '#7a3a2c'); R(46, 128, 8, 6, '#7a3a2c'); }
      R(12, 148, 58, 4, '#4a3018');
      // mesita con radio
      R(72, 62, 18, 20, '#8a5a30'); R(72, 62, 18, 3, '#a8703a'); R(75, 54, 12, 9, '#c8b040'); R(77, 56, 5, 5, '#2a2a2a'); R(84, 55, 1, 3, '#ccc');
      // ropero
      R(98, 28, 42, 48, '#7a5028'); R(100, 30, 18, 44, '#9a6a38'); R(120, 30, 18, 44, '#9a6a38'); R(118, 30, 2, 44, '#3a2410'); R(115, 50, 2, 5, '#d8c060'); R(121, 50, 2, 5, '#d8c060'); R(98, 74, 42, 3, '#4a3018'); R(132, 36, 4, 22, '#ddd'); R(98, 28, 42, 2, '#a8703a'); R(104, 66, 8, 6, '#e8e0c8'); R(124, 62, 8, 12, '#2a6ab8');
      // anafe en la mesa
      R(176, 96, 62, 34, '#8a5a30'); R(176, 96, 62, 4, '#a8703a'); R(176, 128, 62, 3, '#4a3018'); R(182, 82, 26, 16, '#5a5a62'); R(184, 80, 22, 4, '#8a8a92'); R(188, 74, 14, 8, '#c8c8d0'); R(184, 70, 8, 4, '#a8a8b0'); R(214, 86, 16, 12, '#2a5aa8'); R(216, 88, 12, 4, '#5a8ad8'); R(209, 94, 6, 2, '#3a3a3a');
      // heladera o conservadora
      if (it('heladera')) { R(212, 34, 30, 56, '#e8eef0'); R(212, 34, 30, 3, '#fff'); R(212, 62, 30, 2, '#b8c0c4'); R(238, 42, 2, 14, '#8a9296'); R(238, 70, 2, 14, '#8a9296'); R(212, 88, 30, 2, '#9aa2a6'); R(216, 40, 8, 4, '#c8e0f0'); } else { R(214, 64, 26, 20, '#c8302a'); R(214, 64, 26, 6, '#f0f0f0'); R(224, 58, 6, 6, '#a82820'); R(214, 82, 26, 2, '#7a1a14'); }
      if (it('ventilador')) { R(150, 100, 14, 3, '#ccc'); R(156, 88, 2, 14, '#aaa'); g.fillStyle = '#cfd8e0'; g.beginPath(); g.arc(157, 82, 9, 0, 7); g.fill(); g.strokeStyle = '#6a7a88'; g.lineWidth = 1; for (let a = 0; a < 3; a++) { g.beginPath(); g.moveTo(157, 82); g.lineTo(157 + Math.cos(a * 2.1 + this.t * 14) * 7, 82 + Math.sin(a * 2.1 + this.t * 14) * 7); g.stroke(); } }
      if (it('planta')) { R(86, 170, 12, 10, '#a85a2a'); R(87, 169, 10, 2, '#c8703a'); g.fillStyle = '#3a8a3a'; for (let i = 0; i < 5; i++) { g.fillRect(88 + i * 2, 152 + (i % 2) * 4, 3, 18); } R(89, 150, 2, 6, '#5ab850'); }
      if (it('tv')) { R(102, 156, 44, 22, '#5a3a20'); R(104, 144, 40, 28, '#222'); const on = this.near && this.near.id === 'tv'; R(107, 147, 34, 21, on ? '#4a90d8' : '#16202a'); if (on) { R(110, 152, 12, 8, '#e8c040'); R(126, 156, 12, 6, '#e85a5a'); } R(112, 172, 24, 3, '#444'); R(108, 176, 32, 2, '#1a1410'); }
      if (it('sillon')) { R(168, 160, 60, 36, '#7a3a5a'); R(168, 160, 60, 12, '#9a4a72'); R(172, 174, 52, 18, '#8a4264'); R(168, 172, 8, 22, '#6a2e4c'); R(220, 172, 8, 22, '#6a2e4c'); R(168, 194, 60, 3, '#3a1a2a'); }
      g.fillStyle = 'rgba(255,230,160,.05)'; g.fillRect(150, 50, 60, 120); // un poquito de luz de la ventana
    }
  };
})();
