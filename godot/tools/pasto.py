"""Star Nova — reparte matas de pasto sobre el suelo natural (Verdalia; lo usa hd_mundo.py).

Solo sobre el suelo de verdad: caras que miran hacia arriba con el color de suelo de su región (o la pradera
verde de Verdalia), en manchas (no una alfombra pareja), y nunca debajo de algo (plazas, escalones, muros)
ni bajo el agua. Cada mata: x, y, z, giro, tamaño y color (lineal). Se agrupan en cuadros de 24 m para que el
juego dibuje solo los cercanos.
"""
import json
import math
import random

import hd_mundo as H

CELDA = 24.0
DENSIDAD = {"islas": 3.2, "gemini": 1.1, "soledad": 2.0}
MANCHAS = {"islas": 0.38, "gemini": 0.8, "soledad": 0.3}   # fracción aproximada del suelo con pasto
MAXIMO = {"islas": 9000, "gemini": 30000, "soledad": 5000}


def _tri_list(p):
    out = []
    for t in range(0, len(p), 9):
        out.append(((p[t], p[t + 1], p[t + 2]), (p[t + 3], p[t + 4], p[t + 5]), (p[t + 6], p[t + 7], p[t + 8])))
    return out


class Rejilla:
    """Triángulos indexados por su caja en XZ, para preguntar "¿qué hay encima de este punto?"."""

    def __init__(self, tris, cell=2.0):
        self.cell = cell
        self.g = {}
        for t in tris:
            xs = [v[0] for v in t]
            zs = [v[2] for v in t]
            for i in range(int(math.floor(min(xs) / cell)), int(math.floor(max(xs) / cell)) + 1):
                for j in range(int(math.floor(min(zs) / cell)), int(math.floor(max(zs) / cell)) + 1):
                    self.g.setdefault((i, j), []).append(t)

    def alturas(self, x, z):
        out = []
        for t in self.g.get((int(math.floor(x / self.cell)), int(math.floor(z / self.cell))), ()):
            a, b, c = t
            d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2])
            if abs(d) < 1e-12:
                continue
            l1 = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d
            l2 = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d
            l3 = 1 - l1 - l2
            if l1 >= -1e-6 and l2 >= -1e-6 and l3 >= -1e-6:
                out.append(l1 * a[1] + l2 * b[1] + l3 * c[1])
        return out


def _mancha(x, z, seed):
    return (math.sin(x * 0.13 + seed) * math.sin(z * 0.11 - seed * 0.7) + 0.6 * math.sin((x + z) * 0.071 + seed * 1.9)
            + 0.35 * math.sin(x * 0.37 - z * 0.29 + seed * 0.3))


# Solo en mundos con suelo natural. Las Islas del Cielo y Prismara son de piedra pulida (estilo concreto):
# ahí no crece pasto (lo pidió el dueño).
CON_PASTO = {"gemini"}


def repartir(world, rec):
    if world not in CON_PASTO:
        return []
    d, f32 = H.leer_mundo(world)
    pals = H.paletas(world)
    rnd = random.Random(7 + len(world))
    # todo lo que hay en el mundo (para saber qué tapa el suelo)
    todo = []
    suelo = []   # (tri, color de pasto 1, color de pasto 2)
    for i, mm in enumerate(d["meshes"]):
        p = f32(mm["p"])
        tris = _tri_list(p)
        todo += tris
        if not rec["meshes"][i]["builder"]:
            c = f32(mm["c"])
            for k, t in enumerate(tris):
                r, g, b = c[k * 9], c[k * 9 + 1], c[k * 9 + 2]
                if g > r * 1.25 and g > b * 1.6 and g > 0.25:
                    base = (r, g, b)
                    suelo.append((t, H.lerp3(base, (r * 0.7, g * 0.85, b * 0.6), 0.6), H.lerp3(base, (min(1, r * 1.3 + 0.05), min(1, g * 1.15), b * 0.9), 0.6)))
    agua = []
    for x in d["spots"].get("extras", []):
        if x.get("type") == "Water" and x.get("mesh"):
            agua += _tri_list(f32(x["mesh"]))
    _, mallas = H.armar(world, hd=False)
    for bid, m in mallas.items():
        pal = pals.get(rec["builders"][bid]["name"], {})
        if not pal.get("ground"):
            continue
        gcol = H.hexcol(pal["ground"])
        leaf = [H.hexcol(c) for c in pal.get("leaf", [])] or [gcol]
        c1 = H.lerp3(leaf[0], gcol, 0.42)
        c2 = H.lerp3(leaf[-1], gcol, 0.3)
        for k, t in enumerate(_tri_list(m.p)):
            if all(abs(m.c[k * 9 + q] - gcol[q]) < 0.002 for q in range(3)):
                suelo.append((t, c1, c2))
    rej = Rejilla(todo)
    rag = Rejilla(agua) if agua else None
    dens = DENSIDAD.get(world, 0.8)
    cov = MANCHAS.get(world, 0.5)
    seed = rnd.uniform(0, 100)
    matas = []
    for t, c1, c2 in suelo:
        a, b, c = t
        n = H.cross(H.sub(b, a), H.sub(c, a))
        ln = math.sqrt(H.dot(n, n))
        if ln < 1e-9 or abs(n[1]) / ln < 0.82:
            continue
        area = ln / 2
        cnt = area * dens
        k = int(cnt) + (1 if rnd.random() < cnt - int(cnt) else 0)
        for _ in range(k):
            u, v = rnd.random(), rnd.random()
            if u + v > 1:
                u, v = 1 - u, 1 - v
            p = H.add(a, H.add(H.mul(H.sub(b, a), u), H.mul(H.sub(c, a), v)))
            m = _mancha(p[0], p[2], seed)
            # umbral para que solo una parte del suelo tenga pasto (manchas)
            if m < 1.2 - cov * 2.4:
                continue
            # nada encima (plazas, muros, escalones) hasta 0.7 m
            if any(p[1] + 0.03 < y < p[1] + 0.7 for y in rej.alturas(p[0], p[2])):
                continue
            if rag and any(y > p[1] - 0.05 for y in rag.alturas(p[0], p[2])):
                continue
            dens_local = min(1.0, (m - (1.2 - cov * 2.4)) * 1.5 + 0.35)
            s = (0.65 + 0.6 * rnd.random()) * (0.6 + 0.4 * dens_local)
            col = H.lerp3(c1, c2, rnd.random())
            matas.append((p[0], p[1] - 0.02, p[2], rnd.uniform(0, H.TAU), s, col))
    rnd.shuffle(matas)   # en orden al azar: la calidad media dibuja solo la primera mitad de cada cuadro
    matas = matas[:MAXIMO.get(world, 8000)]
    celdas = {}
    for mt in matas:
        key = (int(math.floor(mt[0] / CELDA)), int(math.floor(mt[2] / CELDA)))
        celdas.setdefault(key, []).append(mt)
    out = []
    for (i, j), lst in sorted(celdas.items()):
        flat = []
        for x, y, z, ry, s, col in lst:
            flat += [round(x, 3), round(y, 3), round(z, 3), round(ry, 3), round(s, 3), round(col[0], 4), round(col[1], 4), round(col[2], 4)]
        out.append({"cx": (i + 0.5) * CELDA, "cz": (j + 0.5) * CELDA, "m": flat})
    return out
