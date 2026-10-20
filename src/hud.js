const UI_FONT = '"Segoe UI", system-ui, sans-serif';

function fontPx(scale) {
  if (scale >= 3) return 22;
  if (scale === 2) return 14;
  return 11;
}

let measureCtx = null;

function measureContext() {
  if (measureCtx) return measureCtx;
  if (typeof document === "undefined") return null;
  measureCtx = document.createElement("canvas").getContext("2d");
  return measureCtx;
}

export function pad(value, width) {
  const text = String(Math.max(0, Math.floor(value)));
  return text.length >= width ? text : `${"0".repeat(width - text.length)}${text}`;
}

export function addCoin(session) {
  session.coins += 1;
  session.score += 200;
  if (session.coins >= 100) {
    session.coins -= 100;
    session.lives += 1;
    return true;
  }
  return false;
}

export function flagScore(playerY, pole) {
  if (!pole) return 100;
  const top = pole.ty * 16;
  const bottom = top + 6 * 16;
  const span = Math.max(1, bottom - top);
  const height = Math.min(1, Math.max(0, (bottom - playerY) / span));
  if (height > 0.85) return 5000;
  if (height > 0.6) return 2000;
  if (height > 0.35) return 800;
  if (height > 0.15) return 400;
  return 100;
}

export function drawText(ctx, text, x, y, color, scale = 2) {
  const size = fontPx(scale);
  ctx.save();
  ctx.font = `600 ${size}px ${UI_FONT}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(8, 12, 18, 0.4)";
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function textWidth(text, scale = 2) {
  const size = fontPx(scale);
  const ctx = measureContext();
  if (!ctx) return Math.ceil(text.length * size * 0.62);
  ctx.font = `600 ${size}px ${UI_FONT}`;
  return Math.ceil(ctx.measureText(text).width);
}

export function drawHud(ctx, { score, coins, levelId, time, lives }) {
  const bar = ctx.createLinearGradient(0, 0, 0, 32);
  bar.addColorStop(0, "rgba(10, 16, 26, 0.78)");
  bar.addColorStop(1, "rgba(10, 16, 26, 0.28)");
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, 480, 32);
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillRect(0, 31, 480, 1);
  drawText(ctx, `SCORE ${pad(score, 6)}`, 12, 8, "#f7fbff", 2);
  ctx.fillStyle = "#f2c14e";
  ctx.beginPath();
  ctx.arc(176, 16, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 248, 220, 0.75)";
  ctx.beginPath();
  ctx.arc(174.5, 14.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
  drawText(ctx, `X${pad(coins, 2)}`, 186, 8, "#f7fbff", 2);
  drawText(ctx, levelId.toUpperCase(), 248, 8, "#f7fbff", 2);
  drawText(ctx, `TIME ${pad(time, 3)}`, 328, 8, time <= 30 ? "#ffb4a8" : "#f7fbff", 2);
  drawText(ctx, `L${lives}`, 430, 8, "#f7fbff", 2);
}

export function drawCenter(ctx, lines, frame = 0) {
  const blockH = lines.length * 28;
  const top = (270 - blockH) / 2;
  ctx.fillStyle = "rgba(10, 16, 26, 0.62)";
  ctx.beginPath();
  ctx.roundRect(70, top - 16, 340, blockH + 28, 14);
  ctx.fill();
  lines.forEach((line, index) => {
    if (line.blink && frame % 40 >= 24) return;
    const scale = line.scale || 2;
    const width = textWidth(line.text, scale);
    drawText(ctx, line.text, Math.round((480 - width) / 2), top + index * 28, line.color || "#f7fbff", scale);
  });
}
