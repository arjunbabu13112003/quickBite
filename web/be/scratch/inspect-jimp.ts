import { Jimp } from 'jimp';

console.log('Jimp properties:', Object.keys(Jimp));
if ((Jimp as any).decoders) {
  console.log('Jimp.decoders:', Object.keys((Jimp as any).decoders));
}
// Let's also check if Jimp constructor/instance has decoders or configuration
const j = new (Jimp as any)();
console.log('Jimp instance keys:', Object.keys(j));
