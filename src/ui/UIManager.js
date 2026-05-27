/**
 * @fileoverview UI system — manages all 2D overlay screens and HUD.
 *
 * Screens managed:
 *   - menu         (main menu)
 *   - hud          (in-game HUD: power, time, camera tablet)
 *   - camera_feed  (surveillance tablet overlay)
 *   - settings     (settings panel)
 *   - death        (game over / jumpscare)
 *   - survive      (6 AM survive screen)
 *   - night_select (night selection)
 *
 * All UI is rendered as HTML/CSS over the WebGL canvas for maximum performance.
 * Touch controls are injected here for mobile play.
 */

import { EventSystem, Events }  from '../core/EventSystem.js';
import { PowerSystem }          from '../gameplay/PowerSystem.js';
import { CameraSystem }         from '../rendering/CameraSystem.js';
import { SaveSystem }           from '../core/SaveSystem.js';
import { SettingsManager }      from '../core/SettingsManager.js';
import { t }                    from '../core/LocalizationManager.js';
import { GameConfig }           from '../config/GameConfig.js';

/** Night hours for display */
const HOURS = ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM'];

class UIManagerClass {
  constructor() {
    this._layer    = null;
    this._screens  = {};
    this._active   = null;

    // HUD state
    this._power     = 100;
    this._hour      = 0;
    this._night     = 1;
    this._camOpen   = false;

    // Night clock
    this._nightElapsed = 0;
    this._hourDuration = GameConfig.HOUR_DURATION_SECONDS;

    // Notification queue
    this._notificationTimer = 0;
  }

  init() {
    this._layer = document.getElementById('ui-layer');
    this._buildAllScreens();
    this._bindEvents();
    this._detectMobile();
  }

  /**
   * @param {string} screenId
   */
  showScreen(screenId) {
    if (this._active) {
      this._active.style.display = 'none';
    }
    const screen = this._screens[screenId];
    if (!screen) { console.warn(`[UIManager] Unknown screen: ${screenId}`); return; }
    screen.style.display = 'flex';
    this._active = screen;
    this._activeId = screenId;
  }

  /**
   * @param {number} delta
   */
  update(delta) {
    if (this._activeId === 'hud') {
      this._updateHUD(delta);
    }
    if (this._notificationTimer > 0) {
      this._notificationTimer -= delta;
      if (this._notificationTimer <= 0) this._hideNotification();
    }
  }

  // ── Screen builders ───────────────────────────────────────

  _buildAllScreens() {
    this._screens.menu        = this._buildMenuScreen();
    this._screens.night_select = this._buildNightSelectScreen();
    this._screens.hud         = this._buildHUDScreen();
    this._screens.camera_feed = this._buildCameraFeedScreen();
    this._screens.settings    = this._buildSettingsScreen();
    this._screens.death       = this._buildDeathScreen();
    this._screens.survive     = this._buildSurviveScreen();

    for (const screen of Object.values(this._screens)) {
      screen.style.display = 'none';
      this._layer.appendChild(screen);
    }
  }

  _buildMenuScreen() {
    const el = this._el('div', 'w-full h-full flex flex-col items-center justify-center');
    el.style.cssText += '; background: rgba(5,5,7,0.96);';
    el.innerHTML = `
      <div class="text-center select-none">
        <h1 style="font-family:'VT323',monospace;color:#8b0000;font-size:3.5rem;letter-spacing:0.2em;
                   text-shadow:0 0 30px #8b000080;margin-bottom:0.25rem;">
          FAZBEAR ENTERTAINMENT
        </h1>
        <p style="font-family:'Share Tech Mono',monospace;color:#444;font-size:0.7rem;
                  letter-spacing:0.15em;margin-bottom:3rem;">
          SECURITY SURVEILLANCE SYSTEM — BUILD 3.7.1
        </p>
        <div id="menu-buttons" style="display:flex;flex-direction:column;gap:0.75rem;align-items:center;min-width:260px;">
          <button id="btn-play"     class="menu-btn">BEGIN SHIFT</button>
          <button id="btn-settings" class="menu-btn menu-btn-secondary">SYSTEM SETTINGS</button>
          <button id="btn-credits"  class="menu-btn menu-btn-secondary" style="opacity:0.5;cursor:default;">ABOUT</button>
        </div>
        <p style="font-family:'Share Tech Mono',monospace;color:#222;font-size:0.55rem;
                  margin-top:3rem;letter-spacing:0.1em;">
          FAZBEAR ENTERTAINMENT IS NOT RESPONSIBLE FOR PROPERTY OR PERSONAL DAMAGE.
        </p>
      </div>
    `;
    this._injectMenuStyles();
    return el;
  }

  _buildNightSelectScreen() {
    const el = this._el('div', 'w-full h-full flex flex-col items-center justify-center');
    el.style.cssText += '; background: rgba(5,5,7,0.97);';

    const saved = SaveSystem.getData();
    const highestBeaten = saved.highestNight;

    let nightButtons = '';
    for (let n = 1; n <= 7; n++) {
      const locked   = n > highestBeaten + 1;
      const beaten   = saved.nightsBeaten.includes(n);
      const cls      = locked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:text-red-700';
      const suffix   = beaten ? ' ✓' : (locked ? ' 🔒' : '');
      nightButtons  += `
        <button data-night="${n}" ${locked ? 'disabled' : ''}
          style="font-family:'Share Tech Mono',monospace;color:#8b0000;background:none;border:1px solid #1a0000;
                 padding:0.5rem 1.5rem;font-size:0.75rem;letter-spacing:0.1em;cursor:${locked?'not-allowed':'pointer'};
                 opacity:${locked?'0.3':'1'};transition:all 0.2s;min-width:240px;text-align:left;"
          onmouseover="if(!this.disabled)this.style.borderColor='#8b0000'"
          onmouseout="if(!this.disabled)this.style.borderColor='#1a0000'">
          NIGHT ${n}${suffix}
        </button>`;
    }

    el.innerHTML = `
      <div class="text-center select-none">
        <h2 style="font-family:'VT323',monospace;color:#8b0000;font-size:2rem;letter-spacing:0.15em;margin-bottom:2rem;">
          SELECT NIGHT
        </h2>
        <div style="display:flex;flex-direction:column;gap:0.5rem;align-items:center;">
          ${nightButtons}
        </div>
        <button id="btn-back-to-menu"
          style="font-family:'Share Tech Mono',monospace;color:#444;background:none;border:none;
                 font-size:0.65rem;margin-top:2rem;cursor:pointer;letter-spacing:0.1em;">
          ← BACK
        </button>
      </div>
    `;
    return el;
  }

  _buildHUDScreen() {
    const el = this._el('div', 'w-full h-full');
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <!-- Bottom HUD -->
      <div id="hud-bottom" style="position:absolute;bottom:0;left:0;right:0;
           display:flex;justify-content:space-between;align-items:flex-end;
           padding:12px 16px;pointer-events:none;">

        <!-- Power display (bottom-left) -->
        <div id="hud-power" style="font-family:'Share Tech Mono',monospace;color:#999;font-size:0.7rem;">
          <div style="color:#555;font-size:0.55rem;letter-spacing:0.1em;margin-bottom:2px;">POWER</div>
          <div id="power-value" style="color:#888;font-size:1.1rem;">100%</div>
          <div id="power-bars"  style="display:flex;gap:3px;margin-top:3px;"></div>
        </div>

        <!-- Night / time (bottom-center) -->
        <div id="hud-time" style="font-family:'VT323',monospace;color:#8b0000;font-size:1.8rem;
             text-align:center;letter-spacing:0.1em;text-shadow:0 0 12px #8b000060;">
          <div id="time-display">12 AM</div>
          <div style="font-family:'Share Tech Mono',monospace;color:#333;font-size:0.5rem;margin-top:-4px;">
            <span id="night-display">NIGHT 1</span>
          </div>
        </div>

        <!-- Camera button (bottom-right) -->
        <div id="hud-camera-btn"
             style="font-family:'Share Tech Mono',monospace;color:#888;font-size:0.6rem;
                    border:1px solid #1a1a1a;padding:6px 12px;cursor:pointer;pointer-events:auto;
                    letter-spacing:0.1em;transition:all 0.2s;"
             onmouseover="this.style.borderColor='#8b0000';this.style.color='#8b0000';"
             onmouseout="this.style.borderColor='#1a1a1a';this.style.color='#888';">
          [C] CAMERAS
        </div>
      </div>

      <!-- Notification area (top center) -->
      <div id="hud-notification" style="position:absolute;top:16px;left:50%;transform:translateX(-50%);
           font-family:'Share Tech Mono',monospace;font-size:0.6rem;color:#8b0000;
           letter-spacing:0.12em;opacity:0;transition:opacity 0.3s;pointer-events:none;">
      </div>

      <!-- Mobile touch controls -->
      <div id="touch-controls" style="display:none;"></div>
    `;

    // Wire camera button
    const camBtn = el.querySelector('#hud-camera-btn');
    camBtn.addEventListener('click', () => {
      if (CameraSystem.isCameraOpen) CameraSystem.closeCameraFeed();
      else CameraSystem.openCameraFeed();
    });

    this._hudEl = el;
    return el;
  }

  _buildCameraFeedScreen() {
    const el = this._el('div', 'w-full h-full flex flex-col items-center justify-center');
    el.style.cssText += '; background:rgba(0,0,0,0.88); pointer-events:auto;';
    el.innerHTML = `
      <!-- Camera feed frame -->
      <div id="cam-feed-frame" style="
        width:min(560px,90vw);
        aspect-ratio:4/3;
        border:1px solid #1a1a1a;
        background:#050507;
        position:relative;
        overflow:hidden;
      ">
        <!-- Static noise overlay -->
        <canvas id="cam-static" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.12;"></canvas>

        <!-- Camera label -->
        <div id="cam-label" style="
          position:absolute;top:8px;left:8px;
          font-family:'Share Tech Mono',monospace;font-size:0.55rem;
          color:#8b0000;letter-spacing:0.1em;
          text-shadow:0 0 6px #8b0000;">
          CAM 1A — SHOW STAGE
        </div>

        <!-- REC indicator -->
        <div id="cam-rec" style="
          position:absolute;top:8px;right:8px;
          font-family:'Share Tech Mono',monospace;font-size:0.5rem;
          color:#8b0000;display:flex;align-items:center;gap:4px;">
          <span style="width:5px;height:5px;border-radius:50%;background:#8b0000;
                       animation:blink 1s step-end infinite;"></span>
          REC
        </div>

        <!-- Feed (3D render target would go here in full impl) -->
        <div id="cam-feed-content" style="
          position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          font-family:'Share Tech Mono',monospace;color:#111;font-size:0.65rem;letter-spacing:0.05em;">
          FEED ACTIVE
        </div>
      </div>

      <!-- Camera selector grid -->
      <div id="cam-selector" style="
        display:flex;flex-wrap:wrap;gap:4px;justify-content:center;
        margin-top:12px;max-width:560px;
      "></div>

      <!-- Close button -->
      <div style="margin-top:12px;font-family:'Share Tech Mono',monospace;color:#333;font-size:0.55rem;
                  cursor:pointer;letter-spacing:0.1em;"
           id="cam-close-btn">
        [C / TAB] LOWER TABLET
      </div>
    `;

    this._buildCameraSelector(el);
    this._startCamStatic(el);

    el.querySelector('#cam-close-btn').addEventListener('click', () => {
      CameraSystem.closeCameraFeed();
      this.showScreen('hud');
    });

    this._camFeedEl = el;
    return el;
  }

  _buildCameraSelector(parentEl) {
    const selector = parentEl.querySelector('#cam-selector');
    const feeds = CameraSystem.getFeedIds();
    const labels = {
      cam1a:'1A',cam1b:'1B',cam1c:'1C',cam2a:'2A',cam2b:'2B',
      cam3:'3',cam4a:'4A',cam4b:'4B',cam5:'5',cam6:'6'
    };
    for (const id of feeds) {
      const btn = document.createElement('button');
      btn.dataset.feedId = id;
      btn.textContent    = `CAM ${labels[id] ?? id.toUpperCase()}`;
      btn.style.cssText  = `
        font-family:'Share Tech Mono',monospace;font-size:0.5rem;
        color:#444;background:none;border:1px solid #1a1a1a;
        padding:3px 8px;cursor:pointer;letter-spacing:0.05em;
        transition:all 0.15s;
      `;
      btn.addEventListener('mouseover', () => { btn.style.color='#8b0000'; btn.style.borderColor='#8b0000'; });
      btn.addEventListener('mouseout',  () => { btn.style.color='#444';    btn.style.borderColor='#1a1a1a'; });
      btn.addEventListener('click',     () => {
        CameraSystem.switchFeed(id);
        this._updateCameraLabel(id);
        selector.querySelectorAll('button').forEach(b => b.style.color = '#444');
        btn.style.color = '#8b0000';
      });
      selector.appendChild(btn);
    }
  }

  _buildDeathScreen() {
    const el = this._el('div', 'w-full h-full flex flex-col items-center justify-center');
    el.style.cssText += '; background:rgba(0,0,0,0.97);';
    el.innerHTML = `
      <div class="text-center select-none" style="animation:fadeInSlow 1.5s ease;">
        <div style="font-family:'VT323',monospace;color:#8b0000;font-size:4rem;
                    letter-spacing:0.2em;text-shadow:0 0 40px #8b0000;">
          GAME OVER
        </div>
        <p style="font-family:'Share Tech Mono',monospace;color:#333;font-size:0.65rem;
                  margin-top:0.5rem;letter-spacing:0.1em;">
          YOU DIDN'T SURVIVE THE NIGHT.
        </p>
        <div style="display:flex;gap:1rem;margin-top:3rem;justify-content:center;">
          <button id="btn-retry" class="menu-btn">TRY AGAIN</button>
          <button id="btn-death-menu" class="menu-btn menu-btn-secondary">MAIN MENU</button>
        </div>
      </div>
    `;
    return el;
  }

  _buildSurviveScreen() {
    const el = this._el('div', 'w-full h-full flex flex-col items-center justify-center');
    el.style.cssText += '; background:rgba(5,5,7,0.97);';
    el.innerHTML = `
      <div class="text-center select-none" style="animation:fadeInSlow 2s ease;">
        <div style="font-family:'VT323',monospace;color:#667755;font-size:5rem;
                    letter-spacing:0.3em;text-shadow:0 0 20px #66775540;">
          6 AM
        </div>
        <p style="font-family:'Share Tech Mono',monospace;color:#444;font-size:0.6rem;
                  margin-top:0.25rem;letter-spacing:0.15em;">
          YOU SURVIVED THE NIGHT.
        </p>
        <div style="display:flex;gap:1rem;margin-top:3rem;justify-content:center;">
          <button id="btn-next-night" class="menu-btn">NEXT NIGHT</button>
          <button id="btn-survive-menu" class="menu-btn menu-btn-secondary">MAIN MENU</button>
        </div>
      </div>
    `;
    return el;
  }

  _buildSettingsScreen() {
    const el = this._el('div', 'w-full h-full flex flex-col items-center justify-center');
    el.style.cssText += '; background:rgba(5,5,7,0.97);';
    el.innerHTML = `
      <div style="min-width:320px;max-width:480px;width:90%;">
        <h2 style="font-family:'VT323',monospace;color:#8b0000;font-size:2rem;
                   letter-spacing:0.15em;margin-bottom:1.5rem;text-align:center;">
          SYSTEM SETTINGS
        </h2>

        <!-- Volume controls -->
        ${this._buildSlider('masterVolume',   'MASTER VOLUME',   SettingsManager.get('masterVolume'))}
        ${this._buildSlider('musicVolume',    'MUSIC VOLUME',    SettingsManager.get('musicVolume'))}
        ${this._buildSlider('sfxVolume',      'SFX VOLUME',      SettingsManager.get('sfxVolume'))}
        ${this._buildSlider('ambienceVolume', 'AMBIENCE VOLUME', SettingsManager.get('ambienceVolume'))}

        <!-- Toggle options -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:1rem;">
          ${this._buildToggle('bloom',    'BLOOM',       SettingsManager.get('bloom') !== false)}
          ${this._buildToggle('filmGrain','FILM GRAIN',  SettingsManager.get('filmGrain') !== false)}
          ${this._buildToggle('crtEffect','CRT EFFECT',  SettingsManager.get('crtEffect') !== false)}
          ${this._buildToggle('vignette', 'VIGNETTE',    SettingsManager.get('vignette') !== false)}
          ${this._buildToggle('chromatic','CHROMATIC',   SettingsManager.get('chromatic') !== false)}
        </div>

        <!-- Quality preset -->
        <div style="margin-top:1rem;">
          <div style="font-family:'Share Tech Mono',monospace;color:#444;font-size:0.55rem;
                      letter-spacing:0.1em;margin-bottom:4px;">VISUAL QUALITY</div>
          <select id="select-quality" style="
            font-family:'Share Tech Mono',monospace;background:#0a0a0f;color:#888;
            border:1px solid #1a1a1a;padding:4px 8px;font-size:0.6rem;width:100%;cursor:pointer;">
            <option value="low">LOW</option>
            <option value="medium">MEDIUM</option>
            <option value="high" selected>HIGH</option>
            <option value="ultra">ULTRA</option>
          </select>
        </div>

        <div style="display:flex;gap:0.75rem;margin-top:1.5rem;justify-content:center;">
          <button id="btn-settings-back" class="menu-btn menu-btn-secondary">← BACK</button>
          <button id="btn-settings-reset" class="menu-btn menu-btn-secondary" style="color:#8b0000;">RESET</button>
        </div>
      </div>
    `;

    this._wireSettingsControls(el);
    return el;
  }

  // ── HUD updates ───────────────────────────────────────────

  _updateHUD(delta) {
    // Clock
    this._nightElapsed += delta;
    const hour = Math.min(6, Math.floor(this._nightElapsed / this._hourDuration));
    if (hour !== this._hour) {
      this._hour = hour;
      const display = document.getElementById('time-display');
      if (display) display.textContent = HOURS[hour] ?? '6 AM';
      if (hour === 6) {
        EventSystem.emit(Events.NIGHT_END_SURVIVE);
        return;
      }
      EventSystem.emit(Events.HOUR_CHANGED, { hour });
    }
  }

  _updatePowerHUD(power) {
    const powerEl = document.getElementById('power-value');
    const barsEl  = document.getElementById('power-bars');
    if (!powerEl || !barsEl) return;

    const pct = Math.max(0, Math.round(power));
    powerEl.textContent = `${pct}%`;

    const color = pct > 50 ? '#666' : pct > 25 ? '#b8860b' : '#8b0000';
    powerEl.style.color = color;

    // Usage bars
    const bars  = PowerSystem.usageBars;
    barsEl.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const bar = document.createElement('span');
      bar.style.cssText = `display:inline-block;width:6px;height:10px;
        background:${i <= bars ? color : '#111'};margin-right:1px;`;
      barsEl.appendChild(bar);
    }
  }

  _updateCameraLabel(feedId) {
    const label = document.getElementById('cam-label');
    if (!label) return;
    const names = {
      cam1a:'1A — SHOW STAGE', cam1b:'1B — DINING AREA', cam1c:'1C — PIRATE COVE',
      cam2a:'2A — WEST HALL',  cam2b:'2B — WEST HALL CORNER',
      cam3:'3 — SUPPLY CLOSET',cam4a:'4A — EAST HALL', cam4b:'4B — EAST HALL CORNER',
      cam5:'5 — BACKSTAGE',    cam6:'6 — KITCHEN',
    };
    label.textContent = `CAM ${names[feedId] ?? feedId.toUpperCase()}`;
  }

  showNotification(msg, duration = 3) {
    const el = document.getElementById('hud-notification');
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = '1';
    this._notificationTimer = duration;
  }

  _hideNotification() {
    const el = document.getElementById('hud-notification');
    if (el) el.style.opacity = '0';
  }

  // ── Camera static noise canvas ────────────────────────────

  _startCamStatic(parentEl) {
    const canvas = parentEl.querySelector('#cam-static');
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    canvas.width  = 140;
    canvas.height = 105;

    const tick = () => {
      const img = ctx2d.createImageData(140, 105);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 80 | 0;
        img.data[i] = img.data[i+1] = img.data[i+2] = v;
        img.data[i+3] = 255;
      }
      ctx2d.putImageData(img, 0, 0);
      requestAnimationFrame(tick);
    };
    tick();
  }

  // ── Event binding ─────────────────────────────────────────

  _bindEvents() {
    EventSystem.on(Events.POWER_CHANGED,   ({ power }) => this._updatePowerHUD(power));
    EventSystem.on(Events.CAMERA_OPENED,   ()          => this.showScreen('camera_feed'));
    EventSystem.on(Events.CAMERA_CLOSED,   ()          => this.showScreen('hud'));
    EventSystem.on(Events.CAMERA_SWITCHED, ({ feedId }) => this._updateCameraLabel(feedId));

    EventSystem.on(Events.POWER_DEPLETED, () => {
      this.showNotification('⚠ POWER OUTAGE', 99);
    });
    EventSystem.on(Events.NIGHT_START, ({ night }) => {
      this._night = night;
      this._nightElapsed = 0;
      this._hour = 0;
      const nd = document.getElementById('night-display');
      if (nd) nd.textContent = `NIGHT ${night}`;
    });

    // Menu button wiring (deferred to next tick so DOM is ready)
    setTimeout(() => this._wireMenuButtons(), 0);
  }

  _wireMenuButtons() {
    this._on('btn-play',         () => this.showScreen('night_select'));
    this._on('btn-settings',     () => this.showScreen('settings'));
    this._on('btn-back-to-menu', () => this.showScreen('menu'));
    this._on('btn-settings-back',() => this.showScreen('menu'));
    this._on('btn-retry',        () => {
      EventSystem.emit('game:retry');
    });
    this._on('btn-death-menu',   () => this.showScreen('menu'));
    this._on('btn-survive-menu', () => this.showScreen('menu'));
    this._on('btn-next-night',   () => {
      const nextNight = SaveSystem.get('currentNight') ?? 1;
      EventSystem.emit('game:start_night', { night: nextNight });
    });

    // Night select buttons
    const nightBtns = document.querySelectorAll('[data-night]');
    nightBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const n = parseInt(btn.dataset.night);
        EventSystem.emit('game:start_night', { night: n });
      });
    });

    // Wire game:start_night to GameEngine
    EventSystem.on('game:start_night', ({ night }) => {
      // Dispatch to GameEngine (imported to avoid circular dep)
      EventSystem.emit('__engine:start_night', { night });
    });
    EventSystem.on('game:retry', () => {
      EventSystem.emit('__engine:start_night', {
        night: SaveSystem.get('currentNight') ?? 1
      });
    });
  }

  // ── Settings controls ─────────────────────────────────────

  _wireSettingsControls(el) {
    // Sliders
    el.querySelectorAll('input[type=range]').forEach(input => {
      input.addEventListener('input', () => {
        SettingsManager.set(input.dataset.key, parseFloat(input.value));
      });
    });
    // Toggles
    el.querySelectorAll('input[type=checkbox]').forEach(input => {
      input.addEventListener('change', () => {
        SettingsManager.set(input.dataset.key, input.checked);
      });
    });
    // Quality select
    const sel = el.querySelector('#select-quality');
    if (sel) {
      sel.value = SettingsManager.get('quality') ?? 'high';
      sel.addEventListener('change', () => SettingsManager.set('quality', sel.value));
    }
    // Reset
    this._on('btn-settings-reset', () => {
      SettingsManager.reset();
      this.showScreen('settings');  // rebuild
    }, el);
  }

  // ── Mobile touch controls ─────────────────────────────────

  _detectMobile() {
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile) this._injectTouchControls();
  }

  _injectTouchControls() {
    const tc = document.getElementById('touch-controls');
    if (!tc) return;
    tc.style.display = 'block';
    tc.style.cssText = `
      display:flex;position:fixed;bottom:60px;left:0;right:0;
      justify-content:space-between;padding:0 12px;pointer-events:none;z-index:20;
    `;
    const makeBtn = (label, event) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = `
        font-family:'Share Tech Mono',monospace;font-size:0.55rem;
        color:#8b0000;background:rgba(0,0,0,0.5);border:1px solid #8b0000;
        padding:10px 16px;pointer-events:auto;letter-spacing:0.05em;user-select:none;
      `;
      b.addEventListener('touchstart', e => { e.preventDefault(); EventSystem.emit(event); }, { passive: false });
      return b;
    };

    const leftGroup  = document.createElement('div');
    const rightGroup = document.createElement('div');
    leftGroup.style.cssText = rightGroup.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

    leftGroup.append(
      makeBtn('DOOR ◀', 'input:touch:door_left'),
      makeBtn('LIGHT ◀', 'input:touch:light_left')
    );
    rightGroup.append(
      makeBtn('▶ DOOR', 'input:touch:door_right'),
      makeBtn('▶ LIGHT', 'input:touch:light_right')
    );

    const camBtn = makeBtn('[CAM]', 'input:touch:camera');
    camBtn.style.alignSelf = 'flex-end';

    tc.append(leftGroup, camBtn, rightGroup);
  }

  // ── HTML helpers ──────────────────────────────────────────

  _buildSlider(key, label, value) {
    return `
      <div style="margin-bottom:0.75rem;">
        <div style="display:flex;justify-content:space-between;
             font-family:'Share Tech Mono',monospace;color:#444;font-size:0.55rem;
             letter-spacing:0.08em;margin-bottom:2px;">
          <span>${label}</span>
          <span id="val-${key}">${Math.round(value * 100)}%</span>
        </div>
        <input type="range" data-key="${key}" min="0" max="1" step="0.01" value="${value}"
          style="width:100%;accent-color:#8b0000;background:#0a0a0f;height:2px;cursor:pointer;"
          oninput="document.getElementById('val-${key}').textContent=Math.round(this.value*100)+'%'">
      </div>
    `;
  }

  _buildToggle(key, label, checked) {
    return `
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;
             font-family:'Share Tech Mono',monospace;color:#444;font-size:0.55rem;letter-spacing:0.08em;">
        <input type="checkbox" data-key="${key}" ${checked?'checked':''} style="accent-color:#8b0000;">
        ${label}
      </label>
    `;
  }

  _el(tag, classes = '') {
    const el = document.createElement(tag);
    if (classes) el.className = classes;
    return el;
  }

  _on(id, handler, root = document) {
    const el = root.querySelector?.(`#${id}`) ?? document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  _injectMenuStyles() {
    if (document.getElementById('ui-menu-styles')) return;
    const style = document.createElement('style');
    style.id = 'ui-menu-styles';
    style.textContent = `
      .menu-btn {
        font-family:'Share Tech Mono',monospace;
        background:none;
        border:1px solid #3a0000;
        color:#8b0000;
        padding:10px 32px;
        font-size:0.7rem;
        letter-spacing:0.12em;
        cursor:pointer;
        transition:all 0.2s;
        min-width:200px;
      }
      .menu-btn:hover { background:#1a0000; border-color:#8b0000; box-shadow:0 0 12px #8b000040; }
      .menu-btn-secondary { color:#555; border-color:#1a1a1a; }
      .menu-btn-secondary:hover { color:#888; border-color:#333; box-shadow:none; }
      @keyframes fadeInSlow { from{opacity:0} to{opacity:1} }
      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    `;
    document.head.appendChild(style);
  }
}

export const UIManager = new UIManagerClass();
