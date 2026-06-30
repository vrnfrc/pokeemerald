<script lang="ts">
  import TrainerDetail from './TrainerDetail.svelte';
  import type { TrainerGroup, TrainerPartyType, TrainerPokemon } from '../lib/trainerTypes';

  interface SpeciesOption {
    value: string;
    label: string;
  }

  interface ItemOption {
    value: string;
    label: string;
  }

  let selectedPartIndex = $state<number | null>(null);
  let trainerGroups = $state<TrainerGroup[]>([]);
  let speciesOptions = $state<SpeciesOption[]>([]);
  let itemOptions = $state<ItemOption[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  $effect(() => {
    loadSpeciesOptions();
    loadItemOptions();

    const params = new URLSearchParams(window.location.search);
    const partParam = params.get('part');
    if (partParam) {
      const partIndex = parseInt(partParam);
      if (!isNaN(partIndex)) {
        selectPart(partIndex);
      }
    }

    window.addEventListener('selectPart', handleSelectPartEvent as EventListener);
    return () => {
      window.removeEventListener('selectPart', handleSelectPartEvent as EventListener);
    };
  });

  function handleSelectPartEvent(event: CustomEvent<number>) {
    selectPart(event.detail);
  }

  async function loadSpeciesOptions() {
    try {
      const res = await fetch('/api/species');
      const data = await res.json();
      speciesOptions = data.species.map((s: any) => ({
        value: s.label,
        label: s.label.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
      }));
    } catch (err) {
      console.error('Failed to load species options:', err);
    }
  }

  async function loadItemOptions() {
    try {
      const res = await fetch('/api/trainers/items');
      const data = await res.json();
      itemOptions = data.items;
    } catch (err) {
      console.error('Failed to load item options:', err);
    }
  }

  function selectPart(partIndex: number) {
    selectedPartIndex = partIndex;
    const url = new URL(window.location.href);
    url.searchParams.set('part', partIndex.toString());
    window.history.pushState({}, '', url.toString());
    loadTrainers(partIndex);
  }

  async function loadTrainers(partIndex: number) {
    loading = true;
    error = null;
    try {
      const res = await fetch(`/api/trainers?part=${partIndex}`);
      if (!res.ok) throw new Error('Failed to load trainers');
      const data = await res.json();
      trainerGroups = data.groups;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load trainers';
      trainerGroups = [];
    } finally {
      loading = false;
    }
  }

  async function handleSave(trainerName: string, updates: { type?: TrainerPartyType; pokemon?: TrainerPokemon[] }) {
    const res = await fetch(`/api/trainers/${trainerName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save');
    }
    if (selectedPartIndex !== null) {
      await loadTrainers(selectedPartIndex);
    }
  }
</script>

<div class="trainer-content">
  {#if selectedPartIndex === null}
    <div class="empty-state">
      <p>Select a part to view trainers</p>
    </div>
  {:else if loading}
    <div class="loading-state">
      <p>Loading trainers...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p>{error}</p>
    </div>
  {:else if trainerGroups.length === 0}
    <div class="empty-state">
      <p>No trainers found for this part</p>
    </div>
  {:else}
    <div class="trainers-list">
      {#each trainerGroups as group}
        <TrainerDetail
          {group}
          {speciesOptions}
          {itemOptions}
          onSave={handleSave}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .trainer-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .empty-state,
  .loading-state,
  .error-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: var(--muted);
    font-size: 1.1rem;
  }

  .error-state {
    color: var(--danger);
  }

  .trainers-list {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
</style>
