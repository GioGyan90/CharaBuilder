import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
// Exclude only the new explicit root-fairing call from the baseline graft. Other
// graft work, including eye edits, must be identical on both sides of this check.
const dist=new URL('../dist/',import.meta.url);
let baseline=await fs.readFile(new URL('stone-avatar.js',dist),'utf8');
baseline=baseline.replaceAll('smoothAdultNeckRoot(data);','').replace(/'((?:\.\/)[^']+)'/g,(_,p)=>JSON.stringify(new URL(p,dist).href));
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'neck-check-v89-'));
await fs.writeFile(path.join(temp,'baseline.mjs'),baseline);
const {composeStoneReference,reserveImportedEyes,addImportedFeatures,graftHead}=await import(pathToFileURL(path.join(temp,'baseline.mjs')).href);
const helper=new URL('../dist/adult-neck-junction.js',import.meta.url).href;
const {smoothAdultNeckRoot}=await import(helper);
const root=new URL('assets/anime/',dist);
async function asset(name){const m=JSON.parse(await fs.readFile(new URL(name+'-manifest.json',root),'utf8')),parts=await Promise.all(m.parts.map(p=>fs.readFile(new URL(p,root),'utf8')));const data=JSON.parse(gunzipSync(Buffer.from(parts.join(''),'base64')));data.maps=data.materials.map(()=>null);return data;}
const [body,head]=await Promise.all([asset('stone-ref'),asset('adult-male')]),sourceBefore=JSON.stringify([body.meshes,head.meshes]);
const state={characterType:'man',foundationRevision:1,bodySource:'stone',gender:'male',expression:'neutral',clothes:'underwear',frontHair:'none',sideHair:'none',backHair:'none',braid:'none'};
const recipient=composeStoneReference(body,state),donor=addImportedFeatures(reserveImportedEyes({...head,meshes:head.meshes.filter(m=>m.name==='Face')}),state);
const data=graftHead(recipient,donor,body,head,{neckProfile:true,trapeziusStructure:true,headLift:.008,headForward:.028}),before=structuredClone(data);
smoothAdultNeckRoot(data);
assert.equal(JSON.stringify([body.meshes,head.meshes]),sourceBefore,'source asset mutated');
const neck=data.landmarks.neck[1],zc=data.landmarks.neck[2],chin=data.landmarks.faceRig.chin;
let triangles=0,changed=0,protectedCount=0,sourceYMoved=0;
for(let mi=0;mi<data.meshes.length;mi++){const mesh=data.meshes[mi],old=before.meshes[mi];assert.deepEqual(mesh.groups,old.groups,'topology changed');triangles+=mesh.groups.reduce((n,g)=>n+g.indices.length/3,0);assert.deepEqual(mesh.skinWeights,old.skinWeights);assert.deepEqual(mesh.skinIndices,old.skinIndices);for(let i=0;i<mesh.positions.length;i+=3){const p=old.positions.slice(i,i+3).map(v=>v/1e5),q=mesh.positions.slice(i,i+3).map(v=>v/1e5);assert.ok(q.every(Number.isFinite));if(q.some((v,k)=>v!==p[k]))changed++;if(q[1]!==p[1])sourceYMoved++;if(p[1]>=chin-.004&&p[2]>=zc+.050||p[1]<neck-.16||p[2]<=zc-.025){assert.deepEqual(q,p,'protected face/back/lower torso changed');protectedCount++;}}}
const key=(mesh,i)=>mesh.positions.slice(i*3,i*3+3).join(','),meshes=before.meshes.filter(m=>['Body','Face'].includes(m.name)),lookup=new Map();
for(const m of meshes)for(const id of new Set(m.groups.filter(g=>before.materials[g.material].name.includes('_SKIN')).flatMap(g=>g.indices))){const k=key(m,id);if(!lookup.has(k))lookup.set(k,[]);lookup.get(k).push([m.name,id]);}
let shared=0;for(const refs of lookup.values()){if(!refs.some(([n])=>n==='Body')||!refs.some(([n])=>n==='Face'))continue;shared++;const qs=refs.map(([name,id])=>data.meshes.find(m=>m.name===name).positions.slice(id*3,id*3+3));for(const q of qs)assert.deepEqual(q,qs[0],'shared seam cracked');const p=meshes.find(m=>m.name===refs[0][0]).positions.slice(refs[0][1]*3,refs[0][1]*3+3);assert.ok(qs[0][1]<=p[1],'shared collar moved above facial blend boundary');}
assert.ok(shared>100);
const curvature=input=>{const m=input.meshes.find(m=>m.name==='Body'),adj=new Map();for(const g of m.groups)for(let i=0;i<g.indices.length;i+=3)for(let k=0;k<3;k++){const a=g.indices[i+k],b=g.indices[i+(k+1)%3];if(!adj.has(a))adj.set(a,new Set());if(!adj.has(b))adj.set(b,new Set());adj.get(a).add(b);adj.get(b).add(a);}const values=[];for(const [id,near] of adj){const p=m.positions.slice(id*3,id*3+3).map(v=>v/1e5);const probe=before.meshes.find(m=>m.name==='Body').positions.slice(id*3,id*3+3).map(v=>v/1e5);if(Math.abs(probe[0])<.025||Math.abs(probe[0])>.09||probe[1]<neck-.10||probe[1]>neck-.025||probe[2]<zc+.020)continue;const mean=[0,1,2].map(k=>[...near].reduce((s,j)=>s+m.positions[j*3+k]/1e5,0)/near.size);values.push(Math.hypot(...p.map((v,k)=>v-mean[k])));}return {samples:values.length,rms:Math.sqrt(values.reduce((s,v)=>s+v*v,0)/values.length),max:Math.max(...values)};};
const report={...data.lowerNeckSmoothed,triangles,changed,protectedCount,sourceYMoved,exactSharedVertices:shared,curvatureBefore:curvature(before),curvatureAfter:curvature(data)};
assert.ok(report.curvatureAfter.rms<report.curvatureBefore.rms*.4,'neck-root bumps were not reduced');
assert.ok(report.curvatureAfter.max<.002,'a sharp collar bump remains');
const smoothed=JSON.stringify(data.meshes);smoothAdultNeckRoot(data);assert.equal(JSON.stringify(data.meshes),smoothed,'neck-root fairing is not idempotent');
await fs.writeFile(path.join(os.tmpdir(),'charamake-neck-root-report.json'),JSON.stringify(report,null,2));console.log('PASS welded neck-root smoothing, source immutability, topology/weight identity, exact seam, protected jaw/back',report);
await fs.rm(temp,{recursive:true,force:true});
