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
let code=await fs.readFile(base+'anime.js','utf8');code=code.replace("'./stone-avatar.js?v=50'",JSON.stringify(moduleURL(base+'stone-avatar.js'))).replace("'./stone-body.js?v=34'",JSON.stringify(moduleURL(base+'stone-body.js'))).replace("'./stone-detail.js?v=32'",JSON.stringify(moduleURL(base+'stone-detail.js'))).replace("'./rig.js?v=50'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./parameters.js?v=51'",JSON.stringify(moduleURL(base+'parameters.js'))).replace("'./wardrobe.js?v=25'",JSON.stringify(moduleURL(base+'wardrobe.js'))).replace("'./underwear.js?v=50'",JSON.stringify(moduleURL(base+'underwear.js'))).replace("'./hair.js?v=52'",JSON.stringify(moduleURL(path.join(temp,'hair.mjs')))).replace("new URL('./assets/anime/', import.meta.url)",`new URL(${JSON.stringify(new URL('assets/anime/',distURL).href)})`);await fs.writeFile(path.join(temp,'model.mjs'),code);
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
const positions=model=>{const result=[];model.traverse(m=>{if(m.isMesh&&m.userData.part==='Body')for(const i of new Set(m.geometry.index.array))if(m.geometry.attributes.position.getY(i)<1.65)result.push(...new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i).toArray());});return result;};
const counts=[];
for(const bodySource of ['vroid','stone']){
 let baseline;
 for(const faceSource of ['vroid','authored','stone'])for(const clothes of ['underwear','shirtPants']){
  const state={...defaults,gender:'male',bodySource,faceSource,stoneView:'skin',clothes,shoes:'barefoot',frontHair:'none',backHair:'none',sideHair:'none',braid:'none'};
  await ensureHumanPresets(state,{textures:false});const model=createHuman(state);
  assert.equal(model.userData.bodySource,bodySource);assert.equal(model.userData.faceSource,faceSource);
  if(clothes==='underwear'){const p=positions(model);if(baseline)assert.deepEqual(p,baseline,'changing face changed lower body');else baseline=p;}
  let faces=0;model.traverse(m=>{if(!m.isMesh)return;faces+=m.geometry.index.count/3;const w=m.geometry.attributes.skinWeight.array;for(let i=0;i<w.length;i+=4)assert.ok(Math.abs(w[i]+w[i+1]+w[i+2]+w[i+3]-1)<1e-5);});
  counts.push([bodySource,faceSource,clothes,faces]);assert.ok(faces<45000,'foundation face budget exceeded');
  for(const mode of ['rest','walk','talk','inspect'])for(const t of [0,.7,2]){play(model,0,mode);play(model,t,mode);model.traverse(m=>{if(!m.isSkinnedMesh)return;for(const i of new Set(m.geometry.index.array)){const p=m.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i));assert.ok(p.toArray().every(Number.isFinite),'invalid skinned position');}});}
  disposeHuman(model);
 }
}
for(const bodySource of ['vroid','stone'])for(const faceSource of ['vroid','stone'])for(const style of ['sidepart','upcomb']){
 const state={...defaults,gender:'male',bodySource,faceSource,clothes:'underwear',shoes:'barefoot',frontHair:style,backHair:style,sideHair:style,braid:'none',headSize:80,neckWidth:85,muscleMass:120};
 await ensureHumanPresets(state,{textures:false});const model=createHuman(state);
 for(const part of ['HairFront','HairBack','HairSide'])assert.ok(model.children.some(m=>m.userData.part===part),'missing fitted hair '+part);
 play(model,0,'walk');play(model,.7,'walk');model.traverse(m=>{if(!m.isSkinnedMesh)return;for(const i of new Set(m.geometry.index.array))assert.ok(m.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i)).toArray().every(Number.isFinite));});disposeHuman(model);
}
console.log('PASS independent head/body × clothing combinations, body preservation, bounded face counts, normalized weights and 144 posed combinations',counts);
await fs.rm(temp,{recursive:true,force:true});
