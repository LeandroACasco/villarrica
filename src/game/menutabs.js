// Menú de Configuración en pestañas: agrupa las secciones (cada <h3> y lo que le sigue) sin mover ni renombrar ningún control.
VR.menuTabs = () => {
  const dlg = document.querySelector('#menu .dlg'); if (!dlg || dlg.dataset.tabs) return; dlg.dataset.tabs = '1';
  const TABS = [['juego', '🎮', 'Juego'], ['partida', '💾', 'Partida'], ['pers', '🧍', 'Personaje'], ['ctrl', '🎛', 'Controles'], ['avz', '🛠', 'Avanzado']];
  const DE = { 'Manejo': 'juego', 'Hora del día': 'juego', 'Clima': 'juego', 'Calidad de dibujo': 'juego', 'Opciones': 'juego', 'Modo Historia': 'partida', 'Pasar la Historia a otro dispositivo': 'partida',
    '☁ Partida en la nube (cuenta de Google)': 'partida', 'Personaje': 'pers', 'Online (jugar con amigos)': 'pers', 'Controles táctiles': 'ctrl', 'Teclado (PC)': 'ctrl', 'Control de consola': 'ctrl', 'Fondo del menú principal': 'avz', 'Desarrollador': 'avz' };
  const kids = Array.from(dlg.children), h2 = kids.find((e) => e.tagName === 'H2'), pie = kids.slice(-2); // el crédito y el botón Cerrar quedan abajo, fuera de las pestañas
  const cuerpo = kids.slice(kids.indexOf(h2) + 1, kids.length - 2), pan = {}; let cur = null;
  const bar = document.createElement('div'); bar.className = 'mtBar';
  for (const [k, i, n] of TABS) { const p = document.createElement('div'); p.className = 'mtPan'; p.dataset.t = k; pan[k] = p; const b = document.createElement('button'); b.dataset.t = k; b.innerHTML = '<i>' + i + '</i><span>' + n + '</span>'; bar.append(b); }
  for (const e of cuerpo) { if (e.tagName === 'H3') cur = pan[DE[e.textContent.trim()] || 'avz']; (cur || pan.juego).append(e); }
  const cont = document.createElement('div'); cont.className = 'mtCont'; for (const k in pan) cont.append(pan[k]);
  h2.after(bar, cont); dlg.append(...pie);
  const ir = (k) => { for (const b of bar.children) b.classList.toggle('on', b.dataset.t === k); for (const k2 in pan) pan[k2].hidden = k2 !== k; try { sessionStorage.setItem('villarrica:mt', k); } catch (e) { /* sin storage */ } };
  bar.onclick = (e) => { const b = e.target.closest('button'); if (b) ir(b.dataset.t); };
  let ini = 'juego'; try { ini = sessionStorage.getItem('villarrica:mt') || 'juego'; } catch (e) { /* sin storage */ } ir(pan[ini] ? ini : 'juego');
  // personajes para elegir: cada botón de #segPj muestra al personaje (se redibuja al abrir la pestaña, por si cambió tu ropa)
  const cartas = () => { const s = document.getElementById('segPj'); if (!s || !VR.av2Render || !VR.av2LookOf) return;
    for (const b of s.querySelectorAll('button')) { let c = b.querySelector('canvas'); if (!c) { c = document.createElement('canvas'); c.width = 66; c.height = 100; b.prepend(c); }
      try { const im = VR.av2Render(Object.assign({}, VR.AV2_DEFAULT, VR.av2LookOf(b.dataset.v)), 'down', 'idle', 0, 3), g = c.getContext('2d'), k = Math.min(c.width / im.width, c.height / im.height);
        g.clearRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; g.drawImage(im, (c.width - im.width * k) / 2, c.height - im.height * k, im.width * k, im.height * k); } catch (e) { /* sin vista previa */ } } };
  bar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && b.dataset.t === 'pers') cartas(); });
  VR.menuCartas = cartas;
  VR.menuTab = ir;
};
