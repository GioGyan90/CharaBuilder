"""Recover CC0 beta source skin weights and relaxed-rest skeleton, without rebaking meshes."""
import sys,json,gzip,base64
from pathlib import Path
import numpy as np
source=Path(__file__).with_name('prepare-vroid.py').read_text()
setup=source[source.index(' raw='):source.index(" result=")]
for sex in ['female','male']:
 env={'sys':sys,'Path':Path,'np':np,'json':json,'struct':__import__('struct'),'math':__import__('math'),'sex':sex}
 exec('if True:\n'+setup,env)
 j=env['j'];world=env['world'];accessor=env['accessor'];parents=env['parents'];human=env['bones']
 nodes=sorted(set(k for skin in j['skins'] for k in skin['joints']))
 lookup={n:i for i,n in enumerate(nodes)}
 rig={'license':'CC0','bones':[],'humanoid':{name:lookup[node] for name,node in human.items() if node in lookup},'meshes':{}}
 for n in nodes:
  parent=parents.get(n)
  while parent is not None and parent not in lookup:parent=parents.get(parent)
  rig['bones'].append({'name':j['nodes'][n].get('name','bone'),'parent':lookup.get(parent,-1),'position':(world(n,True)[:3,3]*[-1,1,-1]).tolist()})
 for node in j['nodes']:
  if 'mesh' not in node:continue
  attrs=j['meshes'][node['mesh']]['primitives'][0]['attributes'];skin=j['skins'][node['skin']]
  indices=accessor(attrs['JOINTS_0']).astype(int);indices=np.array([lookup[k] for k in skin['joints']])[indices]
  weights=np.round(accessor(attrs['WEIGHTS_0'])*65535).astype(int)
  rig['meshes'][node['name']]={'indices':indices.ravel().tolist(),'weights':weights.ravel().tolist()}
 out=Path(__file__).resolve().parents[1]/'dist/assets/anime'/f'{sex}-rig.b64'
 out.write_text(base64.b64encode(gzip.compress(json.dumps(rig,separators=(',',':')).encode(),mtime=0)).decode())
 print(sex,len(nodes),'bones',out.stat().st_size,'bytes')
