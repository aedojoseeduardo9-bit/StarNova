## Star Nova — datos del juego (autoload "Datos"). Se leen de godot/data/*.json, que se generan desde la web con
## godot/tools/exportar_web.cjs (así la versión nativa usa exactamente los mismos objetos, enemigos e historia).
extends Node

var rarity: Array = []
var items := {}
var item_list: Array = []
var attacks := {}
var attack_list: Array = []
var powers := {}
var power_list: Array = []
var chests := {}
var chest_list: Array = []
var ranks: Array = []
var rank_colors: Array = []
var enemies := {}
var enemy_list: Array = []
var elites := {}
var elite_list: Array = []
var historia := {}
var pnj := {}
var mundos := {}
var trajes: Array = []
var trajes_por_id := {}

static func load_json(path: String):
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		push_error("No se pudo abrir " + path)
		return null
	return JSON.parse_string(f.get_as_text())

func _ready() -> void:
	var c = load_json("res://data/contenido.json")
	rarity = c.rarity
	item_list = c.items
	for i in item_list: items[i.id] = i
	attack_list = c.attacks
	for a in attack_list: attacks[a.id] = a
	power_list = c.powers
	for p in power_list: powers[p.id] = p
	chest_list = c.chests
	for ch in chest_list: chests[ch.id] = ch
	ranks = c.ranks
	rank_colors = c.rank_colors
	enemy_list = c.enemies
	for e in enemy_list: enemies[e.id] = e
	elite_list = c.elites
	for e in elite_list: elites[e.id] = e
	historia = load_json("res://data/historia.json")
	pnj = load_json("res://data/pnj.json")
	mundos = load_json("res://data/mundos.json")
	trajes = load_json("res://data/trajes_lista.json")
	for t in trajes: trajes_por_id[t.id] = t

# ---------------------------------------------------------------- azar con pesos
static func pick_weighted(weights: Array) -> int:
	var total := 0.0
	for w in weights: total += float(w)
	var x := randf() * total
	for i in weights.size():
		x -= float(weights[i])
		if x <= 0.0:
			return i
	return weights.size() - 1

## Elige un objeto según pesos por rareza [común … mítico].
func roll_item(rar_weights: Array = [78, 19, 3, 0, 0, 0]) -> String:
	var rar := pick_weighted(rar_weights)
	var pool := item_list.filter(func(i): return int(i.rar) == rar)
	while pool.is_empty() and rar > 0:
		rar -= 1
		pool = item_list.filter(func(i): return int(i.rar) == rar)
	return pool[randi() % pool.size()].id

func tier_mul(t: int) -> float:
	return float(rarity[clampi(t, 0, 5)].mul)

func roll_attack(tier_weights: Array) -> Dictionary:
	var tier := pick_weighted(tier_weights)
	var pool := attack_list.filter(func(a): return a.id != "bellota" and int(a.minTier) <= tier)
	var a = pool[randi() % pool.size()]
	return {"id": a.id, "tier": tier}

func roll_power() -> String:
	var pool := power_list.filter(func(p): return p.id != "lluvia")
	return pool[randi() % pool.size()].id

## Rango de cofre según el avance de la partida (p ≈ 0 al inicio; ~5+ muy avanzado).
static func rank_weights(p: float) -> Array:
	var w := []
	for r in 6:
		var center := minf(5.0, p * 0.9)
		var d := r - center
		var v := exp(-(d * d) / 1.2)
		if r > int(floor(p * 1.2)) + 1: v = 0.0
		if r == 5 and p < 3.5: v = 0.0
		w.append(v)
	return w

func roll_chest(p: float, luck := 0.0) -> String:
	var rank: int = mini(5, pick_weighted(rank_weights(p + luck * 4.0)))
	var pool := chest_list.filter(func(c): return int(c.rank) == rank)
	return pool[randi() % pool.size()].id

## Suma las estadísticas de todos los objetos y el nivel (igual que computeStats de la web).
func compute_stats(level: int, counts: Dictionary) -> Dictionary:
	var s := {}
	var cdr_mul := 1.0
	for id in counts:
		var it = items.get(id)
		var n := int(counts[id])
		if it == null or n == 0:
			continue
		for k in it.stats:
			if k == "cdr":
				cdr_mul *= pow(1.0 - float(it.stats[k]), n)
			else:
				s[k] = float(s.get(k, 0.0)) + float(it.stats[k]) * n
	var g := func(k): return float(s.get(k, 0.0))
	return {
		"dmg": (12.0 + 2.4 * (level - 1)) * (1.0 + g.call("dmgPct")),
		"atk": 1.0 + g.call("atkPct"),
		"speed": minf(2.4, 1.0 + g.call("speedPct")),
		"jump": 1.0 + g.call("jumpPct"),
		"regen": 0.6 + 0.1 * (level - 1) + g.call("regen"),
		"crit": minf(1.0, 0.01 + g.call("critPct")),
		"critMul": 2.0 + g.call("critDmg"),
		"armor": g.call("armor"),
		"maxHp": (100.0 + 14.0 * (level - 1) + g.call("maxHp")) * (1.0 + g.call("maxHpPct")),
		"airJumps": 1 + int(g.call("airJumps")),
		"magnet": 3.0 * (1.0 + g.call("magnetPct")),
		"sparkMul": 1.0 + g.call("sparkPct"),
		"xpMul": 1.0 + g.call("xpPct"),
		"projSpeed": 1.0 + g.call("projSpeed"),
		"multishot": minf(1.0, g.call("multishot")),
		"projCount": int(g.call("projCount")),
		"explode": minf(0.6, g.call("explodeChance")),
		"bleed": minf(0.8, g.call("bleedChance")),
		"freeze": minf(0.7, g.call("freezeChance")),
		"chain": minf(0.7, g.call("chainChance")),
		"chainExtra": int(g.call("chainExtra")),
		"poison": minf(0.8, g.call("poisonChance")),
		"voidChance": minf(0.4, g.call("voidChance")),
		"lifesteal": g.call("lifesteal"),
		"dodge": minf(0.6, g.call("dodge")),
		"thorns": g.call("thorns"),
		"executeLow": g.call("executeLow"),
		"frozenBonus": g.call("frozenBonus"),
		"healOnKill": g.call("healOnKill"),
		"chestDiscount": minf(0.6, g.call("chestDiscount")),
		"luck": g.call("luck"),
		"orbitals": int(g.call("orbitals")),
		"drone": int(g.call("drone")),
		"stomp": g.call("stomp"),
		"aura": g.call("aura"),
		"storm": g.call("stormCloud"),
		"comet": g.call("comet"),
		"rage": g.call("rage"),
		"glide": g.call("glide") > 0,
		"maxShield": g.call("shield"),
		"shieldNova": g.call("shieldNova") > 0,
		"cdrMul": cdr_mul,
	}

## Ícono (textura) de un objeto, ataque, poder, enemigo o glifo.
var _icons := {}
func icon(name: String) -> Texture2D:
	if _icons.has(name):
		return _icons[name]
	var path := "res://iconos/" + name + ".png"
	var t: Texture2D = load(path) if ResourceLoader.exists(path) else null
	_icons[name] = t
	return t
