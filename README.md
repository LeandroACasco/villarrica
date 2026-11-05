# Villarrica

Mundo abierto con vista desde arriba, al estilo de los juegos de celular de 2006, ambientado en Villarrica (Paraguay).
Arte, código y textos originales.

**Jugar:** https://leandroacasco.github.io/villarrica/ (se puede instalar en el teléfono como app).

## Desarrollo

```
python3 tools/make_icons.py   # íconos (solo si cambian)
python3 build.py              # arma docs/ (lo que publica GitHub Pages)
python3 -m http.server -d docs 8000
```

- `src/engine/` loop a 60 fps, pantalla con escalado entero, entrada (teclado, táctil, control), dibujo en píxeles
- `src/world/` tiles generados por código, mundo por bloques, barrio de prueba
- `src/game/` jugador
- `src/main.js` arranque, cámara, menú
- `tools/osm_to_map.py` arma `docs/map.bin` con toda la ciudad: endereza el damero (gira la ciudad ~2° y lleva cada calle casi recta a una fila o columna), calles de asfalto, empedrado y tierra, edificios, plazas, parques, agua y barrios

## Datos

- `data/villarrica.osm.gz`: OpenStreetMap, zona urbana de Villarrica (bbox lon −56.4745 a −56.4212, lat −25.8100 a −25.7605), bajado de Overpass el 03/11/2026. © colaboradores de OpenStreetMap (ODbL).
- `data/barrios_ine.json`: los 8 barrios urbanos de Villarrica, recortados de la cartografía de barrios y localidades 2025 del INE Paraguay.

## Documentación técnica

Cómo está armado el juego y recetas para agregar cosas (vehículos, ropa, lugares, armas): [TECNICO.md](TECNICO.md).
