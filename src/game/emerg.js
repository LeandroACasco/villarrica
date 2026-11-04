// Emergencias (04/11/2026): daño de los vehículos (humo, fuego y explosión), nivel de búsqueda con testigos que
// gritan en jopara, la Policía que te persigue (patrulleras y camionetas, y a pie si te bajás), los bomberos que
// vienen a apagar el fuego con su camión y la ambulancia que levanta a los atropellados. Sirenas con WebAudio,
// luces que titilan y cañón de agua del camión bomba. Todo original: sin escudos ni logos reales.
'use strict';
VR.ALERTAS = ['¡Ahenoita 911!', '¡Pepete epytá!', '¡Mondaha!', '¡Policía, policía!', '¡Epytá upépe!', '¡Socorro!'];
VR.POLI_DICE = ['¡Epytá upépe!', '¡Alto, Policía!', '¡Al suelo!', '¡Quieto ahí!'];

// ---------- sirena ----------
VR.Siren = class {
  constructor() { this.on = false; this.t = 0; }
  ensure() {
    if (this.ac || this.failed) return !!this.ac;
    try {
      this.ac = VR.audio.ctx(); if (!this.ac) throw new Error('sin audio');
      this.osc = this.ac.createOscillator(); this.osc.type = 'sawtooth';
      this.lp = this.ac.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 1800;
      this.gain = this.ac.createGain(); this.gain.gain.value = 0;
      this.osc.connect(this.lp); this.lp.connect(this.gain); this.gain.connect(VR.audio.master); this.osc.start();
    } catch (e) { this.failed = true; return false; }
    return true;
  }
  // mode: 'policia' (sube y baja), 'ambulancia' (dos tonos), 'bomberos' (lento y grave); vol 0..1
  update(dt, mode, vol, enabled) {
    if (!enabled || !mode || vol <= 0.001) { if (this.ac) this.gain.gain.setTargetAtTime(0, this.ac.currentTime, 0.05); return; }
    if (!this.ensure()) return;
    if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
    this.t += dt;
    let f;
    if (mode === 'ambulancia') f = Math.floor(this.t / 0.42) % 2 ? 760 : 980;
    else if (mode === 'bomberos') f = 420 + 380 * (0.5 - 0.5 * Math.cos(this.t / 2.6 * Math.PI * 2));
    else f = 620 + 640 * (0.5 - 0.5 * Math.cos(this.t / 1.3 * Math.PI * 2));
    const now = this.ac.currentTime;
    this.osc.frequency.setTargetAtTime(f, now, 0.012);
    this.gain.gain.setTargetAtTime(0.09 * vol, now, 0.05);
  }
};

VR.Emergency = class {
  constructor(world, opts) {
    this.world = world; this.traffic = opts.traffic; this.gps = opts.gps; this.peds = opts.peds; this.night = opts.night;
    this.toast = opts.toast; this.onBusted = opts.onBusted; this.onWasted = opts.onWasted;
    this.fx = []; this.units = []; this.crew = []; this.wrecks = []; this.burning = new Set();
    this.level = 0; this.lost = 0; this.cool = {}; this.flash = 0; this.t = 0; this.rnd = VR.rng(911);
    this.siren = new VR.Siren(); this.sound = true;
    const cloth = VR.AV2_CAT.cloth, idx = (h) => cloth.indexOf(h);
    const navy = idx('#1e3a6a'), black = idx('#2c2c34'), yellow = idx('#e8b830');
    this.looks = {
      poli: [0, 1, 2, 3].map((i) => VR.av2Lazy({ gender: i === 3 ? 'f' : 'm', skin: [1, 2, 3, 2][i], build: i === 1 ? 'fornido' : 'normal', hair: i === 3 ? 'colita' : 'corto', hairColor: 1, top: 'camisa', topColor: navy, bottom: 'cargo', bottomColor: black, shoes: 'botines', shoesColor: black, hat: 'gorra', hatColor: navy })),
      bombero: [0, 1, 2].map((i) => VR.av2Lazy({ gender: i === 2 ? 'f' : 'm', skin: [2, 1, 3][i], build: 'fornido', hair: 'corto', top: 'campera', topColor: yellow, topColor2: yellow, bottom: 'cargo', bottomColor: yellow, shoes: 'botines', shoesColor: black, hat: 'casco', hatColor: yellow })),
    };
    VR.onCarHit = (c, imp, o) => this.damage(c, imp, o);
    VR.onPedHit = (p, speed) => this.pedHit(p, speed);
  }

  // ---------- daño, fuego y explosiones ----------
  damage(c, imp, o) {
    const hurt = (v, k) => { if (v.wreck || v.spec.noFire) return; const m = (v.spec.mass > 2 ? 0.45 : 1) * (v.unit ? 0.35 : 1); v.hp = (v.hp ?? 100) - (imp - 50) * 0.13 * k * m; if (v.hp <= 0 && !v.burning) this.ignite(v); };
    hurt(c, 1); if (o && o.spec) hurt(o, 0.8);
    VR.audio.crash(c.x, c.y, imp);
    if (c.driven && imp > 110) this.reckless(c.x, c.y);
    if (c.driven && o && o.spec && o.spec.emer === 'policia') this.crime('choque_policia', 1, c.x, c.y, true);
    if (c.driven && o && o.spec) o.hitByPlayer = this.t;
  }
  // la gente que está cerca te reta cuando manejás como loco
  reckless(x, y) {
    if ((this.cool.reck || 0) > this.t || !this.peds) return; let best = null, bd = 150;
    for (const p of this.peds.list) { if (p.mode === 'down' || p.say) continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
    if (best) { const L = VR.PED_TALK.reckless; best.say = { text: L[(this.rnd() * L.length) | 0], t: 2.6 }; this.cool.reck = this.t + 5; }
  }
  ignite(v) {
    if (v.spec.noFire) return; // el karumbe es de madera y un caballo: no tiene motor ni nafta que se prenda
    v.burning = true; v.burnT = 0; v.hp = 0; this.burning.add(v);
    if (v.ai && this.traffic) this.traffic.release(v);
    if (v.driven) this.toast('🔥 ¡Se prende fuego! ¡Bajate ya!');
    this.dispatch('bomba', v);
  }
  extinguish(v) { if (v.burning) { v.burning = false; v.hp = 8; } v.smolder = 0; this.burning.delete(v); }
  explode(v) {
    v.burning = false; this.burning.delete(v); v.wreck = true; v.smolder = 40; v.siren = false;
    v.frames = VR.burntFrames(v.frames); v.rider = null; v.vx *= 0.2; v.vy *= 0.2;
    this.wrecks.push({ v, t: 0 }); this.flash = 0.25; VR.audio.boom(v.x, v.y);
    for (let i = 0; i < 46; i++) { const a = this.rnd() * Math.PI * 2, s = 40 + this.rnd() * 160; this.fx.push({ k: i < 30 ? 'fire' : 'debris', x: v.x, y: v.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + this.rnd() * 0.7, max: 1.2, r: 3 + this.rnd() * 5 }); }
    for (let i = 0; i < 18; i++) this.fx.push({ k: 'smoke', x: v.x + (this.rnd() - 0.5) * 20, y: v.y + (this.rnd() - 0.5) * 20, vx: (this.rnd() - 0.5) * 30, vy: -10 - this.rnd() * 20, life: 1.5 + this.rnd() * 1.5, max: 3, r: 6 + this.rnd() * 8 });
    for (let i = 0; i < 6; i++) this.world.mark(v.x + (this.rnd() - 0.5) * 14, v.y + (this.rnd() - 0.5) * 14, 'rgba(20,16,12,.7)');
    // onda expansiva
    for (const o of this.world.carsIn(v.x - 60, v.y - 60, v.x + 60, v.y + 60, [])) {
      if (o === v) continue; const d = Math.hypot(o.x - v.x, o.y - v.y); if (d > 60) continue; if (o.spec.noFire) { if (o.ai && this.traffic) o.ai.stun = 1.5; continue; }
      const k = 1 - d / 60; o.hp = (o.hp ?? 100) - 75 * k; if (o.hp <= 0 && !o.burning && !o.wreck) this.ignite(o);
      if (o.vx === undefined) { o.vx = 0; o.vy = 0; o.w = 0; } o.vx += (o.x - v.x) / (d || 1) * 160 * k / o.mass; o.vy += (o.y - v.y) / (d || 1) * 160 * k / o.mass; o.w += (this.rnd() - 0.5) * 4 * k; this.world.wake(o, 200);
    }
    if (this.peds) for (const p of this.peds.list) { const d = Math.hypot(p.x - v.x, p.y - v.y); if (d < 55 && p.mode !== 'down') { p.mode = 'down'; p.t = 2.5; p.vx = (p.x - v.x) / (d || 1) * 120; p.vy = (p.y - v.y) / (d || 1) * 120; if (d < 38) { p.injured = true; p.t = 40; this.dispatch('ambulancia', p); } } }
    if (this.player && !this.inCar && Math.hypot(this.player.x - v.x, this.player.y - v.y) < 45) this.player.say('¡Ay, Dios mío!', 1.6);
    if (v.driven) { this.onWasted(); return; }
    if (this.t - (v.hitByPlayer ?? -99) < 12 || v.byPlayer) this.crime('explosion', 1, v.x, v.y);
  }

  // ---------- crímenes y nivel de búsqueda ----------
  witness(x, y) {
    for (const u of this.units) if (u.kind === 'policia' && Math.hypot(u.v.x - x, u.v.y - y) < 260) return { cop: true };
    for (const c of this.crew) if (c.role === 'poli' && Math.hypot(c.x - x, c.y - y) < 200) return { cop: true };
    if (this.traffic) for (const v of this.traffic.list) if (v.spec.emer === 'policia' && Math.hypot(v.x - x, v.y - y) < 220) return { cop: true, v };
    let best = null, bd = 160;
    if (this.peds) for (const p of this.peds.list) { if (p.mode === 'down') continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
    return best ? { ped: best } : null;
  }
  crime(kind, stars, x, y, sure) {
    if (this.cool[kind] > this.t) return; this.cool[kind] = this.t + 1.6;
    const w = sure ? { cop: true } : this.witness(x, y);
    if (!w) return;
    if (w.ped) { const p = w.ped; p.say = { text: VR.ALERTAS[(this.rnd() * VR.ALERTAS.length) | 0], t: 2.4 }; p.mode = 'flee'; p.t = 2; this.peds.awayFrom(p, { x, y }); }
    const before = this.level;
    this.level = Math.min(5, this.level + stars); this.lost = 0;
    if (this.level > before) { this.toast('🚨 ' + '★'.repeat(this.level) + ' · ' + (this.level >= 4 ? '¡Te busca toda la Policía!' : this.level >= 2 ? 'La Policía te está buscando' : 'Alguien llamó al 911')); if (VR.input.buzz) VR.input.buzz(40); }
  }
  pedHit(p, speed) {
    this.crime('atropello', 1, p.x, p.y); VR.audio.ouch(p.x, p.y);
    if (speed > 55) { p.injured = true; p.t = 40; this.dispatch('ambulancia', p); }
  }
  stolen(v) {
    const e = v.spec.emer;
    if (v.unit) { v.unit.dead = true; v.unit = null; }
    if (e === 'policia') this.crime('robo_policia', 2, v.x, v.y, true);
    else if (e) this.crime('robo_' + e, 1, v.x, v.y, true);
    else if (v.ai) this.crime('robo', 1, v.x, v.y);
  }

  // ---------- unidades ----------
  spawnPoint(minD = 380, maxD = 700) {
    const T = this.traffic; if (!T || !T.ok) return null;
    const f = this.focus, view = this.view;
    const ok = [];
    for (const n of T.cand) {
      const x = T.nx[n], y = T.ny[n];
      if (Math.abs(x - f.x) > maxD || Math.abs(y - f.y) > maxD) continue;
      const d = Math.hypot(x - f.x, y - f.y);
      if (d < minD || d > maxD) continue;
      if (x > view.x0 - 40 && x < view.x1 + 40 && y > view.y0 - 40 && y < view.y1 + 40) continue;
      ok.push(n);
    }
    for (let k = 0; k < 12 && ok.length; k++) {
      const n = ok[(this.rnd() * ok.length) | 0], x = T.nx[n], y = T.ny[n];
      if (this.world.boxOverlap(x - 30, y - 30, x + 30, y + 30)) continue;
      return [x, y];
    }
    return null;
  }
  dispatch(model, target) {
    const kind = model === 'bomba' ? 'bomberos' : model === 'ambulancia' ? 'ambulancia' : 'policia';
    if (kind !== 'policia' && this.units.some((u) => u.kind === kind && !u.dead && u.task !== 'leave')) { const u = this.units.find((q) => q.kind === kind && q.task !== 'leave'); if (u && !u.queue.includes(target)) u.queue.push(target); return; }
    const p = this.spawnPoint(); if (!p) return null;
    const ang = Math.atan2(this.focus.x - p[0], -(this.focus.y - p[1]));
    const v = new VR.Car(this.world, p[0], p[1], ang, 0, 'car', model);
    v.siren = true; v.hp = 140;
    const u = { v, kind, model, task: kind === 'policia' ? 'chase' : 'goto', target, queue: [], path: null, pi: 0, repath: this.rnd() * 0.5, stuck: 0, rev: 0, crew: [], wait: 0, age: 0 };
    v.unit = u; this.world.addBox(v); this.units.push(u);
    return u;
  }
  // Manejo de las unidades: siguen el camino del GPS por el medio de la calle (como el tránsito, sin trabarse
  // contra las paredes), frenan en las esquinas y para no chocar, y esquivan por el costado si algo las tapa.
  drive(u, dt, tx, ty, arrive, ram) {
    const v = u.v, d0 = Math.hypot(tx - v.x, ty - v.y);
    u.repath -= dt;
    if (!u.path || (u.repath <= 0 && (ram || Math.hypot(tx - u.pt[0], ty - u.pt[1]) > 30))) {
      let P = this.gps && this.gps.ok ? this.trim(this.gps.route(v.x, v.y, tx, ty, false), tx, ty) : null;
      if (!P) P = [v.x, v.y, tx, ty];
      P = Array.from(P); P[0] = v.x; P[1] = v.y;
      const cum = [0]; for (let k = 2; k < P.length; k += 2) cum.push(cum[cum.length - 1] + Math.hypot(P[k] - P[k - 2], P[k + 1] - P[k - 1]));
      u.path = P; u.cum = cum; u.s = 0; u.pt = [tx, ty]; u.repath = ram ? 1.3 : 5;
    }
    const P = u.path, cum = u.cum, total = cum[cum.length - 1];
    const at = (s) => { s = Math.max(0, Math.min(total, s)); let k = 1; while (k < cum.length - 1 && cum[k] < s) k++; const t = (s - cum[k - 1]) / ((cum[k] - cum[k - 1]) || 1); const x0 = P[k * 2 - 2], y0 = P[k * 2 - 1], x1 = P[k * 2], y1 = P[k * 2 + 1], L = Math.hypot(x1 - x0, y1 - y0) || 1; return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, (x1 - x0) / L, (y1 - y0) / L]; };
    const cruise = u.kind === 'bomberos' ? 118 : u.kind === 'ambulancia' ? 150 : 172, left = total - u.s;
    let target = cruise;
    if (left < arrive) target = 0; else target = Math.min(target, Math.max(28, (left - arrive) * 1.6));
    const Lk = 18 + Math.abs(v.v) * 0.16;
    const [cx0, cy0, ddx, ddy] = at(u.s + Lk), off = u.off || 0, cx = cx0 - ddy * off, cy = cy0 + ddx * off;
    const want = Math.atan2(cx - v.x, -(cy - v.y));
    let d = want - v.a; d = Math.atan2(Math.sin(d), Math.cos(d));
    target *= Math.max(0.3, Math.cos(Math.min(1.5, Math.abs(d))));
    // ¿algo adelante?
    const fx = Math.sin(v.a), fy = -Math.cos(v.a);
    let blocked = null;
    for (let k = v.LEN / 2 + 3; k <= v.LEN / 2 + 8 + Math.max(0, v.v) * 0.3 && !blocked; k += 5) blocked = this.world.boxAt(v.x + fx * k, v.y + fy * k, v);
    if (blocked && !(ram && blocked.driven)) {
      target = Math.min(target, blocked.ai && blocked.ai.yield > 0 ? 40 : 8);
      u.block = (u.block || 0) + dt;
      if (u.block > 0.8 && !(u.dodge > 0)) { u.dodge = 1.8; u.side = -(u.side || 1); }
      if (u.block > 3 && blocked.ai && this.traffic) { this.traffic.remove(blocked); u.block = 0; } // el del tránsito se fue por otro lado
    } else u.block = 0;
    if (u.dodge > 0) u.dodge -= dt;
    const offT = u.dodge > 0 ? 11 * (u.side || 1) : 0;
    u.off = off + VR.clamp(offT - off, -22 * dt, 22 * dt);
    const turn = (u.kind === 'bomberos' ? 2.3 : 3.3) * dt;
    if (Math.abs(v.v) > 2) v.a += VR.clamp(d, -turn, turn);
    if (v.v < target) v.v = Math.min(target, v.v + (u.kind === 'bomberos' ? 120 : 190) * dt); else v.v = Math.max(target, v.v - 420 * dt);
    if (v.v < 2 && target > 0 && Math.abs(d) > 0.3) v.a += VR.clamp(d, -turn * 0.5, turn * 0.5);
    v.px = v.x; v.py = v.y; v.pa = v.a;
    if (Math.hypot(cx - v.x, cy - v.y) < Lk * 1.9) u.s += Math.max(0, v.v) * dt;
    // no atravesar vehículos (salvo el tuyo cuando te encierran)
    const nx = v.x + Math.sin(v.a) * v.v * dt, ny = v.y - Math.cos(v.a) * v.v * dt, hit = v.contacts(nx, ny, v.a);
    if (hit && hit.other && !(ram && hit.other.driven) && !v.contacts(v.x, v.y, v.pa)) { v.a = v.pa; v.v = 0; u.block = (u.block || 0) + dt; if (u.block > 0.8 && !(u.dodge > 0)) { u.dodge = 1.8; u.side = -(u.side || 1); } }
    else { v.x = nx; v.y = ny; }
    v.vx = Math.sin(v.a) * v.v; v.vy = -Math.cos(v.a) * v.v; v.w = 0;
    this.world.moveBox(v);
    return d0;
  }
  halt(u, dt) { const v = u.v; v.px = v.x; v.py = v.y; v.pa = v.a; v.v = Math.max(0, v.v - 400 * dt); v.x += Math.sin(v.a) * v.v * dt; v.y -= Math.cos(v.a) * v.v * dt; v.vx = Math.sin(v.a) * v.v; v.vy = -Math.cos(v.a) * v.v; this.world.moveBox(v); }
  // corta el camino donde pasa más cerca del destino (el nodo más cercano puede quedar del otro lado)
  trim(P, tx, ty) {
    if (!P || P.length < 6) return P;
    let bd = Infinity, bk = 0, bx = 0, by = 0;
    for (let k = 0; k + 3 < P.length - 2; k += 2) {
      const ax = P[k], ay = P[k + 1], dx = P[k + 2] - ax, dy = P[k + 3] - ay, L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((tx - ax) * dx + (ty - ay) * dy) / L2)), qx = ax + dx * t, qy = ay + dy * t, d = Math.hypot(qx - tx, qy - ty);
      if (d < bd - 1) { bd = d; bk = k; bx = qx; by = qy; }
    }
    const out = Array.from(P.slice(0, bk + 2)); out.push(bx, by, tx, ty);
    return out;
  }
  spawnCrew(u, role, n) {
    const v = u.v, rx = Math.cos(v.a), ry = Math.sin(v.a);
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, fx = Math.sin(v.a), fy = -Math.cos(v.a), W = this.world;
      const tries = [[rx * side * (v.WID / 2 + 6), ry * side * (v.WID / 2 + 6)], [-rx * side * (v.WID / 2 + 6), -ry * side * (v.WID / 2 + 6)], [-fx * (v.LEN / 2 + 6), -fy * (v.LEN / 2 + 6)], [fx * (v.LEN / 2 + 6), fy * (v.LEN / 2 + 6)], [0, 0]];
      let x = v.x, y = v.y + 4;
      for (const [ox, oy] of tries) { const X = v.x + ox, Y = v.y + oy + 4; if (!W.hits(X - 3, Y - 3, X + 3, Y)) { x = X; y = Y; break; } }
      const L = this.looks[role]; const c = { x, y, px: x, py: y, dir: 'down', anim: 0, moving: false, run: false, role, unit: u, look: L[(this.rnd() * L.length) | 0], say: null, spray: 0, t: 0 };
      u.crew.push(c); this.crew.push(c);
    }
  }
  walk(c, dt, tx, ty, speed) {
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
    c.px = c.x; c.py = c.y; c.moving = d > 3;
    if (!c.moving) return d;
    const s = Math.min(d, speed * dt), nx = dx / d, ny = dy / d, W = this.world;
    const free = (x, y) => !W.hits(x - 3, y - 3, x + 3, y);
    if (free(c.x + nx * s, c.y + ny * s)) { c.x += nx * s; c.y += ny * s; }
    else if (free(c.x + nx * s, c.y)) c.x += nx * s;
    else if (free(c.x, c.y + ny * s)) c.y += ny * s;
    else { c.x += ny * s * (c.side || 1); c.y -= nx * s * (c.side || 1); if (this.rnd() < 0.02) c.side = -(c.side || 1); }
    c.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    c.anim += dt * (speed > 70 ? 15 : 9);
    return d;
  }
  water(x, y, a, spread = 0.25, sp = 230) {
    for (let i = 0; i < 2; i++) { const aa = a + (this.rnd() - 0.5) * spread, s = sp * (0.8 + this.rnd() * 0.4); this.fx.push({ k: 'water', x, y, vx: Math.sin(aa) * s, vy: -Math.cos(aa) * s, life: 0.42, max: 0.42, r: 1.5 }); }
  }

  // ---------- cuadro a cuadro ----------
  update(dt, player, car, focus, view, input) {
    this.t += dt; this.player = player; this.inCar = !!car; this.focus = focus; this.view = view;
    if (this.flash > 0) this.flash -= dt;
    const tgt = car || player;
    // vehículos dañados, en llamas y destruidos
    const near = this.world.carsIn(focus.x - 500, focus.y - 400, focus.x + 500, focus.y + 400, []);
    for (const v of near) {
      if (v.wreck) { if (v.smolder > 0) { v.smolder -= dt; if (this.rnd() < dt * 6) this.fx.push({ k: 'smoke', x: v.x + (this.rnd() - 0.5) * 8, y: v.y - 4, vx: (this.rnd() - 0.5) * 8, vy: -14, life: 2.2, max: 2.2, r: 4 + this.rnd() * 3 }); } continue; }
      const hp = v.hp ?? 100;
      if (v.burning) {
        v.burnT += dt;
        if (this.rnd() < dt * 40) this.fx.push({ k: 'fire', x: v.x + (this.rnd() - 0.5) * v.WID * 0.7, y: v.y + (this.rnd() - 0.5) * v.LEN * 0.5, vx: (this.rnd() - 0.5) * 10, vy: -20 - this.rnd() * 25, life: 0.5 + this.rnd() * 0.4, max: 0.9, r: 2 + this.rnd() * 3 });
        if (this.rnd() < dt * 10) this.fx.push({ k: 'smoke', x: v.x, y: v.y - 6, vx: (this.rnd() - 0.5) * 10, vy: -22, life: 2.5, max: 2.5, r: 5 + this.rnd() * 4 });
        if (this.night) this.night.add(v.x, v.y, 46, '255,140,40', 0.85);
        if (v.burnT > 7) this.explode(v);
      } else if (hp < 40 && this.rnd() < dt * (hp < 20 ? 12 : 5)) this.fx.push({ k: 'smoke', x: v.x + Math.sin(v.a) * v.LEN * 0.35, y: v.y - Math.cos(v.a) * v.LEN * 0.35, vx: (this.rnd() - 0.5) * 8, vy: -16, life: 1.6, max: 1.6, r: 3 + this.rnd() * 2, dark: hp < 20 });
    }
    for (const v of this.burning) if (!v.wreck && v.burning && Math.hypot(v.x - focus.x, v.y - focus.y) > 520) { v.burnT += dt; if (v.burnT > 7) this.explode(v); }
    for (let i = this.wrecks.length - 1; i >= 0; i--) { const w = this.wrecks[i]; w.t += dt; if (w.t > 45 && Math.hypot(w.v.x - focus.x, w.v.y - focus.y) > 900 && !w.v.parkedSlot) { this.world.removeBox(w.v); this.wrecks.splice(i, 1); } }

    // nivel de búsqueda: se baja si la Policía te pierde de vista un rato
    if (this.level > 0) {
      const seen = this.units.some((u) => u.kind === 'policia' && !u.dead && Math.hypot(u.v.x - tgt.x, u.v.y - tgt.y) < 300) || this.crew.some((c) => c.role === 'poli' && Math.hypot(c.x - tgt.x, c.y - tgt.y) < 240);
      if (seen) this.lost = 0; else this.lost += dt;
      if (this.lost > 9 + this.level * 4) { this.level--; this.lost = 0; if (!this.level) this.toast('😮‍💨 Te perdieron el rastro'); }
      const want = [0, 1, 2, 3, 5, 6][this.level], have = this.units.filter((u) => u.kind === 'policia' && !u.dead && u.task === 'chase').length;
      this.spawnT = (this.spawnT || 0) - dt;
      if (have < want && this.spawnT <= 0) { this.spawnT = 2.5; this.dispatch(this.rnd() < 0.7 ? 'policam' : 'patrulla', null); }
    }
    // sirena que se escucha: la tuya o la unidad más cercana
    let sm = null, sv = 0;
    if (car && car.siren && car.spec.emer) { sm = car.spec.emer; sv = 1; }
    for (const u of this.units) if (u.v.siren && !u.dead) { const d = Math.hypot(u.v.x - tgt.x, u.v.y - tgt.y), vol = Math.max(0, 1 - d / 520) * 0.8; if (vol > sv) { sv = vol; sm = u.kind; } }
    this.siren.update(dt, sm, sv, this.sound);

    // unidades
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i], v = u.v; u.age += dt;
      if (u.dead) { this.units.splice(i, 1); continue; }
      if (v.wreck || v.burning) { u.task = 'leave'; v.siren = false; }
      if (u.kind === 'policia') {
        if (this.level === 0 && u.task === 'chase') u.task = u.crew.length ? 'regroup' : 'leave';
        if (u.task === 'chase') {
          const d = Math.hypot(tgt.x - v.x, tgt.y - v.y);
          if (!car && d < 95 && Math.abs(v.v) < 60) { // te bajaste: se bajan a buscarte
            this.halt(u, dt);
            if (!u.crew.length && !u.out) { u.out = true; this.spawnCrew(u, 'poli', 2); for (const c of u.crew) c.say = { text: VR.POLI_DICE[(this.rnd() * VR.POLI_DICE.length) | 0], t: 1.8 }; }
          } else if (u.crew.length && d < 140 && !car) this.halt(u, dt);
          else this.drive(u, dt, tgt.x, tgt.y, 30, true);
          if (car && d < v.LEN / 2 + car.LEN / 2 + 8 && Math.abs(car.v) < 14) { u.pin = (u.pin || 0) + dt; if (u.pin > 2.2) { this.busted(); return; } } else u.pin = 0;
        } else if (u.task === 'regroup') { this.halt(u, dt); if (!u.crew.length) u.task = 'leave'; }
      } else if (u.task === 'goto') {
        const T = u.target, alive = T && (u.kind === 'bomberos' ? (T.burning || (T.wreck && T.smolder > 0)) : T.injured && this.peds.list.includes(T));
        if (!alive) { u.target = u.queue.shift() || null; if (!u.target) u.task = u.crew.length ? 'regroup' : 'leave'; continue; }
        const d = this.drive(u, dt, T.x, T.y, u.kind === 'bomberos' ? 95 : 50, false);
        if (d < (u.kind === 'bomberos' ? 125 : 70) && Math.abs(v.v) < 30) { u.task = 'work'; this.spawnCrew(u, 'bombero', u.kind === 'bomberos' ? 2 : 1); }
      } else if (u.task === 'work') {
        this.halt(u, dt);
        const T = u.target, done = !T || (u.kind === 'bomberos' ? !T.burning && !(T.wreck && T.smolder > 0) : !T.injured);
        if (done) { u.target = u.queue.shift() || null; u.task = u.target ? 'goto' : 'regroup'; if (u.target && !u.crew.length) u.task = 'goto'; }
      } else if (u.task === 'regroup') { this.halt(u, dt); if (!u.crew.length) { u.task = 'leave'; } }
      if (u.task === 'leave') {
        v.siren = false;
        if (!u.away) u.away = this.spawnPoint(700, 1100) || [v.x + 800, v.y];
        if (!v.wreck && !v.burning && !v.driven) this.drive(u, dt, u.away[0], u.away[1], 20, false);
        const off = v.x < view.x0 - 60 || v.x > view.x1 + 60 || v.y < view.y0 - 60 || v.y > view.y1 + 60;
        if (!v.driven && (off && Math.hypot(v.x - focus.x, v.y - focus.y) > 450 || Math.hypot(v.x - focus.x, v.y - focus.y) > 1400)) { if (!v.wreck) this.world.removeBox(v); this.units.splice(i, 1); }
      }
      if (u.kind === 'policia' && u.task === 'chase' && Math.hypot(v.x - focus.x, v.y - focus.y) > 1500) { this.world.removeBox(v); this.units.splice(i, 1); }
    }

    // gente de las unidades a pie
    for (let i = this.crew.length - 1; i >= 0; i--) {
      const c = this.crew[i], u = c.unit, v = u.v;
      if (c.say) { c.say.t -= dt; if (c.say.t <= 0) c.say = null; }
      const back = () => { c.backT = (c.backT || 0) + dt; const d = this.walk(c, dt, v.x, v.y, 70); if (d < Math.max(v.WID / 2 + 4, 14) || u.dead || c.backT > 7) { this.crew.splice(i, 1); u.crew.splice(u.crew.indexOf(c), 1); } };
      if (c.role === 'poli') {
        if (this.level > 0 && !u.dead && u.task === 'chase') {
          const d = Math.hypot(tgt.x - c.x, tgt.y - (c.y - 2));
          if (car && d > 160) back();
          else {
            this.walk(c, dt, tgt.x, tgt.y + (car ? 0 : 2), 88);
            const close = car ? d < car.LEN / 2 + 6 && Math.abs(car.v) < 12 : d < 10;
            c.t = close ? c.t + dt : Math.max(0, c.t - dt);
            if (c.t > (car ? 1.2 : 0.6)) { this.busted(); return; }
          }
        } else back();
      } else { // bomberos y paramédicos
        const T = u.target;
        if ((u.task === 'work' || u.task === 'goto') && T) {
          const d = Math.hypot(T.x - c.x, T.y - c.y), stop = u.kind === 'bomberos' ? 28 : 15;
          if (d > stop) this.walk(c, dt, T.x + (c === u.crew[0] ? -1 : 1) * (u.kind === 'bomberos' ? 18 : 6), T.y + 4, 75);
          else {
            c.moving = false; c.px = c.x; c.py = c.y;
            const dx = T.x - c.x, dy = T.y - c.y; c.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
            c.t += dt;
            if (u.kind === 'bomberos') { this.water(c.x, c.y - 10, Math.atan2(dx, -dy), 0.3, 150); if (c.t > 4) this.extinguish(T); }
            else if (c.t > 2.2 && T.injured) { T.injured = false; T.t = 0.3; T.say = { text: '¡Aguyje!', t: 2 }; c.say = { text: '¡Ndaipóri problema!', t: 1.8 }; }
          }
        } else back();
      }
    }

    // partículas
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const p = this.fx[i]; p.life -= dt;
      if (p.life <= 0) { this.fx.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'debris' || p.k === 'fire') { p.vx *= Math.exp(-3 * dt); p.vy *= Math.exp(-3 * dt); }
      if (p.k === 'smoke') { p.r += dt * 5; p.vx *= Math.exp(-dt); }
      if (p.k === 'water') { // apaga lo que toca y voltea a la gente
        for (const v of this.burning) if (Math.abs(v.x - p.x) < v.WID && Math.abs(v.y - p.y) < v.LEN / 2) { v.wet = (v.wet || 0) + dt * 0.2; if (v.wet > 1.6) this.extinguish(v); }
        if (this.peds && this.rnd() < 0.3) for (const q of this.peds.list) if (q.mode !== 'down' && Math.abs(q.x - p.x) < 5 && Math.abs(q.y - 4 - p.y) < 7) { q.mode = 'down'; q.t = 1.4; q.vx = p.vx * 0.3; q.vy = p.vy * 0.3; }
      }
    }
    // manejar rápido por la vereda: la gente te reta
    if (car && Math.abs(car.v) > 85) { const tt = this.world.get(Math.floor(car.x / VR.TILE), Math.floor(car.y / VR.TILE)); if (tt === VR.T.SIDEWALK || tt === VR.T.PAVING || tt === VR.T.CHECKER) this.reckless(car.x, car.y); }
    // agua que se escucha: la tuya o la de los bomberos trabajando cerca
    const spraying = (car && car.model === 'bomba' && input.down('action') && this.holdT > 0.22) || this.crew.some((c) => c.role === 'bombero' && c.unit.kind === 'bomberos' && c.unit.task === 'work' && !c.moving && Math.hypot(c.x - focus.x, c.y - focus.y) < 300);
    VR.audio.water(spraying);
    // tu camión bomba: cañón de agua
    if (car && car.model === 'bomba' && input.down('action') && this.holdT > 0.22) {
      const fx = Math.sin(car.a), fy = -Math.cos(car.a);
      this.water(car.x + fx * (car.LEN / 2 - 12), car.y + fy * (car.LEN / 2 - 12), car.a, 0.18, 260);
      for (const w of this.wrecks) if (w.v.smolder > 0 && Math.hypot(w.v.x - (car.x + fx * 70), w.v.y - (car.y + fy * 70)) < 40) w.v.smolder = 0;
    }
  }
  busted() {
    this.level = 0; this.lost = 0;
    for (const u of this.units) if (u.kind === 'policia') u.task = u.crew.length ? 'regroup' : 'leave';
    this.onBusted();
  }
  clear() { this.level = 0; this.lost = 0; for (const u of this.units) if (u.kind === 'policia') u.task = 'leave'; }

  // ---------- dibujo ----------
  collect(cx, cy, sw, sh, al, out) {
    for (const c of this.crew) {
      const x = Math.round(VR.lerp(c.px, c.x, al) - cx), y = Math.round(VR.lerp(c.py, c.y, al) - cy);
      if (x < -20 || y < -36 || x > sw + 20 || y > sh + 20) continue;
      out.push({ sy: y + cy, draw: (ctx) => {
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y - 1, 5.5, 2.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.drawImage(c.moving ? c.look.get(c.dir, c.role === 'poli' ? 'run' : 'walk', Math.floor(c.anim) % 8) : c.look.get(c.dir, 'idle', 0), x - 8, y - 31);
        if (c.say) VR.Player.prototype.drawBubble.call({ bubble: c.say, px: x + cx, x: x + cx, py: y + cy + 6, y: y + cy + 6 }, ctx, cx, cy, 1);
      } });
    }
  }
  drawFx(ctx, cx, cy) {
    ctx.save();
    for (const p of this.fx) {
      const x = p.x - cx, y = p.y - cy, k = p.life / p.max;
      if (p.k === 'smoke') { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = p.dark ? `rgba(30,28,30,${0.45 * k})` : `rgba(90,88,92,${0.4 * k})`; ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.fx) {
      const x = p.x - cx, y = p.y - cy, k = p.life / p.max;
      if (p.k === 'fire') { const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 1.6); g.addColorStop(0, `rgba(255,240,170,${0.9 * k})`); g.addColorStop(0.45, `rgba(255,140,30,${0.7 * k})`); g.addColorStop(1, 'rgba(200,40,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - p.r * 1.6, y - p.r * 1.6, p.r * 3.2, p.r * 3.2); }
      else if (p.k === 'water') { ctx.fillStyle = `rgba(170,215,255,${0.75 * k})`; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
      else if (p.k === 'debris') { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#2a2622'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); ctx.globalCompositeOperation = 'lighter'; }
    }
    ctx.restore();
  }
  drawFlash(ctx, sw, sh) { if (this.flash > 0) { ctx.fillStyle = `rgba(255,230,180,${this.flash * 2})`; ctx.fillRect(0, 0, sw, sh); } }
};

// vehículo quemado: los mismos cuadros, oscuros y con manchas
VR.burntFrames = (F) => {
  const c = new Map(), make = (k, sh) => {
    const src = sh ? F.getShadow(k) : F.get(k), o = VR.canvas(src.width, src.height), g = o.getContext('2d');
    g.drawImage(src, 0, 0); if (!sh) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(24,20,18,.82)'; g.fillRect(0, 0, o.width, o.height); g.fillStyle = 'rgba(120,60,20,.35)'; for (let i = 0; i < 5; i++) g.fillRect((k * 7 + i * 11) % o.width, (k * 5 + i * 13) % o.height, 2, 2); }
    return o;
  };
  return { S: F.S, get: (k) => c.get(k) || (c.set(k, make(k)), c.get(k)), getShadow: (k) => c.get('s' + k) || (c.set('s' + k, make(k, true)), c.get('s' + k)) };
};
