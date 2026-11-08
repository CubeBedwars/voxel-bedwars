const fs = require('fs');
const path = require('path');

const refDir = 'C:/Users/alekhyo/.gemini/antigravity/scratch/scratch_minecraft_ref';
const pj = JSON.parse(fs.readFileSync(path.join(refDir, 'project.json'), 'utf8'));

const imagesSprite = pj.targets.find(t => t.name === '_IMAGES');
for (const [id, block] of Object.entries(imagesSprite.blocks)) {
  if (block.opcode === 'procedures_definition') {
    const customBlock = imagesSprite.blocks[block.inputs.custom_block[1]];
    console.log('Procedure:', customBlock.mutation.proccode);
  }
}
