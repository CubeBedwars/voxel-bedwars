# Comprehensive Technical Survey Report: R2 (UI, Ranking, Portal) & R3 (Maps, Formats, Mutations)

**Date**: 2026-11-07  
**Subagent**: teamwork_explorer (`explorer_survey_gameplay`)  
**Project**: Voxel Bedwars (`voxel-bedwars`)  
**Scope**: Requirements R2 & R3  

---

## 1. Executive Summary

A comprehensive investigation was conducted on the Voxel Bedwars codebase (`voxel-bedwars`) covering:
- **R2**: In-game HUD/UI, Player Stat & Ranking System (bloxd.io inspired), Frontpage Portal, and OAuth Authentication UI.
- **R3**: Multi-Map System (1v1 Duel, 4-Team, 8-Team), Match Formats, and Pluggable Match Mutation Modifiers (9 mutators).

### Core Findings:
1. **R2 In-Game HUD/UI**: A basic Three.js/DOM HUD exists in `src/ui/HUD.js` (9-slot hotbar, emoji hearts, basic scoreboard, shopkeeper modal, upgrades modal, bed tracker). However:
   - Rank rating and player level are completely absent from both the HUD scoreboard and the frontpage.
   - Scoreboard mode badge is hardcoded to "SOLO".
   - Team upgrades GUI accepts diamonds, but combat upgrades (`sharpness`, `protection`, `healPool`, `alarmTrap`) are dummy stubs and never applied in combat.
   - Fireball projectiles purchased from the shop are not fireable (no projectile entity system exists).
   - Hotbar does not support mouse wheel scrolling.
   - Beds have a double-break bug where breaking the head and foot separately awards double bed breaks.
   - Void knockback kills do not credit the attacker (falls into void pass `killer = null`).
2. **R2 Player Stat & Ranking System**: Completely missing. No numerical rank rating, no Elo/MMR formula, no player level or XP progression, no persistence in `localStorage` or cloud, and zero OAuth UI (Login with GitHub / Login with Google).
3. **R3 Multi-Map System**: Only a single 4-team map preset exists (`MAP_PRESETS.speedway` in `src/game/MapPresets.js`). The required 1v1 duel map ("Colosseum") and 8-team solo/duo map ("Octagon") do not exist. `TeamManager.js`, `GameManager.js:startMatch()`, and `Player.js:resolveTeamWool()` are hardcoded to 4 teams (`red`, `blue`, `green`, `yellow`) and cannot support 2-team duels or 8-team matches.
4. **R3 Match Mutation Modifier System**: No extensible mutator system exists. Only two hardcoded menu shortcuts exist in `main.js` (one that halves generator interval, and one that places lucky blocks). None of the 9 required mutators ("Supercharged", "Launch Rush", "Gun Game", "Lethal Strike", "Low Gravity", "Speed Demon", "Vampirism", "Sudden Death", "Lucky Chaos") are implemented as pluggable modules.

---

## 2. In-Depth Survey: Requirement R2

### 2.1 In-Game HUD & UI Current State (`src/ui/HUD.js`, `src/style.css`, `index.html`)

| Element | Location | Current Implementation | Status / Gaps |
| :--- | :--- | :--- | :--- |
| **Sidebar Scoreboard** | `index.html:44-60`, `src/ui/HUD.js:115-124` | Displays: Title "VOXEL BEDWARS", mode badge `<span class="badge-mode">SOLO</span>`, stats (Kills, Final Kills, Beds Broken, Time MM:SS). | ⚠️ Mode badge hardcoded to SOLO. Rank rating and player level are missing. Team bed statuses are not embedded in sidebar. |
| **Top Bed Tracker** | `index.html:41`, `src/ui/HUD.js:97-112` | Horizontal bar displaying team letters (R, B, G, Y) and status (✓ alive, ✗ dead). | ⚠️ Hardcoded to 4 teams. Does not distinguish between "Bed Broken (respawn disabled)" vs "Team Eliminated (all dead)". |
| **Health Hearts Display** | `index.html:74`, `src/ui/HUD.js:75-89` | 10 hearts representing 20 HP. Rendered as emojis: ❤️ (full), 💔 (half), 🖤 (empty). | ⚠️ Functional, but lacks authentic pixel-art voxel heart textures and absorption/regeneration visual states. |
| **9-Slot Hotbar** | `index.html:82`, `src/ui/HUD.js:49-63, 140-162` | 9 slots rendered. Clickable, key bindings 1-9 in `LocalPlayer.js:76-85`. Shows item icon/name and count. | ⚠️ Missing mouse wheel slot scrolling. Selected slot item rendering in 3D first-person hand does not change with weapon/tool type. |
| **Resource Bar** | `index.html:65-70`, `src/ui/HUD.js:69-72` | Displays Iron, Gold, Diamond, Emerald counts with emojis (⚪, 🟡, 💎, 🟢). | ✅ Fully functional. |
| **Shopkeeper GUI** | `index.html:133-144`, `src/ui/HUD.js:174-225`, `src/game/ShopManager.js:3-183` | Opened via `[E]` key or right-clicking NPC (`GameManager.js:191`). Displays 16 shop items. Deducts currency. | ⚠️ Projectile item (`fireball`) cannot be launched. Armor purchase sets reduction, but sword purchases do not handle upgrades correctly. |
| **Team Upgrade GUI** | `index.html:147-158`, `src/ui/HUD.js:228-264`, `src/game/ShopManager.js:185-242` | Opened via `[U]` key. Offers Sharpness, Protection I & II, Forge II & III, Heal Pool, Alarm Trap. | ❌ Critical defect: Only `forgeTier` works (`GeneratorManager.js:60`). `sharpness`, `protection`, `healPool`, and `alarmTrap` are never evaluated anywhere in gameplay! |
| **Death & Respawn UI** | `index.html:161-166`, `src/ui/HUD.js:130-137` | 5-second respawn overlay with countdown. | ✅ Works for normal deaths. Final deaths do not show respawn overlay. |
| **Game Over Overlay** | `index.html:169-177`, `src/ui/HUD.js:266-280` | Displays VICTORY! or GAME OVER! with Play Again and Main Menu buttons. | ⚠️ No match statistics summary screen, no rank delta display, no XP progression animation. |

### 2.2 Specific Deficiencies & Bugs Identified in R2 UI/Combat Loop

1. **Unapplied Team Upgrades (`src/game/ShopManager.js:185-242`, `src/entities/Player.js:111-129`)**:
   - `sharpness`: When purchased, sets `team.upgrades.sharpness = 1`. In `GameManager.js:143`, player attack damage is passed as `this.localPlayer.weapon.damage || 4.0` without adding `team.upgrades.sharpness`.
   - `protection`: In `Player.js:115`, damage taken is calculated as `amount * (1.0 - (this.armor?.reduction || 0))`. `team.upgrades.protection` is completely ignored.
   - `healPool`: Never ticks; no regeneration is provided on base.
   - `alarmTrap`: No detection logic exists for enemies entering base perimeter.
2. **Missing Projectile Handling (`src/game/GameManager.js:183-226`)**:
   - `ShopManager.js:171` provides `{ type: 'projectile', id: 'fireball', name: 'Fireball', count: 1 }`.
   - In `GameManager.js:handleRightClick()`, only `item.type === 'block'` and `item.type === 'consumable' && item.id === 'gapple'` are checked.
   - Right-clicking with a Fireball does nothing.
3. **Bed Double-Break Defect (`src/game/GameManager.js:234-250`)**:
   - A bed consists of `BED_HEAD` and `BED_FOOT` (2 voxel blocks).
   - When a block is hit, `GameManager.js:238` replaces only the targeted block with `AIR`.
   - If the player hits the other block, `destroyBedAt()` executes again, incrementing `destroyer.bedsBroken++` twice for a single bed.
   - Fix: Destroying either part of a bed must destroy both bed blocks and check if `teamManager.hasBed(team)` is already false before crediting.
4. **Void Kill Credit Defect (`src/game/GameManager.js:309-342`)**:
   - When a player falls into the void (`y < -12`), `die()` is called with `killer = null`.
   - Knocking enemies into the void with a weapon or knockback stick awards zero kills and zero final kills.
   - Fix: Implement a combat-tag system tracking `lastDamagedBy` and `lastDamageTimestamp` (e.g. 10-second window). If void fall occurs, credit `lastDamagedBy`.
5. **No Mouse Wheel Hotbar Cycling (`src/entities/LocalPlayer.js:66-99`)**:
   - Only keys `1-9` and DOM clicks select hotbar slots. Wheel event listener is absent.

---

### 2.3 Player Stat and Ranking System Architecture (inspired by bloxd.io)

Currently, the game has **zero** persistence, ranking, or player level systems.

#### Recommended Architecture: `src/ranking/RankManager.js`

1. **Numerical Rank Rating (Elo/MMR Formula)**:
   - Base Rank Rating: `1000 RR`.
   - Rank Tiers:
     * **Bronze**: 0 – 1199 RR
     * **Silver**: 1200 – 1499 RR
     * **Gold**: 1500 – 1799 RR
     * **Diamond**: 1800 – 2099 RR
     * **Emerald**: 2100 – 2399 RR
     * **Champion**: 2400+ RR
   - **MANDATORY CRITICAL RULE (from Requirement R2)**:
     > *"Designate 2-team game formats (1v1, 2v2, 3v3, 4v4) as official Ranked matches affecting rank ratings."*
     - If the match is NOT an official 2-team format (e.g. 4-team Solo, 8-team Duos, Custom Mutator matches), **Rank Rating is completely unaffected (`ΔRR = 0`)**.
     - In official 2-team matches:
       * Victory: `+30 RR` baseline (modulated by opponent rating differential if available).
       * Defeat: `-20 RR` baseline (minimum floor: 0 RR).
       * In-match performance bonuses:
         + `+2 RR` per Kill
         + `+5 RR` per Final Kill
         + `+10 RR` per Bed Broken
2. **Player Level & Progressive XP System**:
   - Applies to **ALL** matches (both Ranked and Casual).
   - Match XP Formula:
     * Match Win: `+100 XP`
     * Match Completion / Loss: `+30 XP`
     * Bed Destroyed: `+50 XP`
     * Final Kill: `+25 XP`
     * Regular Kill: `+10 XP`
   - Progressive Level Curve:
     * `XP_for_level(L) = 250 * L * (L + 1)` (or `Level = Math.floor(Math.sqrt(totalXP / 250)) + 1`).
     * Gives meaningful progression from Level 1 to Level 100+.
3. **Local & Cloud Persistence Schema**:
   ```json
   {
     "profile": {
       "userId": "usr_guest_8231",
       "username": "VoxelKnight",
       "provider": "guest", // "github" | "google" | "guest"
       "avatarUrl": "./assets/avatar_default.png",
       "createdAt": 1731000000000
     },
     "ranking": {
       "rankRating": 1240,
       "tier": "Silver II",
       "peakRating": 1310,
       "rankedMatchesPlayed": 14,
       "rankedWins": 9,
       "rankedLosses": 5
     },
     "progression": {
       "level": 7,
       "currentXP": 1420,
       "xpForNextLevel": 2000
     },
     "lifetimeStats": {
       "totalMatches": 28,
       "totalWins": 18,
       "totalKills": 84,
       "totalFinalKills": 32,
       "totalBedsBroken": 24,
       "kdRatio": 2.62
     }
   }
   ```
   Stored in `localStorage` (`voxel_bedwars_profile`) with automatic hydration and synchronization.

---

### 2.4 Frontpage Portal & OAuth Authentication UI

#### Current Main Menu (`index.html:179-240`):
- Features a header with title and 4 cards ("SOLO VS TACTICAL AI", "RUSH BEDWARS", "LUCKY BLOCKS", "BEDWARS STUDIO") and WebRTC modal launcher.
- Lacks:
  * Player profile card (Avatar, Level, Rank Rating, Win/Kill stats).
  * OAuth Authentication interface.
  * Formal match format selectors (Ranked 1v1, Ranked 2v2, 4-team Solo, 8-team Duos).

#### Required Frontpage Specification:
1. **OAuth Account Header / Widget**:
   - Prominent **"Login with GitHub"** (primary option with GitHub Octocat icon, high-contrast dark button).
   - **"Login with Google"** (fallback option with official Google "G" icon).
   - **"Play as Guest"** option allowing instant gameplay without barrier to entry.
   - When authenticated: Displays User Avatar, Username, Level Badge (`Lv. 14`), Rank Badge (`Gold II - 1540 RR`), and Sign Out button.
2. **Match Selector Hub**:
   - Tab 1: **Ranked Queue (Official 2-Team)**:
     * 1v1 Duels (Colosseum Map)
     * 2v2 Doubles (Colosseum or Speedway 2-Team)
     * 4v4 Competitive (Speedway 2-Team)
     * Displays: "Rank Rating at stake!"
   - Tab 2: **Casual & Multi-Team**:
     * 4-Team Solos (Speedway)
     * 8-Team Solos / Duos (Octagon)
   - Tab 3: **Mutation Mayhem**:
     * Custom modifier checkboxes for all 9 mutators on any map.

---

## 3. In-Depth Survey: Requirement R3

### 3.1 Multi-Map Architecture & Presets (`src/game/MapPresets.js`)

Currently, `MapPresets.js` contains **only one** map preset: `speedway`.

#### Specification of the 3 Required Maps:

```
+-----------------------------------------------------------------------------------------------+
| MAP 1: Colosseum (1v1 Duel Map)                                                               |
| - Layout: 2 Bases (Red vs Blue) directly facing each other across a narrow void chasm.        |
| - Dimensions: Distance between bases: 26 blocks.                                              |
| - Red Base: x = -16, y = 20, z = 0; Blue Base: x = 16, y = 20, z = 0.                        |
| - Center: Single compact bridge / Middle island at x = 0 with 1 high-speed Diamond/Emerald gen.|
| - Features: Fast-paced, high competitive integrity, zero third-partying.                      |
+-----------------------------------------------------------------------------------------------+
| MAP 2: Speedway (4-Team Classic Arena)                                                        |
| - Layout: 4 Bases (Red, Blue, Green, Yellow) at 90-degree compass positions (radius 30).     |
| - Satellite Islands: 4 Diamond generator islands at 45-degree angles (radius 25).             |
| - Center Island: Grand stone arena (radius 7) with 2 Emerald generator pillars.              |
| - Supported Formats: 1v1v1v1 Solos, 2v2v2v2 Duos, 4v4 2-Team.                                 |
+-----------------------------------------------------------------------------------------------+
| MAP 3: Octagon / Cosmic Ring (8-Team Solo/Duo Layout)                                         |
| - Layout: 8 Bases arranged circularly at radius 60, spaced at 45° intervals.                  |
|   Teams: Red (0°), Blue (45°), Green (90°), Yellow (135°), Aqua (180°), White (225°),         |
|   Pink (270°), Gray (315°).                                                                   |
| - Satellite Islands: 8 Diamond generator islands at radius 38 (intermediate angles).          |
| - Center Island: Massive Emerald Citadel (radius 14) with 4 central Emerald generators.       |
| - Supported Formats: 8-player Solos (1v1v1v1v1v1v1v1), 16-player Duos (8 teams of 2).        |
+-----------------------------------------------------------------------------------------------+
```

### 3.2 Dynamic Team & Generator System Deficiencies

1. **`TeamManager.js:3-8` is hardcoded to 4 teams**:
   ```javascript
   this.teams = {
     red: { name: 'Red', hex: 0xef4444, ... },
     blue: { name: 'Blue', hex: 0x3b82f6, ... },
     green: { name: 'Green', hex: 0x22c55e, ... },
     yellow: { name: 'Yellow', hex: 0xeab308, ... }
   };
   ```
   - On a 1v1 duel map, Green and Yellow remain in `this.teams`, preventing proper win-condition detection (`getAliveTeams()`).
   - On an 8-team map, Aqua, White, Pink, and Gray cannot be registered.
   - **Required Fix**: `TeamManager.initTeams(activeTeamsList)` where `activeTeamsList` comes directly from `mapPreset.teams`.
2. **`Player.js:52-60` lacks 8-team wool resolution**:
   - Only maps `red`, `blue`, `green`, `yellow`.
   - Needs mapping for `aqua` -> `WOOL_AQUA`, `white` -> `WOOL_WHITE`, `pink` -> `WOOL_PINK`, `gray` -> `WOOL_GRAY`.
3. **`GameManager.js:278-286` hardcoded bot spawning**:
   ```javascript
   const opponentTeams = ['blue', 'green', 'yellow'];
   ```
   - Must dynamically spawn bots only for `mapPreset.teams.filter(t => t !== localPlayer.team)`.

---

### 3.3 Match Formats Specification

| Format Code | Format Name | Teams | Players/Team | Total Players | Ranked / Casual | Target Map |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `duel_1v1` | **1v1 Duels** | 2 (Red, Blue) | 1 | 2 | **Official Ranked** | Colosseum |
| `ranked_2v2` | **2v2 Doubles** | 2 (Red, Blue) | 2 | 4 | **Official Ranked** | Colosseum / Speedway |
| `ranked_3v3` | **3v3 Trios** | 2 (Red, Blue) | 3 | 6 | **Official Ranked** | Speedway |
| `ranked_4v4` | **4v4 Competitive**| 2 (Red, Blue) | 4 | 8 | **Official Ranked** | Speedway |
| `solo_4` | **Solos (4-Team)** | 4 (R, B, G, Y) | 1 | 4 | Casual | Speedway |
| `duos_4` | **Duos (4-Team)** | 4 (R, B, G, Y) | 2 | 8 | Casual | Speedway |
| `solo_8` | **Solos (8-Team)** | 8 (All 8) | 1 | 8 | Casual | Octagon |
| `duos_8` | **Duos (8-Team)** | 8 (All 8) | 2 | 16 | Casual | Octagon |

---

### 3.4 Extensible Match Mutation Modifier System

#### Architectural Gap:
There is currently **no mutation architecture**. `main.js` contains only ad-hoc code that directly mutates `MAP_PRESETS.speedway` intervals.

#### Required Architecture: `src/game/mutators/MutationManager.js`
A pluggable system where any combination of mutators can be toggled on any map or match format. Each mutator implements lifecycle hooks:

```javascript
export interface Mutator {
  id: string;
  name: string;
  icon: string;
  description: string;
  onMatchInit?(gameManager: GameManager): void;
  onMatchStart?(gameManager: GameManager): void;
  onTick?(gameManager: GameManager, dt: number): void;
  onPlayerSpawn?(player: Player, gameManager: GameManager): void;
  onDamageCalculate?(attacker: Player, victim: Player, baseDamage: number): number;
  onDamageDealt?(attacker: Player, victim: Player, finalDamage: number, gameManager: GameManager): void;
  onKill?(killer: Player, victim: Player, gameManager: GameManager): void;
  onBlockBreak?(player: Player, x: number, y: number, z: number, blockType: number, gameManager: GameManager): void;
  onCleanup?(gameManager: GameManager): void;
}
```

#### Detailed Specification of the 9 Mutators:

1. **"Supercharged"**:
   - *Requirement*: All team forges and resource generators start at level 2 from match start.
   - *Implementation*:
     * In `onMatchStart`: iterates over all teams, sets `upgrades.forgeTier = 2.0`.
     * Iterates over `generatorManager.spawners`: halves intervals of all diamond and emerald generators (`interval *= 0.5`).
2. **"Launch Rush"**:
   - *Requirement*: Every team base island starts equipped with an operational launchpad.
   - *Implementation*:
     * In `onMatchInit`: generates a launchpad block (`BLOCK_TYPES.LAUNCHPAD` or glowing platform) at each team base pointed toward adjacent satellites/center.
     * In `Physics.js:moveEntity`: when entity stands on a launchpad block, imparts high launch impulse (`velocity.y = 16.0`, `velocity.xz = baseDirection * 20.0`), plays launch audio, and emits trail particles.
3. **"Gun Game"**:
   - *Requirement*: Players spawn with projectile weapons that upgrade on securing kills.
   - *Implementation*:
     * Requires adding a Projectile Entity system (`src/entities/Projectile.js`).
     * Progression ladder:
       - Tier 0 (0 kills): Wooden Slingshot (3 damage)
       - Tier 1 (1 kill): Iron Crossbow (5 damage)
       - Tier 2 (2 kills): Fireball Cannon (7 damage + explosive knockback)
       - Tier 3 (3 kills): TNT Launcher (launches primed TNT)
       - Tier 4 (4+ kills): Plasma Railgun (10 damage)
     * In `onKill`: Automatically replaces slot 0 weapon with next tier, plays fanfare sound, and shows announcement HUD.
4. **"Lethal Strike"**:
   - *Requirement*: Attacks deal increased damage for fast, high-stakes combat.
   - *Implementation*:
     * In `onDamageCalculate`: multiplies all combat damage by `2.2x`.
     * Lowers time-to-kill; rewards positioning and fast reflexes.
5. **"Low Gravity"**:
   - *Requirement*: Moon-like reduced gravity enabling floaty leaps and aerial bridging.
   - *Implementation*:
     * In `onMatchStart`: modifies `Physics.gravity` from `-24.0` to `-8.0`.
     * Terminal velocity reduced; jump height increased by 2.5x.
     * In `onCleanup`: resets `Physics.gravity` back to `-24.0`.
6. **"Speed Demon"**:
   - *Requirement*: All players receive a permanent movement speed boost.
   - *Implementation*:
     * In `onPlayerSpawn`: sets player walk speed from `4.8` to `8.0`, sprint speed from `7.2` to `12.5`.
     * Adjusts Bot movement velocity proportionally in `BotBrain.js`.
7. **"Vampirism"**:
   - *Requirement*: Players regenerate health upon damaging or eliminating opponents.
   - *Implementation*:
     * In `onDamageDealt`: attacker restores `+2 HP` (1 heart) on hit.
     * In `onKill`: attacker restores `+10 HP` (5 hearts) on standard kill, or full `20 HP` on final kill.
     * Emits red heart particle burst and plays healing chime.
8. **"Sudden Death"**:
   - *Requirement*: Accelerates match progression with early bed breakdown and arena hazards.
   - *Implementation*:
     * At 3:00 match time: Triggers automatic bed destruction across all teams (`destroyAllBeds()`), disabling all further respawns with screen shake and apocalyptic audio.
     * At 4:30 match time: "Arena Decay" activates—outer base islands disintegrate into the void ring-by-ring, and meteors rain on players lingering away from center island.
9. **"Lucky Chaos"**:
   - *Requirement*: Spawns lucky block drops and unpredictable arena item events across islands.
   - *Implementation*:
     * Spawns Lucky Blocks (`BLOCK_TYPES.LUCKY_BLOCK`) periodically on every base island every 30 seconds. Center island starts covered in Lucky Blocks.
     * Breaking a Lucky Block triggers a randomized event table:
       - 20% Diamond/Emerald rain
       - 15% Knockback Stick
       - 15% 3x Primed TNT trap
       - 15% Diamond Armor drop
       - 15% Bridge Egg (projectile that builds wool bridge)
       - 10% Speed & Jump boost potion effect
       - 10% Void Lightning Strike

---

## 4. Feature Matrix: Existing vs Missing Implementations

| Category | Feature / Requirement | Current Codebase Status | Priority |
| :--- | :--- | :--- | :--- |
| **R2: Scoreboard** | Sidebar displays Kills, Final Kills, Beds Broken, Timer | ✅ Implemented (`HUD.js:115`) | Low |
| **R2: Scoreboard** | Sidebar displays Player Numerical Rank Rating & Level | ❌ Missing | High |
| **R2: Scoreboard** | Mode badge dynamically updates with match format | ❌ Hardcoded to "SOLO" | Medium |
| **R2: Bed Tracker** | Distinguishes Bed Intact vs Bed Broken vs Team Eliminated | ⚠️ Partial (only Intact vs Broken) | Medium |
| **R2: Hearts** | 10 Minecraft-style hearts with half-heart precision | ⚠️ Basic emoji text (`❤️`, `💔`, `🖤`) | Medium |
| **R2: Hotbar** | 9-slot hotbar with count badges, 1-9 keys & mouse clicks | ✅ Implemented (`HUD.js:49`) | Low |
| **R2: Hotbar** | Mouse wheel slot cycling | ❌ Missing | Medium |
| **R2: Shop GUI** | Press [E] or click NPC to purchase blocks/gear/tools | ✅ Implemented (`HUD.js:174`) | Low |
| **R2: Shop Items** | Projectiles (Fireball) fire on right click | ❌ Missing (item bought, cannot fire) | High |
| **R2: Upgrades GUI** | Press [U] to purchase team upgrades | ⚠️ GUI exists, but Sharpness/Prot/Heal are stubs | High |
| **R2: Ranking** | Bloxd.io numerical rank rating calculation | ❌ Completely missing | High |
| **R2: Ranking** | 2-team matches restriction for ranked updates | ❌ Completely missing | High |
| **R2: Progression**| Progressive player levels and match XP | ❌ Completely missing | High |
| **R2: Frontpage** | Player profile widget (Level, Rank, Lifetime stats) | ❌ Completely missing | High |
| **R2: Auth UI** | "Login with GitHub" (primary) & "Login with Google" | ❌ Completely missing | High |
| **R3: Maps** | 4-team arena map (Speedway) | ✅ Implemented (`MapPresets.js:4`) | Low |
| **R3: Maps** | 1v1 duel map (Colosseum) | ❌ Missing | High |
| **R3: Maps** | 8-team solo/duo map (Octagon) | ❌ Missing | High |
| **R3: Maps** | Dynamic 2-team, 4-team, and 8-team base/bed/forge config | ❌ Hardcoded to 4 teams | High |
| **R3: Formats** | Format selector (1v1, 2v2, 3v3, 4v4, Solos, Duos) | ❌ Hardcoded ad-hoc buttons | High |
| **R3: Mutators** | Pluggable Mutation Manager & UI toggles | ❌ Completely missing | High |
| **R3: Mutators** | "Supercharged" mutator | ❌ Missing | High |
| **R3: Mutators** | "Launch Rush" mutator & launchpad block | ❌ Missing | High |
| **R3: Mutators** | "Gun Game" mutator & projectile progression | ❌ Missing | High |
| **R3: Mutators** | "Lethal Strike" mutator | ❌ Missing | High |
| **R3: Mutators** | "Low Gravity" mutator | ❌ Missing | High |
| **R3: Mutators** | "Speed Demon" mutator | ❌ Missing | High |
| **R3: Mutators** | "Vampirism" mutator | ❌ Missing | High |
| **R3: Mutators** | "Sudden Death" mutator (bed breakdown + decay) | ❌ Missing | High |
| **R3: Mutators** | "Lucky Chaos" mutator | ❌ Missing | High |

---

## 5. Architectural Blueprint & File Layout Recommendations

To implement R2 and R3 cleanly without regression to the existing engine and AI bots, the following modular directory and file layout is recommended:

```
src/
├── auth/
│   └── AuthManager.js          # OAuth client (GitHub primary, Google fallback, Guest profile, localStorage sync)
├── ranking/
│   ├── RankManager.js          # Bloxd.io MMR calculation, 2-team restriction check, win/kill/bed bonuses
│   └── LevelManager.js         # XP progression curve, level milestones, badge rendering
├── game/
│   ├── GameManager.js          # Main match orchestrator (wire in RankManager, MutationManager, MapPresets)
│   ├── MapPresets.js           # Speedway (4-team), Colosseum (1v1 duel), Octagon (8-team)
│   ├── TeamManager.js          # Dynamic team registration (2, 4, or 8 teams), active upgrades evaluator
│   ├── GeneratorManager.js     # Dynamically loaded forges/diamonds/emeralds with Supercharged scaling
│   ├── ShopManager.js          # Items & team upgrades with functional application to combat calculations
│   └── mutators/
│       ├── MutationManager.js  # Pluggable mutator registry & lifecycle hooks runner
│       ├── Supercharged.js     # Tier 2 forge & accelerated generators
│       ├── LaunchRush.js       # Base island launchpad blocks & physics impulses
│       ├── GunGame.js          # Progressive projectile weapon kill upgrades
│       ├── LethalStrike.js     # 2.2x combat damage multiplier
│       ├── LowGravity.js       # Moon-gravity physics modifier
│       ├── SpeedDemon.js       # Permanent movement speed boost
│       ├── Vampirism.js        # Health restore on hit and kill
│       ├── SuddenDeath.js      # Timed bed destruction and arena decay
│       └── LuckyChaos.js       # Recurring lucky block drops and RNG event table
├── entities/
│   ├── LocalPlayer.js          # Combat tagging, mouse wheel hotbar scroll, projectile launch
│   ├── Player.js               # Dynamic team wool, armor/protection damage calculation
│   ├── BotPlayer.js            # Bot entity with dynamic team mesh colors
│   └── Projectile.js           # Fireballs, arrows, slingshot physics, voxel/player hit detection
└── ui/
    ├── HUD.js                  # Scoreboard (with rank/level), integrated bed statuses, pixel hearts
    ├── PortalView.js           # Frontpage profile widget, OAuth login buttons, Match Format picker
    └── MutationPickerUI.js     # In-menu checkboxes to enable mutators for any match
```

---

## 6. Verification and Independent Testing Strategy

To independently verify the implementations of R2 and R3:

1. **Build Verification**:
   - `npm run build` must compile with zero errors and generate `dist/`.
2. **HUD & UI Verification**:
   - Verify scoreboard shows: Player Rank Rating, Player Level, Mode Badge ("1v1 RANKED", "SOLO", etc.), Kills, Final Kills, Beds Broken, and Timer.
   - Verify Team Bed tracker correctly displays 2 teams in 1v1, 4 teams in Speedway, and 8 teams in Octagon.
   - Verify mouse wheel cycles through hotbar slots 1–9.
   - Verify purchasing Sharpness and Protection alters damage calculations in combat.
3. **Rank Rating & Stat System Verification**:
   - Play a 2-team match (1v1, 2v2, 3v3, 4v4): Win match -> verify Rank Rating increases by +30 (plus kill/bed bonuses).
   - Play a 4-team Solo or 8-team Casual match: Win match -> verify Rank Rating does NOT change (`ΔRR = 0`).
   - Verify total XP and player level increment across both ranked and casual matches.
   - Refresh browser -> verify `localStorage` persistence restores profile, level, rank, and stats.
4. **Multi-Map Verification**:
   - Launch Colosseum: Verify only 2 teams (Red vs Blue), 2 beds, 2 forges, central island.
   - Launch Speedway: Verify 4 teams, 4 diamond satellites, 1 center emerald island.
   - Launch Octagon: Verify 8 teams (all 8 colors), 8 beds, 8 forges, 8 diamond satellites, center emerald citadel.
5. **Mutation Modifier Verification**:
   - Test each of the 9 mutators individually and in combination:
     * "Supercharged": Forge and generators produce resources at 2x rate from second 0.
     * "Launch Rush": Step on base launchpad -> player launched smoothly across void.
     * "Gun Game": Spawns with gun -> score kill -> weapon upgrades immediately.
     * "Lethal Strike": Attacks deal >2x damage.
     * "Low Gravity": Jumps reach 3x height with floaty hang time.
     * "Speed Demon": Player moves noticeably faster.
     * "Vampirism": Hitting bot restores player hearts; killing bot fully heals player.
     * "Sudden Death": At 3:00 beds break automatically; outer islands crumble.
     * "Lucky Chaos": Lucky blocks spawn across arena; opening one triggers RNG event table.
