# Milestone 3 Independent Review & Adversarial Stress Report

**Milestone**: M3 — Multi-Map System, Match Formats, and Match Mutation Modifiers  
**Reviewer**: Reviewer 1 (`reviewer_m3_1`)  
**Verdict**: **REQUEST_CHANGES**  
**Date**: 2026-11-07  

---

## Executive Summary

Milestone 3 delivers authentic procedural multi-map generation (`speedway` 4-team, `colosseum` 1v1 duel, and `octagon` 8-team), dynamic 2-to-8 team management with distinct wool palettes (`BLOCK_TYPES.WOOL_*`), a full physics-driven projectile subsystem (`Projectile.js`) with ballistic gravity, AABB/voxel collision detection, explosive block destruction respecting obsidian/bedrock blast-proofing, and player radial knockback, as well as an extensible mutator system (`MutationManager.js`) covering all 9 requested game modifiers.

All standard unit and E2E test suites pass with 100% success (`node tests/stress_m3_maps_mutations.js` passing 133/133 assertions, `npm test` passing 288/288 assertions, and `npm run build` compiling without error). No integrity violations (hardcoded test results or facade bypasses) were detected.

However, adversarial code execution and structural geometry verification uncovered **one Critical runtime blocker** in `src/game/GameManager.js` that crashes live player interactions upon right-clicking, and **one Major geometric flaw** in `src/game/MapPresets.js` where 4 diagonal team beds float over the void without foundation blocks. Therefore, the official verdict is **REQUEST_CHANGES**.

---

## 1. Findings & Issues Requiring Remediation

### [Critical Finding 1] Unhandled `ReferenceError: item is not defined` in `GameManager.handleRightClick()`
- **Location**: `src/game/GameManager.js`, lines 519–567
- **Evidence**:
  ```javascript
  // Projectile Launching (Fireballs from shop or Gun Game projectile weapons)
  if (item && (item.type === 'projectile' || item.isGun)) {
    this.fireProjectile(this.localPlayer, item);
    if (item.type === 'projectile') {
      this.localPlayer.consumeSelectedItem();
      this.hud.updateHotbar(this.localPlayer);
    }
    return;
  }

  // Place block from selected hotbar slot
  if (item && item.type === 'block') { ... }
  ```
  `item` is referenced on line 520, line 530, and line 560 without any prior variable declaration inside `handleRightClick()`.
- **Runtime Failure Reproduction**:
  In ES module strict execution:
  ```
  CONFIRMED_ERROR: ReferenceError item is not defined
  ```
- **Why this is a Blocker**: In actual gameplay, right-clicking is the primary input for firing projectiles (fireballs, slingshots, crossbows, plasma), placing defense blocks, and consuming golden apples. Calling `handleRightClick()` immediately throws an uncaught `ReferenceError`, halting execution and breaking combat/placement mechanics.
- **Suggested Fix**:
  At the beginning of `handleRightClick()` (after the shopkeeper distance check, line 518), declare `item`:
  ```javascript
  const item = typeof this.localPlayer.getSelectedItem === 'function'
    ? this.localPlayer.getSelectedItem()
    : (this.localPlayer.hotbar ? this.localPlayer.hotbar[this.localPlayer.selectedSlot || 0] : null);
  ```

---

### [Major Finding 2] Octagon 8-Team Preset Leaves 4 Diagonal Bed Heads Floating Over Void
- **Location**: `src/game/MapPresets.js`, lines 220–368 (`MAP_PRESETS.octagon`)
- **Evidence**:
  - Radial diagonal bases for `blue` (35, 35), `yellow` (-35, 35), `white` (-35, -35), and `gray` (35, -35) are generated with circular disk radius `radius = 5`:
    ```javascript
    const radius = 5;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const dist = Math.hypot(dx, dz);
        if (dist <= radius) {
          world.setBlock(x, cy, z, BLOCK_TYPES.GRASS);
          ...
        }
      }
    }
    ```
  - The bed heads for diagonal teams are placed at offsets `dx = 4, dz = 4` relative to base center (e.g., `blue.head: { x: 39, y: 21, z: 39 }` relative to `cx: 35, cz: 35`).
  - Calculating radial distance: `Math.hypot(4, 4) = Math.sqrt(32) ≈ 5.657 > 5.0`.
  - Because `dist > radius`, no block is placed at (39, 20, 39).
  - Runtime verification confirmed:
    ```
    Team red: Head supported? true (4), Foot supported? true (4)
    Team blue: Head supported? false (0), Foot supported? true (4)
    Team green: Head supported? true (4), Foot supported? true (4)
    Team yellow: Head supported? false (0), Foot supported? true (4)
    Team aqua: Head supported? true (4), Foot supported? true (4)
    Team white: Head supported? false (0), Foot supported? true (4)
    Team pink: Head supported? true (4), Foot supported? true (4)
    Team gray: Head supported? false (0), Foot supported? true (4)
    ```
- **Why this is a Problem**: The bed head for half the teams in Octagon (all 4 diagonal teams: Blue, Yellow, White, Gray) hovers in mid-air over the void with `BLOCK_TYPES.AIR` underneath. Players walking around their bed can fall straight into the void.
- **Suggested Fix**:
  Either:
  1. Increase the diagonal team island base generation radius to `6` or `5.8` so that `Math.hypot(4, 4) <= radius`; OR
  2. Adjust diagonal bed offsets so that head is at `dx = 3, dz = 3` (`hypot(3, 3) = 4.24 <= 5.0`) and foot is at `dx = 2, dz = 2`.

---

### [Minor Finding 3] Unpopulated Team Elimination Stalemate Edge Case
- **Location**: `src/game/TeamManager.js`, line 62
- **Evidence**:
  ```javascript
  isTeamEliminated(teamName) {
    const team = this.teams[teamName];
    if (!team) return true;
    return !team.hasBed && team.players.length > 0 && team.players.every(p => p.isDead || p.isFinalDead);
  }
  ```
- **Why this is an issue**: If a match is started with fewer human/bot players than available map teams (e.g. `withBots: false` on Speedway or Octagon), unoccupied teams have `team.players.length === 0`. If an unoccupied team's bed is destroyed, `team.players.length > 0` returns `false`, so `isTeamEliminated()` returns `false`. This causes `getAliveTeams()` to perpetually retain unoccupied teams, preventing the match from concluding in victory.
- **Suggested Fix**:
  Allow a team with 0 players to be eliminated if their bed is destroyed:
  ```javascript
  isTeamEliminated(teamName) {
    const team = this.teams[teamName];
    if (!team) return true;
    if (!team.hasBed) {
      if (team.players.length === 0) return true;
      return team.players.every(p => p.isDead || p.isFinalDead);
    }
    return false;
  }
  ```

---

## 2. Five-Component Handoff Report

### 1. Observation
1. In `src/game/GameManager.js` lines 503–567 (`handleRightClick()`), `item` is referenced on line 520, line 530, and line 560 without a `const item = ...` declaration. Invoking `handleRightClick()` in Node.js ES module environment produces verbatim output:
   `CONFIRMED_ERROR: ReferenceError item is not defined`.
2. In `src/game/MapPresets.js` lines 220–368 (`MAP_PRESETS.octagon.generateGeometry`), querying `world.getBlock(bed.head.x, 20, bed.head.z)` for teams `blue`, `yellow`, `white`, and `gray` yields `0` (`BLOCK_TYPES.AIR`).
3. Running test suites produced:
   - `node tests/stress_m3_maps_mutations.js`: 133 passed, 0 failed, 100% success.
   - `npm test` (`node tests/e2e-runner.js`): 288 passed, 0 failed, 100% success across 4 tiers.
   - `npm run build`: Vite v6.4.5 transformed 60 modules and emitted clean production bundle in `dist/`.

### 2. Logic Chain
- Step 1: `GameManager.js` imports `Projectile` and `MutationManager` to enable projectile launches and mutation abilities.
- Step 2: The right-click event handler `handleRightClick()` was updated to route projectile launches (`this.fireProjectile(this.localPlayer, item)`), block placements, and golden apple consumption based on the currently held item.
- Step 3: During this update, the declaration `const item = this.localPlayer.getSelectedItem();` was inadvertently omitted.
- Step 4: Because JS ES modules operate under strict mode, attempting to evaluate an undeclared identifier `item` triggers an unhandled `ReferenceError`.
- Step 5: For `MapPresets.octagon`, the island disk generator uses `Math.hypot(dx, dz) <= radius` with `radius = 5`. The diagonal bed head coordinates are placed at `dx = 4, dz = 4`. Since `Math.hypot(4, 4) ≈ 5.657 > 5.0`, the loop skips placing blocks under the bed head, resulting in floating beds.
- Step 6: Therefore, despite passing headless assertion tests that instantiate `Projectile` and `MutationManager` in isolation, the live game loop contains a blocking crash on right-click and floating beds in the 8-team map.

### 3. Caveats
- Browser hardware WebGL rendering and canvas pointer lock were verified via standard Three.js headless polyfills and Vite production bundling.
- Dedicated WebSocket network synchronization was not evaluated in this milestone review as dual-layer networking is assigned to Milestone 4.

### 4. Conclusion
The core implementations of `MapPresets.js`, `TeamManager.js`, `Projectile.js`, and `MutationManager.js` are genuine, architecturally sound, and feature no integrity violations or shortcuts. However, due to the Critical runtime `ReferenceError` in `GameManager.handleRightClick()` and the floating diagonal beds in `MapPresets.octagon`, the milestone work cannot be approved without fixing these two issues.

**Verdict: REQUEST_CHANGES.**

### 5. Verification Method
To independently verify the defects and validate subsequent fixes:
1. **Replicate Right-Click ReferenceError**:
   ```bash
   node --input-type=module -e "
   import './tests/mocks/browser-shim.js';
   import { GameManager } from './src/game/GameManager.js';
   const gm = Object.create(GameManager.prototype);
   gm.studioEditor = { isActive: false };
   gm.mapPreset = { shopkeepers: [] };
   gm.localPlayer = { getSelectedItem: () => ({ type: 'projectile', id: 'fireball' }) };
   gm.handleRightClick();
   "
   ```
   *Expected result currently*: Throws `ReferenceError: item is not defined`.
   *Passing condition post-fix*: Runs cleanly without error.

2. **Replicate Octagon Floating Bed Heads**:
   ```bash
   node --input-type=module -e "
   import './tests/mocks/browser-shim.js';
   import * as THREE from 'three';
   import { VoxelWorld, BLOCK_TYPES } from './src/engine/VoxelWorld.js';
   import { MAP_PRESETS } from './src/game/MapPresets.js';
   const world = new VoxelWorld(new THREE.Scene());
   world.rebuildMeshes = () => {};
   MAP_PRESETS.octagon.generateGeometry(world);
   ['blue', 'yellow', 'white', 'gray'].forEach(team => {
     const h = MAP_PRESETS.octagon.beds[team].head;
     console.log(team, 'under-head block:', world.getBlock(h.x, h.y - 1, h.z));
   });
   "
   ```
   *Expected result currently*: Prints `under-head block: 0` (`BLOCK_TYPES.AIR`) for all 4 diagonal teams.
   *Passing condition post-fix*: Prints non-zero block ID (e.g. `4` for `GRASS`) indicating solid ground support.

3. **Master Regression Tests**:
   ```bash
   node tests/stress_m3_maps_mutations.js
   npm test
   npm run build
   ```

---

## 3. Verified Claims & Feature Review Matrix

| Feature | Requirement | Status | Notes |
|:---|:---|:---:|:---|
| `speedway` Map Preset | 4 teams, 4 forges, 4 diamond satellites, 2 center emeralds | ✅ PASS | Verified geometry, team wool rings, bed adjacency |
| `colosseum` Map Preset | 2 teams, symmetrical bases (-15, +15), contested center | ✅ PASS | Verified 1v1 duel geometry, diamond & emerald pillars |
| `octagon` Map Preset | 8 radial team bases, 4 outer diamonds, center citadel | ⚠️ FIX NEEDED | 4 diagonal team beds hover over air (Finding 2) |
| Dynamic `TeamManager` | 2 to 8 teams, wool palette mapping | ✅ PASS | Verified dynamic initialization, all 8 wool types |
| `Projectile.js` Physics | Ballistic trajectory, velocity, gravity, lifetime | ✅ PASS | Verified `x += vx*dt`, `vy += g*dt`, apex at vy=0 |
| `Projectile.js` Explosions | Radial block destruction, blast proof resistance, knockback | ✅ PASS | Verified weak blocks break, Obsidian/Bedrock resist |
| `Supercharged` Mutator | Tier 2 forges & accelerated diamond/emerald generators | ✅ PASS | Verified `forgeTier = 2.0`, spawner intervals reduced |
| `Launch Rush` Mutator | Operational launchpads at team bases | ✅ PASS | Verified directional leap impulse (`vy=18`, `v_forward=16`) |
| `Gun Game` Mutator | 4-tier projectile progression upgrading on kills | ✅ PASS | Slingshot -> Crossbow -> Fireball -> Plasma cap |
| `Lethal Strike` Mutator | 2.0x attack damage scaling | ✅ PASS | Verified 6.0 base damage scales to 12.0 |
| `Low Gravity` Mutator | Moon-like gravity (-8.0 m/s²) | ✅ PASS | Verified gravity override from -24.0 to -8.0 |
| `Speed Demon` Mutator | 1.5x permanent movement speed multiplier | ✅ PASS | Verified `getSpeedMultiplier()` connected to `LocalPlayer` |
| `Vampirism` Mutator | Health restoration on hit (25%) and kill (+5 HP) | ✅ PASS | Verified attacker heal on hit and kill, capped at maxHealth |
| `Sudden Death` Mutator | Timed bed breakdown (600s) & arena perimeter decay | ✅ PASS | Universal bed destruction & concentric inward decay |
| `Lucky Chaos` Mutator | Spawns lucky blocks; drop table rolls loot | ✅ PASS | Verified lucky blocks, diamonds, emeralds, consumables |
| `GameManager` Right Click | Fireball / gun game launching & block placing | ❌ CRITICAL | Unhandled `ReferenceError: item is not defined` (Finding 1) |

---
*Report generated and attested by Reviewer 1 (`reviewer_m3_1`).*
