import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {buildAnimeFace} from '../dist/face.js';
import {createDeformer,parameterDefaults} from '../dist/parameters.js';
import {authoredMuscleRatio} from '../dist/body.js';
import {muscleGuide} from '../dist/muscle-guide.js';
import {stoneDetailGLSL,stoneTempleGLSL,installStoneDetail,installStoneTemples} from '../dist/stone-detail.js';
import * as THREE from '../dist/vendor/three.module.js';
const root=new URL('../dist/assets/anime/',import.meta.url);
async function asset(name){const m=JSON.parse(await fs.readFile(new URL(name+'-manifest.json',root),'utf8'));const parts=await Promise.all(m.parts.map(p=>fs.readFile(new URL(p,root),'utf8')));return [JSON.parse(gunzipSync(Buffer.from(parts.join(''),'base64'))),m];}
const [base]=await asset('male');base.maps=[];
const adult=buildAnimeFace(base,'male','stone'),formal=buildAnimeFace(base,'male',true);
assert.equal(formal.presetName,'隼 · 熟男脸');assert.equal(adult.landmarks.faceRig.preset.adult,true);
const state={...parameterDefaults,gender:'male',faceSource:'stone',height:50,weight:45,legs:50,shoulders:45,faceWidth:50,eyeSize:50,eyeSpace:50,nose:50,mouth:50};
const l=adult.landmarks,skin=adult.meshes[0],deform=createDeformer(state,l,1);
const neutral=createDeformer({...state,faceSource:'authored'},formal.landmarks,1);
const chin=[l.faceRig.headX,l.faceRig.chin,l.faceRig.nose[2]];
assert.ok(deform(...chin,'Face:skin')[1]<neutral(...chin,'Face:skin')[1]-.005,'adult foundation must change actual jaw geometry');
const eye=l.faceRig.eyes[0],a=[eye[0]-.009,eye[1]-.006,eye[2]],b=[eye[0]+.011,eye[1]+.010,eye[2]];
const distance=d=>Math.hypot(...d(...a,'Face:iris0').map((v,i)=>v-d(...b,'Face:iris0')[i]));
for(const eyeSize of [-50,50,150])for(const eyeWidth of [-50,150])for(const eyeHeight of [-50,150]){
 const d=createDeformer({...state,eyeSize,eyeWidth,eyeHeight},l,1);assert.ok(Math.abs(distance(d)-distance(deform))<1e-10,'iris dimensions must remain fixed during eye edits');
}
for(let t=0;t<=1;t+=.025){assert.ok(Math.abs(authoredMuscleRatio(t,-Math.PI)-authoredMuscleRatio(t,Math.PI))<1e-10);for(let a=-Math.PI;a<Math.PI;a+=.1)assert.ok(Number.isFinite(authoredMuscleRatio(t,a)));}
assert.equal(muscleGuide.license,'CC0-1.0');assert.match(muscleGuide.sourceSha256,/^[a-f0-9]{64}$/);
const [hair,m]=await asset('layered06');assert.equal(m.author,'culturalibre');assert.equal(m.license,'CC0-1.0');assert.equal(hair.meshes[0].sourceVertexIds.length,10430);assert.equal(new Set(hair.meshes[0].sourceVertexIds).size,10430);assert.equal(hair.meshes[0].groups[0].indices.length/3,14688);
// Compose the actual Three.js shader hooks, including its existing map hook.
for(const install of [material=>installStoneDetail(material,new THREE.Vector3(0,1.5,1.45),1,.01,1.6),material=>installStoneTemples(material,new THREE.Vector3(0,1.6,.01),1.6,1)]){
 const material=new THREE.MeshToonMaterial();let previous=false;material.onBeforeCompile=()=>previous=true;install(material);
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.toon.vertexShader,fragmentShader:THREE.ShaderLib.toon.fragmentShader};material.onBeforeCompile(shader);assert.ok(previous);assert.ok(shader.vertexShader.includes('=position;'));assert.ok(shader.fragmentShader.includes('diffuseColor.rgb'));assert.ok(Object.keys(shader.uniforms).length>=3);material.dispose();
}
assert.ok(stoneDetailGLSL.includes('return'));assert.ok(stoneTempleGLSL.includes('return'));
console.log('PASS independent adult foundation, fixed iris dimensions, continuous authored muscle profiles, 10430 source hair vertices / 14688 original triangles, composed skin-attached detail shaders');
