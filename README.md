# CharaBuilder · 角色工坊

基于 Three.js 的轻量浏览器捏人工具，中文界面，无构建步骤、无需安装 npm 依赖。

## 启动（Windows / PowerShell）

安装 Python 3 后，在项目目录执行：

```powershell
py -m http.server 8000 --directory dist
```

浏览器打开 http://localhost:8000 。macOS / Linux 可使用 `python3` 替代 `py`。请通过 HTTP 访问，不要双击 HTML 文件（浏览器 ES Modules 需要 HTTP）。需要支持 WebGL 的现代浏览器。

## 功能

- 男女日漫身体，身高、头部、肩宽、胸腰臀、腿长和粗细等参数。
- 五官、下巴、额头、鼻梁、嘴部位置及 6 种表情。
- JS 分区发型：前发（无 / 齐刘海 / 中分 / 侧分）、后发（无 / 短 / 齐颈 / 长）、侧发（无 / 短 / 长）、发辫（无 / 后发辫 / 双发辫）。各区长度与蓬松度可调整。
- 男女统一衬衫与长裤：衣长、袖长、衬衫宽松度和裤腿宽度，独立配色。
- 旋转、缩放、全身 / 面部视角，多角色本机存档，JSON 参数导入 / 导出。

旧整套发型存档迁移为分区参数，旧服装统一转为衬衫配裤子，原有身材、五官和颜色保留。存档使用浏览器 localStorage；请导出 JSON 备份。JSON 是角色参数档案，不是 GLB、骨骼或贴图。

## 项目结构

- `dist/app.js`：中文界面、参数、存档和异步更新。
- `dist/parameters.js`：人体和五官的共享空间变形。
- `dist/hair.js`：JS 生成贴合原始头骨的发帽、曲线发束和三股发辫。
- `dist/wardrobe.js`：衬衫与长裤的 JS 剪裁和版型参数，以及程序生成的纽扣位置。
- `dist/anime.js`：基础网格加载、组合、变形、法线和 Three.js 材质。
- `dist/assets/anime/`：CC0 基础网格和贴图；旧发型、服装资源作为历史来源保留。
- `scripts/prepare-vroid.py`、`scripts/fit-vroid-presets.py`：基础资源的可复现转换流程。
- `dist/vendor/`：本地 Three.js / OrbitControls，无 CDN 运行依赖。

人体保留 CC0 VRoid beta 模型的拓扑、UV 和初始顶点，JS 计算最终形状。发型不再加载完整发型预设：发帽按真实头骨射线取样，发束由曲线和截面生成，发辫由三条交织曲线生成。衬衫和长裤沿用第一种方案，保留现有衣物的拓扑，由 JS 调整衣长、袖长和宽松度；女裤由 CC0 男裤基础网格适配。鞋履沿用原有基础模型。

人体、衣服和头发应用同一身体变形；五官与眉毛应用同一脸部变形。衣物不依赖原来的领结、领带、背心或花纹贴图，当前为纯色衬衫与裤子。身体在衣物覆盖区域裁去隐藏三角形；袖长改变时调整遮挡区域。此工具仍为静态编辑器，尚无动画骨骼或 GLB / VRM 导出。极端参数组合仍需实际画面检查。

用 HTTP 启动后即可使用；可直接部署 `dist` 或使用根目录入口部署 GitHub Pages。浏览器需支持 WebGL、ES Modules 和 DecompressionStream。资源来源与许可见 THIRD_PARTY.md。

## 验证

无需安装依赖，Node.js 24：

```sh
node tests/parameters.mjs
node tests/archive.mjs
node tests/modular.mjs
```

覆盖所有 288 个男女分区发型组合、极端参数、关闭所有发区、网格数据、旧存档迁移与新参数往返。几何数据检查不能替代 WebGL 画面验收。

下面保留原始 CC0 资源转换说明；新版仅使用其中的身体、脸、衬衫和裤子基础结构。

### 扩展预设转换

旧版 CC0 源文件位于 `madjin/vrm-samples/vroid/beta`。在上述基础模型目录下创建 `donors`，将 `Sendagaya_Shibu.vrm`、`Sendagaya_Shino.vrm`、`Sakurada_Fumiriya.vrm`、`Victoria_Rubin.vrm` 分别命名为 `bob.vrm`、`long.vrm`、`uniform.vrm`、`classic.vrm`。然后运行：

```sh
python scripts/prepare-vroid.py 该目录/donors bob long uniform classic
python scripts/fit-vroid-presets.py
```

转换采用共享基础骨架，按皮肤 UV 对应保留当前头部，发型与服装可以独立选择。遮挡皮肤和衣物来自同一套源网格；头发保留嵌入头皮的根部，末端按各套装的表面修正间隙。服装仍以整套切换，不支持任意混搭上装与下装。

