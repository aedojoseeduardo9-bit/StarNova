## Star Nova — interfaz en pantalla (autoload "Hud"): fragmentos, chispas, nivel, misión
## seguida, reloj y dificultad, vida/escudo/experiencia, objetos, ataque y poder, avisos, carteles de región,
## ventana de premio, barra del jefe y una capa 2D con números de daño, barras de enemigos y el marcador de misión.
## Estilo: suave, redondeado y con títulos en letra serif. En táctil nunca se muestran teclas de PC.
extends CanvasLayer

const DIFF_NAMES := ["Brisa", "Llovizna", "Lluvia", "Chubasco", "Tormenta", "Diluvio", "¡NOVA!"]
const INK := Color("#4a3f5c")
const INK_SOFT := Color("#7a5b6a")

var game = null
var serif: SystemFont
var sans: SystemFont
var root: Control
var hud: Control
var overlay: Control
var touch: TouchUI
var banner_box: VBoxContainer
var banner_title: Label
var banner_sub: Label
var toast_panel: PanelContainer
var toast_label: Label
var hint_label: Label
var version_label: Label
var frags_label: Label
var sparks_label: Label
var level_label: Label
var track_chip: Button
var day_label: Label
var timer_label: Label
var diff_label: Label
var diff_bar: ProgressBar
var save_label: Label
var hp_bar: ProgressBar
var shield_bar: ProgressBar
var hp_text: Label
var xp_bar: ProgressBar
var items_box: HFlowContainer
var skill_bar: Control
var prompt_panel: PanelContainer
var prompt_label: Label
var boss_box: VBoxContainer
var boss_name: Label
var boss_bar: ProgressBar
var pop_panel: PanelContainer
var pop_icon: TextureRect
var pop_name: Label
var pop_desc: Label
var btn_mute: Button
var cross: Control
var cross_hit := false
var numbers: Array = []
var item_nodes := {}
var night := false
var prompt_btn := ""
var _banner_t := 0.0
var _toast_t := 0.0
var _pop_t := 0.0
var _save_t := 0.0
var _shown := false

func _ready() -> void:
	layer = 10
	process_mode = Node.PROCESS_MODE_ALWAYS
	serif = SystemFont.new()
	serif.font_names = PackedStringArray(["Cormorant Garamond", "Georgia", "Times New Roman", "Noto Serif", "DejaVu Serif", "serif"])
	sans = SystemFont.new()
	sans.font_names = PackedStringArray(["Quicksand", "Nunito", "Helvetica Neue", "Segoe UI", "Roboto", "Noto Sans", "DejaVu Sans", "sans-serif"])
	sans.font_weight = 600
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	var th := Theme.new()
	th.default_font = sans
	th.default_font_size = 16
	root.theme = th

	overlay = Control.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.draw.connect(_draw_overlay)
	root.add_child(overlay)

	hud = Control.new()
	hud.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.visible = false
	root.add_child(hud)
	_build_hud()

	version_label = Label.new()
	version_label.text = "Star Nova · versión " + str(ProjectSettings.get_setting("application/config/version"))
	version_label.position = Vector2(16, 12)
	_style(version_label, 14, INK_SOFT)
	root.add_child(version_label)
	version_label.visible = false

	banner_box = VBoxContainer.new()
	banner_box.set_anchors_preset(Control.PRESET_CENTER_TOP)
	banner_box.position = Vector2(-400, 150)
	banner_box.size = Vector2(800, 120)
	banner_box.alignment = BoxContainer.ALIGNMENT_CENTER
	banner_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(banner_box)
	banner_title = Label.new()
	banner_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	banner_title.add_theme_font_override("font", serif)
	_style(banner_title, 58, Color.WHITE)
	banner_box.add_child(banner_title)
	banner_sub = Label.new()
	banner_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_style(banner_sub, 17, Color.WHITE)
	banner_box.add_child(banner_sub)
	banner_box.modulate.a = 0.0

	toast_panel = PanelContainer.new()
	toast_panel.set_anchors_preset(Control.PRESET_CENTER_TOP)
	toast_panel.position = Vector2(-260, 74)
	toast_panel.custom_minimum_size = Vector2(520, 0)
	toast_panel.add_theme_stylebox_override("panel", pill(Color(1, 1, 1, 0.84)))
	toast_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(toast_panel)
	toast_label = Label.new()
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	toast_label.add_theme_color_override("font_color", INK)
	toast_label.add_theme_font_size_override("font_size", 17)
	toast_panel.add_child(toast_label)
	toast_panel.modulate.a = 0.0

	hint_label = Label.new()
	hint_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	hint_label.position = Vector2(-450, -150)
	hint_label.size = Vector2(900, 30)
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_style(hint_label, 14, INK_SOFT)
	root.add_child(hint_label)

	touch = TouchUI.new()
	touch.visible = false
	root.add_child(touch)

func _style(l: Label, size: int, color: Color) -> void:
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_shadow_color", Color(0.35, 0.2, 0.3, 0.35))
	l.add_theme_constant_override("shadow_offset_x", 0)
	l.add_theme_constant_override("shadow_offset_y", 1)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE

func pill(c: Color, radius := 22) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = c
	s.set_corner_radius_all(radius)
	s.content_margin_left = 18
	s.content_margin_right = 18
	s.content_margin_top = 8
	s.content_margin_bottom = 8
	return s

func _bar(fill: Color, h: float, bg := Color(0.25, 0.18, 0.35, 0.28)) -> ProgressBar:
	var b := ProgressBar.new()
	b.show_percentage = false
	b.custom_minimum_size = Vector2(0, h)
	b.max_value = 1.0
	b.step = 0.0
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.set_corner_radius_all(int(h / 2))
	var sf := StyleBoxFlat.new()
	sf.bg_color = fill
	sf.set_corner_radius_all(int(h / 2))
	b.add_theme_stylebox_override("background", sb)
	b.add_theme_stylebox_override("fill", sf)
	b.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return b

func small_button(text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_stylebox_override("normal", pill(Color(1, 1, 1, 0.72), 16))
	b.add_theme_stylebox_override("hover", pill(Color(1, 1, 1, 0.92), 16))
	b.add_theme_stylebox_override("pressed", pill(Color(1, 0.95, 0.88, 1.0), 16))
	b.add_theme_color_override("font_color", INK)
	b.add_theme_color_override("font_hover_color", INK)
	b.add_theme_color_override("font_pressed_color", INK)
	b.add_theme_font_size_override("font_size", 15)
	b.pressed.connect(cb)
	return b

func _build_hud() -> void:
	# arriba a la izquierda: fragmentos, chispas, nivel y misión seguida
	var tl := VBoxContainer.new()
	tl.position = Vector2(18, 14)
	tl.add_theme_constant_override("separation", 2)
	tl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.add_child(tl)
	frags_label = Label.new()
	_style(frags_label, 20, Color("#e0a93a"))
	tl.add_child(frags_label)
	sparks_label = Label.new()
	_style(sparks_label, 22, INK)
	tl.add_child(sparks_label)
	level_label = Label.new()
	_style(level_label, 15, INK_SOFT)
	tl.add_child(level_label)
	track_chip = small_button("", func():
		if game and game.state == "play": game.open_menu("misiones"))
	track_chip.add_theme_font_size_override("font_size", 14)
	track_chip.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	tl.add_child(track_chip)
	# arriba a la derecha: reloj, dificultad, botones y aviso de guardado
	var tr := VBoxContainer.new()
	tr.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	tr.position = Vector2(-250, 12)
	tr.size = Vector2(234, 120)
	tr.alignment = BoxContainer.ALIGNMENT_BEGIN
	tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.add_child(tr)
	var trow := HBoxContainer.new()
	trow.alignment = BoxContainer.ALIGNMENT_END
	trow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tr.add_child(trow)
	day_label = Label.new()
	_style(day_label, 20, Color("#e0a93a"))
	trow.add_child(day_label)
	timer_label = Label.new()
	_style(timer_label, 22, INK)
	timer_label.add_theme_font_override("font", serif)
	trow.add_child(timer_label)
	diff_label = Label.new()
	diff_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_style(diff_label, 13, INK_SOFT)
	tr.add_child(diff_label)
	diff_bar = _bar(Color("#ef9a8f"), 6)
	tr.add_child(diff_bar)
	var brow := HBoxContainer.new()
	brow.alignment = BoxContainer.ALIGNMENT_END
	brow.add_theme_constant_override("separation", 6)
	tr.add_child(brow)
	brow.add_child(small_button("Menú", func(): if game: game.press("journal")))
	btn_mute = small_button("♪", func(): if game: game.toggle_mute())
	brow.add_child(btn_mute)
	brow.add_child(small_button("❚❚", func(): if game and game.state == "play": game.open_menu("sistema")))
	save_label = Label.new()
	save_label.text = "✦ guardado"
	save_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_style(save_label, 13, INK_SOFT)
	save_label.modulate.a = 0.0
	tr.add_child(save_label)
	# abajo: objetos, vida/escudo/experiencia, habilidades y equipo
	var bottom := VBoxContainer.new()
	bottom.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	bottom.position = Vector2(-230, -112)
	bottom.size = Vector2(460, 100)
	bottom.alignment = BoxContainer.ALIGNMENT_END
	bottom.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.add_theme_constant_override("separation", 4)
	hud.add_child(bottom)
	items_box = HFlowContainer.new()
	items_box.alignment = FlowContainer.ALIGNMENT_CENTER
	items_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.add_child(items_box)
	var hp_wrap := Control.new()
	hp_wrap.custom_minimum_size = Vector2(0, 18)
	hp_wrap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.add_child(hp_wrap)
	hp_bar = _bar(Color("#ff8f9e"), 18)
	hp_bar.set_anchors_preset(Control.PRESET_FULL_RECT)
	hp_wrap.add_child(hp_bar)
	shield_bar = _bar(Color(0.84, 0.72, 1.0, 0.85), 18, Color(0, 0, 0, 0))
	shield_bar.set_anchors_preset(Control.PRESET_FULL_RECT)
	hp_wrap.add_child(shield_bar)
	hp_text = Label.new()
	hp_text.set_anchors_preset(Control.PRESET_FULL_RECT)
	hp_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hp_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_style(hp_text, 12, Color.WHITE)
	hp_wrap.add_child(hp_text)
	xp_bar = _bar(Color("#9ce8d2"), 6)
	bottom.add_child(xp_bar)
	# habilidades (solo en PC): íconos con su recarga, sin textos de explicación debajo de la vida
	skill_bar = Control.new()
	skill_bar.custom_minimum_size = Vector2(0, 40)
	skill_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	skill_bar.draw.connect(_draw_skills)
	bottom.add_child(skill_bar)
	# indicación para interactuar
	prompt_panel = PanelContainer.new()
	prompt_panel.set_anchors_preset(Control.PRESET_CENTER)
	prompt_panel.position = Vector2(-200, 70)
	prompt_panel.custom_minimum_size = Vector2(400, 0)
	prompt_panel.add_theme_stylebox_override("panel", pill(Color(1, 1, 1, 0.85)))
	prompt_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	prompt_panel.visible = false
	hud.add_child(prompt_panel)
	prompt_label = Label.new()
	prompt_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt_label.add_theme_color_override("font_color", INK)
	prompt_panel.add_child(prompt_label)
	# barra del jefe
	boss_box = VBoxContainer.new()
	boss_box.set_anchors_preset(Control.PRESET_CENTER_TOP)
	boss_box.position = Vector2(-260, 22)
	boss_box.size = Vector2(520, 40)
	boss_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	boss_box.visible = false
	hud.add_child(boss_box)
	boss_name = Label.new()
	boss_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	boss_name.add_theme_font_override("font", serif)
	_style(boss_name, 24, Color.WHITE)
	boss_box.add_child(boss_name)
	boss_bar = _bar(Color("#c7a6ff"), 12)
	boss_box.add_child(boss_bar)
	# ventana de premio
	pop_panel = PanelContainer.new()
	pop_panel.set_anchors_preset(Control.PRESET_CENTER_RIGHT)
	pop_panel.position = Vector2(-330, -60)
	pop_panel.custom_minimum_size = Vector2(310, 0)
	pop_panel.add_theme_stylebox_override("panel", pill(Color(1, 1, 1, 0.9), 18))
	pop_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pop_panel.visible = false
	hud.add_child(pop_panel)
	var ph := HBoxContainer.new()
	ph.add_theme_constant_override("separation", 10)
	pop_panel.add_child(ph)
	pop_icon = TextureRect.new()
	pop_icon.custom_minimum_size = Vector2(56, 56)
	pop_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	pop_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	ph.add_child(pop_icon)
	var pv := VBoxContainer.new()
	pv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ph.add_child(pv)
	pop_name = Label.new()
	pop_name.add_theme_font_override("font", serif)
	pop_name.add_theme_font_size_override("font_size", 21)
	pop_name.add_theme_color_override("font_color", INK)
	pv.add_child(pop_name)
	pop_desc = Label.new()
	pop_desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	pop_desc.custom_minimum_size = Vector2(220, 0)
	pop_desc.add_theme_font_size_override("font_size", 13)
	pop_desc.add_theme_color_override("font_color", INK_SOFT)
	pv.add_child(pop_desc)
	# mira
	cross = Control.new()
	cross.set_anchors_preset(Control.PRESET_CENTER)
	cross.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cross.draw.connect(func():
		var c := Color("#ff9f7a") if cross_hit else Color(1, 1, 1, 0.9)
		cross.draw_arc(Vector2.ZERO, 7, 0, TAU, 20, Color(0.3, 0.2, 0.35, 0.4), 4.0, true)
		cross.draw_arc(Vector2.ZERO, 7, 0, TAU, 20, c, 2.0, true)
		cross.draw_circle(Vector2.ZERO, 1.6, c))
	hud.add_child(cross)

# ----------------------------------------------------------------------------------------------- API
func attach(g) -> void:
	game = g
	numbers.clear()
	for c in items_box.get_children():
		c.queue_free()
	item_nodes.clear()
	refresh_mute()
	touch.game = g

func show_hud(on: bool) -> void:
	_shown = on
	hud.visible = on

func banner(title: String, sub: String) -> void:
	banner_title.text = title
	banner_sub.text = sub.to_upper()
	_banner_t = 3.2

func toast(text: String) -> void:
	toast_label.text = text
	_toast_t = 3.0

func set_hint(text: String) -> void:
	hint_label.text = text

func set_touch(on: bool) -> void:
	touch.visible = on
	skill_bar.visible = not on

func set_night(on: bool) -> void:
	if on == night:
		return
	night = on
	var c := Color("#f4ecff") if on else INK
	var c2 := Color("#d8cdf0") if on else INK_SOFT
	for l in [sparks_label, timer_label]:
		l.add_theme_color_override("font_color", c)
	for l in [level_label, diff_label, save_label, hint_label]:
		l.add_theme_color_override("font_color", c2)

func saved(ok: bool) -> void:
	save_label.text = "✦ guardado" if ok else "No se pudo guardar"
	_save_t = 2.2

func refresh_mute() -> void:
	if btn_mute:
		btn_mute.text = "♪̸" if Sfx.muted else "♪"

func number(pos: Vector3, value, crit := false, color = null) -> void:
	numbers.append({"p": pos, "v": str(roundi(value)) if (value is float or value is int) else str(value), "crit": crit, "color": color, "t": 0.0})
	if numbers.size() > 60:
		numbers.pop_front()

func prompt(text: String, btn: String) -> void:
	prompt_btn = btn if text != "" else ""
	if text == "":
		prompt_panel.visible = false
		return
	prompt_label.text = text
	prompt_panel.visible = not (game and game.is_touch())

func clear() -> void:
	prompt("", "")
	numbers.clear()
	_banner_t = 0.0
	_toast_t = 0.0
	_pop_t = 0.0
	pop_panel.visible = false

func add_item(id: String, silent := false) -> void:
	var n := int(game.items.get(id, 0)) if game else 1
	if not item_nodes.has(id):
		var box := Control.new()
		box.custom_minimum_size = Vector2(34, 34)
		box.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var tr := TextureRect.new()
		tr.texture = Datos.icon("obj_" + id)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.set_anchors_preset(Control.PRESET_FULL_RECT)
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		box.add_child(tr)
		var l := Label.new()
		l.position = Vector2(20, 18)
		_style(l, 12, INK)
		box.add_child(l)
		items_box.add_child(box)
		item_nodes[id] = l
	item_nodes[id].text = ("×%d" % n) if n > 1 else ""
	if not silent:
		popup("item", id)

func refresh_items() -> void:
	for id in item_nodes.keys():
		var n := int(game.items.get(id, 0))
		if n <= 0:
			item_nodes[id].get_parent().queue_free()
			item_nodes.erase(id)
		else:
			item_nodes[id].text = ("×%d" % n) if n > 1 else ""

func popup(kind: String, v) -> void:
	var rar: Dictionary
	var name_ := ""
	var desc := ""
	if kind == "item":
		var it: Dictionary = Datos.items[v]
		rar = Datos.rarity[int(it.rar)]
		name_ = it.name
		desc = it.desc
		pop_icon.texture = Datos.icon("obj_" + str(v))
	elif kind == "attack":
		var a: Dictionary = Datos.attacks[v.id]
		rar = Datos.rarity[int(v.tier)]
		name_ = a.name
		desc = a.desc
		pop_icon.texture = Datos.icon("atq_" + str(v.id))
	else:
		var p: Dictionary = Datos.powers[v]
		rar = {"name": "Poder", "color": "#ffd36e"}
		name_ = p.name
		desc = p.desc
		pop_icon.texture = Datos.icon("pod_" + str(v))
	pop_name.text = name_
	pop_desc.text = "%s · %s" % [rar.name, desc]
	pop_panel.visible = true
	_pop_t = 3.2

func refresh_loadout() -> void:
	if game == null:
		return
	touch.refresh_icons()
	skill_bar.queue_redraw()

func refresh_missions() -> void:
	if game == null or game.missions == null:
		return
	var id = game.missions.tracked
	if id == null:
		track_chip.text = "✦ Elige una misión"
	else:
		var m: Dictionary = game.missions.def(id)
		var s: Dictionary = game.missions.state[id]
		track_chip.text = "✦ " + m.title + ((" %d/%d" % [s.progress, int(m.goal)]) if int(m.goal) > 1 else "")

# ----------------------------------------------------------------------------------------------- cada cuadro
func _process(dt: float) -> void:
	_banner_t = maxf(0.0, _banner_t - dt)
	banner_box.modulate.a = clampf(minf(_banner_t, 3.2 - _banner_t) * 2.5, 0.0, 1.0) if _banner_t > 0 else 0.0
	_toast_t = maxf(0.0, _toast_t - dt)
	toast_panel.modulate.a = clampf(_toast_t * 3.0, 0.0, 1.0)
	_save_t = maxf(0.0, _save_t - dt)
	save_label.modulate.a = clampf(_save_t * 2.0, 0.0, 1.0)
	if _pop_t > 0:
		_pop_t -= dt
		if _pop_t <= 0:
			pop_panel.visible = false
	var g = game
	if g == null or not is_instance_valid(g):
		return
	var playing: bool = g.state != "title" and g.state != "cine"
	hud.visible = _shown and playing and not g.hide_hud
	touch.visible = g.is_touch() and g.state == "play" and not g.hide_hud
	cross.visible = g.state == "play" and not g.is_touch()
	if cross.visible:
		cross.queue_redraw()
	if hud.visible:
		var st: Dictionary = g.stats
		frags_label.text = "★ %d / %d" % [g.missions.fragments(), int(g.W.fragSlots)]
		sparks_label.text = "✦ %d" % floori(g.sparks)
		level_label.text = "Nivel %d" % g.level
		hp_bar.value = maxf(0.0, g.hp / st.maxHp)
		shield_bar.value = minf(1.0, g.shield / st.maxHp)
		hp_text.text = "%d / %d%s" % [ceili(maxf(0.0, g.hp)), roundi(st.maxHp), (" +%d" % roundi(g.shield)) if g.shield > 0.5 else ""]
		xp_bar.value = g.xp / g.xp_next()
		var s := int(g.time)
		timer_label.text = "%02d:%02d" % [s / 60, s % 60]
		day_label.text = "☾ " if g.is_night else "☀ "
		var c: float = g.diff_coef()
		diff_label.text = DIFF_NAMES[mini(DIFF_NAMES.size() - 1, int(c - 1.0))]
		diff_bar.value = minf(1.0, (c - 1.0) / (DIFF_NAMES.size() - 1))
		skill_bar.queue_redraw()
		if g.boss and not g.boss.dead:
			boss_box.visible = true
			boss_name.text = g.W.texts.bossName
			boss_bar.value = maxf(0.0, g.boss.hp / g.boss.max_hp)
		else:
			boss_box.visible = false
	overlay.queue_redraw()

## Íconos de las habilidades en PC: ataque, coletazo, voltereta y poder, con su recarga y su tecla.
func _draw_skills() -> void:
	var g = game
	if g == null or not is_instance_valid(g) or g.is_touch():
		return
	var ids := [["primary", "Clic"], ["secondary", "Q"], ["utility", "Shift"], ["special", "R"]]
	var sz := 36.0
	var gap := 8.0
	var x0 := (skill_bar.size.x - (sz * 4 + gap * 3)) / 2.0
	for i in ids.size():
		var id: String = ids[i][0]
		var r := Rect2(x0 + i * (sz + gap), 0, sz, sz)
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(1, 1, 1, 0.75)
		sb.set_corner_radius_all(10)
		skill_bar.draw_style_box(sb, r)
		var c := r.get_center()
		match id:
			"primary":
				skill_bar.draw_texture_rect(Datos.icon("atq_" + str(g.arsenal.attack.id)), r.grow(-4), false)
			"special":
				skill_bar.draw_texture_rect(Datos.icon("pod_" + str(g.arsenal.power)), r.grow(-4), false)
			"secondary":
				skill_bar.draw_arc(c, 10, 0.3, TAU - 0.6, 20, Color("#de8f55"), 4.0, true)
			"utility":
				for o in [-4.0, 4.0]:
					skill_bar.draw_polyline(PackedVector2Array([c + Vector2(o - 4, -8), c + Vector2(o + 4, 0), c + Vector2(o - 4, 8)]), Color("#5aa999"), 3.0, true)
		var f: float = g.skills.fraction(id) if id != "primary" else 0.0
		if f > 0:
			skill_bar.draw_rect(Rect2(r.position.x, r.position.y + sz * (1.0 - f), sz, sz * f), Color(0.25, 0.18, 0.32, 0.45))
		var key: String = ids[i][1]
		var w := sans.get_string_size(key, HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x
		skill_bar.draw_string_outline(sans, Vector2(c.x - w / 2, r.end.y - 2), key, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, 3, Color(1, 1, 1, 0.9))
		skill_bar.draw_string(sans, Vector2(c.x - w / 2, r.end.y - 2), key, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, INK)

func _text(ci: CanvasItem, pos: Vector2, s: String, size: int, color: Color, outline := 3) -> void:
	var w := sans.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	var p := pos - Vector2(w / 2.0, -size * 0.35)
	ci.draw_string_outline(sans, p, s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, outline, Color(0.24, 0.18, 0.31, 0.75))
	ci.draw_string(sans, p, s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)

func _draw_overlay() -> void:
	var g = game
	if g == null or not is_instance_valid(g) or g.state == "title" or g.state == "cine" or g.hide_hud:
		return
	var cam: Camera3D = g.cam
	var dt := get_process_delta_time()
	var pp: Vector3 = g.player.global_position
	# barras de vida de enemigos (dañados, élites y gólems)
	for e in g.enemies:
		if e.dead or e.is_boss or e.untargetable:
			continue
		var big: bool = e.elite != null or e.ai == "golem"
		if e.hp >= e.max_hp and not big:
			continue
		if e.global_position.distance_to(pp) > 26:
			continue
		var wp: Vector3 = e.center() + Vector3(0, e.hh + 0.35, 0)
		if cam.is_position_behind(wp):
			continue
		var s := cam.unproject_position(wp)
		var w := 70.0 if big else 40.0
		overlay.draw_rect(Rect2(s.x - w / 2, s.y, w, 5), Color(0.16, 0.12, 0.27, 0.45))
		overlay.draw_rect(Rect2(s.x - w / 2, s.y, w * maxf(0.0, e.hp / e.max_hp), 5), Color(e.elite.color) if e.elite else Color("#ff9fa8"))
		if big:
			_text(overlay, s - Vector2(0, 9), e.def.name + ((" " + e.elite.name) if e.elite else ""), 11, Color("#fffaf3"))
	# números de daño
	for i in range(numbers.size() - 1, -1, -1):
		var n: Dictionary = numbers[i]
		n.t += dt
		if n.t > 0.9:
			numbers.remove_at(i)
			continue
		var wp: Vector3 = n.p + Vector3(0, n.t * 0.9, 0)
		if cam.is_position_behind(wp):
			continue
		var s := cam.unproject_position(wp)
		var a := 1.0 - maxf(0.0, n.t - 0.5) / 0.4
		var size := 22 if n.crit else (14 if not n.v.is_valid_float() else 16)
		var col: Color = n.color if n.color is Color else (Color(n.color) if n.color is String else (Color("#ff9f7a") if n.crit else Color.WHITE))
		col.a = a
		_text(overlay, s, n.v, size, col, 4)
	if g.state != "play":
		return
	# marcador de la misión seguida
	var targets: Array = g.missions.targets()
	if targets.is_empty():
		return
	var best: Vector3 = targets[0]
	var bd := INF
	for t in targets:
		var d: float = t.distance_to(pp)
		if d < bd:
			bd = d
			best = t
	var wp2 := best + Vector3(0, 0.6, 0)
	var vs := overlay.size
	var behind := cam.is_position_behind(wp2)
	var s2 := cam.unproject_position(wp2)
	if behind:
		s2 = vs - s2
	var m := 46.0
	var off := behind or s2.x < m or s2.x > vs.x - m or s2.y < m or s2.y > vs.y - m
	if off:
		var c := vs / 2.0
		var dd := s2 - c
		if behind and absf(dd.y) < 1:
			dd.y = 1
		var kk := minf((vs.x / 2 - m) / maxf(1e-3, absf(dd.x)), (vs.y / 2 - m) / maxf(1e-3, absf(dd.y)))
		s2 = c + dd * kk
		var ang := atan2(dd.y, dd.x)
		var pts := PackedVector2Array([Vector2(16, 0), Vector2(-6, -10), Vector2(-6, 10)])
		for j in pts.size():
			pts[j] = s2 + pts[j].rotated(ang)
		overlay.draw_colored_polygon(pts, Color(1, 0.84, 0.47, 0.95))
	else:
		s2.y -= 6 + sin(Time.get_ticks_msec() / 300.0) * 3
	var star := PackedVector2Array()
	for j in 10:
		var r := 10.0 if j % 2 == 0 else 4.5
		var a2 := -PI / 2 + j * PI / 5
		star.append(s2 + Vector2(cos(a2), sin(a2)) * r)
	overlay.draw_colored_polygon(star, Color("#ffe08a"))
	star.append(star[0])
	overlay.draw_polyline(star, Color(0.29, 0.25, 0.36, 0.6), 2.0, true)
	_text(overlay, s2 + Vector2(0, 20), "%d m" % roundi(bd), 12, Color("#fffaf3"))
