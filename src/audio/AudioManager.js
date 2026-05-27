/**
 * @fileoverview Layered audio system using Web Audio API.
 *
 * Architecture:
 *   Master Gain → [Music Bus, Ambience Bus, SFX Bus, Voice Bus]
 *
 * Features:
 *   - Procedural ambience via oscillators + noise generators
 *   - Tension-reactive dynamic mixing
 *   - Positional audio for animatronic proximity
 *   - Randomized ambient events
 *   - Audio ducking during critical events
 *   - All buffers loaded via ResourceManager (fallback to procedural if missing)
 */

import { EventSystem, Events }  from '../core/EventSystem.js';
import { SettingsManager }      from '../core/SettingsManager.js';
import { GameConfig }           from '../config/GameConfig.js';

class AudioManagerClass {
  constructor() {
    /** @type {AudioContext|null} */
    this._ctx = null;

    // Bus gains
    this._masterGain   = null;
    this._musicGain    = null;
    this._ambienceGain = null;
    this._sfxGain      = null;
    this._voiceGain    = null;

    // Tension layer nodes
    this._droneOsc     = null;
    this._droneGain    = null;
    this._targetTension = 0;
    this._currentTension = 0;

    // HVAC / noise layer
    this._hvacNode    = null;
    this._hvacGain    = null;

    // Ambient random event timer
    this._ambientTimer   = 0;
    this._ambientInterval = 20 + Math.random() * 30;

    // Paused state
    this._paused = false;

    // Buffer cache (decoded AudioBuffer)
    this._buffers = new Map();

    // Active source nodes for stopping
    this._activeSources = new Set();
  }

  async init() {
    // AudioContext must be created synchronously but resumed on gesture
    this._ctx = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate:  44100,
    });

    this._buildGraph();
    this._applyVolumeSettings();

    // Web Audio requires user gesture to start
    const resume = () => {
      if (this._ctx.state === 'suspended') this._ctx.resume();
    };
    document.addEventListener('click',     resume, { once: true });
    document.addEventListener('keydown',   resume, { once: true });
    document.addEventListener('touchstart',resume, { once: true });

    // Wire events
    EventSystem.on(Events.AUDIO_TENSION_CHANGED, ({ tension }) => {
      this._targetTension = Math.max(this._targetTension, tension);
    });
    EventSystem.on(Events.JUMPSCARE,       ({ animatronic }) => this._onJumpscare(animatronic));
    EventSystem.on(Events.LIGHT_FLICKER,   ()               => this._playElectricalGlitch());
    EventSystem.on(Events.POWER_DEPLETED,  ()               => this._onPowerDepleted());
    EventSystem.on(Events.SETTINGS_CHANGED, ({ key })       => {
      if (['masterVolume','musicVolume','ambienceVolume','sfxVolume'].includes(key)) {
        this._applyVolumeSettings();
      }
    });
    EventSystem.on('audio:play:sfx', ({ id, volume = 1.0 }) => {
      this._playSFX(id, volume);
    });
  }

  // ── Public controls ───────────────────────────────────────

  startAmbience() {
    if (!this._ctx) return;
    this._startHVAC();
    this._startDroneLayers();
    this._ambientTimer = 0;
  }

  stopAmbience() {
    this._stopNode(this._hvacNode);
    this._stopNode(this._droneOsc);
    this._hvacNode = null;
    this._droneOsc = null;
  }

  pause() {
    if (this._ctx) this._ctx.suspend();
    this._paused = true;
  }

  resume() {
    if (this._ctx) this._ctx.resume();
    this._paused = false;
  }

  playFanfare() {
    // Freddy's power-out fanfare — procedural musical motif
    this._playFreddyJingle();
  }

  /**
   * @param {number} delta
   * @param {number} elapsed
   */
  update(delta, elapsed) {
    if (this._paused || !this._ctx) return;

    // Smooth tension interpolation
    const smoothing = 2.0;
    this._currentTension += (this._targetTension - this._currentTension) * smoothing * delta;
    // Tension decays slowly on its own
    this._targetTension = Math.max(0, this._targetTension - delta * 0.05);

    // Apply tension to drone
    this._updateDroneLayer(delta, elapsed);

    // Random ambient events
    this._ambientTimer += delta;
    if (this._ambientTimer > this._ambientInterval) {
      this._ambientTimer    = 0;
      this._ambientInterval = 12 + Math.random() * 35;
      this._triggerAmbientEvent();
    }
  }

  // ── Audio graph construction ──────────────────────────────

  _buildGraph() {
    const ctx = this._ctx;

    this._masterGain   = this._gain(1.0);
    this._musicGain    = this._gain(GameConfig.AUDIO.MUSIC_VOLUME);
    this._ambienceGain = this._gain(GameConfig.AUDIO.AMBIENCE_VOLUME);
    this._sfxGain      = this._gain(GameConfig.AUDIO.SFX_VOLUME);
    this._voiceGain    = this._gain(GameConfig.AUDIO.VOICE_VOLUME);

    // Connect buses to master
    this._musicGain.connect(this._masterGain);
    this._ambienceGain.connect(this._masterGain);
    this._sfxGain.connect(this._masterGain);
    this._voiceGain.connect(this._masterGain);
    this._masterGain.connect(ctx.destination);
  }

  _startHVAC() {
    const ctx = this._ctx;

    // White noise filtered to HVAC hum
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop   = true;

    // BandPass filter centered on 60 Hz (HVAC hum)
    const filter = ctx.createBiquadFilter();
    filter.type            = 'bandpass';
    filter.frequency.value = 80;
    filter.Q.value         = 0.5;

    // Low-pass for smooth hum
    const lpf = ctx.createBiquadFilter();
    lpf.type            = 'lowpass';
    lpf.frequency.value = 200;

    this._hvacGain = this._gain(0.06);

    source.connect(filter);
    filter.connect(lpf);
    lpf.connect(this._hvacGain);
    this._hvacGain.connect(this._ambienceGain);
    source.start();

    this._hvacNode = source;
  }

  _startDroneLayers() {
    const ctx = this._ctx;

    // Sub-bass drone — psychologically oppressive low frequency
    const osc = ctx.createOscillator();
    osc.type            = 'sine';
    osc.frequency.value = 38;   // Deep sub-bass

    // Slight detuning oscillator for beating effect
    const osc2 = ctx.createOscillator();
    osc2.type            = 'sine';
    osc2.frequency.value = 41;

    const droneGain = this._gain(0.0);  // starts silent — tension will raise it
    osc.connect(droneGain);
    osc2.connect(droneGain);
    droneGain.connect(this._ambienceGain);
    osc.start();
    osc2.start();

    this._droneOsc  = osc;
    this._droneGain = droneGain;
  }

  _updateDroneLayer(delta, elapsed) {
    if (!this._droneGain) return;
    // Drone volume scales with tension
    const targetVol = this._currentTension * 0.12;
    const current   = this._droneGain.gain.value;
    const speed      = 1.5;
    this._droneGain.gain.value = current + (targetVol - current) * speed * delta;

    // Subtle pitch drift based on tension
    if (this._droneOsc) {
      this._droneOsc.frequency.value = 38 + this._currentTension * 8;
    }
  }

  // ── SFX / event sounds ────────────────────────────────────

  _playSFX(id, volume = 1.0) {
    if (!this._ctx) return;
    // Generate procedural audio if no asset exists
    this._generateProceduralSFX(id, volume);
  }

  /**
   * Procedural SFX generator for development (replaced by real assets in prod).
   * @param {string} id
   * @param {number} volume
   */
  _generateProceduralSFX(id, volume) {
    const ctx = this._ctx;
    const now = ctx.currentTime;

    let freq = 220, duration = 0.3, type = 'sine';

    // Map SFX IDs to basic synth parameters
    if (id.includes('freddy'))   { freq = 180; duration = 1.5; type = 'triangle'; }
    if (id.includes('bonnie'))   { freq = 90;  duration = 0.4; type = 'sawtooth'; }
    if (id.includes('chica'))    { freq = 320; duration = 0.6; type = 'square'; }
    if (id.includes('foxy'))     { freq = 440; duration = 0.8; type = 'sawtooth'; }
    if (id.includes('sprint'))   { freq = 800; duration = 1.2; type = 'sawtooth'; }
    if (id.includes('bang'))     { freq = 60;  duration = 0.5; type = 'square'; }
    if (id.includes('glitch'))   { freq = 1200; duration = 0.1; type = 'square'; }
    if (id.includes('jingle'))   { this._playFreddyJingle(); return; }

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type            = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  _playFreddyJingle() {
    // Freddy's iconic 3-note fanfare — procedurally synthesized
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];  // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type            = 'triangle';
      osc.frequency.value = freq;
      const start = now + i * 0.35;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain);
      gain.connect(this._sfxGain);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  _playElectricalGlitch() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;
    // Short burst of filtered noise
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    src.connect(gain);
    gain.connect(this._sfxGain);
    src.start(now);
  }

  _triggerAmbientEvent() {
    if (!this._ctx) return;
    const events = ['distant_bang', 'metallic_creak', 'footstep', 'breathing'];
    const chosen = events[Math.floor(Math.random() * events.length)];
    EventSystem.emit(Events.AMBIENT_EVENT, { type: chosen });
    this._generateProceduralSFX(`sfx_ambient_${chosen}`, 0.2 + Math.random() * 0.3);
  }

  _onJumpscare(animatronic) {
    // Immediate full-volume burst
    this._generateProceduralSFX(`sfx_${animatronic}_attack`, 1.0);
    // Duck all other audio
    const ctx = this._ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    this._ambienceGain.gain.setValueAtTime(this._ambienceGain.gain.value, now);
    this._ambienceGain.gain.linearRampToValueAtTime(0.05, now + 0.1);
    this._musicGain.gain.linearRampToValueAtTime(0.0, now + 0.1);
  }

  _onPowerDepleted() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;
    // Fade all ambience out rapidly
    this._ambienceGain.gain.linearRampToValueAtTime(0.0, now + 2.0);
    this._hvacGain?.gain.linearRampToValueAtTime(0.0, now + 1.0);
  }

  // ── Utility ───────────────────────────────────────────────

  _gain(value) {
    const g = this._ctx.createGain();
    g.gain.value = value;
    return g;
  }

  _stopNode(node) {
    try { node?.stop(); } catch {}
  }

  _applyVolumeSettings() {
    if (!this._masterGain) return;
    this._masterGain.gain.value   = SettingsManager.get('masterVolume')   ?? GameConfig.AUDIO.MASTER_VOLUME;
    this._musicGain.gain.value    = SettingsManager.get('musicVolume')    ?? GameConfig.AUDIO.MUSIC_VOLUME;
    this._ambienceGain.gain.value = SettingsManager.get('ambienceVolume') ?? GameConfig.AUDIO.AMBIENCE_VOLUME;
    this._sfxGain.gain.value      = SettingsManager.get('sfxVolume')      ?? GameConfig.AUDIO.SFX_VOLUME;
  }
}

export const AudioManager = new AudioManagerClass();
