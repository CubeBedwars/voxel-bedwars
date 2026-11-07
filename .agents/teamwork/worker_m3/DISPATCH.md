## 2026-11-07T18:48:29Z

You are a Worker subagent implementing Milestone 3 (M3: Multi-Map System, Match Formats, and Match Mutation Modifiers) for the Voxel Bedwars project.
Your identity: teamwork_worker
Your assigned working directory: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\worker_m3\
Project root: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP: Read the authoritative user request at:
C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
- Master Project Plan: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\PROJECT.md
- Gameplay Survey Handoff: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\explorer_survey_gameplay\handoff.md
- Gameplay Survey Detailed Report: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\explorer_survey_gameplay\survey_report.md
- Master E2E Test Suite Manifest: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\TEST_READY.md

FILE WRITE OWNERSHIP:
You own exclusively:
- `src/game/MapPresets.js`
- `src/game/TeamManager.js`
- `src/game/MutationManager.js`
- `src/entities/Projectile.js`
- `src/game/GameManager.js`
- `src/entities/Player.js`
- `src/entities/LocalPlayer.js`
- `src/engine/Physics.js`
- `src/game/GeneratorManager.js`
- `src/game/ShopManager.js`

YOUR TASKS (Features 15–26 of PROJECT.md):
1. **Multi-Map System (Feature 15)**:
   - In `src/game/MapPresets.js`, provide 3 distinct, balanced, fully playable maps:
     - `speedway`: 4-team arena (`red`, `blue`, `green`, `yellow`) with 4 corner bases, beds, team forges, 4 satellite diamond generators, and 2 center emerald generators.
     - `colosseum`: 1v1 duel arena (2 teams: `red`, `blue`) with 2 symmetrical bases, beds, forges, and 1 center diamond/emerald contested generator.
     - `octagon`: 8-team solo/duo map (8 teams: `red`, `blue`, `green`, `yellow`, `aqua`, `white`, `pink`, `gray`) with 8 radial team islands, 4 outer diamond generators, and 2 center emerald generators.
2. **Dynamic Teams & Match Formats (Feature 16)**:
   - In `src/game/TeamManager.js`, support dynamic team counts (2 to 8 teams) with wool color palettes for all 8 teams.
   - Support match formats: Solos (1v1v1v1), Duos (2v2v2v2), Trios (3v3v3v3), 4v4, and 1v1 Duels.
   - In `GameManager.js:startMatch()`, dynamically spawn player and opponent bots on their respective team islands based on selected map and format.
3. **Projectile Entity Subsystem (Feature 17)**:
   - Implement `src/entities/Projectile.js`:
     - Three.js 3D projectile mesh (fireball, arrow, energy projectile).
     - Physics simulation: position, velocity vector, gravity integration (`gravity * dt`), collision detection against voxel world and players/bots.
     - Impact effects: Fireballs deal explosive area damage and destroy nearby weak blocks (wool, wood); gun game ammo deals direct projectile damage.
   - Wire projectile launching to `LocalPlayer.js:handleRightClick()` and fireball shop purchases.
4. **Match Mutation Modifier System (Features 18–26)**:
   - Implement `src/game/MutationManager.js` with lifecycle hooks (`onMatchStart`, `onTick`, `onDamage`, `onKill`, `onBlockBreak`) applicable to ANY map and format.
   - Implement all 9 named mutators:
     - "Supercharged" (F18): All team forges and resource generators start at level 2 from match start.
     - "Launch Rush" (F19): Every team base island equipped with operational launchpads giving upward & forward aerial velocity impulses.
     - "Gun Game" (F20): Players spawn with projectile weapons (Slingshot -> Iron Crossbow -> Fireball Launcher -> Plasma Blaster) that upgrade on securing kills.
     - "Lethal Strike" (F21): Attacks deal increased damage scaling (e.g. 1.75x–2.0x) for fast combat.
     - "Low Gravity" (F22): Moon-like reduced gravity (e.g. 0.35x normal gravity) enabling floaty leaps and aerial bridging.
     - "Speed Demon" (F23): All players receive permanent movement speed boost (e.g. 1.5x speed).
     - "Vampirism" (F24): Players regenerate health upon damaging (life-steal percentage) or eliminating opponents (+full/half heal).
     - "Sudden Death" (F25): Accelerates match progression with early bed breakdown (e.g. timed bed destruction event) and arena hazards (island perimeter block decay).
     - "Lucky Chaos" (F26): Spawns lucky block drops and unpredictable arena item events across islands.

VERIFICATION:
Execute `npm test` (`node tests/e2e-runner.js`) and `npm run build` to verify that all 288 master tests pass and compilation succeeds.
Write your structured handoff report in `handoff.md` in your working directory and notify parent via send_message when complete.
