# 发型模型来源与转换说明

用户要求：发型和服装参考必须是他人已经建好的 3D 模型。保留作者的造型结构，再拆分、适配为 JS 参数可调的网格；照片只用于核对，不代替原模型。找不到合适且许可允许复用的款式先留缺。

## v15 已导入的真实模型

| 预设 | 原模型 / 作者 | 许可 | 原始结构 | 接入方式 |
| --- | --- | --- | --- | --- |
| 侧分短发 | [Side parting hairstyle for male model](https://opengameart.org/content/side-parting-hairstyle-for-male-model) / Micket | CC0 | 114 顶点，131 多边形，201 三角面 | 原网格、法线及不对称侧分保留；没有另造发束或添加虚构纹理。 |
| 上梳短发 | [Upcomb hair style for male model](https://opengameart.org/content/upcomb-hair-style-for-male-model) / Micket | CC0 | 132 顶点，148 多边形，236 三角面 | 原网格、UV、法线保留；原发流贴图转为灰度，仍受发色 / HSL 控制。 |

这里的名称对应作者实际提供的款式。不将上梳短发改名为军式、平头或圆寸。v13–v14 自造的四款短发及照片参考已撤下；这些款式等待取得合适的现成 3D 模型后再加入。

### 网格可追溯

- `.blend` 对象矩阵转换为 Three.js 的 Y-up 坐标；原多边形扇形三角化，不重建外形、不重拓扑。
- 展开角点以保留 UV 接缝及原平滑/硬边法线。运行顶点数因此分别为 463 / 532，三角面仍为 201 / 236。
- 原顶点编号保存在转换数据 `sourceVertexIds`，原文件 SHA-256 记录在 `sidepart-manifest.json`、`upcomb-manifest.json`。
- 只导入发型对象。为当前二次元头部做仿射尺寸适配，再按原网格位置划成前发、后发、侧发，完整预设不会额外叠加 VRoid 头皮。
- 分区使用同一个连续长度形变，避免共享边随不同长度滑块裂开。原骨骼绑定及头部参数继续生效。
- 构建脚本为 `scripts/prepare-authored-hair.py`。源文件临时下载、转换后删除；运行时用现有 JS BufferGeometry 与压缩网格数据，不加载 GLB / VRM / Blender。

这是原模型网格的直接复用与适配，不是声称通过 JS 从头模拟作者的建模过程。原资产属于低多边形风格，细节上限由原资产决定。

## 性别筛选

| 编辑状态 | 显示 | 隐藏 |
| --- | --- | --- |
| 男性 | 侧分短发、上梳短发、原有层次短发；对应前 / 后 / 侧分区 | 双马尾、侧卷马尾、波波及女性长发分区；马尾控件 |
| 女性 | 波波、柔顺长发、层次短发、双马尾、侧卷马尾；对应分区 | 本轮男性侧分 / 上梳短发分区及预设；已撤下的极短试验款 |

这是本游戏的编辑器选项规则。随机、导入、存档载入和性别切换统一应用；共有选项保留，不适用的分区改为对应性别的默认选项，马尾在男性时改为无。

## 原有模型

原有波波、长发、层次短发和马尾继续从许可允许的旧版 CC0 VRoid 模型中提取已建好的发束。具体文件和许可见 [THIRD_PARTY.md](THIRD_PARTY.md)。新款服装也必须沿用上述现成 3D 模型来源规则。

## v32 culturalibre 分层短发

- 原作者：[culturalibre Hair06](https://www.makehumancommunity.org/node/2479)。官方 [Hair01 资产包清单](https://static.makehumancommunity.org/assets/assetpacks/hair01.html) 标明 CC0。
- 源模型镜像：[固定提交的实际 GLB](https://github.com/beepobb/immersive-vr/blob/b761d0efa3f7fe487285c04fb01c6ff552586269/assets/Hair/culturalibre_hair_06.glb)，SHA-256 `547cb7b557827accc49d903704a39d142843de632f0beefb8186bc6936d6cd7a`。
- 保留10430源顶点、14688源三角面、UV与作者发束；粉色底色转为中性灰纹理。`scripts/prepare-culturalibre-hair.py` 输出 `layered06-*` 压缩JSON顶点数据，浏览器不加载 GLB。源GLB转换后删除。
- 新增男性“作者分层短发”组合与前/后/侧分区。原样组合保留作者刘海方向；Stone 的独立变体缩短下部发束并连续上梳前部，保持原拓扑，不能称作作者原样或参考肖像精准复刻。灰鬓由 Stone 的表面材质参数产生。
- Cortu 的 short messy hair 也实际下载并检查过，但垂落方向不符合目标，没有接入，也没有拿照片生成替代发束。
