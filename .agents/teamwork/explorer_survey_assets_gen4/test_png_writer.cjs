const fs = require('fs');
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
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  // IDAT (filter byte 0 prepended to each scanline)
  const scanlineLength = width * 4;
  const rawData = Buffer.alloc(height * (scanlineLength + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (scanlineLength + 1);
    rawData[rowStart] = 0; // filter type 0 (None)
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

console.log('Testing createPng for 16x16 test image...');
const testRgba = Buffer.alloc(16 * 16 * 4);
for (let i = 0; i < 16 * 16; i++) {
  testRgba[i * 4] = 255; // R
  testRgba[i * 4 + 1] = 0; // G
  testRgba[i * 4 + 2] = 0; // B
  testRgba[i * 4 + 3] = 255; // A
}
const pngBuf = createPng(16, 16, testRgba);
console.log('Generated PNG buffer size:', pngBuf.length);
fs.writeFileSync('C:/Users/alekhyo/.gemini/antigravity/scratch/voxel-bedwars/.agents/teamwork/explorer_survey_assets_gen4/test_red.png', pngBuf);
console.log('Saved test_red.png successfully!');
