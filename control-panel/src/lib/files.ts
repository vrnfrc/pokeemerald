import fs from 'node:fs';
import path from 'node:path';
import type { RepoFs, RepoPaths } from './repository';

export const POKEEMERALD_ROOT = path.resolve(process.cwd(), '..');

export const REPO_PATHS: RepoPaths = {
  species: 'src/data/pokemon/species_info.json',
  evolution: 'src/data/pokemon/evolution.json',
  levelup: 'src/data/pokemon/level_up_learnsets.json',
  tmhm: 'src/data/pokemon/tmhm_learnsets.json',
};

export const FILES = REPO_PATHS;

export function createNodeFs(rootDir: string = POKEEMERALD_ROOT): RepoFs {
  return {
    readJson(p: string): unknown {
      const fullPath = path.join(rootDir, p);
      return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    },
    writeJson(p: string, data: unknown): void {
      const fullPath = path.join(rootDir, p);
      fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    },
  };
}

export function readJsonFile(relativePath: string): unknown {
  return createNodeFs().readJson(relativePath);
}

export function writeJsonFile(relativePath: string, data: unknown): void {
  createNodeFs().writeJson(relativePath, data);
}
