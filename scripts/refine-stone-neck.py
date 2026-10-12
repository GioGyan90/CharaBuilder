"""Lower the neck/trapezius shoulder ramp on the reviewed v44 foundation."""
from pathlib import Path
import numpy as np,trimesh,json,gzip,base64,sys,hashlib
root=Path(__file__).resolve().parents[1];out=root/'dist/assets/anime'
manifest=json.loads((out/'stone-ref-manifest.json').read_text())
checkpoint=root/'scripts/stone-neck-v44.json.gz'
if not checkpoint.exists():
 checkpoint.write_bytes(base64.b64decode(''.join((out/p).read_text() for p in manifest['parts'])))
data=json.loads(gzip.decompress(checkpoint.read_bytes()))
roundNumber=int(sys.argv[1]) if len(sys.argv)>1 else 2
drop=.038 if roundNumber==1 else .045
smooth=lambda t:np.clip(t,0,1)**2*(3-2*np.clip(t,0,1))
def transform(p):
 p=np.asarray(p,dtype=float);q=p.copy();x=np.abs(p[...,0]);y=p[...,1]
 vertical=smooth((y-1.285)/.085)*(1-smooth((y-(1.445 if roundNumber==1 else 1.460))/(.060 if roundNumber==1 else .045)))
 shoulder=smooth((x-.040)/.045)*(1-smooth((x-.145)/.075))
 q[...,1]-=drop*vertical*shoulder
 # A gently concave shoulder ramp, while retaining the central neck column.
 neck=vertical*(1-smooth((x-.090)/.050))
 q[...,0]*=1-(.06 if roundNumber==1 else .20)*neck
 return q
protected=[]
for m in data['meshes'][:2]:
 for i in range(0,len(m['positions']),3):
  p=m['positions'][i:i+3]
  if p[1]>=150500 or p[1]<=125000 or abs(p[0])>=23000:protected.extend(p)
protectedHash=hashlib.sha256(json.dumps(protected,separators=(',',':')).encode()).hexdigest()
v=[];f=[]
for m in data['meshes'][:2]:
 p=np.rint(transform(np.array(m['positions']).reshape(-1,3)/1e5)*1e5)/1e5
 m['positions']=np.rint(p*1e5).astype(int).ravel().tolist()
 f.extend(np.array(m['groups'][0]['indices']).reshape(-1,3)+len(v));v.extend(p)
merged=trimesh.Trimesh(v,f,process=True)
assert merged.is_watertight and merged.is_winding_consistent and merged.volume>0
norm={tuple(np.rint(p*1e5).astype(int)):n for p,n in zip(merged.vertices,merged.vertex_normals)}
for m in data['meshes'][:2]:m['normals']=np.rint(np.array([norm[tuple(q)] for q in np.array(m['positions']).reshape(-1,3)])*32767).astype(int).ravel().tolist()
for b in data['rig']['bones']:b['position']=transform(b['position']).tolist()
l=data['landmarks']
for k in ['hips','neck','head','leftEye','rightEye']:l[k]=transform(l[k]).tolist()
l['bodyRig']={k:transform(p).tolist() for k,p in l['bodyRig'].items()}
data['reference']['neckShoulderFit']={'round':roundNumber,'maxShoulderDrop':drop,'neckWidthReduction':.06 if roundNumber==1 else .20,'unchangedAboveY':1.505,'protectedGeometrySha256':protectedHash}
data['reference']['surfaceRepair']['positiveVolume']=float(merged.volume)
packed=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0);txt=base64.b64encode(packed).decode();parts=[]
for i,start in enumerate(range(0,len(txt),170000)):
 name=f'stone-ref-part-{i}.b64';(out/name).write_text(txt[start:start+170000]);parts.append(name)
(out/'stone-ref-manifest.json').write_text(json.dumps({'parts':parts,'bytes':len(packed),'reference':data['reference']},separators=(',',':')))
print(data['reference']['neckShoulderFit'])
