## Star Nova — partículas sencillas (nubecitas, anillos, destellos) con CPUParticles3D que se borran solas.
class_name Fx

static var _mesh: SphereMesh

static func _particle_mesh() -> SphereMesh:
	if _mesh == null:
		_mesh = SphereMesh.new()
		_mesh.radius = 0.5
		_mesh.height = 1.0
		_mesh.radial_segments = 6
		_mesh.rings = 3
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.vertex_color_use_as_albedo = true
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		_mesh.material = m
	return _mesh

static func _burst(parent: Node, pos: Vector3, color: Color, n: int, speed: float, size: float, life: float, flat := 0.0, grav := -2.0) -> CPUParticles3D:
	if parent == null or not parent.is_inside_tree():
		return null
	var p := CPUParticles3D.new()
	p.mesh = _particle_mesh()
	p.one_shot = true
	p.explosiveness = 1.0
	p.amount = maxi(1, n)
	p.lifetime = life
	p.direction = Vector3.UP
	p.spread = 180.0
	p.flatness = flat
	p.initial_velocity_min = speed * 0.5
	p.initial_velocity_max = speed
	p.gravity = Vector3(0, grav, 0)
	p.damping_min = 1.0
	p.damping_max = 2.0
	p.scale_amount_min = size * 0.7
	p.scale_amount_max = size * 1.3
	var g := Gradient.new()
	g.set_color(0, color)
	g.set_color(1, Color(color, 0.0))
	p.color_ramp = g
	p.emitting = true
	parent.add_child(p)
	p.global_position = pos
	p.finished.connect(p.queue_free)
	return p

static func puff(parent: Node, pos: Vector3, color := Color.WHITE, n := 8) -> void:
	_burst(parent, pos + Vector3(0, 0.1, 0), color, n, 1.6, 0.14, 0.6)

static func ring(parent: Node, pos: Vector3, color := Color.WHITE, n := 14, speed := 3.0) -> void:
	var p := _burst(parent, pos + Vector3(0, 0.1, 0), color, n, speed, 0.1, 0.5, 1.0, 0.0)
	if p:
		p.direction = Vector3.RIGHT

static func burst(parent: Node, pos: Vector3, color: Color, n := 16, speed := 4.0, size := 0.14, life := 0.7) -> void:
	_burst(parent, pos, color, n, speed, size, life)
