## 2026-11-07T18:22:27Z
You are a Worker subagent implementing Milestone 2 (M2: Bedwars UI, Player Ranking System, and Frontpage Portal) for the Voxel Bedwars project.
Your identity: teamwork_worker
Your assigned working directory: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\worker_m2\
Project root: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP: Read the authoritative user request at:
C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\ORIGINAL_REQUEST.md
Also read:
- Master Project Plan: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\PROJECT.md
- Gameplay Survey Handoff: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\explorer_survey_gameplay\handoff.md
- Gameplay Survey Detailed Report: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\.agents\teamwork\explorer_survey_gameplay\survey_report.md
- E2E Test Ready Manifest: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars\TEST_READY.md

FILE WRITE OWNERSHIP:
You own exclusively:
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

YOUR TASKS (Features 8–14 of PROJECT.md):
1. **Bedwars Scoreboard & In-Game HUD (Feature 8)**:
   - Enhance the sidebar scoreboard in `index.html`, `style.css`, and `src/ui/HUD.js`.
   - Display: Match timer, Team Bed statuses (with bed intact green check / broken red X / eliminated icons for each team), personal kills, final kills, beds broken, and the player's numerical rank rating and player level.
2. **Health Hearts & 9-Slot Hotbar (Feature 9)**:
   - In `src/ui/HUD.js` and `style.css`, deliver an authentic 10-heart display (20 HP) with full, half, and empty heart icons, including hit flash/damage animation when taking damage.
   - Hotbar slots 1–9: Support selection via numeric keys `1`–`9`, mouse click, and mouse wheel scrolling in `LocalPlayer.js`. Correctly display item icons, item names, and stack counts.
3. **Team Upgrades Combat Integration (Feature 10)**:
   - Connect team upgrades to actual gameplay calculations:
     - `sharpness`: Adds bonus damage to all team members' sword attacks (in `Player.js` and `GameManager.js`).
     - `protection`: Adds percentage damage reduction to all team members (in `Player.js:takeDamage`).
     - `healPool`: Regenerates health for team members when standing on their home base island.
     - `alarmTrap`: Plays alarm sound and displays visual warning banner when an enemy enters the team base perimeter.
4. **Combat Attribution & Bed Deduplication (Feature 11)**:
   - Implement a 10-second combat tagger in `Player.js`: when a player is attacked, record `lastAttacker` and timestamp. If the player falls into the void or dies within 10s, credit the kill/final kill to `lastAttacker`.
   - Bed deduplication: A Bed is a 2-voxel structure (head and foot). When one voxel is broken, destroy both voxels and award exactly 1 bed break to the destroyer.
5. **bloxd.io-style Numerical Rank Rating System (Feature 12)**:
   - Implement `src/stats/RankManager.js`:
     - Computes numerical rank rating (e.g. baseline 1000 MMR with Elo/K-factor math adjusted by wins, kills, final kills, and beds broken).
     - **CRITICAL REQUIREMENT**: Rank rating updates are applied EXCLUSIVELY to official 2-team matches (`1v1`, `2v2`, `3v3`, `4v4`). Multi-team formats (e.g. 4-team or 8-team solo) must NOT modify the rank rating.
6. **Player Level & XP Progression System (Feature 13)**:
   - Implement `src/stats/LevelManager.js`:
     - Computes progressive player level derived from match wins, kills, final kills, and beds broken.
     - XP is awarded across ALL matches (both ranked and unranked). Level curve: e.g. `Level = Math.floor(Math.sqrt(XP / 100)) + 1`.
7. **Frontpage Portal & OAuth Management (Feature 14)**:
   - Implement `src/auth/AuthManager.js` and `src/ui/PortalUI.js`:
     - Profile widget displaying player username, avatar, level, numerical rank rating, and tier badge.
     - Match format selectors for Solos, Duos, Trios, 4v4, and 1v1 Duels.
     - OAuth authentication UI with "Login with GitHub" (primary option) and "Login with Google" (fallback option), plus persistent `localStorage` guest session fallback.

VERIFICATION:
Execute `npm run build` and `npm test` (or `node tests/e2e-runner.js`) to ensure all tests pass cleanly.
Write your structured handoff report in `handoff.md` in your working directory and notify parent via send_message when complete.
