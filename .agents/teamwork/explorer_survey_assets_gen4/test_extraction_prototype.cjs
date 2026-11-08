const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
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

function createPng(width, height, rgbaBuffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  
  const scanlineLength = width * 4;
  const rawData = Buffer.alloc(height * (scanlineLength + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (scanlineLength + 1);
    rawData[rowStart] = 0;
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

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const stage = pj.targets.find(t => t.name === 'Stage');

let imgNames, imgWidths, imgHeights, imgIndexes, imgColours;
for (const [id, [name, val]] of Object.entries(stage.lists)) {
  if (name === '_Images Names') imgNames = val;
  if (name === '_Images Widths') imgWidths = val;
  if (name === '_Images Heights') imgHeights = val;
  if (name === '_Images Indexes') imgIndexes = val;
  if (name === '_Images Colours') imgColours = val;
}

// Convert a block from _Images Colours to PNG buffer
function extractBlockPng(name) {
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
  return createPng(w, h, rgba);
}

// Test extraction of red wool, stone bricks, obsidian, and crack stage 5
const testBlocks = ['red wool', 'cracked stone bricks', 'obsidian', 'cursor 5'];
for (const b of testBlocks) {
  const buf = extractBlockPng(b);
  console.log(`Extracted "${b}": size = ${buf ? buf.length : 'NULL'} bytes`);
}
