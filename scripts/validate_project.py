"""Offline validation using standard Python; no packages or internet needed."""
import ast
import json
from collections import deque
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT/'Unreal/DOSExplorer/Content/Data/exhibits.json').read_text())
manifest = json.loads((ROOT/'assets/scene_manifest.json').read_text())
assert len(data['exhibits']) == 4
assert len({e['id'] for e in data['exhibits']}) == 4
for i,e in enumerate(data['exhibits']):
    assert e['answer'] in (1,2) and len(e['choices']) == 2
    assert all(e[key] for key in ('title','body','activity','explanation','source_label'))
    assert urlparse(e['url']).hostname in ('www.singstat.gov.sg','tablebuilder.singstat.gov.sg')
    assert manifest['sockets'][f'Station_{i}'] == [e['x'],e['y']-2,1]

# Conservative plan test: expand collision boxes by a 32 cm visitor radius,
# then flood-fill a 20 cm grid. This tests layout connectivity, not UE physics.
obstacles=[]
for c in manifest['colliders']:
    x,y,z=c['center']; w,d,h=c['size']
    if z+h/2 <= .03 or z-h/2 >= 1.8:
        continue
    obstacles.append((x-w/2-.32,x+w/2+.32,y-d/2-.32,y+d/2+.32))
def free(cell):
    x,y=cell[0]/5,cell[1]/5
    return -13.5<x<13.5 and -11.5<y<11.5 and not any(a<=x<=b and c<=y<=d for a,b,c,d in obstacles)
def grid(p):return round(p[0]*5),round(p[1]*5)
start=grid(manifest['sockets']['Start'])
assert free(start),'Arrival intersects collision'
queue=deque([start]); seen={start}
while queue:
    x,y=queue.popleft()
    for n in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
        if n not in seen and free(n):seen.add(n);queue.append(n)
for i in range(4):
    p=grid(manifest['sockets'][f'Station_{i}'])
    assert p in seen,f'Gallery {i+1} is not reachable on foot'
for p in ROOT.rglob('*.py'):
    ast.parse(p.read_text(encoding='utf-8'),filename=str(p))
for p in [ROOT/'Unreal/DOSExplorer/DOSExplorer.uproject']:
    json.loads(p.read_text())
assert (ROOT/'assets/DOS_Office.fbx').read_bytes().startswith(b'Kaydara FBX Binary')
assert (ROOT/'assets/DOS_Discovery_Office.blend').stat().st_size>10000
for name in ('office-overview.png','reception.png','statistics-gallery.png','floor-plan.png'):
    assert (ROOT/'renders'/name).read_bytes()[:8]==b'\x89PNG\r\n\x1a\n'
report={'status':'PASS','exhibits':4,'all_galleries_reachable':True,'reachable_grid_cells':len(seen),
        'collision_boxes':len(manifest['colliders']),'python_syntax':'PASS','files':'PASS',
        'unreal_build':'NOT RUN - Unreal Editor unavailable','unreal_playtest':'NOT RUN'}
(ROOT/'docs/validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
