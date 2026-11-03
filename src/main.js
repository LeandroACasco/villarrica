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

  // ---------- cámara: sigue al jugador mirando un poco hacia donde camina ----------
  const cam = { x: player.x, y: player.y, px: player.x, py: player.y, lx: 0, ly: 0 };
  function updateCamera(dt) {
    cam.px = cam.x; cam.py = cam.y;
    const look = player.moving ? 26 * Math.min(1, player.speed / 58) : 0;
    cam.lx += ((VR.input.ax * look) - cam.lx) * Math.min(1, dt * 2.5);
    cam.ly += ((VR.input.ay * look * 0.7) - cam.ly) * Math.min(1, dt * 2.5);
    const tx = player.x + cam.lx, ty = player.y - 10 + cam.ly;
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
  let sayIdx = 0;
  function update(dt) {
    if (mapOpen) { if (['map', 'menu', 'action'].some((b) => VR.input.pressed(b))) closeMap(); return; }
    if (VR.input.pressed('menu')) { openMenu(); return; }
    if (VR.input.pressed('map')) { openMap(); return; }
    player.update(dt, VR.input);
    if (VR.input.pressed('action')) player.say(SALUDOS[sayIdx++ % SALUDOS.length]);
    if (VR.input.pressed('car')) toast('🚗 Los autos y las motos llegan en la Etapa 2');
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
    tall.push({ sy: VR.lerp(player.py, player.y, a), draw: (c) => player.draw(c, cx, cy, a) });
    tall.sort((p, q) => p.sy - q.sy);
    for (const t of tall) t.draw(ctx);
    for (const l of world.labels) {
      const lx = l.x - cx, ly = l.y - cy;
      if (lx > -80 && lx < sw + 80 && ly > -20 && ly < sh + 20) VR.gfx.text(ctx, l.text, lx, ly, '#fff6d8', { center: true, shadow: '#1a1a1e' });
    }
    player.drawBubble(ctx, cx, cy, a);
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
  $('btnReset').onclick = () => { player.x = player.px = world.spawn.x; player.y = player.py = world.spawn.y; cam.x = cam.px = player.x; cam.y = cam.py = player.y; menu.close(); toast('📍 De vuelta en ' + world.spawnName); };

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
  const savePos = () => VR.store.set('pos:' + world.id, { x: Math.round(player.x), y: Math.round(player.y), dir: player.dir });
  setInterval(savePos, 3000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { savePos(); VR.input.releaseAll(); } });
  addEventListener('pagehide', savePos);

  addEventListener('resize', () => VR.screen.fit());
  addEventListener('orientationchange', () => setTimeout(() => VR.screen.fit(), 250));
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  applyTouch();
  VR.loop.start(update, render);
  window.__vr = { world, player, cam, settings };
})();
