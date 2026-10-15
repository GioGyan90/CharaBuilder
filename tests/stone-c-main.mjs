import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {loadHumanAssets,ensureHumanPresets,createHuman,disposeHuman,applyHumanColors} from '../dist/anime.js';
import {updateCharacterMotion as play} from '../dist/motion.js';
global.fetch=async u=>{try{return new Response(await fs.readFile(new URL(u)));}catch{return new Response('',{status:404});}};
const state=JSON.parse(await fs.readFile(new URL('../dist/assets/anime/stone-c-defaults.json',import.meta.url),'utf8'));
await loadHumanAssets({textures:false});await ensureHumanPresets(state,{textures:false});
const eyePatch=JSON.parse(await fs.readFile(new URL('../dist/assets/anime/stone-c-eyes-v103.json',import.meta.url),'utf8'));
const baseline=JSON.parse(await fs.readFile(new URL('fixtures/stone-c-reference.json',import.meta.url),'utf8'));
const model=createHuman(state);play(model,0,'rest');
let deviation=0;for(const m of model.children.filter(x=>x.isMesh&&x.name!=='StoneC_HAIR'&&!x.name.startsWith('StoneCEye'))){
 const previous=baseline.parts.find(p=>p.name===({StoneCHead_SKIN:'HunyuanHead',StoneCNeck_SKIN:'HunyuanNeckBridge'}[m.name]||m.name));if(!previous)throw Error('Missing baseline '+m.name);
 assert.equal(m.geometry.index.count+(m.name==='StoneCHead_SKIN'?model.children.find(x=>x.name==='StoneC_HAIR').geometry.index.count:0),previous.indexCount+(m.name==='StoneCHead_SKIN'?eyePatch.replacementIndices.length-eyePatch.removedTriangles.length*3:0));
 const p=m.geometry.attributes.position,v=new THREE.Vector3();for(const [i,x,y,z] of previous.samples){v.fromBufferAttribute(p,i);m.applyBoneTransform(i,v);v.applyMatrix4(m.matrixWorld);deviation=Math.max(deviation,v.distanceTo(new THREE.Vector3(x,y,z)));}
}
console.log('baseline deviation',deviation);assert.ok(deviation<1e-6);
// Every geometric seam gets exactly the same influences, including atlas duplicates.
const groups=new Map();for(const m of model.children.filter(x=>x.isMesh&&x.name.includes('_SKIN'))){const g=m.geometry;for(const i of new Set(g.index.array)){const k=[0,1,2].map(a=>Math.round(g.attributes.position.array[i*3+a]*1e6)).join(',');if(!groups.has(k))groups.set(k,[]);groups.get(k).push([m,i]);}}
const seams=[...groups.values()].filter(a=>new Set(a.map(([m])=>m.name)).size>1);assert.ok(seams.length>=341,'missing body/bridge/head seam');
let seamMax=0;for(const [mode,t] of [['rest',0],['walk',.7],['talk',1.2],['inspect',3.1],['walk',1.6]]){play(model,0,mode);play(model,t,mode);for(const entries of seams){let first;for(const [m,i] of entries){const p=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i);m.applyBoneTransform(i,p);if(first)seamMax=Math.max(seamMax,p.distanceTo(first));else first=p;}}}
console.log('seams',seams.length,seamMax);assert.ok(seamMax<1e-6);
const sourcePos=Array.from(model.children.find(m=>m.name==='StoneCHead_SKIN').geometry.attributes.position.array);
const changed=[];
for(const key of ['jawWidth','eyeWidth','mouthHeight','maxillaDepth','neckWidth','scmSternal','clavicleContour','craniumWidth','craniumDepth','facePlaneSoftness','height','shoulders']){
 const next=createHuman({...state,[key]:75}),head=next.children.find(m=>m.name==='StoneCHead_SKIN'),body=next.children.find(m=>m.name==='StoneReferenceBody_SKIN');
 const old=key==='scmSternal'||key==='clavicleContour'||key==='shoulders'?model.children.find(m=>m.name===body.name):model.children.find(m=>m.name===head.name),cur=old.name===body.name?body:head;
 const attr=key==='facePlaneSoftness'?'normal':'position',a=old.geometry.attributes[attr].array,b=cur.geometry.attributes[attr].array;let max=0;for(let i=0;i<a.length;i++)max=Math.max(max,Math.abs(a[i]-b[i]));assert.ok(max>1e-6,key+' does not edit geometry');changed.push([key,max]);disposeHuman(next);
}
applyHumanColors(model,{...state,skin:'#86543c'});assert.equal(model.children.find(m=>m.name==='StoneReferenceBody_SKIN').material.color.getHexString(),'86543c');
disposeHuman(model);
// Rebuilding and switching materials must not mutate the cached C mesh.
const repeat=createHuman(state);assert.deepEqual(Array.from(repeat.children.find(m=>m.name==='StoneCHead_SKIN').geometry.attributes.position.array),sourcePos);disposeHuman(repeat);
for(const clothes of ['underwear','shirtPants']){const s={...state,clothes,shoes:'shoes'};await ensureHumanPresets(s,{textures:false});const m=createHuman(s);if(clothes==='shirtPants')assert.ok(m.children.some(x=>x.userData.part==='Shirt'));assert.ok(m.children.some(x=>x.userData.part==='Shoes'));play(m,.7,'walk');disposeHuman(m);}
console.log(JSON.stringify({passed:true,baselineMaxDeviationM:deviation,seamVertices:seams.length,maxPosedSeamM:seamMax,parameters:changed,headTriangles:19261,staticOnly:false,browserGPUVerified:false},null,2));
console.log('PASS C main editor integration');

const legacy=JSON.parse(await fs.readFile(new URL('fixtures/legacy-foundations.json',import.meta.url),'utf8'));
for(const {state,geometrySHA256} of legacy){await ensureHumanPresets(state,{textures:false});const model=createHuman(state),hash=createHash('sha256');for(const mesh of model.children.filter(m=>m.isMesh)){hash.update(mesh.name);for(const name of ['position','normal','uv','skinIndex','skinWeight']){const a=mesh.geometry.attributes[name]?.array;if(a)hash.update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));}const a=mesh.geometry.index.array;hash.update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));}assert.equal(hash.digest('hex'),geometrySHA256,'legacy geometry changed');disposeHuman(model);}
console.log('PASS boy/girl and legacy geometry/weights byte-for-byte');
