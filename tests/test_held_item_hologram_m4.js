/**
 * tests/test_held_item_hologram_m4.js
 * Comprehensive Unit & Integration Verification Suite for Milestone 4:
 * 3D Held Item in Viewport with Enchantment Glint & Floating Spawner Holograms
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
    console.error(`  FAIL: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

function assertApprox(val, expected, tol = 0.02, msg = '') {
  const diff = Math.abs(val - expected);
  assert(diff <= tol, `${msg} (got ${val}, expected ${expected} ±${tol})`);
}

async function runMilestone4Tests() {
  console.log('\n=============================================================');
  console.log('  MILESTONE 4: 3D HELD ITEM & SPAWNER HOLOGRAM VERIFICATION  ');
  console.log('=============================================================\n');

  // --------------------------------------------------------------------------
  // Group 1: HeldItemRenderer Viewport Attachment & Resting Transform
  // --------------------------------------------------------------------------
  console.log('► Group 1: HeldItemRenderer Viewport Attachment & Transforms');
  {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);

    assert(camera.children.includes(renderer.itemGroup), '1.1: itemGroup is attached to camera local space');
    assertApprox(renderer.basePos.x, 0.35, 0.05, '1.2: basePos x is in bottom-right viewport');
    assertApprox(renderer.basePos.y, -0.30, 0.05, '1.3: basePos y is in bottom-right viewport');
    assertApprox(renderer.basePos.z, -0.60, 0.05, '1.4: basePos z is placed in front of near plane');
    assert(renderer.itemGroup.children.length > 0, '1.5: default fist/arm mesh is populated');
  }

  // --------------------------------------------------------------------------
  // Group 2: Item Swapping & 3D Extruded Voxel Models
  // --------------------------------------------------------------------------
  console.log('\n► Group 2: Item Swapping & 3D Extruded Voxel Models');
  {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);

    // 2.1 Sword model
    renderer.setHeldItem({ type: 'weapon', id: 'iron_sword', damage: 6.5 }, false);
    assert(renderer.currentSlotItem?.id === 'iron_sword', '2.1a: current item set to iron_sword');
    assert(renderer.equipProgress === 0.0, '2.1b: equipProgress resets to 0.0 to trigger equip dip');
    const swordChildren = renderer.currentMesh.children;
    assert(swordChildren.length >= 5, '2.1c: sword contains pommel, handle, guard, blade, and tip');

    // 2.2 Pickaxe model
    renderer.setHeldItem({ type: 'tool', id: 'diamond_pickaxe', speed: 8.0 }, true);
    assert(renderer.currentSlotItem?.id === 'diamond_pickaxe', '2.2a: current item set to diamond_pickaxe');
    assert(renderer.isEnchanted === true, '2.2b: diamond pickaxe is marked enchanted');
    const pickChildren = renderer.currentMesh.children;
    assert(pickChildren.length >= 5, '2.2c: pickaxe contains handle, center, and arched curved arms');

    // 2.3 Shears model
    renderer.setHeldItem({ type: 'tool', id: 'shears', speed: 5.0 }, false);
    assert(renderer.currentSlotItem?.id === 'shears', '2.3a: current item set to shears');
    const shearChildren = renderer.currentMesh.children;
    assert(shearChildren.length >= 3, '2.3b: shears contain twin blades and center rivet');

    // 2.4 Mini-block model
    renderer.setHeldItem({ type: 'block', blockType: BLOCK_TYPES.WOOL_RED, count: 16 }, false);
    assert(renderer.currentSlotItem?.blockType === BLOCK_TYPES.WOOL_RED, '2.4a: current item set to red wool block');
    assert(renderer.currentMesh.children.length === 1, '2.4b: mini-block is rendered as a 3D voxel cube');

    // 2.5 Consumable model (Golden Apple)
    renderer.setHeldItem({ type: 'item', id: 'golden_apple', count: 1 }, true);
    assert(renderer.currentMesh.children.length >= 3, '2.5: Golden Apple contains apple body, stem, and leaf');
  }

  // --------------------------------------------------------------------------
  // Group 3: Walking Bobbing Calculations
  // --------------------------------------------------------------------------
  console.log('\n► Group 3: Walking Bobbing Calculations');
  {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);

    const mockPlayerMoving = {
      walkCycle: Math.PI / 2,
      velocity: { x: 3.5, z: 3.5 },
      onGround: true,
    };

    // Update with moving player
    renderer.update(0.016, mockPlayerMoving);
    const movingPosX = renderer.itemGroup.position.x;
    const movingPosY = renderer.itemGroup.position.y;
    assert(movingPosX !== renderer.basePos.x, '3.1: walking motion applies horizontal bob sway');
    assert(movingPosY !== renderer.basePos.y, '3.2: walking motion applies vertical bobbing');

    // Update with stationary player
    const mockPlayerStationary = {
      walkCycle: 0,
      velocity: { x: 0, z: 0 },
      onGround: true,
    };
    renderer.update(0.016, mockPlayerStationary);
    assertApprox(renderer.itemGroup.position.x, renderer.basePos.x, 0.005, '3.3: idle player has near-zero horizontal sway');
  }

  // --------------------------------------------------------------------------
  // Group 4: 220ms Downward Attack Swing Animation
  // --------------------------------------------------------------------------
  console.log('\n► Group 4: 220ms Downward Attack Swing Animation');
  {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);

    assert(renderer.isSwinging === false, '4.1: isSwinging starts false');
    renderer.triggerSwing();
    assert(renderer.isSwinging === true, '4.2: triggerSwing sets isSwinging to true');
    assert(renderer.swingProgress === 0, '4.3: swingProgress starts at 0');

    // Advance 110ms (halfway through 220ms swing)
    renderer.update(0.11, { walkCycle: 0, velocity: { x: 0, z: 0 }, onGround: true });
    assertApprox(renderer.swingProgress, 0.5, 0.05, '4.4: swingProgress is ~0.5 at 110ms');
    assert(renderer.itemGroup.rotation.x < renderer.baseRot.x, '4.5: arm rotates downward during swing slash');

    // Advance remaining 120ms (total 230ms > 220ms duration)
    renderer.update(0.12, { walkCycle: 0, velocity: { x: 0, z: 0 }, onGround: true });
    assert(renderer.isSwinging === false, '4.6: swing completes and resets isSwinging to false');
    assert(renderer.swingProgress === 0, '4.7: swingProgress resets to 0');
  }

  // --------------------------------------------------------------------------
  // Group 5: Purple Scrolling GLSL Enchantment Glint Shader
  // --------------------------------------------------------------------------
  console.log('\n► Group 5: Purple Scrolling GLSL Enchantment Glint Shader');
  {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const renderer = new HeldItemRenderer(camera);

    assert(renderer.glintUniforms.uTime !== undefined, '5.1: glint uTime uniform is defined');
    assertApprox(renderer.glintUniforms.uGlintColor.value.r, 0.68, 0.02, '5.2: glint color red channel matches 0.68');
    assertApprox(renderer.glintUniforms.uGlintColor.value.g, 0.25, 0.02, '5.3: glint color green channel matches 0.25');
    assertApprox(renderer.glintUniforms.uGlintColor.value.b, 0.98, 0.02, '5.4: glint color blue channel matches 0.98');

    // Check enchanted material creation
    const enchantedMat = renderer.getMaterial(0x22d3ee, true);
    assert(enchantedMat instanceof THREE.ShaderMaterial, '5.5: enchanted item uses THREE.ShaderMaterial');
    assert(enchantedMat.fragmentShader.includes('purpleGlint'), '5.6: shader includes purple additive glint blend');
    assert(enchantedMat.fragmentShader.includes('uTime'), '5.7: shader includes uTime animated scrolling waves');

    // Advance time and check uniform progression
    const prevTime = renderer.glintUniforms.uTime.value;
    renderer.update(0.05, { walkCycle: 0, velocity: { x: 0, z: 0 }, onGround: true });
    assertApprox(renderer.glintUniforms.uTime.value, prevTime + 0.05, 0.001, '5.8: uTime advances monotonically with delta time');
  }

  // --------------------------------------------------------------------------
  // Group 6: LocalPlayer HeldItem Integration
  // --------------------------------------------------------------------------
  console.log('\n► Group 6: LocalPlayer HeldItem Integration');
  {
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 400);
    const mockCanvas = { addEventListener: () => {} };
    const player = new LocalPlayer('test_p', 'Tester', 'red', camera, mockCanvas);

    assert(player.heldItemRenderer instanceof HeldItemRenderer, '6.1: player initializes HeldItemRenderer');
    assert(player.armGroup === player.heldItemRenderer.itemGroup, '6.2: player.armGroup is aliased to heldItemRenderer.itemGroup');

    // Check enchantment helper
    assert(player.isItemEnchanted({ type: 'weapon', id: 'diamond_sword' }) === true, '6.3: diamond_sword is enchanted');
    assert(player.isItemEnchanted({ type: 'weapon', id: 'iron_sword' }) === false, '6.4: iron_sword without sharpness is not enchanted');

    player.teamUpgrades = { sharpness: 1 };
    assert(player.isItemEnchanted({ type: 'weapon', id: 'iron_sword' }) === true, '6.5: iron_sword with Team Sharpness is enchanted');

    // Swing trigger propagation
    player.triggerSwing();
    assert(player.isSwinging === true, '6.6: player.triggerSwing activates swing');
    assert(player.heldItemRenderer.isSwinging === true, '6.7: player.triggerSwing propagates to heldItemRenderer');
  }

  // --------------------------------------------------------------------------
  // Group 7: 3D Floating Spawner Holograms
  // --------------------------------------------------------------------------
  console.log('\n► Group 7: 3D Floating Spawner Holograms');
  {
    const scene = new THREE.Scene();
    const sound = { playItemPickup: () => {} };
    const genManager = new GeneratorManager(scene, sound);

    const testConfigs = [
      { type: 'forge', team: 'red', pos: { x: -27, y: 21, z: 0 }, interval: 2.5 },
      { type: 'diamond', tier: 2, pos: { x: 18, y: 21, z: 18 }, interval: 15 },
      { type: 'emerald', tier: 1, pos: { x: 0, y: 21, z: 0 }, interval: 30 },
    ];

    genManager.loadSpawners(testConfigs);
    assert(genManager.spawners.length === 3, '7.1: loaded 3 spawners');

    // Check hologram billboard sprites
    const forgeSp = genManager.spawners[0];
    assert(forgeSp.hologram !== undefined, '7.2: forge has attached hologram');
    assert(forgeSp.hologram.sprite instanceof THREE.Sprite, '7.3: hologram is a THREE.Sprite');
    assert(scene.children.includes(forgeSp.hologram.sprite), '7.4: hologram sprite is added to scene');
    assertApprox(forgeSp.hologram.sprite.position.y, 23.2, 0.05, '7.5: hologram floats at y + 2.2 above spawner');

    // Test hologram update logic
    genManager.updateHologram(forgeSp.hologram, 3.2, 'Base Gen II');
    assert(forgeSp.hologram.lastSec === 4, '7.6: countdown seconds rounded up to 4');
    assert(forgeSp.hologram.lastTitle === 'Base Gen II', '7.7: dynamic title updated to Base Gen II');

    // Test clear logic
    genManager.clear();
    assert(!scene.children.includes(forgeSp.hologram.sprite), '7.8: clear removes hologram sprites from scene');
    assert(genManager.spawners.length === 0, '7.9: spawners list cleared');
  }

  // --------------------------------------------------------------------------
  // Group 8: 3D Voxel Drops & Magnetic Pickup
  // --------------------------------------------------------------------------
  console.log('\n► Group 8: 3D Voxel Drops & Magnetic Pickup');
  {
    const scene = new THREE.Scene();
    let pickedUpSound = false;
    const sound = { playItemPickup: () => { pickedUpSound = true; } };
    const genManager = new GeneratorManager(scene, sound);

    // 8.1 Ingot and Gem Geometries
    assert(genManager.dropGeos.iron instanceof THREE.BufferGeometry, '8.1a: iron drop is a BufferGeometry');
    assert(genManager.dropGeos.diamond instanceof THREE.OctahedronGeometry, '8.1b: diamond drop is an OctahedronGeometry');
    assert(genManager.dropMats.diamond.flatShading === true, '8.1c: diamond drop material has flatShading for facets');

    // 8.2 Spawn Drops
    genManager.spawnDrop('iron', { x: 0, y: 20, z: 0 });
    assert(genManager.items.length === 1, '8.2a: drop spawned and added to items array');
    const droppedItem = genManager.items[0];
    assert(scene.children.includes(droppedItem.mesh), '8.2b: drop mesh added to scene');

    // 8.3 Spin & Bob Animation
    const initialRotY = droppedItem.mesh.rotation.y;
    genManager.update(0.1, [], null);
    assert(droppedItem.mesh.rotation.y > initialRotY, '8.3: drop rotates along Y axis');

    // 8.4 Magnetic Pickup
    const mockPlayer = {
      isDead: false,
      isLocal: true,
      position: new THREE.Vector3(0, 20.6, 0),
      addResource: (type, amt) => { mockPlayer.iron = (mockPlayer.iron || 0) + amt; },
    };

    genManager.update(0.1, [mockPlayer], null);
    assert(mockPlayer.iron === 1, '8.4a: item collected into player inventory');
    assert(pickedUpSound === true, '8.4b: item pickup chime triggered');
    assert(genManager.items.length === 0, '8.4c: item removed from active drops array');
  }

  console.log(`\n=============================================================`);
  console.log(`  ALL MILESTONE 4 TESTS PASSED: ${passed} passed, ${failed} failed`);
  console.log(`=============================================================\n`);
}

runMilestone4Tests().catch((err) => {
  console.error('Fatal error during Milestone 4 test execution:', err);
  process.exit(1);
});
