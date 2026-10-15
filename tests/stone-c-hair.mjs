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
const patch=JSON.parse(await fs.readFile(new URL('stone-c-eyes-v103.json',root),'utf8'));
await loadHumanAssets({textures:false});await ensureHumanPresets(state,{textures:false});
for(const edits of [{},{craniumWidth:100,craniumDepth:0,headSize:75}]){
 const s={...state,...edits},model=createHuman(s),hair=model.children.find(m=>m.name==='StoneC_HAIR'),side=model.children.find(m=>m.name==='StoneCSide_HAIR'),head=model.children.find(m=>m.name==='StoneCHead_SKIN');
 assert.ok(hair?.isSkinnedMesh&&side?.isSkinnedMesh,'both hair regions must be independently skinned');
 assert.equal(side.material.map,null);assert.equal(side.material.userData.colorRole,'sideHairColor');
 assert.equal(hair.material.map,null);assert.equal(hair.material.userData.colorRole,'hairColor');
 const a=Array.from(hair.geometry.index.array),b=Array.from(head.geometry.index.array),c=Array.from(side.geometry.index.array);
 assert.ok(c.length>1000&&a.length>1000,'both color regions need geometry');
 assert.equal(b.length/3,5228-patch.removedTriangles.length+patch.replacementIndices.length/3);
 const area=ids=>{const p=head.geometry.attributes.position;let sum=0;for(let i=0;i<ids.length;i+=3){const [A,B,C]=ids.slice(i,i+3).map(id=>[p.getX(id),p.getY(id),p.getZ(id)]),u=B.map((v,k)=>v-A[k]),v=C.map((v,k)=>v-A[k]);sum+=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;}return sum;};
 const partition=JSON.parse(await fs.readFile(new URL('stone-c-hair.json',root),'utf8')),sourceHair=partition.hairTriangles.flatMap(t=>original.slice(t*3,t*3+3));
 // Neutral clipping preserves the source surface; nonlinear edits are sampled at new seam points.
 if(!Object.keys(edits).length)assert.ok(Math.abs(area(a)+area(c)-area(sourceHair))<1e-6,'material cut changed hair surface area');
 assert.equal(new Set([...a,...c].filter(i=>i<source.meshes.find(m=>m.name==='Face').positions.length/3)).size,new Set(sourceHair).size,'all original hair corners retained');
 const rest=head.geometry.attributes.cEyeRestPosition,rearBands=[0,0,0];
 const center=ids=>ids.reduce((sum,id)=>sum.map((v,k)=>v+rest.array[id*3+k]/3),[0,0,0]);
 for(let i=0;i<a.length;i+=3){const [x,y,z]=center(a.slice(i,i+3));assert.ok(!(z<.030&&y<1.593+.08*z-1e-5),'lower rear hair left in main color group');assert.ok(!(z>.035&&z<.095&&Math.abs(x)>.049&&y<1.593+.08*z-1e-5),'black temple wedges left beside short hair');}
 for(let i=0;i<c.length;i+=3){const [x,y,z]=center(c.slice(i,i+3));assert.ok(!(z>.100&&Math.abs(x)<.0499),'short-hair material leaked into central fringe');if(z<-.070)rearBands[x<-.035?0:x>.035?2:1]++;}
 assert.ok(rearBands.every(n=>n>30),'rear band must cover left, center and right behind ears');
 const mainVertices=new Set(a);let fringeSamples=0;const sourcePos=source.meshes.find(m=>m.name==='Face').positions;for(const i of new Set(sourceHair)){const [x,y,z]=sourcePos.slice(i*3,i*3+3).map(v=>v/1e5);if(Math.abs(x)<.050&&z>.110&&y<1.593+.08*z){assert.ok(mainVertices.has(i),'projecting front fringe lost main color');fringeSamples++;}}assert.ok(fringeSamples>30,'must sample the original projecting fringe');
 // Material seams must connect from the left side through the rear to the right.
 const vertices=new Map(),key=id=>[0,1,2].map(k=>Math.round(rest.array[id*3+k]*1e6)).join(',');
 for(let i=0;i<c.length;i+=3){const keys=c.slice(i,i+3).map(key);for(const k of keys){if(!vertices.has(k))vertices.set(k,new Set());for(const other of keys)vertices.get(k).add(other);}}
 const seen=new Set(),queue=[vertices.keys().next().value];while(queue.length){const k=queue.pop();if(seen.has(k))continue;seen.add(k);for(const next of vertices.get(k))if(!seen.has(next))queue.push(next);}
 assert.equal(seen.size,vertices.size,'side/back short hair split into disconnected patches');
 for(const attr of ['position','normal','uv','skinIndex','skinWeight'])for(const region of [hair,side])assert.deepEqual(region.geometry.attributes[attr].array,head.geometry.attributes[attr].array,'shared '+attr);
 const headColor=head.material.color.getHexString(),positions=hair.geometry.attributes.position.array.slice();
 for(const mode of ['rest','walk','talk','inspect']){
  updateCharacterMotion(model,.7,mode);
  for(const color of ['#3388ee','#e8c56e','#ffffff']){
   applyHumanColors(model,{...s,hairColor:color,sideHairColor:'#71908b'});assert.equal('#'+hair.material.color.getHexString(),color);assert.equal(side.material.color.getHexString(),'71908b');
   applyHumanColors(model,{...s,hairColor:color,sideHairColor:'#cc7788'});assert.equal('#'+hair.material.color.getHexString(),color);assert.equal(side.material.color.getHexString(),'cc7788');
   assert.equal(head.material.color.getHexString(),headColor);assert.equal(hair.material.map,null);assert.equal(side.material.map,null);
   assert.deepEqual(side.geometry.attributes.position.array,positions,'side color cannot change geometry');
   assert.deepEqual(hair.geometry.attributes.position.array,positions,'color changes cannot rebuild geometry');
  }
 }
 disposeHuman(model);
}
console.log('PASS C independently colored main/temple hair: surface-preserving region cut, shared deformation/weights, untextured live colors during motion');
