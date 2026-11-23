## Star Nova — trajes de Pip: colores del pelaje/bufanda y piezas colgadas del
## esqueleto (cabeza, torso, orejas, punta de la cola). Las piezas salen de data/modelos.json ("trajes").
class_name Trajes

const BASE := {"fur": "#cf7a3e", "fur2": "#e59a5c", "furDark": "#a95e2c", "cream": "#fbe6cf", "paw": "#8c4e2a",
	"scarf": "#6cc9b2", "scarf2": "#4fae98", "tailTip": "#ffe9d2", "gold": "#ffd36e"}

static func apply(model: PipModel, id) -> void:
	if model == null:
		return
	for o in model.get_meta("outfit_parts", []):
		if is_instance_valid(o):
			o.queue_free()
	var parts: Array = []
	for k in BASE:
		(model.M[k] as StandardMaterial3D).albedo_color = Color(BASE[k])
	model.scarf.visible = true
	model.set_meta("outfit", id)
	if id == null or not Datos.trajes_por_id.has(id):
		model.set_meta("outfit_parts", parts)
		return
	var def: Dictionary = Datos.trajes_por_id[id]
	if def.get("colors") is Dictionary:
		for k in def.colors:
			if model.M.has(k):
				(model.M[k] as StandardMaterial3D).albedo_color = Color(def.colors[k])
	if def.get("hideScarf", false):
		model.scarf.visible = false
	var where := {"head": model.head, "torso": model.torso, "ear0": model.ears[0], "ear1": model.ears[1], "tail7": model.tail[7] if model.tail.size() > 7 else model.torso}
	var D: Dictionary = Modelos.data()
	for pc in D.trajes.get(id, []):
		var n := Modelos.make_node(pc.node)
		var parent: Node3D = where.get(pc.slot, model.torso)
		parent.add_child(n)
		parts.append(n)
	model.set_meta("outfit_parts", parts)
