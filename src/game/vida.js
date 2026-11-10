// Vida del modo Historia (J1 de claude/misiones-plan.md, 10/11/2026): hora del juego, hambre, saldo del celular, la pieza
// (alquiler semanal), deudas y los últimos movimientos de plata. En modo Libre no existe (VR.vida = null).
//  - 1 día del juego = 30 min reales (1 minuto del juego = 1,25 s reales); el día 1 es lunes y arranca a las 7:00.
//  - Hambre 0–100: baja de 100 a 0 en un día; por debajo de 25 no se corre; en 0 te desmayás y te llevan al hospital.
//  - Pieza en Santa Lucía: 200.000 Gs. por semana (800.000 al mes, según Leandro: entre 700.000 y 1.000.000). Cada sábado
//    al mediodía se suma al "debés"; dos semanas sin pagar y Ña Ramona te saca las cosas.
//  - Saldo: 10.000 Gs. = 3 días. Sin saldo no llegan changas por la app (las que se piden desde el celular).
//  - Deuda: se descuenta el 50 % de cada cobro hasta saldarla.
// Todo se guarda en VR.store 'vida' (con prefijo h: porque el modo Historia tiene su propio guardado).
'use strict';

VR.PRECIOS = { // en guaraníes (referencias de Leandro, 10/11/2026)
  pieza: 200000, // por semana
  chipa: 5000, empanada: 6000, mbeju: 7000,
  plato: 15000, // plato del día, "a partir de"
  helado: 10000, // una porción; el kilo en la Marimer sale 45.000
  heladoKilo: 45000,
  saldo: 10000, // 3 días
  remedios: 120000, // hospital
};
VR.METAS = [ // lista de sueños (Menú → Metas): se van tachando con las etapas J3–J6
  ['Celular nuevo', 1200000], ['Bici usada', 450000], ['Casco', 180000], ['Licencia de conducir', 250000],
  ['Moto usada', 4500000], ['Mbojoaju 125 nueva', 9500000], ['Pieza en el Centro', 300000],
  ['Puesto de chipa', 6000000], ['Mitã 1.3', 48000000], ['Copetín propio', 25000000], ['Casa en Santa Lucía', 180000000],
];
VR.DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

VR.Vida = class {
  constructor() {
    const d = { min: 7 * 60, hambre: 80, saldo: 0, debe: 0, pieza: { saldo: 0, vence: 5 * 1440 + 12 * 60, fuera: false }, mov: [], metas: [], aviso: 0 };
    const s = VR.store.get('vida', null);
    this.s = Object.assign(d, s || {}); this.s.pieza = Object.assign(d.pieza, (s && s.pieza) || {});
    this.nueva = !s; this.onMsg = null; this.onDesmayo = null; this._hud = ''; this._acc = 0; this._save = 0;
    this.sync();
  }
  // ---- tiempo ----
  get dia() { return Math.floor(this.s.min / 1440) + 1; }
  get hora() { return (this.s.min % 1440) / 60; }
  get diaSemana() { return VR.DIAS[(this.dia - 1) % 7]; }
  get hhmm() { const m = Math.floor(this.s.min % 1440); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); }
  sync() { VR.gameHour = this.hora; VR.noRun = this.s.hambre < 25; }
  msg(t) { if (this.onMsg) this.onMsg(t); }
  // dt en segundos reales; solo se llama mientras el juego corre (la pausa y los menús frenan el reloj)
  tick(dt) {
    const s = this.s, dm = dt * 0.8; // 1440 min / 1800 s
    s.min += dm;
    const h0 = s.hambre; s.hambre = Math.max(0, s.hambre - dm * 100 / 1440);
    s.saldo = Math.max(0, s.saldo - dm / 1440);
    if (h0 >= 25 && s.hambre < 25) this.msg('🍽 Tenés hambre: así no podés correr. Comé algo');
    if (h0 >= 10 && s.hambre < 10) this.msg('🍽 ¡Te estás quedando sin fuerzas!');
    if (s.hambre <= 0) { s.hambre = 40; s.min += 180; this.sync(); if (this.onDesmayo) this.onDesmayo(); }
    const P = s.pieza;
    if (s.min >= P.vence) { // cada sábado al mediodía se cobra la semana
      P.saldo += VR.PRECIOS.pieza; P.vence += 7 * 1440;
      if (P.saldo >= 2 * VR.PRECIOS.pieza && !P.fuera) { P.fuera = true; this.msg('🏠 Ña Ramona te sacó las cosas de la pieza. Pagale lo que debés'); }
      else this.msg(P.saldo > VR.PRECIOS.pieza ? '🏠 Ña Ramona: "¡Ya van dos semanas, mitã!"' : '🏠 Hoy vence la pieza: ' + VR.fmtGs(P.saldo));
    }
    this.sync();
    this._save -= dt; if (this._save <= 0) { this._save = 3; this.save(); }
  }
  save() { if (!VR.wiped) VR.store.set('vida', this.s); }
  // ---- plata ----
  plata() { return VR.Wallet.get(); }
  log(n, why) { const m = this.s.mov; m.unshift([this.dia, this.hhmm, Math.round(n), why || (n >= 0 ? 'Ingreso' : 'Gasto')]); if (m.length > 30) m.length = 30; }
  // movimiento de la billetera: de lo que cobrás, el 50 % va a la deuda hasta saldarla
  mueve(n, why) {
    const W = VR.Wallet, s = this.s;
    if (n > 0 && s.debe > 0) { const p = Math.min(s.debe, Math.round(n / 2)); s.debe -= p; n -= p; this.log(-p, 'Pago de deuda (50 %)'); }
    W.set(W.get() + n); this.log(n, why);
  }
  // gasto que se paga con lo que hay y, si no alcanza, queda como deuda (hospital, multas)
  cobrarODeber(n, why) {
    const W = VR.Wallet, pago = Math.min(W.get(), n); W.set(W.get() - pago); this.log(-pago, why);
    if (n > pago) { this.s.debe += n - pago; this.log(0, 'Quedó debiendo ' + VR.fmtGs(n - pago)); }
  }
  gasta(n, why) { if (VR.Wallet.get() < n) { this.msg('💸 No te alcanza: ' + VR.fmtGs(n)); return false; } this.mueve(-n, why); return true; }
  // ---- cosas de la vida ----
  come(precio, hambre, que) { if (!this.gasta(precio, que)) return false; this.s.hambre = Math.min(100, this.s.hambre + hambre); this.sync(); this.msg('🍽 ' + que + ' · −' + VR.fmtGs(precio)); return true; }
  cargaSaldo() { if (!this.gasta(VR.PRECIOS.saldo, 'Saldo del celular')) return false; this.s.saldo += 3; this.msg('📱 Cargaste saldo · +3 días'); return true; }
  saldoOk() { return this.s.saldo > 0; }
  // pagarle a Ña Ramona: lo que debés (o lo que alcance); si no debés nada, adelanta la semana que viene
  pagaPieza() {
    const P = this.s.pieza, deb = P.saldo > 0 ? P.saldo : VR.PRECIOS.pieza, n = Math.min(deb, VR.Wallet.get());
    if (n <= 0) { this.msg('💸 No tenés plata para pagar la pieza'); return false; }
    this.mueve(-n, 'Pieza (Ña Ramona)'); P.saldo -= n;
    if (P.saldo <= 0) { if (P.fuera) { P.fuera = false; this.msg('🏠 Ña Ramona te dejó volver a la pieza'); } else this.msg('🏠 Pieza al día. "Aguyje, mitã"'); }
    else this.msg('🏠 Pagaste ' + VR.fmtGs(n) + ' · todavía debés ' + VR.fmtGs(P.saldo));
    return true;
  }
  // ---- lo que se ve en el HUD ----
  hudLinea1() { const s = this.s, h = Math.round(s.hambre / 10); return '🕐 ' + this.diaSemana + ' ' + this.hhmm + '  🍽 ' + '▮'.repeat(h) + '▯'.repeat(10 - h); }
  hudLinea2() {
    const s = this.s, dias = Math.ceil(s.saldo), P = s.pieza, venceEn = Math.max(0, Math.ceil((P.vence - s.min) / 1440));
    return '📱 ' + (dias > 0 ? dias + ' d' : 'sin saldo') + '  🏠 ' + (P.saldo > 0 ? 'debés' : venceEn <= 1 ? 'vence hoy' : 'vence ' + VR.DIAS[((P.vence / 1440 | 0)) % 7]);
  }
  deudaTotal() { return this.s.debe + Math.max(0, this.s.pieza.saldo); }
};
