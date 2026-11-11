// Motor de misiones del modo Historia (J2 de claude/misiones-plan.md, 10/11/2026).
// Las misiones son DATOS (VR.MISIONES, más abajo): pasos con un objetivo, a dónde ir o con quién hablar, diálogos con
// opciones, eventos que hay que juntar ("vendé 10 chipas") y premios. El motor (VR.Misiones) lleva una misión activa,
// pone el marcador en el GPS, en el piso y en el minimapa, guarda en cada paso y sabe fallar y reintentar.
// También: personajes en el mundo (VR.PERSONAJES), la caja de diálogo con carita (VR.Dialogo), los lugares con nombre
// (VR.Lugares) y los barrios por historia (VR.Barrios). Solo existe en Historia: en Libre, VR.mis = null.
//
// ---- Cómo se escribe una misión (receta; ver también TECNICO.md) ----
//   VR.MISIONES.id = { titulo, cap, desc, quien: 'kike' | auto: true, req: { cap, mis: ['m1'] },
//     oferta: [líneas]  (lo que dice quien la da; se responde "¡Dale!" o "Después"),
//     fallaSi: { hospital: 'motivo', arresto: 'motivo' },   // eventos que la hacen fallar (en cualquier paso)
//     pasos: [ { id, obj: 'texto del objetivo',
//               ir: 'lugar' | { x, y, name }, r: 40,             // llegar ahí (círculo en el piso + GPS)
//               hablar: 'personaje', charla: [líneas],           // hablar con alguien (ACCIÓN cerca)
//               dlg: [líneas],                                   // diálogo al empezar el paso (una sola vez)
//               esperar: { ev: 'venta', n: 10, txt: 'vendidas' },// juntar eventos (VR.mis.emit)
//               cond: (M) => bool,                               // o cualquier condición
//               limite: 90,                                      // segundos reales; si se acaba, falla
//               punto: true,                                     // punto de guardado para reintentar
//               changa: 'chipa',                                 // changa que el paso deja usar aunque esté cerrada
//               alEmpezar: (M, reanuda) => {}, alTerminar: (M) => {} } ],
//     premio: { plata, barrios: ['Yvaroty'], cap: 2, changas: ['delivery'], texto } }
//   Líneas de diálogo: ['quien', 'texto'] (quien = clave de VR.PERSONAJES, 'yo' o 'sis' para el sistema), o
//   { quien, txt, op: [['Opción', (M) => …], …] }. Una opción que devuelve false deja el paso como estaba.
//   Eventos que ya manda el juego: come, saldo, pieza, venta (chipa), cobro, subir, bajar, hospital, arresto, explota.
'use strict';

// ---------------- lugares con nombre ----------------
VR.Lugares = class {
  constructor(world) { this.world = world; this.c = {}; }
  label(re) { const l = (this.world.labels || []).find((x) => re.test(x.text)); return l ? { x: l.x, y: l.y } : null; }
  // un punto donde se puede estar parado, lo más cerca posible de (x, y)
  libre(x, y) {
    const W = this.world, PIE = [0, 2, 4, 7, 11, 12], ok = (px, py) => !W.hits(px - 16, py - 8, px + 16, py + 4) && PIE.includes(W.get(Math.floor(px / VR.TILE), Math.floor(py / VR.TILE))); // a pie: vereda, plaza o pasto, nunca en la calle
    if (ok(x, y)) return { x, y };
    for (let r = 4; r < 400; r += 4) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r); if (ok(px, py)) return { x: px, y: py }; }
    return { x, y };
  }
  base(k) {
    const W = this.world, L = (re, dy = 0) => { const p = this.label(re); return p && { x: p.x, y: p.y + dy }; };
    switch (k) {
      case 'pieza': return VR.vida && VR.vida.s.casa;
      case 'plaza': return L(/Plaza de los H/);
      case 'muni': return L(/^Municipalidad/, 40);
      case 'marimer': return L(/Marimer/, 30);
      case 'aopora': return L(/Ao Por/, 26);
      case 'parque': return L(/Parque Manuel/);
      case 'cisnes': return L(/Paseo en cisne/);
      case 'cuartel': return W.firehouse && { x: W.firehouse.x, y: W.firehouse.y + 20 };
      case 'catedral': return L(/^Catedral/, 30);
      case 'terminal': return L(/Terminal/);
      case 'cajero': { const d = (W.decals || []).find((x) => x.kind === 'cartel' && x.style === 'banco'); return d && { x: (d.x + d.w / 2) * VR.TILE, y: (d.y + 1) * VR.TILE + 12 }; } // frente al banco de la esquina noroeste
      case 'cajero2': { const c = VR.vida && VR.vida.s.casa; return c && { x: c.x - 150, y: c.y }; } // cajero de Santa Lucía, cerca de tu pieza
      case 'financiera': { const d = (W.decals || []).find((x) => x.kind === 'frente' && x.style === 'credito'); return d && { x: (d.x + 1) * VR.TILE, y: (d.y + d.h / 2) * VR.TILE }; } // la casona de cartel verde de la esquina sudoeste de la plaza
      case 'celulares': { const p = L(/Plaza de los H/); return p && { x: p.x - 420, y: p.y + 660 }; } // servicio técnico de celulares, en la vereda sur al sudoeste de la plaza (inventado)
      case 'despensa': { const p = L(/Plaza de los H/); return p && { x: p.x + 420, y: p.y + 660 }; } // J3: despensa chica en la vereda sur, al sudeste de la plaza (inventada)
    }
    return null;
  }
  // { x, y, name } de un lugar ('plaza'), con corrimiento opcional ({ en: 'plaza', dx, dy }) y ya en un punto libre
  get(k) {
    if (!k) return null;
    if (typeof k === 'object' && k.x != null) return k;
    const key = typeof k === 'string' ? k : k.en + ':' + (k.dx | 0) + ':' + (k.dy | 0);
    if (this.c[key]) return this.c[key];
    const nm = typeof k === 'string' ? k : k.en, b = this.base(nm); if (!b) return null;
    const p = this.libre(b.x + (k.dx || 0), b.y + (k.dy || 0));
    return (this.c[key] = { x: p.x, y: p.y, name: VR.LUGAR_NOMBRE[nm] || this.world.placeName(p.x, p.y) || nm });
  }
};
VR.LUGAR_NOMBRE = { financiera: 'Financiera', celulares: 'Celu Porã (servicio técnico)', cajero: 'Cajero (banco del Centro)', cajero2: 'Cajero (Santa Lucía)', despensa: 'Despensa Ñande Róga', pieza: 'tu pieza (Santa Lucía)', plaza: 'Plaza de los Héroes', muni: 'Municipalidad', marimer: 'Heladería Marimer', aopora: 'Ao Porã',
  parque: 'Parque Manuel Ortiz Guerrero', cisnes: 'Paseo en cisne', cuartel: 'Cuartel de bomberos', catedral: 'Catedral', terminal: 'Terminal de Ómnibus' };

// ---------------- barrios por historia ----------------
// Sin paredes: se puede ir a cualquier lado, pero en un barrio cerrado no hay changas ni misiones, el GPS no marca
// destinos y al entrar sale un cartel. Fuera de los 8 barrios ("Afueras") cuenta como abierto.
VR.BARRIOS_INICIO = ['Santa Lucía', 'Centro'];
VR.Barrios = {
  abiertos() { return VR.mis ? VR.mis.s.barrios : null; }, // null = todos (modo Libre)
  abierto(nombre) { const A = this.abiertos(); return !A || !nombre || nombre === 'Afueras' || A.includes(nombre); },
  enPunto(world, x, y) { return this.abierto(world.barrioName(x, y)); },
  abrir(nombre) { const A = this.abiertos(); if (A && !A.includes(nombre)) { A.push(nombre); if (VR.mis) VR.mis.save(); return true; } return false; },
  CARTEL: "Ndereikuaái gueteri avave ko'ápe",
};

// ---------------- personajes (todos inventados) ----------------
// lugar: dónde están si ninguna misión los mueve. charla: lo que dicen si les hablás sin nada pendiente.
VR.PERSONAJES = {
  yo: { nombre: 'Vos', color: '#ffd84a' },
  sis: { nombre: 'Villarrica', color: '#9fd8ff' },
  ramona: { nombre: 'Ña Ramona', color: '#f29ac8', lugar: { en: 'pieza', dx: 30, dy: 0 }, dir: 'left',
    look: { gender: 'f', skin: 2, build: 'panza', hair: 'rodete', hairColor: 5, top: 'camisaCorta', topColor: 7, bottom: 'pollera', bottomColor: 13, shoes: 'chinelas', shoesColor: 3, anteojos: true },
    charla: ['¿Ha upéi, mitã? Sábado pe che cobráta, ani nde resarái.', "Ko ára hakueterei, ¿nderehaʼúi piko tereré?"], menu: (M) => VR.menuRamona(M) },
  kike: { nombre: 'Kike', color: '#7fe08a', lugar: { en: 'plaza', dx: -150, dy: -60 }, dir: 'down',
    look: { gender: 'm', skin: 3, build: 'flaco', hair: 'corto', hairColor: 0, beard: 'bigote', top: 'musculosa', topColor: 2, bottom: 'bermuda', bottomColor: 3, shoes: 'chinelas', shoesColor: 3, hat: 'gorraAtras', hatColor: 0, termo: true },
    charla: ['Tengo una idea para hacernos ricos... después te cuento.', "¿Jaha jaikutu peteĩ tereré? Ko termo ro'ysã porã."] },
  chela: { nombre: 'Doña Chela', color: '#ffb36b', lugar: { en: 'plaza', dx: -130, dy: 90 }, dir: 'down',
    look: { gender: 'f', skin: 3, build: 'normal', hair: 'trenza', hairColor: 1, top: 'polo', topColor: 1, bottom: 'pollera', bottomColor: 10, shoes: 'chinelas', shoesColor: 1, hat: 'piri' },
    charla: ['¡Chipa, chipa calentita! Recién salida del tatakua.', "Ko'ãga ko'ãga ojehupi pyahu."], menu: (M) => VR.menuChela(M) },
  lucas: { nombre: 'Lucas', color: '#8fd0ff', lugar: { en: 'marimer', dx: 0, dy: 8 }, dir: 'down',
    look: { gender: 'm', skin: 1, build: 'normal', hair: 'flequillo', hairColor: 2, top: 'polo', topColor: 9, bottom: 'jean', bottomColor: 1, shoes: 'zapatillas', shoesColor: 1, hat: 'gorra', hatColor: 9 },
    charla: ['Hoy hay mucho movimiento, che.'] },
  benitez: { nombre: 'Suboficial Benítez', color: '#ffd84a', lugar: { en: 'cuartel', dx: 0, dy: 0 }, dir: 'down',
    look: { gender: 'm', skin: 2, build: 'fornido', hair: 'rapado', hairColor: 0, beard: 'bigote', top: 'campera', topColor: 5, topColor2: 3, bottom: 'cargo', bottomColor: 3, shoes: 'botines', hat: 'casco', hatColor: 5 },
    charla: ['Ore ndorekói sueldo, ñande ha\'e voluntario.'] },
  cirilo: { nombre: 'Don Cirilo', color: '#d8b0ff', lugar: null, dir: 'down',
    look: { gender: 'm', skin: 1, build: 'panza', hair: 'peinadoAtras', hairColor: 5, top: 'camisa', topColor: 1, bottom: 'vestir', bottomColor: 3, shoes: 'zapatos', lentes: true, reloj: true, cadenita: true },
    charla: ['Si necesitás algo, ya sabés dónde estoy.'] },
};

// ---------------- carita para los diálogos ----------------
VR.carita = (() => {
  const cache = new Map();
  return (look, key) => {
    if (key && cache.has(key)) return cache.get(key);
    const full = VR.av2Render(Object.assign({}, VR.AV2_DEFAULT, look), 'down', 'idle', 0, 4); // 64×128
    const c = VR.canvas(48, 48), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(full, 14, 1, 36, 36, 0, 0, 48, 48); // cabeza y hombros
    if (key) cache.set(key, c);
    return c;
  };
})();

// ---------------- caja de diálogo ----------------
// Pausa el juego. Avanza tocando la caja, con ACCIÓN/Espacio/Enter o el botón A del control; las opciones con
// el dedo, con 1–4 o con flechas + Enter (en el control, cruceta + A).
VR.Dialogo = {
  el: null, cola: null, i: 0, onEnd: null, sel: 0, abierto: false,
  init() {
    if (this.el) return;
    const d = document.createElement('div'); d.id = 'dlgBox'; d.hidden = true;
    d.innerHTML = '<div class="dlgIn"><canvas width="48" height="48"></canvas><div class="dlgTx"><b></b><p></p><div class="dlgOp"></div></div><i class="dlgMore">▼</i></div>';
    document.body.append(d); this.el = d; this.cv = d.querySelector('canvas'); this.nm = d.querySelector('b'); this.tx = d.querySelector('p'); this.op = d.querySelector('.dlgOp'); this.more = d.querySelector('.dlgMore');
    d.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; e.preventDefault(); this.next(); });
    addEventListener('keydown', (e) => {
      if (!this.abierto) return;
      const opts = this.op.querySelectorAll('button');
      if (opts.length) {
        const n = parseInt(e.key, 10); if (n >= 1 && n <= opts.length) { e.preventDefault(); opts[n - 1].click(); return; }
        if (/Arrow(Up|Left)|KeyW|KeyA/.test(e.code)) { this.pick(this.sel - 1); e.preventDefault(); return; }
        if (/Arrow(Down|Right)|KeyS|KeyD/.test(e.code)) { this.pick(this.sel + 1); e.preventDefault(); return; }
        if (/Enter|Space|KeyJ/.test(e.code)) { e.preventDefault(); if (performance.now() - this.opT > 350) opts[this.sel].click(); } // no elegir sin querer al saltar el texto
        return;
      }
      if (/Enter|Space|KeyJ|Escape/.test(e.code)) { e.preventDefault(); this.next(); }
    }, true);
  },
  pick(i) { const o = this.op.querySelectorAll('button'); if (!o.length) return; this.sel = (i + o.length) % o.length; o.forEach((b, k) => b.classList.toggle('sel', k === this.sel)); },
  // lineas: [['quien', 'texto'] | { quien, txt, op }]; ctx: lo que reciben las opciones (el motor de misiones)
  show(lineas, onEnd, ctx) {
    this.init(); this.cola = lineas.map((l) => Array.isArray(l) ? { quien: l[0], txt: l[1] } : l); this.i = 0; this.onEnd = onEnd; this.ctx = ctx;
    if (!this.cola.length) { if (onEnd) onEnd(); return; }
    this.abierto = true; this.el.hidden = false; this.wasPaused = VR.loop.paused; VR.input.releaseAll(); VR.input.enabled = false; VR.loop.paused = true;
    document.body.classList.add('dialogo'); this.line(); this.padLoop();
  },
  line() {
    const L = this.cola[this.i], P = VR.PERSONAJES[L.quien] || { nombre: L.quien, color: '#fff' };
    const look = L.quien === 'yo' ? (VR.myLook ? VR.myLook() : VR.AV2_DEFAULT) : P.look;
    const g = this.cv.getContext('2d'); g.clearRect(0, 0, 48, 48); this.cv.hidden = !look;
    if (look) g.drawImage(VR.carita(look, L.quien === 'yo' ? null : L.quien), 0, 0);
    this.nm.textContent = L.quien === 'sis' ? (L.titulo || '') : P.nombre; this.nm.style.color = P.color; this.nm.hidden = L.quien === 'sis' && !L.titulo;
    this.full = String(L.txt); this.n = 0; this.t0 = performance.now(); this.tx.textContent = ''; this.op.innerHTML = ''; this.more.hidden = true; this.sel = 0;
    this.el.classList.toggle('sis', L.quien === 'sis');
    if (VR.audio && VR.audio.blip) VR.audio.blip();
  },
  typing() { return this.n < this.full.length; },
  tickText() {
    if (!this.abierto) return;
    if (this.typing()) { this.n = Math.min(this.full.length, Math.floor((performance.now() - this.t0) / 1000 * 55) + 1); this.tx.textContent = this.full.slice(0, this.n); if (!this.typing()) this.done(); }
  },
  done() { // terminó de escribirse: muestra opciones o la flechita
    this.tx.textContent = this.full; const L = this.cola[this.i];
    if (L.op) { this.op.innerHTML = ''; L.op.forEach(([t, fn], k) => { const b = document.createElement('button'); b.textContent = (k + 1) + '. ' + t; b.onclick = (e) => { e.stopPropagation(); this.choose(fn); }; this.op.append(b); }); this.pick(0); this.opT = performance.now(); }
    else this.more.hidden = false;
  },
  next() {
    if (!this.abierto) return;
    if (this.typing()) { this.n = this.full.length; this.done(); return; }
    if (this.cola[this.i].op) return; // hay que elegir
    this.i++; if (this.i < this.cola.length) this.line(); else this.close();
  },
  choose(fn) {
    const r = fn ? fn(this.ctx) : undefined;
    if (Array.isArray(r)) { this.cola.splice(this.i + 1, 0, ...r.map((l) => Array.isArray(l) ? { quien: l[0], txt: l[1] } : l)); } // la opción puede agregar más líneas
    this.res = r; this.i++; if (this.i < this.cola.length) this.line(); else this.close();
  },
  close() {
    this.abierto = false; this.el.hidden = true; document.body.classList.remove('dialogo');
    VR.loop.paused = this.wasPaused; VR.input.releaseAll(); VR.input.enabled = true;
    const f = this.onEnd, r = this.res; this.onEnd = null; this.res = undefined; if (f) f(r);
  },
  // el loop del juego está en pausa: el texto y el control de consola se atienden acá
  padLoop() {
    let prevA = true, prevU = true, prevD = true;
    const step = () => {
      if (!this.abierto) return;
      this.tickText();
      const gp = navigator.getGamepads ? Array.from(navigator.getGamepads()).find(Boolean) : null;
      if (gp) {
        const p = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed), a = p(0), u = p(12) || (gp.axes[1] || 0) < -0.6, d = p(13) || (gp.axes[1] || 0) > 0.6;
        if (a && !prevA) { const o = this.op.querySelectorAll('button'); if (o.length && !this.typing()) { if (performance.now() - this.opT > 350) o[this.sel].click(); } else this.next(); }
        if (u && !prevU) this.pick(this.sel - 1); if (d && !prevD) this.pick(this.sel + 1);
        prevA = a; prevU = u; prevD = d;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },
};

// ---------------- el motor ----------------
VR.Misiones = class {
  constructor(o) { // o: { world, player, toast, setDest, getCar, vida, changas, banner }
    Object.assign(this, o);
    this.lug = new VR.Lugares(this.world); VR.lugares = this.lug;
    const d = { cap: 1, barrios: VR.BARRIOS_INICIO.slice(), act: null, hechas: [], changas: [] };
    const s = VR.store.get('mis', null); this.s = Object.assign(d, s || {});
    this.npcs = {}; this.hT = 0; this.hud = document.createElement('div'); this.hud.id = 'misHud'; this.hud.hidden = true; document.body.append(this.hud);
    this.ox = 0;
  }
  save() { if (!VR.wiped) VR.store.set('mis', this.s); }
  get act() { return this.s.act; }
  get mision() { return this.s.act && VR.MISIONES[this.s.act.id]; }
  get paso() { const m = this.mision; return m && m.pasos[this.s.act.paso]; }
  get vars() { return this.s.act ? this.s.act.v : {}; }
  hecha(id) { return this.s.hechas.includes(id); }
  changaOk(k) { const P = this.paso; return this.s.changas.includes(k) || !!(P && P.changa === k); } // abierta, o la usa el paso actual
  // ---- personajes ----
  npcLook(k) { const P = VR.PERSONAJES[k]; if (!this.npcs[k]) this.npcs[k] = VR.av2Lazy(P.look); return this.npcs[k]; }
  dondeEsta(k) { const a = this.s.act, mv = a && a.v.pos && a.v.pos[k]; const P = VR.PERSONAJES[k]; const l = mv || (P && P.lugar); return l ? this.lug.get(l) : null; }
  presentes() { // personajes que están en el mundo: en un barrio abierto, o que la misión necesita (el cuartel queda en Lomas Valentinas)
    const out = [];
    for (const k in VR.PERSONAJES) { if (k === 'yo' || k === 'sis') continue; const p = this.dondeEsta(k); if (p && (VR.Barrios.enPunto(this.world, p.x, p.y) || this.marca(k))) out.push([k, p]); }
    return out;
  }
  // qué tiene para vos cada personaje: 'paso' (te toca hablarle), 'oferta' (te da una misión) o nada
  marca(k) {
    const P = this.paso; if (P && P.hablar === k) return 'paso';
    if (!this.s.act) for (const id of this.disponibles()) if (VR.MISIONES[id].quien === k) return 'oferta';
    return null;
  }
  near(player) {
    let best = null, bd = 30;
    for (const [k, p] of this.presentes()) { const d = Math.hypot(p.x - player.x, p.y - player.y); if (d < bd) { bd = d; best = { k, x: p.x, y: p.y, nombre: VR.PERSONAJES[k].nombre }; } }
    for (const k in VR.PUNTOS) { const p = this.lug.get(VR.PUNTOS[k].lugar); if (!p) continue; const d = Math.hypot(p.x - player.x, p.y - player.y); if (d < bd) { bd = d; best = { k, punto: true, x: p.x, y: p.y, nombre: VR.PUNTOS[k].ico + ' ' + VR.PUNTOS[k].nombre }; } }
    return best;
  }
  // ACCIÓN cerca de un personaje
  talk(n, player) {
    const k = n.k, P = this.paso;
    if (n.punto) { this.dialogo(VR.PUNTOS[k].menu(this)); return; }
    const mk = this.marca(k);
    if (mk === 'paso') { this.dialogo(P.charla || [], () => { if (P.esperar || P.cond) return; this.siguiente(); }); return; }
    if (mk === 'oferta') { const id = this.disponibles().find((i) => VR.MISIONES[i].quien === k); this.ofrecer(id); return; }
    if (VR.PERSONAJES[k].menu) { this.dialogo(VR.PERSONAJES[k].menu(this)); return; }
    const ch = VR.PERSONAJES[k].charla || ['...']; this.bub = { k, text: ch[(this.ci = (this.ci || 0) + 1) % ch.length], t: 2.6 };
    void player;
  }
  dialogo(lineas, fin) { VR.Dialogo.show(lineas, (r) => { if (r !== false && fin) fin(r); }, this); }
  // ---- misiones disponibles ----
  disponibles() {
    const out = [];
    for (const id in VR.MISIONES) {
      const M = VR.MISIONES[id], r = M.req || {};
      if (this.hecha(id) || (this.s.act && this.s.act.id === id)) continue;
      if ((r.cap || 1) > this.s.cap) continue;
      if (r.mis && !r.mis.every((x) => this.hecha(x))) continue;
      out.push(id);
    }
    return out;
  }
  ofrecer(id) {
    const M = VR.MISIONES[id], quien = M.quien || 'sis';
    const ofe = (M.oferta || [[quien, M.desc]]).map((l) => Array.isArray(l) ? { quien: l[0], txt: l[1] } : { ...l });
    ofe[ofe.length - 1] = { ...ofe[ofe.length - 1], op: [['¡Dale! (empezar «' + M.titulo + '»)', () => true], ['Después', () => false]] };
    this.dialogo(ofe, () => this.empezar(id));
  }
  // ---- ciclo de una misión ----
  empezar(id) {
    const M = VR.MISIONES[id]; if (!M) return;
    this.s.act = { id, paso: 0, n: 0, t: 0, v: {}, check: 0, dlgOk: false };
    this.cartel('MISIÓN', M.titulo, 'cap. ' + (M.cap || 1));
    this.entrar(0, false);
  }
  entrar(i, reanuda) {
    const a = this.s.act, M = this.mision; if (!a || !M) return;
    const P = M.pasos[i]; a.paso = i;
    if (!reanuda) { a.n = 0; a.t = 0; a.dlgOk = false; if (P.punto) { a.check = i; a.vCheck = JSON.parse(JSON.stringify(a.v)); } }
    this.save();
    this.marcar();
    if (P.alEmpezar) P.alEmpezar(this, reanuda);
    const soloDlg = P.dlg && !P.ir && !P.hablar && !P.esperar && !P.cond;
    if (P.dlg && !a.dlgOk) { this._dlgPend = () => this.dialogo(P.dlg, () => { if (!this.s.act || this.s.act.paso !== i) return; a.dlgOk = true; this.save(); if (soloDlg) this.siguiente(); }); }
    else if (soloDlg) this.siguiente();
  }
  marcar() { // GPS al objetivo del paso
    const P = this.paso; if (!P) return;
    const t = this.objetivo(); if (t) this.setDest({ x: t.x, y: t.y, name: t.name, mis: 1 }, true);
  }
  objetivo() { const P = this.paso; if (!P) return null; if (P.ir) return this.lug.get(P.ir); if (P.hablar) { const p = this.dondeEsta(P.hablar); return p && { ...p, name: VR.PERSONAJES[P.hablar].nombre }; } return null; }
  siguiente() {
    const a = this.s.act, M = this.mision; if (!a || !M) return;
    const P = M.pasos[a.paso]; if (P.alTerminar) P.alTerminar(this);
    if (!this.s.act) return; // alTerminar pudo terminar o fallar la misión
    if (a.paso + 1 < M.pasos.length) { if (VR.audio && VR.audio.coin) VR.audio.coin(); this.entrar(a.paso + 1, false); }
    else this.cumplida();
  }
  cumplida() {
    const a = this.s.act, M = this.mision, pr = M.premio || {}; this.s.act = null;
    this.s.hechas.push(a.id);
    const out = [];
    if (pr.plata) { VR.Wallet.add(pr.plata, 'Misión «' + M.titulo + '»'); out.push('💵 +' + VR.fmtGs(pr.plata)); }
    for (const b of pr.barrios || []) if (VR.Barrios.abrir(b)) out.push('🗺 Barrio abierto: ' + b);
    for (const c of pr.changas || []) if (!this.s.changas.includes(c)) { this.s.changas.push(c); out.push('📋 Changa nueva: ' + (VR.CHANGA_NOMBRE[c] || c)); }
    if (pr.cap && pr.cap > this.s.cap) { this.s.cap = pr.cap; out.push('📖 Capítulo ' + pr.cap + ': ' + (VR.CAPITULOS[pr.cap] || '')); }
    if (pr.texto) out.push(pr.texto);
    this.save(); this.setDest(null, true); this.hud.hidden = true;
    this.cartel('MISIÓN CUMPLIDA', M.titulo);
    if (VR.audio && VR.audio.coin) { VR.audio.coin(); setTimeout(() => VR.audio.coin(), 160); }
    setTimeout(() => this.dialogo([{ quien: 'sis', titulo: '✔ ' + M.titulo, txt: out.join(' · ') || '¡Bien hecho!' }], () => this.auto()), 900);
  }
  fallar(motivo) {
    const a = this.s.act, M = this.mision; if (!a) return;
    this.cartel('MISIÓN FALLIDA', M.titulo); this.setDest(null, true);
    a.fallo = motivo; this.save();
    setTimeout(() => this.dialogo([{ quien: 'sis', titulo: '✖ ' + M.titulo, txt: motivo + '. ¿Probás de nuevo?', op: [['Reintentar desde el último punto', () => { this.reintentar(); }], ['Más tarde', () => { this.abandonar(true); }]] }]), 700);
  }
  reintentar() { const a = this.s.act; if (!a) return; a.fallo = null; a.v = a.vCheck ? JSON.parse(JSON.stringify(a.vCheck)) : a.v; this.entrar(a.check || 0, false); this.toast('🔁 Reintentando «' + this.mision.titulo + '»'); }
  abandonar(callado) { const a = this.s.act; if (!a) return; const M = this.mision; this.s.act = null; this.save(); this.setDest(null, true); this.hud.hidden = true; if (!callado) this.toast('Dejaste «' + M.titulo + '» para después'); }
  // misiones que arrancan solas (la primera de la Historia)
  auto() { if (this.s.act || (VR.Dialogo.abierto)) return; const id = this.disponibles().find((i) => VR.MISIONES[i].auto); if (id) this.empezar(id); }
  // ---- eventos del juego ----
  emit(ev, data) {
    const a = this.s.act, M = this.mision; if (!a || a.fallo) return;
    if (M.fallaSi && M.fallaSi[ev]) { this.fallar(M.fallaSi[ev]); return; }
    const P = this.paso; if (P.fallaSi && P.fallaSi[ev]) { this.fallar(P.fallaSi[ev]); return; }
    if (P.esperar && P.esperar.ev === ev && (!P.esperar.si || P.esperar.si(data, this))) {
      if (P.dlg && !a.dlgOk) return;
      a.n++; this.save(); this.hT = 0;
      if (a.n >= (P.esperar.n || 1)) this.siguiente();
    }
  }
  // ---- cada paso de lógica ----
  update(dt, player, car) {
    if (VR.Dialogo.abierto) return;
    if (this._dlgPend) { const f = this._dlgPend; this._dlgPend = null; f(); return; }
    if (this.bub) { this.bub.t -= dt; if (this.bub.t <= 0) this.bub = null; }
    const a = this.s.act, P = this.paso; if (!a || !P || a.fallo) { this.hud.hidden = true; return; }
    a.t += dt;
    if (P.dlg && !a.dlgOk) return;
    const f = car || player;
    if (P.limite && a.t > P.limite) { this.fallar('Se acabó el tiempo'); return; }
    if (P.ir && !P.hablar && !P.esperar && !P.cond) { const t = this.lug.get(P.ir); if (t && Math.hypot(f.x - t.x, f.y - t.y) < (P.r || 40)) { this.siguiente(); return; } }
    if (P.cond && P.cond(this, f)) { this.siguiente(); return; }
    // cartel del objetivo
    if ((this.hT -= dt) <= 0) {
      this.hT = 0.25; const M = this.mision;
      let tx = '📌 ' + M.titulo + ' · ' + (typeof P.obj === 'function' ? P.obj(this) : P.obj);
      if (P.esperar && P.esperar.n > 1) tx += ' (' + a.n + '/' + P.esperar.n + ')';
      if (P.limite) tx += ' · ⏱ ' + Math.max(0, Math.ceil(P.limite - a.t)) + ' s';
      if (this.hud.textContent !== tx) this.hud.textContent = tx; this.hud.hidden = false;
    }
  }
  // ---- dibujo ----
  drawGround(g, cx, cy) {
    const P = this.paso; if (!P || !P.ir || P.hablar || (this.s.act && this.s.act.fallo)) return;
    const t = this.lug.get(P.ir); if (!t) return;
    const x = t.x - cx, y = t.y - cy, s = performance.now() / 1000, r = Math.min(P.r || 40, 40) * 0.7 + Math.sin(s * 4) * 2;
    if (x < -60 || y < -60 || x > VR.screen.w + 60 || y > VR.screen.h + 60) return;
    g.save(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,95,162,.95)'; g.fillStyle = 'rgba(255,95,162,.2)';
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); g.setLineDash([4, 4]); g.beginPath(); g.arc(x, y, r - 6, 0, 7); g.stroke(); g.restore();
  }
  collect(cx, cy, tall, player) {
    const sw = VR.screen.w, sh = VR.screen.h, now = performance.now();
    for (const [k, p] of this.presentes()) {
      const x = Math.round(p.x - cx), y = Math.round(p.y - cy); if (x < -24 || y < -48 || x > sw + 24 || y > sh + 24) continue;
      const P = VR.PERSONAJES[k], L = this.npcLook(k), mk = this.marca(k);
      const dx = player.x - p.x, dy = player.y - p.y, dir = Math.hypot(dx, dy) < 70 ? (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')) : (P.dir || 'down');
      tall.push({ sy: p.y, draw: (g) => {
        g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y - 1, 5.5, 2.3, 0, 0, 7); g.fill();
        g.drawImage(L.get(dir, 'idle', 0), x - 8 * VR.PS, y - 31 * VR.PS, 16 * VR.PS, 32 * VR.PS);
        if (mk) { const b = Math.sin(now / 180) * 2.5, yy = y - 44 + b; g.save(); g.fillStyle = mk === 'paso' ? '#ff5fa2' : '#ffd84a'; g.strokeStyle = '#1a1a1e'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(x - 6, yy - 8); g.lineTo(x + 6, yy - 8); g.lineTo(x, yy); g.closePath(); g.stroke(); g.fill();
          if (mk === 'oferta') { g.fillStyle = '#1a1a1e'; g.fillRect(x - 1, yy - 7, 2, 3); } g.restore(); }
        if (this.bub && this.bub.k === k) VR.Player.prototype.drawBubble.call({ bubble: this.bub, px: p.x, x: p.x, py: p.y + 6, y: p.y + 6 }, g, cx, cy, 1);
        if (Math.hypot(dx, dy) < 90) VR.gfx.text(g, P.nombre, x, y + 3, P.color, { center: true, shadow: '#1a1a1e', size: 7 });
      } });
    }
  }
  collectPuntos(cx, cy, tall) {
    for (const k in VR.PUNTOS) { const D = VR.PUNTOS[k], p = this.lug.get(D.lugar); if (!p || !D.draw) continue; const x = Math.round(p.x - cx), y = Math.round(p.y - cy);
      if (x < -40 || y < -50 || x > VR.screen.w + 40 || y > VR.screen.h + 40) continue; tall.push({ sy: p.y - 6, draw: (g) => D.draw(g, x, y) }); }
  }
  // íconos para el minimapa y el mapa grande: { x, y, c (color), ico }
  marcas() {
    const out = [];
    for (const [k, p] of this.presentes()) { const mk = this.marca(k); if (mk) out.push({ x: p.x, y: p.y, c: mk === 'paso' ? '#ff5fa2' : '#ffd84a', ico: mk === 'paso' ? '▼' : '!', name: VR.PERSONAJES[k].nombre }); }
    const P = this.paso; if (P && P.ir && !P.hablar) { const t = this.lug.get(P.ir); if (t) out.push({ x: t.x, y: t.y, c: '#ff5fa2', ico: '●', name: t.name }); }
    for (const k in VR.PUNTOS) { const p = this.lug.get(VR.PUNTOS[k].lugar); if (p && !(P && P.ir === VR.PUNTOS[k].lugar)) out.push({ x: p.x, y: p.y, c: '#9fe0a0', ico: VR.PUNTOS[k].mini, name: VR.PUNTOS[k].nombre }); }
    return out;
  }
  cartel(chico, grande, sub) { if (this.banner) this.banner(chico, grande, sub); }
  // ---- para el menú (Pausa → Misiones) y el modo desarrollador ----
  resumen() {
    const a = this.s.act, M = this.mision, P = this.paso;
    return { act: a && { id: a.id, titulo: M.titulo, cap: M.cap, obj: P ? (typeof P.obj === 'function' ? P.obj(this) : P.obj) : '', paso: a.paso + 1, de: M.pasos.length, fallo: a.fallo },
      disp: this.disponibles().map((id) => { const X = VR.MISIONES[id]; const q = X.quien && this.dondeEsta(X.quien); return { id, titulo: X.titulo, cap: X.cap, quien: X.quien && VR.PERSONAJES[X.quien].nombre, auto: X.auto, donde: q && q.name, desc: X.desc }; }),
      hechas: this.s.hechas.map((id) => ({ id, titulo: (VR.MISIONES[id] || {}).titulo || id })), cap: this.s.cap, barrios: this.s.barrios };
  }
  marcarOferta(id) { const X = VR.MISIONES[id], q = X && X.quien && this.dondeEsta(X.quien); if (q) this.setDest({ x: q.x, y: q.y, name: VR.PERSONAJES[X.quien].nombre }, true); }
  saltar() { if (this.s.act && !VR.Dialogo.abierto) { this._dlgPend = null; this.siguiente(); } }
};
VR.CAPITULOS = { 1: "Pirapire'ỹ", 2: "Ñamopu'ã", 3: 'Tape pyahu', 4: "Mba'apo" };
VR.CHANGA_NOMBRE = { chipa: 'vender chipa', delivery: 'delivery de helados', taxi: 'taxista' };

// ======================================================================================================
// Misiones (datos). Diálogos en jopara de ejemplo: los revisa Leandro con el equipo antes de dejarlos fijos.
// ======================================================================================================
VR.MISIONES = {
  // M1 «Pirapire'ỹ» (cap. 1, tutorial). J3: canasto con stock y fiado de Doña Chela, despensa para el saldo, pieza.
  m1: {
    titulo: "Pirapire'ỹ", cap: 1, auto: true, desc: 'Sin plata en Santa Lucía: hay que pagar la pieza, comer y conseguir una changa.',
    fallaSi: { hospital: 'Te desmayaste y te llevaron al hospital' },
    pasos: [
      { id: 'ramona', obj: 'Hablá con Ña Ramona', hablar: 'ramona', punto: true,
        charla: [['ramona', "¡Mitã! Ko pieza nahániri gratis. Sábado pe che cobráta, ¿oíchepa? Ani reñemokañy."],
          ['yo', 'Sí, Ña Ramona... el sábado le pago.'],
          ['ramona', "Ha mba'éicha piko repagáta, nde pirapire'ỹ. Eho Centro-pe, oĩ hína tembiapo upépe. Ha ani rejapo tavy."]] },
      { id: 'centro', obj: 'Andá a pie a la Plaza de los Héroes', ir: 'plaza', r: 120, punto: true },
      { id: 'chipa', obj: 'Tenés hambre: comprale una chipa a Doña Chela', hablar: 'chela',
        charla: [{ quien: 'chela', txt: "¡Chipa, chipa calentita! ¿Mboýpa reipota, che memby?", op: [
          ['Una chipa (' + VR.fmtGs(5000) + ')', (M) => M.vida.come(VR.PRECIOS.chipa, 15, 'Chipa de Doña Chela') ? [['chela', 'Tomá, piro\'y porã. Ani rejapo pochy, ¿ajépa?']] : false],
          ['Ahora no', () => false]] }],
        esperar: { ev: 'come' } },
      { id: 'kike', obj: 'Kike está en la plaza con el tereré: andá a saludarlo', hablar: 'kike', punto: true,
        charla: [['kike', "¿Mba'éichapa, che ra'a? Nde rova piro'y… Ndarekói piko pirapire?"],
          ['yo', 'Nada, Kike. Me quedé sin changa y Ña Ramona me cobra el sábado.'],
          ['kike', "Jaha, Doña Chela oikotevẽ peteĩ vendedor. Vos tenés cara de vender chipa, che. ¡Eho!"]] },
      { id: 'chela2', obj: 'Pedile trabajo a Doña Chela', hablar: 'chela',
        charla: [['yo', 'Doña Chela, ¿necesita alguien que le venda chipa?'],
          ['chela', "Kike he'i ndéve, ¿ajépa? Bueno. El canasto sale " + VR.fmtGs(40000) + " y la chipa te la dejo a " + VR.fmtGs(3000) + ". Vos la vendés a " + VR.fmtGs(5000) + "."],
          ['yo', 'No me alcanza, Doña Chela...'],
          ['chela', "Ya sé, che memby. Te fío el canasto y 15 chipas. Me pagás con la venta, ¿ajépa? Ani rejapo tavy."],
          ['chela', 'Andá por la plaza y frente a la Municipalidad. Parate al lado de la gente y ofrecé. ¡Pero con ganas!']],
        alTerminar: (M) => { const V = M.vida; if (!V.s.canasto) { V.s.canasto = true; V.s.fiado += VR.PRECIOS.canasto; V.log(0, 'Canasto fiado ' + VR.fmtGs(VR.PRECIOS.canasto)); } V.llenaCanasto(15 - V.s.stock, true); M.toast('🧺 Canasto con ' + V.s.stock + ' chipas · le debés ' + VR.fmtGs(V.s.fiado) + ' a Doña Chela'); if (M.changas) M.changas.start('chipa', true); } },
      { id: 'vender', obj: 'Vendé las 15 chipas (ACCIÓN al lado de la gente)', esperar: { ev: 'venta', n: 15 }, punto: true, changa: 'chipa',
        alEmpezar: (M) => { const V = M.vida; if (V.s.stock < 15 - M.s.act.n) V.llenaCanasto(15 - M.s.act.n - V.s.stock, true); if (M.changas && !(M.changas.job && M.changas.job.k === 'chipa')) M.changas.start('chipa', true); } },
      { id: 'pagar', obj: 'Pagale a Doña Chela lo que le debés', hablar: 'chela', cond: (M) => M.vida.s.fiado <= 0,
        charla: [{ quien: 'chela', txt: "¿Ha? ¿Vendiste todo? Mbaʼeichaitépa.", op: [
          ['Pagarle lo que le debo', (M) => { const n = M.vida.pagaFiado(); return [['chela', M.vida.s.fiado <= 0 ? "¡Aguyje! Ko'ãga pe canasto nde mba'e. Cuando quieras más chipa, vení." : 'Me diste ' + VR.fmtGs(n) + '. Todavía me debés ' + VR.fmtGs(M.vida.s.fiado) + ', ¿eh?']]; }],
          ['Después', () => false]] }] },
      { id: 'saldo', obj: 'Cargá saldo en la despensa', ir: 'despensa', esperar: { ev: 'saldo' }, cond: (M) => M.vida.s.saldo > 0,
        dlg: [['kike', '¡Epa, vendiste todo! Cargá saldo al celular en la despensa, así te llegan changas por la app.']] },
      { id: 'volver', obj: 'Volvé a la pieza antes de la noche y hablá con Ña Ramona', hablar: 'ramona', punto: true,
        charla: [{ quien: 'ramona', txt: "¿Ha? ¿Ya volviste? Sábado pe che cobráta, pero si querés adelantar algo...", op: [
          ['Adelantarle lo que tengo', (M) => { const n = Math.min(VR.Wallet.get(), M.vida.s.pieza.saldo > 0 ? M.vida.s.pieza.saldo : VR.PRECIOS.pieza); if (n < 1000) return [['ramona', "Ndaipóri piko? Bueno, sábado pe."]]; M.vida.mueve(-n, 'Pieza (adelanto a Ña Ramona)'); M.vida.s.pieza.saldo -= n; return [['ramona', 'Me diste ' + VR.fmtGs(n) + ". ¡Aguyje, mitã! Rejapo porã."]]; }],
          ['El sábado le pago todo', () => [['ramona', 'Bueno... pero el sábado, ¿eh? Ani nde resarái.']]]] },
          ['ramona', 'Andá a dormir que mañana hay que madrugar. La pieza es la puerta de al lado.']] },
    ],
    premio: { changas: ['chipa'], texto: 'El canasto es tuyo: reponé chipa con Doña Chela y vendé cuando quieras (📋 Changas). Dormí en la pieza para guardar.' },
  },
};

// ---------------- J3: lugares para usar (despensa y pieza) y menús de Doña Chela y Ña Ramona ----------------
VR.DESPENSA = [['Chipa', 'chipa', 15], ['Empanada', 'empanada', 25], ['Mbeju', 'mbeju', 35], ['Plato del día', 'plato', 60]];
// préstamos (11/11/2026): q = 'banco' o 'financiera'. Cada opción devuelve el submenú siguiente.
VR.prestamoMenu = (M, q) => { const V = M.vida, C = VR.PREST[q], gs = VR.fmtGs, mis = V.s.prestamos.map((p, i) => [p, i]).filter(([p]) => p.q === q), op = [];
  const cond = q === 'banco' ? 'Pide estar sin deudas. ' : 'Presta a cualquiera, pero cobra caro y castiga la mora. ';
  for (const m of C.montos) op.push(['Pedir ' + gs(m) + ' (devolvés ' + gs(Math.round(m * (1 + C.interes) / 1000) * 1000) + ' en ' + C.sem + ' semanas)', () => {
    const mal = V.noPrestamo(q, m); if (mal) return [{ quien: 'sis', titulo: '🏦 ' + C.n, txt: mal, op: [['Volver', () => VR.prestamoMenu(M, q)], ['Salir', () => false]] }];
    const r = V.pidePrestamo(q, m); if (!r) return false;
    return [{ quien: 'sis', titulo: '🏦 ' + C.n, txt: 'Listo: ' + gs(m) + (q === 'banco' ? ' en tu billetera electrónica' : ' en efectivo') + '. Se descuenta una cuota de ' + gs(r.cuota) + ' cada sábado (' + C.sem + ' semanas). Si no alcanza, se atrasa y sube con la mora.', op: [['Aguyje', () => false]] }]; }]);
  for (const [p, i] of mis) op.push(['Pagar el préstamo (debés ' + gs(p.resta) + ')', () => { V.pagaPrestamo(i); return VR.prestamoMenu(M, q); }]);
  op.push(['Salir', () => false]);
  return [{ quien: 'sis', titulo: '🏦 ' + C.n + ': préstamos', txt: cond + 'Interés ' + Math.round(C.interes * 100) + ' % en ' + C.sem + ' semanas. Debés en préstamos: ' + gs(V.prestamosResta()) + '.', op }]; };
VR.cajeroMenu = (M) => { const V = M.vida, e = VR.Wallet.get(), b = V.s.banco, op = [];
  if (e > 0) op.push(['Depositar todo el efectivo (' + VR.fmtGs(e) + ')', () => { V.deposita(e); return false; }]);
  for (const n of [50000, 100000]) if (b >= n) op.push(['Sacar ' + VR.fmtGs(n), () => { V.retira(n); return false; }]);
  if (b > 0) op.push(['Sacar todo (' + VR.fmtGs(b) + ')', () => { V.retira(b); return false; }]);
  op.push(['🏦 Préstamos del banco', () => VR.prestamoMenu(M, 'banco')]);
  op.push(['Salir', () => false]);
  return [{ quien: 'sis', titulo: '🏧 Cajero', txt: 'Efectivo: ' + VR.fmtGs(e) + ' · Billetera electrónica: ' + VR.fmtGs(b), op }]; };
// servicio técnico de celulares: cambiar la pantalla rota o comprar uno nuevo
VR.celularesMenu = (M) => { const V = M.vida, gs = VR.fmtGs, P = VR.PRECIOS;
  if (!V.celuRoto()) return [{ quien: 'sis', titulo: '📱 Celu Porã', txt: 'Tu celular anda bien. Cuando se rompa, pasá por acá.', op: [['Aguyje', () => false]] }];
  return [{ quien: 'sis', titulo: '📱 Celu Porã', txt: 'Tu pantalla está hecha pedazos. Tenés ' + gs(VR.Wallet.get()) + ' en efectivo.', op: [
    ['Cambiar la pantalla · ' + gs(P.celuArreglo), () => { V.arreglaCelu(); return false; }],
    ['Celular nuevo · ' + gs(P.celuNuevo), () => { V.compraCelu(); return false; }],
    ['Después vuelvo', () => false]] }]; };
VR.drawCajero = (g, x, y) => { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 6, y - 1, 13, 3); g.fillStyle = '#3a4a5a'; g.fillRect(x - 6, y - 20, 12, 20); g.fillStyle = '#6d8fb0'; g.fillRect(x - 5, y - 19, 10, 6); g.fillStyle = '#9fe0ff'; g.fillRect(x - 4, y - 18, 8, 4); g.fillStyle = '#20262e'; g.fillRect(x - 4, y - 11, 8, 3); g.fillStyle = '#c8d0d8'; g.fillRect(x - 3, y - 7, 6, 2); VR.gfx.text(g, '🏧', x, y - 24, '#fff', { center: true, size: 7 }); };
VR.drawCelulares = (g, x, y) => { // puesto chico: mostrador azul, toldo celeste y blanco, celulares en vitrina
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 15, y - 2, 32, 5);
  g.fillStyle = '#3a6ea8'; g.fillRect(x - 14, y - 12, 28, 12); g.fillStyle = '#2a5688'; g.fillRect(x - 14, y - 4, 28, 4);
  g.fillStyle = '#9fd4ff'; g.fillRect(x - 12, y - 11, 24, 6); g.fillStyle = '#dff1ff'; g.fillRect(x - 12, y - 11, 24, 1);
  g.fillStyle = '#20262e'; for (let i = 0; i < 4; i++) g.fillRect(x - 10 + i * 6, y - 10, 3, 5);
  for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#4aa8ff'; g.fillRect(x - 15 + i * 4.6, y - 20, 5, 7); }
  g.fillStyle = '#26262c'; g.fillRect(x - 15, y - 21, 31, 1);
  g.fillStyle = '#ff5a5a'; g.fillRect(x + 8, y - 17, 3, 3);
};
VR.PUNTOS = {
  cajero: { lugar: 'cajero', nombre: 'Cajero', ico: '🏧', mini: '¤', menu: (M) => VR.cajeroMenu(M), draw: VR.drawCajero },
  cajero2: { lugar: 'cajero2', nombre: 'Cajero', ico: '🏧', mini: '¤', menu: (M) => VR.cajeroMenu(M), draw: VR.drawCajero },
  financiera: { lugar: 'financiera', nombre: 'Financiera', ico: '💰', mini: '₲', menu: (M) => VR.prestamoMenu(M, 'financiera') },
  celulares: { lugar: 'celulares', nombre: 'Celu Porã', ico: '📱', mini: '☎', menu: (M) => VR.celularesMenu(M), draw: VR.drawCelulares },
  despensa: { lugar: 'despensa', nombre: 'Despensa Ñande Róga', ico: '🛒', mini: '$',
    menu: (M) => [{ quien: 'sis', titulo: '🛒 Despensa Ñande Róga', txt: '¿Qué llevás? Tenés ' + VR.fmtGs(VR.Wallet.get()) + '.', op: [
      ...VR.DESPENSA.map(([n, k, h]) => [n + ' · ' + VR.fmtGs(VR.PRECIOS[k]), () => { M.vida.come(VR.PRECIOS[k], h, n); return false; }]),
      ['Saldo del celular (3 días) · ' + VR.fmtGs(VR.PRECIOS.saldo), () => { M.vida.cargaSaldo(); return false; }],
      ['Nada, gracias', () => false]] }],
    draw: (g, x, y) => { // puesto chico: mostrador, toldo a rayas verde y blanco, cajones con frutas y gaseosas
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 15, y - 2, 32, 5);
      g.fillStyle = '#7a5434'; g.fillRect(x - 14, y - 14, 28, 13); g.fillStyle = '#5a3c22'; g.fillRect(x - 14, y - 3, 28, 2);
      for (let i = 0; i < 4; i++) { g.fillStyle = ['#d8452e', '#f0c838', '#3f9a3a', '#e88a2a'][i]; g.fillRect(x - 12 + i * 6, y - 13, 5, 4); }
      g.fillStyle = '#2a5ab0'; for (let i = 0; i < 6; i++) g.fillRect(x - 12 + i * 4, y - 19, 2, 5);
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f2efe6' : '#2f9a52'; g.fillRect(x - 17 + i * 4.25, y - 29, 4.25, 9); }
      g.fillStyle = '#1e6a38'; g.fillRect(x - 17, y - 21, 34, 2);
      VR.gfx.text(g, 'DESPENSA', x, y - 33, '#fff6d8', { center: true, shadow: '#1a1a1e', size: 7 });
    } },
  pieza: { lugar: 'pieza', nombre: 'Tu pieza', ico: '🏠', mini: '⌂',
    menu: (M) => { const V = M.vida, P = V.s.pieza;
      if (P.fuera) return [['ramona', 'Ndaikatúi reike, mitã. Primero pagame lo que me debés: ' + VR.fmtGs(P.saldo) + '.']];
      return [{ quien: 'sis', titulo: '🏠 Tu pieza', txt: V.diaSemana + ' ' + V.hhmm + '. ' + (V.puedeDormir() ? 'Ya se puede dormir hasta las 6:00 (se guarda la partida).' : 'Dormir se puede desde las 18:00.'), op: [
        ['😴 Dormir hasta las 6:00', () => { V.dormir(); return false; }], ['Salir', () => false]] }]; },
    draw: (g, x, y) => { // felpudo y cartelito con el número de la pieza
      g.fillStyle = '#8a3a2a'; g.fillRect(x - 6, y - 4, 12, 5); g.fillStyle = '#b05a3a'; g.fillRect(x - 5, y - 3, 10, 3);
      VR.gfx.text(g, '🏠', x, y - 10, '#fff', { center: true, size: 7 });
    } },
};
VR.menuChela = (M) => { const V = M.vida, P = VR.PRECIOS, falta = P.canastoMax - V.s.stock, op = [];
  op.push(['Una chipa para comer · ' + VR.fmtGs(P.chipa), () => { V.come(P.chipa, 15, 'Chipa de Doña Chela'); return false; }]);
  if (!V.s.canasto) op.push(['Comprar el canasto · ' + VR.fmtGs(P.canasto), () => { if (!V.gasta(P.canasto, 'Canasto de Doña Chela')) return false; V.s.canasto = true; return [['chela', '¡Ko canasto nde mba\'e! Llenalo y a vender.']]; }]);
  else if (falta > 0) op.push(['Llenar el canasto (' + falta + ' × ' + VR.fmtGs(P.chipaMayor) + ')', () => { const n = Math.min(falta, Math.floor(VR.Wallet.get() / P.chipaMayor)); if (n <= 0) return [['chela', 'Sin plata no hay chipa, che memby.']]; V.llenaCanasto(n, false); return [['chela', 'Ahí tenés ' + n + ' chipas. Ahora tenés ' + V.s.stock + ' en el canasto.']]; }]);
  if (V.s.fiado > 0) op.push(['Pagarle lo que le debo (' + VR.fmtGs(V.s.fiado) + ')', () => { V.pagaFiado(); return [['chela', V.s.fiado > 0 ? 'Todavía me debés ' + VR.fmtGs(V.s.fiado) + '.' : '¡Aguyje! Estamos a mano.']]; }]);
  op.push(['Nada, Doña Chela', () => false]);
  return [{ quien: 'chela', txt: '¡Chipa, chipa calentita! ¿Mba\'épa reipota?' + (V.s.canasto ? ' (canasto: ' + V.s.stock + '/' + P.canastoMax + ')' : ''), op }];
};
VR.menuRamona = (M) => { const P = M.vida.s.pieza, op = [];
  op.push([P.saldo > 0 ? 'Pagarle lo que le debo (' + VR.fmtGs(P.saldo) + ')' : 'Adelantarle la semana (' + VR.fmtGs(VR.PRECIOS.pieza) + ')', () => { M.vida.pagaPieza(); return false; }]);
  op.push(['Nada, Ña Ramona', () => false]);
  return [{ quien: 'ramona', txt: P.fuera ? 'Tus cosas están en la vereda, mitã. Pagame y entrás.' : P.saldo > 0 ? '¿Y la plata de la pieza, mitã?' : '¿Mba\'éichapa, mitã? ¿Comiste algo?', op }];
};
