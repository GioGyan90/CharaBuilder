import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {adultStoneContourPoint,prepareAdultHead} from '../dist/adult-head.js';
const d=JSON.parse(gunzipSync(Buffer.from(await fs.readFile(new URL('../dist/assets/anime/adult-male-v81.b64',import.meta.url),'utf8'),'base64')));
const r=d.landmarks.faceRig,state={characterType:'man',foundationRevision:1,facePlaneSoftness:50},face=d.meshes.find(m=>m.name==='Face');
const sample=(x,y,z)=>[r.headX+x,y,z],move=p=>adultStoneContourPoint(p,r,state).map((v,k)=>v-p[k]);
const chin=move(sample(.014,r.chin+.016,.077)),jaw=move(sample(.041,r.chin+.035,.065)),oral=move(sample(.012,r.mouth[1]+.006,.087)),nose=move(sample(0,r.nose[1]+.001,.113));
assert.ok(chin[0]>.002&&chin[0]<.0035,'chin sides need broad support without cheek inflation');
assert.ok(jaw[0]>.0015&&jaw[0]<.0035,'mandibular body needs moderate widening');
assert.ok(oral[2]>.0015&&oral[2]<.0025,'oral support must move forward');
assert.ok(nose[2]<-.0015&&nose[2]>-.003,'nasal tip projection needs a small reduction');
const midCheek=move(sample(.038,r.nose[1]-.009,.065));
assert.ok(midCheek[0]>.0012&&midCheek[0]<.0025,'broad cheek plane needs modest lateral support');
assert.ok(midCheek[2]>.0020&&midCheek[2]<.0035,'maxillary plane needs continuous anterior volume');
for(const p of [sample(.055,r.eyeY-.025,.060),sample(.041,r.chin+.006,.065),sample(0,r.mouth[1]+.015,.087)]){
 const q=adultStoneContourPoint(p,r,state);
 assert.equal(q[1],p[1],'cheek support may not move orbital, jaw rim or philtrum height');
}

for(const p of [sample(0,r.chin-.020,.040),sample(.080,r.mouth[1],.030),sample(.030,r.eyeY,.076)])assert.ok(move(p).every(v=>Math.abs(v)<.000002),'collar, ear or orbit moved');
for(const p of [sample(.02,r.chin+.018,.077),sample(.035,r.mouth[1],.080),sample(.01,r.nose[1],.108)]){
 const reflected=[2*r.headX-p[0],p[1],p[2]],a=move(p),b=move(reflected);
 assert.ok(Math.abs(a[0]+b[0])<1e-12&&Math.abs(a[2]-b[2])<1e-12,'contour field must be bilateral');
 for(const foreign of [{...state,characterType:'boy'},{...state,foundationRevision:0},{...state,facePlaneSoftness:0}])assert.deepEqual(adultStoneContourPoint(p,r,foreign),p);
}
let moved=0,maxDelta=0;
const shaped=prepareAdultHead(d,state).meshes.find(m=>m.name==='Face');
assert.equal(shaped.positions.length,face.positions.length);
for(let i=0;i<face.positions.length;i+=3){const p=face.positions.slice(i,i+3).map(v=>v/1e5),delta=move(p);maxDelta=Math.max(maxDelta,Math.hypot(...delta));if(Math.hypot(...delta)>.00005)moved++;assert.equal(shaped.positions[i+1],face.positions[i+1],'mouth height and philtrum Y must stay fixed');}
assert.ok(moved>30&&maxDelta<.005,'contour correction is missing or excessive');
console.log('PASS Stone mandibular block, oral support, shorter nasal projection, fixed Y, bilateral field and foundation isolation',{chin,jaw,oral,nose,midCheek,moved,maxDelta});
