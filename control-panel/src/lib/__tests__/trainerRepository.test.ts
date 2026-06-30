import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInMemoryTrainerRepository,
  type TrainerRepository,
} from '../trainerRepository.ts';
import type { TrainerPartiesFile } from '../trainerTypes.ts';

function makeTrainerParties(): TrainerPartiesFile {
  return {
    parties: [
      {
        name: 'Sawyer1',
        type: 'TrainerMonNoItemDefaultMoves',
        pokemon: [
          { iv: 0, lvl: 21, species: 'GEODUDE' },
        ],
      },
      {
        name: 'Rose1',
        type: 'TrainerMonNoItemDefaultMoves',
        pokemon: [
          { iv: 0, lvl: 14, species: 'ROSELIA' },
          { iv: 0, lvl: 14, species: 'SHROOMISH' },
        ],
      },
      {
        name: 'Felix',
        type: 'TrainerMonNoItemCustomMoves',
        pokemon: [
          {
            iv: 0,
            lvl: 43,
            species: 'MEDICHAM',
            moves: ['MOVE_PSYCHIC', 'NONE', 'NONE', 'NONE'],
          },
        ],
      },
      {
        name: 'Randall',
        type: 'TrainerMonItemCustomMoves',
        pokemon: [
          {
            iv: 255,
            lvl: 26,
            species: 'SWELLOW',
            heldItem: 'ITEM_NONE',
            moves: ['MOVE_QUICK_ATTACK', 'MOVE_AGILITY', 'MOVE_WING_ATTACK', 'NONE'],
          },
        ],
      },
    ],
  };
}

describe('createInMemoryTrainerRepository', () => {
  let repo: TrainerRepository;

  beforeEach(() => {
    repo = createInMemoryTrainerRepository(makeTrainerParties());
  });

  describe('loadTrainerParties', () => {
    it('loads trainer parties', () => {
      const parties = repo.loadTrainerParties();
      assert.equal(parties.parties.length, 4);
      assert.equal(parties.parties[0].name, 'Sawyer1');
    });
  });

  describe('getTrainerParty', () => {
    it('returns trainer party by name', () => {
      const party = repo.getTrainerParty('Sawyer1');
      assert.ok(party);
      assert.equal(party.name, 'Sawyer1');
      assert.equal(party.pokemon.length, 1);
    });

    it('returns null for non-existent trainer', () => {
      const party = repo.getTrainerParty('NonExistent');
      assert.equal(party, null);
    });
  });

  describe('updateTrainerParty', () => {
    it('updates trainer type', () => {
      const updated = repo.updateTrainerParty('Sawyer1', { type: 'TrainerMonNoItemCustomMoves' });
      assert.equal(updated.parties[0].type, 'TrainerMonNoItemCustomMoves');
    });

    it('updates pokemon array', () => {
      const updated = repo.updateTrainerParty('Sawyer1', {
        pokemon: [
          { iv: 100, lvl: 30, species: 'GRAVELER' },
        ],
      });
      assert.equal(updated.parties[0].pokemon[0].species, 'GRAVELER');
      assert.equal(updated.parties[0].pokemon[0].iv, 100);
    });

    it('does not mutate original', () => {
      const original = repo.loadTrainerParties();
      repo.updateTrainerParty('Sawyer1', { type: 'TrainerMonNoItemCustomMoves' });
      const reread = repo.loadTrainerParties();
      assert.equal(reread.parties[0].type, 'TrainerMonNoItemDefaultMoves');
    });
  });

  describe('updatePokemonInParty', () => {
    it('updates specific pokemon in party', () => {
      const updated = repo.updatePokemonInParty('Rose1', 0, { iv: 50, lvl: 20 });
      assert.equal(updated.parties[1].pokemon[0].iv, 50);
      assert.equal(updated.parties[1].pokemon[0].lvl, 20);
      assert.equal(updated.parties[1].pokemon[1].iv, 0);
    });

    it('updates pokemon with held item', () => {
      const updated = repo.updatePokemonInParty('Randall', 0, { heldItem: 'ITEM_LEFTOVERS' });
      assert.equal(updated.parties[3].pokemon[0].heldItem, 'ITEM_LEFTOVERS');
    });

    it('updates pokemon with moves', () => {
      const updated = repo.updatePokemonInParty('Felix', 0, {
        moves: ['MOVE_PSYCHIC', 'MOVE_SHADOW_BALL', 'NONE', 'NONE'],
      });
      assert.deepEqual(updated.parties[2].pokemon[0].moves, [
        'MOVE_PSYCHIC',
        'MOVE_SHADOW_BALL',
        'NONE',
        'NONE',
      ]);
    });
  });

  describe('saveTrainerParties', () => {
    it('saves and reloads trainer parties', () => {
      const parties = repo.loadTrainerParties();
      parties.parties[0].pokemon[0].iv = 255;
      repo.saveTrainerParties(parties);
      const reloaded = repo.loadTrainerParties();
      assert.equal(reloaded.parties[0].pokemon[0].iv, 255);
    });
  });
});
