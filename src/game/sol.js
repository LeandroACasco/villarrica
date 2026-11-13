// Sol y sombras según la hora (13/11/2026, pedido de Leandro). Este y oeste están fijos en el mapa (norte arriba):
// el sol sale por el este (las sombras caen hacia el oeste y son largas), al mediodía está casi arriba (Villarrica está
// al sur del trópico y en noviembre el sol pasa cerca del cénit, por el norte: sombras cortas hacia el sur) y se pone
// por el oeste (sombras largas hacia el este). `VR.sun` da la dirección (dx, dy), el largo relativo (len = 1/tan de la
// altura del sol), la fuerza (str, 0 de noche) y el tinte cálido del amanecer y el atardecer. Con ?sol=7.5 en la
// dirección se fuerza una hora para probar. Las sombras de árboles y edificios se arman en world.js (capa aparte).
VR.sun = {
  on: !/[?&]plano=sol|[?&]sinsol/.test(location.search), h: 12, dx: 0, dy: 1, len: 0.15, str: 1, tint: 0, key: '',
  force: (() => { const m = /[?&]sol=([\d.]+)/.exec(location.search); return m ? +m[1] : null; })(),
  RISE: 5.5, SET: 18.5,
  hourOf(mode) {
    if (this.force != null) return this.force;
    if (mode === 'noche') return 0;
    if (mode === 'juego') return VR.gameHour || 12;
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    return mode === 'dia' ? (h >= 7 && h <= 17.5 ? h : 15) : h;
  },
  update(mode) {
    const cm = VR.clima; if (cm && this.force == null && cm.mode === 'real' && cm.rise != null && cm.set != null) { this.RISE = cm.rise; this.SET = cm.set; } else { this.RISE = 5.5; this.SET = 18.5; }   // salida y puesta reales de hoy
    const h = this.h = this.hourOf(mode), t = (h - this.RISE) / (this.SET - this.RISE);
    const bump = (c, w) => Math.max(0, 1 - Math.abs(h - c) / w);
    this.tint = Math.max(bump(this.RISE + 0.6, 1.2), bump(this.SET - 0.5, 1.3)) * (VR.clima ? 1 - 0.6 * VR.clima.f.nube : 1);
    if (t <= 0 || t >= 1) { this.str = 0; this.len = 0; this.key = 'n'; return; }
    const th = Math.PI * t, elev = Math.max(0.1, 1.45 * Math.sin(th));
    const vx = -Math.cos(th), vy = 0.12 + Math.sin(th) * 0.88, n = Math.hypot(vx, vy) || 1;   // la sombra apunta al lado contrario del sol
    this.dx = vx / n; this.dy = vy / n;
    this.len = Math.min(3, 1 / Math.tan(elev));
    this.str = Math.min(1, Math.sin(th) * 7) * (cm ? 1 - 0.78 * cm.f.nube : 1);                 // se desvanece al ras del horizonte y con las nubes
    this.key = Math.round(this.dx * 12) + ',' + Math.round(this.dy * 12) + ',' + Math.round(this.len * 6);
  },
  // corrimiento (px) de la sombra de algo de altura h
  off(h, max = 40) { const L = Math.min(max, this.len * h); return [this.dx * L, this.dy * L]; },
  // sombra de una persona o animal: elipse estirada hacia donde cae (h = altura aprox. en px)
  blob(ctx, x, y, h, rx, ry, a) {
    if (!this.on) { ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.beginPath(); ctx.ellipse(x, y - 1, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); return; }
    if (this.str < 0.03) return;
    const L = Math.min(h * 1.1, this.len * h), cx = x + this.dx * L * 0.5, cy = y - 1 + this.dy * L * 0.5;
    ctx.fillStyle = 'rgba(0,0,0,' + (a * this.str).toFixed(3) + ')'; ctx.beginPath();
    ctx.ellipse(cx, cy, rx + L * 0.5, ry + 0.4, Math.atan2(this.dy, this.dx), 0, Math.PI * 2); ctx.fill();
  },
  // tinte cálido del amanecer y el atardecer (se multiplica sobre todo el cuadro)
  drawTint(ctx, sw, sh) {
    if (!this.on || this.tint < 0.02) return;
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(255,168,112,' + (0.34 * this.tint).toFixed(3) + ')'; ctx.fillRect(0, 0, sw, sh); ctx.restore();
  },
};
