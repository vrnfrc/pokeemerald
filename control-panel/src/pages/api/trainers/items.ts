import type { APIRoute } from 'astro';
import { getItemOptions } from '../../../lib/itemsData';

export const prerender = false;

export const GET: APIRoute = async () => {
  const items = getItemOptions();
  return new Response(JSON.stringify({ items }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
