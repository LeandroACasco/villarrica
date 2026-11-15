// Guardia en el cuartel (J5, después de M3): changa diaria de los bomberos voluntarios. Un turno = 3 avisos por radio con códigos 10 en orden
// al azar: incendio de pastizal (10-70, camión bomba y cañón), herido con camilla (10-50/10-52, ambulancia al hospital) y gato en un árbol
// (camión, frená al lado). Vehículos prestados (sin estrellas). Se cobra al volver al cuartel: lo ganado menos los golpes. Un turno por día.
'use strict';
VR.Guardia = class {
  // o: { world, peds, changas, mis, vida, setDest, toast, getCar, player, cars }
  constructor(o) { Object.assign(this, o); this.job = null; this.rnd = Math.random; }
  static get VALOR() { return { fuego: 36000, herido: 34000, gato: 10000 }; }
  hechoHoy() { const k = VR.store.get('guardia', null); return !!(k && k.dia === this.vida.dia); }
  abierta() { return this.mis.hecha('m3'); }
  cuartel() { return this.mis.lug.get('cuartel'); }
  start() {
    const M = this.mis, car = this.getCar(), f = car || this.player, cu = this.cuartel();
    if (!this.abierta()) { this.toast('🔒 La guardia se abre al terminar «Tata!» con Benítez'); return; }
    if (this.job) { this.toast('🚒 Ya estás de guardia'); return; }
    if (M.s.act || (this.changas.job)) { this.toast('Terminá primero la misión o changa en curso'); return; }
    if (this.hechoHoy()) { this.toast('🚒 Hoy ya hiciste tu turno de guardia. Volvé mañana'); return; }
    if (!cu || Math.hypot(f.x - cu.x, f.y - cu.y) > 450) { this.toast('🚒 Presentate en el cuartel de bomberos (Plaza Pettirossi) para empezar la guardia'); return; }
    const o = ['fuego', 'herido', 'gato']; for (let i = 2; i > 0; i--) { const j = (this.rnd() * (i + 1)) | 0; [o[i], o[j]] = [o[j], o[i]]; }
    this.job = { fase: 'espera', t: 0, orden: o, i: 0, av: null, gan: 0, dmg: 0, res: [], prest: [], was: false, prev: 0, dk: '' };
    this.mis.cartel('🚒 GUARDIA', 'Turno de bomberos · esperá la radio');
    this.toast('🚒 Guardia en el cuartel: esperá el aviso por radio (3 avisos)');
  }
  abort(msg) { if (!this.job) return; this.limpia(); if (msg) this.toast(msg); }
  limpia() {
    const J = this.job; if (!J) return;
    for (const c of J.prest) { c.mio = false; c.prestada = false; }
    if (VR.pastizal) VR.pastizal.limpiar(); this.job = null; this.setDest(null); this.changas.hud.hidden = true;
  }
  presta(model) {
    let c = this.cars.find((x) => x.firehouse && x.model === model && !x.wreck);
    if (!c) { const cu = this.cuartel(), p = this.mis.lug.libre(cu.x, cu.y + 60); c = new VR.Car(this.world, p.x, p.y, Math.PI, 0, 'car', model); c.firehouse = true; this.cars.push(c); this.world.addBox(c); }
    c.mio = true; c.prestada = true; if (!this.job.prest.includes(c)) this.job.prest.push(c); return c;
  }
  spot(a, b) { const cu = this.cuartel(); return this.changas.spot(a, b, cu) || { x: cu.x + 320, y: cu.y + 40, name: 'el barrio' }; }
  llamar() {
    const J = this.job, tipo = J.orden[J.i], cu = this.cuartel(), pz = VR.pastizal; let A, msg, sub;
    if (tipo === 'fuego') { pz.limpiar(); pz.empezar(); const c = pz.centro(); A = { tipo, x: c.x, y: c.y, name: 'el parque Ykua Pytã', veh: 'bomba', est: 'ir' }; msg = '10-70: incendio de pastizal en el parque Ykua Pytã. ¡Salga el camión!'; sub = '10-70 · Pastizal en el parque'; }
    else if (tipo === 'herido') { const s = this.spot(500, 1500); A = { tipo, x: s.x, y: s.y, name: s.name, veh: 'ambulancia', est: 'ir', pal: (this.rnd() * 32) | 0, salud: 100, prog: 0 }; msg = '10-50 sobre ' + s.name + ': persona herida. 10-52, ¡salga la ambulancia!'; sub = '10-50 · Herido en ' + s.name; }
    else { const s = this.spot(400, 1300); A = { tipo, x: s.x, y: s.y, name: s.name, veh: 'bomba', est: 'ir', prog: 0 }; msg = 'Asistencia en ' + s.name + ': una señora pide ayuda, el gato no baja del árbol.'; sub = 'Asistencia · Gato en el árbol'; }
    J.av = A; J.fase = 'aviso'; J.t = 0; J.dk = ''; this.presta(A.veh);
    this.mis.cartel('📻 ' + A.veh.toUpperCase().replace('AMBULANCIA', 'AMBULANCIA').replace('BOMBA', 'CAMIÓN'), sub);
    this.toast('📻 Central a Unidad 2: ' + msg + ' (10-76 en camino)');
  }
  cierra(ok, txt) {
    const J = this.job, A = J.av, V = Math.round(VR.Guardia.VALOR[A.tipo] * (ok ? (A.tipo === 'herido' ? Math.max(0.5, A.salud / 100) : 1) : 0));
    J.gan += V; J.res.push(V); J.av = null; J.i++; J.fase = J.i >= 3 ? 'fin' : 'espera'; J.t = 0; J.dk = ''; this.setDest(null);
    if (VR.pastizal && A.tipo === 'fuego' && !ok) VR.pastizal.limpiar();
    this.toast((ok ? '✅ ' : '❌ ') + txt + (ok ? ' · +' + VR.fmtGs(V) + ' (se cobra al volver al cuartel)' : ''));
    if (J.i < 3 && ok) this.toast('📻 10-8: Unidad disponible. Esperá el próximo aviso');
  }
  dest(x, y, name) { const k = (x | 0) + ',' + (y | 0); if (this.job.dk === k) return; this.job.dk = k; this.setDest({ x, y, name }); }
  update(dt) {
    const J = this.job; if (!J) return; if (this.mis.s.act) { this.abort('Se cortó la guardia: empezó una misión'); return; }
    const car = this.getCar(), f = car || this.player, cu = this.cuartel(), pz = VR.pastizal, A = J.av; J.t += dt; let hud = '';
    const slow = (c, n) => !c || Math.abs(c.v) < n;
    if (J.fase === 'espera') { if (J.t > (J.i ? 7 : 8)) this.llamar(); hud = '🚒 Guardia · esperando la radio · aviso ' + (J.i + 1) + '/3 · ya sumás ' + VR.fmtGs(J.gan); }
    else if (J.fase === 'aviso' && A) {
      const nom = A.veh === 'bomba' ? 'el camión bomba' : 'la ambulancia', v = this.presta(A.veh), en = !!(car && car.model === A.veh);
      if (!en) { J.was = false; this.dest(v.x, v.y, nom); hud = '🚒 Subite a ' + nom + (Math.hypot(f.x - v.x, f.y - v.y) < 80 ? ' (acercate y entrá)' : ' · seguí el GPS'); }
      else {
        if (J.was) J.dmg += Math.max(0, J.prev - (car.hp ?? 100)); J.was = true; J.prev = car.hp ?? 100;
        const d = Math.hypot(car.x - A.x, car.y - A.y);
        if (A.tipo === 'fuego') {
          this.dest(A.x, A.y, 'Incendio en el parque');
          if (A.est === 'ir') { hud = '🔥 10-70 · Andá al parque (sirena: tocá ACCIÓN)'; if (d < 260) { A.est = 'apagar'; this.toast('🔥 ¡Mantené ACCIÓN para el cañón de agua!'); } }
          if (A.est === 'apagar') {
            hud = '🔥 ¡Apagá el fuego! Mantené ACCIÓN · focos: ' + pz.ardiendo + ' · no lo dejes extenderse';
            if (pz.enGlorieta()) this.cierra(false, 'El fuego llegó a la glorieta'); else if (pz.quemadas > pz.limite) this.cierra(false, 'Se quemó medio parque'); else if (pz.ardiendo === 0) this.cierra(true, '¡Apagaste el incendio!');
          }
        } else if (A.tipo === 'gato') {
          this.dest(A.x, A.y, 'Gato en el árbol'); hud = '🐈 Asistencia · llegá y frená al lado del árbol';
          if (d < 60 && slow(car, 20)) { A.prog += dt / 3; hud = '🐈 Subiendo la escalera... ' + Math.min(100, Math.round(A.prog * 100)) + '%'; if (A.prog >= 1) this.cierra(true, '¡El gato bajó! La señora te agradece'); } else A.prog = Math.max(0, A.prog - dt * 0.5);
        } else if (A.est === 'ir') {
          this.dest(A.x, A.y, 'Herido'); hud = '🚑 10-50 · Llegá al herido y frená al lado';
          if (d < 60 && slow(car, 20)) { A.prog += dt / 3.5; hud = '🛏 Cargando la camilla... ' + Math.min(100, Math.round(A.prog * 100)) + '%'; if (A.prog >= 1) { A.est = 'llevar'; A.prev = car.hp ?? 100; this.toast('🛏 Herido a bordo. 10-76 al Hospital Regional: manejá suave'); } } else A.prog = Math.max(0, A.prog - dt * 0.5);
        } else {
          const h = this.mis.lug.get('hospital'); A.salud -= dt * 0.9 + Math.max(0, A.prev - (car.hp ?? 100)) * 3; A.prev = car.hp ?? 100; if (h) this.dest(h.x, h.y, 'Hospital Regional');
          hud = '🚑 Llevalo al Hospital Regional · estado del herido ' + Math.max(0, Math.round(A.salud)) + '%';
          if (A.salud <= 0) this.cierra(false, 'El herido no llegó a tiempo');
          else if (h && Math.hypot(car.x - h.x, car.y - h.y) < 70 && slow(car, 25)) this.cierra(true, 'Entregaste al herido en el hospital (' + Math.round(A.salud) + '% de estado)');
        }
      }
    } else if (J.fase === 'fin') {
      this.dest(cu.x, cu.y, 'Cuartel de bomberos'); hud = '🚒 10-8: volvé al cuartel y entregá el vehículo · acumulado ' + VR.fmtGs(J.gan);
      if (Math.hypot(f.x - cu.x, f.y - cu.y) < 90 && slow(car, 45) && (!car || car.prestada)) this.termina();
    }
    if (this.job && (this.hT = (this.hT || 0) - dt) < 0) { this.hT = 0.2; this.changas.hud.hidden = false; this.changas.hud.textContent = hud; }
  }
  termina() {
    const J = this.job, V = this.vida, pen = Math.min(Math.round(J.gan * 0.4), Math.round(J.dmg) * 1500), pago = Math.max(0, J.gan - pen);
    if (pago > 0) V.mueve(pago, 'Guardia en el cuartel (Benítez)');
    VR.store.set('guardia', { dia: V.dia });
    const ok = J.res.filter((x) => x > 0).length;
    if (VR.Buzon) VR.Buzon.add('benitez', ok === 3 ? 'Muy bien la guardia de hoy, ' + 'los tres avisos resueltos. Aguyje.' : ok ? 'Gracias por la guardia: resolviste ' + ok + ' de 3 avisos. Mañana otra vez.' : 'Hoy no fue tu día, pero gracias por presentarte. Mañana otra vez.', V);
    this.toast('🚒 Guardia terminada: ' + ok + '/3 avisos · cobraste ' + VR.fmtGs(pago) + (pen ? ' (descontados ' + VR.fmtGs(pen) + ' por golpes)' : ''));
    this.limpia();
  }
  drawGround(g, cx, cy) {
    const J = this.job, A = J && J.av; if (!A || A.tipo === 'fuego' || A.est === 'llevar') return; const x = A.x - cx, y = A.y - cy, t = performance.now() / 1000, r = 24 + Math.sin(t * 4) * 2;
    g.save(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,90,60,.95)'; g.fillStyle = 'rgba(255,90,60,.18)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); g.restore();
  }
  collect(cx, cy, tall) {
    const J = this.job, A = J && J.av; if (!A || (A.tipo !== 'herido' && A.tipo !== 'gato') || A.est === 'llevar') return; const x = Math.round(A.x - cx), y = Math.round(A.y - cy), P = this.peds;
    tall.push({ sy: A.y + 6, draw: (g) => {
      const b = Math.sin(performance.now() / 150) * 2; g.font = '14px system-ui'; g.textAlign = 'center';
      if (A.tipo === 'herido' && P && P.sprites) { const spr = P.sprites[A.pal % P.sprites.length]; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y, 11, 4, 0, 0, 7); g.fill(); g.drawImage(VR.lyingCanvas(spr), x - 17, y - 11, 34, 18); g.fillText('🆘', x, y - 16 + b); }
      else { g.fillText('🌳', x, y - 6); g.fillText('🐈', x + 4, y - 18 + b); }
      if (A.prog > 0 && A.prog < 1) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x - 14, y - 32, 28, 5); g.fillStyle = '#6fe08a'; g.fillRect(x - 13, y - 31, 26 * A.prog, 3); }
    } });
  }
};
