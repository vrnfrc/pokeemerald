import fs from 'node:fs';
import path from 'node:path';
import type { TrainerPartiesFile, TrainerParty, TrainerPokemon, TrainerDisplay, TrainerGroup } from './trainerTypes';
import { parseTrainerName, getTrainerTypeCapabilities } from './trainerTypes';
import { getTrainerMetadata, trainerIdToPartyName } from './trainerMetadata';

const POKEEMERALD_ROOT = path.resolve(process.cwd(), '..');
const TRAINER_PARTIES_JSON_PATH = path.join(POKEEMERALD_ROOT, 'src/data/trainer_parties.json');

let cachedParties: TrainerPartiesFile | null = null;

export function loadTrainerParties(): TrainerPartiesFile {
  if (cachedParties) return cachedParties;
  const src = fs.readFileSync(TRAINER_PARTIES_JSON_PATH, 'utf-8');
  cachedParties = JSON.parse(src) as TrainerPartiesFile;
  return cachedParties;
}

export function saveTrainerParties(file: TrainerPartiesFile): void {
  fs.writeFileSync(TRAINER_PARTIES_JSON_PATH, JSON.stringify(file, null, 2) + '\n', 'utf-8');
  cachedParties = file;
}

export function getTrainerParty(partyName: string): TrainerParty | null {
  const parties = loadTrainerParties();
  return parties.parties.find((p) => p.name === partyName) || null;
}

export function updateTrainerParty(partyName: string, updates: Partial<TrainerParty>): TrainerPartiesFile {
  const parties = loadTrainerParties();
  const newParties: TrainerPartiesFile = {
    parties: parties.parties.map((p) => {
      if (p.name !== partyName) return p;
      return { ...p, ...updates };
    }),
  };
  return newParties;
}

export function updatePokemonInParty(
  partyName: string,
  pokemonIndex: number,
  updates: Partial<TrainerPokemon>,
): TrainerPartiesFile {
  const parties = loadTrainerParties();
  const newParties: TrainerPartiesFile = {
    parties: parties.parties.map((p) => {
      if (p.name !== partyName) return p;
      const newPokemon = [...p.pokemon];
      if (pokemonIndex >= 0 && pokemonIndex < newPokemon.length) {
        newPokemon[pokemonIndex] = { ...newPokemon[pokemonIndex], ...updates };
      }
      return { ...p, pokemon: newPokemon };
    }),
  };
  return newParties;
}

export function getTrainerDisplay(partyName: string, isChallenge: boolean = false): TrainerDisplay | null {
  const party = getTrainerParty(partyName);
  if (!party) return null;

  const trainerId = `TRAINER_${partyName.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '').replace(/([0-9]+)$/, '_$1')}`;
  const metadata = getTrainerMetadata(trainerId);

  const { baseName, iteration } = parseTrainerName(partyName);
  const displayName = baseName.replace(/([A-Z])/g, ' $1').trim();

  return {
    name: partyName,
    displayName,
    baseName,
    iteration,
    trainerClass: metadata?.trainerClass || 'TRAINER_CLASS_PKMN_TRAINER_1',
    trainerClassName: metadata?.trainerClassName || 'Trainer',
    trainerPic: metadata?.trainerPic || 'TRAINER_PIC_HIKER',
    trainerType: party.type,
    isChallenge,
    pokemon: party.pokemon,
  };
}

export function getTrainersForIds(trainerIds: string[], challengeIds: string[] = []): TrainerDisplay[] {
  const trainers: TrainerDisplay[] = [];
  const challengeSet = new Set(challengeIds);

  for (const trainerId of trainerIds) {
    const partyName = trainerIdToPartyName(trainerId);
    const trainer = getTrainerDisplay(partyName, challengeSet.has(trainerId));
    if (trainer) {
      trainers.push(trainer);
    }
  }

  return trainers;
}

export function groupTrainersByBaseName(trainers: TrainerDisplay[]): TrainerGroup[] {
  const groups = new Map<string, TrainerGroup>();

  for (const trainer of trainers) {
    if (!groups.has(trainer.baseName)) {
      groups.set(trainer.baseName, {
        baseName: trainer.baseName,
        displayName: trainer.displayName,
        trainerClass: trainer.trainerClass,
        trainerClassName: trainer.trainerClassName,
        trainerPic: trainer.trainerPic,
        iterations: [],
      });
    }
    groups.get(trainer.baseName)!.iterations.push(trainer);
  }

  for (const group of groups.values()) {
    group.iterations.sort((a, b) => {
      if (a.iteration === null) return -1;
      if (b.iteration === null) return 1;
      return a.iteration - b.iteration;
    });
  }

  return Array.from(groups.values());
}

export function clearCache(): void {
  cachedParties = null;
}

export function isRivalTrainer(trainerName: string): boolean {
  const upperName = trainerName.toUpperCase();
  return upperName.startsWith('BRENDAN') || upperName.startsWith('MAY');
}

export function extractStarterFromRival(trainerName: string): 'MUDKIP' | 'TREECKO' | 'TORCHIC' | null {
  const upperName = trainerName.toUpperCase();
  if (upperName.includes('MUDKIP')) return 'MUDKIP';
  if (upperName.includes('TREECKO')) return 'TREECKO';
  if (upperName.includes('TORCHIC')) return 'TORCHIC';
  return null;
}

export function extractRivalName(trainerName: string): 'BRENDAN' | 'MAY' | null {
  const upperName = trainerName.toUpperCase();
  if (upperName.startsWith('BRENDAN')) return 'BRENDAN';
  if (upperName.startsWith('MAY')) return 'MAY';
  return null;
}

export function groupRivalTrainers(trainers: TrainerDisplay[]): TrainerGroup[] {
  const groups = new Map<string, TrainerGroup>();

  for (const trainer of trainers) {
    const rivalName = extractRivalName(trainer.baseName);
    const starter = extractStarterFromRival(trainer.baseName);
    
    if (!rivalName || !starter) continue;

    const groupKey = `${rivalName}_${starter}`;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        baseName: groupKey,
        displayName: `${rivalName.charAt(0) + rivalName.slice(1).toLowerCase()} (${starter.charAt(0) + starter.slice(1).toLowerCase()})`,
        trainerClass: trainer.trainerClass,
        trainerClassName: trainer.trainerClassName,
        trainerPic: trainer.trainerPic,
        iterations: [],
        isRival: true,
        starter,
      });
    }
    
    groups.get(groupKey)!.iterations.push(trainer);
  }

  return Array.from(groups.values());
}

export interface TrainerRepository {
  loadTrainerParties(): TrainerPartiesFile;
  saveTrainerParties(file: TrainerPartiesFile): void;
  getTrainerParty(partyName: string): TrainerParty | null;
  updateTrainerParty(partyName: string, updates: Partial<TrainerParty>): TrainerPartiesFile;
  updatePokemonInParty(partyName: string, pokemonIndex: number, updates: Partial<TrainerPokemon>): TrainerPartiesFile;
}

export function createInMemoryTrainerRepository(initial: TrainerPartiesFile): TrainerRepository {
  let state: TrainerPartiesFile = { parties: initial.parties.map((p) => ({ ...p, pokemon: [...p.pokemon] })) };

  return {
    loadTrainerParties() {
      return state;
    },
    saveTrainerParties(file: TrainerPartiesFile) {
      state = file;
    },
    getTrainerParty(partyName: string) {
      return state.parties.find((p) => p.name === partyName) || null;
    },
    updateTrainerParty(partyName: string, updates: Partial<TrainerParty>) {
      const newParties: TrainerPartiesFile = {
        parties: state.parties.map((p) => {
          if (p.name !== partyName) return p;
          return { ...p, ...updates };
        }),
      };
      return newParties;
    },
    updatePokemonInParty(partyName: string, pokemonIndex: number, updates: Partial<TrainerPokemon>) {
      const newParties: TrainerPartiesFile = {
        parties: state.parties.map((p) => {
          if (p.name !== partyName) return p;
          const newPokemon = [...p.pokemon];
          if (pokemonIndex >= 0 && pokemonIndex < newPokemon.length) {
            newPokemon[pokemonIndex] = { ...newPokemon[pokemonIndex], ...updates };
          }
          return { ...p, pokemon: newPokemon };
        }),
      };
      return newParties;
    },
  };
}
