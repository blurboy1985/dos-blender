import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/DOS_Discovery_Office.blend'))
for o in bpy.context.scene.objects:
    o.select_set(o.type in {'MESH','FONT'})
    if o.type=='FONT':
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.convert(target='MESH')
bpy.ops.export_scene.gltf(filepath=str(ROOT/'web/public/assets/office.glb'),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False)
