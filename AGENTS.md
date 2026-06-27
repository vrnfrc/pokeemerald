# AGENTS.md — pokeemerald

> **Sandbox note:** the agent (opencode) runs in a sandbox where every command has to be executed from the outside. If a tool fails (e.g. wrong-arch binaries like `tools/jsonproc/jsonproc`, missing host compilers like `g++`, or any build step), do not try to fix it in-sandbox — ask the user to re-run the command on their machine. Don't waste time retrying.

Decompilation of Pokémon Emerald. The build target is a Game Boy Advance ROM (`pokeemerald.gba`) assembled from C, ARM/Thumb assembly, and JSON-driven data. There is no unit test suite, linter, or formatter — verification is byte-equivalence with the original ROM.

## Build modes

The `Makefile` (root) supports two toolchains, switched via `MODERN`:

- **Default (`MODERN=0`)** — uses `agbcc` (a vintage ARM C compiler) so the resulting ROM is bit-for-bit comparable to the original. Requires `agbcc` to be built and installed into the repo first (see INSTALL.md). `CFLAGS` includes `-Werror`.
- **Modern (`MODERN=1` / `make modern`)** — uses system `arm-none-eabi-gcc`. Produces `pokeemerald_modern.gba`. Debug info is *off* by default; pass `DINFO=1` to enable. Required toolchain: `arm-none-eabi-gcc` + `binutils` (CI installs `gcc-arm-none-eabi` + `binutils-arm-none-eabi` + `libpng-dev`).

The `compare` and `modern` make targets are flags; they fall through to `make all`.

## Core commands (run from repo root)

- `make` — build the default ROM (`pokeemerald.gba`).
- `make -j$(nproc)` — parallel build; `nproc` is missing on macOS, use `sysctl -n hw.ncpu`.
- `make compare` — build the default ROM and verify its SHA-1 against `rom.sha1`. This is the canonical "is my change correct?" check. CI runs this with `COMPARE=1`.
- `make modern` — build with the modern toolchain.
- `make modern DINFO=1` — modern build with debug symbols.
- `make syms` — emit `pokeemerald.sym` (also produced for the modern build as `pokeemerald_modern.sym`).
- `make tools` — build only the host tools in `tools/` (auto-invoked by `make`).
- `make generated` — regenerate auto-generated headers/data (auto-invoked by `make`).
- `make clean` — full clean, including tools and generated files. `make tidy` keeps tools; `make tidynonmodern` / `make tidymodern` clean one variant.
- `KEEP_TEMPS=1 make …` — keep the preprocessed `.i` and assembly `.s` intermediates (helpful when debugging `preproc`/`cc1` issues).
- `NODEP=1 make …` — skip header-dependency scanning (use for the no-scan targets like `clean`).
- `TOOLCHAIN=/path make …` — point at an alternate devkitARM-style toolchain (must contain `bin/`).
- `./asmdiff.sh <hex-addr> <length>` — diff `baserom.gba` vs `pokeemerald.gba` at a memory address. Only works with the default build.

On Windows, if you switched terminals since the last build, run `make clean-tools` before any subsequent `make` (host tools are not portable across msys2/WSL/Cygwin).

## Repository layout

- `Makefile` + `make_tools.mk` + `graphics_file_rules.mk` + `map_data_rules.mk` + `json_data_rules.mk` + `audio_rules.mk` — the whole build system. Read these before guessing.
- `src/` — C source. `.s` files in `src/` are preprocessed through `tools/preproc` + `cpp` + `tools/preproc` again, then assembled. Excludes `*.inc.c` (intentionally not compiled).
- `asm/` — handwritten ARM/Thumb assembly (only `.s` in the top level). `asm/macros/` holds `.inc` macro libraries.
- `data/` — `.s` data files, JSON-driven map/layout data, MIDI→asm rules, tileset/layout assets.
- `include/` + `include/constants/` + `include/gba/` — headers. `include/gba/` mirrors the GBA SDK headers from `libagbsyscall`.
- `libagbsyscall/` — AGB syscall shim library, built as part of the link.
- `tools/` — host C/C++ tools built by `make tools`:
  - `gbagfx` — PNG/PAL → `.4bpp`/`.8bpp`/`.gbapal`/`.lz`/`.rl`
  - `preproc` — charmap-aware C/asm preprocessor
  - `scaninc` — header dependency scanner
  - `mapjson` — emits map headers/events/connections from `data/maps/*/map.json` and `data/maps/map_groups.json`
  - `jsonproc` — Inja templates to generate C headers/constants from JSON (e.g. `wild_encounters.json` → `src/data/wild_encounters.h` and `include/constants/wild_encounter.h`)
  - `mid2agb` + `sound/songs/midi/midi.cfg` — MIDI → asm (each entry in `midi.cfg` becomes a make rule; a `.mid` without a `midi.cfg` entry will fail to build with a warning)
  - `wav2agb`, `gbafix`, `ramscrgen`, `rsfont`, `bin2c` — other support tools.
- `ld_script.ld` (default) / `ld_script_modern.ld` (modern) — linker scripts. `ld_script.ld` also depends on `sym_bss.txt`/`sym_common.txt`/`sym_ewram.txt` (processed by `ramscrgen`).
- `charmap.txt` — text-encoding translation table for `tools/preproc`.
- `rom.sha1` — expected SHA-1 of `pokeemerald.gba`, used by `make compare`.
- `.github/workflows/build.yml` — CI: runs `make -j all syms` with `COMPARE=1`, then `MODERN=1 COMPARE=0 make -j all`. On pushes to `master`, also commits the `*.sym` files to the `symbols` branch via the `pret/pokeemerald-symbols` repo.
- `.gitattributes` — marks `*.h` as C and `*.inc` as Assembly for GitHub linguist, and pins `*.pal`/`*.ps1` to CRLF, everything else LF.
- `docs/legacy_WSL1_INSTALL.md` — old installer for repos predating the agbcc integration.

## Auto-generated files (do not hand-edit)

These are produced by the build and listed in `.gitignore` (or by `AUTO_GEN_TARGETS`):

- `src/data/wild_encounters.h`, `include/constants/wild_encounter.h` — from `src/data/wild_encounters.json`.
- `src/data/region_map/region_map_entries.h`, `include/constants/region_map_sections.h` — from JSON.
- `src/data/heal_locations.h`, `include/constants/heal_locations.h` — from JSON.
- `data/maps/headers.inc`, `groups.inc`, `connections.inc`, `events.inc`, plus per-map `header.inc`/`events.inc`/`connections.inc` — from `data/maps/map_groups.json` and `data/maps/*/map.json` via `mapjson`.
- `data/layouts/layouts.inc`, `data/layouts/layouts_table.inc`, `include/constants/layouts.h` — from `data/layouts/layouts.json`.
- `include/constants/map_groups.h`, `include/constants/map_event_ids.h` — from `mapjson`.
- `sound/songs/midi/*.s` — generated by `mid2agb` from `.mid` sources listed in `midi.cfg`.
- `build/sym_*.ld` — generated by `ramscrgen` from `sym_*.txt`.
- `*.1bpp`, `*.4bpp`, `*.8bpp`, `*.gbapal`, `*.lz`, `*.rl`, `*.latfont`, `*.hwjpnfont`, `*.fwjpnfont` — from `gbagfx` over PNG/PAL sources.
- `tools/agbcc/` — the agbcc compiler binaries, installed by `pret/agbcc`'s `install.sh`.

When you change a `.json` or a `.mid` source, re-run `make` (or `make generated`) — the build will pick it up via the `AUTO_GEN_TARGETS` rules.

## Style and workflow notes

- C source is compiled with `-Werror` in the default build; warnings are failures.
- The default build pins `-DMODERN=0`; code uses `#if MODERN == 0` / `#if MODERN == 1` guards to bridge both toolchains (see the `MODERN` macro in `Makefile`).
- Map data is data-driven: edit `data/maps/<MapName>/map.json` rather than touching the generated `.inc` files. New maps also need an entry in `data/maps/map_groups.json` and a layout in `data/layouts/`.
- Music is data-driven via `sound/songs/midi/midi.cfg`; each line is `<midi-name> <mid2agb options>`. Adding a song without a `midi.cfg` entry is a build error.
- `.pal` files are CRLF (per `.gitattributes`); keep them that way.
- This is a `pret` community project — PR template (`.github/pull_request_template.md`) requires a Discord username. The `master` branch is the integration branch, and the CI pushes `*.sym` artifacts to a sibling `symbols` branch/repo on every push.

## Debugging tips

- Build fails in `preproc`/`cc1`? Set `KEEP_TEMPS=1` and inspect `build/emerald/src/<file>.i` and `build/emerald/src/<file>.s`.
- Linker says a section is too large? Check `pokeemerald.map` (in repo root after a default build) — it's the same output the linker writes with `-Map`.
- Comparing a single function to the original ROM: `./asmdiff.sh <hex_addr> <bytes>` (default build only, requires `baserom.gba`).
