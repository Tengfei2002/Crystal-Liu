import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
process.chdir(path.resolve(import.meta.dirname,'..'));
const photos=JSON.parse(await fs.readFile('data/photos.json','utf8'));
await fs.mkdir('assets/originals',{recursive:true});
let index=0,count=0;
await Promise.all(Array.from({length:3},async()=>{while(index<photos.length){const p=photos[index++];const local=p.originalLocal||`assets/originals/${p.id}.${new URL(p.original).pathname.split('.').pop()}`;try{const b=await fs.readFile(local);if(createHash('sha256').update(b).digest('hex')===p.sha256)continue;}catch{}
if(!p.original.startsWith('https://github.com/Tengfei2002/Crystal-Liu/releases/download/'))throw Error(`Original not hosted ${p.id}`);
let b;for(let i=0;i<4;i++){try{const r=await fetch(p.original,{signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(`HTTP ${r.status}`);b=Buffer.from(await r.arrayBuffer());if(createHash('sha256').update(b).digest('hex')!==p.sha256)throw Error('Hash mismatch');break;}catch(e){if(i===3)throw e;await new Promise(r=>setTimeout(r,2000*(i+1)))}}
await fs.writeFile(local,b);if(++count%10===0)console.log(`${count} original files restored`);
}}));
console.log(`Local original files ready: ${photos.length}`);
