# Rule: Authentic Minecraft Voxel Engine & Hypixel UI Standards

When implementing or updating Voxel Bedwars:

1. **Voxel Interface & Architecture**:
   - Utilize established voxel interfaces/libraries (such as `noa-engine`—the core engine behind bloxd.io—or modular chunk-meshing pipelines) rather than building scratch ad-hoc voxel engines.
   - Maintain fast chunk meshing, voxel AABB collisions, and DDA voxel raycasting.

2. **Authentic Assets & Textures**:
   - Use genuine Minecraft 16x16 textures for blocks (wool, ores, stone, wood, obsidian, endstone, bed models) and items (swords, pickaxes, shears).
   - Source from verified authentic asset archives (e.g., the 443 textures and 251 sounds available in the user's reference project).
   - Audio effects must use authentic Minecraft sound effects for hits, block breaks, steps, bow firing, and explosions.

3. **Authentic Hypixel In-Game HUD**:
   - **Armor Bar**: 10 chestplate icons positioned immediately above the health hearts.
   - **Health Bar**: 10 health hearts (supports normal red hearts, absorption golden hearts).
   - **Hunger Bar**: 10 food drumsticks positioned on the right above the hotbar.
   - **Experience Bar**: Centered green XP bar with bold green level numeral.
   - **Hotbar**: Centered 9-slot authentic textured hotbar with active selector frame.
   - **First-Person Held Item**: 3D angled item model in the right lower viewport featuring proper arm bobbing, swing animation, and enchanted glint shader/texture.
   - **Scoreboard**: Hypixel-style right-side sidebar tracking team beds, kills, and game timer.
