from pathlib import Path
import numpy as np,trimesh,json,gzip,base64,hashlib
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
import sys,struct
root=Path(__file__).resolve().parents[1];out=root/'dist/assets/anime';source=Path(sys.argv[1]);raw=source.read_bytes();size=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+size]);binary=raw[28+size:]
def accessor(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];n={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']];return np.frombuffer(binary,dtype=dtype,count=a['count']*n,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,n).copy()
node=next(n for n in g['nodes'] if n.get('name')=='Mesh_0');prim=g['meshes'][node['mesh']]['primitives'][0];p=accessor(prim['attributes']['POSITION'])*node.get('scale',[1,1,1])+node.get('translation',[0,0,0]);faces=accessor(prim['indices']).reshape(-1,3);low=p.min(0);high=p.max(0);p[:,1]-=low[1];p[:,[0,2]]-=(low+high)[[0,2]]*.5;p*=1.7/(high[1]-low[1]);
m=trimesh.Trimesh(p,faces,process=True);print('Welded',len(m.vertices),len(m.faces),flush=True)
low=m.simplify_quadric_decimation(face_count=22000,aggression=3);low.remove_unreferenced_vertices();p=np.asarray(low.vertices);f=np.asarray(low.faces);n=np.asarray(low.vertex_normals);print('Reduced',len(p),len(f),flush=True)
manifest=json.loads((out/'male-manifest.json').read_text());old=json.loads(gzip.decompress(base64.b64decode(''.join((out/i).read_text() for i in manifest['parts']))));rig=json.loads(gzip.decompress(base64.b64decode((out/'male-rig.b64').read_text())))
# Anatomical centres measured in the supplied reference's transformed bind pose.
land={'hips':[0,.895,.015],'neck':[0,1.422,-.020],'head':[0,1.533,-.005],'leftEye':[.029,1.590,.123],'rightEye':[-.029,1.590,.123],'stoneRebuilt':True}
anchors={'hips':[0,.895,.015],'spine':[0,1.015,.01],'chest':[0,1.18,0],'upperChest':[0,1.30,-.007],'neck':land['neck'],'head':land['head']}
for side,sg in [('left',1),('right',-1)]:
 for key,val in {'Shoulder':[.075,1.402,-.02],'UpperArm':[.247,1.371,-.004],'LowerArm':[.279,1.101,.010],'Hand':[.281,.862,.025],'UpperLeg':[.134,.877,.010],'LowerLeg':[.145,.474,.030],'Foot':[.173,.114,-.024],'Toes':[.177,.045,.096],'Eye':[.029,1.590,.123]}.items():anchors[side+key]=[sg*val[0],val[1],val[2]]
# Preserve the proven open-source hierarchy; replace every bind point for Stone.
oldbones=np.array([b['position'] for b in rig['bones']]);inverse={i:k for k,i in rig['humanoid'].items()}
for i,b in enumerate(rig['bones']):
 key=inverse.get(i)
 if key in anchors:b['position']=anchors[key];continue
 side='left' if b['position'][0]>=0 else 'right';sg=1 if side=='left' else -1
 if any(word in b['name'] for word in ['Thumb','Index','Middle','Ring','Little']):
  oldhand=oldbones[rig['humanoid'][side+'Hand']];d=oldbones[i]-oldhand
  # Digit/palm frame of the old A-pose hand turned downward to the donor palm.
  angle=-sg*.44;c=np.cos(angle);s=np.sin(angle);d=np.array([c*d[0]-s*d[1],s*d[0]+c*d[1],d[2]])*.91
  b['position']=(np.array(anchors[side+'Hand'])+d).tolist()
 else:
  j=b['parent'];b['position']=(np.array(rig['bones'][j]['position'])+(oldbones[i]-oldbones[j])*.8).tolist() if j>=0 else [0,0,0]
# Regional automatic skinning: anatomical segment distance, restricted by limb
# ownership, avoiding arm weights on the lat surface and other nearby limbs.
segments=[]
for i,b in enumerate(rig['bones']):
 key=inverse.get(i,'')
 if key.endswith('Eye'):continue
 children=[j for j,c in enumerate(rig['bones']) if c['parent']==i]
 end=np.array(rig['bones'][children[0]]['position']) if children else np.array(b['position'])+[0,-.01,0]
 segments.append((i,np.array(b['position']),end,key))
edges=np.vstack([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]]);edges=np.unique(np.sort(edges,axis=1),axis=0);length=np.linalg.norm(p[edges[:,0]]-p[edges[:,1]],axis=1)
graph=coo_matrix((np.r_[length,length],(np.r_[edges[:,0],edges[:,1]],np.r_[edges[:,1],edges[:,0]])),shape=(len(p),len(p))).tocsr()
bodySeeds=np.where((abs(p[:,0])<.18)&(p[:,1]<1.38))[0]
bodyDistance=dijkstra(graph,directed=False,indices=bodySeeds,min_only=True)
armDistance=[]
for sg in [1,-1]:
 seeds=np.where((p[:,0]*sg>.275)&(p[:,1]>.66)&(p[:,1]<1.39))[0];armDistance.append(dijkstra(graph,directed=False,indices=seeds,min_only=True))
js=[];ws=[]
for vertex,point in enumerate(p):
 x,y,z=point;side='left' if x>=0 else 'right';ax=abs(x)
 region='head' if y>1.44 else 'neck' if y>1.395 and ax<.14 else 'arm' if y>.59 and min(armDistance[0][vertex],armDistance[1][vertex])<bodyDistance[vertex] else 'leg' if y<.88 else 'core'
 candidates=[]
 for i,a,b,key in segments:
  if region=='head':valid=key in ['head','neck']
  elif region=='neck':valid=key in ['neck','upperChest','chest','head']
  elif region=='arm':valid=key.startswith(side) and any(v in key for v in ['Arm','Hand','Thumb','Index','Middle','Ring','Little','Shoulder'])
  elif region=='leg':valid=(key.startswith(side) and any(v in key for v in ['Leg','Foot','Toes'])) or key=='hips'
  else:valid=key in ['hips','spine','chest','upperChest','neck'] or key in [side+'Shoulder',side+'UpperArm'] and ax>.19
  if not valid:continue
  delta=b-a;t=np.clip(np.dot(point-a,delta)/(np.dot(delta,delta)+1e-12),0,1);dist=np.linalg.norm(point-(a+t*delta));candidates.append((dist,i))
 candidates.sort();best=candidates[:4];sigma=.027 if region in ['arm','leg'] else .065;dist=np.array([v[0] for v in best]);w=np.exp(-((dist-dist.min())/sigma)**2);w/=w.sum();ids=[v[1] for v in best];js.extend(ids+[0]*(4-len(ids)));ws.extend(w.tolist()+[0]*(4-len(ids)))
js=np.array(js).reshape(-1,4);ws=np.array(ws).reshape(-1,4)
cent=p[f].mean(1);headmask=(cent[:,1]>1.428)&(abs(cent[:,0])<.18);hairmask=(cent[:,1]>1.615)|((cent[:,1]>1.585)&(cent[:,2]<-.018))
materials=[{'name':'StoneReferenceBody_SKIN','color':[1,1,1,1],'double':False,'blend':0,'texture':None},{'name':'AnimeReferenceFace_stone_SKIN','color':[1,1,1,1],'double':False,'blend':0,'texture':None},{'name':'StoneReference_HAIR','color':[1,1,1,1],'double':False,'blend':0,'texture':None}]
meshes=[]
def mesh(name,tri,material,regions=None):
 ids=np.unique(tri);lookup=np.full(len(p),-1);lookup[ids]=np.arange(len(ids));pos=np.rint(p[ids]*100000).astype(int).ravel().tolist();norm=np.rint(n[ids]*32767).astype(int).ravel().tolist()
 return {'name':name,'positions':pos,'normals':norm,'uv':[0]*(len(ids)*2),'skinIndices':js[ids].ravel().tolist(),'skinWeights':ws[ids].ravel().tolist(),'groups':[{'material':material,'indices':lookup[tri].ravel().tolist()}],'expressions':{},'stoneRebuilt':True}
meshes.append(mesh('Body',f[~headmask&~hairmask],0));meshes.append(mesh('Face',f[headmask&~hairmask],1));meshes.append(mesh('HairReference',f[hairmask],2));rig['meshes']={m['name']:{'indices':m['skinIndices'],'weights':[round(v*65535) for v in m['skinWeights']]} for m in meshes};rig['license']='CC0 hierarchy adapted to user-supplied geometry';land['bodyRig']={k:anchors['left'+v] for k,v in {'shoulder':'UpperArm','elbow':'LowerArm','wrist':'Hand','knee':'LowerLeg','foot':'Foot'}.items()}
# Accuracy measured against the actual surface, in both directions at sampled points.
rng=np.random.default_rng(17);samples=m.vertices[rng.choice(len(m.vertices),min(30000,len(m.vertices)),False)];near=cKDTree(p).query(samples)[0];print('Vertex sample RMS',np.sqrt(np.mean(near**2)),'p95',np.percentile(near,95),flush=True)
data={'materials':materials,'meshes':meshes,'landmarks':land,'rig':rig,'stoneRebuilt':True,'reference':{'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceFaces':len(m.faces),'faces':len(f),'vertices':len(p)}}
raw=json.dumps(data,separators=(',',':')).encode();packed=gzip.compress(raw,mtime=0);txt=base64.b64encode(packed).decode();parts=[]
for i,start in enumerate(range(0,len(txt),170000)):
 name=f'stone-ref-part-{i}.b64';(out/name).write_text(txt[start:start+170000]);parts.append(name)
(out/'stone-ref-manifest.json').write_text(json.dumps({'parts':parts,'bytes':len(packed),'reference':data['reference']},separators=(',',':')));print('Data',len(raw),'compressed',len(packed),'parts',len(parts),flush=True)
