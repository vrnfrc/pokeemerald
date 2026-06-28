<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { speciesData, selectedPokemon } from '../lib/speciesState';
  import { MOVE_NAME_MAP, MOVE_LIST, TM_LIST, HM_LIST } from '../lib/movesData';
  import { ABILITY_OPTIONS } from '../lib/abilitiesData';
  import { hoennDexOrder } from '../lib/hoennDex';
  import {
    addLevelupMove,
    addEvolution,
    findEvoRoot,
    paramType,
    removeEvolution,
    removeLevelupMove,
    setEvolutionMethod,
    setEvolutionParam,
    setEvolutionTarget,
    setLevelupLevel,
    setLevelupMove,
    sortLevelup,
    toggleTmhm,
  } from '../lib/repository';
  import type {
    EvolutionFile,
    EvolutionTarget,
    ItemOption,
    LearnsetsView,
    LearnsetsViewEntry,
    SpeciesEntry,
  } from '../lib/types';

  interface SpeciesPayload {
    species: SpeciesEntry[];
  }

  type StatusKind = 'success' | 'error' | null;

  const typeOptions: { value: string; label: string; color: string }[] = [
    { value: 'TYPE_NORMAL', label: 'Normal', color: '#A8A878' },
    { value: 'TYPE_FIGHTING', label: 'Fighting', color: '#C03028' },
    { value: 'TYPE_FLYING', label: 'Flying', color: '#A890F0' },
    { value: 'TYPE_POISON', label: 'Poison', color: '#A040A0' },
    { value: 'TYPE_GROUND', label: 'Ground', color: '#E0C068' },
    { value: 'TYPE_ROCK', label: 'Rock', color: '#B8A038' },
    { value: 'TYPE_BUG', label: 'Bug', color: '#A8B820' },
    { value: 'TYPE_GHOST', label: 'Ghost', color: '#705898' },
    { value: 'TYPE_STEEL', label: 'Steel', color: '#B8B8D0' },
    { value: 'TYPE_MYSTERY', label: 'Mystery', color: '#68A090' },
    { value: 'TYPE_FIRE', label: 'Fire', color: '#F08030' },
    { value: 'TYPE_WATER', label: 'Water', color: '#6890F0' },
    { value: 'TYPE_GRASS', label: 'Grass', color: '#78C850' },
    { value: 'TYPE_ELECTRIC', label: 'Electric', color: '#F8D030' },
    { value: 'TYPE_PSYCHIC', label: 'Psychic', color: '#F85888' },
    { value: 'TYPE_ICE', label: 'Ice', color: '#98D8D8' },
    { value: 'TYPE_DRAGON', label: 'Dragon', color: '#7038F8' },
    { value: 'TYPE_DARK', label: 'Dark', color: '#705848' },
  ];

  const STATS = ['baseHP', 'baseAttack', 'baseDefense', 'baseSpAttack', 'baseSpDefense', 'baseSpeed'] as const;
  const movesInfo = { names: MOVE_NAME_MAP, moves: MOVE_LIST, tms: TM_LIST, hms: HM_LIST };
  const moveOptionsHtml = MOVE_LIST
    .map((m) => `<option value="${m}">${formatMoveName(m)}</option>`)
    .join('');

  // ===== State =====
  let currentLabel: string | null = $state(null);
  let learnsetsData: LearnsetsView | null = $state(null);
  let evolutionData: EvolutionFile | null = $state(null);
  let evoMethods: { value: string; label: string }[] = $state([]);
  let evoItems: ItemOption[] = $state([]);
  let evoOptionsHtml: string = $state('');
  let evoItemOptionsHtml: string = $state('');
  let speciesOptionsHtml: string = $state('');
  let statusMessage: string = $state('');
  let statusKind: StatusKind = $state(null);
  let statusTimer: ReturnType<typeof setTimeout> | null = null;
  let pickerTarget: string | null = null;

  // ===== Refs (bound below) =====
  let editorEl: HTMLDivElement | undefined = $state();
  let emptyStateEl: HTMLDivElement | undefined = $state();
  let statusEl: HTMLDivElement | undefined = $state();
  let pokemonNameEl: HTMLHeadingElement | undefined = $state();
  let pokemonSpriteEl: HTMLImageElement | undefined = $state();
  let type1ChipEl: HTMLButtonElement | undefined = $state();
  let type2ChipEl: HTMLButtonElement | undefined = $state();
  let ability1El: HTMLSelectElement | undefined = $state();
  let ability2El: HTMLSelectElement | undefined = $state();
  let formEl: HTMLFormElement | undefined = $state();
  let levelupListEl: HTMLDivElement | undefined = $state();
  let tmhmListEl: HTMLDivElement | undefined = $state();
  let evolutionChainEl: HTMLDivElement | undefined = $state();
  let addLevelupBtnEl: HTMLButtonElement | undefined = $state();
  let tmhmSearchEl: HTMLInputElement | undefined = $state();
  let typePickerEl: HTMLDivElement | undefined = $state();
  const statRefs: Partial<Record<(typeof STATS)[number], HTMLInputElement>> = {};
  const statValueRefs: Partial<Record<(typeof STATS)[number], HTMLSpanElement>> = {};

  // ===== Helpers =====
  function formatMoveName(move: string): string {
    if (movesInfo.names[move]) return movesInfo.names[move];
    return move
      .replace(/^MOVE_/, '')
      .split('_')
      .map((w) => (w ? w.charAt(0) + w.slice(1).toLowerCase() : w))
      .join(' ');
  }

  function showStatus(message: string, kind: 'success' | 'error') {
    statusMessage = message;
    statusKind = kind;
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      statusMessage = '';
      statusKind = null;
      statusTimer = null;
    }, 3000);
  }

  function updateTypeChip(chip: HTMLButtonElement, typeValue: string) {
    const typeInfo = typeOptions.find((t) => t.value === typeValue);
    if (!typeInfo) return;
    chip.textContent = typeInfo.label;
    chip.style.backgroundColor = typeInfo.color;
    chip.dataset.type = typeValue;
  }

  function findPokemon(label: string): SpeciesEntry | null {
    const data = get(speciesData);
    if (!data) return null;
    return data.species.find((p) => p.label === label) ?? null;
  }

  function currentLearnsets(): LearnsetsViewEntry | null {
    if (!currentLabel || !learnsetsData) return null;
    return learnsetsData[currentLabel] ?? null;
  }

  function loadPokemon(label: string) {
    const pokemon = findPokemon(label);
    if (!pokemon) return;
    currentLabel = label;
    if (pokemonNameEl) pokemonNameEl.textContent = label.replace('_', ' ');
    if (pokemonSpriteEl) pokemonSpriteEl.src = `/api/sprite/${label.toLowerCase()}`;
    if (type1ChipEl) updateTypeChip(type1ChipEl, pokemon.types[0]);
    if (type2ChipEl) updateTypeChip(type2ChipEl, pokemon.types[1]);
    if (ability1El) ability1El.value = pokemon.abilities[0];
    if (ability2El) ability2El.value = pokemon.abilities[1];
    for (const stat of STATS) {
      const slider = statRefs[stat];
      const valueDisplay = statValueRefs[stat];
      if (!slider || !valueDisplay) continue;
      const value = parseInt(pokemon[stat]);
      slider.value = value.toString();
      valueDisplay.textContent = value.toString();
    }
    renderMoves(label);
    renderEvolution(label);
    if (editorEl) editorEl.style.display = 'block';
    if (emptyStateEl) emptyStateEl.style.display = 'none';
  }

  // ===== Level-up moves =====

  function buildLevelupRow(entry: { level: number; level_padded?: string; move: string }, index: number) {
    if (!levelupListEl) return document.createElement('div');
    const row = document.createElement('div');
    row.className = 'levelup-row';
    (row as any)._luEntry = entry;
    row.innerHTML = `
      <input type="number" class="move-level" min="1" max="100" value="${entry.level}">
      <select class="move-select">${moveOptionsHtml}</select>
      <button type="button" class="move-remove" title="Remove">×</button>
    `;
    const levelInput = row.querySelector('.move-level') as HTMLInputElement;
    const moveSelect = row.querySelector('.move-select') as HTMLSelectElement;
    moveSelect.value = entry.move;

    levelInput.addEventListener('input', () => {
      if (!currentLabel || !learnsetsData) return;
      const newLevel = Math.max(1, Math.min(100, parseInt(levelInput.value) || 1));
      learnsetsData = setLevelupLevel(learnsetsData, currentLabel, index, newLevel);
    });
    levelInput.addEventListener('change', () => reorderLevelupAnimated());
    moveSelect.addEventListener('change', () => {
      if (!currentLabel || !learnsetsData) return;
      learnsetsData = setLevelupMove(learnsetsData, currentLabel, index, moveSelect.value);
      reorderLevelupAnimated();
    });
    row.querySelector('.move-remove')!.addEventListener('click', () => {
      if (!currentLabel || !learnsetsData) return;
      learnsetsData = removeLevelupMove(learnsetsData, currentLabel, index);
      renderMoves(currentLabel);
    });
    return row;
  }

  function buildTmhmRow(move: string, kind: 'TM' | 'HM', number: number, checked: boolean) {
    const row = document.createElement('label');
    row.className = 'tmhm-row' + (kind === 'HM' ? ' is-hm' : '');
    row.innerHTML = `
      <input type="checkbox" class="tmhm-check" data-move="${move}" ${checked ? 'checked' : ''}>
      <span class="tmhm-tag">${kind}${String(number).padStart(2, '0')}</span>
      <span>${formatMoveName(move)}</span>
    `;
    const cb = row.querySelector('.tmhm-check') as HTMLInputElement;
    cb.addEventListener('change', () => {
      if (!currentLabel || !learnsetsData) return;
      learnsetsData = toggleTmhm(learnsetsData, currentLabel, move, cb.checked);
    });
    return row;
  }

  function renderMoves(label: string) {
    if (!levelupListEl || !tmhmListEl) return;
    levelupListEl.innerHTML = '';
    tmhmListEl.innerHTML = '';
    const entry = learnsetsData?.[label];
    if (!entry) return;
    entry.levelup.forEach((m, i) => levelupListEl.appendChild(buildLevelupRow(m, i)));
    const checked = new Set(entry.tmhm);
    movesInfo.tms.forEach((move, i) => tmhmListEl.appendChild(buildTmhmRow(move, 'TM', i + 1, checked.has(move))));
    movesInfo.hms.forEach((move, i) => tmhmListEl.appendChild(buildTmhmRow(move, 'HM', i + 1, checked.has(move))));
  }

  function reorderLevelupAnimated() {
    if (!currentLabel || !learnsetsData || !levelupListEl) return;
    const rows = Array.from(levelupListEl.querySelectorAll('.levelup-row')) as HTMLElement[];
    if (rows.length === 0) return;

    const oldRects = new Map<unknown, DOMRect>();
    for (const row of rows) {
      const entry = (row as any)._luEntry;
      if (entry) oldRects.set(entry, row.getBoundingClientRect());
    }

    const result = sortLevelup(learnsetsData, currentLabel, { ...movesInfo.names });
    learnsetsData = result.view;

    renderMoves(currentLabel);

    const newRows = Array.from(levelupListEl.querySelectorAll('.levelup-row')) as HTMLElement[];
    requestAnimationFrame(() => {
      for (const row of newRows) {
        const entry = (row as any)._luEntry;
        if (!entry) continue;
        const oldRect = oldRects.get(entry);
        if (!oldRect) continue;
        const newRect = row.getBoundingClientRect();
        const dx = oldRect.left - newRect.left;
        const dy = oldRect.top - newRect.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        row.style.transition = 'none';
        row.style.transform = `translate(${dx}px, ${dy}px)`;
        void row.offsetHeight;
        row.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)';
        row.style.transform = '';
        const cleanup = () => {
          row.style.transition = '';
          row.style.transform = '';
          row.removeEventListener('transitionend', cleanup);
        };
        row.addEventListener('transitionend', cleanup);
        setTimeout(cleanup, 400);
      }
    });
  }

  // ===== Evolution tree =====

  const TILE_W = 220,
    TILE_H = 235,
    CONN_W = 220,
    CONN_H = 235,
    ARROW_W = 28,
    TAIL_W = 20,
    ARROW_GAP = 20,
    V_GAP = 16,
    H_GAP = 16;
  const TOP_PAD = (CONN_H - TILE_H) / 2;
  const ROW_H = CONN_H + TOP_PAD;
  type Pos = { label: string; x: number; y: number; height: number; isCurrent: boolean };
  type Edge = {
    from: string;
    toIndex: number;
    method: string;
    param: number;
    target: string;
    x: number;
    y: number;
  };

  interface EvoMaps {
    from: Map<string, { method: string; param: number; target: string }[]>;
    toParent: Map<string, { from: string; toIndex: number }>;
  }

  function rebuildEvoMaps(): EvoMaps {
    const from = new Map<string, { method: string; param: number; target: string }[]>();
    const toParent = new Map<string, { from: string; toIndex: number }>();
    if (!evolutionData) return { from, toParent };
    for (const e of evolutionData.evolutions) {
      from.set(e.from, e.to);
      e.to.forEach((t, i) => toParent.set(t.target, { from: e.from, toIndex: i }));
    }
    return { from, toParent };
  }

  function layoutTree(
    maps: EvoMaps,
    label: string,
    x: number,
    y: number,
    isRoot: boolean,
    currentLabel: string,
    nodes: Pos[],
  ): { width: number; height: number } {
    const outgoing = maps.from.get(label) ?? [];
    const isCurrent = label === currentLabel;
    if (outgoing.length === 0) {
      nodes.push({ label, x, y, height: TILE_H, isCurrent });
      return { width: TILE_W, height: ROW_H };
    }
    let childY = y;
    const bounds: { w: number; h: number }[] = [];
    for (const edge of outgoing) {
      const r = layoutTree(
        maps,
        edge.target,
        x + TILE_W + 2 * ARROW_W + CONN_W + TAIL_W + ARROW_GAP,
        childY,
        false,
        currentLabel,
        nodes,
      );
      bounds.push({ w: r.width, h: r.height });
      childY += r.height + V_GAP;
    }
    const totalChildH = bounds.reduce((s, b) => s + b.h, 0) + (outgoing.length - 1) * V_GAP;
    const parentHeight = Math.max(TILE_H, totalChildH);
    const nodeY = isRoot ? y : y + (totalChildH - parentHeight) / 2;
    nodes.push({ label, x, y: nodeY, height: parentHeight, isCurrent });
    const maxChildW = Math.max(...bounds.map((b) => b.w));
    return {
      width: TILE_W + 2 * ARROW_W + CONN_W + TAIL_W + ARROW_GAP + maxChildW,
      height: Math.max(ROW_H, totalChildH),
    };
  }

  function buildEvoTile(label: string, isCurrent: boolean, x: number, y: number, height: number): HTMLDivElement {
    const tile = document.createElement('div');
    tile.className = 'evo-tile' + (isCurrent ? ' is-current' : '');
    tile.style.left = x + 'px';
    tile.style.top = y + 'px';
    tile.style.height = height + 'px';
    const labelWrap = document.createElement('div');
    labelWrap.className = 'evo-tile-label';
    labelWrap.innerHTML = `<img class="evo-sprite" src="/api/sprite/${label.toLowerCase()}" alt=""><span class="evo-name">${label.replace(/_/g, ' ')}</span>`;
    tile.appendChild(labelWrap);
    if (isCurrent) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'evo-add';
      add.textContent = 'Add';
      add.title = 'Add evolution';
      add.addEventListener('click', () => {
        if (!evolutionData) return;
        const firstSpecies = get(speciesData)?.species?.[0]?.label ?? label;
        const target: EvolutionTarget = { method: 'EVO_LEVEL', param: 1, target: firstSpecies };
        evolutionData = addEvolution(evolutionData, label, target);
        if (currentLabel) renderEvolution(currentLabel);
      });
      tile.appendChild(add);
    }
    return tile;
  }

  function buildEvoConnector(edge: Edge): HTMLDivElement {
    const conn = document.createElement('div');
    conn.className = 'evo-connector';
    conn.style.left = edge.x + 'px';
    conn.style.top = edge.y + 'px';
    const methodSel = document.createElement('select');
    methodSel.className = 'evo-method';
    methodSel.innerHTML = evoOptionsHtml;
    methodSel.value = edge.method;
    const paramWrap = document.createElement('div');
    paramWrap.className = 'evo-param-wrap';
    const targetSel = document.createElement('select');
    targetSel.className = 'evo-target';
    targetSel.innerHTML = speciesOptionsHtml;
    targetSel.value = edge.target;
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'evo-save';
    saveBtn.textContent = 'Save';
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'evo-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.title = 'Remove evolution';
    conn.append(methodSel, paramWrap, targetSel, saveBtn, deleteBtn);

    let draftMethod = edge.method;
    let draftParam = edge.param;
    let draftTarget = edge.target;

    const refreshSaveState = () => {
      const dirty =
        draftMethod !== edge.method || draftParam !== edge.param || draftTarget !== edge.target;
      saveBtn.disabled = !dirty;
    };
    refreshSaveState();

    const buildParam = (method: string, current: number) => {
      paramWrap.innerHTML = '';
      const t = paramType(method);
      if (t === 'none') return;
      if (t === 'item') {
        const match = evoItems.find((i) => i.number === current);
        const sel = document.createElement('select');
        sel.className = 'evo-item-select';
        sel.innerHTML = evoItemOptionsHtml;
        sel.value = match?.value ?? evoItems[0]?.value ?? '';
        sel.addEventListener('change', () => {
          const picked = evoItems.find((i) => i.value === sel.value);
          draftParam = picked ? picked.number : 0;
          refreshSaveState();
        });
        paramWrap.appendChild(sel);
        return;
      }
      const inp = document.createElement('input');
      inp.type = 'number';
      if (t === 'level') {
        inp.min = '1';
        inp.max = '100';
      } else if (t === 'beauty') {
        inp.min = '0';
        inp.max = '255';
      }
      inp.value = String(current);
      inp.addEventListener('input', () => {
        draftParam = parseInt(inp.value) || 0;
        refreshSaveState();
      });
      paramWrap.appendChild(inp);
    };
    buildParam(draftMethod, draftParam);

    methodSel.addEventListener('change', () => {
      draftMethod = methodSel.value;
      if (paramType(draftMethod) === 'none') draftParam = 0;
      buildParam(draftMethod, draftParam);
      refreshSaveState();
    });
    targetSel.addEventListener('change', () => {
      draftTarget = targetSel.value;
      refreshSaveState();
    });
    saveBtn.addEventListener('click', () => {
      if (!evolutionData) return;
      evolutionData = setEvolutionMethod(evolutionData, edge.from, edge.toIndex, draftMethod);
      evolutionData = setEvolutionParam(evolutionData, edge.from, edge.toIndex, draftParam);
      evolutionData = setEvolutionTarget(evolutionData, edge.from, edge.toIndex, draftTarget);
      if (currentLabel) renderEvolution(currentLabel);
    });
    deleteBtn.addEventListener('click', () => {
      if (!evolutionData) return;
      evolutionData = removeEvolution(evolutionData, edge.from, edge.toIndex);
      if (currentLabel) renderEvolution(currentLabel);
    });
    return conn;
  }

  function renderEvolution(label: string) {
    if (!evolutionChainEl) return;
    evolutionChainEl.innerHTML = '';
    if (!evolutionData) {
      evolutionChainEl.innerHTML = '<div class="evo-empty">Loading…</div>';
      return;
    }
    const maps = rebuildEvoMaps();
    const sp = get(speciesData);
    if (sp) {
      speciesOptionsHtml = sp.species
        .map((s) => `<option value="${s.label}">${s.label.replace(/_/g, ' ')}</option>`)
        .join('');
    }
    const root = findEvoRoot(evolutionData, label);
    const rootChildren = maps.from.get(root) ?? [];
    const nodes: Pos[] = [];
    const startY = rootChildren.length > 0 ? TOP_PAD : 0;
    const bounds = layoutTree(maps, root, 0, startY, true, label, nodes);
    const boundsHeight =
      rootChildren.length > 0 ? Math.max(...nodes.map((n) => n.y + n.height)) : TILE_H;
    const nodeMap = new Map(nodes.map((n) => [n.label, n]));
    const edges: Edge[] = [];
    for (const [from, toList] of maps.from) {
      const pNode = nodeMap.get(from);
      if (!pNode) continue;
      toList.forEach((edge, toIndex) => {
        const cNode = nodeMap.get(edge.target);
        if (!cNode) return;
        edges.push({
          from,
          toIndex,
          method: edge.method,
          param: edge.param,
          target: edge.target,
          x: pNode.x + TILE_W + ARROW_W,
          y: cNode.y + (cNode.height - CONN_H) / 2,
        });
      });
    }
    evolutionChainEl.style.width = bounds.width + 'px';
    evolutionChainEl.style.height = boundsHeight + 'px';
    for (const n of nodes) {
      evolutionChainEl.appendChild(buildEvoTile(n.label, n.isCurrent, n.x, n.y, n.height));
    }
    for (const e of edges) {
      const ln = document.createElement('div');
      ln.className = 'evo-line';
      ln.style.left = e.x - ARROW_W + 'px';
      ln.style.top = e.y + 'px';
      ln.style.width = ARROW_W + 'px';
      evolutionChainEl.appendChild(ln);
      evolutionChainEl.appendChild(buildEvoConnector(e));
      const tl = document.createElement('div');
      tl.className = 'evo-line';
      tl.style.left = e.x + CONN_W + 'px';
      tl.style.top = e.y + 'px';
      tl.style.width = TAIL_W + 'px';
      evolutionChainEl.appendChild(tl);
      const ah = document.createElement('div');
      ah.className = 'evo-arrow';
      ah.style.left = e.x + CONN_W + TAIL_W + 'px';
      ah.style.top = e.y + 'px';
      evolutionChainEl.appendChild(ah);
    }
  }

  // ===== Type picker =====

  function openTypePicker(chip: HTMLButtonElement) {
    if (!typePickerEl) return;
    pickerTarget = chip.id;
    typePickerEl.innerHTML = '';
    for (const t of typeOptions) {
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'type-chip type-picker-option';
      opt.textContent = t.label;
      opt.style.backgroundColor = t.color;
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        if (pickerTarget) {
          const target = document.getElementById(pickerTarget) as HTMLButtonElement | null;
          if (target) updateTypeChip(target, t.value);
        }
        closeTypePicker();
      });
      typePickerEl.appendChild(opt);
    }
    const anchor = chip.getBoundingClientRect();
    typePickerEl.style.top = `${anchor.bottom + 4}px`;
    typePickerEl.style.left = `${anchor.left}px`;
    typePickerEl.hidden = false;
  }

  function closeTypePicker() {
    if (typePickerEl) typePickerEl.hidden = true;
    pickerTarget = null;
  }

  function onTypeChipClick(chip: HTMLButtonElement, e: MouseEvent) {
    e.stopPropagation();
    openTypePicker(chip);
  }

  // ===== Form submit =====

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    const data = get(speciesData);
    const label = get(selectedPokemon);
    if (!data || !label) return;
    const pokemon = data.species.find((p) => p.label === label);
    if (!pokemon) return;
    if (type1ChipEl) pokemon.types[0] = type1ChipEl.dataset.type!;
    if (type2ChipEl) pokemon.types[1] = type2ChipEl.dataset.type!;
    if (ability1El) pokemon.abilities[0] = ability1El.value;
    if (ability2El) pokemon.abilities[1] = ability2El.value;
    for (const stat of STATS) {
      const slider = statRefs[stat];
      if (slider) pokemon[stat] = slider.value;
    }
    try {
      const [speciesRes, learnsetsRes, evoRes] = await Promise.all([
        fetch('/api/species', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }),
        fetch('/api/learnsets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ learnsets: learnsetsData }),
        }),
        fetch('/api/evolution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(evolutionData),
        }),
      ]);
      const showErr = async (res: Response, kind: string) => {
        const body = await res.json().catch(() => ({}));
        console.error(`Save ${kind} failed`, res.status, body);
        showStatus(`Failed to save ${kind}: ${body.error ?? res.statusText}`, 'error');
      };
      if (speciesRes.ok && learnsetsRes.ok && evoRes.ok) {
        showStatus('Changes saved (species + moves + evolution)!', 'success');
      } else {
        if (!speciesRes.ok) await showErr(speciesRes, 'species');
        else if (!learnsetsRes.ok) await showErr(learnsetsRes, 'moves');
        else if (!evoRes.ok) await showErr(evoRes, 'evolution');
      }
    } catch (error) {
      console.error('Save threw', error);
      showStatus(`Error saving: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  function onAddLevelup() {
    if (!currentLabel || !learnsetsData) return;
    learnsetsData = addLevelupMove(learnsetsData, currentLabel, 1, movesInfo.moves[0], {
      ...movesInfo.names,
    });
    renderMoves(currentLabel);
  }

  function onTmhmSearch(e: Event) {
    if (!tmhmListEl) return;
    const q = (e.target as HTMLInputElement).value.toLowerCase().trim();
    tmhmListEl.querySelectorAll('.tmhm-row').forEach((row) => {
      const text = (row.textContent ?? '').toLowerCase();
      (row as HTMLElement).style.display = !q || text.includes(q) ? '' : 'none';
    });
  }

  function onStatInput(stat: (typeof STATS)[number], e: Event) {
    const valueDisplay = statValueRefs[stat];
    if (valueDisplay) valueDisplay.textContent = (e.target as HTMLInputElement).value;
  }

  // ===== Lifecycle =====

  onMount(() => {
    void (async () => {
      try {
        const res = await fetch('/api/learnsets');
        if (res.ok) {
          const data = (await res.json()) as { learnsets: LearnsetsView };
          learnsetsData = data.learnsets;
          if (currentLabel) renderMoves(currentLabel);
        }
      } catch {}
    })();

    void (async () => {
      try {
        const res = await fetch('/api/evolution');
        if (res.ok) {
          const d = (await res.json()) as EvolutionFile & {
            methods: { value: string; label: string }[];
            items: ItemOption[];
          };
          evolutionData = { _widths: d._widths, evolutions: d.evolutions };
          evoMethods = d.methods;
          evoItems = d.items;
          evoOptionsHtml = evoMethods
            .map((m) => `<option value="${m.value}">${m.label}</option>`)
            .join('');
          evoItemOptionsHtml = evoItems
            .map((i) => `<option value="${i.value}">${i.label}</option>`)
            .join('');
          if (currentLabel) renderEvolution(currentLabel);
        }
      } catch {}
    })();

    const unsubscribe = selectedPokemon.subscribe((label) => {
      if (label) loadPokemon(label);
    });

    function onDocClick() {
      if (typePickerEl && !typePickerEl.hidden) closeTypePicker();
    }
    document.addEventListener('click', onDocClick);

    return () => {
      unsubscribe();
      document.removeEventListener('click', onDocClick);
      if (statusTimer) clearTimeout(statusTimer);
    };
  });
</script>

<div
  class="status {statusKind ?? ''}"
  class:show={statusKind !== null}
  bind:this={statusEl}
  role="status"
  aria-live="polite"
>
  {statusMessage}
</div>

<div id="editor" class="editor" style="display: none;" bind:this={editorEl}>
  <div class="editor-header">
    <img id="pokemon-sprite" class="editor-sprite" alt="" bind:this={pokemonSpriteEl} />
    <h2 id="pokemon-name" bind:this={pokemonNameEl}></h2>
  </div>

  <form id="pokemon-form" bind:this={formEl} onsubmit={onSubmit}>
    <div class="editor-layout">
      <div class="editor-left">
        <div class="form-section">
          <h3>Types</h3>
          <div class="type-chips-container">
            <button
              type="button"
              id="type1-chip"
              class="type-chip"
              data-type=""
              bind:this={type1ChipEl}
              onclick={(e) => type1ChipEl && onTypeChipClick(type1ChipEl, e)}
            ></button>
            <button
              type="button"
              id="type2-chip"
              class="type-chip"
              data-type=""
              bind:this={type2ChipEl}
              onclick={(e) => type2ChipEl && onTypeChipClick(type2ChipEl, e)}
            ></button>
          </div>
          <div id="type-picker" class="type-picker" hidden bind:this={typePickerEl}></div>
        </div>

        <div class="form-section">
          <h3>Abilities</h3>
          <div class="form-row">
            <select id="ability1" name="ability1" class="ability-select" bind:this={ability1El}>
              {#each ABILITY_OPTIONS as opt (opt.value)}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
            <select id="ability2" name="ability2" class="ability-select" bind:this={ability2El}>
              {#each ABILITY_OPTIONS as opt (opt.value)}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>

      <div class="editor-right">
        <div class="form-section">
          <h3>Base Stats</h3>
          <div class="stats-container">
            {#each STATS as stat (stat)}
              <div class="stat-row" style="--stat-color: {statColors[stat]};">
                <label class="stat-label" for={stat}>{statLabels[stat]}</label>
                <input
                  type="range"
                  id={stat}
                  name={stat}
                  min="1"
                  max="255"
                  class="stat-slider"
                  bind:this={statRefs[stat]}
                  oninput={(e) => onStatInput(stat, e)}
                />
                <span class="stat-value" id={`${stat}-value`} bind:this={statValueRefs[stat]}>0</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <div class="form-section evolution-section-wrap">
      <h3>Evolution</h3>
      <div id="evolution-chain" class="evolution-chain" bind:this={evolutionChainEl}></div>
    </div>

    <div class="form-section moves-section-wrap">
      <h3>Moves</h3>
      <div class="moves-grid">
        <div>
          <h4>Level Up</h4>
          <div id="levelup-moves" class="levelup-list" bind:this={levelupListEl}></div>
          <button
            type="button"
            id="add-levelup"
            class="btn btn-add-move"
            bind:this={addLevelupBtnEl}
            onclick={onAddLevelup}>+ Add Move</button
          >
        </div>
        <div>
          <h4>TM/HM</h4>
          <input
            type="text"
            id="tmhm-search"
            class="tmhm-search"
            placeholder="Search TM/HM…"
            autocomplete="off"
            bind:this={tmhmSearchEl}
            oninput={onTmhmSearch}
          />
          <div id="tmhm-moves" class="tmhm-list" bind:this={tmhmListEl}></div>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Save Changes</button>
    </div>
  </form>
</div>

<div id="empty-state" class="empty-state" bind:this={emptyStateEl}>
  <div class="empty-icon">📊</div>
  <h2>Select a Pokémon</h2>
  <p>Choose a Pokémon from the list to edit its information</p>
</div>

<script lang="ts" context="module">
  const statLabels: Record<string, string> = {
    baseHP: 'HP',
    baseAttack: 'ATK',
    baseDefense: 'DEF',
    baseSpAttack: 'SPA',
    baseSpDefense: 'SPD',
    baseSpeed: 'SPE',
  };
  const statColors: Record<string, string> = {
    baseHP: '#78C850',
    baseAttack: '#F8D030',
    baseDefense: '#F08030',
    baseSpAttack: '#6890F0',
    baseSpDefense: '#98D8D8',
    baseSpeed: '#7038F8',
  };
</script>

<style>
  .status {
    padding: 0.8rem 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    display: none;
  }
  .status.show { display: block; }
  .status.success {
    background: rgba(158, 206, 106, 0.1);
    border: 1px solid var(--accent-2);
    color: var(--accent-2);
  }
  .status.error {
    background: rgba(247, 118, 142, 0.1);
    border: 1px solid var(--danger);
    color: var(--danger);
  }

  .editor {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 2rem;
  }
  .editor-header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .editor-header h2 {
    margin: 0;
    color: var(--accent);
    font-size: 2rem;
  }
  .editor-sprite {
    width: 72px;
    height: 72px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    object-fit: cover;
    object-position: top;
  }
  .editor-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
  .editor-left, .editor-right {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-section {
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 2.5rem;
  }
  .form-section h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .form-actions {
    margin-top: 2rem;
    display: flex;
    justify-content: flex-end;
  }

  .type-chips-container {
    display: flex;
    gap: 0.8rem;
  }
  /* :global because the dynamic picker options (built via createElement) also
     use the .type-chip class and live outside Svelte's scope. */
  :global(.type-chip) {
    padding: 0.5rem 1.2rem;
    border-radius: 20px;
    border: none;
    font: inherit;
    font-weight: 600;
    font-size: 0.9rem;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    min-width: 80px;
    text-align: center;
    cursor: pointer;
  }
  :global(.type-chip:hover) { filter: brightness(1.1); }
  .type-picker {
    position: fixed;
    z-index: 100;
    margin-top: 0.4rem;
    padding: 0.6rem;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
  }
  .type-picker[hidden] { display: none; }

  .ability-select {
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.5rem 0.6rem;
    color: var(--text);
    width: 100%;
    cursor: pointer;
  }
  .ability-select:focus { outline: none; border-color: var(--accent); }

  .stats-container {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: 0.5rem 0;
  }
  .stat-row {
    display: grid;
    grid-template-columns: 48px 1fr 48px;
    align-items: center;
    gap: 1rem;
  }
  .stat-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--stat-color);
    text-transform: uppercase;
    text-align: right;
  }
  .stat-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 8px;
    background: var(--panel);
    border-radius: 4px;
    outline: none;
    cursor: pointer;
    margin: 0;
  }
  .stat-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--stat-color);
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    margin-top: -6px;
  }
  .stat-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--stat-color);
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  .stat-slider::-webkit-slider-runnable-track {
    width: 100%;
    height: 8px;
    background: var(--panel);
    border-radius: 4px;
  }
  .stat-slider::-moz-range-track {
    width: 100%;
    height: 8px;
    background: var(--panel);
    border-radius: 4px;
  }
  .stat-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--stat-color);
    text-align: left;
  }

  .moves-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  .moves-grid h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.75rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }
  .levelup-list, .tmhm-list {
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
  .levelup-list::-webkit-scrollbar,
  .tmhm-list::-webkit-scrollbar { width: 8px; }
  .levelup-list::-webkit-scrollbar-track,
  .tmhm-list::-webkit-scrollbar-track { background: transparent; }
  .levelup-list::-webkit-scrollbar-thumb,
  .tmhm-list::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
  }
  .levelup-list::-webkit-scrollbar-thumb:hover,
  .tmhm-list::-webkit-scrollbar-thumb:hover { background: var(--muted); }

  .btn {
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.7rem 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text);
    font-weight: 500;
  }
  .btn:hover:not(:disabled) { border-color: var(--accent); }
  .btn-primary {
    background: var(--accent);
    color: var(--bg);
    border-color: var(--accent);
  }
  .btn-primary:hover:not(:disabled) { background: #6b91e6; }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: var(--muted);
  }
  .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
  .empty-state h2 { margin: 0 0 0.5rem 0; color: var(--text); }
  .empty-state p { margin: 0; }
</style>
