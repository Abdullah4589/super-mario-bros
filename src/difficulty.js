export const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

export const DIFFICULTIES = {
  easy: {
    id: "easy",
    label: "EASY",
    lives: 5,
    enemyScale: 0.7,
    timeScale: 1.4,
    jumpScale: 1.1,
    invuln: 160,
    star: 780,
    bossFire: 160,
  },
  medium: {
    id: "medium",
    label: "MEDIUM",
    lives: 3,
    enemyScale: 1,
    timeScale: 1,
    jumpScale: 1,
    invuln: 120,
    star: 600,
    bossFire: 110,
  },
  hard: {
    id: "hard",
    label: "HARD",
    lives: 2,
    enemyScale: 1.45,
    timeScale: 0.7,
    jumpScale: 0.92,
    invuln: 60,
    star: 360,
    bossFire: 68,
  },
};

export function nextDifficulty(current, step) {
  const index = DIFFICULTY_ORDER.indexOf(current);
  const start = index < 0 ? 1 : index;
  const next = (start + step + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length;
  return DIFFICULTY_ORDER[next];
}

export function stageTime(base, difficultyId) {
  const scale = DIFFICULTIES[difficultyId]?.timeScale ?? 1;
  return Math.max(80, Math.round(base * scale));
}
