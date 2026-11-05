// Tablero de manejo manual en el teléfono (05/11/2026, pedido de Leandro): volante para arrastrar, pedales de
// acelerador y freno, minipanel con velocímetro, cuentavueltas (rpm, luz de cambio) y marcha, y caja AUTO/MAN.
// El auto lee VR.td = { on, steer, gas, brake } en car.update; la caja automática es VR.autoBox.
'use strict';
VR.td = { on: false, steer: 0, gas: 0, brake: 0 };
VR.DrivePanel = class {
  constructor() {
    const el = (h) => { const d = document.createElement('div'); d.innerHTML = h; const e = d.firstChild; document.body.append(e); return e; };
    this.wheel = el('<div id="tdWheel"><svg viewBox="-50 -50 100 100"><circle r="44" fill="none" stroke="#1c1c22" stroke-width="12"/><circle r="44" fill="none" stroke="#3a3a44" stroke-width="7"/><path d="M-40 4 L-12 10 L12 10 L40 4" stroke="#2a2a32" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M0 12 L0 40" stroke="#2a2a32" stroke-width="9" stroke-linecap="round"/><circle r="13" fill="#2a2a32"/><circle r="6" fill="#ffd84a"/><rect x="-3" y="-48" width="6" height="9" fill="#ffd84a"/></svg></div>');
    this.gas = el('<button id="tdGas">ACELERAR</button>'); this.brk = el('<button id="tdBrk">FRENAR</button>');
    this.dash = el('<div id="tdDash"><canvas width="360" height="140"></canvas><button id="tdBox">MAN</button></div>');
    this.cv = this.dash.querySelector('canvas'); this.box = this.dash.querySelector('#tdBox');
    this.box.onclick = (e) => { e.stopPropagation(); VR.autoBox = !VR.autoBox; VR.store.set('autoBox', VR.autoBox); this.paintBox(); };
    VR.autoBox = VR.store.get('autoBox', false); this.paintBox();
    // volante: arrastrar a los costados
    let id = null, x0 = 0;
    this.wheel.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); id = e.pointerId; x0 = e.clientX; this.wheel.setPointerCapture(id); });
    this.wheel.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; VR.td.steer = VR.clamp((e.clientX - x0) / 70, -1, 1); });
    const up = (e) => { if (e.pointerId === id) { id = null; VR.td.steer = 0; } };
    this.wheel.addEventListener('pointerup', up); this.wheel.addEventListener('pointercancel', up);
    for (const [b, k] of [[this.gas, 'gas'], [this.brk, 'brake']]) {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); VR.td[k] = 1; b.classList.add('on'); });
      const off = () => { VR.td[k] = 0; b.classList.remove('on'); };
      b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    }
  }
  paintBox() { this.box.textContent = VR.autoBox ? 'AUTO' : 'MAN'; this.box.classList.toggle('on', !!VR.autoBox); }
  update(car, touch) {
    const manual = !!(car && VR.drive === 'manual'), show = manual && touch;
    VR.td.on = show; this.wheel.hidden = this.gas.hidden = this.brk.hidden = !show; this.dash.hidden = !manual;
    if (!show) { VR.td.steer = VR.td.gas = VR.td.brake = 0; }
    this.wheel.style.transform = 'rotate(' + VR.td.steer * 120 + 'deg)';
    if (!manual) return;
    // minipanel: km/h, rpm (luz roja para cambiar) y marcha
    const g = this.cv.getContext('2d'), W = 360, H = 140, rpm = car.rpm || 900, kmh = car.kmh();
    g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(14,14,18,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 18); g.fill();
    const cx = 92, cy = 92, R = 62, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
    g.lineWidth = 10; g.strokeStyle = '#2a2a32'; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
    g.strokeStyle = '#c8322a'; g.beginPath(); g.arc(cx, cy, R, a0 + (a1 - a0) * 6 / 7, a1); g.stroke();
    const k = Math.min(1, rpm / 7000), an = a0 + (a1 - a0) * k;
    g.strokeStyle = rpm > 6000 ? '#ff4a3a' : '#ffd84a'; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, R, a0, an); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(an) * (R - 4), cy + Math.sin(an) * (R - 4)); g.stroke();
    g.fillStyle = '#aaa'; g.font = '600 15px system-ui'; g.textAlign = 'center'; g.fillText('rpm ×1000', cx, cy + 34);
    for (let i = 0; i <= 7; i++) { const t = a0 + (a1 - a0) * i / 7; g.fillText(i, cx + Math.cos(t) * (R - 20), cy + Math.sin(t) * (R - 20) + 5); }
    if (rpm > 6000 && (performance.now() / 120 | 0) % 2) { g.fillStyle = '#ff4a3a'; g.beginPath(); g.arc(cx, 22, 7, 0, 7); g.fill(); } // luz de cambio
    g.fillStyle = '#fff'; g.font = '800 48px system-ui'; g.textAlign = 'right'; g.fillText(kmh, 290, 76); g.font = '600 16px system-ui'; g.fillStyle = '#aaa'; g.fillText('km/h', 290, 98);
    g.fillStyle = '#ffd84a'; g.font = '800 40px system-ui'; g.textAlign = 'center'; g.fillText(car.gear < 0 ? 'R' : car.gear || 'N', 326, 74);
  }
};
