"""Fit modular CC0 hair to each supported outfit; store only moved vertices.
Run after prepare-vroid.py. Coordinates are the shared baked base skeleton.
"""
import base64,gzip,json
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]/'dist/assets/anime'
def read(key):
 m=json.loads((ROOT/(key+'-manifest.json')).read_text());return json.loads(gzip.decompress(base64.b64decode(''.join((ROOT/p).read_text() for p in m['parts']))))
def write(key,data):
 raw=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0);s=base64.b64encode(raw).decode();parts=[]
 for start in range(0,len(s),160000):
  path=f'{key}-{start//160000}.b64';(ROOT/path).write_text(s[start:start+160000]);parts.append(path)
 (ROOT/(key+'-manifest.json')).write_text(json.dumps({'parts':parts,'bytes':len(raw)},indent=2))
assets={key:read(key) for key in ['female','male','bob','long','uniform','classic']}
for key in ['bob','long','uniform','classic']:
 sex='male' if key=='uniform' else 'female';base=assets[sex];outfits=[sex,'uniform'] if sex=='male' else [sex,'long','classic']
 for mesh in assets[key]['meshes']:
  groups=[g for g in mesh['groups'] if '_HAIR' in assets[key]['materials'][g['material']]['name']]
  if not groups:continue
  vertices=np.unique(np.concatenate([g['indices'] for g in groups]));original=np.array(mesh['positions']).reshape(-1,3)/100000;mesh['fits']={}
  for outfit in outfits:
   collision=[]
   for owner,name in [(assets[outfit],'Body'),(base,'Face')]:
    source=next(m for m in owner['meshes'] if m['name']==name);p=np.array(source['positions']).reshape(-1,3)/100000
    parts=[]
    for g in source['groups']:
     material=owner['materials'][g['material']]['name'];triangles=np.array(g['indices']).reshape(-1,3)
     if mesh['name']=='Body':
      # The scalp cap follows skin; clothes can naturally occlude its embedded roots.
      if '_SKIN' in material:parts.append(p[triangles])
     else:
      # Preserve intentionally embedded strand roots. Fit visible lengths to garments and lower skin.
      if name=='Body' and '_CLOTH' in material:parts.append(p[triangles])
      elif name=='Body' and '_SKIN' in material:
       triangles=triangles[p[triangles][:,:,1].max(axis=1)<base['landmarks']['neck'][1]-.025];parts.append(p[triangles])
    if parts:collision.append(np.concatenate(parts))
   tri=np.concatenate(collision);lo=tri[:,:,1].min(axis=1);hi=tri[:,:,1].max(axis=1);a=tri[:,0];e1=tri[:,1]-a;e2=tri[:,2]-a;p=original.copy();changed=[]
   for vertex in vertices:
    x,y,z=p[vertex];center=np.array([0,y,base['landmarks']['head'][2]*np.clip((y-1.1)/.3,0,1)]);direction=np.array([x,0,z-center[2]]);radius=np.linalg.norm(direction)
    if radius<1e-7:continue
    direction/=radius;origin=center+direction*.8;d=-direction;active=(lo<=y)&(hi>=y)
    if not active.any():continue
    av=a[active];u=e1[active];v=e2[active];h=np.cross(d,v);det=np.einsum('ij,ij->i',u,h);valid=np.abs(det)>1e-9;inv=np.zeros_like(det);inv[valid]=1/det[valid];s=origin-av;baryU=np.einsum('ij,ij->i',s,h)*inv;q=np.cross(s,u);baryV=q@d*inv;t=np.einsum('ij,ij->i',v,q)*inv;valid &= (baryU>=0)&(baryV>=0)&(baryU+baryV<=1)&(t>=0)&(t<.8)
    if valid.any():
     bound=.8-t[valid].min()+.0035
     if radius<bound:
      p[vertex]=center+direction*bound;changed.append(int(vertex))
   mesh['fits'][outfit]={'indices':changed,'positions':np.round(p[changed]*100000).astype(int).ravel().tolist()}
   print(key,mesh['name'],outfit,'adjusted',len(changed),'max displacement',round(float(np.linalg.norm(p-original,axis=1).max()),4))
 write(key,assets[key])
