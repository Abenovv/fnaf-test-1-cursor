/**
 * @fileoverview Developer debug overlay.
 * Toggled with F3. Shows:
 *   - FPS / frame time
 *   - AI locations and aggression levels
 *   - Power state
 *   - Event log (last 8 events)
 *   - Camera state
 *   - Renderer stats (draw calls, triangles)
 */

import { EventSystem, Events } from '../core/EventSystem.js';
import { AIController }        from '../gameplay/AIController.js';
import { PowerSystem }         from '../gameplay/PowerSystem.js';
import { CameraSystem }        from '../rendering/CameraSystem.js';
import { RendererManager }     from '../rendering/RendererManager.js';

class DebugOverlayClass {
  constructor() {
    this._el       = null;
    this._visible  = false;
    this._perfData = { fps: 0, avgFrameMs: '0', gcSpikes: 0 };
    this._eventLog = [];
    this._maxLog   = 8;
    this._updateTimer = 0;
    this._updateRate  = 0.1;  // update 10×/sec
  }

  init() {
    this._el = document.getElementById('debug-overlay');
    if (!this._el) return;

    EventSystem.on(Events.PERF_REPORT, data => { this._perfData = data; });

    // Log key events
    const trackedEvents = [
      Events.AI_MOVED, Events.AI_ATTACK, Events.POWER_CHANGED,
      Events.CAMERA_SWITCHED, Events.LIGHT_FLICKER, Events.JUMPSCARE,
      Events.HALLUCINATION_START, Events.AMBIENT_EVENT,
    ];
    for (const evt of trackedEvents) {
      EventSystem.on(evt, data => this._logEvent(evt, data));
    }
  }

  setVisible(visible) {
    this._visible = visible;
    if (this._el) this._el.classList.toggle('visible', visible);
  }

  update(delta) {
    if (!this._visible || !this._el) return;
    this._updateTimer += delta;
    if (this._updateTimer < this._updateRate) return;
    this._updateTimer = 0;
    this._render();
  }

  _render() {
    const ai       = AIController.getAll();
    const renderer = RendererManager.renderer;

    const fpsColor = this._perfData.fps >= 55 ? '#00ff00'
                   : this._perfData.fps >= 30 ? '#ffaa00'
                   : '#ff0000';

    const aiRows = ai.map(a => `
      <span style="color:#888">${a.id.padEnd(7)}</span>
      <span style="color:#aaa">${a.location.padEnd(14)}</span>
      <span style="color:#ff6400">AI:${a.aiLevel}</span>
    `).join('<br>');

    const logLines = this._eventLog.map(({ evt, ts }) =>
      `<span style="color:#444">${ts}</span> <span style="color:#666">${evt}</span>`
    ).join('<br>');

    const info = renderer?.info;

    this._el.innerHTML = `
      <div><span style="color:${fpsColor};font-weight:bold;">${this._perfData.fps} FPS</span>
       &nbsp;<span style="color:#555">${this._perfData.avgFrameMs}ms avg</span>
       &nbsp;<span style="color:#553333">GC:${this._perfData.gcSpikes}</span></div>
      <hr style="border-color:#1a1a1a;margin:4px 0;">
      <div style="color:#444;font-size:10px;margin-bottom:2px;">ANIMATRONICS</div>
      <div style="font-size:10px;line-height:1.8;">${aiRows}</div>
      <hr style="border-color:#1a1a1a;margin:4px 0;">
      <div style="font-size:10px;">
        <span style="color:#555">POWER</span>
        <span style="color:#888"> ${Math.round(PowerSystem.power)}%</span>
        &nbsp;|&nbsp;
        <span style="color:#555">CAM</span>
        <span style="color:#888"> ${CameraSystem.isCameraOpen ? CameraSystem.activeFeedId : 'OFF'}</span>
      </div>
      ${info ? `
      <hr style="border-color:#1a1a1a;margin:4px 0;">
      <div style="font-size:10px;color:#444;">
        DRAWS: <span style="color:#666">${info.render?.calls ?? 0}</span>
        &nbsp;TRIS: <span style="color:#666">${(info.render?.triangles ?? 0).toLocaleString()}</span>
        &nbsp;TEX: <span style="color:#666">${info.memory?.textures ?? 0}</span>
      </div>` : ''}
      <hr style="border-color:#1a1a1a;margin:4px 0;">
      <div style="color:#444;font-size:10px;margin-bottom:2px;">EVENTS</div>
      <div style="font-size:10px;line-height:1.7;">${logLines}</div>
      <div style="color:#222;font-size:9px;margin-top:4px;">[F3] TOGGLE DEBUG</div>
    `;
  }

  _logEvent(evt, data) {
    const short = evt.replace(/^[^:]+:/, '').substring(0, 20);
    const ts    = new Date().toLocaleTimeString('en', { hour12: false });
    this._eventLog.unshift({ evt: short, ts });
    if (this._eventLog.length > this._maxLog) this._eventLog.pop();
  }
}

export const DebugOverlay = new DebugOverlayClass();
