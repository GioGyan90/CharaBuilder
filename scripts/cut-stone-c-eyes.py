"""Build a local, attribute-preserving C eye cut patch (numpy, shapely >=2.1)."""
import base64,gzip,json,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,Point
from shapely import constrained_delaunay_triangles
root=Path(__file__).resolve().parents[1]
raw=(root/'dist/assets/anime/stone-c-v101.b64').read_bytes()
a=json.loads(gzip.decompress(base64.b64decode(raw)));m=next(m for m in a['meshes'] if m['name']=='Face')
v=np.array(m['positions']).reshape(-1,3)/1e5;faces=np.array(m['groups'][0]['indices']).reshape(-1,3)
guide=json.loads((root/'docs/stone-c-eye-cut-guide.json').read_text());assert hashlib.sha256(raw).hexdigest()==guide['sourceSHA256']
hair=set(json.loads((root/'dist/assets/anime/stone-c-hair.json').read_text())['hairTriangles'])
polys=[Polygon([s['position'][:2] for s in eye['samples']]) for eye in guide['eyes']]
removed=[];added=[];replacement=[];boundary=[{},{}];areaError=0
for ti,ids in enumerate(faces):
 p=v[ids]
 if p[:,2].max()<.055 or p[:,1].max()<1.528 or p[:,1].min()>1.539:continue
 tri=Polygon(p[:,:2]);
 if tri.area<1e-14:continue
 for ei,poly in enumerate(polys):
  if not tri.intersects(poly):continue
  inside=tri.intersection(poly)
  if inside.area<1e-14:continue
  assert ti not in hair,'eye cut touched hair';removed.append(ti)
  remaining=tri.difference(poly);parts=constrained_delaunay_triangles(remaining);areaError=max(areaError,abs(sum(t.area for t in parts.geoms)+inside.area-tri.area))
  matrix=np.vstack([p[:,:2].T,np.ones(3)])
  for t in parts.geoms:
   coords=list(t.exterior.coords)[:3]
   # Preserve the source triangle winding, including mirrored UV islands.
   if np.linalg.det(np.c_[np.array(coords)[1]-coords[0],np.array(coords)[2]-coords[0]])*np.linalg.det(matrix)<0:coords.reverse()
   out=[]
   for xy in coords:
    w=np.linalg.solve(matrix,[*xy,1]);point=w@p;out.append(len(v)+len(added));added.append({'sourceVertexIds':ids.tolist(),'barycentric':w.tolist()})
    if poly.boundary.distance(Point(xy))<1e-10:
     key=tuple(np.round(xy,10));old=boundary[ei].get(key)
     if old is None or point[2]>old[2]:boundary[ei][key]=point.tolist()
   replacement.extend(out)
  break
sockets=[]
for eye,poly,points in zip(guide['eyes'],polys,boundary):
 ring=sorted(points.values(),key=lambda p:poly.exterior.project(Point(p[:2])))
 assert len(ring)>96
 sockets.append({'side':eye['side'],'rim':ring,'center':[eye['side']*.032,1.533,.0550 if eye['side']<0 else .0563],'radius':.022})
patch={'version':103,'sourceSHA256':hashlib.sha256(raw).hexdigest(),'originalTriangles':len(faces),'removedTriangles':removed,'addedVertices':added,'replacementIndices':replacement,'sockets':sockets,'maxAreaConservationError':areaError}
assert areaError<1e-12
(root/'dist/assets/anime/stone-c-eyes-v103.json').write_text(json.dumps(patch,separators=(',',':'))+'\n')
print(json.dumps({'removedTriangles':len(removed),'replacementTriangles':len(replacement)//3,'addedVertices':len(added),'rimVertices':[len(s['rim']) for s in sockets],'areaError':areaError}))
