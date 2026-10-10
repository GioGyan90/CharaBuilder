"""Recover original CC0 trouser skinning, preserving existing compact vertex IDs.
Usage: python scripts/prepare-pants-skin.py /path/to/Sakurada_Fumiriya.vrm
No source model is shipped. Requires numpy.
"""
from pathlib import Path
import sys,struct,json,base64,gzip,hashlib
import numpy as np
raw=Path(sys.argv[1]).read_bytes();size=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+size]);buf=raw[28+size:]
assert j['extensions']['VRM']['meta']['licenseName']=='CC0'
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dt=np.dtype({5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]);w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];return np.ndarray((a['count'],w),dtype=dt,buffer=buf,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*w),dt.itemsize)).copy()
node=next(n for n in j['nodes'] if n.get('name')=='Body');mesh=j['meshes'][node['mesh']];attrs=mesh['primitives'][0]['attributes'];used=np.unique(np.concatenate([acc(p['indices']).ravel() for p in mesh['primitives']]));lookup={int(v):i for i,v in enumerate(used)}
root=Path(__file__).resolve().parents[1]/'dist/assets/anime';manifest=json.loads((root/'uniform-manifest.json').read_text());data=json.loads(gzip.decompress(base64.b64decode(''.join((root/f).read_text() for f in manifest['parts']))));compact=next(m for m in data['meshes'] if m['name']=='Body')
assert len(used)*3==len(compact['positions'])
assert np.array_equal(np.round(acc(attrs['TEXCOORD_0'])[used]*65535).astype(int).ravel(),compact['uv']), 'compact vertex mapping drift'
pants=np.unique(np.concatenate([acc(p['indices']).ravel() for p in mesh['primitives'] if 'Bottoms' in j['materials'][p['material']]['name']]))
joints=j['skins'][node['skin']]['joints'];indices=acc(attrs['JOINTS_0']);weights=acc(attrs['WEIGHTS_0']);names=[];rows=[]
for i in pants:
 row=[lookup[int(i)]]
 js=[j['nodes'][joints[int(v)]]['name'] for v in indices[i]]
 for name in js:
  if name not in names:names.append(name)
 row += [names.index(name) for name in js]
 row += np.round(weights[i]*65535).astype(int).tolist();rows.append(row)
result={'license':'CC0','source':'Sakurada_Fumiriya beta','sha256':hashlib.sha256(raw).hexdigest(),'vertexCount':len(used),'names':names,'rows':rows}
(root/'pants-skin.js').write_text('// Original CC0 author trouser weights; compact UV mapping verified.\nexport default '+json.dumps(result,separators=(',',':'))+';\n')
print('Original pants weights:',len(rows),'vertices',len(names),'bones')
