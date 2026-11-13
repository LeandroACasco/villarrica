"""Arma la galería de vehículos (una sola página HTML con el código REAL del juego dentro).

  python3 tools/galeria_vehiculos.py [salida.html]

Muestra los 26 vehículos del juego (autos, camionetas, camiones, colectivos, emergencia y motos) girando de costado con la cámara
baja del taller, con colores y tuneo, para revisar que estén todos bien. Sirve como artefacto de Claude o abierta en el navegador."""
import pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
FILES = ['engine/core.js', 'engine/gfx.js', 'game/car.js', 'game/autos.js', 'game/camiones.js', 'game/oblicuo.js', 'game/tune.js']
CSS = r'''
:root{--bg:#121620;--panel:#1b2130;--panel2:#232b3d;--line:#323c54;--ink:#f3ecd8;--mute:#a8a596;--accent:#ffd75e;--ok:#7ad08a;--bad:#e8604a;color-scheme:dark}
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,sans-serif;padding:14px max(14px,env(safe-area-inset-left)) 40px}
h1{margin:0 0 4px;font-size:24px;color:var(--accent)}p.sub{margin:0 0 12px;color:var(--mute);max-width:70ch}
.tabs{display:flex;gap:6px;margin:10px 0}.tabs button,.chip,.seg button{background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:7px 11px;font:700 13px system-ui;cursor:pointer}
.tabs button.on,.chip.on,.seg button.on{background:var(--accent);color:#2a1f04;border-color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:8px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:6px;cursor:pointer;position:relative;color:var(--ink);text-align:left}
.card canvas{width:100%;height:auto;display:block;background:linear-gradient(#3a3d44,#2b2d33);border-radius:6px}
.card b{display:block;font-size:13px;margin-top:4px}.card span{color:var(--mute);font-size:11px}
.card i{position:absolute;right:8px;top:8px;font-style:normal;font-weight:700;font-size:12px}
h2{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);margin:16px 0 6px}
#det{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:14px}@media(max-width:860px){#det{grid-template-columns:1fr}}
.box{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;display:grid;gap:10px;align-content:start}
#big{width:100%;height:auto;border-radius:8px;touch-action:none;cursor:grab;background:#2b2d33}
#strip{display:grid;grid-template-columns:repeat(8,1fr);gap:4px}#strip canvas{width:100%;height:auto;background:#2b2d33;border-radius:5px}
.row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.sw{width:26px;height:26px;border-radius:6px;border:2px solid var(--line);cursor:pointer;padding:0}.sw.on{border-color:var(--accent)}
.grp{display:grid;gap:5px;padding-top:8px;border-top:1px solid var(--line)}.grp h3{margin:0;font-size:11px;color:var(--mute);letter-spacing:.1em;text-transform:uppercase}
.name b{font-size:22px}.name span{color:var(--mute)}
'''
JS = r'''
const OB=VR.OBL, VSS0=VR.VSS, rad=(d)=>d*Math.PI/180;
const ALL=[...Object.keys(VR.CAR_MODELS).map(m=>['car',m]),...Object.keys(VR.MOTO_MODELS).map(m=>['moto',m])];
const GROUPS=[['Autos',['mita','sedan','mono','coupe','rally','suvchico']],['Camionetas y SUV',['pickup','suv','suvmed']],['Camiones',['camchata','camcarpa','camfurgon','camvolcador','camtractor']],['Colectivos',['indep','guairena']],['Emergencia y otros',['patrulla','policam','ambulancia','bomba','karumbe']],['Motos y patinetas',['cub','mini','calle','carga','pati']]];
const key=(t,m)=>t+':'+m; const spec=(t,m)=>VR.vspec(t,m);
const tunable=(m)=>!!VR.TUNE_MODELS[m];
const st={sel:ALL[0],elev:30,col:0,tune:null,real:false,ang:0.9,auto:true};
// frame(type,model,pal,tune,k,elev,hq): el mismo dibujo oblicuo del juego; baja la cámara (kz = cot elev) y aplasta el piso (sen elev)
const bases=new Map();
function base(t,m,pal,tune,hq){const k=t+m+JSON.stringify(pal)+JSON.stringify(tune||0)+hq;let b=bases.get(k);if(b)return b;const sp=spec(t,m);VR.VSS=VSS0*(hq?2:1);try{b=sp.base(pal,tune||{});}finally{VR.VSS=VSS0;}bases.set(k,b);if(bases.size>40)bases.delete(bases.keys().next().value);return b;}
const fcache=new Map();
function frame(t,m,pal,tune,k,elev,hq){const key=[t,m,JSON.stringify(pal),JSON.stringify(tune||0),k,elev,hq].join('|');let c=fcache.get(key);if(c)return c;
 const sp=spec(t,m),b=base(t,m,pal,tune,hq);if(!b.prof||!OB||!OB.on)return null;const e=rad(elev),kz0=OB.kz;OB.kz=Math.cos(e)/Math.sin(e);let big,ss;
 try{const S=sp.S+2*OB.extra(b);ss=b.ss||1;const B=Math.round(S*ss);big=OB.render(b,k/64*Math.PI*2,B);}finally{OB.kz=kz0;}
 c=VR.gfx.softOutline(big,'rgba(18,16,20,.92)',ss*0.8);c.ss=ss;c.sinE=Math.sin(e);fcache.set(key,c);if(fcache.size>900)fcache.delete(fcache.keys().next().value);return c;}
function palOf(t,m,col,tune){const sp=spec(t,m);if(tune)return VR.tunePal(tune.color);return sp.colors[col%sp.colors.length];}
// dibuja el cuadro en (cx,cy) con la escala px por unidad del mundo
function draw(g,img,sp,cx,cy,pxu){const f=pxu/((VR.VK||1)*img.ss), w=img.width*f, h=img.height*f*img.sinE;g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(cx,cy+h*0.04,w*0.34,h*0.2,0,0,7);g.fill();g.drawImage(img,cx-w/2,cy-h/2-h*0.04,w,h);}
const $=(s)=>document.querySelector(s);
function floor(g,W,H){const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#4a4d54');gr.addColorStop(1,'#2f3237');g.fillStyle=gr;g.fillRect(0,0,W,H);g.strokeStyle='rgba(255,255,255,.05)';for(let i=1;i<6;i++){g.beginPath();g.moveTo(0,H*i/6);g.lineTo(W,H*i/6);g.stroke();}
 g.fillStyle='rgba(255,215,94,.35)';g.beginPath();g.ellipse(W/2,H*0.62,W*0.43,H*0.3,0,0,7);g.lineWidth=2;g.strokeStyle='rgba(255,215,94,.5)';g.setLineDash([8,6]);g.stroke();g.setLineDash([]);g.fillStyle='rgba(0,0,0,.18)';g.fill();}
// ---------------- todos
const cards=[];const maxLen=Math.max(...ALL.map(([t,m])=>Math.max(spec(t,m).len,spec(t,m).wid)));
function buildAll(){const box=$('#all');box.innerHTML='';cards.length=0;
 for(const [gn,ms] of GROUPS){const h=document.createElement('h2');h.textContent=gn;box.append(h);const gd=document.createElement('div');gd.className='grid';box.append(gd);
  for(const m of ms){const t=VR.MOTO_MODELS[m]?'moto':'car';const sp=spec(t,m),b=document.createElement('button');b.className='card';b.innerHTML='<canvas width="320" height="200"></canvas><i></i><b>'+(sp.name||m)+'</b><span>'+m+' · '+sp.len+'×'+sp.wid+' · '+Math.round(sp.max.road*0.45)+' km/h</span>';gd.append(b);
   b.onclick=()=>{st.sel=[t,m];st.col=0;st.tune=tunable(m)?VR.tuneDefault(m):null;if(st.tune)st.tune.color=VR.TUNE_MODELS[m].serie;tab('det');buildDet();};cards.push({t,m,cv:b.querySelector('canvas'),ok:b.querySelector('i'),b,errs:0,k:0});}}
}
let tickAll=0;function loopAll(now){ if(!$('#all').hidden){const dt=now-(loopAll.l||now);loopAll.l=now;st.ang+=st.auto?dt*0.0006:0;
  const t0=performance.now();
  for(const c of cards){const sp=spec(c.t,c.m),g=c.cv.getContext('2d'),W=c.cv.width,H=c.cv.height;const k=((Math.round(st.ang/(Math.PI*2)*16)%16)+16)%16*4;
   const pal=palOf(c.t,c.m,0,null);let img=null;try{ if(performance.now()-t0<14||fcache.has([c.t,c.m,JSON.stringify(pal),'0',k,30,false].join('|'))) img=frame(c.t,c.m,pal,null,k,30,false);}catch(e){c.errs++;c.ok.textContent='✗';c.ok.style.color='var(--bad)';console.error(c.m,e);}
   if(!img){if(!c.last)continue;img=c.last;}else{c.last=img;if(!c.errs){c.ok.textContent='✓';c.ok.style.color='var(--ok)';}}
   floor(g,W,H);const pxu=st.real?W*0.9/(maxLen*1.15):Math.min(W*0.78,H*1.2)/Math.max(sp.len,sp.wid);draw(g,img,sp,W/2,H*0.62,pxu);}}
 requestAnimationFrame(loopAll);}
// ---------------- detalle
function buildDet(){const [t,m]=st.sel,sp=spec(t,m);$('#nm').innerHTML='<b>'+(sp.name||m)+'</b> <span>'+m+'</span>';$('#ds').textContent=(sp.desc||'')+' Tamaño '+sp.len+'×'+sp.wid+' · '+Math.round(sp.max.road*0.45)+' km/h en asfalto.';
 const col=$('#cols');col.innerHTML='';const g1=$('#tun');g1.innerHTML='';
 if(st.tune){VR.TUNE_COLORS.forEach((c,i)=>{const b=document.createElement('button');b.className='sw'+(st.tune.color===i?' on':'');b.style.background=c[1];b.title=c[0];b.onclick=()=>{st.tune.color=i;buildDet();};col.append(b);});
  for(const p of VR.TUNE_MODELS[m].parts){if(p==='color')continue;const P=VR.TUNE_PARTS[p],gd=document.createElement('div');gd.className='grp';gd.innerHTML='<h3>'+P.name+'</h3>';const r=document.createElement('div');r.className='row';
   if(p==='color2'){VR.TUNE_COLORS.forEach((c,i)=>{const b=document.createElement('button');b.className='sw'+(st.tune.color2===i?' on':'');b.style.background=c[1];b.onclick=()=>{st.tune.color2=i;buildDet();};r.append(b);});}
   else for(const [k,o] of Object.entries(P.opts)){const b=document.createElement('button');b.className='chip'+(String(st.tune[p])===k?' on':'');b.textContent=o[0];b.onclick=()=>{st.tune[p]=(p==='polarizado'||p==='bajo')?+k:k;buildDet();};r.append(b);}
   gd.append(r);g1.append(gd);}}
 else{spec(t,m).colors.forEach((c,i)=>{const b=document.createElement('button');b.className='sw'+(st.col===i?' on':'');b.style.background=c[0];b.onclick=()=>{st.col=i;buildDet();};col.append(b);});g1.innerHTML='<p class="sub">Este vehículo no se tunea en el taller (solo cambia de color).</p>';}
 for(const b of document.querySelectorAll('#cam button'))b.classList.toggle('on',+b.dataset.e===st.elev);}
function loopDet(now){ if(!$('#det').hidden){const dt=now-(loopDet.l||now);loopDet.l=now;if(st.auto)st.ang+=dt*0.0007;const [t,m]=st.sel,sp=spec(t,m),pal=palOf(t,m,st.col,st.tune),tune=st.tune,k=((Math.round(st.ang/(Math.PI*2)*64)%64)+64)%64;
  const cv=$('#big'),g=cv.getContext('2d'),W=cv.width,H=cv.height;floor(g,W,H);const img=frame(t,m,pal,tune,k,st.elev,true);if(img)draw(g,img,sp,W/2,H*0.6,Math.min(W*0.8,H*1.5)/Math.max(sp.len,sp.wid));
  const sc=$('#strip').children;for(let i=0;i<8;i++){const c=sc[i].getContext('2d'),w=sc[i].width,h=sc[i].height;floor(c,w,h);const im=frame(t,m,pal,tune,i*8,st.elev,false);if(im)draw(c,im,sp,w/2,h*0.6,Math.min(w*0.85,h*1.5)/Math.max(sp.len,sp.wid));}}
 requestAnimationFrame(loopDet);}
function tab(n){for(const b of document.querySelectorAll('.tabs button'))b.classList.toggle('on',b.dataset.t===n);$('#all').hidden=n!=='all';$('#det').hidden=n!=='det';}
document.addEventListener('DOMContentLoaded',()=>{
 for(let i=0;i<8;i++){const c=document.createElement('canvas');c.width=200;c.height=120;$('#strip').append(c);}
 for(const b of document.querySelectorAll('.tabs button'))b.onclick=()=>tab(b.dataset.t);
 for(const b of document.querySelectorAll('#cam button'))b.onclick=()=>{st.elev=+b.dataset.e;buildDet();};
 $('#real').onclick=()=>{st.real=!st.real;$('#real').classList.toggle('on',st.real);};$('#auto').onclick=()=>{st.auto=!st.auto;$('#auto').classList.toggle('on',st.auto);};
 const cv=$('#big');let dr=null;cv.onpointerdown=(e)=>{dr={x:e.clientX,a:st.ang};st.auto=false;$('#auto').classList.remove('on');cv.setPointerCapture(e.pointerId);};cv.onpointermove=(e)=>{if(dr)st.ang=dr.a+(e.clientX-dr.x)*0.012;};cv.onpointerup=cv.onpointercancel=()=>{dr=null;};
 st.tune=VR.tuneDefault('mita');st.tune.color=VR.TUNE_MODELS.mita.serie;buildAll();buildDet();tab('all');requestAnimationFrame(loopAll);requestAnimationFrame(loopDet);});
'''
HTML = '''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Galería de vehículos de Villarrica</title><style>%s</style></head><body>
<h1>Galería de vehículos</h1><p class="sub">Los 26 vehículos del juego, dibujados por el mismo código del juego (vista oblicua con cámara baja del taller). Tocá uno para verlo grande, girarlo, cambiarle el color y el tuneo. ✓ = se dibuja sin errores.</p>
<div class="tabs"><button data-t="all" class="on">Todos</button><button data-t="det">Detalle</button><span style="flex:1"></span><button id="real" class="chip" title="Todos a la misma escala">Escala real</button><button id="auto" class="chip on">Girar solo</button></div>
<div id="all"></div>
<div id="det" hidden><div class="box"><canvas id="big" width="900" height="520"></canvas><div id="strip"></div></div>
<div class="box"><div class="name" id="nm"></div><p class="sub" id="ds" style="margin:0"></p><div class="grp"><h3>Cámara</h3><div class="row seg" id="cam"><button data-e="30" class="on">Taller 30°</button><button data-e="45">45°</button><button data-e="65">Juego 65°</button><button data-e="85">Desde arriba</button></div></div><div class="grp"><h3>Color</h3><div class="row" id="cols"></div></div><div id="tun"></div></div></div>
<script>%s</script><script>%s</script></body></html>'''
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'docs' / 'galeria.html'
js = '\n'.join((root / 'src' / f).read_text() for f in FILES)
out.write_text(HTML % (CSS, js, JS))
print(out, out.stat().st_size, 'bytes')
