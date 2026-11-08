const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const stage = pj.targets.find(t => t.name === 'Stage');
const drawing = pj.targets.find(t => t.name === 'Drawing');
const soundsTarget = pj.targets.find(t => t.name === 'Sounds');

let imgNames, imgWidths, imgHeights, imgIndexes, imgColours;
for (const [id, [name, val]] of Object.entries(stage.lists)) {
  if (name === '_Images Names') imgNames = val;
  if (name === '_Images Widths') imgWidths = val;
  if (name === '_Images Heights') imgHeights = val;
  if (name === '_Images Indexes') imgIndexes = val;
  if (name === '_Images Colours') imgColours = val;
}

const drawingMap = new Map();
for (const c of drawing.costumes) {
  drawingMap.set(c.name, c);
}

// 1. BLOCKS to extract:
// We can extract 16x16 PNGs from _Images Colours for voxel block faces
// Or from Drawing costumes
const blockCatalog = [];
for (let i = 0; i < imgNames.length; i++) {
  const name = imgNames[i];
  if (!name || name === 'null' || name.startsWith('cursor')) continue;
  
  const w = parseInt(imgWidths[i], 10);
  const h = parseInt(imgHeights[i], 10);
  const dataOffset = parseInt(imgIndexes[i], 10) - 1;
  
  blockCatalog.push({
    name,
    width: w,
    height: h,
    dataOffset,
    source: '_Images Colours'
  });
}

// Also check block costumes in Drawing (e.g. rotation faces or item icons)
const itemBlockCostumes = drawing.costumes.filter(c => c.name.startsWith('item_'));

// 2. CRACKS to extract:
const crackCatalog = [];
for (let s = 1; s <= 10; s++) {
  const name = `cursor ${s}`;
  const idx = imgNames.indexOf(name);
  const dataOffset = parseInt(imgIndexes[idx], 10) - 1;
  crackCatalog.push({
    stage: s - 1, // 0 to 9 standard Minecraft crack stage
    name: `destroy_stage_${s - 1}`,
    scratchName: name,
    width: 16,
    height: 16,
    dataOffset,
    source: '_Images Colours'
  });
}

// 3. GUI elements in Drawing:
const guiNames = [
  'hotbar',
  'selected item hotbar',
  'crosshair',
  'heart_back',
  'heart_full',
  'heart_half',
  'heart_flash',
  'heart_half_poison',
  'heart_full_poison',
  'defense_back',
  'defense_full',
  'defense_half',
  'food_back',
  'food_full',
  'food_half',
  'food_flash',
  'xp_overlay',
  'xp_underlay',
  'xp orb',
  'bubble_back',
  'bubble_full',
  'bubble_half',
  'inventory',
  'inventory_hover',
  'inventory_chest',
  'inventory_furnace',
  'inventory_crafting_table',
  'inventory_cursor',
  'slider_bar',
  'slider_bar_hover',
  'menu_button_400',
  'menu_button_190'
];

const guiCatalog = [];
for (const gn of guiNames) {
  const c = drawingMap.get(gn);
  if (c) {
    guiCatalog.push({
      name: gn,
      md5ext: c.md5ext,
      format: c.dataFormat,
      exists: fs.existsSync(path.join(refDir, c.md5ext))
    });
  } else {
    console.warn('Missing GUI costume:', gn);
  }
}

// 4. PARTICLES in Drawing:
const particleNames = [
  'critical_hit',
  'entity_dies_particle',
  'torch_spark',
  'splash_bubble',
  'lava bubble',
  'potion bubble',
  'blaze smoke'
];
for (let i = 1; i <= 16; i++) particleNames.push(`explosion ${i}`);

const particleCatalog = [];
for (const pn of particleNames) {
  const c = drawingMap.get(pn);
  if (c) {
    particleCatalog.push({
      name: pn,
      md5ext: c.md5ext,
      format: c.dataFormat,
      exists: fs.existsSync(path.join(refDir, c.md5ext))
    });
  }
}

// 5. ITEMS in Drawing:
const itemCatalog = [];
for (const it of itemBlockCostumes) {
  itemCatalog.push({
    name: it.name,
    md5ext: it.md5ext,
    format: it.dataFormat,
    exists: fs.existsSync(path.join(refDir, it.md5ext))
  });
}

// 6. SOUNDS in Sounds target:
const soundCatalog = [];
for (const s of soundsTarget.sounds) {
  soundCatalog.push({
    name: s.name,
    md5ext: s.md5ext,
    format: s.dataFormat,
    rate: s.rate,
    sampleCount: s.sampleCount,
    exists: fs.existsSync(path.join(refDir, s.md5ext))
  });
}

console.log('=== SUMMARY OF CATALOG ===');
console.log('Block textures in _Images Colours:', blockCatalog.length);
console.log('Crack stages (0-9):', crackCatalog.length);
console.log('GUI textures:', guiCatalog.length, 'all exist?', guiCatalog.every(g => g.exists));
console.log('Particle textures:', particleCatalog.length, 'all exist?', particleCatalog.every(p => p.exists));
console.log('Item costumes:', itemCatalog.length, 'all exist?', itemCatalog.every(i => i.exists));
console.log('Sounds:', soundCatalog.length, 'all exist?', soundCatalog.every(s => s.exists));

const fullCatalog = {
  blockTextures: blockCatalog,
  crackStages: crackCatalog,
  gui: guiCatalog,
  particles: particleCatalog,
  items: itemCatalog,
  sounds: soundCatalog
};

fs.writeFileSync(
  'C:/Users/alekhyo/.gemini/antigravity/scratch/voxel-bedwars/.agents/teamwork/explorer_survey_assets_gen4/full_catalog_manifest.json',
  JSON.stringify(fullCatalog, null, 2)
);
console.log('Exported full_catalog_manifest.json');
