## Star Nova — carga un mundo (data/mundo_<id>.json + .bin): mallas de arquitectura y terreno
## (colores por vértice, caras planas), colisiones fijas exactas y los puntos del mapa (spots). También crea las
## piezas animadas de los planetas: agua, cascada, metal líquido con ondas, Impulsores Cometa y gelatinas.
class_name Mundo

static var _mat: StandardMaterial3D

static func world_material() -> StandardMaterial3D:
	if _mat == null:
		_mat = StandardMaterial3D.new()
		_mat.vertex_color_use_as_albedo = true
		_mat.vertex_color_is_srgb = false        # los colores de vértice están guardados en espacio lineal
		_mat.roughness = 1.0
		_mat.metallic_specular = 0.0
		_mat.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
		_mat.diffuse_mode = BaseMaterial3D.DIFFUSE_LAMBERT
	return _mat

static func _f32(bin: PackedByteArray, ref: Dictionary) -> PackedFloat32Array:
	var off := int(ref.off)
	return bin.slice(off, off + int(ref.n) * 4).to_float32_array()

static func _u32(bin: PackedByteArray, ref: Dictionary) -> PackedInt32Array:
	var off := int(ref.off)
	return bin.slice(off, off + int(ref.n) * 4).to_int32_array()

static func _v3(a) -> Vector3:
	return Vector3(float(a[0]), float(a[1]), float(a[2]))

## Arma el mundo dentro de root y devuelve los spots (con "extras": nodos animados creados aquí).
## La arquitectura tiene dos versiones: la sencilla (data/mundo_<id>.bin) y la HD (data/mundo_<id>_hd.*, la arma
## tools/hd_mundo.py desde la receta del mundo: más polígonos, detalles y pasto). set_quality() elige cuál se ve.
static func build(game: Node, root: Node3D, id: String) -> Dictionary:
	var d: Dictionary = Datos.load_json("res://data/mundo_%s.json" % id)
	var bin := FileAccess.get_file_as_bytes("res://data/mundo_%s.bin" % id)
	var info := {"id": id, "d": d, "bin": bin, "hd": {}, "base": null, "hd_node": null, "fixed": null}
	if FileAccess.file_exists("res://data/mundo_%s_hd.json" % id):
		info.hd = Datos.load_json("res://data/mundo_%s_hd.json" % id)
	var replace := {}
	for i in info.hd.get("replace", []):
		replace[int(i)] = true
	info.replace = replace
	# mallas que no tienen versión HD (terreno de Verdalia): siempre
	var fixed := Node3D.new()
	fixed.name = "Terreno"
	root.add_child(fixed)
	for i in d.meshes.size():
		if not replace.has(i):
			fixed.add_child(_mesh(bin, d.meshes[i]))
	root.set_meta("mundo", info)
	set_quality(root, Juego.quality())
	# colisiones fijas
	var body := StaticBody3D.new()
	body.name = "Suelo"
	body.collision_layer = 1
	body.collision_mask = 0
	root.add_child(body)
	for col in d.colliders:
		var shape: Shape3D
		if col.has("box"):
			var b := BoxShape3D.new()
			b.size = _v3(col.box) * 2.0
			shape = b
		elif col.has("hull"):
			var h := ConvexPolygonShape3D.new()
			var f := _f32(bin, col.hull)
			var pts := PackedVector3Array()
			for i in range(0, f.size(), 3):
				pts.append(Vector3(f[i], f[i + 1], f[i + 2]))
			h.points = pts
			shape = h
		elif col.has("tri"):
			var tm := ConcavePolygonShape3D.new()
			var f := _f32(bin, col.tri)
			var idx := _u32(bin, col.idx)
			var faces := PackedVector3Array()
			faces.resize(idx.size())
			for i in idx.size():
				var k := idx[i]
				faces[i] = Vector3(f[k * 3], f[k * 3 + 1], f[k * 3 + 2])
			tm.set_faces(faces)
			tm.backface_collision = true
			shape = tm
		elif col.has("cyl"):
			var cy := CylinderShape3D.new()
			cy.height = float(col.cyl[0]) * 2.0
			cy.radius = float(col.cyl[1])
			shape = cy
		elif col.has("ball"):
			var sp := SphereShape3D.new()
			sp.radius = float(col.ball)
			shape = sp
		else:
			continue
		var cs := CollisionShape3D.new()
		cs.shape = shape
		cs.transform = Transform3D(Basis(Quaternion(col.r[0], col.r[1], col.r[2], col.r[3])), _v3(col.t))
		body.add_child(cs)
	# piezas animadas
	var spots: Dictionary = d.spots
	var extras: Array = []
	for x in spots.get("extras", []):
		var node: Node3D = null
		match x.type:
			"Water": node = Agua.new(x, _f32(bin, x.mesh))
			"Waterfall": node = Cascada.new(x)
			"LiquidFloor": node = MetalLiquido.new(x)
			"Launcher": node = Impulsor.new(game, x)
			"Bouncer": node = Gelatina.new(game, x)
		if node:
			root.add_child(node)
			extras.append(node)
	spots["extras_nodos"] = extras
	return spots


## Una malla de la versión sencilla: caras planas, colores por vértice (lineales).
static func _mesh(bin: PackedByteArray, m: Dictionary) -> MeshInstance3D:
	var p := _f32(bin, m.p)
	var c := _f32(bin, m.c)
	var count := p.size() / 3
	var verts := PackedVector3Array()
	var norms := PackedVector3Array()
	var cols := PackedColorArray()
	verts.resize(count)
	norms.resize(count)
	cols.resize(count)
	for t in range(0, count, 3):
		var a := Vector3(p[t * 3], p[t * 3 + 1], p[t * 3 + 2])
		var b := Vector3(p[t * 3 + 3], p[t * 3 + 4], p[t * 3 + 5])
		var cc := Vector3(p[t * 3 + 6], p[t * 3 + 7], p[t * 3 + 8])
		var n := (b - a).cross(cc - a)
		n = n.normalized() if n.length_squared() > 1e-14 else Vector3.UP
		# los datos vienen en sentido antihorario → Godot: horario
		verts[t] = a
		verts[t + 1] = cc
		verts[t + 2] = b
		norms[t] = n
		norms[t + 1] = n
		norms[t + 2] = n
		for k in 3:
			var src: int = t + [0, 2, 1][k]
			cols[t + k] = Color(c[src * 3], c[src * 3 + 1], c[src * 3 + 2])
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_NORMAL] = norms
	arr[Mesh.ARRAY_COLOR] = cols
	var am := ArrayMesh.new()
	am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	am.surface_set_material(0, world_material())
	var mi := MeshInstance3D.new()
	mi.mesh = am
	mi.name = "Arquitectura"
	return mi

static func _var(bin: PackedByteArray, ref: Array):
	return bytes_to_var(bin.slice(int(ref[0]), int(ref[0]) + int(ref[1])))

## Elige la arquitectura que se ve: "baja" = la sencilla; "media" y "alta" = la HD con pasto
## (en media el pasto es la mitad y se ve hasta más cerca). Arma cada versión la primera vez que hace falta.
static func set_quality(root: Node3D, q: String) -> void:
	if not root.has_meta("mundo"):
		return
	var info: Dictionary = root.get_meta("mundo")
	var hd_ok: bool = not info.hd.is_empty() and q != "baja"
	if hd_ok and info.hd_node == null:
		info.hd_node = _build_hd(info)
		root.add_child(info.hd_node)
	if info.base == null:
		var base := Node3D.new()
		base.name = "ArquitecturaSencilla"
		for i in info.d.meshes.size():
			if info.replace.has(i):
				base.add_child(_mesh(info.bin, info.d.meshes[i]))
		root.add_child(base)
		info.base = base
	# con HD, la versión sencilla sigue ahí pero solo para las sombras (mucho más barato)
	for mi in info.base.get_children():
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_SHADOWS_ONLY if hd_ok else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	if info.hd_node:
		info.hd_node.visible = hd_ok
		if hd_ok:
			Pasto.calidad(info.hd_node.get_node_or_null("Pasto"), q)

static func _build_hd(info: Dictionary) -> Node3D:
	var node := Node3D.new()
	node.name = "ArquitecturaHD"
	var bin := FileAccess.get_file_as_bytes("res://data/mundo_%s_hd.bin" % info.id)
	for m in info.hd.meshes:
		var arr := []
		arr.resize(Mesh.ARRAY_MAX)
		arr[Mesh.ARRAY_VERTEX] = _var(bin, m.v)
		arr[Mesh.ARRAY_NORMAL] = _var(bin, m.n)
		arr[Mesh.ARRAY_COLOR] = _var(bin, m.c)
		arr[Mesh.ARRAY_INDEX] = _var(bin, m.i)
		var am := ArrayMesh.new()
		am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
		am.surface_set_material(0, world_material())
		var mi := MeshInstance3D.new()
		mi.mesh = am
		mi.name = "Arquitectura"
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		node.add_child(mi)
	if not info.hd.get("grass", []).is_empty():
		node.add_child(Pasto.new(info.hd.grass, bin))
	return node


# ======================================================================== pasto
## Matas de pasto (MultiMesh por cuadros de 24 m; solo se dibujan los cercanos). Se mecen con el viento.
class Pasto extends Node3D:
	const SH := """
shader_type spatial;
render_mode diffuse_lambert, specular_disabled, cull_disabled;
varying float h;
void vertex() {
	h = clamp(VERTEX.y / 0.3, 0.0, 1.0);
	vec3 wp = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
	float w = sin(TIME * 1.6 + wp.x * 0.31 + wp.z * 0.23) * 0.6 + sin(TIME * 2.7 + wp.x * 0.9 - wp.z * 0.7) * 0.25;
	vec3 off = vec3(w * 0.07, 0.0, w * 0.045) * h * h;
	VERTEX += inverse(mat3(MODEL_MATRIX)) * off;
	NORMAL = vec3(0.0, 1.0, 0.0);
}
void fragment() {
	ALBEDO = COLOR.rgb * mix(0.78, 1.1, h);
	NORMAL = (VIEW_MATRIX * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
}
"""
	static var _mesh_cache: ArrayMesh
	static var _mat_cache: ShaderMaterial
	var chunks: Array = []

	static func tuft() -> ArrayMesh:
		if _mesh_cache:
			return _mesh_cache
		var v := PackedVector3Array()
		var rnd := RandomNumberGenerator.new()
		rnd.seed = 11
		for i in 7:
			var a := TAU * i / 7.0 + rnd.randf_range(-0.3, 0.3)
			var dir := Vector3(cos(a), 0, sin(a))
			var side := Vector3(-dir.z, 0, dir.x)
			var hgt := rnd.randf_range(0.17, 0.3)
			var lean := rnd.randf_range(0.05, 0.12)
			var base := dir * rnd.randf_range(0.0, 0.08)
			var wdt := rnd.randf_range(0.022, 0.032)
			var p0 := base - side * wdt
			var p1 := base + side * wdt
			var mid := base + dir * lean * 0.45 + Vector3(0, hgt * 0.55, 0)
			var m0 := mid - side * wdt * 0.7
			var m1 := mid + side * wdt * 0.7
			var tip := base + dir * lean + Vector3(0, hgt, 0)
			v.append_array([p0, m0, p1, p1, m0, m1, m0, tip, m1])
		var n := PackedVector3Array()
		n.resize(v.size())
		n.fill(Vector3.UP)
		var arr := []
		arr.resize(Mesh.ARRAY_MAX)
		arr[Mesh.ARRAY_VERTEX] = v
		arr[Mesh.ARRAY_NORMAL] = n
		_mesh_cache = ArrayMesh.new()
		_mesh_cache.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
		_mat_cache = ShaderMaterial.new()
		var s := Shader.new()
		s.code = SH
		_mat_cache.shader = s
		_mesh_cache.surface_set_material(0, _mat_cache)
		return _mesh_cache

	func _init(list: Array, bin: PackedByteArray) -> void:
		name = "Pasto"
		var mesh := tuft()
		for c in list:
			var mm := MultiMesh.new()
			mm.transform_format = MultiMesh.TRANSFORM_3D
			mm.use_colors = true
			mm.mesh = mesh
			mm.instance_count = int(c.count)
			mm.buffer = Mundo._var(bin, c.buf)
			var mi := MultiMeshInstance3D.new()
			mi.multimesh = mm
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			mi.visibility_range_end = 60.0
			add_child(mi)
			chunks.append(mi)

	static func calidad(p, q: String) -> void:
		if p == null:
			return
		for mi in p.chunks:
			var mm: MultiMesh = mi.multimesh
			mm.visible_instance_count = -1 if q == "alta" else mm.instance_count / 2
			mi.visibility_range_end = 62.0 if q == "alta" else 40.0


# ======================================================================== agua (lago y río)
class Agua extends MeshInstance3D:
	const SH := """
shader_type spatial;
render_mode diffuse_lambert, specular_disabled, cull_disabled, depth_draw_opaque;
uniform vec3 c1 : source_color;
uniform vec3 c2 : source_color;
varying vec3 wp;
void vertex() { wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
	float w = sin(wp.x * 0.9 + TIME * 1.3) * sin(wp.z * 0.8 - TIME * 1.1) + sin((wp.x + wp.z) * 0.35 + TIME * 0.7);
	ALBEDO = mix(c1, c2, smoothstep(0.9, 1.6, w) * 0.65);
	EMISSION = c2 * 0.25;
	ALPHA = 0.82;
}
"""
	var o: Dictionary

	## Agua honda: Pip no sabe nadar .
	func is_inside(p: Vector3) -> bool:
		var level := float(o.get("level", 0.0))
		if p.y >= level - 0.3:
			return false
		if o.get("shape", "") == "disc":
			return Vector2(p.x - float(o.x), p.z - float(o.z)).length() < float(o.r) - 0.8
		if p.z < float(o.get("z0", -1e9)) or p.z > float(o.get("z1", 1e9)):
			return false
		var cx := 64.0 + sin(p.z * 0.05) * 4.0 + sin(p.z * 0.013) * 3.0
		return absf(p.x - cx) < float(o.get("w", 10.5)) / 2.0 - 1.15

	func _init(oo: Dictionary, pos: PackedFloat32Array) -> void:
		o = oo
		name = "Agua"
		var verts := PackedVector3Array()
		for i in range(0, pos.size(), 9):
			verts.append(Vector3(pos[i], pos[i + 1], pos[i + 2]))
			verts.append(Vector3(pos[i + 6], pos[i + 7], pos[i + 8]))
			verts.append(Vector3(pos[i + 3], pos[i + 4], pos[i + 5]))
		var arr := []
		arr.resize(Mesh.ARRAY_MAX)
		arr[Mesh.ARRAY_VERTEX] = verts
		var norms := PackedVector3Array()
		norms.resize(verts.size())
		norms.fill(Vector3.UP)
		arr[Mesh.ARRAY_NORMAL] = norms
		var am := ArrayMesh.new()
		am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
		mesh = am
		var m := ShaderMaterial.new()
		var s := Shader.new()
		s.code = SH
		m.shader = s
		m.set_shader_parameter("c1", Color(o.get("color", "#6ac0d8")))
		m.set_shader_parameter("c2", Color(o.get("color2", "#d8f4ff")))
		material_override = m
		cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF


# ======================================================================== cascada
class Cascada extends MeshInstance3D:
	const SH := """
shader_type spatial;
render_mode unshaded, cull_disabled;
void fragment() {
	float s = sin(UV.x * 40.0 + sin(UV.y * 6.0) * 2.0) * 0.5 + 0.5;
	float f = fract(UV.y * 3.0 - TIME * 1.6 + s * 0.3);
	ALBEDO = mix(vec3(0.55, 0.82, 0.95), vec3(1.0), smoothstep(0.55, 1.0, f) * 0.8 + s * 0.15);
	ALPHA = 0.75 * (0.65 + s * 0.3);
}
"""
	var o: Dictionary
	var _t := 0.0
	func _init(x: Dictionary) -> void:
		name = "Cascada"
		o = x
		var h: float = float(o.top) - float(o.bottom)
		var z0: float = float(o.get("z0", o.get("z", 0.0)))
		var z1: float = float(o.get("z1", o.get("z", 0.0)))
		var length := Vector2(h, z0 - z1).length()
		var pm := PlaneMesh.new()
		pm.size = Vector2(float(o.w), length)
		pm.orientation = PlaneMesh.FACE_Z
		mesh = pm
		position = Vector3(float(o.x), float(o.bottom) + h / 2.0, (z0 + z1) / 2.0)
		rotation.x = -atan2(z0 - z1, h)
		var m := ShaderMaterial.new()
		var s := Shader.new()
		s.code = SH
		m.shader = s
		material_override = m
		cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		o["z"] = z0
	func _process(dt: float) -> void:
		_t += dt
		if randf() < 0.5:
			Fx.puff(get_parent(), Vector3(float(o.x) + (randf() - 0.5) * float(o.w), float(o.bottom) + 0.2, float(o.z) + 0.8), Color("#f4fcff"), 2)


# ======================================================================== metal líquido (Prismara)
class MetalLiquido extends MeshInstance3D:
	const SH := """
shader_type spatial;
render_mode diffuse_lambert, specular_disabled;
uniform vec4 rip[10];
uniform float t_now;
varying vec3 wp;
void vertex() { wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
	vec2 p = wp.xz;
	float hue = fract(p.x * 0.012 + p.y * 0.009 + t_now * 0.04);
	vec3 rb = 0.55 + 0.45 * cos(6.2831 * (hue + vec3(0.0, 0.33, 0.67)));
	float g = 0.0;
	for (int i = 0; i < 10; i++) {
		vec4 r = rip[i];
		float age = t_now - r.z;
		if (age > 0.0 && age < 2.6) {
			float d = distance(p, r.xy);
			float w = d - age * 3.4;
			g += r.w * exp(-w * w * 5.0) * (1.0 - age / 2.6);
		}
	}
	float sheen = 0.5 + 0.5 * sin(p.x * 0.55 + t_now * 1.4) * sin(p.y * 0.45 - t_now * 1.1);
	vec3 metal = mix(vec3(0.82, 0.85, 0.95), rb, 0.42) + sheen * 0.1;
	ALBEDO = metal + g * (rb * 0.7 + 0.25);
	EMISSION = rb * (0.08 + g * 0.55);
}
"""
	static var _mat: ShaderMaterial
	static var ripples: Array = []
	static var _ri := 0
	static var now := 0.0
	var o: Dictionary
	var step_t := 0.0
	var was := true
	var center: Vector3
	var r: float

	static func shared_mat() -> ShaderMaterial:
		if _mat == null:
			_mat = ShaderMaterial.new()
			var s := Shader.new()
			s.code = SH
			_mat.shader = s
			for i in 10:
				ripples.append(Vector4(0, 0, -99, 0))
		return _mat

	static func ripple(x: float, z: float, k := 1.0) -> void:
		ripples[_ri % 10] = Vector4(x, z, now, k)
		_ri += 1

	func _init(x: Dictionary) -> void:
		name = "MetalLiquido"
		o = x
		r = float(o.r)
		center = Vector3(float(o.x), float(o.y), float(o.z))
		var cm := CylinderMesh.new()
		cm.top_radius = r
		cm.bottom_radius = r
		cm.height = 0.01
		cm.radial_segments = 48
		cm.rings = 1
		mesh = cm
		position = center + Vector3(0, 0.035, 0)
		material_override = shared_mat()
		cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	func _process(dt: float) -> void:
		now = Time.get_ticks_msec() * 0.001
		_mat.set_shader_parameter("t_now", now)
		_mat.set_shader_parameter("rip", ripples)
		var g = Juego.main
		if g == null or g.player == null:
			return
		var pl: Player = g.player
		var p := pl.global_position
		var on := Vector2(p.x - center.x, p.z - center.z).length() < r and absf(p.y - center.y) < 0.6
		if not on:
			was = false
			return
		var sp := Vector2(pl.velocity.x, pl.velocity.z).length()
		step_t -= dt
		if pl.grounded and not was:
			ripple(p.x, p.z, 1.6)
			Sfx.play("bell", 1320)
		elif pl.grounded and sp > 1.0 and step_t <= 0:
			step_t = 0.26
			ripple(p.x, p.z, 0.8)
		was = pl.grounded


# ======================================================================== Impulsor Cometa (estrella que lanza a Pip)
class Impulsor extends Node3D:
	var game: Node
	var p: Vector3
	var to: Vector3
	var h: float
	var dur: float
	var label: String
	var btn: String
	var star: MeshInstance3D
	var t := 0.0
	func _init(g: Node, x: Dictionary) -> void:
		name = "Impulsor"
		game = g
		p = Mundo._v3(x.from)
		to = Mundo._v3(x.to)
		h = float(x.get("h", 7.0))
		dur = float(x.get("dur", 1.5))
		label = str(x.get("label", "Impulsarse con la estrella"))
		btn = str(x.get("btn", "Impulsar"))
		position = p
		star = MeshInstance3D.new()
		star.mesh = PipModel._star if PipModel._star else null
		if star.mesh == null:
			PipModel._geos()
			star.mesh = PipModel._star
		star.material_override = Props.mat("#ffe08a", Color("#a07a10"))
		star.scale = Vector3.ONE * 0.9
		star.rotation.x = -PI / 2
		star.position.y = 0.15
		add_child(star)
		var ring := MeshInstance3D.new()
		var tm := TorusMesh.new()
		tm.inner_radius = 1.0 - 0.32
		tm.outer_radius = 1.0 + 0.32
		ring.mesh = tm
		ring.material_override = Props.mat("#ffffff", Color("#8070c0"))
		ring.scale = Vector3(1.15, 0.2, 1.15)
		ring.position.y = 0.2
		add_child(ring)
	func can_use(pp: Vector3) -> bool:
		return game.player.flight.is_empty() and Vector2(pp.x - p.x, pp.z - p.z).length() < 1.4 and absf(pp.y - p.y) < 1.2
	func use() -> void:
		game.player.launch(to, h, dur)
		Sfx.play("special")
		Fx.burst(game.world, p + Vector3(0, 0.5, 0), Color("#ffe08a"), 30, 5)
	func _process(dt: float) -> void:
		t += dt
		star.rotation.z = t * 2.0
		star.position.y = 0.15 + sin(t * 3.0) * 0.05


# ======================================================================== gelatina trampolín
class Gelatina extends Node3D:
	var game: Node
	var p: Vector3
	var k: float
	var squash := 0.0
	var blob: MeshInstance3D
	func _init(g: Node, x: Dictionary) -> void:
		name = "Gelatina"
		game = g
		p = Mundo._v3(x.pos)
		k = float(x.get("power", 17.0))
		position = p
		blob = MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 1.0
		sm.height = 2.0
		sm.radial_segments = 12
		sm.rings = 6
		blob.mesh = sm
		blob.material_override = Props.mat(str(x.get("color", "#9adcff")), Color("#204060"))
		blob.position.y = 0.25
		blob.scale = Vector3(1.0, 0.45, 1.0)
		add_child(blob)
		var body := StaticBody3D.new()
		body.collision_layer = 1
		var cs := CollisionShape3D.new()
		var cy := CylinderShape3D.new()
		cy.height = 0.5
		cy.radius = 1.0
		cs.shape = cy
		cs.position.y = 0.25
		body.add_child(cs)
		add_child(body)
	func _physics_process(dt: float) -> void:
		var pl: Player = game.player
		if pl == null:
			return
		var pp := pl.global_position
		if pl.grounded and Vector2(pp.x - p.x, pp.z - p.z).length() < 1.0 and pp.y > p.y + 0.3 and pp.y < p.y + 0.9:
			pl.velocity.y = k
			pl.grounded = false
			pl.boost = 0.9
			pl.air_jumps = pl.max_air_jumps
			squash = 1.0
			Sfx.play("jump")
			Fx.ring(game.world, p + Vector3(0, 0.5, 0), Color("#cfefff"), 14, 3)
		squash = maxf(0.0, squash - dt * 4.0)
		blob.scale = Vector3(1.0 + squash * 0.3, 0.45 * (1.0 - squash * 0.5), 1.0 + squash * 0.3)
