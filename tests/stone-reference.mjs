import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createDeformer} from '../dist/parameters.js';
import {composeStoneReference} from '../dist/stone-avatar.js';
import {stonePreset} from '../dist/experimental.js';
const root=new URL('../dist/assets/anime/',import.meta.url),m=JSON.parse(await fs.readFile(new URL('stone-ref-manifest.json',root)));
const txt=(await Promise.all(m.parts.map(p=>fs.readFile(new URL(p,root),'utf8')))).join('');
const source=JSON.parse(gunzipSync(Buffer.from(txt,'base64')));
assert.equal(source.reference.faces,22000);assert.ok(source.reference.vertices<12000);assert.equal(source.stoneRebuilt,true);
const composed=composeStoneReference(source,stonePreset);const f=createDeformer(stonePreset,composed.landmarks,1);let count=0;
for(const mesh of source.meshes)for(let i=0;i<mesh.positions.length;i+=3){const p=mesh.positions.slice(i,i+3).map(v=>v/1e5),q=f(...p,mesh.name==='Face'?'Face:skin':'Body');assert.ok(Math.max(...q.map((v,k)=>Math.abs(v-p[k]-(k===1?.001:0))))<1e-10,'old Stone sculpt altered the new neutral foundation');count++;const w=mesh.skinWeights.slice(i/3*4,i/3*4+4);assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-9);}
for(const key of ['ribWidth','pecVolume','scapulaVolume','gluteVolume','thighDepth','calfDepth','kneeWidth']){
 const low=createDeformer({...stonePreset,[key]:-100},source.landmarks,1),high=createDeformer({...stonePreset,[key]:200},source.landmarks,1);let moved=0;
 for(const mesh of source.meshes)for(let i=0;i<mesh.positions.length;i+=33){const p=mesh.positions.slice(i,i+3).map(v=>v/1e5);if(p.length<3)continue;const a=low(...p,'Body'),b=high(...p,'Body');assert.ok(a.every(Number.isFinite)&&b.every(Number.isFinite));moved=Math.max(moved,Math.hypot(...a.map((v,k)=>v-b[k])));}
 assert.ok(moved>.005,key+' inactive');
}
console.log('PASS neutral user-reference geometry unchanged across '+count+' vertices, normalized weights, low polygon budget and seven new body dimensions across -100..200');
const armBones=new Set(Object.entries(source.rig.humanoid).filter(([k])=>/Arm|Hand|Thumb|Index|Middle|Ring|Little/.test(k)).map(([,i])=>i));
const body=source.meshes.find(m=>m.name==='Body');let checked=0;
for(let i=0;i<body.positions.length/3;i++){
 const x=Math.abs(body.positions[i*3]/1e5),y=body.positions[i*3+1]/1e5;
 if(y>=1.04||y<=.59)continue;
 const arm=body.skinIndices.slice(i*4,i*4+4).reduce((s,j,k)=>s+(armBones.has(j)?body.skinWeights[i*4+k]:0),0);
 assert.ok(x<.25?arm<1e-8:arm>1-1e-8,'hand/hip skin ownership crossed the anatomical gap');checked++;
}
for(const eye of [source.landmarks.leftEye,source.landmarks.rightEye])assert.ok(eye[1]<1.58&&eye[2]<.11,'eye anchor outside supplied socket');
const whites=composed.meshes.filter(m=>m.groups.some(g=>composed.materials[g.material].name==='StoneEyeWhite'));
for(const m of whites){assert.equal(m.positions.length/3,129);const zs=m.positions.filter((_,i)=>i%3===2);assert.ok(Math.max(...zs)-Math.min(...zs)>300,'sclera is still a flat floating decal');}
console.log('PASS '+checked+' hand/hip ownership vertices, measured socket anchors and curved sclera');
for(const m of source.meshes)for(let i=0;i<m.positions.length/3;i++)if(m.positions[i*3+1]/1e5>1.46){const head=m.skinIndices.slice(i*4,i*4+4).reduce((s,j,k)=>s+(j===source.rig.humanoid.head?m.skinWeights[i*4+k]:0),0);assert.ok(head>1-1e-9,'face/head skin does not follow its eyes rigidly');}
console.log('PASS rigid head binding preserves eye/eyelid contact during head motion');
