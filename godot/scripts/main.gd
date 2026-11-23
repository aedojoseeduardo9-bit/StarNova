## Star Nova — núcleo del juego: estados, reglas, cofres, director de enemigos en
## oleadas, combate, interacción (cofres, PNJ, lechuza, cohete, impulsores), misiones, jefe, muerte, viajes entre
## mundos, perfiles y atajos de prueba (`-- --auto --ir=coral …`; ver CLAUDE.md).
## Se carga UN mundo por escena: viajar o "Guardar y salir" recarga la escena.
extends Node3D

const STEP := 1.0 / 60.0
const AUTOSAVE := 30.0
const WAVE_CALM := 75.0
const WAVE_WAIT := 40.0
const DAY_CYCLE := 480.0
const DAY_TIMES := {"dia": 0.25, "tarde": 0.585, "noche": 0.77, "amanecer": 0.955}

class Skills:
	var game
	var cd := {"primary": 0.0, "secondary": 0.0, "utility": 0.0, "special": 0.0}
	var max := {"secondary": 2.6, "utility": 3.2}
	func _init(g) -> void:
		game = g
	func dur(id: String) -> float:
		if id == "primary":
			return game.arsenal.rate()
		if id == "special":
			return game.arsenal.power_cd()
		return max[id] * game.stats.cdrMul
	func ready(id: String) -> bool:
		return cd[id] <= 0
	func use(id: String) -> void:
		cd[id] = dur(id)
	func update(dt: float) -> void:
		for k in cd:
			cd[k] = maxf(0.0, cd[k] - dt)
	func fraction(id: String) -> float:
		return minf(1.0, cd[id] / maxf(0.01, dur(id)))

var args := {}
var world_id := "islas"
var W: Dictionary                 ## definición del mundo (data/mundos.json)
var regions: Dictionary
var world: Node3D
var player: Player
var cam: CameraRig
var sky: SkyEnv
var controls: Controls
var arsenal: Arsenal
var skills: Skills
var missions: Misiones
var menus: Menus
var cinema: Cine
var spots: Dictionary
var props := {}
var stats: Dictionary
var items := {}
var level := 1
var xp := 0.0
var sparks := 0.0
var time := 0.0
var hp := 100.0
var shield := 0.0
var shield_cd := 0.0
var buffs := {"invuln": 0.0, "frenzy": 0.0, "healOverTime": 0.0, "healRate": 0.0}
var time_slow_t := 0.0
var enemies: Array = []
var projectiles: Array = []
var pickups: Array = []
var debris: Array = []
var kills := 0
var director := {"credits": 4.0, "t": 0.0}
var waves := {}
var aim_hold := 0.0
var region := ""
var state := "title"
var god := false
var boss = null
var boss_done := false
var slot := 0
var profile := {"name": "Prueba", "created": 0}
var save_t := 0.0
var world_states := {}
var talked := {}
var outfits := {"owned": [], "on": null}
var story := {"seen": {}}
var story_queue: Array = []
var story_on := false
var owl_done := false
var dialog = null
var shop_npc = null
var day_shift := 0.0
var is_night = null
var altar_fragment = null
var stardust: Array = []
var auto_target = null
var loaded_pos := false
var hide_hud := false
var codex := {}
var settings := {}
var inp := {"held": {"primary": false, "jump": false}, "pressed": {}}
var acc := 0.0
var _music_t := 0.0
var _fight := 0.0
var _timers: Array = []
var _cine_first := true

# ----------------------------------------------------------------------------------------------- arranque
func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	Juego.main = self
	args = Juego.args()
	settings = Juego.settings
	codex = Juego.codex
	Controls.setup_actions()
	Sfx.set_music_volume(float(settings.get("music", 0.8)))
	# ¿qué mundo? (atajo --mundo, viaje en curso o el último jugado)
	var viaje: Dictionary = Juego.viaje
	world_id = str(args.get("mundo", viaje.get("world", Juego.store_get("ultimoMundo", "islas"))))
	if not Datos.mundos.worlds.has(world_id):
		world_id = "islas"
	W = Datos.mundos.worlds[world_id]
	regions = Palette.from_world(W.regions)

	sky = SkyEnv.new(regions)
	add_child(sky)
	sky.set_style(W.get("sky", {}) if W.get("sky") is Dictionary else {})
	world = Node3D.new()
	world.name = "Mundo"
	world.process_mode = Node.PROCESS_MODE_PAUSABLE
	add_child(world)
	cam = CameraRig.new()
	cam.game = self
	add_child(cam)
	stats = Datos.compute_stats(level, items)
	hp = stats.maxHp
	spots = Mundo.build(self, world, world_id)
	for z in spots.get("spawnZones", []):
		waves[z.region] = {"state": "ola", "pool": float(wave_size(1.0)), "calm": 0.0, "wait": 0.0}
	god = args.get("dios", "") == "1"

	player = Player.new()
	player.process_mode = Node.PROCESS_MODE_PAUSABLE
	world.add_child(player)
	player.setup(self, world, cam, Utileria._v3(spots.spawn))
	cam.follow = player
	cam.snap(player.global_position + Vector3(0, 0.55, 0))
	arsenal = Arsenal.new(self)
	world.add_child(arsenal)
	skills = Skills.new(self)
	missions = Misiones.new(self)

	var S := spots
	props = {"bells": [], "crystals": [], "fireflies": [], "crates": [], "chests": [], "lanterns": [], "npcs": [],
		"bridge": null, "gate": null, "campfire": null, "owl": null, "nova": null, "rocket": null, "extras": S.get("extras_nodos", [])}
	var i := 0
	for s in S.get("bells", []):
		var b := Utileria.Bell.new(self, s, i)
		world.add_child(b)
		props.bells.append(b)
		i += 1
	i = 0
	for s in S.get("crystals", []):
		var c := Utileria.Crystal.new(self, s, i)
		world.add_child(c)
		props.crystals.append(c)
		i += 1
	i = 0
	for s in S.get("fireflies", []):
		var f := Utileria.Firefly.new(self, s, i)
		world.add_child(f)
		props.fireflies.append(f)
		i += 1
	for p in S.get("crates", []):
		var cr := Props.Crate.new(Utileria._v3(p))
		world.add_child(cr)
		props.crates.append(cr)
	for s in S.get("chests", []):
		var ch := Utileria.Chest.new(self, s)
		world.add_child(ch)
		props.chests.append(ch)
	for s in S.get("lanterns", []):
		var l := Utileria.Lantern.new(self, s)
		world.add_child(l)
		props.lanterns.append(l)
	if S.get("plankBridge"):
		props.bridge = Utileria.PlankBridge.new(self, S.plankBridge)
		world.add_child(props.bridge)
	if S.get("gate"):
		props.gate = Utileria.Gate.new(self, S.gate)
		world.add_child(props.gate)
	if S.get("campfire") != null:
		var cf = S.campfire
		props.campfire = Props.Campfire.new(Utileria._pos(cf), str(cf.get("look", "fuego")) if cf is Dictionary else "fuego")
		world.add_child(props.campfire)
	if S.get("owl") != null:
		props.owl = Utileria.Owl.new(self, Utileria._v3(S.owl))
		world.add_child(props.owl)
	if S.get("novaStar") != null:
		props.nova = Utileria.NovaStar.new(self, S.novaStar)
		world.add_child(props.nova)
	for s in S.get("npcs", []):
		var n := Utileria.NPC.new(self, s)
		world.add_child(n)
		props.npcs.append(n)
	if S.get("rocket") != null:
		props.rocket = Utileria.Rocket.new(self, S.rocket)
		world.add_child(props.rocket)
	if S.get("altar") != null:
		altar_fragment = Combate.Pickup.new(self, "fragment", Utileria._v3(S.altar.pos), 0, {"floating": true})
		add_pickup(altar_fragment)
	for p in S.get("stardust", []):
		var k := Combate.Pickup.new(self, "spark", Utileria._v3(p), 4, {"floating": true, "life": 1e9, "color": "#ffe8a0", "halo": "#fff4c8"})
		k.dust = true
		add_pickup(k)
		stardust.append(k)
	see("attack", "bellota")
	see("power", "lluvia")

	controls = Controls.new(player, cam)
	controls.game = self
	add_child(controls)
	controls.set_touch(Controls.is_touch_device() or args.has("tactil"))
	menus = Menus.new(self)
	add_child(menus)
	cinema = Cine.new(self)
	add_child(cinema)
	Hud.attach(self)
	Juego.apply_quality(self)
	var rec: int = Juego.recuperar_partidas_anteriores()
	if rec > 0:
		later(0.8, func(): Hud.toast("Se recuperaron %d partida%s de la versión anterior de la app" % [rec, "" if rec == 1 else "s"]))
	_apply_debug()
	var back: bool = Juego.volver_perfiles
	Juego.volver_perfiles = false
	if back and state == "title":
		menus.show_profiles()
	elif state == "title" and viaje.is_empty():
		menus.show_title()
	Juego.viaje = {}
	Hud.refresh_missions()
	Hud.refresh_loadout()
	if args.has("ojos"):
		add_child(Ojos.new(self, str(args.ojos)))

func k(pc: String, touch: String) -> String:
	return touch if controls.touch_mode else pc

func is_touch() -> bool:
	return controls.touch_mode

func ojos() -> bool:
	return args.has("ojos")

# ----------------------------------------------------------------------------------------------- atajos de prueba
func _apply_debug() -> void:
	var P := args
	var places: Dictionary = W.places
	if P.has("t"):
		time = float(P.t)
	if P.has("hora") and DAY_TIMES.has(P.hora):
		day_shift = (DAY_TIMES[P.hora] - 0.05) * DAY_CYCLE - time
	if P.has("items"):
		for id in Datos.items:
			if int(Datos.items[id].rar) < 4:
				add_item(id, true)
	if P.has("arma"):
		var a: PackedStringArray = str(P.arma).split(":")
		if Datos.attacks.has(a[0]):
			equip_attack({"id": a[0], "tier": int(a[1]) if a.size() > 1 else 0}, true)
	if P.has("poder") and Datos.powers.has(P.poder):
		equip_power(P.poder, true)
	if P.has("traje") and Datos.trajes_por_id.has(P.traje):
		outfits.owned.append(P.traje)
		wear_outfit(P.traje)
	if P.has("cofre"):
		var ids: Array = Datos.chest_list.map(func(c): return c.id) if P.cofre == "todos" else [P.cofre]
		for j in props.chests.size():
			var id: String = ids[j % ids.size()]
			if Datos.chests.has(id):
				props.chests[j].set_type(id)
	var nf := int(P.get("frag", str(W.gateNeed) if P.has("jefe") else "0"))
	if nf > 0:
		missions.discover_all()
		var fr := missions.defs.filter(func(m): return m.get("fragment", false))
		for j in mini(nf, fr.size()):
			missions.complete(fr[j].id)
	if P.has("puente"):
		for c in props.crystals:
			c.activate()
	if P.has("vencido"):
		mark_boss_done(true)
	var go: String = str(W.bossPlace) if P.has("jefe") else str(P.get("ir", ""))
	if go != "" and places.has(go):
		player.teleport(Utileria._v3(places[go]))
		cam.snap(player.global_position + Vector3(0, 0.55, 0))
	if P.has("cam"):
		var c: PackedStringArray = str(P.cam).split(",")
		cam.yaw = float(c[0])
		cam.pitch = float(c[1]) if c.size() > 1 else 0.32
		if c.size() > 2:
			cam.want = float(c[2])
			cam.cur = cam.want
	elif go != "" and W.get("placeYaw", {}).has(go):
		cam.yaw = float(W.placeYaw[go])
	var sl := int(P.get("perfil", "0"))
	var viaje: Dictionary = Juego.viaje
	if P.has("auto"):
		start(false, P.has("llegada"))
		if P.has("llegada"):
			arrive(true)
	elif sl in Guardado.SLOTS:
		play_slot(sl, str(P.get("nombre", "")))
	elif viaje.has("slot") and int(viaje.slot) in Guardado.SLOTS:
		play_slot(int(viaje.slot), "")
	elif viaje.has("world"):
		start(false, viaje.get("arrive", false))
		if viaje.get("arrive", false):
			arrive(false)
	if P.has("enemigos"):
		var n := int(P.enemigos)
		var forced: Array = Array(str(P.tipo).split(",")) if P.has("tipo") else []
		var pool: Array = forced if forced.size() else Datos.enemy_list.filter(world_enemy).map(func(e): return e.id)
		for j in n:
			var a := TAU * j / n
			var p := player.global_position
			var ty: String = pool[j % pool.size()]
			var fly: bool = Datos.enemies.has(ty) and Datos.enemies[ty].get("flying", false)
			var el = Datos.elite_list[j % Datos.elite_list.size()].id if P.has("elite") else null
			spawn_enemy(ty, Vector3(p.x + cos(a) * 6, p.y + (2.0 if fly else 0.3), p.z + sin(a) * 6), {"force": true, "elite": el})
	if P.has("diario"):
		open_menu("misiones")
	if P.has("compendio"):
		open_menu("compendio")
	if P.has("pausa"):
		open_menu("sistema")
	if P.has("menu"):
		open_menu(str(P.menu))
	if P.has("perfiles") and state == "title":
		menus.show_profiles()
	if P.has("cine") and state == "play":
		cinema.play(str(P.cine))
		if P.has("cinet"):
			cinema.seek(float(P.cinet))
	if P.has("final"):
		later(0.3, show_ending)
	if P.has("tienda") and Datos.pnj.has(P.tienda) and state == "play":
		open_shop(str(P.tienda))
	if P.has("galaxia") and state == "play":
		open_galaxy()
	if P.get("hud", "1") == "0":
		hide_hud = true
		Hud.show_hud(false)

## Filtro de enemigos de cada mundo (los de las Islas no tienen "world").
func world_enemy(e: Dictionary) -> bool:
	var w = e.get("world")
	return (w == null) if world_id == "islas" else (w == world_id)

func later(sec: float, f: Callable) -> void:
	_timers.append([sec, f])

# ----------------------------------------------------------------------------------------------- estados
func start(_from_button := false, quiet := false) -> void:
	if state == "play":
		return
	menus.hide_all()
	state = "play"
	if not hide_hud:
		Hud.show_hud(true)
	if not quiet:
		welcome()

func welcome() -> void:
	var hub: Dictionary = regions[W.hub]
	if not loaded_pos:
		Hud.banner(hub.name, hub.sub)
	else:
		later(3.8, func(): Hud.toast("Partida de " + str(profile.name) + " cargada"))
	var guide: String = Datos.pnj[W.guide].name if W.get("guide") else "la Abuela Lechuza"
	var talked_guide: bool = talked.has(W.guide) if W.get("guide") else owl_done
	if not talked_guide and not args.has("ir") and not args.has("jefe"):
		later(2.5, func(): Hud.toast(k("Habla con %s (E) para empezar" % guide, "Acércate a %s y toca el botón ✋ para hablar" % guide)))

func play_story(id: String, then := Callable()) -> void:
	if id == "" or not story_on or story.seen.has(id):
		if then.is_valid():
			then.call()
		return
	story_queue.append({"id": id, "then": then})

func replay_story(id: String) -> void:
	if state != "menu" and state != "play":
		return
	close_menu()
	cinema.play(id)

## Estado de la historia para los diálogos (los mismos de data/pnj.json).
func story_state() -> String:
	if boss_done:
		return "vencido"
	if props.gate and props.gate.open:
		return "porton"
	var n := missions.fragments()
	return "f2" if n >= 2 else ("f1" if n >= 1 else "base")

# ----------------------------------------------------------------------------------------------- perfiles
func play_slot(n: int, name_: String, _from_button := false) -> void:
	if state != "title" or not n in Guardado.SLOTS:
		return
	var d = Guardado.read(n)
	if d == null:
		d = Guardado.blank(name_)
		Guardado.write(n, d)
	var target: String = d.world if Datos.mundos.worlds.has(d.get("world", "")) else "islas"
	if target != world_id:
		travel_reload({"slot": n, "world": target})
		return
	slot = n
	Guardado.restore(self, d)
	Juego.store_set("ultimoMundo", world_id)
	story_on = args.get("cine", "") != "0"
	var arriving: bool = Juego.viaje.get("arrive", false)
	var intro = story_on and not arriving and world_id == "islas" and not story.seen.has("prologo")
	start(false, intro or arriving)
	if intro:
		cinema.play("prologo", welcome)
	elif arriving:
		arrive(false)
	save_now(true)

func save_now(quiet := false) -> bool:
	if slot == 0 or state == "title" or state == "dead":
		return false
	var ok := Guardado.write(slot, Guardado.snapshot(self))
	save_t = 0.0
	if not quiet or not ok:
		Hud.saved(ok)
	return ok

func save_soon() -> void:
	save_t = maxf(save_t, AUTOSAVE - 1.5)

func arrive(test := false) -> void:
	if spots.get("rocketExit") != null:
		player.teleport(Utileria._v3(spots.rocketExit))
		cam.snap(player.global_position + Vector3(0, 0.55, 0))
	if spots.get("rocketExitYaw") != null:
		cam.yaw = float(spots.rocketExitYaw)
	loaded_pos = false
	var first := "llegada_" + world_id
	var sid := "aterrizaje" if story.seen.has(first) else first
	if not cinema.play(sid, welcome):
		welcome()

func save_and_quit() -> void:
	save_now(true)
	slot = 0
	Juego.volver_perfiles = true
	_reload()

func _reload() -> void:
	get_tree().paused = false
	get_tree().call_deferred("reload_current_scene")

# ----------------------------------------------------------------------------------------------- trajes
func wear_outfit(id) -> void:
	if id != null and not id in outfits.owned:
		return
	outfits.on = id if id != null and Datos.trajes_por_id.has(id) else null
	Trajes.apply(player.model, outfits.on)
	save_now(true)

func buy_outfit(id: String) -> bool:
	var o: Dictionary = Datos.trajes_por_id.get(id, {})
	if o.is_empty() or id in outfits.owned or sparks < float(o.price):
		return false
	if o.get("shop") != null and not (state == "tienda" and shop_npc == o.shop):
		return false
	sparks -= float(o.price)
	outfits.owned.append(id)
	wear_outfit(id)
	return true

# ----------------------------------------------------------------------------------------------- menú
func open_menu(tab := "") -> void:
	if state != "play" and state != "menu":
		return
	if state == "play":
		state = "menu"
		save_now(true)
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	menus.open_menu(tab)

func close_menu() -> void:
	if state != "menu":
		return
	state = "play"
	menus.close_menu()

func back_button() -> String:
	match state:
		"play":
			open_menu("sistema")
			return "pausa"
		"menu":
			close_menu()
			return "sigue"
		"dialog":
			advance_dialog()
			return "dialogo"
		"cine":
			cinema.finish(true)
			return "saltar"
		"tienda":
			close_shop()
			return "cerrar"
		"galaxia":
			close_galaxy()
			return "cerrar"
		"dead", "ending":
			return "nada"
	if menus.back():
		return "cerrar"
	return "salir"

func vibrate(ms: int) -> void:
	if settings.get("vibration", true) and is_touch():
		Input.vibrate_handheld(ms)

func see(cat: String, id: String) -> void:
	if not codex.has(cat):
		codex[cat] = []
	if id in codex[cat]:
		return
	codex[cat].append(id)
	Juego.save_codex()

# ----------------------------------------------------------------------------------------------- reglas
func diff_coef() -> float:
	return 1.0 + time / 110.0

func hp_scale() -> float:
	return 1.0 + 0.38 * (diff_coef() - 1.0)

func dmg_scale() -> float:
	return 1.0 + 0.22 * (diff_coef() - 1.0)

func progress() -> float:
	var frags := missions.fragments() if missions else 0
	return (diff_coef() - 1.0) * 0.9 + frags * 0.35 + (level - 1) * 0.08 + (2.0 if boss_done else 0.0)

func chest_cost(mult := 1.0) -> int:
	return maxi(1, roundi(25.0 * (1.0 + 0.3 * (diff_coef() - 1.0)) * mult * (1.0 - stats.chestDiscount)))

func xp_next() -> int:
	return roundi(40.0 * pow(level, 1.35))

func buff_mul(kind: String) -> float:
	var f: bool = buffs.frenzy > 0
	if kind == "atk":
		return 2.0 if f else 1.0
	if kind == "speed":
		return 1.4 if f else 1.0
	return 1.0

func recompute() -> void:
	var old: float = stats.maxHp if stats else 0.0
	stats = Datos.compute_stats(level, items)
	if old > 0 and stats.maxHp > old:
		hp += stats.maxHp - old
	hp = minf(hp, stats.maxHp)
	shield = minf(shield, stats.maxShield)
	if player:
		player.max_air_jumps = int(stats.airJumps)

func heal(v: float, quiet := false) -> void:
	var before := hp
	hp = minf(stats.maxHp, hp + v)
	if not quiet and hp - before > 1:
		Hud.number(player.center() + Vector3(0, 0.6, 0), hp - before, false, Color("#9fe3b0"))

func add_item(id: String, silent := false) -> void:
	items[id] = int(items.get(id, 0)) + 1
	recompute()
	if stats.maxShield > 0 and shield == 0:
		shield = stats.maxShield
	Hud.add_item(id, silent)
	see("item", id)
	if not silent:
		Sfx.play("item")
		vibrate(20)
		save_soon()

func equip_attack(v: Dictionary, silent := false) -> void:
	var old: Dictionary = arsenal.attack
	if not silent and not (old.id == "bellota" and int(old.tier) == 0):
		add_pickup(Combate.Pickup.new(self, "attack", player.center(), old.duplicate(), {"color": Datos.attacks[old.id].color, "halo": Datos.rarity[int(old.tier)].color, "wait_far": true, "vel": Vector3(0, 3, 0)}))
	arsenal.attack = {"id": v.id, "tier": int(v.tier)}
	see("attack", v.id)
	Hud.refresh_loadout()
	if not silent:
		Hud.popup("attack", v)
		Sfx.play("item")
		vibrate(25)
		save_soon()

func equip_power(id: String, silent := false) -> void:
	var old: String = arsenal.power
	if not silent and old != "lluvia":
		add_pickup(Combate.Pickup.new(self, "power", player.center(), old, {"color": Datos.powers[old].color, "wait_far": true, "vel": Vector3(0, 3, 0)}))
	arsenal.power = id
	skills.cd.special = 0.0
	see("power", id)
	Hud.refresh_loadout()
	if not silent:
		Hud.popup("power", id)
		Sfx.play("item")
		vibrate(25)
		save_soon()

func add_pickup(p) -> void:
	pickups.append(p)
	world.add_child(p)

func drop_item(pos: Vector3, rar_w: Array) -> void:
	var id := Datos.roll_item(rar_w)
	var it: Dictionary = Datos.items[id]
	add_pickup(Combate.Pickup.new(self, "item", pos, id, {"color": it.color, "halo": Datos.rarity[int(it.rar)].color, "vel": Vector3((randf() - 0.5) * 3, 6, (randf() - 0.5) * 3)}))

func open_chest_loot(chest) -> void:
	var d: Dictionary = chest.def
	var L: Dictionary = d.loot
	var p: Vector3 = chest.p + Vector3(0, 0.8, 0)
	var n: int = int(L.drops[0]) + randi() % (int(L.drops[1]) - int(L.drops[0]) + 1)
	if d.rule == "luck":
		n = 1 + Datos.pick_weighted([30, 30, 20, 13, 7])
	var vel := func(): return Vector3((randf() - 0.5) * 4, 6 + randf() * 2, (randf() - 0.5) * 4)
	for j in n:
		var first := j == 0
		if (first and float(L.attack) >= 1) or (not (first and float(L.power) >= 1) and randf() < float(L.attack)):
			var a := Datos.roll_attack(L.tier)
			add_pickup(Combate.Pickup.new(self, "attack", p, a, {"color": Datos.attacks[a.id].color, "halo": Datos.rarity[int(a.tier)].color, "vel": vel.call()}))
		elif (first and float(L.power) >= 1) or randf() < float(L.power):
			var id := Datos.roll_power()
			add_pickup(Combate.Pickup.new(self, "power", p, id, {"color": Datos.powers[id].color, "halo": "#ffffff", "vel": vel.call()}))
		else:
			var id := Datos.roll_item(L.item)
			add_pickup(Combate.Pickup.new(self, "item", p, id, {"color": Datos.items[id].color, "halo": Datos.rarity[int(Datos.items[id].rar)].color, "vel": vel.call()}))
	if L.get("refund", 0):
		var r := roundi(chest.cost() * float(L.refund))
		for j in 4:
			add_pickup(Combate.Pickup.new(self, "spark", p, r / 4.0))
	missions.event("chest")
	save_soon()
	if d.rule == "shadow":
		for j in 2:
			var a := randf() * TAU
			var pool := Datos.enemy_list.filter(func(e): return world_enemy(e) and not e.get("flying", false) and float(e.minDiff) <= maxf(1.6, diff_coef()) and e.ai != "golem")
			var ty: String = pool.pick_random().id
			spawn_enemy(ty, Vector3(chest.p.x + cos(a) * 4, chest.p.y + 0.3, chest.p.z + sin(a) * 4), {"elite": Datos.elite_list.pick_random().id})
		Hud.toast("¡El cofre sombrío despertó a dos enemigos élite!")
	vibrate(30)

func add_xp(v: float) -> void:
	xp += v * stats.xpMul
	while xp >= xp_next():
		xp -= xp_next()
		level += 1
		recompute()
		hp = stats.maxHp
		Sfx.play("level")
		Hud.toast("¡Nivel %d!" % level)
		Fx.burst(world, player.center(), Color("#9ce8d2"), 30, 4)
		vibrate(30)
		save_soon()

func collect(p) -> void:
	match p.type:
		"spark":
			sparks += float(p.value)
			Sfx.play("coin")
			if p.dust:
				missions.event("stardust")
				Fx.sparkle(world, p.global_position, Color("#fff4c8"), 6, 0.6)
		"xp":
			add_xp(float(p.value))
			Sfx.play("xp")
		"heal":
			heal(stats.maxHp * 0.15)
			Sfx.play("coin")
			Fx.burst(world, player.center(), Color("#ff9fb2"), 12, 2)
		"item":
			add_item(p.value)
		"attack":
			equip_attack(p.value)
		"power":
			equip_power(p.value)
		"fragment":
			Sfx.play("firefly")
			missions.event("altar")

# ----------------------------------------------------------------------------------------------- combate
func ray(o: Vector3, dir: Vector3, length: float, mask := 1):
	var space := get_world_3d().direct_space_state
	var q := PhysicsRayQueryParameters3D.create(o, o + dir.normalized() * length, mask)
	q.collide_with_areas = false
	var hit := space.intersect_ray(q)
	return null if hit.is_empty() else hit

func cam_forward() -> Vector3:
	return -cam.global_basis.z

func nearest_target(range_: float, max_angle := 0.0):
	var cp := cam.global_position
	var dir := cam_forward()
	var pl := player.center()
	var best = null
	var bd := range_
	for e in enemies:
		if e.dead or e.untargetable:
			continue
		var c: Vector3 = e.center()
		var d := c.distance_to(pl)
		if d > bd:
			continue
		if max_angle > 0 and (c - cp).normalized().angle_to(dir) > max_angle:
			continue
		if ray(pl, (c - pl).normalized(), maxf(0.1, d - 0.4), 1) != null:
			continue
		bd = d
		best = e
	return best

func aim_point() -> Vector3:
	var origin := cam.global_position
	var dir := cam_forward()
	var far := 90.0
	var hit = ray(origin, dir, far, 1 | 4 | 64)
	if hit:
		far = origin.distance_to(hit.position)
	var best = null
	var bt := far
	for e in enemies:
		if e.dead or e.untargetable:
			continue
		var c: Vector3 = e.center()
		var t := (c - origin).dot(dir)
		if t < 0 or t > bt:
			continue
		if (origin + dir * t).distance_to(c) < e.r + 0.15:
			best = e
			bt = t
	if best == null and is_touch():
		var e = nearest_target(30.0, 0.45)
		if e:
			Hud.cross_hit = true
			return e.center()
	Hud.cross_hit = best != null
	return origin + dir * bt

func power_target() -> Vector3:
	var pl := player.global_position
	if is_touch():
		var e = nearest_target(22.0)
		if e:
			return e.global_position
	var t := aim_point()
	if t.distance_to(pl) < 3.5:
		var f := Vector3(cam_forward().x, 0, cam_forward().z).normalized()
		t = pl + f * 6.0
		var hit = ray(Vector3(t.x, pl.y + 6, t.z), Vector3.DOWN, 14, 1)
		if hit:
			t.y = hit.position.y
	return t

func fire_primary(target = null) -> void:
	arsenal.fire(player.muzzle(), target if target != null else aim_point())

func add_player_shot(s) -> void:
	projectiles.append(s)
	world.add_child(s)

func add_projectile(p) -> void:
	projectiles.append(p)
	world.add_child(p)

func hit_with_shot(e, shot) -> void:
	arsenal.hit_shot(e, shot)

func tail_swipe() -> void:
	var c := player.center()
	var R := 2.2
	player.tail_t = 0.35
	Sfx.play("swipe")
	Fx.ring(world, player.global_position + Vector3(0, 0.25, 0), Color("#ffe0c0"), 22, 6)
	for e in enemies.duplicate():
		if e.dead or e.untargetable:
			continue
		if e.center().distance_to(c) < R + e.r:
			damage_enemy(e, stats.dmg * 2.2 * arsenal.tier_bonus(), {"knock": 9.0, "from": c, "up": 4.0, "proc": true})
	for p in projectiles:
		if p is Combate.EnemyOrb and not p.dead and p.global_position.distance_to(c) < R:
			p.dead = true
			Fx.burst(world, p.global_position, Color.WHITE, 6, 2)
	var pushers: Array = props.bells + props.crates + props.lanterns + props.crystals
	for o in pushers:
		var t: Vector3 = o.pos() if o is Utileria.Lantern else o.global_position
		var d := Vector3(t.x - c.x, 0, t.z - c.z)
		if d.length() < R + 0.6:
			if o.has_method("push"):
				o.push(d.normalized(), 2.2)
			elif o is RigidBody3D:
				o.apply_central_impulse((d.normalized() * 2.0 * 2.2 + Vector3(0, 1.2 * 2.2, 0)) * 0.11)
	vibrate(15)

func hit_enemy_segment(a: Vector3, b: Vector3, rad: float, skip := {}):
	var ab := b - a
	var len2 := maxf(1e-6, ab.length_squared())
	for e in enemies:
		if e.dead or e.untargetable or e.get("spawn_t") != null and e.spawn_t > 0.3 or skip.has(e):
			continue
		var c: Vector3 = e.center()
		var t := clampf((c - a).dot(ab) / len2, 0.0, 1.0)
		if (a + ab * t).distance_to(c) < e.r + rad:
			return e
	return null

func damage_enemy(e, dmg: float, o := {}) -> void:
	if e.dead or e.untargetable:
		return
	var st := stats
	if not e.is_boss and e.ai == "shielder" and o.has("from"):
		var f := Vector3(sin(e.yaw), 0, cos(e.yaw))
		var to: Vector3 = o.from - e.global_position
		to.y = 0
		if f.dot(to.normalized()) > 0.45:
			dmg *= 0.2
			if randf() < 0.5:
				Fx.burst(world, e.center() + f * e.r, Color("#c9cdf3"), 5, 2)
	if e.armor:
		dmg *= 1.0 - e.armor
	if not e.is_boss and e.slow_t > 0 and e.slow_k < 0.35 and st.frozenBonus:
		dmg *= 1.0 + st.frozenBonus
	if st.executeLow and e.hp < e.max_hp * 0.3:
		dmg *= 1.0 + st.executeLow
	e.hp -= dmg
	e.flash = 0.12
	Hud.number(e.center() + Vector3(0, e.hh + 0.2, 0), dmg, o.get("crit", false), o.get("color", null))
	if not o.get("quiet", false):
		Sfx.play("hit")
	if o.has("knock") and not e.is_boss and e.ai != "turret":
		var from: Vector3 = o.get("from", player.center())
		var d: Vector3 = e.center() - from
		d.y = 0
		d = d.normalized()
		var kk := 0.2 if e.ai in ["golem", "shielder"] else 1.0
		e.vel.x += d.x * float(o.knock) * kk
		e.vel.z += d.z * float(o.knock) * kk
		if o.has("up") and not e.flying:
			e.vel.y = float(o.up) * kk
	if e.hp <= 0:
		kill_enemy(e)
		return
	if o.has("effects") and o.effects is Dictionary:
		var eff: Dictionary = o.effects.duplicate()
		eff.proc = o.get("proc", true)
		arsenal.apply_effects(e, dmg, eff, o.get("from"))
	elif o.get("proc", false):
		arsenal.apply_effects(e, dmg, {"proc": true}, o.get("from"))

func kill_enemy(e) -> void:
	if e.dead:
		return
	e.dead = true
	kills += 1
	var c: Vector3 = e.center()
	var el = e.get("elite")
	var colors: Array = e.def.colors
	var golem: bool = not e.is_boss and e.ai == "golem"
	Enemigos.shatter(self, c, colors, 40 if e.is_boss else (26 if golem else 12), 0.2 if (e.is_boss or golem) else 0.08 * (0.7 if e.get("small") else 1.0))
	Fx.burst(world, c, Color(str(colors[1])), 20, 4)
	Sfx.play("kill")
	cam.shake = maxf(cam.shake, 1.0 if e.is_boss else (0.4 if golem else 0.06))
	if not e.is_boss:
		see("enemy", e.type)
		if el:
			see("elite", el.id)
	var summoned: bool = e.get("summoned") == true
	var mult := (2.5 if el else 1.0) * (0.5 if e.get("small") else 1.0)
	var sp = 0.0 if summoned else float(e.def.sparks) * stats.sparkMul * (0.8 + 0.4 * diff_coef()) * mult
	var ns := mini(24 if e.is_boss else 6, maxi(1, roundi(sp / 4.0))) if sp > 0 else 0
	for j in ns:
		add_pickup(Combate.Pickup.new(self, "spark", c, sp / ns))
	var nx := 20 if e.is_boss else (1 if summoned else 3)
	for j in nx:
		add_pickup(Combate.Pickup.new(self, "xp", c, float(e.def.xp) * mult * (0.3 if summoned else 1.0) / nx))
	if not summoned and randf() < 0.07:
		add_pickup(Combate.Pickup.new(self, "heal", c, 1))
	if stats.healOnKill:
		heal(stats.healOnKill, true)
	if not summoned and not e.is_boss and (golem or (el and randf() < 0.35) or (e.type == "totem" and randf() < 0.2)):
		drop_item(c, [0, 30, 45, 22, 3, 0] if golem else [50, 40, 10, 0, 0, 0])
	if not e.is_boss and e.ai == "splitter" and not e.small:
		for s in [-1.0, 1.0]:
			spawn_enemy("gelatina", e.global_position + Vector3(s * 0.6, 0.3, 0), {"small": true, "force": true})
	if el and el.id == "explosivo":
		Fx.ring(world, c, Color("#ffd36e"), 20, 3)
		var dm: float = float(e.def.dmg) * e.dmg_mul * 1.5
		later(0.45, func(): explode_at(c, 2.6, dm, Color("#ffd36e"), true))
	missions.event("kill", {"region": Palette.region_at(regions, e.global_position.x, e.global_position.z), "elite": el != null, "type": e.type})
	if e.is_boss:
		boss_defeated()

func spawn_enemy(type: String, pos: Vector3, o := {}):
	var e := Enemigos.Enemy.new(self, type, pos, o)
	if o.get("force", false):
		e.spawn_t = 0.3
	enemies.append(e)
	world.add_child(e)
	return e

func explode_at(p: Vector3, r: float, dmg: float, color: Color, hurts_player := false, effects = null) -> void:
	Fx.burst(world, p, color, 26, 6, 0.2, 0.8)
	Fx.ring(world, p, color, 18, r * 2)
	Sfx.play("hit")
	cam.shake = maxf(cam.shake, 0.12 + r * 0.02)
	for e in enemies.duplicate():
		if not e.dead and e.center().distance_to(p) < r + e.r:
			var eff = null
			if effects is Dictionary:
				eff = effects.duplicate()
				eff.merge({"splash": 0, "chain": 0, "voidHole": 0, "cloud": 0, "proc": false}, true)
			damage_enemy(e, dmg, {"knock": 5.0, "from": p, "up": 3.0, "proc": false, "quiet": true, "effects": eff})
	for o in props.crates + props.bells:
		var d: Vector3 = o.global_position - p
		if d.length() < r + 0.8:
			if o.has_method("push"):
				o.push(d.normalized(), 2.0)
			else:
				o.apply_central_impulse((Vector3(d.normalized().x * 4, 2.4, d.normalized().z * 4)) * 0.11)
	if hurts_player and player.center().distance_to(p) < r:
		hurt_player(dmg, p)

func stomp(p: Vector3, n: float) -> void:
	var r := 2.5 + n * 0.5
	Fx.ring(world, p + Vector3(0, 0.1, 0), Color("#e8a3c0"), 24, r * 2)
	cam.shake = maxf(cam.shake, 0.15)
	for e in enemies.duplicate():
		if not e.dead and e.global_position.distance_to(p) < r + e.r:
			damage_enemy(e, stats.dmg * 1.5 * n, {"knock": 6.0, "from": p, "up": 5.0, "proc": true})

func slam(p: Vector3, r: float, dmg: float, big := false) -> void:
	Fx.ring(world, p + Vector3(0, 0.1, 0), Color.WHITE, 40 if big else 24, 12 if big else 7)
	Fx.burst(world, p, Color("#e6d6f2"), 40 if big else 18, 7 if big else 4)
	cam.shake = maxf(cam.shake, 0.5 if big else 0.2)
	Sfx.play("rumble")
	var pp := player.global_position
	if Vector2(pp.x - p.x, pp.z - p.z).length() < r and absf(pp.y - p.y) < 1.4:
		if hurt_player(dmg, p):
			player.velocity.y = 7.0
	for o in props.crates:
		var t: Vector3 = o.global_position
		if Vector2(t.x - p.x, t.z - p.z).length() < r:
			o.apply_central_impulse(Vector3(t.x - p.x, 0, t.z - p.z).normalized() * 3.0 * 0.11 + Vector3(0, 1.8 * 0.11, 0))

func hurt_player(dmg: float, from = null, src = null) -> bool:
	var pl := player
	if pl.invuln > 0 or god or state != "play" or buffs.invuln > 0:
		return false
	if randf() < stats.dodge:
		pl.invuln = 0.4
		Hud.number(pl.center() + Vector3(0, 0.5, 0), "¡Esquivado!", false, Color("#bfe0ff"))
		return false
	var d = dmg * 100.0 / (100.0 + stats.armor)
	if src and stats.thorns and not src.dead:
		damage_enemy(src, d * stats.thorns * 2.0, {"proc": false, "color": Color("#d8b48a")})
	shield_cd = 4.0
	if shield > 0:
		var a := minf(shield, d)
		shield -= a
		d -= a
		Fx.burst(world, pl.center(), Color("#d7b8ff"), 8, 2)
		if shield <= 0 and stats.shieldNova:
			explode_at(pl.center(), 4.0, stats.dmg * 3.0, Color("#d7b8ff"), false, {"proc": false})
	if d > 0:
		hp -= d
	pl.invuln = 0.7
	pl.hurt_t = 0.7
	pl.model.hurt()
	if from != null:
		var kk: Vector3 = pl.center() - from
		kk.y = 0
		kk = kk.normalized()
		pl.velocity.x += kk.x * 6.0
		pl.velocity.z += kk.z * 6.0
		pl.velocity.y = maxf(pl.velocity.y, 3.0)
	Sfx.play("hurt")
	vibrate(45)
	cam.shake = maxf(cam.shake, 0.22)
	if d > 0:
		Hud.number(pl.center() + Vector3(0, 0.5, 0), d, false, Color("#ff8f8f"))
	if hp <= 0:
		die()
	return true

func die() -> void:
	if int(items.get("corazon", 0)) > 0 or int(items.get("fenix", 0)) > 0:
		var fenix: bool = int(items.get("fenix", 0)) > 0
		if fenix:
			items.fenix -= 1
		else:
			items.corazon -= 1
		recompute()
		Hud.refresh_items()
		hp = stats.maxHp * (1.0 if fenix else 0.6)
		player.invuln = 2.0
		Hud.toast("¡La Pluma de Fénix te devolvió la vida!" if fenix else "El Corazón de Nova te devolvió la vida")
		Fx.burst(world, player.center(), Color("#ff9a6b") if fenix else Color("#ff8fb0"), 40, 5)
		if fenix:
			explode_at(player.center(), 6.0, stats.dmg * 8.0, Color("#ff9a6b"), false, {"burn": 0.5, "proc": false})
		return
	state = "dead"
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	menus.show_dead()

func respawn() -> void:
	menus.hide_dead()
	player.teleport(Vector3(0.5, 0.6, 2.5))
	hp = stats.maxHp
	sparks = floorf(sparks / 2.0)
	for e in enemies:
		if not e.is_boss:
			e.dead = true
	state = "play"
	save_soon()

func splash() -> void:
	Fx.burst(world, player.center(), Color("#bfe8ff"), 26, 4, 0.16, 0.8)
	Sfx.play("swipe")
	player.teleport(player.last_safe)
	cam.snap(player.global_position + Vector3(0, 0.55, 0))
	Hud.toast("¡Splash! Pip no sabe nadar: vuelve a la orilla")

func fell_off() -> void:
	player.teleport(player.last_safe + Vector3(0, 0.3, 0))
	cam.snap(player.global_position + Vector3(0, 0.55, 0))
	if not god:
		hp -= stats.maxHp * 0.12
		Hud.toast("¡Uf! Pip vuelve a tierra firme")
		if hp <= 0:
			die()

func on_mission_complete(m: Dictionary, quiet := false) -> void:
	if quiet:
		return
	save_soon()
	Sfx.play("mission")
	Hud.banner("Misión secundaria cumplida" if m.type == "secundaria" else "Misión cumplida", m.title)
	vibrate(60)
	if m.get("reward") != null:
		sparks += 60
		var f := Vector3(cam_forward().x, 0, cam_forward().z).normalized()
		drop_item(player.center() + f * 1.2 + Vector3(0, 0.6, 0), m.reward)
		Hud.toast("Premio: +60 chispas y un objeto")
	if m.get("fragment", false):
		var n := missions.fragments()
		sparks += 40
		Hud.toast("Fragmento de %s obtenido (%d/%d)" % [W.star, n, int(W.fragSlots)])
		Fx.burst(world, player.center(), Color("#fff0b0"), 40, 5, 0.2, 1.2)
		if props.gate:
			props.gate.set_lights(mini(int(W.gateNeed), n))
		if props.nova:
			props.nova.set_lit(float(n) / float(W.fragSlots) * 0.5)
		later(1.6, func(): play_story(str(W.scenes.memory) + str(n)))
		if n >= int(W.gateNeed) and props.gate and not props.gate.open:
			props.gate.open_gate()
			later(1.5, func(): Hud.toast(W.texts.gateOpen))
			if missions.state.has(W.finalMission):
				missions.state[W.finalMission].discovered = true
			later(1.7, func(): play_story(str(W.scenes.gate)))

# ----------------------------------------------------------------------------------------------- jefe
func start_boss() -> void:
	if boss:
		return
	var a: Dictionary = spots.arena
	boss = Enemigos.Boss.new(self, Vector3(float(a.c[0]), float(a.get("y", 0.3)), float(a.c[1]) + 2), str(W.boss))
	enemies.append(boss)
	world.add_child(boss)
	Hud.banner(W.texts.bossName, W.texts.bossSub)
	play_story(str(W.scenes.boss))

func mark_boss_done(quiet := false) -> void:
	boss_done = true
	if props.nova:
		if quiet:
			props.nova.awake = 12.0
		else:
			props.nova.wake()
	if W.get("afterBossNight", false):
		sky.extra_night = 1.0
	if props.rocket:
		props.rocket.set_ready(true)

func boss_defeated() -> void:
	mark_boss_done(false)
	missions.event("boss")
	var a: Dictionary = spots.arena
	var ch := Utileria.Chest.new(self, {"pos": [float(a.c[0]) + 3, float(a.get("y", 0.6)), float(a.c[1]) - 2], "region": W.bossRegion, "type": "nova"})
	world.add_child(ch)
	props.chests.append(ch)
	save_soon()
	var fin: String = str(W.scenes.final)
	if story_on and not story.seen.has(fin):
		later(2.6, func(): play_story(fin, show_ending))
	else:
		later(6.5, show_ending)

func show_ending() -> void:
	state = "ending"
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var T: Dictionary = W.texts
	var s := int(time)
	var n_items := 0
	for id in items:
		n_items += int(items[id])
	menus.show_ending(T.endKicker, T.endTitle, "Tiempo: %d min %d s · Nivel %d · %d sombras · %d objetos\n%s" % [s / 60, s % 60, level, kills, n_items, T.endText])

func continue_after_ending() -> void:
	menus.hide_ending()
	state = "play"
	save_soon()
	var order: Array = Datos.mundos.order
	var nxt := order.find(world_id) + 1
	var tip := func(): Hud.toast("El Cohete Avellana te espera: súbete para viajar a otra galaxia" if nxt < order.size() else "Puedes volver a cualquier galaxia en el Cohete Avellana")
	if W.scenes.get("rocket"):
		play_story(str(W.scenes.rocket), tip)
	else:
		later(0.8, tip)

# ----------------------------------------------------------------------------------------------- interacción
func nearest_interactable():
	var p := player.global_position
	var best = null
	var bd := 1.8
	for c in props.chests:
		if c.opened:
			continue
		var d: float = c.p.distance_to(p)
		if d < bd:
			bd = d
			best = {"type": "chest", "obj": c}
	for n in props.npcs:
		var d := Vector2(n.p.x - p.x, n.p.z - p.z).length()
		if d < 2.2 and d < bd + 0.4:
			bd = d
			best = {"type": "npc", "obj": n}
	if props.owl and Vector2(props.owl.p.x - p.x, props.owl.p.z - p.z).length() < 2.3:
		best = {"type": "owl"}
	if props.rocket and props.rocket.ready_ and Vector2(props.rocket.p.x - p.x, props.rocket.p.z - p.z).length() < 3.2:
		best = {"type": "rocket"}
	for x in props.extras:
		if x.has_method("can_use") and x.can_use(p):
			best = {"type": "extra", "obj": x}
	return best

func interact_label(it: Dictionary) -> Array:
	match it.type:
		"chest":
			return ["Abrir: " + it.obj.label(), "Abrir"]
		"owl":
			return ["Hablar con la Abuela Lechuza", "Hablar"]
		"rocket":
			return ["Subir al Cohete Avellana", "Subir"]
		"extra":
			return [it.obj.label, it.obj.btn]
	var d: Dictionary = it.obj.def
	var shop: bool = d.get("shop", false) == true
	return ["Tienda de " + d.name if shop else "Hablar con " + d.name, "Tienda" if shop else "Hablar"]

func interact(it: Dictionary) -> void:
	match it.type:
		"chest":
			var ch = it.obj
			if ch.def.rule == "blood":
				if hp <= stats.maxHp * 0.3:
					Sfx.play("deny")
					Hud.toast("Te falta vida para pagar el Cofre de Sangre")
					return
				hp -= stats.maxHp * 0.25
				Fx.burst(world, player.center(), Color("#c95a6a"), 16, 3)
				ch.open()
				return
			var cost: int = ch.cost()
			if sparks >= cost:
				sparks -= cost
				ch.open()
			else:
				Sfx.play("deny")
				Hud.toast("Necesitas %d chispas" % cost)
		"owl":
			var first := not owl_done
			var H: Dictionary = Datos.historia
			var lines: Array = H.owl_intro if first else H.owl[story_state()]
			open_dialog("Abuela Lechuza", lines, func():
				owl_done = true
				missions.discover_all()
				save_soon()
				if first or missions.tracked == null:
					later(0.3, func(): open_menu("misiones")))
		"npc":
			var n = it.obj
			var d: Dictionary = n.def
			open_dialog("%s, %s" % [d.name, d.title], n.lines(), func():
				var first := not talked.has(n.id)
				talked[n.id] = 1
				if W.get("guide") == n.id:
					missions.discover_all()
					if first or missions.tracked == null:
						later(0.3, func(): open_menu("misiones"))
				if d.get("shop", false) == true:
					later(0.15, func(): open_shop(n.id))
				save_soon())
		"rocket":
			open_galaxy()
		"extra":
			it.obj.use()

func open_dialog(who: String, lines: Array, after := Callable()) -> void:
	dialog = {"who": who, "lines": lines, "i": 0, "after": after}
	state = "dialog"
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	menus.show_dialog(who, lines[0], k("Haz clic o pulsa E para continuar", "Toca para continuar"))
	Sfx.play("select")

func advance_dialog() -> void:
	if dialog == null:
		return
	dialog.i += 1
	if dialog.i >= dialog.lines.size():
		menus.hide_dialog()
		state = "play"
		var after: Callable = dialog.after
		dialog = null
		if after.is_valid():
			after.call()
		return
	menus.show_dialog(dialog.who, dialog.lines[dialog.i], k("Haz clic o pulsa E para continuar", "Toca para continuar"))
	Sfx.play("select")

func open_shop(npc_id: String) -> void:
	if state != "play":
		return
	state = "tienda"
	shop_npc = npc_id
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	menus.show_shop(npc_id)

func close_shop() -> void:
	if state != "tienda":
		return
	menus.hide_shop()
	state = "play"
	shop_npc = null

# ----------------------------------------------------------------------------------------------- galaxias y viajes
func done_worlds() -> Array:
	var out := []
	for id in world_states:
		var ws = world_states[id]
		if ws is Dictionary and ws.get("world", {}).get("boss", 0):
			out.append(id)
	if boss_done and not world_id in out:
		out.append(world_id)
	return out.filter(func(id): return Datos.mundos.worlds.has(id))

func previous_world(id: String) -> String:
	var order: Array = Datos.mundos.order
	var i := order.find(id)
	return order[i - 1] if i > 0 else ""

func can_travel(id: String) -> bool:
	var prev := previous_world(id)
	return prev == "" or prev in done_worlds()

func open_galaxy() -> void:
	if state != "play":
		return
	state = "galaxia"
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	menus.show_galaxy()

func close_galaxy() -> void:
	if state != "galaxia":
		return
	menus.hide_galaxy()
	state = "play"

func travel_to(dest: String) -> void:
	if not Datos.mundos.worlds.has(dest) or dest == world_id or not can_travel(dest):
		return
	close_galaxy()
	var slot0 := slot
	var go := func():
		if slot:
			save_now(true)
			var d = Guardado.read(slot)
			if d:
				d.world = dest
				Guardado.write(slot, d)
		slot = 0
		travel_reload({"slot": slot0, "world": dest, "arrive": true})
	if not cinema.play("viaje_" + dest, go, {"dest": dest}):
		go.call()

func travel_reload(info: Dictionary) -> void:
	Juego.viaje = info
	var w: Dictionary = Datos.mundos.worlds[info.world]
	menus.show_loading("Viajando a la %s…" % w.galaxy if info.get("arrive", false) else "Cargando %s…" % w.name)
	if not info.get("slot", 0):
		# partida de prueba: se viaja con los mismos atajos
		Juego.args_override = {"auto": "1", "mundo": info.world}
		if info.get("arrive", false):
			Juego.args_override.llegada = "1"
		if args.has("ojos"):
			Juego.args_override.ojos = args.ojos
	later(0.06, _reload)

# ----------------------------------------------------------------------------------------------- director de enemigos
func wave_size(c := -1.0) -> int:
	if c < 0:
		c = diff_coef()
	return roundi(48.0 * (1.0 + 0.3 * (c - 1.0)))

func update_waves(dt: float) -> void:
	for id in waves:
		var w: Dictionary = waves[id]
		var here = region == id
		var nm: String = regions[id].name if regions.has(id) else id
		if w.state == "fin":
			w.wait += dt
			if w.wait > WAVE_WAIT or not enemies.any(func(e): return not e.dead and e.get("zone") == id):
				w.state = "calma"
				w.calm = WAVE_CALM
				if here:
					Hud.toast("%s queda en calma… por ahora" % nm)
					Sfx.play("calma")
		elif w.state == "calma":
			w.calm -= dt
			if w.calm <= 0:
				w.state = "ola"
				w.calm = 0.0
				w.pool = float(wave_size())
				if here:
					Hud.toast("Las sombras vuelven a %s" % nm)
					Sfx.play("oleada")

func run_director(dt: float) -> void:
	var D := director
	update_waves(dt)
	D.t -= dt
	var zone = null
	for z in spots.get("spawnZones", []):
		if z.region == region:
			zone = z
	if zone == null:
		return
	var w: Dictionary = waves[zone.region]
	if w.state != "ola":
		return
	var c := diff_coef()
	D.credits = minf(40.0, D.credits + dt * (0.9 + 0.5 * c))
	if D.t > 0 or time < 12:
		return
	D.t = 1.3
	var alive := enemies.filter(func(e): return not e.dead and not e.is_boss).size()
	if alive >= roundi(4 + 2 * c):
		return
	var able := Datos.enemy_list.filter(func(e): return world_enemy(e) and float(e.minDiff) <= c and float(e.cost) * float(e.get("group", 1)) * 0.6 <= D.credits)
	if able.is_empty():
		return
	var def: Dictionary = able[Datos.pick_weighted(able.map(func(e): return float(e.weight)))]
	var elite_chance := 0.0 if c < 1.8 else minf(0.35, (c - 1.8) * 0.12)
	var elite = Datos.elite_list.pick_random().id if def.ai != "golem" and randf() < elite_chance else null
	var pl := player.global_position
	for tries in 6:
		var a := randf() * TAU
		var r := 9.0 + randf() * 12.0
		var x2 := pl.x + cos(a) * r
		var z2 := pl.z + sin(a) * r
		if Vector2(x2 - float(zone.c[0]), z2 - float(zone.c[1])).length() > float(zone.r):
			continue
		var hit = ray(Vector3(x2, pl.y + 14, z2), Vector3.DOWN, 30, 1)
		if hit == null or absf(hit.position.y - pl.y) > 7:
			continue
		var n := int(def.get("group", 1))
		for j in n:
			var off := Vector3((randf() - 0.5) * 2, 0, (randf() - 0.5) * 2) if j else Vector3.ZERO
			spawn_enemy(def.id, hit.position + off + Vector3(0, 2.5 if def.get("flying", false) else 0.05, 0), {"elite": elite if j == 0 else null, "zone": zone.region})
		var spent := float(def.cost) * n * (2.5 if elite else 1.0)
		D.credits -= spent
		w.pool -= spent
		if w.pool <= 0:
			w.pool = 0.0
			w.state = "fin"
			w.wait = 0.0
		if def.ai == "golem":
			Hud.toast("¡%s se acerca!" % def.name)
		elif elite:
			Hud.toast("¡%s %s cerca!" % [def.name, Datos.elites[elite].name])
		return

# ----------------------------------------------------------------------------------------------- música
func music_update(dt: float) -> void:
	_music_t -= dt
	if _music_t > 0:
		return
	var elapsed := 0.4 - _music_t
	_music_t = 0.4
	Sfx.duck(0.45 if state == "menu" else 1.0)
	if state == "cine":
		return
	var pick := _music_choose(elapsed)
	if pick.is_empty():
		Sfx.score_stop(2.0)
	else:
		Sfx.score(pick[0], pick[1])

func _music_choose(elapsed: float) -> Array:
	if state == "title":
		return ["cuento", 0] if menus.profiles_open() else []
	if state == "dead":
		return []
	if state == "ending":
		return ["esperanza", 0]
	if boss and not boss.dead and not boss_done:
		return ["jefe", 0]
	var pl := player.global_position
	var near := 0
	var close := 0
	var danger := false
	for e in enemies:
		if e.dead or e.is_boss or e.untargetable:
			continue
		var d: float = e.global_position.distance_to(pl)
		if (e.elite or e.ai == "golem") and d < 24:
			danger = true
		if d < 16:
			near += 1
		if d < 9:
			close += 1
	if danger:
		_fight = 7.0
		return ["peligro", 0]
	if near >= 2 or close >= 1:
		_fight = 7.0
	else:
		_fight = maxf(0.0, _fight - elapsed)
	if _fight > 0:
		return ["combate", 0]
	var mus: Dictionary = W.get("music", {})
	var key := int(mus.get("keys", {}).get(region, 0))
	if sky.night > 0.55:
		return [mus.get("night", "noche"), key]
	return [mus.get("day", "dia"), key]

# ----------------------------------------------------------------------------------------------- día y noche
func day_phase() -> float:
	return fposmod((time + day_shift) / DAY_CYCLE + 0.05, 1.0)

static func _smooth01(x: float) -> float:
	x = clampf(x, 0.0, 1.0)
	return x * x * (3.0 - 2.0 * x)

static func night_of(ph: float) -> float:
	if ph < 0.55:
		return 0.0
	if ph < 0.63:
		return _smooth01((ph - 0.55) / 0.08)
	if ph < 0.92:
		return 1.0
	return 1.0 - _smooth01((ph - 0.92) / 0.08)

static func dusk_of(ph: float) -> float:
	return maxf(0.0, maxf(1.0 - absf(ph - 0.585) / 0.06, 1.0 - absf(ph - 0.955) / 0.06))

func update_day() -> void:
	var ph := day_phase()
	sky.cycle_night = night_of(ph)
	sky.cycle_dusk = dusk_of(ph)
	var night := sky.cycle_night > 0.5
	if is_night != null and night != is_night and state == "play":
		Hud.toast(W.texts.get("nightFall", "Cae la noche sobre las islas") if night else W.texts.get("dawn", "Amanece en las islas"))
		Sfx.play("anochecer" if night else "amanecer")
	var reg_night: bool = regions.has(region) and regions[region].night > 0.5
	Hud.set_night(night or reg_night)
	is_night = night

# ----------------------------------------------------------------------------------------------- ciclo
func _process(dt: float) -> void:
	dt = minf(dt, 0.1)
	for tm in _timers.duplicate():
		if state == "play" or state == "title" or state == "ending" or state == "cine" or state == "menu":
			tm[0] -= dt
		if tm[0] <= 0:
			_timers.erase(tm)
			tm[1].call()
	get_tree().paused = state != "play"
	# escenas en espera: empiezan cuando Pip pisa el suelo
	if state == "play" and story_queue.size() and player.grounded and not cinema.playing:
		var s: Dictionary = story_queue.pop_front()
		cinema.play(s.id, s.then)
	if state == "title":
		cam.add_look(dt * 0.08, 0)
	music_update(dt)
	sky.update_sky(dt, cam.global_position if state == "cine" else player.global_position, Time.get_ticks_msec() / 1000.0)
	update_day()
	var beam_on: bool = state == "play" and str(arsenal.def().kind) == "beam" and (inp.held.primary or (is_touch() and settings.get("autofire", true) and auto_target != null))
	arsenal.update_beam(dt, beam_on, player.muzzle(), (aim_point() if inp.held.primary else (auto_target.center() if auto_target else Vector3.ZERO)) if beam_on else Vector3.ZERO)

func _physics_process(dt: float) -> void:
	if state == "play":
		step(dt)
	inp.pressed = {}

func step(dt: float) -> void:
	var pressed: Dictionary = inp.pressed
	time += dt
	skills.update(dt)
	var pl := player
	buffs.invuln = maxf(0.0, buffs.invuln - dt)
	buffs.frenzy = maxf(0.0, buffs.frenzy - dt)
	if buffs.healOverTime > 0:
		buffs.healOverTime -= dt
		heal(buffs.healRate * dt, true)
	if time_slow_t > 0:
		time_slow_t -= dt
	# disparo: manual o automático (táctil)
	auto_target = null
	if is_touch() and settings.get("autofire", true) and not inp.held.primary:
		auto_target = nearest_target(20.0)
	var firing: bool = inp.held.primary or auto_target != null
	aim_hold = 0.6 if firing else maxf(0.0, aim_hold - dt)
	if firing and str(arsenal.def().kind) != "beam" and skills.ready("primary"):
		skills.use("primary")
		fire_primary(null if inp.held.primary else auto_target.center())
	if auto_target and not inp.held.primary:
		var d: Vector3 = auto_target.center() - pl.global_position
		pl.face_yaw = atan2(d.x, d.z)
	else:
		pl.face_yaw = null
	pl.aiming = inp.held.primary or aim_hold > 0
	if pressed.get("secondary", false) and skills.ready("secondary"):
		skills.use("secondary")
		tail_swipe()
	if pressed.get("special", false) and skills.ready("special"):
		skills.use("special")
		arsenal.use_power()
	if pressed.get("track", false):
		var ids: Array = missions.state.keys().filter(func(id): return missions.state[id].discovered and not missions.state[id].done)
		if ids.size():
			missions.tracked = ids[(ids.find(missions.tracked) + 1) % ids.size()]
			Hud.refresh_missions()
	arsenal.step(dt)
	# vida, escudo, quemadura de élites y hoguera
	var st := stats
	hp = minf(st.maxHp, hp + st.regen * dt)
	if st.maxShield > 0:
		shield_cd -= dt
		if shield_cd <= 0:
			shield = minf(st.maxShield, shield + st.maxShield * 0.25 * dt)
	if pl.burn_t > 0:
		pl.burn_t -= dt
		if not god and buffs.invuln <= 0:
			hp -= 3.0 * dmg_scale() * dt
		if randf() < 0.3:
			Fx.puff(world, pl.global_position + Vector3(0, 0.3, 0), Color("#ff9a5c"), 1)
		if hp <= 0:
			die()
	if props.campfire and pl.global_position.distance_to(props.campfire.p) < 2.6:
		hp = minf(st.maxHp, hp + st.maxHp * 0.12 * dt)
	# agua honda: Pip no sabe nadar
	for x in props.extras:
		if x.has_method("is_inside") and x.is_inside(pl.global_position):
			splash()
			break
	run_director(dt)
	# limpieza
	for e in enemies.duplicate():
		if e.dead:
			enemies.erase(e)
			e.remove()
	for p in projectiles.duplicate():
		if p.dead:
			projectiles.erase(p)
			p.remove()
	for p in pickups.duplicate():
		if p.dead:
			pickups.erase(p)
			p.remove()
	debris = debris.filter(func(d): return is_instance_valid(d) and not d.dead)
	# regiones
	var reg := Palette.region_at(regions, pl.global_position.x, pl.global_position.z)
	if reg != "" and reg != region:
		region = reg
		Hud.banner(regions[reg].name, regions[reg].sub)
		if reg != W.hub:
			missions.discover(reg)
		missions.event("region", reg)
	# jefe
	var ar = spots.get("arena")
	if ar and props.gate and props.gate.open and boss == null and not boss_done and Vector2(pl.global_position.x - float(ar.c[0]), pl.global_position.z - float(ar.c[1])).length() < float(ar.get("trigger", 13)):
		start_boss()
	# guardado automático (con los pies en el suelo)
	save_t += dt
	if save_t >= AUTOSAVE and pl.grounded:
		save_now()
	# interacción
	var it = nearest_interactable()
	if it:
		var lab := interact_label(it)
		Hud.prompt(k("E · " + lab[0], lab[0]), lab[1])
		if pressed.get("interact", false):
			interact(it)
	else:
		Hud.prompt("", "")

## Entradas de los botones (los manda Controls o la interfaz táctil).
func press(action: String) -> void:
	inp.pressed[action] = true
	match action:
		"pause":
			if state == "menu":
				close_menu()
			elif state == "tienda":
				close_shop()
			elif state == "galaxia":
				close_galaxy()
			elif state == "play":
				open_menu("sistema")
		"journal":
			if state == "menu":
				close_menu()
			elif state == "play":
				open_menu()
		"mute":
			toggle_mute()
		"interact", "jump":
			if state == "dialog":
				advance_dialog()

func toggle_mute() -> void:
	Sfx.set_muted(not Sfx.muted)
	Hud.refresh_mute()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_APPLICATION_FOCUS_OUT or what == NOTIFICATION_WM_CLOSE_REQUEST:
		save_now(true)
	if what == NOTIFICATION_WM_GO_BACK_REQUEST:
		if back_button() == "salir":
			get_tree().quit()
