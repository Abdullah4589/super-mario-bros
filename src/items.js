import { TILE } from "./tiles.js";
import { moveX, moveY } from "./collision.js";
import { GRAVITY, MAX_FALL } from "./player.js";

export function createItem(type, pixelX, pixelY) {
  return {
    type,
    x: pixelX + 1,
    y: pixelY,
    w: 14,
    h: 14,
    dir: 1,
    vx: 0,
    vy: 0,
    emerging: 16,
    alive: true,
    grounded: false,
  };
}

export function updateItem(item, level) {
  if (!item.alive) return;
  if (item.emerging > 0) {
    item.emerging -= 1;
    item.y -= 1;
    return;
  }
  if (item.type === "flower") return;

  const speed = item.type === "star" ? 1.15 : 0.8;
  item.vx = item.dir * speed;
  if (moveX(item, level)) item.dir *= -1;

  const falling = item.vy > 0;
  item.vy = Math.min(MAX_FALL, item.vy + GRAVITY);
  moveY(item, level);
  if (item.type === "star" && item.grounded && falling) {
    item.vy = -4.6;
    item.grounded = false;
  }
  if (item.y > level.height * TILE + 32) item.alive = false;
}
