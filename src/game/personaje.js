// Pantalla de personaje (Historia): se abre tocando el avatar en la esquina. Muestra al protagonista de cerca (podés girarlo o hacerlo caminar),
// su estado y el equipo que lleva puesto (casco, canasto...). El casco equipado también se ve a pie (ver Player.setCasco).
VR.Personaje = class {
  constructor(o) { Object.assign(this, o); // { player, vida, toggleCasco, toggleEq, abrirMochila, $ }
    this.dir = 'down'; this.anda = false; this.t = null; this.cache = new Map();
    const $ = this.$; this.dlg = $('pjDlg'); this.cv = $('pjCv'); this.btn = $('pjHud'); this.ico = $('pjHudCv');
    this.btn.hidden = false; document.body.classList.add('conPj'); this.btn.onclick = () => this.abrir();
    $('pjClose').onclick = () => this.dlg.close();
    $('pjGira').onclick = () => { const O = ['down', 'right', 'up', 'left']; this.dir = O[(O.indexOf(this.dir) + 1) % 4]; this.pinta(); };
    $('pjAnda').onclick = () => { this.anda = !this.anda; this.pinta(); };
    this.dlg.addEventListener('close', () => { clearInterval(this.t); this.t = null; if (!this._keep) { VR.loop.paused = false; VR.input.enabled = true; } this._keep = false; });
    this.icono(); this.barras(100, this.vida.s.hambre);
  }
  look() { const L = Object.assign({}, this.player.lookData); if (this.vida.cascoPuesto) { L.hat = 'motero'; L.hatColor = 1; } return L; }
  frame(d, a, i, k) { const L = this.look(), key = JSON.stringify(L) + d + a + i + k; let c = this.cache.get(key);
    if (!c) { c = VR.av2Render(Object.assign({}, VR.AV2_DEFAULT, L), d, a, i / 8, k); this.cache.set(key, c); if (this.cache.size > 300) this.cache.delete(this.cache.keys().next().value); } return c; }
  barras(hp, ham) { const sg = JSON.stringify(this.look()); if (sg !== this._sig) { this._sig = sg; this.icono(); } // la miniatura se repinta sola cuando cambia el look (personaje, ropa, casco)
    const $ = this.$, v = $('pjHud').querySelector('.vida'), h = $('pjHud').querySelector('.ham');
    if (hp !== undefined) { v.firstChild.style.width = Math.max(0, Math.min(100, hp)) + '%'; v.classList.toggle('low', hp < 30); }
    if (ham !== undefined) { h.firstChild.style.width = Math.max(0, Math.min(100, ham)) + '%'; h.classList.toggle('low', ham < 25); } }
  icono() { try { const c = this.ico, g = c.getContext('2d'), im = this.frame('down', 'idle', 0, 4); g.clearRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false;
      const sw = im.width, sh = im.height * 0.42, s = Math.min(c.width / sw, c.height / sh); g.drawImage(im, 0, 0, sw, sh, (c.width - sw * s) / 2, 0, sw * s, sh * s); } catch (e) { /* sin retrato */ } }
  abrir() { if (this.dlg.open) return; VR.input.releaseAll(); VR.input.enabled = false; VR.loop.paused = true; this.anda = false; this.dir = 'down'; this.pinta(); this.dlg.showModal();
    this.t = setInterval(() => { if (this.anda) { this._i = ((this._i || 0) + 1) % 8; this.dibuja(); } }, 110); }
  dibuja() { const c = this.cv, g = c.getContext('2d'), im = this.anda ? this.frame(this.dir, 'walk', this._i || 0, 6) : this.frame(this.dir, 'idle', 0, 6);
    g.clearRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; const s = Math.min(c.width / im.width, c.height / im.height); g.drawImage(im, (c.width - im.width * s) / 2, c.height - im.height * s, im.width * s, im.height * s); }
  pinta() { const V = this.vida, s = V.s, g = VR.fmtGs, $ = this.$; this.dibuja(); this.icono();
    $('pjEst').innerHTML = '<span>🍽 ' + Math.round(s.hambre) + '%</span><span>💵 ' + g(VR.Wallet.get()) + '</span><span>🏦 ' + g(s.banco) + '</span>' + (s.debe > 0 ? '<span class="mal">⚠ Debés ' + g(s.debe) + '</span>' : '');
    const fila = (ico, zona, nombre, estado, boton, k) => '<div class="pjSlot"><i>' + ico + '</i><div><small>' + zona + '</small><b>' + nombre + '</b><em>' + estado + '</em></div>' + (boton ? '<button class="cbtn" data-pj="' + k + '">' + boton + '</button>' : '') + '</div>';
    $('pjEq').innerHTML = fila('🪖', 'Cabeza', 'Casco de moto', s.casco ? (V.cascoPuesto ? 'Puesto' : 'En la mochila') : 'No tenés uno (Ao Porã)', s.casco ? (V.cascoPuesto ? 'Sacar' : 'Poner') : '', 'casco') +
      fila('🧺', 'Mano', 'Canasto de chipa', s.canasto ? (s.equipo === 'canasto' ? 'En la mano' : s.stock + ' chipas guardadas') : 'No tenés uno', s.canasto ? (s.equipo === 'canasto' ? 'Guardar' : 'Llevar') : '', 'canasto') +
      fila('🔧', 'Herramientas', 'Caja de herramientas', s.herr ? 'La tenés' : 'No tenés', '', '');
    $('pjEq').querySelectorAll('[data-pj]').forEach((b) => b.onclick = () => { if (b.dataset.pj === 'casco') this.toggleCasco(); else this.toggleEq(); this.pinta(); });
    $('pjMoch').onclick = () => { this._keep = true; this.dlg.close(); this.abrirMochila(); };
  }
};
