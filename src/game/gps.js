// GPS: camino más corto por la red de calles (la misma que usa el tránsito, más pasillos y calles de servicio).
// En vehículo respeta las manos únicas; a pie no. Dijkstra con montículo binario sobre ~10.000 nodos: unos ms.
'use strict';
VR.GPS = class {
  constructor(world) {
    const R = world.roads;
    this.ok = !!R;
    if (!R) return;
    const N = R.nodes.length / 2;
    this.N = N; this.nx = new Float32Array(N); this.ny = new Float32Array(N);
    for (let i = 0; i < N; i++) { this.nx[i] = R.nodes[i * 2]; this.ny[i] = R.nodes[i * 2 + 1]; }
    // adyacencia en arreglos planos: [destino, largo, ¿solo a pie?]
    const adj = Array.from({ length: N }, () => []), E = R.edges;
    for (let i = 0; i < E.length; i += 4) {
      const a = E[i], b = E[i + 1], ow = E[i + 3] === 3 ? -1 : E[i + 3];
      const kind = R.kinds[E[i + 2] & 15], surf = E[i + 2] >> 4;
      let len = Math.hypot(this.nx[b] - this.nx[a], this.ny[b] - this.ny[a]);
      if (len < 0.5) continue;
      // costo: un poco más caro el pasillo y la tierra, así prefiere las calles buenas
      const cost = len * (kind === 'service' || kind === 'living_street' ? 1.6 : 1) * (surf === VR.T.DIRTROAD ? 1.25 : 1);
      adj[a].push(b, cost, ow < 0 ? 1 : 0);
      adj[b].push(a, cost, ow > 0 ? 1 : 0);
    }
    this.adj = adj;
  }
  nearest(x, y) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < this.N; i++) {
      if (!this.adj[i].length) continue;
      const d = (this.nx[i] - x) ** 2 + (this.ny[i] - y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  // devuelve [x0, y0, x1, y1, ...] en px del mapa, desde (fx, fy) hasta (tx, ty), o null
  route(fx, fy, tx, ty, oneway) {
    if (!this.ok) return null;
    const s = this.nearest(fx, fy), g = this.nearest(tx, ty);
    if (s < 0 || g < 0) return null;
    const N = this.N, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    const heap = [], push = (d, n) => { heap.push([d, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    dist[s] = 0; push(0, s);
    while (heap.length) {
      const [d, n] = pop();
      if (d > dist[n]) continue;
      if (n === g) break;
      const A = this.adj[n];
      for (let k = 0; k < A.length; k += 3) {
        if (oneway && A[k + 2]) continue;
        const m = A[k], nd = d + A[k + 1];
        if (nd < dist[m]) { dist[m] = nd; prev[m] = n; push(nd, m); }
      }
    }
    if (dist[g] === Infinity) return oneway ? this.route(fx, fy, tx, ty, false) : null; // sin salida respetando manos: a pie
    const path = [];
    for (let n = g; n >= 0; n = prev[n]) path.push(n);
    path.reverse();
    const pts = [fx, fy];
    for (const n of path) pts.push(this.nx[n], this.ny[n]);
    pts.push(tx, ty);
    return pts;
  }
};
// largo de una polilínea [x, y, ...] desde el índice de punto i
VR.polyLen = (p, i = 0) => { let L = 0; for (let k = i * 2; k + 3 < p.length; k += 2) L += Math.hypot(p[k + 2] - p[k], p[k + 3] - p[k + 1]); return L; };
// distancia de (x, y) a la polilínea y segmento más cercano
VR.polyNear = (p, x, y) => {
  let bd = Infinity, bi = 0;
  for (let k = 0; k + 3 < p.length; k += 2) {
    const ax = p[k], ay = p[k + 1], dx = p[k + 2] - ax, dy = p[k + 3] - ay, L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
    if (d < bd) { bd = d; bi = k / 2; }
  }
  return [bd, bi];
};
