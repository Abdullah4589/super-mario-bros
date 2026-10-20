const FONT = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "101", "101", "101"],
  N: ["110", "101", "101", "101", "101"],
  O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "011", "001"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "011"],
  V: ["101", "101", "101", "101", "010"],
  W: ["101", "101", "101", "111", "101"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["110", "001", "010", "100", "111"],
  3: ["110", "001", "010", "001", "110"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "110", "001", "110"],
  6: ["011", "100", "110", "101", "011"],
  7: ["111", "001", "010", "010", "010"],
  8: ["010", "101", "010", "101", "010"],
  9: ["011", "101", "011", "001", "110"],
  "-": ["000", "000", "111", "000", "000"],
  "!": ["010", "010", "010", "000", "010"],
  " ": ["000", "000", "000", "000", "000"],
};

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

function drawGlyph(ctx, ch, x, y, color, scale) {
  const glyph = FONT[ch] || FONT[" "];
  ctx.fillStyle = color;
  for (let row = 0; row < glyph.length; row += 1) {
    for (let col = 0; col < glyph[row].length; col += 1) {
      if (glyph[row][col] === "1") ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

export function drawText(ctx, text, x, y, color, scale = 2) {
  const step = 4 * scale;
  for (let i = 0; i < text.length; i += 1) {
    drawGlyph(ctx, text[i], x + i * step + scale, y + scale, "rgba(0,0,0,0.55)", scale);
    drawGlyph(ctx, text[i], x + i * step, y, color, scale);
  }
}

export function textWidth(text, scale = 2) {
  return text.length * 4 * scale;
}

export function drawHud(ctx, { score, coins, levelId, time, lives }) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, 480, 26);
  drawText(ctx, `SCORE ${pad(score, 6)}`, 8, 6, "#f7fbff", 2);
  ctx.fillStyle = "#f2c14e";
  ctx.beginPath();
  ctx.arc(168, 13, 4, 0, Math.PI * 2);
  ctx.fill();
  drawText(ctx, `X${pad(coins, 2)}`, 176, 6, "#f7fbff", 2);
  drawText(ctx, levelId.toUpperCase(), 248, 6, "#f7fbff", 2);
  drawText(ctx, `TIME ${pad(time, 3)}`, 328, 6, time <= 30 ? "#ffb4a8" : "#f7fbff", 2);
  drawText(ctx, `L${lives}`, 436, 6, "#f7fbff", 2);
}

export function drawCenter(ctx, lines, frame = 0) {
  const blockH = lines.length * 28;
  const top = (270 - blockH) / 2;
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(70, top - 16, 340, blockH + 28);
  lines.forEach((line, index) => {
    if (line.blink && frame % 40 >= 24) return;
    const scale = line.scale || 2;
    const width = textWidth(line.text, scale);
    drawText(ctx, line.text, Math.round((480 - width) / 2), top + index * 28, line.color || "#f7fbff", scale);
  });
}
