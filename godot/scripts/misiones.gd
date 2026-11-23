## Star Nova — misiones del mundo abierto: principales (la historia) y secundarias
## (premios). El jugador elige en el menú cuál seguir. Las reglas `on` vienen de data/mundos.json; las que son
## condiciones (p. ej. "o.region === 'menta' && s.discovered") se interpretan aquí.
class_name Misiones

var game
var defs: Array = []
var state := {}
var tracked = null
var visited := {}

func _init(g) -> void:
	game = g
	defs = g.W.missions
	for m in defs:
		state[m.id] = {"progress": 0, "done": false, "discovered": m.get("region") == null}

func def(id: String) -> Dictionary:
	for m in defs:
		if m.id == id:
			return m
	return {}

func fragments() -> int:
	var n := 0
	for m in defs:
		if m.get("fragment", false) and state[m.id].done:
			n += 1
	return n

func list(type: String) -> Array:
	return defs.filter(func(m): return m.type == type)

func track(id) -> void:
	tracked = id
	Hud.refresh_missions()
	if id != null:
		Hud.toast("Siguiendo: " + def(id).title)

func discover(region_id: String) -> void:
	var any := false
	for m in defs:
		if m.get("region") == region_id and not state[m.id].discovered:
			state[m.id].discovered = true
			any = true
			Hud.toast("Nueva misión %s: %s" % ["principal" if m.type == "principal" else "secundaria", m.title])
	if any:
		Hud.refresh_missions()

func discover_all() -> void:
	for m in defs:
		state[m.id].discovered = true
	Hud.refresh_missions()

func advance(id: String, n := 1) -> void:
	var s: Dictionary = state[id]
	var m := def(id)
	if s.done:
		return
	s.discovered = true
	s.progress = mini(int(m.goal), int(s.progress) + n)
	if s.progress >= int(m.goal):
		complete(id)
	elif tracked == id or m.type == "principal":
		Hud.toast("%s: %d / %d" % [m.title, s.progress, int(m.goal)])
	Hud.refresh_missions()

func complete(id: String) -> void:
	var s: Dictionary = state[id]
	var m := def(id)
	if s.done:
		return
	s.done = true
	s.progress = int(m.goal)
	game.on_mission_complete(m)
	if tracked == id:
		tracked = null
	Hud.refresh_missions()

## Las reglas con condición: región + descubierta, élite o tipo de enemigo.
func _rule(rule: String, obj, s: Dictionary) -> bool:
	var rx := RegEx.new()
	rx.compile("o\\.region === '([a-z]+)'")
	var r := rx.search(rule)
	if r:
		if not (obj is Dictionary and obj.get("region") == r.get_string(1)):
			return false
		if rule.contains("s.discovered") and not s.discovered:
			return false
		return true
	if rule.contains("o.elite"):
		return obj is Dictionary and obj.get("elite", false)
	rx.compile("o\\.type === '([a-z]+)'")
	r = rx.search(rule)
	if r:
		return obj is Dictionary and obj.get("type") == r.get_string(1)
	return false

## Algo pasó en el mundo: 'bell', 'firefly', 'crystal', 'altar', 'boss', 'chest', 'kill', 'region', 'stardust'…
func event(type: String, obj = null) -> void:
	for m in defs:
		var s: Dictionary = state[m.id]
		if s.done or not m.get("on") is Dictionary or not m.on.has(type):
			continue
		var rule = m.on[type]
		if rule is String and not _rule(rule, obj, s):
			continue
		if m.get("visit", false) and visited.has(obj):
			continue
		advance(m.id)
	if type == "region":
		visited[obj] = true
	# con todos los cristales despiertos aparece el puente
	var P: Dictionary = game.props
	if type == "crystal" and P.bridge and not P.bridge.built and P.crystals.all(func(c): return c.active):
		P.bridge.build()
		Hud.toast(game.W.texts.get("bridge", "¡El puente despierta!"))

func _center_of(region_id: String, dz := 0.0) -> Vector3:
	var r: Dictionary = game.regions.get(region_id, {})
	if r.is_empty():
		return Vector3.ZERO
	var c: Vector2 = r.center
	var hit = game.ray(Vector3(c.x, 40, c.y + dz * 4.0), Vector3.DOWN, 80, 1)
	return hit.position if hit else Vector3(c.x, 0.5, c.y)

## Posiciones objetivo de la misión seguida (marcador en pantalla y mapa).
func targets(id = null) -> Array:
	if id == null:
		id = tracked
	if id == null or not state.has(id) or state[id].done:
		return []
	var m := def(id)
	var g = game
	var on: Dictionary = m.get("on", {})
	if on.has("bell"):
		return g.props.bells.filter(func(b): return not b.rung).map(func(b): return b.anchor - Vector3(0, 0.8, 0))
	if on.has("firefly"):
		return g.props.fireflies.filter(func(f): return not f.taken).map(func(f): return f.p)
	if on.has("crystal"):
		var out: Array = g.props.crystals.filter(func(c): return not c.active).map(func(c): return c.p)
		if out.is_empty() and g.altar_fragment and not g.altar_fragment.dead:
			out.append(g.altar_fragment.global_position)
		return out
	if on.has("boss"):
		return [_center_of(m.region, 1.0)]
	if on.has("stardust"):
		return g.stardust.filter(func(k): return not k.dead).slice(0, 6).map(func(k): return k.global_position)
	if on.has("region"):
		return g.regions.keys().filter(func(r): return not visited.has(r)).map(func(r): return _center_of(r))
	if on.has("chest"):
		return g.props.chests.filter(func(c): return not c.opened).map(func(c): return c.p)
	if on.has("kill"):
		var rule = on.kill
		if rule is String and rule.contains("o.region"):
			return [_center_of(m.region)]
		return g.enemies.filter(func(e): return not e.dead and not e.is_boss and _rule(rule, {"elite": e.elite != null, "type": e.type, "region": ""}, state[id])).map(func(e): return e.global_position)
	return []
