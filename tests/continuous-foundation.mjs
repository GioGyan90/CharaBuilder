import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const distURL=new URL('../dist/',import.meta.url);
const base=fileURLToPath(distURL);
const moduleURL=path=>pathToFileURL(path).href;
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'charabuilder-modular-'));
let hair=await fs.readFile(base+'hair.js','utf8');hair=hair.replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js')));hair=hair.replace(/'\.\/([^']+)'/g,(_,p)=>JSON.stringify(moduleURL(base+p.split('?')[0])));await fs.writeFile(path.join(temp,'hair.mjs'),hair);
let rig=await fs.readFile(base+'rig.js','utf8');rig=rig.replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js')));await fs.writeFile(path.join(temp,'rig.mjs'),rig);
let code=await fs.readFile(base+'anime.js','utf8');code=code.replace(/'\.\/stone-avatar\.js\?v=\d+'/,JSON.stringify(moduleURL(base+'stone-avatar.js'))).replace("'./stone-body.js?v=34'",JSON.stringify(moduleURL(base+'stone-body.js'))).replace("'./stone-detail.js?v=64'",JSON.stringify(moduleURL(base+'stone-detail.js'))).replace("'./rig.js?v=50'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace(/'\.\/parameters\.js\?v=\d+'/,JSON.stringify(moduleURL(base+'parameters.js'))).replace("'./wardrobe.js?v=25'",JSON.stringify(moduleURL(base+'wardrobe.js'))).replace("'./underwear.js?v=50'",JSON.stringify(moduleURL(base+'underwear.js'))).replace(/'\.\/hair\.js\?v=\d+'/,JSON.stringify(moduleURL(path.join(temp,'hair.mjs')))).replace("new URL('./assets/anime/', import.meta.url)",`new URL(${JSON.stringify(new URL('assets/anime/',distURL).href)})`);code=code.replace(/'\.\/(adult-scalp|adult-eye-material)\.js\?v=\d+'/g,(_,id)=>JSON.stringify(moduleURL(base+id+'.js')));await fs.writeFile(path.join(temp,'model.mjs'),code);
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
const {gunzipSync}=await import('node:zlib');
const mf=JSON.parse(await fs.readFile(base+'assets/anime/male-manifest.json'));
const native=JSON.parse(gunzipSync(Buffer.from((await Promise.all(mf.parts.map(p=>fs.readFile(base+'assets/anime/'+p,'utf8')))).join(''),'base64')));
native.rig=JSON.parse(gunzipSync(Buffer.from(await fs.readFile(base+'assets/anime/male-rig.b64','utf8'),'base64')));
const {buildAnimeFace}=await import(moduleURL(base+'face.js'));
const sources=[...buildAnimeFace(native,'male','foundation').meshes,native.meshes.find(m=>m.name==='Body')];
const state={...defaults,gender:'male',faceSource:'foundation',bodySource:'stone',stoneView:'clay',frontHair:'none',sideHair:'none',backHair:'none',braid:'none',clothes:'underwear',shoes:'barefoot',weight:65,shoulders:78,chest:65,waist:45,muscleMass:80,pecVolume:55,bustSize:30,deltoid:80,upperArm:70,forearm:60,trapezius:55,neckWidth:65};
const presetCode=await fs.readFile(base+'app.js','utf8');
const reviewedStone=Function('faceNeutral','return ('+presetCode.match(/const paintedFacePreset=(.*);/)[1]+')')({});
for(const change of [reviewedStone,{},{neckWidth:80,trapezius:70},{jawWidth:70,headSize:65},{faceWidth:60,eyeSize:60},{zygomaticArchDepth:85,jawCornerDepth:85,chinSquareness:85,mentolabialDepth:85,noseBaseDepth:85,upperLipWidth:85,lowerLipWidth:85,submentalDepth:85,foreheadSlope:85,midfaceSupport:78,jawBodySupport:65,jawRamus:85,jawBase:80,masseter:75,neckForward:70,neckTendon:80}]){
 await ensureHumanPresets(state,{textures:false});const model=createHuman({...state,...change});
 assert.ok(model.userData.foundationTopology);assert.equal(model.userData.mixedHead,false);
 const buckets=new Map();let tris=0;
 for(const mesh of model.children.filter(m=>m.isSkinnedMesh&&m.name.includes('_SKIN'))){
  assert.equal(mesh.material.flatShading,false);tris+=mesh.geometry.index.count/3;
  const src=sources.find(m=>m.name===mesh.userData.part);
  for(const id of new Set(mesh.geometry.index.array)){
   const key=src.positions.slice(id*3,id*3+3).join(',');
   if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push([mesh,id]);
  }
 }
 let shared=0;
 for(const entries of buckets.values())if(new Set(entries.map(([m])=>m.userData.part)).size>1){
  shared++;
  for(const mode of ['rest','walk','talk']){
   play(model,.7,mode);
   const points=entries.map(([m,i])=>m.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i)));
   for(const p of points)assert.ok(p.distanceTo(points[0])<.00005,'native skin seam opened: '+p.distanceTo(points[0]));
  }
 }
 assert.ok(shared>20,'missing native shared face/scalp/ear boundaries');
 console.log('Continuous foundation:',{skinTriangles:tris,sharedBoundaryVertices:shared,change});disposeHuman(model);
}
// Each structural control must move actual geometry, rather than only update state.
for(const key of ['zygomaticArchDepth','jawCornerDepth','chinSquareness','mentolabialDepth','noseBaseDepth','upperLipWidth','lowerLipWidth','submentalDepth','foreheadSlope','midfaceSupport','jawBodySupport','jawRamus','jawBase','masseter','neckForward','neckTendon','browSurfaceOffset','browWidth','muzzleDepth','philtrumDepth','philtrumLength','upperLipThickness','lowerLipThickness','upperLipProjection','lowerLipProjection']){
 const a=createHuman({...state,[key]:25}),b=createHuman({...state,[key]:85});let max=0;
 for(let j=0;j<a.children.length;j++){
  const ap=a.children[j].geometry?.attributes.position,bp=b.children[j].geometry?.attributes.position;if(!ap||!bp)continue;
  for(let k=0;k<ap.array.length;k++)max=Math.max(max,Math.abs(ap.array[k]-bp.array[k]));
 }
 assert.ok(max>.0002,key+' has no visible geometry effect');disposeHuman(a);disposeHuman(b);
}
console.log('PASS structural, philtrum and independent lip geometry controls');
// Shrinking eye apertures must not pull the eyebrows down into the eyes.
const browModels=[createHuman({...state,eyeSize:50,eyeHeight:50}),createHuman({...state,eyeSize:10,eyeHeight:20})];
const browYs=browModels.map(m=>{const b=m.children.find(x=>x.name.includes('FaceBrow'));return [...new Set(b.geometry.index.array)].map(i=>b.geometry.attributes.position.getY(i));});
for(let i=0;i<browYs[0].length;i++)assert.ok(Math.abs(browYs[0][i]-browYs[1][i])<1e-6,'eye scaling displaced brow height');
browModels.forEach(disposeHuman);
console.log('PASS eyebrows independent of eye aperture scaling');
// Raising the oral region must not drag the nasal tip vertically.
const {createDeformer}=await import(moduleURL(base+'parameters.js'));
const fitted=buildAnimeFace(native,'male','foundation');
const d0=createDeformer({...state,mouthHeight:50,philtrumLength:50},fitted.landmarks,1);
const d1=createDeformer({...state,mouthHeight:68,philtrumLength:35},fitted.landmarks,1);
const fr=fitted.landmarks.faceRig;
assert.ok(d1(...fr.mouth,'Face:mouth')[1]>d0(...fr.mouth,'Face:mouth')[1]+.004);
assert.ok(Math.abs(d1(...fr.nose,'Face:skin')[1]-d0(...fr.nose,'Face:skin')[1])<.0001);
console.log('PASS mouth elevation with protected nasal anchor');
// Texture mode must retain topology and tint updates without mutating the cached atlas.
const {applyHumanColors}=await import(moduleURL(path.join(temp,'model.mjs')));
const loader=THREE.TextureLoader.prototype.loadAsync;
THREE.TextureLoader.prototype.loadAsync=async function(url){const texture=new THREE.Texture();texture.userData.url=url;return texture;};
try{
 const painted={...state,stoneView:'painted',skin:'#d6a17e'};
 await ensureHumanPresets(painted);
 const model=createHuman(painted),faces=model.children.filter(m=>m.material?.userData.stonePainted);
 assert.ok(faces.length>0);
 for(const mesh of faces){
  assert.ok(mesh.material.map.userData.url.endsWith('stone-face-painted-v68.png'));
  const weights=mesh.geometry.attributes.stonePaintWeight.array;
  assert.ok(weights.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
  assert.ok(weights.some(v=>v===0));
 }
 const color=faces[0].material.color.clone();applyHumanColors(model,painted);
 for(const channel of ['r','g','b'])assert.ok(Math.abs(faces[0].material.color[channel]-color[channel])<1e-6);
 disposeHuman(model);
 console.log('PASS painted atlas selection, seam fade and consistent color update');
}finally{THREE.TextureLoader.prototype.loadAsync=loader;}
// Adding neutral controls must preserve every source vertex, not just mesh counts.
let neutralSource=await fs.readFile(base+'face.js','utf8');
const start=neutralSource.indexOf('  // Adult structural controls:');
const end=neutralSource.indexOf('  const head=smooth(rig.neckY+.018',start);
assert.ok(start>=0&&end>start);
neutralSource=neutralSource.slice(0,start)+neutralSource.slice(end);
neutralSource=neutralSource.replaceAll("'./face-guides.js?v=18'",JSON.stringify(moduleURL(base+'face-guides.js'))).replaceAll("'./imported-face.js?v=86'",JSON.stringify(moduleURL(base+'imported-face.js')));
await fs.writeFile(path.join(temp,'pre-structural-face.mjs'),neutralSource);
const oldDeform=(await import(moduleURL(path.join(temp,'pre-structural-face.mjs')))).deformAnimeFace;
const newDeform=(await import(moduleURL(base+'face.js'))).deformAnimeFace;
let neutralMax=0,neutralCount=0;
for(const source of sources){for(let i=0;i<source.positions.length;i+=3){
 const xyz=source.positions.slice(i,i+3).map(v=>v/100000),a=oldDeform(...xyz,state,fr,'Face:skin'),b=newDeform(...xyz,state,fr,'Face:skin');
 for(let k=0;k<3;k++){assert.ok(Number.isFinite(b[k]));neutralMax=Math.max(neutralMax,Math.abs(a[k]-b[k]));}neutralCount++;
}}
assert.equal(neutralMax,0,'new neutral controls changed the previous foundation');
console.log('PASS neutral structural controls preserve baseline:',{vertices:neutralCount,maxDisplacement:neutralMax});
await fs.rm(temp,{recursive:true,force:true});
console.log('PASS continuous native topology, seam deformation and motion');
