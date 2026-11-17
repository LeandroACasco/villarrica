"""Arma la galería de personas (una sola página HTML con el código REAL del juego dentro).

  python3 tools/galeria_personas.py [salida.html]

Muestra los personajes base (equipo, historia, oficios) y los que genera el juego (VR.av2Random + VR.av2Nivel por nivel
socioeconómico), de frente, de espaldas y de perfil, caminando, a tamaño de juego o ampliados. Sirve como artefacto o abierta en el navegador."""
import pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
src = lambda f: (root / 'src' / f).read_text()

def block(text, start, open_='{', close_='}'):  # texto del objeto que empieza en `start` (cuenta llaves)
    i = text.index(start); j = text.index(open_, i); d = 0
    for k in range(j, len(text)):
        d += text[k] == open_; d -= text[k] == close_
        if d == 0: return text[j:k + 1]

mis = block(src('game/misiones.js'), 'VR.PERSONAJES = {')
chicho = re.search(r'const CHICHO = (\{.*?\});', src('game/taller.js')).group(1)
nivel = src('game/nivel.js')
av = block(nivel, 'VR.av2Nivel = (L, n, rnd = Math.random) =>', '{', '}')
nivel_fn = 'VR.av2Nivel = (L, n, rnd = Math.random) => ' + av + ';'
CSS = r'''
:root{--bg:#121620;--panel:#1b2130;--panel2:#232b3d;--line:#323c54;--ink:#f3ecd8;--mute:#a8a596;--accent:#ffd75e;color-scheme:dark}
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,sans-serif;padding:14px 14px 40px}
h1{margin:0 0 4px;font-size:24px;color:var(--accent)}p.sub{margin:0 0 12px;color:var(--mute);max-width:70ch}
.tabs,.row{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;align-items:center}
button,.chip{background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:7px 11px;font:700 13px system-ui;cursor:pointer}
button.on{background:var(--accent);color:#2a1f04;border-color:var(--accent)}
h2{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);margin:16px 0 6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:6px;text-align:left;color:var(--ink);font-weight:400}
.card canvas{width:100%;height:auto;display:block;background:linear-gradient(#5a5d64,#44474d);border-radius:6px;image-rendering:pixelated}
.card b{display:block;font-size:13px;margin-top:4px}.card span{color:var(--mute);font-size:11px}
#det{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;margin-top:10px}
#det .views{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}#det canvas{width:100%;height:auto;background:linear-gradient(#5a5d64,#44474d);border-radius:8px;image-rendering:pixelated}
pre{white-space:pre-wrap;word-break:break-word;color:var(--mute);font-size:11px;margin:8px 0 0}
'''
JS = r'''
const $=(s)=>document.querySelector(s);
const EMB=window.parent!==window;
const st={tab:'base',gen:'all',niv:3,n:48,seed:1,k:EMB?3:4,sel:null,anim:'idle',dir:'down',f:0};
const RND=(L,d,a,i,k)=>VR.av2Sprite?VR.av2Sprite(L,d,a,i/(a==='idle'?4:8),k):VR.av2Render(L,d,a,i/8,k);
const rng=(seed)=>{let s=seed>>>0||1;return()=>{s=(s*16807)%2147483647;return s/2147483647};};
const BASE=[];
BASE.push(['Equipo (Kiut Studio)',Object.entries(VR.AV2_TEAM).map(([k,v])=>[v[0],v[1],'protagonista elegible'])]);
const PJ=Object.entries(VR.PERSONAJES).filter(([k,v])=>v.look).map(([k,v])=>[v.nombre,v.look,'Historia']);
BASE.push(['Personajes de la Historia',PJ]);
BASE.push(['Oficios',[['Don Chicho (taller)',CHICHO,'mecánico']]]);
const R12=rng(31);const riders=Array.from({length:12},()=>{const L=VR.av2Random(R12);L.mochila=false;L.termo=false;return L;});
if(!EMB)BASE.push(['Conductores de moto (los 12 del tránsito)',riders.map((L,i)=>['Motociclista '+(i+1),L,'tránsito'])]);
function gen(){const out=[],R=rng(st.seed*977+st.niv);let g=0;
 while(out.length<st.n&&g++<4000){let L=VR.av2Random(R);if(st.gen!=='all'&&L.gender!==st.gen)continue;
  if(st.niv>0)L=VR.av2Nivel(L,st.niv,R);out.push([(L.gender==='f'?'Mujer':'Hombre')+' '+(out.length+1),L,st.niv?'nivel '+st.niv:'sin nivel']);}
 return out;}
const cache=new Map();
function img(L,d,a,i,k){const key=JSON.stringify(L)+d+a+i+k;let c=cache.get(key);if(!c){c=RND(Object.assign({},VR.AV2_DEFAULT,L),d,a,i,k);cache.set(key,c);}return c;}
function card(name,L,sub,onclick){const b=document.createElement('button');b.className='card';const cv=document.createElement('canvas');const im=img(L,'down','idle',0,st.k);cv.width=im.width;cv.height=im.height;cv.getContext('2d').drawImage(im,0,0);cv._L=L;
 b.append(cv);b.insertAdjacentHTML('beforeend','<b>'+name+'</b><span>'+sub+'</span>');b.onclick=()=>onclick(name,L);return b;}
const frame=(a)=>a==='idle'?Math.floor(st.f/10)%4:st.f%8;   // parado: un cuadro cada ~1,1 s, como en el juego
function tickCards(){for(const cv of document.querySelectorAll('#grid canvas')){if(!cv._L)continue;const im=img(cv._L,st.dir,st.anim,frame(st.anim),st.k);if(cv.width!==im.width){cv.width=im.width;cv.height=im.height;}const g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);g.drawImage(im,0,0);}}
function show(name,L){st.sel=[name,L];const d=$('#det');d.hidden=false;d.innerHTML='<b style="font-size:18px">'+name+'</b><div class="views"></div><pre></pre>';const v=d.querySelector('.views'),k=Math.max(st.k,4);
 const cvs=['down','up','left','right'].map(dir=>{const c=document.createElement('canvas');c.width=16*k;c.height=32*k;v.append(c);return [c,dir];});
 d.querySelector('pre').textContent=JSON.stringify(L);d.scrollIntoView({block:'nearest'});
 let f=0;clearInterval(show.t);show.t=setInterval(()=>{f=(f+1)%8;for(const [c,dir] of cvs){const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.drawImage(img(L,dir,'walk',f,k),0,0);}},110);}
function render(){const box=$('#grid');box.innerHTML='';
 if(st.tab==='base'){for(const [t,list] of BASE){const h=document.createElement('h2');h.textContent=t;box.append(h);const g=document.createElement('div');g.className='grid';box.append(g);for(const [n,L,s] of list)g.append(card(n,L,s,show));}}
 else{const g=document.createElement('div');g.className='grid';box.append(g);for(const [n,L,s] of gen())g.append(card(n,L,s,show));}
 $('#genOpts').hidden=st.tab!=='gen';}
function seg(id,key,opts){const el=$(id);if(!el)return;el.innerHTML='';for(const [v,l] of opts){const b=document.createElement('button');b.textContent=l;b.className=st[key]===v?'on':'';b.onclick=()=>{st[key]=v;seg(id,key,opts);render();if(window.parent!==window)window.parent.postMessage({t:'sync',key,v},'*');};el.append(b);}}
seg('#tabs','tab',[['base','Base'],['gen','Generados por el juego']]);
seg('#sexo','gen',[['all','Todos'],['f','Mujeres'],['m','Hombres']]);
seg('#niv','niv',[[0,'Sin nivel'],[1,'Bajo'],[3,'Medio'],[5,'Alto']]);
seg('#kk','k',[[1.5,'Tamaño del juego'],[3,'Ampliado ×3'],[5,'Ampliado ×5']]);
seg('#an','anim',[['idle','Quieto'],['walk','Caminar'],['run','Correr']]);
seg('#dr','dir',[['down','Frente'],['up','Espalda'],['right','Perfil']]);
if(EMB){document.querySelector('#ctl').hidden=true;document.querySelector('h1').hidden=true;document.querySelector('p.sub').hidden=true;}
window.addEventListener('message',(e)=>{const m=e.data||{};if(m.t==='set'){Object.assign(st,m.v);render();}if(m.t==='tick'){st.f=m.f;tickCards();}});
if(!EMB)setInterval(()=>{st.f++;tickCards();},110);
$('#mas').onclick=()=>{st.seed++;render();};
render();
'''
HTML = '''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Galería de personas de Villarrica</title><style>%s</style></head><body>
<h1>Personas de Villarrica</h1><p class="sub">Los personajes base y los que genera el juego (los peatones salen de <code>VR.av2Random</code> y <code>VR.av2Nivel</code>). Tocá uno para verlo caminando de frente, espalda y perfil, con su código.</p>
<div id="ctl"><div class="tabs" id="tabs"></div><div class="row" id="kk"></div><div class="row" id="an"></div><div class="row" id="dr"></div></div>
<div id="genOpts" hidden><div class="row" id="sexo"></div><div class="row" id="niv"></div><div class="row"><button id="mas">🔄 Otras personas</button></div></div>
<div id="grid"></div><div id="det" hidden></div>
<script>%s</script></body></html>'''
import subprocess
rev = sys.argv[sys.argv.index('--rev') + 1] if '--rev' in sys.argv else None
av2 = subprocess.run(['git', '-C', str(root), 'show', rev + ':src/game/avatar2.js'], capture_output=True, text=True, check=True).stdout if rev else src('game/avatar2.js')
js = '\n'.join([src('engine/core.js'), av2])
pre = "var CHICHO=%s;\nVR.PERSONAJES=%s;\n" % (chicho, mis)
stub = "VR.pickCar=VR.pickCar||function(){};VR.pickMoto=VR.pickMoto||function(){};\n"
args = [a for a in sys.argv[1:] if a not in ('--rev', '--nitido', '--suave') and a != rev]
out = pathlib.Path(args[0] if args else root / 'galeria_personas.html')
out.write_text(HTML % (CSS, js + ('\nVR.AV2_SS=false;' if '--nitido' in sys.argv else '\nVR.AV2_SS=true;' if '--suave' in sys.argv else '') + '\n' + stub + nivel_fn + '\n' + pre + JS))
print('listo:', out)
