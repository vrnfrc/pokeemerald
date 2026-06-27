import type { APIRoute } from 'astro';
import { readJsonFile, writeJsonFile, FILES } from '../../lib/files';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const levelup = readJsonFile(FILES.levelup);
    const tmhm = readJsonFile(FILES.tmhm);

    const learnsets: Record<string, { levelup: { level: number; move: string }[]; tmhm: string[] }> = {};
    for (const e of levelup.learnsets) {
      learnsets[e.species] = { levelup: e.moves, tmhm: [] };
    }
    for (const e of tmhm.learnsets) {
      if (!learnsets[e.species]) learnsets[e.species] = { levelup: [], tmhm: e.moves };
      else learnsets[e.species].tmhm = e.moves;
    }

    return new Response(JSON.stringify({ learnsets }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[GET /api/learnsets]', error);
    return new Response(JSON.stringify({ error: `Failed to read learnset data: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { learnsets } = await request.json() as { learnsets: Record<string, { levelup: any[]; tmhm: string[] }> };
    const levelupArr = Object.entries(learnsets).map(([species, e]) => ({ species, moves: e.levelup }));
    const tmhmArr = Object.entries(learnsets).map(([species, e]) => ({ species, moves: e.tmhm }));
    writeJsonFile(FILES.levelup, { learnsets: levelupArr });
    writeJsonFile(FILES.tmhm, { learnsets: tmhmArr });
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[POST /api/learnsets]', error);
    return new Response(JSON.stringify({ error: `Failed to write learnset data: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
