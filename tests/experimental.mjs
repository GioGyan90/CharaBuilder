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
let code=await fs.readFile(base+'anime.js','utf8');code=code.replace("'./stone-avatar.js?v=49'",JSON.stringify(moduleURL(base+'stone-avatar.js'))).replace("'./stone-body.js?v=34'",JSON.stringify(moduleURL(base+'stone-body.js'))).replace("'./stone-detail.js?v=32'",JSON.stringify(moduleURL(base+'stone-detail.js'))).replace("'./rig.js?v=49'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./parameters.js?v=49'",JSON.stringify(moduleURL(base+'parameters.js'))).replace("'./wardrobe.js?v=25'",JSON.stringify(moduleURL(base+'wardrobe.js'))).replace("'./underwear.js?v=49'",JSON.stringify(moduleURL(base+'underwear.js'))).replace("'./hair.js?v=49'",JSON.stringify(moduleURL(path.join(temp,'hair.mjs')))).replace("new URL('./assets/anime/', import.meta.url)",`new URL(${JSON.stringify(new URL('assets/anime/',distURL).href)})`);await fs.writeFile(path.join(temp,'model.mjs'),code);
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
let motion=await fs.readFile(base+'motion.js','utf8');motion=motion.replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./rig.js?v=49'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'./assets/motion/quaternius.js?v=26'",JSON.stringify(moduleURL(base+'assets/motion/quaternius.js')));await fs.writeFile(path.join(temp,'motion.mjs'),motion);
const {updateCharacterMotion:play,motionPresets}=await import(moduleURL(path.join(temp,'motion.mjs')));
const {default:library}=await import(moduleURL(base+'assets/motion/quaternius.js'));

import assert from 'node:assert/strict';
const {stonePreset}=await import(moduleURL(base+'experimental.js'));
const {createDeformer}=await import(moduleURL(base+'parameters.js'));
const landmarks={head:[0,1.42,0],neck:[0,1.35,0],hips:[0,.94,0],leftEye:[.021,1.48,.02],rightEye:[-.021,1.48,.02]};
const neutral=createDeformer(defaults,landmarks,1);
const muscleKeys=['muscleMass','trapezius','latWidth','deltoid'];
// The wider Stone legs must preserve the medial gap rather than cross x=0.
for(const mass of [50,80,140,150]){
 const d=createDeformer({...defaults,...stonePreset,muscleMass:mass},landmarks,1);
 for(const x of [.012,.018,.025,.035])for(const y of [.62,.70,.78])for(const sign of [-1,1]){
  assert.ok(d(sign*x,y,.035,'Body')[0]*sign>0,'wider inner thigh crossed the centreline');
 }
}
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
  assert.ok(model.userData.stoneRebuilt);assert.ok(model.userData.bodyRefinement.referenceFaces<55000);
  model.traverse(m=>{if(!m.isMesh)return;
   const weights=m.geometry.attributes.skinWeight.array;
   for(let i=0;i<weights.length;i+=4)assert.ok(Math.abs(weights[i]+weights[i+1]+weights[i+2]+weights[i+3]-1)<1e-5,'new body skin weights lost normalization');
   if(mode==='rest'){
    const h=model.userData.motion.humanoid,ids=m.geometry.attributes.skinIndex.array;
    for(const i of new Set(m.geometry.index.array)){
     let left=0,right=0;for(let k=0;k<4;k++){const joint=ids[i*4+k],w=weights[i*4+k];if(joint===h.leftFoot)left+=w;if(joint===h.rightFoot)right+=w;}
     if(Math.max(left,right)>.9){const x=m.geometry.attributes.position.getX(i);assert.ok(x*(left>right?1:-1)>0,'stance moved an authored foot vertex across the centreline');}
    }
   }
   for(const v of m.geometry.attributes.normal.array)assert.ok(Number.isFinite(v));
   for(const i of [...new Set(m.geometry.index.array)].filter((_,i)=>i%67===0)){
    const v=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i);m.applyBoneTransform(i,v);assert.ok(v.toArray().every(Number.isFinite));
   }
  });
  let sampled=0,inverted=0;
  model.traverse(m=>{if(!m.isSkinnedMesh||!['Body','Face'].includes(m.userData.part)||m.name==='AnimeHeadOutline')return;
   const g=m.geometry,index=g.index.array;
   for(let t=0;t<index.length;t+=291){const ids=Array.from(index.slice(t,t+3));if(ids.length!==3)continue;const points=ids.map(i=>{const p=new THREE.Vector3().fromBufferAttribute(g.attributes.position,i);m.applyBoneTransform(i,p);return p;});
    const face=new THREE.Vector3().crossVectors(points[1].clone().sub(points[0]),points[2].clone().sub(points[0]));if(face.length()<.000002)continue;face.normalize();const sum=new THREE.Vector3();
    for(const i of ids){const matrix=new THREE.Matrix4();matrix.elements.fill(0);for(let k=0;k<4;k++){const w=g.attributes.skinWeight.array[i*4+k],j=g.attributes.skinIndex.array[i*4+k],bone=new THREE.Matrix4().fromArray(m.skeleton.boneMatrices,j*16);for(let e=0;e<16;e++)matrix.elements[e]+=w*bone.elements[e];}sum.add(new THREE.Vector3().fromBufferAttribute(g.attributes.normal,i).transformDirection(matrix));}
    sampled++;if(sum.normalize().dot(face)<-.1)inverted++;
   }
  });
  let neckFaces=0,neckFolded=0;
  if(mode!=='rest')model.traverse(m=>{if(!m.isSkinnedMesh||!['Body','Face'].includes(m.userData.part)||m.name==='AnimeHeadOutline')return;
   const g=m.geometry,index=g.index.array,position=g.attributes.position;
   for(let t=0;t<index.length;t+=3){const ids=Array.from(index.slice(t,t+3)),rest=ids.map(i=>new THREE.Vector3().fromBufferAttribute(position,i));const y=rest.reduce((s,p)=>s+p.y/3,0);if(y<1.78)continue;
    const rn=new THREE.Vector3().crossVectors(rest[1].clone().sub(rest[0]),rest[2].clone().sub(rest[0]));if(rn.lengthSq()<1e-14)continue;
    const posed=ids.map((i,k)=>m.applyBoneTransform(i,rest[k].clone())),pn=new THREE.Vector3().crossVectors(posed[1].clone().sub(posed[0]),posed[2].clone().sub(posed[0]));
    const matrix=new THREE.Matrix4();matrix.elements.fill(0);for(const i of ids)for(let k=0;k<4;k++){const w=g.attributes.skinWeight.array[i*4+k]/3,j=g.attributes.skinIndex.array[i*4+k],bone=new THREE.Matrix4().fromArray(m.skeleton.boneMatrices,j*16);for(let e=0;e<16;e++)matrix.elements[e]+=w*bone.elements[e];}
    const expected=rn.applyMatrix3(new THREE.Matrix3().getNormalMatrix(matrix));neckFaces++;if(expected.dot(pn)<=0)neckFolded++;
   }
  });assert.equal(neckFolded,0,mode+' head/neck triangles folded against their bind orientation ('+neckFaces+' checked)');
  assert.ok(inverted<=Math.max(3,sampled*.03),mode+' body GPU normals oppose posed surfaces: '+inverted+'/'+sampled);poses++;
 }
 disposeHuman(model);
}
const html=await fs.readFile(base+'index.html','utf8');assert.equal((html.match(/data-tab="experimental"/g)||[]).length,0);
const app=await fs.readFile(base+'app.js','utf8');assert.ok(app.includes("label:'隼 · 熟男脸'"));assert.ok(app.includes('state=normalize({...defaults,...stonePreset})'));
await fs.rm(temp,{recursive:true,force:true});console.log('PASS Stone formal presets, unchanged mature preset, skull protection, shared clothing mapping and '+poses+' actual skinned poses');
