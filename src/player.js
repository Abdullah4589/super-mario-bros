export const GRAVITY = 0.62;
export const JUMP_GRAVITY = 0.32;
export const JUMP_V = -7.2;
export const MAX_FALL = 7;
export const ACCEL_WALK = 0.08;
export const ACCEL_RUN = 0.14;
export const MAX_WALK = 1.35;
export const MAX_RUN = 2.4;
export const FRICTION = 0.1;
export const PLAYER_W = 12;

export function playerHeight(form) {
  return form === "small" ? 16 : 32;
}

export function createPlayer(x, y, form = "small") {
  return {
    x,
    y,
    w: PLAYER_W,
    h: playerHeight(form),
    vx: 0,
    vy: 0,
    form,
    facing: 1,
    grounded: false,
    jumping: false,
    star: 0,
    invuln: 0,
    fireCd: 0,
    runPhase: 0,
  };
}

export function stepHorizontal(player, input) {
  const left = Boolean(input.left);
  const right = Boolean(input.right);
  const reversing = (left && player.vx > 0.2) || (right && player.vx < -0.2);
  const air = player.grounded ? 1 : 0.65;
  const accel = (input.run ? ACCEL_RUN : ACCEL_WALK) * air * (reversing ? 2 : 1);
  const max = input.run ? MAX_RUN : MAX_WALK;

  if (left && !right) {
    player.vx -= accel;
    player.facing = -1;
  } else if (right && !left) {
    player.vx += accel;
    player.facing = 1;
  } else if (player.grounded) {
    if (player.vx > 0) player.vx = Math.max(0, player.vx - FRICTION);
    else player.vx = Math.min(0, player.vx + FRICTION);
  }

  if (player.vx > max) player.vx = Math.max(max, player.vx - FRICTION * 2);
  if (player.vx < -max) player.vx = Math.min(-max, player.vx + FRICTION * 2);

  if (player.grounded && Math.abs(player.vx) > 0.2) player.runPhase += 1;
}

export function startJump(player) {
  if (!player.grounded) return false;
  const scale = player.jumpScale || 1;
  player.vy = JUMP_V * scale;
  player.grounded = false;
  player.jumping = true;
  return true;
}

export function stepVertical(player, holdingJump) {
  if (player.jumping && !holdingJump && player.vy < 0) {
    player.jumping = false;
    player.vy *= 0.55;
  }
  const rising = player.jumping && holdingJump && player.vy < 0;
  const g = rising ? JUMP_GRAVITY : GRAVITY;
  player.vy = Math.min(MAX_FALL, player.vy + g);
}

export function jumpApex(holdFrames) {
  const player = createPlayer(0, 0);
  player.vy = JUMP_V;
  player.grounded = false;
  player.jumping = true;
  let apex = 0;
  for (let frame = 0; frame < 180; frame += 1) {
    stepVertical(player, frame < holdFrames);
    player.y += player.vy;
    apex = Math.min(apex, player.y);
    if (player.vy > 0 && player.y >= 0) break;
  }
  return -apex;
}

export function growPlayer(player) {
  if (player.form !== "small") return false;
  const feet = player.y + player.h;
  player.form = "super";
  player.h = playerHeight("super");
  player.y = feet - player.h;
  player.invuln = 30;
  return true;
}

export function shrinkPlayer(player, invuln = 120) {
  if (player.form === "small") return false;
  const feet = player.y + player.h;
  player.form = "small";
  player.h = playerHeight("small");
  player.y = feet - player.h;
  player.invuln = invuln;
  return true;
}

export function applyPower(player, type, roomAbove = true, starFrames = 600) {
  if (type === "life") return "life";
  if (type === "star") {
    player.star = starFrames;
    return "star";
  }
  if (type === "mushroom" || (type === "flower" && player.form === "small")) {
    if (player.form !== "small") return "score";
    if (!roomAbove) return "score";
    growPlayer(player);
    return "grow";
  }
  if (type === "flower") {
    player.form = "fire";
    if (player.h < 32) growPlayer(player);
    return "fire";
  }
  return null;
}
