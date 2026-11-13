# Vehículos de Villarrica: fichas y referencias (13/11/2026)

*Documento propio de vehículos. Reúne qué vehículos hay, con qué se comparan en la vida real (para que se parezcan) y sus números. Los datos de juego salen de `src/game/autos.js`, `car.js`, `camiones.js` y `oblicuo.js` (13/11/2026).*

## 1. Reglas

- **Diseño propio, sin marcas ni logos.** La columna "Referencia real" es **solo para medir proporciones** (largo, ancho, alto, forma). El juego usa nombres inventados y pintura propia; nunca se copian marcas, logos ni letras.
- **Las referencias de categoría las propuso Claude a partir de lo que anda por Paraguay; están marcadas "a confirmar".** Leandro manda: si el auto real que quiere ver es otro, se cambia la ficha.
- Fotos de Leandro usadas hasta ahora: motos (04/11), colectivos (10/11), camiones (10/11), **karumbes (13/11: 4 fotos)**.

## 2. Escala y proporciones

- **1 m ≈ 7,9 unidades del juego** (el compacto mide 30 u ≈ 3,8 m). Velocidades: `u/s ÷ 7,9 × 3,6 = km/h`.
- **Largo / ancho:** los coches del juego son algo más anchos que los reales (relación largo/ancho 1,75–2,3 contra 2,2–2,9: Hilux 2,9, Jimny 2,1, Vitz 2,2). El 13/11 se probó angostarlos (`sx` en `VR.vbase`, queda disponible) y Leandro prefirió **el estilo ancho de siempre**, que se parece más a los autitos de Gangstar. Se dejaron como estaban.
- **Altura (vista oblicua):** `hz: [capó, techo]` por modelo en `VR.drawAuto` (unidades de altura) y `VR.OBL.kz = 0,46` (píxeles en pantalla por unidad de altura; con `?kz=` en la dirección se prueba otro valor).
- **Pendiente de proporción:** colectivos (largo/ancho 3,5 contra ~4,7 real), camiones livianos (2,5 contra ~3) y el camión de bomberos (2,8 contra ~3,4) siguen algo anchos o cortos. Se pueden afinar igual que los autos.

## 3. Autos

| Modelo (`VR.CAR_MODELS`) | Nombre en el juego | Referencia real (a confirmar) | Largo × ancho (u) | Tope asfalto / tierra (km/h) | Masa | Giro |
|---|---|---|---|---|---|---|
| `mita` | Mitã 1.3 | Compacto 5 puertas (tipo Vitz, verificado: 3,61–3,75 × 1,66–1,70 × 1,49–1,52 m) | 30 × 16 | 109 / 77 | 1 | 2,7 |
| `sedan` | Porã 1.5 | Sedán mediano de remís (tipo Corolla / Premio): 4,5 × 1,75 × 1,45 | 35 × 16 | 112 / 73 | 1 | 2,5 |
| `mono` | Ka'i 1.3 | Monovolumen chico de techo alto (tipo Ractis / Fit): 3,9 × 1,70 × 1,55 | 31 × 16 | 103 / 75 | 1 | 2,8 |
| `pickup` | Yvyty Cabina Doble | Camioneta doble cabina (tipo Hilux, verificado: 5,33 × 1,86 × 1,82 m) | 41 × 18 | 105 / 93 | 1,5 | 2,2 |
| `suv` | Jaguarete 3.2 | Todoterreno grande, auxilio atrás (tipo Prado / Montero): 4,8 × 1,88 × 1,85 | 37 × 18 | 107 / 93 | 1,4 | 2,4 |
| `suvmed` | Mborevi 2.7 | Todoterreno mediano de 5 puertas (tipo Fortuner): 4,8 × 1,85 × 1,85 | 35 × 17 | 105 / 91 | 1,3 | 2,5 |
| `suvchico` | Jaguarete Mirĩ | Todoterreno chico de 3 puertas (tipo Jimny, verificado: 3,48–3,65 × 1,65 × 1,72 m) | 28 × 16 | 98 / 89 | 1,1 | 2,9 |
| `rally` | Mbarakaja Turbo | Sedán de rally japonés (tipo Impreza WRX / Lancer Evo): 4,5 × 1,78 × 1,45 | 35 × 17 | 125 / 107 | 1,05 | 2,8 |
| `coupe` | Panambi GT | Coupé japonés de los 90 (tipo Silvia / Celica / RX-7): 4,3 × 1,72 × 1,30 | 34 × 17 | 123 / 77 | 0,95 | 3,0 |

Características de dibujo: el `mita` va con `VR.drawCarBase` (`VR.OBL.MITA`) y el resto con `VR.drawAuto`. Techo, parabrisas y luneta tienen su largo propio (`hood`, `ws`, `roof`, `rg`); los todoterrenos llevan auxilio atrás, barras o pasarruedas; la camioneta tiene caja con barra; el rally tiene toma de aire y alerón; el coupé, cuatro faros redondos.

## 4. Emergencias

| Modelo | Nombre | Referencia real (a confirmar) | Largo × ancho (u) | Tope asfalto (km/h) | Masa |
|---|---|---|---|---|---|
| `patrulla` | Patrullera | Sedán de la Policía con barra de luces | 35 × 16 | 116 | 1 |
| `policam` | Camioneta de la Policía | Doble cabina de la Policía (tipo Hilux) | 41 × 18 | 109 | 1,6 |
| `ambulancia` | Ambulancia | Furgón de bomberos voluntarios (tipo Hiace): 5,3 × 1,9 × 2,2 | 39 × 17 | 107 | 1,4 |
| `bomba` | Camión de bomberos | Camión bomba con escalera y devanadera | 58 × 21 | 91 | 3,2 |

## 5. Colectivos y camiones (fotos de Leandro, 10/11/2026)

| Modelo | Nombre | Referencia | Largo × ancho (u) | Tope asfalto (km/h) | Masa |
|---|---|---|---|---|---|
| `indep` | Colectivo Tape Rupi | Colectivo urbano de la empresa Independencia (línea 210): blanco con franjas verde, roja y amarilla | 66 × 19 | 84 | 3,6 |
| `guairena` | Micro Tape Guasu | Micro de larga distancia de Guaireña: blanco con trompa roja y franjas | 76 × 20 | 98 | 4,2 |
| `camchata` · `camcarpa` · `camfurgon` | Kamyõ Mirĩ Chata · Carpa · Furgón | Camión liviano de cabina adelantada | 48 × 19 | 80 | 2,4–2,5 |
| `camvolcador` | Kamyõ Volcador | Volcador de tres ejes, amarillo o rojo | 72 × 21 | 84 | 4 |
| `camtractor` | Kamyõ Guasu Granelero | Tractor con semirremolque granelero de lona (rojo, azul o blanco) | 100 × 21 | 93 | 5,4 |

## 6. Motos y patineta (fotos de Leandro, 04/11/2026)

| Modelo (`VR.MOTO_MODELS`) | Nombre | Referencia | Largo × ancho (u) | Tope asfalto (km/h) | Giro |
|---|---|---|---|---|---|
| `cub` | Mbojoaju 125 | Underbone de 125 cc como la de Leandro: escudo ancho, piso bajo, asiento largo | 19 × 8 | 114 | 3,5 |
| `mini` | Tatu 110 | Mini moto de ruedas gordas | 16 × 9 | 91 | 4,1 |
| `calle` | Yvytu GT 150 | Moto de calle de 150: tanque con franja, visera, parrilla | 21 × 8 | 132 | 3,2 |
| `carga` | Kárga Guasu 200 | Motocarga de tres ruedas con caja | 32 × 16 | 84 | 2,3 |
| `pati` | Pati-e | Patineta eléctrica | 12 × 6 | 52 | 4,4 |

## 7. Karumbe (rehecho el 13/11/2026 con 4 fotos reales)

**Qué tiene el de verdad (de las fotos):**

- **Cabina chica atrás** con la caja de madera **pintada** (celeste o azul en las fotos, también naranja o rojo con tablas) y la **pared de arriba blanca** con **ventanas grandes sin vidrio** (a veces con marco), un banco de pasajeros adentro y número en la pared.
- **Techo blanco, curvo**, con borde de color y **vuelo hacia adelante** que cubre el pescante.
- **Pescante adelante**: el carrero va sentado en un asiento chico en la parte delantera, con las piernas hacia el caballo y las riendas en la mano.
- **Un solo eje con dos ruedas chicas de goma**, atrás (neumáticos de auto), y la caja muy baja.
- **Varas** a los costados del caballo y arnés con tiras blancas; caballo marrón de tamaño normal.

**Cómo está en el juego:** `len 42 × wid 13`; tope 26 km/h, sin faros, no se daña ni se quema (no tiene motor). Desde arriba (`VR.drawKarumbe`) se ven el caballo, las varas, el techo blanco con vuelo y las dos ruedas; en la vista oblicua (`VR.OBL.karumbe`) se ve el costado con caballo, carrero, ventanas y la rueda; y las tarjetas (`karumbeHD`, `drawSideAuto`) tienen el costado completo. Colores: celeste (el de las fotos), naranja, rojo, azul, verde y amarillo.

**Falta, si lo querés más fiel:** el techo curvo con cortina enrollada, el banco trasero y la puerta de atrás, el número grande en la pared blanca, y los cuatro tipos de caballo (marrón, alazán, negro, tordillo).

## 8. Cómo se retoca un vehículo

1. **Proporción desde arriba:** `len`, `wid` (choques) y, en `VR.drawAuto`, `W` y `sx` (cuánto se angosta el dibujo).
2. **Altura:** `hz: [capó, techo]` de cada auto, y `VR.OBL.kz` para todos a la vez.
3. **Costado del juego:** perfiles en `src/game/oblicuo.js` (`O.car`, `O.bus`, `O.truck`, `O.bomba`, `O.karumbe`, `O.moto`).
4. **Tarjeta de costado:** `drawSideAuto` (`autos.js`) y `sidehd.js` (alta resolución).
5. Compilar con `python3 build.py` y probar en PC y en el teléfono (`?plano` en la dirección muestra la vista plana vieja).

## 9. Preguntas abiertas

- ¿Los modelos "a confirmar" de las secciones 3 y 4 son los que querés ver en Villarrica? Mandame fotos de los que más circulan y ajusto cada ficha.
- ¿Querés que los colectivos, camiones y el camión de bomberos también ganen proporción real (más largos o angostos)?
- ¿Hay otros vehículos típicos que falten (hay motos con acoplado, camionetas de reparto, remises con cartel, tractores)?
