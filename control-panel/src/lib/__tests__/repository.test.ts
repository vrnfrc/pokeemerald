import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInMemoryRepository,
  setSpeciesAbility,
  setSpeciesType,
  updateSpeciesStat,
} from '../repository.ts';
import type { EvolutionFile, LearnsetsRawFile, SpeciesFile } from '../types.ts';

function makeSpecies(): SpeciesFile {
  return {
    _widths: { baseHP: 13, label: 20 },
    old_unown_species_info: {
      label: 'OLD_UNOWN',
      baseHP: '50',
      baseAttack: '150',
      baseDefense: '50',
      baseSpeed: '150',
      baseSpAttack: '150',
      baseSpDefense: '50',
      types: ['TYPE_NORMAL', 'TYPE_NORMAL'],
      catchRate: '3',
      expYield: '1',
      evYield_HP: '2',
      evYield_Attack: '2',
      evYield_Defense: '2',
      evYield_Speed: '2',
      evYield_SpAttack: '2',
      evYield_SpDefense: '2',
      itemCommon: 'ITEM_NONE',
      itemRare: 'ITEM_NONE',
      genderRatio: 'PERCENT_FEMALE(50)',
      eggCycles: '120',
      friendship: '0',
      growthRate: 'GROWTH_MEDIUM_FAST',
      eggGroups: ['EGG_GROUP_UNDISCOVERED', 'EGG_GROUP_UNDISCOVERED'],
      abilities: ['ABILITY_NONE', 'ABILITY_NONE'],
      safariZoneFleeRate: '0',
      bodyColor: 'BODY_COLOR_BLACK',
      noFlip: 'FALSE',
    },
    species: [
      {
        label: 'BULBASAUR',
        baseHP: '45',
        baseAttack: '49',
        baseDefense: '49',
        baseSpeed: '45',
        baseSpAttack: '65',
        baseSpDefense: '65',
        types: ['TYPE_GRASS', 'TYPE_POISON'],
        catchRate: '45',
        expYield: '64',
        evYield_HP: '0',
        evYield_Attack: '0',
        evYield_Defense: '0',
        evYield_Speed: '0',
        evYield_SpAttack: '1',
        evYield_SpDefense: '0',
        itemCommon: 'ITEM_NONE',
        itemRare: 'ITEM_NONE',
        genderRatio: 'PERCENT_FEMALE(12.5)',
        eggCycles: '20',
        friendship: 'STANDARD_FRIENDSHIP',
        growthRate: 'GROWTH_MEDIUM_SLOW',
        eggGroups: ['EGG_GROUP_MONSTER', 'EGG_GROUP_GRASS'],
        abilities: ['ABILITY_OVERGROW', 'ABILITY_NONE'],
        safariZoneFleeRate: '0',
        bodyColor: 'BODY_COLOR_GREEN',
        noFlip: 'FALSE',
      },
    ],
  };
}

function makeLevelup(): LearnsetsRawFile {
  return {
    learnsets: [
      {
        species: 'BULBASAUR',
        moves: [
          { level: 1, level_padded: ' 1', move: 'MOVE_TACKLE' },
          { level: 3, level_padded: ' 3', move: 'MOVE_GROWL' },
        ],
      },
    ],
  };
}

function makeTmhm(): LearnsetsRawFile {
  return {
    learnsets: [
      { species: 'BULBASAUR', moves: ['TOXIC', 'CUT'] },
    ],
  };
}

function makeEvolution(): EvolutionFile {
  return {
    _widths: { label: 20, extra: 5 },
    evolutions: [
      {
        from: 'BULBASAUR',
        to: [{ method: 'EVO_LEVEL', param: 16, target: 'IVYSAUR' }],
      },
    ],
  };
}

describe('createInMemoryRepository — round-trip', () => {
  it('save + load species round-trips', () => {
    const repo = createInMemoryRepository({ species: makeSpecies() });
    const original = repo.loadSpecies();
    repo.saveSpecies(original);
    const reread = repo.loadSpecies();
    assert.deepEqual(reread, original);
  });

  it('save + load evolution round-trips', () => {
    const repo = createInMemoryRepository({ evolution: makeEvolution() });
    const original = repo.loadEvolution();
    repo.saveEvolution(original);
    const reread = repo.loadEvolution();
    assert.deepEqual(reread, original);
  });

  it('save + load learnsets merges and splits symmetrically', () => {
    const levelup = makeLevelup();
    const tmhm = makeTmhm();
    const repo = createInMemoryRepository({ levelup, tmhm });
    const view = repo.loadLearnsets();
    repo.saveLearnsets(view);
    const viewAgain = repo.loadLearnsets();
    assert.deepEqual(viewAgain, view);
  });

  it('saveEvolution preserves _widths exactly as provided', () => {
    const repo = createInMemoryRepository();
    const file: EvolutionFile = {
      _widths: { label: 25, foo: 7, bar: 9 },
      evolutions: [],
    };
    repo.saveEvolution(file);
    const reread = repo.loadEvolution();
    assert.deepEqual(reread._widths, file._widths);
  });

  it('saveEvolution falls back to { label: 20 } when _widths is omitted by the caller', () => {
    const repo = createInMemoryRepository();
    repo.saveEvolution({
      _widths: { label: 20 },
      evolutions: [],
    });
    const reread = repo.loadEvolution();
    assert.deepEqual(reread._widths, { label: 20 });
  });
});

describe('updateSpeciesStat', () => {
  it('updates the given stat for the targeted species only', () => {
    const file = makeSpecies();
    const next = updateSpeciesStat(file, 'BULBASAUR', 'baseHP', '99');
    assert.equal(next.species[0].baseHP, '99');
    assert.equal(file.species[0].baseHP, '45', 'input is not mutated');
  });

  it('rejects unknown stat names (no-op)', () => {
    const file = makeSpecies();
    const next = updateSpeciesStat(file, 'BULBASAUR', 'attack', '99');
    assert.deepEqual(next, file);
  });
});

describe('setSpeciesType', () => {
  it('updates the first type slot', () => {
    const file = makeSpecies();
    const next = setSpeciesType(file, 'BULBASAUR', 0, 'TYPE_FIRE');
    assert.equal(next.species[0].types[0], 'TYPE_FIRE');
    assert.equal(next.species[0].types[1], 'TYPE_POISON');
  });

  it('updates the second type slot', () => {
    const file = makeSpecies();
    const next = setSpeciesType(file, 'BULBASAUR', 1, 'TYPE_FLYING');
    assert.equal(next.species[0].types[0], 'TYPE_GRASS');
    assert.equal(next.species[0].types[1], 'TYPE_FLYING');
  });
});

describe('setSpeciesAbility', () => {
  it('updates the first ability slot', () => {
    const file = makeSpecies();
    const next = setSpeciesAbility(file, 'BULBASAUR', 0, 'ABILITY_BLAZE');
    assert.equal(next.species[0].abilities[0], 'ABILITY_BLAZE');
    assert.equal(next.species[0].abilities[1], 'ABILITY_NONE');
  });

  it('updates the second ability slot', () => {
    const file = makeSpecies();
    const next = setSpeciesAbility(file, 'BULBASAUR', 1, 'ABILITY_CHLOROPHYLL');
    assert.equal(next.species[0].abilities[0], 'ABILITY_OVERGROW');
    assert.equal(next.species[0].abilities[1], 'ABILITY_CHLOROPHYLL');
  });
});
