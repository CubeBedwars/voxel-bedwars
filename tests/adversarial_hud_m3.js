/**
 * tests/adversarial_hud_m3.js
 * Adversarial Stress & Edge-Case Verification Suite for Milestone 3 HUD & UI.
 * Empirical Challenger Verification Harness.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import './mocks/browser-shim.js';
import { HUD, calculateArmorDefensePoints, formatNextEvent } from '../src/ui/HUD.js';
import { TeamManager } from '../src/game/TeamManager.js';
import { LevelManager } from '../src/stats/LevelManager.js';
import { RankManager } from '../src/stats/RankManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n======================================================================');
console.log('   ADVERSARIAL STRESS TEST HARNESS — MILESTONE 3 HUD & UI             ');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function assert(condition, message, context = {}) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
  } else {
    failedTests++;
    const detail = `FAIL [Test #${totalTests}]: ${message} | Context: ${JSON.stringify(context)}`;
    console.error(`  \x1b[31m✗ ${detail}\x1b[0m`);
    failureDetails.push(detail);
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} (Expected: ${expected}, Got: ${actual})`, { actual, expected });
}

function assertTrue(actual, message) {
  assert(actual === true, message, { actual });
}

function assertFalse(actual, message) {
  assert(actual === false, message, { actual });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createMockGameManager() {
  const gm = {
    canvas: { requestPointerLock: () => {} },
    localPlayer: {
      name: 'Adversary',
      team: 'red',
      health: 20,
      hunger: 20,
      absorptionHealth: 0,
      armor: { tier: 'none' },
      weapon: { damage: 4.0 },
      resources: { iron: 0, gold: 0, diamond: 0, emerald: 0 },
      kills: 0,
      finalKills: 0,
      bedsBroken: 0,
      selectedSlot: 0,
      hotbar: [null, null, null, null, null, null, null, null, null],
      position: { x: 0, y: 64, z: 0 },
      isDead: false,
      isFinalDead: false,
      respawnTimer: 0,
    },
    teamManager: new TeamManager(),
    matchTime: 0,
    matchFormat: 'solo',
    currentMap: 'Speedway',
    mapPreset: {
      name: 'Speedway',
      spawns: {
        red: { x: 0, y: 64, z: 0 },
        blue: { x: 100, y: 64, z: 0 },
      }
    },
    rankManager: new RankManager(),
    levelManager: new LevelManager(),
    mutationManager: { activeMutation: { name: 'Supercharged' } },
    sound: { playHit: () => {}, playSwordSwing: () => {}, playShopBuy: () => {} },
    particles: { spawnHitSparks: () => {} },
    physics: { applyKnockback: () => {} },
    network: { activeTransport: 'none' },
  };

  gm.isPlayerAtBase = function(player = gm.localPlayer) {
    if (!player) return true;
    const teamSpawn = gm.mapPreset?.spawns?.[player.team];
    if (!teamSpawn) return true;
    const dist = Math.hypot(player.position.x - teamSpawn.x, player.position.z - teamSpawn.z);
    return dist <= 24;
  };

  gm.toggleQuickShop = function() {
    if (gm.hud?.shopModal && !gm.hud.shopModal.classList.contains('hidden')) {
      gm.hud.closeShop();
      return;
    }
    if (gm.isPlayerAtBase()) {
      gm.hud?.openShop();
    }
  };

  return gm;
}

// Helper to count heart occurrences in HTML
function parseHeartCounts(html) {
  const full = (html.match(/class="[^"]*heart full[^"]*"/g) || []).length;
  const half = (html.match(/class="[^"]*heart half[^"]*"/g) || []).length;
  const empty = (html.match(/class="[^"]*heart empty[^"]*"/g) || []).length;
  const absorbFull = (html.match(/class="[^"]*absorb-full[^"]*"/g) || []).length;
  const absorbHalf = (html.match(/class="[^"]*absorb-half[^"]*"/g) || []).length;
  return {
    full,
    half,
    empty,
    baseTotal: full + half + empty,
    absorbFull,
    absorbHalf,
    absorbTotal: absorbFull + absorbHalf,
    grandTotal: full + half + empty + absorbFull + absorbHalf,
  };
}

// Helper to count armor icons in HTML
function parseArmorCounts(html) {
  if (!html) return { full: 0, half: 0, empty: 0, total: 0 };
  const full = (html.match(/armor-full/g) || []).length;
  const half = (html.match(/armor-half/g) || []).length;
  const empty = (html.match(/armor-empty/g) || []).length;
  return {
    full,
    half,
    empty,
    total: full + half + empty,
  };
}

async function runAdversarialHarness() {
  const gm = createMockGameManager();
  const hud = new HUD(gm);
  gm.hud = hud;

  // ==========================================================================
  // SUITE 1: HEALTH HEART STATES ACROSS ALL 0..20 HP AND FRACTIONAL VALUES
  // ==========================================================================
  console.log('\x1b[33m--- [Suite 1] Stress-Testing Health Hearts (0..20, Fractions, Boundaries) ---\x1b[0m');

  // 1.1: Every integer from 0 to 20
  for (let hp = 0; hp <= 20; hp++) {
    gm.localPlayer.health = hp;
    gm.localPlayer.absorptionHealth = 0;
    hud.updateHealth(gm.localPlayer);
    const counts = parseHeartCounts(hud.healthHeartsEl.innerHTML);

    const expectedFull = Math.floor(hp / 2);
    const expectedHalf = (hp % 2) >= 1 ? 1 : 0;
    const expectedEmpty = 10 - expectedFull - expectedHalf;

    assertEqual(counts.baseTotal, 10, `1.1.${hp}: HP=${hp} renders exactly 10 base heart containers`);
    assertEqual(counts.full, expectedFull, `1.1.${hp}: HP=${hp} renders ${expectedFull} full hearts`);
    assertEqual(counts.half, expectedHalf, `1.1.${hp}: HP=${hp} renders ${expectedHalf} half hearts`);
    assertEqual(counts.empty, expectedEmpty, `1.1.${hp}: HP=${hp} renders ${expectedEmpty} empty hearts`);
  }

  // 1.2: Boundary and extreme health values
  // Negative HP (-10, -1, -0.01) -> clamped to 0 HP (10 empty hearts)
  for (const negHp of [-10, -1, -0.01]) {
    gm.localPlayer.health = negHp;
    hud.updateHealth(gm.localPlayer);
    const counts = parseHeartCounts(hud.healthHeartsEl.innerHTML);
    assertEqual(counts.baseTotal, 10, `1.2.neg: HP=${negHp} clamps to 10 base containers`);
    assertEqual(counts.empty, 10, `1.2.neg: HP=${negHp} renders 10 empty hearts`);
    assertEqual(counts.full, 0, `1.2.neg: HP=${negHp} renders 0 full hearts`);
    assertEqual(counts.half, 0, `1.2.neg: HP=${negHp} renders 0 half hearts`);
  }

  // Over-max HP (21, 25, 100) -> safe capping at 10 full hearts, never exceeding 10 DOM elements
  for (const overHp of [21, 25, 100]) {
    gm.localPlayer.health = overHp;
    hud.updateHealth(gm.localPlayer);
    const counts = parseHeartCounts(hud.healthHeartsEl.innerHTML);
    assertEqual(counts.baseTotal, 10, `1.2.over: HP=${overHp} safely caps at 10 base containers`);
    assertEqual(counts.full, 10, `1.2.over: HP=${overHp} renders 10 full hearts`);
    assertEqual(counts.empty, 0, `1.2.over: HP=${overHp} renders 0 empty hearts`);
  }

  // Null and undefined player health fallback -> defaults to 20 HP
  {
    gm.localPlayer.health = null;
    hud.updateHealth(gm.localPlayer);
    let counts = parseHeartCounts(hud.healthHeartsEl.innerHTML);
    assertEqual(counts.full, 10, '1.2.null: Null player.health falls back to 20 HP (10 full hearts)');

    delete gm.localPlayer.health;
    hud.updateHealth(gm.localPlayer);
    counts = parseHeartCounts(hud.healthHeartsEl.innerHTML);
    assertEqual(counts.full, 10, '1.2.undef: Undefined player.health falls back to 20 HP (10 full hearts)');
  }

  // 1.3: Fractional HP values
  const fractionalCases = [
    { hp: 0.5, expFull: 0, expHalf: 0, expEmpty: 10, desc: 'HP=0.5 (< 1 HP is empty heart)' },
    { hp: 1.0, expFull: 0, expHalf: 1, expEmpty: 9, desc: 'HP=1.0 (1 half heart, 9 empty)' },
    { hp: 1.5, expFull: 0, expHalf: 1, expEmpty: 9, desc: 'HP=1.5 (1 half heart, 9 empty)' },
    { hp: 2.5, expFull: 1, expHalf: 0, expEmpty: 9, desc: 'HP=2.5 (1 full heart, 0 half, 9 empty)' },
    { hp: 3.5, expFull: 1, expHalf: 1, expEmpty: 8, desc: 'HP=3.5 (1 full heart, 1 half, 8 empty)' },
    { hp: 7.9, expFull: 3, expHalf: 1, expEmpty: 6, desc: 'HP=7.9 (3 full hearts, 1 half, 6 empty)' },
    { hp: 14.5, expFull: 7, expHalf: 0, expEmpty: 3, desc: 'HP=14.5 (7 full hearts, 0 half, 3 empty)' },
    { hp: 15.5, expFull: 7, expHalf: 1, expEmpty: 2, desc: 'HP=15.5 (7 full hearts, 1 half, 2 empty)' },
    { hp: 19.5, expFull: 9, expHalf: 1, expEmpty: 0, desc: 'HP=19.5 (9 full hearts, 1 half, 0 empty)' },
  ];

  for (const fc of fractionalCases) {
    gm.localPlayer.health = fc.hp;
    hud.updateHealth(gm.localPlayer);
    const counts = parseHeartCounts(hud.healthHeartsEl.innerHTML);
    assertEqual(counts.baseTotal, 10, `1.3: ${fc.desc} preserves 10 base containers`);
    assertEqual(counts.full, fc.expFull, `1.3: ${fc.desc} full count`);
    assertEqual(counts.half, fc.expHalf, `1.3: ${fc.desc} half count`);
    assertEqual(counts.empty, fc.expEmpty, `1.3: ${fc.desc} empty count`);
  }

  // ==========================================================================
  // SUITE 2: GOLDEN ABSORPTION HEARTS
  // ==========================================================================
  console.log('\n\x1b[33m--- [Suite 2] Stress-Testing Golden Absorption Hearts (0, 1, 2, 4, 8, 20) ---\x1b[0m');

  const absorptionCases = [
    { absorb: 0, expAbsorbFull: 0, expAbsorbHalf: 0, expAbsorbTotal: 0 },
    { absorb: 1, expAbsorbFull: 0, expAbsorbHalf: 1, expAbsorbTotal: 1 },
    { absorb: 2, expAbsorbFull: 1, expAbsorbHalf: 0, expAbsorbTotal: 1 },
    { absorb: 4, expAbsorbFull: 2, expAbsorbHalf: 0, expAbsorbTotal: 2 },
    { absorb: 8, expAbsorbFull: 4, expAbsorbHalf: 0, expAbsorbTotal: 4 },
    { absorb: 20, expAbsorbFull: 10, expAbsorbHalf: 0, expAbsorbTotal: 10 },
    // Odd and fractional absorption values
    { absorb: 3, expAbsorbFull: 1, expAbsorbHalf: 1, expAbsorbTotal: 2 },
    { absorb: 5, expAbsorbFull: 2, expAbsorbHalf: 1, expAbsorbTotal: 3 },
  ];

  for (const ac of absorptionCases) {
    // Set base health to 15 (7 full, 1 half, 2 empty) to verify base hearts are NOT broken or altered
    gm.localPlayer.health = 15;
    gm.localPlayer.absorptionHealth = ac.absorb;
    hud.updateHealth(gm.localPlayer);

    const counts = parseHeartCounts(hud.healthHeartsEl.innerHTML);

    assertEqual(counts.full, 7, `2.1: Absorb=${ac.absorb} preserves base 7 full hearts`);
    assertEqual(counts.half, 1, `2.1: Absorb=${ac.absorb} preserves base 1 half heart`);
    assertEqual(counts.empty, 2, `2.1: Absorb=${ac.absorb} preserves base 2 empty hearts`);
    assertEqual(counts.baseTotal, 10, `2.1: Absorb=${ac.absorb} base hearts stay exactly 10`);

    assertEqual(counts.absorbFull, ac.expAbsorbFull, `2.2: Absorb=${ac.absorb} renders ${ac.expAbsorbFull} full golden hearts`);
    assertEqual(counts.absorbHalf, ac.expAbsorbHalf, `2.2: Absorb=${ac.absorb} renders ${ac.expAbsorbHalf} half golden hearts`);
    assertEqual(counts.absorbTotal, ac.expAbsorbTotal, `2.2: Absorb=${ac.absorb} renders ${ac.expAbsorbTotal} total golden hearts`);
    assertEqual(counts.grandTotal, 10 + ac.expAbsorbTotal, `2.3: Absorb=${ac.absorb} grand total hearts = ${10 + ac.expAbsorbTotal}`);

    // Verify golden CSS classes and titles
    if (ac.expAbsorbFull > 0) {
      assertTrue(hud.healthHeartsEl.innerHTML.includes('mc-heart-absorb-full'), `2.4: Absorb=${ac.absorb} contains mc-heart-absorb-full class`);
      assertTrue(hud.healthHeartsEl.innerHTML.includes('title="Absorption Heart"'), `2.4: Absorb=${ac.absorb} contains title="Absorption Heart"`);
    }
    if (ac.expAbsorbHalf > 0) {
      assertTrue(hud.healthHeartsEl.innerHTML.includes('mc-heart-absorb-half'), `2.5: Absorb=${ac.absorb} contains mc-heart-absorb-half class`);
      assertTrue(hud.healthHeartsEl.innerHTML.includes('title="Half Absorption Heart"'), `2.5: Absorb=${ac.absorb} contains title="Half Absorption Heart"`);
    }
  }

  // 2.6: Verify fallback to player.absorption when player.absorptionHealth is absent
  {
    delete gm.localPlayer.absorptionHealth;
    gm.localPlayer.absorption = 4;
    hud.updateHealth(gm.localPlayer);
    const counts = parseHeartCounts(hud.healthHeartsEl.innerHTML);
    assertEqual(counts.absorbFull, 2, '2.6: Fallback to player.absorption renders 2 full golden hearts');
    assertEqual(counts.absorbTotal, 2, '2.6: Total absorption hearts is 2 from player.absorption');
  }

  // 2.7: Negative absorption (-4) safely renders 0 golden hearts
  {
    gm.localPlayer.absorptionHealth = -4;
    hud.updateHealth(gm.localPlayer);
    const counts = parseHeartCounts(hud.healthHeartsEl.innerHTML);
    assertEqual(counts.absorbTotal, 0, '2.7: Negative absorption (-4) renders 0 absorption hearts');
    assertEqual(counts.baseTotal, 10, '2.7: Base hearts remain exactly 10');
  }

  // ==========================================================================
  // SUITE 3: ARMOR CHESTPLATE ICONS & SAFE CLAMPING TO 10 ICONS
  // ==========================================================================
  console.log('\n\x1b[33m--- [Suite 3] Stress-Testing Armor Chestplates & Clamping (-5, 0, 6, 12, 15, 20, 25, NaN) ---\x1b[0m');

  const defenseCases = [
    { pts: -5, expFull: 0, expHalf: 0, expEmpty: 0, expTotal: 0, desc: 'Defense -5 (clears innerHTML)' },
    { pts: 0, expFull: 0, expHalf: 0, expEmpty: 0, expTotal: 0, desc: 'Defense 0 (clears innerHTML)' },
    { pts: 6, expFull: 3, expHalf: 0, expEmpty: 7, expTotal: 10, desc: 'Defense 6 (3 full, 7 empty)' },
    { pts: 12, expFull: 6, expHalf: 0, expEmpty: 4, expTotal: 10, desc: 'Defense 12 (6 full, 4 empty)' },
    { pts: 15, expFull: 7, expHalf: 1, expEmpty: 2, expTotal: 10, desc: 'Defense 15 (7 full, 1 half, 2 empty)' },
    { pts: 20, expFull: 10, expHalf: 0, expEmpty: 0, expTotal: 10, desc: 'Defense 20 (10 full)' },
    { pts: 25, expFull: 10, expHalf: 0, expEmpty: 0, expTotal: 10, desc: 'Defense 25 (clamped to 10 full)' },
    { pts: NaN, expFull: 0, expHalf: 0, expEmpty: 10, expTotal: 10, desc: 'Defense NaN (safe clamp to 10 empty icons)' },
    { pts: 100, expFull: 10, expHalf: 0, expEmpty: 0, expTotal: 10, desc: 'Defense 100 (clamped to 10 full)' },
    { pts: -100, expFull: 0, expHalf: 0, expEmpty: 0, expTotal: 0, desc: 'Defense -100 (clears innerHTML)' },
  ];

  for (const dc of defenseCases) {
    gm.localPlayer.getArmorDefensePoints = () => dc.pts;
    hud.updateArmor(gm.localPlayer);
    const counts = parseArmorCounts(hud.armorBarEl.innerHTML);

    assertEqual(counts.total, dc.expTotal, `3.1: ${dc.desc} total icons <= 10`);
    assertEqual(counts.full, dc.expFull, `3.1: ${dc.desc} full chestplates`);
    assertEqual(counts.half, dc.expHalf, `3.1: ${dc.desc} half chestplates`);
    assertEqual(counts.empty, dc.expEmpty, `3.1: ${dc.desc} empty chestplates`);
    assertTrue(counts.total <= 10, `3.2: ${dc.desc} strictly never exceeds 10 icons`);
  }
  delete gm.localPlayer.getArmorDefensePoints;

  // 3.3: Armor tier string mapping & case/whitespace resilience
  assertEqual(calculateArmorDefensePoints('chainmail'), 12, '3.3: chainmail -> 12');
  assertEqual(calculateArmorDefensePoints('CHAINMAIL'), 12, '3.3: uppercase CHAINMAIL -> 12');
  assertEqual(calculateArmorDefensePoints('  iron  '), 15, '3.3: padded iron -> 15');
  assertEqual(calculateArmorDefensePoints('DIAMOND'), 20, '3.3: uppercase DIAMOND -> 20');
  assertEqual(calculateArmorDefensePoints('netherite'), 0, '3.3: unmapped tier -> 0');
  assertEqual(calculateArmorDefensePoints(''), 0, '3.3: empty string -> 0');
  assertEqual(calculateArmorDefensePoints(null), 0, '3.3: null -> 0');
  assertEqual(calculateArmorDefensePoints(undefined), 0, '3.3: undefined -> 0');

  // ==========================================================================
  // SUITE 4: HITMARKER RAPID FIRING, TIMER DEBOUNCE & 180MS CLEANUP
  // ==========================================================================
  console.log('\n\x1b[33m--- [Suite 4] Hitmarker Rapid Firing (100x), Debounce & 180ms Cleanup ---\x1b[0m');

  const hm = document.getElementById('hitmarker');
  assertTrue(hm !== null, '4.1: Hitmarker DOM element exists');

  // 4.2: Verify index.html contains all 4 ticks
  const indexHtmlPath = path.resolve(__dirname, '../index.html');
  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  assertTrue(indexHtmlContent.includes('hm-tick hm-tl'), '4.2.1: index.html has hm-tl');
  assertTrue(indexHtmlContent.includes('hm-tick hm-tr'), '4.2.2: index.html has hm-tr');
  assertTrue(indexHtmlContent.includes('hm-tick hm-bl'), '4.2.3: index.html has hm-bl');
  assertTrue(indexHtmlContent.includes('hm-tick hm-br'), '4.2.4: index.html has hm-br');

  // 4.3: Rapid synchronous firing: call triggerHitmarker() 100 times in rapid succession
  const initialTime = Date.now();
  for (let i = 0; i < 100; i++) {
    hud.triggerHitmarker();
  }
  const rapidElapsed = Date.now() - initialTime;
  console.log(`    Executed 100 consecutive triggerHitmarker() calls in ${rapidElapsed}ms`);

  assertTrue(hm.classList.contains('hit-active'), '4.3.1: Hitmarker is active immediately after 100 rapid calls');
  assertFalse(hm.classList.contains('hidden'), '4.3.2: Hitmarker is NOT hidden after rapid firing');
  assertTrue(hud._hitmarkerTimeout !== null, '4.3.3: Single active timeout handle maintained');

  // 4.4: Verify DOM stability: no redundant duplicate classes
  const classes = Array.from(hm.classList._classes || []);
  const hitActiveOccurrences = classes.filter(c => c === 'hit-active').length;
  assertEqual(hitActiveOccurrences, 1, '4.4: Class hit-active is present exactly once (no set duplication)');

  // 4.5: Debounce verification: wait 100ms (< 180ms) — MUST STILL BE ACTIVE
  await sleep(100);
  assertTrue(hm.classList.contains('hit-active'), '4.5.1: Hitmarker still active at 100ms (< 180ms timeout)');
  assertFalse(hm.classList.contains('hidden'), '4.5.2: Hitmarker not hidden at 100ms');

  // 4.6: Wait another 120ms (total 220ms > 180ms) — MUST BE CLEANED UP
  await sleep(120);
  assertFalse(hm.classList.contains('hit-active'), '4.6.1: Hitmarker hit-active removed after 180ms timeout expired');
  assertTrue(hm.classList.contains('hidden'), '4.6.2: Hitmarker has hidden class restored after 180ms');

  // 4.7: Re-trigger verification after auto-dismissal
  hud.triggerHitmarker();
  assertTrue(hm.classList.contains('hit-active'), '4.7.1: Re-trigger after dismiss adds hit-active');
  assertFalse(hm.classList.contains('hidden'), '4.7.2: Re-trigger removes hidden');
  await sleep(220);
  assertFalse(hm.classList.contains('hit-active'), '4.7.3: Second cleanup auto-dismisses cleanly');
  assertTrue(hm.classList.contains('hidden'), '4.7.4: Second cleanup restores hidden');

  // 4.8: Staggered asynchronous rapid firing: 5 hits spaced 40ms apart
  // Hit at 0ms, 40ms, 80ms, 120ms, 160ms. Total duration = 160ms.
  // Hitmarker must stay active through 160ms + 180ms = 340ms, and only dismiss after that.
  const staggerStart = Date.now();
  for (let s = 0; s < 5; s++) {
    hud.triggerHitmarker();
    await sleep(40);
  }
  assertTrue(hm.classList.contains('hit-active'), '4.8.1: Still active after staggered attack burst');
  await sleep(100); // 140ms after last hit (< 180ms)
  assertTrue(hm.classList.contains('hit-active'), '4.8.2: Still active 100ms after last hit in burst');
  await sleep(100); // 200ms after last hit (> 180ms)
  assertFalse(hm.classList.contains('hit-active'), '4.8.3: Dismisses cleanly 200ms after final hit in burst');
  assertTrue(hm.classList.contains('hidden'), '4.8.4: Restores hidden class after burst');

  // ==========================================================================
  // HARNESS SUMMARY
  // ==========================================================================
  console.log('\n======================================================================');
  console.log(`  ADVERSARIAL SUITE SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    console.error(`  FAILURES DETECTED: ${failedTests} tests failed!`);
    failureDetails.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('  ALL ADVERSARIAL STRESS TESTS PASSED WITH 100% EMPIRICAL INTEGRITY!\n');
    process.exit(0);
  }
}

runAdversarialHarness().catch(err => {
  console.error('Fatal Harness Error:', err);
  process.exit(1);
});
