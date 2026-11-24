## Star Nova — enemigos: 16 comportamientos, estados (quemadura, veneno, sangrado,
## frío, aturdido), élites y el jefe final de cada mundo. Los modelos salen de data/modelos.json.
class_name Enemigos

const GRAV := 22.0

static var _ice_mesh: SphereMesh
static var _ice_mat: StandardMaterial3D

## Estados alterados compartidos por enemigos y jefe. Devuelve el factor de velocidad.
static func tick_status(game, e, dt: float) -> float:
	var dot := 0.0
	if e.burn_t > 0:
		e.burn_t -= dt
		dot += e.burn_dps
	if e.poison_t > 0:
		e.poison_t -= dt
		dot += e.poison_dps
	if e.bleed_t > 0:
		e.bleed_t -= dt
		dot += e.bleed_dps
	if dot > 0:
		e.hp -= dot * dt
		e.dot_acc += dot * dt
		if e.dot_acc > 6:
			Hud.number(e.center() + Vector3(0, e.hh, 0), e.dot_acc, false, Color("#ffb38a"))
			e.dot_acc = 0.0
		if e.hp <= 0:
			game.kill_enemy(e)
			return 0.0
	var k := 1.0
	if e.slow_t > 0:
		e.slow_t -= dt
		k *= e.slow_k
	if e.stun_t > 0:
		e.stun_t -= dt
		k = 0.0
	if game.time_slow_t > 0:
		k *= 0.2
	return k


class Enemy extends CharacterBody3D:
	var game
	var type: String
	var def: Dictionary
	var ai: String
	var elite = null
	var small := false
	var summoned := false
	var zone = null
	var max_hp: float
	var hp: float
	var dmg_mul: float
	var speed: float
	var armor := 0.0
	var r: float
	var hh: float
	var flying := false
	var is_boss := false
	var model: Node3D
	var u: Dictionary
	var scale_k: float
	var ice: MeshInstance3D
	var spawn_t := 0.6
	var grounded := false
	var t := 0.0
	var timer := 0.0
	var state := "idle"
	var flash := 0.0
	var burn_t := 0.0
	var poison_t := 0.0
	var bleed_t := 0.0
	var slow_t := 0.0
	var stun_t := 0.0
	var burn_dps := 0.0
	var poison_dps := 0.0
	var bleed_dps := 0.0
	var slow_k := 1.0
	var dot_acc := 0.0
	var dead := false
	var yaw := 0.0
	var wander := 0.0
	var untargetable := false
	var vel := Vector3.ZERO
	var pos: Vector3:
		get: return global_position
		set(v): global_position = v
	var charge_dir := Vector3.ZERO
	var burst := 0
	var burst_t := 0.0
	var throw_t := 0.0
	var minions: Array = []
	var aim_at := Vector3.ZERO
	var self_destruct := false

	func _init(g, ty: String, p: Vector3, o := {}) -> void:
		game = g
		type = ty
		def = Datos.enemies[ty]
		ai = def.ai
		name = "Enemigo_" + ty
		elite = Datos.elites.get(o.get("elite", ""), null)
		small = o.get("small", false)
		summoned = o.get("summoned", false)
		zone = o.get("zone", null)
		var size_k := (0.6 if small else 1.0) * (1.22 if elite else 1.0)
		max_hp = float(def.hp) * game.hp_scale() * (float(elite.hpMul) if elite else 1.0) * (0.45 if small else 1.0)
		hp = max_hp
		dmg_mul = game.dmg_scale() * (float(elite.dmgMul) if elite else 1.0)
		speed = float(def.speed) * (float(elite.speedMul) if elite else 1.0)
		armor = float(elite.get("armor", 0.0)) if elite else 0.0
		r = float(def.r) * size_k
		hh = float(def.h) / 2.0 * size_k
		flying = def.get("flying", false)
		scale_k = size_k
		t = randf() * 3.0
		timer = 1.0 + randf() * 1.5
		wander = randf() * TAU
		collision_layer = 8
		collision_mask = 1 | 4 | 64
		floor_max_angle = deg_to_rad(52)
		floor_snap_length = 0.3
		var cs := CollisionShape3D.new()
		if flying:
			var sp := SphereShape3D.new()
			sp.radius = minf(0.45, r)
			cs.shape = sp
		else:
			var bx := BoxShape3D.new()
			bx.size = Vector3(r * 1.44, hh * 2.0, r * 1.44)
			cs.shape = bx
		cs.position.y = hh
		add_child(cs)
		position = p
		model = Modelos.make("enemigo_" + ty)
		Modelos.merge(model, "enemigo_" + ty)
		u = model.get_meta("u")
		model.scale = Vector3.ONE * 0.01
		if elite:
			var halo := MeshInstance3D.new()
			var tm := TorusMesh.new()
			tm.inner_radius = 0.68
			tm.outer_radius = 1.32
			halo.mesh = tm
			var hm := StandardMaterial3D.new()
			hm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
			hm.albedo_color = Color(elite.color, 0.8)
			hm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			halo.material_override = hm
			halo.scale = Vector3(float(def.r) * 1.6, 0.25, float(def.r) * 1.6)
			halo.position.y = float(def.h) * 0.55
			halo.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			model.add_child(halo)
			u["halo"] = halo
		if Enemigos._ice_mesh == null:
			Enemigos._ice_mesh = SphereMesh.new()
			Enemigos._ice_mesh.radial_segments = 8
			Enemigos._ice_mesh.rings = 4
			Enemigos._ice_mat = StandardMaterial3D.new()
			Enemigos._ice_mat.albedo_color = Color("#bfefff", 0.45)
			Enemigos._ice_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			Enemigos._ice_mat.emission_enabled = true
			Enemigos._ice_mat.emission = Color("#204060")
		ice = MeshInstance3D.new()
		ice.mesh = Enemigos._ice_mesh
		ice.material_override = Enemigos._ice_mat
		ice.scale = Vector3(r * 1.5, hh * 1.25, r * 1.5) * 2.0 / maxf(0.01, scale_k) * 0.5
		ice.position.y = hh / scale_k
		ice.visible = false
		model.add_child(ice)

	func _ready() -> void:
		game.world.add_child(model)
		Fx.burst(game.world, global_position + Vector3(0, 0.4, 0), Color(def.colors[2]), 16, 2.5, 0.2, 0.8)

	func center() -> Vector3:
		return global_position + Vector3(0, hh, 0)

	func ground_ahead(dx: float, dz: float) -> bool:
		var o := global_position + Vector3(dx * (r + 0.5), 0.6, dz * (r + 0.5))
		return game.ray(o, Vector3.DOWN, 3.5, 1 | 4) != null

	func walk(dt: float, mx: float, mz: float, sp: float, hop_v := 0.0) -> void:
		if (mx != 0 or mz != 0) and grounded and not ground_ahead(mx, mz):
			mx = 0
			mz = 0
			wander += PI
		vel.x = mx * sp
		vel.z = mz * sp
		if hop_v > 0 and grounded:
			vel.y = hop_v
		vel.y -= GRAV * dt
		velocity = vel
		move_and_slide()
		grounded = is_on_floor() and vel.y <= 0
		if grounded:
			vel.y = -0.5

	func fly(dt: float, target: Vector3, sp: float, ease := 2.0) -> void:
		var d := target - center()
		var length := d.length()
		if length > 0.05:
			d *= minf(sp, length * 2.0) / length
		else:
			d = Vector3.ZERO
		vel = vel.lerp(d, 1.0 - exp(-dt * ease))
		global_position += vel * dt

	func shoot(target: Vector3, sp: float, dmg_k := 1.0, o := {}) -> bool:
		var from := center() + Vector3(0, float(o.get("dy", 0.0)), 0)
		var dir := (target - from).normalized()
		if o.get("los", true) and game.ray(from, dir, maxf(0.1, from.distance_to(target) - 0.4), 1) != null:
			return false
		var oo := o.duplicate()
		oo["speed"] = sp
		game.add_projectile(Combate.EnemyOrb.new(game, from + dir * (r + 0.15), dir, float(def.dmg) * dmg_mul * dmg_k, oo))
		return true

	func _physics_process(dt: float) -> void:
		if dead or game.state != "play":
			return
		var pl: Player = game.player
		t += dt
		var tt: float = game.time
		if spawn_t > 0:
			spawn_t -= dt
		flash = maxf(0.0, flash - dt)
		var k := Enemigos.tick_status(game, self, dt)
		if dead:
			return
		ice.visible = slow_t > 0 and slow_k < 0.35
		var to := Vector3(pl.global_position.x - global_position.x, 0, pl.global_position.z - global_position.z)
		var dist := to.length()
		if dist > 0.01:
			to /= dist
		var chase := dist < 34.0
		var sp := speed * k
		var ready := spawn_t <= 0
		var face_yaw := atan2(to.x, to.z)
		var contact := true
		match ai:
			"hopper", "splitter":
				timer -= dt * k
				var hop := 0.0
				if grounded and timer <= 0 and ready:
					timer = (0.8 if ai == "splitter" else 0.55) + randf() * 0.4
					hop = 4.0 if ai == "splitter" else 5.2
				var mx := to.x if chase else cos(wander) * 0.4
				var mz := to.z if chase else sin(wander) * 0.4
				if grounded and hop == 0.0:
					vel.x *= 0.7
					vel.z *= 0.7
					walk(dt, 0, 0, 0)
				else:
					walk(dt, mx, mz, sp if (hop > 0 or not grounded) else 0.0, hop)
			"swarm":
				walk(dt, to.x if chase else 0.0, to.z if chase else 0.0, sp, 3.0 if (grounded and randf() < dt * 1.5) else 0.0)
			"heavy", "golem":
				if state == "windup":
					timer -= dt * k
					walk(dt, 0, 0, 0)
					if timer <= 0:
						game.slam(global_position, 4.0 if ai == "golem" else 2.8, float(def.dmg) * dmg_mul * 1.3, ai == "golem")
						state = "idle"
						timer = 2.2
				else:
					timer -= dt * k
					if ai == "golem" and timer <= 0 and dist > 5 and dist < 26 and ready:
						timer = 3.5
						var tgt := pl.center() + pl.velocity * 0.6
						var flat := Vector2(tgt.x - global_position.x, tgt.z - global_position.z).length()
						var dir := Vector3(tgt.x - global_position.x, flat * 0.55 + (tgt.y - global_position.y - 2.0) * 0.5, tgt.z - global_position.z).normalized()
						game.add_projectile(Combate.EnemyOrb.new(game, center() + Vector3(0, 1.2, 0), dir, float(def.dmg) * dmg_mul * 0.9,
							{"speed": sqrt(flat * 22.0 / 1.1) * 0.9, "gravity": 1.0, "r": 0.35, "color": "#d8c8b8", "emissive": "#302820", "life": 5.0, "boulder": true}))
						throw_t = 0.5
					if chase and dist < (3.4 if ai == "golem" else 2.3) and timer <= 0.5 and grounded:
						state = "windup"
						timer = 1.0 if ai == "golem" else 0.75
					walk(dt, to.x if chase else 0.0, to.z if chase else 0.0, sp)
			"flyer":
				var target := pl.center() + Vector3(cos(tt * 0.7 + wander) * 3, 2.2 + sin(tt * 1.3 + wander) * 0.6, sin(tt * 0.7 + wander) * 3)
				fly(dt, target if chase else center(), sp)
				timer -= dt * k
				if chase and dist < 22 and timer <= 0 and ready:
					timer = 2.6 + randf() * 1.2
					if shoot(pl.center(), 7.5):
						Sfx.play("shoot")
			"roller":
				var roll: Node3D = u.get("roll")
				if state == "charge":
					timer -= dt
					walk(dt, charge_dir.x, charge_dir.z, sp)
					if roll: roll.rotation.x += dt * sp / 0.4
					if timer <= 0:
						state = "rest"
						timer = 1.1
					face_yaw = atan2(charge_dir.x, charge_dir.z)
				elif state == "windup":
					timer -= dt * k
					walk(dt, 0, 0, 0)
					if roll: roll.rotation.x += dt * 25.0
					if timer <= 0:
						state = "charge"
						timer = 1.2
						charge_dir = to
				else:
					timer -= dt * k
					walk(dt, to.x if chase else 0.0, to.z if chase else 0.0, sp * 0.25)
					if roll: roll.rotation.x += dt * sp * 0.25 / 0.4
					if chase and dist < 10 and timer <= 0 and ready:
						state = "windup"
						timer = 0.6
					if state != "windup" and timer <= 0:
						state = "idle"
			"turret":
				walk(dt, 0, 0, 0)
				timer -= dt * k
				if burst > 0:
					burst_t -= dt
					if burst_t <= 0:
						burst_t = 0.18
						burst -= 1
						shoot(pl.center(), 11, 0.8, {"color": "#ffe08a", "emissive": "#9a7010"})
				elif chase and dist < 24 and timer <= 0 and ready:
					timer = 2.4
					burst = 3
					burst_t = 0
					Sfx.play("shoot")
				contact = dist < r + 0.5
			"bomber":
				if state == "fuse":
					timer -= dt
					walk(dt, 0, 0, 0)
					model.scale = Vector3.ONE * scale_k * (1.0 + (0.6 - timer) * 0.6)
					if u.has("spark"): u.spark.scale = Vector3.ONE * (0.07 + randf() * 0.06)
					if timer <= 0:
						game.explode_at(center(), 2.4, float(def.dmg) * dmg_mul, Color("#c8a8ff"), true)
						self_destruct = true
						game.kill_enemy(self)
						return
				else:
					walk(dt, to.x if chase else 0.0, to.z if chase else 0.0, sp, 3.0 if (grounded and randf() < dt * 0.8) else 0.0)
					if dist < 1.5 and ready:
						state = "fuse"
						timer = 0.6
						Sfx.play("deny")
					if u.has("spark"): u.spark.scale = Vector3.ONE * (0.06 + sin(tt * 20.0) * 0.02)
				contact = false
			"healer":
				var mx := 0.0
				var mz := 0.0
				if dist < 7:
					mx = -to.x
					mz = -to.z
				elif dist > 13:
					mx = to.x
					mz = to.z
				else:
					mx = -to.z * 0.5
					mz = to.x * 0.5
				walk(dt, mx, mz, sp)
				timer -= dt * k
				if timer <= 0 and ready:
					timer = 3.0
					var best = null
					var bk := 0.99
					for o in game.enemies:
						if o == self or o.dead or o.is_boss:
							continue
						var f: float = o.hp / o.max_hp
						if f < bk and o.global_position.distance_to(global_position) < 12:
							bk = f
							best = o
					if best:
						best.hp = minf(best.max_hp, best.hp + best.max_hp * 0.3)
						Fx.bolt(game.world, center(), best.center(), Color("#9fe3b0"))
						Fx.burst(game.world, best.center(), Color("#9fe3b0"), 12, 2)
				contact = false
			"shielder":
				walk(dt, to.x if chase else 0.0, to.z if chase else 0.0, sp)
			"blinker":
				if state == "fade":
					timer -= dt
					model.scale = Vector3.ONE * maxf(0.01, scale_k * timer / 0.35)
					untargetable = true
					if timer <= 0:
						var a := randf() * TAU
						global_position = pl.global_position + Vector3(cos(a) * 3.2, 2.4, sin(a) * 3.2)
						state = "appear"
						timer = 0.35
						Fx.burst(game.world, center(), Color("#e8f0ff"), 14, 2)
				elif state == "appear":
					timer -= dt
					model.scale = Vector3.ONE * scale_k * (1.0 - timer / 0.35)
					if timer <= 0:
						state = "dive"
						timer = 0.7
						untargetable = false
						vel = (pl.center() - center()).normalized() * 10.0
				elif state == "dive":
					timer -= dt
					global_position += vel * dt * k
					if timer <= 0:
						state = "idle"
						timer = 2.2
				else:
					var target := pl.center() + Vector3(cos(tt + wander) * 6, 3, sin(tt + wander) * 6)
					fly(dt, target if chase else center(), sp)
					timer -= dt * k
					if chase and timer <= 0 and ready:
						state = "fade"
						timer = 0.35
				if u.has("wings"):
					for i in u.wings.size():
						u.wings[i].rotation.z = (-1.0 if i else 1.0) * sin(tt * 18.0) * 0.6
			"summoner":
				walk(dt, to.x if (chase and dist > 8) else 0.0, to.z if (chase and dist > 8) else 0.0, sp)
				timer -= dt * k
				if chase and timer <= 0 and ready:
					timer = 6.0
					minions = minions.filter(func(m): return is_instance_valid(m) and not m.dead)
					var n = game.enemies.filter(func(e): return not e.dead).size()
					if n < 24 and minions.size() < 4:
						for i in 2:
							var a := randf() * TAU
							minions.append(game.spawn_enemy("chispita", global_position + Vector3(cos(a) * 1.5, 0.3, sin(a) * 1.5), {"force": true, "summoned": true}))
					Sfx.play("bell", 220)
					if u.has("swing"): u.swing.rotation.z = 0.4
				if u.has("swing"):
					u.swing.rotation.z *= exp(-dt * 2.0)
					u.swing.rotation.x = sin(tt * 1.5) * 0.08
			"sniper":
				var away := -1.0 if dist < 14 else (1.0 if dist > 19 else 0.0)
				var target := Vector3(global_position.x + to.x * away * 3, pl.global_position.y + 5, global_position.z + to.z * away * 3)
				if state == "aim":
					timer -= dt * maxf(0.3, k)
					if timer > 0.3:
						aim_at = pl.center()
					Fx.warn_line(self, game.world, center(), aim_at)
					if timer <= 0:
						shoot(aim_at, 30, 1.0, {"los": false, "color": "#ffffff", "emissive": "#8080ff", "r": 0.12})
						Sfx.play("special")
						state = "idle"
						timer = 3.2
						Fx.warn_line(self, null, Vector3.ZERO, Vector3.ZERO)
					vel *= 0.9
				else:
					fly(dt, target if chase else center(), sp)
					timer -= dt * k
					if chase and dist < 28 and timer <= 0 and ready:
						state = "aim"
						timer = 1.4
						aim_at = pl.center()
				contact = false
			"burrower":
				if state == "under" or state == "idle":
					if state == "idle":
						state = "under"
						timer = 0.0
					untargetable = true
					model.visible = false
					walk(dt, to.x if chase else 0.0, to.z if chase else 0.0, sp)
					if dist < 1.2 and ready:
						state = "emerge"
						timer = 0.45
						model.visible = true
						untargetable = false
						Fx.burst(game.world, global_position, Color("#d8f0ff"), 20, 4)
						if absf(pl.global_position.y - global_position.y) < 1.2:
							game.hurt_player(float(def.dmg) * dmg_mul, global_position)
							pl.velocity.y = 7.0
				elif state == "emerge":
					timer -= dt
					walk(dt, 0, 0, 0)
					if timer <= 0:
						state = "surface"
						timer = 2.6
				else:
					timer -= dt
					walk(dt, 0, 0, 0)
					if timer <= 0:
						state = "under"
						Fx.burst(game.world, global_position, Color("#d8c8b8"), 12, 2)
				contact = state == "surface"
			"twister":
				walk(dt, to.x if chase else 0.0, to.z if chase else 0.0, sp)
				if dist < 5.5 and ready:
					var pull := (1.0 - dist / 5.5) * 7.0 * k
					pl.velocity.x -= to.x * pull * dt * 4.0
					pl.velocity.z -= to.z * pull * dt * 4.0
			_:
				walk(dt, to.x if chase else 0.0, to.z if chase else 0.0, sp)
		if dead:
			return
		if global_position.y < -16.0:
			dead = true
			return
		# élites: aura de fuego
		if elite and elite.id == "ardiente":
			if randf() < 0.3:
				Fx.puff(game.world, global_position + Vector3((randf() - 0.5) * 0.6, 0.1, (randf() - 0.5) * 0.6), Color("#ff9a5c"), 1)
			if dist < r + 1.2:
				pl.burn_t = maxf(pl.burn_t, 1.2)
		# daño por contacto
		if contact and ready and not untargetable and pl.center().distance_to(center()) < r + 0.32:
			if game.hurt_player(float(def.dmg) * dmg_mul, center(), self):
				on_hit_player()
		yaw += wrapf(face_yaw - yaw, -PI, PI) * minf(1.0, dt * 5.0)

	func _process(dt: float) -> void:
		if dead or model == null:
			return
		var tt: float = game.time
		if ai == "burrower" and state == "emerge":
			model.position = global_position + Vector3(0, (0.45 - timer) * 0.6, 0)
		else:
			model.position = global_position
		model.rotation.y = yaw
		if spawn_t > 0 and ai != "blinker":
			model.scale = Vector3.ONE * maxf(0.01, scale_k * (1.0 - spawn_t / 0.6))
		elif ai != "blinker" and ai != "bomber":
			model.scale = Vector3.ONE * scale_k
		animate(dt, tt)

	func on_hit_player() -> void:
		if elite == null:
			return
		var pl: Player = game.player
		match elite.id:
			"helado": pl.slow_t = 1.6
			"ardiente": pl.burn_t = 2.5
			"vampirico":
				hp = minf(max_hp, hp + float(def.dmg) * dmg_mul * 3.0)
				Fx.burst(game.world, center(), Color("#e0507a"), 10, 2)

	func animate(dt: float, tt: float) -> void:
		var m: String = def.model
		var inner: Node3D = u.get("inner")
		if m == "cube" or m == "mini":
			if inner:
				var air := not grounded
				inner.scale = Vector3(0.9, 1.15, 0.9) if air else Vector3(1.08, 0.9, 1.08)
		elif m == "orb":
			if u.has("ring"): u.ring.rotation.z = tt * 2.0
			if inner: inner.position.y = sin(tt * 3.0 + wander) * 0.06
		elif m == "totem":
			var w := 1.0 - timer / 0.75 if state == "windup" else 0.0
			if inner:
				inner.position.y = w * 0.4
				inner.rotation.z = sin(tt * 40.0) * 0.05 if state == "windup" else sin(tt * 4.0) * 0.03
		elif m == "jelly":
			var s := 1.0 + sin(tt * 6.0) * 0.06
			if inner: inner.scale = Vector3(s, 2.0 - s, s)
		elif m == "pyramid" and u.has("eye"):
			u.eye.position.y = 0.55 + sin(tt * 2.0) * 0.03
		elif m == "golem" and u.has("arms"):
			var raise := -2.4 * (1.0 - timer) if state == "windup" else 0.0
			throw_t = maxf(0.0, throw_t - dt)
			var thr := -2.6 if throw_t > 0 else 0.0
			u.arms[0].rotation.x += (raise + sin(tt * 2.0) * 0.1 - u.arms[0].rotation.x) * minf(1.0, dt * 8.0)
			u.arms[1].rotation.x += (minf(raise, thr) + sin(tt * 2.0 + 1.0) * 0.1 - u.arms[1].rotation.x) * minf(1.0, dt * 8.0)
		elif m == "twister":
			if inner: inner.position.y = sin(tt * 2.0) * 0.05
		for s in u.get("spin", []):
			if s is Node3D:
				s.rotation.y += dt * 3.0
		if u.has("halo"):
			u.halo.rotation.z = tt * 2.0
			u.halo.position.y = hh / scale_k * 1.1 + sin(tt * 3.0) * 0.05
		if inner:
			inner.visible = not (flash > 0 and int(tt * 30.0) % 2 == 0)

	func remove() -> void:
		Fx.warn_line(self, null, Vector3.ZERO, Vector3.ZERO)
		if is_instance_valid(model):
			model.queue_free()
		queue_free()


## Jefe final de cada mundo: fases en bucle (ring, slam-up, hover, summon, spin, blink).
class Boss extends Node3D:
	var game
	var cfg: Dictionary
	var boss_id: String
	var type := "boss"
	var is_boss := true
	var def: Dictionary
	var max_hp: float
	var hp: float
	var dmg_mul: float
	var armor := 0.0
	var r: float
	var hh: float
	var home: Vector3
	var pos: Vector3
	var orbit_r := 0.0
	var model: Node3D
	var u: Dictionary
	var phase := "intro"
	var timer := 2.5
	var yaw := 0.0
	var spin := 0.0
	var spin_k := 0.0
	var fade := 1.0
	var flash := 0.0
	var burn_t := 0.0
	var poison_t := 0.0
	var bleed_t := 0.0
	var slow_t := 0.0
	var stun_t := 0.0
	var burn_dps := 0.0
	var poison_dps := 0.0
	var bleed_dps := 0.0
	var slow_k := 1.0
	var dot_acc := 0.0
	var dead := false
	var untargetable := false
	var flying := true
	var small := false
	var summoned := false
	var elite = null
	var vel := Vector3.ZERO
	var cycle := 0
	var ring_t := 0.0
	var shots := 0
	var vy := 0.0
	var did_summon := false
	var blinked := false
	var zone = null

	func _init(g, p: Vector3, id: String) -> void:
		game = g
		boss_id = id
		cfg = Datos.mundos.bosses[id]
		name = "Jefe"
		def = {"name": cfg.name, "ai": "boss", "dmg": cfg.dmg, "xp": cfg.xp, "sparks": cfg.sparks, "colors": cfg.colors, "model": "boss"}
		max_hp = float(cfg.hp) * game.hp_scale()
		hp = max_hp
		dmg_mul = game.dmg_scale()
		r = float(cfg.r)
		hh = float(cfg.hh)
		home = p
		pos = p + Vector3(0, 8, 0)
		orbit_r = float(cfg.get("orbit", 0.0))
		model = Modelos.make(id)
		u = model.get_meta("u")
		Sfx.play("boss")

	func _ready() -> void:
		game.world.add_child(model)

	func parts() -> Array:
		var c := pos + Vector3(0, hh, 0)
		if not cfg.get("twin", false):
			return [c]
		var off := Vector3(cos(spin) * orbit_r, 0, -sin(spin) * orbit_r)
		return [c + off, c - off]

	func center() -> Vector3:
		var ps := parts()
		if ps.size() == 1:
			return ps[0]
		var pl: Vector3 = game.player.center()
		return ps[0] if ps[0].distance_to(pl) < ps[1].distance_to(pl) else ps[1]

	func _physics_process(dt: float) -> void:
		if dead or game.state != "play":
			return
		var pl: Player = game.player
		var tt: float = game.time
		flash = maxf(0.0, flash - dt)
		stun_t = minf(stun_t, 0.3)
		var k := maxf(0.4, Enemigos.tick_status(game, self, dt))
		if dead:
			return
		var enraged := hp < max_hp * 0.4
		var spd := (1.35 if enraged else 1.0) * k
		timer -= dt * spd
		var hover := Vector3(pl.global_position.x * 0.5 + home.x * 0.5, home.y + float(cfg.hoverY), pl.global_position.z * 0.5 + home.z * 0.5)
		var spin_target := 0.9
		var orbit_target := float(cfg.get("orbit", 0.0))
		match phase:
			"intro", "hover":
				pos = pos.lerp(hover, 1.0 - exp(-dt * 1.4))
				if timer <= 0: next()
			"ring":
				pos = pos.lerp(hover, 1.0 - exp(-dt * 1.5))
				ring_t -= dt * spd
				if ring_t <= 0 and shots > 0:
					ring_t = 0.55
					shots -= 1
					var n := 18 if enraged else 14
					for from in parts():
						var to_p: Vector3 = pl.center() - from
						var tilt := atan2(to_p.y, Vector2(to_p.x, to_p.z).length())
						var per := int(ceil(n / 2.0)) if cfg.get("twin", false) else n
						for i in per:
							var a := TAU * i / per + shots * 0.2
							var dir := Vector3(cos(a) * cos(tilt), sin(tilt), sin(a) * cos(tilt)).normalized()
							var col: String = cfg.orb.color
							if cfg.orb.get("rainbow", false):
								col = "#" + Color.from_hsv(float(i) / per, 0.6, 1.0).to_html(false)
							game.add_projectile(Combate.EnemyOrb.new(game, from + dir * 1.6, dir, float(def.dmg) * dmg_mul * 0.6, {"speed": 6.5, "r": 0.22, "color": col, "life": 6.0}))
					Sfx.play("special")
				if timer <= 0: next()
			"slam-up":
				pos.x += (pl.global_position.x - pos.x) * minf(1.0, dt * 2.5)
				pos.z += (pl.global_position.z - pos.z) * minf(1.0, dt * 2.5)
				pos.y += (home.y + 9.0 - pos.y) * minf(1.0, dt * 3.0)
				if timer <= 0:
					phase = "slam-down"
					vy = 0.0
			"slam-down":
				vy -= 60.0 * dt
				pos.y += vy * dt
				if pos.y <= home.y:
					pos.y = home.y
					for p in parts():
						game.slam(Vector3(p.x, home.y, p.z), 5.5, float(def.dmg) * dmg_mul * 1.2, true)
					phase = "recover"
					timer = 1.4
			"recover":
				if timer <= 0: next()
			"spin":
				pos = pos.lerp(Vector3(home.x, home.y + 0.2, home.z), 1.0 - exp(-dt * 2.0))
				spin_target = 4.2 if enraged else 3.2
				orbit_target = 7.0
				if randf() < 0.4:
					for p in parts():
						Fx.puff(game.world, Vector3(p.x, home.y + 0.1, p.z), Color("#c8e0a8"), 1)
				if timer <= 0: next()
			"blink":
				fade = maxf(0.0, fade - dt * 2.5)
				if fade <= 0 and not blinked:
					blinked = true
					var a := randf() * TAU
					var rr := 6.0 + randf() * 5.0
					pos = Vector3(home.x + cos(a) * rr, home.y + float(cfg.hoverY) * 0.6, home.z + sin(a) * rr)
					Fx.burst(game.world, center(), Color.WHITE, 24, 4)
					Sfx.play("crystal")
				if blinked and timer <= 0.6:
					fade = minf(1.0, fade + dt * 3.0)
				if timer <= 0:
					fade = 1.0
					next()
			"summon":
				pos = pos.lerp(hover, 1.0 - exp(-dt * 1.5))
				if not did_summon:
					did_summon = true
					var types: Array = cfg.summon[1 if enraged else 0]
					for i in (4 if enraged else 2):
						var a := randf() * TAU
						var ty: String = types[i % types.size()]
						var fl: bool = Datos.enemies.has(ty) and Datos.enemies[ty].get("flying", false)
						game.spawn_enemy(ty, home + Vector3(cos(a) * 6, 3.0 if fl else 0.3, sin(a) * 6), {"force": true, "summoned": true})
				if timer <= 0: next()
		spin_k += (spin_target - spin_k) * minf(1.0, dt * 2.0)
		spin += spin_k * dt
		orbit_r += (orbit_target - orbit_r) * minf(1.0, dt * 2.0)
		if fade > 0.5:
			for p in parts():
				if pl.center().distance_to(p) < r + 0.8:
					game.hurt_player(float(def.dmg) * dmg_mul, p)
					break
		var want := atan2(pl.global_position.x - pos.x, pl.global_position.z - pos.z)
		yaw += (want - yaw) * minf(1.0, dt * 2.0)
		model.position = pos
		model.rotation.y = spin if cfg.get("twin", false) else yaw
		model.scale = Vector3.ONE * (0.2 + 0.8 * fade)
		_animate(tt, enraged)
		if u.has("inner"):
			u.inner.visible = fade > 0.05 and not (flash > 0 and int(tt * 30.0) % 2 == 0)

	func _animate(tt: float, enraged: bool) -> void:
		match boss_id:
			"guardian":
				if u.has("halo"): u.halo.rotation.z = tt * 0.8
				if u.has("core"): u.core.rotation.y = tt * 3.0
				if u.has("orbiters"):
					for i in u.orbiters.size():
						var a = tt * (2.4 if enraged else 1.4) + TAU * i / 4.0
						u.orbiters[i].position = Vector3(cos(a) * 2.8, 1.8 + sin(tt * 2.0 + i) * 0.5, sin(a) * 2.8)
						u.orbiters[i].rotation = Vector3(tt, tt * 1.3, 0)
			"gemelos":
				Boss.anim_gemelos(u, tt, orbit_r, spin_k)
			"polilla":
				Boss.anim_polilla(u, tt, enraged)

	static func anim_gemelos(uu: Dictionary, tt: float, orb: float, sk: float) -> void:
		if uu.has("twins"):
			for i in uu.twins.size():
				uu.twins[i].position = Vector3(-orb if i else orb, sin(tt * 2.0 + i * PI) * 0.25, 0)
				uu.twins[i].rotation.y = tt * (0.5 + sk * 6.0) * (-1.0 if i else 1.0)
		if uu.has("chain"):
			var n: int = uu.chain.size()
			for i in n:
				var kk := float(i) / (n - 1)
				uu.chain[i].position = Vector3(orb * (1.0 - 2.0 * kk), 2.4 + sin(kk * PI) * -0.5 + sin(tt * 3.0 + i) * 0.1, 0)
				uu.chain[i].rotation = Vector3(tt + i, PI / 2 if i % 2 else 0.0, 0)

	static func anim_polilla(uu: Dictionary, tt: float, enraged: bool) -> void:
		var f := 16.0 if enraged else 10.0
		if uu.has("wings"):
			for i in uu.wings.size():
				var s := -1.0 if i % 2 else 1.0
				uu.wings[i].rotation.y = s * (0.25 + sin(tt * f + (0.6 if i > 1 else 0.0)) * 0.55)
		if uu.has("halo"): uu.halo.rotation.z = tt * 1.5
		if uu.has("inner"): uu.inner.position.y = sin(tt * 2.0) * 0.3

	func next() -> void:
		var order: Array = cfg.order
		phase = order[cycle % order.size()]
		cycle += 1
		did_summon = false
		blinked = false
		match phase:
			"ring":
				timer = 3.2
				shots = 3
				ring_t = 0.3
			"slam-up": timer = 1.6
			"hover": timer = 2.0
			"summon": timer = 2.0
			"spin": timer = 4.0
			"blink": timer = 1.6

	func remove() -> void:
		if is_instance_valid(model):
			model.queue_free()
		queue_free()


## Esquirlas físicas al morir un enemigo.
static func shatter(game, c: Vector3, colors: Array, n := 12, size := 0.09) -> void:
	for i in n:
		if game.debris.size() > 140:
			var d = game.debris.pop_front()
			if is_instance_valid(d): d.queue_free()
		var v := Vector3((randf() - 0.5) * 6, 2.0 + randf() * 5.0, (randf() - 0.5) * 6)
		var p := c + Vector3((randf() - 0.5) * 0.4, (randf() - 0.5) * 0.4, (randf() - 0.5) * 0.4)
		var deb := Combate.Debris.new(p, Color(colors[i % colors.size()]), size * (0.6 + randf() * 0.8), v)
		game.world.add_child(deb)
		game.debris.append(deb)
