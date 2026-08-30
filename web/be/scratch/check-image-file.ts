import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const filePath = path.join(process.cwd(), 'uploads/campaigns/campaign-1788113976272-828645.png');
  console.log(`Checking file: ${filePath}`);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`File size: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.log('File not found!');
  }
}

run().catch(console.error);
