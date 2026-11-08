/**
 * tests/challenger_m1_gen4_2_stress.js
 * Empirical Adversarial Verification Suite for Milestone 1 (Minecraft Asset Pipeline)
 *
 * Authored by: Challenger 2 (Empirical Challenger)
 * Scope:
 *  1. Performance Stress Test: 100,000 lookups benchmark (execution time, throughput, memory heap delta)
 *  2. Missing File / Fallback Resilience & Multi-Face Orientations (grass, furnace, log, crafting table, tnt, bed)
 *  3. Audio Integrity Audit: 251 authentic Minecraft sounds disk resolution & audio headers
 *  4. Glint Animation Audit: 192 frames (12 items x 16 frames) disk resolution & PNG IHDR validity
 *  5. Master Regression Suite: 288/288 E2E runner verification
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { MinecraftAssetLoader } from '../src/engine/MinecraftAssetLoader.js';

const PROJECT_ROOT = path.resolve('C:\\Users\\alekhyo\\.gemini\\antigravity\\scratch\\voxel-bedwars');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const MANIFEST_PATH = path.join(PUBLIC_DIR, 'assets', 'minecraft', 'manifest.json');

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║       CHALLENGER 2: EMPIRICAL ADVERSARIAL VERIFICATION SUITE         ║');
console.log('║         Milestone 1: Minecraft Asset Pipeline & Ingestion            ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failureDetails = [];

function assert(condition, testName, details = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✔ [PASS] ${testName}`);
  } else {
    failedChecks++;
    console.error(`  ✖ [FAIL] ${testName} - ${details}`);
    failureDetails.push({ testName, details });
  }
}

// ============================================================================
// TEST 1: Performance Stress Test (100,000 Lookups)
// ============================================================================
console.log('--- TEST 1: Performance Stress Test (100,000 Lookups Through Loader) ---');

const loader = new MinecraftAssetLoader();
assert(loader.isLoaded(), 'Default loader loaded manifest synchronously in Node.js');

const NUM_LOOKUPS = 100000;
const testBlocks = [
  { name: 'grass', face: 'top' },
  { name: 'grass', face: 'bottom' },
  { name: 'grass', face: 'side' },
  { name: 'furnace', face: 'front' },
  { name: 'furnace', face: 'side' },
  { name: 'oak_log', face: 'top' },
  { name: 'oak_log', face: 'side' },
  { name: 'wool_red', face: 'all' },
  { name: 'wool_blue', face: 'all' },
  { name: 'diamond_block', face: 'all' },
  { name: 'emerald_block', face: 'all' },
  { name: 'obsidian', face: 'all' },
  { name: 'stone', face: 'all' },
  { name: 'nonexistent_block_test', face: 'all' }
];

const testSounds = [
  'explode 1', 'wood break 1', 'stone step 2', 'wool dig 1',
  'hurt 1', 'eat 1', 'bow hit 1', 'click 1', 'nonexistent_sound_123'
];

const testSoundbanks = [
  'dig_wool', 'step_stone', 'player_hurt', 'explosion', 'victory', 'unknown_bank'
];

const testGui = ['hotbar', 'heart_full', 'heart_half', 'defense_full', 'crosshair', 'inventory'];
const testItems = ['diamond_sword', 'iron_pickaxe', 'emerald', 'golden_apple', 'shears'];
const testGlint = ['sword', 'pickaxe', 'axe', 'bow', 'chestplate'];

if (global.gc) {
  global.gc();
}

const memBefore = process.memoryUsage();
const startTime = performance.now();

for (let i = 0; i < NUM_LOOKUPS; i++) {
  const mod = i % 10;
  if (mod < 4) {
    // 40,000 block texture lookups
    const b = testBlocks[i % testBlocks.length];
    loader.getBlockTexture(b.name, b.face);
  } else if (mod < 7) {
    // 30,000 sound / soundbank lookups
    if (i % 2 === 0) {
      const s = testSounds[i % testSounds.length];
      loader.getSound(s);
    } else {
      const sb = testSoundbanks[i % testSoundbanks.length];
      loader.getRandomSoundFromBank(sb);
    }
  } else if (mod < 8) {
    // 10,000 GUI lookups
    const g = testGui[i % testGui.length];
    loader.getGuiTexture(g);
  } else if (mod < 9) {
    // 10,000 item lookups
    const it = testItems[i % testItems.length];
    loader.getItemIcon(it);
  } else {
    // 10,000 glint and crack lookups
    const gl = testGlint[i % testGlint.length];
    loader.getGlintFrame(gl, i % 16);
    loader.getCrackTexture(i % 10);
  }
}

const endTime = performance.now();
const memAfter = process.memoryUsage();

const totalDurationMs = endTime - startTime;
const avgMicrosecondsPerOp = (totalDurationMs * 1000) / NUM_LOOKUPS;
const opsPerSecond = Math.round((NUM_LOOKUPS / totalDurationMs) * 1000);
const heapDeltaMB = ((memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024)).toFixed(2);

console.log(`  [BENCHMARK METRICS]`);
console.log(`  - Total Lookups Executed:   ${NUM_LOOKUPS.toLocaleString()}`);
console.log(`  - Total Execution Time:     ${totalDurationMs.toFixed(2)} ms`);
console.log(`  - Average Time Per Lookup:  ${avgMicrosecondsPerOp.toFixed(3)} µs`);
console.log(`  - Throughput:               ${opsPerSecond.toLocaleString()} lookups/sec`);
console.log(`  - Heap Used Before:         ${(memBefore.heapUsed / (1024 * 1024)).toFixed(2)} MB`);
console.log(`  - Heap Used After:          ${(memAfter.heapUsed / (1024 * 1024)).toFixed(2)} MB`);
console.log(`  - Heap Delta:               ${heapDeltaMB} MB`);

assert(totalDurationMs < 2000, `100,000 lookups completed in < 2,000ms (actual: ${totalDurationMs.toFixed(2)}ms)`);
assert(opsPerSecond > 50000, `Throughput exceeds 50,000 lookups/sec (actual: ${opsPerSecond.toLocaleString()} ops/s)`);
assert(Number(heapDeltaMB) < 50, `Heap memory delta is bounded under 50 MB (actual: ${heapDeltaMB} MB)`);

// ============================================================================
// TEST 2: Missing File / Fallback Resilience & Multi-Face Orientations
// ============================================================================
console.log('\n--- TEST 2: Missing File / Fallback Resilience & Multi-Face Orientations ---');

// 2.1: Missing Manifest Resilience
const missingLoader = new MinecraftAssetLoader({ manifestUrl: '/assets/nonexistent/manifest.json' });
// In Node.js _initSyncNode searches for local files. Let's create an isolated loader with explicit empty options:
const isolatedMissingLoader = new MinecraftAssetLoader();
isolatedMissingLoader.manifest = null;
isolatedMissingLoader.loaded = false;

// Test fallback calls with no manifest loaded
const fallbackBlock = isolatedMissingLoader.getBlockTexture('wool_red');
assert(fallbackBlock === '/assets/minecraft/textures/blocks/wool_red.png', 'Fallback block resolves cleanly when manifest is null');

const fallbackCrack = isolatedMissingLoader.getCrackTexture(4);
assert(fallbackCrack === '/assets/minecraft/textures/cracks/destroy_stage_4.png', 'Fallback crack resolves cleanly when manifest is null');

const fallbackGui = isolatedMissingLoader.getGuiTexture('heart_full');
assert(fallbackGui === '/assets/minecraft/textures/gui/heart_full.png', 'Fallback GUI resolves cleanly when manifest is null');

const fallbackItem = isolatedMissingLoader.getItemIcon('diamond_sword');
assert(fallbackItem === '/assets/minecraft/textures/items/diamond_sword.png', 'Fallback item icon resolves cleanly when manifest is null');

const fallbackGlint = isolatedMissingLoader.getGlintFrame('sword', 3);
assert(fallbackGlint === '/assets/minecraft/textures/glint/glow_sword_3.png', 'Fallback glint frame resolves cleanly when manifest is null');

const fallbackSound = isolatedMissingLoader.getSound('explode 1');
assert(fallbackSound === null, 'Fallback sound query on unloaded loader returns null without throwing');

const fallbackSoundbank = isolatedMissingLoader.getSoundbank('dig_wool');
assert(Array.isArray(fallbackSoundbank) && fallbackSoundbank.length === 0, 'Fallback soundbank query returns empty array without throwing');

const fallbackRandomSound = isolatedMissingLoader.getRandomSoundFromBank('dig_wool');
assert(fallbackRandomSound === null, 'Fallback random sound query returns null without throwing');

// 2.2: Corrupted Manifest Resilience
const corruptedLoader = new MinecraftAssetLoader();
corruptedLoader.manifest = {
  stats: null,
  blocks: null,
  cracks: null,
  gui: null,
  items: null,
  glint: null,
  particles: null,
  soundbanks: null,
  sounds: null
};
corruptedLoader.loaded = true;

try {
  const b = corruptedLoader.getBlockTexture('stone');
  assert(typeof b === 'string', 'Corrupted manifest (null blocks) handled gracefully in getBlockTexture');
} catch (e) {
  assert(false, 'Corrupted manifest threw in getBlockTexture', e.message);
}

try {
  const s = corruptedLoader.getSound('explode 1');
  assert(s === null, 'Corrupted manifest (null sounds) returns null without throwing');
} catch (e) {
  assert(false, 'Corrupted manifest threw in getSound', e.message);
}

try {
  const sb = corruptedLoader.getSoundbank('dig_wool');
  assert(Array.isArray(sb) && sb.length === 0, 'Corrupted manifest (null soundbanks) returns empty array');
} catch (e) {
  assert(false, 'Corrupted manifest threw in getSoundbank', e.message);
}

// 2.3: Malformed & Unknown Sound Queries
assert(loader.getSound(null) === null, 'getSound(null) safely returns null');
assert(loader.getSound(undefined) === null, 'getSound(undefined) safely returns null');
assert(loader.getSound('') === null, 'getSound("") safely returns null');
assert(loader.getSound('__totally_non_existent_minecraft_sound__') === null, 'getSound(unknown) returns null');
assert(loader.getSoundbank('__unknown_category__').length === 0, 'getSoundbank(unknown) returns empty array');
assert(loader.getRandomSoundFromBank('__unknown_category__') === null, 'getRandomSoundFromBank(unknown) returns null');

// 2.4: Multi-Face Block Orientations & Disk File Verification
const multiFaceCases = [
  // Grass Block
  { block: 'grass', face: 'top', expectedFile: 'grass_top.png' },
  { block: 'grass', face: 'bottom', expectedFile: 'dirt.png' },
  { block: 'grass', face: 'side', expectedFile: 'grass_side.png' },
  { block: 'grass', face: 'north', expectedFile: 'grass_side.png' },
  { block: 'grass', face: 'south', expectedFile: 'grass_side.png' },
  { block: 'grass', face: 'east', expectedFile: 'grass_side.png' },
  { block: 'grass', face: 'west', expectedFile: 'grass_side.png' },
  // Furnace
  { block: 'furnace', face: 'front', expectedFile: 'furnace_front.png' },
  { block: 'furnace', face: 'north', expectedFile: 'furnace_front.png' },
  { block: 'furnace', face: 'top', expectedFile: 'furnace_top.png' },
  { block: 'furnace', face: 'bottom', expectedFile: 'stone.png' },
  { block: 'furnace', face: 'side', expectedFile: 'furnace_side.png' },
  { block: 'furnace', face: 'south', expectedFile: 'furnace_side.png' },
  { block: 'furnace', face: 'east', expectedFile: 'furnace_side.png' },
  { block: 'furnace', face: 'west', expectedFile: 'furnace_side.png' },
  // Oak Log
  { block: 'oak_log', face: 'top', expectedFile: 'log_top.png' },
  { block: 'oak_log', face: 'bottom', expectedFile: 'log_top.png' },
  { block: 'oak_log', face: 'side', expectedFile: 'oak_log_side.png' },
  { block: 'oak_log', face: 'north', expectedFile: 'oak_log_side.png' },
  // Crafting Table
  { block: 'crafting_table', face: 'top', expectedFile: 'crafting_table_top.png' },
  { block: 'crafting_table', face: 'bottom', expectedFile: 'oak_planks.png' },
  { block: 'crafting_table', face: 'side', expectedFile: 'crafting_table_side_a.png' },
  { block: 'crafting_table', face: 'east', expectedFile: 'crafting_table_side_b.png' },
  // TNT
  { block: 'tnt', face: 'top', expectedFile: 'tnt_top.png' },
  { block: 'tnt', face: 'bottom', expectedFile: 'tnt_bottom.png' },
  { block: 'tnt', face: 'side', expectedFile: 'tnt_side.png' },
  // Bed
  { block: 'bed_head', face: 'top', expectedFile: 'bed_pillow_top_a.png' },
  { block: 'bed_head', face: 'bottom', expectedFile: 'oak_planks.png' },
  { block: 'bed_head', face: 'side', expectedFile: 'bed_pillow_side_a.png' },
  { block: 'bed_foot', face: 'top', expectedFile: 'bed_foot_top_a.png' },
  { block: 'bed_foot', face: 'bottom', expectedFile: 'oak_planks.png' },
  { block: 'bed_foot', face: 'side', expectedFile: 'bed_foot_side_a.png' }
];

for (const tc of multiFaceCases) {
  const resolvedUrl = loader.getBlockTexture(tc.block, tc.face);
  const expectedUrl = `/assets/minecraft/textures/blocks/${tc.expectedFile}`;
  const localFilePath = path.join(PUBLIC_DIR, 'assets', 'minecraft', 'textures', 'blocks', tc.expectedFile);
  const fileExists = fs.existsSync(localFilePath);

  assert(
    resolvedUrl === expectedUrl && fileExists,
    `Multi-face [${tc.block} / ${tc.face}] -> ${tc.expectedFile} (exists on disk)`,
    `Resolved: ${resolvedUrl}, FileExists: ${fileExists}`
  );
}

// ============================================================================
// TEST 3: All 251 Authentic Minecraft Sounds Verification
// ============================================================================
console.log('\n--- TEST 3: Verify All 251 Authentic Minecraft Sounds Resolve On Disk ---');

const manifestRaw = fs.readFileSync(MANIFEST_PATH, 'utf8');
const manifest = JSON.parse(manifestRaw);

const soundUrlsSet = new Set();
for (const [key, soundUrl] of Object.entries(manifest.sounds || {})) {
  soundUrlsSet.add(soundUrl);
}
for (const [bankKey, urls] of Object.entries(manifest.soundbanks || {})) {
  for (const u of urls) {
    soundUrlsSet.add(u);
  }
}

const uniqueSoundUrls = Array.from(soundUrlsSet);
console.log(`  - Unique audio URLs cataloged in manifest: ${uniqueSoundUrls.length}`);
assert(uniqueSoundUrls.length === 251, `Manifest contains exactly 251 unique sound URLs (got ${uniqueSoundUrls.length})`);

let soundFilesExistCount = 0;
let soundFilesNonEmptyCount = 0;
let validAudioHeadersCount = 0;
let mp3Count = 0;
let wavCount = 0;
let totalAudioBytes = 0;

for (const soundUrl of uniqueSoundUrls) {
  const relPath = soundUrl.replace(/^\//, '').replace(/\//g, path.sep);
  const diskPath = path.join(PUBLIC_DIR, relPath.replace(`public${path.sep}`, ''));

  if (fs.existsSync(diskPath)) {
    soundFilesExistCount++;
    const stat = fs.statSync(diskPath);
    totalAudioBytes += stat.size;
    if (stat.size > 0) {
      soundFilesNonEmptyCount++;
      // Check audio header signature
      const buf = Buffer.alloc(12);
      const fd = fs.openSync(diskPath, 'r');
      fs.readSync(fd, buf, 0, 12, 0);
      fs.closeSync(fd);

      const isID3 = buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33; // 'ID3'
      const isMpegSync = buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0;      // MPEG frame sync (MP3)
      const isWavRiff = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE';

      if (isID3 || isMpegSync) {
        mp3Count++;
        validAudioHeadersCount++;
      } else if (isWavRiff) {
        wavCount++;
        validAudioHeadersCount++;
      } else {
        console.warn(`    [WARNING] Unrecognized audio header for ${soundUrl}: [${buf[0].toString(16)}, ${buf[1].toString(16)}]`);
      }
    }
  } else {
    console.error(`    [MISSING SOUND FILE] ${soundUrl} -> ${diskPath}`);
  }
}

console.log(`  - Files verified on disk:   ${soundFilesExistCount} / 251`);
console.log(`  - Non-empty sound files:    ${soundFilesNonEmptyCount} / 251`);
console.log(`  - Valid Audio Headers:      ${validAudioHeadersCount} / 251 (MP3: ${mp3Count}, WAV: ${wavCount})`);
console.log(`  - Total Audio Asset Size:   ${(totalAudioBytes / (1024 * 1024)).toFixed(2)} MB`);

assert(soundFilesExistCount === 251, `All 251 audio files exist on disk (found: ${soundFilesExistCount})`);
assert(soundFilesNonEmptyCount === 251, `All 251 audio files are non-empty (non-empty: ${soundFilesNonEmptyCount})`);
assert(validAudioHeadersCount === 251, `All 251 audio files have valid MP3 or WAV headers (valid: ${validAudioHeadersCount})`);

// ============================================================================
// TEST 4: All 192 Glint Animation Frames Verification
// ============================================================================
console.log('\n--- TEST 4: Verify All 192 Glint Animation Frames (12 Items x 16 Frames) ---');

const glintItems = Object.keys(manifest.glint || {});
console.log(`  - Cataloged Glint Item Categories (${glintItems.length}):`, glintItems.join(', '));
assert(glintItems.length === 12, `Exactly 12 item categories have enchantment glint frames (got ${glintItems.length})`);

let glintFramesExistCount = 0;
let glintFramesValidPngCount = 0;
let glintFramesCorrectSizeCount = 0;

for (const item of glintItems) {
  const frames = manifest.glint[item];
  assert(Array.isArray(frames) && frames.length === 16, `Item '${item}' has exactly 16 glint animation frames in manifest`);

  for (let frameIdx = 0; frameIdx < 16; frameIdx++) {
    const frameUrl = frames[frameIdx];
    const relPath = frameUrl.replace(/^\//, '').replace(/\//g, path.sep);
    const diskPath = path.join(PUBLIC_DIR, relPath.replace(`public${path.sep}`, ''));

    if (fs.existsSync(diskPath)) {
      glintFramesExistCount++;
      const stat = fs.statSync(diskPath);
      if (stat.size >= 24) { // PNG header (8) + IHDR chunk (16+)
        const buf = Buffer.alloc(24);
        const fd = fs.openSync(diskPath, 'r');
        fs.readSync(fd, buf, 0, 24, 0);
        fs.closeSync(fd);

        // PNG Magic signature: 89 50 4E 47 0D 0A 1A 0A
        const isPng = (
          buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
          buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A
        );

        if (isPng) {
          glintFramesValidPngCount++;
          const width = buf.readUInt32BE(16);
          const height = buf.readUInt32BE(20);
          if (width > 0 && height > 0) {
            glintFramesCorrectSizeCount++;
          }
        }
      }
    } else {
      console.error(`    [MISSING GLINT FILE] Item: ${item}, Frame: ${frameIdx} -> ${diskPath}`);
    }
  }

  // Also test loader API methods
  const apiFrame0 = loader.getGlintFrame(item, 0);
  const apiFramesAll = loader.getGlintFrames(item);
  assert(typeof apiFrame0 === 'string' && apiFrame0.includes(`glow_${item}_0.png`), `loader.getGlintFrame('${item}', 0) returns correct URL`);
  assert(Array.isArray(apiFramesAll) && apiFramesAll.length === 16, `loader.getGlintFrames('${item}') returns 16 URLs`);
}

console.log(`  - Glint frames found on disk:  ${glintFramesExistCount} / 192`);
console.log(`  - Valid PNG binary signatures: ${glintFramesValidPngCount} / 192`);
console.log(`  - Valid PNG IHDR dimensions:   ${glintFramesCorrectSizeCount} / 192`);

assert(glintFramesExistCount === 192, `All 192 glint animation frames exist on disk (found: ${glintFramesExistCount})`);
assert(glintFramesValidPngCount === 192, `All 192 glint animation frames are valid PNG files`);
assert(glintFramesCorrectSizeCount === 192, `All 192 glint frames have non-zero dimensions`);

// ============================================================================
// TEST 5: Master Regression Suite (e2e-runner.js 288/288)
// ============================================================================
console.log('\n--- TEST 5: Master Regression Runner (tests/e2e-runner.js) ---');

import { spawnSync } from 'child_process';
const runnerResult = spawnSync('node', ['tests/e2e-runner.js'], {
  cwd: PROJECT_ROOT,
  encoding: 'utf8',
  timeout: 30000
});

const rawRunnerOutput = runnerResult.stdout || '';
const runnerOutput = rawRunnerOutput.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

const exitCodeOk = runnerResult.status === 0;
assert(exitCodeOk, `tests/e2e-runner.js exited with status code 0 (got: ${runnerResult.status})`);
assert(runnerOutput.includes('ALL 4 TIERS PASSED'), 'tests/e2e-runner.js reported ALL 4 TIERS PASSED');

const totalMatch = runnerOutput.match(/TOTAL:\s*288\s*tests\s+288\s+288\s+0/i);
assert(Boolean(totalMatch), `tests/e2e-runner.js verified 288 passed, 0 failed (cleanly matched: "${totalMatch ? totalMatch[0] : 'no match'}")`);


// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║                     CHALLENGER 2 SUMMARY                             ║');
console.log('╠══════════════════════════════════════════════════════════════════════╣');
console.log(`║  Total Assertions:          ${String(totalChecks).padEnd(41)}║`);
console.log(`║  Passed Checks:             ${String(passedChecks).padEnd(41)}║`);
console.log(`║  Failed Checks:             ${String(failedChecks).padEnd(41)}║`);
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

if (failedChecks === 0) {
  console.log('✔ VERDICT: APPROVE — All Milestone 1 stress, edge-case, and regression checks PASSED.');
  process.exit(0);
} else {
  console.error(`✖ VERDICT: REQUEST_CHANGES — ${failedChecks} checks failed.`);
  console.error('Failure details:', JSON.stringify(failureDetails, null, 2));
  process.exit(1);
}
