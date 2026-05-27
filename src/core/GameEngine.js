/**
 * @fileoverview GameEngine — the top-level orchestrator.
 * Owns the game loop, wires all systems together, and manages lifecycle.
 *
 * Architecture principle: GameEngine COMPOSES systems — it does not contain
 * logic that belongs inside a system. Each system is independently testable.
 */

import * as THREE from 'three';

import { GameConfig }           from '../config/GameConfig.js';
import { EventSystem, Events }  from './EventSystem.js';
import { ResourceManager, AssetType } from './ResourceManager.js';
import { SaveSystem }           from './SaveSystem.js';
import { SettingsManager }      from './SettingsManager.js';
import { LocalizationManager }  from './LocalizationManager.js';

import { RendererManager }      from '../rendering/RendererManager.js';
import { SceneManager }         from '../rendering/SceneManager.js';
import { CameraSystem }         from '../rendering/CameraSystem.js';
import { PostProcessingPipeline } from '../rendering/PostProcessingPipeline.js';

import { AudioManager }         from '../audio/AudioManager.js';
import { UIManager }            from '../ui/UIManager.js';
import { PowerSystem }          from '../gameplay/PowerSystem.js';
import { PlayerController }     from '../gameplay/PlayerController.js';
import { AIController }         from '../gameplay/AIController.js';

import { DebugOverlay }         from '../debug/DebugOverlay.js';
import { PerformanceMonitor }   from '../debug/PerformanceMonitor.js';

/** @enum {string} */
export const GameState = Object.freeze({
  LOADING:   'loading',
  MENU:      'menu',
  PLAYING:   'playing',
  PAUSED:    'paused',
  GAME_OVER: 'game_over',
  WIN:       'win',
});

/**
 * Manifest of assets to preload before the main menu is shown.
 * Lazy assets are loaded on-demand during gameplay.
 */
const PRELOAD_MANIFEST = [
  // Optional assets — add here when real files exist; lazy-loaded by default
  { id: 'night_data', url: 'assets/data/nights.json', type: AssetType.JSON, lazy: true },
];

export class GameEngine {
  constructor() {
    this.state      = GameState.LOADING;
    this.clock      = new THREE.Clock(false);
    this.nightIndex = 1;

    // Exposed to window in dev mode for console inspection
    if (GameConfig.DEBUG_DEFAULT) window.__FNAF__ = this;
  }

  /** Async initialization — call once from main.js */
  async init() {
    // 1. Load persisted data
    SaveSystem.load();
    SettingsManager.load();
    this.nightIndex = SaveSystem.get('currentNight') ?? 1;

    // 2. Localization
    await LocalizationManager.load(SettingsManager.get('locale'));

    // 3. Renderer (must happen before scene construction)
    RendererManager.init();
    CameraSystem.init();

    // 4. Audio context — resumed on first user gesture
    await AudioManager.init();

    // 5. UI shell
    UIManager.init();

    // 6. Debug tooling
    PerformanceMonitor.init();
    DebugOverlay.init();

    // 7. Asset preload with progress reporting
    await ResourceManager.preload(PRELOAD_MANIFEST, (frac, status) => {
      this._updateLoadingBar(frac, status);
    });

    // 8. Build scene
    await SceneManager.init();

    // 9. Post-processing — requires renderer + scene + camera
    await PostProcessingPipeline.init(
      RendererManager.renderer,
      SceneManager.scene,
      CameraSystem.activeCamera
    );

    // 10. Gameplay systems
    PowerSystem.init();
    PlayerController.init();
    AIController.init();

    // 11. Wire cross-system events
    this._bindGlobalEvents();

    // 12. Transition to menu
    await this._hideLoadingScreen();
    this._setState(GameState.MENU);
    UIManager.showScreen('menu');

    EventSystem.emit(Events.ENGINE_READY, { nightIndex: this.nightIndex });

    // 13. Start render loop
    this.clock.start();
    this._loop();
  }

  // ── Public API ────────────────────────────────────────────

  /** @param {number} night */
  startNight(night) {
    this.nightIndex = night;
    SaveSystem.set('currentNight', night);
    SaveSystem.save();

    AIController.configureForNight(night);
    PowerSystem.reset();
    PlayerController.reset();

    UIManager.showScreen('hud');
    AudioManager.startAmbience();

    this._setState(GameState.PLAYING);
    EventSystem.emit(Events.NIGHT_START, { night });
  }

  pause() {
    if (this.state !== GameState.PLAYING) return;
    this._setState(GameState.PAUSED);
    this.clock.stop();
    AudioManager.pause();
    EventSystem.emit(Events.ENGINE_PAUSED);
  }

  resume() {
    if (this.state !== GameState.PAUSED) return;
    this._setState(GameState.PLAYING);
    this.clock.start();
    AudioManager.resume();
    EventSystem.emit(Events.ENGINE_RESUMED);
  }

  // ── Private ───────────────────────────────────────────────

  /** Core render loop — runs as rAF callback */
  _loop() {
    requestAnimationFrame(() => this._loop());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    PerformanceMonitor.beginFrame();

    if (this.state === GameState.PLAYING) {
      // System updates in deterministic order
      PowerSystem.update(delta);
      AIController.update(delta, elapsed);
      PlayerController.update(delta);
      SceneManager.update(delta, elapsed);
      CameraSystem.update(delta);
      AudioManager.update(delta, elapsed);
    }

    // Always render (menu, paused, etc. still need frames)
    PostProcessingPipeline.render(delta);

    UIManager.update(delta);
    DebugOverlay.update(delta);
    PerformanceMonitor.endFrame();
  }

  _setState(newState) {
    this.state = newState;
  }

  _bindGlobalEvents() {
    // Night success / failure routing
    EventSystem.on(Events.NIGHT_END_SURVIVE, () => this._onNightSurvive());
    EventSystem.on(Events.NIGHT_END_FAIL,    () => this._onNightFail());
    EventSystem.on(Events.POWER_DEPLETED,    () => this._onPowerDepleted());

    // Debug toggle
    document.addEventListener('keydown', e => {
      if (e.key === GameConfig.DEBUG_HOTKEY) {
        const enabled = !SettingsManager.get('debugMode');
        SettingsManager.set('debugMode', enabled);
        DebugOverlay.setVisible(enabled);
        window.__FNAF__ = enabled ? this : undefined;
        EventSystem.emit(Events.DEBUG_TOGGLED, { enabled });
      }
      if (e.key === 'Escape' && this.state === GameState.PLAYING) this.pause();
      if (e.key === 'Escape' && this.state === GameState.PAUSED)  this.resume();
    });

    // Quality changes
    EventSystem.on(Events.QUALITY_CHANGED, ({ config }) => {
      RendererManager.applyQuality(config);
      PostProcessingPipeline.applyQuality(config);
    });

    // Visibility API — auto-pause when tab hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === GameState.PLAYING) this.pause();
    });
  }

  _onNightSurvive() {
    const beaten = SaveSystem.get('nightsBeaten') ?? [];
    if (!beaten.includes(this.nightIndex)) {
      beaten.push(this.nightIndex);
      SaveSystem.set('nightsBeaten', beaten);
    }
    SaveSystem.set('highestNight', Math.max(SaveSystem.get('highestNight'), this.nightIndex));
    SaveSystem.set('currentNight', Math.min(this.nightIndex + 1, 7));
    SaveSystem.save();

    AudioManager.stopAmbience();
    this._setState(GameState.WIN);
    UIManager.showScreen('survive');
  }

  _onNightFail() {
    const deaths = (SaveSystem.get('totalDeaths') ?? 0) + 1;
    SaveSystem.set('totalDeaths', deaths);
    SaveSystem.save();

    AudioManager.stopAmbience();
    this._setState(GameState.GAME_OVER);
    UIManager.showScreen('death');
  }

  _onPowerDepleted() {
    // Power-out horror sequence — lights go out, then Freddy attacks after delay
    SceneManager.triggerBlackout();
    AudioManager.playFanfare();
    setTimeout(() => {
      if (this.state === GameState.PLAYING) {
        EventSystem.emit(Events.JUMPSCARE, { animatronic: 'freddy', source: 'power' });
      }
    }, 6000);
  }

  _updateLoadingBar(frac, status) {
    const bar    = document.getElementById('loading-bar');
    const label  = document.getElementById('loading-status');
    if (bar)   bar.style.width = `${Math.round(frac * 100)}%`;
    if (label) label.textContent = status;
  }

  async _hideLoadingScreen() {
    return new Promise(resolve => {
      const screen = document.getElementById('loading-screen');
      if (!screen) { resolve(); return; }
      screen.classList.add('fade-out');
      setTimeout(resolve, 900);
    });
  }
}
