export type TrainerPartyType =
  | 'TrainerMonNoItemDefaultMoves'
  | 'TrainerMonNoItemCustomMoves'
  | 'TrainerMonItemDefaultMoves'
  | 'TrainerMonItemCustomMoves';

export const TRAINER_TYPE_LABELS: Record<TrainerPartyType, string> = {
  'TrainerMonNoItemDefaultMoves': 'No Item, Default Moves',
  'TrainerMonNoItemCustomMoves': 'No Item, Custom Moves',
  'TrainerMonItemDefaultMoves': 'Item, Default Moves',
  'TrainerMonItemCustomMoves': 'Item, Custom Moves',
};

export const TRAINER_TYPE_OPTIONS: { value: TrainerPartyType; label: string }[] = [
  { value: 'TrainerMonNoItemDefaultMoves', label: 'No Item, Default Moves' },
  { value: 'TrainerMonNoItemCustomMoves', label: 'No Item, Custom Moves' },
  { value: 'TrainerMonItemDefaultMoves', label: 'Item, Default Moves' },
  { value: 'TrainerMonItemCustomMoves', label: 'Item, Custom Moves' },
];

export interface TrainerPokemon {
  iv: number;
  lvl: number;
  species: string;
  heldItem?: string;
  moves?: string[];
}

export interface TrainerParty {
  name: string;
  type: TrainerPartyType;
  pokemon: TrainerPokemon[];
}

export interface TrainerPartiesFile {
  parties: TrainerParty[];
}

export interface TrainerMetadata {
  trainerClass: string;
  trainerClassName: string;
  trainerPic: string;
  trainerName: string;
  items: string[];
  doubleBattle: boolean;
  aiFlags: number;
}

export interface TrainerDisplay {
  name: string;
  displayName: string;
  baseName: string;
  iteration: number | null;
  trainerClass: string;
  trainerClassName: string;
  trainerPic: string;
  trainerType: TrainerPartyType;
  isChallenge: boolean;
  pokemon: TrainerPokemon[];
}

export interface TrainerGroup {
  baseName: string;
  displayName: string;
  trainerClass: string;
  trainerClassName: string;
  trainerPic: string;
  iterations: TrainerDisplay[];
  isRival?: boolean;
  starter?: 'MUDKIP' | 'TREECKO' | 'TORCHIC';
}

export interface ItineraryTrainerEntry {
  id: string;
  party: string;
}

export interface ItineraryMap {
  name: string;
  trainers: ItineraryTrainerEntry[];
  challenges: ItineraryTrainerEntry[];
  rematches: ItineraryTrainerEntry[];
}

export interface ItineraryPart {
  maps: ItineraryMap[];
  difficulty: number;
  unlocks?: string[];
  unlockedBy?: string | string[];
}

export interface ItineraryFile {
  parts: ItineraryPart[];
}

export function getTrainerTypeCapabilities(type: TrainerPartyType): {
  hasItems: boolean;
  hasCustomMoves: boolean;
} {
  return {
    hasItems: type.includes('Item'),
    hasCustomMoves: type.includes('CustomMoves'),
  };
}

export function parseTrainerName(name: string): { baseName: string; iteration: number | null } {
  const match = name.match(/^(.+?)(\d+)$/);
  if (match) {
    return { baseName: match[1], iteration: parseInt(match[2]) };
  }
  return { baseName: name, iteration: null };
}

export function trainerIdToPartyName(trainerId: string): string {
  return trainerId.replace(/^TRAINER_/, '').toLowerCase().replace(/_([0-9]+)$/, '$1').replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function ivToDisplayLabel(iv: number): string {
  if (iv === 0) return 'Default';
  if (iv === 255) return 'Perfect';
  if (iv < 64) return 'Low';
  if (iv < 128) return 'Medium';
  if (iv < 192) return 'High';
  return 'Very High';
}

export function trainerPicToFilename(pic: string): string {
  return pic.replace('TRAINER_PIC_', '').toLowerCase();
}

export function validateIV(iv: number): boolean {
  return Number.isInteger(iv) && iv >= 0 && iv <= 255;
}

export function validateLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= 100;
}
