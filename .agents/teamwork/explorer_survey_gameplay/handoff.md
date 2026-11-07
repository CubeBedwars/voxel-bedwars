# Handoff Report: Gameplay, UI, Ranking, Maps & Mutation Survey (R2 & R3)

**Subagent**: teamwork_explorer (`explorer_survey_gameplay`)  
**Parent Conversation ID**: a8ce26c8-cfc7-49f5-8664-b19f778bdc15  
**Working Directory**: `C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\explorer_survey_gameplay\`  
**Scope**: Requirements R2 (Bedwars UI, Player Ranking System, Frontpage Portal) & R3 (Multi-Map System, Match Formats, Match Mutation Modifiers)

---

## 1. Observation

1. **Current HUD & Scoreboard Implementation**:
   - In `src/ui/HUD.js:115-124`, scoreboard stats show Kills, Final Kills, Beds Broken, and Timer:
     ```javascript
     if (this.statKillsEl) this.statKillsEl.innerText = localPlayer.kills;
     if (this.statFinalEl) this.statFinalEl.innerText = localPlayer.finalKills;
     if (this.statBedsEl) this.statBedsEl.innerText = localPlayer.bedsBroken;
     ```
   - In `index.html:47-48`, the mode badge is hardcoded: `<span class="badge-mode">SOLO</span>`.
   - Player numerical rank rating and player level are completely absent from the HUD scoreboard and DOM.
   - Hotbar selection in `src/entities/LocalPlayer.js:76-85` listens only to `Digit1`–`Digit9` and click events; mouse wheel scrolling is absent.
   - Health display in `src/ui/HUD.js:75-89` renders text emojis (`❤️`, `💔`, `🖤`).
2. **Team Upgrades & Combat Calculation Disconnect**:
   - In `src/game/ShopManager.js:192, 200`, upgrades are defined:
     ```javascript
     apply: (team) => { team.upgrades.sharpness = 1; }
     apply: (team) => { team.upgrades.protection = 1; }
     ```
   - In `src/game/GameManager.js:143`, player attack calls:
     ```javascript
     bot.takeDamage(this.localPlayer.weapon.damage || 4.0, this.localPlayer, this.physics);
     ```
     `team.upgrades.sharpness` is never added to damage.
   - In `src/entities/Player.js:115`, damage taken is calculated as:
     ```javascript
     const finalDamage = amount * (1.0 - (this.armor?.reduction || 0));
     ```
     `team.upgrades.protection` is never subtracted from damage.
   - In `src/game/ShopManager.js:232, 240`, `healPool` and `alarmTrap` set boolean flags on `team.upgrades`, but no logic in `GameManager.js` reads or implements them.
3. **Bed Double-Break & Void Knockback Bugs**:
   - In `src/game/GameManager.js:234-250`, `destroyBedAt(x, y, z, destroyer)` destroys only the single voxel at `(x, y, z)` and increments `destroyer.bedsBroken++`. The other half of the 2-block bed remains in the world. Destroying it triggers another bed break count and announcement for the same team.
   - In `src/game/GameManager.js:309-314` and `330-334`, falling into the void calls `this.localPlayer.die()` and `bot.die()` with no arguments (`killer = null`). Knocking an enemy into the void never awards a kill or final kill.
4. **Player Ranking & Frontpage Portal Absence**:
   - Grep for `rank`, `rating`, `elo`, `level`, `github`, `oauth` across `src/` yields zero gameplay or auth references.
   - `index.html:179-240` contains only a hero banner, 4 cards ("SOLO VS TACTICAL AI", "RUSH BEDWARS", "LUCKY BLOCKS", "BEDWARS STUDIO"), and a WebRTC multiplayer button.
   - There is no user profile widget, no OAuth buttons ("Login with GitHub" primary, "Login with Google" fallback), and no guest login.
5. **Multi-Map System & Dynamic Team Limitations**:
   - In `src/game/MapPresets.js:4-134`, only `MAP_PRESETS.speedway` exists (4 teams: `red`, `blue`, `green`, `yellow`).
   - `src/game/TeamManager.js:3-8` hardcodes `this.teams = { red: ..., blue: ..., green: ..., yellow: ... }`.
   - `src/game/GameManager.js:278` hardcodes opponent bot spawning to:
     ```javascript
     const opponentTeams = ['blue', 'green', 'yellow'];
     ```
   - Neither the 1v1 duel map ("Colosseum") nor the 8-team solo/duo map ("Octagon") exists.
6. **Mutation Modifier System Absence**:
   - None of the 9 required mutators ("Supercharged", "Launch Rush", "Gun Game", "Lethal Strike", "Low Gravity", "Speed Demon", "Vampirism", "Sudden Death", "Lucky Chaos") exist as modular classes or systems.
   - `src/main.js:12-28` contains only hardcoded button listeners that mutate `speedway` generator intervals or place blocks directly on the center island.
   - No projectile entity exists in the engine (`ShopManager.js:171` sells fireballs, but `GameManager.js:handleRightClick()` has no projectile launch handler).
7. **Production Build Tool Command**:
   - Executing `cd C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars; npm run build` completed with exit code 0 (`dist/` generated in 7.27s).

---

## 2. Logic Chain

1. **R2 Scoreboard & HUD**: From Observation 1, because the scoreboard does not render player rank rating or level, and the mode badge is hardcoded to "SOLO", R2 Acceptance Criteria 2 ("In-game HUD and frontpage profile display the player's numerical rank rating and level") cannot be met without extending `HUD.js`, `index.html`, and `style.css`.
2. **R2 Upgrades & Combat Loop Integrity**: From Observation 2, because `sharpness` and `protection` are never included in attack and damage-mitigation calculations in `GameManager.js` and `Player.js`, the Team Upgrades GUI is non-functional in actual combat. Upgrades must be injected into `takeDamage()` and `handleLeftClick()`.
3. **R2 Combat Credit & Elimination Logic**: From Observation 3, because bed destructions are not deduplicated and void falls pass `killer = null`, player stats (kills, final kills, beds broken) are distorted. Implementing a 10-second combat tag system for last attacker and bed paired-block destruction is required for correct stat updates.
4. **R2 Ranking & Auth Specification**: From Observation 4, implementing bloxd.io-style ranking requires a dedicated `RankManager.js` and `LevelManager.js`. By explicit requirement R2, **only 2-team matches (1v1, 2v2, 3v3, 4v4) may update Rank Rating**, while all matches award XP for player level. An `AuthManager.js` with GitHub primary and Google fallback (plus `localStorage` guest fallback) is required to power the frontpage portal.
5. **R3 Multi-Map Architecture**: From Observation 5, because `MapPresets.js`, `TeamManager.js`, and `GameManager.js:startMatch()` are hardcoded to 4 teams, creating the 1v1 duel map ("Colosseum") and the 8-team map ("Octagon") requires refactoring `TeamManager` to initialize dynamically from `mapPreset.teams`, adding wool color resolvers for all 8 colors, and spawning bots dynamically.
6. **R3 Mutation Modifiers Architecture**: From Observation 6, because no modifier system exists and projectile weapons cannot be launched, implementing the 9 required mutators requires:
   - A `MutationManager.js` with lifecycle hooks (`onMatchStart`, `onTick`, `onDamage`, `onKill`, `onBlockBreak`).
   - A `Projectile.js` entity system to support "Gun Game" and fireballs.
   - A launchpad block/impulse hook in `Physics.js` to support "Launch Rush".
   - Physics gravity modification for "Low Gravity" and speed modification for "Speed Demon".
   - Damage scaling for "Lethal Strike" and life-steal hooks for "Vampirism".
   - Timed bed breakdown and block decay for "Sudden Death".
   - Dynamic item/RNG events for "Lucky Chaos".

---

## 3. Caveats

1. **R1 Voxel Engine & Textures Scope**: While block textures, breaking hardness, and particles were observed, detailed voxel meshing and texture generator deep dives belong to peer subagent `explorer_survey_engine`.
2. **R4 & R5 Networking and Platform Scope**: Dual-layer networking (dedicated WebSocket server vs WebRTC fallback) and multi-platform packaging (desktop/mobile/LAN) belong to peer subagent `explorer_survey_network_platform`. This report addresses only the game UI, format selection, and local bot play integration with multiplayer room code launchers.
3. **OAuth Production Client IDs**: In client-side static deployments (Netlify), live GitHub/Google OAuth requires backend token exchange or a serverless function / Netlify Identity. A robust mock/local OAuth provider with `localStorage` fallback guarantees full offline and dev testing without external API key dependencies.

---

## 4. Conclusion

The current codebase provides a functional Three.js voxel Bedwars prototype with autonomous bots, shop GUI, and basic building on a single 4-team map. However, **R2 (Ranking, Leveling, Frontpage Portal, OAuth UI, Functional Team Upgrades)** and **R3 (1v1 Duel Map, 8-Team Map, Pluggable 9 Mutators, Projectile System)** are currently missing or implemented as static mocks.

All architectural gaps, algorithmic formulas (bloxd.io numerical MMR and XP), map layouts (Colosseum, Speedway, Octagon), and mutator specifications have been documented with concrete implementation blueprints in `survey_report.md`.

---

## 5. Verification Method

1. **Inspect Survey Report**:
   - View `C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\explorer_survey_gameplay\survey_report.md` for full technical specifications, feature matrices, formulas, and file blueprints.
2. **Independent Code Audit**:
   - Inspect `src/game/MapPresets.js`: confirm only `speedway` is defined.
   - Inspect `src/game/TeamManager.js:3-8`: confirm hardcoded 4 teams.
   - Inspect `src/game/ShopManager.js:185-242`: confirm `sharpness` and `protection` are set on team objects but never referenced in `Player.js:takeDamage()` or `GameManager.js:handleLeftClick()`.
   - Inspect `src/game/GameManager.js:199-226`: confirm `handleRightClick` does not handle `item.type === 'projectile'`.
   - Inspect `index.html`: confirm lack of rank/level displays and lack of OAuth login buttons.
3. **Build Command**:
   - `cd C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars; npm run build` (produces clean production build).
