import type { APIRoute } from 'astro';
import { getPart } from '../../../lib/itineraryTrainerLoader';
import { getTrainersForIds, groupTrainersByBaseName } from '../../../lib/trainerRepository';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const partIndex = url.searchParams.get('part');
  if (!partIndex) {
    return new Response('Missing part parameter', { status: 400 });
  }

  const part = parseInt(partIndex);
  if (isNaN(part)) {
    return new Response('Invalid part parameter', { status: 400 });
  }

  const itineraryPart = getPart(part);
  if (!itineraryPart) {
    return new Response('Part not found', { status: 404 });
  }

  const challenges = itineraryPart.challenges || [];
  const mapsWithTrainers: { mapName: string; trainers: any[] }[] = [];

  for (const map of itineraryPart.maps) {
    if (typeof map === 'string') continue;
    if (!map.trainers || map.trainers.length === 0) continue;

    const trainerDisplays = getTrainersForIds(map.trainers, challenges);
    const groups = groupTrainersByBaseName(trainerDisplays);

    if (groups.length > 0) {
      mapsWithTrainers.push({
        mapName: map.name,
        trainers: groups,
      });
    }
  }

  return new Response(JSON.stringify({ maps: mapsWithTrainers }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
