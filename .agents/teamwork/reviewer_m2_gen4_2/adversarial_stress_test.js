/**
 * .agents/teamwork/reviewer_m2_gen4_2/adversarial_stress_test.js
 * Adversarial Stress Tests for Milestone 2 Voxel Engine Integration.
 *
 * Tests:
 * 1. Low ceiling step-climbing prevention (no clipping into ceilings)
 * 2. Multi-chunk border boundary face culling
 * 3. High-load chunk creation, modification, and mesh disposal
 * 4. Negative coordinate voxel placement, indexing, and DDA raycast
 */

import * as THREE from 'three';
import '../../../tests/mocks/browser-shim.js';
import { Chunk, CHUNK_SIZE, worldToChunkCoord, worldToLocalCoord } from '../../../src/engine/Chunk.js';
import { ChunkMesher } from '../../../src/engine/ChunkMesher.js';
import { TextureAtlas } from '../../../src/engine/TextureAtlas.js';
import { VoxelWorld, BLOCK_TYPES } from '../../../src/engine/VoxelWorld.js';
import { Physics } from '../../../src/engine/Physics.js';

let passed = 0;
let failed = 0;

function check(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✔ PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  ✖ FAIL: ${msg}`);
  }
}

console.log('=== Running Reviewer 2 Adversarial Stress Tests ===\n');

// ----------------------------------------------------------------------------
// Test 1: Low Ceiling Step-Climbing Prevention
// ----------------------------------------------------------------------------
console.log('--- Test 1: Step Climbing Under Low Ceiling ---');
const scene = new THREE.Scene();
const world = new VoxelWorld(scene);
const physics = new Physics(world);

// Floor at y=0: block (5, 0, 5) -> top is y=1.
// Step at x=6, y=0 -> with half-height obstacle or step:
// Player stands at y=1.0.
// Obstacle at x=6: block at y=1 (height 1 block).
// Ceiling at y=2 (from y=2 to y=3).
// If player is at y=1.0, height is 1.8 (head at 2.8).
// Clearance between floor (y=1) and ceiling (y=3) is 2.0 blocks.
// If player tries to step up onto a step at y=1.5, head would reach 1.5 + 1.8 = 3.3, hitting ceiling at y=3!
world.setBlock(5, 0, 5, BLOCK_TYPES.STONE); // floor
world.setBlock(5, 3, 5, BLOCK_TYPES.STONE); // ceiling block at y=3
world.setBlock(6, 3, 5, BLOCK_TYPES.STONE); // ceiling block at y=3 above step
world.setBlock(6, 1, 5, BLOCK_TYPES.STONE); // 1.0 block obstacle at x=6

const lowCeilPlayer = {
  position: new THREE.Vector3(5.5, 1.0, 5.0),
  velocity: new THREE.Vector3(4.0, 0, 0),
  width: 0.6,
  height: 1.8,
  onGround: true,
  isFlying: false
};

// Player moves towards x=6 (dx = 0.4 -> x=5.9, halfW=0.3 -> maxX reaches 6.2, hitting x=6)
physics.moveEntity(lowCeilPlayer, 0.1);
check(lowCeilPlayer.position.x <= 5.5, 'Player did not clip through obstacle under ceiling');
check(lowCeilPlayer.position.y === 1.0, 'Player remained at y=1.0 and did NOT elevate into ceiling');
check(lowCeilPlayer.velocity.x === 0, 'Horizontal velocity halted upon collision');

// ----------------------------------------------------------------------------
// Test 2: Cross-Chunk Boundary Face Culling
// ----------------------------------------------------------------------------
console.log('\n--- Test 2: Cross-Chunk Boundary Face Culling ---');
const world2 = new VoxelWorld(scene);
// Put block at (15, 0, 0) in Chunk (0, 0, 0)
// Put block at (16, 0, 0) in Chunk (1, 0, 0)
world2.setBlock(15, 0, 0, BLOCK_TYPES.STONE);
world2.setBlock(16, 0, 0, BLOCK_TYPES.STONE);

world2.rebuildMeshes();
const chunk0 = world2.getChunk(0, 0, 0);
const chunk1 = world2.getChunk(1, 0, 0);

check(chunk0 !== null, 'Chunk (0,0,0) exists');
check(chunk1 !== null, 'Chunk (1,0,0) exists');

// Mesher check for chunk0 at (15, 0, 0) facing +X (which neighbors (16, 0, 0)):
// The +X face of block (15, 0, 0) should be CULLED because (16, 0, 0) is solid stone!
const normals0 = chunk0.mesh.geometry.attributes.normal.array;
// Count faces with normal (+1, 0, 0)
let plusXCount0 = 0;
for (let i = 0; i < normals0.length; i += 3) {
  if (normals0[i] === 1 && normals0[i+1] === 0 && normals0[i+2] === 0) {
    plusXCount0++;
  }
}
// Each quad has 4 vertices. If +X face is culled, plusXCount0 should be 0!
check(plusXCount0 === 0, 'Chunk (0,0,0) culled +X boundary face against Chunk (1,0,0)');

// And chunk1's -X face facing (15, 0, 0) should also be CULLED!
const normals1 = chunk1.mesh.geometry.attributes.normal.array;
let minusXCount1 = 0;
for (let i = 0; i < normals1.length; i += 3) {
  if (normals1[i] === -1 && normals1[i+1] === 0 && normals1[i+2] === 0) {
    minusXCount1++;
  }
}
check(minusXCount1 === 0, 'Chunk (1,0,0) culled -X boundary face against Chunk (0,0,0)');

// ----------------------------------------------------------------------------
// Test 3: Negative Coordinates & DDA Raycast
// ----------------------------------------------------------------------------
console.log('\n--- Test 3: Negative Coordinates & DDA Raycast ---');
const world3 = new VoxelWorld(scene);
// Set block at negative coordinates (-5, -2, -8)
world3.setBlock(-5, -2, -8, BLOCK_TYPES.OBSIDIAN);
check(world3.getBlock(-5, -2, -8) === BLOCK_TYPES.OBSIDIAN, 'Negative coord block stored & retrieved correctly');
check(world3.isSolid(-5, -2, -8) === true, 'Negative coord isSolid returns true');

// Raycast towards negative coordinates: from (-5.5, -2.0, -4.0) looking towards -Z
const hitNeg = world3.raycast(
  new THREE.Vector3(-4.5, -1.5, -4.0),
  new THREE.Vector3(0, 0, -1),
  10
);
check(hitNeg.hit === true, 'DDA raycast hits block at negative coordinates');
check(hitNeg.blockPos.x === -5 && hitNeg.blockPos.y === -2 && hitNeg.blockPos.z === -8,
  `Hit position is (-5, -2, -8), got (${hitNeg.blockPos.x}, ${hitNeg.blockPos.y}, ${hitNeg.blockPos.z})`);
check(hitNeg.normal.z === 1, `Hit normal is +Z (facing ray origin), got ${hitNeg.normal.z}`);
check(hitNeg.placePos.z === -7, `Placement position is adjacent at z = -7, got ${hitNeg.placePos.z}`);

// ----------------------------------------------------------------------------
// Test 4: High-Load Chunk Operations & Mesh Disposal
// ----------------------------------------------------------------------------
console.log('\n--- Test 4: High-Load Chunk Creation & Disposal ---');
const world4 = new VoxelWorld(scene);
for (let c = 0; c < 20; c++) {
  world4.setBlock(c * 16 + 8, 8, 8, BLOCK_TYPES.DIRT);
}
check(world4.chunks.size === 20, 'Created 20 distinct chunks across 320-block range');
world4.rebuildMeshes();
check(world4.voxelGroup.children.length === 20, 'All 20 chunk meshes attached to scene graph');

// Clear world: ensures memory disposal
world4.clear();
check(world4.chunks.size === 0, 'All chunks cleared from world map');
check(world4.voxelGroup.children.length === 0, 'All chunk meshes removed from voxelGroup');

console.log(`\nAdversarial Stress Summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
process.exit(0);
