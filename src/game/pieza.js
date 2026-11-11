// El interior de la pieza (11/11/2026): una escena aparte, chica, vista desde arriba. Cama (dormir), ropero, anafe, limpiar,
// gato, cucaracha, vecinos que se escuchan por la pared y muebles que se compran en el celular (app Mercadito).
// El estado vive en `vida.s.pieza` (items, manchas, gato). El juego queda en pausa mientras estás adentro.
(function () {
  const W = 256, H_ = 224, FLOOR = 56;
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
      this.cv = d.querySelector('canvas'); this.g = this.cv.getContext('2d'); this.hint = d.querySelector('#pzHint'); this.off = document.createElement('canvas'); this.off.width = 1; this.off.height = 1; this.og = this.off.getContext('2d');
      d.querySelector('#pzOut').onclick = () => this.salir(); addEventListener('resize', () => this.fit());
    }
    get P() { return this.vida.s.pieza; }
    has(k) { return !!(this.P.items && this.P.items[k]); }
    fit() { const u = Math.max(1, Math.min(innerWidth / W, (innerHeight - 52) / H_) * 0.96), dpr = Math.min(2, window.devicePixelRatio || 1); this.u = u; this.s = u * dpr; this.cv.width = Math.round(W * u * dpr); this.cv.height = Math.round(H_ * u * dpr); this.cv.style.width = Math.round(W * u) + 'px'; this.cv.style.height = Math.round(H_ * u) + 'px'; this.bgKey = null; }
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
    // ---- dibujo en alta (11/11/2026): la escena es vectorial y se pinta a la resolución de la pantalla (no es el sprite chico de la calle) ----
    draw() {
      const c = this.g, s = this.s, P = this.P; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.cv.width, this.cv.height);
      const key = JSON.stringify([P.items, P.manchas, s, this.noche()]); if (key !== this.bgKey || !this.bg) { this.bgKey = key; this.buildBG(); }
      c.drawImage(this.bg, 0, 0); c.save(); c.scale(s, s); c.imageSmoothingEnabled = true;
      const items = [{ sy: this.py, f: () => this.drawPlayer(c) }]; if (this.cat) items.push({ sy: this.cat.y, f: () => this.drawCat(c) }); if (this.roach) items.push({ sy: this.roach.y, f: () => this.drawRoach(c) });
      this.dyn(c, 0); items.sort((a, b) => a.sy - b.sy).forEach((i) => i.f()); this.dyn(c, 1); c.restore();
      if (this.say) { c.setTransform(1, 0, 0, 1, 0, 0); const w = Math.min(this.cv.width - 20, 520 * (s / this.u)), x = (this.cv.width - w) / 2, y = 10 * (s / this.u), kk = s / this.u; c.font = '700 ' + Math.max(12 * kk, 5.5 * s) + 'px system-ui'; const words = this.say.t.split(' '); let lines = [], ln = ''; for (const wd of words) { if (c.measureText(ln + wd).width > w - 24 * kk) { lines.push(ln); ln = ''; } ln += wd + ' '; } lines.push(ln); const lh = Math.max(15 * kk, 7 * s);
        c.fillStyle = 'rgba(14,16,24,.92)'; c.strokeStyle = '#ffd84a'; c.lineWidth = 2 * kk; c.beginPath(); c.roundRect(x, y, w, lines.length * lh + 14 * kk, 10 * kk); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.textBaseline = 'top'; lines.forEach((l, i) => c.fillText(l, x + 12 * kk, y + 8 * kk + i * lh)); }
    }
    noche() { const h = this.vida && this.vida.hora; return h === undefined ? 0 : (h >= 19.5 || h < 5.5) ? 1 : (h >= 18 || h < 6.5) ? 0.5 : 0; }
    // lo que se mueve o cambia: aspas del ventilador, pantalla de la tele, vapor del anafe y polvo en la luz (0 = detrás de la gente, 1 = delante)
    dyn(g, pass) {
      const t = this.t, it = (k) => this.has(k);
      if (pass === 0) {
        if (it('ventilador')) { g.save(); g.translate(157, 80); g.fillStyle = 'rgba(200,214,226,.35)'; g.beginPath(); g.ellipse(0, 0, 9.5, 9.5, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(70,88,104,.9)'; g.lineWidth = 0.7; for (let a = 0; a < 3; a++) { const an = a * 2.094 + t * 22; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(an - 0.3) * 5, Math.sin(an - 0.3) * 5, Math.cos(an) * 8, Math.sin(an) * 8); g.stroke(); } g.fillStyle = '#556a7c'; g.beginPath(); g.arc(0, 0, 1.6, 0, 7); g.fill(); g.strokeStyle = 'rgba(40,52,64,.8)'; g.lineWidth = 0.5; g.beginPath(); g.arc(0, 0, 9.5, 0, 7); g.stroke(); g.restore(); }
        if (it('tv')) { const on = this.near && this.near.id === 'tv'; g.save(); g.beginPath(); g.roundRect(107, 147, 34, 21, 2); g.clip(); if (on) { const gr = g.createLinearGradient(107, 147, 141, 168); gr.addColorStop(0, '#5aa6ec'); gr.addColorStop(1, '#2c66b0'); g.fillStyle = gr; g.fillRect(107, 147, 34, 21); const o = (t * 18) % 34; g.fillStyle = '#e8c040'; g.fillRect(110, 152, 12, 8); g.fillStyle = '#e85a5a'; g.fillRect(126, 156, 12, 6); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(107 + o, 147, 3, 21); g.fillStyle = 'rgba(255,255,255,.1)'; for (let y = 147; y < 168; y += 2) g.fillRect(107, y, 34, 0.6); } else { const gr = g.createLinearGradient(107, 147, 141, 168); gr.addColorStop(0, '#1d2a36'); gr.addColorStop(1, '#0c1218'); g.fillStyle = gr; g.fillRect(107, 147, 34, 21); g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(107, 147); g.lineTo(125, 147); g.lineTo(107, 160); g.fill(); } g.restore();
          if (on) { const gl = g.createRadialGradient(124, 172, 4, 124, 172, 60); gl.addColorStop(0, 'rgba(110,170,240,.28)'); gl.addColorStop(1, 'rgba(110,170,240,0)'); g.fillStyle = gl; g.fillRect(60, 120, 130, 100); } }
      } else {
        // vapor del agua en el anafe
        for (let i = 0; i < 4; i++) { const ph = (t * 0.7 + i * 0.25) % 1, x = 195 + Math.sin(t * 2 + i * 2) * 1.6 + i * 0.8, y = 96 - ph * 16; g.fillStyle = 'rgba(255,255,255,' + (0.22 * (1 - ph)).toFixed(3) + ')'; g.beginPath(); g.arc(x, y, 1.6 + ph * 2.4, 0, 7); g.fill(); }
        // polvo en el rayo de luz de la ventana
        const nt = this.noche(); if (nt < 1) for (let i = 0; i < 14; i++) { const x = 150 + ((i * 53 + t * (3 + i % 3)) % 70), y = 58 + ((i * 37 + t * 4) % 110); g.fillStyle = 'rgba(255,240,200,' + (0.35 * (1 - nt)).toFixed(2) + ')'; g.fillRect(x, y, 0.6, 0.6); }
      }
    }
    drawPlayer(g) {
      const spr = this.hq || (this.hq = VR.av2Lazy(this.player.lookData, 7)); if (this.hqLook !== this.player.lookData) { this.hqLook = this.player.lookData; this.hq = VR.av2Lazy(this.player.lookData, 7); } const img = (this.moving ? this.hq.get(this.dir, 'walk', Math.floor(this.anim) % 8) : this.hq.get(this.dir, 'idle', 0)); if (!img) return;
      const sc = 1.62, w = 16 * sc, h = 32 * sc, x = this.px, y = this.py;
      const gr = g.createRadialGradient(x, y + 1, 1, x, y + 1, 11); gr.addColorStop(0, 'rgba(0,0,0,.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y + 1, 11, 4.2, 0, 0, 7); g.fill();
      g.drawImage(img, x - 8 * sc, y - 31.5 * sc, w, h);
    }
    drawCat(g) {
      const c = this.cat, t = this.t, fl = c.tx < c.x - 1 ? -1 : c.tx > c.x + 1 ? 1 : (c.fl || 1); c.fl = fl; const x = c.x, y = c.y;
      g.save(); g.translate(x, y); g.scale(fl, 1);
      let gr = g.createRadialGradient(0, 1.5, 1, 0, 1.5, 11); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 1.5, 11, 3.2, 0, 0, 7); g.fill();
      const wk = c.mov ? Math.sin(t * 12) : 0, bob = c.mov ? Math.abs(Math.sin(t * 12)) * 0.5 : 0, br = !c.mov ? Math.sin(t * 2) * 0.25 : 0;
      const leg = (lx, ph) => { const o = c.mov ? Math.sin(t * 12 + ph) * 1.6 : 0; g.fillStyle = '#b87a30'; g.beginPath(); g.roundRect(lx + o - 0.9, -3.6, 1.9, 4.6, 0.9); g.fill(); g.fillStyle = '#f2e6d0'; g.beginPath(); g.ellipse(lx + o + 0.1, 1, 1.3, 0.8, 0, 0, 7); g.fill(); };
      leg(-4.6, 0); leg(3.6, 3.14); // patas de atrás y de adelante (lejanas)
      const sw = Math.sin(t * 3) * 2.2; g.strokeStyle = '#c4862e'; g.lineWidth = 1.7; g.lineCap = 'round'; g.beginPath(); g.moveTo(-6.4, -4 - bob); g.bezierCurveTo(-11, -4.5, -11.5 + sw * 0.3, -9, -9 + sw, -12.4); g.stroke(); g.strokeStyle = '#6a3e16'; g.lineWidth = 0.6; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-9.2 - k * 0.8, -5.6 - k * 2); g.lineTo(-8.2 - k * 0.8, -5.2 - k * 2); g.stroke(); }
      let bg = g.createLinearGradient(0, -10, 0, -1); bg.addColorStop(0, '#f0b868'); bg.addColorStop(0.5, '#d89440'); bg.addColorStop(1, '#a8661e'); g.fillStyle = bg; g.beginPath(); g.ellipse(-0.6, -5.2 - bob, 7.6, 4 + br, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(100,56,16,.7)'; g.lineWidth = 0.55; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 2.2 - 0.6, -8.8 - bob); g.quadraticCurveTo(k * 2.2 + 0.2, -6.2, k * 2.2 - 0.4, -3.4 - bob); g.stroke(); }
      g.fillStyle = '#f4e8d2'; g.beginPath(); g.ellipse(0.8, -2.4 - bob, 4.2, 1.5, 0, 0, 7); g.fill();
      leg(-2.6, 3.14); leg(5.2, 0);
      const hx = 6.6, hy = -8.2 - bob; g.fillStyle = bg; g.beginPath(); g.ellipse(hx, hy, 3.7, 3.3, 0, 0, 7); g.fill();
      g.fillStyle = '#d89440'; for (const e of [-1, 1]) { g.beginPath(); g.moveTo(hx + e * 3, hy - 1.4); g.lineTo(hx + e * 2.4, hy - 5); g.lineTo(hx + e * 0.4, hy - 2.8); g.fill(); } g.fillStyle = '#f2a0a0'; for (const e of [-1, 1]) { g.beginPath(); g.moveTo(hx + e * 2.5, hy - 2); g.lineTo(hx + e * 2.2, hy - 3.8); g.lineTo(hx + e * 1, hy - 2.6); g.fill(); }
      g.fillStyle = '#f4e8d2'; g.beginPath(); g.ellipse(hx + 1.2, hy + 1, 1.9, 1.4, 0, 0, 7); g.fill();
      const bl = (Math.sin(t * 0.9) > 0.97); for (const e of [-1, 1]) { const ex = hx + 0.8 + e * 1.35; if (bl) { g.strokeStyle = '#2a1a08'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(ex - 0.6, hy - 0.4); g.lineTo(ex + 0.6, hy - 0.4); g.stroke(); } else { g.fillStyle = '#9ad060'; g.beginPath(); g.ellipse(ex, hy - 0.4, 0.8, 0.9, 0, 0, 7); g.fill(); g.fillStyle = '#10100c'; g.fillRect(ex - 0.15, hy - 1.2, 0.3, 1.6); } }
      g.fillStyle = '#e07a82'; g.fillRect(hx + 1.9, hy + 0.5, 0.7, 0.5); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.25; for (const e of [-1, 1]) { g.beginPath(); g.moveTo(hx + 2, hy + 1); g.lineTo(hx + 5.2, hy + 0.2 + e * 0.8); g.stroke(); }
      g.restore(); void wk;
    }
    drawRoach(g) {
      const r = this.roach; g.save(); g.translate(r.x, r.y); g.rotate(r.a); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0.6, 1, 4.2, 2, 0, 0, 7); g.fill();
      g.strokeStyle = '#3a200c'; g.lineWidth = 0.4; for (let k = -1; k <= 1; k++) for (const e of [-1, 1]) { const w = Math.sin(this.t * 30 + k * 2 + e) * 0.8; g.beginPath(); g.moveTo(k * 1.2, 0); g.lineTo(k * 1.6 + w, e * 3.2); g.stroke(); }
      const bg = g.createLinearGradient(0, -2, 0, 2); bg.addColorStop(0, '#6a3a18'); bg.addColorStop(1, '#2a1406'); g.fillStyle = bg; g.beginPath(); g.ellipse(0, 0, 3.8, 2.1, 0, 0, 7); g.fill(); g.fillStyle = '#3a1c0a'; g.beginPath(); g.ellipse(3.4, 0, 1.4, 1.2, 0, 0, 7); g.fill();
      g.strokeStyle = '#5a3418'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(4.4, -0.4); g.lineTo(6.8, -1.8); g.moveTo(4.4, 0.4); g.lineTo(6.8, 1.8); g.stroke(); g.strokeStyle = 'rgba(255,200,120,.5)'; g.beginPath(); g.moveTo(-3, -0.3); g.lineTo(2.6, -0.3); g.stroke(); g.restore();
    }
    // fondo fijo en alta: pared, piso, muebles, ventana y luz. Se rehace solo si cambia algo (muebles, manchas, hora, tamaño)
    buildBG() {
      const cv = this.bg || (this.bg = document.createElement('canvas')); cv.width = this.cv.width; cv.height = this.cv.height; const g = cv.getContext('2d'), s = this.s, P = this.P, it = (k) => this.has(k), nt = this.noche(), H = VR.hash;
      g.setTransform(s, 0, 0, s, 0, 0); g.imageSmoothingEnabled = true; g.lineJoin = 'round';
      const lin = (x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach((c, i) => q.addColorStop(i / (st.length - 1), c)); return q; };
      const box = (x, y, w, h, st, r = 0, hor = false) => { g.fillStyle = Array.isArray(st) ? (hor ? lin(x, 0, x + w, 0, st) : lin(0, y, 0, y + h, st)) : st; g.beginPath(); if (r) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); };
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const drop = (x, y, w, h, blur = 4, a = 0.4, ox = 2.5, oy = 3.5) => { g.save(); g.shadowColor = 'rgba(8,4,0,' + a + ')'; g.shadowBlur = blur * s; g.shadowOffsetX = ox * s; g.shadowOffsetY = oy * s; g.fillStyle = '#000'; g.fillRect(x, y, w, h); g.restore(); };
      const grain = (x, y, w, h, c, n, seed, hor = true) => { g.strokeStyle = c; g.lineWidth = 0.35; for (let i = 0; i < n; i++) { const o = H(seed, i, 3) * (hor ? h : w), l = 0.4 + H(seed, i, 5) * 0.6, st = H(seed, i, 7) * (1 - l); g.beginPath(); if (hor) { g.moveTo(x + st * w, y + o); g.lineTo(x + (st + l) * w, y + o + (H(seed, i, 9) - 0.5) * 0.8); } else { g.moveTo(x + o, y + st * h); g.lineTo(x + o + (H(seed, i, 9) - 0.5) * 0.8, y + (st + l) * h); } g.stroke(); } };
      R(0, 0, W, H_, '#1e1610');
      // ---- pared del fondo: revoque verde viejo, descascarado y con humedad
      box(8, 0, W - 16, FLOOR, ['#cbd7b8', '#b5c3a2', '#a4b392']);
      for (let i = 0; i < 260; i++) { g.fillStyle = H(i, 1, 21) < 0.5 ? 'rgba(255,255,240,.07)' : 'rgba(40,50,30,.07)'; g.fillRect(10 + H(i, 2, 22) * 236, 3 + H(i, 3, 23) * 46, 0.8 + H(i, 4, 24) * 2.4, 0.6 + H(i, 5, 25)); }
      for (const [px, py, pw, ph, sd] of [[16, 6, 26, 16, 1], [108, 4, 20, 12, 2], [212, 24, 22, 15, 3], [60, 36, 16, 10, 4], [168, 54, 0, 0, 0]]) { if (!pw) continue; g.fillStyle = '#e0d8c0'; g.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, r = 0.5 + H(sd, k, 31) * 0.5; g.lineTo(px + pw / 2 + Math.cos(a) * pw / 2 * r, py + ph / 2 + Math.sin(a) * ph / 2 * r); } g.closePath(); g.fill(); g.strokeStyle = 'rgba(80,60,40,.45)'; g.lineWidth = 0.4; g.stroke(); g.fillStyle = '#b5603f'; g.fillRect(px + pw * 0.3, py + ph * 0.35, pw * 0.25, ph * 0.22); g.fillStyle = '#8a4228'; g.fillRect(px + pw * 0.3, py + ph * 0.35, pw * 0.25, 0.6); }
      { const hm = g.createRadialGradient(236, 0, 2, 236, 0, 46); hm.addColorStop(0, 'rgba(60,70,40,.5)'); hm.addColorStop(1, 'rgba(60,70,40,0)'); g.fillStyle = hm; g.fillRect(190, 0, 58, 56); }
      box(8, 0, W - 16, 5, ['#8e9c7e', '#a4b392']); R(8, 5, W - 16, 0.6, 'rgba(0,0,0,.25)');
      box(8, 49, W - 16, 7, ['#8a7860', '#6e5e48']); R(8, 49, W - 16, 0.8, '#b9a888'); R(8, 55.2, W - 16, 0.8, 'rgba(0,0,0,.35)');
      // telarañas en las esquinas
      g.strokeStyle = 'rgba(245,245,245,.5)'; g.lineWidth = 0.3; for (const [cx, cy, d] of [[8, 5, 1], [248, 5, -1]]) { for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + d * 14, cy + k * 4.5); g.stroke(); } for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(cx + d * k * 4, cy); g.quadraticCurveTo(cx + d * k * 3, cy + k * 3, cx, cy + k * 4.5); g.stroke(); } }
      // calendario, foto, interruptor, toma
      drop(46, 12, 15, 22, 2, 0.35, 1, 1.5); box(46, 12, 15, 22, ['#fbfaf4', '#ece8da']); R(46, 12, 15, 6, '#b8322a'); R(46, 12, 15, 1, '#d8544a'); g.fillStyle = '#fff'; g.font = '700 3.6px system-ui'; g.fillText('NOVIEMBRE', 47.4, 16.5); g.fillStyle = '#6a6a70'; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) g.fillRect(47.4 + c * 2.2, 20.5 + r * 3, 1.3, 1.3); g.fillStyle = '#b8322a'; g.fillRect(53.6, 26.5, 1.4, 1.4); R(52.5, 11, 1.4, 1.5, '#3a2a1c');
      drop(72, 14, 14, 16, 2, 0.35, 1, 1.5); box(72, 14, 14, 16, ['#7a5a38', '#4a3220']); box(73.6, 15.6, 10.8, 12.8, ['#d6e4ee', '#a8c0d0']); g.fillStyle = '#4a7a4a'; g.fillRect(73.6, 24, 10.8, 4.4); g.fillStyle = '#e8b878'; g.beginPath(); g.arc(77.5, 21, 1.6, 0, 7); g.arc(81.2, 21.5, 1.4, 0, 7); g.fill(); g.fillStyle = '#c0504a'; g.fillRect(76.2, 22.4, 2.6, 3.6); g.fillStyle = '#4a6ac0'; g.fillRect(80, 22.8, 2.4, 3.2);
      R(144, 32, 5, 8, '#efece2'); R(144, 32, 5, 0.8, '#fff'); R(146, 34, 1.2, 3, '#b8b4a6'); R(83, 44, 6, 6, '#efece2'); R(84, 45.4, 1, 1.6, '#3a3a3a'); R(86, 45.4, 1, 1.6, '#3a3a3a');
      g.strokeStyle = '#2a2a2e'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(86, 50); g.bezierCurveTo(86, 54, 83, 52, 83, 58); g.stroke();
      // foco colgado
      g.strokeStyle = '#2a2a2e'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(126, 0); g.lineTo(126, 11); g.stroke(); R(124.6, 10, 2.8, 2.4, '#3a3a3e'); { const gl = g.createRadialGradient(126, 15, 1, 126, 15, 52); gl.addColorStop(0, 'rgba(255,236,170,' + (0.2 + 0.4 * nt) + ')'); gl.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gl; g.fillRect(70, 0, 112, 70); } g.fillStyle = '#fff4c8'; g.beginPath(); g.arc(126, 14.4, 2.1, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(125.4, 13.8, 0.8, 0, 7); g.fill();
      // ---- paredes de los costados
      box(0, FLOOR - 6, 8, H_ - FLOOR + 6, ['#7e8c70', '#5f6c52'], 0, true); box(W - 8, FLOOR - 6, 8, H_ - FLOOR + 6, ['#5f6c52', '#7e8c70'], 0, true); R(7.4, FLOOR, 0.8, H_ - FLOOR - 8, 'rgba(0,0,0,.35)'); R(W - 8.2, FLOOR, 0.8, H_ - FLOOR - 8, 'rgba(0,0,0,.35)');
      // ---- piso: cerámica roja gastada
      for (let y = FLOOR, j = 0; y < H_ - 8; y += 20, j++) for (let x = 8, i = 0; x < W - 8; x += 20, i++) {
        const v = H(i, j, 41), base = (i + j) % 2 ? [182, 84, 58] : [168, 72, 48], k = 0.92 + v * 0.16, c = base.map((q) => Math.round(q * k)); const q = g.createLinearGradient(x, y, x + 20, y + 20); q.addColorStop(0, 'rgb(' + c.map((z) => Math.min(255, z + 14)) + ')'); q.addColorStop(0.55, 'rgb(' + c + ')'); q.addColorStop(1, 'rgb(' + c.map((z) => Math.round(z * 0.88)) + ')'); g.fillStyle = q; g.fillRect(x, y, Math.min(20, W - 8 - x), Math.min(20, H_ - 8 - y));
        if (H(i, j, 43) < 0.25) { g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(x + 2, y + 18); g.lineTo(x + 12, y + 2); g.lineTo(x + 16, y + 2); g.lineTo(x + 6, y + 18); g.fill(); }
        if (H(i, j, 44) < 0.12) { g.strokeStyle = 'rgba(40,14,8,.55)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(x + 3 + H(i, j, 45) * 8, y + 1); g.lineTo(x + 8 + H(i, j, 46) * 6, y + 8); g.lineTo(x + 6 + H(i, j, 47) * 8, y + 18); g.stroke(); }
        if (H(i, j, 48) < 0.2) { g.fillStyle = 'rgba(50,20,10,.18)'; g.beginPath(); g.ellipse(x + 4 + H(i, j, 49) * 12, y + 4 + H(i, j, 50) * 12, 1.5 + H(i, j, 51) * 2.5, 1 + H(i, j, 52) * 1.5, 0, 0, 7); g.fill(); } }
      g.fillStyle = '#5e2618'; for (let y = FLOOR; y <= H_ - 8; y += 20) g.fillRect(8, y - 0.35, W - 16, 0.7); for (let x = 8; x <= W - 8; x += 20) g.fillRect(x - 0.35, FLOOR, 0.7, H_ - 8 - FLOOR);
      { const sd = g.createLinearGradient(0, FLOOR, 0, FLOOR + 14); sd.addColorStop(0, 'rgba(0,0,0,.42)'); sd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sd; g.fillRect(8, FLOOR, W - 16, 14); }
      for (const [cx, cy] of [[8, FLOOR], [W - 8, FLOOR], [8, H_ - 8], [W - 8, H_ - 8]]) { const dg = g.createRadialGradient(cx, cy, 2, cx, cy, 44); dg.addColorStop(0, 'rgba(30,14,6,.34)'); dg.addColorStop(1, 'rgba(30,14,6,0)'); g.fillStyle = dg; g.fillRect(8, FLOOR, W - 16, H_ - 8 - FLOOR); }
      // ---- pared de abajo + puerta
      box(8, H_ - 10, W - 16, 10, ['#6a5a46', '#3a2e22']); R(8, H_ - 10, W - 16, 0.8, '#a09078');
      drop(23, 206, 34, 16, 3, 0.4, 0, -2); box(22, 204, 36, 20, '#2a1c10'); box(24.5, 206.5, 31, 17.5, ['#8a6034', '#6a4824', '#5a3c1c']); R(24.5, 206.5, 31, 0.8, '#b08050'); for (const [px, py, pw, ph] of [[27, 209, 11, 12], [42, 209, 11, 12]]) { box(px, py, pw, ph, ['#6a4824', '#7e5830']); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.4; g.strokeRect(px, py, pw, ph); R(px, py, pw, 0.5, 'rgba(255,230,190,.3)'); } grain(24.5, 206.5, 31, 17, 'rgba(0,0,0,.18)', 10, 61, false); g.fillStyle = '#d8b84a'; g.beginPath(); g.arc(52, 216, 1.3, 0, 7); g.fill(); g.fillStyle = '#fff8c0'; g.fillRect(51.4, 215.4, 0.6, 0.6); R(24.5, 223.4, 31, 0.6, 'rgba(255,240,200,.55)');
      // ---- alfombra
      if (it('alfombra')) { drop(80, 118, 96, 56, 3, 0.3, 0.8, 1.2); box(80, 118, 96, 56, ['#2c6a86', '#245a74'], 3); box(83, 121, 90, 50, 'rgba(0,0,0,0)', 2); g.strokeStyle = '#e8c868'; g.lineWidth = 1.1; g.strokeRect(84, 122, 88, 48); g.strokeStyle = '#f2e2b0'; g.lineWidth = 0.5; g.strokeRect(87, 125, 82, 42); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#e8c868' : '#e87a5a'; g.save(); g.translate(104 + i * 10, 146); g.rotate(0.785); g.fillRect(-3.2, -3.2, 6.4, 6.4); g.restore(); } g.strokeStyle = '#f2e6c8'; g.lineWidth = 0.5; for (let x = 82; x < 176; x += 2.2) { g.beginPath(); g.moveTo(x, 118); g.lineTo(x + (H(x, 1, 5) - 0.5), 116); g.moveTo(x, 174); g.lineTo(x + (H(x, 2, 5) - 0.5), 176); g.stroke(); } }
      // ---- manchas de mugre todavía sin limpiar
      MANCHAS.forEach(([x, y], i) => { if (P.manchas & (1 << i)) return; const q = g.createRadialGradient(x, y, 1, x, y, 11); q.addColorStop(0, 'rgba(36,20,8,.7)'); q.addColorStop(0.6, 'rgba(36,20,8,.42)'); q.addColorStop(1, 'rgba(36,20,8,0)'); g.fillStyle = q; g.beginPath(); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283, r = 7 + H(i, k, 71) * 5; g.lineTo(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 0.75); } g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(x - 2, y - 1.4, 2.6, 0.9, -0.3, 0, 7); g.fill(); for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(30,16,6,.5)'; g.beginPath(); g.arc(x + (H(i, k, 72) - 0.5) * 22, y + (H(i, k, 73) - 0.5) * 12, 0.7 + H(i, k, 74), 0, 7); g.fill(); } });
      // ---- ventana
      { const X = 150, Y = 10, Wd = 50, Hh = 40; drop(X, Y, Wd, Hh, 3, 0.3, 0, 2); box(X - 2, Y - 2, Wd + 4, Hh + 4, ['#e4dcc8', '#bcb29a']); box(X + 1.5, Y + 1.5, Wd - 3, Hh - 3, ['#8fcdee', '#c8ecff']);
        g.save(); g.beginPath(); g.rect(X + 1.5, Y + 1.5, Wd - 3, Hh - 3); g.clip();
        g.fillStyle = 'rgba(255,255,255,.85)'; for (const [cx, cy, rx] of [[162, 20, 6], [168, 18, 5], [188, 25, 5], [193, 24, 4]]) { g.beginPath(); g.ellipse(cx, cy, rx, rx * 0.5, 0, 0, 7); g.fill(); }
        g.fillStyle = '#7ab060'; g.beginPath(); g.ellipse(160, 50, 18, 10, 0, 0, 7); g.fill(); g.fillStyle = '#e886b0'; g.beginPath(); g.arc(184, 38, 7, 0, 7); g.arc(179, 41, 5, 0, 7); g.arc(190, 41, 5, 0, 7); g.fill(); g.fillStyle = '#5a3c24'; g.fillRect(183.4, 42, 1.6, 8); g.fillStyle = '#b5603f'; g.beginPath(); g.moveTo(152, 42); g.lineTo(164, 34); g.lineTo(176, 42); g.fill(); g.fillStyle = '#e8d8b0'; g.fillRect(155, 42, 18, 8);
        if (nt > 0) { g.fillStyle = 'rgba(8,14,40,' + (0.86 * nt) + ')'; g.fillRect(X, Y, Wd, Hh); g.fillStyle = 'rgba(255,255,255,' + 0.8 * nt + ')'; for (let k = 0; k < 14; k++) g.fillRect(X + 3 + H(k, 1, 81) * 44, Y + 3 + H(k, 2, 81) * 20, 0.5, 0.5); g.fillStyle = 'rgba(255,244,200,' + nt + ')'; g.beginPath(); g.arc(192, 21, 3.4, 0, 7); g.fill(); g.fillStyle = 'rgba(8,14,40,' + (0.9 * nt) + ')'; g.beginPath(); g.arc(193.4, 20, 3, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(X + 4, Y + Hh - 3); g.lineTo(X + 22, Y + 2); g.lineTo(X + 32, Y + 2); g.lineTo(X + 14, Y + Hh - 3); g.fill(); g.restore();
        R(X + Wd / 2 - 1, Y, 2, Hh, '#d8d0ba'); R(X, Y + Hh / 2 - 1, Wd, 2, '#d8d0ba'); R(X + Wd / 2 - 1, Y, 0.7, Hh, '#fff'); box(X - 4, Y + Hh, Wd + 8, 4, ['#f0e8d4', '#b8ae94']); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 0.4; g.strokeRect(X - 2, Y - 2, Wd + 4, Hh + 4);
        g.strokeStyle = 'rgba(40,30,20,.7)'; g.lineWidth = 0.5; for (let x = X + 6; x < X + Wd; x += 8) { g.beginPath(); g.moveTo(x, Y + 1.5); g.lineTo(x, Y + Hh - 1.5); g.stroke(); }
        if (it('cortinas')) { for (const [cx, dir] of [[X - 6, 1], [X + Wd + 6 - 14, -1]]) { box(cx, Y - 5, 14, Hh + 14, ['#8a4a9a', '#a85cba', '#8a4a9a', '#a85cba', '#7a3a8a'], 0, true); g.strokeStyle = 'rgba(40,10,50,.4)'; g.lineWidth = 0.5; for (let k = 1; k < 7; k++) { g.beginPath(); g.moveTo(cx + k * 2, Y - 5); g.quadraticCurveTo(cx + k * 2 + dir, Y + 20, cx + k * 2, Y + Hh + 9); g.stroke(); } } box(X - 9, Y - 8, Wd + 18, 2.4, ['#d8b060', '#8a6a28']); g.fillStyle = '#d8b060'; g.beginPath(); g.arc(X - 9, Y - 6.8, 2, 0, 7); g.arc(X + Wd + 9, Y - 6.8, 2, 0, 7); g.fill(); } }
      // ---- mesita con radio
      drop(72, 62, 18, 22, 3, 0.4); box(72, 64, 18, 3, ['#b98048', '#8a5a30']); box(72, 67, 18, 14, ['#8a5a30', '#6a4020']); R(72, 64, 18, 0.7, '#d8a468'); R(75, 70, 12, 5, 'rgba(0,0,0,.25)'); R(80, 72, 2, 1.4, '#d8c060'); R(73, 80, 2, 4, '#4a3018'); R(87, 80, 2, 4, '#4a3018');
      drop(74.5, 55, 13, 10, 2.5, 0.35, 1, 1.5); box(74.5, 55, 13, 10, ['#d8c05a', '#a89030'], 1.2); box(76, 56.6, 6, 6.8, ['#4a3a20', '#2a2014'], 0.8); g.strokeStyle = '#6a5a38'; g.lineWidth = 0.3; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(76.4, 58 + k * 1.5); g.lineTo(81.6, 58 + k * 1.5); g.stroke(); } g.fillStyle = '#f2ecd0'; g.beginPath(); g.arc(85, 59.4, 1.6, 0, 7); g.fill(); g.fillStyle = '#c03a2a'; g.fillRect(84.7, 58.4, 0.6, 1.4); g.strokeStyle = '#d0d0d4'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(86, 55); g.lineTo(90, 47); g.stroke();
      // ---- ropero
      drop(98, 30, 42, 46, 5, 0.5, 3, 3); box(98, 30, 42, 44, ['#9a6a38', '#7a5028', '#6a4220'], 0, true); box(96.5, 28, 45, 3, ['#c08a50', '#8a5a30']); R(96.5, 28, 45, 0.7, '#e0b078'); box(96.5, 73.5, 45, 3, ['#5a3a1c', '#3a2410']);
      for (const px of [100, 120]) { box(px, 33, 18, 38, ['#a8743c', '#8a5a2c']); g.strokeStyle = 'rgba(40,22,8,.55)'; g.lineWidth = 0.5; g.strokeRect(px + 2, 35, 14, 34); g.strokeStyle = 'rgba(255,220,170,.28)'; g.beginPath(); g.moveTo(px + 2, 69); g.lineTo(px + 2, 35); g.lineTo(px + 16, 35); g.stroke(); grain(px + 2, 35, 14, 34, 'rgba(60,32,10,.22)', 9, px, false); }
      R(118, 31, 2, 41, '#2a1808'); box(121.5, 37, 12, 26, ['#c8e0ee', '#8fb4cc', '#c8e0ee']); g.strokeStyle = '#d8b060'; g.lineWidth = 0.6; g.strokeRect(121.5, 37, 12, 26); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(123, 61); g.lineTo(129, 37); g.lineTo(131, 37); g.lineTo(125, 61); g.fill();
      g.fillStyle = '#d8b84a'; for (const px of [114.6, 120.6]) { g.beginPath(); g.roundRect(px, 50, 1.6, 6, 0.8); g.fill(); } R(100, 74.4, 40, 0.6, '#2a1808'); for (const px of [100, 134]) R(px, 76, 4, 3, '#2a1808');
      drop(103, 20, 20, 9, 2, 0.3, 1, 1.5); box(103, 20, 20, 9, ['#c8a674', '#a8844a'], 0.6); R(103, 20, 20, 0.7, '#e2c898'); R(111, 20, 4, 9, 'rgba(160,120,60,.8)'); g.fillStyle = '#5a7ab0'; g.beginPath(); g.moveTo(127, 28); g.quadraticCurveTo(130, 20, 134, 28); g.fill();
      // ---- mesa con el anafe, termo y mate
      drop(176, 94, 62, 40, 4, 0.45, 2, 3.5); for (const lx of [178, 234]) box(lx, 128, 3.4, 15, ['#6a4824', '#3a2410']); box(176, 94, 62, 30, ['#c08a50', '#a8703a', '#98602e']); grain(176, 94, 62, 30, 'rgba(70,36,10,.28)', 14, 91); R(176, 94, 62, 0.8, '#e6bc86'); box(176, 124, 62, 9, ['#7a5028', '#4a3018']); R(176, 124, 62, 0.6, 'rgba(0,0,0,.35)'); box(196, 126, 18, 5, ['#6a4422', '#5a3a1c']); R(204, 128, 3, 1.2, '#d8b060');
      drop(181, 97, 30, 22, 2, 0.35, 1.5, 2); box(181, 97, 30, 22, ['#5a5e66', '#3a3d44'], 1.8); R(181, 97, 30, 0.8, '#8a8f98'); for (const bx of [189, 203]) { g.fillStyle = '#16181c'; g.beginPath(); g.ellipse(bx, 108, 5.4, 4.4, 0, 0, 7); g.fill(); g.strokeStyle = '#7a7e86'; g.lineWidth = 0.5; g.beginPath(); g.ellipse(bx, 108, 4.4, 3.5, 0, 0, 7); g.stroke(); g.strokeStyle = '#d86a2a'; g.lineWidth = 0.6; g.beginPath(); g.ellipse(bx, 108, 2.8, 2.2, 0, 0, 7); g.stroke(); } R(183, 99.6, 3, 1.6, '#c03a2a'); R(206, 99.6, 3, 1.6, '#aab0b8');
      { const px = 189, py = 106; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(px + 1.6, py + 3, 6.2, 3.6, 0, 0, 7); g.fill(); box(px - 5.6, py - 4.6, 11.2, 8, ['#d0d4dc', '#8e939e'], 1); g.fillStyle = '#e4e7ec'; g.beginPath(); g.ellipse(px, py - 4.6, 5.6, 2.2, 0, 0, 7); g.fill(); g.fillStyle = '#9a9ea8'; g.beginPath(); g.ellipse(px, py - 4.9, 4.2, 1.5, 0, 0, 7); g.fill(); g.fillStyle = '#2a2a2e'; g.fillRect(px + 5.4, py - 3, 3, 1.4); g.fillRect(px - 8.4, py - 3, 3, 1.4); }
      { drop(216, 98, 6, 15, 2, 0.3, 1.2, 1.5); box(216, 98, 6, 15, ['#5a8ad8', '#2a5aa8', '#1e4686'], 1.4, true); box(216, 96.4, 6, 3, ['#d8d8de', '#9a9aa4'], 0.8); R(217.2, 100, 0.8, 11, 'rgba(255,255,255,.4)'); drop(225, 104, 8, 9, 2, 0.3, 1.2, 1.5); box(225, 105, 8, 8, ['#5a3a1c', '#3a2410'], 2); g.fillStyle = '#7a8a3a'; g.beginPath(); g.ellipse(229, 105, 3.6, 1.4, 0, 0, 7); g.fill(); g.strokeStyle = '#d0d0d4'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(230, 105); g.lineTo(233.4, 99.6); g.stroke(); g.fillStyle = '#dedcd0'; g.fillRect(222, 116, 12, 7); g.fillStyle = '#4a8a4a'; g.fillRect(222, 116, 12, 2.2); }
      // ---- heladera o conservadora
      if (it('heladera')) { drop(212, 34, 30, 56, 4, 0.5, 3, 3); box(212, 34, 30, 56, ['#f2f6f8', '#dce4e8', '#c4ced4'], 1.5, true); R(212, 34, 30, 1.4, '#fff'); R(212, 62, 30, 1.2, '#98a4aa'); R(212, 63.2, 30, 0.6, '#f8fcfe'); box(237.4, 40, 2, 16, ['#e8eef0', '#7e8a90'], 1, true); box(237.4, 68, 2, 18, ['#e8eef0', '#7e8a90'], 1, true); box(213, 88.4, 28, 3, ['#8a949a', '#5a646a']); for (const [mx, my, mc] of [[216, 40, '#e8503a'], [222, 46, '#3a8ae8'], [217, 52, '#e8c83a'], [225, 70, '#4ab85a'], [219, 76, '#e86aa0']]) { g.fillStyle = mc; g.fillRect(mx, my, 3, 3); } g.fillStyle = '#fbf6e0'; g.fillRect(224, 40, 8, 6); g.fillStyle = '#6a6a70'; g.fillRect(225, 41.6, 6, 0.5); g.fillRect(225, 43.2, 5, 0.5); }
      else { drop(213, 66, 28, 22, 3, 0.45, 2, 2.5); box(213, 66, 28, 22, ['#e0443a', '#c0302a', '#8a1c16'], 2); box(213, 66, 28, 7, ['#fafafa', '#d8d8dc'], 2); R(213, 72.4, 28, 0.6, 'rgba(0,0,0,.25)'); box(222, 61, 10, 6, ['#d83a30', '#8a1c16'], 1.4); g.fillStyle = '#2a2a2e'; g.beginPath(); g.roundRect(224, 62.4, 6, 2, 1); g.fill(); R(213, 86, 28, 1, '#6a1410'); g.fillStyle = '#fff'; g.font = '700 3.2px system-ui'; g.fillText('HIELO', 222, 80); }
      // ---- ventilador de pie (las aspas se dibujan aparte)
      if (it('ventilador')) { drop(150, 98, 14, 5, 2, 0.4, 1, 1.5); g.fillStyle = '#7a8088'; g.beginPath(); g.ellipse(157, 101.5, 8, 3, 0, 0, 7); g.fill(); g.fillStyle = '#b0b6bc'; g.beginPath(); g.ellipse(157, 100.8, 7, 2.4, 0, 0, 7); g.fill(); box(155.8, 84, 2.4, 17, ['#e4e8ec', '#8a9096'], 0, true); g.fillStyle = '#4a5560'; g.beginPath(); g.arc(157, 80, 10.4, 0, 7); g.fill(); g.fillStyle = '#9aa8b4'; g.beginPath(); g.arc(157, 80, 9.8, 0, 7); g.fill(); g.fillStyle = '#6a7a88'; g.beginPath(); g.arc(157, 80, 8.6, 0, 7); g.fill(); }
      // ---- planta
      if (it('planta')) { drop(85, 171, 14, 10, 2, 0.4, 1.5, 2); g.save(); for (let k = 0; k < 7; k++) { const x = 92 + (k - 3) * 2.1, hh = 16 + H(k, 1, 91) * 9, lean = (k - 3) * 0.7; const q = g.createLinearGradient(x, 172 - hh, x, 172); q.addColorStop(0, '#9ac850'); q.addColorStop(0.5, '#3a8a3a'); q.addColorStop(1, '#1e5a2a'); g.fillStyle = q; g.beginPath(); g.moveTo(x - 1.8, 172); g.quadraticCurveTo(x - 1.2 + lean, 172 - hh * 0.6, x + lean * 1.4, 172 - hh); g.quadraticCurveTo(x + 1.2 + lean, 172 - hh * 0.6, x + 1.8, 172); g.fill(); g.strokeStyle = '#d8d060'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(x - 1.6, 172); g.quadraticCurveTo(x - 1.1 + lean, 172 - hh * 0.6, x + lean * 1.4, 172 - hh); g.stroke(); } g.restore(); box(86, 170, 12, 11, ['#d08050', '#a85a2a', '#7a3c1a'], 1.2, true); box(85, 169, 14, 3, ['#e0966a', '#b8683a'], 1); }
      // ---- tele (la pantalla se dibuja aparte)
      if (it('tv')) { drop(102, 156, 44, 22, 3, 0.4, 2, 2.5); box(102, 158, 44, 20, ['#8a5a30', '#5a3a1c'], 1); R(102, 158, 44, 0.8, '#c08a50'); R(106, 168, 36, 1, 'rgba(0,0,0,.35)'); R(110, 172, 10, 1.4, '#2a2a2e'); g.fillStyle = '#c03a2a'; g.fillRect(138, 171.6, 2, 2);
        drop(104, 144, 40, 28, 3, 0.45, 2, 2.5); box(104, 144, 40, 28, ['#3a3a40', '#1c1c20'], 2.2); R(104, 144, 40, 0.8, '#6a6a72'); box(106, 146, 36, 23, '#0c1016', 1.4); box(108, 169.6, 16, 1.6, ['#888', '#555']); g.fillStyle = '#7a7a82'; g.beginPath(); g.arc(137, 170.6, 0.8, 0, 7); g.arc(140, 170.6, 0.8, 0, 7); g.fill(); g.strokeStyle = '#b0b0b8'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(124, 144); g.lineTo(116, 132); g.moveTo(124, 144); g.lineTo(134, 134); g.stroke(); }
      // ---- sillón
      if (it('sillon')) { drop(168, 162, 60, 36, 4, 0.5, 3, 3); box(168, 160, 60, 14, ['#a8567e', '#8a4264'], 5); R(172, 162, 52, 1, 'rgba(255,190,220,.3)'); for (const sx of [172, 198]) { box(sx, 168, 26, 24, ['#a24e78', '#8a4264', '#762e52'], 4); g.strokeStyle = 'rgba(40,10,30,.45)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(sx + 13, 169); g.lineTo(sx + 13, 191); g.stroke(); R(sx + 2, 169, 22, 0.8, 'rgba(255,200,230,.3)'); g.fillStyle = '#e8c870'; for (const bx of [sx + 7, sx + 19]) for (const by of [175, 184]) { g.beginPath(); g.arc(bx, by, 0.7, 0, 7); g.fill(); } }
        box(166, 168, 9, 26, ['#8a4264', '#6a2e4c'], 4, true); box(221, 168, 9, 26, ['#6a2e4c', '#8a4264'], 4, true); R(168, 194, 6, 4, '#2a1620'); R(222, 194, 6, 4, '#2a1620'); g.fillStyle = '#e8d070'; g.beginPath(); g.moveTo(208, 175); g.lineTo(222, 172); g.lineTo(222, 182); g.lineTo(209, 185); g.fill(); g.strokeStyle = '#c0a040'; g.lineWidth = 0.4; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(211 + k * 3, 174); g.lineTo(211 + k * 3, 184); g.stroke(); } }
      // ---- cama
      drop(12, 60, 58, 94, 5, 0.5, 3, 3.5); box(12, 54, 58, 12, ['#8a5a30', '#6a4220'], 1.5); box(14, 56, 54, 3, ['#b98048', '#8a5a30']); R(14, 56, 54, 0.6, '#e0b078'); for (const bx of [22, 34, 46, 58]) box(bx, 60, 3, 6, ['#5a3a1c', '#3a2410'], 1); box(12, 62, 58, 88, '#6a4220'); R(12, 62, 2.4, 88, '#8a5a30'); R(67.6, 62, 2.4, 88, '#4a2e16');
      box(14.4, 64, 53.2, 84, it('colchon') ? ['#f4f0e4', '#e0dac8'] : ['#d4c496', '#b8a874'], 2.5);
      if (it('colchon')) { g.strokeStyle = 'rgba(60,70,110,.18)'; g.lineWidth = 0.4; for (let y = 70; y < 90; y += 5) { g.beginPath(); g.moveTo(15, y); g.lineTo(67, y); g.stroke(); } }
      drop(20, 68, 42, 14, 2, 0.3, 0.8, 1.6); box(20, 67.5, 42, 14.5, it('colchon') ? ['#ffffff', '#e4e8f0'] : ['#e8e4d8', '#c8c4b4'], 6); g.strokeStyle = 'rgba(60,60,80,.22)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(26, 76); g.quadraticCurveTo(41, 72, 56, 76); g.stroke(); R(24, 69, 34, 0.7, 'rgba(255,255,255,.7)');
      const bl = it('colchon') ? ['#5a9ae8', '#3f7fc8', '#2c62a8'] : ['#b8604e', '#9a4a3a', '#7a3426']; box(14.4, 90, 53.2, 56, bl, 2); box(14.4, 90, 53.2, 7, it('colchon') ? ['#e8f0fa', '#bcd0e8'] : ['#e0b8a8', '#c89888'], 1.5); R(14.4, 97, 53.2, 0.8, 'rgba(0,0,0,.25)');
      g.strokeStyle = it('colchon') ? 'rgba(20,40,90,.28)' : 'rgba(40,10,6,.32)'; g.lineWidth = 0.6; for (let y = 104; y < 146; y += 8) { g.beginPath(); g.moveTo(14.4, y); g.bezierCurveTo(28, y + 2.5, 52, y - 2.5, 67.6, y + 1); g.stroke(); } g.strokeStyle = it('colchon') ? 'rgba(255,255,255,.22)' : 'rgba(255,200,180,.18)'; for (let y = 107; y < 146; y += 8) { g.beginPath(); g.moveTo(14.4, y); g.bezierCurveTo(28, y + 2.5, 52, y - 2.5, 67.6, y + 1); g.stroke(); }
      if (!it('colchon')) { g.fillStyle = '#7a3a2c'; g.beginPath(); g.roundRect(28, 111, 14, 9, 1.4); g.fill(); g.strokeStyle = 'rgba(255,230,200,.5)'; g.lineWidth = 0.4; g.setLineDash([1, 1]); g.strokeRect(28, 111, 14, 9); g.setLineDash([]); g.fillStyle = '#6a2e22'; g.beginPath(); g.roundRect(46, 127, 9, 7, 1.4); g.fill(); g.fillStyle = 'rgba(30,10,4,.35)'; g.beginPath(); g.ellipse(52, 108, 4, 2.4, 0.3, 0, 7); g.fill(); }
      box(12, 146, 58, 7, ['#8a5a30', '#4a2e16'], 1.5); R(12, 146, 58, 0.8, '#d8a468'); for (const bx of [12, 66]) box(bx, 150, 4, 5, '#2e1c0c', 0.8);
      // ---- puntas de luz de la ventana y atmósfera
      if (nt < 1) { const k = 1 - nt; const lb = g.createLinearGradient(170, 52, 205, 150); lb.addColorStop(0, 'rgba(255,244,200,' + 0.34 * k + ')'); lb.addColorStop(1, 'rgba(255,244,200,' + 0.04 * k + ')'); g.fillStyle = lb; g.beginPath(); g.moveTo(152, 50); g.lineTo(198, 50); g.lineTo(240, 160); g.lineTo(170, 160); g.closePath(); g.fill(); g.strokeStyle = 'rgba(40,24,10,' + 0.1 * k + ')'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(175, 52); g.lineTo(205, 158); g.moveTo(152, 51); g.lineTo(170, 160); g.stroke(); }
      if (nt > 0) { g.fillStyle = 'rgba(10,16,44,' + 0.4 * nt + ')'; g.fillRect(0, 0, W, H_); const bg = g.createRadialGradient(126, 15, 2, 126, 60, 100); bg.addColorStop(0, 'rgba(255,214,140,' + 0.3 * nt + ')'); bg.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = bg; g.fillRect(0, 0, W, H_); }
      const vg = g.createRadialGradient(W / 2, H_ / 2, 60, W / 2, H_ / 2, 170); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H_);
    }
  };
})();
