# cici-cv · 个人简历网站模板

无需构建、无需第三方运行依赖的中文个人简历。支持响应式布局、深浅色切换和浏览器打印 PDF。当前内容依据用户提供的简历 PDF 整理，包含个人联系方式与照片。

## 本地运行

```sh
cd /workspace/cici-cv
python3 -m http.server 8000 --bind 0.0.0.0
```

在本机浏览器通过运行机器的地址与 8000 端口访问。停止服务使用 Ctrl+C。也可以直接打开 `index.html`。不需要 npm install。

## 个性化

- `resume.js`：姓名、简介、联系方式、经历、项目、技能及教育。项目 `url` 留空时不显示跳转链接。
- `styles.css`：颜色、排版、移动端和打印样式。
- `index.html`：页面结构；`app.js`：安全的文本渲染及交互。
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
mkdir -p public && cp index.html styles.css resume.js app.js portfolio.html portfolio.css portfolio.js public/ && cp -R assets public/
```

构建输出目录填 `public`，无需环境变量。部署成功后可绑定自定义域名。预览与生产地址均需按公开页面处理。

### 如果需要私人简历

不要直接公开部署。先决定允许访问的人群，再配置身份验证，例如使用 Cloudflare Access 保护站点及所有可直达的生产和预览入口，部署后验证未登录用户无法读取 HTML 和 `resume.js`。仅加前端密码、隐藏链接或 robots.txt 都不能保护简历内容。

### 上线验收与维护

检查 HTTPS、页面及三个静态资源返回成功；确认无示例信息、联系方式正确、手机无横向溢出、PDF 无内容截断。后续修改 `resume.js` 并推送即可自动更新。需要回退时，通过新的 Git 提交还原到上一版，再触发部署。

## 照片与动效

`assets/portrait.png` 提取自原简历。桌面鼠标悬停时照片卡片轻微上浮、转正，照片微微放大。系统开启“减少动态效果”时关闭此动效，打印时恢复静态。

## 作品集电子书

`portfolio.html` 展示 Future Gazette 的全部 31 页，原始 PDF 位于 `assets/gazette/future-gazette.pdf`。页面图由原 PDF 转换，按需加载；不调用第三方阅读器服务。桌面端双页翻书，手机端单页，可用箭头、键盘方向键、页码、缩略图或触摸滑动翻页，支持放大及全屏（取决于浏览器）。开启“减少动态效果”时直接切换页面。

原稿是图片型 PDF，阅读器提供页码和控件的可访问标签，但图片正文不能被搜索或直接供屏幕阅读器朗读。更换 PDF 时需要重新生成所有页面图片，并同步 `portfolio.js` 和 `portfolio.html` 中的总页数。
