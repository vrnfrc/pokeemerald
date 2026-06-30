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

  const mapsWithTrainers: { mapName: string; trainers: any[]; challenges: any[] }[] = [];

  for (const map of itineraryPart.maps) {
    if (typeof map === 'string') continue;
    
    const hasTrainers = map.trainers && map.trainers.length > 0;
    const hasChallenges = map.challenges && map.challenges.length > 0;
    
    if (!hasTrainers && !hasChallenges) continue;

    let trainerGroups: any[] = [];
    let challengeGroups: any[] = [];

    if (hasTrainers) {
      const trainerDisplays = getTrainersForIds(map.trainers, []);
      trainerGroups = groupTrainersByBaseName(trainerDisplays);
    }

    if (hasChallenges) {
      const challengeDisplays = getTrainersForIds(map.challenges!, map.challenges!);
      challengeGroups = groupTrainersByBaseName(challengeDisplays);
    }

    if (trainerGroups.length > 0 || challengeGroups.length > 0) {
      mapsWithTrainers.push({
        mapName: map.name,
        trainers: trainerGroups,
        challenges: challengeGroups,
      });
    }
  }

  return new Response(JSON.stringify({ maps: mapsWithTrainers }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
