"""Narrow the frontal body, enlarge the head and define the mandibular side planes."""
from pathlib import Path
import numpy as np,trimesh,json,gzip,base64,sys
root=Path(__file__).resolve().parents[1];out=root/'dist/assets/anime'
manifest=json.loads((out/'stone-ref-manifest.json').read_text());checkpoint=root/'scripts/stone-jaw-v47.json.gz'
if not checkpoint.exists():checkpoint.write_bytes(base64.b64decode(''.join((out/p).read_text() for p in manifest['parts'])))
data=json.loads(gzip.decompress(checkpoint.read_bytes()));roundNumber=int(sys.argv[1]) if len(sys.argv)>1 else 2
bodyWidth=.96 if roundNumber==1 else .955;headScale=1.035 if roundNumber==1 else 1.04;jawSide=.006 if roundNumber==1 else .0065
pivot=np.array(data['landmarks']['head']);smooth=lambda t:np.clip(t,0,1)**2*(3-2*np.clip(t,0,1))
def transform(p):
 p=np.asarray(p,dtype=float);x=np.abs(p[...,0]);y=p[...,1];z=p[...,2]
 blend=smooth((y-1.365)/.11)*(1-smooth((x-.12)/.08))
 body=p.copy();body[...,0]*=bodyWidth;head=(p-pivot)*headScale+pivot;q=body+(head-body)*blend[...,None]
 # Masseter/mandibular side planes, behind the mouth and below the cheekbone.
 jaw=np.exp(-((y-(1.456 if roundNumber==1 else 1.445))/(.028 if roundNumber==1 else .020))**4)*smooth((x-.028)/.027)*(1-smooth((x-.09)/.025))*smooth((z+.055)/.025)*(1-smooth((z-(.072 if roundNumber==1 else .035))/(.035 if roundNumber==1 else .025)))
 q[...,0]+=np.sign(p[...,0])*jawSide*jaw
 q[...,1]-=.003*jaw
 # Undercut is on the neck below the jaw, preserving the chin and lip silhouette.
 neck=smooth((y-1.34)/.045)*(1-smooth((y-1.416)/.034))*(1-smooth((x-.095)/.035))*(1-smooth((z-.018)/.025))
 q[...,0]*=1-(.07 if roundNumber==1 else .09)*neck
 under=smooth((y-1.37)/.030)*(1-smooth((y-1.408)/.027))*(1-smooth((x-.04)/.04))*smooth((z+.01)/.02)
 q[...,2]-=.006*under
 return q
lowerBody=np.array(data['meshes'][0]['positions']).reshape(-1,3)/1e5;lowerBody=lowerBody[lowerBody[:,1]<=1.25];originalBounds=[lowerBody.min(0).tolist(),lowerBody.max(0).tolist()]
v=[];f=[]
for m in data['meshes'][:2]:
 p=np.rint(transform(np.array(m['positions']).reshape(-1,3)/1e5)*1e5)/1e5;m['positions']=np.rint(p*1e5).astype(int).ravel().tolist();f.extend(np.array(m['groups'][0]['indices']).reshape(-1,3)+len(v));v.extend(p)
merged=trimesh.Trimesh(v,f,process=True);assert merged.is_watertight and merged.is_winding_consistent and merged.volume>0
norm={tuple(np.rint(p*1e5).astype(int)):n for p,n in zip(merged.vertices,merged.vertex_normals)}
for m in data['meshes'][:2]:m['normals']=np.rint(np.array([norm[tuple(q)] for q in np.array(m['positions']).reshape(-1,3)])*32767).astype(int).ravel().tolist()
for m in data['meshes'][2:]:m['positions']=np.rint(transform(np.array(m['positions']).reshape(-1,3)/1e5)*1e5).astype(int).ravel().tolist()
for b in data['rig']['bones']:b['position']=transform(b['position']).tolist()
l=data['landmarks'];g=l['faceGuide'];oldChin=g['chin'];oldTop=g['top'];oldZ=g['mouth'][2]
for k in ['hips','neck','head','leftEye','rightEye']:l[k]=transform(l[k]).tolist()
l['bodyRig']={k:transform(p).tolist() for k,p in l['bodyRig'].items()}
for k in ['mouth','nose']:g[k]=transform(g[k]).tolist()
g['brows']=[transform(p).tolist() for p in g['brows']];g['chin']=float(transform([0,oldChin,oldZ])[1]);g['top']=float(transform([0,oldTop,pivot[2]])[1])
data['reference']['jawProportionFit']={'round':roundNumber,'bodyWidthScale':bodyWidth,'headScale':headScale,'jawSideExpansion':jawSide,'neckInset':.006,'lowerBodyBoundsBefore':originalBounds}
data['reference']['surfaceRepair']['positiveVolume']=float(merged.volume)
packed=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0);txt=base64.b64encode(packed).decode();parts=[]
for i,start in enumerate(range(0,len(txt),170000)):
 name=f'stone-ref-part-{i}.b64';(out/name).write_text(txt[start:start+170000]);parts.append(name)
(out/'stone-ref-manifest.json').write_text(json.dumps({'parts':parts,'bytes':len(packed),'reference':data['reference']},separators=(',',':')))
print(data['reference']['jawProportionFit'])
