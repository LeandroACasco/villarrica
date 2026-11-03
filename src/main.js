// Arranque: pantalla, mundo, jugador, cámara, HUD, menú y guardado de la posición.
'use strict';
(async () => {
  const $ = (id) => document.getElementById(id);
  const toast = (msg) => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400); };
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const settings = { touch: VR.store.get('touch', 'auto'), fps: VR.store.get('fps', false), vib: VR.store.get('vib', true) };

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
  const parked = prueba ? { cars: [], first: null } : VR.parkCars(world, 900, world.spawn);
  const cars = parked.cars;
  let car = null; // auto que estás manejando
  const WALK_BASE = 270, DRIVE_BASE = 420;
  const sc = saved && saved.car;
  if (sc && cars[sc.i]) {
    const c = cars[sc.i]; world.removeBox(c); c.x = c.px = sc.x; c.y = c.py = sc.y; c.a = c.pa = sc.a; world.addBox(c);
    if (sc.in) { car = c; c.driven = true; player.x = player.px = c.x; player.y = player.py = c.y; VR.screen.setBase(DRIVE_BASE); setTimeout(() => driveLabels(true)); }
  }
  const LABELS = { action: [['✋', 'ACCIÓN'], ['📯', 'BOCINA']], run: [['»', 'CORRER'], ['⏹', 'FRENO']], car: [['🚗', 'AUTO'], ['🚪', 'BAJAR']] };
  function driveLabels(on) {
    document.querySelectorAll('#btns .tb').forEach((el) => { const L = LABELS[el.dataset.b]; if (L) el.innerHTML = '<span class="ico">' + L[on ? 1 : 0][0] + '</span>' + L[on ? 1 : 0][1]; });
  }
  const nearCar = () => {
    let best = null, bd = 30;
    for (const c of world.carsIn(player.x - 40, player.y - 40, player.x + 40, player.y + 40, [])) {
      const d = Math.hypot(c.x - player.x, c.y - (player.y - 4));
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };
  function enterCar(c) {
    car = c; c.driven = true; player.moving = false; VR.screen.setBase(DRIVE_BASE);
    hint = ''; lastCar = c; driveLabels(true);
  }
  function exitCar() {
    const c = car, a = c.a, rx = Math.cos(a), ry = Math.sin(a), fx = Math.sin(a), fy = -Math.cos(a);
    const tries = [];
    for (const d of [14, 18, 22, 26]) tries.push([-rx * d, -ry * d], [rx * d, ry * d]);
    for (const d of [24, 30]) tries.push([-fx * d, -fy * d], [fx * d, fy * d]);
    for (const [dx, dy] of tries) {
      const x = c.x + dx, y = c.y + dy + 4;
      if (!world.hits(x - player.HW, y - player.HH, x + player.HW, y)) {
        player.x = player.px = x; player.y = player.py = y;
        c.driven = false; c.v = 0; car = null; VR.screen.setBase(WALK_BASE); driveLabels(false); return true;
      }
    }
    toast('No hay lugar para bajar acá'); return false;
  }

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
  const SALUDOS = ["¡Mba'éichapa!", "¡Mba'e la porte!", 'Haku la ára, che...', "¡Jaha jaha!", 'Ndera, qué lindo día'];
  const BOCINAS = ['¡Pi pííí!', '¡Pííp!', '¡Pi pi!'];
  let sayIdx = 0, hint = '', hintCar = null;
  function update(dt) {
    if (mapOpen) { if (['map', 'menu', 'action'].some((b) => VR.input.pressed(b))) closeMap(); return; }
    if (VR.input.pressed('menu')) { openMenu(); return; }
    if (VR.input.pressed('map')) { openMap(); return; }
    if (car) {
      car.update(dt, VR.input);
      player.px = player.x; player.py = player.y; player.x = car.x; player.y = car.y;
      if (VR.input.pressed('action')) player.say(BOCINAS[sayIdx++ % BOCINAS.length], 1.2);
      if (VR.input.pressed('car')) { if (Math.abs(car.v) < 45) exitCar(); else toast('Frená para bajarte'); }
      if (player.bubble) { player.bubble.t -= dt; if (player.bubble.t <= 0) player.bubble = null; }
    } else {
      player.update(dt, VR.input);
      const nc = nearCar();
      hint = nc ? (VR.input.source === 'touch' ? '🚗 Subir' : VR.input.source === 'pad' ? 'X: subir' : 'F: subir') : '';
      hintCar = nc;
      if (VR.input.pressed('car')) { if (nc) enterCar(nc); else toast('Acercate a un auto para subir'); }
      else if (VR.input.pressed('action')) player.say(SALUDOS[sayIdx++ % SALUDOS.length]);
    }
    updateCamera(dt);
  }

  // ---------- dibujo ----------
  const tall = [];
  function render(a) {
    const ctx = VR.screen.ctx, sw = VR.screen.w, sh = VR.screen.h;
    const [cx, cy] = camView(a);
    ctx.fillStyle = '#2b3a22'; ctx.fillRect(0, 0, sw, sh);
    world.draw(ctx, cx, cy, sw, sh);
    world.warm(cx, cy, sw, sh);
    // cosas altas y personajes ordenados por profundidad
    tall.length = 0;
    world.collectTall(cx, cy, sw, sh, tall);
    if (!car) tall.push({ sy: VR.lerp(player.py, player.y, a), draw: (c) => player.draw(c, cx, cy, a) });
    for (const c of world.carsIn(cx - 40, cy - 40, cx + sw + 40, cy + sh + 40, [])) tall.push({ sy: c.y + 10, draw: (ctx) => c.draw(ctx, cx, cy, a) });
    tall.sort((p, q) => p.sy - q.sy);
    for (const t of tall) t.draw(ctx);
    for (const l of world.labels) {
      const lx = l.x - cx, ly = l.y - cy;
      if (lx > -80 && lx < sw + 80 && ly > -20 && ly < sh + 20) VR.gfx.text(ctx, l.text, lx, ly, '#fff6d8', { center: true, shadow: '#1a1a1e' });
    }
    player.drawBubble(ctx, cx, cy, a);
    if (hint && hintCar) VR.gfx.text(ctx, hint, Math.round(hintCar.x - cx), Math.round(hintCar.y - cy - 26), '#ffd75e', { center: true, shadow: '#1a1a1e' });
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
  VR.input.onAny = () => { hideOverlay(); if (VR.input.source !== lastSource) { lastSource = VR.input.source; applyTouch(); } };
  VR.input.onPad = (name, on) => { $('padInfo').textContent = on ? '🎮 Conectado: ' + name : 'Control desconectado.'; toast(on ? '🎮 Control conectado' : 'Control desconectado'); applyTouch(); };

  // ---------- portada / menú / pantalla completa ----------
  function hideOverlay() { if (!$('ovGo').hidden) $('overlay').hidden = true; }
  $('overlay').addEventListener('pointerdown', (e) => { e.preventDefault(); hideOverlay(); });
  const menu = $('menu');
  function openMenu() { if (menu.open) return; VR.input.releaseAll(); VR.input.enabled = false; VR.loop.paused = true; menu.showModal(); }
  menu.addEventListener('close', () => { VR.input.releaseAll(); VR.input.enabled = true; VR.loop.paused = false; });
  $('btnMenu').onclick = openMenu;
  $('menuClose').onclick = () => menu.close();
  menu.addEventListener('keydown', (e) => { if (e.code === 'KeyP') menu.close(); });
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
  };
  seg('segTouch', 'touch', applyTouch);
  $('optFps').checked = settings.fps; $('optFps').onchange = (e) => { settings.fps = e.target.checked; VR.store.set('fps', settings.fps); };
  $('optVib').checked = settings.vib; $('optVib').onchange = (e) => { settings.vib = VR.input.vibrate = e.target.checked; VR.store.set('vib', settings.vib); };
  $('btnReset').onclick = () => { if (car) { car.driven = false; car.v = 0; car = null; VR.screen.setBase(WALK_BASE); driveLabels(false); } player.x = player.px = world.spawn.x; player.y = player.py = world.spawn.y; cam.x = cam.px = player.x; cam.y = cam.py = player.y; menu.close(); toast('📍 De vuelta en ' + world.spawnName); };

  // ---------- mapa de la ciudad ----------
  let mapOpen = false, mapBuilt = false;
  const MAPCOL = [[92, 158, 58], [70, 70, 78], [196, 188, 172], [196, 120, 92], [200, 150, 112], [52, 112, 44], [230, 230, 230], [168, 98, 64], [70, 130, 200], [124, 116, 104], [182, 104, 64]];
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
      const s = document.createElement('span'); s.textContent = l.text; if (l.cls) s.className = l.cls;
      s.style.left = (l.x / 16 / world.w * 100) + '%'; s.style.top = (l.y / 16 / world.h * 100) + '%'; L.appendChild(s);
    }
    mapBuilt = true;
  }
  function sizeMap() {
    const k = Math.min((innerWidth - 32) / world.w, (innerHeight - 70) / world.h);
    $('mapBox').style.width = Math.floor(world.w * k) + 'px'; $('mapBox').style.height = Math.floor(world.h * k) + 'px';
    $('mapMe').style.left = (player.x / 16 / world.w * 100) + '%'; $('mapMe').style.top = (player.y / 16 / world.h * 100) + '%';
    $('mapWhere').textContent = (zone || '—') + (barrio && barrio !== 'Villarrica' ? ' · ' + barrio : '');
  }
  function openMap() { if (!mapBuilt) buildMap(); mapOpen = true; VR.input.releaseAll(); sizeMap(); $('mapView').hidden = false; }
  function closeMap() { mapOpen = false; $('mapView').hidden = true; }
  $('btnMap').onclick = () => (mapOpen ? closeMap() : openMap());
  $('mapView').addEventListener('pointerdown', (e) => { e.preventDefault(); closeMap(); });
  addEventListener('resize', () => { if (mapOpen) sizeMap(); });

  // ---------- guardar la posición ----------
  let lastCar = car;
  const savePos = () => {
    if (car) lastCar = car;
    const c = lastCar, i = c ? cars.indexOf(c) : -1;
    VR.store.set('pos:' + world.id, { x: Math.round(player.x), y: Math.round(player.y), dir: player.dir,
      car: i >= 0 ? { i, x: Math.round(c.x), y: Math.round(c.y), a: +c.a.toFixed(3), in: !!car } : null });
  };
  setInterval(savePos, 3000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { savePos(); VR.input.releaseAll(); } });
  addEventListener('pagehide', savePos);

  addEventListener('resize', () => VR.screen.fit());
  addEventListener('orientationchange', () => setTimeout(() => VR.screen.fit(), 250));
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  applyTouch();
  VR.loop.start(update, render);
  window.__vr = { world, player, cam, settings, cars, get car() { return car; }, enterCar, exitCar };
})();
