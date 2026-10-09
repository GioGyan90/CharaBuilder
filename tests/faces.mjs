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
let code=await fs.readFile(base+'anime.js','utf8');code=code.replace("'./rig.js?v=16'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./parameters.js?v=16'",JSON.stringify(moduleURL(base+'parameters.js'))).replace("'./wardrobe.js?v=16'",JSON.stringify(moduleURL(base+'wardrobe.js'))).replace("'./underwear.js?v=16'",JSON.stringify(moduleURL(base+'underwear.js'))).replace("'./hair.js?v=16'",JSON.stringify(moduleURL(path.join(temp,'hair.mjs')))).replace("new URL('./assets/anime/', import.meta.url)",`new URL(${JSON.stringify(new URL('assets/anime/',distURL).href)})`);await fs.writeFile(path.join(temp,'model.mjs'),code);
global.fetch=async url=>{try{return new Response(await fs.readFile(new URL(url)),{status:200});}catch{return new Response('',{status:404});}};
const {loadHumanAssets,ensureHumanPresets,createHuman,disposeHuman}=await import(moduleURL(path.join(temp,'model.mjs')));
const {hairDefaults,hairChoices,hairRanges}=await import(moduleURL(path.join(temp,'hair.mjs')));
const {wardrobeDefaults}=await import(moduleURL(base+'wardrobe.js'));const {parameterDefaults}=await import(moduleURL(base+'parameters.js'));
await loadHumanAssets({textures:false});
const defaults={...parameterDefaults,...wardrobeDefaults,...hairDefaults,gender:'female',height:50,weight:45,shoulders:45,legs:50,faceWidth:50,jaw:45,eyeSize:50,eyeSpace:50,nose:50,mouth:50,hair:'modular',clothes:'shirtPants',expression:'neutral',skin:'#f1cbb2',hairColor:'#332821',shirt:'#d7c8b0',pants:'#343b50'};
import {gunzipSync} from 'node:zlib';
const skinIds={};

const {updateCharacterMotion}=await import(moduleURL(path.join(temp,'rig.mjs')));
const THREE=await import(moduleURL(base+'vendor/three.module.js'));
const {applyHumanColors}=await import(moduleURL(path.join(temp,'model.mjs')));
for(const gender of ['female','male']){
 const state={...defaults,gender,faceSource:'authored',clothes:'underwear',shoes:'barefoot',frontHair:'none',backHair:'none',sideHair:'none',braid:'none',eyeColor:'#437fbc'};
 await ensureHumanPresets(state,{textures:false});
 for(const extreme of [50,0,100]){
  const model=createHuman({...state,faceWidth:extreme,headSize:extreme,neckWidth:extreme,eyeSize:extreme});
  const meshes=[];model.traverse(m=>{if(m.isMesh)meshes.push(m);});
  if(!meshes.some(m=>m.name.startsWith('AuthoredFace')))throw Error('donor absent');
  for(const m of meshes){
   if(!m.geometry.attributes.position.array.every(Number.isFinite)||!m.geometry.attributes.normal.array.every(Number.isFinite))throw Error('nonfinite');
   const w=m.geometry.attributes.skinWeight.array;
   if(!w.every(Number.isFinite))throw Error('invalid weights');
   for(let i=0;i<w.length;i+=4)if(Math.abs(w[i]+w[i+1]+w[i+2]+w[i+3]-1)>1e-5)throw Error('unnormalized weights');
  }
  updateCharacterMotion(model,3,'inspect');
  const head=meshes.find(m=>m.name.startsWith('AuthoredFace')),point=new THREE.Vector3().fromBufferAttribute(head.geometry.attributes.position,0);head.applyBoneTransform(0,point);
  if(!point.toArray().every(Number.isFinite))throw Error('posed head invalid');
  applyHumanColors(model,{...state,skin:'#86543c',eyeColor:'#427b99'});
  const eye=meshes.find(m=>m.name.includes('EyeIris'));if(!eye||eye.material.color.getHexString()!=='427b99')throw Error('eye color');
  disposeHuman(model);
 }
}
console.log('PASS authored male/female heads, extreme sliders, normalized independent rig weights, inspect pose and live skin/iris colors');
