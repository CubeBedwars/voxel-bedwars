# Original User Request

## Approved Task Prompt — 2026-11-07T17:41:45Z

Build and polish a production-grade cross-platform 3D voxel Bedwars game (web, desktop, and mobile) inspired by Hypixel, Minecraft Bedwars, and bloxd.io, featuring authentic voxel textures and block mechanics, multiple maps, diverse team formats, competitive ranked 2-team matches with player level and numerical rank, match mutation modifiers applicable to any map, dual-layer networking (dedicated WebSocket server with serverless WebRTC fallback and LAN multiplayer for desktop/mobile), OAuth authentication (GitHub / Google), and Netlify deployment.

Working directory: C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars
Integrity mode: development

## Requirements

### R1. Voxel Engine, Textures, and Block Mechanics
Resolve all rendering bugs so blocks, entities, and voxel meshes render completely without visual glitches. Provide authentic pixel-art textures and real voxel block interaction: grid-aligned block placement against targeted faces, tool-appropriate block breaking times, sound effects, particle feedback, and block hardness rules modeled after Minecraft/Hypixel Bedwars.

### R2. Bedwars UI, Player Ranking System, and Frontpage Portal
Deliver an authentic Bedwars in-game HUD featuring a sidebar scoreboard (team bed statuses, player kills, final kills, game timer), health hearts display, 9-slot hotbar, resource indicators, and interactive shopkeeper and team upgrade GUIs. Implement a player stat and ranking system inspired by bloxd.io:
- Compute a numerical rank rating and progressive player level derived from match wins, kills, final kills, and beds broken.
- Designate 2-team game formats (1v1, 2v2, 3v3, 4v4) as official Ranked matches affecting rank ratings.
- Enhance the frontpage portal with player profile stats (rank number, level), match format selectors, OAuth account management supporting "Login with GitHub" (primary) and "Login with Google" (fallback), and direct match launchers.

### R3. Multi-Map System, Match Formats, and Match Mutation Modifiers
Deliver multiple distinct, balanced Bedwars arena maps tailored to different player counts (including 4-team arenas, 8-team solo/duo layouts, and 1v1 duel maps) with functional team bases, forges, shopkeepers, and diamond/emerald generators.
Support standard team formats (Solos 1v1v1v1, Duos, Trios, 4v4, 1v1 Duels).
Implement an extensible match Mutation modifier system where one or more named mutators can be applied as game mods across any map and match format:
- "Supercharged": All team forges and resource generators start at level 2 from match start.
- "Launch Rush": Every team base island starts equipped with an operational launchpad.
- "Gun Game": Players spawn with projectile weapons that upgrade on securing kills.
- "Lethal Strike": Attacks deal increased damage for fast, high-stakes combat.
- "Low Gravity": Moon-like reduced gravity enabling floaty leaps and aerial bridging.
- "Speed Demon": All players receive a permanent movement speed boost.
- "Vampirism": Players regenerate health upon damaging or eliminating opponents.
- "Sudden Death": Accelerates match progression with early bed breakdown and arena hazards.
- "Lucky Chaos": Spawns lucky block drops and unpredictable arena item events across islands.

### R4. Dual-Layer Networking and LAN Multiplayer
Implement hybrid multiplayer networking:
- Create a dedicated WebSocket multiplayer service in a separate `server` repository (deployed on a free tier supporting 24/7/31-day uptime without credit card requirements, excluding Render), featuring a non-WebSocket `/ping` endpoint configured for UptimeRobot monitoring every 5 minutes to prevent idling.
- Provide automatic client fallback to serverless browser peer-to-peer (WebRTC with room codes) if the WebSocket server is unreachable.
- Implement native local area network (LAN) multiplayer discovery and host/join functionality for desktop and mobile builds.

### R5. Cross-Platform Builds (Web, Desktop, and Mobile) & Netlify Deployment
Configure the project to build and deploy across web, desktop, and mobile targets:
- Web: Clean production builds via `npm run build` hosted on Netlify.
- Desktop: Desktop packaging configuration with native windowing and LAN multiplayer support.
- Mobile: Mobile build configuration with responsive touch controls and LAN multiplayer support.

## Acceptance Criteria

### Voxel Engine & Textures
- [ ] All voxel blocks, player models, items, and arena islands render cleanly with no missing geometry or camera clipping upon match load.
- [ ] Blocks feature distinct 16x16 pixel-art voxel textures (team wool colors, wood, stone, end stone, obsidian, glass, lucky blocks, and ores).
- [ ] Voxel placing snaps precisely to adjacent targeted block faces, preventing overlapping or misaligned placements.
- [ ] Block breaking honors block hardness and required tool types with breaking progress and sound/particle feedback.

### Bedwars HUD, Ranking & Authentication
- [ ] Sidebar scoreboard displays live match stats: team bed status icons (bed intact, bed broken, team eliminated), personal kills, final kills, and match duration timer.
- [ ] In-game HUD and frontpage profile display the player's numerical rank rating and level.
- [ ] Match outcome tracking updates player stats (wins, kills, beds broken), with rating updates applied exclusively to 2-team matches (1v1, 2v2, 3v3, 4v4).
- [ ] Health indicator displays Minecraft-style hearts that deplete upon taking damage and update accurately.
- [ ] Hotbar slots 1–9 correctly display selected items, update inventory counts, and support numeric key and mouse selection.
- [ ] Interactive shopkeeper menu opens cleanly (via [E]) and allows purchasing blocks, tools, armor, and weapons with collected resources.
- [ ] User authentication interface offers "Login with GitHub" as the primary option and "Login with Google" as the fallback.

### Multi-Map System, Match Formats & Mutations
- [ ] Game provides multiple selectable maps (4-team arena, 8-team solo/duo map, and 1v1 duel map) with active forges and generators.
- [ ] Match format selector supports Solos (1v1v1v1), Duos (2v2v2v2), Trios (3v3v3v3), 4v4, and 1v1 Duels.
- [ ] Match modifier system allows enabling mutations on any map and format, featuring distinct display names and active gameplay effects:
  - "Supercharged" starts all generators at level 2.
  - "Launch Rush" places working launchpads at team bases.
  - "Gun Game" spawns players with projectile weapons that upgrade on kills.
  - "Lethal Strike" applies increased damage scaling.
  - "Low Gravity" applies reduced gravitational pull.
  - "Speed Demon" grants permanent movement speed enhancement.
  - "Vampirism" restores player health on landing hits or securing kills.
  - "Sudden Death" and "Lucky Chaos" trigger their respective arena hazards and random block drops.

### Dual-Layer Networking & LAN Multiplayer
- [ ] Client connects to the dedicated WebSocket server for room creation, matchmaking, and low-latency state synchronization.
- [ ] Dedicated server codebase resides in the `server` repository, exposes a `/ping` HTTP endpoint for 5-minute health monitoring, and is deployed on a non-Render free platform supporting 31-day continuous uptime without a credit card.
- [ ] Client automatically detects WebSocket connection failures and gracefully falls back to serverless WebRTC peer-to-peer room codes.
- [ ] Desktop and mobile builds support local network (LAN) match broadcasting, discovery, and direct LAN IP/port connections.

### Multi-Platform Packaging & Web Deployment
- [ ] Web target compiles cleanly via `npm run build` and deploys to Netlify with working routes and assets.
- [ ] Desktop build configuration compiles and runs as an executable with desktop window management and input handling.
- [ ] Mobile build configuration bundles mobile assets with touch-screen joystick and button controls.


## Follow-up — 2026-11-08T08:07:00Z

actually, using scracth voxels is hard for u, use an existing voxel interface to build the game (external lib)
also, we want a hypixels like interface, like the one above, real minecraft based

stuff are too different from the real minecraft
check the bedwars bloxd.io makes and learn from that first
then build on it, and expand on it

for a reference to how i built a mineraft game in scratch, refer to this file F:/Minecraft 3D v0.6

---
### Context, Research & User Approvals from Interview:
1. **Engine Selected**: `noa-engine` (the exact voxel engine bloxd.io is built on).
2. **Assets Ingestion**: The reference file `F:/Minecraft 3D v0.6 (2026_03_17 16_10_39 UTC).sb3` has been extracted to `C:\Users\alekhyo\.gemini\antigravity\scratch\scratch_minecraft_ref` and contains 443 authentic Minecraft block/item/GUI costumes and 251 authentic Minecraft sound effects. All of these must be ingested into the game (`public/assets/minecraft/textures/` and `public/assets/minecraft/sounds/`).
3. **Hypixel Minecraft HUD (from user's uploaded reference image)**:
   - 10 Armor chestplate icons above health
   - 10 Health hearts (supports red health and golden absorption hearts from golden apples)
   - 10 Hunger drumsticks on the right (Hypixel style: kept full, golden apples grant regeneration & absorption)
   - Green Experience Bar with level number (tied to bloxd.io XP/level system)
   - 9-slot centered hotbar
   - 3D angled held item in bottom-right viewport with walking bobbing, attack swing, and animated purple scrolling enchantment glint.
   - Right-side sidebar scoreboard tracking team beds, event timers, kills, and MMR.
4. **bloxd.io Bedwars Research Findings**:
   - Voxel engine: `noa-engine` with chunk meshing and voxel AABB physics.
   - Shop categories: Blocks (Wool, Planks, Baked Clay, Cracked Bricks, Obsidian, Ladder), Combat (Swords, Armor upgrades, Bows, Crossbow, Fireball, Iceball), Utility (Pickaxes, Axes, Shears, Water Bucket, Ender Pearl/Moonstone Orb, Food items).
   - Forge generators: Iron, Gold, Diamond, Emerald with countdown timers.
   - Mutations: Pluggable modifiers (Lucky Chaos, Supercharged, etc.).
   - Ranking: Numerical Elo MMR for 2-team matches and level XP progression.
5. **Multiplayer & Repositories**:
   - Retain dual-layer WebSocket (`CubeBedwars/server`) and WebRTC PeerJS fallback.
   - Repositories: `CubeBedwars/voxel-bedwars`, `CubeBedwars/web`, `CubeBedwars/cubebedwars.github.io`.

### User Approval — 2026-11-08T08:06:43Z
The user has reviewed and approved the implementation plan (voxel_bedwars_minecraft_fidelity_plan.md). You have full green light to proceed with execution across all milestones: ingesting the 443 authentic Minecraft textures & 251 sounds from F:/Minecraft 3D v0.6, integrating noa-engine, building the authentic Hypixel HUD and 3D held items with enchantment glint, and verifying all systems.


## Follow-up — 2026-11-08T08:07:49Z

# Bloxd.io Bedwars Live Research Findings Delivered

The browser subagent has completed a live inspection and capture of bloxd.io Bedwars. Key architectural and design specifications to integrate:

1. **Rendering & Voxel Engine**:
   - DOM/Canvas separation: WebGL canvas `#noa-canvas` in full-screen container with separate high-performance overlay layer (`.InGameUi`) for hotbar, scoreboard, chat, and shop menus.
   - Chunk meshing: Greedy meshed 16x16x16 chunks, 16x16 nearest-neighbor pixel-art textures with texture atlas.
   - Ambient occlusion baked into chunk vertices.
   - Targeting: Targeted block face polygon highlight (white quad outline on the targeted face) rather than full wireframe cube, ensuring ultra-clear bridging and fast placement.
   - 3D floating holograms: Spawners have floating billboard text ("Base Gen", countdown timer) and rotating/bobbing 3D item drops.
   - First-person held items: 3D item model held in lower-right viewport with movement sway and downward attack swing.

2. **In-Game HUD & Controls**:
   - Hotbar: Centered slots with active slot highlight + `[B]` Quick Shop shortcut (allows opening Bedwars shop directly while in base).
   - Health & Armor: Authentic Hypixel 10 hearts + 10 armor icons above health bar.
   - Crosshair: Centered crosshair with dynamic 4-tick hitmarker animation expanding on hit.
   - Right Scoreboard: Tracks map name, active mutation modifier, team bed statuses (`✓` when alive, player count when bed broken, `✗` when eliminated), and event timers.

3. **Shop Categories & Economy**:
   - Categories: Recommended, Blocks (Wool, Planks, Baked Clay, Stone Bricks, Obsidian, Ladder), Combat (Swords, Armor upgrades, Bows, Crossbows, Fireballs), Utility (Pickaxes, Axes, Shears, Water Bucket, Teleportation Moonstone Orb / Ender Pearl, Golden Apples).
   - Currencies: Iron, Gold, Diamond, Emerald.

Incorporate these findings directly into the build and engine integration.
