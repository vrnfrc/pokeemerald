<script lang="ts">
  import { MOVE_LIST, MOVE_NAME_MAP } from '../lib/movesData';
  import { ivToDisplayLabel, type TrainerPokemon, type TrainerPartyType, getTrainerTypeCapabilities } from '../lib/trainerTypes';

  interface Props {
    pokemon: TrainerPokemon;
    index: number;
    trainerType: TrainerPartyType;
    speciesOptions: { value: string; label: string }[];
    itemOptions: { value: string; label: string }[];
    onChange: (index: number, updates: Partial<TrainerPokemon>) => void;
  }

  let { pokemon, index, trainerType, speciesOptions, itemOptions, onChange }: Props = $props();

  const capabilities = $derived(getTrainerTypeCapabilities(trainerType));

  // Normalize move names: data uses "PSYCHIC", options use "MOVE_PSYCHIC"
  function normalizeMoveValue(move: string): string {
    if (!move || move === 'NONE') return 'NONE';
    return move.startsWith('MOVE_') ? move : `MOVE_${move}`;
  }

  function denormalizeMoveValue(move: string): string {
    if (!move || move === 'NONE') return 'NONE';
    return move.replace(/^MOVE_/, '');
  }

  // Normalize item names: data uses "SITRUS_BERRY", options use "ITEM_SITRUS_BERRY"
  function normalizeItemValue(item: string): string {
    if (!item || item === 'NONE') return 'NONE';
    return item.startsWith('ITEM_') ? item : `ITEM_${item}`;
  }

  function denormalizeItemValue(item: string): string {
    if (!item || item === 'NONE') return 'NONE';
    return item.replace(/^ITEM_/, '');
  }

  const moveOptionsHtml = $derived(
    ['NONE', ...MOVE_LIST]
      .map((m) => `<option value="${m}">${m === 'NONE' ? '-' : formatMoveName(m)}</option>`)
      .join('')
  );

  function formatMoveName(move: string): string {
    return MOVE_NAME_MAP[move] || move.replace(/^MOVE_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatSpeciesName(species: string): string {
    return species.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function handleSpeciesChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    onChange(index, { species: target.value });
  }

  function handleIvChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const iv = parseInt(target.value);
    if (!isNaN(iv) && iv >= 0 && iv <= 255) {
      onChange(index, { iv });
    }
  }

  function handleLevelChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const lvl = parseInt(target.value);
    if (!isNaN(lvl) && lvl >= 1 && lvl <= 100) {
      onChange(index, { lvl });
    }
  }

  function handleItemChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    onChange(index, { heldItem: denormalizeItemValue(target.value) });
  }

  function handleMoveChange(slotIndex: number, event: Event) {
    const target = event.target as HTMLSelectElement;
    const moves = [...(pokemon.moves || ['NONE', 'NONE', 'NONE', 'NONE'])];
    moves[slotIndex] = denormalizeMoveValue(target.value);
    onChange(index, { moves });
  }

  function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = '/api/sprite/unknown';
  }
</script>

<div class="pokemon-card">
  <div class="card-header">
    <img
      src="/api/sprite/{pokemon.species.toLowerCase()}"
      alt={pokemon.species}
      class="pokemon-sprite"
      onerror={handleImageError}
    />
    <div class="card-title">
      <select value={pokemon.species} onchange={handleSpeciesChange} class="species-select">
        {#each speciesOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
  </div>

  <div class="card-body">
    <div class="field-group">
      <label class="field-label">
        Level
        <span class="field-value">{pokemon.lvl}</span>
      </label>
      <input
        type="range"
        min="1"
        max="100"
        value={pokemon.lvl}
        oninput={handleLevelChange}
        class="slider"
      />
    </div>

    <div class="field-group">
      <label class="field-label">
        IV
        <span class="field-value">{pokemon.iv} ({ivToDisplayLabel(pokemon.iv)})</span>
      </label>
      <input
        type="range"
        min="0"
        max="255"
        value={pokemon.iv}
        oninput={handleIvChange}
        class="slider"
      />
    </div>

    {#if capabilities.hasItems}
      <div class="field-group">
        <label class="field-label">Held Item</label>
        <select
          value={normalizeItemValue(pokemon.heldItem || 'NONE')}
          onchange={handleItemChange}
          class="item-select"
        >
          {#each itemOptions as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
    {/if}

    {#if capabilities.hasCustomMoves}
      <div class="field-group">
        <label class="field-label">Moves</label>
        <div class="moves-grid">
          {#each [0, 1, 2, 3] as slotIndex}
            <select
              value={normalizeMoveValue(pokemon.moves?.[slotIndex] || 'NONE')}
              onchange={(e) => handleMoveChange(slotIndex, e)}
              class="move-select"
            >
              {@html moveOptionsHtml}
            </select>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .pokemon-card {
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
  }

  .pokemon-sprite {
    width: 64px;
    height: 64px;
    image-rendering: pixelated;
    background: var(--panel);
    border-radius: 4px;
  }

  .card-title {
    flex: 1;
  }

  .species-select {
    width: 100%;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.5rem;
    color: var(--text);
    font-size: 0.9rem;
    font-weight: 600;
  }

  .species-select:focus {
    outline: none;
    border-color: var(--accent);
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .field-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: var(--muted);
    font-weight: 500;
  }

  .field-value {
    color: var(--text);
    font-weight: 600;
  }

  .slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: var(--panel);
    outline: none;
    -webkit-appearance: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: none;
  }

  .item-select,
  .move-select {
    width: 100%;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.4rem;
    color: var(--text);
    font-size: 0.85rem;
  }

  .item-select:focus,
  .move-select:focus {
    outline: none;
    border-color: var(--accent);
  }

  .moves-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
</style>
