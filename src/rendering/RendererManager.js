/**
 * @fileoverview WebGL renderer initialization and configuration.
 * Owns the THREE.WebGLRenderer instance and handles resize / DPR adaptation.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { GameConfig }          from '../config/GameConfig.js';
import { SettingsManager }     from '../core/SettingsManager.js';
import { EventSystem, Events } from '../core/EventSystem.js';

class RendererManagerClass {
  constructor() {
    /** @type {THREE.WebGLRenderer|null} */
    this.renderer = null;
    this._canvas  = null;
  }

  init() {
    this._canvas = document.getElementById('game-canvas');

    this.renderer = new THREE.WebGLRenderer({
      canvas:           this._canvas,
      antialias:        false,   // FXAA applied via post-process instead
      alpha:            false,
      powerPreference:  'high-performance',
      stencil:          false,
      depth:            true,
      logarithmicDepthBuffer: false,
    });

    // Apply initial quality settings
    const qualConfig = SettingsManager.getQualityConfig();
    this.applyQuality(qualConfig);

    // Shadow configuration
    this.renderer.shadowMap.enabled = qualConfig.shadows;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

    // Tone mapping for physical lighting
    this.renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = GameConfig.POST.EXPOSURE;
    this.renderer.outputColorSpace    = THREE.SRGBColorSpace;

    // Size
    this._resize();
    window.addEventListener('resize', () => this._resize(), { passive: true });

    // Listen for quality changes
    EventSystem.on(Events.QUALITY_CHANGED, ({ config }) => this.applyQuality(config));
  }

  /**
   * Apply a quality preset config object.
   * @param {Object} config
   */
  applyQuality(config) {
    if (!this.renderer) return;

    const dpr = Math.min(config.dpr ?? 1.0, window.devicePixelRatio);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = config.shadows ?? true;

    if (config.shadowSize) {
      // Propagated to shadow-casting lights by SceneManager
      this._pendingShadowSize = config.shadowSize;
    }
    this._resize();
  }

  /** Current shadow size requested by quality config */
  get shadowMapSize() {
    return this._pendingShadowSize ?? GameConfig.SHADOW_MAP_SIZE;
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    EventSystem.emit('renderer:resize', { width: w, height: h });
  }
}

export const RendererManager = new RendererManagerClass();
