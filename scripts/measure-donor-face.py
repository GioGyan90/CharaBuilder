"""Reproducible surface samples around previously inspected donor landmarks.
Indices refer to trimesh concatenated scene vertices with process=False.
Seeds are prior manual landmarks, not automatic anatomical recognition.
"""
from pathlib import Path
import json,hashlib
import numpy as np
import trimesh
from scipy.spatial import cKDTree
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('G:/AI Painting/ComfyUI-aki/ComfyUI-aki-v2/ComfyUI/output/mesh/ComfyUI_00003_.glb')
m=trimesh.load(SOURCE,force='mesh',process=False);tree=cKDTree(m.vertices)
seeds={'eyeLeft':[-.154,-.055,.476],'eyeRight':[.154,-.055,.476],'browLeft':[-.165,-.010,.526],'browRight':[.165,-.010,.526],'nose':[0,-.245,.657],'mouth':[0,-.386,.536],'chin':[0,-.55,.34],'zygomaLeft':[-.275,-.21,.31],'zygomaRight':[.275,-.21,.31],'jawLeft':[-.275,-.46,.12],'jawRight':[.275,-.46,.12]}
points={}
for name,seed in seeds.items():
 d,i=tree.query(seed);q=m.vertices[i]
 points[name]={'seed':seed,'vertexIndex':int(i),'position':q.tolist(),'seedDistance':float(d),'runtimePosition':(q*.19+[-.001,1.61,-.015]).tolist()}
eyeSpan=abs(points['eyeRight']['position'][0]-points['eyeLeft']['position'][0]);eyeY=np.mean([points[k]['position'][1] for k in ['eyeLeft','eyeRight']]);mouthY=points['mouth']['position'][1]
out={'source':SOURCE.name,'sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'vertices':len(m.vertices),'triangles':len(m.faces),'method':'Nearest original surface vertex to prior manually inspected seeds; no automatic semantic guarantee','transform':{'scale':.19,'translation':[-.001,1.61,-.015]},'points':points,'measurements':{'eyeCenterSpan':eyeSpan,'eyeToMouth':float(eyeY-mouthY),'eyeSpanPerEyeMouth':float(eyeSpan/(eyeY-mouthY))}}
path=ROOT/'dist/assets/anime/donor-face-measurements.json';path.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(out['measurements'],indent=2));print({k:round(v['seedDistance'],5) for k,v in points.items()})
