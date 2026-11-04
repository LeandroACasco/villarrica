// Peatones: gente que camina por las veredas y las plazas, cerca tuyo. Se para a veces, dobla en las
// esquinas, se corre si le venís encima con el auto (y te dice algo), se cae si la chocás y se levanta
// enojada, y te contesta en jopara si la saludás.
'use strict';
VR.PED_TALK = {
  greet: ['¡Iporã, ha nde?', "¡Mba'éichapa, che ra'a!", 'Hína, ko hakuete...', '¡Ajépa ndera!', 'Jaha ñamba\'apo', '¡Upéicha!'],
  flee: ['¡Epa!', '¡Cuidado, che!', '¡Ndera!', '¡Eñangarekóke!', '¡Despacio!'],
  hit: ['¡Ay, che!', '¡Mirá por dónde andás!', "¡Mba'e piko!", '¡Ay, mi espalda!'],
};
VR.Peds = class {
  constructor(world) {
    this.world = world; this.list = []; this.rnd = VR.rng(99);
    const R = this.rnd;
    // 32 looks al azar del mismo sistema que el probador; los cuadros se dibujan a medida que se usan
    this.sprites = [];
    for (let i = 0; i < 32; i++) this.sprites.push(VR.av2Lazy(VR.av2Random(R)));
    this.flat = new Map(); // sprite "acostado" (cuando lo chocás)
  }
  walkable(px, py) {
    const W = this.world, tx = Math.floor(px / VR.TILE), ty = Math.floor(py / VR.TILE), t = W.get(tx, ty), T = VR.T;
    if (t === T.SIDEWALK || t === T.PAVING || t === T.CHECKER) return true;
    if ((t === T.GRASS || t === T.DIRT) && W.area[ty * W.w + tx]) return true; // pasto de plazas y parques
    return false;
  }
  free(px, py) { return this.walkable(px, py) && !this.world.hits(px - 3, py - 3, px + 3, py); }
  max(focus) {
    const b = this.world.barrioName(focus.x, focus.y);
    return b === 'Centro' ? 30 : b ? 16 : 6;
  }
  spawn(focus, view) {
    for (let t = 0; t < 30; t++) {
      const a = this.rnd() * Math.PI * 2, d = 260 + this.rnd() * 380;
      const x = focus.x + Math.cos(a) * d, y = focus.y + Math.sin(a) * d;
      if (x > view.x0 - 20 && x < view.x1 + 20 && y > view.y0 - 30 && y < view.y1 + 30) continue;
      if (!this.free(x, y)) continue;
      const p = { x, y, px: x, py: y, dir: 'down', vx: 0, vy: 0, anim: 0, mode: 'walk', t: 0, sp: 26 + this.rnd() * 18, pal: (this.rnd() * this.sprites.length) | 0, say: null };
      this.newDir(p);
      this.list.push(p);
      return p;
    }
  }
  newDir(p, avoid) {
    const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]].sort(() => this.rnd() - 0.5);
    for (const [d, dx, dy] of dirs) {
      if (avoid && d === avoid) continue;
      if (this.free(p.x + dx * 10, p.y + dy * 10)) { p.dir = d; p.vx = dx; p.vy = dy; p.t = 2 + this.rnd() * 6; return true; }
    }
    p.mode = 'idle'; p.t = 1 + this.rnd() * 2; p.vx = p.vy = 0; return false;
  }
  talk(p, kind, secs = 1.8) { const L = VR.PED_TALK[kind]; p.say = { text: L[(this.rnd() * L.length) | 0], t: secs }; }
  // el jugador saluda: contesta el más cercano
  greet(px, py) {
    let best = null, bd = 30;
    for (const p of this.list) { const d = Math.hypot(p.x - px, p.y - py); if (d < bd && p.mode !== 'down') { bd = d; best = p; } }
    if (best) { best.mode = 'idle'; best.t = 2.5; best.vx = best.vy = 0; best.dir = Math.abs(px - best.x) > Math.abs(py - best.y) ? (px > best.x ? 'right' : 'left') : (py > best.y ? 'down' : 'up'); setTimeout(() => this.talk(best, 'greet', 2.4), 500); }
    return best;
  }
  update(dt, focus, view, car) {
    if (this.list.length < this.max(focus)) this.spawn(focus, view);
    for (let i = this.list.length - 1; i >= 0; i--) if (Math.hypot(this.list[i].x - focus.x, this.list[i].y - focus.y) > 900) this.list.splice(i, 1);
    const cs = car ? Math.hypot(car.vx || 0, car.vy || 0) : 0;
    for (const p of this.list) {
      p.px = p.x; p.py = p.y;
      if (p.say) { p.say.t -= dt; if (p.say.t <= 0) p.say = null; }
      // ¿lo chocaste?
      if (car && p.mode !== 'down' && cs > 30 && Math.hypot(p.x - car.x, p.y - 4 - car.y) < car.WID / 2 + 6) {
        p.mode = 'down'; p.t = 2.4; p.vx = car.vx * 0.7; p.vy = car.vy * 0.7;
        car.vx *= 0.82; car.vy *= 0.82; car.hit = 0.15;
        if (VR.onPedHit) VR.onPedHit(p, cs);
        continue;
      }
      if (p.mode === 'down') {
        const k = Math.exp(-4 * dt);
        const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        if (!this.world.hits(nx - 3, ny - 3, nx + 3, ny)) { p.x = nx; p.y = ny; } else { p.vx *= -0.3; p.vy *= -0.3; }
        p.vx *= k; p.vy *= k; p.t -= dt;
        if (p.injured && p.t > 0) continue;
        p.injured = false;
        if (p.t <= 0) { p.mode = 'flee'; p.t = 1.4; this.talk(p, 'hit'); if (!this.free(p.x, p.y)) this.toWalkable(p); this.awayFrom(p, car || focus); }
        continue;
      }
      // ¿le venís encima?
      if (car && cs > 50 && p.mode !== 'flee') {
        const dx = p.x - car.x, dy = p.y - car.y, d = Math.hypot(dx, dy);
        const toward = (car.vx * dx + car.vy * dy) / (cs * (d || 1));
        if (d < 70 && toward > 0.6) { p.mode = 'flee'; p.t = 1.2; if (this.rnd() < 0.6) this.talk(p, 'flee', 1.2); this.awayFrom(p, car); }
      }
      p.t -= dt;
      if (p.mode === 'idle') { if (p.t <= 0) { p.mode = 'walk'; this.newDir(p); } p.anim = 0; continue; }
      const sp = p.mode === 'flee' ? 95 : p.sp;
      const nx = p.x + p.vx * sp * dt, ny = p.y + p.vy * sp * dt;
      const ahead = this.free(p.x + p.vx * 8, p.y + p.vy * 8);
      if (ahead && !this.world.hits(nx - 3, ny - 3, nx + 3, ny)) { p.x = nx; p.y = ny; p.anim += dt * (p.mode === 'flee' ? 15 : 8.5); }
      else if (p.mode === 'flee') { this.newDir(p, p.dir); p.mode = 'flee'; }
      else this.newDir(p, p.dir);
      if (p.t <= 0) {
        if (p.mode === 'flee') { p.mode = 'walk'; this.newDir(p); }
        else if (this.rnd() < 0.25) { p.mode = 'idle'; p.t = 1 + this.rnd() * 3; p.vx = p.vy = 0; }
        else this.newDir(p);
      }
    }
  }
  awayFrom(p, o) {
    const dx = p.x - o.x, dy = p.y - o.y;
    const opts = Math.abs(dx) > Math.abs(dy) ? [[dx > 0 ? 'right' : 'left', Math.sign(dx), 0], [dy > 0 ? 'down' : 'up', 0, Math.sign(dy) || 1]] : [[dy > 0 ? 'down' : 'up', 0, Math.sign(dy) || 1], [dx > 0 ? 'right' : 'left', Math.sign(dx) || 1, 0]];
    for (const [d, vx, vy] of opts) if (this.free(p.x + vx * 10, p.y + vy * 10)) { p.dir = d; p.vx = vx; p.vy = vy; return; }
    this.newDir(p);
  }
  toWalkable(p) {
    for (let r = 4; r < 60; r += 4) for (let k = 0; k < 8; k++) {
      const x = p.x + Math.cos(k * Math.PI / 4) * r, y = p.y + Math.sin(k * Math.PI / 4) * r;
      if (this.free(x, y)) { p.x = p.px = x; p.y = p.py = y; return; }
    }
  }
  lying(pal) {
    let c = this.flat.get(pal);
    if (!c) {
      const s = this.sprites[pal].get('down', 'idle', 0); c = VR.canvas(34, 18); const g = c.getContext('2d');
      g.translate(17, 9); g.rotate(Math.PI / 2); g.drawImage(s, -8, -16); this.flat.set(pal, c);
    }
    return c;
  }
  collect(camX, camY, sw, sh, al, out) {
    for (const p of this.list) {
      const x = Math.round(VR.lerp(p.px, p.x, al) - camX), y = Math.round(VR.lerp(p.py, p.y, al) - camY);
      if (x < -20 || y < -36 || x > sw + 20 || y > sh + 20) continue;
      out.push({ sy: y + camY, draw: (ctx) => {
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y - 1, 5.5, 2.3, 0, 0, Math.PI * 2); ctx.fill();
        if (p.mode === 'down') ctx.drawImage(this.lying(p.pal), x - 17, y - 12);
        else ctx.drawImage(p.mode === 'idle' ? this.sprites[p.pal].get(p.dir, 'idle', 0) : this.sprites[p.pal].get(p.dir, p.mode === 'flee' ? 'run' : 'walk', Math.floor(p.anim) % 8), x - 8, y - 31);
        if (p.say) VR.Player.prototype.drawBubble.call({ bubble: p.say, px: x + camX, x: x + camX, py: y + camY + 6, y: y + camY + 6 }, ctx, camX, camY, 1);
      } });
    }
  }
};
