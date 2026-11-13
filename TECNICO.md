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
│     ├─ oblicuo.js         VISTA OBLICUA: volumen de los vehículos (perfil de alturas + costado), cola de dibujos
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
4. **cebras**, líneas de calle, **cajones de estacionamiento** (`VR.drawBay`), **macetas** (`VR.drawPot`).

   **Valores de `line`** (una por baldosa, `Uint8`): 1 línea amarilla E-O, 2 línea amarilla N-S, 3 cebra de barras verticales (calle N-S), 4 cebra horizontal (calle E-O), **5-8 rayitas de moto** (rayitas sueltas perpendiculares al cordón), **9-12 cajón de auto, fila pegada al cordón, y 13-16 fila de al lado** (marcado solo en las esquinas, como un encuadre: una "T" en cada esquina), **17-20 raya de pare** (línea perpendicular a la calle, de cordón a cordón, en la baldosa de afuera de la cebra). En 5-16 el valor dice dónde está el cordón (sur, norte, este, oeste). Todo (11/11/2026) sale de las fotos de Leandro del Centro. Las pinta `tools/osm_to_map.py` (después de las cebras) solo en el Centro, sobre asfalto, en calles de 4 baldosas o más (en las de 4, de un solo lado por tramo), rectas y a 4 baldosas o más de un cruce; las cuadras de la plaza las marca `VR.parkCars` en `world.line` mientras acomoda los vehículos a mano (y vacía la caché de bloques). Dibujo: `VR.drawBay`, `VR.drawStop` y `VR.BAY` (`pitch` 10 = 1,25 m entre rayitas; `carPitch` 40 = 5 m; `carDepth` 20 = 2,5 m) en `world.js`. `VR.parkCars` (`car.js`, `spot`) pone motos en batería centradas entre dos rayitas y autos en el centro de cada cajón (`snap`). **Cebras:** `GAP = 0` (pegadas al cruce; se probó 1 y Leandro prefirió 0). **Escala:** `VR.VK = 1.0` para los vehículos (escala real; antes ×1,15) y `VR.PS = 0.75` para las personas (`core.js`; los cuadros se dibujan a `VR.RES * VR.PS` y se estiran a `16 * VR.PS` × `32 * VR.PS` unidades en cada lugar donde se dibuja una persona).
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
- **Colectivos** (10/11/2026, pedido de Leandro): `indep` (colectivo urbano: blanco con franjas verde, roja y amarilla, 66×19) y `guairena` (micro de larga distancia: blanco con trompa roja y franjas amarilla, naranja y azul, 76×20). Pintura **solo por colores y silueta**, sin logos, letras ni nombres de empresa (regla del proyecto); nombres de modelo inventados ("Colectivo Tape Rupi", "Micro Tape Guasu"). Desde arriba: `VR.drawBus(config)` en `autos.js` (techo, ventanillas, ventilaciones o aire acondicionado, trompa de color y franjas en diagonal en el techo); de costado: `busIndepHD`/`busGuaiHD` en `sidehd.js` (`side: 'busindep'`/`'busguai'`). **Sin entrada en `VR.TUNE_MODELS`** (no se tunean, como el camión bomba): `nearGarage` ya no deja entrar al taller con un vehículo que no está ahí. Sorteo: `VR.pickCar(rnd, parked, roadW)`, 7 % de los autos en calles anchas (más micros en las de 6 baldosas), nunca estacionados.
- **Camiones** (10/11/2026, pedido de Leandro con fotos; archivo `src/game/camiones.js`): `camchata`, `camcarpa`, `camfurgon` (livianos de cabina adelantada, 48×19, por cualquier calle), `camvolcador` (72×21, amarillo o rojo) y `camtractor` (tractor + semirremolque granelero de lona, 100×21, rojo, azul o blanco), los dos últimos con `big: true` y `minW` (solo calles de 5 baldosas o más). Diseño propio por categoría, **sin marcas, logos ni letras**; nombres inventados ("Kamyõ Mirĩ Chata", "Kamyõ Guasu Granelero"…). Desde arriba: `VR.drawTruck(config)` (`kind`: flat, tarp, box, dump, grain); de costado: `truckHD` en `sidehd.js` (`side: 'cam…'`, enganchado con `/^cam/` en `VR.drawSideHD` y en `vcard.js`). El tractor y el volcador son un solo cuerpo rígido (no hay remolque articulado). Sin entrada en `VR.TUNE_MODELS`. Sorteo: `camiones.js` envuelve `VR.pickCar` (tractor 2 %, volcador 2,5 %, livianos ~4 % en calles anchas y ~8 % en las demás).
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
| `big`, `minW` | **camión grande** (10/11/2026): como `bus` pero con ancho mínimo propio (`minW`, en px); necesitan más lugar para aparecer (`len × 0.6`) y frenan en las esquinas como los colectivos |
| `bus`, `aiTurn`, `cruiseK` | **colectivo** (10/11/2026): el tránsito lo usa solo en calles de 5 baldosas o más y prefiere avenidas al elegir el siguiente tramo; gira más despacio (`aiTurn` × la velocidad de giro), va más lento (`cruiseK` × el crucero) y frena más en las esquinas |

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

### 6.12 Online (`online.js`)
Salas por código con WebRTC (PeerJS, `vendor/peerjs.min.js`, copiado a `docs/` por build.py; usa el servidor público gratuito de PeerJS solo para que los jugadores se encuentren). El que crea la sala (`Peer('villarrica-<código>')`) es el anfitrión y reenvía los mensajes a todos. Cada jugador manda 10 veces por segundo `{id, n: nombre, x, y, d: dirección, mv, c: [tipo, modelo, color, ángulo], L: look}`; `collect()` los dibuja con su personaje o vehículo y el nombre arriba. **Mundo compartido:** el anfitrión manda 5 veces por segundo su tránsito, sus unidades de emergencia y su gente (`sendWorld`); el anfitrión genera tránsito y gente también alrededor de cada invitado (`VR.extraFoci`, con cupo por jugador en `traffic.update` y `peds.update`) y solo borra lo que queda lejos de todos; el invitado, mientras le lleguen datos del anfitrión, no simula lo suyo y muestra copias (`follow`: autos con choque en `world` y extrapolación entre mensajes; gente identificada por `_nid`). Si el anfitrión deja de mandar 3 s, vuelve a lo propio. Conexión `reliable: true`. Eventos (`VR.onlineEv`): `shot`, `fl` (lanzallamas), `take` (te llevaste un auto del anfitrión); fuego, explosión y sirena viajan como banderas de cada auto. Las armas de otro jugador no te suman estrellas (`weapons.remote`). La ropa se manda cuando cambia. **Pasajeros:** `nearRide()` busca el vehículo de otro jugador a menos de 34 px con lugar (moto 1, auto 4, karumbe 2); el pasajero manda `r: idDelConductor`, sigue su posición y se dibuja con `drawPass` (en moto, sentado atrás). **Chat:** botón 💬 o tecla C; el personaje lo dice en un globo y llega a todos como evento `chat` (registro arriba a la izquierda, `VR.chatLine`). La lista de conectados está en Menú → Online (`names()`). Menú → Online (nombre y sala se guardan en `nick` y `sala`). Para probar sin internet: `window.__peerOpts = {host, port, path}` apunta a un servidor `peer` local.

### 6.13 Taller y cine (`taller.js`)
- **Taller Pyahu:** decal `taller` creada al cargar el mapa (`VR.loadMap`, misma vereda que la tienda, primer frente libre de 7 baldosas hacia el oeste). Con un vehículo en la puerta y ACCIÓN abre `VR.Garage` (piezas de `VR.TUNE_MODELS[modelo].parts`, vista `VR.drawSideHD`, paga con `VR.Wallet`). Online, el tuneo viaja en el estado del jugador (`c[5]`).
- **Cine del Teatro Municipal:** puerta en el lado sur de la decal `muni`; `VR.Cine` muestra un video de YouTube (`youtube-nocookie`) y, online, el evento `cine` `{v, t0}` hace que todos lo vean en el mismo segundo (el anfitrión lo repite en `sendWorld` para los que llegan tarde).
- **Cartelera de salas:** `VR.Salas` en `online.js` usa la API web de Firestore (sin librería) con `VR.FB = { projectId, apiKey }`; la sala se anota al crearla, se renueva cada 30 s y se borra al salir; la lista muestra las de los últimos 2 minutos. Si `VR.FB` es `null`, solo se entra con código.

### 6.14 Interior del Teatro (`teatro.js`)
Escena aparte (no usa el mapa): `VR.Teatro` con su propio piso, butacas (`seats`), choques (`solid`), cámara con vista un poco más lejana y un `iframe` de YouTube puesto encima del lienzo justo sobre la pantalla del escenario (`SCR`). En `main.js`, si `teatro.on`, `update` y `render` le pasan el control. Pantalla grande: `#tvFrame` (franja de arriba con telón en CSS; el `iframe` se ajusta a 16:9 en `draw`) y la sala de cerca abajo; sentado, «📺 Solo mirar» (`setFull`) la pone a pantalla completa. Online: el estado del jugador lleva `tz: 1` y `t: [x, y, dir, mv, sentado]`; los que están adentro no se dibujan en la calle.

### 6.15 Changas (`changas.js`)
`VR.Changas`: botón 📋. **Delivery** (moto): retirar en la Heladería Marimer (`world.labels`) y llevar a un punto de calle al azar (`spot()` sobre `world.roads.nodes`) con tiempo límite; 25.000 Gs. + 600 por segundo sobrante, 10.000 si llega tarde. **Taxista**: `start('taxi')` crea un sedán amarillo (`car.taxi`, cartel en el techo en `Car.draw`) y te sube; el cliente espera en un círculo verde (`collect`, `drawGround`), sube al acercarte despacio y se baja al frenar dentro del círculo amarillo; 15.000 + 9.000 por km, mitad si el auto perdió más de 20 de vida. Cada changa abre una explicación al empezar (`tutorial()`). **Chipa** (a pie): ACCIÓN junto a la gente (`peds.greet`), 60 % compra a 5.000, hasta 10. Para agregar una changa: un caso más en `start()`, `update()` y el botón del diálogo.

### 6.16 Manejo y daño
`VR.drive` (Menú → Manejo, guardado en `manejo`): `facil` (apuntás hacia dónde ir, como el táctil), `clasico` (costados giran) o `manual` (cambios en `car.gear`: E/RB o el botón táctil ▲ sube, Q/LB o ▼ baja (`VR.gearReq`), parado en 1ª bajar pone reversa; en táctil el joystick es volante y pedal; cada cambio limita velocidad y da más o menos fuerza en `physics`). El volante se suaviza (`car.st`) y gira menos a alta velocidad; más agarre en asfalto (11,5) y empedrado (8,5); contra las paredes se pierde poca velocidad (resbala). **Tablero táctil** (`panel.js`, `VR.DrivePanel`): en Manual con el teléfono, volante para arrastrar, pedales ACELERAR/FRENAR (`VR.td`), minipanel con km/h, rpm (`car.rpm`, luz roja > 6.000) y marcha, y botón AUTO/MAN (`VR.autoBox`: sube a más de 6.200 rpm, baja a menos de 2.600, reversa sola al frenar parado). **Daño** (`emerg.damage`): solo desde impacto 90, ×0,07, contra paredes ×0,6; con más de 35 de vida se recupera 0,5 por segundo; en el taller, botón Reparar (1.500 Gs. por punto).

### 6.17 Pantalla de título y menú de pausa (`titulo.js`, J0 de `claude/menu-plan.md`, 10/11/2026)
`src/game/titulo.js` (va en `SCRIPTS` de `build.py` **antes de `main.js`**): `VR.drawLogo(canvas)` dibuja el logo en pixel art (72×19, el CSS lo agranda con `image-rendering: pixelated`) y `VR.Titulo` es la cámara del fondo: modo `parque` (vuelta lenta por la laguna, spline cerrada a 0,8 del radio, sentido horario) o `recorrido` (panorámicas por plaza, Marimer, Municipalidad, cuartel, glorieta, Catedral y muelle, con fundido a negro: fases `play` → `out` 0,6 s → `black` 0,5 s → `in` 0,8 s). Las tomas salen de `world.labels`, los decals y la máscara `T.LAGUNA`, no de números fijos. En `main.js`: `mode` es `'title'` o `'game'`; en título se corre el mundo real sin jugador ni HUD (`body.title` esconde el HUD por CSS; el minimapa se redimensiona al volver: `drawMini` llama a `sizeMini()` si mide 0). Tránsito y gente se precalientan 6 s simulados en cada corte (`titleWarm`). El cisne `cisnes.list[0]` pasea solo con `s.auto` (`autoPedals`, con detección de atasco). Botones: Historia (deshabilitado hasta J1), Multijugador (entra al juego y abre Online), Paseo libre, Configuración, Créditos; teclado/control con `titleNav` (arriba/abajo, A acepta). Pausa (`#pause`): Seguir · Mapa · Online · Configuración · Salir al menú principal (`toTitle()`). Menú → Configuración → "Fondo del menú principal" (`settings.fondo`). `?libre` o `?juego` en la URL saltea el título (útil para pruebas automáticas). `window.__vr` suma `mode, title, startGame, toTitle, enterTitle`.

### 6.18 Modo Historia: vida y guardados (`vida.js`, J1 de `claude/misiones-plan.md`, 10/11/2026)
- **Dos modos** (`VR.modo`: `'libre'` | `'historia'`). El guardado de Historia usa el prefijo `h:` sobre las claves de progreso (`VR.store.PROG`: `pos:`, `dest:`, `plata`, `ropa:mia`, `look:propio`, `pj`, `vida`); los ajustes (sonido, fps, manejo…) y `modo` (el último usado) son comunes. `VR.store.ns` lo fija `main.js` al arrancar. Para sumar una clave de progreso, agregarla a `PROG`.
- **Cambiar de modo recarga la página** (`switchModo` en main.js, con `sessionStorage 'villarrica:go'`; el cambio manda sobre la URL). `?historia` / `?libre` en la URL arrancan directo en ese modo, sin menú.
- `VR.Vida` (`VR.vida`, solo en Historia): `s` = `{ min, hambre, saldo, debe, pieza:{saldo,vence,fuera}, mov[], metas[] }`. `tick(dt)` (se llama en `update()` solo con el juego corriendo: pausa y menús frenan el reloj). **1 día = 30 min reales** (1 min del juego = 1,25 s); día 1 = lunes 7:00; `VR.gameHour` alimenta `night.target('juego')`. Hambre baja 100 por día (< 25 no se corre: `VR.noRun`; en 0 desmayo → hospital 120.000 Gs. con `onDesmayo`). Saldo: 10.000 Gs. = 3 días; sin saldo no hay changas por la app (`changas.start`, salvo chipa). Pieza: 200.000 Gs. por semana, se suma al "debés" cada sábado 12:00; dos semanas sin pagar → `pieza.fuera`.
- **Plata:** `VR.Wallet.add(n, motivo)` en Historia pasa por `vida.mueve`: de cada cobro el 50 % paga `s.debe`, y todo queda en `s.mov` (últimos 30, se ven en Billetera). `cobrarODeber` (gasto que si no alcanza queda como deuda), `gasta`, `come`, `cargaSaldo`, `pagaPieza`. Precios en `VR.PRECIOS`, metas en `VR.METAS`.
- **HUD** (`vidaHud` en main.js): hora y hambre, saldo y pieza, deuda en rojo. **Pausa** en Historia: Billetera y Metas (`#vDlg`), sin Online; sin teletransporte (`teleport()` lo bloquea, se oculta "Ir ahí" y las opciones `.soloLibre`: hora del día, +1.000.000, volver a la plaza). La Billetera tiene botones **provisorios** para comer, cargar saldo y pagar la pieza hasta que existan la despensa y la pieza (J3). Menú → Configuración → "Empezar la Historia de cero".
- Historia nueva arranca en una vereda de Santa Lucía (`spotInBarrio`) con 35.000 Gs. y una presentación (`maybeIntro`).

### 6.19 Misiones, diálogos y barrios por historia (`misiones.js`, J2 de `claude/misiones-plan.md`, 10/11/2026)
- **`VR.MISIONES`**: las misiones son datos (receta completa en el comentario de arriba de `misiones.js` y en 7.11). **`VR.Misiones`** (`VR.mis`, solo en Historia; en Libre es `null`): una misión activa (`s.act = { id, paso, n, t, v, check, vCheck, dlgOk, fallo }`), `s.hechas`, `s.cap`, `s.barrios`, `s.changas`; se guarda en `VR.store 'mis'` (con prefijo `h:`) en cada paso. Al arrancar, `entrar(paso, true)` retoma la misión guardada (pone el GPS y repite lo que haga falta) o `auto()` arranca la primera.
- **Pasos:** `ir` (lugar o `{x,y,name}`; círculo rosa en el piso), `hablar` (personaje; ▼ rosa encima), `dlg` (diálogo al empezar, una vez), `esperar` (`{ev, n}`: cuenta eventos de `VR.mis.emit`), `cond(M)`, `limite` (s), `punto` (guardado para reintentar), `changa` (la deja usar aunque esté cerrada), `alEmpezar(M, reanuda)`, `alTerminar(M)`. `fallaSi` (en la misión o en el paso) = eventos que la hacen fallar → caja con "Reintentar desde el último punto" / "Más tarde".
- **Eventos que manda el juego:** `come`, `saldo`, `pieza` (vida.js), `venta`, `cobro` (changas.js), `subir`, `bajar`, `arresto`, `explota`, `hospital` (main.js).
- **Personajes** (`VR.PERSONAJES`): nombre, color, look del avatar 2, `lugar` (`'plaza'` o `{ en, dx, dy }`), `charla` (lo que dicen si no tienen nada para vos, en globo). Se dibujan en el mundo (miran hacia vos), con su nombre cerca y ▼ (te toca hablarle) o ! amarillo (te da una misión), también en el minimapa y el mapa grande. ACCIÓN cerca = hablar (`mis.near` / `mis.talk`). Solo aparecen en barrios abiertos, salvo que la misión los necesite.
- **Lugares** (`VR.Lugares`, `VR.lugares.get(k)`): `pieza` (`vida.s.casa`, vereda de Santa Lucía a ~1 km de la plaza), `plaza`, `muni`, `marimer`, `aopora`, `parque`, `cisnes`, `cuartel` (Lomas Valentinas), `catedral`, `terminal`; siempre en un punto libre (`libre`).
- **Diálogos** (`VR.Dialogo.show(lineas, fin, ctx)`, caja `#dlgBox`): pausa el loop, carita del avatar 2 (`VR.carita`, cabeza y hombros a k = 4), texto que se escribe solo, opciones (dedo, 1–4, flechas + Enter, cruceta + A). El control se lee con su propio `requestAnimationFrame` porque el loop está en pausa. Una opción que devuelve `false` corta el paso; si devuelve un arreglo de líneas, se dicen a continuación.
- **Barrios por historia** (`VR.Barrios`): `abierto(nombre)`, `enPunto(world, x, y)`, `abrir(nombre)`. Empiezan abiertos Santa Lucía y Centro (`VR.BARRIOS_INICIO`); "Afueras" cuenta como abierto. En uno cerrado: cartel 🔒 con "Ndereikuaái gueteri avave ko'ápe", el GPS no marca destinos (`setDest(d)` sin `deMision`), no se empiezan changas, la gente no compra chipa y `Changas.spot` no elige direcciones ahí.
- **Changas en Historia:** se abren con los premios de las misiones (`premio.changas`); las cerradas salen con 🔒 en 📋.
- **J3 · lugares para usar** (`VR.PUNTOS`): `despensa` (puesto en la vereda sur, al sudeste de la plaza: comida de `VR.DESPENSA` y saldo) y `pieza` (dormir desde las 18:00 hasta las 6:00 con `vida.dormir()`, guarda). Personajes con `menu(M)` (Doña Chela: chipa, canasto, llenar el canasto, pagar el fiado; Ña Ramona: pagar la pieza) cuando no tienen nada de misión. `VR.Lugares.libre` solo elige vereda, plaza o pasto (nunca la calle).
- **Canasto** (`vida.s.canasto`, `stock`, `fiado`): la chipa se compra a 3.000 y se vende a 5.000, hasta 20 por canasto; en Historia la changa de chipa vende del stock (sin tope de 10) y termina cuando se vacía. `llenaCanasto(n, fiar)`, `pagaFiado()`; el fiado suma a la deuda del HUD.
- **Canasto equipado** (`vida.s.equipo = 'canasto'`): G o el botón 🧺 lo pone en la mano (se dibuja en `Player.draw`); el botón ACCIÓN pasa a 🥐 VENDER y vende al lado de la gente sin empezar la changa. `changas.start('chipa')` en Historia solo lo equipa.
- **Robar en Historia** (`noRobar` en `main.js`): al tránsito, solo con un arma (hoy las de desarrollador); los estacionados, con herramientas (`vida.s.herr`, llegan en J6). Siempre se puede con los tuyos (`c.mio`), uno que ya te llevaste (`c.robado`) o el último que manejaste. Libre igual que antes.
- **Globos que no se enciman:** `Player.prototype.drawBubble` sube el globo si choca con otro del mismo cuadro (`VR._bubs`, se vacía en `render`).
- **Celular** (Historia; botón 📱, tecla C o Pausa → Celular; `celDlg` en `main.js`): apps Mbohasa, Billetera, Mochila, Ropero (la tienda en modo `shop.ropero`: solo lo que ya tenés), Changas, Misiones, Metas y Mapa. Sin saldo, Mbohasa y Changas no andan.
- **Dos platas:** efectivo (`VR.Wallet`, `plata`) y billetera electrónica (`vida.s.banco`; `vida.banco(n, why)`, `pagaBanco`). Efectivo: chipa, despensa, Doña Chela, Ña Ramona, premios. Electrónica: Jaha, changas de la app (`changas.pay(n, why, efectivo)`), Ao Porã. Hospital y multas: efectivo, después la cuenta, después deuda. **Cajeros** (`VR.PUNTOS.cajero`, frente al banco de la esquina noroeste de la plaza; `cajero2`, cerca de tu pieza): depositar y sacar.
- **Mbohasa** (viajes, nombre inventado; internamente `jaha`): con un destino en el GPS, moto 10.000 + 3.000/km o auto 15.000 + 5.000/km (distancia en línea recta × 1,3). Llega en 8–18 s, subís y aparecés en el destino (`teleport(x, y, name, true)`), pasa la hora del viaje y se emite `jaha`.
- **Menú:** Pausa → 📌 Misiones (en curso con objetivo, marcar en el GPS, reintentar, dejar; para empezar; cumplidas; barrios). Configuración → Desarrollador (solo Historia): saltar el paso, abrir todos los barrios.

### 6.11 Tienda (`shop.js` + diálogo en `shell.html`)
"Ao Porã": vende lo de `VR.AV2_CAT` con sus precios; guarda en `ropa:mia` y `look:propio`; la plata en `plata`. La puerta está en la decal `tienda`.

---

## 7. RECETAS (paso a paso)

### 7.1 Agregar un AUTO nuevo
*(Para un vehículo largo tipo colectivo, copiá `indep`/`guairena` en `autos.js`: `bus: true` lo manda a las calles anchas; el costado va aparte en `sidehd.js` y se engancha en `VR.drawSideHD` y en `vcard.js`.)*
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

### 7.11 Agregar una MISIÓN (modo Historia)
1. En `misiones.js`, si hace falta, un personaje nuevo en `VR.PERSONAJES` (look con el catálogo `VR.AV2_CAT`, `lugar`, `charla`) y un lugar nuevo en `VR.Lugares.base` (+ `VR.LUGAR_NOMBRE`).
2. La misión en `VR.MISIONES` con `quien` (o `auto: true`), `req: { cap, mis }`, `oferta`, `pasos` y `premio` (plata, barrios, cap, changas, texto).
3. Si un paso espera algo que el juego todavía no avisa, agregar `if (VR.mis) VR.mis.emit('evento', datos)` donde pasa (y anotarlo en 6.19).
4. Probar con `?historia`: Configuración → Desarrollador → "saltar el paso" ayuda a llegar rápido; Pausa → Misiones muestra el estado.

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


### Celular roto, préstamos y barrios (11/11/2026)

`vida.js`: `s.celu` ('roto'/'ok'), `celuRoto()`, `arreglaCelu()`, `compraCelu()`, `VR.PREST` (banco/financiera), `pidePrestamo`, `pagaPrestamo`, `cobraCuotas` (sábado mediodía). `misiones.js`: lugares `financiera` y `celulares`, `VR.prestamoMenu`, `VR.celularesMenu`. `shell.html`: `#celRoto` (SVG), `.celNav`; el aviso (`#toast`) baja con `body:has(#vcard.show)`. `main.js`: `paintCel`, `buildMap` (tinte y límites por `world.barrio`).

## Atropellos y vida del jugador (11/11/2026)
- `src/game/ragdoll.js`: `VR.Ragdoll(vx, vy, power, dir)` con `step(dt, obj, world)` y `draw(ctx, sprite, x, y)`. Vuelo (z, gravedad), giro, hasta 3 rebotes, patina y queda tendido; solo choca contra paredes (vuela sobre los autos).
- Peatones: `peds.carHit(p)` busca vehículos en movimiento (>30) sobre la persona; `p.rag` reemplaza al sprite acostado. Si el vehículo es el del jugador (`o.driven`) sigue llamando a `VR.onPedHit` (crimen y ambulancia).
- Jugador a pie: `player.knock(vx, vy, power)`; `runOverCheck()` en main.js. Moto: `VR.onEject` (impacto > 140) te tira de la moto.
- Vida: `hp` en main.js (`hurtPlayer`, `hpTick`), barra "❤ n%" solo cuando está por debajo de 100; a 0 te llevan al hospital (`sentTo`) y se cobra curaciones.
- Los vehículos ya contaban como paredes para el jugador y los peatones (`world.hits` incluye `boxOverlap`).

## Perros callejeros (12/11/2026)
- `src/game/perros.js`: `VR.Perros(world, peds)`; hasta 4 perros cerca de la cámara (aparecen a 280–520 u, se borran a 950). Sprites por código (6 paletas × poses: trote 2 cuadros, parado, sentado, echado, olfateando; de frente y de espaldas). `VR.audio.bark(x, y, yelp)` en audio.js.
- Comportamiento: idle (poses) → trot → idle; ladran cada 12–40 s; `perros.pet(player)` con ACCIÓN a menos de 26 u los hace seguirte 40 s; se apartan corriendo de cualquier vehículo a más de 45 de velocidad (`world.carsIn`). Nunca se lastiman (no usan ragdoll).
- Se actualizan y dibujan desde main.js (`perros.update`, `perros.collect`).

## Gente de la calle (12/11/2026)
- `src/game/calle.js`: `VR.Calle(world, peds, {toast, heal, hambre})`, hasta 3 a la vez cerca de la cámara (más en el Centro), en rotación: empanadero y heladero (caminan lento con canasto / carrito), artesano hippie argentino y artesana/o indígena (manta con sus cosas), y persona en situación de calle (cartón). Todos adultos. Look por `VR.av2Lazy`.
- ACCIÓN cerca: `calle.act(player)` cobra con `VR.Wallet` (empanada 5.000, helado 3.000, pulsera 10.000, artesanía 15.000, moneda 1.000); empanada y helado devuelven vida (`VR.heal`) y, en Historia, hambre. Pregones propios de cada uno en globos. El aviso aparece como pista (`hint`) en main.js.

## Árboles: tronco visible y copa transparente (12/11/2026)
- `world.collectTall`: cada árbol dibuja la copa (con `globalAlpha` suavizado en `t._a`) y, aparte y encima, el tronco (sube hacia la copa; con cal en las plazas). La copa baja a ~34 % cuando `VR.reveal` (jugador o su vehículo, se fija en main.js antes de `collectTall`) está bajo ella y detrás del tronco.
- `calle.underTree`: los vendedores no se generan bajo una copa.
- (corrección 12/11/2026) Árboles de las plazas: copa ×1,35 levantada (`lift` = 0,8 × radio) sobre un tronco largo con cal que se dibuja ANTES que la copa; tronco y copa se vuelven transparentes si el jugador está detrás. El índice de chunks sube hasta 3,2 radios sobre el árbol.
- Globos de vendedores y perros: se acumulan en `VR._late` y main.js los dibuja al final, sobre árboles y banderas. La pista "ACCIÓN: …" del vendedor se muestra debajo de sus pies.

## Zoom suave (12/11/2026)
- `VR.screen.setLive(base)` (escala continua, sin cambiar la resolución del lienzo) y `settle(base)` (vuelve a la escala de reposo nítida); `snapBase(base)` da la base de reposo más cercana.
- main.js: `zoomTick(dt)` acerca `baseCur` de a poco (ease exponencial) a `wantBase()` = (WALK/DRIVE_BASE) / zoomK; 0,3 s después del último gesto el objetivo pasa a la base de reposo, así no hay salto al terminar. Subir o bajar de un vehículo también se recorre suave (antes era una transición CSS).
- (ragdoll más vivo, 12/11/2026) En el aire mueve brazos y piernas (cuadros de correr); chispas del golpe, polvo al rebotar y al caer, temblor al quedar en el piso y `rise()` (se endereza en 0,5 s). El jugador puede levantarse antes moviendo el joystick (a partir de 0,9 s en el piso). `VR.shake(t, amp)` sacude la cámara solo con golpes al jugador (`rag.shakes`).

## Caídas y choques (12/11/2026)
- `src/game/caidas.js` (`VR.caidas`): `motoDown(c, imp)` (la moto del tránsito queda tirada, el conductor sale despedido con `VR.Ragdoll`, se levanta, te reta; si no fue grave —`hp > 45` e impacto < 230— levanta la moto y sigue, si no se va caminando y la moto se retira del tránsito a los 6 s); `aiHit(o, víctima, sp)` (auto del tránsito que atropella: frena 1,6 s, bocina, el conductor protesta; moto rápida: 50 % se cae).
- Disparadores: car.js (`impact > 110` en una moto del tránsito), peds.js (`carHit` de un vehículo que no es el tuyo) y `runOverCheck` de main.js.
- Moto caída (`c.fallen = {t, side}`): se dibuja girada ~65°; al subirte con F la levantás (`enterCar`). Tu propia moto queda caída cuando te tira (`VR.onEject`).
- Abolladuras: `VR.addDent` / `VR.drawDents` (hasta 10 por vehículo, en el punto del contacto). Con hp bajo siguen el humo y el fuego de emerg.js.
- (12/11/2026) Abolladuras: se meten hacia adentro de la chapa (no en el borde), se juntan si caen cerca y se dibujan como pocos píxeles hundidos, un raspón claro y a veces óxido. Conducción: el giro rinde ~25 % más y también a poca velocidad; en modo fácil (joystick) el auto levanta el pie y frena solo antes de una curva cerrada (`safe` en `Car.update`) y el volante responde más (`steer = d * 3`).

## Hospital, comisarías y terminal (11/11/2026)
- **Mapa** (`tools/osm_to_map.py`, lista `POIS`): edificios que OSM no nombra se ubican por coordenadas y reciben estilo, cartel y un decal sobre el techo (`cruz` roja en hospital y sanatorio, `escudo` azul en comisarías; se dibujan en `VR.decorOver`). Hospital Regional = caja entre Av. España, Gral. Duarte, Spezzini y 25 de Noviembre (fotos de Leandro). Sanatorio Modelo (Beato Roque González), 8 comisarías y la Jefatura salen de OSM. `meta.pois` → `world.pois` (nombre → baldosa).
- **Vehículos estacionados** (`VR.parkCars`, bloque "Terminal, hospital y comisarías"): 5 micros (Guaireña/Independencia) contra el cordón frente a la Terminal, 2 ambulancias frente al hospital y una patrullera por comisaría; deja `world.hospital` y `world.comisarias` (punto a pie).
- **Juego:** `sentTo(msg, 'hospital'|'comisaria')` en `main.js` (explotar, desmayo y vida 0 → Hospital Regional; arresto → comisaría más cercana). `emerg.dispatch`: la ambulancia sale del hospital y la patrulla de la comisaría más cercana si queda a < 1300 px.
- Pendiente: sirena y entrada visible, paradas y pasajeros en la terminal, más frecuencia de colectivos, hospital público vs. sanatorio privado (cobro distinto).

## Más colectivos y apps del celular (11/11/2026)
- **Colectivos:** `traffic.spawn` fuerza colectivo (30 %) en autos que aparecen a menos de 900 px de la Gobernación, la Municipalidad o la Terminal; los colectivos ahora pueden usar calles de 4 baldosas (antes 5; en `pickCar` 3 % en calles de 4 y 7 % en las de 5+).
- **`game/celapps.js`:** `VR.Fotos` (guarda hasta 14 fotos JPEG chicas en `localStorage` `vr_fotos`, con lugar y hora al pie) y `VR.Culebra` (Snake 16×16, récord en `vr_culebra`).
- **main.js / shell.html:** apps Cámara, Galería y Culebra en el celular. La Cámara cierra el celular y muestra el visor (`#camUI`: obturador, galería, cerrar; el HUD se oculta y el juego sigue: podés caminar y encuadrar). La Galería muestra las fotos, permite guardarlas en el teléfono (descarga) o borrarlas.

## Apps dentro del celular (11/11/2026)
- Ya no hay apps que abran el menú o pantallas fuera del teléfono: **Notas** (antes Metas; papel rayado con letra a mano *Caveat*, OFL, embebida en `game/caveat.js`; muestra metas, pieza, saldo, hambre, deudas y cuotas), **Misiones** (`paintMis(host, enCel)`), **Changas** (botones de `changas.lbl` → `changas.start(k)`) y **GPS** (el mapa grande se reparenta dentro de `#celBody` con la clase `enCel`; los cálculos usan el tamaño de `#mapBox`, no la ventana).
- En Historia: `#btnMap`, la tecla del mapa, el minimapa y el menú de pausa abren el celular en el GPS (`openMapAuto`); sin teletransporte. El **Ropero** salió del celular (la ropa se cambia en la tienda Ao Porã).
- `unmapCel()` devuelve el mapa al `body` al salir de la app.

## Caritas con expresiones (11/11/2026)
- `game/retrato.js`: `VR.retrato(look, id, exp, open, color)` dibuja el avatar a k = 16 con una cara propia (ojos con iris y brillo, cejas, nariz, boca, arrugas en los mayores, barba y lentes redibujados) y fondo con el color del personaje (variante D del mockup). Expresiones: `neutral`, `feliz`, `enojado`, `triste`, `sorpresa`, `duda`; `open` = boca abierta (se alterna mientras se escribe el texto). ~70 ms por cara, con caché.
- Ganchos en `avatar2.js` (`L._face` antes del pelo: mejillas, nariz, boca, barba; `L._face2` después: ojos, cejas, lentes). Sin esas marcas el avatar se dibuja igual que siempre: **la tienda y el juego no cambian**.
- En los diálogos, una línea puede llevar `exp: 'enojado'` (etc.); si no, `!` → feliz, `?` → duda, otro → neutral.

## Interior de la pieza (11/11/2026)
- `game/pieza.js`: `VR.Pieza` (en Historia: `VR.pieza`). Escena aparte de 256×224 (`#piezaView`) con su propio bucle; el juego queda en pausa (`VR.loop.paused`). Entrás con ACCIÓN en la puerta de tu pieza (lugar `pieza`, menú "Entrar a la pieza"); salís por la puerta o con 🚪 Salir.
- Adentro: cama (dormir → `vida.dormir()`), ropero (abre la tienda en modo ropero), radio, ventana, anafe (mate cocido +6 hambre), conservadora/heladera, manchas para limpiar (6; con 3 limpias aparece el gato Mbarakaja, con 6 Ña Ramona da 20.000 Gs. una vez), cucaracha (chinelazo), vecinos que se oyen por la pared, y los muebles comprados: colchón, ventilador, heladera, tele, sillón, cortinas, alfombra y lengua de suegra.
- Estado en `vida.s.pieza`: `items`, `manchas` (máscara de 6 bits), `gato`, `premio`, `heladDia`. Al dormir vuelve una mancha y mejor pieza = menos hambre al despertar (+2 por mueble, máx. 8); el colchón nuevo cura toda la vida (si no, 40).
- App **🛒 Mercadito** del celular (`VR.PIEZA_ITEMS`): se paga con la billetera electrónica y el mueble aparece adentro.

## 6.x Suciedad y desgaste de las calles (11/11/2026)

`src/world/suciedad.js` (`VR.grime`, lo llama `world.js` en el paso 3 de cada bloque). Se pinta una vez en el piso: arena/tierra contra el cordón, basuritas (bolsa, botella, papel, lata, hojas, cartón), grietas, baches, parches, manchas de aceite, pastito en el cordón y el empedrado, polvo en la vereda. Varía por baldosa (`VR.hash`) y por barrio: el Centro con factor 0,4 y el resto con 1. Para agregar un detalle: una función nueva en ese archivo y una llamada en `VR.grime`.

Segunda tanda (`VR.grime2`, mismo archivo): charcos fijos (barro en calles de tierra), cordón con pintura blanca descascarada y pedazos rotos, raíces que levantan las baldosas junto a los árboles, baldosas rotas, tachos con bolsa y obras (ladrillos, arena, bolsas de cemento) frente a los edificios. Falta: postes y cables, pintura de líneas y cebras gastada, lluvia (los charcos ya están).

### Postes y cables (11/11/2026) — quitados

Se probaron postes de luz con cables (6.600 postes sobre la red de calles) y Leandro los sacó por poco realistas: una ciudad real tendría cables cruzando todas las calles. El código se borró del repo (está en el commit d00abd0).

### Pieza en alta (11/11/2026)

`pieza.js` ya no usa el sprite chico: la escena (256×224 unidades) se pinta vectorial a la resolución de la pantalla (`this.s` = escala × devicePixelRatio, máx. 2). `buildBG()` arma el fondo fijo (pared con descascarado y humedad, piso de cerámica con brillo y grietas, ventana con cielo, muebles con sombras, alfombra, manchas) y lo guarda en `this.bg`; se rehace solo si cambian muebles, manchas, hora del juego (noche) o el tamaño. Cada cuadro solo se dibuja lo que se mueve (`dyn`: aspas, pantalla de la tele, vapor, polvo), el personaje (`VR.av2Lazy(look, 7)`, alta), el gato y la cucaracha (vectoriales). De noche la pieza se oscurece, el foco brilla y la ventana muestra luna y estrellas.

### Interiores caminables: `VR.Salon` y la tienda Ao Porã (11/11/2026)

`src/game/salon.js`: motor chico de interiores (como la pieza: juego en pausa, escena vectorial a la resolución de la pantalla, fondo fijo cacheado, solo se dibuja lo que se mueve). Se arma con un objeto de configuración: `W/H`, `start`, `bounds`, `objs()` (cajas sólidas y puntos de acción), `bg(g, s, self)` (fondo), `items(self)` (cosas con orden en profundidad), `act(obj, self)` y `tick(dt, self)`. `VR.crearTienda` es la tienda de ropa por dentro: percheros, mesa de remeras, estantes, mostrador con la dependienta, maniquíes (avatares en gris), probador y silla de peluquería que abren el probador de `shop.js` (pestaña Arriba o Peluquería) y dos clientes que caminan solos. Desde la calle, ACCIÓN en la puerta llama a `VR.tienda.entrar()`. Para otro interior: otra función como `crearTienda` con su configuración (el teatro sigue con su motor propio, `teatro.js`).

`VR.crearDespensa` (también en `salon.js`): la despensa Ñande Róga por dentro (estantes con mercadería, heladera de gaseosas, cajones de verdura, góndolas, mostrador con la dueña, balanza y caja, un cliente que camina). El puesto de la vereda sigue igual y su menú ofrece «Entrar a la despensa»; en el mostrador se abre el menú de compra de siempre (`VR.despensaCompra`).

El **Teatro Municipal** por dentro también se redibujó en alta (11/11/2026): `Teatro.buildHQ()` arma dos lienzos a 3× (fondo: alfombra con dibujo, pasillos con luces, paredes de listones con apliques, escenario con telón de terciopelo, piso lustrado con luces de color, truss con reflectores y butacas con almohadón; frente: palco blanco curvo, puertas de vidrio y cartel de SALIDA) y `draw` solo los pega; la gente y el video siguen como antes.

## Despensa en modo Libre
En Libre no existen `mis` ni `VR.PUNTOS`, así que `main.js` crea `VR.despensa` con una compra por `VR.Wallet` y un `puestoL` (puesto dibujado con `VR.PUNTOS.despensa.draw` en `Lugares('despensa')`, radio de interacción 44). En Historia sigue yendo por `VR.Misiones`.

## Marcadores de entrada
`entradas()` (main.js) lista los lugares enterables (tienda Ao Porã, teatro, taller y todos los `VR.PUNTOS`: despensa, pieza, cajeros, financiera, celulares). Se dibujan: en la calle con `drawEntrada` (flecha + ícono que late, se oculta a <44 u porque ahí aparece el hint), en el minimapa (pegados al borde si están lejos) y en el mapa grande (ícono + nombre). Para sumar un lugar nuevo, agregalo ahí.

## Revisión de textos (equipo)
- `python3 tools/textos_extraer.py` saca ~520 textos visibles del código (diálogos, avisos, carteles) a `tools/textos.json`. `build.py` lo hace solo y arma `docs/textos.html`, la página donde el equipo marca cada texto: ✔ se queda / ✖ se va / ✎ cambiar (con el texto nuevo). Guarda en el navegador y exporta `textos-revisados.json`.
- `python3 tools/textos_aplicar.py textos-revisados.json [--probar]` aplica los cambios al código (por archivo + texto + nº de aparición, no por línea), chequea la sintaxis y vuelve a armar `docs/`. "Se va" solo se quita solo si es un elemento de una lista de frases; si no, lo lista para resolverlo a mano.
- Se saltan avatar, catálogos y archivos de motor; los pedazos de frases armadas con `+` no aparecen.

## Vehículos en vista oblicua (13/11/2026, `src/game/oblicuo.js`)

Pedido de Leandro: en Gangstar los autos no se ven planos desde arriba, se ven también un poco de costado (techo + puerta, ventanillas y ruedas del lado que mira a la cámara), igual que el personaje. Los nuestros eran planos. Ahora **todos los vehículos tienen volumen**, en los 64 ángulos.

**Retoque del mismo día (segunda versión), por lo que vio Leandro al probar:** el dibujo no seguía al vehículo al doblar (tampoco el conductor de la moto), las ventanillas salían dos veces, los vehículos se veían altos ("gorditos") y el karumbe era una carreta. Los cuatro puntos están arreglados; ver abajo.

Referencia usada: los cuadros de autos de la carpeta de assets de Gangstar (paquetes `k_00`…`k_04`), **solo para mirar la perspectiva**. No se copió nada: los dibujos siguen siendo los nuestros, hechos por código.

### Qué cambió

- **Autos, camionetas, todoterrenos, deportivos, patrulleras, ambulancia:** se ve el costado con zócalo, puertas, manijas, pasarruedas y ruedas con llanta, las ventanillas de la cabina, y de frente o de atrás los faros, la parrilla y las luces. El parabrisas y la luneta quedan inclinados.
- **Colectivos y micro:** costado con la fila de ventanillas, parantes, puertas y las franjas de la empresa (solo colores).
- **Camiones:** cabina con puerta y ventanilla, y la carga con su altura (chata, baranda con carpa, furgón, volcador con costillas, granelero con lona). **Camión de bomberos** con persianas.
- **Motos:** ruedas, escudo, tanque, asiento, manubrio y escape con altura; el **conductor y el pasajero** van sentados encima (piernas, torso y cabeza en tres alturas).
- **Karumbe:** rehecho con la foto de Leandro de uno de Villarrica. Ya no es una carreta: es el **coche de caballo de pasajeros**, con caja de madera pintada (naranja, roja, azul, verde o amarilla), ventanas con parantes blancos, **techo blanco con borde turquesa**, pescante, cuatro ruedas chicas de goma y el carrero adentro. Cambiaron el dibujo de arriba, el costado con volumen y los dos dibujos de la tarjeta.
- **Ventanillas:** el dibujo de arriba ya no pinta las ventanillas a los dos lados del techo (era de la vista plana); ahora van solo en el costado. El parabrisas y la luneta siguen arriba.
- La **sombra** ahora es la silueta apoyada en el piso (antes era la del sprite entero).
- El cartel del taxi, las luces de la sirena y las abolladuras se dibujan a la altura del techo o del costado.
- La física, los choques, el tamaño en la calle y el estacionamiento **no cambian**: el vehículo ocupa lo mismo en el piso y el volumen crece hacia arriba en pantalla, como los edificios.

### Cómo está hecho (`src/game/oblicuo.js`)

Cada vehículo sigue teniendo su dibujo desde arriba (`VR.vbase`) y ahora, además, un **perfil** (4.º parámetro de `VR.vbase`, una función que devuelve el perfil):

| campo | qué es |
| --- | --- |
| `L`, `H` | largo del dibujo y altura máxima (unidades: 8 = 1 m) |
| `top`, `bot` | altura del techo de cada franja a lo largo del vehículo (lista `[[y, altura], …]` o función) y desde dónde empieza (0 = llega al piso) |
| `side(g, H)` | pinta el costado en coordenadas (y a lo largo, v de altura): `H.R(u0, v0, u1, v1, color)`, `H.wheel(u, radio, llanta)`, `H.disc(…)`; o `'self'` para usar el dibujo de arriba oscurecido |
| `ins(y, v)`, `tin(y, v)` | cuánto se angosta la pared y la tapa a esa altura (negativo = solo los bordes, para ruedas a los costados) |
| `caps` | franjas del dibujo de arriba que se copian en la trompa y la cola (faros y luces) |
| `layers` | alternativa por capas: `[{ img, z0, z1 }]` (así va el conductor: piernas, torso, cabeza) |
| `lift` | altura a la que van el cartel de taxi y las luces de la sirena |

El vehículo se "apila": para cada altura se dibuja la silueta girada y corrida hacia arriba, pintada con la fila del costado que le toca, y encima la franja del dibujo de arriba que queda a esa altura.

- Perfiles: `VR.OBL.car(config)` (todo lo de `VR.drawAuto`; alturas `hz: [capó, techo]` por modelo), `VR.OBL.bus`, `VR.OBL.truck`, `VR.OBL.bomba`, `VR.OBL.karumbe`, `VR.OBL.moto(modelo)` (tabla `MOTO`) y `VR.OBL.parts` (conductor).
- `VR.OBL.kz` (**0,46**; empezó en 0,68 y Leandro los vio demasiado altos): cuántos píxeles sube cada unidad de altura. Más = vehículos más altos.
- `VR.rotFrames` suma lugar arriba y abajo al cuadro (sigue centrado), guarda `F.lift` y hace la sombra con la silueta plana.
- **Rendimiento:** las capas se apilan **en memoria, píxel por píxel y sin girar** (correr una capa hacia arriba en pantalla es correrla en diagonal en el dibujo sin girar) y al final se gira todo junto una sola vez. Un ángulo nuevo cuesta ~1 ms de apilado en la PC para un auto y ~5 ms para un colectivo (la primera versión giraba capa por capa: 10 y 55 ms), así que se hace **en el momento**: el dibujo sigue al vehículo y al conductor cuando doblan. Medido en la PC manejando por el centro: mediana 16,7 ms, 3 cuadros de más de 25 ms en 850 (con los dibujos planos de antes, 2).
- La primera versión usaba una cola que repartía el trabajo entre cuadros y mientras tanto mostraba el ángulo de al lado: por eso el dibujo "llegaba tarde" al doblar. La cola quedó en el código pero apagada (`VR.OBL.async = false`).
- Para probar: `?plano` en la dirección muestra los vehículos como antes, `?kz=0.8` cambia la altura, `?cola` vuelve a prender la cola vieja.

### Receta: vehículo nuevo

- Si usa `VR.drawAuto`, `VR.drawBus` o `VR.drawTruck`, **ya sale con volumen**. Para un auto, ajustar `hz: [altura del capó, altura del techo]` en su configuración si es más alto o más bajo que lo normal (auto 7,2 y 11,4; todoterreno 8,8 y 14).
- Si tiene dibujo propio (`VR.vbase(w, h, fn)`), agregar el perfil como 4.º parámetro; sin perfil se ve plano, como antes.
- Moto nueva: una entrada en la tabla `MOTO` de `oblicuo.js` (ruedas y tramos con sus alturas).

### Probado

- PC: hoja de prueba de todos los modelos en 10 ángulos, y el juego manejando una moto y un auto, de día y de noche, con un auto en llamas, taxi y sirena: 0 errores.
- **Sin probar en el teléfono** (lo más importante a mirar ahí: que no haya tirones cuando aparece tránsito nuevo).

### Conocido / para ajustar

- Con la altura más baja, el costado de las ventanillas de los autos comunes es finito (~2 px en pantalla). Si se quiere otra altura, es un solo número (`VR.OBL.kz`).
- Karumbe: el caballo de costado es simple (cuerpo, patas y cabeza en bloques); falta que Leandro confirme colores y forma contra los de verdad.
- Espejos, guardabarros anchos, alerón alto y rueda de auxilio no tienen altura propia (van pegados a la carrocería).
- La tarjeta del vehículo y el taller siguen usando el dibujo de costado en alta (`sidehd.js`), sin cambios.
- Los vehículos quemados usan el mismo volumen oscurecido.

## Sol y sombras según la hora (13/11/2026)

`src/game/sol.js` (`VR.sun`): dirección, largo y fuerza de las sombras y tinte según la hora (reloj real, hora de Historia, o `?sol=HORA` para probar; `?sinsol` apaga todo). `World.renderShade` (world.js) arma una capa de sombras por chunk (`ch.shade`, se rehace cuando cambia `VR.sun.key`, máx. 2 por cuadro) en vez de las sombras fijas dibujadas en el piso. Autos (`Car.draw`), personas, perros y bomberos usan `VR.sun.off`/`VR.sun.blob`. `night.update` llama a `VR.sun.update`; `main.js` dibuja el tinte antes de la noche. Ver `claude/sol-sombras-estado.md`.

`VR.sun.cast(ctx, img, x, y, w, h, a, maxLen)` proyecta la silueta de un sprite (WeakMap con la versión negra de cada cuadro) con `ctx.transform` como corte hacia `sun.off(h)`; lo usan `player.js`, `peds.js`, `emerg.js` y `perros.js`. Los árboles en `renderShade` dibujan tronco (línea) y copa con 6–8 lóbulos con semilla por posición. Espalda del avatar 2: cuello de la prenda, costura, omóplatos y dobladillo en `avatar2.js` (`back`); el brazo y el arma en la mano se dibujan en `Weapons.drawHeld`.

## Clima (13/11/2026)

`src/game/clima.js` (`VR.clima`): lee el clima de Open-Meteo (`init`, `fetch`, caché de 30 min en `climaCache`), lo convierte en factores `f = { calor, frio, nube, lluvia }` (0..1) o usa un preset (`setMode`), y dibuja el tinte (`drawGrade`) y la lluvia (`drawRain`) en `main.js` antes de la noche. `sol.js` usa `f.nube` para aflojar las sombras y la salida/puesta reales (`VR.clima.rise/set`); `night.js` también. Configuración: sección Clima (`segClima`, clave `clima`). `?clima=` fuerza uno. Ver `claude/clima-estado.md`.
