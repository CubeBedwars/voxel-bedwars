# HUD, UI & Gameplay Survey & Architecture Specification

**Milestone**: Minecraft-Fidelity Overhaul — HUD, UI, Held Items & Gameplay Visuals (Gen 4)  
**Author**: explorer_survey_ui_gen4  
**Date**: 2026-11-08  
**Scope**: `src/ui/HUD.js`, `src/style.css`, `index.html`, `src/entities/LocalPlayer.js`, `src/engine/HeldItemRenderer.js`, `src/game/GeneratorManager.js`, `src/game/ShopManager.js`, `src/game/GameManager.js`

---

## 1. Observation

### 1.1 Existing HUD & UI Implementation (`src/ui/HUD.js`, `src/style.css`, `index.html`)
- **Health Hearts**:
  In `src/ui/HUD.js` lines 133-147:
  ```javascript
  const fullHearts = Math.floor(localPlayer.health / 2);
  const halfHeart = localPlayer.health % 2 >= 1;
  let heartsHtml = '';
  for (let i = 0; i < 10; i++) {
    if (i < fullHearts) {
      heartsHtml += '<span class="heart full" title="Full Heart">❤️</span>';
    } else if (i === fullHearts && halfHeart) {
      heartsHtml += '<span class="heart half" title="Half Heart">💔</span>';
    } else {
      heartsHtml += '<span class="heart empty" title="Empty Heart">🖤</span>';
    }
  }
  this.healthHeartsEl.innerHTML = heartsHtml;
  ```
  Health is currently rendered using Unicode emojis (`❤️`, `💔`, `🖤`). It does not support golden absorption hearts from golden apples, nor authentic Minecraft heart textures.
- **Armor Bar**:
  In `index.html` lines 85-88:
  ```html
  <div class="armor-badge">
    <span class="armor-icon">🛡️</span>
    <span id="armor-name">NONE</span>
  </div>
  ```
  And in `src/ui/HUD.js` line 151:
  ```javascript
  this.armorNameEl.innerText = (localPlayer.armor?.tier || 'None').toUpperCase();
  ```
  There is NO 10-icon armor chestplate bar above the health hearts. It is only a text badge displaying `NONE`, `CHAINMAIL`, `IRON`, or `DIAMOND`.
- **Hunger Bar**:
  There is NO hunger drumstick element in `index.html` or `HUD.js`.
- **XP / Level Bar**:
  Currently, player level and XP are only displayed on the main menu portal card (`#portal-profile-card`). The in-game HUD has no centered green XP bar with level numeral.
- **Hotbar**:
  In `index.html` line 92:
  ```html
  <div id="hotbar" class="hotbar-container glass-card"></div>
  ```
  In `src/style.css` lines 227-273, the hotbar is styled as modern translucent glass cards (`.glass-card`, `background: rgba(0, 0, 0, 0.4)`), lacking authentic Minecraft hotbar textures (`hotbar.png`, `selected item hotbar.png`), stack counts, and the bloxd.io `[B] Quick Shop` shortcut button.
- **Crosshair & Hitmarker**:
  In `index.html` lines 20-26:
  ```html
  <div id="crosshair" class="hidden">
    <div class="ch-center"></div>
    <div class="ch-line ch-top"></div>
    <div class="ch-line ch-bottom"></div>
    <div class="ch-line ch-left"></div>
    <div class="ch-line ch-right"></div>
  </div>
  ```
  There is NO hitmarker animation expanding on attack hits. In `GameManager.js` lines 206-227, attack hits spawn hit sparks and play hit sound, but do not trigger any HUD hitmarker animation.
- **Scoreboard**:
  In `src/ui/HUD.js` lines 173-230, the scoreboard displays `VOXEL BEDWARS`, mode badge, team beds (`✓` / `✗` / `☠`), kills, finals, beds broken, rating, level, and match timer. However, it lacks:
  - Bed Wars header format with date and server IP (`cubebedwars.com`)
  - Map name (e.g. `Map: Speedway`)
  - Active mutation status (e.g. `Mutation: Supercharged`)
  - Event timers (e.g. `Diamond II in 03:45`, `Emerald II in 07:20`, `Bed Destruction in 18:00`)
  - Team format colors and player count when bed broken (e.g. `R Red: [V]`, `B Blue: 2`).

### 1.2 First-Person Held Item (`src/entities/LocalPlayer.js`)
- In `src/entities/LocalPlayer.js` lines 41-51:
  ```javascript
  createArmMesh() {
    this.armGroup = new THREE.Group();
    // Voxel sword / arm mesh
    const armGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
    const armMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(0.35, -0.3, -0.6);
    arm.rotation.set(0.4, -0.2, 0.1);
    this.armGroup.add(arm);
    this.camera.add(this.armGroup);
  }
  ```
  The held item is currently a static red box mesh (`BoxGeometry(0.18, 0.5, 0.18)` with `color: 0xef4444`). It does not update when switching hotbar slots, does not render 3D item models, and lacks enchantment glint shaders.
- In `LocalPlayer.js` lines 172-182:
  ```javascript
  if (this.isSwinging) {
    this.swingProgress += dt * 8.0;
    if (this.swingProgress >= Math.PI) {
      this.isSwinging = false;
      this.swingProgress = 0;
      this.armGroup.rotation.set(0, 0, 0);
    } else {
      this.armGroup.rotation.x = Math.sin(this.swingProgress) * 0.8;
      this.armGroup.rotation.y = -Math.sin(this.swingProgress) * 0.4;
    }
  }
  ```
  The swing animation is an elementary rotation on x and y that resets abruptly.

### 1.3 Floating Holograms & Resource Spawners (`src/game/GeneratorManager.js`)
- In `src/game/GeneratorManager.js` lines 11-23:
  ```javascript
  this.dropGeos = {
    iron: new THREE.BoxGeometry(0.3, 0.15, 0.5),
    gold: new THREE.BoxGeometry(0.3, 0.15, 0.5),
    diamond: new THREE.OctahedronGeometry(0.25),
    emerald: new THREE.OctahedronGeometry(0.25),
  };
  ```
  Drops are standard Three.js geometric primitives.
- There are NO floating billboard text holograms above generators displaying generator type and countdown timers.

### 1.4 Shopkeeper & Upgrades Modal (`src/ui/HUD.js`, `src/game/ShopManager.js`, `src/style.css`)
- In `src/ui/HUD.js` lines 280-309 and `src/style.css` lines 339-350:
  The shop items are listed in a single flat grid without category tabs (Blocks, Combat, Utility, Recommended).
  The theme is cyber glassmorphic with cyan borders, rather than authentic Minecraft dark-slate inventory aesthetics.

### 1.5 Authentic Minecraft Assets in `scratch_minecraft_ref`
- Inspected `scratch_minecraft_ref/project.json`:
  - Authentic GUI assets found: `heart_back` (`b960ba95ab8d4ce3717ec7327eb140cf.png`), `heart_full` (`9be0c5fcffa1f8ba165932b5916c48af.png`), `heart_half` (`5c0f3e3009c85fb58d41a6c5ae257dc8.png`), `heart_flash` (`0fae3d7a07234aa898f70eedb4338633.png`), `food_back` (`5dd84efd2c522fb7a6c142b1e01603de.png`), `food_full` (`744128714b211de093859c971dcc93a8.png`), `food_half` (`c3c005475d9ce37092a2ec18fdbdba27.png`), `food_flash` (`b351eb625932e8e71d119b373b0e770e.png`), `hotbar` (`0d79497ab8f00ed10ef7f5d675241173.png`), `selected item hotbar` (`3676dcca0b16796069d375678c9a478f.png`), `crosshair` (`f531e65f2fe2c07b0bea73105ef39943.svg`).
  - Items found: `item_wooden_sword`, `item_stone_sword`, `item_iron_sword`, `item_diamond_sword`, `item_golden_sword`, `item_shears`, `item_iron_pickaxe`, `item_diamond_pickaxe`, `item_golden_apple`, `item_ender_pearl`, `fireball`.
  - 16 Enchantment glint frames: `glow_sword_0..15`, `glow_chestplate_0..15`, `glow_bow_0..15`, `glow_apple_0..15`.

### 1.6 Baseline Test Suite
- Ran command: `cd C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars; node tests/e2e-runner.js`
- Result: **288 / 288 tests passed (0 failures, 100% integrity)** across all 4 tiers.

---

## 2. Logic Chain

1. **HUD Vitals Separation & Authentic Layout**:
   - Observations 1.1 and 1.5 reveal that the current HUD uses emojis and is missing armor icons, hunger drumsticks, and the centered XP bar.
   - The user reference image and Bedwars standards dictate a 2-tier vitals arrangement directly above the hotbar:
     - Top row: 10 Armor chestplates on the left; 10 Hunger drumsticks on the right.
     - Bottom row: 10 Health hearts (+ absorption golden hearts) on the left.
     - Center strip: Green XP bar with bold level numeral.
   - The 10 armor icons must compute from the equipped armor tier:
     - `none`: 0 defense points (0 chestplates) -> hidden.
     - `chainmail`: 12 defense points (6 full chestplates, 4 empty).
     - `iron`: 15 defense points (7 full chestplates, 1 half chestplate, 2 empty).
     - `diamond`: 20 defense points (10 full chestplates).
   - Absorption hearts: Consuming a Golden Apple grants 4 absorption HP (2 golden hearts), which render as golden heart icons following or overlying standard hearts with a 30s timer.

2. **Hotbar, Quick Shop & Crosshair Hitmarkers**:
   - Observation 1.1 shows the hotbar is styled with generic glassmorphism and lacks the `[B] Quick Shop` shortcut.
   - In bloxd.io Bedwars, players rely on the `[B]` key shortcut to instantly open the shop when at base, streamlining gameplay.
   - In competitive Bedwars, hitting an enemy must trigger a 4-tick hitmarker crosshair animation (`✕` tick marks at 45° angles) expanding outward and fading over 180ms. Binding this to `GameManager.handleLeftClick()` when an entity attack connects (Observation 1.1) provides immediate tactile feedback.

3. **Sidebar Scoreboard Event Engine**:
   - Observation 1.1 indicates that match events are not tracked in the scoreboard.
   - Global Bedwars matches run on a strict event timeline:
     - 00:00–04:00: Diamond II
     - 04:00–08:00: Emerald II
     - 08:00–12:00: Diamond III
     - 12:00–16:00: Emerald III
     - 16:00–20:00: Bed Destruction
     - 20:00–25:00: Sudden Death (Dragons / Arena Decay)
     - 25:00+: Game End
   - The scoreboard must format the next upcoming event countdown (`Diamond II in 03:24`) and update team bed statuses with Hypixel colors and living player counts.

4. **3D Held Item Architecture (`HeldItemRenderer.js`)**:
   - Observation 1.2 shows that `LocalPlayer.js` has a hard-coded red box mesh attached to the camera.
   - Decoupling held item rendering into a dedicated `HeldItemRenderer` class enables:
     - Clean mesh swapping when the active hotbar slot changes.
     - 3D extruded voxel meshes for swords, pickaxes, shears, and miniature 3D blocks for wool/wood.
     - Realistic walking bobbing and a 220ms authentic downward Minecraft attack swing curve.
     - A custom GLSL shader that projects a scrolling purple additive glint (`vec3(0.68, 0.25, 0.98)`) over the item texture for enchanted equipment (Team Sharpness, Diamond weapons/armor).

5. **3D Floating Spawner Holograms**:
   - Observation 1.3 shows that spawners currently lack floating billboard titles and countdown timers.
   - Using Three.js `THREE.Sprite` with dynamic 2D canvas textures allows self-orienting billboard holograms that render above forges and diamond/emerald generators, displaying generator name, level, and countdown to next drop (`Spawns in 03s`).
   - Upgrading drop meshes to authentic 3D voxel ingots and faceted gems enhances visual fidelity to bloxd.io standards.

6. **Minecraft Dark-Slate Shopkeeper GUI**:
   - Observation 1.4 shows the shop is an unorganized flat grid in cyan cyber style.
   - Restructuring the shop into categorized tabs:
     - `Recommended` (Wool, Stone Sword, Chainmail, Shears, Iron Pickaxe, Golden Apple, Fireball)
     - `Blocks` (Wool, Oak Planks, Baked Clay, Stone Bricks, Obsidian, Ladder)
     - `Combat` (Swords, Armor upgrades, Bows, Crossbow, Fireballs)
     - `Utility` (Pickaxes, Axes, Shears, Water Bucket, Golden Apples, Ender Pearls)
   - Styling with Minecraft dark-slate container borders (`#373737` bevels, `#23272a` container background) delivers the authentic Hypixel/bloxd.io aesthetic.

---

## 3. Detailed Architectural Blueprint

### Component 1: Hypixel Bedwars HUD DOM & Layout
**Target Files**: `index.html`, `src/style.css`, `src/ui/HUD.js`

#### 1.1 DOM Structure (`index.html`)
```html
<!-- Inside #hud container -->
<div class="hud-bottom-center">
  <!-- Top Vitals Row: Armor (Left) & Hunger (Right) -->
  <div class="hud-vitals-row">
    <div id="armor-bar" class="vitals-bar armor-bar"></div>
    <div id="hunger-bar" class="vitals-bar hunger-bar"></div>
  </div>

  <!-- Bottom Vitals Row: Health Hearts (Left) & Absorption Hearts -->
  <div class="hud-vitals-row">
    <div id="health-hearts" class="vitals-bar hearts-bar"></div>
    <div id="air-bubbles" class="vitals-bar air-bar"></div>
  </div>

  <!-- Centered Green XP Bar with Level Numeral -->
  <div class="hud-xp-container">
    <div id="hud-xp-level" class="hud-xp-level">1</div>
    <div class="hud-xp-track">
      <div id="hud-xp-fill" class="hud-xp-fill" style="width: 0%;"></div>
    </div>
  </div>

  <!-- 9-Slot Centered Hotbar with [B] Quick Shop -->
  <div class="hud-hotbar-wrapper">
    <div id="hotbar" class="mc-hotbar"></div>
    <button id="btn-quick-shop" class="btn-quick-shop" title="Open Shop [B]">
      <span class="key-shortcut">[B]</span>
      <span class="label">SHOP</span>
    </button>
  </div>
</div>
```

#### 1.2 Armor Bar Rendering Logic (`HUD.js`)
```javascript
updateArmor(player) {
  if (!this.armorBarEl) return;
  const defensePoints = player.getArmorDefensePoints ? player.getArmorDefensePoints() : 0;
  if (defensePoints <= 0) {
    this.armorBarEl.innerHTML = '';
    return;
  }
  const fullIcons = Math.floor(defensePoints / 2);
  const halfIcon = (defensePoints % 2) >= 1;
  let html = '';
  for (let i = 0; i < 10; i++) {
    if (i < fullIcons) {
      html += '<span class="mc-icon armor-full"></span>';
    } else if (i === fullIcons && halfIcon) {
      html += '<span class="mc-icon armor-half"></span>';
    } else {
      html += '<span class="mc-icon armor-empty"></span>';
    }
  }
  this.armorBarEl.innerHTML = html;
}
```

#### 1.3 Health & Absorption Hearts Rendering Logic (`HUD.js`)
```javascript
updateHealth(player) {
  if (!this.healthHeartsEl) return;
  const hp = Math.max(0, player.health);
  const fullHearts = Math.floor(hp / 2);
  const halfHeart = (hp % 2) >= 1;
  let html = '';

  // 10 Base Health Hearts
  for (let i = 0; i < 10; i++) {
    if (i < fullHearts) {
      html += '<span class="heart full mc-heart-full"></span>';
    } else if (i === fullHearts && halfHeart) {
      html += '<span class="heart half mc-heart-half"></span>';
    } else {
      html += '<span class="heart empty mc-heart-empty"></span>';
    }
  }

  // Golden Absorption Hearts (from Golden Apples)
  const absorbHp = player.absorptionHealth || 0;
  if (absorbHp > 0) {
    const fullAbsorb = Math.floor(absorbHp / 2);
    const halfAbsorb = (absorbHp % 2) >= 1;
    const absorbCount = Math.ceil(absorbHp / 2);
    for (let i = 0; i < absorbCount; i++) {
      if (i < fullAbsorb) {
        html += '<span class="heart absorb-full mc-heart-absorb-full"></span>';
      } else if (i === fullAbsorb && halfAbsorb) {
        html += '<span class="heart absorb-half mc-heart-absorb-half"></span>';
      }
    }
  }
  this.healthHeartsEl.innerHTML = html;
}
```

#### 1.4 Centered XP Bar & Level Numeral (`HUD.js`)
```javascript
updateXP(levelManager) {
  if (!levelManager) return;
  if (this.hudXpLevelEl) {
    this.hudXpLevelEl.innerText = levelManager.level;
  }
  if (this.hudXpFillEl) {
    const pct = Math.min(100, Math.max(0, (levelManager.xp / levelManager.xpRequired) * 100));
    this.hudXpFillEl.style.width = `${pct}%`;
  }
}
```

#### 1.5 4-Tick Hitmarker Animation (`HUD.js` & `src/style.css`)
```html
<div id="crosshair" class="hidden">
  <div class="ch-cross"></div>
  <div id="hitmarker" class="hitmarker hidden">
    <div class="hm-tick hm-tl"></div>
    <div class="hm-tick hm-tr"></div>
    <div class="hm-tick hm-bl"></div>
    <div class="hm-tick hm-br"></div>
  </div>
</div>
```
In `HUD.js`:
```javascript
triggerHitmarker() {
  const hm = document.getElementById('hitmarker');
  if (!hm) return;
  hm.classList.remove('hidden', 'hit-active');
  void hm.offsetWidth; // force DOM reflow
  hm.classList.add('hit-active');
  setTimeout(() => {
    hm.classList.add('hidden');
    hm.classList.remove('hit-active');
  }, 180);
}
```
In `src/style.css`:
```css
.hitmarker {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.hm-tick {
  position: absolute;
  width: 6px;
  height: 2px;
  background: #ffffff;
  box-shadow: 0 0 3px #000000;
  transition: transform 0.15s ease-out, opacity 0.18s ease;
}
.hm-tl { top: 3px; left: 3px; transform: rotate(-45deg); }
.hm-tr { top: 3px; right: 3px; transform: rotate(45deg); }
.hm-bl { bottom: 3px; left: 3px; transform: rotate(45deg); }
.hm-br { bottom: 3px; right: 3px; transform: rotate(-45deg); }

.hit-active .hm-tl { transform: translate(-3px, -3px) rotate(-45deg); }
.hit-active .hm-tr { transform: translate(3px, -3px) rotate(45deg); }
.hit-active .hm-bl { transform: translate(-3px, 3px) rotate(45deg); }
.hit-active .hm-br { transform: translate(3px, 3px) rotate(-45deg); }
```

#### 1.6 Authentic Hypixel Sidebar Scoreboard (`HUD.js`)
```javascript
updateScoreboard(localPlayer, teamManager, matchTime) {
  // 1. Next Event Calculation
  const events = [
    { name: 'Diamond II', time: 240 },
    { name: 'Emerald II', time: 480 },
    { name: 'Diamond III', time: 720 },
    { name: 'Emerald III', time: 960 },
    { name: 'Bed Destruction', time: 1200 },
    { name: 'Sudden Death', time: 1500 },
  ];
  let nextEventStr = 'Game End';
  for (const ev of events) {
    if (matchTime < ev.time) {
      const rem = Math.ceil(ev.time - matchTime);
      const m = Math.floor(rem / 60);
      const s = rem % 60;
      nextEventStr = `${ev.name} in ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      break;
    }
  }
  // Update event timer row
  if (this.sbEventTimerEl) this.sbEventTimerEl.innerText = nextEventStr;
}
```

---

### Component 2: 3D Held Item in Viewport (`HeldItemRenderer.js`)
**New Target File**: `src/engine/HeldItemRenderer.js`

#### 2.1 Class Structure & Lifecycle
```javascript
import * as THREE from 'three';

export class HeldItemRenderer {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;

    this.itemGroup = new THREE.Group();
    this.camera.add(this.itemGroup);

    // Default resting transform (bottom-right viewport)
    this.basePos = new THREE.Vector3(0.38, -0.32, -0.52);
    this.baseRot = new THREE.Euler(0.1, -0.35, 0.15, 'YXZ');
    this.itemGroup.position.copy(this.basePos);
    this.itemGroup.rotation.copy(this.baseRot);

    this.currentSlotItem = null;
    this.currentMesh = null;

    // Animation state
    this.swingTime = 0;
    this.isSwinging = false;
    this.swingDuration = 0.22; // 220ms

    this.equipProgress = 1.0;
    this.initGlintMaterial();
  }

  initGlintMaterial() {
    this.glintUniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xaa33ff) },
    };
    // Custom enchanted glint shader or injected chunks
  }

  setHeldItem(item, isEnchanted = false) {
    if (this.currentSlotItem?.id === item?.id && this.currentSlotItem?.blockType === item?.blockType) {
      return;
    }
    this.currentSlotItem = item;
    this.rebuildMesh(item, isEnchanted);
    this.equipProgress = 0.0; // trigger equip dip
  }

  triggerSwing() {
    this.isSwinging = true;
    this.swingTime = 0;
  }

  update(dt, player) {
    this.glintUniforms.uTime.value += dt;

    // Equip dip animation
    if (this.equipProgress < 1.0) {
      this.equipProgress = Math.min(1.0, this.equipProgress + dt * 6.0);
    }
    const equipDip = (1.0 - Math.sin(this.equipProgress * Math.PI * 0.5)) * -0.25;

    // Walking bobbing
    const walkCycle = player.walkCycle || 0;
    const isMoving = player.onGround && (Math.abs(player.velocity.x) > 0.1 || Math.abs(player.velocity.z) > 0.1);
    const bobX = isMoving ? Math.cos(walkCycle * 0.5) * 0.02 : 0;
    const bobY = isMoving ? Math.abs(Math.sin(walkCycle)) * 0.03 : Math.sin(Date.now() * 0.002) * 0.003;
    const bobRotZ = isMoving ? Math.cos(walkCycle * 0.5) * 0.03 : 0;

    // Downward Attack Swing Animation
    let swingRotX = 0, swingRotY = 0, swingRotZ = 0, swingPosY = 0;
    if (this.isSwinging) {
      this.swingTime += dt;
      const progress = Math.min(1.0, this.swingTime / this.swingDuration);
      if (progress >= 1.0) {
        this.isSwinging = false;
      }
      const swingCurve = Math.sin(progress * Math.PI);
      swingRotX = -swingCurve * 1.1; // downward slash
      swingRotY = -swingCurve * 0.5; // inward sweep
      swingRotZ = swingCurve * 0.4;
      swingPosY = -swingCurve * 0.12;
    }

    // Apply composite transforms
    this.itemGroup.position.set(
      this.basePos.x + bobX,
      this.basePos.y + bobY + equipDip + swingPosY,
      this.basePos.z
    );
    this.itemGroup.rotation.set(
      this.baseRot.x + swingRotX,
      this.baseRot.y + swingRotY,
      this.baseRot.z + bobRotZ + swingRotZ
    );
  }
}
```

#### 2.2 Enchantment Glint Shader
```glsl
// GLSL fragment shader chunk for purple scrolling sheen
uniform float uTime;
varying vec2 vUv;

void main() {
  vec4 baseColor = texture2D(map, vUv);
  if (baseColor.a < 0.1) discard;

  // Dual diagonal scrolling waves
  vec2 uv1 = vUv * 2.0 + vec2(uTime * 0.2, uTime * 0.2);
  vec2 uv2 = vUv * 1.5 - vec2(uTime * 0.14, -uTime * 0.14);
  float wave1 = sin(uv1.x * 10.0 + uv1.y * 10.0) * 0.5 + 0.5;
  float wave2 = cos(uv2.x * 8.0 - uv2.y * 8.0) * 0.5 + 0.5;
  float glint = pow(wave1 * wave2, 1.4) * 0.85;

  vec3 purpleGlint = vec3(0.68, 0.22, 0.95) * glint;
  gl_FragColor = vec4(baseColor.rgb + purpleGlint, baseColor.a);
}
```

---

### Component 3: 3D Floating Spawner Holograms
**Target File**: `src/game/GeneratorManager.js`

#### 3.1 Dynamic Canvas Billboard Sprite
```javascript
createHologramSprite(title, titleColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.4, 0.6, 1.0);

  return { sprite, canvas, ctx, texture, title, titleColor, lastSec: -1 };
}

updateHologram(holo, remainingSec) {
  const sec = Math.ceil(remainingSec);
  if (sec === holo.lastSec) return;
  holo.lastSec = sec;

  const { ctx, canvas, texture, title, titleColor } = holo;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background pill badge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.roundRect(8, 4, 240, 56, 10);
  ctx.fill();

  // Title text
  ctx.font = 'bold 20px "Outfit", sans-serif';
  ctx.fillStyle = titleColor;
  ctx.textAlign = 'center';
  ctx.fillText(title, 128, 28);

  // Countdown text
  ctx.font = '600 16px "Outfit", sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`Spawns in ${sec}s`, 128, 50);

  texture.needsUpdate = true;
}
```

---

### Component 4: Shopkeeper & Team Upgrade GUI
**Target Files**: `src/game/ShopManager.js`, `src/ui/HUD.js`, `src/style.css`

#### 4.1 Shop Categories Organization
1. **Recommended / Quick Buy**:
   - Team Wool (x16) — 4 Iron
   - Stone Sword — 10 Iron
   - Chainmail Armor — 24 Iron
   - Iron Pickaxe — 20 Iron
   - Permanent Shears — 20 Iron
   - Golden Apple — 3 Gold
   - Fireball — 40 Iron
2. **Blocks**:
   - Team Wool (x16) — 4 Iron
   - Oak Wood (x16) — 4 Gold
   - Baked Clay (x12) — 12 Iron
   - Stone Bricks (x12) — 24 Iron
   - Obsidian (x4) — 4 Emeralds
   - Ladders (x16) — 4 Iron
3. **Combat**:
   - Stone Sword — 10 Iron
   - Iron Sword — 7 Gold
   - Diamond Sword — 4 Emeralds
   - Stick of Knockback — 5 Gold
   - Chainmail Armor — 24 Iron
   - Iron Armor — 12 Gold
   - Diamond Armor — 6 Emeralds
   - Bow — 12 Gold
   - Crossbow — 24 Gold
   - Arrows (x8) — 2 Gold
   - Fireball — 40 Iron
4. **Utility**:
   - Permanent Shears — 20 Iron
   - Wooden / Stone / Iron Pickaxe — 10 / 20 Iron
   - Diamond Pickaxe — 6 Gold
   - Stone / Iron / Diamond Axe — 10 Iron / 3 Gold / 6 Gold
   - Water Bucket — 3 Gold
   - Golden Apple — 3 Gold
   - Ender Pearl — 4 Emeralds
   - TNT Explosive — 4 Gold

#### 4.2 Minecraft Dark-Slate CSS Specifications (`src/style.css`)
```css
/* Minecraft Dark-Slate Container Modal */
.mc-window {
  background: #23272a;
  border: 4px solid #1e1e24;
  border-top-color: #4f545c;
  border-left-color: #4f545c;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.8), inset 0 0 8px rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  color: #f8fafc;
  font-family: 'Outfit', monospace, sans-serif;
}

.mc-tab-bar {
  display: flex;
  gap: 4px;
  background: #18191c;
  padding: 6px;
  border-bottom: 2px solid #2f3136;
}

.mc-tab-btn {
  background: #2f3136;
  border: 2px solid #202225;
  border-top-color: #4f545c;
  border-left-color: #4f545c;
  color: #94a3b8;
  font-weight: 700;
  padding: 8px 14px;
  cursor: pointer;
  border-radius: 2px;
}

.mc-tab-btn.active {
  background: #3ba55d;
  color: #ffffff;
  border-color: #2d7d46;
}
```

---

## 4. Caveats
- No code modification has been made in this step (adhering strictly to Read-Only Explorer constraints).
- Audio assets and Minecraft textures are referenced from `C:\Users\alekhyo\.gemini\antigravity\scratch\scratch_minecraft_ref` and will be ingested into `public/assets/minecraft/` during the Asset Ingestion milestone.
- All existing tests in `tests/e2e-runner.js` mock the DOM via `tests/mocks/browser-shim.js`; adding elements with `.heart.full`, `.heart.half`, `.heart.empty` preserves 100% backward compatibility.

---

## 5. Conclusion
1. The architectural blueprint directly addresses all requirements of the Hypixel Bedwars HUD and bloxd.io in-game UI:
   - 10 Armor chestplate icons above hearts (dynamic defense points calculation).
   - 10 Health hearts + Golden absorption hearts.
   - 10 Hunger drumsticks.
   - Centered green XP bar with bold level numeral.
   - 9-Slot hotbar with active slot highlight and `[B] Quick Shop` shortcut.
   - Centered crosshair with 4-tick expanding hitmarker animation.
   - Right-side sidebar scoreboard with global event timers and team bed statuses.
2. The 3D held item system is architected into a dedicated `HeldItemRenderer.js` attached to the camera, supporting 3D item models, walking bob, a 220ms downward attack swing curve, and a custom animated purple scrolling enchantment glint shader.
3. Spawner floating holograms are architected via dynamic canvas billboard sprites that render generator titles and live countdown timers directly in 3D space.
4. The Shopkeeper and Upgrades GUIs are architected into a dark-slate Minecraft container theme with 4 structured categories (Blocks, Combat, Utility, Recommended).

---

## 6. Verification Method

### 6.1 Automated Verification Command
Run the grand test suite from project root:
```powershell
cd C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars
node tests/e2e-runner.js
```
**Expected Result**: All 288 tests in the 4-tier suite must pass with 0 failures.

### 6.2 Target Files for Implementers
1. `src/ui/HUD.js`
2. `src/style.css`
3. `index.html`
4. `src/entities/LocalPlayer.js`
5. `src/engine/HeldItemRenderer.js` (NEW)
6. `src/game/GeneratorManager.js`
7. `src/game/ShopManager.js`
8. `src/game/GameManager.js`
