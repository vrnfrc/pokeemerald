import fs from 'node:fs';
import path from 'node:path';

const POKEEMERALD_ROOT = path.resolve(process.cwd(), '..');
const TRAINERS_JSON_PATH = path.join(POKEEMERALD_ROOT, 'src/data/trainers.json');

export interface TrainerJsonEntry {
  id: string;
  trainerClass?: string;
  encounterMusic_gender?: string;
  trainerPic?: string;
  trainerName?: string;
  items: string[];
  doubleBattle?: boolean;
  aiFlags?: string[];
  partySize?: number;
  party?: {
    type: string;
    name: string;
  } | null;
}

export interface TrainersJsonFile {
  trainers: TrainerJsonEntry[];
}

let cachedTrainers: TrainersJsonFile | null = null;

export function loadTrainersJson(): TrainersJsonFile {
  if (cachedTrainers) return cachedTrainers;
  const src = fs.readFileSync(TRAINERS_JSON_PATH, 'utf-8');
  cachedTrainers = JSON.parse(src) as TrainersJsonFile;
  return cachedTrainers;
}

export function saveTrainersJson(file: TrainersJsonFile): void {
  fs.writeFileSync(TRAINERS_JSON_PATH, JSON.stringify(file, null, 2) + '\n', 'utf-8');
  cachedTrainers = file;
}

export function getTrainerJsonEntry(trainerId: string): TrainerJsonEntry | null {
  const trainers = loadTrainersJson();
  return trainers.trainers.find((t) => t.id === trainerId) || null;
}

export function updateTrainerJsonEntry(
  trainerId: string,
  updates: { items?: string[]; partyType?: string }
): TrainersJsonFile {
  const trainers = loadTrainersJson();
  const newTrainers: TrainersJsonFile = {
    trainers: trainers.trainers.map((t) => {
      if (t.id !== trainerId) return t;
      const updated = { ...t };
      if (updates.items !== undefined) {
        updated.items = updates.items;
      }
      if (updates.partyType !== undefined && updated.party) {
        updated.party = { ...updated.party, type: updates.partyType };
      }
      return updated;
    }),
  };
  return newTrainers;
}

export function clearTrainersJsonCache(): void {
  cachedTrainers = null;
}

export function partyNameToTrainerId(partyName: string): string {
  const match = partyName.match(/^(.+?)(\d+)$/);
  if (match) {
    const baseName = match[1];
    const num = match[2];
    const snakeCase = baseName.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '');
    return `TRAINER_${snakeCase}_${num}`;
  }
  const snakeCase = partyName.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '');
  return `TRAINER_${snakeCase}`;
}
