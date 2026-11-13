// Taller y cine (05/11/2026, pedidos de Leandro).
// Taller "Pyahu" en una calle del Centro: entrás con el vehículo, ACCIÓN, elegís piezas (catálogo de tune.js),
// ves el costado en alta y pagás con la billetera. El tuneo se guarda con el vehículo y se ve online.
// Cine en el Teatro Municipal: en la entrada sur, ACCIÓN; pegás un enlace de YouTube y, online, todos ven el
// mismo video en el mismo momento (VR.cineNow = { v, t0 }).
'use strict';
VR.dlg = (id, html) => { const d = document.createElement('dialog'); d.id = id; d.className = 'vrdlg'; d.innerHTML = html; document.body.append(d); return d; };
VR.Garage = class {
  constructor() {
    this.d = VR.dlg('garage', '<h2>🔧 Taller Pyahu</h2><canvas id="grTurn" width="480" height="240" style="width:100%;max-width:420px;touch-action:none;cursor:grab"></canvas><canvas id="grPrev" width="320" height="180" hidden></canvas><div class="seg" id="grView"><button data-v="turn" class="on">🔄 Girar</button><button data-v="side">Costado</button></div><p class="hint" id="grHint">Arrastrá para girarlo</p><div id="grParts"></div><p id="grTot"></p><div class="seg"><button id="grFix">🔧 Reparar</button><button id="grBuy">Comprar</button><button id="grOut">Salir</button></div>');
    this.d.querySelector('#grOut').onclick = () => this.close();
    this.view = 'turn'; this.ang = 0.9; this.auto = true; this.fr = new Map();
    for (const b of this.d.querySelectorAll('#grView button')) b.onclick = () => { this.view = b.dataset.v; for (const o of this.d.querySelectorAll('#grView button')) o.classList.toggle('on', o === b); this.d.querySelector('#grTurn').hidden = this.view !== 'turn'; this.d.querySelector('#grPrev').hidden = this.view !== 'side'; this.d.querySelector('#grHint').hidden = this.view !== 'turn'; this.paint(); };
    const tc = this.d.querySelector('#grTurn'); let drag = null;
    tc.onpointerdown = (e) => { drag = { x: e.clientX, a: this.ang }; this.auto = false; tc.setPointerCapture(e.pointerId); tc.style.cursor = 'grabbing'; };
    tc.onpointermove = (e) => { if (!drag) return; this.ang = drag.a + (e.clientX - drag.x) * 0.012; this.paintTurn(); };
    tc.onpointerup = tc.onpointercancel = () => { drag = null; tc.style.cursor = 'grab'; setTimeout(() => { if (!drag) this.auto = true; }, 2500); };
    this.d.querySelector('#grBuy').onclick = () => this.buy();
    this.d.querySelector('#grFix').onclick = () => { // reparar: 1.500 Gs. por punto de vida
      const c = this.car, hp = c.hp ?? 100; if (hp >= 99 && !c.burning) { this.toast('✨ Está joya, no hace falta'); return; }
      const n = Math.round((100 - Math.max(0, hp)) * 1500 / 1000) * 1000; if (n > VR.Wallet.get()) { this.toast('💸 Reparar cuesta ' + VR.fmtGs(n)); return; }
      VR.Wallet.add(-n, 'Taller: reparación'); c.hp = 100; if (c.burning && VR.emer) { c.burning = false; VR.emer.burning && VR.emer.burning.delete(c); } this.toast('🔧 Quedó como nuevo · ' + VR.fmtGs(n)); this.paint(); };
  }
  open(car, toast) {
    this.car = car; this.toast = toast; const m = car.model, M = VR.TUNE_MODELS[m]; this.model = m;
    if (!M) { toast('Este vehículo no se puede tunear'); return; }
    this.old = Object.assign(VR.tuneDefault(m), car.tune || {}); this.t = { ...this.old };
    const box = this.d.querySelector('#grParts'); box.innerHTML = '';
    for (const p of M.parts) {
      const P = VR.TUNE_PARTS[p], s = document.createElement('select'); s.dataset.p = p;
      const opts = p === 'color' || p === 'color2' ? VR.TUNE_COLORS.map((c, i) => [i, c[0]]) : Object.entries(P.opts).map(([k, o]) => [k, o[0]]);
      for (const [k, name] of opts) { const o = document.createElement('option'); o.value = k; o.textContent = name; s.append(o); }
      s.value = this.t[p]; s.onchange = () => { this.base = null; this.t[p] = p === 'color' || p === 'color2' || p === 'polarizado' || p === 'bajo' ? +s.value : s.value; this.paint(); };
      const l = document.createElement('label'); l.textContent = P.name + ' '; l.append(s); box.append(l);
    }
    VR.input.releaseAll(); VR.input.enabled = false; this.fr.clear(); this.base = null; this.d.showModal(); this.paint(); this.loop();
  }
  // vista giratoria en alta calidad: el mismo dibujo oblicuo del juego, pero sin achicarlo (a la resolución con que se arma antes de bajarlo)
  turnImg(k) {
    const key = this.model + ':' + VR.tuneKey(this.t) + ':' + k; let c = this.fr.get(key); if (c) return c;
    const car = this.car, sp = VR.vspec(car.type, car.model), OB = VR.OBL;
    if (!this.base) this.base = sp.base(VR.tunePal(this.t.color), this.t);
    const base = this.base; if (!base.prof || !OB || !OB.on) return null;
    const S = sp.S + 2 * OB.extra(base), ss = base.ss || 1, B = Math.round(S * ss), a = k / 64 * Math.PI * 2;
    c = VR.gfx.softOutline(OB.render(base, a, B), 'rgba(18,16,20,.92)', ss * 0.8); this.fr.set(key, c);
    if (this.fr.size > 160) this.fr.delete(this.fr.keys().next().value);
    return c;
  }
  paintTurn() {
    const c = this.d.querySelector('#grTurn'), g = c.getContext('2d'), W = c.width, H = c.height; g.clearRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a2e36'); gr.addColorStop(1, '#14161a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.ellipse(W / 2, H * 0.6, W * 0.42, H * 0.22, 0, 0, 7); g.fill();
    const k = ((Math.round(this.ang / (Math.PI * 2) * 64) % 64) + 64) % 64, img = this.turnImg(k);
    if (!img) { try { g.drawImage(VR.drawSideHD(this.car.model, VR.tunePal(this.t.color), this.t, 320, 180), 80, 45, 320, 180); } catch (e) {} return; }
    if (!this.fit) this.fit = {};
    const m = this.car.model; let f = this.fit[m];
    if (!f) { const side = VR.vspec(this.car.type, m), SS = (this.base.ss || 1); f = this.fit[m] = Math.min(H * 0.74, W * 0.5) / (Math.max(side.len, side.wid) * (VR.VK || 1) * SS * 0.8); }
    const w = img.width * f, h = img.height * f;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(W / 2, H * 0.62, w * 0.34, h * 0.1, 0, 0, 7); g.fill();
    g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }
  loop() {
    if (!this.d.open) return;
    if (this.view === 'turn') { if (this.auto) this.ang += 0.012; this.paintTurn(); }
    requestAnimationFrame(() => this.loop());
  }
  cost() { const m = this.car.model; return VR.TUNE_MODELS[m].parts.reduce((s, p) => s + (String(this.t[p]) !== String(this.old[p]) ? VR.tunePartPrice(m, p, this.t) : 0), 0); }
  paint() {
    if (this.view === 'turn') this.paintTurn();
    const c = this.d.querySelector('#grPrev'), g = c.getContext('2d'); g.clearRect(0, 0, 320, 180);
    if (this.view === 'turn') { this.d.querySelector('#grTot').textContent = 'Total: ' + VR.fmtGs(this.cost()) + ' · vida ' + Math.round(Math.max(0, this.car.hp ?? 100)) + '% · tenés ' + VR.fmtGs(VR.Wallet.get()); return; }
    try { g.drawImage(VR.drawSideHD(this.car.model, VR.tunePal(this.t.color), this.t, 320, 180), 0, 0); } catch (e) {}
    this.d.querySelector('#grTot').textContent = 'Total: ' + VR.fmtGs(this.cost()) + ' · vida ' + Math.round(Math.max(0, this.car.hp ?? 100)) + '% · tenés ' + VR.fmtGs(VR.Wallet.get());
  }
  buy() {
    const n = this.cost(); if (n > VR.Wallet.get()) { this.toast('💸 No te alcanza la plata'); return; }
    VR.Wallet.add(-n, 'Taller: tuneo'); const c = this.car; c.tune = { ...this.t };
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
