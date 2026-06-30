import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const POKEEMERALD_ROOT = path.resolve(process.cwd(), '..');
const TRAINER_SPRITE_DIR = path.join(POKEEMERALD_ROOT, 'graphics/trainers/front_pics');

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const trainerPic = (params.trainerPic ?? '').toLowerCase();
  if (!/^[a-z0-9_]+$/.test(trainerPic)) {
    return new Response('Invalid trainer pic', { status: 400 });
  }

  const filePath = path.join(TRAINER_SPRITE_DIR, `${trainerPic}.png`);
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
