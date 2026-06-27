<script lang="ts">
  import { onMount } from 'svelte';
  import { hoennDexOrder } from '../lib/hoennDex';
  import { speciesData, selectedPokemon } from '../lib/speciesState';

  let query = $state('');

  const species = $derived($speciesData?.species ?? []);
  const selected = $derived($selectedPokemon);

  const filtered = $derived.by(() => {
    const hoenn = species.filter((p: any) => hoennDexOrder.includes(p.label));
    hoenn.sort((a: any, b: any) => hoennDexOrder.indexOf(a.label) - hoennDexOrder.indexOf(b.label));
    const q = query.trim().toLowerCase();
    if (!q) return hoenn;
    return hoenn.filter((p: any) => p.label.toLowerCase().includes(q));
  });

  onMount(async () => {
    if ($speciesData) return;
    try {
      const res = await fetch('/api/species');
      if (res.ok) speciesData.set(await res.json());
    } catch {}
  });

  function select(label: string) {
    selectedPokemon.set(label);
  }
</script>

<div class="pokemon-list">
  <div class="search-wrap">
    <input
      type="text"
      class="search-input"
      placeholder="Search..."
      bind:value={query}
    />
  </div>
  <div class="pokemon-list-items">
    {#if !$speciesData}
      <div class="loading">Loading…</div>
    {:else if filtered.length === 0}
      <div class="empty">No matches</div>
    {:else}
      {#each filtered as pokemon, i (pokemon.label)}
        <button
          type="button"
          class="pokemon-item"
          class:active={selected === pokemon.label}
          onclick={() => select(pokemon.label)}
        >
          <img
            class="pokemon-sprite"
            src="/api/sprite/{pokemon.label.toLowerCase()}"
            alt=""
            loading="lazy"
            onerror={(e) => (e.currentTarget as HTMLImageElement).remove()}
          />
          <span class="dex-num">#{i + 1}</span>
          <span class="pokemon-name">{pokemon.label.replace(/_/g, ' ')}</span>
        </button>
      {/each}
    {/if}
  </div>
</div>

<style>
  .pokemon-list {
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
  .pokemon-list-items {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 1rem 1rem;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
  .pokemon-list-items::-webkit-scrollbar { width: 8px; }
  .pokemon-list-items::-webkit-scrollbar-track { background: transparent; }
  .pokemon-list-items::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
  }
  .pokemon-list-items::-webkit-scrollbar-thumb:hover { background: var(--muted); }
  .loading, .empty { color: var(--muted); padding: 1rem; }

  .pokemon-item {
    width: 100%;
    padding: 0.65rem 1rem;
    cursor: pointer;
    border-radius: 8px;
    margin-bottom: 0.3rem;
    font: inherit;
    font-weight: 500;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: transparent;
    border: none;
    color: var(--text);
    text-align: left;
    transition: background 0.2s, transform 0.2s, color 0.2s;
  }
  .pokemon-item:nth-child(even) { background: rgba(255, 255, 255, 0.025); }
  .pokemon-item:hover { background: var(--panel-2); transform: translateX(4px); }
  .pokemon-item.active { background: var(--accent); color: var(--bg); }
  .pokemon-item.active .dex-num { color: var(--bg); opacity: 0.8; }
  .pokemon-item:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .pokemon-sprite {
    width: 40px;
    height: 40px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    flex-shrink: 0;
    object-fit: cover;
    object-position: top;
  }
  .dex-num { color: var(--muted); font-size: 0.9rem; font-weight: 600; min-width: 36px; }
  .pokemon-name { flex: 1; }
</style>
