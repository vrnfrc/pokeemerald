import { writable } from 'svelte/store';

export interface SpeciesPayload {
  species: any[];
}

export const speciesData = writable<SpeciesPayload | null>(null);
export const selectedPokemon = writable<string | null>(null);
