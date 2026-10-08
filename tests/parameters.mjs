import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=fileURLToPath(new URL('../dist/',import.meta.url));
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'charabuilder-test-')); 
let source=await fs.readFile(base+'anime.js','utf8');source=source.replace("'three'",JSON.stringify(base+'vendor/three.module.js')).replace("'./presets.js?v=7'",JSON.stringify(base+'presets.js')).replace("'./parameters.js?v=7'",JSON.stringify(base+'parameters.js')).replace("new URL('./assets/anime/', import.meta.url)",`new URL('file://${base}assets/anime/')`);await fs.writeFile(path.join(temp,'model.mjs'),source);
global.fetch=async url=>{try{return new Response(await fs.readFile(new URL(url)),{status:200});}catch{return new Response('',{status:404});}};
const {loadHumanAssets,ensureHumanPresets,createHuman,disposeHuman}=await import('file://'+path.join(temp,'model.mjs'));const {hairPresets,outfitPresets}=await import(base+'presets.js');await loadHumanAssets({textures:false});
const defaults={gender:'female',height:50,weight:45,shoulders:45,legs:50,faceWidth:50,jaw:45,eyeSize:50,eyeSpace:50,nose:50,mouth:50,hair:'source',clothes:'source',expression:'neutral',skin:'#f1cbb2',hairColor:'#332821',shirt:'#778f87',pants:'#343b50'};
let count=0;
for(const gender of ['female','male'])for(const [hair] of hairPresets[gender])for(const [clothes] of outfitPresets[gender])for(const extreme of [0,50,100]) {
 const state={...defaults,gender,hair,clothes,weight:extreme,shoulders:extreme,legs:extreme,faceWidth:extreme,...Object.fromEntries(Object.keys((await import(base+'parameters.js')).parameterDefaults).map(k=>[k,extreme]))};await ensureHumanPresets(state,{textures:false});const model=createHuman(state);
 if(!model.children.some(o=>o.name.includes('FaceBrow')))throw Error('missing brow');
 if(hair==='bald' && model.children.some(o=>o.name.includes('_HAIR')))throw Error('bald has a scalp hair mesh');
 for(const o of model.children){const p=o.geometry.attributes.position.array;if(!o.geometry.attributes.normal.array.every(Number.isFinite))throw Error('invalid normals');if(!p.every(Number.isFinite))throw Error('invalid vertices');if(o.geometry.index.array.some(i=>i>=p.length/3))throw Error('invalid index');}
 disposeHuman(model);count++;
}
const {parameterDefaults,createDeformer,deformNormal}=await import(base+'parameters.js');
const identity=(x,y,z)=>[x,y,z];
const normal=deformNormal(identity,0,0,0,.3,.4,.5,'Face');
if(normal.some((v,i)=>Math.abs(v-[.3,.4,.5][i]/Math.sqrt(.5))>1e-7))throw Error('normal orientation');
for(const gender of ['female','male']) {
 const state={...defaults,...parameterDefaults,gender};
 const baseline=createHuman(state);
 const original=baseline.children.map(o=>Array.from(o.geometry.attributes.position.array));
 for(const key of Object.keys(parameterDefaults)){
  const changed=createHuman({...state,[key]:100});
  if(!changed.children.some((o,i)=>o.geometry.attributes.position.array.some((v,j)=>Math.abs(v-original[i][j])>1e-6)))throw Error('ineffective parameter '+key);
  disposeHuman(changed);
 }
 const restored=createHuman(state);
 if(restored.children.some((o,i)=>o.geometry.attributes.position.array.some((v,j)=>v!==original[i][j])))throw Error('source mutation');
 disposeHuman(baseline);disposeHuman(restored);
}
console.log('PASS each new parameter changes both genders; source restoration and normal orientation');
console.log('PASS',count,'hair/outfit/gender/body extreme combinations');

await fs.rm(temp,{recursive:true,force:true});
