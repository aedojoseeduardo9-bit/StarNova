## Star Nova — controles táctiles (teléfono en horizontal), como en la web: joystick flotante con zona muerta en la
## mitad izquierda, arrastrar en la derecha para mirar y botones con ícono y recarga: saltar, disparar, coletazo,
## voltereta, poder y "✋" para interactuar (solo aparece cuando hay algo cerca). Nunca se muestran teclas de PC.
class_name TouchUI
extends Control

const DEAD := 0.12
const RADIUS := 70.0

var game = null
var move := Vector2.ZERO          ## x: derecha, y: adelante
var look := Vector2.ZERO          ## arrastre acumulado (píxeles) para la cámara
var jump_pressed := false
var jump_held := false
var dash_pressed := false
var held := {}                    ## botones apretados (primary…)
var pressed := {}                 ## botones tocados este cuadro (secondary, special, interact…)

var _stick_id := -1
var _stick_origin := Vector2.ZERO
var _stick_pos := Vector2.ZERO
var _look_id := -1
var _look_last := Vector2.ZERO
var _btn_ids := {}
var _icons := {}
var _font: SystemFont

func _init() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_font = SystemFont.new()
	_font.font_weight = 700

func refresh_icons() -> void:
	if game == null:
		return
	_icons.primary = Datos.icon("atq_" + str(game.arsenal.attack.id))
	_icons.special = Datos.icon("pod_" + str(game.arsenal.power))
	queue_redraw()

func _buttons() -> Dictionary:
	var s := get_viewport_rect().size
	var r: float = clampf(s.y * 0.085, 34.0, 60.0)
	var j := Vector2(s.x - r * 1.6, s.y - r * 1.7)
	var b := {
		"jump": {"c": j, "r": r * 1.15},
		"primary": {"c": j + Vector2(-r * 2.6, -r * 0.35), "r": r * 1.0},
		"secondary": {"c": j + Vector2(-r * 2.2, -r * 2.5), "r": r * 0.78},
		"utility": {"c": j + Vector2(-r * 4.6, r * 0.35), "r": r * 0.78},
		"special": {"c": j + Vector2(-r * 0.15, -r * 2.75), "r": r * 0.82},
	}
	if game and game.has_method("nearest_interactable") and Hud.prompt_btn != "":
		b["interact"] = {"c": j + Vector2(-r * 4.4, -r * 2.3), "r": r * 0.9}
	return b

func _hit(p: Vector2) -> String:
	var b := _buttons()
	for id in b:
		if p.distance_to(b[id].c) < b[id].r * 1.15:
			return id
	return ""

func _input(e: InputEvent) -> void:
	if not visible:
		return
	if e is InputEventScreenTouch:
		var t := e as InputEventScreenTouch
		if t.pressed:
			var btn := _hit(t.position)
			if btn != "":
				_btn_ids[t.index] = btn
				if btn == "jump":
					jump_pressed = true
					jump_held = true
				elif btn == "utility":
					dash_pressed = true
				elif btn == "primary":
					held.primary = true
				else:
					pressed[btn] = true
				get_viewport().set_input_as_handled()
			elif t.position.x < get_viewport_rect().size.x * 0.45 and _stick_id == -1:
				_stick_id = t.index
				_stick_origin = t.position
				_stick_pos = t.position
			elif _look_id == -1:
				_look_id = t.index
				_look_last = t.position
		else:
			if _btn_ids.has(t.index):
				if _btn_ids[t.index] == "jump":
					jump_held = false
				elif _btn_ids[t.index] == "primary":
					held.primary = false
				_btn_ids.erase(t.index)
			if t.index == _stick_id:
				_stick_id = -1
				move = Vector2.ZERO
			if t.index == _look_id:
				_look_id = -1
		queue_redraw()
	elif e is InputEventScreenDrag:
		var d := e as InputEventScreenDrag
		if d.index == _stick_id:
			_stick_pos = d.position
			var v := (_stick_pos - _stick_origin) / RADIUS
			if v.length() > 1.0:
				v = v.normalized()
			var l := v.length()
			v = Vector2.ZERO if l < DEAD else v.normalized() * ((l - DEAD) / (1.0 - DEAD))
			move = Vector2(v.x, -v.y)
			queue_redraw()
		elif d.index == _look_id:
			look += d.position - _look_last
			_look_last = d.position

func take_look() -> Vector2:
	var l := look
	look = Vector2.ZERO
	return l

func looking() -> bool:
	return _look_id != -1

func take_pressed() -> Dictionary:
	var p := pressed
	pressed = {}
	return p

func _process(_dt: float) -> void:
	if visible:
		queue_redraw()

func _draw() -> void:
	var b := _buttons()
	var soft := Color(1, 0.98, 0.96, 0.62)
	var ink := Color("#6a5060")
	for id in b:
		var c: Vector2 = b[id].c
		var r: float = b[id].r
		draw_circle(c + Vector2(0, 3), r, Color(0.35, 0.2, 0.3, 0.18))
		draw_circle(c, r, soft)
		draw_arc(c, r, 0, TAU, 40, Color(1, 1, 1, 0.9), 2.5, true)
		match id:
			"jump":
				var k := r * 0.42
				draw_colored_polygon(PackedVector2Array([c + Vector2(0, -k), c + Vector2(k, 0), c + Vector2(k * 0.4, 0), c + Vector2(k * 0.4, k), c + Vector2(-k * 0.4, k), c + Vector2(-k * 0.4, 0), c + Vector2(-k, 0)]), ink)
			"utility":
				var k := r * 0.35
				for o in [-k * 0.45, k * 0.45]:
					draw_polyline(PackedVector2Array([c + Vector2(o - k * 0.4, -k), c + Vector2(o + k * 0.4, 0), c + Vector2(o - k * 0.4, k)]), Color("#5aa999"), 4.0, true)
			"secondary":
				draw_arc(c, r * 0.42, 0.3, TAU - 0.6, 24, Color("#de8f55"), r * 0.16, true)
			"interact":
				var txt := "✋ " + Hud.prompt_btn
				var fs := int(r * 0.34)
				var w := _font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
				draw_string(_font, c + Vector2(-w / 2.0, fs * 0.35), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, ink)
			_:
				var tex: Texture2D = _icons.get(id)
				if tex:
					var s := r * 1.2
					draw_texture_rect(tex, Rect2(c - Vector2(s, s) / 2.0, Vector2(s, s)), false)
		# recarga
		if game and game.get("skills") and id in ["secondary", "utility", "special"]:
			var f: float = game.skills.fraction(id)
			if f > 0:
				draw_circle(c, r, Color(0.25, 0.18, 0.32, 0.35))
				draw_arc(c, r - 3, -PI / 2, -PI / 2 + TAU * f, 40, Color(1, 1, 1, 0.85), 4.0, true)
	if _stick_id != -1:
		draw_circle(_stick_origin, RADIUS, Color(1, 1, 1, 0.25))
		draw_arc(_stick_origin, RADIUS, 0, TAU, 40, Color(1, 1, 1, 0.7), 2.0, true)
		var knob := _stick_origin + (_stick_pos - _stick_origin).limit_length(RADIUS)
		draw_circle(knob, RADIUS * 0.42, Color(1, 1, 1, 0.8))
