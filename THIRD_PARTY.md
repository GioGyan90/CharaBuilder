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

## v14 短发照片参考

`references/hair/buzz.jpg`：Mark S. Kettenhofen / U.S. Navy，1998，[来源与 PD-USGov-Navy 许可](https://commons.wikimedia.org/wiki/File:Male_buzzcut.jpg)。

`references/hair/crew.jpg`：U.S. Marine Corps / cropped by MiltonPB，[来源与 PD-USGov-Military 许可](https://commons.wikimedia.org/wiki/File:Crew_Cut,_Semi_Short_Taper.jpg)。

`references/hair/flat1.jpg` 与 `flat2.jpg`：SoHome Jacaranda Lilau，2014，作者释放至 public domain，[后面](https://commons.wikimedia.org/wiki/File:PRC_flattop-1.jpg)、[侧面](https://commons.wikimedia.org/wiki/File:PRC_flattop-2.jpg)。四张均缩小为研究参考副本，不用于角色贴图。

短碎渐变观察 @tombaxter_hair 的 Fresh and Short French Crop，出处 https://haircutinspiration.com/french-crop-haircut/ 。未复制或分发此照片，仅参考剪裁与发流。详细重建说明见 HAIR_REFERENCES.md。
