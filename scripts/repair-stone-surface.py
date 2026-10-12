"""Reconstruct Stone's skin as one oriented manifold; retain the supplied shape."""
from pathlib import Path
import json,gzip,base64,hashlib,sys,time
import numpy as np,trimesh
from scipy import ndimage
from scipy.spatial import cKDTree
from skimage.measure import marching_cubes
root=Path(__file__).resolve().parents[1];out=root/'dist/assets/anime';manifest=json.loads((out/'stone-ref-manifest.json').read_text());data=json.loads(gzip.decompress(base64.b64decode(''.join((out/p).read_text() for p in manifest['parts']))))
checkpoint=root/'scripts/stone-surface-v40.json.gz'
if not checkpoint.exists() and data['reference'].get('surfaceRepair'):raise SystemExit('Rebuild the body and merge the head before repairing the surface.')
if not checkpoint.exists():checkpoint.write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0))
data=json.loads(gzip.decompress(checkpoint.read_bytes()));old=data['meshes'][:2];parts=[]
for m in old:parts.append(trimesh.Trimesh(np.array(m['positions']).reshape(-1,3)/1e5,np.array(m['groups'][0]['indices']).reshape(-1,3),process=False))
original=trimesh.util.concatenate(parts);original.merge_vertices();pitch=.0018
if len(sys.argv)>1:
 cache=np.load(sys.argv[1]);surface=trimesh.Trimesh(cache['p'],cache['f'],process=True)
else:
 origin=original.vertices.min(0)-pitch*4;shape=np.ceil((original.vertices.max(0)-origin)/pitch).astype(int)+5;volume=np.zeros(shape,dtype=bool);q=(original.vertices-origin)/pitch
 # Rasterize each triangle in its dominant projection. Memory stays bounded.
 for tri in original.faces:
  t=q[tri];normal=np.cross(t[1]-t[0],t[2]-t[0]);depth=int(np.argmax(abs(normal)));axes=[i for i in range(3) if i!=depth];a,b,c=t[:,axes];e=b-a;f=c-a;det=e[0]*f[1]-e[1]*f[0]
  if abs(det)<1e-10:continue
  low=np.maximum(0,np.floor(t[:,axes].min(0)).astype(int)-1);high=np.minimum(shape[axes]-1,np.ceil(t[:,axes].max(0)).astype(int)+1);x,y=np.meshgrid(np.arange(low[0],high[0]+1),np.arange(low[1],high[1]+1),indexing='ij');dx=x-a[0];dy=y-a[1];u=(dx*f[1]-dy*f[0])/det;v=(e[0]*dy-e[1]*dx)/det;tol=1/max(np.linalg.norm(e),np.linalg.norm(f),1);inside=(u>=-tol)&(v>=-tol)&(u+v<=1+tol)
  z=t[0,depth]+u*(t[1,depth]-t[0,depth])+v*(t[2,depth]-t[0,depth]);ix=x[inside];iy=y[inside]
  for iz in [np.floor(z[inside]).astype(int),np.ceil(z[inside]).astype(int)]:
   coords=[None]*3;coords[axes[0]]=ix;coords[axes[1]]=iy;coords[depth]=np.clip(iz,0,shape[depth]-1);volume[tuple(coords)]=True
 volume=ndimage.binary_closing(volume,iterations=1);volume=ndimage.binary_fill_holes(volume);chunks=[]
 for sy in range(0,shape[1]-1,120):
  ey=min(sy+120,shape[1]-1);block=volume[:,sy:ey+1,:]
  if not block.any() or block.all():continue
  p,f,_,_=marching_cubes(block.astype('f4'),level=.5,spacing=(pitch,pitch,pitch),allow_degenerate=False);p+=origin+[0,sy*pitch,0];chunks.append(trimesh.Trimesh(p,f,process=False))
 surface=trimesh.util.concatenate(chunks);surface.merge_vertices(digits_vertex=6);trimesh.smoothing.filter_taubin(surface,lamb=.35,nu=.36,iterations=4);surface=surface.simplify_quadric_decimation(face_count=28000,aggression=3)
surface.update_faces(surface.unique_faces());surface.update_faces(surface.nondegenerate_faces());surface.remove_unreferenced_vertices();surface=max(surface.split(only_watertight=False),key=lambda m:len(m.faces));trimesh.repair.fix_normals(surface,multibody=True)
# Fair only the reconstructed neck/scalp junctions; retain facial planes and muscle masses.
from scipy.sparse import coo_matrix,diags
edges=np.vstack([surface.edges_unique,surface.edges_unique[:,::-1]]);adj=coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(surface.vertices),len(surface.vertices))).tocsr();adj=diags(1/np.asarray(adj.sum(1)).ravel())@adj
v=np.asarray(surface.vertices).copy();x,y,z=v.T
smooth=lambda v:np.clip(v,0,1)**2*(3-2*np.clip(v,0,1))
neckmask=smooth((y-1.345)/.04)*(1-smooth((y-1.49)/.035))*(1-smooth((abs(x)-.205)/.04));facelock=smooth((y-1.463)/.018)*smooth((z-.015)/.035);neckmask*=1-facelock
scalp=smooth((y-1.595)/.025);strength=np.maximum(neckmask*.46,scalp*.32)
for _ in range(12):v+=(adj@v-v)*strength[:,None]
surface.vertices=v
# Quantize before computing shared normals/topology, matching runtime precision.
surface.vertices=np.rint(surface.vertices*1e5)/1e5;surface.merge_vertices();surface.update_faces(surface.nondegenerate_faces());surface.remove_unreferenced_vertices();trimesh.repair.fix_normals(surface,multibody=True)
e,counts=np.unique(np.sort(surface.edges,axis=1),axis=0,return_counts=True)
assert np.all(counts==2),'surface must be closed and edge-manifold'
assert surface.is_winding_consistent and surface.is_watertight and surface.volume>0
p=np.asarray(surface.vertices);f=np.asarray(surface.faces);n=np.asarray(surface.vertex_normals);rig=data['rig'];head=rig['humanoid']['head'];neck=rig['humanoid']['neck'];chest=rig['humanoid']['upperChest']
oldp=np.vstack([np.array(m['positions']).reshape(-1,3)/1e5 for m in old]);oldj=np.vstack([np.array(m['skinIndices']).reshape(-1,4) for m in old]);oldw=np.vstack([np.array(m['skinWeights']).reshape(-1,4) for m in old]);dist,near=cKDTree(oldp).query(p,k=8);weights=np.zeros((len(p),len(rig['bones'])))
for i in range(len(p)):
 proximity=1/(dist[i]**2+pitch**2*.08);proximity/=proximity.sum()
 for source,contribution in zip(near[i],proximity):
  for j,w in zip(oldj[source],oldw[source]):weights[i,j]+=w*contribution
 x,y,z=p[i];ax=abs(x)
 # Continuous jaw/neck field; avoid the old hard skin-region boundary.
 if y>1.52:weights[i]=0;weights[i,head]=1
 elif y>1.39:
  smooth=lambda v:np.clip(v,0,1)**2*(3-2*np.clip(v,0,1))
  vertical=smooth((y-1.442)/.078);jaw=smooth((y-1.43)/.044)*smooth((z+.005)/.052)*(1-smooth((ax-.082)/.04));t=max(vertical,jaw);ownership=smooth((.11-ax)/.055);blend=smooth((y-1.39)/.028)
  weights[i]*=1-blend;weights[i,head]+=blend*ownership*t;weights[i,neck]+=blend*ownership*(1-t);weights[i,chest]+=blend*(1-ownership)
 # Deltoid field follows the measured arm root, rather than noisy nearest patches.
 if y>1.27 and ax>.12 and y<1.46:
  arm=smooth((ax-.175)/.095);blend=smooth((y-1.27)/.08);side='left' if x>0 else 'right';weights[i]*=1-blend
  weights[i,chest]+=blend*(1-arm);weights[i,rig['humanoid'][side+'UpperArm']]+=blend*arm
 # Separate nearby hand and pelvis surfaces during weight interpolation.
 if .59<y<1.04:
  arm={j for k,j in rig['humanoid'].items() if any(v in k for v in ['Arm','Hand','Thumb','Index','Middle','Ring','Little','Shoulder'])}
  if ax>.25:weights[i,[j for j in range(len(rig['bones'])) if j not in arm]]=0
  else:weights[i,list(arm)]=0
# Diffuse the shoulder/neck field on surface adjacency, never across the hand/hip gap.
edges=np.vstack([surface.edges_unique,surface.edges_unique[:,::-1]]);adj=coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(surface.vertices),len(surface.vertices))).tocsr();adj=diags(1/np.asarray(adj.sum(1)).ravel())@adj
mask=smooth((p[:,1]-1.265)/.04)*(1-smooth((p[:,1]-1.495)/.025))*(1-smooth((abs(p[:,0])-.30)/.04))
for _ in range(14):weights+=(adj@weights-weights)*(mask*.48)[:,None]
weights[(abs(p[:,0])>.11)&(p[:,1]<1.52),head]=0
weights/=weights.sum(1)[:,None];j=np.argsort(weights,axis=1)[:,-4:][:,::-1];w=np.take_along_axis(weights,j,axis=1);w/=w.sum(1)[:,None];quantized=np.rint(w*16384).astype(int);quantized[:,0]+=16384-quantized.sum(1);w=quantized/16384
# Body and Face are material partitions of the same manifold, with identical
# shared positions, normals and weights. No overlapping patch shells remain.
mask=(p[f].mean(1)[:,1]>1.46)&(abs(p[f].mean(1)[:,0])<.14)
def encode(name,tri,material):
 ids=np.unique(tri);lookup=np.full(len(p),-1);lookup[ids]=np.arange(len(ids));return {'name':name,'positions':np.rint(p[ids]*1e5).astype(int).ravel().tolist(),'normals':np.rint(n[ids]*32767).astype(int).ravel().tolist(),'uv':[0]*len(ids)*2,'skinIndices':j[ids].ravel().tolist(),'skinWeights':w[ids].ravel().tolist(),'groups':[{'material':material,'indices':lookup[tri].ravel().tolist()}],'expressions':{},'stoneRebuilt':True}
data['meshes']=[encode('Body',f[~mask],0),encode('Face',f[mask],1),data['meshes'][2]];data['materials'][0]['double']=False;data['materials'][1]['double']=False;data['landmarks']['surfaceStage']=True
rig['meshes']={m['name']:{'indices':m['skinIndices'],'weights':[round(v*65535) for v in m['skinWeights']]} for m in data['meshes']}
# Save an objective topology report; normal attributes alone cannot prove repair.
repair={'pitch':pitch,'beforeSkinFaces':len(original.faces),'skinFaces':len(f),'skinVertices':len(p),'boundaryEdges':0,'nonManifoldEdges':0,'duplicateFaces':0,'watertight':True,'consistentWinding':True,'positiveVolume':float(surface.volume)}
data['reference'].update({'surfaceRepair':repair,'skinFaces':len(f),'faces':sum(len(m['groups'][0]['indices'])//3 for m in data['meshes']),'vertices':sum(len(m['positions'])//3 for m in data['meshes'])});packed=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0);text=base64.b64encode(packed).decode();parts=[]
for i,start in enumerate(range(0,len(text),170000)):
 name=f'stone-ref-part-{i}.b64';(out/name).write_text(text[start:start+170000]);parts.append(name)
(out/'stone-ref-manifest.json').write_text(json.dumps({'parts':parts,'bytes':len(packed),'reference':data['reference']},separators=(',',':')));print(json.dumps(repair),len(packed),len(parts))
for p in out.glob('stone-ref-part-*.b64'):
 if p.name not in parts:p.unlink()
