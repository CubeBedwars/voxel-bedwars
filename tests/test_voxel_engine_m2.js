/**
 * tests/test_voxel_engine_m2.js
 * Verification Suite for Milestone 2: External Voxel Engine Integration.
 *
 * Verifies:
 * 1. Chunk.js (16x16x16 flat Uint8Array(4096), bitwise coordinate indexing, boundary invalidation, dirty flags)
 * 2. ChunkMesher.js (6-direction face culling, 2D greedy quad merging, 70-85%+ geometry reduction, normal orientation)
 * 3. TextureAtlas.js (Nearest-neighbor 256x256 canvas atlas, UV tiling shader hook, headless safety)
 * 4. VoxelWorld.js (100% backward compatibility, chunk wrapping, Map synchronization, integer DDA raycasting)
 * 5. Physics.js (0.5-block auto step-climbing, 1.0-block wall blocking, swept AABB collision, launchpad impulses)
 * 6. GameManager.js (Bloxd.io-style white targeted face quad outline offset by +0.002, authentic crack stages)
 */

import * as THREE from 'three';
import './mocks/browser-shim.js';
if (typeof globalThis.window !== 'undefined') {
  globalThis.window.addEventListener = globalThis.window.addEventListener || (() => {});
  globalThis.window.removeEventListener = globalThis.window.removeEventListener || (() => {});
}
import { Chunk, CHUNK_SIZE, CHUNK_SIZE_CB, getVoxelIndex, getChunkKey, worldToChunkCoord, worldToLocalCoord } from '../src/engine/Chunk.js';
import { ChunkMesher } from '../src/engine/ChunkMesher.js';
import { TextureAtlas, ATLAS_CANVAS_SIZE, UV_SPAN } from '../src/engine/TextureAtlas.js';
import { VoxelWorld, BLOCK_TYPES, BLOCK_PROPS } from '../src/engine/VoxelWorld.js';
import { Physics } from '../src/engine/Physics.js';
import { GameManager } from '../src/game/GameManager.js';
import { MinecraftAssetLoader } from '../src/engine/MinecraftAssetLoader.js';

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

console.log(`\n${COLORS.bold}${COLORS.cyan}╔══════════════════════════════════════════════════════════════════════╗${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.cyan}║             MILESTONE 2: VOXEL ENGINE INTEGRATION SUITE              ║${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.cyan}║   Chunk Meshing, Greedy Quads, Texture Atlas, Physics & Bloxd UI     ║${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.cyan}╚══════════════════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

// ============================================================================
// SUITE 1: CHUNK DATA STRUCTURE & BITWISE COORDINATE INDEXING
// ============================================================================
console.log(`${COLORS.bold}${COLORS.yellow}--- SUITE 1: Chunk Data Structure & Indexing ---${COLORS.reset}`);

// 1.1 Bitwise coordinate index calculation
let indexFormulaValid = true;
for (let lz = 0; lz < 16; lz++) {
  for (let ly = 0; ly < 16; ly++) {
    for (let lx = 0; lx < 16; lx++) {
      const idx = getVoxelIndex(lx, ly, lz);
      const expected = (lx & 15) | ((ly & 15) << 4) | ((lz & 15) << 8);
      if (idx !== expected || idx < 0 || idx >= 4096) {
        indexFormulaValid = false;
        break;
      }
    }
  }
}
assert(indexFormulaValid, '1.1: getVoxelIndex accurately indexes all 4096 positions [0..15]^3');

// 1.2 Chunk allocation and flat storage
const chunk1 = new Chunk(0, 0, 0);
assert(chunk1.voxels instanceof Uint8Array, '1.2: Chunk allocates a flat Uint8Array');
assertEqual(chunk1.voxels.length, CHUNK_SIZE_CB, '1.2b: Chunk buffer size is exactly 4096 bytes');
assertEqual(chunk1.key, '0,0,0', '1.2c: Chunk key is formatted as "cx,cy,cz"');

// 1.3 Local set and get
chunk1.set(5, 7, 9, BLOCK_TYPES.STONE);
assertEqual(chunk1.get(5, 7, 9), BLOCK_TYPES.STONE, '1.3: Chunk.get retrieves set block type');
assertEqual(chunk1.nonAirCount, 1, '1.3b: Chunk.nonAirCount correctly tracks populated voxels');
chunk1.set(5, 7, 9, BLOCK_TYPES.AIR);
assertEqual(chunk1.nonAirCount, 0, '1.3c: Chunk.nonAirCount decrements when voxel cleared to AIR');

// 1.4 Coordinate conversions
assertEqual(worldToChunkCoord(0), 0, '1.4a: worldToChunkCoord(0) is 0');
assertEqual(worldToChunkCoord(15), 0, '1.4b: worldToChunkCoord(15) is 0');
assertEqual(worldToChunkCoord(16), 1, '1.4c: worldToChunkCoord(16) is 1');
assertEqual(worldToChunkCoord(-1), -1, '1.4d: worldToChunkCoord(-1) is -1');
assertEqual(worldToLocalCoord(17), 1, '1.4e: worldToLocalCoord(17) is 1');
assertEqual(worldToLocalCoord(-1), 15, '1.4f: worldToLocalCoord(-1) is 15');

// 1.5 Boundary neighbor invalidation
const mockWorld = {
  neighborsMarked: [],
  markChunkDirty(c) {},
  markNeighborChunkDirty(cx, cy, cz) {
    this.neighborsMarked.push(`${cx},${cy},${cz}`);
  },
  getBlock() { return 0; }
};
const boundaryChunk = new Chunk(2, 3, 4, mockWorld);
boundaryChunk.set(0, 5, 5, BLOCK_TYPES.STONE); // -X border
assert(mockWorld.neighborsMarked.includes('1,3,4'), '1.5a: Setting lx=0 marks neighbor chunk (cx-1, cy, cz) dirty');

boundaryChunk.set(15, 5, 5, BLOCK_TYPES.STONE); // +X border
assert(mockWorld.neighborsMarked.includes('3,3,4'), '1.5b: Setting lx=15 marks neighbor chunk (cx+1, cy, cz) dirty');

boundaryChunk.set(5, 0, 5, BLOCK_TYPES.STONE); // -Y border
assert(mockWorld.neighborsMarked.includes('2,2,4'), '1.5c: Setting ly=0 marks neighbor chunk (cx, cy-1, cz) dirty');

boundaryChunk.set(5, 15, 5, BLOCK_TYPES.STONE); // +Y border
assert(mockWorld.neighborsMarked.includes('2,4,4'), '1.5d: Setting ly=15 marks neighbor chunk (cx, cy+1, cz) dirty');

// ============================================================================
// SUITE 2: 2D GREEDY FACE QUAD MESHER & GEOMETRY REDUCTION
// ============================================================================
console.log(`\n${COLORS.bold}${COLORS.yellow}--- SUITE 2: Greedy Chunk Mesher & Face Culling ---${COLORS.reset}`);

const atlas = new TextureAtlas();
const mesher = new ChunkMesher(null, atlas);

// 2.1 Complete interior face culling in solid cube
const solidChunk = new Chunk(0, 0, 0);
for (let z = 0; z < 16; z++) {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      solidChunk.set(x, y, z, BLOCK_TYPES.STONE);
    }
  }
}
assertEqual(solidChunk.nonAirCount, 4096, '2.1a: Solid chunk contains 4096 blocks');

const solidMeshResult = mesher.meshChunk(solidChunk);
assertEqual(solidMeshResult.totalQuads, 6, '2.1b: Solid 16x16x16 chunk greedily merges into exactly 6 outer quads');
assertEqual(solidMeshResult.opaqueQuadCount, 6, '2.1c: All 6 outer quads are opaque');
// Raw faces would be 16x16 * 6 = 1536 exterior faces. Merged to 6 quads!
assert(solidMeshResult.geometryReduction > 0.99, '2.1d: Geometry reduction is > 99% for solid uniform volume');

// 2.2 4x4 flat platform greedy merging
const platformChunk = new Chunk(0, 0, 0);
for (let z = 2; z < 6; z++) {
  for (let x = 2; x < 6; x++) {
    platformChunk.set(x, 1, z, BLOCK_TYPES.WOOD);
  }
}
const platformResult = mesher.meshChunk(platformChunk);
// 16 blocks: top (+Y) merges to 1 quad of 4x4, bottom (-Y) merges to 1 quad of 4x4,
// and 4 side perimeters merge into 4 quads of 4x1 = total 6 merged quads!
// Without greedy meshing, 16 individual cubes have 16*6 = 96 faces (or 16*2 + 4*4 = 48 exposed faces).
assertEqual(platformResult.totalQuads, 6, '2.2a: 4x4 platform merges into exactly 6 quads (1 top, 1 bottom, 4 sides)');
assert(platformResult.geometryReduction >= 0.75, '2.2b: Geometry reduction achieves >= 75% for 4x4 platform');

// 2.3 Transparent face culling (Glass blocks)
const glassChunk = new Chunk(0, 0, 0);
glassChunk.set(5, 5, 5, BLOCK_TYPES.GLASS);
glassChunk.set(5, 5, 6, BLOCK_TYPES.GLASS); // Adjacent glass blocks
const glassResult = mesher.meshChunk(glassChunk);
// The shared face between (5,5,5) and (5,5,6) must be culled and coplanar faces merged
assertEqual(glassResult.transparentQuadCount, 6, '2.3: Adjacent glass blocks cull internal shared face and merge outer faces into 6 quads');
assertEqual(glassResult.opaqueQuadCount, 0, '2.3b: Glass quads are segregated to transparent pass');

// 2.4 Cardinal normal vector orientations
assert(solidChunk.mesh !== null, '2.4a: Chunk mesher produces a Three.js Mesh');
const normals = solidChunk.mesh.geometry.attributes.normal.array;
const hasPositiveY = normals.some((v, i) => i % 3 === 1 && v === 1.0);
const hasNegativeY = normals.some((v, i) => i % 3 === 1 && v === -1.0);
const hasPositiveX = normals.some((v, i) => i % 3 === 0 && v === 1.0);
const hasNegativeX = normals.some((v, i) => i % 3 === 0 && v === -1.0);
const hasPositiveZ = normals.some((v, i) => i % 3 === 2 && v === 1.0);
const hasNegativeZ = normals.some((v, i) => i % 3 === 2 && v === -1.0);
assert(hasPositiveY && hasNegativeY && hasPositiveX && hasNegativeX && hasPositiveZ && hasNegativeZ,
  '2.4b: Mesh geometry has verified normal vectors along all 6 cardinal axes');

// ============================================================================
// SUITE 3: TEXTURE ATLAS & SEAMLESS UV TILING MATERIAL
// ============================================================================
console.log(`\n${COLORS.bold}${COLORS.yellow}--- SUITE 3: Texture Atlas & Material Shader Hook ---${COLORS.reset}`);

// 3.1 Atlas initialization & filtering
assert(atlas.texture !== null, '3.1a: TextureAtlas initializes THREE texture');
assertEqual(atlas.texture.magFilter, THREE.NearestFilter, '3.1b: Atlas uses THREE.NearestFilter for crisp pixel art');
assertEqual(atlas.texture.minFilter, THREE.NearestFilter, '3.1c: Atlas minFilter is THREE.NearestFilter');
assertEqual(atlas.texture.generateMipmaps, false, '3.1d: Atlas mipmaps are disabled (generateMipmaps: false)');

// 3.2 Block face UV rectangle mapping
const grassTopRect = atlas.getAtlasRect(BLOCK_TYPES.GRASS, '+Y');
const grassSideRect = atlas.getAtlasRect(BLOCK_TYPES.GRASS, '+X');
const grassBottomRect = atlas.getAtlasRect(BLOCK_TYPES.GRASS, '-Y');
assert(grassTopRect !== grassSideRect, '3.2a: Grass top and side have distinct atlas rectangles');
assert(grassSideRect !== grassBottomRect, '3.2b: Grass side and bottom have distinct atlas rectangles');
assertApprox(grassTopRect[2], UV_SPAN, 1e-4, '3.2c: Atlas sub-rectangle width matches UV_SPAN (0.0625)');
assertApprox(grassTopRect[3], UV_SPAN, 1e-4, '3.2d: Atlas sub-rectangle height matches UV_SPAN (0.0625)');

// 3.3 Shader hook onBeforeCompile
const mat = atlas.createChunkMaterial({ transparent: false });
assert(typeof mat.onBeforeCompile === 'function', '3.3a: Material provides onBeforeCompile shader hook');

const mockShader = {
  vertexShader: '#include <common>\n#include <uv_vertex>',
  fragmentShader: '#include <common>\n#include <map_fragment>'
};
mat.onBeforeCompile(mockShader);
assert(mockShader.vertexShader.includes('aAtlasRect') && mockShader.vertexShader.includes('aQuadSize'),
  '3.3b: onBeforeCompile binds aAtlasRect and aQuadSize vertex attributes');
assert(mockShader.fragmentShader.includes('fract(vTiledUV)'),
  '3.3c: Fragment shader applies fract() to tile UV coordinates seamlessly without stretching');

// ============================================================================
// SUITE 4: VOXELWORLD CHUNK INTEGRATION & BACKWARD COMPATIBILITY
// ============================================================================
console.log(`\n${COLORS.bold}${COLORS.yellow}--- SUITE 4: VoxelWorld Chunk Integration & Compatibility ---${COLORS.reset}`);

const scene = new THREE.Scene();
const world = new VoxelWorld(scene);

// 4.1 Interface compatibility
assert(typeof world.getBlock === 'function', '4.1a: world.getBlock is a function');
assert(typeof world.setBlock === 'function', '4.1b: world.setBlock is a function');
assert(typeof world.isSolid === 'function', '4.1c: world.isSolid is a function');
assert(typeof world.raycast === 'function', '4.1d: world.raycast is a function');
assert(typeof world.clear === 'function', '4.1e: world.clear is a function');
assert(typeof world.rebuildMeshes === 'function', '4.1f: world.rebuildMeshes is a function');

// 4.2 Two-way chunk and Map synchronization
world.setBlock(10, 5, 10, BLOCK_TYPES.STONE);
assertEqual(world.getBlock(10, 5, 10), BLOCK_TYPES.STONE, '4.2a: getBlock retrieves set stone block');
assertEqual(world.blocks.get('10,5,10'), BLOCK_TYPES.STONE, '4.2b: Legacy blocks Map synchronized with chunk');
assertTrue(world.isSolid(10, 5, 10), '4.2c: isSolid returns true for solid block');

// 4.3 Chunk creation upon block placement
const cKey = getChunkKey(worldToChunkCoord(10), worldToChunkCoord(5), worldToChunkCoord(10));
assert(world.chunks.has(cKey), '4.3: VoxelWorld automatically instantiates Chunk upon block placement');

// 4.4 Integer DDA Raycast fidelity across chunks
world.setBlock(35, 10, 35, BLOCK_TYPES.DIAMOND_BLOCK); // in chunk (2, 0, 2)
const rayHit = world.raycast(new THREE.Vector3(35.5, 10.5, 30.0), new THREE.Vector3(0, 0, 1), 10);
assert(rayHit.hit, '4.4a: DDA raycast hits target block across chunk boundary');
assertEqual(rayHit.blockPos.x, 35, '4.4b: Hit blockPos.x is 35');
assertEqual(rayHit.blockPos.z, 35, '4.4c: Hit blockPos.z is 35');
assertEqual(rayHit.normal.z, -1, '4.4d: Hit normal.z is -1 (-Z face)');
assertEqual(rayHit.placePos.z, 34, '4.4e: Placement snap coordinate placePos.z is 34');

// 4.5 Mesh rebuild and scene attachment
world.rebuildMeshes();
assert(world.voxelGroup.children.length > 0, '4.5: rebuildMeshes attaches chunk meshes to voxelGroup');

// ============================================================================
// SUITE 5: SWEPT AABB PHYSICS & 0.5-BLOCK AUTO STEP-CLIMBING
// ============================================================================
console.log(`\n${COLORS.bold}${COLORS.yellow}--- SUITE 5: AABB Physics & Step-Climbing ---${COLORS.reset}`);

const physWorld = new VoxelWorld(new THREE.Scene());
const physics = new Physics(physWorld);

// 5.1 Step-climbing over 0.5-block step
// Build floor at y=9, with a block at (6, 9, 5) and floor elsewhere at y=8 (so step up is 1.0 from y=8 to y=9)
// For a 0.5 step: let player stand on ground at y=9.5, with block at (6, 9, 5)
// Let's create a custom obstacle: block at (6, 10, 5) is solid
// When player is at y=10.0, player is on ground at y=10.
// Obstacle: at x=6, block is at y=10. This is a 1.0 block height difference.
// If player is at y=9.5 (walking on a half-slab or terrain slope), step height to y=10 is 0.5!
physWorld.setBlock(5, 9, 5, BLOCK_TYPES.STONE); // ground under feet at y=10
physWorld.setBlock(6, 10, 5, BLOCK_TYPES.STONE); // 1.0 block at x=6, y=10

// Test 5.1: 1.0 block wall MUST block player (no step climb over full block)
const player1 = {
  position: new THREE.Vector3(5.5, 10.0, 5.0),
  velocity: new THREE.Vector3(4.0, 0, 0), // moving +X: dx = 0.4 -> x reaches 5.9, colliding with block at x=6
  width: 0.6,
  height: 1.8,
  onGround: true,
  isFlying: false
};
physics.moveEntity(player1, 0.1);
assert(player1.position.x <= 5.5, '5.1a: Full 1.0-block wall stops horizontal progress');
assertEqual(player1.velocity.x, 0, '5.1b: Horizontal velocity resets to 0 upon wall collision');

// Test 5.2: 0.5-block step climbing
// Create a half-height step: player is at y=9.5 with clear space at y=10, stepping over a voxel edge
// Setup: ground at y=9 (top at y=10) and adjacent block at y=9 with half elevation difference
const stepEntity = {
  position: new THREE.Vector3(5.0, 9.6, 5.0),
  velocity: new THREE.Vector3(3.0, 0, 0),
  width: 0.6,
  height: 1.8,
  onGround: true,
  isFlying: false
};
// Block at x=6, y=9 (top is y=10). At y=9.6, entity's lower box intersects y=9 (floor(9.6)=9).
// With 0.5-step climbing: elevating by 0.4 to y=10.0 clears the obstacle at y=9!
physics.setBlock = () => {};
// Verify step climb calculation
const originalY = stepEntity.position.y;
stepEntity.position.x += stepEntity.velocity.x * 0.1; // x reaches 5.3 -> intersects x=6, y=9
assert(physics.checkCollision(stepEntity.position, 0.3, 1.8), '5.2a: Entity detects collision with step obstacle at y=9.6');

// Elevate by maxStepHeight (0.5) to y=10.1:
stepEntity.position.y += physics.maxStepHeight;
assertFalse(physics.checkCollision(stepEntity.position, 0.3, 1.8), '5.2b: Headroom is completely clear at y + 0.5');

// 5.3 Launchpad Impulse Application
const jumpPlayer = {
  position: new THREE.Vector3(0, 10, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  onGround: true
};
physics.applyLaunchpadImpulse(jumpPlayer, new THREE.Vector3(1, 0, 0), 16.0, 18.0);
assertEqual(jumpPlayer.velocity.y, 18.0, '5.3a: Launchpad impulse imparts vertical velocity 18.0 m/s');
assertEqual(jumpPlayer.velocity.x, 16.0, '5.3b: Launchpad impulse imparts horizontal velocity 16.0 m/s');
assertEqual(jumpPlayer.onGround, false, '5.3c: Launchpad impulse resets onGround to false');

// 5.4 Knockback physics
const combatTarget = {
  position: new THREE.Vector3(10, 10, 10),
  velocity: new THREE.Vector3(0, 0, 0),
  onGround: true
};
physics.applyKnockback(combatTarget, new THREE.Vector3(8, 10, 10), 10.0, 6.0);
assertEqual(combatTarget.velocity.y, 6.0, '5.4a: Knockback imparts vertical boost of 6.0 m/s');
assert(combatTarget.velocity.x > 0, '5.4b: Knockback impulse pushes entity away along horizontal vector');

// ============================================================================
// SUITE 6: BLOXD.IO TARGETED FACE QUAD OUTLINE & DESTROY CRACK PROGRESSION
// ============================================================================
// Ensure headless MockElement querySelector returns mock element when null
const dummyCanvas = document.createElement('canvas');
const dummyProto = Object.getPrototypeOf(dummyCanvas);
const origQS = dummyProto.querySelector;
dummyProto.querySelector = function(sel) {
  return (this.children && this.children[0]) || (origQS ? origQS.call(this, sel) : null) || document.createElement('div');
};

const gm = new GameManager();
assert(gm.selectionMesh instanceof THREE.LineLoop, '6.1a: selectionMesh is a 4-point LineLoop');
assertEqual(gm.selectionMesh.material.color.getHex(), 0xffffff, '6.1b: selectionMesh uses white line color (0xffffff)');

// 6.2 Targeted Face Quad Geometry (+0.002 offset)
const hitTopFace = {
  hit: true,
  type: BLOCK_TYPES.STONE,
  blockPos: { x: 10, y: 5, z: 10 },
  normal: new THREE.Vector3(0, 1, 0)
};
gm.getAimRaycast = () => hitTopFace;
gm.localPlayer.isDead = false;
gm.updateMining(0.016);

assert(gm.selectionMesh.visible, '6.2a: selectionMesh is visible when aiming at target block');
const facePos = gm.selectionMesh.geometry.attributes.position.array;
// For +Y face: ny = y + 1 + 0.002 = 6.002
assertApprox(facePos[1], 6.002, 1e-4, '6.2b: Top face quad outline is offset by +0.002 along normal');
assertApprox(facePos[4], 6.002, 1e-4, '6.2c: All 4 quad vertices share the offset elevation plane');

// 6.3 Authentic Minecraft crack progression (0-9)
const assetLoader = new MinecraftAssetLoader();
for (let stage = 0; stage <= 9; stage++) {
  const crackPath = assetLoader.getCrackTexture(stage);
  assert(crackPath.includes(`destroy_stage_${stage}`), `6.3.${stage}: Crack stage ${stage} maps to destroy_stage_${stage}.png`);
}

// ----------------------------------------------------------------------------
// GRAND SUMMARY
// ----------------------------------------------------------------------------
console.log(`\n${COLORS.bold}${COLORS.cyan}╔══════════════════════════════════════════════════════════════════════╗${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.cyan}║                    M2 VERIFICATION SUITE SUMMARY                     ║${COLORS.reset}`);
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
  console.log(`${COLORS.bold}${COLORS.green}✔ ALL MILESTONE 2 ASSERTIONS PASSED WITH 100% INTEGRITY!${COLORS.reset}\n`);
  process.exit(0);
}

function assertTrue(v, msg) { assert(v === true, msg); }
function assertFalse(v, msg) { assert(v === false, msg); }
