#!/usr/bin/env python3
"""
One-off conversion: src/data/pokemon/species_info.h -> species_info.json

Parses the hand-written species_info.h and emits a JSON file whose shape
matches the species_info.json.txt Inja template:

    {
      "old_unown_species_info": { baseHP, baseAttack, ..., noFlip },
      "species": [
        { "label": "BULBASAUR", "baseHP": "45", ..., "noFlip": "FALSE" },
        { "label": "OLD_UNOWN_B", "reuse": "OLD_UNOWN_SPECIES_INFO" },
        ...
      ]
    }

Field order matches struct SpeciesInfo in include/pokemon.h.
All values are stored as strings and emitted verbatim by the template,
so enum constants, numbers, and macro calls (PERCENT_FEMALE(12.5),
MON_GENDERLESS, STANDARD_FRIENDSHIP, ...) round-trip unchanged.

Run from the repo root:
    python3 tools/convert_species_info.py
"""

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "src" / "data" / "pokemon" / "species_info.h"
DST = REPO / "src" / "data" / "pokemon" / "species_info.json"

# Field order matches struct SpeciesInfo in include/pokemon.h
SCALAR_FIELDS = [
    "baseHP", "baseAttack", "baseDefense", "baseSpeed", "baseSpAttack", "baseSpDefense",
    "catchRate", "expYield",
    "evYield_HP", "evYield_Attack", "evYield_Defense",
    "evYield_Speed", "evYield_SpAttack", "evYield_SpDefense",
    "itemCommon", "itemRare",
    "genderRatio", "eggCycles", "friendship", "growthRate",
    "safariZoneFleeRate", "bodyColor", "noFlip",
]
ARRAY_FIELDS = ["types", "eggGroups", "abilities"]
ALL_FIELDS = SCALAR_FIELDS + ARRAY_FIELDS


def parse_block_fields(block: str) -> dict:
    """Parse the 25 fields out of a `{ ... }` initializer body."""
    out = {}
    for line in block.split("\n"):
        if "=" not in line or "." not in line:
            continue
        head, _, value = line.partition("=")
        m = re.search(r"\.(\w+)", head)
        if not m:
            continue
        name = m.group(1)
        if name not in ALL_FIELDS or name in out:
            continue
        # Strip surrounding whitespace, any trailing macro-continuation backslash,
        # and the trailing field-comma.
        value = value.strip()
        if value.endswith("\\"):
            value = value[:-1].rstrip()
        value = value.rstrip(",").rstrip()
        if name in ARRAY_FIELDS:
            if not (value.startswith("{") and value.endswith("}")):
                raise ValueError(f"{name}: expected {{...}}, got {value!r}")
            inner = value[1:-1]
            parts = [p.strip() for p in inner.split(",") if p.strip()]
            out[name] = parts
        else:
            out[name] = value
    missing = [f for f in ALL_FIELDS if f not in out]
    if missing:
        raise ValueError(f"Missing fields in block: {missing}")
    return out


def extract_macro_body(src: str, name: str) -> str:
    """Return the text between the outer `{` and matching `}` of `#define NAME ... { ... }`."""
    idx = src.find(f"#define {name}")
    if idx < 0:
        sys.exit(f"error: could not find #define {name}")
    brace_start = src.find("{", idx)
    depth = 0
    for i in range(brace_start, len(src)):
        ch = src[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return src[brace_start + 1 : i]
    sys.exit(f"error: unmatched braces in {name}")


def extract_species(src: str) -> list:
    """Walk through the gSpeciesInfo[] array and extract one entry per SPECIES_X."""
    species = []
    arr_start = src.find("gSpeciesInfo[]")
    if arr_start < 0:
        sys.exit("error: could not find gSpeciesInfo[]")
    # Start scanning after the opening `{` of the array.
    brace = src.find("{", arr_start)
    depth = 0
    i = brace
    while i < len(src):
        ch = src[i]
        if ch == "{":
            depth += 1
            i += 1
            continue
        if ch == "}":
            depth -= 1
            if depth == 0:
                break
            i += 1
            continue
        # Look for `[SPECIES_` at top level (depth == 1).
        if depth == 1 and src.startswith("[SPECIES_", i):
            m = re.match(r"\[SPECIES_([A-Z0-9_]+)\]", src[i:])
            if not m:
                i += 1
                continue
            label = m.group(1)
            # Find the `=` after the label.
            eq = src.find("=", i + m.end())
            if eq < 0:
                i += 1
                continue
            # Skip to the next non-whitespace char to see what follows.
            j = eq + 1
            while j < len(src) and src[j] in " \t\n":
                j += 1
            if src.startswith("{0}", j):
                # [SPECIES_NONE] = {0} -- handled by the template, skip.
                # Advance i past the `{0}` and trailing `,`.
                i = src.find(",", j)
                if i < 0:
                    i = j + 3
                else:
                    i += 1
                continue
            if src.startswith("OLD_UNOWN_SPECIES_INFO", j):
                species.append({"label": label, "reuse": "OLD_UNOWN_SPECIES_INFO"})
                # Skip to the next `,`.
                i = src.find(",", j)
                if i < 0:
                    i = j + len("OLD_UNOWN_SPECIES_INFO")
                else:
                    i += 1
                continue
            # Regular entry: collect from the `{` at position j to the matching `}`.
            if src[j] != "{":
                sys.exit(f"error: unexpected char after [SPECIES_{label}] = : {src[j]!r}")
            entry_start = j + 1
            d = 1
            k = entry_start
            while k < len(src):
                if src[k] == "{":
                    d += 1
                elif src[k] == "}":
                    d -= 1
                    if d == 0:
                        break
                k += 1
            block = src[entry_start:k]
            entry = parse_block_fields(block)
            entry["label"] = label
            species.append(entry)
            # Skip past the closing `}` and trailing `,` if any.
            k += 1
            while k < len(src) and src[k] in " \t\n":
                k += 1
            if k < len(src) and src[k] == ",":
                k += 1
            i = k
            continue
        i += 1
    return species


def main():
    src = SRC.read_text()
    old_unown = parse_block_fields(extract_macro_body(src, "OLD_UNOWN_SPECIES_INFO"))
    species = extract_species(src)

    # Sanity: at least SPECIES_NONE (handled in template) and 25 OLD_UNOWNs should be
    # absent from the list.
    reuse_count = sum(1 for s in species if "reuse" in s)
    full_count = sum(1 for s in species if "reuse" not in s)
    print(f"Parsed {full_count} full entries + {reuse_count} OLD_UNOWN reuses "
          f"= {len(species)} total (expected 411: 412 - SPECIES_NONE).")

    out = {
        "_widths": {
            # Per-field column-alignment widths for `padRight` in the template.
            # The value is the length of the field name itself (without the leading
            # dot); the template renders `.` + padRight(name, w) + " = value," so
            # the `=` lands at the same column as the original hand-written file.
            "baseHP": 13, "baseAttack": 13, "baseDefense": 13,
            "baseSpeed": 13, "baseSpAttack": 13, "baseSpDefense": 13,
            "types": 5,
            "catchRate": 9, "expYield": 8,
            "evYield_HP": 17, "evYield_Attack": 17, "evYield_Defense": 17,
            "evYield_Speed": 17, "evYield_SpAttack": 17, "evYield_SpDefense": 17,
            "itemCommon": 10, "itemRare": 10,
            "genderRatio": 11, "eggCycles": 9,
            "friendship": 10, "growthRate": 10,
            "eggGroups": 9, "abilities": 9,
            "safariZoneFleeRate": 17, "bodyColor": 9, "noFlip": 6,
        },
        "old_unown_species_info": old_unown,
        "species": species,
    }
    DST.write_text(json.dumps(out, indent=2) + "\n")
    print(f"Wrote {DST.relative_to(REPO)}.")


if __name__ == "__main__":
    main()
