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
let code=await fs.readFile(base+'anime.js','utf8');code=code.replace("'./rig.js?v=16'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./parameters.js?v=21'",JSON.stringify(moduleURL(base+'parameters.js'))).replace("'./wardrobe.js?v=16'",JSON.stringify(moduleURL(base+'wardrobe.js'))).replace("'./underwear.js?v=16'",JSON.stringify(moduleURL(base+'underwear.js'))).replace("'./hair.js?v=16'",JSON.stringify(moduleURL(path.join(temp,'hair.mjs')))).replace("new URL('./assets/anime/', import.meta.url)",`new URL(${JSON.stringify(new URL('assets/anime/',distURL).href)})`);await fs.writeFile(path.join(temp,'model.mjs'),code);
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
let motion=await fs.readFile(base+'motion.js','utf8');motion=motion.replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./rig.js?v=16'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'./assets/motion/quaternius.js?v=23'",JSON.stringify(moduleURL(base+'assets/motion/quaternius.js')));await fs.writeFile(path.join(temp,'motion.mjs'),motion);
const {updateCharacterMotion:play,motionPresets}=await import(moduleURL(path.join(temp,'motion.mjs')));
const {default:library}=await import(moduleURL(base+'assets/motion/quaternius.js'));
let checks=0;
for(const gender of ['female','male'])for(const clothes of ['shirtPants','underwear'])for(const extreme of [false,true]){
 const state={...defaults,gender,clothes,shoes:clothes==='underwear'?'barefoot':'shoes'};
 if(extreme)for(const key of ['height','torsoLength','armLength','upperArm','thigh','calf','footLength'])state[key]=150;
 await ensureHumanPresets(state,{textures:false});const model=createHuman(state),{bones,humanoid}=model.userData.motion;
 const rest=bones.map(b=>b.position.clone()),neutralY=model.position.y;
 const meshes=[];model.traverse(m=>{if(m.isMesh)meshes.push(m)});
 for(const preset of motionPresets){
  play(model,0,preset.id);const clip=library.clips[preset.id];
  for(const t of [.23,.43,.72,clip.duration-.001,clip.duration+.001,clip.duration*3+.71]){
   play(model,t,preset.id);
   for(const bone of bones){if(!bone.matrixWorld.elements.every(Number.isFinite))throw Error('nonfinite bone');if(Math.abs(bone.quaternion.length()-1)>1e-5)throw Error('unnormalized bone');}
   for(const mesh of meshes)for(const i of [...new Set(mesh.geometry.index.array)].filter((_,i)=>i%151===0)){const v=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,v);if(!v.toArray().every(Number.isFinite))throw Error('nonfinite vertex');}
   const p=model.userData.motionPlayback;let min=Infinity;for(const {mesh,i} of p.soles){const v=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,v);min=Math.min(min,v.y+model.position.y);}
   if(Math.abs(min-(neutralY+p.floor))>1e-5)throw Error('sole drift '+min);
   // Source world deltas must survive rest-pose correction and arbitrary target proportions.
   const phase=(t%clip.duration)/clip.duration*(clip.frames-1),f=Math.floor(phase),g=Math.min(f+1,clip.frames-1);
   for(const key of ['hips','head','leftUpperArm','rightLowerArm','leftUpperLeg']){
    const expected=new THREE.Quaternion().fromArray(clip.rotations[key],f*4).normalize().slerp(new THREE.Quaternion().fromArray(clip.rotations[key],g*4).normalize(),phase-f);
    const actual=bones[humanoid[key]].getWorldQuaternion(new THREE.Quaternion()).multiply(p.alignment[humanoid[key]]);
    if(actual.angleTo(expected)>1e-4)throw Error('source curve mismatch '+key+' '+actual.angleTo(expected));
   }
  }
  if(!extreme&&clothes==='underwear'&&preset.id==='relaxed')console.log(gender,'relaxed hand',bones[humanoid.leftHand].getWorldPosition(new THREE.Vector3()).toArray().map(v=>v.toFixed(3)));
  play(model,0,'rest');if(model.position.y!==neutralY)throw Error('floor reset');for(let i=0;i<bones.length;i++)if(bones[i].position.distanceTo(rest[i])>1e-8||bones[i].quaternion.angleTo(new THREE.Quaternion())>1e-8)throw Error('rest reset');
  checks++;
 }
 disposeHuman(model);
}
console.log('PASS',checks,'authored clips/configurations: source rotations retained, sole contact, finite skinned poses, normal quaternions, original rest restored');
