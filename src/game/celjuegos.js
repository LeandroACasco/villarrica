// Juegos del celular (19/11/2026): Ta-te-tí contra Kike, Memoria, Bloques y Rebote. Cada uno es f(box) → stop(). Se juegan con el dedo,
// los botones o el teclado (flechas / WASD); los récords se guardan en el teléfono.
VR.Juegos = (() => {
  const best = (k, v) => { try { const o = +(localStorage.getItem('vr_' + k) || 0); if (v !== undefined && (!o || (k === 'memoria' ? v < o : v > o))) { localStorage.setItem('vr_' + k, v); return v; } return o; } catch (e) { return 0; } };
  const keys = (f) => { const h = (e) => { if (/INPUT|TEXTAREA/.test(e.target.tagName)) return; if (f(e.code)) e.preventDefault(); }; addEventListener('keydown', h); return () => removeEventListener('keydown', h); };
  const pad = (box, h, body) => { box.innerHTML = '<h3>' + h + '</h3>' + body; };

  // ---- Ta-te-tí: vos sos ❌, Kike juega ⭕ y no se deja ganar (minimax) ----
  function tateti(box) {
    let B, turno, fin, vic = 0, emp = 0, der = 0, ini = 0; const L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const gan = (b) => { for (const [x, y, z] of L) if (b[x] && b[x] === b[y] && b[x] === b[z]) return b[x]; return b.every(Boolean) ? 'E' : null; };
    const mm = (b, t, d) => { const g = gan(b); if (g) return g === 'O' ? 10 - d : g === 'X' ? d - 10 : 0; let m = t === 'O' ? -99 : 99; for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = t; const v = mm(b, t === 'O' ? 'X' : 'O', d + 1); b[i] = ''; m = t === 'O' ? Math.max(m, v) : Math.min(m, v); } return m; };
    const kike = () => { let bi = -1, bv = -99; for (let i = 0; i < 9; i++) if (!B[i]) { B[i] = 'O'; const v = mm(B, 'X', 1) + Math.random() * 0.3; B[i] = ''; if (v > bv) { bv = v; bi = i; } } if (bi >= 0) B[bi] = 'O'; };
    const nuevo = () => { B = Array(9).fill(''); fin = null; turno = 'X'; if (ini++ % 2) { kike(); } pint(); };
    const pint = () => { const g = gan(B); if (g && !fin) { fin = g; if (g === 'X') vic++; else if (g === 'O') der++; else emp++; }
      pad(box, '❌ Ta-te-tí <small style="float:right;font-weight:600">Vos ' + vic + ' · Kike ' + der + ' · Empates ' + emp + '</small>', '<div class="ttt">' + B.map((c, i) => '<button data-t="' + i + '"' + (c || fin ? ' disabled' : '') + '>' + (c === 'X' ? '❌' : c === 'O' ? '⭕' : '') + '</button>').join('') + '</div><p>' + (fin ? (fin === 'X' ? '¡Ganaste! 🎉' : fin === 'O' ? 'Ganó Kike 🏍' : 'Empate') : 'Te toca: sos ❌') + '</p>' + (fin ? '<button class="cbtn" data-n>Otra partida</button>' : ''));
      box.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { if (fin || B[+b.dataset.t]) return; B[+b.dataset.t] = 'X'; if (!gan(B)) kike(); pint(); });
      const n = box.querySelector('[data-n]'); if (n) n.onclick = nuevo; };
    nuevo(); return () => {};
  }

  // ---- Memoria: 8 pares, menos intentos = mejor ----
  function memoria(box) {
    const E = ['🥐', '🍦', '🏍', '🚌', '🦜', '🧉', '🐴', '⛪']; let C, vis, hechas, mov, esp = null, tm = 0;
    const nuevo = () => { C = E.concat(E).sort(() => Math.random() - 0.5); vis = new Set(); hechas = new Set(); mov = 0; esp = null; pint(); };
    const pint = () => { const ok = hechas.size === 16; if (ok) best('memoria', mov);
      pad(box, '🃏 Memoria <small style="float:right;font-weight:600">Intentos ' + mov + (best('memoria') ? ' · Mejor ' + best('memoria') : '') + '</small>', '<div class="mem">' + C.map((c, i) => '<button data-c="' + i + '" class="' + (hechas.has(i) ? 'ok' : vis.has(i) ? 'up' : '') + '">' + (hechas.has(i) || vis.has(i) ? c : '❔') + '</button>').join('') + '</div>' + (ok ? '<p>¡Completaste el juego en ' + mov + ' intentos! 🎉</p><button class="cbtn" data-n>Otra vez</button>' : '<p>Encontrá los pares.</p>'));
      box.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => { const i = +b.dataset.c; if (tm || hechas.has(i) || vis.has(i)) return; vis.add(i);
        if (esp === null) esp = i; else { mov++; if (C[esp] === C[i]) { hechas.add(esp); hechas.add(i); vis.clear(); esp = null; if (VR.audio) VR.audio.coin(); } else { const a = esp; esp = null; pint(); tm = setTimeout(() => { vis.delete(a); vis.delete(i); tm = 0; pint(); }, 650); return; } } pint(); });
      const n = box.querySelector('[data-n]'); if (n) n.onclick = nuevo; };
    nuevo(); return () => clearTimeout(tm);
  }

  // ---- Bloques (tipo Tetris): 10×16 ----
  function bloques(box) {
    const W = 10, H = 16, C = 18, P = [[[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]], [[0, 1, 1], [1, 1, 0]], [[1, 1, 0], [0, 1, 1]]], COL = ['#5ac8fa', '#ffd84a', '#c8a0ff', '#4a8af0', '#ff9a3a', '#6fe08a', '#ff5a5a'];
    pad(box, '🧱 Bloques <small id="blP" style="float:right;font-weight:600"></small>', '<canvas id="blCv" width="' + W * C + '" height="' + H * C + '" style="width:62%;display:block;margin:0 auto;border:2px solid #3a4658;border-radius:8px;background:#111823;image-rendering:pixelated"></canvas>' +
      '<div class="pad4"><button class="cbtn sec" data-k="l">◀</button><button class="cbtn sec" data-k="r">▶</button><button class="cbtn sec" data-k="o">⟳</button><button class="cbtn sec" data-k="d">▼</button></div>');
    const cv = box.querySelector('#blCv'), g = cv.getContext('2d'), pts = box.querySelector('#blP'); let G, p, x, y, sc, lin, dead, dt = 0, last = performance.now(), raf = 0, alive = true;
    const rot = (m) => m[0].map((_, i) => m.map((r) => r[i]).reverse()), hit = (m, px, py) => m.some((r, j) => r.some((v, i) => v && (px + i < 0 || px + i >= W || py + j >= H || (py + j >= 0 && G[py + j][px + i]))));
    const nueva = () => { const k = (Math.random() * 7) | 0; p = { m: P[k], c: COL[k] }; x = ((W - p.m[0].length) / 2) | 0; y = 0; if (hit(p.m, x, y)) dead = true; };
    const reset = () => { G = Array.from({ length: H }, () => Array(W).fill(0)); sc = 0; lin = 0; dead = false; nueva(); };
    const fija = () => { p.m.forEach((r, j) => r.forEach((v, i) => { if (v && y + j >= 0) G[y + j][x + i] = p.c; })); let n = 0; for (let j = H - 1; j >= 0; j--) if (G[j].every(Boolean)) { G.splice(j, 1); G.unshift(Array(W).fill(0)); n++; j++; } if (n) { sc += [0, 100, 300, 500, 800][n]; lin += n; if (VR.audio) VR.audio.coin(); } nueva(); };
    const mv = (k) => { if (dead) { reset(); return; } if (k === 'l' && !hit(p.m, x - 1, y)) x--; else if (k === 'r' && !hit(p.m, x + 1, y)) x++; else if (k === 'o') { const r = rot(p.m); if (!hit(r, x, y)) p.m = r; else if (!hit(r, x - 1, y)) { p.m = r; x--; } } else if (k === 'd') { if (!hit(p.m, x, y + 1)) { y++; sc++; } else fija(); } draw(); };
    const draw = () => { g.fillStyle = '#111823'; g.fillRect(0, 0, W * C, H * C); const cel = (i, j, c) => { g.fillStyle = c; g.fillRect(i * C + 1, j * C + 1, C - 2, C - 2); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(i * C + 1, j * C + 1, C - 2, 3); };
      G.forEach((r, j) => r.forEach((v, i) => { if (v) cel(i, j, v); })); if (!dead) p.m.forEach((r, j) => r.forEach((v, i) => { if (v) cel(x + i, y + j, p.c); }));
      if (dead) { g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(0, 0, W * C, H * C); g.fillStyle = '#fff'; g.font = '700 16px system-ui'; g.textAlign = 'center'; g.fillText('Perdiste · tocá ▼', W * C / 2, H * C / 2); }
      best('bloques', sc); pts.textContent = sc + ' pts · ' + lin + ' líneas · récord ' + best('bloques'); };
    const tick = (t) => { if (!alive) return; dt += t - last; last = t; const v = Math.max(110, 650 - lin * 22); if (dt > v) { dt = 0; if (!dead) mv('d'); } raf = requestAnimationFrame(tick); };
    box.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => mv(b.dataset.k)); const kk = keys((c) => { const m = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'o', KeyW: 'o', Space: 'o', ArrowDown: 'd', KeyS: 'd' }[c]; if (m) mv(m); return !!m; });
    reset(); draw(); raf = requestAnimationFrame(tick); return () => { alive = false; cancelAnimationFrame(raf); kk(); };
  }

  // ---- Rebote (tipo Arkanoid): arrastrá el dedo o usá ◀ ▶ ----
  function rebote(box) {
    const W = 240, H = 300; pad(box, '🏓 Rebote <small id="rbP" style="float:right;font-weight:600"></small>', '<canvas id="rbCv" width="' + W + '" height="' + H + '" style="width:80%;display:block;margin:0 auto;border:2px solid #3a4658;border-radius:8px;background:#111823;touch-action:none;image-rendering:pixelated"></canvas><div class="pad4"><button class="cbtn sec" data-k="l">◀</button><button class="cbtn sec" data-k="s">● Lanzar</button><button class="cbtn sec" data-k="r">▶</button></div>');
    const cv = box.querySelector('#rbCv'), g = cv.getContext('2d'), pts = box.querySelector('#rbP'), COL = ['#ff5a5a', '#ff9a3a', '#ffd84a', '#6fe08a', '#5ac8fa']; let px, br, b, vid, sc, on, izq = 0, der = 0, raf = 0, alive = true, last = performance.now(); const PW = 52;
    const ladrillos = () => { br = []; for (let j = 0; j < 5; j++) for (let i = 0; i < 8; i++) br.push({ x: 6 + i * 29, y: 30 + j * 14, w: 27, h: 11, c: COL[j] }); };
    const reset = (full) => { if (full) { ladrillos(); sc = 0; vid = 3; } px = W / 2 - PW / 2; b = { x: W / 2, y: H - 30, vx: 0, vy: 0 }; on = false; };
    const lanza = () => { if (!on) { on = true; b.vx = (Math.random() < 0.5 ? -1 : 1) * 90; b.vy = -170; } };
    const step = (dt) => { px = Math.max(0, Math.min(W - PW, px + (der - izq) * 230 * dt)); if (!on) { b.x = px + PW / 2; b.y = H - 30; return; }
      b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < 4 || b.x > W - 4) { b.vx *= -1; b.x = Math.max(4, Math.min(W - 4, b.x)); } if (b.y < 4) { b.vy = Math.abs(b.vy); }
      if (b.vy > 0 && b.y > H - 22 && b.y < H - 10 && b.x > px - 3 && b.x < px + PW + 3) { const o = (b.x - (px + PW / 2)) / (PW / 2), v = Math.min(300, Math.hypot(b.vx, b.vy) * 1.015); b.vx = o * v * 0.75; b.vy = -Math.sqrt(Math.max(1000, v * v - b.vx * b.vx)); if (VR.audio) VR.audio.blip(); }
      for (const q of br) if (!q.d && b.x > q.x - 3 && b.x < q.x + q.w + 3 && b.y > q.y - 3 && b.y < q.y + q.h + 3) { q.d = 1; sc += 10; if (Math.abs(b.y - (q.y + q.h / 2)) > q.h / 2) b.vy *= -1; else b.vx *= -1; if (VR.audio) VR.audio.blip(); break; }
      if (br.every((q) => q.d)) { ladrillos(); reset(false); } if (b.y > H) { vid--; if (vid <= 0) { best('rebote', sc); reset(true); } else reset(false); } };
    const draw = () => { g.fillStyle = '#111823'; g.fillRect(0, 0, W, H); for (const q of br) if (!q.d) { g.fillStyle = q.c; g.fillRect(q.x, q.y, q.w, q.h); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(q.x, q.y, q.w, 3); }
      g.fillStyle = '#f2f2f2'; g.fillRect(px, H - 16, PW, 7); g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(b.x, b.y, 4, 0, 7); g.fill(); best('rebote', sc); pts.textContent = sc + ' pts · ' + '❤'.repeat(vid) + ' · récord ' + best('rebote'); };
    const tick = (t) => { if (!alive) return; step(Math.min(0.04, (t - last) / 1000)); last = t; draw(); raf = requestAnimationFrame(tick); };
    const toX = (e) => { const r = cv.getBoundingClientRect(); px = Math.max(0, Math.min(W - PW, (e.clientX - r.left) / r.width * W - PW / 2)); };
    cv.addEventListener('pointerdown', (e) => { toX(e); lanza(); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* sin captura */ } }); cv.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') toX(e); });
    box.querySelectorAll('[data-k]').forEach((q) => { const k = q.dataset.k; q.onpointerdown = () => { if (k === 'l') izq = 1; else if (k === 'r') der = 1; else lanza(); }; q.onpointerup = q.onpointerleave = () => { if (k === 'l') izq = 0; else if (k === 'r') der = 0; }; });
    const kd = (e) => { if (/INPUT|TEXTAREA/.test(e.target.tagName)) return; if (e.code === 'ArrowLeft' || e.code === 'KeyA') izq = 1; else if (e.code === 'ArrowRight' || e.code === 'KeyD') der = 1; else if (e.code === 'Space' || e.code === 'ArrowUp') lanza(); else return; e.preventDefault(); };
    const ku = (e) => { if (e.code === 'ArrowLeft' || e.code === 'KeyA') izq = 0; else if (e.code === 'ArrowRight' || e.code === 'KeyD') der = 0; };
    addEventListener('keydown', kd); addEventListener('keyup', ku); reset(true); raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
  }
  // ---- Dina Run (versión «Java 2006»): mini port del runner de Kiut Studio, con splash, carga, menú con softkeys y pixel art propio (176×208) ----
  function dinarun(box) {
    const W = 176, H = 208, GY = 150, ST = 'bold ', MENU = ['Jugar', 'Récords', 'Ayuda', 'Salir'];
    pad(box, '🐱 Dina Run', '<canvas id="drCv" width="' + W + '" height="' + H + '" style="width:88%;display:block;margin:0 auto;border:3px solid #222;border-radius:12px;background:#000;touch-action:none;image-rendering:pixelated"></canvas><p style="font-size:11px;text-align:center">Tocá / Espacio: saltar (doble salto en el aire) · ⬆⬇ menú · B: atrás</p>');
    const cv = box.querySelector('#drCv'), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const A = () => VR.audio, snd = (f) => { try { if (A()) A()[f](); } catch (e) { /* sin audio */ } };
    let st = 'splash', t0 = performance.now(), sel = 0, raf = 0, alive = true, last = performance.now(), sc = 0, bl = 0;
    let y, vy, sj, spd, dist, sp, ob, fr, fresas, inv, dina, msg, msgT, hit2, nuevoRec;
    const rc = (x, yy, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(yy), w, h); };
    const tx = (s2, x, yy, sz, col, al, out) => { g.font = ST + sz + 'px monospace'; g.textAlign = al || 'left'; g.textBaseline = 'top'; if (out) { g.fillStyle = out; for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.fillText(s2, x + a, yy + b); } g.fillStyle = col; g.fillText(s2, x, yy); };
    const reset = () => { y = GY; vy = 0; sj = 0; spd = 85; dist = 0; sp = 120; ob = []; fr = []; fresas = 0; inv = 0; dina = { on: false, t: 0 }; msg = ''; msgT = 0; nuevoRec = false; };
    const noche = () => Math.floor(dist / 8 / 250) % 2 === 1;
    // ---- dibujos ----
    function nube(x, yy) { rc(x, yy + 4, 28, 8, '#fff'); rc(x + 5, yy, 14, 8, '#fff'); rc(x + 16, yy + 2, 10, 8, '#fff'); }
    function fondo(t, n) { const q = g.createLinearGradient(0, 0, 0, GY); q.addColorStop(0, n ? '#1a1040' : '#ff9fcf'); q.addColorStop(1, n ? '#5a2a7a' : '#fff0f8'); g.fillStyle = q; g.fillRect(0, 0, W, GY);
      if (n) { for (let i = 0; i < 18; i++) rc((i * 47 + 13) % W, (i * 31) % 80, 1, 1, '#fff'); g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(138, 30, 12, 0, 7); g.fill(); g.fillStyle = '#5a2a7a'; g.beginPath(); g.arc(143, 27, 11, 0, 7); g.fill(); }
      else for (let i = 0; i < 3; i++) nube(((i * 90 - t * 6) % (W + 60) + W + 60) % (W + 60) - 30, 22 + i * 24);
      rc(0, GY, W, H - GY, n ? '#2a6a4a' : '#7ad07a'); rc(0, GY, W, 3, n ? '#3a8a5a' : '#9ae89a'); for (let i = 0; i < 12; i++) rc(((i * 29 - t * 40) % W + W) % W, GY + 14 + (i % 3) * 12, 8, 2, n ? '#1f5a3a' : '#5ab85a'); }
    function chica(x, by, run, fl) { if (fl && Math.floor(performance.now() / 70) % 2) return; const f = run ? Math.floor(performance.now() / 110) % 2 : 0, t = by - 22;
      rc(x + 1, t, 9, 3, '#5a3418'); rc(x, t + 2, 3, 8, '#5a3418'); rc(x + 8, t + 2, 3, 6, '#5a3418'); rc(x + 2, t + 3, 7, 6, '#f6c8a0'); rc(x + 3, t + 5, 1, 2, '#222'); rc(x + 7, t + 5, 1, 2, '#222');
      rc(x + 1, t + 9, 9, 7, '#ff5a9a'); rc(x + 3, t + 16, 2, 4 - (f ? 1 : 0), '#f6c8a0'); rc(x + 7, t + 16, 2, 3 + (f ? 1 : 0), '#f6c8a0'); rc(x + 2, by - 3 - (f ? 1 : 0), 3, 3, '#fff'); rc(x + 7, by - 3 - (f ? 0 : 1), 3, 3, '#fff'); }
    function gata(x, by, f) { const c = '#f09a3a'; rc(x, by - 9, 18, 8, c); rc(x + 14, by - 15, 9, 9, c); rc(x + 14, by - 18, 3, 4, c); rc(x + 20, by - 18, 3, 4, c); rc(x + 17, by - 12, 2, 2, '#222'); rc(x + 21, by - 12, 2, 2, '#222'); rc(x + 19, by - 9, 2, 1, '#ff7a8a'); rc(x - 4, by - 12 + (f ? 2 : 0), 5, 3, c); rc(x + 2, by - 2 + (f ? 1 : 0), 3, 2, '#c87820'); rc(x + 11, by - 2 + (f ? 0 : 1), 3, 2, '#c87820'); rc(x + 4, by - 9, 2, 8, '#c87820'); rc(x + 9, by - 9, 2, 8, '#c87820'); }
    function torta(x, h) { for (let k = 0; k < h / 12; k++) { const by = GY - k * 12; rc(x, by - 9, 12, 9, '#f4d8a0'); rc(x, by - 12, 12, 4, '#fff'); rc(x + 1, by - 12, 4, 2, '#ff8fb8'); rc(x, by - 2, 12, 2, '#c8884a'); if (k === h / 12 - 1) rc(x + 5, by - 16, 2, 4, '#d82a3a'); } }
    function fresa(x, yy) { rc(x + 1, yy + 2, 6, 6, '#e8303a'); rc(x + 2, yy + 8, 4, 1, '#e8303a'); rc(x + 2, yy, 4, 2, '#3aa83a'); rc(x + 3, yy + 4, 1, 1, '#ffe6a0'); rc(x + 5, yy + 5, 1, 1, '#ffe6a0'); }
    function marco(l, r) { rc(0, H - 16, W, 16, '#1a1a22'); rc(0, H - 17, W, 1, '#5a5a6a'); tx(l, 4, H - 13, 9, '#9fe0ff', 'left'); tx(r, W - 4, H - 13, 9, '#9fe0ff', 'right'); }
    // ---- lógica ----
    const spawn = () => { const m = dist / 8, r = Math.random(), x = W + 12; if (r < 0.15 && m > 120) ob.push({ x, w: 12, h: 24 }); else if (r < 0.4) { ob.push({ x, w: 12, h: 12 }); ob.push({ x: x + 14, w: 12, h: 12 }); } else ob.push({ x, w: 12, h: 12 });
      const gap = spd * (0.75 + Math.random() * 0.5) + 36; sp = gap; if (Math.random() < 0.8) { const cx = x + gap / 2 - 10, by = GY - 26 - Math.random() * 26; for (let i = 0; i < 3; i++) fr.push({ x: cx + i * 12, y: by - (i === 1 ? 5 : 0) }); } };
    const salta = () => { if (st !== 'juego') return; if (y >= GY) { vy = -300; sj = 1; snd('blip'); } else if (sj < 2) { vy = -270; sj = 2; snd('blip'); } };
    const fin = () => { st = 'fin'; const m = Math.floor(dist / 8); nuevoRec = m > (best('dina') || 0); best('dina', m); best('dinaf', fresas); snd('coin'); };
    const choque = () => { if (inv > 0) return; if (dina.on) { try { A().tone(120, 0.3, { type: 'sawtooth', vol: 0.06 }); } catch (e) { /* sin audio */ } fin(); return; } dina.on = true; dina.t = 0; spd = Math.max(70, spd * 0.55); inv = 1.4; msg = '¡Tropezaste! Dina viene…'; msgT = 2; try { A().tone(160, 0.2, { type: 'square', vol: 0.05 }); } catch (e) { /* sin audio */ } };
    const step = (dt) => { if (st !== 'juego') return; dist += spd * dt; spd = Math.min(210, spd + (spd < 130 ? 7 : 2.4) * dt); vy += 900 * dt; y += vy * dt; if (y >= GY) { y = GY; vy = 0; sj = 0; }
      for (const o of ob) o.x -= spd * dt; for (const f of fr) f.x -= spd * dt; ob = ob.filter((o) => o.x > -30); fr = fr.filter((f) => f.x > -12); sp -= spd * dt; if (sp <= 0) spawn();
      inv = Math.max(0, inv - dt); msgT = Math.max(0, msgT - dt); if (dina.on) { dina.t += dt; if (dina.t > 6) { dina.on = false; msg = 'Dina se cansó'; msgT = 1.5; } }
      for (const o of ob) if (32 + 9 > o.x + 2 && 33 < o.x + o.w - 2 && y > GY - o.h + 3) { choque(); break; }
      fr = fr.filter((f) => { if (f.x < 43 && f.x + 8 > 31 && f.y + 8 > y - 22 && f.y < y) { fresas++; snd('coin'); return false; } return true; }); if (st === 'juego') { /* ok */ } };
    // ---- pantallas ----
    const dibuja = (now) => { const e = (now - t0) / 1000, n = st === 'juego' || st === 'pausa' || st === 'fin' ? noche() : false; g.globalAlpha = 1; g.textAlign = 'left';
      if (st === 'splash') { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); const a = Math.min(1, e / 0.5, Math.max(0, (2.3 - e) / 0.5)); g.globalAlpha = Math.max(0, a); gata(76, 96, 0); tx('KIUT', W / 2, 108, 22, '#fff', 'center'); tx('STUDIO', W / 2, 132, 12, '#ff7ab8', 'center'); tx('presenta', W / 2, 150, 9, '#9a9aaa', 'center'); g.globalAlpha = 1; if (e > 2.4) { st = 'carga'; t0 = now; } return; }
      if (st === 'carga') { g.fillStyle = '#10101a'; g.fillRect(0, 0, W, H); tx('Cargando...', W / 2, 90, 12, '#fff', 'center'); rc(28, 112, 120, 10, '#444'); rc(30, 114, Math.min(116, e / 1.4 * 116), 6, '#ff7ab8'); tx('© 2026 Kiut Studio', W / 2, 176, 9, '#888', 'center'); tx('Hecho en Villarrica', W / 2, 188, 9, '#888', 'center'); if (e > 1.6) { st = 'titulo'; t0 = now; } return; }
      fondo(e, n);
      if (st === 'titulo') { tx('DINA', W / 2, 24, 30, '#ff3a8a', 'center', '#fff'); tx('RUN', W / 2, 54, 30, '#ff3a8a', 'center', '#fff'); gata(30 + (e * 40) % 120, GY - 4, Math.floor(e * 6) % 2); chica(22 + (e * 40) % 120 + 40, GY - 4, true, false); if (Math.floor(e * 2) % 2) tx('Presioná OK', W / 2, 100, 11, '#fff', 'center', '#222'); tx('v1.0 · Java 2006', W / 2, 188 - 20, 8, '#444', 'center'); marco('', 'Menú'); return; }
      if (st === 'menu') { tx('MENÚ', W / 2, 20, 16, '#fff', 'center', '#d82a7a'); MENU.forEach((m, i) => { rc(30, 56 + i * 24, 116, 20, i === sel ? '#ff3a8a' : 'rgba(0,0,0,.35)'); tx(m, W / 2, 60 + i * 24, 12, '#fff', 'center'); }); marco('Elegir', 'Atrás'); return; }
      if (st === 'records') { tx('RÉCORDS', W / 2, 20, 16, '#fff', 'center', '#d82a7a'); tx('Distancia', W / 2, 62, 11, '#222', 'center'); tx((best('dina') || 0) + ' m', W / 2, 78, 18, '#d82a7a', 'center'); tx('Frutillas (partida)', W / 2, 106, 11, '#222', 'center'); tx(String(best('dinaf') || 0), W / 2, 122, 18, '#d82a7a', 'center'); marco('', 'Atrás'); return; }
      if (st === 'ayuda') { tx('AYUDA', W / 2, 14, 16, '#fff', 'center', '#d82a7a'); ['Tocá la pantalla o', 'apretá Espacio para', 'saltar. En el aire', 'saltá de nuevo: doble', 'salto.', '', 'Esquivá las tortas y', 'juntá frutillas.', 'Si chocás, Dina te', 'corre. Si chocás de', 'nuevo, perdés.'].forEach((l, i) => tx(l, W / 2, 44 + i * 12, 10, '#222', 'center')); marco('', 'Atrás'); return; }
      // juego / pausa / fin
      for (const o of ob) torta(o.x, o.h); for (const f of fr) fresa(f.x, f.y); if (dina.on) { const ax = Math.min(26, -20 + dina.t * 30 * (dina.t < 5.4 ? 1 : -1)); gata(dina.t > 5.4 ? 26 - (dina.t - 5.4) * 60 : ax, GY, Math.floor(now / 90) % 2); }
      chica(32, y, y >= GY && st === 'juego', inv > 0); const m = Math.floor(dist / 8); rc(0, 0, W, 14, 'rgba(0,0,0,.35)'); fresa(3, 3); tx('x' + fresas, 14, 3, 9, '#fff', 'left'); tx(m + ' m', W - 4, 3, 9, '#fff', 'right'); if (dina.on) tx('DINA!', W / 2, 3, 9, '#ffd84a', 'center'); if (msgT > 0) tx(msg, W / 2, 40, 10, '#fff', 'center', '#222');
      if (st === 'pausa') { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, H - 16); tx('PAUSA', W / 2, 80, 20, '#fff', 'center'); marco('Seguir', 'Menú'); }
      else if (st === 'fin') { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, H - 16); tx('¡TE ALCANZÓ', W / 2, 50, 14, '#ffd84a', 'center'); tx('DINA!', W / 2, 66, 14, '#ffd84a', 'center'); tx(m + ' m · ' + fresas + ' fr.', W / 2, 96, 12, '#fff', 'center'); tx(nuevoRec ? '¡NUEVO RÉCORD!' : 'Récord: ' + (best('dina') || 0) + ' m', W / 2, 116, 11, nuevoRec ? '#7fe08a' : '#ccc', 'center'); marco('Reintentar', 'Menú'); }
      else marco('Pausa', ''); };
    // ---- entradas ----
    const ok = () => { if (st === 'titulo') { st = 'menu'; sel = 0; } else if (st === 'menu') { const m = MENU[sel]; if (m === 'Jugar') { reset(); st = 'juego'; } else if (m === 'Récords') st = 'records'; else if (m === 'Ayuda') st = 'ayuda'; else { st = 'splash'; t0 = performance.now(); } } else if (st === 'juego') salta(); else if (st === 'pausa') st = 'juego'; else if (st === 'fin') { reset(); st = 'juego'; } };
    const atras = () => { if (st === 'menu' || st === 'titulo') st = 'titulo'; else if (st === 'records' || st === 'ayuda' || st === 'pausa' || st === 'fin') st = 'menu'; else if (st === 'juego') st = 'pausa'; };
    cv.addEventListener('pointerdown', (e) => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, yy = (e.clientY - r.top) / r.height * H;
      if (yy > H - 16) { if (x < W / 2) { if (st === 'juego') st = 'pausa'; else ok(); } else atras(); return; }
      if (st === 'menu') { const i = Math.floor((yy - 56) / 24); if (i >= 0 && i < MENU.length) { sel = i; ok(); } return; } if (st === 'splash' || st === 'carga') return; ok(); e.preventDefault(); });
    const kd = (e) => { if (/INPUT|TEXTAREA/.test(e.target.tagName)) return; if (e.code === 'Space' || e.code === 'Enter' || (e.code === 'ArrowUp' && st !== 'menu')) ok(); else if (e.code === 'ArrowUp' && st === 'menu') sel = (sel + MENU.length - 1) % MENU.length; else if (e.code === 'ArrowDown' && st === 'menu') sel = (sel + 1) % MENU.length; else if (e.code === 'Backspace' || e.code === 'KeyB') atras(); else return; e.preventDefault(); };
    addEventListener('keydown', kd); reset();
    const tick = (t) => { if (!alive) return; const dt = Math.min(0.04, (t - last) / 1000); last = t; step(dt); dibuja(t); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); removeEventListener('keydown', kd); };
  }
  return { tateti, memoria, bloques, rebote, dinarun };
})();
