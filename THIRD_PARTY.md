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
