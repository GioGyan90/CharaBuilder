"""Extract dimensionless jaw guides from the licensed heads, not neck geometry."""
import json,gzip,base64,hashlib
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]/'dist/assets/anime'
def read(name):
 m=json.loads((root/(name+'-manifest.json')).read_text());raw=gzip.decompress(base64.b64decode(''.join((root/p).read_text() for p in m['parts'])));return json.loads(raw),m,hashlib.sha256(raw).hexdigest()
guides={}
for gender in ['female','male']:
 d,m,sha=read(gender+'head');b,_,_=read(gender);p=np.array(d['meshes'][0]['positions']).reshape(-1,3)/1e5;r=b['meshes'][0];q=np.array(r['positions']).reshape(-1,3)/1e5
 ids=[i for g in r['groups'] if '_SKIN' in b['materials'][g['material']]['name'] for i in g['indices']];q=q[ids];eye=d['landmarks']['leftEye'][1];be=b['landmarks']['leftEye'][1];front=p[:,2].max();ch=p[(abs(p[:,0])<p[:,0].max()*.18)&(p[:,2]>front-np.ptp(p[:,2])*.28)&(p[:,1]<eye),1].min();bc=q[:,1].min()
 widths=[]
 for t in [.18,.35,.55,.75,.95]:
  a=p[(abs((p[:,1]-ch)/(eye-ch)-t)<.10)&(p[:,2]>front-np.ptp(p[:,2])*.42)];v=q[abs((q[:,1]-bc)/(be-bc)-t)<.10]
  aw=float(np.quantile(abs(a[:,0]),.9)/p[:,0].max());bw=float(np.quantile(abs(v[:,0]),.9)/abs(q[:,0]).max());widths.append(round(aw/max(bw,.05),4))
 guides[gender]=dict(source=m['source'],author=m['author'],license=m['license'],sourceDataSha256=sha,jawRatios=widths)
out=Path(__file__).resolve().parents[1]/'dist/face-guides.js';out.write_text('// Generated from the authored facial region; source necks are excluded.\nexport const faceGuides = '+json.dumps(guides,ensure_ascii=False,indent=2)+';\n');print(json.dumps(guides,indent=2))
