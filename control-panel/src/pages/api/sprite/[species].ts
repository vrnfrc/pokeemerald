import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const POKEEMERALD_ROOT = path.resolve(process.cwd(), '..');
const SPRITE_DIR = path.join(POKEEMERALD_ROOT, 'graphics', 'pokemon');

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const species = (params.species ?? '').toLowerCase();
  if (!/^[a-z0-9_]+$/.test(species)) {
    return new Response('Invalid species', { status: 400 });
  }

  const filePath = path.join(SPRITE_DIR, species, 'front.png');
  try {
    const data = readFileSync(filePath);
    return new Response(data, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
