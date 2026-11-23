## Star Nova — arsenal de Pip: ataque principal equipado (21 tipos con rango), poder
## especial (13), efectos al golpear (de ataques y de objetos) y aliados (torres, espíritus, orbes, luciérnagas).
class_name Arsenal
extends Node3D

var game
var attack := {"id": "bellota", "tier": 0}
var power := "lluvia"
var helpers: Array = []
var orbitals: Combate.Orbitals
var drones: Combate.Drones
var storm_t := 4.0
var comet_t := 2.5
var aura_t := 0.0
var beam: MeshInstance3D
var beam_mat: StandardMaterial3D
var beam_tick := 0.0
var bubble_mesh: MeshInstance3D
var timers: Array = []          ## [segundos, Callable] (tormenta, terremoto…): se cancelan si cambia el estado

func _init(g) -> void:
	game = g
	name = "Arsenal"

func _ready() -> void:
	orbitals = Combate.Orbitals.new(game)
	game.world.add_child(orbitals)
	drones = Combate.Drones.new(game)
	game.world.add_child(drones)
	beam = MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.05
	cm.bottom_radius = 0.05
	cm.height = 1.0
	cm.radial_segments = 8
	cm.cap_top = false
	cm.cap_bottom = false
	beam.mesh = cm
	beam_mat = Combate.glow(Color("#ffb3c7"), 0.85)
	beam_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	beam.material_override = beam_mat
	beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	beam.visible = false
	game.world.add_child(beam)

func def() -> Dictionary:
	return Datos.attacks[attack.id]

func pdef() -> Dictionary:
	return Datos.powers[power]

func rage_k() -> float:
	return 1.0 if game.stats.rage > 0 and game.hp < game.stats.maxHp * 0.4 else 0.0

func base_dmg() -> float:
	return game.stats.dmg * Datos.tier_mul(int(attack.tier)) * game.buff_mul("dmg") * (1.0 + 0.5 * rage_k() * game.stats.rage)

func rate() -> float:
	return float(def().rate) / (game.stats.atk * game.buff_mul("atk") * (1.0 + 0.3 * rage_k()))

func tier_bonus() -> float:
	return 1.0 + 0.15 * int(attack.tier)

func power_cd() -> float:
	return float(pdef().cd) * game.stats.cdrMul

func shot_opts(extra := {}) -> Dictionary:
	var d := def()
	var t: int = int(attack.tier)
	var crit = randf() < game.stats.crit + float(d.get("critBonus", 0.0))
	var o := {
		"dmg": base_dmg() * float(d.dmg) * (game.stats.critMul if crit else 1.0), "crit": crit,
		"color": d.color, "model": d.model, "speed": float(d.speed), "tier": t, "proc": true,
		"burn": d.get("burn", 0), "freeze": (float(d.freeze) + 0.3 * t) if d.get("freeze", 0) else 0.0,
		"chain": (int(d.chain) + t / 2) if d.get("chain", 0) else 0,
		"pierce": (int(d.pierce) + t) if d.get("pierce", 0) else 0, "splash": d.get("splash", 0),
		"poison": d.get("poison", 0), "cloud": d.get("cloud", 0), "leech": d.get("leech", 0),
		"stun": d.get("stun", 0), "voidHole": d.get("voidHole", 0),
		"bounces": (int(d.bounces) + t) if d.get("bounces", 0) else 0,
		"trail": t >= 2 or str(d.model) in ["star", "orb"],
	}
	if t >= 4:
		o["big"] = 1.35
	o.merge(extra, true)
	return o

func _spread(dir: Vector3, n: int, ang: float) -> Array:
	var out := []
	for i in n:
		out.append(dir.rotated(Vector3.UP, (i - (n - 1) / 2.0) * ang))
	return out

func _add(from: Vector3, dirs: Array, o := {}) -> void:
	for v in dirs:
		game.add_player_shot(Combate.Shot.new(game, from, v, shot_opts(o)))

## Dispara el ataque principal equipado.
func fire(from: Vector3, target: Vector3) -> void:
	var d := def()
	var t: int = int(attack.tier)
	var dir := (target - from).normalized()
	var extra: int = int(game.stats.get("projCount", 0)) + (1 if randf() < game.stats.multishot else 0)
	match str(d.kind):
		"spread":
			_add(from, _spread(dir, int(d.count) + extra + (2 if t >= 3 else 0), float(d.spread) * 0.6), {"life": 0.6})
		"lob":
			var flat := Vector2(target.x - from.x, target.z - from.z).length()
			var v := Vector3(target.x - from.x, 0, target.z - from.z).normalized()
			var sp := clampf(sqrt(maxf(1.0, flat) * 22.0 / 1.2), 9.0, 22.0)
			v.y = 0.7
			v = v.normalized()
			var n := 1 + extra
			for i in n:
				game.add_player_shot(Combate.Shot.new(game, from, v.rotated(Vector3.UP, (i - (n - 1) / 2.0) * 0.15), shot_opts({"speed": sp, "gravity": 1.0, "life": 3.0})))
		"homing":
			_add(from, _spread(dir, int(d.get("count", 1)) + extra + (1 if t >= 4 else 0) + (1 if t >= 5 else 0), 0.35), {"homing": true, "life": 2.4})
		"boomerang":
			_add(from, _spread(dir, 1 + extra, 0.2), {"boomerang": true})
		"rapid":
			var j := (dir + Vector3(randf() - 0.5, randf() - 0.5, randf() - 0.5) * 0.04).normalized()
			_add(from, [j] + _spread(dir, extra, 0.1))
		"ring":
			var n: int = int(d.count) + t * 2 + extra * 2
			var dirs := []
			for i in n:
				dirs.append(Vector3(cos(TAU * i / n), 0.05, sin(TAU * i / n)))
			_add(from, dirs, {"gravity": 0.0, "life": 0.8, "pierce": 1 + t})
		"mine":
			var v := dir
			v.y = maxf(v.y, 0.15)
			game.add_player_shot(Combate.Shot.new(game, from, v.normalized(), shot_opts({"speed": 9.0, "gravity": 1.0, "mine": true, "life": 20.0, "model": "orb", "r": 0.12})))
			var mines: Array = game.projectiles.filter(func(p): return p is Combate.Shot and p.o.get("mine", false) and not p.dead)
			if mines.size() > 6:
				mines[0].detonate()
		"meteor":
			for i in extra + 1:
				var o := shot_opts()
				var p := target + Vector3((randf() - 0.5) * i, 0, (randf() - 0.5) * i)
				game.add_projectile(Combate.StarFall.new(game, p, o.dmg, 0.05 * i, {"splash": float(d.splash) + 0.2 * t, "color": d.color, "effects": o, "size": 1.0 + t * 0.15}))
		"beam":
			pass
		_:
			_add(from, _spread(dir, 1 + extra, 0.12))
	if str(d.kind) != "beam":
		Sfx.play("shoot")
		game.player.model.throw_anim()

## Haz continuo: daña en intervalos al primer enemigo en la línea.
func update_beam(dt: float, active: bool, from: Vector3, target: Vector3) -> void:
	if not active or str(def().kind) != "beam":
		beam.visible = false
		return
	var dir := target - from
	var length := minf(26.0, dir.length())
	dir = dir.normalized()
	var end := from + dir * length
	var e = game.hit_enemy_segment(from, end, 0.25, {})
	if e:
		length = e.center().distance_to(from)
		end = e.center()
	beam.visible = true
	beam.global_position = from + dir * length / 2.0
	var up := dir
	var side := up.cross(Vector3.FORWARD if absf(up.dot(Vector3.FORWARD)) < 0.9 else Vector3.RIGHT).normalized()
	var w := 0.6 + int(attack.tier) * 0.15 + sin(Time.get_ticks_msec() / 50.0) * 0.15
	beam.global_basis = Basis(side * w, up * length, side.cross(up).normalized() * w)
	beam_mat.albedo_color = Color.from_hsv(fmod(Time.get_ticks_msec() / 1500.0, 1.0), 0.45, 1.0, 0.85)
	beam_tick -= dt
	if beam_tick <= 0:
		beam_tick = rate()
		if e:
			var o := shot_opts()
			game.damage_enemy(e, o.dmg, {"crit": o.crit, "proc": true, "from": from, "effects": {"burn": 0.3}})
		if randf() < 0.6:
			Fx.puff(game.world, end, Color.WHITE, 2)
	if randf() < 0.3:
		Sfx.play("xp")

## Aplica los efectos de un proyectil al golpear a un enemigo.
func hit_shot(e, shot) -> void:
	game.damage_enemy(e, shot.dmg, {"crit": shot.crit, "proc": shot.o.get("proc", true), "from": shot.prev, "knock": 2.5, "effects": shot.o})

## Efectos del ataque (o) y de los objetos (procs) tras un golpe.
func apply_effects(e, dmg: float, o, _from = null) -> void:
	var st: Dictionary = game.stats
	if e.dead:
		return
	if o is Dictionary:
		var tier := int(o.get("tier", 0))
		if o.get("burn", 0):
			e.burn_t = 3.0
			e.burn_dps = maxf(e.burn_dps, dmg * float(o.burn))
		if o.get("freeze", 0):
			slow(e, float(o.freeze), maxf(0.05, 0.55 - 0.08 * tier))
		if o.get("poison", 0):
			e.poison_t = 4.0
			e.poison_dps = maxf(e.poison_dps, dmg * float(o.poison))
		if o.get("cloud", 0):
			add_helper(Combate.PoisonCloud.new(game, e.center(), {"r": float(o.cloud) + 0.2 * tier, "dps": dmg * 0.4, "life": 3.0}))
		if o.get("leech", 0):
			game.heal(dmg * float(o.leech), true)
		if o.get("stun", 0):
			e.stun_t = maxf(e.stun_t, float(o.stun))
		if o.get("voidHole", 0):
			add_helper(Combate.VoidHole.new(game, e.center(), {"r": 2.6 + 0.3 * tier, "dps": dmg * 0.8, "life": 2.2}))
		if o.get("chain", 0):
			chain(e, dmg * 0.75, int(o.chain))
		if o.get("proc", true) == false:
			return
	# procs de objetos
	if randf() < st.explode:
		game.explode_at(e.center(), 1.8, st.dmg * 1.5, Color("#ff9a6b"), false, {"proc": false})
	if randf() < st.bleed:
		e.bleed_t = 3.0
		e.bleed_dps = maxf(e.bleed_dps, st.dmg * 0.4)
	if randf() < st.freeze:
		slow(e, 1.6, 0.3)
	if randf() < st.chain:
		chain(e, st.dmg * 0.9, 2 + int(st.chainExtra))
	if randf() < st.poison:
		e.poison_t = 4.0
		e.poison_dps = maxf(e.poison_dps, st.dmg * 0.35)
		for n in game.enemies:
			if n != e and not n.dead and n.global_position.distance_to(e.global_position) < 2.5:
				n.poison_t = 3.0
				n.poison_dps = maxf(n.poison_dps, st.dmg * 0.25)
	if randf() < st.voidChance:
		add_helper(Combate.VoidHole.new(game, e.center(), {"r": 2.8, "dps": st.dmg * 1.2, "life": 2.0}))
	if st.lifesteal:
		game.heal(dmg * st.lifesteal, true)

func slow(e, time: float, k: float) -> void:
	var cur: float = e.slow_k if e.slow_t > 0 else 1.0
	e.slow_t = maxf(e.slow_t, time)
	e.slow_k = minf(cur, k)

func chain(from, dmg: float, n: int) -> void:
	var hit := {from: true}
	var cur = from
	for i in n:
		var best = null
		var bd := 6.5
		for e in game.enemies:
			if e.dead or e.untargetable or hit.has(e):
				continue
			var d: float = e.center().distance_to(cur.center())
			if d < bd:
				bd = d
				best = e
		if best == null:
			break
		Fx.bolt(game.world, cur.center(), best.center(), Color("#fff27a"))
		hit[best] = true
		game.damage_enemy(best, dmg, {"proc": false, "color": Color("#fff27a")})
		cur = best
	if n > 0:
		Sfx.play("hit")

func add_helper(h: Node3D) -> void:
	helpers.append(h)
	game.world.add_child(h)

func later(sec: float, f: Callable) -> void:
	timers.append([sec, f])

## Poderes especiales (botón ★).
func use_power() -> void:
	var pl: Player = game.player
	var st: Dictionary = game.stats
	var dmg: float = st.dmg * game.buff_mul("dmg")
	var target: Vector3 = game.power_target()
	Sfx.play("special")
	match power:
		"lluvia":
			for i in 8:
				var a := randf() * TAU
				var r := randf() * 3.0
				game.add_projectile(Combate.StarFall.new(game, target + Vector3(cos(a) * r, 0, sin(a) * r), dmg * 2.6, i * 0.09))
		"agujero":
			add_helper(Combate.VoidHole.new(game, target + Vector3(0, 0.6, 0), {"r": 5.0, "dps": dmg * 1.6, "life": 3.0, "pull": 7.0, "big": 1.6}))
		"meteoro":
			game.add_projectile(Combate.StarFall.new(game, target, dmg * 9.0, 0.25, {"size": 3.0, "splash": 5.5, "color": "#ff9a6b"}))
		"burbuja":
			game.buffs.invuln = 3.0
			game.heal(st.maxHp * 0.2)
			_bubble()
		"tormenta":
			for i in 12:
				later(i * 0.17, func():
					var list: Array = game.enemies.filter(func(e): return not e.dead and not e.untargetable and e.global_position.distance_to(pl.global_position) < 16)
					var e = list.pick_random() if list.size() else null
					var p: Vector3 = e.center() if e else pl.global_position + Vector3((randf() - 0.5) * 10, 0, (randf() - 0.5) * 10)
					Fx.bolt(game.world, p + Vector3(0, 9, 0), p, Color("#fff27a"), 0.25)
					if e:
						game.damage_enemy(e, dmg * 2.0, {"proc": false, "color": Color("#fff27a")})
						if not e.dead:
							e.stun_t = maxf(e.stun_t, 0.3)
					Sfx.play("hit"))
		"novahelada":
			Fx.ring(game.world, pl.global_position + Vector3(0, 0.3, 0), Color("#bfefff"), 40, 10)
			Fx.burst(game.world, pl.center(), Color("#e8fbff"), 40, 6)
			for e in game.enemies.duplicate():
				if not e.dead and e.global_position.distance_to(pl.global_position) < 8:
					slow(e, 3.0, 0.05)
					game.damage_enemy(e, dmg * 1.5, {"proc": false, "color": Color("#bfefff")})
			Sfx.play("crystal")
		"torreta":
			add_helper(Combate.Turret.new(game, pl.global_position + Vector3(sin(pl.yaw), 0, cos(pl.yaw))))
		"espiritus":
			add_helper(Combate.Spirit.new(game, 0))
			add_helper(Combate.Spirit.new(game, 1))
		"flor":
			game.buffs.healOverTime = 4.0
			game.buffs.healRate = st.maxHp * 0.1
			Fx.burst(game.world, pl.center(), Color("#9fe3b0"), 30, 3)
		"frenesi":
			game.buffs.frenzy = 5.0
			Fx.burst(game.world, pl.center(), Color("#ff7a6b"), 30, 4)
		"terremoto":
			for i in 3:
				later([0.0, 0.35, 0.7][i], func():
					var r := 4.0 + i * 1.6
					Fx.ring(game.world, pl.global_position + Vector3(0, 0.1, 0), Color("#d8b48a"), 36, r * 2)
					game.cam.shake = maxf(game.cam.shake, 0.35)
					for e in game.enemies.duplicate():
						if not e.dead and e.global_position.distance_to(pl.global_position) < r:
							game.damage_enemy(e, dmg * 2.0, {"knock": 4.0, "from": pl.global_position, "up": 7.0, "proc": false})
					Sfx.play("rumble"))
		"tiempo":
			game.time_slow_t = 4.0
			Fx.ring(game.world, pl.center(), Color("#c7c3f0"), 40, 14)
		"lechuza":
			add_helper(Combate.OwlSpirit.new(game, pl.center(), game.cam_forward(), dmg * 4.0))
	game.vibrate(25)

func _bubble() -> void:
	if bubble_mesh == null:
		bubble_mesh = Combate.part(game.world, "ico2", Combate.glow(Color("#bfefff"), 0.25), Vector3.ZERO, Vector3.ONE * 0.75)
		bubble_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	bubble_mesh.visible = true

## Aliados y efectos periódicos de objetos (se llama en cada paso fijo).
func step(dt: float) -> void:
	var st: Dictionary = game.stats
	var pl: Player = game.player
	for tm in timers.duplicate():
		tm[0] -= dt
		if tm[0] <= 0:
			timers.erase(tm)
			if game.state == "play":
				tm[1].call()
	for h in helpers.duplicate():
		if h.dead:
			helpers.erase(h)
			h.remove()
	orbitals.sync_count(mini(8, int(st.orbitals)))
	drones.sync_count(mini(6, int(st.drone)))
	if bubble_mesh:
		bubble_mesh.visible = game.buffs.invuln > 0
		bubble_mesh.global_position = pl.center()
	# Aura Solar
	if st.aura > 0:
		aura_t -= dt
		if aura_t <= 0:
			aura_t = 0.5
			for e in game.enemies:
				if not e.dead and e.global_position.distance_to(pl.global_position) < 2.6 + e.r:
					e.burn_t = maxf(e.burn_t, 1.5)
					e.burn_dps = maxf(e.burn_dps, st.dmg * 0.35 * st.aura)
		if randf() < 0.25:
			var a := randf() * TAU
			Fx.puff(game.world, pl.global_position + Vector3(cos(a) * 2.4, 0.1, sin(a) * 2.4), Color("#ffcf6b"), 1)
	# Nube de Tormenta
	if st.storm > 0:
		storm_t -= dt
		if storm_t <= 0:
			storm_t = 4.0 / st.storm
			var list: Array = game.enemies.filter(func(e): return not e.dead and not e.untargetable and e.global_position.distance_to(pl.global_position) < 18)
			if list.size():
				var e = list.pick_random()
				Fx.bolt(game.world, e.center() + Vector3(0, 8, 0), e.center(), Color("#fff27a"), 0.25)
				game.damage_enemy(e, st.dmg * 2.2, {"proc": true})
	# Cometa Fiel
	if st.comet > 0:
		comet_t -= dt
		if comet_t <= 0:
			comet_t = 2.5
			var best = null
			var bd := 25.0
			for e in game.enemies:
				if e.dead:
					continue
				var d: float = e.center().distance_to(pl.global_position)
				if d < bd:
					bd = d
					best = e
			if best:
				game.add_projectile(Combate.StarFall.new(game, best.global_position, st.dmg * 2.0 * st.comet, 0.0))
