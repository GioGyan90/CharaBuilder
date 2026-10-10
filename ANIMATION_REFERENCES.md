# 动作来源与重定向方法

## 已接入：Quaternius Universal Animation Library Standard

- 作者原始发布：https://quaternius.com/packs/universalanimationlibrary.html
- 作者下载页面：https://quaternius.itch.io/universal-animation-library
- 作者上传的免费标准版：https://opengameart.org/content/universal-animation-library
- 取得 glTF 文件的公开镜像：https://github.com/J-Ponzo/gltf-universal-animation-library
- 许可：CC0-1.0；副本：`dist/assets/motion/LICENSE-Quaternius.txt`。
- 标准版含 45 个动作（另有 A_TPose 参考），本项目已选择 8 个与捏人预览相关的作者动作。

| 页面名称 | 原作者轨道 |
|---|---|
| 放松站姿 | Idle_Loop |
| 交谈手势 | Idle_Talking_Loop |
| 自然步行 | Walk_Loop |
| 挺拔步行 | Walk_Formal_Loop |
| 原地慢跑 | Jog_Fwd_Loop |
| 舞蹈展示 | Dance_Loop |
| 伸手交互（单次） | Interact |
| 拿取手势（单次） | PickUp_Table |

这些动画不是看图后自行编写曲线。原 glTF / bin 仅用于离线处理，没有把镜像中的角色网格放进产品。`provenance.json` 记录下载文件 SHA-256、选用源轨道和转换方式。

## 使用的方法

- Three.js 官方 `SkeletonUtils.retargetClip` 提供源/目标骨骼名映射、髋部位移缩放、局部偏移等参考： https://threejs.org/docs/pages/module-SkeletonUtils.html
- Three.js 官方蒙皮混合示例：https://threejs.org/examples/#webgl_animation_skinning_blending
- VRM 标准的人形骨骼命名可保持与原底模 humanoid 映射一致：https://github.com/pixiv/three-vrm

本项目采用小型 JS 重定向模块：以源文件自带 A_TPose 建立参考，按 30 Hz 采样作者轨道（旋转 SLERP，位移线性插值，常量 STEP 保持）；提取每个人形节点的世界旋转差，运行时补偿目标身体烘焙的 A 站姿，再沿实际目标骨骼层级恢复局部四元数。目标的骨骼长度始终使用参数变形后的长度。

额外处理：切换动作时 0.22 秒插值；根骨骼不做水平迁移，适合原地预览；髋部起伏按目标髋部高度缩放；可见鞋底采样修正整体高度。v26 已接入全部 30 节手指和左右整体脚趾的作者轨道；尚未启用根水平移动、完整锁脚 IK 或布料物理。v30 的自然呼吸 / 查看身体改为作者姿势与项目附加层组合，界面单独标明来源。

## 后续参考

Quaternius 原作者的动画查看器：https://quaternius.com/animviewer.html 。后续动作优先从同一套有明确许可的作者成品中选择，再考虑其他模型绑定动作。Mixamo 免费使用并不等于 CC0，公开资源库需要单独检查其内容分发条款，首轮未加入 Mixamo 资源。

## v26 手指与脚趾

已有男女底模均保留每指三节骨骼、原始蒙皮权重和左右整体脚趾骨骼（非五趾独立骨骼）。本轮提取全部 30 节手指作者曲线，按每节手指方向和掌面法线建立源/目标参考框架，补偿烘焙姿态，尤其避免拇指误用手臂朝向。站姿、走跑的手指多为作者设定的固定手型，随手腕运动；不附加自创周期曲线。Interact 与 PickUp_Table 含作者实际制作的手指开合，单次播放至末帧并保持，可按重播按钮再次查看。走跑中的整体脚趾轨道继续保留；不声称已有五趾单独动画。身体长度和手掌、脚掌参数仍由 JS 驱动。

测试覆盖 64 组男女/服装/体型/动作配置，全部 52 条人形轨道的源旋转一致性，30 节手指骨骼及非零蒙皮权重、相对手腕的实际指节转动、单次动作末帧保持，以及脚底高度和静止恢复。

## v30 自然呼吸与查看身体

两项通过 `motion.js` 的作者重定向链播放，不再由旧的 A 姿势正弦摆臂曲线驱动。

- 自然呼吸：`Idle_Loop` 保留作者放松站姿、手腕和手型；胸骨附加 4.8 秒呼吸周期，横向最多 0.4%、厚度最多 0.7% 的膨胀。
- 查看身体：12 秒分段，腿部/髋部以 `Idle_Loop` 为基础；上半身依次混入 `Interact`（看手部）和 `Idle_Talking_Loop`（看胸腹部）。手腕和 30 节手指保留相应作者轨道，不另造手指开合。
- 视线以当前参数体型下的手腕或躯干骨骼位置为目标，头颈分担低头/转头，限制角度；躯干只附加轻微转动。该视线与呼吸层由项目编写，不声称作者原包自带“查看身体”动作。
- 混合使用世界旋转四元数插值，再恢复目标局部旋转。方法参考 Three.js [AnimationAction 的权重和 crossFade](https://threejs.org/docs/pages/AnimationAction.html)；本项目仍使用已有轻量 JS 播放器，未另引入 AnimationMixer。
- 脚底高度修正和裤子动态法线继续在最终姿态后执行；暂停时相同时间的姿态不变，静止编辑会清除呼吸缩放和视线附加层。

`tests/motion.mjs` 检查原有 64 组作者动作/体型配置的轨道一致性，并检查 16 组呼吸/查看身体配置的指节运动、头部变化、循环边界、暂停重复采样、脚底、法线和静止恢复。另用真实蒙皮顶点离线渲染手部/胸腹阶段及呼吸站姿，供姿势检查；非浏览器 WebGL 截图。
