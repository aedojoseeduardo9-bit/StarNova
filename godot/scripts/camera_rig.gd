## Star Nova — cámara en tercera persona sobre el hombro, con colisión contra el escenario (port de js/camera.js).
## yaw 0 = mirando al norte (-z), igual que en la web.
class_name CameraRig
extends Camera3D

var yaw := 0.0
var pitch := 0.32
var want := 4.2
var cur := 4.2
var shake := 0.0
var focus := Vector3.ZERO
var target := Vector3.ZERO
var follow: Player
var game = null

func _init() -> void:
	name = "Camara"
	fov = 62
	near = 0.05
	far = 2500
	current = true

func flat_forward() -> Vector3:
	return Vector3(-sin(yaw), 0, -cos(yaw))

func add_look(dx: float, dy: float) -> void:
	yaw -= dx
	pitch = clampf(pitch + dy, -0.55, 1.25)

func zoom(step: float) -> void:
	want = clampf(want + step * 0.5, 2.2, 9.0)

func snap(to: Vector3) -> void:
	target = to
	focus = to

## Pose de la cámara de juego (para que las escenas terminen justo donde vuelve el juego).
func pose(focus_at: Vector3) -> Dictionary:
	var cp := cos(pitch)
	var back := Vector3(sin(yaw) * cp, sin(pitch), cos(yaw) * cp)
	var pivot := focus_at + Vector3(cos(yaw), 0, -sin(yaw)) * 0.38
	return {"p": pivot + back * want, "l": pivot + Vector3(0, 0.15, 0)}

func _process(dt: float) -> void:
	if game and game.state == "cine":
		return
	if follow:
		focus = follow.global_position + Vector3(0, 0.55, 0)
	target = target.lerp(focus, 1.0 - exp(-dt * 14.0))
	var cp := cos(pitch)
	var sp := sin(pitch)
	var back := Vector3(sin(yaw) * cp, sp, cos(yaw) * cp)
	var right := Vector3(cos(yaw), 0, -sin(yaw))
	var pivot := target + right * 0.38
	# colisión de cámara
	var d := want
	var space := get_world_3d().direct_space_state
	if space:
		var q := PhysicsRayQueryParameters3D.create(pivot, pivot + back * (want + 0.3), 1)
		var hit := space.intersect_ray(q)
		if hit:
			d = maxf(0.6, pivot.distance_to(hit.position) - 0.3)
	cur = d if d < cur else cur + (d - cur) * (1.0 - exp(-dt * 4.0))
	var pos := pivot + back * cur
	if shake > 0:
		shake = maxf(0.0, shake - dt)
		var s := shake * 0.6
		pos += Vector3(randf() - 0.5, randf() - 0.5, randf() - 0.5) * s
	global_position = pos
	look_at(pivot + Vector3(0, 0.15, 0), Vector3.UP)
