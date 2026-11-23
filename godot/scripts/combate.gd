## Star Nova — proyectiles, zonas, aliados, recogibles y esquirlas.
## Capas: 1 terreno · 2 Pip · 3(4) objetos con física · 4(8) enemigos · 5(16) proyectiles de Pip ·
## 6(32) proyectiles enemigos · 7(64) portón · 8(128) esquirlas · 9(256) recogibles.
class_name Combate

static var _geo := {}

## Mallas facetadas compartidas .
static func geo(kind: String) -> Mesh:
	if _geo.has(kind):
		return _geo[kind]
	var m: Mesh
	match kind:
		"ico0", "ico1", "ico2":
			m = _ico_mesh(int(kind.substr(3)))
		"oct":
			var st := SurfaceTool.new()
			st.begin(Mesh.PRIMITIVE_TRIANGLES)
			var v := [Vector3(1, 0, 0), Vector3(-1, 0, 0), Vector3(0, 1, 0), Vector3(0, -1, 0), Vector3(0, 0, 1), Vector3(0, 0, -1)]
			var f := [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]]
			for tri in f:
				var a: Vector3 = v[tri[0]]
				var b: Vector3 = v[tri[1]]
				var c: Vector3 = v[tri[2]]
				var n := (a + b + c).normalized()
				for p in [a, c, b]:
					st.set_normal(n)
					st.add_vertex(p)
			m = st.commit()
		"box":
			m = BoxMesh.new()
		"cone5":
			var c := CylinderMesh.new()
			c.top_radius = 0.0
			c.bottom_radius = 1.0
			c.height = 1.0
			c.radial_segments = 5
			m = c
		"cyl6", "cyl8":
			var c := CylinderMesh.new()
			c.top_radius = 1.0
			c.bottom_radius = 1.0
			c.height = 1.0
			c.radial_segments = int(kind.substr(3))
			m = c
		"torus":
			var t := TorusMesh.new()
			t.inner_radius = 0.68
			t.outer_radius = 1.32
			t.rings = 12
			t.ring_segments = 6
			m = t
	_geo[kind] = m
	return m

static func _ico_mesh(detail: int) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for t in Builder._ico(detail):
		var a: Vector3 = t[0]
		var b: Vector3 = t[1]
		var c: Vector3 = t[2]
		var n := (a + b + c).normalized()
		for p in [a, c, b]:
			st.set_normal(n)
			st.add_vertex(p)
	return st.commit()

static func part(parent: Node3D, kind: String, mat: Material, pos: Vector3, sc: Vector3) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = geo(kind)
	mi.material_override = mat
	mi.position = pos
	mi.scale = sc
	parent.add_child(mi)
	return mi

static func glow(color: Color, opacity: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(color, opacity)
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	return m

static var _glows := {}
static func glow_cached(color: Color, opacity: float) -> StandardMaterial3D:
	var k := color.to_html() + str(opacity)
	if not _glows.has(k):
		_glows[k] = glow(color, opacity)
	return _glows[k]

## Malla de proyectil según el modelo del ataque.
static func shot_mesh(model: String, color: String) -> Node3D:
	var g := Node3D.new()
	var c := Color(color)
	match model:
		"acorn":
			part(g, "ico1", Props.mat("#b9774a" if color == "#c98a4b" else color, Color.BLACK if color == "#c98a4b" else Color("#402010")), Vector3(0, 0, 0.01), Vector3(0.07, 0.07, 0.09))
			part(g, "ico1", Props.mat("#6e4630"), Vector3(0, 0, -0.05), Vector3(0.075, 0.075, 0.04))
		"seed":
			part(g, "ico1", Props.mat(color, Color("#204010")), Vector3.ZERO, Vector3(0.05, 0.05, 0.08))
		"thorn":
			var cn := part(g, "cone5", Props.mat(color, Color("#401020")), Vector3.ZERO, Vector3(0.05, 0.3, 0.05))
			cn.rotation.x = PI / 2
		"pine":
			part(g, "ico1", Props.mat("#a0703a"), Vector3.ZERO, Vector3(0.13, 0.17, 0.13))
			part(g, "ico0", Props.mat(color), Vector3(0, 0.03, 0), Vector3(0.15, 0.1, 0.15))
		"star":
			part(g, "oct", Props.mat(color, Color("#a08030")), Vector3.ZERO, Vector3(0.13, 0.18, 0.13))
		"leaf":
			part(g, "ico1", Props.mat(color, Color("#204010")), Vector3.ZERO, Vector3(0.16, 0.03, 0.09))
		_:
			part(g, "ico1", Props.mat(color, c * 0.5), Vector3.ZERO, Vector3.ONE * 0.09)
			var h := part(g, "ico1", glow_cached(c, 0.3), Vector3.ZERO, Vector3.ONE * 0.18)
			h.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return g

static func nearest_enemy(game, p: Vector3, range_: float):
	var best = null
	var bd := range_
	for e in game.enemies:
		if e.dead or e.untargetable:
			continue
		var d: float = e.center().distance_to(p)
		if d < bd:
			bd = d
			best = e
	return best


# ======================================================================== proyectil de Pip
class Shot extends RigidBody3D:
	var game
	var o: Dictionary
	var kind := "shot"
	var dmg: float
	var crit: bool
	var color: String
	var pierce: int
	var bounces: int
	var hit_set := {}
	var mesh: Node3D
	var prev: Vector3
	var life: float
	var age := 0.0
	var bounced := -1.0
	var returning := false
	var dead := false
	var spd: float
	var target = null
	var landed := false

	func _init(g, from: Vector3, dir: Vector3, oo: Dictionary) -> void:
		game = g
		o = oo
		dmg = float(o.dmg)
		crit = o.get("crit", false)
		color = str(o.get("color", "#c98a4b"))
		pierce = int(o.get("pierce", 0))
		bounces = int(o.get("bounces", 0))
		spd = float(o.get("speed", 30.0)) * float(game.stats.projSpeed)
		collision_layer = 16
		collision_mask = 1 | 4 | 64
		continuous_cd = true
		contact_monitor = true
		max_contacts_reported = 2
		gravity_scale = float(o.get("gravity", 0.0 if (o.get("homing", false) or o.get("boomerang", false)) else 0.3))
		var pm := PhysicsMaterial.new()
		pm.bounce = 0.45
		physics_material_override = pm
		mass = 0.02
		var cs := CollisionShape3D.new()
		var sp := SphereShape3D.new()
		sp.radius = float(o.get("r", 0.08))
		cs.shape = sp
		add_child(cs)
		position = from
		linear_velocity = dir * spd
		angular_velocity = Vector3(18, 0, 0)
		mesh = Combate.shot_mesh(str(o.get("model", "orb")), color)
		if o.has("big"):
			mesh.scale = Vector3.ONE * float(o.big)
		prev = from
		life = float(o.get("life", 2.2 if o.get("boomerang", false) else 1.8))
		body_entered.connect(_on_hit)

	func _ready() -> void:
		game.world.add_child(mesh)
		mesh.global_position = global_position

	func _on_hit(other: Node) -> void:
		if o.get("mine", false):
			if not landed:
				landed = true
				linear_damp = 6
				angular_damp = 6
			return
		if other and other.has_method("on_hit"):
			other.on_hit(self)
		if o.get("boomerang", false):
			returning = true
			return
		if o.get("splash", 0) and bounced < 0:
			detonate()
			return
		if bounced < 0:
			bounced = 0.0
			Fx.puff(game.world, global_position, Color("#e6c49c"), 3)
			Sfx.play("hit")

	func detonate() -> void:
		if dead:
			return
		game.explode_at(global_position, float(o.splash) * (1.0 + 0.08 * float(o.get("tier", 0))), dmg * 0.85, Color(color), false, o)
		dead = true

	func retarget(from: Vector3):
		var best = null
		var bd := 9.0
		for e in game.enemies:
			if e.dead or e.untargetable or hit_set.has(e):
				continue
			var d: float = e.center().distance_to(from)
			if d < bd:
				bd = d
				best = e
		return best

	func _physics_process(dt: float) -> void:
		if dead:
			return
		life -= dt
		age += dt
		if bounced >= 0:
			bounced += dt
		var p := global_position
		if o.get("homing", false):
			if target == null or target.dead:
				target = retarget(p)
			if target and age > 0.08:
				var want: Vector3 = (target.center() - p).normalized() * spd
				linear_velocity = linear_velocity.lerp(want, minf(1.0, dt * 7.0))
		if o.get("boomerang", false):
			if age > 0.42:
				returning = true
			if returning:
				var want: Vector3 = game.player.center() - p
				var d := want.length()
				linear_velocity = want.normalized() * spd * 1.1
				if d < 0.5:
					dead = true
			mesh.rotation.y += dt * 25.0
		if o.get("mine", false):
			if age > 0.6:
				for e in game.enemies:
					if not e.dead and not e.untargetable and e.center().distance_to(p) < 1.6 + e.r:
						detonate()
						return
		elif bounced < 0.12:
			var e = game.hit_enemy_segment(prev, p, 0.3 if o.has("big") else 0.12, hit_set)
			if e:
				game.hit_with_shot(e, self)
				if o.get("splash", 0):
					detonate()
					return
				if pierce > 0:
					pierce -= 1
					hit_set[e] = true
				elif bounces > 0:
					bounces -= 1
					hit_set[e] = true
					var n = retarget(p)
					if n:
						linear_velocity = (n.center() - p).normalized() * spd
						gravity_scale = 0.0
					else:
						dead = true
				elif not o.get("boomerang", false):
					dead = true
				else:
					hit_set[e] = true
		prev = p
		if o.get("trail", false) and randf() < 0.3:
			Fx.puff(game.world, p, Color(color), 1)
		if life <= 0 and o.get("splash", 0) and not dead and not o.get("mine", false):
			detonate()
			return
		if life <= 0 or (bounced > 0.5 and not o.get("mine", false)) or p.y < -20:
			dead = true

	func _process(_dt: float) -> void:
		if is_instance_valid(mesh):
			mesh.global_position = global_position
			var m: String = str(o.get("model", "orb"))
			if m == "thorn" or m == "seed":
				if linear_velocity.length_squared() > 0.01:
					mesh.look_at(global_position + linear_velocity, Vector3.UP)
			elif not o.get("boomerang", false):
				mesh.quaternion = quaternion

	func remove() -> void:
		if is_instance_valid(mesh):
			mesh.queue_free()
		queue_free()


# ======================================================================== estrella que cae del cielo
class StarFall extends Node3D:
	var game
	var dmg: float
	var delay: float
	var o: Dictionary
	var target: Vector3
	var started := false
	var dead := false
	var size := 1.0
	var mesh: MeshInstance3D
	var vy := -26.0

	func _init(g, tgt: Vector3, d: float, dl: float, oo := {}) -> void:
		game = g
		target = tgt
		dmg = d
		delay = dl
		o = oo
		size = float(o.get("size", 1.0))
		mesh = MeshInstance3D.new()
		mesh.mesh = Combate.geo("oct")
		mesh.material_override = Props.mat(str(o.get("color", "#ffe08a")), Color("#c09030"))
		mesh.scale = Vector3(0.22, 0.32, 0.22) * size
		mesh.visible = false
		add_child(mesh)

	func _physics_process(dt: float) -> void:
		if dead:
			return
		if not started:
			delay -= dt
			if delay <= 0:
				started = true
				global_position = target + Vector3(0, 12.0 * maxf(1.0, size * 0.7), 0)
				mesh.visible = true
			return
		var step := vy * dt
		var hit = game.ray(global_position, Vector3.DOWN, absf(step) + 0.2 * size, 1 | 4 | 64)
		global_position.y += step
		mesh.rotation.y += dt * 12.0
		if randf() < 0.6:
			Fx.puff(game.world, global_position + Vector3(0, 0.3 * size, 0), Color(str(o.get("color", "#fff2b8"))), 1)
		for e in game.enemies:
			if not e.dead and not e.untargetable and e.center().distance_to(global_position) < e.r + 0.3 * size:
				explode()
				return
		if hit or global_position.y < target.y - 4.0:
			explode()

	func explode() -> void:
		if dead:
			return
		game.explode_at(global_position, float(o.get("splash", 2.4)), dmg, Color(str(o.get("color", "#ffe08a"))), false, o.get("effects", null))
		if size > 2:
			game.cam.shake = maxf(game.cam.shake, 0.6)
		dead = true

	func remove() -> void:
		queue_free()


# ======================================================================== proyectil enemigo
class EnemyOrb extends RigidBody3D:
	var game
	var kind := "eorb"
	var dmg: float
	var boulder := false
	var mesh: MeshInstance3D
	var life: float
	var color: String
	var r: float
	var dead := false

	func _init(g, from: Vector3, dir: Vector3, d: float, o := {}) -> void:
		game = g
		dmg = d
		boulder = o.get("boulder", false)
		color = str(o.get("color", "#ff9ec0"))
		r = float(o.get("r", 0.16))
		life = float(o.get("life", 4.0))
		collision_layer = 32
		collision_mask = 1 | 64
		contact_monitor = true
		max_contacts_reported = 1
		gravity_scale = float(o.get("gravity", 0.0))
		var cs := CollisionShape3D.new()
		var sp := SphereShape3D.new()
		sp.radius = r
		cs.shape = sp
		add_child(cs)
		position = from
		linear_velocity = dir * float(o.get("speed", 7.0))
		mesh = MeshInstance3D.new()
		mesh.mesh = Combate.geo("ico0" if boulder else "ico1")
		mesh.material_override = Props.mat(color, Color(str(o.get("emissive", "#9a3060"))))
		mesh.scale = Vector3.ONE * r
		add_child(mesh)
		body_entered.connect(func(_b):
			if dead: return
			dead = true
			if boulder: game.slam(global_position, 2.0, dmg, false)
			else: Fx.burst(game.world, global_position, Color(color), 6, 2))

	func _physics_process(dt: float) -> void:
		if dead:
			return
		life -= dt
		if boulder:
			mesh.rotation.x += dt * 6.0
		var pl: Player = game.player
		if pl.center().distance_to(global_position) < 0.25 + r:
			game.hurt_player(dmg, global_position)
			dead = true
		if life <= 0:
			dead = true

	func pos() -> Vector3:
		return global_position

	func remove() -> void:
		queue_free()


# ======================================================================== agujero negro
class VoidHole extends Node3D:
	var game
	var o: Dictionary
	var life: float
	var r: float
	var dead := false
	var tick := 0.0
	var ring: MeshInstance3D

	func _init(g, p: Vector3, oo: Dictionary) -> void:
		game = g
		o = oo
		position = p
		life = float(o.get("life", 2.5))
		r = float(o.get("r", 3.2))
		Combate.part(self, "ico2", Props.mat("#1d1640", Color("#0a0520")), Vector3.ZERO, Vector3.ONE * 0.45 * float(o.get("big", 1.0)))
		ring = Combate.part(self, "torus", Combate.glow_cached(Color("#8f7ad8"), 0.7), Vector3.ZERO, Vector3(r * 0.5, 0.15, r * 0.5))
		Sfx.play("rumble")

	func _physics_process(dt: float) -> void:
		if dead:
			return
		life -= dt
		ring.rotation.y += dt * 4.0
		var s := r * 0.5 * (0.8 + sin(life * 10.0) * 0.1)
		ring.scale = Vector3(s, 0.15, s)
		tick -= dt
		var p := global_position
		for e in game.enemies:
			if e.dead or e.untargetable:
				continue
			var c: Vector3 = e.center()
			var d := c.distance_to(p)
			if d < r + e.r:
				if not e.is_boss:
					var pull := Vector3(p.x - c.x, 0, p.z - c.z).normalized() * minf(d, float(o.get("pull", 5.0)) * dt)
					e.global_position += pull
				if tick <= 0:
					game.damage_enemy(e, float(o.dps) * 0.25, {"color": Color("#c8b8ff")})
		if tick <= 0:
			tick = 0.25
		if life <= 0:
			dead = true
			game.explode_at(p, r * 0.8, float(o.dps) * 0.6, Color("#8f7ad8"), false, null)

	func remove() -> void:
		queue_free()


# ======================================================================== nube de veneno
class PoisonCloud extends Node3D:
	var game
	var o: Dictionary
	var life: float
	var r: float
	var dead := false
	var tick := 0.0
	var mesh: MeshInstance3D
	var mat: StandardMaterial3D

	func _init(g, p: Vector3, oo: Dictionary) -> void:
		game = g
		o = oo
		position = p
		life = float(o.get("life", 3.0))
		r = float(o.get("r", 1.8))
		mat = Combate.glow(Color("#a6d86a"), 0.28)
		mesh = Combate.part(self, "ico2", mat, Vector3.ZERO, Vector3(r, r * 0.5, r))
		mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	func _physics_process(dt: float) -> void:
		if dead:
			return
		life -= dt
		tick -= dt
		if tick <= 0:
			tick = 0.5
			for e in game.enemies:
				if not e.dead and e.center().distance_to(global_position) < r + e.r:
					e.poison_t = maxf(e.poison_t, 2.0)
					e.poison_dps = maxf(e.poison_dps, float(o.dps))
		mat.albedo_color.a = 0.28 * minf(1.0, life)
		if life <= 0:
			dead = true

	func remove() -> void:
		queue_free()


# ======================================================================== aliados
class Turret extends Node3D:
	var game
	var life := 10.0
	var cool := 0.0
	var dead := false
	var head: Node3D
	func _init(g, p: Vector3) -> void:
		game = g
		position = p
		Combate.part(self, "cyl8", Props.mat("#f5dcc0"), Vector3(0, 0.3, 0), Vector3(0.3, 0.6, 0.3))
		Combate.part(self, "box", Props.mat("#c98a4b"), Vector3(0, 0.7, 0), Vector3(0.36, 0.3, 0.36))
		head = Node3D.new()
		head.position.y = 0.75
		add_child(head)
		var barrel := Combate.part(head, "cyl6", Props.mat("#6e4630"), Vector3(0, 0, 0.25), Vector3(0.07, 0.4, 0.07))
		barrel.rotation.x = PI / 2
		Combate.part(self, "ico1", Props.mat("#ee9a8b"), Vector3(0, 0.95, 0), Vector3(0.22, 0.12, 0.22))
	func _ready() -> void:
		Fx.burst(game.world, global_position, Color("#ffe0c0"), 16, 3)
	func _physics_process(dt: float) -> void:
		if dead:
			return
		life -= dt
		cool -= dt
		var from := global_position + Vector3(0, 0.8, 0)
		var e = Combate.nearest_enemy(game, from, 18.0)
		if e:
			var d: Vector3 = (e.center() - from).normalized()
			head.rotation.y = atan2(d.x, d.z)
			if cool <= 0:
				cool = 0.32
				game.add_player_shot(Combate.Shot.new(game, from + d * 0.4, d, {"dmg": game.stats.dmg * 0.7, "model": "acorn", "color": "#c98a4b", "speed": 30.0}))
		if life <= 0:
			dead = true
			Fx.burst(game.world, global_position, Color("#ffe0c0"), 12, 2)
	func remove() -> void:
		queue_free()

class Spirit extends Node3D:
	var game
	var idx: int
	var life: float
	var cool: float
	var dead := false
	func _init(g, i: int, l := 8.0) -> void:
		game = g
		idx = i
		life = l
		cool = i * 0.2
		var m := Combate.glow_cached(Color("#ffe0c0"), 0.55)
		Combate.part(self, "ico1", m, Vector3(0, 0.2, 0), Vector3(0.15, 0.14, 0.17))
		Combate.part(self, "ico1", m, Vector3(0, 0.38, 0.08), Vector3.ONE * 0.13)
		Combate.part(self, "ico1", m, Vector3(0, 0.35, -0.2), Vector3(0.12, 0.2, 0.1))
	func _physics_process(dt: float) -> void:
		if dead:
			return
		life -= dt
		cool -= dt
		var pl: Player = game.player
		var t: float = game.time
		var a := t * 1.5 + idx * PI
		global_position = pl.global_position + Vector3(cos(a) * 1.1, 0.6 + sin(t * 3.0 + idx) * 0.1, sin(a) * 1.1)
		rotation.y = pl.yaw
		if cool <= 0:
			var e = Combate.nearest_enemy(game, global_position, 20.0)
			if e:
				cool = 0.4
				var d: Vector3 = (e.center() - global_position).normalized()
				game.add_player_shot(Combate.Shot.new(game, global_position + d * 0.3, d, {"dmg": game.stats.dmg * 0.8, "model": "orb", "color": "#ffe0c0", "speed": 28.0}))
		if life <= 0:
			dead = true
			Fx.burst(game.world, global_position, Color("#ffe0c0"), 10, 2)
	func remove() -> void:
		queue_free()

class OwlSpirit extends Node3D:
	var game
	var dir: Vector3
	var dmg: float
	var life := 1.6
	var dead := false
	var hit := {}
	var wings: Array = []
	func _init(g, from: Vector3, d: Vector3, dm: float) -> void:
		game = g
		position = from
		dir = Vector3(d.x, 0, d.z).normalized()
		dmg = dm
		var m := Combate.glow_cached(Color("#d8ccf0"), 0.7)
		Combate.part(self, "ico1", m, Vector3.ZERO, Vector3(0.5, 0.55, 0.45))
		for s in [-1.0, 1.0]:
			wings.append(Combate.part(self, "ico1", m, Vector3(s * 0.9, 0.15, 0), Vector3(0.8, 0.08, 0.4)))
		Sfx.play("special")
	func _physics_process(dt: float) -> void:
		if dead:
			return
		life -= dt
		global_position += dir * 16.0 * dt
		rotation.y = atan2(dir.x, dir.z)
		var t: float = game.time
		wings[0].rotation.z = sin(t * 20.0) * 0.4
		wings[1].rotation.z = -sin(t * 20.0) * 0.4
		for e in game.enemies:
			if e.dead or hit.has(e):
				continue
			if e.center().distance_to(global_position) < 1.8 + e.r:
				hit[e] = true
				game.damage_enemy(e, dmg, {"knock": 8.0, "from": global_position, "up": 4.0})
		if life <= 0:
			dead = true
	func remove() -> void:
		queue_free()

## Orbes guardianes (objeto "Orbe Guardián"): bellotas que giran alrededor de Pip.
class Orbitals extends Node3D:
	var game
	var meshes: Array = []
	var cool := {}
	func _init(g) -> void:
		game = g
	func sync_count(n: int) -> void:
		while meshes.size() < n:
			var m := Combate.shot_mesh("acorn", "#c98a4b")
			m.scale = Vector3.ONE * 1.6
			add_child(m)
			meshes.append(m)
		while meshes.size() > n:
			meshes.pop_back().queue_free()
	func _physics_process(_dt: float) -> void:
		var n := meshes.size()
		if n == 0 or game.state != "play":
			return
		var pl: Player = game.player
		var t: float = game.time
		for i in n:
			var a := t * 3.0 + TAU * i / n
			var m: Node3D = meshes[i]
			m.global_position = pl.global_position + Vector3(cos(a) * 1.25, 0.35, sin(a) * 1.25)
			m.rotation.y = -a
			for e in game.enemies:
				if e.dead or e.untargetable:
					continue
				if e.center().distance_to(m.global_position) < e.r + 0.25:
					var last: float = cool.get(e, -9.0)
					if t - last > 0.5:
						cool[e] = t
						game.damage_enemy(e, game.stats.dmg * 0.8, {"knock": 3.0, "from": m.global_position, "proc": true})

## Luciérnagas amigas que flotan junto a Pip y disparan.
class Drones extends Node3D:
	var game
	var list: Array = []
	func _init(g) -> void:
		game = g
	func sync_count(n: int) -> void:
		while list.size() < n:
			var g := Node3D.new()
			Combate.part(g, "ico1", Props.mat("#f6ffb0", Color("#b0c040")), Vector3.ZERO, Vector3.ONE * 0.09)
			Combate.part(g, "ico1", Combate.glow_cached(Color("#f4ffb8"), 0.25), Vector3.ZERO, Vector3.ONE * 0.28)
			add_child(g)
			list.append({"mesh": g, "cool": randf()})
		while list.size() > n:
			list.pop_back().mesh.queue_free()
	func _physics_process(dt: float) -> void:
		if game.state != "play":
			return
		var pl: Player = game.player
		var t: float = game.time
		for i in list.size():
			var d: Dictionary = list[i]
			var a := t * 0.8 + i * 2.0
			var m: Node3D = d.mesh
			m.global_position = pl.global_position + Vector3(cos(a) * 0.8, 1.1 + sin(t * 2.0 + i) * 0.15, sin(a) * 0.8)
			d.cool -= dt
			if d.cool <= 0:
				var e = Combate.nearest_enemy(game, m.global_position, 16.0)
				if e:
					d.cool = 0.9
					var dir: Vector3 = (e.center() - m.global_position).normalized()
					game.add_player_shot(Combate.Shot.new(game, m.global_position, dir, {"dmg": game.stats.dmg * 0.6, "model": "orb", "color": "#f6ffb0", "speed": 26.0}))


# ======================================================================== recogibles
const PICK := {
	"spark": {"r": 0.09, "color": "#ffd36e", "em": "#8a6010", "geo": "oct", "s": 0.1},
	"xp": {"r": 0.06, "color": "#9ce8d2", "em": "#2a7a66", "geo": "ico1", "s": 0.065},
	"heal": {"r": 0.14, "color": "#ff9fb2", "em": "#7a2a3a", "geo": "ico1", "s": 0.15},
	"item": {"r": 0.2, "color": "#ffffff", "em": "#555555", "geo": "box", "s": 0.26},
	"attack": {"r": 0.2, "color": "#ffffff", "em": "#555555", "geo": "oct", "s": 0.3},
	"power": {"r": 0.2, "color": "#ffffff", "em": "#555555", "geo": "ico1", "s": 0.27},
	"fragment": {"r": 0.25, "color": "#fff0b0", "em": "#b08a30", "geo": "oct", "s": 0.3},
}

class Pickup extends RigidBody3D:
	var game
	var type: String
	var value
	var kind := "pickup"
	var color: String
	var floating := false
	var special := false
	var p: Vector3
	var mesh: MeshInstance3D
	var halo: MeshInstance3D
	var age := 0.0
	var magnet := false
	var dead := false
	var wait_far := false
	var life: float
	var dust := false

	func _init(g, ty: String, pos: Vector3, v, o := {}) -> void:
		game = g
		type = ty
		value = v
		var d: Dictionary = Combate.PICK[ty]
		color = str(o.get("color", d.color))
		floating = o.get("floating", false)
		special = ty in ["item", "attack", "power", "fragment"]
		wait_far = o.get("wait_far", false)
		life = float(o.get("life", 40.0 if ty in ["xp", "spark"] else 1e9))
		p = pos
		position = pos
		collision_layer = 256
		collision_mask = 1 | 64
		if floating:
			freeze = true
			gravity_scale = 0
		else:
			var vel = o.get("vel", Vector3((randf() - 0.5) * 3, 3.0 + randf() * 3.0, (randf() - 0.5) * 3))
			linear_velocity = vel
			linear_damp = 0.3
			var pm := PhysicsMaterial.new()
			pm.bounce = 0.5
			pm.friction = 0.6
			physics_material_override = pm
			mass = 0.05
		var cs := CollisionShape3D.new()
		var sp := SphereShape3D.new()
		sp.radius = float(d.r)
		cs.shape = sp
		add_child(cs)
		mesh = MeshInstance3D.new()
		mesh.mesh = Combate.geo(d.geo)
		mesh.material_override = Props.mat(color, Color(str(o.get("emissive", d.em))))
		mesh.scale = Vector3.ONE * float(d.s)
		add_child(mesh)
		if special:
			halo = MeshInstance3D.new()
			halo.mesh = Combate.geo("ico1")
			halo.material_override = Combate.glow_cached(Color(str(o.get("halo", color))), 0.3)
			halo.scale = Vector3.ONE * 2.2
			halo.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			mesh.add_child(halo)

	func _physics_process(dt: float) -> void:
		if dead or game.state == "title":
			return
		age += dt
		life -= dt
		var pl: Vector3 = game.player.center()
		p = global_position
		var dist := p.distance_to(pl)
		if wait_far and dist > 1.8:
			wait_far = false
		if not floating:
			var range_: float = 1.6 if special else float(game.stats.magnet)
			if not magnet and not wait_far and age > 0.5 and dist < range_:
				magnet = true
				gravity_scale = 0.0
			if magnet:
				linear_velocity = (pl - p).normalized() * minf(22.0, 4.0 + age * 8.0)
			if p.y < -20:
				dead = true
		else:
			mesh.position.y = sin(game.time * 2.0 + age) * 0.1
		mesh.rotation.y += dt * 2.5
		if special:
			mesh.position.y = 0.15 + sin(game.time * 3.0) * 0.08
		if not wait_far and dist < (0.8 if floating else 0.45) and age > 0.25:
			game.collect(self)
			dead = true
		if life <= 0:
			dead = true

	func remove() -> void:
		queue_free()


# ======================================================================== esquirlas
class Debris extends RigidBody3D:
	var life: float
	var size: float
	var mesh: MeshInstance3D
	var dead := false
	func _init(pos: Vector3, color: Color, s: float, vel: Vector3) -> void:
		position = pos
		collision_layer = 128
		collision_mask = 1 | 4 | 64 | 128
		size = s * 2.0
		var cs := CollisionShape3D.new()
		var b := BoxShape3D.new()
		b.size = Vector3.ONE * size
		cs.shape = b
		add_child(cs)
		mesh = MeshInstance3D.new()
		mesh.mesh = Combate.geo("box")
		mesh.material_override = Props.mat(color.to_html(false))
		mesh.scale = Vector3.ONE * size
		add_child(mesh)
		linear_velocity = vel
		angular_velocity = Vector3((randf() - 0.5) * 12, (randf() - 0.5) * 12, (randf() - 0.5) * 12)
		var pm := PhysicsMaterial.new()
		pm.bounce = 0.3
		pm.friction = 0.8
		physics_material_override = pm
		mass = 0.05
		life = 2.5 + randf() * 1.5
	func _physics_process(dt: float) -> void:
		life -= dt
		if life < 0.5:
			mesh.scale = Vector3.ONE * size * maxf(0.01, life / 0.5)
		if life <= 0 or global_position.y < -20:
			dead = true
			queue_free()
