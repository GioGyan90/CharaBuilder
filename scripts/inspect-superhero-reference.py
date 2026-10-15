from pathlib import Path
import json, hashlib
import numpy as np
import trimesh
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/hero-reference'
p=OUT/'quaternius-superhero-male.glb';scene=trimesh.load(p,force='scene',process=False)
report={'source':'https://github.com/programasweights/avatar/blob/main/public/assets/character.glb','author':'Quaternius','license':'CC0-1.0','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'selection':'Raw local mesh coordinates. Head/upper neck study selects triangles with all vertices y > 1.54; this is a spatial crop, not semantic retopology.','meshes':[]}
render=[]
for name,m in scene.geometry.items():
 selected=np.flatnonzero(np.all(m.vertices[m.faces][:,:,1]>1.54,axis=1));faces=m.faces[selected];ids=np.unique(faces)
 report['meshes'].append({'name':name,'vertices':len(m.vertices),'triangles':len(m.faces),'selectedVertices':len(ids),'selectedTriangles':len(faces)})
 if not len(ids):continue
 (OUT/(name.replace('.','_')+'-vertices.json')).write_text(json.dumps({'mesh':name,'vertexIds':ids.tolist(),'positions':m.vertices[ids].tolist(),'originalTriangleIds':selected.tolist(),'trianglesOriginalVertexIds':faces.tolist()},indent=2))
 render.append((name,m.vertices[faces],m.face_normals[selected]))
body=scene.geometry['Sphere.005_Retopology.004'];v=body.vertices
rows=[]
for y in np.linspace(1.61,1.79,19):
 ids=np.flatnonzero((np.abs(v[:,1]-y)<.004)&(np.abs(v[:,0])<.14))
 if len(ids):rows.append({'y':float(y),'count':len(ids),'minX':float(v[ids,0].min()),'maxX':float(v[ids,0].max()),'frontZ':float(v[ids,2].max()),'backZ':float(v[ids,2].min()),'frontVertexId':int(ids[np.argmax(v[ids,2])])})
report['horizontalSections']=rows
report['featureCenters']={}
for name in ['Face','Face.001']:
 m=scene.geometry[name]
 for sign in [-1,1]:
  ids=np.flatnonzero(m.vertices[:,0]*sign>0);report['featureCenters'][name+str(sign)]={'position':m.vertices[ids].mean(axis=0).tolist(),'method':'mean of entire eyebrow/eye component, not anatomical eye corner','vertexCount':len(ids)}
(OUT/'vertex-report.json').write_text(json.dumps(report,indent=2))
fig,axs=plt.subplots(1,2,figsize=(10,6),facecolor='#eeeeee')
for ax,side,title in zip(axs,[False,True],['Front — original geometry','Profile — original geometry']):
 polygons=[];colors=[];depths=[]
 for name,t,n in render:
  coords=np.stack([-t[:,:,2],t[:,:,1]],axis=-1) if side else t[:,:,:2]
  depth=t[:,:,0].mean(axis=1) if side else t[:,:,2].mean(axis=1)
  light=np.array([.5,.5,.8]);light/=np.linalg.norm(light)
  shade=np.clip(.50+.45*(n@light),.20,1)
  base=np.array([.70,.54,.40]) if name.startswith('Sphere') else np.array([.19,.19,.19]) if name=='Face' else np.array([.78,.78,.78])
  polygons.extend(coords);colors.extend(shade[:,None]*base);depths.extend(depth)
 order=np.argsort(depths);pc=PolyCollection(np.array(polygons)[order],facecolors=np.array(colors)[order],edgecolors='none');ax.add_collection(pc);ax.autoscale();ax.set_aspect('equal');ax.set_title(title);ax.axis('off')
fig.tight_layout();fig.savefig(OUT/'head-reference.png',dpi=180);print(json.dumps(report['meshes'],indent=2))

