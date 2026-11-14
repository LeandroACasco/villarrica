// Robo de vehículos (13/11/2026, pedido de Leandro): al llevarte un vehículo del tránsito o de una estación, el conductor
// se baja. La mayoría sale corriendo (grita en jopara, corre por la calle hasta la vereda y sigue como un peatón más);
// algunos (1 de cada 5) sacan una pistola, te apuntan y te disparan un rato (le podés errar o te pega; si te alejás, desiste).
// Los conductores son peatones del sistema de `peds` (así los puede atropellar un vehículo o dañar tu arma, y se asustan con tiros).
'use strict';
VR.Asalto = class {
  constructor(world, peds, o) {
    this.world = world; this.peds = peds; this.o = o; this.rnd = VR.rng(515); this.armed = []; this.tr = []; this.toastT = 0;
  }
  bajar(c, drv) {
    const P = this.peds, R = this.rnd, T = this.o.target(), a = c.a, rx = Math.cos(a), ry = Math.sin(a), d = c.WID / 2 + 5;
    // de la puerta del conductor (izquierda) o, si no hay lugar, de la derecha
    let x = c.x - rx * d, y = c.y - ry * d + 4;
    if (this.world.hits(x - 3, y - 3, x + 3, y)) { x = c.x + rx * d; y = c.y + ry * d + 4; }
    let pal;
    if (drv && drv.L) { const sp = VR.av2Lazy(Object.assign({}, drv.L, { hat: drv.L.hat === 'casco' ? 'ninguno' : drv.L.hat })); P.sprites.push(sp); pal = P.sprites.length - 1; } else pal = P.pickPal(x, y);
    const p = { x, y, px: x, py: y, dir: 'down', vx: 0, vy: 0, anim: 0, mode: 'flee', t: 4 + R() * 2.5, sp: 30, pal, say: null, road: true };
    p._nid = P.nid = (P.nid || 0) + 1;
    P._road = true; P.awayFrom(p, T); P._road = false;
    const armed = R() < 0.2 && !c.spec.bus;
    if (armed) {
      p.mode = 'idle'; p.armed = true; p.t = 99; p.vx = p.vy = 0; p.jt = 0; p.shotT = 0.7 + R() * 0.4;
      p.say = { text: ['¡Devolveme el auto, ladrón!', '¡Eso es mío, desgraciado!', '¡Bajate de ahí!'][(R() * 3) | 0], t: 2.4 };
      this.armed.push(p);
    } else p.say = { text: ['¡Mi auto! ¡Ladrón!', '¡Socorro, me robaron!', '¡Policía, policía!', '¡Ladrón, devolvé el auto!', '¡Ayudaaa!'][(R() * 5) | 0], t: 2.4 };
    P.list.push(p);
    return p;
  }
  fire(p, T) {
    const dx = T.x - p.x, dy = T.y - p.y, dist = Math.hypot(dx, dy), R = this.rnd;
    const chance = T.car ? (T.sp > 100 ? 0.07 : 0.22) : dist < 90 ? 0.5 : dist < 180 ? 0.32 : 0.18;
    const hit = R() < chance, mx = p.x + (p.dir === 'right' ? 6 : p.dir === 'left' ? -6 : 3), my = p.y - 17;
    const tx = T.x + (hit ? 0 : (R() - 0.5) * 40), ty = T.y - (T.car ? 2 : 10) + (hit ? 0 : (R() - 0.5) * 30);
    this.tr.push({ x0: mx, y0: my, x1: tx, y1: ty, t: 0.09 });
    VR.audio.shot(p.x, p.y); if (this.o.scare) this.o.scare(p.x, p.y);
    if (hit) { this.o.hurt(T.car ? 3 + R() * 3 : 5 + R() * 5); VR.audio.ouch && VR.audio.ouch(T.x, T.y); if (this.toastT <= 0) { this.o.toast('🔫 ¡Te dispararon!'); this.toastT = 3; } }
  }
  update(dt) {
    this.toastT -= dt;
    for (let i = this.tr.length - 1; i >= 0; i--) { this.tr[i].t -= dt; if (this.tr[i].t <= 0) this.tr.splice(i, 1); }
    if (!this.armed.length) return;
    const T = this.o.target();
    for (let i = this.armed.length - 1; i >= 0; i--) {
      const p = this.armed[i];
      if (!this.peds.list.includes(p) || p.mode === 'down') { p.armed = false; this.armed.splice(i, 1); continue; }
      const dx = T.x - p.x, dy = T.y - p.y, dist = Math.hypot(dx, dy);
      p.jt += dt; p.px = p.x; p.py = p.y; p.mode = 'idle'; p.t = 99; p.anim = 0;
      p.dir = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : dx > 0 ? 'right' : 'left';
      p.shotT -= dt;
      if (p.shotT <= 0 && dist < 300) { this.fire(p, T); p.shotT = 0.85 + this.rnd() * 0.7; }
      if (p.jt > 7.5 || dist > 340) { // desiste y sale corriendo
        p.armed = false; p.mode = 'flee'; p.t = 4; this.peds._road = true; this.peds.awayFrom(p, T); this.peds._road = false;
        if (this.rnd() < 0.5) p.say = { text: '¡Ya fue, ya fue!', t: 1.6 };
        this.armed.splice(i, 1);
      }
    }
  }
  drawFx(ctx, cx, cy) {
    if (!this.tr.length) return;
    ctx.save(); ctx.strokeStyle = 'rgba(255,236,160,.95)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (const s of this.tr) { ctx.beginPath(); ctx.moveTo(s.x0 - cx, s.y0 - cy); ctx.lineTo(s.x1 - cx, s.y1 - cy); ctx.stroke(); ctx.fillStyle = '#fff3b0'; ctx.fillRect(s.x0 - cx - 1.5, s.y0 - cy - 1.5, 3, 3); }
    ctx.restore();
  }
};
