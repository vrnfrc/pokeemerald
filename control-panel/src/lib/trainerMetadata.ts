import fs from 'node:fs';
import path from 'node:path';
import type { TrainerMetadata } from './trainerTypes';

const POKEEMERALD_ROOT = path.resolve(process.cwd(), '..');
const TRAINERS_H_PATH = path.join(POKEEMERALD_ROOT, 'src/data/trainers.h');
const TRAINER_CLASS_NAMES_H_PATH = path.join(POKEEMERALD_ROOT, 'src/data/text/trainer_class_names.h');

let cachedMetadata: Map<string, TrainerMetadata> | null = null;
let cachedClassNames: Map<string, string> | null = null;

function parseTrainerClassNames(src: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /\[(TRAINER_CLASS_[A-Z0-9_]+)\]\s*=\s*_\("([^"]+)"\)/g;
  let m;
  while ((m = re.exec(src))) {
    map.set(m[1], m[2]);
  }
  return map;
}

function loadTrainerClassNames(): Map<string, string> {
  if (cachedClassNames) return cachedClassNames;
  const src = fs.readFileSync(TRAINER_CLASS_NAMES_H_PATH, 'utf-8');
  cachedClassNames = parseTrainerClassNames(src);
  return cachedClassNames;
}

function parseItems(itemsStr: string): string[] {
  const items: string[] = [];
  const re = /ITEM_([A-Z0-9_]+)/g;
  let m;
  while ((m = re.exec(itemsStr))) {
    const item = `ITEM_${m[1]}`;
    if (item !== 'ITEM_NONE') {
      items.push(item);
    }
  }
  return items;
}

function parseTrainers(src: string): Map<string, TrainerMetadata> {
  const map = new Map<string, TrainerMetadata>();
  const classNames = loadTrainerClassNames();

  const trainerRegex = /\[(TRAINER_[A-Z0-9_]+)\]\s*=\s*\{/g;
  let trainerMatch;

  while ((trainerMatch = trainerRegex.exec(src))) {
    const trainerId = trainerMatch[1];
    const startIndex = trainerMatch.index + trainerMatch[0].length;
    
    // Find the matching closing brace by counting brace depth
    let depth = 1;
    let endIndex = startIndex;
    while (depth > 0 && endIndex < src.length) {
      if (src[endIndex] === '{') depth++;
      else if (src[endIndex] === '}') depth--;
      endIndex++;
    }
    
    if (depth !== 0) continue; // Unbalanced braces, skip
    
    const body = src.substring(startIndex, endIndex - 1);

    if (trainerId === 'TRAINER_NONE') continue;

    const classMatch = body.match(/\.trainerClass\s*=\s*(TRAINER_CLASS_[A-Z0-9_]+)/);
    const picMatch = body.match(/\.trainerPic\s*=\s*(TRAINER_PIC_[A-Z0-9_]+)/);
    const nameMatch = body.match(/\.trainerName\s*=\s*_\("([^"]+)"\)/);
    const itemsMatch = body.match(/\.items\s*=\s*\{([^}]*)\}/);
    const doubleBattleMatch = body.match(/\.doubleBattle\s*=\s*(TRUE|FALSE)/);
    const aiFlagsMatch = body.match(/\.aiFlags\s*=\s*([^,\n]+)/);

    const trainerClass = classMatch ? classMatch[1] : 'TRAINER_CLASS_PKMN_TRAINER_1';
    const trainerClassName = classNames.get(trainerClass) || 'Trainer';
    const trainerPic = picMatch ? picMatch[1] : 'TRAINER_PIC_HIKER';
    const trainerName = nameMatch ? nameMatch[1] : '';
    const items = itemsMatch ? parseItems(itemsMatch[1]) : [];
    const doubleBattle = doubleBattleMatch ? doubleBattleMatch[1] === 'TRUE' : false;
    const aiFlags = aiFlagsMatch ? aiFlagsMatch[1].trim() : '0';

    map.set(trainerId, {
      trainerClass,
      trainerClassName,
      trainerPic,
      trainerName,
      items,
      doubleBattle,
      aiFlags: parseInt(aiFlags) || 0,
    });
  }

  return map;
}

export function loadTrainerMetadata(): Map<string, TrainerMetadata> {
  if (cachedMetadata) return cachedMetadata;
  const src = fs.readFileSync(TRAINERS_H_PATH, 'utf-8');
  cachedMetadata = parseTrainers(src);
  return cachedMetadata;
}

export function getTrainerMetadata(trainerId: string): TrainerMetadata | null {
  const metadata = loadTrainerMetadata();
  return metadata.get(trainerId) || null;
}

export function getAllTrainerMetadata(): Map<string, TrainerMetadata> {
  return loadTrainerMetadata();
}

export function trainerIdToPartyName(trainerId: string): string {
  const name = trainerId.replace(/^TRAINER_/, '');
  const parts = name.split('_');
  if (parts.length === 0) return name;

  const lastPart = parts[parts.length - 1];
  if (/^\d+$/.test(lastPart)) {
    const baseParts = parts.slice(0, -1);
    const baseName = baseParts.map(p => p.charAt(0) + p.slice(1).toLowerCase()).join('');
    return baseName + lastPart;
  }
  return parts.map(p => p.charAt(0) + p.slice(1).toLowerCase()).join('');
}
