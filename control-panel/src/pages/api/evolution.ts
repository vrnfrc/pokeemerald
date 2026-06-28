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

function parseMethods(): { value: string; label: string }[] {
  const src = fs.readFileSync(path.join(POKEEMERALD_ROOT, 'include/constants/pokemon.h'), 'utf8');
  const re = /^#define\s+(EVO_[A-Z0-9_]+)\s+(\d+)/gm;
  const entries: { value: string; label: string; order: number }[] = [];
  let m;
  while ((m = re.exec(src))) {
    entries.push({ value: m[1], label: prettyLabel(m[1]), order: parseInt(m[2]) });
  }
  return entries.sort((a, b) => a.order - b.order).map(({ value, label }) => ({ value, label }));
}

function parseItems(): { value: string; label: string }[] {
  const src = fs.readFileSync(path.join(POKEEMERALD_ROOT, 'include/constants/items.h'), 'utf8');
  const re = /^#define\s+(ITEM_[A-Z0-9_]+)\s+(\d+)/gm;
  const items: string[] = [];
  let m;
  while ((m = re.exec(src))) items.push(m[1]);
  return items
    .filter(i => i !== 'ITEM_NONE' && i !== 'ITEM_LIST_END')
    .filter(i => !/^ITEM_[0-9A-F]+$/.test(i))
    .map(i => ({ value: i, label: prettyLabel(i.replace(/^ITEM_/, '')) }))
    .filter(o => !/^[0-9a-f]{2,4}$/i.test(o.label))
    .sort((a, b) => a.label.localeCompare(b.label));
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
