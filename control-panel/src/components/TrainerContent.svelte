<script lang="ts">
  import TrainerDetail from './TrainerDetail.svelte';
  import RivalTabs from './RivalTabs.svelte';
  import { hoennDexOrder } from '../lib/hoennDex';
  import type { TrainerGroup, TrainerPartyType, TrainerPokemon } from '../lib/trainerTypes';

  interface SpeciesOption {
    value: string;
    label: string;
  }

  interface ItemOption {
    value: string;
    label: string;
  }

  interface MapTrainers {
    mapName: string;
    trainers: TrainerGroup[];
    challenges: TrainerGroup[];
  }

  let selectedPartIndex = $state<number | null>(null);
  let mapsWithTrainers = $state<MapTrainers[]>([]);
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
        selectedPartIndex = partIndex;
        loadTrainers(partIndex - 1);
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
      const hoennSet = new Set(hoennDexOrder);
      speciesOptions = data.species
        .filter((s: any) => hoennSet.has(s.label))
        .sort((a: any, b: any) => hoennDexOrder.indexOf(a.label) - hoennDexOrder.indexOf(b.label))
        .map((s: any) => ({
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
    loadTrainers(partIndex - 1);
  }

  async function loadTrainers(partIndex: number) {
    loading = true;
    error = null;
    try {
      const res = await fetch(`/api/trainers?part=${partIndex}`);
      if (!res.ok) throw new Error('Failed to load trainers');
      const data = await res.json();
      mapsWithTrainers = data.maps;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load trainers';
      mapsWithTrainers = [];
    } finally {
      loading = false;
    }
  }

  async function handleSave(trainerName: string, updates: { type?: TrainerPartyType; pokemon?: TrainerPokemon[]; items?: string[] }) {
    const res = await fetch(`/api/trainers/${trainerName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const contentType = res.headers.get('content-type') || '';
      const message = contentType.includes('application/json')
        ? (await res.json()).error
        : await res.text();
      throw new Error(message || 'Failed to save');
    }
  }

  function formatMapName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/(\d+)/g, ' $1')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
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
  {:else if mapsWithTrainers.length === 0}
    <div class="empty-state">
      <p>No trainers found for this part</p>
    </div>
  {:else}
    {#each mapsWithTrainers as mapData}
      <div class="form-section">
        <h3>{formatMapName(mapData.mapName)}</h3>
        
        {#if mapData.trainers.some(g => g.isRival)}
          <RivalTabs
            rivalGroups={mapData.trainers.filter(g => g.isRival)}
            {speciesOptions}
            {itemOptions}
            onSave={handleSave}
          />
        {/if}
        
        {#if mapData.trainers.filter(g => !g.isRival).length > 0}
          <div class="trainers-list">
            {#each mapData.trainers.filter(g => !g.isRival) as group}
              <TrainerDetail
                {group}
                {speciesOptions}
                {itemOptions}
                onSave={handleSave}
              />
            {/each}
          </div>
        {/if}
        
        {#if mapData.challenges.length > 0}
          <div class="challenges-section">
            <h4>Challenges</h4>
            
            {#if mapData.challenges.some(g => g.isRival)}
              <RivalTabs
                rivalGroups={mapData.challenges.filter(g => g.isRival)}
                {speciesOptions}
                {itemOptions}
                onSave={handleSave}
              />
            {/if}
            
            {#if mapData.challenges.filter(g => !g.isRival).length > 0}
              <div class="challenges-list">
                {#each mapData.challenges.filter(g => !g.isRival) as group}
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
        {/if}
      </div>
    {/each}
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

  .form-section {
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 2.5rem;
  }

  .form-section h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .trainers-list {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin-top: 1.5rem;
  }

  .challenges-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 2px solid var(--danger);
  }

  .challenges-section h4 {
    margin: 0 0 1.5rem 0;
    font-size: 0.9rem;
    color: var(--danger);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  .challenges-list {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .challenges-section :global(.trainer-detail) {
    background: rgba(255, 85, 85, 0.05);
    border: 1px solid rgba(255, 85, 85, 0.2);
    border-radius: 12px;
    padding: 2rem;
  }
</style>
