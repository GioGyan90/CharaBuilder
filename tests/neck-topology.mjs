import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {composeStoneReference,reserveImportedEyes,addImportedFeatures,graftHead} from '../dist/stone-avatar.js';
import {regularizeAdultNeckJunction} from '../dist/adult-neck-junction.js';

const assets=new URL('../dist/assets/anime/',import.meta.url);
async function load(name){const manifest=JSON.parse(await fs.readFile(new URL(name+'-manifest.json',assets),'utf8')),parts=await Promise.all(manifest.parts.map(p=>fs.readFile(new URL(p,assets),'utf8')));const data=JSON.parse(gunzipSync(Buffer.from(parts.join(''),'base64')));data.maps=data.materials.map(()=>null);return data;}
const [body,head]=await Promise.all([load('stone-ref'),load('adult-male')]),originalBody=JSON.stringify(body.meshes),originalHead=JSON.stringify(head.meshes);
const state={characterType:'man',foundationRevision:1,gender:'male',bodySource:'stone',faceSource:'imported00003',clothes:'underwear',shoes:'barefoot',expression:'neutral',frontHair:'none',sideHair:'none',backHair:'none',braid:'none'};
const donor=addImportedFeatures(reserveImportedEyes(head),state),data=graftHead(composeStoneReference(body,state),donor,body,head,{neckProfile:true,trapeziusStructure:true,headLift:.008,headForward:.028});
assert.equal(JSON.stringify(body.meshes),originalBody,'body source asset mutated');assert.equal(JSON.stringify(head.meshes),originalHead,'head source asset mutated');
assert.equal(data.neckTopology?.sectors,32);assert.equal(data.neckTopology.intermediateRows,4);assert.ok(data.neckSurfaceRegularized);
assert.equal(data.neckJunctionRegularized?.method,'shared-monotone-radial-hermite');assert.ok(data.neckJunctionRegularized.maxDisplacement<=.01200001);assert.ok(data.neckJunctionRegularized.sourceYPreserved);
const face=data.meshes.find(m=>m.name==='Face'),bod=data.meshes.find(m=>m.name==='Body'),primary=face.groups.find(g=>data.materials[g.material].name.includes('Imported00003_Face_SKIN'));
assert.ok(face.groups.reduce((s,g)=>s+g.indices.length/3,0)>1600);assert.ok(face.groups.reduce((s,g)=>s+g.indices.length/3,0)<3600,'adult neck+face budget unexpectedly grew');
const key=(m,id)=>m.positions.slice(id*3,id*3+3).join(',');
function edges(m,groups){const out=new Map();for(const g of groups)for(let i=0;i<g.indices.length;i+=3)for(let j=0;j<3;j++){const a=key(m,g.indices[i+j]),b=key(m,g.indices[i+(j+1)%3]);if(a===b)continue;const k=[a,b].sort().join('|');out.set(k,(out.get(k)||0)+1);}return out;}
const fe=edges(face,[primary]),be=edges(bod,bod.groups.filter(g=>data.materials[g.material].name.includes('_SKIN'))),neck=data.landmarks.neck[1],chin=data.landmarks.faceRig.chin,zc=data.landmarks.neck[2];
const collar=[...be].filter(([k,n])=>n===1&&k.split('|').every(p=>Number(p.split(',')[1])/1e5>neck-.075));assert.ok(collar.length>12);
for(const [k] of collar)assert.equal(fe.get(k),1,'shared collar edge was not preserved exactly');
for(const [k,n] of fe)if(n===1&&k.split('|').some(p=>Number(p.split(',')[1])/1e5<chin-.006))assert.ok(be.has(k),'new low-neck boundary hole');
for(const mesh of [face,bod]){assert.ok(mesh.positions.every(Number.isFinite));for(const g of mesh.groups)for(const id of g.indices)assert.ok(Number.isInteger(id)&&id>=0&&id<mesh.positions.length/3);for(let i=0;i<mesh.skinWeights.length;i+=4)assert.ok(Math.abs(mesh.skinWeights.slice(i,i+4).reduce((a,b)=>a+b,0)-1)<1e-6);}
const clone=structuredClone(data);delete clone.neckJunctionRegularized;const before=clone.meshes.map(m=>[...m.positions]);regularizeAdultNeckJunction(clone);
let protectedCount=0;for(let k=0;k<clone.meshes.length;k++){const m=clone.meshes[k],p=before[k];for(let i=0;i<p.length;i+=3){assert.equal(m.positions[i+1],p[i+1],'radial junction changed source Y');const [x,y,z]=p.slice(i,i+3).map(v=>v/1e5),guarded=(y>chin-.002&&z>zc+.045)||(y>chin+.01&&Math.abs(x)>.074);if(guarded&&['Body','Face'].includes(m.name)){assert.deepEqual(m.positions.slice(i,i+3),p.slice(i,i+3),'radial junction moved protected jaw/ear');protectedCount++;}}}assert.ok(protectedCount>100);
const repeat=JSON.stringify(clone.meshes);regularizeAdultNeckJunction(clone);assert.equal(JSON.stringify(clone.meshes),repeat,'junction is not idempotent');

const sub=(a,b)=>a.map((v,k)=>v-b[k]),dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function segmentHit(a,b,p){const d=sub(b,a),e1=sub(p[1],p[0]),e2=sub(p[2],p[0]),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-14)return false;const s=sub(a,p[0]),u=dot(s,h)/det;if(u<=1e-5||u>=1-1e-5)return false;const q=cross(s,e1),v=dot(d,q)/det;if(v<=1e-5||u+v>=1-1e-5)return false;const t=dot(e2,q)/det;return t>1e-5&&t<1-1e-5;}
const triangles=[];for(let i=0;i<primary.indices.length;i+=3){const ids=primary.indices.slice(i,i+3),p=ids.map(id=>face.positions.slice(id*3,id*3+3).map(v=>v/1e5)),c=p[0].map((v,k)=>(v+p[1][k]+p[2][k])/3);if(c[1]>neck+.095||Math.abs(c[0])<.02||Math.abs(c[0])>.10)continue;triangles.push({ids,p,b:[0,1,2].map(k=>[Math.min(...p.map(v=>v[k])),Math.max(...p.map(v=>v[k]))])});}
let intersections=0;for(let i=0;i<triangles.length;i++)for(let j=i+1;j<triangles.length;j++){const a=triangles[i],b=triangles[j];if(a.ids.some(id=>b.ids.includes(id))||a.b.some((v,k)=>v[0]>=b.b[k][1]||v[1]<=b.b[k][0]))continue;if([0,1,2].some(k=>segmentHit(a.p[k],a.p[(k+1)%3],b.p)||segmentHit(b.p[k],b.p[(k+1)%3],a.p)))intersections++;}
assert.equal(intersections,0,'neck contains nonadjacent interior self-intersections');
console.log('PASS adult neck exact collar edges, closed lower shell, indices, weights, source assets, face budget, protected jaw/ears, radial Y/cap/idempotence and source self-intersections',{faceTriangles:face.groups.reduce((s,g)=>s+g.indices.length/3,0),collarEdges:collar.length,protectedCount,intersections});
