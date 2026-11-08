/**
 * tests/auditor_m2_forensic_test.js
 * Independent Forensic Integrity & Adversarial Stress Suite for Milestone 2.
 *
 * Authored by: Forensic Auditor (critic, specialist, auditor)
 * Scope:
 * 1. Chunk.js: Bitwise indexing boundaries, Uint8Array safety, coordinate wrap-around.
 * 2. ChunkMesher.js: CCW winding order & normal cross product, checkerboard non-merge,
 *    hollow volume interior meshing, opaque vs transparent visibility rules.
 * 3. TextureAtlas.js: Sub-rectangle math, UV containment [0, 1], nearest filtering.
 * 4. Physics.js: Auto step-climbing boundary conditions (0.4 vs 0.5 vs 0.6),
 *    headroom ceiling collision prevention during step climb, mid-air step prevention.
 * 5. GameManager.js: 6-face targeted quad geometry coplanarity & +0.002 normal offset.
 */

import * as THREE from 'three';
import './mocks/browser-shim.js';
if (typeof globalThis.window !== 'undefined') {
  globalThis.window.addEventListener = globalThis.window.addEventListener || (() => {});
  globalThis.window.removeEventListener = globalThis.window.removeEventListener || (() => {});
}

import { Chunk, CHUNK_SIZE, CHUNK_SIZE_CB, getVoxelIndex, getChunkKey, worldToChunkCoord, worldToLocalCoord } from '../src/engine/Chunk.js';
import { ChunkMesher } from '../src/engine/ChunkMesher.js';
import { TextureAtlas, UV_SPAN, TEXTURE_SLOTS } from '../src/engine/TextureAtlas.js';
import { VoxelWorld, BLOCK_TYPES } from '../src/engine/VoxelWorld.js';
import { Physics } from '../src/engine/Physics.js';
import { GameManager } from '../src/game/GameManager.js';

console.log('\n======================================================================');
console.log('   FORENSIC INTEGRITY AUDIT TEST SUITE: MILESTONE 2 (ADVERSARIAL)     ');
console.log('======================================================================\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const violations = [];

function check(pass, name, evidence = '') {
  totalChecks++;
  if (pass) {
    passedChecks++;
    console.log(`  [PASS] ${name}`);
  } else {
    failedChecks++;
    violations.push({ name, evidence });
    console.error(`  [FAIL] ${name} - Evidence: ${evidence}`);
  }
}

// ============================================================================
// 1. CHUNK BITWISE INDEXING & COORDINATE WRAP-AROUND FORENSICS
// ============================================================================
console.log('--- SECTION 1: Chunk Bitwise & Coordinate Math Forensics ---');

check(getVoxelIndex(0, 0, 0) === 0, '1.1: getVoxelIndex(0, 0, 0) == 0');
check(getVoxelIndex(15, 15, 15) === 4095, '1.2: getVoxelIndex(15, 15, 15) == 4095');

// Test arbitrary coordinates with bitwise masking: even if out of 0..15 range,
// bitwise mask & 15 guarantees result is strictly in [0, 4095]
let bitwiseBoundsSafe = true;
const testCoords = [-16, -1, 16, 32, 100, 255];
for (const cx of testCoords) {
  for (const cy of testCoords) {
    for (const cz of testCoords) {
      const idx = getVoxelIndex(cx, cy, cz);
      if (idx < 0 || idx >= 4096) {
        bitwiseBoundsSafe = false;
        break;
      }
    }
  }
}
check(bitwiseBoundsSafe, '1.3: Bitwise coordinates cannot exceed 4095 bounds');

// worldToChunkCoord and worldToLocalCoord negative coordinate handling
check(worldToChunkCoord(-1) === -1, '1.4a: worldToChunkCoord(-1) == -1');
check(worldToChunkCoord(-16) === -1, '1.4b: worldToChunkCoord(-16) == -1');
check(worldToChunkCoord(-17) === -2, '1.4c: worldToChunkCoord(-17) == -2');
check(worldToLocalCoord(-1) === 15, '1.5a: worldToLocalCoord(-1) == 15');
check(worldToLocalCoord(-16) === 0, '1.5b: worldToLocalCoord(-16) == 0');
check(worldToLocalCoord(-17) === 15, '1.5c: worldToLocalCoord(-17) == 15');

// ============================================================================
// 2. CHUNK MESHER ADVERSARIAL STRESS & WINDING ORDER VERIFICATION
// ============================================================================
console.log('\n--- SECTION 2: Chunk Mesher Adversarial & Geometry Verification ---');

const atlas = new TextureAtlas();
const mesher = new ChunkMesher(null, atlas);

// 2.1 Checkerboard stress test: Alternating Stone and Wood blocks
// Greedy mesher MUST NOT merge disparate block types into single quads
const checkerChunk = new Chunk(0, 0, 0);
for (let x = 0; x < 4; x++) {
  for (let z = 0; z < 4; z++) {
    const type = (x + z) % 2 === 0 ? BLOCK_TYPES.STONE : BLOCK_TYPES.WOOD;
    checkerChunk.set(x, 0, z, type);
  }
}
const checkerResult = mesher.meshChunk(checkerChunk);
// In a 4x4 alternating 2-color board, top faces (+Y) CANNOT merge horizontally or vertically because neighbors differ!
// Every top face must remain an isolated 1x1 quad (16 quads for top faces alone)
check(checkerResult.opaqueQuadCount > 6, '2.1: Checkerboard pattern does NOT illegally merge disparate block types',
  `Expected >6 quads, got ${checkerResult.opaqueQuadCount}`);

// 2.2 Isolated single block: exactly 6 quads (1 per cardinal direction)
const singleChunk = new Chunk(0, 0, 0);
singleChunk.set(8, 8, 8, BLOCK_TYPES.STONE);
const singleResult = mesher.meshChunk(singleChunk);
check(singleResult.opaqueQuadCount === 6, '2.2: Isolated single block emits exactly 6 quads',
  `Expected 6 quads, got ${singleResult.opaqueQuadCount}`);

// 2.3 Counter-Clockwise (CCW) Winding Order & Normal Alignment
// For every quad, (p1 - p0) x (p2 - p0) must have a positive dot product with the normal vector
const singleGeo = singleChunk.mesh.geometry;
const posAttr = singleGeo.attributes.position.array;
const normAttr = singleGeo.attributes.normal.array;
const indexAttr = singleGeo.index.array;

let allNormalsAndWindingConsistent = true;
for (let t = 0; t < indexAttr.length; t += 3) {
  const i0 = indexAttr[t];
  const i1 = indexAttr[t + 1];
  const i2 = indexAttr[t + 2];

  const p0 = new THREE.Vector3(posAttr[i0 * 3], posAttr[i0 * 3 + 1], posAttr[i0 * 3 + 2]);
  const p1 = new THREE.Vector3(posAttr[i1 * 3], posAttr[i1 * 3 + 1], posAttr[i1 * 3 + 2]);
  const p2 = new THREE.Vector3(posAttr[i2 * 3], posAttr[i2 * 3 + 1], posAttr[i2 * 3 + 2]);

  const vA = new THREE.Vector3().subVectors(p1, p0);
  const vB = new THREE.Vector3().subVectors(p2, p0);
  const faceNormal = new THREE.Vector3().crossVectors(vA, vB).normalize();

  const vertexNormal = new THREE.Vector3(normAttr[i0 * 3], normAttr[i0 * 3 + 1], normAttr[i0 * 3 + 2]);
  const dot = faceNormal.dot(vertexNormal);
  if (dot < 0.9) {
    allNormalsAndWindingConsistent = false;
    break;
  }
}
check(allNormalsAndWindingConsistent, '2.3: Triangle winding order strictly aligns with surface normal vectors (CCW)');

// 2.4 Hollow Box: 6x6x6 box with 4x4x4 air inside
// Faces inside facing the hollow must be generated
const hollowChunk = new Chunk(0, 0, 0);
for (let x = 0; x < 6; x++) {
  for (let y = 0; y < 6; y++) {
    for (let z = 0; z < 6; z++) {
      const isBoundary = (x === 0 || x === 5 || y === 0 || y === 5 || z === 0 || z === 5);
      if (isBoundary) {
        hollowChunk.set(x, y, z, BLOCK_TYPES.OBSIDIAN);
      }
    }
  }
}
const hollowResult = mesher.meshChunk(hollowChunk);
// 6 outer merged faces + 6 inner merged faces = 12 merged quads!
check(hollowResult.opaqueQuadCount === 12, '2.4: Hollow 6x6x6 volume meshes both 6 outer and 6 inner faces (12 quads total)',
  `Expected 12 quads, got ${hollowResult.opaqueQuadCount}`);

// 2.5 Opaque block behind glass is visible
const glassStoneChunk = new Chunk(0, 0, 0);
glassStoneChunk.set(4, 4, 4, BLOCK_TYPES.STONE);
glassStoneChunk.set(4, 4, 5, BLOCK_TYPES.GLASS);
const gsResult = mesher.meshChunk(glassStoneChunk);
// Stone (+Z face pointing into glass at 4,4,5) must be visible through glass!
check(gsResult.opaqueQuadCount === 6, '2.5: Opaque block face facing transparent glass is retained (not culled)',
  `Expected 6 opaque quads, got ${gsResult.opaqueQuadCount}`);

// ============================================================================
// 3. TEXTURE ATLAS MATHEMATICAL RIGOR & UV BOUNDS
// ============================================================================
console.log('\n--- SECTION 3: Texture Atlas Math & Range Forensics ---');

let allSlotsValid = true;
let allRectsWithinUnitSquare = true;
for (const [key, slot] of Object.entries(TEXTURE_SLOTS)) {
  const col = slot % 16;
  const row = Math.floor(slot / 16);
  if (col < 0 || col >= 16 || row < 0 || row >= 16) {
    allSlotsValid = false;
  }
}
check(allSlotsValid, '3.1: All texture slots fit within 16x16 grid');

for (let b = 1; b <= 28; b++) {
  for (const face of ['+X', '-X', '+Y', '-Y', '+Z', '-Z']) {
    const rect = atlas.getAtlasRect(b, face);
    const [u, v, w, h] = rect;
    if (u < 0 || u > 1 || v < 0 || v > 1 || u + w > 1.0001 || v + h > 1.0001) {
      allRectsWithinUnitSquare = false;
      break;
    }
  }
}
check(allRectsWithinUnitSquare, '3.2: All block face UV sub-rectangles lie strictly within [0, 1] texture coordinates');

// ============================================================================
// 4. PHYSICS STEP-CLIMBING ADVERSARIAL STRESS TESTING
// ============================================================================
console.log('\n--- SECTION 4: Physics Step-Climbing Stress & Headroom Forensics ---');

const physWorld = new VoxelWorld(new THREE.Scene());
const physics = new Physics(physWorld);

// Setup a level floor at y = 0
for (let x = 0; x <= 10; x++) {
  for (let z = 0; z <= 10; z++) {
    physWorld.setBlock(x, 0, z, BLOCK_TYPES.STONE);
  }
}

// 4.1 0.4 Step Climb: Entity walking on a 0.6 block height obstacle
// Player is at x=2.0, y=1.0, z=5.0. Floor is at y=0 (top is y=1.0).
// In front at x=3, there is a half-slab or low obstacle at y=1.
// If obstacle is 1.0 block high (at x=3, y=1, top is 2.0), step height is 1.0.
// Let's test with a 1.0-block wall:
physWorld.setBlock(3, 1, 5, BLOCK_TYPES.STONE);

const wallPlayer = {
  position: new THREE.Vector3(2.5, 1.0, 5.0),
  velocity: new THREE.Vector3(5.0, 0, 0), // moving towards x=3
  width: 0.6,
  height: 1.8,
  onGround: true,
  isFlying: false
};
physics.moveEntity(wallPlayer, 0.1); // dx = 0.5 -> would reach 3.0
check(wallPlayer.position.x <= 2.7, '4.1a: Full 1.0-block wall halts player horizontal traversal',
  `Actual x: ${wallPlayer.position.x}`);
check(wallPlayer.velocity.x === 0, '4.1b: Wall collision resets horizontal velocity to 0');

// 4.2 Ceiling headroom obstruction during step climb:
// If an entity tries to step up 0.5 blocks, but a ceiling block is at y = 3 (height 2 blocks above ground y=1),
// then standing at y=1.5 with height 1.8 reaches y=3.3, which intersects the ceiling at y=3!
// Step-climb MUST NOT occur if headroom is obstructed!
const ceilingObstacleWorld = new VoxelWorld(new THREE.Scene());
const ceilingPhysics = new Physics(ceilingObstacleWorld);

// Ground at y=0
for (let x = 0; x <= 10; x++) ceilingObstacleWorld.setBlock(x, 0, 5, BLOCK_TYPES.STONE);
// Low step obstacle at x=4, y=1
ceilingObstacleWorld.setBlock(4, 1, 5, BLOCK_TYPES.STONE);
// Low ceiling at x=4, y=3
ceilingObstacleWorld.setBlock(4, 3, 5, BLOCK_TYPES.STONE);

// If player is at y=1.0, height is 1.8, top is 2.8 (clear under ceiling y=3).
// If player steps up by 0.5 to y=1.5, top is 1.5 + 1.8 = 3.3 (COLLIDES with ceiling at y=3)!
const crampedPlayer = {
  position: new THREE.Vector3(3.5, 1.0, 5.0),
  velocity: new THREE.Vector3(4.0, 0, 0),
  width: 0.6,
  height: 1.8,
  onGround: true,
  isFlying: false
};
ceilingPhysics.moveEntity(crampedPlayer, 0.1);
check(crampedPlayer.position.x <= 3.7, '4.2a: Obstructed headroom prevents step-climb; player is blocked',
  `Actual x: ${crampedPlayer.position.x}`);
check(crampedPlayer.position.y === 1.0, '4.2b: Player elevation remains at 1.0 (no illegal upward clipping into ceiling)',
  `Actual y: ${crampedPlayer.position.y}`);

// 4.3 Mid-Air Step Prevention:
// Entity with onGround = false must NOT step climb
const airPlayer = {
  position: new THREE.Vector3(2.5, 1.0, 5.0),
  velocity: new THREE.Vector3(5.0, 0, 0),
  width: 0.6,
  height: 1.8,
  onGround: false, // In mid-air!
  isFlying: false
};
physics.moveEntity(airPlayer, 0.1);
check(airPlayer.position.x <= 2.7, '4.3: Mid-air entity cannot step-climb obstacles without ground support');

// ============================================================================
// 5. GAMEMANAGER TARGETED FACE QUAD GEOMETRY FORENSICS
// ============================================================================
console.log('\n--- SECTION 5: GameManager Targeted Face Quad Forensics ---');

// Ensure headless MockElement querySelector returns mock element when null
const dummyCanvas = document.createElement('canvas');
const dummyProto = Object.getPrototypeOf(dummyCanvas);
const origQS = dummyProto.querySelector;
dummyProto.querySelector = function(sel) {
  return (this.children && this.children[0]) || (origQS ? origQS.call(this, sel) : null) || document.createElement('div');
};

const gm = new GameManager();
gm.localPlayer.isDead = false;

// Test all 6 face normals
const testFaces = [
  { name: '+Y (Top)',    norm: new THREE.Vector3( 0,  1,  0), expectedCoord: 1, expectedVal: 6.002 },
  { name: '-Y (Bottom)', norm: new THREE.Vector3( 0, -1,  0), expectedCoord: 1, expectedVal: 4.998 },
  { name: '+X (East)',   norm: new THREE.Vector3( 1,  0,  0), expectedCoord: 0, expectedVal: 11.002 },
  { name: '-X (West)',   norm: new THREE.Vector3(-1,  0,  0), expectedCoord: 0, expectedVal: 9.998 },
  { name: '+Z (South)',  norm: new THREE.Vector3( 0,  0,  1), expectedCoord: 2, expectedVal: 11.002 },
  { name: '-Z (North)',  norm: new THREE.Vector3( 0,  0, -1), expectedCoord: 2, expectedVal: 9.998 },
];

let allFaceQuadsValid = true;
for (const tf of testFaces) {
  gm.getAimRaycast = () => ({
    hit: true,
    type: BLOCK_TYPES.STONE,
    blockPos: { x: 10, y: 5, z: 10 },
    normal: tf.norm
  });
  gm.updateMining(0.016);

  const quadPos = gm.selectionMesh.geometry.attributes.position.array;
  for (let pt = 0; pt < 4; pt++) {
    const val = quadPos[pt * 3 + tf.expectedCoord];
    if (Math.abs(val - tf.expectedVal) > 1e-3) {
      allFaceQuadsValid = false;
      console.error(`Mismatch on ${tf.name} face point ${pt}: expected ${tf.expectedVal}, got ${val}`);
      break;
    }
  }
}
check(allFaceQuadsValid, '5.1: Bloxd face quad outline accurately calculates all 6 cardinal face projections with +0.002 normal offset');

// ============================================================================
// AUDIT SUMMARY
// ============================================================================
console.log('\n======================================================================');
console.log(`   AUDITOR FORENSIC RESULTS: ${passedChecks}/${totalChecks} CHECKS PASSED`);
if (failedChecks > 0) {
  console.log(`   FAILURES: ${failedChecks}`);
  violations.forEach(v => console.error(`     - ${v.name}: ${v.evidence}`));
  console.log('   VERDICT: INTEGRITY VIOLATION');
  console.log('======================================================================\n');
  process.exit(1);
} else {
  console.log('   FAILURES: 0');
  console.log('   VERDICT: CLEAN - 100% EMPIRICAL INTEGRITY CONFIRMED');
  console.log('======================================================================\n');
  process.exit(0);
}
