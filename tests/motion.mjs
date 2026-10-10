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
let checks=0;
for(const gender of ['female','male'])for(const clothes of ['shirtPants','underwear'])for(const extreme of [false,true]){
 const state={...defaults,gender,clothes,shoes:clothes==='underwear'?'barefoot':'shoes'};
 if(extreme)for(const key of ['height','torsoLength','armLength','upperArm','thigh','calf','footLength'])state[key]=150;
 await ensureHumanPresets(state,{textures:false});const model=createHuman(state),{bones,humanoid}=model.userData.motion;
 const rest=bones.map(b=>b.position.clone()),neutralY=model.position.y;
 const meshes=[];model.traverse(m=>{if(m.isMesh)meshes.push(m)});
 for(const side of ['left','right'])for(const digit of ['Thumb','Index','Middle','Ring','Little'])for(const part of ['Proximal','Intermediate','Distal']){
  const key=side+digit+part,index=humanoid[key];if(index===undefined)throw Error('missing finger '+key);
  if(!meshes.some(m=>m.geometry.attributes.skinIndex.array.some((j,i)=>j===index&&m.geometry.attributes.skinWeight.array[i]>0)))throw Error('unweighted finger '+key);
 }
 // Authored Interact must articulate digits relative to the wrist, not just move the arm.
 play(model,0,'interact');play(model,.3,'interact');const finger=bones[humanoid.leftIndexIntermediate].quaternion.clone();
 play(model,.9,'interact');if(finger.angleTo(bones[humanoid.leftIndexIntermediate].quaternion)<.05)throw Error('finger remains rigid');
 for(const preset of motionPresets){
  play(model,0,preset.id);const clip=library.clips[preset.id];
  for(const t of [.23,.43,.72,clip.duration-.001,clip.duration+.001,clip.duration*3+.71]){
   play(model,t,preset.id);
   for(const bone of bones){if(!bone.matrixWorld.elements.every(Number.isFinite))throw Error('nonfinite bone');if(Math.abs(bone.quaternion.length()-1)>1e-5)throw Error('unnormalized bone');}
   for(const mesh of meshes)for(const i of [...new Set(mesh.geometry.index.array)].filter((_,i)=>i%151===0)){const v=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,v);if(!v.toArray().every(Number.isFinite))throw Error('nonfinite vertex');}
   const p=model.userData.motionPlayback;let min=Infinity;for(const {mesh,i} of p.soles){const v=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,v);min=Math.min(min,v.y+model.position.y);}
   if(Math.abs(min-(neutralY+p.floor))>1e-5)throw Error('sole drift '+min);
   // Source world deltas must survive rest-pose correction and arbitrary target proportions.
   const phase=(clip.loop===false?Math.min(t,clip.duration):t%clip.duration)/clip.duration*(clip.frames-1),f=Math.floor(phase),g=Math.min(f+1,clip.frames-1);
   for(const key of Object.keys(clip.rotations)){
    const expected=new THREE.Quaternion().fromArray(clip.rotations[key],f*4).normalize().slerp(new THREE.Quaternion().fromArray(clip.rotations[key],g*4).normalize(),phase-f);
    const actual=bones[humanoid[key]].getWorldQuaternion(new THREE.Quaternion()).multiply(p.alignment[humanoid[key]]);
    if(actual.angleTo(expected)>1e-4)throw Error('source curve mismatch '+key+' '+actual.angleTo(expected));
   }
  }
  if(clip.loop===false){
   play(model,clip.duration+.5,preset.id);const end=bones.map(b=>b.quaternion.clone());
   play(model,clip.duration+5,preset.id);for(let i=0;i<bones.length;i++)if(end[i].angleTo(bones[i].quaternion)>1e-6)throw Error('one-shot restarted');
  }
  if(!extreme&&clothes==='underwear'&&preset.id==='relaxed')console.log(gender,'relaxed hand',bones[humanoid.leftHand].getWorldPosition(new THREE.Vector3()).toArray().map(v=>v.toFixed(3)));
  play(model,0,'rest');if(model.position.y!==neutralY)throw Error('floor reset');for(let i=0;i<bones.length;i++)if(bones[i].position.distanceTo(rest[i])>1e-8||bones[i].quaternion.angleTo(new THREE.Quaternion())>1e-8)throw Error('rest reset');
  checks++;
 }
 disposeHuman(model);
}
console.log('PASS',checks,'authored clips/configurations: source rotations retained, sole contact, finite skinned poses, normal quaternions, original rest restored');

// Custom previews retain authored hands/feet, then add breath/gaze over those poses.
let customChecks=0;
for(const gender of ['female','male'])for(const clothes of ['shirtPants','underwear'])for(const extreme of [false,true]){
 const state={...defaults,gender,clothes,shoes:clothes==='underwear'?'barefoot':'shoes'};
 if(extreme)for(const key of ['height','torsoLength','armLength','upperArm','thigh','calf','footLength'])state[key]=150;
 await ensureHumanPresets(state,{textures:false});const model=createHuman(state),{bones,humanoid}=model.userData.motion,neutralY=model.position.y;
 for(const mode of ['idle','inspect']){
  play(model,0,mode);const states=[];
  for(const t of [.25,1.2,2.4,4.0,5.79,5.81,6.21,7.4,9.0,11.19,11.21,11.999,12.001,14.4]){
   play(model,t,mode);
   for(const bone of bones){if(!bone.matrixWorld.elements.every(Number.isFinite)||Math.abs(bone.quaternion.length()-1)>1e-5)throw Error('custom invalid bone '+mode+' '+bone.name);}
   const p=model.userData.motionPlayback;let min=Infinity;
   for(const {mesh,i} of p.soles){const v=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,v);min=Math.min(min,v.y+model.position.y);}
   if(Math.abs(min-(neutralY+p.floor))>1e-5)throw Error('custom sole drift');
   const chest=bones[humanoid.chest];if(chest.scale.z<1||chest.scale.z>1.00701)throw Error('excess breathing scale');
   model.traverse(m=>{if(m.isMesh&&m.geometry.attributes.normal&&!m.geometry.attributes.normal.array.every(Number.isFinite))throw Error('custom invalid normals');});
   states.push({t,head:bones[humanoid.head].quaternion.clone(),finger:bones[humanoid.leftIndexIntermediate].quaternion.clone(),chest:chest.scale.z});
   const paused=bones.map(b=>({q:b.quaternion.clone(),p:b.position.clone(),s:b.scale.clone()}));play(model,t,mode);
   for(let i=0;i<bones.length;i++)if(paused[i].q.clone().normalize().angleTo(bones[i].quaternion.clone().normalize())>1e-6||paused[i].p.distanceTo(bones[i].position)>1e-8||paused[i].s.distanceTo(bones[i].scale)>1e-8)throw Error('paused custom drift '+mode+' '+t+' '+bones[i].name+' '+paused[i].q.angleTo(bones[i].quaternion)+' lengths '+paused[i].q.length()+' '+bones[i].quaternion.length()+' position '+paused[i].p.distanceTo(bones[i].position)+' scale '+paused[i].s.distanceTo(bones[i].scale));
  }
  if(Math.max(...states.map(s=>s.chest))-Math.min(...states.map(s=>s.chest))<.003)throw Error('breathing not visible');
  if(mode==='inspect'&&states[2].finger.angleTo(states[3].finger)<.02)throw Error('inspection fingers remain stiff');
  if(mode==='inspect'&&states[2].head.angleTo(states[8].head)<.04)throw Error('inspection gaze unchanged');
  play(model,11.999,'inspect');const seam=bones.map(b=>b.quaternion.clone());play(model,12.001,'inspect');for(let i=0;i<bones.length;i++)if(seam[i].angleTo(bones[i].quaternion)>.02)throw Error('inspection loop snaps '+bones[i].name);
  play(model,0,'rest');if(model.position.y!==neutralY||bones.some(b=>b.scale.distanceTo(new THREE.Vector3(1,1,1))>1e-8||b.quaternion.angleTo(new THREE.Quaternion())>1e-8))throw Error('custom rest did not clear additives');
  customChecks++;
 }
 disposeHuman(model);
}
console.log('PASS',customChecks,'breathing/inspection configurations: authored fingers, changing gaze, loop seam, pause determinism, feet, normals and rest cleanup');
