# 动作来源与重定向方法

## 已接入：Quaternius Universal Animation Library Standard

- 作者原始发布：https://quaternius.com/packs/universalanimationlibrary.html
- 作者下载页面：https://quaternius.itch.io/universal-animation-library
- 作者上传的免费标准版：https://opengameart.org/content/universal-animation-library
- 取得 glTF 文件的公开镜像：https://github.com/J-Ponzo/gltf-universal-animation-library
- 许可：CC0-1.0；副本：`dist/assets/motion/LICENSE-Quaternius.txt`。
- 标准版含 45 个动作（另有 A_TPose 参考），本项目首轮选择 6 个与捏人预览相关的动作。

| 页面名称 | 原作者轨道 |
|---|---|
| 放松站姿 | Idle_Loop |
| 交谈手势 | Idle_Talking_Loop |
| 自然步行 | Walk_Loop |
| 挺拔步行 | Walk_Formal_Loop |
| 原地慢跑 | Jog_Fwd_Loop |
| 舞蹈展示 | Dance_Loop |

这些动画不是看图后自行编写曲线。原 glTF / bin 仅用于离线处理，没有把镜像中的角色网格放进产品。`provenance.json` 记录下载文件 SHA-256、选用源轨道和转换方式。

## 使用的方法

- Three.js 官方 `SkeletonUtils.retargetClip` 提供源/目标骨骼名映射、髋部位移缩放、局部偏移等参考： https://threejs.org/docs/pages/module-SkeletonUtils.html
- Three.js 官方蒙皮混合示例：https://threejs.org/examples/#webgl_animation_skinning_blending
- VRM 标准的人形骨骼命名可保持与原底模 humanoid 映射一致：https://github.com/pixiv/three-vrm

本项目采用小型 JS 重定向模块：以源文件自带 A_TPose 建立参考，按 30 Hz 采样作者轨道（旋转 SLERP，位移线性插值，常量 STEP 保持）；提取每个人形节点的世界旋转差，运行时补偿目标身体烘焙的 A 站姿，再沿实际目标骨骼层级恢复局部四元数。目标的骨骼长度始终使用参数变形后的长度。

额外处理：切换动作时 0.22 秒插值；根骨骼不做水平迁移，适合原地预览；髋部起伏按目标髋部高度缩放；可见鞋底采样修正整体高度。没有启用动作中的手指轨道、根水平移动、完整锁脚 IK 或布料物理。原有轻微呼吸 / 查看身体仍是项目自制程序曲线，界面单独标明来源。

## 后续参考

Quaternius 原作者的动画查看器：https://quaternius.com/animviewer.html 。后续动作优先从同一套有明确许可的作者成品中选择，再考虑其他模型绑定动作。Mixamo 免费使用并不等于 CC0，公开资源库需要单独检查其内容分发条款，首轮未加入 Mixamo 资源。
