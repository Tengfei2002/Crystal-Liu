import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let sharp;
try { sharp = require('sharp'); } catch { sharp = require(process.env.SHARP_PATH || 'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1116-1220-0_26.1116.1220.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/sharp'); }
const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);
for (const p of ['.cache/pages', 'assets/thumbs', 'assets/originals', 'data']) await fs.mkdir(p, { recursive: true });
const hash = b => createHash('sha256').update(b).digest('hex');
const clean = s => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const dateNow = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
async function readJSON(p, fallback) { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fallback; } }
async function request(url, referer) {
  const r = await fetch(url, { signal: AbortSignal.timeout(25000), headers: {'User-Agent': 'Mozilla/5.0 (compatible; CrystalLiuArchive/1.0)', ...(referer ? {Referer: referer} : {})} });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
}
async function page(url) {
  const p = `.cache/pages/${hash(url).slice(0,24)}.html`;
  try { return await fs.readFile(p, 'utf8'); } catch {}
  const t = await (await request(url)).text();
  await fs.writeFile(p, t);
  return t;
}
async function pool(items, limit, fn) {
  let i = 0;
  await Promise.all(Array.from({length:limit}, async()=> { while(i<items.length) { const n=i++; await fn(items[n], n); } }));
}
function category(text) {
  if (/毕业|学士|毕业典礼/.test(text)) return '毕业照';
  if (/路演|首映|见面会|发布会|宣传活动/.test(text)) return '路演官方照';
  if (/剧照|定妆|剧组|杀青|开机|玫瑰的故事|梦华录|有风的地方|花木兰/.test(text)) return '剧照';
  if (/杂志|封面|ELLE|BAZAAR|VOGUE|时尚芭莎|嘉人|Marie Claire|时装|W黄金时代/i.test(text)) return '杂志写真';
  if (/品牌|代言|宝格丽|BVLGARI|Louis Vuitton|路易威登|LV|天梭|TISSOT|广告|珀莱雅|资生堂|金典|BOLON|Dior|追觅|猫人|芭比波朗/i.test(text)) return '公开广告照';
  if (/盛典|红毯|颁奖|电影节|晚宴|秀|活动|典礼/.test(text)) return '活动照';
  return '微博日常';
}
const oldSources = await readJSON('data/sources.json', []);
const byUrl = new Map(oldSources.map(s=>[s.url,s]));
if (!process.argv.includes('--assets-only')) {
  for (const account of [{uid:'2411492615',name:'红星坞娱乐传媒',kind:'agency'},{uid:'3261134763',name:'刘亦菲',kind:'official'}]) {
    const url = `https://www.sina.cn/media/${account.uid}`;
    try {
      // Refresh account indexes on each run; detail pages are immutable cached evidence.
      const html = await (await request(url)).text();
      const blocks = [...html.matchAll(/<a class="post-link" href="([^"]+)">([\s\S]*?)<\/article>/g)];
      console.log(`${account.name}: ${blocks.length} accessible posts`);
      await pool(blocks, 4, async m => {
        const u = new URL(m[1],url).href;
        if (byUrl.has(u)) return;
        try {
          const t = await page(u);
          // Only the first article's image area; excludes related posts and profile avatars.
          const article = t.split(/<(?:article|div) class="article-content"[^>]*>/)[1]?.split(/<\/article>|class="(?:post-actions|related|comments|comment-list|article-footer|interaction)/)[0] || '';
          const imgArea = article.split(/<div class="(?:recommend|related|comment)/)[0];
          const images = [...new Set([...imgArea.matchAll(/(?:src|data-src)=["'](https?:[^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/gi)].map(m=>m[1].replace(/&amp;/g,'&')).filter(u=>/\/wx\d?\.|\/ww\d?\.|\/w[xt]\d\.|sinaimg\.cn\/(?:large|mw\d+|orj\d+|bmiddle|thumbnail)\//.test(u)))];
          const postText = clean(m[2].match(/class="post-text">([\s\S]*?)<\/div>/)?.[1] || '');
          const description = clean(t.match(/name="description" content="([^"]*)"/)?.[1]||'');
          const title = clean(t.match(/property="title" content="([^"]*)"/)?.[1] || postText).slice(0,120);
          const date = m[2].match(/class="time">(\d{4}-\d{2}-\d{2})/)?.[1] || null;
          // Text-only reposts/public service items and nonportrait-only posts stay out of the gallery.
          if (!images.length || /地震|献血|公祭|勿忘国耻|国家公祭|烈士|纪念抗战/.test(postText)) return;
          byUrl.set(u, {url:u, title, date, category:category(postText+' '+title), sourceName:account.name, sourceKind:account.kind, imageUrls:images, description, notes:'官方账号公开发布；经新浪公开页核验。发布日期不等于拍摄日期。',verifiedAt:dateNow});
        } catch(e) { console.log(`Skipped post ${u}: ${e.message}`); }
      });
      await fs.writeFile('data/sources.json', JSON.stringify([...byUrl.values()],null,2));
    } catch(e) { console.log(`Account index unavailable ${account.name}: ${e.message}`); }
  }
}
const historical = await readJSON('data/historical-sources.json', []);
for (const file of (await fs.readdir('data')).filter(p=>/^additions-[\w-]+\.json$/.test(p)))historical.push(...await readJSON('data/'+file,[]));
for (const s of historical) {
  const previous=byUrl.get(s.url);
  byUrl.set(s.url,{...previous,...s,imageUrls:[...new Set([...(previous?.imageUrls||[]),...(s.imageUrls||[])])],verifiedAt:dateNow});
}
const sources = [...byUrl.values()];
await fs.writeFile('data/sources.json',JSON.stringify(sources,null,2));
let photos = [...new Map([...(await readJSON('data/pending-face-review.json', [])), ...(await readJSON('data/photos.json', []))].map(p=>[p.id,p])).values()];
const excludedIds=new Set((await readJSON('data/exclusions.json',[])).map(x=>x.id));
const knownUrls = new Set(photos.flatMap(p=>[p.originalUrl,...(p.alternateUrls||[])]));
const knownHashes = new Map(photos.map(p=>[p.sha256,p]));
const recentCache=new Map((await readJSON('.cache/recent-probes.json',[])).map(p=>[p.url,p.local]));
const all = sources.flatMap((s,si) => s.imageUrls.map((url,n)=>({s,url,n,si}))).filter(x=>!knownUrls.has(x.url));
const failures = [];
const rejected = [];
let count=0;
console.log(`Downloading ${all.length} candidates; ${photos.length} existing photos`);
await pool(all, 5, async ({s,url,n})=> {
  try {
    const candidate = url.replace(/^http:/,'https:').replace(/\/(?:thumbnail|middle|bmiddle|mw\d+|orj\d+)\//,'/large/');
    let b, actualUrl=candidate;
    const cached=(!Array.isArray(s.imageDimensions)&&s.imageDimensions?.[url]?.reviewFile)||recentCache.get(url);
    if(cached){try{b=await fs.readFile(cached)}catch{}}
    if(!b){try { b=Buffer.from(await (await request(candidate,s.url)).arrayBuffer()); } catch { actualUrl=url.replace(/^http:/,'https:'); b=Buffer.from(await (await request(actualUrl,s.url)).arrayBuffer()); }}
    const info = await sharp(b).metadata();
    if (!info.width || Math.min(info.width,info.height)<160 || b.length>35*1024*1024) throw new Error('image dimensions or file size outside archive limits');
    const digest=hash(b);
    if(excludedIds.has(digest.slice(0,20)))return;
    if(knownHashes.has(digest)) { const p=knownHashes.get(digest); p.alternateUrls=[...new Set([...(p.alternateUrls||[]),url])]; p.sourceUrls=[...new Set([...(p.sourceUrls||[p.sourceUrl]),s.url])]; return; }
    const materialYear=s.originalReleaseYear||(s.date?Number(s.date.slice(0,4)):null);
    const early=materialYear&&materialYear<=2016;
    const minLong=early?900:1600,minShort=early?450:720;
    if(Math.max(info.width,info.height)<minLong||Math.min(info.width,info.height)<minShort){rejected.push({sourceUrl:s.url,imageUrl:actualUrl,width:info.width,height:info.height,reason:`below quality gate ${minLong}px long edge / ${minShort}px short edge`});return;}
    const id=digest.slice(0,20);
    const ext=({jpeg:'jpg',png:'png',webp:'webp',gif:'gif'})[info.format];
    if(!ext) throw new Error('unsupported image format');
    const original=`assets/originals/${id}.${ext}`;
    const thumb=`assets/thumbs/${id}.webp`;
    await fs.writeFile(original,b);
    await sharp(b).rotate().resize({width:480,height:640,fit:'inside',withoutEnlargement:true}).webp({quality:76}).toFile(thumb);
    if(knownHashes.has(digest)) { const p=knownHashes.get(digest); p.alternateUrls=[...new Set([...(p.alternateUrls||[]),url])]; p.sourceUrls=[...new Set([...(p.sourceUrls||[p.sourceUrl]),s.url])]; return; }
    const p={id,albumId:hash(s.url).slice(0,16),title:s.title,date:s.date||null,year:s.date?Number(s.date.slice(0,4)):null,dateType:'published',category:s.category,sourceName:s.sourceName,sourceKind:s.sourceKind,sourceUrl:s.url,sourceUrls:[s.url],originalUrl:actualUrl,alternateUrls:[url],original,thumbnail:thumb,width:info.width,height:info.height,bytes:b.length,sha256:digest,watermark:'unknown',watermarkNote:'尚未逐张人工核验；不去除原有署名或水印',verifiedAt:dateNow,notes:s.notes||'',position:n+1};
    knownHashes.set(digest,p); photos.push(p);
    if(++count%25===0) { console.log(`Saved ${photos.length} unique photos`); await fs.writeFile('.cache/collected-photos.json',JSON.stringify(photos,null,2)); }
  } catch(e) { failures.push({sourceUrl:s.url,imageUrl:url,error:e.message}); }
});
photos.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||a.albumId.localeCompare(b.albumId)||a.position-b.position);
await fs.writeFile('.cache/collected-photos.json',JSON.stringify(photos,null,2));
await fs.writeFile('data/failures.json',JSON.stringify(failures,null,2));
await fs.writeFile('data/quality-rejections.json',JSON.stringify(rejected,null,2));
console.log(JSON.stringify({candidates:photos.length,newFiles:count,failures:failures.length,qualityRejected:rejected.length,output:'.cache/collected-photos.json',next:'Visually review every new candidate, record approved IDs and hashes in data/face-review.json, then run scripts/curate.mjs. Public gallery has not been changed.'}));
