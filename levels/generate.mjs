import { writeFileSync } from "node:fs";

const HEIGHT = 17;

function make(width) {
  const rows = Array.from({ length: HEIGHT }, () => Array(width).fill("."));
  for (let x = 0; x < width; x += 1) {
    rows[15][x] = "#";
    rows[16][x] = "#";
  }
  return rows;
}

function pit(rows, x, width) {
  for (let i = 0; i < width; i += 1) {
    rows[15][x + i] = ".";
    rows[16][x + i] = ".";
  }
}

function paint(rows, x, y, width, height, cell) {
  for (let yy = 0; yy < height; yy += 1) {
    for (let xx = 0; xx < width; xx += 1) rows[y + yy][x + xx] = cell;
  }
}

function pipe(rows, x, capY) {
  rows[capY][x] = "{";
  rows[capY][x + 1] = "}";
  for (let y = capY + 1; y <= 14; y += 1) {
    rows[y][x] = "[";
    rows[y][x + 1] = "]";
  }
}

function pole(rows, x) {
  for (let y = 8; y <= 14; y += 1) rows[y][x] = "|";
}

function bridge(rows, x, width) {
  for (let i = 0; i < width; i += 1) {
    rows[15][x + i] = "~";
    rows[16][x + i] = ".";
  }
}

function save(level, rows) {
  const width = rows[0].length;
  if (rows.some((row) => row.length !== width) || rows.length !== HEIGHT) {
    throw new Error(`${level.id} is not rectangular`);
  }
  writeFileSync(
    new URL(`./${level.id}.json`, import.meta.url),
    `${JSON.stringify({ ...level, rows: rows.map((row) => row.join("")) }, null, 2)}\n`,
  );
}

function overworld() {
  const rows = make(78);
  paint(rows, 14, 11, 1, 1, "?");
  paint(rows, 15, 11, 1, 1, "B");
  paint(rows, 16, 11, 1, 1, "M");
  paint(rows, 17, 11, 1, 1, "B");
  paint(rows, 18, 11, 1, 1, "?");
  paint(rows, 21, 11, 1, 1, "H");
  paint(rows, 46, 11, 4, 1, "B");
  paint(rows, 47, 10, 2, 1, "C");
  for (const x of [26, 27, 28, 62, 63]) rows[14][x] = "C";
  pipe(rows, 36, 13);
  pit(rows, 58, 3);
  pole(rows, 73);
  save(
    {
      id: "1-1",
      theme: "overworld",
      time: 300,
      spawn: { x: 3, y: 15 },
      entities: [
        { type: "walker", x: 30, y: 15 },
        { type: "walker", x: 44, y: 15 },
        { type: "walker", x: 52, y: 15 },
        { type: "shell", x: 66, y: 15 },
      ],
      warps: [{ x: 36, y: 13, to: "1-secret" }],
    },
    rows,
  );
}

function secret(id, theme, reward) {
  const rows = make(22);
  pipe(rows, 2, 13);
  for (let x = 8; x <= 14; x += 1) rows[14][x] = "C";
  rows[11][16] = reward;
  rows[11][18] = "L";
  save(
    {
      id,
      theme,
      time: 180,
      spawn: { x: 6, y: 15 },
      entities: [],
      warps: [{ x: 2, y: 13, to: "return" }],
    },
    rows,
  );
}

function underground(id, time) {
  const rows = make(68);
  paint(rows, 10, 6, 42, 1, "#");
  rows[11][16] = "F";
  rows[11][18] = "?";
  rows[11][19] = "B";
  rows[11][20] = "?";
  rows[14][24] = "B";
  for (const x of [30, 31, 32, 50, 51]) rows[13][x] = "C";
  pit(rows, 40, 3);
  pole(rows, 63);
  save(
    {
      id,
      theme: "underground",
      time,
      spawn: { x: 3, y: 15 },
      entities: [
        { type: "walker", x: 22, y: 15 },
        { type: "shell", x: 28, y: 15 },
        { type: "shell", x: 48, y: 15, dir: 1 },
        { type: "walker", x: 56, y: 15 },
      ],
      warps: [],
    },
    rows,
  );
}

function castle(id, time, width, reward) {
  const rows = make(width);
  if (reward) rows[11][reward] = id === "3-3" ? "F" : "M";
  rows[11][reward + 2] = "?";
  pit(rows, 20, 3);
  bridge(rows, width - 24, 10);
  rows[14][width - 12] = "=";
  save(
    {
      id,
      theme: "castle",
      time,
      spawn: { x: 3, y: 15 },
      entities: [
        { type: "walker", x: 12, y: 15 },
        { type: "walker", x: 32, y: 15 },
        { type: "boss", x: width - 20, y: 15 },
      ],
      warps: [],
    },
    rows,
  );
}

function undergroundTwo() {
  const rows = make(70);
  paint(rows, 8, 5, 36, 1, "#");
  rows[11][12] = "S";
  rows[11][14] = "F";
  rows[11][15] = "B";
  rows[11][16] = "?";
  paint(rows, 44, 11, 4, 1, "B");
  for (const x of [22, 23, 24, 48]) rows[13][x] = "C";
  pit(rows, 34, 3);
  pole(rows, 65);
  save(
    {
      id: "2-2",
      theme: "underground",
      time: 260,
      spawn: { x: 3, y: 15 },
      entities: [
        { type: "shell", x: 18, y: 15 },
        { type: "walker", x: 26, y: 15 },
        { type: "shell", x: 50, y: 15, dir: 1 },
        { type: "walker", x: 58, y: 15 },
      ],
      warps: [],
    },
    rows,
  );
}

function dusk() {
  const rows = make(80);
  rows[11][12] = "M";
  rows[11][14] = "?";
  rows[11][16] = "h";
  paint(rows, 28, 11, 3, 1, "B");
  for (const x of [18, 19, 46, 47]) rows[14][x] = "C";
  pit(rows, 24, 3);
  pipe(rows, 40, 13);
  pit(rows, 56, 3);
  pole(rows, 75);
  save(
    {
      id: "2-1",
      theme: "dusk",
      time: 300,
      spawn: { x: 3, y: 15 },
      entities: [
        { type: "walker", x: 20, y: 15 },
        { type: "shell", x: 34, y: 15 },
        { type: "walker", x: 50, y: 15 },
        { type: "walker", x: 66, y: 15 },
        { type: "shell", x: 70, y: 15, dir: 1 },
      ],
      warps: [{ x: 40, y: 13, to: "2-secret" }],
    },
    rows,
  );
}

function night() {
  const rows = make(84);
  rows[11][12] = "M";
  rows[11][30] = "S";
  rows[11][32] = "?";
  rows[11][33] = "B";
  for (const x of [26, 27, 52, 53]) rows[14][x] = "C";
  pit(rows, 20, 3);
  pit(rows, 38, 3);
  pipe(rows, 48, 13);
  pit(rows, 62, 3);
  pole(rows, 79);
  save(
    {
      id: "3-1",
      theme: "night",
      time: 300,
      spawn: { x: 3, y: 15 },
      entities: [
        { type: "walker", x: 16, y: 15 },
        { type: "shell", x: 28, y: 15 },
        { type: "walker", x: 44, y: 15 },
        { type: "walker", x: 56, y: 15 },
        { type: "shell", x: 72, y: 15 },
      ],
      warps: [{ x: 48, y: 13, to: "3-secret" }],
    },
    rows,
  );
}

function athletic() {
  const rows = make(76);
  pit(rows, 11, 25);
  paint(rows, 13, 13, 5, 1, "#");
  paint(rows, 20, 12, 6, 1, "#");
  paint(rows, 28, 13, 6, 1, "#");
  for (const x of [15, 22, 30]) rows[11][x] = "C";
  pit(rows, 47, 3);
  rows[11][40] = "M";
  pole(rows, 70);
  save(
    {
      id: "3-2",
      theme: "overworld",
      time: 320,
      spawn: { x: 3, y: 15 },
      entities: [
        { type: "walker", x: 42, y: 15 },
        { type: "shell", x: 58, y: 15 },
      ],
      warps: [],
    },
    rows,
  );
}

overworld();
secret("1-secret", "underground", "S");
underground("1-2", 280);
castle("1-3", 260, 64, 10);
dusk();
secret("2-secret", "underground", "?");
undergroundTwo();
castle("2-3", 250, 66, 10);
night();
secret("3-secret", "night", "F");
athletic();
castle("3-3", 240, 72, 10);
