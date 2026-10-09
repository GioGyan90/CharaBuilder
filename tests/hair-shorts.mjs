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
let code=await fs.readFile(base+'anime.js','utf8');code=code.replace("'./rig.js?v=13'",JSON.stringify(moduleURL(path.join(temp,'rig.mjs')))).replace("'three'",JSON.stringify(moduleURL(base+'vendor/three.module.js'))).replace("'./parameters.js?v=13'",JSON.stringify(moduleURL(base+'parameters.js'))).replace("'./wardrobe.js?v=13'",JSON.stringify(moduleURL(base+'wardrobe.js'))).replace("'./underwear.js?v=13'",JSON.stringify(moduleURL(base+'underwear.js'))).replace("'./hair.js?v=13'",JSON.stringify(moduleURL(path.join(temp,'hair.mjs')))).replace("new URL('./assets/anime/', import.meta.url)",`new URL(${JSON.stringify(new URL('assets/anime/',distURL).href)})`);await fs.writeFile(path.join(temp,'model.mjs'),code);
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

const {classicHairPresets}=await import(moduleURL(path.join(temp,'hair.mjs')));
const presets=classicHairPresets.filter(p=>p.gender==='male');let count=0;const shapes=new Set();
async function check(state){await ensureHumanPresets(state,{textures:false});const model=createHuman(state),meshes=[];model.traverse(m=>{if(m.isMesh)meshes.push(m);});
 for(const m of meshes.filter(m=>m.userData.part?.startsWith('Hair'))){const p=m.geometry.attributes.position;if(!p.array.every(Number.isFinite)||m.geometry.index.array.some(i=>i>=p.count))throw Error('invalid hair');if(!m.isSkinnedMesh)throw Error('unbound hair');const coverage=m.geometry.attributes.hairCoverage;if(coverage&&(coverage.count!==p.count||!coverage.array.every(v=>v>=0&&v<=1)))throw Error('invalid fade');}
 for(const [key,part] of [['frontHair','HairFront'],['backHair','HairBack'],['sideHair','HairSide'],['braid','HairBraid']])if((state[key]!=='none')!==meshes.some(m=>m.userData.part===part))throw Error('missing part '+key);
 updateCharacterMotion(model,3.5,'inspect');for(const m of meshes.filter(m=>m.userData.part?.startsWith('Hair')))for(const i of [...new Set(m.geometry.index.array)].filter((_,k)=>k%71===0)){const v=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i);m.applyBoneTransform(i,v);if(!v.toArray().every(Number.isFinite))throw Error('invalid pose');}
 const hair=meshes.filter(m=>m.userData.part==='HairFront');shapes.add(JSON.stringify(hair.map(m=>Array.from(m.geometry.attributes.position.array))));disposeHuman(model);count++;
}
for(const gender of ['male','female'])for(const preset of presets)for(const value of [0,50,100])await check({...defaults,gender,...preset.values,headSize:value,faceWidth:value,frontLength:value,backLength:value,sideLength:value,hairVolume:value});
for(const gender of ['male','female'])for(const [key,values] of [['frontHair',['buzz','crew','flattop','crop']],['backHair',['buzz','fade']],['sideHair',['buzz','fade']]])for(const value of values)await check({...defaults,gender,[key]:value});
if(shapes.size<4)throw Error('styles identical');
console.log('PASS',count,'short hairstyle states, legacy/short combinations, extremes, fade coverage, indices and animated head binding');
