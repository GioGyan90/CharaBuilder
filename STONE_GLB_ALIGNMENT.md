# Stone GLB 对齐 · v79

日期：2026-10-14。运行预设为“试用 Stone 面部贴图”。此次只校准参数，不替换拓扑、骨架、材质或头模资源。

## 方法

读取原 ComfyUI_00003_.glb，以此前人工种子附近采样的眼部与嘴部标记进行统一缩放和平移。对当前脸部皮肤的 285 个下半脸样本建立最近表面对应，使用参数有限差分与有正则约束的最小二乘得到初始建议。标记不是自动识别的解剖真值；最近点误差也不是人物相似度。

自动结果过度收窄，因此人工复核后保留方下巴、适度下颌宽度和侧脸体积。最终参数在 artifacts/stone-fit-v79/reviewed-candidate.json；原始预设在 baseline-state.json，可回溯。Stone 是造型依据，Quaternius 仍仅作辅助结构参考。

主要参数：侧脸承托 78→45、下颌体承托 65→38、面颊 50→25、下颌宽度 60→38、下颌底缘 60→40、咬肌 65→50；下巴宽度 74→72，新增方正度 80，下颌角前后 70、颧弓厚度 57。

固定配准下，所选样本的平均最近点距离由 0.010475 降至 0.005687（运行坐标单位）。这只描述选定皮肤样本；不覆盖全头，不表示还原率。鼻唇轮廓、颧下贴图阴影与下颌骨面转折仍需进一步处理。

## 验证与文件

- 正面、右侧、右四分之三：front.png / side.png / quarter.png。
- 白模：clay-quarter.png / clay-side.png。
- 几何叠加：before-overlay.png / after-overlay.png。
- continuous-foundation：实际校准预设的 72 个共享边界点、动作连续性、新参数默认中性、眉毛与鼻尖保护。
- archive：角色存档往返通过。

以上截图与测量位于 artifacts/stone-fit-v79/。

复现测量：依次运行 node scripts/fit-stone-structure.mjs 与 artifacts/import-head-env/Scripts/python.exe -X utf8 scripts/fit-stone-structure.py。脚本使用保留的 baseline-state.json；automatic-candidate.json 是未经过视觉复核的建议，不能覆盖 reviewed-candidate.json。
