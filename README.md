# cici-cv · Cecilia 的设计世界

## 当前统一入口

`index.html` 进入 `/cecilia-world/hub.html`：全屏可拖动的开放场景，四类入口为个人简历、作品集、其他项目、联系方式；没有驾驶系统或重复顶部分类栏。中文使用小赖字体，模型、色板、光照及后期来自已确认的 Bruno 官方 MIT 工程。来源、版权和固定提交见 `experiments/bruno-projects/ASSET_SOURCE.md`，完整许可证随资源发布。

- `hub.html` / `src/hub.js`：姓名、阅读桌、实验室与联络模型及分类交互；简历入口优先，点击模型可以完整阅读。
- `src/create-world.js`：复用原视觉模块和模型，开放地面、固定日间、植被、光影与触屏；保留初始辉光和景深，不启动物理、车辆或后台，不再提供夜间/画质切换。
- `/cecilia-world/`：保留已确认的作品展架，四件作品同级直接阅读。原项目内部画面和素材不重新设计。
- `resume.html?document=1`、`resume-document.css`、`resume-document.js`：保留用户两页 PDF 原稿的简历阅读与打印页；`resume.html`、`works.html` 和旧书签跳至对应三维入口。旧 `world-resume.css` 仍供历史其他项目页使用，不修改。
- QA：`tests/design-world.cjs`、`tests/portfolio-routing.cjs`、`tests/bruno-preview.cjs`、`tests/bruno-animation.cjs`。真实截图在 `experiments/bruno-projects/public/review/`。
- 联系方式整组位于入口右侧的原键盘空地，信箱字面与呼吸圆环可直接写邮件，长条纸质便签显示邮箱及可复制的电话、微信；平面地图同步新落点，姓名入口可回到原始镜头。红屋顶地图牌缩小 15% 并按实际双脚落地，欢迎牌与两行小赖文字以左侧底部为固定基准整体缩小10%，重新按可见几何落地；落叶从20片小幅增至24片，尺寸、速度和风场不变。姓名使用 56 像素采样方块，提高笔画间隙；风场与原生叶簇摆动共用日间渲染，补充粉色植被。`tests/contact-clearing.cjs` 校验迁移、模型碰撞、字面边界、风动和地图返回。个人简历进入镜头按用户截图校准，隐藏底部阅读选项，直接点击桌面模型或大简历板打开原简历；`tests/resume-world.cjs` 验证模型点击阅读，`tests/contact-note.cjs` 验证复制和便签边界。
- 植被补全：接入原版 `Flowers` 模块的八片花瓣与花丛分布资源，补充粉色／浅色花丛；树木及灌木显示范围扩大到 72 单位，按模型所在区域避让，入口补充原生粉色树。姓名组合再放大 12%，英文额外放大 30%，中文字进位从 58 收紧至 52；信箱字面透明，不再绘制矩形边框。原始花丛资源的 SHA-256 记于 `public/bruno/manifest.json`。
- 入口字形微调：中文进位进一步收紧至 49，“欣”的下行笔画改成直斜线；`/ CECILIA` 再放大 5%、纵向拉伸 13%，字母间距从 1 格收紧为 0.55 格。首页首帧成功显示后，地图牌和像素小手同步自动亮一次，随后恢复原状，原开关点击亮灯保留。`tests/landing-controls.cjs` 同时验证无点击开场亮灯与后续手动交互；真实截图为 `public/review/entry-map-intro.webp`。
- SafePaw Family 宠爱守护为作品集第 4 项，入口 `safepaw.html`；五张 3488×1744 画板按 Figma 2.1—2.5 原坐标连续排版，桌面适应宽度、按钮放大，手机默认横向阅读并支持适应宽度。292 张上传 PNG 字节全部保留，补回原稿缺少的装饰圆点；`assets/safepaw-family/source-inventory.json` 记录原文件名、Figma 节点、几何和 SHA-256。图卡仅局部高亮，无新页面或点击放大弹窗；`tests/safepaw.cjs` 验证逐图几何、完整性、Figma 截图与阅读交互，`tests/safepaw-world.cjs` 验证 04/04 展架入口和返回。首页此次只加粗“欣”最后一捺，并单独收紧“王—钰”间距。

## 哈哈世界 · 其他项目

`/cecilia-world/haha-world.html` 为「其他项目」第 3 项，保留 TASA-ICoD 与 Cardinal 两项；实验室预览暂用 PDF 第 1 页。`resume.js` 的该项目 `cover` 字段可单独替换预览，不影响手册原封面。

三份 PDF 按 part-1（9 页）、part-2（10 页）、part-3（11 页）连接。`assets/haha-world/manifest.json` 逐页记录来源、顺序、原始文本与横向 A4 比例；30 页完整渲染为 2400px WebP，不裁切或重排。仅增加空白内封底和使用原 Logo、品牌橙色的封底，以组成完整装订。`scripts/prepare-haha-world.py` 可从三份原 PDF 离线重建素材。

阅读器以 Paper Mono 为视觉参考，使用其官方 OFL 字体；MIT LeafThrough 实现可弯曲的 Three.js 纸页，再加胶装书脊、分侧纸叠、粒纹、墨色光泽、投影、指针响应底纹与可拖动字母纸片。进入先展示合上的横版杂志，翻开后摆正并居中。点击、拖动和键盘可翻页，目录直接跳转，双击或「放大」查看单页原稿，点击空白关闭；支持全屏及 WebGL 失败时的平面阅读。素材只在本地与本站加载，不使用外部 PDF 服务；内部不添加加载遮罩。

验证：`tests/haha-world.cjs` 检查原页顺序、尺寸、纸面内容、翻阅、目录、封底、放大和手机边界；`tests/haha-motion.cjs` 检查动态背景和真实鼠标手势；`tests/haha-integration.cjs` 检查原项目保留、第三项入口、嵌入与返回。

## 历史小岛实现（已不作为入口）

以下保留旧版说明以便追溯，当前入口以上述统一场景为准；旧 `island-*` 文件不再被首页加载。

`index.html` 是全屏 3D 小岛，不再采用左右分栏、顶部分类导航或常驻悬浮标签。四处地点依次为个人简历、作品集、其他项目、联系方式，名称直接融入实体模型。姓名「王钰欣 / YUXIN WANG」和 Cecilia 位于海岸立体招牌。拖动旋转、滚轮／双指缩放；点击建筑进入对应模型近景，Esc 返回全岛，R 恢复视角。桌面与手机使用不同的横向／纵向场景布局，建筑本身不压缩变形。

- `island-models.js`：地形、工作室、简历册、开放展亭、翻页展架、游戏工作台、小邮局、立体姓名、植物和书籍均由几何体生成。模型不是贴在网页上的整张渲染图。近景主动避让周围建筑、屋顶和前景物件。
- `island-scene.js`：模型射线拾取、平滑镜头、日夜灯光、拖动／触屏输入、响应式场景与空闲暂停。打开阅读器或切到后台时停止渲染；减少动态效果设置下镜头和翻页直接到位。Three.js r164.1 与三个官方辅助模块本地打包，MIT 许可见 `assets/vendor/three-LICENSE.txt`。
- `island-ui.js` / `island.css`：轻量场景控件、原作品全视口阅读、联系方式与无障碍导航。作品展架的任意封面均可直接点击阅读；按钮、键盘方向键或拖动切换作品，不再要求右侧阅读按钮。邮件使用 `mailto:`，电话使用 `tel:`，微信支持复制。
- 桌面使用 `assets/island/` 中的立体指针、悬停手势和抓取光标，无跟随延迟。触屏设备不显示自定义光标，原作品阅读区保留正常光标。键盘导航仅聚焦时出现，不持续遮挡场景。WebGL 不可用时提供可点击的简洁界面和相同阅读入口。
- Fredoka、中文 Noto Sans SC 子集及立体字轮廓位于 `assets/fonts/`，OFL 许可证同目录保留。可用 `scripts/build-island-fonts.py` 从官方原字体重建，需开发依赖 `fonttools[woff]` 与 Brotli；线上不需要 Python 或外部字体服务。
- 三个作品的原有页面与素材保持独立；点击模型按需加载，同次访问返回展架后保留阅读位置。外层阅读导航统一小岛字体，原项目画面不重新配色。读者可用「独立打开」访问原页面。
- 作品集分类已替换为获确认的原版模型展示区，入口 `/cecilia-world/`；首页作品集建筑、文字导航、旧 `index.html#portfolio` 和 `portfolio.html` 书签均可进入。此阶段不重做首页与其他分类。展示区中文使用小赖字体 Xiaolai，项目英文标题、学校和地点保留；模型来源和完整许可证保留在该目录。开发源码与说明见 `experiments/bruno-projects/`。
- 部署工作流需复制全部 `island-*` 脚本及 `island.css`，并保留本地 Three.js 及许可证。

无需构建的静态个人网站。简历支持响应式布局、深浅色切换和浏览器打印 PDF；小岛使用随站点打包的 Three.js，不依赖在线 CDN。简历内容依据用户提供的 PDF 整理，包含个人联系方式与照片。

## 本地运行

```sh
cd /workspace/cici-cv
npm ci --prefix experiments/bruno-projects
npm run build --prefix experiments/bruno-projects
python3 -m http.server 8000 --bind 0.0.0.0
```

在本机浏览器通过运行机器的地址与 8000 端口访问。停止服务使用 Ctrl+C。三维入口需要上述构建步骤；原作品内容仍为静态页面。使用 HTTP 服务访问，不能以 `file://` 直接打开。开发环境装有 Playwright 与 Chromium 时可运行上述 QA 脚本。

## 页面架构

- `index.html`：首页，个人简介和内容入口。
- `resume.html`：完整简历及打印 PDF。
- `portfolio.html`：作品集总览，Tideline、Future Gazette 与 DREAM SENTINEL 同级展示。
- `dream-sentinel.html`：梦境哨兵项目连续画板，3.1—3.4 已全部接入；原图比例、局部关联高亮、轻微视差、减少动态效果适配，支持横向拖动/触屏/方向键和四张画板同步阅读尺寸切换。
- `dream-sentinel-layers.js`：3.1 用户导出 PNG 与 Figma 实际渲染边界的映射；77 张素材分别保留，不重排原始文字。
- `dream-sentinel-32-layers.js` / `dream-sentinel-32.js`：3.2 的63张可见导出图片、原有背景色层及传感器/思维导图/人体标注交互。ZIP 内两张透明1×1图不显示；`image 166` 地球背景已由用户补图，按原渲染边界恢复，保留PNG内置透明度，不重复降低透明度。原布局与文字保持不变。
- `dream-sentinel-33-layers.js` / `dream-sentinel-33.js`：3.3 的52张可见导出图片，包含灵感拼贴、草图、运行机制及爆炸结构图。六组零件—说明—引线—连接点关联高亮，支持悬停、键盘和触屏切换；运行步骤依次强调，轻微拼贴视差，减少动态效果时静态显示。不添加跳转或放大弹窗。image 187/188 为透明1×1导出，跳过显示。按用户要求，最终草图通过SVG选择性颜色滤镜恢复Figma预览的蓝青色效果；保留原PNG不改写，黑白文字、其他草图、薄荷色块和黄绿色轮廓不改色。
- `dream-sentinel-34-layers.js` / `dream-sentinel-34.js`：四个ZIP的49张PNG全部对应Figma 3.4，原目录分别保留，含重复文件名，不互相覆盖。网页使用对应无损WebP（约42MB，比原PNG约83MB减少49.4%），逐张核验全部可见RGBA像素及透明度一致，保留原PNG作为回退，原PNG路径记录于`sourceFile`；浏览器延迟加载。五个界面悬停/触屏反馈、原位置BEFORE/AFTER概念响应动效、投影导航方向点，不产生跳转或弹窗，不伪造实时数据。两张极细箭头按2倍PNG导出的实际尺寸放置，避免取整导致拉伸。
- `gazette.html`：Future Gazette 独立翻页阅读页。
- `works.html`：其它项目，可展开研究与设计过程。
- Material 页面已接入实验说明和六张材料照片，支持说明图点击放大、照片横条滚轮／拖动／触屏浏览。可从 HOME 的 Material 入口进入，或使用 `tideline.html#material`。
- Material 顶部原封面位置替换为约 58 秒的海藻包装材料实验视频，保留原图为海报，使用原生播放／暂停、进度、音量及全屏控件，默认不自动播放。切换项目页面时停止播放，视频无重编码并优化了网页加载。
- Packaging 页面已接入包装渲染图、四色包装展示和底部全幅图，支持纵向滚动及点击放大；入口为 HOME 的 Packaging 区域或 `tideline.html#packaging`。
- Merch 页面展示八款周边、Intro 和 Coming soon，桌面三列、手机单列，卡片悬停时轻微上浮并显示阴影，无点击放大。从项目导航 MERCH 或 `tideline.html#merch` 进入。上传的 Food 与 Food Bag 为相同图片，仅展示一次。
- Design Diary 页面按原稿顺序展示 Insight、Further research、Brainstorm 与 Proposal 内容；长页纵向滚动，7 张内容图可点击放大，三张网站截图在新标签页打开对应官网。六张植物图悬停显示英文名，点击在新标签页打开百度百科（Sea Beet 使用甜菜相关词条，已标注），触屏常显名称。外链有手形光标、悬停及按下反馈。页尾箭头返回顶部，入口为 DESIGN DIARY 或 `tideline.html#diary`。
- Service System 页面接入 Service Process、Space Layout 和三张服务／空间设计图，保持原图比例与原稿位置，支持纵向滚动，本页所有图片不提供点击放大。入口为 SERVICE SYSTEM 或 `tideline.html#service`。
- Service Process 图上悬停时，主题红色小球沿用户标记的虚线路径从左下向右上弹跳，约 12 秒一趟，拖尾为逐渐变小、变淡的红色圆点，无光晕；停留时循环，移开或切换页面停止，并遵循减少动态效果设置。
- `tideline.html`：Tideline 海藻茶项目，已接入 HOME、RESEARCH 和 TEAS。HOME 六款茶图保持原图比例，支持滚轮、鼠标拖动、触屏滑动和方向键横向浏览，到达边缘后滚轮继续纵向浏览页面；TEAS 六张卡片悬停显示 tea2 详情、移开恢复，手机点击切换；研究长图可点击放大，其余页面待补充。
- `site.js` / `site.css`：共享导航、当前页标记、主题和公共布局。

个人资料与项目继续统一维护在 `resume.js`；项目标记 `collection: "portfolio"` 时列入作品集，其余列入其它作品，两处不重复展示。

## 个性化

- `resume.js`：姓名、简介、联系方式、经历、项目、技能及教育。项目 `url` 留空时不显示跳转链接。
- `styles.css`：颜色、排版、移动端和打印样式。
- `resume.html`：简历结构；`app.js`：简历渲染及打印交互。
- 导出 PDF：点击按钮，在浏览器打印对话框选择“另存为 PDF”；建议 A4、关闭页眉页脚，按需要开启背景图形。内容增多会自动分页。

不要将身份证号、家庭住址、密钥或不希望公开的联系方式写入页面。此模板没有后端、表单或访问鉴权。

## 部署计划

### 推荐：GitHub Pages（公开简历）

1. 替换示例内容，在桌面和手机浏览器检查排版、链接、主题切换与打印预览。
2. 在仓库 Settings → Pages → Build and deployment 中选择 **GitHub Actions**。
3. 将这些文件提交并推送到 `main`，或在 Actions 手动运行 **Deploy resume to GitHub Pages**。
4. 等待工作流成功，使用部署步骤返回的地址检查完整页面。项目站点通常为 `https://<用户名>.github.io/cici-cv/`；当前代码采用相对资源路径，支持仓库子路径。
5. 可选：在 Pages 中配置自定义域名，按 GitHub 提示添加 DNS 记录并开启 HTTPS。

工作流只上传四个站点文件与 assets 资源目录，不会发布整个仓库。私有仓库能否使用 Pages 取决于 GitHub 套餐和组织策略；**私有仓库不代表 Pages 网站私有**。此任务仅准备部署文件，不会自动替你推送或上线。

### 备选：Cloudflare Pages

连接 GitHub 仓库，生产分支选 `main`。不选框架，构建命令填写：

```sh
mkdir -p public && cp index.html resume.html works.html tideline.html tideline.css tideline.js dream-sentinel.html dream-sentinel.css dream-sentinel.js dream-sentinel-layers.js dream-sentinel-32.js dream-sentinel-32-layers.js dream-sentinel-33.js dream-sentinel-33-layers.js dream-sentinel-34.js dream-sentinel-34-layers.js styles.css site.css site.js resume.js app.js portfolio.html gazette.html portfolio-local.html portfolio.css portfolio.js public/ && cp -R assets public/
```

构建输出目录填 `public`，无需环境变量。部署成功后可绑定自定义域名。预览与生产地址均需按公开页面处理。

### 如果需要私人简历

不要直接公开部署。先决定允许访问的人群，再配置身份验证，例如使用 Cloudflare Access 保护站点及所有可直达的生产和预览入口，部署后验证未登录用户无法读取 HTML 和 `resume.js`。仅加前端密码、隐藏链接或 robots.txt 都不能保护简历内容。

### 上线验收与维护

检查 HTTPS、页面及三个静态资源返回成功；确认无示例信息、联系方式正确、手机无横向溢出、PDF 无内容截断。后续修改 `resume.js` 并推送即可自动更新。需要回退时，通过新的 Git 提交还原到上一版，再触发部署。

## 照片与动效

### 2026-11-18 简历原稿一致性

以用户上传的 `A4 - 1-combined (1).pdf` 为简历视觉权威来源。该文件为两张1588×2248的扫描/图片页，没有嵌入字体或文字层，因此不推测字体名称、不用系统字体重新排版。`assets/resume/page-1.webp` 与 `page-2.webp` 为原PDF按原始像素尺寸渲染后的无损WebP；`wang-yuxin-resume.pdf` 保留用户原文件字节。照片从第一页同一位置无损拆出，静态时覆盖原位置，悬停轻微上浮；内容区只添加可退回的淡金色悬停提示，原排版不动。电话、邮件可点击，微信可复制。保留辅助文字摘要，但完整正文依旧是图片，未声称可搜索或可编辑。

阅读器可缩放，手机可横向浏览放大后的页面；深色场景不会改色纸页。打印关闭交互层和工具条，保留两页A4；下载按钮直接提供原版PDF。场景中的简历缩略图同步更新并携带缓存版本，场景模型及镜头不改。`resume.js` 仍为其他网站模块的数据来源，本次不改。

上述整页 PDF 方案已由随后收到的 `cv拆分.zip` 高清素材替代。当前 `assets/resume/slices/cv拆分/` 保存全部57张原始PNG，无重采样或字体替换；`resume-layers.js` 保存两页中逐块测量的位置、尺寸及匹配置信度，网页原位组合56块图层与1张独立照片，不再加载模糊的整页图。原PDF仅用于排版参照及“下载原版PDF”。`scripts/map-resume-slices.py` 是开发用位置匹配工具，不进入线上依赖。

`node tests/resume-pdf.cjs` 检查57张素材全部使用且各使用一次、原分辨率及页面边界、与原PDF的低频排版对照（高清字边缘和新照片不要求等同旧JPEG像素），另测照片/内容悬停、联系方式、缩放、减少动态效果、原文件下载和两页打印。`node tests/resume-world.cjs` 检查三维入口打开新简历并返回原场景。

### 姓名角标与项目阅读调整

首页保留原姓名占位中心和镜头，中文像素字增大10%，英文与斜杠组成右下角小角标（高度约为中文的19%）。首页及展架移除夜间与画质按钮，忽略旧夜间设置，固定原进入时的日间画面；保留既有bloom与cheapDOF，不启用原本会移除景深的降级开关。

Gazette 将返回导航和全屏按钮收进紧凑工具栏，按可用窗口等比例放大，封面和封底居中，支持全屏进退且保留当前页。仅首次载入进行一次3D旋转入场，结束后回到平面阅读；减少动态效果时跳过。海藻茶每页左上固定返回上一页，使用项目内历史；外部直达内页时回HOME，直达HOME时返回展架（嵌入阅读器内会关闭阅读器，不跳成嵌套展架）。HOME的About Us仅保留悬停、不再可点击；JOIN对应现有邮箱。

`tests/project-polish.cjs` 覆盖画册尺寸/全屏/翻页/入场/手机和海藻茶路由；`tests/world-polish.cjs` 覆盖姓名比例/中心、固定日间和镜头、嵌入项目返回及全屏。

`assets/portrait.jpg` 为用户上传的首页原图。桌面鼠标悬停时照片卡片轻微上浮、转正，照片微微放大。系统开启“减少动态效果”时关闭此动效，打印时恢复静态。

## 作品集翻页书

`gazette.html` 展示 Future Gazette 翻页书、返回作品集入口和全屏阅读按钮。原始31页 PDF 位于 `assets/gazette/future-gazette.pdf`。桌面端可按住书页右上角或右下角向左拖动翻页，左侧书角可向右翻回；手机支持单页触摸翻页。键盘左右键翻页，Home/End 定位首尾。系统设置减少动态效果时，键盘直接切页。

Gazette 使用切割垫、牛皮纸文件夹与原稿纸堆组成的桌面。背景按作者提供的 Pinmat 截图匹配：饱和绿色垫面、外围留白的40px单层浅灰绿方格、细颗粒纹理、暖米黄文件夹与白色青蓝横线／红竖线底纸。材质为本地轻量 SVG 程序纹理，不给原始徽章和作品切图附加调色。封面两侧垫有作者新提供的三组 Forres 活动、建筑走访与店面拼贴，以及原有邮票；双页展开后淡出。文件夹与底纸延伸到屏幕外，桌面书本按可用高度放大。六个研究入口各用一枚不同徽章：作者提供的原始 SVG（HI、铅笔、星芒、黄色花朵），原站蓝色小脸，以及作者提供的黑白小幽灵图片制作的透明金边徽章。HI 对应居民访谈、铅笔对应留学生访谈；图像版徽章采用透明背景，原 SVG 保留配色、金边和内置扫光；绿色角色不再显示。徽章根据文件夹和纸张的实际边界排列在绿色垫面，悬停徽章或短标题显示小纸卡（不放大徽章），点击小卡展开为书本上方的大纸张。预览和大卡展开时，画册尺寸、位置和页码保持不变；徽章始终位于文件夹、纸张和书页外侧，不随翻页移动。点击纸张外的桌面、Escape 或“返回画册”关闭；纸内支持滚动和缩放，放大后可拖动查看。触屏点按徽章显示小卡，再点小卡打开大纸张。素材仍使用作者“修改最终版”的370张切图，不更改书页、卡片正文或其字体，不添加内部加载动画。

封面略放大、上移并向右倾斜，翻开后恢复正向阅读；资料卡预览和大卡不移动书本。纸质目录固定贴齐窗口底边，使用显式汇文明朝体覆盖公共导航字体。目录默认收起，悬停或触屏点按展开，四个大章节常显中英标题，小刻度悬停显示文章名。拖动索引贴仅预览，松开定位；目录不移动书本。新增外围文字使用汇文明朝体的自托管 WOFF2 子集，来源、处理方式与授权见 `assets/fonts/huiwen-source.txt` 和 `assets/fonts/huiwen-LICENSE.txt`。

验证：静态服务器运行于8765端口后，执行 `node tests/gazette-research.cjs`、`node tests/gazette-contents.cjs`、`node tests/gazette-clicks.cjs`。

使用 [StPageFlip](https://github.com/Nodlik/StPageFlip)（page-flip 2.0.7，MIT）。本地副本和许可证在 `assets/vendor/page-flip/`，发布包通过 npm 的 SHA-512 integrity 校验。无需外部 CDN、安装或构建。

阅读器立即初始化，当前页及相邻页优先加载，其他图片延后加载；单页失败不阻断整本书，可点击失败页重试。以可用窗口尺寸计算固定的纸张比例，窗口尺寸或方向改变后重新布局并保留阅读位置。关闭自动预翻；静态纸层、落地阴影和书脊不参与书页几何计算。

原稿为图片型 PDF，图片正文不能搜索或直接供屏幕阅读器朗读；页面保留阅读器标签和隐藏的页码提示。更换 PDF 后需重新生成图片，并同步 `portfolio.js` 中页数。

`portfolio-local.html` 仅保留为旧阅读器地址跳转，指向 `gazette.html`。`portfolio.html` 现在为作品集总览。页面不嵌入外部网页。

### 封面与纸张

使用 StPageFlip 的 `showCover` 原生首尾边界，取消封面前的空白占位页。封面及其内侧、封底及其内侧为硬纸板，内页为软纸；在最后一页 PDF 前增加无印刷内容的封底内侧，确保原始封底单独合拢，不新增 PDF 内容页。合盖时隐藏已空出一侧的装饰纸层。动态阴影由翻页库绘制并裁剪到下方纸张，静态书脊阴影仍附着于纸张表面。

### 封壳边缘与阴影

封壳采用青蓝色，内页在桌面端上下及外侧内缩10px，手机端内缩6px，中缝保持贴合；内页内容放在随纸页一起翻动的表面中。封面与封底铺满硬壳，打开后露出更大的封壳边缘。硬壳只使用随板运动的投影，关闭库的双重硬壳阴影；内页仍使用库的动态软纸投影。封面或封底关闭时不绘制空侧的底板与阴影。

### 书脊、中部拖拽与加载优化

封面及封底表面带书脊压痕、圆角及倒角高光。按住书页中间高度（28%–72%）拖动时，交互适配层将拖拽映射到竖直折线；其他位置保留自由卷角。适配固定的 StPageFlip 2.0.7 的指针入口，不修改库文件。

阅读页面使用响应式 WebP：1067px 宽的高清整套约7.4MB，640px 宽的整套约2.8MB（原 JPEG 约12.1MB）。浏览器按纸张显示宽度及设备像素比选择资源；封面预加载、当前页高优先级，远处页面延迟加载，相邻页提前准备。原始约21.4MB PDF 保留归档，Gazette 阅读页面不再提供下载入口。更换原稿后需同时重新生成 WebP 和小尺寸 WebP。

站点公开路径统一为 `cecilia-world/`；`legacy-world/` 部署到旧 `bruno-preview/` 地址，仅用于保留旧书签的参数与分类位置并跳转。

统一加载界面使用 `site-loader.js` / `site-loader.css`：cssinate 积木组合动画（https://codepen.io/cssinate/pen/vXEwmX），采用确认的首版深紫背景、奶油顶面、橙色左面与亮紫右面，并以像素数字显示资源进度。3D 入口在资源加载后保留渲染准备阶段，首次画面就绪后结束；简历与其他项目文档等待实际初始图片与字体。作品集内部四件作品不载入加载组件，Gazette 翻页也不显示加载动画，仅保留图片失败后的重试提示。`node tests/site-loader.cjs` 检查四件作品不出现加载界面、两个场景入口的进度完成及减少动态效果设置。

加载完成过渡采用中央向两侧开幕：提示延后 450ms 出现；若内容先就绪，立即显示并取消提示，不添加完成停留或过渡。已显示的加载提示在真实进度达到 100% 后停留 200ms，再进行 700ms 开幕；减少动态效果模式直接结束。`tests/loader-reveal.cjs` 用受控图片请求检查慢资源、即时完成、已解码缓存和减少动态效果，分类导航与阅读窗口复用不触发新的加载界面。

Gazette 桌面端使用原生 SVG 金边箭头光标，可点击的徽章、标题、卡片、书页和按钮切换为更明显的金边手形；触屏不显示自定义光标。此机制参考 Pinmat 官方说明，采用独立绘制的光标文件，无跟随鼠标的遮挡层。目录滑块及拖动浏览仍保留对应拖动光标。Gazette 页面不再提供源文件下载入口。

Gazette 每次实际切换书页播放一次轻柔的纸张翻动录音（Kenney RPG Audio / CC0，来源与授权见 `assets/gazette/audio/`），固定低音量0.16。首次载入、尺寸／全屏重建、悬停和取消拖动不发声；音频由真实指针或键盘操作解锁，浏览器拒绝音频时不影响阅读。快速连续操作不会叠加录音，不添加音效切换按钮。

翻页音效验证：`node tests/gazette-audio.cjs`（8765端口静态服务器），检查真实解码、用户操作解锁、单次触发与静默场景。
