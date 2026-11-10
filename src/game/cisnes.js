// Cisnes de pedal de la laguna Ykua Pytã (10/11/2026). Se manejan pedaleando: cada pie es un pedal.
// Pedal izquierdo solo: el cisne gira a la derecha; derecho solo: a la izquierda; los dos juntos: derecho.
// Teclado: A/← pedal izquierdo, D/→ pedal derecho, W/↑ los dos, S/↓ marcha atrás. Táctil: dos botones de pedal
// (o el joystick: arriba = los dos, costados = uno). Solo navegan por el agua de la laguna (baldosas LAGUNA).
'use strict';
VR.Cisnes = class {
  constructor(world, night) {
    this.world = world; this.night = night; this.list = []; this.s = null; this.t = 0;
    const S = VR.TILE;
    for (const d of world.decals || []) if (d.kind === 'embarcadero')
      for (const [tx, ty, col, a] of d.cisnes || []) this.list.push({ x: tx * S, y: ty * S, a, col, hx: tx * S, hy: ty * S, ha: a, v: 0, w: 0, pL: 0, pR: 0, L: 0, R: 0, ph: 0, emptyT: 0, trail: [], tt: 0 });
  }
  get riding() { return !!this.s; }
  near(p) {
    let best = null, bd = 34;
    for (const s of this.list) { if (s === this.s) continue; const d = Math.hypot(s.x - p.x, s.y - (p.y - 4)); if (d < bd) { bd = d; best = s; } }
    return best;
  }
  board(s) { this.s = s; s.pas = VR.av2Random(); s.emptyT = 0; s.v *= 0.5; s.pL = s.pR = 0; }
  // baja al jugador en el lugar firme más cercano (orilla o muelle)
  exit(player) {
    const s = this.s, W = this.world;
    for (let r = 14; r <= 80; r += 5) for (let k = 0; k < 20; k++) {
      const an = k * Math.PI / 10 + (s.a || 0), x = s.x + Math.cos(an) * r, y = s.y + Math.sin(an) * r + 4;
      if (!W.hits(x - player.HW, y - player.HH, x + player.HW, y)) {
        player.x = player.px = x; player.y = player.py = y; this.s = null; s.v = 0; s.w = 0; return true;
      }
    }
    return false;
  }
  water(x, y) { return this.world.get(Math.floor(x / VR.TILE), Math.floor(y / VR.TILE)) === VR.T.LAGUNA; }
  free(x, y, a) {
    const fx = Math.sin(a), fy = -Math.cos(a), rx = Math.cos(a), ry = Math.sin(a);
    for (const [l, w] of [[0, 0], [11, 0], [-9, 0], [0, 6], [0, -6], [8, 4], [8, -4], [-7, 4], [-7, -4]])
      if (!this.water(x + fx * l + rx * w, y + fy * l + ry * w)) return false;
    return true;
  }
  update(dt, input) {
    this.t += dt;
    for (const s of this.list) {
      const mine = s === this.s;
      let L = 0, R = 0, back = 0;
      if (mine) {
        L = input.pl || input.down('pedL') ? 1 : 0; R = input.pr || input.down('pedR') ? 1 : 0;
        if (input.ay < -0.6) L = R = 1; else if (input.ay > 0.6) back = 1;
        // golpecito al apoyar cada pie (se siente el pedaleo)
        if (L && !s.pL) s.v += 3; if (R && !s.pR) s.v += 3;
        s.emptyT = 0;
      } else s.emptyT += dt;
      s.pL = L; s.pR = R; s.L = L; s.R = R;
      // sin nadie, vuelve despacio al muelle
      if (!mine && s.emptyT > 12 && Math.hypot(s.x - s.hx, s.y - s.hy) > 3) {
        const dx = s.hx - s.x, dy = s.hy - s.y, d = Math.hypot(dx, dy), sp = Math.min(12, d * 2) * dt;
        const nx = s.x + dx / d * sp, ny = s.y + dy / d * sp;
        if (this.free(nx, ny, s.a)) { s.x = nx; s.y = ny; }
        else { s.x += (s.hx - s.x) * Math.min(1, dt * 0.5); s.y += (s.hy - s.y) * Math.min(1, dt * 0.5); }
        let da = s.ha - s.a; da = Math.atan2(Math.sin(da), Math.cos(da)); s.a += da * Math.min(1, dt * 0.8);
        s.v = 0; s.w = 0;
        if (Math.hypot(s.x - s.hx, s.y - s.hy) <= 3) { s.x = s.hx; s.y = s.hy; s.a = s.ha; }
        continue;
      }
      // empuje: cada pie que pedalea suma; el agua frena
      s.v += ((L + R) * 15 - back * 9) * dt;
      s.v -= s.v * 0.9 * dt;
      if (s.v > 34) s.v = 34; if (s.v < -12) s.v = -12;
      const wt = (L - R) * 0.85 * (Math.abs(s.v) > 3 ? 1 : 0.55);
      s.w += (wt - s.w) * Math.min(1, dt * 5);
      if (!L && !R) s.w *= Math.exp(-2 * dt);
      const na = s.a + s.w * dt, fx = Math.sin(na), fy = -Math.cos(na), nx = s.x + fx * s.v * dt, ny = s.y + fy * s.v * dt;
      if (this.free(nx, ny, na)) { s.x = nx; s.y = ny; s.a = na; }
      else if (this.free(s.x, s.y, na)) { s.a = na; s.v *= -0.3; s.w *= -0.4; }          // choca de frente: rebota
      else if (this.free(nx, ny, s.a)) { s.x = nx; s.y = ny; s.w = 0; }
      else { s.v *= -0.3; s.w = 0; if (!this.free(s.x, s.y, s.a)) { s.x += (s.hx - s.x) * 0.05; s.y += (s.hy - s.y) * 0.05; } } // contra la orilla, el muelle o la plataforma
      s.ph += dt * (L ? 7 : 0.8) ; s.ph2 = (s.ph2 || 0) + dt * (R ? 7 : 0.8);
      // estela de ondas
      s.tt += dt; if (Math.abs(s.v) > 4 && s.tt > 0.16) { s.tt = 0; s.trail.push({ x: s.x - Math.sin(s.a) * 12, y: s.y + Math.cos(s.a) * 12, t: 0 }); }
      for (let i = s.trail.length - 1; i >= 0; i--) { s.trail[i].t += dt; if (s.trail[i].t > 1.8) s.trail.splice(i, 1); }
    }
  }
  // se dibujan sobre el agua, antes de la gente (no hay nada por encima de ellos salvo copas, que van aparte)
  draw(ctx, cx, cy, night, look) {
    for (const s of this.list) {
      if (s.x < cx - 60 || s.y < cy - 60 || s.x > cx + VR.screen.w + 60 || s.y > cy + VR.screen.h + 60) continue;
      ctx.save(); ctx.translate(-cx, -cy);
      for (const p of s.trail) { const k = p.t / 1.8; ctx.strokeStyle = `rgba(220,240,225,${0.5 * (1 - k)})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(p.x, p.y, 3 + k * 11, 2 + k * 7, 0, 0, 7); ctx.stroke(); }
      VR.drawCisne(ctx, s.x, s.y, s.a, s.col);
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
      if (s === this.s && look) { // dos personas sentadas con su personaje de verdad (como en las motos): conduce el jugador a la izquierda y acompaña otra a la derecha
        ctx.restore(); ctx.restore();
        const k = ((Math.round(s.a / (Math.PI * 2) * 64) % 64) + 64) % 64, fx = Math.sin(s.a), fy = -Math.cos(s.a), rx = Math.cos(s.a), ry = Math.sin(s.a);
        for (const [sd, L, on] of [[-1, look, s.L], [1, s.pas, s.R]]) {
          const R = VR.riderTopFrames(L, { gy: -3.2, gx: 2.4, hip: 2.6 }), rh = R.S >> 1, off = 3.1 * sd, ox = s.x + rx * off + fx * 1.5 - cx, oy = s.y + ry * off + fy * 1.5 - cy;
          ctx.drawImage(R.get(k), Math.round(ox - rh), Math.round(oy - rh) - 1 - (on ? ((Math.sin(sd < 0 ? s.ph : s.ph2 || 0) > 0) ? 1 : 0) : 0), R.S, R.S);
        }
        if (night) night.add(s.x, s.y - 4, 30, '255,226,160', 0.75);
        continue;
      }
      ctx.restore(); ctx.restore();
      if (night) night.add(s.x, s.y - 4, 30, '255,226,160', 0.75); // lucecita del cisne
    }
  }
};
