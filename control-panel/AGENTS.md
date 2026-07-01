# AGENTS.md — Control Panel

The control panel is an **Astro-based web UI** for editing Pokémon and trainer data in the pokeemerald project. It provides a visual interface for modifying trainer parties, organizing the game itinerary, and managing progression.

## Running the control panel

```bash
cd control-panel
npm install
npm run dev
```

The dev server runs at `http://localhost:4321` by default.

## Directory structure

```
control-panel/
├── src/
│   ├── components/         # Svelte UI components
│   │   ├── TrainerDetail.svelte      # Single trainer group with iteration tabs
│   │   ├── TrainerContent.svelte     # Main trainer view orchestrator
│   │   ├── TrainerPartiesList.svelte # Sidebar list of itinerary parts
│   │   ├── RivalTabs.svelte          # Tab switcher for rival trainers
│   │   ├── PokemonEditor.svelte      # Pokémon stats editor
│   │   └── ...
│   ├── lib/                # Core logic and data loading
│   │   ├── trainerTypes.ts           # Type definitions + parseTrainerName()
│   │   ├── trainerRepository.ts      # Trainer CRUD + grouping logic
│   │   ├── trainerMetadata.ts        # Parses trainers.h for metadata
│   │   ├── itineraryTrainerLoader.ts # Loads docs/itinerary.jsonc
│   │   └── ...
│   ├── pages/
│   │   ├── api/
│   │   │   ├── trainers/
│   │   │   │   ├── index.ts          # GET /api/trainers?part=N — main trainer endpoint
│   │   │   │   └── [name].ts         # GET/PUT single trainer party
│   │   │   ├── itinerary.ts          # GET /api/itinerary — sidebar summary
│   │   │   └── ...
│   │   ├── index.astro               # Pokémon editor page
│   │   └── trainers.astro            # Trainer editor page
│   └── layouts/
│       └── Layout.astro              # Base HTML layout
├── package.json
└── astro.config.mjs
```

## Itinerary system

The file `docs/itinerary.jsonc` defines a progression itinerary for the game. It is consumed by the control panel to organize trainers by map and difficulty.

### Structure

```jsonc
[
  {
    "maps": [
      {
        "name": "Route102",
        "trainers": [
          { "id": "TRAINER_CALVIN_1", "party": "sParty_Calvin1" }
        ],
        "challenges": [],
        "rematches": [
          { "id": "TRAINER_CALVIN_2", "party": "sParty_Calvin2" }
        ]
      }
    ],
    "difficulty": 2,
    "unlocks": ["HM01 Cut"],
    "unlockedBy": "Badge 1"
  }
]
```

Each **part** has:
- `maps[]` — array of maps in this part
- `difficulty` — numeric difficulty rating
- `unlocks` (optional) — items/HMs unlocked after completing this part
- `unlockedBy` (optional) — requirement to access this part

Each **map** has three trainer arrays:
- `trainers[]` — regular trainers (first encounter)
- `challenges[]` — gym leaders, rivals, story battles
- `rematches[]` — rematch battles

### Rematch detection algorithm

The `rematches` array is the **source of truth** for determining which trainers have rematches.

**Algorithm:**

1. If `rematches` array is **empty** → NO trainer has rematches. All `_N` suffixes are distinguishing numbers (e.g., `TRAINER_GRUNT_MUSEUM_1` and `TRAINER_GRUNT_MUSEUM_2` are distinct grunts).

2. If `rematches` array is **not empty** → extract base names from `rematches` (e.g., `TRAINER_CALVIN_2` → base name "Calvin"). Search for those base names with `_1` in `trainers` and `challenges` arrays.

**Example — grunt corner case:**

```jsonc
{
  "trainers": [
    { "id": "TRAINER_GRUNT_MUSEUM_1", "party": "sParty_GruntMuseum1" },
    { "id": "TRAINER_GRUNT_MUSEUM_2", "party": "sParty_GruntMuseum2" }
  ],
  "challenges": [],
  "rematches": []  // empty = no rematches
}
```

Both grunts are displayed as **separate trainers** (no tabs), because "GruntMuseum" does not appear in `rematches`.

**Example — real rematch:**

```jsonc
{
  "trainers": [
    { "id": "TRAINER_CALVIN_1", "party": "sParty_Calvin1" }
  ],
  "challenges": [],
  "rematches": [
    { "id": "TRAINER_CALVIN_2", "party": "sParty_Calvin2" },
    { "id": "TRAINER_CALVIN_3", "party": "sParty_Calvin3" }
  ]
}
```

Calvin is displayed with **tabs**: "First match" (Calvin1), "Rematch 2" (Calvin2), "Rematch 3" (Calvin3).

### Tab labels

When a trainer has rematches (i.e., their base name appears in `rematches`):
- `iteration === null` or `iteration === 1` → **"First match"**
- `iteration >= 2` → **"Rematch {iteration}"**

Tabs only appear when there are multiple iterations (rematches exist).

## Data flow

```
docs/itinerary.jsonc
        ↓
itineraryTrainerLoader.ts (loads + caches)
        ↓
pages/api/trainers/index.ts (rematch detection + grouping)
        ↓
TrainerContent.svelte (renders maps)
        ↓
TrainerDetail.svelte (renders trainer with tabs)
```

## Related documentation

- `docs/data.md` — overview of JSON-driven data in pokeemerald
- `docs/itinerary.jsonc` — the itinerary file itself
