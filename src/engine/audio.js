// Sonidos sintetizados (04/11/2026): bocinas, motor del vehículo que manejás, choques, explosiones, agua,
// pasos de los que corren y el "¡ay!" de los golpes, todo con WebAudio (sin archivos). Un solo contexto de audio
// que también usa la sirena. El volumen baja con la distancia a la cámara. Menú → Sonido lo apaga todo.
'use strict';
VR.audio = {
  ac: null, master: null, on: true, vol: 0.6, failed: false, noiseBuf: null,
  ctx() {
    if (this.ac || this.failed) return this.ac;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; this.ac = new AC();
      this.master = this.ac.createGain(); this.master.gain.value = this.on ? this.vol * this.vol : 0; this.master.connect(this.ac.destination);
      const n = this.ac.sampleRate, b = this.ac.createBuffer(1, n, n), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
    } catch (e) { this.failed = true; }
    return this.ac;
  },
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? this.vol * this.vol : 0; },
  // volumen general 0..1 (curva cuadrática: el control se siente parejo al oído)
  setVol(v) { this.vol = Math.max(0, Math.min(1, v)); if (this.master) this.master.gain.value = this.on ? this.vol * this.vol : 0; },
  // al minimizar o cambiar de pestaña se congela todo el audio (si no, el motor y la sirena quedan sonando colgados)
  hold(h) { const ac = this.ac; if (!ac) return; if (h) ac.suspend().catch(() => {}); else if (this.on) ac.resume().catch(() => {}); },
  resume() { const ac = this.ctx(); if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); },
  // volumen según la distancia (px del mapa) al punto que mira la cámara
  near(x, y, far = 520) { const c = VR.audioCam; if (!c) return 1; const d = Math.hypot(x - c.x, y - c.y); return Math.max(0, 1 - d / far); },
  tone(f, dur, { type = 'square', vol = 0.08, at = 0, f2 = null, lp = 2600 } = {}) {
    const ac = this.ctx(); if (!ac || !this.on || vol <= 0.001) return;
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    fl.type = 'lowpass'; fl.frequency.value = lp;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.04)); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(fl); fl.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, { vol = 0.1, lp = 1200, hp = 0, at = 0, decay = true } = {}) {
    const ac = this.ctx(); if (!ac || !this.on || vol <= 0.001) return;
    const t = ac.currentTime + at, s = ac.createBufferSource(), g = ac.createGain(), fl = ac.createBiquadFilter();
    s.buffer = this.noiseBuf; s.loop = true; fl.type = 'lowpass'; fl.frequency.value = lp;
    let last = fl; if (hp) { const h = ac.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; fl.connect(h); last = h; }
    g.gain.setValueAtTime(vol, t); if (decay) g.gain.exponentialRampToValueAtTime(0.0008, t + dur); else g.gain.setValueAtTime(vol, t + dur);
    s.connect(fl); last.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  // ---- efectos ----
  horn(x, y, kind = 'car') { // bocina: dos tonos juntos (las motos más agudas)
    const v = this.near(x, y) * 0.07; if (v <= 0) return;
    const [a, b] = kind === 'moto' ? [520, 655] : kind === 'big' ? [220, 277] : [370, 466];
    this.tone(a, 0.28, { vol: v, lp: 1800 }); this.tone(b, 0.28, { vol: v * 0.8, lp: 1800 });
  },
  crash(x, y, imp) { const v = this.near(x, y) * Math.min(0.35, imp / 900); if (v <= 0.01) return; this.noise(0.25 + imp / 1500, { vol: v, lp: 900 + imp * 2 }); this.tone(90, 0.12, { type: 'sine', vol: v * 0.8, f2: 45 }); if (imp > 160) this.noise(0.18, { vol: v * 0.35, lp: 6000, hp: 2500, at: 0.03 }); },
  boom(x, y) { const v = this.near(x, y, 900) * 0.5; if (v <= 0.01) return; this.noise(1.6, { vol: v, lp: 700 }); this.tone(70, 0.8, { type: 'sine', vol: v, f2: 28 }); this.noise(0.5, { vol: v * 0.3, lp: 4000, at: 0.05 }); },
  blip() { this.tone(880 + Math.random() * 120, 0.04, { type: 'square', vol: 0.025 }); }, // cada línea de diálogo (J2)
  coin() { this.tone(988, 0.07, { type: 'square', vol: 0.05 }); this.tone(1319, 0.16, { type: 'square', vol: 0.05, at: 0.07 }); }, // cobro o paso cumplido
  bark(x, y, yelp) { const v = this.near(x, y, 420) * 0.07; if (v <= 0) return; if (yelp) { this.tone(900, 0.12, { type: 'triangle', vol: v, f2: 1500 }); this.tone(1200, 0.1, { type: 'triangle', vol: v, f2: 700, at: 0.14 }); return; } const f = 190 + Math.random() * 60; this.tone(f, 0.09, { type: 'sawtooth', vol: v, f2: f * 0.6 }); this.tone(f * 1.05, 0.09, { type: 'sawtooth', vol: v * 0.8, f2: f * 0.6, at: 0.15 }); },
  muu(x, y) { const v = this.near(x, y, 420) * 0.08; if (v <= 0) return; const f = 110 + Math.random() * 25; this.tone(f, 0.9, { type: 'sawtooth', vol: v, f2: f * 0.8, lp: 700 }); this.tone(f * 2, 0.8, { type: 'triangle', vol: v * 0.4, f2: f * 1.6, lp: 900, at: 0.05 }); }, // mugido de las vacas
  // animales (13/11/2026): cada especie con su sonido sintetizado
  animal(k, x, y) {
    const v = this.near(x, y, 420) * 0.075; if (v <= 0.004) return; const r = Math.random();
    const T = (f, d, o) => this.tone(f, d, o);
    if (k === 'caballo') { T(420, 0.55, { type: 'sawtooth', vol: v, f2: 820, lp: 1600 }); T(800, 0.3, { type: 'sawtooth', vol: v * 0.8, f2: 330, lp: 1500, at: 0.5 }); T(360, 0.25, { type: 'sawtooth', vol: v * 0.6, f2: 520, lp: 1200, at: 0.75 }); }
    else if (k === 'cerdo') { for (let i = 0; i < 2; i++) T(150 + r * 30, 0.16, { type: 'sawtooth', vol: v, f2: 95, lp: 700, at: i * 0.22 }); }
    else if (k === 'cabra') { const f = 360 + r * 60; T(f, 0.55, { type: 'sawtooth', vol: v * 0.9, f2: f * 0.85, lp: 1400 }); T(f * 1.04, 0.5, { type: 'square', vol: v * 0.3, f2: f * 0.85, lp: 1000, at: 0.03 }); }
    else if (k === 'oveja') { const f = 260 + r * 40; T(f, 0.6, { type: 'sawtooth', vol: v * 0.9, f2: f * 0.9, lp: 1100 }); }
    else if (k === 'gallo') { T(620, 0.14, { type: 'sawtooth', vol: v, f2: 900, lp: 2400 }); T(900, 0.12, { type: 'sawtooth', vol: v, f2: 760, lp: 2400, at: 0.17 }); T(780, 0.14, { type: 'sawtooth', vol: v, f2: 1050, lp: 2400, at: 0.32 }); T(1050, 0.5, { type: 'sawtooth', vol: v, f2: 520, lp: 2400, at: 0.5 }); }
    else if (k === 'gallina') { for (let i = 0; i < 3; i++) T(560 + r * 80, 0.07, { type: 'square', vol: v * 0.8, f2: 420, lp: 1800, at: i * 0.11 }); }
    else if (k === 'tero') { for (let i = 0; i < 4; i++) T(1700, 0.06, { type: 'triangle', vol: v, f2: 2150, lp: 3600, at: i * 0.1 }); }
    else if (k === 'gato') { T(560, 0.14, { type: 'triangle', vol: v * 0.9, f2: 900, lp: 2400 }); T(900, 0.35, { type: 'triangle', vol: v * 0.9, f2: 520, lp: 2400, at: 0.14 }); }
    else if (k === 'loro') { for (let i = 0; i < 3; i++) T(1700, 0.11, { type: 'square', vol: v * 0.7, f2: 2500, lp: 4000, at: i * 0.14 }); }
    else if (k === 'sapo') { for (let i = 0; i < 4; i++) T(190, 0.06, { type: 'square', vol: v * 0.7, f2: 250, lp: 600, at: i * 0.09 }); }
  },
  ouch(x, y) { const v = this.near(x, y, 300) * 0.05; if (v <= 0) return; const f = 300 + Math.random() * 180; this.tone(f, 0.18, { type: 'triangle', vol: v, f2: f * 0.6 }); },
  shot(x, y) { const v = this.near(x, y, 600) * 0.32; if (v <= 0.01) return; this.noise(0.16, { vol: v, lp: 3200, hp: 300 }); this.tone(160, 0.08, { type: 'square', vol: v * 0.5, f2: 60 }); },
  // ---- sonidos continuos: motor, agua y lanzallamas ----
  loop(name) {
    const ac = this.ctx(); if (!ac) return null;
    this.loops = this.loops || {};
    if (this.loops[name]) return this.loops[name];
    const g = ac.createGain(); g.gain.value = 0; g.connect(this.master);
    let L;
    if (name === 'flame') { const s = ac.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; s.connect(f); f.connect(g); s.start(); L = { g }; }
    else if (name === 'lago') { // olitas suaves en la orilla: ruido grave que sube y baja despacio
      const s = ac.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
      const m = ac.createGain(); m.gain.value = 0.6; const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.17; lg.gain.value = 0.4; lfo.connect(lg); lg.connect(m.gain); lfo.start();
      s.connect(f); f.connect(m); m.connect(g); s.start(); L = { g };
    }
    else if (name === 'grillos') { // grillos de noche: dos agudos que se prenden y apagan rápido, con pausas largas
      const mk = (f, rate, depth) => { const o = ac.createOscillator(), m = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(); o.frequency.value = f; l.type = 'square'; l.frequency.value = rate; lg.gain.value = depth; m.gain.value = depth; l.connect(lg); lg.connect(m.gain); o.connect(m); m.connect(g); o.start(); l.start(); };
      mk(4300, 13, 0.5); mk(5100, 17, 0.35); L = { g };
    }
    else if (name === 'water') { const s = ac.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.6; s.connect(f); f.connect(g); s.start(); L = { g }; }
    else { // motor: diente de sierra + sub, por un pasabajos; la frecuencia sigue a las vueltas
      const o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(); o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 600; f.Q.value = 2;
      const g2 = ac.createGain(); g2.gain.value = 0.4; o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); o.start(); o2.start(); L = { g, o, o2, f };
    }
    return (this.loops[name] = L);
  },
  // motor del vehículo que manejás: kind car|moto|big|pati|horse
  engine(car, dt) {
    const L = this.loop('engine'); if (!L) return;
    const t = this.ac.currentTime;
    if (!car || !this.on || car.wreck || car.model === 'karumbe' || car.model === 'pati') { L.g.gain.setTargetAtTime(car && car.model === 'pati' && this.on ? 0.012 : 0, t, 0.08); if (car && car.model === 'pati') { L.o.frequency.setTargetAtTime(300 + Math.abs(car.v) * 3, t, 0.05); L.f.frequency.setTargetAtTime(1400, t, 0.1); } return; }
    const moto = car.type === 'moto', big = car.spec.mass > 1.3, s = Math.min(1, Math.abs(car.v) / (car.spec.max.road || 240));
    const gear = moto ? 4 : 5, gp = (s * gear) % 1, rpm = 0.25 + (s < 0.05 ? 0 : 0.35 + gp * 0.6) * (0.6 + s * 0.4);
    const base = moto ? 46 : big ? 28 : 34, f = base + rpm * (moto ? 120 : 80);
    L.o.frequency.setTargetAtTime(f, t, 0.04); L.o2.frequency.setTargetAtTime(f / 2, t, 0.04);
    L.f.frequency.setTargetAtTime(380 + rpm * (moto ? 1600 : 1100), t, 0.06);
    L.g.gain.setTargetAtTime(0.035 + rpm * 0.03, t, 0.06);
  },
  flame(on) { const L = this.loop('flame'); if (L) L.g.gain.setTargetAtTime(on && this.on ? 0.14 : 0, this.ac.currentTime, 0.06); },
  grillos(v) { if (!this.noiseBuf) { this.ctx(); } const L = this.loop('grillos'); if (L && this.on) L.g.gain.setTargetAtTime(Math.max(0, v) * 0.011, this.ac.currentTime, 0.8); else if (L) L.g.gain.setTargetAtTime(0, this.ac.currentTime, 0.1); },
  lago(v) { if (!this.noiseBuf) { this.ctx(); } const L = this.loop('lago'); if (L && this.on) L.g.gain.setTargetAtTime(Math.max(0, v) * 0.045, this.ac.currentTime, 0.3); else if (L) L.g.gain.setTargetAtTime(0, this.ac.currentTime, 0.1); },
  water(on) { const L = this.loop('water'); if (L) L.g.gain.setTargetAtTime(on && this.on ? 0.05 : 0, this.ac.currentTime, 0.05); },
};
