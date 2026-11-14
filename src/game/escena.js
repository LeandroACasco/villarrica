// Escena del accidente del sábado 14/11/2026 (pedido de Leandro, foto real): una moto chocó en el cruce de Prof. Juan Boggino
// y Gral. Duarte (Lomas Valentinas). Hay una ambulancia con las luces prendidas y la camilla afuera, dos paramédicos de amarillo
// atendiendo a la persona en el piso, dos policías con chaleco, gente mirando y la moto tirada.
// Todo es decorado fijo (no se mueve ni reacciona). La posición sale del decal `accidente` que pone tools/osm_to_map.py
// (OSM no trae el nombre "Boggino", se ubica por coordenadas); acá se busca el cruce real más cercano a ese punto.
'use strict';
VR.Escena = class {
  constructor(world, cars) {
    this.world = world; this.gente = []; this.camilla = null; this.flat = new Map();
    const d = (world.decals || []).find((q) => q.kind === 'accidente'); if (!d) return;
    const S = VR.TILE, T = VR.T, rd = (x, y) => { const t = world.get(x, y); return t === T.ROAD || t === T.STONE || t === T.DIRTROAD; };
    // cruce real más cercano al punto del decal (cuatro brazos de calle de 3 baldosas)
    let c = null;
    for (let r = 0; r <= 12 && !c; r++) for (let dy = -r; dy <= r && !c; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = d.x + dx, y = d.y + dy;
      if (rd(x, y) && rd(x - 3, y) && rd(x + 3, y) && rd(x, y - 3) && rd(x, y + 3)) { c = { x: (x + 0.5) * S, y: (y + 0.5) * S, tx: x, ty: y }; break; }
    }
    if (!c) return;
    this.c = c;
    // brazo donde queda la ambulancia: el primero con calle por 5 baldosas
    let dir = null;
    for (const q of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if ([2, 3, 4, 5].every((k) => rd(c.tx + q[0] * k, c.ty + q[1] * k))) { dir = q; break; }
    dir = dir || [1, 0];
    const A = [-dir[0], -dir[1]], B = [-A[1], A[0]]; // A: hacia el lado opuesto a la ambulancia; B: de costado
    const P = (a, b) => ({ x: c.x + A[0] * a + B[0] * b, y: c.y + A[1] * a + B[1] * b });
    const R = VR.rng(1411), look = (o) => VR.av2Lazy(Object.assign({}, o));
    const face = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); };

    // ambulancia con las luces prendidas, la parte de atrás hacia la escena
    const amb = P(-56, 6), heading = Math.atan2(dir[0], -dir[1]);
    const ca = new VR.Car(world, amb.x, amb.y, heading, 0, 'car', 'ambulancia'); ca.siren = true; ca.escena = true; world.addBox(ca); cars.push(ca);
    this.camilla = Object.assign(P(-27, 8), { horiz: dir[0] !== 0 });

    // moto tirada de costado, a unos pasos de la víctima
    const mp = P(14, 10), cm = new VR.Car(world, mp.x, mp.y, heading + Math.PI / 2 + 0.3, 1, 'moto', VR.pickMoto(R, true, world.nivelAt(mp.x, mp.y)));
    cm.fallen = { t: 99, side: 1 }; cm.escena = true; cm.hp = 70; world.addBox(cm); cars.push(cm);

    // gente
    const v = P(0, 0), amarillo = { top: 'campera', topColor: 5, topColor2: 5, bottom: 'cargo', bottomColor: 5, shoes: 'botitas', shoesColor: 3, hair: 'corto' };
    const poli = { top: 'camisa', topColor: 13, bottom: 'vestir', bottomColor: 13, shoes: 'zapatos', shoesColor: 3, hat: 'gorra', hatColor: 13 };
    const poli2 = Object.assign({}, poli, { top: 'campera', topColor: 5, topColor2: 13, hatColor: 3 });
    const add = (p, o, pose) => this.gente.push({ x: p.x, y: p.y, pose, dir: face(p, v), s: look(o) });
    this.gente.push({ x: v.x, y: v.y, pose: 'piso', dir: 'down', s: look({ gender: 'm', top: 'remera', topColor: 3, bottom: 'jean', bottomColor: 0, shoes: 'zapatillas' }) });
    add(P(-11, -5), amarillo, 'sit'); add(P(-9, 8), Object.assign({}, amarillo, { gender: 'f', hair: 'colita', hairColor: 1 }), 'sit');
    add(P(22, -12), poli, 'de pie'); add(P(24, -3), poli2, 'de pie');
    for (const [a, b] of [[8, -26], [20, -30], [-4, 26], [10, 30]]) { const L = VR.av2Random(R); L.hat = L.hat === 'casco' ? 'ninguno' : L.hat; L.mochila = false; add(P(a, b), L, 'de pie'); }
  }

  piso(s) { // sprite "acostado" (como peds.lying)
    let c = this.flat.get(s);
    if (!c) { const im = s.get('down', 'idle', 0), Rs = VR.RES; c = VR.canvas(34 * Rs, 18 * Rs); const g = c.getContext('2d'); g.scale(Rs, Rs); g.translate(17, 9); g.rotate(Math.PI / 2); g.drawImage(im, -8 * VR.PS, -16 * VR.PS, 16 * VR.PS, 32 * VR.PS); this.flat.set(s, c); }
    return c;
  }

  collect(camX, camY, sw, sh, out) {
    if (!this.c) return;
    if (Math.abs(this.c.x - camX - sw / 2) > sw / 2 + 140 || Math.abs(this.c.y - camY - sh / 2) > sh / 2 + 140) return;
    const k = this.camilla;
    if (k) out.push({ sy: k.y + 3, draw: (ctx) => { // camilla con ruedas, afuera de la ambulancia
      const x = Math.round(k.x - camX), y = Math.round(k.y - camY), w = k.horiz ? 18 : 7, h = k.horiz ? 7 : 18;
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x - w / 2 + 1, y - h / 2 + 2, w, h);
      ctx.fillStyle = '#9aa0aa'; ctx.fillRect(x - w / 2, y - h / 2 - 1, w, h); ctx.fillStyle = '#23262e'; ctx.fillRect(x - w / 2 + 1, y - h / 2, w - 2, h - 2);
      ctx.fillStyle = '#d8dce4'; ctx.fillRect(k.horiz ? x - w / 2 + 2 : x - 2, k.horiz ? y - 2 : y - h / 2 + 2, 3, 3); // almohadilla
    } });
    for (const p of this.gente) {
      const x = Math.round(p.x - camX), y = Math.round(p.y - camY);
      if (x < -24 || y < -40 || x > sw + 24 || y > sh + 24) continue;
      out.push({ sy: p.y + 2, draw: (ctx) => {
        if (p.pose === 'piso') { VR.sun.blob(ctx, x, y, 30, 5.5, 2.3, 0.28); ctx.drawImage(this.piso(p.s), x - 17, y - 12, 34, 18); return; }
        const im = p.s.get(p.dir, p.pose === 'sit' ? 'sit' : 'idle', 0);
        VR.sun.blob(ctx, x, y, 3, 3.2 * VR.PS, 1.5 * VR.PS, 0.24); VR.sun.cast(ctx, im, x, y + VR.PS, 16 * VR.PS, 32 * VR.PS, 0.28);
        ctx.drawImage(im, x - 8 * VR.PS, y - 31 * VR.PS, 16 * VR.PS, 32 * VR.PS);
      } });
    }
  }
};
