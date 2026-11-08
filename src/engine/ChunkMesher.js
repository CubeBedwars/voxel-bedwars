/**
 * src/engine/ChunkMesher.js
 * 2D Greedy Face Quad Mesher & Culling Engine for Voxel Bedwars.
 *
 * Implements 6-direction cardinal face culling and coplanar 2D greedy quad merging.
 * Emits merged quads with quadSize [W, H], UV coordinates, and texture atlas rectangles,
 * achieving 70-85%+ geometry reduction over instanced individual cubes.
 */

import * as THREE from 'three';
import { CHUNK_SIZE } from './Chunk.js';
import { BLOCK_TYPES, BLOCK_PROPS } from './VoxelWorld.js';

// 6 Cardinal Directions: axis (0=X, 1=Y, 2=Z), sign (+1/-1), normal vector, name
const DIRECTIONS = [
  { axis: 0, sign:  1, name: '+X', normal: [ 1,  0,  0] },
  { axis: 0, sign: -1, name: '-X', normal: [-1,  0,  0] },
  { axis: 1, sign:  1, name: '+Y', normal: [ 0,  1,  0] },
  { axis: 1, sign: -1, name: '-Y', normal: [ 0, -1,  0] },
  { axis: 2, sign:  1, name: '+Z', normal: [ 0,  0,  1] },
  { axis: 2, sign: -1, name: '-Z', normal: [ 0,  0, -1] },
];

export class ChunkMesher {
  /**
   * @param {object} world - VoxelWorld instance
   * @param {object} atlas - TextureAtlas instance
   */
  constructor(world, atlas) {
    this.world = world;
    this.atlas = atlas;
    // Pre-allocated 16x16 mask buffer for 2D greedy sweeps
    this.mask = new Int32Array(CHUNK_SIZE * CHUNK_SIZE);
  }

  isSolid(type) {
    if (type === 0 || type === BLOCK_TYPES.AIR) return false;
    const prop = BLOCK_PROPS[type];
    return prop ? prop.solid : false;
  }

  isTransparent(type) {
    if (type === BLOCK_TYPES.GLASS) return true;
    const prop = BLOCK_PROPS[type];
    return prop ? !!prop.transparent : false;
  }

  /**
   * Face visibility rule:
   * A face on block bType facing nType is rendered if:
   * - bType is not AIR
   * - nType is AIR, or transparent (while bType is opaque), or nType is non-solid
   * - If both are glass, cull the interior face
   */
  isFaceVisible(bType, nType) {
    if (bType === 0 || bType === BLOCK_TYPES.AIR) return false;
    if (nType === 0 || nType === BLOCK_TYPES.AIR) return true;

    const bTrans = this.isTransparent(bType);
    const nTrans = this.isTransparent(nType);

    if (bTrans && nTrans) {
      // Adjacent transparent blocks cull shared internal face
      return false;
    }

    if (!bTrans && nTrans) {
      // Opaque block is visible through transparent neighbor (e.g. stone behind glass)
      return true;
    }

    // Both are opaque: if neighbor is solid, cull!
    return !this.isSolid(nType);
  }

  /**
   * Generates greedy-meshed geometry and Three.js meshes for a given chunk.
   * Updates chunk.mesh (opaque) and chunk.transparentMesh (transparent).
   * @param {Chunk} chunk
   * @returns {{ opaqueQuadCount: number, transparentQuadCount: number, totalQuads: number, geometryReduction: number }}
   */
  meshChunk(chunk) {
    if (!chunk || chunk.nonAirCount === 0) {
      // Chunk is empty: remove existing meshes
      chunk.dispose();
      chunk.dirty = false;
      return { opaqueQuadCount: 0, transparentQuadCount: 0, totalQuads: 0, geometryReduction: 0 };
    }

    const opaqueBuilder = { positions: [], normals: [], uvs: [], quadSizes: [], atlasRects: [], indices: [], vertCount: 0 };
    const transBuilder = { positions: [], normals: [], uvs: [], quadSizes: [], atlasRects: [], indices: [], vertCount: 0 };

    let totalRawFaces = 0;

    // Sweep across all 6 cardinal directions
    for (let d = 0; d < DIRECTIONS.length; d++) {
      const dir = DIRECTIONS[d];
      const { axis, sign, name, normal } = dir;

      // Slice through the 16 layers along normal axis
      for (let w = 0; w < CHUNK_SIZE; w++) {
        // Step 1: Populate 16x16 2D face visibility mask
        this.mask.fill(0);

        for (let v = 0; v < CHUNK_SIZE; v++) {
          for (let u = 0; u < CHUNK_SIZE; u++) {
            let lx, ly, lz;
            let nx, ny, nz;

            if (axis === 0) { // X-axis: w=X, u=Z, v=Y
              lx = w; ly = v; lz = u;
              nx = w + sign; ny = v; nz = u;
            } else if (axis === 1) { // Y-axis: w=Y, u=X, v=Z
              lx = u; ly = w; lz = v;
              nx = u; ny = w + sign; nz = v;
            } else { // Z-axis: w=Z, u=X, v=Y
              lx = u; ly = v; lz = w;
              nx = u; ny = v; nz = w + sign;
            }

            const bType = chunk.get(lx, ly, lz);
            if (bType !== 0) {
              const nType = chunk.get(nx, ny, nz);
              if (this.isFaceVisible(bType, nType)) {
                this.mask[v * CHUNK_SIZE + u] = bType;
                totalRawFaces++;
              }
            }
          }
        }

        // Step 2: 2D Greedy Quad Merging on the 16x16 mask
        for (let v = 0; v < CHUNK_SIZE; v++) {
          for (let u = 0; u < CHUNK_SIZE;) {
            const bType = this.mask[v * CHUNK_SIZE + u];
            if (bType === 0) {
              u++;
              continue;
            }

            // 2a. Determine quad width along u
            let width = 1;
            while (u + width < CHUNK_SIZE && this.mask[v * CHUNK_SIZE + (u + width)] === bType) {
              width++;
            }

            // 2b. Determine quad height along v where the entire width matches bType
            let height = 1;
            outerH: while (v + height < CHUNK_SIZE) {
              for (let k = 0; k < width; k++) {
                if (this.mask[(v + height) * CHUNK_SIZE + (u + k)] !== bType) {
                  break outerH;
                }
              }
              height++;
            }

            // 2c. Emit the merged quad
            const builder = this.isTransparent(bType) ? transBuilder : opaqueBuilder;
            this.emitQuad(builder, axis, sign, name, normal, w, u, v, width, height, bType);

            // 2d. Clear the merged region from mask
            for (let dv = 0; dv < height; dv++) {
              for (let du = 0; du < width; du++) {
                this.mask[(v + dv) * CHUNK_SIZE + (u + du)] = 0;
              }
            }

            u += width;
          }
        }
      }
    }

    // Step 3: Build Three.js Meshes
    const opaqueQuads = opaqueBuilder.vertCount / 4;
    const transQuads = transBuilder.vertCount / 4;
    const totalQuads = opaqueQuads + transQuads;

    // Apply or clean opaque mesh
    if (opaqueQuads > 0) {
      const geo = this.buildBufferGeometry(opaqueBuilder);
      if (!chunk.mesh) {
        const mat = this.atlas ? this.atlas.opaqueMaterial : new THREE.MeshLambertMaterial();
        chunk.mesh = new THREE.Mesh(geo, mat);
        chunk.mesh.castShadow = true;
        chunk.mesh.receiveShadow = true;
      } else {
        chunk.mesh.geometry.dispose();
        chunk.mesh.geometry = geo;
      }
      chunk.mesh.position.set(chunk.cx * CHUNK_SIZE, chunk.cy * CHUNK_SIZE, chunk.cz * CHUNK_SIZE);
      chunk.mesh.visible = true;
    } else if (chunk.mesh) {
      if (chunk.mesh.parent) chunk.mesh.parent.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      chunk.mesh = null;
    }

    // Apply or clean transparent mesh
    if (transQuads > 0) {
      const geo = this.buildBufferGeometry(transBuilder);
      if (!chunk.transparentMesh) {
        const mat = this.atlas ? this.atlas.transparentMaterial : new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.7 });
        chunk.transparentMesh = new THREE.Mesh(geo, mat);
      } else {
        chunk.transparentMesh.geometry.dispose();
        chunk.transparentMesh.geometry = geo;
      }
      chunk.transparentMesh.position.set(chunk.cx * CHUNK_SIZE, chunk.cy * CHUNK_SIZE, chunk.cz * CHUNK_SIZE);
      chunk.transparentMesh.visible = true;
    } else if (chunk.transparentMesh) {
      if (chunk.transparentMesh.parent) chunk.transparentMesh.parent.remove(chunk.transparentMesh);
      chunk.transparentMesh.geometry.dispose();
      chunk.transparentMesh.geometry = null;
    }

    chunk.dirty = false;

    const geometryReduction = totalRawFaces > 0 ? (1.0 - totalQuads / totalRawFaces) : 0;

    return {
      opaqueQuadCount: opaqueQuads,
      transparentQuadCount: transQuads,
      totalQuads,
      rawFaces: totalRawFaces,
      geometryReduction
    };
  }

  /**
   * Emits a single greedy merged quad (4 vertices, 2 triangles).
   */
  emitQuad(builder, axis, sign, name, normal, w, u, v, width, height, bType) {
    let p0, p1, p2, p3;

    // Compute the 4 vertices in chunk local coordinates [0..16]
    if (axis === 0) { // X-axis (w=X, u=Z, v=Y, width along Z, height along Y)
      if (sign > 0) { // +X face
        p0 = [w + 1, v,          u + width];
        p1 = [w + 1, v,          u];
        p2 = [w + 1, v + height, u];
        p3 = [w + 1, v + height, u + width];
      } else { // -X face
        p0 = [w,     v,          u];
        p1 = [w,     v,          u + width];
        p2 = [w,     v + height, u + width];
        p3 = [w,     v + height, u];
      }
    } else if (axis === 1) { // Y-axis (w=Y, u=X, v=Z, width along X, height along Z)
      if (sign > 0) { // +Y face (top)
        p0 = [u,         w + 1, v + height];
        p1 = [u + width, w + 1, v + height];
        p2 = [u + width, w + 1, v];
        p3 = [u,         w + 1, v];
      } else { // -Y face (bottom)
        p0 = [u,         w,     v];
        p1 = [u + width, w,     v];
        p2 = [u + width, w,     v + height];
        p3 = [u,         w,     v + height];
      }
    } else { // Z-axis (w=Z, u=X, v=Y, width along X, height along Y)
      if (sign > 0) { // +Z face (south)
        p0 = [u,         v,          w + 1];
        p1 = [u + width, v,          w + 1];
        p2 = [u + width, v + height, w + 1];
        p3 = [u,         v + height, w + 1];
      } else { // -Z face (north)
        p0 = [u + width, v,          w];
        p1 = [u,         v,          w];
        p2 = [u,         v + height, w];
        p3 = [u + width, v + height, w];
      }
    }

    const rect = this.atlas ? this.atlas.getAtlasRect(bType, name) : [0, 0, 1, 1];

    const baseIndex = builder.vertCount;

    // 4 Vertices
    builder.positions.push(
      ...p0,
      ...p1,
      ...p2,
      ...p3
    );

    for (let i = 0; i < 4; i++) {
      builder.normals.push(...normal);
      builder.quadSizes.push(width, height);
      builder.atlasRects.push(...rect);
    }

    // Local normalized UVs: [0,0], [1,0], [1,1], [0,1]
    builder.uvs.push(
      0, 0,
      1, 0,
      1, 1,
      0, 1
    );

    // 2 Triangles (CCW)
    builder.indices.push(
      baseIndex, baseIndex + 1, baseIndex + 2,
      baseIndex, baseIndex + 2, baseIndex + 3
    );

    builder.vertCount += 4;
  }

  /**
   * Assembles collected vertex arrays into a Three.js BufferGeometry.
   */
  buildBufferGeometry(builder) {
    const geo = new THREE.BufferGeometry();

    const posArray = new Float32Array(builder.positions);
    const normArray = new Float32Array(builder.normals);
    const uvArray = new Float32Array(builder.uvs);
    const quadSizeArray = new Float32Array(builder.quadSizes);
    const atlasRectArray = new Float32Array(builder.atlasRects);

    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normArray, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
    geo.setAttribute('aQuadSize', new THREE.BufferAttribute(quadSizeArray, 2));
    geo.setAttribute('aAtlasRect', new THREE.BufferAttribute(atlasRectArray, 4));

    if (builder.vertCount > 65535) {
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(builder.indices), 1));
    } else {
      geo.setIndex(new THREE.BufferAttribute(new Uint16Array(builder.indices), 1));
    }

    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    return geo;
  }
}
