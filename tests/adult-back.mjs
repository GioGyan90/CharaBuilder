import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {adultBackKeys,createAdultBackSculpt} from '../dist/adult-back.js';
import {refineTrapezius} from '../dist/stone-avatar.js';

const root=new URL('../dist/assets/anime/',import.meta.url);
const manifest=JSON.parse(await fs.readFile(new URL('stone-ref-manifest.json',root),'utf8'));
const encoded=await Promise.all(manifest.parts.map(p=>fs.readFile(new URL(p,root),'utf8')));
const body=JSON.parse(gunzipSync(Buffer.from(encoded.join(''),'base64')));
const mesh=body.meshes.find(m=>m.name==='Body'),l=body.landmarks;
const adult={characterType:'man',foundationRevision:1,bodySource:'stone'};
const stats={};
for(const key of adultBackKeys){
 const low=createAdultBackSculpt({...adult,[key]:0},l),high=createAdultBackSculpt({...adult,[key]:100},l);
 let displacement=0;
 for(let i=0;i<mesh.positions.length;i+=3){const p=mesh.positions.slice(i,i+3).map(v=>v/1e5),a=low(...p,p),b=high(...p,p);displacement=Math.max(displacement,Math.hypot(...a.map((v,k)=>v-b[k])));}
 assert.ok(displacement>.003,key+' does not affect supplied Stone body');stats[key]=Number(displacement.toFixed(5));
}
const strong=Object.fromEntries(adultBackKeys.map(k=>[k,200])),deform=createAdultBackSculpt({...adult,...strong},l);
const protectedPoints=[[0,l.neck[1],-.03],[.04,l.neck[1]+.15,.06],[.06,l.neck[1]-.25,.08],[.28,l.neck[1]-.30,-.02],[.08,l.hips[1]-.20,-.07]];
for(const p of protectedPoints)assert.deepEqual(deform(...p,p),p,'new back controls moved head/collar/chest/forearm/legs');
for(const characterType of ['boy','girl']){const sculpt=createAdultBackSculpt({...adult,characterType,...strong},l);for(let i=0;i<mesh.positions.length;i+=3){const p=mesh.positions.slice(i,i+3).map(v=>v/1e5);assert.deepEqual(sculpt(...p,p),p,'adult structure leaked into '+characterType);}}
for(let i=0;i<mesh.positions.length;i+=3){const p=mesh.positions.slice(i,i+3).map(v=>v/1e5);assert.ok(deform(...p,p).every(Number.isFinite));}

// Dorsal support edges must propagate into the neighbour outside the selected region.
const patch={positions:[5000,122000,-7000,15000,122000,-7000,15000,117000,-7000,5000,117000,-7000],normals:Array(12).fill(0),uv:[0,0,1,0,1,1,0,1],skinIndices:Array(16).fill(0),skinWeights:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],faceRegions:Array(4).fill('Body'),groups:[{indices:[0,1,2,0,2,3]}]};
refineTrapezius(patch,1.45,{back:true,hip:.9});
assert.ok(patch.trapeziusSupportVertices>0,'dorsal region did not gain support vertices');
const edges=new Map();let area=0;
for(const g of patch.groups)for(let i=0;i<g.indices.length;i+=3){const t=g.indices.slice(i,i+3),p=t.map(id=>patch.positions.slice(id*3,id*3+3));const signed=(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[2][0]-p[0][0])*(p[1][1]-p[0][1]);assert.ok(signed<0,'subdivision flipped triangle winding');area+=Math.abs(signed)/2;for(let k=0;k<3;k++){const key=[t[k],t[(k+1)%3]].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);}}
assert.ok(Math.abs(area-10000*5000)<15000,'support subdivision changed source surface area');
for(const [key,n] of edges){assert.ok(n===1||n===2,'non-manifold new edge');if(n===1){const [a,b]=key.split(',').map(Number),p=patch.positions.slice(a*3,a*3+3),q=patch.positions.slice(b*3,b*3+3);assert.ok((p[0]===q[0]&&[5000,15000].includes(p[0]))||(p[1]===q[1]&&[117000,122000].includes(p[1])),'new internal open edge');}}
for(let i=0;i<patch.skinWeights.length;i+=4)assert.ok(Math.abs(patch.skinWeights.slice(i,i+4).reduce((a,b)=>a+b,0)-1)<1e-8);
console.log('PASS Stone back controls, protected anatomy, foundation isolation, dorsal edge conformity and skin weights',stats);
