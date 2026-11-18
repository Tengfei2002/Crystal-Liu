# 亦菲影像馆 / Crystal Liu Archive

刘亦菲公开照片的可追溯档案。网站地址以 GitHub Pages 实际部署结果为准；默认项目地址为 https://tengfei2002.github.io/Crystal-Liu/ 。

## 浏览

按年份、类别、来源、水印状态和关键词筛选。列表只加载本地 WebP 缩略图，支持24/60/120张分页、页码切换及直接跳页；每页只渲染当前页缩略图，点击后才请求原尺寸文件，支持键盘左右翻页、Esc关闭和文件下载。页尾可一键复制针对本仓库的更新提示词。

## 收录范围与限制

收录本人、经纪公司、品牌、杂志、剧方、主办方、专业媒体及可追溯的正式物料存档转载，不收饭拍、视频截图或生成图。必须包含可辨认的本人面部，排除相关推荐、纯物件、其他演员单人照、动画、纯背影、面部完全遮挡与无法辨认面部的远景；正常侧脸和清晰全身照可保留。缩略图完整显示，不做中心裁切。当前是持续补录中的部分集合，绝不代表出道以来全部照片。每年的数量、缺失来源、更新时间详见 `data/report.json` 和网站收录进度。

年份优先采用正文明确可核验的物料年份 originalReleaseYear，不明时按来源发布日期或已确认的年月归档。转载发布日期与原物料年份分开记录，不假装是拍摄日期。日期只能核实到月份时使用 publicationMonth，date 保持 null。毕业照与 Instagram 在找到可核验原始发布页前保留待补状态。图片来源页与原图地址分开保存；从本人/经纪公司微博的新浪公开页提取时只读主文章图片，排除相关推荐和头像。

原尺寸文件保存来源提供的最高可获取版本，不等于摄影师 RAW 底片，不放大图片冒充高清。保留所有署名和水印，watermark 默认 unknown；只有逐张人工核验后才能设为 none 或 present。“无水印”指照片无叠加水印，品牌广告画面中的原生文字不应擅自删除。

以 SHA-256 对下载字节精确去重。同一图片的不同压缩、裁剪、调色版本经相似图候选检测和人工对照后合并，记录在 data/duplicates.json；尚未复核的相似图不自动删除。所有图片版权归原权利人所有，不授予转载或商用许可。需要移除或更正，请通过 Issues 提供图片 ID 与对应来源。

## 本地运行与更新

需要 Node.js 22 或更高版本。

```sh
npm install
npm start
```

浏览器打开 http://127.0.0.1:4173/ 。本地原图齐全时，也可直接双击 index.html 离线浏览，无需启动服务。页面通过 data/archive.js 读取离线索引，不依赖 file:// 下受限的网页数据请求。

当前工作目录已保存原文件。如果从 GitHub 新克隆仓库，原图位于 Releases，先运行 `node scripts/restore-originals.mjs` 下载并校验原图，再双击 HTML；下载量见 data/report.json 的 originalBytes。

```sh
npm run collect
# 逐张审核候选并更新 data/face-review.json 的 approved（ID 与 SHA-256）
node scripts/curate.mjs
node scripts/publish-originals.mjs
node scripts/curate.mjs
npm run prepare
npm run check
```

`collect` 仅将候选索引写入 `.cache/collected-photos.json`，不会直接修改公开图库。须逐张检查画面与来源，将通过审核的 id、sha256、reviewedAt 记入 `data/face-review.json` 的 approved；`curate.mjs` 仅发布 ID 与内容哈希均获准的图片，其余保存在 `data/pending-face-review.json`。禁止按标题或整组来源批量放行。

`collect` 增量读取公开可访问的本人微博及经纪公司索引，保存原尺寸文件、生成480px以内缩略图、记录来源并精确去重。公开索引可能只返回最近100条，无法替代登录后的完整微博历史；脚本不绕过登录或访问限制。来源失败不会伪造成功；未下载图片记录在 `data/failures.json`。历史正文缓存位于忽略提交的 `.cache/pages/`，来源页修改时需要人工删除对应缓存后重新核验。

历史来源可添加到 `data/historical-sources.json`，每条格式：

```json
{
  "url": "https://example.org/verified-publication",
  "title": "经核验的发布标题",
  "date": "2024-01-01",
  "category": "媒体照",
  "sourceName": "发布机构",
  "sourceKind": "media",
  "imageUrls": ["https://example.org/actual-photo.jpg"],
  "notes": "来源及日期的核验依据"
}
```

`sourceKind` 取 official、agency、brand、magazine、drama、media、archive、repost、instagram。类别取 微博日常、Instagram、公开广告照、杂志写真、剧照、路演官方照、毕业照、媒体照、活动照。内容自动分类仅是初步建议，需编辑校正。

缩略图、清单与网页代码在普通 Git 文件树中。原文件本地保留一份，并按年份存放于本仓库 Releases，避免微博防盗链及过期地址，也避免 GitHub Pages 发布包体积超限。网页点击后才加载 Releases 原文件，本地 HTML 则读取 originalLocal。上传脚本通过 Git 标准凭据管理器复用已有 GitHub 登录，凭据仅在内存使用，不写入仓库或日志。新克隆后没有原图的用户可运行恢复脚本。更大规模收藏应迁移原图到对象存储，避免将数十GB原图直接加入普通 Git 历史。

`data/annotations.json` 保存逐张人工核验的水印结论；`data/exclusions.json` 保存经目视检查不含本人的物件、风景等图的排除记录。`curate.mjs` 会修正历史来源分类、保留最早已知发布日期、合并相同文件出处并应用这两份清单。`data/face-review.json` 记录逐张目视通过的图片 ID 与内容哈希；检查脚本会阻止未审核或已排除的图片发布。自动提取只给出候选，不替代内容审核。运行 `node scripts/check.mjs --full` 会额外校验本地每张原图的内容哈希。

## 发布

仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions。提交 main 会运行 `.github/workflows/pages.yml`，检查全部文件后发布。工作流不自动抓取新图；更新需要实际执行收集、人工核验并提交。复制提示词本身不触发更新。

## 文件

- `data/photos.json`：照片索引、尺寸、哈希、水印状态、发布时间、所有已知发布来源。
- `data/sources.json`：核验过的发布页与原始图像地址。
- `data/report.json`：实际数量、逐年覆盖与已知缺口。
- `data/historical-sources.json`：历史来源补录清单。
- `assets/thumbs/`：轻量 WebP 缩略图。
- `assets/originals/`：来源提供的原尺寸文件。

页面不使用加粗样式，不包含追踪脚本、账号登录或付费功能。

本轮新增门槛：近期照片长边至少1600px且短边至少720px；2002–2016年旧物料优先长边至少900px、短边至少450px，并检查实际清晰度。不得将小图放大、AI修复或带社交平台界面的截图当作原图。明确的品牌海报和杂志版面保留原生文字，不擅自去水印。公开Instagram仅提供低清预览、小红书匿名页面不返回原图时，不以这些图充数；可追溯同组照片的品牌/杂志原始发布源。
