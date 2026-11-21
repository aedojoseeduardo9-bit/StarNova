## Star Nova — controles: teclado y ratón, mandos (PlayStation, Xbox…) y táctil, en acciones abstractas.
## Se crean las acciones al arrancar (así no dependen del editor) y cada cuadro se pasan a Pip y a la cámara.
class_name Controls
extends Node

var player: Player
var cam: CameraRig
var touch_mode := false
var sens := 1.0

static func setup_actions() -> void:
	var keys := {
		"mover_izq": [KEY_A, KEY_LEFT], "mover_der": [KEY_D, KEY_RIGHT],
		"mover_adelante": [KEY_W, KEY_UP], "mover_atras": [KEY_S, KEY_DOWN],
		"saltar": [KEY_SPACE], "voltereta": [KEY_SHIFT], "pausa": [KEY_ESCAPE],
	}
	for a in keys:
		if not InputMap.has_action(a):
			InputMap.add_action(a, 0.2)
		for k in keys[a]:
			var e := InputEventKey.new()
			e.physical_keycode = k
			InputMap.action_add_event(a, e)
	var pad := {"saltar": [JOY_BUTTON_A], "voltereta": [JOY_BUTTON_B, JOY_BUTTON_RIGHT_SHOULDER], "pausa": [JOY_BUTTON_START]}
	for a in pad:
		for bt in pad[a]:
			var e := InputEventJoypadButton.new()
			e.button_index = bt
			InputMap.action_add_event(a, e)
	var axes := {"mover_izq": [JOY_AXIS_LEFT_X, -1.0], "mover_der": [JOY_AXIS_LEFT_X, 1.0], "mover_adelante": [JOY_AXIS_LEFT_Y, -1.0], "mover_atras": [JOY_AXIS_LEFT_Y, 1.0]}
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
	return OS.has_feature("android") or OS.has_feature("ios") or OS.has_feature("web_android") or OS.has_feature("web_ios")

func set_touch(on: bool) -> void:
	touch_mode = on
	Hud.set_touch(on)
	if on:
		Hud.set_hint("")
	else:
		Hud.set_hint("WASD o flechas para moverte · Espacio: saltar (doble salto) · Shift: voltereta · haz clic para mover la cámara con el ratón")

func _unhandled_input(e: InputEvent) -> void:
	if touch_mode:
		return
	if e is InputEventMouseButton and e.pressed:
		if e.button_index == MOUSE_BUTTON_LEFT and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		elif e.button_index == MOUSE_BUTTON_WHEEL_UP:
			cam.zoom(-1)
		elif e.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			cam.zoom(1)
	elif e is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		cam.add_look(e.relative.x * 0.0024 * sens, e.relative.y * 0.0024 * sens)
	elif e.is_action_pressed("pausa") and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _process(dt: float) -> void:
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
		# cámara que acompaña al moverse de lado (como en la web)
		if absf(mv.x) > 0.25 and l == Vector2.ZERO:
			cam.add_look(mv.x * 1.1 * dt, 0)
	player.input_move = mv
	player.hold_jump = hold
	if jump:
		player.want_jump = true
	if dash:
		player.want_dash = true
