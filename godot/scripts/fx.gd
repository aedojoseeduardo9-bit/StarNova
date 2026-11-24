## Star Nova — partículas sencillas (nubecitas, anillos, destellos, estelas): un solo grupo reciclado por mundo.
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

# ------------------------------------------------------------------------------------------------ partículas
## Todas las partículas de un mundo van en UN solo dibujo (MultiMesh) que se recicla. Antes cada destello creaba un
## sistema de partículas nuevo (50-120 vivos a la vez, cada uno un dibujo aparte: mucho lag) y además se congelaban
## durante las escenas animadas (el juego está en pausa mientras se ven), así que las explosiones de las escenas se
## quedaban quietas como una bola de puntitos. Este grupo se mueve en las escenas y solo se detiene con los menús.
class Pool extends MultiMeshInstance3D:
	const MAX := 1200
	var pos := PackedVector3Array()
	var vel := PackedVector3Array()
	var col := PackedColorArray()
	var life := PackedFloat32Array()
	var maxl := PackedFloat32Array()
	var size := PackedFloat32Array()
	var grav := PackedFloat32Array()
	var damp := PackedFloat32Array()
	var buf := PackedFloat32Array()
	var n := 0

	func _init() -> void:
		name = "Particulas"
		process_mode = Node.PROCESS_MODE_ALWAYS
		cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.use_colors = true
		mm.mesh = Fx._particle_mesh()
		mm.instance_count = MAX
		mm.visible_instance_count = 0
		mm.custom_aabb = AABB(Vector3(-4000, -4000, -4000), Vector3(8000, 8000, 8000))
		multimesh = mm
		for arr in [pos, vel]:
			arr.resize(MAX)
		col.resize(MAX)
		for arr in [life, maxl, size, grav, damp]:
			arr.resize(MAX)
		buf.resize(MAX * 16)

	func add(p: Vector3, v: Vector3, c: Color, s: float, l: float, g: float, d: float) -> void:
		var i := n
		if n >= MAX:
			i = randi() % MAX   # lleno: reemplaza una al azar (nunca pasa en juego normal)
		else:
			n += 1
		pos[i] = p
		vel[i] = v
		col[i] = c
		life[i] = 0.0
		maxl[i] = maxf(0.05, l)
		size[i] = s
		grav[i] = g
		damp[i] = d

	func _process(dt: float) -> void:
		var g = Juego.main
		if g and is_instance_valid(g) and g.state in ["menu", "tienda", "galaxia"]:
			return
		var i := 0
		while i < n:
			life[i] += dt
			if life[i] >= maxl[i]:
				var last := n - 1
				pos[i] = pos[last]
				vel[i] = vel[last]
				col[i] = col[last]
				life[i] = life[last]
				maxl[i] = maxl[last]
				size[i] = size[last]
				grav[i] = grav[last]
				damp[i] = damp[last]
				n -= 1
				continue
			var v := vel[i]
			var sp := v.length()
			if sp > 0.0001 and damp[i] > 0.0:
				v *= maxf(0.0, sp - damp[i] * dt) / sp
			v.y += grav[i] * dt
			vel[i] = v
			var p := pos[i] + v * dt
			pos[i] = p
			var s := size[i]
			var c := col[i]
			var o := i * 16
			buf[o] = s
			buf[o + 1] = 0.0
			buf[o + 2] = 0.0
			buf[o + 3] = p.x
			buf[o + 4] = 0.0
			buf[o + 5] = s
			buf[o + 6] = 0.0
			buf[o + 7] = p.y
			buf[o + 8] = 0.0
			buf[o + 9] = 0.0
			buf[o + 10] = s
			buf[o + 11] = p.z
			buf[o + 12] = c.r
			buf[o + 13] = c.g
			buf[o + 14] = c.b
			buf[o + 15] = c.a * (1.0 - life[i] / maxl[i])
			i += 1
		multimesh.buffer = buf
		multimesh.visible_instance_count = n

static var _pools := {}

static func _pool(parent: Node) -> Pool:
	if parent == null or not parent.is_inside_tree():
		return null
	var id := parent.get_instance_id()
	var p = _pools.get(id)
	if p != null and is_instance_valid(p):
		return p
	p = Pool.new()
	parent.add_child(p)
	_pools[id] = p
	return p

static func _dir(flat: float) -> Vector3:
	var d := Vector3(randf() * 2.0 - 1.0, randf() * 2.0 - 1.0, randf() * 2.0 - 1.0)
	d.y *= 1.0 - flat
	return d.normalized() if d.length_squared() > 1e-6 else Vector3.UP

static func _burst(parent: Node, pos: Vector3, color: Color, n: int, speed: float, size: float, life: float, flat := 0.0, grav := -2.0) -> void:
	var pool := _pool(parent)
	if pool == null:
		return
	for i in maxi(1, n):
		pool.add(pos, _dir(flat) * randf_range(speed * 0.5, speed), color, size * randf_range(0.7, 1.3), life, grav, randf_range(1.0, 2.0))

static func puff(parent: Node, pos: Vector3, color := Color.WHITE, n := 8) -> void:
	_burst(parent, pos + Vector3(0, 0.1, 0), color, n, 1.6, 0.14, 0.6)

static func ring(parent: Node, pos: Vector3, color := Color.WHITE, n := 14, speed := 3.0) -> void:
	var pool := _pool(parent)
	if pool == null:
		return
	for i in maxi(1, n):
		var a := randf() * TAU
		pool.add(pos + Vector3(0, 0.1, 0), Vector3(cos(a), 0, sin(a)) * randf_range(speed * 0.5, speed), color, 0.1 * randf_range(0.7, 1.3), 0.5, 0.0, randf_range(1.0, 2.0))

static func burst(parent: Node, pos: Vector3, color: Color, n := 16, speed := 4.0, size := 0.14, life := 0.7) -> void:
	_burst(parent, pos, color, n, speed, size, life)

## Destellos que suben despacito (cristales, luciérnagas, estrellas).
static func sparkle(parent: Node, pos: Vector3, color: Color, n := 1, spread := 0.6) -> void:
	var pool := _pool(parent)
	if pool == null:
		return
	for i in maxi(1, n):
		var off := _dir(0.0) * randf() * spread * 0.5
		pool.add(pos + off, _dir(0.0) * randf_range(0.3, 0.6), color, 0.07 * randf_range(0.7, 1.3), 0.9, 0.6, randf_range(1.0, 2.0))

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

## Una partícula suelta con velocidad: humo, chispas de cohete, estelas.
static func emit(parent: Node, pos: Vector3, vel: Vector3, color: Color, size := 0.2, life := 0.8, grav := 0.0) -> void:
	var pool := _pool(parent)
	if pool:
		pool.add(pos, vel, color, size, life, grav, 0.0)
