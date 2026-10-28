# 二维剧情立绘实验

日期：2026-10-28。入口为仓库根目录的 `dialogue.html`，主页面顶部可切换工作区。

在仓库根目录运行 `python -m http.server 8000`，打开 `http://localhost:8000/dialogue.html`。无需 npm 安装或联网加载运行资源；需要 WebGL2。不要用 file:// 打开。

## 本次角色与表现

使用用户提供的 `fullbody.png`（1072 × 1920），暂称“持杆少女”。源文件完整保留为 `dist/assets/dialogue/lucky-npc/source.png`。

- 默认 15 秒可编辑对话，含文字逐步显示、小幅点头、歪头、后段微笑。
- 待机呼吸、轻微头部与头发运动、自然眨眼；眨眼、点头和歪头也可单独预览。
- 半身、全身、面部取景；可检查主体、眼球、睫毛、头发遮罩、闭眼及嘴型补图。
- 可选本地音频，按实际音频时长播放，并以 Web Audio RMS 驱动嘴巴。音频不上传；清除、暂停、隐藏页面和离开页面会停止或暂停播放并释放资源。
- 无配音时使用文字节奏模拟嘴型，标点处停顿，不生成语音。不是中文音素对口型。
- 表情包括自然、微笑与惊讶；动作幅度、时长可调整。支持 prefers-reduced-motion，默认将动作幅度及头发摆动置零。
- 独立保存二维编排及导出 JSON；本地音频不保存，重新打开时需重选。本实验尚未提供编排 JSON 导入或任意立绘自动绑定 UI。

## 实际拆解范围

主体使用连续网格；每只眼睛有眼球、上睫毛、下眼线和眼褶图层，头发有运动遮罩。闭眼两侧和开口嘴型使用补图贴片，跟随同一面部变形。**没有将躯干、手臂、球杆拆成可任意换姿势的完整 PSD/骨骼系统**。持杆手与球杆保留在主体中，不做挥杆表演。身体横向摇摆关闭，避免球杆被明显弯曲。

关键定位（源图像素）：头部影响中心约 (507,183)，颈部支点 (546,333)，眼睛中心约 (446,231)/(528,203)，嘴线中心 (505,278)，嘴角线倾角约 -0.32 弧度。眼睛 opening/roi 已通过放大网格与叠加检查校正；rig 使用该图专属坐标。

补图由内置 imagegen 编辑原画生成，保存为 `drawn-closed-speaking.png`。只导入眼口局部，并进行边缘羽化及局部肤色校正，保留原画其他部分。当前仅绘制闭眼与一种自然开口：`mouth_a` / `mouth_a_half` 共用同一张开口绘制，由运行库改变开口大小；不是四套独立元音原画。半闭眼仍使用网格闭合过渡，未提供独立半闭眼补图。

生成提示：编辑提供的持杆少女全身原画，保持构图、比例、面部位置、头部倾斜、发型、服装、球杆、手和颜色不变；仅将双眼改为自然闭合眼睑，将嘴改为小幅自然说话开口；保留透明背景和原画风格。工具返回的图像会统一缩放到原画尺寸，只裁切眼口区域使用。

## 运行库与再生成

使用 Mesh Avatar Studio 的 `mesh-avatar` 0.4.0，源修订 `774870e7cf3669ed3d216c196470ba7ba34d6376`。ESM 浏览器包位于 `dist/vendor/mesh-avatar/index.js`，由上游 `packages/runtime/src/index.ts` 使用 esbuild 打包，包含 fflate。保留双方 MIT 许可证，未使用 Miko 示例角色资产。

绑定与底层拆层用上游 `tools/build-layers.py` 生成；将本项目的 source.png 与 rig.json 放进上游的独立项目文件夹，执行：

```sh
uv run --with numpy --with pillow --with opencv-python-headless tools/build-layers.py projects/lucky-npc --rig rig.json
```

本仓库重新导入已绘制眼口贴片：

```sh
uv run --with pillow --with numpy --with opencv-python-headless scripts/build-dialogue-sprites.py
```

更新上游浏览器包时使用 esbuild 的 `--bundle --format=esm --target=es2022`，从上游 runtime 入口生成上述 vendor 路径；确保 fflate 可解析，并保留许可证。

## 工作区隔离

`index.html` 继续加载原三维应用；`dialogue.html` 单独加载二维应用，不导入 three.js 或三维编辑模块。二维存储键为 `lucky-break:dialogue-2d:v1`，二维 JSON 带有独立格式标记 `lucky-break-dialogue-2d`。两边角色、存档与参数不转换、不共享。

## 验证

自动检查：`node tests/dialogue-2d.mjs`、`node tests/archive.mjs`、`node tests/views.mjs`、`git diff --check`。

浏览器检查使用 Chromium 软件 WebGL：实际加载、播放/暂停、二维保存后刷新、拆层选择、本地 WAV 载入与清除、桌面/390px 手机布局，以及默认/闭眼/开口/左转/右转/点头的固定姿势。软件渲染不构成手机 GPU 性能验收。

## 已知限制

这是一个指定人物的制作实验，不是通用二维捏人器。大角度侧转、手臂换姿势、完整击球、精确中文对口型和更多表情需要额外补图与绑定。原画刘海遮住一只眼睛，眼睛与头发交界、放大面部时的补图融合仍应由美术按最终显示尺寸验收。

## 独立球杆实验 · 2026-10-28

球杆可见部分与握杆接触区域已从准备好的 base 拆成 `built/overlays/cue.png`、`grip.png`。这次仅提取原画可见像素，没有补绘被手指遮住的完整杆身，因此不支持直接移动球杆脱离手掌。`base-before-props.png` 保留拆分前主体；`python scripts/split-dialogue-prop.py` 可重复生成，并验证三层按原位置组合后逐像素还原原主体。原画和眼口贴片不覆盖。

运行库新增 overlay `space: "fixed"`：该层维持源图坐标，跳过人物网格变形；缺省仍按原方式跟随人物。两个接触层均固定，保留持杆姿势。界面可独立隐藏球杆并检查球杆／握杆层。此阶段是指定角色的人工轮廓拆层，不是任意立绘自动道具识别或通用轮廓编辑器。

本地扩展源码：`dist/vendor/mesh-avatar/extensions/overlays.js`，同步修改 bundled `index.js` 对应 createOverlayLayers。重新打包上游时需将扩展源码覆盖上游同名模块再构建。检查 `node tests/dialogue-props.mjs`：固定层跨姿势顶点完全不变，普通叠加层仍变形，显示开关独立。头部点头／歪头幅度略收敛，高刷新率修复保留。本轮不改资源导出。

## 差异化动作预设

新增摇头拒绝、侧目观察、低头回避、惊讶后仰、连续点头，组合不同头部曲线、视线、眼睑与表情。动作预览按钮可单独表演；「播放五种动作合集」载入20秒测试编排，并切换面部近景。逐句动作选择、保存与 JSON 编排均支持这些预设。球杆与接触层继续固定。动作基于已有正面立绘网格，不包含身体后退、大侧脸、新手势或换持杆姿势。

验证：预设方向、数值范围、回到初始姿态、表情及保存兼容；浏览器逐项预览、合集载入、原有播放/暂停、配音、刷新与手机布局检查。系统减少动态效果偏好保留，动作合集不会强制覆盖该偏好。
