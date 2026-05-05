const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconDir = './assets/icons';
const files = fs.readdirSync(iconDir);

async function checkIcons() {
  for (const file of files) {
    if (file.endsWith('.png')) {
      const metadata = await sharp(path.join(iconDir, file)).metadata();
      console.log(`${file}: ${metadata.width}x${metadata.height}`);
    }
  }
}

checkIcons();
