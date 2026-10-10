"""Extract only authored Quaternius CC0 motion. No donor meshes are shipped.
Usage: python scripts/prepare-animations.py /path/to/downloaded/glTF/directory
Requires numpy and scipy. Reference is the supplied A_TPose, NOT invented curves.
"""
import sys,json,hashlib
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation as R, Slerp
src=Path(sys.argv[1]); out=Path(__file__).resolve().parents[1]/'dist/assets/motion';out.mkdir(parents=True,exist_ok=True)
gltf=src/'AnimationLibrary_Godot_Standard.gltf'; binary=src/'AnimationLibrary_Godot_Standard.bin'
j=json.loads(gltf.read_text());buf=binary.read_bytes()
def accessor(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']]
 assert a['componentType']==5126 and not a.get('sparse') and not v.get('byteStride')
 return np.frombuffer(buf,dtype='<f4',count=a['count']*{'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']],offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],-1)
parents={c:i for i,n in enumerate(j['nodes']) for c in n.get('children',[])}
mapnames={'hips':'DEF-hips','spine':'DEF-spine.001','chest':'DEF-spine.002','upperChest':'DEF-spine.003','neck':'DEF-neck','head':'DEF-head'}
for side,s in [('left','L'),('right','R')]:
 for target,source in [('Shoulder','shoulder'),('UpperArm','upper_arm'),('LowerArm','forearm'),('Hand','hand'),('UpperLeg','thigh'),('LowerLeg','shin'),('Foot','foot'),('Toes','toe')]:mapnames[side+target]=f'DEF-{source}.{s}'
 for digit,source in [('Thumb','thumb'),('Index','f_index'),('Middle','f_middle'),('Ring','f_ring'),('Little','f_pinky')]:
  for part,num in [('Proximal','01'),('Intermediate','02'),('Distal','03')]:mapnames[side+digit+part]=f'DEF-{source}.{num}.{s}'
lookup={n.get('name'):i for i,n in enumerate(j['nodes'])};ids={k:lookup[v] for k,v in mapnames.items()}
def sample(animation,times):
 count=len(times);rs=[R.from_quat(np.tile(n.get('rotation',[0,0,0,1]),(count,1))) for n in j['nodes']];ps=[np.tile(n.get('translation',[0,0,0]),(count,1)).astype(float) for n in j['nodes']]
 for c in animation['channels']:
  s=animation['samplers'][c['sampler']];assert s.get('interpolation','LINEAR') in ['LINEAR','STEP']
  t=accessor(s['input'])[:,0];v=accessor(s['output']);q=c['target'];tt=np.clip(times,t[0],t[-1])
  if s.get('interpolation')=='STEP':
   vv=v[np.clip(np.searchsorted(t,tt,side='right')-1,0,len(t)-1)]
   if q['path']=='rotation':rs[q['node']]=R.from_quat(vv)
   elif q['path']=='translation':ps[q['node']]=vv
   elif q['path']=='scale':assert np.allclose(vv,1,atol=1e-4)
   continue
  if q['path']=='rotation':rs[q['node']]=Slerp(t,R.from_quat(v))(tt) if len(t)>1 else R.from_quat(np.tile(v[0],(count,1)))
  elif q['path']=='translation':ps[q['node']]=np.column_stack([np.interp(tt,t,v[:,a]) for a in range(3)])
  elif q['path']=='scale':assert np.allclose(v,1,atol=1e-4), 'non-unit animated scales unsupported'
 cache={}
 def world(i):
  if i in cache:return cache[i]
  q,p=rs[i],ps[i]
  if i in parents:
   pq,pp=world(parents[i]);p=pp+pq.apply(p);q=pq*q
  cache[i]=(q,p);return q,p
 return {k:world(i) for k,i in ids.items()}
animations={a['name']:a for a in j['animations']};ref=sample(animations['A_TPose'],[0])
selected={'relaxed':'Idle_Loop','talk':'Idle_Talking_Loop','walk':'Walk_Loop','formalWalk':'Walk_Formal_Loop','jog':'Jog_Fwd_Loop','dance':'Dance_Loop','interact':'Interact','pickUp':'PickUp_Table'}
data={'author':'Quaternius','license':'CC0-1.0','source':'https://quaternius.com/packs/universalanimationlibrary.html','fps':30,'reference':{k:v[1][0].round(7).tolist() for k,v in ref.items()},'clips':{}}
for key,name in selected.items():
 a=animations[name];duration=float(max(accessor(s['input'])[-1,0] for s in a['samplers']));times=np.linspace(0,duration,round(duration*30)+1);frames=sample(a,times)
 rotations={}
 for k,(q,p) in frames.items():
  values=(q*ref[k][0][0].inv()).as_quat()
  for i in range(1,len(values)):
   if np.dot(values[i-1],values[i])<0:values[i]*=-1
  rotations[k]=values.round(6).ravel().tolist()
 # In-place preview removes horizontal root drift. Preserve authored hip bob.
 hipY=(frames['hips'][1][:,1]-ref['hips'][1][0,1])/ref['hips'][1][0,1]
 data['clips'][key]={'sourceName':name,'loop':key not in ['interact','pickUp'],'duration':duration,'frames':len(times),'rotations':rotations,'hipY':hipY.round(7).tolist()}
 print(key,name,len(times))
(out/'quaternius.js').write_text('// Quaternius Universal Animation Library Standard, CC0-1.0.\nexport default '+json.dumps(data,separators=(',',':'))+';\n')
(out/'LICENSE-Quaternius.txt').write_bytes((src/'LICENSE').read_bytes())
manifest={'sourceRepository':'https://github.com/J-Ponzo/gltf-universal-animation-library','files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [gltf,binary]},'clips':selected,'mappedBones':list(mapnames),'conversion':'Body, wrists, all 30 finger joints and both toe joints; 30 Hz sampling of authored tracks; world-space T-pose normalization; vertical hip motion only. No meshes, textures or model replacement.'}
(out/'provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
