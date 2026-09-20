"""Run with Blender --background --python scripts/build_office.py. Units: metres."""
import bpy
import json
import math
import random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
RENDERS = ROOT / 'renders'
ASSETS.mkdir(exist_ok=True)
RENDERS.mkdir(exist_ok=True)
DATA = json.loads((ROOT / 'Unreal/DOSExplorer/Content/Data/exhibits.json').read_text())
random.seed(21)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
materials = {}
colliders = []

def material(name, rgb, roughness=.65, metallic=0, emission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*rgb, 1)
        bsdf.inputs['Emission Strength'].default_value = emission
    materials[name] = m
    return m

material('Ivory', (.82,.84,.80))
material('Floor', (.53,.59,.59))
material('Navy', (.018,.055,.105))
material('Wood', (.52,.29,.13))
material('Light wood', (.72,.52,.31))
material('Ink', (.045,.075,.09))
material('White', (.95,.96,.9))
material('Metal', (.17,.22,.25), .28, .65)
material('Leaf', (.10,.28,.15))
material('Leaf light', (.23,.42,.19))
material('Warm light', (1,.79,.48), emission=3)
for e in DATA['exhibits']:
    h=e['color'].lstrip('#')
    material(e['id'], tuple(int(h[i:i+2],16)/255 for i in (0,2,4)))

def finish(obj, name, mat):
    obj.name = name
    obj.data.materials.append(materials[mat])
    return obj

def box(name, pos, scale, mat, bevel=.025, collision=False):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    o=finish(bpy.context.object, name, mat)
    o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        m=o.modifiers.new('Soft edges','BEVEL'); m.width=bevel; m.segments=2
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    if collision:
        colliders.append({'name':name,'center':list(pos),'size':list(scale)})
    return o

def cylinder(name,pos,r,depth,mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=depth, location=pos)
    return finish(bpy.context.object,name,mat)

def text(name, body, pos, size, mat='White', rotation=(math.pi/2,0,0), align='CENTER'):
    bpy.ops.object.text_add(location=pos, rotation=rotation)
    o=finish(bpy.context.object,name,mat)
    o.data.body=body; o.data.size=size; o.data.align_x=align
    o.data.extrude=.001; o.data.space_line=1.2
    return o

def plant(x,y):
    colliders.append({'name':'Planter','center':[x,y,.55],'size':[.65,.65,1.1]})
    cylinder('Planter',(x,y,.3),.30,.6,'Ivory')
    cylinder('Stem',(x,y,.9),.035,1.3,'Wood')
    for i in range(10):
        a=i*2.4
        z=.72+i*.08
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6, location=(x+.25*math.cos(a),y+.25*math.sin(a),z))
        o=finish(bpy.context.object,'Foliage','Leaf' if i%2 else 'Leaf light')
        o.scale=(.34,.13,.10); o.rotation_euler=(0,.35,a)

def chair(x,y):
    colliders.append({'name':'Chair','center':[x,y,.5],'size':[.60,.60,1]})
    box('Chair cushion',(x,y,.48),(.58,.56,.12),'Navy')
    box('Chair back',(x,y+.25,.83),(.58,.10,.64),'Navy')
    for dx in (-.23,.23):
        for dy in (-.21,.21):
            box('Chair leg',(x+dx,y+dy,.23),(.035,.035,.46),'Metal',.008)

def desk(x,y):
    box('Desk',(x,y,.76),(1.7,.8,.08),'Light wood',collision=True)
    for dx in (-.72,.72):
        box('Desk support',(x+dx,y,.37),(.07,.65,.74),'White')
    box('Monitor',(x,y+.19,1.1),(.65,.065,.39),'Ink')
    box('Display',(x,y+.151,1.1),(.58,.014,.31),'digital',.005)
    cylinder('Monitor stand',(x,y+.19,.89),.04,.22,'Metal')
    box('Keyboard',(x,y-.18,.819),(.44,.16,.025),'Ink',.006)
    chair(x,y-.92)

# Open arrival lobby, 4 m central spine, four gallery rooms, working office edges.
box('Foundation',(0,0,-.18),(28,24,.32),'Navy',collision=True)
box('Floor',(0,0,-.015),(27.6,23.6,.03),'Floor',0)
box('Central promenade',(0,2,.012),(4,19,.024),'Ivory',0)
for x in (-2.05,2.05):
    box('Wayfinding inlay',(x,2,.032),(.035,19,.012),'Light wood',0)
box('North wall',(0,11.85,1.6),(28,.20,3.2),'Ivory',collision=True)
for x in (-13.85,13.85):
    box('Window sill',(x,0,.4),(.20,24,.8),'Ivory',collision=True)
    for y in range(-11,12,3):
        box('Window mullion',(x,y,2),(.12,.10,2.4),'Metal')
    box('Window top',(x,0,3.15),(.20,24,.16),'Ivory')
for x in (-10,10):
    box('Entry wall',(x,-11.85,1.6),(8,.20,3.2),'Ivory',collision=True)
# Invisible collision at glazing and entrance keeps the visitor inside.
for name,pos,size in [('West glazing',(-13.9,0,1.6),(.2,24,3.2)),('East glazing',(13.9,0,1.6),(.2,24,3.2)),('Entry boundary',(0,-11.9,1.6),(12,.2,3.2))]:
    colliders.append({'name':name,'center':list(pos),'size':list(size)})

box('Reception feature',(0,-5.6,1.5),(6,.22,3),'Navy',collision=True)
for x in [i*.18-2.8 for i in range(32)]:
    box('Timber fin',(x,-5.77,1.5),(.07,.08,2.95),'Wood',.005)
box('Brand plaque',(0,-5.86,2.0),(4.8,.08,1.3),'Navy')
text('DOS wordmark','DOS',(0,-5.92,2.18),.63)
text('Department name','DEPARTMENT OF STATISTICS',(0,-5.92,1.78),.17)
text('Welcome tagline','Discover the stories behind the numbers',(0,-5.92,1.48),.13)
box('Reception counter',(0,-7.0,.55),(4.6,.9,1.1),'Light wood',collision=True)
box('Reception top',(0,-7,1.14),(4.8,1.05,.10),'Ivory')
text('Welcome desk sign','WELCOME  /  START YOUR JOURNEY',(0,-7.46,.61),.14,'Ink')
for x in (-4,4): plant(x,-5.7)
for x in (-9,9):
    box('Lounge sofa',(x,-8,.43),(3,1,.48),'Navy',collision=True)
    box('Lounge back',(x,-8.43,.85),(3,.18,.8),'Navy')
    cylinder('Lounge table',(x,-6.5,.4),.65,.10,'Light wood')
    colliders.append({'name':'Lounge table','center':[x,-6.5,.25],'size':[1.3,1.3,.5]})
    plant(x+2.2,-8)

for idx,e in enumerate(DATA['exhibits']):
    x,y=e['x'],e['y']
    box('Gallery carpet '+e['id'],(x,y-.3,.026),(10,5.6,.04),e['id'],0)
    box('Exhibit wall '+e['id'],(x,y+1.35,1.55),(8.7,.20,3.1),'Navy',collision=True)
    box('Exhibit accent '+e['id'],(x-4.17,y+1.21,1.55),(.11,.06,2.8),e['id'])
    text('Zone number '+e['id'],f'0{idx+1}',(x-3.35,y+1.21,2.37),.53,e['id'])
    text('Zone title '+e['id'],e['short_title'],(x+.15,y+1.21,2.46),.32)
    sub=['Evidence for better decisions','Find. Explore. Put data to work.','A common statistical language','From responses to insights'][idx]
    text('Zone subtitle '+e['id'],sub,(x+.15,y+1.21,2.04),.16)
    box('Display surround',(x,y+1.16,1.12),(3.6,.12,1.32),'Metal')
    box('Display panel',(x,y+1.075,1.12),(3.4,.025,1.13),'Ink',.005)
    if idx==0:
        for j,h in enumerate((.28,.43,.38,.65,.78)):
            box('Illustrative bar',(x-1.15+j*.48,y+1.045,.72+h/2),(.27,.025,h),e['id'],.005)
        text('Illustration label','ILLUSTRATIVE / NOT OFFICIAL DATA',(x,y+1.02,.65),.095)
    else:
        words=[[],['TABLE BUILDER','MOBILE APP','BITE'],['SSIC / INDUSTRIES','SSOC / OCCUPATIONS','DEFINITIONS MATTER'],['BUSINESSES','HOUSEHOLDS','OFFICIAL CHANNELS']][idx]
        for j,w in enumerate(words): text('Screen label',w,(x,y+1.03,1.43-j*.31),.16,e['id'])
    box('Interactive plinth '+e['id'],(x,y-.6,.52),(1.15,.6,1.04),'Ivory',collision=True)
    box('Interactive top',(x,y-.6,1.065),(1.18,.65,.05),e['id'])
    text('Interact prompt','EXPLORE  /  E',(x,y-.911,.78),.12,'Ink')
    plant(x+3.8,y+.5)
    # Partition along central spine with a 2.1 m doorway at each gallery.
    side=-2.7 if x<0 else 2.7
    box('Room divider',(side,y+1.1,1.4),(.12,2.1,2.8),'Ivory',collision=True)
    box('Room divider',(side,y-2.7,1.4),(.12,1.25,2.8),'Ivory',collision=True)
    box('Door lintel',(side,y-1.02,2.95),(.15,2.15,.24),'Navy')
    text('Floor zone label',f'0{idx+1}',(side+(-.6 if x<0 else .6),y-1.7,.055),.5,'White',rotation=(0,0,0))

for x in (-10.8,-7.7,7.7,10.8): desk(x,-2.7)
text('Entry floor label','DOS DISCOVERY OFFICE',(0,-10,.025),.42,'Navy',rotation=(0,0,0))
text('Concept notice','CONCEPT VISITOR FLOOR  /  NOT AN ACTUAL OFFICE PLAN',(0,-10.6,.025),.16,'Ink',rotation=(0,0,0))
text('North title','DATA THAT CONNECTS US',(0,11.72,2.25),.40,'Navy')
text('North subtitle','Explore  /  Understand  /  Apply',(0,11.72,1.82),.18,'Ink')
for y in (-3,3,9):
    box('Overhead light',(0,y,3.5),(1.2,2.2,.08),'Warm light')
for x in (-8,8):
    for y in (0,6):
        box('Gallery light',(x,y,3.45),(5,.12,.07),'Warm light')

# Named FBX sockets allow Unreal to use converted coordinates without guessing axes.
sockets={'Start':(0,-10,1), 'StartFocus':(0,-5.5,1)}
for i,e in enumerate(DATA['exhibits']):
    sockets[f'Station_{i}']=(e['x'],e['y']-2.0,1)
    sockets[f'Focus_{i}']=(e['x'],e['y']+1.1,1.5)
for name,pos in sockets.items():
    o=bpy.data.objects.new('SOCKET_SM_DOSOffice_'+name,None); scene.collection.objects.link(o)
    o.location=pos; o.empty_display_size=.2

# Keep the editable master separate from the temporary joined export mesh.
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.world.color=(.4,.4,.4)
world=scene.world; world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.67,.78,.85,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.5
def area(name, pos, energy, size):
    d=bpy.data.lights.new(name,'AREA'); d.energy=energy; d.shape='DISK'; d.size=size
    o=bpy.data.objects.new(name,d); scene.collection.objects.link(o); o.location=pos
    return o
area('Ceiling softbox',(0,0,12),4200,18)
for x in (-10,10): area('Gallery softbox',(x,3,6),1300,8)
area('Reception softbox',(0,-8,6),1400,6)
sun_data=bpy.data.lights.new('Daylight','SUN'); sun_data.energy=1.6; sun_data.angle=.25
sun=bpy.data.objects.new('Daylight',sun_data); scene.collection.objects.link(sun); sun.rotation_euler=(.45,-.4,-.45)
def camera(name, pos, target, ortho=None):
    d=bpy.data.cameras.new(name); o=bpy.data.objects.new(name,d); scene.collection.objects.link(o)
    o.location=pos; o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    if ortho: d.type='ORTHO'; d.ortho_scale=ortho
    else: d.lens=22
    return o
hero=camera('Overview',(31,-38,35),(0,1,0),42)
entry=camera('Visitor view',(-3.8,-10.3,1.72),(0,-5.6,1.65))
gallery=camera('Gallery view',(-10.4,-1.7,1.7),(-7.4,3.2,1.5))
plan=camera('Floor plan',(0,0,40),(0,0,0),32)
scene.camera=hero
scene.render.resolution_x=1600; scene.render.resolution_y=1400; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
for a in bpy.context.screen.areas:
    if a.type=='VIEW_3D':
        a.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(ASSETS/'DOS_Discovery_Office.blend'))

# Duplicate evaluated geometry, combine it, and export exact custom box collision.
depsgraph=bpy.context.evaluated_depsgraph_get()
exports=[]
for o in list(scene.objects):
    if o.type in {'MESH','FONT'}:
        mesh=bpy.data.meshes.new_from_object(o.evaluated_get(depsgraph))
        dup=bpy.data.objects.new('Export_'+o.name,mesh); scene.collection.objects.link(dup)
        dup.matrix_world=o.matrix_world.copy(); exports.append(dup)
bpy.ops.object.select_all(action='DESELECT')
for o in exports:o.select_set(True)
bpy.context.view_layer.objects.active=exports[0]
bpy.ops.object.join()
joined=bpy.context.object; joined.name='SM_DOSOffice'
scene.cursor.location=(0,0,0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
for o in scene.objects:
    if o.name.startswith('SOCKET_'):
        o.parent=joined
for i,c in enumerate(colliders):
    o=box(f'UCX_SM_DOSOffice_{i:03}',c['center'],c['size'],'Floor',0)
    exports.append(o)
bpy.ops.object.select_all(action='DESELECT'); joined.select_set(True)
for o in scene.objects:
    if o.name.startswith(('UCX_','SOCKET_')):o.select_set(True)
bpy.context.view_layer.objects.active=joined
bpy.ops.export_scene.fbx(filepath=str(ASSETS/'DOS_Office.fbx'),use_selection=True,object_types={'MESH','EMPTY'},axis_forward='-Y',axis_up='Z',apply_unit_scale=True,add_leaf_bones=False,bake_anim=False)
export_mesh=joined.data
report={'blender':bpy.app.version_string,'vertices':len(export_mesh.vertices),'polygons':len(export_mesh.polygons),'materials':len(export_mesh.materials),'collision_boxes':len(colliders),'sockets':sockets,'floor_metres':[28,24],'colliders':colliders}
(ASSETS/'scene_manifest.json').write_text(json.dumps(report,indent=2))
# Reload the editable master for clean renders, avoiding duplicate export geometry.
bpy.ops.wm.open_mainfile(filepath=str(ASSETS/'DOS_Discovery_Office.blend'))
scene=bpy.context.scene
for name,filename,w,h in [('Overview','office-overview.png',1600,1400),('Visitor view','reception.png',1600,900),('Gallery view','statistics-gallery.png',1600,900),('Floor plan','floor-plan.png',1400,1400)]:
    scene.camera=bpy.data.objects[name]
    scene.render.resolution_x=w; scene.render.resolution_y=h
    scene.render.filepath=str(RENDERS/filename)
    bpy.ops.render.render(write_still=True)
print('DOS_BUILD_COMPLETE')
