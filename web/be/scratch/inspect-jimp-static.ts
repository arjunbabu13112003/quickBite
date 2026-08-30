import { Jimp } from 'jimp';

console.log('Jimp static keys:', Object.getOwnPropertyNames(Jimp));
console.log('Jimp prototype keys:', Object.getOwnPropertyNames(Jimp.prototype || {}));
console.log('Jimp decoders:', (Jimp as any).decoders);
console.log('decoders in Jimp:', 'decoders' in Jimp);
