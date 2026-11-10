// Cisnes de pedal de la laguna Ykua Pytã (10/11/2026). Se manejan pedaleando: cada pie es un pedal.
// Pedal izquierdo solo: el cisne gira a la derecha; derecho solo: a la izquierda; los dos juntos: derecho.
// Teclado: A/← pedal izquierdo, D/→ pedal derecho, W/↑ los dos, S/↓ marcha atrás. Táctil: dos botones de pedal
// (o el joystick: arriba = los dos, costados = uno). Solo navegan por el agua de la laguna (baldosas LAGUNA).
// Paseo: subir cuesta 5.000 Gs. (main.js). Minijuego "Vuelta a la laguna": 6 boyas alrededor de la laguna; al pasar la
// boya 1 arranca el reloj, hay que pasarlas en orden y volver a la 1; el récord queda guardado en el teléfono.
// Online: quien va en un cisne manda [n.º de cisne, x, y, ángulo, pedales] y los demás ven ese cisne (con su personaje)
// en vez del suyo; un cisne ocupado por otro jugador no se puede tomar.
'use strict';
VR.CISNE_PRECIO = 5000;
VR.Cisnes = class {
  constructor(world, night) {
    this.world = world; this.night = night; this.list = []; this.s = null; this.t = 0; this.buoys = null; this.race = null; this.onMsg = null;
    const S = VR.TILE;
    for (const d of world.decals || []) if (d.kind === 'embarcadero')
      for (const [tx, ty, col, a] of d.cisnes || []) this.list.push({ x: tx * S, y: ty * S, a, col, hx: tx * S, hy: ty * S, ha: a, v: 0, w: 0, pL: 0, pR: 0, L: 0, R: 0, ph: 0, emptyT: 0, trail: [], tt: 0 });
    try { this.record = +localStorage.getItem('cisne:record') || 0; } catch (e) { this.record = 0; }
  }
  get riding() { return !!this.s; }
  near(p) {
    let best = null, bd = 34;
    for (const s of this.list) { if (s === this.s || s.netO) continue; const d = Math.hypot(s.x - p.x, s.y - (p.y - 4)); if (d < bd) { bd = d; best = s; } }
    return best;
  }
  board(s) {
    this.s = s; s.pas = s.pas || VR.av2Random(); s.emptyT = 0; s.v *= 0.5; s.pL = s.pR = 0;
    if (!this.buoys) this.buoys = this.makeBuoys();
    this.race = { i: 0, t: 0, on: false, away: true };
  }
  // baja al jugador en el lugar firme más cercano (orilla o muelle)
  exit(player) {
    const s = this.s, W = this.world;
    for (let r = 14; r <= 80; r += 5) for (let k = 0; k < 20; k++) {
      const an = k * Math.PI / 10 + (s.a || 0), x = s.x + Math.cos(an) * r, y = s.y + Math.sin(an) * r + 4;
      if (!W.hits(x - player.HW, y - player.HH, x + player.HW, y)) {
        player.x = player.px = x; player.y = player.py = y; this.s = null; this.race = null; s.v = 0; s.w = 0; return true;
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
  // 6 boyas en agua abierta alrededor del centro de la laguna; la 1 queda del lado del muelle, y se recorren en sentido antihorario
  makeBuoys() {
    const S = VR.TILE, h = this.list[0]; if (!h) return [];
    const tx0 = Math.floor(h.hx / S), ty0 = Math.floor(h.hy / S);
    let sx = 0, sy = 0, n = 0;
    for (let ty = ty0 - 70; ty <= ty0 + 70; ty++) for (let tx = tx0 - 70; tx <= tx0 + 70; tx++) if (this.world.get(tx, ty) === VR.T.LAGUNA) { sx += tx; sy += ty; n++; }
    if (!n) return [];
    const cx = (sx / n + 0.5) * S, cy = (sy / n + 0.5) * S, a0 = Math.atan2(h.hy - cy, h.hx - cx), out = [];
    const open = (x, y) => this.water(x, y) && [[22, 0], [-22, 0], [0, 22], [0, -22], [16, 16], [-16, 16], [16, -16], [-16, -16]].every(([dx, dy]) => this.water(x + dx, y + dy));
    for (let k = 0; k < 6; k++) { // por cada dirección: el agua abierta más lejana, y la boya a ~70 % de esa distancia (saltando la plataforma)
      const a = a0 - k * Math.PI / 3, rs = [];
      for (let r = 0; r < 900; r += 6) if (open(cx + Math.cos(a) * r, cy + Math.sin(a) * r)) rs.push(r);
      if (!rs.length) continue;
      const want = rs[rs.length - 1] * 0.7, r = rs.reduce((p, q) => (Math.abs(q - want) < Math.abs(p - want) ? q : p));
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (out.every((o) => Math.hypot(o.x - x, o.y - y) > 70)) out.push({ x, y });
    }
    return out;
  }
  // otros jugadores en cisnes (online): cada cisne ocupado por otro sigue lo que manda ese jugador
  netSync(others) {
    for (const s of this.list) s.netO = null;
    if (!others) return;
    const now = performance.now();
    for (const o of others.values()) {
      if (!o.sw || now - o.at > 1500) continue;
      const s = this.list[o.sw[0]]; if (!s || s === this.s) continue;
      s.netO = o;
    }
  }
  tone(f, d = 0.12, at = 0, vol = 0.06) { const A = VR.audio; if (A && A.on) A.tone(f, d, { type: 'triangle', vol, at }); }
  updRace(dt) {
    const R = this.race, B = this.buoys, s = this.s; if (!R || !B || B.length < 2) return;
    if (R.on) R.t += dt;
    const tgt = R.on ? B[R.i % B.length] : B[0], d = Math.hypot(s.x - tgt.x, s.y - tgt.y);
    if (!R.on) { // largada: pasar por la boya 1 (después de alejarse de ella)
      if (d > 40) R.away = true;
      if (d < 18 && R.away) { R.on = true; R.t = 0; R.i = 1; this.tone(660); this.tone(990, 0.16, 0.1); if (this.onMsg) this.onMsg('🦢 ¡Largaste! Pasá por la boya 2'); }
      return;
    }
    if (d < 18) {
      if (R.i === B.length) { // volvió a la 1: vuelta completa
        const t = R.t, best = !this.record || t < this.record;
        if (best) { this.record = t; try { localStorage.setItem('cisne:record', t.toFixed(2)); } catch (e) {} }
        this.tone(660); this.tone(880, 0.14, 0.12); this.tone(1320, 0.3, 0.26, 0.07);
        if (this.onMsg) this.onMsg('🏁 Vuelta en ' + this.fmt(t) + (best ? ' · ¡récord!' : ' · récord ' + this.fmt(this.record)));
        this.race = { i: 0, t: 0, on: false, away: false };
      } else { R.i++; this.tone(880); if (this.onMsg) this.onMsg('Boya ' + R.i + ' de ' + B.length + (R.i === B.length ? ' · ahora volvé a la 1' : '')); }
    }
  }
  fmt(t) { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); }
  update(dt, input) {
    this.t += dt;
    for (const s of this.list) {
      const mine = s === this.s;
      if (s.netO) { // lo maneja otro jugador: seguir lo que manda (con suavizado)
        const [, x, y, a, f] = s.netO.sw, k = Math.min(1, dt * 8), px = s.x, py = s.y;
        if (Math.hypot(x - s.x, y - s.y) > 80) { s.x = x; s.y = y; s.a = a; } else { s.x += (x - s.x) * k; s.y += (y - s.y) * k; s.a += Math.atan2(Math.sin(a - s.a), Math.cos(a - s.a)) * k; }
        s.v = Math.hypot(s.x - px, s.y - py) / Math.max(dt, 1e-3); s.L = f & 1; s.R = (f >> 1) & 1; s.emptyT = 0;
        s.ph += dt * (s.L ? 7 : 0.8); s.ph2 = (s.ph2 || 0) + dt * (s.R ? 7 : 0.8);
        s.tt += dt; if (s.v > 4 && s.tt > 0.16) { s.tt = 0; s.trail.push({ x: s.x - Math.sin(s.a) * 12, y: s.y + Math.cos(s.a) * 12, t: 0 }); }
        for (let i = s.trail.length - 1; i >= 0; i--) { s.trail[i].t += dt; if (s.trail[i].t > 1.8) s.trail.splice(i, 1); }
        continue;
      }
      let L = 0, R = 0, back = 0;
      if (s.auto && !mine) { const q = this.autoPedals(s, dt); L = q[0]; R = q[1]; s.emptyT = 0; if (s.ap.rev > 0) back = 1; } // pantalla de título: una pareja pasea sola
      else if (mine) {
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
    if (this.s) this.updRace(dt);
  }
  // Piloto automático del cisne del menú principal (10/11/2026): pedalea a golpes y, si el agua se acaba adelante,
  // gira con un solo pedal hasta tener lugar; de vez en cuando se tuerce un poquito. Devuelve [pedal izq., pedal der.].
  autoPedals(s, dt) {
    const A = s.ap || (s.ap = { phase: Math.random() * 3, turn: 0, wob: 0, wt: 3 }), fx = Math.sin(s.a), fy = -Math.cos(s.a);
    A.phase += dt;
    if (A.rev > 0) { A.rev -= dt; A.sx = s.x; A.sy = s.y; A.sa = s.a; A.st = 0; return [0, 0]; } // marcha atrás para salir del atasco
    if (!(this.free(s.x + fx * 38, s.y + fy * 38, s.a) && this.free(s.x + fx * 70, s.y + fy * 70, s.a))) { // orilla, muelle o plataforma adelante
      if (!A.turn) A.turn = A.last || (Math.random() < 0.5 ? 1 : -1);
      A.last = A.turn;
      if (A.sx === undefined || Math.hypot(s.x - A.sx, s.y - A.sy) > 3 || Math.abs(s.a - A.sa) > 0.15) { A.sx = s.x; A.sy = s.y; A.sa = s.a; A.st = 0; }
      else if ((A.st += dt) > 1.2) { A.last = A.turn = -A.turn; A.rev = 1.6; A.st = 0; } // trabado: invierte el giro y retrocede
      return A.turn > 0 ? [1, 0] : [0, 1];
    }
    A.turn = 0; A.wt -= dt;
    if (A.wt <= 0) { A.wob = Math.random() < 0.5 ? (Math.random() < 0.5 ? 1 : -1) : 0; A.wt = 2 + Math.random() * 4; }
    const c = A.phase % 3.2;
    if (A.wob && c < 0.7) return A.wob > 0 ? [1, 0] : [0, 1];
    return c < 1 ? [1, 1] : [0, 0];
  }
  // lo que se manda online cuando vas en un cisne
  netState() { const s = this.s; return s ? [this.list.indexOf(s), Math.round(s.x), Math.round(s.y), +s.a.toFixed(3), (s.L ? 1 : 0) | (s.R ? 2 : 0)] : undefined; }
  drawBuoys(ctx, cx, cy, night) {
    const B = this.buoys, R = this.race; if (!B || !R) return;
    const nxt = R.on ? R.i % B.length : 0, t = this.t;
    B.forEach((b, i) => {
      const x = b.x - cx, y = b.y - cy, on = i === nxt, bob = Math.sin(t * 2.4 + i) * 0.6, r = on ? 5.2 : 3.6;
      ctx.strokeStyle = 'rgba(220,240,225,.35)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(x, y + 1, r + 3 + Math.sin(t * 2 + i) * 0.8, (r + 3) * 0.5, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(10,20,10,.3)'; ctx.beginPath(); ctx.ellipse(x + 1.5, y + 1.5, r, r * 0.6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(x, y + bob, r + 0.7, (r + 0.7) * 0.7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = on ? '#ff7a1a' : '#e0703a'; ctx.beginPath(); ctx.ellipse(x, y + bob, r, r * 0.7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - r, y + bob - 0.7, r * 2, 1.4);
      ctx.font = 'bold ' + (on ? 8 : 6) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(0,0,0,.75)';
      const ty = y + bob - r - 3 - (on ? Math.abs(Math.sin(t * 4)) * 2 : 0); ctx.strokeText(String(i + 1), x, ty); ctx.fillStyle = on ? '#ffe28a' : '#ffffff'; ctx.fillText(String(i + 1), x, ty);
      if (night && on) night.add(b.x, b.y, 22, '255,170,80', 0.7);
    });
    // flechita alrededor del cisne hacia la próxima boya, y el reloj arriba
    const s = this.s, b = B[nxt], a = Math.atan2(b.y - s.y, b.x - s.x), d = Math.hypot(b.y - s.y, b.x - s.x);
    if (d > 40) { const ax = s.x - cx + Math.cos(a) * 26, ay = s.y - cy + Math.sin(a) * 26; ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax + Math.cos(a) * 5, ay + Math.sin(a) * 5); ctx.lineTo(ax + Math.cos(a + 2.4) * 4, ay + Math.sin(a + 2.4) * 4); ctx.lineTo(ax + Math.cos(a - 2.4) * 4, ay + Math.sin(a - 2.4) * 4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    const txt = R.on ? '⏱ ' + this.fmt(R.t) + ' · boya ' + (R.i + 1) + '/' + B.length : 'Pasá por la boya 1' + (this.record ? ' · récord ' + this.fmt(this.record) : '');
    const lbl = R.on && R.i === B.length ? '⏱ ' + this.fmt(R.t) + ' · volvé a la 1' : txt;
    ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(lbl, s.x - cx, s.y - cy + 27); ctx.fillStyle = '#ffe28a'; ctx.fillText(lbl, s.x - cx, s.y - cy + 27); // debajo del cisne (arriba van los globos)
  }
  // se dibujan sobre el agua, antes de la gente (no hay nada por encima de ellos salvo copas, que van aparte)
  draw(ctx, cx, cy, night, look) {
    if (this.s) this.drawBuoys(ctx, cx, cy, night);
    for (const s of this.list) {
      if (s.x < cx - 60 || s.y < cy - 60 || s.x > cx + VR.screen.w + 60 || s.y > cy + VR.screen.h + 60) continue;
      ctx.save(); ctx.translate(-cx, -cy);
      for (const p of s.trail) { const k = p.t / 1.8; ctx.strokeStyle = `rgba(220,240,225,${0.5 * (1 - k)})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(p.x, p.y, 3 + k * 11, 2 + k * 7, 0, 0, 7); ctx.stroke(); }
      VR.drawCisne(ctx, s.x, s.y, s.a, s.col);
      ctx.restore();
      const drv = s === this.s ? look : s.netO ? s.netO.look : s.auto ? s.autoLook : null;
      if (drv) { // dos personas sentadas con su personaje de verdad (como en las motos): conduce a la izquierda y acompaña otra a la derecha
        if (!s.pas) s.pas = VR.av2Random();
        const k = ((Math.round(s.a / (Math.PI * 2) * 64) % 64) + 64) % 64, fx = Math.sin(s.a), fy = -Math.cos(s.a), rx = Math.cos(s.a), ry = Math.sin(s.a);
        for (const [sd, L, on] of [[-1, drv, s.L], [1, s.pas, s.R]]) {
          const R = VR.riderTopFrames(L, { gy: -3.2, gx: 2.4, hip: 2.6 }), rh = R.S >> 1, off = 3.1 * sd, ox = s.x + rx * off + fx * 1.5 - cx, oy = s.y + ry * off + fy * 1.5 - cy;
          ctx.drawImage(R.get(k), Math.round(ox - rh), Math.round(oy - rh) - 1 - (on ? ((Math.sin(sd < 0 ? s.ph : s.ph2 || 0) > 0) ? 1 : 0) : 0), R.S, R.S);
        }
        if (s.netO) { // nombre del otro jugador
          const x = s.x - cx, y = s.y - cy - 22; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(s.netO.n, x, y); ctx.fillStyle = '#ffd84a'; ctx.fillText(s.netO.n, x, y);
        }
      }
      if (night) night.add(s.x, s.y - 4, 30, '255,226,160', 0.75); // lucecita del cisne
    }
  }
};
