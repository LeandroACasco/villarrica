// Inventario (Historia): lo comprado y lo que llevás encima. Vive en `vida.s.inv` (viaja con la partida).
// Items apilables { k, n, ico, tipo: 'comida'|'objeto', c: cantidad, h: hambre que repone, cu: vida que cura, col }.
// El equipo puesto (casco, canasto) se maneja desde "Mi personaje"; acá se lo ve y se lo puede poner o sacar también.
VR.Inv = {
  vida: null,
  list() { const V = this.vida; if (!V) return []; return V.s.inv || (V.s.inv = []); },
  add(it, c) { const L = this.list(), f = L.find((x) => x.k === it.k); c = c || 1; if (f) f.c += c; else L.push(Object.assign({ c }, it)); if (this.vida) this.vida.save(); },
  quita(k, c) { const L = this.list(), i = L.findIndex((x) => x.k === k); if (i < 0) return false; L[i].c -= c || 1; if (L[i].c <= 0) L.splice(i, 1); this.vida.save(); return true; },
  total() { return this.list().reduce((a, x) => a + x.c, 0); },
  // guarda lo que se compró en el súper (una entrada por producto); devuelve false si no alcanzó la plata
  compra(total, carro, donde) { const V = this.vida; if (!V || !V.gasta(total, 'Compras en ' + donde)) return false;
    for (const p of carro) this.add({ k: 'comida:' + p.n, n: p.n, ico: '🛒', tipo: 'comida', h: p.h, cu: p.cu || 0 }); V.msg('🎒 Guardaste ' + carro.length + ' cosas en el inventario'); return true; },
  come(k) { const V = this.vida, x = this.list().find((q) => q.k === k); if (!x) return false; this.quita(k, 1); V.s.hambre = Math.min(100, V.s.hambre + (x.h || 0)); V.sync(); V.save(); if (x.cu && VR.heal) VR.heal(x.cu); V.msg('🍽 Comiste: ' + x.n + (x.h ? ' · +' + x.h + '% de hambre' : '')); return true; },
};
// ícono de mochila en pixel art (16×16) para el botón del inventario
VR.drawMochilaIcon = (cv) => { const g = cv.getContext('2d'); g.clearRect(0, 0, 16, 16); const r = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  r('#4a2a12', 6, 0, 4, 1); r('#4a2a12', 5, 1, 1, 2); r('#4a2a12', 10, 1, 1, 2); r('#3a2410', 1, 6, 1, 7); r('#3a2410', 14, 6, 1, 7);
  r('#4a2a12', 2, 2, 12, 13); r('#c0773a', 3, 3, 10, 11); r('#a8602a', 3, 3, 10, 4); r('#7a4420', 3, 7, 10, 1); r('#e2a468', 4, 4, 3, 1);
  r('#f2c230', 7, 6, 2, 3); r('#8a6a10', 7, 8, 2, 1); r('#d48a48', 4, 9, 8, 4); r('#7a4420', 4, 9, 8, 1); r('#8a5226', 4, 11, 8, 1); r('#f2c230', 7, 11, 2, 1); };
VR.Inventario = class {
  constructor(o) { Object.assign(this, o); VR.Inv.vida = this.vida; // { vida, $, toggleCasco, toggleEq, hayMoto: () => bool, alCerrar }
    const $ = this.$; this.dlg = $('invDlg'); this.tab = 'todo';
    $('invClose').onclick = () => this.dlg.close(); VR.drawMochilaIcon($('btnInvCv')); $('btnInv').hidden = false; $('btnInv').onclick = () => this.abrir();
    $('invTabs').onclick = (e) => { const b = e.target.closest('button'); if (b) { this.tab = b.dataset.t; this.pinta(); } };
    this.dlg.addEventListener('close', () => { if (!this._keep) { VR.loop.paused = false; VR.input.enabled = true; } this._keep = false; });
    addEventListener('keydown', (e) => { if (e.code === 'KeyI' && !e.repeat && !/INPUT|TEXTAREA/.test(e.target.tagName) && !document.querySelector('dialog[open]') && VR.loop && !VR.loop.paused) this.abrir(); });
  }
  abrir() { if (this.dlg.open) return; VR.input.releaseAll(); VR.input.enabled = false; VR.loop.paused = true; this.pinta(); this.dlg.showModal(); }
  fichas() { const V = this.vida, s = V.s, f = [], eq = (k, ico, n, st, on, bot) => ({ k, ico, n, st, tipo: 'equipo', on, bot });
    if (s.casco) f.push(eq('casco', '🪖', 'Casco de moto', V.cascoPuesto ? 'Puesto' : 'Guardado', V.cascoPuesto, V.cascoPuesto ? 'Sacar' : 'Poner'));
    if (s.canasto) f.push(eq('canasto', '🧺', 'Canasto de chipa', s.stock + ' chipas' + (s.equipo === 'canasto' ? ' · en la mano' : ''), s.equipo === 'canasto', s.equipo === 'canasto' ? 'Guardar' : 'Llevar'));
    if (s.herr) f.push({ k: 'herr', ico: '🔧', n: 'Caja de herramientas', st: 'Para arreglar el auto', tipo: 'objeto' });
    if (this.hayMoto && this.hayMoto()) f.push({ k: 'llave', ico: '🔑', n: 'Llave de la moto de Kike', st: 'Alquilada: ' + VR.fmtGs(VR.PRECIOS.alquilerMoto) + ' por día', tipo: 'clave' });
    for (const x of VR.Inv.list()) f.push({ k: x.k, ico: x.ico, n: x.n + (x.c > 1 ? ' ×' + x.c : ''), st: x.tipo === 'comida' ? '+' + (x.h || 0) + '% de hambre' + (x.cu ? ' · +' + x.cu + ' vida' : '') : (x.desc || 'Objeto'), tipo: x.tipo, col: x.col, bot: x.tipo === 'comida' ? 'Comer' : '' });
    return f; }
  pinta() { const $ = this.$, V = this.vida, T = [['todo', '🎒', 'Todo'], ['equipo', '🧍', 'Equipo'], ['comida', '🍽', 'Comida'], ['objeto', '🎁', 'Objetos'], ['clave', '🔑', 'Clave']];
    $('invTabs').innerHTML = T.map(([k, i, n]) => '<button data-t="' + k + '" class="' + (k === this.tab ? 'on' : '') + '"><i>' + i + '</i><span>' + n + '</span></button>').join('');
    const F = this.fichas().filter((f) => this.tab === 'todo' || f.tipo === this.tab);
    $('invLista').innerHTML = F.length ? F.map((f) => '<div class="pjSlot"><i' + (f.col ? ' style="text-shadow:0 0 0 ' + f.col + ';color:' + f.col + '"' : '') + '>' + f.ico + '</i><div><b>' + f.n + '</b><em>' + f.st + '</em></div>' + (f.bot ? '<button class="cbtn" data-k="' + f.k + '">' + f.bot + '</button>' : '') + '</div>').join('')
      : '<p class="hint">' + (this.tab === 'comida' ? 'No tenés comida guardada. Lo que comprás en el súper queda acá para comer cuando quieras.' : 'No tenés nada de este tipo todavía.') + '</p>';
    $('invLista').querySelectorAll('[data-k]').forEach((b) => b.onclick = () => { const k = b.dataset.k; if (k === 'casco') this.toggleCasco(); else if (k === 'canasto') this.toggleEq(); else VR.Inv.come(k); this.pinta(); });
    const P = V.s.pieza && V.s.pieza.items ? VR.PIEZA_ITEMS.filter((i) => V.s.pieza.items[i.k]) : [];
    $('invPieza').innerHTML = P.length ? '<h4>🏠 En tu pieza</h4>' + P.map((i) => '<span class="pjChip">' + i.ico + ' ' + i.n + '</span>').join('') : '';
    $('invCnt').textContent = VR.Inv.total() + ' cosas guardadas'; }
};
