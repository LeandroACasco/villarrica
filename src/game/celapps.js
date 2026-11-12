// Apps extra del celular (11/11/2026): Cámara + Galería (fotos del juego) y Culebra (el clásico de los celulares viejos).
// Todo original. Las fotos se guardan (JPEG nítido) en localStorage, hasta 12 (si no hay lugar, se borran las más viejas).
(function () {
  const KEY = 'vr_fotos', MAX = 12;
  VR.Fotos = {
    list() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } },
    save(l) { while (l.length) { try { localStorage.setItem(KEY, JSON.stringify(l)); return true; } catch (e) { l.pop(); } } return false; },
    // saca la foto del canvas del juego, con un marquito y el lugar / hora abajo
    snap(cv, caption) {
      // 11/11/2026: nítida. Antes se achicaba a 640 px de ancho (en un teléfono el cuadro tiene más de 1000 px: salía borrosa) con JPEG 0,72.
      // Ahora se guarda al tamaño real del cuadro (si es chico, se agranda por un entero con píxeles marcados; si es enorme, se achica suave a 1600 px)
      // y el JPEG sale a calidad 0,9.
      const M = Math.max(cv.width, cv.height); let k = M < 1100 ? Math.max(1, Math.round(1100 / M)) : 1, W = cv.width * k, H = cv.height * k, suave = false;
      if (M > 1600) { const f = 1600 / M; W = Math.round(cv.width * f); H = Math.round(cv.height * f); suave = true; }
      const B = Math.round(Math.max(30, Math.min(W, H) * 0.06)), o = document.createElement('canvas'); o.width = W; o.height = H + B;
      const g = o.getContext('2d'); g.imageSmoothingEnabled = suave; g.imageSmoothingQuality = 'high'; g.fillStyle = '#f4efe4'; g.fillRect(0, 0, W, H + B); g.drawImage(cv, 0, 0, W, H);
      g.fillStyle = '#3a3226'; g.font = '700 ' + Math.round(B * 0.45) + 'px system-ui'; g.textBaseline = 'middle'; g.fillText(caption, B * 0.4, H + B / 2);
      const url = o.toDataURL('image/jpeg', 0.9), l = this.list(); l.unshift({ t: Date.now(), c: caption, u: url }); this.save(l.slice(0, MAX)); return url;
    },
    del(i) { const l = this.list(); l.splice(i, 1); this.save(l); },
  };
  // Culebra: 16×16, se maneja con flechas / WASD / deslizando el dedo / botones. Come chipa 🥖 y crece.
  VR.Culebra = function (box, onExit) {
    const N = 16, C = 18, hs = +(localStorage.getItem('vr_culebra') || 0); let best = hs;
    box.innerHTML = '<h3>🐍 Culebra <span id="cbPts" style="float:right;font-weight:600;font-size:13px"></span></h3><canvas id="cbCv" width="' + N * C + '" height="' + N * C + '" style="width:100%;background:#9bbc0f;border:3px solid #0f380f;border-radius:6px;image-rendering:pixelated;touch-action:none"></canvas>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px"><span></span><button class="cbtn sec" data-d="u">▲</button><span></span><button class="cbtn sec" data-d="l">◀</button><button class="cbtn sec" data-d="d">▼</button><button class="cbtn sec" data-d="r">▶</button></div>';
    const cv = box.querySelector('#cbCv'), g = cv.getContext('2d'), pts = box.querySelector('#cbPts');
    let s, dir, nd, food, score, dead, timer;
    const rnd = () => ({ x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 });
    const reset = () => { s = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]; dir = nd = { x: 1, y: 0 }; score = 0; dead = false; place(); draw(); };
    const place = () => { do food = rnd(); while (s.some((q) => q.x === food.x && q.y === food.y)); };
    const turn = (x, y) => { if (dead) { reset(); return; } if (x !== -dir.x || y !== -dir.y) nd = { x, y }; };
    const step = () => {
      if (!box.isConnected) { clearInterval(timer); return; }
      if (dead) return; dir = nd; const h = { x: s[0].x + dir.x, y: s[0].y + dir.y };
      if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || s.some((q) => q.x === h.x && q.y === h.y)) { dead = true; if (score > best) { best = score; try { localStorage.setItem('vr_culebra', best); } catch (e) {} } draw(); return; }
      s.unshift(h); if (h.x === food.x && h.y === food.y) { score++; place(); } else s.pop(); draw();
    };
    const draw = () => {
      g.fillStyle = '#9bbc0f'; g.fillRect(0, 0, N * C, N * C);
      g.fillStyle = '#0f380f'; s.forEach((q, i) => g.fillRect(q.x * C + 1, q.y * C + 1, C - 2, C - 2)); g.fillStyle = '#9bbc0f'; g.fillRect(s[0].x * C + 6, s[0].y * C + 5, 3, 3);
      g.fillStyle = '#306230'; g.beginPath(); g.ellipse(food.x * C + C / 2, food.y * C + C / 2, 6, 4, 0.5, 0, 7); g.fill(); g.fillStyle = '#9bbc0f'; g.fillRect(food.x * C + 6, food.y * C + 8, 6, 1);
      pts.textContent = 'chipa: ' + score + ' · récord: ' + best;
      if (dead) { g.fillStyle = 'rgba(15,56,15,.75)'; g.fillRect(0, N * C / 2 - 28, N * C, 56); g.fillStyle = '#9bbc0f'; g.font = '700 18px system-ui'; g.textAlign = 'center'; g.fillText('¡Chocaste! Tocá para jugar', N * C / 2, N * C / 2 + 6); g.textAlign = 'left'; }
    };
    box.querySelectorAll('[data-d]').forEach((b) => b.onclick = () => { const d = b.dataset.d; turn(d === 'l' ? -1 : d === 'r' ? 1 : 0, d === 'u' ? -1 : d === 'd' ? 1 : 0); });
    let t0 = null; cv.addEventListener('touchstart', (e) => { t0 = [e.touches[0].clientX, e.touches[0].clientY]; if (dead) reset(); }, { passive: true });
    cv.addEventListener('touchend', (e) => { if (!t0) return; const dx = e.changedTouches[0].clientX - t0[0], dy = e.changedTouches[0].clientY - t0[1]; if (Math.hypot(dx, dy) > 18) Math.abs(dx) > Math.abs(dy) ? turn(dx > 0 ? 1 : -1, 0) : turn(0, dy > 0 ? 1 : -1); t0 = null; });
    cv.addEventListener('click', () => { if (dead) reset(); });
    const key = (e) => { if (!box.isConnected) { removeEventListener('keydown', key); return; } const m = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] }[e.code]; if (m) { e.preventDefault(); turn(m[0], m[1]); } };
    addEventListener('keydown', key); reset(); timer = setInterval(step, 140);
    return () => { clearInterval(timer); removeEventListener('keydown', key); };
  };
})();
