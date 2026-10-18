#!/usr/bin/env python3
"""Genera `lib/location-names-offline.ts` con nombres de localización en
español y japonés para las regiones que PokeAPI no cubre.

Fuente: los textos de localizaciones de los juegos publicados por el proyecto
PKHeX (https://github.com/kwsch/PKHeX, licencia MIT) en
`PKHeX.Core/Resources/text/locations/<gen>/text_<juego>_<offset>_<idioma>.txt`.
Se cruzan con los CSV de PokeAPI (`location_game_indices`, `location_names`)
por índice de juego y, como respaldo, por nombre en inglés.

Uso:
    python3 scripts/generate-location-names.py [--cache .cache/location-names]

El script cachea las descargas en `--cache`; si ya existen, no vuelve a
descargarlas (útil sin red: prellena la caché y vuelve a ejecutar).

Nota: tras regenerar, ejecuta `pnpm format` (el fichero generado se formatea
con prettier para cumplir el estilo del repo).
"""

from __future__ import annotations

import argparse
import collections
import csv
import json
import os
import re
import sys
import time
import urllib.request

POKEAPI_CSV = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv"
PKHEX_TEXT = (
    "https://raw.githubusercontent.com/kwsch/PKHeX/master/PKHeX.Core/Resources/text/locations"
)

# Juego de PKHeX -> offsets de la lista (el número es la base del índice).
GAME_OFFSETS = {
    "gsc": [0],
    "rsefrlg": [0],
    "hgss": [0, 2000, 3000],
    "bw2": [0, 30000, 40000, 60000],
    "xy": [0, 30000, 40000, 60000],
    "gg": [0, 40000],
    "sm": [0, 30000, 40000, 60000],
    "swsh": [0, 30000, 40000, 60000],
    "la": [0, 30000, 40000, 60000],
    "bdsp": [0, 30000, 40000, 60000],
    "sv": [0, 30000, 40000, 60000],
}
GAME_DIRS = {
    "gsc": "gen2",
    "rsefrlg": "gen3",
    "hgss": "gen4",
    "bw2": "gen5",
    "xy": "gen6",
    "gg": "gen7",
    "sm": "gen7",
    "swsh": "gen8",
    "la": "gen8a",
    "bdsp": "gen8b",
    "sv": "gen9",
}

# Región de PokeAPI -> fuentes de PKHeX por orden de preferencia.
# (juego, generación de PokeAPI en la que se indexa; None = solo por nombre)
REGION_SOURCES = {
    "kanto": [("gg", "7"), ("rsefrlg", "3"), ("hgss", "4")],
    "johto": [("gsc", "2"), ("hgss", "4")],
    "hoenn": [("xy", "6"), ("rsefrlg", "3")],
    "sinnoh": [("bdsp", None), ("hgss", "4")],
    "unova": [("bw2", "5")],
    "kalos": [("xy", "6")],
    "alola": [("sm", "7")],
    "galar": [("swsh", "8")],
    "hisui": [("la", None)],
    "paldea": [("sv", "9")],
}

LANGS = ("en", "es", "ja")
OUT = "lib/location-names-offline.ts"


def download(url: str, path: str) -> str:
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return open(path, encoding="utf-8").read()
    txt = ""
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "competidex-gen"})
            with urllib.request.urlopen(req, timeout=30) as res:
                txt = res.read().decode("utf-8")
            break
        except Exception as err:  # noqa: BLE001
            print(f"  ! {url}: {err}", file=sys.stderr)
            time.sleep(0.6 * (attempt + 1))
    if txt:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, "w", encoding="utf-8").write(txt)
    return txt


def normalize(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"\([^)]*\)", "", s)
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    # PKHeX llama a las rutas marinas "Route N" (sin "Sea") y omite "Base"
    s = re.sub(r"\bsea\b\s*", "", s).strip()
    s = re.sub(r"\bbase\b\s*", "", s).strip()
    for prefix in ("kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar", "hisui", "paldea", "sevii"):
        if s.startswith(prefix + " "):
            s = s[len(prefix) + 1 :]
    return s


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", default=".cache/location-names")
    args = parser.parse_args()
    cache = args.cache

    def csv_rows(name: str) -> list[dict]:
        path = os.path.join(cache, name)
        download(f"{POKEAPI_CSV}/{name}", path)
        return list(csv.DictReader(open(path, encoding="utf-8")))

    locations = {r["id"]: r for r in csv_rows("locations.csv")}
    regions = {r["id"]: r["identifier"] for r in csv_rows("regions.csv")}
    game_index: dict[str, dict[str, int]] = collections.defaultdict(dict)
    for r in csv_rows("location_game_indices.csv"):
        game_index[r["location_id"]][r["generation_id"]] = int(r["game_index"])
    english: dict[str, str] = {}
    for r in csv_rows("location_names.csv"):
        if r["local_language_id"] == "9":
            english[r["location_id"]] = r["name"]

    def pkhex(game: str, offset: int, lang: str) -> list[str]:
        fname = f"pkhex/{game}_{offset}_{lang}.txt"
        path = os.path.join(cache, fname)
        url = f"{PKHEX_TEXT}/{GAME_DIRS[game]}/text_{game}_{offset:05d}_{lang}.txt"
        return download(url, path).split("\n")

    # Mapas por región: por índice (juego, offset, índice) y por nombre.
    index_maps: dict[str, dict] = {}
    name_maps: dict[str, dict] = {}
    for region, sources in REGION_SOURCES.items():
        index_map: dict = {}
        name_map: dict = {}
        for game, _gen in sources:
            for offset in GAME_OFFSETS[game]:
                lines = {lang: pkhex(game, offset, lang) for lang in LANGS}
                for i, en_name in enumerate(lines["en"]):
                    en_name = en_name.strip()
                    if not en_name:
                        continue
                    es = lines["es"][i].strip() if i < len(lines["es"]) else ""
                    ja = lines["ja"][i].strip() if i < len(lines["ja"]) else ""
                    index_map.setdefault((game, offset, i), (en_name, es, ja))
                    key = normalize(en_name)
                    if key and (es or ja) and key not in name_map:
                        name_map[key] = (es, ja)
        index_maps[region] = index_map
        name_maps[region] = name_map

    result: dict[str, dict[str, str]] = {}
    for lid, loc in locations.items():
        region = regions.get(loc.get("region_id", ""))
        if region not in REGION_SOURCES:
            continue
        slug = loc["identifier"]
        en_name = english.get(lid)
        found = None
        # 1) Por índice de juego, validando el nombre en inglés.
        for game, gen in REGION_SOURCES[region]:
            if not gen or lid not in game_index or gen not in game_index[lid]:
                continue
            idx = game_index[lid][gen]
            offset = max([o for o in GAME_OFFSETS[game] if o <= idx], default=None)
            if offset is None:
                continue
            candidate = index_maps[region].get((game, offset, idx - offset))
            if candidate and en_name and normalize(candidate[0]) == normalize(en_name):
                found = (candidate[1], candidate[2])
                break
        # 2) Por nombre en inglés (cubre regiones sin game_index, p. ej. Hisui).
        if not found and en_name:
            found = name_maps[region].get(normalize(en_name))
        # 3) Por slug (cubre localizaciones sin nombre en inglés en PokeAPI).
        if not found:
            found = name_maps[region].get(normalize(slug))
        if found and (found[0] or found[1]):
            result[slug] = {"es": found[0], "ja": found[1]}

    write_ts(result)

    # Informe de cobertura.
    print(f"\nLocalizaciones con es/ja offline: {len(result)}/{len(locations)}")
    for region in REGION_SOURCES:
        total = sum(1 for l in locations.values() if regions.get(l.get("region_id", "")) == region)
        covered = sum(
            1 for l in locations.values()
            if regions.get(l.get("region_id", "")) == region
            and l["identifier"] in result
            and result[l["identifier"]]["es"]
        )
        print(f"  {region:8} {covered:4}/{total}")
    return 0


def write_ts(result: dict[str, dict[str, str]]) -> None:
    header = '''/**
 * Nombres de localización en español y japonés, offline.
 *
 * PokeAPI no cubre `es`/`ja` en todas las regiones: Kanto, Johto, Sinnoh,
 * Galar, Hisui y Paldea no tienen esos idiomas upstream (y Unova solo `ja-hrkt`).
 * Este mapa se genera a partir de los textos de los juegos publicados por el
 * proyecto PKHeX (MIT) y se usa como último recurso antes del slug humanizado.
 *
 * Clave: identificador de localización de PokeAPI (`location.name`).
 * Fichero autogenerado por `scripts/generate-location-names.py`; no editar a mano.
 */

export interface OfflineLocationName {
  es?: string;
  ja?: string;
}

export const LOCATION_NAMES_OFFLINE: Record<string, OfflineLocationName> = {
'''
    lines = []
    for slug in sorted(result):
        entry = result[slug]
        parts = []
        if entry.get("es"):
            parts.append(f"es: {json.dumps(entry['es'], ensure_ascii=False)}")
        if entry.get("ja"):
            parts.append(f"ja: {json.dumps(entry['ja'], ensure_ascii=False)}")
        if parts:
            lines.append(f"  {json.dumps(slug)}: {{ {', '.join(parts)} }},")
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(header + "\n".join(lines) + "\n};\n")


if __name__ == "__main__":
    raise SystemExit(main())
