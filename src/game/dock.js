// Dock bajo el minimapa (Historia): 📱 Celular y 🎒 Mochila con globito de novedades + ranura de objeto equipado que rota
// (tocá, flechas, rueda del mouse, deslizar de costado o tecla G). Sin nada en la mano: la mano abierta 🖐️.
VR.Dock = class {
  constructor(o) { Object.assign(this, o); // { $, abrirCel, abrirInv, msgs: () => n, nuevos: () => n, equipables: () => [{k,ico,n}], actual: () => k, equipar: (k) => void, visible: () => bool }
    const $ = this.$; this.el = $('dock'); this.last = { cel: 0, inv: 0 }; this.ek = null; VR.drawMochilaIcon($('dkInvCv'));
    $('dkCel').onclick = () => this.abrirCel(); $('dkInv').onclick = () => this.abrirInv();
    const eq = this.eq = $('dkEq'); let x0 = null, moved = false;
    eq.querySelectorAll('.dkA').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.rota(+b.dataset.d); }));
    eq.addEventListener('pointerdown', (e) => { if (e.target.closest('.dkA')) return; x0 = e.clientX; moved = false; try { eq.setPointerCapture(e.pointerId); } catch (_) { /* sin captura */ } });
    eq.addEventListener('pointerup', (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 14) this.rota(dx < 0 ? 1 : -1); else this.rota(1); });
    eq.addEventListener('pointercancel', () => { x0 = null; });
    eq.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); this.rota(e.deltaY > 0 || e.deltaX > 0 ? 1 : -1); }, { passive: false });
    this.pinta(); setInterval(() => this.pinta(), 400);
  }
  lista() { const L = this.equipables(); return L.length ? L : [{ k: 'mano', ico: '🖐️', n: 'Mano libre' }]; }
  rota(d) { const L = this.lista(); if (L.length < 2) { this.toast && this.toast('🖐️ Solo tenés la mano libre: conseguí algo para llevar'); return; }
    const a = this.actual(), i = Math.max(0, L.findIndex((q) => q.k === a)), n = L[(i + d + L.length) % L.length]; this.dir = d; this.equipar(n.k); this.pinta(true); }
  badge(id, n, k) { const b = this.$(id); b.hidden = !n; b.textContent = n > 9 ? '9+' : n; if (n > this.last[k]) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); } this.last[k] = n; }
  pinta(anim) { const v = this.visible(); this.el.hidden = !v; if (!v) return;
    this.badge('dkCelB', this.msgs(), 'cel'); this.badge('dkInvB', this.nuevos(), 'inv');
    const L = this.lista(), a = this.actual() || 'mano', it = L.find((q) => q.k === a) || L[0], key = it.k + '|' + it.n, c = this.eq.querySelector('.dkC');
    this.eq.classList.toggle('uno', L.length < 2);
    if (key !== this.ek) { this.ek = key; c.innerHTML = '<i>' + it.ico + '</i><small>' + it.n + '</small>'; c.title = 'Equipado: ' + it.n; if (anim) { c.classList.remove('izq', 'der'); void c.offsetWidth; c.classList.add(this.dir < 0 ? 'izq' : 'der'); } }
    this.eq.querySelector('.dkP').textContent = L.length > 1 ? L.map((q) => q.k === it.k ? '●' : '○').join(' ') : ''; }
};
