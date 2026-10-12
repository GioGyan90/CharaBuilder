"""Reposition the complete Stone head with a continuous neck transition."""
from pathlib import Path
import json,gzip,base64,numpy as np,trimesh
root=Path(__file__).resolve().parents[1];out=root/'dist/assets/anime';manifest=json.loads((out/'stone-ref-manifest.json').read_text());data=json.loads(gzip.decompress(base64.b64decode(''.join((out/p).read_text() for p in manifest['parts']))))
checkpoint=root/'scripts/stone-position-v41.json.gz'
if not checkpoint.exists():checkpoint.write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0))
data=json.loads(gzip.decompress(checkpoint.read_bytes()));pivot=np.array(data['landmarks']['head']);angle=np.deg2rad(-1.5);c,s=np.cos(angle),np.sin(angle);rotation=np.array([[1,0,0],[0,c,-s],[0,s,c]]);offset=np.array([0,.006,-.018])
def transform(p):
 p=np.asarray(p,dtype=float);t=np.clip((p[...,1]-1.355)/.165,0,1);t=t*t*(3-2*t);r=np.clip((.20-abs(p[...,0]))/.08,0,1);r=r*r*(3-2*r);t*=np.where(p[...,1]>1.52,1,r);target=(p-pivot)@rotation.T+pivot+offset;return p+(target-p)*t[...,None]
# Transform both partitions before recomputing shared normals, preserving every triangle.
meshes=data['meshes'][:2];p=[];f=[]
for m in meshes:
 v=transform(np.array(m['positions']).reshape(-1,3)/1e5);v=np.rint(v*1e5)/1e5;m['positions']=np.rint(v*1e5).astype(int).ravel().tolist();f.extend(np.array(m['groups'][0]['indices']).reshape(-1,3)+len(p));p.extend(v)
merged=trimesh.Trimesh(p,f,process=True);assert merged.is_watertight and merged.is_winding_consistent;lookup={tuple(np.rint(v*1e5).astype(int)):n for v,n in zip(merged.vertices,merged.vertex_normals)}
for m in meshes:m['normals']=np.rint(np.array([lookup[tuple(q)] for q in np.array(m['positions']).reshape(-1,3)])*32767).astype(int).ravel().tolist()
# Keep dormant reference hair aligned for subsequent iterations.
for m in data['meshes'][2:]:
 v=transform(np.array(m['positions']).reshape(-1,3)/1e5);m['positions']=np.rint(v*1e5).astype(int).ravel().tolist();n=np.array(m['normals']).reshape(-1,3)/32767;n=n@rotation.T;m['normals']=np.rint(n*32767).astype(int).ravel().tolist()
data['reference']['surfaceRepair']['positiveVolume']=float(merged.volume)
for b in data['rig']['bones']:b['position']=transform(b['position']).tolist()
l=data['landmarks']
for k in ['neck','head','leftEye','rightEye']:l[k]=transform(l[k]).tolist()
g=l['faceGuide'];chinPoint=[0,g['chin'],g['mouth'][2]]
for k in ['mouth','nose']:g[k]=transform(g[k]).tolist()
g['brows']=[transform(v).tolist() for v in g['brows']];g['chin']=float(transform(chinPoint)[1]);g['top']=float(transform([0,g['top'],pivot[2]])[1]);data['reference']['headPosition']={'offset':offset.tolist(),'pitchDegrees':-1.5,'transition':[1.355,1.52]}
packed=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0);txt=base64.b64encode(packed).decode();parts=[]
for i,start in enumerate(range(0,len(txt),170000)):
 name=f'stone-ref-part-{i}.b64';(out/name).write_text(txt[start:start+170000]);parts.append(name)
(out/'stone-ref-manifest.json').write_text(json.dumps({'parts':parts,'bytes':len(packed),'reference':data['reference']},separators=(',',':')));print('Head position',data['reference']['headPosition'])
