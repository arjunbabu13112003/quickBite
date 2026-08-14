const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputLogo = 'assets/quickbite-logo.png';
const resDir = 'android/app/src/main/res';

const sizes = {
  mdpi: { standard: 48, adaptive: 108 },
  hdpi: { standard: 72, adaptive: 162 },
  xhdpi: { standard: 96, adaptive: 216 },
  xxhdpi: { standard: 144, adaptive: 324 },
  xxxhdpi: { standard: 192, adaptive: 432 }
};

async function generate() {
  for (const [dpi, config] of Object.entries(sizes)) {
    const dir = path.join(resDir, `mipmap-${dpi}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 1. ic_launcher.png (Legacy Square/Standard)
    // Create standard size with white background
    await sharp(inputLogo)
      .resize(config.standard, config.standard, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toFile(path.join(dir, 'ic_launcher.png'));

    // 2. ic_launcher_round.png (Legacy Round)
    // Create a circular mask
    const roundMask = Buffer.from(
      `<svg><circle cx="${config.standard/2}" cy="${config.standard/2}" r="${config.standard/2}" /></svg>`
    );
    await sharp(inputLogo)
      .resize(config.standard, config.standard, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .composite([{ input: roundMask, blend: 'dest-in' }])
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // 3. ic_launcher_foreground.png (Adaptive Foreground)
    // Adaptive icon foreground should have a transparent background or white.
    // Our logo already has a white bg, but for adaptive foreground, transparent is better.
    // Actually, `quickbite-logo.png` generated earlier has a white background.
    // The mask safe area is a circle of diameter 66/108 (approx 61%).
    // We resize it so the logo fits inside the safe area.
    // The previous `process-logo.js` padded the original image. 
    // Wait, the input logo `assets/quickbite-logo.png` IS ALREADY PADDED and squared.
    // We can just resize it directly for the foreground!
    await sharp(inputLogo)
      .resize(config.adaptive, config.adaptive, { fit: 'contain' })
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));
      
    // 4. ic_launcher_background.png (Adaptive Background)
    // A simple solid white image.
    await sharp({
      create: {
        width: config.adaptive,
        height: config.adaptive,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .png()
    .toFile(path.join(dir, 'ic_launcher_background.png'));
  }
  console.log('All launcher icons generated successfully!');
}

generate().catch(console.error);
