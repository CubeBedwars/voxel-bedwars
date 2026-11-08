/**
 * tests/stress_m3_gen4_challenger2.js
 * Empirical Adversarial Verification Suite for Milestone 3:
 * Authentic Hypixel Bedwars HUD & bloxd.io In-Game UI.
 *
 * Conducted by Challenger 2 (Empirical Challenger).
 */

import { performance } from 'perf_hooks';
import './mocks/browser-shim.js';
import { HUD, calculateArmorDefensePoints, formatNextEvent } from '../src/ui/HUD.js';
import { GameManager } from '../src/game/GameManager.js';
import { TeamManager } from '../src/game/TeamManager.js';
import { LevelManager } from '../src/stats/LevelManager.js';
import { RankManager } from '../src/stats/RankManager.js';
import { MAP_PRESETS } from '../src/game/MapPresets.js';

console.log('\n======================================================================');
console.log('   CHALLENGER 2: EMPIRICAL ADVERSARIAL STRESS HARNESS (MILESTONE 3)    ');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function assert(condition, message, context = {}) {
  totalTests++;
  if (condition) {
    passedTests++;
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

function assertMatch(str, regex, message) {
  assert(regex.test(str), `${message} (String: "${str}", Regex: ${regex})`, { str });
}

function assertIncludes(str, substr, message) {
  assert(str && str.includes(substr), `${message} (String: "${str}", Substr: "${substr}")`, { str, substr });
}

// Helper to construct a mock DOM structure for HUD
function createMockGameManager(options = {}) {
  const gm = {
    canvas: { requestPointerLock: () => {} },
    localPlayer: {
      name: 'ChallengerHero',
      team: options.team || 'red',
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
      hotbar: new Array(9).fill(null),
      position: { x: 0, y: 64, z: 0 },
      isDead: false,
      isFinalDead: false,
      respawnTimer: 0,
    },
    teamManager: new TeamManager(options.activeTeams || ['red', 'blue', 'green', 'yellow']),
    matchTime: 0,
    matchFormat: options.matchFormat || 'solo',
    currentMap: 'Speedway',
    mapPreset: options.mapPreset || {
      name: 'Speedway',
      spawns: {
        red: { x: 0, y: 64, z: 0 },
        blue: { x: 100, y: 64, z: 0 },
        green: { x: 0, y: 64, z: 100 },
        yellow: { x: 100, y: 64, z: 100 },
      }
    },
    rankManager: new RankManager(),
    levelManager: new LevelManager(),
    mutationManager: { activeMutation: { name: 'Supercharged' } },
    sound: { playHit: () => {}, playSwordSwing: () => {} },
    lastAnnouncement: null,
    showAnnouncement(title, sub) {
      this.lastAnnouncement = { title, sub };
    }
  };

  // Bind GameManager methods
  gm.isPlayerAtBase = GameManager.prototype.isPlayerAtBase.bind(gm);
  gm.toggleQuickShop = GameManager.prototype.toggleQuickShop.bind(gm);

  return gm;
}

// ============================================================================
// STRESS TEST 1: SCOREBOARD EVENT PROGRESSION (0s TO 2000s IN 1s STEPS)
// ============================================================================
console.log('\x1b[36m--- [Stress 1] Scoreboard Event Progression (0s to 2000s, 1s steps) ---\x1b[0m');

{
  let zeroTo2000Valid = true;
  let noNegativeCountdowns = true;
  let noNaNOutputs = true;
  let strictlyFormatted = true;

  const eventRanges = [
    { name: 'Diamond II', start: 0, end: 239 },
    { name: 'Emerald II', start: 240, end: 479 },
    { name: 'Diamond III', start: 480, end: 719 },
    { name: 'Emerald III', start: 720, end: 959 },
    { name: 'Bed Destruction', start: 960, end: 1199 },
    { name: 'Sudden Death', start: 1200, end: 1499 },
    { name: 'Game End', start: 1500, end: 2000 },
  ];

  for (let t = 0; t <= 2000; t++) {
    const formatted = formatNextEvent(t);

    if (typeof formatted !== 'string' || formatted.length === 0) {
      zeroTo2000Valid = false;
    }

    if (formatted.includes('NaN') || formatted.includes('undefined') || formatted.includes('null')) {
      noNaNOutputs = false;
    }

    if (formatted.includes('-')) {
      noNegativeCountdowns = false;
    }

    // Determine expected event
    if (t < 1500) {
      const match = formatted.match(/^(Diamond II|Emerald II|Diamond III|Emerald III|Bed Destruction|Sudden Death) in (\d{2}):(\d{2})$/);
      if (!match) {
        strictlyFormatted = false;
      } else {
        const mins = parseInt(match[2], 10);
        const secs = parseInt(match[3], 10);
        if (secs < 0 || secs >= 60 || mins < 0) {
          strictlyFormatted = false;
        }
      }
    } else {
      if (formatted !== 'Game End') {
        strictlyFormatted = false;
      }
    }
  }

  assertTrue(zeroTo2000Valid, '1.1: Every second from 0s to 2000s produces a valid non-empty string');
  assertTrue(noNaNOutputs, '1.2: No NaN, undefined, or null appears in any countdown output');
  assertTrue(noNegativeCountdowns, '1.3: No negative signs or negative numbers appear across 0s-2000s');
  assertTrue(strictlyFormatted, '1.4: All outputs match exact event schedule and strict MM:SS format or Game End');

  // Verify transition boundaries exactly
  assertEqual(formatNextEvent(0), 'Diamond II in 04:00', '1.5: t=0s is Diamond II in 04:00');
  assertEqual(formatNextEvent(239), 'Diamond II in 00:01', '1.6: t=239s is Diamond II in 00:01');
  assertEqual(formatNextEvent(240), 'Emerald II in 04:00', '1.7: t=240s transitions immediately to Emerald II in 04:00');
  assertEqual(formatNextEvent(479), 'Emerald II in 00:01', '1.8: t=479s is Emerald II in 00:01');
  assertEqual(formatNextEvent(480), 'Diamond III in 04:00', '1.9: t=480s transitions immediately to Diamond III in 04:00');
  assertEqual(formatNextEvent(719), 'Diamond III in 00:01', '1.10: t=719s is Diamond III in 00:01');
  assertEqual(formatNextEvent(720), 'Emerald III in 04:00', '1.11: t=720s transitions to Emerald III in 04:00');
  assertEqual(formatNextEvent(959), 'Emerald III in 00:01', '1.12: t=959s is Emerald III in 00:01');
  assertEqual(formatNextEvent(960), 'Bed Destruction in 04:00', '1.13: t=960s transitions to Bed Destruction in 04:00');
  assertEqual(formatNextEvent(1199), 'Bed Destruction in 00:01', '1.14: t=1199s is Bed Destruction in 00:01');
  assertEqual(formatNextEvent(1200), 'Sudden Death in 05:00', '1.15: t=1200s transitions to Sudden Death in 05:00');
  assertEqual(formatNextEvent(1499), 'Sudden Death in 00:01', '1.16: t=1499s is Sudden Death in 00:01');
  assertEqual(formatNextEvent(1500), 'Game End', '1.17: t=1500s is Game End');
  assertEqual(formatNextEvent(2000), 'Game End', '1.18: t=2000s is Game End');

  // Sub-second & Adversarial inputs
  assertEqual(formatNextEvent(239.1), 'Diamond II in 00:01', '1.19: Fractional time 239.1s ceil remaining to 1s');
  assertEqual(formatNextEvent(239.999), 'Diamond II in 00:01', '1.20: Fractional time 239.999s ceil remaining to 1s');
  assertEqual(formatNextEvent(1499.5), 'Sudden Death in 00:01', '1.21: Fractional time 1499.5s ceil remaining to 1s');
  assertEqual(formatNextEvent(-5), 'Diamond II in 04:05', '1.22: Negative time handled without crash');
  assertEqual(formatNextEvent(999999), 'Game End', '1.23: Post-game timestamp returns Game End');
}

// ============================================================================
// STRESS TEST 2: TEAM BED STATUS PERMUTATIONS (2, 4, 8 TEAMS)
// ============================================================================
console.log('\n\x1b[36m--- [Stress 2] Team Bed Status Permutations (2, 4, 8 Teams) ---\x1b[0m');

{
  const configurations = [
    { name: '2-Team (Ranked 1v1 / 2v2)', teams: ['red', 'blue'] },
    { name: '4-Team (Standard 4v4 / Solos)', teams: ['red', 'blue', 'green', 'yellow'] },
    { name: '8-Team (Octagon 8-Team Solos/Duos)', teams: ['red', 'blue', 'green', 'yellow', 'aqua', 'white', 'pink', 'gray'] },
  ];

  for (const config of configurations) {
    const gm = createMockGameManager({ activeTeams: config.teams, team: 'red' });
    const hud = new HUD(gm);
    const tm = gm.teamManager;

    // Register 2 players per team
    for (const tName of config.teams) {
      const p1 = { id: `${tName}_1`, name: `${tName}P1`, team: tName, isDead: false, isFinalDead: false };
      const p2 = { id: `${tName}_2`, name: `${tName}P2`, team: tName, isDead: false, isFinalDead: false };
      tm.registerPlayer(p1);
      tm.registerPlayer(p2);
    }

    // Step A: Initial state - All beds intact
    hud.updateScoreboard(gm.localPlayer, tm, 60);
    let html = hud.sbTeamBedsEl.innerHTML;

    for (const tName of config.teams) {
      const initial = tName.charAt(0).toUpperCase();
      assertIncludes(html, `team-${tName}`, `2.A [${config.name}]: Team ${tName} has row present`);
      if (tName === 'red') {
        assertIncludes(html, 'sb-bed-you', `2.A [${config.name}]: Local player team red has sb-bed-you class`);
        assertIncludes(html, '<span class="sb-you-tag">YOU</span>', `2.A [${config.name}]: Local team red has [YOU] tag`);
      }
    }

    // Every team has alive icon ✓
    const aliveIcons = (html.match(/sb-bed-alive">✓/g) || []).length;
    assertEqual(aliveIcons, config.teams.length, `2.A [${config.name}]: All ${config.teams.length} teams show ✓ when beds intact`);

    // Step B: Break beds for half of the teams
    const brokenTeams = config.teams.slice(0, Math.ceil(config.teams.length / 2));
    for (const tName of brokenTeams) {
      tm.destroyBed(tName);
    }
    hud.updateScoreboard(gm.localPlayer, tm, 120);
    html = hud.sbTeamBedsEl.innerHTML;

    for (const tName of brokenTeams) {
      // With 2 players alive and bed broken -> shows '2'
      assertIncludes(html, `team-${tName}`, `2.B [${config.name}]: Team ${tName} has row present`);
      assertIncludes(html, `sb-bed-broken">2</span>`, `2.B [${config.name}]: Broken bed with 2 alive players displays count 2`);
    }

    // Kill 1 player on first broken team -> count reduces to 1
    const firstBroken = brokenTeams[0];
    tm.teams[firstBroken].players[0].isDead = true;
    tm.teams[firstBroken].players[0].isFinalDead = true;
    hud.updateScoreboard(gm.localPlayer, tm, 180);
    html = hud.sbTeamBedsEl.innerHTML;
    assertIncludes(html, `sb-bed-broken">1</span>`, `2.B [${config.name}]: Broken bed with 1 survivor displays count 1`);

    // Step C: Eliminate first broken team completely -> renders ✗
    tm.teams[firstBroken].players[1].isDead = true;
    tm.teams[firstBroken].players[1].isFinalDead = true;
    assertTrue(tm.isTeamEliminated(firstBroken), `2.C [${config.name}]: Team ${firstBroken} confirmed eliminated in TeamManager`);
    hud.updateScoreboard(gm.localPlayer, tm, 240);
    html = hud.sbTeamBedsEl.innerHTML;
    assertIncludes(html, `sb-bed-elim">✗</span>`, `2.C [${config.name}]: Eliminated team renders ✗ icon`);

    // Step D: Verify [YOU] tag shifts correctly if localPlayer is on a different team
    const otherTeam = config.teams[config.teams.length - 1]; // e.g. blue or gray
    gm.localPlayer.team = otherTeam;
    hud.updateScoreboard(gm.localPlayer, tm, 300);
    html = hud.sbTeamBedsEl.innerHTML;

    // Check that 'YOU' is now exclusively on otherTeam
    assertIncludes(html, `team-${otherTeam} sb-bed-you`, `2.D [${config.name}]: [YOU] moved to localPlayer team ${otherTeam}`);
    const youOccurrences = (html.match(/<span class="sb-you-tag">YOU<\/span>/g) || []).length;
    assertEqual(youOccurrences, 1, `2.D [${config.name}]: Exactly 1 [YOU] tag appears in scoreboard across all ${config.teams.length} teams`);

    // Reset localPlayer team
    gm.localPlayer.team = 'red';
  }

  // Monte Carlo Randomized State Permutations (50 randomized rounds on 4-team and 8-team)
  let monteCarloSuccess = true;
  for (let round = 0; round < 50; round++) {
    const teamCount = round % 2 === 0 ? 4 : 8;
    const teamNames = ['red', 'blue', 'green', 'yellow', 'aqua', 'white', 'pink', 'gray'].slice(0, teamCount);
    const localTeam = teamNames[round % teamNames.length];
    const gm = createMockGameManager({ activeTeams: teamNames, team: localTeam });
    const hud = new HUD(gm);
    const tm = gm.teamManager;

    for (const tName of teamNames) {
      const pCount = 1 + (round % 4); // 1 to 4 players
      for (let p = 0; p < pCount; p++) {
        tm.registerPlayer({ id: `${tName}_${p}`, team: tName, isDead: false, isFinalDead: false });
      }
    }

    // Randomly assign states
    for (const tName of teamNames) {
      const state = Math.floor(Math.random() * 3); // 0=alive bed, 1=broken bed with survivors, 2=eliminated
      if (state >= 1) {
        tm.destroyBed(tName);
      }
      if (state === 2) {
        for (const p of tm.teams[tName].players) {
          p.isDead = true;
          p.isFinalDead = true;
        }
      } else if (state === 1 && tm.teams[tName].players.length > 1) {
        // Kill some but not all
        tm.teams[tName].players[0].isDead = true;
        tm.teams[tName].players[0].isFinalDead = true;
      }
    }

    hud.updateScoreboard(gm.localPlayer, tm, 400 + round);
    const roundHtml = hud.sbTeamBedsEl.innerHTML;

    // Verify consistency:
    const youMatches = (roundHtml.match(/<span class="sb-you-tag">YOU<\/span>/g) || []).length;
    if (youMatches !== 1) {
      monteCarloSuccess = false;
      break;
    }

    for (const tName of teamNames) {
      const tData = tm.teams[tName];
      const elim = tm.isTeamEliminated(tName);
      if (tData.hasBed) {
        if (!roundHtml.includes(`team-${tName}`) || !roundHtml.includes('sb-bed-alive')) {
          monteCarloSuccess = false;
        }
      } else if (elim) {
        if (!roundHtml.includes(`team-${tName}`) || !roundHtml.includes('sb-bed-elim')) {
          monteCarloSuccess = false;
        }
      } else {
        const aliveCount = tData.players.filter(p => !p.isDead || !p.isFinalDead).length;
        if (!roundHtml.includes(`sb-bed-broken">${aliveCount}</span>`)) {
          monteCarloSuccess = false;
        }
      }
    }
  }
  assertTrue(monteCarloSuccess, '2.E: 50 Monte Carlo randomized bed status permutations passed 100% consistently');
}

// ============================================================================
// STRESS TEST 3: QUICK SHOP ISLAND PROXIMITY & BOUNDARY TESTS
// ============================================================================
console.log('\n\x1b[36m--- [Stress 3] Quick Shop Island Proximity & Shortcut Tests ---\x1b[0m');

{
  const gm = createMockGameManager({
    mapPreset: {
      name: 'Speedway',
      spawns: {
        red: { x: 0, y: 64, z: 0 },
        blue: { x: 100, y: 64, z: 50 },
      }
    }
  });
  const hud = new HUD(gm);
  gm.hud = hud;

  // Initialize shop modal to closed
  hud.shopModal.classList.add('hidden');

  // Test distance 0m: at spawn
  gm.localPlayer.position = { x: 0, y: 64, z: 0 };
  assertTrue(gm.isPlayerAtBase(), '3.1: Distance 0m (at spawn) returns true for isPlayerAtBase');
  gm.toggleQuickShop();
  assertFalse(hud.shopModal.classList.contains('hidden'), '3.2: Distance 0m opens Quick Shop modal');
  // Toggle closed
  gm.toggleQuickShop();
  assertTrue(hud.shopModal.classList.contains('hidden'), '3.3: Toggle closes Quick Shop modal');

  // Test distance 10m: within base perimeter
  gm.localPlayer.position = { x: 10, y: 64, z: 0 };
  assertTrue(gm.isPlayerAtBase(), '3.4: Distance 10m returns true for isPlayerAtBase');
  gm.toggleQuickShop();
  assertFalse(hud.shopModal.classList.contains('hidden'), '3.5: Distance 10m opens Quick Shop modal');
  hud.closeShop();

  // Test distance 23.9m: just inside 24m perimeter
  gm.localPlayer.position = { x: 23.9, y: 64, z: 0 };
  assertTrue(gm.isPlayerAtBase(), '3.6: Distance 23.9m returns true for isPlayerAtBase (should allow)');
  gm.toggleQuickShop();
  assertFalse(hud.shopModal.classList.contains('hidden'), '3.7: Distance 23.9m opens Quick Shop modal');
  hud.closeShop();

  // Test boundary 24.0m exactly
  gm.localPlayer.position = { x: 24.0, y: 64, z: 0 };
  assertTrue(gm.isPlayerAtBase(), '3.8: Exact boundary 24.0m returns true (dist <= 24)');

  // Test distance 24.1m: just outside perimeter
  gm.localPlayer.position = { x: 24.1, y: 64, z: 0 };
  assertFalse(gm.isPlayerAtBase(), '3.9: Distance 24.1m returns false for isPlayerAtBase (should reject)');
  hud.announceSubtitle.innerText = '';
  gm.toggleQuickShop();
  assertTrue(hud.shopModal.classList.contains('hidden'), '3.10: Distance 24.1m rejects Quick Shop (remains hidden)');
  assertIncludes(hud.announceSubtitle.innerText, 'You must be at your base island', '3.11: Distance 24.1m shows base warning announcement');

  // Test distance 50m: bridging across void
  gm.localPlayer.position = { x: 50, y: 64, z: 0 };
  assertFalse(gm.isPlayerAtBase(), '3.12: Distance 50m returns false (bridging across void)');
  hud.announceSubtitle.innerText = '';
  gm.toggleQuickShop();
  assertTrue(hud.shopModal.classList.contains('hidden'), '3.13: Distance 50m rejects Quick Shop modal');
  assertIncludes(hud.announceSubtitle.innerText, 'You must be at your base island', '3.14: Distance 50m triggers warning announcement');

  // Test distance 100m: enemy base / middle island
  gm.localPlayer.position = { x: 100, y: 64, z: 0 };
  assertFalse(gm.isPlayerAtBase(), '3.15: Distance 100m returns false (middle island/enemy base)');
  hud.announceSubtitle.innerText = '';
  gm.toggleQuickShop();
  assertTrue(hud.shopModal.classList.contains('hidden'), '3.16: Distance 100m rejects Quick Shop modal');
  assertIncludes(hud.announceSubtitle.innerText, 'You must be at your base island', '3.17: Distance 100m triggers warning announcement');

  // Multi-axis 2D Euclidean Distance Tests
  // Diagonal 23.99m (x=16.96, z=16.96 -> hypot = 23.985)
  gm.localPlayer.position = { x: 16.96, y: 64, z: 16.96 };
  assertTrue(gm.isPlayerAtBase(), '3.18: Diagonal distance 23.985m is allowed');

  // Diagonal 24.14m (x=17.07, z=17.07 -> hypot = 24.14)
  gm.localPlayer.position = { x: 17.07, y: 64, z: 17.07 };
  assertFalse(gm.isPlayerAtBase(), '3.19: Diagonal distance 24.14m is rejected');

  // Negative coordinates (-23.9, 64, 0)
  gm.localPlayer.position = { x: -23.9, y: 64, z: 0 };
  assertTrue(gm.isPlayerAtBase(), '3.20: Negative coordinate -23.9m is allowed');

  // Negative coordinates (-24.1, 64, 0)
  gm.localPlayer.position = { x: -24.1, y: 64, z: 0 };
  assertFalse(gm.isPlayerAtBase(), '3.21: Negative coordinate -24.1m is rejected');

  // Vertical independence: standing on roof or tower on base island (Y=120)
  gm.localPlayer.position = { x: 5, y: 120, z: 5 };
  assertTrue(gm.isPlayerAtBase(), '3.22: High Y coordinate on base island allows Quick Shop');

  // Non-origin spawn: Blue team spawn at (100, 64, 50)
  gm.localPlayer.team = 'blue';
  gm.localPlayer.position = { x: 100, y: 64, z: 50 };
  assertTrue(gm.isPlayerAtBase(), '3.23: Blue player at Blue spawn (100, 64, 50) allows Quick Shop');

  gm.localPlayer.position = { x: 123.9, y: 64, z: 50 };
  assertTrue(gm.isPlayerAtBase(), '3.24: Blue player at distance 23.9m from Blue spawn allows Quick Shop');

  gm.localPlayer.position = { x: 124.1, y: 64, z: 50 };
  assertFalse(gm.isPlayerAtBase(), '3.25: Blue player at distance 24.1m from Blue spawn rejects Quick Shop');

  // Restore player team
  gm.localPlayer.team = 'red';
}

// ============================================================================
// STRESS TEST 4: XP BAR & LEVEL NUMERAL (LEVEL 1 TO 100 & FRACTIONAL PERCENTAGES)
// ============================================================================
console.log('\n\x1b[36m--- [Stress 4] XP Bar & Level Numeral Progress & Clamping ---\x1b[0m');

{
  const gm = createMockGameManager();
  const hud = new HUD(gm);

  // 1. Test Levels 1 through 100
  let allLevelsCorrect = true;
  for (let lvl = 1; lvl <= 100; lvl++) {
    hud.updateXP({ level: lvl, getProgress: () => ({ progressPercentage: 50 }) });
    if (hud.hudXpLevelEl.innerText !== String(lvl)) {
      allLevelsCorrect = false;
      break;
    }
  }
  assertTrue(allLevelsCorrect, '4.1: Level numerals 1 through 100 render accurately on hud-xp-level');

  // 2. Test Fractional XP percentages: 0%, 50%, 99.9%, 100%
  hud.updateXP({ level: 10, getProgress: () => ({ progressPercentage: 0 }) });
  assertEqual(hud.hudXpFillEl.style.width, '0%', '4.2: Fractional XP percentage 0% sets width: 0%');

  hud.updateXP({ level: 10, getProgress: () => ({ progressPercentage: 50 }) });
  assertEqual(hud.hudXpFillEl.style.width, '50%', '4.3: Fractional XP percentage 50% sets width: 50%');

  hud.updateXP({ level: 10, getProgress: () => ({ progressPercentage: 99.9 }) });
  assertEqual(hud.hudXpFillEl.style.width, '99.9%', '4.4: Fractional XP percentage 99.9% sets width: 99.9%');

  hud.updateXP({ level: 10, getProgress: () => ({ progressPercentage: 100 }) });
  assertEqual(hud.hudXpFillEl.style.width, '100%', '4.5: Fractional XP percentage 100% sets width: 100%');

  // 3. Test Clamping via LevelManager / player fallback paths
  // Fallback path A: direct player object
  hud.updateXP(null, { level: 15, xp: 0, xpRequired: 100 });
  assertEqual(hud.hudXpFillEl.style.width, '0%', '4.6: Direct player xp 0/100 -> 0%');

  hud.updateXP(null, { level: 15, xp: 50, xpRequired: 100 });
  assertEqual(hud.hudXpFillEl.style.width, '50%', '4.7: Direct player xp 50/100 -> 50%');

  hud.updateXP(null, { level: 15, xp: 100, xpRequired: 100 });
  assertEqual(hud.hudXpFillEl.style.width, '100%', '4.8: Direct player xp 100/100 -> 100%');

  // Negative XP -> clamped to 0%
  hud.updateXP(null, { level: 15, xp: -35, xpRequired: 100 });
  assertEqual(hud.hudXpFillEl.style.width, '0%', '4.9: Negative player xp clamped to 0%');

  // Over-cap XP -> clamped to 100%
  hud.updateXP(null, { level: 15, xp: 250, xpRequired: 100 });
  assertEqual(hud.hudXpFillEl.style.width, '100%', '4.10: Overflowing player xp clamped to 100%');

  // Fallback path B: LevelManager without getProgress
  hud.updateXP({ level: 25, xp: -10, xpRequired: 50 });
  assertEqual(hud.hudXpFillEl.style.width, '0%', '4.11: Negative levelManager.xp clamped to 0%');

  hud.updateXP({ level: 25, xp: 300, xpRequired: 50 });
  assertEqual(hud.hudXpFillEl.style.width, '100%', '4.12: Overflowing levelManager.xp clamped to 100%');

  // 4. Test actual LevelManager.calculateLevelFromXP across levels 1 to 100
  let levelManagerCalculationsValid = true;
  for (let lvl = 1; lvl <= 100; lvl++) {
    // Total XP required for level lvl:
    const baseXP = Math.pow(lvl - 1, 2) * 100;
    const info = LevelManager.calculateLevelFromXP(baseXP);
    if (info.level !== lvl || info.progressPercentage < 0 || info.progressPercentage > 100) {
      levelManagerCalculationsValid = false;
      break;
    }
  }
  assertTrue(levelManagerCalculationsValid, '4.13: LevelManager.calculateLevelFromXP yields level 1..100 with progress in [0, 100]');
}

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n======================================================================');
console.log(`  CHALLENGER 2 SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('======================================================================\n');

if (failedTests > 0) {
  console.error(`\x1b[31mVERDICT: REQUEST_CHANGES (${failedTests} failures detected)\x1b[0m\n`);
  for (const f of failureDetails) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
} else {
  console.log('\x1b[32mVERDICT: APPROVE (100% of empirical challenge tests passed)\x1b[0m\n');
  process.exit(0);
}
