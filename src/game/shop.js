// Tienda de ropa y peluquería "Ao Porã" (05/11/2026), en la esquina sudoeste de la Plaza de los Héroes.
// Probador con el avatar 2 a 64×128 (k = 4) y cómo se ve en la calle (16×32), catálogo y precios de VR.AV2_CAT,
// plata en guaraníes y ropero: lo que comprás queda tuyo (prenda + color principal) y te lo ponés gratis después.
'use strict';
(function (VR) {
  const CAT = VR.AV2_CAT;
  const gs = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' Gs.';
  VR.fmtGs = gs;

  // ---------- plata ----------
  // En Historia (J1): se empieza con 35.000 Gs.; de cada cobro se descuenta el 50 % hasta saldar la deuda, y los
  // movimientos quedan anotados (VR.Vida.mov) para la Billetera. "why" es el motivo que se ve ahí.
  VR.Wallet = {
    get() { return VR.store.get('plata', VR.modo === 'historia' ? 35000 : 1500000); },
    set(n) { VR.store.set('plata', Math.max(0, Math.round(n))); if (this.onChange) this.onChange(); },
    add(n, why) {
      if (VR.modo === 'historia' && VR.vida) { VR.vida.mueve(n, why); return; }
      this.set(this.get() + n);
    },
  };

  // ---------- look por clave: el del equipo, el genérico o el propio ----------
  VR.av2LookOf = (key) => {
    if (key === 'propio') { const L = VR.store.get('look:propio', null); if (L) return Object.assign({}, VR.AV2_DEFAULT, L); key = 'generico'; }
    const t = VR.AV2_TEAM[key] || VR.AV2_TEAM.generico;
    return Object.assign({}, VR.AV2_DEFAULT, t[1]);
  };

  // ---------- qué se compra (y qué es tuyo) ----------
  const COLORED = { top: 'topColor', bottom: 'bottomColor', shoes: 'shoesColor', hat: 'hatColor' };
  const fixedShoe = (k) => k === 'zapatos' || k === 'botines';
  const itemKey = (slot, L) => {
    if (slot === 'shoes' && fixedShoe(L.shoes)) return 'shoes:' + L.shoes;
    if (slot === 'hat' && L.hat === 'ninguno') return null;
    if (slot === 'mochila') return L.mochila ? 'mochila:' + L.packColor : null;
    if (CAT.extra[slot]) return L[slot] ? slot : null;
    return slot + ':' + L[slot] + ':' + L[COLORED[slot]];
  };
  const itemPrice = (slot, L) => slot in CAT.extra ? CAT.extra[slot][1] : CAT[slot][L[slot]][1];
  const SLOTS = ['top', 'bottom', 'shoes', 'hat', ...Object.keys(CAT.extra)];
  const Closet = {
    load() { return new Set(VR.store.get('ropa:mia', [])); },
    save(s) { VR.store.set('ropa:mia', [...s]); },
    // lo que llevás puesto también es tuyo
    addLook(s, L) { for (const sl of SLOTS) { const k = itemKey(sl, L); if (k) s.add(k); } },
  };
  // peluquería: se paga el servicio cada vez
  const TINTE = 30000, BARBA = 10000;
  function bill(base, trial, owned) {
    const lines = [];
    for (const sl of SLOTS) {
      const k = itemKey(sl, trial);
      if (k && !owned.has(k)) lines.push([shopName(sl, trial), itemPrice(sl, trial)]);
    }
    if (trial.hair !== base.hair) lines.push(['Corte: ' + CAT.hair[trial.hair][0], Math.max(15000, CAT.hair[trial.hair][1])]);
    if (trial.hairColor !== base.hairColor && trial.hair !== 'pelado') lines.push(['Tintura', TINTE]);
    if (trial.beard !== base.beard) lines.push(['Barba: ' + CAT.beard[trial.beard][0], BARBA]);
    return lines;
  }
  const shopName = (sl, L) => sl in CAT.extra ? CAT.extra[sl][0] : CAT[sl][L[sl]][0];

  // ---------- pestañas ----------
  // crop: parte del cuerpo que se muestra en la tarjeta (en la grilla de 16×32)
  const TABS = [
    { id: 'top', name: 'Arriba', ico: '👕', crop: [1, 5, 14, 13] },
    { id: 'bottom', name: 'Abajo', ico: '👖', crop: [2, 14, 12, 18] },
    { id: 'shoes', name: 'Calzado', ico: '👟', crop: [2, 24, 12, 8] },
    { id: 'hat', name: 'Gorras', ico: '🧢', crop: [3, 0, 10, 9] },
    { id: 'extra', name: 'Accesorios', ico: '🕶', crop: [0, 0, 16, 32] },
    { id: 'hair', name: 'Peluquería', ico: '💇', crop: [2, 0, 12, 12] },
  ];
  const SECOND = new Set(['camiseta', 'polo', 'campera', 'puffer', 'hoodieAbierto']); // prendas con un segundo color

  VR.Shop = class {
    constructor(opts) {
      this.o = opts; this.el = document.getElementById('shop'); this.tab = 'top'; this.dir = 'down'; this.anim = 'walk';
      this.cache = new Map(); this.raf = 0;
      const $ = (s) => this.el.querySelector(s);
      this.$ = $;
      $('#shopTabs').innerHTML = TABS.map((t) => `<button data-t="${t.id}"><span>${t.ico}</span>${t.name}</button>`).join('');
      $('#shopTabs').onclick = (e) => { const b = e.target.closest('button'); if (b) { this.tab = b.dataset.t; this.paint(); } };
      $('#shopRot').onclick = () => { this.dir = { down: 'left', left: 'up', up: 'right', right: 'down' }[this.dir]; };
      $('#shopAnim').onclick = (e) => { const b = e.target.closest('button'); if (b) { this.anim = b.dataset.a; this.paintAnim(); } };
      $('#shopUndo').onclick = () => { this.trial = Object.assign({}, this.base); this.paint(); };
      $('#shopBuy').onclick = () => this.buy();
      $('#shopClose').onclick = () => this.el.close();
      this.el.addEventListener('close', () => { cancelAnimationFrame(this.raf); this.raf = 0; if (this.o.onClose) this.o.onClose(); });
    }
    open(look) {
      this.base = Object.assign({}, VR.AV2_DEFAULT, look);
      this.trial = Object.assign({}, this.base);
      this.owned = Closet.load(); Closet.addLook(this.owned, this.base); Closet.save(this.owned);
      this.el.showModal(); this.paint(); this.paintAnim();
      const tick = (t) => { this.drawPreview(t); this.raf = requestAnimationFrame(tick); };
      this.raf = requestAnimationFrame(tick);
    }
    // ---------- dibujo ----------
    img(L, dir, anim, i, n, k) {
      const key = JSON.stringify(L) + dir + anim + i + k;
      let c = this.cache.get(key);
      if (!c) { c = VR.av2Render(L, dir, anim, i / n, k); this.cache.set(key, c); if (this.cache.size > 900) this.cache.delete(this.cache.keys().next().value); }
      return c;
    }
    drawPreview(t) {
      const big = this.$('#shopPrev'), g = big.getContext('2d'), sm = this.$('#shopSmall'), gs2 = sm.getContext('2d');
      const n = this.anim === 'idle' ? 1 : 8, i = Math.floor(t / (this.anim === 'run' ? 70 : 110)) % n;
      g.clearRect(0, 0, big.width, big.height); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(32, 125, 14, 3, 0, 0, 7); g.fill(); g.drawImage(this.img(this.trial, this.dir, this.anim, i, n, 4), 0, 0);
      gs2.clearRect(0, 0, sm.width, sm.height);
      gs2.fillStyle = '#b8b2a4'; gs2.fillRect(0, 0, sm.width, sm.height); gs2.fillStyle = '#a8a294'; for (let y = 0; y < sm.height; y += 8) for (let x = (y >> 3) & 1 ? 0 : 8; x < sm.width; x += 16) gs2.fillRect(x, y, 8, 8);
      gs2.fillStyle = 'rgba(0,0,0,.3)'; gs2.beginPath(); gs2.ellipse(20, 37, 6, 2.5, 0, 0, 7); gs2.fill();
      gs2.drawImage(this.img(this.trial, this.dir, this.anim, i, n, 1), 12, 7);
    }
    thumb(L, crop) {
      const [x, y, w, h] = crop, k = 3, src = this.img(L, 'down', 'idle', 0, 1, k);
      const c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
      c.getContext('2d').drawImage(src, x * k, y * k, w * k, h * k, 0, 0, w * k, h * k);
      return c;
    }
    paintAnim() { this.$('#shopAnim').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.a === this.anim)); }
    paint() {
      const T = this.trial, $ = this.$, tab = TABS.find((t) => t.id === this.tab);
      $('#shopTabs').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === this.tab));
      $('#shopPlata').textContent = gs(VR.Wallet.get());
      const grid = $('#shopGrid'); grid.innerHTML = '';
      const card = (L, label, price, on, onClick, crop) => {
        const b = document.createElement('button'); b.className = 'card' + (on ? ' on' : '');
        b.appendChild(this.thumb(L, crop || tab.crop));
        const p = document.createElement('div'); p.innerHTML = `<b>${label}</b><small>${price}</small>`; b.appendChild(p);
        b.onclick = onClick; grid.appendChild(b);
      };
      const priceTxt = (sl, L) => { const k = itemKey(sl, L); return !k ? 'gratis' : this.owned.has(k) ? '✓ tuyo' : gs(itemPrice(sl, L)); };
      if (tab.id === 'top' || tab.id === 'bottom' || tab.id === 'shoes' || tab.id === 'hat') {
        for (const key of Object.keys(CAT[tab.id])) {
          if (key === 'casco') continue; // el casco es de los bomberos
          const L = Object.assign({}, T, { [tab.id]: key });
          if (tab.id === 'bottom' && (key === 'jean') !== (T.bottom === 'jean')) L.bottomColor = 0;
          card(L, CAT[tab.id][key][0], priceTxt(tab.id, L), T[tab.id] === key, () => { Object.assign(T, { [tab.id]: key, bottomColor: L.bottomColor }); this.paint(); }, tab.id === 'hat' ? [3, 0, 10, 9] : null);
        }
      } else if (tab.id === 'extra') {
        for (const key of Object.keys(CAT.extra)) {
          const L = Object.assign({}, T, { [key]: true });
          if (key === 'lentes') L.anteojos = false; if (key === 'anteojos') L.lentes = false;
          const crop = { lentes: [3, 0, 10, 8], anteojos: [3, 0, 10, 8], cadenita: [3, 2, 10, 10], reloj: [0, 9, 16, 9], termo: [0, 9, 16, 10], mochila: [0, 4, 16, 14] }[key];
          const L2 = key === 'mochila' ? Object.assign({}, L) : L;
          card(L2, CAT.extra[key][0], T[key] ? (this.owned.has(itemKey(key, T)) ? '✓ puesto' : 'probándote · ' + gs(CAT.extra[key][1])) : (this.owned.has(itemKey(key, L)) ? '✓ tuyo' : gs(CAT.extra[key][1])), !!T[key],
            () => { T[key] = !T[key]; if (T[key] && key === 'lentes') T.anteojos = false; if (T[key] && key === 'anteojos') T.lentes = false; this.paint(); },
            key === 'mochila' ? null : crop);
          if (key === 'mochila') { // la mochila se ve de espaldas
            const c = grid.lastChild.querySelector('canvas'), src = this.img(L, 'up', 'idle', 0, 1, 3); c.width = 48; c.height = 42; c.getContext('2d').drawImage(src, 0, 18, 48, 42, 0, 0, 48, 42);
          }
        }
      } else if (tab.id === 'hair') {
        for (const key of Object.keys(CAT.hair)) {
          const L = Object.assign({}, T, { hair: key, hat: 'ninguno' });
          card(L, CAT.hair[key][0], key === this.base.hair ? 'el tuyo' : gs(Math.max(15000, CAT.hair[key][1])), T.hair === key, () => { T.hair = key; this.paint(); });
        }
        if (T.gender === 'm') for (const key of Object.keys(CAT.beard)) {
          const L = Object.assign({}, T, { beard: key, hat: 'ninguno' });
          card(L, CAT.beard[key][0], key === this.base.beard ? 'la tuya' : gs(BARBA), T.beard === key, () => { T.beard = key; this.paint(); }, [3, 1, 10, 9]);
        }
      }
      // colores
      const cols = $('#shopColors'); cols.innerHTML = '';
      const swatches = (title, field, pal, extra) => {
        const row = document.createElement('div'); row.className = 'swrow';
        row.innerHTML = `<span>${title}</span>`;
        pal.forEach((c, i) => { const s = document.createElement('button'); s.className = 'sw' + (T[field] === i ? ' on' : ''); s.style.background = c; s.title = title + ' ' + (i + 1); s.onclick = () => { T[field] = i; if (extra) extra(); this.paint(); }; row.appendChild(s); });
        cols.appendChild(row);
      };
      if (tab.id === 'top') { swatches('Color', 'topColor', CAT.cloth); if (SECOND.has(T.top) || T.print) swatches(T.top === 'camiseta' ? 'Rayas' : T.print ? 'Estampa' : 'Adentro', 'topColor2', CAT.cloth); }
      if (tab.id === 'top' && (T.top === 'remera' || T.top === 'musculosa')) { const b = document.createElement('label'); b.className = 'chk'; b.innerHTML = '<input type="checkbox"> Con estampa (gratis)'; b.firstChild.checked = !!T.print; b.firstChild.onchange = (e) => { T.print = e.target.checked; this.paint(); }; cols.appendChild(b); }
      if (tab.id === 'bottom') swatches('Color', 'bottomColor', T.bottom === 'jean' ? CAT.denim : CAT.cloth);
      if (tab.id === 'shoes' && !fixedShoe(T.shoes)) swatches('Color', 'shoesColor', CAT.cloth);
      if (tab.id === 'hat' && T.hat !== 'ninguno' && T.hat !== 'piri') swatches('Color', 'hatColor', CAT.cloth);
      if (tab.id === 'extra' && T.mochila) swatches('Mochila', 'packColor', CAT.cloth);
      if (tab.id === 'hair' && T.hair !== 'pelado') swatches('Tintura', 'hairColor', CAT.hairColor);
      // cuenta
      const lines = bill(this.base, T, this.owned), tot = lines.reduce((a, l) => a + l[1], 0), plata = VR.Wallet.get();
      $('#shopBill').innerHTML = lines.length ? lines.map((l) => `<span>${l[0]} <b>${gs(l[1])}</b></span>`).join('') : '<span class="muted">Tocá una prenda para probártela. Lo que ya es tuyo te lo ponés gratis.</span>';
      $('#shopTotal').textContent = tot ? 'Total ' + gs(tot) : '';
      const btn = $('#shopBuy'), same = JSON.stringify(T) === JSON.stringify(this.base);
      btn.disabled = same || tot > plata;
      btn.textContent = same ? 'Ya lo tenés puesto' : tot > plata ? 'No te alcanza (' + gs(plata) + ')' : tot ? 'Pagar ' + gs(tot) + ' y ponérmelo' : 'Ponérmelo (gratis)';
      $('#shopUndo').disabled = same;
    }
    buy() {
      const T = this.trial, lines = bill(this.base, T, this.owned), tot = lines.reduce((a, l) => a + l[1], 0);
      if (this.ropero && tot > 0) { alert('Desde el celular solo te cambiás con lo que ya tenés. Para comprar, andá a Ao Porã.'); return; }
      if (VR.vida) { if (tot > 0 && !VR.vida.pagaBanco(tot, 'Ao Porã')) return; } // en Historia, Ao Porã cobra con la billetera electrónica
      else { if (tot > VR.Wallet.get()) return; VR.Wallet.add(-tot, 'Ao Porã'); }
      Closet.addLook(this.owned, T); Closet.save(this.owned);
      VR.store.set('look:propio', T);
      this.base = Object.assign({}, T);
      if (this.o.onBuy) this.o.onBuy(T, tot);
      this.paint();
    }
  };
})(typeof VR !== 'undefined' ? VR : (window.VR = window.VR || {}));
