## Star Nova — "los ojos" de la versión nativa: capturas + pruebas automáticas, como tools/ojos.cjs en la web.
## Uso: godot --path godot -- --ojos=CARPETA --ojos_set=islas|gemini|soledad   (lo hace godot/tools/ojos_nativo.sh).
## Cada juego de pruebas escribe report_<set>.txt; una línea con "FALLO" hace fallar el trabajo de CI.
class_name Ojos
extends Node

var main: Node
var out_dir: String
var set_id := "islas"
var report := PackedStringArray()
var fails := 0
var n_shot := 0

func _init(m: Node, dir: String) -> void:
	name = "Ojos"
	main = m
	out_dir = dir
	process_mode = Node.PROCESS_MODE_ALWAYS

func _ready() -> void:
	DirAccess.make_dir_recursive_absolute(out_dir)
	set_id = str(main.args.get("ojos_set", main.world_id))
	_run.call_deferred()

func _frames(n: int) -> void:
	for i in n:
		await get_tree().process_frame

func _secs(s: float) -> void:
	await get_tree().create_timer(s, true, false, true).timeout

func _cam(yaw: float, pitch: float, dist: float) -> void:
	var c: CameraRig = main.cam
	c.yaw = yaw
	c.pitch = pitch
	c.want = dist
	c.cur = dist

func _shot(file: String) -> void:
	await _frames(10)
	var img := get_viewport().get_texture().get_image()
	var name_ := "%s_%02d_%s" % [set_id, n_shot, file]
	n_shot += 1
	img.save_png(out_dir.path_join(name_ + ".png"))
	report.append("[%s] fps ~%d · dibujos %d · enemigos %d · estado %s" % [name_, Engine.get_frames_per_second(),
		RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME), main.enemies.size(), main.state])

func _tap(action: String, hold := 0.0) -> void:
	var e := InputEventAction.new()
	e.action = action
	e.pressed = true
	Input.parse_input_event(e)
	await _frames(2)
	if hold > 0:
		await _secs(hold)
	var r := InputEventAction.new()
	r.action = action
	r.pressed = false
	Input.parse_input_event(r)

func _check(ok: bool, what: String) -> void:
	if not ok:
		fails += 1
	report.append(what + (" → OK" if ok else " → FALLO"))

func _go(place: String, yaw := INF, pitch := 0.32, dist := 5.5) -> void:
	var pl: Player = main.player
	var p = main.W.places.get(place)
	if p == null:
		return
	pl.teleport(Utileria._v3(p))
	main.cam.snap(pl.global_position + Vector3(0, 0.55, 0))
	if yaw == INF:
		yaw = float(main.W.get("placeYaw", {}).get(place, main.cam.yaw))
	_cam(yaw, pitch, dist)
	await _secs(0.9)

func _play_ready() -> void:
	if main.state == "cine" or main.cinema.scene != null:
		main.cinema.finish(true)
	if main.state == "dialog":
		main.menus.hide_dialog()
		main.dialog = null
		main.state = "play"
	if main.state == "menu":
		main.close_menu()
	if main.state != "play":
		main.start(false, true)
	main.story_queue.clear()
	await _frames(3)

func _run() -> void:
	await _secs(0.5)
	match set_id:
		"islas": await _islas()
		"gemini": await _gemini()
		"soledad": await _soledad()
	await _escenas()
	report.append("Pruebas con fallos (%s): %d" % [set_id, fails])
	var fa := FileAccess.open(out_dir.path_join("report_%s.txt" % set_id), FileAccess.WRITE)
	fa.store_string("Star Nova nativo — informe de los ojos (%s) · Godot %s\n%s\n" % [set_id, Engine.get_version_info().string, "\n".join(report)])
	fa.close()
	print("\n".join(report))
	get_tree().quit(1 if fails > 0 else 0)

# ----------------------------------------------------------------------------------------------- Islas del Cielo
func _islas() -> void:
	var pl: Player = main.player
	# título y perfiles
	if main.state == "title":
		await _shot("titulo")
		main.menus.show_profiles()
		await _shot("perfiles")
		# partida nueva en la ranura 3: empieza con el prólogo
		Guardado.remove(3)
		main.play_slot(3, "Ojos")
		await _secs(0.4)
		_check(main.slot == 3 and main.state == "cine", "[prueba_perfil] perfil nuevo en la ranura 3 y empieza el prólogo (estado %s)" % main.state)
		main.cinema.seek(24.0)
		await _shot("prologo")
		await _play_ready()
	else:
		await _play_ready()
	main.god = true
	main.story_on = false
	await _go("claro", 0.5, 0.35, 7.0)
	await _shot("claro")
	# pruebas de movimiento (las mismas de la etapa 1)
	_cam(0, 0.35, 4.2)
	pl.teleport(Vector3(0, 0.6, 5))
	await _secs(0.6)
	var a := pl.global_position
	Input.action_press("mover_adelante")
	await _secs(1.5)
	Input.action_release("mover_adelante")
	var moved := Vector2(pl.global_position.x - a.x, pl.global_position.z - a.z).length()
	_check(moved > 1.0, "[prueba_mover] avanzó %.2f m (esperado > 1)" % moved)
	await _secs(0.4)
	var y0 := pl.global_position.y
	_tap("saltar", 0.18)
	await _secs(0.22)
	_tap("saltar", 0.2)
	await _secs(0.22)
	_check(pl.global_position.y - y0 > 0.8, "[prueba_salto] doble salto: subió %.2f m (esperado > 0.8)" % (pl.global_position.y - y0))
	await _secs(1.2)
	var c := pl.global_position
	_tap("voltereta")
	await _secs(0.35)
	var dashed := Vector2(pl.global_position.x - c.x, pl.global_position.z - c.z).length()
	_check(dashed > 1.5, "[prueba_voltereta] recorrió %.2f m (esperado > 1.5)" % dashed)
	# hablar con la lechuza (da las misiones)
	pl.teleport(Utileria._v3(main.spots.owl) + Vector3(0.8, -1.1, 1.2))
	_cam(2.6, 0.25, 3.5)
	await _secs(0.6)
	var it = main.nearest_interactable()
	_check(it != null and it.type == "owl", "[prueba_lechuza] la lechuza está al alcance")
	if it:
		main.interact(it)
		await _secs(0.3)
		await _shot("dialogo_lechuza")
		while main.state == "dialog":
			main.advance_dialog()
			await _frames(1)
		await _secs(0.6)
		_check(main.owl_done and main.state == "menu", "[prueba_misiones] tras la lechuza se abre el menú de misiones (estado %s)" % main.state)
		await _shot("menu_misiones")
		main.missions.track("campanas")
		main.close_menu()
	# disparar a enemigos
	pl.teleport(Vector3(0, 0.6, 8))
	_cam(0, 0.3, 5)
	await _secs(0.4)
	for i in 3:
		main.spawn_enemy("sombra", Vector3(-1.5 + i * 1.5, 0.6, 3.0), {"force": true})
	await _secs(0.6)
	var k0: int = main.kills
	# disparo automático del modo táctil: apunta solo al enemigo más cercano
	main.controls.set_touch(true)
	var t0 := 0.0
	while main.kills - k0 < 2 and t0 < 8.0:
		await _secs(0.5)
		t0 += 0.5
	main.controls.set_touch(false)
	_check(main.kills > k0, "[prueba_disparo] Pip derrotó %d sombras a bellotazos (disparo automático)" % (main.kills - k0))
	await _shot("combate")
	await _secs(1.5)
	# cofre: abrir con chispas y recoger el botín
	main.sparks = 500
	var ch = main.props.chests[0]
	pl.teleport(ch.p + Vector3(0, 0.6, 1.2))
	_cam(0, 0.4, 4)
	await _secs(0.5)
	var pk0: int = main.pickups.size()
	it = main.nearest_interactable()
	if it and it.type == "chest":
		main.interact(it)
	await _secs(0.4)
	_check(main.pickups.size() > pk0, "[prueba_botin] el cofre soltó su botín (%d cosas)" % (main.pickups.size() - pk0))
	await _shot("cofre_abierto")
	await _secs(2.5)
	_check(ch.opened, "[prueba_cofre] el cofre se abrió")
	# campana: suena al golpearla y avanza la misión
	var b = main.props.bells[0]
	b.ring()
	await _frames(2)
	_check(main.missions.state.campanas.progress >= 1, "[prueba_campana] la campana sonó y la misión avanzó (%d/3)" % main.missions.state.campanas.progress)
	await _go("coral")
	await _shot("coral")
	await _go("menta")
	await _shot("menta")
	await _go("lavanda")
	await _shot("lavanda")
	# todos los cofres
	for j in main.props.chests.size():
		main.props.chests[j].set_type(Datos.chest_list[j % Datos.chest_list.size()].id)
	await _go("claro", 0.8, 0.45, 9.0)
	await _shot("cofres")
	# enemigos variados y élites
	main.args["elite"] = "1"
	var types := ["sombra", "farol", "totem", "erizo", "vigia", "bomba", "gelatina", "muro"]
	pl.teleport(Vector3(0, 0.6, 6))
	_cam(0.3, 0.32, 7.5)
	for j in types.size():
		var aa := TAU * j / types.size()
		var el = Datos.elite_list[j % Datos.elite_list.size()].id if j % 3 == 0 else null
		main.spawn_enemy(types[j], Vector3(cos(aa) * 4.5, 0.6 + (2.0 if Datos.enemies[types[j]].get("flying", false) else 0.0), 6 + sin(aa) * 4.5), {"force": true, "elite": el})
	await _secs(1.2)
	await _shot("enemigos")
	for e in main.enemies:
		e.dead = true
	await _secs(0.5)
	# menú: todas las páginas
	main.add_item("pluma")
	main.add_item("pluma")
	main.add_item("trebol")
	for t in Menus.TABS:
		main.open_menu(t)
		await _secs(0.4)
		await _shot("menu_" + t)
	main.close_menu()
	# guardado: se escribe y se lee igual
	main.sparks = 321.0
	main.save_now(true)
	var d = Guardado.read(3)
	_check(d != null and int(d.sparks) == 321 and d.world == "islas" and d.worlds.islas.missions.campanas[0] >= 1, "[prueba_guardado] el perfil guardó chispas, mundo y misiones")
	# código de partida (el mismo formato que da la web): exportar y volver a importar
	var code: String = main.menus.export_code()
	var libres := Guardado.SLOTS.filter(func(n): return Guardado.read(n) == null)
	var r := Menus.import_code(code)
	var imp = Guardado.read(libres[0]) if libres.size() else null
	_check(r == "" and imp != null and int(imp.sparks) == 321, "[prueba_codigo] el código de partida se importa en una ranura libre (%s)" % (r if r != "" else "ok"))
	if libres.size():
		Guardado.remove(libres[0])
	# jefe: santuario abierto
	for m in ["campanas", "luciernagas", "puente"]:
		main.missions.complete(m)
	main.story_queue.clear()
	await _secs(2.5)
	await _play_ready()
	main.props.gate.snap_open()
	await _go("santuario")
	pl.teleport(Vector3(0, 0.6, 58))
	await _secs(1.5)
	await _play_ready()
	_check(main.boss != null, "[prueba_jefe] el Guardián aparece al entrar al santuario")
	await _secs(1.0)
	await _play_ready()
	_cam(0, 0.25, 7)
	await _secs(1.5)
	await _shot("jefe_guardian")
	# muerte y vuelta
	await _play_ready()
	main.god = false
	main.items.erase("corazon")
	main.items.erase("fenix")
	main.hp = 1.0
	pl.invuln = 0.0
	main.hurt_player(50.0, null)
	await _secs(0.3)
	_check(main.state == "dead", "[prueba_muerte] al quedarse sin vida aparece la pantalla de desmayo")
	await _shot("desmayo")
	main.respawn()
	await _secs(0.5)
	main.god = true
	main.show_ending()
	await _secs(0.3)
	await _shot("final")
	main.continue_after_ending()
	await _play_ready()
	# controles táctiles
	main.controls.set_touch(true)
	await _go("claro", 0.5, 0.35, 5.0)
	await _shot("tactil")
	main.controls.set_touch(false)
	Guardado.remove(3)

# ----------------------------------------------------------------------------------------------- Verdalia
func _gemini() -> void:
	await _play_ready()
	main.god = true
	for p in ["pradera", "bosque", "lago", "cascada", "rio", "raices"]:
		await _go(p)
		await _shot(p)
	var pl: Player = main.player
	# agua: Pip no sabe nadar y vuelve a la orilla
	var lago = main.W.places.get("lago")
	await _go("pradera")
	pl.global_position = Vector3(0, 0.0, -60)
	await _secs(1.5)
	_check(pl.global_position.distance_to(Vector3(0, 0, -60)) > 2.0, "[prueba_agua] en el lago Pip vuelve a la orilla")
	await _go("pradera")
	main.open_shop("musgo")
	await _secs(0.5)
	await _shot("tienda_musgo")
	main.close_shop()
	main.sparks = 999
	main.state = "tienda"
	main.shop_npc = "musgo"
	var excl: Array = Datos.trajes.filter(func(o): return o.get("shop") == "musgo")
	var ok: bool = excl.size() > 0 and main.buy_outfit(excl[0].id)
	main.state = "play"
	main.shop_npc = null
	_check(ok and main.outfits.on == excl[0].id, "[prueba_traje] se compró y se puso un traje exclusivo de la tienda")
	await _go("pradera", 2.4, 0.2, 2.2)
	await _shot("traje_puesto")
	main.wear_outfit(null)
	main.open_galaxy()
	await _secs(0.4)
	await _shot("galaxia")
	main.close_galaxy()
	main.spawn_enemy("musguito", pl.global_position + Vector3(2, 0.5, -3), {"force": true})
	main.spawn_enemy("abejorro", pl.global_position + Vector3(-2, 2.5, -3), {"force": true})
	main.spawn_enemy("zarza", pl.global_position + Vector3(0, 0.5, -4), {"force": true})
	await _secs(1.0)
	await _shot("enemigos_bosque")

# ----------------------------------------------------------------------------------------------- Prismara
func _soledad() -> void:
	await _play_ready()
	main.god = true
	for p in ["muelle", "mercurio", "anillos", "planetoide", "aurora", "trono"]:
		await _go(p)
		await _shot(p)
	var pl: Player = main.player
	# Impulsor Cometa: vuelo en arco
	await _go("impulsor")
	var it = main.nearest_interactable()
	_check(it != null and it.type == "extra", "[prueba_impulsor] el impulsor está al alcance")
	if it:
		var z0 := pl.global_position.z
		main.interact(it)
		await _secs(0.7)
		await _shot("vuelo_impulsor")
		await _secs(1.5)
		_check(pl.global_position.z < z0 - 8.0, "[prueba_impulsor] Pip voló hasta el planetoide (z %.1f)" % pl.global_position.z)

# ----------------------------------------------------------------------------------------------- escenas
func _escenas() -> void:
	await _play_ready()
	main.story_on = true
	var ids: Array = []
	for id in CineEscenas.IDS:
		var w := "islas"
		if id.begins_with("gemini") or id == "viaje_soledad" or id == "llegada_gemini":
			w = "gemini"
		if id.begins_with("soledad") or id == "llegada_soledad":
			w = "soledad"
		if id in ["viaje_gemini", "cohete"]:
			w = "islas"
		if id == "aterrizaje" or id.ends_with("puerta") or id == "porton":
			w = main.world_id if (id == "aterrizaje" or (id == "porton" and main.world_id == "islas") or id.begins_with(main.world_id)) else "-"
		if w == main.world_id:
			ids.append(id)
	var shots := {"prologo": 0, "porton": 6.0, "final": 14.0, "cohete": 12.0, "viaje_gemini": 20.0, "viaje_soledad": 20.0, "llegada_gemini": 9.0,
		"llegada_soledad": 9.0, "gemini_final": 17.0, "soledad_final": 20.0, "gemini_jefe": 6.0, "soledad_jefe": 6.0, "recuerdo1": 7.0}
	var bad := 0
	for id in ids:
		await _play_ready()
		var pl: Player = main.player
		pl.teleport(Utileria._v3(main.spots.spawn))
		await _frames(3)
		var p0 := pl.global_position
		var f0: int = main.missions.fragments()
		if not main.cinema.play(id):
			report.append("[prueba_escenas] %s no empezó → FALLO" % id)
			bad += 1
			continue
		if shots.has(id) and shots[id] > 0:
			main.cinema.seek(shots[id])
			await _shot("escena_" + id)
		else:
			main.cinema.seek(3.0)
			await _frames(2)
		main.cinema.finish(true)
		await _frames(3)
		var ok: bool = main.state == "play" and pl.global_position.distance_to(p0) < 0.05 and main.sky.deep_night == 0.0 and main.sky.space == 0.0 and main.missions.fragments() == f0
		if not ok:
			bad += 1
			report.append("[prueba_escenas] %s dejó el mundo cambiado (estado %s, Pip a %.2f m, noche %.1f, espacio %.1f) → FALLO" % [id, main.state, pl.global_position.distance_to(p0), main.sky.deep_night, main.sky.space])
	_check(bad == 0, "[prueba_escenas] %d escenas de %s se ven y dejan el mundo como estaba" % [ids.size(), main.world_id])
	if bad:
		fails += bad - 1
