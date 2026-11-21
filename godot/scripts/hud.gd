## Star Nova — interfaz en pantalla (cartel de región, avisos, ayuda de controles y versión).
## Estilo de la web: suave, redondeado y con títulos en letra serif.
extends CanvasLayer

var serif: SystemFont
var banner_title: Label
var banner_sub: Label
var banner_box: VBoxContainer
var toast_label: Label
var toast_panel: PanelContainer
var hint_label: Label
var version_label: Label
var touch: TouchUI
var _banner_t := 0.0
var _toast_t := 0.0

func _ready() -> void:
	layer = 10
	serif = SystemFont.new()
	serif.font_names = PackedStringArray(["Cormorant Garamond", "Georgia", "Times New Roman", "Noto Serif", "DejaVu Serif", "serif"])
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	version_label = Label.new()
	version_label.text = "Star Nova · versión nativa " + str(ProjectSettings.get_setting("application/config/version")) + " (etapa 1)"
	version_label.position = Vector2(16, 12)
	_style(version_label, 15, Color("#7a5b6a"))
	root.add_child(version_label)

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
	toast_panel.position = Vector2(-260, 70)
	toast_panel.custom_minimum_size = Vector2(520, 0)
	toast_panel.add_theme_stylebox_override("panel", _pill(Color(1, 1, 1, 0.82)))
	toast_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(toast_panel)
	toast_label = Label.new()
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	toast_label.add_theme_color_override("font_color", Color("#4a3a52"))
	toast_label.add_theme_font_size_override("font_size", 17)
	toast_panel.add_child(toast_label)
	toast_panel.modulate.a = 0.0

	hint_label = Label.new()
	hint_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	hint_label.position = Vector2(-450, -48)
	hint_label.size = Vector2(900, 30)
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_style(hint_label, 15, Color("#6a5060"))
	root.add_child(hint_label)

	touch = TouchUI.new()
	touch.visible = false
	root.add_child(touch)

func _style(l: Label, size: int, color: Color) -> void:
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_shadow_color", Color(0.35, 0.2, 0.3, 0.45))
	l.add_theme_constant_override("shadow_offset_x", 0)
	l.add_theme_constant_override("shadow_offset_y", 2)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE

func _pill(c: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = c
	s.set_corner_radius_all(22)
	s.content_margin_left = 20
	s.content_margin_right = 20
	s.content_margin_top = 9
	s.content_margin_bottom = 9
	return s

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

func _process(dt: float) -> void:
	_banner_t = maxf(0.0, _banner_t - dt)
	banner_box.modulate.a = clampf(minf(_banner_t, 3.2 - _banner_t) * 2.5, 0.0, 1.0) if _banner_t > 0 else 0.0
	_toast_t = maxf(0.0, _toast_t - dt)
	toast_panel.modulate.a = clampf(_toast_t * 3.0, 0.0, 1.0)
