## Star Nova — mapa de las Islas del Cielo (port de js/world/layout.js). En la etapa 1 está El Claro;
## las otras cuatro regiones llegan en la etapa 2. Devuelve los "puntos" del mapa (spots), como en la web.
class_name WorldIslas

static func build(root: Node3D) -> Dictionary:
	var spots := {
		"spawn": Vector3(0, 0.6, 5),
		"campfire": Vector3(0, 0.22, 0),
		"owl": Vector3(3.6, 1.7, -3.8),
		"crates": [Vector3(-3, 0.4, 7), Vector3(-3, 1.1, 7), Vector3(-2.2, 0.4, 7.2)],
	}
	_claro(root)
	return spots

## El Claro: isla central con la hoguera, la glorieta, el faro, las casitas y cuatro arcos de salida.
static func _claro(root: Node3D) -> void:
	var b := Builder.new(Palette.ISLAS.claro)
	var p := b.pal
	b.island(0, 0, 0, 15, {"seg": 12})
	b.cyl(0, 0, 0, 4.6, 0.22, p.stone, {"seg": 8})
	b.cyl(0, 0, 0, 3.2, 0.24, p.stone2, {"seg": 8, "collide": false})
	# pilar de la lechuza
	b.cyl(3.6, 0, -3.8, 0.42, 1.5, p.stone2, {"seg": 8})
	b.cyl(3.6, 1.5, -3.8, 0.55, 0.2, p.stone, {"seg": 8})
	# glorieta con cúpula
	var gx := -7.5
	var gz := -5.5
	b.cyl(gx, 0, gz, 2.4, 0.25, p.stone, {"seg": 8})
	for d in [Vector2(-1.5, -1.5), Vector2(1.5, -1.5), Vector2(-1.5, 1.5), Vector2(1.5, 1.5)]:
		b.cyl(gx + d.x, 0.25, gz + d.y, 0.22, 2.6, p.stone, {"seg": 8})
	b.box(gx, 2.85, gz, 3.8, 0.35, 3.8, p.stone2)
	b.dome(gx, 3.2, gz, 1.7, p.roof)
	b.cone(gx, 4.8, gz, 0.14, 0.7, p.accent, {"seg": 6})
	# torre del faro y casitas
	b.tower(9, -4, 0, 2.6, 6.5, {"roof": "cone"})
	b.tower(-9.5, 5.5, 0, 2.2, 3.2, {"roof": "dome"})
	b.box(7.5, 0, 7.5, 3, 2.2, 2.4, p.stone)
	b.cone(7.5, 2.2, 7.5, 2.0, 1.4, p.roof, {"seg": 4, "ry": PI / 4})
	b.window(7.5, 0.5, 8.75, 0, 0.5, 0.7, p.win)
	# arcos en las cuatro salidas
	b.arch(-13.2, 0, 0, 3.2, 3.6, 1.2, {"ry": PI / 2})
	b.arch(13.2, 0, 0, 3.2, 3.6, 1.2, {"ry": PI / 2})
	b.arch(0, -13.2, 0, 3.2, 3.6, 1.2)
	b.arch(0, 13.2, 0, 3.2, 3.6, 1.2)
	for tr in [[-10, 9, 1.0], [5, -10, 1.1], [11, 3, 0.9], [-4, 10.5, 0.8], [-11, -1.5, 0.9]]:
		b.tree(tr[0], 0, tr[1], tr[2])
	b.finish(root, "ElClaro")
