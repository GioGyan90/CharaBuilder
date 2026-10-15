import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {composeStoneReference,graftHead,reserveImportedEyes} from '../dist/stone-avatar.js';
import {stonePreset} from '../dist/presets.js';
const root=new URL('../dist/assets/anime/',import.meta.url);
async function load(name){const manifest=JSON.parse(await fs.readFile(new URL(name+'-manifest.json',root),'utf8'));const parts=await Promise.all(manifest.parts.map(p=>fs.readFile(new URL(p,root),'utf8')));return {...JSON.parse(gunzipSync(Buffer.from(parts.join(''),'base64'))),maps:[]};}
const body=await load('stone-ref'),head=await load('imported-00003'),donor={...head,meshes:head.meshes.filter(m=>m.name==='Face')};
const reference=composeStoneReference(body,stonePreset);
const before=graftHead(reference,donor,body,head,{neckProfile:true,headLift:.008}),after=graftHead(reference,donor,body,head,{neckProfile:true,headLift:.008,headForward:.028});
const rig=after.landmarks.faceRig,old=before.landmarks.faceRig;
for(const key of ['head','leftEye','rightEye'])assert.ok(Math.abs(after.landmarks[key][2]-before.landmarks[key][2]-.028)<1e-12);
assert.ok(Math.abs(rig.headZ-old.headZ-.028)<1e-12);
assert.deepEqual(after.meshes.find(m=>m.name==='Body').positions,before.meshes.find(m=>m.name==='Body').positions,'head translation moved the shoulders');
const source=donor.meshes[0],target=after.meshes.find(m=>m.name==='Face'),shift=after.landmarks.head.map((v,k)=>v-head.landmarks.head[k]);
const positions=target.positions,vertexKey=id=>positions.slice(id*3,id*3+3).join(','),triangles=new Map();
for(const g of target.groups)for(let i=0;i<g.indices.length;i+=3){const ids=g.indices.slice(i,i+3),keys=ids.map(vertexKey);triangles.set([...keys].sort().join('|'),keys);}
let checked=0;
for(const g of source.groups)for(let i=0;i<g.indices.length;i+=3){const p=g.indices.slice(i,i+3).map(id=>source.positions.slice(id*3,id*3+3).map(v=>v/1e5));
 // The chin underside must keep its donor winding, not be reoriented like a tube.
 if(!p.every(p=>p[1]>=1.493&&p[1]<=1.53&&p[2]>.015))continue;
 const expected=p.map(p=>p.map((v,k)=>Math.round((v+shift[k])*1e5)).join(',')),actual=triangles.get([...expected].sort().join('|'));
 if(!actual)continue;
 const start=actual.indexOf(expected[0]);assert.equal(actual[(start+1)%3],expected[1],'chin underside was turned inside out');checked++;
}
assert.ok(checked>=5,'underside regression did not cover enough donor faces');
console.log(`PASS forward landmarks and fixed shoulders; ${checked} chin-underside triangles retain donor winding`);

const snapshot=JSON.stringify(donor),reserved=reserveImportedEyes(donor),socket=reserved.meshes[0];
assert.equal(JSON.stringify(donor),snapshot,'socket construction mutated source');
const THREE=await import('../dist/vendor/three.module.js');
const v=id=>new THREE.Vector3(...socket.positions.slice(id*3,id*3+3).map(v=>v/1e5));
for(const eye of donor.landmarks.faceRig.eyes){
 const ray=new THREE.Ray(new THREE.Vector3(eye[0],eye[1],eye[2]+.1),new THREE.Vector3(0,0,-1));
 let nearest=-Infinity;
 for(const group of socket.groups)for(let i=0;i<group.indices.length;i+=3){const hit=ray.intersectTriangle(...group.indices.slice(i,i+3).map(v),false,new THREE.Vector3());if(hit)nearest=Math.max(nearest,hit.z);}
 assert.ok(Number.isFinite(nearest)&&nearest<eye[2]-.019,'eye center is still blocked by face surface');
 for(const dx of [-.017,-.012,0,.012,.017])for(const dy of [-.001,0,.001]){
  const probe=new THREE.Ray(new THREE.Vector3(eye[0]+dx,eye[1]+dy,eye[2]+.1),new THREE.Vector3(0,0,-1));let depth=-Infinity;
  for(const group of socket.groups)for(let i=0;i<group.indices.length;i+=3){const hit=probe.intersectTriangle(...group.indices.slice(i,i+3).map(v),false,new THREE.Vector3());if(hit)depth=Math.max(depth,hit.z);}
  assert.ok(depth>eye[2]-.03,'eye corner sees through the skull: '+[eye[0],dx,dy,depth]);
 }
}
for(let i=0;i<socket.skinWeights.length;i+=4)assert.ok(Math.abs(socket.skinWeights.slice(i,i+4).reduce((a,b)=>a+b,0)-1)<1e-8);
console.log('PASS both eye centers have recessed clearance, normalized weights and immutable source; donor triangles',socket.groups.reduce((n,g)=>n+g.indices.length/3,0));
