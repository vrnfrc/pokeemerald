import type { APIRoute } from 'astro';
import { getAllTrainerMetadata } from '../../../lib/trainerMetadata';

export const prerender = false;

export const GET: APIRoute = async () => {
  const metadata = getAllTrainerMetadata();
  const metadataArray = Array.from(metadata.entries()).map(([id, data]) => ({
    id,
    trainerClass: data.trainerClass,
    trainerClassName: data.trainerClassName,
    trainerPic: data.trainerPic,
    trainerName: data.trainerName,
    items: data.items,
    doubleBattle: data.doubleBattle,
    aiFlags: data.aiFlags,
  }));
  return new Response(JSON.stringify({ metadata: metadataArray }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
