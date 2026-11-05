// Arranque: pantalla, mundo, jugador, cámara, HUD, menú y guardado de la posición.
'use strict';
(async () => {
  const $ = (id) => document.getElementById(id);
  const toast = (msg) => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400); };
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const settings = { touch: VR.store.get('touch', 'auto'), fps: VR.store.get('fps', false), vib: VR.store.get('vib', true), hora: VR.store.get('hora', 'real'), pj: VR.store.get('pj', 'generico') };

  VR.screen.init($('game'));
  const prueba = /[?&]prueba\b/.test(location.search);
  let world;
  try { world = prueba ? VR.makeTestMap() : await VR.loadMap('map.bin'); }
  catch (e) { $('ovSub').textContent = '⚠ ' + e.message + ' · revisá la conexión y recargá'; return; }
  $('zone').textContent = prueba ? 'Barrio de prueba' : 'Centro';
  $('ovSub').textContent = prueba ? 'Barrio de prueba' : 'Etapa 1.5 · Villarrica entera'; $('ovGo').hidden = false;
  const saved = VR.store.get('pos:' + world.id, null);
  const start = saved && !world.hits(saved.x - 4, saved.y - 4, saved.x + 4, saved.y) ? saved : world.spawn;
  const player = new VR.Player(world, start.x, start.y);
  if (saved && saved.dir) player.dir = saved.dir;
  // ---------- autos estacionados (el primero, al lado del punto de partida) ----------
  const parked = prueba ? { cars: [], first: null } : VR.parkCars(world, 320, world.spawn);
  const cars = parked.cars;
  let car = null; // auto que estás manejando
  const WALK_BASE = 270, DRIVE_BASE = 420; // Leandro prefirió la cámara de antes (04/11/2026)
  const traffic = prueba ? null : new VR.Traffic(world, { max: 28, motoShare: 0.45 });
  const peds = prueba ? null : new VR.Peds(world);
  const night = VR.night = new VR.Night(world);
  const gpsNet = prueba ? null : new VR.GPS(world);
  const emer = prueba ? null : new VR.Emergency(world, { traffic, gps: gpsNet, peds, night, toast: (m) => toast(m),
    onBusted: () => sentTo('🚔 ¡Te agarró la Policía! Saliste después de un rato.'),
    onWasted: () => sentTo('💥 Explotó con vos adentro... te llevaron al hospital.') });
  if (emer) emer.sound = VR.store.get('snd', true);
  VR.emer = emer;
  const weapons = prueba ? null : new VR.Weapons(world, { peds, emer, night, toast: (m) => toast(m) });
  VR.weapons = weapons;
  VR.audio.setOn(VR.store.get('snd', true));
  // te agarraron o volaste: aparecés en la plaza, sin estrellas
  function sentTo(msg) {
    if (car) { car.driven = false; car.siren = false; car.rider = null; car.v = 0; car = null; VR.screen.setBase(WALK_BASE); driveLabels(false); }
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
    if (sc.in) { car = c; c.driven = true; player.x = player.px = c.x; player.y = player.py = c.y; VR.screen.setBase(DRIVE_BASE); setTimeout(() => driveLabels(true)); }
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
  function enterCar(c) {
    if (c._nid !== undefined && online) online.take(c); // un auto del anfitrión: pasa a ser tuyo
    if (emer) emer.stolen(c);
    if (c.ai && traffic) { traffic.release(c); if (!cars.includes(c)) cars.push(c); toast(c.type === 'moto' ? (c.model === 'pati' ? '🛴 ¡Te llevaste la patineta!' : '🏍 ¡Te llevaste la moto!') : c.model === 'karumbe' ? '🐴 ¡Te llevaste el karumbe!' : '🚗 ¡Te llevaste el auto!'); }
    if (c.type === 'moto') c.rider = me();
    car = c; c.driven = true; player.moving = false; VR.screen.setBase(DRIVE_BASE); VR.showVehicleCard(c);
    hint = ''; lastCar = c; driveLabels(true);
  }
  function exitCar() {
    const c = car, a = c.a, rx = Math.cos(a), ry = Math.sin(a), fx = Math.sin(a), fy = -Math.cos(a);
    const tries = [];
    const w0 = c.WID / 2 + 6, l0 = c.LEN / 2 + 8;
    for (const d of [w0, w0 + 4, w0 + 8, w0 + 12]) tries.push([-rx * d, -ry * d], [rx * d, ry * d]);
    for (const d of [l0, l0 + 6]) tries.push([-fx * d, -fy * d], [fx * d, fy * d]);
    for (const [dx, dy] of tries) {
      const x = c.x + dx, y = c.y + dy + 4;
      if (!world.hits(x - player.HW, y - player.HH, x + player.HW, y)) {
        player.x = player.px = x; player.y = player.py = y;
        c.driven = false; c.v = 0; c.rider = null; car = null; VR.screen.setBase(WALK_BASE); driveLabels(false); return true;
      }
    }
    toast('No hay lugar para bajar acá'); return false;
  }

  // ---------- tienda de ropa (puerta en la vereda, frente a la plaza) ----------
  const shopDecal = (world.decals || []).find((d) => d.kind === 'tienda');
  const shopDoor = shopDecal ? { x: (shopDecal.x + shopDecal.w / 2) * VR.TILE, y: (shopDecal.y + 1) * VR.TILE } : null;
  const nearShop = () => shopDoor && !car && Math.abs(player.x - shopDoor.x) < 26 && player.y > shopDoor.y - 30 && player.y < shopDoor.y + 4 ? shopDoor : null;
  const shop = new VR.Shop({
    onClose: () => { VR.input.releaseAll(); VR.input.enabled = true; VR.loop.paused = false; },
    onBuy: (L, tot) => { settings.pj = 'propio'; VR.store.set('pj', 'propio'); player.setLook('propio'); if (car && car.rider) car.rider = me(); paintPj(); toast(tot ? '🛍 ¡Aguyje! Pagaste ' + VR.fmtGs(tot) : '👕 Listo, te cambiaste'); },
  });
  function openShop() { VR.input.releaseAll(); VR.input.enabled = false; VR.loop.paused = true; shop.open(player.lookData); }
  VR.Wallet.onChange = () => { $('plata').textContent = '💵 ' + VR.fmtGs(VR.Wallet.get()); };
  VR.Wallet.onChange();

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
  const camView = (a) => {
    const sw = VR.screen.w, sh = VR.screen.h, W = world.w * VR.TILE, H = world.h * VR.TILE;
    let x = VR.lerp(cam.px, cam.x, a) - sw / 2, y = VR.lerp(cam.py, cam.y, a) - sh / 2;
    x = W <= sw ? (W - sw) / 2 : VR.clamp(x, 0, W - sw);
    y = H <= sh ? (H - sh) / 2 : VR.clamp(y, 0, H - sh);
    return [Math.round(x), Math.round(y)];
  };

  // ---------- lógica ----------
  const SALUDOS = ["¡Mba'éichapa!", "¡Mba'e la porte!", 'Haku la ára, che...', "¡Jaha jaha!", '¡Ára porã!'];
  const BOCINAS = ['¡Pi pííí!', '¡Pííp!', '¡Pi pi!'];
  let sayIdx = 0, hint = '', hintCar = null, holdT = 0;
  function update(dt) {
    online.update(dt, player, car);
    if (mapOpen) {
      if (['map', 'menu'].some((b) => VR.input.pressed(b))) closeMap();
      else if (VR.input.ax || VR.input.ay) { mv.ox -= VR.input.ax * 700 * dt; mv.oy -= VR.input.ay * 700 * dt; mapApply(); }
      return;
    }
    if (VR.input.pressed('menu')) { openMenu(); return; }
    if (VR.input.pressed('map')) { openMap(); return; }
    if (car) {
      car.update(dt, VR.input);
      player.px = player.x; player.py = player.y; player.x = car.x; player.y = car.y;
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
      player.update(dt, VR.input);
      const nc = nearCar(), ns = nearShop(), rd = online.nearRide(player);
      if (rd && (!nc || Math.hypot(rd.x - player.x, rd.y - player.y) < Math.hypot(nc.x - player.x, nc.y - player.y))) {
        hint = (VR.input.source === 'touch' ? '👥 ' : 'F: ') + 'subir con ' + rd.n; hintCar = { x: rd.x, y: rd.y - 8 };
        if (VR.input.pressed('car')) { online.ride = rd.id; toast('👥 Vas con ' + rd.n); }
      } else {
      hint = nc ? (VR.input.source === 'touch' ? (nc.type === 'moto' ? '🏍 Subir' : '🚗 Subir') : VR.input.source === 'pad' ? 'X: subir' : 'F: subir') : '';
      hintCar = nc;
      if (ns && !nc) { hint = VR.input.source === 'touch' ? '👕 Tienda: ACCIÓN' : VR.input.source === 'pad' ? '👕 A: entrar' : '👕 Espacio: entrar'; hintCar = { x: ns.x, y: ns.y - 8 }; }
      if (VR.input.pressed('car')) { if (nc) enterCar(nc); else toast('Acercate a un auto o una moto para subir'); }
      else if (VR.input.pressed('action')) { if (ns) { openShop(); return; } player.say(SALUDOS[sayIdx++ % SALUDOS.length]); if (peds) peds.greet(player.x, player.y); }
      } }
    }
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
    if (weapons) weapons.update(dt, player, car, VR.input);
    if (emer) { const sw = VR.screen.w, sh = VR.screen.h; emer.update(dt, player, car, car || player, { x0: cam.x - sw / 2, y0: cam.y - sh / 2, x1: cam.x + sw / 2, y1: cam.y + sh / 2 }, VR.input); }
  }

  // ---------- dibujo ----------
  const tall = [];
  function render(a, dt) {
    const ctx = VR.screen.ctx, sw = VR.screen.w, sh = VR.screen.h;
    const [cx, cy] = camView(a);
    ctx.fillStyle = '#2b3a22'; ctx.fillRect(0, 0, sw, sh);
    world.draw(ctx, cx, cy, sw, sh);
    world.warm(cx, cy, sw, sh);
    // cosas altas y personajes ordenados por profundidad
    tall.length = 0;
    world.collectTall(cx, cy, sw, sh, tall);
    if (!car && !online.ride) tall.push({ sy: VR.lerp(player.py, player.y, a), draw: (c) => { if (weapons && player.dir === 'up') weapons.drawHeld(c, player, cx, cy, a); player.draw(c, cx, cy, a); if (weapons && player.dir !== 'up') weapons.drawHeld(c, player, cx, cy, a); } });
    online.collect(cx, cy, a, tall, car);
    if (peds) peds.collect(cx, cy, sw, sh, a, tall);
    if (emer) emer.collect(cx, cy, sw, sh, a, tall);
    const vis = world.carsIn(cx - 100, cy - 100, cx + sw + 100, cy + sh + 100, []);
    for (const c of vis) tall.push({ sy: c.y + 10, draw: (ctx) => c.draw(ctx, cx, cy, a) });
    tall.sort((p, q) => p.sy - q.sy);
    for (const t of tall) t.draw(ctx);
    if (weapons) weapons.drawShots(ctx, cx, cy, a);
    if (emer) emer.drawFx(ctx, cx, cy);
    night.update(Math.min(0.1, dt || 0.016), settings.hora);
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
          const bn = $('banner'); bn.innerHTML = '<small>' + (b === 'Afueras' ? 'saliendo de' : 'barrio') + '</small>' + (b === 'Afueras' ? 'Villarrica' : b);
          bn.classList.add('show'); clearTimeout(bn._h); bn._h = setTimeout(() => bn.classList.remove('show'), 2600);
        }
        barrio = b; $('hudTitle').textContent = b.toUpperCase();
      }
    }
    if (emer) { const w = $('wanted'), L = emer.level, key = L + ':' + (emer.lost > 0.5 ? 1 : 0);
      if (w._k !== key) { w._k = key; w.hidden = !L; w.innerHTML = '<b>' + '★'.repeat(L) + '</b>' + '☆'.repeat(5 - L); w.classList.toggle('lost', emer.lost > 0.5); } }
    if (weapons) { const wb = $('weapon'), show = weapons.enabled && !car, key = show + weapons.cur + VR.input.source;
      if (wb._k !== key) { wb._k = key; wb.hidden = !show; $('btns').querySelector('[data-b="fire"]').hidden = !show; const W = weapons.weapon; wb.innerHTML = W.ico + ' ' + W.name + '<small>' + (VR.input.source === 'touch' ? 'tocá para cambiar' : VR.input.source === 'pad' ? 'LB cambia' : 'Q cambia') + '</small>'; } }
    const spd = $('speed');
    if (car) { spd.hidden = false; spd.firstChild.textContent = car.kmh(); } else if (!spd.hidden) spd.hidden = true;
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
  function hideOverlay() { if (!$('ovGo').hidden) $('overlay').hidden = true; }
  $('overlay').addEventListener('pointerdown', (e) => { e.preventDefault(); hideOverlay(); });
  const menu = $('menu');
  function openMenu() { if (menu.open) return; VR.input.releaseAll(); VR.input.enabled = false; VR.loop.paused = true; menu.showModal(); }
  menu.addEventListener('close', () => { VR.input.releaseAll(); VR.input.enabled = true; VR.loop.paused = false; });
  $('btnMenu').onclick = openMenu;
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
  // ---- online ----
  const online = new VR.Online(); online.bind({ world, traffic, peds, emer, weapons, night: VR.night, cars });
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
  addEventListener('keydown', (e) => { if (e.code === 'KeyC' && chatBox.hidden && !/INPUT/.test(e.target.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); openChat(); } });
  setInterval(() => { $('onList').textContent = online.peer ? 'Conectados: ' + online.names().join(', ') : ''; }, 1000);
  $('onHost').onclick = () => goOnline(true); $('onJoin').onclick = () => goOnline(false); $('onStop').onclick = () => online.stop();
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
  $('btnReset').onclick = () => { if (car) { car.driven = false; car.v = 0; car = null; VR.screen.setBase(WALK_BASE); driveLabels(false); } player.x = player.px = world.spawn.x; player.y = player.py = world.spawn.y; cam.x = cam.px = player.x; cam.y = cam.py = player.y; menu.close(); toast('📍 De vuelta en ' + world.spawnName); };

  // ---------- mapa de la ciudad ----------
  let mapOpen = false, mapBuilt = false;
  const MAPCOL = [[92, 158, 58], [70, 70, 78], [196, 188, 172], [196, 120, 92], [200, 150, 112], [52, 112, 44], [230, 230, 230], [168, 98, 64], [70, 130, 200], [124, 116, 104], [182, 104, 64], [190, 188, 184], [140, 114, 86]];
  function buildMap() {
    const c = $('mapCanvas'); c.width = world.w; c.height = world.h;
    const x = c.getContext('2d'), img = x.createImageData(world.w, world.h), d = img.data;
    for (let i = 0; i < world.tiles.length; i++) {
      let col = MAPCOL[world.tiles[i]] || [255, 0, 255];
      if (world.line[i] === 1 || world.line[i] === 2) col = [226, 191, 69];
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    const L = $('mapLabels'); L.innerHTML = '';
    for (const l of (world.barrioLabels || []).map((b) => ({ ...b, cls: 'barrio' })).concat(world.labels)) {
      const s = document.createElement('span'); s.textContent = l.text; if (l.cls) s.className = l.cls; if (l.small) s.className = 'small';
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
  function openMap() { if (!mapBuilt) buildMap(); mapOpen = true; VR.input.releaseAll(); $('mapView').hidden = false; sizeMap(); }
  function closeMap() { mapOpen = false; $('mapView').hidden = true; }
  $('btnMap').onclick = () => (mapOpen ? closeMap() : openMap());
  $('mzClose').onclick = closeMap;
  $('mzIn').onclick = () => mapZoom(1.6);
  $('mzOut').onclick = () => mapZoom(1 / 1.6);
  $('mzMe').onclick = () => { if (mv.k < fitK() * 3) mv.k = fitK() * 4; const f = car || player; mapCenterOn(f.x, f.y); };
  $('mzClear').onclick = () => { setDest(null); };
  $('mzGo').onclick = () => { if (dest) teleport(dest.x, dest.y, dest.name); };
  // ---------- teletransporte (05/11/2026): aparecés donde marcaste en el mapa, a pie o con el vehículo ----------
  function teleport(px, py, name) {
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
    else if (e.code === 'KeyT' && dest) teleport(dest.x, dest.y, dest.name);
  });
  addEventListener('resize', () => { if (mapOpen) mapApply(); });
  // tocar: si es cerca de un nombre (plaza, lugar), el destino es ese lugar; si no, el punto tocado
  function mapTap(cx, cy) {
    const tx = (cx - mv.ox) / mv.k, ty = (cy - mv.oy) / mv.k;
    if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return;
    let best = null, bd = 26;
    for (const l of world.labels) { const d = Math.hypot(l.x / 16 * mv.k + mv.ox - cx, l.y / 16 * mv.k + mv.oy - cy - 6); if (d < bd) { bd = d; best = l; } }
    if (best) setDest({ x: best.x, y: best.y + 20, name: best.text });
    else { const x = tx * 16, y = ty * 16; setDest({ x, y, name: world.placeName(x, y) || 'el destino' }); }
  }

  // ---------- GPS ----------
  const gps = gpsNet;
  let dest = null, route = null, routeLen = 0, gpsT = 0, gpsRe = 0;
  function setDest(d) {
    dest = d; route = null; gpsRe = 0;
    if (d) { recalc(); toast('🏁 Destino: ' + d.name); } else toast('Destino quitado');
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
    $('mzClear').hidden = !dest; $('mzGo').hidden = !dest; $('mapDest').hidden = !dest;
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
    if (dest) {
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
    if (car) lastCar = car;
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
  applyTouch();
  VR.loop.start(update, render);
  window.__vr = { world, player, shop, shopDoor, openShop, teleport, setDest, cam, settings, cars, traffic, peds, emer, weapons, get car() { return car; }, enterCar, exitCar };
})();
