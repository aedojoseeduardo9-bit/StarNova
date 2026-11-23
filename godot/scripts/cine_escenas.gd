## Star Nova — las escenas de la historia (port de las de js/cinema.js y js/cinema2.js), con los mismos planos,
## textos (data/historia.json y data/mundos.json), música y utilería. Ver cine.gd para el motor.
## Nota: en GDScript las funciones anónimas copian las variables simples, así que el estado que comparten los
## planos va en un diccionario (st).
class_name CineEscenas

const IDS := ["prologo", "recuerdo1", "recuerdo2", "recuerdo3", "recuerdo4", "porton", "guardian", "final", "cohete",
	"viaje_gemini", "viaje_soledad", "llegada_gemini", "llegada_soledad", "aterrizaje",
	"gemini_recuerdo1", "gemini_recuerdo2", "gemini_recuerdo3", "gemini_puerta", "gemini_jefe", "gemini_final",
	"soledad_recuerdo1", "soledad_recuerdo2", "soledad_recuerdo3", "soledad_puerta", "soledad_jefe", "soledad_final"]

static func has(id: String) -> bool:
	return id in IDS

static func v(x: float, y: float, z: float) -> Vector3:
	return Vector3(x, y, z)

static func ez(k: float) -> float:
	return k * k * (3.0 - 2.0 * k)

static func build(id: String, ctx: CineCtx, arg) -> Array:
	var g = ctx.game
	match id:
		"prologo": return prologo(ctx) if g.world_id == "islas" else []
		"recuerdo1", "recuerdo2", "recuerdo3", "recuerdo4": return recuerdo(ctx, int(id.substr(8))) if g.world_id == "islas" else []
		"porton", "gemini_puerta", "soledad_puerta": return porton(ctx)
		"guardian": return guardian(ctx) if g.world_id == "islas" else []
		"final": return final_islas(ctx) if g.world_id == "islas" else []
		"cohete": return cohete(ctx)
		"viaje_gemini": return viaje(ctx, "gemini")
		"viaje_soledad": return viaje(ctx, "soledad")
		"llegada_gemini", "llegada_soledad": return llegada(ctx, true)
		"aterrizaje": return llegada(ctx, false)
		"gemini_jefe", "soledad_jefe": return jefe(ctx)
		"gemini_final": return final_gemini(ctx) if g.world_id == "gemini" else []
		"soledad_final": return final_soledad(ctx) if g.world_id == "soledad" else []
	if id.begins_with("gemini_recuerdo") or id.begins_with("soledad_recuerdo"):
		if not id.begins_with(g.world_id):
			return []
		return memoria(ctx, int(id.right(1)))
	return []

static func _nc(g) -> Vector2:
	return g.regions.nova.center if g.regions.has("nova") else Vector2(0, 65)

# ======================================================================== prólogo
static func prologo(ctx: CineCtx) -> Array:
	var g = ctx.game
	var nc := _nc(g)
	var sp: Vector3 = Utileria._v3(g.spots.spawn)
	var C := v(nc.x, 15, nc.y)
	ctx.night(1.0)
	if g.props.nova:
		ctx.hide(g.props.nova)
	ctx.pip_at(v(sp.x, 0.02, sp.z), 0.0)
	var star := ctx.star_mesh(Color("#fff3bf"))
	star.global_position = C
	star.scale = Vector3.ONE * 2.4
	var halo := ctx.part("ico1", CineCtx.glow(Color("#ffe9a0")), C, Vector3.ONE * 4.6)
	var guard := ctx.prop_guardian(v(nc.x, 0, nc.y + 3), PI)
	var shadows: Array = []
	for i in 10:
		var m := ctx.sombra(1.5 + (i % 3) * 0.6)
		m.visible = false
		shadows.append(m)
	var tos := [v(-55, 6, 0), v(0, 8, -60), v(53, 6, 0), v(-14, 10, -30)]
	var frags: Array = []
	for to in tos:
		var f := ctx.frag(C, 0.5)
		f.visible = false
		f.set_meta("to", to)
		frags.append(f)
	var st := {"shake": 0.0}
	ctx.always(func(_dt, t):
		ctx.face_cam(star, t)
		star.global_position = C + Vector3((randf() - 0.5) * st.shake, (randf() - 0.5) * st.shake, 0)
		halo.scale = Vector3.ONE * (4.6 + sin(t * (2.0 + st.shake * 30.0)) * 0.4)
		if star.visible and randf() < 0.5:
			ctx.sparkle(C, "#fff2b8", 1, 2.4))
	var ring := func(k: float, r0: float, r1: float, y0: float, y1: float, spin: float) -> void:
		for i in shadows.size():
			var m: Node3D = shadows[i]
			var a := TAU * i / shadows.size() + k * spin
			var r := r0 + (r1 - r0) * k
			m.global_position = Vector3(C.x + cos(a) * r, y0 + (y1 - y0) * k + sin(i * 1.7) * 1.2, C.z + sin(a) * r)
			m.look_at(m.global_position * 2.0 - C, Vector3.UP)
	var face := v(sp.x, 0.5, sp.z)
	var o := ctx.orbit()
	return [
		{"t": 5.5, "music": "cuento", "cam": {"p": [v(0, 21, 30), v(0, 18.5, 39)], "l": [C]}, "say": "Antes, las islas del cielo nunca conocieron la noche."},
		{"t": 5.5, "cam": {"p": [v(13, 17, 55), v(-11, 18.5, 53)], "l": [C]}, "say": "Nova, la estrella pequeña, las cuidaba desde su santuario."},
		{"t": 4.5, "cam": {"p": [v(6.5, 1.0, 57), v(4.5, 1.5, 58)], "l": [v(0, 2.2, 68), v(0, 4.6, 67)]}, "say": "Y a ella la cuidaba su mejor amigo: el Guardián."},
		{"t": 6.0, "music": "penumbra", "cam": {"p": [v(0, 8, 38), v(0, 13, 43)], "l": [v(0, 6, 65), C]}, "say": "Pero debajo de las islas dormía la Penumbra: sombras con hambre de luz.",
			"on": func():
				for m in shadows: m.visible = true
				Sfx.play("rumble"),
			"tick": func(k, _dt, _t): ring.call(ez(k), 17.0, 9.0, -9.0, C.y - 2, 2.2)},
		{"t": 6.0, "cam": {"p": [v(9, 17, 53), v(6.5, 16, 56)], "l": [C]}, "say": "Una noche subieron todas a la vez. Para que no la devoraran, Nova tomó una decisión…",
			"tick": func(k, _dt, _t):
				ring.call(ez(k), 9.0, 3.4, C.y - 2, C.y, 3.2)
				st.shake = k * 0.35},
		{"t": 5.5, "cam": {"p": [v(0, 27, 90), v(0, 32, 99)], "l": [v(0, 13, 55), v(0, 7, 20)]}, "say": "…se rompió en fragmentos y los dejó caer sobre las islas.",
			"on": func():
				st.shake = 0.0
				star.visible = false
				halo.visible = false
				Fx.burst(g.world, C, Color("#fff2b8"), 90, 14, 0.3, 1.6)
				Fx.ring(g.world, C, Color.WHITE, 40, 16)
				for f in frags: f.visible = true
				Sfx.play("crystal")
				Sfx.play("rumble"),
			"tick": func(k, _dt, t):
				ring.call(minf(1.0, k * 1.6), 3.4, 26.0, C.y, C.y + 5, 1.2)
				for f in frags:
					var to: Vector3 = f.get_meta("to")
					f.global_position = C.lerp(to, ez(k)) + Vector3(0, sin(k * PI) * 9.0, 0)
					f.rotation.y = t * 5.0
					f.scale = Vector3.ONE * (0.5 + k * 1.3)
					if randf() < 0.5:
						ctx.emit(f.global_position, Vector3.ZERO, "#fff2b8", 0.5 + k * 0.9, 1.3)},
		{"t": 5.5, "music": "recuerdo", "cam": {"p": [v(1.3, 0.75, sp.z + 2.3), v(0.95, 0.7, sp.z + 1.9)], "l": [face, v(sp.x, 0.62, sp.z)]}, "say": "En El Claro, una ardilla diminuta lo vio todo.",
			"on": func():
				for m in shadows: m.visible = false
				guard.visible = false
				for i in frags.size(): frags[i].visible = i == 1
				ctx.pip_look_up = 1.0,
			"tick": func(k, _dt, t):
				var f: Node3D = frags[1]
				f.global_position = v(22, 26, -18).lerp(v(-4, 9, -56), k)
				f.rotation.y = t * 5.0
				f.scale = Vector3.ONE * 0.7
				if randf() < 0.5:
					ctx.emit(f.global_position, Vector3.ZERO, "#fff2b8", 0.6, 1.1)},
		{"t": 5.0, "cam": {"p": [v(0.95, 0.7, sp.z + 1.9), o.p], "l": [v(sp.x, 0.62, sp.z), o.l]}, "say": "Se llama Pip. Y esa noche decidió devolverle la luz al cielo.",
			"on": func():
				frags[1].visible = false
				ctx.night(0.0)
				ctx.pip_look_up = 0.0
				ctx.hop()},
	]

# ======================================================================== recuerdo de Nova (Islas)
static func recuerdo(ctx: CineCtx, n: int) -> Array:
	var g = ctx.game
	var pl: Player = g.player
	var P := pl.global_position
	var mems: Array = Datos.historia.memories
	var mem: Dictionary = mems[n] if n < mems.size() and mems[n] != null else mems[1]
	var F := v(sin(pl.yaw), 0, cos(pl.yaw))
	var R := v(cos(pl.yaw), 0, -sin(pl.yaw))
	var at := func(f: float, r: float, u: float) -> Vector3: return P + F * f + R * r + Vector3(0, u, 0)
	var frag := ctx.frag(P + Vector3(0, 1.15, 0), 0.2)
	var st := {"sink": 0.0}
	ctx.always(func(_dt, t):
		frag.rotation.y = t * 2.5
		frag.global_position.y = P.y + 1.15 - st.sink * 0.7 + sin(t * 2.2) * 0.05
		frag.scale = Vector3.ONE * maxf(0.001, 0.2 * (1.0 - st.sink))
		if frag.visible and randf() < 0.35:
			ctx.sparkle(frag.global_position, "#fff2b8", 1, 0.5))
	var nc := _nc(g)
	var path: Array
	match str(mem.place):
		"coral":
			var b: Vector3 = g.props.bells[0].anchor
			path = [v(-38, 9, 13), v(b.x + 7, b.y + 2.5, b.z + 8), v(b.x + 3.2, b.y + 0.6, b.z + 4.2), v(-55, 3, 0), v(b.x, b.y - 0.8, b.z), v(b.x, b.y - 0.8, b.z)]
		"menta":
			path = [v(11, 3, -44), v(9, 10, -49), v(6.5, 16, -53), v(0, 6, -60), v(0, 11, -61), v(0, 15, -63)]
		"lavanda":
			var a: Array = g.spots.altar.pos
			path = [v(38, 7, 10), v(56, 5.5, 8), v(float(a[0]) - 9, float(a[1]) + 2.2, 5), v(53, 2, 0), v(float(a[0]), float(a[1]), 0), v(float(a[0]), float(a[1]) + 0.4, 0)]
		_:
			ctx.prop_guardian(v(nc.x, 0, nc.y + 3), PI)
			path = [v(8, 2.2, 52), v(5.5, 2.6, 56), v(3.2, 2.2, 60.5), v(0, 2.4, 68), v(0, 2.2, 68), v(0, 2, 68)]
	var o := ctx.orbit()
	var face := P + Vector3(0, 0.52, 0)
	return [
		{"t": 5.4, "music": "recuerdo", "cam": {"p": [at.call(2.6, 1.2, 0.7), at.call(2.2, -0.5, 0.8)], "l": [face, P + Vector3(0, 0.8, 0)]}, "say": "El fragmento late como un corazón pequeño. Dentro guarda un recuerdo de Nova…",
			"on": func():
				Sfx.play("firefly")
				ctx.pip_look_up = 0.9},
		{"t": 6.0, "cam": {"p": [path[0], path[1]], "l": [path[3], path[4]], "linear": true}, "say": ["Nova", mem.lines[0]],
			"on": func():
				ctx.tint(true)
				Sfx.play("crystal")},
		{"t": 6.2, "cam": {"p": [path[1], path[2]], "l": [path[4], path[5]], "linear": true}, "say": ["Nova", mem.lines[1]]},
		{"t": 4.6, "cam": {"p": [at.call(2.1, 0.6, 0.7), at.call(1.8, 0.3, 0.68)], "l": [face]}, "say": "Fragmento %d de 4. %s" % [n, mem.end],
			"on": func(): ctx.tint(false),
			"tick": func(k, _dt, _t):
				st.sink = ez(minf(1.0, k * 1.4))
				if st.sink >= 1.0 and frag.visible:
					frag.visible = false
					Fx.burst(g.world, face, Color("#fff0b0"), 30, 4, 0.18, 1.0)
					Sfx.play("mission")
					ctx.pip_look_up = 0.0
					ctx.hop()},
		{"t": 1.8, "cam": {"p": [at.call(1.8, 0.3, 0.68), o.p], "l": [face, o.l]}},
	]

# ======================================================================== el portón se abre
static func porton(ctx: CineCtx) -> Array:
	var g = ctx.game
	var G = g.props.gate
	if G == null:
		return []
	var s: Dictionary = g.spots.gate
	var z := float(s.pos[2])
	var h := float(s.h)
	var top: float = G.base.y + h / 2.0
	var low := top - h - 0.3
	var y_was: float = G.global_position.y
	G.global_position.y = top
	ctx.undo(func():
		if G.open:
			G.snap_open()
		else:
			G.global_position.y = y_was)
	var need := int(g.W.gateNeed)
	G.set_lights(need)
	ctx.undo(func(): G.set_lights(mini(need, g.missions.fragments())))
	var o := ctx.orbit()
	var L: Array = g.W.get("gateLines", [
		["Abuela Lechuza", "«Tres luces… El portón del Santuario despierta, al sur del Claro.»"],
		"Hace cien años que nadie lo cruza.",
		["Abuela Lechuza", "«Ve con cuidado, Pip. Lo que duerme ahí dentro fue, una vez, el mejor amigo de Nova.»"],
	])
	var by: float = G.base.y
	return [
		{"t": 5.0, "music": "cuento", "cam": {"p": [v(3, by + 1.5, z - 10), v(1.2, by + 1.9, z - 6.5)], "l": [v(0, by + 2.6, z)]}, "say": L[0]},
		{"t": 5.2, "cam": {"p": [v(1.2, by + 1.9, z - 6.5), v(0, by + 1.4, z - 4.6)], "l": [v(0, by + 2.6, z), v(0, by + 1.8, z + 6)]}, "say": L[1],
			"on": func(): Sfx.play("rumble"),
			"tick": func(k, _dt, _t):
				G.global_position.y = top + (low - top) * ez(k)
				if k < 0.95 and randf() < 0.6:
					Fx.puff(g.world, v((randf() - 0.5) * 3, by + 0.1, z - 0.6), Color("#d6d9f4"), 2)},
		{"t": 6.6, "music": "guardian", "cam": {"p": [v(0, by + 1.4, z - 4.6), v(0, by + 2.8, z + 5.5)], "l": [v(0, by + 1.8, z + 6), v(0, by + 3.2, z + 17)]}, "say": L[2],
			"on": func(): G.global_position.y = low},
		{"t": 1.8, "cam": {"p": [o.p + Vector3(0, 3.5, 0), o.p], "l": [o.l]}},
	]

# ======================================================================== el Guardián despierta
static func guardian(ctx: CineCtx) -> Array:
	var g = ctx.game
	var nc := _nc(g)
	var B := v(nc.x, 0, nc.y + 2)
	if g.boss and is_instance_valid(g.boss.model):
		ctx.hide(g.boss.model)
	var m := ctx.prop_guardian(B, PI)
	var o := ctx.orbit()
	return [
		{"t": 4.2, "music": "guardian", "cam": {"p": [v(4, 0.7, B.z - 10), v(2.4, 1.1, B.z - 7.5)], "l": [v(0, 1.2, B.z), v(0, 2.2, B.z)]}, "say": ["El Guardián", "«…¿Quién… anda… ahí?»"], "on": func(): Sfx.play("rumble")},
		{"t": 5.0, "cam": {"p": [v(-4.5, 1.4, B.z - 5.5), v(-6, 4.6, B.z - 7.5)], "l": [v(0, 2.2, B.z)]}, "say": ["El Guardián", "«Nadie toca la estrella. Lo prometí… lo prometí…»"],
			"tick": func(k, _dt, _t):
				m.global_position.y = B.y + ez(k) * 1.1
				var a := randf() * TAU
				ctx.emit(v(B.x + cos(a) * 2.4, 0.2, B.z + sin(a) * 2.4), v(0, 2.2, 0), "#5a4fb0", 0.22, 1.1)},
		{"t": 4.4, "cam": {"p": [v(4.2, 2.3, B.z - 4.4), v(3.3, 2.7, B.z - 3.6)], "l": [v(0, 2.7, B.z - 0.9)]}, "say": "Sus ojos ya no ven a Pip: solo ven sombras. Hay que despertarlo."},
		{"t": 1.8, "cam": {"p": [o.p + Vector3(0, 3, -3), o.p], "l": [v(0, 2.2, B.z), o.l]}},
	]

# ======================================================================== final de las Islas
static func final_islas(ctx: CineCtx) -> Array:
	var g = ctx.game
	var nc := _nc(g)
	var A := v(nc.x, 2.3, nc.y)
	ctx.night(1.0)
	if g.props.nova:
		ctx.hide(g.props.nova)
	if g.boss and is_instance_valid(g.boss.model):
		ctx.hide(g.boss.model)
	var P := v(2.6, 0.02, nc.y - 5)
	ctx.pip_at(P, atan2(-2.6, 5))
	var star := ctx.star_mesh(Color("#fff3bf"))
	star.global_position = A
	star.scale = Vector3.ONE * 0.25
	star.visible = false
	var halo := ctx.part("ico1", CineCtx.glow(Color("#ffe9a0")), A, Vector3.ONE * 0.1)
	var guard := ctx.prop_guardian(v(-5.2, 0, nc.y - 3.5), atan2(5.2, 3.5))
	guard.rotation.x = 0.22
	guard.scale = Vector3(1, 0.86, 1)
	var frags: Array = []
	for i in 4:
		frags.append(ctx.frag(P + Vector3(0, 1, 0), 0.2))
	var st := {"rise": 0.0, "smoke": true, "grow": 0.25}
	ctx.always(func(_dt, t):
		ctx.face_cam(star, t, 0.7)
		star.global_position.y = A.y + st.rise * 15.0
		star.scale = Vector3.ONE * (st.grow + st.rise * 1.3)
		halo.global_position = star.global_position
		halo.scale = Vector3.ONE * (((1.2 + st.rise * 2.6) * (1.0 + sin(t * 3.0) * 0.08)) if star.visible else 0.01)
		if star.visible and randf() < 0.6:
			ctx.sparkle(star.global_position, "#fff2b8", 2, 1.2 + st.rise * 2.0)
		if st.smoke:
			ctx.emit(guard.global_position + Vector3((randf() - 0.5) * 3, 0.5 + randf() * 2.5, (randf() - 0.5) * 3), Vector3(randf() - 0.5, 2.6, randf() - 0.5), "#4a3f8c", 0.28, 1.4))
	var gp := guard.global_position
	return [
		{"t": 5.2, "music": "guardian", "cam": {"p": [v(-10, 1.8, nc.y - 8.5), v(-8.5, 2.6, nc.y - 7)], "l": [v(gp.x, 1.8, gp.z)]}, "say": "La Penumbra sale del Guardián como humo viejo.", "on": func(): Sfx.play("rumble")},
		{"t": 5.6, "music": "esperanza", "cam": {"p": [v(P.x + 1.5, 0.8, P.z - 2.2), v(P.x + 2.2, 1.2, P.z - 3)], "l": [v(P.x, 0.7, P.z), v(1, 1.6, nc.y - 2)]}, "say": ["Nova", "«Gracias, pequeña. Ya puedo volver a ser una sola.»"],
			"on": func():
				st.smoke = false
				Sfx.play("firefly")
				ctx.pip_look_up = 0.5,
			"tick": func(k, _dt, t):
				for i in frags.size():
					var f: Node3D = frags[i]
					var a = t * 3.0 + i * PI / 2.0
					var e := ez(maxf(0.0, k * 1.5 - 0.5))
					var from := v(P.x + cos(a) * 0.5, P.y + 0.9 + i * 0.08, P.z + sin(a) * 0.5)
					f.global_position = from.lerp(A, e)
					f.rotation.y = t * 4.0
					if randf() < 0.5:
						ctx.sparkle(f.global_position, "#fff2b8", 1, 0.3)},
		{"t": 7.0, "cam": {"p": [v(7, 1.1, nc.y - 11), v(10, 2.6, nc.y - 16)], "l": [A]}, "look": func(): return star.global_position, "say": "Nova sube, despacio, hasta su lugar en el cielo.",
			"on": func():
				for f in frags: f.visible = false
				star.visible = true
				Fx.burst(g.world, A, Color("#fff2b8"), 70, 9, 0.26, 1.4)
				Fx.ring(g.world, A, Color.WHITE, 30, 9)
				Sfx.play("mission")
				ctx.pip_look_up = 1.0
				ctx.hop(),
			"tick": func(k, _dt, _t):
				st.grow = 0.25 + minf(1.0, k * 4.0) * 0.65
				st.rise = ez(k)},
		{"t": 5.2, "cam": {"p": [v(-8.5, 1.3, nc.y - 6.5), v(-8, 1.9, nc.y - 7.5)], "l": [v(gp.x, 2.2, gp.z), v(gp.x, 3.4, gp.z)]}, "say": ["El Guardián", "«…Nova. Lo prometí… y casi lo olvido.»"],
			"tick": func(k, _dt, _t):
				guard.rotation.x = 0.22 * (1.0 - ez(k))
				guard.scale.y = 0.86 + 0.14 * ez(k)},
		{"t": 6.2, "cam": {"p": [v(0, 30, -22), v(0, 38, -36)], "l": [v(0, 13, 65)]}, "say": "Esa noche, por primera vez, las islas tuvieron una noche con estrellas."},
		{"t": 5.0, "cam": {"p": [v(P.x - 1.3, 0.45, P.z - 1.7), v(P.x - 1.15, 0.5, P.z - 1.55)], "l": [v(P.x, 0.75, P.z), v(P.x, 0.88, P.z + 0.2)]}, "say": "Pero la Penumbra no desaparece: aprende a dormir."},
		{"t": 5.6, "cam": {"p": [v(P.x - 1.15, 0.5, P.z - 1.55), v(P.x - 1.0, 0.55, P.z - 1.4)], "l": [v(P.x, 0.88, P.z + 0.2), v(P.x, 1.0, P.z + 0.4)], "linear": true}, "say": "Y mientras duerma, alguien tendrá que seguir cuidando la luz."},
	]

# ======================================================================== Brío destapa el Cohete Avellana
static func cohete(ctx: CineCtx) -> Array:
	var g = ctx.game
	var R = g.props.rocket
	if R == null:
		return []
	var P: Vector3 = R.p
	var brio = null
	for n in g.props.npcs:
		if n.id == "brio":
			brio = n
	ctx.night(0.8)
	ctx.pip_at(v(P.x + 1.5, P.y + 0.02, P.z - 3.6), atan2(-1.5, 3.6))
	var sky := v(P.x - 6, P.y + 26, P.z - 34)
	var nova := ctx.star_actor("#fff3bf", 1.6)
	nova.global_position = sky
	var tarp := Node3D.new()
	ctx.add(tarp)
	tarp.global_position = P
	Combate.part(tarp, "ico1", Props.mat("#a9b48a"), v(0, 1.3, 0), v(1.6, 1.4, 1.6))
	ctx.hide(R.model)
	if R.tarp:
		ctx.hide(R.tarp)
	var B: Vector3 = brio.p if brio else P + v(-2, 0, 1.8)
	var o := ctx.orbit()
	var st := {"lift": 0.0}
	ctx.always(func(_dt, _t):
		if st.lift > 0:
			tarp.global_position.y = P.y + st.lift * st.lift * 14.0
			tarp.rotation.z = st.lift * 2.5
			tarp.scale = Vector3.ONE * maxf(0.01, 1.0 - st.lift * 0.6))
	return [
		{"t": 5.6, "music": "recuerdo", "cam": {"p": [v(P.x + 3, 1.0, P.z - 6.5), v(P.x + 2.4, 1.3, P.z - 7.2)], "l": [v(P.x + 1.5, 0.8, P.z - 3.6), sky]}, "say": ["Nova", "«Pip… gracias. Pero no fui la única que cayó aquella noche.»"], "on": func(): ctx.pip_look_up = 1.0},
		{"t": 7.0, "cam": {"p": [v(P.x + 2.4, 1.3, P.z - 7.2), v(P.x + 1, 3, P.z - 9)], "l": [sky]}, "say": ["Nova", "«Mis hermanas también perdieron su luz: las gemelas de Gemini… y Sola, allá en la Galaxia Soledad.»"]},
		{"t": 5.6, "cam": {"p": [v(B.x - 2.6, 1.3, B.z - 3.4), v(B.x - 2.2, 1.4, B.z - 2.9)], "l": [v(B.x, 0.9, B.z)]}, "say": ["Brío", "«¡Para eso armé esto! Con los pedacitos de estrella que llovieron sobre el Claro…»"], "on": func(): ctx.pip_look_up = 0.0},
		{"t": 4.4, "music": "esperanza", "cam": {"p": [v(P.x + 5, 1.8, P.z - 6), v(P.x + 6.5, 2.6, P.z - 2)], "l": [v(P.x, 2, P.z)]}, "say": ["Brío", "«¡El Cohete Avellana!»"],
			"on": func():
				R.model.visible = true
				Fx.burst(g.world, v(P.x, P.y + 2, P.z), Color("#fff0b0"), 50, 6, 0.2, 1.2)
				Sfx.play("mission")
				ctx.hop()
				ctx.shake(0.2),
			"tick": func(k, _dt, _t):
				st.lift = minf(1.0, k * 1.2)
				if k > 0.95:
					tarp.visible = false},
		{"t": 7.0, "cam": {"p": [v(P.x + 6.5, 2.6, P.z - 2), v(P.x + 2, 2.2, P.z + 6)], "l": [v(P.x, 2, P.z)], "linear": true}, "say": ["Brío", "«Funciona con luz de estrella. Súbete, elige una galaxia en el mapa… y ve a rescatar los otros cristales de estrella.»"]},
		{"t": 1.8, "cam": {"p": [v(P.x + 2, 2.2, P.z + 6), o.p], "l": [v(P.x, 2, P.z), o.l]}},
	]

# ======================================================================== despegue y viaje por el espacio
static func viaje(ctx: CineCtx, dest: String) -> Array:
	var g = ctx.game
	var w: Dictionary = Datos.mundos.worlds[dest]
	var R = g.props.rocket
	var P: Vector3
	var M: Node3D
	var local := true
	if R and R.ready_:
		P = R.p
		M = R.model
	else:
		M = Modelos.make("cohete")
		ctx.add(M)
		P = g.player.global_position + v(3, 0, -3)
		M.global_position = P
		local = false
	var flame: Node3D = M.get_meta("u").get("flame")
	var y0 := M.position.y
	ctx.undo(func():
		if is_instance_valid(M):
			M.position.y = y0
			if flame: flame.visible = false)
	ctx.pip_at(v(P.x + 2.6, P.y + 0.02, P.z + 1.2), atan2(-2.6, -1.2))
	var pip0: Vector3 = g.player.global_position
	var win := v(P.x, P.y + 2.2, P.z)
	var C := v(P.x, 900, P.z)
	var ship := Modelos.make("cohete")
	ctx.add(ship)
	ship.global_position = C + v(0, -1.6, -9)
	ship.rotation.x = -PI / 2
	ship.visible = false
	var sf = ship.get_meta("u").get("flame")
	if sf: sf.visible = true
	var neb: Array = []
	for nb in [[-120, 40, -320, 90, w.color], [140, -60, -380, 110, w.color2], [0, 120, -420, 70, "#ffffff"]]:
		var mat := StandardMaterial3D.new()
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mat.albedo_color = Color(Color(nb[4]), 0.18)
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
		mat.disable_fog = true
		var nm := ctx.part("ico2", mat, C + v(nb[0], nb[1], nb[2]), Vector3.ONE * float(nb[3]))
		nm.visible = false
		neb.append(nm)
	var st := {"W": null}
	var lines: Array = Datos.historia.travel.get(dest, []).duplicate()
	while lines.size() < 3:
		lines.append("")
	var smoke := func(n: int, s := 1.0) -> void:
		for i in n:
			Fx.puff(g.world, v(P.x + (randf() - 0.5) * 3 * s, P.y + 0.2, P.z + (randf() - 0.5) * 3 * s), Color("#f4ece4"), 2)
	var top := func() -> Vector3: return M.global_position
	var count := func(n: int) -> Dictionary:
		return {"t": 1.0, "cam": {"p": [v(P.x + 4.5, 0.6, P.z + 4.5), v(P.x + 4.3, 0.7, P.z + 4.3)], "l": [v(P.x, 1.5, P.z)]}, "say": str(n) + "…",
			"on": func():
				Sfx.play("select")
				ctx.shake(0.05 * (4 - n)),
			"tick": func(_k, _dt, _t): smoke.call(1, 0.6)}
	var ship_bob := func(_k, _dt, t):
		ship.rotation.z = sin(t * 1.2) * 0.15
	return [
		{"t": 3.4, "music": "viaje", "cam": {"p": [v(P.x + 6, 1.4, P.z + 3), v(P.x + 5.4, 1.8, P.z + 2)], "l": [v(P.x + 1, 1.6, P.z)]}, "say": "Pip se sube al Cohete Avellana.",
			"tick": func(k, _dt, _t):
				var e := ez(minf(1.0, k * 1.3))
				ctx.move_pip(pip0.lerp(win, e) + Vector3(0, sin(e * PI) * 1.4, 0))
				g.player.yaw = atan2(win.x - pip0.x, win.z - pip0.z)
				if e > 0.98:
					ctx.hide_pip(),
			"on": func(): ctx.hop()},
		count.call(3), count.call(2), count.call(1),
		{"t": 3.8, "cam": {"p": [v(P.x + 7, 0.5, P.z + 7), v(P.x + 8, 0.8, P.z + 8)], "l": [v(P.x, 2, P.z)]}, "look": func(): return top.call() + Vector3(0, 1.5, 0), "say": "¡Despegue!",
			"on": func():
				if flame: flame.visible = true
				Sfx.play("rumble")
				Sfx.play("special")
				Fx.burst(g.world, v(P.x, P.y + 0.3, P.z), Color("#ffd38a"), 60, 8, 0.25, 1.0)
				ctx.shake(0.6),
			"tick": func(k, _dt, _t):
				M.position.y = y0 + k * k * 46.0
				smoke.call(3, 1.4)
				if randf() < 0.6:
					ctx.emit(M.global_position, v(0, -6, 0), "#ffb26b", 0.4, 0.5)},
		{"t": 3.4, "cam": {"p": [v(P.x + 14, 75, P.z + 14), v(P.x + 12, 95, P.z + 12)], "l": [v(P.x, 60, P.z)]}, "look": func(): return top.call(),
			"on": func(): ctx.night(1.0),
			"tick": func(k, _dt, _t):
				M.position.y = y0 + 46.0 + k * 130.0
				ctx.emit(M.global_position - Vector3(0, 0.5, 0), v(0, -8, 0), "#ffd38a", 0.5, 0.4)},
		{"t": 6.2, "cam": {"p": [C, C + v(0, 0.3, 0)], "l": [C + v(0, -0.5, -20)]}, "say": lines[0],
			"on": func():
				ctx.flash("#ffffff", 0.5)
				ctx.space(1.0)
				g.sky.update_sky(10.0, C, 0.0)
				ship.visible = true
				for n in neb: n.visible = true
				st.W = ctx.warp(C)
				Sfx.play("crystal"),
			"tick": func(_k, dt, t):
				ship.rotation.z = sin(t * 1.2) * 0.15
				ship.global_position.y = C.y - 1.6 + sin(t * 2.0) * 0.12
				for i in neb.size(): neb[i].global_position.z += dt * (4 + i)},
		{"t": 6.6, "cam": {"p": [C + v(2.5, 0.6, -4), C + v(-2.5, 0.2, -5)], "l": [C + v(0, -1.6, -9)], "linear": true}, "say": lines[1], "tick": ship_bob},
		{"t": 6.0, "cam": {"p": [C + v(-1.6, 1.6, -15), C + v(-0.6, 0.6, -13)], "l": [C + v(0, -1.6, -9)]}, "say": lines[2],
			"tick": func(k, dt, t):
				ship_bob.call(k, dt, t)
				if st.W: st.W.speed = 60.0 + k * 120.0},
		{"t": 1.6, "cam": {"p": [C, C + v(0, 0, -1)], "l": [C + v(0, -1.6, -40)]},
			"on": func():
				ctx.flash("#ffffff", 1.4)
				Sfx.play("mission"),
			"tick": func(_k, _dt, _t): if st.W: st.W.speed = 400.0},
	]

# ======================================================================== llegada a un planeta
static func llegada(ctx: CineCtx, first: bool) -> Array:
	var g = ctx.game
	var w: Dictionary = g.W
	var R = g.props.rocket
	if R == null:
		return []
	var P: Vector3 = R.p
	var M: Node3D = R.model
	var flame: Node3D = R.u.get("flame")
	var y0 := M.position.y
	var was_visible := M.visible
	M.visible = true
	ctx.undo(func():
		M.position.y = y0
		M.visible = was_visible or R.ready_
		if flame: flame.visible = false)
	ctx.hide_pip()
	var exitp: Vector3 = g.player.global_position
	var guide = null
	if w.get("guide"):
		for n in g.props.npcs:
			if n.id == w.guide:
				guide = n
	var o := ctx.orbit()
	var H := 80.0
	var arrival: Array = w.texts.get("arrival", ["", "", ""])
	var shots: Array = []
	if first:
		shots.append({"t": 4.6, "music": "viaje", "cam": {"p": [v(P.x + 40, 95, P.z + 60), v(P.x + 30, 80, P.z + 45)], "l": [v(P.x - 10, 0, P.z - 25)]}, "say": [w.galaxy, arrival[0]],
			"on": func():
				ctx.flash("#ffffff", 0.8)
				ctx.fog_far(520.0)
				M.position.y = y0 + H
				if flame: flame.visible = true,
			"tick": func(k, _dt, _t): M.position.y = y0 + H * (1.0 - k * 0.3)})
	var sh2 := {"t": 3.6, "cam": {"p": [v(P.x + 9, 2, P.z + 9), v(P.x + 8, 1.4, P.z + 8)], "l": [v(P.x, y0 + 30, P.z)]}, "look": func(): return M.global_position + Vector3(0, 1, 0),
		"on": func():
			if flame: flame.visible = true
			if first:
				ctx.fog_far(165.0)
			else:
				M.position.y = y0 + H
				ctx.flash("#ffffff", 0.6)
			Sfx.play("rumble"),
		"tick": func(k, _dt, _t):
			var tp := H * 0.7 if first else H
			M.position.y = y0 + tp * pow(1.0 - k, 2.2)
			if randf() < 0.6:
				ctx.emit(M.global_position, v(0, -6, 0), "#ffb26b", 0.4, 0.5)}
	if not first:
		sh2.music = "viaje"
	shots.append(sh2)
	shots.append({"t": 2.4, "cam": {"p": [v(P.x + 7, 1.2, P.z + 6), v(P.x + 6.4, 1.4, P.z + 5.4)], "l": [v(P.x, 1.6, P.z)]},
		"on": func():
			M.position.y = y0
			if flame: flame.visible = false
			ctx.shake(0.5)
			Fx.burst(g.world, v(P.x, P.y + 0.3, P.z), Color("#f4ece4"), 60, 6, 0.3, 1.2)
			Sfx.play("rumble")})
	var from := v(P.x, P.y + 2.2, P.z)
	shots.append({"t": 5.6 if first else 3.4, "cam": {"p": [v(exitp.x + 2.4, 1.1, exitp.z + 3), v(exitp.x + 1.8, 0.9, exitp.z + 2.4)], "l": [v(exitp.x, 0.6, exitp.z)]},
		"say": ["", arrival[1]] if first else "%s · %s" % [w.galaxy, w.name],
		"on": func():
			ctx.show_pip()
			ctx.move_pip(from)
			ctx.hop()
			Sfx.play("jump"),
		"tick": func(k, _dt, _t):
			var e := ez(minf(1.0, k * 1.8))
			ctx.move_pip(from.lerp(exitp, e) + Vector3(0, sin(e * PI) * 1.2, 0))
			if e >= 1.0:
				ctx.pip_look_up = 0.8})
	if first and guide:
		shots.append({"t": 6.4, "cam": {"p": [guide.p + v(2.2, 1.3, 2.6), guide.p + v(1.6, 1.1, 2.1)], "l": [guide.p + v(0, 0.8, 0)]}, "say": [guide.def.name, arrival[2]],
			"on": func(): ctx.pip_look_up = 0.0})
	shots.append({"t": 1.8, "cam": {"p": [guide.p + v(1.6, 1.1, 2.1) if (first and guide) else v(exitp.x + 1.8, 0.9, exitp.z + 2.4), o.p], "l": [v(exitp.x, 0.6, exitp.z), o.l]}})
	return shots

# ======================================================================== recuerdo en Gemini o Soledad
static func memoria(ctx: CineCtx, n: int) -> Array:
	var g = ctx.game
	var w: Dictionary = g.W
	var mems: Array = Datos.historia.memories_gemini if g.world_id == "gemini" else Datos.historia.memories_soledad
	var mem: Dictionary = mems[n] if n < mems.size() and mems[n] != null else mems[1]
	var pl: Player = g.player
	var P := pl.global_position
	var F := v(sin(pl.yaw), 0, cos(pl.yaw))
	var Rr := v(cos(pl.yaw), 0, -sin(pl.yaw))
	var at := func(f: float, r: float, u: float) -> Vector3: return P + F * f + Rr * r + Vector3(0, u, 0)
	var frag := ctx.frag(P + Vector3(0, 1.15, 0), 0.2)
	var st := {"sink": 0.0}
	ctx.always(func(_dt, t):
		frag.rotation.y = t * 2.5
		frag.global_position.y = P.y + 1.15 - st.sink * 0.7 + sin(t * 2.2) * 0.05
		frag.scale = Vector3.ONE * maxf(0.001, 0.2 * (1.0 - st.sink)))
	var foci := [v(-60, 6, 0), v(0, 2, -62), v(0, 3, 68), v(0, 2, 0)] if g.world_id == "gemini" else [v(-56, 3, 0), v(0, 12, -62), v(0, 3, 66), v(0, 3, 0)]
	var focus: Vector3 = foci[(n - 1) % 4]
	var orbit_at := func(a: float, r: float, h: float) -> Vector3: return focus + v(cos(a) * r, h, sin(a) * r)
	var face := P + Vector3(0, 0.52, 0)
	var o := ctx.orbit()
	return [
		{"t": 5.2, "music": "recuerdo", "cam": {"p": [at.call(2.6, 1.2, 0.7), at.call(2.2, -0.5, 0.8)], "l": [face, P + Vector3(0, 0.8, 0)]}, "say": "El fragmento late como un corazón pequeño. Dentro guarda un recuerdo…",
			"on": func():
				Sfx.play("firefly")
				ctx.pip_look_up = 0.9},
		{"t": 6.4, "cam": {"p": [orbit_at.call(0.3, 16, 7), orbit_at.call(1.1, 13, 5.5)], "l": [focus, focus], "linear": true}, "say": [mem.who, mem.lines[0]],
			"on": func():
				ctx.tint(true)
				Sfx.play("crystal")},
		{"t": 6.6, "cam": {"p": [orbit_at.call(1.1, 13, 5.5), orbit_at.call(1.9, 10, 4)], "l": [focus, focus], "linear": true}, "say": [mem.who, mem.lines[1]]},
		{"t": 4.6, "cam": {"p": [at.call(2.1, 0.6, 0.7), at.call(1.8, 0.3, 0.68)], "l": [face]}, "say": "Fragmento %d de %d. %s" % [n, int(w.fragSlots), mem.end],
			"on": func(): ctx.tint(false),
			"tick": func(k, _dt, _t):
				st.sink = ez(minf(1.0, k * 1.4))
				if st.sink >= 1.0 and frag.visible:
					frag.visible = false
					Fx.burst(g.world, face, Color("#fff0b0"), 30, 4, 0.18, 1.0)
					Sfx.play("mission")
					ctx.pip_look_up = 0.0
					ctx.hop()},
		{"t": 1.8, "cam": {"p": [at.call(1.8, 0.3, 0.68), o.p], "l": [face, o.l]}},
	]

static func _anim_boss(id: String, u: Dictionary, t: float, orbit_r: float, spin_k: float) -> void:
	if id == "gemelos":
		Enemigos.Boss.anim_gemelos(u, t, orbit_r, spin_k)
	elif id == "polilla":
		Enemigos.Boss.anim_polilla(u, t, false)

# ======================================================================== el jefe de Gemini o Soledad aparece
static func jefe(ctx: CineCtx) -> Array:
	var g = ctx.game
	var w: Dictionary = g.W
	var bid: String = w.boss
	var cfg: Dictionary = Datos.mundos.bosses[bid]
	var a: Dictionary = g.spots.arena
	var B := v(float(a.c[0]), float(a.get("y", 0.0)), float(a.c[1]) + 2)
	if g.boss and is_instance_valid(g.boss.model):
		ctx.hide(g.boss.model)
	var m := ctx.boss_model(bid)
	m.global_position = B + v(0, -6, 0)
	var u: Dictionary = m.get_meta("u")
	var orb := float(cfg.get("orbit", 3.2))
	ctx.always(func(_dt, t):
		_anim_boss(bid, u, t, orb, 0.6)
		if cfg.get("twin", false):
			m.rotation.y = t * 0.6)
	var L: Array = w.get("bossLines", ["", "", ""])
	var o := ctx.orbit()
	return [
		{"t": 4.6, "music": "guardian", "cam": {"p": [v(B.x + 5, 1.2, B.z - 12), v(B.x + 3, 1.6, B.z - 10)], "l": [v(B.x, 2, B.z), v(B.x, 3, B.z)]}, "say": L[0],
			"on": func():
				Sfx.play("rumble")
				ctx.shake(0.4),
			"tick": func(k, _dt, _t):
				m.global_position.y = B.y - 6.0 + ez(minf(1.0, k * 1.2)) * 6.0
				if randf() < 0.5:
					Fx.puff(g.world, v(B.x + (randf() - 0.5) * 6, B.y + 0.1, B.z + (randf() - 0.5) * 6), Color("#d6d0c8"), 2)},
		{"t": 5.2, "cam": {"p": [v(B.x - 7, 2.2, B.z - 6), v(B.x - 8, 5, B.z - 2)], "l": [v(B.x, 3, B.z)], "linear": true}, "say": L[1]},
		{"t": 4.8, "cam": {"p": [v(B.x + 2.8, 2.4, B.z - 5.4), v(B.x + 2.2, 2.8, B.z - 4.6)], "l": [v(B.x, 3.2, B.z)]}, "say": L[2]},
		{"t": 1.8, "cam": {"p": [o.p + v(0, 3, -3), o.p], "l": [v(B.x, 2.5, B.z), o.l]}},
	]

# ======================================================================== final de Gemini: Alba y Ocaso
static func final_gemini(ctx: CineCtx) -> Array:
	var g = ctx.game
	var a: Dictionary = g.spots.arena
	var A := v(float(a.c[0]), float(a.get("y", 0.0)), float(a.c[1]) + 2)
	if g.boss and is_instance_valid(g.boss.model):
		ctx.hide(g.boss.model)
	ctx.night(0.7)
	var P := v(A.x + 2.4, A.y, A.z - 6)
	ctx.pip_at(v(A.x + 2.4, A.y + 0.02, A.z - 6), atan2(-2.4, 6))
	var m := ctx.boss_model("gemelos")
	m.global_position = A
	var u: Dictionary = m.get_meta("u")
	var st := {"crack": 0.0, "sink": 0.0, "rise": 0.0, "hug": 0.0, "give": 0.0}
	ctx.always(func(_dt, t):
		_anim_boss("gemelos", u, t, 3.2, 0.3)
		for l in u.get("chain", []):
			l.position.x += (randf() - 0.5) * st.crack * 0.2
			l.visible = st.crack < 1.0
		m.global_position.y = A.y - st.sink * 5.0)
	var alba := ctx.star_actor("#ffe9a0", 0.7)
	var ocaso := ctx.star_actor("#c8a8ff", 0.7)
	alba.visible = false
	ocaso.visible = false
	var crystal := ctx.part("oct", Props.mat("#b8ffd0", Color("#3a8a5a")), A + v(0, 6, 0), v(0.35, 0.55, 0.35))
	crystal.visible = false
	ctx.always(func(_dt, t):
		var r: float = 3.2 * (1.0 - st.hug * 0.85)
		var h: float = A.y + 2.0 + st.rise * 9.0
		alba.global_position = v(A.x + cos(t * 1.4) * r, h, A.z + sin(t * 1.4) * r)
		ocaso.global_position = v(A.x - cos(t * 1.4) * r, h, A.z - sin(t * 1.4) * r)
		if alba.visible and randf() < 0.6:
			ctx.sparkle(alba.global_position, "#fff2b8", 1, 0.6)
			ctx.sparkle(ocaso.global_position, "#e0c8ff", 1, 0.6)
		if crystal.visible:
			crystal.rotation.y = t * 3.0
			crystal.global_position = v(A.x, A.y + 11, A.z).lerp(P + v(0, 1.2, 0), ez(st.give)))
	var sky := v(A.x, A.y + 11, A.z)
	var o := ctx.orbit()
	return [
		{"t": 5.0, "music": "guardian", "cam": {"p": [v(A.x + 8, 2, A.z - 9), v(A.x + 6.5, 2.4, A.z - 7.5)], "l": [v(A.x, 2.4, A.z)]}, "say": "La cadena de Penumbra que ataba a los Gemelos se agrieta…",
			"tick": func(k, _dt, _t):
				st.crack = k * 0.9
				ctx.shake(k * 0.15)},
		{"t": 5.6, "cam": {"p": [v(A.x - 7, 1.6, A.z - 8), v(A.x - 9, 3, A.z - 10)], "l": [v(A.x, 2, A.z)]}, "say": "Los Gemelos de Raíz vuelven a ser lo que eran: dos viejos árboles que cuidaban a las gemelas.",
			"on": func():
				st.crack = 1.0
				Fx.burst(g.world, v(A.x, A.y + 2.4, A.z), Color("#5a3f8c"), 60, 6, 0.25, 1.2)
				Sfx.play("rumble")
				ctx.flash("#3a2a5a", 0.4),
			"tick": func(k, _dt, _t): st.sink = ez(maxf(0.0, k - 0.3) / 0.7) * 0.4},
		{"t": 6.4, "music": "esperanza", "cam": {"p": [v(P.x + 1.5, 0.7, P.z - 2.4), v(P.x + 2, 1, P.z - 3)], "l": [v(A.x, A.y + 3, A.z), sky]}, "say": ["Alba", "«Ocaso… perdóname por no ver que estabas triste.»"],
			"on": func():
				alba.visible = true
				ocaso.visible = true
				ctx.pip_look_up = 1.0
				Sfx.play("crystal"),
			"tick": func(k, _dt, _t): st.rise = ez(k) * 0.6},
		{"t": 6.4, "cam": {"p": [v(A.x + 9, 4, A.z - 8), v(A.x + 6, 7, A.z - 10)], "l": [sky]}, "say": ["Ocaso", "«Y tú perdóname a mí. Yo no era tu sombra: era tu hermana.»"],
			"tick": func(k, _dt, _t):
				st.rise = 0.6 + k * 0.4
				st.hug = ez(k)},
		{"t": 6.6, "cam": {"p": [v(P.x + 1.6, 0.8, P.z - 2.4), v(P.x + 1.3, 0.9, P.z - 2)], "l": [P + v(0, 1.2, 0), P + v(0, 1, 0)]}, "say": ["Alba y Ocaso", "«Toma, Pip: nuestro cristal de estrella. Y el camino a la Galaxia Soledad.»"],
			"on": func():
				crystal.visible = true
				Sfx.play("mission")
				ctx.pip_look_up = 0.4,
			"tick": func(k, _dt, _t):
				st.give = minf(1.0, k * 1.3)
				if st.give >= 1.0 and crystal.visible:
					crystal.visible = false
					Fx.burst(g.world, P + v(0, 1, 0), Color("#b8ffd0"), 40, 5)
					ctx.hop()
					ctx.pip_look_up = 0.0},
		{"t": 6.4, "cam": {"p": [v(A.x, 34, A.z - 70), v(A.x, 40, A.z - 82)], "l": [v(A.x, 12, A.z)]}, "say": "Esa noche, en Verdalia, brillaron dos estrellas que nunca más se soltaron."},
		{"t": 1.8, "cam": {"p": [v(P.x + 1.3, 0.9, P.z - 2), o.p], "l": [P + v(0, 1, 0), o.l]}},
	]

# ======================================================================== final de Soledad (epílogo)
static func final_soledad(ctx: CineCtx) -> Array:
	var g = ctx.game
	var a: Dictionary = g.spots.arena
	var A := v(float(a.c[0]), float(a.get("y", 0.0)), float(a.c[1]) + 2)
	if g.boss and is_instance_valid(g.boss.model):
		ctx.hide(g.boss.model)
	ctx.night(0.9)
	var P := v(A.x + 2.2, A.y, A.z - 6.5)
	ctx.pip_at(v(A.x + 2.2, A.y + 0.02, A.z - 6.5), atan2(-2.2, 6.5))
	var moth := ctx.boss_model("polilla")
	moth.global_position = A + v(0, 1, 0)
	var u: Dictionary = moth.get_meta("u")
	var st := {"fade": 1.0, "gather": 0.0, "up": 0.0, "bows": []}
	ctx.always(func(_dt, t):
		_anim_boss("polilla", u, t, 0.0, 0.0)
		moth.scale = Vector3.ONE * maxf(0.01, st.fade)
		moth.visible = st.fade > 0.02)
	var sola := ctx.star_actor("#ffc8f0", 0.55)
	sola.visible = false
	var sisters: Array = []
	for cs in [["#fff3bf", 1.0], ["#ffe9a0", 0.7], ["#c8a8ff", 0.7]]:
		var s := ctx.star_actor(cs[0], cs[1])
		s.visible = false
		sisters.append(s)
	var S0 := v(A.x, A.y + 2.4, A.z)
	ctx.always(func(_dt, t):
		sola.global_position = S0 + v(sin(t * 7.0) * 0.05 * (1.0 - st.gather), st.up * 14.0, 0)
		for i in sisters.size():
			var ang = t * 0.8 + i * TAU / 3.0
			var r: float = 2.6 + (1.0 - st.gather) * 10.0
			sisters[i].global_position = v(S0.x + cos(ang) * r, S0.y + (1.0 - st.gather) * 16.0 + st.up * 14.0 + sin(t * 2.0 + i) * 0.3, S0.z + sin(ang) * r)
		if sola.visible and randf() < 0.5:
			ctx.sparkle(sola.global_position, Color.from_hsv(fmod(t * 0.3, 1.0), 0.5, 1.0).to_html(false), 1, 0.8))
	var sky := v(A.x, A.y + 16, A.z)
	return [
		{"t": 5.4, "music": "guardian", "cam": {"p": [v(A.x + 7, 2.4, A.z - 9), v(A.x + 5.5, 2.8, A.z - 7.5)], "l": [v(A.x, 3, A.z)]}, "say": "La Polilla de la Soledad se deshace en mil colores.",
			"tick": func(k, _dt, _t):
				st.fade = 1.0 - ez(k)
				if randf() < 0.9:
					ctx.emit(v(A.x + (randf() - 0.5) * 4, A.y + 1 + randf() * 4, A.z + (randf() - 0.5) * 4), v((randf() - 0.5) * 2, 2, (randf() - 0.5) * 2), Color.from_hsv(randf(), 0.55, 1.0).to_html(false), 0.25, 1.4)},
		{"t": 6.4, "music": "recuerdo", "cam": {"p": [v(P.x + 1.2, 1.2, P.z - 1.8), v(P.x + 0.8, 1.3, P.z - 1.4)], "l": [S0]}, "say": ["Sola", "«¿De… de verdad viniste? ¿Hasta aquí? ¿Por mí?»"],
			"on": func():
				sola.visible = true
				ctx.pip_look_up = 0.7
				Sfx.play("crystal")},
		{"t": 5.2, "cam": {"p": [v(P.x - 1.4, 0.6, P.z + 1.6), v(P.x - 1.1, 0.7, P.z + 1.3)], "l": [P + v(0, 0.6, 0)]}, "say": "Pip asiente con la cabeza. Viajó por tres galaxias para llegar hasta aquí.",
			"on": func():
				ctx.pip_look_up = 0.0
				ctx.hop()},
		{"t": 7.4, "music": "esperanza", "cam": {"p": [v(A.x + 10, 3, A.z - 10), v(A.x + 8, 6, A.z - 12)], "l": [S0, v(A.x, A.y + 5, A.z)]}, "say": ["Nova", "«Bienvenida, hermana. Nunca más vas a estar sola.»"],
			"on": func():
				for s in sisters: s.visible = true
				Sfx.play("mission")
				st.bows = [ctx.rainbow(v(A.x, A.y - 4, A.z + 6), 22.0, 0.3), ctx.rainbow(v(A.x - 30, A.y - 10, A.z + 30), 40.0, -0.4)]
				for b in st.bows: b.scale = Vector3.ONE * 0.01,
			"tick": func(k, _dt, _t):
				st.gather = ez(k)
				for b in st.bows: b.scale = Vector3.ONE * (0.01 + ez(k))},
		{"t": 6.6, "cam": {"p": [v(A.x, 6, A.z - 26), v(A.x, 10, A.z - 34)], "l": [sky]}, "say": "Las cuatro estrellas brillaron juntas. La Penumbra, sin nadie a quien asustar, se quedó dormida.",
			"tick": func(k, _dt, _t): st.up = ez(k)},
		{"t": 6.8, "cam": {"p": [v(P.x - 1.3, 0.45, P.z - 1.7), v(P.x - 1.0, 0.55, P.z - 1.4)], "l": [v(P.x, 0.75, P.z), v(P.x, 1.0, P.z + 0.4)]}, "say": "Y una ardilla diminuta volvió a casa en un cohete con forma de avellana.",
			"on": func(): ctx.pip_look_up = 1.0},
		{"t": 6.0, "cam": {"p": [v(A.x + 40, 30, A.z - 60), v(A.x + 50, 36, A.z - 70)], "l": [v(A.x, 8, A.z)]}, "say": "Fin del gran viaje de Pip. Las sombras siguen ahí afuera… y los cofres también.",
			"on": func(): ctx.pip_look_up = 0.0},
	]
