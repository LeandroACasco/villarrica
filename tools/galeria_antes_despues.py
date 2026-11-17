"""Arma la página «antes y después» de las personas: dos copias de la galería (una con el dibujo de una versión vieja del juego,
otra con el actual) lado a lado, con los mismos personajes y las mismas animaciones sincronizadas.

  python3 tools/galeria_antes_despues.py REV_ANTES [salida.html]      (REV_ANTES: commit del dibujo viejo, ej. 51a8818)"""
import html, pathlib, subprocess, sys, tempfile
root = pathlib.Path(__file__).resolve().parent.parent
rev = sys.argv[1]; out = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else root / 'antes_despues_personas.html')
tmp = pathlib.Path(tempfile.mkdtemp())
for nm, extra in (('antes', ['--rev', rev]), ('nitido', ['--nitido']), ('suave', ['--suave'])):
    subprocess.run([sys.executable, str(root / 'tools' / 'galeria_personas.py'), str(tmp / (nm + '.html'))] + extra, check=True, capture_output=True)
A, N, D = [html.escape((tmp / f).read_text(), quote=True) for f in ('antes.html', 'nitido.html', 'suave.html')]
PAGE = '''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Personas: antes y después</title><style>
:root{--bg:#121620;--panel2:#232b3d;--line:#323c54;--ink:#f3ecd8;--mute:#a8a596;--accent:#ffd75e;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,sans-serif;padding:12px}
h1{margin:0 0 2px;font-size:22px;color:var(--accent)}p{margin:0 0 8px;color:var(--mute)}
.row{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;align-items:center}.row b{color:var(--mute);font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin-right:4px}
button{background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:7px 11px;font:700 13px system-ui;cursor:pointer}button.on{background:var(--accent);color:#2a1f04;border-color:var(--accent)}
#cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:8px}#cols.uno{grid-template-columns:1fr}
.col h2{margin:0 0 4px;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}.col iframe{width:100%;height:78vh;border:1px solid var(--line);border-radius:10px;background:#121620}
@media(max-width:900px){#cols{grid-template-columns:1fr}}
</style></head><body><h1>Personas: antes y después</h1><p>Los mismos personajes con el dibujo de antes y el de ahora. Cambiá la animación, la vista y el tamaño: se mueven los dos a la vez.</p>
<div class="row"><b>Animación</b><span id="an"></span></div><div class="row"><b>Vista</b><span id="dr"></span></div><div class="row"><b>Tamaño</b><span id="kk"></span></div><div class="row"><b>Ver</b><span id="vr"></span></div>
<div id="cols"><div class="col" id="cA"><h2>Antes</h2><iframe id="fA" srcdoc="@@A@@"></iframe></div><div class="col" id="cN"><h2>Después · nítido</h2><iframe id="fN" srcdoc="@@N@@"></iframe></div><div class="col" id="cD"><h2>Después · suave</h2><iframe id="fD" srcdoc="@@D@@"></iframe></div></div>
<script>
const F=['fA','fN','fD'].map(i=>document.getElementById(i));const st={anim:'idle',dir:'down',k:3};let f=0;
const send=(m)=>F.forEach(x=>x.contentWindow&&x.contentWindow.postMessage(m,'*'));
function seg(id,key,opts,fn){const el=document.getElementById(id);el.innerHTML='';for(const [v,l] of opts){const b=document.createElement('button');b.textContent=l;b.className=(fn?fn.cur:st[key])===v?'on':'';b.onclick=()=>{if(fn)fn(v);else{st[key]=v;send({t:'set',v:{[key]:v}});}seg(id,key,opts,fn);};el.append(b);}}
seg('an','anim',[['idle','Quieto'],['walk','Caminar'],['run','Correr']]);seg('dr','dir',[['down','Frente'],['up','Espalda'],['right','Perfil']]);seg('kk','k',[[1.5,'Tamaño del juego'],[3,'Ampliado ×3'],[5,'Ampliado ×5']]);
const vf=(v)=>{vf.cur=v;for(const [id,k] of [['cA','a'],['cN','n'],['cD','d']])document.getElementById(id).hidden=v!=='all'&&v!==k;document.getElementById('cols').className=v==='all'?'':'uno';};vf.cur='all';
seg('vr','',[['all','Los tres'],['a','Solo antes'],['n','Después nítido'],['d','Después suave']],vf);
setInterval(()=>{f++;send({t:'tick',f});},110);F.forEach(x=>x.onload=()=>send({t:'set',v:st}));
</script></body></html>'''
out.write_text(PAGE.replace('@@A@@', A).replace('@@N@@', N).replace('@@D@@', D)); print('listo:', out)
