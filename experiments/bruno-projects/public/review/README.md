# 真实浏览器渲染截图

由 `tests/bruno-preview.cjs` 与 `tests/design-world.cjs` 在实际运行网页后截取并转存为 WebP。

- `day.webp`：原版 day 光照预设下的桌面近景。
- `night.webp`：原版 night 光照预设下的桌面近景。
- `mobile.webp`：390×844 触屏视口。
- `home.webp` / `home-night.webp` / `home-mobile.webp`：统一场景的日间、夜间与手机首页。
- `resume-station.webp` / `resume-reading.webp`：三维简历阅读桌与实际简历正文。
- `other-station.webp` / `contact-station.webp`：实验室项目入口与联系方式。

本轮 `home*`、`resume*`、`contact-station` 展示入口近景、实体入口地图、简洁无衬线标牌与落地道具；简历正文恢复原系统字体。

未使用图片生成器。这些文件用于对照美术方向，不替代可操作的 3D 页面。来源及许可见上级 `BRUNO-LICENSE.txt`、`THIRD-PARTY-NOTICES.txt`。
