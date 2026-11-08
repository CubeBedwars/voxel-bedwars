const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';

function getPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') {
    return null;
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20)
  };
}

const samples = [
  '7377ded3b3d8beea0c64073c82b866c5.png', // dirt 1
  '102d7ecee30950972f12d4dddfc8b0bc.png', // dirt 2
  'f1a2c6bfbdf347a3f8c223171be6489c.png', // dirt p 1
  '9cfc7ad1cc9f44fd8caa7d6d0931a318.png', // item_dirt
  '0d79497ab8f00ed10ef7f5d675241173.png', // hotbar
  '3676dcca0b16796069d375678c9a478f.png', // selected item hotbar
  'a4d145fc9f98df5d6e4567bcdf975e98.png', // item_red_wool
  '7c5f49cb01cc193ab4f5f75ee805db36.png'  // item_wooden_sword
];

for (const s of samples) {
  const p = path.join(refDir, s);
  console.log(s, getPngDimensions(p));
}
