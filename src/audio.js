export function createAudio() {
  let ctx;

  function context() {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function beep(freq, dur = 0.08, type = "square", gain = 0.04, slide = 0, delay = 0) {
    let audio;
    try {
      audio = context();
    } catch {
      return;
    }
    const start = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(50, freq + slide), start + dur);
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  return {
    unlock() {
      context();
    },
    jump() {
      beep(620, 0.09, "square", 0.045, 240);
    },
    coin() {
      beep(988, 0.05, "square", 0.04, 0, 0);
      beep(1318, 0.09, "square", 0.035, 0, 0.06);
    },
    stomp() {
      beep(180, 0.07, "square", 0.05, -80);
    },
    kick() {
      beep(240, 0.06, "square", 0.04, 80);
    },
    bump() {
      beep(320, 0.05, "square", 0.035);
    },
    break() {
      beep(160, 0.09, "triangle", 0.05, -60);
    },
    power() {
      [523, 659, 784, 1046].forEach((freq, index) => beep(freq, 0.07, "square", 0.04, 0, index * 0.07));
    },
    oneUp() {
      [784, 988, 1318].forEach((freq, index) => beep(freq, 0.08, "square", 0.04, 0, index * 0.08));
    },
    fire() {
      beep(880, 0.05, "square", 0.03, 200);
    },
    hurt() {
      beep(300, 0.12, "sawtooth", 0.04, -180);
    },
    die() {
      beep(440, 0.28, "square", 0.05, -320);
    },
    clear() {
      [523, 659, 784, 1046].forEach((freq, index) => beep(freq, 0.1, "square", 0.04, 0, index * 0.09));
    },
    tick() {
      beep(1200, 0.03, "square", 0.02);
    },
  };
}
