"""Arma la app web instalable en docs/ (lo que publica GitHub Pages).

  python3 build.py
"""
import hashlib, json, pathlib, shutil, datetime, subprocess, sys

root = pathlib.Path(__file__).parent
# orden de carga de los scripts (todo queda en un solo index.html)
SCRIPTS = ['engine/inflate.js', 'engine/core.js', 'engine/input.js', 'engine/gfx.js',
           'world/tiles.js', 'world/world.js', 'world/testmap.js',
           'game/player.js', 'game/car.js', 'game/traffic.js', 'game/gps.js', 'game/peds.js', 'game/night.js', 'main.js']


def build():
    docs = root / 'docs'
    docs.mkdir(exist_ok=True)
    (docs / 'icons').mkdir(exist_ok=True)
    for f in ['icon-192.png', 'icon-512.png', 'maskable-512.png', 'favicon.png']:
        shutil.copy(root / 'icons' / f, docs / 'icons' / f)
    # mapa: se vuelve a generar solo si cambió el .osm o el convertidor
    osm, conv, mp = root / 'data/villarrica.osm.gz', root / 'tools/osm_to_map.py', docs / 'map.bin'
    deps = [osm, conv, root / 'data/barrios_ine.json']
    if not mp.exists() or mp.stat().st_mtime < max(d.stat().st_mtime for d in deps):
        subprocess.run([sys.executable, str(conv), str(osm), str(mp)], check=True)
    code = '\n'.join('// ===== %s =====\n%s' % (s, (root / 'src' / s).read_text()) for s in SCRIPTS)
    html = (root / 'src/shell.html').read_text().replace('/*SCRIPTS*/', code)
    version = hashlib.sha1(html.encode() + mp.read_bytes()).hexdigest()[:8]
    html = html.replace('/*VERSION*/', 'Versión %s · %s' % (version, datetime.date.today().isoformat()))
    head = '''<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<script>if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));</script>'''
    html = html.replace('</head>', head + '\n</head>', 1)
    (docs / 'index.html').write_text(html)
    manifest = {
        'name': 'Villarrica', 'short_name': 'Villarrica', 'lang': 'es',
        'description': 'Mundo abierto en Villarrica, Paraguay, al estilo de los juegos de celular de 2006.',
        'start_url': './', 'scope': './', 'display': 'fullscreen', 'orientation': 'any',
        'background_color': '#0f0f12', 'theme_color': '#0f0f12',
        'icons': [
            {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
            {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
            {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
        ],
    }
    (docs / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    (docs / 'sw.js').write_text((root / 'src/sw.js').read_text().replace('__VERSION__', version))
    (docs / '.nojekyll').write_text('')
    print('docs/ listo · versión', version, '·', (docs / 'index.html').stat().st_size, 'bytes')


if __name__ == '__main__':
    build()
