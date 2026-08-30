const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

async function run() {
  const filePath = path.join(process.cwd(), 'uploads/campaigns/campaign-1788113976272-828645.png');
  const outPath = path.join(process.cwd(), 'uploads/campaigns/campaign-1788113976272-828645-test.jpg');
  
  console.log('Reading image...');
  const image = await Jimp.Jimp.read(filePath);
  
  console.log(`Original dimensions: ${image.width}x${image.height}, MIME: ${image.mime}`);
  
  if (image.width > 1024) {
    const w = 1024;
    const h = Math.round((image.height * 1024) / image.width);
    console.log(`Resizing to: ${w}x${h}`);
    image.resize({ w, h });
  }
  
  console.log('Generating compressed JPEG buffer...');
  const buffer = await image.getBuffer('image/jpeg', { quality: 80 });
  
  console.log(`Writing to disk: ${outPath}`);
  fs.writeFileSync(outPath, buffer);
  
  const stats = fs.statSync(outPath);
  console.log(`Compressed file size: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);
}

run().catch(console.error);
