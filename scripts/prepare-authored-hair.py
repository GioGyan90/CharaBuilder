"""Convert Micket's CC0 .blend meshes to the existing JS mesh-data format.
Usage: pip install blender-asset-tracer numpy pillow
       python scripts/prepare-authored-hair.py /path/to/source-directory
Expected inputs: side.blend, upcomb.blend, upcomb_hair_texture.png.
Source URLs and SHA-256 hashes are recorded in manifests. No remeshing or new
hair geometry: triangulate the author's polygons and preserve loops/UV/normals.
"""
import sys, pathlib, json, gzip, base64, hashlib
import numpy as np
from PIL import Image
from blender_asset_tracer import blendfile
source=pathlib.Path(sys.argv[1]);out=pathlib.Path(__file__).resolve().parents[1]/'dist/assets/anime'
for filename,asset,url in [('side','sidepart','https://opengameart.org/content/side-parting-hairstyle-for-male-model'),('upcomb','upcomb','https://opengameart.org/content/upcomb-hair-style-for-male-model')]:
 path=source/(filename+'.blend');b=blendfile.BlendFile(path);mesh=b.code_index[b'ME'][0]
 verts=mesh.get_pointer(b'mvert');loops=mesh.get_pointer(b'mloop');polys=mesh.get_pointer(b'mpoly');tex=mesh.get_pointer(b'mloopuv')
 # Object rotates source Y-up modeling coordinates into Blender's Z-up scene.
 # Apply object matrix, then convert world (x,y,z) to Three.js (x,z,-y).
 obj=next(o for o in b.code_index[b'OB'] if o.get(b'type')==1)
 matrix=np.array(obj.get(b'obmat')).reshape(4,4).T
 axes=np.array([[1,0,0],[0,0,1],[0,-1,0]])
 normalMatrix=axes@np.linalg.inv(matrix[:3,:3]).T
 raw=[np.array(verts.get(b'co',array_index=i)) for i in range(mesh.get(b'totvert'))]
 positions=[];normals=[];uv=[];indices=[];originalVertexIds=[]
 for polyIndex in range(mesh.get(b'totpoly')):
  start=polys.get(b'loopstart',array_index=polyIndex);count=polys.get(b'totloop',array_index=polyIndex);smooth=polys.get(b'flag',array_index=polyIndex)&1
  vertexIds=[loops.get(b'v',array_index=i) for i in range(start,start+count)]
  a,c,d=[raw[i] for i in vertexIds[:3]];faceNormal=np.cross(c-a,d-a);faceNormal/=max(np.linalg.norm(faceNormal),1e-10)
  offset=len(positions)//3
  for loopIndex,vertexId in zip(range(start,start+count),vertexIds):
   point=axes@(matrix@np.append(raw[vertexId],1))[:3];normal=np.array(verts.get(b'no',array_index=vertexId)) if smooth else faceNormal
   normal=normalMatrix@normal;normal/=max(np.linalg.norm(normal),1e-10)
   positions.extend(int(round(x*100000)) for x in point);normals.extend(int(round(x*32767)) for x in normal)
   u,v=tex.get(b'uv',array_index=loopIndex) if tex else (0,0);uv.extend([round(u*65535),round((1-v)*65535)])
   originalVertexIds.append(vertexId)
  for j in range(1,count-1):indices.extend([offset,offset+j,offset+j+1])
 texture=None
 if asset=='upcomb':
  image=Image.open(source/'upcomb_hair_texture.png').convert('RGBA');image.thumbnail((512,512))
  # Remove the author's brown base tint, retaining authored directional detail.
  alpha=image.getchannel('A');gray=image.convert('L');image=gray if alpha.getextrema()==(255,255) else Image.merge('LA',(gray,alpha));texture='upcomb-hair.png';image.save(out/texture,optimize=True)
 data={'landmarks':{'head':[0,14,3],'leftEye':[-2.5,14,14],'rightEye':[2.5,14,14],'neck':[0,0,0]},'materials':[{'name':'Micket_'+asset+'_HAIR','color':[1,1,1,1],'double':True,'blend':0,'texture':texture}], 'meshes':[{'name':'AuthoredHair','positions':positions,'normals':normals,'uv':uv,'groups':[{'material':0,'indices':indices}],'expressions':{},'sourceVertexIds':originalVertexIds}]}
 compressed=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0);part=asset+'.b64';(out/part).write_text(base64.b64encode(compressed).decode())
 manifest={'parts':[part],'bytes':len(compressed),'source':url,'author':'Micket','license':'CC0-1.0','sourceFile':filename+'_hair.blend' if filename=='upcomb' else 'side_parting_hair.blend','sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceVertices':mesh.get(b'totvert'),'sourcePolygons':mesh.get(b'totpoly'),'triangles':len(indices)//3,'runtimeVertices':len(positions)//3,'transform':'object matrix then (x,z,-y), loop normals/UV retained; no remeshing'}
 (out/(asset+'-manifest.json')).write_text(json.dumps(manifest,indent=2)+'\n');print(asset,manifest)
 b.close()
