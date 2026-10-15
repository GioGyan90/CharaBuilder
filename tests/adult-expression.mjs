import assert from 'node:assert/strict';import {createHash}from'node:crypto';import fs from 'node:fs/promises';import {gunzipSync}from'node:zlib';import *as THREE from'../dist/vendor/three.module.js';
import*as candidate from'../dist/stone-avatar.js';
const load=async name=>JSON.parse(gunzipSync(Buffer.from(await fs.readFile(new URL('../dist/assets/anime/'+name,import.meta.url),'utf8'),'base64'))),donor=await load('adult-male-v81.b64'),legacy=await load('imported-00003.b64');
for(const d of[donor,legacy]){d.maps=d.materials.map(()=>null);d.meshes=d.meshes.filter(m=>m.name==='Face');}
const now=candidate.reserveImportedEyes(donor),rig=donor.landmarks.faceRig;
const point=(m,id)=>m.positions.slice(id*3,id*3+3).map(v=>v/1e5);
const projectionCache=new WeakMap();
function front(model,x,y){let tris=projectionCache.get(model);if(!tris){const m=model.meshes[0];tris=m.groups.flatMap(g=>Array.from({length:g.indices.length/3},(_,i)=>g.indices.slice(i*3,i*3+3).map(id=>point(m,id))));projectionCache.set(model,tris);}let z=-Infinity;for(const[a,b,c]of tris){const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-12)continue;const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;if(u>=0&&v>=0&&u+v<=1)z=Math.max(z,u*a[2]+v*b[2]+(1-u-v)*c[2]);}return z;}
const report={apertures:[],brows:[]};for(const eye of rig.eyes){const height=model=>{const ys=[];for(let k=-400;k<=400;k++){const y=eye[1]+k*.00002;if(front(model,eye[0],y)<eye[2]-.045)ys.push(y);}return[Math.min(...ys),Math.max(...ys)];},a=[eye[1]-.00466,eye[1]+.00426],b=height(now),ratio=(b[1]-b[0])/(a[1]-a[0]);assert.ok(ratio>.92&&ratio<.96,'v92 upper lid is not approximately 6% narrower than v91');assert.ok(Math.abs(a[0]-b[0])<.00005,'lower lid was unnecessarily lowered');report.apertures.push({eye:eye[0],before:a,after:b,ratio});}
// Fixed front rays compare the actual open cavity with recorded v92 geometry.
// Preserve the aperture height while closing each horizontal corner by ~10%.
const previousWidths=[[.0225,.0274,.0304,.0332,.0338,.0324,.0316,.0273,.0184],[.0219,.0272,.0321,.0319,.0315,.031,.0293,.0278,.020]];
report.widths=[];
for(let side=0;side<2;side++){const eye=rig.eyes[side],samples=[];for(let j=-4;j<=4;j++){const y=eye[1]+j*.0008,xs=[];for(let k=-250;k<=250;k++){const x=eye[0]+k*.0001;if(front(now,x,y)<eye[2]-.045)xs.push(x);}assert.ok(xs.length,'narrower eye lost its open cavity');const width=Math.max(...xs)-Math.min(...xs),before=previousWidths[side][j+4],ratio=width/before;assert.ok(ratio>.88&&ratio<.94,'adult eye aperture was not narrowed by approximately ten percent');samples.push({height:y-eye[1],before,width,ratio});}report.widths.push({side,centerline:samples[4],samples});}
assert.ok(now.meshes[0].groups.reduce((n,g)=>n+g.indices.length/3,0)<1800,'eye refinement unnecessarily added triangles');
for(const edit of[{}, {browWidth:0,browThickness:0},{browWidth:100,browThickness:100}]){const model=candidate.addImportedFeatures(now,edit),m=model.meshes[0],g=m.groups.find(g=>model.materials[g.material].name==='ImportedFaceBrow'),seen={left:0,right:0},gaps=[];for(let i=0;i<g.indices.length;i+=3){const tri=g.indices.slice(i,i+3).map(id=>point(m,id));const n=new THREE.Vector3(...tri[1]).sub(new THREE.Vector3(...tri[0])).cross(new THREE.Vector3(...tri[2]).sub(new THREE.Vector3(...tri[0])));if(n.lengthSq()<1e-16)continue;assert.ok(n.z>0,'brow winding faces into head');for(const w of[[1/3,1/3,1/3],[.5,.5,0],[.5,0,.5],[0,.5,.5]]){const p=[0,1,2].map(k=>tri.reduce((n,q,j)=>n+q[k]*w[j],0)),gap=p[2]-front(now,p[0],p[1]);assert.ok(gap>=.00054,'brow interior intersects skin');gaps.push(gap);}seen[tri[0][0]<rig.headX?'left':'right']++;}assert.equal(seen.left,seen.right);report.brows.push({edit,seen,min:Math.min(...gaps),max:Math.max(...gaps)});}

// Preserve the original legacy imported-face route byte for byte. The digest
// covers its closed socket, full eyes, brows, lips, attributes and materials.
assert.equal(createHash('sha256').update(JSON.stringify(candidate.addImportedFeatures(candidate.reserveImportedEyes(legacy)))).digest('hex'),'77176686137f54e37b84185c0ccf0db888d8595b366daec4ffe4a98db433ea9a','legacy imported eye route changed');
const features=candidate.addImportedFeatures(now),mesh=features.meshes[0];
const lining=now.meshes[0].groups.find(g=>now.materials[g.material].name==='ImportedEyeSocket'),burial=[];
for(const id of new Set(lining.indices)){const p=point(now.meshes[0],id),eye=rig.eyes[p[0]<rig.headX?0:1];if(p[2]<eye[2]-.045)continue;const gap=front(now,p[0],p[1])-p[2];assert.ok(gap>=.00198,'dark socket lining protrudes past the temple/cheek');burial.push(gap);}
assert.ok(burial.length>48,'dark lining containment has insufficient ring samples');report.darkLining={samples:burial.length,minBurial:Math.min(...burial),maxBurial:Math.max(...burial)};
const groups=Object.fromEntries(mesh.groups.map(g=>[features.materials[g.material].name,g]));
report.iris=[];
for(let side=0;side<2;side++){
 const eye=rig.eyes[side],g=groups.ImportedEyeIris,p=groups.ImportedPupil,ic=g.indices[side*16*3],pc=p.indices[side*16*3],center=point(mesh,ic),edge=point(mesh,g.indices[side*16*3+1]),pr=point(mesh,p.indices[side*16*3+1]),radius=Math.hypot(center[0]-edge[0],center[1]-edge[1]),pupilRadius=Math.hypot(point(mesh,pc)[0]-pr[0],point(mesh,pc)[1]-pr[1]);
 assert.ok(Math.abs(radius-.0074)<.00002,'adult iris radius no longer matches the character calibration');
 assert.ok(Math.abs(center[1]-eye[1]-.0012)<.00002,'neutral iris should sit slightly under the upper lid');
 assert.ok(Math.abs(pupilRadius/radius-.37)<.003,'adult pupil regained a large toy-like centre');
 assert.deepEqual(mesh.uv.slice(ic*2,ic*2+2),[32768,32768],'iris centre UV missing');
 const ids=[...new Set(g.indices.slice(side*48,(side+1)*48))],uvs=ids.map(id=>mesh.uv.slice(id*2,id*2+2));
 for(const axis of[0,1]){assert.equal(Math.min(...uvs.map(v=>v[axis])),0);assert.equal(Math.max(...uvs.map(v=>v[axis])),65535);}
 report.iris.push({side,diameter:radius*2,pupilRatio:pupilRadius/radius,upwardOffset:center[1]-eye[1],mappedVertices:uvs.length});
}
assert.equal(mesh.groups.reduce((n,g)=>n+g.indices.length/3,0),2255,'eye-only calibration unexpectedly changed topology');
console.log(JSON.stringify(report,null,2));

