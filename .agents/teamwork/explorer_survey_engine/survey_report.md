# R1 Technical Survey Report: Voxel Engine, Textures, and Block Mechanics

**Project**: Voxel Bedwars  
**Date**: 2026-11-07  
**Investigator**: teamwork_explorer (Teamwork Explorer Agent)  
**Status**: Survey Completed — Read-Only Analysis  
**Target Milestone**: R1 (Voxel Engine, Textures, and Block Mechanics)

---

## Executive Summary

The existing project is a browser-based 3D voxel game built with **Three.js (v0.170.0)**, **Vite (v6.0.0)**, and native **HTML5 Canvas / Web Audio API**. It already implements a functional instanced voxel world with face-culling, procedural 16x16 pixel-art canvas textures, AABB physics, basic bots, and a creative studio mode.

However, for **R1 (Voxel Engine, Textures, and Block Mechanics)** compliance, significant defects and missing mechanics were identified:
1. **Critical Rendering Defect**: The camera is never added to the scene graph (`this.scene.add(this.camera)` is missing in `GameManager.js`), causing the player's 3D first-person arm and weapon mesh to be completely invisible.
2. **Instant Breaking Flaw**: Block breaking does not honor hardness or tools. Clicking instantly deletes any block—including Obsidian—in 1 frame with no hold-to-mine progress, no crack overlay textures, and no repetitive hit feedback.
3. **Missing Ores & Damage Textures**: While wools and basic blocks exist, ore textures (Iron, Gold, Diamond, Emerald ores) and breaking crack stage textures (stages 0–9) are completely missing.
4. **Particle Color Inaccuracy**: All standard blocks break into generic gray particles (`0x94a3b8`) instead of the block's true material color (red wool, blue wool, oak wood, end stone, obsidian).
5. **Architectural Scaling Bottleneck**: Any block addition or deletion triggers a global `rebuildMeshes()` across the entire world, reallocating geometries and instance matrices for all islands without spatial chunking.

Below is the exhaustive technical investigation across the 5 assigned areas.

---

## 1. Engine & Dependency Inspection

### 1.1 Dependencies (`package.json`)
- **`three` (`^0.170.0`)**: Used for all 3D WebGL rendering, instanced meshes (`THREE.InstancedMesh`), lighting (`THREE.DirectionalLight`, `THREE.AmbientLight`, `THREE.HemisphereLight`), shadows (`PCFSoftShadowMap`), and cameras.
- **`peerjs` (`^1.5.4`)**: Used for serverless WebRTC peer-to-peer room connections.
- **`vite` (`^6.0.0`)**: Build tool and dev server. Production build verified clean (`npm run build` completed in ~5.4s, generating `dist/assets/index-BNNvxALt.js` ~626 kB).
- **Audio**: Zero-dependency procedural synthesis via browser `AudioContext` in `src/engine/SoundManager.js`.
- **Static Assets**: Directory `public/` contains only `favicon.svg`. All block and UI textures are procedurally generated at runtime.

### 1.2 Core Engine Modules
| File | Responsibility | Engine Role |
|---|---|---|
| `src/engine/VoxelWorld.js` | Voxel data storage (`Map`), exposed face checking, instanced rendering, raycasting | Core Voxel Engine |
| `src/engine/TextureGenerator.js` | Procedural 16x16 pixel-art canvas generator with `NearestFilter` | Texture Pipeline |
| `src/engine/Physics.js` | AABB axis-separated bounding box collision, gravity, friction, knockback | Physics Subsystem |
| `src/engine/SoundManager.js` | Web Audio API synthesizer for footsteps, hits, breaks, pickups, bed explosions | Sound Engine |
| `src/engine/ParticleSystem.js` | Dynamic 3D voxel debris cubes with gravity and life decay | Particle Feedback |
| `src/entities/Player.js` & `LocalPlayer.js` | Inventory, hotbar, health, mouse look (yaw/pitch), arm swing | Player Mechanics |
| `src/game/GameManager.js` | Central loop, Three.js scene, camera, renderer, interaction dispatch | Game Orchestration |

---

## 2. Rendering Bugs, Camera Clipping & Geometry Gaps

### 2.1 Bug 1: Invisible First-Person Player Arm & Weapon
- **Location**: `src/game/GameManager.js:23-28` vs `src/entities/LocalPlayer.js:45`
- **Observation**:
  `LocalPlayer.js` line 45 calls:
  ```javascript
  this.camera.add(this.armGroup);
  ```
  However, in `GameManager.js` constructor (lines 23-27):
  ```javascript
  this.scene = new THREE.Scene();
  this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);
  // Missing: this.scene.add(this.camera);
  ```
- **Consequence**: In Three.js, when `renderer.render(scene, camera)` traverses the scene graph, any object attached to a camera is **NOT rendered** unless the camera itself is an active node within `scene.children`. As a result, the player's arm and weapon swing animation are completely invisible.
- **Fix Required**: Call `this.scene.add(this.camera);` during `GameManager` initialization.

### 2.2 Bug 2: Camera Near-Plane Clipping on Adjacent Voxels
- **Location**: `src/game/GameManager.js:27`
- **Observation**:
  ```javascript
  this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);
  ```
  The player's bounding box half-width is `0.3` (`Physics.js:23`), and the eye position is at the center of the entity. When the player hugs a wall or jumps against a corner, the eye-to-wall distance drops below `0.1` units.
- **Consequence**: The camera near plane clips through adjacent voxel faces, causing the interior of blocks to appear hollow and revealing the void/skybox behind them.
- **Fix Required**: Reduce camera near-plane from `0.1` to `0.05` or `0.03`.

### 2.3 Bug 3: Global Meshing Freezes & Absence of Chunking
- **Location**: `src/engine/VoxelWorld.js:185-234`
- **Observation**:
  In `VoxelWorld.js`:
  ```javascript
  setBlock(x, y, z, type, data = null) {
    ...
    this.isDirty = true;
  }
  ```
  And in `rebuildMeshes()`:
  ```javascript
  for (const mesh of this.instancedMeshes.values()) {
    this.voxelGroup.remove(mesh);
    mesh.geometry.dispose();
  }
  this.instancedMeshes.clear();
  ```
  When ANY single block is placed or broken, `rebuildMeshes()` iterates through EVERY block in the entire world, filters all exposed blocks, allocates brand new `BoxGeometry` and `InstancedMesh` instances, updates every matrix, and uploads them to the GPU.
- **Consequence**: On maps with multiple islands (thousands of blocks), every block placement or breaking triggers a visible frame stutter. In multiplayer or fast-bridging scenarios, this causes hitching.
- **Fix Required**: Implement a localized chunking structure (e.g. 16x16 column chunks or island-based chunks) so placing or mining a block only updates the instance matrices of the affected chunk.

### 2.4 Missing Geometry: Selection Highlight Wireframe
- **Observation**: There is currently no visual bounding box indicating which block the crosshair is targeted on.
- **Consequence**: Players cannot see which block face is selected before right-clicking to place or left-clicking to mine, leading to misaligned bridges.
- **Fix Required**: Introduce a dynamic selection outline mesh (`THREE.LineSegments` over `THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002))`) positioned at `hit.blockPos`.

### 2.5 Inaccurate Bed Geometry & Collision Hitbox
- **Location**: `src/engine/VoxelWorld.js:31-32, 61-62`, `src/game/MapPresets.js:125-128`
- **Observation**: Beds are represented as two full 1.0 x 1.0 x 1.0 unit cubes (`BED_HEAD` and `BED_FOOT`).
- **Consequence**: Beds render as full 1-meter high monoliths, and players cannot jump over or step over them smoothly like real Minecraft/Bedwars beds (which are 0.5625 blocks high).

---

## 3. Texture Pipeline & Voxel Texture Assessment

### 3.1 Current Pipeline Architecture
- Located in `src/engine/TextureGenerator.js`.
- Textures are generated on 16x16 HTML5 `<canvas>` elements using procedural drawing routines, converted into `THREE.CanvasTexture(canvas)`.
- Correct retro sampling properties are configured:
  ```javascript
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  ```
- Cached by composite key `${blockType}_${face}`.

### 3.2 Texture Inventory: Existing vs. Missing for R1
| Texture / Material | Current Status | Assessment & Required Changes |
|---|---|---|
| **Wool (8 Team Colors)** | ✅ Implemented | Red, Blue, Green, Yellow, Aqua, Pink, Gray, White. Uses 2x2 knitted weave. Visually authentic. |
| **Oak Wood Planks** | ✅ Implemented | Horizontal plank lines with grain variations. |
| **Stone** | ✅ Implemented | Gray stipple pattern. Authentic. |
| **End Stone** | ✅ Implemented | Pale yellow stipple pattern. Authentic. |
| **Obsidian** | ✅ Implemented | Dark violet and black crystalline stipple. Authentic. |
| **Glass** | ✅ Implemented | Semi-transparent light-cyan with border and glare reflections. Authentic. |
| **Lucky Block** | ✅ Implemented | Amber base with '?' question mark. Emissive glow in `VoxelWorld`. Authentic. |
| **Gem Blocks** | ✅ Implemented | Solid Diamond, Emerald, Gold, Iron blocks with beveled crystal borders. |
| **Iron Ore** | ❌ **MISSING** | Required for R1 acceptance criteria. Stone base with beige/tan iron ore flecks. |
| **Gold Ore** | ❌ **MISSING** | Required for R1 acceptance criteria. Stone base with sparkling yellow gold clusters. |
| **Diamond Ore** | ❌ **MISSING** | Required for R1 acceptance criteria. Stone base with vibrant cyan diamond flecks. |
| **Emerald Ore** | ❌ **MISSING** | Required for R1 acceptance criteria. Stone base with vivid green emerald flecks. |
| **Break Crack Stages (0–9)** | ❌ **MISSING** | Required for progressive block destruction. 10 stages of escalating black crack meshes. |

---

## 4. Block Interaction Inspection

### 4.1 Raycasting & Face Detection
- **Current Code**: `src/engine/VoxelWorld.js:243-287`
- **Method**: Fixed-step raymarch:
  ```javascript
  let t = 0;
  const step = 0.05;
  while (t < maxDistance) {
    current.copy(origin).addScaledVector(direction, t);
    ...
  }
  ```
- **Normal Calculation**:
  ```javascript
  const normal = new THREE.Vector3(prevX - bx, prevY - by, prevZ - bz);
  if (normal.lengthSq() > 1) {
    if (Math.abs(normal.x) >= Math.abs(normal.y) && Math.abs(normal.x) >= Math.abs(normal.z)) normal.set(Math.sign(normal.x), 0, 0);
    else if (Math.abs(normal.y) >= Math.abs(normal.x) && Math.abs(normal.y) >= Math.abs(normal.z)) normal.set(0, Math.sign(normal.y), 0);
    else normal.set(0, 0, Math.sign(normal.z));
  }
  ```
- **Evaluation**: While this usually detects the face, crossing diagonal boundaries with a fixed step of 0.05 can cause `prevX`, `prevY`, and `prevZ` to change simultaneously, occasionally picking the wrong normal. A standard **Amanatides-Woo Fast Voxel DDA** algorithm guarantees exact boundary intersection and 100% accurate normal vector calculation without step size artifacts.

### 4.2 Grid-Aligned Placement
- **Location**: `src/game/GameManager.js:200-218`
- **Mechanism**:
  Placement position is computed via `hit.placePos = { x: bx + normal.x, y: by + normal.y, z: bz + normal.z }`.
  Collision test:
  ```javascript
  const playerBox = new THREE.Box3(
    new THREE.Vector3(this.localPlayer.position.x - 0.3, this.localPlayer.position.y, this.localPlayer.position.z - 0.3),
    new THREE.Vector3(this.localPlayer.position.x + 0.3, this.localPlayer.position.y + 1.8, this.localPlayer.position.z + 0.3)
  );
  const blockBox = new THREE.Box3(new THREE.Vector3(x, y, z), new THREE.Vector3(x + 1, y + 1, z + 1));
  if (!playerBox.intersectsBox(blockBox)) {
    this.world.setBlock(x, y, z, item.blockType);
    ...
  }
  ```
- **Gaps**:
  1. Only checks intersection with `localPlayer`. If a bot or other multiplayer player is standing at `hit.placePos`, the block is placed directly inside them, causing clipping and physics glitches.
  2. In Studio Editor mode (`StudioEditor.js`), placement does not check player intersection at all.

### 4.3 Block Breaking Times & Hardness Rules
- **Location**: `src/game/GameManager.js:150-181` vs `src/engine/VoxelWorld.js:36-64`
- **Critical Finding**:
  In `VoxelWorld.js`, `BLOCK_PROPS` defines realistic hardness values:
  - Bedrock: `99999` (unbreakable)
  - Obsidian: `12.0` (requires diamond pickaxe)
  - End Stone: `3.0`
  - Wood: `2.0`
  - Stone: `1.5`
  - Wool: `0.8` (shears)
  - Bed: `1.2`
  - Lucky Block: `0.6`
  - Glass: `0.3`
  
  **HOWEVER**, in `GameManager.js:handleLeftClick()`:
  ```javascript
  // Regular block destruction
  this.world.setBlock(x, y, z, BLOCK_TYPES.AIR);
  this.world.rebuildMeshes();
  if (this.sound) this.sound.playBlockBreak();
  this.particles.spawnBlockBreak({ x, y, z }, 0x94a3b8, 10);
  ```
  Every block is destroyed instantly in a **single mouse click**!
  Holding down left-click does nothing because breaking is wired only to the `mousedown` event.
  The player can destroy Obsidian bed defense in 0.05 seconds with bare hands, completely bypassing Hypixel Bedwars tactical meta (where Obsidian takes 4 seconds with a diamond pickaxe and is virtually unbreakable with fist).

### 4.4 Breaking Progress, Animation & Sound Feedback
- **Breaking Animation**: None exists. No crack overlay mesh, no crack texture progress.
- **Sound Feedback**:
  `SoundManager.js:43` defines `playBlockHit()`, but it is **never invoked during mining**. Only `playBlockBreak()` is invoked when the block vanishes.
  In Minecraft/Hypixel, striking a block emits repetitive hit clicks at ~0.2s intervals until breaking completes.
- **Particle Feedback**:
  In `GameManager.js:179`:
  All regular blocks spawn particles with hardcoded color `0x94a3b8` (slate gray)!
  Red wool, green wool, oak wood, end stone, and obsidian all emit slate gray particles.
  Particles should sample the block's true palette.

### 4.5 Audio Glitch: Resource Pickup Sound Not Playing
- **Location**: `src/game/GeneratorManager.js:101`
  ```javascript
  if (p.isLocalPlayer && this.sound) {
    this.sound.playItemPickup();
  }
  ```
  In `Player.js:9`, the property is named `this.isLocal` (not `isLocalPlayer`).
  Therefore, picking up floating iron, gold, diamonds, and emeralds never plays `playItemPickup()`.

---

## 5. Comprehensive Gap Analysis & Technical Roadmap for R1

To achieve full compliance with **R1 (Voxel Engine, Textures, and Block Mechanics)** and satisfy all acceptance criteria, the following components must be built/refactored:

### 5.1 Required New Features & Architectural Fixes

```
┌────────────────────────────────────────────────────────────────────────┐
│                          R1 IMPLEMENTATION PLAN                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Engine & Rendering Fixes                                            │
│    ├── GameManager.js: Add this.scene.add(this.camera)                 │
│    ├── GameManager.js: Set camera.near = 0.05 (eliminate clipping)     │
│    ├── GeneratorManager.js: Fix p.isLocal check for pickup sound       │
│    ├── VoxelWorld.js: Implement Amanatides-Woo Fast Voxel DDA          │
│    └── VoxelWorld.js: Implement Selection Highlight wireframe box      │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Textures & Visual Polish                                            │
│    ├── TextureGenerator.js: Add procedural 16x16 Ores                  │
│    │   ├── Iron Ore (stone + tan/metallic flecks)                      │
│    │   ├── Gold Ore (stone + golden yellow flecks)                     │
│    │   ├── Diamond Ore (stone + cyan crystal flecks)                   │
│    │   └── Emerald Ore (stone + vivid green flecks)                    │
│    ├── TextureGenerator.js: Add 10 Break Crack stage textures (0 to 9) │
│    └── VoxelWorld.js / GameManager: Add Crack Overlay Box Mesh         │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Minecraft/Hypixel-Authentic Block Mining Subsystem                  │
│    ├── Continuous mousedown tracking (hold left click to mine)         │
│    ├── Target lock: reset progress if player looks away or walks away  │
│    ├── Block Hardness & Tool Multipliers:                              │
│    │   ├── Wool: Hand (0.75s) vs Shears (0.15s - near instant)         │
│    │   ├── Wood: Hand (3.0s) vs Axe (0.75s)                            │
│    │   ├── Stone: Hand (7.5s) vs Wooden Pick (1.15s) vs Iron Pick (0.6s)│
│    │   ├── End Stone: Hand (15.0s) vs Iron Pick (1.0s)                 │
│    │   └── Obsidian: Hand (250s - impossible) vs Dia Pick (4.0s)       │
│    ├── Mining progress tick: updates crack texture stage (0..9)        │
│    ├── Periodic block hit audio loop (playBlockHit every 0.2s)         │
│    └── Block break completion: colored particle bursts + break sound   │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Grid Placement & Multi-Entity Collision                             │
│    └── Validate placement AABB against all active players & bots       │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Block Hardness & Tool Multipliers Table (Hypixel Bedwars Standard)

| Block Type | Hardness | Best Tool | Hand Break Time | Appropriate Tool Break Time |
|---|---|---|---|---|
| **Wool (All colors)** | 0.8 | Shears | ~0.75 s | **0.15 s** (Instant with permanent shears) |
| **Oak Wood Planks** | 2.0 | Axe | ~3.0 s | **0.75 s** (with Axe) |
| **Stone** | 1.5 | Pickaxe | ~7.5 s | **0.6 s** (Iron Pick) |
| **End Stone** | 3.0 | Pickaxe | ~15.0 s | **1.0 s** (Iron/Diamond Pick) |
| **Obsidian** | 12.0 | Diamond Pickaxe | ~250 s (unbreakable) | **4.0 s** (Diamond Pickaxe) |
| **Glass** | 0.3 | Any | ~0.4 s | **0.4 s** |
| **Lucky Block** | 0.6 | Any / Pickaxe | ~0.6 s | **0.25 s** |
| **Iron/Gold/Dia/Eme Ore**| 3.0 | Pickaxe | ~15.0 s | **0.8 s** (Iron Pick) |
| **Bed Head / Foot** | 1.2 | Any / Shears | ~1.5 s | **0.3 s** (Shears/Axe) |

---

## 6. Verification and Validation Guidelines

1. **Build Validation**:
   - Run `cd C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars; npm run build` to verify zero compile or bundling errors.
2. **Visual Inspection**:
   - Verify local player's first-person hand and held sword are visible on screen.
   - Verify camera near clipping does not leak voids when walking into walls.
   - Verify the block targeted by crosshair renders a clear selection outline box.
   - Verify ores (Iron, Gold, Diamond, Emerald) render in the engine with authentic pixel art.
3. **Mining Mechanics Verification**:
   - Holding left click on Wool with Shears breaks it almost instantly (~0.15s) with wool-colored particles.
   - Holding left click on Obsidian with bare hand does NOT instantly delete it; requiring a Diamond Pickaxe for ~4 seconds.
   - During mining, crack stage progresses from 0 to 9 on the block face.
   - Continuous striking emits `playBlockHit()` audio every 0.2s.
   - Item pickup plays the synthesized pickup chime.
