#!/usr/bin/env python3
"""Aplica al juego los textos revisados (el JSON que exporta docs/textos.html).
  python3 tools/textos_aplicar.py textos-revisados.json          # aplica
  python3 tools/textos_aplicar.py textos-revisados.json --probar # solo muestra qué haría
'Se queda' no toca nada. 'Cambiar' reemplaza el texto. 'Se va' quita el texto solo si es un elemento de una lista
(frases sueltas); si es parte de un diálogo o aviso, lo avisa para resolverlo a mano."""
import re, sys, json, pathlib, subprocess
root = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / 'tools'))
import textos_extraer as X
def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    probar = '--probar' in sys.argv
    items = json.load(open(sys.argv[1], encoding='utf8'))['items']
    por = {}
    for it in items:
        if it['accion'] in ('cambiar', 'quitar'): por.setdefault(it['archivo'], []).append(it)
    hechos = sin = 0; quitar_manual = []
    for f, its in por.items():
        p = root / f; src = p.read_text(encoding='utf8'); cnt = {}; cambios = []
        for m in X.LIT.finditer(src):
            q = "'" if m.group(1) is not None else '"' if m.group(2) is not None else '`'
            raw = m.group(1) if q == "'" else m.group(2) if q == '"' else m.group(3)
            t = X.unesc(raw, q)
            if f.endswith('.html') and '<' in src[max(0, m.start() - 1):m.start()]: continue
            if not X.vale(t): continue
            k = cnt.get(t, 0); cnt[t] = k + 1
            for it in its:
                if it['original'] == t and it['ocurrencia'] == k: cambios.append((m, q, it))
        usados = {id(c[2]) for c in cambios}
        for it in its:
            if id(it) not in usados: sin += 1; print('⚠ No encontré (el código cambió):', it['original'][:70])
        for m, q, it in sorted(cambios, key=lambda c: -c[0].start()):
            if it['accion'] == 'cambiar':
                nuevo = it['nuevo'].strip()
                if q == '`' and '${' in nuevo: nuevo = nuevo.replace('${', '$ {')
                src = src[:m.start()] + q + X.esc(nuevo, q) + q + src[m.end():]; hechos += 1
            else:
                antes = src[:m.start()].rstrip(); despues = src[m.end():].lstrip()
                if antes.endswith(('[', ',')) and despues.startswith((',', ']')):
                    ini = m.start(); fin = m.end()
                    resto = src[fin:].lstrip()
                    if resto.startswith(','): fin = src.index(',', fin) + 1
                    elif antes.endswith(','): ini = src.rindex(',', 0, m.start())
                    src = src[:ini] + src[fin:]; hechos += 1
                else: quitar_manual.append((f, it['original'])); 
        if not probar: p.write_text(src, encoding='utf8')
    print(f'{"(prueba) " if probar else ""}Aplicados: {hechos} · no encontrados: {sin} · "Se va" a resolver a mano: {len(quitar_manual)}')
    for f, t in quitar_manual: print('  ✖', f.split('/')[-1], '|', t[:80])
    if not probar:
        for f in por:
            if f.endswith('.js'):
                r = subprocess.run(['node', '--check', str(root / f)], capture_output=True, text=True)
                if r.returncode: print('❌ Error de sintaxis en', f, r.stderr[:300])
        subprocess.run([sys.executable, str(root / 'build.py')], stdout=subprocess.DEVNULL)
main()
