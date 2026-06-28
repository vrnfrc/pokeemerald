import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { readJsonFile, writeJsonFile, FILES } from '../../lib/files';

const POKEEMERALD_ROOT = path.resolve(process.cwd(), '..');

export const prerender = false;

function prettyLabel(ident: string): string {
  return ident
    .split('_')
    .map(w => w ? w.charAt(0) + w.slice(1).toLowerCase() : w)
    .join(' ');
}

// Friendly labels for evolution methods. "Evo Level Silcoon" is a developer
// identifier; in the editor we want plain English ("Level (Silcoon)").
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

function parseMethods(): { value: string; label: string }[] {
  const src = fs.readFileSync(path.join(POKEEMERALD_ROOT, 'include/constants/pokemon.h'), 'utf8');
  const re = /^#define\s+(EVO_[A-Z0-9_]+)\s+(\d+)/gm;
  const entries: { value: string; label: string; order: number }[] = [];
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    // EVO_MODE_* are evolution scene modes (NORMAL / TRADE / ITEM_USE /
    // ITEM_CHECK), not evolution methods. Exclude them from the dropdown.
    if (name.startsWith('EVO_MODE_')) continue;
    const label = METHOD_LABELS[name] ?? prettyLabel(name);
    entries.push({ value: name, label, order: parseInt(m[2]) });
  }
  return entries.sort((a, b) => a.order - b.order).map(({ value, label }) => ({ value, label }));
}

function parseItems(): { value: string; label: string; number: number }[] {
  const src = fs.readFileSync(path.join(POKEEMERALD_ROOT, 'include/constants/items.h'), 'utf8');
  const re = /^#define\s+(ITEM_[A-Z0-9_]+)\s+(\d+)/gm;
  const items: { value: string; label: string; number: number }[] = [];
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

export const GET: APIRoute = async () => {
  try {
    const data = readJsonFile(FILES.evolution) as { _widths?: any; evolutions: any[] };
    const methods = parseMethods();
    const items = parseItems();
    return new Response(JSON.stringify({ ...data, methods, items }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[GET /api/evolution]', error);
    return new Response(JSON.stringify({ error: `Failed to read evolution data: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { _widths?: any; evolutions: any[] };
    writeJsonFile(FILES.evolution, { _widths: body._widths ?? { label: 20 }, evolutions: body.evolutions });
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[POST /api/evolution]', error);
    return new Response(JSON.stringify({ error: `Failed to write evolution data: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
