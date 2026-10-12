"""Fit the neck silhouette and lower the head using the user's marked v45 views."""
from pathlib import Path
import numpy as np,trimesh,json,gzip,base64,sys,hashlib
root=Path(__file__).resolve().parents[1];out=root/'dist/assets/anime'
manifest=json.loads((out/'stone-ref-manifest.json').read_text());checkpoint=root/'scripts/stone-lower-v45.json.gz'
if not checkpoint.exists():checkpoint.write_bytes(base64.b64decode(''.join((out/p).read_text() for p in manifest['parts'])))
data=json.loads(gzip.decompress(checkpoint.read_bytes()));roundNumber=int(sys.argv[1]) if len(sys.argv)>1 else 2
lower=.035 if roundNumber==1 else .040
narrow=.16 if roundNumber==1 else .20
smooth=lambda t:np.clip(t,0,1)**2*(3-2*np.clip(t,0,1))
def transform(p):
 p=np.asarray(p,dtype=float);q=p.copy();x=np.abs(p[...,0]);y=p[...,1]
 # Rigid upper head, compressing only the shoulder-to-neck transition below.
 blend=smooth((y-1.31)/.19)*(1-smooth((x-.115)/.095))
 q[...,1]-=lower*blend
 column=smooth((y-1.335)/.080)*(1-smooth((y-1.445)/.060))*(1-smooth((x-.085)/.080))
 q[...,0]*=1-narrow*column
 if roundNumber==2:
  base=smooth((y-1.28)/.065)*(1-smooth((y-1.405)/.08))*smooth((x-.045)/.04)*(1-smooth((x-.16)/.06))
  q[...,1]+=.016*base
 return q
protected=[]
for m in data['meshes'][:2]:
 for i in range(0,len(m['positions']),3):
  p=m['positions'][i:i+3]
  if p[1]<=125000 or abs(p[0])>=23000:protected.extend(p)
protectedHash=hashlib.sha256(json.dumps(protected,separators=(',',':')).encode()).hexdigest()
v=[];f=[]
for m in data['meshes'][:2]:
 p=np.rint(transform(np.array(m['positions']).reshape(-1,3)/1e5)*1e5)/1e5;m['positions']=np.rint(p*1e5).astype(int).ravel().tolist()
 f.extend(np.array(m['groups'][0]['indices']).reshape(-1,3)+len(v));v.extend(p)
merged=trimesh.Trimesh(v,f,process=True);assert merged.is_watertight and merged.is_winding_consistent and merged.volume>0
norm={tuple(np.rint(p*1e5).astype(int)):n for p,n in zip(merged.vertices,merged.vertex_normals)}
for m in data['meshes'][:2]:m['normals']=np.rint(np.array([norm[tuple(q)] for q in np.array(m['positions']).reshape(-1,3)])*32767).astype(int).ravel().tolist()
for m in data['meshes'][2:]:m['positions']=np.rint(transform(np.array(m['positions']).reshape(-1,3)/1e5)*1e5).astype(int).ravel().tolist()
for b in data['rig']['bones']:b['position']=transform(b['position']).tolist()
l=data['landmarks'];g=l['faceGuide'];oldChin=g['chin'];oldTop=g['top'];oldZ=g['mouth'][2]
for k in ['hips','neck','head','leftEye','rightEye']:l[k]=transform(l[k]).tolist()
l['bodyRig']={k:transform(p).tolist() for k,p in l['bodyRig'].items()}
for k in ['mouth','nose']:g[k]=transform(g[k]).tolist()
g['brows']=[transform(p).tolist() for p in g['brows']];g['chin']=float(transform([0,oldChin,oldZ])[1]);g['top']=float(transform([0,oldTop,l['head'][2]])[1])
data['reference']['headLoweringFit']={'round':roundNumber,'headLowering':lower,'neckColumnReduction':narrow,'trapBaseLift':.016 if roundNumber==2 else 0,'protectedBodySha256':protectedHash}
data['reference']['surfaceRepair']['positiveVolume']=float(merged.volume)
packed=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0);txt=base64.b64encode(packed).decode();parts=[]
for i,start in enumerate(range(0,len(txt),170000)):
 name=f'stone-ref-part-{i}.b64';(out/name).write_text(txt[start:start+170000]);parts.append(name)
(out/'stone-ref-manifest.json').write_text(json.dumps({'parts':parts,'bytes':len(packed),'reference':data['reference']},separators=(',',':')))
print(data['reference']['headLoweringFit'])
