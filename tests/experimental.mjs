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
let code=await fs.readFile(base+'anime.js','utf8');code=code.replace("'./rig.js?v=28'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./parameters.js?v=31'",JSON.stringify(moduleURL(base+'parameters.js'))).replace("'./wardrobe.js?v=25'",JSON.stringify(moduleURL(base+'wardrobe.js'))).replace("'./underwear.js?v=16'",JSON.stringify(moduleURL(base+'underwear.js'))).replace("'./hair.js?v=16'",JSON.stringify(moduleURL(path.join(temp,'hair.mjs')))).replace("new URL('./assets/anime/', import.meta.url)",`new URL(${JSON.stringify(new URL('assets/anime/',distURL).href)})`);await fs.writeFile(path.join(temp,'model.mjs'),code);
global.fetch=async url=>{try{return new Response(await fs.readFile(new URL(url)),{status:200});}catch{return new Response('',{status:404});}};
const {loadHumanAssets,ensureHumanPresets,createHuman,disposeHuman}=await import(moduleURL(path.join(temp,'model.mjs')));
const {hairDefaults,hairChoices,hairRanges}=await import(moduleURL(path.join(temp,'hair.mjs')));
const {wardrobeDefaults}=await import(moduleURL(base+'wardrobe.js'));const {parameterDefaults}=await import(moduleURL(base+'parameters.js'));
await loadHumanAssets({textures:false});
const defaults={...parameterDefaults,...wardrobeDefaults,...hairDefaults,gender:'female',height:50,weight:45,shoulders:45,legs:50,faceWidth:50,jaw:45,eyeSize:50,eyeSpace:50,nose:50,mouth:50,hair:'modular',clothes:'shirtPants',expression:'neutral',skin:'#f1cbb2',hairColor:'#332821',shirt:'#d7c8b0',pants:'#343b50'};
import {gunzipSync} from 'node:zlib';
const skinIds={};
for(const gender of ['female','male']){
 const root=base+'assets/anime/';const manifest=JSON.parse(await fs.readFile(root+gender+'-manifest.json','utf8'));
 const fragments=await Promise.all(manifest.parts.map(p=>fs.readFile(root+p,'utf8')));
 const data=JSON.parse(gunzipSync(Buffer.from(fragments.join(''),'base64')));
 const body=data.meshes.find(m=>m.name==='Body');skinIds[gender]=body.groups.filter(g=>data.materials[g.material].name.includes('_SKIN')).flatMap(g=>g.indices);
}

const {updateCharacterMotion}=await import(moduleURL(path.join(temp,'rig.mjs')));
const THREE=await import(moduleURL(base+'vendor/three.module.js'));
let motion=await fs.readFile(base+'motion.js','utf8');motion=motion.replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./rig.js?v=28'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'./assets/motion/quaternius.js?v=26'",JSON.stringify(moduleURL(base+'assets/motion/quaternius.js')));await fs.writeFile(path.join(temp,'motion.mjs'),motion);
const {updateCharacterMotion:play,motionPresets}=await import(moduleURL(path.join(temp,'motion.mjs')));
const {default:library}=await import(moduleURL(base+'assets/motion/quaternius.js'));

import assert from 'node:assert/strict';
const {stonePreset}=await import(moduleURL(base+'experimental.js'));
const {createDeformer}=await import(moduleURL(base+'parameters.js'));
const landmarks={head:[0,1.42,0],neck:[0,1.35,0],hips:[0,.94,0],leftEye:[.021,1.48,.02],rightEye:[-.021,1.48,.02]};
const neutral=createDeformer(defaults,landmarks,1);
const muscleKeys=['muscleMass','trapezius','latWidth','deltoid'];
for(const key of muscleKeys){
 const edit=createDeformer({...defaults,[key]:150},landmarks,1);
 for(const p of [[0,1.48,.1],[.03,1.55,.08]])assert.deepEqual(edit(...p,'Body'),neutral(...p,'Body'),key+' changed skull');
 const p=[.09,1.15,-.05];assert.deepEqual(edit(...p,'Body'),edit(...p,'Shirt'));
}
let poses=0;
for(const clothes of ['shirtPants','underwear']){
 const state={...defaults,...stonePreset,clothes,shoes:clothes==='underwear'?'barefoot':'shoes'};
 await ensureHumanPresets(state,{textures:false});const model=createHuman(state);
 for(const [mode,times] of [['rest',[0]],['idle',[0,1.2,2.4]],['inspect',[2,4,8,10]],['walk',[.23,.72]]])for(const t of times){
  play(model,0,mode);play(model,t,mode);
  model.traverse(m=>{if(!m.isMesh)return;
   for(const v of m.geometry.attributes.normal.array)assert.ok(Number.isFinite(v));
   for(const i of [...new Set(m.geometry.index.array)].filter((_,i)=>i%67===0)){
    const v=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i);m.applyBoneTransform(i,v);assert.ok(v.toArray().every(Number.isFinite));
   }
  });poses++;
 }
 disposeHuman(model);
}
const html=await fs.readFile(base+'index.html','utf8');assert.equal((html.match(/data-tab="experimental"/g)||[]).length,1);
const app=await fs.readFile(base+'app.js','utf8');assert.ok(app.includes("label:'隼 · 熟男脸'"));assert.ok(app.includes('state=normalize({...defaults,...stonePreset})'));
await fs.rm(temp,{recursive:true,force:true});console.log('PASS Stone experimental category, unchanged mature preset, skull protection, shared clothing mapping and '+poses+' actual skinned poses');
