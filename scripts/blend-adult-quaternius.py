"""Conservative adult-only structural blend; keeps Stone topology and protected features."""
from pathlib import Path
import json,gzip,base64,hashlib
import numpy as np,trimesh
from scipy.spatial import cKDTree
R=Path(__file__).resolve().parents[1];A=R/'dist/assets/anime';O=R/'artifacts/adult-blend-v81';O.mkdir(exist_ok=True)
source=json.loads(gzip.decompress(base64.b64decode((A/'adult-male-v80.b64').read_text())))
mesh=source['meshes'][0];v=np.array(mesh['positions']).reshape(-1,3)/1e5;f=np.array(mesh['groups'][0]['indices']).reshape(-1,3)
qpath=R/'artifacts/hero-reference/quaternius-superhero-male.glb';scene=trimesh.load(qpath,force='scene',process=False)
q=np.array(scene.geometry['Sphere.005_Retopology.004'].vertices);qe=scene.geometry['Face.001'].vertices
rig=source['landmarks']['faceRig'];eye=np.mean(rig['eyes'],axis=0);qeye=qe.mean(axis=0)
# Uniform scale from paired eye-component centres; translation from their midpoint.
span=np.linalg.norm(np.array(rig['eyes'][1])-rig['eyes'][0]);qspan=abs(qe[qe[:,0]>0,0].mean()-qe[qe[:,0]<0,0].mean());scale=span/qspan
q=(q-qeye)*scale+eye;q=q[q[:,1]>rig['neckY']-.02]
tree=cKDTree(q);dist,ids=tree.query(v,k=12);weights=1/(dist+.003)**2;target=(q[ids]*weights[:,:,None]).sum(1)/weights.sum(1)[:,None]
def smooth(a,b,x):
 t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
def bell(x,c,r):return np.exp(-((x-c)/r)**2)
x,y,z=v.T;ax=abs(x-eye[0]);front=smooth(-.015,.045,z)
cheek=bell(y,eye[1]-.050,.032)*smooth(.014,.040,ax)*front
jaw=bell(y,rig['chin']+.033,.025)*smooth(.014,.040,ax)*smooth(-.025,.025,z)
# Upper neck only: the actual collar and seam ring stay bit-identical.
neck=bell(y,rig['chin']-.016,.030)*smooth(rig['neckY']+.016,rig['neckY']+.055,y)*.30
weight=.28*np.maximum.reduce([cheek,jaw,neck])
# Protect orbital and oral surfaces and ears; no texture/feature mesh mismatch.
protect=np.zeros(len(v))
for e in rig['eyes']:protect=np.maximum(protect,bell(x,e[0],.019)*bell(y,e[1],.019))
protect=np.maximum(protect,bell(x,eye[0],.027)*bell(y,rig['mouth'][1],.018))
protect=np.maximum(protect,bell(x,eye[0],.022)*bell(y,rig['nose'][1],.023))
weight*=1-smooth(.15,.70,protect)
weight*=1-smooth(.055,.073,ax)*(1-smooth(.025,.055,z))
weight*=smooth(rig['neckY']+.016,rig['neckY']+.045,y)
delta=(target-v)*weight[:,None];delta[:,1]*=.35
# A blend must not displace coarse triangles enough to fold them.
length=np.linalg.norm(delta,axis=1);delta*=np.minimum(1,.0035/np.maximum(length,1e-12))[:,None]
new=np.round((v+delta)*1e5)/1e5
oldMesh=trimesh.Trimesh(v,f,process=False);newMesh=trimesh.Trimesh(new,f,process=False)
assert np.isfinite(new).all();dots=(oldMesh.face_normals*newMesh.face_normals).sum(1)[oldMesh.area_faces>1e-10];assert dots.min()>.3
collar=y<rig['neckY']+.016;assert np.array_equal(new[collar],v[collar])
mesh['positions']=np.rint(new*1e5).astype(int).ravel().tolist();mesh['normals']=np.rint(newMesh.vertex_normals*32767).astype(int).ravel().tolist()
source['reference'].update(revision=81,secondaryReference='Quaternius Superhero Male / CC0-1.0',secondarySHA256=hashlib.sha256(qpath.read_bytes()).hexdigest(),blend='Up to 28% local nearest-surface support; eye, nose, mouth, ear protection; collar pinned; displacement capped at 0.0035. Same Stone topology.')
raw=gzip.compress(json.dumps(source,separators=(',',':')).encode(),mtime=0);(A/'adult-male-v81.b64').write_text(base64.b64encode(raw).decode());(A/'adult-male-manifest.json').write_text(json.dumps({'parts':['adult-male-v81.b64'],'bytes':len(raw),'reference':source['reference']},indent=2))
report={'scale':scale,'vertices':len(v),'triangles':len(f),'movedVertices':int((np.linalg.norm(new-v,axis=1)>1e-6).sum()),'maxDisplacement':float(np.linalg.norm(new-v,axis=1).max()),'minimumNormalDot':float(dots.min()),'pinnedCollarVertices':int(collar.sum()),'meanDisplacement':float(np.linalg.norm(new-v,axis=1).mean())};(O/'report.json').write_text(json.dumps(report,indent=2));print(report)

