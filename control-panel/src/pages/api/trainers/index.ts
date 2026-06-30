import type { APIRoute } from 'astro';
import { getTrainersForPart } from '../../../lib/itineraryTrainerLoader';
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

  const { trainers, challenges } = getTrainersForPart(part);
  const trainerDisplays = getTrainersForIds(trainers, challenges);
  const groups = groupTrainersByBaseName(trainerDisplays);

  return new Response(JSON.stringify({ groups }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
