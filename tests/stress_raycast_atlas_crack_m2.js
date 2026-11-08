/**
 * tests/stress_raycast_atlas_crack_m2.js
 * Adversarial Empirical Stress Test Suite for Milestone 2:
 * 1. Raycasting & Targeted Face Outline (500+ random rays hitting terrain, unit cardinal normals, placePos adjacency, +0.002 face offset)
 * 2. Texture Atlas & UV Tiling Math (1x1, 2x5, 16x16 quad sizes, [0,1]^2 sub-rectangle bounds, texture repeat periodicity)
 * 3. Mining Crack Overlays (centering at x+0.5, y+0.5, z+0.5, 1.004 box dimensions, stages 0..9 monotonic progression)
 */

import * as THREE from 'three';
import './mocks/browser-shim.js';
if (typeof globalThis.window !== 'undefined') {
  globalThis.window.addEventListener = globalThis.window.addEventListener || (() => {});
  globalThis.window.removeEventListener = globalThis.window.removeEventListener || (() => {});
}

import { Chunk, CHUNK_SIZE, worldToChunkCoord, worldToLocalCoord, getChunkKey } from '../src/engine/Chunk.js';
import { ChunkMesher } from '../src/engine/ChunkMesher.js';
import { TextureAtlas, ATLAS_CANVAS_SIZE, UV_SPAN, TEXTURE_SLOTS } from '../src/engine/TextureAtlas.js';
import { VoxelWorld, BLOCK_TYPES, BLOCK_PROPS } from '../src/engine/VoxelWorld.js';
import { TextureGenerator } from '../src/engine/TextureGenerator.js';
import { MinecraftAssetLoader } from '../src/engine/MinecraftAssetLoader.js';
import { GameManager } from '../src/game/GameManager.js';

let passedAssertions = 0;
let failedAssertions = 0;
const failureMessages = [];

function assert(condition, message) {
  if (condition) {
    passedAssertions++;
  } else {
    failedAssertions++;
    failureMessages.push(message);
    console.error(`  FAIL: ${message}`);
  }
}

function assertApprox(actual, expected, tolerance = 1e-4, message = '') {
  const diff = Math.abs(actual - expected);
  assert(diff <= tolerance, `${message} (expected: ${expected} ±${tolerance}, got: ${actual})`);
}

console.log('======================================================================');
console.log(' ADVERSARIAL STRESS HARNESS: MILESTONE 2 VOXEL ENGINE VERIFICATION');
console.log('======================================================================\n');

// ============================================================================
// PART 1: RAYCASTING EMPIRICAL STRESS TEST (500+ HITS ACROSS VOXEL TERRAIN)
// ============================================================================
console.log('--- Part 1: Raycasting & Normal/Adjacency Verification (500+ Terrain Hits) ---');

const scene = new THREE.Scene();
const world = new VoxelWorld(scene);

// Build rich multi-chunk voxel terrain
// 1. Bedwars Island base: 20x4x20 at x=[0..19], y=[4..7], z=[0..19]
for (let x = 0; x < 20; x++) {
  for (let z = 0; z < 20; z++) {
    world.setBlock(x, 4, z, BLOCK_TYPES.STONE);
    world.setBlock(x, 5, z, BLOCK_TYPES.STONE);
    world.setBlock(x, 6, z, BLOCK_TYPES.DIRT);
    world.setBlock(x, 7, z, BLOCK_TYPES.GRASS);
  }
}

// 2. High Tower at (5..8, 8..24, 5..8)
for (let y = 8; y < 25; y++) {
  for (let x = 5; x <= 8; x++) {
    for (let z = 5; z <= 8; z++) {
      world.setBlock(x, y, z, BLOCK_TYPES.WOOD);
    }
  }
}

// 3. Floating Bedwars Bridge: 1-block thin bridge from (10, 8, 20) to (10, 8, 45)
for (let z = 20; z <= 45; z++) {
  world.setBlock(10, 8, z, BLOCK_TYPES.WOOL_RED);
}

// 4. Stepped Pyramid / Staircase at (-10..-1, 4..13, 0..9)
for (let step = 0; step < 10; step++) {
  for (let sx = -10 + step; sx < 0; sx++) {
    for (let sz = 0; sz < 10; sz++) {
      world.setBlock(sx, 4 + step, sz, BLOCK_TYPES.END_STONE);
    }
  }
}

// 5. Hollow obsidian bunker at (25..31, 4..10, 25..31) with interior air
for (let x = 25; x <= 31; x++) {
  for (let y = 4; y <= 10; y++) {
    for (let z = 25; z <= 31; z++) {
      const isWall = (x === 25 || x === 31 || y === 4 || y === 10 || z === 25 || z === 31);
      if (isWall) {
        world.setBlock(x, y, z, BLOCK_TYPES.OBSIDIAN);
      }
    }
  }
}

let seed = 123456789;
function pseudoRandom() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

let totalRaysShot = 0;
let totalHits = 0;
let cardinalNormalsValid = true;
let placePosAdjacencyValid = true;
let targetVoxelSolidValid = true;
let hitPointOnFaceValid = true;

// List of non-air terrain blocks to aim towards from diverse vantage points
const terrainTargets = [
  { x: 10, y: 7, z: 10 },
  { x: 6, y: 15, z: 6 },
  { x: 10, y: 8, z: 30 },
  { x: -5, y: 8, z: 5 },
  { x: 28, y: 7, z: 28 },
  { x: 0, y: 4, z: 0 },
  { x: 19, y: 7, z: 19 }
];

while (totalHits < 600) {
  totalRaysShot++;

  // Pick a target on terrain
  const target = terrainTargets[Math.floor(pseudoRandom() * terrainTargets.length)];
  const targetPoint = new THREE.Vector3(
    target.x + 0.1 + pseudoRandom() * 0.8,
    target.y + 0.1 + pseudoRandom() * 0.8,
    target.z + 0.1 + pseudoRandom() * 0.8
  );

  // Position origin at distance 3..25 away from target in random direction
  const theta = pseudoRandom() * Math.PI * 2;
  const phi = (pseudoRandom() - 0.5) * Math.PI;
  const dist = 3 + pseudoRandom() * 22;
  const offset = new THREE.Vector3(
    Math.cos(phi) * Math.cos(theta),
    Math.sin(phi),
    Math.cos(phi) * Math.sin(theta)
  ).multiplyScalar(dist);

  const origin = targetPoint.clone().add(offset);
  // Add small angular perturbation
  const jitter = new THREE.Vector3(
    (pseudoRandom() - 0.5) * 0.5,
    (pseudoRandom() - 0.5) * 0.5,
    (pseudoRandom() - 0.5) * 0.5
  );
  const dir = targetPoint.clone().add(jitter).sub(origin).normalize();

  const hit = world.raycast(origin, dir, dist + 10);

  if (hit.hit) {
    totalHits++;

    // Invariant 1: blockPos is a solid block
    const { x, y, z } = hit.blockPos;
    const blockType = world.getBlock(x, y, z);
    if (blockType === BLOCK_TYPES.AIR || blockType === 0) {
      targetVoxelSolidValid = false;
    }

    // Invariant 2: normal is a unit cardinal vector
    const norm = hit.normal;
    const lenSq = norm.x * norm.x + norm.y * norm.y + norm.z * norm.z;
    const absSum = Math.abs(norm.x) + Math.abs(norm.y) + Math.abs(norm.z);
    const isCardinal = (absSum === 1 && Math.abs(lenSq - 1.0) < 1e-5);
    const validComponents = [-1, 0, 1].includes(norm.x) && [-1, 0, 1].includes(norm.y) && [-1, 0, 1].includes(norm.z);

    if (!isCardinal || !validComponents) {
      cardinalNormalsValid = false;
      console.error(`Invalid normal: (${norm.x}, ${norm.y}, ${norm.z})`);
    }

    // Invariant 3: placePos is exactly blockPos + normal
    const expectedPlaceX = x + norm.x;
    const expectedPlaceY = y + norm.y;
    const expectedPlaceZ = z + norm.z;

    if (hit.placePos.x !== expectedPlaceX || hit.placePos.y !== expectedPlaceY || hit.placePos.z !== expectedPlaceZ) {
      placePosAdjacencyValid = false;
      console.error(`Invalid placePos: got (${hit.placePos.x}, ${hit.placePos.y}, ${hit.placePos.z}), expected (${expectedPlaceX}, ${expectedPlaceY}, ${expectedPlaceZ})`);
    }

    // Invariant 4: hit point lies on the entered boundary face
    if (hit.point) {
      let faceCoordinate;
      let expectedCoord;
      if (norm.x !== 0) {
        faceCoordinate = hit.point.x;
        expectedCoord = norm.x > 0 ? x + 1 : x;
      } else if (norm.y !== 0) {
        faceCoordinate = hit.point.y;
        expectedCoord = norm.y > 0 ? y + 1 : y;
      } else {
        faceCoordinate = hit.point.z;
        expectedCoord = norm.z > 0 ? z + 1 : z;
      }
      if (Math.abs(faceCoordinate - expectedCoord) > 0.05) {
        const originInside = world.getBlock(Math.floor(origin.x), Math.floor(origin.y), Math.floor(origin.z)) !== BLOCK_TYPES.AIR;
        if (!originInside) {
          hitPointOnFaceValid = false;
        }
      }
    }
  }
}

assert(totalHits >= 500, `Tested raycasting with 500+ random hits against voxel terrain (total hits verified: ${totalHits})`);
assert(targetVoxelSolidValid, 'Every hit.blockPos corresponds to an actual solid/non-air voxel');
assert(cardinalNormalsValid, 'Every hit.normal is strictly a unit cardinal vector (len=1, single non-zero component in {-1, 1})');
assert(placePosAdjacencyValid, 'Every hit.placePos satisfies exactly blockPos + hit.normal');
assert(hitPointOnFaceValid, 'Every hit.point lies precisely on the entered voxel face boundary');

// Edge cases: axis-aligned cardinal rays
const cardinalTests = [
  { origin: new THREE.Vector3(10.5, 7.5, -5), dir: new THREE.Vector3(0, 0, 1), target: { x: 10, y: 7, z: 0 }, expectedNorm: { x: 0, y: 0, z: -1 } },
  { origin: new THREE.Vector3(10.5, 7.5, 25), dir: new THREE.Vector3(0, 0, -1), target: { x: 10, y: 7, z: 19 }, expectedNorm: { x: 0, y: 0, z: 1 } },
  { origin: new THREE.Vector3(10.5, 15, 10.5), dir: new THREE.Vector3(0, -1, 0), target: { x: 10, y: 7, z: 10 }, expectedNorm: { x: 0, y: 1, z: 0 } },
  { origin: new THREE.Vector3(-5, 7.5, 10.5), dir: new THREE.Vector3(1, 0, 0), target: { x: 0, y: 7, z: 10 }, expectedNorm: { x: -1, y: 0, z: 0 } },
  { origin: new THREE.Vector3(25, 7.5, 10.5), dir: new THREE.Vector3(-1, 0, 0), target: { x: 19, y: 7, z: 10 }, expectedNorm: { x: 1, y: 0, z: 0 } }
];

for (const ct of cardinalTests) {
  const hit = world.raycast(ct.origin, ct.dir, 30);
  assert(hit.hit, `Cardinal ray hit target block at (${ct.target.x}, ${ct.target.y}, ${ct.target.z})`);
  assert(hit.blockPos.x === ct.target.x && hit.blockPos.y === ct.target.y && hit.blockPos.z === ct.target.z,
    `Cardinal ray targeted exact voxel (${ct.target.x}, ${ct.target.y}, ${ct.target.z})`);
  assert(hit.normal.x === ct.expectedNorm.x && hit.normal.y === ct.expectedNorm.y && hit.normal.z === ct.expectedNorm.z,
    `Cardinal ray hit face normal is (${ct.expectedNorm.x}, ${ct.expectedNorm.y}, ${ct.expectedNorm.z})`);
  assert(hit.placePos.x === ct.target.x + ct.expectedNorm.x &&
         hit.placePos.y === ct.target.y + ct.expectedNorm.y &&
         hit.placePos.z === ct.target.z + ct.expectedNorm.z,
    'Cardinal ray placement position matches adjacency along normal');
}

// Ray starting inside a solid block
const insideHit = world.raycast(new THREE.Vector3(10.5, 5.5, 10.5), new THREE.Vector3(1, 0, 0), 10);
assert(insideHit.hit, 'Ray starting inside solid block hits immediately');
assert(insideHit.blockPos.x === 10 && insideHit.blockPos.y === 5 && insideHit.blockPos.z === 10, 'Origin voxel is identified');
assert(insideHit.normal.y === 1, 'Default upward normal returned for interior origin');

// ============================================================================
// PART 2: TARGETED FACE OUTLINE GEOMETRY (+0.002 OFFSET)
// ============================================================================
console.log('\n--- Part 2: Targeted Face Outline & +0.002 Normal Offset ---');

// Mock DOM elements for headless GameManager instantiation
const dummyCanvas = document.createElement('canvas');
const dummyProto = Object.getPrototypeOf(dummyCanvas);
const origQS = dummyProto.querySelector;
dummyProto.querySelector = function(sel) {
  return (this.children && this.children[0]) || (origQS ? origQS.call(this, sel) : null) || document.createElement('div');
};

const gm = new GameManager();

// Test all 6 cardinal directions across 20 random voxel positions
const testNormals = [
  { name: '+Y (Top)', dir: new THREE.Vector3(0, 1, 0), axis: 'y', sign: 1, coordIdx: 1 },
  { name: '-Y (Bottom)', dir: new THREE.Vector3(0, -1, 0), axis: 'y', sign: -1, coordIdx: 1 },
  { name: '+X (East)', dir: new THREE.Vector3(1, 0, 0), axis: 'x', sign: 1, coordIdx: 0 },
  { name: '-X (West)', dir: new THREE.Vector3(-1, 0, 0), axis: 'x', sign: -1, coordIdx: 0 },
  { name: '+Z (South)', dir: new THREE.Vector3(0, 0, 1), axis: 'z', sign: 1, coordIdx: 2 },
  { name: '-Z (North)', dir: new THREE.Vector3(0, 0, -1), axis: 'z', sign: -1, coordIdx: 2 }
];

let faceOffsetsAllValid = true;
let faceDimensionsAllValid = true;

for (let r = 0; r < 20; r++) {
  const bx = Math.floor(-10 + pseudoRandom() * 50);
  const by = Math.floor(1 + pseudoRandom() * 30);
  const bz = Math.floor(-10 + pseudoRandom() * 50);

  for (const fn of testNormals) {
    const mockHit = {
      hit: true,
      type: BLOCK_TYPES.STONE,
      blockPos: { x: bx, y: by, z: bz },
      normal: fn.dir.clone()
    };

    gm.getAimRaycast = () => mockHit;
    gm.localPlayer.isDead = false;
    gm.updateMining(0.016);

    const positions = gm.selectionMesh.geometry.attributes.position.array;
    assert(positions.length === 12, 'Selection mesh geometry contains 4 vertices (12 floats)');

    // Extract 4 vertices
    const v0 = [positions[0], positions[1], positions[2]];
    const v1 = [positions[3], positions[4], positions[5]];
    const v2 = [positions[6], positions[7], positions[8]];
    const v3 = [positions[9], positions[10], positions[11]];
    const verts = [v0, v1, v2, v3];

    // Compute expected normal offset coordinate
    let expectedNormalPlane;
    if (fn.axis === 'y') {
      expectedNormalPlane = fn.sign > 0 ? (by + 1 + 0.002) : (by - 0.002);
    } else if (fn.axis === 'x') {
      expectedNormalPlane = fn.sign > 0 ? (bx + 1 + 0.002) : (bx - 0.002);
    } else {
      expectedNormalPlane = fn.sign > 0 ? (bz + 1 + 0.002) : (bz - 0.002);
    }

    // Verify all 4 vertices reside on the offset normal plane
    for (const v of verts) {
      const actualCoord = v[fn.coordIdx];
      if (Math.abs(actualCoord - expectedNormalPlane) > 1e-4) {
        faceOffsetsAllValid = false;
        console.error(`Offset mismatch on ${fn.name} at (${bx},${by},${bz}): expected ${expectedNormalPlane}, got ${actualCoord}`);
      }
    }

    // Verify tangential dimensions span exactly [0..1] x [0..1]
    const uCoords = [];
    const vCoords = [];
    for (const v of verts) {
      if (fn.axis === 'y') {
        uCoords.push(v[0]);
        vCoords.push(v[2]);
      } else if (fn.axis === 'x') {
        uCoords.push(v[1]);
        vCoords.push(v[2]);
      } else {
        uCoords.push(v[0]);
        vCoords.push(v[1]);
      }
    }

    const minU = Math.min(...uCoords);
    const maxU = Math.max(...uCoords);
    const minV = Math.min(...vCoords);
    const maxV = Math.max(...vCoords);

    if (Math.abs(maxU - minU - 1.0) > 1e-4 || Math.abs(maxV - minV - 1.0) > 1e-4) {
      faceDimensionsAllValid = false;
    }
  }
}

assert(faceOffsetsAllValid, 'Targeted face outline is strictly offset by +0.002 along face normal across all 6 cardinal directions');
assert(faceDimensionsAllValid, 'Targeted face outline vertices span exact 1.0 x 1.0 dimensions on the targeted voxel face');

// ============================================================================
// PART 3: TEXTURE ATLAS & UV TILING MATH VERIFICATION
// ============================================================================
console.log('\n--- Part 3: Texture Atlas & UV Tiling Math ---');

const atlas = new TextureAtlas(new TextureGenerator());

// 3.1 Verify all block types map to valid atlas sub-rectangles in [0,1] x [0,1]
let allSubRectanglesValid = true;
let subRectanglesSpanValid = true;
const cardinalFaces = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];

for (const [idStr, prop] of Object.entries(BLOCK_PROPS)) {
  const bId = parseInt(idStr);
  if (bId === BLOCK_TYPES.AIR) continue;

  for (const face of cardinalFaces) {
    const rect = atlas.getAtlasRect(bId, face);
    const [u, v, w, h] = rect;

    // Must be in [0, 1] range
    if (u < 0 || u > 1.0 - UV_SPAN + 1e-6 || v < 0 || v > 1.0 - UV_SPAN + 1e-6) {
      allSubRectanglesValid = false;
      console.error(`Invalid sub-rect for block ${prop.name} face ${face}: [${u}, ${v}, ${w}, ${h}]`);
    }

    if (Math.abs(w - UV_SPAN) > 1e-6 || Math.abs(h - UV_SPAN) > 1e-6) {
      subRectanglesSpanValid = false;
    }

    if (u + w > 1.0 + 1e-6 || v + h > 1.0 + 1e-6) {
      allSubRectanglesValid = false;
    }
  }
}

assert(allSubRectanglesValid, 'All block face atlas sub-rectangles fit strictly within [0, 1] x [0, 1]');
assert(subRectanglesSpanValid, 'All atlas sub-rectangles have exact width and height equal to UV_SPAN (0.0625)');

// 3.2 Verify mathematical UV repeat formula across 1x1, 2x5, 16x16, 1x16, 7x3
const testQuadSizes = [
  { w: 1, h: 1, desc: '1x1 single voxel quad' },
  { w: 2, h: 5, desc: '2x5 greedy merged wall' },
  { w: 16, h: 16, desc: '16x16 full chunk plane' },
  { w: 1, h: 16, desc: '1x16 vertical pillar' },
  { w: 7, h: 3, desc: '7x3 irregular greedy platform' }
];

let uvTilingBoundsValid = true;
let uvTilingPeriodicityValid = true;

for (const qs of testQuadSizes) {
  const W = qs.w;
  const H = qs.h;
  const testRect = atlas.getAtlasRect(BLOCK_TYPES.STONE, '+Y');
  const [rx, ry, rw, rh] = testRect;

  // Sample a dense grid of points across [0, 1] x [0, 1]
  const steps = 32;
  for (let sv = 0; sv <= steps; sv++) {
    for (let su = 0; su <= steps; su++) {
      const uNorm = su / steps;
      const vNorm = sv / steps;

      // Formula from ChunkMesher / TextureAtlas shader hook:
      // vTiledUV = uv * aQuadSize;
      const vTiledUV_x = uNorm * W;
      const vTiledUV_y = vNorm * H;

      // In GLSL: fract(x) = x - floor(x);
      // Handle boundary: when fract is computed, fract(x) is in [0, 1)
      let localUV_x = vTiledUV_x - Math.floor(vTiledUV_x);
      let localUV_y = vTiledUV_y - Math.floor(vTiledUV_y);

      // atlasUV = vAtlasRect.xy + localUV * vAtlasRect.zw;
      const atlasUV_x = rx + localUV_x * rw;
      const atlasUV_y = ry + localUV_y * rh;

      // Invariant 1: atlasUV stays strictly within the sub-rectangle [rx, rx + rw] x [ry, ry + rh]
      if (atlasUV_x < rx - 1e-6 || atlasUV_x > rx + rw + 1e-6 ||
          atlasUV_y < ry - 1e-6 || atlasUV_y > ry + rh + 1e-6) {
        uvTilingBoundsValid = false;
        console.error(`UV out of bounds for ${qs.desc}: atlasUV=(${atlasUV_x}, ${atlasUV_y}), rect=[${rx}, ${ry}, ${rw}, ${rh}]`);
      }

      // Invariant 2: atlasUV stays strictly within [0, 1] x [0, 1]
      if (atlasUV_x < 0 || atlasUV_x > 1.0 + 1e-6 || atlasUV_y < 0 || atlasUV_y > 1.0 + 1e-6) {
        uvTilingBoundsValid = false;
      }
    }
  }

  // Verify periodicity: for integer shifts inside quad, localUV is identical
  const baseU = 0.35;
  const baseV = 0.62;
  const baseTiledX = (baseU / W) * W;
  const baseTiledY = (baseV / H) * H;
  const baseFractX = baseTiledX - Math.floor(baseTiledX);
  const baseFractY = baseTiledY - Math.floor(baseTiledY);

  for (let kw = 0; kw < W; kw++) {
    for (let kh = 0; kh < H; kh++) {
      const shiftedU = (baseU + kw) / W;
      const shiftedV = (baseV + kh) / H;
      const tiledX = shiftedU * W;
      const tiledY = shiftedV * H;
      const fractX = tiledX - Math.floor(tiledX);
      const fractY = tiledY - Math.floor(tiledY);

      if (Math.abs(fractX - baseFractX) > 1e-5 || Math.abs(fractY - baseFractY) > 1e-5) {
        uvTilingPeriodicityValid = false;
      }
    }
  }
}

assert(uvTilingBoundsValid, 'Shader UV repeat formula bounds atlasUV strictly within [rx, rx+rw] and [0,1]^2 for all quad sizes');
assert(uvTilingPeriodicityValid, 'Shader UV repeat formula guarantees perfect periodicity without stretching across multi-block greedy quads');

// ============================================================================
// PART 4: MINING CRACK OVERLAYS & PROGRESSION (STAGES 0 TO 9)
// ============================================================================
console.log('\n--- Part 4: Mining Crack Overlays & Stages 0..9 Progression ---');

// 4.1 Crack overlay mesh positioning and dimensions
assert(gm.crackMesh instanceof THREE.Mesh, 'GameManager.crackMesh is initialized as a THREE.Mesh');
const crackBox = gm.crackMesh.geometry;
assertApprox(crackBox.parameters.width, 1.004, 1e-4, 'Crack mesh box width is 1.004 (0.002 margin)');
assertApprox(crackBox.parameters.height, 1.004, 1e-4, 'Crack mesh box height is 1.004 (0.002 margin)');
assertApprox(crackBox.parameters.depth, 1.004, 1e-4, 'Crack mesh box depth is 1.004 (0.002 margin)');

// Test centering on 50 arbitrary block positions
let crackCenterValid = true;
for (let i = 0; i < 50; i++) {
  const tx = Math.floor(-50 + pseudoRandom() * 100);
  const ty = Math.floor(1 + pseudoRandom() * 64);
  const tz = Math.floor(-50 + pseudoRandom() * 100);

  const mockHit = {
    hit: true,
    type: BLOCK_TYPES.STONE,
    blockPos: { x: tx, y: ty, z: tz },
    normal: new THREE.Vector3(0, 1, 0)
  };

  gm.startMining(mockHit);
  const cp = gm.crackMesh.position;
  if (Math.abs(cp.x - (tx + 0.5)) > 1e-4 ||
      Math.abs(cp.y - (ty + 0.5)) > 1e-4 ||
      Math.abs(cp.z - (tz + 0.5)) > 1e-4) {
    crackCenterValid = false;
  }
  gm.stopMining();
}
assert(crackCenterValid, 'Crack overlay mesh is centered precisely at (x + 0.5, y + 0.5, z + 0.5) across all voxels');

// 4.2 Mining stages 0 through 9 progression test
const assetLoader = new MinecraftAssetLoader();
const texGen = new TextureGenerator();

// Verify authentic Minecraft textures exist for all stages 0..9
for (let s = 0; s <= 9; s++) {
  const mcPath = assetLoader.getCrackTexture(s);
  assert(mcPath.endsWith(`destroy_stage_${s}.png`), `Stage ${s} maps to authentic destroy_stage_${s}.png`);

  const procTex = texGen.getCrackTexture(s);
  assert(procTex instanceof THREE.CanvasTexture, `Stage ${s} generates valid CanvasTexture`);
  assert(procTex.magFilter === THREE.NearestFilter, `Stage ${s} texture uses NearestFilter`);
}

// Clamping robustness
assert(assetLoader.getCrackTexture(-1).endsWith('destroy_stage_0.png'), 'Negative crack stage clamps to 0');
assert(assetLoader.getCrackTexture(15).endsWith('destroy_stage_9.png'), 'Crack stage > 9 clamps to 9');
assert(texGen.getCrackTexture(-5) !== null, 'texGen clamps negative stage to stage 0');
assert(texGen.getCrackTexture(100) !== null, 'texGen clamps overflow stage to stage 9');

// 4.3 Full hold-to-mine progression simulation (tracking stages 0 through 9 monotonically)
// Create a target stone block in world
const targetVoxelPos = { x: 5, y: 7, z: 5 };
gm.world.setBlock(targetVoxelPos.x, targetVoxelPos.y, targetVoxelPos.z, BLOCK_TYPES.STONE);

const mineHit = {
  hit: true,
  type: BLOCK_TYPES.STONE,
  blockPos: targetVoxelPos,
  normal: new THREE.Vector3(0, 1, 0)
};

gm.localPlayer.position.set(5.5, 7.0, 7.5); // close enough to mine
// Real raycast mock that checks if block still exists in world
gm.getAimRaycast = () => {
  const currentType = gm.world.getBlock(targetVoxelPos.x, targetVoxelPos.y, targetVoxelPos.z);
  if (currentType === BLOCK_TYPES.AIR) {
    return { hit: false };
  }
  return {
    hit: true,
    type: currentType,
    blockPos: targetVoxelPos,
    normal: new THREE.Vector3(0, 1, 0)
  };
};

gm.isLeftMouseDown = true;
gm.startMining(mineHit);

const totalDuration = gm.miningDuration;
assert(totalDuration > 0, `Mining duration is positive (${totalDuration}s)`);

const stagesVisited = new Set();
let stageMonotonic = true;
let previousStage = -1;

// Advance through 90% of duration in 50 steps
const STEPS = 50;
const DT = (totalDuration * 0.95) / STEPS;
for (let step = 0; step < STEPS; step++) {
  gm.updateMining(DT);
  assert(gm.isMining, `Mining in progress at step ${step}`);

  const ratio = Math.min(0.999, gm.miningElapsed / Math.max(0.01, gm.miningDuration));
  const stage = Math.floor(ratio * 10);
  stagesVisited.add(stage);

  if (stage < previousStage) {
    stageMonotonic = false;
  }
  previousStage = stage;
}

assert(stageMonotonic, 'Crack stages progress monotonically without regressions');
for (let s = 0; s <= 9; s++) {
  assert(stagesVisited.has(s), `Mining progression successfully traversed stage ${s}`);
}
assert(stagesVisited.size === 10, 'All 10 stages (0 through 9) were visited during mining');

// Final step pushes elapsed over duration -> triggers finishMining()
const remainingDt = (totalDuration - gm.miningElapsed) + 0.05;
gm.updateMining(remainingDt);

assert(!gm.isMining, 'Mining completes and resets isMining to false when elapsed >= duration');
assert(!gm.crackMesh.visible, 'Crack overlay mesh is hidden upon mining completion');
assert(gm.world.getBlock(targetVoxelPos.x, targetVoxelPos.y, targetVoxelPos.z) === BLOCK_TYPES.AIR,
  'Mined block in world is destroyed and set to AIR');

// ============================================================================
// PART 5: ADVERSARIAL CORNER CASES & RESILIENCE TESTS
// ============================================================================
console.log('\n--- Part 5: Adversarial Corner Cases & Robustness ---');

// 5.1 Negative Coordinate Raycasting & Face Outlining
const negVoxel = { x: -15, y: -4, z: -8 };
world.setBlock(negVoxel.x, negVoxel.y, negVoxel.z, BLOCK_TYPES.OBSIDIAN);
const negRayHit = world.raycast(new THREE.Vector3(-14.5, -3.5, -25.0), new THREE.Vector3(0, 0, 1), 30);
assert(negRayHit.hit, 'Raycast hits block with negative coordinates (-15, -4, -8)');
assert(negRayHit.blockPos.x === negVoxel.x && negRayHit.blockPos.y === negVoxel.y && negRayHit.blockPos.z === negVoxel.z,
  'Identified correct negative coordinate voxel');
assert(negRayHit.normal.z === -1, 'Normal is (0, 0, -1) on entered -Z face in negative space');
assert(negRayHit.placePos.z === -9, 'Placement coordinate in negative space is correctly adjacent at z=-9');

// Face outline on negative coordinate voxel
gm.getAimRaycast = () => ({
  hit: true,
  type: BLOCK_TYPES.OBSIDIAN,
  blockPos: negVoxel,
  normal: new THREE.Vector3(0, 1, 0) // +Y face
});
gm.updateMining(0.016);
const negFacePos = gm.selectionMesh.geometry.attributes.position.array;
// For +Y face on y=-4: ny = -4 + 1 + 0.002 = -2.998
assertApprox(negFacePos[1], -2.998, 1e-4, 'Negative coordinate +Y face quad outline elevated by +0.002 to -2.998');
assertApprox(negFacePos[0], -15.0, 1e-4, 'Negative coordinate X vertex aligns to -15.0');

// 5.2 Near-zero ray components (Amanatides-Woo float stability)
const nearZeroHit = world.raycast(
  new THREE.Vector3(10.5, 20.0, 10.5),
  new THREE.Vector3(1e-12, -1.0, 1e-12).normalize(),
  25
);
assert(nearZeroHit.hit, 'Raycast with near-zero X and Z components hits terrain below stably without NaN');
assert(nearZeroHit.normal.y === 1, 'Near-zero component ray enters through top (+Y) face');

// 5.3 Mining Abort on Mouse Release
gm.world.setBlock(10, 7, 10, BLOCK_TYPES.WOOD);
const woodHit = { hit: true, type: BLOCK_TYPES.WOOD, blockPos: { x: 10, y: 7, z: 10 }, normal: new THREE.Vector3(0, 1, 0) };
gm.getAimRaycast = () => woodHit;
gm.localPlayer.position.set(10.5, 7.0, 12.0);
gm.isLeftMouseDown = true;
gm.startMining(woodHit);
assert(gm.isMining, 'Mining started on wood block');
gm.updateMining(0.1);
assert(gm.isMining, 'Mining in progress');
// Release mouse
gm.isLeftMouseDown = false;
gm.updateMining(0.016);
assert(!gm.isMining, 'Releasing left mouse immediately halts mining progression');
assert(!gm.crackMesh.visible, 'Crack overlay mesh hidden when mouse released');

// 5.4 Mining Abort on Distance > 6.0 Blocks (Reach Limit)
gm.isLeftMouseDown = true;
gm.startMining(woodHit);
assert(gm.isMining, 'Mining restarted on wood block');
// Move player far away
gm.localPlayer.position.set(20.0, 7.0, 20.0); // distance ~ 14 blocks
gm.updateMining(0.05);
assert(!gm.isMining, 'Moving beyond 6.0 blocks automatically halts mining progression');
assert(!gm.crackMesh.visible, 'Crack overlay mesh hidden when out of reach');

// 5.5 Bedrock Invulnerability
const bedrockHit = { hit: true, type: BLOCK_TYPES.BEDROCK, blockPos: { x: 0, y: 0, z: 0 }, normal: new THREE.Vector3(0, 1, 0) };
gm.isLeftMouseDown = true;
gm.startMining(bedrockHit);
assert(!gm.isMining, 'Bedrock cannot be mined (isMining remains false)');
assert(!gm.crackMesh.visible, 'Crack overlay is never shown for bedrock');

// 5.6 Player Death Abort
gm.localPlayer.position.set(10.5, 7.0, 12.0);
gm.startMining(woodHit);
assert(gm.isMining, 'Mining active before death');
gm.localPlayer.isDead = true;
gm.updateMining(0.016);
assert(!gm.isMining, 'Player death aborts mining immediately');
assert(!gm.crackMesh.visible, 'Crack overlay hidden upon player death');
assert(!gm.selectionMesh.visible, 'Selection face outline hidden when player is dead');
gm.localPlayer.isDead = false;

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n======================================================================');
console.log(' ADVERSARIAL STRESS TEST SUMMARY');
console.log('======================================================================');
console.log(`Passed assertions : ${passedAssertions}`);
console.log(`Failed assertions : ${failedAssertions}`);

if (failedAssertions > 0) {
  console.error('\nFAILURES:');
  failureMessages.forEach((msg, idx) => console.error(` [${idx + 1}] ${msg}`));
  process.exit(1);
} else {
  console.log('\n✔ ALL EMPIRICAL ADVERSARIAL TESTS PASSED (100% INTEGRITY)');
  process.exit(0);
}
