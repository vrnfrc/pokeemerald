import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { createFsRepository, parseItems, parseMethods } from '../../lib/repository';
import { POKEEMERALD_ROOT, createNodeFs, REPO_PATHS } from '../../lib/files';

export const prerender = false;

const repo = createFsRepository(createNodeFs(), REPO_PATHS);

function readHeader(relativePath: string): string {
  return fs.readFileSync(path.join(POKEEMERALD_ROOT, relativePath), 'utf8');
}

export const GET: APIRoute = async () => {
  try {
    const data = repo.loadEvolution();
    const methods = parseMethods(readHeader('include/constants/pokemon.h'));
    const items = parseItems(readHeader('include/constants/items.h'));
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
    const body = (await request.json()) as { _widths?: { label?: number }; evolutions?: unknown };
    if (!Array.isArray(body.evolutions)) {
      return new Response(JSON.stringify({ error: 'Missing evolutions payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    repo.saveEvolution({
      _widths: { label: body._widths?.label ?? 20 },
      evolutions: body.evolutions as Parameters<typeof repo.saveEvolution>[0]['evolutions'],
    });
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
