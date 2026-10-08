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
- 原版 / 短款 / 光头发型，原版 / 素色套装，颜色选择和 6 种表情。
- 拖动旋转、缩放、自动旋转、全身 / 面部视角。
- 随机角色、重置、本机多角色档案、删除与载入。
- 导出 / 导入带版本号的 JSON 角色参数文件。

保存使用浏览器 localStorage，不会上传到 GitHub 或云端；清除浏览器数据会删除档案，请导出 JSON 备份。JSON 保存的是可继续编辑的角色参数，不是 GLB、骨骼或贴图。

## 项目结构

- `dist/index.html`：应用入口和界面。
- `dist/style.css`：桌面 / 移动端响应式样式。
- `dist/app.js`：编辑界面与存档逻辑。
- `dist/anime.js`：VRoid 衍生日漫模型、连续变形与卡通材质。
- `scripts/prepare-vroid.py`：可复现的 VRoid 资源转换。
- `dist/assets/anime/`：日漫模型分片与贴图；旧 MakeHuman 资源保留作历史来源。
- `dist/vendor/`：本地 Three.js 与 OrbitControls，无 CDN 运行依赖；许可证见 `THREE-LICENSE.txt`。

当前底模为 VRoid beta HairSample 男、女模型的 CC0 衍生版本，保留日漫五官、贴图眉毛、原有发片与配套服装。局部五官及身材使用有限幅度的连续变形。来源、许可证和加工说明见 THIRD_PARTY.md。

可将 `dist` 目录直接部署到静态托管服务。

浏览器需支持 WebGL、ES Modules 和 DecompressionStream。首次进入会载入约 2.9 MB 的模型和贴图数据。GitHub Pages 从 main 根目录部署时，根目录 index.html 为应用入口。

### 日漫角色版本

当前预览已改为 CC0 VRoid beta HairSample 男、女模型，使用原有日漫脸部、贴图眉毛、发片与配套服装，以及 Three.js 卡通明暗。可调整身材、局部五官、表情、原版/短款发型和配色。旧角色 JSON 可继续载入，旧服装选择映射为原版套装。

这是网页中的静态角色编辑器，不包含 VRoid Studio 全部功能，也不提供 VRM 模型导出。服装现阶段为女性连衣裙、男性连帽上装与长裤的原版/素色版本；原有不匹配新底模的服装已从选择项收起。JSON 导出仍为参数档案。

转换资源：下载 `HairSample_Female.vrm` / `HairSample_Male.vrm` 到同一目录并命名为 `female.vrm` / `male.vrm`，运行 `python scripts/prepare-vroid.py 该目录`。许可与来源见 THIRD_PARTY.md。
