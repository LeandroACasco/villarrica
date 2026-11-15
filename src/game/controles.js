// Controles de tránsito de la Policía Municipal (J4, 15/11/2026). Solo en Historia.
// Hay unos pocos puestos fijos (conos y una camioneta con luces) en el Centro. Se ven de lejos: si das la vuelta antes, no pasa nada.
// Si pasás cerca en moto sin casco, te multan (11 jornales = 1.287.847 Gs.): se paga con lo que tengas y, si no alcanza, queda como deuda.
// (La licencia de conducir y el contramano llegan en J6: hoy el único motivo de multa es el casco.)
'use strict';
VR.Controles = class {
  // o: { world, lug, vida, toast }
  constructor(o) { Object.assign(this, o); this.pts = null; this.cool = {}; this.t = 0; }
  puntos() {
    if (this.pts) return this.pts;
    const L = this.lug, a = L.get('marimer'), b = L.get('teatro'), c = L.get({ en: 'catedral', dx: 0, dy: 0 }), out = [];
    if (a && b) { const p = L.libre((a.x + b.x) / 2, (a.y + b.y) / 2); out.push({ id: 'c1', x: p.x, y: p.y }); }
    if (c) out.push({ id: 'c2', x: c.x, y: c.y });
    return (this.pts = out);
  }
  update(dt, player, car) {
    this.t += dt;
    if (car) this.gomeria(car);
    if (!car || car.type !== 'moto' || Math.abs(car.v) < 12 || this.vida.cascoPuesto) return;
    for (const p of this.puntos()) {
      if (Math.hypot(car.x - p.x, car.y - p.y) > 58 || (this.cool[p.id] || 0) > this.t) continue;
      this.cool[p.id] = this.t + 90;
      this.vida.cobrarODeber(VR.PRECIOS.multaCasco, 'Multa de tránsito: sin casco');
      this.toast('🚓 Control de tránsito: andás sin casco. Multa de ' + VR.fmtGs(VR.PRECIOS.multaCasco));
      if (VR.mis) VR.mis.emit('multa', { motivo: 'casco' });
    }
  }
  // gomerías (ver VR.PUNTOS.gomeria1/2): parado con una llanta pinchada cerca de una, el gomero te ofrece arreglarla (más barato que el parche a domicilio)
  gomeria(car) {
    if (!VR.Tab || !VR.Tab.flat(car) || car.fixT > 0 || Math.abs(car.v) > 15 || VR.Dialogo.abierto || (this.cg || 0) > this.t) return;
    for (const k of ['gomeria1', 'gomeria2']) { const D = VR.PUNTOS[k], p = D && this.lug.get(D.lugar); if (!p || Math.hypot(car.x - p.x, car.y - p.y) > 80) continue;
      this.cg = this.t + 25; const n = VR.PRECIOS.gomeria, V = this.vida;
      VR.mis.dialogo([{ quien: 'sis', titulo: '🛞 ' + D.nombre, txt: '¡Epa! Esa llanta está pinchada. La arreglo en un toque por ' + VR.fmtGs(n) + ' (en la calle te sale ' + VR.fmtGs(12000) + ').', op: [
        ['Arreglala · ' + VR.fmtGs(n), () => { if (!V.gasta(n, 'Gomería: llanta')) return false; car.fixT = 5; this.toast('🛞 El gomero está arreglando la llanta…'); return false; }], ['Después', () => false]] }]);
      return; }
  }
  collect(cx, cy, tall) {
    for (const p of this.puntos()) {
      const x = Math.round(p.x - cx), y = Math.round(p.y - cy); if (x < -50 || y < -50 || x > VR.screen.w + 50 || y > VR.screen.h + 50) continue;
      const on = Math.floor(this.t * 3) % 2;
      tall.push({ sy: p.y, draw: (g) => {
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x - 12, y - 1, 26, 4);
        g.fillStyle = '#f4f4f4'; g.fillRect(x - 11, y - 13, 22, 12); g.fillStyle = '#1f4fa8'; g.fillRect(x - 11, y - 8, 22, 3); g.fillStyle = '#3a6ea8'; g.fillRect(x - 8, y - 12, 8, 4);
        g.fillStyle = on ? '#ff3b3b' : '#7a1c1c'; g.fillRect(x - 6, y - 15, 5, 2); g.fillStyle = on ? '#2a4a8a' : '#4a7aff'; g.fillRect(x + 1, y - 15, 5, 2);
        g.fillStyle = '#1b1b1f'; g.fillRect(x - 10, y - 2, 4, 3); g.fillRect(x + 6, y - 2, 4, 3);
        for (let i = 0; i < 4; i++) { const cxn = x - 34 + i * 7, cyn = y - 4 + (i % 2) * 3; g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(cxn - 2, cyn, 5, 2); g.fillStyle = '#ff7a1a'; g.fillRect(cxn - 1, cyn - 5, 3, 5); g.fillStyle = '#fff'; g.fillRect(cxn - 1, cyn - 3, 3, 1); }
        VR.gfx.text(g, 'CONTROL', x, y - 19, '#fff6d8', { center: true, shadow: '#1a1a1e', size: 6 });
      } });
    }
  }
};
