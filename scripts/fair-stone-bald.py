"""Local shoulder/neck fairing and a bald scalp, from the reviewed v46 surface."""
from pathlib import Path
import numpy as np,trimesh,json,gzip,base64,sys,hashlib
from scipy.sparse import coo_matrix,diags
root=Path(__file__).resolve().parents[1];out=root/'dist/assets/anime'
manifest=json.loads((out/'stone-ref-manifest.json').read_text());checkpoint=root/'scripts/stone-bald-v46.json.gz'
if not checkpoint.exists():checkpoint.write_bytes(base64.b64decode(''.join((out/p).read_text() for p in manifest['parts'])))
data=json.loads(gzip.decompress(checkpoint.read_bytes()));roundNumber=int(sys.argv[1]) if len(sys.argv)>1 else 2
meshes=data['meshes'][:2];raw=np.concatenate([np.array(m['positions']).reshape(-1,3) for m in meshes]);vertices,inverse=np.unique(raw,axis=0,return_inverse=True);p=vertices.astype(float)/1e5
faces=[];offset=0
for m in meshes:
 faces.extend(inverse[np.array(m['groups'][0]['indices']).reshape(-1,3)+offset]);offset+=len(m['positions'])//3
faces=np.array(faces);edges=np.concatenate([faces[:,[0,1]],faces[:,[1,2]],faces[:,[2,0]]]);edges=np.unique(np.sort(edges,axis=1),axis=0);e=np.concatenate([edges,edges[:,::-1]])
a=coo_matrix((np.ones(len(e)),(e[:,0],e[:,1])),shape=(len(p),len(p))).tocsr();a=diags(1/np.asarray(a.sum(axis=1)).ravel())@a
smooth=lambda t:np.clip(t,0,1)**2*(3-2*np.clip(t,0,1))
x=np.abs(p[:,0]);y=p[:,1];z=p[:,2]
shoulder=smooth((x-.14)/.035)*(1-smooth((x-.25)/.04))*smooth((y-1.255)/.075)*(1-smooth((y-1.39)/.03))
neck=smooth((x-.035)/.025)*(1-smooth((x-.105)/.035))*smooth((y-1.37)/.045)*(1-smooth((y-1.455)/.05))
scalp=smooth((y-1.535)/.055)
scalp=np.maximum(scalp,smooth((x-.07)/.025)*smooth((y-1.525)/.04))
scalp*=1-smooth((x-.13)/.035)
mask=np.maximum.reduce([shoulder*.85,neck*.80,scalp*.70])
q=p.copy();q[:,1]-=(.006 if roundNumber==1 else .009)*shoulder
# Alternating diffusion reduces scan lumps without rounding off the entire face.
for _ in range(12 if roundNumber==1 else 16):
 q+=(a@q-q)*(.48*mask[:,None]);q+=(a@q-q)*(-.43*mask[:,None])
if roundNumber==2:
 q[:,0]*=1-.08*scalp
 q[:,2]=data['landmarks']['head'][2]+(q[:,2]-data['landmarks']['head'][2])*(1-.045*scalp)
delta=np.linalg.norm(q-p,axis=1);assert delta.max()<.030
q=np.rint(q*1e5)/1e5
surface=trimesh.Trimesh(q,faces,process=False);assert surface.is_watertight and surface.is_winding_consistent and surface.volume>0
norm=surface.vertex_normals;offset=0
for m in meshes:
 count=len(m['positions'])//3;ids=inverse[offset:offset+count];m['positions']=np.rint(q[ids]*1e5).astype(int).ravel().tolist();m['normals']=np.rint(norm[ids]*32767).astype(int).ravel().tolist();offset+=count
data['reference']['baldFairing']={'round':roundNumber,'cycles':12 if roundNumber==1 else 16,'maxDisplacement':float(delta.max()),'maxShoulderDrop':.006 if roundNumber==1 else .009,'protectedLowerBodySha256':hashlib.sha256(json.dumps([int(v) for row in raw if row[1]<=125000 for v in row],separators=(',',':')).encode()).hexdigest()}
data['reference']['surfaceRepair']['positiveVolume']=float(surface.volume)
packed=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0);txt=base64.b64encode(packed).decode();parts=[]
for i,start in enumerate(range(0,len(txt),170000)):
 name=f'stone-ref-part-{i}.b64';(out/name).write_text(txt[start:start+170000]);parts.append(name)
(out/'stone-ref-manifest.json').write_text(json.dumps({'parts':parts,'bytes':len(packed),'reference':data['reference']},separators=(',',':')))
print(data['reference']['baldFairing'])
