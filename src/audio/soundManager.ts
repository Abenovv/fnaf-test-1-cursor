/** Centralized Web Audio — UI bleeps, ambience, game SFX */

type SoundId =
  | 'ui_click'
  | 'ui_hover'
  | 'ui_back'
  | 'door'
  | 'light'
  | 'camera'
  | 'power_low'
  | 'jumpscare'
  | 'shoot'
  | 'explosion'
  | 'mine'
  | 'place'
  | 'footstep'
  | 'granny_near'
  | 'win'
  | 'lose'
  | 'ambience';

let ctx: AudioContext | null = null;
let master = 0.85;
let enabled = true;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function setMasterVolume(v: number) {
  master = v;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function resumeAudio() {
  void getCtx().resume();
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'square',
  vol = 0.15,
  slide?: number
) {
  if (!enabled) return;
  const c = getCtx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, now + duration);
  gain.gain.setValueAtTime(vol * master, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function noise(duration: number, vol = 0.08) {
  if (!enabled) return;
  const c = getCtx();
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.value = vol * master;
  src.connect(gain);
  gain.connect(c.destination);
  src.start();
}

export function playSound(id: SoundId) {
  switch (id) {
    case 'ui_click':
      tone(880, 0.05, 'square', 0.12);
      tone(1320, 0.04, 'square', 0.06);
      break;
    case 'ui_hover':
      tone(440, 0.03, 'sine', 0.05);
      break;
    case 'ui_back':
      tone(330, 0.08, 'triangle', 0.1, 220);
      break;
    case 'door':
      tone(80, 0.15, 'sawtooth', 0.2);
      noise(0.1, 0.15);
      break;
    case 'light':
      tone(1200, 0.06, 'square', 0.08);
      break;
    case 'camera':
      tone(600, 0.04, 'square', 0.1);
      tone(900, 0.04, 'square', 0.06);
      break;
    case 'power_low':
      tone(200, 0.2, 'sine', 0.15);
      break;
    case 'jumpscare':
      tone(100, 0.5, 'sawtooth', 0.4, 40);
      noise(0.4, 0.35);
      break;
    case 'shoot':
      tone(150, 0.08, 'square', 0.15, 80);
      noise(0.05, 0.1);
      break;
    case 'explosion':
      noise(0.35, 0.3);
      tone(60, 0.4, 'sawtooth', 0.25, 30);
      break;
    case 'mine':
      tone(400, 0.05, 'square', 0.1, 200);
      break;
    case 'place':
      tone(300, 0.06, 'triangle', 0.1);
      break;
    case 'footstep':
      noise(0.04, 0.06);
      break;
    case 'granny_near':
      tone(180, 0.25, 'sine', 0.12);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'square', 0.12), i * 120));
      break;
    case 'lose':
      tone(200, 0.3, 'sawtooth', 0.2, 80);
      break;
    case 'ambience':
      break;
  }
}

let ambOsc: OscillatorNode[] = [];

export function startAmbience() {
  if (!enabled || ambOsc.length) return;
  const c = getCtx();
  const g = c.createGain();
  g.gain.value = 0.03 * master;
  g.connect(c.destination);
  for (const f of [55, 58]) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g);
    o.start();
    ambOsc.push(o);
  }
}

export function stopAmbience() {
  ambOsc.forEach((o) => {
    try {
      o.stop();
    } catch {
      /* */
    }
  });
  ambOsc = [];
}
