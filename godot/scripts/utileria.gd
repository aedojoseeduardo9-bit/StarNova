## Star Nova — objetos del mundo con física y lógica de misiones:
## campanas colgantes, cristales, luciérnagas/semillas/notas, cofres, puente de tablones, portón, farolillos,
## hoguera, lechuza, estrella del santuario, PNJ y el Cohete Avellana. Los modelos salen de data/modelos.json.
class_name Utileria

const ALL := 1 | 2 | 4 | 16 | 128

## La estrella (modelo "estrella") con su centro en el origen. En el modelo original la malla está 1,4 m más arriba
## (para posarse sobre el pedestal) y entonces, al girar o crecer, la estrella daba vueltas fuera de su aura y de
## sus chispas. Así gira y crece sobre su propio centro.
static func star_model() -> Node3D:
	var m := Modelos.make("estrella")
	var mi := first_mesh(m)
	if mi and mi.mesh:
		mi.position = -(mi.basis * mi.mesh.get_aabb().get_center())
	return m

static func first_mesh(n: Node) -> MeshInstance3D:
	if n is MeshInstance3D:
		return n
	for c in n.get_children():
		var r := first_mesh(c)
		if r:
			return r
	return null

static func _own_mat(n: Node) -> StandardMaterial3D:
	var mi := first_mesh(n)
	if mi == null or not mi.material_override is StandardMaterial3D:
		return StandardMaterial3D.new()
	var m: StandardMaterial3D = (mi.material_override as StandardMaterial3D).duplicate()
	mi.material_override = m
	return m

static func _v3(a) -> Vector3:
	return Vector3(float(a[0]), float(a[1]), float(a[2]))

static func _pos(spot) -> Vector3:
	return _v3(spot) if spot is Array else _v3(spot.pos)


# ======================================================================== campana colgante
class Bell extends RigidBody3D:
	var game
	var kind := "bell"
	var index: int
	var freq: int
	var region: String
	var anchor: Vector3
	var model: Node3D
	var bell_mat: StandardMaterial3D
	var colors: Array
	var rung := false
	var cool := 0.0
	var glow := 0.0
	const L := 0.75

	func _init(g, spot: Dictionary, i: int) -> void:
		game = g
		index = i
		freq = int(spot.freq)
		region = str(spot.region)
		anchor = Utileria._v3(spot.anchor)
		colors = spot.get("colors", ["#c9a26a", "#ffd36e"])
		position = anchor - Vector3(0, L, 0)
		collision_layer = 4
		collision_mask = Utileria.ALL
		mass = 0.27
		angular_damp = 0.25
		linear_damp = 0.1
		contact_monitor = true
		max_contacts_reported = 2
		var cs := CollisionShape3D.new()
		var cy := CylinderShape3D.new()
		cy.radius = 0.3
		cy.height = 0.48
		cs.shape = cy
		cs.position.y = 0.12
		add_child(cs)
		model = Modelos.make("campana")
		var u: Dictionary = model.get_meta("u")
		bell_mat = Utileria._own_mat(u.bell)
		bell_mat.emission_enabled = true
		model.position = Vector3.ZERO
		add_child(model)
		body_entered.connect(func(b):
			if b is Player or b is Combate.Shot: ring())

	func _ready() -> void:
		var j := PinJoint3D.new()
		game.world.add_child(j)
		j.global_position = anchor
		j.node_a = j.get_path_to(self)

	func ring(_strength := 1.0) -> void:
		if cool > 0:
			return
		cool = 0.35
		Sfx.play("bell", freq)
		glow = 1.0
		Fx.ring(game.world, global_position, Color("#ffe7a0"), 18, 4)
		if not rung:
			rung = true
			game.missions.event("bell", self)

	func on_hit(proj) -> void:
		ring()
		apply_central_impulse(Vector3(proj.linear_velocity.x, 0, proj.linear_velocity.z) * 0.05 * proj.mass / 0.02)

	func push(dir: Vector3, f: float) -> void:
		apply_central_impulse(Vector3(dir.x * f, 0.2 * f, dir.z * f) * 0.5)
		ring()

	func _physics_process(dt: float) -> void:
		cool -= dt
		glow = maxf(0.0, glow - dt)
		var av := angular_velocity
		if Vector2(av.x, av.z).length() > 3.2:
			ring()
		var pl: Vector3 = game.player.center()
		if pl.distance_to(global_position) < 0.75:
			push(Vector3(global_position.x - pl.x, 0, global_position.z - pl.z).normalized(), 0.6)
		var gold := 1.0 if rung else 0.0
		bell_mat.albedo_color = Color(colors[1] if rung else colors[0])
		bell_mat.emission = Color(0.5 * glow + 0.12 * gold, 0.38 * glow + 0.08 * gold, 0.1 * glow)


# ======================================================================== cristal
class Crystal extends StaticBody3D:
	var game
	var kind := "crystal"
	var index: int
	var p: Vector3
	var mesh: Node3D
	var mat: StandardMaterial3D
	var colors: Array
	var active := false

	func _init(g, spot: Dictionary, i: int) -> void:
		process_mode = Node.PROCESS_MODE_ALWAYS   # se anima también durante las escenas (solo es visual)
		game = g
		index = i
		p = Utileria._v3(spot.pos)
		position = p
		colors = spot.get("colors", ["#cfc3f2", "#fff3c4"])
		collision_layer = 4
		collision_mask = 0
		var cs := CollisionShape3D.new()
		var sp := SphereShape3D.new()
		sp.radius = 0.45
		cs.shape = sp
		add_child(cs)
		var m := Modelos.make("cristal")
		var u: Dictionary = m.get_meta("u")
		mesh = m
		mesh.position = Vector3.ZERO
		mat = Utileria._own_mat(u.crystal)
		mat.albedo_color = Color(colors[0], mat.albedo_color.a)
		add_child(mesh)

	func on_hit(_proj) -> void:
		activate()

	func push(_d, _f) -> void:
		activate()

	func activate(silent := false) -> void:
		if active:
			return
		active = true
		if not silent:
			Sfx.play("crystal")
			Fx.burst(game.world, p, Color("#e8dcff"), 30, 5, 0.18, 1.0)
			game.missions.event("crystal", self)

	func _process(dt: float) -> void:
		mesh.rotation.y += dt * (2.5 if active else 0.6)
		mesh.position.y = sin(game.anim_t * 1.6 + index) * 0.1
		if active:
			mat.albedo_color = Color(colors[1], mat.albedo_color.a)
			mat.emission_enabled = true
			mat.emission = Color(0.55, 0.45, 0.25)
			if randf() < 0.3 * dt * 60:
				Fx.sparkle(game.world, p, Color("#fff2c0"), 1, 0.8)


# ======================================================================== luciérnaga / semilla / nota
class Firefly extends Node3D:
	var game
	var index: int
	var p: Vector3
	var color: Color
	var taken := false
	var wings: Array = []

	func _init(g, spot: Dictionary, i: int) -> void:
		process_mode = Node.PROCESS_MODE_ALWAYS   # se anima también durante las escenas (solo es visual)
		game = g
		index = i
		p = Utileria._v3(spot.pos)
		color = Color(str(spot.get("color", "#f6ffb0")))
		var m := Modelos.make("semilla" if spot.get("kind", "") == "semilla" else "luciernaga")
		m.position = Vector3.ZERO
		add_child(m)
		var root: Node3D = m
		if root.get_child_count() >= 4:
			for k in 2:
				var mi := root.get_child(k) as MeshInstance3D
				if mi:
					var mm := Utileria._own_mat(mi)
					mm.albedo_color = Color(color, mm.albedo_color.a)
					if k == 0:
						mm.emission = color * 0.6
			wings = [root.get_child(2), root.get_child(3)]
		position = p

	func _process(_dt: float) -> void:
		if taken:
			return
		var t: float = game.anim_t
		position = p + Vector3(sin(t * 1.3 + index) * 0.3, sin(t * 2.1 + index) * 0.2, cos(t * 1.1 + index) * 0.3)
		if wings.size() == 2:
			wings[0].rotation.z = sin(t * 30.0) * 0.6
			wings[1].rotation.z = -sin(t * 30.0) * 0.6
		if randf() < 0.15:
			Fx.sparkle(game.world, global_position, color, 1, 0.4)

	func _physics_process(_dt: float) -> void:
		if taken or game.state != "play":
			return
		if game.player.center().distance_to(global_position) < 0.85:
			take()

	func take(silent := false) -> void:
		taken = true
		visible = false
		if not silent:
			Sfx.play("firefly")
			Fx.burst(game.world, global_position, color, 24, 3, 0.16, 1.0)
			game.missions.event("firefly", self)


# ======================================================================== cofre
class Chest extends StaticBody3D:
	var game
	var kind := "chest"
	var p: Vector3
	var region: String
	var ry: float
	var def: Dictionary
	var model: Node3D
	var lid: Node3D
	var ring: Node3D
	var halo: Node3D
	var opened := false
	var lid_t := 0.0
	var respawn_t := 0.0

	func _init(g, spot: Dictionary) -> void:
		game = g
		p = Utileria._v3(spot.pos)
		region = str(spot.get("region", ""))
		ry = float(spot.get("ry", randf() * TAU))
		position = p
		rotation.y = ry
		collision_layer = 4
		collision_mask = 0
		var cs := CollisionShape3D.new()
		var b := BoxShape3D.new()
		b.size = Vector3(0.8, 0.6, 0.6)
		cs.shape = b
		cs.position.y = 0.3
		add_child(cs)
		set_type(str(spot.get("type", Datos.roll_chest(game.progress(), game.stats.luck if game.stats else 0.0))))

	func set_type(id: String) -> void:
		if model:
			model.queue_free()
		def = Datos.chests[id]
		opened = false
		lid_t = 0.0
		respawn_t = 0.0
		model = Modelos.make("cofre_" + id)
		Modelos.merge(model, "cofre_" + id)
		var u: Dictionary = model.get_meta("u")
		lid = u.get("lid")
		ring = u.get("ring")
		halo = u.get("halo")
		model.position = Vector3.ZERO
		model.rotation = Vector3.ZERO
		model.scale = Vector3.ONE * (1.0 + int(def.rank) * 0.07)
		add_child(model)
		game.see("chest", id)

	func cost() -> int:
		return 0 if def.rule == "blood" else game.chest_cost(float(def.cost))

	func label() -> String:
		var price := "25% de vida" if def.rule == "blood" else str(cost()) + " chispas"
		return "%s (%s) · %s" % [def.name, Datos.ranks[int(def.rank)], price]

	func open() -> void:
		opened = true
		respawn_t = 70.0 + randf() * 40.0
		Sfx.play("chest")
		Fx.burst(game.world, p + Vector3(0, 0.5, 0), Color(str(def.look.gem)), 26 + int(def.rank) * 8, 4 + int(def.rank))
		game.open_chest_loot(self)

	func _physics_process(dt: float) -> void:
		var t: float = game.time
		if opened:
			if lid_t < 1 and lid:
				lid_t = minf(1.0, lid_t + dt * 3.0)
				lid.rotation.x = -lid_t * 1.9
			respawn_t -= dt
			if respawn_t <= 0:
				set_type(Datos.roll_chest(game.progress(), game.stats.luck))
				Fx.burst(game.world, p + Vector3(0, 0.4, 0), Color(str(def.look.gem)), 30, 3)
				if int(def.rank) >= 3:
					Hud.toast("Apareció un %s (%s)" % [def.name, Datos.ranks[int(def.rank)]])
			return
		if ring:
			ring.rotation.z = t
			ring.position.y = 0.75 + sin(t * 2.0) * 0.05
		if halo:
			halo.scale = Vector3.ONE * (0.75 + sin(t * 2.5) * 0.05)
		if int(def.rank) >= 2 and randf() < 0.05 * int(def.rank):
			Fx.sparkle(game.world, p + Vector3(0, 0.5, 0), Color(str(def.look.gem)), 1, 0.9)


# ======================================================================== puente de tablones
class PlankBridge extends Node3D:
	var game
	var spot: Dictionary
	var built := false
	var planks: Array = []
	var t := 0.0

	func _init(g, s: Dictionary) -> void:
		game = g
		spot = s
		name = "Puente"

	func build(silent := false) -> void:
		if built:
			return
		built = true
		var a := Utileria._v3(spot.from)
		var b := Utileria._v3(spot.to)
		var length := a.distance_to(b)
		var n := maxi(1, roundi(length / 0.9))
		var seg := length / n
		var dir := (b - a).normalized()
		var side := dir.cross(Vector3.UP).normalized()
		var hw: float = float(spot.width) / 2.0
		var pc: Array = spot.get("colors", ["#d7b38a", "#e2c29c", "#8d79c4"])
		var bm := BoxMesh.new()
		var prev: RigidBody3D = null
		var yaw := atan2(-dir.z, dir.x)
		for i in n:
			var c := a + dir * seg * (i + 0.5)
			var body := RigidBody3D.new()
			body.collision_layer = 4
			body.collision_mask = Utileria.ALL
			body.mass = 0.4
			body.linear_damp = 0.6
			body.angular_damp = 1.2
			var pm := PhysicsMaterial.new()
			pm.friction = 1.0
			body.physics_material_override = pm
			var cs := CollisionShape3D.new()
			var bx := BoxShape3D.new()
			bx.size = Vector3(seg * 0.92, 0.16, hw * 2.0)
			cs.shape = bx
			body.add_child(cs)
			var col: String
			if spot.get("rainbow", false):
				col = Color.from_hsv(float(i) / n, 0.45, 1.0).to_html(false)
			else:
				col = pc[1] if i % 2 else pc[0]
			var vis := Node3D.new()
			body.add_child(vis)
			Props.part(vis, bm, Props.mat(col, Color(col) * 0.25 if spot.get("rainbow", false) else Color.BLACK), Vector3.ZERO, Vector3(seg * 0.92, 0.16, hw * 2.0))
			for s in [-1.0, 1.0]:
				Props.part(vis, bm, Props.mat(pc[2]), Vector3(0, 0.11, s * (hw - 0.05)), Vector3(seg, 0.05, 0.05))
			vis.scale = Vector3.ONE * 0.001
			body.position = c - Vector3(0, 0.09, 0)
			body.rotation.y = yaw
			add_child(body)
			planks.append({"body": body, "mesh": vis, "delay": i * 0.06})
			# bisagra: dos pernos en los bordes (como una bisagra a lo ancho)
			var joint_at := a + dir * seg * i - Vector3(0, 0.09, 0)
			for s in [-1.0, 1.0]:
				var j := PinJoint3D.new()
				add_child(j)
				j.global_position = joint_at + side * s * hw * 0.8
				j.node_a = j.get_path_to(body)
				if prev:
					j.node_b = j.get_path_to(prev)
			prev = body
		for s in [-1.0, 1.0]:
			var j := PinJoint3D.new()
			add_child(j)
			j.global_position = b - Vector3(0, 0.09, 0) + side * s * hw * 0.8
			j.node_a = j.get_path_to(prev)
		if silent:
			t = 10.0
		else:
			Sfx.play("rumble")

	func _process(dt: float) -> void:
		if not built:
			return
		t += dt
		for pk in planks:
			var k := clampf((t - pk.delay) / 0.35, 0.0, 1.0)
			pk.mesh.scale = Vector3.ONE * maxf(0.001, k)
			if k < 1 and randf() < 0.4:
				Fx.sparkle(game.world, pk.body.global_position, Color("#e8dcff"), 1, 1.5)


# ======================================================================== portón del santuario
class Gate extends AnimatableBody3D:
	var game
	var spot: Dictionary
	var base: Vector3
	var model: Node3D
	var sockets: Array = []
	var open := false
	var y := 0.0

	func _init(g, s: Dictionary) -> void:
		game = g
		spot = s
		name = "Porton"
		base = Utileria._v3(s.pos)
		position = base + Vector3(0, float(s.h) / 2.0, 0)
		collision_layer = 64
		collision_mask = 0
		sync_to_physics = true
		var cs := CollisionShape3D.new()
		var bx := BoxShape3D.new()
		bx.size = Vector3(float(s.w), float(s.h), float(s.d))
		cs.shape = bx
		add_child(cs)
		model = Modelos.make("porton")
		model.position = Vector3.ZERO
		add_child(model)
		var holder: Node = model
		while holder.get_child_count() == 1:
			holder = holder.get_child(0)
		var kids := holder.get_children()
		if s.has("colors") and kids.size() >= 2:
			for k in 2:
				var mm := Utileria._own_mat(kids[k])
				mm.albedo_color = Color(s.colors[k])
		for k in [2, 3, 4]:
			if k < kids.size():
				var mm := Utileria._own_mat(kids[k])
				mm.emission_enabled = true
				mm.emission = Color.BLACK
				sockets.append(mm)

	func set_lights(n: int) -> void:
		for i in sockets.size():
			var on := i < n
			sockets[i].albedo_color = Color("#ffe39a") if on else Color("#4a4f8c")
			sockets[i].emission = Color(0.6, 0.45, 0.15) if on else Color.BLACK

	func open_gate() -> void:
		if open:
			return
		open = true
		Sfx.play("rumble")

	func snap_open() -> void:
		open = true
		y = -float(spot.h) - 0.3
		global_position = base + Vector3(0, float(spot.h) / 2.0 + y, 0)

	func _physics_process(dt: float) -> void:
		var h := float(spot.h)
		if open and y > -h - 0.3:
			y = maxf(-h - 0.3, y - dt * 1.4)
			global_position = base + Vector3(0, h / 2.0 + y, 0)
			game.cam.shake = maxf(game.cam.shake, 0.08)
			if randf() < 0.5:
				Fx.puff(game.world, base + Vector3((randf() - 0.5) * 3, 0, -0.6), Color("#d6d9f4"), 2)


# ======================================================================== farolillo en cadena
class Lantern extends Node3D:
	var game
	var links: Array = []
	var anchor: Vector3
	var n: int
	const L := 0.3

	func _init(g, spot: Dictionary) -> void:
		game = g
		anchor = Utileria._v3(spot.anchor)
		n = int(spot.get("len", 3))

	func _ready() -> void:
		var prev: RigidBody3D = null
		var cyl := CylinderMesh.new()
		cyl.top_radius = 1.0
		cyl.bottom_radius = 1.0
		cyl.height = 1.0
		cyl.radial_segments = 6
		for i in n:
			var lamp := i == n - 1
			var body := RigidBody3D.new()
			body.collision_layer = 4
			body.collision_mask = 16 | 128
			body.mass = 0.1 if lamp else 0.02
			body.angular_damp = 0.5
			body.linear_damp = 0.2
			var cs := CollisionShape3D.new()
			if lamp:
				var bx := BoxShape3D.new()
				bx.size = Vector3(0.32, 0.4, 0.32)
				cs.shape = bx
			else:
				var sp := SphereShape3D.new()
				sp.radius = 0.04
				cs.shape = sp
			body.add_child(cs)
			body.position = anchor - Vector3(0, L * (i + 1) + (0.1 if lamp else 0.0), 0)
			if lamp:
				Props.part(body, cyl, Props.mat("#f2c46c"), Vector3(0, 0.17, 0), Vector3(0.12, 0.06, 0.12))
				Props.part(body, cyl, Props.mat("#fff3c8", Color("#d0a040")), Vector3.ZERO, Vector3(0.14, 0.3, 0.14))
				Combate.part(body, "cone5", Props.mat("#ee9a8b"), Vector3(0, 0.27, 0), Vector3(0.18, 0.16, 0.18))
				var gl := Combate.part(body, "ico1", Combate.glow_cached(Color("#ffe7a8"), 0.18), Vector3.ZERO, Vector3.ONE * 0.5)
				gl.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			else:
				Props.part(body, cyl, Props.mat("#7d6a5a"), Vector3.ZERO, Vector3(0.02, L, 0.02))
			game.world.add_child(body)
			var j := PinJoint3D.new()
			game.world.add_child(j)
			j.global_position = anchor - Vector3(0, L * i, 0)
			j.node_a = j.get_path_to(body)
			if prev:
				j.node_b = j.get_path_to(prev)
			links.append(body)
			prev = body

	func on_hit(proj) -> void:
		links[-1].apply_central_impulse(Vector3(proj.linear_velocity.x, 0, proj.linear_velocity.z) * 0.002)

	func push(dir: Vector3, f: float) -> void:
		links[-1].apply_central_impulse(Vector3(dir.x, 0, dir.z) * f * 0.03)

	func pos() -> Vector3:
		return links[-1].global_position if links.size() else anchor


# ======================================================================== hoguera (cura y es punto de regreso)
const CAMP_LOOKS := {
	"fuego": {"stone": "#e6d6cc", "log": "#a97d62", "flames": [["#ffb26b", "#c05010"], ["#ffd780", "#d09020"], ["#fff3c8", "#e0c060"]], "light": "#ffb070", "spark": "#ffcf80"},
	"savia": {"stone": "#b8d8a0", "log": "#7a5a3a", "flames": [["#8adca0", "#2a8a50"], ["#c8f0a0", "#5aa040"], ["#f4ffe0", "#90c070"]], "light": "#a8f0b0", "spark": "#c8ffb8"},
	"faro": {"stone": "#d8d8f0", "log": "#9a9ab8", "flames": [["#ff9ad8", "#a03080"], ["#9adcff", "#2070a0"], ["#ffffff", "#b0b0e0"]], "light": "#d8b8ff", "spark": "#ffd8ff"},
}


# ======================================================================== la Abuela Lechuza
class Owl extends Node3D:
	var game
	var p: Vector3
	var model: Node3D
	var u: Dictionary
	var blink := 2.0

	func _init(g, pos: Vector3) -> void:
		process_mode = Node.PROCESS_MODE_ALWAYS   # se anima también durante las escenas (solo es visual)
		game = g
		p = pos
		model = Modelos.make("lechuza")
		Modelos.merge(model, "lechuza")
		u = model.get_meta("u")
		model.position = Vector3.ZERO
		model.scale = Vector3.ONE * 0.85
		add_child(model)
		position = p

	func _process(dt: float) -> void:
		var pl: Vector3 = game.player.global_position
		var yaw := atan2(pl.x - p.x, pl.z - p.z)
		rotation.y += wrapf(yaw - rotation.y, -PI, PI) * minf(1.0, dt * 3.0)
		if u.get("head"):
			u.head.rotation.z = sin(game.anim_t * 0.8) * 0.12
		blink -= dt
		var closed := blink < 0.12
		for e in u.get("eyes", []):
			if e:
				e.scale.y = 0.008 if closed else 0.05
		if blink < 0:
			blink = 2.0 + randf() * 3.0


# ======================================================================== estrella del santuario
class NovaStar extends Node3D:
	var game
	var p: Vector3
	var lit0: Color
	var star: Node3D
	var star2: Node3D
	var mat: StandardMaterial3D
	var mat2: StandardMaterial3D
	var twin = null
	var awake := 0.0
	var lit := 0.0

	func _init(g, spot) -> void:
		process_mode = Node.PROCESS_MODE_ALWAYS   # se anima también durante las escenas (solo es visual)
		game = g
		p = Utileria._pos(spot)
		lit0 = Color(str(spot.get("color", "#fff0b0"))) if spot is Dictionary else Color("#fff0b0")
		star = _make()
		mat = _mat_of(star)
		if spot is Dictionary and spot.has("twin"):
			twin = Color(str(spot.twin))
			star2 = _make()
			mat2 = _mat_of(star2)

	func _make() -> Node3D:
		var m := Utileria.star_model()
		add_child(m)
		return m

	func _mat_of(m: Node3D) -> StandardMaterial3D:
		var mi: MeshInstance3D = m.get_meta("u").get("star")
		if mi == null:
			mi = m as MeshInstance3D
		var mm := Utileria._own_mat(mi)
		mm.emission_enabled = true
		return mm

	func set_lit(k: float) -> void:
		lit = k

	func wake() -> void:
		awake = 0.001

	func _process(dt: float) -> void:
		var t: float = game.anim_t
		var l := maxf(lit, 1.0 if awake > 0 else 0.0)
		mat.albedo_color = lit0 if l > 0.5 else Color("#8e94d6")
		mat.emission = Color(0.1 + l * 0.7, 0.1 + l * 0.55, 0.15 + l * 0.2) * 0.6
		star.rotation.y = t * (0.4 + minf(4.0, awake) * 0.3)
		# el centro de la estrella flota a 2,8 m sobre el pedestal (antes: raíz a 1,4 m + malla 1,4 m más arriba)
		var y := 2.8
		if awake > 0:
			awake += dt
			y = 2.8 + minf(14.0, awake * awake * 1.4)
			star.scale = Vector3.ONE * (1.0 + minf(2.0, awake * 0.3))
			if randf() < 0.8:
				Fx.sparkle(game.world, star.global_position, Color("#fff2b8"), 2, 2.5)
		else:
			y = 2.8 + sin(t) * 0.15
		star.global_position = p + Vector3(0, y, 0)
		if star2:
			mat2.albedo_color = twin if l > 0.5 else Color("#8e94d6")
			mat2.emission = mat.emission
			var r := 1.6 * star.scale.x
			star2.global_position = Vector3(p.x + cos(t * 0.8) * r, star.global_position.y + sin(t * 1.3) * 0.3, p.z + sin(t * 0.8) * r)
			star2.scale = star.scale
			star.global_position.x = p.x - cos(t * 0.8) * r
			star.global_position.z = p.z - sin(t * 0.8) * r
			star2.rotation.y = -t * 0.6


# ======================================================================== PNJ
class NPC extends StaticBody3D:
	var game
	var id: String
	var def: Dictionary
	var p: Vector3
	var model: Node3D
	var u: Dictionary
	var mark: MeshInstance3D
	var base_yaw: float
	var t0: float

	func _init(g, spot: Dictionary) -> void:
		process_mode = Node.PROCESS_MODE_ALWAYS   # se anima también durante las escenas (solo es visual)
		game = g
		id = str(spot.id)
		def = Datos.pnj[id]
		p = Utileria._v3(spot.pos)
		position = p
		base_yaw = float(spot.get("ry", 0.0))
		collision_layer = 4
		collision_mask = 0
		var cs := CollisionShape3D.new()
		var cy := CylinderShape3D.new()
		cy.radius = 0.35
		cy.height = 1.0
		cs.shape = cy
		cs.position.y = 0.5
		add_child(cs)
		model = Modelos.make("pnj_" + id)
		Modelos.merge(model, "pnj_" + id)
		u = model.get_meta("u")
		model.position = Vector3.ZERO
		model.rotation = Vector3(0, base_yaw, 0)
		model.scale = Vector3.ONE * float(spot.get("scale", 1.15))
		add_child(model)
		var shop: bool = def.get("shop", false) == true
		mark = Combate.part(self, "oct", Props.mat("#ffd36e" if shop else "#bfe6ff", Color("#8a6010") if shop else Color("#305070")), Vector3(0, 1.9, 0), Vector3(0.12, 0.2, 0.12))
		mark.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		t0 = randf() * 10.0

	## Frases según el avance de la partida.
	func lines() -> Array:
		var L: Dictionary = def.lines
		return L[game.story_state()]

	func _process(dt: float) -> void:
		var pl: Vector3 = game.player.global_position
		var near := pl.distance_to(p) < 6
		var want := atan2(pl.x - p.x, pl.z - p.z) if near else base_yaw
		model.rotation.y += wrapf(want - model.rotation.y, -PI, PI) * minf(1.0, dt * 3.0)
		var tt: float = game.anim_t + t0
		model.position.y = (0.25 + sin(tt * 2.0) * 0.12) if u.get("float", false) else absf(sin(tt * 1.6)) * 0.02
		if u.get("head"):
			u.head.rotation.z = sin(tt * 0.9) * 0.08
		var arms = u.get("arms")
		if arms is Array:
			for i in arms.size():
				if arms[i]:
					arms[i].rotation.z = sin(tt * 2.0 + i) * 0.3
		mark.position.y = 1.9 + sin(tt * 2.5) * 0.08
		mark.rotation.y = tt * 2.0


# ======================================================================== Cohete Avellana
class Rocket extends StaticBody3D:
	var game
	var p: Vector3
	var ry: float
	var model: Node3D
	var u: Dictionary
	var tarp: Node3D
	var ready_ := false

	func _init(g, spot: Dictionary) -> void:
		process_mode = Node.PROCESS_MODE_ALWAYS   # se anima también durante las escenas (solo es visual)
		game = g
		p = Utileria._v3(spot.pos)
		ry = float(spot.get("ry", 0.0))
		position = p
		collision_layer = 4
		collision_mask = 0
		var cs := CollisionShape3D.new()
		var cy := CylinderShape3D.new()
		cy.radius = 1.2
		cy.height = 3.2
		cs.shape = cy
		cs.position.y = 1.6
		add_child(cs)
		model = Modelos.make("cohete")
		u = model.get_meta("u")
		model.position = Vector3.ZERO
		model.rotation = Vector3(0, ry, 0)
		add_child(model)
		if spot.get("tarp", false):
			tarp = Node3D.new()
			Combate.part(tarp, "ico1", Props.mat("#a9b48a"), Vector3(0, 1.3, 0), Vector3(1.6, 1.4, 1.6))
			var cyl := CylinderMesh.new()
			cyl.top_radius = 1.0
			cyl.bottom_radius = 1.0
			cyl.height = 1.0
			cyl.radial_segments = 6
			Props.part(tarp, cyl, Props.mat("#8a7a5a"), Vector3(0, 0.15, 0), Vector3(1.7, 0.3, 1.7))
			for i in 4:
				Combate.part(tarp, "box", Props.mat("#d8c8a0"), Vector3(cos(i * 1.57) * 1.2, 0.9, sin(i * 1.57) * 1.2), Vector3(0.08, 1.4, 0.08))
			add_child(tarp)
		set_ready(not spot.get("tarp", false))

	func set_ready(v: bool) -> void:
		ready_ = v
		model.visible = v
		if tarp:
			tarp.visible = not v

	func _process(_dt: float) -> void:
		if not ready_:
			return
		var f: Node3D = u.get("flame")
		if f and f.visible:
			var i := 0
			for c in f.get_children():
				c.scale.y = 1.0 + sin(game.anim_t * (24.0 + i * 7.0)) * 0.2
				i += 1
