const Jimp = require('jimp');
const path = require('path');

async function run() {
  const filePath = path.join(process.cwd(), 'uploads/campaigns/campaign-1788113976272-828645.png');
  console.log('Loading image...');
  const image = await Jimp.Jimp.read(filePath);
  console.log('Image keys:', Object.keys(image));
  console.log('Image prototype properties:', Object.getOwnPropertyNames(Object.getPrototypeOf(image)));
  console.log('Width:', image.width, 'or', typeof image.getWidth);
  console.log('Height:', image.height, 'or', typeof image.getHeight);
  console.log('mime:', image.mime, 'or', typeof image.getMIME);
  console.log('resize:', typeof image.resize);
  console.log('quality:', typeof image.quality);
}

run().catch(console.error);
