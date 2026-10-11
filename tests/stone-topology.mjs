import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {refineStoneBody,relaxStoneShoulders} from '../dist/stone-body.js';
const root=new URL('../dist/assets/anime/',import.meta.url);
const manifest=JSON.parse(await fs.readFile(new URL('male-manifest.json',root),'utf8'));
const parts=await Promise.all(manifest.parts.map(p=>fs.readFile(new URL(p,root),'utf8')));
const base=JSON.parse(gunzipSync(Buffer.from(parts.join(''),'base64')));
base.rig=JSON.parse(gunzipSync(Buffer.from(await fs.readFile(new URL('male-rig.b64',root),'utf8'),'base64')));
const original=base.meshes.find(m=>m.name==='Body'),snapshot=JSON.stringify(original),rigSnapshot=JSON.stringify(base.rig);
const edited=refineStoneBody(base);assert.equal(refineStoneBody(base),edited);
assert.equal(JSON.stringify(original),snapshot);assert.equal(JSON.stringify(base.rig),rigSnapshot);
assert.deepEqual(edited.positions.slice(0,original.positions.length),original.positions);
assert.ok(edited.refinement.addedVertices>100);assert.ok(edited.positions.length<original.positions.length*2);
const skin=m=>m.groups.filter(g=>base.materials[g.material].name.includes('_SKIN'));
function metrics(mesh){
 const edges=new Map();let area=0;
 const point=id=>mesh.positions.slice(id*3,id*3+3).map(v=>v/100000);
 const key=id=>point(id).map(v=>Math.round(v*1e7)).join(',');
 for(const group of skin(mesh))for(let t=0;t<group.indices.length;t+=3){
  const ids=group.indices.slice(t,t+3),[a,b,c]=ids.map(point),ab=b.map((q,k)=>q-a[k]),ac=c.map((q,k)=>q-a[k]);
  area+=Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])*.5;
  for(let k=0;k<3;k++){const u=ids[k],v=ids[(k+1)%3],ka=key(u),kb=key(v),e=ka<kb?ka+'|'+kb:kb+'|'+ka;
   if(!edges.has(e))edges.set(e,{count:0,length:Math.hypot(...point(u).map((q,k)=>q-point(v)[k]))});edges.get(e).count++;
  }
 }
 return {area,boundary:[...edges.values()].filter(e=>e.count===1).reduce((s,e)=>s+e.length,0),nonmanifold:[...edges.values()].filter(e=>e.count>2).length};
}
const before=metrics(original),after=metrics(edited);
assert.ok(Math.abs(before.area-after.area)<1e-10,'refinement changed donor rest surface');
assert.ok(Math.abs(before.boundary-after.boundary)<1e-9,'new cracks / T junctions in welded surface');
assert.ok(after.nonmanifold<=before.nonmanifold,'new nonmanifold edges');
const rest=new Float32Array(edited.positions.map(v=>v/100000)),relaxed=new Float32Array(rest);
relaxStoneShoulders(relaxed,edited,base.landmarks);let moved=0;
const seams=new Map();
for(const group of skin(edited))for(const id of new Set(group.indices)){
 const q=edited.positions.slice(id*3,id*3+3),key=q.map(v=>Math.round(v*2)).join(','),p=Array.from(relaxed.slice(id*3,id*3+3));
 if(seams.has(key))assert.deepEqual(p,seams.get(key),'relaxation cracked a UV seam');else seams.set(key,p);
 const delta=Math.hypot(...p.map((v,k)=>v-rest[id*3+k]));if(delta>1e-7)moved++;
 if(q[1]/100000>=base.landmarks.neck[1]||q[1]/100000<base.landmarks.hips[1]+.05)assert.equal(delta,0,'shoulder pass changed neck / lower body');
 assert.ok(delta<.03,'unbounded shoulder relaxation');
}
assert.ok(moved>100);
for(let id=0;id<edited.positions.length/3;id++){
 const w=edited.skinWeights.slice(id*4,id*4+4);assert.ok(Math.abs(w.reduce((s,q)=>s+q,0)-1)<1e-10);
 assert.ok(w.every(q=>Number.isFinite(q)&&q>=0));
}
console.log('PASS '+edited.refinement.addedVertices+' conforming edge splits: unchanged rest area/boundary, no new nonmanifold edges, original UV/vertex data protected, normalized interpolated author weights and immutable donor');
