#!/usr/bin/env python3
"""Arma data/instituciones.json (iglesias, colegios, universidades de Villarrica) desde OSM (Overpass).
Uso: python3 tools/instituciones_extraer.py  (requiere red). Después revisar nombres a mano:
se limpian prefijos, se descarta la Catedral (ya es landmark) y los sin nombre quedan con nombre vacío."""
import json, urllib.request, urllib.parse, pathlib
Q = """[out:json][timeout:60];area["name"="Villarrica"]["boundary"="administrative"]->.a;
(nwr["amenity"="place_of_worship"](area.a);nwr["amenity"~"school|college|university"](area.a););out center tags;"""
d = json.load(urllib.request.urlopen('https://overpass-api.de/api/interpreter', urllib.parse.urlencode({'data': Q}).encode()))
out = []
for e in d['elements']:
    t = e.get('tags', {}); c = e.get('center') or e
    am = t.get('amenity')
    tipo = 'iglesia' if am == 'place_of_worship' else ('uni' if am in ('college', 'university') else 'colegio')
    out.append({'tipo': tipo, 'nombre': t.get('name', ''), 'lat': c['lat'], 'lon': c['lon'], 'osm': f"{e['type']}/{e['id']}"})
pathlib.Path(__file__).resolve().parent.parent.joinpath('data/instituciones.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
print(len(out), 'instituciones (limpiar nombres a mano antes de commitear)')
