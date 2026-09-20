"""Run in a fresh Blender process to inspect the exported FBX independently."""
import bpy
import json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=str(ROOT/'assets/DOS_Office.fbx'))
mesh=bpy.data.objects.get('SM_DOSOffice')
assert mesh and mesh.type=='MESH'
manifest=json.loads((ROOT/'assets/scene_manifest.json').read_text())
collision=[o for o in bpy.context.scene.objects if o.name.startswith('UCX_SM_DOSOffice_')]
assert len(collision)==manifest['collision_boxes']
for name,position in manifest['sockets'].items():
    socket=bpy.data.objects.get('SOCKET_SM_DOSOffice_'+name)
    assert socket,f'Missing socket {name}'
    assert (socket.matrix_world.translation-Vector(position)).length<.001, name
assert abs(mesh.dimensions.x-28)<.1 and abs(mesh.dimensions.y-24)<.1
assert len(mesh.data.materials)==manifest['materials']
report={'status':'PASS','round_trip':'Blender FBX export and fresh import',
        'mesh_size_metres':list(mesh.dimensions),'collision_boxes':len(collision),'sockets':len(manifest['sockets']),
        'note':'This does not replace the Unreal import and physics checks.'}
(ROOT/'docs/fbx-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
