// Chapería (19/11/2026, pedido de Leandro): los choques fuertes deforman el vehículo de verdad.
// Cada auto lleva `c.dmg` con el daño por zona (frente, atrás, costados) y el estado de las piezas:
//   parachoques (0 sano · 1 colgando · 2 perdido), capó (0 · 1 hundido · 2 abierto/doblado · 3 volado),
//   parabrisas y luneta (0 sano · 1 rajado · 2 telaraña · 3 reventado). Las piezas que se pierden quedan tiradas
//   en la calle un rato (VR.chap.debris) y se ven los vidrios saltando. Se dibuja encima del sprite del vehículo
//   (como las abolladuras de caidas.js), así no hace falta rehacer los 64 ángulos.
'use strict';
(() => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hex = (c) => { const col = c && c.spec && c.spec.colors && c.spec.colors[c.color]; const h = col ? (Array.isArray(col) ? col[0] : col) : null; return typeof h === 'string' && h[0] === '#' ? h : '#8a8a92'; };

  const D = VR.chap = { debris: [], glass: [] };

  // ¿se puede deformar? (no motos, ni el karumbe, ni camiones/colectivos grandes)
  const ok = (c) => c && c.spec && c.type !== 'moto' && !c.spec.noFire && !(c.spec.mass > 2) && !c.wreck;

  D.hit = (c, wx, wy, imp) => {
    if (!ok(c) || imp < 70) return;
    const m = c.dmg || (c.dmg = { f: 0, r: 0, s: 0, fb: 0, rb: 0, hood: 0, ws: 0, rw: 0, cf: 0, cr: 0, cl: 0, cd: 0, sl: 0, sd: 0, dl: 0, dd: 0 });
    const a = c.a, dx = wx - c.x, dy = wy - c.y;
    const lr = dx * Math.cos(a) + dy * Math.sin(a), lf = dx * Math.sin(a) - dy * Math.cos(a);   // derecha / adelante
    const hl = c.LEN / 2, nf = lf / hl, side = Math.abs(lr) / (c.WID / 2);
    const e = Math.min(260, imp);
    if (side > 0.85 && Math.abs(nf) < 0.75) {                    // golpe de costado: la chapa se hunde y la puerta se va
      m.s += e; const L = lr < 0;
      if (L) { m.cl = Math.min(1, m.cl + e / 260); m.sl += e; } else { m.cd = Math.min(1, m.cd + e / 260); m.sd += e; }
      const sa = L ? m.sl : m.sd, dk = L ? 'dl' : 'dd';
      if (sa > 130) m[dk] = Math.max(m[dk], 1);
      if (sa > 260 && imp > 120) D.loseDoor(c, L);
    } else if (nf > 0) {                                         // frente
      m.f += e; m.cf = Math.min(1, m.cf + e / 300);
      if (m.f > 120) m.fb = Math.max(m.fb, 1);
      if (m.f > 190 && Math.random() < 0.8) D.lose(c, 'fb');
      if (m.f > 150) m.hood = Math.max(m.hood, 1);
      if (m.f > 230) m.hood = Math.max(m.hood, 2);
      if (m.f > 330 && imp > 150) D.lose(c, 'hood');
      if (m.f > 95) m.ws = Math.max(m.ws, 1); if (m.f > 190) m.ws = Math.max(m.ws, 2); if (m.f > 300) m.ws = 3;
    } else {                                                     // atrás
      m.r += e; m.cr = Math.min(1, m.cr + e / 300);
      if (m.r > 120) m.rb = Math.max(m.rb, 1);
      if (m.r > 190 && Math.random() < 0.8) D.lose(c, 'rb');
      if (m.r > 100) m.rw = Math.max(m.rw, 1); if (m.r > 200) m.rw = Math.max(m.rw, 2); if (m.r > 310) m.rw = 3;
    }
    // todo choque fuerte raja algo de vidrio por la sacudida
    if (imp > 160 && m.ws < 1) m.ws = 1;
    if (imp > 120) D.shards(c, wx, wy, Math.min(14, 4 + imp / 30));
    if (imp > 170 && c.driven && VR.input && VR.input.buzz) VR.input.buzz(90);
    if (VR.audio && VR.audio.near) { const v = VR.audio.near(wx, wy) * Math.min(0.25, imp / 1000); if (v > 0.01) { VR.audio.noise(0.18, { vol: v, lp: 5200, hp: 1800 }); VR.audio.tone(1500 + Math.random() * 600, 0.05, { type: 'triangle', vol: v * 0.6, f2: 700 }); } }
  };

  // una pieza se suelta y queda en la calle
  D.lose = (c, what) => {
    const m = c.dmg; if (!m) return;
    const a = c.a, fw = what === 'rb' ? 1 : -1, hl = c.LEN / 2;
    const f = what === 'hood' ? 0.22 : 0.5, kind = what === 'hood' ? 'hood' : 'bumper';
    if (what === 'fb') { if (m.fb === 2) return; m.fb = 2; } else if (what === 'rb') { if (m.rb === 2) return; m.rb = 2; } else { if (m.hood === 3) return; m.hood = 3; }
    const sx = Math.sin(a) * (fw === 1 ? -1 : 1), sy = -Math.cos(a) * (fw === 1 ? -1 : 1);   // hacia adelante/atrás del auto
    const px = c.x + sx * hl * (what === 'hood' ? 0.55 : 0.95), py = c.y + sy * hl * (what === 'hood' ? 0.55 : 0.95);
    const sp = rnd(30, 90);
    D.debris.push({ k: kind, x: px, y: py, vx: (c.vx || 0) * 0.6 + sx * sp + rnd(-25, 25), vy: (c.vy || 0) * 0.6 + sy * sp + rnd(-25, 25),
      a: a + rnd(-0.6, 0.6), w: rnd(-5, 5), L: kind === 'hood' ? c.LEN * 0.36 : c.WID * 0.95, W: kind === 'hood' ? c.WID * 0.82 : 2.6, col: kind === 'hood' ? hex(c) : '#2a2a30', t: 0, life: 70 });
    if (D.debris.length > 36) D.debris.shift();
    if (VR.audio && VR.audio.near) { const v = VR.audio.near(px, py) * 0.18; if (v > 0.01) { VR.audio.tone(160, 0.2, { type: 'square', vol: v, f2: 70, lp: 1200 }); VR.audio.noise(0.3, { vol: v, lp: 1600 }); } }
  };

  // puerta que se suelta de costado
  D.loseDoor = (c, left) => {
    const m = c.dmg, k = left ? 'dl' : 'dd'; if (!m || m[k] === 2) return; m[k] = 2;
    const a = c.a, sg = left ? -1 : 1, rx = Math.cos(a) * sg, ry = Math.sin(a) * sg, fx = Math.sin(a), fy = -Math.cos(a), sp = rnd(35, 80);
    D.debris.push({ k: 'door', x: c.x + rx * c.WID * 0.55 + fx * c.LEN * 0.05, y: c.y + ry * c.WID * 0.55 + fy * c.LEN * 0.05, vx: (c.vx || 0) * 0.5 + rx * sp + rnd(-20, 20), vy: (c.vy || 0) * 0.5 + ry * sp + rnd(-20, 20),
      a: a + rnd(-0.5, 0.5), w: rnd(-4, 4), L: c.LEN * 0.3, W: 3, col: hex(c), t: 0, life: 70 });
    if (D.debris.length > 36) D.debris.shift();
    if (VR.audio && VR.audio.near) { const v = VR.audio.near(c.x, c.y) * 0.18; if (v > 0.01) { VR.audio.tone(130, 0.22, { type: 'square', vol: v, f2: 60, lp: 1000 }); VR.audio.noise(0.25, { vol: v, lp: 1400 }); } }
  };

  D.shards = (c, wx, wy, n) => {
    for (let i = 0; i < n; i++) D.glass.push({ x: wx + rnd(-3, 3), y: wy + rnd(-3, 3), vx: rnd(-70, 70) + (c.vx || 0) * 0.3, vy: rnd(-70, 70) + (c.vy || 0) * 0.3, t: 0, life: rnd(0.5, 1.1), rest: i % 3 === 0 ? 40 : 0 });
    if (D.glass.length > 160) D.glass.splice(0, D.glass.length - 160);
  };

  D.update = (dt) => {
    for (const d of D.debris) {
      d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.a += d.w * dt;
      const k = Math.exp(-3.2 * dt); d.vx *= k; d.vy *= k; d.w *= Math.exp(-2.5 * dt);
    }
    for (let i = D.debris.length - 1; i >= 0; i--) if (D.debris[i].t > D.debris[i].life) D.debris.splice(i, 1);
    for (const g of D.glass) { g.t += dt; g.x += g.vx * dt; g.y += g.vy * dt; const k = Math.exp(-4 * dt); g.vx *= k; g.vy *= k; }
    for (let i = D.glass.length - 1; i >= 0; i--) { const g = D.glass[i]; if (g.t > g.life && !(g.rest && g.t < g.rest)) D.glass.splice(i, 1); }
  };

  // piezas y vidrios en la calle (se llama junto con los efectos)
  D.draw = (ctx, cx, cy) => {
    for (const d of D.debris) {
      const x = Math.round(d.x - cx), y = Math.round(d.y - cy), fade = d.t > d.life - 6 ? Math.max(0, (d.life - d.t) / 6) : 1;
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(x, y); ctx.rotate(d.a);
      if (d.k === 'hood') {
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-d.W / 2 + 1.5, -d.L / 2 + 1.5, d.W, d.L);
        ctx.fillStyle = d.col; ctx.fillRect(-d.W / 2, -d.L / 2, d.W, d.L);
        ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(-d.W / 2, -d.L / 2, d.W, 1);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-d.W / 2 + 2, -d.L / 2 + 3, 1, d.L - 6); ctx.fillRect(d.W / 2 - 3, -d.L / 2 + 3, 1, d.L - 6);
      } else if (d.k === 'door') {
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-d.W / 2 + 1, -d.L / 2 + 1.5, d.W + 1, d.L);
        ctx.fillStyle = d.col; ctx.fillRect(-d.W / 2, -d.L / 2, d.W + 1, d.L); ctx.fillStyle = '#10141a'; ctx.fillRect(-d.W / 2 + 1, -d.L / 2 + 2, 1.5, d.L - 5);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-d.L / 2 + 1, -d.W / 2 + 1.5, d.L, d.W);
        ctx.fillStyle = d.col; ctx.fillRect(-d.L / 2, -d.W / 2, d.L, d.W);
        ctx.fillStyle = 'rgba(200,200,210,.45)'; ctx.fillRect(-d.L / 2, -d.W / 2, d.L, 0.8);
      }
      ctx.restore();
    }
    for (const g of D.glass) {
      const fl = g.rest && g.t > g.life ? 1 : 1 - g.t / g.life; ctx.globalAlpha = Math.max(0.15, fl);
      ctx.fillStyle = (Math.floor(g.t * 40) & 1) ? '#e6f4ff' : '#9cc4de'; ctx.fillRect(Math.round(g.x - cx), Math.round(g.y - cy), 1, 1);
    }
    ctx.globalAlpha = 1;
  };

  // grietas de vidrio: líneas que salen de un punto de impacto (determinista por vehículo)
  const crack = (ctx, x, y, w, h, lvl, seed) => {
    ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); ctx.clip();
    if (lvl >= 3) { ctx.fillStyle = 'rgba(20,24,30,.78)'; ctx.fillRect(x - w / 2, y - h / 2, w, h); }
    ctx.strokeStyle = 'rgba(236,244,252,.92)'; ctx.lineWidth = 0.6;
    const n = lvl === 1 ? 3 : lvl === 2 ? 7 : 10, cxx = x + Math.sin(seed * 9) * w * 0.15, cyy = y + Math.cos(seed * 7) * h * 0.15;
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2 + seed * 3, r = (lvl === 1 ? 0.5 : 0.9) * Math.max(w, h) * (0.6 + 0.4 * ((i * 7 + 3) % 5) / 4);
      ctx.moveTo(cxx, cyy); ctx.lineTo(cxx + Math.cos(an) * r * 0.55 + Math.sin(i * 5) * 0.8, cyy + Math.sin(an) * r * 0.55); ctx.lineTo(cxx + Math.cos(an) * r, cyy + Math.sin(an) * r * 0.9); }
    ctx.stroke();
    if (lvl >= 2) { ctx.beginPath(); for (let k = 1; k <= 2; k++) ctx.arc(cxx, cyy, k * Math.min(w, h) * 0.28, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  };

  // se dibuja con el contexto ya trasladado al centro y girado: adelante = -y
  D.drawOn = (ctx, c) => {
    const m = c.dmg; if (!m) return;
    const A = c._dmgA || 0, LF = c._dmgLift || 0;
    const low = (k, fn) => { ctx.save(); ctx.rotate(-A); ctx.translate(0, Math.round(LF * k)); ctx.rotate(A); fn(); ctx.restore(); };   // las piezas bajas (trompa, costados) quedan más abajo en pantalla que el techo
    const hl = c.LEN / 2, hw = c.WID / 2, seed = ((c.x * 13 + c.y * 7) % 10) / 10 || 0.37, col = hex(c);
    // chapa arrugada: manchas oscuras y brillos cortados en la trompa / cola / costados
    const crumple = (x0, y0, w, h, k, flip) => {
      if (k < 0.15) return; const n = 4 + Math.round(k * 10);
      for (let i = 0; i < n; i++) {
        const px = x0 + ((i * 37 + seed * 53) % 100) / 100 * w, py = y0 + ((i * 53 + seed * 29) % 100) / 100 * h, s = 1 + (i % 3);
        ctx.fillStyle = i % 2 ? 'rgba(20,16,14,.55)' : 'rgba(235,230,220,.45)'; ctx.fillRect(Math.round(px), Math.round(py), s, 1 + ((i + 1) % 2));
      }
      ctx.fillStyle = 'rgba(15,12,12,.4)'; ctx.fillRect(Math.round(x0 + 1), Math.round(flip ? y0 + h - 1.5 : y0), Math.round(w - 2), 1.5);   // borde hundido
    };
    low(0.15, () => {
      crumple(-hw + 1, -hl, c.WID - 2, hl * 0.42, m.cf, false);
      crumple(-hw + 1, hl - hl * 0.42, c.WID - 2, hl * 0.42, m.cr, true);
      if (m.cl > 0.15) crumple(-hw, -hl * 0.4, 2.5, hl * 0.8, m.cl, false);
      if (m.cd > 0.15) crumple(hw - 2.5, -hl * 0.4, 2.5, hl * 0.8, m.cd, false);
      // puertas: entreabiertas (hueco oscuro + puerta torcida) o ausentes (hueco hasta el interior)
      const door = (st, sg) => { if (!st) return; const x0 = sg < 0 ? -hw - 0.5 : hw - 2.2, y0 = -hl * 0.12, h = hl * 0.5;
        if (st === 1) { ctx.fillStyle = '#0c0d10'; ctx.fillRect(x0, y0, 2.7, h); ctx.save(); ctx.translate(sg < 0 ? -hw - 1 : hw + 1, y0 + h * 0.5); ctx.rotate(0.28 * sg); ctx.fillStyle = col; ctx.fillRect(-1, -h * 0.5, 2, h); ctx.restore(); }
        else { ctx.fillStyle = '#0c0d10'; ctx.fillRect(x0, y0, 2.7, h); ctx.fillStyle = '#2d2e36'; ctx.fillRect(x0 + (sg < 0 ? 1 : 0), y0 + 1, 1.6, h - 2); } };
      door(m.dl, -1); door(m.dd, 1);
    });
    // parabrisas y luneta (el parabrisas queda sobre la cabina, un poco adelante del medio)
    const wsY = -hl * 0.2, rwY = hl * 0.3, gw = c.WID * 0.72, gh = Math.max(3, hl * 0.2);
    if (m.ws) crack(ctx, 0, wsY, gw, gh, m.ws, seed);
    if (m.rw) crack(ctx, 0, rwY, gw, gh * 0.8, m.rw, seed + 0.5);
    // capó: hundido (arrugas), abierto (se levanta y se ve el motor oscuro) o volado (hueco con motor)
    const hy0 = -hl + 1.2, hh = hl * 0.4;
    if (m.hood === 1) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-hw + 1.5, hy0 + 1, c.WID - 3, hh * 0.5); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-hw + 2, hy0 + 1, c.WID - 4, 1); }
    else if (m.hood === 2) {   // medio levantado por el golpe: sombra del hueco y el capó torcido
      ctx.fillStyle = '#14120f'; ctx.fillRect(-hw + 1.5, hy0, c.WID - 3, hh * 0.7);
      ctx.save(); ctx.translate(0, hy0 + hh * 0.6); ctx.rotate(0.12); ctx.fillStyle = col; ctx.fillRect(-hw + 1, -hh * 0.45, c.WID - 3, hh * 0.45); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-hw + 1, -1, c.WID - 3, 1); ctx.restore();
    } else if (m.hood === 3) {
      ctx.fillStyle = '#16140f'; ctx.fillRect(-hw + 1.5, hy0, c.WID - 3, hh); ctx.fillStyle = '#5b5a60'; ctx.fillRect(-hw + 3.5, hy0 + 2, c.WID - 7, 2); ctx.fillStyle = '#3a3a40'; ctx.fillRect(-2, hy0 + hh * 0.4, 4, 3);
    }
    // parachoques: colgando (torcido, de un lado) o perdido (se ve la chapa pelada)
    const bum = (yy, st, dir) => {
      if (!st) return;
      if (st === 1) { ctx.save(); ctx.translate(dir * 0, yy); ctx.rotate(0.22 * dir * (seed > 0.5 ? 1 : -1)); ctx.fillStyle = '#2a2a30'; ctx.fillRect(-hw, -1, c.WID, 2.2); ctx.fillStyle = 'rgba(200,200,210,.4)'; ctx.fillRect(-hw, -1, c.WID, 0.7); ctx.restore(); }
      else { ctx.fillStyle = '#17151a'; ctx.fillRect(-hw + 1, yy - 1.5, c.WID - 2, 2.2); }
    };
    low(0.3, () => { bum(-hl + 0.6, m.fb, -1); bum(hl - 0.6, m.rb, 1); });
  };

  VR.drawDmg = D.drawOn;
  // reparado en el taller: vuelve todo a la normalidad
  VR.repairDmg = (c) => { c.dmg = null; c.dents = null; };
})();
