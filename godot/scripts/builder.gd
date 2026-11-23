## Star Nova — piezas de arquitectura.
## Junta la geometría de una región en UNA malla con colores por vértice y caras planas (aspecto low-poly),
## con "sombreado horneado": las caras laterales toman el color `shade` de la región.
## Las colisiones van a un StaticBody3D (capa 1 = terreno).
class_name Builder
extends RefCounted

static var _mat: StandardMaterial3D

var pal: Dictionary
var _v := PackedVector3Array()
var _n := PackedVector3Array()
var _c := PackedColorArray()
var _shapes: Array = []          # [Shape3D, Transform3D]
var _shade: Color

func _init(palette: Dictionary) -> void:
	pal = palette
	_shade = Color(pal.get("shade", "#c08890"))

static func material() -> StandardMaterial3D:
	if _mat == null:
		_mat = StandardMaterial3D.new()
		_mat.vertex_color_use_as_albedo = true
		_mat.vertex_color_is_srgb = true
		_mat.roughness = 1.0
		_mat.metallic_specular = 0.0
		_mat.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
		_mat.diffuse_mode = BaseMaterial3D.DIFFUSE_LAMBERT
	return _mat

static func col(c) -> Color:
	return c if c is Color else Color(c)

## Transformación: posición + rotación Euler XYZ.
static func xf(x: float, y: float, z: float, rx := 0.0, ry := 0.0, rz := 0.0) -> Transform3D:
	return Transform3D(Basis.from_euler(Vector3(rx, ry, rz), EULER_ORDER_XYZ), Vector3(x, y, z))

# ---------------------------------------------------------------- triángulos
## Agrega un triángulo con su normal "hacia afuera" aproximada (hint). Calcula la normal plana exacta,
## hornea el color (sombra lateral) y ordena los vértices como los quiere Godot.
func tri(a: Vector3, b: Vector3, c: Vector3, color: Color, hint: Vector3) -> void:
	var n := (b - a).cross(c - a)
	if n.length_squared() < 1e-12:
		return
	n = n.normalized()
	if n.dot(hint) < 0.0:
		n = -n
	# Godot: cara frontal = vértices en sentido horario vistos desde fuera
	if (b - a).cross(c - a).dot(n) > 0.0:
		var t := b
		b = c
		c = t
	var k := 0.0
	if n.y > 0.55:
		k = 0.0
	elif n.y < -0.55:
		k = 0.55
	else:
		k = 0.34 + (0.06 if n.x > 0.3 else 0.0)
	var cc := color.lerp(_shade, k)
	_v.append_array([a, b, c])
	_n.append_array([n, n, n])
	_c.append_array([cc, cc, cc])

func quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3, color: Color, hint: Vector3) -> void:
	tri(a, b, c, color, hint)
	tri(a, c, d, color, hint)

# ---------------------------------------------------------------- primitivas (en espacio local, luego t)
## Cilindro/cono centrado en el origen, eje Y, alto h. Devuelve los puntos.
func _cyl_geo(t: Transform3D, r_top: float, r_bot: float, h: float, seg: int, color: Color) -> PackedVector3Array:
	var pts := PackedVector3Array()
	var top := PackedVector3Array()
	var bot := PackedVector3Array()
	for i in seg:
		var th := TAU * float(i) / seg
		var dx := sin(th)
		var dz := cos(th)
		top.append(t * Vector3(dx * r_top, h * 0.5, dz * r_top))
		bot.append(t * Vector3(dx * r_bot, -h * 0.5, dz * r_bot))
	var ct := t * Vector3(0, h * 0.5, 0)
	var cb := t * Vector3(0, -h * 0.5, 0)
	for i in seg:
		var j := (i + 1) % seg
		var mid := (top[i] + top[j] + bot[i] + bot[j]) * 0.25
		var axis := (ct + cb) * 0.5
		var hint := mid - axis
		if r_top > 1e-5:
			quad(bot[i], bot[j], top[j], top[i], color, hint)
		else:
			tri(bot[i], bot[j], ct, color, hint)
		if r_top > 1e-5:
			tri(ct, top[i], top[j], color, ct - cb)
		if r_bot > 1e-5:
			tri(cb, bot[j], bot[i], color, cb - ct)
	pts.append_array(top if r_top > 1e-5 else PackedVector3Array([ct]))
	pts.append_array(bot if r_bot > 1e-5 else PackedVector3Array([cb]))
	return pts

func _box_geo(t: Transform3D, w: float, h: float, d: float, color: Color) -> void:
	var x := w * 0.5
	var y := h * 0.5
	var z := d * 0.5
	var p := [Vector3(-x, -y, -z), Vector3(x, -y, -z), Vector3(x, y, -z), Vector3(-x, y, -z),
		Vector3(-x, -y, z), Vector3(x, -y, z), Vector3(x, y, z), Vector3(-x, y, z)]
	var q: Array = []
	for v in p:
		q.append(t * v)
	var c := t * Vector3.ZERO
	var faces := [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]]
	for f in faces:
		var m: Vector3 = (q[f[0]] + q[f[1]] + q[f[2]] + q[f[3]]) * 0.25
		quad(q[f[0]], q[f[1]], q[f[2]], q[f[3]], color, m - c)

static var _ico_cache := {}
static func _ico(detail: int) -> Array:
	if _ico_cache.has(detail):
		return _ico_cache[detail]
	var g := (1.0 + sqrt(5.0)) / 2.0
	var v := [Vector3(-1, g, 0), Vector3(1, g, 0), Vector3(-1, -g, 0), Vector3(1, -g, 0),
		Vector3(0, -1, g), Vector3(0, 1, g), Vector3(0, -1, -g), Vector3(0, 1, -g),
		Vector3(g, 0, -1), Vector3(g, 0, 1), Vector3(-g, 0, -1), Vector3(-g, 0, 1)]
	var f := [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
		[3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
	var tris: Array = []
	for t in f:
		tris.append([v[t[0]].normalized(), v[t[1]].normalized(), v[t[2]].normalized()])
	for _i in detail:
		var nt: Array = []
		for t in tris:
			var a: Vector3 = t[0]
			var b: Vector3 = t[1]
			var c: Vector3 = t[2]
			var ab := ((a + b) * 0.5).normalized()
			var bc := ((b + c) * 0.5).normalized()
			var ca := ((c + a) * 0.5).normalized()
			nt.append_array([[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]])
		tris = nt
	_ico_cache[detail] = tris
	return tris

func _extrude(t: Transform3D, poly: PackedVector2Array, depth: float, color: Color) -> void:
	var idx := Geometry2D.triangulate_polygon(poly)
	var zf := depth * 0.5
	var nf := t.basis * Vector3(0, 0, 1)
	for i in range(0, idx.size(), 3):
		var a := poly[idx[i]]
		var b := poly[idx[i + 1]]
		var c := poly[idx[i + 2]]
		tri(t * Vector3(a.x, a.y, zf), t * Vector3(b.x, b.y, zf), t * Vector3(c.x, c.y, zf), color, nf)
		tri(t * Vector3(a.x, a.y, -zf), t * Vector3(b.x, b.y, -zf), t * Vector3(c.x, c.y, -zf), color, -nf)
	var cw := Geometry2D.is_polygon_clockwise(poly)
	for i in poly.size():
		var a := poly[i]
		var b := poly[(i + 1) % poly.size()]
		var e := b - a
		var out2 := Vector2(e.y, -e.x) if not cw else Vector2(-e.y, e.x)
		var hint := t.basis * Vector3(out2.x, out2.y, 0)
		quad(t * Vector3(a.x, a.y, zf), t * Vector3(b.x, b.y, zf), t * Vector3(b.x, b.y, -zf), t * Vector3(a.x, a.y, -zf), color, hint)

# ---------------------------------------------------------------- colisiones
func _hull(points: PackedVector3Array) -> void:
	var s := ConvexPolygonShape3D.new()
	s.points = points
	_shapes.append([s, Transform3D.IDENTITY])

func _box_shape(w: float, h: float, d: float, t: Transform3D) -> void:
	var s := BoxShape3D.new()
	s.size = Vector3(w, h, d)
	_shapes.append([s, t])

# ---------------------------------------------------------------- piezas 
## Caja con base en y (x,z centro).
func box(x: float, y: float, z: float, w: float, h: float, d: float, color, o := {}) -> void:
	var ry: float = o.get("ry", 0.0)
	var t := xf(x, y + h * 0.5, z, 0, ry, 0)
	_box_geo(t, w, h, d, col(color))
	if o.get("collide", true):
		_box_shape(w, h, d, t)

## Cilindro con base en y. o: r_top, seg, ry, collide.
func cyl(x: float, y: float, z: float, r: float, h: float, color, o := {}) -> PackedVector3Array:
	var t := xf(x, y + h * 0.5, z, 0, o.get("ry", 0.0), 0)
	var pts := _cyl_geo(t, o.get("r_top", r), r, h, o.get("seg", 8), col(color))
	if o.get("collide", true):
		_hull(pts)
	return pts

func cone(x: float, y: float, z: float, r: float, h: float, color, o := {}) -> void:
	var oo := o.duplicate()
	oo["r_top"] = 0.0
	if not oo.has("collide"):
		oo["collide"] = false
	cyl(x, y, z, r, h, color, oo)

## Cúpula (media esfera) apoyada en y.
func dome(x: float, y: float, z: float, r: float, color, o := {}) -> void:
	var seg: int = o.get("seg", 10)
	var rings := 5
	var c := col(color)
	var center := Vector3(x, y, z)
	var pts := PackedVector3Array()
	var grid: Array = []
	for j in rings + 1:
		var phi := (PI * 0.5) * float(j) / rings
		var row: Array = []
		for i in seg:
			var th := TAU * float(i) / seg
			var p := center + Vector3(sin(th) * cos(phi), sin(phi), cos(th) * cos(phi)) * r
			row.append(p)
			pts.append(p)
		grid.append(row)
	for j in rings:
		for i in seg:
			var k := (i + 1) % seg
			var a: Vector3 = grid[j][i]
			var b: Vector3 = grid[j][k]
			var cc: Vector3 = grid[j + 1][k]
			var d: Vector3 = grid[j + 1][i]
			var m := (a + b + cc + d) * 0.25
			if j == rings - 1:
				tri(a, b, cc, c, m - center)
			else:
				quad(a, b, cc, d, c, m - center)
	if o.get("collide", false):
		_hull(pts)

## Esfera facetada (icosaedro), sin colisión.
func orb(x: float, y: float, z: float, r: float, color, detail := 0) -> void:
	var c := col(color)
	var p := Vector3(x, y, z)
	for t in _ico(detail):
		var a: Vector3 = p + t[0] * r
		var b: Vector3 = p + t[1] * r
		var cc: Vector3 = p + t[2] * r
		tri(a, b, cc, c, (a + b + cc) / 3.0 - p)

## Ventana en arco sobre una cara: (x,y,z) base de la ventana, ry orientación de la cara.
func window(x: float, y: float, z: float, ry: float, w: float, h: float, color) -> void:
	var poly := PackedVector2Array([Vector2(-w / 2, 0), Vector2(w / 2, 0), Vector2(w / 2, h)])
	for i in range(1, 6):
		var a := PI * float(i) / 6.0
		poly.append(Vector2(cos(a) * w / 2, h + sin(a) * w / 2))
	poly.append(Vector2(-w / 2, h))
	_extrude(xf(x, y, z, 0, ry, 0), poly, 0.08, col(color))

## Relleno de arco (enjuta): rectángulo con un semicírculo vaciado abajo. Devuelve su alto.
func spandrel(x: float, y: float, z: float, span: float, depth: float, ry: float, color) -> float:
	var r := span / 2.0
	var top := r + 0.25
	var poly := PackedVector2Array([Vector2(-r, 0), Vector2(-r, top), Vector2(r, top), Vector2(r, 0)])
	for i in range(1, 10):
		var a := PI * float(i) / 10.0
		poly.append(Vector2(cos(a) * r, sin(a) * r))
	var t := xf(x, y, z, 0, ry, 0)
	_extrude(t, poly, depth, col(color))
	# colisión: la parte de arriba del arco (por encima del semicírculo)
	_box_shape(span, 0.25, depth, t * Transform3D(Basis(), Vector3(0, r + 0.125, 0)))
	return top

## Torre cuadrada con ventanas, cornisa y techo ("dome", "cone" o plano).
func tower(x: float, z: float, y: float, w: float, h: float, o := {}) -> float:
	var body = o.get("color", pal.stone)
	box(x, y, z, w, h, w, body)
	var roof: String = o.get("roof", "")
	box(x, y + h - 0.01, z, w + 0.3, 0.28, w + 0.3, o.get("trim", pal.stone2), {"collide": roof == "flat" or roof == ""})
	if o.get("windows", true):
		var rows: int = maxi(1, int(floor((h - 1.2) / 2.2)))
		var half := w / 2.0 + 0.03
		for i in rows:
			var wy := y + 1.0 + i * 2.2
			window(x, wy, z + half, 0, 0.42, 0.6, pal.win)
			window(x + half, wy, z, PI / 2, 0.42, 0.6, pal.win)
			window(x, wy, z - half, 0, 0.42, 0.6, pal.win)
			window(x - half, wy, z, PI / 2, 0.42, 0.6, pal.win)
	var top := y + h + 0.27
	if roof == "dome":
		cyl(x, top, z, w * 0.42, 0.3, pal.stone2, {"seg": 10})
		dome(x, top + 0.3, z, w * 0.42, o.get("roof_color", pal.roof))
		cone(x, top + 0.3 + w * 0.42 - 0.05, z, 0.12, 0.6, pal.accent, {"seg": 6})
		orb(x, top + 0.95 + w * 0.42, z, 0.12, pal.accent)
	elif roof == "cone":
		cone(x, top, z, w * 0.62, w * 1.3, o.get("roof_color", pal.roof), {"seg": 4, "ry": PI / 4})
	return top

## Arco: dos pilares, enjuta curva y dintel. ry orienta el paso.
func arch(x: float, z: float, y: float, span: float, h: float, depth: float, o := {}) -> float:
	var ry: float = o.get("ry", 0.0)
	var c := cos(ry)
	var s := sin(ry)
	var pw: float = o.get("pillar", 0.9)
	var off := span / 2.0 + pw / 2.0
	for sg in [-1.0, 1.0]:
		box(x + c * off * sg, y, z - s * off * sg, pw, h, depth, o.get("color", pal.stone), {"ry": ry})
	var top := spandrel(x, y + h - span / 2.0, z, span, depth, ry, o.get("color", pal.stone))
	var ly := y + h - span / 2.0 + top
	box(x, ly, z, span + pw * 2.0 + 0.3, 0.6, depth + 0.15, o.get("trim", pal.stone2), {"ry": ry})
	return ly + 0.6

func tree(x: float, y: float, z: float, s := 1.0) -> void:
	cyl(x, y, z, 0.13 * s, 1.1 * s, "#b48a72", {"seg": 6})
	orb(x, y + 1.55 * s, z, 0.75 * s, pal.leaf[0])
	orb(x - 0.32 * s, y + 1.85 * s, z + 0.2 * s, 0.5 * s, pal.leaf[1])
	orb(x + 0.35 * s, y + 1.3 * s, z - 0.15 * s, 0.45 * s, pal.leaf[1])

## Isla flotante: losa superior + base rocosa invertida.
func island(x: float, z: float, top: float, r: float, o := {}) -> void:
	var seg: int = o.get("seg", 10)
	var ry: float = o.get("ry", 0.3)
	var slab := _cyl_geo(xf(x, top - 0.7, z, 0, ry, 0), r, r, 1.4, seg, col(o.get("ground", pal.ground)))
	_hull(slab)
	_cyl_geo(xf(x, top - 1.65, z, 0, ry, 0), r * 0.985, r * 0.92, 0.5, seg, col(pal.stone2))
	_cyl_geo(xf(x, top - 1.9 - r * 0.4, z, 0, ry, 0), r * 0.92, r * 0.16, r * 0.8, seg, col(pal.rock))
	var n: int = maxi(3, int(round(r / 3.0)))
	for i in n:
		var a := TAU * float(i) / n + 0.4
		var rr := r * 0.55
		_cyl_geo(xf(x + cos(a) * rr, top - 2.2 - r * 0.3, z + sin(a) * rr), r * 0.12, 0.0, r * 0.45, 5, col(pal.rock))

## Pasarela recta entre dos puntos (a la misma altura), con pretiles y pilares.
func walkway(x0: float, z0: float, x1: float, z1: float, y: float, w: float, o := {}) -> void:
	var dx := x1 - x0
	var dz := z1 - z0
	var length := sqrt(dx * dx + dz * dz)
	var ry := atan2(-dz, dx)
	var cx := (x0 + x1) / 2.0
	var cz := (z0 + z1) / 2.0
	box(cx, y - 0.5, cz, length, 0.5, w, pal.stone, {"ry": ry})
	box(cx, y - 0.9, cz, length, 0.4, w - 0.4, pal.stone2, {"ry": ry, "collide": false})
	var px := sin(ry)
	var pz := cos(ry)
	if o.get("rails", true):
		for sg in [-1.0, 1.0]:
			box(cx + px * sg * (w / 2 - 0.12), y, cz + pz * sg * (w / 2 - 0.12), length, 0.42, 0.24, pal.stone2, {"ry": ry})
	var n_p := int(floor(length / 7.0))
	for i in range(1, n_p + 1):
		var t := float(i) / (n_p + 1)
		cyl(x0 + dx * t, y - 9.5, z0 + dz * t, 0.45, 8.6, pal.stone2, {"seg": 8, "collide": false})
		cyl(x0 + dx * t, y - 12.5, z0 + dz * t, 0.0, 3.0, pal.rock, {"r_top": 0.45, "seg": 8, "collide": false})

## Une todo en una malla y crea el cuerpo estático con las colisiones.
func finish(parent: Node3D, name := "Region") -> MeshInstance3D:
	if _v.is_empty():
		return null
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = _v
	arr[Mesh.ARRAY_NORMAL] = _n
	arr[Mesh.ARRAY_COLOR] = _c
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	m.surface_set_material(0, material())
	var mi := MeshInstance3D.new()
	mi.name = name
	mi.mesh = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(mi)
	if not _shapes.is_empty():
		var body := StaticBody3D.new()
		body.name = name + "Cuerpo"
		body.collision_layer = 1
		body.collision_mask = 0
		for s in _shapes:
			var cs := CollisionShape3D.new()
			cs.shape = s[0]
			cs.transform = s[1]
			body.add_child(cs)
		parent.add_child(body)
	_v = PackedVector3Array()
	_n = PackedVector3Array()
	_c = PackedColorArray()
	_shapes = []
	return mi
