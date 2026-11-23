## Star Nova — pantallas y menús: título, perfiles (nueva aventura, continuar,
## copiar, borrar, importar), menú del juego por páginas (Misiones + Historia, Mochila, Trajes con
## probador 3D, Mapa, Compendio, Sistema con ajustes), diálogo, tienda de PNJ, mapa galáctico, muerte y final.
## Estilo: paneles suaves y redondeados, títulos en serif. En táctil nunca se muestran teclas de PC.
class_name Menus
extends CanvasLayer

const TABS := ["misiones", "mochila", "trajes", "mapa", "compendio", "sistema"]
const TAB_NAMES := {"misiones": "Misiones", "mochila": "Mochila", "trajes": "Trajes", "mapa": "Mapa", "compendio": "Compendio", "sistema": "Sistema"}
const INK := Color("#4a3f5c")
const INK_SOFT := Color("#7a5b6a")
const CREAM := Color("#fff8f0")

var game
var root: Control
var serif: SystemFont
var screens := {}
var tab := "misiones"
var mission_tab := "principal"
var codex_tab := "item"
var fit_sel = null
var bag_sel = null
var copy_from := 0
var confirm_del := 0
var body: Control
var tab_buttons := {}
var dialog_who: Label
var dialog_text: Label
var dialog_hint: Label
var preview: SubViewport
var preview_pip: PipModel
var preview_tex: TextureRect
var _preview_t := 0.0
var _profiles_open := false

func _init(g) -> void:
	game = g
	layer = 20
	process_mode = Node.PROCESS_MODE_ALWAYS

func _ready() -> void:
	serif = Hud.serif
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var th := Theme.new()
	th.default_font = Hud.sans
	th.default_font_size = 17
	root.theme = th
	add_child(root)
	_make_preview()

# ----------------------------------------------------------------------------------------------- piezas
func _panel_style(c := Color(1, 0.98, 0.96, 0.94), r := 26) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = c
	s.set_corner_radius_all(r)
	s.content_margin_left = 26
	s.content_margin_right = 26
	s.content_margin_top = 20
	s.content_margin_bottom = 20
	s.shadow_color = Color(0.35, 0.2, 0.3, 0.18)
	s.shadow_size = 18
	s.shadow_offset = Vector2(0, 6)
	return s

func _screen(id: String, dim := 0.35) -> Control:
	if screens.has(id):
		screens[id].queue_free()
	var c := ColorRect.new()
	c.color = Color(0.29, 0.2, 0.33, dim)
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	c.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(c)
	screens[id] = c
	return c

func _close(id: String) -> void:
	if screens.has(id):
		screens[id].queue_free()
		screens.erase(id)

func hide_all() -> void:
	for id in screens.keys():
		_close(id)
	_profiles_open = false

func _center_panel(parent: Control, w := 640.0, style: StyleBox = null) -> VBoxContainer:
	var cc := CenterContainer.new()
	cc.set_anchors_preset(Control.PRESET_FULL_RECT)
	cc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(cc)
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", style if style else _panel_style())
	p.custom_minimum_size = Vector2(minf(w, _vw() - 32), 0)
	cc.add_child(p)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	p.add_child(v)
	return v

func _vw() -> float:
	return root.get_viewport_rect().size.x

func _vh() -> float:
	return root.get_viewport_rect().size.y

func _label(text: String, size := 17, color := INK, center := false, wrap := true) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if wrap:
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if center:
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return l

func _title(text: String, size := 40, center := true) -> Label:
	var l := _label(text, size, INK, center)
	l.add_theme_font_override("font", serif)
	return l

func _kicker(text: String) -> Label:
	return _label(text.to_upper(), 13, Color("#c07a86"), true)

func button(text: String, cb: Callable, big := false, off := false) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_ALL
	var base := Color("#ef9a8f") if big else Color(1, 1, 1, 0.9)
	if off:
		base = Color(0.85, 0.82, 0.84, 0.9)
	var fg := Color.WHITE if big and not off else INK
	for st in ["normal", "hover", "pressed", "focus"]:
		var s := StyleBoxFlat.new()
		s.bg_color = base.lightened(0.08) if st == "hover" else (base.darkened(0.06) if st == "pressed" else base)
		if st == "focus":
			s.bg_color = Color(0, 0, 0, 0)
			s.border_color = Color("#ffd36e")
			s.set_border_width_all(2)
		s.set_corner_radius_all(20)
		s.content_margin_left = 18
		s.content_margin_right = 18
		s.content_margin_top = 8
		s.content_margin_bottom = 8
		s.shadow_color = Color(0.35, 0.2, 0.3, 0.12)
		s.shadow_size = 4
		b.add_theme_stylebox_override(st, s)
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		b.add_theme_color_override(c, fg)
	b.add_theme_font_size_override("font_size", 19 if big else 16)
	b.pressed.connect(func():
		Sfx.play("select")
		cb.call())
	return b

func _row(sep := 8, center := false) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", sep)
	if center:
		h.alignment = BoxContainer.ALIGNMENT_CENTER
	return h

func _icon(tex: Texture2D, size := 44.0) -> TextureRect:
	var t := TextureRect.new()
	t.texture = tex
	t.custom_minimum_size = Vector2(size, size)
	t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	t.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	return t

func _card(c := Color(1, 1, 1, 0.75)) -> PanelContainer:
	var p := PanelContainer.new()
	var s := StyleBoxFlat.new()
	s.bg_color = c
	s.set_corner_radius_all(16)
	s.content_margin_left = 14
	s.content_margin_right = 14
	s.content_margin_top = 10
	s.content_margin_bottom = 10
	p.add_theme_stylebox_override("panel", s)
	return p

# ----------------------------------------------------------------------------------------------- título y perfiles
func show_title() -> void:
	hide_all()
	var s := _screen("title", 0.0)
	s.color = Color(1, 0.94, 0.9, 0.0)
	# el título arriba y "Comenzar" abajo: el centro queda libre para ver el mundo
	var v := VBoxContainer.new()
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.offset_top = 28
	v.offset_bottom = -44
	v.add_theme_constant_override("separation", 12)
	s.add_child(v)
	var t := _title("STAR NOVA", 84)
	t.add_theme_color_override("font_color", Color.WHITE)
	t.add_theme_color_override("font_shadow_color", Color(0.5, 0.25, 0.35, 0.45))
	t.add_theme_constant_override("shadow_offset_y", 4)
	v.add_child(t)
	var gap := Control.new()
	gap.size_flags_vertical = Control.SIZE_EXPAND_FILL
	gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(gap)
	var row := _row(10, true)
	var b := button("Comenzar", func(): show_profiles(), true)
	b.custom_minimum_size = Vector2(220, 0)
	row.add_child(b)
	v.add_child(row)
	var upd := _row(10, true)
	v.add_child(upd)
	b.call_deferred("grab_focus")
	if not game.ojos():
		_check_update(upd)

const REPO := "aedojoseeduardo9-bit/StarNova"

static func build_number() -> int:
	return int(ProjectSettings.get_setting("application/config/build", 0))

static func version_text() -> String:
	var b := build_number()
	return "versión %s%s" % [ProjectSettings.get_setting("application/config/version"), (" · compilación %d" % b) if b > 0 else ""]

## Avisa si en GitHub hay una compilación más nueva (release "latest", título "… compilación N").
func _check_update(row: HBoxContainer) -> void:
	var mine := build_number()
	if mine <= 0:
		return
	var http := HTTPRequest.new()
	http.timeout = 8.0
	add_child(http)
	http.request_completed.connect(func(result, code, _headers, body):
		http.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS or code != 200 or not is_instance_valid(row):
			return
		var j = JSON.parse_string(body.get_string_from_utf8())
		if not j is Dictionary:
			return
		var rx := RegEx.new()
		rx.compile("compilaci[oó]n\\s*#?(\\d+)")
		var m := rx.search(str(j.get("name", "")))
		var latest := int(m.get_string(1)) if m else 0
		if latest > mine:
			var url := "https://github.com/%s/releases/latest/download/StarNova.apk" % REPO
			if not OS.has_feature("android"):
				url = "https://github.com/%s/releases/latest" % REPO
			row.add_child(button("Actualizar a la compilación %d" % latest, func(): OS.shell_open(url), true)))
	if http.request("https://api.github.com/repos/%s/releases/tags/latest" % REPO, ["User-Agent: StarNova", "Accept: application/vnd.github+json"]) != OK:
		http.queue_free()

func profiles_open() -> bool:
	return _profiles_open

func show_profiles() -> void:
	hide_all()
	_profiles_open = true
	var s := _screen("profiles", 0.18)
	var v := _center_panel(s, 760)
	v.add_child(_kicker("elige tu aventura"))
	v.add_child(_title("Perfiles", 38))
	for n in Guardado.SLOTS:
		v.add_child(_slot_card(n))
	var foot := _row(10, true)
	foot.add_child(button("Importar partida", func(): _ask_import()))
	foot.add_child(button("Volver", func(): show_title()))
	v.add_child(foot)

func _slot_card(n: int) -> Control:
	var d = Guardado.read(n)
	var card := _card()
	var h := _row(12)
	card.add_child(h)
	var info := VBoxContainer.new()
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(info)
	var acts := _row(6)
	h.add_child(acts)
	if d:
		var sm := Guardado.summary(d)
		info.add_child(_title("%s%s" % [sm.name, "  ★" if sm.ended else ""], 24, false))
		info.add_child(_label("Nivel %d · %s · %s · %d estrella%s" % [sm.level, sm.world, sm.time, sm.stars, "" if sm.stars == 1 else "s"], 14, INK_SOFT))
		info.add_child(_label(sm.region, 13, INK_SOFT))
		if confirm_del == n:
			info.add_child(_label("¿Borrar este perfil para siempre?", 14, Color("#c0505a")))
			acts.add_child(button("No", func():
				confirm_del = 0
				show_profiles()))
			acts.add_child(button("Sí, borrar", func():
				Guardado.remove(n)
				confirm_del = 0
				show_profiles(), true))
		else:
			var free := Guardado.SLOTS.any(func(x): return Guardado.read(x) == null)
			if free:
				acts.add_child(button("Copiar", func():
					copy_from = n
					show_profiles()))
			acts.add_child(button("Borrar", func():
				confirm_del = n
				show_profiles()))
			var go := button("Continuar", func(): game.play_slot(n, ""), true)
			acts.add_child(go)
			if n == 1:
				go.call_deferred("grab_focus")
	else:
		info.add_child(_title("Ranura %d" % n, 22, false))
		info.add_child(_label("Vacía", 14, INK_SOFT))
		if copy_from:
			acts.add_child(button("Copiar aquí", func():
				Guardado.copy(copy_from, n)
				copy_from = 0
				show_profiles(), true))
		else:
			acts.add_child(button("Nueva aventura", func(): _ask_name(n), true))
	return card

func _ask_name(n: int) -> void:
	var s := _screen("name", 0.35)
	var v := _center_panel(s, 460)
	v.add_child(_title("Nueva aventura", 32))
	v.add_child(_label("¿Cómo se llamará este perfil?", 16, INK_SOFT, true))
	var le := LineEdit.new()
	le.max_length = 12
	le.placeholder_text = "Pip"
	le.alignment = HORIZONTAL_ALIGNMENT_CENTER
	le.add_theme_font_size_override("font_size", 22)
	v.add_child(le)
	var row := _row(10, true)
	row.add_child(button("Cancelar", func(): _close("name")))
	var ok := func():
		_close("name")
		game.play_slot(n, le.text)
	row.add_child(button("Empezar", ok, true))
	le.text_submitted.connect(func(_t): ok.call())
	v.add_child(row)
	le.call_deferred("grab_focus")

## Importar una partida: en otro aparato (o en la versión anterior de la app), Menú → Sistema da un código que se pega aquí.
func _ask_import() -> void:
	var s := _screen("import", 0.35)
	var v := _center_panel(s, 620)
	v.add_child(_title("Traer tu partida", 30))
	v.add_child(_label("En el otro aparato (o en la versión anterior de la app) abre Menú → Sistema y copia el código de la partida. Pégalo aquí: se guardará en una ranura libre.", 15, INK_SOFT, true))
	var te := TextEdit.new()
	te.custom_minimum_size = Vector2(0, 120)
	te.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	v.add_child(te)
	var msg := _label("", 14, Color("#c0505a"), true)
	v.add_child(msg)
	var row := _row(10, true)
	row.add_child(button("Pegar", func(): te.text = DisplayServer.clipboard_get()))
	row.add_child(button("Cancelar", func(): _close("import")))
	row.add_child(button("Importar", func():
		var r := import_code(te.text)
		if r == "":
			_close("import")
			show_profiles()
			Hud.toast("Partida importada")
		else:
			msg.text = r, true))
	v.add_child(row)

## Devuelve "" si se importó, o el motivo del fallo.
static func import_code(code: String) -> String:
	var txt := code.strip_edges()
	if txt.begins_with("STARNOVA:"):
		txt = txt.substr(9)
	var raw := Marshalls.base64_to_raw(txt.strip_edges())
	if raw.is_empty():
		return "Ese código no es válido."
	var data = JSON.parse_string(raw.get_string_from_utf8())
	if not data is Dictionary or not data.get("name") is String:
		return "Ese código no es válido."
	if int(data.get("v", 0)) == 1:
		data = Guardado._migrate(data)
	if int(data.get("v", 0)) != Guardado.VERSION:
		return "Ese código es de otra versión."
	for n in Guardado.SLOTS:
		if Guardado.read(n) == null:
			Guardado.write(n, data)
			return ""
	return "No hay ranuras libres: borra un perfil primero."

## Código para pasar esta partida a otro aparato .
func export_code() -> String:
	var d := Guardado.snapshot(game)
	return "STARNOVA:" + Marshalls.utf8_to_base64(JSON.stringify(d))

func show_loading(text: String) -> void:
	hide_all()
	var s := _screen("loading", 0.55)
	var v := _center_panel(s, 420)
	v.add_child(_title(text, 28))

func back() -> bool:
	for id in ["import", "name"]:
		if screens.has(id):
			_close(id)
			return true
	if screens.has("profiles"):
		show_title()
		return true
	return false

# ----------------------------------------------------------------------------------------------- diálogo
func show_dialog(who: String, text: String, hint: String) -> void:
	if not screens.has("dialog"):
		var s := _screen("dialog", 0.0)
		s.mouse_filter = Control.MOUSE_FILTER_STOP
		s.gui_input.connect(func(e):
			if (e is InputEventMouseButton and e.pressed) or (e is InputEventScreenTouch and e.pressed):
				game.advance_dialog())
		var p := PanelContainer.new()
		p.add_theme_stylebox_override("panel", _panel_style(Color(1, 0.98, 0.96, 0.95)))
		p.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
		var w := minf(820, _vw() - 32)
		p.custom_minimum_size = Vector2(w, 0)
		p.position = Vector2(-w / 2, -210)
		p.mouse_filter = Control.MOUSE_FILTER_IGNORE
		s.add_child(p)
		var v := VBoxContainer.new()
		v.mouse_filter = Control.MOUSE_FILTER_IGNORE
		p.add_child(v)
		dialog_who = _title("", 24, false)
		dialog_who.add_theme_color_override("font_color", Color("#c07a86"))
		v.add_child(dialog_who)
		dialog_text = _label("", 19)
		v.add_child(dialog_text)
		dialog_hint = _label("", 13, INK_SOFT)
		dialog_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		v.add_child(dialog_hint)
	dialog_who.text = who
	dialog_text.text = text
	dialog_hint.text = hint

func hide_dialog() -> void:
	_close("dialog")

# ----------------------------------------------------------------------------------------------- menú del juego
func open_menu(t := "") -> void:
	if t == "historia":
		mission_tab = "historia"
		t = "misiones"
	if t in TABS:
		tab = t
	if not screens.has("menu"):
		var s := _screen("menu", 0.3)
		var v := _center_panel(s, 980)
		v.get_parent().custom_minimum_size.y = minf(640, _vh() - 24)
		var head := _row(6, true)
		v.add_child(head)
		head.add_child(button("‹", func(): flip(-1)))
		tab_buttons = {}
		for id in TABS:
			var b := button(TAB_NAMES[id], func(): show_tab(id))
			head.add_child(b)
			tab_buttons[id] = b
		head.add_child(button("›", func(): flip(1)))
		var sc := ScrollContainer.new()
		sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
		sc.custom_minimum_size = Vector2(0, minf(440, _vh() - 200))
		sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
		v.add_child(sc)
		body = VBoxContainer.new()
		body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		body.add_theme_constant_override("separation", 8)
		sc.add_child(body)
		var foot := _row(12, true)
		foot.add_child(button("Volver al juego", func(): game.close_menu(), true))
		v.add_child(foot)
	show_tab(tab)

func close_menu() -> void:
	_close("menu")

func flip(d: int) -> void:
	var i := TABS.find(tab)
	Sfx.play("select")
	show_tab(TABS[(i + d + TABS.size()) % TABS.size()])

func show_tab(t: String) -> void:
	tab = t
	for id in tab_buttons:
		tab_buttons[id].modulate = Color(1, 1, 1, 1) if id == t else Color(1, 1, 1, 0.55)
	for c in body.get_children():
		c.queue_free()
	preview_tex = null
	match t:
		"misiones": _page_missions()
		"mochila": _page_bag()
		"trajes": _page_outfits()
		"mapa": _page_map()
		"compendio": _page_codex()
		"sistema": _page_system()

func _page_missions() -> void:
	var tabs := _row(6, true)
	for pair in [["principal", "Principales"], ["secundaria", "Secundarias"], ["historia", "Historia"]]:
		var b := button(pair[1], func():
			mission_tab = pair[0]
			show_tab("misiones"))
		b.modulate = Color(1, 1, 1, 1) if mission_tab == pair[0] else Color(1, 1, 1, 0.55)
		tabs.add_child(b)
	body.add_child(tabs)
	var M: Misiones = game.missions
	if mission_tab == "historia":
		for c in Datos.historia.chapters:
			if c.world != game.world_id:
				continue
			var seen: bool = game.story.seen.has(c.id)
			var card := _card()
			var h := _row(10)
			card.add_child(h)
			var v := VBoxContainer.new()
			v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			h.add_child(v)
			v.add_child(_label(c.n.to_upper(), 12, Color("#c07a86")))
			v.add_child(_title(c.title if seen else "???", 21, false))
			v.add_child(_label(c.sum if seen else "Aún no has vivido este capítulo.", 14, INK_SOFT))
			if seen:
				h.add_child(button("Ver", func(): game.replay_story(c.id)))
			body.add_child(card)
		return
	for m in M.list(mission_tab):
		var s: Dictionary = M.state[m.id]
		var where: String = game.regions[m.region].name if m.get("region") != null and game.regions.has(m.region) else "Todo el mundo"
		var card := _card(Color(1, 0.97, 0.88, 0.9) if M.tracked == m.id else Color(1, 1, 1, 0.75))
		var h := _row(10)
		card.add_child(h)
		var v := VBoxContainer.new()
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(v)
		v.add_child(_label(where.to_upper(), 12, Color("#c07a86")))
		if not s.discovered:
			v.add_child(_title("???", 21, false))
			v.add_child(_label("Explora %s para descubrir esta misión." % where, 14, INK_SOFT))
		else:
			var prog := "  ✓" if s.done else ((" — %d/%d" % [s.progress, int(m.goal)]) if int(m.goal) > 1 else "")
			v.add_child(_title(m.title + prog, 21, false))
			v.add_child(_label(m.desc, 14, INK_SOFT))
			if not s.done:
				if M.tracked == m.id:
					h.add_child(button("Dejar de seguir", func():
						M.track(null)
						show_tab("misiones")))
				else:
					h.add_child(button("Seguir", func():
						M.track(m.id)
						show_tab("misiones"), true))
		body.add_child(card)

func _page_bag() -> void:
	var g = game
	var st: Dictionary = g.stats
	var A: Dictionary = g.arsenal.attack
	var atk: Dictionary = Datos.attacks[A.id]
	var tier: Dictionary = Datos.rarity[int(A.tier)]
	var pw: Dictionary = Datos.powers[g.arsenal.power]
	var top := _row(10)
	for c in [["Ataque", "atq_" + A.id, atk.name, "%s · daño ×%s" % [tier.name, str(tier.mul)], atk.desc, Color(tier.color)], ["Poder", "pod_" + g.arsenal.power, pw.name, "Poder especial", pw.desc, Color("#a57be0")]]:
		var card := _card()
		card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var h := _row(10)
		card.add_child(h)
		h.add_child(_icon(Datos.icon(c[1]), 56))
		var v := VBoxContainer.new()
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(v)
		v.add_child(_label(c[0].to_upper(), 12, c[5]))
		v.add_child(_title(c[2], 22, false))
		v.add_child(_label(c[3], 13, c[5].darkened(0.2)))
		v.add_child(_label(c[4], 13, INK_SOFT))
		top.add_child(card)
	body.add_child(top)
	var pct := func(x): return "%d%%" % roundi(float(x) * 100.0)
	var chips := HFlowContainer.new()
	chips.add_theme_constant_override("h_separation", 14)
	for kv in [["Nivel", str(g.level)], ["Vida", "%d / %d" % [ceili(maxf(0.0, g.hp)), roundi(st.maxHp)]], ["Daño", "%.1f" % st.dmg],
			["Ritmo de ataque", "×%.2f" % st.atk], ["Velocidad", "×%.2f" % st.speed], ["Crítico", pct.call(st.crit)],
			["Armadura", str(roundi(st.armor))], ["Chispas", str(floori(g.sparks))], ["Derrotados", str(g.kills)]]:
		chips.add_child(_label("%s %s" % kv, 15, INK, false, false))
	body.add_child(chips)
	# Mochila: todos los objetos; solo 5 funcionan a la vez (los activos, con borde dorado). Tocar uno lo activa o
	# lo desactiva; los activos son los que se ven sobre la barra de vida.
	var ids: Array = g.bag.keys().filter(func(id): return int(g.bag[id]) > 0 and Datos.items.has(id))
	ids.sort_custom(func(a, b): return [1 if g.active.has(a) else 0, int(Datos.items[a].rar)] > [1 if g.active.has(b) else 0, int(Datos.items[b].rar)])
	var total := 0
	for id in ids:
		total += int(g.bag[id])
	body.add_child(_title("Objetos (%d) · activos %d / %d" % [total, g.active.size(), g.MAX_ACTIVOS], 22, false))
	var detail := _label("", 15, INK)
	var grid := HFlowContainer.new()
	grid.add_theme_constant_override("h_separation", 6)
	grid.add_theme_constant_override("v_separation", 6)
	var show_it := func(id, msg := ""):
		bag_sel = id
		if id == null:
			detail.text = "" if ids.size() else "Aún no tienes objetos. Salen de los cofres: ábrelos con chispas."
			return
		var it: Dictionary = Datos.items[id]
		var state := "activo" if g.active.has(id) else "guardado"
		detail.text = "%s%s · %s · %s — %s%s" % [it.name, (" ×%d" % int(g.bag[id])) if int(g.bag[id]) > 1 else "", Datos.rarity[int(it.rar)].name,
			state, it.desc, ("\n" + msg) if msg != "" else ""]
	for id in ids:
		var b := Button.new()
		b.icon = Datos.icon("obj_" + id)
		b.expand_icon = true
		b.custom_minimum_size = Vector2(54, 54)
		b.text = ""
		b.tooltip_text = Datos.items[id].name
		var on: bool = g.active.has(id)
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(1, 0.97, 0.88, 0.98) if on else Color(1, 1, 1, 0.45)
		sb.set_corner_radius_all(12)
		sb.border_color = Color("#e0a93a") if on else Color(1, 1, 1, 0.0)
		sb.set_border_width_all(3)
		for sname in ["normal", "hover", "pressed", "focus"]:
			b.add_theme_stylebox_override(sname, sb)
		b.modulate = Color(1, 1, 1, 1) if on else Color(1, 1, 1, 0.55)
		b.pressed.connect(func():
			if g.toggle_item(id):
				Sfx.play("select")
				bag_sel = id
				show_tab("mochila")
			else:
				show_it.call(id, "Ya tienes 5 activos: toca uno activo para guardarlo."))
		grid.add_child(b)
	body.add_child(grid)
	body.add_child(detail)
	show_it.call(bag_sel if bag_sel in ids else null)

func _make_preview() -> void:
	preview = SubViewport.new()
	preview.size = Vector2i(320, 320)
	preview.own_world_3d = true
	preview.transparent_bg = true
	preview.render_target_update_mode = SubViewport.UPDATE_DISABLED
	add_child(preview)
	var w3 := Node3D.new()
	preview.add_child(w3)
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_CLEAR_COLOR
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color("#fff4ec")
	e.ambient_light_energy = 0.5
	e.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	env.environment = e
	w3.add_child(env)
	var sun := DirectionalLight3D.new()
	sun.light_energy = 0.35
	sun.rotation = Vector3(-0.7, 0.6, 0)
	w3.add_child(sun)
	preview_pip = PipModel.new()
	w3.add_child(preview_pip)
	var cam := Camera3D.new()
	cam.fov = 30
	cam.position = Vector3(0, 0.36, 1.55)
	w3.add_child(cam)
	cam.look_at(Vector3(0, 0.27, 0), Vector3.UP)

func _preview_box() -> TextureRect:
	preview_tex = TextureRect.new()
	preview_tex.texture = preview.get_texture()
	preview_tex.custom_minimum_size = Vector2(260, 260)
	preview_tex.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	preview_tex.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	preview.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	return preview_tex

func _outfit_list(shop_id = null) -> Array:
	var out: Array = []
	if shop_id == null:
		out.append(null)
	for o in Datos.trajes:
		if shop_id == null or o.get("shop") == shop_id:
			out.append(o.id)
	return out

func _outfit_panel(parent: Control, shop_id = null) -> void:
	var g = game
	var F: Dictionary = g.outfits
	var h := _row(16)
	parent.add_child(h)
	h.add_child(_preview_box())
	var side := VBoxContainer.new()
	side.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(side)
	var sel = fit_sel
	var list := _outfit_list(shop_id)
	if not sel in list:
		sel = list[0] if list.size() else null
	fit_sel = sel
	Trajes.apply(preview_pip, sel)
	var def: Dictionary = Datos.trajes_por_id.get(sel, {}) if sel != null else {}
	var owned: bool = sel == null or sel in F.owned
	var on: bool = F.on == sel
	side.add_child(_title(def.name if def else "Bufanda de siempre", 26, false))
	side.add_child(_label(def.desc if def else "La bufanda menta con su broche de estrella: Pip tal como es.", 14, INK_SOFT))
	var row := _row(8)
	var redraw := func(): show_shop(shop_id) if shop_id != null else show_tab("trajes")
	if on:
		row.add_child(_label("Puesto", 15, Color("#4fae98"), false, false))
	if owned:
		if not on:
			row.add_child(button("Poner", func():
				g.wear_outfit(sel)
				Sfx.play("item")
				redraw.call(), true))
		elif def:
			row.add_child(button("Quitar", func():
				g.wear_outfit(null)
				fit_sel = null
				redraw.call()))
	elif def.get("shop") != null and shop_id == null:
		var npc: Dictionary = Datos.pnj[def.shop]
		row.add_child(_label("Solo en la tienda de %s · %s · %d chispas" % [npc.name, Datos.mundos.worlds[npc.world].galaxy, int(def.price)], 14, INK_SOFT))
	else:
		var lack := int(def.price) - floori(g.sparks)
		row.add_child(button("Comprar · %d chispas" % int(def.price), func():
			if g.buy_outfit(sel):
				Sfx.play("chest")
				g.vibrate(30)
			else:
				Sfx.play("deny")
			redraw.call(), true, lack > 0))
		row.add_child(_label(("Te faltan %d" % lack) if lack > 0 else ("Tienes %d" % floori(g.sparks)), 14, INK_SOFT, false, false))
	side.add_child(row)
	var grid := HFlowContainer.new()
	grid.add_theme_constant_override("h_separation", 6)
	grid.add_theme_constant_override("v_separation", 6)
	for id in list:
		var has: bool = id == null or id in F.owned
		var nm: String = Datos.trajes_por_id[id].name if id != null else "De siempre"
		var b := button(nm + (" ✓" if has else ""), func():
			fit_sel = id
			redraw.call())
		b.modulate = Color(1, 1, 1, 1) if id == sel else Color(1, 1, 1, 0.75)
		grid.add_child(b)
	side.add_child(grid)

func _page_outfits() -> void:
	_outfit_panel(body)

func _page_map() -> void:
	var g = game
	var map := Control.new()
	map.custom_minimum_size = Vector2(0, 300)
	map.draw.connect(func(): _draw_map(map))
	body.add_child(map)
	var tid = g.missions.tracked
	if tid != null:
		body.add_child(_label("Siguiendo: " + g.missions.def(tid).title, 15, INK))
	for id in g.regions:
		var r: Dictionary = g.regions[id]
		var row := _row(8)
		row.add_child(_label(r.name, 16, INK, false, false))
		if g.waves.has(id):
			var W: Dictionary = g.waves[id]
			var txt := ("En calma · las sombras vuelven en %d s" % maxi(1, ceili(W.calm))) if W.state == "calma" else ("Quedan las últimas sombras de la ola" if W.state == "fin" else "Sombras activas")
			row.add_child(_label("· " + txt, 14, INK_SOFT, false, false))
		if g.region == id:
			row.add_child(_label("· Estás aquí", 14, Color("#e0a93a"), false, false))
		body.add_child(row)

func _draw_map(c: Control) -> void:
	var g = game
	var minp := Vector2(INF, INF)
	var maxp := Vector2(-INF, -INF)
	for id in g.regions:
		var r: Dictionary = g.regions[id]
		minp = minp.min(r.center - Vector2.ONE * r.r)
		maxp = maxp.max(r.center + Vector2.ONE * r.r)
	var sz := c.size
	var span := maxp - minp
	var k := minf(sz.x / span.x, sz.y / span.y) * 0.9
	var off := sz / 2.0 - (minp + span / 2.0) * k
	var tp := func(x: float, z: float) -> Vector2: return Vector2(x, z) * k + off
	for id in g.regions:
		var r: Dictionary = g.regions[id]
		var p: Vector2 = tp.call(r.center.x, r.center.y)
		c.draw_circle(p, r.r * k, Color(r.ground) if r.has("ground") else Color(1, 1, 1, 0.6))
		c.draw_arc(p, r.r * k, 0, TAU, 40, Color(r.get("accent", "#ef9a8f")), 2.0, true)
		var w := Hud.sans.get_string_size(r.name, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x
		c.draw_string(Hud.sans, p - Vector2(w / 2, 0), r.name, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, INK)
	for t in g.missions.targets():
		c.draw_circle(tp.call(t.x, t.z), 5, Color("#ffe08a"))
	var pp: Vector3 = g.player.global_position
	var pv: Vector2 = tp.call(pp.x, pp.z)
	c.draw_circle(pv, 7, Color("#cf7a3e"))
	c.draw_arc(pv, 7, 0, TAU, 16, Color.WHITE, 2.0, true)

func _page_codex() -> void:
	var tabs := HFlowContainer.new()
	var cats := [["item", "Objetos", Datos.item_list, "obj_"], ["attack", "Ataques", Datos.attack_list, "atq_"], ["power", "Poderes", Datos.power_list, "pod_"],
		["chest", "Cofres", Datos.chest_list, ""], ["enemy", "Enemigos", Datos.enemy_list, "ene_"], ["elite", "Élites", Datos.elite_list, ""]]
	var cur: Array = cats[0]
	for c in cats:
		var seen: Array = game.codex.get(c[0], [])
		var n: int = c[2].filter(func(x): return x.id in seen).size()
		var b := button("%s %d/%d" % [c[1], n, c[2].size()], func():
			codex_tab = c[0]
			show_tab("compendio"))
		b.modulate = Color(1, 1, 1, 1) if codex_tab == c[0] else Color(1, 1, 1, 0.6)
		tabs.add_child(b)
		if c[0] == codex_tab:
			cur = c
	body.add_child(tabs)
	var seen2: Array = game.codex.get(cur[0], [])
	var grid := GridContainer.new()
	grid.columns = 2 if _vw() > 700 else 1
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 8)
	for d in cur[2]:
		var known: bool = d.id in seen2
		var card := _card()
		card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var h := _row(10)
		card.add_child(h)
		if cur[3] != "" and known:
			h.add_child(_icon(Datos.icon(cur[3] + d.id), 44))
		var v := VBoxContainer.new()
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(v)
		v.add_child(_label(d.name if known else "???", 16, INK))
		v.add_child(_label(str(d.get("desc", "")) if known else "Aún no lo descubres", 13, INK_SOFT))
		grid.add_child(card)
	body.add_child(grid)

func _page_system() -> void:
	var g = game
	var card := _card()
	var v := VBoxContainer.new()
	card.add_child(v)
	if g.slot:
		v.add_child(_title(g.profile.name, 24, false))
		v.add_child(_label("Ranura %d · %s · se guarda solo" % [g.slot, g.W.name], 14, INK_SOFT))
	else:
		v.add_child(_title("Partida de prueba", 24, false))
		v.add_child(_label("Esta partida no se guarda.", 14, INK_SOFT))
	body.add_child(card)
	var acts := _row(10)
	acts.add_child(button("Guardar", func(): g.save_now(false)))
	acts.add_child(button("Guardar y salir", func(): g.save_and_quit(), true))
	if g.slot:
		acts.add_child(button("Copiar código de la partida", func():
			DisplayServer.clipboard_set(export_code())
			Hud.toast("Código copiado")))
	body.add_child(acts)
	var S: Dictionary = g.settings
	var save := func(): Juego.save_settings()
	body.add_child(_slider("Sensibilidad de cámara", 0.3, 2.5, 0.1, float(S.get("sens", 1.0)), func(x):
		S.sens = x
		save.call()))
	body.add_child(_slider("Volumen de la música", 0.0, 1.0, 0.05, float(S.get("music", 0.8)), func(x):
		S.music = x
		Sfx.set_music_volume(x)
		save.call()))
	var q := _row(8)
	q.add_child(_label("Calidad gráfica", 16, INK, false, false))
	for pair in [["auto", "Automática"], ["baja", "Baja"], ["media", "Media"], ["alta", "Alta"]]:
		var b := button(pair[1], func():
			S.quality = pair[0]
			save.call()
			Juego.apply_quality(g)
			show_tab("sistema"))
		b.modulate = Color(1, 1, 1, 1) if S.get("quality", "auto") == pair[0] else Color(1, 1, 1, 0.6)
		q.add_child(b)
	body.add_child(q)
	if g.is_touch():
		for pair in [["autofire", "Disparo automático"], ["camAssist", "La cámara acompaña al moverte"], ["vibration", "Vibración"]]:
			var cb := CheckBox.new()
			cb.text = pair[1]
			cb.button_pressed = bool(S.get(pair[0], true))
			cb.add_theme_color_override("font_color", INK)
			cb.toggled.connect(func(on):
				S[pair[0]] = on
				save.call())
			body.add_child(cb)
	body.add_child(_label("Star Nova · " + version_text(), 13, INK_SOFT))

func _slider(text: String, a: float, b: float, step: float, val: float, cb: Callable) -> Control:
	var h := _row(12)
	var l := _label(text, 16, INK, false, false)
	l.custom_minimum_size = Vector2(240, 0)
	h.add_child(l)
	var s := HSlider.new()
	s.min_value = a
	s.max_value = b
	s.step = step
	s.value = val
	s.custom_minimum_size = Vector2(260, 28)
	s.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	s.value_changed.connect(cb)
	h.add_child(s)
	return h

# ----------------------------------------------------------------------------------------------- tienda
func show_shop(npc_id) -> void:
	var npc: Dictionary = Datos.pnj[npc_id]
	var s := _screen("shop", 0.3)
	var v := _center_panel(s, 900)
	v.add_child(_title("Tienda de " + npc.name, 32))
	v.add_child(_label("Ropa exclusiva de %s · solo se vende aquí" % Datos.mundos.worlds[npc.world].name, 14, INK_SOFT, true))
	_outfit_panel(v, npc_id)
	var foot := _row(10, true)
	foot.add_child(button("Salir de la tienda", func(): game.close_shop(), true))
	v.add_child(foot)

func hide_shop() -> void:
	_close("shop")
	preview.render_target_update_mode = SubViewport.UPDATE_DISABLED

# ----------------------------------------------------------------------------------------------- mapa galáctico
func show_galaxy() -> void:
	var g = game
	var s := _screen("galaxy", 0.45)
	s.color = Color(0.06, 0.04, 0.16, 0.82)
	var v := _center_panel(s, 900, _panel_style(Color(0.12, 0.09, 0.27, 0.92)))
	var k := _kicker("Cohete Avellana · mapa galáctico")
	k.add_theme_color_override("font_color", Color("#ffd36e"))
	v.add_child(k)
	var t := _title("¿A qué galaxia viajamos?", 34)
	t.add_theme_color_override("font_color", Color.WHITE)
	v.add_child(t)
	var row := _row(12, true)
	v.add_child(row)
	var done: Array = g.done_worlds()
	for id in Datos.mundos.order:
		var w: Dictionary = Datos.mundos.worlds[id]
		var here: bool = id == g.world_id
		var ok: bool = g.can_travel(id)
		var prev: String = g.previous_world(id)
		var card := _card(Color(1, 1, 1, 0.92 if ok else 0.55))
		card.custom_minimum_size = Vector2(250, 0)
		var cv := VBoxContainer.new()
		card.add_child(cv)
		var dot := ColorRect.new()
		dot.color = Color(w.color)
		dot.custom_minimum_size = Vector2(0, 10)
		cv.add_child(dot)
		cv.add_child(_label(w.galaxy.to_upper(), 12, Color("#c07a86")))
		cv.add_child(_title(w.name, 22, false))
		cv.add_child(_label(w.blurb, 13, INK_SOFT))
		var st := "Estás aquí" if here else ("Estrella rescatada ✓" if id in done else ("Disponible" if ok else "Bloqueada: termina %s" % Datos.mundos.worlds[prev].name))
		cv.add_child(_label(st, 14, Color("#4fae98") if ok else INK_SOFT))
		if not here and ok:
			cv.add_child(button("Viajar", func(): g.travel_to(id), true))
		row.add_child(card)
	var foot := _row(10, true)
	foot.add_child(button("Bajar del cohete", func(): g.close_galaxy()))
	v.add_child(foot)

func hide_galaxy() -> void:
	_close("galaxy")

# ----------------------------------------------------------------------------------------------- muerte y final
func show_dead() -> void:
	var s := _screen("dead", 0.5)
	var v := _center_panel(s, 520)
	v.add_child(_title("Pip se desvaneció…", 36))
	v.add_child(_label("Las estrellas te recuerdan. Volverás junto a la hoguera del Claro.", 16, INK_SOFT, true))
	var row := _row(10, true)
	var b := button("Volver", func(): game.respawn(), true)
	row.add_child(b)
	v.add_child(row)
	b.call_deferred("grab_focus")

func hide_dead() -> void:
	_close("dead")

func show_ending(kicker: String, title: String, stats: String) -> void:
	var s := _screen("ending", 0.4)
	var v := _center_panel(s, 720)
	v.add_child(_kicker(kicker))
	v.add_child(_title(title, 40))
	v.add_child(_label(stats, 16, INK, true))
	var row := _row(10, true)
	var b := button("Seguir explorando", func(): game.continue_after_ending(), true)
	row.add_child(b)
	v.add_child(row)
	b.call_deferred("grab_focus")

func hide_ending() -> void:
	_close("ending")

func _process(dt: float) -> void:
	if preview_tex and is_instance_valid(preview_tex) and preview_tex.is_visible_in_tree():
		_preview_t += dt
		preview_pip.animate(dt, {"pos": Vector3.ZERO, "yaw": sin(_preview_t * 0.6) * 0.8 + 0.4, "speed": 0.0, "grounded": true, "vy": 0.0})
	elif preview.render_target_update_mode != SubViewport.UPDATE_DISABLED:
		preview.render_target_update_mode = SubViewport.UPDATE_DISABLED
