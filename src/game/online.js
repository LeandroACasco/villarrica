// Online (05/11/2026, pedido de Deisy para jugar con Cinthia): salas por código, de teléfono a teléfono con WebRTC
// (PeerJS y su servidor público solo para encontrarse). Quien crea la sala es el anfitrión y reenvía a todos.
// Cada jugador manda 10 veces por segundo dónde está, hacia dónde mira y en qué vehículo va; se ven con su
// personaje y su nombre arriba. El mundo (tránsito, peatones, policía) sigue siendo de cada uno.
'use strict';
VR.Online = class {
  constructor() { this.peer = null; this.conns = []; this.others = new Map(); this.status = 'Sin conectar'; this.t = 0; this.onStatus = null; }
  async lib() {
    if (window.Peer) return;
    await new Promise((ok, fail) => { const s = document.createElement('script'); s.src = 'peerjs.min.js'; s.onload = ok; s.onerror = () => fail(new Error('No se pudo cargar PeerJS (¿hay internet?)')); document.head.appendChild(s); });
  }
  set(st) { this.status = st; if (this.onStatus) this.onStatus(st); }
  async start(nick, room, host) {
    this.stop(); this.nick = (nick || 'Jugador').slice(0, 14); this.room = room; this.host = host;
    try { await this.lib(); } catch (e) { this.set(e.message); return; }
    const id = 'villarrica-' + room.toLowerCase();
    const op = window.__peerOpts || {}; this.peer = host ? new Peer(id, op) : new Peer(op);
    this.peer.on('error', (e) => this.set(e.type === 'unavailable-id' ? 'Esa sala ya existe: unite en vez de crearla' : e.type === 'peer-unavailable' ? 'No existe la sala ' + room : 'Error: ' + e.type));
    this.peer.on('open', () => {
      if (host) this.set('Sala ' + room + ' creada · esperando');
      else this.hook(this.peer.connect(id, { reliable: false }));
    });
    this.peer.on('connection', (c) => this.hook(c));
  }
  hook(c) {
    c.on('open', () => { this.conns.push(c); this.set((this.host ? 'Sala ' : 'En la sala ') + this.room + ' · ' + (this.others.size + 1) + ' más'); this.sendLook = true; });
    c.on('data', (m) => {
      if (this.host) for (const o of this.conns) if (o !== c && o.open) o.send(m); // el anfitrión reenvía
      if (m.bye) { this.others.delete(m.id); return; }
      let o = this.others.get(m.id);
      if (!o) { o = { x: m.x, y: m.y }; this.others.set(m.id, o); }
      Object.assign(o, m, { px: o.x, py: o.y, at: performance.now() });
      if (m.L) { o.look = VR.av2Lazy(m.L); o.L = m.L; }
    });
    c.on('close', () => { this.conns = this.conns.filter((o) => o !== c); this.set(this.conns.length ? 'Conectado' : this.host ? 'Sala ' + this.room + ' · esperando' : 'Se cortó la conexión'); });
  }
  stop() { for (const c of this.conns) try { c.send({ id: this.peer.id, bye: 1 }); c.close(); } catch (e) {} if (this.peer) this.peer.destroy(); this.peer = null; this.conns = []; this.others.clear(); this.set('Sin conectar'); }
  // cada cuadro: mandar mi estado (10 por segundo) y olvidar a los que no mandan nada hace 6 s
  update(dt, player, car) {
    if (!this.peer || !this.conns.length) return;
    this.t += dt; if (this.t < 0.1) return; this.t = 0;
    const m = { id: this.peer.id, n: this.nick, x: Math.round(car ? car.x : player.x), y: Math.round(car ? car.y : player.y), d: player.dir, mv: player.moving ? (player.run ? 2 : 1) : 0 };
    if (car) m.c = [car.type, car.model, car.color || 0, +car.a.toFixed(3)];
    if (this.sendLook || Math.random() < 0.02) { m.L = player.lookData; this.sendLook = false; }
    for (const c of this.conns) if (c.open) c.send(m);
    const now = performance.now(); for (const [k, o] of this.others) if (now - o.at > 6000) this.others.delete(k);
  }
  collect(cx, cy, a, tall) {
    const now = performance.now();
    for (const o of this.others.values()) {
      if (!o.look) continue;
      const k = Math.min(1, (now - o.at) / 100), x = VR.lerp(o.px, o.x, k) - cx, y = VR.lerp(o.py, o.y, k) - cy;
      tall.push({ sy: y + cy, draw: (ctx) => {
        if (o.c) {
          const [type, model, color, ang] = o.c;
          if (!o.car || o.car.model !== model || o.car.type !== type) { o.car = new VR.Car(VR.world || window.__vr.world, 0, 0, ang, color, type, model); if (type === 'moto') o.car.rider = { L: o.L }; }
          const v = o.car; v.px = v.x = x + cx; v.py = v.y = y + cy; v.pa = v.a = ang; v.draw(ctx, cx, cy, 1);
        } else {
          o.car = null;
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y - 1, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.drawImage(o.mv ? o.look.get(o.d, o.mv > 1 ? 'run' : 'walk', ((now / (o.mv > 1 ? 66 : 105)) | 0) % 8) : o.look.get(o.d, 'idle', 0), x - 8, y - 31, 16, 32);
        }
        const ty = o.c ? y - 22 : y - 38; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
        ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(o.n, x, ty); ctx.fillStyle = '#ffd84a'; ctx.fillText(o.n, x, ty);
      } });
    }
  }
};
