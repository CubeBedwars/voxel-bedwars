# BRIEFING — 2026-11-07T18:35:10Z

## Mission
Implement Milestone 2 (M2: Bedwars UI, Player Ranking System, and Frontpage Portal, Features 8–14) for the Voxel Bedwars project.

## 🔒 My Identity
- Archetype: teamwork_worker
- Roles: implementer, qa
- Working directory: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\worker_m2\
- Original parent: a8ce26c8-cfc7-49f5-8664-b19f778bdc15
- Milestone: M2 (Bedwars UI, Player Ranking System, and Frontpage Portal)

## 🔒 Key Constraints
- Genuine implementation only; no shortcuts, no hardcoded test responses.
- Exclusive file write ownership:
  - `src/stats/RankManager.js`
  - `src/stats/LevelManager.js`
  - `src/auth/AuthManager.js`
  - `src/ui/HUD.js`
  - `src/ui/PortalUI.js`
  - `src/entities/LocalPlayer.js`
  - `src/entities/Player.js`
  - `src/game/GameManager.js`
  - `src/game/ShopManager.js`
  - `src/game/TeamManager.js`
  - `index.html`
  - `style.css`
- Rank rating updates: EXCLUSIVELY official 2-team matches (`1v1`, `2v2`, `3v3`, `4v4`). Multi-team formats must NOT modify rank rating.
- XP & Level updates: Awarded across ALL matches (both ranked and unranked).
- Bed deduplication: Head & foot 2-voxel structure; breaking either destroys both and awards exactly 1 bed break.
- Combat tagger: 10s combat tagger in Player.js for void/death credit.
- 10-heart display (20 HP) with full/half/empty hearts & damage flash.
- 9-slot hotbar with 1-9 keys, mouse click, mouse wheel scroll.
- Team upgrades combat integration (sharpness, protection, healPool, alarmTrap).
- PortalUI & AuthManager: GitHub OAuth primary, Google fallback, localStorage guest fallback, format selectors, profile widget.

## Current Parent
- Conversation ID: a8ce26c8-cfc7-49f5-8664-b19f778bdc15
- Updated: 2026-11-07T18:35:10Z

## Task Summary
- **What to build**: Bedwars Scoreboard & HUD, 10-heart display & 9-slot hotbar, team upgrades combat integration, combat attribution & bed deduplication, bloxd.io-style numerical rank rating, player level & XP system, frontpage portal & OAuth management.
- **Success criteria**: Clean builds, all E2E & unit tests pass, comprehensive adherence to constraints.
- **Interface contracts**: PROJECT.md, TEST_READY.md
- **Code layout**: Project root `C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars`

## Change Tracker
- **Files modified**:
  - `src/stats/RankManager.js`: Created bloxd.io-style numerical rank rating engine with 2-team ranked qualification enforcement.
  - `src/stats/LevelManager.js`: Created progressive player leveling and XP system with quadratic progression.
  - `src/auth/AuthManager.js`: Created OAuth authentication manager supporting GitHub primary, Google fallback, and localStorage guest profiles.
  - `src/ui/PortalUI.js`: Created frontpage portal widget, profile stats visualizer, and match format launcher.
  - `src/entities/Player.js`: Integrated 10s combat tagger, team sharpness damage calculation, team protection percentage mitigation, and combat death attribution.
  - `src/entities/LocalPlayer.js`: Integrated mouse wheel scrolling modulo wrap on hotbar slots.
  - `src/game/GameManager.js`: Connected team upgrades (sharpness, protection, healPool, alarmTrap), bed deduplication paired voxel destruction, and match outcome recording.
  - `src/ui/HUD.js`: Implemented sidebar scoreboard team bed status indicators, rank rating & level displays, 10-heart HP display with hit flash trigger, and match end stats modal.
  - `index.html`: Added scoreboard team bed list, rating/level stats, damage-flash overlay, portal profile card, and format selectors.
  - `style.css`: Added styling for hit flash, heart damage shake, team bed status badges, portal profile card, and format selector cards.
- **Build status**: PASS (Vite production build succeeds cleanly in ~2.7s-3.7s)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (288/288 master tests passed + 52/52 M2 forensic tests passed)
- **Lint status**: Clean
- **Tests added/modified**: `verify_m2.js` (52 assertions across all 7 M2 features)

## Key Decisions Made
- RankManager strictly enforces `1v1`, `2v2`, `3v3`, `4v4` as official ranked formats, producing `deltaRating = 0` for multi-team formats (e.g. `solo` 4-team, `octagon` 8-team).
- Bed deduplication searches orthogonal adjacent voxels for the matching bed head/foot and removes both with a single bed break increment.
- Hit flash utilizes a radial vignette overlay `#damage-flash` with keyframe CSS animation and heart container shake.
- AuthManager defaults to persistent guest profile with instant upgrade path to GitHub OAuth (primary) or Google OAuth (fallback).

## Artifact Index
- `DISPATCH.md` — Assignment instructions
- `BRIEFING.md` — Persistent context & status
- `progress.md` — Progress heartbeat
- `verify_m2.js` — Standalone M2 forensic test script
- `handoff.md` — Self-contained 5-component handoff report
