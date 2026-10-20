const ACTIONS = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  KeyZ: "jump",
  Space: "jump",
  KeyX: "run",
  ShiftLeft: "run",
  ShiftRight: "run",
  KeyC: "fire",
  Enter: "pause",
  Escape: "pause",
  KeyP: "pause",
};

const BLOCKED = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);

export function createInput(target = globalThis) {
  const held = new Set();
  const pressed = new Set();

  function onKeyDown(event) {
    const action = ACTIONS[event.code];
    if (!action) return;
    if (BLOCKED.has(event.code)) event.preventDefault();
    if (!held.has(action)) pressed.add(action);
    held.add(action);
  }

  function onKeyUp(event) {
    const action = ACTIONS[event.code];
    if (!action) return;
    held.delete(action);
  }

  function onBlur() {
    held.clear();
  }

  return {
    attach() {
      target.addEventListener("keydown", onKeyDown);
      target.addEventListener("keyup", onKeyUp);
      target.addEventListener("blur", onBlur);
    },
    detach() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      target.removeEventListener("blur", onBlur);
    },
    snapshot() {
      return {
        left: held.has("left"),
        right: held.has("right"),
        up: held.has("up"),
        down: held.has("down"),
        jump: held.has("jump"),
        run: held.has("run"),
        jumpPressed: pressed.has("jump"),
        firePressed: pressed.has("fire"),
        pausePressed: pressed.has("pause"),
        leftPressed: pressed.has("left"),
        rightPressed: pressed.has("right"),
        startPressed: pressed.has("pause") || pressed.has("jump"),
      };
    },
    endFrame() {
      pressed.clear();
    },
  };
}
