#!/usr/bin/env python3
"""Star Nova — arquitectura HD.

Lee la "receta" de cada mundo (data/receta_<id>.json: pieza por pieza, tal como se armó el mundo) y vuelve a
armar la arquitectura con MÁS POLÍGONOS: cajas con bordes biselados, columnas y cúpulas redondas, follaje
con volumen, rocas con relieve, ventanas con marco y repisa, torres con zócalo, molduras y remates.
Las colisiones no cambian (siguen en data/mundo_<id>.json). También reparte el PASTO sobre el suelo.

Salida: data/mundo_<id>_hd.json + data/mundo_<id>_hd.bin (mallas con posiciones, normales y colores en
espacio lineal, ya con el sombreado horneado de cada región) y la lista de matas de pasto.

Uso:  python3 godot/tools/hd_mundo.py [islas gemini soledad]
      python3 godot/tools/hd_mundo.py --validar islas   (rearma SIN HD y compara con la malla original)
"""
import json
import math
import os
import struct
import sys
import random

AQUI = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(AQUI, "..", "data"))
TAU = math.pi * 2


# --------------------------------------------------------------------------------------------- vectores
def add(a, b): return (a[0] + b[0], a[1] + b[1], a[2] + b[2])
def sub(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])
def mul(a, s): return (a[0] * s, a[1] * s, a[2] * s)
def dot(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def lerp3(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)


def norm(a):
    l = math.sqrt(dot(a, a))
    return (a[0] / l, a[1] / l, a[2] / l) if l > 1e-12 else (0.0, 1.0, 0.0)


def srgb_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexcol(h):
    h = h.lstrip("#")
    return tuple(srgb_lin(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4))


def euler_xyz(rx, ry, rz):
    """Matriz de rotación con el orden XYZ (R = Rx·Ry·Rz)."""
    a, b = math.cos(rx), math.sin(rx)
    c, d = math.cos(ry), math.sin(ry)
    e, f = math.cos(rz), math.sin(rz)
    ae, af, be, bf = a * e, a * f, b * e, b * f
    return ((c * e, -c * f, d),
            (af + be * d, ae - bf * d, -b * c),
            (bf - ae * d, be + af * d, a * c))


def rot(m, v):
    return (m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
            m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
            m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2])


# --------------------------------------------------------------------------------------------- geometrías
# Cada geometría es una lista de triángulos [(p0, p1, p2), (n0, n1, n2) | None, (e0, e1, e2) | None] en sentido
# antihorario visto desde afuera. Normales None = cara plana. "e" = sombra extra por vértice (oclusión falsa).

def g_box(w, h, d):
    """Caja exacta (como la de siempre): 6 caras, 2 triángulos cada una, en el mismo orden."""
    tris = []

    def plane(u, v, wax, udir, vdir, width, height, depth):
        pts = []
        for iy in range(2):
            y = iy * height - height / 2
            for ix in range(2):
                x = ix * width - width / 2
                p = [0.0, 0.0, 0.0]
                p[u] = x * udir
                p[v] = y * vdir
                p[wax] = depth / 2
                pts.append(tuple(p))
        a, b, c, dd = 0, 2, 3, 1
        tris.append(((pts[a], pts[b], pts[dd]), None, None))
        tris.append(((pts[b], pts[c], pts[dd]), None, None))

    plane(2, 1, 0, -1, -1, d, h, w)
    plane(2, 1, 0, 1, -1, d, h, -w)
    plane(0, 2, 1, 1, 1, w, d, h)
    plane(0, 2, 1, 1, -1, w, d, -h)
    plane(0, 1, 2, 1, -1, w, h, d)
    plane(0, 1, 2, -1, -1, w, h, -d)
    return tris


def _out(tri, center=(0.0, 0.0, 0.0)):
    """Ordena un triángulo para que mire hacia afuera (lejos de center)."""
    a, b, c = tri
    n = cross(sub(b, a), sub(c, a))
    m = mul(add(add(a, b), c), 1 / 3)
    return (a, b, c) if dot(n, sub(m, center)) >= 0 else (a, c, b)


def g_box_hd(w, h, d, bevel, ao=0.0):
    """Caja con los bordes biselados (26 caras): las aristas atrapan la luz."""
    hx, hy, hz = w / 2, h / 2, d / 2
    b = min(bevel, hx * 0.45, hy * 0.45, hz * 0.45)
    ix, iy, iz = hx - b, hy - b, hz - b
    quads = []
    S = (-1, 1)
    for s in S:   # caras
        quads.append([(s * hx, -iy, -iz), (s * hx, iy, -iz), (s * hx, iy, iz), (s * hx, -iy, iz)])
        quads.append([(-ix, s * hy, -iz), (ix, s * hy, -iz), (ix, s * hy, iz), (-ix, s * hy, iz)])
        quads.append([(-ix, -iy, s * hz), (ix, -iy, s * hz), (ix, iy, s * hz), (-ix, iy, s * hz)])
    for sx in S:   # aristas
        for sy in S:
            quads.append([(sx * hx, sy * iy, -iz), (sx * ix, sy * hy, -iz), (sx * ix, sy * hy, iz), (sx * hx, sy * iy, iz)])
        for sz in S:
            quads.append([(sx * hx, -iy, sz * iz), (sx * hx, iy, sz * iz), (sx * ix, iy, sz * hz), (sx * ix, -iy, sz * hz)])
    for sy in S:
        for sz in S:
            quads.append([(-ix, sy * hy, sz * iz), (ix, sy * hy, sz * iz), (ix, sy * iy, sz * hz), (-ix, sy * iy, sz * hz)])
    tris = []
    for q in quads:
        for t in ((q[0], q[1], q[2]), (q[0], q[2], q[3])):
            tris.append((_out(t), None, None))
    for sx in S:   # esquinas
        for sy in S:
            for sz in S:
                t = ((sx * hx, sy * iy, sz * iz), (sx * ix, sy * hy, sz * iz), (sx * ix, sy * iy, sz * hz))
                tris.append((_out(t), None, None))
    if ao > 0 and h > 0.9:
        out = []
        for ps, ns, _ in tris:
            out.append((ps, ns, tuple(ao * max(0.0, 1.0 - (p[1] + hy) / min(h, 4.0)) for p in ps)))
        tris = out
    return tris


def g_cyl(rt, rb, h, seg, hseg=1, open_end=False, t0=0.0, tl=TAU):
    """Cilindro exacto (igual al original): torso + tapas, mismo orden de triángulos."""
    tris = []
    hh = h / 2
    grid = []
    for y in range(hseg + 1):
        v = y / hseg
        r = v * (rb - rt) + rt
        row = []
        for x in range(seg + 1):
            th = (x / seg) * tl + t0
            row.append((r * math.sin(th), -v * h + hh, r * math.cos(th)))
        grid.append(row)
    for x in range(seg):
        for y in range(hseg):
            a, b, c, d = grid[y][x], grid[y + 1][x], grid[y + 1][x + 1], grid[y][x + 1]
            if rt > 0 or y != 0:
                tris.append(((a, b, d), None, None))
            if rb > 0 or y != hseg - 1:
                tris.append(((b, c, d), None, None))
    if not open_end:
        for top in (True, False):
            r = rt if top else rb
            if r <= 0:
                continue
            sg = 1 if top else -1
            ctr = (0.0, hh * sg, 0.0)
            ring = [(r * math.sin((x / seg) * tl + t0), hh * sg, r * math.cos((x / seg) * tl + t0)) for x in range(seg + 1)]
            for x in range(seg):
                i, j = ring[x], ring[x + 1]
                tris.append(((i, j, ctr) if top else (j, i, ctr), None, None))
    return tris


def g_cyl_hd(rt, rb, h, seg, smooth, bevel=0.0, hseg=1, ao=0.0):
    """Cilindro HD: más lados, normales suaves (redondo de verdad) y bordes biselados opcionales."""
    hh = h / 2
    tris = []
    slope = (rb - rt) / h if h > 0 else 0.0
    bt = min(bevel, rt * 0.4, h * 0.3) if rt > 0 else 0.0
    bb = min(bevel, rb * 0.4, h * 0.3) if rb > 0 else 0.0
    # anillos de perfil (radio, y, normal radial, normal y) de arriba a abajo
    prof = []
    if bt > 0:
        prof.append((rt - bt, hh, 0.0, 1.0, "cap"))
        prof.append((rt - bt * 0.25, hh - bt * 0.25, 0.7, 0.7, "bev"))
        prof.append((rt, hh - bt, 1.0, slope, "side"))
    else:
        prof.append((rt, hh, 1.0, slope, "side"))
    for k in range(1, hseg):
        v = k / hseg
        prof.append((rt + (rb - rt) * v, hh - h * v, 1.0, slope, "side"))
    if bb > 0:
        prof.append((rb, -hh + bb, 1.0, slope, "side"))
        prof.append((rb - bb * 0.25, -hh + bb * 0.25, 0.7, -0.7, "bev"))
        prof.append((rb - bb, -hh, 0.0, -1.0, "cap"))
    else:
        prof.append((rb, -hh, 1.0, slope, "side"))
    ang = [(x / seg) * TAU for x in range(seg + 1)]
    for i in range(len(prof) - 1):
        r0, y0, a0, b0, _ = prof[i]
        r1, y1, a1, b1, _ = prof[i + 1]
        for x in range(seg):
            t0, t1 = ang[x], ang[x + 1]
            p00 = (r0 * math.sin(t0), y0, r0 * math.cos(t0))
            p01 = (r0 * math.sin(t1), y0, r0 * math.cos(t1))
            p10 = (r1 * math.sin(t0), y1, r1 * math.cos(t0))
            p11 = (r1 * math.sin(t1), y1, r1 * math.cos(t1))
            if smooth:
                n00 = norm((a0 * math.sin(t0), b0, a0 * math.cos(t0)))
                n01 = norm((a0 * math.sin(t1), b0, a0 * math.cos(t1)))
                n10 = norm((a1 * math.sin(t0), b1, a1 * math.cos(t0)))
                n11 = norm((a1 * math.sin(t1), b1, a1 * math.cos(t1)))
            if r0 > 1e-9:
                tris.append(((p00, p10, p11), (n00, n10, n11) if smooth else None, None))
            if r1 > 1e-9 or r0 <= 1e-9:
                tris.append(((p00, p11, p01), (n00, n11, n01) if smooth else None, None))
    for top in (True, False):
        r, y = (prof[0][0], prof[0][1]) if top else (prof[-1][0], prof[-1][1])
        if r <= 1e-9:
            continue
        ctr = (0.0, y, 0.0)
        nn = (0.0, 1.0 if top else -1.0, 0.0)
        for x in range(seg):
            i = (r * math.sin(ang[x]), y, r * math.cos(ang[x]))
            j = (r * math.sin(ang[x + 1]), y, r * math.cos(ang[x + 1]))
            tris.append(((i, j, ctr) if top else (j, i, ctr), (nn, nn, nn) if smooth else None, None))
    if ao > 0 and h > 0.9:
        tris = [(ps, ns, tuple(ao * max(0.0, 1.0 - (p[1] + hh) / min(h, 4.0)) for p in ps)) for ps, ns, _ in tris]
    return tris


def g_sphere(r, ws, hs, p0=0.0, pl=TAU, t0=0.0, tl=math.pi, smooth=False):
    tend = min(t0 + tl, math.pi)
    grid = []
    for iy in range(hs + 1):
        v = iy / hs
        row = []
        for ix in range(ws + 1):
            u = ix / ws
            row.append((-r * math.cos(p0 + u * pl) * math.sin(t0 + v * tl), r * math.cos(t0 + v * tl),
                        r * math.sin(p0 + u * pl) * math.sin(t0 + v * tl)))
        grid.append(row)
    tris = []
    for iy in range(hs):
        for ix in range(ws):
            a, b, c, d = grid[iy][ix + 1], grid[iy][ix], grid[iy + 1][ix], grid[iy + 1][ix + 1]
            if iy != 0 or t0 > 0:
                tris.append(((a, b, d), (norm(a), norm(b), norm(d)) if smooth else None, None))
            if iy != hs - 1 or tend < math.pi:
                tris.append(((b, c, d), (norm(b), norm(c), norm(d)) if smooth else None, None))
    return tris


ICO_V = [(-1, 1.618033988749895, 0), (1, 1.618033988749895, 0), (-1, -1.618033988749895, 0), (1, -1.618033988749895, 0),
         (0, -1, 1.618033988749895), (0, 1, 1.618033988749895), (0, -1, -1.618033988749895), (0, 1, -1.618033988749895),
         (1.618033988749895, 0, -1), (1.618033988749895, 0, 1), (-1.618033988749895, 0, -1), (-1.618033988749895, 0, 1)]
ICO_F = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2,
         3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1]
OCT_V = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]
OCT_F = [0, 2, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 3, 1, 3, 4, 1, 4, 2]


def g_poly(verts, faces, r, detail):
    tris = []
    for f in range(0, len(faces), 3):
        a, b, c = verts[faces[f]], verts[faces[f + 1]], verts[faces[f + 2]]
        cols = detail + 1
        v = []
        for i in range(cols + 1):
            aj = lerp3(a, c, i / cols)
            bj = lerp3(b, c, i / cols)
            rows = cols - i
            v.append([aj if (j == 0 and i == cols) else lerp3(aj, bj, j / rows) for j in range(rows + 1)])
        for i in range(cols):
            for j in range(2 * (cols - i) - 1):
                k = j // 2
                if j % 2 == 0:
                    tri = (v[i][k + 1], v[i + 1][k], v[i][k])
                else:
                    tri = (v[i][k + 1], v[i + 1][k + 1], v[i + 1][k])
                tris.append((tuple(mul(norm(p), r) for p in tri), None, None))
    return tris


def g_torus(R, tube, rs, ts, arc, smooth=False):
    pts = []
    nrm = []
    for j in range(rs + 1):
        for i in range(ts + 1):
            u = i / ts * arc
            v = j / rs * TAU
            pts.append(((R + tube * math.cos(v)) * math.cos(u), (R + tube * math.cos(v)) * math.sin(u), tube * math.sin(v)))
            nrm.append(norm((math.cos(v) * math.cos(u), math.cos(v) * math.sin(u), math.sin(v))))
    tris = []
    for j in range(1, rs + 1):
        for i in range(1, ts + 1):
            a = (ts + 1) * j + i - 1
            b = (ts + 1) * (j - 1) + i - 1
            c = (ts + 1) * (j - 1) + i
            d = (ts + 1) * j + i
            for t in ((a, b, d), (b, c, d)):
                tris.append((tuple(pts[q] for q in t), tuple(nrm[q] for q in t) if smooth else None, None))
    return tris


def smooth_normals(tris):
    """Normales suaves: promedia las normales de las caras que comparten un vértice."""
    acc = {}
    key = lambda p: (round(p[0], 4), round(p[1], 4), round(p[2], 4))
    for ps, _, _ in tris:
        n = cross(sub(ps[1], ps[0]), sub(ps[2], ps[0]))
        for p in ps:
            k = key(p)
            acc[k] = add(acc.get(k, (0.0, 0.0, 0.0)), n)
    return [(ps, tuple(norm(acc[key(p)]) for p in ps), e) for ps, _, e in tris]


def noise3(p, seed):
    x, y, z = p
    return (math.sin(x * 1.7 + seed) * math.sin(y * 2.3 + seed * 1.31) * math.sin(z * 1.9 + seed * 0.77)
            + 0.5 * math.sin(x * 3.9 - y * 2.1 + seed * 2.1) * math.sin(z * 3.3 + seed * 0.4))


def g_blob(r, detail, amp, seed):
    """Esfera geodésica con relieve suave (follaje, arbustos)."""
    tris = g_poly(ICO_V, ICO_F, 1.0, detail)
    out = []
    for ps, _, _ in tris:
        out.append((tuple(mul(p, r * (1.0 + amp * noise3(p, seed))) for p in ps), None, None))
    return smooth_normals(out)


def g_rock_cone(rt, rb, h, seg, hseg, amp, seed, keep_top=True):
    """Cono de roca con relieve: base rocosa de las islas y estalactitas (caras planas, como piedra tallada)."""
    tris = []
    hh = h / 2
    rnd = random.Random(seed)
    jit = [[rnd.uniform(-1, 1) for _ in range(seg)] for _ in range(hseg + 1)]
    grid = []
    for y in range(hseg + 1):
        v = y / hseg
        r = rt + (rb - rt) * v
        row = []
        for x in range(seg):
            th = x / seg * TAU + (0.5 / seg * TAU if y % 2 else 0.0)
            j = 0.0 if (y == 0 and keep_top) else jit[y][x] * amp
            rr = max(0.0, r * (1.0 + j))
            yy = hh - h * v + (0.0 if y in (0, hseg) else jit[(y + 1) % (hseg + 1)][x] * amp * h * 0.15)
            row.append((rr * math.sin(th), yy, rr * math.cos(th)))
        row.append(row[0])
        grid.append(row)
    for y in range(hseg):
        for x in range(seg):
            a, b, c, d = grid[y][x], grid[y + 1][x], grid[y + 1][x + 1], grid[y][x + 1]
            if y % 2 == 0:
                tris.append(((a, b, d), None, None))
                tris.append(((b, c, d), None, None))
            else:
                tris.append(((a, b, c), None, None))
                tris.append(((a, c, d), None, None))
    if rt > 0:
        ctr = (0.0, hh, 0.0)
        for x in range(seg):
            tris.append(((grid[0][x], grid[0][x + 1], ctr), None, None))
    return [((_out(ps, (0.0, ps[0][1] * 0 + sum(p[1] for p in ps) / 3, 0.0))), n, e) for ps, n, e in tris]


def shape_window(w, h, segs):
    pts = [(-w / 2, 0.0), (w / 2, 0.0), (w / 2, h)]
    for i in range(1, segs):
        a = math.pi * i / segs
        pts.append((math.cos(a) * w / 2, h + math.sin(a) * w / 2))
    pts.append((-w / 2, h))
    return pts


def g_extrude_convex(poly, z0, z1, smooth_from=None):
    """Extrusión de un polígono convexo (ventanas): frente, fondo y paredes."""
    tris = []
    cx = sum(p[0] for p in poly) / len(poly)
    cy = sum(p[1] for p in poly) / len(poly)
    n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        tris.append((((cx, cy, z1), (a[0], a[1], z1), (b[0], b[1], z1)), None, None))
        tris.append((((cx, cy, z0), (b[0], b[1], z0), (a[0], a[1], z0)), None, None))
        q = [(a[0], a[1], z0), (b[0], b[1], z0), (b[0], b[1], z1), (a[0], a[1], z1)]
        tris.append(((q[0], q[1], q[2]), None, None))
        tris.append(((q[0], q[2], q[3]), None, None))
    fixed = []
    for ps, ns, e in tris:
        m = mul(add(add(ps[0], ps[1]), ps[2]), 1 / 3)
        nn = cross(sub(ps[1], ps[0]), sub(ps[2], ps[0]))
        out = sub(m, (cx, cy, (z0 + z1) / 2))
        fixed.append(((ps if dot(nn, out) >= 0 else (ps[0], ps[2], ps[1])), ns, e))
    return fixed


def g_spandrel(span, depth, segs):
    """Enjuta del arco: rectángulo con un semicírculo vaciado; el intradós sale redondo (normales suaves)."""
    r = span / 2
    top = r + 0.25
    z0, z1 = -depth / 2, depth / 2
    tris = []
    ac = math.atan2(top, r)
    angs = sorted(set([math.pi * i / segs for i in range(segs + 1)] + [ac, math.pi - ac]))
    arc = [(math.cos(a) * r, math.sin(a) * r) for a in angs]

    def edge(a):
        c, s = math.cos(a), math.sin(a)
        t = min(r / abs(c) if abs(c) > 1e-9 else 1e9, top / s if s > 1e-9 else 1e9)
        return (c * t, s * t)

    outer = [edge(a) for a in angs]
    for i in range(len(angs) - 1):
        a0, a1, o0, o1 = arc[i], arc[i + 1], outer[i], outer[i + 1]
        for z, front in ((z1, True), (z0, False)):
            t1 = ((a0[0], a0[1], z), (o0[0], o0[1], z), (o1[0], o1[1], z))
            t2 = ((a0[0], a0[1], z), (o1[0], o1[1], z), (a1[0], a1[1], z))
            for t in (t1, t2):
                nn = cross(sub(t[1], t[0]), sub(t[2], t[0]))
                if abs(nn[2]) < 1e-12:
                    continue
                if (nn[2] > 0) != front:
                    t = (t[0], t[2], t[1])
                tris.append((t, None, None))
    # intradós (curvo, suave)
    for i in range(len(angs) - 1):
        a0, a1 = arc[i], arc[i + 1]
        n0 = norm((-a0[0], -a0[1], 0.0))
        n1 = norm((-a1[0], -a1[1], 0.0))
        q = [(a0[0], a0[1], z0), (a1[0], a1[1], z0), (a1[0], a1[1], z1), (a0[0], a0[1], z1)]
        for t, nn in (((q[0], q[1], q[2]), (n0, n1, n1)), ((q[0], q[2], q[3]), (n0, n1, n0))):
            fn = cross(sub(t[1], t[0]), sub(t[2], t[0]))
            if dot(fn, add(nn[0], nn[1])) < 0:
                t = (t[0], t[2], t[1])
                nn = (nn[0], nn[2], nn[1])
            tris.append((t, nn, None))
    # paredes de afuera: lados y arriba
    for (x0, y0), (x1, y1) in (((r, 0.0), (r, top)), ((r, top), (-r, top)), ((-r, top), (-r, 0.0))):
        q = [(x0, y0, z0), (x1, y1, z0), (x1, y1, z1), (x0, y0, z1)]
        for t in ((q[0], q[1], q[2]), (q[0], q[2], q[3])):
            tris.append((_out(t, (0.0, top * 0.5, 0.0)), None, None))
    return tris


# --------------------------------------------------------------------------------------------- malla
class Malla:
    def __init__(self):
        self.p = []
        self.n = []
        self.c = []

    def tris(self):
        return len(self.p) // 9


def k_flat(n):
    ny = n[1]
    return 0.0 if ny > 0.55 else (0.55 if ny < -0.55 else 0.34 + (0.06 if n[0] > 0.3 else 0.0))


def _sst(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def k_smooth(n):
    """Lo mismo que k_flat pero sin saltos, para las piezas redondas."""
    ny, nx = n[1], n[0]
    side = 0.34 + 0.06 * _sst(0.2, 0.4, nx)
    if ny >= 0:
        return side * (1.0 - _sst(0.42, 0.68, ny))
    return side + (0.55 - side) * _sst(0.42, 0.68, -ny)


def emit(m, tris, color, shade, xf, smooth_k=False, tint=None):
    """Transforma (posición + rotación XYZ) y agrega los triángulos con su color horneado."""
    x, y, z, rx, ry, rz = xf
    R = euler_xyz(rx, ry, rz)
    base = hexcol(color) if isinstance(color, str) else color
    sh = hexcol(shade)
    for ps, ns, es in tris:
        wp = [add(rot(R, p), (x, y, z)) for p in ps]
        fn = norm(cross(sub(wp[1], wp[0]), sub(wp[2], wp[0])))
        wn = [norm(rot(R, n)) for n in ns] if ns else [fn, fn, fn]
        kf = k_flat(fn)
        # Godot quiere el sentido horario: 0, 2, 1
        for i in (0, 2, 1):
            k = k_smooth(wn[i]) if (ns and smooth_k) else kf
            if es:
                k = min(0.75, k + es[i])
            col = lerp3(base, sh, k)
            if tint:
                col = lerp3(col, tint[0], tint[1](wp[i], wn[i]))
            m.p.extend(wp[i])
            m.n.extend(wn[i])
            m.c.extend(col)


# --------------------------------------------------------------------------------------------- receta → mallas
def prim_geo(pr):
    t = pr["type"]
    p = pr.get("p")
    if t == "BoxGeometry":
        return g_box(p["width"], p["height"], p["depth"])
    if t == "CylinderGeometry":
        return g_cyl(p["radiusTop"], p["radiusBottom"], p["height"], p["radialSegments"], p["heightSegments"], p["openEnded"], p["thetaStart"], p["thetaLength"])
    if t == "ConeGeometry":
        return g_cyl(0, p["radius"], p["height"], p["radialSegments"], p["heightSegments"], p["openEnded"], p["thetaStart"], p["thetaLength"])
    if t == "SphereGeometry":
        return g_sphere(p["radius"], p["widthSegments"], p["heightSegments"], p["phiStart"], p["phiLength"], p["thetaStart"], p["thetaLength"])
    if t == "IcosahedronGeometry":
        return g_poly(ICO_V, ICO_F, p["radius"], p["detail"])
    if t == "OctahedronGeometry":
        return g_poly(OCT_V, OCT_F, p["radius"], p["detail"])
    if t == "TorusGeometry":
        return g_torus(p["radius"], p["tube"], p["radialSegments"], p["tubularSegments"], p["arc"])
    raise ValueError(t)


def raw_tris(pr):
    v = pr["v"]
    out = []
    for i in range(0, len(v), 9):
        out.append((((v[i], v[i + 1], v[i + 2]), (v[i + 3], v[i + 4], v[i + 5]), (v[i + 6], v[i + 7], v[i + 8])), None, None))
    return out


def paletas(world):
    m = json.load(open(os.path.join(DATA, "mundos.json")))
    regs = m["worlds"][world]["regions"]
    by_name = {r["name"]: r for r in regs.values()}
    return by_name


def armar(world, hd=True):
    rec = json.load(open(os.path.join(DATA, "receta_%s.json" % world)))
    calls = rec["calls"]
    pals = paletas(world)
    builders = rec["builders"]
    mallas = {bid: Malla() for bid in builders}
    pal_of = {bid: pals.get(b["name"], {}) for bid, b in builders.items()}
    shade_of = {bid: b["shade"] for bid, b in builders.items()}
    seen_calls = {}
    for idx, pr in enumerate(rec["prims"]):
        bid = str(pr["b"])
        m = mallas[bid]
        shade = shade_of[bid]
        for c in pr["ctx"]:
            seen_calls.setdefault(c, bid)
        if not hd:
            tris = raw_tris(pr) if pr["type"] == "raw" else prim_geo(pr)
            emit(m, tris, pr["color"], shade, (0, 0, 0, 0, 0, 0) if pr["type"] == "raw" else pr["t"])
            continue
        hd_prim(m, pr, rec, pal_of[bid], shade, idx)
    if hd:
        for cid, bid in seen_calls.items():
            hd_extras(mallas[bid], calls[cid], pal_of[bid], shade_of[bid], cid)
    return rec, mallas


def top_call(pr, calls):
    return calls[pr["ctx"][0]] if pr["ctx"] else None


def inner_call(pr, calls):
    return calls[pr["ctx"][-1]] if pr["ctx"] else None


LEAFY = None


def es_follaje(color, pal):
    leaf = [c.lower() for c in pal.get("leaf", [])]
    return color.lower() in leaf


def hd_prim(m, pr, rec, pal, shade, idx):
    calls = rec["calls"]
    t = pr["type"]
    p = pr.get("p")
    col = pr["color"]
    xf = pr["t"]
    inner = inner_call(pr, calls)
    top = top_call(pr, calls)
    fn_in = inner["fn"] if inner else ""
    fn_top = top["fn"] if top else ""
    seed = idx * 0.6180339 + 1.0

    if t == "raw":
        if fn_in == "window":
            a = inner["args"]   # x, y, z, ry, w, h, color
            x, y, z, ry, w, h = a[0], a[1], a[2], a[3], a[4], a[5]
            poly = shape_window(w, h, 14)
            emit(m, g_extrude_convex(poly, -0.04, 0.04), col, shade, (x, y, z, 0, ry, 0))
            return
        if fn_in == "spandrel":
            a = inner["args"]   # x, y, z, span, depth, ry, color
            emit(m, g_spandrel(a[3], a[4], 28), col, shade, (a[0], a[1], a[2], 0, a[5], 0), smooth_k=True)
            return
        emit(m, raw_tris(pr), col, shade, (0, 0, 0, 0, 0, 0))
        return

    if t == "BoxGeometry":
        w, h, d = p["width"], p["height"], p["depth"]
        bev = max(0.012, min(0.08, 0.06 * min(w, h, d)))
        emit(m, g_box_hd(w, h, d, bev, ao=0.10), col, shade, xf)
        return

    if t in ("CylinderGeometry", "ConeGeometry"):
        if t == "ConeGeometry":
            rt, rb, h, seg = 0.0, p["radius"], p["height"], p["radialSegments"]
        else:
            rt, rb, h, seg = p["radiusTop"], p["radiusBottom"], p["height"], p["radialSegments"]
        full = abs(p["thetaLength"] - TAU) < 1e-6 and not p["openEnded"]
        if not full:
            emit(m, prim_geo(pr), col, shade, xf)
            return
        rmax = max(rt, rb)
        # base rocosa de las islas y estalactitas: relieve de piedra
        if fn_top == "island" and col.lower() == str(pal.get("rock", "")).lower():
            if rt > 0 and rb > 0 and rb < rt:
                emit(m, g_rock_cone(rt, rb, h, seg * 3, 5, 0.07, seed), col, shade, xf, tint=_rock_tint(xf[1], h, shade))
            else:
                emit(m, g_rock_cone(rt, rb, h, 7, 3, 0.12, seed, keep_top=True), col, shade, xf)
            return
        sag = rmax * (1 - math.cos(math.pi / seg))
        if seg >= 8 and sag <= 0.09:
            # redondo: más lados y normales suaves; radio medio para que coincida con su colisión
            f = (1 + math.cos(math.pi / seg)) / 2
            nseg = min(48, max(24, seg * 3))
            bev = 0.0 if rmax < 0.12 else min(0.05, rmax * 0.12)
            emit(m, g_cyl_hd(rt * f, rb * f, h, nseg, True, bev, ao=0.08), col, shade, xf, smooth_k=True)
            return
        if seg >= 8:
            # grande (losas, plazas): se mantiene el polígono (la colisión es exacta) y se biselan los bordes
            emit(m, g_cyl_hd(rt, rb, h, seg, False, min(0.14, h * 0.2), ao=0.0), col, shade, xf)
            return
        if 5 <= seg <= 7 and rmax <= 0.6 and h >= max(0.8, 2 * rmax) and rt > 0 and not es_follaje(col, pal):
            # troncos y postes delgados: redondos
            f = (1 + math.cos(math.pi / seg)) / 2
            emit(m, g_cyl_hd(rt * f, rb * f, h, 16, True, min(0.03, rmax * 0.1), ao=0.08), col, shade, xf, smooth_k=True)
            return
        if es_follaje(col, pal) and rt == 0 and h > 1.0:
            # pino: tres pisos de ramas en vez de un solo cono
            g = []
            for i, (fr, fy) in enumerate(((1.0, 0.0), (0.78, 0.28), (0.55, 0.52))):
                hh = h * 0.48
                tier = g_cyl_hd(0.0, rb * fr, hh, max(9, seg * 2), True, 0.0)
                g += [(tuple((q[0], q[1] - h / 2 + hh / 2 + h * fy, q[2]) for q in ps), ns, e) for ps, ns, e in tier]
            emit(m, g, col, shade, xf, smooth_k=True)
            return
        emit(m, prim_geo(pr), col, shade, xf)   # pirámides, prismas y agujas: se quedan con sus facetas
        return

    if t == "SphereGeometry":
        emit(m, g_sphere(p["radius"], min(48, p["widthSegments"] * 4), min(24, p["heightSegments"] * 3), p["phiStart"],
                         p["phiLength"], p["thetaStart"], p["thetaLength"], smooth=True), col, shade, xf, smooth_k=True)
        return

    if t == "IcosahedronGeometry":
        r = p["radius"]
        leafy = es_follaje(col, pal) or fn_in == "tree"
        detail = 2 if r >= 0.35 else 1
        amp = 0.09 if (leafy and r >= 0.3) else 0.0
        emit(m, g_blob(r, detail, amp, seed), col, shade, xf, smooth_k=True,
             tint=_leaf_tint(col) if leafy else None)
        return

    if t == "TorusGeometry":
        emit(m, g_torus(p["radius"], p["tube"], p["radialSegments"] * 2, p["tubularSegments"] * 2, p["arc"], smooth=True),
             col, shade, xf, smooth_k=True)
        return

    emit(m, prim_geo(pr), col, shade, xf)   # octaedros (cristales) y lo demás


def _leaf_tint(col):
    """Follaje: la copa se aclara arriba (como si le diera el sol)."""
    light = lerp3(hexcol(col), (1.0, 1.0, 0.92), 0.35)
    return (light, lambda p, n: max(0.0, n[1]) * 0.45)


def _rock_tint(y_center, h, shade):
    """Rocas: más oscuras hacia la punta de abajo (profundidad)."""
    dark = hexcol(shade)
    top = y_center + h / 2
    return (lerp3(dark, (0.0, 0.0, 0.0), 0.25), lambda p, n: 0.35 * max(0.0, min(1.0, (top - p[1]) / max(h, 0.1))) ** 1.5)


def hd_extras(m, call, pal, shade, cid):
    """Detalles nuevos que no estaban: zócalos y molduras en torres, marcos y repisas en ventanas, capiteles."""
    fn = call["fn"]
    a = call["args"]
    trim = pal.get("stone2", "#f1cbb8")
    accent = pal.get("accent", trim)
    if fn == "window":
        x, y, z, ry, w, h = a[0], a[1], a[2], a[3], a[4], a[5]
        frame = shape_window(w + 0.14, h + 0.0, 14)
        frame = [(px, py - 0.07) for px, py in frame]
        emit(m, g_extrude_convex(frame, -0.05, 0.02), trim, shade, (x, y, z, 0, ry, 0))
        emit(m, g_box_hd(w + 0.24, 0.07, 0.2, 0.02), trim, shade, (x, y - 0.07, z, 0, ry, 0))
    elif fn == "tower":
        x, z, y, w, h = a[0], a[1], a[2], a[3], a[4]
        o = a[5] if len(a) > 5 and isinstance(a[5], dict) else {}
        tc = o.get("trim") or trim
        # zócalo
        emit(m, g_box_hd(w + 0.22, 0.42, w + 0.22, 0.05), tc, shade, (x, y + 0.21, z, 0, 0, 0))
        # moldura bajo la cornisa
        emit(m, g_box_hd(w + 0.14, 0.12, w + 0.14, 0.03), tc, shade, (x, y + h - 0.14, z, 0, 0, 0))
        # bandas entre pisos
        if o.get("windows", True) is not False:
            rows = max(1, int((h - 1.2) // 2.2))
            for i in range(1, rows):
                emit(m, g_box_hd(w + 0.08, 0.1, w + 0.08, 0.025), tc, shade, (x, y + 1.0 + i * 2.2 - 0.45, z, 0, 0, 0))
        top = y + h + 0.27
        if o.get("roof") == "cone":
            ht = w * 1.3
            emit(m, g_cyl_hd(0.05, 0.05, 0.35, 12, True, 0.0), accent, shade, (x, top + ht - 0.02 + 0.17, z, 0, 0, 0), smooth_k=True)
            emit(m, g_blob(0.11, 2, 0.0, 1.0), accent, shade, (x, top + ht + 0.4, z, 0, 0, 0), smooth_k=True)
    elif fn == "arch":
        x, z, y, span, h, depth = a[0], a[1], a[2], a[3], a[4], a[5]
        o = a[6] if len(a) > 6 and isinstance(a[6], dict) else {}
        ry = o.get("ry", 0)
        pw = o.get("pillar", 0.9)
        tc = o.get("trim") or trim
        c, s = math.cos(ry), math.sin(ry)
        off = span / 2 + pw / 2
        spring = y + h - span / 2
        for sg in (-1, 1):
            px, pz = x + c * off * sg, z - s * off * sg
            emit(m, g_box_hd(pw + 0.16, 0.34, depth + 0.16, 0.04), tc, shade, (px, y + 0.17, pz, 0, ry, 0))
            emit(m, g_box_hd(pw + 0.14, 0.2, depth + 0.14, 0.035), tc, shade, (px, spring - 0.1, pz, 0, ry, 0))


# --------------------------------------------------------------------------------------------- salida
def leer_mundo(world):
    d = json.load(open(os.path.join(DATA, "mundo_%s.json" % world)))
    b = open(os.path.join(DATA, "mundo_%s.bin" % world), "rb").read()

    def f32(ref):
        return struct.unpack_from("<%df" % ref["n"], b, ref["off"])
    return d, f32


def validar(world):
    rec, mallas = armar(world, hd=False)
    d, f32 = leer_mundo(world)
    ok = True
    built = list(mallas.values())
    bi = 0
    for i, mm in enumerate(d["meshes"]):
        if not rec["meshes"][i]["builder"]:
            continue
        m = built[bi]
        bi += 1
        p = f32(mm["p"])
        c = f32(mm["c"])
        n = len(p) // 3
        if n != len(m.p) // 3:
            print("  malla %d: %d vértices, rearmada %d" % (i, n, len(m.p) // 3))
            ok = False
            continue
        dp = 0.0
        dc = 0.0
        for t in range(0, n, 3):
            for k, src in enumerate((0, 2, 1)):   # el rearmado ya viene en sentido horario
                for ax in range(3):
                    dp = max(dp, abs(p[(t + src) * 3 + ax] - m.p[(t + k) * 3 + ax]))
                    dc = max(dc, abs(c[(t + src) * 3 + ax] - m.c[(t + k) * 3 + ax]))
        print("  malla %d: %d vértices · diferencia máx. posición %.4f · color %.4f" % (i, n, dp, dc))
        ok = ok and dp < 0.01 and dc < 0.01
    return ok


def _packed(code, count, data, fmt):
    """Bytes con el mismo formato que var_to_bytes() de Godot: el juego los lee con bytes_to_var (rapidísimo)."""
    return struct.pack("<II", code, count) + struct.pack("<%d%s" % (len(data), fmt), *data)


PV3, PCOL, PI32, PF32 = 36, 37, 30, 32


def indexar(m):
    """Une los vértices repetidos (misma posición, normal y color) y devuelve arreglos con índices."""
    idx = {}
    P, N, C, I = [], [], [], []
    for v in range(len(m.p) // 3):
        p = tuple(m.p[v * 3:v * 3 + 3])
        n = tuple(m.n[v * 3:v * 3 + 3])
        c = tuple(m.c[v * 3:v * 3 + 3])
        key = (round(p[0], 4), round(p[1], 4), round(p[2], 4), round(n[0], 3), round(n[1], 3), round(n[2], 3),
               round(c[0], 4), round(c[1], 4), round(c[2], 4))
        k = idx.get(key)
        if k is None:
            k = len(P) // 3
            idx[key] = k
            P += p
            N += n
            C += (c[0], c[1], c[2], 1.0)
        I.append(k)
    return P, N, C, I


def escribir(world, mallas, grass):
    rec = json.load(open(os.path.join(DATA, "receta_%s.json" % world)))
    blob = bytearray()

    def put(b):
        off = len(blob)
        blob.extend(b)
        return [off, len(b)]

    meshes = []
    nv = 0
    for bid, m in mallas.items():
        if not m.p:
            continue
        P, N, C, I = indexar(m)
        nv += len(P) // 3
        meshes.append({"b": bid, "v": put(_packed(PV3, len(P) // 3, P, "f")), "n": put(_packed(PV3, len(N) // 3, N, "f")),
                       "c": put(_packed(PCOL, len(C) // 4, C, "f")), "i": put(_packed(PI32, len(I), I, "i"))})
    replace = [i for i, mm in enumerate(rec["meshes"]) if mm["builder"]]
    chunks = []
    for g in grass:
        buf = []
        f = g["m"]
        for k in range(0, len(f), 8):
            x, y, z, ry, sc, r, gg, b = f[k:k + 8]
            c, s = math.cos(ry) * sc, math.sin(ry) * sc
            buf += [c, 0.0, s, x, 0.0, sc, 0.0, y, -s, 0.0, c, z, r, gg, b, 1.0]
        chunks.append({"cx": g["cx"], "cz": g["cz"], "count": len(f) // 8, "buf": put(_packed(PF32, len(buf), buf, "f"))})
    out = {"replace": replace, "meshes": meshes, "grass": chunks}
    with open(os.path.join(DATA, "mundo_%s_hd.bin" % world), "wb") as fh:
        fh.write(blob)
    with open(os.path.join(DATA, "mundo_%s_hd.json" % world), "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    return len(blob), nv


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    worlds = args or ["islas", "gemini", "soledad"]
    if "--validar" in sys.argv:
        for w in worlds:
            print(w)
            print("  OK" if validar(w) else "  DIFERENTE")
        return
    import pasto
    for w in worlds:
        rec, mallas = armar(w, hd=True)
        orig = sum(mm["n"] for mm in rec["meshes"] if mm["builder"]) // 3
        nuevo = sum(m.tris() for m in mallas.values())
        grass = pasto.repartir(w, rec)
        size, nv = escribir(w, mallas, grass)
        print("%s: arquitectura %d → %d triángulos (%d vértices) · pasto %d matas · %.1f MB" % (w, orig, nuevo, nv, sum(len(g["m"]) // 8 for g in grass), size / 1e6))


if __name__ == "__main__":
    main()
