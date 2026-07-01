import type { APIRoute } from 'astro';
import { getTrainerParty, updateTrainerParty, loadTrainerParties, saveTrainerParties } from '../../../lib/trainerRepository';
import { getTrainerDisplay } from '../../../lib/trainerRepository';
import { getTrainersForPart } from '../../../lib/itineraryTrainerLoader';
import type { TrainerPartyType, TrainerPokemon } from '../../../lib/trainerTypes';
import { validateIV, validateLevel } from '../../../lib/trainerTypes';
import { MOVE_LIST } from '../../../lib/movesData';
import { loadItems } from '../../../lib/itemsData';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const name = params.name;
  if (!name) {
    return new Response('Missing trainer name', { status: 400 });
  }

  const trainer = getTrainerDisplay(name);
  if (!trainer) {
    return new Response('Trainer not found', { status: 404 });
  }

  return new Response(JSON.stringify({ trainer }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const name = params.name;
  if (!name) {
    return new Response('Missing trainer name', { status: 400 });
  }

  const party = getTrainerParty(name);
  if (!party) {
    return new Response('Trainer not found', { status: 404 });
  }

  const body = await request.json();
  const updates: Partial<typeof party> = {};

  if (body.type !== undefined) {
    const validTypes: TrainerPartyType[] = [
      'TrainerMonNoItemDefaultMoves',
      'TrainerMonNoItemCustomMoves',
      'TrainerMonItemDefaultMoves',
      'TrainerMonItemCustomMoves',
    ];
    if (!validTypes.includes(body.type)) {
      return new Response('Invalid trainer type', { status: 400 });
    }
    updates.type = body.type;
  }

  if (body.pokemon !== undefined) {
    if (!Array.isArray(body.pokemon)) {
      return new Response('Pokemon must be an array', { status: 400 });
    }

    const items = loadItems();
    const validItemValues = items.map((i) => i.value);

    const validatedPokemon: TrainerPokemon[] = [];
    for (const p of body.pokemon) {
      if (!validateIV(p.iv)) {
        return new Response(`Invalid IV: ${p.iv}`, { status: 400 });
      }
      if (!validateLevel(p.lvl)) {
        return new Response(`Invalid level: ${p.lvl}`, { status: 400 });
      }
      if (!p.species || typeof p.species !== 'string') {
        return new Response(`Invalid species: ${p.species}`, { status: 400 });
      }

      const pokemon: TrainerPokemon = {
        iv: p.iv,
        lvl: p.lvl,
        species: p.species,
      };

      if (p.heldItem !== undefined) {
        if (p.heldItem !== 'NONE' && !validItemValues.includes(p.heldItem)) {
          return new Response(`Invalid held item: ${p.heldItem}`, { status: 400 });
        }
        pokemon.heldItem = p.heldItem;
      }

      if (p.moves !== undefined) {
        if (!Array.isArray(p.moves) || p.moves.length > 4) {
          return new Response('Moves must be an array of max 4 items', { status: 400 });
        }
        for (const move of p.moves) {
          if (move !== 'NONE' && !MOVE_LIST.includes(move)) {
            return new Response(`Invalid move: ${move}`, { status: 400 });
          }
        }
        pokemon.moves = p.moves;
      }

      validatedPokemon.push(pokemon);
    }
    updates.pokemon = validatedPokemon;
  }

  if (body.items !== undefined) {
    if (!Array.isArray(body.items)) {
      return new Response('Items must be an array', { status: 400 });
    }
    const items = loadItems();
    const validItemValues = items.map((i) => i.value);
    const validatedItems: string[] = [];
    for (const item of body.items) {
      if (item !== 'NONE' && !validItemValues.includes(item)) {
        return new Response(`Invalid item: ${item}`, { status: 400 });
      }
      validatedItems.push(item);
    }
    updates.trainerItems = validatedItems;
  }

  const newParties = updateTrainerParty(name, updates);
  saveTrainerParties(newParties);

  const updatedTrainer = getTrainerDisplay(name);
  return new Response(JSON.stringify({ trainer: updatedTrainer }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
