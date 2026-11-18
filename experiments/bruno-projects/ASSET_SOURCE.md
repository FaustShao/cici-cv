# Bruno ProjectsArea 试验页来源

模型及 `src/bruno/` 视觉程序来自 Bruno Simon 官方 `folio-2025`，固定提交 `41046b57eeed8d156d9c3fd7fa259900baef7816`。

上游：<https://github.com/brunosimon/folio-2025>

植被补全另外复用同一固定提交的 `static/flowers/flowersReferences.glb` 及 `sources/Game/World/Flowers.js`。花瓣几何与风动方式沿用原版，适配本网站的模型避让、确定性随机及粉色／浅色配色。核对用的官方预览为 `static/social/share-image.png` 与 `static/ui/previews/home.png`，未复制进网站界面。

MIT，Copyright (c) 2025 Bruno Simon；完整许可证位于 `public/BRUNO-LICENSE.txt`。模型保持原始几何、原色板；试验页仅提取作品区域、附近环境，替换个人作品数据和阅读行为。车辆、驾驶、后台和排行榜不接入。

`src/bruno/Game.js` 是视觉依赖适配器，不是原游戏入口。物理和车辆相关回调在试验页中不运行，视觉模块的依赖适配记录在 `src/main.js`。
