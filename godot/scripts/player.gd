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
var game                          ## el juego (main.gd); null en pruebas sueltas
var aiming := false               ## si dispara, Pip mira hacia donde apunta la cámara
var invuln := 0.0
var hurt_t := 0.0
var burn_t := 0.0
var slow_t := 0.0
var tail_t := 0.0
var boost := 0.0                  ## rebote de gelatina: el salto variable no lo corta
var flight := {}                  ## vuelo en arco de los Impulsores Cometa
var gliding := false

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

func setup(g, world_root: Node3D, camera: CameraRig, pos: Vector3) -> void:
	game = g
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

func muzzle() -> Vector3:
	var f := Vector3(sin(yaw), 0, cos(yaw))
	return global_position + Vector3(f.x * 0.25, 0.36, f.z * 0.25)

func _st(key: String, def := 1.0) -> float:
	return float(game.stats.get(key, def)) if game and game.stats else def

## Impulsor Cometa: Pip vuela en arco hasta el destino (sin físicas mientras vuela).
func launch(to: Vector3, height := 6.0, dur := 1.4) -> void:
	flight = {"a": global_position, "b": to, "h": height, "t": 0.0, "dur": dur, "flip2": false}
	velocity = Vector3.ZERO
	model.flip()

func _update_flight(dt: float) -> void:
	var f := flight
	f.t += dt
	var k := minf(1.0, f.t / f.dur)
	var p: Vector3 = f.a.lerp(f.b, k)
	p.y += f.h * 4.0 * k * (1.0 - k)
	global_position = p
	yaw = atan2(f.b.x - f.a.x, f.b.z - f.a.z)
	spin += dt * 12.0
	if randf() < 0.7:
		Fx.sparkle(get_parent(), center(), Color.from_hsv(fmod(f.t * 0.8, 1.0), 0.6, 1.0), 1, 0.3)
	if f.t > 0.5 and not f.flip2:
		f.flip2 = true
		model.flip()
	if k >= 1.0:
		flight = {}
		velocity = Vector3(0, -1, 0)
		last_safe = global_position
		Fx.ring(get_parent(), global_position, Color.WHITE, 14, 4)

func _physics_process(dt: float) -> void:
	invuln = maxf(0.0, invuln - dt)
	hurt_t = maxf(0.0, hurt_t - dt)
	if tail_t > 0:
		tail_t -= dt
	if not flight.is_empty():
		_update_flight(dt)
		return
	if slow_t > 0:
		slow_t -= dt
	var fwd := cam.flat_forward()
	var right := Vector3(-fwd.z, 0, fwd.x)
	var wish := right * input_move.x + fwd * input_move.y
	var wl: float = minf(1.0, wish.length())
	if wl > 0.01:
		wish = wish.normalized() * wl
	var speed = 5.6 * _st("speed") * (game.buff_mul("speed") if game else 1.0) * (0.6 if slow_t > 0 else 1.0)
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
			velocity.y = 8.0 * sqrt(_st("jump"))
			jump_buf = 0
			coyote = 0
			grounded = false
			Sfx.play("jump")
			Fx.puff(get_parent(), global_position, Color.WHITE, 6)
		elif air_jumps > 0:
			air_jumps -= 1
			velocity.y = 7.0 * sqrt(_st("jump"))
			jump_buf = 0
			Sfx.play("jump")
			Fx.ring(get_parent(), global_position, Color("#fff3d0"))
			model.flip()
	boost = maxf(0.0, boost - dt)
	if not hold_jump and velocity.y > 2.5 and boost <= 0:
		velocity.y -= GRAVITY * 0.9 * dt          # salto variable
	velocity.y -= GRAVITY * dt * (1.18 if velocity.y < 0 else 1.0)
	velocity.y = maxf(velocity.y, -24.0)
	# planeo (Alas de Cometa): mantener saltar mientras cae
	gliding = _st("glide", 0.0) > 0 and not grounded and hold_jump and velocity.y < -1.5
	if gliding:
		velocity.y = maxf(velocity.y, -2.2)
		if randf() < 0.3:
			Fx.puff(get_parent(), global_position + Vector3(0, 0.3, 0), Color("#e8f0ff"), 1)
	if not grounded:
		fall_peak = minf(fall_peak, velocity.y)

	# voltereta
	var dash_ready: bool = game.skills.ready("utility") if game else dash_cd <= 0
	if want_dash and dash_ready:
		if game:
			game.skills.use("utility")
		dash_cd = DASH_CD
		invuln = maxf(invuln, 0.3)
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
			if fall_peak < -11 and _st("stomp", 0.0) > 0 and game:
				game.stomp(global_position, _st("stomp", 0.0))
			fall_peak = 0
		coyote = 0.11
		air_jumps = max_air_jumps
		safe_t += dt
		if safe_t > 0.4:
			safe_t = 0
			# solo es "seguro" si hay suelo fijo justo debajo
			var space := get_world_3d().direct_space_state
			var q := PhysicsRayQueryParameters3D.create(global_position + Vector3(0, 0.2, 0), global_position + Vector3(0, -0.4, 0), 1)
			if not space.intersect_ray(q).is_empty():
				last_safe = global_position
	# empujar cajas y otros cuerpos con física
	for i in get_slide_collision_count():
		var c := get_slide_collision(i)
		var o := c.get_collider()
		if o is RigidBody3D and absf(c.get_normal().y) < 0.5:
			(o as RigidBody3D).apply_central_impulse(-c.get_normal() * 0.35)

	# orientación: hacia donde camina
	var target_yaw := yaw
	if face_yaw != null:
		target_yaw = face_yaw
	elif aiming:
		target_yaw = atan2(fwd.x, fwd.z)
	elif wish.length_squared() > 0.02:
		target_yaw = atan2(wish.x, wish.z)
	yaw += wrapf(target_yaw - yaw, -PI, PI) * (1.0 - exp(-dt * 16.0))

	# caída al vacío: vuelve a tierra firme
	if global_position.y < -14.0:
		if game:
			game.fell_off()
		else:
			teleport(last_safe + Vector3(0, 0.3, 0))
			Hud.toast("¡Uf! Pip vuelve a tierra firme")

func _process(dt: float) -> void:
	if model:
		model.animate(dt, {
			"pos": global_position, "yaw": yaw, "speed": Vector2(velocity.x, velocity.z).length(),
			"grounded": grounded, "vy": velocity.y, "dash": dash_t if flight.is_empty() else 0.1, "spin": spin,
			"tail": maxf(0.0, tail_t), "blink": invuln > 0 and hurt_t > 0 and int(Time.get_ticks_msec() / 50.0) % 2 == 0,
		})
