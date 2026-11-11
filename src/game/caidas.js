// Caídas y choques (12/11/2026, pedido de Leandro):
// - Las motos del tránsito que chocan fuerte (o atropellan a alguien rápido) se caen: la moto queda tirada de costado y el
//   conductor sale despedido (ragdoll), se levanta y te reta. Si no fue grave levanta su moto y sigue; si fue grave
//   se va caminando y la moto queda ahí un rato.
// - Los autos del tránsito que atropellan a alguien frenan, tocan bocina y el conductor protesta.
// - Los golpes dejan abolladuras en los vehículos (se acumulan; con mucho daño sigue el humo y el fuego de emerg.js).
'use strict';
(() => {
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
  const RETOS = ['¡Fijate por dónde andás, loco!', '¡Mba\'e piko, casi me matás!', '¡Qué hacés, bestia!', '¡Aprendé a manejar, che!', '¡Mirá lo que hiciste con mi moto!'];
  const BOCINA = ['¡Pero fijate, che!', '¡Se cruzó de golpe!', '¡Ay, no, no, no!', '¡Mirá por dónde caminás!'];

  // abolladura en el vehículo: posición local (derecha / adelante) respecto de su centro
  VR.addDent = (c, wx, wy, imp) => {
    if (!c.spec || c.spec.noFire) return; const D = c.dents || (c.dents = []);
    const a = c.a, dx = wx - c.x, dy = wy - c.y, lr = dx * Math.cos(a) + dy * Math.sin(a), lf = dx * Math.sin(a) - dy * Math.cos(a);
    const hl = c.LEN / 2, hw = c.WID / 2;
    D.push({ x: Math.max(-hw, Math.min(hw, lr)), y: -Math.max(-hl, Math.min(hl, lf)), s: Math.min(4.5, 1.6 + imp / 90), k: (Math.random() * 3) | 0 });
    if (D.length > 10) D.shift();
  };
  VR.drawDents = (ctx, c, x, y, a) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    for (const d of c.dents) {
      ctx.fillStyle = 'rgba(28,24,22,.5)'; ctx.fillRect(Math.round(d.x - d.s / 2), Math.round(d.y - d.s / 2), Math.round(d.s), Math.max(1, Math.round(d.s * 0.7)));
      ctx.fillStyle = 'rgba(230,224,210,.55)'; ctx.fillRect(Math.round(d.x - d.s / 2), Math.round(d.y - d.s / 2) - 1, Math.max(1, Math.round(d.s * 0.6)), 1);   // raspón claro (pintura levantada)
      if (d.k === 1) { ctx.fillStyle = 'rgba(120,70,40,.55)'; ctx.fillRect(Math.round(d.x + d.s / 2), Math.round(d.y), 1, 2); }   // óxido
    }
    ctx.restore();
  };

  VR.Caidas = class {
    constructor(world, traffic, peds) { this.world = world; this.traffic = traffic; this.peds = peds; this.riders = []; this.shouts = []; this.t = 0; }
    shout(c, text, secs = 2.2) { this.shouts.push({ c, text, t: secs }); }
    // la moto se cae y el conductor sale despedido
    motoDown(c, imp, v0) {
      if (c.fallen || !c.rider || c.type !== 'moto') return;
      const side = Math.random() < 0.5 ? -1 : 1, f = [Math.sin(c.a), -Math.cos(c.a)], vx = (c.vx || 0), vy = (c.vy || 0);
      const R = c.rider, L = R.L || null;
      c.fallen = { t: 0, side }; c._rider = R; c.rider = null; c.hp = (c.hp ?? 100) - imp * 0.1; c.hit = 0.3;
      if (c.ai) c.ai.stun = 1e6;
      if (!c.ai) this.world.wake(c, imp);
      c.vx = vx * 0.55; c.vy = vy * 0.55; c.w = side * 1.5;
      VR.audio && VR.audio.crash && VR.audio.crash(c.x, c.y, Math.min(300, imp));
      const sp = Math.hypot(vx, vy), rag = new VR.Ragdoll(vx * 0.9 + f[0] * 30, vy * 0.9 + f[1] * 30, Math.min(1, sp / 170 + 0.2), 'down');
      const spr = L ? VR.av2Lazy(L) : null;
      if (!spr) { c.rider = R; c.fallen = null; if (c.ai) c.ai.stun = 0; return; }
      this.riders.push({ c, R, L, spr, x: c.x + f[0] * 6, y: c.y + f[1] * 6 + 4, px: c.x, py: c.y, rag, st: 'rag', t: 0, dir: 'down', anim: 0, minor: (c.hp ?? 100) > 45 && imp < 230, say: null });
    }
    // un vehículo del tránsito atropelló a alguien: frena, toca bocina y el conductor protesta (las motos a veces se caen)
    aiHit(o, victim, sp) {
      if (!o || !o.ai) return;
      o.ai.stun = Math.max(o.ai.stun || 0, 1.6); o.vx *= 0.35; o.vy *= 0.35;
      if (VR.audio && VR.audio.horn) VR.audio.horn(o.x, o.y, o.type === 'moto' ? 'moto' : 'car');
      if (o.type === 'moto' && sp > 70 && Math.random() < 0.5) { this.motoDown(o, 120 + sp, true); return; }
      if (!this.shouts.some((s) => s.c === o)) this.shout(o, pick(BOCINA));
    }
    update(dt, player) {
      this.t += dt;
      for (let i = this.shouts.length - 1; i >= 0; i--) { this.shouts[i].t -= dt; if (this.shouts[i].t <= 0) this.shouts.splice(i, 1); }
      for (let i = this.riders.length - 1; i >= 0; i--) {
        const r = this.riders[i], c = r.c; r.t += dt; r.px = r.x; r.py = r.y;
        if (c.fallen) c.fallen.t += dt;
        if (r.st === 'rag') {
          r.rag.step(dt, r, this.world);
          if (r.rag.landed && r.t > 1.4) r.rag.rise();
          if (r.rag.done) { r.st = 'angry'; r.t = 0; r.say = { text: pick(RETOS), t: 2.6 }; }
        } else if (r.st === 'angry') {
          if (r.say) { r.say.t -= dt; if (r.say.t <= 0) r.say = null; }
          const dx = player.x - r.x, dy = player.y - r.y; if (Math.hypot(dx, dy) < 220) r.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
          if (r.t > 2.6) { r.st = r.minor ? 'back' : 'leave'; r.t = 0; r.ax = Math.cos(Math.random() * 6.283); r.ay = Math.sin(Math.random() * 6.283); }
        } else if (r.st === 'back') {   // vuelve a su moto, la levanta y sigue
          const dx = c.x - r.x, dy = c.y - r.y, d = Math.hypot(dx, dy);
          if (d > 9) { r.x += dx / d * 32 * dt; r.y += dy / d * 32 * dt; r.anim += dt * 8; r.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); r.t = 0; }
          else if (r.t > 0.9) { c.fallen = null; c.rider = r._R || r.R; c.hit = 0.2; if (c.ai) c.ai.stun = 0.3; this.riders.splice(i, 1); VR.audio && VR.audio.crash && VR.audio.crash(c.x, c.y, 40); }
        } else if (r.st === 'leave') {   // si fue grave se va caminando; la moto queda un rato y después se retira del tránsito
          r.x += r.ax * 26 * dt; r.y += r.ay * 26 * dt; r.anim += dt * 8; r.dir = Math.abs(r.ax) > Math.abs(r.ay) ? (r.ax > 0 ? 'right' : 'left') : (r.ay > 0 ? 'down' : 'up');
          if (r.t > 6) { if (c.ai && this.traffic) this.traffic.release(c); this.riders.splice(i, 1); }
        }
        if (Math.hypot(r.x - player.x, r.y - player.y) > 1100) { if (c.ai && this.traffic) this.traffic.release(c); this.riders.splice(i, 1); }
      }
    }
    collect(camX, camY, sw, sh, al, out) {
      const PS = VR.PS, late = VR._late || (VR._late = []);
      for (const s of this.shouts) { const c = s.c, x = Math.round(c.x - camX), y = Math.round(c.y - camY); if (x < -30 || y < -30 || x > sw + 30 || y > sh + 30) continue; late.push({ bubble: { text: s.text, t: s.t }, px: c.x, x: c.x, py: c.y - 2, y: c.y - 2 }); }
      for (const r of this.riders) {
        const x = Math.round(VR.lerp(r.px, r.x, al) - camX), y = Math.round(VR.lerp(r.py, r.y, al) - camY);
        if (x < -30 || y < -40 || x > sw + 30 || y > sh + 20) continue;
        if (r.say) late.push({ bubble: r.say, px: x + camX, x: x + camX, py: y + camY + 6, y: y + camY + 6 });
        out.push({ sy: y + camY, draw: (g) => {
          if (r.st === 'rag') { r.rag.draw(g, r.spr, x, y); return; }
          g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y - 1, 5.5, 2.3, 0, 0, Math.PI * 2); g.fill();
          const moving = r.st === 'back' || r.st === 'leave', img = moving ? r.spr.get(r.dir, 'walk', Math.floor(r.anim) % 8) : r.spr.get(r.dir, 'idle', 0);
          g.drawImage(img, x - 8 * PS, y - 31 * PS, 16 * PS, 32 * PS);
        } });
      }
    }
  };
})();
