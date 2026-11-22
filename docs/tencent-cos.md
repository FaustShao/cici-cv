# 腾讯云 COS 自动部署

配置完成后，推送到 `main` 即可自动更新 COS 中的网站，不需要下载 GitHub Artifact 或手动上传。
GitHub Pages 继续独立发布；两者复用相同的 Vite 构建、站点组装和发布检查。

## 1. 准备存储桶

在 [COS 控制台](https://console.cloud.tencent.com/cos) 创建专门用于本网站的桶：

- 地域：中国香港（`ap-hongkong`）。
- 访问权限：公有读私有写，用于公开作品集；只放希望公开的网站文件。
- 基础配置 → 静态网站：开启，索引文档 `index.html`，错误文档 `404.html`，响应码保留原始错误码。
- 域名和 HTTPS 尚未配置时，先不启用强制 HTTPS。
- 记录完整桶名，如 `cici-portfolio-1250000000`，必须包含数字后缀。

COS 默认域名对新桶有网页预览限制。完成上传不等于已获得可正常浏览的网站地址；正式访问还要配置自定义域名和 HTTPS。无需备案的方案应使用境外接入，不使用中国大陆 CDN 节点；域名接入要求以腾讯云所选产品及控制台当前规则为准。
参考：[设置静态网站](https://cloud.tencent.com/document/product/436/32670)。

## 2. 创建专用部署凭证

在腾讯云访问管理 CAM 中创建用于 GitHub 部署的子用户及 API 密钥，并为该用户授权下面的自定义策略。
将 `YOUR_APPID` 替换为桶名末尾的 APPID，将 `YOUR_BUCKET` 替换为完整桶名；地域如有变化也需一起替换。

```json
{
  "version": "2.0",
  "statement": [
    {
      "effect": "allow",
      "action": ["cos:HeadObject", "cos:PutObject"],
      "resource": [
        "qcs::cos:ap-hongkong:uid/YOUR_APPID:YOUR_BUCKET/*"
      ]
    }
  ]
}
```

流程仅检查对象是否变化并上传，不需要删文件、修改存储桶配置或管理账号的权限。
将凭证直接填入下一步的 GitHub Secrets，不要发到聊天、提交到仓库或放进 Variables。

## 3. 在 GitHub 填写一次性配置

打开仓库 **Settings → Secrets and variables → Actions**：

在 **Secrets → New repository secret** 添加：

| 名称 | 值 |
| --- | --- |
| `COS_SECRET_ID` | 专用子用户的 SecretId |
| `COS_SECRET_KEY` | 对应的 SecretKey |

在 **Variables → New repository variable** 添加：

| 名称 | 值 |
| --- | --- |
| `COS_BUCKET` | 完整桶名，例如 `cici-portfolio-1250000000` |
| `COS_REGION` | `ap-hongkong`；未设置时默认香港 |
| `COS_ENABLED` | `true`；开启每次推送 `main` 自动发布 |

未设置 `COS_ENABLED=true` 时，自动发布任务跳过，不影响 GitHub Pages。
修改 Secrets 或 Variables 本身不会触发工作流；首次请按下一步手动运行。

## 4. 首次运行与后续更新

本次改动进入 `main` 后，打开 **Actions → Deploy portfolio to Tencent COS → Run workflow**，分支选择 **main**，运行。

工作流会验证配置，安装固定版本 COS SDK，运行上传器测试，再构建、组装、审计网站。
全部通过后，只将 `public/` 内的内容上传到桶根目录，不会上传源码、测试或密钥。
首次上传耗时取决于素材量；以后对比 SHA-256 和内容类型、缓存设置，跳过未变化的文件。

上传先完成资源，再上传 HTML，最后更新 `release.json`。上传失败时工作流失败，后续阶段不执行；修复配置后重跑即可。
这不是原子发布：多对象上传期间仍可能短暂出现版本混用。旧资源保留，避免已打开页面所引用的旧文件立刻失效。
不会删除桶内旧文件；将来可以在确认旧版本不再使用后手动清理，注意保留当前版本依赖。

运行完成后在 COS 文件列表确认根目录下存在 `index.html`、`release.json`、`assets/` 和 `cecilia-world/`。
之后每次推送 `main` 都自动发布；手动发布也只允许 `main`。

COS 构建设置 `SITE_BASE_PATH=/`，使 404 页返回自定义域名首页；GitHub Pages 的默认前缀仍为 `/cici-cv/`。
HTML、JS、CSS 和 JSON 配置为重新验证缓存；其他资源缓存 5 分钟。
目前直接发布到 COS，不调用 CDN 刷新接口。如果以后接入 CDN，应配置相应缓存规则，特别是 `release.json` 和 HTML，避免 CDN 长时间缓存旧版本。

## 常见问题

- **工作流被跳过**：自动触发需 `COS_ENABLED=true`，手动运行需选 `main`。
- **Missing 配置错误**：检查名称拼写，以及凭证是否填在 Repository Secrets 而非 Variables。
- **403**：检查子用户策略是否包含正确的 APPID、桶名和地域，以及 HeadObject、PutObject 两项权限。
- **404 / NoSuchBucket**：确认桶名包含数字后缀，地域和桶实际地域一致。
- **打开页面变成下载**：先绑定自定义域名；默认域名的下载限制不代表上传失败。
- **暂停自动发布**：将 `COS_ENABLED` 改为 `false`；这不会删除已发布网站。

本地验证命令：

```bash
python -m pip install -r scripts/cos-requirements.txt
python -m unittest discover -s tests -p 'test_cos_deploy.py'
npm ci --prefix experiments/bruno-projects --no-audit --no-fund
npm run build --prefix experiments/bruno-projects
SITE_BASE_PATH=/ python scripts/assemble-site.py
python scripts/audit-site.py public
```
