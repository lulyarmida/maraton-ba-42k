"""
Genera public/data/resultados.json a partir del CSV limpio.

Uso:
    python scripts/build_data.py
    python scripts/build_data.py data/otro_archivo.csv

El CSV necesita las columnas: lista, anio, Sexo, EdadGrupo, T. Neto, T. Oficial.
Para sumar un año nuevo, agregá sus filas al CSV, sumá el año en YEARS
(acá y en public/js/app.js) y su color en public/css/styles.css (--yAAAA).
"""
import json
import re
import sys
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
CSV = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "data" / "maraton_42k_2024_2026_limpio.csv"
CLIMA = RAIZ / "data" / "clima_carrera.csv"  # una fila por año, generada desde Open-Meteo
SALIDA = RAIZ / "public" / "data" / "resultados.json"

YEARS = [2024, 2025, 2026]
AGES = ["18", "30", "35", "40", "45", "50", "55", "60"]  # límite inferior; 65+ va al índice 8
MIN_SEG = 2 * 3600  # tiempos por debajo de 2 horas se consideran inválidos


def a_segundos(s):
    p = [int(x) for x in str(s).strip().split(":")]
    while len(p) < 3:
        p = [0] + p
    return p[0] * 3600 + p[1] * 60 + p[2]


def grupo_edad(e):
    if not isinstance(e, str):
        return -1
    m = re.match(r"[MF](\d+)", e)
    if not m:
        return -1
    lo = m.group(1)
    return 8 if int(lo) >= 65 else AGES.index(lo)


def main():
    df = pd.read_csv(CSV, encoding="utf-8-sig")
    df = df[~df["lista"].str.contains("SUD|DIS", na=False)]
    df = df[df["anio"].isin(YEARS)].copy()
    df["n"] = df["T. Neto"].map(a_segundos)
    df["o"] = df["T. Oficial"].map(a_segundos)
    df = df[(df["n"] >= MIN_SEG) & (df["o"] >= MIN_SEG)]
    df = df.sort_values(["anio", "n"])

    datos = {
        "y": (df["anio"].map(YEARS.index)).tolist(),
        "s": (df["Sexo"] == "F").astype(int).tolist(),
        "a": df["EdadGrupo"].map(grupo_edad).tolist(),
        "n": df["n"].tolist(),
        "o": df["o"].tolist(),
    }
    if CLIMA.exists():
        clima = pd.read_csv(CLIMA, encoding="utf-8-sig")
        clima = clima[clima["anio"].isin(YEARS)].set_index("anio")
        datos["clima"] = {str(a): fila.round(1).to_dict() for a, fila in clima.iterrows()}

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(datos, separators=(",", ":")))
    print(f"{len(df)} corredores -> {SALIDA.relative_to(RAIZ)}")
    print(df.groupby("anio").size().to_string())


if __name__ == "__main__":
    main()
