// Chespis (14/11/2026, pedido de Leandro): personas que consumen drogas y viven la calle en los barrios humildes (nivel INE 1-2) y
// que también rondan los estacionamientos de los supermercados. Caminan por las veredas (no son NPC quietos), se te acercan y te piden
// plata «para su vicio». Si ayudás se van agradeciendo; si no tenés o los ignorás, algunos se ponen peligrosos y sacan un cuchillo:
// te persiguen, te cortan (te sacan vida) y te roban una parte de la plata. Nunca entran a los súper. No se muestra consumo ni se
// los trata como chiste: la idea es la calle como es, con jopara y con respeto. Todo el arte es propio (look del sistema de avatares).
'use strict';
VR.CHESPI_TALK = {
  beg: ['¿Me das una moneda, {hermano|hermana}? Estoy mal.', 'Disculpá… ¿tenés unos pesos? Para el vicio, no te miento.', '¿Me ayudás con algo? Estoy pasando un mal momento.', "Mba'éichapa… ¿me prestás unos guaraníes? Después te devuelvo.", 'Una moneda nomás, por favor.'],
  insist: ['Dale, una moneda nomás…', '¿No me vas a ayudar?', 'Por favor, estoy mal…'],
  knife: ['¡Dame la plata, ya!', '¡No te hagas el vivo, dame lo que tenés!', '¡Soltá la plata!'],
  thanks: ['¡Dios te bendiga!', 'Aguyje, {hermano|hermana}.', 'Gracias, que te vaya bien.'],
  no: ['Bueno… igual gracias.', 'Ni modo.', 'Está bien, perdón por molestar.'],
  hit: ['¡Ay!', '¡Mirá por dónde andás!', "¡Mba'e piko!"],
};
VR.Chespis = class {
  // o: { player, hurt(dx,dy,n), toast(m), menu(listaDeDialogo), anchors(): [{x,y}] (puertas de súper) }
  constructor(world, peds, o) {
    this.world = world; this.peds = peds; this.o = o; this.rnd = VR.rng(4242); this.list = []; this.sprites = [];
    const R = this.rnd;
    for (let i = 0; i < 8; i++) {                       // look descuidado: flaco, ropa gastada, chinelas, a veces gorro o gorra
      const L = VR.av2Nivel ? VR.av2Nivel(VR.av2Random(R), 1, R) : VR.av2Random(R);
      L.gender = 'm'; L.build = 'flaco'; L.top = 'remera'; L.topColor = [14, 10, 15, 11, 3][i % 5]; L.topColor2 = 14; L.bottom = 'jean'; L.bottomColor = [13, 14, 3][i % 3]; L.shoes = 'chinelas'; L.shoesColor = 1;
      L.hat = ['ninguno', 'gorro', 'gorra', 'ninguno'][i % 4]; L.hatColor = 3; L.beard = i % 2 ? 'no' : (L.beard && L.beard !== 'no' ? L.beard : 'no'); L.mochila = i % 3 === 0; L.packColor = 14; L.cadenita = false; L.reloj = false; L.lentes = false; L.anteojos = false; L.termo = false; L.print = false;
      if (['trenza', 'rodete', 'colitaLado', 'ondulado', 'colita', 'largo'].includes(L.hair)) L.hair = 'corto';
      this.sprites.push(VR.av2Lazy(L));
    }
    this.near_ = null; this.spawnT = 0;
  }
  say(p, k, t = 2.4) { const a = VR.CHESPI_TALK[k]; p.say = { text: a[(this.rnd() * a.length) | 0], t, max: t }; }
  nivel(x, y) { return this.world.nivelAt ? this.world.nivelAt(x, y) : 0; }
  newDir(p, avoid) {
    const P = this.peds, ds = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (let i = ds.length - 1; i > 0; i--) { const j = (this.rnd() * (i + 1)) | 0; [ds[i], ds[j]] = [ds[j], ds[i]]; }
    for (const [d, vx, vy] of ds) { if (d === avoid) continue; if (P.free(p.x + vx * 10, p.y + vy * 10)) { p.dir = d; p.vx = vx; p.vy = vy; p.t = 1.5 + this.rnd() * 3.5; return; } }
    p.vx = p.vy = 0; p.t = 0.6;
  }
  // camina hacia (tx,ty) a velocidad sp; deslizá en los obstáculos. Devuelve la distancia que falta.
  go(p, tx, ty, sp, dt) {
    const P = this.peds, dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy); if (d < 1) return 0;
    const vx = dx / d, vy = dy / d, nx = p.x + vx * sp * dt, ny = p.y + vy * sp * dt; P._road = true;
    if (P.free(nx, ny) && !this.world.hits(nx - 3, ny - 3, nx + 3, ny)) { p.x = nx; p.y = ny; }
    else if (P.free(nx, p.y) && !this.world.hits(nx - 3, p.y - 3, nx + 3, p.y)) p.x = nx;
    else if (P.free(p.x, ny) && !this.world.hits(p.x - 3, ny - 3, p.x, ny + 3)) p.y = ny;
    P._road = false; p.anim += dt * (sp > 50 ? 13 : 8); p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); return d;
  }
  spawn(focus, view, anchor) {
    for (let t = 0; t < 30; t++) {
      let x, y;
      if (anchor) { const a = this.rnd() * Math.PI * 2, d = 30 + this.rnd() * 55; x = anchor.x + Math.cos(a) * d; y = anchor.y + Math.sin(a) * d; }
      else { const a = this.rnd() * Math.PI * 2, d = 280 + this.rnd() * 360; x = focus.x + Math.cos(a) * d; y = focus.y + Math.sin(a) * d; if (this.nivel(x, y) < 1 || this.nivel(x, y) > 2) continue; }
      if (x > view.x0 - 20 && x < view.x1 + 20 && y > view.y0 - 30 && y < view.y1 + 30) continue;
      if (!this.peds.free(x, y)) continue;
      const p = { x, y, px: x, py: y, dir: 'down', vx: 0, vy: 0, anim: 0, mode: 'walk', t: 1, sp: 17 + this.rnd() * 9, pal: (this.rnd() * this.sprites.length) | 0, say: null, cool: 6 + this.rnd() * 14, risk: this.rnd() < 0.4, anchor: anchor || null, beg: 0, knifeT: 0 };
      this.newDir(p); this.list.push(p); return p;
    }
  }
  update(dt, focus, view, car) {
    const pl = this.o.player(), onFoot = !car, F = focus;
    // cuántos hay: en barrios humildes cerca tuyo y uno por cada súper cercano
    const nv = this.nivel(F.x, F.y), want = nv === 1 ? 3 : nv === 2 ? 2 : 0;
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 1.5;
      const wild = this.list.filter((p) => !p.anchor).length;
      if (wild < want && this.list.length < 6) this.spawn(F, view, null);
      for (const a of (this.o.anchors ? this.o.anchors() : [])) { if (Math.hypot(a.x - F.x, a.y - F.y) < 650 && !this.list.some((p) => p.anchor === a) && this.list.length < 6) this.spawn(F, view, a); }
    }
    for (let i = this.list.length - 1; i >= 0; i--) { const q = this.list[i]; if (Math.hypot(q.x - F.x, q.y - F.y) > 950 || (!q.anchor && q.mode === 'walk' && (nv < 1 || nv > 2) && Math.hypot(q.x - F.x, q.y - F.y) > 600)) this.list.splice(i, 1); }
    this.near_ = null;
    for (const p of this.list) {
      p.px = p.x; p.py = p.y; if (p.say) { p.say.t -= dt; if (p.say.t <= 0) p.say = null; } if (p.cool > 0) p.cool -= dt;
      const dx = pl.x - p.x, dy = pl.y - p.y, d = Math.hypot(dx, dy), vis = onFoot && !pl.rag;
      if (p.mode !== 'down') { const hit = this.peds.carHit(p); if (hit) { p.mode = 'down'; p.t = 2.4 + Math.min(1, hit.sp / 150); p.rag = new VR.Ragdoll(hit.vx, hit.vy, hit.sp / 160, p.dir || 'down'); if (VR.audio && VR.audio.ouch) VR.audio.ouch(p.x, p.y); continue; } }
      if (p.mode === 'down') {
        if (p.rag) p.rag.step(dt, p, this.world); p.t -= dt; if (p.t > 0) continue;
        if (p.rag && p.rag.landed) p.rag.rise(); if (!p.rag || p.rag.done) { p.rag = null; p.mode = 'leave'; p.t = 6; this.say(p, 'hit', 1.8); if (!this.peds.free(p.x, p.y)) this.peds.toWalkable(p); }
        continue;
      }
      if (p.mode === 'walk' || p.mode === 'idle') {
        if (vis && p.cool <= 0 && d < 150 && !(p.anchor && Math.hypot(p.x - p.anchor.x, p.y - p.anchor.y) > 140)) { p.mode = 'approach'; p.t = 14; continue; }
        if (p.mode === 'idle') { p.t -= dt; if (p.t <= 0) { p.mode = 'walk'; this.newDir(p); } p.anim = 0; continue; }
        const nx = p.x + p.vx * p.sp * dt, ny = p.y + p.vy * p.sp * dt, ahead = this.peds.free(p.x + p.vx * 8, p.y + p.vy * 8);
        if (p.anchor && Math.hypot(nx - p.anchor.x, ny - p.anchor.y) > 95) { this.go(p, p.anchor.x, p.anchor.y, p.sp, dt); p.t -= dt; if (p.t <= 0) { p.mode = this.rnd() < 0.5 ? 'idle' : 'walk'; p.t = 1.5 + this.rnd() * 3; if (p.mode === 'idle') p.vx = p.vy = 0; else this.newDir(p); } continue; }
        if (ahead && !this.world.hits(nx - 3, ny - 3, nx + 3, ny)) { p.x = nx; p.y = ny; p.anim += dt * 8; } else this.newDir(p, p.dir);
        p.t -= dt; if (p.t <= 0) { if (this.rnd() < 0.3) { p.mode = 'idle'; p.t = 1 + this.rnd() * 3; p.vx = p.vy = 0; } else this.newDir(p); }
      } else if (p.mode === 'approach') {
        if (!vis || d > 260) { p.mode = 'walk'; p.cool = 25; this.newDir(p); continue; }
        p.t -= dt; if (p.t <= 0) { p.mode = 'walk'; p.cool = 40; this.newDir(p); continue; }
        if (this.go(p, pl.x, pl.y + 2, 36, dt) < 30) { p.mode = 'beg'; p.t = 0; p.begT = 0; p.beg++; p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); this.say(p, 'beg', 3.4); }
      } else if (p.mode === 'beg') {
        p.anim = 0; p.begT += dt; p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        if (!vis || d > 70) { p.mode = 'walk'; p.cool = 45; this.newDir(p); continue; }
        if (d < 40 && !(this.o.busy && this.o.busy())) this.near_ = p;
        if (p.begT > 7 && !p.insisted) { p.insisted = true; this.say(p, 'insist', 2.6); }
        if (p.begT > 13) { if (p.risk) this.arm(p); else { p.mode = 'leave'; p.t = 8; this.say(p, 'no', 2); p.cool = 90; } }
      } else if (p.mode === 'knife') {
        p.knifeT += dt;
        if (!vis || d > 300 || p.knifeT > 22) { p.mode = 'walk'; p.cool = 60; p.armed = false; this.newDir(p); continue; }
        if (d > 15) this.go(p, pl.x, pl.y + 2, 58, dt);
        else if (!p.hurtDone) { p.hurtDone = true; const n = 7 + ((this.rnd() * 7) | 0); this.o.hurt(dx / (d || 1), dy / (d || 1), n); const w = VR.Wallet.get(), loot = Math.min(w, 10000 + ((this.rnd() * 25000) | 0)); if (loot > 0) VR.Wallet.add(-loot, 'Te robaron'); this.o.toast('🔪 Te cortaron y te sacaron ' + VR.fmtGs(loot)); p.mode = 'leave'; p.armed = false; p.t = 9; p.cool = 120; p.say = { text: '¡Ya está, ya está!', t: 1.6, max: 1.6 }; }
        if (p.say == null && this.rnd() < dt * 0.35) this.say(p, 'knife', 1.8);
      } else if (p.mode === 'leave') {
        p.t -= dt; const away = Math.atan2(p.y - pl.y, p.x - pl.x); this.go(p, p.x + Math.cos(away) * 80, p.y + Math.sin(away) * 80, 34, dt); if (p.t <= 0) { p.mode = 'walk'; this.newDir(p); }
      }
    }
  }
  arm(p) { p.mode = 'knife'; p.armed = true; p.knifeT = 0; p.hurtDone = false; this.say(p, 'knife', 2.2); this.o.toast('🔪 ¡Sacó un cuchillo! Alejate o corré'); }
  // el que te está pidiendo (al alcance de ACCIÓN) o null
  near(pl) { const p = this.near_; return p && p.mode === 'beg' && Math.hypot(p.x - pl.x, p.y - pl.y) < 44 ? p : null; }
  talk(p) {
    if (!p || p.mode !== 'beg') return;
    const D = (n) => ['Darle ' + VR.fmtGs(n), () => { if (VR.Wallet.get() < n) { this.o.toast('💸 No te alcanza'); return false; } VR.Wallet.add(-n, 'Ayuda a un chespi'); this.say(p, 'thanks', 2.4); p.mode = 'leave'; p.t = 8; p.cool = 150; this.o.toast('🪙 −' + VR.fmtGs(n)); return false; }];
    this.o.menu([{ quien: 'sis', titulo: '🪙 Un chespi', txt: '«' + (p.say ? p.say.text : VR.CHESPI_TALK.beg[0]) + '» Tenés ' + VR.fmtGs(VR.Wallet.get()) + '.', op: [
      D(2000), D(10000),
      ['No tengo, perdón', () => { if (p.risk && this.rnd() < 0.5) this.arm(p); else { this.say(p, 'no', 2.2); p.mode = 'leave'; p.t = 8; p.cool = 90; } return false; }],
      ['Ignorarlo', () => false]] }]);
  }
  collect(camX, camY, sw, sh, al, out) {
    for (const p of this.list) {
      const x = Math.round(VR.lerp(p.px, p.x, al) - camX), y = Math.round(VR.lerp(p.py, p.y, al) - camY);
      if (x < -20 || y < -36 || x > sw + 20 || y > sh + 20) continue;
      const S = this.sprites[p.pal];
      out.push({ sy: y + camY, draw: (ctx) => {
        const still = p.mode === 'beg' || p.mode === 'idle', pim = p.mode === 'down' ? null : (still ? S.get(p.dir, 'idle', 0) : S.get(p.dir, p.mode === 'knife' ? 'run' : 'walk', Math.floor(p.anim) % 8));
        if (pim) { VR.sun.blob(ctx, x, y, 3, 3.2 * VR.PS, 1.5 * VR.PS, 0.24); VR.sun.cast(ctx, pim, x, y + VR.PS, 16 * VR.PS, 32 * VR.PS, 0.28); } else VR.sun.blob(ctx, x, y, 30, 5.5, 2.3, 0.28);
        if (p.mode === 'down' && p.rag) p.rag.draw(ctx, S, x, y);
        else if (pim) {
          ctx.drawImage(pim, x - 8 * VR.PS, y - 31 * VR.PS, 16 * VR.PS, 32 * VR.PS);
          if (p.armed) { // cuchillo en la mano (la mano sale del propio sprite)
            const a = ({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 })[p.dir], h = pim.hand, PSv = VR.PS || 1, hx = h ? x - 8 * PSv + h[0] * PSv : x + 3, hy = h ? y - 31 * PSv + h[1] * PSv : y - 17;
            ctx.save(); ctx.translate(hx, hy); ctx.scale(1, 0.75); ctx.rotate(a); ctx.fillStyle = '#3a2a1c'; ctx.fillRect(-0.9, -0.4, 1.8, 3); ctx.fillStyle = '#d8dce2'; ctx.beginPath(); ctx.moveTo(-0.9, -0.4); ctx.lineTo(0.9, -0.4); ctx.lineTo(0.2, -6.2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-0.2, -5, 0.5, 4.4); ctx.restore();
          }
        }
        if (p.say) VR.Player.prototype.drawBubble.call({ bubble: p.say, px: x + camX, x: x + camX, py: y + camY + 6, y: y + camY + 6 }, ctx, camX, camY, 1);
      } });
    }
  }
};
