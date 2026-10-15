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
import {gunzipSync} from 'node:zlib';
const importedData=JSON.parse(gunzipSync(Buffer.from(await fs.readFile(base+'assets/anime/imported-00003.b64','utf8'),'base64')));
const {deformAnimeFace}=await import(moduleURL(base+'face.js'));
const neutralRig=importedData.landmarks.faceRig,raw=importedData.meshes.find(m=>m.name==='Face');
const edges=new Map();
for(const {indices} of raw.groups)for(let i=0;i<indices.length;i+=3)for(const [a,b] of [[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]){const key=[a,b].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);}
const boundary=[...edges].filter(([,count])=>count===1).flatMap(([key])=>key.split(',').map(Number));
assert.ok(boundary.length>8,'missing body collar opening');
assert.ok(boundary.every(i=>raw.positions[i*3+1]===146465),'open hole remains outside body collar');
for(let i=0;i<raw.positions.length;i+=3){const p=raw.positions.slice(i,i+3).map(v=>v/1e5),q=deformAnimeFace(...p,parameterDefaults,neutralRig);assert.ok(q.every((v,k)=>Math.abs(v-p[k])<1e-12),'old preset sculpt was reapplied to imported head');}
// Check the generated, grafted runtime ribbons from the front with back-face culling.
function assertBothBrows(model){
 const brow=model.children.find(m=>m.name==='ImportedFaceBrow'),skin=model.children.find(m=>m.name==='Imported00003_Face_SKIN');
 assert.ok(brow&&skin,'brow or skin mesh missing');
 const p=brow.geometry.attributes.position,indices=brow.geometry.index.array,sp=skin.geometry.attributes.position,si=skin.geometry.index.array,seen={left:0,right:0};
 for(let i=0;i<indices.length;i+=3){
  const points=Array.from(indices.slice(i,i+3),id=>new THREE.Vector3().fromBufferAttribute(p,id));
  const [a,b,c]=points,n=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a));
  if(n.lengthSq()<1e-16)continue; // The tapered endpoint has a zero-width closing triangle.
  assert.ok(n.z>0,'mirrored brow faces into the head');
  const q=a.clone().add(b).add(c).multiplyScalar(1/3),ray=new THREE.Ray(q.clone().add(new THREE.Vector3(0,0,.25)),new THREE.Vector3(0,0,-1));
  assert.ok(ray.intersectTriangle(a,b,c,true,new THREE.Vector3()),'front ray cannot see eyebrow');
  let skinZ=-Infinity;
  for(let j=0;j<si.length;j+=3){const t=Array.from(si.slice(j,j+3),id=>new THREE.Vector3().fromBufferAttribute(sp,id)),hit=ray.intersectTriangle(...t,false,new THREE.Vector3());if(hit)skinZ=Math.max(skinZ,hit.z);}
  assert.ok(q.z>skinZ+.0002,'eyebrow triangle buried in edited skin');
  seen[q.x<0?'left':'right']++;
 }
 assert.ok(seen.left>=20&&seen.right>=20,'both brows must have visible front-facing surface '+JSON.stringify(seen));
 assert.equal(seen.left,seen.right,'one eyebrow lost faces during graft or compaction');
 if(brow.material.userData.stoneClay){const luma=c=>.2126*c.r+.7152*c.g+.0722*c.b;assert.ok(luma(brow.material.color)<luma(skin.material.color)*.4,'clay eyebrows must contrast with skin');}
}
const imported={...defaults,gender:'male',faceSource:'imported00003',bodySource:'vroid',frontHair:'none',backHair:'none',sideHair:'none',braid:'none',clothes:'underwear',shoes:'barefoot'};
for(const adultBranch of [false,true])for(const bodySource of adultBranch?['stone']:['vroid','stone'])for(const hair of ['none','imported00003'])for(const neckWidth of bodySource==='stone'?[50,75]:[50]){
 const state={...imported,...(adultBranch?{characterType:'man',foundationRevision:1}:{}),bodySource,neckWidth,trapezius:neckWidth,...(adultBranch&&neckWidth===75?{neckTendon:75,scmSternal:90,scmClavicular:90,clavicleContour:90,supraclavicularFossa:90,napeTransition:90,throatVolume:90}:{}),frontHair:hair,sideHair:hair,backHair:hair};await ensureHumanPresets(state,{textures:false});const model=createHuman(state);
 assertBothBrows(model);
 assert.equal(model.userData.faceSource,'imported00003');assert.equal(model.userData.headReference.source,'ComfyUI_00003_.glb');
 let faceTriangles=0,hairTriangles=0;model.traverse(m=>{if(!m.isMesh)return; if(m.userData.part==='Face')faceTriangles+=m.geometry.index.count/3;if(['HairFront','HairSide','HairBack'].includes(m.userData.part))hairTriangles+=m.geometry.index.count/3;});
 if(bodySource==='stone'&&hair==='imported00003'&&neckWidth===50){const cap=model.children.filter(m=>m.userData.part==='HairScalp').reduce((n,m)=>n+m.geometry.index.count/3,0),undercut=model.children.filter(m=>m.userData.part?.endsWith('Undercut')).reduce((n,m)=>n+m.geometry.index.count/3,0);console.log('Stone runtime triangles:',{face:faceTriangles,crown:hairTriangles,undercut,cap});}
 if(adultBranch)assert.ok(!model.children.some(m=>m.userData.part?.endsWith('Undercut')),'adult short hair should be a skin material layer');
 assert.ok(faceTriangles>1600&&faceTriangles<(adultBranch?2801:2600),'imported face triangle budget: '+faceTriangles);assert.equal(hairTriangles,hair==='none'?0:importedData.reference.hairFaces,'hair separation lost or duplicated triangles');
 if(bodySource==='stone'){
  const face=model.children.find(m=>m.userData.part==='Face'),body=model.children.find(m=>m.userData.part==='Body'),fp=face.geometry.attributes.position,bp=body.geometry.attributes.position;
  const edges=new Map(),canonical=new Map(),indices=Array.from(face.geometry.index.array,id=>{const key=[fp.getX(id),fp.getY(id),fp.getZ(id)].join(',');if(!canonical.has(key))canonical.set(key,id);return canonical.get(key);});
  for(let i=0;i<indices.length;i+=3)for(const [a,b] of [[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]){const key=[a,b].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);}
  const collarLimit=Math.min(...indices.map(id=>fp.getY(id)))+.06;
  const boundary=[...new Set([...edges].filter(([k,n])=>n===1&&k.split(',').every(id=>fp.getY(Number(id))<collarLimit)).flatMap(([k])=>k.split(',').map(Number)))];
  assert.ok(boundary.length>12,'missing neck boundary');
  const key=(p,i)=>[p.getX(i),p.getY(i),p.getZ(i)].join(','),bodyEdges=new Set(),bi=body.geometry.index.array;
  for(let i=0;i<bi.length;i+=3)for(let j=0;j<3;j++)bodyEdges.add([key(bp,bi[i+j]),key(bp,bi[i+(j+1)%3])].sort().join('|'));
  for(const [edge,count] of edges)if(count===1&&edge.split(',').every(id=>fp.getY(Number(id))<collarLimit)){const [a,b]=edge.split(',').map(Number);assert.ok(bodyEdges.has([key(fp,a),key(fp,b)].sort().join('|')),'head/body boundary edges differ');}

  const pairs=boundary.map(a=>{let nearest=-1,distance=Infinity;for(let b=0;b<bp.count;b++){const d=Math.hypot(fp.getX(a)-bp.getX(b),fp.getY(a)-bp.getY(b),fp.getZ(a)-bp.getZ(b));if(d<distance){distance=d;nearest=b;}}assert.ok(distance<1e-6,'neck boundary mismatch '+distance+' at '+[fp.getX(a),fp.getY(a),fp.getZ(a)].join(','));return [a,nearest];});
  const width=Math.max(...boundary.map(i=>fp.getX(i)))-Math.min(...boundary.map(i=>fp.getX(i)));
  // The independent adult carries wider SCM attachments, especially with anatomy controls at90.
  assert.ok(width<(adultBranch?.24:.20),'neck expanded beyond foundation budget '+JSON.stringify({adultBranch,neckWidth,width}));
  for(const pose of ['rest','walk']){play(model,.7,pose);for(const [a,b] of pairs){const pa=face.applyBoneTransform(a,new THREE.Vector3().fromBufferAttribute(fp,a)),pb=body.applyBoneTransform(b,new THREE.Vector3().fromBufferAttribute(bp,b));assert.ok(pa.distanceTo(pb)<1e-6,'posed neck seam separated');}}
 }
 for(const mode of ['rest','walk']){play(model,.7,mode);model.traverse(m=>{if(!m.isSkinnedMesh)return;for(const id of new Set(m.geometry.index.array)){const p=m.applyBoneTransform(id,new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,id));assert.ok(p.toArray().every(Number.isFinite));}});}
 disposeHuman(model);
}
for(const change of [{jawWidth:100},{jawDepth:0},{jawTilt:100},{chinLength:100},{eyeSize:100},{noseHeight:100},{maxillaDepth:100},{templeWidth:100}]){
 let moved=0;for(let i=0;i<raw.positions.length;i+=3){const p=raw.positions.slice(i,i+3).map(v=>v/1e5),q=deformAnimeFace(...p,{...parameterDefaults,...change},neutralRig);moved=Math.max(moved,Math.hypot(...q.map((v,k)=>v-p[k])));}assert.ok(moved>.002,'imported control has no visible displacement');
 const state={...imported,...change};await ensureHumanPresets(state,{textures:false});const model=createHuman(state);model.traverse(m=>{if(m.isMesh)assert.ok(Array.from(m.geometry.attributes.position.array).every(Number.isFinite));});disposeHuman(model);
}
const hairEdit={...imported,frontHair:'imported00003',sideHair:'imported00003',backHair:'imported00003',frontLength:80,sideLength:20,backLength:65};await ensureHumanPresets(hairEdit,{textures:false});const hairModel=createHuman(hairEdit),parts=hairModel.children.filter(m=>m.isMesh&&['HairFront','HairSide','HairBack'].includes(m.userData.part));
assert.equal(parts.length,3);const undercuts=hairModel.children.filter(m=>m.userData.part?.endsWith('Undercut'));assert.equal(undercuts.reduce((n,m)=>n+m.geometry.index.count/3,0),288);assert.ok(undercuts.some(m=>m.material.flatShading)); for(const part of parts.slice(1))assert.deepEqual(part.geometry.attributes.position.array,parts[0].geometry.attributes.position.array,'hair partition seam separated after mixed lengths');disposeHuman(hairModel);
for(const faceStructureView of ['regions','wire']){
 const model=createHuman({...imported,faceStructureView}),face=model.children.find(m=>m.userData.part==='Face');
 if(faceStructureView==='regions'){assert.equal(face.geometry.attributes.color.count,face.geometry.attributes.position.count);assert.equal(face.material.vertexColors,true);assert.equal(face.material.userData.colorRole,null);}
 else {const wire=model.children.find(m=>m.userData.part==='FaceWire');assert.ok(wire.isSkinnedMesh);assert.deepEqual(wire.geometry.attributes.position.array,face.geometry.attributes.position.array);assert.equal(face.material.wireframe,false);assert.equal(wire.material.wireframe,true);}
 disposeHuman(model);
}
console.log('PASS both eyebrows face outward and clear edited skin');
console.log('PASS imported head, independent body/hair choices, exact extracted hair triangle count, two skinned poses and eight edit controls');
const adult={...imported,characterType:'man',foundationRevision:1,bodySource:'stone',stoneView:'clay'};
await ensureHumanPresets(adult,{textures:false});
const adultModel=createHuman(adult);
assertBothBrows(adultModel);
assert.equal(adultModel.userData.baseFamily,'adultMale');
assert.equal(adultModel.userData.headReference.sourceAsset,'ComfyUI_00003_.glb');
assert.equal(adultModel.userData.model,'stone-adult-independent');
assert.ok(adultModel.userData.mixedHead);
adultModel.traverse(m=>{if(m.isMesh)assert.ok(Array.from(m.geometry.attributes.position.array).every(Number.isFinite));});
disposeHuman(adultModel);
for(const key of ['zygomaticArchDepth','jawCornerDepth','chinSquareness','mentolabialDepth','noseBaseDepth','upperLipWidth','lowerLipWidth','submentalDepth','foreheadSlope','midfaceSupport','jawBodySupport','muzzleDepth','philtrumDepth','philtrumLength','jawBase','jawRamus','masseter']){
 let max=0;for(let i=0;i<raw.positions.length;i+=3){const p=raw.positions.slice(i,i+3).map(v=>v/1e5),q=deformAnimeFace(...p,{...parameterDefaults,[key]:90},neutralRig);max=Math.max(max,Math.hypot(...q.map((v,k)=>v-p[k])));}
 assert.ok(max>.00005,key+' is a dead adult geometry control');
}
console.log('PASS independent adult source and 17 donor-space structural controls');
await fs.rm(temp,{recursive:true,force:true});
