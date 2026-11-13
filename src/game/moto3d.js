// Moto en malla 3D (11/2026): la moto se arma con piezas redondeadas (ruedas, tubos, carenados) y se dibuja girada
// con perspectiva oblicua, en vez de apilar cortes de altura. Sin rayas ni escalones; mismo contrato que OBL.render.
// Ejes del vehículo: u = lateral (+ derecha del piloto), y = largo desde la trompa (0) hacia atrás, z = altura.
// Todo dibujo es propio; las fotos de la Fusion 125 solo sirvieron para las proporciones.
(() => {
  const O = VR.OBL; if (!O) return;
  const MESH = {};
  const rgb = (h) => { if (typeof h !== 'string') return [128, 128, 128]; if (h[0] === '#') { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; } const m = h.match(/\d+/g); return m ? [+m[0], +m[1], +m[2]] : [128, 128, 128]; };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const pl = (pts, y) => { if (y <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) { const [y0, v0] = pts[i - 1], [y1, v1] = pts[i]; return v0 + (v1 - v0) * (y - y0) / (y1 - y0); } return pts[pts.length - 1][1]; };

  class Mesh {
    constructor() { this.F = []; }
    // cara plana; ctr = un punto "adentro" del cuerpo para orientar la normal hacia afuera
    face(p, col, ctr, dec) {
      let n = [0, 0, 1]; for (let i = 1; i + 1 < p.length; i++) { const c = cross(sub(p[i], p[0]), sub(p[i + 1], p[0])); if (Math.hypot(c[0], c[1], c[2]) > 1e-9) { n = norm(c); break; } }
      const m = [0, 0, 0]; for (const q of p) { m[0] += q[0]; m[1] += q[1]; m[2] += q[2]; } m[0] /= p.length; m[1] /= p.length; m[2] /= p.length;
      const o = sub(m, ctr); if (n[0] * o[0] + n[1] * o[1] + n[2] * o[2] < 0) n = [-n[0], -n[1], -n[2]];
      const f = { p, c: rgb(col), n, m, d: dec || [] }; this.F.push(f); return f;
    }
    box(u0, u1, y0, y1, z0, z1, col) {
      const c = [(u0 + u1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], P = (u, y, z) => [u, y, z];
      const A = [P(u0, y0, z0), P(u1, y0, z0), P(u1, y1, z0), P(u0, y1, z0), P(u0, y0, z1), P(u1, y0, z1), P(u1, y1, z1), P(u0, y1, z1)];
      return [[0, 4, 7, 3], [1, 2, 6, 5], [0, 1, 5, 4], [3, 7, 6, 2], [0, 3, 2, 1], [4, 5, 6, 7]].map((q) => this.face(q.map((i) => A[i]), col, c)); // -u,+u,-y(trompa),+y(cola),-z,+z
    }
    // cuerpo por cortes a lo largo de y: fn(y) → {w: semiancho, zb, zt}; sección de caja redondeada
    loft(y0, y1, st, fn, col, N = 14, sq = 3) {
      const rings = [], ys = []; for (let y = y0; y < y1 - 1e-6; y += st) ys.push(y); ys.push(y1);
      for (const y of ys) { const { w, zb, zt } = fn(y), zc = (zb + zt) / 2, hz = (zt - zb) / 2, r = []; for (let i = 0; i < N; i++) { const t = i / N * 6.2832, c = Math.cos(t), s = Math.sin(t); r.push([w * Math.sign(c) * Math.pow(Math.abs(c), 2 / sq), y, zc + hz * Math.sign(s) * Math.pow(Math.abs(s), 2 / sq)]); } rings.push({ r, c: [0, y, zc] }); }
      for (let j = 0; j + 1 < rings.length; j++) { const A = rings[j], B = rings[j + 1], c = [0, (A.c[1] + B.c[1]) / 2, (A.c[2] + B.c[2]) / 2]; for (let i = 0; i < N; i++) { const i2 = (i + 1) % N; this.face([A.r[i], A.r[i2], B.r[i2], B.r[i]], col, c); } }
      this.face(rings[0].r, col, rings[1].c); this.face(rings[rings.length - 1].r, col, rings[rings.length - 2].c);
    }
    tube(a, b, rad, col, N = 6) {
      const d = norm(sub(b, a)), up = Math.abs(d[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1], e1 = norm(cross(d, up)), e2 = cross(d, e1), ra = [], rb = [];
      for (let i = 0; i < N; i++) { const t = i / N * 6.2832, c = Math.cos(t) * rad, s = Math.sin(t) * rad, o = [e1[0] * c + e2[0] * s, e1[1] * c + e2[1] * s, e1[2] * c + e2[2] * s]; ra.push([a[0] + o[0], a[1] + o[1], a[2] + o[2]]); rb.push([b[0] + o[0], b[1] + o[1], b[2] + o[2]]); }
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      for (let i = 0; i < N; i++) { const i2 = (i + 1) % N; this.face([ra[i], ra[i2], rb[i2], rb[i]], col, m); }
      this.face(ra, col, b); this.face(rb, col, a);
    }
    // prisma: perfil lateral [y,z] extruido entre u0 y u1 (chapas finas: guardapiernas, etc.)
    prism(prof, u0, u1, col) {
      const n = prof.length, c = [(u0 + u1) / 2, prof.reduce((a, q) => a + q[0], 0) / n, prof.reduce((a, q) => a + q[1], 0) / n];
      this.face(prof.map(([y, z]) => [u0, y, z]), col, c); this.face(prof.map(([y, z]) => [u1, y, z]), col, c);
      for (let i = 0; i < n; i++) { const a = prof[i], b = prof[(i + 1) % n]; this.face([[u0, a[0], a[1]], [u1, a[0], a[1]], [u1, b[0], b[1]], [u0, b[0], b[1]]], col, c); }
    }
    // rueda: neumático (cilindro), costados, llanta con rayos, cubo
    wheel(wy, r, rim, hw = 0.62, opt = {}) {
      const N = 22, c0 = [0, wy, r], ring = (u, rr) => { const o = []; for (let i = 0; i < N; i++) { const t = i / N * 6.2832; o.push([u, wy + Math.cos(t) * rr, r + Math.sin(t) * rr]); } return o; };
      const a = ring(-hw, r), b = ring(hw, r), a2 = ring(-hw, r * 0.96), b2 = ring(hw, r * 0.96);
      for (let i = 0; i < N; i++) { const i2 = (i + 1) % N; this.face([a[i], a[i2], b[i2], b[i]], '#17171a', c0); }
      for (const sg of [-1, 1]) {
        const u = sg * hw, dec = [], q = (rr, col, dz = 0) => ({ p: ring(u + sg * 0.01 * (1 + dz), rr), c: rgb(col) });
        dec.push(q(r * 0.8, opt.acc || '#2a2a30', 1), q(r * 0.74, rim, 2));
        const ns = opt.nsp || 7; for (let k = 0; k < ns; k++) { const t = k / ns * 6.2832 + 0.3, w = opt.nsp ? 0.13 : 0.22, P = (tt, rr) => [u + sg * 0.04, wy + Math.cos(tt) * rr, r + Math.sin(tt) * rr]; dec.push({ p: [P(t - 0.2, r * 0.2), P(t - w, r * 0.7), P(t + w, r * 0.7), P(t + 0.2, r * 0.2)], c: rgb(opt.spoke || '#26262a') }); }
        dec.push({ p: ring(u + sg * 0.05, r * 0.2), c: rgb('#3a3a40') }, { p: ring(u + sg * 0.06, r * 0.09), c: rgb('#d8dce4') });
        this.face(sg < 0 ? a : b, '#17171a', [0, wy, r], dec);
      }
    }
  }

  // ---------- Mbojoaju 125 (underbone tipo Fusion 125) ----------
  MESH.cub = (pal, t = {}) => {
    const C = pal[0], M = new Mesh(), DK = '#26262a', SEAT = '#1e1e22', CH = '#b0b4bc', ENG = '#4a4e56';
    const rim = VR.RIMS ? VR.RIMS[t.llantas || 'serie'] : '#8a8e96', S2 = VR.tunePal && t.franja && t.franja !== 'no' ? VR.tunePal(t.color2 ?? 11)[0] : null;
    // ruedas
    M.wheel(3.2, 3.1, rim); M.wheel(17.3, 3.1, rim);
    // disco y pinza delanteros
    for (const sg of [-1, 1]) M.face(((u) => { const o = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832; o.push([u, 3.2 + Math.cos(a) * 1.25, 3.1 + Math.sin(a) * 1.25]); } return o; })(sg * 0.7), '#b8bcc6', [0, 3.2, 3.1]);
    M.box(0.72, 1.1, 3.9, 4.7, 2.4, 3.7, '#d8302a');
    // guardabarros delantero (arco concéntrico a la rueda)
    const fz = (y) => 3.1 + Math.sqrt(Math.max(0, 4.1 * 4.1 - (y - 3.2) * (y - 3.2)));
    M.loft(1.1, 5.6, 0.4, (y) => ({ w: pl([[1.1, 0.9], [3.2, 1.7], [5.6, 1.6]], y), zb: fz(y) - 0.5, zt: fz(y) }), C, 10);
    // horquilla (dos botellas) y manubrio
    for (const sg of [-1, 1]) M.tube([sg * 1.0, 3.2, 3.1], [sg * 1.0, 6.9, 11.0], 0.24, CH);
    // escudo tipo underbone: pared delantera finita + dos guardapiernas en chapa; el medio queda abierto (el tanque va debajo del asiento)
    M.loft(5.6, 6.5, 0.3, (y) => ({ w: pl([[5.6, 1.7], [6.5, 2.0]], y), zb: pl([[5.6, 5.4], [6.5, 5.3]], y), zt: pl([[5.6, 9.2], [6.5, 10.0]], y) }), C, 14, 2.6);
    for (const sg of [-1, 1]) M.prism([[5.5, 2.8], [5.3, 8.2], [6.9, 8.8], [8.2, 7.1], [9.3, 6.0], [9.4, 2.4], [7.6, 2.3]], sg > 0 ? 1.65 : -2.25, sg > 0 ? 2.25 : -1.65, C);
    M.tube([0, 7.6, 9.3], [0, 10.2, 4.5], 0.55, '#2e2f35', 8);                                                                      // columna del chasis (se ve entre las piernas)
    // cabeza (tapa del manubrio) en cuña, como la Fusion: angosta adelante, con el faro trapezoidal inclinado
    M.loft(6.0, 8.3, 0.3, (y) => ({ w: pl([[6.0, 1.25], [6.9, 1.75], [8.3, 1.9]], y), zb: pl([[6.0, 9.9], [8.3, 10.0]], y), zt: pl([[6.0, 11.3], [7.0, 12.1], [8.3, 11.7]], y) }), C, 14, 2.4);
    const lamp = M.face([[-1.05, 5.97, 11.3], [1.05, 5.97, 11.3], [0.62, 5.97, 10.2], [-0.62, 5.97, 10.2]], '#c9d6e6', [0, 7.1, 10.2]);   // marco plateado del faro
    lamp.d.push({ p: [[-0.9, 5.95, 11.15], [0.9, 5.95, 11.15], [0.52, 5.95, 10.35], [-0.52, 5.95, 10.35]], c: rgb(t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0') }, { p: [[-0.3, 5.93, 10.9], [0.3, 5.93, 10.9], [0.3, 5.93, 10.6], [-0.3, 5.93, 10.6]], c: rgb('#8a7a40') });
    // cara negra del escudo con las luces de posición en las puntas, como la Fusion
    const cara = M.face([[-1.6, 5.58, 9.3], [1.6, 5.58, 9.3], [1.15, 5.58, 7.4], [-1.15, 5.58, 7.4]], '#14161c', [0, 8, 7]);
    for (const sg of [-1, 1]) cara.d.push({ p: [[sg * 1.5, 5.56, 9.1], [sg * 1.15, 5.56, 8.9], [sg * 1.0, 5.56, 8.2], [sg * 1.3, 5.56, 8.5]], c: rgb('#cfe4ff') });
    for (const sg of [-1, 1]) M.tube([sg * 2.1, 6.4, 6.9], [sg * 2.6, 6.5, 6.9], 0.32, '#f0a020', 6);                              // luces de giro ámbar
    // manubrio, puños y espejos grandes con vidrio oscuro
    M.tube([-2.9, 7.9, 11.2], [2.9, 7.9, 11.2], 0.2, DK);
    for (const sg of [-1, 1]) {
      M.tube([sg * 2.3, 7.9, 11.2], [sg * 3.1, 7.9, 11.2], 0.34, '#101012'); M.tube([sg * 2.5, 7.9, 11.3], [sg * 2.9, 8.1, 13.0], 0.1, DK, 4);
      const mir = M.box(sg > 0 ? 2.5 : -3.4, sg > 0 ? 3.4 : -2.5, 8.0, 8.3, 13.0, 14.3, C); mir[3].d.push({ p: [[sg * 2.65, 8.32, 13.15], [sg * 3.25, 8.32, 13.15], [sg * 3.25, 8.32, 14.15], [sg * 2.65, 8.32, 14.15]].map((q) => q), c: rgb('#1b2230') });
    }
    M.box(-1.3, 1.3, 7.9, 8.9, 10.4, 11.3, '#1c1d22')[5].d.push({ p: [[-0.8, 8.1, 11.32], [0.8, 8.1, 11.32], [0.8, 8.7, 11.32], [-0.8, 8.7, 11.32]], c: rgb('#6f93c4') }); // tablero
    // piso, motor, chasis y brazo oscilante
    M.box(-2.2, 2.2, 8.8, 11.2, 5.4, 6.3, '#3a3a40');
    const eng = M.box(-1.7, 1.7, 8.6, 13.2, 1.5, 4.6, ENG);
    for (const sg of [-1, 1]) { const u = sg * 1.72, circ = (r) => { const o = []; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832; o.push([u, 11.2 + Math.cos(a) * r, 3 + Math.sin(a) * r]); } return o; }; eng[sg < 0 ? 0 : 1].d.push({ p: circ(1.05), c: rgb('#c8ccd4') }, { p: circ(0.6), c: rgb('#6a6e76') }); }
    M.box(-0.7, 0.7, 8.8, 17, 3.7, 4.5, DK);
    for (const sg of [-1, 1]) { M.tube([sg * 1.2, 13.0, 3.3], [sg * 1.2, 17.3, 3.2], 0.3, DK); M.tube([sg * 1.9, 15.4, 4.4], [sg * 1.9, 17.6, 7.6], 0.2, '#9aa0a8', 5); }
    // tapas laterales, asiento y cola
    M.loft(11.4, 18.8, 0.5, (y) => ({ w: pl([[11.4, 1.7], [13, 2.0], [17, 2.0], [18.8, 1.7]], y), zb: pl([[11.4, 4.4], [14, 4.6], [15.4, 6.7], [18.8, 6.9]], y), zt: 7.5 }), C, 14, 3);
    M.loft(10.8, 19.4, 0.5, (y) => { const zt = pl([[10.8, 8.9], [13, 9.2], [15.5, 9.5], [19, 9.6], [19.4, 9.2]], y); return { w: pl([[10.8, 1.6], [13, 2.05], [17, 2.1], [19.4, 1.8]], y), zb: pl([[10.8, 6.7], [14, 7.4], [19.4, 7.9]], y), zt }; }, SEAT, 14, 2.6);
    const rz = (y) => 3.1 + Math.sqrt(Math.max(0, 3.6 * 3.6 - (y - 17.3) * (y - 17.3)));
    M.loft(15.2, 20.2, 0.4, (y) => ({ w: 1.15, zb: rz(y) - 0.4, zt: rz(y) }), C, 10); // guardabarros trasero
    M.loft(17.8, 21, 0.5, (y) => ({ w: pl([[17.8, 2.0], [21, 1.5]], y), zb: pl([[17.8, 6.0], [21, 7.0]], y), zt: pl([[17.8, 7.6], [21, 8.4]], y) }), C, 12, 2.6);
    M.face([[-0.9, 21.02, 7.2], [0.9, 21.02, 7.2], [0.9, 21.02, 8.1], [-0.9, 21.02, 8.1]], '#e8302a', [0, 19.5, 7.7]);
    for (const sg of [-1, 1]) M.box(sg > 0 ? 1.0 : -1.5, sg > 0 ? 1.5 : -1.0, 20.95, 21.15, 7.4, 8.0, '#f0a020');
    M.prism([[20.0, 7.3], [21.9, 5.3], [21.9, 4.8], [19.8, 6.6]], -1.0, 1.0, '#1a1b20');
    // parrilla trasera cromada
    for (const sg of [-1, 1]) M.tube([sg * 1.55, 18.4, 9.9], [sg * 1.55, 21.3, 9.9], 0.2, CH, 5); M.tube([-1.55, 21.3, 9.9], [1.55, 21.3, 9.9], 0.2, CH, 5);
    // escape cromado (solo del lado derecho) con su codo
    const e0 = t.escape === 'deportivo' ? 15.6 : 14.4;
    M.tube([1.6, 12.6, 2.2], [2.2, e0, 3.0], 0.28, '#8a8e96', 5);
    M.tube([2.2, e0, 3.0], [2.2, 20.8, 3.3], t.escape === 'deportivo' ? 0.68 : 0.8, t.escape === 'deportivo' ? '#aab0b8' : '#d8dce4', 8);
    // franja de tuning
    if (S2) for (const sg of [-1, 1]) M.box(sg > 0 ? 1.95 : -2.1, sg > 0 ? 2.1 : -1.95, 11.8, 18.4, 5.6, 6.2, S2);
    return M.F;
  };

  // ---------- Yvytu GT 150 (moto de calle: tanque grande, faro redondo con parabrisas, escape largo) ----------
  MESH.calle = (pal, t = {}) => {
    const C = pal[0], M = new Mesh(), DK = '#26262a', SEAT = '#1c1c20', CH = '#b0b4bc', BLK = '#15161a', SIL = '#7d828a';
    const rim = t.llantas && VR.RIMS ? VR.RIMS[t.llantas] : '#2c2e34', S2 = VR.tunePal && t.franja && t.franja !== 'no' ? VR.tunePal(t.color2 ?? 11)[0] : null;
    const FW = 3.1, RW = 17.0, circ = (u, y, z, r, n = 18, plane = 'y') => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * 6.2832; o.push(plane === 'y' ? [u + Math.cos(a) * r, y, z + Math.sin(a) * r] : [u, y + Math.cos(a) * r, z + Math.sin(a) * r]); } return o; };
    const wo = { spoke: '#7a7e88', acc: '#5bd13a', nsp: 10 };
    M.wheel(FW, 3.1, rim, 0.5, wo); M.wheel(RW, 3.1, rim, 0.55, wo);
    M.face(circ(0.62, FW, 3.1, 1.5, 18, 'x'), '#b8bcc6', [0, FW, 3.1]); M.box(0.7, 1.1, FW + 0.7, FW + 1.6, 1.9, 3.2, '#d8302a');   // disco y pinza (derecha)
    const fz = (y) => 3.1 + Math.sqrt(Math.max(0, 3.6 * 3.6 - (y - FW) * (y - FW)));
    M.loft(1.1, 5.2, 0.35, (y) => ({ w: pl([[1.1, 0.9], [3.1, 1.3], [5.2, 1.2]], y), zb: fz(y) - 0.4, zt: fz(y) }), C, 10);               // guardabarros
    for (const sg of [-1, 1]) { M.tube([sg * 0.95, FW, 3.1], [sg * 0.95, 6.5, 8.8], 0.3, '#a6aab2'); M.tube([sg * 0.95, 4.6, 5.6], [sg * 0.95, 6.5, 8.8], 0.36, '#6a6e76'); } // horquilla
    M.box(-1.1, 1.1, 6.3, 6.9, 8.6, 9.1, BLK);
    M.loft(4.4, 6.3, 0.35, () => ({ w: 1.0, zb: 8.2, zt: 10.2 }), BLK, 16, 2);                                                         // cubeta del faro
    const lamp = M.face(circ(0, 4.38, 9.2, 0.98, 20), '#e8eef8', [0, 5.4, 9.2]);
    lamp.d.push({ p: circ(0, 4.36, 9.2, 0.76, 20), c: rgb('#2a2e38') }, { p: circ(0, 4.34, 9.2, 0.6, 20), c: rgb(t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0') }, { p: circ(0, 4.32, 9.2, 0.25, 12), c: rgb('#8a7a40') });
    M.prism([[4.6, 10.0], [5.9, 11.7], [6.1, 11.6], [4.8, 9.9]], -1.25, 1.25, '#4a382e');                                              // parabrisas ahumado
    for (const sg of [-1, 1]) M.box(sg > 0 ? 1.2 : -1.75, sg > 0 ? 1.75 : -1.2, 5.0, 5.6, 8.35, 8.65, '#f0a020');                      // luces de giro
    const cl = M.box(-1.35, 1.35, 6.2, 7.3, 9.4, 10.3, '#1c1d22'); for (const sg of [-1, 1]) cl[3].d.push({ p: circ(sg * 0.68, 7.32, 9.85, 0.42, 14), c: rgb('#2a3a5a') }); // dos relojes
    M.tube([-2.2, 7.6, 10.1], [0, 7.0, 9.6], 0.2, CH, 5); M.tube([0, 7.0, 9.6], [2.2, 7.6, 10.1], 0.2, CH, 5);                         // manubrio cromado
    for (const sg of [-1, 1]) {
      M.tube([sg * 2.2, 7.6, 10.1], [sg * 2.9, 8.3, 10.6], 0.2, CH, 5); M.tube([sg * 2.3, 8.3, 10.6], [sg * 3.1, 8.4, 10.6], 0.32, '#101012');
      M.tube([sg * 2.6, 8.2, 10.7], [sg * 3.0, 7.9, 12.3], 0.1, DK, 4);
      const mir = M.box(sg > 0 ? 2.45 : -3.45, sg > 0 ? 3.45 : -2.45, 7.55, 7.85, 12.2, 13.8, '#1a1a1e'); mir[3].d.push({ p: [[sg * 2.6, 7.87, 12.4], [sg * 3.3, 7.87, 12.4], [sg * 3.3, 7.87, 13.6], [sg * 2.6, 7.87, 13.6]], c: rgb('#3a4048') });
    }
    M.loft(7.1, 12.5, 0.4, (y) => ({ w: pl([[7.1, 1.05], [8.5, 1.45], [11, 1.5], [12.5, 1.15]], y), zb: 7.1, zt: pl([[7.1, 9.0], [8.5, 9.55], [11, 9.5], [12.5, 8.7]], y) }), C, 14, 2.6); // tanque grande
    M.loft(12.0, 19.8, 0.5, (y) => { const zt = pl([[12, 8.5], [14.5, 8.1], [17, 8.4], [19.8, 8.9]], y); return { w: pl([[12, 1.0], [14, 1.5], [19.8, 1.95]], y), zb: zt - 1.3, zt }; }, SEAT, 14, 2.6); // asiento
    M.loft(14.2, 19.6, 0.5, (y) => ({ w: pl([[14.2, 1.45], [19.6, 1.3]], y), zb: pl([[14.2, 6.0], [19.6, 6.8]], y), zt: pl([[14.2, 8.0], [19.6, 8.5]], y) }), C, 12, 3);
    M.prism([[18.6, 7.6], [20.7, 5.1], [20.2, 4.8], [18.4, 6.9]], -0.9, 0.9, '#1a1b20');
    M.face([[-0.9, 20.8, 6.9], [0.9, 20.8, 6.9], [0.9, 20.8, 7.7], [-0.9, 20.8, 7.7]], '#e8302a', [0, 19, 7.3]);
    for (const sg of [-1, 1]) M.box(sg > 0 ? 1.5 : -2.1, sg > 0 ? 2.1 : -1.5, 19.6, 20.0, 7.7, 8.1, '#f0a020');
    for (const sg of [-1, 1]) M.tube([sg * 1.7, 16.6, 9.1], [sg * 1.7, 20.6, 9.1], 0.18, BLK, 5); M.tube([-1.7, 20.6, 9.1], [1.7, 20.6, 9.1], 0.18, BLK, 5); M.tube([-1.7, 17.8, 9.1], [1.7, 17.8, 9.1], 0.15, BLK, 5); // parrilla
    for (const sg of [-1, 1]) { M.tube([sg * 0.95, 6.9, 9.0], [sg * 1.0, 8.6, 4.0], 0.34, BLK, 6); M.prism([[11.4, 6.6], [14.6, 6.9], [15.0, 4.3], [12.2, 3.9]], sg > 0 ? 1.15 : -1.35, sg > 0 ? 1.35 : -1.15, BLK); }
    M.box(-0.85, 0.85, 9.0, 11.2, 4.2, 6.8, '#3c3e44'); M.box(-0.95, 0.95, 9.2, 11.0, 6.6, 7.0, '#2a2c30');                         // cilindro
    const cc = M.box(-1.4, 1.4, 9.1, 13.0, 1.6, 4.2, SIL); cc[1].d.push({ p: circ(1.42, 11.3, 2.9, 1.0, 16, 'x'), c: rgb('#b4b8c0') }, { p: circ(1.44, 11.3, 2.9, 0.55, 12, 'x'), c: rgb('#5a5e66') });
    M.tube([1.4, 8.1, 5.2], [1.4, 8.3, 2.2], 0.22, CH, 5); M.tube([1.4, 8.3, 2.2], [1.4, 11.2, 2.0], 0.22, CH, 5);                    // defensa cromada
    for (const sg of [-1, 1]) { M.tube([sg * 1.2, 13.4, 3.3], [sg * 1.2, RW, 3.2], 0.3, '#7a7e86'); M.tube([sg * 1.9, 14.9, 6.5], [sg * 1.9, 15.9, 3.9], 0.22, '#2a2a2e', 6); }
    const mu = (sg, r) => { M.tube([sg * 1.5, 9.4, 4.0], [sg * 1.8, 11.4, 2.3], 0.3, CH, 5); M.tube([sg * 1.8, 11.4, 2.3], [sg * 2.0, 13.4, 2.5], 0.3, CH, 5); M.tube([sg * 2.0, 13.2, 2.6], [sg * 2.0, 18.2, 4.3], r, '#d8dce4', 8); };
    mu(1, 0.66); if (t.escape === 'deportivo') mu(-1, 0.6);
    if (S2) for (const sg of [-1, 1]) M.box(sg > 0 ? 1.4 : -1.6, sg > 0 ? 1.6 : -1.4, 8.2, 11.2, 8.0, 8.5, S2);
    return M.F;
  };

  // ---------- Tatu 110 (mini moto de ruedas gordas tipo Bravo 150: tanque cuadrado, faro vertical, parabrisas, parrilla) ----------
  MESH.mini = (pal, t = {}) => {
    const C = pal[0], M = new Mesh(), BLK = '#26272c', GR = '#5a5d65', CH = '#b0b4bc';
    const rim = t.llantas && VR.RIMS ? VR.RIMS[t.llantas] : '#3a3d44', S2 = VR.tunePal && t.franja && t.franja !== 'no' ? VR.tunePal(t.color2 ?? 11)[0] : null;
    const FW = 2.2, RW = 14.1, R = 2.2, circ = (u, y, z, r, n = 18, plane = 'y') => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * 6.2832; o.push(plane === 'y' ? [u + Math.cos(a) * r, y, z + Math.sin(a) * r] : [u, y + Math.cos(a) * r, z + Math.sin(a) * r]); } return o; };
    const wo = { spoke: '#9096a0', nsp: 5 };
    M.wheel(FW, R, rim, 0.56, wo); M.wheel(RW, R, rim, 0.58, wo);
    M.face(circ(0.6, FW, R, 1.05, 16, 'x'), '#b8bcc6', [0, FW, R]);                                                             // disco delantero
    const fz = (y) => R + Math.sqrt(Math.max(0, 2.85 * 2.85 - (y - FW) * (y - FW)));
    M.loft(0.6, 4.4, 0.3, (y) => ({ w: pl([[0.6, 0.8], [2.2, 1.05], [4.4, 1.0]], y), zb: fz(y) - 0.3, zt: fz(y) }), C, 10);           // guardabarros azul
    for (const sg of [-1, 1]) { M.tube([sg * 0.95, FW, R], [sg * 0.95, 5.0, 7.7], 0.3, BLK); M.tube([sg * 0.95, 3.2, 4.6], [sg * 0.95, 4.6, 7.0], 0.4, '#2a2b2f', 8); } // horquilla con resortes
    // faro vertical con rejilla, aro negro y luces de giro ámbar
    M.loft(2.9, 4.6, 0.3, () => ({ w: 0.8, zb: 6.8, zt: 8.7 }), C, 12, 2.6);
    const lamp = M.face([[-0.65, 2.87, 8.55], [0.65, 2.87, 8.55], [0.65, 2.87, 6.95], [-0.65, 2.87, 6.95]], '#cfd6e0', [0, 3.8, 7.7]);
    lamp.d.push({ p: [[-0.5, 2.85, 8.4], [0.5, 2.85, 8.4], [0.5, 2.85, 7.1], [-0.5, 2.85, 7.1]], c: rgb(t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0') }, { p: [[-0.5, 2.83, 7.8], [0.5, 2.83, 7.8], [0.5, 2.83, 7.7], [-0.5, 2.83, 7.7]], c: rgb('#5a5d65') });
    for (const sg of [-1, 1]) M.box(sg > 0 ? 1.1 : -1.9, sg > 0 ? 1.9 : -1.1, 3.2, 3.8, 7.5, 8.1, '#f0a020');
    M.prism([[3.2, 8.8], [4.6, 11.0], [4.8, 10.9], [3.4, 8.7]], -1.1, 1.1, '#1d1e22');                                             // parabrisas oscuro
    // manubrio negro, puños y espejos
    M.tube([-1.4, 5.8, 9.5], [0, 5.4, 8.9], 0.2, BLK, 5); M.tube([0, 5.4, 8.9], [1.4, 5.8, 9.5], 0.2, BLK, 5);
    for (const sg of [-1, 1]) {
      M.tube([sg * 1.4, 5.8, 9.5], [sg * 2.7, 6.4, 10.1], 0.2, BLK, 5); M.tube([sg * 2.2, 6.4, 10.1], [sg * 3.0, 6.5, 10.1], 0.3, '#101012');
      M.tube([sg * 2.6, 6.4, 10.2], [sg * 2.9, 6.2, 11.6], 0.1, '#2a2a2e', 4);
      const mir = M.box(sg > 0 ? 2.35 : -3.35, sg > 0 ? 3.35 : -2.35, 6.1, 6.4, 11.5, 12.9, '#1a1a1e'); mir[3].d.push({ p: [[sg * 2.5, 6.42, 11.7], [sg * 3.2, 6.42, 11.7], [sg * 3.2, 6.42, 12.7], [sg * 2.5, 6.42, 12.7]], c: rgb('#8a929c') });
    }
    // tanque cuadrado, banda gris, asiento plano y parrilla
    M.loft(5.0, 11.4, 0.4, (y) => ({ w: pl([[5.0, 1.2], [6.5, 1.65], [10, 1.7], [11.4, 1.3]], y), zb: pl([[5.0, 6.2], [11.4, 5.3]], y), zt: pl([[5.0, 8.2], [6.5, 8.4], [9, 8.3], [11.4, 7.9]], y) }), C, 14, 3.2);
    for (const sg of [-1, 1]) M.prism([[13.4, 7.0], [13.6, 6.0], [10.4, 4.3], [6.0, 4.7], [6.0, 5.4], [10.4, 5.1]], sg > 0 ? 1.45 : -1.95, sg > 0 ? 1.95 : -1.45, GR);
    M.loft(8.9, 15.4, 0.5, (y) => ({ w: pl([[8.9, 0.9], [11, 1.3], [15.4, 1.7]], y), zb: 6.9, zt: pl([[8.9, 8.1], [11, 7.9], [15.4, 7.9]], y) }), BLK, 14, 2.6);
    M.box(-1.5, 1.5, 15.0, 16.8, 8.0, 8.4, '#2a2b2f');
    for (const sg of [-1, 1]) M.tube([sg * 1.75, 11.8, 8.2], [sg * 1.75, 16.6, 8.2], 0.18, BLK, 5); M.tube([-1.75, 16.6, 8.2], [1.75, 16.6, 8.2], 0.18, BLK, 5);
    M.face([[-0.8, 16.9, 7.0], [0.8, 16.9, 7.0], [0.8, 16.9, 7.8], [-0.8, 16.9, 7.8]], '#c42a2a', [0, 15, 7.4]);                      // farol trasero
    for (const sg of [-1, 1]) M.box(sg > 0 ? 1.7 : -2.4, sg > 0 ? 2.4 : -1.7, 15.5, 16.0, 5.6, 6.1, '#f0a020');
    // caja negra de abajo (batería/caja), motor, pedaleras y guardabarros trasero
    M.box(-1.45, 1.45, 5.4, 8.6, 2.7, 5.8, '#33343a'); M.box(-1.3, 1.3, 4.0, 5.4, 2.3, 4.2, '#3c3d43');
    const en = M.box(-1.2, 1.2, 9.2, 12.8, 1.8, 3.8, '#44464c'); en[1].d.push({ p: circ(1.22, 11.6, 2.6, 0.8, 14, 'x'), c: rgb('#8a8e96') });
    M.box(-1.3, 1.3, 5.6, 10.0, 2.1, 2.5, '#33343a');
    for (const sg of [-1, 1]) M.box(sg > 0 ? 1.3 : -2.4, sg > 0 ? 2.4 : -1.3, 7.0, 8.2, 2.4, 2.8, '#33343a');
    const rz = (y) => R + Math.sqrt(Math.max(0, 3.0 * 3.0 - (y - RW) * (y - RW)));
    M.loft(12.4, 16.1, 0.4, (y) => ({ w: 1.2, zb: rz(y) - 0.4, zt: rz(y) }), '#2a2b30', 10);
    for (const sg of [-1, 1]) { M.tube([sg * 1.2, 13.6, 6.0], [sg * 1.2, 14.2, 3.6], 0.22, '#c82828', 6); M.tube([sg * 1.15, 11.0, 2.3], [sg * 1.15, RW, R], 0.3, '#17181b'); }
    const mu = (sg) => { M.tube([sg * 1.4, 10.6, 2.6], [sg * 1.8, 11.6, 2.4], 0.3, CH, 5); M.tube([sg * 1.9, 11.4, 2.4], [sg * 2.0, 15.6, 3.9], 0.56, t.escape === 'deportivo' ? '#d8dce4' : '#2a2b30', 8); };
    mu(1); if (t.escape === 'deportivo') mu(-1);
    if (S2) for (const sg of [-1, 1]) M.box(sg > 0 ? 1.6 : -1.8, sg > 0 ? 1.8 : -1.6, 7.0, 10.4, 6.9, 7.4, S2);
    return M.F;
  };

  // ---------- dibujo ----------
  const L = norm([-0.38, -0.48, 0.8]);
  const meshRender = (base, a, B, F) => {
    const P = base.prof, k = base.height / P.L, kz = O.kz, sa = Math.sin(a), ca = Math.cos(a), hl = P.L / 2;
    const out = VR.canvas(B, B), g = out.getContext('2d'); g.lineJoin = 'round'; g.lineWidth = Math.max(0.6, k * 0.07);
    const pr = (p) => { const dy = p[1] - hl, gx = p[0] * ca - dy * sa, gy = p[0] * sa + dy * ca; return [B / 2 + gx * k, B / 2 + (gy - p[2] * kz) * k, gy * kz + p[2]]; };
    const vis = [];
    for (const f of F) {
      const nx = f.n[0] * ca - f.n[1] * sa, ny = f.n[0] * sa + f.n[1] * ca, nz = f.n[2];
      if (ny * kz + nz < -0.02) continue;
      const lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]), sh = 0.5 + 0.62 * lam;
      vis.push({ f, sh, key: pr(f.m)[2] });
    }
    vis.sort((x, y) => x.key - y.key);
    const paint = (p, c, sh) => {
      const s = `rgb(${Math.min(255, c[0] * sh) | 0},${Math.min(255, c[1] * sh) | 0},${Math.min(255, c[2] * sh) | 0})`;
      g.fillStyle = s; g.strokeStyle = s; g.beginPath();
      for (let i = 0; i < p.length; i++) { const q = pr(p[i]); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
      g.closePath(); g.fill(); g.stroke();
    };
    for (const { f, sh } of vis) { paint(f.p, f.c, sh); for (const d of f.d) paint(d.p, d.c, sh); }
    return out;
  };

  const r0 = O.render;
  O.render = (base, a, B) => (base.prof && base.prof.mesh ? meshRender(base, a, B, base.prof.mesh) : r0(base, a, B));
  const m0 = O.moto;
  O.moto = (m, pal, t) => { const p = m0(m, pal, t); if (MESH[m]) p.mesh = MESH[m](pal, t || {}); return p; };
})();
