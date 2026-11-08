const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const imagesSprite = pj.targets.find(t => t.name === '_IMAGES');
let startBlock = null;
for (const [id, block] of Object.entries(imagesSprite.blocks)) {
  if (block.opcode === 'procedures_definition') {
    const customBlock = imagesSprite.blocks[block.inputs.custom_block[1]];
    if (customBlock.mutation.proccode.startsWith('LoadNewImage')) {
      startBlock = block;
      break;
    }
  }
}

let curr = startBlock.next;
while (curr) {
  const b = imagesSprite.blocks[curr];
  console.log(`Block ${curr}: opcode=${b.opcode}, fields=${JSON.stringify(b.fields)}, inputs=${JSON.stringify(b.inputs)}`);
  curr = b.next;
}
