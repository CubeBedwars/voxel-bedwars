/**
 * tests/stress_m4_gen4_challenger1.js
 * Adversarial Stress Harness for Milestone 4:
 * 3D Held Item in Viewport & Floating Spawner Holograms
 * 
 * Verifies:
 * 1. Rapid Item Switching (1,000 swaps in 1 frame across null, swords, pickaxes, wool, shears, consumables)
 * 2. Attack Swing Under Extreme Frametimes (dt = 0, 0.0001, 0.5, 5.0, mid-swing spam, NaN-safety, resting return)
 * 3. GLSL Enchantment Glint Long-Duration Stability (100,000s game time, uTime precision, shader wave math)
 * 4. GeneratorManager Spawner Holograms & Drop Physics (50 spawners, 10,000s sim, countdown format, 120s ageout, magnetic pull 0.0001-1000 blocks)
 * 5. Standard Test Suites Integrity
 */

import * as THREE from 'three';
import './mocks/browser-shim.js';
import { HeldItemRenderer } from '../src/engine/HeldItemRenderer.js';
import { LocalPlayer } from '../src/entities/LocalPlayer.js';
import { GeneratorManager } from '../src/game/GeneratorManager.js';
import { BLOCK_TYPES } from '../src/engine/VoxelWorld.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertApprox(val, expected, tol = 0.001, msg = '') {
  const diff = Math.abs(val - expected);
  if (diff > tol) {
    throw new Error(`${msg}: expected ${expected} ±${tol}, but got ${val} (diff: ${diff})`);
  }
}

async function runTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  [PASS] Test ${passed}: ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err });
    console.error(`  [FAIL] Test FAILED: ${name}`);
    console.error(`         ${err.message}`);
  }
}

async function runChallengerSuite() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║        CHALLENGER 1 EMPIRICAL ADVERSARIAL STRESS TEST SUITE          ║');
  console.log('║        Milestone 4: 3D Held Item & Floating Spawner Holograms        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // ==========================================================================
  // Dimension 1: Rapid Item Switching Stress & Memory Leak Verification
  // ==========================================================================
  console.log('► Dimension 1: Rapid Item Switching Stress & Memory Leak Verification');

  await runTest('Rapidly swap 1,000 times in 1 frame across diverse item archetypes', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);

    const testItemCatalog = [
      null, // Fist/Bare arm
      { type: 'weapon', id: 'wooden_sword', damage: 4 },
      { type: 'weapon', id: 'stone_sword', damage: 5 },
      { type: 'weapon', id: 'iron_sword', damage: 6 },
      { type: 'weapon', id: 'diamond_sword', damage: 7 },
      { type: 'weapon', id: 'gold_sword', damage: 4 },
      { type: 'tool', id: 'wooden_pickaxe', speed: 2 },
      { type: 'tool', id: 'iron_pickaxe', speed: 6 },
      { type: 'tool', id: 'diamond_pickaxe', speed: 8 },
      { type: 'tool', id: 'shears', speed: 5 },
      { type: 'block', blockType: BLOCK_TYPES.WOOL_RED, count: 64 },
      { type: 'block', blockType: BLOCK_TYPES.WOOL_BLUE, count: 64 },
      { type: 'block', blockType: BLOCK_TYPES.WOOL_GREEN, count: 64 },
      { type: 'block', blockType: BLOCK_TYPES.WOOD, count: 16 },
      { type: 'block', blockType: BLOCK_TYPES.OBSIDIAN, count: 4 },
      { type: 'block', blockType: BLOCK_TYPES.END_STONE, count: 12 },
      { type: 'block', blockType: BLOCK_TYPES.LUCKY_BLOCK, count: 2 },
      { type: 'item', id: 'golden_apple', count: 1 },
      { type: 'item', id: 'ender_pearl', count: 16 },
      { type: 'item', id: 'fireball', count: 1 },
    ];

    const teams = ['red', 'blue', 'green', 'yellow'];

    // Track baseline memory
    const initialMatCacheSize = renderer.matCache.size;

    for (let i = 0; i < 1000; i++) {
      const item = testItemCatalog[i % testItemCatalog.length];
      const enchanted = (i % 2 === 0);
      const team = teams[i % teams.length];
      renderer.setHeldItem(item, enchanted, team);

      // Verify invariant: itemGroup always has exactly ONE child (the active mesh group)
      assert(renderer.itemGroup.children.length === 1, `Iteration ${i}: itemGroup children count must be exactly 1, got ${renderer.itemGroup.children.length}`);
      assert(renderer.currentMesh !== null, `Iteration ${i}: currentMesh must not be null`);
      assert(renderer.itemGroup.children[0] === renderer.currentMesh, `Iteration ${i}: itemGroup child must be currentMesh`);
      assert(renderer.currentMesh.children.length > 0, `Iteration ${i}: currentMesh must contain geometry children`);
    }

    // Verify material cache bounded size: materials are cached by key and do NOT leak linearly
    assert(renderer.matCache.size <= 50, `Material cache must be bounded (size: ${renderer.matCache.size})`);
    console.log(`     Completed 1,000 rapid item swaps. Material cache size: ${renderer.matCache.size} (bounded)`);
  });

  await runTest('Verify no detached mesh errors and camera hierarchy consistency during item swaps', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);

    assert(camera.children.includes(renderer.itemGroup), 'itemGroup attached to camera');

    // Swap back and forth between bare fist and diamond sword 200 times
    for (let i = 0; i < 200; i++) {
      if (i % 2 === 0) {
        renderer.setHeldItem({ type: 'weapon', id: 'diamond_sword' }, true);
      } else {
        renderer.setHeldItem(null, false);
      }
    }

    assert(camera.children.includes(renderer.itemGroup), 'itemGroup remains attached to camera after 200 swaps');
    assert(renderer.itemGroup.parent === camera, 'itemGroup parent pointer is camera');
    assert(renderer.currentMesh.parent === renderer.itemGroup, 'currentMesh parent pointer is itemGroup');
  });

  // ==========================================================================
  // Dimension 2: Attack Swing Animation Under Extreme Frametimes
  // ==========================================================================
  console.log('\n► Dimension 2: Attack Swing Animation Under Extreme Frametimes');

  await runTest('Attack swing animation with dt = 0 (zero-time step)', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);
    renderer.triggerSwing();

    assert(renderer.isSwinging === true, 'isSwinging is true');
    renderer.update(0, { walkCycle: 0, velocity: { x: 0, z: 0 }, onGround: true });

    assert(!Number.isNaN(renderer.itemGroup.position.x), 'position.x not NaN');
    assert(!Number.isNaN(renderer.itemGroup.position.y), 'position.y not NaN');
    assert(!Number.isNaN(renderer.itemGroup.position.z), 'position.z not NaN');
    assert(!Number.isNaN(renderer.itemGroup.rotation.x), 'rotation.x not NaN');
    assert(!Number.isNaN(renderer.itemGroup.rotation.y), 'rotation.y not NaN');
    assert(!Number.isNaN(renderer.itemGroup.rotation.z), 'rotation.z not NaN');
    assert(renderer.swingProgress === 0, 'swingProgress remains 0 at dt=0');
  });

  await runTest('Attack swing animation with dt = 0.0001 (micro-time step)', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);
    renderer.triggerSwing();

    renderer.update(0.0001, { walkCycle: 0, velocity: { x: 0, z: 0 }, onGround: true });
    assert(renderer.isSwinging === true, 'isSwinging remains true during micro-step');
    assert(!Number.isNaN(renderer.swingProgress), 'swingProgress is not NaN');
    assert(renderer.swingProgress > 0 && renderer.swingProgress < 0.01, 'swingProgress progresses slightly');
    assert(!Number.isNaN(renderer.itemGroup.rotation.x), 'rotation.x is not NaN');
  });

  await runTest('Attack swing animation with dt = 0.5 (medium lag spike > swingDuration)', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);
    renderer.triggerSwing();

    // 0.5s > 0.22s swingDuration -> must cleanly terminate swing
    renderer.update(0.5, { walkCycle: 0, velocity: { x: 0, z: 0 }, onGround: true });
    assert(renderer.isSwinging === false, 'isSwinging must become false after 0.5s lag spike');
    assert(renderer.swingProgress === 0, 'swingProgress resets to 0');
    assert(renderer.swingTime === 0, 'swingTime resets to 0');
    assert(!Number.isNaN(renderer.itemGroup.position.y), 'position.y is not NaN');
    assert(!Number.isNaN(renderer.itemGroup.rotation.x), 'rotation.x is not NaN');
  });

  await runTest('Attack swing animation with dt = 5.0 (massive 5-second lag spike)', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);
    renderer.triggerSwing();

    renderer.update(5.0, { walkCycle: 0, velocity: { x: 0, z: 0 }, onGround: true });
    assert(renderer.isSwinging === false, 'isSwinging resets to false after massive lag spike');
    assert(renderer.swingProgress === 0, 'swingProgress resets to 0');
    assert(renderer.swingTime === 0, 'swingTime resets to 0');

    // After swing completes and idle updates, transforms must match base resting position
    renderer.equipProgress = 1.0;
    renderer.update(0.016, { walkCycle: 0, velocity: { x: 0, z: 0 }, onGround: true });
    assertApprox(renderer.itemGroup.position.x, renderer.basePos.x, 0.001, 'Returns to basePos.x');
    assertApprox(renderer.itemGroup.position.z, renderer.basePos.z, 0.001, 'Returns to basePos.z');
    assertApprox(renderer.itemGroup.rotation.y, renderer.baseRot.y, 0.001, 'Returns to baseRot.y');
  });

  await runTest('Re-triggering swing mid-swing (spamming attack button 50 times in rapid succession)', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);

    for (let i = 0; i < 50; i++) {
      renderer.triggerSwing();
      assert(renderer.isSwinging === true, `Iteration ${i}: swing starts`);
      // Step partially through swing (10ms)
      renderer.update(0.01, { walkCycle: 0, velocity: { x: 0, z: 0 }, onGround: true });
      assert(!Number.isNaN(renderer.itemGroup.position.x), `Iteration ${i}: position.x not NaN`);
      assert(!Number.isNaN(renderer.itemGroup.rotation.x), `Iteration ${i}: rotation.x not NaN`);
    }

    // Now let swing complete normally (advance 300ms)
    renderer.update(0.3, { walkCycle: 0, velocity: { x: 0, z: 0 }, onGround: true });
    assert(renderer.isSwinging === false, 'Swing completes after spam ends');
    assert(renderer.swingProgress === 0, 'swingProgress resets to 0');
  });

  // ==========================================================================
  // Dimension 3: Long-Duration GLSL Glint Shader Uniform Updates
  // ==========================================================================
  console.log('\n► Dimension 3: Long-Duration GLSL Glint Shader Uniform Updates');

  await runTest('Simulate 100,000 seconds of game time on glint uniforms without overflow or NaN', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);

    // Initial uTime
    assert(renderer.glintUniforms.uTime.value === 0, 'Initial uTime is 0');

    // Simulate 100,000s in 1,000 chunks of 100s
    for (let step = 0; step < 1000; step++) {
      renderer.update(100.0, { walkCycle: 0, velocity: { x: 0, z: 0 }, onGround: true });
    }

    assertApprox(renderer.glintUniforms.uTime.value, 100000.0, 0.01, 'uTime accumulates to 100,000s');
    assert(Number.isFinite(renderer.glintUniforms.uTime.value), 'uTime is finite');
    assert(!Number.isNaN(renderer.glintUniforms.uTime.value), 'uTime is not NaN');

    // Verify mathematical wave calculations from GLSL shader evaluate cleanly at uTime = 100,000
    const uTime = renderer.glintUniforms.uTime.value;
    for (let u = 0.0; u <= 1.0; u += 0.25) {
      for (let v = 0.0; v <= 1.0; v += 0.25) {
        const uv1_x = u * 2.0 + uTime * 0.2;
        const uv1_y = v * 2.0 + uTime * 0.2;
        const uv2_x = u * 1.5 - uTime * 0.14;
        const uv2_y = v * 1.5 + uTime * 0.14;

        const wave1 = Math.sin(uv1_x * 10.0 + uv1_y * 10.0) * 0.5 + 0.5;
        const wave2 = Math.cos(uv2_x * 8.0 - uv2_y * 8.0) * 0.5 + 0.5;
        const glint = Math.pow(wave1 * wave2, 1.4) * 0.85;

        assert(!Number.isNaN(glint), `glint at (${u},${v}) is not NaN`);
        assert(Number.isFinite(glint), `glint at (${u},${v}) is finite`);
        assert(glint >= 0.0 && glint <= 0.85, `glint in [0, 0.85], got ${glint}`);
      }
    }
  });

  await runTest('ShaderMaterial construction and uniform reference sharing across multiple items', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);

    const diamondMat = renderer.getMaterial(0x22d3ee, true);
    const goldMat = renderer.getMaterial(0xfacc15, true);

    assert(diamondMat.uniforms.uTime === renderer.glintUniforms.uTime, 'diamondMat shares uTime reference');
    assert(goldMat.uniforms.uTime === renderer.glintUniforms.uTime, 'goldMat shares uTime reference');

    // Updating renderer updates both materials synchronously
    renderer.update(2.5, null);
    assertApprox(diamondMat.uniforms.uTime.value, 2.5, 0.001, 'diamondMat reflects updated uTime');
    assertApprox(goldMat.uniforms.uTime.value, 2.5, 0.001, 'goldMat reflects updated uTime');
  });

  // ==========================================================================
  // Dimension 4: GeneratorManager Spawner Holograms & Drop Physics Stress
  // ==========================================================================
  console.log('\n► Dimension 4: GeneratorManager Spawner Holograms & Drop Physics Stress');

  await runTest('50 spawners simulated over 10,000 seconds: countdown rollover & format validation', async () => {
    const scene = new THREE.Scene();
    const sound = { playItemPickup: () => {} };
    const genManager = new GeneratorManager(scene, sound);

    // Create 50 spawners with various types and intervals
    const spawnerConfigs = [];
    for (let i = 0; i < 50; i++) {
      const type = (i % 3 === 0) ? 'forge' : (i % 3 === 1) ? 'diamond' : 'emerald';
      const interval = 2.0 + (i % 10) * 1.5; // intervals 2.0s to 15.5s
      spawnerConfigs.push({
        type,
        tier: (i % 4) + 1,
        team: (i % 2 === 0) ? 'red' : 'blue',
        pos: { x: (i % 10) * 10 - 50, y: 20, z: Math.floor(i / 10) * 10 - 25 },
        interval,
      });
    }

    genManager.loadSpawners(spawnerConfigs);
    assert(genManager.spawners.length === 50, 'Loaded exactly 50 spawners');
    assert(scene.children.length === 50, '50 hologram sprites added to scene');

    // Simulate 10,000 seconds in steps
    // To keep test runtime fast while validating thorough rollover:
    // Run 1,000 steps of dt = 1.0s (1,000s total sim step) + 9 large steps of 1,000s
    let totalSimTime = 0;
    const teamManager = {
      teams: {
        red: { upgrades: { forgeTier: 2 } },
        blue: { upgrades: { forgeTier: 1 } },
      },
    };

    // 100 consecutive 1-second steps checking countdown rollover and text formatting
    for (let step = 0; step < 100; step++) {
      genManager.update(1.0, [], teamManager);
      totalSimTime += 1.0;

      for (const sp of genManager.spawners) {
        assert(sp.hologram.lastSec >= 0, `Spawner lastSec must be >= 0, got ${sp.hologram.lastSec}`);
        assert(!Number.isNaN(sp.hologram.lastSec), 'Spawner lastSec not NaN');
        assert(typeof sp.hologram.lastTitle === 'string' && sp.hologram.lastTitle.length > 0, 'Valid title');
      }
    }

    // Advance remaining time in larger increments to reach 10,000s
    while (totalSimTime < 10000) {
      const dt = 50.0;
      genManager.update(dt, [], teamManager);
      totalSimTime += dt;
    }

    assertApprox(totalSimTime, 10000, 1.0, 'Simulated 10,000 seconds');

    // Verify all holograms still have valid states
    for (const sp of genManager.spawners) {
      assert(sp.hologram.lastSec >= 0, 'Hologram countdown non-negative at 10,000s');
      assert(!Number.isNaN(sp.timer), 'Spawner timer is not NaN');
    }

    console.log(`     Simulated 50 spawners over 10,000s cleanly without error.`);
  });

  await runTest('Dropped items ageout equilibrium (120s max age removes expired items)', async () => {
    const scene = new THREE.Scene();
    const sound = { playItemPickup: () => {} };
    const genManager = new GeneratorManager(scene, sound);

    // Spawn 20 items at t = 0
    for (let i = 0; i < 20; i++) {
      genManager.spawnDrop('iron', { x: i, y: 20, z: 0 });
    }
    assert(genManager.items.length === 20, '20 items spawned initially');

    // Advance 60s -> all 20 items should still be present (age = 60 < 120)
    genManager.update(60.0, [], null);
    assert(genManager.items.length === 20, 'Items remain alive at 60s age');

    // Spawn 10 more items at t = 60
    for (let i = 0; i < 10; i++) {
      genManager.spawnDrop('gold', { x: i, y: 20, z: 5 });
    }
    assert(genManager.items.length === 30, '30 items total');

    // Advance another 65s (total 125s for first batch, 65s for second batch)
    // First batch age = 125s > 120s -> aged out!
    // Second batch age = 65s < 120s -> alive!
    genManager.update(65.0, [], null);
    assert(genManager.items.length === 10, `Expected 10 items after first batch ages out, got ${genManager.items.length}`);
    for (const item of genManager.items) {
      assert(item.type === 'gold', 'Surviving items are the newer gold drops');
    }

    // Advance another 60s (total 125s for second batch) -> all aged out
    genManager.update(60.0, [], null);
    assert(genManager.items.length === 0, 'All items aged out cleanly after 120s');
  });

  await runTest('Magnetic pull math across distances ranging from 0.0001 to 1000 blocks', async () => {
    const scene = new THREE.Scene();
    let pickedUpCount = 0;
    const sound = { playItemPickup: () => { pickedUpCount++; } };
    const genManager = new GeneratorManager(scene, sound);

    const playerPos = new THREE.Vector3(10, 20, 10);
    const mockPlayer = {
      isDead: false,
      isLocal: true,
      position: playerPos.clone(),
      inventory: {},
      addResource: (type, count) => {
        mockPlayer.inventory[type] = (mockPlayer.inventory[type] || 0) + count;
      },
    };

    // Test Case 1: Ultra-close distance (0.0001 blocks) -> must collect immediately
    genManager.spawnDrop('diamond', { x: 10 + 0.00005, y: 20 - 0.6, z: 10 + 0.00005 });
    genManager.items[0].mesh.position.set(10.00005, 20.00005, 10.00005); // exactly 0.0001 blocks away
    genManager.update(0.016, [mockPlayer], null);
    assert(mockPlayer.inventory.diamond === 1, 'Ultra-close drop (0.0001m) collected immediately');
    assert(genManager.items.length === 0, 'Collected item removed');

    // Test Case 2: In magnetic pull zone (1.8 blocks away on X axis, < 2.4, > 1.0)
    genManager.spawnDrop('emerald', { x: 10 + 1.8, y: 20 - 0.6, z: 10 });
    const initialDist = mockPlayer.position.distanceTo(genManager.items[0].mesh.position);
    assertApprox(initialDist, 1.8, 0.25, 'Initial dist is ~1.8');

    // Update with micro-step dt = 0.01 (dt * 10 = 0.1 -> lerps 10% closer, distance ~1.62 > 1.0)
    genManager.update(0.01, [mockPlayer], null);
    assert(genManager.items.length === 1, 'Still in flight towards player');
    const newDist = mockPlayer.position.distanceTo(genManager.items[0].mesh.position);
    assert(newDist < initialDist, `Item must be pulled closer (was ${initialDist}, now ${newDist})`);
    assert(!Number.isNaN(newDist), 'Distance is not NaN');

    // Pull towards player (dt = 0.1: moves to ~0.6 blocks from player)
    genManager.update(0.1, [mockPlayer], null);

    // Frame after reaching < 1.0 radius collects it into inventory
    genManager.update(0.016, [mockPlayer], null);
    assert(mockPlayer.inventory.emerald === 1, 'Emerald pulled into radius and collected');
    assert(genManager.items.length === 0, 'Emerald removed after collection');

    // Test Case 3: Just outside magnetic pull zone (2.8 blocks away, > 2.4)
    genManager.spawnDrop('iron', { x: 10 + 2.8, y: 20 - 0.6, z: 10 });
    const outsideDist = mockPlayer.position.distanceTo(genManager.items[0].mesh.position);
    assert(outsideDist > 2.4, `Dist must be > 2.4 blocks, got ${outsideDist}`);

    genManager.update(0.05, [mockPlayer], null);
    assert(genManager.items.length === 1, 'Item remains uncollected');
    assert(mockPlayer.inventory.iron === undefined, 'No iron collected');
    genManager.clear();

    // Test Case 4: Far distances (10.0, 100.0, 1000.0 blocks)
    const farDistances = [10.0, 100.0, 1000.0];
    for (const d of farDistances) {
      genManager.spawnDrop('gold', { x: 10 + d, y: 20, z: 10 });
      genManager.update(0.05, [mockPlayer], null);
      assert(genManager.items.length === 1, `Far item at ${d} blocks not collected`);
      assert(!Number.isNaN(genManager.items[0].mesh.position.x), `Position not NaN at distance ${d}`);
      genManager.clear();
    }
  });

  // ==========================================================================
  // Dimension 5: Standard Suites Verification & Zero Regressions
  // ==========================================================================
  console.log('\n► Dimension 5: Standard Suites Verification & Zero Regressions');

  await runTest('LocalPlayer inventory weapon switch triggers 3D mesh model update', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const mockCanvas = { addEventListener: () => {} };
    const player = new LocalPlayer('test_p', 'Tester', 'blue', camera, mockCanvas);

    const mockPhysics = { moveEntity: () => {} };

    // Initial fist arm
    assert(player.heldItemRenderer.currentSlotItem === null, 'Initial fist arm');

    // Equip sword in hotbar slot 0
    player.hotbar[0] = { type: 'weapon', id: 'diamond_sword' };
    player.selectedSlot = 0;
    player.update(0.016, mockPhysics);

    assert(player.heldItemRenderer.currentSlotItem?.id === 'diamond_sword', 'HeldItemRenderer equipped diamond sword');
    assert(player.heldItemRenderer.isEnchanted === true, 'Diamond sword is marked enchanted');

    // Equip shears in hotbar slot 1
    player.hotbar[1] = { type: 'tool', id: 'shears' };
    player.selectedSlot = 1;
    player.update(0.016, mockPhysics);

    assert(player.heldItemRenderer.currentSlotItem?.id === 'shears', 'HeldItemRenderer equipped shears');
    assert(player.heldItemRenderer.isEnchanted === false, 'Shears are not enchanted');
  });

  // ==========================================================================
  // Final Challenger Verdict Summary
  // ==========================================================================
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log(`║   CHALLENGER SUITE SUMMARY: ${passed} PASSED / ${failed} FAILED                 ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.error(`\n❌ ${failed} ADVERSARIAL STRESS TEST(S) FAILED:`);
    failures.forEach((f, idx) => {
      console.error(`  ${idx + 1}. ${f.name}`);
      console.error(`     -> ${f.error.message}`);
    });
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL ${passed} ADVERSARIAL STRESS TESTS PASSED WITH 100% SUCCESS!`);
    process.exit(0);
  }
}

runChallengerSuite().catch((err) => {
  console.error('Fatal crash during Challenger test execution:', err);
  process.exit(1);
});
