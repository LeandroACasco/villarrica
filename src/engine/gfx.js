// Herramientas de dibujo en píxeles: pintor, contorno automático y texto nítido.
'use strict';
VR.gfx = {
  // Pintor simple sobre un canvas: r = rectángulo, p = píxel.
  painter(c) {
    const x = c.getContext('2d');
    return {
      ctx: x,
      r(px, py, w, h, col) { x.fillStyle = col; x.fillRect(px, py, w, h); },
      p(px, py, col) { x.fillStyle = col; x.fillRect(px, py, 1, 1); },
    };
  },
  // Agrega un contorno de 1 px alrededor de todo lo opaco (estilo sprites de celular).
  outline(c, col) {
    const ctx = c.getContext('2d'), w = c.width, h = c.height;
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    const r = parseInt(col.slice(1, 3), 16), g = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 128;
    const mark = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) mark.push((y * w + x) * 4);
    }
    for (const i of mark) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    return c;
  },
  // contorno suave: la silueta en color, corrida r px en 8 direcciones, detrás del dibujo (para sprites suavizados)
  softOutline(c, col, r = 1) {
    const w = c.width, h = c.height, sil = VR.canvas(w, h), s = sil.getContext('2d');
    s.drawImage(c, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = col; s.fillRect(0, 0, w, h);
    const out = VR.canvas(w, h), o = out.getContext('2d');
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; o.drawImage(sil, Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)); }
    o.drawImage(c, 0, 0);
    return out;
  },
  // achica un dibujo hecho al doble (o más) con suavizado: bordes y detalles finos sin escalones
  down(c, w, h) { const o = VR.canvas(w, h), x = o.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, w, h); return o; },
  // nítido (04/11/2026): bordes sin semitransparencias (como pixel art) y un poco de realce en el color,
  // para que los vehículos achicados no se vean borrosos al lado de las personas en píxeles
  crisp(c, amount = 0.55) {
    const w = c.width, h = c.height, x = c.getContext('2d'), img = x.getImageData(0, 0, w, h), d = img.data, src = new Uint8ClampedArray(d);
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
      const i = (y * w + xx) * 4;
      if (src[i + 3] < 110) { d[i + 3] = 0; continue; }
      d[i + 3] = 255;
      for (let k = 0; k < 3; k++) {
        let s = 0, n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = xx + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = (Y * w + X) * 4; if (src[j + 3] < 110) continue; s += src[j + k]; n++; }
        if (n) d[i + k] = src[i + k] + (src[i + k] - s / n) * amount;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  },
  flipX(c) {
    const o = VR.canvas(c.width, c.height), x = o.getContext('2d');
    x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0);
    return o;
  },
  // Texto en el mundo (globos, carteles): fuente del sistema, cacheada como imagen.
  _txt: new Map(),
  textImg(str, col = '#ffffff', size = 8, bold = true) {
    const key = str + '|' + col + '|' + size + '|' + bold;
    let c = this._txt.get(key);
    if (c) return c;
    const font = (bold ? 'bold ' : '') + size + 'px "Trebuchet MS", Verdana, sans-serif';
    const m = VR.canvas(1, 1).getContext('2d'); m.font = font;
    const w = Math.ceil(m.measureText(str).width) + 2, h = size + 4;
    c = VR.canvas(w, h);
    const x = c.getContext('2d'); x.font = font; x.textBaseline = 'top'; x.fillStyle = col; x.fillText(str, 1, 1);
    if (this._txt.size > 400) this._txt.clear();
    this._txt.set(key, c);
    return c;
  },
  text(ctx, str, x, y, col = '#ffffff', opt = {}) {
    const img = this.textImg(str, col, opt.size || 8, opt.bold !== false);
    let px = Math.round(opt.center ? x - img.width / 2 : opt.right ? x - img.width : x);
    if (opt.shadow) ctx.drawImage(this.textImg(str, opt.shadow, opt.size || 8, opt.bold !== false), px + 1, Math.round(y) + 1);
    ctx.drawImage(img, px, Math.round(y));
    return img.width;
  },
};
