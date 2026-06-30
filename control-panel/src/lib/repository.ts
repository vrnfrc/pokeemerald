import type {
  EvolutionFile,
  EvolutionEntry,
  EvolutionTarget,
  ItemOption,
  LevelUpLearnsetsRawFile,
  LevelUpLearnsetsRawEntry,
  LearnsetsView,
  LearnsetsViewEntry,
  LevelupMove,
  MethodOption,
  ParamType,
  SpeciesEntry,
  SpeciesFile,
  TmhmLearnsetsRawFile,
} from './types';
import { TM_LIST, HM_LIST } from './movesData';

export interface RepoFs {
  readJson(path: string): unknown;
  writeJson(path: string, data: unknown): void;
}

export interface RepoPaths {
  species: string;
  evolution: string;
  levelup: string;
  tmhm: string;
}

export interface Repository {
  loadSpecies(): SpeciesFile;
  saveSpecies(file: SpeciesFile): void;
  loadLearnsets(): LearnsetsView;
  saveLearnsets(view: LearnsetsView): void;
  loadEvolution(): EvolutionFile;
  saveEvolution(file: EvolutionFile): void;
}

export interface InitialRepoState {
  species?: SpeciesFile;
  evolution?: EvolutionFile;
  levelup?: LevelUpLearnsetsRawFile;
  tmhm?: TmhmLearnsetsRawFile;
}

const STAT_FIELDS = [
  'baseHP',
  'baseAttack',
  'baseDefense',
  'baseSpeed',
  'baseSpAttack',
  'baseSpDefense',
] as const;
type StatField = (typeof STAT_FIELDS)[number];

const TYPE_SLOTS = [0, 1] as const;
const ABILITY_SLOTS = [0, 1] as const;

function isStatField(name: string): name is StatField {
  return (STAT_FIELDS as readonly string[]).includes(name);
}

export function createFsRepository(fs: RepoFs, paths: RepoPaths): Repository {
  return {
    loadSpecies() {
      return fs.readJson(paths.species) as SpeciesFile;
    },
    saveSpecies(file) {
      fs.writeJson(paths.species, file);
    },
    loadEvolution() {
      return fs.readJson(paths.evolution) as EvolutionFile;
    },
    saveEvolution(file) {
      fs.writeJson(paths.evolution, file);
    },
    loadLearnsets() {
      const levelup = fs.readJson(paths.levelup) as LevelUpLearnsetsRawFile;
      const tmhm = fs.readJson(paths.tmhm) as TmhmLearnsetsRawFile;
      return mergeLearnsets(levelup, tmhm);
    },
    saveLearnsets(view) {
      fs.writeJson(paths.levelup, splitLearnsetsLevelup(view));
      fs.writeJson(paths.tmhm, splitLearnsetsTmhm(view));
    },
  };
}

export function createInMemoryRepository(initial: InitialRepoState = {}): Repository & {
  state: InitialRepoState;
} {
  const state: InitialRepoState = {
    species: initial.species,
    evolution: initial.evolution,
    levelup: initial.levelup,
    tmhm: initial.tmhm,
  };
  const noFs: RepoFs = {
    readJson: (p) => {
      if (p === 'species') return state.species;
      if (p === 'evolution') return state.evolution;
      if (p === 'levelup') return state.levelup;
      if (p === 'tmhm') return state.tmhm;
      throw new Error(`Unknown path: ${p}`);
    },
    writeJson: (p, data) => {
      if (p === 'species') state.species = data as SpeciesFile;
      else if (p === 'evolution') state.evolution = data as EvolutionFile;
      else if (p === 'levelup') state.levelup = data as LevelUpLearnsetsRawFile;
      else if (p === 'tmhm') state.tmhm = data as TmhmLearnsetsRawFile;
      else throw new Error(`Unknown path: ${p}`);
    },
  };
  return {
    ...createFsRepository(noFs, {
      species: 'species',
      evolution: 'evolution',
      levelup: 'levelup',
      tmhm: 'tmhm',
    }),
    state,
  };
}

export function mergeLearnsets(levelup: LevelUpLearnsetsRawFile, tmhm: TmhmLearnsetsRawFile): LearnsetsView {
  const view: LearnsetsView = {};
  for (const e of levelup.learnsets) {
    const entry: LearnsetsViewEntry = { levelup: e.moves, tmhm: [] };
    if (e.name != null) entry.name = e.name;
    view[e.species] = entry;
  }
  for (const e of tmhm.learnsets) {
    if (!view[e.species]) {
      const entry: LearnsetsViewEntry = { levelup: [], tmhm: e.moves };
      view[e.species] = entry;
    } else {
      view[e.species].tmhm = e.moves;
    }
  }
  return view;
}

export function splitLearnsetsLevelup(view: LearnsetsView): LevelUpLearnsetsRawFile {
  return {
    learnsets: Object.entries(view).map(([species, e]) => {
      const entry: LevelUpLearnsetsRawEntry = {
        name: e.name ?? speciesToDisplayName(species),
        species,
        moves: e.levelup,
      };
      return entry;
    }),
  };
}

export function splitLearnsetsTmhm(view: LearnsetsView): TmhmLearnsetsRawFile {
  const canonicalOrder = [...TM_LIST, ...HM_LIST];
  return {
    learnsets: Object.entries(view).map(([species, e]) => {
      const sortedMoves = [...e.tmhm].sort((a, b) => {
        const indexA = canonicalOrder.indexOf(a);
        const indexB = canonicalOrder.indexOf(b);
        return indexA - indexB;
      });
      return { species, moves: sortedMoves };
    }),
  };
}

export function speciesToDisplayName(species: string): string {
  return species
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function computeLevelPadded(level: number): string {
  return String(level).padStart(2, ' ');
}

function cloneViewEntry(entry: LearnsetsViewEntry): LearnsetsViewEntry {
  const cloned: LearnsetsViewEntry = {
    levelup: entry.levelup.map((m) => ({ ...m })),
    tmhm: [...entry.tmhm],
  };
  if (entry.name != null) cloned.name = entry.name;
  return cloned;
}

function ensureSpecies(view: LearnsetsView, species: string): LearnsetsViewEntry {
  if (!view[species]) view[species] = { levelup: [], tmhm: [] };
  return view[species];
}

function withEntry(
  view: LearnsetsView,
  species: string,
  fn: (entry: LearnsetsViewEntry) => LearnsetsViewEntry,
): LearnsetsView {
  const next: LearnsetsView = {};
  for (const [k, v] of Object.entries(view)) next[k] = cloneViewEntry(v);
  const current = next[species] ?? { levelup: [], tmhm: [] };
  next[species] = fn(current);
  return next;
}

export function sortLevelup(
  view: LearnsetsView,
  species: string,
): { changed: boolean; view: LearnsetsView } {
  const entry = view[species];
  if (!entry) return { changed: false, view };
  const before = entry.levelup.map((e) => `${e.level}:${e.move}`).join('|');
  const sorted = [...entry.levelup].sort((a, b) => a.level - b.level);
  const after = sorted.map((e) => `${e.level}:${e.move}`).join('|');
  const next: LearnsetsView = {};
  for (const [k, v] of Object.entries(view)) next[k] = cloneViewEntry(v);
  next[species] = { ...next[species], levelup: sorted };
  return { changed: after !== before, view: next };
}

export function addLevelupMove(
  view: LearnsetsView,
  species: string,
  level: number,
  move: string,
): LearnsetsView {
  const next = withEntry(view, species, (entry) => {
    const newMove: LevelupMove = { level, level_padded: computeLevelPadded(level), move };
    const levelup = [...entry.levelup];
    let insertIndex = levelup.length;
    for (let i = 0; i < levelup.length; i++) {
      if (levelup[i].level >= level) {
        insertIndex = i;
        break;
      }
    }
    levelup.splice(insertIndex, 0, newMove);
    return { ...entry, levelup };
  });
  return next;
}

export function removeLevelupMove(view: LearnsetsView, species: string, index: number): LearnsetsView {
  const entry = view[species];
  if (!entry) return view;
  if (index < 0 || index >= entry.levelup.length) return view;
  return withEntry(view, species, (e) => ({
    ...e,
    levelup: e.levelup.filter((_, i) => i !== index),
  }));
}

export function setLevelupLevel(
  view: LearnsetsView,
  species: string,
  index: number,
  level: number,
): LearnsetsView {
  const entry = view[species];
  if (!entry) return view;
  if (index < 0 || index >= entry.levelup.length) return view;
  const clamped = Math.max(1, Math.min(100, Math.floor(level) || 1));
  return withEntry(view, species, (e) => {
    const levelup = e.levelup.map((m, i) =>
      i === index ? { ...m, level: clamped, level_padded: computeLevelPadded(clamped) } : m,
    );
    return { ...e, levelup };
  });
}

export function setLevelupMove(
  view: LearnsetsView,
  species: string,
  index: number,
  move: string,
): LearnsetsView {
  const entry = view[species];
  if (!entry) return view;
  if (index < 0 || index >= entry.levelup.length) return view;
  return withEntry(view, species, (e) => ({
    ...e,
    levelup: e.levelup.map((m, i) => (i === index ? { ...m, move } : m)),
  }));
}

export function toggleTmhm(
  view: LearnsetsView,
  species: string,
  move: string,
  on: boolean,
): LearnsetsView {
  return withEntry(view, species, (entry) => {
    const set = new Set(entry.tmhm);
    if (on) set.add(move);
    else set.delete(move);
    return { ...entry, tmhm: [...set] };
  });
}

function findEntry(file: EvolutionFile, from: string): EvolutionEntry | undefined {
  return file.evolutions.find((e) => e.from === from);
}

function withEntryEvo(file: EvolutionFile, from: string, fn: (entry: EvolutionEntry) => EvolutionEntry): EvolutionFile {
  const existing = findEntry(file, from);
  if (!existing) {
    const created: EvolutionEntry = fn({ from, to: [] });
    return { ...file, evolutions: [...file.evolutions, created] };
  }
  return {
    ...file,
    evolutions: file.evolutions.map((e) => (e.from === from ? fn(e) : e)),
  };
}

export function findEvoRoot(file: EvolutionFile, label: string): string {
  const parentOf = new Map<string, { from: string; toIndex: number }>();
  for (const e of file.evolutions) {
    e.to.forEach((t, i) => parentOf.set(t.target, { from: e.from, toIndex: i }));
  }
  let cur = label;
  const seen = new Set<string>();
  while (true) {
    if (seen.has(cur)) break;
    seen.add(cur);
    const p = parentOf.get(cur);
    if (!p) break;
    cur = p.from;
  }
  return cur;
}

export function findEvoChildren(file: EvolutionFile, label: string): { method: string; param: number; target: string }[] {
  const entry = findEntry(file, label);
  return entry ? entry.to.map((t) => ({ ...t })) : [];
}

export function addEvolution(file: EvolutionFile, from: string, target: EvolutionTarget): EvolutionFile {
  return withEntryEvo(file, from, (entry) => ({
    ...entry,
    to: [...entry.to, { ...target }],
  }));
}

export function removeEvolution(file: EvolutionFile, from: string, toIndex: number): EvolutionFile {
  const entry = findEntry(file, from);
  if (!entry) return file;
  if (toIndex < 0 || toIndex >= entry.to.length) return file;
  const remaining = entry.to.filter((_, i) => i !== toIndex);
  if (remaining.length > 0) {
    return {
      ...file,
      evolutions: file.evolutions.map((e) =>
        e.from === from ? { ...e, to: remaining } : e,
      ),
    };
  }
  return {
    ...file,
    evolutions: file.evolutions.filter((e) => e.from !== from),
  };
}

export function setEvolutionMethod(file: EvolutionFile, from: string, toIndex: number, method: string): EvolutionFile {
  return withEntryEvo(file, from, (entry) => {
    if (toIndex < 0 || toIndex >= entry.to.length) return entry;
    return {
      ...entry,
      to: entry.to.map((t, i) => {
        if (i !== toIndex) return t;
        const next: EvolutionTarget = { ...t, method };
        if (paramType(method) === 'none') next.param = 0;
        return next;
      }),
    };
  });
}

export function setEvolutionParam(file: EvolutionFile, from: string, toIndex: number, param: number): EvolutionFile {
  return withEntryEvo(file, from, (entry) => {
    if (toIndex < 0 || toIndex >= entry.to.length) return entry;
    return {
      ...entry,
      to: entry.to.map((t, i) => (i === toIndex ? { ...t, param } : t)),
    };
  });
}

export function setEvolutionTarget(file: EvolutionFile, from: string, toIndex: number, target: string): EvolutionFile {
  return withEntryEvo(file, from, (entry) => {
    if (toIndex < 0 || toIndex >= entry.to.length) return entry;
    return {
      ...entry,
      to: entry.to.map((t, i) => (i === toIndex ? { ...t, target } : t)),
    };
  });
}

export function paramType(method: string): ParamType {
  if (
    method === 'EVO_LEVEL' ||
    method === 'EVO_LEVEL_ATK_GT_DEF' ||
    method === 'EVO_LEVEL_ATK_EQ_DEF' ||
    method === 'EVO_LEVEL_ATK_LT_DEF' ||
    method === 'EVO_LEVEL_SILCOON' ||
    method === 'EVO_LEVEL_CASCOON' ||
    method === 'EVO_LEVEL_NINJASK' ||
    method === 'EVO_LEVEL_SHEDINJA'
  )
    return 'level';
  if (method === 'EVO_ITEM' || method === 'EVO_TRADE_ITEM') return 'item';
  if (method === 'EVO_BEAUTY') return 'beauty';
  return 'none';
}

const METHOD_LABELS: Record<string, string> = {
  EVO_FRIENDSHIP: 'Friendship',
  EVO_FRIENDSHIP_DAY: 'Friendship (Day)',
  EVO_FRIENDSHIP_NIGHT: 'Friendship (Night)',
  EVO_LEVEL: 'Level',
  EVO_TRADE: 'Trade',
  EVO_TRADE_ITEM: 'Trade (holding item)',
  EVO_ITEM: 'Item',
  EVO_LEVEL_ATK_GT_DEF: 'Level (Atk > Def)',
  EVO_LEVEL_ATK_EQ_DEF: 'Level (Atk = Def)',
  EVO_LEVEL_ATK_LT_DEF: 'Level (Atk < Def)',
  EVO_LEVEL_SILCOON: 'Level (Silcoon)',
  EVO_LEVEL_CASCOON: 'Level (Cascoon)',
  EVO_LEVEL_NINJASK: 'Level (Ninjask)',
  EVO_LEVEL_SHEDINJA: 'Level (Shedinja)',
  EVO_BEAUTY: 'Beauty',
};

function prettyLabel(ident: string): string {
  return ident
    .split('_')
    .map((w) => (w ? w.charAt(0) + w.slice(1).toLowerCase() : w))
    .join(' ');
}

export function parseMethods(src: string): { value: string; label: string }[] {
  const re = /^#define\s+(EVO_[A-Z0-9_]+)\s+(\d+)/gm;
  const entries: MethodOption[] = [];
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    if (name.startsWith('EVO_MODE_')) continue;
    const label = METHOD_LABELS[name] ?? prettyLabel(name);
    entries.push({ value: name, label, order: parseInt(m[2]) });
  }
  return entries
    .sort((a, b) => a.order - b.order)
    .map(({ value, label }) => ({ value, label }));
}

export function parseItems(src: string): ItemOption[] {
  const re = /^#define\s+(ITEM_[A-Z0-9_]+)\s+(\d+)/gm;
  const items: ItemOption[] = [];
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    if (name === 'ITEM_NONE' || name === 'ITEM_LIST_END') continue;
    if (/^ITEM_[0-9A-F]+$/.test(name)) continue;
    const label = prettyLabel(name.replace(/^ITEM_/, ''));
    if (/^[0-9a-f]{2,4}$/i.test(label)) continue;
    items.push({ value: name, label, number: parseInt(m[2]) });
  }
  return items.sort((a, b) => a.label.localeCompare(b.label));
}

function findSpeciesEntry(file: SpeciesFile, label: string): SpeciesEntry | undefined {
  return file.species.find((p) => p.label === label);
}

export function updateSpeciesStat(
  file: SpeciesFile,
  label: string,
  stat: string,
  value: string,
): SpeciesFile {
  if (!isStatField(stat)) return file;
  return {
    ...file,
    species: file.species.map((p) => (p.label === label ? { ...p, [stat]: value } : p)),
  };
}

export function setSpeciesType(
  file: SpeciesFile,
  label: string,
  slot: 0 | 1,
  type: string,
): SpeciesFile {
  return {
    ...file,
    species: file.species.map((p) => {
      if (p.label !== label) return p;
      const types: [string, string] = slot === 0 ? [type, p.types[1]] : [p.types[0], type];
      return { ...p, types };
    }),
  };
}

export function setSpeciesAbility(
  file: SpeciesFile,
  label: string,
  slot: 0 | 1,
  ability: string,
): SpeciesFile {
  return {
    ...file,
    species: file.species.map((p) => {
      if (p.label !== label) return p;
      const abilities: [string, string] =
        slot === 0 ? [ability, p.abilities[1]] : [p.abilities[0], ability];
      return { ...p, abilities };
    }),
  };
}

export { STAT_FIELDS, TYPE_SLOTS, ABILITY_SLOTS };
