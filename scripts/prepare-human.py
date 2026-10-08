"""Prepare CC0 MakeHuman assets. Run with base.obj and .target files in a source folder.
Source: makehumancommunity/makehuman; see THIRD_PARTY.md for pinned revision.
python scripts/prepare-human.py /path/to/base.obj /path/to/targets
"""
import sys,json,gzip
from pathlib import Path
import numpy as np
obj=Path(sys.argv[1]); targetdir=Path(sys.argv[2]);v=[];groups={};g=''
for l in obj.read_text().splitlines():
 s=l.split()
 if not s:continue
 if s[0]=='v':v.append([float(x) for x in s[1:4]])
 elif s[0]=='g':g=s[1]
 elif s[0]=='f':
  f=[int(x.split('/')[0])-1 for x in s[1:]]
  for i in range(1,len(f)-1):groups.setdefault(g,[]).extend([f[0],f[i],f[i+1]])
v=np.array(v)
def target(name):
 d=np.zeros_like(v)
 for l in (targetdir/(name+'.target')).read_text().splitlines():
  s=l.split()
  if len(s)==4 and not l.startswith('#'):d[int(s[0])]=[float(x) for x in s[1:]]
 return d
bases={}; shapes={}
for gender in ['female','male']:
 # Blend existing adult phenotype assets, then add the matching universal body target.
 ancestry=(target('asian-'+gender+'-young')+target('caucasian-'+gender+'-young'))*.5
 for weight in ['minweight','averageweight','maxweight']:
  b=v+ancestry+target('universal-'+gender+'-young-averagemuscle-'+weight)
  bases[gender+'-'+weight]=np.round(b*1000).astype(int).ravel().tolist()
for p in targetdir.glob('*.target'):
 if p.name.startswith(('asian-','caucasian-','universal-')):continue
 d=target(p.stem); ids=np.flatnonzero(np.any(d!=0,axis=1));arr=[]
 for i in ids:arr.extend([int(i),*np.round(d[i]*1000).astype(int).tolist()])
 shapes[p.stem]=arr
joints={k:sorted(set(f)) for k,f in groups.items() if k.startswith('joint-')}
mesh={k:f for k,f in groups.items() if k in ['body','helper-tights','helper-skirt','helper-hair','helper-l-eye','helper-r-eye']}
out=Path(__file__).resolve().parents[1]/'dist/assets'
for name,data in [('human-topology',{'groups':mesh,'joints':joints}),('human-shapes',shapes),*[(k,{'positions':b}) for k,b in bases.items()]]:
 payload=json.dumps(data,separators=(',',':')).encode();path=out/(name+'.json.gz');path.write_bytes(gzip.compress(payload,mtime=0));print(path.name,len(payload),path.stat().st_size)
