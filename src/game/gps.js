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
  // punto de calle más cercano a (x, y) (a menos de r px): {a, b: nodos del tramo, px, py: punto proyectado, d: distancia} o null.
  // Lo usa el Mbohasa para frenar junto a donde estás (los nodos pueden quedar a 200 px de distancia unos de otros).
  nearEdge(x, y, r) {
    let best = null, bd = r * r;
    for (let i = 0; i < this.N; i++) {
      const A = this.adj[i], ax = this.nx[i], ay = this.ny[i];
      for (let k = 0; k < A.length; k += 3) {
        if (A[k + 2]) continue; // mano contraria: ese sentido no va (el otro sentido del mismo tramo sí)
        const m = A[k], dx = this.nx[m] - ax, dy = this.ny[m] - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
        const px = ax + dx * t, py = ay + dy * t, d2 = (px - x) ** 2 + (py - y) ** 2;
        if (d2 < bd) { bd = d2; best = { a: i, b: m, px, py, d: Math.sqrt(d2) }; }
      }
    }
    return best;
  }
  // devuelve [x0, y0, x1, y1, ...] en px del mapa, desde (fx, fy) hasta (tx, ty), o null.
  // 19/11/2026: el camino arranca y termina SOBRE la calle (punto proyectado en el tramo más cercano, con los dos extremos del tramo como
  // salidas posibles), en vez de ir hasta el nodo más cercano, que podía quedar atrás o a 200 px.
  route(fx, fy, tx, ty, oneway) {
    if (!this.ok) return null;
    const S = this.nearEdge(fx, fy, 160), G = this.nearEdge(tx, ty, 160), s = this.nearest(fx, fy), g = this.nearest(tx, ty);
    if (s < 0 || g < 0) return null;
    if (S && G && ((S.a === G.a && S.b === G.b) || (S.a === G.b && S.b === G.a))) return [fx, fy, S.px, S.py, G.px, G.py, tx, ty]; // el mismo tramo
    const N = this.N, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    const heap = [], push = (d, n) => { heap.push([d, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    for (const [n, d0] of S ? [[S.a, Math.hypot(S.px - this.nx[S.a], S.py - this.ny[S.a])], [S.b, Math.hypot(S.px - this.nx[S.b], S.py - this.ny[S.b])]] : [[s, 0]]) if (d0 < dist[n]) { dist[n] = d0; push(d0, n); }
    const goals = G ? [G.a, G.b] : [g], left = new Set(goals);
    while (heap.length && left.size) {
      const [d, n] = pop();
      if (d > dist[n]) continue;
      left.delete(n);
      const A = this.adj[n];
      for (let k = 0; k < A.length; k += 3) {
        if (oneway && A[k + 2]) continue;
        const m = A[k], nd = d + A[k + 1];
        if (nd < dist[m]) { dist[m] = nd; prev[m] = n; push(nd, m); }
      }
    }
    let gn = -1, best = Infinity;
    for (const n of goals) { const t = dist[n] + (G ? Math.hypot(G.px - this.nx[n], G.py - this.ny[n]) : 0); if (t < best) { best = t; gn = n; } }
    if (gn < 0 || best === Infinity) return oneway ? this.route(fx, fy, tx, ty, false) : null; // sin salida respetando manos: a pie
    const path = [];
    for (let n = gn; n >= 0; n = prev[n]) path.push(n);
    path.reverse();
    const pts = [fx, fy];
    if (S) pts.push(S.px, S.py);
    for (const n of path) pts.push(this.nx[n], this.ny[n]);
    if (G) pts.push(G.px, G.py);
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
