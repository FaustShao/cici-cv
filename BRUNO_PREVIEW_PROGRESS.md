# Bruno ProjectsArea 独立试做进度

## 范围与保护

- 用户只批准先试做作品集展示区；不替换 `index.html`，不改变线上主站入口或三件原作品内部页面。
- 主站基线：`39d7ecdd724aa93e1295dd170226343284a53559`。
- 参考官方开源工程：<https://github.com/brunosimon/folio-2025>，已核对 `license.md`（MIT，Copyright 2025 Bruno Simon）。移植保留许可与来源说明。
- 已定位的参考提交：`41046b57eeed8d156d9c3fd7fa259900baef7816`。
- 参考仓库临时检出：`/tmp/bruno-reference.sM4AZe/folio`。如环境丢失，以该提交重新取得；不要将临时路径当成唯一成果。

## 计划

1. 检查并跑通原模型／材质依赖，定位 ProjectsArea 的实际展示装置与周围景物。
2. 新建隔离试验页面，沿用已授权原模型、色板、光照与相关后期，不重新设计装置。
3. 接入三件已有作品：Tideline、Gazette、DREAM SENTINEL，支持切换和直接点击预览全屏阅读；不接入小车和驾驶玩法。
4. 浏览器检查实际日间／夜间画面、桌面／手机和阅读返回；仅发布独立入口供用户验收。

## 当前状态

- 已保存现有站点基线，主站未改。
- 已建立 `experiments/bruno-projects/` 独立 Vite 试验工程，依赖和原模型固定版本；原站文件未改。
- 已下载并校验原版 GLB、色板、地形纹理、植被纹理；来源及 SHA256 见 `public/bruno/manifest.json`。完整 MIT 许可证和字体许可保留。
- 已移植原版 `MeshDefaultMaterial`、Lighting、Fog、Terrain、Grass、Foliage，以及 ProjectsArea 的视觉方法；使用适配器去除车辆、物理、原游戏入口依赖。
- 已在本地浏览器通过原生 WebGL/TSL 渲染出作品展示区，截图 `/tmp/bruno-preview-first.png`。实际原装置与原色板已运行，不是生成概念图。
- 三件作品预览已接入原显示屏；已在真实生产构建路径 `/bruno-preview/` 验证点击打开 Tideline、Gazette、DREAM SENTINEL 及返回，未发现页面错误或 404。
- 日间、夜间、手机实际渲染截图已在本地生成；初始文字翻转与图像切换沿用原程序。主站仍未变更。
- 新版构建输出至根目录 `bruno-preview/`（忽略生成文件），工作流只新增该目录的部署，不改变原主站复制清单。尚未推送发布，正在最终回归。
- 开发服务 `http://127.0.0.1:5174/`；原作品静态服务 `http://127.0.0.1:8000/`（当前执行环境内地址，不是用户可直接访问的预览链接）。
- 关键阶段更新本文；未验证的效果不当成完成。
