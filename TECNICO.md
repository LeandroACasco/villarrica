# Villarrica — Documentación técnica

> Guía para seguir desarrollando el juego (con cualquier persona o IA: DeepSeek, ChatGPT, Claude, etc.).
> Explica cómo está armado, dónde está cada cosa y **recetas paso a paso** para agregar o cambiar cosas.
> Visión, alcance y estado del proyecto: `villarrica-diseno.md` (en el proyecto de claude.ai).
> Última actualización: 05/11/2026.

---

## 0. Resumen en 30 segundos

- Juego web 2D con vista desde arriba (estilo celular Java 2006), **JavaScript puro, sin frameworks ni dependencias**, todo dibujado en un `<canvas>` con código (no hay imágenes PNG de sprites: autos, personas, baldosas y edificios se pintan por programa).
- El mapa de Villarrica sale de **OpenStreetMap**: `tools/osm_to_map.py` (Python) convierte `data/villarrica.osm.gz` en `docs/map.bin` (grilla de baldosas + datos).
- `python3 build.py` junta todos los `.js` de `src/` en **un solo** `docs/index.html` y arma la PWA (manifest, service worker, íconos). GitHub Pages publica la carpeta `docs/`.
- Todo cuelga de un objeto global `VR` (por ejemplo `VR.Car`, `VR.World`, `VR.CAR_MODELS`).
- **Regla de oro:** nunca editar `docs/index.html` a mano: se pisa en cada build. Se edita `src/` y se corre `python3 build.py`.

---

## 1. Carpetas y archivos

```
villarrica/
├─ build.py                 arma docs/ (index.html único, sw.js, manifest, editor de personas)
├─ README.md
├─ TECNICO.md               este documento
├─ data/
│  ├─ villarrica.osm.gz     datos de OpenStreetMap (calles, manzanas, plazas, edificios)
│  └─ barrios_ine.json      barrios oficiales (INE) para los nombres en el mapa
├─ tools/
│  ├─ osm_to_map.py         CONVERTIDOR: OSM → docs/map.bin  (todo lo "geográfico" se decide acá)
│  ├─ editor_personas.html  Editor de personas (perillas del avatar); build.py le inyecta avatar2.js
│  └─ make_icons.py         genera los íconos de la app
├─ icons/                   íconos (los copia build.py)
├─ src/
│  ├─ shell.html            HTML + CSS + menús/diálogos (HUD, menú, mapa, tienda, taller…)
│  ├─ sw.js                 service worker (modo sin conexión)
│  ├─ main.js               arranque y BUCLE PRINCIPAL: junta todos los sistemas
│  ├─ engine/               motor genérico
│  │  ├─ inflate.js         descompresor zlib (para leer map.bin)
│  │  ├─ core.js            VR global, constantes, pantalla/canvas, cámara, VR.store (guardado), utilidades
│  │  ├─ input.js           teclado + táctil + control de consola → VR.input
│  │  ├─ gfx.js             texto pixelado, utilidades de dibujo
│  │  └─ audio.js           sintetizador de sonido (sin archivos de audio)
│  ├─ world/
│  │  ├─ tiles.js           tipos de baldosa (VR.T), texturas procedurales, copas de árboles
│  │  ├─ world.js           VR.World: colisión, chunks, DIBUJO DEL MAPA, decoraciones (decor/decorOver/decorTop), diagonales, carga del mapa
│  │  └─ testmap.js         mapa chico de prueba (si falla map.bin)
│  └─ game/
│     ├─ avatar2.js         PERSONAS (jugador y peatones): esqueleto por capas, ropa, catálogo y precios
│     ├─ avatar.js          avatar viejo (ya no se carga en el build; queda de referencia)
│     ├─ player.js          VR.Player: caminar, correr, chocar, sprites del jugador
│     ├─ car.js             VR.Car (física y dibujo de vehículos), motos, rotación de sprites, autos estacionados
│     ├─ autos.js           MODELOS DE AUTOS (VR.CAR_MODELS), dibujo desde arriba y sorteo (VR.pickCar)
│     ├─ tune.js            TALLER: colores, piezas, precios (VR.TUNE_*)
│     ├─ vcard.js           tarjeta del vehículo (dibujo de costado chico) al subirte
│     ├─ sidehd.js          dibujo de costado en alta (taller / tarjeta grande)
│     ├─ traffic.js         tránsito con IA sobre la red de calles
│     ├─ gps.js             ruta del GPS hasta el destino marcado
│     ├─ peds.js            peatones, gente sentada en bancos, huida
│     ├─ night.js           ciclo día/noche y luces
│     ├─ emerg.js           policía, ambulancia, bomberos, fuego, explosiones, estrellas de búsqueda
│     ├─ weapons.js         armas (pistola, lanzallamas), balas, fuego
│     └─ shop.js            tienda de ropa "Ao Porã" y billetera
└─ docs/                    SALIDA del build (lo que publica GitHub Pages) — no editar a mano
   ├─ index.html, map.bin, sw.js, manifest.webmanifest, icons/, editor-personas.html
```

**Orden de carga** (importa: cada archivo usa lo definido por los anteriores) — está en `build.py`, lista `SCRIPTS`:
`inflate, core, input, gfx, audio, tiles, world, testmap, avatar2, player, car, autos, tune, traffic, gps, peds, night, emerg, weapons, shop, vcard, sidehd, main`.
**Si creás un archivo `.js` nuevo, agregalo a `SCRIPTS` en `build.py`** en el lugar correcto.

---

## 2. Cómo compilar, probar y publicar

```bash
python3 build.py                      # genera docs/ (y regenera map.bin si cambió el convertidor o los datos)
cd docs && python3 -m http.server 8765 # abrir http://localhost:8765 en la PC o en el celular (misma red: http://IP-de-la-PC:8765)
git add -A && git commit -m "..." && git push   # GitHub Pages publica docs/ en 1-2 minutos
```

- `map.bin` se regenera **solo** si `tools/osm_to_map.py`, `data/villarrica.osm.gz` o `data/barrios_ine.json` son más nuevos que el `map.bin`. Si cambiaste el convertidor y no se regenera: `touch tools/osm_to_map.py` o borrá `docs/map.bin`.
- El convertidor necesita Python 3 con **Pillow** y **numpy** (`pip install pillow numpy`).
- Service worker: si el navegador muestra una versión vieja, recargar dos veces o borrar datos del sitio. La versión (hash) aparece en el menú del juego.
- **Prueba en el teléfono:** siempre probar los controles táctiles y que no haya scroll de página.

### Herramientas de depuración

- En la consola del navegador existe `window.__vr` con: `world, player, shop, shopDoor, openShop, teleport, setDest, cam, settings, cars, traffic, peds, emer, weapons, car, enterCar, exitCar`.
  - `__vr.teleport(x, y, 'nombre')` — ir a un punto (en unidades del mundo, ver §3).
  - `__vr.player.x / .y` — dónde estás.
- **En el mapa (M o Tab):** tocá un lugar para marcar destino y apretá **Ir** (o tecla **T**) para teletransportarte.
- Botón de plata de desarrollo en el menú (para probar la tienda).
- Pruebas automáticas: hay Playwright/Chromium; un script típico abre `http://localhost:8765`, espera `window.__vr`, hace `teleport` y saca capturas (`page.screenshot`). Útil para revisar que no haya errores (`page.on('pageerror')`).

---

## 3. Coordenadas, escalas y resolución

| Concepto | Valor |
|---|---|
| Baldosa (tile) | `VR.TILE = 16` unidades del mundo = **2 m reales** |
| 1 metro | 8 unidades |
| Chunk de dibujo | 16×16 baldosas = 256 unidades (se pre-dibuja y se guarda como imagen) |
| Persona | sprite 16×32 unidades, pies en el centro abajo |
| Vehículos | `len`×`wid` en unidades (×`VR.VK = 1.15` al cargar) |
| Velocidad | unidades/segundo; 240 ≈ 108 km/h |
| Ángulo de vehículo | radianes; 0 = mirando hacia arriba (norte), crece en sentido horario |

- **Resolución ×2:** `VR.RES` (= `VR.screen.R`, normalmente 2) son los píxeles del lienzo por unidad. Todo se dibuja en unidades y el contexto está escalado. Los sprites se pre-dibujan a `RES` y se dibujan **con tamaño de destino explícito** (`ctx.drawImage(img, x, y, 16, 32)`), así que al crear sprites nuevos siempre pasá el tamaño en unidades.
- Las baldosas son una grilla `world.w × world.h`. `world.get(tx, ty)` da el tipo. Para pasar de unidades a baldosa: `tx = Math.floor(x / 16)`.

### Tipos de baldosa (`VR.T`, en `src/world/tiles.js` y espejados en el convertidor)

| n° | nombre | qué es |
|---|---|---|
| 0 | GRASS | pasto |
| 1 | ROAD | asfalto |
| 2 | SIDEWALK | vereda |
| 3 | BUILDING | edificio (sólido) |
| 4 | PAVING | laja / baldosas de plaza |
| 5 | TREE | árbol (tronco sólido) |
| 6 | MONUMENT | monumento (sólido) |
| 7 | DIRT | tierra |
| 8 | WATER | agua |
| 9 | STONE | empedrado |
| 10 | DIRTROAD | calle de tierra colorada |
| 11 | CHECKER | piso de damero |
| 12 | PLAZADIRT | tierra apisonada de plaza |

Tablas relacionadas en `tiles.js`: `VR.ROADLIKE` (por dónde anda el tránsito), `VR.SOLID` (lo que choca), `VR.GROUND_OF` (piso que va debajo de un árbol/edificio).
**Para agregar un tipo nuevo:** número nuevo en `VR.T` **y** en las constantes del convertidor, textura en `VR.tileset.build` (tiles.js), y decidir si es sólido/roadlike. Los números van hasta 15 (las tablas son `Uint8Array(16)`).

---

## 4. Tubería del mapa: `tools/osm_to_map.py`

Todo lo que es **"dónde está cada cosa en la ciudad"** se decide acá, no en el juego. El script está dividido en secciones con comentarios `# ---------- nombre ----------` (buscarlas por texto, los números de línea cambian):

1. **geometría** — proyección, `rectify()` endereza un poco la cuadrícula del Centro para que quede alineada a la grilla.
2. **red de calles para el tránsito** — nodos y tramos (`roads`): lo usa `traffic.js`, `gps.js` y las diagonales.
3. **barrios (INE)**, **áreas**, **calles** — se pintan en lienzos (Pillow) a la resolución de la grilla: ancho de calle según tipo OSM (`trunk`, `primary`, `residential`…), superficie (`surface_tile()`: asfalto, empedrado, tierra).
4. **composición** — mezcla capas en la grilla final de tipos de baldosa.
5. **plazas y parques** — caminos, canteros, bancos, juegos, fuente, laja, esquinas redondeadas de plazas.
6. **Municipalidad**, **Centro**, **árboles**, **edificios** (renumerar, colores, alturas).
7. Lugares hechos a mano según fotos/videos/Street View: frente oeste de la Plaza de los Héroes, guirnaldas, Mcal. López, tienda, cuartel de bomberos, cebras, esquinas redondeadas de toda la ciudad.
8. **punto de inicio**, **nombres de barrio**, **empaquetar**.

### Formato de `map.bin`
Todo el archivo es **deflate crudo** (zlib sin cabecera). Descomprimido: `[uint32 largo del JSON][JSON meta][tiles u8 w×h][line u8][street u8][area u8][barrio u8][bid u16 (id de edificio por baldosa)][edificios u16×8 c/u][árboles u16×4 c/u]`. Lo arma la sección `empaquetar` del convertidor y lo lee `VR.loadMap()` al final de `world.js` (**si agregás una capa, cambiá los dos en el mismo orden**). El JSON `meta` tiene: `w, h, nb, nt, roads, special, streets, areas, barrios, barrioLabels, labels, decals, spawn…`.

### Las "decals" (decoraciones con datos)
Son la forma de agregar **cosas puntuales** al mapa. El convertidor agrega diccionarios a la lista `decals`:
```python
decals.append({'kind': 'tienda', 'x': x0, 'y': y0, 'w': ancho, 'h': alto})   # x, y, w, h en BALDOSAS
```
Se pueden poner campos extra libres (`'style'`, `'fa'`, `'ry'`, etc.) y el juego los recibe tal cual en `d`.
Tipos que ya existen: `anfiteatro arcos banco banderas cancha cartel cuartel esquina fila frente galeria guirnaldas juegos mastiles mesas monumento monumento_bajo muni pilastras senda sillas terraza tienda topiarios`.

---

## 5. Cómo se dibuja el mundo (`src/world/world.js`)

Cada chunk de 16×16 baldosas se pinta **una vez** en un canvas fuera de pantalla (`renderChunk`) y después se reutiliza. Pasos, en orden (buscar los comentarios en `renderChunk`):

1. **piso** — cada baldosa con su textura (`VR.tileset.draw`), con variante para que no se repita.
2. **`VR.decor[kind](g, d)`** — decoraciones **a ras del piso** (sendas, canchas, piso del cuartel, base del monumento…).
3. **cordones** de vereda, de plazas y canteros; tapas y rejillas.
4. **cebras**, líneas de calle, **macetas** (`VR.drawPot`).
5. **diagonales** — `VR.drawDiagonals` pinta lisas las calles inclinadas (ver §5.1).
6. **sombras**, **troncos** de árboles.
7. **edificios** — `VR.drawBuildingColumn` (fachada, techo, ventanas, colores de `VR.BPAL`).
8. **`VR.decorOver[kind](g, d)`** — cosas **pegadas a los edificios** o encima de ellos (carteles, galerías, la tienda, los arcos, esquinas redondeadas…).

Fuera del chunk (cada cuadro):
- **`VR.decorTop[kind](d)`** devuelve `[{ sy, draw(ctx) }]`: cosas que se **ordenan con las personas y autos según la altura en pantalla** (`sy`), así alguien puede pasar por delante o por detrás (bancos, mástiles, banderas, juegos, techo del cuartel). Si algo tiene altura (la gente lo puede tapar o lo tapa a la gente), va acá.
- Copas de árboles (`VR.canopy`) se dibujan arriba de todo.
- Luces de noche: `src/game/night.js`, por `d.kind`.

### 5.1 Calles en diagonal
La grilla es cuadrada, así que una calle inclinada (Ruta 8 por Santa Lucía) en baldosas queda escalonada. Solución:
- `VR.findDiagonals(roads)` (al cargar el mapa) busca tramos largos (> 24 unidades) con ángulo entre 12° y 78° y guarda en `world.diag` sus puntas, superficie, ancho de calzada (`hr`) y de vereda (`sw`, de `meta.roads.swidths`).
- `VR.drawDiagonals` (paso 5) pinta **encima** de los escalones: vereda lisa a los dos lados (si no hay otra calle), calzada con la textura de su piso, cortes en los cruces (`cut`), cordones y la **línea amarilla discontinua** del medio en las principales asfaltadas.
- Para afinar: ángulos/largo mínimo en `findDiagonals`; colores y anchos en `drawDiagonals`.

---

## 6. Sistemas del juego

### 6.1 Bucle principal (`src/main.js`)
Crea todo (`world`, `player`, `traffic`, `peds`, `emer`, `weapons`, `night`, `shop`, `gps`), y en cada cuadro: lee `VR.input` → actualiza jugador o vehículo → tránsito → peatones → emergencias → armas → cámara → dibuja (mundo, objetos ordenados por `sy`, efectos, noche, HUD). También maneja: menú, mapa grande con destino y teletransporte, subir/bajar de vehículos (`enterCar`/`exitCar`), guardado de posición, tienda y taller.

### 6.2 Entrada (`src/engine/input.js`)
Botones lógicos: `action, run, car, menu, map, fire, weapon`. El juego **solo** pregunta `VR.input.ax/ay` (−1..1), `down('run')`, `pressed('car')`.
Teclas: WASD/flechas mover · Espacio/J/Enter acción · Shift correr · F/K subir/bajar · Esc/P menú · M/Tab mapa · E disparar. En el mapa: +/− zoom, Supr borrar destino, T teletransportar.
**Para cambiar una tecla:** editar `dirKeys` / `btnKeys`. **Para un botón nuevo:** agregarlo a `BTN`, a `btnKeys`, al HTML táctil en `shell.html` y al mapeo del control de consola en el mismo archivo.

### 6.3 Guardado (`VR.store` en core.js, sobre localStorage)
Claves usadas: `pos:` (posición), `dest:` (destino), `pj` (personaje elegido), `look:propio`, `ropa:mia` (ropa comprada), `plata`, `hora`, `snd`, `vib`, `fps`, `touch`, `dev:arma`, `dev:armas`, `dev:sin`.
Para agregar algo guardado: `VR.store.get('clave', porDefecto)` / `VR.store.set('clave', valor)`. Elegí un nombre nuevo para no pisar otro.

### 6.4 Personas (`src/game/avatar2.js`)
- Un "look" es un objeto: `{ gender, skin, build, hair, hairColor, beard, top, topColor, bottom, bottomColor, shoes, shoesColor, hat, hatColor, extra… }`.
- `VR.AV2_CAT` = catálogo: cada categoría (`hair, top, bottom, shoes, hat, extra, beard, build, gender`) es `{ clave: ['Nombre visible', precioEnGs] }`, más las paletas `skin`, `hairColor`, `cloth`.
- `VR.av2Render(L, dir, anim, fase, k)` dibuja una pose; `VR.av2Lazy(look)` devuelve un objeto con `.get(dir, anim, frame)` que crea y guarda los cuadros a medida que se piden. Animaciones: `idle, walk, run, sit`. Direcciones: `up, down, left, right`.
- `VR.AV2_TUNE` = proporciones (se ajustan cómodo con el **Editor de personas**, `docs/editor-personas.html`).
- **Conductor de moto:** `VR.drawRiderTop(look, geo)` (car.js) lo dibuja visto desde arriba con la ropa, el peinado, la gorra/casco y la mochila del look, inclinado al manubrio, y `VR.riderTopFrames` lo gira en 64 ángulos con la moto. Se usa poniendo `car.rider = { L: look }`.

### 6.5 Vehículos (`car.js` + `autos.js` + `tune.js` + `vcard.js` + `sidehd.js`)
- `VR.Car` = un vehículo (auto o moto, del jugador, del tránsito o estacionado). Tipo `'car'` o `'moto'` y `model`.
- **Datos del modelo** = `VR.VSPEC.car`/`VR.VSPEC.moto` (valores por defecto) **mezclado con** `VR.CAR_MODELS[model]` o `VR.MOTO_MODELS[model]` (lo hace `VR.vspec(type, model)`).
- Campos de un modelo:

| campo | significado |
|---|---|
| `len`, `wid` | largo y ancho (unidades, antes del ×1,15) |
| `S` | tamaño del cuadro de sprite (un poco más que `len`) |
| `acc`, `rev`, `brake` | aceleración, marcha atrás, frenado |
| `turn` | qué tanto dobla |
| `mass` | peso en choques (1 = auto normal) |
| `max` | velocidad tope por piso: `{ road, stone, dirt, side, grass }` |
| `colors` | paletas `[[color, oscuro, claro], …]` (si no, `VR.CAR_COLORS`/`VR.MOTO_COLORS`) |
| `base` | **función que dibuja el vehículo desde arriba mirando hacia arriba** (`(pal, tune) => canvas`) |
| `name`, `desc` | nombre inventado y descripción para la tarjeta |
| `side` | qué dibujo de costado usar (tarjeta/taller) |
| `sideShape` | contorno de costado (polígonos) para `drawSideAuto`/`sidehd.js` |
| `riderOff` | (motos) corrimiento del conductor hacia adelante (unidades) |
| `rider` | (motos) dónde quedan los puños y la cadera del conductor: `{ gy, gx, hip, stand }` (gy negativo = adelante; `stand: true` = va parado, patineta) |
| `emer`, `lights` | vehículo de emergencia y colores de balizas |
| `noLights`, `noFire` | sin faros / no se prende fuego (karumbe) |

- **Dibujo desde arriba:** `VR.vbase(W, L, (T) => {...})` da un lienzo y ayudas `T.rr` (rectángulo redondeado), `T.tire`, `T.hg` (degradé), `T.line`. Para autos comunes alcanza `VR.drawAuto({ L, W, hood, ws, roof, rg, fa, ra, box, bed, spare, rails… })` (zonas a lo largo: capó, parabrisas, techo, luneta; el resto es baúl o caja).
  Opciones de forma para que cada modelo se distinga: `pinch` (trompa y cola redondeadas y más angostas, 0–2,5), `hl` faros (`'slant'` rasgados, `'quad'` cuatro redondos, `'round'` redondos, sin nada = rectangulares), `tl` luces traseras (`'bar'` de lado a lado, `'round'` redondas, `'vertical'` altas en las esquinas), `flares` (guardabarros anchos), `scoop` (`true` o `'rally'`: toma de aire grande), `wing` (alerón alto de fábrica), `lip` (colita de pato), `box`, `bed`, `rollbar`, `spare`, `rails`, `doors3`. En `sideShape` también valen `wing`, `scoop` y `lip`.
- `VR.rotFrames(base, S)` genera 64 rotaciones y la sombra (se cachean en `VR.vframes`).
- **Sorteo:** `VR.pickCar(rnd, parked)` (autos.js) y `VR.pickMoto(rnd, parked)` (car.js) deciden qué modelos aparecen en el tránsito y estacionados.
- **Taller:** `VR.TUNE_MODELS[model] = { parts: [...], price, k, serie }` (qué piezas se le pueden poner, precio base, multiplicador de precio de piezas, color de serie). Piezas en `VR.TUNE_PARTS`.
- **Estacionados:** `VR.parkCars(world, n, near)` (car.js) los ubica junto a los cordones; casos especiales (cuartel, filas, Municipalidad) adentro de esa función.

### 6.6 Tránsito (`traffic.js`)
Usa el grafo `meta.roads` (nodos en unidades, tramos `[a, b, tipo|superficie<<4, sentidoÚnico]`). Cada auto sigue tramos, elige en los cruces (prefiere seguir derecho y calles grandes), frena ante otros. Proporción de motos: `motoShare`. Conductores de moto: `VR.RIDER_LOOKS` (12 personas al azar, varias con casco).

### 6.7 Peatones (`peds.js`)
Caminan por veredas, hablan (`VR.PED_TALK`, frases en jopara), huyen de disparos/explosiones. La **gente sentada** sale de las decals `banco`; `peds.scatter(x, y, radio, causa)` hace que se levanten y huyan (lo llaman armas, fuego, explosiones y autos rápidos); al rato, fuera de cámara, vuelve otra persona a sentarse.

### 6.8 Emergencias (`emerg.js`)
Estrellas de búsqueda, policía (patrulleros `patrulla`, `policam`), ambulancia, bomberos (`bomba`, salen del cuartel `world.firehouse` y vuelven ahí), fuego, autos quemados (`VR.burntFrames`), explosiones. Frases: `VR.ALERTAS`, `VR.POLI_DICE`.

### 6.9 Armas (`weapons.js`)
`VR.WEAPONS = { pistola: {...}, lanzallamas: {...} }` y `VR.WEAPON_ORDER`. El arma se dibuja a la altura del pecho (`drawHeld`, `hand()`).

### 6.10 Noche (`night.js`)
Oscurece según la hora y pone luces (`this.put(x, y, radio, 'r,g,b', intensidad)`) en faroles, vidrieras y por cada `d.kind`.

### 6.11 Tienda (`shop.js` + diálogo en `shell.html`)
"Ao Porã": vende lo de `VR.AV2_CAT` con sus precios; guarda en `ropa:mia` y `look:propio`; la plata en `plata`. La puerta está en la decal `tienda`.

---

## 7. RECETAS (paso a paso)

### 7.1 Agregar un AUTO nuevo
1. **`src/game/autos.js`**, dentro de `VR.CAR_MODELS = { ... }` agregá una entrada con clave corta (ej. `combi`):
   ```js
   combi: { len: 44, wid: 18, S: 50, acc: 140, rev: 60, turn: 2.0, brake: 360, mass: 1.8,
     max: { road: 200, stone: 180, dirt: 160, side: 120, grass: 120 },
     name: 'Pyahu Combi', desc: 'Combi escolar: lenta pero entra todo el grado.', side: 'mono',
     base: VR.drawAuto({ L: 44, W: 18, hood: 5, ws: 5, roof: 30, rg: 2, fa: 0.16, ra: 0.82, box: true }),
     sideShape: VR.CAR_MODELS.mono.sideShape },  // o un contorno propio (ver los de mono/suv)
   ```
   - Si querés un dibujo propio desde arriba, escribí una función `VR.drawCombi = (pal, t = {}) => VR.vbase(W, L, (T) => { ... })` (copiá `VR.drawBomba` o `VR.drawKarumbe` como ejemplo) y poné `base: VR.drawCombi`.
   - Nombres **inventados** (sin marcas reales), idealmente en guaraní/jopara.
2. **Que aparezca:** en `VR.pickCar` (al final de autos.js) dale una probabilidad (ej. `if (!parked && r < 0.03) return 'combi';`).
3. **Taller:** en `src/game/tune.js`, `VR.TUNE_MODELS.combi = { parts: ['color','franja','color2','llantas','polarizado','techo','faros','neon'], price: 120000000, k: 1.1, serie: 3 };` (si no, el taller puede fallar con ese modelo).
4. **Tarjeta de costado:** con `sideShape` ya funciona (vcard.js/sidehd.js usan `drawSideAuto`/`carHD` genéricos). Solo si es muy distinto (como el bomba o el karumbe) hay que agregar un caso en `vcard.js` y `sidehd.js`.
5. `python3 build.py`, probar: subirse (F), ver la tarjeta, chocar, taller.

### 7.2 Agregar una MOTO nueva
1. En `src/game/car.js` escribí el dibujo `VR.drawMotoX = (pal, t = {}) => VR.vbase(10, 22, (T) => { ... })` (copiá `drawMotoCalle`).
2. En `VR.MOTO_MODELS` agregá `x: { len, wid, S, base: VR.drawMotoX, acc, turn, max: {...}, name, desc, side: 'calle', riderOff: 0 }` (los campos que no pongas salen de `VR.VSPEC.moto`).
3. Sorteo en `VR.pickMoto`; taller en `VR.TUNE_MODELS`; dibujo de costado: agregar caso en `vcard.js` (`kind === 'x'`) y `sidehd.js` o reusar `side: 'calle'`.

### 7.3 Agregar ROPA nueva (tienda y peatones)
1. **`src/game/avatar2.js`**: en `CAT` agregá la clave en la categoría (ej. `top: { …, guayabera: ['Guayabera', 140000] }`).
2. En `av2Render`, donde se dibuja esa categoría (buscá `L.top ===` o el nombre de una prenda parecida), agregá cómo se pinta. Lo más fácil: copiar el caso de una prenda similar (`camisa`) y cambiar detalles. Revisá también las listas de "manga larga", "prendas abiertas" (`OPEN`, `LONGTOP`, `longSleeve`).
3. Si es solo de mujer/hombre, revisá el bloque que corrige combinaciones (busca `L.bottom === 'pollera'`).
4. Probar en el **Editor de personas** (`docs/editor-personas.html`) y en la tienda.

### 7.4 Agregar un LUGAR / DECORACIÓN en el mapa (ej. una heladería, una parada de colectivo)
1. **Convertidor** (`tools/osm_to_map.py`): en una sección nueva `# ---------- mi lugar ----------` antes de `# ---------- empaquetar`, calculá la posición en baldosas (buscá la manzana por nombre de calle o coordenadas; mirá cómo lo hace la sección de la tienda o del cuartel) y:
   ```python
   decals.append({'kind': 'parada', 'x': tx, 'y': ty, 'w': 3, 'h': 1, 'style': 'techada'})
   ```
   Si el lugar cambia el piso o tapa algo, modificá la grilla (`grid[y, x] = T_SIDEWALK`, etc.) en la misma sección.
2. **Juego** (`src/world/world.js`): elegí la capa:
   - piso → `VR.decor.parada = (g, d) => { ... }`
   - pegado a un edificio → `VR.decorOver.parada = (g, d) => { ... }`
   - con altura (gente delante/detrás) → `VR.decorTop.parada = (d) => [{ sy: (d.y + d.h) * 16, draw: (ctx) => { ... } }]`
   Dentro, `X = d.x * 16`, `Y = d.y * 16`, ancho `d.w * 16`. Dibujá con `g.fillStyle` / `g.fillRect` en unidades.
3. **Noche** (opcional): en `night.js`, `else if (d.kind === 'parada') this.put(X + 16, Y + 8, 40, '255,220,160', 0.8);`
4. **Choque** (opcional): si debe ser sólido, poné `T_BUILDING` en la grilla o sumá su rectángulo a la colisión.
5. `python3 build.py` (regenera map.bin), probar con teletransporte.

### 7.5 Agregar un NEGOCIO con interior/menú (como la tienda)
Copiar el patrón de la tienda: decal con la puerta (convertidor) → en `main.js` buscar `nearShop`/`shopDoor` (detectar cercanía y mostrar "Entrar") → diálogo HTML en `shell.html` (copiar el de la tienda) → lógica en un archivo nuevo `src/game/minegocio.js` (agregarlo a `SCRIPTS` en build.py) → usar la billetera (`plata`).

### 7.6 Agregar un ARMA
En `weapons.js`: entrada en `VR.WEAPONS` (daño, cadencia, alcance, dibujo), sumarla a `VR.WEAPON_ORDER`, y en `update`/`draw` el comportamiento (copiar pistola para balas, lanzallamas para chorro). Si asusta gente, que llame `peds.scatter`.

### 7.7 Agregar un VEHÍCULO DE EMERGENCIA
Modelo en `VR.CAR_MODELS` con `emer: 'tipo'` y `lights: ['r,g,b', 'r,g,b']` (ver `patrulla`, `ambulancia`, `bomba`); en `emerg.js` agregar el tipo de unidad en el despacho (buscar `model === 'bomba' ? 'bomberos'`).

### 7.8 Agregar textos en jopara
Frases de peatones: `VR.PED_TALK` (peds.js). Gritos y policía: `VR.ALERTAS`, `VR.POLI_DICE` (emerg.js). Interfaz: `shell.html`.

### 7.9 Cambiar algo de una zona según fotos / Street View
Todo lo que es ubicación va en el convertidor (§4) — hay ejemplos de secciones hechas así (frente oeste de la Plaza de los Héroes, Mcal. López, cuartel). Lo visual (cómo se ve un frente) va en `VR.decorOver`/`VR.decorTop` con un `kind` nuevo.

### 7.10 Actualizar el mapa desde OpenStreetMap
Bajar de nuevo el área (export de openstreetmap.org u Overpass, mismo recuadro) a `data/villarrica.osm.gz` y correr `python3 build.py`. Revisar las secciones hechas a mano (pueden depender de nombres de calles).

---

## 8. Reglas del proyecto (importante para cualquier IA)

- **Todo original:** el juego se inspira en Gangstar: Crime City (Gameloft) **solo como estilo**. Nunca copiar sprites, tiles, música ni textos de Gameloft.
- **Sin marcas ni logos reales** (autos con nombres inventados, carteles genéricos).
- Hablar al usuario en español rioplatense/paraguayo con voseo; textos del juego pueden usar jopara.
- Etapas cortas y jugables, probadas en PC y teléfono. Al terminar cada etapa, actualizar "Estado actual" en `villarrica-diseno.md`.
- Sin dependencias externas en el juego (todo en un HTML). El código de `LeandroACasco/gangstar` (propio) se puede reutilizar.

### Errores comunes
- Editar `docs/index.html` en vez de `src/` → se pierde en el próximo build.
- Archivo `.js` nuevo no agregado a `SCRIPTS` en `build.py` → "VR.algo is not a function".
- Cambiar el convertidor y no ver cambios → map.bin no se regeneró (`touch tools/osm_to_map.py`).
- Sprites borrosos o del doble de tamaño → dibujar con tamaño de destino en unidades y crear los lienzos a `VR.RES`.
- `car.contacts()` devuelve `null` cuando NO hay choque (no `[]`).
- Algo con altura dibujado en `decor`/`decorOver` → la gente queda siempre encima; tiene que ir en `decorTop` con su `sy`.
- Service worker sirviendo la versión vieja → recargar dos veces.

---

## 9. Plantilla de pedido para otra IA

> Estoy desarrollando "Villarrica", un juego web 2D en JavaScript puro (sin frameworks) en el repo `LeandroACasco/villarrica`. Leé `TECNICO.md` (arquitectura y recetas). Se edita en `src/` y `tools/osm_to_map.py`, nunca `docs/`. Compilo con `python3 build.py`.
> Quiero: **[describir el cambio]**.
> Te paso los archivos relevantes: **[pegar, por ejemplo, `src/game/autos.js` y `src/game/tune.js`]**.
> Devolveme solo los cambios (qué buscar y qué reemplazar), sin reescribir archivos enteros, y explicame cómo probarlo.

Consejo: pasale a la IA **solo los archivos que dice la receta** (los archivos son grandes; `world.js` y el convertidor tienen más de 1000 líneas). Si el cambio es en una función, pegale esa función y unas líneas alrededor.
