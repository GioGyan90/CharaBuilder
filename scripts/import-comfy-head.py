"""Extract the 00003 single-surface head into compact JS-readable face/hair data.

Run in a Python environment with numpy, scipy, trimesh, networkx and
fast-simplification. The GLB stays outside the runtime; its workflow metadata
is deliberately excluded. All cut/fit coordinates below belong to this donor.
"""
from pathlib import Path
import argparse, base64, gzip, hashlib, json
import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist/assets/anime'

def clip(mesh, field):
    vertices, faces = [], []
    for triangle in mesh.triangles:
        polygon = []
        for a,b in zip(triangle,np.roll(triangle,-1,axis=0)):
            fa,fb = field(a),field(b)
            if fa >= 0: polygon.append(a)
            if (fa >= 0) != (fb >= 0): polygon.append(a+(b-a)*fa/(fa-fb))
        if len(polygon)>=3:
            start=len(vertices);vertices.extend(polygon)
            faces.extend([start,start+k,start+k+1] for k in range(1,len(polygon)-1))
    result=trimesh.Trimesh(vertices,faces,process=True)
    result.update_faces(result.nondegenerate_faces())
    result.remove_unreferenced_vertices()
    return result

def boundaries(mesh):
    edges,count=np.unique(np.sort(mesh.edges,axis=1),axis=0,return_counts=True)
    adjacent={}
    for a,b in edges[count==1]:
        adjacent.setdefault(int(a),[]).append(int(b));adjacent.setdefault(int(b),[]).append(int(a))
    unseen=set(adjacent);loops=[]
    while unseen:
        start=min(unseen);loop=[];current=start;previous=-1
        while current in unseen:
            unseen.remove(current);loop.append(current)
            choices=[v for v in adjacent[current] if v!=previous]
            nxt=next((v for v in choices if v in unseen),start)
            previous,current=current,nxt
        if current==start and len(loop)>=3:loops.append(loop)
    return loops

def close_crown(mesh, loop):
    # Extend the real hairline into a smooth, bald scalp; do not cap it flat.
    p=mesh.vertices.tolist();f=mesh.faces.tolist();start=np.array(p)[loop]
    center=np.array([.003,.61,-.07]);previous=loop
    for k in range(1,9):
        t=k/9;angle=t*np.pi/2
        ring=start.copy()
        # Fade irregular hairline radii into a smooth oval, rather than carrying
        # the removed forelock's notch up the entire bald crown as a ridge.
        theta=np.arctan2((start[:,0]-center[0])/.43,(start[:,2]-center[2])/.53)
        blend=min(1,t*3);radius=np.column_stack([.43*np.sin(theta),.53*np.cos(theta)])
        ring[:,0]=center[0]+((start[:,0]-center[0])*(1-blend)+radius[:,0]*blend)*np.cos(angle)
        ring[:,2]=center[2]+((start[:,2]-center[2])*(1-blend)+radius[:,1]*blend)*np.cos(angle)
        ring[:,1]=start[:,1]+(center[1]-start[:,1])*np.sin(angle)
        ids=list(range(len(p),len(p)+len(ring)));p.extend(ring.tolist())
        for i in range(len(ids)):
            j=(i+1)%len(ids);f.extend([[previous[i],previous[j],ids[i]],[previous[j],ids[j],ids[i]]])
        previous=ids
    pole=len(p);p.append(center.tolist())
    for i in range(len(loop)):f.append([previous[i],previous[(i+1)%len(loop)],pole])
    out=trimesh.Trimesh(p,f,process=True);trimesh.repair.fix_normals(out,multibody=True)
    return out

def add_collar(mesh, loop):
    p=mesh.vertices.tolist();f=mesh.faces.tolist();ring=mesh.vertices[loop]
    angles=np.arctan2(ring[:,0]-.003,ring[:,2]+.12)
    collar=np.column_stack([.003+.245*np.sin(angles),np.full(len(loop),-.765),-.12+.245*np.cos(angles)])
    ids=list(range(len(p),len(p)+len(loop)));p.extend(collar.tolist())
    for i in range(len(loop)):
        j=(i+1)%len(loop);f.extend([[loop[i],ids[i],loop[j]],[loop[j],ids[i],ids[j]]])
    out=trimesh.Trimesh(p,f,process=True);trimesh.repair.fix_normals(out,multibody=True)
    return out

def repair_small_holes(mesh):
    p=mesh.vertices.tolist();f=mesh.faces.tolist();repaired=0
    for loop in boundaries(mesh):
        if len(loop)>8:continue
        center=mesh.vertices[loop].mean(axis=0);index=len(p);p.append(center.tolist())
        for i in range(len(loop)):f.append([loop[i],loop[(i+1)%len(loop)],index])
        repaired+=1
    out=trimesh.Trimesh(p,f,process=True);trimesh.repair.fix_normals(out,multibody=True)
    return out,repaired

def main():
    parser=argparse.ArgumentParser();parser.add_argument('source',type=Path);args=parser.parse_args()
    original=trimesh.load(args.source,force='mesh')
    components=original.split(only_watertight=False)
    main=max(components,key=lambda mesh:len(mesh.faces));main_faces=len(main.faces)
    # Keep the connected face and crown; the other components are noisy neck
    # fragments, confirmed in the donor's front and side inspection.
    main=main.simplify_quadric_decimation(face_count=14000,aggression=3)
    field=lambda p:max(p[1]-.16-.25*p[2],min(p[2]-.54,p[1]-.08))
    skin=clip(main,lambda p:-field(p));hair=clip(main,field)
    # The generated forelock is fused into the upper forehead; its underside
    # is not a second, usable skin layer. Rebuild above the brow instead of
    # leaving a hair-root notch in the bald preview.
    skin=clip(skin,lambda p:.06-p[1])
    loops=boundaries(skin)
    upper=max(loops,key=lambda l:skin.vertices[l,1].mean())
    skin=close_crown(skin,upper)
    loops=boundaries(skin)
    lower=min(loops,key=lambda l:skin.vertices[l,1].mean())
    skin=add_collar(skin,lower)
    skin,repaired=repair_small_holes(skin)
    # Curvature-error QEM spends triangles on feature ridges rather than flat scalp.
    reference_skin=skin.copy()
    skin=skin.simplify_quadric_decimation(face_count=1800,aggression=3)
    hair=hair.simplify_quadric_decimation(face_count=7000,aggression=3)
    transform=lambda p:p*np.array([.19,.19,.19])+np.array([-.001,1.61,-.015])
    for mesh in [skin,hair]:mesh.vertices=transform(mesh.vertices)
    manifest=json.loads((OUT/'male-manifest.json').read_text())
    male=json.loads(gzip.decompress(base64.b64decode(''.join((OUT/p).read_text() for p in manifest['parts']))))
    rig=json.loads(gzip.decompress(base64.b64decode((OUT/'male-rig.b64').read_text())))
    headbone=rig['humanoid']['head'];neckbone=rig['humanoid']['neck']
    def encode(mesh,name,material):
        count=len(mesh.vertices);weights=[];indices=[]
        for p in mesh.vertices:
            t=float(np.clip((p[1]-1.46)/.065,0,1));t=t*t*(3-2*t)
            indices.extend([headbone,neckbone,0,0]);weights.extend([t,1-t,0,0])
        return dict(name=name,positions=np.rint(mesh.vertices*1e5).astype(int).ravel().tolist(),
            normals=np.rint(mesh.vertex_normals*32767).astype(int).ravel().tolist(),uv=[0]*(count*2),
            groups=[dict(material=material,indices=mesh.faces.ravel().tolist())],expressions={},
            skinIndices=indices,skinWeights=weights,faceRegions=['Face:skin']*count if name=='Face' else None)
    # Measured on the donor with the local raycast inspection view, not copied
    # from the old anime face. Symmetrize the paired edit anchors only.
    eyes=[transform(np.array([sign*.154,-.055,.476])).tolist() for sign in [-1,1]]
    brows=[transform(np.array([sign*.165,-.010,.526])).tolist() for sign in [-1,1]]
    mouth=transform(np.array([0,-.386,.536])).tolist();nose=transform(np.array([0,-.245,.657])).tolist()
    head=transform(np.array([.003,.12,-.07])).tolist()
    faceRig=dict(neckY=male['landmarks']['neck'][1],reference=False,eyes=eyes,brows=brows,
        mouth=mouth,nose=nose,headX=head[0],headZ=head[2],eyeY=eyes[0][1],chin=float(skin.vertices[:,1].min()),
        top=float(skin.vertices[:,1].max()),gender='male',preset={'imported':True,'eyeScale':1,'jawMix':0},
        guide={'jawRatios':[1,1,1,1,1]},rebuilt=True)
    # The collar is not the anatomical chin.
    faceRig['chin']=float(transform(np.array([0,-.626,0]))[1])
    faceRig['structure']=json.loads((ROOT/'scripts/head-structure.json').read_text(encoding='utf-8'))
    data=dict(materials=[dict(name='Imported00003_Face_SKIN',color=[1,1,1,1],double=False,blend=0,texture=None),dict(name='Imported00003_HAIR',color=[1,1,1,1],double=True,blend=0,texture=None)],
        meshes=[encode(skin,'Face',0),encode(hair,'HairImported',1)],rig=rig,
        landmarks={**male['landmarks'],'head':head,'leftEye':eyes[0],'rightEye':eyes[1],'faceRig':faceRig},
        reference=dict(source=args.source.name,sha256=hashlib.sha256(args.source.read_bytes()).hexdigest(),
            sourceFaces=len(original.faces),mainFaces=main_faces,faceFaces=len(skin.faces),hairFaces=len(hair.faces),
            texture=False,independentEyes=False,sourceScale=.19,version=62,repairedSmallHoles=repaired,
            previousFaceFaces=3200,reductionMethod='curvature-error quadric edge collapse',
            reconstructed=['upper forehead above donor y=0.06','bald scalp','neck collar']))
    # No original body, morphs, workflow, textures or GLB embedded in runtime.
    data['rig']={**rig,'meshes':{}}
    binary=gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0)
    part='imported-00003.b64';(OUT/part).write_text(base64.b64encode(binary).decode())
    (OUT/'imported-00003-manifest.json').write_text(json.dumps(dict(parts=[part],bytes=len(binary),reference=data['reference']),indent=2)+'\n')
    debug=ROOT/'artifacts/import-00003';debug.mkdir(parents=True,exist_ok=True)
    for name,mesh in [('face',skin),('hair',hair)]:
        local=(mesh.vertices-np.array([-.001,1.61,-.015]))/.19
        (debug/(name+'.json')).write_text(json.dumps(dict(positions=local.ravel().tolist(),indices=mesh.faces.ravel().tolist()),separators=(',',':')))
    reference_skin.export(debug/'face-before-reduction.ply')
    print(json.dumps(data['reference'],indent=2));print('gzip bytes',len(binary))

if __name__=='__main__':main()
