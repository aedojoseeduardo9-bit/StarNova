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

## Destellos que suben despacito (cristales, luciérnagas, estrellas).
static func sparkle(parent: Node, pos: Vector3, color: Color, n := 1, spread := 0.6) -> void:
	var p := _burst(parent, pos, color, n, 0.6, 0.07, 0.9, 0.0, 0.6)
	if p:
		p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
		p.emission_sphere_radius = spread * 0.5

## Rayo en zigzag entre dos puntos (cadena eléctrica, tormenta, curación de los sanadores).
static var _bolt_mats := {}
static func bolt(parent: Node, a: Vector3, b: Vector3, color: Color, life := 0.18) -> void:
	if parent == null or not parent.is_inside_tree():
		return
	var im := ImmediateMesh.new()
	im.surface_begin(Mesh.PRIMITIVE_LINE_STRIP)
	var n := 6
	for i in n + 1:
		var k := float(i) / n
		var p := a.lerp(b, k)
		if i > 0 and i < n:
			p += Vector3(randf() - 0.5, randf() - 0.5, randf() - 0.5) * 0.35
		im.surface_add_vertex(p)
	im.surface_end()
	var mi := MeshInstance3D.new()
	mi.mesh = im
	var key := color.to_html()
	if not _bolt_mats.has(key):
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.albedo_color = color
		_bolt_mats[key] = m
	mi.material_override = _bolt_mats[key]
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	parent.get_tree().create_timer(life).timeout.connect(mi.queue_free)

## Línea de aviso (francotirador apuntando). Con parent == null se quita la de ese dueño.
static var _warn := {}
static func warn_line(owner: Object, parent: Node, from: Vector3, to: Vector3) -> void:
	var mi: MeshInstance3D = _warn.get(owner)
	if parent == null:
		if mi and is_instance_valid(mi):
			mi.queue_free()
		_warn.erase(owner)
		return
	if mi == null or not is_instance_valid(mi):
		mi = MeshInstance3D.new()
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.albedo_color = Color(1.0, 0.45, 0.55, 0.7)
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mi.material_override = m
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(mi)
		_warn[owner] = mi
	var im := ImmediateMesh.new()
	im.surface_begin(Mesh.PRIMITIVE_LINES)
	im.surface_add_vertex(from)
	im.surface_add_vertex(to)
	im.surface_end()
	mi.mesh = im

## Una partícula suelta con velocidad (como fx.emit de la web): humo, chispas de cohete, estelas.
static func emit(parent: Node, pos: Vector3, vel: Vector3, color: Color, size := 0.2, life := 0.8, grav := 0.0) -> void:
	var p := _burst(parent, pos, color, 1, vel.length(), size, life, 0.0, grav)
	if p:
		p.direction = vel.normalized() if vel.length_squared() > 1e-6 else Vector3.UP
		p.spread = 8.0
		p.initial_velocity_min = vel.length()
		p.initial_velocity_max = vel.length()
