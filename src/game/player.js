// Personas: sprite original de 20×32 generado por código (arte grande, 04/11/2026), 4 direcciones × 4 cuadros.
// Cabeza grande con cara (ojos con brillo, cejas, nariz, boca, orejas), pelo con volumen y estilos (corto,
// largo, gorra, pelado), remera con cuello y sombra, brazos que se balancean con manos, cinto, pantalón o
// pollera con pliegue y zapatillas con suela clara.
VR.makePlayerSprites = (pal) => {
  const C = Object.assign({ skin: '#c98b5c', skinD: '#a76c42', hair: '#2a1b12', shirt: '#d23c2c', shirtD: '#9f2a20',
    pants: '#2c3e6b', pantsD: '#1e2b4d', shoes: '#18181c', sole: '#e8e4da', eye: '#1a1210', style: 'corto', cap: '#2e6fc8', skirt: false }, pal || {});
  const lite = (h, k) => VR.shadeHex(h, k);
  const HAIRL = lite(C.hair, 1.6), SHIRTL = lite(C.shirt, 1.25), SKINL = lite(C.skin, 1.12);
  const STEP = [0, 1, 0, -1];
  const frame = (dir, f) => {
    const c = VR.canvas(20, 32), P = VR.gfx.painter(c), s = STEP[f], bob = s === 0 ? 0 : 1;
    const r = (x, y, w, h, col) => P.r(x, y + bob, w, h, col);
    if (dir === 'down' || dir === 'up') {
      const front = dir === 'down';
      // piernas (una adelante, otra atrás al caminar) y zapatillas
      const legL = s < 0 ? -1 : 0, legR = s > 0 ? -1 : 0;
      if (C.skirt) {
        r(6, 21, 3, 6 + legL, C.skin); r(11, 21, 3, 6 + legR, C.skinD);
        r(5, 20, 10, 5, C.pants); r(5, 24, 10, 1, C.pantsD); r(10, 20, 1, 5, C.pantsD);
      } else {
        r(5, 21, 10, 2, C.pants);
        r(5, 23, 4, 4 + legL, C.pants); r(6, 23, 1, 4 + legL, lite(C.pants, 1.2));
        r(11, 23, 4, 4 + legR, C.pantsD);
        r(9, 21, 2, 2, C.pantsD);
      }
      r(5, 27 + legL, 4, 2, C.shoes); r(5, 28 + legL, 4, 1, C.sole);
      r(11, 27 + legR, 4, 2, C.shoes); r(11, 28 + legR, 4, 1, C.sole);
      // brazos con manga y mano
      const aL = s > 0 ? 1 : s < 0 ? -1 : 0, aR = -aL;
      r(2, 12 + aL, 3, 4, C.shirt); r(2, 12 + aL, 1, 4, C.shirtD); r(2, 16 + aL, 3, 3, C.skin); r(2, 18 + aL, 3, 1, C.skinD);
      r(15, 12 + aR, 3, 4, C.shirtD); r(15, 16 + aR, 3, 3, C.skinD);
      // torso
      r(5, 11, 10, 9, C.shirt); r(13, 11, 2, 9, C.shirtD); r(5, 11, 1, 9, SHIRTL);
      r(5, 19, 10, 1, C.shirtD);
      if (!C.skirt) { r(5, 20, 10, 1, '#2a2420'); r(9, 20, 2, 1, '#d8b04a'); } // cinto
      if (front) { r(8, 11, 4, 1, C.skin); r(8, 12, 4, 1, C.shirtD); r(9, 12, 2, 1, C.skinD); } // cuello en V
      // cabeza
      r(5, 3, 10, 8, C.skin); r(6, 10, 8, 1, C.skin); r(13, 4, 2, 6, C.skinD);
      r(4, 6, 1, 2, C.skin); r(15, 6, 1, 2, C.skinD); // orejas
      if (front) {
        r(7, 7, 2, 2, '#f6f2ea'); r(11, 7, 2, 2, '#f6f2ea'); r(8, 7, 1, 2, C.eye); r(12, 7, 1, 2, C.eye); // ojos
        r(7, 6, 2, 1, C.hair); r(11, 6, 2, 1, C.hair);                       // cejas
        r(10, 9, 1, 1, C.skinD); r(9, 10, 3, 1, lite(C.skinD, 0.9)); r(6, 8, 1, 1, SKINL); // nariz, boca, cachete
      }
      // pelo
      if (C.style === 'gorra') {
        r(5, 1, 10, 4, C.cap); r(6, 1, 6, 1, lite(C.cap, 1.3)); if (front) r(4, 5, 12, 1, lite(C.cap, 0.7)); else r(5, 5, 10, 2, C.hair);
      } else if (C.style !== 'pelado') {
        r(5, 1, 10, 3, C.hair); r(4, 2, 12, 3, C.hair); r(6, 1, 5, 1, HAIRL);
        if (front) { r(4, 5, 1, 2, C.hair); r(15, 5, 1, 2, C.hair); r(6, 4, 3, 1, C.hair); }
        else r(4, 4, 12, 6, C.hair), r(5, 9, 10, 1, C.hair), r(6, 3, 4, 1, HAIRL);
        if (C.style === 'largo') { r(3, 5, 2, 9, C.hair); r(15, 5, 2, 9, C.hair); if (!front) r(4, 9, 12, 5, C.hair); }
      } else { r(6, 2, 8, 1, C.skin); r(7, 2, 3, 1, SKINL); r(5, 3, 10, 1, C.skin); }
      if (!front && C.style !== 'gorra' && C.style !== 'pelado') r(7, 10, 6, 1, C.skinD);
    } else { // perfil mirando a la derecha
      const back = s, fwd = -s;
      // pierna de atrás, torso, pierna de adelante
      if (C.skirt) { r(8 + back * 2, 21, 3, 6, C.skinD); r(8 + fwd * 2, 21, 3, 6, C.skin); r(6, 20, 8, 5, C.pants); r(6, 24, 8, 1, C.pantsD); }
      else {
        r(8 + back * 2, 21, 3, 6, C.pantsD);
        r(7, 20, 6, 2, C.pants); r(8 + fwd * 2, 21, 3, 6, C.pants); r(8 + fwd * 2, 21, 1, 6, lite(C.pants, 1.2));
      }
      r(8 + back * 2, 27, 5, 2, lite(C.shoes, 1.3)); r(8 + back * 2, 28, 5, 1, C.sole);
      r(8 + fwd * 2, 27, 5, 2, C.shoes); r(8 + fwd * 2, 28, 5, 1, C.sole);
      r(6, 11, 8, 9, C.shirt); r(6, 11, 2, 9, C.shirtD); r(6, 19, 8, 1, C.shirtD);
      if (!C.skirt) r(6, 20, 8, 1, '#2a2420');
      r(8 + fwd, 12, 3, 4, SHIRTL); r(8 + fwd, 16, 3, 3, C.skin); r(8 + fwd, 18, 3, 1, C.skinD); // brazo de adelante
      // cabeza de perfil
      r(6, 3, 9, 8, C.skin); r(15, 6, 1, 3, C.skin); r(7, 10, 7, 1, C.skin);
      r(12, 7, 2, 2, '#f6f2ea'); r(13, 7, 1, 2, C.eye); r(12, 6, 2, 1, C.hair);
      r(14, 10, 2, 1, C.skinD); r(8, 6, 2, 2, C.skinD); // boca y oreja
      if (C.style === 'gorra') { r(5, 1, 10, 4, C.cap); r(14, 4, 4, 1, lite(C.cap, 0.7)); r(5, 5, 3, 3, C.hair); }
      else if (C.style !== 'pelado') {
        r(5, 1, 10, 3, C.hair); r(5, 4, 4, 2, C.hair); r(5, 4, 2, 5, C.hair); r(7, 1, 5, 1, HAIRL); r(13, 4, 2, 1, C.hair);
        if (C.style === 'largo') r(4, 4, 4, 10, C.hair);
      }
    }
    return VR.gfx.outline(c, '#140f0c');
  };
  const out = {};
  for (const d of ['down', 'up', 'right']) out[d] = [0, 1, 2, 3].map((f) => frame(d, f));
  out.left = out.right.map((c) => VR.gfx.flipX(c));
  return out;
};
VR.SPR = { w: 20, h: 32, ox: 10, oy: 30 }; // tamaño del sprite de persona y punto de los pies

VR.Player = class {
  constructor(world, x, y) {
    this.world = world; this.x = this.px = x; this.y = this.py = y;
    this.dir = 'down'; this.anim = 0; this.moving = false; this.speed = 0;
    this.sprites = VR.makePlayerSprites();
    this.bubble = null;
    this.HW = 4; this.HH = 4; // caja de colisión en los pies
  }
  update(dt, input) {
    this.px = this.x; this.py = this.y;
    const ax = input.ax, ay = input.ay, mag = Math.min(1, Math.hypot(ax, ay));
    const run = input.down('run');
    const target = mag * (run ? 104 : 58);
    this.speed = target; // en la etapa 2 agregamos inercia para los vehículos
    this.moving = mag > 0.05;
    if (this.moving) {
      const nx = ax / (mag || 1), ny = ay / (mag || 1);
      if (Math.abs(nx) > Math.abs(ny) * 1.15) this.dir = nx > 0 ? 'right' : 'left';
      else this.dir = ny > 0 ? 'down' : 'up';
      this.move(nx * this.speed * dt, ny * this.speed * dt);
      this.anim += dt * (run ? 11 : 7.5) * Math.max(0.5, mag);
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
  say(text, secs = 2.2) { this.bubble = { text, t: secs }; }
  draw(ctx, camX, camY, a) {
    const x = Math.round(VR.lerp(this.px, this.x, a) - camX), y = Math.round(VR.lerp(this.py, this.y, a) - camY);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y - 1, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    const f = this.moving ? (Math.floor(this.anim) % 4) : 0;
    ctx.drawImage(this.sprites[this.dir][f], x - VR.SPR.ox, y - VR.SPR.oy);
  }
  drawBubble(ctx, camX, camY, a) {
    if (!this.bubble) return;
    const x = Math.round(VR.lerp(this.px, this.x, a) - camX), y = Math.round(VR.lerp(this.py, this.y, a) - camY) - 38;
    const img = VR.gfx.textImg(this.bubble.text, '#1a1a1e', 9);
    const w = img.width + 8, h = 15, bx = VR.clamp(x - (w >> 1), 2, VR.screen.w - w - 2), by = y - h;
    ctx.fillStyle = '#1a1a1e'; ctx.fillRect(bx - 1, by, w + 2, h); ctx.fillRect(bx, by - 1, w, h + 2);
    ctx.fillStyle = '#fbf8ef'; ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = '#1a1a1e'; ctx.fillRect(x - 2, by + h + 1, 5, 1); ctx.fillRect(x - 1, by + h + 2, 3, 1); ctx.fillRect(x, by + h + 3, 1, 1);
    ctx.fillStyle = '#fbf8ef'; ctx.fillRect(x - 1, by + h, 3, 1); ctx.fillRect(x, by + h + 1, 1, 1);
    ctx.drawImage(img, bx + 4, by + 2);
  }
};
