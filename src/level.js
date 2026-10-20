import { TILE } from "./tiles.js";
import { createEntity } from "./entities.js";

export const CAMPAIGN = ["1-1", "1-2", "1-3", "2-1", "2-2", "2-3", "3-1", "3-2", "3-3"];

export function nextStage(id) {
  const index = CAMPAIGN.indexOf(id);
  if (index < 0 || index >= CAMPAIGN.length - 1) return null;
  return CAMPAIGN[index + 1];
}

export function parseLevel(data) {
  const tiles = data.rows.map((row) => row.split(""));
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  if (tiles.some((row) => row.length !== width)) {
    throw new Error(`${data.id} has uneven rows`);
  }
  let pole = null;
  for (let ty = 0; ty < height; ty += 1) {
    for (let tx = 0; tx < width; tx += 1) {
      if (tiles[ty][tx] === "|" && !pole) pole = { tx, ty };
    }
  }
  return {
    id: data.id,
    theme: data.theme || "overworld",
    time: data.time ?? 300,
    width,
    height,
    tiles,
    spawn: data.spawn,
    entities: (data.entities || []).map(createEntity),
    items: [],
    warps: data.warps || [],
    bumps: new Map(),
    pole,
  };
}

export function cloneLevel(level) {
  return {
    ...level,
    tiles: level.tiles.map((row) => row.slice()),
    entities: level.entities.map((entity) => ({ ...entity })),
    items: level.items.map((item) => ({ ...item })),
    warps: level.warps.map((warp) => ({ ...warp })),
    bumps: new Map(level.bumps),
    pole: level.pole ? { ...level.pole } : null,
  };
}

export function cameraFor(level, focusX, viewW, viewH) {
  const worldW = level.width * TILE;
  const worldH = level.height * TILE;
  const maxX = Math.max(0, worldW - viewW);
  const x = Math.round(Math.min(maxX, Math.max(0, focusX - viewW * 0.4)));
  const y = Math.max(0, worldH - viewH);
  return { x, y };
}

export function canWarp(player, warps, downHeld) {
  if (!downHeld || !player.grounded || !warps?.length) return null;
  const center = player.x + player.w / 2;
  const feet = player.y + player.h;
  for (const warp of warps) {
    const left = warp.x * TILE;
    const top = warp.y * TILE;
    const onPipe = center >= left && center < left + TILE * 2 && Math.abs(feet - top) <= 8;
    if (onPipe) return warp;
  }
  return null;
}

const rawCache = new Map();

export async function fetchLevel(id) {
  if (!rawCache.has(id)) {
    const url = new URL(`../levels/${id}.json`, import.meta.url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Missing stage ${id}`);
    rawCache.set(id, await response.json());
  }
  return parseLevel(rawCache.get(id));
}
