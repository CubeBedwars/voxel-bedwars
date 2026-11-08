/**
 * tests/stress_m4_gen4_challenger2.js
 * Empirical Adversarial Stress Test Suite - Challenger 2
 * Milestone 4: 3D Held Item in Viewport & Floating Spawner Holograms
 *
 * Verifies:
 * 1. Gameplay Concurrency & Finite Math Bounds:
 *    - Sprinting + Jumping + Sneaking simultaneously under fluctuating dt
 *    - Camera position stays finite, within [1.58, 1.66] when onGround, exactly 1.62 when airborne
 *    - Held item viewport transforms remain finite, bounded, and without NaN/divergence
 *    - Triggering weapon swings (`triggerSwing()`) during active mining preserves `LocalPlayer.isMining` and `miningHitTimer`
 *    - Rapid concurrent input spamming (sprint/sneak/jump/mine/swing/hotbar swap)
 * 2. Enchantment Glint Exhaustive Edge Cases:
 *    - Weapon tiers (wooden, stone, iron, diamond, gold) x Sharpness (0, 1, 2, 3)
 *    - Tool tiers (wooden, stone, iron, diamond, shears) x Sharpness (0, 1, 2, 3)
 *    - Blocks (wool, wood, obsidian, end stone, diamond block) never show glint
 *    - Material switching (MeshLambertMaterial vs ShaderMaterial) and glint uniforms
 * 3. Generator Hologram Canvas Boundary Values:
 *    - Boundary intervals: interval = 0, interval < 1s (0.001s, 0.25s), interval = 9999s
 *    - Edge configs: missing/undefined title, unknown spawner type ('mystic_altar'), empty config
 *    - Multi-map reload & scene cleanup lifecycle: Speedway -> Colosseum -> Octagon -> clear()
 *    - Verify no leftover sprites or drop meshes remain in Three.js scene hierarchy
 */

import * as THREE from 'three';
import './mocks/browser-shim.js';
import { HeldItemRenderer } from '../src/engine/HeldItemRenderer.js';
import { LocalPlayer } from '../src/entities/LocalPlayer.js';
import { GeneratorManager } from '../src/game/GeneratorManager.js';
import { GameManager } from '../src/game/GameManager.js';
import { VoxelWorld, BLOCK_TYPES } from '../src/engine/VoxelWorld.js';
import { Physics } from '../src/engine/Physics.js';
import { MAP_PRESETS } from '../src/game/MapPresets.js';

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

async function runChallenger2Suite() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║        CHALLENGER 2 EMPIRICAL ADVERSARIAL STRESS TEST SUITE          ║');
  console.log('║        Milestone 4: Concurrency, Glint Matrix & Spawner Bounds       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // ==========================================================================
  // Dimension 1: Concurrency Between Movement, Sneak, Sprint, Mining & Swings
  // ==========================================================================
  console.log('► Dimension 1: Gameplay Concurrency, Bobbing Math & Mining Swings');

  await runTest('Simultaneous sprint + jump + sneak bobbing math & camera position bounds', async () => {
    const scene = new THREE.Scene();
    const world = new VoxelWorld(scene);
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const canvas = { addEventListener: () => {}, requestPointerLock: () => {} };
    const player = new LocalPlayer('tester_concurrency', 'Tester', 'red', camera, canvas);

    const mockPhysics = {
      moveEntity: (ent, dt) => {
        // Move entity with velocity
        ent.position.x += ent.velocity.x * dt;
        ent.position.z += ent.velocity.z * dt;
        ent.position.y += ent.velocity.y * dt;
      },
    };

    // Activate simultaneous sprint, sneak, jump, and forward movement
    player.keys.forward = true;
    player.keys.sprint = true;
    player.isSneaking = true;
    player.keys.jump = true;

    const dtSteps = [0.016, 0.033, 0.001, 0.1, 0.5, 0.0, 0.02];

    for (let i = 0; i < 1000; i++) {
      const dt = dtSteps[i % dtSteps.length];

      // Simulate ground toggle (jumping and landing cycle)
      player.onGround = (i % 10 < 6);

      player.update(dt, mockPhysics);

      // 1. Verify camera coordinates are strictly finite and non-NaN
      assert(Number.isFinite(camera.position.x), `camera.x must be finite at tick ${i}`);
      assert(Number.isFinite(camera.position.y), `camera.y must be finite at tick ${i}`);
      assert(Number.isFinite(camera.position.z), `camera.z must be finite at tick ${i}`);
      assert(!Number.isNaN(camera.position.x), `camera.x cannot be NaN at tick ${i}`);
      assert(!Number.isNaN(camera.position.y), `camera.y cannot be NaN at tick ${i}`);
      assert(!Number.isNaN(camera.position.z), `camera.z cannot be NaN at tick ${i}`);

      // 2. Verify camera Y bounds:
      // When onGround: camera.position.y = player.position.y + 1.62 + bobOffset (bobOffset = sin(walkCycle)*0.04 in [-0.04, 0.04])
      // When airborne: camera.position.y = player.position.y + 1.62
      const camYDiff = camera.position.y - player.position.y;
      if (player.onGround) {
        assert(camYDiff >= 1.579 && camYDiff <= 1.661, `camera Y diff ${camYDiff} out of [1.58, 1.66] bounds at tick ${i}`);
      } else {
        assertApprox(camYDiff, 1.62, 0.001, `camera Y diff must equal 1.62 when airborne at tick ${i}`);
      }
    }
  });

  await runTest('HeldItemRenderer viewport transforms under concurrent movement + continuous swinging', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const canvas = { addEventListener: () => {} };
    const player = new LocalPlayer('tester_held', 'Tester', 'red', camera, canvas);
    const renderer = player.heldItemRenderer;

    player.keys.forward = true;
    player.keys.sprint = true;
    player.isSneaking = true;
    player.onGround = true;

    // Equip iron sword
    player.hotbar[0] = { type: 'weapon', id: 'iron_sword', damage: 6 };
    player.selectedSlot = 0;

    const mockPhysics = { moveEntity: () => {} };

    for (let i = 0; i < 500; i++) {
      const dt = 0.016;

      // Randomly trigger swing every 10 frames
      if (i % 10 === 0) {
        player.triggerSwing();
      }

      player.update(dt, mockPhysics);

      // Verify itemGroup position and rotation bounds
      const pos = renderer.itemGroup.position;
      const rot = renderer.itemGroup.rotation;

      assert(Number.isFinite(pos.x) && !Number.isNaN(pos.x), `itemGroup.x must be finite at tick ${i}`);
      assert(Number.isFinite(pos.y) && !Number.isNaN(pos.y), `itemGroup.y must be finite at tick ${i}`);
      assert(Number.isFinite(pos.z) && !Number.isNaN(pos.z), `itemGroup.z must be finite at tick ${i}`);

      assert(Number.isFinite(rot.x) && !Number.isNaN(rot.x), `itemGroup rot.x must be finite at tick ${i}`);
      assert(Number.isFinite(rot.y) && !Number.isNaN(rot.y), `itemGroup rot.y must be finite at tick ${i}`);
      assert(Number.isFinite(rot.z) && !Number.isNaN(rot.z), `itemGroup rot.z must be finite at tick ${i}`);

      // Base resting is (0.35, -0.30, -0.60).
      // Bob and swing ranges should keep x in [0.20, 0.50], y in [-0.80, 0.10], z exactly -0.60
      assert(pos.x >= 0.20 && pos.x <= 0.50, `itemGroup.x ${pos.x} outside expected range [0.20, 0.50]`);
      assert(pos.y >= -0.80 && pos.y <= 0.10, `itemGroup.y ${pos.y} outside expected range [-0.80, 0.10]`);
      assertApprox(pos.z, -0.60, 0.001, `itemGroup.z must remain anchored to -0.60`);
    }
  });

  await runTest('triggerSwing() during active mining preserves isMining and miningHitTimer', async () => {
    // Create an isolated GameManager mining harness
    const scene = new THREE.Scene();
    const world = new VoxelWorld(scene);
    const camera = new THREE.PerspectiveCamera(75, 1.0, 0.05, 400);
    camera.position.set(0, 20, 0);

    const canvas = { addEventListener: () => {} };
    const player = new LocalPlayer('tester_miner', 'Tester', 'red', camera, canvas);
    player.position.set(0, 20, 0);

    const harness = Object.create(GameManager.prototype);
    harness.world = world;
    harness.scene = scene;
    harness.camera = camera;
    harness.localPlayer = player;
    harness.players = [player];
    harness.isLeftMouseDown = true;
    harness.isMining = false;
    harness.miningTarget = null;
    harness.miningElapsed = 0;
    harness.miningHitTimer = 0;
    harness.miningDuration = 2.0;
    harness.crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    harness.crackMaterial = harness.crackMesh.material;
    harness.sound = { playBlockHit: () => {}, playBlockBreak: () => {} };
    harness.particles = { spawnBlockBreak: () => {} };
    harness.computeBreakDuration = () => 2.0;
    harness.getAimRaycast = () => ({
      hit: true,
      type: BLOCK_TYPES.WOOD,
      blockPos: { x: 0, y: 20, z: 2 },
      normal: { x: 0, y: 0, z: -1 },
    });

    // Place a wood block at (0, 20, 2)
    world.setBlock(0, 20, 2, BLOCK_TYPES.WOOD);

    const targetHit = {
      hit: true,
      type: BLOCK_TYPES.WOOD,
      blockPos: { x: 0, y: 20, z: 2 },
      normal: { x: 0, y: 0, z: -1 },
    };

    // 1. Start mining
    harness.startMining(targetHit);
    assert(harness.isMining === true, 'harness.isMining must be true after startMining');
    assert(player.isMining === true, 'player.isMining must be true after startMining');
    assert(harness.miningHitTimer === 0, 'miningHitTimer starts at 0');

    // 2. Advance mining by 0.15s
    harness.updateMining(0.15);
    assertApprox(harness.miningElapsed, 0.15, 0.001, 'miningElapsed should be 0.15');
    assertApprox(harness.miningHitTimer, 0.15, 0.001, 'miningHitTimer should be 0.15');

    // 3. Concurrently trigger swing 50 times during active mining
    for (let s = 0; s < 50; s++) {
      player.triggerSwing();
    }

    // Verify mining state is completely unharmed
    assert(player.isMining === true, 'player.isMining must remain true after swing spam');
    assert(harness.isMining === true, 'harness.isMining must remain true after swing spam');
    assertApprox(harness.miningHitTimer, 0.15, 0.001, 'miningHitTimer must NOT be reset by manual triggerSwing()');
    assert(player.isSwinging === true, 'player.isSwinging is true from triggerSwing');

    // 4. Advance mining by 0.06s (total miningHitTimer = 0.21 >= 0.2)
    harness.updateMining(0.06);
    assertApprox(harness.miningElapsed, 0.21, 0.001, 'miningElapsed should be 0.21');
    // Periodic hit subtracts 0.2: 0.21 - 0.2 = 0.01
    assertApprox(harness.miningHitTimer, 0.01, 0.002, 'miningHitTimer should have subtracted 0.2 on rhythm hit');
    assert(player.isMining === true, 'player.isMining remains true after periodic rhythm hit');

    // 5. Complete mining to duration (2.0s)
    harness.updateMining(1.85); // 0.21 + 1.85 = 2.06 >= 2.0
    assert(harness.isMining === false, 'harness.isMining is reset to false upon completion');
    assert(player.isMining === false, 'player.isMining is reset to false upon completion');
    assert(world.getBlock(0, 20, 2) === BLOCK_TYPES.AIR, 'wood block was successfully broken and turned to air');
  });

  await runTest('Extreme chaotic input fuzzing (sprint, sneak, jump, mine, swing, slot swap) across 500 steps', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const canvas = { addEventListener: () => {} };
    const player = new LocalPlayer('tester_fuzz', 'Tester', 'red', camera, canvas);

    // Populate hotbar with various items
    player.hotbar[0] = { type: 'weapon', id: 'diamond_sword', damage: 7 };
    player.hotbar[1] = { type: 'tool', id: 'diamond_pickaxe', speed: 8 };
    player.hotbar[2] = { type: 'block', blockType: BLOCK_TYPES.WOOL_RED, count: 64 };
    player.hotbar[3] = { type: 'item', id: 'golden_apple', count: 2 };
    player.hotbar[4] = null;

    const mockPhysics = { moveEntity: () => {} };

    for (let step = 0; step < 500; step++) {
      // Pseudo-random deterministic chaotic state changes
      player.keys.forward = (step % 2 === 0);
      player.keys.backward = (step % 3 === 0);
      player.keys.left = (step % 5 === 0);
      player.keys.right = (step % 7 === 0);
      player.keys.sprint = (step % 4 === 0);
      player.isSneaking = (step % 6 === 0);
      player.keys.jump = (step % 8 === 0);
      player.selectedSlot = step % 5;

      if (step % 13 === 0) {
        player.triggerSwing();
      }

      const dt = ((step % 10) + 1) * 0.005; // 0.005 to 0.05s
      player.update(dt, mockPhysics);

      assert(!Number.isNaN(camera.position.x), `NaN in camera.x at fuzz step ${step}`);
      assert(!Number.isNaN(camera.position.y), `NaN in camera.y at fuzz step ${step}`);
      assert(!Number.isNaN(camera.position.z), `NaN in camera.z at fuzz step ${step}`);
      assert(!Number.isNaN(player.heldItemRenderer.itemGroup.position.x), `NaN in itemGroup.x at fuzz step ${step}`);
      assert(!Number.isNaN(player.heldItemRenderer.itemGroup.rotation.x), `NaN in itemGroup.rot.x at fuzz step ${step}`);
    }
  });

  // ==========================================================================
  // Dimension 2: Enchantment Glint Exhaustive Edge Cases
  // ==========================================================================
  console.log('\n► Dimension 2: Enchantment Glint Exhaustive Edge Cases');

  await runTest('Check all weapon tiers across Team Sharpness tiers 0, 1, 2, 3', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const canvas = { addEventListener: () => {} };
    const player = new LocalPlayer('tester_glint_w', 'Tester', 'red', camera, canvas);

    const weaponTiers = [
      { tier: 'wooden', item: { type: 'weapon', id: 'wooden_sword', damage: 4 } },
      { tier: 'stone', item: { type: 'weapon', id: 'stone_sword', damage: 5 } },
      { tier: 'iron', item: { type: 'weapon', id: 'iron_sword', damage: 6 } },
      { tier: 'gold', item: { type: 'weapon', id: 'gold_sword', damage: 4 } },
      { tier: 'diamond', item: { type: 'weapon', id: 'diamond_sword', damage: 7 } },
      { tier: 'generic_blade', item: { type: 'weapon', id: 'battle_blade', damage: 8 } },
    ];

    const sharpnessTiers = [0, 1, 2, 3];

    for (const { tier, item } of weaponTiers) {
      for (const sharp of sharpnessTiers) {
        player.teamUpgrades = { sharpness: sharp };

        const isEnchanted = player.isItemEnchanted(item);

        if (tier === 'diamond') {
          // Diamond sword is ALWAYS enchanted regardless of Sharpness tier
          assert(isEnchanted === true, `Diamond sword must be enchanted at Sharpness tier ${sharp}`);
        } else {
          // Non-diamond weapons: NOT enchanted at Sharpness 0, ENCHANTED at Sharpness 1, 2, 3
          if (sharp === 0) {
            assert(isEnchanted === false, `${tier} sword must NOT be enchanted at Sharpness tier 0`);
          } else {
            assert(isEnchanted === true, `${tier} sword MUST be enchanted at Sharpness tier ${sharp}`);
          }
        }

        // Verify HeldItemRenderer material reflects the state
        player.heldItemRenderer.setHeldItem(item, isEnchanted, 'red');
        const activeMesh = player.heldItemRenderer.currentMesh;
        assert(activeMesh !== null, `Mesh must be created for ${item.id}`);

        // Traverse children: blade and tip should use ShaderMaterial when enchanted
        let hasShaderMaterial = false;
        activeMesh.traverse((child) => {
          if (child.isMesh && child.material instanceof THREE.ShaderMaterial) {
            hasShaderMaterial = true;
            assert(child.material.isEnchanted === true, `${item.id} ShaderMaterial.isEnchanted must be true`);
          }
        });

        if (isEnchanted) {
          assert(hasShaderMaterial === true, `${item.id} (sharpness ${sharp}) blade MUST use ShaderMaterial when enchanted`);
        } else {
          assert(hasShaderMaterial === false, `${item.id} (sharpness ${sharp}) MUST NOT use ShaderMaterial when not enchanted`);
        }
      }
    }
  });

  await runTest('Check tool tiers across Team Sharpness: non-diamond tools NEVER glint', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const canvas = { addEventListener: () => {} };
    const player = new LocalPlayer('tester_glint_t', 'Tester', 'red', camera, canvas);

    const nonDiamondTools = [
      { id: 'wooden_pickaxe', type: 'tool', speed: 2 },
      { id: 'stone_pickaxe', type: 'tool', speed: 4 },
      { id: 'iron_pickaxe', type: 'tool', speed: 6 },
      { id: 'shears', type: 'tool', speed: 5 },
      { id: 'wooden_axe', type: 'tool', speed: 2 },
      { id: 'iron_axe', type: 'tool', speed: 6 },
    ];

    const diamondTools = [
      { id: 'diamond_pickaxe', type: 'tool', speed: 8 },
      { id: 'diamond_axe', type: 'tool', speed: 8 },
    ];

    const sharpnessTiers = [0, 1, 2, 3];

    // 1. Non-diamond tools must NEVER have enchantment glint, even with Sharpness 3
    for (const tool of nonDiamondTools) {
      for (const sharp of sharpnessTiers) {
        player.teamUpgrades = { sharpness: sharp };
        const isEnchanted = player.isItemEnchanted(tool);
        assert(isEnchanted === false, `Tool ${tool.id} must NEVER be enchanted under Sharpness ${sharp}`);

        player.heldItemRenderer.setHeldItem(tool, isEnchanted, 'red');
        player.heldItemRenderer.currentMesh.traverse((child) => {
          if (child.isMesh && child.material) {
            assert(!(child.material instanceof THREE.ShaderMaterial), `Tool ${tool.id} must not have ShaderMaterial`);
          }
        });
      }
    }

    // 2. Diamond tools MUST ALWAYS have enchantment glint
    for (const tool of diamondTools) {
      for (const sharp of sharpnessTiers) {
        player.teamUpgrades = { sharpness: sharp };
        const isEnchanted = player.isItemEnchanted(tool);
        assert(isEnchanted === true, `Diamond tool ${tool.id} MUST be enchanted under Sharpness ${sharp}`);

        player.heldItemRenderer.setHeldItem(tool, isEnchanted, 'red');
        let hasShaderMat = false;
        player.heldItemRenderer.currentMesh.traverse((child) => {
          if (child.isMesh && child.material instanceof THREE.ShaderMaterial) {
            hasShaderMat = true;
          }
        });
        assert(hasShaderMat, `Diamond tool ${tool.id} must have at least one ShaderMaterial piece (e.g. pickaxe head)`);
      }
    }
  });

  await runTest('Check blocks (wool, wood, obsidian, diamond_block) NEVER show glint', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const canvas = { addEventListener: () => {} };
    const player = new LocalPlayer('tester_glint_b', 'Tester', 'red', camera, canvas);

    const blockCatalog = [
      { type: 'block', blockType: BLOCK_TYPES.WOOL_RED, name: 'Red Wool' },
      { type: 'block', blockType: BLOCK_TYPES.WOOL_BLUE, name: 'Blue Wool' },
      { type: 'block', blockType: BLOCK_TYPES.WOOD, name: 'Oak Wood' },
      { type: 'block', blockType: BLOCK_TYPES.OBSIDIAN, name: 'Obsidian' },
      { type: 'block', blockType: BLOCK_TYPES.END_STONE, name: 'End Stone' },
      { type: 'block', id: 'diamond_block', blockType: BLOCK_TYPES.DIAMOND_BLOCK, name: 'Diamond Block' },
      { type: 'block', blockType: BLOCK_TYPES.LUCKY_BLOCK, name: 'Lucky Block' },
    ];

    const sharpnessTiers = [0, 1, 2, 3];

    for (const block of blockCatalog) {
      for (const sharp of sharpnessTiers) {
        player.teamUpgrades = { sharpness: sharp };
        const isEnchanted = player.isItemEnchanted(block);
        assert(isEnchanted === false, `Block ${block.name} (id: ${block.id}) must NEVER be enchanted under Sharpness ${sharp}`);

        player.heldItemRenderer.setHeldItem(block, isEnchanted, 'red');
        const mesh = player.heldItemRenderer.currentMesh;
        assert(mesh.children.length === 1, `Mini-block ${block.name} should render a single cube`);
        const blockCube = mesh.children[0];
        assert(!(blockCube.material instanceof THREE.ShaderMaterial), `Block ${block.name} must use Lambert material, not ShaderMaterial`);
        assert(blockCube.material.isEnchanted === false, `Block ${block.name} material.isEnchanted must be false`);
      }
    }
  });

  await runTest('Rapidly toggling enchantment state preserves shader uniforms and avoids material corruption', async () => {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);

    const item = { type: 'weapon', id: 'iron_sword', damage: 6 };

    for (let i = 0; i < 200; i++) {
      const enchanted = (i % 2 === 1);
      renderer.setHeldItem(item, enchanted, 'red');
      renderer.update(0.016, { walkCycle: 0, velocity: { x: 0, z: 0 }, onGround: true });

      assert(renderer.isEnchanted === enchanted, `isEnchanted mismatch on toggle ${i}`);
      assert(renderer.glintUniforms.uTime.value > 0, `uTime must advance on frame ${i}`);
      assertApprox(renderer.glintUniforms.uGlintColor.value.r, 0.68, 0.01, 'Glint red uniform preserved');
      assertApprox(renderer.glintUniforms.uGlintColor.value.g, 0.25, 0.01, 'Glint green uniform preserved');
      assertApprox(renderer.glintUniforms.uGlintColor.value.b, 0.98, 0.01, 'Glint blue uniform preserved');
    }
  });

  // ==========================================================================
  // Dimension 3: Generator Hologram Canvas Boundary Values & Multi-Map Lifecycle
  // ==========================================================================
  console.log('\n► Dimension 3: Spawner Hologram Boundaries & Multi-Map Lifecycle');

  await runTest('Generator hologram canvas boundary values: interval = 0, interval < 1s, interval = 9999s', async () => {
    const scene = new THREE.Scene();
    const sound = { playItemPickup: () => {} };
    const genManager = new GeneratorManager(scene, sound);

    // 1. interval = 0 (instant drop spawner)
    const zeroConfig = [{ type: 'forge', team: 'red', pos: { x: 0, y: 20, z: 0 }, interval: 0 }];
    genManager.loadSpawners(zeroConfig);
    const sp0 = genManager.spawners[0];

    assert(sp0.hologram !== null, 'Hologram created for interval=0');
    // Step frame: should not divide by zero or produce NaN
    genManager.update(0.016, [], null);
    assert(!Number.isNaN(sp0.timer), 'sp0.timer cannot be NaN');
    assert(sp0.hologram.lastSec === 0, 'interval=0 lastSec should be 0');
    assert(genManager.items.length > 0, 'interval=0 should spawn drops immediately');

    // 2. interval = 0.25s (sub-second high frequency)
    const subConfig = [{ type: 'diamond', pos: { x: 5, y: 20, z: 5 }, interval: 0.25 }];
    genManager.loadSpawners(subConfig);
    const spSub = genManager.spawners[0];
    spSub.timer = 0; // reset for exact test

    genManager.update(0.1, [], null);
    // remaining = 0.25 - 0.1 = 0.15s, ceil is 1s
    assert(spSub.hologram.lastSec === 1, 'interval=0.25 after 0.1s remaining ceil should be 1');

    genManager.update(0.16, [], null); // 0.1 + 0.16 = 0.26 >= 0.25
    // Should have spawned a diamond and reset timer
    assert(spSub.timer < 0.25, 'spSub.timer reset after cycle');

    // 3. interval = 9999s (huge long-term generator)
    const hugeConfig = [{ type: 'emerald', pos: { x: 10, y: 20, z: 10 }, interval: 9999 }];
    genManager.loadSpawners(hugeConfig);
    const spHuge = genManager.spawners[0];
    spHuge.timer = 0;

    genManager.update(1.0, [], null);
    // remaining = 9999 - 1 = 9998
    assert(spHuge.hologram.lastSec === 9998, 'interval=9999 after 1s remaining should be 9998');
    assert(spHuge.hologram.lastTitle === 'Emerald Gen', 'Emerald Gen title preserved');
  });

  await runTest('Generator configs with missing/undefined titles or unknown spawner types', async () => {
    const scene = new THREE.Scene();
    const sound = { playItemPickup: () => {} };
    const genManager = new GeneratorManager(scene, sound);

    const edgeConfigs = [
      // Unknown type
      { type: 'mystic_altar', pos: { x: 0, y: 10, z: 0 }, interval: 10 },
      // Completely undefined type and name
      { pos: { x: 10, y: 15, z: 10 }, interval: 5 },
      // Forge with undefined team
      { type: 'forge', pos: { x: 20, y: 20, z: 20 }, interval: 8 },
    ];

    genManager.loadSpawners(edgeConfigs);
    assert(genManager.spawners.length === 3, 'All 3 edge configs loaded');

    // 1. Unknown type fallback
    const spMystic = genManager.spawners[0];
    assert(spMystic.hologram.title === 'Generator', 'Unknown type falls back to title "Generator"');
    assert(spMystic.hologram.titleColor === '#ffffff', 'Unknown type falls back to color "#ffffff"');

    // 2. Undefined type fallback
    const spEmpty = genManager.spawners[1];
    assert(spEmpty.hologram.title === 'Generator', 'Undefined type falls back to title "Generator"');

    // 3. Forge without team fallback
    const spNoTeam = genManager.spawners[2];
    assert(spNoTeam.hologram.title === 'Base Gen', 'Forge without team falls back to "Base Gen"');

    // 4. Update with unknown spawner runs without crashing
    genManager.update(0.5, [], null);
    assert(!Number.isNaN(spMystic.timer), 'Timer advanced without NaN');

    // 5. Direct spawnDrop with unknown type falls back to iron geometry/material
    const prevCount = genManager.items.length;
    genManager.spawnDrop('mystic_altar', { x: 0, y: 10, z: 0 });
    assert(genManager.items.length === prevCount + 1, 'Drop spawned for unknown type using fallback');
    const droppedItem = genManager.items[genManager.items.length - 1];
    assert(droppedItem.mesh.geometry instanceof THREE.BufferGeometry, 'Dropped item has valid BufferGeometry');
    assert(scene.children.includes(droppedItem.mesh), 'Drop mesh added to scene');
  });

  await runTest('Switching maps (Speedway -> Colosseum -> Octagon -> clear) cleans up all sprites and drop meshes', async () => {
    const scene = new THREE.Scene();
    const sound = { playItemPickup: () => {} };
    const genManager = new GeneratorManager(scene, sound);

    // Helper to count objects in scene
    function countSceneObjects() {
      let sprites = 0;
      let meshes = 0;
      scene.traverse((obj) => {
        if (obj instanceof THREE.Sprite) sprites++;
        if (obj instanceof THREE.Mesh) meshes++;
      });
      return { sprites, meshes };
    }

    // --- STEP 1: Load Speedway (10 spawners) ---
    const speedwayGenerators = MAP_PRESETS.speedway.generators;
    genManager.loadSpawners(speedwayGenerators);
    assert(genManager.spawners.length === speedwayGenerators.length, `Speedway has ${speedwayGenerators.length} spawners`);

    let count1 = countSceneObjects();
    assert(count1.sprites === speedwayGenerators.length, `Expected ${speedwayGenerators.length} spawner sprites in Speedway, got ${count1.sprites}`);

    // Advance 35s to spawn several drops
    for (let t = 0; t < 35; t++) {
      genManager.update(1.0, [], null);
    }
    assert(genManager.items.length > 0, 'Speedway should have active floating drops');
    let speedwayDropCount = genManager.items.length;
    let count1WithDrops = countSceneObjects();
    assert(count1WithDrops.meshes === speedwayDropCount, `Scene meshes (${count1WithDrops.meshes}) must match drops (${speedwayDropCount})`);

    // --- STEP 2: Switch to Colosseum (4 spawners) ---
    const colosseumGenerators = MAP_PRESETS.colosseum.generators;
    genManager.loadSpawners(colosseumGenerators);
    assert(genManager.spawners.length === colosseumGenerators.length, `Colosseum has ${colosseumGenerators.length} spawners`);

    let count2 = countSceneObjects();
    assert(count2.sprites === colosseumGenerators.length, `All old Speedway sprites removed; expected exactly ${colosseumGenerators.length} Colosseum sprites, got ${count2.sprites}`);
    assert(count2.meshes === 0, `All ${speedwayDropCount} old Speedway drop meshes removed upon map switch; got ${count2.meshes}`);
    assert(genManager.items.length === 0, 'Active items array reset to 0');

    // Advance 30s in Colosseum to generate new drops
    for (let t = 0; t < 30; t++) {
      genManager.update(1.0, [], null);
    }
    assert(genManager.items.length > 0, 'Colosseum should have active floating drops');
    let colosseumDropCount = genManager.items.length;
    let count2WithDrops = countSceneObjects();
    assert(count2WithDrops.meshes === colosseumDropCount, `Scene meshes (${count2WithDrops.meshes}) must match Colosseum drops (${colosseumDropCount})`);

    // --- STEP 3: Switch to Octagon (14 spawners) ---
    const octagonGenerators = MAP_PRESETS.octagon.generators;
    genManager.loadSpawners(octagonGenerators);
    assert(genManager.spawners.length === octagonGenerators.length, `Octagon has ${octagonGenerators.length} spawners`);

    let count3 = countSceneObjects();
    assert(count3.sprites === octagonGenerators.length, `All Colosseum sprites removed; expected exactly ${octagonGenerators.length} Octagon sprites, got ${count3.sprites}`);
    assert(count3.meshes === 0, `All Colosseum drop meshes removed; got ${count3.meshes}`);
    assert(genManager.items.length === 0, 'Items array reset to 0');

    // Advance 10s in Octagon
    for (let t = 0; t < 10; t++) {
      genManager.update(1.0, [], null);
    }
    assert(genManager.items.length > 0, 'Octagon generated drops');

    // --- STEP 4: Call clear() ---
    genManager.clear();
    let finalCount = countSceneObjects();
    assert(finalCount.sprites === 0, `All sprites removed from scene on clear(); got ${finalCount.sprites}`);
    assert(finalCount.meshes === 0, `All drop meshes removed from scene on clear(); got ${finalCount.meshes}`);
    assert(genManager.spawners.length === 0, 'spawners array length is 0');
    assert(genManager.items.length === 0, 'items array length is 0');
  });

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('\n======================================================================');
  console.log(`  CHALLENGER 2 SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('======================================================================\n');

  if (failed > 0) {
    console.error('FAILURES DETECTED:');
    failures.forEach((f, idx) => {
      console.error(`  ${idx + 1}. ${f.name}: ${f.error.message}`);
    });
    process.exit(1);
  }
}

runChallenger2Suite().catch((err) => {
  console.error('Fatal error in challenger 2 suite:', err);
  process.exit(1);
});
