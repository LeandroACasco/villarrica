// Nivel socioeconómico del INE aplicado al juego (13/11/2026). Un nivel por baldosa (world.nivelAt: 0 sin dato, 1 Bajo … 5 Alto).
// - autos y motos: los modelos que salen (tránsito y estacionados) cambian según el nivel de la zona;
// - peatones: ropa y accesorios (VR.av2Nivel); peds.js arma tres grupos de caras (típico, humilde, acomodado);
// - casas: techos, colores y pisos se reparten en tools/osm_to_map.py; la suciedad de la calle en world/suciedad.js.
// Va DESPUÉS de camiones.js en build.py (envuelve el VR.pickCar que ya tiene los camiones).
(() => {
  const lerp = (lo, hi, n) => lo + (hi - lo) * (n - 1) / 4;
  const lvl = (n) => (n >= 1 && n <= 5 ? n : 2); // sin dato = afueras: se tratan como nivel humilde

  // peso de aceptación (0–1) de cada modelo en nivel 1 (bajo) y 5 (alto); en el medio se interpola. Lo que no figura pesa 1.
  const CAR_LO = { mita: 1, sedan: 0.75, mono: 1, pickup: 0.7, suv: 0.3, suvmed: 0.4, suvchico: 1, rally: 0.2, coupe: 0.15, karumbe: 1 };
  const CAR_HI = { mita: 0.7, sedan: 1, mono: 0.85, pickup: 1, suv: 1, suvmed: 1, suvchico: 0.9, rally: 1, coupe: 1, karumbe: 0.3 };
  const MOTO_LO = { cub: 1, calle: 0.5, mini: 1, carga: 1, pati: 0.2 };
  const MOTO_HI = { cub: 0.8, calle: 1, mini: 0.6, carga: 0.6, pati: 1 };
  const pick = (draw, lo, hi, rnd, n) => {
    if (!n) n = 0; // 0 = sin dato en el llamador: no se filtra nada
    let m = draw();
    if (!n) return m;
    n = lvl(n);
    for (let i = 0; i < 8; i++) {
      const a = lo[m] === undefined ? 1 : lerp(lo[m], hi[m], n);
      if (rnd() < a) return m;
      m = draw();
    }
    return m;
  };

  const pickCar0 = VR.pickCar;
  VR.pickCar = (rnd, parked, roadW = 0, nivel = -1) => nivel < 0 ? pickCar0(rnd, parked, roadW) : pick(() => pickCar0(rnd, parked, roadW), CAR_LO, CAR_HI, rnd, nivel || 2);
  const pickMoto0 = VR.pickMoto;
  VR.pickMoto = (rnd, parked, nivel = -1) => nivel < 0 ? pickMoto0(rnd, parked) : pick(() => pickMoto0(rnd, parked), MOTO_LO, MOTO_HI, rnd, nivel || 2);
  // probabilidad de que un auto del tránsito venga tuneado (antes 10 % en todos lados)
  VR.tuneChance = (nivel) => (nivel >= 1 ? [0.04, 0.06, 0.09, 0.12, 0.16][nivel - 1] : 0.06);

  // ---------- personas ----------
  // Cambia el look L (de VR.av2Random) según el nivel (1 humilde … 5 acomodado). Las reglas por género son las de av2Random.
  const CAT = () => VR.AV2_CAT;
  VR.av2Nivel = (L, n, rnd = Math.random) => {
    const one = (a) => a[(rnd() * a.length) | 0], rich = n >= 4;
    if (rich) {
      L.top = one(['camisa', 'polo', 'camisaCorta', 'remera', 'sueter', 'polo', 'camisa', 'hoodieAbierto']);
      L.bottom = one(L.gender === 'f' ? ['jean', 'vestir', 'vestir', 'cargo', 'pollera', 'jean'] : ['jean', 'vestir', 'vestir', 'cargo', 'jean']);
      L.shoes = one(['zapatillas', 'zapatos', 'zapatos', 'botitas', 'zapatillas']);
      L.hat = rnd() < 0.14 ? one(['gorra', 'piri', 'gorro']) : 'ninguno';
      L.lentes = rnd() < 0.3; L.anteojos = !L.lentes && rnd() < 0.2; L.reloj = rnd() < 0.45; L.cadenita = rnd() < 0.25; L.mochila = rnd() < 0.12; L.termo = rnd() < 0.14;
    } else {
      L.top = one(['remera', 'remera', 'musculosa', 'camiseta', 'buzo', 'sueter', 'camisaCorta', 'remera']);
      L.bottom = one(L.gender === 'f' ? ['jean', 'jogging', 'short', 'calza', 'pollera', 'bermuda'] : ['jean', 'jogging', 'bermuda', 'short', 'jogging', 'cargoShort']);
      L.shoes = one(['chinelas', 'chinelas', 'zapatillas', 'botines', 'zapatillas']);
      L.hat = rnd() < 0.55 ? one(['gorra', 'gorraAtras', 'piri', 'gorra']) : 'ninguno';
      L.lentes = rnd() < 0.05; L.anteojos = false; L.reloj = false; L.cadenita = rnd() < 0.05; L.mochila = rnd() < 0.14; L.termo = rnd() < 0.32;
    }
    if (L.gender !== 'f') { if (L.top === 'top') L.top = 'remera'; if (L.bottom === 'pollera' || L.bottom === 'calza') L.bottom = 'jean'; }
    return L;
  };
  // grupo de caras para un lugar: 'mid' (los de siempre), 'low' o 'high'
  VR.pedPool = (n, r) => {
    if (!(n >= 1)) return r < 0.4 ? 'low' : 'mid';
    return [r < 0.8 ? 'low' : 'mid', r < 0.6 ? 'low' : 'mid', 'mid', r < 0.1 ? 'low' : r < 0.3 ? 'high' : 'mid', r < 0.6 ? 'high' : 'mid'][n - 1];
  };
})();
