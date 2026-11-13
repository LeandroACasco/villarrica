# Arsenal de Villarrica: armas básicas (13/11/2026)

*Ilustración detallada y comparación con el juego: `ARSENAL.png` (misma carpeta). Código: `src/game/weapons.js` (`VR.WEAPONS`, `Weapons.drawHeld`), cuadros `+aim` en `src/game/avatar2.js`.*

Las armas están apagadas por defecto: se activan en Menú → Desarrollador. Con arma en mano el personaje usa su pose de apuntar (brazo cercano estirado) y el arma sale de la mano de ese sprite.

## 1. Pistola

| Dato | Valor |
|---|---|
| Modelo de referencia | Taurus PT 917 / G2C, 9 mm (marca brasileña, la más común en Paraguay) |
| Tipo | Semiautomática, un tiro por apretada |
| Largo real / en el juego | ~19 cm → ~4,5 px de largo (el personaje mide 31 px, o sea ~170 cm) |
| Cadencia | 0,28 s entre tiros |
| Velocidad de la bala | 560 px/s |
| Alcance | 280 px |
| Daño a vehículos | 14 por bala |
| Estrellas de búsqueda | 1 |
| Efectos | Fogonazo con luz de noche; la gente cercana huye y dice "¡Oñembokapu!", "¡Jadipara!", etc. |
| Dibujo en el juego | corredera clara con brillo (para que se note), mira, armazón, empuñadura y guardamonte, con contorno oscuro |

## 2. Lanzallamas de mano

| Dato | Valor |
|---|---|
| Modelo de referencia | Ninguno real: arma ficticia al estilo Gangstar (tanque rojo "FUEGO" con manguera y boquilla con piloto) |
| Tipo | Llama continua mientras se mantiene el disparo |
| Largo en el juego | ~8,5 px (~70 cm) más el tanque |
| Alcance | 78 px, cono de 0,42 rad |
| Daño a vehículos | 55 (prende fuego) |
| Estrellas de búsqueda | 1 |
| Efectos | Marca de quemado en el piso, humo, sonido de llama; la gente grita "¡Tata!", "¡Fuego, fuego!" y huye; el caballo del karumbe se asusta pero no se prende |

## Cómo se sostienen

- De costado el brazo cercano va estirado hacia adelante y el arma sale de la mano.
- De frente (abajo) y de espaldas (arriba) se levanta el brazo derecho; el arma se ve más corta por la vista 3/4.
- El arma se dibuja encima del personaje en las cuatro direcciones.

## Pendiente

- Más armas (escopeta, bate, etc.) no están definidas todavía; si se agregan, cada una necesita ficha, modelo de referencia y su ilustración.
- Probar en el teléfono.
