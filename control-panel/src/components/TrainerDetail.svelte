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
    onSave: (trainerName: string, updates: { type?: TrainerPartyType; pokemon?: TrainerPokemon[] }) => Promise<void>;
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
      await onSave(trainer.name, {
        type: trainer.trainerType,
        pokemon: trainer.pokemon,
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
    img.src = '/api/trainer-sprite/hiker';
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
      {#if group.iterations.some((t) => t.isChallenge)}
        <span class="challenge-badge">Challenge</span>
      {/if}
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
          {#if trainer.isChallenge}
            <span class="tab-badge">*</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}

  {#if selectedTrainer}
    <div class="trainer-type-section">
      <label class="field-label">Trainer Type</label>
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
    width: 96px;
    height: 96px;
    image-rendering: pixelated;
    background: var(--panel);
    border-radius: 8px;
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

  .challenge-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: var(--danger);
    color: white;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-top: 0.5rem;
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

  .tab-badge {
    color: var(--danger);
    font-weight: 700;
  }

  .tab.active .tab-badge {
    color: white;
  }

  .trainer-type-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .field-label {
    font-size: 0.9rem;
    color: var(--muted);
    font-weight: 500;
  }

  .type-select {
    width: 100%;
    max-width: 300px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.5rem;
    color: var(--text);
    font-size: 0.9rem;
  }

  .type-select:focus {
    outline: none;
    border-color: var(--accent);
  }

  .pokemon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
