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
const requested=[];global.fetch=async url=>{requested.push(String(url));try{return new Response(await fs.readFile(new URL(url)),{status:200});}catch{return new Response('',{status:404});}};
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
  if(!meshes.some(m=>m.name.startsWith('AnimeReferenceFace')))throw Error('parametric face absent');
  for(const m of meshes){
   if(!m.geometry.attributes.position.array.every(Number.isFinite)||!m.geometry.attributes.normal.array.every(Number.isFinite))throw Error('nonfinite');
   const w=m.geometry.attributes.skinWeight.array;
   if(!w.every(Number.isFinite))throw Error('invalid weights');
   for(let i=0;i<w.length;i+=4)if(Math.abs(w[i]+w[i+1]+w[i+2]+w[i+3]-1)>1e-5)throw Error('unnormalized weights');
  }
  const outline=meshes.find(m=>m.name==='AnimeHeadOutline');
  if(!outline||outline.skeleton!==meshes.find(m=>m.name.startsWith('AnimeReferenceFace')).skeleton)throw Error('outline detached from head rig');
  const face=meshes.find(m=>m.name.startsWith('AnimeReferenceFace'));
  if(!face.material.gradientMap.image.data.every((v,i)=>v===[145,222,255][i]))throw Error('authored toon bands missing');
  if(extreme===50){
   const reference=createHuman({...state,faceSource:'vroid',jaw:50});
   const old=[];reference.traverse(m=>{if(m.isMesh&&m.name.includes('Face_00_SKIN'))old.push(m);});
   const maxY=m=>Math.max(...Array.from(m.geometry.index.array,id=>m.geometry.attributes.position.getY(id)));
   if(Math.abs(maxY(face)-maxY(old[0]))>.006)throw Error('head top not aligned to original hairstyle envelope');
   const minY=m=>Math.min(...Array.from(m.geometry.index.array,id=>m.geometry.attributes.position.getY(id)));
   const q=face.geometry.attributes.position,neckLevel=minY(face);
   for(const id of new Set(face.geometry.index.array))if(q.getY(id)<neckLevel+.01&&Math.abs(q.getX(id))>.075)throw Error('donor neck flares outside body');
   disposeHuman(reference);
  }
  updateCharacterMotion(model,3,'inspect');
  const head=meshes.find(m=>m.name.startsWith('AnimeReferenceFace')),point=new THREE.Vector3().fromBufferAttribute(head.geometry.attributes.position,0);head.applyBoneTransform(0,point);
  if(!point.toArray().every(Number.isFinite))throw Error('posed head invalid');
  applyHumanColors(model,{...state,skin:'#86543c',eyeColor:'#427b99'});
  const eye=meshes.find(m=>m.name.includes('EyeIris'));if(!eye||eye.material.color.getHexString()!=='427b99')throw Error('eye color');
  disposeHuman(model);
 }
}
function collect(model,needle){let m;model.traverse(o=>{if(o.isMesh&&o.name.includes(needle))m=o;});return m;}
for(const gender of ['female','male']){
 const state={...defaults,gender,faceSource:'authored',frontHair:'none',backHair:'none',sideHair:'none',braid:'none',clothes:'underwear',jaw:50,expression:'neutral'};
 await ensureHumanPresets(state,{textures:false});
 for(const key of ['faceWidth','jaw','eyeSize','eyeSpace','nose','noseProjection','mouth','mouthHeight','forehead','chinLength']){
  const models=[0,100].map(value=>createHuman({...state,[key]:value}));
  const needle=key.startsWith('eye')?'EyeIris':key==='mouth'||key==='mouthHeight'?'FaceMouth':'AnimeReferenceFace';
  const [a,b]=models.map(model=>collect(model,needle));let max=0;
  for(const id of new Set(a.geometry.index.array)){let d=0;for(let axis=0;axis<3;axis++)d+=(a.geometry.attributes.position.array[id*3+axis]-b.geometry.attributes.position.array[id*3+axis])**2;max=Math.max(max,Math.sqrt(d));}
  if(max<.005)throw Error(gender+' '+key+' not visibly editable: '+max);
  console.log('PARAM',gender,key,max.toFixed(4));models.forEach(disposeHuman);
 }
 const reference=createHuman({...state,faceSource:'vroid'}),model=createHuman(state);
 const skin=collect(model,'Body_00_SKIN'),oldSkin=collect(reference,'Body_00_SKIN');
 if(skin.geometry.index.count!==oldSkin.geometry.index.count||!skin.geometry.attributes.position.array.every((v,i)=>v===oldSkin.geometry.attributes.position.array[i]))throw Error('body neck/skull changed by new face');
 if(!model.userData.facePresetName.includes(gender==='female'?'绫':'隼'))throw Error('preset not named');
 [reference,model].forEach(disposeHuman);
}
console.log('PASS named JS anime faces, actual visible parameter displacement, original body neck/skull, outline rig, extremes, motion and colors');
for(const gender of ['female','male'])for(const extreme of [0,50,100]){
 const style=gender==='male'?{frontHair:'sidepart',backHair:'sidepart',sideHair:'sidepart',braid:'none'}:{frontHair:'parted',backHair:'short',sideHair:'short',braid:'none'};
 const state={...defaults,...style,gender,faceSource:'authored',clothes:'underwear',jaw:extreme,faceWidth:extreme,headSize:extreme,hairVolume:extreme,forehead:extreme,chinLength:extreme,noseProjection:extreme};
 await ensureHumanPresets(state,{textures:false});const model=createHuman(state),skin=[],hair=[];
 model.traverse(o=>{if(!o.isMesh)return;if(o.name.includes('_SKIN')){const m=new THREE.Mesh(o.geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));m.updateMatrixWorld();skin.push(m);}if(o.userData.part?.startsWith('Hair'))hair.push(o);});
 // Ray/triangle intersections check actual edited skin, not the clearance bins.
 const eye=model.userData.faceY-model.position.y,ray=new THREE.Raycaster();let checked=0;
 for(const m of hair){const a=m.geometry.attributes.position,ids=[...new Set(m.geometry.index.array)];for(let i=0;i<ids.length;i+=Math.max(1,Math.floor(ids.length/60))){const v=new THREE.Vector3().fromBufferAttribute(a,ids[i]);if(v.y<eye-.09)continue;
  const origin=new THREE.Vector3(0,v.y,gender==='female'?-.011:.008),direction=v.clone().sub(origin),distance=direction.length();direction.normalize();ray.set(origin,direction);
  const intersections=ray.intersectObjects(skin,false).filter(h=>h.distance<.3);if(!intersections.length)continue;checked++;
  const surface=Math.max(...intersections.map(h=>h.distance));if(distance+.002<surface)throw Error(gender+' hair intersects edited skin at '+extreme+': '+(surface-distance));
 }}
 if(checked<10)throw Error('insufficient hair collision checks');skin.forEach(m=>m.material.dispose());disposeHuman(model);console.log('CLEARANCE',gender,extreme,checked,'skin ray intersections');
}

if(requested.some(url=>/femalehead|malehead/.test(url)))throw Error('downloaded neck/head still fetched by runtime');
console.log('PASS runtime excludes downloaded head/neck assets');
