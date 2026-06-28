import { writable } from 'svelte/store';

export interface SpeciesPayload {
  species: any[];
}

export interface EvolutionPayload {
  _widths?: any;
  evolutions: { from: string; to: { method: string; param: number; target: string }[] }[];
  methods: { value: string; label: string }[];
  items: { value: string; label: string }[];
}

export const speciesData = writable<SpeciesPayload | null>(null);
export const selectedPokemon = writable<string | null>(null);
export const evolutionData = writable<EvolutionPayload | null>(null);
