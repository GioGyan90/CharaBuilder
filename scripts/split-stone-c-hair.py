"""Split the original C atlas hair into a reproducible triangle ownership list.
Requires numpy and Pillow. No geometry or source texture is rewritten.
The largest connected dark region is hair; eyes/brows remain in the face.
"""
import base64, gzip, json
from pathlib import Path
from collections import defaultdict
import numpy as np
from PIL import Image
root = Path(__file__).resolve().parents[1]
p=json.loads(gzip.decompress(base64.b64decode((root/'dist/assets/anime/stone-c-v101.b64').read_text())));m=p['meshes'][2];v=np.array(m['positions']).reshape(-1,3)/1e5;uv=np.array(m['uv']).reshape(-1,2)/65535;f=np.array(m['groups'][0]['indices']).reshape(-1,3);im=np.array(Image.open(root/'dist/assets/anime/stone-c-v101.png').convert('RGB'));tuv=uv[f]
bary=np.array([[1/3]*3,[.6,.2,.2],[.2,.6,.2],[.2,.2,.6]])
samples=np.einsum('sv,tvc->tsc',bary,tuv)
x=np.clip(np.rint(samples[:,:,0]*(im.shape[1]-1)).astype(int),0,im.shape[1]-1);y=np.clip(np.rint(samples[:,:,1]*(im.shape[0]-1)).astype(int),0,im.shape[0]-1);colors=im[y,x].mean(1);centers=v[f].mean(1)
candidate=(colors.max(1)<135)
links=defaultdict(list)
for i in np.where(candidate)[0]:
 for j in f[i]:links[tuple(np.round(v[j],6))].append(int(i))
seen=set();comps=[]
for start in np.where(candidate)[0]:
 if int(start) in seen:continue
 q=[int(start)];seen.add(int(start));comp=[]
 while q:
  i=q.pop();comp.append(i)
  for j in f[i]:
   for k in links[tuple(np.round(v[j],6))]:
    if k not in seen:seen.add(k);q.append(k)
 comps.append(comp)
comps.sort(key=len,reverse=True)
print([(len(c),centers[c].min(0).tolist(),centers[c].max(0).tolist()) for c in comps[:12]])
hair=np.zeros(len(f),bool);hair[comps[0]]=True
json.dump({'version':102,'source':'stone-c-v101.b64','headTriangles':len(f),'hairTriangles':np.where(hair)[0].tolist()},open(root/'dist/assets/anime/stone-c-hair.json','w'),separators=(',',':'))
