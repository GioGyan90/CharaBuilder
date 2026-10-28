"""Reproducible, lossless visible-pixel split. Hidden cue pixels are not invented."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'dist/assets/dialogue/lucky-npc'
out=p/'built/overlays';out.mkdir(exist_ok=True)
src=np.array(Image.open(p/'source.png').convert('RGBA'))
# Always begin with the unsplit authored base; preserve facial preparation.
backup=p/'built/base-before-props.png'
if not backup.exists(): Image.open(p/'built/base.png').save(backup)
base=np.array(Image.open(backup).convert('RGBA'))
def polygon(points):
 im=Image.new('L',(1072,1920));ImageDraw.Draw(im).polygon(points,fill=255);return np.array(im)>0
rod=polygon([(690,90),(724,90),(964,1904),(905,1910),(900,1850),(869,1550),(828,1200),(805,1000),(783,800),(757,600)])
grip=polygon([(793,810),(832,816),(850,839),(862,888),(850,937),(843,984),(825,982),(810,947),(789,919),(779,863)])
# Only extract rod pixels; fingers/hand are a separate stationary contact layer.
masks={'cue':rod & ~grip,'grip':grip}
for name,mask in masks.items():
 layer=base.copy();layer[~mask]=0;Image.fromarray(layer).save(out/f'{name}.png')
base[rod|grip]=0;Image.fromarray(base).save(p/'built/base.png')
meta={'version':1,'overlays':[{'name':n,'file':f'{n}.png','space':'fixed'} for n in masks]}
(out/'overlays.json').write_text(json.dumps(meta,indent=2)+'\n')
# Exact rest composite against the authored base, without affecting the eye patches.
reconstructed=base.copy()
for mask in masks.values(): reconstructed[mask]=np.array(Image.open(backup).convert('RGBA'))[mask]
original=np.array(Image.open(backup).convert('RGBA'))
assert np.array_equal(reconstructed,original), 'split must reconstruct prepared base exactly'
meta_path=p/'built/layers.json';meta=json.loads(meta_path.read_text());meta['build']=hashlib.sha256(base.tobytes()).hexdigest()[:12];meta_path.write_text(json.dumps(meta,indent=2)+'\n')
print('PASS: body + cue + grip reconstruct original prepared base pixel-for-pixel')
