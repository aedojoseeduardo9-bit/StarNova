## Star Nova — lo que sobrevive a recargar la escena (autoload "Juego"): referencia al juego en curso, el viaje
## pendiente entre mundos, volver a los perfiles tras "Guardar y salir", los ajustes y el compendio.
## Guarda en user://: ajustes.json, compendio.json, varios.json y perfil_N.json.
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

## Al actualizar desde la versión anterior de la app (mismo paquete en Android), sus partidas siguen guardadas
## en la carpeta de la app (app_webview/…/Local Storage/leveldb). La primera vez se buscan los perfiles
## ("starnova.perfil.N") y se copian a las ranuras. Devuelve cuántos recuperó.
func recuperar_partidas_anteriores() -> int:
	if not OS.has_feature("android") or store_get("migrado", false):
		return 0
	store_set("migrado", true)
	for n in Guardado.SLOTS:
		if Guardado.read(n) != null:
			return 0
	var base := OS.get_user_data_dir().get_base_dir().path_join("app_webview/Default/Local Storage/leveldb")
	var dir := DirAccess.open(base)
	if dir == null:
		return 0
	var found := {}
	var files: Array = []
	for f in dir.get_files():
		if f.ends_with(".log") or f.ends_with(".ldb"):
			files.append(f)
	files.sort()
	for f in files:
		var data := FileAccess.get_file_as_bytes(base.path_join(f))
		for n in Guardado.SLOTS:
			var d = _ultimo_perfil(data, ("starnova.perfil.%d" % n).to_ascii_buffer())
			if d != null:
				found[n] = d
	for n in found:
		Guardado.write(n, found[n])
	return found.size()

static func _ultimo_perfil(data: PackedByteArray, key: PackedByteArray):
	var best = null
	var i := 0
	while true:
		i = _buscar(data, key, i)
		if i < 0:
			break
		var p := i + key.size()
		i += 1
		# largo del valor (varint) y el valor: 0x00 = UTF-16LE, 0x01 = Latin-1
		var length := 0
		var shift := 0
		while p < data.size() and shift < 35:
			var byte := data[p]
			p += 1
			length |= (byte & 0x7F) << shift
			shift += 7
			if byte < 0x80:
				break
		if length < 3 or p + length > data.size():
			continue
		var raw := data.slice(p + 1, p + length)
		var text := raw.get_string_from_utf16() if data[p] == 0 else raw.get_string_from_ascii()
		var j = JSON.parse_string(text)
		if j is Dictionary and j.get("name") is String:
			best = j
	return best

static func _buscar(data: PackedByteArray, key: PackedByteArray, from: int) -> int:
	var k0 := key[0]
	var last := data.size() - key.size()
	var i := from
	while i <= last:
		i = data.find(k0, i)
		if i < 0 or i > last:
			return -1
		if data.slice(i, i + key.size()) == key:
			return i
		i += 1
	return -1

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		if main and is_instance_valid(main):
			main.save_now(true)
		get_tree().quit()

## Atajos de la línea de órdenes: `godot -- --auto --ir=coral`.
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

## Calidad elegida (Sistema → Calidad gráfica): "baja", "media" o "alta"; "auto" elige según el aparato.
func quality() -> String:
	var q: String = str(settings.get("quality", "auto"))
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--calidad="):
			q = a.substr(10)
	if q == "auto":
		q = "media" if (OS.has_feature("mobile") or OS.has_feature("android") or OS.has_feature("ios")) else "alta"
	return q

## Aplica la calidad: arquitectura HD y pasto (media y alta), sombras, suavizado, brillo y resolución 3D.
func apply_quality(g) -> void:
	var q := quality()
	Mundo.set_quality(g.world, q)
	if g.sky.has_method("set_quality"):
		g.sky.set_quality(q)
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
