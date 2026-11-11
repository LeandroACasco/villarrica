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
    if (sp < 1) { this.vx = (Math.random() - 0.5) * 30; this.vy = (Math.random() - 0.5) * 30; }
  }
  step(dt, o, world) {
    this.t += dt;
    if (!this.landed) {
      this.z += this.vz * dt; this.vz -= 560 * dt;
      if (this.z <= 0) {
        this.z = 0;
        if (this.vz < -45 && this.bounces < 3) { this.vz *= -0.36; this.vx *= 0.7; this.vy *= 0.7; this.spin *= 0.6; this.bounces++; if (VR.audio && VR.audio.ouch && this.bounces === 1) VR.audio.ouch(o.x, o.y); }
        else { this.vz = 0; this.landed = true; }
      }
    }
    const nx = o.x + this.vx * dt, ny = o.y + this.vy * dt;
    const S = VR.TILE, blocked = (x, y) => world.solid(Math.floor((x - 3) / S), Math.floor((y - 3) / S)) || world.solid(Math.floor((x + 3) / S), Math.floor(y / S));   // solo paredes: el cuerpo vuela por encima de los autos
    if (!blocked(nx, ny)) { o.x = nx; o.y = ny; } else { this.vx *= -0.25; this.vy *= -0.25; }
    const k = Math.exp(-(this.z > 0 ? 0.5 : 4.2) * dt);
    this.vx *= k; this.vy *= k;
    if (this.landed) {
      // el giro se frena y el cuerpo se acomoda boca arriba o boca abajo
      this.spin *= Math.exp(-6 * dt);
      const turns = Math.round((this.rot - this.target) / (Math.PI * 2)), goal = this.target + turns * Math.PI * 2;
      this.rot += (goal - this.rot) * Math.min(1, 8 * dt) + this.spin * dt;
    } else this.rot += this.spin * dt;
  }
  // img: sprite de persona de frente a "dir"; (x, y): pies en pantalla
  draw(ctx, img, x, y) {
    const PS = VR.PS, C = 15 * PS, lie = Math.abs(Math.sin(this.rot));
    const lift = C * (1 - lie) + 3 * lie;                    // el centro del cuerpo baja al piso al acostarse
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y - 1, (5.5 + lie * 3) * (1 - Math.min(0.5, this.z / 120)), 2.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(x, Math.round(y - this.z - lift)); ctx.rotate(this.rot);
    ctx.drawImage(img, -8 * PS, -(31 * PS - C), 16 * PS, 32 * PS);
    ctx.restore();
  }
};
