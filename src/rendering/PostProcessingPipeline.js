/**
 * @fileoverview Post-processing pipeline.
 * Uses Three.js EffectComposer with ordered passes:
 *   RenderPass → UnrealBloomPass → ShaderPass (FXAA) → ShaderPass (Analog Horror)
 *
 * The final Analog Horror pass composites:
 *   - film grain, vignette, chromatic aberration, CRT bend, glitch, exposure
 * All subtle, physically restrained as per production spec.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { GameConfig }           from '../config/GameConfig.js';
import { SettingsManager }      from '../core/SettingsManager.js';
import { EventSystem, Events }  from '../core/EventSystem.js';

class PostProcessingPipelineClass {
  constructor() {
    this._composer     = null;
    this._analogPass   = null;
    this._bloomPass    = null;
    this._fxaaPass     = null;
    this._renderer     = null;
    this._scene        = null;
    this._camera       = null;
    this._useFallback  = false;
    this._glitchActive = false;
    this._glitchTimer  = 0;
    this._time         = 0;
  }

  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene}         scene
   * @param {THREE.Camera}        camera
   */
  async init(renderer, scene, camera) {
    this._renderer = renderer;
    this._scene    = scene;
    this._camera   = camera;

    try {
      const w = window.innerWidth;
      const h = window.innerHeight;

      this._composer = new EffectComposer(renderer);

      // 1. Standard render pass
      this._composer.addPass(new RenderPass(scene, camera));

      // 2. Bloom — restrained, subtle glow on emissive objects
      const cfg = GameConfig.POST;
      this._bloomPass = new UnrealBloomPass(
        new THREE.Vector2(w, h),
        cfg.BLOOM_STRENGTH,
        cfg.BLOOM_RADIUS,
        cfg.BLOOM_THRESHOLD
      );
      this._composer.addPass(this._bloomPass);

      // 3. FXAA anti-aliasing
      const fxaa = new ShaderPass(FXAAShader);
      fxaa.uniforms['resolution'].value.set(1 / w, 1 / h);
      this._fxaaPass = fxaa;
      this._composer.addPass(fxaa);

      // 4. Analog Horror composite pass (custom shader)
      this._analogPass = new ShaderPass(this._buildAnalogShader());
      this._composer.addPass(this._analogPass);

      // Handle resize
      EventSystem.on('renderer:resize', ({ width, height }) => {
        this._composer.setSize(width, height);
        this._fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);
      });

      // Glitch events
      EventSystem.on(Events.SCREEN_GLITCH,   () => this._triggerGlitch());
      EventSystem.on(Events.LIGHT_FLICKER,   () => this._triggerGlitch(0.3));
      EventSystem.on(Events.CAMERA_SWITCHED, () => this._triggerGlitch(0.5));
      EventSystem.on(Events.SETTINGS_CHANGED, ({ key, value }) => this._onSettingChanged(key, value));

      this._useFallback = false;
    } catch (err) {
      console.warn('[PostProcessingPipeline] Falling back to direct render:', err);
      this._useFallback = true;
    }
  }

  /**
   * Apply quality preset to post-processing.
   * @param {Object} config
   */
  applyQuality(config) {
    if (!this._composer) return;
    if (!config.postProcess) {
      // Disable expensive passes on low quality
      if (this._bloomPass) this._bloomPass.enabled = false;
    } else {
      if (this._bloomPass) this._bloomPass.enabled = true;
    }
  }

  /**
   * Render the full pipeline.
   * @param {number} delta
   */
  render(delta) {
    if (this._useFallback) {
      if (this._renderer && this._scene && this._camera) {
        this._renderer.render(this._scene, this._camera);
      }
      return;
    }
    if (!this._composer) return;
    this._time += delta;

    // Update glitch timer
    if (this._glitchActive) {
      this._glitchTimer -= delta;
      if (this._glitchTimer <= 0) {
        this._glitchActive = false;
        this._analogPass.uniforms.uGlitchStrength.value = 0.0;
        this._analogPass.uniforms.uGlitchOffset.value   = 0.0;
      }
    }

    // Update time uniform for animated grain
    if (this._analogPass) {
      const u = this._analogPass.uniforms;
      u.uTime.value = this._time;

      // Respect individual settings toggles
      u.uGrainEnabled.value     = SettingsManager.get('filmGrain')  ? 1 : 0;
      u.uChromaticEnabled.value = SettingsManager.get('chromatic')  ? 1 : 0;
      u.uCRTEnabled.value       = SettingsManager.get('crtEffect')  ? 1 : 0;
      u.uVignetteEnabled.value  = SettingsManager.get('vignette')   ? 1 : 0;
    }

    this._composer.render(delta);
  }

  // ── Private ───────────────────────────────────────────────

  _triggerGlitch(strength = 1.0) {
    if (!this._analogPass) return;
    this._glitchActive = true;
    this._glitchTimer  = 0.08 + Math.random() * 0.12;
    this._analogPass.uniforms.uGlitchStrength.value = strength * 0.012;
    this._analogPass.uniforms.uGlitchOffset.value   = (Math.random() - 0.5) * 0.02;
  }

  _onSettingChanged(key) {
    if (!this._bloomPass) return;
    if (key === 'bloom') {
      this._bloomPass.enabled = SettingsManager.get('bloom') !== false;
    }
  }

  _buildAnalogShader() {
    const cfg = GameConfig.POST;
    return {
      uniforms: {
        tDiffuse:          { value: null },
        uTime:             { value: 0.0 },
        uGrain:            { value: cfg.FILM_GRAIN },
        uGrainEnabled:     { value: 1 },
        uChromaticAber:    { value: cfg.CHROMATIC_ABER },
        uChromaticEnabled: { value: 1 },
        uVigOffset:        { value: cfg.VIGNETTE_OFFSET },
        uVigDarkness:      { value: cfg.VIGNETTE_DARKNESS },
        uVignetteEnabled:  { value: 1 },
        uCRTBend:          { value: cfg.CRT_BEND },
        uCRTEnabled:       { value: 1 },
        uGlitchStrength:   { value: 0.0 },
        uGlitchOffset:     { value: 0.0 },
      },

      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,

      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float uTime;

        // Film grain
        uniform float uGrain;
        uniform int   uGrainEnabled;

        // Chromatic aberration
        uniform float uChromaticAber;
        uniform int   uChromaticEnabled;

        // Vignette
        uniform float uVigOffset;
        uniform float uVigDarkness;
        uniform int   uVignetteEnabled;

        // CRT barrel distortion
        uniform float uCRTBend;
        uniform int   uCRTEnabled;

        // Glitch
        uniform float uGlitchStrength;
        uniform float uGlitchOffset;

        varying vec2 vUv;

        // ── Pseudo-random noise ──────────────────────────────
        float rand(vec2 co) {
          return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
        }

        // ── CRT barrel distortion ────────────────────────────
        vec2 barrelDistort(vec2 uv, float bend) {
          vec2 cc = uv - 0.5;
          float dist = dot(cc, cc) * bend * 0.001;
          return uv + cc * (1.0 + dist) * dist;
        }

        void main() {
          vec2 uv = vUv;

          // CRT barrel
          if (uCRTEnabled == 1) {
            uv = barrelDistort(uv, uCRTBend);
            // Black outside barrel
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
              return;
            }
          }

          // Glitch horizontal offset
          if (uGlitchStrength > 0.0) {
            float band = floor(uv.y * 80.0) / 80.0;
            float noise = rand(vec2(band, uTime * 40.0));
            if (noise > 0.85) {
              uv.x += uGlitchStrength * (rand(vec2(uv.y, uTime)) - 0.5) * 4.0;
              uv.y += uGlitchOffset * rand(vec2(uTime, band));
            }
          }

          uv = clamp(uv, 0.0, 1.0);

          // Chromatic aberration (subtle split RGB)
          vec4 color;
          if (uChromaticEnabled == 1 && uChromaticAber > 0.0) {
            vec2 offset = (uv - 0.5) * uChromaticAber;
            float r = texture2D(tDiffuse, uv + offset).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - offset).b;
            color = vec4(r, g, b, 1.0);
          } else {
            color = texture2D(tDiffuse, uv);
          }

          // Film grain
          if (uGrainEnabled == 1 && uGrain > 0.0) {
            float grain = rand(uv + fract(uTime * 0.37)) * 2.0 - 1.0;
            color.rgb += grain * uGrain;
          }

          // Vignette
          if (uVignetteEnabled == 1) {
            vec2 vig = uv - 0.5;
            float vigAmt = uVigOffset - dot(vig, vig) * uVigDarkness;
            color.rgb *= clamp(vigAmt, 0.0, 1.0);
          }

          gl_FragColor = color;
        }
      `,
    };
  }
}

export const PostProcessingPipeline = new PostProcessingPipelineClass();
