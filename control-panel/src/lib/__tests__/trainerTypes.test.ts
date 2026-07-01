import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTrainerName,
  validateIV,
  validateLevel,
  ivToDisplayLabel,
  trainerPicToFilename,
  getTrainerTypeCapabilities,
} from '../trainerTypes.ts';

describe('parseTrainerName', () => {
  it('parses trainer name with iteration number', () => {
    assert.deepEqual(parseTrainerName('Calvin1'), { baseName: 'Calvin', iteration: 1 });
    assert.deepEqual(parseTrainerName('Rose5'), { baseName: 'Rose', iteration: 5 });
    assert.deepEqual(parseTrainerName('GruntAquaHideout3'), { baseName: 'GruntAquaHideout', iteration: 3 });
  });

  it('parses trainer name without iteration number', () => {
    assert.deepEqual(parseTrainerName('Marcel'), { baseName: 'Marcel', iteration: null });
    assert.deepEqual(parseTrainerName('Sawyer'), { baseName: 'Sawyer', iteration: null });
  });
});

describe('rematch detection logic', () => {
  it('grunts with _N suffix but no rematches array entries are distinct trainers', () => {
    // Simulate the grunt corner case:
    // TRAINER_GRUNT_MUSEUM_1 and TRAINER_GRUNT_MUSEUM_2 are in trainers[]
    // rematches[] is empty
    // Expected: both should be displayed as separate trainers (no tabs)

    const trainers = [
      { partyName: 'GruntMuseum1', baseName: 'GruntMuseum', iteration: 1 },
      { partyName: 'GruntMuseum2', baseName: 'GruntMuseum', iteration: 2 },
    ];

    // rematches array is empty, so rematchedBaseNames is empty
    const rematchedBaseNames = new Set<string>();

    // Apply the logic from pages/api/trainers/index.ts
    const processed = trainers.map(t => {
      if (!rematchedBaseNames.has(t.baseName)) {
        return { ...t, baseName: t.baseName + (t.iteration ?? ''), iteration: null };
      }
      return t;
    });

    // Both grunts should now have unique baseNames and null iteration
    assert.equal(processed[0].baseName, 'GruntMuseum1');
    assert.equal(processed[0].iteration, null);
    assert.equal(processed[1].baseName, 'GruntMuseum2');
    assert.equal(processed[1].iteration, null);
  });

  it('trainers with rematches array entries keep their iteration numbers', () => {
    // Simulate the rematch case:
    // TRAINER_CALVIN_1 is in trainers[]
    // TRAINER_CALVIN_2, TRAINER_CALVIN_3 are in rematches[]
    // Expected: Calvin1 keeps iteration: 1, grouped with Calvin2, Calvin3

    const trainers = [
      { partyName: 'Calvin1', baseName: 'Calvin', iteration: 1 },
    ];

    // rematches array has Calvin2, Calvin3 → baseName "Calvin" is in rematchedBaseNames
    const rematchedBaseNames = new Set(['Calvin']);

    // Apply the logic from pages/api/trainers/index.ts
    const processed = trainers.map(t => {
      if (!rematchedBaseNames.has(t.baseName)) {
        return { ...t, baseName: t.baseName + (t.iteration ?? ''), iteration: null };
      }
      return t;
    });

    // Calvin1 should keep its baseName and iteration
    assert.equal(processed[0].baseName, 'Calvin');
    assert.equal(processed[0].iteration, 1);
  });

  it('mixed scenario: some trainers have rematches, others do not', () => {
    // Simulate a map with both grunts and rematch trainers:
    // trainers[]: GRUNT_MUSEUM_1, GRUNT_MUSEUM_2, CALVIN_1
    // rematches[]: CALVIN_2, CALVIN_3
    // Expected: grunts are separate, Calvin has tabs

    const trainers = [
      { partyName: 'GruntMuseum1', baseName: 'GruntMuseum', iteration: 1 },
      { partyName: 'GruntMuseum2', baseName: 'GruntMuseum', iteration: 2 },
      { partyName: 'Calvin1', baseName: 'Calvin', iteration: 1 },
    ];

    // rematches array has Calvin2, Calvin3 → baseName "Calvin" is in rematchedBaseNames
    const rematchedBaseNames = new Set(['Calvin']);

    // Apply the logic from pages/api/trainers/index.ts
    const processed = trainers.map(t => {
      if (!rematchedBaseNames.has(t.baseName)) {
        return { ...t, baseName: t.baseName + (t.iteration ?? ''), iteration: null };
      }
      return t;
    });

    // Grunts should be separate
    assert.equal(processed[0].baseName, 'GruntMuseum1');
    assert.equal(processed[0].iteration, null);
    assert.equal(processed[1].baseName, 'GruntMuseum2');
    assert.equal(processed[1].iteration, null);

    // Calvin should keep iteration
    assert.equal(processed[2].baseName, 'Calvin');
    assert.equal(processed[2].iteration, 1);
  });
});

describe('validateIV', () => {
  it('accepts valid IV values', () => {
    assert.equal(validateIV(0), true);
    assert.equal(validateIV(127), true);
    assert.equal(validateIV(255), true);
  });

  it('rejects invalid IV values', () => {
    assert.equal(validateIV(-1), false);
    assert.equal(validateIV(256), false);
    assert.equal(validateIV(1.5), false);
  });
});

describe('validateLevel', () => {
  it('accepts valid level values', () => {
    assert.equal(validateLevel(1), true);
    assert.equal(validateLevel(50), true);
    assert.equal(validateLevel(100), true);
  });

  it('rejects invalid level values', () => {
    assert.equal(validateLevel(0), false);
    assert.equal(validateLevel(101), false);
    assert.equal(validateLevel(1.5), false);
  });
});

describe('ivToDisplayLabel', () => {
  it('returns correct labels for IV values', () => {
    assert.equal(ivToDisplayLabel(0), 'Default');
    assert.equal(ivToDisplayLabel(32), 'Low');
    assert.equal(ivToDisplayLabel(96), 'Medium');
    assert.equal(ivToDisplayLabel(160), 'High');
    assert.equal(ivToDisplayLabel(224), 'Very High');
    assert.equal(ivToDisplayLabel(255), 'Perfect');
  });
});

describe('trainerPicToFilename', () => {
  it('converts trainer pic constant to filename', () => {
    assert.equal(trainerPicToFilename('TRAINER_PIC_HIKER'), 'hiker');
    assert.equal(trainerPicToFilename('TRAINER_PIC_AQUA_GRUNT_M'), 'aqua_grunt_m');
    assert.equal(trainerPicToFilename('TRAINER_PIC_LEADER_ROXANNE'), 'leader_roxanne');
  });

  it('converts RS_ prefix to _rs suffix', () => {
    assert.equal(trainerPicToFilename('TRAINER_PIC_RS_BRENDAN'), 'brendan_rs');
    assert.equal(trainerPicToFilename('TRAINER_PIC_RS_MAY'), 'may_rs');
  });
});

describe('getTrainerTypeCapabilities', () => {
  it('returns correct capabilities for each trainer type', () => {
    assert.deepEqual(getTrainerTypeCapabilities('TrainerMonNoItemDefaultMoves'), { hasItems: false, hasCustomMoves: false });
    assert.deepEqual(getTrainerTypeCapabilities('TrainerMonNoItemCustomMoves'), { hasItems: false, hasCustomMoves: true });
    assert.deepEqual(getTrainerTypeCapabilities('TrainerMonItemDefaultMoves'), { hasItems: true, hasCustomMoves: false });
    assert.deepEqual(getTrainerTypeCapabilities('TrainerMonItemCustomMoves'), { hasItems: true, hasCustomMoves: true });
  });
});
