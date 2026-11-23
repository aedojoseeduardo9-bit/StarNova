## Star Nova — modelos 3D (data/modelos.json): enemigos, jefes, PNJ, lechuza, cohete,
## cofres, campanas, cristales, portón, estrella y piezas de los trajes. Se reconstruyen con su geometría exacta
## (caras planas) y se devuelven con sus partes con nombre (meta "u") para animarlas.
class_name Modelos

static var _data: Dictionary
static var _meshes := {}      # geo uuid + flat -> ArrayMesh
static var _mats := {}        # material id -> Material

static func data() -> Dictionary:
	if _data.is_empty():
		_data = Datos.load_json("res://data/modelos.json")
	return _data

static func has(id: String) -> bool:
	return data().models.has(id)

static func _mesh(gid: String, flat: bool) -> ArrayMesh:
	var key := gid + ("f" if flat else "s")
	if _meshes.has(key):
		return _meshes[key]
	var g: Dictionary = data().geos[gid]
	var p: Array = g.p
	var n: Array = g.n
	var verts := PackedVector3Array()
	var norms := PackedVector3Array()
	var count := p.size() / 3
	verts.resize(count)
	norms.resize(count)
	# los datos vienen en sentido antihorario y Godot usa horario: se invierte cada triángulo
	for t in range(0, count, 3):
		for k in 3:
			var src: int = t + [0, 2, 1][k]
			verts[t + k] = Vector3(p[src * 3], p[src * 3 + 1], p[src * 3 + 2])
			norms[t + k] = Vector3(n[src * 3], n[src * 3 + 1], n[src * 3 + 2])
		if flat:
			var a := verts[t]
			var b := verts[t + 1]
			var c := verts[t + 2]
			var fn := (c - a).cross(b - a)
			if fn.length_squared() > 1e-14:
				fn = fn.normalized()
				var sm := norms[t] + norms[t + 1] + norms[t + 2]
				if fn.dot(sm) < 0.0:
					fn = -fn
				norms[t] = fn
				norms[t + 1] = fn
				norms[t + 2] = fn
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_NORMAL] = norms
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	_meshes[key] = m
	return m

static func material(mid: String) -> Material:
	if _mats.has(mid):
		return _mats[mid]
	var d: Dictionary = data().mats[mid]
	var m := StandardMaterial3D.new()
	m.albedo_color = Color("#" + d.c)
	m.roughness = 1.0
	m.metallic_specular = 0.0
	m.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	m.diffuse_mode = BaseMaterial3D.DIFFUSE_LAMBERT
	if d.b:
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	var e := Color("#" + d.e)
	if e != Color.BLACK and not d.b:
		m.emission_enabled = true
		m.emission = e
		m.emission_energy_multiplier = float(d.ei)
	if d.tr or float(d.o) < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.albedo_color.a = float(d.o)
		if not d.dw:
			m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	if d.add:
		m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	if d.ds:
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
	if not d.fog:
		m.disable_fog = true
	_mats[mid] = m
	return m

static func _build(n: Dictionary) -> Node3D:
	var o: Node3D
	if n.has("g"):
		var mi := MeshInstance3D.new()
		var md: Dictionary = data().mats[n.m]
		mi.mesh = _mesh(n.g, bool(md.f))
		mi.material_override = material(n.m)
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if n.has("ns") or md.b else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		o = mi
	else:
		o = Node3D.new()
	o.rotation_order = EULER_ORDER_XYZ
	o.position = Vector3(n.p[0], n.p[1], n.p[2])
	o.quaternion = Quaternion(n.q[0], n.q[1], n.q[2], n.q[3])
	o.scale = Vector3(n.s[0], n.s[1], n.s[2])
	if n.has("v"):
		o.visible = false
	if n.has("c"):
		for ch in n.c:
			o.add_child(_build(ch))
	return o

static func _at(root: Node, path: Array) -> Node3D:
	var x: Node = root
	for i in path:
		if x == null or int(i) >= x.get_child_count():
			return null
		x = x.get_child(int(i))
	return x as Node3D

## Construye un modelo. Sus partes con nombre quedan en root.get_meta("u") (Node3D, Array de Node3D o valores).
static func make(id: String) -> Node3D:
	var md: Dictionary = data().models[id]
	var root := _build(md.tree)
	var u := {}
	for k in md.user:
		var v = md.user[k]
		if v is Dictionary and v.has("ref"):
			u[k] = _at(root, v.ref)
		elif v is Dictionary and v.has("refs"):
			var arr: Array = []
			for pth in v.refs:
				arr.append(_at(root, pth))
			u[k] = arr
		else:
			u[k] = v
	root.set_meta("u", u)
	return root

## Una pieza suelta (por ejemplo, una pieza de traje).
static func make_node(n: Dictionary) -> Node3D:
	return _build(n)
