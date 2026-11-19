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
  load() { if (!this.s) this.s = (VR.store.heredar('stats'), VR.store.get('stats', null)) || {}; return this.s; },
  inc(k, n) { const s = this.load(); s[k] = (s[k] || 0) + (n || 1); if (!VR.wiped) VR.store.set('stats', s); },
  get(k) { return this.load()[k] || 0; },
  html() { const g = VR.fmtGs; return VR.STATS.map(([k, i, t]) => '<div class="row2"><span>' + i + ' ' + t + '</span><span>' + (k === 'gastado' ? g(this.get(k)) : this.get(k)) + '</span></div>').join(''); },
};
// Mensajes y agenda del celular (19/11/2026, pedido de Leandro): funciona como un teléfono de hoy. La agenda (📒) tiene los contactos que
// te van dando su número (Ña Ramona al empezar, Kike después, y así); los mensajes (💬) son charlas por contacto, con burbujas, hora y
// no leídos; los contactos te escriben con recordatorios cada tanto y vos contestás con 2 o 3 respuestas preestablecidas.
VR.CONTACTOS = { // id: [nombre, ícono, número (inventado), quién es]
  ramona: ['Ña Ramona', '🏠', '0971 330 507', 'Alquila tu pieza en Santa Lucía'],
  kike: ['Kike', '🏍', '0981 245 118', 'Amigo · te lleva en su moto'],
  chela: ['Doña Chela', '🥐', '0985 612 094', 'Chipa en la plaza'],
  lucas: ['Lucas (Marimer)', '🍦', '0982 905 661', 'Heladería Marimer'],
  mirta: ['Mirta (Ao Porã)', '🪖', '0961 480 215', 'Tienda de ropa'],
  benitez: ['Suboficial Benítez', '🚒', '0991 702 033', 'Bomberos voluntarios'],
};
VR.Buzon = {
  s: null, ctx: null, onChange: null,
  PERS: { kike: ['Kike', '🏍'], ramona: ['Ña Ramona', '🏠'], chela: ['Doña Chela', '🥐'], lucas: ['Lucas (Marimer)', '🍦'], mirta: ['Mirta (Ao Porã)', '🪖'], sis: ['Aviso', '📣'], benitez: ['Suboficial Benítez', '🚒'] },
  nombre(id) { return (this.PERS[id] || [id])[0]; },
  ico(id) { return (this.PERS[id] || [0, '💬'])[1]; },
  load() { if (!this.s) this.s = Object.assign({ msgs: [], dia: 0, ag: {}, rec: {} }, (VR.store.heredar('buzon'), VR.store.get('buzon', null)) || {}); if (!this.s.ag) this.s.ag = {}; if (!this.s.rec) this.s.rec = {}; return this.s; },
  save() { if (!VR.wiped) VR.store.set('buzon', this.s); },
  vida() { return this.ctx && this.ctx.vida; },
  // ---- agenda ----
  tiene(id) { return !!this.load().ag[id]; },
  agendar(id, saludo) { const s = this.load(); if (s.ag[id] || !VR.CONTACTOS[id]) return false; s.ag[id] = this.vida() ? this.vida().dia : 1; this.save();
    if (VR.toast) VR.toast('📒 ' + VR.CONTACTOS[id][0] + ' te pasó su número · mirá la agenda del celular'); if (saludo) this.add(id, saludo, null, null, true); return true; },
  contactos() { const s = this.load(); return Object.keys(VR.CONTACTOS).filter((k) => s.ag[k]); },
  // ---- mensajes ----
  hora() { const v = this.vida(); return v ? v.hhmm : ''; },
  add(de, txt, vida, tag, quiet, prob) { const s = this.load(), v = vida || this.vida(), p = this.PERS[de] || [de, '💬'];
    s.msgs.unshift({ de, txt, dia: v ? v.dia : 0, hora: v ? v.hhmm : '', leido: false, tag: tag || null }); if (s.msgs.length > 200) s.msgs.length = 200; this.save();
    const llama = !quiet && tag && VR.CelX && VR.CelX.entrante ? VR.CelX.entrante(de, txt, prob === undefined ? 0.55 : prob) : false; // los recordatorios a veces llegan como llamada (celextra.js)
    if (!quiet && !llama && VR.toast) VR.toast('💬 ' + p[0] + ': ' + (txt.length > 70 ? txt.slice(0, 68) + '…' : txt)); if (VR.audio && VR.audio.beep) VR.audio.beep(); if (this.onChange) this.onChange(de); },
  sinLeer() { return this.load().msgs.filter((m) => !m.leido && !m.yo).length; },
  sinLeerDe(id) { return this.load().msgs.filter((m) => !m.leido && !m.yo && m.de === id).length; },
  leerTodo() { const s = this.load(); let c = false; for (const m of s.msgs) if (!m.leido) { m.leido = true; c = true; } if (c) this.save(); },
  leerDe(id) { const s = this.load(); let c = false; for (const m of s.msgs) if (m.de === id && !m.leido) { m.leido = true; c = true; } if (c) this.save(); },
  hilo(id) { return this.load().msgs.filter((m) => m.de === id).reverse(); },
  chats() { const out = [], vistos = new Set(); for (const m of this.load().msgs) if (!vistos.has(m.de)) { vistos.add(m.de); out.push(m.de); } return out; },
  ultimo(id) { return this.load().msgs.find((m) => m.de === id) || null; },
  // ---- respuestas preestablecidas ----
  // cada respuesta: { t: texto tuyo, r: respuesta del contacto (texto o función), a: acción, tag: siguiente pregunta }
  opciones(id) { const l = this.hiloPend(id); if (l && this.RESP[l.tag]) return this.RESP[l.tag](this).slice(0, 3); const f = this.INICIO[id]; return f ? f(this).slice(0, 3) : [{ t: 'Gracias 👍', r: null }]; },
  hiloPend(id) { const m = this.ultimo(id); return m && !m.yo && m.tag ? m : null; },
  responder(id, k) { const ops = this.opciones(id), o = ops[k]; if (!o) return null; const s = this.load(), v = this.vida(), pend = this.hiloPend(id); if (pend) pend.tag = null;
    s.msgs.unshift({ de: id, yo: true, txt: o.t, dia: v ? v.dia : 0, hora: v ? v.hhmm : '', leido: true }); this.save(); if (this.onChange) this.onChange(id);
    const r = typeof o.r === 'function' ? o.r(this) : o.r; if (r) setTimeout(() => this.add(id, r, null, o.tag || null, true), 1100 + Math.random() * 900);
    return o.a || null; },
  CIERRA: ['kikeViaje', 'kikeSube'], // estas acciones cierran el celular (las demás se hacen con el celular abierto)
  hacer(a) { const c = this.ctx; if (!c || !c[a]) return; c[a](); },
  // recordatorios de los contactos (se llaman al cambiar el día)
  recordatorios(M) { const s = this.load(), v = this.vida(); if (!v) return; const dia = v.dia, ok = (id, cada) => this.tiene(id) && dia - (s.rec[id] || -99) >= cada, marca = (id) => { s.rec[id] = dia; this.save(); };
    if (ok('ramona', 2)) { const p = v.s.pieza, dias = Math.ceil((p.vence - v.s.min) / 1440); if (p.saldo > 0 && dias <= 3 && dias >= 0) { marca('ramona'); this.add('ramona', dias <= 0 ? 'Mitã, hoy vence la pieza. ¿Tenés para el alquiler?' : 'Mitã, en ' + dias + ' día' + (dias > 1 ? 's' : '') + ' vence la pieza (' + VR.fmtGs(p.saldo) + '). ¿Vas a tener, ajépa?', v, 'ramonaPaga'); } }
    if (ok('kike', 3) && Math.random() < 0.6) { marca('kike'); this.add('kike', ['Estoy en la plaza tomando tereré. Si necesitás que te lleve, avisame, che ra\'a.', 'Ey, ¿todo bien? Acá estoy en la plaza. Si estás lejos te paso a buscar.'][(Math.random() * 2) | 0], v, 'kikeOferta'); }
    if (ok('chela', 3) && v.s.fiado > 0) { marca('chela'); this.add('chela', '¿Y mi platita, che memby? Me debés ' + VR.fmtGs(v.s.fiado) + ' de la chipa.', v, 'chelaDebe'); }
    if (ok('chela', 4) && v.s.canasto && v.s.stock <= 2 && !(v.s.fiado > 0)) { marca('chela'); this.add('chela', 'Che memby, hoy salió buena la chipa. Si querés reponer el canasto, vení temprano.', v, 'chelaOferta'); }
    // llamadas con motivo (v2.01): Doña Chela con pedido grande para el finde, el Suboficial Benítez cuando falta gente de guardia
    if (ok('chela', 5) && v.s.canasto && v.s.stock <= 10 && (dia - 1) % 7 >= 3 && (dia - 1) % 7 <= 5 && !(v.s.fiado > 60000)) { marca('chela'); this.add('chela', 'Che memby, me pidieron un montón de chipa para el finde. Si me ayudás a repartir te dejo 10 chipas más en el canasto, anotadas. ¿Querés?', v, 'chelaPedido', false, 0.85); }
    if (ok('benitez', 4) && M.hecha && M.hecha('m3') && VR.guardia && !VR.guardia.hechoHoy() && !VR.guardia.job) { marca('benitez'); this.add('benitez', 'Suboficial Benítez. Hoy falta gente en el cuartel de bomberos, ¿podés venir de guardia?', v, 'benitezGuardia', false, 0.85); } },
  RESP: {
    ramonaPaga: () => [{ t: 'Sí, el sábado le pago', r: 'Bueno, mitã. Ani nde resarái.' }, { t: 'Estoy juntando, deme unos días', r: 'Unos días nomás, ¿eh? No puedo esperar mucho.' }, { t: 'Perdón, estoy en apuros', r: 'Hablemos cuando pases por acá, ¿ajépa?' }],
    kikeOferta: (B) => [{ t: '¡Dale, buscame!', r: (b) => b.kikeRespViaje(), a: 'kikeViaje' }, { t: 'Gracias, ahora no', r: 'Dale, cualquier cosa avisá.' }],
    chelaDebe: () => [{ t: 'Mañana le pago, Doña', r: 'Bueno, ¿ajépa? Ani rejapo tavy.' }, { t: 'Ya le llevo a la plaza', r: 'Aguyje, te espero acá.' }],
    chelaOferta: () => [{ t: 'Paso mañana temprano', r: 'Te dejo lo mejor, che memby.' }, { t: 'Ahora no tengo plata', r: 'Cuando puedas, po.' }],
    kikeLlego: () => [{ t: '¡Ya salgo!', r: '¡Dale, subí! Agarrate fuerte, po.', a: 'kikeSube' }, { t: 'Esperá un ratito', r: 'Dale, avisame cuando estés listo.' }],
    chelaPedido: () => [{ t: '¡Dale, Doña!', r: 'Aguyje, che memby. Te cargué las chipas en el canasto (anotadas, ¿ajépa?). Vendé tranquilo.', a: 'chelaCarga' }, { t: 'Hoy no puedo', r: 'Otra vez será, po.' }],
    benitezGuardia: () => [{ t: 'Voy para el cuartel', r: 'Aguyje. Presentate y te asigno el turno. Te marqué el GPS.', a: 'guardiaGps' }, { t: 'Hoy no puedo', r: 'Entendido. Avisame cuando puedas.' }],
  },
  INICIO: {
    kike: (B) => { const o = [{ t: '¿Me venís a buscar?', r: (b) => b.kikeRespViaje(), a: 'kikeViaje' }, { t: '¿Cómo andás?', r: 'Bien, acá en la plaza con el tereré. ¿Y vos?' }]; return o; },
    ramona: (B) => [{ t: '¿Cuánto debo de la pieza?', r: (b) => { const v = b.vida(); return v ? 'Tenés ' + VR.fmtGs(v.s.pieza.saldo > 0 ? v.s.pieza.saldo : 0) + ' pendientes. Vence el sábado, mitã.' : 'Pasá y hablamos.'; } }, { t: 'Le pago el sábado', r: 'Bueno, mitã.' }],
    chela: () => [{ t: '¿Tiene chipa para mañana?', r: 'Siempre, vení temprano que se acaba.' }, { t: 'Gracias, Doña', r: 'Mba\'éichapa, che memby.' }],
    lucas: () => [{ t: '¿Hay trabajo hoy?', r: 'Cuando haya pedidos te aviso.' }, { t: 'Gracias, Lucas', r: 'Ndaipóri problema.' }],
    mirta: () => [{ t: '¿Qué ropa nueva llegó?', r: 'Pasá por la tienda y te muestro.' }, { t: 'Gracias, Mirta', r: 'Cuando quieras.' }],
    benitez: () => [{ t: '¿Hay guardia hoy?', r: 'Presentate en el cuartel y te asigno.' }, { t: 'Entendido, Suboficial', r: 'Aguyje.' }],
  },
  kikeRespViaje() { const c = this.ctx, v = this.vida(), rt = c && c.kikeRuta ? c.kikeRuta() : null; if (!rt) return 'Ahora no puedo, che ra\'a.'; const n = v ? (v.s.kikeViajes || 0) : 0;
    return (rt.aCasa ? '¡Dale, te llevo a tu pieza! ' : '¡Dale, voy a buscarte y te llevo a la plaza! ') + (n < 3 ? 'Este viaje va de regalo (' + (n + 1) + '/3).' : 'Son ' + VR.fmtGs(5000) + ', por ser vos.') + ' Esperame un toque.'; },
};
