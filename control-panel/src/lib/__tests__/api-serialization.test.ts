import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryRepository, speciesToDisplayName } from '../repository.ts';
import type { EvolutionFile, LevelUpLearnsetsRawFile, SpeciesFile, TmhmLearnsetsRawFile } from '../types.ts';

describe('API serialization - exact JSON structure preservation', () => {
  it('levelup learnsets: property order is preserved (name, species, moves)', () => {
    const levelup: LevelUpLearnsetsRawFile = {
      learnsets: [
        { name: 'Bulbasaur', species: 'BULBASAUR', moves: [{ level: 1, level_padded: ' 1', move: 'MOVE_TACKLE' }] },
        { name: 'Ivysaur', species: 'IVYSAUR', moves: [{ level: 1, level_padded: ' 1', move: 'MOVE_TACKLE' }] },
      ],
    };
    const tmhm: TmhmLearnsetsRawFile = {
      learnsets: [
        { species: 'BULBASAUR', moves: ['TOXIC'] },
        { species: 'IVYSAUR', moves: [] },
      ],
    };
    const repo = createInMemoryRepository({ levelup, tmhm });
    
    const view = repo.loadLearnsets();
    repo.saveLearnsets(view);
    
    const savedLevelup = repo.state.levelup!;
    const savedTmhm = repo.state.tmhm!;
    
    assert.equal(savedLevelup.learnsets[0].name, 'Bulbasaur');
    assert.equal(savedLevelup.learnsets[0].species, 'BULBASAUR');
    assert.deepEqual(savedLevelup.learnsets[0].moves, [{ level: 1, level_padded: ' 1', move: 'MOVE_TACKLE' }]);
    
    assert.equal(savedLevelup.learnsets[1].name, 'Ivysaur');
    assert.equal(savedLevelup.learnsets[1].species, 'IVYSAUR');
    
    assert.equal(savedTmhm.learnsets[0].species, 'BULBASAUR');
    assert.equal(savedTmhm.learnsets[1].species, 'IVYSAUR');
    
    const levelupJson = JSON.stringify(savedLevelup, null, 2);
    const nameIndex = levelupJson.indexOf('"name"');
    const speciesIndex = levelupJson.indexOf('"species"');
    const movesIndex = levelupJson.indexOf('"moves"');
    
    assert.ok(nameIndex < speciesIndex, 'name should come before species in JSON');
    assert.ok(speciesIndex < movesIndex, 'species should come before moves in JSON');
  });

  it('tmhm learnsets: property order is preserved (species, moves)', () => {
    const levelup: LevelUpLearnsetsRawFile = {
      learnsets: [
        { name: 'Bulbasaur', species: 'BULBASAUR', moves: [{ level: 1, level_padded: ' 1', move: 'MOVE_TACKLE' }] },
      ],
    };
    const tmhm: TmhmLearnsetsRawFile = {
      learnsets: [
        { species: 'BULBASAUR', moves: ['TOXIC'] },
      ],
    };
    const repo = createInMemoryRepository({ levelup, tmhm });
    
    const view = repo.loadLearnsets();
    repo.saveLearnsets(view);
    
    const savedTmhm = repo.state.tmhm!;
    
    assert.equal(savedTmhm.learnsets[0].species, 'BULBASAUR');
    assert.deepEqual(savedTmhm.learnsets[0].moves, ['TOXIC']);
    
    const tmhmJson = JSON.stringify(savedTmhm, null, 2);
    const speciesIndex = tmhmJson.indexOf('"species"');
    const movesIndex = tmhmJson.indexOf('"moves"');
    
    assert.ok(speciesIndex < movesIndex, 'species should come before moves in JSON');
    assert.ok(!tmhmJson.includes('"name"'), 'tmhm should not have name field');
  });

  it('species: full round-trip preserves all fields', () => {
    const species: SpeciesFile = {
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
    const repo = createInMemoryRepository({ species });
    
    const loaded = repo.loadSpecies();
    repo.saveSpecies(loaded);
    const reloaded = repo.loadSpecies();
    
    assert.deepEqual(reloaded, species);
    assert.deepEqual(reloaded._widths, { baseHP: 13, label: 20 });
    assert.equal(reloaded.species[0].label, 'BULBASAUR');
    assert.equal(reloaded.species[0].baseHP, '45');
  });

  it('evolution: full round-trip preserves structure', () => {
    const evolution: EvolutionFile = {
      _widths: { label: 20 },
      evolutions: [
        {
          from: 'BULBASAUR',
          to: [{ method: 'EVO_LEVEL', param: 16, target: 'IVYSAUR' }],
        },
        {
          from: 'IVYSAUR',
          to: [{ method: 'EVO_LEVEL', param: 32, target: 'VENUSAUR' }],
        },
      ],
    };
    const repo = createInMemoryRepository({ evolution });
    
    const loaded = repo.loadEvolution();
    repo.saveEvolution(loaded);
    const reloaded = repo.loadEvolution();
    
    assert.deepEqual(reloaded, evolution);
    assert.equal(reloaded.evolutions.length, 2);
    assert.equal(reloaded.evolutions[0].from, 'BULBASAUR');
    assert.equal(reloaded.evolutions[0].to[0].target, 'IVYSAUR');
  });

  it('evolution: _widths with extra fields are preserved', () => {
    const evolution: EvolutionFile = {
      _widths: { label: 25, extra: 5, another: 10 },
      evolutions: [],
    };
    const repo = createInMemoryRepository({ evolution });
    
    const loaded = repo.loadEvolution();
    repo.saveEvolution(loaded);
    const reloaded = repo.loadEvolution();
    
    assert.deepEqual(reloaded._widths, { label: 25, extra: 5, another: 10 });
  });

  it('learnsets: multiple species maintain order and structure', () => {
    const levelup: LevelUpLearnsetsRawFile = {
      learnsets: [
        { name: 'Bulbasaur', species: 'BULBASAUR', moves: [{ level: 1, level_padded: ' 1', move: 'MOVE_TACKLE' }] },
        { name: 'Ivysaur', species: 'IVYSAUR', moves: [{ level: 1, level_padded: ' 1', move: 'MOVE_TACKLE' }] },
        { name: 'Venusaur', species: 'VENUSAUR', moves: [{ level: 1, level_padded: ' 1', move: 'MOVE_TACKLE' }] },
        { name: 'Charmander', species: 'CHARMANDER', moves: [{ level: 1, level_padded: ' 1', move: 'MOVE_SCRATCH' }] },
      ],
    };
    const tmhm: TmhmLearnsetsRawFile = {
      learnsets: [
        { species: 'BULBASAUR', moves: ['TOXIC'] },
        { species: 'IVYSAUR', moves: ['TOXIC'] },
        { species: 'VENUSAUR', moves: ['TOXIC'] },
        { species: 'CHARMANDER', moves: [] },
      ],
    };
    const repo = createInMemoryRepository({ levelup, tmhm });
    
    const view = repo.loadLearnsets();
    repo.saveLearnsets(view);
    
    const savedLevelup = repo.state.levelup!;
    assert.equal(savedLevelup.learnsets.length, 4);
    assert.equal(savedLevelup.learnsets[0].name, 'Bulbasaur');
    assert.equal(savedLevelup.learnsets[0].species, 'BULBASAUR');
    assert.equal(savedLevelup.learnsets[1].name, 'Ivysaur');
    assert.equal(savedLevelup.learnsets[1].species, 'IVYSAUR');
    assert.equal(savedLevelup.learnsets[2].name, 'Venusaur');
    assert.equal(savedLevelup.learnsets[2].species, 'VENUSAUR');
    assert.equal(savedLevelup.learnsets[3].name, 'Charmander');
    assert.equal(savedLevelup.learnsets[3].species, 'CHARMANDER');
    
    const savedTmhm = repo.state.tmhm!;
    assert.equal(savedTmhm.learnsets.length, 4);
    assert.equal(savedTmhm.learnsets[0].species, 'BULBASAUR');
    assert.equal(savedTmhm.learnsets[1].species, 'IVYSAUR');
    assert.equal(savedTmhm.learnsets[2].species, 'VENUSAUR');
    assert.equal(savedTmhm.learnsets[3].species, 'CHARMANDER');
  });
});

describe('speciesToDisplayName', () => {
  it('converts simple species name', () => {
    assert.equal(speciesToDisplayName('BULBASAUR'), 'Bulbasaur');
    assert.equal(speciesToDisplayName('PIKACHU'), 'Pikachu');
  });

  it('converts species with underscore', () => {
    assert.equal(speciesToDisplayName('MR_MIME'), 'Mr Mime');
    assert.equal(speciesToDisplayName('HO_OH'), 'Ho Oh');
  });

  it('handles single word', () => {
    assert.equal(speciesToDisplayName('EEVEE'), 'Eevee');
  });

  it('handles already lowercase', () => {
    assert.equal(speciesToDisplayName('bulbasaur'), 'Bulbasaur');
  });
});
