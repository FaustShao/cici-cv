# Bruno ProjectsArea 试验页来源

模型及 `src/bruno/` 视觉程序来自 Bruno Simon 官方 `folio-2025`，固定提交 `41046b57eeed8d156d9c3fd7fa259900baef7816`。

上游：<https://github.com/brunosimon/folio-2025>

植被补全另外复用同一固定提交的 `static/flowers/flowersReferences.glb` 及 `sources/Game/World/Flowers.js`。花瓣几何与风动方式沿用原版，适配本网站的模型避让、确定性随机及粉色／浅色配色。核对用的官方预览为 `static/social/share-image.png` 与 `static/ui/previews/home.png`，未复制进网站界面。

MIT，Copyright (c) 2025 Bruno Simon；完整许可证位于 `public/BRUNO-LICENSE.txt`。模型保持原始几何、原色板；试验页仅提取作品区域、附近环境，替换个人作品数据和阅读行为。车辆、驾驶、后台和排行榜不接入。

`src/bruno/Game.js` 是视觉依赖适配器，不是原游戏入口。物理和车辆相关回调在试验页中不运行，视觉模块的依赖适配记录在 `src/main.js`。


## ICoD 研究档案

`src/icod.js`、`src/icod.css` 为本项目新写的交互实现。视觉及档案探索方式参考 <https://experiment.obys.agency/>，不复制其项目素材或专有字体。37 张展示页仅来自用户上传的 `2408ppt1.pdf`（21 页中期研究）与 `132-combined.pdf`（16 页最终设计），完整保留原页，见 `assets/icod/manifest.json`。中文界面使用 Noto Sans SC 400 的独立子集（SIL OFL），许可证沿用 `public/fonts/NotoSansSC-OFL.txt`。参与证书须使用用户原图，禁止生成替代签名或重绘证书。
