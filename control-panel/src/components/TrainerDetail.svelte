<script lang="ts">
  import TrainerPokemonCard from './TrainerPokemonCard.svelte';
  import {
    TRAINER_TYPE_OPTIONS,
    trainerPicToFilename,
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

  $effect(() => {
    localTrainers = group.iterations.map((t) => ({ ...t, pokemon: [...t.pokemon] }));
    selectedTabIndex = 0;
  });

  const selectedTrainer = $derived(localTrainers[selectedTabIndex]);
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

  async function handleSave() {
    saving = true;
    statusMessage = '';
    statusKind = null;

    try {
      const trainer = localTrainers[selectedTabIndex];
      const itemsToSave = trainer.items.filter(item => item !== 'NONE');
      await onSave(trainer.name, {
        type: trainer.trainerType,
        pokemon: trainer.pokemon,
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
    localTrainers[selectedTabIndex] = { ...localTrainers[selectedTabIndex], items };
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
        <div class="trainer-items-list">
          {#each itemSlots as item, i}
            <select
              value={item}
              onchange={(e) => handleItemChange(i, (e.target as HTMLSelectElement).value)}
              class="item-select"
            >
              <option value="NONE">None</option>
              {#each itemOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          {/each}
        </div>
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
          <TrainerPokemonCard
            {pokemon}
            index={i}
            trainerType={selectedTrainer.trainerType}
            {speciesOptions}
            {itemOptions}
            onChange={handlePokemonChange}
          />
        {/each}
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
</style>
