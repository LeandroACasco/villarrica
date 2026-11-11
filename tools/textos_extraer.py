#!/usr/bin/env python3
"""Extrae los textos del juego (diálogos, carteles, avisos) a textos.json para revisarlos.
Cada texto se identifica por archivo + literal original + número de aparición, así tools/textos_aplicar.py
puede reemplazarlo aunque cambien los números de línea. Uso: python3 tools/textos_extraer.py"""
import re, json, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
FILES = sorted(str(p.relative_to(root)) for p in (root / 'src').rglob('*.js')) + ['src/shell.html']
LIT = re.compile(r"""'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\\n$]|\\.)*)`""")
def unesc(s, q):
    return s.replace("\\" + q, q).replace('\\n', '\n').replace('\\\\', '\\')
def esc(s, q):
    return s.replace('\\', '\\\\').replace('\n', '\\n').replace(q, '\\' + q)
CODEY = re.compile(r"[{};]|=>|\bpx\b|rgba?\(|#[0-9a-f]{3,6}\b|^[./#]|\.\w+\(|\bfunction\b|^\w+:\w|[<>]=?\s*\d|\bdata-|system-ui|sans-serif|\bpx;|^https?:|^<|\.png|\.js")
SKIP = {'avatar.js','avatar2.js','testmap.js','core.js','input.js','tiles.js','world.js'}
def vale(t):
    if t != t.strip() or t.rstrip().endswith(('(', '·', '—', ',', '+', '→')): return False  # pedazos de frases armadas con +
    if len(t) < 6 or ' ' not in t.strip(): return False
    if CODEY.search(t): return False
    if not re.search(r'[A-Za-zÁÉÍÓÚáéíóúñÑ]{3}', t): return False
    return bool(re.search(r"[¿¡áéíóúñ’ʼ'·]|\b(el|la|los|las|de|que|con|para|por|no|te|tu|vos|un|una|ya|y|ha|che|nde|ko)\b", t, re.I))
AREAS = {'misiones.js': 'Misiones y personajes', 'peds.js': 'Peatones (lo que dicen en la calle)', 'calle.js': 'Vendedores de la calle', 'changas.js': 'Changas (trabajitos)',
  'main.js': 'Avisos del juego', 'vida.js': 'Vida: hambre, plata, pieza, préstamos', 'pieza.js': 'Tu pieza', 'salon.js': 'Interiores: tienda y despensa', 'shop.js': 'Tienda de ropa y peluquería',
  'emerg.js': 'Policía y emergencias', 'caidas.js': 'Golpes y caídas', 'perros.js': 'Perros', 'cisnes.js': 'Paseo en cisne', 'teatro.js': 'Teatro y cine', 'online.js': 'Online',
  'celapps.js': 'Apps del celular', 'autos.js': 'Vehículos: descripciones', 'car.js': 'Vehículos: descripciones', 'camiones.js': 'Vehículos: descripciones', 'tune.js': 'Taller y tuning', 'taller.js': 'Taller y tuning',
  'weapons.js': 'Armas (solo desarrollo)', 'shell.html': 'Menús y pantallas'}
ORDEN = list(dict.fromkeys(AREAS.values()))
def area(f, t):
    return AREAS.get(pathlib.Path(f).name, 'Otros')
def ctx(src, m):
    a = src.rfind('\n', 0, m.start()) + 1; b = src.find('\n', m.end()); b = len(src) if b < 0 else b
    l = (src[a:m.start()] + '‹…›' + src[m.end():b]).strip()
    return l if len(l) < 150 else l[:147] + '…'
def extraer():
    out = []
    for f in FILES:
        if pathlib.Path(f).name in SKIP: continue
        src = (root / f).read_text(encoding='utf8')
        cnt = {}
        for m in LIT.finditer(src):
            q = "'" if m.group(1) is not None else '"' if m.group(2) is not None else '`'
            raw = m.group(1) if q == "'" else m.group(2) if q == '"' else m.group(3)
            t = unesc(raw, q)
            if f.endswith('.html') and '<' in src[max(0, m.start() - 1):m.start()]: continue
            if not vale(t): continue
            k = cnt.get(t, 0); cnt[t] = k + 1
            line = src.count('\n', 0, m.start()) + 1
            out.append({'id': f'{f}#{line}#{len(out)}', 'archivo': f, 'linea': line, 'ocurrencia': k, 'area': area(f, t), 'texto': t, 'ctx': ctx(src, m)})
    out.sort(key=lambda x: ORDEN.index(x['area']) if x['area'] in ORDEN else 99)  # (sort estable: conserva el orden del archivo)
    return out
if __name__ == '__main__':
    d = extraer(); (root / 'tools' / 'textos.json').write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf8')
    from collections import Counter
    print(len(d), Counter(x['area'] for x in d).most_common())
