/**
 * @fileoverview Player interaction controller.
 * Handles input (keyboard, mouse, touch) for door buttons, light buttons,
 * camera tablet, and office camera cycling.
 *
 * Does NOT contain game logic — only translates input into EventSystem emissions.
 */

import { EventSystem, Events } from '../core/EventSystem.js';
import { CameraSystem }        from '../rendering/CameraSystem.js';
import { PowerSystem }         from './PowerSystem.js';

/** Stress state 0–1 — drives audio and horror reactivity */
const MAX_STRESS   = 100;
const STRESS_DECAY = 2; // per second

class PlayerControllerClass {
  constructor() {
    this._stress        = 0;
    this._lastJumpscare = 0;
    this._active        = false;

    // Input state
    this._keys = new Set();
  }

  init() {
    this._bindKeyboard();
    this._bindMouse();
    this._bindTouch();

    // Stress builds from AI proximity
    EventSystem.on(Events.AI_MOVED, ({ animatronic, location }) => {
      if (location === 'office') this._applyStress(35);
      else if (location === 'door') this._applyStress(18);
    });

    EventSystem.on(Events.JUMPSCARE, () => {
      this._applyStress(MAX_STRESS);
      this._lastJumpscare = performance.now();
    });

    this._active = true;
  }

  reset() {
    this._stress = 0;
    this._active = true;
  }

  /**
   * @param {number} delta  seconds
   */
  update(delta) {
    // Stress naturally decays over time
    this._stress = Math.max(0, this._stress - STRESS_DECAY * delta);
  }

  /** @returns {number} 0–1 normalized stress */
  get stressNormalized() { return this._stress / MAX_STRESS; }

  // ── Private input binding ─────────────────────────────────

  _bindKeyboard() {
    document.addEventListener('keydown', e => {
      if (!this._active) return;
      this._keys.add(e.code);

      switch (e.code) {
        // Camera tablet
        case 'KeyC': case 'Tab':
          e.preventDefault();
          if (CameraSystem.isCameraOpen) {
            CameraSystem.closeCameraFeed();
          } else {
            CameraSystem.openCameraFeed();
            EventSystem.emit(Events.CAMERA_OPENED);
          }
          break;

        // Doors (1/2 for left/right)
        case 'Digit1':
          if (!PowerSystem.isDepleted)
            EventSystem.emit(Events.DOOR_LEFT_TOGGLED);
          break;
        case 'Digit2':
          if (!PowerSystem.isDepleted)
            EventSystem.emit(Events.DOOR_RIGHT_TOGGLED);
          break;

        // Hallway lights (Q/E)
        case 'KeyQ':
          if (!PowerSystem.isDepleted)
            EventSystem.emit(Events.LIGHT_LEFT_TOGGLED);
          break;
        case 'KeyE':
          if (!PowerSystem.isDepleted)
            EventSystem.emit(Events.LIGHT_RIGHT_TOGGLED);
          break;
      }
    });

    document.addEventListener('keyup', e => {
      this._keys.delete(e.code);
      // Lights are held — release turns them off
      if (e.code === 'KeyQ') EventSystem.emit(Events.LIGHT_LEFT_TOGGLED);
      if (e.code === 'KeyE') EventSystem.emit(Events.LIGHT_RIGHT_TOGGLED);
    });
  }

  _bindMouse() {
    // Right-click = camera tablet toggle
    document.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (!this._active) return;
      if (CameraSystem.isCameraOpen) CameraSystem.closeCameraFeed();
      else CameraSystem.openCameraFeed();
    });
  }

  _bindTouch() {
    // Touch buttons are injected by UIManager as DOM elements.
    // This binding handles virtual button callbacks forwarded via events.
    EventSystem.on('input:touch:door_left',   () => EventSystem.emit(Events.DOOR_LEFT_TOGGLED));
    EventSystem.on('input:touch:door_right',  () => EventSystem.emit(Events.DOOR_RIGHT_TOGGLED));
    EventSystem.on('input:touch:light_left',  () => EventSystem.emit(Events.LIGHT_LEFT_TOGGLED));
    EventSystem.on('input:touch:light_right', () => EventSystem.emit(Events.LIGHT_RIGHT_TOGGLED));
    EventSystem.on('input:touch:camera',      () => {
      if (CameraSystem.isCameraOpen) CameraSystem.closeCameraFeed();
      else CameraSystem.openCameraFeed();
    });
  }

  _applyStress(amount) {
    this._stress = Math.min(MAX_STRESS, this._stress + amount);
    EventSystem.emit(Events.AUDIO_TENSION_CHANGED, {
      tension: this._stress / MAX_STRESS
    });
  }
}

export const PlayerController = new PlayerControllerClass();
