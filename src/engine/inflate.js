// Descompresor DEFLATE (reutilizado del repo gangstar) para leer el mapa comprimido.
// Minimal synchronous DEFLATE decoder (RFC 1951) + zip + PNG decoding.
const Inflate = (() => {
  const LBASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  const LEXT  = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const DBASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  const DEXT  = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  const CLORD = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];

  function buildTree(lengths, n) {
    const counts = new Uint16Array(16), offs = new Uint16Array(16), syms = new Uint16Array(n);
    for (let i = 0; i < n; i++) counts[lengths[i]]++;
    counts[0] = 0;
    for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + counts[i - 1];
    for (let i = 0; i < n; i++) if (lengths[i]) syms[offs[lengths[i]]++] = i;
    return { counts, syms };
  }
  let fixedL = null, fixedD = null;
  function fixed() {
    if (fixedL) return;
    const l = new Uint8Array(288);
    for (let i = 0; i < 144; i++) l[i] = 8;
    for (let i = 144; i < 256; i++) l[i] = 9;
    for (let i = 256; i < 280; i++) l[i] = 7;
    for (let i = 280; i < 288; i++) l[i] = 8;
    fixedL = buildTree(l, 288);
    const d = new Uint8Array(30).fill(5);
    fixedD = buildTree(d, 30);
  }

  function inflateRaw(src, start = 0, sizeHint = 0) {
    let pos = start, bitbuf = 0, bitcnt = 0;
    let out = new Uint8Array(Math.max(sizeHint, src.length * 4, 1024)), op = 0;
    const ensure = (n) => {
      if (op + n <= out.length) return;
      let nl = out.length * 2; while (nl < op + n) nl *= 2;
      const o = new Uint8Array(nl); o.set(out.subarray(0, op)); out = o;
    };
    const bits = (n) => {
      while (bitcnt < n) { bitbuf |= (src[pos++] | 0) << bitcnt; bitcnt += 8; }
      const v = bitbuf & ((1 << n) - 1); bitbuf >>>= n; bitcnt -= n; return v;
    };
    const decode = (t) => {
      let code = 0, first = 0, index = 0;
      for (let len = 1; len < 16; len++) {
        code |= bits(1);
        const count = t.counts[len];
        if (code - count < first) return t.syms[index + (code - first)];
        index += count; first += count; first <<= 1; code <<= 1;
      }
      throw new Error('bad huffman code');
    };
    let final = 0;
    do {
      final = bits(1);
      const type = bits(2);
      if (type === 0) {
        bitbuf = 0; bitcnt = 0;
        const len = src[pos] | (src[pos + 1] << 8); pos += 4;
        ensure(len); out.set(src.subarray(pos, pos + len), op); op += len; pos += len;
      } else {
        let lt, dt;
        if (type === 1) { fixed(); lt = fixedL; dt = fixedD; }
        else {
          const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
          const cl = new Uint8Array(19);
          for (let i = 0; i < hclen; i++) cl[CLORD[i]] = bits(3);
          const ct = buildTree(cl, 19);
          const lens = new Uint8Array(hlit + hdist);
          for (let i = 0; i < hlit + hdist;) {
            const sym = decode(ct);
            if (sym < 16) lens[i++] = sym;
            else if (sym === 16) { const p = lens[i - 1]; let r = 3 + bits(2); while (r--) lens[i++] = p; }
            else if (sym === 17) { let r = 3 + bits(3); while (r--) lens[i++] = 0; }
            else { let r = 11 + bits(7); while (r--) lens[i++] = 0; }
          }
          lt = buildTree(lens.subarray(0, hlit), hlit);
          dt = buildTree(lens.subarray(hlit), hdist);
        }
        for (;;) {
          const sym = decode(lt);
          if (sym < 256) { ensure(1); out[op++] = sym; }
          else if (sym === 256) break;
          else {
            const li = sym - 257;
            const len = LBASE[li] + bits(LEXT[li]);
            const di = decode(dt);
            const dist = DBASE[di] + bits(DEXT[di]);
            ensure(len);
            for (let k = 0; k < len; k++) { out[op] = out[op - dist]; op++; }
          }
        }
      }
    } while (!final);
    return out.subarray(0, op);
  }
  return { inflateRaw };
})();
