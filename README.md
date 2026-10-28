# cici-cv · Cecilia 的设计小岛

## 小岛首页

`index.html` 是全屏 3D 小岛，不再采用左右分栏、顶部分类导航或常驻悬浮标签。四处地点依次为个人简历、作品集、其他项目、联系方式，名称直接融入实体模型。姓名「王钰欣 / YUXIN WANG」和 Cecilia 位于海岸立体招牌。拖动旋转、滚轮／双指缩放；点击建筑进入对应模型近景，Esc 返回全岛，R 恢复视角。桌面与手机使用不同的横向／纵向场景布局，建筑本身不压缩变形。

- `island-models.js`：地形、工作室、简历册、开放展亭、翻页展架、游戏工作台、小邮局、立体姓名、植物和书籍均由几何体生成。模型不是贴在网页上的整张渲染图。近景主动避让周围建筑、屋顶和前景物件。
- `island-scene.js`：模型射线拾取、平滑镜头、日夜灯光、拖动／触屏输入、响应式场景与空闲暂停。打开阅读器或切到后台时停止渲染；减少动态效果设置下镜头和翻页直接到位。Three.js r164.1 与三个官方辅助模块本地打包，MIT 许可见 `assets/vendor/three-LICENSE.txt`。
- `island-ui.js` / `island.css`：轻量场景控件、原作品全视口阅读、联系方式与无障碍导航。作品展架的任意封面均可直接点击阅读；按钮、键盘方向键或拖动切换作品，不再要求右侧阅读按钮。邮件使用 `mailto:`，电话使用 `tel:`，微信支持复制。
- 桌面使用 `assets/island/` 中的立体指针、悬停手势和抓取光标，无跟随延迟。触屏设备不显示自定义光标，原作品阅读区保留正常光标。键盘导航仅聚焦时出现，不持续遮挡场景。WebGL 不可用时提供可点击的简洁界面和相同阅读入口。
- Fredoka、中文 Noto Sans SC 子集及立体字轮廓位于 `assets/fonts/`，OFL 许可证同目录保留。可用 `scripts/build-island-fonts.py` 从官方原字体重建，需开发依赖 `fonttools[woff]` 与 Brotli；线上不需要 Python 或外部字体服务。
- 三个作品的原有页面与素材保持独立；点击模型按需加载，同次访问返回展架后保留阅读位置。外层阅读导航统一小岛字体，原项目画面不重新配色。读者可用「独立打开」访问原页面。
- `portfolio.html` / `works.html` 的既有书签会引导至 `index.html#portfolio` / `index.html#other`；原有简历页面与打印能力保留。
- 部署工作流需复制全部 `island-*` 脚本及 `island.css`，并保留本地 Three.js 及许可证。

无需构建的静态个人网站。简历支持响应式布局、深浅色切换和浏览器打印 PDF；小岛使用随站点打包的 Three.js，不依赖在线 CDN。简历内容依据用户提供的 PDF 整理，包含个人联系方式与照片。

## 本地运行

```sh
cd /workspace/cici-cv
python3 -m http.server 8000 --bind 0.0.0.0
```

在本机浏览器通过运行机器的地址与 8000 端口访问。停止服务使用 Ctrl+C。小岛使用 ES 模块，需通过 HTTP 服务访问，不能以 `file://` 直接打开。不需要 npm install。开发环境装有 Playwright 与 Chromium 时，可执行 `node tests/island.cjs` 进行模型点击和响应式回归测试。

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

`assets/portrait.jpg` 为用户上传的首页原图。桌面鼠标悬停时照片卡片轻微上浮、转正，照片微微放大。系统开启“减少动态效果”时关闭此动效，打印时恢复静态。

## 作品集翻页书

`gazette.html` 展示 Future Gazette 翻页书、返回作品集入口和源文件下载按钮。原始31页 PDF 位于 `assets/gazette/future-gazette.pdf`。桌面端可按住书页右上角或右下角向左拖动翻页，左侧书角可向右翻回；手机支持单页触摸翻页。键盘左右键翻页，Home/End 定位首尾。系统设置减少动态效果时，键盘直接切页。

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

阅读页面使用响应式 WebP：1067px 宽的高清整套约7.4MB，640px 宽的整套约2.8MB（原 JPEG 约12.1MB）。浏览器按纸张显示宽度及设备像素比选择资源；封面预加载、当前页高优先级，远处页面延迟加载，相邻页提前准备。原始约21.4MB PDF 保持不变，只在用户点击下载时请求。更换原稿后需同时重新生成 WebP 和小尺寸 WebP。
