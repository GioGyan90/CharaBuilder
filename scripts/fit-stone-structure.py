from pathlib import Path
import json
import numpy as np,trimesh
from scipy.spatial import cKDTree
from scipy.optimize import lsq_linear
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
R=Path(__file__).resolve().parents[1];O=R/'artifacts/stone-fit-v79'
r=json.loads((O/'runtime.json').read_text());ref=json.loads((R/'dist/assets/anime/donor-face-measurements.json').read_text());pts={k:np.array(v['position']) for k,v in ref['points'].items()}
v=trimesh.load('G:/AI Painting/ComfyUI-aki/ComfyUI-aki-v2/ComfyUI/output/mesh/ComfyUI_00003_.glb',force='mesh',process=False).vertices
srcEye=(pts['eyeLeft']+pts['eyeRight'])/2;eye=np.mean(r['anchors']['eyes'],axis=0);mouth=np.array(r['anchors']['mouth']);scale=(eye[1]-mouth[1])/(srcEye[1]-pts['mouth'][1]);t=eye-srcEye*scale;v=v*scale+t
cur=np.array(r['current']);faces=np.array(r['faces']).reshape(-1,3)
# Inspect only the facial region below the brows, in front of the ears.
mask=(v[:,1]>pts['chin'][1]*scale+t[1]-.027)&(v[:,1]<eye[1]+.016)&(v[:,2]>.12*scale+t[2])&(abs(v[:,0]-eye[0])<.34*scale)
donor=v[mask];np.save(O/'donor-aligned.npy',donor)
fig,axs=plt.subplots(1,2,figsize=(10,6))
for ax,side in zip(axs,[False,True]):
 a=2 if side else 0
 ax.scatter(donor[::12,a],donor[::12,1],s=.4,c='#778899',alpha=.3,label='Stone GLB')
 ax.triplot(cur[:,a],cur[:,1],faces,color='#c25229',lw=.3,label='Current')
 ax.set_aspect('equal');ax.legend();ax.set_ylim(mouth[1]-.065,eye[1]+.025)
fig.tight_layout();fig.savefig(O/'before-overlay.png',dpi=140)
print({'scale':scale,'eye':eye.tolist(),'donorChin':(pts['chin']*scale+t).tolist(),'currentBounds':[cur.min(0).tolist(),cur.max(0).tolist()]})

# Conservative parameter-only fit. Correspondences are geometric nearest points,
# not claims of exact semantic anatomy; visual review remains necessary.
sel=(cur[:,1]<eye[1]-.010)&(cur[:,1]>mouth[1]-.060)&(cur[:,2]>.060)&(abs(cur[:,0]-eye[0])<.076)
idx=np.flatnonzero(sel);tree=cKDTree(donor);keys=r['keys'];J=np.stack([np.array(r['derivatives'][k])[idx] for k in keys],axis=-1)
base=cur[idx];delta=np.zeros(len(keys));lo=np.array([max(5-r['state'][k],-45) for k in keys]);hi=np.array([min(105-r['state'][k],45) for k in keys])
for iteration in range(12):
 pred=base+np.einsum('ijk,k->ij',J,delta);dist,nn=tree.query(pred);target=donor[nn]
 # Penalize large parameter departures; down-weight noisy scan areas.
 weights=np.minimum(1,.012/np.maximum(dist,1e-6))[:,None]*np.array([1.5,1,1])
 A=(J*weights[:,:,None]).reshape(-1,len(keys));b=((target-base)*weights).ravel()
 reg=np.eye(len(keys))*.00012
 delta=lsq_linear(np.vstack([A,reg]),np.r_[b,np.zeros(len(keys))],bounds=(lo,hi),tol=1e-10).x
candidate={k:round(float(r['state'][k]+delta[i])) for i,k in enumerate(keys)}
(O/'automatic-candidate.json').write_text(json.dumps(candidate,indent=2))
report={'method':'Eye/mouth vertical uniform registration; regularized nearest-surface fit of lower-face skin, then visual review. Not anatomical ground truth.','scale':float(scale),'translation':t.tolist(),'sampleVertices':len(idx),'beforeMeanDistance':float(tree.query(base)[0].mean()),'linearCandidateMeanDistance':float(tree.query(base+np.einsum('ijk,k->ij',J,delta))[0].mean()),'automaticParameters':candidate}
if r.get('candidate') is not None:
 report['reviewedParameters']=json.loads((O/'reviewed-candidate.json').read_text());fitted=np.array(r['candidate']);report['actualCandidateMeanDistance']=float(tree.query(fitted[idx])[0].mean())
 fig,axs=plt.subplots(1,2,figsize=(10,6))
 for ax,side in zip(axs,[False,True]):
  a=2 if side else 0
  ax.scatter(donor[::8,a],donor[::8,1],s=.5,c='#687c91',alpha=.35,label='Stone GLB')
  ax.triplot(fitted[:,a],fitted[:,1],faces,color='#c25229',lw=.35,label='Fitted base')
  ax.set_aspect('equal');ax.set_ylim(mouth[1]-.065,eye[1]+.025);ax.legend()
 fig.tight_layout();fig.savefig(O/'after-overlay.png',dpi=140)
(O/'fit-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
