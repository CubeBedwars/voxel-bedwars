/**
 * scripts/ingest_minecraft_assets.js
 * Production-grade Minecraft Asset Pipeline & Ingestion for Voxel Bedwars.
 *
 * Ingests authentic Minecraft textures and sound effects from unpacked Scratch 3D v0.6 reference:
 * - 251 authentic sound files (141 MP3, 110 WAV) into public/assets/minecraft/sounds/
 * - 582+ 16x16 block face textures into public/assets/minecraft/textures/blocks/
 * - 10 progressive mining crack overlays (destroy_stage_0..9) into public/assets/minecraft/textures/cracks/
 * - 30+ Hypixel GUI elements into public/assets/minecraft/textures/gui/
 * - 382+ item icons into public/assets/minecraft/textures/items/
 * - 192 enchantment glint animation frames into public/assets/minecraft/textures/glint/
 * - Combat & environment particles into public/assets/minecraft/textures/particles/
 * - Synthesizes emerald block, emerald ore, and emerald gem via HSL hue shift from diamond
 * - Synthesizes authentic lucky block texture
 * - Generates public/assets/minecraft/manifest.json registry
 *
 * Zero external dependencies: pure Node.js (fs, path, zlib).
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project directories
const projectRoot = path.resolve(__dirname, '..');
const defaultRefDir = 'C:\\Users\\alekhyo\\.gemini\\antigravity\\scratch\\scratch_minecraft_ref';
const refDir = process.env.MINECRAFT_REF_DIR || defaultRefDir;
const outputDir = path.join(projectRoot, 'public', 'assets', 'minecraft');

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║           MINECRAFT ASSET PIPELINE & INGESTION SYSTEM                ║');
console.log('║       Authentic Pixel Textures, Sounds & Manifest Generator          ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
console.log(`[AssetPipeline] Reference directory: ${refDir}`);
console.log(`[AssetPipeline] Target directory:    ${outputDir}`);

if (!fs.existsSync(refDir)) {
  console.error(`[AssetPipeline] ERROR: Reference directory not found: ${refDir}`);
  process.exit(1);
}

const projectJsonPath = path.join(refDir, 'project.json');
if (!fs.existsSync(projectJsonPath)) {
  console.error(`[AssetPipeline] ERROR: project.json not found in reference directory`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Pure Node.js PNG Encoder & Decoder (Zero Dependencies)
// ---------------------------------------------------------------------------

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

export function createPng(width, height, rgbaBuffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  const scanlineLength = width * 4;
  const rawData = Buffer.alloc(height * (scanlineLength + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (scanlineLength + 1);
    rawData[rowStart] = 0; // Filter 0 (None)
    rgbaBuffer.copy(rawData, rowStart + 1, y * scanlineLength, (y + 1) * scanlineLength);
  }
  
  const idat = zlib.deflateSync(rawData);
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

export function decodePngRgba(buf) {
  let offset = 8;
  let width, height, bitDepth, colorType;
  const idatChunks = [];

  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.slice(offset + 8, offset + 8 + len);
    offset += 12 + len;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    }
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = width * bpp;
  const rgba = Buffer.alloc(width * height * 4);

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }

  const prevRow = Buffer.alloc(stride);
  const currRow = Buffer.alloc(stride);

  let inOffset = 0;
  for (let y = 0; y < height; y++) {
    const filter = decompressed[inOffset++];
    for (let x = 0; x < stride; x++) {
      const byte = decompressed[inOffset++];
      const left = x >= bpp ? currRow[x - bpp] : 0;
      const up = prevRow[x];
      const upLeft = x >= bpp ? prevRow[x - bpp] : 0;

      let val = 0;
      if (filter === 0) val = byte;
      else if (filter === 1) val = (byte + left) & 0xff;
      else if (filter === 2) val = (byte + up) & 0xff;
      else if (filter === 3) val = (byte + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) val = (byte + paeth(left, up, upLeft)) & 0xff;
      currRow[x] = val;
    }

    for (let x = 0; x < width; x++) {
      const outIdx = (y * width + x) * 4;
      if (colorType === 6) { // RGBA
        rgba[outIdx] = currRow[x * 4];
        rgba[outIdx + 1] = currRow[x * 4 + 1];
        rgba[outIdx + 2] = currRow[x * 4 + 2];
        rgba[outIdx + 3] = currRow[x * 4 + 3];
      } else if (colorType === 2) { // RGB
        rgba[outIdx] = currRow[x * 3];
        rgba[outIdx + 1] = currRow[x * 3 + 1];
        rgba[outIdx + 2] = currRow[x * 3 + 2];
        rgba[outIdx + 3] = 255;
      }
    }
    currRow.copy(prevRow);
  }

  return { width, height, rgba };
}

// ---------------------------------------------------------------------------
// Color Utilities & HSL Hue Shifter
// ---------------------------------------------------------------------------

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function shiftCyanToEmerald(rgbaBuffer) {
  const result = Buffer.from(rgbaBuffer);
  for (let i = 0; i < result.length; i += 4) {
    const a = result[i + 3];
    if (a > 0) {
      const r = result[i];
      const g = result[i + 1];
      const b = result[i + 2];
      const [h, s, l] = rgbToHsl(r, g, b);
      // Cyan/blue hue detection (150° - 215°, s > 0.15)
      if (s > 0.15 && h >= 0.42 && h <= 0.60) {
        // Shift hue to rich Emerald green (approx 133° = 0.37)
        const targetH = 0.365;
        const [newR, newG, newB] = hslToRgb(targetH, Math.min(1.0, s * 1.05), l);
        result[i] = newR;
        result[i + 1] = newG;
        result[i + 2] = newB;
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Helpers: File system & Names
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitizeName(name) {
  return name.trim().toLowerCase().replace(/[^\w\d]+/g, '_').replace(/^_+|_+$/g, '');
}

function sanitizeKebab(name) {
  return name.trim().toLowerCase().replace(/[.\s_]+/g, '-');
}

// ---------------------------------------------------------------------------
// Main Ingestion Workflow
// ---------------------------------------------------------------------------

export async function runIngestion() {
  const startTime = Date.now();
  console.log('[AssetPipeline] Parsing project.json...');
  const pj = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));

  // Ensure output directory tree
  const soundsDir = path.join(outputDir, 'sounds');
  const texturesDir = path.join(outputDir, 'textures');
  const blocksDir = path.join(texturesDir, 'blocks');
  const cracksDir = path.join(texturesDir, 'cracks');
  const guiDir = path.join(texturesDir, 'gui');
  const itemsDir = path.join(texturesDir, 'items');
  const glintDir = path.join(texturesDir, 'glint');
  const particlesDir = path.join(texturesDir, 'particles');

  [
    soundsDir,
    path.join(soundsDir, 'dig'),
    path.join(soundsDir, 'step'),
    path.join(soundsDir, 'combat'),
    path.join(soundsDir, 'player'),
    path.join(soundsDir, 'explosion'),
    path.join(soundsDir, 'ui'),
    path.join(soundsDir, 'entities'),
    blocksDir,
    cracksDir,
    guiDir,
    itemsDir,
    glintDir,
    particlesDir
  ].forEach(ensureDir);

  // Manifest structure
  const manifest = {
    version: '1.0.0',
    source: 'Minecraft 3D v0.6',
    generatedAt: new Date().toISOString(),
    stats: {
      sounds: 0,
      blocks: 0,
      cracks: 0,
      gui: 0,
      items: 0,
      glint: 0,
      particles: 0,
      totalTextures: 0
    },
    blocks: {},
    cracks: [],
    gui: {},
    items: {},
    glint: {},
    particles: {},
    soundbanks: {},
    sounds: {}
  };

  // -------------------------------------------------------------------------
  // 1. INGEST 251 SOUNDS
  // -------------------------------------------------------------------------
  console.log('[AssetPipeline] Ingesting 251 authentic Minecraft sounds...');
  const soundsTarget = pj.targets.find(t => t.name === 'Sounds');
  if (!soundsTarget || !soundsTarget.sounds) {
    throw new Error('Target "Sounds" not found in project.json');
  }

  function getSoundCategory(name) {
    const n = name.toLowerCase();
    if (n.includes('break') || n.includes('dig')) return 'dig';
    if (n.startsWith('wood hit') || n.startsWith('stone hit') || n.startsWith('wool hit') ||
        n.startsWith('grass hit') || n.startsWith('gravel hit') || n.startsWith('sand hit') ||
        n.startsWith('snow hit')) return 'step';
    if (n.startsWith('player hurt') || n.startsWith('bow shoot') || n.startsWith('arrow land') || n.startsWith('fall')) return 'combat';
    if (n.startsWith('food ') || n.startsWith('potion ') || n.startsWith('item pop') ||
        n.startsWith('pearl teleport') || n.startsWith('shear.')) return 'player';
    if (n.startsWith('explode') || n.startsWith('tnt fuse') || n.startsWith('ambient fire') ||
        n.startsWith('ambient lava') || n.startsWith('fizz')) return 'explosion';
    if (n.startsWith('menu click') || n.startsWith('button.') || n.startsWith('note.') ||
        n.startsWith('xp collect') || n.startsWith('achievement')) return 'ui';
    return 'entities';
  }

  let copiedSounds = 0;
  for (const s of soundsTarget.sounds) {
    const srcFile = path.join(refDir, s.md5ext);
    if (!fs.existsSync(srcFile)) {
      console.warn(`[AssetPipeline] Warning: Missing audio file ${s.md5ext} (${s.name})`);
      continue;
    }
    const cat = getSoundCategory(s.name);
    const ext = s.dataFormat || path.extname(s.md5ext).slice(1);
    const cleanKebab = sanitizeKebab(s.name) + '.' + ext;
    const destPath = path.join(soundsDir, cat, cleanKebab);
    fs.copyFileSync(srcFile, destPath);

    const soundUrl = `/assets/minecraft/sounds/${cat}/${cleanKebab}`;
    manifest.sounds[s.name] = soundUrl;
    manifest.sounds[cleanKebab.replace('.' + ext, '')] = soundUrl;
    copiedSounds++;
  }
  manifest.stats.sounds = copiedSounds;
  console.log(`[AssetPipeline] Ingested ${copiedSounds} sounds cleanly into public/assets/minecraft/sounds/`);

  // Define structured soundbanks for engine SoundManager
  manifest.soundbanks = {
    dig_wool: [
      manifest.sounds['wool break 1'], manifest.sounds['wool break 2'],
      manifest.sounds['wool break 3'], manifest.sounds['wool break 4']
    ].filter(Boolean),
    step_wool: [
      manifest.sounds['wool hit 1'], manifest.sounds['wool hit 2'],
      manifest.sounds['wool hit 3'], manifest.sounds['wool hit 4']
    ].filter(Boolean),
    dig_stone: [
      manifest.sounds['stone break 1'], manifest.sounds['stone break 2'],
      manifest.sounds['stone break 3'], manifest.sounds['stone break 4']
    ].filter(Boolean),
    step_stone: [
      manifest.sounds['stone hit 1'], manifest.sounds['stone hit 2'],
      manifest.sounds['stone hit 3'], manifest.sounds['stone hit 4']
    ].filter(Boolean),
    dig_wood: [
      manifest.sounds['wood break 1'], manifest.sounds['wood break 2'],
      manifest.sounds['wood break 3'], manifest.sounds['wood break 4']
    ].filter(Boolean),
    step_wood: [
      manifest.sounds['wood hit 1'], manifest.sounds['wood hit 2'],
      manifest.sounds['wood hit 3'], manifest.sounds['wood hit 4']
    ].filter(Boolean),
    dig_grass: [
      manifest.sounds['grass break 1'], manifest.sounds['grass break 2'],
      manifest.sounds['grass break 3'], manifest.sounds['grass break 4']
    ].filter(Boolean),
    step_grass: [
      manifest.sounds['grass hit 1'], manifest.sounds['grass hit 2'],
      manifest.sounds['grass hit 3'], manifest.sounds['grass hit 4'],
      manifest.sounds['grass hit 5'], manifest.sounds['grass hit 6']
    ].filter(Boolean),
    dig_glass: [
      manifest.sounds['glass break 1'], manifest.sounds['glass break 2'],
      manifest.sounds['glass break 3']
    ].filter(Boolean),
    player_hurt: [
      manifest.sounds['player hurt 1'], manifest.sounds['player hurt 2'],
      manifest.sounds['player hurt 3']
    ].filter(Boolean),
    explosion: [
      manifest.sounds['explode 1'], manifest.sounds['explode 2'],
      manifest.sounds['explode 3'], manifest.sounds['explode 4']
    ].filter(Boolean),
    tnt_fuse: [manifest.sounds['tnt fuse 1']].filter(Boolean),
    eat: [
      manifest.sounds['food eat 1'], manifest.sounds['food eat 2'],
      manifest.sounds['food eat 3']
    ].filter(Boolean),
    burp: [manifest.sounds['food burp 1']].filter(Boolean),
    item_pickup: [manifest.sounds['item pop 1']].filter(Boolean),
    teleport: [
      manifest.sounds['pearl teleport 1'], manifest.sounds['pearl teleport 2']
    ].filter(Boolean),
    shear: [manifest.sounds['shear.use 1']].filter(Boolean),
    bow_shoot: [manifest.sounds['bow shoot 1']].filter(Boolean),
    arrow_hit: [
      manifest.sounds['arrow land 1'], manifest.sounds['arrow land 2'],
      manifest.sounds['arrow land 3'], manifest.sounds['arrow land 4']
    ].filter(Boolean),
    click: [manifest.sounds['menu click 1'] || manifest.sounds['note.click 1']].filter(Boolean),
    xp_pickup: [manifest.sounds['xp collect 1']].filter(Boolean),
    victory: [manifest.sounds['achievement 1']].filter(Boolean)
  };

  // -------------------------------------------------------------------------
  // 2. EXTRACT 16x16 BLOCK TEXTURES & CRACK OVERLAYS FROM _Images Colours
  // -------------------------------------------------------------------------
  console.log('[AssetPipeline] Extracting 16x16 block textures and mining crack overlays...');
  const stage = pj.targets.find(t => t.name === 'Stage');
  let imgNames = [], imgWidths = [], imgHeights = [], imgIndexes = [], imgColours = [];
  for (const [k, [n, val]] of Object.entries(stage.lists)) {
    if (n === '_Images Names') imgNames = val;
    if (n === '_Images Widths') imgWidths = val;
    if (n === '_Images Heights') imgHeights = val;
    if (n === '_Images Indexes') imgIndexes = val;
    if (n === '_Images Colours') imgColours = val;
  }

  function getRawBlockRgba(name) {
    const idx = imgNames.indexOf(name);
    if (idx === -1) return null;
    const w = parseInt(imgWidths[idx], 10);
    const h = parseInt(imgHeights[idx], 10);
    const dataOffset = parseInt(imgIndexes[idx], 10) - 1;
    const pixels = imgColours.slice(dataOffset, dataOffset + (w * h));
    const rgba = Buffer.alloc(w * h * 4);
    for (let i = 0; i < pixels.length; i++) {
      const val = parseInt(pixels[i], 10);
      if (val === 0 || val === 16777216) {
        rgba[i * 4] = 0;
        rgba[i * 4 + 1] = 0;
        rgba[i * 4 + 2] = 0;
        rgba[i * 4 + 3] = 0;
      } else {
        rgba[i * 4] = (val >> 16) & 0xff;     // R
        rgba[i * 4 + 1] = (val >> 8) & 0xff;  // G
        rgba[i * 4 + 2] = val & 0xff;         // B
        rgba[i * 4 + 3] = 255;                // A
      }
    }
    return { width: w, height: h, rgba };
  }

  // A. Extract mining crack stages (cursor 1 to cursor 10)
  for (let s = 0; s < 10; s++) {
    const cursorName = `cursor ${s + 1}`;
    const raw = getRawBlockRgba(cursorName);
    if (raw && raw.width === 16 && raw.height === 16) {
      const pngBuf = createPng(16, 16, raw.rgba);
      const stageName = `destroy_stage_${s}.png`;
      fs.writeFileSync(path.join(cracksDir, stageName), pngBuf);
      // also alias crack_s.png
      fs.writeFileSync(path.join(cracksDir, `crack_${s}.png`), pngBuf);
      manifest.cracks.push(`/assets/minecraft/textures/cracks/${stageName}`);
      manifest.stats.cracks++;
    }
  }
  console.log(`[AssetPipeline] Extracted ${manifest.cracks.length} mining crack stages (destroy_stage_0..9)`);

  // B. Extract all 16x16 block textures
  let blockCount = 0;
  for (let i = 0; i < imgNames.length; i++) {
    const origName = imgNames[i];
    if (!origName || origName === 'null') continue;
    const w = parseInt(imgWidths[i], 10);
    const h = parseInt(imgHeights[i], 10);
    if (w !== 16 || h !== 16) continue;
    // Skip cursor breaking stages (already in cracks/)
    if (origName.startsWith('cursor ')) continue;

    const clean = sanitizeName(origName);
    const raw = getRawBlockRgba(origName);
    if (!raw) continue;

    const pngBuf = createPng(16, 16, raw.rgba);
    const fileName = `${clean}.png`;
    fs.writeFileSync(path.join(blocksDir, fileName), pngBuf);

    manifest.blocks[clean] = {
      name: origName,
      texture: `/assets/minecraft/textures/blocks/${fileName}`,
      width: 16,
      height: 16
    };
    blockCount++;
  }

  // C. Add convenient block aliases for VoxelWorld
  const blockAliases = {
    // Wool aliases (both wool_<color> and <color>_wool)
    'wool_white': 'white_wool.png',
    'wool_red': 'red_wool.png',
    'wool_blue': 'blue_wool.png',
    'wool_green': 'green_wool.png',
    'wool_yellow': 'yellow_wool.png',
    'wool_aqua': 'cyan_wool.png',
    'wool_cyan': 'cyan_wool.png',
    'wool_pink': 'pink_wool.png',
    'wool_gray': 'grey_wool.png',
    'wool_grey': 'grey_wool.png',
    'wool_black': 'black_wool.png',
    'wool_brown': 'brown_wool.png',
    'wool_light_blue': 'light_blue_wool.png',
    'wool_light_gray': 'light_grey_wool.png',
    'wool_lime': 'lime_wool.png',
    'wool_magenta': 'magenta_wool.png',
    'wool_orange': 'orange_wool.png',
    'wool_purple': 'purple_wool.png',

    // Core materials
    'wood': 'oak_planks.png',
    'grass': 'grass_top.png',
    'bed_head': 'bed_pillow_top_a.png',
    'bed_foot': 'bed_foot_top_a.png',
    'tnt': 'tnt_side.png',
    'crafting_table': 'crafting_table_top.png',
    'furnace': 'furnace_front.png',
    'chest': 'chest_front.png'
  };

  for (const [alias, target] of Object.entries(blockAliases)) {
    const targetPath = path.join(blocksDir, target);
    const aliasPath = path.join(blocksDir, `${alias}.png`);
    if (fs.existsSync(targetPath)) {
      fs.copyFileSync(targetPath, aliasPath);
      manifest.blocks[alias] = {
        name: alias,
        texture: `/assets/minecraft/textures/blocks/${alias}.png`,
        width: 16,
        height: 16,
        aliasOf: target
      };
      blockCount++;
    }
  }

  // D. Synthesize Emerald Block & Emerald Ore via Hue Shift from Diamond
  const diamondBlockRaw = getRawBlockRgba('diamond block');
  if (diamondBlockRaw) {
    const emeraldBlockRgba = shiftCyanToEmerald(diamondBlockRaw.rgba);
    const emeraldBlockPng = createPng(16, 16, emeraldBlockRgba);
    fs.writeFileSync(path.join(blocksDir, 'emerald_block.png'), emeraldBlockPng);
    manifest.blocks['emerald_block'] = {
      name: 'Emerald Block',
      texture: `/assets/minecraft/textures/blocks/emerald_block.png`,
      width: 16,
      height: 16,
      synthesized: true
    };
    blockCount++;
  }

  const diamondOreRaw = getRawBlockRgba('diamond ore');
  if (diamondOreRaw) {
    const emeraldOreRgba = shiftCyanToEmerald(diamondOreRaw.rgba);
    const emeraldOrePng = createPng(16, 16, emeraldOreRgba);
    fs.writeFileSync(path.join(blocksDir, 'emerald_ore.png'), emeraldOrePng);
    manifest.blocks['emerald_ore'] = {
      name: 'Emerald Ore',
      texture: `/assets/minecraft/textures/blocks/emerald_ore.png`,
      width: 16,
      height: 16,
      synthesized: true
    };
    blockCount++;
  }

  // E. Synthesize Authentic Lucky Block (Gold background with crisp white '?')
  const luckyBlockRgba = Buffer.alloc(16 * 16 * 4);
  const goldBase = [0xf5, 0x9e, 0x0b, 0xff]; // warm gold amber
  const goldBorder = [0xd9, 0x77, 0x06, 0xff]; // darker gold bevel
  const goldHighlight = [0xfd, 0xba, 0x74, 0xff]; // lighter gold specular
  const white = [0xff, 0xff, 0xff, 0xff];
  const questionMarkPixels = new Set([
    '6,3', '7,3', '8,3', '9,3',
    '9,4', '9,5',
    '7,6', '8,6',
    '7,7', '8,7',
    '7,8', '8,8',
    '7,11', '8,11', '7,12', '8,12'
  ]);

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const idx = (y * 16 + x) * 4;
      if (questionMarkPixels.has(`${x},${y}`)) {
        luckyBlockRgba[idx] = white[0];
        luckyBlockRgba[idx + 1] = white[1];
        luckyBlockRgba[idx + 2] = white[2];
        luckyBlockRgba[idx + 3] = white[3];
      } else if (x === 0 || y === 0 || x === 15 || y === 15) {
        luckyBlockRgba[idx] = goldBorder[0];
        luckyBlockRgba[idx + 1] = goldBorder[1];
        luckyBlockRgba[idx + 2] = goldBorder[2];
        luckyBlockRgba[idx + 3] = goldBorder[3];
      } else if (x === 1 || y === 1) {
        luckyBlockRgba[idx] = goldHighlight[0];
        luckyBlockRgba[idx + 1] = goldHighlight[1];
        luckyBlockRgba[idx + 2] = goldHighlight[2];
        luckyBlockRgba[idx + 3] = goldHighlight[3];
      } else {
        const noise = ((x * 7 + y * 13) % 5) - 2;
        luckyBlockRgba[idx] = Math.max(0, Math.min(255, goldBase[0] + noise * 4));
        luckyBlockRgba[idx + 1] = Math.max(0, Math.min(255, goldBase[1] + noise * 4));
        luckyBlockRgba[idx + 2] = Math.max(0, Math.min(255, goldBase[2] + noise * 2));
        luckyBlockRgba[idx + 3] = 255;
      }
    }
  }
  const luckyBlockPng = createPng(16, 16, luckyBlockRgba);
  fs.writeFileSync(path.join(blocksDir, 'lucky_block.png'), luckyBlockPng);
  manifest.blocks['lucky_block'] = {
    name: 'Lucky Block',
    texture: `/assets/minecraft/textures/blocks/lucky_block.png`,
    width: 16,
    height: 16,
    synthesized: true
  };
  blockCount++;

  manifest.stats.blocks = blockCount;
  console.log(`[AssetPipeline] Ingested ${blockCount} 16x16 block textures into public/assets/minecraft/textures/blocks/`);

  // -------------------------------------------------------------------------
  // 3. EXTRACT HYPIXEL GUI & HUD ELEMENTS
  // -------------------------------------------------------------------------
  console.log('[AssetPipeline] Extracting Hypixel HUD & GUI elements...');
  const drawing = pj.targets.find(t => t.name === 'Drawing');
  if (!drawing || !drawing.costumes) {
    throw new Error('Target "Drawing" not found in project.json');
  }

  const guiCostumes = [
    // Health hearts
    'heart_full', 'heart_half', 'heart_back', 'heart_flash',
    'heart_full_poison', 'heart_half_poison',
    // Armor icons (Hypixel chestplates)
    'defense_full', 'defense_half', 'defense_back',
    // Hunger drumsticks
    'food_full', 'food_half', 'food_back', 'food_flash',
    'food_full_poison', 'food_half_poison', 'food_back_poison',
    // Experience Bar
    'xp_overlay', 'xp_underlay', 'xp orb',
    // Hotbar & Crosshair
    'hotbar', 'selected item hotbar', 'crosshair',
    // Inventory screens
    'inventory', 'inventory_chest', 'inventory_crafting_table',
    'inventory_cursor', 'inventory_furnace', 'inventory_creative',
    'inventory_enchantment_table', 'inventory_brewing'
  ];

  let guiCount = 0;
  for (const guiName of guiCostumes) {
    const costume = drawing.costumes.find(c => c.name === guiName);
    if (!costume) {
      console.warn(`[AssetPipeline] Warning: GUI costume "${guiName}" not found in Drawing`);
      continue;
    }
    const srcFile = path.join(refDir, costume.md5ext);
    if (!fs.existsSync(srcFile)) {
      console.warn(`[AssetPipeline] Warning: Missing file for GUI "${guiName}": ${costume.md5ext}`);
      continue;
    }

    const ext = costume.dataFormat || path.extname(costume.md5ext).slice(1);
    const clean = sanitizeName(guiName);
    const destFile = `${clean}.${ext}`;
    fs.copyFileSync(srcFile, path.join(guiDir, destFile));

    const relUrl = `/assets/minecraft/textures/gui/${destFile}`;
    manifest.gui[clean] = relUrl;
    manifest.gui[guiName] = relUrl;
    guiCount++;

    // Convenient standard aliases
    if (clean === 'selected_item_hotbar') {
      fs.copyFileSync(srcFile, path.join(guiDir, `selected_slot.${ext}`));
      manifest.gui['selected_slot'] = `/assets/minecraft/textures/gui/selected_slot.${ext}`;
    } else if (clean === 'defense_full') {
      fs.copyFileSync(srcFile, path.join(guiDir, `armor_full.${ext}`));
      manifest.gui['armor_full'] = `/assets/minecraft/textures/gui/armor_full.${ext}`;
    } else if (clean === 'defense_half') {
      fs.copyFileSync(srcFile, path.join(guiDir, `armor_half.${ext}`));
      manifest.gui['armor_half'] = `/assets/minecraft/textures/gui/armor_half.${ext}`;
    } else if (clean === 'defense_back') {
      fs.copyFileSync(srcFile, path.join(guiDir, `armor_back.${ext}`));
      manifest.gui['armor_back'] = `/assets/minecraft/textures/gui/armor_back.${ext}`;
    } else if (clean === 'xp_orb') {
      manifest.gui['xp_orb'] = relUrl;
    }
  }
  manifest.stats.gui = guiCount;
  console.log(`[AssetPipeline] Ingested ${guiCount} GUI/HUD elements into public/assets/minecraft/textures/gui/`);

  // -------------------------------------------------------------------------
  // 4. EXTRACT 382+ ITEM ICONS & SYNTHESIZE EMERALD ITEM
  // -------------------------------------------------------------------------
  console.log('[AssetPipeline] Extracting item costumes and synthesizing emerald item...');
  const itemCostumes = drawing.costumes.filter(c => c.name.startsWith('item_'));
  let itemCount = 0;

  for (const c of itemCostumes) {
    const srcFile = path.join(refDir, c.md5ext);
    if (!fs.existsSync(srcFile)) {
      console.warn(`[AssetPipeline] Warning: Missing item file ${c.md5ext} (${c.name})`);
      continue;
    }
    const ext = c.dataFormat || path.extname(c.md5ext).slice(1);
    const cleanWithoutPrefix = sanitizeName(c.name.replace(/^item_/, ''));
    const cleanWithPrefix = sanitizeName(c.name);

    // Save with stripped name, e.g. diamond_sword.png
    const destName = `${cleanWithoutPrefix}.${ext}`;
    fs.copyFileSync(srcFile, path.join(itemsDir, destName));
    // Also save with item_ prefix for 100% compatibility
    fs.copyFileSync(srcFile, path.join(itemsDir, `${cleanWithPrefix}.${ext}`));

    const relUrl = `/assets/minecraft/textures/items/${destName}`;
    manifest.items[cleanWithoutPrefix] = {
      name: c.name,
      icon: relUrl
    };
    manifest.items[cleanWithPrefix] = {
      name: c.name,
      icon: `/assets/minecraft/textures/items/${cleanWithPrefix}.${ext}`
    };
    itemCount++;
  }

  // Synthesize Emerald Item via Hue Shift from item_diamond
  const itemDiamondCostume = drawing.costumes.find(c => c.name === 'item_diamond');
  if (itemDiamondCostume) {
    const diamondBuf = fs.readFileSync(path.join(refDir, itemDiamondCostume.md5ext));
    const decodedDiamond = decodePngRgba(diamondBuf);
    const emeraldRgba = shiftCyanToEmerald(decodedDiamond.rgba);
    const emeraldPng = createPng(decodedDiamond.width, decodedDiamond.height, emeraldRgba);

    fs.writeFileSync(path.join(itemsDir, 'emerald.png'), emeraldPng);
    fs.writeFileSync(path.join(itemsDir, 'item_emerald.png'), emeraldPng);

    manifest.items['emerald'] = {
      name: 'item_emerald',
      icon: '/assets/minecraft/textures/items/emerald.png',
      synthesized: true
    };
    manifest.items['item_emerald'] = {
      name: 'item_emerald',
      icon: '/assets/minecraft/textures/items/item_emerald.png',
      synthesized: true
    };
    itemCount++;
  }

  // Add alias for fireball from fire_charge
  if (manifest.items['fire_charge']) {
    fs.copyFileSync(path.join(itemsDir, 'fire_charge.png'), path.join(itemsDir, 'fireball.png'));
    manifest.items['fireball'] = {
      name: 'fireball',
      icon: '/assets/minecraft/textures/items/fireball.png',
      aliasOf: 'fire_charge'
    };
  }

  manifest.stats.items = itemCount;
  console.log(`[AssetPipeline] Ingested ${itemCount} items into public/assets/minecraft/textures/items/`);

  // -------------------------------------------------------------------------
  // 5. EXTRACT 192 ENCHANTMENT GLINT FRAMES
  // -------------------------------------------------------------------------
  console.log('[AssetPipeline] Extracting 192 enchantment glint animation frames...');
  const glowCostumes = drawing.costumes.filter(c => c.name.startsWith('glow_'));
  let glintCount = 0;

  for (const c of glowCostumes) {
    const srcFile = path.join(refDir, c.md5ext);
    if (!fs.existsSync(srcFile)) {
      console.warn(`[AssetPipeline] Warning: Missing glint file ${c.md5ext} (${c.name})`);
      continue;
    }
    const ext = c.dataFormat || path.extname(c.md5ext).slice(1);
    const clean = sanitizeName(c.name);
    const destName = `${clean}.${ext}`;
    fs.copyFileSync(srcFile, path.join(glintDir, destName));

    const relUrl = `/assets/minecraft/textures/glint/${destName}`;
    const match = clean.match(/^glow_(.+)_\d+$/);
    const itemKey = match ? match[1] : 'unknown';
    if (!manifest.glint[itemKey]) manifest.glint[itemKey] = [];
    manifest.glint[itemKey].push(relUrl);
    glintCount++;
  }
  manifest.stats.glint = glintCount;
  console.log(`[AssetPipeline] Ingested ${glintCount} glint frames into public/assets/minecraft/textures/glint/`);

  // -------------------------------------------------------------------------
  // 6. EXTRACT COMBAT & ENVIRONMENT PARTICLES
  // -------------------------------------------------------------------------
  console.log('[AssetPipeline] Extracting particles...');
  const particleCostumeNames = [
    'critical_hit', 'entity_dies_particle', 'torch_spark',
    'splash_bubble', 'lava bubble', 'blaze smoke'
  ];
  for (let i = 1; i <= 16; i++) {
    particleCostumeNames.push(`explosion ${i}`);
  }

  let particleCount = 0;
  for (const pName of particleCostumeNames) {
    const costume = drawing.costumes.find(c => c.name === pName);
    if (!costume) continue;
    const srcFile = path.join(refDir, costume.md5ext);
    if (!fs.existsSync(srcFile)) continue;

    const ext = costume.dataFormat || path.extname(costume.md5ext).slice(1);
    const clean = sanitizeName(pName);
    const destName = `${clean}.${ext}`;
    fs.copyFileSync(srcFile, path.join(particlesDir, destName));

    const relUrl = `/assets/minecraft/textures/particles/${destName}`;
    manifest.particles[clean] = relUrl;
    particleCount++;
  }
  manifest.stats.particles = particleCount;
  console.log(`[AssetPipeline] Ingested ${particleCount} particles into public/assets/minecraft/textures/particles/`);

  // -------------------------------------------------------------------------
  // 7. WRITE MANIFEST.JSON
  // -------------------------------------------------------------------------
  manifest.stats.totalTextures = manifest.stats.blocks + manifest.stats.cracks +
                                manifest.stats.gui + manifest.stats.items +
                                manifest.stats.glint + manifest.stats.particles;

  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                   INGESTION COMPLETED SUCCESSFULLY                   ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Authentic Sounds:        ${String(manifest.stats.sounds).padStart(5, ' ')} audio files                      ║`);
  console.log(`║  Block 16x16 Textures:    ${String(manifest.stats.blocks).padStart(5, ' ')} textures                         ║`);
  console.log(`║  Mining Crack Overlays:   ${String(manifest.stats.cracks).padStart(5, ' ')} stages (0..9)                     ║`);
  console.log(`║  GUI & HUD Elements:      ${String(manifest.stats.gui).padStart(5, ' ')} icons (hearts, armor, hotbar)   ║`);
  console.log(`║  Item Costumes:           ${String(manifest.stats.items).padStart(5, ' ')} weapons, tools, armor, items     ║`);
  console.log(`║  Enchantment Glint:       ${String(manifest.stats.glint).padStart(5, ' ')} animated frames (12 items)       ║`);
  console.log(`║  Particles:               ${String(manifest.stats.particles).padStart(5, ' ')} combat & world particles          ║`);
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  TOTAL TEXTURES:          ${String(manifest.stats.totalTextures).padStart(5, ' ')} PNG/SVG assets                    ║`);
  console.log(`║  Manifest Created:        public/assets/minecraft/manifest.json      ║`);
  console.log(`║  Execution Time:          ${elapsed.padStart(5, ' ')}s                                ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  return manifest;
}

// Execute directly if run as CLI
if (process.argv[1] && process.argv[1].endsWith('ingest_minecraft_assets.js')) {
  runIngestion().catch(err => {
    console.error('[AssetPipeline] FATAL ERROR:', err);
    process.exit(1);
  });
}
