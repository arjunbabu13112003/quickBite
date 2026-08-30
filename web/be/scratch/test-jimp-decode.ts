import { Jimp } from 'jimp';
import * as path from 'path';
import * as fs from 'fs';

async function run() {
  const file = 'campaign-1788115141010-17976.jpg';
  const diskPath = path.join(process.cwd(), 'uploads/campaigns', file);
  console.log('File path:', diskPath);
  console.log('File exists:', fs.existsSync(diskPath));
  console.log('File size:', fs.statSync(diskPath).size);

  console.log('Reading with Jimp with options via fromBuffer...');
  try {
    const fileBuffer = fs.readFileSync(diskPath);
    const image = await Jimp.fromBuffer(fileBuffer, {
      'image/jpeg': { maxMemoryUsageInMB: 1024 }
    });
    console.log('Read success!');
    console.log('Width:', image.width);
    console.log('Height:', image.height);
    console.log('MIME:', image.mime);
  } catch (err) {
    console.error('Jimp read failed:', err);
  }
}

run().catch(console.error);
