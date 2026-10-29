# 真实浏览器渲染截图

由 `tests/bruno-preview.cjs`、`tests/design-world.cjs` 与 `tests/entry-preview.cjs` 在实际运行网页后截取并转存为 WebP。

- `day.webp`：原版 day 光照预设下的桌面近景。
- `night.webp`：原版 night 光照预设下的桌面近景。
- `mobile.webp`：390×844 触屏视口。
- `home.webp` / `home-night.webp` / `home-mobile.webp`：统一场景的日间、夜间与手机首页。
- `resume-station.webp` / `resume-reading.webp`：三维简历阅读桌与实际简历正文。
- `other-station.webp` / `contact-station.webp`：实验室项目入口与联系方式。
- `navigation-map.webp` / `navigation-map-mobile.webp`：桌面、手机实际展开的导航地图。
- `entry-name-lit.webp` / `entry-map-flash.webp`：点击手柄后的姓名常亮、点击开关后的地图板单次闪亮。
- `entry-reset.webp`：平移、旋转及进入分类后归位的镜头；自动断言其参数与首次 Landing 完全一致。
- `map-board-grounded.webp` / `map-board-side.webp`：放大后的地图牌正面／侧面，核对两只实际支脚、纯地图板面和独立像素手指。
- `gamepad-grounded.webp`：标记位置的缩小手柄，按可见外壳顶点核对落地；不是用包围盒虚拟角点判断。

本轮 `home*` 展示像素积木姓名和原生游戏设备的入口近景；`navigation-map*` 展示实际打开的居中插画地图，导航和木牌使用小赖字体。简历正文保留原系统字体，作品内部不改。

未使用图片生成器。这些文件用于对照美术方向，不替代可操作的 3D 页面。来源及许可见上级 `BRUNO-LICENSE.txt`、`THIRD-PARTY-NOTICES.txt`。
