## Star Nova — reflejos tipo espejo (sin trazado de rayos, funciona en cualquier teléfono).
## Una segunda cámara se pone en el punto reflejado bajo la superficie (agua o metal líquido), mira el mundo desde ahí y
## dibuja en una imagen más chica (SubViewport). El agua y el metal leen esa imagen en el punto que les toca, con ondas
## y más reflejo cuanto más rasante se mira (como el agua de verdad). Solo en calidad media y alta.
## Capas visuales: 1 = mundo (se refleja) · 2 = superficies que reflejan (no se reflejan a sí mismas) · 3 = pasto.
class_name Reflejo
extends Node

const CAPA_ESPEJO := 2
const CAPA_PASTO := 4

var sv: SubViewport
var cam: Camera3D
## superficies: [{h, aabb, mats}] — h es la altura del plano; se juntan las que están casi a la misma altura
var planos: Array = []
var escala := 0.5
var cada := 1
var _n := 0
var _on := false
var _h := -1e9

func _init(superficies: Array) -> void:
	name = "Reflejo"
	for s in superficies:
		var junto := false
		for p in planos:
			if absf(float(p.h) - float(s.h)) < 0.12:
				p.h = (float(p.h) + float(s.h)) * 0.5
				p.aabb = (p.aabb as AABB).merge(s.aabb)
				p.mats.append_array(s.mats)
				junto = true
				break
		if not junto:
			planos.append({"h": float(s.h), "aabb": s.aabb, "mats": s.mats.duplicate()})
	sv = SubViewport.new()
	sv.name = "Espejo"
	sv.size = Vector2i(320, 180)
	sv.render_target_update_mode = SubViewport.UPDATE_DISABLED
	sv.msaa_3d = Viewport.MSAA_DISABLED
	add_child(sv)
	cam = Camera3D.new()
	cam.cull_mask = 0xFFFFF & ~CAPA_ESPEJO & ~CAPA_PASTO
	cam.near = 0.05
	sv.add_child(cam)
	cam.current = true

func set_quality(q: String) -> void:
	match q:
		"alta":
			escala = 0.5
			cada = 2
		"media":
			escala = 0.33
			cada = 3
		_:
			escala = 0.0
	if escala <= 0.0:
		_apagar()

func _apagar() -> void:
	if not _on:
		return
	_on = false
	sv.render_target_update_mode = SubViewport.UPDATE_DISABLED
	for p in planos:
		for m in p.mats:
			(m as ShaderMaterial).set_shader_parameter("refl_on", 0.0)

func _process(_dt: float) -> void:
	if escala <= 0.0 or planos.is_empty():
		return
	var main_cam := get_viewport().get_camera_3d()
	if main_cam == null:
		_apagar()
		return
	var e := main_cam.global_position
	# el plano que más importa: el más cercano a la cámara (y la cámara por encima de él)
	var best = null
	var bd := 75.0
	var frustum := main_cam.get_frustum()
	for p in planos:
		if e.y <= float(p.h) + 0.05:
			continue
		var bb: AABB = p.aabb
		if not _visible(bb, float(p.h), frustum):
			continue   # el agua no está a la vista: no se dibuja el reflejo (antes se dibujaba igual)
		var q := Vector3(clampf(e.x, bb.position.x, bb.end.x), float(p.h), clampf(e.z, bb.position.z, bb.end.z))
		var d := e.distance_to(q)
		if d < bd:
			bd = d
			best = p
	if best == null:
		_apagar()
		return
	var h: float = best.h
	var vs := get_viewport().get_visible_rect().size
	var want := Vector2i(maxi(64, int(vs.x * escala)), maxi(36, int(vs.y * escala)))
	if sv.size != want:
		sv.size = want
	_n += 1
	if _on and _n % cada != 0 and absf(h - _h) < 0.01:
		return   # en calidad media se dibuja cada 2 cuadros (la imagen anterior sigue sirviendo)
	# cámara reflejada: misma vista, pero desde debajo del plano y mirando hacia arriba
	var f := -main_cam.global_basis.z
	var fr := Vector3(f.x, -f.y, f.z)
	var up := Vector3.UP if absf(fr.y) < 0.98 else Vector3.FORWARD
	cam.global_transform = Transform3D(Basis.looking_at(fr, up), Vector3(e.x, 2.0 * h - e.y, e.z))
	cam.fov = minf(150.0, main_cam.fov + 8.0)
	cam.far = main_cam.far
	cam.keep_aspect = main_cam.keep_aspect
	sv.render_target_update_mode = SubViewport.UPDATE_ONCE
	var vp := cam.get_camera_projection() * Projection(cam.global_transform.affine_inverse())
	var tex := sv.get_texture()
	# primero se apagan todas y después se encienden las del plano elegido (el metal líquido comparte un material)
	for p in planos:
		if p != best:
			for m in p.mats:
				(m as ShaderMaterial).set_shader_parameter("refl_on", 0.0)
	for m in best.mats:
		var sm: ShaderMaterial = m
		sm.set_shader_parameter("refl_on", 1.0)
		sm.set_shader_parameter("refl_tex", tex)
		sm.set_shader_parameter("refl_vp", vp)
		sm.set_shader_parameter("refl_h", h)
	_on = true
	_h = h

## ¿Se ve algo del plano (su rectángulo a la altura h) desde la cámara? Fuera si todas sus esquinas quedan del lado de
## afuera de alguno de los planos de la vista.
static func _visible(bb: AABB, h: float, fr: Array) -> bool:
	var pts := [Vector3(bb.position.x, h, bb.position.z), Vector3(bb.end.x, h, bb.position.z),
		Vector3(bb.position.x, h, bb.end.z), Vector3(bb.end.x, h, bb.end.z)]
	for pl in fr:
		var fuera := true
		for q in pts:
			if not (pl as Plane).is_point_over(q):
				fuera = false
				break
		if fuera:
			return false
	return true
