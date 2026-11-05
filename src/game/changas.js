// Changas para ganar plata (05/11/2026): delivery de helados en moto, remís en auto y venta de chipa a pie.
// Se eligen con el botón 📋; usan el GPS (setDest) y pagan con VR.Wallet. Cada jugador las suyas (también online).
'use strict';
VR.Changas = class {
  constructor(o) { // o: { world, peds, setDest, toast, getCar, player }
    Object.assign(this, o); this.job = null; this.rnd = Math.random;
    this.hud = document.createElement('div'); this.hud.id = 'jobHud'; this.hud.hidden = true; document.body.append(this.hud);
    this.d = VR.dlg('changasDlg', '<h2>📋 Changas</h2><div class="seg" style="flex-direction:column"><button data-k="delivery">🍦 Delivery de helados · en moto</button><button data-k="remis">🚕 Remís · en auto</button><button data-k="chipa">🥐 Vender chipa · a pie</button><button data-k="no">Dejar la changa</button></div><p class="hint">Delivery: retirá en la Heladería Marimer y llevá a tiempo. Remís: buscá al pasajero y llevalo; si chocás, paga la mitad. Chipa: acercate a la gente y ACCIÓN.</p><div class="seg"><button data-k="x">Cerrar</button></div>');
    this.d.querySelectorAll('button').forEach((b) => b.onclick = () => { const k = b.dataset.k; this.d.close(); VR.input.enabled = true; if (k !== 'x') this.start(k); });
    const m = (this.world.labels || []).find((l) => /Marimer/.test(l.text)); this.helad = m ? { x: m.x, y: m.y + 30, name: 'Heladería Marimer' } : null;
  }
  open() { VR.input.releaseAll(); VR.input.enabled = false; this.d.showModal(); }
  pay(n, why) { n = Math.round(n / 1000) * 1000; VR.Wallet.add(n); this.toast('💵 +' + VR.fmtGs(n) + ' · ' + why); if (VR.audio.coin) VR.audio.coin(); }
  spot(min, max, from) { // un punto de calle al azar entre min y max px
    const N = this.world.roads && this.world.roads.nodes; if (!N) return null;
    for (let t = 0; t < 200; t++) { const i = ((this.rnd() * N.length / 2) | 0) * 2, x = N[i], y = N[i + 1], d = Math.hypot(x - from.x, y - from.y); if (d > min && d < max) return { x, y, name: this.world.placeName ? this.world.placeName(x, y) || 'la dirección' : 'la dirección' }; }
    return null;
  }
  start(k) {
    const car = this.getCar(), p = this.player;
    if (k === 'no') { this.end('Dejaste la changa'); return; }
    if (k === 'delivery' && !(car && car.type === 'moto')) { this.toast('🏍 Para el delivery necesitás una moto'); return; }
    if (k === 'remis' && !(car && car.type === 'car')) { this.toast('🚗 Para el remís necesitás un auto'); return; }
    if (k === 'chipa' && car) { this.toast('🚶 Bajate para vender chipa'); return; }
    this.job = { k, stage: 0, t: 0, n: 0 };
    if (k === 'delivery') { this.go(this.helad || this.spot(200, 600, p), 'Retirá el pedido'); }
    if (k === 'remis') { const s = this.spot(150, 500, car); this.go({ ...s, name: 'el pasajero' }, 'Buscá al pasajero'); }
    if (k === 'chipa') this.toast('🥐 ¡Chipa, chipa! Acercate a la gente y ACCIÓN');
  }
  go(dest, msg) { this.job.dest = dest; this.setDest(dest); this.job.msg = msg; }
  end(msg) { if (this.job) { this.job = null; this.setDest(null); } this.hud.hidden = true; if (msg) this.toast(msg); }
  // a pie: vender chipa a la persona más cercana
  action(player) {
    if (!this.job || this.job.k !== 'chipa' || !this.peds) return false;
    const q = this.peds.greet(player.x, player.y); if (!q) { player.say('¡Chipa, chipa calentita!', 1.5); return true; }
    if (q.chipa) { q.say = { text: 'Ya te compré, che', t: 1.6 }; return true; }
    q.chipa = true;
    if (this.rnd() < 0.6) { q.say = { text: ['¡Dame dos!', '¡Chipa, por favor!', 'Hee, una'][(this.rnd() * 3) | 0], t: 1.8 }; this.job.n++; this.pay(5000, 'chipa ' + this.job.n + '/10'); if (this.job.n >= 10) this.end('🥐 ¡Vendiste todo! Aguyje'); }
    else q.say = { text: ['Nahániri', 'Otro día', 'Ya comí'][(this.rnd() * 3) | 0], t: 1.6 };
    return true;
  }
  update(dt) {
    const J = this.job; if (!J) return; const car = this.getCar(), f = car || this.player;
    J.t += dt;
    if ((J.k === 'delivery' && !(car && car.type === 'moto')) || (J.k === 'remis' && !(car && car.type === 'car'))) { if ((J.off = (J.off || 0) + dt) > 20) this.end('Se canceló la changa (te bajaste)'); } else J.off = 0;
    const D = J.dest, near = D && Math.hypot(f.x - D.x, f.y - D.y) < 46, slow = !car || Math.abs(car.v) < 45;
    if (J.k === 'delivery') {
      if (J.stage === 0 && near) { const s = this.spot(700, 1700, f); J.stage = 1; J.t = 0; J.lim = Math.round(Math.hypot(s.x - f.x, s.y - f.y) / 120 + 25); this.go(s, 'Llevá los helados'); this.toast('🍦 ¡Pedido listo! Tenés ' + J.lim + ' s'); }
      else if (J.stage === 1 && near && slow) { const left = J.lim - J.t; if (left > 0) this.pay(25000 + left * 600, 'delivery a tiempo'); else this.pay(10000, 'llegó medio derretido'); J.stage = 0; this.go(this.helad || this.spot(200, 600, f), 'Retirá otro pedido'); }
    }
    if (J.k === 'remis') {
      if (J.stage === 0 && near && slow) { const s = this.spot(900, 2400, f); J.stage = 1; J.hp0 = car.hp ?? 100; J.d = Math.hypot(s.x - f.x, s.y - f.y); this.go(s, 'Llevá al pasajero'); this.toast('🙋 "' + ['A ' + s.name + ', por favor', 'Rápido que llego tarde', 'Mba\'éichapa, a ' + s.name][(this.rnd() * 3) | 0] + '"'); }
      else if (J.stage === 1 && near && slow) { const bad = (J.hp0 - (car.hp ?? 100)) > 20; this.pay((15000 + J.d / 8000 * 9000) * (bad ? 0.5 : 1), bad ? 'remís (chocaste, paga la mitad)' : 'remís'); J.stage = 0; const s = this.spot(150, 600, f); this.go({ ...s, name: 'otro pasajero' }, 'Buscá al próximo pasajero'); }
    }
    // cartel arriba
    if ((this.hT = (this.hT || 0) - dt) < 0) {
      this.hT = 0.25; this.hud.hidden = false;
      const ico = { delivery: '🍦', remis: '🚕', chipa: '🥐' }[J.k];
      this.hud.textContent = J.k === 'chipa' ? ico + ' Chipa vendidas: ' + J.n + '/10' : ico + ' ' + J.msg + (D && D.name ? ' · ' + D.name : '') + (J.k === 'delivery' && J.stage === 1 ? ' · ⏱ ' + Math.max(0, Math.ceil(J.lim - J.t)) + ' s' : '');
    }
  }
};
