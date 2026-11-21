## Star Nova — cielo en degradado con sol, niebla, luz del sol con sombras, mar de nubes e islas lejanas
## entre la bruma (port de js/sky.js). Los colores se mezclan según la región donde está Pip.
class_name SkyEnv
extends Node3D

const SKY_SHADER := """
shader_type sky;
uniform vec3 top_color : source_color = vec3(0.96, 0.73, 0.69);
uniform vec3 hor_color : source_color = vec3(0.99, 0.91, 0.83);
uniform vec3 bot_color : source_color = vec3(0.96, 0.76, 0.70);
uniform float night = 0.0;
void sky() {
	vec3 d = normalize(EYEDIR);
	float h = d.y;
	vec3 c = h > 0.0 ? mix(hor_color, top_color, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(hor_color, bot_color, pow(clamp(-h, 0.0, 1.0), 0.45));
	float s = max(dot(d, LIGHT0_DIRECTION), 0.0);
	vec3 sun = mix(vec3(1.0, 0.97, 0.88), vec3(1.0, 0.95, 0.8), night);
	c += sun * (pow(s, 900.0) * 1.4 + pow(s, 24.0) * 0.18 + pow(s, 4.0) * 0.06);
	COLOR = c;
}
"""
const SUN_OFFSET := Vector3(-28, 46, 20)

var env: Environment
var sky_mat: ShaderMaterial
var sun: DirectionalLight3D
var regions: Dictionary
var cloud_mat: StandardMaterial3D
var far_mat: StandardMaterial3D
var clouds: MultiMeshInstance3D
var _top := Color()
var _hor := Color()
var _bot := Color()
var _fog := Color()
var _first := true

func _init(region_defs: Dictionary) -> void:
	name = "Cielo"
	regions = region_defs

func _ready() -> void:
	sky_mat = ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = SKY_SHADER
	sky_mat.shader = sh
	var sky := Sky.new()
	sky.sky_material = sky_mat
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_energy = 0.28
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_DEPTH
	env.fog_depth_begin = 30.0
	env.fog_depth_end = 165.0
	env.fog_depth_curve = 1.0
	env.fog_density = 1.0
	env.fog_sky_affect = 0.0
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	sun = DirectionalLight3D.new()
	sun.name = "Sol"
	sun.light_color = Color("#fff1df")
	sun.light_energy = 0.16
	sun.shadow_enabled = true
	sun.shadow_bias = 0.1
	sun.shadow_normal_bias = 2.0
	sun.shadow_blur = 1.5
	sun.directional_shadow_max_distance = 48.0
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	add_child(sun)
	sun.look_at_from_position(SUN_OFFSET, Vector3.ZERO, Vector3.UP)

	_make_clouds()
	_make_far_islands()

func _rng(seed: int) -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = seed
	return r

## Mar de nubes bajo las islas y algunas nubes altas.
func _make_clouds() -> void:
	var m := SphereMesh.new()
	m.radius = 1.0
	m.height = 2.0
	m.radial_segments = 8
	m.rings = 4
	cloud_mat = StandardMaterial3D.new()
	cloud_mat.albedo_color = Color(1, 1, 1, 0.9)
	cloud_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	cloud_mat.roughness = 1.0
	cloud_mat.shading_mode = BaseMaterial3D.SHADING_MODE_PER_VERTEX
	m.material = cloud_mat
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = m
	mm.instance_count = 140
	var r := _rng(7)
	for i in 140:
		var low := i < 100
		var a := r.randf() * TAU
		var d := (10.0 + r.randf() * 140.0) if low else (150.0 + r.randf() * 180.0)
		var p := Vector3(cos(a) * d, (-9.0 - r.randf() * 10.0) if low else (15.0 + r.randf() * 50.0), sin(a) * d)
		var s := (3.0 + r.randf() * 6.0) if low else (6.0 + r.randf() * 12.0)
		var b := Basis(Vector3.UP, r.randf() * 3.0).scaled(Vector3(s * (1.4 + r.randf()), s * 0.45, s * (1.0 + r.randf())))
		mm.set_instance_transform(i, Transform3D(b, p))
	clouds = MultiMeshInstance3D.new()
	clouds.multimesh = mm
	clouds.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(clouds)

## Islas flotantes lejanas (siluetas en la bruma).
func _make_far_islands() -> void:
	far_mat = StandardMaterial3D.new()
	far_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	far_mat.albedo_color = Color("#f0c4b8")
	far_mat.disable_fog = true
	var top := CylinderMesh.new()
	top.top_radius = 1.0
	top.bottom_radius = 1.0
	top.height = 0.18
	top.radial_segments = 8
	top.material = far_mat
	var bot := CylinderMesh.new()
	bot.top_radius = 0.95
	bot.bottom_radius = 0.12
	bot.height = 0.9
	bot.radial_segments = 8
	bot.material = far_mat
	var r := _rng(7)
	var n := 26
	var xs: Array[Transform3D] = []
	for i in n:
		var a := TAU * i / n + r.randf() * 0.15
		var d := 150.0 + r.randf() * 160.0
		var s := 10.0 + r.randf() * 18.0
		xs.append(Transform3D(Basis(Vector3.UP, r.randf() * 3.0).scaled(Vector3(s, s, s)), Vector3(cos(a) * d, -12.0 + r.randf() * 40.0, sin(a) * d)))
	for pair in [[top, Vector3.ZERO], [bot, Vector3(0, -0.54, 0)]]:
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = pair[0]
		mm.instance_count = n
		for i in n:
			var x: Transform3D = xs[i]
			mm.set_instance_transform(i, x * Transform3D(Basis(), pair[1]))
		var mi := MultiMeshInstance3D.new()
		mi.multimesh = mm
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(mi)

## Mezcla los colores del cielo según la región en la que está Pip y mueve el sol con él.
func update_sky(dt: float, focus: Vector3, t: float) -> void:
	var w := Palette.weights(regions, focus.x, focus.z)
	var top := Color(0, 0, 0)
	var hor := Color(0, 0, 0)
	var bot := Color(0, 0, 0)
	var fog := Color(0, 0, 0)
	var night := 0.0
	for id in regions:
		var r: Dictionary = regions[id]
		var k: float = w[id]
		top += Color(r.sky_top) * k
		hor += Color(r.sky_hor) * k
		bot += Color(r.sky_bot) * k
		fog += Color(r.fog) * k
		night += r.night * k
	var e := 1.0 if _first else 1.0 - exp(-dt * 2.0)
	_first = false
	_top = _top.lerp(top, e)
	_hor = _hor.lerp(hor, e)
	_bot = _bot.lerp(bot, e)
	_fog = _fog.lerp(fog, e)
	sky_mat.set_shader_parameter("top_color", _top)
	sky_mat.set_shader_parameter("hor_color", _hor)
	sky_mat.set_shader_parameter("bot_color", _bot)
	sky_mat.set_shader_parameter("night", night)
	env.fog_light_color = _fog
	env.ambient_light_color = _hor.lerp(Color.WHITE, 0.35)
	cloud_mat.albedo_color = Color(_hor.lerp(Color.WHITE, 0.55), 0.9)
	far_mat.albedo_color = _fog.lerp(_top, 0.25)
	clouds.rotation.y = t * 0.004
	sun.global_position = focus + SUN_OFFSET
	sun.look_at(focus, Vector3.UP)
