import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {composeStoneReference} from '../dist/stone-avatar.js';
import {stonePreset} from '../dist/experimental.js';
const root=new URL('../dist/assets/anime/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('stone-ref-manifest.json',root)));
const data=JSON.parse(gunzipSync(Buffer.from((await Promise.all(manifest.parts.map(p=>fs.readFile(new URL(p,root),'utf8')))).join(''),'base64')));
const ids=new Map(),vertices=[],weights=[],edges=new Map(),triangles=new Set();let faces=0;
for(const mesh of data.meshes.filter(m=>['Body','Face'].includes(m.name))){
 const map=[];
 for(let i=0;i<mesh.positions.length/3;i++){
  const key=mesh.positions.slice(i*3,i*3+3).join(',');
  const attributes=[...mesh.skinIndices.slice(i*4,i*4+4),...mesh.skinWeights.slice(i*4,i*4+4),...mesh.normals.slice(i*3,i*3+3)];
  if(ids.has(key)){const j=ids.get(key);assert.deepEqual(attributes,weights[j],'body/face seam attributes differ');map[i]=j;}
  else{const j=vertices.length;ids.set(key,j);vertices.push(mesh.positions.slice(i*3,i*3+3).map(v=>v/1e5));weights.push(attributes);map[i]=j;}
 }
 for(const group of mesh.groups)for(let t=0;t<group.indices.length;t+=3){
  const tri=group.indices.slice(t,t+3).map(i=>map[i]);assert.equal(new Set(tri).size,3,'collapsed triangle');const key=[...tri].sort((a,b)=>a-b).join(',');assert.ok(!triangles.has(key),'duplicate face');triangles.add(key);faces++;
  for(let k=0;k<3;k++){const a=tri[k],b=tri[(k+1)%3],key=a<b?a+','+b:b+','+a;const edge=edges.get(key)||{count:0,winding:0};edge.count++;edge.winding+=a<b?1:-1;edges.set(key,edge);}
 }
}
for(const edge of edges.values()){assert.equal(edge.count,2,'open or non-manifold edge');assert.equal(edge.winding,0,'adjacent triangles have opposite surface orientation');}
assert.equal(faces,data.reference.surfaceRepair.skinFaces);assert.ok(faces<35000);assert.ok(vertices.length<18000);
const plain=composeStoneReference(data,stonePreset),selected=composeStoneReference(data,{...stonePreset,frontHair:'stoneRef',backHair:'stoneRef',sideHair:'stoneRef'});
for(const result of [plain,selected])assert.ok(!result.meshes.some(m=>m.name.startsWith('Hair')||m.name==='FaceEyes'),'surface study still contains eye/hair overlays');
assert.equal(stonePreset.stoneView,'clay');assert.equal(data.materials[1].double,false,'double-sided rendering masks topology faults');
console.log(`PASS ${faces} skin triangles: closed manifold, consistent winding, no duplicate faces, identical seam normals/weights; clay study hides eyes and hair`);

if(data.reference.bodyWidthScale&&!data.reference.turnaroundFit){
 const head=data.meshes.find(m=>m.name==='Face');
 assert.equal(createHash('sha256').update(JSON.stringify(head.positions)).digest('hex'),'b89e02d632a177b1144519c652f351aae9286674e4ba75a14cb27458a9f9fdce','narrowing or simplification moved the v42 head');
 assert.equal(head.groups[0].indices.length/3,2239);assert.ok(faces<13000,'low-poly skin budget exceeded');
 console.log('PASS v42 head positions unchanged and low-poly skin budget below 13000 triangles');
}

if(data.reference.turnaroundFit){assert.equal(data.meshes.find(m=>m.name==='Face').groups[0].indices.length/3,2239);assert.ok(faces<13000);assert.ok(!plain.meshes.some(m=>m.name==='UnderwearTop'),'proportion fit misclassifies male underwear');console.log('PASS turnaround fit preserves low-poly budget and male underwear');}

if(data.reference.neckShoulderFit&&!data.reference.headLoweringFit){
 const protectedPositions=[];
 for(const m of data.meshes.filter(m=>['Body','Face'].includes(m.name)))for(let i=0;i<m.positions.length;i+=3){
  const p=m.positions.slice(i,i+3);
  if(p[1]>=150500||p[1]<=125000||Math.abs(p[0])>=23000)protectedPositions.push(...p);
 }
 assert.equal(createHash('sha256').update(JSON.stringify(protectedPositions)).digest('hex'),data.reference.neckShoulderFit.protectedGeometrySha256,'neck refinement altered the upper head, lower body or outer arms');
 console.log('PASS neck refinement preserves upper head, lower body and outer arm coordinates');
}

if(data.reference.headLoweringFit&&!data.reference.baldFairing){
 const protectedPositions=[];
 for(const m of data.meshes.filter(m=>['Body','Face'].includes(m.name)))for(let i=0;i<m.positions.length;i+=3){const p=m.positions.slice(i,i+3);if(p[1]<=125000||Math.abs(p[0])>=23000)protectedPositions.push(...p);}
 assert.equal(createHash('sha256').update(JSON.stringify(protectedPositions)).digest('hex'),data.reference.headLoweringFit.protectedBodySha256,'head lowering altered lower body or outer arms');
 console.log('PASS marked neck/head fit preserves lower body and outer arms');
}

if(data.reference.baldFairing&&!data.reference.jawProportionFit){const lower=[];for(const m of data.meshes.filter(m=>['Body','Face'].includes(m.name)))for(let i=0;i<m.positions.length;i+=3)if(m.positions[i+1]<=125000)lower.push(...m.positions.slice(i,i+3));assert.equal(createHash('sha256').update(JSON.stringify(lower)).digest('hex'),data.reference.baldFairing.protectedLowerBodySha256);assert.equal(stonePreset.frontHair,'none');assert.equal(stonePreset.backHair,'none');assert.equal(stonePreset.sideHair,'none');assert.equal(stonePreset.braid,'none');console.log('PASS local fairing preserves lower body and defaults to bald');}

if(data.reference.jawProportionFit){
 const fit=data.reference.jawProportionFit,body=data.meshes.find(m=>m.name==='Body'),low=[];
 for(let i=0;i<body.positions.length;i+=3)if(body.positions[i+1]<=125000)low.push(body.positions.slice(i,i+3).map(v=>v/1e5));
 const bounds=[ [0,1,2].map(a=>Math.min(...low.map(p=>p[a]))),[0,1,2].map(a=>Math.max(...low.map(p=>p[a]))) ];
 for(let b=0;b<2;b++)for(let a=0;a<3;a++)assert.ok(Math.abs(bounds[b][a]-fit.lowerBodyBoundsBefore[b][a]*(a===0?fit.bodyWidthScale:1))<1e-5,'frontal narrowing changed body height or depth');
 assert.equal(stonePreset.frontHair,'none');assert.equal(stonePreset.backHair,'none');assert.equal(stonePreset.sideHair,'none');assert.equal(stonePreset.braid,'none');
 console.log('PASS jaw/proportion fit narrows body width while preserving height, depth and bald defaults');
}
