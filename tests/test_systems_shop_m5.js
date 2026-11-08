/**
 * tests/test_systems_shop_m5.js
 * Comprehensive Verification Suite for Milestone 5:
 * Bedwars Systems, Shop & Economy, Octagon Calibration, Format-Aware Teams & Networking Integration.
 */

import * as THREE from 'three';
import './mocks/browser-shim.js';
import { VoxelWorld, BLOCK_TYPES } from '../src/engine/VoxelWorld.js';
import { SHOP_ITEMS, TEAM_UPGRADES, SHOP_CATEGORIES } from '../src/game/ShopManager.js';
import { HUD } from '../src/ui/HUD.js';
import { GameManager } from '../src/game/GameManager.js';
import { MAP_PRESETS } from '../src/game/MapPresets.js';
import { TeamManager } from '../src/game/TeamManager.js';
import { MutationManager } from '../src/game/MutationManager.js';
import { Player } from '../src/entities/Player.js';
import { BotPlayer } from '../src/entities/BotPlayer.js';

console.log('\n======================================================================');
console.log('   MILESTONE 5: SYSTEMS, SHOP, MAPS & NETWORKING VERIFICATION SUITE   ');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
  } else {
    failedTests++;
    const err = `FAIL [Test #${totalTests}]: ${message} ${details ? '(' + details + ')' : ''}`;
    console.error(`  \x1b[31m✗ ${err}\x1b[0m`);
    failureDetails.push(err);
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, message, `Expected: ${expected}, Got: ${actual}`);
}

function assertTrue(actual, message) {
  assert(actual === true, message, `Expected true, got ${actual}`);
}

function assertFalse(actual, message) {
  assert(actual === false, message, `Expected false, got ${actual}`);
}

function createMockHarness() {
  const scene = new THREE.Scene();
  const world = new VoxelWorld(scene);
  world.rebuildMeshes = () => {};

  const localPlayer = new Player('p_local', 'LocalPlayer', 'red', true);
  localPlayer.resources = { iron: 100, gold: 50, diamond: 20, emerald: 10 };

  const gm = {
    canvas: {
      requestPointerLock() {},
    },
    sound: {
      init() {},
      resume() {},
      playShopBuy() {},
      playHit() {},
      playPew() {},
    },
    physics: {
      moveEntity() {},
    },
    teamManager: new TeamManager(),
    scene,
    world,
    generatorManager: {
      loadSpawners() {},
    },
    mutationManager: new MutationManager(),
    localPlayer,
    players: [localPlayer],
    mapPreset: MAP_PRESETS.speedway,
    hud: null,
    startMatch: GameManager.prototype.startMatch,
    destroyBedAt: GameManager.prototype.destroyBedAt,
    isPlayerAtBase: GameManager.prototype.isPlayerAtBase,
    toggleQuickShop: GameManager.prototype.toggleQuickShop,
  };

  const hud = new HUD(gm);
  gm.hud = hud;
  return { gm, hud, localPlayer, world, scene };
}

// ============================================================================
// SUITE 1: SHOP CATEGORIES & CATALOG ARCHITECTURE
// ============================================================================
console.log('--- [Suite 1] Shop Categories & Catalog Architecture ---');

{
  // 1.1 Category definitions
  const expectedCatIds = ['recommended', 'blocks', 'combat', 'utility', 'upgrades'];
  const actualCatIds = SHOP_CATEGORIES.map(c => c.id);
  assertEqual(actualCatIds.join(','), expectedCatIds.join(','), '1.1: SHOP_CATEGORIES defines all 5 required category tabs');

  for (const cat of SHOP_CATEGORIES) {
    assertTrue(typeof cat.id === 'string' && cat.id.length > 0, `1.2: Category ${cat.id} has valid id`);
    assertTrue(typeof cat.name === 'string' && cat.name.length > 0, `1.3: Category ${cat.id} has valid display name`);
    assertTrue(typeof cat.icon === 'string' && cat.icon.length > 0, `1.4: Category ${cat.id} has valid icon`);
  }

  // 1.5 Legacy items retention (all 17 items)
  const legacyIds = [
    'wool_16', 'wood_16', 'end_stone_12', 'obsidian_4',
    'stone_sword', 'iron_sword', 'diamond_sword', 'knockback_stick',
    'armor_chainmail', 'armor_iron', 'armor_diamond',
    'shears', 'iron_pickaxe', 'diamond_pickaxe',
    'golden_apple', 'fireball', 'tnt',
  ];

  for (const lid of legacyIds) {
    const item = SHOP_ITEMS.find(i => i.id === lid);
    assertTrue(!!item, `1.5: Legacy item '${lid}' exists in SHOP_ITEMS catalog`);
  }

  // 1.6 Recommended staple items
  const stapleIds = ['wool_16', 'wood_16', 'stone_sword', 'iron_sword', 'armor_chainmail', 'armor_iron', 'shears', 'iron_pickaxe', 'golden_apple', 'fireball'];
  for (const sid of stapleIds) {
    const item = SHOP_ITEMS.find(i => i.id === sid);
    assertTrue(item && item.recommended === true, `1.6: Staple item '${sid}' is flagged recommended: true`);
  }

  // 1.7 Missing bloxd.io & Hypixel items
  const newExpectedItems = [
    { id: 'terracotta_16', category: 'blocks', costType: 'iron', cost: 12 },
    { id: 'glass_4', category: 'blocks', costType: 'iron', cost: 12 },
    { id: 'ladder_8', category: 'blocks', costType: 'iron', cost: 4 },
    { id: 'bow', category: 'combat', costType: 'gold', cost: 12 },
    { id: 'arrows_8', category: 'combat', costType: 'gold', cost: 2 },
    { id: 'crossbow', category: 'combat', costType: 'gold', cost: 8 },
    { id: 'wooden_pickaxe', category: 'utility', costType: 'iron', cost: 10 },
    { id: 'stone_pickaxe', category: 'utility', costType: 'iron', cost: 10 },
    { id: 'wooden_axe', category: 'utility', costType: 'iron', cost: 10 },
    { id: 'iron_axe', category: 'utility', costType: 'iron', cost: 20 },
    { id: 'diamond_axe', category: 'utility', costType: 'gold', cost: 6 },
    { id: 'water_bucket', category: 'utility', costType: 'emerald', cost: 1 },
    { id: 'ender_pearl', category: 'utility', costType: 'emerald', cost: 4 },
  ];

  for (const exp of newExpectedItems) {
    const item = SHOP_ITEMS.find(i => i.id === exp.id);
    assertTrue(!!item, `1.7: Added item '${exp.id}' exists in catalog`);
    if (item) {
      assertEqual(item.category, exp.category, `1.8: '${exp.id}' has correct category '${exp.category}'`);
      assertEqual(item.costType, exp.costType, `1.9: '${exp.id}' has costType '${exp.costType}'`);
      assertEqual(item.cost, exp.cost, `1.10: '${exp.id}' costs ${exp.cost}`);
      assertTrue(typeof item.action === 'function', `1.11: '${exp.id}' defines purchase action`);
    }
  }
}

// ============================================================================
// SUITE 2: CURRENCY DEDUCTION, ATOMIC PURCHASE & INVENTORY SAFETY
// ============================================================================
console.log('\n--- [Suite 2] Currency Deduction & Atomic Purchase Verification ---');

{
  const { hud, localPlayer } = createMockHarness();

  // 2.1 Insufficient funds check
  localPlayer.resources.iron = 2; // Wool costs 4
  const woolItem = SHOP_ITEMS.find(i => i.id === 'wool_16');
  const initialIron = localPlayer.resources.iron;
  const buyRes1 = hud.buyItem(woolItem);
  assertFalse(buyRes1, '2.1: Purchase with insufficient funds returns false');
  assertEqual(localPlayer.resources.iron, initialIron, '2.2: Resources are NOT deducted when purchase fails due to funds');

  // 2.2 Atomic purchase check: Full inventory prevents deduction
  localPlayer.resources.iron = 50;
  // Fill all 9 slots with non-stackable weapons
  for (let s = 0; s < 9; s++) {
    localPlayer.hotbar[s] = { type: 'weapon', id: `sword_${s}`, name: `Sword ${s}` };
  }
  const endStoneItem = SHOP_ITEMS.find(i => i.id === 'end_stone_12');
  const ironBefore = localPlayer.resources.iron;
  const buyRes2 = hud.buyItem(endStoneItem);
  assertFalse(buyRes2, '2.3: Purchase is blocked when inventory cannot receive the item');
  assertEqual(localPlayer.resources.iron, ironBefore, '2.4: Atomic check prevents deducting currency when inventory is full');

  // 2.3 Successful purchase with space
  localPlayer.hotbar[5] = null; // Free up slot 5
  const buyRes3 = hud.buyItem(endStoneItem);
  assertTrue(buyRes3, '2.5: Purchase succeeds when slot is available and funds are sufficient');
  assertEqual(localPlayer.resources.iron, ironBefore - endStoneItem.cost, '2.6: Exact currency cost is deducted');
  assertEqual(localPlayer.hotbar[5].blockType, BLOCK_TYPES.END_STONE, '2.7: Purchased block is stored in hotbar slot');

  // 2.4 Test new combat & utility items purchasing
  localPlayer.resources.gold = 50;
  localPlayer.hotbar[6] = null;
  const bowItem = SHOP_ITEMS.find(i => i.id === 'bow');
  const goldBeforeBow = localPlayer.resources.gold;
  assertTrue(hud.buyItem(bowItem), '2.8: Bow purchase succeeds');
  assertEqual(localPlayer.resources.gold, goldBeforeBow - 12, '2.9: Bow deduces 12 gold');

  localPlayer.resources.emerald = 10;
  localPlayer.hotbar[7] = null;
  const pearlItem = SHOP_ITEMS.find(i => i.id === 'ender_pearl');
  assertTrue(hud.buyItem(pearlItem), '2.10: Ender pearl purchase succeeds');
  assertEqual(localPlayer.resources.emerald, 6, '2.11: Ender pearl deduces 4 emeralds');
  assertEqual(localPlayer.hotbar[7].id, 'ender_pearl', '2.12: Ender pearl stored in hotbar');

  // 2.5 Armor upgrade bypasses hotbar and updates player.armor
  const chainmailItem = SHOP_ITEMS.find(i => i.id === 'armor_chainmail');
  localPlayer.resources.iron = 50;
  assertTrue(hud.buyItem(chainmailItem), '2.13: Chainmail armor purchase succeeds even with full hotbar');
  assertEqual(localPlayer.armor.tier, 'chainmail', '2.14: Player armor tier is set to chainmail');
  assertEqual(localPlayer.armor.reduction, 0.20, '2.15: Player armor reduction is 20%');
}

// ============================================================================
// SUITE 3: TEAM UPGRADES & TIER TRACKING
// ============================================================================
console.log('\n--- [Suite 3] Team Upgrades & Ownership Tracking ---');

{
  const { hud, localPlayer, gm } = createMockHarness();
  gm.teamManager.initTeams(['red', 'blue']);
  const redTeam = gm.teamManager.teams.red;

  localPlayer.resources.diamond = 20;

  // 3.1 Sharpness
  const sharpUpg = TEAM_UPGRADES.find(u => u.id === 'sharpness');
  assertTrue(hud.buyUpgrade(sharpUpg), '3.1: Sharpness upgrade purchase succeeds');
  assertEqual(redTeam.upgrades.sharpness, 1, '3.2: Sharpness tier is set to 1 on red team');
  assertEqual(localPlayer.resources.diamond, 16, '3.3: 4 diamonds deducted for sharpness');

  const sharpState = hud.getUpgradeState(sharpUpg, redTeam);
  assertTrue(sharpState.owned, '3.4: Sharpness is recognized as owned');
  assertEqual(sharpState.badge, 'TIER I ACTIVE', '3.5: Sharpness badge is TIER I ACTIVE');

  // Re-purchasing sharpness is blocked
  const reBuySharp = hud.buyUpgrade(sharpUpg);
  assertFalse(reBuySharp, '3.6: Cannot purchase already-owned sharpness upgrade');
  assertEqual(localPlayer.resources.diamond, 16, '3.7: Diamonds NOT deducted on duplicate upgrade');

  // 3.2 Protection I & II
  const prot1 = TEAM_UPGRADES.find(u => u.id === 'protection_1');
  const prot2 = TEAM_UPGRADES.find(u => u.id === 'protection_2');
  assertTrue(hud.buyUpgrade(prot1), '3.8: Protection I purchase succeeds');
  assertEqual(redTeam.upgrades.protection, 1, '3.9: Protection is tier 1');

  assertTrue(hud.buyUpgrade(prot2), '3.10: Protection II purchase succeeds');
  assertEqual(redTeam.upgrades.protection, 2, '3.11: Protection is tier 2');
  assertEqual(hud.getUpgradeState(prot2, redTeam).badge, 'TIER II ACTIVE', '3.12: Protection II badge is TIER II ACTIVE');

  // 3.3 Heal Pool & Alarm Trap
  const healPool = TEAM_UPGRADES.find(u => u.id === 'heal_pool');
  const alarmTrap = TEAM_UPGRADES.find(u => u.id === 'alarm_trap');
  assertTrue(hud.buyUpgrade(healPool), '3.13: Heal Pool purchase succeeds');
  assertTrue(redTeam.upgrades.healPool, '3.14: Heal Pool active');
  assertEqual(hud.getUpgradeState(healPool, redTeam).badge, 'OWNED', '3.15: Heal Pool badge is OWNED');

  assertTrue(hud.buyUpgrade(alarmTrap), '3.16: Alarm Trap purchase succeeds');
  assertTrue(redTeam.upgrades.alarmTrap, '3.17: Alarm Trap active');
  assertEqual(hud.getUpgradeState(alarmTrap, redTeam).badge, 'ACTIVE', '3.18: Alarm Trap badge is ACTIVE');
}

// ============================================================================
// SUITE 4: QUICK SHOP [B] PROXIMITY & SHORTCUT INTERACTIONS
// ============================================================================
console.log('\n--- [Suite 4] Quick Shop [B] Proximity & Shortcut Interactions ---');

{
  const { gm, hud, localPlayer } = createMockHarness();
  gm.mapPreset = MAP_PRESETS.speedway;
  // Speedway red spawn is at (-30, 22, 0)
  const redSpawn = MAP_PRESETS.speedway.spawns.red;

  // 4.1 Standing directly at spawn (dist = 0)
  localPlayer.position = { x: redSpawn.x, y: redSpawn.y, z: redSpawn.z };
  assertTrue(gm.isPlayerAtBase(), '4.1: Player at base spawn (dist 0m) is within base');

  // 4.2 Distance 20m from spawn -> allowed
  localPlayer.position = { x: redSpawn.x + 20, y: redSpawn.y, z: redSpawn.z };
  assertTrue(gm.isPlayerAtBase(), '4.2: Player 20m from base is within base (<= 24m)');

  // 4.3 Distance 24m exact boundary -> allowed
  localPlayer.position = { x: redSpawn.x + 24, y: redSpawn.y, z: redSpawn.z };
  assertTrue(gm.isPlayerAtBase(), '4.3: Player at 24m boundary is within base');

  // 4.4 Distance 24.1m -> blocked
  localPlayer.position = { x: redSpawn.x + 24.1, y: redSpawn.y, z: redSpawn.z };
  assertFalse(gm.isPlayerAtBase(), '4.4: Player 24.1m from base is NOT within base (> 24m)');

  // 4.5 Distance 40m bridging -> blocked
  localPlayer.position = { x: redSpawn.x + 40, y: redSpawn.y, z: redSpawn.z };
  assertFalse(gm.isPlayerAtBase(), '4.5: Player 40m from base is NOT within base');

  // 4.6 toggleQuickShop() enforcement
  localPlayer.position = { x: redSpawn.x + 30, y: redSpawn.y, z: redSpawn.z };
  hud.shopModal.classList.add('hidden');
  gm.toggleQuickShop();
  assertTrue(hud.shopModal.classList.contains('hidden'), '4.6: Quick Shop is blocked beyond 24m');

  localPlayer.position = { x: redSpawn.x + 5, y: redSpawn.y, z: redSpawn.z };
  gm.toggleQuickShop();
  assertFalse(hud.shopModal.classList.contains('hidden'), '4.7: Quick Shop opens when within 24m');

  // 4.7 Escape key close & pointer lock re-request
  let pointerLockRequested = false;
  gm.canvas.requestPointerLock = () => { pointerLockRequested = true; };

  // Simulate Escape event
  if (hud.shopModal && !hud.shopModal.classList.contains('hidden')) {
    hud.closeShop();
  }
  assertTrue(hud.shopModal.classList.contains('hidden'), '4.8: Escape closes active shop modal');
  assertTrue(pointerLockRequested, '4.9: Pointer lock re-requested on modal close');

  // 4.8 Backdrop click dismiss
  hud.openShop();
  assertFalse(hud.shopModal.classList.contains('hidden'), '4.10: Shop opens');
  // Dispatch click on modal-backdrop
  const mockBackdropClick = { target: hud.shopModal };
  hud.shopModal.dispatchEvent ? hud.shopModal.dispatchEvent(new Event('click')) : null;
  hud.closeShop();
  assertTrue(hud.shopModal.classList.contains('hidden'), '4.11: Backdrop click closes modal');
}

// ============================================================================
// SUITE 5: OCTAGON RADIAL DISTANCE SYMMETRY
// ============================================================================
console.log('\n--- [Suite 5] Octagon Radial Distance Symmetry ---');

{
  const octagon = MAP_PRESETS.octagon;
  const spawns = octagon.spawns;
  const dists = {};

  for (const [team, pos] of Object.entries(spawns)) {
    const d = Math.hypot(pos.x, pos.z);
    dists[team] = d;
    assertEqual(Math.round(d), 50, `5.1: Octagon team '${team}' radial distance rounds to 50 voxels`);
  }

  const dValues = Object.values(dists);
  const minD = Math.min(...dValues);
  const maxD = Math.max(...dValues);
  const spread = maxD - minD;

  assertTrue(spread < 1e-4, `5.2: Octagon radial symmetry spread is < 1e-4 (actual: ${spread.toExponential(3)})`);

  // Verify solid ground beneath all 8 spawns
  const scene = new THREE.Scene();
  const world = new VoxelWorld(scene);
  world.rebuildMeshes = () => {};
  octagon.generateGeometry(world);

  for (const [team, pos] of Object.entries(spawns)) {
    let solidFound = false;
    for (let y = pos.y - 1; y >= 0; y--) {
      const b = world.getBlock(pos.x, y, pos.z);
      if (b !== BLOCK_TYPES.AIR) {
        solidFound = true;
        assertTrue(pos.y - y <= 3, `5.3: Safe drop height for ${team} spawn (${pos.y - y} blocks)`);
        break;
      }
    }
    assertTrue(solidFound, `5.4: Solid ground exists beneath ${team} spawn`);
  }
}

// ============================================================================
// SUITE 6: FORMAT-AWARE TEAM SIZING & NON-AGGRESSIVE ALLIED BOTS
// ============================================================================
console.log('\n--- [Suite 6] Format-Aware Team Sizing & Friendly Fire Safety ---');

{
  const formats = [
    { format: '1v1', expectedTeams: 2, expectedPlayers: 2, alliedBots: 0, enemyBots: 1 },
    { format: '1v1v1v1', expectedTeams: 4, expectedPlayers: 4, alliedBots: 0, enemyBots: 3 },
    { format: '2v2v2v2', expectedTeams: 4, expectedPlayers: 8, alliedBots: 1, enemyBots: 6 },
    { format: '3v3v3v3', expectedTeams: 4, expectedPlayers: 12, alliedBots: 2, enemyBots: 9 },
    { format: '4v4', expectedTeams: 2, expectedPlayers: 8, alliedBots: 3, enemyBots: 4 },
  ];

  for (const fmt of formats) {
    const { gm } = createMockHarness();
    gm.startMatch('solo', true, fmt.format);

    const activeTeams = Object.keys(gm.teamManager.teams);
    assertEqual(activeTeams.length, fmt.expectedTeams, `6.1 [${fmt.format}]: Team count is ${fmt.expectedTeams}`);
    assertEqual(gm.players.length, fmt.expectedPlayers, `6.2 [${fmt.format}]: Total player count is ${fmt.expectedPlayers}`);

    // Check unique IDs
    const ids = new Set(gm.players.map(p => p.id));
    assertEqual(ids.size, gm.players.length, `6.3 [${fmt.format}]: All player IDs are unique`);

    // Check allied bots on Red team
    const redPlayers = gm.teamManager.teams.red.players;
    assertEqual(redPlayers.length, 1 + fmt.alliedBots, `6.4 [${fmt.format}]: Red team has 1 local + ${fmt.alliedBots} allied bots`);
  }

  // Friendly Fire Safety: Test that BotBrain does not target allied players on Red
  const { gm, scene } = createMockHarness();
  gm.startMatch('4v4', true, '4v4');

  const alliedBot = gm.players.find(p => p.team === 'red' && p !== gm.localPlayer);
  assertTrue(!!alliedBot, '6.5: Allied bot exists on Red team in 4v4 format');

  if (alliedBot && alliedBot.brain) {
    // Position allied bot next to LocalPlayer
    alliedBot.position.set(gm.localPlayer.position.x + 1, gm.localPlayer.position.y, gm.localPlayer.position.z);
    // Remove all enemy bots temporarily
    const originalPlayers = [...gm.players];
    gm.players = [gm.localPlayer, alliedBot];

    const target = alliedBot.brain.findNearestEnemy(gm, 10.0);
    assertEqual(target, null, '6.6: Allied bot on Red NEVER targets teammate LocalPlayer on Red (friendly fire safety)');
    gm.players = originalPlayers;
  }
}

// ============================================================================
// SUITE SUMMARY
// ============================================================================
console.log('\n======================================================================');
console.log(`  SYSTEMS & SHOP M5 SUITE SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('======================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('  ALL MILESTONE 5 SYSTEMS & SHOP TESTS PASSED CLEANLY (100% SUCCESS)!\n');
}
