## Star Nova — arranque de la versión nativa: arma el mundo, a Pip, la cámara, los controles y el cielo.
## Con `-- --ojos=CARPETA` toma capturas y hace pruebas automáticas (ver godot/tools/ojos_nativo.sh).
extends Node3D

var world: Node3D
var player: Player
var cam: CameraRig
var sky: SkyEnv
var controls: Controls
var region := ""
var time := 0.0
var regions := {}

func _ready() -> void:
	Controls.setup_actions()
	regions = {"claro": Palette.ISLAS.claro}            # etapa 1: solo El Claro
	sky = SkyEnv.new(regions)
	add_child(sky)
	world = Node3D.new()
	world.name = "Mundo"
	add_child(world)
	var spots := WorldIslas.build(world)
	world.add_child(Props.Campfire.new(spots.campfire))
	for c in spots.crates:
		world.add_child(Props.Crate.new(c))

	cam = CameraRig.new()
	add_child(cam)
	player = Player.new()
	add_child(player)
	player.setup(self, cam, spots.spawn)
	cam.follow = player
	cam.snap(player.global_position + Vector3(0, 0.55, 0))

	controls = Controls.new(player, cam)
	add_child(controls)
	var args := _args()
	controls.set_touch(Controls.is_touch_device() or args.has("tactil"))
	if args.has("cam"):
		var c: PackedStringArray = str(args.cam).split(",")
		cam.yaw = float(c[0])
		cam.pitch = float(c[1])
		if c.size() > 2:
			cam.want = float(c[2])
			cam.cur = cam.want
	if args.has("luz"):                                   # prueba: energía del sol y de la luz ambiental
		var lz: PackedStringArray = str(args.luz).split(",")
		sky.sun.light_energy = float(lz[0])
		sky.env.ambient_light_energy = float(lz[1])
	if args.has("ojos"):
		var o := Ojos.new(self, str(args.ojos))
		add_child(o)

func _args() -> Dictionary:
	var out := {}
	for a in OS.get_cmdline_user_args():
		var s := a.trim_prefix("--")
		var kv := s.split("=", true, 1)
		out[kv[0]] = kv[1] if kv.size() > 1 else "1"
	return out

func _process(dt: float) -> void:
	time += dt
	var p := player.global_position
	sky.update_sky(dt, p, time)
	var reg := Palette.region_at(regions, p.x, p.z)
	if reg != "" and reg != region:
		region = reg
		Hud.banner(regions[reg].name, regions[reg].sub)
	# la hoguera cura (cuando haya vida en la etapa 2) y da calorcito
