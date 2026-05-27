# Five Nights at Freddy's — Analog Horror Edition

> Production-quality browser horror game built on Three.js r168+, Vanilla JS ES Modules, and Web Audio API.

---

## Architecture Overview

```
src/
├── main.js                         Entry point
├── config/
│   └── GameConfig.js               Single source of truth for all constants
├── core/
│   ├── GameEngine.js               Top-level orchestrator & render loop
│   ├── EventSystem.js              Type-safe event bus (all inter-system comms)
│   ├── ResourceManager.js          Asset loading, caching, lazy demand loading
│   ├── SaveSystem.js               LocalStorage persistence with migration
│   ├── SettingsManager.js          Player settings with quality presets
│   └── LocalizationManager.js      Runtime i18n
├── localization/
│   └── en.js                       English locale strings
├── rendering/
│   ├── RendererManager.js          WebGLRenderer config & adaptive DPR
│   ├── SceneManager.js             3D environment, lighting, flickering
│   ├── CameraSystem.js             First-person & surveillance cameras
│   └── PostProcessingPipeline.js   Bloom, FXAA, film grain, CRT, glitch shader
├── audio/
│   └── AudioManager.js             Web Audio API: HVAC drone, tension layers, SFX
├── ui/
│   └── UIManager.js                All HTML/CSS screens: menu, HUD, cameras, settings
├── gameplay/
│   ├── PowerSystem.js              Power drain, usage tracking, depletion events
│   ├── PlayerController.js         Input binding → EventSystem dispatch
│   ├── AIController.js             Night configuration, AI tick orchestration
│   └── animatronics/
│       ├── AnimatronicBase.js      Abstract base with movement graph
│       ├── Freddy.js               Darkness predator — camera neglect mechanic
│       ├── Bonnie.js               Left-side aggressor with fake-outs
│       ├── Chica.js                Right-side disorientation, kitchen linger
│       └── Foxy.js                 Panic sprint — cove-stage system
├── debug/
│   ├── PerformanceMonitor.js       FPS, frame time, GC spike detection
│   └── DebugOverlay.js             F3 overlay: AI state, power, render stats
└── utils/                          (reserved for math helpers, easing, etc.)
```

---

## Getting Started

### Browser (zero build)

```bash
# Serve from project root — any static file server works
npx serve .
# or
python -m http.server 8080
```

Open `http://localhost:8080`.

> **Note:** A local server is required (ES modules don't load from `file://`).

### Vercel

Drop the entire folder into Vercel. No build step needed — `index.html` is the root.

---

## Controls

| Action         | Keyboard       | Mouse             | Mobile         |
|----------------|----------------|-------------------|----------------|
| Cameras        | C / Tab        | Right-click       | [CAM] button   |
| Left door      | 1              | —                 | DOOR ◀         |
| Right door     | 2              | —                 | ▶ DOOR         |
| Left light     | Q (hold)       | —                 | LIGHT ◀        |
| Right light    | E (hold)       | —                 | ▶ LIGHT        |
| Pause / Resume | Escape         | —                 | —              |
| Debug overlay  | F3             | —                 | —              |

---

## Night AI Levels

| Night | Freddy | Bonnie | Chica | Foxy |
|-------|--------|--------|-------|------|
| 1     | 0      | 0      | 0     | 0    |
| 2     | 0      | 3      | 1     | 1    |
| 3     | 1      | 5      | 3     | 2    |
| 4     | 2      | 7      | 5     | 4    |
| 5     | 4      | 10     | 8     | 6    |
| 6     | 8      | 15     | 12    | 10   |
| 7     | 10     | 20     | 20    | 20   |

---

## Post-Processing Passes

1. **RenderPass** — Standard Three.js render
2. **UnrealBloomPass** — Subtle glow on emissive surfaces (strength 0.25)
3. **FXAA ShaderPass** — Anti-aliasing without MSAA cost
4. **Analog Horror ShaderPass** — Custom composite:
   - Film grain (animated, per-frame random seed)
   - Chromatic aberration (radial outward split)
   - Vignette (radial darkness)
   - CRT barrel distortion
   - Glitch bands (triggered by events)

All effects individually togglable from Settings.

---

## Audio Architecture

```
AudioContext
└── MasterGain
    ├── MusicBus
    ├── AmbienceBus
    │   ├── HVAC white-noise → bandpass filter (80 Hz)
    │   └── Sub-bass drone oscillators (38 Hz + 41 Hz beating)
    ├── SFXBus  (procedural synthesis + real assets)
    └── VoiceBus
```

Tension level drives drone volume. Ambience ducks on jumpscare.

---

## Quality Presets

| Setting | DPR   | Shadows | Shadow Size | Post-Process |
|---------|-------|---------|-------------|--------------|
| Low     | 0.5×  | Off     | 256         | Off          |
| Medium  | 0.75× | On      | 512         | On           |
| High    | 1.0×  | On      | 1024        | On           |
| Ultra   | DPR×  | On      | 2048        | On           |

---

## Expanding the Game

- **New animatronic**: Extend `AnimatronicBase`, add to `AIController._animatronics`
- **New night**: Add row to `NIGHT_AI_LEVELS` in `AIController.js`
- **New camera room**: Add entry to `CAMERA_TRANSFORMS` in `CameraSystem.js`
- **New locale**: Add `src/localization/<code>.js` mirroring `en.js`
- **Real 3D models**: Replace `SceneManager` geometry builders; use `ResourceManager.demand()` for lazy GLTF loading
- **Real audio assets**: Load via `ResourceManager` with `AssetType.AUDIO`, decode in `AudioManager`

---

## License

Concept inspired by *Five Nights at Freddy's* by Scott Cawthon. This is an independent fan project for educational purposes.
# Fnaf-web-test1
# fnaf-test-1
