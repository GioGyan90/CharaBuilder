# Human assets and anatomical references

## MakeHuman hm08 (CC0 1.0)

- Upstream: https://github.com/makehumancommunity/makehuman
- Revision inspected: `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`
- Base: `makehuman/data/3dobjs/base.obj`
- Sculpt data: `makehuman/data/targets/{macrodetails,head,chin,eyes,nose,mouth}`
- Full asset license: `dist/assets/LICENSE-MAKEHUMAN.txt`
- Official reuse guidance: https://static.makehumancommunity.org/mpfb/faq/build_other_chargen.html

Included derivatives contain body, garment helpers, eye helpers, and joint landmarks from hm08. Helper skeleton cubes, teeth, tongue and genital helper surfaces are not rendered. Six adult body states combine equal Asian/Caucasian adult phenotype targets with gender-specific average-muscle weight targets. Twenty sculpted facial targets drive the face controls. Coordinates are quantized to 0.001 upstream units, triangulated, and packaged as gzip JSON. No MakeHuman application source code is copied.

`dist/human.js` implements a browser renderer for these assets. Shoulder and leg adjustments are restrained continuous deformations; height is uniform scaling. They are not a full port of MakeHuman's modifier system. The neutral A-pose is preserved. Shirts, trousers and shoes use offset copies of the deformed body surface, with clipped hems, thickness rims and matching skin masks. The skirt uses a conservative body-enclosing profile. Hair caps are projected onto the sculpted skull; long hair uses a separate drape with shoulder clearance. These garments and hairstyles remain simplified prototypes.

Rebuild: download base.obj and the selected .target files from the above revision, then run `python scripts/prepare-human.py <base.obj> <target-folder>` (requires Python and NumPy). The target folder should contain the six universal gender/weight targets, four Asian/Caucasian adult targets, and the twenty facial targets corresponding to the controls in human.js.

## Structure references

- Proko, Mannequinization: https://www.proko.com/course-lesson/mannequinization-structure-of-the-human-body/
- Proko, Robo Bean: https://www.proko.com/course-lesson/how-to-draw-structure-in-the-body-robo-bean

Used as anatomical construction references, not copied artwork or mesh assets.

## Three.js

Three.js r186 and OrbitControls: MIT. See `dist/vendor/THREE-LICENSE.txt`.

## VRoid beta HairSample replacement (active model)

- Models: `HairSample_Female.vrm`, `HairSample_Male.vrm`, created by pixiv's VRoid Project.
- Source mirror: https://github.com/madjin/vrm-samples/tree/master/vroid/beta
- Official license confirmation: https://vroid.pixiv.help/hc/en-us/articles/4402614652569
- Both files embed VRM `licenseName: CC0`, commercial usage and modification allowed. The official FAQ explicitly lists HairSample_Female and HairSample_Male among the CC0 models.
- These are **beta HairSample models**, not the newer VRoidPreset_A–Z models. Newer presets have separate restrictions and are not included here.
- Changes: bake relaxed arm pose; remove female cat-ear accessory; remove unused expression targets and special EyeExtra graphics; retain five expressions; merge hair primitives by material; quantize/compress mesh data; resize main textures to 512 px; normalize hair, pants and shoe luminance for tinting. Runtime uses Three.js MeshToonMaterial, not a complete MToon implementation.
- CC0 legal text: https://creativecommons.org/publicdomain/zero/1.0/legalcode
- Prepared assets in `dist/assets/anime`; reproducible conversion in `scripts/prepare-vroid.py` (NumPy and Pillow).
- MakeHuman assets remain in the repository as legacy source; the active app no longer loads them.

## Modular hair and outfit presets (v6)

All donors are original **beta** CC0 model versions from `madjin/vrm-samples/vroid/beta`, with embedded `licenseName: CC0`, modification and commercial use allowed:

| Asset ID | Source | Extracted parts | Official terms |
| --- | --- | --- | --- |
| bob | Sendagaya_Shibu.vrm | Bob hair with scalp cap | https://vroid.pixiv.help/hc/en-us/articles/360012381793 |
| long | Sendagaya_Shino.vrm | Straight long hair, blouse/bow/vest/skirt outfit | https://vroid.pixiv.help/hc/en-us/articles/360013482714 |
| uniform | Sakurada_Fumiriya.vrm | Layered medium-short hair, shirt/tie/vest/trousers outfit | https://vroid.pixiv.help/hc/en-us/articles/360014788554 |
| classic | Victoria_Rubin.vrm | Curled side ponytail, ornate classical dress outfit | https://vroid.pixiv.help/hc/en-us/articles/360014900233 |

Changes: relaxed pose and shared anatomical bone translations; preserve donor hair auxiliary bones; transfer base head skin via UV correspondence so changing clothing preserves the face; retain source garment and covered-skin masks; fit scalp caps to skin and visible hair lengths to each outfit without moving intentionally embedded strand roots; compact used vertices; compress modular data; resize main textures; normalize hair/pants/shoes for tinting. Full model expressions are retained only by the base face.

No new VRoidPreset_A–Z models, or BOOTH assets that forbid redistribution, are included. Source meshes/textures are public-domain assets under CC0; this does not claim that VRoid Studio itself is open source.

## Modular JS hair and shirt/trouser editor (v8)

Active hair is generated in `dist/hair.js`; it uses the CC0 base skull only as a fitting surface. No donor hair meshes are used to construct the generated hair, and hair textures are not loaded. Shared legacy mesh packs still contain unused hair data. Shirt topology comes from Sendagaya Shino (female) / Sakurada Fumiriya (male); trousers use Sakurada Fumiriya adapted to either body. The source shirt/tie/vest textures and neck accessories are omitted. JS reshapes the garment topology and adds generated buttons. Original base shoes are retained. Skin triangles hidden by the new garments are omitted; body skin is rendered with a plain material, while face maps remain. Historical assets are kept for provenance and migration. This implementation does not use the restricted VRoidPreset A–Z assets.

## Reference-based modular hair and underwear (v9)

Active hair now preserves the connected authored locks, topology, normals, UVs and normalized hair textures of the previously verified CC0 beta sources: HairSample_Female (parted front/twin tails), Sendagaya Shibu (bob), Sendagaya Shino (straight long), Sakurada Fumiriya (layered short), and Victoria Rubin (curled side ponytail). Runtime code splits whole connected locks into front/back/side/tail modules, adapts them to the selected adult head, uses fitted donor scalp caps and applies bounded JS shape parameters. No restricted A–Z data is used. Raw VRM files are not included in the repository; licensed runtime mesh packs and attribution remain.

Underwear is generated by clipping the CC0 adult body surface with a 2 mm normal offset. Female mode uses a sports top and briefs; male mode uses fitted boxer briefs. Bare feet use the original complete CC0 skin geometry, not the shoe meshes.

v10 additionally retains the original CC0 beta HairSample skeleton hierarchy, relaxed-rest joint positions and body/face skin weights in compressed JSON text packs. The rig extraction script records and checks the embedded CC0 license. Clothing skin weights are transferred from the fitted base body; hair follows the head bone. Animation curves are authored in JavaScript for this project.

## v15 现成短发模型

Micket，2013，CC0-1.0：

- [Side parting hairstyle for male model](https://opengameart.org/content/side-parting-hairstyle-for-male-model)，源文件 `side_parting_hair.blend`。运行数据 `dist/assets/anime/sidepart.b64`，原 114 顶点、131 多边形，转换后 201 三角面。
- [Upcomb hair style for male model](https://opengameart.org/content/upcomb-hair-style-for-male-model)，源文件 `upcomb_hair.blend` 与 `upcomb_hair_texture.png`。运行数据 `upcomb.b64`、`upcomb-hair.png`，原 132 顶点、148 多边形，转换后 236 三角面。贴图缩小并转为灰度，保留原发流细节与 alpha，避免固有棕色叠加自选发色。

仅转换作者的发型对象，不导入参考人头、场景灯光或相机。多边形扇形三角化，角点展开以保留原 UV 与平滑/硬边法线，原造型和不对称保留。头部适配使用仿射缩放，前、后、侧分区共用连续的长度形变，绑到角色头骨。源文件 SHA-256 记录在各 manifest；转换脚本 `scripts/prepare-authored-hair.py`，构建时依赖 Blender Asset Tracer 的读取器，不将其代码打包进应用。原 `.blend`、GLB、VRM 不随运行时分发。

v14 四张照片参考及对应自创短发已撤下，不能作为模型来源。


## v16 独立作者头部

- 女性：FACE BASE Woman，byzmod3d，[作者来源](https://opengameart.org/content/face-base-woman)，CC0。从原 .blend 的 FACE_Cube.002 和 FACE.001_Cube.001 对象提取，不导入作者头发或身体。灰度化/中和原贴图底色，保留局部绘制细节。
- 男性：This work is based on "Male Head Base mesh" (https://sketchfab.com/3d-models/male-head-base-mesh-6a480c4603cd4768b615393e93dbd7d0) by DEGUIDER (https://sketchfab.com/DEGUIDER) licensed under CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/).
- 转换：保留作者头部及眼部拓扑，三角化、坐标转换、量化；运行时拟合身高/头部尺寸/颈部，添加头颈权重。男性无贴图，眼球保留原作；瞳孔、高光和眉毛复用已有 CC0 VRoid 组件。两款不包含可复用表情形态键，本轮只开放自然表情。
- 生成脚本：scripts/prepare-authored-faces.py；源文件 SHA-256、三角数、许可及作者记在 femalehead/malehead-manifest.json。运行时只加载压缩数组/PNG，不加载原 .blend、glTF、bin。

### v17 reference-guided face adaptation

The byzmod3d and DEGUIDER heads retain their source topology. Runtime adaptations now include piecewise eye/top/chin alignment, skull depth and neck fitting to the existing VRoid beta preset, reference-surface blending and local smoothing of central facial relief, neutralized painted skin shading, toon light bands and a rigged outline. Original author identity and license attribution above continue to apply. No expression morphs were created for these heads.

### v18 anime face module (current runtime)

The complete converted byzmod3d/DEGUIDER head meshes are no longer loaded for rendering. Their facial jaw proportions, excluding the neck, are sampled by `scripts/prepare-face-guides.py`, with attribution and input-data hashes preserved in `dist/face-guides.js`. The visible face topology, UV/painted detail, eyes, brows and rig remain the existing CC0 VRoid beta assets. `dist/face.js` supplies JS feature-region deformation and the reference-proportion blend; the source donor necks and realistic skulls are not used. 绫 and 隼 are this project's new preset names, not source author character names. The attribution and source license information above remain preserved for the reference measurements and stored intermediate source conversions.

## v23 Quaternius authored animations

Author: Quaternius. **Universal Animation Library Standard**, CC0-1.0.
Original: https://quaternius.com/packs/universalanimationlibrary.html
Downloaded glTF mirror: https://github.com/J-Ponzo/gltf-universal-animation-library
License copy: `dist/assets/motion/LICENSE-Quaternius.txt`.

Six source tracks are sampled at 30 Hz and normalized against the supplied A_TPose into `dist/assets/motion/quaternius.js`. No source meshes, materials or textures are distributed. Runtime adapts the authored rotations to the existing skeleton, preserves edited target bone lengths, scales vertical hip displacement, removes horizontal root drift for a stationary preview, blends initial clip entry, and applies sampled sole height correction. Finger channels are omitted. Source file checksums and exact track names are in `dist/assets/motion/provenance.json`; reproducible extraction is in `scripts/prepare-animations.py`. The existing procedural idle / inspect / rest actions retain their separate project-authored provenance.

## v25 Original authored trouser skin weights

`dist/assets/anime/pants-skin.js` contains only the original skin weights of the same CC0 beta Sakurada Fumiriya trousers already used by the app. Source: https://github.com/madjin/vrm-samples/blob/master/vroid/beta/Sakurada_Fumiriya.vrm . The extraction checks embedded `licenseName: CC0` and exact compact UV/index correspondence, records the source SHA-256, and retains 1,099 trouser vertices / 10 named bones. `scripts/prepare-pants-skin.py` reproduces the extraction. Runtime maps bone names to either target gender's skeleton and keeps the edited target bone lengths. Fitted trouser normals are area-weighted across coincident seam vertices; the original topology and UVs remain intact. No additional source model is distributed.

Posed trouser normals are recomputed from the actual skinned triangles each frame, averaged across original coincident seam vertices, and inverse-transformed through each vertex's blended skin matrix before upload, so the GPU normal transform follows the deformed cloth surface. No per-frame position topology changes are introduced.

### v26 finger tracks

The same CC0 Quaternius Standard source now supplies all 30 finger-joint tracks, alongside the existing wrist/body/two aggregate toe tracks. Interact and PickUp_Table are additional authored one-shot clips. Digit reference frames use the source T-pose and target bone directions/palm normals; no replacement model or invented finger animation curves are shipped. Original source hashes and the 52 mapped humanoid bone names are recorded in motion/provenance.json.

### v27 trouser knee adaptation

Sakurada Fumiriya CC0 trouser topology remains the source. Conforming midpoint subdivision is limited to the knee region and preserves its original flat rest surface and UV interpolation. Thigh/shin influences inside a joint-scaled knee band are adapted to a continuous circumferential blend; original author weights outside this band are retained. The runtime continues to recalculate posed garment normals. No additional donor model is included.
