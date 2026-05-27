/**
 * @fileoverview Builds and manages the 3D environment.
 * Procedurally constructs the security office, hallways, and atmosphere.
 * All geometry, lighting and materials are defined here.
 */

import * as THREE from 'three';
import { GameConfig }           from '../config/GameConfig.js';
import { EventSystem, Events }  from '../core/EventSystem.js';
import { RendererManager }      from './RendererManager.js';

// ── Material helpers ─────────────────────────────────────────────────────────

function darkMat(hex, roughness = 0.9, metalness = 0.1) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness, metalness });
}

function emissiveMat(hex, emissive, intensity = 0.4) {
  return new THREE.MeshStandardMaterial({
    color: hex, emissive, emissiveIntensity: intensity,
    roughness: 0.8, metalness: 0.0,
  });
}

class SceneManagerClass {
  constructor() {
    /** @type {THREE.Scene|null} */
    this.scene = null;

    /** @type {THREE.PointLight[]} flicker-capable lights */
    this._flickerLights = [];

    /** @type {THREE.Group} office group for transforms */
    this._office = null;

    /** @type {boolean} */
    this._blackout = false;

    // Flicker state
    this._flickerTimer     = 0;
    this._flickerInterval  = 6000;
    this._flickerActive    = false;
    this._flickerDuration  = 0;

    // Reusable vectors — avoids GC pressure
    this._v3 = new THREE.Vector3();
  }

  async init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(GameConfig.FOG_COLOR);
    this.scene.fog = new THREE.FogExp2(GameConfig.FOG_COLOR, 0.12);

    this._buildOffice();
    this._buildHallways();
    this._buildLighting();
    this._buildAtmosphericDetails();
  }

  update(delta, elapsed) {
    if (this._blackout) return;
    this._updateFlicker(delta, elapsed);
  }

  /** Initiate power-out blackout sequence */
  triggerBlackout() {
    this._blackout = true;
    for (const light of this._flickerLights) {
      light.intensity = 0;
    }
    this.scene.fog = new THREE.FogExp2(0x000000, 0.25);
    EventSystem.emit(Events.LIGHT_FLICKER, { type: 'blackout' });
  }

  restoreFromBlackout() {
    this._blackout = false;
    for (const light of this._flickerLights) {
      light.intensity = light.userData.baseIntensity;
    }
    this.scene.fog = new THREE.FogExp2(GameConfig.FOG_COLOR, 0.12);
  }

  // ── Scene construction ────────────────────────────────────

  _buildOffice() {
    this._office = new THREE.Group();
    this._office.name = 'office';
    this.scene.add(this._office);

    const roomW = 6, roomH = 3.2, roomD = 5;

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW, roomD),
      darkMat(0x111114, 0.95, 0.0)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._office.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW, roomD),
      darkMat(0x0a0a0e, 0.99, 0.0)
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = roomH;
    this._office.add(ceiling);

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW, roomH),
      darkMat(0x0d0d12, 0.9, 0.05)
    );
    backWall.position.set(0, roomH / 2, -roomD / 2);
    backWall.receiveShadow = true;
    this._office.add(backWall);

    // Left/right walls
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(roomD, roomH),
        darkMat(0x0c0c11, 0.9, 0.05)
      );
      wall.position.set(side * roomW / 2, roomH / 2, 0);
      wall.rotation.y = side * Math.PI / 2;
      wall.receiveShadow = true;
      this._office.add(wall);
    }

    // Desk
    this._buildDesk();

    // Posters / wall décor
    this._buildWallDecor();
  }

  _buildDesk() {
    const deskMat = darkMat(0x1a1008, 0.85, 0.1);

    // Desk surface
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.06, 0.9), deskMat);
    top.position.set(0, 0.75, 1.2);
    top.castShadow = top.receiveShadow = true;
    this._office.add(top);

    // Desk body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.75, 0.85), deskMat);
    body.position.set(0, 0.375, 1.2);
    body.castShadow = body.receiveShadow = true;
    this._office.add(body);

    // Fan (simple cylinder)
    const fanBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 0.3, 8),
      darkMat(0x1a1a1a, 0.7, 0.5)
    );
    fanBase.position.set(-0.8, 0.9, 1.2);
    this._office.add(fanBase);

    // Monitor screen — emissive blue-green glow
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.45, 0.04),
      emissiveMat(0x0a1520, 0x1a4060, 0.5)
    );
    screen.position.set(0.2, 1.05, 1.05);
    this._office.add(screen);
    this._screen = screen;
  }

  _buildWallDecor() {
    // "CELEBRATE" poster placeholder (emissive rectangle)
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.55),
      emissiveMat(0x200808, 0x5a0000, 0.15)
    );
    poster.position.set(1.2, 1.6, -2.49);
    this._office.add(poster);

    // Metal shelving
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.04, 0.25),
      darkMat(0x151518, 0.7, 0.4)
    );
    shelf.position.set(-2.0, 2.0, -2.0);
    shelf.receiveShadow = true;
    this._office.add(shelf);
  }

  _buildHallways() {
    // Left hallway (Bonnie approach corridor)
    this._buildCorridor(-4.5, 0, 0, 0, 'corridor_left');
    // Right hallway (Chica approach corridor)
    this._buildCorridor(4.5, 0, 0, Math.PI, 'corridor_right');
    // Pirate Cove curtain (visible through left window area)
    this._buildCoveCurtain();
  }

  _buildCorridor(x, y, z, rotY, name) {
    const group = new THREE.Group();
    group.name  = name;
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    this.scene.add(group);

    const ceilMat  = darkMat(0x080808, 0.99);
    const wallMat  = darkMat(0x0c0c0f, 0.92, 0.03);
    const floorMat = darkMat(0x0a0a0d, 0.95);

    // corridor geometry: 1.8w × 2.8h × 5d
    const w = 1.8, h = 2.8, d = 5;

    // floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    // ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = h;
    group.add(ceil);

    // side walls
    for (const s of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMat);
      wall.position.set(s * w / 2, h / 2, 0);
      wall.rotation.y = s * Math.PI / 2;
      wall.receiveShadow = true;
      group.add(wall);
    }

    // Dim flickering corridor light
    const light = new THREE.PointLight(0x2a1a0a, 0.8, 6);
    light.position.set(0, h - 0.3, 0);
    light.castShadow = false;  // Corridor lights don't cast to save GPU
    light.userData.baseIntensity = 0.8;
    light.userData.flickerSpeed  = 0.5 + Math.random() * 0.5;
    this._flickerLights.push(light);
    group.add(light);
  }

  _buildCoveCurtain() {
    const curtain = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 2.6),
      emissiveMat(0x1a0000, 0x3d0000, 0.08)
    );
    curtain.position.set(-3.0, 1.3, -2.0);
    curtain.rotation.y = Math.PI / 8;
    this.scene.add(curtain);
  }

  _buildLighting() {
    // Ultra-dim ambient — the scene is supposed to feel dark
    const ambient = new THREE.AmbientLight(0x05050a, GameConfig.AMBIENT_INTENSITY);
    this.scene.add(ambient);

    // Main office overhead fluorescent (flickers)
    const overhead = new THREE.PointLight(0x8090a0, 1.2, 8, 2);
    overhead.position.set(0, 2.9, 0);
    overhead.castShadow = true;
    overhead.shadow.mapSize.set(
      RendererManager.shadowMapSize,
      RendererManager.shadowMapSize
    );
    overhead.shadow.bias   = -0.001;
    overhead.shadow.radius = 3;
    overhead.userData.baseIntensity = 1.2;
    overhead.userData.flickerSpeed  = 1.0;
    overhead.userData.isMain        = true;
    this._flickerLights.push(overhead);
    this._mainLight = overhead;
    this.scene.add(overhead);

    // Monitor glow — very subtle blue-green fill
    const monitorGlow = new THREE.PointLight(0x1a4060, 0.3, 2.5, 2);
    monitorGlow.position.set(0.2, 1.1, 1.2);
    this.scene.add(monitorGlow);

    // Emergency red indicator LED (near fan)
    const indicator = new THREE.PointLight(0x8b0000, 0.15, 1.0, 2);
    indicator.position.set(-0.8, 0.95, 1.3);
    this.scene.add(indicator);
  }

  _buildAtmosphericDetails() {
    // Scattered debris/cans on floor
    const debrisMat = darkMat(0x202018, 0.8, 0.3);
    const positions = [
      [-1.5, 0.04, 0.5], [0.8, 0.04, 1.8], [2.3, 0.04, -0.4]
    ];
    for (const [x, y, z] of positions) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8), debrisMat);
      can.position.set(x, y, z);
      can.rotation.z = Math.random() * 0.6 - 0.3;
      this._office.add(can);
    }
  }

  // ── Flickering system ─────────────────────────────────────

  _updateFlicker(delta, elapsed) {
    this._flickerTimer += delta * 1000;

    if (!this._flickerActive && this._flickerTimer > this._flickerInterval) {
      this._startFlicker();
      this._flickerTimer = 0;
      this._flickerInterval = GameConfig.FLICKER_INTERVAL_MS[0]
        + Math.random() * (GameConfig.FLICKER_INTERVAL_MS[1] - GameConfig.FLICKER_INTERVAL_MS[0]);
    }

    if (this._flickerActive) {
      this._flickerDuration -= delta * 1000;
      for (const light of this._flickerLights) {
        const noise = Math.sin(elapsed * light.userData.flickerSpeed * 40) * 0.5 + 0.5;
        const flicker = 0.3 + noise * 0.7;
        light.intensity = light.userData.baseIntensity * flicker;
      }
      if (this._flickerDuration <= 0) {
        this._endFlicker();
      }
    }
  }

  _startFlicker() {
    this._flickerActive   = true;
    this._flickerDuration = 200 + Math.random() * 800;  // 200–1000 ms
    EventSystem.emit(Events.LIGHT_FLICKER, { type: 'flicker' });
  }

  _endFlicker() {
    this._flickerActive = false;
    for (const light of this._flickerLights) {
      light.intensity = light.userData.baseIntensity;
    }
  }
}

export const SceneManager = new SceneManagerClass();
