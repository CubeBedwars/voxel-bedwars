# BRIEFING — 2026-11-08T09:28:00Z

## Mission
Implement authentic Hypixel Bedwars HUD & bloxd.io in-game UI: vitals (hearts, absorption, armor, hunger), green XP bar & level numeral, authentic hotbar with [B] Quick Shop button, crosshair + 4-tick animated hitmarker, full Hypixel-styled Bedwars scoreboard (events countdown, map, mutation, team bed statuses, kills, Elo MMR), and GameManager integrations.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\worker_m3_gen4\
- Original parent: c8ab7128-31a7-48a6-91a6-d43c6bedaabf
- Milestone: Milestone 3 - Authentic Hypixel Bedwars HUD & bloxd.io In-Game UI

## 🔒 Key Constraints
- Exclusive write ownership: `src/ui/HUD.js`, `src/style.css`, `index.html`, `src/game/GameManager.js`, `tests/test_hud_m3.js`
- Integrity Mandate: No hardcoding test results, no dummy facade implementations.
- All existing 288 master tests in `tests/e2e-runner.js` must pass.
- New unit tests in `tests/test_hud_m3.js` must be comprehensive and genuine.

## Current Parent
- Conversation ID: c8ab7128-31a7-48a6-91a6-d43c6bedaabf
- Updated: 2026-11-08T09:28:00Z

## Task Summary
- **What to build**: Full Minecraft / Hypixel Bedwars HUD overhaul with bloxd.io features:
  - Vitals container (armor bar 10 chestplates, hunger bar 10 drumsticks, health bar 10 hearts + absorption golden hearts)
  - XP bar (centered green bar + bold level numeral)
  - 9-slot Hotbar (authentic slot frames, active outline, stack count, [B] Quick Shop badge/button)
  - Crosshair with 4-tick hitmarker overlay (animating outward and fading on hit)
  - Sidebar Scoreboard: "BED WARS", date, server IP, Map, Mutation, Next event countdown, Team bed statuses, Kills/Final Kills, Bloxd Elo MMR.
  - GameManager integrations: `triggerHitmarker` on entity attack connect, `KeyB` quick shop toggle near base island.
- **Success criteria**: All HUD components render genuinely in browser DOM and in node test environments, `tests/test_hud_m3.js` passes (71/71), `tests/e2e-runner.js` passes all 288 tests.
- **Interface contracts**: PROJECT.md and explorer_survey_ui_gen4/handoff.md

## Key Decisions Made
- `calculateArmorDefensePoints`: mapped standard Bedwars armor tiers (`none`=0, `chainmail`=12, `iron`=15, `diamond`=20) with support for `player.getArmorDefensePoints()` override.
- `formatNextEvent`: Bedwars schedule progression (Diamond II in 04:00, Emerald II, Diamond III, Emerald III, Bed Destruction, Sudden Death, Game End).
- Scoreboard Team Bed Statuses: Hypixel colors with checkmark `✓` when intact, living count (e.g. `2`) when bed broken, `✗` when eliminated, and `[YOU]` tag.
- Quick Shop `[B]`: `isPlayerAtBase(player)` checks Euclidean distance to team spawn (<= 24m) to allow opening Quick Shop, or warns with an announcement if bridging.

## Change Tracker
- **Files modified**:
  - `index.html`: Added 4-tick hitmarker markup, vitals container, XP bar, hotbar wrapper with [B] Quick Shop, and Bedwars scoreboard meta.
  - `src/style.css`: Added hitmarker outward animation, pixel-art vitals, green XP bar, slot highlights, [B] Quick Shop button, and authentic Hypixel scoreboard styling.
  - `src/ui/HUD.js`: Implemented `triggerHitmarker`, `updateArmor`, `updateHealth`, `updateHunger`, `updateXP`, `updateScoreboard`, and Quick Shop button binding.
  - `src/game/GameManager.js`: Integrated `triggerHitmarker` on attack connect, `isPlayerAtBase`, `toggleQuickShop`, and `KeyB` listener.
  - `tests/test_hud_m3.js`: Created 71 rigorous unit & integration tests covering all requirements.
- **Build status**: All 71 M3 tests PASS, all 288 master E2E tests PASS.
- **Pending issues**: None

## Quality Status
- **Build/test result**: 71/71 in `test_hud_m3.js` PASS, 288/288 in `e2e-runner.js` PASS.
- **Lint status**: Clean
- **Tests added/modified**: `tests/test_hud_m3.js`

## Loaded Skills
None

## Artifact Index
- `handoff.md` - final handoff report (pending)
- `progress.md` - liveness heartbeat
