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
let count=0;
async function check(state,exportName){
 await ensureHumanPresets(state,{textures:false});const start=performance.now(),model=createHuman(state),meshes=[];
 model.traverse(o=>{if(o.isMesh){meshes.push(o);const p=o.geometry.attributes.position.array,n=o.geometry.attributes.normal.array;if(!p.every(Number.isFinite)||!n.every(Number.isFinite))throw Error('invalid geometry');if(o.geometry.index.array.some(i=>i>=p.length/3))throw Error('invalid index');}});
 for(const skin of meshes.filter(o=>o.userData.part==='Body'&&o.name.includes('_SKIN'))){
  const p=skin.geometry.attributes.position.array;
  let all=0,visible=0;for(const id of skinIds[state.gender])all=Math.max(all,Math.abs(p[id*3]));
  for(const id of skin.geometry.index.array)visible=Math.max(visible,Math.abs(p[id*3]));
  if(visible<all*.98)throw Error('garment occlusion removed hands '+JSON.stringify({state,all,visible}));
 }
 if(state.clothes!=='underwear'&&(!meshes.some(o=>o.userData.part==='Shirt')||!meshes.some(o=>o.userData.part==='Pants')))throw Error('missing clothes');
 for(const [key,part] of [['frontHair','HairFront'],['backHair','HairBack'],['sideHair','HairSide'],['braid','HairBraid']])if((state[key]!=='none')!==meshes.some(o=>o.userData.part===part))throw Error('section mismatch '+key);
 disposeHuman(model);count++;
}
for(const gender of ['female','male'])await check({...defaults,gender,clothes:'underwear',shoes:'barefoot',frontHair:'none',backHair:'none',sideHair:'none',braid:'none'});
console.log('PASS cold underwear/barefoot loading without garment or hair packs');
function signature(model,part){
 const values=[];model.traverse(o=>{if(o.isMesh&&o.userData.part===part){const p=o.geometry.attributes.position.array;for(const i of o.geometry.index.array)values.push(p[i*3],p[i*3+1],p[i*3+2]);}});return JSON.stringify(values);
}
for(const gender of ['female','male']){
 const state={...defaults,gender,backHair:'long',sideHair:'long',braid:'double'};
 await ensureHumanPresets(state,{textures:false});const initial=createHuman(state);
 const controls={shirtLength:'Shirt',sleeveLength:'Shirt',shirtEase:'Shirt',pantsWidth:'Pants',frontLength:'HairFront',backLength:'HairBack',sideLength:'HairSide',braidLength:'HairBraid',hairVolume:'HairScalp'};
 const originals=Object.fromEntries([...new Set(Object.values(controls))].map(part=>[part,signature(initial,part)]));
 for(const [key,part] of Object.entries(controls)){
  const altered=createHuman({...state,[key]:100});
  if(signature(altered,part)===originals[part])throw Error('inactive '+key);
  disposeHuman(altered);
 }
 const restored=createHuman(state);for(const part of Object.keys(originals))if(signature(restored,part)!==originals[part])throw Error('source changed '+part);
 disposeHuman(initial);disposeHuman(restored);
}
console.log('PASS all garment and hair controls affect visible geometry; resetting preserves source data');
for(const gender of ['female','male']){
 for(const [frontHair] of hairChoices.frontHair)for(const [backHair] of hairChoices.backHair)for(const [sideHair] of hairChoices.sideHair)for(const [braid] of hairChoices.braid)await check({...defaults,gender,frontHair,backHair,sideHair,braid});
 console.log('PASS all modular hair combinations for',gender);
}
for(const gender of ['female','male']){
 await check({...defaults,gender},gender+'-modular');
 for(const [key,choices] of Object.entries(hairChoices))for(const [value] of choices)await check({...defaults,gender,[key]:value});
 for(const extreme of [0,100])await check({...defaults,gender,...Object.fromEntries([...Object.keys(parameterDefaults),...Object.keys(wardrobeDefaults),...Object.keys(hairRanges)].map(k=>[k,extreme])),frontHair:'straight',backHair:'long',sideHair:'long',braid:'double'},gender+'-modular-extreme-'+extreme);
 await check({...defaults,gender,frontHair:'none',backHair:'none',sideHair:'none',braid:'none'});
 for(const extreme of [0,100])await check({...defaults,gender,clothes:'underwear',shoes:'barefoot',...Object.fromEntries([...Object.keys(parameterDefaults),...Object.keys(hairRanges)].map(k=>[k,extreme]))});
 for(const clothes of ['shirtPants','underwear'])for(const shoes of ['shoes','barefoot']){
  const state={...defaults,gender,clothes,shoes};await ensureHumanPresets(state,{textures:false});const model=createHuman(state),meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
  if((shoes==='shoes')!==meshes.some(o=>o.name.includes('Shoes')))throw Error('shoe toggle');
  if(clothes==='underwear'){
   if(meshes.some(o=>o.userData.part==='Shirt'||o.userData.part==='Pants'||o.userData.part==='ShirtDetail'))throw Error('outer clothes remained');
   const bottom=meshes.find(o=>o.userData.part==='UnderwearBottom');if(!bottom||bottom.geometry.index.count<30)throw Error('missing underwear bottom');
   if((gender==='female')!==meshes.some(o=>o.userData.part==='UnderwearTop'))throw Error('underwear top');
   const body=meshes.find(o=>o.userData.part==='Body'&&o.name.includes('_SKIN'));
   if(body.geometry.index.count!==skinIds[gender].length)throw Error('underwear body still cropped');
  }
  if(!Number.isFinite(model.userData.height)||Math.abs(new (await import(moduleURL(base+'vendor/three.module.js'))).Box3().setFromObject(model).min.y)>.015)throw Error('floor alignment');
  disposeHuman(model);count++;
 }

 await check({...defaults,gender,frontHair:'swept',backHair:'bob',sideHair:'long',braid:'double'},gender+'-braids');
}
console.log('PASS',count,'section choices, body/garment/hair extremes, bald and geometry');

await fs.rm(temp,{recursive:true,force:true});
