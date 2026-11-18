# SafePaw Family / 宠爱守护

用户上传的 `1.zip`—`5.zip` 分别对应 Figma 页面 `54:2` 的画框 `54:511`、`54:181`、`54:909`、`54:607`、`54:766`，每框 3488×1744。

保留全部 292 张原始 PNG；仅为兼容长中文文件名及路径字符而使用数字文件名，字节和字体图像不改。原名、尺寸、SHA-256、Figma 节点及实际渲染边界在 `source-inventory.json`。第一包的 `image 202` 在 Figma 页面层级，按原画布坐标放入第一张画板；原稿的 `54:579` 小圆点未包含于上传包，另从该节点导出为 `1/034.png`。

`safepaw-layers.js` 保存每张 PNG 的原始图层顺序及相对坐标。SVG 仅作为原始 PNG 的缩放和合成容器，未重绘项目图形、文字或字体；按整张画板预加载，避免多层透明 HTML 图片在部分合成器中的漏绘。支持原稿的 luminosity、darken、hard-light、multiply 合成；浏览器不支持的 LINEAR_BURN 用 multiply 兼容。

`cover.webp` 从实际网页第一张画板生成。Figma 对照截图仅在 `tests/fixtures/safepaw/` 用于 QA，不作为网站实现素材。
