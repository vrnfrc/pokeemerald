export interface SpeciesEntry {
  label: string;
  baseHP: string;
  baseAttack: string;
  baseDefense: string;
  baseSpeed: string;
  baseSpAttack: string;
  baseSpDefense: string;
  types: [string, string];
  catchRate: string;
  expYield: string;
  evYield_HP: string;
  evYield_Attack: string;
  evYield_Defense: string;
  evYield_Speed: string;
  evYield_SpAttack: string;
  evYield_SpDefense: string;
  itemCommon: string;
  itemRare: string;
  genderRatio: string;
  eggCycles: string;
  friendship: string;
  growthRate: string;
  eggGroups: [string, string];
  abilities: [string, string];
  safariZoneFleeRate: string;
  bodyColor: string;
  noFlip: string;
  reuse?: string;
}

export interface SpeciesFile {
  _widths: Record<string, number>;
  old_unown_species_info: SpeciesEntry;
  species: SpeciesEntry[];
}

export interface LevelupMove {
  level: number;
  level_padded: string;
  move: string;
}

export interface LearnsetsViewEntry {
  levelup: LevelupMove[];
  tmhm: string[];
}

export type LearnsetsView = Record<string, LearnsetsViewEntry>;

export interface LearnsetsRawEntry {
  name?: string;
  species: string;
  moves: LevelupMove[] | string[];
}

export interface LearnsetsRawFile {
  learnsets: LearnsetsRawEntry[];
}

export interface EvolutionTarget {
  method: string;
  param: number;
  target: string;
}

export interface EvolutionEntry {
  from: string;
  to: EvolutionTarget[];
}

export interface EvolutionFile {
  _widths: { label: number; [key: string]: number };
  evolutions: EvolutionEntry[];
}

export interface MethodOption {
  value: string;
  label: string;
  order: number;
}

export interface ItemOption {
  value: string;
  label: string;
  number: number;
}

export type ParamType = 'level' | 'item' | 'beauty' | 'none';
