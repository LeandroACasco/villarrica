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
  return { tateti, memoria, bloques, rebote };
})();
