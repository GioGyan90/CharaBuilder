"""Merge user-supplied Stone head into the existing JS body. No runtime GLB."""
from pathlib import Path
import sys,json,gzip,base64,hashlib
import numpy as np,trimesh
root=Path(__file__).resolve().parents[1];out=root/'dist/assets/anime';source=Path(sys.argv[1]);manifest=json.loads((out/'stone-ref-manifest.json').read_text());data=json.loads(gzip.decompress(base64.b64decode(''.join((out/p).read_text() for p in manifest['parts']))))
# Idempotent: keep the approved v39 foundation in a build checkpoint.
checkpoint=root/'scripts/stone-body-v39.json.gz'
if not checkpoint.exists() and data['reference'].get('headSha256'):raise SystemExit('Rebuild the approved body first with rebuild-stone.py, then merge the head.')
if not checkpoint.exists():checkpoint.write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0))
data=json.loads(gzip.decompress(checkpoint.read_bytes()));body=data['meshes'][0];rig=data['rig'];headbone=rig['humanoid']['head'];neckbone=rig['humanoid']['neck']
src=trimesh.load(source,force='mesh');src.merge_vertices();src=src.simplify_quadric_decimation(face_count=18000,aggression=3)
# Collar cut follows the lower jaw and nape rather than a horizontal jaw cut.
def clip(mesh,fn):
 vs=[];fs=[]
 for face in mesh.faces:
  poly=[v.copy() for v in mesh.vertices[face]];next=[]
  for i,a in enumerate(poly):
   b=poly[(i+1)%len(poly)];fa,fb=fn(a),fn(b)
   if fa>=0:next.append(a)
   if (fa>=0)!=(fb>=0):next.append(a+(b-a)*fa/(fa-fb))
  if len(next)>=3:
   st=len(vs);vs.extend(next)
   for j in range(1,len(next)-1):fs.append([st,st+j,st+j+1])
 result=trimesh.Trimesh(vs,fs,process=True);result.remove_unreferenced_vertices();return result
head=clip(src,lambda p:p[1]+.23+.80*max(0,p[2]-.10));head=clip(head,lambda p:max(p[1]+.22,.46-abs(p[0])));head=clip(head,lambda p:max(p[1]+.22,p[2]+.43))
def hairline(p):return p[1]-.29-.15*p[2]
skin=clip(head,lambda p:-hairline(p));hair=clip(head,hairline)
# Preserve the distinctive hanging forelock as hair, remove it from skin.
# This lower tuft occupies the narrow strip in front of the forehead.
t=skin.triangles_center;tuft=(t[:,2]>.54)&(t[:,1]>.05);tuftmesh=trimesh.Trimesh(skin.vertices,skin.faces[tuft],process=True);hair=trimesh.util.concatenate([hair,tuftmesh]);skin.update_faces(~tuft);skin.remove_unreferenced_vertices()
def loops(mesh):
 edges=np.sort(mesh.edges,axis=1);e,c=np.unique(edges,axis=0,return_counts=True);e=e[c==1];adj={}
 for a,b in e:adj.setdefault(int(a),[]).append(int(b));adj.setdefault(int(b),[]).append(int(a))
 remaining=set(adj);result=[]
 while remaining:
  start=min(remaining);path=[start];prev=-1;cur=start
  for _ in range(len(adj)+1):
   choices=[i for i in adj[cur] if i!=prev];nxt=next((i for i in choices if i in remaining and i!=start),start if start in choices else -1)
   remaining.discard(cur)
   if nxt<0 or nxt==start:break
   prev,cur=cur,nxt;path.append(cur)
  if len(path)>2:result.append(path)
 return result
# Rebuild the full bare cranium beneath the extracted authored hairstyle.
# Donor forehead below this level is retained; upper skull is a closed analytic shell.
skin=clip(skin,lambda p:.18-p[1]);skin=max(skin.split(only_watertight=False),key=lambda m:len(m.faces))
c=np.array([0,.245,-.015]);radius=np.array([.425,.39,.535]);
for i,q in enumerate(skin.vertices):
 if q[1]>.12:
  theta=np.arctan2(q[0]/radius[0],(q[2]-c[2])/radius[2]);r=np.sqrt(max(0,1-((q[1]-c[1])/radius[1])**2));target=np.array([radius[0]*r*np.sin(theta),q[1],c[2]+radius[2]*r*np.cos(theta)]);t=np.clip((q[1]-.12)/.06,0,1);skin.vertices[i]=q*(1-t)+target*t
v=skin.vertices.tolist();f=skin.faces.tolist();rings=16
boundary=np.where(abs(skin.vertices[:,1]-.18)<1e-7)[0];angles=np.arctan2(skin.vertices[boundary,0]/radius[0],(skin.vertices[boundary,2]-c[2])/radius[2]);order=np.argsort(angles);boundary=boundary[order].tolist();angles=angles[order];count=len(boundary);prev=boundary;bottom=np.arcsin((.18-c[1])/radius[1])
for k in range(1,rings):
 phi=bottom+(np.pi/2-bottom)*k/rings;ring=[]
 for theta in angles:
  ring.append(len(v));v.append((c+radius*np.array([np.cos(phi)*np.sin(theta),np.sin(phi),np.cos(phi)*np.cos(theta)])).tolist())
 for i in range(count):
  j=(i+1)%count;f.extend([[prev[i],prev[j],ring[i]],[prev[j],ring[j],ring[i]]])
 prev=ring
pole=len(v);v.append((c+[0,radius[1],0]).tolist())
for i in range(count):f.append([prev[i],prev[(i+1)%count],pole])
vertices=np.array(v)
for tri in f[len(skin.faces):]:
 q=vertices[tri];
 if np.dot(np.cross(q[1]-q[0],q[2]-q[0]),q.mean(0)-c)<0:tri[1],tri[2]=tri[2],tri[1]
skin=trimesh.Trimesh(v,f,process=True)
# Seal small reconstruction holes while keeping the lower neck boundary open.
import pymeshlab
ms=pymeshlab.MeshSet();ms.add_mesh(pymeshlab.Mesh(skin.vertices,skin.faces));ms.meshing_close_holes(maxholesize=100,refinehole=False);closed=ms.current_mesh();skin=trimesh.Trimesh(closed.vertex_matrix(),closed.face_matrix(),process=True)
# Source face size/origin measured in the approved body's local 1.7 m frame.
scale=.20;offset=np.array([0,1.56,-.005])
for m in [skin,hair]:m.vertices=m.vertices*scale+offset
# Neck transition uses the existing body boundary exactly; body coordinates stay intact.
oldbody=body;oldface=data['meshes'][1];parts=[]
for m in [oldbody,oldface]:parts.append(trimesh.Trimesh(np.array(m['positions']).reshape(-1,3)/1e5,np.array(m['groups'][0]['indices']).reshape(-1,3),process=False))
bm=clip(trimesh.util.concatenate(parts),lambda p:1.442-p[1]);bm.merge_vertices()
bp=np.asarray(bm.vertices);bf=np.asarray(bm.faces)
from scipy.spatial import cKDTree
oldp=np.vstack([np.array(m['positions']).reshape(-1,3)/1e5 for m in [oldbody,oldface]]);oldj=np.vstack([np.array(m['skinIndices']).reshape(-1,4) for m in [oldbody,oldface]]);oldw=np.vstack([np.array(m['skinWeights']).reshape(-1,4) for m in [oldbody,oldface]]);near=cKDTree(oldp).query(bp)[1]
body={**oldbody,'positions':np.rint(bp*1e5).astype(int).ravel().tolist(),'normals':np.rint(bm.vertex_normals*32767).astype(int).ravel().tolist(),'uv':[0]*len(bp)*2,'groups':[{'material':0,'indices':bf.ravel().tolist()}],'skinIndices':oldj[near].ravel().tolist(),'skinWeights':oldw[near].ravel().tolist()}
# The old height-only rule let head rotation pull the trapezius. Restrict neck
# ownership anatomically, keeping the shoulder shelf on the upper chest.
for i,q in enumerate(bp):
 if q[1]<1.39:continue
 neck=float(np.clip((.11-abs(q[0]))/.055,0,1));blend=float(np.clip((q[1]-1.39)/.028,0,1));weights={}
 for j,w in zip(body['skinIndices'][i*4:i*4+4],body['skinWeights'][i*4:i*4+4]):weights[j]=weights.get(j,0)+w*(1-blend)
 weights[neckbone]=weights.get(neckbone,0)+neck*blend;chest=rig['humanoid']['upperChest'];weights[chest]=weights.get(chest,0)+(1-neck)*blend
 chosen=sorted(weights.items(),key=lambda x:x[1],reverse=True)[:4];total=sum(w for j,w in chosen);body['skinIndices'][i*4:i*4+4]=[j for j,w in chosen]+[0]*(4-len(chosen));body['skinWeights'][i*4:i*4+4]=[w/total for j,w in chosen]+[0]*(4-len(chosen))
bl=max(loops(bm),key=lambda l:len(l) if bp[l,1].mean()>1.435 else 0);print('body loop bounds',bp[bl].min(0),bp[bl].max(0));sl=min(loops(skin),key=lambda l:skin.vertices[l,1].mean());print('neck loops',len(bl),len(sl))
# Resample donor neck ring to the body's angular samples, then zipper to donor ring.
def ordered(points):return np.argsort(np.arctan2(points[:,0],points[:,2]+.02))
a=bp[bl][ordered(bp[bl])];b=skin.vertices[sl][ordered(skin.vertices[sl])]
# Six angularly matched rings distribute neck motion across the transition.
aa=np.arctan2(a[:,0],a[:,2]+.02);bb=np.arctan2(b[:,0],b[:,2]+.02);target=np.column_stack([np.interp(aa,np.r_[bb[-1]-2*np.pi,bb,bb[0]+2*np.pi],np.r_[b[-1,k],b[:,k],b[0,k]]) for k in range(3)])
v=skin.vertices.tolist();f=skin.faces.tolist();ia=[];transition={};sourceids=np.array(bl)[ordered(bp[bl])]
for q in a:ia.append(len(v));v.append(q.tolist())
for step in range(1,7):
 t=step/7;ring=[]
 for index,(q,r) in enumerate(zip(a,target)):
  point=q*(1-t)+r*t;ring.append(len(v));v.append(point.tolist());weights={}
  oldindex=sourceids[index]
  for joint,w in zip(body['skinIndices'][oldindex*4:oldindex*4+4],body['skinWeights'][oldindex*4:oldindex*4+4]):weights[joint]=weights.get(joint,0)+w*(1-t)**2
  weights[neckbone]=weights.get(neckbone,0)+2*t*(1-t);weights[headbone]=weights.get(headbone,0)+t*t
  chosen=sorted(weights.items(),key=lambda x:x[1],reverse=True)[:4];total=sum(w for _,w in chosen);transition[tuple(np.round(point,5))]=([j for j,w in chosen]+[0]*(4-len(chosen)),[w/total for j,w in chosen]+[0]*(4-len(chosen)))
 for i in range(len(ia)):
  j=(i+1)%len(ia);f.extend([[ia[i],ia[j],ring[i]],[ia[j],ring[j],ring[i]]])
 ia=ring
ib=np.array(sl)[ordered(skin.vertices[sl])].tolist();i=j=0
while i<len(ia) or j<len(ib):
 nexta=aa[i+1] if i+1<len(aa) else aa[0]+2*np.pi;nextb=bb[j+1] if j+1<len(bb) else bb[0]+2*np.pi
 if i<len(ia) and (j==len(ib) or nexta<nextb):f.append([ia[i%len(ia)],ia[(i+1)%len(ia)],ib[j%len(ib)]]);i+=1
 else:f.append([ia[i%len(ia)],ib[(j+1)%len(ib)],ib[j%len(ib)]]);j+=1
for tri in f[len(skin.faces):]:
 q=np.asarray(v)[tri];c=q.mean(0);
 if np.dot(np.cross(q[1]-q[0],q[2]-q[0]),[c[0],0,c[2]+.02])<0:tri[1],tri[2]=tri[2],tri[1]
skin=trimesh.Trimesh(v,f,process=True)
trimesh.repair.fix_winding(skin)
front=(skin.triangles_center[:,2]>.075)&(skin.triangles_center[:,1]>1.51)&(skin.triangles_center[:,1]<1.56)
if skin.face_normals[front,2].mean()<0:skin.invert()
# Seal planar cut islands left by non-manifold reconstructed shoulder/nape edges.
from scipy.sparse.csgraph import connected_components
from scipy.sparse import coo_matrix
combined=trimesh.util.concatenate([bm,skin]);combined.merge_vertices(digits_vertex=5);edges,counts=np.unique(np.sort(combined.edges,axis=1),axis=0,return_counts=True);edges=edges[counts==1];graph=coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(combined.vertices),len(combined.vertices)));_,labels=connected_components(graph,directed=False);bv={tuple(q):i for i,q in enumerate(np.round(bp,5))};pv=skin.vertices.tolist();pf=skin.faces.tolist();repairs=0
for label in np.unique(labels[edges.ravel()]):
 selected=edges[labels[edges[:,0]]==label];unique=np.unique(selected);points=combined.vertices[unique]
 if len(unique)<3 or points[:,1].min()<1.4 or points[:,1].max()>1.54:continue
 center=points.mean(0);centerid=len(pv);pv.append(center.tolist());w={}
 for q in points:
  key=tuple(np.round(q,5));i=bv.get(key)
  if key in transition:jj,ww=transition[key]
  elif i is not None:jj=body['skinIndices'][i*4:i*4+4];ww=body['skinWeights'][i*4:i*4+4]
  else:jj=[headbone];ww=[1]
  for j,vv in zip(jj,ww):w[j]=w.get(j,0)+vv/len(points)
 chosen=sorted(w.items(),key=lambda x:x[1],reverse=True)[:4];total=sum(vv for j,vv in chosen);transition[tuple(np.round(center,5))]=([j for j,vv in chosen]+[0]*(4-len(chosen)),[vv/total for j,vv in chosen]+[0]*(4-len(chosen)))
 for edge in selected:
  start=len(pv);pv.extend(combined.vertices[edge].tolist());pf.append([start,start+1,centerid]);repairs+=1
skin=trimesh.Trimesh(pv,pf,process=True);print('junction cap triangles',repairs)

# Copy body boundary weights into the transition for coincident animated seams.
lookup={tuple(p):i for i,p in enumerate(np.round(bp,5))}
def encode(m,name,mat):
 p=np.asarray(m.vertices);ids=[];weights=[]
 for q in p:
  key=tuple(np.round(q,5));found=lookup.get(key)
  if key in transition:idx,ws=transition[key];ids.extend(idx);weights.extend(ws);continue
  if found is not None:ids.extend(body['skinIndices'][found*4:found*4+4]);weights.extend(body['skinWeights'][found*4:found*4+4])
  else:
   ids.extend([headbone,0,0,0]);weights.extend([1,0,0,0])
 return {'name':name,'positions':np.rint(p*1e5).astype(int).ravel().tolist(),'normals':np.rint(m.vertex_normals*32767).astype(int).ravel().tolist(),'uv':[0]*(len(p)*2),'skinIndices':ids,'skinWeights':weights,'groups':[{'material':mat,'indices':m.faces.ravel().tolist()}],'expressions':{},'stoneRebuilt':True}
# Thin reconstructed ear/hair surfaces need two-sided rasterization.
data['materials'][1]['double']=True;data['materials'][2]['double']=True
data['meshes']=[body,encode(skin,'Face',1),encode(hair,'HairReference',2)];data['landmarks'].update({'leftEye':[.037,1.563,.096],'rightEye':[-.037,1.563,.096],'head':[0,1.55,-.005],'faceGuide':{'chin':1.464,'top':1.687,'mouth':[0,1.491,.085],'nose':[0,1.52,.118],'brows':[[-.037,1.583,.105],[.037,1.583,.105]]},'completeScalp':True});
for key in ['leftEye','rightEye']:
 c=data['landmarks'][key];tri=skin.triangles;ax=tri[:,0,0];ay=tri[:,0,1];bx=tri[:,1,0]-ax;by=tri[:,1,1]-ay;cx=tri[:,2,0]-ax;cy=tri[:,2,1]-ay;det=bx*cy-by*cx;safe=np.where(abs(det)>1e-12,det,np.inf);u=((c[0]-ax)*cy-(c[1]-ay)*cx)/safe;v=(bx*(c[1]-ay)-by*(c[0]-ax))/safe;valid=(u>=0)&(v>=0)&(u+v<=1)&(abs(det)>1e-12);zs=tri[:,0,2]+u*(tri[:,1,2]-tri[:,0,2])+v*(tri[:,2,2]-tri[:,0,2]);c[2]=float(zs[valid].max())+.0008
 print('socket',key,c)
for k in ['leftEye','rightEye','head']:rig['bones'][rig['humanoid'][k]]['position']=data['landmarks'][k]
rig['meshes']={m['name']:{'indices':m['skinIndices'],'weights':[round(v*65535) for v in m['skinWeights']]} for m in data['meshes']};data['reference'].update({'headSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'headSourceFaces':476578,'faces':sum(len(m['groups'][0]['indices'])//3 for m in data['meshes']),'vertices':sum(len(m['positions'])//3 for m in data['meshes']),'completeScalp':True})
packed=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0);txt=base64.b64encode(packed).decode();parts=[]
for i,start in enumerate(range(0,len(txt),170000)):
 name=f'stone-ref-part-{i}.b64';(out/name).write_text(txt[start:start+170000]);parts.append(name)
(out/'stone-ref-manifest.json').write_text(json.dumps({'parts':parts,'bytes':len(packed),'reference':data['reference']},separators=(',',':')));print(data['reference'],len(packed))
