import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {loadHumanAssets,ensureHumanPresets,createHuman,disposeHuman,applyHumanColors} from '../dist/anime.js';
import {updateCharacterMotion} from '../dist/motion.js';
global.fetch=async u=>{try{return new Response(await fs.readFile(new URL(u)));}catch{return new Response('',{status:404});}};
const state=JSON.parse(await fs.readFile(new URL('../dist/assets/anime/stone-c-defaults.json',import.meta.url),'utf8'));
await loadHumanAssets({textures:false});await ensureHumanPresets(state,{textures:false});
function frontZ(mesh,x,y){
 const p=mesh.geometry.attributes.position.array,ids=mesh.geometry.index.array;let best=-Infinity;
 for(let t=0;t<ids.length;t+=3){const a=ids[t]*3,b=ids[t+1]*3,c=ids[t+2]*3,den=(p[b]-p[a])*(p[c+1]-p[a+1])-(p[b+1]-p[a+1])*(p[c]-p[a]);if(Math.abs(den)<1e-14)continue;
 const u=((x-p[a])*(p[c+1]-p[a+1])-(y-p[a+1])*(p[c]-p[a]))/den,v=((p[b]-p[a])*(y-p[a+1])-(p[b+1]-p[a+1])*(x-p[a]))/den;
 if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)best=Math.max(best,p[a+2]+u*(p[b+2]-p[a+2])+v*(p[c+2]-p[a+2]));
 }return best;
}
for(const edit of [{},{eyeWidth:75,eyeHeight:25,eyeSpace:75},{craniumWidth:100,craniumDepth:0,headSize:75},{irisSize:0,pupilSize:0,gazeX:0,gazeY:100},{irisSize:100,pupilSize:100,gazeX:100,gazeY:0}]){
 const s={...state,...edit},m=createHuman(s),eyes=m.children.filter(x=>x.name.startsWith('StoneCEye'));assert.equal(eyes.length,8);
 for(const e of eyes){assert.ok(e.isSkinnedMesh);assert.equal(e.material.map,null);for(const k of ['position','normal','skinWeight'])for(const v of e.geometry.attributes[k].array)assert.ok(Number.isFinite(v));}
 const irises=eyes.filter(x=>x.name==='StoneCEyeIris'),pupils=eyes.filter(x=>x.name==='StoneCEyePupil');assert.equal(irises.length,2);assert.equal(pupils.length,2);
 for(const pupil of pupils){
  const p=pupil.geometry.attributes.position.array,cover=Math.max(...m.children.filter(x=>['StoneCHead_SKIN','StoneCEyeSocket_SKIN'].includes(x.name)).map(x=>frontZ(x,p[0],p[1])));
  assert.ok(p[2]>cover+1e-5,'new pupil is buried in head/socket');
 }
 applyHumanColors(m,{...s,eyeColor:'#427b99'});for(const iris of irises)assert.equal(iris.material.color.getHexString(),'427b99');
 for(const mode of ['rest','walk','talk','inspect']){updateCharacterMotion(m,0,mode);updateCharacterMotion(m,.7,mode);for(const eye of eyes){const p=new THREE.Vector3().fromBufferAttribute(eye.geometry.attributes.position,0);eye.applyBoneTransform(0,p);assert.ok(p.toArray().every(Number.isFinite));}}
 disposeHuman(m);
}
// Export actual runtime geometry at the neutral C state for orthographic QA.
const model=createHuman(state);updateCharacterMotion(model,0,'rest');model.updateMatrixWorld(true);
const parts=model.children.filter(x=>x.isMesh).map(m=>{
 const points=[],p=new THREE.Vector3();for(let i=0;i<m.geometry.attributes.position.count;i++){p.fromBufferAttribute(m.geometry.attributes.position,i);m.applyBoneTransform(i,p);p.applyMatrix4(m.matrixWorld);points.push(...p.toArray());}
 return {name:m.name,positions:points,normals:Array.from(m.geometry.attributes.normal.array),uv:Array.from(m.geometry.attributes.uv.array),indices:Array.from(m.geometry.index.array),color:'#'+m.material.color.getHexString(),texture:m.userData.texture||null};
});
if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify({parts}));disposeHuman(model);
console.log('PASS C independent globes, separate smaller iris/pupil, live eye color, five parameter states and four motions');
