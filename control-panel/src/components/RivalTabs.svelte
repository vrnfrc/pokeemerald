<script lang="ts">
  import TrainerDetail from './TrainerDetail.svelte';
  import type { TrainerGroup, TrainerPartyType, TrainerPokemon } from '../lib/trainerTypes';

  interface Props {
    rivalGroups: TrainerGroup[];
    speciesOptions: { value: string; label: string }[];
    itemOptions: { value: string; label: string }[];
    onSave: (trainerName: string, updates: { type?: TrainerPartyType; pokemon?: TrainerPokemon[] }) => Promise<void>;
  }

  let { rivalGroups, speciesOptions, itemOptions, onSave }: Props = $props();

  let selectedTabIndex = $state(0);

  const RIVAL_ORDER = [
    'BRENDAN_MUDKIP',
    'BRENDAN_TREECKO',
    'BRENDAN_TORCHIC',
    'MAY_MUDKIP',
    'MAY_TREECKO',
    'MAY_TORCHIC',
  ];

  const orderedGroups = $derived(
    RIVAL_ORDER.map(key => rivalGroups.find(g => g.baseName === key)).filter(g => g !== undefined) as TrainerGroup[]
  );

  function formatStarterName(starter: string): string {
    return starter.charAt(0) + starter.slice(1).toLowerCase();
  }

  function formatRivalName(baseName: string): string {
    const rival = baseName.split('_')[0];
    return rival.charAt(0) + rival.slice(1).toLowerCase();
  }
</script>

<div class="rival-tabs-container">
  <div class="rival-tabs">
    {#each orderedGroups as group, i}
      <button
        class="rival-tab"
        class:active={i === selectedTabIndex}
        onclick={() => (selectedTabIndex = i)}
      >
        {formatRivalName(group.baseName)} ({formatStarterName(group.starter!)})
      </button>
    {/each}
  </div>

  {#if orderedGroups[selectedTabIndex]}
    <TrainerDetail
      group={orderedGroups[selectedTabIndex]}
      {speciesOptions}
      {itemOptions}
      {onSave}
    />
  {/if}
</div>

<style>
  .rival-tabs-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .rival-tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--border);
  }

  .rival-tab {
    padding: 0.6rem 1.2rem;
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

  .rival-tab:hover {
    background: var(--panel-2);
    color: var(--text);
  }

  .rival-tab.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
</style>
