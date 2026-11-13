// Clima de Villarrica (13/11/2026, pedido de Leandro): calor, templado, frío, nublado y lluvia. Con "clima real" se lee de
// Open-Meteo (API gratuita sin clave, CC BY 4.0: va en los créditos) desde el navegador de quien juega; el dato se guarda
// 30 minutos y, si no hay internet, se usa un clima típico de la época. También se puede fijar a mano en la configuración.
// Efectos: tinte de la luz del día (amarillo y duro con calor, azulado con frío, gris con nubes y lluvia), sombras más
// tenues con nubes (VR.sun.str), gotas de lluvia, y salida y puesta del sol reales (VR.sun.RISE/SET). Con ?clima=lluvia
// (o calor, templado, frio, nublado, real) en la dirección se prueba sin tocar la configuración.
VR.clima = {
  mode: 'real', f: { calor: 0, frio: 0, nube: 0.15, lluvia: 0 }, data: null, label: '', rise: null, set: null, drops: [],
  URL: 'https://api.open-meteo.com/v1/forecast?latitude=-25.75&longitude=-56.43&current=temperature_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m&daily=sunrise,sunset&timezone=America%2FAsuncion&forecast_days=1',
  PRESET: { calor: { calor: 1, frio: 0, nube: 0.1, lluvia: 0 }, templado: { calor: 0, frio: 0, nube: 0.2, lluvia: 0 }, frio: { calor: 0, frio: 1, nube: 0.45, lluvia: 0 },
    nublado: { calor: 0, frio: 0.1, nube: 0.95, lluvia: 0 }, lluvia: { calor: 0, frio: 0.2, nube: 1, lluvia: 1 } },
  NAME: { calor: 'calor', templado: 'templado', frio: 'frío', nublado: 'nublado', lluvia: 'lluvia' },
  init(mode) {
    const u = /[?&]clima=(\w+)/.exec(location.search); this.mode = u ? u[1] : mode || 'real';
    try { const c = JSON.parse(VR.store.get('climaCache', 'null')); if (c && c.d) { this.data = c.d; this.t = c.t; } } catch (e) {}
    this.apply();
    if (this.mode === 'real' && (!this.t || Date.now() - this.t > 30 * 60e3)) this.fetch();
    setInterval(() => { if (this.mode === 'real') this.fetch(); }, 30 * 60e3);
  },
  setMode(m) { this.mode = m; this.apply(); if (m === 'real' && (!this.t || Date.now() - this.t > 30 * 60e3)) this.fetch(); },
  fetch() {
    try {
      fetch(this.URL).then((r) => r.ok ? r.json() : Promise.reject(r.status)).then((j) => {
        const c = j.current || {}, d = j.daily || {};
        this.data = { temp: c.temperature_2m, app: c.apparent_temperature, nube: c.cloud_cover, lluvia: c.precipitation, code: c.weather_code, viento: c.wind_speed_10m,
          rise: d.sunrise && d.sunrise[0], set: d.sunset && d.sunset[0] };
        this.t = Date.now(); VR.store.set('climaCache', JSON.stringify({ t: this.t, d: this.data })); this.apply();
      }).catch(() => {});
    } catch (e) {}
  },
  hm(s) { const m = /T(\d+):(\d+)/.exec(s || ''); return m ? +m[1] + m[2] / 60 : null; },
  // de los datos (o del preset) a los cuatro factores 0..1
  apply() {
    const cl = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)));
    if (this.PRESET[this.mode]) { this.f = Object.assign({}, this.PRESET[this.mode]); this.label = 'Clima fijo: ' + this.NAME[this.mode]; this.rise = this.set = null; return; }
    const d = this.data;
    if (d && typeof d.temp === 'number') {
      const app = typeof d.app === 'number' ? d.app : d.temp, rain = (d.lluvia || 0) > 0.05 || [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(d.code);
      this.f = { calor: cl(app, 28, 36), frio: cl(app, 18, 8), nube: cl(d.nube || 0, 0, 100), lluvia: rain ? Math.min(1, 0.45 + (d.lluvia || 0) / 2) : 0 };
      if (this.f.lluvia) this.f.nube = Math.max(this.f.nube, 0.85);
      this.rise = this.hm(d.rise); this.set = this.hm(d.set);
      this.label = 'Clima real: ' + Math.round(d.temp) + ' °C (sensación ' + Math.round(app) + ') · nubes ' + Math.round(d.nube || 0) + ' %' + (this.f.lluvia ? ' · llueve' : '');
    } else { // sin datos todavía: clima típico de la época
      const m = new Date().getMonth(); this.f = { calor: m >= 11 || m <= 1 ? 0.7 : m === 2 || m === 10 ? 0.35 : 0, frio: m >= 5 && m <= 7 ? 0.6 : 0, nube: 0.2, lluvia: 0 };
      this.rise = this.set = null; this.label = 'Clima real: sin datos todavía (se usa uno típico de la época)';
    }
  },
  // tinte de la luz del día: se multiplica sobre el cuadro; menos de noche (la noche ya oscurece)
  drawGrade(ctx, sw, sh) {
    const f = this.f, day = 1 - (VR.night ? VR.night.level : 0); if (day < 0.02) return;
    const fill = (rgb, a) => { if (a < 0.01) return; ctx.fillStyle = 'rgba(' + rgb + ',' + a.toFixed(3) + ')'; ctx.fillRect(0, 0, sw, sh); };
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    fill('255,224,160', 0.24 * f.calor * day); fill('170,200,255', 0.22 * f.frio * day); fill('196,204,214', 0.30 * f.nube * (1 - 0.3 * f.lluvia) * day); fill('96,112,140', 0.34 * f.lluvia * day);
    ctx.restore();
    if (f.calor > 0.5 && day > 0.5) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(255,214,120,' + (0.07 * (f.calor - 0.5) * 2 * day).toFixed(3) + ')'; ctx.fillRect(0, 0, sw, sh); ctx.restore(); } // resplandor
  },
  drawRain(ctx, sw, sh, dt) {
    const k = this.f.lluvia; if (k < 0.05) { this.drops.length = 0; return; }
    const want = Math.round(sw * sh / 1100 * k), D = this.drops;
    while (D.length < want) D.push({ x: Math.random() * (sw + 120), y: Math.random() * sh, v: 520 + Math.random() * 260, l: 6 + Math.random() * 7 });
    D.length = Math.min(D.length, want);
    ctx.save(); ctx.strokeStyle = 'rgba(200,216,236,.55)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const d of D) { d.y += d.v * dt; d.x -= d.v * dt * 0.22; if (d.y > sh + 10 || d.x < -20) { d.y = -10 - Math.random() * 30; d.x = Math.random() * (sw + 120); }
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.22, d.y - d.l); }
    ctx.stroke(); ctx.restore();
  },
};
