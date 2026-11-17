import fs from 'node:fs/promises';
import path from 'node:path';
process.chdir(path.resolve(import.meta.dirname,'..'));
const photos=JSON.parse(await fs.readFile('data/photos.json','utf8'));
const report=JSON.parse(await fs.readFile('data/report.json','utf8'));
const json=JSON.stringify({photos,report}).replaceAll('<','\\u003c');
await fs.writeFile('data/archive.js',`window.CRYSTAL_ARCHIVE=${json};\n`);
console.log(`Prepared offline manifest: ${photos.length} photos`);
