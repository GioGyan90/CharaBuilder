import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {loadHumanAssets,ensureHumanPresets,createHuman,disposeHuman,applyHumanColors} from '../dist/anime.js';
import {updateCharacterMotion} from '../dist/motion.js';
global.fetch=async u=>{try{return new Response(await fs.readFile(new URL(u)));}catch{return new Response('',{status:404});}};
const root=new URL('../dist/assets/anime/',import.meta.url);
const state=JSON.parse(await fs.readFile(new URL('stone-c-defaults.json',root),'utf8'));
const source=JSON.parse(gunzipSync(Buffer.from(await fs.readFile(new URL('stone-c-v101.b64',root),'utf8'),'base64')));
const original=source.meshes.find(m=>m.name==='Face').groups[0].indices;
const patch=JSON.parse(await fs.readFile(new URL('stone-c-eyes-v103.json',root),'utf8')),removed=new Set(patch.removedTriangles);
const expected=original.filter((_,i)=>!removed.has(Math.floor(i/3))).concat(patch.replacementIndices);
await loadHumanAssets({textures:false});await ensureHumanPresets(state,{textures:false});
for(const edits of [{},{craniumWidth:100,craniumDepth:0,headSize:75}]){
 const s={...state,...edits},model=createHuman(s),hair=model.children.find(m=>m.name==='StoneC_HAIR'),head=model.children.find(m=>m.name==='StoneCHead_SKIN');
 assert.ok(hair?.isSkinnedMesh,'hair must be an independently skinned mesh');
 assert.equal(hair.material.map,null);assert.equal(hair.material.userData.colorRole,'hairColor');
 const a=Array.from(hair.geometry.index.array),b=Array.from(head.geometry.index.array);
 assert.equal(a.length/3,14033);assert.equal(b.length/3,5228-patch.removedTriangles.length+patch.replacementIndices.length/3);
 assert.deepEqual([...a,...b].sort((a,b)=>a-b),[...expected].sort((a,b)=>a-b),'partition must neither drop nor duplicate triangles');
 for(const attr of ['position','normal','uv','skinIndex','skinWeight'])assert.deepEqual(hair.geometry.attributes[attr].array,head.geometry.attributes[attr].array,'shared '+attr);
 const headColor=head.material.color.getHexString(),positions=hair.geometry.attributes.position.array.slice();
 for(const mode of ['rest','walk','talk','inspect']){
  updateCharacterMotion(model,.7,mode);
  for(const color of ['#3388ee','#e8c56e','#ffffff']){
   applyHumanColors(model,{...s,hairColor:color});assert.equal('#'+hair.material.color.getHexString(),color);
   assert.equal(head.material.color.getHexString(),headColor);assert.equal(hair.material.map,null);
   assert.deepEqual(hair.geometry.attributes.position.array,positions,'color changes cannot rebuild geometry');
  }
 }
 disposeHuman(model);
}
console.log('PASS C separate hair: exact triangle partition, shared deformation/weights, untextured live colors during motion');
