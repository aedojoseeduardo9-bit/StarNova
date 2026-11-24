## Star Nova — ayudantes de las escenas (el "ctx"): actores temporales, deshacer, noche cerrada,
## cielo de espacio, bruma lejana, Pip actor (mirar arriba, saltito, esconderse), destellos, temblor y piezas
## de utilería (estrellas con halo, Guardián, sombras, fragmentos, estelas del hiperespacio, arcoíris).
class_name CineCtx

var game
var cine
var temp: Array = []
var undos: Array = []
var always_fns: Array = []
var pip_look_up := 0.0
var pip_hidden := false
var _night_set := false
var _space_set := false
var _fog_set := false
var tint_rect: ColorRect

static var _frag_mat: StandardMaterial3D
static var _star_mats := {}

func _init(g, c) -> void:
	game = g
	cine = c
	undos.append(func():
		pip_look_up = 0.0
		pip_hidden = false
		game.player.model.look_up = 0.0
		game.player.model.visible = true)

# ----------------------------------------------------------------------------------------------- básicos
func add(o: Node3D) -> Node3D:
	game.world.add_child(o)
	temp.append(o)
	return o

func undo(f: Callable) -> void:
	undos.append(f)

func always(f: Callable) -> void:
	always_fns.append(f)

func hide(o: Node3D) -> void:
	if o and is_instance_valid(o) and o.visible:
		o.visible = false
		undos.append(func(): if is_instance_valid(o): o.visible = true)

func night(k: float) -> void:
	if not _night_set:
		_night_set = true
		undos.append(func(): game.sky.deep_night = 0.0)
	game.sky.deep_night = k

func space(k: float) -> void:
	if not _space_set:
		_space_set = true
		undos.append(func(): game.sky.space = 0.0)
	game.sky.space = k

func fog_far(far: float) -> void:
	if not _fog_set:
		_fog_set = true
		var f0: float = game.sky.env.fog_depth_end
		undos.append(func(): game.sky.env.fog_depth_end = f0)
	game.sky.env.fog_depth_end = far

func face_cam(o: Node3D, t: float, speed := 0.5) -> void:
	o.global_basis = Basis(game.cam.global_basis.get_rotation_quaternion()).scaled(o.global_basis.get_scale()) * Basis(Vector3.BACK, t * speed)

func tint(on: bool) -> void:
	if tint_rect == null:
		tint_rect = ColorRect.new()
		tint_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
		tint_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var sh := Shader.new()
		sh.code = "shader_type canvas_item; uniform float k = 0.0; void fragment(){ float d = distance(UV, vec2(0.5)); float a = smoothstep(0.32, 0.75, d) * 0.42; COLOR = vec4(1.0, 0.84, 0.47, a * k); }"
		var m := ShaderMaterial.new()
		m.shader = sh
		tint_rect.material = m
		cine.ui.get_child(0).add_child(tint_rect)
		tint_rect.get_parent().move_child(tint_rect, 0)
		temp.append(tint_rect)
	var mat: ShaderMaterial = tint_rect.material
	var tw := tint_rect.create_tween()
	var cur = mat.get_shader_parameter("k")
	tw.tween_method(func(x): mat.set_shader_parameter("k", x), float(cur) if cur != null else 0.0, 1.0 if on else 0.0, 0.8)

func pip_at(pos: Vector3, yaw: float) -> void:
	var pl: Player = game.player
	var p0 := pl.global_position
	var y0 := pl.yaw
	pl.global_position = pos
	pl.velocity = Vector3.ZERO
	pl.yaw = yaw
	undos.append(func():
		pl.global_position = p0
		pl.yaw = y0)

var _pip_saved := false
func move_pip(pos: Vector3) -> void:
	var pl: Player = game.player
	if not _pip_saved:
		_pip_saved = true
		var p0 := pl.global_position
		var y0 := pl.yaw
		undos.append(func():
			pl.global_position = p0
			pl.yaw = y0)
	pl.global_position = pos

func orbit() -> Dictionary:
	return game.cam.pose(game.player.global_position + Vector3(0, 0.55, 0))

func flash(color: String, dur := 0.6) -> void:
	cine.flash_screen(Color(color), dur)

func shake(k: float) -> void:
	cine.shake_k = maxf(cine.shake_k, k)

func hide_pip() -> void:
	pip_hidden = true

func show_pip() -> void:
	pip_hidden = false

func hop() -> void:
	game.player.model.hop()

func pip_update(dt: float) -> void:
	var pl: Player = game.player
	var m: PipModel = pl.model
	m.look_up = pip_look_up
	m.animate(dt, {"pos": pl.global_position, "yaw": pl.yaw, "speed": 0.0, "grounded": true, "vy": 0.0})
	m.visible = not pip_hidden

func cleanup() -> void:
	for o in temp:
		if is_instance_valid(o):
			o.queue_free()
	undos.reverse()
	for f in undos:
		f.call()
	undos.clear()
	always_fns.clear()

# ----------------------------------------------------------------------------------------------- utilería de escena
static func glow(color: Color, opacity := 0.3) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(color, opacity)
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	m.disable_fog = true
	return m

static func basic(color: Color) -> StandardMaterial3D:
	var k := color.to_html()
	if not _star_mats.has(k):
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.albedo_color = color
		m.disable_fog = true
		_star_mats[k] = m
	return _star_mats[k]

static func frag_mat() -> StandardMaterial3D:
	if _frag_mat == null:
		_frag_mat = Props.mat("#ffe9a0", Color("#c79a30"))
	return _frag_mat

func part(kind: String, mat: Material, pos: Vector3, sc: Vector3) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = Combate.geo(kind)
	mi.material_override = mat
	mi.scale = sc
	add(mi)
	mi.global_position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi

func frag(pos: Vector3, s := 0.2) -> MeshInstance3D:
	return part("oct", frag_mat(), pos, Vector3.ONE * s)

## Malla de estrella (la de la Nova del santuario) con un material propio.
func star_mesh(color: Color) -> Node3D:
	var m := Utileria.star_model()
	var mi := Utileria.first_mesh(m)
	if mi:
		mi.material_override = basic(color)
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add(m)
	return m

## Estrella con halo (las hermanas de Nova): devuelve el grupo; se mueve con position.
func star_actor(color: String, scale := 1.0) -> Node3D:
	var g := Node3D.new()
	add(g)
	var m := Utileria.star_model()
	var mi := Utileria.first_mesh(m)
	if mi:
		mi.material_override = basic(Color(color))
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	m.scale = Vector3.ONE * scale
	g.add_child(m)
	var h := MeshInstance3D.new()
	h.mesh = Combate.geo("ico1")
	h.material_override = glow(Color(color))
	h.scale = Vector3.ONE * scale * 2.2
	h.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	g.add_child(h)
	always(func(_dt, t):
		face_cam(m, t, 0.6)
		h.scale = Vector3.ONE * scale * (2.2 + sin(t * 3.0) * 0.2))
	return g

## Guardián de utilería (el de verdad es un enemigo con físicas).
func prop_guardian(pos: Vector3, yaw: float) -> Node3D:
	var m := Modelos.make("guardian")
	add(m)
	m.global_position = pos
	m.rotation.y = yaw
	var u: Dictionary = m.get_meta("u")
	always(func(_dt, t):
		var orb: Array = u.get("orbiters", [])
		for i in orb.size():
			var a = t * 0.9 + i * PI / 2.0
			orb[i].position = Vector3(cos(a) * 2.6, 1.7 + sin(t * 1.4 + i) * 0.3, sin(a) * 2.6)
			orb[i].rotation = Vector3(t, t * 0.7, 0)
		if u.get("core"):
			u.core.scale = Vector3.ONE * (0.45 + sin(t * 3.0) * 0.05)
		if u.get("halo"):
			u.halo.rotation.z = t * 0.3)
	return m

func sombra(scale: float) -> Node3D:
	var m := Modelos.make("enemigo_sombra")
	m.scale = Vector3.ONE * scale
	add(m)
	return m

## Estelas del hiperespacio alrededor de C, hacia -z. Devuelve un diccionario con "speed".
func warp(C: Vector3, color := Color.WHITE) -> Dictionary:
	var N := 260
	var data := []
	for i in N:
		var a := randf() * TAU
		var r := 2.5 + randf() * 26.0
		data.append(Vector3(cos(a) * r, sin(a) * r, -randf() * 220.0))
	var mi := MeshInstance3D.new()
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = Color(color, 0.85)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.disable_fog = true
	mi.material_override = mat
	mi.extra_cull_margin = 16384.0
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add(mi)
	var W := {"speed": 60.0}
	always(func(dt, _t):
		var length: float = 1.0 + W.speed * 0.05
		var im := ImmediateMesh.new()
		im.surface_begin(Mesh.PRIMITIVE_LINES)
		for i in N:
			var d: Vector3 = data[i]
			d.z += W.speed * dt
			if d.z > 4:
				d.z -= 224.0
			data[i] = d
			im.surface_add_vertex(C + d)
			im.surface_add_vertex(C + d - Vector3(0, 0, length))
		im.surface_end()
		mi.mesh = im)
	return W

## Arcoíris: medio aro de seis colores.
func rainbow(at: Vector3, radius: float, ry := 0.0) -> Node3D:
	var g := Node3D.new()
	var cols := ["#ff7a8a", "#ffb86a", "#ffe08a", "#8adca0", "#8ac8ff", "#b89aff"]
	for i in cols.size():
		var r := radius - i * radius * 0.04
		var w := radius * 0.02
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		var n := 48
		for j in n:
			var a0 := PI * j / n
			var a1 := PI * (j + 1) / n
			var p0 := Vector3(cos(a0) * (r - w), sin(a0) * (r - w), 0)
			var p1 := Vector3(cos(a0) * (r + w), sin(a0) * (r + w), 0)
			var p2 := Vector3(cos(a1) * (r - w), sin(a1) * (r - w), 0)
			var p3 := Vector3(cos(a1) * (r + w), sin(a1) * (r + w), 0)
			for p in [p0, p1, p2, p2, p1, p3]:
				st.add_vertex(p)
		var mi := MeshInstance3D.new()
		mi.mesh = st.commit()
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.albedo_color = Color(Color(cols[i]), 0.75)
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
		m.disable_fog = true
		mi.material_override = m
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		g.add_child(mi)
	add(g)
	g.global_position = at
	g.rotation.y = ry
	return g

func boss_model(id: String) -> Node3D:
	var m := Modelos.make(id)
	add(m)
	return m

func sparkle(p: Vector3, color: String, n := 1, spread := 0.6) -> void:
	Fx.sparkle(game.world, p, Color(color), n, spread)

func emit(p: Vector3, vel: Vector3, color: String, size := 0.3, life := 1.0) -> void:
	Fx.emit(game.world, p, vel, Color(color), size, life)
