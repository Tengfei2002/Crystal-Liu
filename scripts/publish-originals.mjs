import fs from 'node:fs/promises';
import path from 'node:path';
import {githubHeaders} from './github-auth.mjs';
process.chdir(path.resolve(import.meta.dirname,'..'));
const base='https://api.github.com/repos/Tengfei2002/Crystal-Liu';
const headers=githubHeaders();
async function api(url,method='GET',body){const r=await fetch(url,{method,headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(`GitHub ${method} ${r.status}: ${(await r.text()).slice(0,220)}`);return r.status===204?null:r.json();}
let photos=JSON.parse(await fs.readFile('data/photos.json','utf8'));
for(const year of [...new Set(photos.map(p=>p.year||'undated'))].sort()){
  const tag=`originals-${year}`;
  let release;
  try{release=await api(`${base}/releases/tags/${tag}`)}catch(e){if(!String(e.message).includes('404'))throw e;release=await api(`${base}/releases`,'POST',{tag_name:tag,target_commitish:'main',name:`原尺寸照片 / ${year}`,body:'亦菲影像馆的来源原文件，按文件哈希命名。图片版权及署名归原权利人。出处与日期见 data/photos.json。网页缩略图不会预加载这些文件。',make_latest:'false'});}
  let assets=[];
  for(let page=1;;page++){const a=await api(`${base}/releases/${release.id}/assets?per_page=100&page=${page}`);assets.push(...a);if(a.length<100)break;}
  const byName=new Map(assets.map(a=>[a.name,a]));
  const group=photos.filter(p=>(p.year||'undated')===year);let index=0,done=0;
  await Promise.all(Array.from({length:3},async()=>{while(index<group.length){const p=group[index++];const local=p.originalLocal||p.original;const filename=path.basename(local);let a=byName.get(filename);if(!a){const content=await fs.readFile(local);let attempt=0;while(true){const r=await fetch(release.upload_url.replace(/\{.*$/,'')+`?name=${encodeURIComponent(filename)}`,{method:'POST',headers:{...headers,'Content-Type':'application/octet-stream','Content-Length':String(content.length)},body:content,signal:AbortSignal.timeout(180000)});if(r.ok){a=await r.json();break;}const message=(await r.text()).slice(0,200);if(++attempt>=3)throw Error(`Upload ${r.status} ${filename}: ${message}`);await new Promise(r=>setTimeout(r,2500*attempt));}}
    p.originalLocal=local;p.original=a.browser_download_url;p.originalHosted='github-release';p.hostedAssetId=a.id;
    if(++done%10===0){await fs.writeFile('data/photos.json',JSON.stringify(photos,null,2));console.log(`${year}: ${done}/${group.length} originals hosted`);}
  }}));
  await fs.writeFile('data/photos.json',JSON.stringify(photos,null,2));console.log(`${year}: ${group.length} originals ready`);
}
console.log('All original files hosted; manifest updated.');
