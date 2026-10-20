import { TILE } from "./tiles.js";
import { groundAhead, moveX, moveY } from "./collision.js";
import { GRAVITY, MAX_FALL } from "./player.js";
import { ACTORS } from "./sprites.js";

const SPEED = { walker: 0.6, shell: 0.5, boss: 0.4 };

export function createEntity(spec) {
  const sprite = ACTORS[spec.type];
  const w = sprite.w;
  // Art is bottom-aligned in the hitbox, so short sprites still stand on a full tile.
  const h = Math.max(sprite.h, spec.type === "boss" ? 32 : 16);
  const speed = SPEED[spec.type];
  return {
    type: spec.type,
    x: spec.x * TILE + Math.floor((TILE - w) / 2),
    y: spec.y * TILE - h,
    w,
    h,
    dir: spec.dir || -1,
    vx: 0,
    vy: 0,
    speed,
    alive: true,
    grounded: false,
    state: "walk",
    fireCd: 100,
    squish: 0,
    kickGrace: 0,
    falling: false,
  };
}

export function createFireball(x, y, dir, friendly) {
  return {
    type: "fireball",
    x,
    y,
    w: 8,
    h: 8,
    vx: dir * (friendly ? 3.1 : 2.1),
    vy: friendly ? -1 : -2.4,
    dir,
    friendly,
    alive: true,
    grounded: false,
    bounces: 0,
  };
}

export function nextShellState(state, player, enemy) {
  if (state === "slide") return { state: "still", dir: enemy.dir };
  if (state === "still") {
    const dir = player.x + player.w / 2 < enemy.x + enemy.w / 2 ? 1 : -1;
    return { state: "slide", dir };
  }
  return { state: "still", dir: enemy.dir };
}

export function updateEnemy(enemy, level) {
  if (!enemy.alive) {
    if (enemy.squish > 0) enemy.squish -= 1;
    return {};
  }
  if (enemy.kickGrace > 0) enemy.kickGrace -= 1;

  if (enemy.falling) {
    enemy.vy = Math.min(MAX_FALL, enemy.vy + GRAVITY);
    enemy.y += enemy.vy;
    return { fell: enemy.y > level.height * TILE + 8 };
  }

  const patrol = enemy.type === "boss" || (enemy.type === "shell" && enemy.state === "walk");
  if (patrol && enemy.grounded && !groundAhead(level, enemy)) enemy.dir *= -1;

  if (enemy.type === "shell" && enemy.state === "still") enemy.vx = 0;
  else if (enemy.type === "shell" && enemy.state === "slide") enemy.vx = enemy.dir * (enemy.slideSpeed || 3);
  else enemy.vx = enemy.dir * enemy.speed;

  const hitWall = enemy.vx !== 0 && moveX(enemy, level);
  if (hitWall) enemy.dir *= -1;

  enemy.vy = Math.min(MAX_FALL, enemy.vy + GRAVITY);
  moveY(enemy, level);

  if (enemy.type !== "boss" && enemy.y > level.height * TILE + 48) enemy.alive = false;

  if (enemy.type === "boss") {
    enemy.fireCd -= 1;
    if (enemy.fireCd <= 0) {
      enemy.fireCd = enemy.fireInterval || 110;
      return {
        shot: {
          x: enemy.x + (enemy.dir > 0 ? enemy.w : -8),
          y: enemy.y + 10,
          dir: enemy.dir,
        },
      };
    }
  }
  return {};
}

export function updateFireball(ball, level) {
  if (!ball.alive) return;
  const falling = ball.vy > 0;
  ball.vy = Math.min(MAX_FALL, ball.vy + GRAVITY);
  if (moveX(ball, level)) {
    ball.alive = false;
    return;
  }
  moveY(ball, level);
  if (ball.grounded && falling) {
    ball.bounces += 1;
    if (ball.bounces > 4) {
      ball.alive = false;
      return;
    }
    ball.vy = -3.2;
    ball.grounded = false;
  }
  if (ball.y > level.height * TILE + 16) ball.alive = false;
}
