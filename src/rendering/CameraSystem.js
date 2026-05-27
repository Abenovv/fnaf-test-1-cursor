/**
 * @fileoverview Player and surveillance camera management.
 * Handles the office view (first-person) and the tablet camera feed views.
 * Includes cinematic head-bob, inertia, and smooth sway.
 */

import * as THREE from 'three';
import { GameConfig }           from '../config/GameConfig.js';
import { EventSystem, Events }  from '../core/EventSystem.js';
import { SettingsManager }      from '../core/SettingsManager.js';

/** Camera positions for each surveillance feed */
const CAMERA_TRANSFORMS = {
  'cam1a': { pos: [0, 2.0, -2.4], rot: [0,  0,     0] },      // Show Stage
  'cam1b': { pos: [0, 2.0,  0.0], rot: [-0.1, 0,   0] },      // Dining Area
  'cam1c': { pos: [-3.5, 2.0, -1.5], rot: [0,  0.4, 0] },     // Pirate Cove
  'cam2a': { pos: [-5.5, 2.0,  0.0], rot: [0,  0.3, 0] },     // West Hall
  'cam2b': { pos: [-5.5, 2.0, -3.0], rot: [0,  0.2, 0] },     // West Hall Corner
  'cam3':  { pos: [-2.0, 2.0, -4.0], rot: [0,  0.1, 0] },     // Supply Closet
  'cam4a': { pos: [ 5.5, 2.0,  0.0], rot: [0, -0.3, 0] },     // East Hall
  'cam4b': { pos: [ 5.5, 2.0, -3.0], rot: [0, -0.2, 0] },     // East Hall Corner
  'cam5':  { pos: [ 2.0, 2.0, -4.0], rot: [0, -0.1, 0] },     // Backstage
  'cam6':  { pos: [ 0.0, 2.2, -5.0], rot: [-0.15, 0, 0] },    // Kitchen
};

class CameraSystemClass {
  constructor() {
    /** @type {THREE.PerspectiveCamera} first-person office camera */
    this.activeCamera = null;

    /** @type {THREE.PerspectiveCamera} surveillance cam feed */
    this._surveillanceCamera = null;

    this._isCameraOpen   = false;
    this._activeFeedId   = null;
    this._switchCooldown = 0;

    // Head sway
    this._swayTimer  = 0;
    this._swayAmount = 0.0006;

    // Mouse look state (office camera)
    this._targetRotX = 0;
    this._targetRotY = 0;
    this._currentRotX = 0;
    this._currentRotY = 0;
    this._mouseLookEnabled = false;

    // Inertia
    this._velocity = new THREE.Vector2();

    // Reusable objects
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
  }

  init() {
    const fov = SettingsManager.get('fov') ?? 75;

    // Primary first-person camera
    this.activeCamera = new THREE.PerspectiveCamera(
      fov, window.innerWidth / window.innerHeight, 0.05, 40
    );
    this.activeCamera.position.set(0, 1.55, 1.8);
    this.activeCamera.name = 'PlayerCamera';

    // Surveillance overhead camera (lower quality view)
    this._surveillanceCamera = new THREE.PerspectiveCamera(
      80, window.innerWidth / window.innerHeight, 0.1, 30
    );
    this._surveillanceCamera.name = 'SurveillanceCamera';

    // Handle resize
    EventSystem.on('renderer:resize', ({ width, height }) => {
      const aspect = width / height;
      this.activeCamera.aspect = aspect;
      this.activeCamera.updateProjectionMatrix();
      this._surveillanceCamera.aspect = aspect;
      this._surveillanceCamera.updateProjectionMatrix();
    });

    // Listen for FOV changes via settings
    EventSystem.on(Events.SETTINGS_CHANGED, ({ key, value }) => {
      if (key === 'fov') {
        this.activeCamera.fov = value;
        this.activeCamera.updateProjectionMatrix();
      }
    });

    // Mouse look for office camera
    this._bindMouseLook();
  }

  update(delta) {
    this._switchCooldown = Math.max(0, this._switchCooldown - delta * 1000);

    if (!this._isCameraOpen) {
      this._updateOfficeCameraSway(delta);
      this._updateMouseLookInertia(delta);
    }
  }

  // ── Public API ────────────────────────────────────────────

  /** @returns {THREE.Camera} camera to use for rendering this frame */
  getRenderCamera() {
    return this.activeCamera;
  }

  /** Open the tablet / camera feed UI */
  openCameraFeed(feedId = 'cam1a') {
    if (this._isCameraOpen) return;
    this._isCameraOpen       = true;
    this._activeFeedId       = feedId;
    this._mouseLookEnabled   = false;
    this._positionSurveillanceCamera(feedId);
    EventSystem.emit(Events.CAMERA_OPENED, { feedId });
  }

  /** Close camera feed, return to office view */
  closeCameraFeed() {
    if (!this._isCameraOpen) return;
    this._isCameraOpen     = false;
    this._mouseLookEnabled = true;
    EventSystem.emit(Events.CAMERA_CLOSED, { feedId: this._activeFeedId });
    this._activeFeedId = null;
  }

  /**
   * Switch to a different camera feed while tablet is open.
   * @param {string} feedId
   */
  switchFeed(feedId) {
    if (!this._isCameraOpen) return;
    if (!CAMERA_TRANSFORMS[feedId]) return;
    if (this._switchCooldown > 0) return;

    this._switchCooldown = GameConfig.CAMERA_SWITCH_DELAY;
    this._activeFeedId   = feedId;
    this._positionSurveillanceCamera(feedId);
    EventSystem.emit(Events.CAMERA_SWITCHED, { feedId });
  }

  get isCameraOpen() { return this._isCameraOpen; }
  get activeFeedId() { return this._activeFeedId; }

  /** Returns all valid camera feed IDs */
  getFeedIds() { return Object.keys(CAMERA_TRANSFORMS); }

  // ── Private ───────────────────────────────────────────────

  _positionSurveillanceCamera(feedId) {
    const transform = CAMERA_TRANSFORMS[feedId];
    if (!transform) return;
    const [px, py, pz] = transform.pos;
    const [rx, ry, rz] = transform.rot;
    this._surveillanceCamera.position.set(px, py, pz);
    this._surveillanceCamera.rotation.set(rx, ry, rz);
    this._surveillanceCamera.updateMatrixWorld();
  }

  _updateOfficeCameraSway(delta) {
    this._swayTimer += delta;
    const sway = Math.sin(this._swayTimer * 0.4) * this._swayAmount;
    // Subtle vertical breathing motion
    this.activeCamera.position.y = 1.55 + Math.sin(this._swayTimer * 0.35) * 0.003;
    this.activeCamera.rotation.z = sway;
  }

  _updateMouseLookInertia(delta) {
    const lerpSpeed = 8.0;
    this._currentRotX += (this._targetRotX - this._currentRotX) * lerpSpeed * delta;
    this._currentRotY += (this._targetRotY - this._currentRotY) * lerpSpeed * delta;

    this._euler.set(this._currentRotX, this._currentRotY, this.activeCamera.rotation.z, 'YXZ');
    this.activeCamera.rotation.copy(this._euler);
  }

  _bindMouseLook() {
    this._mouseLookEnabled = true;
    const sensitivity = 0.0008;
    const limitX      = 0.18; // radians — limited to slight pan, not full look-around
    const limitY      = 0.25;

    document.addEventListener('mousemove', e => {
      if (!this._mouseLookEnabled) return;
      this._targetRotX = Math.max(-limitX, Math.min(limitX,
        this._targetRotX - e.movementY * sensitivity
      ));
      this._targetRotY = Math.max(-limitY, Math.min(limitY,
        this._targetRotY - e.movementX * sensitivity
      ));
    }, { passive: true });

    // Touch-based look for mobile
    let lastTouch = null;
    document.addEventListener('touchmove', e => {
      if (!this._mouseLookEnabled) return;
      const t = e.touches[0];
      if (lastTouch) {
        const dx = t.clientX - lastTouch.x;
        const dy = t.clientY - lastTouch.y;
        this._targetRotX = Math.max(-limitX, Math.min(limitX,
          this._targetRotX - dy * sensitivity * 1.5
        ));
        this._targetRotY = Math.max(-limitY, Math.min(limitY,
          this._targetRotY - dx * sensitivity * 1.5
        ));
      }
      lastTouch = { x: t.clientX, y: t.clientY };
    }, { passive: true });

    document.addEventListener('touchend', () => { lastTouch = null; }, { passive: true });
  }
}

export const CameraSystem = new CameraSystemClass();
