// Ragdoll simple (12/11/2026): cuando un auto o una moto golpea a una persona, el cuerpo sale despedido
// (altura z + gravedad), gira sobre sí mismo, rebota un par de veces, patina por el piso y queda tendido.
// Lo usan los peatones (peds.js) y el jugador (player.js). Trabaja sobre cualquier objeto con x, y.
VR.Ragdoll = class {
  constructor(vx, vy, power, dir) {
    const sp = Math.hypot(vx, vy);
    this.power = Math.min(1, Math.max(0.15, power));
    this.vx = vx * 0.85; this.vy = vy * 0.85;
    this.z = 0; this.vz = 70 + this.power * 150;
    this.rot = 0; this.spin = (Math.random() < 0.5 ? -1 : 1) * (5 + this.power * 12);
    this.target = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;   // cómo queda tendido
    this.bounces = 0; this.landed = false; this.t = 0; this.dir = dir || 'down';
    this.rt = -1; this.done = false; this.dust = []; this.sparks = [];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283 + Math.random(); this.sparks.push([Math.cos(a), Math.sin(a)]); }   // chispas del golpe
    if (sp < 1) { this.vx = (Math.random() - 0.5) * 30; this.vy = (Math.random() - 0.5) * 30; }
    this.shakes = false;   // el jugador lo prende en player.knock: sacude la cámara solo cuando el golpe es tuyo
  }
  puff(n) { for (let i = 0; i < n; i++) this.dust.push({ dx: (Math.random() - 0.5) * 8, dy: Math.random() * 3 - 1, vx: (Math.random() - 0.5) * 26, vy: -Math.random() * 14 - 4, t: 0 }); }
  // levantarse: el cuerpo se endereza en medio segundo
  rise() { if (this.rt < 0 && this.landed) { this.rt = 0; this.rot0 = this.rot; } }
  step(dt, o, world) {
    this.t += dt;
    for (const d of this.dust) { d.t += dt; d.dx += d.vx * dt; d.dy += d.vy * dt; d.vx *= 0.9; }
    if (this.dust.length && this.dust[0].t > 0.5) this.dust.shift();
    if (this.rt >= 0) { this.rt += dt; if (this.rt >= 0.5) this.done = true; }
    if (!this.landed) {
      this.z += this.vz * dt; this.vz -= 560 * dt;
      if (this.z <= 0) {
        this.z = 0;
        if (this.vz < -45 && this.bounces < 3) { this.vz *= -0.36; this.vx *= 0.7; this.vy *= 0.7; this.spin *= 0.6; this.bounces++; this.puff(4); if (VR.audio && VR.audio.ouch && this.bounces === 1) VR.audio.ouch(o.x, o.y); if (this.shakes && this.bounces === 1 && VR.shake) VR.shake(0.2, 3); }
        else { this.vz = 0; this.landed = true; this.puff(5); }
      }
    }
    const S = VR.TILE, blocked = (x, y) => world.solid(Math.floor((x - 3) / S), Math.floor((y - 3) / S)) || world.solid(Math.floor((x + 3) / S), Math.floor(y / S));   // solo paredes: el cuerpo vuela por encima de los autos
    const nx = o.x + this.vx * dt, ny = o.y + this.vy * dt;
    if (!blocked(nx, ny)) { o.x = nx; o.y = ny; } else { this.vx *= -0.25; this.vy *= -0.25; }
    const k = Math.exp(-(this.z > 0 ? 0.5 : 4.2) * dt);
    this.vx *= k; this.vy *= k;
    if (this.rt >= 0) {   // levantándose: gira hasta quedar de pie (con un pequeño rebote al final)
      const u = Math.min(1, this.rt / 0.5), e = 1 - Math.pow(1 - u, 3), turns = Math.round(this.rot0 / (Math.PI * 2));
      this.rot = this.rot0 + (turns * Math.PI * 2 - this.rot0) * e;
    } else if (this.landed) {
      // el giro se frena y el cuerpo se acomoda boca arriba o boca abajo, con un temblor que se apaga
      this.spin *= Math.exp(-6 * dt);
      const turns = Math.round((this.rot - this.target) / (Math.PI * 2)), goal = this.target + turns * Math.PI * 2;
      this.rot += (goal - this.rot) * Math.min(1, 8 * dt) + this.spin * dt + Math.sin(this.t * 40) * 0.012 * Math.exp(-(this.t - 0.4) * 2) * (this.t > 0.4 ? 1 : 0);
    } else this.rot += this.spin * dt;
  }
  // spr: hoja de animaciones de la persona; (x, y): pies en pantalla
  draw(ctx, spr, x, y) {
    const PS = VR.PS, C = 15 * PS, lie = Math.abs(Math.sin(this.rot)), rising = this.rt >= 0;
    // en el aire mueve brazos y piernas (cuadros de correr); en el piso queda quieto
    const img = !this.landed ? spr.get(this.dir, 'run', Math.floor(this.t * 22) % 8) : spr.get(this.dir, 'idle', 0);
    const lift = C * (1 - lie) + 3 * lie;                    // el centro del cuerpo baja al piso al acostarse
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y - 1, (5.5 + lie * 3) * (1 - Math.min(0.5, this.z / 120)), 2.3, 0, 0, Math.PI * 2); ctx.fill();
    for (const d of this.dust) { const u = d.t / 0.5; ctx.fillStyle = 'rgba(200,184,150,' + (0.55 * (1 - u)).toFixed(2) + ')'; const r = 1.2 + u * 2.6; ctx.beginPath(); ctx.arc(x + d.dx, y + d.dy - 1, r, 0, 6.283); ctx.fill(); }
    ctx.save(); ctx.translate(x, Math.round(y - this.z - lift)); ctx.rotate(this.rot);
    ctx.drawImage(img, -8 * PS, -(31 * PS - C), 16 * PS, 32 * PS);
    ctx.restore();
    if (this.t < 0.35) { const u = this.t / 0.35, r = 4 + u * 12; ctx.fillStyle = 'rgba(255,240,150,' + (1 - u).toFixed(2) + ')'; for (const [cx, cy] of this.sparks) ctx.fillRect(Math.round(x + cx * r) - 1, Math.round(y - C + cy * r) - 1, 2, 2); }
  }
};
