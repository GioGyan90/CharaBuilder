"""Bake CC0 VRoid beta HairSample meshes for the static character editor.
Usage: python scripts/prepare-vroid.py SOURCE_DIR
SOURCE_DIR contains female.vrm and male.vrm from madjin/vrm-samples/vroid/beta.
For modular packs: prepare-vroid.py SOURCE_DIR/donors bob long uniform classic.
Donor files are Sendagaya_Shibu, Sendagaya_Shino, Sakurada_Fumiriya, Victoria_Rubin.
Only selected expressions and main textures are retained; no VRoidPreset A-Z assets.
"""
import sys,json,struct,gzip,io,math
from pathlib import Path
import numpy as np
from PIL import Image
OUT=Path(__file__).resolve().parents[1]/'dist/assets/anime'
OUT.mkdir(parents=True,exist_ok=True)
for sex in (sys.argv[2:] or ['female','male']):
 raw=(Path(sys.argv[1])/(sex+'.vrm')).read_bytes();length=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+length]);binary=raw[28+length:]
 assert j['extensions']['VRM']['meta']['licenseName']=='CC0'
 target_sex = 'male' if sex=='uniform' else 'female'
 is_preset = sex not in ['male','female']
 base_nodes = {}
 if is_preset:
  base_raw=(Path(sys.argv[1]).parent/(target_sex+'.vrm')).read_bytes();base_json=json.loads(base_raw[20:20+struct.unpack_from('<I',base_raw,12)[0]])
  base_nodes={n['name']:n for n in base_json['nodes'] if n.get('name','').startswith('J_Bip_') or n.get('name')=='Root'}
 def accessor(idx):
  a=j['accessors'][idx];v=j['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];offset=v.get('byteOffset',0)+a.get('byteOffset',0);size=np.dtype(dt).itemsize
  return np.ndarray((a['count'],width),dtype=dt,buffer=binary,offset=offset,strides=(v.get('byteStride',width*size),size)).copy()
 parents={c:i for i,n in enumerate(j['nodes']) for c in n.get('children',[])}
 bones={b['bone']:b['node'] for b in j['extensions']['VRM']['humanoid']['humanBones']}
 def world(idx,posed):
  n=j['nodes'][idx];n=base_nodes.get(n.get('name'),n) if is_preset else n;m=np.eye(4);x,y,z,w=n.get('rotation',[0,0,0,1]);m[:3,:3]=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y]])@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0])
  if posed and idx in [bones['leftUpperArm'],bones['rightUpperArm']]:
   angle=math.radians(62 if idx==bones['leftUpperArm'] else -62);c,s=math.cos(angle),math.sin(angle);m[:3,:3]=m[:3,:3]@np.array([[c,-s,0],[s,c,0],[0,0,1]])
  return world(parents[idx],posed)@m if idx in parents else m
 result={'source':j['extensions']['VRM']['meta']['title'],'license':'CC0','materials':[],'meshes':[],'landmarks':{}}
 for name in ['head','neck','leftEye','rightEye','hips']:
  p=world(bones[name],False)[:3,3]*[-1,1,-1];result['landmarks'][name]=p.tolist()
 used_materials={part['material'] for mesh in j['meshes'][1:] for part in mesh['primitives'] if sex!='bob' or '_HAIR' in j['materials'][part['material']]['name']} if is_preset else set(range(len(j['materials'])))
 for idx,prop in enumerate(j['extensions']['VRM']['materialProperties']):
  tex=prop['textureProperties'].get('_MainTex');name=prop['name'];path=None
  if tex is not None and idx in used_materials:
   view=j['bufferViews'][j['images'][j['textures'][tex]['source']]['bufferView']];off=view.get('byteOffset',0);im=Image.open(io.BytesIO(binary[off:off+view['byteLength']])).convert('RGBA');im.thumbnail((512,512),Image.Resampling.LANCZOS)
   # Normalize dark hair/denim for editable tint while preserving painted strands/folds.
   if '_HAIR' in name or 'Bottoms' in name or 'Shoes' in name:
    pixels=np.array(im);lum=np.mean(pixels[:,:,:3],axis=2);gray=np.clip(150+lum*.4,0,245).astype('uint8');pixels[:,:,:3]=gray[:,:,None];im=Image.fromarray(pixels)
   path=f'{sex}-{idx}.png';buffer=io.BytesIO();im.save(buffer,format='PNG',optimize=True);(OUT/path).write_bytes(buffer.getvalue())
  result['materials'].append({'name':name,'texture':path,'color':prop['vectorProperties'].get('_Color',[1,1,1,1]),'blend':prop['floatProperties'].get('_BlendMode',0),'double':prop['floatProperties'].get('_CullMode',2)==0})
 for node in j['nodes']:
  if 'mesh' not in node or (is_preset and node['name']=='Face'):continue
  mesh=j['meshes'][node['mesh']];prim=mesh['primitives'][0];attrs=prim['attributes'];p=accessor(attrs['POSITION']);normal=accessor(attrs['NORMAL']);skin=j['skins'][node['skin']];ib=accessor(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1);trans=np.array([world(k,True)@ib[q] for q,k in enumerate(skin['joints'])]);weights=accessor(attrs['WEIGHTS_0']);joints=accessor(attrs['JOINTS_0']);mat=np.sum(trans[joints]*weights[:,:,None,None],axis=1);p=np.einsum('nij,nj->ni',mat,np.column_stack([p,np.ones(len(p))]))[:,:3];normal=np.einsum('nij,nj->ni',mat[:,:3,:3],normal);p*=np.array([-1,1,-1]);normal*=np.array([-1,1,-1]);normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-9)
  if is_preset and node['name']=='Body':
   import base64
   manifest=json.loads((OUT/(target_sex+'-manifest.json')).read_text());base_data=json.loads(gzip.decompress(base64.b64decode(''.join((OUT/f).read_text() for f in manifest['parts']))))
   base_body=next(m for m in base_data['meshes'] if m['name']=='Body');bp=np.array(base_body['positions']).reshape(-1,3)/100000;bu=np.array(base_body['uv']).reshape(-1,2)/65535;bn=np.array(base_body['normals']).reshape(-1,3)/32767
   base_skin=np.unique(np.concatenate([g['indices'] for g in base_body['groups'] if '_SKIN' in base_data['materials'][g['material']]['name']]))
   neck=base_data['landmarks']['neck'][1];head_ids=base_skin[bp[base_skin,1]>neck-.045];donor_uv=accessor(attrs['TEXCOORD_0']);donor_skin=np.unique(np.concatenate([accessor(part['indices']).ravel() for part in mesh['primitives'] if '_SKIN' in j['materials'][part['material']]['name']]))
   replaced=0
   for vertex in donor_skin[p[donor_skin,1]>neck-.045]:
    nearest=head_ids[np.argmin(np.sum((bu[head_ids]-donor_uv[vertex])**2,axis=1))]
    if np.linalg.norm(bu[nearest]-donor_uv[vertex])<.006:
     t=np.clip((p[vertex,1]-(neck-.045))/.05,0,1);t=t*t*(3-2*t);p[vertex]=p[vertex]*(1-t)+bp[nearest]*t;normal[vertex]=normal[vertex]*(1-t)+bn[nearest]*t;replaced+=1
   print(sex,'head skin UV matches',replaced)
  entry={'name':node['name'],'positions':np.round(p*100000).astype(int).ravel().tolist(),'normals':np.round(normal*32767).astype(int).ravel().tolist(),'uv':np.round(accessor(attrs['TEXCOORD_0'])*65535).astype(int).ravel().tolist(),'groups':[],'expressions':{}}
  merged={}
  for part_index,part in enumerate(mesh['primitives']):
   if sex=='bob' and node['name']=='Body' and '_HAIR' not in j['materials'][part['material']]['name']:continue
   # First six female HairSample primitives are the optional cat-ear accessory.
   if sex=='female' and node['name']=='Hair001' and part_index<6:continue
   merged.setdefault(part['material'],[]).extend(accessor(part['indices']).ravel().tolist())
  entry['groups']=[{'material':k,'indices':v} for k,v in merged.items()]
  if node['name']=='Face':
   for group in j['extensions']['VRM']['blendShapeMaster']['blendShapeGroups']:
    name=group['presetName']
    if name not in ['joy','angry','sorrow','fun','blink']:continue
    delta=np.zeros_like(p)
    for bind in group['binds']:
     d=accessor(prim['targets'][bind['index']]['POSITION']);d=np.einsum('nij,nj->ni',mat[:,:3,:3],d)*[-1,1,-1];delta+=d*bind['weight']/100
    entry['expressions'][name]=np.round(delta*100000).astype(int).ravel().tolist()
  if is_preset:
   # Keep only vertices actually used by this modular part.
   used=np.unique(np.concatenate([g['indices'] for g in entry['groups']]));mapping={int(v):i for i,v in enumerate(used)}
   for key,width in [('positions',3),('normals',3),('uv',2)]:entry[key]=np.array(entry[key]).reshape(-1,width)[used].ravel().tolist()
   for g in entry['groups']:g['indices']=[mapping[v] for v in g['indices']]
  result['meshes'].append(entry)
  print(sex,node['name'],'bounds',p.min(axis=0),p.max(axis=0))
 data=gzip.compress(json.dumps(result,separators=(',',':')).encode(),mtime=0)
 # Text chunks keep GitHub API payloads modest; browser reconstructs their exact gzip bytes.
 import base64
 encoded=base64.b64encode(data).decode();parts=[]
 for k in range(0,len(encoded),160000):
  path=f'{sex}-{k//160000}.b64';(OUT/path).write_text(encoded[k:k+160000]);parts.append(path)
 (OUT/(sex+'-manifest.json')).write_text(json.dumps({'parts':parts,'bytes':len(data)},indent=2))
 print(sex,'compressed',len(data),'texture bytes',sum(p.stat().st_size for p in OUT.glob(sex+'-*.png')))
