"""Convert authored head sources to quantized JS mesh arrays (no runtime glTF).
Usage: PYTHONPATH=... python scripts/prepare-authored-faces.py female.blend z4.png male.zip
Requires numpy, pillow and blender-asset-tracer. Preserve topology, triangulate polygons.
"""
from pathlib import Path
import sys,json,gzip,base64,hashlib,struct
from zipfile import ZipFile
import numpy as np
from PIL import Image
from blender_asset_tracer import blendfile
out=Path(__file__).resolve().parents[1]/'dist/assets/anime'
def mesh(points,indices,uv=None):
 p=np.array(points);idx=np.array(indices).reshape(-1,3);n=np.zeros_like(p)
 for tri in idx:
  normal=np.cross(p[tri[1]]-p[tri[0]],p[tri[2]]-p[tri[0]])
  for i in tri:n[i]+=normal
 n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12)
 return dict(name='Face',positions=np.rint(p.flatten()*1e5).astype(int).tolist(),normals=np.rint(n.flatten()*32767).astype(int).tolist(),uv=np.rint(np.array(uv if uv is not None else np.zeros((len(p),2))).flatten()*65535).astype(int).tolist(),groups=[dict(material=0,indices=np.array(indices).astype(int).tolist())],expressions={})
def material(name,texture=None):return dict(name=name,color=[1,1,1,1],texture=texture,double=True,blend=0)
def save(id,data,path,url,author,license):
 raw=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0);encoded=base64.b64encode(raw).decode();parts=[]
 for i in range(0,len(encoded),48000):
  part=f'{id}-{i//48000}.b64';(out/part).write_text(encoded[i:i+48000]);parts.append(part)
 manifest=dict(parts=parts,bytes=len(raw),source=url,author=author,license=license,sourceSha256=hashlib.sha256(Path(path).read_bytes()).hexdigest(),triangles=sum(len(g['indices'])//3 for m in data['meshes'] for g in m['groups']),adaptation='Author topology retained; polygon triangulation, coordinate conversion and quantization. Runtime head fitting and neck blending; no source hair/body.')
 (out/(id+'-manifest.json')).write_text(json.dumps(manifest,indent=2)+'\n');print(id,manifest['triangles'],len(raw))
path=Path(sys.argv[1]);b=blendfile.BlendFile(path);meshes=[]
for name in [b'OBFACE_Cube.002',b'OBFACE.001_Cube.001']:
 obj=next(o for o in b.code_index[b'OB'] if o.get((b'id',b'name'))==name);me=obj.get_pointer(b'data');v=me.get_pointer(b'mvert');loops=me.get_pointer(b'mloop');polys=me.get_pointer(b'mpoly');tex=me.get_pointer((b'ldata',b'layers')).get_pointer(b'data');raw=np.array([v.get(b'co',array_index=i) for i in range(me.get(b'totvert'))]);p=[];uv=[];ids=[]
 matrix=np.array(obj.get(b'obmat')).reshape(4,4).T;axes=np.array([[1,0,0],[0,0,1],[0,-1,0]])
 for j in range(me.get(b'totpoly')):
  start=polys.get(b'loopstart',array_index=j);count=polys.get(b'totloop',array_index=j);offset=len(p)
  for k in range(start,start+count):
   vid=loops.get(b'v',array_index=k);p.append(axes@(matrix@np.append(raw[vid],1))[:3]);u,w=tex.get(b'uv',array_index=k) if tex else (0,0);uv.append([u,1-w])
  for k in range(1,count-1):ids.extend([offset,offset+k,offset+k+1])
 m=mesh(p,ids,uv);m['groups'][0]['material']=len(meshes);meshes.append(m)
p=np.array(meshes[1]['positions']).reshape(-1,3)/1e5;eyeY=float(p[:,1].mean());eyeX=float(p[p[:,0]>0,0].mean());eyeZ=float(p[:,2].mean())
# Neutralize baked skin hue; preserve authored painted eyelids and lips. Eye
# atlas remains grayscale and its iris is recolored in the runtime shader.
image=Image.open(sys.argv[2]).convert('RGB');a=np.asarray(image).astype(float)/255;gray=a@np.array([.299,.587,.114]);neutral=np.clip(gray/.75,0,1);Image.fromarray(np.uint8(neutral*255)).save(out/'femalehead-skin.png');Image.fromarray(np.uint8(gray*255)).save(out/'femalehead-eye.png')
data=dict(meshes=meshes,materials=[material('AuthoredFace_Female_SKIN','femalehead-skin.png'),material('AuthoredEyeIris_Female','femalehead-eye.png')],landmarks=dict(head=[0,0,0],neck=[0,0,0],leftEye=[eyeX,eyeY,eyeZ],rightEye=[-eyeX,eyeY,eyeZ]))
save('femalehead',data,path,'https://opengameart.org/content/face-base-woman','byzmod3d','CC0-1.0');b.close()
path=Path(sys.argv[3])
with ZipFile(path) as z:g=json.loads(z.read('scene.gltf'));binary=z.read('scene.bin')
def accessor(id):
 a=g['accessors'][id];v=g['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']];fmt={5126:'f',5125:'I'}[a['componentType']];offset=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',n*4)
 return np.array([struct.unpack_from('<'+fmt*n,binary,offset+i*stride) for i in range(a['count'])])
meshes=[]
for i,m in enumerate(g['meshes']):
 p=m['primitives'][0];points=accessor(p['attributes']['POSITION']);points=points[:,[0,2,1]]*np.array([1,-1,1]);m=mesh(points,accessor(p['indices']).flatten());m['groups'][0]['material']=i;meshes.append(m)
p=np.array(meshes[1]['positions']).reshape(-1,3)/1e5;eyeY=float(p[:,1].mean());eyeX=float(p[p[:,0]>0,0].mean());eyeZ=float(p[:,2].max())
data=dict(meshes=meshes,materials=[material('AuthoredFace_Male_SKIN'),material('AuthoredEyeWhite_Male')],landmarks=dict(head=[0,0,0],neck=[0,0,0],leftEye=[eyeX,eyeY,eyeZ],rightEye=[-eyeX,eyeY,eyeZ]))
save('malehead',data,path,'https://sketchfab.com/3d-models/male-head-base-mesh-6a480c4603cd4768b615393e93dbd7d0','DEGUIDER','CC-BY-4.0')
