// Personas: sprite original de 16×26 (04/11/2026, segunda versión). Se dibuja con formas suaves al cuádruple
// (cabeza ovalada, hombros que se angostan hacia la cintura, brazos y piernas finos con articulaciones) y se
// achica con suavizado, para que parezca una persona y no un muñeco de bloques. 4 direcciones × 4 cuadros.
VR.makePlayerSprites = (pal) => {
  const C = Object.assign({ skin: '#c98b5c', skinD: '#a76c42', hair: '#2a1b12', shirt: '#d23c2c', shirtD: '#9f2a20',
    pants: '#2c3e6b', pantsD: '#1e2b4d', shoes: '#18181c', sole: '#e8e4da', eye: '#1a1210', style: 'corto', cap: '#2e6fc8', skirt: false }, pal || {});
  const lite = (h, k) => VR.shadeHex(h, k);
  const W = 16, H = 26, Q = 4;
  const STEP = [0, 1, 0, -1];
  const frame = (dir, f) => {
    const big = VR.canvas(W * Q, H * Q), g = big.getContext('2d'); g.scale(Q, Q);
    const s = STEP[f], bob = s ? 0.35 : 0;
    const ell = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
    const limb = (x0, y0, x1, y1, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const path = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
    const grad = (x0, x1, a, b) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
    g.translate(0, -bob);
    if (dir === 'down' || dir === 'up') {
      const front = dir === 'down';
      // piernas: la que va adelante se ve un poco más corta (pie levantado)
      const lf = s < 0 ? 0.9 : 0, rf = s > 0 ? 0.9 : 0;
      if (C.skirt) {
        limb(6.6, 15.5, 6.6, 22.6 - lf, 1.5, C.skin); limb(9.4, 15.5, 9.4, 22.6 - rf, 1.5, C.skinD);
        path([[5.2, 13.6], [10.8, 13.6], [11.8, 18.2], [4.2, 18.2]], C.pants); path([[8, 13.6], [10.8, 13.6], [11.8, 18.2], [8.6, 18.2]], C.pantsD);
      } else {
        limb(6.5, 14.6, 6.4, 22.4 - lf, 2.3, C.pants); limb(9.5, 14.6, 9.6, 22.4 - rf, 2.3, C.pantsD);
        path([[5.1, 13.4], [10.9, 13.4], [10.9, 15.6], [5.1, 15.6]], C.pants);
      }
      ell(6.3, 23.3 - lf, 1.5, 0.95, C.shoes); ell(9.7, 23.3 - rf, 1.5, 0.95, C.shoes);
      g.fillStyle = C.sole; g.fillRect(4.9, 23.7 - lf, 2.8, 0.45); g.fillRect(8.3, 23.7 - rf, 2.8, 0.45);
      // brazos: se balancean al revés de las piernas
      const sw = s * 0.9;
      limb(4.2, 8.6, 3.6, 11.4 + sw, 1.7, C.shirtD); limb(3.6, 11.2 + sw, 3.5, 13.6 + sw, 1.35, C.skinD);
      limb(11.8, 8.6, 12.4, 11.4 - sw, 1.7, C.shirtD); limb(12.4, 11.2 - sw, 12.5, 13.6 - sw, 1.35, C.skinD);
      ell(3.5, 14 + sw, 0.75, 0.8, C.skin); ell(12.5, 14 - sw, 0.75, 0.8, C.skinD);
      // torso: hombros redondeados que se angostan a la cintura
      g.fillStyle = grad(4, 12, lite(C.shirt, 1.18), C.shirtD);
      g.beginPath(); g.moveTo(5.4, 7.6); g.quadraticCurveTo(3.7, 7.9, 3.9, 9.6); g.lineTo(5, 14); g.lineTo(11, 14); g.lineTo(12.1, 9.6); g.quadraticCurveTo(12.3, 7.9, 10.6, 7.6); g.closePath(); g.fill();
      if (!C.skirt) { g.fillStyle = '#2a2420'; g.fillRect(5, 13.2, 6, 0.8); g.fillStyle = '#d8b04a'; g.fillRect(7.5, 13.2, 1, 0.8); }
      if (front) { path([[6.9, 7.6], [9.1, 7.6], [8, 9.3]], C.skinD); g.fillStyle = lite(C.shirt, 0.8); g.fillRect(5.4, 9.8, 0.4, 3.4); }
      // cuello y cabeza ovalada
      g.fillStyle = C.skinD; g.fillRect(7.1, 6.4, 1.8, 1.6);
      g.fillStyle = grad(5, 11, lite(C.skin, 1.1), C.skinD); g.beginPath(); g.ellipse(8, 4.3, 2.75, 3.15, 0, 0, Math.PI * 2); g.fill();
      ell(5.25, 4.6, 0.55, 0.8, C.skin); ell(10.75, 4.6, 0.55, 0.8, C.skinD); // orejas
      if (front) {
        ell(6.9, 4.6, 0.5, 0.55, '#f6f2ea'); ell(9.1, 4.6, 0.5, 0.55, '#f6f2ea');
        ell(7, 4.65, 0.32, 0.42, C.eye); ell(9.2, 4.65, 0.32, 0.42, C.eye);
        g.fillStyle = C.hair; g.fillRect(6.3, 3.6, 1.3, 0.35); g.fillRect(8.5, 3.6, 1.3, 0.35);
        g.fillStyle = C.skinD; g.fillRect(7.8, 5.2, 0.5, 0.7);
        g.fillStyle = lite(C.skinD, 0.8); g.fillRect(7.3, 6.25, 1.5, 0.3);
      }
      // pelo
      if (C.style === 'gorra') {
        g.fillStyle = C.cap; g.beginPath(); g.ellipse(8, 2.6, 2.95, 2, 0, Math.PI, 0); g.fill(); g.fillRect(5.05, 2.4, 5.9, 0.9);
        if (front) ell(8, 3.3, 3.3, 0.6, lite(C.cap, 0.75)); else { g.fillStyle = C.hair; g.fillRect(5.6, 3.3, 4.8, 2.6); }
      } else if (C.style !== 'pelado') {
        g.fillStyle = C.hair; g.beginPath(); g.ellipse(8, 3.2, 3, 2.35, 0, Math.PI * 0.95, Math.PI * 2.05); g.fill();
        if (front) { g.beginPath(); g.ellipse(7, 2.4, 2.1, 1.3, -0.3, 0, Math.PI * 2); g.fill(); g.fillRect(5, 3, 0.7, 2); g.fillRect(10.3, 3, 0.7, 2); }
        else { g.beginPath(); g.ellipse(8, 4, 2.95, 3, 0, 0, Math.PI * 2); g.fill(); }
        ell(7.1, 1.8, 1.1, 0.45, lite(C.hair, 1.7));
        if (C.style === 'largo') { limb(5.2, 4, 4.9, 9.4, 1.5, C.hair); limb(10.8, 4, 11.1, 9.4, 1.5, C.hair); if (!front) path([[5.2, 5], [10.8, 5], [11, 9.6], [5, 9.6]], C.hair); }
      } else ell(7.2, 2.1, 1.2, 0.6, lite(C.skin, 1.2));
    } else { // perfil mirando a la derecha
      const sw = s * 1.6;
      // pierna y brazo de atrás, más oscuros
      limb(8, 14.6, 8 - sw, 22.5, 2.2, C.skirt ? C.skinD : C.pantsD); ell(8.4 - sw, 23.3, 1.6, 0.9, lite(C.shoes, 1.3));
      limb(8.2, 8.8, 8.2 - sw * 0.7, 13.4, 1.5, C.shirtD); ell(8.2 - sw * 0.7, 13.8, 0.7, 0.75, C.skinD);
      // torso de perfil
      g.fillStyle = grad(5.5, 10.5, C.shirtD, lite(C.shirt, 1.12));
      g.beginPath(); g.moveTo(6.4, 7.6); g.quadraticCurveTo(5.3, 8.4, 5.6, 10.2); g.lineTo(6.2, 14); g.lineTo(9.8, 14); g.lineTo(10.4, 10); g.quadraticCurveTo(10.4, 7.8, 9.4, 7.6); g.closePath(); g.fill();
      if (C.skirt) path([[5.8, 13.4], [10, 13.4], [11, 18], [5.2, 18]], C.pants);
      else { g.fillStyle = '#2a2420'; g.fillRect(6, 13.2, 4, 0.8); }
      // pierna y brazo de adelante
      limb(8, 14.6, 8 + sw, 22.5, 2.2, C.skirt ? C.skin : C.pants); ell(8.6 + sw, 23.3, 1.7, 0.95, C.shoes); g.fillStyle = C.sole; g.fillRect(6.9 + sw, 23.75, 3.4, 0.45);
      limb(8, 8.8, 8 + sw * 0.7, 11.4, 1.7, lite(C.shirt, 1.1)); limb(8 + sw * 0.7, 11.3, 8.2 + sw * 0.8, 13.4, 1.35, C.skin); ell(8.2 + sw * 0.8, 13.8, 0.75, 0.8, C.skin);
      // cuello, cabeza de perfil con nariz
      g.fillStyle = C.skinD; g.fillRect(7.2, 6.4, 1.8, 1.6);
      g.fillStyle = grad(5.5, 11, C.skinD, lite(C.skin, 1.08)); g.beginPath(); g.ellipse(8.2, 4.3, 2.6, 3.1, 0, 0, Math.PI * 2); g.fill();
      path([[10.6, 4.3], [11.5, 5.4], [10.6, 5.7]], C.skin);
      ell(9.8, 4.5, 0.42, 0.5, '#f6f2ea'); ell(9.95, 4.55, 0.28, 0.4, C.eye); g.fillStyle = C.hair; g.fillRect(9.2, 3.6, 1.2, 0.35);
      ell(7.4, 4.8, 0.55, 0.8, C.skinD); g.fillStyle = lite(C.skinD, 0.8); g.fillRect(9.9, 6.3, 0.9, 0.3);
      if (C.style === 'gorra') { g.fillStyle = C.cap; g.beginPath(); g.ellipse(8.1, 2.6, 2.8, 2, 0, Math.PI, 0); g.fill(); g.fillRect(5.3, 2.4, 5.6, 0.9); path([[10.6, 2.6], [12.8, 3.1], [10.6, 3.5]], lite(C.cap, 0.75)); }
      else if (C.style !== 'pelado') {
        g.fillStyle = C.hair; g.beginPath(); g.ellipse(7.8, 3.1, 2.85, 2.3, 0, Math.PI * 0.9, Math.PI * 2.0); g.fill();
        g.beginPath(); g.ellipse(6.6, 4.2, 1.5, 2.4, 0, 0, Math.PI * 2); g.fill(); ell(7.4, 1.7, 1.1, 0.45, lite(C.hair, 1.7));
        if (C.style === 'largo') limb(6, 4.5, 5.6, 9.6, 2, C.hair);
      }
    }
    return VR.gfx.down(VR.gfx.softOutline(big, 'rgba(20,15,12,.9)', Q * 0.75), W, H);
  };
  const out = {};
  for (const d of ['down', 'up', 'right']) out[d] = [0, 1, 2, 3].map((f) => frame(d, f));
  out.left = out.right.map((c) => VR.gfx.flipX(c));
  return out;
};
VR.SPR = { w: 16, h: 26, ox: 8, oy: 25 }; // tamaño del sprite de persona y punto de los pies

VR.Player = class {
  constructor(world, x, y) {
    this.world = world; this.x = this.px = x; this.y = this.py = y;
    this.dir = 'down'; this.anim = 0; this.moving = false; this.speed = 0;
    this.setLook(VR.store.get('pj', 'generico')); this.run = false;
    this.bubble = null;
    this.HW = 4; this.HH = 4; // caja de colisión en los pies
  }
  update(dt, input) {
    this.px = this.x; this.py = this.y;
    const ax = input.ax, ay = input.ay, mag = Math.min(1, Math.hypot(ax, ay));
    const run = input.down('run') && !VR.noRun; // con hambre (Historia) no se corre
    const target = mag * (run ? 104 : 58);
    this.speed = target; // en la etapa 2 agregamos inercia para los vehículos
    this.moving = mag > 0.05;
    if (this.moving) {
      const nx = ax / (mag || 1), ny = ay / (mag || 1);
      if (Math.abs(nx) > Math.abs(ny) * 1.15) this.dir = nx > 0 ? 'right' : 'left';
      else this.dir = ny > 0 ? 'down' : 'up';
      this.move(nx * this.speed * dt, ny * this.speed * dt);
      this.run = run; this.anim += dt * (run ? 15 : 9.5) * Math.max(0.5, mag);
    } else this.anim = 0;
    if (this.bubble) { this.bubble.t -= dt; if (this.bubble.t <= 0) this.bubble = null; }
  }
  // movimiento por ejes separados, con "deslizamiento" en las esquinas
  move(dx, dy) {
    const W = this.world, hw = this.HW, hh = this.HH;
    const box = (x, y) => W.hits(x - hw, y - hh, x + hw, y);
    if (dx) {
      if (!box(this.x + dx, this.y)) this.x += dx;
      else if (!dy) { for (const n of [-1, 1]) if (!box(this.x + dx, this.y + n * 5)) { this.y += n * Math.min(Math.abs(dx), 1); break; } }
    }
    if (dy) {
      if (!box(this.x, this.y + dy)) this.y += dy;
      else if (!dx) { for (const n of [-1, 1]) if (!box(this.x + n * 5, this.y + dy)) { this.x += n * Math.min(Math.abs(dy), 1); break; } }
    }
  }
  setLook(key) { this.look = key; this.lookData = VR.av2LookOf(key); this.sprites = VR.av2Lazy(this.lookData); }
  say(text, secs = 2.2) { this.bubble = { text, t: secs }; }
  draw(ctx, camX, camY, a) {
    const x = Math.round(VR.lerp(this.px, this.x, a) - camX), y = Math.round(VR.lerp(this.py, this.y, a) - camY);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y - 1, 6 * VR.PS, 2.5 * VR.PS, 0, 0, Math.PI * 2); ctx.fill();
    const img = this.moving ? this.sprites.get(this.dir, this.run ? 'run' : 'walk', Math.floor(this.anim) % 8) : this.sprites.get(this.dir, 'idle', 0);
    const PS = VR.PS; ctx.drawImage(img, x - 8 * PS, y - 31 * PS, 16 * PS, 32 * PS);
    if (this.equipo === 'canasto') { // canasto de chipa en la mano (J3)
      const r = this.dir === 'left' ? -1 : 1, bx = x + r * 4 - 3, by = y - Math.round(15 * VR.PS); ctx.fillStyle = '#5a3a1c'; ctx.fillRect(bx - 1, by - 1, 8, 6); ctx.fillStyle = '#b07a3a'; ctx.fillRect(bx, by, 6, 4); ctx.fillStyle = '#f2d27a'; ctx.fillRect(bx + 1, by - 1, 2, 2); ctx.fillRect(bx + 3, by - 2, 2, 2); ctx.fillStyle = '#5a3a1c'; ctx.fillRect(bx + 2, by - 4, 1, 3); ctx.fillRect(bx + 3, by - 5, 1, 1); ctx.fillRect(bx + 4, by - 4, 1, 3);
    }
  }
  drawBubble(ctx, camX, camY, a) {
    if (!this.bubble) return;
    const x = Math.round(VR.lerp(this.px, this.x, a) - camX), y = Math.round(VR.lerp(this.py, this.y, a) - camY) - Math.round(31 * VR.PS + 5);
    const img = VR.gfx.textImg(this.bubble.text, '#1a1a1e', 9);
    const w = img.lw + 8, h = 15, bx = VR.clamp(x - (w >> 1), 2, VR.screen.w - w - 2); let by = y - h;
    const B = VR._bubs || (VR._bubs = []); // si choca con otro globo de este cuadro, sube
    for (let k = 0; k < 6 && B.some((r) => bx < r[0] + r[2] + 2 && bx + w + 2 > r[0] && by < r[1] + r[3] + 3 && by + h + 3 > r[1]); k++) by -= h + 4;
    B.push([bx, by, w, h]);
    ctx.fillStyle = '#1a1a1e'; ctx.fillRect(bx - 1, by, w + 2, h); ctx.fillRect(bx, by - 1, w, h + 2);
    ctx.fillStyle = '#fbf8ef'; ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = '#1a1a1e'; ctx.fillRect(x - 2, by + h + 1, 5, 1); ctx.fillRect(x - 1, by + h + 2, 3, 1); ctx.fillRect(x, by + h + 3, 1, 1);
    ctx.fillStyle = '#fbf8ef'; ctx.fillRect(x - 1, by + h, 3, 1); ctx.fillRect(x, by + h + 1, 1, 1);
    ctx.drawImage(img, bx + 4, by + 2, img.lw, img.lh);
  }
};
