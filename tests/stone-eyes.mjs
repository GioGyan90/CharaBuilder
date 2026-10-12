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
let code=await fs.readFile(base+'anime.js','utf8');code=code.replace("'./stone-avatar.js?v=50'",JSON.stringify(moduleURL(base+'stone-avatar.js'))).replace("'./stone-body.js?v=34'",JSON.stringify(moduleURL(base+'stone-body.js'))).replace("'./stone-detail.js?v=32'",JSON.stringify(moduleURL(base+'stone-detail.js'))).replace("'./rig.js?v=50'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./parameters.js?v=50'",JSON.stringify(moduleURL(base+'parameters.js'))).replace("'./wardrobe.js?v=25'",JSON.stringify(moduleURL(base+'wardrobe.js'))).replace("'./underwear.js?v=50'",JSON.stringify(moduleURL(base+'underwear.js'))).replace("'./hair.js?v=50'",JSON.stringify(moduleURL(path.join(temp,'hair.mjs')))).replace("new URL('./assets/anime/', import.meta.url)",`new URL(${JSON.stringify(new URL('assets/anime/',distURL).href)})`);await fs.writeFile(path.join(temp,'model.mjs'),code);
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
const initial=createHuman(state),baseline=irisBounds(initial);assert.equal(initial.userData.headReference.headFaces,head.reference.headFaces);assert.ok(initial.children.some(m=>m.name.includes('EyeWhite')));disposeHuman(initial);
for(const change of [{eyeSize:0},{eyeSize:150},{eyeWidth:150},{eyeHeight:0},{eyeTilt:150},{eyeSpace:0}]){const model=createHuman({...state,...change}),bounds=irisBounds(model);for(let i=0;i<2;i++)for(let k=0;k<3;k++)assert.ok(Math.abs(bounds[i][k]-baseline[i][k])<1e-5,'eye editor stretched preset iris');play(model,0,'walk');play(model,.7,'walk');model.traverse(m=>{if(!m.isSkinnedMesh)return;for(const i of new Set(m.geometry.index.array))assert.ok(m.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i)).toArray().every(Number.isFinite));});disposeHuman(model);}
console.log('PASS reduced Stone head, exact original eye geometry/socket boundaries, runtime eye components and rigid iris across six eye edits');
await fs.rm(temp,{recursive:true,force:true});
