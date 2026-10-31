// Jugador: sprite original de 16×24 generado por código, 4 direcciones × 4 cuadros de caminata.
'use strict';
VR.makePlayerSprites = (pal) => {
  const C = Object.assign({ skin: '#c98b5c', skinD: '#a76c42', hair: '#2a1b12', shirt: '#d23c2c', shirtD: '#9f2a20',
    pants: '#2c3e6b', pantsD: '#1e2b4d', shoes: '#18181c', eye: '#1a1210' }, pal || {});
  const STEP = [0, 1, 0, -1];
  const frame = (dir, f) => {
    const c = VR.canvas(16, 24), P = VR.gfx.painter(c), s = STEP[f], bob = f % 2 ? 0 : 0;
    if (dir === 'down' || dir === 'up') {
      const front = dir === 'down';
      // piernas
      P.r(5, 15, 6, 2, C.pants);
      P.r(5, 17, 2, 4 - (s < 0 ? 1 : 0), C.pants); P.r(5, 21 - (s < 0 ? 1 : 0), 2, 1, C.shoes);
      P.r(9, 17, 2, 4 - (s > 0 ? 1 : 0), C.pantsD); P.r(9, 21 - (s > 0 ? 1 : 0), 2, 1, C.shoes);
      // brazos (se balancean)
      P.r(2, 10 + (s > 0 ? 1 : 0), 2, 4, C.shirtD); P.r(2, 14 + (s > 0 ? 1 : 0), 2, 1, C.skin);
      P.r(12, 10 + (s < 0 ? 1 : 0), 2, 4, C.shirtD); P.r(12, 14 + (s < 0 ? 1 : 0), 2, 1, C.skin);
      // torso
      P.r(4, 9 + bob, 8, 6, C.shirt); P.r(4, 14, 8, 1, C.shirtD);
      if (front) { P.r(7, 9, 2, 1, C.skinD); } // cuello
      // cabeza
      P.r(5, 2, 6, 7, C.skin);
      if (front) {
        P.r(5, 2, 6, 3, C.hair); P.r(5, 5, 1, 2, C.hair); P.r(10, 5, 1, 2, C.hair);
        P.p(6, 6, C.eye); P.p(9, 6, C.eye); P.r(7, 8, 2, 1, C.skinD);
      } else {
        P.r(5, 2, 6, 6, C.hair); P.r(6, 8, 4, 1, C.skinD);
      }
    } else { // perfil mirando a la derecha
      P.r(7 - s, 15, 2, 6, C.pantsD); P.r(7 - s, 21, 3, 1, C.shoes);
      P.r(6, 9, 5, 6, C.shirt); P.r(6, 14, 5, 1, C.shirtD);
      P.r(7 + s, 15, 2, 6, C.pants); P.r(7 + s, 21, 3, 1, C.shoes);
      P.r(7 + s, 10, 2, 4, C.shirtD); P.r(7 + s, 14, 2, 1, C.skin);
      P.r(6, 2, 6, 7, C.skin); P.r(6, 2, 6, 3, C.hair); P.r(6, 5, 2, 2, C.hair);
      P.p(10, 6, C.eye); P.p(12, 6, C.skin); P.r(9, 8, 2, 1, C.skinD);
    }
    return VR.gfx.outline(c, '#140f0c');
  };
  const out = {};
  for (const d of ['down', 'up', 'right']) out[d] = [0, 1, 2, 3].map((f) => frame(d, f));
  out.left = out.right.map((c) => VR.gfx.flipX(c));
  return out;
};

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
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y - 1, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    const f = this.moving ? (Math.floor(this.anim) % 4) : 0;
    ctx.drawImage(this.sprites[this.dir][f], x - 8, y - 23);
  }
  drawBubble(ctx, camX, camY, a) {
    if (!this.bubble) return;
    const x = Math.round(VR.lerp(this.px, this.x, a) - camX), y = Math.round(VR.lerp(this.py, this.y, a) - camY) - 30;
    const img = VR.gfx.textImg(this.bubble.text, '#1a1a1e', 9);
    const w = img.width + 8, h = 15, bx = VR.clamp(x - (w >> 1), 2, VR.screen.w - w - 2), by = y - h;
    ctx.fillStyle = '#1a1a1e'; ctx.fillRect(bx - 1, by, w + 2, h); ctx.fillRect(bx, by - 1, w, h + 2);
    ctx.fillStyle = '#fbf8ef'; ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = '#1a1a1e'; ctx.fillRect(x - 2, by + h + 1, 5, 1); ctx.fillRect(x - 1, by + h + 2, 3, 1); ctx.fillRect(x, by + h + 3, 1, 1);
    ctx.fillStyle = '#fbf8ef'; ctx.fillRect(x - 1, by + h, 3, 1); ctx.fillRect(x, by + h + 1, 1, 1);
    ctx.drawImage(img, bx + 4, by + 2);
  }
};
