import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const distURL=new URL('../dist/',import.meta.url);
const base=fileURLToPath(distURL);
const moduleURL=path=>pathToFileURL(path).href;
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'charabuilder-modular-'));
let hair=await fs.readFile(base+'hair.js','utf8');hair=hair.replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js')));await fs.writeFile(path.join(temp,'hair.mjs'),hair);
let rig=await fs.readFile(base+'rig.js','utf8');rig=rig.replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js')));await fs.writeFile(path.join(temp,'rig.mjs'),rig);
let code=await fs.readFile(base+'anime.js','utf8');code=code.replace("'./stone-avatar.js?v=50'",JSON.stringify(moduleURL(base+'stone-avatar.js'))).replace("'./stone-body.js?v=34'",JSON.stringify(moduleURL(base+'stone-body.js'))).replace("'./stone-detail.js?v=32'",JSON.stringify(moduleURL(base+'stone-detail.js'))).replace("'./rig.js?v=50'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./parameters.js?v=55'",JSON.stringify(moduleURL(base+'parameters.js'))).replace("'./wardrobe.js?v=25'",JSON.stringify(moduleURL(base+'wardrobe.js'))).replace("'./underwear.js?v=50'",JSON.stringify(moduleURL(base+'underwear.js'))).replace("'./hair.js?v=55'",JSON.stringify(moduleURL(path.join(temp,'hair.mjs')))).replace("new URL('./assets/anime/', import.meta.url)",`new URL(${JSON.stringify(new URL('assets/anime/',distURL).href)})`);await fs.writeFile(path.join(temp,'model.mjs'),code);
global.fetch=async url=>{try{return new Response(await fs.readFile(new URL(url)),{status:200});}catch{return new Response('',{status:404});}};
const {loadHumanAssets,ensureHumanPresets,createHuman,disposeHuman}=await import(moduleURL(path.join(temp,'model.mjs')));
const {hairDefaults,hairChoices,hairRanges}=await import(moduleURL(path.join(temp,'hair.mjs')));
const {wardrobeDefaults}=await import(moduleURL(base+'wardrobe.js'));const {parameterDefaults}=await import(moduleURL(base+'parameters.js'));
await loadHumanAssets({textures:false});
const defaults={...parameterDefaults,...wardrobeDefaults,...hairDefaults,gender:'female',height:50,weight:45,shoulders:45,legs:50,faceWidth:50,jaw:45,eyeSize:50,eyeSpace:50,nose:50,mouth:50,hair:'modular',clothes:'shirtPants',expression:'neutral',skin:'#f1cbb2',hairColor:'#332821',shirt:'#d7c8b0',pants:'#343b50'};
const {updateCharacterMotion}=await import(moduleURL(path.join(temp,'rig.mjs')));
const THREE=await import(moduleURL(base+'vendor/three.module.js'));
let motion=await fs.readFile(base+'motion.js','utf8');motion=motion.replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./rig.js?v=50'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'./assets/motion/quaternius.js?v=26'",JSON.stringify(moduleURL(base+'assets/motion/quaternius.js')));await fs.writeFile(path.join(temp,'motion.mjs'),motion);
const {updateCharacterMotion:play,motionPresets}=await import(moduleURL(path.join(temp,'motion.mjs')));
const {default:library}=await import(moduleURL(base+'assets/motion/quaternius.js'));

import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
const read=async id=>{const root=base+'assets/anime/',manifest=JSON.parse(await fs.readFile(root+id+'-manifest.json'));return JSON.parse(gunzipSync(Buffer.from((await Promise.all(manifest.parts.map(p=>fs.readFile(root+p,'utf8')))).join(''),'base64')));};
const source=await read('male'),head=await read('stone-head');
assert.ok(head.reference.headFaces<1800);assert.ok(head.reference.headFaces<head.reference.previousStoneHeadFaces);assert.ok(head.reference.skinBoundaryProtected);
const coordinates=(mesh,g)=>[...new Set(g.indices)].map(i=>mesh.positions.slice(i*3,i*3+3).join(',')).sort();
for(const key of ['EyeWhite','EyeIris','EyeHighlight']){
 const a=source.meshes[0],b=head.meshes[0],ag=a.groups.find(g=>source.materials[g.material].name.includes(key)),bg=b.groups.find(g=>head.materials[g.material].name.includes(key));
 assert.equal(bg.indices.length,ag.indices.length);assert.deepEqual(coordinates(b,bg),coordinates(a,ag),'preset eye geometry changed '+key);
}
function eyeBoundary(data){const mesh=data.meshes[0],group=mesh.groups.find(g=>data.materials[g.material].name.includes('_SKIN')),edges=new Map();for(let t=0;t<group.indices.length;t+=3)for(let k=0;k<3;k++){const ids=[group.indices[t+k],group.indices[t+(k+1)%3]].sort((a,b)=>a-b),key=ids.join(',');edges.set(key,(edges.get(key)||0)+1);}return [...edges].filter(([key,n])=>n===1&&key.split(',').every(i=>mesh.positions[Number(i)*3+1]>=158300)).map(([key])=>key.split(',').map(i=>mesh.positions.slice(Number(i)*3,Number(i)*3+3).join(',')).sort().join('/')).sort();}
assert.deepEqual(eyeBoundary(head),eyeBoundary(source),'upper face/eye socket boundary changed');
const {stonePreset}=await import(moduleURL(base+'presets.js'));
const state={...defaults,...stonePreset};await ensureHumanPresets(state,{textures:false});
function irisBounds(model){const points=[[],[]];model.traverse(m=>{if(!m.isMesh||!m.name.includes('EyeIris'))return;for(const i of new Set(m.geometry.index.array)){const p=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i);points[p.x<0?0:1].push(p.toArray());}});return points.map(list=>{assert.ok(list.length>10);return [0,1,2].map(a=>Math.max(...list.map(p=>p[a]))-Math.min(...list.map(p=>p[a])));});}
const young=createHuman({...state,faceSource:'authored'}),youngIris=irisBounds(young);
const initial=createHuman(state),baseline=irisBounds(initial);assert.equal(initial.userData.headReference.headFaces,head.reference.headFaces);assert.ok(initial.children.some(m=>m.name.includes('EyeWhite')));disposeHuman(initial);
for(let i=0;i<2;i++)for(let k=0;k<3;k++)assert.ok(Math.abs(baseline[i][k]/youngIris[i][k]-.58)<.02,'mature iris should be smaller than youthful reference');
for(const irisSize of [0,100]){const m=createHuman({...state,irisSize}),bounds=irisBounds(m);for(let i=0;i<2;i++)for(let k=0;k<3;k++)assert.ok(Math.abs(bounds[i][k]/baseline[i][k]-(1+(irisSize-50)*.008))<.005,'iris ratio must scale isotropically');disposeHuman(m);}
const whiteShape=model=>{let p=[];model.traverse(m=>{if(!m.isMesh||!m.name.includes('EyeWhite'))return;for(const i of new Set(m.geometry.index.array)){const v=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i);if(v.x>0)p.push(v.toArray());}});return [0,1].map(a=>Math.max(...p.map(v=>v[a]))-Math.min(...p.map(v=>v[a])));};
const mature=createHuman(state),ys=whiteShape(young),ms=whiteShape(mature);assert.ok(ms[1]/ys[1]<.75,'mature eye should be narrower vertically');assert.ok(ms[0]/ms[1]>ys[0]/ys[1]*1.4,'mature eye should be more elongated');disposeHuman(mature);disposeHuman(young);
const {buildAnimeFace,deformAnimeFace}=await import(moduleURL(base+'face.js'));
const r=buildAnimeFace(head,'male','stone').landmarks.faceRig,yr=buildAnimeFace(head,'male',true).landmarks.faceRig;
for(const point of [[r.headX,r.eyeY-.01,r.nose[2]],[r.brows[1][0],r.brows[1][1]-.01,r.brows[1][2]]])assert.ok(deformAnimeFace(...point,state,r,'Face:skin')[2]>deformAnimeFace(...point,state,yr,'Face:skin')[2]+.005,'mature bridge/brow ridge must project beyond youthful reference');
for(const change of [{eyeSize:0},{eyeSize:150},{eyeWidth:150},{eyeHeight:0},{eyeTilt:150},{eyeSpace:0}]){const model=createHuman({...state,...change}),bounds=irisBounds(model);for(let i=0;i<2;i++)for(let k=0;k<3;k++)assert.ok(Math.abs(bounds[i][k]-baseline[i][k])<1e-5,'eye editor stretched preset iris');play(model,0,'walk');play(model,.7,'walk');model.traverse(m=>{if(!m.isSkinnedMesh)return;for(const i of new Set(m.geometry.index.array))assert.ok(m.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i)).toArray().every(Number.isFinite));});disposeHuman(model);}
// Every socket/white perimeter pair must stay coincident after large combined
// facial edits and after skinning, rather than merely producing finite points.
for(const bodySource of ['stone','vroid'])for(const faceSource of ['stone','authored','vroid'])for(const level of [-50,50,150]){
 const edited={...state,bodySource,faceSource,eyeSize:level,eyeWidth:level,eyeHeight:level,eyeVertical:level,eyeDepth:level,eyeTilt:level,eyeSpace:level,browRidge:level,noseProjection:level,cheekboneDepth:level,midFaceLength:level,lowerFaceLength:level};
 await ensureHumanPresets(edited,{textures:false});const model=createHuman(edited);
 const skin=model.children.find(m=>m.isMesh&&m.userData.part==='Face'&&m.name.includes('_SKIN'));
 const white=model.children.find(m=>m.isMesh&&m.name.includes('EyeWhite'));
 const boundary=mesh=>{const points=new Map(),edges=new Map(),q=mesh.geometry.attributes.position;const key=id=>[q.getX(id),q.getY(id),q.getZ(id)].map(v=>v.toFixed(6)).join(',');const index=mesh.geometry.index.array;for(const id of index)points.set(key(id),id);for(let k=0;k<index.length;k+=3)for(let e=0;e<3;e++){const edge=[key(index[k+e]),key(index[k+(e+1)%3])].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}return [...new Set([...edges].filter(([,n])=>n===1).flatMap(([edge])=>edge.split('|')))].map(k=>points.get(k));};
 const outer=boundary(skin),inner=boundary(white);assert.equal(inner.length,48,'white perimeter must remain a closed pair of 24-vertex loops');
 for(const mode of ['rest','walk']){play(model,.7,mode);const surface=outer.map(id=>skin.applyBoneTransform(id,new THREE.Vector3().fromBufferAttribute(skin.geometry.attributes.position,id)));
  for(const id of inner){const p=white.applyBoneTransform(id,new THREE.Vector3().fromBufferAttribute(white.geometry.attributes.position,id));assert.ok(surface.some(q=>q.distanceTo(p)<2e-6),'socket/white seam opened '+bodySource+'/'+faceSource+'/'+level+'/'+mode);}
 }disposeHuman(model);
}
const matureRig=buildAnimeFace(head,'male','stone').landmarks.faceRig,juvenileRig=buildAnimeFace(head,'male',false).landmarks.faceRig;
assert.ok(deformAnimeFace(...matureRig.eyes[1],state,matureRig,'Face:eye1')[1]>deformAnimeFace(...juvenileRig.eyes[1],state,juvenileRig,'Face:eye1')[1]+.008,'mature eyes must sit higher');
const midLength=rig=>deformAnimeFace(...rig.eyes[1],state,rig,'Face:eye1')[1]-deformAnimeFace(...rig.mouth,state,rig,'Face:mouth')[1];assert.ok(midLength(matureRig)>midLength(juvenileRig)+.010,'mature eye-to-mouth distribution must remain longer after raising lips');
console.log('PASS 18 combined face extremes with coincident socket/white seams in two poses; higher mature eyes and longer mid-face');
console.log('PASS reduced Stone head, exact original eye geometry/socket boundaries, distinct mature bridge/brow ridge, elongated eyes, smaller round iris and rigid iris across six eye edits');
await fs.rm(temp,{recursive:true,force:true});
