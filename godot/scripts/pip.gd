## Star Nova — Pip, la ardilla diminuta (port de js/entities/pip.js).
## Modelo con "esqueleto" de pivotes y animación procedural: galope, respiración, cola con resorte,
## parpadeo, orejas, voltereta del doble salto, saltito de alegría y aplastarse al caer.
## El modelo mira hacia +z con los pies en y=0, igual que en la web.
class_name PipModel
extends Node3D

static var _ball: SphereMesh
static var _low: SphereMesh
static var _cone: CylinderMesh
static var _torus: TorusMesh
static var _star: ArrayMesh

var M := {}
var body: Node3D
var torso: Node3D
var neck: Node3D
var head: Node3D
var eyes: Array[Node3D] = []
var ears: Array[Node3D] = []
var scarf: Node3D
var scarf_tails: Array[Node3D] = []
var pin: MeshInstance3D
var arms: Array[Node3D] = []
var legs: Array[Node3D] = []
var tail: Array[Node3D] = []

# estado de la animación
var t := 0.0
var phase := 0.0
var blink_t := 2.0
var ear_t := 3.0
var look_t := 4.0
var look_yaw := 0.0
var prev_yaw := 0.0
var turn := 0.0
var tail_swing := 0.0
var tail_vel := 0.0
var flip_t := 0.0
var land_t := 0.0
var hurt_t := 0.0
var hop_t := 0.0
var throw_t := 0.0
var scarf_wave := 0.0
var look_up := 0.0       ## 0..1: Pip mira hacia arriba (para las escenas)
var look_k := 0.0

const TAIL_BASE := [-1.05, -0.55, -0.15, 0.2, 0.42, 0.55, 0.6, 0.55]

static func _geos() -> void:
	if _ball != null:
		return
	_ball = SphereMesh.new()
	_ball.radius = 1.0
	_ball.height = 2.0
	_ball.radial_segments = 20
	_ball.rings = 10
	_low = SphereMesh.new()
	_low.radius = 1.0
	_low.height = 2.0
	_low.radial_segments = 8
	_low.rings = 4
	_cone = CylinderMesh.new()
	_cone.top_radius = 0.0
	_cone.bottom_radius = 1.0
	_cone.height = 1.0
	_cone.radial_segments = 10
	_cone.rings = 1
	_torus = TorusMesh.new()
	_torus.inner_radius = 0.7
	_torus.outer_radius = 1.3
	_torus.rings = 18
	_torus.ring_segments = 8
	_star = _make_star()

static func _make_star() -> ArrayMesh:
	var poly := PackedVector2Array()
	for i in 10:
		var a := TAU * i / 10.0 + PI / 2.0
		var r := 0.45 if i % 2 else 1.0
		poly.append(Vector2(cos(a) * r, sin(a) * r))
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var idx := Geometry2D.triangulate_polygon(poly)
	var z := 0.175
	for i in range(0, idx.size(), 3):
		for k in [0, 2, 1]:
			var p := poly[idx[i + k]]
			st.set_normal(Vector3(0, 0, 1))
			st.add_vertex(Vector3(p.x, p.y, z))
		for k in [0, 1, 2]:
			var p := poly[idx[i + k]]
			st.set_normal(Vector3(0, 0, -1))
			st.add_vertex(Vector3(p.x, p.y, -z))
	for i in poly.size():
		var a := poly[i]
		var b := poly[(i + 1) % poly.size()]
		var n := Vector3(b.y - a.y, a.x - b.x, 0).normalized()
		if Geometry2D.is_polygon_clockwise(poly):
			n = -n
		for v in [Vector3(a.x, a.y, z), Vector3(b.x, b.y, -z), Vector3(b.x, b.y, z), Vector3(a.x, a.y, z), Vector3(a.x, a.y, -z), Vector3(b.x, b.y, -z)]:
			st.set_normal(n)
			st.add_vertex(v)
	return st.commit()

static func pip_mat(color: String, emissive := Color.BLACK) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(color)
	m.roughness = 0.9
	m.metallic_specular = 0.15
	m.diffuse_mode = BaseMaterial3D.DIFFUSE_LAMBERT
	if emissive != Color.BLACK:
		m.emission_enabled = true
		m.emission = emissive
	return m

func _part(parent: Node3D, mesh: Mesh, mat: Material, pos: Vector3, sc: Vector3) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	m.mesh = mesh
	m.material_override = mat
	m.position = pos
	m.scale = sc
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(m)
	return m

func _pivot(parent: Node3D, pos: Vector3) -> Node3D:
	var g := Node3D.new()
	g.rotation_order = EULER_ORDER_XYZ
	g.position = pos
	parent.add_child(g)
	return g

func _init() -> void:
	_geos()
	name = "Pip"
	M = {
		"fur": pip_mat("#cf7a3e"), "fur2": pip_mat("#e59a5c"), "furDark": pip_mat("#a95e2c"), "cream": pip_mat("#fbe6cf"),
		"paw": pip_mat("#8c4e2a"), "eye": pip_mat("#2a1a18"), "white": pip_mat("#ffffff", Color(0.4, 0.4, 0.4)),
		"pink": pip_mat("#f4a7a2"), "nose": pip_mat("#5a2f2a"), "scarf": pip_mat("#6cc9b2"), "scarf2": pip_mat("#4fae98"),
		"gold": pip_mat("#ffd36e", Color(0.48, 0.33, 0.06)), "tailTip": pip_mat("#ffe9d2"),
	}
	(M.gold as StandardMaterial3D).cull_mode = BaseMaterial3D.CULL_DISABLED
	body = _pivot(self, Vector3(0, 0.17, 0))
	torso = _pivot(body, Vector3.ZERO)
	_part(torso, _ball, M.fur, Vector3(0, 0.05, -0.01), Vector3(0.15, 0.14, 0.17))
	_part(torso, _ball, M.cream, Vector3(0, 0.04, 0.105), Vector3(0.1, 0.115, 0.08))
	_part(torso, _ball, M.cream, Vector3(0, 0.13, 0.07), Vector3(0.085, 0.07, 0.07))
	# cabeza grande (proporción tierna)
	neck = _pivot(torso, Vector3(0, 0.17, 0.05))
	head = _pivot(neck, Vector3(0, 0.1, 0.02))
	_part(head, _ball, M.fur, Vector3.ZERO, Vector3(0.155, 0.142, 0.15))
	_part(head, _ball, M.fur2, Vector3(0, 0.07, -0.02), Vector3(0.11, 0.07, 0.11))
	for s in [-1.0, 1.0]:
		_part(head, _ball, M.cream, Vector3(s * 0.075, -0.045, 0.09), Vector3(0.07, 0.06, 0.055))
	_part(head, _ball, M.cream, Vector3(0, -0.035, 0.125), Vector3(0.06, 0.048, 0.05))
	_part(head, _ball, M.nose, Vector3(0, -0.012, 0.172), Vector3(0.022, 0.017, 0.015))
	for s in [-1.0, 1.0]:
		var e := _pivot(head, Vector3(s * 0.07, 0.025, 0.118))
		_part(e, _ball, M.eye, Vector3.ZERO, Vector3(0.032, 0.04, 0.02))
		_part(e, _low, M.white, Vector3(s * -0.009, 0.014, 0.016), Vector3.ONE * 0.011)
		_part(e, _low, M.white, Vector3(s * 0.008, -0.01, 0.017), Vector3.ONE * 0.005)
		e.rotation.y = s * 0.28
		eyes.append(e)
		_part(head, _ball, M.pink, Vector3(s * 0.1, -0.035, 0.105), Vector3(0.026, 0.016, 0.01))
	for s in [-1.0, 1.0]:
		var ear := _pivot(head, Vector3(s * 0.085, 0.11, -0.01))
		ear.rotation.z = -s * 0.22
		_part(ear, _cone, M.fur, Vector3(0, 0.06, 0), Vector3(0.05, 0.13, 0.032))
		_part(ear, _cone, M.pink, Vector3(0, 0.055, 0.014), Vector3(0.03, 0.085, 0.01))
		var tuft := _part(ear, _cone, M.furDark, Vector3(s * 0.006, 0.135, 0), Vector3(0.022, 0.06, 0.016))
		tuft.rotation.z = -s * 0.3
		ears.append(ear)
	# bufanda con dos puntas que ondean y broche de estrella
	scarf = _pivot(torso, Vector3(0, 0.145, 0.03))
	var ring := _part(scarf, _torus, M.scarf, Vector3.ZERO, Vector3.ONE * 0.1)
	ring.rotation.x = PI / 2 + 0.2 - PI / 2   # el toro de Godot ya está acostado (en three.js hay que girarlo)
	var parent: Node3D = scarf
	for i in 2:
		var tt := _pivot(parent, Vector3(0.06, -0.01, -0.07) if i == 0 else Vector3(0, -0.05, 0))
		_part(tt, _ball, M.scarf2 if i else M.scarf, Vector3(0, -0.025, 0), Vector3(0.03, 0.05, 0.012))
		scarf_tails.append(tt)
		parent = tt
	pin = _part(scarf, _star, M.gold, Vector3(0.055, 0.0, 0.1), Vector3.ONE * 0.035)
	# brazos y patas
	for s in [-1.0, 1.0]:
		var a := _pivot(torso, Vector3(s * 0.112, 0.09, 0.06))
		_part(a, _ball, M.fur, Vector3(0, -0.035, 0.01), Vector3(0.026, 0.048, 0.028))
		_part(a, _ball, M.fur2, Vector3(0, -0.078, 0.018), Vector3(0.022, 0.019, 0.022))
		arms.append(a)
	for s in [-1.0, 1.0]:
		var l := _pivot(body, Vector3(s * 0.085, -0.03, -0.04))
		_part(l, _ball, M.fur, Vector3(0, -0.02, 0), Vector3(0.055, 0.065, 0.07))
		_part(l, _ball, M.paw, Vector3(0, -0.11, 0.045), Vector3(0.035, 0.025, 0.06))
		legs.append(l)
	# cola: cadena de 8 segmentos en forma de S
	parent = _pivot(torso, Vector3(0, 0.0, -0.14))
	var sizes := [0.075, 0.095, 0.115, 0.13, 0.135, 0.125, 0.105, 0.075]
	for i in sizes.size():
		var seg := _pivot(parent, Vector3.ZERO if i == 0 else Vector3(0, 0.085, -0.01))
		var r: float = sizes[i]
		var m: Material = M.tailTip if i == sizes.size() - 1 else (M.fur2 if i % 3 == 2 else M.fur)
		_part(seg, _ball, m, Vector3(0, 0.04, 0), Vector3(r, r * 0.95, r * 0.9))
		if i >= 3:
			_part(seg, _ball, M.fur2, Vector3(0, 0.04, r * 0.45), Vector3(r * 0.6, r * 0.6, r * 0.4))
		tail.append(seg)
		parent = seg

func flip() -> void: flip_t = 0.42
func land(strength: float) -> void: land_t = minf(0.22, 0.08 + strength * 0.012)
func hurt() -> void: hurt_t = 0.45
func hop() -> void: hop_t = 0.6
func throw_anim() -> void: throw_t = 0.25

## s: { pos, yaw, speed, grounded, vy, dash, spin }
func animate(dt: float, s: Dictionary) -> void:
	t += dt
	var grounded: bool = s.grounded
	var speed: float = s.speed
	var run := grounded and speed > 0.5
	var run_k: float = minf(1.0, speed / 6.0)
	phase += dt * ((7.0 + speed * 1.6) if run else 0.0)
	var ph := phase
	var yaw: float = s.yaw
	var dyaw := wrapf(yaw - prev_yaw, -PI, PI)
	prev_yaw = yaw
	var turn_rate := dyaw / maxf(dt, 1e-3)
	turn += (turn_rate - turn) * minf(1.0, dt * 8.0)
	var target := clampf(-turn * 0.12, -0.7, 0.7)
	tail_vel += ((target - tail_swing) * 60.0 - tail_vel * 9.0) * dt
	tail_swing += tail_vel * dt

	position = s.pos
	rotation = Vector3(0, yaw, 0)

	var body_y := 0.0
	var pitch := 0.0
	var sx := 1.0
	var sy := 1.0
	if run:
		body_y = absf(sin(ph)) * 0.06 * run_k
		pitch = 0.15 * run_k + sin(ph * 2.0) * 0.1 * run_k
	elif grounded:
		var br := sin(t * 2.4) * 0.015
		sy = 1.0 + br
		sx = 1.0 - br * 0.5
	else:
		pitch = clampf(-s.vy * 0.035, -0.35, 0.4)
		var k := clampf(s.vy * 0.025, -0.12, 0.14)
		sy = 1.0 + k
		sx = 1.0 - k * 0.6
	if land_t > 0:
		land_t -= dt
		var k: float = maxf(0.0, land_t) * 1.8
		sy *= 1.0 - k
		sx *= 1.0 + k * 0.8
		body_y -= k * 0.1
	if hop_t > 0:
		hop_t -= dt
		body_y += sin((1.0 - maxf(0.0, hop_t) / 0.6) * PI) * 0.16
	body.position.y = 0.17 + body_y
	body.scale = Vector3(sx, sy, sx)
	body.rotation.x = pitch
	body.rotation.z = clampf(-turn * 0.04, -0.3, 0.3) * (1.0 if grounded else 0.5)
	if flip_t > 0:
		flip_t -= dt
		body.rotation.x = -(1.0 - maxf(0.0, flip_t) / 0.42) * TAU
	if s.get("dash", 0.0) > 0.0:
		body.rotation.x = s.spin
		body.scale = Vector3(0.85, 0.8, 0.85)
	body.rotation.y = (1.0 - s.get("tail", 0.0) / 0.35) * TAU if s.get("tail", 0.0) > 0.0 else 0.0
	visible = not s.get("blink", false)

	# patas: galope; brazos: correr, saltar o festejar
	var leg := sin(ph) * 1.1 * run_k if run else (0.0 if grounded else -0.5)
	legs[0].rotation.x = leg
	legs[1].rotation.x = leg * (0.85 if run else 1.0)
	var arm := -sin(ph) * 1.0 * run_k if run else (sin(t * 2.4) * 0.05 if grounded else -0.9)
	var arm_l := arm
	var arm_r := arm
	if hop_t > 0:
		arm_l = -2.5
		arm_r = -2.5
	if throw_t > 0:
		throw_t -= dt
		arm_r = -2.4 * sin(maxf(0.0, throw_t) / 0.25 * PI)
	arms[0].rotation.x = arm_l
	arms[1].rotation.x = arm_r
	arms[0].rotation.z = 0.15 if grounded else 0.6
	arms[1].rotation.z = -arms[0].rotation.z

	# cabeza: compensa el galope y mira alrededor en reposo
	look_t -= dt
	if look_t < 0:
		look_t = 2.5 + randf() * 3.0
		look_yaw = 0.0 if run else (randf() - 0.5) * 1.2
	look_k += (look_up - look_k) * minf(1.0, dt * 4.0)
	neck.rotation.y += ((0.0 if (run or look_up > 0) else look_yaw) - neck.rotation.y) * minf(1.0, dt * 3.0)
	neck.rotation.x = -pitch * 0.7 + (0.0 if run else sin(t * 0.9) * 0.05) - look_k * 0.6
	head.rotation.z = sin(t * 0.7) * 0.06 + (sin(t * 40.0) * 0.15 if hurt_t > 0 else 0.0)

	# parpadeo
	blink_t -= dt
	var closed := blink_t < 0.1 or hurt_t > 0.15
	for e in eyes:
		e.scale.y += ((0.12 if closed else 1.0) - e.scale.y) * minf(1.0, dt * 30.0)
	if blink_t < 0:
		blink_t = 2.2 + randf() * 3.5

	# orejas: hacia atrás al correr y temblor de vez en cuando
	ear_t -= dt
	var twitch := sin(t * 60.0) * 0.25 if ear_t < 0.15 else 0.0
	if ear_t < 0:
		ear_t = 2.0 + randf() * 4.0
	for i in ears.size():
		ears[i].rotation.x = -0.5 * run_k - (0.0 if grounded else 0.3) + (twitch if i == 1 else 0.0)

	# cola: forma de S + ola + resorte
	var wave := 0.18 if run else 0.1
	var freq := 9.0 if run else 2.2
	for i in tail.size():
		var base: float = TAIL_BASE[i]
		var streamline := -0.25 * run_k * (1.0 if i < 3 else 0.5) if run else 0.0
		var air := 0.0 if grounded else 0.18
		tail[i].rotation.x = base + streamline + air + sin(t * freq - i * 0.7) * wave * (0.4 + i * 0.12)
		tail[i].rotation.z = tail_swing * (0.3 + i * 0.12) + sin(t * 1.3 - i * 0.5) * 0.05

	# bufanda que ondea
	scarf_wave += dt * (6.0 + speed * 3.0)
	scarf_tails[0].rotation.x = 0.6 + speed * 0.12 + sin(scarf_wave) * 0.15
	scarf_tails[1].rotation.x = 0.3 + sin(scarf_wave - 1.0) * 0.25
	pin.rotation.y = t * 2.0

	if hurt_t > 0:
		hurt_t -= dt
