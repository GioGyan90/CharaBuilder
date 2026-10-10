"""Convert culturalibre Hair06 (CC0) authored polygons to JS vertex data.
Usage: python scripts/prepare-culturalibre-hair.py /path/to/source-directory
Public source https://www.makehumancommunity.org/node/2479
The GLB is only a build input. Runtime uses gzip JSON vertex arrays, never GLB.
"""
import json,struct,gzip,base64,hashlib,sys
from pathlib import Path
import numpy as np
from PIL import Image
src=Path(sys.argv[1]);out=Path(__file__).resolve().parents[1]/'dist/assets/anime';raw=(src/'culturalibre_hair_06.glb').read_bytes();length=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+length]);binary=raw[28+length:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];size=np.dtype(dt).itemsize
 return np.ndarray((a['count'],w),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',w*size),size)).copy()
prim=j['meshes'][0]['primitives'][0];a=prim['attributes'];p=acc(a['POSITION']);n=acc(a['NORMAL']);uv=acc(a['TEXCOORD_0']);idx=acc(prim['indices']).ravel()
# Affine fit into the existing authored-hair canonical frame. Preserve all
# authored vertices, polygons, UV islands, tips, asymmetry and smooth normals.
scales=np.array([1.15/.0095,1.28/.0103,.95/.0093]);p=(p-np.array([0,1.565,.04]))*scales+np.array([0,14,3]);n=n/scales;n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-10)
im=Image.open(src/'culturalibre_hair_06_pink.png').convert('RGBA');im.thumbnail((512,512));alpha=im.getchannel('A');gray=im.convert('L');Image.merge('RGBA',(gray,gray,gray,alpha)).save(out/'layered06-hair.png',optimize=True)
d={'landmarks':{'head':[0,14,3],'leftEye':[-2.5,14,14],'rightEye':[2.5,14,14],'neck':[0,0,0]},'materials':[{'name':'Culturalibre_Layered06_HAIR','color':[1,1,1,1],'double':True,'blend':2,'texture':'layered06-hair.png'}],'meshes':[{'name':'AuthoredHair','positions':np.round(p*100000).astype(int).ravel().tolist(),'normals':np.round(n*32767).astype(int).ravel().tolist(),'uv':np.round(uv*65535).astype(int).ravel().tolist(),'groups':[{'material':0,'indices':idx.tolist()}],'expressions':{},'sourceVertexIds':list(range(len(p)))}]}
data=gzip.compress(json.dumps(d,separators=(',',':')).encode(),mtime=0);encoded=base64.b64encode(data).decode();parts=[]
for start in range(0,len(encoded),160000):
 name='layered06-'+str(start//160000)+'.b64';(out/name).write_text(encoded[start:start+160000]);parts.append(name)
m={'parts':parts,'bytes':len(data),'author':'culturalibre','license':'CC0-1.0','source':'https://www.makehumancommunity.org/node/2479','licenseSource':'https://static.makehumancommunity.org/assets/assetpacks/hair01.html','downloadMirror':'https://github.com/beepobb/immersive-vr/blob/b761d0efa3f7fe487285c04fb01c6ff552586269/assets/Hair/culturalibre_hair_06.glb','sourceSha256':hashlib.sha256(raw).hexdigest(),'sourceVertices':len(p),'triangles':len(idx)//3,'transform':'Affine head fit, authored polygons/UVs retained; tint-neutral texture; no generated locks.'}
(out/'layered06-manifest.json').write_text(json.dumps(m,indent=2)+'\n');print(m)
