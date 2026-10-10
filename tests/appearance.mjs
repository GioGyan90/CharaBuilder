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
let code=await fs.readFile(base+'anime.js','utf8');code=code.replace("'./rig.js?v=16'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./parameters.js?v=18'",JSON.stringify(moduleURL(base+'parameters.js'))).replace("'./wardrobe.js?v=16'",JSON.stringify(moduleURL(base+'wardrobe.js'))).replace("'./underwear.js?v=16'",JSON.stringify(moduleURL(base+'underwear.js'))).replace("'./hair.js?v=16'",JSON.stringify(moduleURL(path.join(temp,'hair.mjs')))).replace("new URL('./assets/anime/', import.meta.url)",`new URL(${JSON.stringify(new URL('assets/anime/',distURL).href)})`);await fs.writeFile(path.join(temp,'model.mjs'),code);
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

const {applyHumanColors}=await import(moduleURL(path.join(temp,'model.mjs')));
for(const gender of ['female','male']){
 const state={...defaults,gender,clothes:'underwear',eyeColor:'#437fbc'};await ensureHumanPresets(state,{textures:false});const model=createHuman(state);
 const meshes=[];model.traverse(m=>{if(m.isMesh)meshes.push(m);});const eye=meshes.find(m=>m.name.includes('EyeIris'));
 if(eye.material.color.getHexString()!=='437fbc')throw Error('iris color');
 const skeleton=model.userData.skeleton,geometry=eye.geometry;updateCharacterMotion(model,3.5,'inspect');const pose=JSON.stringify(skeleton.bones.map(b=>b.quaternion.toArray()));
 const colors={skin:'#e2a576',hairColor:'#418688',eyeColor:'#af547c',shirt:'#bd392f',pants:'#ad41ae'};applyHumanColors(model,colors);
 if(eye.geometry!==geometry||model.userData.skeleton!==skeleton||JSON.stringify(skeleton.bones.map(b=>b.quaternion.toArray()))!==pose)throw Error('color update rebuilt or reset pose');
 for(const [role,hex] of Object.entries(colors)){const m=model.userData.materials.find(m=>m.userData.colorRole===role);if(!m)throw Error('missing role '+role);const expected=new THREE.Color(hex);if(role==='skin')expected.multiplyScalar(1.07);if(!m.color.equals(expected))throw Error('color role '+role);}
 if(gender==='female'){
  const top=meshes.find(m=>m.userData.part==='UnderwearTop');if(!top)throw Error('missing strapless top');
  // Inverse scale of the default rig: highest top edge must sit below the old strap region.
  const body=meshes.find(m=>m.userData.part==='Body'&&m.name.includes('_SKIN')),bones=model.userData.motion;
  const neck=bones.bones[bones.humanoid.neck].position;const p=top.geometry.attributes.position;
  if(Math.max(...Array.from(p.array).filter((_,i)=>i%3===1))>model.userData.faceY-.15)throw Error('straps remain');
 }
 disposeHuman(model);
}
console.log('PASS strapless garment, five live color material roles, and unchanged geometry/skeleton/paused pose');
