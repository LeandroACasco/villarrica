// Pasar la partida de Historia a otro dispositivo (15/11/2026).
// Etapa 1: exportar/importar (archivo o código de texto). Etapa 2: cuenta de Google (Firebase Auth) + nube (Firestore, colección
// villarrica_partidas, un documento por usuario). Lo que viaja: todas las claves 'villarrica:h:*' del localStorage (el progreso de Historia).
// Los ajustes y las fotos del celular no viajan. Todo original.
'use strict';
VR.Guardado = {
  // CAN: prefijo "canónico" con el que viajan las instantáneas (archivo, código, nube), sea cual sea la ranura de origen.
  // pfx(n): el prefijo real de la ranura n en este dispositivo. La nube guarda siempre la Partida 1 (CS).
  CAN: 'villarrica:h:', CS: 1, FBV: '10.14.1',
  pfx(n) { return 'villarrica:' + VR.store.hns(n || VR.store.slot); },
  fl: () => {}, toast: (m) => {},
  // ---------- instantánea local ----------
  stamp() { try { localStorage.setItem(this.pfx() + '_t', String(Date.now())); } catch (e) {} },
  localT(n) { try { return +localStorage.getItem(this.pfx(n) + '_t') || 0; } catch (e) { return 0; } },
  snapshot(n) {
    this.fl();
    const P = this.pfx(n), d = {}; try { Object.keys(localStorage).filter((k) => k.startsWith(P)).forEach((k) => { d[this.CAN + k.slice(P.length)] = localStorage.getItem(k); }); } catch (e) {}
    return d[this.CAN + 'vida'] ? { v: 1, app: 'villarrica', t: this.localT(n) || Date.now(), d } : null;
  },
  resumen(snap) {
    if (!snap) return 'sin partida';
    try {
      const v = JSON.parse(snap.d[this.CAN + 'vida']), p = JSON.parse(snap.d[this.CAN + 'plata'] || '0'), g = (n) => Math.round(n).toLocaleString('es-PY').replace(/,/g, '.');
      return 'Día ' + (Math.floor(v.min / 1440) + 1) + ' · 💵 ' + g(p) + ' Gs. · 🏦 ' + g(v.banco || 0) + ' Gs. · ' + new Date(snap.t).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) { return 'partida guardada'; }
  },
  valida(snap) {
    if (!snap || snap.app !== 'villarrica' || !snap.d || typeof snap.d !== 'object') return false;
    const ks = Object.keys(snap.d); if (!ks.length || ks.length > 80) return false;
    if (!ks.every((k) => k.startsWith(this.CAN) && typeof snap.d[k] === 'string')) return false;
    if (JSON.stringify(snap.d).length > 900000) return false;
    try { JSON.parse(snap.d[this.CAN + 'vida']); } catch (e) { return false; }
    return true;
  },
  // Reemplaza el progreso de Historia por la instantánea y reinicia el juego en Historia
  aplicar(snap, extra, n) {
    if (!this.valida(snap)) { this.toast('⚠ Esa partida no es válida'); return false; }
    n = n || VR.store.slot; const P = this.pfx(n);
    VR.wiped = true; VR.store.wipeHistoria(n);
    try { for (const k of Object.keys(snap.d)) localStorage.setItem(P + k.slice(this.CAN.length), snap.d[k]); localStorage.setItem(P + '_t', String(snap.t || Date.now())); VR.store.elegir(n); } catch (e) { this.toast('⚠ No se pudo escribir la partida'); return false; }
    if (extra) extra();
    try { sessionStorage.removeItem('villarrica:onl'); sessionStorage.setItem('villarrica:go', 'historia'); } catch (e) {}
    this.toast('✅ Partida cargada: reiniciando…'); setTimeout(() => location.reload(), 700); return true;
  },
  // ---------- código de texto ----------
  async aTexto(snap) {
    const json = JSON.stringify(snap), raw = new TextEncoder().encode(json);
    let bytes = raw, tag = 'VRH0.';
    if (window.CompressionStream) { try { bytes = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()); tag = 'VRH1.'; } catch (e) { bytes = raw; tag = 'VRH0.'; } }
    let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return tag + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  async deTexto(txt) {
    txt = (txt || '').trim().replace(/\s+/g, '');
    if (txt[0] === '{') { try { return JSON.parse(txt); } catch (e) { return null; } }
    const m = /^(VRH[01])\.([A-Za-z0-9_-]+)$/.exec(txt); if (!m) return null;
    try {
      const b = atob(m[2].replace(/-/g, '+').replace(/_/g, '/')), u = Uint8Array.from(b, (c) => c.charCodeAt(0));
      if (m[1] === 'VRH1') { if (!window.DecompressionStream) return null; return JSON.parse(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text()); }
      return JSON.parse(new TextDecoder().decode(u));
    } catch (e) { return null; }
  },
  // ---------- nube ----------
  nube: { user: null, auth: null, mod: null, on: false },
  async sdk() {
    if (this.nube.mod) return this.nube.mod;
    const f = VR.FB, base = 'https://www.gstatic.com/firebasejs/' + this.FBV + '/';
    const [app, au] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js')]);
    const a = app.getApps().length ? app.getApp() : app.initializeApp({ apiKey: f.apiKey, authDomain: f.projectId + '.firebaseapp.com', projectId: f.projectId });
    this.nube.auth = au.getAuth(a); this.nube.mod = au;
    au.onAuthStateChanged(this.nube.auth, (u) => { this.nube.user = u; this.paint(); if (u && !this._ya) { this._ya = true; this.revisar(true); } });
    return au;
  },
  docUrl(uid) { return 'https://firestore.googleapis.com/v1/projects/' + VR.FB.projectId + '/databases/(default)/documents/villarrica_partidas/' + encodeURIComponent(uid); },
  async tok() { return this.nube.user.getIdToken(); },
  async bajar() { // null = no hay partida en la nube
    const r = await fetch(this.docUrl(this.nube.user.uid), { headers: { Authorization: 'Bearer ' + await this.tok() } });
    if (r.status === 404) return null; if (!r.ok) throw new Error('Firestore ' + r.status);
    const j = await r.json(), F = j.fields || {};
    return { rev: +(F.rev && F.rev.integerValue) || 0, snap: JSON.parse((F.p && F.p.stringValue) || 'null') };
  },
  async subir(snap, rev, keep) {
    const body = { fields: { p: { stringValue: JSON.stringify(snap) }, t: { integerValue: String(snap.t) }, rev: { integerValue: String(rev) }, mail: { stringValue: this.nube.user.email || '' } } };
    const r = await fetch(this.docUrl(this.nube.user.uid), { method: 'PATCH', keepalive: !!keep, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await this.tok() }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('Firestore ' + r.status);
  },
  mem(k, v) { try { if (v === undefined) return localStorage.getItem('villarrica:cloud:' + k); localStorage.setItem('villarrica:cloud:' + k, String(v)); } catch (e) {} },
  paint() {
    const u = this.nube.user, $ = (i) => document.getElementById(i); if (!$('nbEstado')) return;
    $('nbEstado').textContent = u ? '☁ Conectado como ' + (u.email || u.displayName) + ' · sincroniza la Partida 1' : '☁ Sin conectar. Iniciá sesión para guardar tu partida en la nube';
    $('nbIn').style.display = u ? 'none' : ''; $('nbOut').style.display = u ? '' : 'none'; $('nbUp').style.display = $('nbDown').style.display = $('nbAutoL').style.display = u ? '' : 'none';
  },
  say(t) { const e = document.getElementById('nbMsg'); if (e) e.textContent = t; },
  // Compara nube y dispositivo. auto = solo actúa solo si no hay riesgo de pisar nada.
  async revisar(auto) {
    if (!this.nube.user) return;
    try {
      const c = await this.bajar(), loc = this.snapshot(this.CS), lastRev = +this.mem('rev') || 0, mismo = this.mem('uid') === this.nube.user.uid, cambio = loc && this.localT(this.CS) > (+this.mem('syncT') || 0);
      if (!c && !loc) { this.say('No hay partida ni acá ni en la nube.'); return; }
      if (!c) { if (auto && !this.nube.auto) { this.say('Hay partida en este dispositivo y nada en la nube. Podés subirla.'); return; } await this.hacerSubir(loc, 0); return; }
      if (!loc) { this.pregunta(c, null, 'En la nube hay una partida y este dispositivo no tiene ninguna.'); return; }
      if (mismo && c.rev === lastRev) { if (cambio && this.nube.auto) await this.hacerSubir(loc, c.rev); else this.say(cambio ? 'Tenés cambios sin subir.' : '✔ Todo al día con la nube.'); return; }
      if (mismo && !cambio) { this.pregunta(c, loc, 'En la nube hay una partida más nueva (jugaste desde otro dispositivo).'); return; }
      if (JSON.stringify(c.snap.d) === JSON.stringify(loc.d)) { this.mem('rev', c.rev); this.mem('uid', this.nube.user.uid); this.mem('syncT', this.localT(this.CS)); this.say('✔ Todo al día con la nube.'); return; }
      this.pregunta(c, loc, 'La partida de la nube y la de este dispositivo son distintas.');
    } catch (e) { this.say('⚠ No se pudo hablar con la nube: ' + (e.message || e)); }
  },
  async hacerSubir(loc, rev) {
    try { await this.subir(loc, rev + 1); this.mem('rev', rev + 1); this.mem('uid', this.nube.user.uid); this.mem('syncT', this.localT(this.CS)); this.say('⬆ Partida subida · ' + new Date().toLocaleTimeString('es-PY', { timeStyle: 'short' })); }
    catch (e) { this.say('⚠ No se pudo subir: ' + (e.message || e)); }
  },
  pregunta(c, loc, motivo) {
    const dlg = document.getElementById('nbDlg'), $ = (i) => document.getElementById(i);
    $('nbMotivo').textContent = motivo; $('nbCloud').textContent = this.resumen(c.snap); $('nbLocal').textContent = this.resumen(loc);
    $('nbUsaNube').onclick = () => { dlg.close(); this.aplicar(c.snap, () => { this.mem('rev', c.rev); this.mem('uid', this.nube.user.uid); this.mem('syncT', c.snap.t); }, this.CS); };
    $('nbUsaLocal').style.display = loc ? '' : 'none'; $('nbUsaLocal').onclick = async () => { dlg.close(); await this.hacerSubir(loc, c.rev); };
    $('nbNada').onclick = () => { dlg.close(); this.say('Quedó sin sincronizar. Podés elegir más tarde con ⬆ / ⬇.'); };
    VR.input && VR.input.releaseAll(); if (!dlg.open) dlg.showModal();
  },
  // ---------- pantalla ----------
  init(o) {
    this.fl = o.flush; this.toast = o.toast; const $ = (i) => document.getElementById(i), me = this;
    const bajarArchivo = async () => { const s = me.snapshot(); if (!s) { me.toast('No hay partida de Historia para guardar'); return; } const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(s)], { type: 'application/json' })); a.download = 'villarrica-historia-dia' + (Math.floor(JSON.parse(s.d[me.PFX + 'vida']).min / 1440) + 1) + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); me.toast('💾 Archivo guardado'); };
    $('gxArch').onclick = bajarArchivo;
    $('gxFile').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const s = await me.deTexto(await f.text()); if (me.valida(s) && confirm('Vas a reemplazar tu Historia de este dispositivo por:\n' + me.resumen(s) + '\n\n¿Seguro?')) me.aplicar(s); else if (!me.valida(s)) me.toast('⚠ Ese archivo no es una partida de Villarrica'); };
    $('gxCopia').onclick = async () => { const s = me.snapshot(); if (!s) { me.toast('No hay partida de Historia para copiar'); return; } const t = await me.aTexto(s); $('gxTxt').value = t; try { await navigator.clipboard.writeText(t); me.toast('📋 Código copiado (' + t.length + ' letras)'); } catch (e) { $('gxTxt').select(); me.toast('Copialo a mano: está en el cuadro'); } };
    $('gxPega').onclick = async () => { const s = await me.deTexto($('gxTxt').value); if (!me.valida(s)) { me.toast('⚠ Ese código no es válido'); return; } if (confirm('Vas a reemplazar tu Historia de este dispositivo por:\n' + me.resumen(s) + '\n\n¿Seguro?')) me.aplicar(s); };
    this.nube.auto = this.mem('auto') === '1'; $('nbAuto').checked = this.nube.auto;
    $('nbAuto').onchange = () => { me.nube.auto = $('nbAuto').checked; me.mem('auto', me.nube.auto ? 1 : 0); if (me.nube.auto) me.revisar(false); };
    $('nbIn').onclick = async () => { try { me.say('Abriendo Google…'); const au = await me.sdk(); await au.signInWithPopup(me.nube.auth, new au.GoogleAuthProvider()); } catch (e) { me.say(/popup/.test(e.code || '') ? '⚠ El navegador bloqueó la ventana de Google. Permitila e intentá de nuevo.' : '⚠ No se pudo iniciar sesión (' + (e.code || e.message || e) + ')'); } };
    $('nbOut').onclick = async () => { try { await me.nube.mod.signOut(me.nube.auth); me._ya = false; me.say('Sesión cerrada.'); } catch (e) {} };
    $('nbUp').onclick = async () => { const loc = me.snapshot(me.CS); if (!loc) { me.say('No hay partida de Historia para subir.'); return; } try { const c = await me.bajar(); if (c && c.snap && c.rev !== (+me.mem('rev') || 0) && JSON.stringify(c.snap.d) !== JSON.stringify(loc.d)) { me.pregunta(c, loc, 'La nube tiene otra partida distinta de la última que sincronizaste.'); return; } await me.hacerSubir(loc, c ? c.rev : 0); } catch (e) { me.say('⚠ ' + (e.message || e)); } };
    $('nbDown').onclick = async () => { try { const c = await me.bajar(); if (!c) { me.say('En la nube todavía no hay partida.'); return; } me.pregunta(c, me.snapshot(me.CS), 'Elegí qué partida querés conservar.'); } catch (e) { me.say('⚠ ' + (e.message || e)); } };
    // sesión guardada: si ya había iniciado, se reconecta sola al abrir el juego
    if (this.mem('uid')) this.sdk().catch(() => {});
    setInterval(() => { if (me.nube.user && me.nube.auto && !document.hidden && me.localT(me.CS) > (+me.mem('syncT') || 0)) me.revisar(true); }, 120000);
    document.addEventListener('visibilitychange', () => { if (document.hidden && me.nube.user && me.nube.auto) { const loc = me.snapshot(me.CS); if (loc && me.localT(me.CS) > (+me.mem('syncT') || 0)) me.revisar(true); } });
    this.paint();
  },
};
