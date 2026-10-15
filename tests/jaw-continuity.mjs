import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {buildAnimeFace,deformAnimeFace} from '../dist/face.js';
import {parameterDefaults} from '../dist/parameters.js';

const root=new URL('../dist/assets/anime/',import.meta.url);
const manifest=JSON.parse(await fs.readFile(new URL('stone-head-manifest.json',root)));
const head=JSON.parse(gunzipSync(Buffer.from((await Promise.all(manifest.parts.map(p=>fs.readFile(new URL(p,root),'utf8')))).join(''),'base64')));
const face=buildAnimeFace(head,'male','stone'),rig=face.landmarks.faceRig,mesh=face.meshes[0];
const point=i=>mesh.positions.slice(i*3,i*3+3).map(v=>v/100000);
const delta=(p,key,value=150)=>{
 const a=deformAnimeFace(...p,parameterDefaults,rig),b=deformAnimeFace(...p,{...parameterDefaults,[key]:value},rig);
 return b.map((v,i)=>v-a[i]);
};
// Actual Stone vertices on the same mandibular side wall: the posterior
// corner used to be pinned while the anterior body moved almost 2 cm.
const rear=point(548),front=point(585);
const rearWidth=delta(rear,'jawWidth')[0],frontWidth=delta(front,'jawWidth')[0];
assert.ok(rearWidth>frontWidth*.5,`posterior mandible pinned: rear=${rearWidth}, front=${frontWidth}`);
assert.ok(Math.abs(delta(rear,'jawDepth')[2])>.006,'posterior depth control has no useful support');
assert.ok(Math.hypot(...delta(rear,'jawTilt'))>.002,'posterior tilt was masked out');
// Angularity changes the corner/body ratio, rather than duplicating width.
const ratio=p=>delta(p,'jawAngle')[0]/delta(p,'jawWidth')[0];
assert.ok(ratio(rear)>ratio(front)*1.4,'corner control is just another width slider');
for(const key of ['jawWidth','jawDepth','jawHeight','jawAngle','jawTilt']){
 for(const p of [[rig.headX,rig.chin+.03,rig.headZ-.03],[.05,rig.eyeY-.02,.06],rig.mouth])
  assert.deepEqual(delta(p,key),[0,0,0],key+' moved protected neck, upper face or lips');
 for(let value=-50;value<150;value+=5){
  const a=delta(rear,key,value),b=delta(rear,key,value+5);
  assert.ok(Math.hypot(...b.map((v,i)=>v-a[i]))<.0015,key+' jumps during continuous editing');
 }
}
console.log('PASS real Stone posterior mandible coverage, independent corner shape and continuous controls', {rearWidth,frontWidth});

// Ear extraction duplicates shared vertices across meshes. Identical source
// positions must continue to receive identical transforms, including UV seams.
const cases=[{}, {jawWidth:150,jawTilt:-50}, {jawWidth:-50,jawTilt:150},
 {lowerFaceLength:150,chinSize:150}, {cheekboneWidth:150,jawHeight:-50}];
for(const key of ['jawWidth','jawDepth','jawHeight','jawAngle','jawTilt'])
 for(let value=-50;value<=150;value+=10)cases.push({[key]:value});
for(const edit of cases){
 const shared=new Map();let duplicateCount=0;
 for(const part of face.meshes){
  const ids=[...new Set(part.groups.filter(g=>face.materials[g.material].name.includes('_SKIN')).flatMap(g=>g.indices))];
  for(const id of ids){
   const p=part.positions.slice(id*3,id*3+3).map(v=>v/100000);
   const q=deformAnimeFace(...p,{...parameterDefaults,...edit},rig,part.faceRegions[id]);
   assert.ok(q.every(Number.isFinite),'nonfinite skin/ear position');
   const key=p.join(',');if(shared.has(key)){assert.deepEqual(q,shared.get(key),'UV or ear interface cracked');duplicateCount++;}else shared.set(key,q);
  }
 }
 assert.ok(duplicateCount>10,'seam audit did not exercise duplicated skin vertices');
}
console.log('PASS 110 default, sampled-control and mixed cases with finite coordinates and coincident skin/ear source seams');
