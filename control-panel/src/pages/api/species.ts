import type { APIRoute } from 'astro';
import { readJsonFile, writeJsonFile, FILES } from '../../lib/files';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const data = readJsonFile(FILES.species);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[GET /api/species]', error);
    return new Response(JSON.stringify({ error: `Failed to read species_info.json: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    writeJsonFile(FILES.species, data);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[POST /api/species]', error);
    return new Response(JSON.stringify({ error: `Failed to write species_info.json: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
