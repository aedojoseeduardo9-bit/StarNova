## Star Nova — escenas animadas ("videos" hechos con el propio mundo del juego).
## Una escena es una lista de planos: {t, cam: {p: [desde, hasta], l: [desde, hasta], fov, linear}, say, music, on, tick}.
## Mientras dura, el juego queda en estado "cine" (el mundo en pausa salvo lo que la escena anima), con franjas,
## subtítulos y un botón en la esquina: mantenerlo apretado salta la escena (en PC también Esc).
## Regla: las escenas NO cambian la partida: usan actores temporales (ctx.add) y deshacen lo que tocan (ctx.undo).
class_name Cine
extends Node

const HOLD := 0.9

var game
var scene = null
var ctx: CineCtx
var playing := false
var holding := false
var hold := 0.0
var shake_k := 0.0
var fov0 := 62.0
var ui: CanvasLayer
var bar_top: ColorRect
var bar_bot: ColorRect
var who_label: Label
var line_label: Label
var text_box: PanelContainer
var title_box: VBoxContainer
var title_k: Label
var title_t: Label
var skip_btn: Control
var flash_rect: ColorRect
var _title_t := 0.0
var _bars := 0.0
var _flash := 0.0
var _flash_dur := 0.6
var _p := Vector3.ZERO
var _l := Vector3.ZERO

func _init(g) -> void:
	game = g
	name = "Cine"
	process_mode = Node.PROCESS_MODE_ALWAYS

func _ready() -> void:
	ui = CanvasLayer.new()
	ui.layer = 15
	add_child(ui)
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(root)
	flash_rect = ColorRect.new()
	flash_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	flash_rect.color = Color(1, 1, 1, 0)
	root.add_child(flash_rect)
	bar_top = ColorRect.new()
	bar_bot = ColorRect.new()
	for b in [bar_top, bar_bot]:
		b.color = Color(0.08, 0.05, 0.12, 1)
		b.mouse_filter = Control.MOUSE_FILTER_IGNORE
		root.add_child(b)
	text_box = PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.1, 0.07, 0.16, 0.0)
	text_box.add_theme_stylebox_override("panel", sb)
	text_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(text_box)
	var tv := VBoxContainer.new()
	tv.mouse_filter = Control.MOUSE_FILTER_IGNORE
	text_box.add_child(tv)
	who_label = Label.new()
	who_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	who_label.add_theme_font_override("font", Hud.serif)
	who_label.add_theme_font_size_override("font_size", 20)
	who_label.add_theme_color_override("font_color", Color("#ffd9a0"))
	tv.add_child(who_label)
	line_label = Label.new()
	line_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	line_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	line_label.add_theme_font_size_override("font_size", 21)
	line_label.add_theme_color_override("font_color", Color("#fff8f0"))
	line_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.6))
	line_label.add_theme_constant_override("shadow_offset_y", 2)
	tv.add_child(line_label)
	title_box = VBoxContainer.new()
	title_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(title_box)
	title_k = Label.new()
	title_k.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_k.add_theme_font_size_override("font_size", 14)
	title_k.add_theme_color_override("font_color", Color("#ffd9a0"))
	title_box.add_child(title_k)
	title_t = Label.new()
	title_t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_t.add_theme_font_override("font", Hud.serif)
	title_t.add_theme_font_size_override("font_size", 40)
	title_t.add_theme_color_override("font_color", Color.WHITE)
	title_t.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.5))
	title_t.add_theme_constant_override("shadow_offset_y", 3)
	title_box.add_child(title_t)
	skip_btn = Control.new()
	skip_btn.mouse_filter = Control.MOUSE_FILTER_STOP
	skip_btn.gui_input.connect(func(e):
		if e is InputEventMouseButton and e.button_index == MOUSE_BUTTON_LEFT:
			holding = e.pressed
		elif e is InputEventScreenTouch:
			holding = e.pressed)
	skip_btn.draw.connect(_draw_skip)
	root.add_child(skip_btn)
	ui.visible = false

func _draw_skip() -> void:
	var c := skip_btn.size / 2.0
	var r := minf(c.x, c.y) - 2
	skip_btn.draw_circle(c, r, Color(1, 1, 1, 0.22))
	skip_btn.draw_arc(c, r, 0, TAU, 36, Color(1, 1, 1, 0.6), 2.0, true)
	var k := minf(1.0, hold / HOLD)
	if k > 0:
		skip_btn.draw_arc(c, r - 3, -PI / 2, -PI / 2 + TAU * k, 36, Color("#ffd36e"), 4.0, true)
	var s := r * 0.32
	for o in [-s * 0.6, s * 0.6]:
		skip_btn.draw_colored_polygon(PackedVector2Array([c + Vector2(o - s * 0.5, -s), c + Vector2(o + s * 0.6, 0), c + Vector2(o - s * 0.5, s)]), Color(1, 1, 1, 0.9))

func _layout() -> void:
	var vs := ui.get_viewport().get_visible_rect().size
	var h := vs.y * 0.11 * _bars
	bar_top.position = Vector2(0, 0)
	bar_top.size = Vector2(vs.x, h)
	bar_bot.position = Vector2(0, vs.y - h)
	bar_bot.size = Vector2(vs.x, h)
	text_box.size = Vector2(minf(900, vs.x - 40), 0)
	text_box.position = Vector2((vs.x - text_box.size.x) / 2, vs.y - h - 18 - text_box.get_combined_minimum_size().y)
	title_box.size = Vector2(vs.x, 0)
	title_box.position = Vector2(0, vs.y * 0.18)
	var bs := clampf(vs.y * 0.09, 44, 70)
	skip_btn.size = Vector2(bs, bs)
	skip_btn.position = Vector2(vs.x - bs - 18, 14)

static func ez(k: float) -> float:
	return k * k * (3.0 - 2.0 * k)

func has_scene(id: String) -> bool:
	return CineEscenas.has(id)

## Pone una escena. Devuelve false si no existe (y llama a then igual).
func play(id: String, then := Callable(), arg := {}) -> bool:
	if scene != null or not CineEscenas.has(id):
		if then.is_valid():
			then.call()
		return false
	ctx = CineCtx.new(game, self)
	var shots: Array = CineEscenas.build(id, ctx, arg)
	if shots.is_empty():
		ctx.cleanup()
		ctx = null
		if then.is_valid():
			then.call()
		return false
	scene = {"id": id, "shots": shots, "i": -1, "t": 0.0, "then": then}
	fov0 = game.cam.fov
	hold = 0.0
	holding = false
	playing = true
	game.state = "cine"
	Hud.clear()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	ui.visible = true
	var chapter = null
	for c in Datos.historia.chapters:
		if c.id == id:
			chapter = c
	title_k.text = chapter.n.to_upper() if chapter else ""
	title_t.text = chapter.title if chapter else ""
	_title_t = 3.4
	_next()
	return true

func _next() -> void:
	var S: Dictionary = scene
	S.i += 1
	S.t = 0.0
	if S.i >= S.shots.size():
		finish(false)
		return
	var shot: Dictionary = S.shots[S.i]
	if shot.has("music"):
		Sfx.score(shot.music, 0)
	if shot.has("on"):
		shot.on.call()
	_caption(shot.get("say"))
	_apply_cam(shot, 0.0)

func _caption(say) -> void:
	var who := ""
	var text := ""
	if say is Array:
		who = str(say[0])
		text = str(say[1])
	elif say != null:
		text = str(say)
	who_label.text = who
	who_label.visible = who != ""
	line_label.text = text
	text_box.visible = text != ""

func _apply_cam(shot: Dictionary, k: float) -> void:
	if not shot.has("cam"):
		return
	var c: Dictionary = shot.cam
	var e := k if c.get("linear", false) else ez(k)
	var p: Array = c.p
	_p = p[0].lerp(p[1] if p.size() > 1 else p[0], e)
	if shot.has("look"):
		_l = shot.look.call()
	else:
		var l: Array = c.l
		_l = l[0].lerp(l[1] if l.size() > 1 else l[0], e)
	var cam: Camera3D = game.cam
	var pos := _unblock(_p, _l)
	if shake_k > 0:
		pos += Vector3(randf() - 0.5, randf() - 0.5, randf() - 0.5) * shake_k
	cam.global_position = pos
	if not pos.is_equal_approx(_l):
		cam.look_at(_l, Vector3.UP)
	var f: float = (c.fov[0] + (c.fov[1] - c.fov[0]) * e) if c.has("fov") else fov0
	cam.fov = f

## Si la cámara de la escena quedó dentro de un muro o justo detrás de una torre (pasaba en algunas escenas, sobre
## todo con la arquitectura HD), se acerca al personaje hasta quedar delante del obstáculo. Solo mira los últimos
## metros junto a la cámara: los planos lejanos que pasan por detrás de una isla no cambian.
func _unblock(p: Vector3, l: Vector3) -> Vector3:
	var to := l - p
	var d := to.length()
	if d < 0.5:
		return p
	var dir := to / d
	var near := minf(d - 0.3, 7.0)
	if near <= 0.2:
		return p
	var hit = game.ray(p + dir * near, -dir, near, 1)
	if hit == null:
		return p
	return hit.position + dir * 0.35

func flash_screen(color: Color, dur := 0.6) -> void:
	flash_rect.color = color
	_flash = 1.0
	_flash_dur = dur

func _process(dt: float) -> void:
	_bars = move_toward(_bars, 1.0 if playing else 0.0, dt * 2.5)
	if ui.visible:
		_layout()
		skip_btn.queue_redraw()
	if not playing and _bars <= 0.0 and ui.visible:
		ui.visible = false
	if _flash > 0:
		_flash = maxf(0.0, _flash - dt / _flash_dur)
		flash_rect.color.a = _flash
	_title_t = maxf(0.0, _title_t - dt)
	title_box.modulate.a = clampf(minf(_title_t, 3.4 - _title_t) * 2.0, 0.0, 1.0)
	if scene == null:
		return
	update(dt, Time.get_ticks_msec() / 1000.0, dt)

func update(dt: float, t: float, real: float) -> void:
	var S = scene
	if S == null:
		return
	if shake_k > 0:
		shake_k = maxf(0.0, shake_k - dt * 0.8)
	var h := holding or Input.is_action_pressed("pausa")
	hold = hold + real if h else maxf(0.0, hold - real * 2.0)
	if hold >= HOLD:
		finish(true)
		return
	var shot: Dictionary = S.shots[S.i]
	S.t += dt
	var k := minf(1.0, S.t / float(shot.t))
	if shot.has("tick"):
		shot.tick.call(k, dt, t)
	for fn in ctx.always_fns:
		fn.call(dt, t)
	_apply_cam(shot, k)
	ctx.pip_update(dt)
	if S.t >= float(shot.t):
		_next()

## Adelanta la escena hasta el segundo indicado (para pruebas y capturas).
func seek(secs: float) -> void:
	var t := 0.0
	while t < secs and scene != null:
		update(1.0 / 30.0, Time.get_ticks_msec() / 1000.0 + t, 0.0)
		t += 1.0 / 30.0
	_title_t = 0.0
	game.sky.night = maxf(game.sky.night, game.sky.deep_night)

func finish(skipped: bool) -> void:
	var S = scene
	if S == null:
		return
	scene = null
	playing = false
	hold = 0.0
	holding = false
	shake_k = 0.0
	_flash = 0.0
	flash_rect.color.a = 0.0
	ctx.cleanup()
	ctx = null
	Sfx.score_stop(2.0)
	_title_t = 0.0
	text_box.visible = false
	game.cam.fov = fov0
	game.cam.snap(game.player.global_position + Vector3(0, 0.55, 0))
	game.player.invuln = maxf(game.player.invuln, 1.5)
	game.state = "play"
	game.story.seen[S.id] = 1
	game.save_soon()
	var then: Callable = S.then
	if then.is_valid():
		then.call()
