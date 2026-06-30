import fs from 'node:fs';
import path from 'node:path';

const POKEEMERALD_ROOT = path.resolve(process.cwd(), '..');
const ITEMS_H_PATH = path.join(POKEEMERALD_ROOT, 'include/constants/items.h');

export interface ItemOption {
  value: string;
  label: string;
  number: number;
}

let cachedItems: ItemOption[] | null = null;

function prettyLabel(ident: string): string {
  return ident
    .replace(/^ITEM_/, '')
    .split('_')
    .map((w) => (w ? w.charAt(0) + w.slice(1).toLowerCase() : w))
    .join(' ');
}

export function parseItems(src: string): ItemOption[] {
  const re = /^#define\s+(ITEM_[A-Z0-9_]+)\s+(\d+)/gm;
  const items: ItemOption[] = [];
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    const number = parseInt(m[2]);
    if (name === 'ITEM_NONE' || name === 'ITEM_LIST_END') continue;
    if (/^ITEM_[0-9A-F]+$/.test(name)) continue;
    const label = prettyLabel(name);
    if (/^[0-9a-f]{2,4}$/i.test(label)) continue;
    items.push({ value: name, label, number });
  }
  return items.sort((a, b) => a.label.localeCompare(b.label));
}

export function loadItems(): ItemOption[] {
  if (cachedItems) return cachedItems;
  const src = fs.readFileSync(ITEMS_H_PATH, 'utf-8');
  cachedItems = parseItems(src);
  return cachedItems;
}

export function getItemOptions(): ItemOption[] {
  const items = loadItems();
  return [{ value: 'NONE', label: 'None', number: 0 }, ...items];
}

export function validateItem(item: string, validItems: string[]): boolean {
  return item === 'NONE' || validItems.includes(item);
}
