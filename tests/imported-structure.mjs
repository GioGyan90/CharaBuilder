import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {deformImportedFace,importedFaceWeights,importedFaceRegion} from '../dist/imported-face.js';
import {faceAdjustmentKeys} from '../dist/parameters.js';
const asset=JSON.parse(gunzipSync(Buffer.from(await fs.readFile(new URL('../dist/assets/anime/imported-00003.b64',import.meta.url),'utf8'),'base64')));
const raw=asset.meshes.find(m=>m.name==='Face'),rig=asset.landmarks.faceRig;
const points=Array.from({length:raw.positions.length/3},(_,i)=>raw.positions.slice(i*3,i*3+3).map(v=>v/1e5));
const counts={};for(const p of points){const id=importedFaceRegion(...p,rig).id;counts[id]=(counts[id]||0)+1;assert.deepEqual(deformImportedFace(...p,{},rig),p);}
for(const d of rig.structure.domains)assert.ok(counts[d.id]>4,`${d.id} has no usable surface region`);
const controls={forehead:'frontal',templeWidth:'temporal',browRidge:'brow',eyeDepth:'orbit',cheekboneDepth:'zygoma',noseProjection:'nasal',maxillaDepth:'maxilla',jawDepth:'mandible',chinProjection:'chin',mouthProjection:'lip'};
for(const [key,domain] of Object.entries(controls)){
 let moved=0,outside=0;
 for(const p of points){const q=deformImportedFace(...p,{[key]:100},rig),distance=Math.hypot(...q.map((v,k)=>v-p[k]));moved=Math.max(moved,distance);if(importedFaceWeights(...p,rig).weights[domain]===0)outside=Math.max(outside,distance);}
 assert.ok(moved>.002,`${key} has no useful effect`);assert.equal(outside,0,`${key} leaked outside its structural domain`);
}
// All fields pin the collar and remain translation-invariant when grafted to a body.
const all=Object.fromEntries(Object.keys(controls).map(k=>[k,85]));
for(const p of points.filter(p=>p[1]===1.46465))assert.deepEqual(deformImportedFace(...p,all,rig),p);
const offset=[.03,.2,-.04],point=p=>p.map((v,i)=>v+offset[i]);
const shifted={...rig,headX:rig.headX+offset[0],headZ:rig.headZ+offset[2],eyeY:rig.eyeY+offset[1],eyes:rig.eyes.map(point),brows:rig.brows.map(point),mouth:point(rig.mouth)};
for(const p of points){const a=point(deformImportedFace(...p,all,rig)),b=deformImportedFace(...point(p),all,shifted);assert.ok(a.every((v,i)=>Math.abs(v-b[i])<1e-12));}
const cross=(a,b,c)=>{const u=b.map((v,i)=>v-a[i]),w=c.map((v,i)=>v-a[i]);return [u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];};
const triangles=raw.groups.flatMap(g=>Array.from({length:g.indices.length/3},(_,i)=>g.indices.slice(i*3,i*3+3))),normals=triangles.map(t=>cross(...t.map(i=>points[i])));
const cases=faceAdjustmentKeys.flatMap(key=>[0,100].map(value=>({[key]:value})));
cases.push({jawWidth:75,jawDepth:65,chinProjection:60,maxillaDepth:60},{eyeSize:65,eyeVertical:55,browRidge:60,cheekboneWidth:65});
for(const state of cases){const edited=points.map(p=>deformImportedFace(...p,state,rig));for(let i=0;i<triangles.length;i++){const n=cross(...triangles[i].map(id=>edited[id]));assert.ok(n.reduce((s,v,k)=>s+v*normals[i][k],0)>=-1e-16,`triangle turned inside out: ${JSON.stringify(state)}`);}}
console.log('PASS 11 occupied surface domains, neutral identity, 10 isolated edit fields, protected collar and body-graft translation');
console.log('PASS single-control endpoints and two combined structural edits preserve triangle orientation');
console.log(counts);
