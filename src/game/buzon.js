// Estadísticas del jugador (contadores de lo que hacés) y buzón de mensajes de los NPC (Historia).
// Todo se guarda con VR.store, así que viaja con la partida (exportar/importar y nube).
VR.STATS = [ // [clave, ícono, texto]
  ['atropellado', '💥', 'Veces que te atropellaron'], ['peatones', '🚗', 'Peatones que atropellaste'], ['hospital', '🏥', 'Viajes al hospital'],
  ['comisaria', '🚔', 'Veces que te agarró la Policía'], ['desmayos', '😵', 'Desmayos de hambre'], ['multas', '🧾', 'Multas'],
  ['taxis', '🚕', 'Viajes en taxi'], ['mbohasa', '🛵', 'Viajes en Mbohasa'], ['misiones', '📌', 'Misiones cumplidas'],
  ['gastado', '💸', 'Plata gastada (Gs.)'], ['dias', '📅', 'Días vividos'],
];
VR.Stats = {
  s: null,
  load() { if (!this.s) this.s = VR.store.get('stats', null) || {}; return this.s; },
  inc(k, n) { const s = this.load(); s[k] = (s[k] || 0) + (n || 1); if (!VR.wiped) VR.store.set('stats', s); },
  get(k) { return this.load()[k] || 0; },
  html() { const g = VR.fmtGs; return VR.STATS.map(([k, i, t]) => '<div class="row2"><span>' + i + ' ' + t + '</span><span>' + (k === 'gastado' ? g(this.get(k)) : this.get(k)) + '</span></div>').join(''); },
};
VR.Buzon = {
  s: null,
  PERS: { kike: ['Kike', '🏍'], mirta: ['Mirta (Ao Porã)', '🪖'], sis: ['Aviso', '📣'], benitez: ['Suboficial Benítez', '🚒'] },
  load() { if (!this.s) this.s = Object.assign({ msgs: [], dia: 0 }, VR.store.get('buzon', null) || {}); return this.s; },
  save() { if (!VR.wiped) VR.store.set('buzon', this.s); },
  add(de, txt, vida) { const s = this.load(), p = this.PERS[de] || [de, '💬'];
    s.msgs.unshift({ de, txt, dia: vida ? vida.dia : 0, hora: vida ? vida.hhmm : '', leido: false }); if (s.msgs.length > 60) s.msgs.length = 60; this.save();
    if (VR.toast) VR.toast('💬 ' + p[0] + ': ' + (txt.length > 70 ? txt.slice(0, 68) + '…' : txt)); if (VR.audio && VR.audio.beep) VR.audio.beep(); },
  sinLeer() { return this.load().msgs.filter((m) => !m.leido).length; },
  leerTodo() { const s = this.load(); let c = false; for (const m of s.msgs) if (!m.leido) { m.leido = true; c = true; } if (c) this.save(); },
  html() { const s = this.load(); if (!s.msgs.length) return '<p>No tenés mensajes todavía.</p>';
    return s.msgs.map((m) => { const p = this.PERS[m.de] || [m.de, '💬']; return '<div class="row2" style="display:block;' + (m.leido ? '' : 'border-left:3px solid #ff5fa2;padding-left:6px') + '"><b>' + p[1] + ' ' + p[0] + '</b> <small>· día ' + m.dia + ' ' + m.hora + '</small><br>' + m.txt.replace(/</g, '&lt;') + '</div>'; }).join(''); },
};
