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
  // ---- sala en alta calidad: dos lienzos (fondo y frente) a 3× la escala del juego
  buildHQ() {
    const F = 3, W = this.W, H = this.H, mk = () => { const c = document.createElement('canvas'); c.width = W * F; c.height = H * F; const g = c.getContext('2d'); g.scale(F, F); g.lineJoin = 'round'; return [c, g]; }, [bc, g] = mk(), [fc, f] = mk(), hh = VR.hash;
    const lin = (x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach((c, i) => q.addColorStop(i / (st.length - 1), c)); return q; };
    const box = (x, y, w, h, st, r = 0, hor = false, ctx = g) => { ctx.fillStyle = Array.isArray(st) ? (hor ? lin(x, 0, x + w, 0, st) : lin(0, y, 0, y + h, st)) : st; ctx.beginPath(); if (r) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); };
    const glow = (x, y, r, c, a, ctx = g) => { const q = ctx.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, c.replace('A', a)); q.addColorStop(1, c.replace('A', 0)); ctx.fillStyle = q; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    g.fillStyle = '#16141a'; g.fillRect(0, 0, W, H);
    // alfombra gris azulada con dibujo y pasillos con luces
    box(18, 150, 324, 368, ['#4a4c58', '#3a3c48']); g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 0.4; for (let y = 152; y < 518; y += 8) for (let x = 18; x < 342; x += 8) { g.beginPath(); g.moveTo(x + 4, y); g.lineTo(x + 8, y + 4); g.lineTo(x + 4, y + 8); g.lineTo(x, y + 4); g.closePath(); g.stroke(); }
    for (let i = 0; i < 700; i++) { g.fillStyle = hh(i, 1, 4) < 0.5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.07)'; g.fillRect(20 + hh(i, 2, 4) * 320, 152 + hh(i, 3, 4) * 364, 1.4, 0.8); }
    for (const x0 of [112, 236]) { box(x0, 150, 12, 368, ['rgba(120,124,140,.5)', 'rgba(120,124,140,.28)'], 0, true); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x0 + 5, 150, 2, 368); }
    for (let y = 186; y < 450; y += 40) for (const x of [118, 242]) { glow(x + 1, y + 1, 9, 'rgba(255,230,160,A)', 0.55); g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(x + 1, y + 1, 1.2, 0, 7); g.fill(); }
    // paredes de listones de madera con apliques
    for (const x0 of [0, 342]) { for (let x = x0; x < x0 + 18; x += 3) { g.fillStyle = lin(x, 0, x + 3, 0, ['#a06a3c', '#7a4a2a', '#5e3820']); g.fillRect(x, 0, 3, H); g.fillStyle = 'rgba(255,220,170,.18)'; g.fillRect(x, 0, 0.6, H); } for (let y = 40; y < H; y += 70) { glow(x0 === 0 ? 16 : 344, y, 22, 'rgba(255,200,120,A)', 0.4); box(x0 === 0 ? 14 : 342, y - 3, 4, 6, ['#f8e0a8', '#c89a50'], 1.4); } g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x0 === 0 ? 18 : 342 - 3, 0, 3, H); }
    box(18, 0, 324, 14, ['#e4dfd4', '#bcb6aa']);
    // escenario: fondo, telón de terciopelo, piso lustrado y pantalla
    box(18, 14, 324, 108, ['#0a1424', '#142a4a']); g.fillStyle = 'rgba(40,90,160,.18)'; for (let i = 0; i < 9; i++) g.fillRect(28 + i * 36, 14, 12, 108);
    const S = this.SCR; box(S.x - 5, S.y - 5, S.w + 10, S.h + 10, ['#2a2c34', '#0c0d10'], 3); box(S.x - 3, S.y - 3, S.w + 6, S.h + 6, '#05060a', 2); g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.moveTo(S.x, S.y + S.h); g.lineTo(S.x + 60, S.y); g.lineTo(S.x + 90, S.y); g.lineTo(S.x + 30, S.y + S.h); g.fill();
    for (const [x0, x1] of [[18, 90], [270, 342]]) { box(x0, 14, x1 - x0, 108, ['#12245a', '#2c4ea8', '#18306e', '#2c4ea8', '#12245a'], 0, true); g.strokeStyle = 'rgba(0,0,40,.45)'; g.lineWidth = 0.7; for (let x = x0 + 4; x < x1; x += 6) { g.beginPath(); g.moveTo(x, 14); g.quadraticCurveTo(x + (x1 > 200 ? -1.5 : 1.5), 70, x, 122); g.stroke(); } g.strokeStyle = 'rgba(160,190,255,.2)'; for (let x = x0 + 7; x < x1; x += 6) { g.beginPath(); g.moveTo(x, 14); g.quadraticCurveTo(x + (x1 > 200 ? -1.5 : 1.5), 70, x, 122); g.stroke(); } box(x0, 14, x1 - x0, 3, ['#a82a3a', '#7a1a28']); box(x0 === 18 ? x1 - 3 : x0, 14, 3, 108, '#9a2434'); box(x0, 119, x1 - x0, 3, ['#a82a3a', '#7a1a28']); }
    box(18, 12, 324, 4, ['#8e1c2a', '#5a1018']); { const q = lin(0, 122, 0, 152, ['#3a8ad8', '#3aa8d8', '#2a9a6a']); g.fillStyle = q; g.fillRect(90, 122, 180, 28); } g.fillStyle = 'rgba(255,255,255,.1)'; for (let x = 92; x < 270; x += 8) g.fillRect(x, 122, 0.7, 28); glow(180, 138, 90, 'rgba(120,220,255,A)', 0.35); glow(120, 136, 40, 'rgba(120,255,200,A)', 0.25); glow(240, 136, 40, 'rgba(120,180,255,A)', 0.25);
    box(18, 150, 324, 5, ['#3a3a42', '#1c1c20']); g.fillStyle = '#7ae0ff'; g.fillRect(90, 150, 180, 1.2); for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#ff7aa8' : '#7ae0ff'; g.fillRect(96 + k * 29, 151, 4, 1.4); }
    box(18, 122, 72, 28, ['#2a2a30', '#17171b']); box(270, 122, 72, 28, ['#2a2a30', '#17171b']); for (const x of [22, 52, 274, 304]) { box(x, 126, 14, 20, ['#3a3a42', '#16161a'], 1.4); g.fillStyle = '#0a0a0e'; g.beginPath(); g.arc(x + 7, 136, 5, 0, 7); g.fill(); g.strokeStyle = '#5a5a64'; g.lineWidth = 0.5; g.beginPath(); g.arc(x + 7, 136, 5, 0, 7); g.stroke(); }
    g.strokeStyle = '#c8ccd4'; g.lineWidth = 1; g.strokeRect(40, 6, 280, 5); for (let x = 40; x < 320; x += 6) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x + 6, 11); g.stroke(); } g.strokeStyle = '#7a7e88'; g.strokeRect(40, 7, 280, 3);
    for (let x = 60, k = 0; x < 310; x += 36, k++) { const c = ['120,200,255', '255,140,200', '140,255,200'][k % 3]; box(x - 1, 9, 7, 7, ['#34343a', '#14141a'], 1.4); g.fillStyle = 'rgba(' + c + ',.22)'; g.beginPath(); g.moveTo(x + 2.5, 16); g.lineTo(x - 8, 46); g.lineTo(x + 13, 46); g.closePath(); g.fill(); glow(x + 2.5, 46, 14, 'rgba(' + c + ',A)', 0.32); }
    // butacas: respaldo, almohadón y apoyabrazos
    for (const st of this.seats) { const x = st.x, y = st.y; g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y + 5.4, 7.6, 2.4, 0, 0, 7); g.fill(); box(x - 7.4, y - 8, 14.8, 13, ['#2e2e38', '#14141a'], 2.4); box(x - 5.6, y - 6, 11.2, 5, ['#3e3e4a', '#22222a'], 1.6); box(x - 6, y - 2.4, 12, 7.6, ['#c43848', '#8e1c2a', '#6e1220'], 2.2); g.fillStyle = 'rgba(255,200,210,.45)'; g.fillRect(x - 5, y - 2.2, 10, 0.9); box(x - 7.8, y - 4.4, 2.2, 9, ['#4a4a58', '#1c1c22'], 1); box(x + 5.6, y - 4.4, 2.2, 9, ['#4a4a58', '#1c1c22'], 1); }
    // ---- frente: el palco blanco curvo del fondo y las puertas de vidrio
    f.fillStyle = 'rgba(0,0,0,.35)'; f.beginPath(); f.moveTo(18, 472); f.quadraticCurveTo(180, 458, 342, 472); f.lineTo(342, 496); f.quadraticCurveTo(180, 482, 18, 496); f.fill();
    { const q = f.createLinearGradient(0, 456, 0, 488); q.addColorStop(0, '#fbf9f4'); q.addColorStop(1, '#cfcabd'); f.fillStyle = q; f.beginPath(); f.moveTo(18, 468); f.quadraticCurveTo(180, 452, 342, 468); f.lineTo(342, 486); f.quadraticCurveTo(180, 470, 18, 486); f.fill(); } f.strokeStyle = 'rgba(120,112,98,.6)'; f.lineWidth = 0.6; f.beginPath(); f.moveTo(18, 468); f.quadraticCurveTo(180, 452, 342, 468); f.stroke(); f.fillStyle = '#b8b2a4'; f.fillRect(18, 484, 324, 2.4); for (let x = 30; x < 342; x += 24) { f.fillStyle = 'rgba(255,255,255,.7)'; f.beginPath(); f.roundRect(x, 468 - 16 * Math.sin((x - 18) / 324 * Math.PI) * 0.35 - 2 + 6, 6, 14, 2); f.fill(); }
    box(18, 518, 324, 12, ['#efeae0', '#c8c2b4'], 0, false, f); box(142, 512, 76, 18, ['#6a4224', '#4a2c16'], 1.6, false, f); for (const x of [146, 182]) { box(x, 515, 32, 15, ['#d8f0fa', '#8cc0d8'], 1, false, f); f.fillStyle = 'rgba(255,255,255,.5)'; f.beginPath(); f.moveTo(x + 4, 530); f.lineTo(x + 14, 515); f.lineTo(x + 19, 515); f.lineTo(x + 9, 530); f.fill(); } f.fillStyle = '#d8b84a'; f.fillRect(179, 520, 1.4, 6); f.fillRect(181.4, 520, 1.4, 6);
    box(160, 505, 40, 8, ['#0a3a1a', '#06260f'], 1.6, false, f); glow(180, 509, 30, 'rgba(80,255,130,A)', 0.4, f); f.fillStyle = '#a8ffc0'; f.font = 'bold 6px system-ui'; f.textAlign = 'center'; f.fillText('SALIDA', 180, 511.4); f.textAlign = 'left';
    const vg = g.createRadialGradient(W / 2, H * 0.55, 90, W / 2, H * 0.55, 320); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,12,.4)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    return { bg: bc, fg: fc };
  }
  draw(g, sw0, sh0) {
    const t = this.t, W = this.W, H = this.H, z = 1, sw = sw0, sh = sh0, kk = VR.screen.scale / (window.devicePixelRatio || 1), band = this.fr.offsetHeight / kk; // la franja de arriba es la pantalla grande
    g.save(); g.scale(z, z);
    const ty = t.sit ? t.sit.y : t.y, cx = W <= sw ? (W - sw) / 2 : VR.clamp(t.x - sw / 2, 0, W - sw), cy = ty - band - (sh - band) * 0.62;
    g.fillStyle = '#16141a'; g.fillRect(0, 0, sw, sh);
    g.save(); g.translate(-Math.round(cx), -Math.round(cy));
    // fondo en alta (11/11/2026): sala, escenario y butacas se arman una vez en un lienzo grande
    if (!this.hq) this.hq = this.buildHQ(); g.imageSmoothingEnabled = true; g.drawImage(this.hq.bg, 0, 0, W, H);
    { const S = this.SCR; if (!VR.cineNow) { g.fillStyle = '#0c121a'; g.fillRect(S.x, S.y, S.w, S.h); g.fillStyle = '#7a8ea8'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText('🎬 Poné un video (botón de abajo)', S.x + S.w / 2, S.y + S.h / 2); } }
    // gente (yo y los demás de la sala), ordenada por altura
    const L = [];
    for (const o of this.online.others.values()) if (o.tz && o.t && o.look) L.push({ y: o.t[1], f: () => this.person(g, o.look, o.t[0], o.t[1], ['up', 'right', 'down', 'left'][o.t[2]] || 'up', o.t[3], o.t[4], performance.now() / 105, o.n, 0, 0) });
    L.push({ y: t.sit ? t.sit.y : t.y, f: () => this.person(g, this.p.sprites, t.sit ? t.sit.x : t.x, t.sit ? t.sit.y : t.y, t.dir, t.moving ? (t.run ? 2 : 1) : 0, !!t.sit, t.anim, '', 0, 0) });
    L.sort((a, b) => a.y - b.y).forEach((e) => e.f());
    g.drawImage(this.hq.fg, 0, 0, W, H);
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
