"""Cut registered eye/mouth patches from the drawn alternate frame.

Run: uv run --with pillow --with numpy --with opencv-python-headless scripts/build-dialogue-sprites.py
Only facial patches are imported; the original body, cue and hair remain authoritative.
"""
from pathlib import Path
import hashlib
import json
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / 'dist/assets/dialogue/lucky-npc'
rig = json.loads((PROJECT / 'rig.json').read_text())
source = Image.open(PROJECT / 'source.png').convert('RGBA')
drawn = Image.open(PROJECT / 'drawn-closed-speaking.png').convert('RGBA').resize(source.size, Image.Resampling.LANCZOS)
src, alt = np.array(source), np.array(drawn)
out = PROJECT / 'built/sprites'
out.mkdir(exist_ok=True)
layers = {}

def cut(name, mask):
    weight = np.clip(cv2.distanceTransform(mask, cv2.DIST_L2, 5) / 4, 0, 1)
    ys, xs = np.where(weight > 0)
    x, y, right, bottom = int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)
    crop = alt[y:bottom, x:right].copy()
    # Correct slight skin-tone differences at the patch edge, preserving original alpha.
    edge = (weight > 0) & (weight < 1) & (src[..., 3] > 250)
    tint = np.median(alt[edge, :3].astype(float) - src[edge, :3], axis=0)
    crop[..., :3] = np.clip(crop[..., :3].astype(float) - tint, 0, 255)
    crop[..., 3] = src[y:bottom, x:right, 3] * weight[y:bottom, x:right]
    Image.fromarray(crop).save(out / f'{name}.png')
    layers[name] = [x, y, right-x, bottom-y]

for i, eye in enumerate(rig['eyes']):
    mask = np.zeros(src.shape[:2], np.uint8)
    cv2.fillPoly(mask, [np.array(eye['roi'], np.int32)], 1)
    cut(f'eyes_closed_{i}', mask)
mouth = rig['mouth']['area']
mask = np.zeros(src.shape[:2], np.uint8)
cv2.ellipse(mask, (int(mouth['cx']),int(mouth['cy'])), (int(mouth['rx']),int(mouth['ry'])), np.degrees(mouth['angle']), 0, 360, 1, -1)
for name in ['mouth_a', 'mouth_a_half']:
    cut(name, mask)
build = hashlib.sha256(b''.join((out / f'{name}.png').read_bytes() for name in layers)).hexdigest()[:12]
(out/'sprites.json').write_text(json.dumps(dict(version=1, build=build, layers=layers), indent=2)+'\n')
print(f'Built {len(layers)} facial patches: {build}')
