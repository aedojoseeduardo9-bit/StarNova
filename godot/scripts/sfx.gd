## Star Nova — sonidos y música (autoload "Sfx"). Los sonidos y las canciones (en cada tono) están en godot/audio/*.ogg.
## Música: Sfx.score(canción, tono) con fundido entre canciones; Sfx.score_stop(); Sfx.duck(k) baja el volumen.
extends Node

var _cache := {}
var _players: Array[AudioStreamPlayer] = []
var _next := 0
var music_a: AudioStreamPlayer
var music_b: AudioStreamPlayer
var current_song := ""
var music_volume := 0.8
var muted := false
var _duck := 1.0
var _fade := 0.0              ## 0..1 avance del fundido hacia music_a
var _fade_time := 1.6
var _stopping := false
var _stop_time := 2.0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i in 12:
		var p := AudioStreamPlayer.new()
		p.volume_db = -4.0
		add_child(p)
		_players.append(p)
	music_a = AudioStreamPlayer.new()
	music_b = AudioStreamPlayer.new()
	for m in [music_a, music_b]:
		m.volume_db = -80.0
		add_child(m)

func _stream(file: String) -> AudioStream:
	if _cache.has(file):
		return _cache[file]
	var path := "res://audio/" + file + ".ogg"
	var s: AudioStream = null
	if ResourceLoader.exists(path):
		s = load(path)
	_cache[file] = s
	return s

## Efecto de sonido. Para la campana, arg es la frecuencia (660, 784, 880, 988, 1175, 1320).
func play(id: String, arg = null) -> void:
	if muted:
		return
	var name := "sfx_" + id
	if id == "bell":
		name = "sfx_bell_" + str(arg if arg != null else 880)
	var s := _stream(name)
	if s == null:
		return
	var p := _players[_next]
	_next = (_next + 1) % _players.size()
	p.stream = s
	p.pitch_scale = 1.0
	p.play()

func _lin(k: float) -> float:
	return linear_to_db(maxf(0.0001, k))

## Música en bucle: canción y tono (semitonos). Si ya suena, no hace nada.
func score(song: String, key := 0) -> void:
	var id := "musica_%s_%d" % [song, key]
	if id == current_song and not _stopping:
		return
	var s := _stream(id)
	if s == null:
		s = _stream("musica_%s_0" % song)
	if s == null:
		return
	if s is AudioStreamOggVorbis:
		(s as AudioStreamOggVorbis).loop = true
	current_song = id
	_stopping = false
	# el que sonaba pasa a "b" y se apaga; el nuevo entra por "a"
	var tmp := music_b
	music_b = music_a
	music_a = tmp
	music_a.stream = s
	music_a.play()
	_fade = 0.0

func score_stop(fade := 2.0) -> void:
	if current_song == "":
		return
	_stopping = true
	_stop_time = maxf(0.05, fade)
	current_song = ""

func duck(k: float) -> void:
	_duck = k

func set_music_volume(v: float) -> void:
	music_volume = v

func set_muted(v: bool) -> void:
	muted = v

func _process(dt: float) -> void:
	var vol := 0.0 if muted else music_volume * _duck * 0.9
	if _stopping:
		_fade = maxf(0.0, _fade - dt / _stop_time)
		music_a.volume_db = _lin(vol * _fade)
		music_b.volume_db = -80.0
		if _fade <= 0.0:
			music_a.stop()
			music_b.stop()
			_stopping = false
		return
	_fade = minf(1.0, _fade + dt / _fade_time)
	music_a.volume_db = _lin(vol * _fade)
	music_b.volume_db = _lin(vol * (1.0 - _fade))
	if _fade >= 1.0 and music_b.playing:
		music_b.stop()
