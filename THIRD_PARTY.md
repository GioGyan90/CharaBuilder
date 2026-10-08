# Human assets and anatomical references

## MakeHuman hm08 (CC0 1.0)

- Upstream: https://github.com/makehumancommunity/makehuman
- Revision inspected: `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`
- Base: `makehuman/data/3dobjs/base.obj`
- Sculpt data: `makehuman/data/targets/{macrodetails,head,chin,eyes,nose,mouth}`
- Full asset license: `dist/assets/LICENSE-MAKEHUMAN.txt`
- Official reuse guidance: https://static.makehumancommunity.org/mpfb/faq/build_other_chargen.html

Included derivatives contain body, garment helpers, eye helpers, and joint landmarks from hm08. Helper skeleton cubes, teeth, tongue and genital helper surfaces are not rendered. Six adult body states combine equal Asian/Caucasian adult phenotype targets with gender-specific average-muscle weight targets. Twenty sculpted facial targets drive the face controls. Coordinates are quantized to 0.001 upstream units, triangulated, and packaged as gzip JSON. No MakeHuman application source code is copied.

`dist/human.js` implements a browser renderer for these assets. Shoulder and leg adjustments are restrained continuous deformations; height is uniform scaling. They are not a full port of MakeHuman's modifier system. The neutral A-pose is preserved. Clothing uses the fitted helper surfaces with clipped hems; these are simple prototype garments. Hair caps and eyebrows are generated locally and remain simplified.

Rebuild: download base.obj and the selected .target files from the above revision, then run `python scripts/prepare-human.py <base.obj> <target-folder>` (requires Python and NumPy). The target folder should contain the six universal gender/weight targets, four Asian/Caucasian adult targets, and the twenty facial targets corresponding to the controls in human.js.

## Structure references

- Proko, Mannequinization: https://www.proko.com/course-lesson/mannequinization-structure-of-the-human-body/
- Proko, Robo Bean: https://www.proko.com/course-lesson/how-to-draw-structure-in-the-body-robo-bean

Used as anatomical construction references, not copied artwork or mesh assets.

## Three.js

Three.js r186 and OrbitControls: MIT. See `dist/vendor/THREE-LICENSE.txt`.
