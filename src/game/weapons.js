// Armas (modo desarrollador, 04/11/2026): pistola y lanzallamas para probar la Policía, los bomberos, la
// ambulancia y el daño de los vehículos. Se prenden y apagan en el menú → Desarrollador (apagadas por defecto).
// Sin sangre: la gente herida queda en el piso hasta que llega la ambulancia, como con los atropellos.
// Teclado: E (o L) dispara, Q cambia de arma. Control: RB o Y dispara, LB cambia. Táctil: botón DISPARAR y la
// etiqueta del arma (tocar para cambiar).
'use strict';
VR.WEAPONS = {
  pistola: { name: 'Pistola', ico: '🔫', cool: 0.28, speed: 560, range: 280, carDmg: 14, stars: 1 },
  lanzallamas: { name: 'Lanzallamas', ico: '🔥', range: 78, cone: 0.42, carDmg: 55, stars: 1 },
};
VR.WEAPON_ORDER = ['pistola', 'lanzallamas'];
VR.PED_TALK.shots = ['¡Oñembokapu!', '¡Jadipara!', '¡Corran!', '¡Ay, Dios!', '¡Pepete epytá!'];
VR.PED_TALK.fire = ['¡Tata!', '¡Ojapo tata!', '¡Fuego, fuego!', '¡Socorro!'];

VR.Weapons = class {
  constructor(world, opts) {
    this.world = world; this.peds = opts.peds; this.emer = opts.emer; this.night = opts.night; this.toast = opts.toast;
    this.enabled = VR.store.get('dev:armas', false);
    this.noStars = VR.store.get('dev:sinEstrellas', false);
    this.cur = VR.store.get('dev:arma', 'pistola'); if (!VR.WEAPONS[this.cur]) this.cur = 'pistola';
    this.shots = []; this.cool = 0; this.flash = 0; this.flaming = false; this.rnd = VR.rng(4471); this.aim = Math.PI; this.t = 0;
  }
  setEnabled(on) { this.enabled = on; VR.store.set('dev:armas', on); if (!on) { this.flaming = false; VR.audio.flame(false); } }
  select(k) { if (!VR.WEAPONS[k]) return; this.cur = k; VR.store.set('dev:arma', k); }
  next() { const L = VR.WEAPON_ORDER; this.select(L[(L.indexOf(this.cur) + 1) % L.length]); const W = VR.WEAPONS[this.cur]; this.toast(W.ico + ' ' + W.name); }
  get weapon() { return VR.WEAPONS[this.cur]; }

  // hacia dónde apunta: lo que marca el joystick, si no hacia donde mira; con un poco de ayuda para apuntar
  aimAngle(player, input) {
    let a;
    if (Math.abs(input.ax) + Math.abs(input.ay) > 0.2) a = Math.atan2(input.ax, -input.ay);
    else a = ({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 })[player.dir];
    const W = this.weapon, R = W.range || 200, ox = player.x, oy = player.y - 12;
    let best = null, bs = 0.35;
    const look = (x, y) => { const d = Math.hypot(x - ox, y - oy); if (d > R || d < 4) return; let da = Math.atan2(x - ox, -(y - oy)) - a; da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da))); if (da < bs) { bs = da; best = Math.atan2(x - ox, -(y - oy)); } };
    if (this.peds) for (const p of this.peds.list) if (p.mode !== 'down') look(p.x, p.y - 12);
    for (const c of this.world.carsIn(ox - R, oy - R, ox + R, oy + R, [])) if (!c.wreck) look(c.x, c.y);
    return best ?? a;
  }

  update(dt, player, car, input) {
    player.holding = !!(this.enabled && !car);
    this.t += dt; if (this.cool > 0) this.cool -= dt; if (this.flash > 0) this.flash -= dt;
    let flaming = false;
    if (this.enabled && !car) {
      if (input.pressed('weapon')) this.next();
      const W = this.weapon;
      if (this.cur === 'pistola' && input.down('fire') && this.cool <= 0) { this.aim = this.aimAngle(player, input); this.shoot(player); this.cool = W.cool; }
      if (this.cur === 'lanzallamas' && input.down('fire')) { this.aim = this.aimAngle(player, input); flaming = true; this.flame(dt, player); }
      if (input.down('fire')) { player.dir = Math.abs(Math.sin(this.aim)) > Math.abs(Math.cos(this.aim)) ? (Math.sin(this.aim) > 0 ? 'right' : 'left') : (Math.cos(this.aim) > 0 ? 'up' : 'down'); }
    } else if (input.pressed('weapon') && !this.enabled && !car) this.toast('Las armas están apagadas (Menú → Desarrollador)');
    if (flaming !== this.flaming) { this.flaming = flaming; VR.audio.flame(flaming); }
    this.updateShots(dt);
  }

  // ---------- pistola ----------
  // Se sostiene con la mano derecha a la altura del pecho, apuntando para adelante (05/11/2026: antes salía de la cadera)
  hand(x, y, a) { const fx = Math.sin(a), fy = -Math.cos(a), rx = Math.cos(a), ry = Math.sin(a); return [x + fx * 3 * VR.PS + rx * 2.5 * VR.PS, y - 18 * VR.PS + fy * 2 + ry * 1.5 * VR.PS]; }
  muzzle(player) { const a = this.aim, [hx, hy] = this.hand(player.x, player.y, a), L = this.cur === 'pistola' ? 7 : 12; return [hx + Math.sin(a) * L, hy - Math.cos(a) * L * 0.75]; }
  shoot(player, at) { // at = [x, y, ángulo]: disparo de otro jugador (online), sin estrellas para vos
    const W = VR.WEAPONS.pistola, [x, y] = at || this.muzzle(player), a = at ? at[2] : this.aim + (this.rnd() - 0.5) * 0.04;
    this.shots.push({ x, y, px: x, py: y, vx: Math.sin(a) * W.speed, vy: -Math.cos(a) * W.speed, left: W.range, rem: !!at });
    if (at) { this.remote = true; VR.audio.shot(x, y); this.scare(x, y, 170, 'shots'); this.remote = false; return; }
    this.remote = false;
    if (VR.onlineEv) VR.onlineEv({ e: 'shot', x: Math.round(x), y: Math.round(y), a: +a.toFixed(3) });
    this.flash = 0.06; VR.audio.shot(x, y); if (VR.input.buzz) VR.input.buzz(12);
    this.scare(x, y, 170, 'shots');
    this.crime('disparo', x, y);
  }
  updateShots(dt) {
    const W = VR.WEAPONS.pistola;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]; s.px = s.x; s.py = s.y; this.remote = s.rem;
      const steps = 4, sx = s.vx * dt / steps, sy = s.vy * dt / steps;
      let gone = false;
      for (let k = 0; k < steps && !gone; k++) {
        s.x += sx; s.y += sy; s.left -= Math.hypot(sx, sy);
        if (s.left <= 0) { gone = true; break; }
        const c = this.world.boxAt(s.x, s.y, null);
        if (c && !c.driven) { this.hitCar(c, W.carDmg, s.vx, s.vy); this.spark(s.x, s.y); gone = true; break; }
        if (this.peds) for (const p of this.peds.list) if (p.mode !== 'down' && Math.abs(p.x - s.x) < 5 && s.y > p.y - 26 && s.y < p.y + 2) { this.hurtPed(p, s.vx, s.vy, 'shot'); gone = true; break; }
        if (!gone && this.world.hits(s.x - 1, s.y - 1, s.x + 1, s.y + 1)) { this.spark(s.x, s.y); gone = true; }
      }
      if (gone) this.shots.splice(i, 1);
    }
  }
  spark(x, y) { if (!this.emer) return; for (let i = 0; i < 4; i++) { const a = this.rnd() * Math.PI * 2; this.emer.fx.push({ k: 'fire', x, y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.15, max: 0.3, r: 1.2 }); } }

  // ---------- lanzallamas ----------
  flame(dt, player, at) {
    const W = VR.WEAPONS.lanzallamas, [x, y] = at || this.muzzle(player), a = at ? at[2] : this.aim;
    this.remote = !!at; if (!at && VR.onlineEv) VR.onlineEv({ e: 'fl', x: Math.round(x), y: Math.round(y), a: +a.toFixed(3) }, 0.1);
    if (this.emer) for (let i = 0; i < 3; i++) {
      const aa = a + (this.rnd() - 0.5) * W.cone, sp = 170 + this.rnd() * 90;
      this.emer.fx.push({ k: 'fire', x, y, vx: Math.sin(aa) * sp, vy: -Math.cos(aa) * sp, life: 0.42, max: 0.5, r: 2 + this.rnd() * 3 });
    }
    if (this.night) this.night.add(x + Math.sin(a) * 30, y - Math.cos(a) * 30, 60, '255,150,50', 0.9);
    const inCone = (px, py, extra = 0) => { const d = Math.hypot(px - x, py - y); if (d > W.range + extra) return false; let da = Math.atan2(px - x, -(py - y)) - a; da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da))); return da < W.cone * 0.75 || d < 10 + extra; };
    if (this.peds) for (const p of this.peds.list) if (p.mode !== 'down' && inCone(p.x, p.y - 10)) this.hurtPed(p, Math.sin(a) * 60, -Math.cos(a) * 60, 'fire');
    for (const c of this.world.carsIn(x - W.range - 20, y - W.range - 20, x + W.range + 20, y + W.range + 20, [])) if (!c.wreck && !c.driven && inCone(c.x, c.y, Math.min(c.LEN, c.WID) / 2)) this.hitCar(c, W.carDmg * dt, 0, 0, true);
    if (this.rnd() < dt * 3) this.world.mark(x + Math.sin(a) * W.range * 0.6, y - Math.cos(a) * W.range * 0.6, 'rgba(30,24,20,.5)');
    this.scare(x, y, 140, 'fire');
    this.crime('fuego', x, y);
  }

  // ---------- efectos sobre la gente y los vehículos ----------
  hurtPed(p, vx, vy, how) {
    p.mode = 'down'; p.vx = vx * 0.25; p.vy = vy * 0.25; p.injured = true; p.t = 40; p.say = null;
    VR.audio.ouch(p.x, p.y);
    if (how === 'fire' && this.emer) for (let i = 0; i < 6; i++) this.emer.fx.push({ k: 'smoke', x: p.x + (this.rnd() - 0.5) * 10, y: p.y - 6, vx: (this.rnd() - 0.5) * 10, vy: -18, life: 1.4, max: 1.4, r: 3 + this.rnd() * 2 });
    if (this.emer) this.emer.dispatch('ambulancia', p);
  }
  hitCar(c, dmg, vx, vy, burn) {
    if (c.spec.noFire) { if (!c.horseT || c.horseT < this.t) { c.horseT = this.t + 2; if (this.peds) { c.honkT = 1.4; c.honkTxt = '¡Hiiii!'; } } return; } // el caballo se asusta, pero no se prende
    c.hp = (c.hp ?? 100) - dmg * (c.unit ? 0.6 : 1); if (!this.remote) { c.byPlayer = true; c.hitByPlayer = this.emer ? this.emer.t : 0; }
    if (vx || vy) { if (c.vx === undefined) { c.vx = 0; c.vy = 0; c.w = 0; } c.vx += vx * 0.02 / (c.mass || 1); c.vy += vy * 0.02 / (c.mass || 1); this.world.wake(c, 30); }
    if (c.hp <= 0 && !c.burning && this.emer) this.emer.ignite(c);
    else if (burn && c.hp < 30 && !c.burning && this.emer) this.emer.ignite(c);
    if (c.spec && c.spec.emer === 'policia') this.crime('ataque_policia', c.x, c.y, true);
  }
  scare(x, y, r, kind) {
    if (!this.peds || (this.scareT || 0) > this.t) return; this.scareT = this.t + 0.3;
    this.peds.scatter(x, y, r * 1.3);
    for (const p of this.peds.list) {
      if (p.mode === 'down' || p.mode === 'flee' && p.t > 0.5) continue;
      if (Math.hypot(p.x - x, p.y - y) > r) continue;
      p.mode = 'flee'; p.t = 3 + this.rnd() * 2; this.peds.awayFrom(p, { x, y });
      if (!p.say && this.rnd() < 0.35) this.peds.talk(p, kind, 1.6);
    }
  }
  crime(kind, x, y, sure) { if (this.remote) return; if (!this.noStars && this.emer) this.emer.crime(kind, VR.WEAPONS[this.cur].stars, x, y, sure); }

  // ---------- dibujo ----------
  // el arma en la mano (se dibuja encima del personaje)
  drawHeld(ctx, player, cx, cy, al) {
    if (!this.enabled) return;
    const firing = VR.input.down('fire'), a = firing ? this.aim : ({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 })[player.dir];
    if (player.dir === 'up' && !firing) return; // de espaldas no se ve
    const px0 = VR.lerp(player.px, player.x, al) - cx, py0 = VR.lerp(player.py, player.y, al) - cy, PS = VR.PS || 1;
    const hnd = player._img && player._img.hand; // la mano sale del propio sprite (brazo levantado), así el arma siempre sale de SU brazo
    const [hx, hy] = hnd ? [px0 - 8 * PS + hnd[0] * PS, py0 - 31 * PS + hnd[1] * PS] : this.hand(px0, py0, a);
    const wpn = () => {
      ctx.save(); ctx.translate(hx, hy); ctx.scale(1, 0.75); ctx.rotate(a); // el largo hacia arriba o abajo se ve acortado (vista 3/4)
      if (this.cur === 'pistola') {
        ctx.fillStyle = '#0c0c10'; ctx.fillRect(-1.5, -8, 3, 9.5);                                          // contorno
        ctx.fillStyle = '#34343c'; ctx.fillRect(-1, -7.5, 2, 5.5); ctx.fillStyle = '#7a7a86'; ctx.fillRect(-1, -7.5, 0.6, 5); // corredera con brillo
        ctx.fillStyle = '#9a9aa6'; ctx.fillRect(-0.3, -8.2, 0.6, 0.9);                                       // mira
        ctx.fillStyle = '#22222a'; ctx.fillRect(-1, -2, 2, 1.2);                                              // cuerpo
        ctx.fillStyle = '#4a3020'; ctx.fillRect(-1, -0.8, 2, 2.6); ctx.fillStyle = '#6a4630'; ctx.fillRect(-1, -0.8, 0.6, 2.4); // cacha de madera
        ctx.fillStyle = '#0c0c10'; ctx.fillRect(-1.6, -1.2, 0.6, 1.6);                                       // guardamonte
      } else {
        ctx.fillStyle = '#0c0c10'; ctx.fillRect(-2, -13, 4, 14.5);
        ctx.fillStyle = '#3a3a42'; ctx.fillRect(-1.5, -12.5, 3, 12.5); ctx.fillStyle = '#6a6a74'; ctx.fillRect(-1.5, -12.5, 0.9, 11.5);
        ctx.fillStyle = '#b8b4a8'; ctx.fillRect(-1.2, -13, 2.4, 1.6); ctx.fillStyle = '#e8a030'; ctx.fillRect(-0.5, -13.4, 1, 0.8); // boquilla y piloto
        ctx.fillStyle = '#15151a'; ctx.fillRect(-1.5, -7, 3, 0.7); ctx.fillRect(-1.5, -4.5, 3, 0.7);        // abrazaderas
        ctx.fillStyle = '#7a1a12'; ctx.fillRect(-3, -1.5, 6, 4.2); ctx.fillStyle = '#c23a28'; ctx.fillRect(-2.5, -1, 5, 3.2); ctx.fillStyle = '#e8584a'; ctx.fillRect(-2.5, -1, 1.5, 3.2); // tanque
        ctx.fillStyle = '#2a2a30'; ctx.fillRect(-0.6, -2.4, 1.2, 1);                                         // válvula
      }
      ctx.restore();
    };
    wpn();
    if (this.flash > 0 && this.cur === 'pistola') {
      const [mx, my] = this.muzzle({ x: VR.lerp(player.px, player.x, al), y: VR.lerp(player.py, player.y, al) });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(mx - cx, my - cy, 0, mx - cx, my - cy, 6);
      g.addColorStop(0, 'rgba(255,250,200,1)'); g.addColorStop(1, 'rgba(255,160,40,0)'); ctx.fillStyle = g; ctx.fillRect(mx - cx - 6, my - cy - 6, 12, 12); ctx.restore();
      if (this.night) this.night.add(mx, my, 40, '255,220,140', 0.9);
    }
  }
  drawShots(ctx, cx, cy, al) {
    if (!this.shots.length) return;
    ctx.save(); ctx.strokeStyle = 'rgba(255,236,160,.95)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (const s of this.shots) { const x = VR.lerp(s.px, s.x, al) - cx, y = VR.lerp(s.py, s.y, al) - cy; ctx.beginPath(); ctx.moveTo(x - s.vx * 0.012, y - s.vy * 0.012); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.restore();
  }
};
