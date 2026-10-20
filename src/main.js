import { createAudio } from "./audio.js";
import { cellsOverlapping, isStomp, moveX, moveY, overlap, probeRoomAbove } from "./collision.js";
import { createFireball, nextShellState, updateEnemy, updateFireball } from "./entities.js";
import { DIFFICULTIES, nextDifficulty, stageTime } from "./difficulty.js";
import { addCoin, drawCenter, drawHud, drawText, flagScore, pad, textWidth } from "./hud.js";
import { createInput } from "./input.js";
import { createItem, updateItem } from "./items.js";
import { cameraFor, canWarp, cloneLevel, fetchLevel, nextStage } from "./level.js";
import {
  GRAVITY,
  MAX_FALL,
  applyPower,
  createPlayer,
  playerHeight,
  shrinkPlayer,
  startJump,
  stepHorizontal,
  stepVertical,
} from "./player.js";
import { drawActor, drawTile } from "./sprites.js";
import { THEMES, TILE, applyBump, bumpOffset, getCell, isSolidCell, setCell, tickBumps } from "./tiles.js";

const VIEW_W = 480;
const VIEW_H = 270;
const STEP = 1000 / 60;

function createSession(difficultyId) {
  const rules = DIFFICULTIES[difficultyId] || DIFFICULTIES.medium;
  return { score: 0, coins: 0, lives: rules.lives, difficulty: rules.id };
}

function createState() {
  return {
    mode: "title",
    difficulty: "medium",
    session: createSession("medium"),
    level: null,
    player: null,
    fireballs: [],
    floaters: [],
    particles: [],
    timeLeft: 300,
    timeAcc: 0,
    clearHold: 0,
    dieTimer: 0,
    introTimer: 0,
    warpLock: 0,
    returnSave: null,
    switchTripped: false,
    bossFell: false,
    frame: 0,
    message: "",
  };
}

export function startGame(canvas, input = createInput(), audio = createAudio()) {
  const ctx = canvas.getContext("2d");
  const state = createState();
  let loading = false;

  function floater(text, x, y) {
    state.floaters.push({ text: String(text), x, y, life: 42 });
  }

  function rules() {
    return DIFFICULTIES[state.difficulty] || DIFFICULTIES.medium;
  }

  function tuneLevel(level) {
    const diff = rules();
    for (const enemy of level.entities) {
      enemy.speed *= diff.enemyScale;
      enemy.slideSpeed = 3 * diff.enemyScale;
      if (enemy.type === "boss") {
        enemy.fireInterval = diff.bossFire;
        enemy.fireCd = diff.bossFire;
      }
    }
  }

  function spawnPlayer(level, form) {
    const height = playerHeight(form);
    const player = createPlayer(level.spawn.x * TILE + 2, level.spawn.y * TILE - height, form);
    player.jumpScale = rules().jumpScale;
    player.grounded = true;
    return player;
  }

  async function loadStage(id, { secret = false, form = null, keepTime = false } = {}) {
    if (loading) return;
    loading = true;
    state.mode = "loading";
    try {
      const level = await fetchLevel(id);
      const useForm = form || "small";
      state.level = level;
      tuneLevel(level);
      state.player = spawnPlayer(level, useForm);
      state.fireballs = [];
      state.floaters = [];
      state.particles = [];
      state.switchTripped = false;
      state.bossFell = false;
      state.clearHold = 0;
      state.timeAcc = 0;
      if (!keepTime) state.timeLeft = stageTime(level.time, state.difficulty);
      state.warpLock = 24;
      state.introTimer = secret ? 0 : 80;
      state.mode = secret ? "playing" : "intro";
      state.message = "";
    } catch (error) {
      state.mode = "error";
      state.message = String(error.message || error).toUpperCase();
    } finally {
      loading = false;
    }
  }

  function beginGame() {
    audio.unlock();
    state.session = createSession(state.difficulty);
    state.returnSave = null;
    return loadStage("1-1", { form: "small" });
  }

  function defeatEnemy(enemy, score) {
    if (!enemy.alive) return;
    enemy.alive = false;
    enemy.squish = enemy.type === "walker" ? 14 : 0;
    state.session.score += score;
    floater(score, enemy.x, enemy.y);
    audio.stomp();
  }

  function hurt() {
    const { player } = state;
    if (state.mode !== "playing" || player.star > 0 || player.invuln > 0) return;
    if (player.form !== "small") {
      shrinkPlayer(player, rules().invuln);
      audio.hurt();
      return;
    }
    kill();
  }

  function kill() {
    if (state.mode !== "playing") return;
    state.mode = "dying";
    state.player.vx = 0;
    state.player.vy = -6.5;
    state.dieTimer = 80;
    audio.die();
  }

  function bumpTile(tx, ty) {
    const { level, player } = state;
    const result = applyBump(getCell(level, tx, ty), player.form);
    if (!result) return;
    setCell(level, tx, ty, result.cell);
    level.bumps.set(`${tx},${ty}`, 8);
    if (result.score) {
      state.session.score += result.score;
      floater(result.score, tx * TILE, ty * TILE);
    }
    if (result.spawn === "coin") {
      const extra = addCoin(state.session);
      audio.coin();
      floater(200, tx * TILE, ty * TILE - 8);
      if (extra) audio.oneUp();
    } else if (result.spawn) {
      level.items.push(createItem(result.spawn, tx * TILE, ty * TILE));
      audio.bump();
    }
    if (result.break) {
      audio.break();
      const theme = THEMES[level.theme] || THEMES.overworld;
      for (const vx of [-1.4, 1.4]) {
        for (const vy of [-3.2, -1.4]) {
          state.particles.push({
            x: tx * TILE + 6,
            y: ty * TILE + 6,
            vx,
            vy,
            life: 26,
            color: theme.brick,
          });
        }
      }
    } else if (!result.spawn) {
      audio.bump();
    }
    for (const enemy of level.entities) {
      if (!enemy.alive || enemy.type === "boss") continue;
      const onTop =
        Math.abs(enemy.y + enemy.h - ty * TILE) <= 4 &&
        enemy.x + enemy.w > tx * TILE &&
        enemy.x < (tx + 1) * TILE;
      if (onTop) defeatEnemy(enemy, 100);
    }
    const block = { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE };
    if (isSolidCell(result.cell) && overlap(player, block)) {
      player.y = block.y + block.h;
      player.vy = 0;
      player.jumping = false;
    }
  }

  function collectItem(item) {
    const { player, level } = state;
    item.alive = false;
    const effect = applyPower(player, item.type, probeRoomAbove(player, level), rules().star);
    if (effect === "life") {
      state.session.lives += 1;
      audio.oneUp();
      floater("1UP", item.x, item.y);
      return;
    }
    if (effect) {
      state.session.score += 1000;
      audio.power();
      floater(1000, item.x, item.y);
    }
  }

  function tripSwitch() {
    const { level } = state;
    state.switchTripped = true;
    for (let ty = 0; ty < level.height; ty += 1) {
      for (let tx = 0; tx < level.width; tx += 1) {
        const cell = level.tiles[ty][tx];
        if (cell === "~" || cell === "=") level.tiles[ty][tx] = ".";
      }
    }
    for (const enemy of level.entities) {
      if (enemy.type === "boss") {
        enemy.falling = true;
        enemy.vy = -2.2;
      }
    }
    audio.break();
  }

  async function enterWarp(warp) {
    if (warp.to === "return" && state.returnSave) {
      const save = state.returnSave;
      state.level = save.level;
      state.player = save.player;
      state.timeLeft = save.timeLeft;
      const right = (save.warp.x + 2) * TILE + 2;
      const left = save.warp.x * TILE - state.player.w - 4;
      state.player.x = right + state.player.w < state.level.width * TILE ? right : left;
      state.player.vx = 0;
      state.player.vy = 0;
      state.player.invuln = 45;
      state.fireballs = [];
      state.returnSave = null;
      state.warpLock = 30;
      state.mode = "playing";
      return;
    }
    state.returnSave = {
      level: cloneLevel(state.level),
      player: { ...state.player },
      timeLeft: state.timeLeft,
      warp,
    };
    await loadStage(warp.to, { secret: true, keepTime: true, form: state.player.form });
    if (state.player) state.player.invuln = 45;
  }

  function advance() {
    const id = state.level.id;
    const form = state.player.form;
    if (id === "3-3") {
      state.mode = "ending";
      audio.clear();
      return;
    }
    if (id.endsWith("-3")) {
      state.mode = "worldClear";
      state.clearHold = 0;
      return;
    }
    const next = nextStage(id);
    if (!next) {
      state.mode = "ending";
      return;
    }
    loadStage(next, { form });
  }

  function updatePlaying(input) {
    const { level, player } = state;
    state.timeAcc += 1;
    if (state.timeAcc >= 30) {
      state.timeAcc = 0;
      state.timeLeft -= 1;
      if (state.timeLeft <= 0) {
        kill();
        return;
      }
    }
    if (player.invuln > 0) player.invuln -= 1;
    if (player.star > 0) player.star -= 1;
    if (player.fireCd > 0) player.fireCd -= 1;
    if (state.warpLock > 0) state.warpLock -= 1;

    const falling = !player.grounded && player.vy > 0;
    const prevBottom = player.y + player.h;

    stepHorizontal(player, input);
    moveX(player, level);
    if (input.jumpPressed && startJump(player)) audio.jump();
    stepVertical(player, input.jump);
    const movingUp = player.vy < 0;
    const ceilings = moveY(player, level);

    if (player.x < 0) {
      player.x = 0;
      player.vx = 0;
    }
    const maxX = level.width * TILE - player.w;
    if (player.x > maxX) {
      player.x = maxX;
      player.vx = 0;
    }

    if (movingUp) {
      for (const tile of ceilings) {
        if (tile.cell && "?MFSLB".includes(tile.cell)) bumpTile(tile.tx, tile.ty);
      }
      const head = { x: player.x + 1, y: player.y, w: Math.max(1, player.w - 2), h: 8 };
      for (const tile of cellsOverlapping(head, level)) {
        if (tile.cell === "H" || tile.cell === "h") bumpTile(tile.tx, tile.ty);
      }
    }

    for (const tile of cellsOverlapping(player, level)) {
      if (tile.cell === "C") {
        setCell(level, tile.tx, tile.ty, ".");
        if (addCoin(state.session)) audio.oneUp();
        else audio.coin();
      }
    }

    for (const item of level.items) updateItem(item, level);
    for (const item of level.items) {
      if (!item.alive || item.emerging > 0) continue;
      if (overlap(player, item)) collectItem(item);
    }
    level.items = level.items.filter((item) => item.alive);

    for (const enemy of level.entities) {
      const result = updateEnemy(enemy, level);
      if (result.shot) {
        state.fireballs.push(createFireball(result.shot.x, result.shot.y, result.shot.dir, false));
      }
      if (result.fell && !state.bossFell) {
        state.bossFell = true;
        state.session.score += 2000;
        floater(2000, enemy.x, enemy.y);
        audio.clear();
        state.mode = "stageClear";
        state.clearHold = 0;
      }
    }

    if (state.mode === "playing") {
      for (const enemy of level.entities) {
        if (!enemy.alive || enemy.falling) continue;
        if (!overlap(player, enemy)) continue;
        if (enemy.type === "boss") {
          hurt();
          continue;
        }
        if (player.star > 0) {
          defeatEnemy(enemy, 100);
          continue;
        }
        if (isStomp(player, enemy, { falling, prevBottom })) {
          if (enemy.type === "shell") {
            const next = nextShellState(enemy.state, player, enemy);
            enemy.state = next.state;
            enemy.dir = next.dir;
            if (next.state === "slide") enemy.kickGrace = 8;
            state.session.score += 100;
            floater(100, enemy.x, enemy.y);
            audio.stomp();
          } else {
            defeatEnemy(enemy, 100);
          }
          player.y = enemy.y - player.h;
          player.vy = -4.2;
          player.grounded = false;
          player.jumping = false;
          continue;
        }
        if (enemy.type === "shell" && enemy.state === "still") {
          const next = nextShellState("still", player, enemy);
          enemy.state = next.state;
          enemy.dir = next.dir;
          enemy.kickGrace = 10;
          enemy.x += enemy.dir * 6;
          audio.kick();
          continue;
        }
        if (enemy.kickGrace > 0) continue;
        hurt();
      }
    }

    for (const shell of level.entities) {
      if (!shell.alive || shell.type !== "shell" || shell.state !== "slide") continue;
      for (const other of level.entities) {
        if (other === shell || !other.alive || other.type === "boss") continue;
        if (overlap(shell, other)) defeatEnemy(other, 200);
      }
    }

    if (input.firePressed && player.form === "fire" && player.fireCd <= 0) {
      const live = state.fireballs.filter((ball) => ball.alive && ball.friendly).length;
      if (live < 2) {
        const x = player.facing > 0 ? player.x + player.w : player.x - 8;
        state.fireballs.push(createFireball(x, player.y + player.h * 0.35, player.facing, true));
        player.fireCd = 18;
        audio.fire();
      }
    }

    for (const ball of state.fireballs) {
      updateFireball(ball, level);
      if (!ball.alive || state.mode !== "playing") continue;
      if (!ball.friendly) {
        if (overlap(ball, player)) {
          ball.alive = false;
          hurt();
        }
        continue;
      }
      for (const enemy of level.entities) {
        if (!enemy.alive) continue;
        if (!overlap(ball, enemy)) continue;
        ball.alive = false;
        if (enemy.type !== "boss") defeatEnemy(enemy, 100);
        break;
      }
    }
    state.fireballs = state.fireballs.filter((ball) => ball.alive);

    if (state.mode === "playing") {
      for (const tile of cellsOverlapping(player, level)) {
        if (tile.cell === "|" && level.pole) {
          state.session.score += flagScore(player.y, level.pole);
          player.vx = 0;
          player.vy = 0;
          player.x = level.pole.tx * TILE + 1;
          state.mode = "pole";
          audio.clear();
          return;
        }
        if (tile.cell === "=" && !state.switchTripped) tripSwitch();
      }
    }

    if (state.mode === "playing" && player.y > level.height * TILE) kill();

    if (state.mode === "playing" && state.warpLock <= 0) {
      const warp = canWarp(player, level.warps, input.down);
      if (warp) {
        state.warpLock = 30;
        state.mode = "loading";
        enterWarp(warp);
      }
    }

    tickBumps(level);
    level.entities = level.entities.filter((enemy) => enemy.alive || enemy.squish > 0);
  }

  function update(input) {
    state.frame += 1;
    if (state.mode === "title" || state.mode === "gameOver" || state.mode === "ending") {
      if (state.mode === "title") {
        if (input.leftPressed) {
          state.difficulty = nextDifficulty(state.difficulty, -1);
          input.leftPressed = false;
        } else if (input.rightPressed) {
          state.difficulty = nextDifficulty(state.difficulty, 1);
          input.rightPressed = false;
        }
      }
      if (input.startPressed) {
        if (state.mode === "title") beginGame();
        else {
          state.mode = "title";
          state.level = null;
          state.player = null;
        }
      }
    } else if (state.mode === "pole") {
      const floor = 15 * TILE;
      if (state.player.y + state.player.h < floor) state.player.y += 1.8;
      else {
        state.player.y = floor - state.player.h;
        state.mode = "stageClear";
        state.clearHold = 0;
      }
    } else if (state.mode === "intro") {
      state.introTimer -= 1;
      if (state.introTimer <= 0 || input.jumpPressed || input.pausePressed) state.mode = "playing";
    } else if (state.mode === "paused") {
      if (input.pausePressed) state.mode = "playing";
    } else if (state.mode === "playing") {
      if (input.pausePressed) state.mode = "paused";
      else updatePlaying(input);
    } else if (state.mode === "dying") {
      state.player.vy = Math.min(MAX_FALL, state.player.vy + GRAVITY);
      state.player.y += state.player.vy;
      state.dieTimer -= 1;
      if (state.dieTimer <= 0) {
        state.session.lives -= 1;
        if (state.session.lives <= 0) state.mode = "gameOver";
        else loadStage(state.level.id, { form: "small" });
      }
    } else if (state.mode === "stageClear") {
      const tick = Math.min(3, state.timeLeft);
      if (tick > 0) {
        state.timeLeft -= tick;
        state.session.score += tick * 50;
        if (state.frame % 4 === 0) audio.tick();
      } else {
        state.clearHold += 1;
        if (state.clearHold > 36) advance();
      }
    } else if (state.mode === "worldClear") {
      state.clearHold += 1;
      if (state.clearHold > 110) {
        const next = nextStage(state.level.id);
        loadStage(next, { form: state.player.form });
      }
    }

    for (const mote of state.floaters) {
      mote.y -= 0.45;
      mote.life -= 1;
    }
    state.floaters = state.floaters.filter((mote) => mote.life > 0);
    for (const bit of state.particles) {
      bit.vy = Math.min(MAX_FALL, bit.vy + 0.25);
      bit.x += bit.vx;
      bit.y += bit.vy;
      bit.life -= 1;
    }
    state.particles = state.particles.filter((bit) => bit.life > 0);
  }

  function wrap(value, size) {
    return ((value % size) + size) % size;
  }

  function drawBackground(theme, cam) {
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, theme.sky);
    sky.addColorStop(1, theme.skyDeep);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (!theme.lava) {
      for (let i = 0; i < 5; i += 1) {
        const cx = wrap(i * 210 - cam.x * 0.2, VIEW_W + 140) - 30;
        const cy = 40 + (i % 3) * 16;
        ctx.fillStyle = theme.cloud;
        ctx.fillRect(cx, cy, 26, 8);
        ctx.fillRect(cx + 8, cy - 6, 16, 8);
      }
    }
    for (let i = 0; i < 7; i += 1) {
      const hx = wrap(i * 150 - cam.x * 0.45, VIEW_W + 160) - 20;
      ctx.fillStyle = theme.hill;
      ctx.beginPath();
      ctx.arc(hx, VIEW_H - 8, 58, Math.PI, 0);
      ctx.fill();
    }
  }

  function drawWorld() {
    const { level, player } = state;
    const theme = THEMES[level.theme] || THEMES.overworld;
    const focus = player.x + player.w / 2 + player.facing * 24;
    const cam = cameraFor(level, focus, VIEW_W, VIEW_H);
    drawBackground(theme, cam);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const x1 = Math.min(level.width - 1, Math.floor((cam.x + VIEW_W) / TILE) + 1);
    const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const y1 = Math.min(level.height - 1, Math.floor((cam.y + VIEW_H) / TILE) + 1);
    for (let ty = y0; ty <= y1; ty += 1) {
      for (let tx = x0; tx <= x1; tx += 1) {
        const cell = level.tiles[ty][tx];
        const x = tx * TILE;
        const y = ty * TILE + bumpOffset(level, tx, ty);
        if (theme.lava && ty >= 15 && (!cell || cell === ".")) {
          ctx.fillStyle = theme.lava;
          ctx.fillRect(x, y + 8, 16, 8);
          ctx.fillStyle = "#ffb15a";
          ctx.fillRect(x, y + 8, 16, 3);
        }
        drawTile(ctx, cell, x, y, theme, state.frame + tx);
      }
    }

    for (const item of level.items) {
      drawActor(ctx, item.type === "life" ? "life" : item.type, item);
    }
    for (const enemy of level.entities) {
      if (!enemy.alive && enemy.squish <= 0) continue;
      const box = enemy.squish > 0 ? { ...enemy, y: enemy.y + enemy.h * 0.45, h: enemy.h * 0.55 } : enemy;
      drawActor(ctx, enemy.type, box, { flip: enemy.dir > 0 });
    }
    for (const ball of state.fireballs) {
      drawActor(ctx, "fireball", ball, { spark: ball.friendly ? -1 : 0 });
    }
    for (const bit of state.particles) {
      ctx.fillStyle = bit.color;
      ctx.fillRect(bit.x, bit.y, 4, 4);
    }

    const flicker = player.invuln > 0 && player.star <= 0 && Math.floor(state.frame / 2) % 2 === 0;
    if (!flicker) {
      const name = player.form === "small" ? "small" : player.form === "fire" ? "fire" : "super";
      const bob = player.grounded && Math.abs(player.vx) > 0.3 && Math.floor(player.runPhase / 4) % 2 ? 1 : 0;
      drawActor(ctx, name, { ...player, y: player.y - bob }, {
        flip: player.facing < 0,
        spark: player.star > 0 ? Math.floor(state.frame / 3) : -1,
      });
    }

    for (const mote of state.floaters) {
      drawText(ctx, String(mote.text), mote.x, mote.y, "#fff8e8", 1);
    }
    ctx.restore();

    drawHud(ctx, {
      score: state.session.score,
      coins: state.session.coins,
      levelId: level.id,
      time: state.timeLeft,
      lives: state.session.lives,
    });
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (state.mode === "error") {
      ctx.fillStyle = "#1a120e";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawCenter(ctx, [{ text: state.message || "ERROR", scale: 2 }], state.frame);
      return;
    }
    if (!state.level || !state.player || state.mode === "title") {
      drawTitle();
      return;
    }

    drawWorld();
    if (state.mode === "intro") {
      drawCenter(
        ctx,
        [
          { text: state.level.id.toUpperCase(), scale: 3 },
          { text: rules().label, scale: 2, color: "#ffe08a" },
        ],
        state.frame,
      );
    } else if (state.mode === "pole") {
      drawCenter(ctx, [{ text: "CLEAR", scale: 3 }], state.frame);
    } else if (state.mode === "paused") {
      drawCenter(ctx, [{ text: "PAUSED", scale: 3 }], state.frame);
    } else if (state.mode === "stageClear") {
      drawCenter(ctx, [{ text: "CLEAR", scale: 3 }], state.frame);
    } else if (state.mode === "worldClear") {
      drawCenter(ctx, [{ text: "WORLD CLEAR", scale: 3 }], state.frame);
    } else if (state.mode === "gameOver") {
      drawCenter(
        ctx,
        [
          { text: "GAME OVER", scale: 3 },
          { text: "PRESS ENTER", scale: 2, blink: true },
        ],
        state.frame,
      );
    } else if (state.mode === "ending") {
      drawCenter(
        ctx,
        [
          { text: "HILLS CLEARED", scale: 3 },
          { text: `SCORE ${pad(state.session.score, 6)}`, scale: 2 },
          { text: "PRESS ENTER", scale: 2, blink: true },
        ],
        state.frame,
      );
    }
  }

  function drawTitle() {
    ctx.fillStyle = "#79c6ff";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(70, 48, 340, 170);
    const title = "HILL RUN";
    drawText(ctx, title, Math.round((VIEW_W - textWidth(title, 3)) / 2), 64, "#f7fbff", 3);
    const sub = "PIPE HILLS";
    drawText(ctx, sub, Math.round((VIEW_W - textWidth(sub, 2)) / 2), 100, "#e7f6ff", 2);
    const labels = ["EASY", "MEDIUM", "HARD"];
    const gap = 28;
    const widths = labels.map((label) => textWidth(label, 2));
    const row = widths.reduce((sum, width) => sum + width, 0) + gap * (labels.length - 1);
    let x = Math.round((VIEW_W - row) / 2);
    labels.forEach((label, index) => {
      const selected = state.difficulty === label.toLowerCase();
      drawText(ctx, label, x, 142, selected ? "#ffe08a" : "#d5e6f2", 2);
      if (selected) {
        ctx.fillStyle = "#ffe08a";
        ctx.fillRect(x, 162, widths[index], 2);
      }
      x += widths[index] + gap;
    });
    const hint = "ARROWS PICK";
    const start = "PRESS ENTER";
    if (state.frame % 40 < 24) {
      drawText(ctx, start, Math.round((VIEW_W - textWidth(start, 2)) / 2), 176, "#f7fbff", 2);
    }
    drawText(ctx, hint, Math.round((VIEW_W - textWidth(hint, 1)) / 2), 200, "#f7fbff", 1);
  }

  function snapshot() {
    return {
      mode: state.mode,
      level: state.level?.id ?? null,
      form: state.player?.form ?? null,
      x: state.player ? Math.round(state.player.x) : null,
      y: state.player ? Math.round(state.player.y) : null,
      lives: state.session.lives,
      difficulty: state.difficulty,
      score: state.session.score,
      coins: state.session.coins,
      time: state.timeLeft,
      entities: state.level?.entities?.filter((enemy) => enemy.alive).length ?? 0,
      fireballs: state.fireballs.length,
    };
  }

  const api = {
    snapshot,
    start: beginGame,
    skipIntro() {
      if (state.mode === "intro") state.mode = "playing";
    },
    give(form) {
      if (!state.player || !state.level) return;
      const feet = state.player.y + state.player.h;
      state.player.form = form;
      state.player.h = playerHeight(form);
      state.player.y = feet - state.player.h;
    },
    place(x, y, grounded = false) {
      if (!state.player) return;
      state.player.x = x;
      state.player.y = y;
      state.player.vx = 0;
      state.player.vy = grounded ? 0 : 2;
      state.player.grounded = grounded;
    },
    load(id) {
      return loadStage(id, { form: state.player?.form || "small" });
    },
    cell(tx, ty) {
      return state.level?.tiles?.[ty]?.[tx] ?? null;
    },
    tap(partial) {
      scripted = { ...BLANK_INPUT, ...partial };
    },
  };

  input.attach();
  canvas.addEventListener("pointerdown", () => {
    audio.unlock();
    canvas.focus();
  });

  const BLANK_INPUT = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    run: false,
jumpPressed: false,
        firePressed: false,
        pausePressed: false,
        leftPressed: false,
        rightPressed: false,
        startPressed: false,
  };
  let scripted = null;
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    acc += Math.min(48, now - last);
    last = now;
    let steps = 0;
    while (acc >= STEP && steps < 3) {
      const current = scripted ? scripted : input.snapshot();
      update(current);
      input.endFrame();
      acc -= STEP;
      steps += 1;
    }
    if (steps > 0) scripted = null;
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return api;
}

if (typeof document !== "undefined") {
  const canvas = document.querySelector("#game");
  if (canvas) globalThis.__game = startGame(canvas);
}
