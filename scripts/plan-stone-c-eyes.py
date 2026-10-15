import base64, gzip, hashlib, json
from pathlib import Path
import numpy as np
from scipy.interpolate import CubicSpline
root = Path(__file__).resolve().parents[1]
a = json.loads(gzip.decompress(base64.b64decode((root/'dist/assets/anime/stone-c-v101.b64').read_text())))
m = next(mesh for mesh in a['meshes'] if mesh['name'] == 'Face')
v = np.array(m['positions']).reshape(-1, 3) / 1e5
f = np.array(m['groups'][0]['indices']).reshape(-1, 3)
from scipy.interpolate import CubicSpline
import hashlib
outline=np.array([[.0178,1.5298],[.023,1.5331],[.031,1.5362],[.040,1.5371],[.047,1.5368],[.0514,1.5351],[.045,1.5321],[.036,1.5297],[.027,1.5294]])
tri=v[f];A=tri[:,0];B=tri[:,1];C=tri[:,2];den=(B[:,0]-A[:,0])*(C[:,1]-A[:,1])-(B[:,1]-A[:,1])*(C[:,0]-A[:,0]);safe=np.abs(den)>1e-14
results=[]
for side in [-1,1]:
 line=outline*np.array([side,1]);line=np.vstack([line,line[0]]);t=np.arange(len(line));curve=CubicSpline(t,line,bc_type='periodic')(np.linspace(0,len(line)-1,96,endpoint=False));samples=[]
 for x,y in curve:
  w1=np.divide((x-A[:,0])*(C[:,1]-A[:,1])-(y-A[:,1])*(C[:,0]-A[:,0]),den,out=np.zeros(len(den)),where=safe);w2=np.divide((B[:,0]-A[:,0])*(y-A[:,1])-(B[:,1]-A[:,1])*(x-A[:,0]),den,out=np.zeros(len(den)),where=safe);w0=1-w1-w2
  ids=np.where(safe&(w0>=-1e-8)&(w1>=-1e-8)&(w2>=-1e-8))[0];z=w0*A[:,2]+w1*B[:,2]+w2*C[:,2];i=int(ids[np.argmax(z[ids])]);weights=[float(w0[i]),float(w1[i]),float(w2[i])];point=np.array(weights)@tri[i];assert np.linalg.norm(point[:2]-[x,y])<1e-9
  samples.append({'position':point.tolist(),'triangle':i,'sourceVertexIds':f[i].tolist(),'barycentric':weights})
 pts=np.array([s['position'] for s in samples]);print(side,'samples',len(samples),'triangles',len(set(s['triangle'] for s in samples)),'max step',np.max(np.linalg.norm(pts-np.roll(pts,1,axis=0),axis=1)))
 results.append({'side':side,'closed':True,'samples':samples,'innerCanthus':0,'outerCanthus':round(96*5/9)})
report={'stage':'surface-guided-proposal-not-cut','source':'stone-c-v101.b64','sourceSHA256':hashlib.sha256((root/'dist/assets/anime/stone-c-v101.b64').read_bytes()).hexdigest(),'coordinates':'original C asset rest space, meters, before editor deformation','purpose':'Separate the existing painted ocular surface at the palpebral rim; retain eyebrow and outer orbital skin. This is a surface guide requiring local retriangulation, not an existing edge loop.','eyes':results}
(root/'docs/stone-c-eye-cut-guide.json').write_text(json.dumps(report,indent=2))
