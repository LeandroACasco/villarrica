// Gente de la calle (12/11/2026, pedido de Leandro): vendedores ambulantes y personas que piden en el Centro y los barrios.
// Todos adultos y tratados con respeto: se los dibuja con su ropa y sus cosas, sin burla. ACCIÓN al lado de uno:
//  · empanadero y heladero: comprás (5.000 / 3.000 Gs.) y te devuelve vida o saciás el hambre;
//  · artesano hippie (acento argentino) y artesana/o indígena: les comprás una pulsera o una artesanía;
//  · persona en situación de calle: le das una moneda (1.000 Gs.) y te agradece.
// Se generan cerca de la cámara en veredas y plazas (más en el Centro) y se borran al alejarte. Local de cada jugador.
'use strict';
(() => {
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
  const KINDS = {
    empanada: { label: '🥟 Comprar empanada · 5.000 Gs.', price: 5000, walk: true, stock: 4, heal: 12, hambre: 18,
      looks: [{ gender: 'm', skin: 2, hair: 'corto', hairColor: 1, top: 'camisaCorta', topColor: 1, bottom: 'jean', bottomColor: 1, shoes: 'zapatillas', shoesColor: 1, hat: 'gorra', hatColor: 3 }],
      lines: ['¡Empanada caliente, empanada!', '¡Hay de carne, de pollo y de queso!', '¡Empanadita, señora, bien caliente!'], buy: ['¡Aguyje, que aproveche!', 'Bien calentita, che.'], none: 'Se me acabaron las empanadas.' },
    helado: { label: '🍦 Comprar helado · 3.000 Gs.', price: 3000, walk: true, stock: 5, heal: 8, hambre: 8,
      looks: [{ gender: 'f', skin: 2, hair: 'colita', hairColor: 2, top: 'remera', topColor: 9, bottom: 'jean', bottomColor: 1, shoes: 'zapatillas', shoesColor: 1, hat: 'gorra', hatColor: 2 }],
      lines: ['¡Helado, helado bien frío!', '¡Refrescate con un heladito!', '¡Hay de dulce de leche y de frutilla!'], buy: ['¡Que lo disfrutes!', '¡Bien frío, eh!'], none: 'Ya no tengo helados.' },
    hippie: { label: '📿 Comprar una pulsera · 10.000 Gs.', price: 10000, stock: 3, manta: 'hippie', items: ['#d8463a', '#e8b830', '#3b9a5a', '#2e6fc8', '#e86aa0', '#f2efe6'],
      looks: [{ gender: 'm', skin: 1, build: 'flaco', hair: 'rulos', hairColor: 3, beard: 'barba', top: 'musculosa', topColor: 10, bottom: 'cargo', bottomColor: 11, shoes: 'chinelas', shoesColor: 1, hat: 'gorro', hatColor: 5, cadenita: true },
        { gender: 'f', skin: 0, hair: 'trenza', hairColor: 4, top: 'top', topColor: 8, bottom: 'pollera', bottomColor: 6, shoes: 'chinelas', shoesColor: 1, cadenita: true }],
      lines: ['¡Che, mirá qué lindas pulseras!', 'Todo artesanal, hermano, llevate una.', 'Dale, está re barata, mirá.', '¿Una pulserita, boludo? Hecha a mano.'], buy: ['¡Genial, gracias, hermano!', 'Buenísimo, que te dé buena onda.'], none: 'No me quedan más, che.' },
    indigena: { label: '🧺 Comprar artesanía · 15.000 Gs.', price: 15000, stock: 3, manta: 'tejida', items: ['#a8643a', '#7a4a24', '#c8322a', '#e8b830'],
      looks: [{ gender: 'f', skin: 4, hair: 'trenza', hairColor: 0, top: 'camisa', topColor: 0, bottom: 'pollera', bottomColor: 5, shoes: 'chinelas', shoesColor: 1, cadenita: true },
        { gender: 'm', skin: 4, hair: 'corto', hairColor: 0, top: 'camisaCorta', topColor: 5, bottom: 'bermuda', bottomColor: 3, shoes: 'chinelas', shoesColor: 1, hat: 'piri', hatColor: 4 }],
      lines: ['Artesanía, artesanía hecha a mano.', 'Cestos y tejidos, por favor.', 'Mba\'éichapa, artesanía…'], buy: ['¡Aguyje!', 'Aguyje, muchas gracias.'], none: 'Ya no me queda más.' },
    calle: { label: '🪙 Dar una moneda · 1.000 Gs.', price: 1000, stock: 99, manta: 'carton', give: true,
      looks: [{ gender: 'm', skin: 3, build: 'flaco', hair: 'medio', hairColor: 5, beard: 'barba', top: 'buzo', topColor: 14, bottom: 'jogging', bottomColor: 15, shoes: 'chinelas', shoesColor: 1, hat: 'gorro', hatColor: 3, mochila: true },
        { gender: 'f', skin: 2, hair: 'colita', hairColor: 7, top: 'sueter', topColor: 10, bottom: 'jogging', bottomColor: 3, shoes: 'chinelas', shoesColor: 1 }],
      lines: ['Una moneda, por favor…', 'Una ayudita, que Dios le pague.', 'Para un pan, si puede…'], buy: ['¡Dios se lo pague!', 'Gracias, que le vaya bien.'], none: '' },
  };
  const ORDER = ['empanada', 'helado', 'hippie', 'indigena', 'calle', 'empanada', 'hippie', 'calle'];

  VR.Calle = class {
    constructor(world, peds, o) { this.world = world; this.peds = peds; this.o = o; this.list = []; this.spawnT = 3; this.max = 3; this.n = 0; this.t = 0; }
    free(x, y) { return this.peds.walkable(x, y) && !this.world.hits(x - 3, y - 3, x + 3, y); }
    spawn(f) {
      const kind = ORDER[this.n % ORDER.length]; const K = KINDS[kind];
      for (let k = 0; k < 40; k++) {
        const a = Math.random() * 6.283, d = rnd(240, 520), x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d;
        if (!this.free(x, y) || !this.free(x + 12, y) || !this.free(x - 12, y)) continue;
        if (this.underTree(x, y)) continue;   // que no queden escondidos bajo una copa
        const b = this.world.barrioName ? this.world.barrioName(x, y) : null;
        if (b === 'Afueras' || (k < 25 && b !== 'Centro')) continue;
        const look = pick(K.looks);
        this.list.push({ kind, K, x, y, px: x, py: y, vx: 0, vy: 0, dir: K.walk ? 'down' : 'down', spr: VR.av2Lazy(look), anim: 0, stock: K.stock, t: rnd(1, 4), mode: K.walk ? 'idle' : 'sit', say: null, sayT: rnd(3, 9), cool: 0 });
        this.n++; return;
      }
    }
    underTree(x, y) {
      const W = this.world, PX = W.CH * VR.TILE, S = VR.TILE, idx = W.index && W.index[Math.floor(y / PX) * W.cw + Math.floor(x / PX)];
      if (!idx) return false;
      for (const t of idx.t) { const dx = (x - (t.x * S + 8)) / (t.r + 8), dy = (y - (t.y * S - 6)) / (t.r + 8); if (dx * dx + dy * dy < 1 && y < t.y * S + 12) return true; }
      return false;
    }
    near(p) { let b = null, bd = 24; for (const d of this.list) { const k = Math.hypot(d.x - p.x, d.y - (p.y - 3)); if (k < bd) { bd = k; b = d; } } return b; }
    act(p) {
      const d = this.near(p); if (!d) return false;
      const K = d.K, say = (t) => { d.say = { text: t, t: 2.4 }; };
      if (d.cool > 0) return true;
      if (d.stock <= 0) { if (K.none) say(K.none); return true; }
      if (VR.Wallet.get() < K.price) { this.o.toast('💸 No te alcanza: cuesta ' + VR.fmtGs(K.price)); return true; }
      VR.Wallet.add(-K.price); d.stock--; d.cool = 1.2; say(pick(K.buy));
      if (K.heal && this.o.heal) this.o.heal(K.heal);
      if (K.hambre && this.o.hambre) this.o.hambre(K.hambre);
      if (VR.audio && VR.audio.coin) VR.audio.coin();
      this.o.toast(K.give ? '🪙 Le diste ' + VR.fmtGs(K.price) : (K.heal ? '😋 −' + VR.fmtGs(K.price) + ' · +' + K.heal + '% de vida' : '🛍 −' + VR.fmtGs(K.price)));
      return true;
    }
    update(dt, focus) {
      this.t += dt; this.spawnT -= dt;
      for (let i = this.list.length - 1; i >= 0; i--) if (Math.hypot(this.list[i].x - focus.x, this.list[i].y - focus.y) > 1000) this.list.splice(i, 1);
      if (this.spawnT <= 0 && this.list.length < this.max) { this.spawnT = 6; this.spawn(focus); }
      for (const d of this.list) {
        d.px = d.x; d.py = d.y; d.cool -= dt;
        if (d.say) { d.say.t -= dt; if (d.say.t <= 0) d.say = null; }
        d.sayT -= dt; if (d.sayT <= 0) { d.sayT = rnd(9, 18); if (!d.say && Math.hypot(d.x - focus.x, d.y - focus.y) < 260 && d.stock > 0) d.say = { text: pick(d.K.lines), t: 2.6 }; }
        if (!d.K.walk) continue;
        d.t -= dt;
        if (d.mode === 'idle') { d.anim = 0; if (d.t <= 0) { d.mode = 'walk'; d.t = rnd(4, 9); this.newDir(d); } continue; }
        const nx = d.x + d.vx * 15 * dt, ny = d.y + d.vy * 15 * dt;
        if (this.free(nx, ny) && this.free(d.x + d.vx * 8, d.y + d.vy * 8)) { d.x = nx; d.y = ny; d.anim += dt * 6; } else this.newDir(d);
        if (d.t <= 0) { d.mode = 'idle'; d.t = rnd(2, 6); }
      }
    }
    newDir(d) {
      for (let k = 0; k < 8; k++) { const a = Math.floor(Math.random() * 4) * Math.PI / 2, vx = Math.round(Math.cos(a)), vy = Math.round(Math.sin(a)); if (this.free(d.x + vx * 14, d.y + vy * 14)) { d.vx = vx; d.vy = vy; d.dir = vx > 0 ? 'right' : vx < 0 ? 'left' : vy > 0 ? 'down' : 'up'; return; } }
      d.mode = 'idle'; d.t = 2;
    }
    collect(camX, camY, sw, sh, al, out) {
      const PS = VR.PS;
      for (const d of this.list) {
        const x = Math.round(VR.lerp(d.px, d.x, al) - camX), y = Math.round(VR.lerp(d.py, d.y, al) - camY);
        if (x < -30 || y < -40 || x > sw + 30 || y > sh + 20) continue;
        const K = d.K;
        if (K.manta) out.push({ sy: y + camY - 6, draw: (g) => { // manta o cartón en el piso con las cosas encima
          if (K.manta === 'carton') { g.fillStyle = '#7a6a52'; g.fillRect(x - 10, y - 2, 20, 11); g.fillStyle = '#5e5240'; g.fillRect(x - 10, y + 8, 20, 1); g.fillStyle = '#d8d0b8'; g.fillRect(x + 9, y + 1, 4, 3); }
          else { const cols = K.manta === 'hippie' ? ['#c8322a', '#e8b830', '#3b9a5a'] : ['#b89a6a', '#8a5a3a'];
            g.fillStyle = cols[0]; g.fillRect(x - 13, y - 1, 26, 12);
            for (let i = 0; i < 6; i++) { g.fillStyle = cols[1 + (i % (cols.length - 1))]; g.fillRect(x - 13 + i * 5, y - 1, 2, 12); }
            g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 13, y + 10, 26, 1);
            K.items.forEach((c, i) => { g.fillStyle = c; if (K.manta === 'hippie') g.fillRect(x - 10 + i * 4, y + 5 + (i % 2) * 2, 3, 3); else { g.fillRect(x - 11 + i * 6, y + 4 + (i % 2) * 2, 5, 4); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - 11 + i * 6, y + 7 + (i % 2) * 2, 5, 1); } });
          } } });
        out.push({ sy: y + camY, draw: (g) => {
          g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y - 1, 5.5, 2.3, 0, 0, Math.PI * 2); g.fill();
          const img = d.mode === 'sit' ? d.spr.get('down', 'sit', 0) : d.mode === 'walk' ? d.spr.get(d.dir, 'walk', Math.floor(d.anim) % 8) : d.spr.get(d.dir, 'idle', 0);
          g.drawImage(img, x - 8 * PS, y - 31 * PS + (d.mode === 'sit' ? 2 : 0), 16 * PS, 32 * PS);
          if (d.kind === 'empanada') { const r = d.dir === 'left' ? -1 : 1, bx = x + r * 4 - 3, by = y - Math.round(15 * PS); g.fillStyle = '#5a3a1c'; g.fillRect(bx - 1, by - 1, 9, 6); g.fillStyle = '#f2efe6'; g.fillRect(bx, by - 2, 7, 2); g.fillStyle = '#b07a3a'; g.fillRect(bx + 1, by + 1, 5, 3); }
          if (d.kind === 'helado') { const r = d.dir === 'left' ? -1 : 1, bx = x + r * 9 - 5; g.fillStyle = '#2e6fc8'; g.fillRect(bx, y - 8, 11, 8); g.fillStyle = '#f2efe6'; g.fillRect(bx, y - 10, 11, 3); g.fillStyle = '#e86aa0'; g.fillRect(bx + 2, y - 5, 3, 2); g.fillStyle = '#222'; g.fillRect(bx + 1, y - 1, 2, 2); g.fillRect(bx + 8, y - 1, 2, 2); }
          if (d.say) VR.Player.prototype.drawBubble.call({ bubble: d.say, px: x + camX, x: x + camX, py: y + camY + 6, y: y + camY + 6 }, g, camX, camY, 1);
        } });
      }
    }
  };
})();
