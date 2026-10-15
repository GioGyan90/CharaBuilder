# 美漫男性基础头模候选：Quaternius Superhero Male

日期：2026-10-13。本轮仅进行资源调查、下载和顶点提取，未替换当前运行模型。

## 来源与许可

- 作者页面：https://quaternius.com/packs/universalbasecharacters.html
- 官方发行：https://quaternius.itch.io/universal-base-characters
- 可下载 GLB 的开源仓库：https://github.com/programasweights/avatar
- 转换来源记录：https://github.com/programasweights/avatar/blob/main/ASSETS.md
- GLB：https://raw.githubusercontent.com/programasweights/avatar/main/public/assets/character.glb
- 模型为 Quaternius Universal Base Characters 免费 Standard 包的 Superhero Male，CC0-1.0。仓库代码的 MIT 许可与模型许可分开。下载附带许可证已保存。
- 这是通用超级英雄男性基础模型。仓库将原始 glTF 打包为 GLB，保留几何、法线、蒙皮和骨架；材质已被替换，因此不把该 GLB 的颜色当作原始设计。

## 本地结果

目录：`artifacts/hero-reference/`

- `quaternius-superhero-male.glb`：完整原始下载文件。
- `QUATERNIUS-LICENSE.txt`：随模型保存的许可。
- `vertex-report.json`：SHA256、各网格统计、头部水平截面和眼睛/眉毛组件中心。
- `Sphere_005_Retopology_004-vertices.json`：头部与上颈皮肤的原始顶点编号、XYZ、原三角形编号和索引。
- `Face-vertices.json`：眉毛组件。
- `Face_001-vertices.json`：眼睛组件。
- `head-reference.png`：原始几何的正面与侧面检查图，无 Stone 贴图。

完整模型：8,483 个顶点、14,318 个三角形。其中身体连同头部 7,281 顶点 / 12,566 三角形；眉毛 646 / 984；眼睛 556 / 768。

头部研究区域使用网格局部坐标 y > 1.54，保留三个顶点均符合条件的三角形。选中皮肤 1,574 顶点 / 2,880 三角形，连眉毛与眼睛共 2,776 顶点 / 4,632 三角形。顶点数是导出缓冲区计数，包含 UV/法线接缝的重复点。该空间裁切不是语义分割或重新拓扑；预览下缘的锯齿是裁切边界。

复现：`artifacts/import-head-env/Scripts/python.exe -X utf8 scripts/inspect-superhero-reference.py`

## 对 Stone 的适用性

从原始几何正侧面看，这个候选具备明确的眉弓、鼻基底、上下唇、下颌角与颈部过渡，侧面颊部体积也较完整，可以作为成人男性结构参考，比继续依赖少年水滴型基础轮廓更值得试验。

但它不是 Stone 的现成替代：下巴仍偏尖长，嘴唇较厚，鼻翼较宽；需要按 Stone 原画收窄五官、加宽下巴底面、归纳颧骨与下颌平面。保留原始模型作为测量来源，在副本上建立结构参数，而不是直接把其他拓扑的顶点按编号复制到现有模型。

目前提取的是原始顶点和区域数据。眼睛/眉毛中心是组件点的均值，不是眼角等解剖标记；没有声称已自动识别全部五官关键点。下一步应先用无贴图正面、侧面和四分之三视角验证新基础型，再做 Stone 贴图适配。

## v78：结构参数接入

Stone GLB 和 f/r/b 原画为形状依据，Quaternius 为辅助结构参考，原始顶点资料保留在 artifacts/hero-reference。没有将 Quaternius 顶点按编号混入不同拓扑的当前模型。

新增 9 项连续素体控制（默认 50 中性）：颧弓厚度、下颌角前后位置、下巴底面方正度、颏唇沟深度、鼻基底支撑、上唇宽度、下唇宽度、颏下体积、额头倾斜。分别置于面容对应分组。与既有颞部、上颌、下颌升支、咬肌、侧脸承托、上下唇厚度/突出、颈部前移及胸锁乳突肌参数共同使用。

所有新增参数修改真实几何，以源坐标和连续权重计算；不增加独立皮肤壳或新的接缝。当前仍作用在连续素体上，后续减面/重拓扑版本需要重新标定 landmark 和权重，不保证任意 GLB 直接套用。默认不改变当前形状；本轮未执行减面。

验证：continuous-foundation 检查单参数顶点位移、新参数组合下的 72 个共享边界点及动作连续性、眉毛不受眼睛缩放拖低、鼻尖保护；archive 检查参数存档往返。均通过。
