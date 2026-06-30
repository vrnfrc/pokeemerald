import fs from 'node:fs';
import path from 'node:path';
import type { ItineraryFile, ItineraryPart, ItineraryMap } from './trainerTypes';

const POKEEMERALD_ROOT = path.resolve(process.cwd(), '..');
const ITINERARY_JSON_PATH = path.join(POKEEMERALD_ROOT, 'docs/itinerary.jsonc');

let cachedItinerary: ItineraryFile | null = null;

function stripJsonComments(src: string): string {
  return src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

export function loadItinerary(): ItineraryFile {
  if (cachedItinerary) return cachedItinerary;
  const src = fs.readFileSync(ITINERARY_JSON_PATH, 'utf-8');
  const cleaned = stripJsonComments(src);
  const data = JSON.parse(cleaned);

  if (Array.isArray(data)) {
    cachedItinerary = { parts: data };
  } else if (data.parts) {
    cachedItinerary = data;
  } else {
    cachedItinerary = { parts: [] };
  }

  return cachedItinerary!;
}

export function getPart(partIndex: number): ItineraryPart | null {
  const itinerary = loadItinerary();
  if (partIndex < 0 || partIndex >= itinerary.parts.length) return null;
  return itinerary.parts[partIndex];
}

export function getTrainersForPart(partIndex: number): { trainers: string[]; challenges: string[] } {
  const part = getPart(partIndex);
  if (!part) return { trainers: [], challenges: [] };

  const allTrainers: string[] = [];
  const challenges = part.challenges || [];

  for (const map of part.maps) {
    if (typeof map === 'string') {
      continue;
    }
    if (map.trainers) {
      allTrainers.push(...map.trainers);
    }
  }

  return { trainers: allTrainers, challenges };
}

export function getTrainersForMap(mapName: string): { trainers: string[]; challenges: string[] } {
  const itinerary = loadItinerary();
  const allTrainers: string[] = [];
  const challenges: string[] = [];

  for (const part of itinerary.parts) {
    for (const map of part.maps) {
      if (typeof map === 'string') continue;
      if (map.name === mapName && map.trainers) {
        allTrainers.push(...map.trainers);
        if (part.challenges) {
          for (const trainerId of map.trainers) {
            if (part.challenges.includes(trainerId)) {
              challenges.push(trainerId);
            }
          }
        }
      }
    }
  }

  return { trainers: allTrainers, challenges };
}

export function getAllMaps(): string[] {
  const itinerary = loadItinerary();
  const maps = new Set<string>();

  for (const part of itinerary.parts) {
    for (const map of part.maps) {
      if (typeof map === 'string') {
        maps.add(map);
      } else {
        maps.add(map.name);
      }
    }
  }

  return Array.from(maps);
}

export function clearItineraryCache(): void {
  cachedItinerary = null;
}
