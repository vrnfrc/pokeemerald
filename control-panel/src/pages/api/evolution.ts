import type { APIRoute } from 'astro';
import { readJsonFile, writeJsonFile, FILES } from '../../lib/files';

export const GET: APIRoute = async () => {
  try {
    const data = readJsonFile(FILES.evolution);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to read evolution.json' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    writeJsonFile(FILES.evolution, data);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to write evolution.json' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
