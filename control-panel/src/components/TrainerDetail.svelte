<script lang="ts">
  import TrainerPokemonCard from './TrainerPokemonCard.svelte';
  import {
    TRAINER_TYPE_OPTIONS,
    trainerPicToFilename,
    getTrainerTypeCapabilities,
    type TrainerGroup,
    type TrainerDisplay,
    type TrainerPartyType,
    type TrainerPokemon,
  } from '../lib/trainerTypes';

  interface Props {
    group: TrainerGroup;
    speciesOptions: { value: string; label: string }[];
    itemOptions: { value: string; label: string }[];
    onSave: (trainerName: string, updates: { type?: TrainerPartyType; pokemon?: TrainerPokemon[]; items?: string[] }) => Promise<void>;
  }

  let { group, speciesOptions, itemOptions, onSave }: Props = $props();

  let selectedTabIndex = $state(0);
  let saving = $state(false);
  let statusMessage = $state('');
  let statusKind = $state<'success' | 'error' | null>(null);

  let localTrainers = $state<TrainerDisplay[]>([]);
  let showItems = $state<boolean[]>([]);
  let draggedIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);

  $effect(() => {
    localTrainers = group.iterations.map((t) => ({ ...t, pokemon: [...t.pokemon] }));
    showItems = group.iterations.map((t) => t.items.some(item => item !== 'NONE'));
    selectedTabIndex = 0;
  });

  const selectedTrainer = $derived(localTrainers[selectedTabIndex]);
  const hasItems = $derived(selectedTrainer?.items.length > 0);
  const isShowingItems = $derived(showItems[selectedTabIndex]);
  const itemSlots = $derived([0, 1, 2, 3].map(i => selectedTrainer?.items[i] || 'NONE'));

  function handleTypeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newType = target.value as TrainerPartyType;
    localTrainers[selectedTabIndex] = {
      ...localTrainers[selectedTabIndex],
      trainerType: newType,
    };
  }

  function handlePokemonChange(index: number, updates: Partial<TrainerPokemon>) {
    const pokemon = [...localTrainers[selectedTabIndex].pokemon];
    pokemon[index] = { ...pokemon[index], ...updates };
    localTrainers[selectedTabIndex] = {
      ...localTrainers[selectedTabIndex],
      pokemon,
    };
  }

  function handleAddPokemon() {
    const currentPokemon = localTrainers[selectedTabIndex].pokemon;
    if (currentPokemon.length >= 6) return;
    
    const lastPokemon = currentPokemon[currentPokemon.length - 1];
    const newPokemon = { ...lastPokemon };
    
    localTrainers[selectedTabIndex] = {
      ...localTrainers[selectedTabIndex],
      pokemon: [...currentPokemon, newPokemon],
    };
  }

  function handleRemovePokemon(index: number) {
    const currentPokemon = localTrainers[selectedTabIndex].pokemon;
    if (currentPokemon.length <= 1) return;
    
    const newPokemon = currentPokemon.filter((_, i) => i !== index);
    localTrainers[selectedTabIndex] = {
      ...localTrainers[selectedTabIndex],
      pokemon: newPokemon,
    };
  }

  function handleDragStart(index: number, event: DragEvent) {
    draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  function handleDragOver(index: number, event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    dragOverIndex = index;
  }

  function handleDragLeave() {
    dragOverIndex = null;
  }

  function handleDrop(index: number, event: DragEvent) {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      draggedIndex = null;
      dragOverIndex = null;
      return;
    }

    const currentPokemon = [...localTrainers[selectedTabIndex].pokemon];
    const [draggedPokemon] = currentPokemon.splice(draggedIndex, 1);
    currentPokemon.splice(index, 0, draggedPokemon);

    localTrainers[selectedTabIndex] = {
      ...localTrainers[selectedTabIndex],
      pokemon: currentPokemon,
    };

    draggedIndex = null;
    dragOverIndex = null;
  }

  function handleDragEnd() {
    draggedIndex = null;
    dragOverIndex = null;
  }

  async function handleSave() {
    saving = true;
    statusMessage = '';
    statusKind = null;

    try {
      const trainer = localTrainers[selectedTabIndex];
      const caps = getTrainerTypeCapabilities(trainer.trainerType);
      
      const hasRealItems = trainer.items.some(item => item !== 'NONE');
      const itemsToSave = caps.hasItems
        ? (hasRealItems ? trainer.items.map(item => item === 'NONE' ? 'ITEM_NONE' : item) : [])
        : [];
      
      const pokemonToSave = trainer.pokemon.map(p => {
        const cleaned: any = { ...p };
        if (!caps.hasItems) {
          delete cleaned.heldItem;
        }
        if (!caps.hasCustomMoves) {
          delete cleaned.moves;
        }
        return cleaned;
      });
      
      await onSave(trainer.name, {
        type: trainer.trainerType,
        pokemon: pokemonToSave,
        items: itemsToSave,
      });
      statusMessage = 'Saved successfully';
      statusKind = 'success';
    } catch (err) {
      statusMessage = err instanceof Error ? err.message : 'Failed to save';
      statusKind = 'error';
    } finally {
      saving = false;
      setTimeout(() => {
        statusMessage = '';
        statusKind = null;
      }, 3000);
    }
  }

  function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  function handleItemChange(index: number, value: string) {
    const items = [...localTrainers[selectedTabIndex].items];
    items[index] = value;
    
    // If all items are "None", clear the array
    const allNone = items.every(item => item === 'NONE');
    if (allNone) {
      localTrainers[selectedTabIndex] = { ...localTrainers[selectedTabIndex], items: [] };
      showItems[selectedTabIndex] = false;
    } else {
      localTrainers[selectedTabIndex] = { ...localTrainers[selectedTabIndex], items };
    }
  }

  function handleAddItems() {
    localTrainers[selectedTabIndex] = {
      ...localTrainers[selectedTabIndex],
      items: ['NONE', 'NONE', 'NONE', 'NONE'],
    };
    showItems[selectedTabIndex] = true;
  }

  function handleRemoveAllItems() {
    localTrainers[selectedTabIndex] = { ...localTrainers[selectedTabIndex], items: [] };
    showItems[selectedTabIndex] = false;
  }

  function formatTrainerName(name: string): string {
    return name.replace(/([A-Z])/g, ' $1').trim();
  }
</script>

<div class="trainer-detail">
  <div class="trainer-header">
    <img
      src="/api/trainer-sprite/{trainerPicToFilename(group.trainerPic)}"
      alt={group.trainerClassName}
      class="trainer-sprite"
      onerror={handleImageError}
    />
    <div class="trainer-info">
      <h2 class="trainer-name">{group.displayName}</h2>
      <p class="trainer-class">{group.trainerClassName}</p>
    </div>
  </div>

  {#if localTrainers.length > 1}
    <div class="tabs">
      {#each localTrainers as trainer, i}
        <button
          class="tab"
          class:active={i === selectedTabIndex}
          onclick={() => (selectedTabIndex = i)}
        >
          {#if trainer.iteration === null || trainer.iteration === 1}
            First match
          {:else}
            Rematch {trainer.iteration}
          {/if}
        </button>
      {/each}
    </div>
  {/if}

  {#if selectedTrainer}
    <div class="trainer-config">
      <div class="config-section">
        <div class="field-label">Items</div>
        {#if isShowingItems}
          <button class="remove-items-button" onclick={handleRemoveAllItems}>
            Remove all items
          </button>
          <div class="trainer-items-list">
            {#each itemSlots as item, i}
              <select
                value={item}
                onchange={(e) => handleItemChange(i, (e.target as HTMLSelectElement).value)}
                class="item-select"
              >
                {#each itemOptions as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            {/each}
          </div>
        {:else}
          <button class="add-items-button" onclick={handleAddItems}>
            Add items
          </button>
        {/if}
      </div>

      <div class="config-section">
        <div class="field-label">Type</div>
        <select
          value={selectedTrainer.trainerType}
          onchange={handleTypeChange}
          class="type-select"
        >
          {#each TRAINER_TYPE_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="party-section">
      <h3 class="party-title">Party</h3>
      <div class="pokemon-grid">
        {#each selectedTrainer.pokemon as pokemon, i}
          <div
            class="pokemon-card-wrapper"
            class:dragging={draggedIndex === i}
            class:drag-over={dragOverIndex === i}
          >
            <TrainerPokemonCard
              {pokemon}
              index={i}
              trainerType={selectedTrainer.trainerType}
              {speciesOptions}
              {itemOptions}
              onChange={handlePokemonChange}
              onRemove={handleRemovePokemon}
              canRemove={selectedTrainer.pokemon.length > 1}
              onDragStart={(e) => handleDragStart(i, e)}
              onDragOver={(e) => handleDragOver(i, e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(i, e)}
              onDragEnd={handleDragEnd}
            />
          </div>
        {/each}
        {#if selectedTrainer.pokemon.length < 6}
          <button class="add-pokemon-card" onclick={handleAddPokemon}>
            <span class="add-pokemon-text">Add a Pokémon</span>
          </button>
        {/if}
      </div>
    </div>

    <div class="save-section">
      {#if statusMessage}
        <div class="status" class:success={statusKind === 'success'} class:error={statusKind === 'error'}>
          {statusMessage}
        </div>
      {/if}
      <button class="save-button" onclick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  {/if}
</div>

<style>
  .trainer-detail {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .trainer-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1rem 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1rem;
  }

  .trainer-sprite {
    width: 100px;
    height: 100px;
    image-rendering: pixelated;
    background: var(--panel);
    border-radius: 8px;
    padding: 8px;
    box-sizing: border-box;
  }

  .trainer-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .trainer-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text);
    margin: 0;
  }

  .trainer-class {
    font-size: 1rem;
    color: var(--muted);
    margin: 0;
  }

  .trainer-config {
    display: flex;
    gap: 1rem;
    padding: 1rem 0;
    border-bottom: 1px solid var(--border);
  }

  .config-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .party-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .party-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
    margin: 0;
  }

  .trainer-items-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .item-select {
    flex: 1;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.4rem 2rem 0.4rem 0.4rem;
    color: var(--text);
    font-size: 0.85rem;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239aa3b2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 0.4rem center;
    background-size: 14px;
  }

  .item-select:focus {
    outline: none;
    border-color: var(--accent);
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.5rem;
  }

  .tab {
    padding: 0.5rem 1rem;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 4px 4px 0 0;
    color: var(--muted);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
    position: relative;
  }

  .tab:hover {
    background: var(--panel-2);
    color: var(--text);
  }

  .tab.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  .field-label {
    font-size: 0.9rem;
    color: var(--muted);
    font-weight: 500;
  }

  .type-select {
    width: 280px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.5rem 2rem 0.5rem 0.5rem;
    color: var(--text);
    font-size: 0.9rem;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239aa3b2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 0.4rem center;
    background-size: 14px;
  }

  .type-select:focus {
    outline: none;
    border-color: var(--accent);
  }

  .pokemon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1rem;
  }

  .pokemon-card-wrapper {
    transition: transform 0.2s, opacity 0.2s;
  }

  .pokemon-card-wrapper.dragging {
    opacity: 0.4;
    transform: scale(0.95);
  }

  .pokemon-card-wrapper.drag-over {
    transform: scale(1.02);
    outline: 2px dashed var(--accent);
    outline-offset: 4px;
    border-radius: 8px;
  }

  .save-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .status {
    padding: 0.75rem;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .status.success {
    background: rgba(158, 206, 106, 0.1);
    color: var(--accent-2);
    border: 1px solid var(--accent-2);
  }

  .status.error {
    background: rgba(255, 85, 85, 0.1);
    color: var(--danger);
    border: 1px solid var(--danger);
  }

  .save-button {
    padding: 0.75rem 1.5rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    align-self: flex-start;
  }

  .save-button:hover:not(:disabled) {
    background: var(--accent-2);
  }

  .save-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .add-items-button,
  .remove-items-button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    align-self: flex-start;
  }

  .add-items-button {
    background: var(--panel);
    color: var(--text);
  }

  .add-items-button:hover {
    background: var(--panel-2);
    border-color: var(--accent);
  }

  .remove-items-button {
    background: rgba(255, 85, 85, 0.1);
    color: var(--danger);
    border-color: var(--danger);
    margin-bottom: 0.5rem;
  }

  .remove-items-button:hover {
    background: rgba(255, 85, 85, 0.2);
  }

  .add-pokemon-card {
    background: var(--panel-2);
    border: 2px dashed var(--border);
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 200px;
  }

  .add-pokemon-card:hover {
    border-color: var(--accent);
    background: var(--panel);
  }

  .add-pokemon-text {
    color: var(--muted);
    font-size: 1rem;
    font-weight: 500;
  }
</style>
