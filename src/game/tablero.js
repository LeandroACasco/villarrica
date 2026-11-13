// Tablero del vehículo, nafta y llantas (13/11/2026, pedido de Leandro).
// - Mini tablero (`#tab`, debajo del minimapa): velocidad, marcha, nafta (barra + litros), vida de la chapa, las dos
//   llantas (delantera/trasera), autonomía, viaje y los datos reales del modelo (cilindrada, HP, tanque).
// - Nafta: se gasta según lo que andás (km/L de cada modelo, exagerado ×FK para que se note en una partida); en la
//   reserva el motor tose y sin nafta se apaga: no acelera más. Se carga en el taller o con un bidón (tocando ⛽).
// - Llantas: pueden pincharse (más en tierra y empedrado, más si están gastadas, y con choques fuertes). Con una llanta
//   baja el vehículo pierde velocidad y agarre; la delantera tira para un costado y la trasera culea. Se arregla en el
//   taller o con un parche en el lugar (tocando 🛞, parado).
// Todo vive en el vehículo: `fuel` (litros), `tq` ({f, r}: presión 0..1), `wear` (0..1), `dist` (metros) y `fixT`.
// Solo gasta el que maneja el jugador (`driven`): el tránsito no calcula nada de esto.
'use strict';
(function () {
  const PRECIO_L = 4000;            // Gs. por litro (precio de juego; el balance fino queda para J7)
  const PARCHE = 12000, BIDON_L = 2, BIDON = 18000;
  // Datos de las fichas reales (kenton.com.py): cc, HP, tanque (L), peso (kg), frenos, llantas, transmisión.
  // `kml` = km por litro (estimado: la ficha no lo trae) y `fk` = cuánto se exagera el gasto en el juego.
  const FICHA = {
    cub:   { cc: 125, hp: 8.8, tank: 4,    kg: 92,  kml: 45, fk: 6, frenos: 'Disco + tambor', llantas: '2.50-17 / 2.72-17', trans: 'Semiautomática' },
    mini:  { cc: 150, hp: 8.3, tank: 9.5,  kg: 92,  kml: 38, fk: 6, frenos: 'Disco + tambor', llantas: '90/90-12 / 3.50-10', trans: 'Automática' },
    calle: { cc: 150, hp: 11.3, tank: 15,  kg: 120, kml: 35, fk: 6, frenos: 'Disco + tambor', llantas: '2.75-18 / 100/90-18', trans: 'Manual de 5' },
    carga: { cc: 175, hp: 12.3, tank: 18,  kg: null, kml: 22, fk: 6, frenos: 'Tambor', llantas: '4.50-12', trans: 'Mecánica', nm: 12.5 },
    bici:  { bici: true, tank: 100, kml: 1, fk: 1, kg: 14, frenos: 'Zapata', llantas: '27 × 1,75' },
    pati:  { bat: true, tank: 100, kml: 0.25, fk: 1.5, kg: 14, hp: 0.5 },
  };
  const ficha = (c) => {
    if (c.spec.noFire) return null;                       // el karumbe es un caballo: no tiene nafta ni llantas de goma
    if (c.type === 'moto' && FICHA[c.model]) return FICHA[c.model];
    const m = c.spec.mass || 1;                           // autos y camiones: se estima con la masa
    return c._fi || (c._fi = { cc: null, tank: Math.round(32 + m * 12), kml: Math.max(3.5, 11 / Math.sqrt(m)), fk: 8, diesel: m > 2 });
  };
  VR.fichaTxt = (c) => {
    const f = ficha(c); if (!f) return '';
    if (f.bici) return 'Pedal · ' + f.kg + ' kg · llantas ' + f.llantas;
    if (f.bat) return 'Eléctrica · batería para ~' + Math.round(f.tank * f.kml) + ' km';
    return (f.cc ? f.cc + ' cc · ' + String(f.hp).replace('.', ',') + ' HP · ' : '') + 'tanque ' + String(f.tank).replace('.', ',') + ' L' + (f.kg ? ' · ' + f.kg + ' kg' : '');
  };
  const ROUGH = (T) => ({ [T.ROAD]: 1 / 14000, [T.STONE]: 1 / 6500, [T.DIRTROAD]: 1 / 3500, [T.DIRT]: 1 / 3500, [T.PLAZADIRT]: 1 / 3500, [T.GRASS]: 1 / 3000 });
  let rough = null;

  // ---------------------------------------------------------------- estado del vehículo
  const ensure = (c) => {
    if (c.tq) return true;
    const f = ficha(c); if (!f) { c.tq = null; return false; }
    c.fuel = f.tank * (0.4 + Math.random() * 0.5); c.tq = { f: 1, r: 1 }; c.wear = Math.random() * 0.3; c.dist = 0; c.fixT = 0; c._hp0 = c.hp;
    return true;
  };
  const pmin = (c) => c.tq ? Math.min(c.tq.f, c.tq.r) : 1;
  const flat = (c) => c.tq && (c.tq.f < 0.5 || c.tq.r < 0.5);
  const range = (c) => { const f = ficha(c); return f ? c.fuel * f.kml / f.fk : 0; };   // km de juego que quedan
  const say = (m) => VR.toast && VR.toast(m);
  const buzz = (n) => VR.input && VR.input.buzz && VR.input.buzz(n);

  const Tab = VR.Tab = {
    ficha, ensure, range,
    // llamado desde la física del vehículo que maneja el jugador; devuelve [acelerador, volante]
    tick(c, dt, th, st, brake) {
      if (!ensure(c)) return [th, st];
      const f = ficha(c), T = VR.T, t = performance.now() / 1000;
      if (c._carga) {                                                  // cargando: quieto, el surtidor corre
        th = 0; st = 0; c.v *= 0.8;
        const dl = Math.min(1.2 * dt, f.tank - c.fuel), cost = (c._carga.l + dl) * PRECIO_L;
        if (Math.abs(c.v) > 25 || !Tab.enSurtidor(c)) Tab.fin(c, 'Te fuiste');
        else if (cost > VR.Wallet.get()) Tab.fin(c, 'Se acabó la plata');
        else { c.fuel += dl; c._carga.l += dl; if (c.fuel >= f.tank - 0.01) { c.fuel = f.tank; Tab.fin(c, 'Tanque lleno'); } }
      }
      if (!rough) rough = ROUGH(T);
      const step = Math.abs(c.v) / VR.TILE * 2 * dt;                  // metros recorridos en este cuadro
      c.dist += step;
      // arreglo en el lugar: el vehículo queda quieto hasta terminar
      if (c.fixT > 0) { c.fixT -= dt; th = 0; st = 0; if (c.fixT <= 0) { c.tq.f = c.tq.r = 1; c.wear = Math.min(c.wear, 0.5); say('🛞 Listo, la llanta quedó como nueva.'); VR.audio && VR.audio.coin && VR.audio.coin(); } }
      // nafta: gasta más si acelerás; parado con el motor prendido gasta un poquito
      if (f.bici) {                                                    // bici: el "tanque" es el aliento; pedalear fuerte lo gasta, rodar lo recupera
        const hard = th > 0.5 && Math.abs(c.v) > 8 ? th : 0;
        c.fuel = Math.max(0, Math.min(100, c.fuel + (hard ? -2.2 * hard : 4) * dt));
        if (c.fuel <= 0 && !c._ahog) { c._ahog = true; say('💪 ¡Sin aliento! Soltá un rato y recuperá.'); }
        if (c.fuel > 25) c._ahog = false;
        if (c._ahog && th > 0) th *= 0.3;
      }
      const use = f.bici ? 0 : step / 1000 / f.kml * f.fk * (1 + 0.5 * Math.max(0, th)) + f.tank * dt / 2400;
      if (f.bici) { /* arriba */ } else if (c.fuel > 0) { c.fuel = Math.max(0, c.fuel - use); if (c.fuel === 0) { say(f.bat ? '🔋 ¡Sin batería! Tocá el ⛽ del tablero para una carga de emergencia.' : '⛽ ¡Te quedaste sin nafta! Tocá el ⛽ del tablero para pedir un bidón.'); buzz(40); } }
      if (f.bici) { /* sin reserva */ }
      else if (c.fuel <= 0) { if (th > 0) th = 0; }
      else if (c.fuel < f.tank * 0.07 && th > 0 && Math.sin(t * 13) > 0.78) th = 0;   // reserva: el motor tose
      // llantas: desgaste y pinchaduras
      const tile = c.world.get(Math.floor(c.x / VR.TILE), Math.floor(c.y / VR.TILE));
      c.wear = Math.min(1, c.wear + step / 250000 * (brake && step > 0.3 ? 3 : 1));
      if (!flat(c) && step > 0) {
        const haz = (rough[tile] || 1 / 9000) * (1 + 2.5 * c.wear) * step;
        const hit = (c._hp0 - c.hp) > 9 ? 0.15 : 0;                 // un golpe fuerte también puede pinchar
        if (Math.random() < haz + hit) { const w = Math.random() < 0.5 ? 'f' : 'r'; c.tq[w] = 0.98; c.leak = Math.random() < 0.5 ? 1 / 5 : 1 / 30; c.pull = Math.random() < 0.5 ? -1 : 1; say('🛞 ¡Pinchaste la llanta ' + (w === 'f' ? 'delantera' : 'trasera') + '! Frená y tocá el 🛞 del tablero.'); buzz(70); }
      }
      c._hp0 = c.hp;
      for (const w of ['f', 'r']) if (c.tq[w] < 0.99 && c.tq[w] > 0) c.tq[w] = Math.max(0, c.tq[w] - dt * (c.leak || 0.2));
      // efecto de la llanta baja
      const bad = 1 - pmin(c), sp = Math.min(1, Math.abs(c.v) / 90);
      if (bad > 0.02) {
        if (th > 0 && c.v > c.topSpeed()[0]) th = 0;                                           // con la llanta baja no pasa del tope reducido
        if (c.tq.f < 0.99) st = st * (1 - 0.45 * bad) + (c.pull || 1) * 0.25 * bad * sp;      // la delantera tira para un costado
        if (c.tq.r < 0.99) st += Math.sin(t * 8) * 0.32 * bad * sp;                           // la trasera culea
        if (Math.random() < 0.3 * bad * sp) c.hit = Math.max(c.hit, 0.05);                    // sacudón visible
      }
      return [th, st];
    },
    maxFactor(c) { return c.tq ? 0.35 + 0.65 * pmin(c) : 1; },
    // servicio completo (taller): llena el tanque, arregla las llantas; devuelve el texto o null si no hace falta
    servicio(c) {
      if (!ensure(c)) return { msg: 'A este no hay nada que cargarle.' };
      const f = ficha(c), litros = f.bici ? 0 : Math.max(0, f.tank - c.fuel), costoL = Math.round(litros * PRECIO_L / 500) * 500;
      const llantas = flat(c) || c.wear > 0.7, costoT = (flat(c) ? 8000 : 0) + (c.wear > 0.7 ? 20000 : 0);
      const n = costoL + costoT; if (n < 1) return { msg: 'Tanque lleno y llantas bien. No hay nada que hacer.' };
      if (n > VR.Wallet.get()) return { msg: 'Sale ' + VR.fmtGs(n) + ' y tenés ' + VR.fmtGs(VR.Wallet.get()) + '. No alcanza.', bad: true };
      VR.Wallet.add(-n, 'Taller: ' + (f.bat ? 'carga' : 'nafta') + (llantas ? ' y llantas' : ''));
      c.fuel = f.tank; c._ahog = false; if (llantas) { c.tq.f = c.tq.r = 1; if (c.wear > 0.7) c.wear = 0.1; }
      return { msg: (f.bat ? 'Batería llena' : 'Tanque lleno (' + Math.round(litros) + ' L)') + (llantas ? ', llantas arregladas' : '') + '. Son ' + VR.fmtGs(n) + '.', n };
    },
    bidon(c) {
      const f = ficha(c); if (!f || f.bici || c.fuel > 0.05) return;
      if (BIDON > VR.Wallet.get()) { say('No te alcanza para el bidón (' + VR.fmtGs(BIDON) + ').'); return; }
      VR.Wallet.add(-BIDON, f.bat ? 'Carga de emergencia' : 'Bidón de nafta'); c.fuel = Math.min(f.tank, f.bat ? f.tank * 0.2 : BIDON_L); say((f.bat ? '🔋 Carga de emergencia' : '⛽ Un vecino te vendió ' + BIDON_L + ' L') + ' por ' + VR.fmtGs(BIDON) + '.'); VR.audio && VR.audio.coin && VR.audio.coin();
    },
    // estación de servicio: ¿el vehículo está bajo el techo de alguna?
    enSurtidor(c) {
      const E = VR.Estaciones, w = VR.world; if (!E || !w || !c) return null;
      for (const d of (w.decals || [])) {
        if (d.kind !== 'estacion') continue;
        const r = E.lay(d).canopy; if (c.x > r[0] && c.x < r[0] + r[2] && c.y > r[1] && c.y < r[1] + r[3]) return d;
      }
      return null;
    },
    // carga en el surtidor: ~1,2 L/s; se cobra al terminar (o al arrancar). Devuelve true si empezó.
    cargar(c) {
      if (!ensure(c)) return false; const f = ficha(c);
      if (f.bici) { say('🚲 A la bici no se le echa nafta, jaja.'); return false; }
      if (c._carga) return true;
      if (c.fuel >= f.tank - 0.05) { say('El tanque ya está lleno.'); return false; }
      if (PRECIO_L > VR.Wallet.get()) { say('No te alcanza ni para un litro (' + VR.fmtGs(PRECIO_L) + ').'); return false; }
      c.v = 0; c._carga = { l: 0 }; say(f.bat ? '🔋 Cargando batería…' : '⛽ Cargando nafta · ' + VR.fmtGs(PRECIO_L) + ' el litro'); return true;
    },
    fin(c, why) {
      const k = c._carga; if (!k) return; c._carga = null;
      const n = Math.round(k.l * PRECIO_L / 500) * 500;
      if (n > 0) { VR.Wallet.add(-n, 'Estación: ' + (ficha(c).bat ? 'carga' : 'nafta')); VR.audio && VR.audio.coin && VR.audio.coin(); }
      say((why || 'Listo') + ' · ' + Math.round(k.l * 10) / 10 + (ficha(c).bat ? ' pts' : ' L') + ' · ' + VR.fmtGs(n));
    },
    parche(c) {
      if (!flat(c) || c.fixT > 0) return;
      if (Math.abs(c.v) > 12) { say('Parate primero para arreglar la llanta.'); return; }
      if (PARCHE > VR.Wallet.get()) { say('No te alcanza para el gomero (' + VR.fmtGs(PARCHE) + ').'); return; }
      VR.Wallet.add(-PARCHE, 'Gomería: parche'); c.fixT = 5; say('🛞 Un gomero te está poniendo el parche… (' + VR.fmtGs(PARCHE) + ')');
    },
  };

  // ---------------------------------------------------------------- enganche en la física
  const P0 = VR.Car.prototype.physics, TS0 = VR.Car.prototype.topSpeed;
  VR.Car.prototype.physics = function (dt, th, st, brake, parked) {
    if (this.driven && !parked) [th, st] = Tab.tick(this, dt, th, st, brake);
    return P0.call(this, dt, th, st, brake, parked);
  };
  VR.Car.prototype.topSpeed = function () {
    const r = TS0.call(this); if (this.driven && this.tq) r[0] *= Tab.maxFactor(this); return r;
  };

  // ---------------------------------------------------------------- HUD
  const CSS = `#speed{display:none!important}
#tab{position:fixed;right:calc(env(safe-area-inset-right) + 10px);top:calc(env(safe-area-inset-top) + 56px + var(--mini,112px) + 10px);z-index:4;width:max(var(--mini,112px),128px);box-sizing:border-box;background:rgba(14,14,18,.84);border:2px solid #1a1a1e;box-shadow:0 0 0 2px rgba(255,214,94,.85);border-radius:8px;padding:3px 5px 4px;font:700 10px system-ui,sans-serif;color:#fff6d8;pointer-events:none;user-select:none}
#tab[hidden]{display:none}
#tab .v{font:900 25px/1 system-ui;color:#ffd75e;text-align:center;text-shadow:2px 2px 0 #1a1a1e}
#tab .v small{font-size:9px;letter-spacing:.12em;color:#fff6d8;margin-left:2px}
#tab .v em{font-style:normal;font-size:13px;color:#8fe0ff;margin-left:4px}
#tab .r{display:flex;align-items:center;gap:3px;margin-top:3px;height:14px}
#tab .r i{font-style:normal;width:14px;text-align:center;font-size:11px;line-height:1}
#tab .b{flex:1;height:7px;background:#2a2a32;border:1px solid #000;border-radius:2px;overflow:hidden}
#tab .b b{display:block;height:100%;width:50%;background:#6fd36b;transition:width .25s}
#tab .r em{font-style:normal;width:33px;text-align:right;font-size:9px;color:#d8d4ca}
#tab .r.bad i{animation:tabblink .5s steps(2) infinite}
@keyframes tabblink{50%{opacity:.2}}
#tab .t2{display:flex;gap:4px;flex:1}
#tab .t2 span{flex:1;text-align:center;border-radius:3px;background:#2a2a32;color:#d8d4ca;font-size:9px;padding:1px 0}
#tab .t2 span.bad{background:#a8322a;color:#fff}
#tab .s{margin-top:3px;font-weight:600;font-size:9px;line-height:1.2;color:#b9b4a8;text-align:center}
#tab button{pointer-events:auto;margin-top:3px;width:100%;border:2px solid #ffd75e;background:#3a3320;color:#fff;border-radius:6px;font:800 10px system-ui;padding:3px 0;cursor:pointer}
#tab button[hidden]{display:none}`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const el = document.createElement('div'); el.id = 'tab'; el.hidden = true;
  el.innerHTML = '<div class="v"><span class="n">0</span><small>km/h</small><em></em></div>' +
    '<div class="r" id="tbF"><i>⛽</i><div class="b"><b></b></div><em></em></div>' +
    '<div class="r" id="tbH"><i>🔧</i><div class="b"><b></b></div><em></em></div>' +
    '<div class="r" id="tbT"><i>🛞</i><div class="t2"><span>del</span><span>tras</span></div></div>' +
    '<div class="s" id="tbS"></div><div class="s" id="tbX"></div><button id="tbBtn" hidden></button>';
  document.body.append(el);
  const $q = (s) => el.querySelector(s);
  const N = $q('.n'), G = $q('.v em'), F = $q('#tbF'), H = $q('#tbH'), TT = $q('#tbT'), S = $q('#tbS'), X = $q('#tbX'), BT = $q('#tbBtn'), TS = TT.querySelectorAll('.t2 span');
  let cur = null, last = '';
  const col = (p) => p > 0.5 ? '#6fd36b' : p > 0.22 ? '#ffd75e' : '#ff5a4a';
  const bar = (row, p, txt) => { const b = row.querySelector('b'); b.style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%'; b.style.background = col(p); row.querySelector('em').textContent = txt; };
  BT.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
  BT.addEventListener('click', (e) => { e.stopPropagation(); if (!cur) return; if (cur.fuel <= 0) Tab.bidon(cur); else Tab.parche(cur); });
  // `manual`: con el minipanel táctil la velocidad ya se ve ahí
  Tab.update = (car, manualTouch) => {
    cur = car; if (!car) { if (!el.hidden) el.hidden = true; return; }
    el.hidden = false; const ok = ensure(car), f = ficha(car);
    const kmh = car.kmh(), gear = car.gear ? (car.gear < 0 ? 'R' : car.gear + 'ª') : '';
    // clave corta para no tocar el DOM si nada cambió
    const key = [kmh, gear, ok ? Math.round(car.fuel * 20) : -1, Math.round((car.hp ?? 100)), ok ? Math.round(car.tq.f * 10) + '' + Math.round(car.tq.r * 10) : '', ok ? Math.round(car.dist / 100) : '', car.fixT > 0 ? Math.ceil(car.fixT) : 0, manualTouch].join('|');
    if (key === last) return; last = key;
    $q('.v').firstChild.hidden = $q('.v small').hidden = !!manualTouch; N.textContent = kmh; G.textContent = gear;
    if (!ok) { F.hidden = TT.hidden = true; S.textContent = 'Tracción a sangre'; X.textContent = ''; BT.hidden = true; const hp = (car.hp ?? 100) / 100; H.hidden = false; bar(H, hp, Math.round(hp * 100) + '%'); return; }
    F.hidden = TT.hidden = false;
    const fp = car.fuel / f.tank; F.classList.toggle('bad', fp < 0.12 && !f.bici);
    F.querySelector('i').textContent = f.bici ? '💪' : f.bat ? '🔋' : '⛽';
    bar(F, fp, f.bat || f.bici ? Math.round(fp * 100) + '%' : (car.fuel < 10 ? car.fuel.toFixed(1).replace('.', ',') : Math.round(car.fuel)) + ' L');
    const hp = (car.hp ?? 100) / 100; H.classList.toggle('bad', hp < 0.25); bar(H, hp, Math.round(hp * 100) + '%');
    TS[0].textContent = 'D ' + Math.round(car.tq.f * 100) + '%'; TS[1].textContent = 'T ' + Math.round(car.tq.r * 100) + '%';
    TS[0].classList.toggle('bad', car.tq.f < 0.5); TS[1].classList.toggle('bad', car.tq.r < 0.5); TT.classList.toggle('bad', flat(car));
    S.textContent = f.bici ? 'Viaje ' + (car.dist / 1000).toFixed(1).replace('.', ',') + ' km' : 'Rinde ~' + Math.round(range(car)) + ' km · ' + (car.dist / 1000).toFixed(1).replace('.', ',') + ' km';
    X.textContent = VR.fichaTxt(car);
    const empty = car.fuel <= 0 && !f.bici, fl = flat(car);
    BT.hidden = !(empty || fl);
    if (car.fixT > 0) { BT.hidden = false; BT.textContent = '🛞 Arreglando… ' + Math.ceil(car.fixT) + ' s'; BT.disabled = true; }
    else { BT.disabled = false; BT.textContent = empty ? (f.bat ? '🔋 Carga de emergencia · ' : '⛽ Bidón ' + BIDON_L + ' L · ') + VR.fmtGs(BIDON) : '🛞 Parche · ' + VR.fmtGs(PARCHE); }
  };
})();
