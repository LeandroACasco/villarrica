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
    const W = this.world, ok = (px, py) => !W.hits(px - 4, py - 4, px + 4, py) && W.get(Math.floor(px / VR.TILE), Math.floor(py / VR.TILE)) !== VR.T.WATER;
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
VR.LUGAR_NOMBRE = { pieza: 'tu pieza (Santa Lucía)', plaza: 'Plaza de los Héroes', muni: 'Municipalidad', marimer: 'Heladería Marimer', aopora: 'Ao Porã',
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
  ramona: { nombre: 'Ña Ramona', color: '#f29ac8', lugar: { en: 'pieza', dx: 14, dy: 0 }, dir: 'left',
    look: { gender: 'f', skin: 2, build: 'panza', hair: 'rodete', hairColor: 5, top: 'camisaCorta', topColor: 7, bottom: 'pollera', bottomColor: 13, shoes: 'chinelas', shoesColor: 3, anteojos: true },
    charla: ['¿Ha upéi, mitã? Sábado pe che cobráta, ani nde resarái.', "Ko ára hakueterei, ¿nderehaʼúi piko tereré?"] },
  kike: { nombre: 'Kike', color: '#7fe08a', lugar: { en: 'plaza', dx: -150, dy: -60 }, dir: 'down',
    look: { gender: 'm', skin: 3, build: 'flaco', hair: 'corto', hairColor: 0, beard: 'bigote', top: 'musculosa', topColor: 2, bottom: 'bermuda', bottomColor: 3, shoes: 'chinelas', shoesColor: 3, hat: 'gorraAtras', hatColor: 0, termo: true },
    charla: ['Tengo una idea para hacernos ricos... después te cuento.', "¿Jaha jaikutu peteĩ tereré? Ko termo ro'ysã porã."] },
  chela: { nombre: 'Doña Chela', color: '#ffb36b', lugar: { en: 'plaza', dx: -130, dy: 90 }, dir: 'down',
    look: { gender: 'f', skin: 3, build: 'normal', hair: 'trenza', hairColor: 1, top: 'polo', topColor: 1, bottom: 'pollera', bottomColor: 10, shoes: 'chinelas', shoesColor: 1, hat: 'piri' },
    charla: ['¡Chipa, chipa calentita! Recién salida del tatakua.', "Ko'ãga ko'ãga ojehupi pyahu."] },
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
        if (/Enter|Space|KeyJ/.test(e.code)) { e.preventDefault(); opts[this.sel].click(); }
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
    if (L.op) { this.op.innerHTML = ''; L.op.forEach(([t, fn], k) => { const b = document.createElement('button'); b.textContent = (k + 1) + '. ' + t; b.onclick = (e) => { e.stopPropagation(); this.choose(fn); }; this.op.append(b); }); this.pick(0); }
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
        if (a && !prevA) { const o = this.op.querySelectorAll('button'); if (o.length && !this.typing()) o[this.sel].click(); else this.next(); }
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
    return best;
  }
  // ACCIÓN cerca de un personaje
  talk(n, player) {
    const k = n.k, P = this.paso, mk = this.marca(k);
    if (mk === 'paso') { this.dialogo(P.charla || [], () => { if (P.esperar || P.cond) return; this.siguiente(); }); return; }
    if (mk === 'oferta') { const id = this.disponibles().find((i) => VR.MISIONES[i].quien === k); this.ofrecer(id); return; }
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
        g.drawImage(L.get(dir, 'idle', 0), x - 8, y - 31, 16, 32);
        if (mk) { const b = Math.sin(now / 180) * 2.5, yy = y - 44 + b; g.save(); g.fillStyle = mk === 'paso' ? '#ff5fa2' : '#ffd84a'; g.strokeStyle = '#1a1a1e'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(x - 6, yy - 8); g.lineTo(x + 6, yy - 8); g.lineTo(x, yy); g.closePath(); g.stroke(); g.fill();
          if (mk === 'oferta') { g.fillStyle = '#1a1a1e'; g.fillRect(x - 1, yy - 7, 2, 3); } g.restore(); }
        if (this.bub && this.bub.k === k) VR.Player.prototype.drawBubble.call({ bubble: this.bub, px: p.x, x: p.x, py: p.y + 6, y: p.y + 6 }, g, cx, cy, 1);
        if (Math.hypot(dx, dy) < 90) VR.gfx.text(g, P.nombre, x, y + 3, P.color, { center: true, shadow: '#1a1a1e', size: 7 });
      } });
    }
  }
  // íconos para el minimapa y el mapa grande: { x, y, c (color), ico }
  marcas() {
    const out = [];
    for (const [k, p] of this.presentes()) { const mk = this.marca(k); if (mk) out.push({ x: p.x, y: p.y, c: mk === 'paso' ? '#ff5fa2' : '#ffd84a', ico: mk === 'paso' ? '▼' : '!', name: VR.PERSONAJES[k].nombre }); }
    const P = this.paso; if (P && P.ir && !P.hablar) { const t = this.lug.get(P.ir); if (t) out.push({ x: t.x, y: t.y, c: '#ff5fa2', ico: '●', name: t.name }); }
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
  // M1 «Pirapire'ỹ» (cap. 1, tutorial). Versión J2: usa la changa de chipa que ya existe. En J3 llegan el canasto con
  // stock, el fiado de Doña Chela y la despensa para el saldo (por ahora el saldo se carga desde la Billetera).
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
          ['chela', "Kike he'i ndéve, ¿ajépa? Bueno. Ko canasto... te lo presto hoy, mañana hablamos de plata."],
          ['chela', 'Andá por la plaza y frente a la Municipalidad. Parate al lado de la gente y ofrecé. ¡Pero con ganas!']],
        alTerminar: (M) => { if (M.changas) M.changas.start('chipa', true); } },
      { id: 'vender', obj: 'Vendé chipa a la gente (ACCIÓN al lado de alguien)', esperar: { ev: 'venta', n: 10 }, punto: true, changa: 'chipa',
        alEmpezar: (M) => { if (M.changas && !(M.changas.job && M.changas.job.k === 'chipa')) M.changas.start('chipa', true); } },
      { id: 'saldo', obj: 'Cargá saldo en el celular (Pausa → Billetera)', esperar: { ev: 'saldo' },
        cond: (M) => M.vida.s.saldo > 0,
        dlg: [['kike', '¡Epa, vendiste todo! Ahora cargá saldo al celular, así te llegan changas por la app.']] },
      { id: 'volver', obj: 'Volvé a la pieza y hablá con Ña Ramona', hablar: 'ramona', punto: true,
        charla: [{ quien: 'ramona', txt: "¿Ha? ¿Ya volviste? Sábado pe che cobráta, pero si querés adelantar algo...", op: [
          ['Adelantarle ' + VR.fmtGs(50000), (M) => { const P = M.vida.s.pieza; if (VR.Wallet.get() < 50000) return [['ramona', "Ndaipóri piko? Bueno, sábado pe."]]; M.vida.mueve(-50000, 'Pieza (adelanto a Ña Ramona)'); P.saldo -= 50000; return [['ramona', "¡Aguyje, mitã! Rejapo porã. Ko'ẽrõ peve."]]; }],
          ['El sábado le pago todo', () => [['ramona', 'Bueno... pero el sábado, ¿eh? Ani nde resarái.']]]] }] },
    ],
    premio: { changas: ['chipa'], texto: 'Ya podés vender chipa cuando quieras (📋 Changas). Sigue en la etapa J3: canasto propio y despensa.' },
  },
};
