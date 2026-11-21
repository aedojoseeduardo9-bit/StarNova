## Star Nova — Pip: control del personaje (port de js/entities/player.js) con el controlador de Godot
## (CharacterBody3D + Jolt). Correr, doble salto con voltereta, salto variable, tiempo de gracia,
## voltereta (dash) con recarga, subir escalones bajos, empujar cajas y volver a tierra firme si cae.
class_name Player
extends CharacterBody3D

const GRAVITY := 22.0
const RAD := 0.17
const HEIGHT := 0.54
const CENTER := 0.27
const STEP := 0.34                 # escalón que sube solo (como el "autostep" de la web)
const DASH_CD := 3.2

var model: PipModel
var cam: CameraRig
var yaw := 0.0
var grounded := false
var coyote := 0.0
var jump_buf := 0.0
var air_jumps := 1
var max_air_jumps := 1
var dash_t := 0.0
var dash_cd := 0.0
var dash_dir := Vector3.ZERO
var spin := 0.0
var fall_peak := 0.0
var last_safe := Vector3.ZERO
var safe_t := 0.0
var face_yaw = null               ## si no es null, Pip mira hacia ahí
var input_move := Vector2.ZERO    ## x: derecha, y: adelante (lo llena Controls)
var want_jump := false
var hold_jump := false
var want_dash := false

func _init() -> void:
	name = "Jugador"
	collision_layer = 2
	collision_mask = 1 | 4
	floor_max_angle = deg_to_rad(52)
	floor_snap_length = 0.3
	floor_stop_on_slope = true
	floor_block_on_wall = false
	safe_margin = 0.02
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = RAD
	cap.height = HEIGHT
	cs.shape = cap
	cs.position.y = CENTER
	add_child(cs)

func setup(world_root: Node3D, camera: CameraRig, pos: Vector3) -> void:
	cam = camera
	model = PipModel.new()
	world_root.add_child(model)
	teleport(pos)

func teleport(p: Vector3) -> void:
	global_position = p
	velocity = Vector3.ZERO
	last_safe = p

func center() -> Vector3:
	return global_position + Vector3(0, CENTER, 0)

func _physics_process(dt: float) -> void:
	var fwd := cam.flat_forward()
	var right := Vector3(-fwd.z, 0, fwd.x)
	var wish := right * input_move.x + fwd * input_move.y
	var wl: float = minf(1.0, wish.length())
	if wl > 0.01:
		wish = wish.normalized() * wl
	var speed := 5.6
	dash_cd = maxf(0.0, dash_cd - dt)

	if dash_t > 0:
		dash_t -= dt
		velocity.x = dash_dir.x * 15.0
		velocity.z = dash_dir.z * 15.0
		velocity.y = maxf(velocity.y, -2.0)
		spin += dt * 22.0
	else:
		var acc := 42.0 if grounded else 16.0
		var k := 1.0 - exp(-acc * dt / maxf(1.0, speed) * 2.4)
		velocity.x += (wish.x * speed - velocity.x) * k
		velocity.z += (wish.z * speed - velocity.z) * k
		spin = 0.0

	# saltos con tiempo de gracia y búfer
	coyote -= dt
	jump_buf -= dt
	if want_jump:
		jump_buf = 0.14
	want_jump = false
	if jump_buf > 0:
		if grounded or coyote > 0:
			velocity.y = 8.0
			jump_buf = 0
			coyote = 0
			grounded = false
			Sfx.play("jump")
			Fx.puff(get_parent(), global_position, Color.WHITE, 6)
		elif air_jumps > 0:
			air_jumps -= 1
			velocity.y = 7.0
			jump_buf = 0
			Sfx.play("jump")
			Fx.ring(get_parent(), global_position, Color("#fff3d0"))
			model.flip()
	if not hold_jump and velocity.y > 2.5:
		velocity.y -= GRAVITY * 0.9 * dt          # salto variable
	velocity.y -= GRAVITY * dt * (1.18 if velocity.y < 0 else 1.0)
	velocity.y = maxf(velocity.y, -24.0)
	if not grounded:
		fall_peak = minf(fall_peak, velocity.y)

	# voltereta
	if want_dash and dash_cd <= 0:
		dash_cd = DASH_CD
		dash_dir = wish.normalized() if wish.length_squared() > 0.01 else Vector3(sin(yaw), 0, cos(yaw))
		dash_t = 0.24
		Sfx.play("dash")
		Fx.puff(get_parent(), global_position, Color.WHITE, 10)
	want_dash = false

	# mover (y subir escalones bajos si choca de frente estando en el suelo)
	var was_grounded := grounded
	var horiz := Vector3(velocity.x, 0, velocity.z) * dt
	if was_grounded and horiz.length_squared() > 1e-6 and test_move(global_transform, horiz) \
			and not test_move(global_transform.translated(Vector3(0, STEP, 0)), horiz):
		global_position.y += STEP
	move_and_slide()
	grounded = is_on_floor() and velocity.y <= 0.5
	if grounded:
		if not was_grounded:
			if fall_peak < -6:
				model.land(-fall_peak)
				Fx.puff(get_parent(), global_position, Color.WHITE, 5)
			fall_peak = 0
		coyote = 0.11
		air_jumps = max_air_jumps
		safe_t += dt
		if safe_t > 0.4:
			safe_t = 0
			last_safe = global_position
	# empujar cajas y otros cuerpos con física
	for i in get_slide_collision_count():
		var c := get_slide_collision(i)
		var o := c.get_collider()
		if o is RigidBody3D:
			(o as RigidBody3D).apply_central_impulse(-c.get_normal() * 0.35)

	# orientación: hacia donde camina
	var target_yaw := yaw
	if face_yaw != null:
		target_yaw = face_yaw
	elif wish.length_squared() > 0.02:
		target_yaw = atan2(wish.x, wish.z)
	yaw += wrapf(target_yaw - yaw, -PI, PI) * (1.0 - exp(-dt * 16.0))

	# caída al vacío: vuelve a tierra firme
	if global_position.y < -14.0:
		teleport(last_safe + Vector3(0, 0.3, 0))
		Hud.toast("¡Uf! Pip vuelve a tierra firme")

func _process(dt: float) -> void:
	if model:
		model.animate(dt, {
			"pos": global_position, "yaw": yaw, "speed": Vector2(velocity.x, velocity.z).length(),
			"grounded": grounded, "vy": velocity.y, "dash": dash_t, "spin": spin,
		})
