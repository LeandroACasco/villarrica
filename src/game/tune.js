// Taller de tuning (04/11/2026): colores, franjas, llantas, polarizado, alerón, techo, escape, faros xenón,
// suspensión baja y neón para el auto y las motos. Todo dibujado por código, sin marcas. Lo usan el probador de
// vehículos, algunos vehículos del tránsito y (más adelante) el taller del juego.
'use strict';
VR.TUNE_COLORS = [
  ['Rojo', '#c8322a'], ['Bordó', '#7a2a48'], ['Naranja', '#d87a1a'], ['Amarillo', '#d8a02a'], ['Lima', '#7ab83a'], ['Verde', '#3f7f4a'],
  ['Turquesa', '#2a9a9a'], ['Celeste', '#4a9ad8'], ['Azul', '#2f5fa8'], ['Violeta', '#6a4ab0'], ['Rosa', '#d85a9a'], ['Blanco', '#f2f0ea'],
  ['Plateado', '#c9ccd1'], ['Gris', '#6a6e76'], ['Negro', '#2c2c32'], ['Dorado', '#c8a040'],
];
VR.tunePal = (i) => { const c = typeof i === 'string' ? i : VR.TUNE_COLORS[i % VR.TUNE_COLORS.length][1]; return [c, VR.shadeHex(c, 0.66), VR.shadeHex(c, 1.28)]; };
VR.NEON = { celeste: '80,220,255', rosa: '255,80,200', verde: '90,255,120', violeta: '170,90,255', naranja: '255,150,40', rojo: '255,50,50' };
VR.RIMS = { serie: '#8a8e96', deportivas: '#c8ccd4', cromadas: '#eef2f8', negras: '#2e2e34', doradas: '#d8b040' };
// precio de cada pieza (guaraníes); en motos y patinetas se cobra una parte (k)
VR.TUNE_PARTS = {
  color: { name: 'Pintura', price: 2200000 },
  franja: { name: 'Franjas', opts: { no: ['Sin franjas', 0], carrera: ['De carrera', 650000], centro: ['Central ancha', 500000], costado: ['A los costados', 450000] } },
  color2: { name: 'Color de las franjas', price: 0 },
  llantas: { name: 'Llantas', opts: { serie: ['De serie', 0], deportivas: ['Deportivas', 2400000], cromadas: ['Cromadas', 3100000], negras: ['Negras', 2600000], doradas: ['Doradas', 3400000] } },
  polarizado: { name: 'Polarizado', opts: { 0: ['Sin polarizar', 0], 1: ['Medio', 380000], 2: ['Total', 650000] } },
  aleron: { name: 'Alerón', opts: { no: ['Sin alerón', 0], chico: ['Chico', 900000], grande: ['Grande', 1700000] } },
  techo: { name: 'Techo', opts: { serie: ['Del color', 0], negro: ['Negro', 700000], parrilla: ['Con parrilla', 550000] } },
  escape: { name: 'Escape', opts: { serie: ['De serie', 0], deportivo: ['Deportivo doble', 850000] } },
  faros: { name: 'Faros', opts: { normal: ['Normales', 0], xenon: ['Xenón', 650000] } },
  bajo: { name: 'Suspensión', opts: { 0: ['De serie', 0], 1: ['Baja', 1800000] } },
  neon: { name: 'Neón', opts: { no: ['Sin neón', 0], celeste: ['Celeste', 1200000], rosa: ['Rosa', 1200000], verde: ['Verde', 1200000], violeta: ['Violeta', 1200000], naranja: ['Naranja', 1200000], rojo: ['Rojo', 1200000] } },
};
// qué se le puede poner a cada vehículo, precio base, cuánto de los precios de piezas paga y color de serie
VR.TUNE_MODELS = {
  mita: { parts: ['color', 'franja', 'color2', 'llantas', 'polarizado', 'aleron', 'techo', 'escape', 'faros', 'bajo', 'neon'], price: 48000000, k: 1, serie: 0 },
  sedan: { parts: ['color', 'franja', 'color2', 'llantas', 'polarizado', 'aleron', 'techo', 'escape', 'faros', 'bajo', 'neon'], price: 72000000, k: 1, serie: 12 },
  mono: { parts: ['color', 'franja', 'color2', 'llantas', 'polarizado', 'aleron', 'techo', 'escape', 'faros', 'bajo', 'neon'], price: 56000000, k: 1, serie: 8 },
  pickup: { parts: ['color', 'franja', 'color2', 'llantas', 'polarizado', 'techo', 'escape', 'faros', 'bajo', 'neon'], price: 210000000, k: 1.2, serie: 11 },
  suv: { parts: ['color', 'franja', 'color2', 'llantas', 'polarizado', 'techo', 'escape', 'faros', 'bajo', 'neon'], price: 150000000, k: 1.2, serie: 13 },
  suvmed: { parts: ['color', 'franja', 'color2', 'llantas', 'polarizado', 'techo', 'escape', 'faros', 'bajo', 'neon'], price: 95000000, k: 1.1, serie: 5 },
  suvchico: { parts: ['color', 'franja', 'color2', 'llantas', 'polarizado', 'aleron', 'techo', 'escape', 'faros', 'bajo', 'neon'], price: 62000000, k: 1, serie: 0 },
  rally: { parts: ['color', 'franja', 'color2', 'llantas', 'polarizado', 'aleron', 'techo', 'escape', 'faros', 'bajo', 'neon'], price: 135000000, k: 1.1, serie: 8 },
  coupe: { parts: ['color', 'franja', 'color2', 'llantas', 'polarizado', 'aleron', 'techo', 'escape', 'faros', 'bajo', 'neon'], price: 88000000, k: 1, serie: 0 },
  cub: { parts: ['color', 'franja', 'color2', 'llantas', 'escape', 'faros', 'neon'], price: 9500000, k: 0.35, serie: 0 },
  mini: { parts: ['color', 'franja', 'color2', 'llantas', 'escape', 'faros', 'neon'], price: 7800000, k: 0.35, serie: 2 },
  calle: { parts: ['color', 'franja', 'color2', 'llantas', 'escape', 'faros', 'neon'], price: 14900000, k: 0.4, serie: 8 },
  carga: { parts: ['color', 'franja', 'color2', 'llantas', 'faros', 'neon'], price: 23500000, k: 0.5, serie: 8 },
  pati: { parts: ['color', 'llantas', 'faros', 'neon'], price: 3400000, k: 0.15, serie: 14 },
};
VR.tuneDefault = (m) => ({ color: VR.TUNE_MODELS[m].serie, color2: 11, franja: 'no', llantas: 'serie', polarizado: 0, aleron: 'no', techo: 'serie', escape: 'serie', faros: 'normal', bajo: 0, neon: 'no' });
// precio de una pieza elegida (0 si es la de serie)
VR.tunePartPrice = (m, part, t) => {
  const M = VR.TUNE_MODELS[m], P = VR.TUNE_PARTS[part];
  if (part === 'color') return typeof t.color === 'string' || t.color === M.serie ? 0 : Math.round(P.price * M.k / 1000) * 1000;
  if (!P.opts) return 0;
  const o = P.opts[t[part]]; if (!o) return 0;
  return part === 'neon' ? o[1] : Math.round(o[1] * M.k / 1000) * 1000;
};
VR.tunePrice = (m, t) => VR.TUNE_MODELS[m].parts.reduce((s, p) => s + VR.tunePartPrice(m, p, t), 0);
// algunas piezas cambian un poco el manejo (arcade)
VR.tuneSpec = (sp, t) => {
  if (!t) return sp;
  const o = { ...sp, max: { ...sp.max } };
  if (t.escape === 'deportivo') o.acc *= 1.06;
  if (+t.bajo) { o.turn *= 1.06; o.max.dirt *= 0.9; o.max.grass *= 0.9; }
  if (t.aleron === 'grande') o.max.road *= 1.03;
  if (t.llantas !== 'serie') o.turn *= 1.02;
  return o;
};
// un tuneo al azar (para el tránsito y la galería del probador)
VR.tuneRandom = (m, rnd = Math.random) => {
  const t = VR.tuneDefault(m), M = VR.TUNE_MODELS[m], pick = (o) => { const k = Object.keys(o); return k[(rnd() * k.length) | 0]; };
  t.color = (rnd() * VR.TUNE_COLORS.length) | 0; t.color2 = (rnd() * VR.TUNE_COLORS.length) | 0;
  if (t.color2 === t.color) t.color2 = t.color === 11 ? 14 : 11;
  for (const p of M.parts) if (VR.TUNE_PARTS[p].opts && rnd() < 0.55) t[p] = pick(VR.TUNE_PARTS[p].opts);
  if (rnd() < 0.5) t.neon = 'no';
  t.polarizado = +t.polarizado; t.bajo = +t.bajo;
  return t;
};
VR.tuneKey = (t) => t ? [t.color, t.color2, t.franja, t.llantas, t.polarizado, t.aleron, t.techo, t.escape, t.faros, t.bajo].join('|') : '';
// neón debajo del vehículo (en px de pantalla); fuerte de noche, suave de día
VR.drawNeon = (ctx, x, y, a, len, wid, rgb, k = 1) => {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalCompositeOperation = 'lighter';
  const r = Math.max(len, wid) * 0.75, gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  gr.addColorStop(0, `rgba(${rgb},${0.55 * k})`); gr.addColorStop(0.6, `rgba(${rgb},${0.22 * k})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  ctx.scale((wid + 8) / (r * 2), (len + 8) / (r * 2)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};
