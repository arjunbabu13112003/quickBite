const Jimp = require('jimp');
console.log('Jimp.read:', Jimp.read);
console.log('Jimp.Jimp.read:', Jimp.Jimp.read);
if (Jimp.Jimp && Jimp.Jimp.prototype) {
  console.log('Jimp prototype keys:', Object.getOwnPropertyNames(Jimp.Jimp.prototype));
}
