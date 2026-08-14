const sharp = require('sharp');
const fs = require('fs');

async function processLogo() {
  const inputPath = 'C:\\Users\\arjun\\.gemini\\antigravity-ide\\brain\\3a062ada-5c6b-46e1-9f5d-71ff81952e3b\\media__1786507745148.jpg';
  const outputPath = 'assets/quickbite-logo.png';

  try {
    // We'll read the image, resize it to fit within 768x768 (giving it ~25% padding on 1024x1024),
    // and place it on a 1024x1024 white background.
    await sharp(inputPath)
      .resize({
        width: 600,
        height: 600,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .extend({
        top: 212,
        bottom: 212,
        left: 212,
        right: 212,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(outputPath);
    
    console.log('Logo processed and saved to', outputPath);
  } catch (err) {
    console.error('Error processing logo:', err);
  }
}

processLogo();
