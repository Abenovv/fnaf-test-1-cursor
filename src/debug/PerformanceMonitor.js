/**
 * @fileoverview Frame-time and render statistics monitor.
 * Tracks FPS, frame delta, GC spikes, and renderer info.
 * Results are emitted via PERF_REPORT event for DebugOverlay to display.
 */

import { EventSystem, Events } from '../core/EventSystem.js';
import { GameConfig }          from '../config/GameConfig.js';

class PerformanceMonitorClass {
  constructor() {
    this._frameStart   = 0;
    this._frameTimes   = new Float32Array(60);   // ring buffer of last 60 frame times
    this._frameIndex   = 0;
    this._sampleCount  = 0;

    this._reportTimer  = 0;
    this._reportInterval = 0.5;   // emit report every 0.5 seconds

    this._gcThreshold = GameConfig.PERF.GC_THRESHOLD_MS;
    this._gcSpikes    = 0;
    this._lastFrameTime = 0;
  }

  init() {
    // Expose a lightweight API for DevTools inspection
    window.__perf__ = {
      fps:       () => this.fps,
      avgFrame:  () => this.averageFrameMs,
      gcSpikes:  () => this._gcSpikes,
    };
  }

  /** Call at the beginning of each render loop iteration */
  beginFrame() {
    this._frameStart = performance.now();
  }

  /** Call at the end of each render loop iteration */
  endFrame() {
    const now   = performance.now();
    const delta = now - this._frameStart;

    // Detect GC spike (frame that took >16ms suddenly)
    if (this._lastFrameTime > 0 && delta > this._gcThreshold && delta > this._lastFrameTime * 2) {
      this._gcSpikes++;
    }
    this._lastFrameTime = delta;

    this._frameTimes[this._frameIndex] = delta;
    this._frameIndex = (this._frameIndex + 1) % 60;
    this._sampleCount = Math.min(this._sampleCount + 1, 60);

    // Report at interval
    this._reportTimer += delta / 1000;
    if (this._reportTimer >= this._reportInterval) {
      this._reportTimer = 0;
      EventSystem.emit(Events.PERF_REPORT, this._buildReport());
    }
  }

  /** @returns {number} smoothed FPS */
  get fps() {
    const avg = this.averageFrameMs;
    return avg > 0 ? Math.round(1000 / avg) : 0;
  }

  /** @returns {number} average frame time in ms over last 60 frames */
  get averageFrameMs() {
    if (this._sampleCount === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this._sampleCount; i++) sum += this._frameTimes[i];
    return sum / this._sampleCount;
  }

  _buildReport() {
    const avg = this.averageFrameMs;
    const max = this._maxFrameMs();
    return {
      fps:       this.fps,
      avgFrameMs: avg.toFixed(2),
      maxFrameMs: max.toFixed(2),
      gcSpikes:   this._gcSpikes,
      stable:     avg < 16.67,
    };
  }

  _maxFrameMs() {
    let max = 0;
    for (let i = 0; i < this._sampleCount; i++) {
      if (this._frameTimes[i] > max) max = this._frameTimes[i];
    }
    return max;
  }
}

export const PerformanceMonitor = new PerformanceMonitorClass();
