## Star Nova — lo que sobrevive a recargar la escena (autoload "Juego"): referencia al juego en curso, el viaje
## pendiente entre mundos, volver a los perfiles tras "Guardar y salir", los ajustes y el compendio.
## Guarda en user:// (en la web era localStorage): ajustes.json, compendio.json, varios.json y perfil_N.json.
extends Node

var main = null
var viaje := {}                 ## {slot, world, arrive} al recargar la escena en otro mundo
var volver_perfiles := false
var args_override = null        ## atajos para la próxima carga (viajes de las partidas de prueba)
var settings := {}
var codex := {}
var _store := {}

const DEFAULT_SETTINGS := {"sens": 1.0, "autofire": true, "vibration": true, "camAssist": true, "music": 0.8, "quality": "auto"}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	settings = DEFAULT_SETTINGS.duplicate()
	var s = _read("ajustes")
	if s is Dictionary:
		settings.merge(s, true)
	var c = _read("compendio")
	codex = c if c is Dictionary else {"item": [], "attack": [], "power": [], "chest": [], "enemy": [], "elite": []}
	var v = _read("varios")
	_store = v if v is Dictionary else {}
	get_tree().auto_accept_quit = false

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		if main and is_instance_valid(main):
			main.save_now(true)
		get_tree().quit()

## Atajos de la línea de órdenes: `godot -- --auto --ir=coral` (los mismos de la URL de la web).
func args() -> Dictionary:
	if args_override is Dictionary:
		var o: Dictionary = args_override
		args_override = null
		return o
	var out := {}
	for a in OS.get_cmdline_user_args():
		var s := a.trim_prefix("--")
		var kv := s.split("=", true, 1)
		out[kv[0]] = kv[1] if kv.size() > 1 else "1"
	return out

func _path(name: String) -> String:
	return "user://%s.json" % name

func _read(name: String):
	if not FileAccess.file_exists(_path(name)):
		return null
	var f := FileAccess.open(_path(name), FileAccess.READ)
	if f == null:
		return null
	return JSON.parse_string(f.get_as_text())

func write(name: String, data) -> bool:
	var f := FileAccess.open(_path(name), FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(data))
	return true

func remove(name: String) -> void:
	if FileAccess.file_exists(_path(name)):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(_path(name)))

func read(name: String):
	return _read(name)

func save_settings() -> void:
	write("ajustes", settings)

func save_codex() -> void:
	write("compendio", codex)

func store_get(key: String, def = null):
	return _store.get(key, def)

func store_set(key: String, v) -> void:
	_store[key] = v
	write("varios", _store)

## Calidad gráfica (Sistema → Calidad gráfica): sombras, suavizado y resolución 3D. "auto" elige según el aparato.
func apply_quality(g) -> void:
	var q: String = str(settings.get("quality", "auto"))
	if q == "auto":
		q = "media" if (OS.has_feature("mobile") or OS.has_feature("android") or OS.has_feature("ios")) else "alta"
	var vp = g.get_viewport()
	match q:
		"baja":
			vp.msaa_3d = Viewport.MSAA_DISABLED
			vp.scaling_3d_scale = 0.7
			g.sky.sun.shadow_enabled = false
		"media":
			vp.msaa_3d = Viewport.MSAA_2X
			vp.scaling_3d_scale = 0.85
			g.sky.sun.shadow_enabled = true
			RenderingServer.directional_shadow_atlas_set_size(1024, true)
		_:
			vp.msaa_3d = Viewport.MSAA_4X
			vp.scaling_3d_scale = 1.0
			g.sky.sun.shadow_enabled = true
			RenderingServer.directional_shadow_atlas_set_size(2048, true)
