import { Jimp } from 'jimp';
import * as path from 'path';

async function test() {
  const filePath = path.join(process.cwd(), 'uploads/campaigns/campaign-1788113976272-828645.png');
  const image = await Jimp.read(filePath);
  console.log('Jimp loaded file successfully!');
  console.log(`MIME: ${image.mime}`);
  console.log(`Width: ${image.width}`);
  console.log(`Height: ${image.height}`);
}

test().catch(console.error);
