# Cecilia · 作品集展示区

独立试做已获确认，现接入主站作品集分类；只替换该分类，不替换站点首页和原项目正文。

## 本地

在站点根目录启动原作品静态服务 `python -m http.server 8000`。
在本目录执行 `npm ci`、`npm run dev`，打开 `http://127.0.0.1:5174/`。
生产构建 `npm run build` 输出至站点根目录的 `bruno-preview/`（已忽略生成文件）；可通过 `http://127.0.0.1:8000/bruno-preview/` 检查真实相对路径。

## 来源与改动

- 所有模型及 `src/bruno/` 视觉模块来自官方提交，见 `ASSET_SOURCE.md`。GLB 不重新设计，二进制 SHA256 见 `public/bruno/manifest.json`。
- 自定义 `Game` 只提供视觉模块依赖，不启动驾驶、物理、后台或其他游戏区。`ProjectsArea` 使用原版视觉方法，两个枚举导入指向 `preview-contract.js`；无车辆节点进入场景。
- 使用原版 palette、MeshDefaultMaterial、Lighting、Fog、Terrain、Floor、Grass、Trees、Foliage、Noises、Wind、项目图片翻页、木牌文字翻转、锻炉／磨轮／铁砧动画、bloom 与 cheapDOF。
- 固定原版 day/night 预设。地面范围按原 `View.setOptimalArea` 的 16:9 高画质默认视锥计算，手机仅适配作品近景取景；这不是原完整游戏和所有天气玩法的移植。
- 移除用户未提供的获奖徽章；原英文标签图集在运行时以中文手写字替换，空置的荣誉台标签改为“设计档案”，不表示用户获奖。模型二进制保持原版。
- 项目标题、学校和地点名保留英文；界面、角色与合作方式改为中文。中文使用用户确认的 OFL 授权小赖字体 Xiaolai Regular v3.126 子集（https://github.com/lxgw/kose-font/releases/tag/v3.126），英文项目标题仍用 Amatic SC。页面不显示底部署名，完整 MIT 版权许可仍随代码与资源发布。
- 移除左上角完整介绍文字块，避免遮挡作品；中文提示缩小，阅读木牌文字缩小约三分之一并保留额外留白；角色／地点／合作小标题单独放大。模型、光影和交互不改变。
- 项目预览为现有页面的浏览器截图，仅替换原展示屏内容；点击实际图片打开同站点原页面，返回保留场景与作品选择。
- 支持拖动观察、滚轮／触屏双指缩放、原模型箭头／外部按钮／方向键切换、键盘阅读入口、日夜及高低画质。
- 阅读器打开或页面隐藏时不渲染 3D；减少动态效果设置下关闭环境动画。
- 正式发布入口 `/bruno-preview/`，`portfolio.html` 为兼容跳转。首页 `openIslandPlace("portfolio")`（模型、键盘导航和旧 `#portfolio` 入口共用）指向该页；其余分类行为不变。三件原作品内部页面和素材不修改。

## 资产重建

`node fetch-assets.mjs` 获取固定提交的原模型与纹理，并生成 SHA256 清单。字体、解码器和三件作品预览已经随本试做提交，许可见 `public/`。完整第三方说明见 `public/THIRD-PARTY-NOTICES.txt`。

## 核验

原作品静态服务运行后，在站点根目录执行 `node tests/bruno-preview.cjs`。开发测试依赖 Playwright 和 Chromium，不进入线上运行依赖。
入口回归执行 `node tests/portfolio-routing.cjs`。
