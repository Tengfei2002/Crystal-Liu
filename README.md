# 亦菲影像馆 / Crystal Liu Archive

刘亦菲公开照片的可追溯档案。网站地址以 GitHub Pages 实际部署结果为准；默认项目地址为 https://tengfei2002.github.io/Crystal-Liu/ 。

## 浏览

按年份、类别、来源、水印状态和关键词筛选。列表只加载本地 WebP 缩略图，每批60张；点击后才请求原尺寸文件，支持键盘左右翻页、Esc关闭和文件下载。页尾可一键复制针对本仓库的更新提示词。

## 收录范围与限制

收录本人、经纪公司、品牌、杂志、剧方、主办方及专业媒体的公开照片，不收饭拍、视频截图或生成图。当前是持续补录中的部分集合，绝不代表出道以来全部照片。每年的数量、缺失来源、更新时间详见 `data/report.json` 和网站收录进度。

年份以已核验的来源发布日期为准，不假装是拍摄日期。日期无法核实则为 null。毕业照与 Instagram 在找到可核验原始发布页前保留待补状态。图片来源页与原图地址分开保存；从本人/经纪公司微博的新浪公开页提取时只读主文章图片，排除相关推荐和头像。

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
node scripts/publish-originals.mjs
node scripts/curate.mjs
npm run prepare
npm run check
```

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

`sourceKind` 取 official、agency、brand、magazine、drama、media、instagram。类别取 微博日常、Instagram、公开广告照、杂志写真、剧照、路演官方照、毕业照、媒体照、活动照。内容自动分类仅是初步建议，需编辑校正。

缩略图、清单与网页代码在普通 Git 文件树中。原文件本地保留一份，并按年份存放于本仓库 Releases，避免微博防盗链及过期地址，也避免 GitHub Pages 发布包体积超限。网页点击后才加载 Releases 原文件，本地 HTML 则读取 originalLocal。上传脚本通过 Git 标准凭据管理器复用已有 GitHub 登录，凭据仅在内存使用，不写入仓库或日志。新克隆后没有原图的用户可运行恢复脚本。更大规模收藏应迁移原图到对象存储，避免将数十GB原图直接加入普通 Git 历史。

`data/annotations.json` 保存逐张人工核验的水印结论；`data/exclusions.json` 保存经目视检查不含本人的物件、风景等图的排除记录。`curate.mjs` 会修正历史来源分类、保留最早已知发布日期、合并相同文件出处并应用这两份清单。自动提取只给出候选，不替代内容审核。运行 `node scripts/check.mjs --full` 会额外校验本地每张原图的内容哈希。

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
