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
});

describe('getTrainerTypeCapabilities', () => {
  it('returns correct capabilities for each trainer type', () => {
    assert.deepEqual(getTrainerTypeCapabilities('TrainerMonNoItemDefaultMoves'), { hasItems: false, hasCustomMoves: false });
    assert.deepEqual(getTrainerTypeCapabilities('TrainerMonNoItemCustomMoves'), { hasItems: false, hasCustomMoves: true });
    assert.deepEqual(getTrainerTypeCapabilities('TrainerMonItemDefaultMoves'), { hasItems: true, hasCustomMoves: false });
    assert.deepEqual(getTrainerTypeCapabilities('TrainerMonItemCustomMoves'), { hasItems: true, hasCustomMoves: true });
  });
});
