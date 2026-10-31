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

Los datos del mapa vienen de OpenStreetMap — © colaboradores de OpenStreetMap (ODbL).
