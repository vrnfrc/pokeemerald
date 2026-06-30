import type { APIRoute } from 'astro';
import { loadItinerary } from '../../lib/itineraryTrainerLoader';

export const prerender = false;

export const GET: APIRoute = async () => {
  const itinerary = loadItinerary();
  
  const parts = itinerary.parts.map((part: any, index: number) => {
    const mapNames = part.maps.map((m: any) => typeof m === 'string' ? m : m.name);
    const hasChallenges = part.maps.some((m: any) => 
      typeof m !== 'string' && m.challenges && m.challenges.length > 0
    );
    
    return {
      part: index + 1,
      maps: mapNames,
      difficulty: part.difficulty,
      hasChallenges,
      unlocks: part.unlocks,
      unlockedBy: part.unlockedBy ? 
        (Array.isArray(part.unlockedBy) ? part.unlockedBy : [part.unlockedBy]) : 
        undefined
    };
  });

  return new Response(JSON.stringify({ parts }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
