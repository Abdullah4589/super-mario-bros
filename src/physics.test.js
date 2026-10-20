import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isStomp, moveX, moveY } from "./collision.js";
import { DIFFICULTIES, nextDifficulty, stageTime } from "./difficulty.js";
import { createEntity, nextShellState, updateEnemy } from "./entities.js";
import { addCoin, flagScore } from "./hud.js";
import { canWarp, nextStage, parseLevel } from "./level.js";
import { MAX_RUN, MAX_WALK, createPlayer, jumpApex, startJump, stepHorizontal, stepVertical } from "./player.js";
import { ACTORS } from "./sprites.js";
import { TILE, applyBump, isSolidCell, solidAt } from "./tiles.js";

const levelDir = join(dirname(fileURLToPath(import.meta.url)), "..", "levels");

function load(id) {
  return parseLevel(JSON.parse(readFileSync(join(levelDir, `${id}.json`), "utf8")));
}

function findCell(level, cell) {
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      if (level.tiles[y][x] === cell) return { x, y, cell };
    }
  }
  return null;
}

test("a full jump rises higher than a short hop", () => {
  const shortHop = jumpApex(2);
  const full = jumpApex(80);
  assert.ok(full > shortHop * 1.6, `full ${full} short ${shortHop}`);
  assert.ok(shortHop > 8);
  assert.ok(full < 160);
});

test("releasing jump adds more gravity than holding it", () => {
  const held = createPlayer(0, 0);
  const released = createPlayer(0, 0);
  for (const player of [held, released]) {
    player.grounded = false;
    player.jumping = true;
    player.vy = -4;
  }
  stepVertical(held, true);
  stepVertical(released, false);
  assert.ok(released.vy > held.vy);
});

test("jump only starts from the ground", () => {
  const airborne = createPlayer(0, 0);
  airborne.grounded = false;
  assert.equal(startJump(airborne), false);
  const grounded = createPlayer(0, 0);
  grounded.grounded = true;
  assert.equal(startJump(grounded), true);
  assert.ok(grounded.vy < 0);
});

test("run speed stays within the run cap", () => {
  const player = createPlayer(0, 0);
  player.grounded = true;
  for (let frame = 0; frame < 80; frame += 1) stepHorizontal(player, { right: true, run: true });
  assert.ok(player.vx > MAX_RUN - 0.05);
  assert.ok(player.vx <= MAX_RUN + 0.01);
});

test("hoppers stay slower than a hard-mode player and jump when grounded", () => {
  const level = load("1-1");
  for (const type of ["walker", "shell", "hopper", "boss"]) {
    const enemy = createEntity({ type, x: 8, y: 15 });
    assert.ok(enemy.speed > 0, type);
    assert.ok(enemy.speed * DIFFICULTIES.hard.enemyScale < MAX_WALK, type);
  }
  const hopper = createEntity({ type: "hopper", x: 8, y: 15 });
  hopper.grounded = true;
  hopper.hopCd = 1;
  updateEnemy(hopper, level);
  assert.ok(hopper.vy < 0);
});

test("stomps count only while falling onto an enemy", () => {
  const enemy = { x: 4, y: 20, w: 14, h: 16 };
  const falling = { x: 0, y: 8, w: 12, h: 16, vy: 3 };
  assert.equal(isStomp(falling, enemy, { falling: true, prevBottom: 20 }), true);
  assert.equal(isStomp(falling, enemy, { falling: false, prevBottom: 20 }), false);
  const beside = { x: 0, y: 20, w: 12, h: 16, vy: 0 };
  assert.equal(isStomp(beside, enemy, { falling: false, prevBottom: 36 }), false);
});

test("a shell changes state when stomped or kicked", () => {
  const enemy = { x: 20, y: 0, w: 14, h: 16, dir: -1 };
  const player = { x: 0, y: 0, w: 12, h: 16 };
  assert.deepEqual(nextShellState("walk", player, enemy), { state: "still", dir: -1 });
  assert.equal(nextShellState("still", player, enemy).state, "slide");
  assert.equal(nextShellState("still", player, enemy).dir, 1);
  assert.deepEqual(nextShellState("slide", player, enemy), { state: "still", dir: -1 });
});

test("question blocks, bricks, and hidden blocks bump by form", () => {
  assert.deepEqual(applyBump("?", "small"), { cell: "o", spawn: "coin", score: 0, bump: true });
  assert.equal(applyBump("B", "small").cell, "B");
  assert.equal(applyBump("B", "small").break, undefined);
  assert.equal(applyBump("B", "super").cell, ".");
  assert.equal(applyBump("B", "super").break, true);
  assert.equal(applyBump("F", "small").spawn, "mushroom");
  assert.equal(applyBump("F", "fire").spawn, "flower");
  assert.equal(applyBump("H", "small").spawn, "mushroom");
  assert.equal(applyBump("h", "super").spawn, "life");
  assert.equal(applyBump("#", "super"), null);
});

test("one hundred coins add a life", () => {
  const session = { coins: 99, score: 0, lives: 2 };
  assert.equal(addCoin(session), true);
  assert.equal(session.coins, 0);
  assert.equal(session.lives, 3);
  assert.equal(session.score, 200);
  assert.equal(addCoin(session), false);
  assert.equal(session.coins, 1);
});

test("higher flagpole grabs score more", () => {
  const pole = { ty: 8 };
  assert.ok(flagScore(8 * TILE, pole) > flagScore(13 * TILE, pole));
  assert.equal(flagScore(14 * TILE, pole), 100);
});

test("pipes warp only while grounded and holding down", () => {
  const player = createPlayer(34 * TILE, 13 * TILE - 16);
  player.grounded = true;
  const warps = [{ x: 34, y: 13, to: "1-secret" }];
  assert.equal(canWarp(player, warps, true).to, "1-secret");
  assert.equal(canWarp(player, warps, false), null);
  player.grounded = false;
  assert.equal(canWarp(player, warps, true), null);
});

test("easy, medium, and hard change lives, time, and enemy speed", () => {
  assert.equal(DIFFICULTIES.easy.lives, 5);
  assert.equal(DIFFICULTIES.medium.lives, 3);
  assert.equal(DIFFICULTIES.hard.lives, 2);
  assert.ok(DIFFICULTIES.easy.timeScale > DIFFICULTIES.medium.timeScale);
  assert.ok(DIFFICULTIES.medium.timeScale > DIFFICULTIES.hard.timeScale);
  assert.ok(DIFFICULTIES.hard.enemyScale > DIFFICULTIES.medium.enemyScale);
  assert.ok(DIFFICULTIES.medium.enemyScale > DIFFICULTIES.easy.enemyScale);
  assert.equal(nextDifficulty("medium", 1), "hard");
  assert.equal(nextDifficulty("hard", 1), "easy");
  assert.equal(nextDifficulty("easy", -1), "hard");
  assert.ok(stageTime(300, "easy") > stageTime(300, "medium"));
  assert.ok(stageTime(300, "medium") > stageTime(300, "hard"));
});

test("campaign order walks through three worlds", () => {
  assert.equal(nextStage("1-1"), "1-2");
  assert.equal(nextStage("1-3"), "2-1");
  assert.equal(nextStage("3-2"), "3-3");
  assert.equal(nextStage("3-3"), null);
});

test("sprites fill their boxes", () => {
  assert.equal(ACTORS.small.h, 16);
  assert.equal(ACTORS.super.h, 32);
  assert.equal(ACTORS.fire.h, 32);
  for (const [name, sprite] of Object.entries(ACTORS)) {
    assert.equal(sprite.rows.length, sprite.h, name);
    assert.ok(sprite.rows.every((row) => row.length === sprite.w), name);
    assert.ok(sprite.rows.some((row) => /[^. ]/.test(row)), name);
  }
});

test("stages are rectangular, reachable, and wired together", () => {
  const files = readdirSync(levelDir).filter((name) => name.endsWith(".json"));
  const ids = new Set(files.map((name) => name.replace(/\.json$/, "")));
  assert.equal(files.length, 12);
  for (const id of ids) {
    const level = load(id);
    const castle = id.endsWith("-3");
    const secret = id.includes("secret");
    assert.equal(level.tiles[level.spawn.y][level.spawn.x] && isSolidCell(level.tiles[level.spawn.y][level.spawn.x]), true, id);
    for (const enemy of level.entities) {
      const tx = Math.floor((enemy.x + enemy.w / 2) / TILE);
      const ty = Math.floor((enemy.y + enemy.h) / TILE);
      assert.equal(isSolidCell(level.tiles[ty][tx]), true, `${id} ${enemy.type}`);
    }
    for (const warp of level.warps) {
      if (warp.to !== "return") assert.ok(ids.has(warp.to), `${id} -> ${warp.to}`);
      assert.equal(level.tiles[warp.y][warp.x], "{", id);
    }
    if (castle) {
      assert.ok(findCell(level, "="), id);
      assert.ok(level.entities.some((enemy) => enemy.type === "boss"), id);
    } else if (secret) {
      assert.ok(level.warps.some((warp) => warp.to === "return"), id);
    } else {
      assert.ok(findCell(level, "|"), id);
    }
    if (!secret) assert.ok(level.entities.some((enemy) => enemy.type === "hopper"), id);
  }
});

test("the player stands, runs, and bumps a coin block on 1-1", () => {
  const level = load("1-1");
  const player = createPlayer(level.spawn.x * TILE + 2, level.spawn.y * TILE - 16, "small");
  player.vy = 2;
  moveY(player, level);
  assert.equal(player.grounded, true);
  assert.equal(player.y + player.h, level.spawn.y * TILE);

  const start = player.x;
  for (let frame = 0; frame < 45; frame += 1) {
    stepHorizontal(player, { right: true, run: true });
    moveX(player, level);
    stepVertical(player, false);
    moveY(player, level);
  }
  assert.ok(player.x > start + 20);
  assert.equal(player.grounded, true);

  const spot = findCell(level, "?");
  assert.equal(solidAt(level, spot.x, spot.y), true);
  const bumper = createPlayer(spot.x * TILE + 2, (spot.y + 1) * TILE + 4, "small");
  bumper.vy = -8;
  const ceilings = moveY(bumper, level);
  assert.ok(ceilings.some((tile) => tile.cell === "?"));
  assert.equal(applyBump("H", "small").cell, "o");
  assert.equal(solidAt(level, findCell(level, "H").x, findCell(level, "H").y), false);
  assert.ok(createEntity({ type: "walker", x: 1, y: 15 }).h > 0);
});
