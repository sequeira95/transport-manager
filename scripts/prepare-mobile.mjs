import fs from 'node:fs';
import path from 'node:path';

const distMobile = path.resolve('dist', 'mobile', 'index.html');
const distRoot = path.resolve('dist', 'index.html');

if (fs.existsSync(distMobile)) {
  fs.copyFileSync(distMobile, distRoot);
  console.log('[prepare-mobile] dist/mobile/index.html copiado exitosamente a dist/index.html');
} else {
  console.warn('[prepare-mobile] Advertencia: dist/mobile/index.html no fue encontrado.');
}
