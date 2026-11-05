// Taller y cine (05/11/2026, pedidos de Leandro).
// Taller "Pyahu" en una calle del Centro: entrás con el vehículo, ACCIÓN, elegís piezas (catálogo de tune.js),
// ves el costado en alta y pagás con la billetera. El tuneo se guarda con el vehículo y se ve online.
// Cine en el Teatro Municipal: en la entrada sur, ACCIÓN; pegás un enlace de YouTube y, online, todos ven el
// mismo video en el mismo momento (VR.cineNow = { v, t0 }).
'use strict';
VR.dlg = (id, html) => { const d = document.createElement('dialog'); d.id = id; d.className = 'vrdlg'; d.innerHTML = html; document.body.append(d); return d; };
VR.Garage = class {
  constructor() {
    this.d = VR.dlg('garage', '<h2>🔧 Taller Pyahu</h2><canvas id="grPrev" width="320" height="180"></canvas><div id="grParts"></div><p id="grTot"></p><div class="seg"><button id="grFix">🔧 Reparar</button><button id="grBuy">Comprar</button><button id="grOut">Salir</button></div>');
    this.d.querySelector('#grOut').onclick = () => this.close();
    this.d.querySelector('#grBuy').onclick = () => this.buy();
    this.d.querySelector('#grFix').onclick = () => { // reparar: 1.500 Gs. por punto de vida
      const c = this.car, hp = c.hp ?? 100; if (hp >= 99 && !c.burning) { this.toast('✨ Está joya, no hace falta'); return; }
      const n = Math.round((100 - Math.max(0, hp)) * 1500 / 1000) * 1000; if (n > VR.Wallet.get()) { this.toast('💸 Reparar cuesta ' + VR.fmtGs(n)); return; }
      VR.Wallet.add(-n); c.hp = 100; if (c.burning && VR.emer) { c.burning = false; VR.emer.burning && VR.emer.burning.delete(c); } this.toast('🔧 Quedó como nuevo · ' + VR.fmtGs(n)); this.paint(); };
  }
  open(car, toast) {
    this.car = car; this.toast = toast; const m = car.model, M = VR.TUNE_MODELS[m];
    if (!M) { toast('Este vehículo no se puede tunear'); return; }
    this.old = Object.assign(VR.tuneDefault(m), car.tune || {}); this.t = { ...this.old };
    const box = this.d.querySelector('#grParts'); box.innerHTML = '';
    for (const p of M.parts) {
      const P = VR.TUNE_PARTS[p], s = document.createElement('select'); s.dataset.p = p;
      const opts = p === 'color' || p === 'color2' ? VR.TUNE_COLORS.map((c, i) => [i, c[0]]) : Object.entries(P.opts).map(([k, o]) => [k, o[0]]);
      for (const [k, name] of opts) { const o = document.createElement('option'); o.value = k; o.textContent = name; s.append(o); }
      s.value = this.t[p]; s.onchange = () => { this.t[p] = p === 'color' || p === 'color2' || p === 'polarizado' || p === 'bajo' ? +s.value : s.value; this.paint(); };
      const l = document.createElement('label'); l.textContent = P.name + ' '; l.append(s); box.append(l);
    }
    VR.input.releaseAll(); VR.input.enabled = false; this.d.showModal(); this.paint();
  }
  cost() { const m = this.car.model; return VR.TUNE_MODELS[m].parts.reduce((s, p) => s + (String(this.t[p]) !== String(this.old[p]) ? VR.tunePartPrice(m, p, this.t) : 0), 0); }
  paint() {
    const c = this.d.querySelector('#grPrev'), g = c.getContext('2d'); g.clearRect(0, 0, 320, 180);
    try { g.drawImage(VR.drawSideHD(this.car.model, VR.tunePal(this.t.color), this.t, 320, 180), 0, 0); } catch (e) {}
    this.d.querySelector('#grTot').textContent = 'Total: ' + VR.fmtGs(this.cost()) + ' · vida ' + Math.round(Math.max(0, this.car.hp ?? 100)) + '% · tenés ' + VR.fmtGs(VR.Wallet.get());
  }
  buy() {
    const n = this.cost(); if (n > VR.Wallet.get()) { this.toast('💸 No te alcanza la plata'); return; }
    VR.Wallet.add(-n); const c = this.car; c.tune = { ...this.t };
    c.frames = VR.vframes(c.type, c.color, c.model, c.tune); c.spec = VR.tuneSpec(VR.vspec(c.type, c.model), c.tune);
    this.toast(n ? '🔧 ¡Quedó joya! ' + VR.fmtGs(n) : 'Sin cambios'); this.close();
  }
  close() { this.d.close(); VR.input.enabled = true; }
};
VR.ytId = (s) => { const m = String(s).match(/(?:youtu\.be\/|v=|shorts\/|live\/|embed\/)([\w-]{11})/) || String(s).match(/^([\w-]{11})$/); return m ? m[1] : null; };
VR.Cine = class {
  constructor(online) {
    this.on = online;
    this.d = VR.dlg('cine', '<h2>🎬 Cine en el Teatro Municipal</h2><div id="cnBox"></div><input id="cnUrl" placeholder="Pegá un enlace de YouTube"><div class="seg"><button id="cnPut">Poner</button><button id="cnOut">Salir</button></div><p class="hint">Online: todos los de la sala ven el mismo video.</p>');
    this.d.querySelector('#cnOut').onclick = () => this.close();
    this.d.querySelector('#cnPut').onclick = () => { const v = VR.ytId(this.d.querySelector('#cnUrl').value.trim()); if (!v) return; VR.cineNow = { v, t0: VR.netNow() }; online.ev({ e: 'cine', v, t0: VR.cineNow.t0 }); this.close(); };
    online.onCine = () => { if (this.d.open) this.show(); };
  }
  show() {
    const c = VR.cineNow, box = this.d.querySelector('#cnBox');
    if (!c) { box.innerHTML = '<p class="hint">La pantalla está apagada. Poné un video.</p>'; return; }
    const st = Math.max(0, Math.floor((Date.now() - c.t0) / 1000));
    box.innerHTML = '<p class="hint">En pantalla: youtu.be/' + c.v + '</p>'; void st;
  }
  open() { VR.input.releaseAll(); VR.input.enabled = false; this.d.showModal(); this.show(); }
  close() { this.d.querySelector('#cnBox').innerHTML = ''; this.d.close(); VR.input.enabled = true; }
};
