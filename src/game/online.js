// Online (05/11/2026, pedido de Deisy para jugar con Cinthia): salas por código, de teléfono a teléfono con WebRTC
// (PeerJS y su servidor público solo para encontrarse). Quien crea la sala es el anfitrión y reenvía a todos.
// Cada jugador manda 10 veces por segundo dónde está, hacia dónde mira, en qué vehículo va y su ropa (si cambia).
// Sincronización del mundo (05/11/2026): el anfitrión manda su tránsito, sus unidades de emergencia y su gente;
// quien está cerca del anfitrión (< NEAR) deja de simular los suyos y ve los del anfitrión (copias con choque).
// Eventos al momento: tiros, lanzallamas, fuego y explosiones de vehículos, sirenas, robar un auto del anfitrión.
'use strict';
VR.netOffset = 0; VR.netNow = () => Date.now() + VR.netOffset; // reloj común de la sala (el del anfitrión)
// Cartelera de salas (Firestore por su API web, sin librería). Proyecto de Firebase propio de Villarrica:
// completar con los datos de la consola (Configuración del proyecto → Tus apps → web). Sin datos, solo con código.
VR.FB = { projectId: 'villarrica-juego', apiKey: 'AIzaSyD3JaREpx9D26GGQu1U1IrbxQV-jmcRgIA' }; // proyecto de Firebase propio de Villarrica
VR.Salas = {
  url(id) { const f = VR.FB; return 'https://firestore.googleapis.com/v1/projects/' + f.projectId + '/databases/(default)/documents/villarrica_salas' + (id ? '/' + encodeURIComponent(id) : '') + '?key=' + f.apiKey; },
  async put(room, nick, n) { if (!VR.FB) return; try { await fetch(this.url(room), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { n: { stringValue: room }, h: { stringValue: nick }, j: { integerValue: String(n) }, at: { integerValue: String(Date.now()) } } }) }); } catch (e) {} },
  async del(room) { if (!VR.FB) return; try { await fetch(this.url(room), { method: 'DELETE' }); } catch (e) {} },
  async list() {
    if (!VR.FB) return null;
    const j = await (await fetch(this.url() + '&pageSize=100')).json(), F = (d, k) => d.fields[k] && (d.fields[k].stringValue ?? +d.fields[k].integerValue);
    return (j.documents || []).map((d) => ({ n: F(d, 'n'), h: F(d, 'h'), j: F(d, 'j'), at: F(d, 'at') })).filter((s) => Date.now() - s.at < 120000);
  },
};
VR.Online = class {
  bind(o) { Object.assign(this, o); VR.onlineEv = (m, every) => this.ev(m, every); }
  constructor() { this.proxies = new Map(); this.taken = new Set(); this.pp = []; this.evT = {}; this.nid = 0; this.mirror = false; this.peer = null; this.conns = []; this.others = new Map(); this.status = 'Sin conectar'; this.t = 0; this.onStatus = null; }
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
      if (host) { this.set('Sala ' + room + ' creada · esperando'); VR.Salas.put(room, this.nick, 1); this.salaT = 0; }
      else this.hook(this.peer.connect(id, { reliable: true }));
    });
    this.peer.on('connection', (c) => this.hook(c));
  }
  hook(c) {
    c.on('open', () => { this.conns.push(c); this.set((this.host ? 'Sala ' : 'En la sala ') + this.room + ' · ' + (this.others.size + 1) + ' más'); this.sendLook = true; });
    c.on('data', (m) => {
      if (this.host) for (const o of this.conns) if (o !== c && o.open) o.send(m); // el anfitrión reenvía
      if (m.e) { this.onEv(m); return; }
      if (m.w) { if (m.now) { const off = m.now - Date.now(); VR.netOffset = this.offN ? VR.netOffset * 0.8 + off * 0.2 : off; this.offN = 1; } this.W = m; this.Wat = performance.now(); m.at = this.Wat / 1000; if (m.cine && (!VR.cineNow || VR.cineNow.t0 !== m.cine.t0)) { VR.cineNow = m.cine; if (this.onCine) this.onCine(); } return; }
      if (m.bye) { this.others.delete(m.id); return; }
      let o = this.others.get(m.id);
      if (!o) { o = { x: m.x, y: m.y }; this.others.set(m.id, o); }
      Object.assign(o, m, { px: o.x, py: o.y, at: performance.now() });
      if (m.L) { o.look = VR.av2Lazy(m.L); o.L = m.L; }
      if (!m.tz) { o.tz = 0; o.t = null; }
      if (!m.sw) o.sw = null;
    });
    c.on('close', () => { this.conns = this.conns.filter((o) => o !== c); this.set(this.conns.length ? 'Conectado' : this.host ? 'Sala ' + this.room + ' · esperando' : 'Se cortó la conexión'); });
  }

  names() { return [this.nick + ' (vos)' + (this.host ? ' · sala' : '')].concat([...this.others.values()].map((o) => o.n + (o.id === 'villarrica-' + (this.room || '').toLowerCase() ? ' · sala' : ''))); }
  // pasajero: el vehículo de otro jugador a menos de 34 px, con lugar (moto: 1 pasajero; auto: 4)
  nearRide(p) {
    let best = null, bd = 34;
    for (const o of this.others.values()) {
      if (!o.c || o.r) continue; const d = Math.hypot(o.x - p.x, o.y - p.y); if (d > bd) continue;
      const used = [...this.others.values()].filter((q) => q.r === o.id).length, cap = o.c[0] === 'moto' ? (o.c[1] === 'pati' || o.c[1] === 'bici' ? 0 : 1) : o.c[1] === 'karumbe' ? 2 : 4;
      if (used < cap) { bd = d; best = o; }
    }
    return best;
  }
  leave(player, world) {
    const d = this.others.get(this.ride); this.ride = null;
    if (d) { const a = d.c ? d.c[3] : 0; let x = player.x + Math.cos(a) * 22, y = player.y - 10 + Math.sin(a) * 22; if (world.solid(Math.floor(x / 16), Math.floor(y / 16))) { x = player.x - Math.cos(a) * 22; y = player.y - 10 - Math.sin(a) * 22; } player.x = player.px = x; player.y = player.py = y; }
  }
  bubble(ctx, o, wx, wy, cx, cy) {
    if (!o.bubble) return; const t = (o.bubble.end - performance.now()) / 1000; if (t <= 0) { o.bubble = null; return; }
    VR.Player.prototype.drawBubble.call({ bubble: { text: o.bubble.text, t }, px: wx, x: wx, py: wy, y: wy }, ctx, cx, cy, 1);
  }
  // pasajero: en moto, sentado atrás del conductor; en auto, solo el nombre al costado
  drawPass(tall, o, x, y, ang, type, cx, cy, i) {
    tall.push({ sy: y + cy + 1, draw: (ctx) => {
      if (type === 'moto') { const R = VR.riderTopFrames(o.L, { gy: -1.4, gx: 3.6, hip: 6.2 }), h = R.S >> 1, k = ((Math.round(ang / (Math.PI * 2) * 64) % 64) + 64) % 64; ctx.drawImage(R.get(k), x - h, y - h, R.S, R.S); }
      const tx = x + 14 + i * 2, ty = y - 18 - i * 9; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.75)';
      const s = '👥 ' + o.n; ctx.strokeText(s, tx, ty); ctx.fillStyle = '#9fe0ff'; ctx.fillText(s, tx, ty);
      this.bubble(ctx, o, x + cx, y + cy - 10, cx, cy);
    } });
  }
  flags(v) { return (v.burning ? 1 : 0) | (v.wreck ? 2 : 0) | (v.siren ? 4 : 0); }
  // fuego y explosión de una copia según lo que manda el dueño
  fx(v, f) {
    if (!this.emer) return;
    if (f & 2 && !v.wreck) this.emer.explode(v);
    else if (f & 1 && !v.burning && !v.wreck) this.emer.ignite(v);
  }
  // ---- eventos ----
  ev(m, every) {
    if (!this.peer || !this.conns.length) return;
    if (every) { const now = performance.now(); if (now - (this.evT[m.e] || 0) < every * 1000) return; this.evT[m.e] = now; }
    m.id = this.peer.id; for (const c of this.conns) if (c.open) c.send(m);
  }
  onEv(m) {
    if (m.e === 'cine') { VR.cineNow = { v: m.v, t0: m.t0 }; if (this.onCine) this.onCine(); return; }
    if (m.e === 'chat') { const o = this.others.get(m.id), n = o ? o.n : 'Alguien'; if (o) o.bubble = { text: m.t, end: performance.now() + 4500 }; VR.chatLine && VR.chatLine(n, m.t); return; }
    const W = this.weapons;
    if (m.e === 'shot' && W) W.shoot(null, [m.x, m.y, m.a]);
    else if (m.e === 'fl' && W) { for (let i = 0; i < 4; i++) W.flame(0.03, null, [m.x, m.y, m.a]); W.remote = false; }
    else if (m.e === 'take' && this.host && this.traffic) { // otro jugador se llevó un auto mío
      const v = this.traffic.list.find((q) => q._nid === m.n) || (this.emer && (this.emer.units.find((u) => u.v._nid === m.n) || {}).v);
      if (v) { if (v.ai) this.traffic.remove(v); else { this.world.removeBox(v); this.emer.units = this.emer.units.filter((u) => u.v !== v); } }
    }
  }
  take(v) { this.ev({ e: 'take', n: v._nid }); this.taken.add(v._nid); this.proxies.delete(v._nid); delete v._nid; if (this.cars && !this.cars.includes(v)) this.cars.push(v); }
  // ---- anfitrión: manda su tránsito, unidades y gente ----
  sendWorld() {
    const c = [], p = [], T = this.traffic, D = ['up', 'right', 'down', 'left'], M = ['walk', 'idle', 'flee', 'down'];
    const cars = (T ? T.list : []).concat(this.emer ? this.emer.units.map((u) => u.v) : []);
    for (const v of cars) {
      if (v.driven) continue;
      v._nid = v._nid || ++this.nid;
      const ri = v.rider && v.rider.L && VR.RIDER_LOOKS ? VR.RIDER_LOOKS.indexOf(v.rider.L) : -1;
      const sp = v.vx !== undefined ? [Math.round(v.vx), Math.round(v.vy)] : [Math.round(Math.sin(v.a) * (v.v || 0)), Math.round(-Math.cos(v.a) * (v.v || 0))];
      c.push([v._nid, Math.round(v.x), Math.round(v.y), Math.round(v.a * 100), v.type === 'moto' ? 1 : 0, v.model, v.color || 0, this.flags(v), ri, sp[0], sp[1]]);
    }
    if (this.peds) for (const q of this.peds.list) { q._nid = q._nid || (this.pid = (this.pid || 0) + 1e6); p.push([q._nid, Math.round(q.x), Math.round(q.y), D.indexOf(q.dir), Math.max(0, M.indexOf(q.mode)), q.pal]); }
    const m = { w: 1, c, p, f: this.fauna ? this.fauna.snap(this.hx || 0, this.hy || 0) : undefined, cine: VR.cineNow || undefined, now: Date.now() }; for (const k of this.conns) if (k.open) k.send(m);
  }
  // ---- invitado: cerca del anfitrión, ver lo suyo ----
  follow(dt, me) {
    const H = this.host ? null : this.others.get('villarrica-' + (this.room || '').toLowerCase());
    const near = !!(this.peer && !this.host && this.W && performance.now() - this.Wat < 3000);
    if (near && !this.mirror) { // dejar de simular lo propio
      this.mirror = true;
      if (this.traffic) for (const v of this.traffic.list.slice()) this.traffic.remove(v);
      if (this.peds) { this.ownPeds = this.peds.list; this.peds.list = this.pp = []; }
      if (this.fauna) this.fauna.netBegin();
    } else if (!near && this.mirror) { // volver a lo propio
      this.mirror = false;
      for (const v of this.proxies.values()) this.world.removeBox(v); this.proxies.clear();
      if (this.peds) this.peds.list = [];
      if (this.fauna) this.fauna.netEnd();
    }
    if (!this.mirror) return;
    const W = this.W, fresh = W !== this.lastW, k = Math.min(1, dt * 9);
    if (fresh) { this.lastW = W; this.seen = new Set(); if (this.fauna && W.f) this.fauna.netSet(W.f); }
    const seen = this.seen;
    if (fresh) for (const [id, x, y, a100, moto, model, color, f, ri, svx, svy] of W.c) {
      if (this.taken.has(id)) continue;
      seen.add(id); let v = this.proxies.get(id);
      if (!v) {
        v = new VR.Car(this.world, x, y, a100 / 100, color, moto ? 'moto' : 'car', model); v._nid = id; v.tx = x; v.ty = y; v.ta = a100 / 100;
        if (moto && ri >= 0 && VR.RIDER_LOOKS) v.rider = { L: VR.RIDER_LOOKS[ri] };
        this.world.addBox(v); this.proxies.set(id, v);
      }
      v.evx = svx || 0; v.evy = svy || 0; // velocidad real que manda el anfitrión (antes se adivinaba y los autos bailaban)
      v.tx = x; v.ty = y; v.ta = a100 / 100; v.siren = !!(f & 4); this.fx(v, f);
    }
    for (const [id, v] of this.proxies) {
      if (!seen.has(id)) { this.world.removeBox(v); this.proxies.delete(id); continue; }
      v.px = v.x; v.py = v.y; v.pa = v.a; v.tx += (v.evx || 0) * dt; v.ty += (v.evy || 0) * dt;
      if (Math.hypot(v.tx - v.x, v.ty - v.y) > 120) { v.x = v.tx; v.y = v.ty; } else { const kk = Math.min(1, dt * 4); v.x += (v.evx || 0) * dt + (v.tx - v.x) * kk; v.y += (v.evy || 0) * dt + (v.ty - v.y) * kk; }
      v.a += Math.atan2(Math.sin(v.ta - v.a), Math.cos(v.ta - v.a)) * k; v.vx = v.vy = v.w = 0; v.v = Math.hypot(v.evx || 0, v.evy || 0); this.world.moveBox(v);
    }
    // gente: copias livianas con el mismo dibujo (los 32 looks salen igual en todos los teléfonos)
    const D = ['up', 'right', 'down', 'left'], M = ['walk', 'idle', 'flee', 'down'], P = this.pp, by = this.pmap || (this.pmap = new Map()), keep = new Map();
    P.length = 0;
    for (const [id, x, y, d, md, pal] of W.p) {
      let q = by.get(id); if (!q || Math.hypot(q.x - x, q.y - y) > 120) q = { x, y, px: x, py: y, anim: 0, say: null };
      keep.set(id, q); P.push(q);
      q.px = q.x; q.py = q.y; q.x += (x - q.x) * k; q.y += (y - q.y) * k; q.dir = D[d] || 'down'; q.mode = M[md]; q.pal = pal;
      q.anim += dt * (q.mode === 'flee' ? 15 : 9.5);
    }
    this.pmap = keep;
  }
  stop() { VR.netOffset = 0; this.offN = 0; if (this.host && this.peer) VR.Salas.del(this.room); for (const c of this.conns) try { c.send({ id: this.peer.id, bye: 1 }); c.close(); } catch (e) {} if (this.peer) this.peer.destroy(); this.peer = null; this.conns = []; this.others.clear(); this.W = null; this.set('Sin conectar'); }
  // cada cuadro: mandar mi estado (10 por segundo) y olvidar a los que no mandan nada hace 6 s
  update(dt, player, car, teatro) {
    this.teatro = teatro;
    this.myL = player.lookData; this.myBubble = player.bubble ? { text: player.bubble.text, end: performance.now() + player.bubble.t * 1000 } : null;
    this.hx = car ? car.x : player.x; this.hy = car ? car.y : player.y;
    this.follow(dt, car || player);
    if (this.host && this.peer && (this.salaT = (this.salaT || 0) + dt) > 30) { this.salaT = 0; VR.Salas.put(this.room, this.nick, this.conns.length + 1); }
    if (!this.peer || !this.conns.length) return;
    this.t += dt; if (this.t < 0.1) return; this.t = 0;
    const m = { id: this.peer.id, n: this.nick, r: this.ride || undefined, tz: this.teatro && this.teatro.on ? 1 : undefined, t: this.teatro && this.teatro.on ? this.teatro.state() : undefined, x: Math.round(car ? car.x : player.x), y: Math.round(car ? car.y : player.y), d: player.dir, mv: player.moving ? (player.run ? 2 : 1) : 0 };
    if (this.cisnes && this.cisnes.s) m.sw = this.cisnes.netState();
    if (car) m.c = [car.type, car.model, car.color || 0, +car.a.toFixed(3), this.flags(car), car.tune || 0];
    const lk = JSON.stringify(player.lookData); if (this.sendLook || lk !== this.lastLook || Math.random() < 0.02) { m.L = player.lookData; this.sendLook = false; this.lastLook = lk; }
    for (const c of this.conns) if (c.open) c.send(m);
    if (this.host) VR.extraFoci = [...this.others.values()].filter((o) => !o.r).map((o) => ({ x: o.x, y: o.y }));
    if (this.host && (this.wT = (this.wT || 0) + 1) % 2 === 0) this.sendWorld(); // el mundo, 5 veces por segundo
    const now = performance.now(); for (const [k, o] of this.others) if (now - o.at > 6000) this.others.delete(k);
  }
  collect(cx, cy, a, tall, myCar) {
    const now = performance.now(), me = this.peer && this.peer.id;
    // pasajeros arriba de mi vehículo (lo veo yo)
    if (myCar) for (const o of this.others.values()) if (o.r === me && o.look) this.drawPass(tall, o, myCar.x - cx, myCar.y - cy, myCar.a, myCar.type, cx, cy, 0);
    let pi = 0;
    for (const o of this.others.values()) {
      if (!o.look || o.tz) continue; // los que están en el teatro se dibujan adentro
      if (o.sw) { o.sx = o.x; o.sy = o.y; continue; } // en un cisne: lo dibuja cisnes.js
      if (o.r) { // va de pasajero: se dibuja con el conductor
        const d = o.r === me ? null : this.others.get(o.r);
        if (d && d.c && d.sx !== undefined) this.drawPass(tall, o, d.sx - cx, d.sy - cy, d.c[3], d.c[0], cx, cy, pi++);
        continue;
      }
      const k = Math.min(1, (now - o.at) / 100), x = VR.lerp(o.px, o.x, k) - cx, y = VR.lerp(o.py, o.y, k) - cy; o.sx = x + cx; o.sy = y + cy;
      if (this.ride === o.id && o.c && this.myL) this.drawPass(tall, { L: this.myL, n: this.nick || 'Vos', bubble: this.myBubble }, x, y, o.c[3], o.c[0], cx, cy, 0);
      tall.push({ sy: y + cy, draw: (ctx) => {
        if (o.c) {
          const [type, model, color, ang] = o.c;
          const tk = o.c[5] ? VR.tuneKey(o.c[5]) : ''; if (!o.car || o.car.model !== model || o.car.type !== type || o.car.tk !== tk) { o.car = new VR.Car(VR.world || window.__vr.world, 0, 0, ang, color, type, model, o.c[5] || null); o.car.tk = tk; } if (type === 'moto') o.car.rider = { L: o.L };
          const v = o.car; v.px = v.x = x + cx; v.py = v.y = y + cy; v.pa = v.a = ang; v.siren = !!(o.c[4] & 4); this.fx(v, o.c[4]); v.draw(ctx, cx, cy, 1);
        } else {
          o.car = null;
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y - 1, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.drawImage(o.mv ? o.look.get(o.d, o.mv > 1 ? 'run' : 'walk', ((now / (o.mv > 1 ? 66 : 105)) | 0) % 8) : o.look.get(o.d, 'idle', 0), x - 8 * VR.PS, y - 31 * VR.PS, 16 * VR.PS, 32 * VR.PS);
        }
        const ty = o.c ? y - 22 : y - 38; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
        ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(o.n, x, ty); ctx.fillStyle = '#ffd84a'; ctx.fillText(o.n, x, ty);
        this.bubble(ctx, o, x + cx, y + cy - (o.c ? 6 : 8), cx, cy);
      } });
    }
  }
};
VR.Online.NEAR = 900; // px: más cerca que esto del anfitrión, se ve su tránsito y su gente
