import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {adultNeckKeys,createAdultNeckSculpt} from '../dist/adult-neck.js';
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
const stats={};
for(const key of [...adultNeckKeys,'neckTendon']){
 const low=createAdultNeckSculpt({...state,[key]:0},data.landmarks),high=createAdultNeckSculpt({...state,[key]:100},data.landmarks);
 let moved=0;for(const p of points){const a=low(...p,p),b=high(...p,p);moved=Math.max(moved,Math.hypot(...a.map((v,k)=>v-b[k])));}
 assert.ok(moved>.002,key+' must deform the actual grafted neck');stats[key]=Number(moved.toFixed(5));
}
for(const character of [{characterType:'boy',foundationRevision:1},{characterType:'girl',foundationRevision:1},{characterType:'man',foundationRevision:0}]){
 const sculpt=createAdultNeckSculpt({...state,...character,...Object.fromEntries([...adultNeckKeys,'neckTendon'].map(k=>[k,100]))},data.landmarks);
 for(const p of points)assert.deepEqual(sculpt(...p,p),p,'new neck leaked into '+JSON.stringify(character));
}
const sculpt=createAdultNeckSculpt({...state,...Object.fromEntries(adultNeckKeys.map(k=>[k,200])),neckTendon:200},data.landmarks),neck=data.landmarks.neck[1];
for(const p of [[.035,neck+.15,.08],[.04,neck+.20,-.07],[.27,neck-.20,0],[.1,neck-.4,.09]])assert.deepEqual(sculpt(...p,p),p,'neck sculpt moved protected skull/limb/lower torso');
for(const p of points)assert.ok(sculpt(...p,p).every(Number.isFinite));
assert.ok(data.neckSurfaceRegularized,'neck fairing not applied');
if(data.neckTopology)assert.equal(data.neckTopology.sectors,32);
console.log('PASS actual-neck structure controls, upper/lower regions, foundation isolation, finite extremes and immutable source assets',stats);
