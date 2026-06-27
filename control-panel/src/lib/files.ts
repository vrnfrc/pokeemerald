import fs from 'node:fs';
import path from 'node:path';

const POKEEMERALD_ROOT = path.resolve(process.cwd(), '..');

export function readJsonFile(relativePath: string): any {
  const fullPath = path.join(POKEEMERALD_ROOT, relativePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

export function writeJsonFile(relativePath: string, data: any): void {
  const fullPath = path.join(POKEEMERALD_ROOT, relativePath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export const FILES = {
  species: 'src/data/pokemon/species_info.json',
  evolution: 'src/data/pokemon/evolution.json',
  levelup: 'src/data/pokemon/level_up_learnsets.json',
  tmhm: 'src/data/pokemon/tmhm_learnsets.json',
} as const;
