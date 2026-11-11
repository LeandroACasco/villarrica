// Arranque: pantalla, mundo, jugador, cámara, HUD, menú y guardado de la posición.
'use strict';
(async () => {
  const $ = (id) => document.getElementById(id);
  const toast = (msg) => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400); };
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  // ---- modo de juego (J1): Libre (el de siempre) o Historia (guardado aparte con prefijo h:) ----
  // Cambiar de modo recarga la página con sessionStorage 'go': así arranca todo limpio con el guardado que corresponde.
  let goMode = null; try { goMode = sessionStorage.getItem('villarrica:go'); sessionStorage.removeItem('villarrica:go'); } catch (e) {}
  VR.modo = goMode || (/[?&]historia\b/.test(location.search) ? 'historia' : /[?&](libre|juego|prueba)\b/.test(location.search) ? 'libre' : VR.store.get('modo', 'libre')); // el cambio desde el título manda sobre la URL
  VR.store.ns = VR.modo === 'historia' ? 'h:' : '';
  document.body.classList.toggle('historia', VR.modo === 'historia');
  const vida = VR.vida = VR.modo === 'historia' ? new VR.Vida() : null;
  const settings = { touch: VR.store.get('touch', 'auto'), fps: VR.store.get('fps', false), vib: VR.store.get('vib', true), hora: VR.store.get('hora', 'real'), pj: VR.store.get('pj', 'generico'), manejo: VR.store.get('manejo', 'facil'), fondo: VR.store.get('fondo', 'parque') };
  VR.drive = settings.manejo;

  VR.screen.init($('game'));
  const prueba = /[?&]prueba\b/.test(location.search);
  const directo = prueba || !!goMode || /[?&](libre|juego|historia)\b/.test(location.search); // ?libre salta el menú principal (pruebas automáticas)
  let mode = 'game'; // 'title' (menú principal) | 'game'
  let world;
  try { world = prueba ? VR.makeTestMap() : await VR.loadMap('map.bin'); }
  catch (e) { $('ovSub').textContent = '⚠ ' + e.message + ' · revisá la conexión y recargá'; return; }
  $('zone').textContent = prueba ? 'Barrio de prueba' : 'Centro';
  $('ovSub').textContent = prueba ? 'Barrio de prueba' : 'Etapa 1.5 · Villarrica entera';
  const saved = VR.store.get('pos:' + world.id, null);
  // Historia empieza en Santa Lucía: la vereda más cercana al centro del barrio
  function spotInBarrio(re) {
    const bi = world.barrios.findIndex((n) => re.test(n)); if (bi < 0 || !world.barrio) return null;
    const w = world.w, S = VR.TILE, N = world.barrio.length; let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < N; i++) if (world.barrio[i] === bi + 1) { sx += i % w; sy += (i / w) | 0; n++; }
    if (!n) return null;
    const cx = Math.round(sx / n), cy = Math.round(sy / n);
    for (let r = 0; r < 120; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = cx + dx, ty = cy + dy; if (world.barrio[ty * w + tx] !== bi + 1 || world.get(tx, ty) !== VR.T.SIDEWALK) continue;
      const x = tx * S + 8, y = ty * S + 10; if (!world.hits(x - 4, y - 4, x + 4, y)) return { x, y };
    }
    return null;
  }
  // tu pieza (J2: ahí está Ña Ramona): una vereda de Santa Lucía a ~1 km de la Plaza de los Héroes, así la primera caminata al Centro es corta
  function casaSpot() {
    const bi = world.barrios.findIndex((n) => /Santa Luc/i.test(n)) + 1, pl = world.labels.find((l) => /Plaza de los H/.test(l.text)); if (!bi || !pl) return spotInBarrio(/Santa Luc/i);
    const w = world.w, S = VR.TILE, want = 1000 * 8; let best = null, bd = Infinity;
    for (let i = 0; i < world.barrio.length; i++) {
      if (world.barrio[i] !== bi) continue; const tx = i % w, ty = (i / w) | 0; if (world.get(tx, ty) !== VR.T.SIDEWALK) continue;
      const x = tx * S + 8, y = ty * S + 10, d = Math.abs(Math.hypot(x - pl.x, y - pl.y) - want); if (d < bd && !world.hits(x - 4, y - 4, x + 4, y)) { bd = d; best = { x, y }; }
    }
    return best || spotInBarrio(/Santa Luc/i);
  }
  if (vida && !vida.s.casa) { const c = casaSpot(); if (c) { vida.s.casa = c; vida.save(); } }
  const histStart = vida && !saved ? vida.s.casa : null;
  const start = histStart || (saved && !world.hits(saved.x - 4, saved.y - 4, saved.x + 4, saved.y) ? saved : world.spawn);
  const player = new VR.Player(world, start.x, start.y);
  if (saved && saved.dir) player.dir = saved.dir;
  // ---------- autos estacionados (el primero, al lado del punto de partida) ----------
  const parked = prueba ? { cars: [], first: null } : VR.parkCars(world, 320, world.spawn);
  const cars = parked.cars;
  let car = null; // auto que estás manejando
  const WALK_BASE = 270, DRIVE_BASE = 420; // Leandro prefirió la cámara de antes (04/11/2026)
  // Zoom del juego (rueda, pellizco con dos dedos, teclas + y −): multiplica la base de cámara; se recuerda.
  let zoomK = 1; try { zoomK = Math.min(1.8, Math.max(0.55, parseFloat(localStorage.getItem('vr_zoom')) || 1)); } catch (e) {}
  // Zoom suave: la base de cámara (baseCur) se acerca de a poco a la que corresponde al zoom pedido y al vehículo (a pie / manejando).
  // Mientras se ajusta, la escala es continua; unos 0,3 s después de soltar se acomoda a la escala de reposo (nítida) sin saltos.
  let baseCur = 0, zoomIn = -1e9;
  const wantBase = () => (car ? DRIVE_BASE : WALK_BASE) / zoomK;
  const zoomPoke = () => {};   // subir o bajar de un vehículo cambia wantBase(): zoomTick lo recorre suave
  function zoomJump() { baseCur = VR.screen.snapBase(wantBase()); VR.screen.settle(baseCur); }
  function setZoom(k) { k = Math.min(1.8, Math.max(0.55, k)); if (Math.abs(k - zoomK) < 0.0005) return; zoomK = k; zoomIn = performance.now(); }
  function zoomTick(dt) {
    if (!baseCur) baseCur = VR.screen.BASE;
    const settling = performance.now() - zoomIn > 300;
    const want = wantBase(), tgt = settling ? VR.screen.snapBase(want) : want;
    if (Math.abs(tgt - baseCur) < 0.05) { if (VR.screen.live || VR.screen.BASE !== tgt) { baseCur = tgt; VR.screen.settle(baseCur); if (settling) { zoomK = Math.min(1.8, Math.max(0.55, (car ? DRIVE_BASE : WALK_BASE) / baseCur)); try { localStorage.setItem('vr_zoom', String(zoomK)); } catch (e) {} } } return; }
    baseCur *= Math.pow(tgt / baseCur, 1 - Math.exp(-11 * dt));
    VR.screen.setLive(baseCur);
  }
  addEventListener('wheel', (e) => { if (mapOpen || mode !== 'game' || e.target.closest && e.target.closest('#mapView')) return; setZoom(zoomK * Math.exp(-e.deltaY * 0.0012)); }, { passive: true });
  addEventListener('keydown', (e) => {
    if (mapOpen || mode !== 'game') return;
    if (e.code === 'Equal' || e.code === 'NumpadAdd') setZoom(zoomK * 1.2);
    else if (e.code === 'Minus' || e.code === 'NumpadSubtract') setZoom(zoomK / 1.2);
  });
  { let pd = 0;
    addEventListener('touchmove', (e) => {
      if (mapOpen || mode !== 'game' || e.touches.length !== 2 || e.touches[0].clientX < innerWidth / 2 || e.touches[1].clientX < innerWidth / 2) { pd = 0; return; }  // pellizco solo en la mitad derecha (la izquierda es del joystick)
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pd) setZoom(zoomK * d / pd); pd = d;
    }, { passive: true });
    addEventListener('touchend', () => { pd = 0; }, { passive: true }); }
  const traffic = prueba ? null : new VR.Traffic(world, { max: 28, motoShare: 0.45 });
  const peds = prueba ? null : new VR.Peds(world);
  const night = VR.night = new VR.Night(world);
  const cisnes = VR.cisnes = new VR.Cisnes(world, night); cisnes.onMsg = (m) => toast(m);
  const perros = VR.perros = peds ? new VR.Perros(world, peds) : { update() {}, collect() {}, pet() { return false; } }; VR.toast = (m) => toast(m);   // perros callejeros (perros.js)
  const calle = VR.calle = peds ? new VR.Calle(world, peds, { toast: (m) => toast(m), heal: (n) => VR.heal && VR.heal(n), hambre: (n) => { if (vida && vida.s) vida.s.hambre = Math.min(100, vida.s.hambre + n); } }) : { update() {}, collect() {}, near() { return null; }, act() { return false; } };   // vendedores y gente de la calle (calle.js)
  const fauna = VR.fauna = new VR.Fauna(world); // carpinchos, patos, peces y palomas (fauna.js)
  if (peds) { const sc = peds.scatter.bind(peds); peds.scatter = (x, y, r, from) => { fauna.scare(x, y, r); return sc(x, y, r, from); }; }
  const gpsNet = prueba ? null : new VR.GPS(world);
  const emer = prueba ? null : new VR.Emergency(world, { traffic, gps: gpsNet, peds, night, toast: (m) => toast(m),
    onBusted: () => { sentTo('🚔 ¡Te agarró la Policía! Saliste después de un rato.'); if (VR.mis) VR.mis.emit('arresto'); },
    onWasted: () => { sentTo('💥 Explotó con vos adentro... te llevaron al hospital.'); if (vida) vida.cobrarODeber(VR.PRECIOS.remedios, 'Hospital: remedios'); if (VR.mis) { VR.mis.emit('explota'); VR.mis.emit('hospital'); } } });
  if (emer) emer.sound = VR.store.get('snd', true);
  VR.emer = emer;
  const weapons = prueba ? null : new VR.Weapons(world, { peds, emer, night, toast: (m) => toast(m) });
  VR.weapons = weapons;
  VR.audio.setOn(VR.store.get('snd', true));
  if (vida) { // Historia: avisos, desmayo por hambre y cobro del hospital
    vida.onMsg = (m) => toast(m);
    vida.onDesmayo = () => { sentTo('🏥 Te desmayaste de hambre y te llevaron al hospital. Remedios: ' + VR.fmtGs(VR.PRECIOS.remedios)); vida.cobrarODeber(VR.PRECIOS.remedios, 'Hospital: remedios'); if (VR.mis) VR.mis.emit('hospital'); };
  }
  // te agarraron o volaste: aparecés en la plaza, sin estrellas
  function sentTo(msg) {
    if (car) { car.driven = false; car.siren = false; car.rider = null; car.v = 0; car = null; zoomPoke(); driveLabels(false); }
    player.x = player.px = world.spawn.x; player.y = player.py = world.spawn.y; cam.x = cam.px = player.x; cam.y = cam.py = player.y;
    if (emer) emer.clear();
    toast(msg);
  }
  const me = () => Object.assign(VR.av2Rider(player.lookData), { L: player.lookData }); // así se ve el jugador arriba de la moto: su personaje (05/11/2026)
  const sc = saved && saved.car;
  if (sc) {
    let c = cars[sc.i];
    if (!c || c.type !== (sc.type || 'car') || (sc.model && c.model !== sc.model)) { c = new VR.Car(world, sc.x, sc.y, sc.a, sc.color || 0, sc.type || 'car', sc.model, sc.tune || null); cars.push(c); }
    world.removeBox(c); c.x = c.px = sc.x; c.y = c.py = sc.y; c.a = c.pa = sc.a; world.addBox(c);
    if (sc.in && c.type === 'moto') c.rider = me();
    if (sc.in) { car = c; c.driven = true; player.x = player.px = c.x; player.y = player.py = c.y; zoomPoke(); setTimeout(() => driveLabels(true)); }
  }
  const LABELS = { action: [['✋', 'ACCIÓN'], ['📯', 'BOCINA']], run: [['»', 'CORRER'], ['⏹', 'FRENO']], car: [['🚗', 'AUTO'], ['🚪', 'BAJAR']] };
  function driveLabels(on) {
    document.querySelectorAll('#btns .tb').forEach((el) => { const L = LABELS[el.dataset.b]; if (L) el.innerHTML = '<span class="ico">' + L[on ? 1 : 0][0] + '</span>' + L[on ? 1 : 0][1]; });
  }
  const nearCar = () => {
    let best = null, bd = 30;
    for (const c of world.carsIn(player.x - 40, player.y - 40, player.x + 40, player.y + 40, [])) {
      if (c.wreck || c.burning) continue;
      const d = Math.hypot(c.x - player.x, c.y - (player.y - 4));
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };
  // Historia: robar no es tan fácil (Leandro, 10/11/2026). Al tránsito hay que bajarlo con un arma y los estacionados
  // se abren con herramientas (llegan con la economía larga, J6). Tus vehículos (comprados, alquilados, prestados) o uno
  // que ya te llevaste, sí. En Libre todo sigue como antes.
  function noRobar(c) {
    if (!vida || c.mio || c.robado || c === lastCar) return null;
    if (c.ai) return weapons && weapons.enabled ? null : '🔫 Para bajar al conductor necesitás un arma';
    return vida.s.herr ? null : '🔧 Para abrir un vehículo estacionado necesitás herramientas';
  }
  // canasto de chipa en la mano (G, o el botón 🧺): con el canasto, ACCIÓN vende al lado de la gente
  const btnEq = $('btnEq'), btnA = document.querySelector('[data-b="action"]'); let eqTxt = '';
  function toggleEq() { if (!vida || !vida.s.canasto) return; vida.s.equipo = vida.s.equipo === 'canasto' ? null : 'canasto'; vida.save(); if (!vida.s.equipo && changas.job && changas.job.k === 'chipa') { changas.job = null; changas.hud.hidden = true; } toast(vida.s.equipo ? '🧺 Canasto en la mano · ' + vida.s.stock + ' chipas · ACCIÓN al lado de la gente para vender' : '🧺 Guardaste el canasto'); }
  btnEq.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); toggleEq(); });
  addEventListener('keydown', (e) => { if (e.code === 'KeyG' && mode === 'game' && !e.repeat && !/INPUT|TEXTAREA/.test(e.target.tagName)) toggleEq(); });
  function syncEq() {
    const eq = vida && vida.s.equipo, t = eq === 'canasto' && !car ? '🥐|VENDER' : '✋|ACCIÓN';
    player.equipo = car ? null : eq; btnEq.hidden = !(vida && vida.s.canasto) || !!car; btnEq.classList.toggle('down', eq === 'canasto');
    if (t !== eqTxt) { eqTxt = t; const [i, n] = t.split('|'); btnA.innerHTML = '<span class="ico">' + i + '</span>' + n; }
  }
  function enterCar(c) {
    if (c._nid !== undefined && online) online.take(c); // un auto del anfitrión: pasa a ser tuyo
    if (emer) emer.stolen(c);
    if (c.ai && traffic) { traffic.release(c); if (!cars.includes(c)) cars.push(c); toast(c.type === 'moto' ? (c.model === 'pati' ? '🛴 ¡Te llevaste la patineta!' : '🏍 ¡Te llevaste la moto!') : c.model === 'karumbe' ? '🐴 ¡Te llevaste el karumbe!' : c.spec.bus ? '🚌 ¡Te llevaste el colectivo!' : /^cam/.test(c.model) ? '🚚 ¡Te llevaste el camión!' : '🚗 ¡Te llevaste el auto!'); }
    if (c.type === 'moto') c.rider = me();
    c.robado = true; car = c; c.driven = true; player.moving = false; zoomPoke(); VR.showVehicleCard(c);
    hint = ''; lastCar = c; driveLabels(true);
    if (VR.mis) VR.mis.emit('subir', c);
  }
  // vida del jugador (11/11/2026): los golpes de vehículos la bajan, se recupera sola; en 0 te llevan al hospital
  let hp = 100, hpQuiet = 0; const hpEl = $('hpBar');
  function hpShow() { hpEl.hidden = hp >= 99.5; hpEl.textContent = '❤ ' + Math.max(0, Math.round(hp)) + '%'; }
  VR.shake = (t, amp) => { VR.shakeT = Math.max(VR.shakeT || 0, t); VR.shakeA = amp; };
  VR.heal = (n) => { hp = Math.min(100, hp + n); hpShow(); };
  function hurtPlayer(dmg) {
    hp -= dmg; hpQuiet = 6; hpShow();
    if (hp <= 0) {
      hp = 60; hpShow(); player.rag = null; const cost = VR.PRECIOS && VR.PRECIOS.remedios || 30000;
      if (vida) vida.cobrarODeber(cost, 'Hospital: curaciones'); else VR.Wallet.add(-Math.min(VR.Wallet.get(), cost));
      sentTo('🏥 Quedaste muy mal y te llevaron al hospital. Curaciones: ' + VR.fmtGs(cost));
    }
  }
  function hpTick(dt) { if (hp >= 100) return; hpQuiet -= dt; if (hpQuiet <= 0) { hp = Math.min(100, hp + dt * 2.5); hpShow(); } }
  // ¿te atropelló un vehículo en movimiento? Salís despedido (ragdoll) y no controlás un rato
  function runOverCheck() {
    if (player.rag || !world.carsIn) return;
    const out = []; world.carsIn(player.x - 40, player.y - 40, player.x + 40, player.y + 40, out);
    for (const o of out) {
      if (!o.spec || o.driven) continue;
      const vx = o.vx !== undefined ? o.vx : Math.sin(o.a) * (o.v || 0), vy = o.vy !== undefined ? o.vy : -Math.cos(o.a) * (o.v || 0), sp = Math.hypot(vx, vy);
      if (sp < 35) continue;
      if (!VR.obbIn(VR.obb(o.x + vx * 0.03, o.y + vy * 0.03, o.a, o.spec.len / 2 + 1, o.spec.wid / 2 + 3), player.x, player.y - 4)) continue;
      player.knock(vx * 0.9, vy * 0.9, sp / 160); VR.audio.ouch(player.x, player.y); toast('💥 ¡Te atropellaron!'); hurtPlayer(12 + sp / 5);
      if (o.vx !== undefined) { o.vx *= 0.85; o.vy *= 0.85; } o.hit = 0.15;
      if (VR.input.buzz) VR.input.buzz(40);
      return;
    }
  }
  // te caés de la moto en un choque fuerte: salís volando hacia adelante y la moto sigue sola
  VR.onEject = (c, imp) => {
    if (c !== car) return;
    const fx = Math.sin(c.a), fy = -Math.cos(c.a), vx = c.vx || 0, vy = c.vy || 0;
    if (VR.mis) VR.mis.emit('bajar', c);
    c.driven = false; c.rider = null; car = null; zoomPoke(); driveLabels(false);
    player.x = player.px = c.x + fx * 9; player.y = player.py = c.y + fy * 9 + 4;
    player.knock(vx * 1.0 + fx * 25, vy * 1.0 + fy * 25, Math.min(1, imp / 260)); toast('🏍💥 ¡Te caíste de la moto!'); hurtPlayer(8 + imp / 10);
    c.vx *= 0.5; c.vy *= 0.5;
  };
  function exitCar() {
    if (VR.mis) VR.mis.emit('bajar', car);
    const c = car, a = c.a, rx = Math.cos(a), ry = Math.sin(a), fx = Math.sin(a), fy = -Math.cos(a);
    const tries = [];
    const w0 = c.WID / 2 + 6, l0 = c.LEN / 2 + 8;
    for (const d of [w0, w0 + 4, w0 + 8, w0 + 12]) tries.push([-rx * d, -ry * d], [rx * d, ry * d]);
    for (const d of [l0, l0 + 6]) tries.push([-fx * d, -fy * d], [fx * d, fy * d]);
    for (const [dx, dy] of tries) {
      const x = c.x + dx, y = c.y + dy + 4;
      if (!world.hits(x - player.HW, y - player.HH, x + player.HW, y)) {
        player.x = player.px = x; player.y = player.py = y;
        c.driven = false; c.v = 0; c.rider = null; car = null; zoomPoke(); driveLabels(false); return true;
      }
    }
    toast('No hay lugar para bajar acá'); return false;
  }

  // ---------- tienda de ropa (puerta en la vereda, frente a la plaza) ----------
  const shopDecal = (world.decals || []).find((d) => d.kind === 'tienda');
  const shopDoor = shopDecal ? { x: (shopDecal.x + shopDecal.w / 2) * VR.TILE, y: (shopDecal.y + 1) * VR.TILE } : null;
  const garD = (world.decals || []).find((d) => d.kind === 'taller'), garDoor = garD ? { x: (garD.x + garD.w / 2) * VR.TILE, y: garD.y * VR.TILE + 4 } : null;
  const muD = (world.decals || []).find((d) => d.kind === 'muni'), cineDoor = muD ? { x: (muD.bx + (muD.tx || muD.bw / 2)) * VR.TILE, y: (muD.y + muD.bh) * VR.TILE + 10 } : null;
  const garage = new VR.Garage(); let cine = null;
  const nearGarage = () => garDoor && car && VR.TUNE_MODELS[car.model] && Math.hypot(car.x - garDoor.x, car.y - garDoor.y) < 44 && Math.abs(car.v) < 40 ? garDoor : null;
  const nearCine = () => cineDoor && !car && Math.hypot(player.x - cineDoor.x, player.y - cineDoor.y) < 40 ? cineDoor : null;
  const nearShop = () => shopDoor && !car && Math.abs(player.x - shopDoor.x) < 26 && player.y > shopDoor.y - 30 && player.y < shopDoor.y + 4 ? shopDoor : null;
  const shop = new VR.Shop({
    onClose: () => { shop.ropero = false; VR.input.releaseAll(); VR.input.enabled = true; VR.loop.paused = false; },
    onBuy: (L, tot) => { settings.pj = 'propio'; VR.store.set('pj', 'propio'); player.setLook('propio'); if (car && car.rider) car.rider = me(); paintPj(); toast(tot ? '🛍 ¡Aguyje! Pagaste ' + VR.fmtGs(tot) : '👕 Listo, te cambiaste'); },
  });
  function openShop() { VR.input.releaseAll(); VR.input.enabled = false; VR.loop.paused = true; shop.open(player.lookData); }
  VR.Wallet.onChange = () => { $('plata').textContent = '💵 ' + VR.fmtGs(VR.Wallet.get()); };
  VR.Wallet.onChange();
  // HUD de Historia: hora y hambre, saldo y pieza, deuda en rojo
  const vV = $('vVida'), vV2 = $('vVida2'), vD = $('vDeuda'); let vT = 0;
  function vidaHud(dt, force) {
    if (!vida) return; vT -= dt; if (vT > 0 && !force) return; vT = 0.5;
    vV.hidden = vV2.hidden = false; vV.textContent = vida.hudLinea1(); vV2.textContent = vida.hudLinea2(); vV.classList.toggle('low', vida.s.hambre < 25);
    const d = vida.deudaTotal(); vD.hidden = d <= 0; if (d > 0) vD.textContent = '⚠ Debés ' + VR.fmtGs(d);
  }
  if (vida) { vidaHud(0, true); VR.Wallet.onChange = () => { $('plata').textContent = '💵 ' + VR.fmtGs(VR.Wallet.get()) + ' · 🏦 ' + VR.fmtGs(vida.s.banco); vidaHud(0, true); }; VR.Wallet.onChange(); const sy = vida.sync.bind(vida); vida.sync = () => { sy(); $('plata').textContent = '💵 ' + VR.fmtGs(VR.Wallet.get()) + ' · 🏦 ' + VR.fmtGs(vida.s.banco); }; }

  // ---------- cámara: sigue al jugador mirando un poco hacia donde camina ----------
  const cam = { x: player.x, y: player.y, px: player.x, py: player.y, lx: 0, ly: 0 };
  function updateCamera(dt) {
    cam.px = cam.x; cam.py = cam.y;
    let wx, wy;
    if (car) { // manejando: la cámara mira hacia adelante, más cuanto más rápido vas
      const k = Math.min(1, Math.abs(car.v) / 220) * Math.sign(car.v);
      wx = Math.sin(car.a) * 70 * k; wy = -Math.cos(car.a) * 55 * k;
    } else {
      const look = player.moving ? 26 * Math.min(1, player.speed / 58) : 0;
      wx = VR.input.ax * look; wy = VR.input.ay * look * 0.7;
    }
    cam.lx += (wx - cam.lx) * Math.min(1, dt * 2.5);
    cam.ly += (wy - cam.ly) * Math.min(1, dt * 2.5);
    const fx = car ? car.x : player.x, fy = car ? car.y : player.y - 10;
    const tx = fx + cam.lx, ty = fy + cam.ly;
    const k = 1 - Math.exp(-dt * 7);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  }
  const camView = (a, c = cam) => {
    const sw = VR.screen.w, sh = VR.screen.h, W = world.w * VR.TILE, H = world.h * VR.TILE;
    let x = VR.lerp(c.px, c.x, a) - sw / 2, y = VR.lerp(c.py, c.y, a) - sh / 2;
    x = W <= sw ? (W - sw) / 2 : VR.clamp(x, 0, W - sw);
    y = H <= sh ? (H - sh) / 2 : VR.clamp(y, 0, H - sh);
    return [Math.round(x), Math.round(y)];
  };

  // ---------- lógica ----------
  const SALUDOS = ["¡Mba'éichapa!", "¡Mba'e la porte!", 'Haku la ára, che...', "¡Jaha jaha!", '¡Ára porã!'];
  const BOCINAS = ['¡Pi pííí!', '¡Pííp!', '¡Pi pi!'];
  const btnCarT = document.querySelector('.tb[data-b="car"]'); let btnCarShow = true;
  let sayIdx = 0, hint = '', hintCar = null, holdT = 0;
  function update(dt) {
    if (mode === 'title') { updateTitle(dt); return; }
    online.update(dt, player, car, teatro);
    if (teatro.on) { if (VR.input.pressed('menu')) { openMenu(); return; } if (teatro.update(dt, VR.input) === 'out' && cineDoor) { player.x = player.px = cineDoor.x; player.y = player.py = cineDoor.y + 14; player.dir = 'down'; } return; }
    if (mapOpen) {
      if (['map', 'menu'].some((b) => VR.input.pressed(b))) closeMap();
      else if (VR.input.ax || VR.input.ay) { mv.ox -= VR.input.ax * 700 * dt; mv.oy -= VR.input.ay * 700 * dt; mapApply(); }
      return;
    }
    if (VR.input.pressed('menu')) { openMenu(); return; }
    if (VR.input.pressed('map')) { openMap(); return; }
    if (vida) { vida.tick(dt); vidaHud(dt); }
    cisnes.netSync(online.peer ? online.others : null); cisnes.update(dt, VR.input);
    if (cisnes.riding) { // en un cisne de pedal: el jugador va sobre el cisne
      const s = cisnes.s;
      player.px = player.x; player.py = player.y; player.x = s.x; player.y = s.y + 4; player.moving = false;
      hint = VR.input.source === 'touch' ? '🦢 Bajar: botón AUTO' : VR.input.source === 'pad' ? '🦢 X: bajar' : '🦢 F: bajar'; hintCar = null;
      if (VR.input.pressed('car')) { if (cisnes.exit(player)) { driveLabels(false); toast('Bajaste del cisne'); } else toast('Acercate a la orilla o al muelle para bajar'); }
    } else if (car) {
      car.update(dt, VR.input);
      player.px = player.x; player.py = player.y; player.x = car.x; player.y = car.y;
      const ng = nearGarage(); hint = ng ? (VR.input.source === 'touch' ? '🔧 Taller: ACCIÓN' : VR.input.source === 'pad' ? '🔧 A: taller' : '🔧 Espacio: taller') : ''; hintCar = ng;
      if (ng && VR.input.pressed('action')) { car.v = 0; garage.open(car, toast); return; }
      if (car.spec.emer) { // sirena (tocar) y, en el camión bomba, cañón de agua (mantener)
        if (VR.input.down('action')) holdT += dt;
        else { if (holdT > 0 && holdT <= 0.22) { car.siren = !car.siren; toast(car.siren ? '🚨 Sirena prendida' : 'Sirena apagada'); } holdT = 0; }
        if (emer) emer.holdT = holdT;
      } else if (VR.input.pressed('action')) { player.say(BOCINAS[sayIdx++ % BOCINAS.length], 1.2); VR.audio.horn(car.x, car.y, car.type === 'moto' ? 'moto' : car.spec.mass > 1.3 ? 'big' : 'car'); }
      if (VR.input.pressed('car')) { if (Math.abs(car.v) < 45) exitCar(); else toast('Frená para bajarte'); }
      if (player.bubble) { player.bubble.t -= dt; if (player.bubble.t <= 0) player.bubble = null; }
    } else {
      if (online.ride) { // de pasajero en el vehículo de otro jugador
        const d = online.others.get(online.ride);
        if (!d || !d.c) { online.leave(player, world); toast('Te bajaste'); }
        else { player.px = player.x; player.py = player.y; player.x = d.sx ?? d.x; player.y = (d.sy ?? d.y) + 10; player.moving = false;
          hint = VR.input.source === 'touch' ? '👥 Bajar' : 'F: bajar'; hintCar = null;
          if (VR.input.pressed('car')) { online.leave(player, world); toast('Te bajaste'); } }
      } else {
      player.update(dt, VR.input); runOverCheck(); hpTick(dt);
      const nc = nearCar(), ns = nearShop(), rd = online.nearRide(player);
      if (rd && (!nc || Math.hypot(rd.x - player.x, rd.y - player.y) < Math.hypot(nc.x - player.x, nc.y - player.y))) {
        hint = (VR.input.source === 'touch' ? '👥 ' : 'F: ') + 'subir con ' + rd.n; hintCar = { x: rd.x, y: rd.y - 8 };
        if (VR.input.pressed('car')) { online.ride = rd.id; toast('👥 Vas con ' + rd.n); }
      } else {
      hint = nc && noRobar(nc) ? '' : nc ? (VR.input.source === 'touch' ? (nc.type === 'moto' ? '🏍 Subir' : '🚗 Subir') : VR.input.source === 'pad' ? 'X: subir' : 'F: subir') : '';
      hintCar = nc;
      const nci = nearCine(); if (nci && !nc && !ns) { hint = VR.input.source === 'touch' ? '🎬 Cine: ACCIÓN' : '🎬 Espacio: cine'; hintCar = { x: nci.x, y: nci.y - 8 }; if (VR.input.pressed('action')) { teatro.enter(); return; } }
      if (ns && !nc) { hint = VR.input.source === 'touch' ? '👕 Tienda: ACCIÓN' : VR.input.source === 'pad' ? '👕 A: entrar' : '👕 Espacio: entrar'; hintCar = { x: ns.x, y: ns.y - 8 }; }
      const nsw = !nc ? cisnes.near(player) : null;
      if (nsw) { hint = (VR.input.source === 'touch' ? '🦢 Paseo' : VR.input.source === 'pad' ? 'X: paseo en cisne' : 'F: paseo en cisne') + ' · ' + VR.fmtGs(VR.CISNE_PRECIO); hintCar = { x: nsw.x, y: nsw.y - 8 }; }
      const nn = mis && !nc && !nsw ? mis.near(player) : null; // personajes de la Historia (J2)
      if (nn) { hint = (VR.input.source === 'touch' ? '💬 ' : VR.input.source === 'pad' ? '💬 A: ' : '💬 Espacio: ') + nn.nombre; hintCar = { x: nn.x, y: nn.y - 14 }; }
      const nv = !nc && !nsw && !nn ? calle.near(player) : null; if (nv) { hint = (VR.input.source === 'touch' ? 'ACCIÓN: ' : 'Espacio: ') + (nv.stock > 0 ? nv.K.label.replace(/ · .*/, '') + ' · ' + VR.fmtGs(nv.K.price) : 'sin stock'); hintCar = { x: nv.x, y: nv.y + 52 }; }
      if (VR.input.pressed('car')) {
        if (nsw && VR.Wallet.get() < VR.CISNE_PRECIO) toast('💸 El paseo en cisne cuesta ' + VR.fmtGs(VR.CISNE_PRECIO));
        else if (nsw) { VR.Wallet.add(-VR.CISNE_PRECIO); cisnes.board(nsw); toast('🦢 −' + VR.fmtGs(VR.CISNE_PRECIO) + ' · ' + (VR.input.source === 'touch' ? 'Pedaleá con los dos botones (o joystick arriba). Pasá por la boya 1 para largar la vuelta' : 'Pedaleá: A y D (o W los dos). Pasá por la boya 1 para largar la vuelta')); }
        else if (nc) { const no = noRobar(nc); if (no) toast(no); else enterCar(nc); } else toast('Acercate a un auto, una moto o un cisne para subir'); }
      else if (VR.input.pressed('action')) { if (nn) { mis.talk(nn, player); return; } if (ns) { openShop(); return; } if (changas.action(player)) {} else if (calle.act(player)) {} else if (perros.pet(player)) {} else player.say(SALUDOS[sayIdx++ % SALUDOS.length]); if (peds) peds.greet(player.x, player.y); }
      } }
    }
    if (car && !car.burning && !car.wreck && (car.hp ?? 100) > 35 && car.hp < 100) car.hp = Math.min(100, car.hp + dt * 0.5);
    changas.update(dt);
    if (mis) mis.update(dt, player, car);
    syncEq(); if (vida) updateMbohasa(dt);
    world.updateDynamic(dt);
    VR.audioCam = cam; VR.playerCar = car; VR.audio.engine(car, dt);
    updateCamera(dt);
    updateGps(dt);
    if (traffic) {
      const sw = VR.screen.w, sh = VR.screen.h, f = car || player;
      if (!online.mirror) traffic.update(dt, f, { x0: cam.x - sw / 2, y0: cam.y - sh / 2, x1: cam.x + sw / 2, y1: cam.y + sh / 2 },
        car ? null : { x: player.x, y: player.y - 4 }, (v) => { v.honkT = 1.1; v.honkTxt = BOCINAS[(Math.random() * BOCINAS.length) | 0]; VR.audio.horn(v.x, v.y, v.type === 'moto' ? 'moto' : v.spec.mass > 1.3 ? 'big' : 'car'); });
      for (const v of traffic.list) if (v.honkT > 0) v.honkT -= dt;
    }
    if (peds && !online.mirror) { const sw = VR.screen.w, sh = VR.screen.h; peds.update(dt, car || player, { x0: cam.x - sw / 2, y0: cam.y - sh / 2, x1: cam.x + sw / 2, y1: cam.y + sh / 2 }, car); }
    { // fauna: lo que la asusta (vos, tu vehículo o tu cisne, el tránsito, la gente y los cisnes que andan)
      const th = [];
      if (cisnes.riding) th.push({ x: cisnes.s.x, y: cisnes.s.y, sp: 0, water: true });
      else if (car) th.push({ x: car.x, y: car.y, sp: Math.hypot(car.vx || 0, car.vy || 0) });
      else th.push({ x: player.x, y: player.y, sp: player.moving ? (player.run ? 40 : 15) : 0 });
      for (const s of cisnes.list) if (s !== cisnes.s && Math.abs(s.v || 0) > 3) th.push({ x: s.x, y: s.y, sp: 0, water: true });
      if (online.peer && !online.mirror) for (const o of online.others.values()) if (!o.tz && !o.r && o.look) th.push(o.sw ? { x: o.x, y: o.y, sp: 0, water: true } : { x: o.x, y: o.y, sp: o.c ? 60 : o.mv > 1 ? 40 : o.mv ? 15 : 0 }); // los otros jugadores también asustan
      const near = (o) => Math.abs(o.x - cam.x) < 420 && Math.abs(o.y - cam.y) < 320;
      if (traffic) for (const v of traffic.list) if (near(v)) th.push({ x: v.x, y: v.y, sp: Math.hypot(v.vx || 0, v.vy || 0) });
      if (peds) for (const q of peds.list) if (near(q)) th.push({ x: q.x, y: q.y, sp: 0, r: 12 });
      fauna.update(dt, cam, th);
      if (mode === 'game') zoomTick(dt);
      if (!online.mirror) { perros.update(dt, car || player, car); calle.update(dt, car || player); }
    }
    if (weapons) weapons.update(dt, player, car, VR.input);
    if (emer) { const sw = VR.screen.w, sh = VR.screen.h; emer.update(dt, player, car, car || player, { x0: cam.x - sw / 2, y0: cam.y - sh / 2, x1: cam.x + sw / 2, y1: cam.y + sh / 2 }, VR.input); }
  }

  // ---------- dibujo ----------
  const tall = [];
  function render(a, dt) {
    VR._bubs = []; // globos de este cuadro (para que no se enciman)
    if (mode === 'title') { renderTitle(a, dt); return; }
    const ctx = VR.screen.ctx, sw = VR.screen.w, sh = VR.screen.h;
    if (teatro.on) { teatro.draw(ctx, sw, sh); return; }
    let [cx, cy] = camView(a);
    if (VR.shakeT > 0) { VR.shakeT -= dt; const k = VR.shakeA * Math.min(1, VR.shakeT * 4); cx += (Math.random() - 0.5) * k; cy += (Math.random() - 0.5) * k; }   // sacudón del golpe
    ctx.fillStyle = '#2b3a22'; ctx.fillRect(0, 0, sw, sh);
    world.draw(ctx, cx, cy, sw, sh);
    world.warm(cx, cy, sw, sh);
    changas.drawGround(ctx, cx, cy);
    if (mis) mis.drawGround(ctx, cx, cy);
    // cosas altas y personajes ordenados por profundidad
    tall.length = 0;
    VR.reveal = car || (online.ride ? null : player);
    world.collectTall(cx, cy, sw, sh, tall);
    fauna.drawGround(ctx, cx, cy, sw, sh);
    cisnes.draw(ctx, cx, cy, night, player.lookData);
    if (!car && !online.ride && !cisnes.riding) tall.push({ sy: VR.lerp(player.py, player.y, a), draw: (c) => { if (weapons && !player.rag && player.dir === 'up') weapons.drawHeld(c, player, cx, cy, a); player.draw(c, cx, cy, a); if (weapons && !player.rag && player.dir !== 'up') weapons.drawHeld(c, player, cx, cy, a); } });
    online.collect(cx, cy, a, tall, car); changas.collect(cx, cy, tall); if (mis) { mis.collect(cx, cy, tall, player); mis.collectPuntos(cx, cy, tall); }
    if (peds) peds.collect(cx, cy, sw, sh, a, tall);
    fauna.collect(cx, cy, sw, sh, tall);
    perros.collect(cx, cy, sw, sh, a, tall); calle.collect(cx, cy, sw, sh, a, tall);
    if (emer) emer.collect(cx, cy, sw, sh, a, tall);
    const vis = world.carsIn(cx - 100, cy - 100, cx + sw + 100, cy + sh + 100, []);
    for (const c of vis) tall.push({ sy: c.y + 10, draw: (ctx) => c.draw(ctx, cx, cy, a) });
    tall.sort((p, q) => p.sy - q.sy);
    for (const t of tall) t.draw(ctx);
    if (VR._late) { for (const b of VR._late) VR.Player.prototype.drawBubble.call(b, ctx, cx, cy, 1); VR._late.length = 0; }   // globos de vendedores y perros, encima de árboles y banderas
    if (weapons) weapons.drawShots(ctx, cx, cy, a);
    if (emer) emer.drawFx(ctx, cx, cy);
    night.update(Math.min(0.1, dt || 0.016), vida ? 'juego' : settings.hora);
    night.render(ctx, cx, cy, sw, sh, vis);
    if (emer) emer.drawFlash(ctx, sw, sh);
    for (const l of world.labels) {
      const lx = l.x - cx, ly = l.y - cy;
      if (lx > -80 && lx < sw + 80 && ly > -20 && ly < sh + 20) VR.gfx.text(ctx, l.text, lx, ly, l.small ? '#ffe9a8' : '#fff6d8', { center: true, shadow: '#1a1a1e', size: l.small ? 7 : 8 });
    }
    if (!online.ride) player.drawBubble(ctx, cx, cy, a);
    drawMini(dt || 0);
    drawGpsArrow(ctx, cx, cy, a);
    if (traffic) for (const v of traffic.list) if (v.honkT > 0) VR.gfx.text(ctx, v.honkTxt, Math.round(v.x - cx), Math.round(v.y - cy - 28), '#fff6d8', { center: true, shadow: '#1a1a1e' });
    if (btnCarT) { const sh = !!car || !!cisnes.riding || !!online.ride || (hint !== '' && /ubir|aseo|ajar/.test(hint)); if (sh !== btnCarShow) { btnCarShow = sh; btnCarT.style.display = sh ? '' : 'none'; } }
    if (hint && hintCar) VR.gfx.text(ctx, hint, Math.round(hintCar.x - cx), Math.round(hintCar.y - cy - 32), '#ffd75e', { center: true, shadow: '#1a1a1e' });
    drawHud();
  }
  let hudT = 0, zoneT = 0, zone = '', barrio = '';
  function drawHud() {
    if (performance.now() - zoneT > 200) {
      zoneT = performance.now();
      const z = world.placeName(player.x, player.y - 2);
      if (z && z !== zone) { zone = z; $('zone').textContent = z; }
      const b = world.barrioName(player.x, player.y - 2) || (world.barrios.length ? 'Afueras' : 'Villarrica');
      if (b !== barrio) {
        if (barrio) {
          const bn = $('banner'), cerr = !VR.Barrios.abierto(b); bn.innerHTML = '<small>' + (b === 'Afueras' ? 'saliendo de' : 'barrio') + '</small>' + (cerr ? '🔒 ' : '') + (b === 'Afueras' ? 'Villarrica' : b) + (cerr ? '<small class="sub">' + VR.Barrios.CARTEL + '<br>(todavía no conocés a nadie acá)</small>' : '');
          bn.classList.add('show'); clearTimeout(bn._h); bn._h = setTimeout(() => bn.classList.remove('show'), 2600);
        }
        barrio = b; $('hudTitle').textContent = (VR.Barrios.abierto(b) ? '' : '🔒 ') + b.toUpperCase();
      }
    }
    if (emer) { const w = $('wanted'), L = emer.level, key = L + ':' + (emer.lost > 0.5 ? 1 : 0);
      if (w._k !== key) { w._k = key; w.hidden = !L; w.innerHTML = '<b>' + '★'.repeat(L) + '</b>' + '☆'.repeat(5 - L); w.classList.toggle('lost', emer.lost > 0.5); } }
    if (weapons) { const wb = $('weapon'), show = weapons.enabled && !car, key = show + weapons.cur + VR.input.source;
      if (wb._k !== key) { wb._k = key; wb.hidden = !show; $('btns').querySelector('[data-b="fire"]').hidden = !show; const W = weapons.weapon; wb.innerHTML = W.ico + ' ' + W.name + '<small>' + (VR.input.source === 'touch' ? 'tocá para cambiar' : VR.input.source === 'pad' ? 'LB cambia' : 'Q cambia') + '</small>'; } }
    const spd = $('speed');
    { const bt = cisnes.riding; for (const b of ['pedL', 'pedR']) { const el = $('btns').querySelector('[data-b="' + b + '"]'); if (el.hidden === bt) el.hidden = !bt; }
      for (const b of ['action', 'run']) { const el = $('btns').querySelector('[data-b="' + b + '"]'); if (el.hidden !== bt) el.hidden = bt; } }
    $('gearBtns').hidden = !(car && VR.drive === 'manual' && VR.input.source === 'touch') || !!VR.autoBox;
    dpanel.update(car, VR.input.source === 'touch');
    if (car && VR.drive === 'manual') spd.hidden = true; // el minipanel ya muestra la velocidad
    else if (car) { spd.hidden = false; spd.firstChild.textContent = car.kmh() + (car.gear ? ' · ' + (car.gear < 0 ? 'R' : car.gear + 'ª') + ' ' : ''); } else if (!spd.hidden) spd.hidden = true;
    if (!settings.fps) { $('dbg').hidden = true; return; }
    if (performance.now() - hudT < 250) return; hudT = performance.now();
    $('dbg').hidden = false;
    $('dbg').textContent = `${VR.loop.fps} fps · ${VR.screen.w}×${VR.screen.h} ×${VR.screen.scale} · tile ${(player.x / 16) | 0}, ${(player.y / 16) | 0}`;
  }

  // ---------- controles táctiles ----------
  const applyTouch = () => {
    const show = settings.touch === 'on' || (settings.touch === 'auto' && (isTouch || VR.input.source === 'touch'));
    $('touch').hidden = !(show && VR.input.source !== 'pad' || settings.touch === 'on');
  };
  VR.input.initTouch($('joyZone'), $('joy'), $('knob'), document.querySelectorAll('#btns .tb'));
  VR.input.vibrate = settings.vib;
  let lastSource = VR.input.source;
  VR.input.onAny = () => { VR.audio.resume(); hideOverlay(); if (VR.input.source !== lastSource) { lastSource = VR.input.source; applyTouch(); } };
  VR.input.onPad = (name, on) => { $('padInfo').textContent = on ? '🎮 Conectado: ' + name : 'Control desconectado.'; toast(on ? '🎮 Control conectado' : 'Control desconectado'); applyTouch(); };

  // ---------- portada / menú / pantalla completa ----------
  function hideOverlay() { $('overlay').hidden = true; }
  const menu = $('menu'), pause = $('pause'), credits = $('credits');
  const resume = () => { VR.input.releaseAll(); VR.input.enabled = true; VR.loop.paused = false; };
  let cfgFrom = 'pause', afterPause = null;
  // Esc / ☰ (10/11/2026, J0): pausa. Desde ahí: mapa, online, configuración (el menú de antes) o volver al menú principal
  function openMenu() { if (mode !== 'game' || pause.open || menu.open) return; VR.input.releaseAll(); VR.input.enabled = false; VR.loop.paused = true; pause.showModal(); }
  pause.addEventListener('close', () => { const f = afterPause; afterPause = null; if (f) f(); else resume(); });
  pause.addEventListener('keydown', (e) => { if (e.code === 'KeyP') pause.close(); });
  const pauseThen = (f) => { afterPause = f; pause.close(); };
  function openConfig(from) { cfgFrom = from; VR.input.releaseAll(); VR.input.enabled = false; menu.showModal(); }
  menu.addEventListener('close', () => { if (cfgFrom === 'pause' && mode === 'game') { VR.loop.paused = true; VR.input.enabled = false; pause.showModal(); } else resume(); }); // la configuración vuelve a donde estabas
  $('pSeguir').onclick = () => pause.close();
  $('pMapa').onclick = () => pauseThen(() => { resume(); openMap(); });
  $('pOnline').onclick = () => pauseThen(() => { resume(); $('onDlg').showModal(); });
  $('pConfig').onclick = () => pauseThen(() => openConfig('pause'));
  $('pSalir').onclick = () => pauseThen(() => { resume(); if (cisnes.riding) toast('🦢 Bajate del cisne antes de salir'); else toTitle(); });
  $('btnMenu').onclick = openMenu;
  // ---------- Historia: Billetera, Metas y presentación (J1) ----------
  const vDlg = $('vDlg'), vBody = $('vBody'), gs = VR.fmtGs, esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  let vTab = 'bill';
  function openVida(tab) {
    vTab = tab; VR.input.releaseAll(); VR.input.enabled = false; VR.loop.paused = true;
    if (!vDlg.open) vDlg.showModal(); paintVida();
  }
  function paintVida() {
    if (!vida) return; const s = vida.s, P = s.pieza, pr = VR.PRECIOS;
    if (vTab === 'mis' && mis) { paintMis(); return; }
    if (vTab === 'metas') {
      vBody.innerHTML = '<h2>⭐ Metas</h2><p>Tu lista de sueños. Tenés ' + gs(VR.Wallet.get()) + '.</p>' + VR.METAS.map(([n, c]) => {
        const f = c - VR.Wallet.get(); return '<div class="mv"><span>' + esc(n) + '</span><span>' + gs(c) + ' <i>' + (f <= 0 ? '¡te alcanza!' : 'faltan ' + gs(f)) + '</i></span></div>';
      }).join('') + '<p>Se van cumpliendo con las misiones y la economía que llegan en las próximas etapas.</p><div class="row"><button class="btn" data-v="bill">💵 Billetera</button><button class="btn primary" data-v="x">Cerrar</button></div>';
    } else {
      const venc = P.saldo > 0 ? 'Debés ' + gs(P.saldo) : 'Vence el ' + VR.DIAS[((P.vence / 1440) | 0) % 7] + ' (' + gs(pr.pieza) + ')';
      vBody.innerHTML = '<h2>💵 Billetera</h2><div class="mv"><span>Tenés</span><b>' + gs(VR.Wallet.get()) + '</b></div>' +
        '<div class="mv"><span>🏠 Pieza (Ña Ramona)</span><span>' + venc + '</span></div>' +
        '<div class="mv"><span>📱 Saldo</span><span>' + (s.saldo > 0 ? Math.ceil(s.saldo) + ' días' : 'sin saldo') + '</span></div>' +
        '<div class="mv"><span>🍽 Hambre</span><span>' + Math.round(s.hambre) + ' / 100</span></div>' +
        (s.debe > 0 ? '<div class="mv"><span class="neg">Deuda (se paga el 50 % de cada cobro)</span><b class="neg">' + gs(s.debe) + '</b></div>' : '') +
        '<div class="mv"><span>🧺 Canasto de chipa</span><span>' + (s.canasto ? s.stock + ' / ' + pr.canastoMax + ' chipas' : 'no tenés') + '</span></div>' +
        (s.fiado > 0 ? '<div class="mv"><span class="neg">Le debés a Doña Chela</span><b class="neg">' + gs(s.fiado) + '</b></div>' : '') +
        '<p>Comida y saldo: en la despensa (al sudeste de la plaza) o con Doña Chela. La pieza se le paga a Ña Ramona; en la pieza se duerme y se guarda.</p>' +
        '<h3>Últimos movimientos</h3>' + (s.mov.length ? s.mov.slice(0, 10).map(([d, h, n, w]) => '<div class="mv"><span>' + esc(w) + ' <i>día ' + d + ' · ' + h + '</i></span><b class="' + (n >= 0 ? 'pos' : 'neg') + '">' + (n >= 0 ? '+' : '') + gs(n) + '</b></div>').join('') : '<p>Todavía no hay movimientos.</p>') +
        '<div class="row"><button class="btn" data-v="metas">⭐ Metas</button><button class="btn primary" data-v="x">Cerrar</button></div>';
    }
    vBody.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => {
      const v = b.dataset.v;
      if (v === 'x') { vDlg.close(); return; }
      if (v === 'metas' || v === 'bill') { vTab = v; paintVida(); return; }
      if (v === 'pieza') vida.pagaPieza(); else if (v === 'chipa') vida.come(pr.chipa, 15, 'Chipa'); else if (v === 'plato') vida.come(pr.plato, 50, 'Plato del día');
      else if (v === 'helado') vida.come(pr.helado, 12, 'Helado'); else if (v === 'saldo') vida.cargaSaldo();
      vidaHud(0, true); paintVida();
    });
  }
  // Pausa → Misiones (J2): la activa con su objetivo, las que hay para empezar, las cumplidas y los barrios abiertos
  function paintMis() {
    const R = mis.resumen(), A = R.act;
    let h = '<h2>📌 Misiones</h2><p>Capítulo ' + R.cap + ' · <b style="color:var(--text)">' + esc(VR.CAPITULOS[R.cap] || '') + '</b></p>';
    if (A) h += '<h3>En curso</h3><div class="mv"><span><b style="color:var(--accent)">' + esc(A.titulo) + '</b> <i>paso ' + A.paso + ' de ' + A.de + '</i></span></div><p style="color:var(--text)">' + (A.fallo ? '✖ ' + esc(A.fallo) : '➡ ' + esc(A.obj)) + '</p>' +
      '<div class="row"><button class="btn" data-m="gps">🧭 Marcar en el GPS</button><button class="btn" data-m="re">🔁 Reintentar desde el último punto</button><button class="btn" data-m="no">Dejar para después</button></div>';
    else h += '<p>No tenés ninguna misión en curso.</p>';
    if (R.disp.length) h += '<h3>Para empezar</h3>' + R.disp.map((d) => '<div class="mv"><span><b style="color:var(--text)">' + esc(d.titulo) + '</b> <i>cap. ' + d.cap + '</i><br><small>' + esc(d.desc || '') + '</small></span><span>' + (d.quien ? '<button class="btn" data-o="' + d.id + '">❗ ' + esc(d.quien) + '</button>' : '<button class="btn primary" data-s="' + d.id + '">▶ Empezar</button>') + '</span></div>').join('');
    if (R.hechas.length) h += '<h3>Cumplidas</h3>' + R.hechas.map((d) => '<div class="mv"><span>✔ ' + esc(d.titulo) + '</span></div>').join('');
    h += '<h3>Barrios</h3><p>' + world.barrios.map((b) => (VR.Barrios.abierto(b) ? '🟢 ' : '🔒 ') + esc(b)).join(' · ') + '</p><p>En un barrio 🔒 todavía no conocés a nadie: no hay changas ni misiones y el GPS no marca destinos.</p>';
    h += '<div class="row"><button class="btn" data-v="bill">💵 Billetera</button><button class="btn primary" data-v="x">Cerrar</button></div>';
    vBody.innerHTML = h;
    const cerrar = (f) => { vDlg._intro = true; vDlg.close(); f(); };
    vBody.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { const v = b.dataset.m; if (v === 'gps') cerrar(() => mis.marcar()); else if (v === 're') cerrar(() => mis.reintentar()); else { mis.abandonar(); paintMis(); } });
    vBody.querySelectorAll('[data-o]').forEach((b) => b.onclick = () => cerrar(() => { mis.marcarOferta(b.dataset.o); }));
    vBody.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => cerrar(() => mis.empezar(b.dataset.s)));
    vBody.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => { if (b.dataset.v === 'x') vDlg.close(); else { vTab = b.dataset.v; paintVida(); } });
  }
  vDlg.addEventListener('close', () => { if (mode === 'game' && !vDlg._intro) { VR.loop.paused = true; VR.input.enabled = false; pause.showModal(); } else { vDlg._intro = false; resume(); } });
  $('pBill').onclick = () => pauseThen(() => openVida('bill'));
  $('pMetas').onclick = () => pauseThen(() => openVida('metas'));
  $('pCel').onclick = () => pauseThen(() => openCel());
  // ---------- celular (Historia): apps; Mbohasa (viajes en moto o auto, nombre inventado), billeteras, mochila, ropero ----------
  const celDlg = $('celDlg'), celBody = $('celBody'); let celApp = 'home', jaha = null;
  const JAHA = { moto: { n: 'Moto', ico: '🏍', base: 10000, km: 3000, kmh: 28 }, auto: { n: 'Auto', ico: '🚗', base: 15000, km: 5000, kmh: 32 } };
  if (vida) $('btnCel').hidden = false;
  $('btnCel').onclick = () => openCel();
  $('celHome').onclick = () => { celApp = 'home'; paintCel(); };
  $('celBack').onclick = () => { if (celApp === 'home') celDlg.close(); else { celApp = 'home'; paintCel(); } }; // atrás: de una app al inicio; desde el inicio, cierra
  $('celClose').onclick = () => celDlg.close();
  celDlg.addEventListener('close', () => { if (!celDlg._keep) { VR.loop.paused = false; VR.input.enabled = true; } celDlg._keep = false; });
  function openCel(app) { if (!vida || mode !== 'game') return; VR.input.releaseAll(); VR.input.enabled = false; VR.loop.paused = true; celApp = app || 'home'; paintCel(); if (!celDlg.open) celDlg.showModal(); }
  const celGo = (f) => { celDlg._keep = true; celDlg.close(); f(); };
  function paintCel() {
    const s = vida.s, gs = VR.fmtGs, net = s.saldo > 0; celDlg.classList.toggle('roto', vida.celuRoto());
    $('celHora').textContent = vida.diaSemana + ' ' + vida.hhmm; $('celSaldo').textContent = (vida.celuRoto() ? '💔 ' : '') + (net ? '📶 ' + Math.ceil(s.saldo) + ' d' : '📵 sin saldo');
    let h = '';
    if (celApp === 'home') {
      const A = [['jaha', '🛵', 'Mbohasa', '#ffd84a', net], ['bill', '🏦', 'Billetera', '#3cc87a', true], ['mochila', '🎒', 'Mochila', '#b07a3a', true], ['ropero', '👕', 'Ropero', '#f29ac8', true],
        ['changas', '📋', 'Changas', '#8fd0ff', net], ['mis', '📌', 'Misiones', '#ff5fa2', true], ['metas', '⭐', 'Metas', '#ffb36b', true], ['mapa', '🗺', 'Mapa', '#7fe08a', true]];
      h = '<div class="apps">' + A.map(([k, i, n, c, on]) => '<button class="app' + (on ? '' : ' off') + '" data-a="' + k + '"><i style="background:' + c + '">' + i + '</i>' + n + '</button>').join('') + '</div>' + (net ? '' : '<p>Sin saldo no andan las apps que usan internet. Cargá en la despensa.</p>') + (vida.celuRoto() ? '<p>💔 Tenés la pantalla rota: se ve mal y a veces no responde. Arreglala o comprá uno nuevo en <b>Celu Porã</b> (en el mapa: ☎).</p>' : '');
    } else if (celApp === 'jaha') {
      h = '<h3>🛵 Mbohasa</h3>';
      if (jaha) h += '<p>' + JAHA[jaha.tipo].ico + ' Tu ' + JAHA[jaha.tipo].n.toLowerCase() + ' llega en ' + Math.ceil(jaha.t) + ' s.</p><button class="cbtn sec" data-j="x">Cancelar</button>';
      else if (!dest) h += '<p>Marcá a dónde vas en el 🗺 Mapa y volvé a abrir Mbohasa.</p><button class="cbtn" data-a="mapa">🗺 Abrir el mapa</button>';
      else { const km = Math.hypot(dest.x - player.x, dest.y - player.y) / 8000 * 1.3;
        h += '<p>A: <b>' + esc(dest.name || 'destino') + '</b> · ' + km.toFixed(1).replace('.', ',') + ' km</p><p>Se paga con la billetera electrónica (tenés ' + gs(s.banco) + ').</p>';
        for (const t in JAHA) { const J = JAHA[t], pr = Math.round((J.base + J.km * km) / 1000) * 1000; h += '<button class="cbtn" data-j="' + t + '" data-p="' + pr + '"' + (s.banco < pr || car ? ' disabled' : '') + '>' + J.ico + ' ' + J.n + ' · ' + gs(pr) + '</button>'; }
        if (car) h += '<p>Bajate del vehículo para pedir.</p>'; }
    } else if (celApp === 'bill') {
      h = '<h3>🏦 Billetera</h3><div class="row2"><span>💵 Efectivo</span><b>' + gs(VR.Wallet.get()) + '</b></div><div class="row2"><span>🏦 Electrónica</span><b>' + gs(s.banco) + '</b></div>' +
        (vida.deudaTotal() > 0 ? '<div class="row2" style="color:#ff8a7a"><span>⚠ Deudas</span><b>' + gs(vida.deudaTotal()) + '</b></div>' : '') +
        s.prestamos.map((p) => '<div class="row2" style="color:#ffb36b"><span>💳 ' + VR.PREST[p.q].n + ' · cuota ' + gs(p.cuota) + '/sáb</span><b>' + gs(p.resta) + '</b></div>').join('') +
        '<p>Efectivo: chipa, despensa, Doña Chela, Ña Ramona. Electrónica: Mbohasa, changas de la app, Ao Porã. En los 🏧 cajeros (banco del Centro y Santa Lucía) depositás o sacás.</p>' +
        s.mov.slice(0, 8).map((m) => '<div class="row2"><span>' + esc(m[3]) + '</span><span style="color:' + (m[2] < 0 ? '#ff8a7a' : '#9fe0a0') + '">' + (m[2] > 0 ? '+' : '') + gs(m[2]) + '</span></div>').join('');
    } else if (celApp === 'mochila') {
      h = '<h3>🎒 Mochila</h3><div class="row2"><span>🧺 Canasto de chipa</span><span>' + (s.canasto ? s.stock + ' chipas' : '—') + '</span></div>' +
        (s.canasto ? '<button class="cbtn" data-m="canasto">' + (s.equipo === 'canasto' ? 'Guardar el canasto' : 'Llevar el canasto en la mano') + '</button>' : '') +
        '<div class="row2"><span>🪖 Casco</span><span>' + (s.casco ? 'sí' : 'no tenés') + '</span></div><div class="row2"><span>🔧 Herramientas</span><span>' + (s.herr ? 'sí' : 'no tenés') + '</span></div>';
    }
    celBody.innerHTML = h;
    celBody.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => { const a = b.dataset.a;
      if (b.classList.contains('off')) { toast('📵 Sin saldo'); return; }
      if (vida.celuRoto() && Math.random() < 0.12) { toast('📱 La pantalla rota no responde... probá de nuevo'); return; }
      if (a === 'ropero') celGo(() => { shop.ropero = true; openShop(); });
      else if (a === 'changas') celGo(() => changas.open());
      else if (a === 'mis' || a === 'metas') celGo(() => openVida(a === 'mis' ? 'mis' : 'metas'));
      else if (a === 'mapa') celGo(() => { VR.loop.paused = false; VR.input.enabled = true; openMap(); });
      else { celApp = a; paintCel(); } });
    celBody.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { celGo(() => toggleEq()); });
    celBody.querySelectorAll('[data-j]').forEach((b) => b.onclick = () => {
      if (b.dataset.j === 'x') { jaha = null; toast('Cancelaste el Mbohasa'); paintCel(); return; }
      if (!VR.Barrios.enPunto(world, player.x, player.y)) { toast('🔒 Mbohasa no entra acá: ' + VR.Barrios.CARTEL); return; }
      jaha = { tipo: b.dataset.j, precio: +b.dataset.p, t: 8 + Math.random() * 10, dest: { ...dest } }; celDlg.close(); toast(JAHA[jaha.tipo].ico + ' Pediste un Mbohasa: llega en ' + Math.ceil(jaha.t) + ' s'); });
  }
  // el Mbohasa llega: subís y en un ratito estás (pasa la hora del viaje y se cobra de la billetera electrónica)
  function updateMbohasa(dt) {
    if (!jaha) return; jaha.t -= dt; if (jaha.t > 0) return;
    const J = jaha, T = JAHA[J.tipo]; jaha = null;
    if (car) { toast('Tu Mbohasa te esperó y se fue: estabas manejando'); return; }
    mis.dialogo([{ quien: 'sis', titulo: '🛵 Mbohasa', txt: T.ico + ' Llegó tu ' + T.n.toLowerCase() + '. Viaje a ' + (J.dest.name || 'tu destino') + ' por ' + VR.fmtGs(J.precio) + '.', op: [['Subir', () => true], ['Cancelar', () => false]] }], () => {
      if (!vida.pagaBanco(J.precio, 'Mbohasa (' + T.n.toLowerCase() + ')')) return;
      const f = $('celFade'), km = Math.hypot(J.dest.x - player.x, J.dest.y - player.y) / 8000 * 1.3; f.textContent = T.ico + ' En viaje…'; f.classList.add('on');
      setTimeout(() => { teleport(J.dest.x, J.dest.y, J.dest.name, true); vida.s.min += km / T.kmh * 60; vida.sync(); if (mis) mis.emit('jaha', J); setTimeout(() => f.classList.remove('on'), 300); }, 900);
    });
  }
  $('pMis').onclick = () => pauseThen(() => openVida('mis'));
  $('btnSaltar').onclick = () => { if (!mis || !mis.s.act) { toast('No hay misión en curso'); return; } menu.close(); mis.saltar(); toast('⏭ Paso saltado'); };
  $('btnBarrios').onclick = () => { if (!mis) return; world.barrios.forEach((b) => VR.Barrios.abrir(b)); toast('🗺 Todos los barrios abiertos'); };
  // presentación de una Historia nueva
  function maybeIntro() {
    if (!vida || !vida.nueva) return; vida.nueva = false; vida.save();
    vDlg._intro = true; VR.input.releaseAll(); VR.input.enabled = false; VR.loop.paused = true;
    vBody.innerHTML = '<h2>📖 Jajupíta</h2><p style="color:var(--text)">Te quedaste sin changa. Alquilás una pieza en <b>Santa Lucía</b> y en el bolsillo tenés <b>35.000 Gs.</b></p>' +
      '<p>La pieza cuesta ' + gs(VR.PRECIOS.pieza) + ' por semana y Ña Ramona cobra los sábados. Hoy es lunes.</p>' +
      '<p>Tenés que comer (el hambre baja todo el día), cargar saldo y juntar plata. Un día del juego dura 30 minutos. Mirá arriba a la izquierda: hora, hambre, saldo y pieza. Más cosas llegan en las próximas etapas.</p>' +
      '<div class="row"><button class="btn primary" id="vGo">Jajupíta ▶</button></div>';
    $('vGo').onclick = () => vDlg.close(); vDlg.showModal();
  }
  // empezar la Historia de cero (en Configuración)
  { let sure = 0; const bh = $('btnBorraH'); bh.onclick = () => {
    if (performance.now() > sure) { sure = performance.now() + 4000; bh.textContent = '⚠ ¿Seguro? Se borra todo lo de Historia · tocá otra vez'; setTimeout(() => { if (performance.now() > sure - 100) bh.textContent = '🗑 Empezar la Historia de cero'; }, 4100); return; }
    VR.wiped = true; VR.store.wipeHistoria(); try { sessionStorage.removeItem('villarrica:onl'); } catch (e) {} try { online.stop(); } catch (e) {} bh.textContent = '🗑 Empezar la Historia de cero'; sure = 0;
    if (vida) { toast('🗑 Historia borrada: arrancá de nuevo'); try { sessionStorage.setItem('villarrica:go', 'historia'); } catch (e) {} setTimeout(() => location.reload(), 600); } else { toast('🗑 Historia borrada'); tagHist(); }
  }; }
  $('menuClose').onclick = () => menu.close();
  menu.addEventListener('keydown', (e) => { if (e.code === 'KeyP' && !/INPUT/.test(e.target.tagName)) menu.close(); });
  $('btnFull').onclick = () => {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => toast('Pantalla completa no disponible'));
    else toast('En iPhone: Compartir → "Agregar a inicio" para jugar a pantalla completa');
  };
  const seg = (id, key, onChange) => {
    const s = $(id), paint = () => s.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === settings[key]));
    s.querySelectorAll('button').forEach((b) => b.onclick = () => { settings[key] = b.dataset.v; VR.store.set(key, settings[key]); paint(); onChange(); });
    paint();
    return paint;
  };
  seg('segTouch', 'touch', applyTouch);
  seg('segHora', 'hora', () => {});
  seg('segFondo', 'fondo', () => title.setMode(settings.fondo));
  // ---- online ----
  const changas = new VR.Changas({ world, peds, setDest, toast, getCar: () => car, player, enterCar, exitCar, cars }); $('btnJobs').onclick = () => changas.open();
  // ---- misiones de la Historia (J2) ----
  VR.myLook = () => player.lookData;
  const showBanner = (chico, grande, sub) => { const bn = $('banner'); bn.innerHTML = '<small>' + chico + '</small>' + grande + (sub ? '<small class="sub">' + sub + '</small>' : ''); bn.classList.add('show'); clearTimeout(bn._h); bn._h = setTimeout(() => bn.classList.remove('show'), 2800); };
  const mis = VR.mis = vida ? new VR.Misiones({ world, player, toast, setDest, getCar: () => car, vida, changas, banner: showBanner }) : null;
  const online = new VR.Online(); cine = new VR.Cine(online); const teatro = new VR.Teatro(player, online, toast); teatro.btn.onclick = () => cine.open(); online.bind({ world, traffic, peds, emer, weapons, night: VR.night, cars, fauna, cisnes });
  $('onNick').value = VR.store.get('nick', ''); $('onRoom').value = VR.store.get('sala', '');
  online.onStatus = (st) => { $('onStatus').textContent = st; };
  const goOnline = (host) => {
    const nick = $('onNick').value.trim() || 'Jugador', room = $('onRoom').value.trim().replace(/[^a-z0-9]/gi, '') || String(1000 + ((Math.random() * 9000) | 0));
    $('onRoom').value = room; VR.store.set('nick', nick); VR.store.set('sala', room); online.set('Conectando…'); online.start(nick, room, host);
  };
  // ---- chat: el personaje lo dice (globo) y, online, les llega a todos ----
  const chatLog = $('chatLog'), chatBox = $('chatBox'), chatIn = $('chatIn');
  VR.chatLine = (n, t) => { const d = document.createElement('div'); d.innerHTML = '<b></b> '; d.firstChild.textContent = n + ':'; d.append(t); chatLog.append(d); while (chatLog.children.length > 6) chatLog.firstChild.remove(); setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 1000); }, 12000); };
  const openChat = () => { chatBox.hidden = false; VR.input.releaseAll(); chatIn.focus(); };
  const closeChat = () => { chatBox.hidden = true; chatIn.value = ''; chatIn.blur(); };
  $('btnChat').onclick = () => (chatBox.hidden ? openChat() : closeChat());
  chatBox.onsubmit = (e) => { e.preventDefault(); const t = chatIn.value.trim(); if (t) { player.say(t, 4); VR.chatLine(online.nick || VR.store.get('nick', '') || 'Vos', t); online.ev({ e: 'chat', t }); } closeChat(); };
  chatIn.addEventListener('keydown', (e) => { if (e.code === 'Escape') { e.stopPropagation(); closeChat(); } });
  addEventListener('keydown', (e) => { if (e.code === 'KeyC' && vida && mode === 'game' && !document.querySelector('dialog[open]')) { e.preventDefault(); openCel(); return; } if (e.code === 'KeyC' && !vida && chatBox.hidden && !/INPUT/.test(e.target.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); openChat(); } });
  { const box = document.querySelector('.online'), dlg = $('onDlg'); $('onSlot').append(box); for (const h of document.querySelectorAll('#menu h3')) if (/Online/.test(h.textContent)) h.remove();
    $('btnOnline').onclick = () => { VR.input.releaseAll(); dlg.showModal(); }; $('onClose').onclick = () => dlg.close(); }
  setInterval(() => {
    const on = !!(online.peer && online.conns.length), n = online.names();
    $('onList').textContent = online.peer ? 'Conectados: ' + n.join(', ') : '';
    $('onHud').hidden = !on; if (on) $('onHud').innerHTML = '<b>🌐 Sala ' + online.room + '</b><br>' + n.map((s) => s.replace(/[<>&]/g, '')).join('<br>');
  }, 1000);
  $('onRef').onclick = async () => {
    const box = $('onSalas'); box.textContent = 'Buscando…';
    let L; try { L = await VR.Salas.list(); } catch (e) { box.textContent = 'No se pudo ver la lista (¿hay internet?)'; return; }
    if (!L) { box.textContent = 'La lista de salas todavía no está configurada: entrá con código.'; return; }
    box.textContent = L.length ? '' : 'No hay salas abiertas. ¡Creá una!';
    for (const s of L) { const b = document.createElement('button'); b.textContent = '▶ ' + s.n + ' · de ' + s.h + ' · ' + s.j + ' jugando'; b.onclick = () => { $('onRoom').value = s.n; goOnline(false); }; box.append(b); }
  };
  $('onHost').onclick = () => goOnline(true); $('onJoin').onclick = () => goOnline(false); $('onStop').onclick = () => online.stop();
  const dpanel = new VR.DrivePanel();
  for (const [id, d] of [['gearUp', 1], ['gearDn', -1]]) $(id).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); VR.gearReq = d; VR.input.buzz && VR.input.buzz(10); });
  seg('segManejo', 'manejo', () => { VR.drive = settings.manejo; if (car) car.gear = null; });
  const paintPj = seg('segPj', 'pj', () => { player.setLook(settings.pj); if (car && car.rider) car.rider = me(); });
  $('btnPlata').onclick = () => { VR.Wallet.add(1000000); toast('💵 Ahora tenés ' + VR.fmtGs(VR.Wallet.get())); };
  $('optFps').checked = settings.fps; $('optFps').onchange = (e) => { settings.fps = e.target.checked; VR.store.set('fps', settings.fps); };
  $('optSnd').checked = emer ? emer.sound : true; $('optSnd').onchange = (e) => { if (emer) emer.sound = e.target.checked; VR.audio.setOn(e.target.checked); VR.store.set('snd', e.target.checked); };
  $('optVib').checked = settings.vib; $('optVib').onchange = (e) => { settings.vib = VR.input.vibrate = e.target.checked; VR.store.set('vib', settings.vib); };
  if (weapons) {
    const paintArma = () => $('segArma').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === weapons.cur));
    $('optArmas').checked = weapons.enabled; $('optArmas').onchange = (e) => weapons.setEnabled(e.target.checked);
    $('optSinEstrellas').checked = weapons.noStars; $('optSinEstrellas').onchange = (e) => { weapons.noStars = e.target.checked; VR.store.set('dev:sinEstrellas', weapons.noStars); };
    $('segArma').querySelectorAll('button').forEach((b) => b.onclick = () => { weapons.select(b.dataset.v); paintArma(); });
    paintArma(); menu.addEventListener('close', () => { paintArma(); }); 
    $('weapon').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); weapons.next(); paintArma(); });
  }
  $('btnReset').onclick = () => { if (car) { car.driven = false; car.v = 0; car = null; zoomPoke(); driveLabels(false); } player.x = player.px = world.spawn.x; player.y = player.py = world.spawn.y; cam.x = cam.px = player.x; cam.y = cam.py = player.y; menu.close(); toast('📍 De vuelta en ' + world.spawnName); };

  // ---------- mapa de la ciudad ----------
  let mapOpen = false, mapBuilt = false;
  const MAPCOL = [[92, 158, 58], [70, 70, 78], [196, 188, 172], [196, 120, 92], [200, 150, 112], [52, 112, 44], [230, 230, 230], [168, 98, 64], [70, 130, 200], [124, 116, 104], [182, 104, 64], [190, 188, 184], [140, 114, 86], [88, 108, 72], [206, 188, 152], [168, 92, 66]];
  function buildMap() {
    const c = $('mapCanvas'); c.width = world.w; c.height = world.h;
    const x = c.getContext('2d'), img = x.createImageData(world.w, world.h), d = img.data;
    for (let i = 0; i < world.tiles.length; i++) {
      let col = MAPCOL[world.tiles[i]] || [255, 0, 255];
      if (world.line[i] === 1 || world.line[i] === 2) col = [226, 191, 69];
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    // límites de los barrios (11/11/2026): cada barrio con su color suave y un borde marcado entre barrios
    if (world.barrio) {
      const BC = [[255, 120, 90], [90, 170, 255], [255, 205, 70], [190, 110, 255], [70, 220, 150], [255, 120, 190], [120, 230, 235], [255, 160, 60]], N = world.w * world.h, w = world.w, B = world.barrio;
      for (let i = 0; i < N; i++) { const b = B[i]; if (!b) continue; const c = BC[(b - 1) % BC.length]; for (let k = 0; k < 3; k++) d[i * 4 + k] = d[i * 4 + k] * 0.7 + c[k] * 0.3; }
      const put = (i, c) => { if (i < 0 || i >= N) return; d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; };
      for (let y = 1; y < world.h - 1; y++) for (let xx = 1; xx < w - 1; xx++) {
        const i = y * w + xx, b = B[i];
        if (b !== B[i + 1]) { const c = BC[((b || B[i + 1]) - 1) % BC.length]; put(i, c); put(i + 1, c); put(i - 1, c); put(i + 2, c); put(i - 2, c); put(i + 3, c); }
        if (b !== B[i + w]) { const c = BC[((b || B[i + w]) - 1) % BC.length]; put(i, c); put(i + w, c); put(i - w, c); put(i + 2 * w, c); put(i - 2 * w, c); put(i + 3 * w, c); }
      }
    }
    x.putImageData(img, 0, 0);
    const L = $('mapLabels'); L.innerHTML = '';
    for (const l of (world.barrioLabels || []).map((b) => ({ ...b, cls: 'barrio' })).concat(world.labels)) {
      const s = document.createElement('span'); s.textContent = l.text; if (l.cls) s.className = l.cls; if (l.small) s.className = 'small'; if (l.cls === 'barrio') s.dataset.barrio = l.text;
      s.style.left = (l.x / 16) + 'px'; s.style.top = (l.y / 16) + 'px'; L.appendChild(s);
    }
    mapBuilt = true;
  }
  // ---------- mapa grande: zoom (rueda, pellizco, botones, + y −), arrastrar, tocar para marcar destino ----------
  const mv = { k: 0, ox: 0, oy: 0 }, mapBox = $('mapBox'), mapInner = $('mapInner');
  const fitK = () => Math.min(innerWidth / world.w, innerHeight / world.h) * 0.96;
  function mapApply() {
    const fk = fitK();
    mv.k = VR.clamp(mv.k, fk * 0.9, 14);
    const W = world.w * mv.k, H = world.h * mv.k, m = 60;
    mv.ox = W < innerWidth ? (innerWidth - W) / 2 : VR.clamp(mv.ox, innerWidth - W - m, m);
    mv.oy = H < innerHeight ? (innerHeight - H) / 2 : VR.clamp(mv.oy, innerHeight - H - m, m);
    mapInner.style.transform = `translate(${mv.ox}px, ${mv.oy}px) scale(${mv.k})`;
    mapInner.style.setProperty('--ik', 1 / mv.k);
    // nombres chicos solo cuando hay zoom suficiente
    $('mapLabels').classList.toggle('far', mv.k < fk * 1.8);
  }
  function mapZoom(f, cx = innerWidth / 2, cy = innerHeight / 2) {
    const k0 = mv.k, k1 = VR.clamp(k0 * f, fitK() * 0.9, 14);
    mv.ox = cx - (cx - mv.ox) * k1 / k0; mv.oy = cy - (cy - mv.oy) * k1 / k0; mv.k = k1; mapApply();
  }
  function mapCenterOn(px, py) { mv.ox = innerWidth / 2 - px / 16 * mv.k; mv.oy = innerHeight / 2 - py / 16 * mv.k; mapApply(); }
  function sizeMap() {
    $('mapCanvas').style.width = world.w + 'px'; $('mapCanvas').style.height = world.h + 'px';
    mapInner.style.width = world.w + 'px'; mapInner.style.height = world.h + 'px';
    $('mapRoute').setAttribute('width', world.w); $('mapRoute').setAttribute('height', world.h);
    const f = car || player;
    $('mapMe').style.left = (f.x / 16) + 'px'; $('mapMe').style.top = (f.y / 16) + 'px';
    $('mapWhere').textContent = (zone || '—') + (barrio && barrio !== 'Villarrica' ? ' · ' + barrio : '');
    if (!mv.k) { mv.k = fitK(); mapApply(); } else mapCenterOn(f.x, f.y);
    drawMapRoute();
  }
  const drawMapFriends = () => { // amigos en el mapa grande: punto celeste con el nombre (tocalo para ir); y las marcas de la misión
    $('mapFriends').innerHTML = (mis ? mis.marcas() : []).map((m) => { const x = m.x / 16 * mv.k + mv.ox, y = m.y / 16 * mv.k + mv.oy;
      return `<div style="position:absolute;left:${x - 10}px;top:${y - 10}px;width:20px;height:20px;border-radius:50%;background:${m.c};border:2px solid #1a1a1e;box-sizing:border-box;font:900 12px/16px system-ui;text-align:center;color:#1a1a1e">${m.ico === '●' ? '' : m.ico}</div><div style="position:absolute;left:${x}px;top:${y - 30}px;transform:translateX(-50%);font:700 12px system-ui;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000;white-space:nowrap">${String(m.name || '').replace(/[<>&"]/g, '')}</div>`; }).join('') + [...online.others.values()].map((o) => { const x = o.x / 16 * mv.k + mv.ox, y = o.y / 16 * mv.k + mv.oy, n = String(o.n || '').replace(/[<>&"]/g, '');
      return `<div style="position:absolute;left:${x - 8}px;top:${y - 8}px;width:16px;height:16px;border-radius:50%;background:#3fd3ff;border:2px solid #0b2a36;box-sizing:border-box"></div><div style="position:absolute;left:${x}px;top:${y - 26}px;transform:translateX(-50%);font:700 13px system-ui;color:#fff;text-shadow:0 0 3px #0b2a36,0 0 3px #0b2a36;white-space:nowrap">${n}</div>`; }).join('');
  };
  setInterval(() => { if (mapOpen) drawMapFriends(); }, 500);
  function openMap() { if (!mapBuilt) buildMap(); if (vida) $('mapLabels').querySelectorAll('[data-barrio]').forEach((s) => { s.textContent = (VR.Barrios.abierto(s.dataset.barrio) ? '' : '🔒 ') + s.dataset.barrio; }); drawMapFriends(); mapOpen = true; VR.input.releaseAll(); $('mapView').hidden = false; sizeMap(); }
  function closeMap() { mapOpen = false; $('mapView').hidden = true; }
  $('btnMap').onclick = () => (mapOpen ? closeMap() : openMap());
  $('mzClose').onclick = closeMap;
  $('mzIn').onclick = () => mapZoom(1.6);
  $('mzOut').onclick = () => mapZoom(1 / 1.6);
  $('mzMe').onclick = () => { if (mv.k < fitK() * 3) mv.k = fitK() * 4; const f = car || player; mapCenterOn(f.x, f.y); };
  $('mzClear').onclick = () => { setDest(null); };
  $('mzGo').onclick = () => { if (dest) teleport(dest.x, dest.y, dest.name); };
  // ---------- teletransporte (05/11/2026): aparecés donde marcaste en el mapa, a pie o con el vehículo ----------
  function teleport(px, py, name, viaje) {
    if (vida && !viaje) { toast('🚫 En Historia no hay teletransporte: se viaja en mototaxi (llega más adelante)'); return; }
    const S = VR.TILE, T = VR.T, tx0 = Math.floor(px / S), ty0 = Math.floor(py / S);
    const isRoad = (t) => t === T.ROAD || t === T.STONE || t === T.DIRTROAD;
    const walk = (t) => t === T.SIDEWALK || t === T.PAVING || t === T.CHECKER || t === T.GRASS || t === T.DIRT || t === T.PLAZADIRT;
    let spot = null;
    for (let r = 0; r < 60 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = tx0 + dx, ty = ty0 + dy, t = world.get(tx, ty), x = tx * S + 8, y = ty * S + 10;
      if (car) {
        if (!isRoad(t)) continue;
        const a = isRoad(world.get(tx - 1, ty)) && isRoad(world.get(tx + 1, ty)) ? Math.PI / 2 : 0;
        if (!car.contacts(x, y, a)) spot = [x, y, a];
      } else if (walk(t) && !world.hits(x - player.HW, y - player.HH, x + player.HW, y)) spot = [x, y];
    }
    if (!spot) { toast('No encontré lugar libre cerca de ahí'); return; }
    if (car) {
      world.removeBox(car); car.x = car.px = spot[0]; car.y = car.py = spot[1]; car.a = car.pa = spot[2]; car.v = car.vx = car.vy = car.w = 0; world.addBox(car);
      player.x = player.px = car.x; player.y = player.py = car.y;
    } else { player.x = player.px = spot[0]; player.y = player.py = spot[1]; player.moving = false; }
    const f = car || player; cam.x = cam.px = f.x; cam.y = cam.py = f.y - (car ? 0 : 10); cam.lx = cam.ly = 0;
    dest = null; route = null; VR.store.set('dest:' + world.id, null); updateGpsHud(); drawMapRoute();
    closeMap(); toast('✨ Apareciste en ' + (name || world.placeName(spot[0], spot[1]) || 'el lugar marcado'));
  }
  for (const id of ['mzClose', 'mzIn', 'mzOut', 'mzMe', 'mzClear', 'mzGo']) $(id).addEventListener('pointerdown', (e) => e.stopPropagation());
  const ptrs = new Map(); let pinch = null, dragMoved = 0;
  mapBox.addEventListener('pointerdown', (e) => {
    e.preventDefault(); try { mapBox.setPointerCapture(e.pointerId); } catch (x) {}
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) dragMoved = 0;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; dragMoved = 99; }
  });
  mapBox.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1) { dragMoved += Math.abs(dx) + Math.abs(dy); mv.ox += dx; mv.oy += dy; mapApply(); }
    else if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      mv.ox += mx - pinch.mx; mv.oy += my - pinch.my; mapZoom(d / (pinch.d || 1), mx, my); pinch = { d, mx, my };
    }
  });
  const ptrUp = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0 && dragMoved < 8 && e.type === 'pointerup') mapTap(e.clientX, e.clientY);
  };
  mapBox.addEventListener('pointerup', ptrUp); mapBox.addEventListener('pointercancel', ptrUp);
  mapBox.addEventListener('wheel', (e) => { e.preventDefault(); mapZoom(Math.exp(-e.deltaY * 0.0016), e.clientX, e.clientY); }, { passive: false });
  addEventListener('keydown', (e) => {
    if (!mapOpen) return;
    if (e.code === 'Equal' || e.code === 'NumpadAdd') mapZoom(1.4);
    else if (e.code === 'Minus' || e.code === 'NumpadSubtract') mapZoom(1 / 1.4);
    else if (e.code === 'Delete' || e.code === 'Backspace') setDest(null);
    else if (e.code === 'KeyT' && dest && !vida) teleport(dest.x, dest.y, dest.name);
  });
  addEventListener('resize', () => { if (mapOpen) mapApply(); });
  // tocar: si es cerca de un nombre (plaza, lugar), el destino es ese lugar; si no, el punto tocado
  function mapTap(cx, cy) {
    const tx = (cx - mv.ox) / mv.k, ty = (cy - mv.oy) / mv.k;
    if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return;
    let best = null, bd = 26;
    for (const o of online.others.values()) { const d = Math.hypot(o.x / 16 * mv.k + mv.ox - cx, o.y / 16 * mv.k + mv.oy - cy); if (d < 26) { setDest({ x: o.x, y: o.y, name: o.n }); return; } } // tocar a un amigo
    for (const l of world.labels) { const d = Math.hypot(l.x / 16 * mv.k + mv.ox - cx, l.y / 16 * mv.k + mv.oy - cy - 6); if (d < bd) { bd = d; best = l; } }
    if (best) setDest({ x: best.x, y: best.y + 20, name: best.text });
    else { const x = tx * 16, y = ty * 16; setDest({ x, y, name: world.placeName(x, y) || 'el destino' }); }
  }

  // ---------- GPS ----------
  const gps = gpsNet;
  let dest = null, route = null, routeLen = 0, gpsT = 0, gpsRe = 0;
  function setDest(d, deMision) {
    if (d && !deMision && vida && !VR.Barrios.enPunto(world, d.x, d.y)) { toast('🔒 ' + world.barrioName(d.x, d.y) + ': ' + VR.Barrios.CARTEL + ' (el GPS no marca destinos acá)'); return; }
    dest = d; route = null; gpsRe = 0;
    if (d) { recalc(); if (!deMision) toast('🏁 Destino: ' + d.name); } else if (!deMision) toast('Destino quitado'); // las misiones ya lo dicen arriba
    VR.store.set('dest:' + world.id, d);
    updateGpsHud(); drawMapRoute();
  }
  function recalc() {
    if (!dest || !gps) return;
    const f = car || player;
    route = gps.route(f.x, f.y, dest.x, dest.y, !!car);
    routeLen = route ? VR.polyLen(route) : 0;
  }
  function updateGpsHud() {
    const el = $('gps');
    $('mzClear').hidden = !dest; $('mzGo').hidden = !dest || !!vida; $('mapDest').hidden = !dest;
    if (dest) { $('mapDest').style.left = dest.x / 16 + 'px'; $('mapDest').style.top = dest.y / 16 + 'px'; }
    if (!dest) { el.hidden = true; return; }
    el.hidden = false;
    const m = routeLen / VR.TILE * 2;
    el.textContent = '🏁 ' + dest.name + ' · ' + (m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : (Math.round(m / 10) * 10) + ' m');
  }
  function drawMapRoute() {
    const pts = route ? Array.from({ length: route.length / 2 }, (_, i) => (route[i * 2] / 16).toFixed(1) + ',' + (route[i * 2 + 1] / 16).toFixed(1)).join(' ') : '';
    $('routeBg').setAttribute('points', pts); $('routeFg').setAttribute('points', pts);
  }
  function updateGps(dt) {
    if (!dest || !gps) return;
    gpsT += dt; gpsRe -= dt;
    if (gpsT < 0.25) return; gpsT = 0;
    const f = car || player;
    if (Math.hypot(f.x - dest.x, f.y - dest.y) < 40) { dest = null; route = null; VR.store.set('dest:' + world.id, null); toast('🏁 ¡Llegaste!'); updateGpsHud(); drawMapRoute(); return; }
    if (!route) { if (gpsRe <= 0) { gpsRe = 1; recalc(); } }
    else {
      const [d, i] = VR.polyNear(route, f.x, f.y);
      if (d > 56 && gpsRe <= 0) { gpsRe = 1; recalc(); }
      else if (d <= 56) { route = [f.x, f.y].concat(route.slice((i + 1) * 2)); routeLen = VR.polyLen(route); }
    }
    updateGpsHud();
    if (mapOpen) drawMapRoute();
  }
  { const sd = VR.store.get('dest:' + world.id, null); if (sd && gps) { dest = sd; recalc(); updateGpsHud(); } }

  // flecha del GPS alrededor tuyo, apuntando hacia donde sigue el camino (unos 70 px más adelante)
  function drawGpsArrow(ctx, cx, cy, al) {
    if (!dest) return;
    const f = car || player, fx = VR.lerp(f.px, f.x, al), fy = VR.lerp(f.py, f.y, al) - (car ? 0 : 10);
    // bandera en el destino si está a la vista
    VR.gfx.text(ctx, '🏁', Math.round(dest.x - cx), Math.round(dest.y - cy - 20), '#fff', { center: true, size: 14 });
    if (!route) return;
    let tx = route[route.length - 2], ty = route[route.length - 1], need = car ? 80 : 60;
    for (let i = 0; i + 3 < route.length; i += 2) {
      const L = Math.hypot(route[i + 2] - route[i], route[i + 3] - route[i + 1]);
      if (need <= L) { const t = need / (L || 1); tx = route[i] + (route[i + 2] - route[i]) * t; ty = route[i + 1] + (route[i + 3] - route[i + 1]) * t; break; }
      need -= L;
    }
    const ang = Math.atan2(tx - fx, -(ty - fy)), R = car ? (car.type === 'moto' ? 22 : 28) : 20;
    const pulse = 1 + 0.12 * Math.sin(performance.now() / 160);
    ctx.save();
    ctx.translate(Math.round(fx - cx + Math.sin(ang) * R), Math.round(fy - cy - Math.cos(ang) * R));
    ctx.rotate(ang); ctx.scale(pulse, pulse);
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(7, 3); ctx.lineTo(2.5, 3); ctx.lineTo(2.5, 7); ctx.lineTo(-2.5, 7); ctx.lineTo(-2.5, 3); ctx.lineTo(-7, 3); ctx.closePath();
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#0b2a36'; ctx.stroke(); ctx.fillStyle = '#3fd3ff'; ctx.fill();
    ctx.restore();
  }

  // ---------- minimapa (norte arriba; se aleja al manejar; tocarlo abre el mapa grande) ----------
  const mini = $('mini'), mctx = mini.getContext('2d');
  let miniReady = false, miniZoom = 2.2, miniT = 0;
  const sizeMini = () => { const d = Math.round(mini.clientWidth * (window.devicePixelRatio || 1)); if (mini.width !== d) { mini.width = mini.height = d; } };
  if (!prueba) setTimeout(() => { buildMap(); miniReady = true; mini.hidden = false; sizeMini(); }, 400);
  mini.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); openMap(); });
  addEventListener('resize', () => { if (miniReady) sizeMini(); });
  function drawMini(dt) {
    if (!miniReady || mapOpen) return;
    if (!mini.width) sizeMini(); // mientras el título esconde el HUD el canvas mide 0
    miniT += dt; if (miniT < 1 / 30) return; miniT = 0;
    const D = mini.width, r = D / 2, src = $('mapCanvas');
    const want = car ? 0.9 + 0.8 * (1 - Math.min(1, Math.abs(car.v) / 240)) : 2.2; // px de minimapa (en px físicos/D·112) por baldosa
    miniZoom += (want - miniZoom) * 0.1;
    const k = miniZoom * D / 112, f = car || player, tx = f.x / VR.TILE, ty = (car ? f.y : f.y - 4) / VR.TILE;
    mctx.save();
    mctx.beginPath(); mctx.arc(r, r, r, 0, Math.PI * 2); mctx.clip();
    mctx.fillStyle = '#2b3a22'; mctx.fillRect(0, 0, D, D);
    mctx.imageSmoothingEnabled = false;
    const sw = D / k, sx = tx - sw / 2, sy = ty - sw / 2;
    mctx.drawImage(src, sx, sy, sw, sw, 0, 0, D, D);
    mctx.fillStyle = 'rgba(0,0,0,.12)'; mctx.fillRect(0, 0, D, D);
    // tránsito: puntitos
    if (traffic) for (const v of traffic.list) {
      const px = (v.x / VR.TILE - sx) * k, py = (v.y / VR.TILE - sy) * k;
      if (px > 0 && py > 0 && px < D && py < D) { mctx.fillStyle = v.type === 'moto' ? '#f0f0f0' : '#ffd75e'; mctx.fillRect(px - 1.5, py - 1.5, 3, 3); }
    }
    // camino del GPS y bandera del destino
    if (route) {
      mctx.lineJoin = mctx.lineCap = 'round';
      mctx.beginPath();
      for (let i = 0; i < route.length; i += 2) { const px = (route[i] / VR.TILE - sx) * k, py = (route[i + 1] / VR.TILE - sy) * k; i ? mctx.lineTo(px, py) : mctx.moveTo(px, py); }
      mctx.strokeStyle = '#0b2a36'; mctx.lineWidth = 6 * D / 112; mctx.stroke();
      mctx.strokeStyle = '#3fd3ff'; mctx.lineWidth = 3.5 * D / 112; mctx.stroke();
    }
    for (const o of online.others.values()) { // amigos online: punto celeste con la inicial
      let px = (o.x / VR.TILE - sx) * k, py = (o.y / VR.TILE - sy) * k; const dx = px - r, dy = py - r, dd = Math.hypot(dx, dy), lim = r - 8 * D / 112;
      if (dd > lim) { px = r + dx / dd * lim; py = r + dy / dd * lim; }
      const R0 = 6 * D / 112; mctx.fillStyle = '#0b2a36'; mctx.beginPath(); mctx.arc(px, py, R0 + 1.5, 0, 7); mctx.fill(); mctx.fillStyle = '#3fd3ff'; mctx.beginPath(); mctx.arc(px, py, R0, 0, 7); mctx.fill();
      mctx.fillStyle = '#0b2a36'; mctx.font = `bold ${Math.round(8 * D / 112)}px system-ui`; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText((o.n || '?')[0].toUpperCase(), px, py + 0.5);
    }
    if (mis) for (const m of mis.marcas()) { // misión: ▼ a quien hablar, ! quien te da una misión, ● a dónde ir
      let px = (m.x / VR.TILE - sx) * k, py = (m.y / VR.TILE - sy) * k; const dx = px - r, dy = py - r, dd = Math.hypot(dx, dy), lim = r - 9 * D / 112;
      if (dd > lim) { px = r + dx / dd * lim; py = r + dy / dd * lim; }
      const R0 = 6.5 * D / 112; mctx.fillStyle = '#1a1a1e'; mctx.beginPath(); mctx.arc(px, py, R0 + 1.5, 0, 7); mctx.fill(); mctx.fillStyle = m.c; mctx.beginPath(); mctx.arc(px, py, R0, 0, 7); mctx.fill();
      mctx.fillStyle = '#1a1a1e'; mctx.font = `900 ${Math.round(9 * D / 112)}px system-ui`; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText(m.ico === '●' ? '' : m.ico, px, py + 0.5);
    }
    if (dest && !(dest.mis && mis && mis.s.act)) {
      let px = (dest.x / VR.TILE - sx) * k, py = (dest.y / VR.TILE - sy) * k;
      const dx = px - r, dy = py - r, dd = Math.hypot(dx, dy), lim = r - 10 * D / 112;
      if (dd > lim) { px = r + dx / dd * lim; py = r + dy / dd * lim; }
      mctx.font = `${Math.round(15 * D / 112)}px system-ui`; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText('🏁', px, py);
    }
    // dónde dejaste el auto
    if (!car && lastCar) {
      let px = (lastCar.x / VR.TILE - sx) * k, py = (lastCar.y / VR.TILE - sy) * k;
      const dx = px - r, dy = py - r, dd = Math.hypot(dx, dy), lim = r - 8;
      if (dd > lim) { px = r + dx / dd * lim; py = r + dy / dd * lim; }
      mctx.fillStyle = '#1a1a1e'; mctx.fillRect(px - 5, py - 4, 10, 8); mctx.fillStyle = '#e8493a'; mctx.fillRect(px - 4, py - 3, 8, 6);
    }
    // vos: flecha hacia donde mirás o vas
    const ang = car ? car.a : ({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 })[player.dir];
    const s = D / 112;
    mctx.translate(r, r); mctx.rotate(ang);
    mctx.beginPath(); mctx.moveTo(0, -8 * s); mctx.lineTo(6 * s, 6 * s); mctx.lineTo(0, 3 * s); mctx.lineTo(-6 * s, 6 * s); mctx.closePath();
    mctx.fillStyle = '#1a1a1e'; mctx.lineWidth = 3 * s; mctx.strokeStyle = '#1a1a1e'; mctx.stroke(); mctx.fillStyle = '#ffffff'; mctx.fill();
    mctx.restore();
    // N
    mctx.font = `900 ${Math.round(11 * s)}px system-ui`; mctx.textAlign = 'center'; mctx.textBaseline = 'top';
    mctx.fillStyle = '#1a1a1e'; mctx.fillText('N', r + 1, 4 * s + 1); mctx.fillStyle = '#ffd75e'; mctx.fillText('N', r, 4 * s);
  }

  // ---------- guardar la posición ----------
  let lastCar = car;
  const savePos = () => {
    if (VR.wiped) return;
    if (car) lastCar = car;
    if (vida) vida.save();
    const c = lastCar, i = c ? cars.indexOf(c) : -1;
    VR.store.set('pos:' + world.id, { x: Math.round(player.x), y: Math.round(player.y), dir: player.dir,
      car: c ? { i, type: c.type, model: c.model, color: c.color, tune: c.tune || null, x: Math.round(c.x), y: Math.round(c.y), a: +c.a.toFixed(3), in: !!car } : null });
  };
  setInterval(savePos, 3000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { savePos(); VR.input.releaseAll(); } });
  addEventListener('pagehide', savePos);

  addEventListener('resize', () => VR.screen.fit());
  addEventListener('orientationchange', () => setTimeout(() => VR.screen.fit(), 250));
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  // ---------- pantalla de título (J0, 10/11/2026; plan en claude/menu-plan.md) ----------
  // El mundo corre detrás (tránsito, gente, fauna, cisnes, noche) con la cámara en travelling y sin jugador ni HUD.
  const titleEl = $('title'), tBtns = [...titleEl.querySelectorAll('.tBtn')], tMenu = $('tMenu'), tTap = $('tTap'), tFade = $('tFade'), fadeEl = $('fade');
  const title = new VR.Titulo(world, settings.fondo), TITLE_BASE = 330, FAR = { x: -1e5, y: -1e5 };
  let tSwallow = 0, tReady = false, tSel = 2, tNavT = 0, tLock = 0, tGoing = false;
  VR.drawLogo($('tLogo'));
  tTap.textContent = isTouch ? 'Tocá para empezar' : 'Apretá una tecla para empezar';
  const paintSel = () => tBtns.forEach((b, i) => b.classList.toggle('sel', i === tSel && tReady));
  // deja la calle con tránsito y gente adentro de la toma (se llama en negro, al cortar de una toma a otra)
  function titleWarm(seconds) {
    if (!traffic || !peds) return;
    const c = title.cam, sw = VR.screen.w, sh = VR.screen.h, view = { x0: c.x - sw / 2, y0: c.y - sh / 2, x1: c.x + sw / 2, y1: c.y + sh / 2 };
    for (let i = 0; i < seconds * 20; i++) { traffic.update(0.05, c, view, FAR, null); peds.update(0.05, c, view, null); }
  }
  title.onJump = () => titleWarm(6);
  function enterTitle(first) {
    mode = 'title'; document.body.classList.add('title'); titleEl.hidden = false; VR.screen.setBase(TITLE_BASE);
    const sw0 = cisnes.list[0]; if (sw0) { sw0.auto = true; sw0.autoLook = sw0.autoLook || VR.av2Random(); sw0.pas = sw0.pas || VR.av2Random(); } // una pareja pasea en cisne
    tagHist();
    tReady = !first; tMenu.hidden = first; tTap.hidden = !first; tSel = 2; tLock = 0.3; paintSel();
    tFade._f = -1; title.phase = 'play'; title.fade = 0; title.cut(true); titleWarm(6);
  }
  function showTitleMenu() { if (tReady || mode !== 'title') return; tReady = true; tTap.hidden = true; tMenu.hidden = false; tLock = 0.3; paintSel(); VR.audio.resume(); }
  // pasar al juego con un fundido; "then" corre ya en el juego
  function startGame(then) {
    if (tGoing) return; tGoing = true; fadeEl.style.opacity = 1; VR.store.set('modo', VR.modo);
    setTimeout(() => {
      mode = 'game'; document.body.classList.remove('title'); titleEl.hidden = true;
      const sw0 = cisnes.list[0]; if (sw0) sw0.auto = false; // el cisne vuelve solo al muelle
      zoomJump();
      const f = car || player; cam.x = cam.px = f.x; cam.y = cam.py = f.y - (car ? 0 : 10); cam.lx = cam.ly = 0; hint = '';
      resume(); applyTouch(); fadeEl.style.opacity = 0; tGoing = false;
      if (then) then();
      maybeIntro();
    }, 450);
  }
  // volver al menú principal (desde la pausa): guarda y entra al título con un fundido
  function toTitle() {
    if (online.ride) online.leave(player, world);
    if (online.peer) online.stop();
    if (teatro.on) { teatro.exit(); if (cineDoor) { player.x = player.px = cineDoor.x; player.y = player.py = cineDoor.y + 14; player.dir = 'down'; } }
    if (mapOpen) closeMap();
    savePos(); VR.input.releaseAll(); tGoing = true; fadeEl.style.opacity = 1;
    setTimeout(() => { enterTitle(false); fadeEl.style.opacity = 0; tGoing = false; }, 450);
  }
  // cambiar de modo = recargar con el guardado del otro (así arranca todo limpio); desde el título
  function switchModo(m, online) {
    if (tGoing) return; tGoing = true; fadeEl.style.opacity = 1; savePos();
    try { sessionStorage.setItem('villarrica:go', m); if (online) sessionStorage.setItem('villarrica:onl', '1'); } catch (e) { location.href = location.pathname + '?' + m; return; }
    setTimeout(() => location.reload(), 450);
  }
  const tagHist = () => { const g = $('tHistTag'); if (g) g.textContent = VR.store.hasHistoria() ? 'continuar' : 'nueva'; };
  const ACT = {
    historia: () => VR.modo === 'historia' ? startGame() : switchModo('historia'),
    multi: () => VR.modo === 'libre' ? startGame(() => { VR.input.releaseAll(); $('onDlg').showModal(); }) : switchModo('libre', true), // Online siempre juega en Libre
    libre: () => VR.modo === 'libre' ? startGame() : switchModo('libre'),
    config: () => openConfig('title'),
    creditos: () => { VR.input.releaseAll(); VR.input.enabled = false; credits.showModal(); },
  };
  credits.addEventListener('close', () => resume());
  $('credClose').onclick = () => credits.close();
  tBtns.forEach((b, i) => {
    b.onpointerenter = () => { if (tReady && !b.classList.contains('dis')) { tSel = i; paintSel(); } };
    b.onclick = () => { if (!tReady || tGoing || performance.now() < tSwallow) return; if (!b.classList.contains('dis')) { tSel = i; paintSel(); } ACT[b.dataset.a](); };
  });
  titleEl.addEventListener('pointerdown', () => { if (!tReady) tSwallow = performance.now() + 600; showTitleMenu(); }); // el primer toque solo muestra los botones: el clic que sigue no los activa
  addEventListener('keydown', (e) => { if (mode === 'title' && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(Shift|Control|Alt|Meta)/.test(e.code) && !document.querySelector('dialog[open]')) showTitleMenu(); });
  function titleNav(dt) {
    if (tGoing || document.querySelector('dialog[open]')) return;
    tLock -= dt; tNavT -= dt;
    if (!tReady) { if (tLock <= 0 && ['action', 'car', 'menu', 'run'].some((b) => VR.input.pressed(b))) showTitleMenu(); return; }
    if (tLock > 0) return;
    const ay = VR.input.ay;
    if (Math.abs(ay) > 0.6 && tNavT <= 0) {
      const on = tBtns.map((b, i) => (b.classList.contains('dis') ? -1 : i)).filter((i) => i >= 0), k = on.indexOf(tSel);
      tSel = on[(k + (ay > 0 ? 1 : on.length - 1)) % on.length]; paintSel(); tNavT = 0.22;
    } else if (Math.abs(ay) < 0.3) tNavT = 0;
    if (VR.input.pressed('action')) ACT[tBtns[tSel].dataset.a]();
  }
  function updateTitle(dt) {
    title.update(dt);
    const c = title.cam, sw = VR.screen.w, sh = VR.screen.h, view = { x0: c.x - sw / 2, y0: c.y - sh / 2, x1: c.x + sw / 2, y1: c.y + sh / 2 };
    VR.playerCar = null; VR.audioCam = c;
    world.updateDynamic(dt);
    if (title.phase !== 'black') { if (traffic) traffic.update(dt, c, view, FAR, null); if (peds) peds.update(dt, c, view, null); }
    cisnes.update(dt, VR.input); fauna.update(dt, c, []);
    VR.audio.engine(null, dt); if (emer) emer.siren.update(dt, null, 0, false); // sin motor ni sirenas del juego
    titleNav(dt);
  }
  function renderTitle(a, dt) {
    const ctx = VR.screen.ctx, sw = VR.screen.w, sh = VR.screen.h, [cx, cy] = camView(a, title.cam);
    ctx.fillStyle = '#2b3a22'; ctx.fillRect(0, 0, sw, sh);
    world.draw(ctx, cx, cy, sw, sh);
    world.warm(cx, cy, sw, sh);
    tall.length = 0;
    world.collectTall(cx, cy, sw, sh, tall);
    fauna.drawGround(ctx, cx, cy, sw, sh);
    cisnes.draw(ctx, cx, cy, night, null);
    if (peds) peds.collect(cx, cy, sw, sh, a, tall);
    fauna.collect(cx, cy, sw, sh, tall);
    const vis = world.carsIn(cx - 100, cy - 100, cx + sw + 100, cy + sh + 100, []);
    for (const c of vis) tall.push({ sy: c.y + 10, draw: (ctx) => c.draw(ctx, cx, cy, a) });
    tall.sort((p, q) => p.sy - q.sy);
    for (const t of tall) t.draw(ctx);
    night.update(Math.min(0.1, dt || 0.016), settings.hora);
    night.render(ctx, cx, cy, sw, sh, vis);
    if (tFade._f !== title.fade) { tFade._f = title.fade; tFade.style.opacity = title.fade; }
  }

  applyTouch();
  hideOverlay();
  if (!directo) enterTitle(true); else VR.store.set('modo', VR.modo);
  if (mis) { if (mis.s.act) mis.entrar(mis.s.act.paso, true); else mis.auto(); } // retomar la misión guardada (o arrancar la primera)
  VR.loop.start(update, render);
  if (directo) { maybeIntro(); try { if (sessionStorage.getItem('villarrica:onl')) { sessionStorage.removeItem('villarrica:onl'); VR.input.releaseAll(); $('onDlg').showModal(); } } catch (e) {} }
  window.__vr = { get mode() { return mode; }, title, startGame, toTitle, enterTitle, get online() { return online; }, get teatro() { return teatro; }, get changas() { return changas; }, get teatroT() { return teatro.t; }, garage, garDoor, cineDoor, world, player, shop, shopDoor, openShop, teleport, setDest, cam, settings, cars, traffic, peds, emer, weapons, get car() { return car; }, enterCar, exitCar };
})();
