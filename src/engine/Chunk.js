/**
 * src/engine/Chunk.js
 * 16x16x16 Chunk Voxel Storage for Voxel Bedwars.
 *
 * Implements flat Uint8Array(4096) local voxel storage with bitwise coordinate indexing,
 * boundary neighbor invalidation, and dirty state management.
 */

export const CHUNK_SIZE = 16;
export const CHUNK_SIZE_SQ = 256;
export const CHUNK_SIZE_CB = 4096;

/**
 * Fast bitwise coordinate indexing inside a 16x16x16 chunk.
 * lx: 0..15, ly: 0..15, lz: 0..15 -> 0..4095
 */
export function getVoxelIndex(lx, ly, lz) {
  return (lx & 15) | ((ly & 15) << 4) | ((lz & 15) << 8);
}

/**
 * Formats chunk coordinates into standard key: "cx,cy,cz"
 */
export function getChunkKey(cx, cy, cz) {
  return `${cx},${cy},${cz}`;
}

/**
 * Converts world block coordinate to chunk coordinate.
 */
export function worldToChunkCoord(v) {
  return Math.floor(v / CHUNK_SIZE);
}

/**
 * Converts world block coordinate to chunk-local coordinate [0..15].
 */
export function worldToLocalCoord(v) {
  return ((v % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
}

export class Chunk {
  /**
   * @param {number} cx - Chunk X coordinate
   * @param {number} cy - Chunk Y coordinate
   * @param {number} cz - Chunk Z coordinate
   * @param {object} [world] - Reference to parent VoxelWorld
   */
  constructor(cx, cy, cz, world = null) {
    this.cx = cx;
    this.cy = cy;
    this.cz = cz;
    this.key = getChunkKey(cx, cy, cz);
    this.world = world;

    // Flat voxel storage: 4096 bytes per chunk
    this.voxels = new Uint8Array(CHUNK_SIZE_CB);
    this.nonAirCount = 0;
    this.dirty = true;

    // Three.js meshes associated with this chunk
    this.mesh = null;
    this.transparentMesh = null;
  }

  /**
   * Get voxel type at local coordinates (0..15).
   * If out of local chunk bounds, queries parent world if available.
   */
  get(lx, ly, lz) {
    if (lx < 0 || lx >= CHUNK_SIZE ||
        ly < 0 || ly >= CHUNK_SIZE ||
        lz < 0 || lz >= CHUNK_SIZE) {
      if (this.world) {
        return this.world.getBlock(
          this.cx * CHUNK_SIZE + lx,
          this.cy * CHUNK_SIZE + ly,
          this.cz * CHUNK_SIZE + lz
        );
      }
      return 0; // AIR
    }
    const idx = getVoxelIndex(lx, ly, lz);
    return this.voxels[idx];
  }

  /**
   * Set voxel type at local coordinates (0..15).
   * Updates nonAirCount, marks this chunk dirty, and invalidates boundary neighbors.
   */
  set(lx, ly, lz, type) {
    if (lx < 0 || lx >= CHUNK_SIZE ||
        ly < 0 || ly >= CHUNK_SIZE ||
        lz < 0 || lz >= CHUNK_SIZE) {
      if (this.world) {
        return this.world.setBlock(
          this.cx * CHUNK_SIZE + lx,
          this.cy * CHUNK_SIZE + ly,
          this.cz * CHUNK_SIZE + lz,
          type
        );
      }
      return;
    }

    const idx = getVoxelIndex(lx, ly, lz);
    const prevType = this.voxels[idx];
    if (prevType === type) return;

    this.voxels[idx] = type;

    if (prevType === 0 && type !== 0) {
      this.nonAirCount++;
    } else if (prevType !== 0 && type === 0) {
      this.nonAirCount = Math.max(0, this.nonAirCount - 1);
    }

    this.dirty = true;
    if (this.world && typeof this.world.markChunkDirty === 'function') {
      this.world.markChunkDirty(this);
    }

    // Invalidate neighboring chunks if on boundaries
    if (this.world && typeof this.world.markNeighborChunkDirty === 'function') {
      if (lx === 0) this.world.markNeighborChunkDirty(this.cx - 1, this.cy, this.cz);
      if (lx === CHUNK_SIZE - 1) this.world.markNeighborChunkDirty(this.cx + 1, this.cy, this.cz);
      if (ly === 0) this.world.markNeighborChunkDirty(this.cx, this.cy - 1, this.cz);
      if (ly === CHUNK_SIZE - 1) this.world.markNeighborChunkDirty(this.cx, this.cy + 1, this.cz);
      if (lz === 0) this.world.markNeighborChunkDirty(this.cx, this.cy, this.cz - 1);
      if (lz === CHUNK_SIZE - 1) this.world.markNeighborChunkDirty(this.cx, this.cy, this.cz + 1);
    }
  }

  /**
   * Check if local voxel is solid
   */
  isSolid(lx, ly, lz) {
    const type = this.get(lx, ly, lz);
    if (type === 0) return false;
    if (this.world && typeof this.world.isBlockTypeSolid === 'function') {
      return this.world.isBlockTypeSolid(type);
    }
    return type !== 0;
  }

  /**
   * Clear all voxels in chunk
   */
  clear() {
    this.voxels.fill(0);
    this.nonAirCount = 0;
    this.dirty = true;
  }

  /**
   * Dispose chunk meshes and geometry
   */
  dispose() {
    if (this.mesh) {
      if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (this.transparentMesh) {
      if (this.transparentMesh.parent) this.transparentMesh.parent.remove(this.transparentMesh);
      if (this.transparentMesh.geometry) this.transparentMesh.geometry.dispose();
      this.transparentMesh = null;
    }
  }
}
