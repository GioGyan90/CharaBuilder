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
let code=await fs.readFile(base+'anime.js','utf8');code=code.replace("'./stone-detail.js?v=32'",JSON.stringify(moduleURL(base+'stone-detail.js'))).replace("'./rig.js?v=28'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./parameters.js?v=32'",JSON.stringify(moduleURL(base+'parameters.js'))).replace("'./wardrobe.js?v=25'",JSON.stringify(moduleURL(base+'wardrobe.js'))).replace("'./underwear.js?v=16'",JSON.stringify(moduleURL(base+'underwear.js'))).replace("'./hair.js?v=32'",JSON.stringify(moduleURL(path.join(temp,'hair.mjs')))).replace("new URL('./assets/anime/', import.meta.url)",`new URL(${JSON.stringify(new URL('assets/anime/',distURL).href)})`);await fs.writeFile(path.join(temp,'model.mjs'),code);
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

const {bodyAdjustmentKeys}=await import(moduleURL(base+'parameters.js'));
for(const gender of ['female','male']){
 const state={...defaults,gender,clothes:'underwear',frontHair:'none',backHair:'none',sideHair:'none',braid:'none',shoes:'barefoot'};
 await ensureHumanPresets(state,{textures:false});
 for(const key of bodyAdjustmentKeys){
  const models=[-50,150].map(value=>createHuman({...state,[key]:value}));
  const skin=models.map(model=>model.children.find(m=>m.isMesh&&m.name.includes('Body')&&m.name.includes('_SKIN')));let max=0;
  for(const id of new Set(skin[0].geometry.index.array)){let d=0;for(let a=0;a<3;a++)d+=(skin[0].geometry.attributes.position.array[id*3+a]-skin[1].geometry.attributes.position.array[id*3+a])**2;max=Math.max(max,Math.sqrt(d));}
  if(max<.002)throw Error(gender+' '+key+' no visible effect: '+max);
  if(!models.every(model=>model.userData.bodyHandles.length===8&&model.userData.bodyHandles.every(h=>h.position.every(Number.isFinite))))throw Error('body edit anchors invalid');
  models.forEach(disposeHuman);console.log('BODY',gender,key,max.toFixed(4));
 }
}
for(const gender of ['female','male'])for(const clothes of ['underwear','shirtPants'])for(const value of [-50,150]){
 const state={...defaults,gender,clothes,frontHair:'none',backHair:'none',sideHair:'none',braid:'none',shoes:'barefoot'};
 for(const key of bodyAdjustmentKeys)state[key]=value;
 await ensureHumanPresets(state,{textures:false});const model=createHuman(state);let floor=Infinity;
 model.updateMatrixWorld(true);model.userData.skeleton.update();
 model.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,n=m.geometry.attributes.normal,w=m.geometry.attributes.skinWeight;if(!p.array.every(Number.isFinite)||!n.array.every(Number.isFinite))throw Error('nonfinite new body');
  for(let i=0;i<w.count;i++)if(Math.abs(w.array[i*4]+w.array[i*4+1]+w.array[i*4+2]+w.array[i*4+3]-1)>1e-5)throw Error('weight normalization');
  for(const id of new Set(m.geometry.index.array)){floor=Math.min(floor,p.getY(id)+model.position.y);}
  for(const id of [...new Set(m.geometry.index.array)].filter((_,i)=>i%97===0)){const q=new THREE.Vector3().fromBufferAttribute(p,id),rest=q.clone();m.applyBoneTransform(id,q);if(q.distanceTo(rest)>1e-5)throw Error('bind drift');}
 });
 if(Math.abs(floor)>.005)throw Error('feet lifted off floor: '+floor);
 for(const mode of ['idle','inspect','rest']){updateCharacterMotion(model,3.5,mode);model.traverse(m=>{if(!m.isMesh)return;for(const id of [...new Set(m.geometry.index.array)].filter((_,i)=>i%101===0)){const q=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,id);m.applyBoneTransform(id,q);if(!q.toArray().every(Number.isFinite))throw Error('new body pose invalid');}});}
 disposeHuman(model);
}
console.log('PASS 35 visible body parameters, eight handle anchors, eight free-range clothing/body combinations, grounded feet, normalized skin weights and bone motion');
