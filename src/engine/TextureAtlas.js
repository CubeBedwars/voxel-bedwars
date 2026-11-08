/**
 * src/engine/TextureAtlas.js
 * Crisp 16x16 Texture Atlas & Nearest-Neighbor Material for Voxel Bedwars.
 *
 * Stitches authentic Minecraft / procedural 16x16 textures into a unified 256x256 atlas canvas,
 * configured with THREE.NearestFilter and zero mipmaps for sharp pixels.
 * Supplies custom shader onBeforeCompile hook enabling seamless UV tiling across greedy-merged quads.
 */

import * as THREE from 'three';
import { BLOCK_TYPES, BLOCK_PROPS } from './VoxelWorld.js';

export const ATLAS_GRID_SIZE = 16;
export const ATLAS_TILE_PIXELS = 16;
export const ATLAS_CANVAS_SIZE = 256;
export const UV_SPAN = 1.0 / ATLAS_GRID_SIZE; // 0.0625

export const TEXTURE_SLOTS = {
  // Base terrain
  'stone': 0,
  'dirt': 1,
  'grass_top': 2,
  'grass_side': 3,
  'wood': 4,
  'oak_planks': 4,
  'end_stone': 5,
  'obsidian': 6,
  'glass': 7,
  'bedrock': 8,

  // Wool colors (teams 9-16)
  'wool_white': 16,
  'wool_red': 17,
  'wool_blue': 18,
  'wool_green': 19,
  'wool_yellow': 20,
  'wool_aqua': 21,
  'wool_pink': 22,
  'wool_gray': 23,

  // Economy & Special
  'lucky_block': 32,
  'diamond_block': 33,
  'emerald_block': 34,
  'gold_block': 35,
  'iron_block': 36,

  // Multi-face special blocks
  'bed_head_top': 48,
  'bed_head_side': 49,
  'bed_head_end': 50,
  'bed_head_bottom': 4, // oak planks
  'bed_foot_top': 51,
  'bed_foot_side': 52,
  'bed_foot_end': 53,
  'bed_foot_bottom': 4, // oak planks
  'tnt_top': 54,
  'tnt_bottom': 55,
  'tnt_side': 56,

  // Ores
  'iron_ore': 64,
  'gold_ore': 65,
  'diamond_ore': 66,
  'emerald_ore': 67,
};

export class TextureAtlas {
  /**
   * @param {object} [texGen] - Optional TextureGenerator instance
   */
  constructor(texGen = null) {
    this.texGen = texGen;
    this.canvas = null;
    this.texture = null;
    this.opaqueMaterial = null;
    this.transparentMaterial = null;
    this.rectCache = new Map();

    this.initAtlas();
  }

  initAtlas() {
    // 1. Create 256x256 canvas safely
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      try {
        this.canvas = document.createElement('canvas');
        this.canvas.width = ATLAS_CANVAS_SIZE;
        this.canvas.height = ATLAS_CANVAS_SIZE;
        const ctx = this.canvas.getContext('2d');

        if (ctx) {
          this._stitchTextures(ctx);
        }
      } catch {
        // Fallback gracefully in restricted headless environments
        this.canvas = null;
      }
    }

    // 2. Wrap into THREE.CanvasTexture or THREE.Texture
    if (this.canvas) {
      this.texture = new THREE.CanvasTexture(this.canvas);
    } else {
      this.texture = new THREE.Texture();
    }

    // Crisp pixel art filtering: zero mipmaps, nearest neighbor
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;

    // 3. Materials
    this.opaqueMaterial = this.createChunkMaterial({ transparent: false });
    this.transparentMaterial = this.createChunkMaterial({ transparent: true });
  }

  _stitchTextures(ctx) {
    if (!this.texGen) return;

    for (const [key, slot] of Object.entries(TEXTURE_SLOTS)) {
      const col = slot % ATLAS_GRID_SIZE;
      const row = Math.floor(slot / ATLAS_GRID_SIZE);
      const dx = col * ATLAS_TILE_PIXELS;
      const dy = row * ATLAS_TILE_PIXELS;

      let subTex = null;
      if (key === 'grass_top') subTex = this.texGen.getTexture('grass', 'top');
      else if (key === 'grass_side') subTex = this.texGen.getTexture('grass', 'side');
      else if (key.startsWith('bed_head')) subTex = this.texGen.getTexture('bed_head', key.replace('bed_head_', ''));
      else if (key.startsWith('bed_foot')) subTex = this.texGen.getTexture('bed_foot', key.replace('bed_foot_', ''));
      else if (key.startsWith('tnt_')) subTex = this.texGen.getTexture('tnt', key.replace('tnt_', ''));
      else subTex = this.texGen.getTexture(key);

      if (subTex && subTex.image && typeof ctx.drawImage === 'function') {
        try {
          ctx.drawImage(subTex.image, dx, dy, ATLAS_TILE_PIXELS, ATLAS_TILE_PIXELS);
        } catch {
          // Fallback if drawImage fails
        }
      }
    }
  }

  /**
   * Returns [uMin, vMin, uSpan, vSpan] for given blockType and face direction.
   * @param {number} blockType - Block ID
   * @param {string} face - '+X', '-X', '+Y', '-Y', '+Z', '-Z', 'top', 'bottom', 'side'
   * @returns {number[]} [u0, v0, uSpan, vSpan]
   */
  getAtlasRect(blockType, face = '+Y') {
    const cacheKey = `${blockType}:${face}`;
    if (this.rectCache.has(cacheKey)) {
      return this.rectCache.get(cacheKey);
    }

    let texKey = 'stone';

    if (blockType === BLOCK_TYPES.GRASS) {
      if (face === '+Y' || face === 'top') texKey = 'grass_top';
      else if (face === '-Y' || face === 'bottom') texKey = 'dirt';
      else texKey = 'grass_side';
    } else if (blockType === BLOCK_TYPES.BED_HEAD) {
      if (face === '+Y' || face === 'top') texKey = 'bed_head_top';
      else if (face === '-Y' || face === 'bottom') texKey = 'bed_head_bottom';
      else if (face === '-Z' || face === 'north' || face === 'front') texKey = 'bed_head_end';
      else texKey = 'bed_head_side';
    } else if (blockType === BLOCK_TYPES.BED_FOOT) {
      if (face === '+Y' || face === 'top') texKey = 'bed_foot_top';
      else if (face === '-Y' || face === 'bottom') texKey = 'bed_foot_bottom';
      else if (face === '+Z' || face === 'south' || face === 'front') texKey = 'bed_foot_end';
      else texKey = 'bed_foot_side';
    } else if (blockType === BLOCK_TYPES.TNT) {
      if (face === '+Y' || face === 'top') texKey = 'tnt_top';
      else if (face === '-Y' || face === 'bottom') texKey = 'tnt_bottom';
      else texKey = 'tnt_side';
    } else {
      const prop = BLOCK_PROPS[blockType];
      texKey = prop?.tex || 'stone';
    }

    const slot = TEXTURE_SLOTS[texKey] ?? 0;
    const col = slot % ATLAS_GRID_SIZE;
    const row = Math.floor(slot / ATLAS_GRID_SIZE);

    const u = col * UV_SPAN;
    // In WebGL texture coordinates, V=0 is bottom, V=1 is top
    const v = 1.0 - (row + 1) * UV_SPAN;
    const rect = [u, v, UV_SPAN, UV_SPAN];

    this.rectCache.set(cacheKey, rect);
    return rect;
  }

  /**
   * Creates a Chunk material with custom onBeforeCompile shader hook
   * that seamlessly tiles textures over multi-block greedy quads.
   */
  createChunkMaterial({ transparent = false } = {}) {
    const mat = new THREE.MeshLambertMaterial({
      map: this.texture,
      transparent: transparent,
      opacity: transparent ? 0.7 : 1.0,
      side: THREE.FrontSide,
    });

    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
attribute vec4 aAtlasRect;
attribute vec2 aQuadSize;
varying vec4 vAtlasRect;
varying vec2 vTiledUV;`
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
vAtlasRect = aAtlasRect;
vTiledUV = uv * aQuadSize;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
varying vec4 vAtlasRect;
varying vec2 vTiledUV;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
  vec2 localUV = fract(vTiledUV);
  vec2 atlasUV = vAtlasRect.xy + localUV * vAtlasRect.zw;
  vec4 sampledDiffuseColor = texture2D( map, atlasUV );
  diffuseColor *= sampledDiffuseColor;
#endif`
      );
    };

    return mat;
  }
}
