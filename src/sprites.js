const PAL = {
  ".": null,
  o: "#e07a3d",
  s: "#f3d2b0",
  k: "#241c16",
  t: "#1f8f8a",
  d: "#14655f",
  w: "#fffdf8",
  b: "#1c2430",
  y: "#f2c14e",
  n: "#8a5a32",
  p: "#7d4fb0",
  m: "#d7a6ea",
  a: "#f4efe4",
  u: "#8e2433",
  c: "#ef7a32",
  g: "#3aaa4a",
  e: "#f2f6ef",
  r: "#d64545",
  z: "#f6e7c1",
};

function exact(lines, palette, width) {
  const rows = lines.map((line) => line.padEnd(width, ".").slice(0, width));
  return { rows, palette, w: width, h: rows.length };
}

function trimVertical(sprite) {
  const rows = sprite.rows.slice();
  while (rows.length > 1 && /^\.+$/.test(rows[0])) rows.shift();
  while (rows.length > 1 && /^\.+$/.test(rows[rows.length - 1])) rows.pop();
  return { ...sprite, rows, h: rows.length };
}

function stack(head, torso, torsoCount, legs, palette) {
  return exact([...head, ...Array.from({ length: torsoCount }, () => torso), ...legs], palette, 16);
}

const HEAD = [
  "....oooooo......",
  "...osssssso.....",
  "..oswwsswwso....",
  "..osssssssso....",
  "...ossbbsso.....",
  "....tttttt......",
];

const LEGS = [
  "....tt..tt......",
  "....tt..tt......",
  "....kk..kk......",
  "....kk..kk......",
];

const small = stack(HEAD, "...ttttttttt....", 6, LEGS, PAL);
const superBody = stack(HEAD, "...ttttttttt....", 22, LEGS, PAL);
const fireBody = stack(HEAD, "...ccccccccc....", 22, LEGS, { ...PAL, t: "#ef7a32", d: "#b4531a" });

const walker = exact(
  [
    "................",
    "................",
    "....pppppp......",
    "...pppppppp.....",
    "..ppwwppwwpp....",
    "..pppppppppp....",
    "..ppmmmmmmmm....",
    "...pppppppp.....",
    "....pppppp......",
    "...kk....kk.....",
    "..kk......kk....",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  PAL,
  16,
);

const shell = exact(
  [
    "................",
    "......gg........",
    ".....gggg.......",
    "....gwwggg......",
    "...gggggggg.....",
    "..gggggggggg....",
    "..gygygygygg....",
    "...gggggggg.....",
    "....gggggg......",
    "....kk..kk......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  PAL,
  16,
);

const mushroom = exact(
  [
    "................",
    "................",
    ".....rrrr.......",
    "...rrrrrree.....",
    "..rrrrrreeee....",
    "..rrwwrrrrrr....",
    "...rrrrrrr......",
    "....zzzzzz......",
    "...zzzzzzzz.....",
    "....kk..kk......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  PAL,
  16,
);

const life = exact(
  mushroom.rows.map((row) => row.replaceAll("r", "g")),
  PAL,
  16,
);

const flower = exact(
  [
    "................",
    "......rr..rr....",
    ".....rryyrr.....",
    "......yyyy......",
    ".....yyyyyy.....",
    "......yyyy......",
    ".......gg.......",
    "......gggg......",
    ".......gg.......",
    ".......gg.......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  PAL,
  16,
);

const star = exact(
  [
    "................",
    ".......yy.......",
    "......yyyy......",
    "...yyyyyyyyyy...",
    "....yyyyyyyy....",
    ".....yyyyyy.....",
    "....yy....yy....",
    "...yy......yy...",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  PAL,
  16,
);

const boss = exact(
  [
    "............kkkk............",
    "...........kuuuk............",
    "......kk....uu....kk........",
    ".....kook..uuuu..kook.......",
    ".....koookuuuuuukoook.......",
    "......kooouwwwwuoook........",
    ".......kouuwwwwuuk..........",
    "........uuuwwwwuu...........",
    ".......uuuuuuuuuuu..........",
    "......uuuuuuuuuuuuu.........",
    ".....uuuuyyyyyyuuuu.........",
    "....uuuuyyyyyyyyyuuu........",
    "...uuuuuyyyyyyyyyuuuu.......",
    "...uuuuuyyyyyyyyyuuuu.......",
    "...uuuuuyyyuuyyyuuuuu.......",
    "....uuuuyyyyyyyyyuuu........",
    ".....uuuuyyyyyyuuuu.........",
    "......uuuuuuuuuuuu..........",
    ".......uuuuuuuuuu...........",
    "........kkk..kkk............",
    ".......kk......kk...........",
    "............................",
    "............................",
    "............................",
    "............................",
    "............................",
    "............................",
    "............................",
    "............................",
    "............................",
    "............................",
    "............................",
  ],
  PAL,
  32,
);

const fireball = exact(
  ["..yy..", ".yccy.", "ycccy.", "ycccy.", ".yccy.", "..yy.."],
  PAL,
  6,
);

export const ACTORS = {
  small,
  super: superBody,
  fire: fireBody,
  walker: trimVertical(walker),
  shell: trimVertical(shell),
  mushroom: trimVertical(mushroom),
  life: trimVertical(life),
  flower: trimVertical(flower),
  star: trimVertical(star),
  boss: trimVertical(boss),
  fireball,
};

const SPARK = ["#fff4c2", "#9ee7ff", "#ffd0e8", "#ffe28a"];

export function blit(ctx, sprite, x, y, { flip = false, spark = -1 } = {}) {
  const dx = Math.round(x);
  const dy = Math.round(y);
  for (let row = 0; row < sprite.h; row += 1) {
    for (let col = 0; col < sprite.w; col += 1) {
      const sample = flip ? sprite.w - 1 - col : col;
      const ch = sprite.rows[row][sample];
      if (!ch || ch === ".") continue;
      ctx.fillStyle = spark >= 0 ? SPARK[spark % SPARK.length] : sprite.palette[ch] || "#fff";
      ctx.fillRect(dx + col, dy + row, 1, 1);
    }
  }
}

export function drawActor(ctx, name, box, options) {
  const sprite = ACTORS[name];
  if (!sprite) return;
  const x = box.x + (box.w - sprite.w) / 2;
  const y = box.y + box.h - sprite.h;
  blit(ctx, sprite, x, y, options);
}

export function drawTile(ctx, cell, x, y, theme, frame) {
  if (!cell || cell === "." || cell === " " || cell === "H" || cell === "h") return;
  if (cell === "#") {
    ctx.fillStyle = theme.groundTop;
    ctx.fillRect(x, y, 16, 5);
    ctx.fillStyle = theme.ground;
    ctx.fillRect(x, y + 5, 16, 11);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(x, y + 5, 16, 1);
    ctx.fillRect(x + 8, y + 6, 1, 10);
    return;
  }
  if (cell === "B") {
    ctx.fillStyle = theme.brick;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = theme.brickDark;
    ctx.fillRect(x, y + 7, 16, 2);
    ctx.fillRect(x + 7, y, 2, 7);
    ctx.fillRect(x + 3, y + 9, 2, 7);
    ctx.fillRect(x + 12, y + 9, 2, 7);
    return;
  }
  if (cell === "o") {
    ctx.fillStyle = theme.blockDark;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = "#6d5830";
    ctx.fillRect(x + 4, y + 4, 3, 3);
    ctx.fillRect(x + 9, y + 9, 3, 3);
    return;
  }
  if ("?MFSL".includes(cell)) {
    ctx.fillStyle = theme.block;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = theme.blockDark;
    ctx.fillRect(x, y, 16, 2);
    ctx.fillRect(x, y + 14, 16, 2);
    ctx.fillRect(x, y, 2, 16);
    ctx.fillRect(x + 14, y, 2, 16);
    if (Math.floor(frame / 16) % 2 === 0) {
      ctx.fillStyle = "#fff8e8";
      ctx.fillRect(x + 6, y + 3, 4, 2);
      ctx.fillRect(x + 8, y + 5, 2, 3);
      ctx.fillRect(x + 6, y + 8, 2, 2);
      ctx.fillRect(x + 7, y + 12, 2, 2);
    }
    return;
  }
  if (cell === "{" || cell === "}" || cell === "[" || cell === "]") {
    const cap = cell === "{" || cell === "}";
    ctx.fillStyle = cap ? theme.pipe : theme.pipeDark;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x + 3, y, 3, 16);
    if (cap) {
      ctx.fillStyle = theme.pipe;
      ctx.fillRect(x - (cell === "{" ? 0 : 2), y, 16, 5);
    }
    return;
  }
  if (cell === "~") {
    ctx.fillStyle = "#8d5a32";
    ctx.fillRect(x, y + 4, 16, 8);
    ctx.fillStyle = "#5c3a22";
    ctx.fillRect(x, y + 4, 16, 2);
    ctx.fillRect(x + 4, y + 4, 2, 8);
    ctx.fillRect(x + 11, y + 4, 2, 8);
    return;
  }
  if (cell === "|") {
    ctx.fillStyle = "#d7d2c8";
    ctx.fillRect(x + 7, y, 2, 16);
    ctx.fillStyle = "#d64545";
    const wave = Math.floor(frame / 8) % 2;
    ctx.fillRect(x + 9, y + 1, 6 + wave, 4);
    return;
  }
  if (cell === "=") {
    ctx.fillStyle = "#e6c15a";
    ctx.fillRect(x + 6, y + 2, 3, 12);
    ctx.fillStyle = "#fff1b8";
    ctx.fillRect(x + 2, y + 2, 8, 3);
    return;
  }
  if (cell === "C") {
    const wide = Math.floor(frame / 8 + x) % 2 === 0;
    ctx.fillStyle = "#f2c14e";
    ctx.fillRect(x + (wide ? 4 : 6), y + 4, wide ? 8 : 4, 8);
    return;
  }
}
