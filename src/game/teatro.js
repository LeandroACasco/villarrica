// Interior del Teatro Municipal (05/11/2026, fotos de Leandro): sala vista desde arriba con escenario
// (piso iluminado azul y verde, telón azul con borde rojo, estructura de luces), pantalla con el video de
// YouTube (un iframe encima del lienzo, en el lugar de la pantalla), butacas negras con almohadón rojo en tres
// bloques, pasillos de alfombra gris, paredes de listones de madera, palco blanco curvo al fondo y puertas de
// vidrio. Te sentás con ACCIÓN; online, los demás te ven (estado m.tz / m.t en online.js).
'use strict';
VR.Teatro = class {
  constructor(player, online, toast) {
    this.p = player; this.online = online; this.toast = toast; this.on = false;
    this.W = 360; this.H = 530; this.SCR = { x: 92, y: 18, w: 176, h: 99 };
    // butacas: 3 bloques con 2 pasillos
    this.seats = []; this.blocks = [];
    for (let r = 0, y = 182; y < 452; y += 20, r++) for (const [x0, n] of [[30, 5], [128, 7], [252, 5]]) {
      this.blocks.push({ x: x0 - 2, y: y - 7, w: n * 16 + 2, h: 12 });
      for (let i = 0; i < n; i++) this.seats.push({ x: x0 + 7 + i * 16, y });
    }
    this.solid = [{ x: 0, y: 0, w: 18, h: 530 }, { x: 342, y: 0, w: 18, h: 530 }, { x: 0, y: 0, w: 360, h: 122 }, { x: 18, y: 0, w: 70, h: 150 }, { x: 272, y: 0, w: 70, h: 150 }, { x: 0, y: 518, w: 360, h: 12 }].concat(this.blocks);
    // pantalla grande (05/11/2026): arriba la pantalla del teatro con su telón; abajo, la sala de cerca.
    // Sentado, "Solo mirar" la pone en pantalla completa con el mismo marco.
    this.fr = document.createElement('div'); this.fr.id = 'tvFrame'; this.fr.hidden = true;
    this.fr.innerHTML = '<div class="tvIn"><iframe allow="autoplay; encrypted-media" allowfullscreen></iframe><p class="tvOff">🎬 La pantalla está apagada · tocá «Poner video»</p></div><button class="icon-btn tvBack">↩ Volver a la sala</button>';
    document.body.append(this.fr); this.ifr = this.fr.querySelector('iframe');
    this.fr.querySelector('.tvBack').onclick = () => this.setFull(false);
    this.watch = document.createElement('button'); this.watch.className = 'icon-btn'; this.watch.textContent = '📺 Solo mirar'; this.watch.style.cssText = 'position:fixed;right:calc(env(safe-area-inset-right) + 10px);bottom:calc(env(safe-area-inset-bottom) + 10px);z-index:6;display:none;width:auto;padding:0 14px';
    this.watch.onclick = () => this.setFull(true); document.body.append(this.watch);
    this.btn = document.createElement('button'); this.btn.textContent = '🎬 Poner video'; this.btn.className = 'icon-btn'; this.btn.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom) + 10px);z-index:6;display:none;width:auto;padding:0 14px';
    document.body.append(this.btn);
  }
  // sincronía del video (05/11/2026): cada 3 s se pregunta al reproductor en qué segundo va y, si se separó
  // más de 1,2 s del reloj de la sala, se lo corrige (seekTo). Así todos ven lo mismo aunque carguen distinto.
  yt(func, args = []) { try { this.ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); } catch (e) {} }
  sync(c) {
    if (!this.listen) { this.listen = true; addEventListener('message', (e) => { if (e.source !== this.ifr.contentWindow) return; let d; try { d = JSON.parse(e.data); } catch (x) { return; } if (d && d.info && typeof d.info.currentTime === 'number') { this.vt = d.info.currentTime; this.vtAt = performance.now(); if (typeof d.info.playerState === 'number') this.vstate = d.info.playerState; } }); }
    const now = performance.now(); if (now < (this.syncT || 0)) return; this.syncT = now + 3000;
    try { this.ifr.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*'); } catch (e) {}
    const target = (VR.netNow() - c.t0) / 1000; if (target < 0) return;
    if (this.vt == null) return;
    const cur = this.vt + (this.vstate === 1 ? (now - this.vtAt) / 1000 : 0);
    if (Math.abs(cur - target) > 1.2) this.yt('seekTo', [target, true]);
    if (this.vstate === 2 || this.vstate === -1 || this.vstate === 5) this.yt('playVideo');
  }
  setFull(on) { this.full = on; this.fr.classList.toggle('full', on); }
  enter() { this.on = true; Object.assign(this.t = this.t || {}, { x: 180, y: 500, dir: 'up', moving: false, anim: 0, sit: null }); this.btn.style.display = ''; this.cur = null; this.fr.hidden = false; this.toast('🎭 Teatro Municipal · ACCIÓN para sentarte'); }
  exit() { this.on = false; this.fr.hidden = true; this.setFull(false); this.ifr.src = 'about:blank'; this.cur = null; this.btn.style.display = 'none'; this.watch.style.display = 'none'; }
  hit(x, y) { for (const r of this.solid) if (x > r.x - 4 && x < r.x + r.w + 4 && y > r.y - 2 && y < r.y + r.h + 2) return true; return false; }
  update(dt, I) {
    const t = this.t;
    if (t.sit) { if (I.pressed('action') || Math.hypot(I.ax, I.ay) > 0.5) { t.x = t.sit.x; t.y = t.sit.y + 11; t.sit = null; } return; }
    const mag = Math.min(1, Math.hypot(I.ax, I.ay)), run = I.down('run'), sp = (run ? 100 : 58) * mag;
    t.moving = mag > 0.15;
    if (t.moving) {
      const nx = t.x + I.ax / (mag || 1) * sp * dt, ny = t.y + I.ay / (mag || 1) * sp * dt;
      if (!this.hit(nx, t.y)) t.x = nx; if (!this.hit(t.x, ny)) t.y = ny;
      t.dir = Math.abs(I.ax) > Math.abs(I.ay) * 1.15 ? (I.ax > 0 ? 'right' : 'left') : I.ay > 0 ? 'down' : 'up';
      t.run = run; t.anim += dt * (run ? 15 : 9.5);
    }
    if (I.pressed('action')) {
      if (t.y > 495 && Math.abs(t.x - 180) < 40) { this.exit(); return 'out'; }
      let best = null, bd = 16; for (const s of this.seats) { const d = Math.hypot(s.x - t.x, s.y + 9 - t.y); if (d < bd && !this.taken(s)) { bd = d; best = s; } }
      if (best) { t.sit = best; t.dir = 'up'; } else this.toast(t.y > 480 ? 'ACCIÓN en la puerta para salir' : 'Acercate a una butaca');
    }
  }
  taken(s) { for (const o of this.online.others.values()) if (o.tz && o.t && o.t[4] && Math.hypot(o.t[0] - s.x, o.t[1] - s.y) < 3) return true; return false; }
  state() { const t = this.t; return [Math.round(t.sit ? t.sit.x : t.x), Math.round(t.sit ? t.sit.y : t.y), ['up', 'right', 'down', 'left'].indexOf(t.dir), t.moving ? (t.run ? 2 : 1) : 0, t.sit ? 1 : 0]; }
  person(g, look, x, y, dir, mv, sit, anim, name, cx, cy) {
    const X = Math.round(x - cx), Y = Math.round(y - cy);
    if (!sit) { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(X, Y - 1, 6, 2.5, 0, 0, 7); g.fill(); }
    const img = sit ? look.get('up', 'sit', 0) : mv ? look.get(dir, mv > 1 ? 'run' : 'walk', Math.floor(anim) % 8) : look.get(dir, 'idle', 0);
    if (sit) { g.drawImage(img, 0, 0, img.width, img.height * 0.6, X - 8, Y - 24, 16, 19.2); g.fillStyle = '#101014'; g.fillRect(X - 7, Y - 6, 14, 4); g.fillStyle = '#2a2a32'; g.fillRect(X - 7, Y - 6, 14, 1); } // de espaldas, el respaldo tapa las piernas
    else g.drawImage(img, X - 8 * VR.PS, Y - 31 * VR.PS, 16 * VR.PS, 32 * VR.PS);
    if (name) { g.font = 'bold 7px sans-serif'; g.textAlign = 'center'; g.lineWidth = 2.5; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(name, X, Y - 34); g.fillStyle = '#ffd84a'; g.fillText(name, X, Y - 34); }
  }
  draw(g, sw0, sh0) {
    const t = this.t, W = this.W, H = this.H, z = 1, sw = sw0, sh = sh0, kk = VR.screen.scale / (window.devicePixelRatio || 1), band = this.fr.offsetHeight / kk; // la franja de arriba es la pantalla grande
    g.save(); g.scale(z, z);
    const ty = t.sit ? t.sit.y : t.y, cx = W <= sw ? (W - sw) / 2 : VR.clamp(t.x - sw / 2, 0, W - sw), cy = ty - band - (sh - band) * 0.62;
    g.fillStyle = '#16141a'; g.fillRect(0, 0, sw, sh);
    g.save(); g.translate(-Math.round(cx), -Math.round(cy));
    // piso: alfombra gris con lucecitas en los pasillos
    g.fillStyle = '#6e6c70'; g.fillRect(18, 150, 324, 368);
    g.fillStyle = 'rgba(255,255,255,.04)'; for (let y = 152; y < 518; y += 4) g.fillRect(18, y, 324, 1);
    for (let y = 186; y < 450; y += 40) for (const x of [118, 242]) { g.fillStyle = '#fff6d8'; g.fillRect(x, y, 2, 2); }
    // paredes de listones de madera
    for (const x0 of [0, 342]) { g.fillStyle = '#7a4a2a'; g.fillRect(x0, 0, 18, H); g.fillStyle = '#9a6238'; for (let x = x0 + 1; x < x0 + 18; x += 3) g.fillRect(x, 0, 1, H); }
    g.fillStyle = '#d8d4cc'; g.fillRect(18, 0, 324, 14); // pared del fondo del escenario
    // escenario: pantalla, telón, piso iluminado
    g.fillStyle = '#0c1a2c'; g.fillRect(18, 14, 324, 108);
    const S = this.SCR; g.fillStyle = '#05060a'; g.fillRect(S.x - 3, S.y - 3, S.w + 6, S.h + 6);
    if (!VR.cineNow) { g.fillStyle = '#121a24'; g.fillRect(S.x, S.y, S.w, S.h); g.fillStyle = '#5a6e88'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText('🎬 Poné un video (botón de abajo)', S.x + S.w / 2, S.y + S.h / 2); }
    for (const [x0, x1] of [[18, 90], [270, 342]]) { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#16285a'); gr.addColorStop(0.5, '#2a4a9a'); gr.addColorStop(1, '#16285a'); g.fillStyle = gr; g.fillRect(x0, 14, x1 - x0, 136); g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = x0 + 3; x < x1; x += 6) g.fillRect(x, 14, 2, 136); g.fillStyle = '#a02430'; g.fillRect(x0 === 18 ? x1 - 4 : x0, 14, 4, 136); }
    const sg = g.createLinearGradient(0, 122, 0, 152); sg.addColorStop(0, '#2a7ac8'); sg.addColorStop(0.6, '#3aa0d8'); sg.addColorStop(1, '#2a9a6a'); g.fillStyle = sg; g.fillRect(90, 122, 180, 28);
    g.fillStyle = 'rgba(255,255,255,.12)'; for (let x = 92; x < 270; x += 8) g.fillRect(x, 122, 1, 28);
    g.fillStyle = '#2a2a30'; g.fillRect(18, 150, 324, 5); g.fillStyle = '#5ad0ff'; g.fillRect(90, 150, 180, 1);
    // estructura de luces (truss) con reflectores
    g.strokeStyle = '#b8bcc4'; g.lineWidth = 1; g.strokeRect(40, 6, 280, 5); for (let x = 40; x < 320; x += 6) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x + 6, 11); g.stroke(); }
    for (let x = 60; x < 310; x += 36) { g.fillStyle = '#1a1a1e'; g.fillRect(x, 10, 5, 5); g.fillStyle = 'rgba(120,200,255,.35)'; g.beginPath(); g.moveTo(x + 2.5, 15); g.lineTo(x - 6, 40); g.lineTo(x + 11, 40); g.fill(); }
    // butacas
    for (const s of this.seats) { g.fillStyle = '#1c1c22'; g.fillRect(s.x - 7, s.y - 7, 14, 12); g.fillStyle = '#8e1c2a'; g.fillRect(s.x - 5, s.y - 4, 10, 7); g.fillStyle = '#b42a3a'; g.fillRect(s.x - 5, s.y - 4, 10, 2); g.fillStyle = '#e8c040'; g.fillRect(s.x + 4, s.y - 7, 2, 1); g.fillStyle = '#101014'; g.fillRect(s.x - 7, s.y + 2, 14, 3); }
    // gente (yo y los demás de la sala), ordenada por altura
    const L = [];
    for (const o of this.online.others.values()) if (o.tz && o.t && o.look) L.push({ y: o.t[1], f: () => this.person(g, o.look, o.t[0], o.t[1], ['up', 'right', 'down', 'left'][o.t[2]] || 'up', o.t[3], o.t[4], performance.now() / 105, o.n, 0, 0) });
    L.push({ y: t.sit ? t.sit.y : t.y, f: () => this.person(g, this.p.sprites, t.sit ? t.sit.x : t.x, t.sit ? t.sit.y : t.y, t.dir, t.moving ? (t.run ? 2 : 1) : 0, !!t.sit, t.anim, '', 0, 0) });
    L.sort((a, b) => a.y - b.y).forEach((e) => e.f());
    // palco blanco curvo al fondo y puertas de vidrio
    g.fillStyle = 'rgba(236,234,228,.92)'; g.beginPath(); g.moveTo(18, 468); g.quadraticCurveTo(180, 452, 342, 468); g.lineTo(342, 486); g.quadraticCurveTo(180, 470, 18, 486); g.fill();
    g.fillStyle = '#c8c4bc'; g.fillRect(18, 484, 324, 2);
    g.fillStyle = '#e8e4dc'; g.fillRect(18, 518, 324, 12); g.fillStyle = '#7a4a2a'; g.fillRect(146, 516, 68, 10); g.fillStyle = '#9ac8d8'; for (let x = 149; x < 212; x += 16) g.fillRect(x, 518, 13, 7);
    if (t.y > 488 && Math.abs(t.x - 180) < 40 && !t.sit) { g.font = 'bold 8px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('ACCIÓN: salir', 180, 510); }
    g.restore(); g.restore();
    // el video en la pantalla grande de arriba (o completa)
    this.watch.style.display = t.sit && !this.full ? '' : 'none';
    { const cs = getComputedStyle(this.fr), iw = this.fr.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ih = this.fr.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom), w = Math.max(0, Math.min(iw, ih * 16 / 9)), box = this.fr.firstChild;
      if (box.dataset.w !== String(w | 0)) { box.dataset.w = w | 0; box.style.width = w + 'px'; box.style.height = w * 9 / 16 + 'px'; } } // 16:9 siempre, entre en lo que haya
    const c = VR.cineNow; this.fr.classList.toggle('off', !c);
    if (c) {
      if (this.cur !== c.v + c.t0) { this.cur = c.v + c.t0; this.ifr.src = 'https://www.youtube-nocookie.com/embed/' + c.v + '?autoplay=1&controls=0&enablejsapi=1&origin=' + encodeURIComponent(location.origin) + '&start=' + Math.max(0, Math.floor((VR.netNow() - c.t0) / 1000)); this.vt = null; this.syncT = performance.now() + 2500; }
      this.sync(c);
    }
  }
};
