# CharaBuilder · 角色工坊

基于 Three.js 的轻量浏览器捏人工具，中文界面，无构建步骤、无需安装 npm 依赖。

## 启动（Windows / PowerShell）

安装 Python 3 后，在项目目录执行：

```powershell
py -m http.server 8000 --directory dist
```

浏览器打开 http://localhost:8000 。macOS / Linux 可使用 `python3` 替代 `py`。请通过 HTTP 访问，不要双击 HTML 文件（浏览器 ES Modules 需要 HTTP）。需要支持 WebGL 的现代浏览器。

## 功能

- 性别、身高、体型、肩宽、腿长、肤色调整。
- 脸宽、下颌、眼睛大小与间距、鼻子、嘴唇调整。
- 5 种发型、4 套简单服饰及颜色选择。
- 拖动旋转、缩放、自动旋转、全身 / 面部视角。
- 随机角色、重置、本机多角色档案、删除与载入。
- 导出 / 导入带版本号的 JSON 角色参数文件。

保存使用浏览器 localStorage，不会上传到 GitHub 或云端；清除浏览器数据会删除档案，请导出 JSON 备份。JSON 保存的是可继续编辑的角色参数，不是 GLB、骨骼或贴图。

## 项目结构

- `dist/index.html`：应用入口和界面。
- `dist/style.css`：桌面 / 移动端响应式样式。
- `dist/app.js`：编辑界面与存档逻辑。
- `dist/human.js`：连续人体网格、变形与简易服装。
- `dist/assets/`：MakeHuman 衍生模型与变形数据（gzip JSON）。
- `dist/vendor/`：本地 Three.js 与 OrbitControls，无 CDN 运行依赖；许可证见 `THREE-LICENSE.txt`。

人体已替换为 MakeHuman hm08 的 CC0 连续网格，使用现成男女体型与五官变形数据。肩宽和腿长使用有界连续变形，服装基于拟合辅助网格，发型仍为简化造型。当前保留 A 字站姿，不含骨骼动画、模型导出或云端同步。来源、许可证和加工说明见 THIRD_PARTY.md。

可将 `dist` 目录直接部署到静态托管服务。

浏览器需支持 WebGL、ES Modules 和 DecompressionStream。首次进入会载入约 900 KB 的压缩人体数据。GitHub Pages 从 main 根目录部署时，根目录 index.html 为应用入口。
