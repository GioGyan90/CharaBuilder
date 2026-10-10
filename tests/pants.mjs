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
const {default:pantsSkin}=await import(moduleURL(base+'assets/anime/pants-skin.js'));
for(const gender of ['female','male'])for(const pantsWidth of [0,50,100]){
 const state={...defaults,gender,pantsWidth,clothes:'shirtPants',shoes:'barefoot'};await ensureHumanPresets(state,{textures:false});const model=createHuman(state),pants=model.children.find(m=>m.userData.part==='Pants'),p=pants.geometry.attributes.position,n=pants.geometry.attributes.normal,used=new Set(pants.geometry.index.array),groups=new Map();
 for(const i of used){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*100000)).join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);if(Math.abs(new THREE.Vector3().fromBufferAttribute(n,i).length()-1)>.00001)throw Error('invalid trouser normal');}
 const legSide=i=>{let score=0;for(let a=0;a<4;a++){const name=pants.skeleton.bones[pants.geometry.attributes.skinIndex.array[i*4+a]].name,w=pants.geometry.attributes.skinWeight.array[i*4+a];if(/_(UpperLeg|LowerLeg|Foot)$/.test(name))score+=(name.includes('_L_')?1:name.includes('_R_')?-1:0)*w;}return score>=0?'left':'right';};
 const {bones,humanoid}=model.userData.motion,bands={};
 for(const side of ['left','right']){const knee=bones[humanoid[side+'LowerLeg']].getWorldPosition(new THREE.Vector3()),upper=bones[humanoid[side+'UpperLeg']].getWorldPosition(new THREE.Vector3()),foot=bones[humanoid[side+'Foot']].getWorldPosition(new THREE.Vector3());bands[side]={y:knee.y-model.position.y,r:Math.min(knee.distanceTo(upper),knee.distanceTo(foot))*.28};}
 let adapted=0;const rings=new Map();
 for(const row of pantsSkin.rows)if(used.has(row[0])){
  const authored=row.slice(1,5).reduce((v,j,a)=>v+(pantsSkin.names[j].includes('_L_')?1:pantsSkin.names[j].includes('_R_')?-1:0)*row[5+a],0),side=authored>=0?'left':'right',band=bands[side],inside=Math.abs(p.getY(row[0])-band.y)<band.r;
  if(Math.abs(authored)>64000&&legSide(row[0])!==side)throw Error('inner trouser vertex reassigned to opposite leg '+row[0]);
  if(inside){adapted++;continue;}
  const sum=row.slice(5).reduce((s,v)=>s+v,0);for(let a=0;a<4;a++){const bone=pants.skeleton.bones[pants.geometry.attributes.skinIndex.array[row[0]*4+a]].name;if(bone!==pantsSkin.names[row[a+1]])throw Error('author bone mapping changed outside knees');if(Math.abs(pants.geometry.attributes.skinWeight.array[row[0]*4+a]-row[a+5]/sum)>.000001)throw Error('author weights changed outside knees');}
 }
 if(adapted<50||p.count<=pantsSkin.vertexCount)throw Error('no knee adaptation/refinement');
 for(const i of used){const side=legSide(i),band=bands[side];if(Math.abs(p.getY(i)-band.y)>band.r*.75)continue;
  let lower=0,total=0;for(let a=0;a<4;a++){const w=pants.geometry.attributes.skinWeight.array[i*4+a],j=pants.geometry.attributes.skinIndex.array[i*4+a];if(j===humanoid[side+'LowerLeg'])lower+=w;total+=w;}
  if(Math.abs(total-1)>1e-6)throw Error('knee weights not normalized');
  const key=side+':'+Math.round(p.getY(i)*1000);if(!rings.has(key))rings.set(key,[]);rings.get(key).push(lower);
 }
 for(const values of rings.values())if(values.length>1&&Math.max(...values)-Math.min(...values)>.025)throw Error('uneven weights around knee ring');
 let seams=0;for(const ids of groups.values())if(ids.length>1){seams++;for(const id of ids.slice(1))if(new THREE.Vector3().fromBufferAttribute(n,id).distanceTo(new THREE.Vector3().fromBufferAttribute(n,ids[0]))>1e-6)throw Error('normal seam');}
 for(const mode of ['walk','jog','dance']){play(model,0,mode);for(const time of [.3,.7,1.1]){play(model,time,mode);const expected=new Map([...groups.keys()].map(k=>[k,new THREE.Vector3()])),vertexKey=new Map();for(const [k,ids] of groups)for(const id of ids)vertexKey.set(id,k);
 const idx=pants.geometry.index.array;for(let t=0;t<idx.length;t+=3){const ids=Array.from(idx.slice(t,t+3)),v=ids.map(i=>pants.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(p,i))),area=new THREE.Vector3().subVectors(v[1],v[0]).cross(new THREE.Vector3().subVectors(v[2],v[0]));for(const id of ids)expected.get(vertexKey.get(id)).add(area);}
 for(const i of used){const mat=new THREE.Matrix4();mat.elements.fill(0);for(let a=0;a<4;a++){const joint=pants.geometry.attributes.skinIndex.array[i*4+a],w=pants.geometry.attributes.skinWeight.array[i*4+a],bone=new THREE.Matrix4().fromArray(pants.skeleton.boneMatrices,joint*16);for(let k=0;k<16;k++)mat.elements[k]+=w*bone.elements[k];}const normal=new THREE.Vector3().fromBufferAttribute(n,i).transformDirection(mat),surface=expected.get(vertexKey.get(i)).clone().normalize();if(surface.lengthSq()>.5&&normal.dot(surface)<.99999)throw Error('GPU normal diverges from posed pants surface');}
 for(const ids of groups.values())if(ids.length>1){const first=pants.applyBoneTransform(ids[0],new THREE.Vector3().fromBufferAttribute(p,ids[0]));for(const i of ids.slice(1))if(first.distanceTo(pants.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(p,i)))>1e-5)throw Error('posed seam opened');}}}
 console.log(gender,pantsWidth,seams,'seams continuous, smooth knee rings, author weights retained outside knees');disposeHuman(model);
}
console.log('PASS pants leg ownership (including vertices across the midline), UV seams, unit normals, knee refinement, continuous ring weights and preserved outer author weights, posed seam continuity and GPU normal/surface agreement; 6 gender/width configurations');
