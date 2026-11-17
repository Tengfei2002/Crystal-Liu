import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
process.chdir(path.resolve(import.meta.dirname,'..'));
const require=createRequire(import.meta.url);let sharp;try{sharp=require('sharp')}catch{sharp=require(process.env.SHARP_PATH||'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1116-1220-0_26.1116.1220.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/sharp')}
const photos=JSON.parse(await fs.readFile('data/photos.json','utf8'));const list=[];
for(const p of photos){const b=await sharp(p.thumbnail).resize(9,8,{fit:'fill'}).greyscale().raw().toBuffer();let h=0n;for(let y=0;y<8;y++)for(let x=0;x<8;x++)h=(h<<1n)|BigInt(b[y*9+x]>b[y*9+x+1]);list.push({p,h})}
const distance=(a,b)=>{let x=a^b,n=0;while(x){x&=x-1n;n++}return n};const pairs=[];
for(let i=0;i<list.length;i++)for(let j=0;j<i;j++){const a=list[i],b=list[j];if(a.p.sha256===b.p.sha256)continue;const delta=distance(a.h,b.h);if(delta<=2&&Math.abs(a.p.width/a.p.height-b.p.width/b.p.height)<0.05)pairs.push({a:a.p.id,b:b.p.id,distance:delta,aThumbnail:a.p.thumbnail,bThumbnail:b.p.thumbnail});}
await fs.mkdir('.cache',{recursive:true});await fs.writeFile('.cache/similar.json',JSON.stringify(pairs,null,2));console.log(`Review candidates: ${pairs.length}; no photos removed automatically`);
