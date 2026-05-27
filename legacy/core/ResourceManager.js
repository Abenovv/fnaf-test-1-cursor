/**
 * @fileoverview Centralized asset loader with progress tracking, caching,
 * and lazy-loading support. Handles textures, audio buffers, JSON data,
 * and GLTF/GLB models via Three.js loaders.
 */

import * as THREE from 'three';
import { EventSystem, Events } from './EventSystem.js';

/** @enum {string} */
export const AssetType = Object.freeze({
  TEXTURE:  'texture',
  AUDIO:    'audio',
  MODEL:    'model',
  JSON:     'json',
  FONT:     'font',
});

/**
 * @typedef {Object} AssetDescriptor
 * @property {string}   id      - Unique key for cache lookup
 * @property {string}   url     - Relative or absolute URL
 * @property {AssetType} type
 * @property {boolean}  [lazy]  - If true, not loaded in initial batch
 */

class ResourceManagerClass {
  constructor() {
    /** @type {Map<string, any>} */
    this._cache   = new Map();

    /** @type {Map<string, Promise<any>>} */
    this._pending = new Map();

    this._textureLoader = new THREE.TextureLoader();
    this._total   = 0;
    this._loaded  = 0;
  }

  /**
   * Preload an array of asset descriptors and report progress.
   * @param {AssetDescriptor[]} assets
   * @param {Function} [onProgress]  callback(fraction 0–1, status string)
   * @returns {Promise<void>}
   */
  async preload(assets, onProgress) {
    const toLoad = assets.filter(a => !a.lazy && !this._cache.has(a.id));
    this._total  = toLoad.length;
    this._loaded = 0;

    if (this._total === 0) { onProgress?.(1, 'READY'); return; }

    const promises = toLoad.map(async (desc) => {
      try {
        await this._load(desc);
      } catch (err) {
        console.warn(`[ResourceManager] Failed to load "${desc.id}":`, err);
      }
      this._loaded++;
      onProgress?.(this._loaded / this._total, `LOADING ${desc.id}`);
    });

    await Promise.all(promises);
    onProgress?.(1, 'READY');
  }

  /**
   * Get a cached asset synchronously.
   * @param {string} id
   * @returns {*}
   */
  get(id) {
    return this._cache.get(id) ?? null;
  }

  /**
   * Lazily load a single asset on demand. Returns cached result if available.
   * @param {AssetDescriptor} desc
   * @returns {Promise<*>}
   */
  async demand(desc) {
    if (this._cache.has(desc.id))   return this._cache.get(desc.id);
    if (this._pending.has(desc.id)) return this._pending.get(desc.id);
    return this._load(desc);
  }

  /**
   * Release a cached asset to free memory.
   * @param {string} id
   */
  release(id) {
    const asset = this._cache.get(id);
    if (!asset) return;
    // Dispose Three.js objects
    if (asset.isTexture) asset.dispose();
    if (asset.isBufferGeometry) asset.dispose();
    if (asset.isMaterial) asset.dispose();
    this._cache.delete(id);
  }

  // ── Private ───────────────────────────────────────────────

  /**
   * @param {AssetDescriptor} desc
   * @returns {Promise<*>}
   */
  _load(desc) {
    const promise = this._fetchAsset(desc).then(asset => {
      this._cache.set(desc.id, asset);
      this._pending.delete(desc.id);
      return asset;
    });
    this._pending.set(desc.id, promise);
    return promise;
  }

  /** @param {AssetDescriptor} desc */
  async _fetchAsset(desc) {
    switch (desc.type) {

      case AssetType.TEXTURE:
        return new Promise((resolve, reject) => {
          this._textureLoader.load(
            desc.url,
            tex => {
              tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
              tex.anisotropy = 4;
              resolve(tex);
            },
            undefined,
            reject
          );
        });

      case AssetType.AUDIO: {
        const response = await fetch(desc.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      }

      case AssetType.JSON: {
        const response = await fetch(desc.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      }

      case AssetType.MODEL: {
        // Dynamically import GLTFLoader only when models are needed
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();
        return new Promise((resolve, reject) => loader.load(desc.url, resolve, undefined, reject));
      }

      default:
        return fetch(desc.url).then(r => r.text());
    }
  }
}

export const ResourceManager = new ResourceManagerClass();
