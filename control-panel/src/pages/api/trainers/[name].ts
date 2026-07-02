import type { APIRoute } from 'astro';
import { getTrainerParty, updateTrainerParty, loadTrainerParties, saveTrainerParties } from '../../../lib/trainerRepository';
import { getTrainerDisplay } from '../../../lib/trainerRepository';
import { getTrainersForPart } from '../../../lib/itineraryTrainerLoader';
import type { TrainerPartyType, TrainerPokemon } from '../../../lib/trainerTypes';
import { validateIV, validateLevel } from '../../../lib/trainerTypes';
import { MOVE_LIST } from '../../../lib/movesData';
import { loadItems } from '../../../lib/itemsData';
import { updateTrainerJsonEntry, saveTrainersJson, partyNameToTrainerId } from '../../../lib/trainersJsonLoader';

const PARTY_TYPE_TO_TRAINERS_JSON: Record<TrainerPartyType, string> = {
  'TrainerMonNoItemDefaultMoves': 'NO_ITEM_DEFAULT_MOVES',
  'TrainerMonNoItemCustomMoves': 'NO_ITEM_CUSTOM_MOVES',
  'TrainerMonItemDefaultMoves': 'ITEM_DEFAULT_MOVES',
  'TrainerMonItemCustomMoves': 'ITEM_CUSTOM_MOVES',
};

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const name = params.name;
  if (!name) {
    return new Response(JSON.stringify({ error: 'Missing trainer name' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const trainer = getTrainerDisplay(name);
  if (!trainer) {
    return new Response(JSON.stringify({ error: 'Trainer not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ trainer }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const name = params.name;
  if (!name) {
    return new Response(JSON.stringify({ error: 'Missing trainer name' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const party = getTrainerParty(name);
  if (!party) {
    return new Response(JSON.stringify({ error: 'Trainer not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const partyUpdates: Partial<typeof party> = {};
  let trainersJsonItems: string[] | undefined;
  let trainersJsonType: string | undefined;

  if (body.type !== undefined) {
    const validTypes: TrainerPartyType[] = [
      'TrainerMonNoItemDefaultMoves',
      'TrainerMonNoItemCustomMoves',
      'TrainerMonItemDefaultMoves',
      'TrainerMonItemCustomMoves',
    ];
    if (!validTypes.includes(body.type)) {
      return new Response(JSON.stringify({ error: 'Invalid trainer type' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    partyUpdates.type = body.type;
    trainersJsonType = PARTY_TYPE_TO_TRAINERS_JSON[body.type];
  }

  if (body.pokemon !== undefined) {
    if (!Array.isArray(body.pokemon)) {
      return new Response(JSON.stringify({ error: 'Pokemon must be an array' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const items = loadItems();
    const validItemValues = items.map((i) => i.value);

    const validatedPokemon: TrainerPokemon[] = [];
    for (const p of body.pokemon) {
      if (!validateIV(p.iv)) {
        return new Response(JSON.stringify({ error: `Invalid IV: ${p.iv}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      if (!validateLevel(p.lvl)) {
        return new Response(JSON.stringify({ error: `Invalid level: ${p.lvl}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      if (!p.species || typeof p.species !== 'string') {
        return new Response(JSON.stringify({ error: `Invalid species: ${p.species}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const pokemon: TrainerPokemon = {
        iv: p.iv,
        lvl: p.lvl,
        species: p.species,
      };

      if (p.heldItem !== undefined) {
        const normalizedItem = p.heldItem === 'NONE' ? 'NONE' : (p.heldItem.startsWith('ITEM_') ? p.heldItem : `ITEM_${p.heldItem}`);
        if (normalizedItem !== 'NONE' && !validItemValues.includes(normalizedItem)) {
          return new Response(JSON.stringify({ error: `Invalid held item: ${p.heldItem}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        pokemon.heldItem = normalizedItem === 'NONE' ? 'NONE' : normalizedItem.replace(/^ITEM_/, '');
      }

      if (p.moves !== undefined) {
        if (!Array.isArray(p.moves) || p.moves.length > 4) {
          return new Response(JSON.stringify({ error: 'Moves must be an array of max 4 items' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        for (const move of p.moves) {
          if (move === 'NONE') continue;
          const moveWithPrefix = move.startsWith('MOVE_') ? move : `MOVE_${move}`;
          if (!MOVE_LIST.includes(moveWithPrefix)) {
            return new Response(JSON.stringify({ error: `Invalid move: ${move}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
          }
        }
        pokemon.moves = p.moves;
      }

      validatedPokemon.push(pokemon);
    }
    partyUpdates.pokemon = validatedPokemon;
  }

  if (body.items !== undefined) {
    if (!Array.isArray(body.items)) {
      return new Response(JSON.stringify({ error: 'Items must be an array' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const items = loadItems();
    const validItemValues = items.map((i) => i.value);
    const validatedItems: string[] = [];
    for (const item of body.items) {
      if (item !== 'NONE' && item !== 'ITEM_NONE' && !validItemValues.includes(item)) {
        return new Response(JSON.stringify({ error: `Invalid item: ${item}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      validatedItems.push(item);
    }
    trainersJsonItems = validatedItems;
  }

  if (Object.keys(partyUpdates).length > 0) {
    const newParties = updateTrainerParty(name, partyUpdates);
    saveTrainerParties(newParties);
  }

  if (trainersJsonItems !== undefined || trainersJsonType !== undefined) {
    const trainerId = partyNameToTrainerId(name);
    const newTrainers = updateTrainerJsonEntry(trainerId, {
      items: trainersJsonItems,
      partyType: trainersJsonType,
    });
    saveTrainersJson(newTrainers);
  }

  const updatedTrainer = getTrainerDisplay(name);
  return new Response(JSON.stringify({ trainer: updatedTrainer }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
