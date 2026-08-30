import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import * as FormData from 'form-data';

async function testCatbox() {
  const filePath = path.join(process.cwd(), 'uploads/campaigns/campaign-1788113976272-828645.png');
  console.log(`Checking if file exists at: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.error('File does not exist!');
    return;
  }

  console.log('File found! Uploading to catbox.moe...');
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', fs.createReadStream(filePath));

  try {
    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    const resultText = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log(`Result: ${resultText}`);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

testCatbox().catch(console.error);
