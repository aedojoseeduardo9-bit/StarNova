## Star Nova — perfiles de guardado (versión 2): 3 ranuras en user://perfil_N.json.
## snapshot(juego) fotografía la partida; restore(juego, datos) la aplica EN SILENCIO sobre el mundo recién creado.
## Lo de Pip es común (nivel, objetos, chispas, trajes, historia) y cada mundo guarda lo suyo en worlds[id].
## Una partida se puede pasar a otro aparato con un código (ver menus.gd).
class_name Guardado

const SLOTS := [1, 2, 3]
const VERSION := 2
const WAVE_CALM_SAVE := 60.0

static func _num(v, d: float) -> float:
	return float(v) if (v is float or v is int) else d

static func _int(v, a: int, b: int, d: int) -> int:
	return clampi(roundi(float(v)), a, b) if (v is float or v is int) else d

static func _r2(v: float) -> float:
	return roundf(v * 100.0) / 100.0

static func clean_name(n) -> String:
	var s := str(n if n != null else "")
	for ch in ["<", ">", "&", "\"", "'", "`", "\\"]:
		s = s.replace(ch, "")
	s = " ".join(s.split(" ", false)).substr(0, 12).strip_edges()
	return s if s != "" else "Pip"

static func now_ms() -> float:
	return Time.get_unix_time_from_system() * 1000.0

static func read(n: int):
	var d = Juego.read("perfil_%d" % n)
	if not d is Dictionary or not d.get("name") is String:
		return null
	if int(d.get("v", 0)) == 1:
		d = _migrate(d)
	return d if int(d.get("v", 0)) == VERSION else null

static func write(n: int, data: Dictionary) -> bool:
	return Juego.write("perfil_%d" % n, data)

static func remove(n: int) -> void:
	Juego.remove("perfil_%d" % n)

static func copy(from: int, to: int) -> bool:
	var d = read(from)
	if d == null or read(to) != null:
		return false
	return write(to, d)

static func blank(name_) -> Dictionary:
	return {"v": VERSION, "name": clean_name(name_), "created": now_ms(), "saved": now_ms(), "started": 0, "time": 0, "level": 1, "world": "islas", "worlds": {}, "done": []}

static func _migrate(d: Dictionary) -> Dictionary:
	var started: bool = d.get("world") != null
	var Wd = {"missions": d.get("missions"), "tracked": d.get("tracked"), "visited": d.get("visited"), "owl": d.get("owl"), "pos": d.get("pos"), "cam": d.get("cam"), "world": d.get("world"), "waves": d.get("waves"), "frags": d.get("frags")} if started else null
	return {"v": VERSION, "name": d.name, "created": d.get("created"), "saved": d.get("saved"), "started": 1 if started else 0,
		"time": d.get("time"), "level": d.get("level"), "xp": d.get("xp"), "sparks": d.get("sparks"), "hp": d.get("hp"), "kills": d.get("kills"),
		"items": d.get("items"), "attack": d.get("attack"), "power": d.get("power"), "outfits": d.get("outfits"), "story": d.get("story"),
		"world": "islas", "worlds": {"islas": Wd} if Wd else {}, "done": ["islas"] if (started and d.world.get("boss")) else [],
		"frags": d.get("frags", 0), "regionName": "El Claro"}

static func summary(d: Dictionary) -> Dictionary:
	var s := int(_num(d.get("time"), 0))
	var h := s / 3600
	var m := (s % 3600) / 60
	var worlds: Dictionary = Datos.mundos.worlds
	var w: Dictionary = worlds.get(d.get("world", "islas"), worlds.islas)
	var done: Array = d.get("done", []) if d.get("done") is Array else []
	return {
		"name": clean_name(d.name), "level": _int(d.get("level"), 1, 999, 1),
		"stars": done.filter(func(id): return worlds.has(id)).size(),
		"time": ("%d h %d min" % [h, m]) if h else (("%d min" % m) if m else "recién empezada"),
		"world": w.name, "galaxy": w.galaxy, "region": d.get("regionName", w.regions[w.hub].name),
		"ended": "soledad" in done,
	}

static func _world_snapshot(g) -> Dictionary:
	var M: Misiones = g.missions
	var P: Dictionary = g.props
	var fighting: bool = g.boss != null and not g.boss.dead and not g.boss_done
	var door = g.W.places.get(g.W.bossRegion, g.spots.spawn)
	var pos: Array = door if fighting else [g.player.last_safe.x, g.player.last_safe.y, g.player.last_safe.z]
	var base: int = g.spots.get("chests", []).size()
	var chest := func(c): return [c.def.id, 1 if c.opened else 0, maxi(0, roundi(c.respawn_t))]
	var missions := {}
	for m in M.defs:
		var s: Dictionary = M.state[m.id]
		missions[m.id] = [s.progress, 1 if s.done else 0, 1 if s.discovered else 0]
	var wv := {}
	for id in g.waves:
		var w: Dictionary = g.waves[id]
		wv[id] = [w.state, roundi(w.pool), roundi(w.calm)]
	var extra := []
	for i in range(base, P.chests.size()):
		var c = P.chests[i]
		extra.append({"pos": [_r2(c.p.x), _r2(c.p.y), _r2(c.p.z)], "region": c.region, "c": chest.call(c)})
	return {
		"missions": missions, "tracked": M.tracked, "visited": M.visited.keys(), "owl": 1 if g.owl_done else 0,
		"talked": g.talked.keys(), "waves": wv,
		"pos": pos.map(func(v): return _r2(float(v))), "cam": [_r2(g.cam.yaw), _r2(g.cam.pitch)], "frags": M.fragments(),
		"world": {
			"bells": P.bells.map(func(b): return 1 if b.rung else 0),
			"crystals": P.crystals.map(func(c): return 1 if c.active else 0),
			"fireflies": P.fireflies.map(func(f): return 1 if f.taken else 0),
			"chests": P.chests.slice(0, base).map(chest),
			"extra": extra,
			"altar": 1 if (g.altar_fragment and g.altar_fragment.dead) else 0,
			"gate": 1 if (P.gate and P.gate.open) else 0,
			"boss": 1 if g.boss_done else 0,
			"stardust": g.stardust.map(func(s): return 1 if s.dead else 0),
		},
	}

static func snapshot(g) -> Dictionary:
	var items := {}
	for id in g.items:
		if int(g.items[id]) > 0:
			items[id] = int(g.items[id])
	var ws := _world_snapshot(g)
	var worlds: Dictionary = g.world_states.duplicate()
	worlds[g.world_id] = ws
	var reg: Dictionary = g.regions.get(g.region, g.regions[g.W.hub])
	return {
		"v": VERSION, "name": g.profile.name, "created": g.profile.created, "saved": now_ms(), "started": 1,
		"time": _r2(g.time), "level": g.level, "xp": _r2(g.xp), "sparks": floori(g.sparks), "hp": _r2(maxf(1.0, g.hp)), "kills": g.kills,
		"items": items, "attack": {"id": g.arsenal.attack.id, "tier": int(g.arsenal.attack.tier)}, "power": g.arsenal.power,
		"outfits": {"owned": g.outfits.owned.duplicate(), "on": g.outfits.on},
		"story": g.story.seen.keys(), "world": g.world_id, "worlds": worlds, "done": g.done_worlds(),
		"frags": ws.frags, "regionName": reg.name,
	}

static func restore(g, d: Dictionary) -> bool:
	g.profile = {"name": clean_name(d.name), "created": _num(d.get("created"), now_ms())}
	g.world_states = d.worlds.duplicate(true) if d.get("worlds") is Dictionary else {}
	if not d.get("started"):
		return false
	g.level = _int(d.get("level"), 1, 999, 1)
	g.xp = maxf(0.0, _num(d.get("xp"), 0))
	g.sparks = maxf(0.0, _num(d.get("sparks"), 0))
	g.time = maxf(0.0, _num(d.get("time"), 0))
	g.kills = _int(d.get("kills"), 0, 1000000000, 0)
	var its = d.get("items", {})
	if its is Dictionary:
		for id in its:
			var n := _int(its[id], 0, 999, 0)
			if not Datos.items.has(id) or n == 0:
				continue
			g.items[id] = n
			Hud.add_item(id, true)
	g.recompute()
	g.hp = maxf(1.0, minf(g.stats.maxHp, _num(d.get("hp"), g.stats.maxHp)))
	g.shield = g.stats.maxShield
	var at = d.get("attack")
	if at is Dictionary and Datos.attacks.has(at.get("id", "")):
		g.equip_attack({"id": at.id, "tier": _int(at.get("tier"), 0, 5, 0)}, true)
	if d.get("power") is String and Datos.powers.has(d.power):
		g.equip_power(d.power, true)
	var F = d.get("outfits", {})
	if not F is Dictionary:
		F = {}
	var owned: Array = []
	for id in (F.get("owned", []) if F.get("owned") is Array else []):
		if Datos.trajes_por_id.has(id) and not id in owned:
			owned.append(id)
	g.outfits.owned = owned
	g.outfits.on = F.get("on") if F.get("on") in owned else null
	Trajes.apply(g.player.model, g.outfits.on)
	g.story.seen = {}
	for id in (d.get("story", []) if d.get("story") is Array else []):
		if id is String and id.length() < 24:
			g.story.seen[id] = 1
	var Wd = g.world_states.get(g.world_id)
	if Wd is Dictionary:
		_restore_world(g, Wd)
	Hud.refresh_missions()
	Hud.refresh_loadout()
	return true

static func _restore_world(g, d: Dictionary) -> void:
	var M: Misiones = g.missions
	var P: Dictionary = g.props
	var Wo: Dictionary = d.get("world", {}) if d.get("world") is Dictionary else {}
	var wd: Dictionary = g.W
	for id in g.waves:
		var w = d.get("waves", {}).get(id) if d.get("waves") is Dictionary else null
		if not w is Array or not w[0] in ["ola", "fin", "calma"]:
			continue
		var S: Dictionary = g.waves[id]
		S.state = "calma" if w[0] == "fin" else w[0]
		S.pool = maxf(0.0, _num(w[1], S.pool))
		S.calm = maxf(1.0, _num(w[2], WAVE_CALM_SAVE)) if S.state == "calma" else 0.0
		if S.state == "ola" and S.pool <= 0:
			S.state = "calma"
			S.calm = WAVE_CALM_SAVE
	for m in M.defs:
		var s = d.get("missions", {}).get(m.id) if d.get("missions") is Dictionary else null
		if not s is Array:
			continue
		var st: Dictionary = M.state[m.id]
		st.done = bool(s[1])
		st.progress = int(m.goal) if st.done else _int(s[0], 0, int(m.goal), 0)
		st.discovered = bool(s[2]) or st.done or m.get("region") == null
	M.visited = {}
	for r in (d.get("visited", []) if d.get("visited") is Array else []):
		if g.regions.has(r):
			M.visited[r] = true
	var tr = d.get("tracked")
	M.tracked = tr if (tr is String and M.state.has(tr) and not M.state[tr].done) else null
	g.owl_done = bool(d.get("owl", 0))
	g.talked = {}
	for id in (d.get("talked", []) if d.get("talked") is Array else []):
		if id is String:
			g.talked[id] = 1
	var on := func(key: String, i: int) -> bool:
		var l = Wo.get(key)
		return l is Array and i < l.size() and bool(l[i])
	for i in P.bells.size():
		if on.call("bells", i):
			P.bells[i].rung = true
	for i in P.crystals.size():
		if on.call("crystals", i):
			P.crystals[i].activate(true)
	if P.bridge and P.crystals.size() and P.crystals.all(func(c): return c.active):
		P.bridge.build(true)
	for i in P.fireflies.size():
		if on.call("fireflies", i):
			P.fireflies[i].take(true)
	for i in g.stardust.size():
		if on.call("stardust", i):
			g.stardust[i].dead = true
	var set_chest := func(c, s) -> void:
		if not s is Array:
			return
		if Datos.chests.has(s[0]) and c.def.id != s[0]:
			c.set_type(s[0])
		if s[1]:
			c.opened = true
			c.lid_t = 1.0
			if c.lid:
				c.lid.rotation.x = -1.9
			c.respawn_t = maxf(1.0, _num(s[2], 30))
		g.see("chest", c.def.id)
	var wc = Wo.get("chests")
	for i in P.chests.size():
		set_chest.call(P.chests[i], wc[i] if (wc is Array and i < wc.size()) else null)
	for x in (Wo.get("extra", []) if Wo.get("extra") is Array else []):
		if not x is Dictionary or not x.get("pos") is Array or not x.get("c") is Array:
			continue
		var c := Utileria.Chest.new(g, {"pos": x.pos, "region": x.get("region", ""), "type": x.c[0] if Datos.chests.has(x.c[0]) else "nova"})
		g.world.add_child(c)
		set_chest.call(c, x.c)
		P.chests.append(c)
	if Wo.get("altar") and g.altar_fragment:
		g.altar_fragment.dead = true
	var n := M.fragments()
	if P.gate:
		P.gate.set_lights(mini(int(wd.gateNeed), n))
	if P.nova:
		P.nova.set_lit(float(n) / float(wd.fragSlots) * 0.5)
	if P.gate and (Wo.get("gate") or n >= int(wd.gateNeed)):
		P.gate.snap_open()
		if M.state.has(wd.finalMission):
			M.state[wd.finalMission].discovered = true
	if Wo.get("boss"):
		g.mark_boss_done(true)
	var pos = d.get("pos")
	if pos is Array and pos.size() == 3:
		g.player.teleport(Vector3(float(pos[0]), float(pos[1]), float(pos[2])))
		g.cam.snap(g.player.global_position + Vector3(0, 0.55, 0))
		var cm = d.get("cam")
		if cm is Array and cm.size() >= 2:
			g.cam.yaw = _num(cm[0], 0)
			g.cam.pitch = _num(cm[1], 0.32)
		g.loaded_pos = true
