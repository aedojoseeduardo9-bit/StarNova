## Star Nova — paletas de las regiones (las mismas de js/world/palette.js).
class_name Palette

const ISLAS := {
	"claro": {
		"name": "El Claro", "sub": "el hogar de la hoguera", "center": Vector2(0, 0), "r": 15.0,
		"sky_top": "#f4b9b0", "sky_hor": "#fde7d4", "sky_bot": "#f6c3b2", "fog": "#fbe1cf",
		"ground": "#fbeee1", "rock": "#e8b3a7", "stone": "#fff4ea", "stone2": "#f1cbb8", "accent": "#ea8f87", "win": "#b56c78",
		"leaf": ["#93c99a", "#c4e5a6"], "roof": "#ee9a8b", "shade": "#e3929c", "night": 0.0,
	},
	"coral": {
		"name": "Jardín de Coral", "sub": "donde cantan las campanas", "center": Vector2(-55, 0), "r": 18.0,
		"sky_top": "#f29d97", "sky_hor": "#ffd9c6", "sky_bot": "#f6b2a2", "fog": "#fdd3c1",
		"ground": "#ffe4d8", "rock": "#e59a93", "stone": "#ffeae0", "stone2": "#f6b4a3", "accent": "#e47c7e", "win": "#a2556a",
		"leaf": ["#f29486", "#ffc4b2"], "roof": "#ef8578", "shade": "#dc7088", "night": 0.0,
	},
	"menta": {
		"name": "Torres de Menta", "sub": "las agujas del norte", "center": Vector2(0, -60), "r": 18.0,
		"sky_top": "#94d0c3", "sky_hor": "#e2f6ee", "sky_bot": "#b2ddd1", "fog": "#d2eee4",
		"ground": "#e6f6ee", "rock": "#8bc3b6", "stone": "#e9f7f1", "stone2": "#9fd6c6", "accent": "#5aa999", "win": "#3c7a7a",
		"leaf": ["#6bb39e", "#a1dbc4"], "roof": "#68b3a2", "shade": "#4fa59c", "night": 0.0,
	},
	"lavanda": {
		"name": "Puente de Lavanda", "sub": "el cristal que sueña", "center": Vector2(53, 0), "r": 13.0,
		"sky_top": "#ad99de", "sky_hor": "#efe7fb", "sky_bot": "#c9bbe8", "fog": "#e1d7f5",
		"ground": "#f3eefc", "rock": "#a596d1", "stone": "#f8f4ff", "stone2": "#c8b8e9", "accent": "#8d77c8", "win": "#5c4d91",
		"leaf": ["#a98fd4", "#d3c3ef"], "roof": "#9a83cf", "shade": "#8e78d0", "night": 0.0,
	},
	"nova": {
		"name": "Santuario de Nova", "sub": "donde duerme la estrella", "center": Vector2(0, 65), "r": 18.0,
		"sky_top": "#262a66", "sky_hor": "#8b80c6", "sky_bot": "#5b5698", "fog": "#6c66a8",
		"ground": "#d6d9f4", "rock": "#545996", "stone": "#e3e5fb", "stone2": "#8e95d2", "accent": "#f2c46c", "win": "#f6d27a",
		"leaf": ["#6a70b6", "#a0a6e4"], "roof": "#6a70b4", "shade": "#4b50a6", "night": 1.0,
	},
}

## Región en la que está un punto (la más cercana en proporción a su radio), o "" si está lejos de todas.
static func region_at(regions: Dictionary, x: float, z: float) -> String:
	var best := ""
	var bd := INF
	for id in regions:
		var r: Dictionary = regions[id]
		var d: float = Vector2(x, z).distance_to(r.center) / r.r
		if d < bd:
			bd = d
			best = id
	return best if bd < 1.25 else ""

## Pesos de mezcla del cielo y la niebla según la posición (igual que la web).
static func weights(regions: Dictionary, x: float, z: float) -> Dictionary:
	var w := {}
	var sum := 0.0
	for id in regions:
		var r: Dictionary = regions[id]
		var d: float = Vector2(x, z).distance_to(r.center)
		var v: float = 1.0 / pow(maxf(0.0, d - r.r * 0.55) + 5.0, 3.0)
		w[id] = v
		sum += v
	for id in w:
		w[id] /= sum
	return w
