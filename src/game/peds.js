// Peatones: gente que camina por las veredas y las plazas, cerca tuyo. Se para a veces, dobla en las
// esquinas, se corre si le venís encima con el auto (y te dice algo), se cae si la chocás y se levanta
// enojada, y te contesta en jopara si la saludás.
'use strict';
VR.PED_TALK = {
  greet: ['¡Iporã, ha nde?', "¡Mba'éichapa, che ra'a!", 'Hína, ko hakuete...', '¡Ajépa!', 'Jaha ñamba\'apo', '¡Upéicha!'],
  flee: ['¡Epa!', '¡Cuidado, che!', '¡Eñangarekóke!', '¡Despacio!'],
  reckless: ["¡Upei oje'e lo mitã omanoreiha!", '¡Despacio, loco!', '¡Vas a matar a alguien!', "¡Upei oje'e lo mitã omanoreiha!"],
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
    // gente sentada en los bancos de las plazas (05/11/2026): quietos, algunos con el termo de tereré
    this.sitters = [];
    const SR = VR.rng(7);
    for (const d of world.decals || []) {
      if (d.kind !== 'banco') continue;
      const n = SR() < 0.5 ? 1 : SR() < 0.55 ? 2 : 0, S = VR.TILE, X = d.x * S, Y = d.y * S;
      for (let i = 0; i < n; i++) {
        const L = VR.av2Random(SR); L.termo = SR() < 0.35; L.mochila = false; if (L.hat === 'casco') L.hat = 'ninguno';
        const o = n === 2 ? (i ? 3.5 : -3.5) : 0;
        L.sitIdx = this.sitters.length;
        if (d.fa !== undefined) { // banco girado: la persona mira hacia donde mira el banco
          const fx = Math.cos(d.fa), fy = Math.sin(d.fa), tx = -fy, ty = fx;
          const dir = fy > 0.3 ? 'down' : fy < -0.75 ? 'up' : fx > 0 ? 'right' : 'left';
          this.sitters.push({ x: d.px + tx * o + fx * 1.5, y: d.py + ty * o + fy * 1.5 + 6, dir, look: VR.av2Lazy(L), d });
        } else if (d.f === 's') this.sitters.push({ x: X + 8 + o, y: Y + 15.5, dir: 'down', look: VR.av2Lazy(L), d });
        else this.sitters.push({ x: d.f === 'e' ? X + 7.5 : X + 8.5, y: Y + 11 + o * 1.6, dir: d.f === 'e' ? 'right' : 'left', look: VR.av2Lazy(L), d });
      }
    }
  }
  walkable(px, py) {
    const W = this.world, tx = Math.floor(px / VR.TILE), ty = Math.floor(py / VR.TILE), t = W.get(tx, ty), T = VR.T;
    if (t === T.SIDEWALK || t === T.PAVING || t === T.CHECKER || t === T.SENDERO || t === T.LADRILLO) return true;
    if ((t === T.GRASS || t === T.DIRT || t === T.PLAZADIRT) && W.area[ty * W.w + tx]) return true; // pasto de plazas y parques
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
  // la gente sentada se levanta y sale corriendo (disparos, fuego, explosiones o un auto que se le viene encima);
  // después de un rato, si estás lejos, vuelve a su banco (05/11/2026)
  scatter(x, y, r, from) {
    for (const s of this.sitters) {
      if (s.gone || Math.hypot(s.x - x, s.y - y) > r) continue;
      s.gone = true; s.goneT = 0;
      let pal = this.sprites.indexOf(s.look); if (pal < 0) { this.sprites.push(s.look); pal = this.sprites.length - 1; }
      const p = { x: s.x, y: s.y + 2, px: s.x, py: s.y + 2, dir: s.dir, vx: 0, vy: 0, anim: 0, mode: 'flee', t: 3 + this.rnd() * 2, sp: 30, pal, say: null, sitter: s };
      if (!this.free(p.x, p.y)) this.toWalkable(p);
      this.awayFrom(p, from || { x, y }); if (this.rnd() < 0.5) this.talk(p, 'flee', 1.4);
      this.list.push(p);
    }
  }
  update(dt, focus, view, car) {
    for (const s of this.sitters) if (s.gone) { s.goneT += dt; if (s.goneT > 40 && Math.hypot(s.x - focus.x, s.y - focus.y) > 600 && !this.list.some((p) => p.sitter === s)) s.gone = false; }
    if (car) { const sp = Math.hypot(car.vx || 0, car.vy || 0); if (sp > 45) { const ax = car.x + (car.vx / sp) * 30, ay = car.y + (car.vy / sp) * 30; for (const s of this.sitters) if (!s.gone && Math.hypot(s.x - ax, s.y - ay) < 45) this.scatter(s.x, s.y, 50, car); } }
    const F = [focus].concat(VR.extraFoci || []), mx = F.reduce((s, f) => s + this.max(f), 0);
    let f0 = focus; if (F.length > 1) { f0 = null; let bn = 1e9; for (const g of F) { const n = this.list.reduce((s, q) => s + (Math.hypot(q.x - g.x, q.y - g.y) < 700 ? 1 : 0), 0); if (n < this.max(g) && n < bn) { bn = n; f0 = g; } } }
    if (f0 && this.list.length < mx) { const f = f0; const p = this.spawn(f, f === focus ? view : { x0: f.x - 280, y0: f.y - 200, x1: f.x + 280, y1: f.y + 200 }); if (p) p._nid = this.nid = (this.nid || 0) + 1; }
    for (let i = this.list.length - 1; i >= 0; i--) { const q = this.list[i]; if (F.every((f) => Math.hypot(q.x - f.x, q.y - f.y) > 900)) this.list.splice(i, 1); }
    const cs = car ? Math.hypot(car.vx || 0, car.vy || 0) : 0;
    for (const p of this.list) {
      p.px = p.x; p.py = p.y;
      if (p.say) { p.say.t -= dt; if (p.say.t <= 0) p.say = null; }
      // ¿lo chocó un vehículo (el tuyo o uno del tránsito)? Sale despedido (ragdoll)
      if (p.mode !== 'down') {
        const hitBy = this.carHit(p);
        if (hitBy) {
          const o = hitBy.c, sp = hitBy.sp;
          p.mode = 'down'; p.t = 2.6 + Math.min(1, sp / 150);
          p.rag = new VR.Ragdoll(hitBy.vx, hitBy.vy, sp / 160, p.dir || 'down');
          if (o.driven) { o.vx *= 0.82; o.vy *= 0.82; o.hit = 0.15; if (VR.onPedHit) VR.onPedHit(p, sp); }
          else { if (VR.audio && VR.audio.ouch) VR.audio.ouch(p.x, p.y); if (VR.caidas) VR.caidas.aiHit(o, p, sp); }
          continue;
        }
      }
      if (p.mode === 'down') {
        if (p.rag) p.rag.step(dt, p, this.world);
        p.t -= dt;
        if (p.injured && p.t > 0) continue;
        p.injured = false;
        if (p.rag && p.t <= 0 && p.rag.landed) p.rag.rise();
        if (p.t <= 0 && (!p.rag || p.rag.done)) { p.rag = null; p.mode = 'flee'; p.t = 1.4; this.talk(p, 'hit'); if (!this.free(p.x, p.y)) this.toWalkable(p); this.awayFrom(p, car || focus); }
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
  // vehículo en movimiento que está pasando por encima de esta persona (o null)
  carHit(p) {
    const W = this.world, out = this._cq || (this._cq = []); out.length = 0;
    if (!W.carsIn || !VR.obb) return null;
    W.carsIn(p.x - 40, p.y - 40, p.x + 40, p.y + 40, out);
    for (const o of out) {
      if (!o.spec) continue;
      const vx = o.vx !== undefined ? o.vx : Math.sin(o.a) * (o.v || 0), vy = o.vy !== undefined ? o.vy : -Math.cos(o.a) * (o.v || 0), sp = Math.hypot(vx, vy);
      if (sp < 30) continue;
      if (VR.obbIn(VR.obb(o.x + vx * 0.03, o.y + vy * 0.03, o.a, o.spec.len / 2 + 1, o.spec.wid / 2 + 3), p.x, p.y - 4)) return { c: o, sp, vx, vy };
    }
    return null;
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
      const s = this.sprites[pal].get('down', 'idle', 0), R = VR.RES; c = VR.canvas(34 * R, 18 * R); const g = c.getContext('2d');
      g.scale(R, R); g.translate(17, 9); g.rotate(Math.PI / 2); g.drawImage(s, -8 * VR.PS, -16 * VR.PS, 16 * VR.PS, 32 * VR.PS); this.flat.set(pal, c);
    }
    return c;
  }
  collect(camX, camY, sw, sh, al, out) {
    for (const p of this.sitters) {
      if (p.gone) continue;
      const x = Math.round(p.x - camX), y = Math.round(p.y - camY);
      if (x < -20 || y < -36 || x > sw + 20 || y > sh + 20) continue;
      out.push({ sy: p.y + 2, draw: (ctx) => ctx.drawImage(p.look.get(p.dir, 'sit', 0), x - 8 * VR.PS, y - 31 * VR.PS, 16 * VR.PS, 32 * VR.PS) });
    }
    for (const p of this.list) {
      const x = Math.round(VR.lerp(p.px, p.x, al) - camX), y = Math.round(VR.lerp(p.py, p.y, al) - camY);
      if (x < -20 || y < -36 || x > sw + 20 || y > sh + 20) continue;
      out.push({ sy: y + camY, draw: (ctx) => {
        VR.sun.blob(ctx, x, y, 30, 5.5, 2.3, 0.28);
        if (p.mode === 'down' && p.rag) p.rag.draw(ctx, this.sprites[p.pal], x, y);
        else if (p.mode === 'down') ctx.drawImage(this.lying(p.pal), x - 17, y - 12, 34, 18);
        else ctx.drawImage(p.mode === 'idle' ? this.sprites[p.pal].get(p.dir, 'idle', 0) : this.sprites[p.pal].get(p.dir, p.mode === 'flee' ? 'run' : 'walk', Math.floor(p.anim) % 8), x - 8 * VR.PS, y - 31 * VR.PS, 16 * VR.PS, 32 * VR.PS);
        if (p.say) VR.Player.prototype.drawBubble.call({ bubble: p.say, px: x + camX, x: x + camX, py: y + camY + 6, y: y + camY + 6 }, ctx, camX, camY, 1);
      } });
    }
  }
};
