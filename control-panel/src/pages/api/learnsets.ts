import type { APIRoute } from 'astro';
import { createFsRepository } from '../../lib/repository';
import { createNodeFs, REPO_PATHS } from '../../lib/files';

export const prerender = false;

const repo = createFsRepository(createNodeFs(), REPO_PATHS);

export const GET: APIRoute = async () => {
  try {
    const learnsets = repo.loadLearnsets();
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
    const body = (await request.json()) as { learnsets?: unknown };
    if (!body.learnsets || typeof body.learnsets !== 'object') {
      return new Response(JSON.stringify({ error: 'Missing learnsets payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    repo.saveLearnsets(body.learnsets as Parameters<typeof repo.saveLearnsets>[0]);
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
