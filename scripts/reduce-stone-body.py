"""Narrow and simplify Stone's body; keep every authored head vertex fixed."""
from pathlib import Path
import json,gzip,base64,numpy as np,trimesh,pymeshlab
from scipy.spatial import cKDTree
root=Path(__file__).resolve().parents[1];out=root/'dist/assets/anime';manifest=json.loads((out/'stone-ref-manifest.json').read_text());data=json.loads(gzip.decompress(base64.b64decode(''.join((out/p).read_text() for p in manifest['parts']))))
checkpoint=root/'scripts/stone-lowbody-v42.json.gz'
if not checkpoint.exists():checkpoint.write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0))
data=json.loads(gzip.decompress(checkpoint.read_bytes()));body,face=data['meshes'][:2];oldp=np.array(body['positions']).reshape(-1,3)/1e5;oldf=np.array(body['groups'][0]['indices']).reshape(-1,3);headkeys={tuple(v) for v in np.array(face['positions']).reshape(-1,3)};shared=np.array([tuple(np.rint(v*1e5).astype(int)) in headkeys for v in oldp]);scale=.91
smooth=lambda t:np.clip(t,0,1)**2*(3-2*np.clip(t,0,1))
def narrow(p):
 p=np.asarray(p,dtype=float).copy();p[...,0]*=scale+(1-scale)*smooth((p[...,1]-1.355)/.105);return p
p=narrow(oldp);p[shared]=oldp[shared]
# Light local fairing reduces scan ripples while retaining large muscle masses.
from scipy.sparse import coo_matrix,diags
edges=np.unique(np.sort(np.vstack([oldf[:,[0,1]],oldf[:,[1,2]],oldf[:,[2,0]]]),axis=1),axis=0);edges=np.vstack([edges,edges[:,::-1]]);adj=coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(p),len(p))).tocsr();adj=diags(1/np.asarray(adj.sum(1)).ravel())@adj
mask=smooth((p[:,1]-.14)/.08)*(1-smooth((p[:,1]-1.35)/.05));hands=(abs(p[:,0])>.23)&(p[:,1]>.64)&(p[:,1]<1.03);mask[hands|shared]=0
for _ in range(4):p+=(adj@p-p)*(mask*.20)[:,None]
p[shared]=oldp[shared];source=trimesh.Trimesh(p,oldf,process=False)
# Freeze all triangles touching the head seam during selected-face decimation.
ms=pymeshlab.MeshSet();ms.add_mesh(pymeshlab.Mesh(p,oldf));ms.compute_selection_by_condition_per_face(condselect='(y0 < 1.435) && (y1 < 1.435) && (y2 < 1.435)');ms.meshing_decimation_quadric_edge_collapse(targetfacenum=9000,preservetopology=True,preservenormal=True,preserveboundary=True,boundaryweight=1000,qualitythr=.5,selected=True,autoclean=True)
m=ms.current_mesh();low=trimesh.Trimesh(m.vertex_matrix(),m.face_matrix(),process=True);low.remove_unreferenced_vertices();low.vertices=np.rint(low.vertices*1e5)/1e5;low.merge_vertices();low.update_faces(low.nondegenerate_faces());print('body reduced',len(oldf),'->',len(low.faces),flush=True)
# Interpolate original skinning on the original narrowed surface, not by spatial neighbours.
q=np.asarray(low.vertices);candidates=cKDTree(source.triangles_center).query(q,k=32)[1];triangles=source.triangles[candidates];closest=trimesh.triangles.closest_point(triangles.reshape(-1,3,3),np.repeat(q,32,axis=0)).reshape(len(q),32,3);best=np.linalg.norm(closest-q[:,None,:],axis=2).argmin(1);owners=candidates[np.arange(len(q)),best];cp=closest[np.arange(len(q)),best];bary=trimesh.triangles.points_to_barycentric(source.triangles[owners],cp);bary=np.clip(bary,0,1);bary/=bary.sum(1)[:,None];oldj=np.array(body['skinIndices']).reshape(-1,4);oldw=np.array(body['skinWeights']).reshape(-1,4);lookup={tuple(np.rint(v*1e5).astype(int)):i for i,v in enumerate(p)};j=[];w=[]
for i,point in enumerate(q):
 exact=lookup.get(tuple(np.rint(point*1e5).astype(int)))
 if exact is not None:j.extend(oldj[exact]);w.extend(oldw[exact]);continue
 weights={}
 for v,t in zip(oldf[owners[i]],bary[i]):
  for bone,weight in zip(oldj[v],oldw[v]):weights[int(bone)]=weights.get(int(bone),0)+weight*t
 if abs(point[0])>.11 and point[1]<1.52:weights.pop(data['rig']['humanoid']['head'],None)
 chosen=sorted(weights.items(),key=lambda x:x[1],reverse=True)[:4];total=sum(x[1] for x in chosen);ids=[x[0] for x in chosen]+[0]*(4-len(chosen));ws=np.array([x[1]/total for x in chosen]+[0]*(4-len(chosen)));quant=np.rint(ws*16384).astype(int);quant[0]+=16384-quant.sum();j.extend(ids);w.extend(quant/16384)
body.update({'positions':np.rint(q*1e5).astype(int).ravel().tolist(),'uv':[0]*len(q)*2,'skinIndices':list(map(int,j)),'skinWeights':list(map(float,w)),'groups':[{'material':0,'indices':low.faces.ravel().tolist()}]})
# Shared normals come from the combined manifold; Face geometry remains byte-identical.
fp=np.array(face['positions']).reshape(-1,3)/1e5;ff=np.array(face['groups'][0]['indices']).reshape(-1,3);merged=trimesh.Trimesh(np.vstack([q,fp]),np.vstack([low.faces,ff+len(q)]),process=True);assert merged.is_watertight and merged.is_winding_consistent,'head/body boundary changed';normals={tuple(np.rint(v*1e5).astype(int)):n for v,n in zip(merged.vertices,merged.vertex_normals)}
for m in [body,face]:m['normals']=np.rint(np.array([normals[tuple(v)] for v in np.array(m['positions']).reshape(-1,3)])*32767).astype(int).ravel().tolist()
for b in data['rig']['bones']:
 if b['position'][1]<1.46:b['position']=narrow(b['position']).tolist()
l=data['landmarks'];l['hips']=narrow(l['hips']).tolist();l['bodyRig']={k:narrow(v).tolist() for k,v in l['bodyRig'].items()}
data['rig']['meshes']={m['name']:{'indices':m['skinIndices'],'weights':[round(v*65535) for v in m['skinWeights']]} for m in data['meshes']}
data['reference'].update({'bodyWidthScale':scale,'skinFaces':len(merged.faces),'faces':sum(len(m['groups'][0]['indices'])//3 for m in data['meshes']),'vertices':sum(len(m['positions'])//3 for m in data['meshes'])});data['reference']['surfaceRepair'].update({'skinFaces':len(merged.faces),'skinVertices':len(merged.vertices),'positiveVolume':float(merged.volume)})
packed=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0);txt=base64.b64encode(packed).decode();parts=[]
for i,start in enumerate(range(0,len(txt),170000)):
 name=f'stone-ref-part-{i}.b64';(out/name).write_text(txt[start:start+170000]);parts.append(name)
(out/'stone-ref-manifest.json').write_text(json.dumps({'parts':parts,'bytes':len(packed),'reference':data['reference']},separators=(',',':')))
for p in out.glob('stone-ref-part-*.b64'):
 if p.name not in parts:p.unlink()
print('skin',len(merged.faces),'head',len(ff),'packed',len(packed),flush=True)
