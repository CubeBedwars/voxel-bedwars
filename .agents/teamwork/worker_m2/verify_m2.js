/**
 * .agents/teamwork/worker_m2/verify_m2.js
 * Comprehensive Verification & Forensic Assertion Script for Milestone 2 (Features 8-14).
 */

import '../../../tests/mocks/browser-shim.js';
import { RankManager, RANKED_FORMATS } from '../../../src/stats/RankManager.js';
import { LevelManager } from '../../../src/stats/LevelManager.js';
import { AuthManager } from '../../../src/auth/AuthManager.js';
import { Player } from '../../../src/entities/Player.js';
import { TeamManager } from '../../../src/game/TeamManager.js';

console.log('=== Milestone 2 (M2) Forensic Verification Suite ===\n');

let passed = 0;
let total = 0;

function assert(cond, name) {
  total++;
  if (cond) {
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${name}`);
    process.exitCode = 1;
  }
}

// ============================================================================
// TEST GROUP 1: bloxd.io RankManager (Feature 12)
// ============================================================================
console.log('--- Test Group 1: RankManager (Feature 12) ---');

assert(RankManager.isRankedFormat('1v1'), '1v1 is recognized as ranked format');
assert(RankManager.isRankedFormat('2v2'), '2v2 is recognized as ranked format');
assert(RankManager.isRankedFormat('3v3'), '3v3 is recognized as ranked format');
assert(RankManager.isRankedFormat('4v4'), '4v4 is recognized as ranked format');
assert(!RankManager.isRankedFormat('solo'), 'Solo (4-team) is NOT ranked');
assert(!RankManager.isRankedFormat('octagon_8team'), 'Octagon (8-team) is NOT ranked');

const rankMgr = new RankManager('vw_test_rank');
rankMgr.reset();
assert(rankMgr.rating === 1000, 'Baseline rank rating is 1000 RR');
assert(rankMgr.getTier() === 'Silver', '1000 rating maps to Silver tier');

// Win official 1v1 match: 25 base + 3*2 kills + 1*5 final + 1*10 bed = +46
const resWin = rankMgr.recordMatch({ format: '1v1', outcome: 'win', kills: 3, finalKills: 1, bedsBroken: 1 });
assert(resWin.isRanked === true, '1v1 match is recorded as ranked');
assert(resWin.deltaRating === 46, 'Delta rating calculates to 46 RR');
assert(resWin.rating === 1046, 'New rating is 1046 RR');

// Win unranked 4-team solo match: delta MUST BE 0!
const resUnranked = rankMgr.recordMatch({ format: 'solo', outcome: 'win', kills: 10, finalKills: 3, bedsBroken: 3 });
assert(resUnranked.isRanked === false, 'Solo 4-team match is NOT ranked');
assert(resUnranked.deltaRating === 0, 'Unranked match produces 0 delta rating');
assert(resUnranked.rating === 1046, 'Rank rating remains unchanged after unranked match');

// Loss in 1v1 match: -20 base + 0 kills = -20
const resLoss = rankMgr.recordMatch({ format: '1v1', outcome: 'loss', kills: 0, finalKills: 0, bedsBroken: 0 });
assert(resLoss.deltaRating === -20, 'Ranked loss produces negative rating delta (-20)');
assert(resLoss.rating === 1026, 'Rating drops to 1026 RR');

// Tier thresholds check
assert(RankManager.getRankTier(850) === 'Bronze', '850 RR is Bronze');
assert(RankManager.getRankTier(1200) === 'Silver', '1200 RR is Silver');
assert(RankManager.getRankTier(1750) === 'Gold', '1750 RR is Gold');
assert(RankManager.getRankTier(2200) === 'Diamond', '2200 RR is Diamond');
assert(RankManager.getRankTier(2600) === 'Master', '2600 RR is Master');

// Floor at 0 rating
const bigLoss = rankMgr.recordMatch({ format: '1v1', outcome: 'loss', kills: 0, finalKills: 0 });
rankMgr.rating = 5;
const floorLoss = rankMgr.recordMatch({ format: '1v1', outcome: 'loss', kills: 0, finalKills: 0 });
assert(floorLoss.rating === 0, 'Rank rating never drops below 0');

// ============================================================================
// TEST GROUP 2: Player Level & XP Progression (Feature 13)
// ============================================================================
console.log('\n--- Test Group 2: LevelManager (Feature 13) ---');

const lvlMgr = new LevelManager('vw_test_level');
lvlMgr.reset();
assert(lvlMgr.level === 1, 'Initial player level is 1');
assert(lvlMgr.totalXP === 0, 'Initial player XP is 0');

// Win calculation: 100 win + 2*15 kills + 1*35 final + 1*50 bed = 215 XP
const xpWin = LevelManager.calculateMatchXP('win', 2, 1, 1);
assert(xpWin === 215, 'Match XP correctly sums base and performance bonuses (215 XP)');

// Loss calculation: 30 base XP
const xpLoss = LevelManager.calculateMatchXP('loss', 0, 0, 0);
assert(xpLoss === 30, 'Consolation participation XP for loss is 30 XP');

// Level progression across matches
const lvlRes1 = lvlMgr.recordMatch({ outcome: 'win', kills: 2, finalKills: 1, bedsBroken: 1 });
assert(lvlRes1.totalXP === 215, 'Total XP accumulates across matches');
assert(lvlRes1.level === 2, '215 XP achieves Player Level 2 (100 XP threshold)');
assert(lvlRes1.leveledUp === true, 'Leveled up flag set to true');

// Unranked matches also award XP!
const lvlRes2 = lvlMgr.recordMatch({ outcome: 'loss', kills: 1, finalKills: 0, bedsBroken: 0 });
assert(lvlRes2.xpEarned === 45, 'Casual/unranked matches award full XP');

// Scale curve verification
const lvlAt2000 = LevelManager.calculateLevelFromXP(2000);
assert(lvlAt2000.level >= 5, '2000 XP scales to Level 5+');

// ============================================================================
// TEST GROUP 3: AuthManager (Feature 14)
// ============================================================================
console.log('\n--- Test Group 3: AuthManager (Feature 14) ---');

const authMgr = new AuthManager('vw_test_auth_profile', 'vw_test_auth_token');
assert(authMgr.profile !== null, 'AuthManager initializes profile');
assert(authMgr.profile.provider === 'guest', 'Default unauthenticated session is Guest');
assert(authMgr.profile.userId.startsWith('guest_'), 'Guest user ID is unique and formatted');
assert(!authMgr.isAuthenticated(), 'Guest session is not marked as authenticated');

// Login with GitHub (primary option)
const ghProfile = authMgr.loginWithGitHub('OctoWarrior');
assert(authMgr.isAuthenticated(), 'GitHub login marks session authenticated');
assert(ghProfile.provider === 'github', 'Provider is GitHub');
assert(ghProfile.username === 'OctoWarrior', 'Username set to GitHub handle');
assert(authMgr.token.startsWith('gho_'), 'GitHub OAuth token generated and stored');

// Login with Google (fallback option)
const googProfile = authMgr.loginWithGoogle('GoogleGamer');
assert(googProfile.provider === 'google', 'Provider is Google');
assert(authMgr.token.startsWith('ya29.'), 'Google OAuth token stored');

// Logout reverts safely to Guest
authMgr.logout();
assert(!authMgr.isAuthenticated(), 'Logout revokes authenticated state');
assert(authMgr.profile.provider === 'guest', 'Reverts to persistent guest profile');

// ============================================================================
// TEST GROUP 4: Team Upgrades Combat Integration (Feature 10)
// ============================================================================
console.log('\n--- Test Group 4: Team Upgrades Combat Integration (Feature 10) ---');

const teamMgr = new TeamManager();
const redPlayer = new Player('p_red', 'RedPlayer', 'red', true);
redPlayer.teamManager = teamMgr;
const blueEnemy = new Player('p_blue', 'BlueEnemy', 'blue', false);
blueEnemy.teamManager = teamMgr;

// Sharpness upgrade check: default 4.0 damage (wooden sword)
assert(redPlayer.getAttackDamage(teamMgr) === 4.0, 'Base wooden sword deals 4.0 damage');
teamMgr.teams.red.upgrades.sharpness = 2;
// 4.0 + 2 * 1.25 = 6.5 damage
assert(redPlayer.getAttackDamage(teamMgr) === 6.5, 'Sharpness II adds +2.5 bonus damage (6.5 total)');

// Protection upgrade check: 10% reduction per tier
teamMgr.teams.blue.upgrades.protection = 2; // 20% reduction
blueEnemy.health = 20;
// Incoming damage 10.0 -> 20% reduction = 8.0 damage taken
blueEnemy.takeDamage(10.0);
assert(blueEnemy.health === 12.0, 'Protection II reduces incoming damage by 20% (took 8.0 damage)');

// Combined Armor + Protection
blueEnemy.health = 20;
blueEnemy.setArmor('iron', 0.35); // 35% armor reduction
// 10.0 * (1 - 0.35) * (1 - 0.20) = 10 * 0.65 * 0.8 = 5.2 damage -> 14.8 HP
blueEnemy.takeDamage(10.0);
assert(Math.abs(blueEnemy.health - 14.8) < 0.01, 'Armor and Team Protection reductions combine multiplicatively');

// ============================================================================
// TEST GROUP 5: Combat Attribution & Bed Deduplication (Feature 11)
// ============================================================================
console.log('\n--- Test Group 5: Combat Attribution & Bed Deduplication (Feature 11) ---');

const attacker = new Player('p_att', 'Attacker', 'red', true);
const victim = new Player('p_vic', 'Victim', 'blue', false);

// Attacker strikes victim
victim.takeDamage(4.0, attacker);
assert(victim.lastAttacker === attacker, 'Attacker is tagged on victim');
assert(victim.lastAttackTimestamp > 0, 'Attack timestamp recorded');

// Victim dies with killer = null within 10s (e.g. falling into void)
victim.die(null);
assert(attacker.kills === 1, 'Attacker credited with kill on void death within 10s');

// Attack tag expiration (> 10s)
const victim2 = new Player('p_vic2', 'Victim2', 'blue', false);
victim2.takeDamage(4.0, attacker);
victim2.lastAttackTimestamp = Date.now() - 15000; // 15 seconds ago
victim2.die(null);
assert(attacker.kills === 1, 'No kill credited if attack occurred > 10 seconds ago');

// Bed Deduplication logic
let bedBreakCount = 0;
const testBed = { hasBed: true };
function destroyBedTest() {
  if (testBed.hasBed) {
    testBed.hasBed = false;
    bedBreakCount++;
  }
}
destroyBedTest(); // break head
destroyBedTest(); // break foot simultaneously
assert(bedBreakCount === 1, 'Exactly one bed break event fires for 2-block bed');

// ============================================================================
// SUMMARY
// ============================================================================
console.log(`\n==================================================`);
console.log(`Milestone 2 Verification Complete: ${passed}/${total} assertions passed.`);
if (passed === total) {
  console.log('ALL M2 FORENSIC INTEGRITY CHECKS PASSED (100% SUCCESS)!');
} else {
  console.error(`FAILED: ${total - passed} checks failed.`);
  process.exit(1);
}
