"""Build a lighter Stone head from the existing CC0 Hayabusa foundation.
Protect every skin boundary (eye sockets, face/scalp seam, neck); do not simplify
iris/white/highlight geometry. Run with Python + numpy + scipy + trimesh.
"""
from pathlib import Path
import json,gzip,base64,copy,hashlib
import numpy as np
import trimesh
ROOT=Path(__file__).resolve().parents[1]/'dist/assets/anime'
manifest=json.loads((ROOT/'male-manifest.json').read_text())
source=json.loads(gzip.decompress(base64.b64decode(''.join((ROOT/p).read_text() for p in manifest['parts']))))
source['rig']=json.loads(gzip.decompress(base64.b64decode((ROOT/'male-rig.b64').read_text())))
result=copy.deepcopy(source);result['meshes']=[]

def reduce_mesh(mesh,groups,target):
    ids=np.unique(np.concatenate([g['indices'] for g in groups]));remap={int(v):i for i,v in enumerate(ids)}
    p=np.array(mesh['positions']).reshape(-1,3)[ids]/1e5
    uv=np.array(mesh['uv']).reshape(-1,2)[ids].astype(float)
    original=source['rig']['meshes'][mesh['name']]
    j=np.array(original['indices']).reshape(-1,4)[ids]
    w=np.array(original['weights']).reshape(-1,4)[ids]/65535
    f=np.array([[remap[int(v)] for v in g['indices']] for g in groups]).reshape(-1,3)
    original_p=p.copy();original_f=f.copy()
    # Constrained quadric edge collapses. Boundary coordinates stay exact.
    edges=np.sort(np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]]),axis=1)
    edges,count=np.unique(edges,axis=0,return_counts=True);material=source['materials'][groups[0]['material']]['name']
    protected=set(edges[count==1].ravel()) if '_SKIN' in material else set()
    if '_SKIN' in material:
        protected.update(np.where((abs(p[:,0]-source['landmarks']['head'][0])<.030)&(p[:,1]>1.516)&(p[:,1]<1.583)&(p[:,2]>.030))[0])
    q=np.zeros((len(p),4,4))
    normals=np.cross(p[f[:,1]]-p[f[:,0]],p[f[:,2]]-p[f[:,0]])
    normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-12)
    planes=np.c_[normals,-np.einsum('ij,ij->i',normals,p[f[:,0]])]
    for k in range(3):np.add.at(q,f[:,k],planes[:,:,None]*planes[:,None,:])
    while len(f)>target:
        edges=np.unique(np.sort(np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]]),axis=1),axis=0)
        edges=np.array([e for e in edges if not(e[0] in protected and e[1] in protected)])
        if not len(edges):break
        candidates=(p[edges[:,0]]+p[edges[:,1]])*.5
        for k,(a,b) in enumerate(edges):
            if a in protected:candidates[k]=p[a]
            elif b in protected:candidates[k]=p[b]
        v=np.c_[candidates,np.ones(len(candidates))];cost=np.einsum('ni,nij,nj->n',v,q[edges[:,0]]+q[edges[:,1]],v)
        accepted=False
        for k in np.argsort(cost)[:200]:
            a,b=map(int,edges[k]);a,b=(b,a) if b in protected else (a,b)
            affected=np.any((f==a)|(f==b),axis=1)
            na=set(f[np.any(f==a,axis=1)].ravel())-{a,b};nb=set(f[np.any(f==b,axis=1)].ravel())-{a,b}
            if len(na&nb) not in (1,2):continue
            nf=f[affected].copy();old=p[nf].copy();nf[nf==b]=a
            survive=np.array([len(set(t))==3 for t in nf]);nf=nf[survive];old=old[survive]
            new=p[nf].copy();new[nf==a]=candidates[k]
            on=np.cross(old[:,1]-old[:,0],old[:,2]-old[:,0]);nn=np.cross(new[:,1]-new[:,0],new[:,2]-new[:,0])
            if np.any(np.einsum('ij,ij->i',on,nn)<=.1*np.linalg.norm(on,axis=1)*np.linalg.norm(nn,axis=1)):continue
            t=0 if a in protected else .5
            p[a]=candidates[k];uv[a]=uv[a]*(1-t)+uv[b]*t
            weights={}
            for vertex,factor in [(a,1-t),(b,t)]:
                for bone,weight in zip(j[vertex],w[vertex]):weights[int(bone)]=weights.get(int(bone),0)+weight*factor
            top=sorted(weights.items(),key=lambda v:-v[1])[:4];total=sum(x[1] for x in top)
            j[a]=[top[i][0] if i<len(top) else 0 for i in range(4)]
            w[a]=[top[i][1]/total if i<len(top) else 0 for i in range(4)]
            q[a]+=q[b];f[f==b]=a;f=f[np.array([len(set(t))==3 for t in f])]
            accepted=True;break
        if not accepted:break
    used=np.unique(f);lookup={int(v):i for i,v in enumerate(used)};f=np.array([[lookup[int(v)] for v in t] for t in f]);p=p[used];uv=uv[used];j=j[used];w=w[used]
    # Slightly broader lower jaw than Hayabusa, applied equally to source groups.
    y=p[:,1];jaw=np.exp(-((y-1.535)/.047)**2)*np.clip((1.577-y)/.03,0,1)
    p[:,0]=source['landmarks']['head'][0]+(p[:,0]-source['landmarks']['head'][0])*(1+.055*jaw)
    p=np.rint(p*1e5)/1e5;surface=trimesh.Trimesh(p,f,process=False)
    return {'name':mesh['name'],'positions':np.rint(p*1e5).astype(int).ravel().tolist(),'normals':np.rint(surface.vertex_normals*32767).astype(int).ravel().tolist(),'uv':np.rint(uv).astype(int).ravel().tolist(),'skinIndices':j.ravel().tolist(),'skinWeights':w.ravel().tolist(),'groups':[{'material':groups[0]['material'],'indices':f.ravel().tolist()}],'expressions':{}},len(original_f),len(f)

face=source['meshes'][0];parts=[];stats=[]
for group in face['groups']:
    name=source['materials'][group['material']]['name'];faces=len(group['indices'])//3
    if 'EyeExtra' in name:continue
    target=650 if '_SKIN' in name else faces if any(s in name for s in ['EyeWhite','EyeIris','EyeHighlight']) else 80 if 'FaceMouth' in name else 48 if 'FaceBrow' in name else 96 if 'Eyeline' in name else 64
    part,before,after=reduce_mesh(face,[group],target);parts.append(part);stats.append({'material':name,'before':before,'after':after})
# Merge the face groups into a single mesh, retaining separate materials/UVs.
merged={k:[] for k in ['positions','normals','uv','skinIndices','skinWeights','groups']};merged.update(name='Face',expressions={})
for part in parts:
    offset=len(merged['positions'])//3
    for k in ['positions','normals','uv','skinIndices','skinWeights']:merged[k].extend(part[k])
    merged['groups'].extend({**g,'indices':[i+offset for i in g['indices']]} for g in part['groups'])
result['meshes'].append(merged)
body=source['meshes'][1];p=np.array(body['positions']).reshape(-1,3)/1e5
skin=next(g for g in body['groups'] if '_SKIN' in source['materials'][g['material']]['name']);f=np.array(skin['indices']).reshape(-1,3)
f=f[(p[f][:,:,1]>=source['landmarks']['neck'][1]+.015).any(axis=1)]
scalp,before,after=reduce_mesh(body,[{**skin,'indices':f.ravel().tolist()}],220);result['meshes'].append(scalp);stats.append({'material':'Scalp','before':before,'after':after})
result['reference']={'source':'CC0 male / Hayabusa foundation','jawWidthIncrease':.055,'skinBoundaryProtected':True,'eyeGeometryPreserved':True,'previousStoneHeadFaces':2239,'headFaces':sum(s['after'] for s in stats),'groups':stats}
result['maps']=[]
packed=gzip.compress(json.dumps(result,separators=(',',':')).encode(),mtime=0);text=base64.b64encode(packed).decode();parts=[]
for i,start in enumerate(range(0,len(text),160000)):
    name=f'stone-head-part-{i}.b64';(ROOT/name).write_text(text[start:start+160000]);parts.append(name)
(ROOT/'stone-head-manifest.json').write_text(json.dumps({'parts':parts,'bytes':len(packed),'reference':result['reference']},separators=(',',':')))
print(json.dumps(result['reference'],indent=2))
