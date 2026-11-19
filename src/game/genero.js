// Género del protagonista (19/11/2026): VR.gen() devuelve 'm' o 'f' según el look que lleva puesto (main.js lo reemplaza por el real).
// VR.gt(texto) resuelve las marcas {masculino|femenino} de los textos: «¡Ey, {hermano|hermana}!» → «¡Ey, hermana!» si sos chica.
(function (VR) {
  VR.gen = VR.gen || (() => 'm');
  VR.gt = (s) => (typeof s === 'string' && s.indexOf('{') >= 0 ? s.replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (m, a, b) => (VR.gen() === 'f' ? b : a)) : s);
})(typeof VR !== 'undefined' ? VR : (window.VR = window.VR || {}));
