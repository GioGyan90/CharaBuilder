import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createAdultProfileSculpt} from '../dist/adult-profile.js';
import {composeStoneReference,reserveImportedEyes,addImportedFeatures,graftHead} from '../dist/stone-avatar.js';

const root=new URL('../dist/assets/anime/',import.meta.url);
async function asset(name){const m=JSON.parse(await fs.readFile(new URL(name+'-manifest.json',root),'utf8')),parts=await Promise.all(m.parts.map(p=>fs.readFile(new URL(p,root),'utf8')));const data=JSON.parse(gunzipSync(Buffer.from(parts.join(''),'base64')));data.maps=data.materials.map(()=>null);return data;}
const [body,head]=await Promise.all([asset('stone-ref'),asset('adult-male')]);
const originalBody=JSON.stringify(body.meshes.find(m=>m.name==='Body').positions),originalHead=JSON.stringify(head.meshes.find(m=>m.name==='Face').positions);
const state={characterType:'man',foundationRevision:1,bodySource:'stone',gender:'male',expression:'neutral',clothes:'underwear',frontHair:'none',sideHair:'none',backHair:'none',braid:'none'};
const recipient=composeStoneReference(body,state),donor=addImportedFeatures(reserveImportedEyes({...head,meshes:head.meshes.filter(m=>m.name==='Face')}),state);
const data=graftHead(recipient,donor,body,head,{neckProfile:true,trapeziusStructure:true,headLift:.008,headForward:.028});
assert.equal(JSON.stringify(body.meshes.find(m=>m.name==='Body').positions),originalBody,'source body asset mutated');
assert.equal(JSON.stringify(head.meshes.find(m=>m.name==='Face').positions),originalHead,'source head asset mutated');
const points=data.meshes.filter(m=>['Body','Face'].includes(m.name)).flatMap(m=>Array.from({length:m.positions.length/3},(_,i)=>m.positions.slice(i*3,i*3+3).map(v=>v/1e5)));
const profile=createAdultProfileSculpt(state,data.landmarks),r=data.landmarks.faceRig,l=data.landmarks;
let maxJawWiden=0,movedJaw=0;
for(const p of points){const q=profile(...p,p);assert.ok(q.every(Number.isFinite));assert.equal(q[1],p[1],'profile must preserve source height');if(p[1]>r.chin&&p[1]<r.chin+.080&&p[2]>l.neck[2]+.045){const d=Math.abs(q[0]-r.headX)-Math.abs(p[0]-r.headX);maxJawWiden=Math.max(maxJawWiden,d);if(d>.001)movedJaw++;}}
assert.ok(maxJawWiden>.003&&maxJawWiden<=.00401,'mandibular widening missing or excessive '+maxJawWiden);
assert.ok(movedJaw>10,'too few actual jaw samples widened');
const sample=[.05,l.neck[1]+.014,l.neck[2]+.018],q=profile(...sample,sample);
assert.ok(q[0]<sample[0]&&q[2]>sample[2],'upper neck must taper and advance slightly');
for(const character of [{characterType:'boy',foundationRevision:1},{characterType:'girl',foundationRevision:1},{characterType:'man',foundationRevision:0}]){const old=createAdultProfileSculpt({...state,...character},l);for(const p of points)assert.deepEqual(old(...p,p),p,'baseline leaked into another foundation');}
for(const p of [...r.eyes,...r.brows,r.nose,r.mouth,[.08,l.neck[1]+.13,-.02],[.25,l.neck[1]-.2,0],[.05,l.neck[1]-.3,.04]])assert.deepEqual(profile(...p,p),p,'profile moved protected face/limb/lower torso');
console.log('PASS adult mandibular widening, upper-neck taper, protected landmarks, fixed Y and foundation isolation',{maxJawWiden,movedJaw});
