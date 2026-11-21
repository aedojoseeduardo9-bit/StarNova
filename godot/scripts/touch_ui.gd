## Star Nova — controles táctiles (teléfono en horizontal), como en la web:
## joystick flotante con zona muerta en la mitad izquierda, arrastrar en la derecha para mirar,
## botón de saltar (flecha) y de voltereta. En táctil nunca se muestran teclas de PC.
class_name TouchUI
extends Control

const DEAD := 0.12
const RADIUS := 70.0

var move := Vector2.ZERO          ## x: derecha, y: adelante
var look := Vector2.ZERO          ## arrastre acumulado (píxeles) para la cámara
var jump_pressed := false
var jump_held := false
var dash_pressed := false

var _stick_id := -1
var _stick_origin := Vector2.ZERO
var _stick_pos := Vector2.ZERO
var _look_id := -1
var _look_last := Vector2.ZERO
var _btn_ids := {}                ## índice del dedo -> botón

func _init() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _buttons() -> Dictionary:
	var s := get_viewport_rect().size
	var r: float = clampf(s.y * 0.085, 34.0, 60.0)
	return {
		"jump": {"c": Vector2(s.x - r * 1.6, s.y - r * 1.7), "r": r * 1.15},
		"dash": {"c": Vector2(s.x - r * 4.1, s.y - r * 1.3), "r": r * 0.85},
	}

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
				elif btn == "dash":
					dash_pressed = true
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

func _draw() -> void:
	var b := _buttons()
	var soft := Color(1, 0.98, 0.96, 0.62)
	var ink := Color("#6a5060")
	for id in b:
		var c: Vector2 = b[id].c
		var r: float = b[id].r
		draw_circle(c + Vector2(0, 3), r, Color(0.35, 0.2, 0.3, 0.18))     # sombrita
		draw_circle(c, r, soft)
		draw_arc(c, r, 0, TAU, 40, Color(1, 1, 1, 0.9), 2.5, true)
		if id == "jump":
			var k := r * 0.42
			draw_colored_polygon(PackedVector2Array([c + Vector2(0, -k), c + Vector2(k, 0), c + Vector2(k * 0.4, 0), c + Vector2(k * 0.4, k), c + Vector2(-k * 0.4, k), c + Vector2(-k * 0.4, 0), c + Vector2(-k, 0)]), ink)
		else:
			var k := r * 0.35
			for o in [-k * 0.45, k * 0.45]:
				draw_polyline(PackedVector2Array([c + Vector2(o - k * 0.4, -k), c + Vector2(o + k * 0.4, 0), c + Vector2(o - k * 0.4, k)]), Color("#5aa999"), 4.0, true)
	if _stick_id != -1:
		draw_circle(_stick_origin, RADIUS, Color(1, 1, 1, 0.25))
		draw_arc(_stick_origin, RADIUS, 0, TAU, 40, Color(1, 1, 1, 0.7), 2.0, true)
		var knob := _stick_origin + (_stick_pos - _stick_origin).limit_length(RADIUS)
		draw_circle(knob, RADIUS * 0.42, Color(1, 1, 1, 0.8))
