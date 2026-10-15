"""Reproducible v65 reduction from the v64 imported asset, kept in Git."""
import base64,gzip,json,subprocess
from pathlib import Path
import numpy as np
import trimesh
root=Path(__file__).resolve().parents[1]
raw=subprocess.check_output(['git','show','d2f97fd:dist/assets/anime/imported-00003.b64'],cwd=root)
data=json.loads(gzip.decompress(base64.b64decode(raw)))
for part,target in [('Face',1100),('HairImported',1500)]:
 m=next(m for m in data['meshes'] if m['name']==part)
 old=len(m['groups'][0]['indices'])//3
 mesh=trimesh.Trimesh(np.array(m['positions']).reshape(-1,3)/1e5,np.array(m['groups'][0]['indices']).reshape(-1,3),process=False)
 if part=='Face':
  # Consolidate each lower cheek into one broad support plane; keep eyelids,
  # nose, lips, ears and the collar outside these local masks.
  v=mesh.vertices.copy()
  for sign in [-1,1]:
   mask=(v[:,0]*sign>.018)&(v[:,0]*sign<.065)&(v[:,1]>1.53)&(v[:,1]<1.578)&(v[:,2]>.032)
   q=v[mask];A=np.column_stack([q[:,0],q[:,1],np.ones(len(q))])
   fit=np.linalg.lstsq(A,q[:,2],rcond=None)[0]
   radius=np.maximum(abs((q[:,0]*sign-.0415)/.0235),abs((q[:,1]-1.554)/.024))
   blend=.85*np.clip((1-radius)/.35,0,1)
   v[mask,2]+=(A@fit-q[:,2])*blend
  mesh.vertices=v
 mesh=mesh.simplify_quadric_decimation(face_count=target,aggression=2)
 # Keep the original collar plane exactly, preserving the runtime zipper seam.
 m['positions']=np.rint(mesh.vertices*1e5).astype(int).ravel().tolist()
 m['normals']=np.rint(mesh.vertex_normals*32767).astype(int).ravel().tolist()
 m['uv']=[0]*(len(mesh.vertices)*2);m['groups'][0]['indices']=mesh.faces.ravel().tolist()
 m['skinIndices']=[];m['skinWeights']=[]
 for v in mesh.vertices:
  t=float(np.clip((v[1]-1.46)/.065,0,1));t=t*t*(3-2*t)
  m['skinIndices'] += [data['rig']['humanoid']['head'],data['rig']['humanoid']['neck'],0,0]
  m['skinWeights'] += [t,1-t,0,0]
 m['faceRegions']=['Face:skin']*len(mesh.vertices) if part=='Face' else None
 print(part,old,'->',len(mesh.faces))
 data['reference']['faceFaces' if part=='Face' else 'hairFaces']=len(mesh.faces)
data['reference']['version']=65
data['reference']['reductionMethod']='quadric reduction for larger concept-art planes; runtime eyes and lips added separately'
blob=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0)
out=root/'dist/assets/anime';(out/'imported-00003.b64').write_text(base64.b64encode(blob).decode())
manifest={'parts':['imported-00003.b64'],'bytes':len(blob),'reference':data['reference']}
(out/'imported-00003-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
