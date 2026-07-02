<script lang="ts">
  import { onMount } from 'svelte';

  let query = $state('');
  let parts = $state<any[]>([]);
  let loading = $state(true);

  interface TrainerPart {
    part: number;
    maps: string[];
    mapsWithChallenges: string[];
    difficulty: number;
    hasChallenges: boolean;
    unlocks?: string[];
    unlockedBy?: string[];
    done: boolean;
  }

  async function loadItinerary() {
    try {
      const response = await fetch('/api/itinerary');
      const data = await response.json();
      parts = data.parts;
    } catch (error) {
      console.error('Failed to load itinerary:', error);
      parts = [];
    } finally {
      loading = false;
    }
  }

  async function toggleDone(partIndex: number, event: Event) {
    event.stopPropagation();
    const part = parts.find(p => p.part === partIndex);
    if (!part) return;
    
    const newDone = !part.done;
    
    try {
      const response = await fetch('/api/itinerary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partIndex: partIndex - 1, done: newDone })
      });
      
      if (response.ok) {
        part.done = newDone;
      }
    } catch (error) {
      console.error('Failed to update done status:', error);
    }
  }

  onMount(() => {
    loadItinerary();
  });

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter((p: TrainerPart) =>
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
    {#if loading}
      <div class="empty">Loading...</div>
    {:else if filtered.length === 0}
      <div class="empty">No matches</div>
    {:else}
      {#each filtered as part (part.part)}
        <button
          type="button"
          class="trainer-part-item"
          onclick={() => window.dispatchEvent(new CustomEvent('selectPart', { detail: part.part }))}
        >
          <div class="part-checkbox-wrap">
            <input
              type="checkbox"
              class="part-checkbox"
              checked={part.done}
              onclick={(e) => toggleDone(part.part, e)}
            />
          </div>
          <div class="part-content">
            <div class="part-header">
              <span class="part-number">Part {part.part}</span>
              <span class="part-difficulty">{part.difficulty}</span>
            </div>
            {#if part.unlockedBy}
              <span class="part-unlocked-by">Unlocked by: {part.unlockedBy.join(', ')}</span>
            {/if}
            <div class="part-maps">
              {#each part.maps as map}
                <span class="map-name" class:has-challenge={part.mapsWithChallenges.includes(map)}>{map}</span>
              {/each}
            </div>
          </div>
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
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
    background: transparent;
    border: none;
    color: var(--text);
    text-align: left;
    transition: background 0.2s, transform 0.2s;
  }
  .trainer-part-item:nth-child(even) { background: rgba(255, 255, 255, 0.025); }
  .trainer-part-item:hover { background: var(--panel-2); transform: translateX(4px); }
  .trainer-part-item:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .part-checkbox-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .part-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--accent);
  }

  .part-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

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
  .map-name.has-challenge {
    color: var(--danger);
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
