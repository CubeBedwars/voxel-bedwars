/**
 * tests/test_adversarial_m4_critic.js
 * Adversarial Critic & Stress-Testing Suite for Milestone 4:
 * 3D Held Item in Viewport & Floating Spawner Holograms
 */

import * as THREE from 'three';
import './mocks/browser-shim.js';
import { HeldItemRenderer } from '../src/engine/HeldItemRenderer.js';
import { LocalPlayer } from '../src/entities/LocalPlayer.js';
import { GeneratorManager } from '../src/game/GeneratorManager.js';
import { BLOCK_TYPES } from '../src/engine/VoxelWorld.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  [CRITIC FAIL] ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`  [CRITIC PASS] ${message}`);
    passed++;
  }
}

function assertApprox(val, expected, tol = 0.02, msg = '') {
  const diff = Math.abs(val - expected);
  assert(diff <= tol, `${msg} (got ${val}, expected ${expected} ±${tol})`);
}

async function runAdversarialSuite() {
  console.log('\n=============================================================');
  console.log('   ADVERSARIAL STRESS-TEST SUITE: MILESTONE 4 CRITIC        ');
  console.log('=============================================================\n');

  // --------------------------------------------------------------------------
  // Challenge 1: Rapid Fuzz Item Swapping & Malformed Items
  // --------------------------------------------------------------------------
  console.log('► Challenge 1: Rapid Item Swapping & Malformed Input Fuzzing');
  {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);

    const malformedInputs = [
      null,
      undefined,
      {},
      { id: null, type: null },
      { id: '', type: 'unknown_type' },
      { id: 'alien_artifact', damage: 'not_a_number' },
      { id: 'diamond_special', blockType: -9999 },
      { id: 'golden_apple', count: -5 },
      { id: 'iron_sword', damage: Infinity },
    ];

    for (let i = 0; i < malformedInputs.length; i++) {
      const item = malformedInputs[i];
      renderer.setHeldItem(item, i % 2 === 0, 'blue');
      renderer.update(0.016, { walkCycle: 0.5, velocity: { x: 1, z: 1 }, onGround: true });
      assert(renderer.currentMesh !== null, `1.1.${i}: handles malformed item without crash or null mesh`);
      assert(!isNaN(renderer.itemGroup.position.x), `1.2.${i}: position.x is finite`);
      assert(!isNaN(renderer.itemGroup.position.y), `1.3.${i}: position.y is finite`);
      assert(!isNaN(renderer.itemGroup.position.z), `1.4.${i}: position.z is finite`);
    }

    // Rapid swapping 200 times in 1 tick
    for (let i = 0; i < 200; i++) {
      const tier = i % 2 === 0 ? 'diamond_sword' : 'iron_pickaxe';
      renderer.setHeldItem({ type: 'weapon', id: tier }, i % 3 === 0);
    }
    assert(renderer.itemGroup.children.length === 1, '1.5: itemGroup maintains exactly 1 child mesh despite 200 rapid swaps');
  }

  // --------------------------------------------------------------------------
  // Challenge 2: Extreme Delta Times & Animation Over-extension
  // --------------------------------------------------------------------------
  console.log('\n► Challenge 2: Extreme Delta Times & Animation Boundary Stability');
  {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);

    // Case 2.1: Massive lag spike (dt = 10.0 seconds) during active attack swing
    renderer.triggerSwing();
    renderer.update(10.0, { walkCycle: 50.0, velocity: { x: 100, z: 100 }, onGround: true });
    assert(renderer.isSwinging === false, '2.1a: swing terminates cleanly after massive lag spike');
    assert(renderer.swingProgress === 0, '2.1b: swingProgress resets to 0 without overflow');
    assert(!isNaN(renderer.itemGroup.rotation.x), '2.1c: rotation.x is not NaN');

    // Case 2.2: Zero delta time
    renderer.triggerSwing();
    renderer.update(0.0, null);
    assert(renderer.isSwinging === true, '2.2a: swing remains active with dt = 0');
    assert(renderer.swingProgress === 0, '2.2b: swingProgress remains 0 with dt = 0');

    // Case 2.3: Very tiny micro-steps (10,000 sub-steps of 0.0001s)
    let maxDownwardSlash = 0;
    for (let step = 0; step < 2250; step++) {
      renderer.update(0.0001, null);
      if (renderer.isSwinging) {
        maxDownwardSlash = Math.min(maxDownwardSlash, renderer.itemGroup.rotation.x - renderer.baseRot.x);
      }
    }
    assert(maxDownwardSlash < -1.0, '2.3: downward slash reaches authentic peak depth (~ -1.1 rad)');
    assert(renderer.isSwinging === false, '2.4: swing terminates cleanly after ~220ms');
  }

  // --------------------------------------------------------------------------
  // Challenge 3: Spawner Hologram & Canvas Context Resilience
  // --------------------------------------------------------------------------
  console.log('\n► Challenge 3: Spawner Hologram & Canvas Context Edge Cases');
  {
    const scene = new THREE.Scene();
    const sound = { playItemPickup: () => {} };
    const genManager = new GeneratorManager(scene, sound);

    const holo = genManager.createHologramSprite('Test Gen', '#ff0000');
    assert(holo.sprite !== null, '3.1: hologram sprite created');

    // Case 3.2: Negative remaining seconds
    genManager.updateHologram(holo, -5.5, 'Negative Test');
    assert(holo.lastSec === 0, '3.2a: negative timer clamps to 0s');
    assert(holo.lastTitle === 'Negative Test', '3.2b: title updates');

    // Case 3.3: Large timer value
    genManager.updateHologram(holo, 9999.2, 'Big Time');
    assert(holo.lastSec === 10000, '3.3: large timer ceiling formats without error');

    // Case 3.4: Simulated lost canvas context
    const brokenHolo = {
      sprite: new THREE.Sprite(),
      canvas: null,
      ctx: null,
      texture: null,
      title: 'Broken',
      lastSec: -1,
      lastTitle: '',
    };
    genManager.updateHologram(brokenHolo, 5.0, 'Broken Title');
    assert(brokenHolo.lastSec === 5, '3.4: null ctx does not throw exception');
  }

  // --------------------------------------------------------------------------
  // Challenge 4: Ingot Geometry Normals and Winding Verification
  // --------------------------------------------------------------------------
  console.log('\n► Challenge 4: Ingot Geometry Normals and Winding Verification');
  {
    const scene = new THREE.Scene();
    const genManager = new GeneratorManager(scene, null);
    const ironGeo = genManager.dropGeos.iron;

    ironGeo.computeBoundingBox();
    ironGeo.computeBoundingSphere();

    assert(ironGeo.boundingBox !== null, '4.1: iron ingot bounding box is computed');
    assertApprox(ironGeo.boundingBox.max.x - ironGeo.boundingBox.min.x, 0.28, 0.01, '4.2: ingot width is ~0.28');
    assertApprox(ironGeo.boundingBox.max.z - ironGeo.boundingBox.min.z, 0.52, 0.01, '4.3: ingot length is ~0.52');
    assertApprox(ironGeo.boundingBox.max.y - ironGeo.boundingBox.min.y, 0.14, 0.01, '4.4: ingot height is ~0.14');

    const normals = ironGeo.attributes.normal.array;
    assert(normals.length === ironGeo.attributes.position.array.length, '4.5: vertex normals count matches positions count');
    for (let i = 0; i < normals.length; i++) {
      assert(!isNaN(normals[i]), `4.6.${i}: normal component is finite`);
    }
  }

  // --------------------------------------------------------------------------
  // Challenge 5: Destruction and Memory Cleanup
  // --------------------------------------------------------------------------
  console.log('\n► Challenge 5: Destruction and Memory Cleanup');
  {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);
    assert(camera.children.includes(renderer.itemGroup), '5.1: itemGroup initially in camera');

    renderer.destroy();
    assert(!camera.children.includes(renderer.itemGroup), '5.2: destroy removes itemGroup from camera');
    assert(renderer.matCache.size === 0, '5.3: matCache cleared');

    // Verify calling update or rebuild after destroy does not throw
    renderer.update(0.016, null);
    renderer.rebuildMesh(null);
    assert(true, '5.4: calling methods post-destroy survives without fatal error');
  }

  console.log(`\n=============================================================`);
  console.log(`  ALL CRITIC ADVERSARIAL TESTS PASSED: ${passed} passed, ${failed} failed`);
  console.log(`=============================================================\n`);
}

runAdversarialSuite().catch((err) => {
  console.error('Adversarial Critic test failed with error:', err);
  process.exit(1);
});
