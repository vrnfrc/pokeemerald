<script lang="ts">
  let query = $state('');

  interface ItineraryEntry {
    maps: string[];
    difficulty: number;
    challenges?: string[];
    unlocks?: string[];
    unlockedBy?: string | string[];
  }

  interface TrainerPart {
    part: number;
    maps: string[];
    difficulty: number;
    challenges?: string[];
    unlocks?: string[];
    unlockedBy?: string[];
  }

  const itinerary: ItineraryEntry[] = [
    { maps: ["Route101", "Route102"], difficulty: 1, challenges: ["May/Brendan"] },
    { maps: ["Route103"], difficulty: 2 },
    { maps: ["Route104"], difficulty: 3 },
    { maps: ["PetalburgWoods"], difficulty: 4 },
    { maps: ["Route116", "RusturfTunnel"], difficulty: 5 },
    { maps: ["RustboroCity"], difficulty: 7, challenges: ["Roxanne", "May/Brendan"], unlocks: ["HM01 Cut"] },
    { maps: ["PetalburgWoods"], difficulty: 8, unlockedBy: "HM01 Cut" },
    { maps: ["GranityCave_1F", "GranityCave_B1F", "GranityCave_B2F", "GranityCave_StevensRoom"], difficulty: 9 },
    { maps: ["DewfordTown"], difficulty: 10, challenges: ["Brawly"], unlocks: ["HM05 Flash"] },
    { maps: ["Route109", "SlateportCity_OceanicMuseum_1F", "SlateportCity_OceanicMuseum_2F"], difficulty: 12 },
    { maps: ["Route110", "Route103"], difficulty: 13, challenges: ["May/Brendan"] },
    { maps: ["MauvilleCity", "Route117", "Route118", "RusturfTunnel"], difficulty: 15, challenges: ["Wally"] },
    { maps: ["MauvilleCity"], difficulty: 17, challenges: ["Wattson"], unlocks: ["HM06 Rock Smash"] },
    { maps: ["Route110", "Route111", "Route112", "FieryPath"], difficulty: 19 },
    { maps: ["Route114"], difficulty: 20 },
    { maps: ["MeteorFalls_1F_1R"], difficulty: 20 },
    { maps: ["Route115"], difficulty: 21 },
    { maps: ["MtChimney"], difficulty: 23, challenges: ["Maxie"] },
    { maps: ["JaggedPass"], difficulty: 24 },
    { maps: ["Route115"], difficulty: 21 },
    { maps: ["LavaridgeTown"], difficulty: 23, challenges: ["Flannery"], unlocks: ["HM4 Strength", "Go-Googles"] },
    { maps: ["Route111"], difficulty: 24, unlockedBy: "Go-Googles" },
    { maps: ["PetalburgCity"], difficulty: 25, challenges: ["Norman"], unlocks: ["Surf"] },
    { maps: ["PetalburgCity", "Route102", "Route103", "Route110", "NewMauville_Entrance", "NewMauville_Inside", "Route117", "Route111", "Route114"], difficulty: 26, unlockedBy: "HM03 Surf" },
    { maps: ["Route114", "Route104", "Route105", "Route106"], difficulty: 27, unlockedBy: "HM03 Surf" },
    { maps: ["Route107", "Route108", "AbandonedShip_Corridors_1F", "AbandonedShip_Rooms_1F", "AbandonedShip_Rooms2_1F", "AbandonedShip_Corridors_B1F", "AbandonedShip_Rooms_B1F", "AbandonedShip_Rooms2_B1F", "Route109", "SlateportCity"], difficulty: 28, unlockedBy: "HM03 Surf" },
    { maps: ["Route118", "Route123"], difficulty: 29 },
    { maps: ["Route119"], difficulty: 30 },
    { maps: ["Route119_WeatherInstitute_1F", "Route119_WeatherInstitute_2F"], difficulty: 31 },
    { maps: ["Route119", "FortreeCity"], difficulty: 33, challenges: ["May/Brendan", "Winona"] },
    { maps: ["Route120", "ScorchedSlab"], difficulty: 34 },
    { maps: ["Route121", "Route122", "Route123"], difficulty: 35 },
    { maps: ["MtPyre_1F", "MtPyre_2F", "MtPyre_3F", "MtPyre_4F", "MtPyre_5F", "MtPyre_6F", "MtPyre_Exterior"], difficulty: 36 },
    { maps: ["MtPyre_Summit"], difficulty: 38 },
    { maps: ["MagmaHideout_1F", "MagmaHideout_2F_1R", "MagmaHideout_2F_2R", "MagmaHideout_3F_1R", "MagmaHideout_3F_2R", "MagmaHideout_4F"], difficulty: 39 },
    { maps: ["MagmaHideout_4F"], difficulty: 41, challenges: ["Maxie"] },
    { maps: ["LilycoveCity"], difficulty: 42, challenges: ["May/Brendan"] },
    { maps: ["AquaHideout_1F", "AquaHideout_B1F"], difficulty: 43, challenges: ["Matt"] },
    { maps: ["Route124", "Route125"], difficulty: 44 },
    { maps: ["Route124", "Route125"], difficulty: 44 },
    { maps: ["ShoalCave_LowTideEntranceRoom", "ShoalCave_LowTideInnerRoom", "ShoalCave_LowTideStairsRoom", "ShoalCave_LowTideIceRoom", "ShoalCave_HighTide_EntranceRoom", "ShoalCave_HighTideInnerRoom"], difficulty: 45 },
    { maps: ["MossdeepCity"], difficulty: 47, challenges: ["Tate and Liza"], unlocks: ["HM08 Dive"] },
    { maps: ["MossdeepCity_SpaceCenter_1F", "MossdeepCity_SpaceCenter_2F"], difficulty: 49, challenges: ["Maxie"] },
    { maps: ["Underwater_Route124"], difficulty: 49, unlockedBy: ["HM08 Dive"] },
    { maps: ["Route127", "Underwater_Route127", "Route128", "Underwater_Route128", "Underwater_Route126"], difficulty: 50 },
    { maps: ["SeafloorCavern_Entrance", "SeafloorCavern_Room1", "SeafloorCavern_Room2", "SeafloorCavern_Room3", "SeafloorCavern_Room4", "SeafloorCavern_Room5", "SeafloorCavern_Room6", "SeafloorCavern_Room7", "SeafloorCavern_Room8", "SeafloorCavern_Room9"], difficulty: 51 },
    { maps: ["SootopolisCity", "CaveOfOrigin_Entrance", "CaveOfOrigin_1F", "CaveOfOrigin_B1F"], difficulty: 52 },
    { maps: ["Route_129", "Route130", "Route131"], difficulty: 53 },
    { maps: ["Route132", "Route133", "Route134"], difficulty: 54 },
    { maps: ["SkyPillar_1F", "SkyPillar_2F", "SkyPillar_3F", "SkyPillar_4F", "SkyPillar_5F"], difficulty: 55 },
    { maps: ["SootopolisCity"], difficulty: 57, challenges: ["Juan"], unlocks: ["HM07 Waterfall"] },
    { maps: ["MeteorFalls_1F_2R", "MeteorFalls_B1F_1R", "MeteorFalls_B1F_2R", "EverGrandeCity"], difficulty: 58, unlockedBy: ["HM07 Waterfall"] },
    { maps: ["VictoryRoad_1F", "VictoryRoad_B1F", "VictoryRoad_B2F"], difficulty: 60, challenges: ["Wally"] },
    { maps: ["EverGrandeCity_SidneysRoom"], difficulty: 61, challenges: ["Sidney"] },
    { maps: ["EverGrandeCity_PhoebesRoom"], difficulty: 63, challenges: ["Phoebe"] },
    { maps: ["EverGrandeCity_GlaciasRoom"], difficulty: 65, challenges: ["Glacia"] },
    { maps: ["EverGrandeCity_DrakesRoom"], difficulty: 67, challenges: ["Drake"] },
    { maps: ["EverGrandeCity_ChampionsRoom"], difficulty: 70, challenges: ["Wallace"] },
  ];

  const parts: TrainerPart[] = itinerary.map((entry, i) => {
    const part: TrainerPart = {
      part: i + 1,
      maps: entry.maps,
      difficulty: entry.difficulty,
    };
    if (entry.challenges) part.challenges = entry.challenges;
    if (entry.unlocks) part.unlocks = entry.unlocks;
    if (entry.unlockedBy) {
      part.unlockedBy = Array.isArray(entry.unlockedBy) ? entry.unlockedBy : [entry.unlockedBy];
    }
    return part;
  });

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter((p) =>
      p.maps.some((m) => m.toLowerCase().includes(q))
    );
  });
</script>

<div class="trainer-parties-list">
  <div class="search-wrap">
    <input
      type="text"
      class="search-input"
      placeholder="Search maps..."
      bind:value={query}
    />
  </div>
  <div class="trainer-parties-list-items">
    {#if filtered.length === 0}
      <div class="empty">No matches</div>
    {:else}
      {#each filtered as part (part.part)}
        <button
          type="button"
          class="trainer-part-item"
        >
          <div class="part-header">
            <span class="part-number">Part {part.part}</span>
            <span class="part-difficulty">{part.difficulty}</span>
          </div>
          {#if part.unlockedBy}
            <span class="part-unlocked-by">Unlocked by: {part.unlockedBy.join(', ')}</span>
          {/if}
          <div class="part-maps">
            {#each part.maps as map}
              <span class="map-name">{map}</span>
            {/each}
          </div>
          {#if part.challenges}
            <span class="part-challenges">Challenges: {part.challenges.join(', ')}</span>
          {/if}
        </button>
        {#if part.unlocks}
          <div class="unlock-divider"></div>
          <div class="unlock-row">
            Unlocks: {part.unlocks.join(', ')}
          </div>
          <div class="unlock-divider"></div>
        {/if}
      {/each}
    {/if}
  </div>
</div>

<style>
  .trainer-parties-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  .search-wrap { padding: 1rem 1.2rem 0.5rem; }
  .search-input {
    width: 100%;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.6rem 0.8rem;
    color: var(--text);
  }
  .search-input:focus { outline: none; border-color: var(--accent); }
  .trainer-parties-list-items {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 1rem 1rem;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
  .trainer-parties-list-items::-webkit-scrollbar { width: 8px; }
  .trainer-parties-list-items::-webkit-scrollbar-track { background: transparent; }
  .trainer-parties-list-items::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
  }
  .trainer-parties-list-items::-webkit-scrollbar-thumb:hover { background: var(--muted); }
  .empty { color: var(--muted); padding: 1rem; }

  .trainer-part-item {
    width: 100%;
    padding: 0.65rem 1rem;
    cursor: pointer;
    border-radius: 8px;
    margin-bottom: 0.3rem;
    font: inherit;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: transparent;
    border: none;
    color: var(--text);
    text-align: left;
    transition: background 0.2s, transform 0.2s;
  }
  .trainer-part-item:nth-child(even) { background: rgba(255, 255, 255, 0.025); }
  .trainer-part-item:hover { background: var(--panel-2); transform: translateX(4px); }
  .trainer-part-item:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .part-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .part-number {
    font-weight: 600;
    font-size: 1rem;
    color: var(--accent);
  }
  .part-difficulty {
    font-weight: 600;
    font-size: 1rem;
    color: var(--accent);
  }
  .part-unlocked-by {
    font-size: 0.78rem;
    color: var(--accent-2);
    font-weight: 500;
  }
  .part-maps {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .map-name {
    font-size: 0.82rem;
    color: var(--muted);
    line-height: 1.3;
  }
  .part-challenges {
    font-size: 0.78rem;
    color: var(--danger);
    font-weight: 500;
    margin-top: 0.2rem;
  }

  .unlock-divider {
    height: 1px;
    background: var(--border);
    margin: 0.3rem 0;
  }
  .unlock-row {
    padding: 1.2rem 1rem;
    font-size: 0.9rem;
    color: var(--accent-2);
    font-weight: 600;
    background: rgba(158, 206, 106, 0.05);
    text-align: center;
    letter-spacing: 0.3px;
  }
</style>
