import { TILE, getCell, solidAt } from "./tiles.js";

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function isStomp(player, enemy, { falling, prevBottom }) {
  if (!falling) return false;
  const overlapX = player.x < enemy.x + enemy.w && player.x + player.w > enemy.x;
  const overlapY = player.y < enemy.y + enemy.h && player.y + player.h > enemy.y;
  if (!overlapX || !overlapY) return false;
  return prevBottom <= enemy.y + Math.min(10, enemy.h * 0.5);
}

export function cellsOverlapping(body, level) {
  const x0 = Math.floor(body.x / TILE);
  const y0 = Math.floor(body.y / TILE);
  const x1 = Math.floor((body.x + body.w - 0.01) / TILE);
  const y1 = Math.floor((body.y + body.h - 0.01) / TILE);
  const hits = [];
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      const cell = getCell(level, tx, ty);
      if (!cell || cell === "." || cell === " ") continue;
      const rect = { tx, ty, x: tx * TILE, y: ty * TILE, w: TILE, h: TILE, cell };
      if (overlap(body, rect)) hits.push(rect);
    }
  }
  return hits;
}

function overlappingSolids(body, level) {
  const x0 = Math.floor(body.x / TILE) - 1;
  const y0 = Math.floor(body.y / TILE) - 1;
  const x1 = Math.floor((body.x + body.w) / TILE) + 1;
  const y1 = Math.floor((body.y + body.h) / TILE) + 1;
  const hits = [];
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (!solidAt(level, tx, ty)) continue;
      const rect = {
        tx,
        ty,
        x: tx * TILE,
        y: ty * TILE,
        w: TILE,
        h: TILE,
        cell: getCell(level, tx, ty),
      };
      if (overlap(body, rect)) hits.push(rect);
    }
  }
  return hits;
}

export function moveX(body, level) {
  body.x += body.vx;
  const hits = overlappingSolids(body, level);
  if (hits.length === 0) return false;
  if (body.vx > 0) {
    body.x = Math.min(...hits.map((hit) => hit.x)) - body.w;
  } else if (body.vx < 0) {
    body.x = Math.max(...hits.map((hit) => hit.x + hit.w));
  } else {
    return false;
  }
  body.vx = 0;
  return true;
}

export function moveY(body, level) {
  body.grounded = false;
  body.y += body.vy;
  const hits = overlappingSolids(body, level);
  if (hits.length === 0) return [];
  if (body.vy > 0) {
    body.y = Math.min(...hits.map((hit) => hit.y)) - body.h;
    body.vy = 0;
    body.grounded = true;
    body.jumping = false;
    return [];
  }
  if (body.vy < 0) {
    const bottom = Math.max(...hits.map((hit) => hit.y + hit.h));
    body.y = bottom;
    body.vy = 0;
    body.jumping = false;
    return hits.filter((hit) => hit.y + hit.h === bottom);
  }
  return [];
}

export function groundAhead(level, body) {
  const dir = body.dir || Math.sign(body.vx) || 1;
  const x = dir > 0 ? body.x + body.w + 1 : body.x - 1;
  const y = body.y + body.h + 2;
  return solidAt(level, Math.floor(x / TILE), Math.floor(y / TILE));
}

export function probeRoomAbove(player, level) {
  const probe = { x: player.x, y: player.y - 16, w: player.w, h: 32 };
  return overlappingSolids(probe, level).length === 0;
}
