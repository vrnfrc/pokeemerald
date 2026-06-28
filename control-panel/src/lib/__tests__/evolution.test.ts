import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addEvolution,
  findEvoChildren,
  findEvoRoot,
  paramType,
  parseItems,
  parseMethods,
  removeEvolution,
  setEvolutionMethod,
  setEvolutionParam,
  setEvolutionTarget,
} from '../repository.ts';
import type { EvolutionFile, EvolutionTarget } from '../types.ts';

function makeFile(): EvolutionFile {
  return {
    _widths: { label: 20 },
    evolutions: [
      { from: 'CHARMANDER', to: [{ method: 'EVO_LEVEL', param: 16, target: 'CHARMELEON' }] },
      { from: 'CHARMELEON', to: [{ method: 'EVO_LEVEL', param: 36, target: 'CHARIZARD' }] },
      {
        from: 'WURMPLE',
        to: [
          { method: 'EVO_LEVEL_SILCOON', param: 7, target: 'SILCOON' },
          { method: 'EVO_LEVEL_CASCOON', param: 7, target: 'CASCOON' },
        ],
      },
    ],
  };
}

describe('findEvoRoot', () => {
  it('returns the label itself when it has no parent', () => {
    assert.equal(findEvoRoot(makeFile(), 'CHARMANDER'), 'CHARMANDER');
  });

  it('walks back to the root of a linear chain', () => {
    assert.equal(findEvoRoot(makeFile(), 'CHARIZARD'), 'CHARMANDER');
  });

  it('returns the label itself when not in any evolution entry', () => {
    assert.equal(findEvoRoot(makeFile(), 'BULBASAUR'), 'BULBASAUR');
  });

  it('handles a cycle without infinite loop', () => {
    const cyclic: EvolutionFile = {
      _widths: { label: 20 },
      evolutions: [
        { from: 'A', to: [{ method: 'EVO_LEVEL', param: 1, target: 'B' }] },
        { from: 'B', to: [{ method: 'EVO_LEVEL', param: 1, target: 'A' }] },
      ],
    };
    assert.equal(findEvoRoot(cyclic, 'A'), 'A');
  });
});

describe('findEvoChildren', () => {
  it('returns the children of a species', () => {
    const children = findEvoChildren(makeFile(), 'WURMPLE');
    assert.equal(children.length, 2);
    assert.deepEqual(
      children.map((c) => c.target),
      ['SILCOON', 'CASCOON'],
    );
  });

  it('returns an empty array for a leaf species', () => {
    assert.deepEqual(findEvoChildren(makeFile(), 'CHARIZARD'), []);
  });

  it('returns an empty array for an unknown species', () => {
    assert.deepEqual(findEvoChildren(makeFile(), 'BULBASAUR'), []);
  });

  it('returns a copy (mutation does not affect the file)', () => {
    const file = makeFile();
    const children = findEvoChildren(file, 'WURMPLE');
    children[0].target = 'MUTATED';
    assert.equal(file.evolutions.find((e) => e.from === 'WURMPLE')!.to[0].target, 'SILCOON');
  });
});

describe('addEvolution', () => {
  it('appends to an existing entry', () => {
    const next = addEvolution(makeFile(), 'CHARMANDER', {
      method: 'EVO_LEVEL',
      param: 1,
      target: 'EVO_TARGET',
    });
    const entry = next.evolutions.find((e) => e.from === 'CHARMANDER')!;
    assert.equal(entry.to.length, 2);
    assert.equal(entry.to[1].target, 'EVO_TARGET');
  });

  it('creates a new entry for a species not yet in the file', () => {
    const target: EvolutionTarget = { method: 'EVO_LEVEL', param: 1, target: 'BULBASAUR' };
    const next = addEvolution(makeFile(), 'IVYSAUR', target);
    const entry = next.evolutions.find((e) => e.from === 'IVYSAUR');
    assert.ok(entry);
    assert.deepEqual(entry!.to, [target]);
  });

  it('does not mutate the input file', () => {
    const file = makeFile();
    const snapshot = JSON.parse(JSON.stringify(file));
    addEvolution(file, 'BULBASAUR', { method: 'EVO_LEVEL', param: 1, target: 'IVYSAUR' });
    assert.deepEqual(file, snapshot);
  });
});

describe('removeEvolution', () => {
  it('removes the targeted child', () => {
    const next = removeEvolution(makeFile(), 'WURMPLE', 0);
    const entry = next.evolutions.find((e) => e.from === 'WURMPLE')!;
    assert.ok(entry);
    assert.equal(entry.to.length, 1);
    assert.equal(entry.to[0].target, 'CASCOON');
  });

  it('removes the entire from-entry when the last child is removed', () => {
    const file: EvolutionFile = {
      _widths: { label: 20 },
      evolutions: [
        { from: 'CHARMANDER', to: [{ method: 'EVO_LEVEL', param: 16, target: 'CHARMELEON' }] },
      ],
    };
    const next = removeEvolution(file, 'CHARMANDER', 0);
    assert.equal(next.evolutions.find((e) => e.from === 'CHARMANDER'), undefined);
  });

  it('is a no-op for unknown from', () => {
    const file = makeFile();
    assert.equal(removeEvolution(file, 'UNKNOWN', 0), file);
  });

  it('is a no-op for out-of-range toIndex', () => {
    const file = makeFile();
    assert.equal(removeEvolution(file, 'CHARMANDER', 99), file);
    assert.equal(removeEvolution(file, 'CHARMANDER', -1), file);
  });
});

describe('setEvolutionMethod', () => {
  it('updates the method of the targeted child', () => {
    const next = setEvolutionMethod(makeFile(), 'CHARMANDER', 0, 'EVO_ITEM');
    const entry = next.evolutions.find((e) => e.from === 'CHARMANDER')!;
    assert.equal(entry.to[0].method, 'EVO_ITEM');
  });

  it('resets param to 0 when switching to a method with no param', () => {
    const next = setEvolutionMethod(makeFile(), 'CHARMANDER', 0, 'EVO_FRIENDSHIP');
    const entry = next.evolutions.find((e) => e.from === 'CHARMANDER')!;
    assert.equal(entry.to[0].method, 'EVO_FRIENDSHIP');
    assert.equal(entry.to[0].param, 0);
  });

  it('preserves param when switching between two methods that both need a param', () => {
    const next = setEvolutionMethod(makeFile(), 'CHARMANDER', 0, 'EVO_LEVEL_ATK_GT_DEF');
    const entry = next.evolutions.find((e) => e.from === 'CHARMANDER')!;
    assert.equal(entry.to[0].method, 'EVO_LEVEL_ATK_GT_DEF');
    assert.equal(entry.to[0].param, 16);
  });
});

describe('setEvolutionParam', () => {
  it('updates the param of the targeted child', () => {
    const next = setEvolutionParam(makeFile(), 'CHARMANDER', 0, 99);
    const entry = next.evolutions.find((e) => e.from === 'CHARMANDER')!;
    assert.equal(entry.to[0].param, 99);
  });
});

describe('setEvolutionTarget', () => {
  it('updates the target of the targeted child', () => {
    const next = setEvolutionTarget(makeFile(), 'CHARMANDER', 0, 'MEWTWO');
    const entry = next.evolutions.find((e) => e.from === 'CHARMANDER')!;
    assert.equal(entry.to[0].target, 'MEWTWO');
  });
});

describe('paramType', () => {
  it('classifies level-based methods', () => {
    for (const m of [
      'EVO_LEVEL',
      'EVO_LEVEL_ATK_GT_DEF',
      'EVO_LEVEL_ATK_EQ_DEF',
      'EVO_LEVEL_ATK_LT_DEF',
      'EVO_LEVEL_SILCOON',
      'EVO_LEVEL_CASCOON',
      'EVO_LEVEL_NINJASK',
      'EVO_LEVEL_SHEDINJA',
    ]) {
      assert.equal(paramType(m), 'level', m);
    }
  });

  it('classifies item-based methods', () => {
    assert.equal(paramType('EVO_ITEM'), 'item');
    assert.equal(paramType('EVO_TRADE_ITEM'), 'item');
  });

  it('classifies beauty', () => {
    assert.equal(paramType('EVO_BEAUTY'), 'beauty');
  });

  it('classifies parameterless methods as none', () => {
    assert.equal(paramType('EVO_FRIENDSHIP'), 'none');
    assert.equal(paramType('EVO_TRADE'), 'none');
    assert.equal(paramType('UNKNOWN'), 'none');
  });
});

describe('parseMethods', () => {
  it('parses known methods and uses the friendly label', () => {
    const src = `
#define EVO_FRIENDSHIP 1
#define EVO_FRIENDSHIP_DAY 2
#define EVO_LEVEL 4
#define EVO_TRADE 5
#define EVO_ITEM 6
#define EVO_BEAUTY 8
`;
    const methods = parseMethods(src);
    assert.deepEqual(methods, [
      { value: 'EVO_FRIENDSHIP', label: 'Friendship' },
      { value: 'EVO_FRIENDSHIP_DAY', label: 'Friendship (Day)' },
      { value: 'EVO_LEVEL', label: 'Level' },
      { value: 'EVO_TRADE', label: 'Trade' },
      { value: 'EVO_ITEM', label: 'Item' },
      { value: 'EVO_BEAUTY', label: 'Beauty' },
    ]);
  });

  it('excludes EVO_MODE_* (evolution scene modes, not methods)', () => {
    const src = `
#define EVO_MODE_NORMAL 0
#define EVO_MODE_TRADE 1
#define EVO_MODE_ITEM_USE 2
#define EVO_MODE_ITEM_CHECK 3
#define EVO_FRIENDSHIP 4
`;
    const methods = parseMethods(src);
    assert.equal(methods.length, 1);
    assert.equal(methods[0].value, 'EVO_FRIENDSHIP');
  });

  it('sorts by numeric value of the define, not by line order', () => {
    const src = `
#define EVO_BEAUTY 100
#define EVO_LEVEL 1
#define EVO_ITEM 50
`;
    const methods = parseMethods(src);
    assert.deepEqual(
      methods.map((m) => m.value),
      ['EVO_LEVEL', 'EVO_ITEM', 'EVO_BEAUTY'],
    );
  });

  it('falls back to prettyLabel for unknown methods', () => {
    const src = `#define EVO_SOMETHING_NEW 42\n`;
    const methods = parseMethods(src);
    assert.equal(methods.length, 1);
    assert.equal(methods[0].value, 'EVO_SOMETHING_NEW');
    // NOTE: prettyLabel is run on the full identifier (no EVO_ stripping).
    // This is inconsistent with parseItems, which strips ITEM_. If you want
    // to fix that, the expected value here becomes 'Something New'.
    assert.equal(methods[0].label, 'Evo Something New');
  });
});

describe('parseItems', () => {
  it('parses and labels items by stripping ITEM_ and title-casing', () => {
    const src = `
#define ITEM_NONE 0
#define ITEM_LIST_END 9999
#define ITEM_POTION 13
#define ITEM_FIRE_STONE 14
#define ITEM_WATER_STONE 15
`;
    const items = parseItems(src);
    const values = items.map((i) => i.value);
    assert.ok(values.includes('ITEM_POTION'));
    assert.ok(values.includes('ITEM_FIRE_STONE'));
    assert.ok(values.includes('ITEM_WATER_STONE'));
    assert.ok(!values.includes('ITEM_NONE'));
    assert.ok(!values.includes('ITEM_LIST_END'));
    const potion = items.find((i) => i.value === 'ITEM_POTION')!;
    assert.equal(potion.label, 'Potion');
    assert.equal(potion.number, 13);
  });

  it('excludes items whose name is purely hex (e.g., ITEM_FF00)', () => {
    const src = `
#define ITEM_FF00 100
#define ITEM_POTION 13
`;
    const items = parseItems(src);
    const values = items.map((i) => i.value);
    assert.ok(!values.includes('ITEM_FF00'));
    assert.ok(values.includes('ITEM_POTION'));
  });

  it('excludes items whose label is a hex number', () => {
    const src = `
#define ITEM_A1 100
#define ITEM_POTION 13
`;
    const items = parseItems(src);
    const values = items.map((i) => i.value);
    assert.ok(!values.includes('ITEM_A1'));
    assert.ok(values.includes('ITEM_POTION'));
  });

  it('sorts items alphabetically by label', () => {
    const src = `
#define ITEM_POTION 1
#define ITEM_ANTIDOTE 2
#define ITEM_BERRY 3
`;
    const items = parseItems(src);
    assert.deepEqual(
      items.map((i) => i.label),
      ['Antidote', 'Berry', 'Potion'],
    );
  });
});
