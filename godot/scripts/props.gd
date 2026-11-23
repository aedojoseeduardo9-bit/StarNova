## Star Nova — objetos del mundo con lógica o física (port de js/props.js): hoguera y cajas.
class_name Props

static var _mats := {}

static func mat(color: String, emissive := Color.BLACK) -> StandardMaterial3D:
	var key := color + str(emissive)
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(color)
	m.roughness = 1.0
	m.metallic_specular = 0.0
	m.diffuse_mode = BaseMaterial3D.DIFFUSE_LAMBERT
	if emissive != Color.BLACK:
		m.emission_enabled = true
		m.emission = emissive
	_mats[key] = m
	return m

static func part(parent: Node3D, mesh: Mesh, m: Material, pos: Vector3, sc: Vector3) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = m
	mi.position = pos
	mi.scale = sc
	parent.add_child(mi)
	return mi


## La hoguera de El Claro: piedras, troncos, tres llamas que bailan, chispas y una luz cálida (cura a Pip).
class Campfire extends Node3D:
	var flames: Array[MeshInstance3D] = []
	var light: OmniLight3D
	var t := 0.0

	var p: Vector3
	var spark_color: Color

	func _init(pos: Vector3, look_id := "fuego") -> void:
		name = "Hoguera"
		position = pos
		p = pos
		var look: Dictionary = Utileria.CAMP_LOOKS.get(look_id, Utileria.CAMP_LOOKS.fuego)
		var ico := SphereMesh.new()
		ico.radius = 1.0
		ico.height = 2.0
		ico.radial_segments = 6
		ico.rings = 3
		for i in 5:
			var a := TAU * i / 5.0
			Props.part(self, ico, Props.mat(look.stone), Vector3(cos(a) * 0.45, 0.06, sin(a) * 0.45), Vector3(0.13, 0.08, 0.13))
		var cyl := CylinderMesh.new()
		cyl.top_radius = 1.0
		cyl.bottom_radius = 1.0
		cyl.height = 1.0
		cyl.radial_segments = 6
		for i in 3:
			var lg := Props.part(self, cyl, Props.mat(look.log), Vector3(0, 0.08, 0), Vector3(0.06, 0.6, 0.06))
			lg.rotation_order = EULER_ORDER_XYZ
			lg.rotation = Vector3(0, PI * i / 3.0, PI / 2)
		var cone := CylinderMesh.new()
		cone.top_radius = 0.0
		cone.bottom_radius = 1.0
		cone.height = 1.0
		cone.radial_segments = 5
		var looks: Array = look.flames
		var sizes := [0.28, 0.18, 0.09]
		for i in 3:
			var f := Props.part(self, cone, Props.mat(looks[i][0], Color(looks[i][1])), Vector3(0, 0.3, 0), Vector3(sizes[i], sizes[i] * 2.2, sizes[i]))
			f.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			flames.append(f)
		light = OmniLight3D.new()
		light.light_color = Color(look.light)
		light.light_energy = 1.6
		light.omni_range = 9.0
		light.omni_attenuation = 1.6
		light.position = Vector3(0, 0.8, 0)
		add_child(light)
		var sparks := CPUParticles3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.04
		sm.height = 0.08
		sm.radial_segments = 4
		sm.rings = 2
		var smat := StandardMaterial3D.new()
		smat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		smat.albedo_color = Color(look.spark)
		sm.material = smat
		sparks.mesh = sm
		sparks.amount = 12
		sparks.lifetime = 1.0
		sparks.position = Vector3(0, 0.6, 0)
		sparks.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
		sparks.emission_sphere_radius = 0.12
		sparks.direction = Vector3.UP
		sparks.spread = 15.0
		sparks.initial_velocity_min = 1.0
		sparks.initial_velocity_max = 1.8
		sparks.gravity = Vector3.ZERO
		sparks.scale_amount_min = 0.6
		sparks.scale_amount_max = 1.2
		add_child(sparks)

	func _process(dt: float) -> void:
		t += dt
		for i in flames.size():
			var f := flames[i]
			var k := 1.0 + sin(t * (9.0 + i * 3.0) + i) * 0.12
			f.scale.y = f.scale.x * 2.2 * k
			f.position.y = 0.3 + (f.scale.y - f.scale.x * 2.2) * 0.3
			f.rotation.y = t * (1.0 + i)
		light.light_energy = 1.5 + sin(t * 13.0) * 0.18 + sin(t * 7.3) * 0.12


## Caja de madera con física: Pip la puede empujar.
class Crate extends RigidBody3D:
	var home: Vector3

	func _init(pos: Vector3) -> void:
		name = "Caja"
		position = pos
		home = pos
		collision_layer = 4
		collision_mask = 1 | 2 | 4
		mass = 0.11
		angular_damp = 0.4
		var pm := PhysicsMaterial.new()
		pm.friction = 0.8
		physics_material_override = pm
		var cs := CollisionShape3D.new()
		var b := BoxShape3D.new()
		b.size = Vector3(0.6, 0.6, 0.6)
		cs.shape = b
		add_child(cs)
		var bm := BoxMesh.new()
		Props.part(self, bm, Props.mat("#efc79f"), Vector3.ZERO, Vector3.ONE * 0.6)
		for s in [-1.0, 1.0]:
			Props.part(self, bm, Props.mat("#d39c70"), Vector3(0, s * 0.25, 0), Vector3(0.63, 0.09, 0.63))
		Props.part(self, bm, Props.mat("#d39c70"), Vector3.ZERO, Vector3(0.09, 0.63, 0.63))

	func _physics_process(_dt: float) -> void:
		if global_position.y < -30.0:
			global_position = home + Vector3(0, 2, 0)
			linear_velocity = Vector3.ZERO
