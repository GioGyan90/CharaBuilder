"""Fit Stone's head/body/neck proportions to the supplied turnaround."""
from pathlib import Path
import numpy as np,trimesh,json,gzip,base64,sys
root=Path(__file__).resolve().parents[1];out=root/'dist/assets/anime';manifest=json.loads((out/'stone-ref-manifest.json').read_text());data=json.loads(gzip.decompress(base64.b64decode(''.join((out/p).read_text() for p in manifest['parts']))));checkpoint=root/'scripts/stone-turnaround-v43.json.gz'
if not checkpoint.exists():checkpoint.write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0))
data=json.loads(gzip.decompress(checkpoint.read_bytes()));pivot=np.array(data['landmarks']['head']);roundNumber=int(sys.argv[1]) if len(sys.argv)>1 else 2
bodyScale=np.array([.96,.97,.96] if roundNumber==1 else [.95,.975,.93]);headScale=1.065 if roundNumber==1 else 1.075;neckLift=.040 if roundNumber==1 else .048
smooth=lambda t:np.clip(t,0,1)**2*(3-2*np.clip(t,0,1))
def transform(p):
 p=np.asarray(p,dtype=float);t=smooth((p[...,1]-1.345)/.18)*(1-smooth((abs(p[...,0])-.12)/.09));target=(p-pivot)*headScale+pivot*bodyScale+[0,neckLift,0];body=p*bodyScale;q=body+(target-body)*t[...,None]
 if roundNumber==2:
  neck=smooth((p[...,1]-1.33)/.065)*(1-smooth((p[...,1]-1.445)/.08))*(1-smooth((abs(p[...,0])-.10)/.08))
  q[...,0]*=1-.12*neck
  q[...,2]+=.020*neck*(1-smooth((p[...,2]+.08)/.08))
 return q
meshes=data['meshes'][:2];v=[];f=[]
for m in meshes:
 p=np.rint(transform(np.array(m['positions']).reshape(-1,3)/1e5)*1e5)/1e5;m['positions']=np.rint(p*1e5).astype(int).ravel().tolist();f.extend(np.array(m['groups'][0]['indices']).reshape(-1,3)+len(v));v.extend(p)
merged=trimesh.Trimesh(v,f,process=True);assert merged.is_watertight and merged.is_winding_consistent and merged.volume>0;norm={tuple(np.rint(p*1e5).astype(int)):n for p,n in zip(merged.vertices,merged.vertex_normals)}
for m in meshes:m['normals']=np.rint(np.array([norm[tuple(q)] for q in np.array(m['positions']).reshape(-1,3)])*32767).astype(int).ravel().tolist()
for m in data['meshes'][2:]:m['positions']=np.rint(transform(np.array(m['positions']).reshape(-1,3)/1e5)*1e5).astype(int).ravel().tolist()
for b in data['rig']['bones']:b['position']=transform(b['position']).tolist()
l=data['landmarks'];oldChin=l['faceGuide']['chin'];oldMouthZ=l['faceGuide']['mouth'][2];oldTop=l['faceGuide']['top']
for k in ['hips','neck','head','leftEye','rightEye']:l[k]=transform(l[k]).tolist()
l['bodyRig']={k:transform(v).tolist() for k,v in l['bodyRig'].items()}
g=l['faceGuide']
for k in ['mouth','nose']:g[k]=transform(g[k]).tolist()
g['brows']=[transform(p).tolist() for p in g['brows']];g['chin']=float(transform([0,oldChin,oldMouthZ])[1]);g['top']=float(transform([0,oldTop,pivot[2]])[1])
data['reference']['turnaroundFit']={'bodyScale':bodyScale.tolist(),'headScale':headScale,'neckLift':neckLift,'round':roundNumber,'neckWidthReduction':.12 if roundNumber==2 else 0,'neckBackInset':.020 if roundNumber==2 else 0};data['reference']['surfaceRepair']['positiveVolume']=float(merged.volume)
packed=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0);txt=base64.b64encode(packed).decode();parts=[]
for i,start in enumerate(range(0,len(txt),170000)):
 name=f'stone-ref-part-{i}.b64';(out/name).write_text(txt[start:start+170000]);parts.append(name)
(out/'stone-ref-manifest.json').write_text(json.dumps({'parts':parts,'bytes':len(packed),'reference':data['reference']},separators=(',',':')));print(data['reference']['turnaroundFit'])
