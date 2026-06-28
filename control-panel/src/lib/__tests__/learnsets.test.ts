import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addLevelupMove,
  computeLevelPadded,
  mergeLearnsets,
  removeLevelupMove,
  setLevelupLevel,
  setLevelupMove,
  sortLevelup,
  splitLearnsetsLevelup,
  splitLearnsetsTmhm,
  toggleTmhm,
} from '../repository.ts';
import type { LevelUpLearnsetsRawFile, LearnsetsView, LevelupMove, TmhmLearnsetsRawFile } from '../types.ts';

function lu(level: number, move: string): LevelupMove {
  return { level, level_padded: computeLevelPadded(level), move };
}

describe('mergeLearnsets', () => {
  it('species only in levelup gets tmhm: []', () => {
    const levelup: LevelUpLearnsetsRawFile = { learnsets: [{ name: 'Bulbasaur', species: 'BULBASAUR', moves: [lu(1, 'MOVE_X')] }] };
    const tmhm: TmhmLearnsetsRawFile = { learnsets: [] };
    const view = mergeLearnsets(levelup, tmhm);
    assert.deepEqual(view, {
      BULBASAUR: { name: 'Bulbasaur', levelup: [lu(1, 'MOVE_X')], tmhm: [] },
    });
  });

  it('species only in tmhm gets levelup: []', () => {
    const levelup: LevelUpLearnsetsRawFile = { learnsets: [] };
    const tmhm: TmhmLearnsetsRawFile = { learnsets: [{ species: 'A', moves: ['TOXIC'] }] };
    const view = mergeLearnsets(levelup, tmhm);
    assert.deepEqual(view, {
      A: { levelup: [], tmhm: ['TOXIC'] },
    });
  });

  it('species in both gets both arrays', () => {
    const levelup: LevelUpLearnsetsRawFile = { learnsets: [{ name: 'A', species: 'A', moves: [lu(1, 'MOVE_X')] }] };
    const tmhm: TmhmLearnsetsRawFile = { learnsets: [{ species: 'A', moves: ['TOXIC'] }] };
    const view = mergeLearnsets(levelup, tmhm);
    assert.deepEqual(view, {
      A: { name: 'A', levelup: [lu(1, 'MOVE_X')], tmhm: ['TOXIC'] },
    });
  });

  it('species appearing in both files has tmhm value from the tmhm file (overwriting initial [] from levelup file)', () => {
    const levelup: LevelUpLearnsetsRawFile = { learnsets: [{ name: 'A', species: 'A', moves: [] }] };
    const tmhm: TmhmLearnsetsRawFile = { learnsets: [{ species: 'A', moves: ['TOXIC', 'CUT'] }] };
    const view = mergeLearnsets(levelup, tmhm);
    assert.deepEqual(view.A.tmhm, ['TOXIC', 'CUT']);
    assert.deepEqual(view.A.levelup, []);
  });
});

describe('splitLearnsetsLevelup / splitLearnsetsTmhm', () => {
  it('split then merge is the identity', () => {
    const view: LearnsetsView = {
      A: { name: 'A', levelup: [lu(1, 'MOVE_X'), lu(2, 'MOVE_Y')], tmhm: ['TOXIC'] },
      B: { name: 'B', levelup: [], tmhm: ['CUT'] },
    };
    const merged = mergeLearnsets(splitLearnsetsLevelup(view), splitLearnsetsTmhm(view));
    assert.deepEqual(merged, view);
  });

  it('split writes every species to both files (with empty arrays for missing slots)', () => {
    const view: LearnsetsView = {
      A: { name: 'A', levelup: [lu(1, 'MOVE_X')], tmhm: [] },
    };
    const levelupSplit = splitLearnsetsLevelup(view);
    const tmhmSplit = splitLearnsetsTmhm(view);
    assert.deepEqual(levelupSplit.learnsets, [{ name: 'A', species: 'A', moves: [lu(1, 'MOVE_X')] }]);
    assert.deepEqual(tmhmSplit.learnsets, [{ species: 'A', moves: [] }]);
  });
});

describe('computeLevelPadded', () => {
  it('single-digit levels get a leading space', () => {
    assert.equal(computeLevelPadded(1), ' 1');
    assert.equal(computeLevelPadded(5), ' 5');
    assert.equal(computeLevelPadded(9), ' 9');
  });

  it('two-digit levels are unpadded', () => {
    assert.equal(computeLevelPadded(10), '10');
    assert.equal(computeLevelPadded(99), '99');
  });

  it('three-digit levels are unpadded (no truncation)', () => {
    assert.equal(computeLevelPadded(100), '100');
  });
});

describe('sortLevelup', () => {
  it('sorts by level ascending', () => {
    const view: LearnsetsView = {
      A: { levelup: [lu(5, 'MOVE_B'), lu(1, 'MOVE_A'), lu(3, 'MOVE_C')], tmhm: [] },
    };
    const { view: sorted, changed } = sortLevelup(view, 'A');
    assert.equal(changed, true);
    assert.deepEqual(sorted.A.levelup, [lu(1, 'MOVE_A'), lu(3, 'MOVE_C'), lu(5, 'MOVE_B')]);
  });

  it('preserves original order when levels are equal (stable sort)', () => {
    const view: LearnsetsView = {
      A: {
        levelup: [
          { level: 5, level_padded: ' 5', move: 'MOVE_B' },
          { level: 5, level_padded: ' 5', move: 'MOVE_A' },
          { level: 5, level_padded: ' 5', move: 'MOVE_C' },
        ],
        tmhm: [],
      },
    };
    const { view: sorted } = sortLevelup(view, 'A');
    assert.deepEqual(
      sorted.A.levelup.map((m) => m.move),
      ['MOVE_B', 'MOVE_A', 'MOVE_C'],
    );
  });

  it('returns changed=false when already sorted', () => {
    const view: LearnsetsView = {
      A: { levelup: [lu(1, 'MOVE_A'), lu(2, 'MOVE_B')], tmhm: [] },
    };
    const { changed } = sortLevelup(view, 'A');
    assert.equal(changed, false);
  });

  it('is a no-op for unknown species (does not throw)', () => {
    const view: LearnsetsView = {};
    const result = sortLevelup(view, 'NOT_A_SPECIES');
    assert.equal(result.changed, false);
    assert.deepEqual(result.view, {});
  });

  it('does not mutate the input view', () => {
    const original: LearnsetsView = {
      A: { levelup: [lu(5, 'MOVE_X'), lu(1, 'MOVE_Y')], tmhm: [] },
    };
    const snapshot = JSON.parse(JSON.stringify(original));
    sortLevelup(original, 'A');
    assert.deepEqual(original, snapshot);
  });
});

describe('addLevelupMove', () => {
  it('inserts at the correct position to maintain level order', () => {
    const view: LearnsetsView = { A: { levelup: [lu(1, 'MOVE_X'), lu(10, 'MOVE_Z')], tmhm: [] } };
    const next = addLevelupMove(view, 'A', 5, 'MOVE_M');
    assert.deepEqual(
      next.A.levelup.map((m) => m.level),
      [1, 5, 10],
    );
  });

  it('inserts into a brand-new species', () => {
    const next = addLevelupMove({}, 'A', 1, 'MOVE_X');
    assert.deepEqual(next.A.levelup, [lu(1, 'MOVE_X')]);
  });

  it('updates level_padded to match the inserted level', () => {
    const next = addLevelupMove({}, 'A', 1, 'MOVE_X');
    assert.equal(next.A.levelup[0].level_padded, ' 1');
  });

  it('inserts before existing moves at the same level', () => {
    const view: LearnsetsView = {
      A: { levelup: [lu(5, 'MOVE_A'), lu(5, 'MOVE_B')], tmhm: [] },
    };
    const next = addLevelupMove(view, 'A', 5, 'MOVE_NEW');
    assert.deepEqual(
      next.A.levelup.map((m) => m.move),
      ['MOVE_NEW', 'MOVE_A', 'MOVE_B'],
    );
  });
});

describe('removeLevelupMove', () => {
  it('removes the entry at the given index', () => {
    const view: LearnsetsView = { A: { levelup: [lu(1, 'MOVE_A'), lu(2, 'MOVE_B')], tmhm: [] } };
    const next = removeLevelupMove(view, 'A', 0);
    assert.deepEqual(next.A.levelup, [lu(2, 'MOVE_B')]);
  });

  it('is a no-op for out-of-range indices', () => {
    const view: LearnsetsView = { A: { levelup: [lu(1, 'MOVE_A')], tmhm: [] } };
    assert.equal(removeLevelupMove(view, 'A', 5), view);
    assert.equal(removeLevelupMove(view, 'A', -1), view);
  });

  it('is a no-op for unknown species', () => {
    const view: LearnsetsView = {};
    assert.equal(removeLevelupMove(view, 'NOT_A_SPECIES', 0), view);
  });
});

describe('setLevelupLevel', () => {
  it('updates the level and the level_padded of the targeted entry', () => {
    const view: LearnsetsView = { A: { levelup: [lu(1, 'MOVE_X')], tmhm: [] } };
    const next = setLevelupLevel(view, 'A', 0, 5);
    assert.equal(next.A.levelup[0].level, 5);
    assert.equal(next.A.levelup[0].level_padded, ' 5');
  });

  it('clamps to [1, 100]', () => {
    const view: LearnsetsView = { A: { levelup: [lu(1, 'MOVE_X')], tmhm: [] } };
    assert.equal(setLevelupLevel(view, 'A', 0, 0).A.levelup[0].level, 1);
    assert.equal(setLevelupLevel(view, 'A', 0, 999).A.levelup[0].level, 100);
    assert.equal(setLevelupLevel(view, 'A', 0, -5).A.levelup[0].level, 1);
  });
});

describe('setLevelupMove', () => {
  it('changes the move at the targeted index', () => {
    const view: LearnsetsView = { A: { levelup: [lu(1, 'MOVE_X'), lu(2, 'MOVE_Y')], tmhm: [] } };
    const next = setLevelupMove(view, 'A', 0, 'MOVE_Z');
    assert.equal(next.A.levelup[0].move, 'MOVE_Z');
    assert.equal(next.A.levelup[1].move, 'MOVE_Y');
  });
});

describe('toggleTmhm', () => {
  it('adds a move when toggled on', () => {
    const view: LearnsetsView = { A: { levelup: [], tmhm: [] } };
    const next = toggleTmhm(view, 'A', 'TOXIC', true);
    assert.deepEqual(next.A.tmhm, ['TOXIC']);
  });

  it('removes a move when toggled off', () => {
    const view: LearnsetsView = { A: { levelup: [], tmhm: ['TOXIC', 'CUT'] } };
    const next = toggleTmhm(view, 'A', 'TOXIC', false);
    assert.deepEqual(next.A.tmhm, ['CUT']);
  });

  it('toggling twice yields the original list', () => {
    const view: LearnsetsView = { A: { levelup: [], tmhm: ['CUT'] } };
    const after1 = toggleTmhm(view, 'A', 'TOXIC', true);
    const after2 = toggleTmhm(after1, 'A', 'TOXIC', false);
    assert.deepEqual(after2.A.tmhm, view.A.tmhm);
  });

  it('is a set: adding a move twice does not duplicate it', () => {
    const view: LearnsetsView = { A: { levelup: [], tmhm: [] } };
    const next = toggleTmhm(toggleTmhm(view, 'A', 'TOXIC', true), 'A', 'TOXIC', true);
    assert.deepEqual(next.A.tmhm, ['TOXIC']);
  });
});
