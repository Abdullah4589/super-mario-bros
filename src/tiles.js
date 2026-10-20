export const TILE = 16;

const SOLID = new Set(["#", "o", "B", "?", "M", "F", "S", "L", "{", "}", "[", "]", "~"]);

export function isSolidCell(cell) {
  return SOLID.has(cell);
}

export function getCell(level, tx, ty) {
  if (ty < 0 || ty >= level.height || tx < 0 || tx >= level.width) return null;
  return level.tiles[ty][tx];
}

export function setCell(level, tx, ty, cell) {
  if (getCell(level, tx, ty) === null) return;
  level.tiles[ty][tx] = cell;
}

export function solidAt(level, tx, ty) {
  if (tx < 0 || tx >= level.width) return true;
  if (ty < 0 || ty >= level.height) return false;
  return isSolidCell(level.tiles[ty][tx]);
}

const BUMPS = {
  "?": { cell: "o", spawn: "coin", score: 0 },
  M: { cell: "o", spawn: "mushroom", score: 0 },
  F: { cell: "o", spawn: "flower", score: 0 },
  S: { cell: "o", spawn: "star", score: 0 },
  L: { cell: "o", spawn: "life", score: 0 },
  H: { cell: "o", spawn: "mushroom", score: 0 },
  h: { cell: "o", spawn: "life", score: 0 },
};

export function applyBump(cell, form) {
  if (cell === "B") {
    if (form === "small") return { cell: "B", spawn: null, score: 0, bump: true };
    return { cell: ".", spawn: null, score: 50, break: true };
  }
  const spec = BUMPS[cell];
  if (!spec) return null;
  if (cell === "F" && form === "small") {
    return { cell: "o", spawn: "mushroom", score: 0, bump: true };
  }
  return { ...spec, bump: true };
}

export function tickBumps(level) {
  for (const [key, value] of level.bumps) {
    if (value <= 1) level.bumps.delete(key);
    else level.bumps.set(key, value - 1);
  }
}

export function bumpOffset(level, tx, ty) {
  const value = level.bumps.get(`${tx},${ty}`) || 0;
  if (value <= 0) return 0;
  return value > 4 ? value - 8 : -value;
}

export const THEMES = {
  overworld: {
    sky: "#79c6ff",
    skyDeep: "#b7e3ff",
    hill: "#3c9a52",
    hillShade: "#2d7a40",
    ground: "#c4844a",
    groundTop: "#5cad3a",
    brick: "#c25a32",
    brickDark: "#8a3d22",
    block: "#f0b429",
    blockDark: "#c4841a",
    pipe: "#2f9d4a",
    pipeDark: "#1d6b34",
    cloud: "#f7fbff",
  },
  underground: {
    sky: "#10202c",
    skyDeep: "#183246",
    hill: "#1a3040",
    hillShade: "#122430",
    ground: "#4d5e6c",
    groundTop: "#7d8e9c",
    brick: "#6e5348",
    brickDark: "#46342e",
    block: "#e2b84a",
    blockDark: "#b48428",
    pipe: "#1f7a52",
    pipeDark: "#145238",
    cloud: "#2a4558",
  },
  castle: {
    sky: "#1a120e",
    skyDeep: "#2a1c16",
    hill: "#241610",
    hillShade: "#1a100c",
    ground: "#6d6560",
    groundTop: "#8e8680",
    brick: "#5c463c",
    brickDark: "#3a2c26",
    block: "#d7b03a",
    blockDark: "#a48420",
    pipe: "#3d6b4f",
    pipeDark: "#274833",
    cloud: "#3a2a24",
    lava: "#e25822",
  },
  dusk: {
    sky: "#f3a15c",
    skyDeep: "#ffd0a0",
    hill: "#c46b3a",
    hillShade: "#9a4e28",
    ground: "#b87440",
    groundTop: "#6ea84a",
    brick: "#b55230",
    brickDark: "#7c3820",
    block: "#f0b429",
    blockDark: "#c4841a",
    pipe: "#2f8f48",
    pipeDark: "#1d6632",
    cloud: "#ffe6cf",
  },
  night: {
    sky: "#101a33",
    skyDeep: "#1b2b4e",
    hill: "#1c3a4a",
    hillShade: "#142a36",
    ground: "#3e5870",
    groundTop: "#2f7a4a",
    brick: "#8a4030",
    brickDark: "#5c281c",
    block: "#e0b030",
    blockDark: "#b48420",
    pipe: "#217a48",
    pipeDark: "#145232",
    cloud: "#2a3d66",
  },
};
