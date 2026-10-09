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
- 参考 CC0 成熟发型的分区编辑：前发、后发、侧发与马尾独立组合，保留原作者的发束拓扑、UV、层次、卷曲和纹理。提供经典波波、柔顺长发、层次短发、双马尾、侧卷马尾组合；长度和蓬松度由 JS 参数控制。
- 男女衬衫与长裤：衣长、袖长、衬衫宽松度和裤腿宽度；另有女性运动内衣配内裤、男性贴身平角内裤版本。穿鞋 / 光脚独立选择，颜色和身体参数继续有效。
- 旋转、缩放、全身 / 面部视角，多角色本机存档，JSON 参数导入 / 导出。

旧整套发型存档迁移为分区参数，旧服装统一转为衬衫配裤子，原有身材、五官和颜色保留。存档使用浏览器 localStorage；请导出 JSON 备份。JSON 是角色参数档案，不是 GLB、骨骼或贴图。

## 项目结构

- `dist/app.js`：中文界面、参数、存档和异步更新。
- `dist/parameters.js`：人体和五官的共享空间变形。
- `dist/hair.js`：按完整发束拆解 CC0 成熟发型、选择组合、头部适配和有界参数变形。
- `dist/underwear.js`：在成人基础身体表面裁剪贴身内衣，保留约 2 mm 间隙。
- `dist/wardrobe.js`：衬衫与长裤的 JS 剪裁和版型参数，以及程序生成的纽扣位置。
- `dist/anime.js`：基础网格加载、组合、变形、法线和 Three.js 材质。
- `dist/assets/anime/`：CC0 基础网格和贴图；旧发型、服装资源作为历史来源保留。
- `scripts/prepare-vroid.py`、`scripts/fit-vroid-presets.py`：基础资源的可复现转换流程。
- `dist/vendor/`：本地 Three.js / OrbitControls，无 CDN 运行依赖。

人体保留 CC0 VRoid beta 模型的拓扑、UV 和初始顶点，JS 计算最终形状。发型基于旧版 CC0 HairSample_Female、Sendagaya Shibu、Sendagaya Shino、Sakurada Fumiriya、Victoria Rubin 的作者网格。按网格连通的完整发束分区，保留原有拓扑、渐细轮廓、UV 与纹理，不再用重复数学发束凑轮廓；头皮帽沿用经过头部表面拟合的源网格。经典组合优先保持同一作者发型的设计，各区仍可独立搭配。马尾来源为原版双马尾和侧卷马尾，当前不含编织辫。新增几何不依赖受限的 VRoidPreset A–Z，不包含原始 VRM 文件。衬衫和长裤沿用第一种方案，保留现有衣物的拓扑，由 JS 调整衣长、袖长和宽松度；女裤由 CC0 男裤基础网格适配。鞋履沿用原有基础模型。

人体、衣服和头发应用同一身体变形；五官与眉毛应用同一脸部变形。衣物不依赖原来的领结、领带、背心或花纹贴图，当前为纯色衬衫与裤子。衬衫长裤模式裁去衣物覆盖区的隐藏身体三角形；袖长改变时调整遮挡区域。内衣模式恢复完整身体与手脚，服装由身体表面裁剪生成，并随身体参数共同变形。光脚模式移除鞋网格，依据可见脚底落地；包围盒只计入可见三角形。此工具仍为静态编辑器，尚无动画骨骼或 GLB / VRM 导出。极端参数组合仍需实际画面检查。

用 HTTP 启动后即可使用；可直接部署 `dist` 或使用根目录入口部署 GitHub Pages。浏览器需支持 WebGL、ES Modules 和 DecompressionStream。资源来源与许可见 THIRD_PARTY.md。

## 验证

无需安装依赖，Node.js 24：

```sh
node tests/parameters.mjs
node tests/archive.mjs
node tests/modular.mjs
```

覆盖全部男女分区发型组合、极端参数、关闭所有发区、内衣 / 外衣与穿鞋 / 光脚切换、完整身体恢复、脚底落地、网格数据和存档迁移。几何数据检查不能替代 WebGL 画面验收。

下面保留原始 CC0 资源转换说明；新版仅使用其中的身体、脸、衬衫和裤子基础结构。

### 扩展预设转换

旧版 CC0 源文件位于 `madjin/vrm-samples/vroid/beta`。在上述基础模型目录下创建 `donors`，将 `Sendagaya_Shibu.vrm`、`Sendagaya_Shino.vrm`、`Sakurada_Fumiriya.vrm`、`Victoria_Rubin.vrm` 分别命名为 `bob.vrm`、`long.vrm`、`uniform.vrm`、`classic.vrm`。然后运行：

```sh
python scripts/prepare-vroid.py 该目录/donors bob long uniform classic
python scripts/fit-vroid-presets.py
```

转换采用共享基础骨架，按皮肤 UV 对应保留当前头部，发型与服装可以独立选择。遮挡皮肤和衣物来自同一套源网格；头发保留嵌入头皮的根部，末端按各套装的表面修正间隙。服装仍以整套切换，不支持任意混搭上装与下装。

