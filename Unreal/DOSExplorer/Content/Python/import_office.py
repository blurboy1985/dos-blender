"""Unreal Editor: Tools > Execute Python Script. Save existing work first.

Creates /Game/DOS/Maps/DOS_Office. Existing generated maps are loaded and only
actors tagged DOSGenerated are replaced. Requires the C++ module to be built.
"""
from pathlib import Path
import json
import unreal

ROOT = Path(__file__).resolve().parents[4]
FBX = ROOT / 'assets/DOS_Office.fbx'
MAP = '/Game/DOS/Maps/DOS_Office'
MESH = '/Game/DOS/Meshes/SM_DOSOffice'
if not FBX.is_file():
    raise RuntimeError(f'FBX not found: {FBX}. Keep the delivered folder structure intact.')
game_mode = unreal.load_class(None, '/Script/DOSExplorer.DOSGameMode')
if not game_mode:
    raise RuntimeError('Build the DOSExplorerEditor C++ target before importing.')

# The legacy FBX importer supports custom UCX collision and named sockets.
unreal.SystemLibrary.execute_console_command(None, 'Interchange.FeatureFlags.Import.FBX 0')
task = unreal.AssetImportTask()
task.set_editor_property('filename', str(FBX))
task.set_editor_property('destination_path', '/Game/DOS/Meshes')
task.set_editor_property('destination_name', 'SM_DOSOffice')
task.set_editor_property('automated', True)
task.set_editor_property('replace_existing', True)
task.set_editor_property('save', True)
options = unreal.FbxImportUI()
options.set_editor_property('import_mesh', True)
options.set_editor_property('import_as_skeletal', False)
options.set_editor_property('import_materials', True)
options.set_editor_property('import_textures', False)
options.set_editor_property('automated_import_should_detect_type', False)
options.set_editor_property('mesh_type_to_import', unreal.FBXImportType.FBXIT_STATIC_MESH)
static = options.get_editor_property('static_mesh_import_data')
for key, value in {
    'combine_meshes': True, 'auto_generate_collision': False,
    'one_convex_hull_per_ucx': True, 'convert_scene': True,
    'convert_scene_unit': True, 'import_uniform_scale': 1.0,
    'generate_lightmap_u_vs': False,
    'normal_import_method': unreal.FBXNormalImportMethod.FBXNIM_IMPORT_NORMALS,
}.items():
    static.set_editor_property(key, value)
task.set_editor_property('options', options)
unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
mesh = unreal.load_asset(MESH)
if not isinstance(mesh, unreal.StaticMesh):
    raise RuntimeError(f'FBX import did not produce {MESH}: {task.imported_object_paths}')

# Normalize FBX helper names once; runtime then uses the imported transforms.
expected = ['Start', 'StartFocus'] + [f'{kind}_{i}' for i in range(4) for kind in ('Station', 'Focus')]
for name in expected:
    for prefix in ('', 'SM_DOSOffice_', 'SOCKET_SM_DOSOffice_'):
        socket = mesh.find_socket(prefix + name)
        if socket:
            socket.set_editor_property('socket_name', unreal.Name(name))
            break
missing = [name for name in expected if mesh.find_socket(name) is None]
if missing:
    raise RuntimeError(f'Missing imported sockets: {missing}. Check SOCKET_SM_DOSOffice_* helpers in Blender.')
size = mesh.get_bounding_box().max - mesh.get_bounding_box().min
horizontal = sorted([size.x, size.y])
if not (2300 < horizontal[0] < 2500 and 2700 < horizontal[1] < 2900):
    raise RuntimeError(f'Unexpected mesh dimensions {size}; expected about 2800 x 2400 cm. Do not continue with incorrect scale.')
mesh_editor = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
collision_count = mesh_editor.get_simple_collision_count(mesh)
if collision_count < 20:
    raise RuntimeError(f'Only {collision_count} collision shapes imported. Expected custom floor and wall collision.')
unreal.EditorAssetLibrary.save_loaded_asset(mesh)

levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
if unreal.EditorAssetLibrary.does_asset_exist(MAP):
    if not levels.load_level(MAP):
        raise RuntimeError('Could not load existing DOS map.')
    for actor in actors.get_all_level_actors():
        if actor.actor_has_tag('DOSGenerated'):
            actors.destroy_actor(actor)
else:
    unreal.EditorAssetLibrary.make_directory('/Game/DOS/Maps')
    if not levels.new_level(MAP):
        raise RuntimeError('Could not create DOS map.')

def spawn(cls, location, label, rotation=unreal.Rotator()):
    actor = actors.spawn_actor_from_class(cls, location, rotation)
    if not actor:
        raise RuntimeError(f'Could not spawn {label}')
    actor.set_actor_label(label)
    actor.set_editor_property('tags', ['DOSGenerated'])
    return actor

office = spawn(unreal.StaticMeshActor, unreal.Vector(), 'DOS Discovery Office')
office.set_editor_property('tags', ['DOSGenerated', 'DOSOffice'])
component = office.static_mesh_component
component.set_static_mesh(mesh)
component.set_collision_profile_name('BlockAll')
component.set_mobility(unreal.ComponentMobility.STATIC)
start = component.get_socket_location('Start')
focus = component.get_socket_location('StartFocus')
rotation = unreal.MathLibrary.find_look_at_rotation(start, focus)
rotation.pitch = 0
spawn(unreal.PlayerStart, start, 'Visitor arrival', rotation)
sun = spawn(unreal.DirectionalLight, unreal.Vector(0,0,600), 'Daylight', unreal.Rotator(-55,-35,0))
sun.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
sun.light_component.set_intensity(3.0)
sky = spawn(unreal.SkyLight, unreal.Vector(0,0,700), 'Sky fill')
sky.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
sky.light_component.set_editor_property('real_time_capture', True)
spawn(unreal.SkyAtmosphere, unreal.Vector(), 'Sky atmosphere')
for i, name in enumerate(['Start'] + [f'Station_{j}' for j in range(4)]):
    position = component.get_socket_location(name)
    position.z = 330
    light = spawn(unreal.PointLight, position, f'Gallery fill {i}')
    light.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
    light.light_component.set_intensity(3500)
    light.light_component.set_attenuation_radius(850)
    light.light_component.set_cast_shadows(False)
world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
world.get_world_settings().set_editor_property('default_game_mode', game_mode)
if not levels.save_current_level():
    raise RuntimeError('Could not save DOS_Office map.')
unreal.EditorAssetLibrary.save_directory('/Game/DOS', only_if_is_dirty=True, recursive=True)
report = {'engine':unreal.SystemLibrary.get_engine_version(), 'mesh':MESH,'map':MAP,
          'size_cm':[size.x,size.y,size.z], 'collision_shapes':collision_count,
          'sockets':expected, 'status':'imported; Play-in-Editor validation still required'}
report_path=Path(unreal.Paths.project_saved_dir())/'dos_import_report.json'
report_path.parent.mkdir(parents=True,exist_ok=True)
report_path.write_text(json.dumps(report,indent=2))
unreal.log(f'DOS import complete. Press Play. Report: {report_path}')
