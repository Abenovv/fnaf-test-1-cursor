/**
 * @fileoverview Application entry point.
 * Instantiates the GameEngine and starts initialization.
 * This is the ONLY file that creates top-level instances —
 * all other modules export singletons or are composed by GameEngine.
 */

import { GameEngine } from './core/GameEngine.js';
import { EventSystem, Events } from './core/EventSystem.js';

// ── Engine bootstrap ──────────────────────────────────────────────────────────

const engine = new GameEngine();

// Wire UIManager → GameEngine for night start events
// (avoids circular dep: GameEngine ← UIManager)
EventSystem.on('__engine:start_night', ({ night }) => {
  engine.startNight(night);
});

engine.init().catch(err => {
  console.error('[FATAL] Engine initialization failed:', err);
  const screen = document.getElementById('loading-screen');
  if (screen) {
    screen.style.opacity = '1';
    screen.style.pointerEvents = 'auto';
    const status = document.getElementById('loading-status');
    if (status) {
      status.textContent = 'SYSTEM ERROR — CHECK CONSOLE';
      status.style.color = '#8b0000';
    }
  }
});
