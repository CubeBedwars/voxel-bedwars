# Handoff Report: Bedwars Shop & Economy System (Milestone 5)

**Agent**: `explorer_m5_gen4_shop` (Teamwork Explorer)  
**Date**: 2026-11-08  
**Objective**: Investigate the current Bedwars Shop and Economy system for Milestone 5, identify gaps compared to bloxd.io and Hypixel Bedwars, and provide concrete implementation blueprints for `worker_m5_gen4`.

---

## 1. Observation

### 1.1 `src/game/ShopManager.js`
- **Current Exported Catalogs**:
  - `SHOP_ITEMS` array containing 17 items (lines 3–183).
  - `TEAM_UPGRADES` array containing 7 upgrades (lines 185–242).
- **Categories in `SHOP_ITEMS`**:
  - Currently hardcoded to 5 categories: `'blocks'` (4 items), `'weapons'` (4 items), `'armor'` (3 items), `'tools'` (3 items), `'utility'` (3 items).
  - **Bloxd.io & Hypixel Bedwars Gaps**:
    1. No `recommended` (Quick Buy) category or tab.
    2. Categories do not match the standard 4-tab Bloxd/Hypixel taxonomy specified in `ORIGINAL_REQUEST.md` line 147: `Recommended`, `Blocks`, `Combat`, `Utility`.
    3. Missing essential items from bloxd.io & Hypixel:
       - **Blocks**: Baked Clay / Terracotta (16x for 12 Iron), Blast-Proof Glass (4x for 12 Iron — block type `BLOCK_TYPES.GLASS` already exists in `VoxelWorld.js:8` with `blastProof: true`), Ladders (8x or 16x for 4 Iron).
       - **Combat**: Standard Bow (12 Gold), Arrows (8x for 2 Gold), Crossbow (8 Gold / 2 Emeralds).
       - **Utility**: Wooden Pickaxe (10 Iron), Stone Pickaxe (10 Iron / 20 Iron), Wooden Axe (10 Iron), Iron Axe (20 Iron), Diamond Axe (6 Gold), Water Bucket (1 Emerald / 3 Gold), Teleportation Ender Pearl / Moonstone Orb (4 Emeralds).
- **Currency Costs**:
  - 4 currencies supported across items: `iron`, `gold`, `diamond`, `emerald`.
  - Costs adhere generally to Bedwars conventions (e.g. wool: 4 iron, stone sword: 10 iron, iron armor: 12 gold, diamond armor: 6 emerald, obsidian: 4 emerald).
- **Purchasing Flow & Inventory Checks**:
  - In `ShopManager.js`, each item defines `action(player)`.
  - `player.addItem(item)` in `src/entities/Player.js:90-108` returns `true` on success and `false` if all 9 hotbar slots are full.
  - However, in `src/ui/HUD.js:596-602`:
    ```javascript
    buyItem(item) {
      const player = this.gm.localPlayer;
      if (player.spendResource(item.costType, item.cost)) {
        item.action(player);
        if (this.gm.sound) this.gm.sound.playShopBuy();
        this.update(player, this.gm.teamManager, this.gm.matchTime);
      } else {
        alert(`Not enough ${item.costType.toUpperCase()}!`);
      }
    }
    ```
    `player.spendResource` is deducted **before** checking if `player.addItem` can accommodate the item. If the 9 hotbar slots are full, resources are spent without giving the player the item!
- **Team Upgrades**:
  - `TEAM_UPGRADES` in `ShopManager.js:185-242`:
    - `sharpness` (4 diamonds) -> `team.upgrades.sharpness = 1` (+1.25 damage in `Player.js:148`).
    - `protection_1` (2 diamonds) -> `team.upgrades.protection = 1` (-10% damage in `Player.js:176`).
    - `protection_2` (4 diamonds) -> `team.upgrades.protection = 2` (-20% damage in `Player.js:176`).
    - `forge_2` (2 diamonds) -> `team.upgrades.forgeTier = 1.5` (50% speedup).
    - `forge_3` (4 diamonds) -> `team.upgrades.forgeTier = 2.0` (100% speedup + emeralds).
    - `heal_pool` (1 diamond) -> `team.upgrades.healPool = true` (regen +1 HP/sec in `GameManager.js:948-967`).
    - `alarm_trap` (1 diamond) -> `team.upgrades.alarmTrap = true` (triggers alert in `GameManager.js:969-987`).

---

### 1.2 `src/ui/HUD.js` & `src/style.css`
- **Shop Modal DOM & Rendering**:
  - `index.html:226-238` defines the modal:
    ```html
    <div id="shop-modal" class="modal-backdrop hidden">
      <div class="shop-window glass-card">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="icon-shop">🛒</span>
            <h2>ITEM SHOPKEEPER</h2>
          </div>
          <button id="btn-close-shop" class="btn-close">✕</button>
        </div>
        <div id="shop-items-grid" class="shop-grid"></div>
      </div>
    </div>
    ```
  - In `HUD.js:560-592`, `initShop()` simply iterates over all `SHOP_ITEMS` and appends cards directly into `#shop-items-grid`. No category tabs, no search, no category filtering.
  - In `src/style.css:620-667`, `.shop-window` uses generic `.glass-card` semi-transparent blur styling (`border-radius: 12px; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.12)`).
  - It does **not** feature the authentic Minecraft / Bloxd dark-slate container styling (`#222` / `#2d3238` with pixel beveled borders, inset item slot boxes, and highlighted active tab buttons).
- **Proximity Enforcers & Shortcuts**:
  - `[B]` Quick Shop shortcut is wired in `GameManager.js:210-212` and `HUD.js:123-131`.
  - `GameManager.isPlayerAtBase(player)` (`GameManager.js:221-227`): computes Euclidean horizontal distance `Math.hypot(player.position.x - teamSpawn.x, player.position.z - teamSpawn.z) <= 24`.
  - If inside 24m: opens shop; if outside: triggers `hud.showAnnouncement('QUICK SHOP', 'You must be at your base island to open Quick Shop!')`.
  - `[E]` key (`GameManager.js:198-206`): toggles shop.
  - `[U]` key (`GameManager.js:207-209`): toggles upgrades modal.
  - **Escape (`ESC`) key gap**: `GameManager.initInteractions()` (`GameManager.js:197-214`) does **not** listen for `Escape` (`e.code === 'Escape'`). When the user presses `ESC`, pointer lock exits in the browser, but the shop or upgrades modal remains open on screen instead of closing!
  - **Backdrop click gap**: Clicking outside `.shop-window` on `.modal-backdrop` does not close the shop.
  - **Blocking `alert(...)` calls**:
    - `HUD.js:601`: `alert(\`Not enough \${item.costType.toUpperCase()}!\`);`
    - `HUD.js:640`: `alert(\`Upgraded: \${upg.name}!\`);`
    - `HUD.js:642`: `alert('Not enough Diamonds!');`
    These synchronous browser `alert()` popups disrupt gameplay, pause the game loop, and break immersion.

---

### 1.3 Test Suite State & Compatibility
- Ran `node tests/e2e-runner.js`: **288/288 tests pass (100% pass rate in 0.48s)**.
- Existing tests rely directly on specific item IDs in `SHOP_ITEMS`:
  - `wool_16` (`tier1-features.test.js`, `tier3-pairwise.test.js`, `tier4-scenarios.test.js:102`)
  - `stone_sword` (`tier4-scenarios.test.js:109`, `tier3-pairwise.test.js:78`)
  - `iron_sword` (`tier4-scenarios.test.js:315`)
  - `diamond_sword` (`tier4-scenarios.test.js:444`)
  - `armor_iron` (`tier4-scenarios.test.js:308`)
  - `shears` (`tier4-scenarios.test.js:321`)
  - `obsidian_4` (`tier4-scenarios.test.js:439`)
- Existing tests rely on `TEAM_UPGRADES` IDs:
  - `sharpness`, `protection_1`, `protection_2`, `forge_2`, `forge_3`, `heal_pool`, `alarm_trap`.
- `tests/test_hud_m3.js` tests `calculateArmorDefensePoints`, `formatNextEvent`, and Suite 7 Quick Shop `[B]` (71/71 pass).
- There is currently **no dedicated M5 shop test suite** (`tests/test_systems_shop_m5.js`).

---

## 2. Logic Chain

1. **Category Alignment (Bloxd.io & Hypixel)**:
   - Bloxd.io and Hypixel Bedwars use 4 unified core categories:
     - `Recommended` (Quick Buy)
     - `Blocks`
     - `Combat` (merging swords, armor, bows, projectiles)
     - `Utility` (merging pickaxes, axes, shears, consumables, ender pearls)
   - In order to guarantee 100% backward compatibility with any external script or test inspecting `category`, items should retain their semantic category or support category aliases:
     - `category: 'blocks'` -> displays under Blocks tab
     - `category: 'combat'`, `'weapons'`, `'armor'` -> displays under Combat tab
     - `category: 'utility'`, `'tools'` -> displays under Utility tab
     - `recommended: true` -> displays under Recommended tab
   - Export `SHOP_CATEGORIES = [...]` to define tab metadata (`id`, `name`, `icon`).

2. **Catalog Expansion**:
   - Adding missing items will satisfy `ORIGINAL_REQUEST.md` line 147 and Bloxd.io parity without modifying existing items:
     - Blocks: `terracotta_16` (12 Iron), `glass_4` (12 Iron, blast-proof), `ladder_8` (4 Iron).
     - Combat: `bow` (12 Gold), `arrows_8` (2 Gold), `crossbow` (8 Gold).
     - Utility: `wooden_pickaxe` (10 Iron), `stone_pickaxe` (10 Iron), `wooden_axe` (10 Iron), `iron_axe` (20 Iron), `diamond_axe` (6 Gold), `water_bucket` (1 Emerald), `ender_pearl` (4 Emeralds).
   - Ensure `id` of every original item remains identical.

3. **Transaction Safety (Inventory & Currency Deduction)**:
   - In `Player.js:addItem(item)`, if inventory is full (9 slots occupied with non-stackable items), it returns `false`.
   - `HUD.buyItem(item)` must check if the item can be added **before** deducting currency, or perform an atomic purchase check:
     ```javascript
     const canAdd = player.canAddItem ? player.canAddItem(item) : true;
     if (!canAdd) {
       this.showShopNotification('Inventory full!', 'error');
       return;
     }
     if (player.spendResource(item.costType, item.cost)) {
       item.action(player);
       // ...
     ```

4. **Authentic Dark-Slate Minecraft Container UI**:
   - Update `src/style.css`:
     - Container background: `#222222` / `#2d3238` with pixel beveled borders (highlight top/left `#4f5763`, shadow bottom/right `#14171a`).
     - Slot boxes: `#181b1f` with inset pixel border (`box-shadow: inset 2px 2px 0 #101214, inset -2px -2px 0 #2e333b`).
     - Category tabs bar: Horizontal tabs at top of modal (`[⭐ Quick Buy] [🧱 Blocks] [⚔️ Combat] [🛠️ Utility] [✨ Upgrades]`).
     - Active tab highlight: `#3ba55d` or `#0284c7` with crisp white text.
     - Live Resource Balance header inside shop modal:
       Displays player's live Iron, Gold, Diamond, Emerald counts.
     - Affordability dimming: If `player.resources[item.costType] < item.cost`, apply `.cannot-afford` (`opacity: 0.55; filter: grayscale(30%)`).
     - Non-blocking notifications: Replace `alert(...)` with in-modal toast / status message and audio chimes.

5. **Input & Shortcut Polishing**:
   - In `GameManager.initInteractions()`:
     - Add `case 'Escape':`
       ```javascript
       if (!this.hud.shopModal.classList.contains('hidden')) {
         this.hud.closeShop();
       } else if (!this.hud.upgradesModal.classList.contains('hidden')) {
         this.hud.upgradesModal.classList.add('hidden');
         this.canvas.requestPointerLock?.();
       }
       ```
     - Add backdrop click listener to `#shop-modal` and `#upgrades-modal`: clicking the backdrop (outside `.shop-window`) closes the modal.
     - Keep `[B]` quick shop button and key shortcut functioning identically with 24m base boundary check.

6. **Dedicated Verification Suite**:
   - Create `tests/test_systems_shop_m5.js` with comprehensive assertions covering:
     - Category filtering and catalog contents.
     - Currency costs and deduction.
     - Upgrades application and tier progressions.
     - Quick shop 24m base boundary check.
     - Keyboard shortcuts (`ESC`, `B`, `E`, `U`).
     - Zero regressions across the 288 master tests.

---

## 3. Caveats

- **No Breaking Changes to Item IDs**: `tier4-scenarios.test.js`, `tier3-pairwise.test.js`, and `tier1-features.test.js` import `SHOP_ITEMS` and `TEAM_UPGRADES` directly and search for IDs `wool_16`, `stone_sword`, `iron_sword`, `diamond_sword`, `armor_iron`, `shears`, `obsidian_4`. These exact item IDs must remain in `SHOP_ITEMS`.
- **Headless Node Mock Environment**: In headless tests (`browser-shim.js`), `requestPointerLock`, `alert`, and DOM rendering use mocks. All new UI methods must be guarded (`if (this.shopModal) ...`, `?.`) so they work seamlessly in both headless Node.js tests and browser environments.
- **Upgrades Tab Integration**: In addition to opening the standalone Upgrades modal (`[U]`), having an "Upgrades" tab inside the main Shopkeeper modal allows players to purchase team upgrades seamlessly from one interface, matching Hypixel and bloxd.io Bedwars.

---

## 4. Conclusion & Actionable Recommendations for Worker

The worker agent (`worker_m5_gen4`) should implement the following targeted enhancements:

### Step 1: Update `src/game/ShopManager.js`
1. Export `SHOP_CATEGORIES`:
   ```javascript
   export const SHOP_CATEGORIES = [
     { id: 'recommended', name: 'Quick Buy', icon: '⭐' },
     { id: 'blocks', name: 'Blocks', icon: '🧱' },
     { id: 'combat', name: 'Combat', icon: '⚔️' },
     { id: 'utility', name: 'Utility', icon: '🛠️' },
     { id: 'upgrades', name: 'Upgrades', icon: '✨' },
   ];
   ```
2. Expand `SHOP_ITEMS` to include:
   - Retain all 17 existing items with unchanged IDs and costs.
   - Add `recommended: true` to staple items (`wool_16`, `stone_sword`, `armor_chainmail`, `iron_pickaxe`, `shears`, `fireball`, `golden_apple`).
   - Add missing items:
     - Blocks: `terracotta_16` (cost: 12 iron), `glass_4` (cost: 12 iron, `BLOCK_TYPES.GLASS`), `ladder_8` (cost: 4 iron).
     - Combat: `bow` (cost: 12 gold), `arrows_8` (cost: 2 gold), `crossbow` (cost: 8 gold).
     - Utility: `wooden_pickaxe` (cost: 10 iron), `stone_pickaxe` (cost: 10 iron), `wooden_axe` (cost: 10 iron), `iron_axe` (cost: 20 iron), `diamond_axe` (cost: 6 gold), `water_bucket` (cost: 1 emerald), `ender_pearl` (cost: 4 emerald).
3. Ensure categories map cleanly to the 4 main tabs (`blocks`, `combat`, `utility`, `recommended`).

### Step 2: Enhance `src/ui/HUD.js`
1. In `initShop()`:
   - Render Category Tabs Bar (`#shop-category-tabs`) with active tab tracking (`this.activeShopCategory = 'recommended'`).
   - Render Live Resource Pill Header (`#shop-resource-summary`) showing `iron`, `gold`, `diamond`, `emerald`.
   - Render slot cards with Minecraft-style slot containers and affordability classes (`.can-afford`, `.cannot-afford`).
   - Clicking tab filters items instantly and re-renders grid. If `upgrades` tab is selected, render team upgrades in the same view.
2. In `buyItem(item)`:
   - Perform atomic affordability check.
   - Replace `alert(...)` with non-blocking audio cue + status toast.
   - Deduct resource, invoke `item.action(player)`, play `sound.playShopBuy()`, and refresh resource indicators.
3. In `openShop()` / `closeShop()`:
   - Update resource balance and affordability states upon opening.
   - Add backdrop click listener to dismiss modal when clicking outside `.shop-window`.
4. In `initUpgrades()` / `buyUpgrade(upg)`:
   - Replace `alert(...)` with non-blocking status banner.
   - Dynamically reflect upgrade ownership status (e.g. "OWNED" or "TIER I ACTIVE").

### Step 3: Enhance `src/style.css`
1. Replace modern `.glass-card` shop styles with authentic dark-slate Minecraft container styling:
   - `.shop-window`, `.upgrades-window`: background `#222222` / `#2d3238`, border `3px solid #3c424b`, box-shadow `0 8px 0 #14171a, 0 12px 32px rgba(0,0,0,0.85)`.
   - Category tabs `.shop-category-tabs`: horizontal flex layout with pixel border buttons. Active tab: `#3ba55d` or `#0284c7`, inactive: `#1e293b`.
   - Resource summary `.shop-resource-bar`: pill badges showing Iron, Gold, Diamond, Emerald icons with distinct Minecraft ore colors.
   - Slot boxes `.shop-item-card`: `#181b1f`, `border: 2px inset #101214`, `box-shadow: inset 2px 2px 0 #101214, inset -2px -2px 0 #2e333b`.
   - Affordability state `.cannot-afford`: dimmed opacity (0.55), grayed out button.

### Step 4: Fix Shortcuts in `src/game/GameManager.js`
1. In `initInteractions()`:
   - Add `case 'Escape':` to close active modal (`shopModal` or `upgradesModal`) and re-request pointer lock.
   - Ensure `[B]` toggles quick shop cleanly when at base (`dist <= 24m`).

### Step 5: Create Test Suite `tests/test_systems_shop_m5.js`
- Create comprehensive tests verifying:
  1. All shop categories (`recommended`, `blocks`, `combat`, `utility`) exist and filter items correctly.
  2. All 17 legacy items exist and remain 100% compatible.
  3. New items (terracotta, glass, bow, arrows, crossbow, pickaxes, axes, ender pearl) exist and purchase properly.
  4. Currency deduction, affordability checks, and inventory addition.
  5. Team upgrades application (`sharpness`, `protection`, `healPool`, `alarmTrap`, `forgeTier`).
  6. Quick Shop `[B]` proximity enforcement (allowed within 24m, blocked beyond 24m).
  7. Keyboard shortcuts (`B`, `E`, `U`, `Escape`).
  8. Full 288 master tests in `tests/e2e-runner.js` continue to pass.

---

## 5. Verification Method

To independently verify the implementation:
1. Run master test suite:
   ```powershell
   cd C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars; node tests/e2e-runner.js
   ```
   **Expected**: 288/288 tests pass with 0 failures.
2. Run M3 HUD test suite:
   ```powershell
   cd C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars; node tests/test_hud_m3.js
   ```
   **Expected**: 71/71 tests pass.
3. Run new M5 Systems Shop test suite:
   ```powershell
   cd C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars; node tests/test_systems_shop_m5.js
   ```
   **Expected**: All shop, category, currency, and shortcut assertions pass.
4. Run production build:
   ```powershell
   cd C:\Users\alekhyo\.gemini\antigravity\scratch\voxel-bedwars; npm run build
   ```
   **Expected**: Clean Vite bundle output without errors.
