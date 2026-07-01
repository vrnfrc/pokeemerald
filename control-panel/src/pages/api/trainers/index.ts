import type { APIRoute } from 'astro';
import { getPart } from '../../../lib/itineraryTrainerLoader';
import { getTrainersForIds, groupTrainersByBaseName, groupRivalTrainers, isRivalTrainer } from '../../../lib/trainerRepository';
import { trainerIdToPartyName } from '../../../lib/trainerMetadata';
import { parseTrainerName } from '../../../lib/trainerTypes';

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
    const hasRematches = map.rematches && map.rematches.length > 0;
    
    if (!hasTrainers && !hasChallenges) continue;

    let trainerGroups: any[] = [];
    let challengeGroups: any[] = [];

    if (hasTrainers || hasChallenges) {
      // Extract trainer and challenge IDs
      const trainerIds = hasTrainers ? map.trainers.map(t => t.id) : [];
      const challengeIds = hasChallenges ? map.challenges.map(t => t.id) : [];
      
      // Get base names for trainers and challenges
      const trainerBaseNames = new Set(trainerIds.map(id => {
        const partyName = trainerIdToPartyName(id);
        return parseTrainerName(partyName).baseName;
      }));
      
      const challengeBaseNames = new Set(challengeIds.map(id => {
        const partyName = trainerIdToPartyName(id);
        return parseTrainerName(partyName).baseName;
      }));
      
      // Separate rematches into trainer rematches and challenge rematches
      const trainerRematchIds: string[] = [];
      const challengeRematchIds: string[] = [];
      
      if (hasRematches) {
        for (const rematch of map.rematches) {
          const partyName = trainerIdToPartyName(rematch.id);
          const { baseName } = parseTrainerName(partyName);
          
          if (trainerBaseNames.has(baseName)) {
            trainerRematchIds.push(rematch.id);
          } else if (challengeBaseNames.has(baseName)) {
            challengeRematchIds.push(rematch.id);
          }
        }
      }
      
      // Combine trainers with their rematches
      const allTrainerIds = [...trainerIds, ...trainerRematchIds];
      const trainerDisplays = getTrainersForIds(allTrainerIds, []);
      
      const rivalTrainers = trainerDisplays.filter(t => isRivalTrainer(t.baseName));
      const regularTrainers = trainerDisplays.filter(t => !isRivalTrainer(t.baseName));
      
      const regularGroups = groupTrainersByBaseName(regularTrainers);
      const rivalGroups = groupRivalTrainers(rivalTrainers);
      
      trainerGroups = [...regularGroups, ...rivalGroups];
      
      // Combine challenges with their rematches
      const allChallengeIds = [...challengeIds, ...challengeRematchIds];
      const challengeDisplays = getTrainersForIds(allChallengeIds, allChallengeIds);
      
      const rivalChallenges = challengeDisplays.filter(t => isRivalTrainer(t.baseName));
      const regularChallenges = challengeDisplays.filter(t => !isRivalTrainer(t.baseName));
      
      const regularChallengeGroups = groupTrainersByBaseName(regularChallenges);
      const rivalChallengeGroups = groupRivalTrainers(rivalChallenges);
      
      challengeGroups = [...regularChallengeGroups, ...rivalChallengeGroups];
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
