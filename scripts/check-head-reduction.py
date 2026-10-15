"""Deterministic sampled surface-distance comparison, not an exact Hausdorff bound."""
from pathlib import Path
import base64,gzip,json,subprocess
import numpy as np
import trimesh
from scipy.spatial import cKDTree
ROOT=Path(__file__).resolve().parents[1]
def decode(data):
    data=json.loads(gzip.decompress(base64.b64decode(data)))
    mesh=next(m for m in data['meshes'] if m['name']=='Face')
    return trimesh.Trimesh(np.array(mesh['positions']).reshape(-1,3)/1e5,np.concatenate([g['indices'] for g in mesh['groups']]).reshape(-1,3),process=False)
before=decode(subprocess.check_output(['git','show','5c1d330:dist/assets/anime/imported-00003.b64'],cwd=ROOT))
after=decode((ROOT/'dist/assets/anime/imported-00003.b64').read_bytes())
def distance(source,target):
    samples,_=trimesh.sample.sample_surface(source,12000,seed=61)
    points=np.vstack([source.vertices,samples]);tree=cKDTree(target.triangles_center)
    _,ids=tree.query(points,k=128)
    candidates=target.triangles[ids.ravel()]
    nearest=trimesh.triangles.closest_point(candidates,np.repeat(points,128,axis=0))
    distances=np.linalg.norm(nearest-np.repeat(points,128,axis=0),axis=1).reshape(-1,128).min(axis=1)
    # Long thin collar/ear triangles can have distant centroids. Resolve every
    # apparent outlier against all triangles so the reported maximum is useful.
    for i in np.flatnonzero(distances>.001):
        closest=trimesh.triangles.closest_point(target.triangles,np.tile(points[i],(len(target.faces),1)))
        distances[i]=np.linalg.norm(closest-points[i],axis=1).min()
    return points,distances
report={'beforeTriangles':len(before.faces),'afterTriangles':len(after.faces),'reductionPercent':round((1-len(after.faces)/len(before.faces))*100,2),'method':'12,000 seeded surface samples plus vertices each way; nearest of 128 triangle-centroid candidates with exhaustive outlier refinement; runtime model units'}
for label,source,target in [('beforeToAfter',before,after),('afterToBefore',after,before)]:
    p,d=distance(source,target)
    # Donor face above collar, in front of the ears, below the reconstructed crown.
    feature=(p[:,2]>.04)&(p[:,1]>1.495)&(p[:,1]<1.62)
    report[label]={'p95':float(np.percentile(d,95)),'max':float(d.max()),'featureP95':float(np.percentile(d[feature],95)),'featureMax':float(d[feature].max())}
    assert report[label]['featureP95']<.0015,'feature surface error exceeds budget'
    assert report[label]['featureMax']<.005,'local feature deviation exceeds budget'
out=ROOT/'artifacts/import-00003/reduction-report.json';out.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
