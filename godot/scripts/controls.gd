## Star Nova — controles: teclado y ratón, mandos (PlayStation, Xbox…) y táctil, en acciones abstractas.
## Se crean las acciones al arrancar (así no dependen del editor) y cada cuadro se pasan a Pip y a la cámara.
class_name Controls
extends Node

var player: Player
var cam: CameraRig
var game = null
var touch_mode := false
var sens := 1.0

static func setup_actions() -> void:
	var keys := {
		"mover_izq": [KEY_A, KEY_LEFT], "mover_der": [KEY_D, KEY_RIGHT],
		"mover_adelante": [KEY_W, KEY_UP], "mover_atras": [KEY_S, KEY_DOWN],
		"saltar": [KEY_SPACE], "voltereta": [KEY_SHIFT], "pausa": [KEY_ESCAPE, KEY_P],
		"disparar": [KEY_J], "coletazo": [KEY_Q, KEY_F, KEY_K], "poder": [KEY_R], "interactuar": [KEY_E, KEY_ENTER],
		"menu": [KEY_TAB], "silencio": [KEY_M], "seguir": [KEY_T], "pagina_izq": [KEY_Q, KEY_LEFT], "pagina_der": [KEY_E, KEY_RIGHT],
	}
	for a in keys:
		if not InputMap.has_action(a):
			InputMap.add_action(a, 0.2)
		for k in keys[a]:
			var e := InputEventKey.new()
			e.physical_keycode = k
			InputMap.action_add_event(a, e)
	var pad := {"saltar": [JOY_BUTTON_A], "voltereta": [JOY_BUTTON_B], "pausa": [JOY_BUTTON_START],
		"coletazo": [JOY_BUTTON_X], "poder": [JOY_BUTTON_Y], "interactuar": [JOY_BUTTON_RIGHT_SHOULDER], "menu": [JOY_BUTTON_BACK],
		"seguir": [JOY_BUTTON_DPAD_UP], "pagina_izq": [JOY_BUTTON_LEFT_SHOULDER], "pagina_der": [JOY_BUTTON_RIGHT_SHOULDER]}
	for a in pad:
		for bt in pad[a]:
			var e := InputEventJoypadButton.new()
			e.button_index = bt
			InputMap.action_add_event(a, e)
	var axes := {"mover_izq": [JOY_AXIS_LEFT_X, -1.0], "mover_der": [JOY_AXIS_LEFT_X, 1.0], "mover_adelante": [JOY_AXIS_LEFT_Y, -1.0], "mover_atras": [JOY_AXIS_LEFT_Y, 1.0], "disparar": [JOY_AXIS_TRIGGER_RIGHT, 1.0]}
	for a in axes:
		var e := InputEventJoypadMotion.new()
		e.axis = axes[a][0]
		e.axis_value = axes[a][1]
		InputMap.action_add_event(a, e)

func _init(p: Player, c: CameraRig) -> void:
	name = "Controles"
	player = p
	cam = c

## ¿Es un teléfono o tableta? (en la app de Android/iOS o con pantalla táctil sin ratón)
static func is_touch_device() -> bool:
	return OS.has_feature("android") or OS.has_feature("ios")

func set_touch(on: bool) -> void:
	touch_mode = on
	Hud.set_touch(on)
	Hud.set_hint("")

var mouse_fire := false

func _unhandled_input(e: InputEvent) -> void:
	if touch_mode or e.device == InputEvent.DEVICE_ID_EMULATION:
		return
	var playing: bool = game == null or game.state == "play"
	if e is InputEventMouseButton and e.button_index == MOUSE_BUTTON_LEFT and not e.pressed:
		mouse_fire = false
	if e is InputEventMouseButton and e.pressed:
		if e.button_index == MOUSE_BUTTON_LEFT and game and game.state == "dialog":
			game.advance_dialog()
		elif e.button_index == MOUSE_BUTTON_LEFT and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			if playing:
				Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		elif e.button_index == MOUSE_BUTTON_LEFT:
			mouse_fire = true
		elif e.button_index == MOUSE_BUTTON_WHEEL_UP:
			cam.zoom(-1)
		elif e.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			cam.zoom(1)
	elif e is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		cam.add_look(e.relative.x * 0.0024 * sens, e.relative.y * 0.0024 * sens)
	elif e.is_action_pressed("pausa") and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED and game == null:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _process(dt: float) -> void:
	if game:
		sens = float(game.settings.get("sens", 1.0))
		for pair in [["pausa", "pause"], ["menu", "journal"], ["silencio", "mute"]]:
			if Input.is_action_just_pressed(pair[0]):
				game.press(pair[1])
		if game.state == "dialog" and (Input.is_action_just_pressed("interactuar") or Input.is_action_just_pressed("saltar")):
			game.advance_dialog()
			return
		if game.state == "menu":
			if Input.is_action_just_pressed("pagina_izq"):
				game.menus.flip(-1)
			elif Input.is_action_just_pressed("pagina_der"):
				game.menus.flip(1)
		if game.state != "play":
			player.input_move = Vector2.ZERO
			if game.state == "cine":
				game.cinema.holding = Input.is_action_pressed("pausa")
			return
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED and game.state == "play" and Input.is_action_just_pressed("pausa"):
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var mv := Input.get_vector("mover_izq", "mover_der", "mover_atras", "mover_adelante")
	var jump := Input.is_action_just_pressed("saltar")
	var hold := Input.is_action_pressed("saltar")
	var dash := Input.is_action_just_pressed("voltereta")
	# mando: palanca derecha para la cámara
	var rx := Input.get_joy_axis(0, JOY_AXIS_RIGHT_X)
	var ry := Input.get_joy_axis(0, JOY_AXIS_RIGHT_Y)
	if absf(rx) > 0.15 or absf(ry) > 0.15:
		cam.add_look(rx * 2.6 * dt * sens, ry * 1.8 * dt * sens)
	var tu := Hud.touch
	if touch_mode and tu:
		if tu.move.length() > mv.length():
			mv = tu.move
		jump = jump or tu.jump_pressed
		hold = hold or tu.jump_held
		dash = dash or tu.dash_pressed
		tu.jump_pressed = false
		tu.dash_pressed = false
		var l := tu.take_look()
		cam.add_look(l.x * 0.0062 * sens, l.y * 0.0062 * sens)
		# cámara que acompaña al moverse de lado
		if absf(mv.x) > 0.25 and not tu.looking() and (game == null or game.settings.get("camAssist", true)):
			cam.add_look(mv.x * 1.1 * dt, 0)
		if game:
			for a in tu.take_pressed():
				game.press(a)
			game.inp.held.primary = tu.held.get("primary", false)
	if game and not touch_mode:
		game.inp.held.primary = mouse_fire or Input.is_action_pressed("disparar")
		for pair in [["coletazo", "secondary"], ["poder", "special"], ["interactuar", "interact"], ["seguir", "track"]]:
			if Input.is_action_just_pressed(pair[0]):
				game.press(pair[1])
	player.input_move = mv
	player.hold_jump = hold
	if jump:
		player.want_jump = true
	if dash:
		player.want_dash = true
