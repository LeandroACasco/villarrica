// Changas para ganar plata (05/11/2026): delivery de helados en moto, remís en auto y venta de chipa a pie.
// Se eligen con el botón 📋; usan el GPS (setDest) y pagan con VR.Wallet. Cada jugador las suyas (también online).
'use strict';
VR.Changas = class {
  constructor(o) { // o: { world, peds, setDest, toast, getCar, player }
    Object.assign(this, o); this.job = null; this.rnd = Math.random;
    this.hud = document.createElement('div'); this.hud.id = 'jobHud'; this.hud.hidden = true; document.body.append(this.hud);
    this.d = VR.dlg('changasDlg', '<h2>📋 Changas</h2><div class="seg" style="flex-direction:column"><button data-k="delivery">🍦 Delivery de helados · en moto</button><button data-k="taxi">🚖 Taxista · te damos el taxi</button><button data-k="chipa">🥐 Vender chipa · a pie</button><button data-k="no">Dejar la changa</button></div><p class="hint">Delivery: retirá en la Heladería Marimer y llevá a tiempo. Taxista: te damos un taxi, buscá al cliente y dejalo en el círculo; si chocás, paga la mitad. Chipa: acercate a la gente y ACCIÓN.</p><div class="seg"><button data-k="x">Cerrar</button></div>');
    this.d.querySelectorAll('button').forEach((b) => b.onclick = () => { const k = b.dataset.k; this.d.close(); VR.input.enabled = true; if (k !== 'x') this.start(k); });
    this.lbl = {}; this.d.querySelectorAll('[data-k]').forEach((b) => { this.lbl[b.dataset.k] = b.textContent; });
    const m = (this.world.labels || []).find((l) => /Marimer/.test(l.text)); this.helad = m ? { x: m.x, y: m.y + 30, name: 'Heladería Marimer' } : null;
  }
  tutorial(k) {
    const T = { delivery: ['🍦 Delivery de helados', 'Necesitás una moto.', 'El GPS y el <b>círculo amarillo</b> te llevan a la Heladería Marimer: entrá en el círculo.', 'Después llevá el pedido a la dirección <b>antes de que se acabe el tiempo</b> y frená dentro del círculo.', 'A tiempo: 25.000 Gs. + propina. Tarde: 10.000.'],
      taxi: ['🚖 Taxista', 'Te damos un <b>taxi amarillo</b> y ya estás adentro.', 'Tu cliente te espera donde marca el GPS, con el <b>círculo verde</b> y la mano levantada 🙋: acercate despacio y sube solo.', 'Llevalo a donde pide y <b>frená dentro del círculo amarillo</b> para que se baje.', 'Cobrás por distancia; si chocás mucho, paga la mitad.'],
      chipa: ['🥐 Vender chipa', 'Caminá por donde hay gente.', 'Parate al lado de una persona y apretá <b>ACCIÓN</b>.', 'Algunos compran (5.000 Gs.) y otros no. Nadie compra dos veces.', 'Vendé 10 y terminás.'] }[k];
    if (!T) return;
    const d = this.tut || (this.tut = VR.dlg('tutDlg', ''));
    d.innerHTML = '<h2>' + T[0] + '</h2><ol style="padding-left:20px;line-height:1.5">' + T.slice(1).map((x) => '<li>' + x + '</li>').join('') + '</ol><div class="seg"><button>¡Dale!</button></div>';
    d.querySelector('button').onclick = () => { d.close(); VR.input.enabled = true; };
    VR.input.releaseAll(); VR.input.enabled = false; d.showModal();
  }
  // marcas en el piso: círculo verde donde espera el cliente o se retira; amarillo donde dejar
  drawGround(g, cx, cy) {
    const J = this.job; if (!J || !J.dest || J.k === 'chipa') return;
    const pick = J.stage === 0, x = J.dest.x - cx, y = J.dest.y - cy, t = performance.now() / 1000, r = 24 + Math.sin(t * 4) * 2;
    g.save(); g.lineWidth = 3; g.strokeStyle = pick ? 'rgba(80,230,120,.9)' : 'rgba(255,214,60,.95)'; g.fillStyle = pick ? 'rgba(80,230,120,.18)' : 'rgba(255,214,60,.2)';
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); g.setLineDash([4, 4]); g.beginPath(); g.arc(x, y, r - 6, 0, 7); g.stroke(); g.restore();
  }
  collect(cx, cy, tall) { // el cliente esperando con la mano levantada
    const J = this.job; if (!J || J.k !== 'taxi' || J.stage !== 0 || !J.dest || !this.peds) return;
    const x = J.dest.x - cx, y = J.dest.y - cy + 6, L = this.peds.sprites[J.pal % this.peds.sprites.length];
    tall.push({ sy: J.dest.y + 6, draw: (g) => { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y - 1, 6, 2.5, 0, 0, 7); g.fill(); g.drawImage(L.get('down', 'idle', 0), x - 8 * VR.PS, y - 31 * VR.PS, 16 * VR.PS, 32 * VR.PS);
      const b = Math.sin(performance.now() / 150) * 2; g.font = '12px system-ui'; g.textAlign = 'center'; g.fillText('🙋', x + 9, y - 30 + b); } });
  }
  // en Historia (J2) las changas se abren con las misiones: las cerradas muestran 🔒
  open() {
    if (VR.mis) this.d.querySelectorAll('[data-k]').forEach((b) => { const k = b.dataset.k; if (this.lbl[k] && k !== 'no' && k !== 'x') b.textContent = (VR.mis.changaOk(k) ? '' : '🔒 ') + this.lbl[k]; });
    VR.input.releaseAll(); VR.input.enabled = false; this.d.showModal();
  }
  pay(n, why, efectivo) { n = Math.round(n / 1000) * 1000; if (VR.vida && !efectivo) VR.vida.banco(n, why); else VR.Wallet.add(n, why); /* en Historia, las changas de la app pagan a la billetera electrónica */ this.toast('💵 +' + VR.fmtGs(n) + ' · ' + why); if (VR.audio.coin) VR.audio.coin(); if (VR.mis) VR.mis.emit('cobro', { n, why }); }
  spot(min, max, from) { // un punto de calle al azar entre min y max px
    const N = this.world.roads && this.world.roads.nodes; if (!N) return null;
    for (let t = 0; t < 4000; t++) { if (t === 2000) { min *= 0.5; max *= 2; } const i = ((this.rnd() * N.length / 2) | 0) * 2, x = N[i], y = N[i + 1], d = Math.hypot(x - from.x, y - from.y); if (d > min && d < max && (t > 3500 || VR.Barrios.enPunto(this.world, x, y))) return { x, y, name: this.world.placeName ? this.world.placeName(x, y) || 'la dirección' : 'la dirección' }; }
    return null;
  }
  start(k, force) { // force: la empieza una misión (sin mirar si está abierta)
    const car = this.getCar(), p = this.player;
    if (k === 'no') { this.end('Dejaste la changa'); return; }
    if (VR.mis && !force && !VR.mis.changaOk(k)) { this.toast('🔒 Esta changa se abre con las misiones (📌 Pausa → Misiones)'); return; }
    if (VR.mis && !VR.Barrios.enPunto(this.world, (car || p).x, (car || p).y)) { this.toast('🔒 ' + VR.Barrios.CARTEL + ': acá no hay changas todavía'); return; }
    if (VR.vida && k !== 'chipa' && !VR.vida.saldoOk()) { this.toast('📱 Sin saldo no te llegan changas por la app. Cargá saldo (solo la chipa se hace en persona)'); return; }
    if (k === 'delivery' && !(car && car.type === 'moto')) { this.toast('🏍 Para el delivery necesitás una moto'); return; }
    if (k === 'chipa' && car) { this.toast('🚶 Bajate para vender chipa'); return; }
    if (k === 'chipa' && VR.vida && VR.vida.s.canasto) { VR.vida.s.equipo = 'canasto'; this.toast('🧺 Canasto en la mano: ACCIÓN al lado de la gente para vender'); return; } // en Historia la chipa se vende con el canasto equipado
    if (k === 'chipa' && VR.vida && !(VR.vida.s.canasto && VR.vida.s.stock > 0)) { this.toast(VR.vida.s.canasto ? '🧺 El canasto está vacío: reponé chipa con Doña Chela (plaza)' : '🧺 Necesitás el canasto de Doña Chela (plaza)'); return; }
    this.job = { k, stage: 0, t: 0, n: 0 };
    if (!force) this.tutorial(k); // si la empieza una misión, ya lo explicó el diálogo
    if (k === 'delivery') { this.go(this.helad || this.spot(200, 600, p), 'Retirá el pedido'); }
    if (k === 'taxi') { // te damos un taxi amarillo al lado y te subís
      const f = car || p; let taxi = car && car.taxi ? car : null;
      if (!taxi) {
        for (let r = 22; r < 160 && !taxi; r += 12) for (let k = 0; k < 12 && !taxi; k++) { const an = k / 12 * Math.PI * 2; for (const ca of [0, Math.PI / 2]) { const c = new VR.Car(this.world, f.x + Math.cos(an) * r, f.y + Math.sin(an) * r, ca, 0, 'car', 'sedan', { ...VR.tuneDefault('sedan'), color: 3 }); if (!c.contacts(c.x, c.y, c.a)) { taxi = c; break; } } }
        if (!taxi) { this.job = null; this.toast('No hay lugar para el taxi aquí: probá en una calle'); return; }
        taxi.taxi = true; this.world.addBox(taxi); this.cars.push(taxi); if (car) this.exitCar(); this.enterCar(taxi);
      }
      const s = this.spot(200, 600, taxi); this.job.pal = (this.rnd() * 32) | 0; this.go({ ...s, name: 'tu cliente' }, 'Buscá a tu cliente');
    }
    if (k === 'chipa') this.toast('🥐 ¡Chipa, chipa! Acercate a la gente y ACCIÓN');
  }
  go(dest, msg) { this.job.dest = dest; this.setDest(dest); this.job.msg = msg; }
  end(msg) { if (this.job) { this.job = null; this.setDest(null); } this.hud.hidden = true; if (msg) this.toast(msg); }
  // a pie: vender chipa a la persona más cercana
  action(player) {
    const eq = VR.vida && VR.vida.s.equipo === 'canasto';
    if (!this.peds || !(eq || (this.job && this.job.k === 'chipa'))) return false;
    if (eq && VR.vida.s.stock <= 0) { this.toast('🧺 El canasto está vacío: reponé chipa con Doña Chela (plaza)'); return true; }
    if (!this.job || this.job.k !== 'chipa') this.job = { k: 'chipa', stage: 0, t: 0, n: 0, eq: true };
    const q = this.peds.greet(player.x, player.y); if (!q) { player.say('¡Chipa, chipa calentita!', 1.5); return true; }
    if (q.chipa) { q.say = { text: 'Ya te compré, po', t: 1.6 }; return true; }
    if (VR.mis && !VR.Barrios.enPunto(this.world, player.x, player.y)) { q.say = { text: 'Ndaikuaái ndéve...', t: 1.6 }; return true; }
    q.chipa = true; const V = VR.vida;
    if (this.rnd() < 0.6) { q.say = { text: ['¡Dame dos!', '¡Chipa, por favor!', 'Hee, una'][(this.rnd() * 3) | 0], t: 1.8 }; this.job.n++; if (V) V.s.stock--; this.pay(5000, V ? 'chipa (quedan ' + V.s.stock + ')' : 'chipa ' + this.job.n + '/10', true); if (VR.mis) VR.mis.emit('venta', { que: 'chipa' }); if (V && V.s.stock <= 0) { this.end('🧺 ¡Se terminó la chipa! Reponé con Doña Chela'); return true; } if (!V && this.job.n >= 10) this.end('🥐 ¡Vendiste todo! Aguyje'); }
    else q.say = { text: ['Nahániri', 'Otro día', 'Ya comí'][(this.rnd() * 3) | 0], t: 1.6 };
    return true;
  }
  update(dt) {
    const J = this.job; if (!J) return; const car = this.getCar(), f = car || this.player;
    J.t += dt;
    if ((J.k === 'delivery' && !(car && car.type === 'moto')) || (J.k === 'taxi' && !(car && car.taxi))) { if ((J.off = (J.off || 0) + dt) > 20) this.end('Se canceló la changa (te bajaste)'); } else J.off = 0;
    const D = J.dest, dd = D ? Math.hypot(f.x - D.x, f.y - D.y) : 1e9, near = dd < 46, inRing = dd < 24, slow = !car || Math.abs(car.v) < 45, stopped = !car || Math.abs(car.v) < 18;
    if (J.k === 'delivery') {
      if (J.stage === 0 && near) { const s = this.spot(700, 1700, f); J.stage = 1; J.t = 0; J.lim = Math.round(Math.hypot(s.x - f.x, s.y - f.y) / 120 + 25); this.go(s, 'Llevá los helados'); this.toast('🍦 ¡Pedido listo! Tenés ' + J.lim + ' s'); }
      else if (J.stage === 1 && inRing && stopped) { const left = J.lim - J.t; if (left > 0) this.pay(25000 + left * 600, 'delivery a tiempo'); else this.pay(10000, 'llegó medio derretido'); J.stage = 0; this.go(this.helad || this.spot(200, 600, f), 'Retirá otro pedido'); }
    }
    if (J.k === 'taxi') {
      if (J.stage === 0 && dd < 50 && slow) { const s = this.spot(900, 2400, f); J.stage = 1; J.hp0 = car.hp ?? 100; J.d = Math.hypot(s.x - f.x, s.y - f.y); this.go(s, 'Llevá a tu cliente y estacioná en el círculo'); this.toast('🙋 "' + ['A ' + s.name + ', por favor', 'Rápido que llego tarde', "Mba'éichapa, a " + s.name][(this.rnd() * 3) | 0] + '"'); }
      else if (J.stage === 1 && inRing && stopped) { const bad = (J.hp0 - (car.hp ?? 100)) > 20; this.pay((15000 + J.d / 8000 * 9000) * (bad ? 0.5 : 1), bad ? 'taxi (chocaste, paga la mitad)' : '¡Aguyje! Viaje de taxi'); J.stage = 0; J.pal = (this.rnd() * 32) | 0; const s = this.spot(200, 700, f); this.go({ ...s, name: 'tu próximo cliente' }, 'Buscá a tu próximo cliente'); }
    }
    // cartel arriba
    if ((this.hT = (this.hT || 0) - dt) < 0) {
      this.hT = 0.25; this.hud.hidden = false;
      const ico = { delivery: '🍦', taxi: '🚖', chipa: '🥐' }[J.k];
      this.hud.textContent = J.k === 'chipa' ? (VR.vida ? ico + ' En el canasto: ' + VR.vida.s.stock + ' chipas · vendidas ' + J.n : ico + ' Chipa vendidas: ' + J.n + '/10') : ico + ' ' + J.msg + (D && D.name ? ' · ' + D.name : '') + (J.k === 'delivery' && J.stage === 1 ? ' · ⏱ ' + Math.max(0, Math.ceil(J.lim - J.t)) + ' s' : '');
    }
  }
};
