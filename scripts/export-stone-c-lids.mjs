import fs from 'node:fs/promises';
import * as THREE from 'three';
import {loadHumanAssets,ensureHumanPresets,createHuman,disposeHuman} from '../dist/anime.js';
import {updateCharacterMotion} from '../dist/motion.js';
import {updateStoneCBlink} from '../dist/stone-c-lids.js';
global.fetch=async u=>{try{return new Response(await fs.readFile(new URL(u)));}catch{return new Response('',{status:404});}};
const state=JSON.parse(await fs.readFile(new URL('../dist/assets/anime/stone-c-defaults.json',import.meta.url),'utf8'));
await loadHumanAssets({textures:false});await ensureHumanPresets(state,{textures:false});
const model=createHuman(state);updateCharacterMotion(model,0,'rest');model.updateMatrixWorld(true);
function exportMesh(m){const points=[],p=new THREE.Vector3();for(let i=0;i<m.geometry.attributes.position.count;i++){p.fromBufferAttribute(m.geometry.attributes.position,i);m.applyBoneTransform(i,p);p.applyMatrix4(m.matrixWorld);points.push(...p.toArray());}return {name:m.name,positions:points,normals:Array.from(m.geometry.attributes.normal.array),uv:Array.from(m.geometry.attributes.uv.array),indices:Array.from(m.geometry.index.array),color:'#'+m.material.color.getHexString(),texture:m.userData.texture||null,cleanup:m.geometry.attributes.cEyePaintCleanup?Array.from(m.geometry.attributes.cEyePaintCleanup.array):null};}
const common=model.children.filter(m=>m.isMesh&&!m.userData.stoneCLid).map(exportMesh),states=[];
for(const amount of [0,.5,1]){updateStoneCBlink(model,0,amount);states.push({amount,parts:model.userData.stoneCBlink.meshes.map(exportMesh)});}
const output=process.argv[2]||new URL('../artifacts/lid-review/runtime.json',import.meta.url);if(!process.argv[2])await fs.mkdir(new URL('../artifacts/lid-review/',import.meta.url),{recursive:true});await fs.writeFile(output,JSON.stringify({common,states}));disposeHuman(model);
