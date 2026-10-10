"""Transfer authored CC0 MakeHuman max-muscle / average-muscle cross sections.
Usage: python scripts/prepare-muscle-guide.py /path/to/target-folder
Only dimensionless torso profiles enter the JS runtime, no donor neck/head mesh.
"""
from pathlib import Path
import sys,json,gzip,hashlib
import numpy as np
root=Path(__file__).resolve().parents[1]; source=Path(sys.argv[1])
base=np.array(json.load(gzip.open(root/'dist/assets/male-averageweight.json.gz'))['positions']).reshape(-1,3)/1000
top=json.load(gzip.open(root/'dist/assets/human-topology.json.gz'))
def target(name):
 raw=(source/name).read_bytes(); d=np.zeros_like(base)
 for line in raw.decode().splitlines():
  if line.startswith('#'):continue
  a=line.split()
  if len(a)==4:d[int(a[0])]=list(map(float,a[1:]))
 return d,hashlib.sha256(raw).hexdigest()
maximum,sha=target('maxmuscle.target');average,_=target('averagemuscle.target');edited=base+maximum-average
pelvis=base[top['joints']['joint-pelvis']].mean(0);neck=base[top['joints']['joint-neck']].mean(0);shoulder=base[top['joints']['joint-l-shoulder']].mean(0)
tri=np.array(top['groups']['body']).reshape(-1,3)
# Exclude the authored arms at the torso boundary; preserve pec/trap/lat bands.
tri=tri[np.abs(base[tri].mean(1)[:,0])<shoulder[0]*1.04]
def radius(p,y,angle):
 a=p[tri];lo=a[:,:,1].min(1);hi=a[:,:,1].max(1);a=a[(lo<=y)&(hi>=y)]
 hits=[]
 for t in a:
  h=[]
  for k in range(3):
   v,w=t[k],t[(k+1)%3];dy=w[1]-v[1]
   if abs(dy)<1e-9:continue
   u=(y-v[1])/dy
   if 0<=u<=1:h.append((v+(w-v)*u)[[0,2]])
  if len(h)<2:continue
  start=h[0]-np.array([0,pelvis[2]]);edge=h[1]-h[0];direction=np.array([np.cos(angle),np.sin(angle)])
  den=direction[0]*edge[1]-direction[1]*edge[0]
  if abs(den)<1e-9:continue
  r=(start[0]*edge[1]-start[1]*edge[0])/den;u=(start[0]*direction[1]-start[1]*direction[0])/den
  if r>0 and 0<=u<=1:hits.append(r)
 return max(hits,default=0)
rows=[]
for t in np.linspace(.04,.94,24):
 y=pelvis[1]+t*(neck[1]-pelvis[1]);ratios=[]
 for angle in np.linspace(-np.pi,np.pi,48,endpoint=False):
  b=radius(base,y,angle);m=radius(edited,y,angle)
  ratios.append(round(float(np.clip(m/b if b and m else 1,.82,1.42)),4))
 rows.append(ratios)
guide={'source':'https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/targets/macrodetails/universal-male-young-maxmuscle-averageweight.target','license':'CC0-1.0','sourceSha256':sha,'low':.04,'high':.94,'sectors':48,'rows':rows}
(root/'dist/muscle-guide.js').write_text('// Generated from authored MakeHuman muscular body cross sections.\nexport const muscleGuide='+json.dumps(guide,separators=(',',':'))+';\n')
print('Authored profiles',len(rows),'x48; ratio range',min(map(min,rows)),max(map(max,rows)))
