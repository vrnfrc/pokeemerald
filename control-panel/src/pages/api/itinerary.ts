import type { APIRoute } from 'astro';
import { loadItinerary } from '../../lib/itineraryTrainerLoader';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

const ITINERARY_PATH = path.join(process.cwd(), '..', 'docs', 'itinerary.jsonc');

export const GET: APIRoute = async () => {
  const itinerary = loadItinerary();
  
  const parts = itinerary.parts.map((part: any, index: number) => {
    const mapNames = part.maps.map((m: any) => typeof m === 'string' ? m : m.name);
    const mapsWithChallenges = part.maps
      .filter((m: any) => typeof m !== 'string' && m.challenges && m.challenges.length > 0)
      .map((m: any) => m.name);
    const hasChallenges = mapsWithChallenges.length > 0;
    
    return {
      part: index + 1,
      maps: mapNames,
      mapsWithChallenges,
      difficulty: part.difficulty,
      hasChallenges,
      unlocks: part.unlocks,
      unlockedBy: part.unlockedBy ? 
        (Array.isArray(part.unlockedBy) ? part.unlockedBy : [part.unlockedBy]) : 
        undefined,
      done: part.done ?? false
    };
  });

  return new Response(JSON.stringify({ parts }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { partIndex, done } = body;
    
    if (typeof partIndex !== 'number' || typeof done !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const content = fs.readFileSync(ITINERARY_PATH, 'utf8');
    const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const itinerary = JSON.parse(jsonContent);
    
    if (partIndex < 0 || partIndex >= itinerary.length) {
      return new Response(JSON.stringify({ error: 'Part index out of range' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    itinerary[partIndex].done = done;
    
    fs.writeFileSync(ITINERARY_PATH, JSON.stringify(itinerary, null, 4));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to update itinerary:', error);
    return new Response(JSON.stringify({ error: 'Failed to update itinerary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
