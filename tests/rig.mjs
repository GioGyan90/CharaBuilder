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
let code=await fs.readFile(base+'anime.js','utf8');code=code.replace("'./rig.js?v=15'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./parameters.js?v=15'",JSON.stringify(moduleURL(base+'parameters.js'))).replace("'./wardrobe.js?v=15'",JSON.stringify(moduleURL(base+'wardrobe.js'))).replace("'./underwear.js?v=15'",JSON.stringify(moduleURL(base+'underwear.js'))).replace("'./hair.js?v=15'",JSON.stringify(moduleURL(path.join(temp,'hair.mjs')))).replace("new URL('./assets/anime/', import.meta.url)",`new URL(${JSON.stringify(new URL('assets/anime/',distURL).href)})`);await fs.writeFile(path.join(temp,'model.mjs'),code);
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
let checks=0;
for(const gender of ['female','male'])for(const clothes of ['shirtPants','underwear'])for(const extreme of [false,true]){
 const state={...defaults,gender,clothes,shoes:'barefoot'};
 if(extreme)for(const key of ['height','weight','headSize','chest','waist','hips','legThickness','sleeveLength','shirtLength','pantsWidth'])state[key]=100;
 await ensureHumanPresets(state,{textures:false});const start=performance.now();const model=createHuman(state);console.log(gender,clothes,extreme?'extreme':'default','build ms',Math.round(performance.now()-start));
 model.updateMatrixWorld(true);model.userData.skeleton.update();
 const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
 for(const m of meshes){if(!m.isSkinnedMesh)throw Error('unbound '+m.name);const {skinWeight:w,skinIndex:j,position:p}=m.geometry.attributes;
  for(let i=0;i<p.count;i++){let sum=0;for(let a=0;a<4;a++){sum+=w.array[i*4+a];if(j.array[i*4+a]>=m.skeleton.bones.length)throw Error('bad joint');}if(Math.abs(sum-1)>.0001)throw Error('bad weight');}
  for(const i of [...new Set(m.geometry.index.array)].filter((_,n)=>n%53===0)){const v=new THREE.Vector3().fromBufferAttribute(p,i),rest=v.clone();m.applyBoneTransform(i,v);if(v.distanceTo(rest)>1e-5)throw Error('bind drift '+m.name+' '+v.distanceTo(rest));}
 }
 const body=meshes.find(m=>m.userData.part==='Body'&&m.name.includes('_SKIN')),p=body.geometry.attributes.position;
 let moved=0;
 for(const mode of ['idle','inspect'])for(const t of [0,1,3.5,5,7.5,9,10.5,11.99,12,24]){updateCharacterMotion(model,t,mode);
  for(const m of meshes)for(const i of [...new Set(m.geometry.index.array)].filter((_,n)=>n%131===0)){const v=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i);m.applyBoneTransform(i,v);if(!v.toArray().every(Number.isFinite))throw Error('nonfinite pose');}
  const h=model.userData.motion.bones[model.userData.motion.humanoid.leftHand];if(mode==='inspect'&&t===3.5){const v=new THREE.Vector3();h.getWorldPosition(v);updateCharacterMotion(model,0,'rest');const rest=new THREE.Vector3();h.getWorldPosition(rest);moved=v.distanceTo(rest);if(moved<.05)throw Error('hand did not move');updateCharacterMotion(model,t,mode);}
 }
 updateCharacterMotion(model,0,'rest');for(const bone of model.userData.skeleton.bones)if(bone.rotation.toArray().slice(0,3).some(v=>v!==0))throw Error('reset');
 disposeHuman(model);checks++;
}
console.log('PASS',checks,'rigged configurations: original weights, bind identity, finite poses, moving hands, reset, extreme proportions');
