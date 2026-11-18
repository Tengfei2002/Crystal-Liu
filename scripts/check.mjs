import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.chdir(path.resolve(import.meta.dirname,'..'));
const photos=JSON.parse(await fs.readFile('data/photos.json','utf8'));
const report=JSON.parse(await fs.readFile('data/report.json','utf8'));
assert(photos.length>0,'No photos collected');
assert.equal(new Set(photos.map(p=>p.id)).size,photos.length,'Duplicate image IDs');
assert.equal(new Set(photos.map(p=>p.sha256)).size,photos.length,'Duplicate file hashes');
const sourceUrls=new Set(JSON.parse(await fs.readFile('data/sources.json','utf8')).map(s=>s.url));
const approvals=new Map(JSON.parse(await fs.readFile('data/face-review.json','utf8')).approved.map(p=>[p.id,p.sha256]));
const exclusions=new Set(JSON.parse(await fs.readFile('data/exclusions.json','utf8')).map(p=>p.id));
const categories=new Set(['微博日常','Instagram','公开广告照','杂志写真','剧照','路演官方照','毕业照','媒体照','活动照']);
let thumbs=0,total=0;
for(const p of photos){
  assert(p.faceReviewed===true&&approvals.get(p.id)===p.sha256&&!exclusions.has(p.id),`Photo requires visual review ${p.id}`);
  assert(sourceUrls.has(p.sourceUrl),`Missing provenance ${p.id}`);
  assert(/^https:\/\//.test(p.sourceUrl),`Invalid source URL ${p.id}`);
  assert(categories.has(p.category),`Unknown category ${p.category}`);
  assert(['none','present','unknown'].includes(p.watermark),'Invalid watermark status');
  assert(p.date===null||/^\d{4}-\d{2}-\d{2}$/.test(p.date),'Invalid date format');
  assert.equal(p.year,p.originalReleaseYear||(p.date?Number(p.date.slice(0,4)):p.publicationMonth?Number(p.publicationMonth.slice(0,4)):null));
  assert(p.width>0&&p.height>0&&p.bytes>0);
  assert((p.original.startsWith('assets/originals/')||p.original.startsWith('https://github.com/Tengfei2002/Crystal-Liu/releases/download/'))&&p.thumbnail.startsWith('assets/thumbs/'));
  if(process.argv.includes('--full')){const b=await fs.readFile(p.originalLocal||p.original);assert.equal(b.length,p.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256,`Original corrupted ${p.id}`);}
  total+=p.bytes;
  const t=await fs.stat(p.thumbnail);assert(t.size>100);thumbs+=t.size;
}
assert.equal(report.photos,photos.length);assert.equal(report.albums,new Set(photos.map(p=>p.albumId)).size);assert.equal(report.originalBytes,total);assert.equal(report.complete,false);
if(process.env.GITHUB_ACTIONS)assert(photos.every(p=>p.originalHosted==='github-release'),'Every online original must be uploaded before publication');
for(const y of report.yearCoverage)assert.equal(y.photos,photos.filter(p=>p.year===y.year).length);
const html=await fs.readFile('index.html','utf8');const js=await fs.readFile('app.js','utf8');
assert(html.includes('id="copyPrompt"'));assert(html.includes('<dialog'));assert(js.includes("img.loading='lazy'"));assert(js.includes('img.src=originalFile(p)'));assert(!html.includes('assets/originals/'),'Originals must not be embedded in initial HTML');
console.log(JSON.stringify({status:'passed',photos:photos.length,albums:report.albums,originalsMB:Math.round(total/1e6),thumbnailsMB:Math.round(thumbs/1e6),listImageSavings:`${(100*(1-thumbs/total)).toFixed(1)}%`,coveredYears:report.yearCoverage.filter(y=>y.photos).map(y=>y.year)}));
