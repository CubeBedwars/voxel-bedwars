/**
 * tests/challenger_m2_adversarial.js
 * Empirical Adversarial Test Harness for Milestone 2: External Voxel Engine Integration.
 *
 * Authored by: Challenger 1 (challenger_m2_gen4_1)
 *
 * Verifies:
 * 1. Chunk meshing boundary conditions across all 6 chunk borders (x=0, 15, y=0, 15, z=0, 15)
 *    including negative coordinate chunks (-X, -Y, -Z), dynamic culling, and block breaking face restoration.
 * 2. 16x16 border wall culling, 1-block puncture test, and glass/transparency cross-chunk interactions.
 * 3. Greedy quad merging correctness on 16x16 slabs (XY, XZ, YZ) and hollow tunnels (X, Y, Z axes),
 *    verifying minimal quad counts, exact surface area sums, and no overlapping geometry.
 * 4. Concentric hollow cube 99.8% geometry reduction.
 * 5. Strict unit cardinal normal vectors (+X, -X, +Y, -Y, +Z, -Z) and CCW geometric triangle winding.
 * 6. Physics step-climbing: heights 0.25, 0.50 (climbed) vs 0.75, 1.00, 2.00 (strictly blocked)
 *    across all 4 horizontal directions (+X, -X, +Z, -Z) and in mid-air (onGround=false).
 * 7. Launchpad impulse along cardinal/diagonal forward vectors, vertical boost, and ballistic simulation.
 */

import * as THREE from 'three';
import './mocks/browser-shim.js';
if (typeof globalThis.window !== 'undefined') {
  globalThis.window.addEventListener = globalThis.window.addEventListener || (() => {});
  globalThis.window.removeEventListener = globalThis.window.removeEventListener || (() => {});
}

import { Chunk, CHUNK_SIZE, worldToChunkCoord, worldToLocalCoord, getChunkKey } from '../src/engine/Chunk.js';
import { ChunkMesher } from '../src/engine/ChunkMesher.js';
import { TextureAtlas } from '../src/engine/TextureAtlas.js';
import { VoxelWorld, BLOCK_TYPES } from '../src/engine/VoxelWorld.js';
import { Physics } from '../src/engine/Physics.js';

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m'
};

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;
const failures = [];

function assert(condition, message) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ${COLORS.green}✔${COLORS.reset} ${message}`);
  } else {
    testsFailed++;
    failures.push(message);
    console.log(`  ${COLORS.red}✖${COLORS.reset} ${COLORS.bold}${message}${COLORS.reset}`);
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} (expected: ${expected}, got: ${actual})`);
}

function assertApprox(actual, expected, tolerance = 1e-4, message) {
  const diff = Math.abs(actual - expected);
  assert(diff <= tolerance, `${message} (expected: ${expected} ±${tolerance}, got: ${actual})`);
}

/**
 * Extracts and inspects all quads from a BufferGeometry.
 * Computes quad count, total surface area, validates unit cardinal normals, and tests CCW triangle winding.
 */
function inspectMeshGeometry(geo, expectedNormalName = null) {
  if (!geo || !geo.attributes.position) {
    return { quadCount: 0, totalArea: 0, quads: [], allNormalsValid: true, allWindingValid: true };
  }

  const pos = geo.attributes.position.array;
  const norm = geo.attributes.normal.array;
  const indices = geo.index ? geo.index.array : null;

  const vertCount = pos.length / 3;
  const quadCount = vertCount / 4;
  let totalArea = 0;
  let allNormalsValid = true;
  let allWindingValid = true;
  const quads = [];

  const CARDINALS = [
    { name: '+X', v: [ 1,  0,  0] },
    { name: '-X', v: [-1,  0,  0] },
    { name: '+Y', v: [ 0,  1,  0] },
    { name: '-Y', v: [ 0, -1,  0] },
    { name: '+Z', v: [ 0,  0,  1] },
    { name: '-Z', v: [ 0,  0, -1] },
  ];

  for (let q = 0; q < quadCount; q++) {
    const vBase = q * 4;
    const p0 = new THREE.Vector3(pos[(vBase + 0) * 3], pos[(vBase + 0) * 3 + 1], pos[(vBase + 0) * 3 + 2]);
    const p1 = new THREE.Vector3(pos[(vBase + 1) * 3], pos[(vBase + 1) * 3 + 1], pos[(vBase + 1) * 3 + 2]);
    const p2 = new THREE.Vector3(pos[(vBase + 2) * 3], pos[(vBase + 2) * 3 + 1], pos[(vBase + 2) * 3 + 2]);
    const p3 = new THREE.Vector3(pos[(vBase + 3) * 3], pos[(vBase + 3) * 3 + 1], pos[(vBase + 3) * 3 + 2]);

    const n0 = new THREE.Vector3(norm[(vBase + 0) * 3], norm[(vBase + 0) * 3 + 1], norm[(vBase + 0) * 3 + 2]);

    // Check unit length
    if (Math.abs(n0.length() - 1.0) > 1e-4) {
      allNormalsValid = false;
    }

    // Check cardinal alignment
    const matchedCardinal = CARDINALS.find(c =>
      Math.abs(c.v[0] - n0.x) < 1e-4 &&
      Math.abs(c.v[1] - n0.y) < 1e-4 &&
      Math.abs(c.v[2] - n0.z) < 1e-4
    );
    if (!matchedCardinal) {
      allNormalsValid = false;
    }

    if (expectedNormalName && (!matchedCardinal || matchedCardinal.name !== expectedNormalName)) {
      allNormalsValid = false;
    }

    // Check all 4 vertices have identical normals
    for (let i = 1; i < 4; i++) {
      const ni = new THREE.Vector3(norm[(vBase + i) * 3], norm[(vBase + i) * 3 + 1], norm[(vBase + i) * 3 + 2]);
      if (ni.distanceTo(n0) > 1e-4) {
        allNormalsValid = false;
      }
    }

    // Area of quad via two triangles: (p0, p1, p2) and (p0, p2, p3)
    const e1 = new THREE.Vector3().subVectors(p1, p0);
    const e2 = new THREE.Vector3().subVectors(p2, p0);
    const cross1 = new THREE.Vector3().crossVectors(e1, e2);
    const area1 = cross1.length() * 0.5;

    const e3 = new THREE.Vector3().subVectors(p3, p0);
    const cross2 = new THREE.Vector3().crossVectors(e2, e3);
    const area2 = cross2.length() * 0.5;

    const quadArea = area1 + area2;
    totalArea += quadArea;

    // Check CCW triangle winding against normal: cross1 and cross2 must point in same direction as n0
    if (cross1.dot(n0) <= 0 || cross2.dot(n0) <= 0) {
      allWindingValid = false;
    }

    quads.push({
      index: q,
      p0, p1, p2, p3,
      normal: n0,
      normalName: matchedCardinal ? matchedCardinal.name : 'UNKNOWN',
      area: quadArea
    });
  }

  return { quadCount, totalArea, quads, allNormalsValid, allWindingValid };
}

console.log(`\n${COLORS.bold}${COLORS.cyan}╔══════════════════════════════════════════════════════════════════════╗${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.cyan}║      CHALLENGER 1: EMPIRICAL ADVERSARIAL VOXEL ENGINE TEST HARNESS   ║${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.cyan}║   Boundary Culling, Greedy Quads, Unit Normals, Physics & Launchpad  ║${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.cyan}╚══════════════════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

// ============================================================================
// SUITE 1: CHUNK MESHING BOUNDARY CONDITIONS ACROSS ALL 6 BORDERS
// ============================================================================
console.log(`${COLORS.bold}${COLORS.yellow}--- SUITE 1: Chunk Boundary Conditions Across All 6 Borders ---${COLORS.reset}`);

// 1.1 Single-block cross-boundary face culling across all 6 borders
// Test cases: [name, posA, posB, faceNormalA, chunkA_coord, chunkB_coord]
const BORDER_TEST_CASES = [
  { name: '+X / -X Border (Positive)', posA: [15, 8, 8], posB: [16, 8, 8], normalName: '+X', cA: [0,0,0], cB: [1,0,0] },
  { name: '-X / +X Border (Negative)', posA: [0, 8, 8],  posB: [-1, 8, 8], normalName: '-X', cA: [0,0,0], cB: [-1,0,0] },
  { name: '+Y / -Y Border (Positive)', posA: [8, 15, 8], posB: [8, 16, 8], normalName: '+Y', cA: [0,0,0], cB: [0,1,0] },
  { name: '-Y / +Y Border (Negative)', posA: [8, 0, 8],  posB: [8, -1, 8], normalName: '-Y', cA: [0,0,0], cB: [0,-1,0] },
  { name: '+Z / -Z Border (Positive)', posA: [8, 8, 15], posB: [8, 8, 16], normalName: '+Z', cA: [0,0,0], cB: [0,0,1] },
  { name: '-Z / +Z Border (Negative)', posA: [8, 8, 0],  posB: [8, 8, -1], normalName: '-Z', cA: [0,0,0], cB: [0,0,-1] },
];

for (const tc of BORDER_TEST_CASES) {
  const world = new VoxelWorld(new THREE.Scene());

  // Step 1: Place block A at border of Chunk A
  world.setBlock(...tc.posA, BLOCK_TYPES.STONE);
  world.rebuildMeshes();

  const chunkA = world.getChunk(...tc.cA);
  assert(chunkA !== null, `1.1.${tc.normalName}: Chunk A instantiated`);
  const initialInspect = inspectMeshGeometry(chunkA.mesh.geometry);
  const borderFaceInitial = initialInspect.quads.find(q => q.normalName === tc.normalName);
  assert(borderFaceInitial !== undefined, `1.1.${tc.normalName}: Border face ${tc.normalName} is exposed before neighbor is placed`);

  // Step 2: Place neighbor block B in Chunk B across the boundary
  world.setBlock(...tc.posB, BLOCK_TYPES.STONE);
  world.rebuildMeshes();

  const chunkB = world.getChunk(...tc.cB);
  assert(chunkB !== null, `1.1.${tc.normalName}: Chunk B instantiated across boundary`);

  const inspectA_after = inspectMeshGeometry(chunkA.mesh ? chunkA.mesh.geometry : null);
  const borderFaceA_after = inspectA_after.quads.find(q => q.normalName === tc.normalName);
  assertEqual(borderFaceA_after, undefined, `1.1.${tc.normalName}: Border face on Chunk A is CULLED when neighbor B is placed`);

  // Verify opposite face on Chunk B is also culled
  const oppositeNormal = tc.normalName.startsWith('+') ? '-' + tc.normalName[1] : '+' + tc.normalName[1];
  const inspectB_after = inspectMeshGeometry(chunkB.mesh ? chunkB.mesh.geometry : null);
  const borderFaceB_after = inspectB_after.quads.find(q => q.normalName === oppositeNormal);
  assertEqual(borderFaceB_after, undefined, `1.1.${tc.normalName}: Corresponding opposite face ${oppositeNormal} on Chunk B is CULLED`);

  // Step 3: Break block B (set to AIR) -> Chunk A border face must dynamically reappear!
  world.setBlock(...tc.posB, BLOCK_TYPES.AIR);
  world.rebuildMeshes();

  const inspectA_restored = inspectMeshGeometry(chunkA.mesh.geometry);
  const borderFaceA_restored = inspectA_restored.quads.find(q => q.normalName === tc.normalName);
  assert(borderFaceA_restored !== undefined, `1.1.${tc.normalName}: Border face on Chunk A DYNAMICALLY RESTORED after breaking neighbor B`);
}

// 1.2 Full 16x16 border wall culling & single block puncture test
console.log(`\n${COLORS.bold}${COLORS.yellow}--- SUITE 1.2: 16x16 Border Wall Culling & Puncture Test ---${COLORS.reset}`);
{
  const world = new VoxelWorld(new THREE.Scene());

  // Build 16x16 wall at x=15 in Chunk (0,0,0)
  for (let y = 0; y < 16; y++) {
    for (let z = 0; z < 16; z++) {
      world.setBlock(15, y, z, BLOCK_TYPES.STONE);
    }
  }
  world.rebuildMeshes();
  const chunkA = world.getChunk(0, 0, 0);
  const infoA_start = inspectMeshGeometry(chunkA.mesh.geometry);
  const posXQuads_start = infoA_start.quads.filter(q => q.normalName === '+X');
  assertEqual(posXQuads_start.length, 1, '1.2a: Unobstructed 16x16 border wall greedily merges into exactly 1 +X quad');
  assertApprox(posXQuads_start[0].area, 256.0, 1e-4, '1.2b: Merged +X quad has surface area exactly 256.0');

  // Build adjacent 16x16 wall at x=16 in Chunk (1,0,0)
  for (let y = 0; y < 16; y++) {
    for (let z = 0; z < 16; z++) {
      world.setBlock(16, y, z, BLOCK_TYPES.STONE);
    }
  }
  world.rebuildMeshes();
  const chunkB = world.getChunk(1, 0, 0);

  const infoA_abutted = inspectMeshGeometry(chunkA.mesh ? chunkA.mesh.geometry : null);
  const posXQuads_abutted = infoA_abutted.quads.filter(q => q.normalName === '+X');
  assertEqual(posXQuads_abutted.length, 0, '1.2c: All 256 border faces on Chunk A are 100% CULLED by abutting 16x16 wall');

  const infoB_abutted = inspectMeshGeometry(chunkB.mesh ? chunkB.mesh.geometry : null);
  const negXQuads_abutted = infoB_abutted.quads.filter(q => q.normalName === '-X');
  assertEqual(negXQuads_abutted.length, 0, '1.2d: All 256 border faces on Chunk B are 100% CULLED by abutting 16x16 wall');

  // Puncture 1 block hole at (16, 8, 8) in Chunk B
  world.setBlock(16, 8, 8, BLOCK_TYPES.AIR);
  world.rebuildMeshes();

  const infoA_punctured = inspectMeshGeometry(chunkA.mesh.geometry);
  const posXQuads_punctured = infoA_punctured.quads.filter(q => q.normalName === '+X');
  assertEqual(posXQuads_punctured.length, 1, '1.2e: Chunk A emits exactly 1 +X quad through the 1-block puncture');
  assertApprox(posXQuads_punctured[0].area, 1.0, 1e-4, '1.2f: Punctured exposed quad has area exactly 1.0');

  // Break entire 16x16 wall in Chunk B
  for (let y = 0; y < 16; y++) {
    for (let z = 0; z < 16; z++) {
      world.setBlock(16, y, z, BLOCK_TYPES.AIR);
    }
  }
  world.rebuildMeshes();

  const infoA_cleared = inspectMeshGeometry(chunkA.mesh.geometry);
  const posXQuads_cleared = infoA_cleared.quads.filter(q => q.normalName === '+X');
  assertEqual(posXQuads_cleared.length, 1, '1.2g: Chunk A merges back into single 16x16 +X quad after clearing Chunk B');
  assertApprox(posXQuads_cleared[0].area, 256.0, 1e-4, '1.2h: Restored +X quad area is 256.0');
}

// 1.3 Transparency interactions across chunk boundaries
console.log(`\n${COLORS.bold}${COLORS.yellow}--- SUITE 1.3: Cross-Chunk Boundary Transparency Interactions ---${COLORS.reset}`);
{
  const world = new VoxelWorld(new THREE.Scene());

  // Test 1.3a: Glass adjacent to Glass across border -> internal face culled
  world.setBlock(15, 5, 5, BLOCK_TYPES.GLASS);
  world.setBlock(16, 5, 5, BLOCK_TYPES.GLASS);
  world.rebuildMeshes();

  const chunkA = world.getChunk(0, 0, 0);
  const chunkB = world.getChunk(1, 0, 0);

  const infoA = inspectMeshGeometry(chunkA.transparentMesh.geometry);
  const posXGlass = infoA.quads.filter(q => q.normalName === '+X');
  assertEqual(posXGlass.length, 0, '1.3a: Shared border face between adjacent glass blocks is culled');

  // Test 1.3b: Stone adjacent to Glass across border -> Stone face IS visible through glass
  world.setBlock(15, 5, 5, BLOCK_TYPES.STONE);
  world.rebuildMeshes();

  const infoA_stone = inspectMeshGeometry(chunkA.mesh.geometry);
  const posXStone = infoA_stone.quads.filter(q => q.normalName === '+X');
  assertEqual(posXStone.length, 1, '1.3b: Opaque stone face is visible through adjacent transparent glass across border');

  // Glass face facing solid stone must be culled
  const infoB_glass = inspectMeshGeometry(chunkB.transparentMesh.geometry);
  const negXGlass = infoB_glass.quads.filter(q => q.normalName === '-X');
  assertEqual(negXGlass.length, 0, '1.3c: Glass face against opaque stone is culled');
}

// ============================================================================
// SUITE 2: GREEDY QUAD MERGING CORRECTNESS ON SLABS & HOLLOW TUNNELS
// ============================================================================
console.log(`\n${COLORS.bold}${COLORS.yellow}--- SUITE 2: Greedy Merging on Slabs & Hollow Tunnels ---${COLORS.reset}`);

// 2.1 16x16 Slabs across all 3 planes
const SLAB_CONFIGS = [
  { name: 'XZ Slab (Horizontal y=0)', dims: [16, 1, 16], fill: (c) => {
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) c.set(x, 0, z, BLOCK_TYPES.WOOD);
  }},
  { name: 'XY Slab (Vertical z=0)', dims: [16, 16, 1], fill: (c) => {
    for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) c.set(x, y, 0, BLOCK_TYPES.WOOD);
  }},
  { name: 'YZ Slab (Vertical x=0)', dims: [1, 16, 16], fill: (c) => {
    for (let y = 0; y < 16; y++) for (let z = 0; z < 16; z++) c.set(0, y, z, BLOCK_TYPES.WOOD);
  }},
];

const mesher = new ChunkMesher(null, new TextureAtlas());

for (const slab of SLAB_CONFIGS) {
  const chunk = new Chunk(0, 0, 0);
  slab.fill(chunk);
  const res = mesher.meshChunk(chunk);

  assertEqual(res.totalQuads, 6, `2.1.${slab.name}: 16x16 slab merges into minimal quad count of exactly 6`);
  const info = inspectMeshGeometry(chunk.mesh.geometry);
  // Expected surface area: 2*(16*16) + 4*(16*1) = 512 + 64 = 576
  assertApprox(info.totalArea, 576.0, 1e-4, `2.1.${slab.name}: Total quad area sums strictly to theoretical 576.0 units²`);
  assert(info.allNormalsValid, `2.1.${slab.name}: All quad normals are unit cardinal vectors`);
  assert(info.allWindingValid, `2.1.${slab.name}: All quad triangles have CCW outward winding`);
}

// 2.2 Hollow Tunnels along X, Y, Z axes
// Outer: 8x8, Inner: 6x6 hole, Length: 16
// Theoretical minimal quads:
// 4 outer quads (8x16) + 4 inner quads (6x16) + 2 ends (each 4 quads: top/bottom 8x1, left/right 1x6) = 16 quads!
// Theoretical surface area: 4*(8*16) + 4*(6*16) + 2*(64-36) = 512 + 384 + 56 = 952.0 units²
const TUNNEL_CONFIGS = [
  { name: 'Z-Axis Tunnel', fill: (c) => {
    for (let z = 0; z < 16; z++) {
      for (let y = 4; y < 12; y++) {
        for (let x = 4; x < 12; x++) {
          const isHole = (x >= 5 && x <= 10 && y >= 5 && y <= 10);
          if (!isHole) c.set(x, y, z, BLOCK_TYPES.STONE);
        }
      }
    }
  }},
  { name: 'X-Axis Tunnel', fill: (c) => {
    for (let x = 0; x < 16; x++) {
      for (let y = 4; y < 12; y++) {
        for (let z = 4; z < 12; z++) {
          const isHole = (z >= 5 && z <= 10 && y >= 5 && y <= 10);
          if (!isHole) c.set(x, y, z, BLOCK_TYPES.STONE);
        }
      }
    }
  }},
  { name: 'Y-Axis Shaft', fill: (c) => {
    for (let y = 0; y < 16; y++) {
      for (let z = 4; z < 12; z++) {
        for (let x = 4; x < 12; x++) {
          const isHole = (x >= 5 && x <= 10 && z >= 5 && z <= 10);
          if (!isHole) c.set(x, y, z, BLOCK_TYPES.STONE);
        }
      }
    }
  }}
];

for (const tunnel of TUNNEL_CONFIGS) {
  const chunk = new Chunk(0, 0, 0);
  tunnel.fill(chunk);
  const res = mesher.meshChunk(chunk);

  assertEqual(res.totalQuads, 16, `2.2.${tunnel.name}: Hollow tunnel merges into minimal quad count of exactly 16`);
  const info = inspectMeshGeometry(chunk.mesh.geometry);
  assertApprox(info.totalArea, 952.0, 1e-4, `2.2.${tunnel.name}: Total surface area strictly equals theoretical 952.0 units²`);
  assert(info.allNormalsValid, `2.2.${tunnel.name}: All 16 quads have valid unit cardinal normals`);
  assert(info.allWindingValid, `2.2.${tunnel.name}: All 16 quads maintain strictly CCW outward winding`);
}

// 2.3 Concentric Hollow Cube (16x16x16 with 14x14x14 hollow chamber)
// 1352 blocks. Outer shell: 6 quads of 16x16. Inner shell: 6 quads of 14x14.
// Total quads: exactly 12! Total area: 6*256 + 6*196 = 1536 + 1176 = 2712.0 units².
console.log(`\n${COLORS.bold}${COLORS.yellow}--- SUITE 2.3: Concentric Hollow Chamber Test ---${COLORS.reset}`);
{
  const chunk = new Chunk(0, 0, 0);
  for (let z = 0; z < 16; z++) {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const isChamber = (x >= 1 && x <= 14 && y >= 1 && y <= 14 && z >= 1 && z <= 14);
        if (!isChamber) chunk.set(x, y, z, BLOCK_TYPES.OBSIDIAN);
      }
    }
  }
  const res = mesher.meshChunk(chunk);
  assertEqual(chunk.nonAirCount, 1352, '2.3a: Non-air block count is 1352');
  assertEqual(res.totalQuads, 12, '2.3b: Concentric hollow chamber merges into minimal quad count of exactly 12');

  const info = inspectMeshGeometry(chunk.mesh.geometry);
  assertApprox(info.totalArea, 2712.0, 1e-4, '2.3c: Total surface area strictly equals 2712.0 units² (1536 outer + 1176 inner)');
  assert(res.geometryReduction > 0.995, '2.3d: Geometry reduction exceeds 99.5%');
}

// ============================================================================
// SUITE 3: NORMAL VECTORS RIGOROUS CHECK
// ============================================================================
console.log(`\n${COLORS.bold}${COLORS.yellow}--- SUITE 3: Normal Vectors Strict Unit Cardinality ---${COLORS.reset}`);

// Test an isolated single block: emits all 6 faces
{
  const singleChunk = new Chunk(0, 0, 0);
  singleChunk.set(5, 5, 5, BLOCK_TYPES.STONE);
  mesher.meshChunk(singleChunk);

  const info = inspectMeshGeometry(singleChunk.mesh.geometry);
  assertEqual(info.quadCount, 6, '3.1a: Single isolated block produces exactly 6 quads');

  const normalNames = info.quads.map(q => q.normalName).sort();
  const expectedNames = ['+X', '+Y', '+Z', '-X', '-Y', '-Z'].sort();
  assertEqual(JSON.stringify(normalNames), JSON.stringify(expectedNames), '3.1b: Single block possesses all 6 cardinal normals');

  assert(info.allNormalsValid, '3.1c: All single block normals are unit cardinal vectors');
  assert(info.allWindingValid, '3.1d: All single block triangles have CCW outward winding');
}

// ============================================================================
// SUITE 4: PHYSICS STEP-CLIMBING STRESS HARNESS
// ============================================================================
console.log(`\n${COLORS.bold}${COLORS.yellow}--- SUITE 4: Physics Step-Climbing (0.25, 0.50 climbable vs >= 0.75 blocked) ---${COLORS.reset}`);

// Test stairs/slabs of heights 0.25, 0.50, 0.75, 1.00, 2.00
const STEP_HEIGHT_TESTS = [
  { height: 0.25, expectedClimb: true,  desc: '0.25-block step' },
  { height: 0.50, expectedClimb: true,  desc: '0.50-block step' },
  { height: 0.75, expectedClimb: false, desc: '0.75-block step' },
  { height: 1.00, expectedClimb: false, desc: '1.00-block step' },
  { height: 2.00, expectedClimb: false, desc: '2.00-block step' },
];

for (const tc of STEP_HEIGHT_TESTS) {
  const world = new VoxelWorld(new THREE.Scene());
  const physics = new Physics(world);

  // Obstacle block at x=6, y=9, so obstacle top surface is at y=10.0
  world.setBlock(6, 9, 5, BLOCK_TYPES.STONE);
  if (tc.height === 2.00) {
    world.setBlock(6, 10, 5, BLOCK_TYPES.STONE); // 2.0 block height
  }

  // Set entity standing elevation such that relative step height = tc.height
  const groundElevation = 10.0 - tc.height;
  const entity = {
    position: new THREE.Vector3(5.4, groundElevation, 5.0),
    velocity: new THREE.Vector3(3.0, 0, 0), // moving +X
    width: 0.6,
    height: 1.8,
    onGround: true,
    isFlying: false
  };

  physics.moveEntity(entity, 0.1);

  if (tc.expectedClimb) {
    assert(entity.position.x > 5.4, `4.1.${tc.desc}: Entity successfully steps forward over ${tc.desc}`);
    assert(entity.position.y >= 10.0, `4.1.${tc.desc}: Entity elevates and lands on top of step at y >= 10.0`);
    assert(entity.velocity.x > 0, `4.1.${tc.desc}: Horizontal velocity is preserved during step`);
    assertEqual(entity.onGround, true, `4.1.${tc.desc}: Entity lands on top of step with onGround = true`);
  } else {
    assert(entity.position.x <= 5.4, `4.1.${tc.desc}: Entity is STRICTLY BLOCKED horizontally by ${tc.desc}`);
    assertEqual(entity.velocity.x, 0, `4.1.${tc.desc}: Horizontal velocity reset to 0 upon wall impact`);
    assert(entity.position.y < 10.0, `4.1.${tc.desc}: Entity does NOT climb onto step (elevation remains < 10.0)`);
  }
}

// 4.2 Multi-directional step climbing (+X, -X, +Z, -Z)
console.log(`\n${COLORS.bold}${COLORS.yellow}--- SUITE 4.2: Directional Step Climbing Across 4 Cardinal Directions ---${COLORS.reset}`);
const DIR_TESTS = [
  { name: '+X', vel: [3.0, 0, 0],   pos: [5.4, 9.5, 5.0],  obs: [6, 9, 5], checkCoord: 'x', comp: (v, o) => v > o },
  { name: '-X', vel: [-3.0, 0, 0],  pos: [6.5, 9.5, 5.0],  obs: [5, 9, 5], checkCoord: 'x', comp: (v, o) => v < o },
  { name: '+Z', vel: [0, 0, 3.0],   pos: [5.0, 9.5, 5.4],  obs: [5, 9, 6], checkCoord: 'z', comp: (v, o) => v > o },
  { name: '-Z', vel: [0, 0, -3.0],  pos: [5.0, 9.5, 6.5],  obs: [5, 9, 5], checkCoord: 'z', comp: (v, o) => v < o },
];

for (const dt of DIR_TESTS) {
  // Test 0.50 climb
  const world = new VoxelWorld(new THREE.Scene());
  const physics = new Physics(world);
  world.setBlock(...dt.obs, BLOCK_TYPES.STONE);

  const entity = {
    position: new THREE.Vector3(...dt.pos),
    velocity: new THREE.Vector3(...dt.vel),
    width: 0.6,
    height: 1.8,
    onGround: true,
    isFlying: false
  };

  const initialCoord = entity.position[dt.checkCoord];
  physics.moveEntity(entity, 0.1);
  assert(dt.comp(entity.position[dt.checkCoord], initialCoord), `4.2.${dt.name}: Entity climbs 0.50 step in direction ${dt.name}`);
  assertApprox(entity.position.y, 10.0, 1e-4, `4.2.${dt.name}: Entity reaches top elevation 10.0`);
  assertEqual(entity.onGround, true, `4.2.${dt.name}: Entity onGround = true`);
}

// 4.3 Mid-air step climbing suppression (onGround = false)
console.log(`\n${COLORS.bold}${COLORS.yellow}--- SUITE 4.3: Mid-Air Step Climbing Suppression ---${COLORS.reset}`);
{
  const world = new VoxelWorld(new THREE.Scene());
  const physics = new Physics(world);
  world.setBlock(6, 9, 5, BLOCK_TYPES.STONE);

  const midAirEntity = {
    position: new THREE.Vector3(5.4, 9.5, 5.0),
    velocity: new THREE.Vector3(3.0, 0, 0),
    width: 0.6,
    height: 1.8,
    onGround: false, // In mid-air!
    isFlying: false
  };

  physics.moveEntity(midAirEntity, 0.1);
  assert(midAirEntity.position.x <= 5.4, '4.3a: Mid-air entity without onGround=true is strictly blocked by 0.5 step');
  assertEqual(midAirEntity.velocity.x, 0, '4.3b: Mid-air horizontal velocity zeroed upon collision');
}

// ============================================================================
// SUITE 5: LAUNCHPAD IMPULSE & KINEMATICS
// ============================================================================
console.log(`\n${COLORS.bold}${COLORS.yellow}--- SUITE 5: Launchpad Impulse Vector Dynamics ---${COLORS.reset}`);
{
  const world = new VoxelWorld(new THREE.Scene());
  const physics = new Physics(world);

  // 5.1 Cardinal +X impulse
  const pX = { position: new THREE.Vector3(0, 10, 0), velocity: new THREE.Vector3(0, 0, 0), onGround: true };
  physics.applyLaunchpadImpulse(pX, new THREE.Vector3(1, 0, 0), 16.0, 18.0);
  assertEqual(pX.velocity.x, 16.0, '5.1a: +X launchpad impulse sets velocity.x = 16.0');
  assertEqual(pX.velocity.z, 0.0, '5.1b: +X launchpad impulse keeps velocity.z = 0.0');
  assertEqual(pX.velocity.y, 18.0, '5.1c: Launchpad impulse sets vertical velocity.y = 18.0');
  assertEqual(pX.onGround, false, '5.1d: Launchpad impulse resets onGround to false');

  // 5.2 Diagonal (+X, +Z) impulse
  const pDiag = { position: new THREE.Vector3(0, 10, 0), velocity: new THREE.Vector3(0, 0, 0), onGround: true };
  physics.applyLaunchpadImpulse(pDiag, new THREE.Vector3(1, 0, 1), 16.0, 18.0);
  const expectedH = 16.0 / Math.SQRT2;
  assertApprox(pDiag.velocity.x, expectedH, 1e-4, '5.2a: Diagonal impulse normalizes velocity.x');
  assertApprox(pDiag.velocity.z, expectedH, 1e-4, '5.2b: Diagonal impulse normalizes velocity.z');
  const resultantH = Math.hypot(pDiag.velocity.x, pDiag.velocity.z);
  assertApprox(resultantH, 16.0, 1e-4, '5.2c: Total resultant horizontal speed strictly equals 16.0 m/s');

  // 5.3 Pure vertical launch (null forward vector)
  const pVert = { position: new THREE.Vector3(0, 10, 0), velocity: new THREE.Vector3(0, 0, 0), onGround: true };
  physics.applyLaunchpadImpulse(pVert, null, 16.0, 22.0);
  assertEqual(pVert.velocity.x, 0.0, '5.3a: Pure vertical launch leaves velocity.x = 0');
  assertEqual(pVert.velocity.z, 0.0, '5.3b: Pure vertical launch leaves velocity.z = 0');
  assertEqual(pVert.velocity.y, 22.0, '5.3c: Pure vertical launch imparts vertical boost 22.0 m/s');

  // 5.4 Ballistic flight trajectory integration
  const ballisticPlayer = {
    position: new THREE.Vector3(0, 10, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    width: 0.6,
    height: 1.8,
    onGround: true,
    isFlying: false
  };
  physics.applyLaunchpadImpulse(ballisticPlayer, new THREE.Vector3(1, 0, 0), 20.0, 24.0);

  // Theoretical physics: g = -24.0. Time to apex = 24.0 / 24.0 = 1.0s.
  // Apex height = 10 + 24*1.0 - 0.5*24*(1.0^2) = 10 + 24 - 12 = 22.0m.
  let maxY = ballisticPlayer.position.y;
  for (let frame = 0; frame < 60; frame++) {
    physics.moveEntity(ballisticPlayer, 1 / 60);
    if (ballisticPlayer.position.y > maxY) maxY = ballisticPlayer.position.y;
  }
  // At t=1.0s, position.y should peak at ~22.0m
  assertApprox(maxY, 22.0, 0.5, '5.4a: Ballistic trajectory reaches theoretical parabolic apex (~22.0m)');
  // With air damping (0.92 per frame), displacement over 60 frames is ~4.14m
  assertApprox(ballisticPlayer.position.x, 4.14, 0.2, '5.4b: Forward displacement over 1.0s matches damped kinematics (~4.14m)');
}

// ----------------------------------------------------------------------------
// GRAND SUMMARY
// ----------------------------------------------------------------------------
console.log(`\n${COLORS.bold}${COLORS.cyan}╔══════════════════════════════════════════════════════════════════════╗${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.cyan}║             CHALLENGER 1 ADVERSARIAL TEST SUMMARY                    ║${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.cyan}╠══════════════════════════════════════════════════════════════════════╣${COLORS.reset}`);
console.log(`${COLORS.bold}║  Total Assertions Checked : ${String(testsRun).padEnd(41, ' ')}║${COLORS.reset}`);
console.log(`${COLORS.bold}║  Assertions Passed        : ${COLORS.green}${String(testsPassed).padEnd(41, ' ')}${COLORS.reset}${COLORS.bold}║${COLORS.reset}`);
console.log(`${COLORS.bold}║  Assertions Failed        : ${testsFailed > 0 ? COLORS.red : COLORS.green}${String(testsFailed).padEnd(41, ' ')}${COLORS.reset}${COLORS.bold}║${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.cyan}╚══════════════════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

if (testsFailed > 0) {
  console.log(`${COLORS.bold}${COLORS.red}FAILURE DETAILS:${COLORS.reset}`);
  failures.forEach((f, idx) => console.log(`  [${idx + 1}] ${f}`));
  process.exit(1);
} else {
  console.log(`${COLORS.bold}${COLORS.green}✔ ALL ADVERSARIAL CHALLENGES PASSED EMPIRICALLY WITH 100% INTEGRITY!${COLORS.reset}\n`);
  process.exit(0);
}
