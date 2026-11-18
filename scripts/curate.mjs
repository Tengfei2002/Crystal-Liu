import fs from 'node:fs/promises';
import path from 'node:path';
process.chdir(path.resolve(import.meta.dirname,'..'));
const read=async(p,fallback=[])=>{try{return JSON.parse(await fs.readFile(p,'utf8'))}catch{return fallback}};
const aliases={'广告宣传':'公开广告照','路演':'路演官方照','杂志':'杂志写真','写真':'杂志写真'};
const sources=new Map((await read('data/sources.json')).map(s=>[s.url,s]));
for(const s of await read('data/historical-sources.json'))sources.set(s.url,s);
for(const file of(await fs.readdir('data')).filter(p=>/^additions-[\w-]+\.json$/.test(p))){for(const s of await read('data/'+file)){const old=sources.get(s.url);sources.set(s.url,{...old,...s,imageUrls:[...new Set([...(old?.imageUrls||[]),...(s.imageUrls||[])])]});}}
for(const s of sources.values())s.category=aliases[s.category]||s.category;
const annotations=await read('data/annotations.json',{});
const exclusionIds=new Set((await read('data/exclusions.json')).map(x=>x.id));
const faceReview=await read('data/face-review.json',{});
const approvals=new Map((faceReview.approved||[]).map(p=>[p.id,p]));
const records=[...new Map([...(await read('data/pending-face-review.json')),...(await read('data/photos.json')),...(await read('.cache/collected-photos.json'))].map(p=>[p.id,p])).values()];
const pending=[];
const unique=new Map();
for(const p of records){
  if(exclusionIds.has(p.id))continue;
  const approval=approvals.get(p.id);
  if(!approval||approval.sha256!==p.sha256){pending.push(p);continue;}
  p.faceReviewed=true;p.faceReviewedAt=approval.reviewedAt;
  const s=sources.get(p.sourceUrl);
  if(s){p.title=s.title;p.category=s.category;p.sourceName=s.sourceName;p.sourceKind=s.sourceKind;p.date=s.date||null;p.publicationMonth=s.publicationMonth||null;p.originalReleaseYear=s.originalReleaseYear||null;p.year=p.originalReleaseYear||(s.date?Number(s.date.slice(0,4)):s.publicationMonth?Number(s.publicationMonth.slice(0,4)):null);p.yearBasis=p.originalReleaseYear?'verified-material-year':p.publicationMonth&&!p.date?'source-publication-month':'source-publication';p.notes=s.notes||p.notes;}
  p.category=aliases[p.category]||p.category;
  if(annotations[p.id])Object.assign(p,annotations[p.id]);
  const old=unique.get(p.sha256);
  if(!old){unique.set(p.sha256,p);continue;}
  const chosen=(p.date&&(!old.date||p.date<old.date))?p:old;
  chosen.sourceUrls=[...new Set([...(old.sourceUrls||[old.sourceUrl]),...(p.sourceUrls||[p.sourceUrl])])];
  chosen.alternateUrls=[...new Set([...(old.alternateUrls||[]),...(p.alternateUrls||[])])];
  unique.set(p.sha256,chosen);
}
const deduped=new Map([...unique.values()].map(p=>[p.id,p]));
const reviewedDuplicates=await read('data/duplicates.json');
for(const d of reviewedDuplicates){const keep=deduped.get(d.keep),other=deduped.get(d.remove);if(!keep)continue;keep.sourceUrls=[...new Set([...(keep.sourceUrls||[keep.sourceUrl]),...(other?.sourceUrls||d.sourceUrls||[d.sourceUrl])].filter(Boolean))];keep.alternateUrls=[...new Set([...(keep.alternateUrls||[]),...(other?.alternateUrls||d.alternateUrls||[])])];const primary=d.primarySourceUrl&&sources.get(d.primarySourceUrl);if(primary&&d.primarySourceUrl!==keep.sourceUrl){keep.originalFileSourceUrl=keep.originalFileSourceUrl||keep.sourceUrl;keep.sourceUrl=primary.url;keep.sourceName=primary.sourceName;keep.sourceKind=primary.sourceKind;keep.title=primary.title;keep.category=primary.category;keep.date=primary.date||null;keep.publicationMonth=primary.publicationMonth||null;keep.originalReleaseYear=primary.originalReleaseYear||null;keep.year=keep.originalReleaseYear||(keep.date?Number(keep.date.slice(0,4)):keep.publicationMonth?Number(keep.publicationMonth.slice(0,4)):null);keep.notes=primary.notes+'；此底图有多个公开版本，保留较高分辨率文件，所有出处合并记录。';}deduped.delete(d.remove);}
const photos=[...deduped.values()].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||a.albumId.localeCompare(b.albumId)||a.position-b.position);
for(const p of photos){p.dateType=p.date?'published':p.publicationMonth?'publication-month':'unknown';p.notes=(p.notes||'').replace(/\bdate\b/g,'来源页日期');}
const updatedAt=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const currentYear=Number(updatedAt.slice(0,4));
const failures=await read('data/failures.json');
const report={updatedAt,photos:photos.length,albums:new Set(photos.map(p=>p.albumId)).size,originalBytes:photos.reduce((s,p)=>s+p.bytes,0),sourcePages:sources.size,failedImages:failures.length,excludedNonPortraitImages:exclusionIds.size,reviewedDuplicateMerges:reviewedDuplicates.length,hostedOriginals:photos.filter(p=>p.originalHosted==='github-release').length,watermarkReviewed:photos.filter(p=>p.watermark!=='unknown').length,complete:false,deduplication:'SHA-256文件内容精确去重，并经人工对照合并部分同一底图的压缩/署名版本；其余相似版本仍需持续复核。',scope:'官方账号、经纪公司、品牌、杂志、剧方及专业媒体公开照片；不含饭拍、视频截图或生成图。',yearCoverage:Array.from({length:currentYear-2001},(_,i)=>({year:2002+i,photos:photos.filter(p=>p.year===2002+i).length,status:photos.some(p=>p.year===2002+i)?'partial':'missing'})),gaps:['各年份均为部分收录，仍需从原始发布渠道持续补齐','Instagram仅核验到少量公开原帖，预览版本不等于完整轮播或最高分辨率原图','毕业报道资料肖像不等于毕业典礼照，正式毕业照仍待可靠来源核实','未逐张人工检查的照片，水印状态保持待核验','网页原尺寸指来源可获取版本，不保证摄影师底片','不同文件格式、压缩和裁剪版本仍需继续进行人工相似图复核']};
await fs.writeFile('data/sources.json',JSON.stringify([...sources.values()],null,2));
await fs.writeFile('data/photos.json',JSON.stringify(photos,null,2));
report.faceReview={reviewedCandidates:faceReview.reviewedCandidates,removedThisReview:faceReview.removedThisReview,approved:photos.length,pending:pending.length,reviewedAt:faceReview.reviewedAt,criteria:faceReview.criteria};
report.coverPhotoId=photos.some(p=>p.id===faceReview.coverPhotoId)?faceReview.coverPhotoId:photos[0]?.id;
await fs.writeFile('data/report.json',JSON.stringify(report,null,2));
await fs.writeFile('data/pending-face-review.json',JSON.stringify(pending,null,2));
await fs.rm('.cache/collected-photos.json',{force:true});
console.log(JSON.stringify({photos:photos.length,albums:report.albums,coveredYears:report.yearCoverage.filter(y=>y.photos).length,hosted:report.hostedOriginals,watermarkReviewed:report.watermarkReviewed}));
