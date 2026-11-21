## Star Nova — "los ojos" de la versión nativa: capturas + pruebas automáticas, como tools/ojos.cjs en la web.
## Uso: godot --path godot -- --ojos=CARPETA   (lo hace godot/tools/ojos_nativo.sh con una pantalla virtual)
class_name Ojos
extends Node

var main: Node
var out_dir: String
var report := PackedStringArray()
var fails := 0

func _init(m: Node, dir: String) -> void:
	name = "Ojos"
	main = m
	out_dir = dir

func _ready() -> void:
	DirAccess.make_dir_recursive_absolute(out_dir)
	_run()

func _frames(n: int) -> void:
	for i in n:
		await get_tree().process_frame

func _secs(s: float) -> void:
	await get_tree().create_timer(s).timeout

func _cam(yaw: float, pitch: float, dist: float) -> void:
	var c: CameraRig = main.cam
	c.yaw = yaw
	c.pitch = pitch
	c.want = dist
	c.cur = dist

func _shot(file: String) -> void:
	await _frames(12)
	var img := get_viewport().get_texture().get_image()
	img.save_png(out_dir.path_join(file + ".png"))
	report.append("[%s] fps ~%d · dibujos %d · triángulos %d" % [file, Engine.get_frames_per_second(),
		RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME),
		RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME)])

## Simula una tecla de verdad (evento de entrada), no solo el estado de la acción.
func _tap(action: String, hold := 0.0) -> void:
	var e := InputEventAction.new()
	e.action = action
	e.pressed = true
	Input.parse_input_event(e)
	await _frames(2)
	if hold > 0:
		await _secs(hold)
	var r := InputEventAction.new()
	r.action = action
	r.pressed = false
	Input.parse_input_event(r)

func _check(ok: bool, what: String) -> String:
	if not ok:
		fails += 1
	return what + (" → OK" if ok else " → FALLO")

func _run() -> void:
	var pl: Player = main.player
	await _secs(0.3)
	await _shot("00_inicio")
	await _secs(1.2)
	_cam(0.5, 0.35, 7)
	await _secs(0.6)
	await _shot("01_claro")
	_cam(-0.9, 0.3, 9)
	await _secs(0.6)
	await _shot("02_glorieta_faro")
	_cam(2.6, 0.12, 1.7)
	Hud.visible = false
	await _secs(0.8)
	await _shot("03_pip")
	# Pip de perfil, quieto en un sitio despejado
	pl.teleport(Vector3(2, 0.6, 9))
	pl.yaw = 0.0
	_cam(PI / 2, 0.1, 1.6)
	await _secs(1.0)
	await _shot("03b_pip_perfil")
	Hud.visible = true

	# prueba: caminar
	_cam(0, 0.35, 4.2)
	pl.teleport(Vector3(0, 0.6, 5))
	await _secs(0.6)
	var a := pl.global_position
	Input.action_press("mover_adelante")
	await _secs(1.5)
	Input.action_release("mover_adelante")
	var b := pl.global_position
	var moved := Vector2(b.x - a.x, b.z - a.z).length()
	report.append(_check(moved > 1.0, "[prueba_mover] avanzó %.2f m (esperado > 1)" % moved))
	# prueba: salto y doble salto
	await _secs(0.4)
	var y0 := pl.global_position.y
	_tap("saltar", 0.18)
	await _secs(0.22)
	_tap("saltar", 0.2)
	await _secs(0.22)
	var y1 := pl.global_position.y
	report.append(_check(y1 - y0 > 0.8, "[prueba_salto] doble salto: subió %.2f m (esperado > 0.8)" % (y1 - y0)))
	await _secs(1.2)
	# prueba: voltereta
	var c := pl.global_position
	_tap("voltereta")
	await _secs(0.35)
	var d := pl.global_position
	var dashed := Vector2(d.x - c.x, d.z - c.z).length()
	report.append(_check(dashed > 1.5, "[prueba_voltereta] recorrió %.2f m (esperado > 1.5)" % dashed))
	# prueba: subir el escalón de la hoguera (0.22 m) caminando
	pl.teleport(Vector3(0, 0.05, 6.5))
	_cam(0, 0.35, 4.2)
	await _secs(0.4)
	Input.action_press("mover_adelante")
	await _secs(0.9)
	Input.action_release("mover_adelante")
	var e := pl.global_position
	report.append(_check(e.z < 4.2 and e.y > 0.15, "[prueba_escalon] subió al círculo de piedra (z %.2f, altura %.2f)" % [e.z, e.y]))
	# prueba: empujar una caja
	var crate: Node3D = null
	for n in main.world.get_children():
		if n is Props.Crate:
			crate = n
			break
	if crate:
		await _secs(0.5)
		var cp := crate.global_position
		pl.teleport(Vector3(cp.x + 1.6, 0.05, cp.z))
		_cam(PI / 2, 0.35, 4.2)    # mirando al oeste (hacia la caja)
		await _secs(0.4)
		Input.action_press("mover_adelante")
		await _secs(1.2)
		Input.action_release("mover_adelante")
		await _secs(0.4)
		var moved_c := crate.global_position.distance_to(cp)
		report.append(_check(moved_c > 0.1, "[prueba_caja] Pip empujó la caja %.2f m" % moved_c))
	# prueba: caer al vacío y volver a tierra firme
	pl.teleport(Vector3(0, 0.6, 5))
	await _secs(0.8)
	pl.global_position = Vector3(0, 2, 19)
	await _secs(2.5)
	var f := pl.global_position
	report.append(_check(f.y > -2.0 and Vector2(f.x, f.z).length() < 15.0, "[prueba_caida] volvió a tierra firme (%.1f, %.1f, %.1f)" % [f.x, f.y, f.z]))

	# controles táctiles en pantalla
	pl.teleport(Vector3(0, 0.6, 5))
	main.controls.set_touch(true)
	_cam(0.5, 0.35, 5)
	await _secs(0.8)
	await _shot("04_tactil")
	main.controls.set_touch(false)

	report.append("Pruebas con fallos: %d" % fails)
	var fa := FileAccess.open(out_dir.path_join("report.txt"), FileAccess.WRITE)
	fa.store_string("Star Nova nativo — informe de los ojos · Godot " + Engine.get_version_info().string + "\n" + "\n".join(report) + "\n")
	fa.close()
	print("\n".join(report))
	get_tree().quit(1 if fails > 0 else 0)
