## Star Nova — sonidos sintetizados al arrancar (como js/audio.js: sin archivos de audio).
## Se generan ondas cortas en memoria (AudioStreamWAV) y se tocan con un grupo de reproductores.
extends Node

const RATE := 22050
var _streams := {}
var _players: Array[AudioStreamPlayer] = []
var _next := 0

func _ready() -> void:
	for i in 8:
		var p := AudioStreamPlayer.new()
		p.volume_db = -6.0
		add_child(p)
		_players.append(p)
	_streams["jump"] = _tone([[380.0, 0.0]], 0.12, 1.6, 0.35)
	_streams["dash"] = _noise(0.22, 0.3)
	_streams["select"] = _tone([[660.0, 0.0]], 0.09, 1.0, 0.3)
	_streams["land"] = _noise(0.08, 0.15)
	_streams["bell"] = _tone([[880.0, 0.0], [880.0 * 2.76, 0.0]], 1.6, 1.0, 0.25)
	var notes := []
	for i in 5:
		notes.append([660.0 * pow(2.0, [0, 2, 4, 7, 9][i] / 12.0), i * 0.05])
	_streams["special"] = _tone(notes, 0.5, 1.0, 0.22)

## Notas: [[frecuencia, retraso]], todas con la misma duración y envolvente suave (empieza en volumen 0).
func _tone(notes: Array, dur: float, sweep: float, vol: float) -> AudioStreamWAV:
	var total := dur
	for n in notes:
		total = maxf(total, dur + n[1])
	var count := int(total * RATE)
	var data := PackedByteArray()
	data.resize(count * 2)
	for i in count:
		var tt := float(i) / RATE
		var v := 0.0
		for n in notes:
			var lt: float = tt - n[1]
			if lt < 0.0 or lt > dur:
				continue
			var f: float = n[0] * lerpf(1.0, sweep, lt / dur)
			var env := minf(1.0, lt / 0.006) * exp(-lt * 6.0 / dur)
			v += sin(TAU * f * lt) * env
		var s := int(clampf(v * vol, -1.0, 1.0) * 32767.0)
		data.encode_s16(i * 2, s)
	return _wav(data)

func _noise(dur: float, vol: float) -> AudioStreamWAV:
	var count := int(dur * RATE)
	var data := PackedByteArray()
	data.resize(count * 2)
	var last := 0.0
	for i in count:
		var tt := float(i) / RATE
		last = lerpf(last, randf() * 2.0 - 1.0, 0.25)      # ruido suave (filtrado)
		var env := minf(1.0, tt / 0.004) * (1.0 - tt / dur)
		data.encode_s16(i * 2, int(clampf(last * env * vol * 2.0, -1.0, 1.0) * 32767.0))
	return _wav(data)

func _wav(data: PackedByteArray) -> AudioStreamWAV:
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = RATE
	w.stereo = false
	w.data = data
	return w

func play(id: String) -> void:
	if not _streams.has(id):
		return
	var p := _players[_next]
	_next = (_next + 1) % _players.size()
	p.stream = _streams[id]
	p.play()
