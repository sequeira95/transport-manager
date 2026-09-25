import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

const distDir = path.resolve('dist');
const outputFile = path.resolve('dist.zip');

if (!fs.existsSync(distDir)) {
  console.error('[create-ota-bundle] Error: dist/ no existe. Ejecuta npm run build primero.');
  process.exit(1);
}

const output = fs.createWriteStream(outputFile);
const archive = new ZipArchive({ zlib: { level: 9 } });

output.on('close', () => {
  const sizeKb = (archive.pointer() / 1024).toFixed(1);
  console.log(`[create-ota-bundle] dist.zip creado exitosamente (${sizeKb} KB) en: ${outputFile}`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Agregar archivos de dist/ excepto _worker.js
archive.glob('**/*', {
  cwd: distDir,
  ignore: ['_worker.js/**', '_worker.js']
});

archive.finalize();
