import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {loadHumanAssets,ensureHumanPresets,createHuman,disposeHuman} from '../dist/anime.js';
import {updateStoneCBlink,stoneCBlinkAmount} from '../dist/stone-c-lids.js';
import {updateCharacterMotion} from '../dist/motion.js';
global.fetch=async u=>{try{return new Response(await fs.readFile(new URL(u)));}catch{return new Response('',{status:404});}};
const state=JSON.parse(await fs.readFile(new URL('../dist/assets/anime/stone-c-defaults.json',import.meta.url),'utf8'));
await loadHumanAssets({textures:false});await ensureHumanPresets(state,{textures:false});
function tris(mesh){const p=mesh.geometry.attributes.position.array,idx=mesh.geometry.index.array,result=[];for(let i=0;i<idx.length;i+=3){const v=Array.from(idx.slice(i,i+3),k=>Array.from(p.slice(k*3,k*3+3)));result.push(v);}return result;}
function frontZ(tris,x,y){let z=-Infinity;for(const [a,b,c] of tris){if(x<Math.min(a[0],b[0],c[0])-1e-8||x>Math.max(a[0],b[0],c[0])+1e-8||y<Math.min(a[1],b[1],c[1])-1e-8||y>Math.max(a[1],b[1],c[1])+1e-8)continue;const d=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(d)<1e-14)continue;const u=((x-a[0])*(c[1]-a[1])-(y-a[1])*(c[0]-a[0]))/d,v=((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))/d;if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7)z=Math.max(z,a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]));}return z;}
for(const edit of [{},{eyeWidth:100,eyeHeight:100,eyeSpace:0,eyeDepth:100},{eyeWidth:0,eyeHeight:0,eyeTilt:100,craniumWidth:100,craniumDepth:0,headSize:75}]){
 const model=createHuman({...state,...edit}),lids=model.userData.stoneCBlink.meshes;assert.equal(lids.length,4);
 const headMesh=model.children.find(m=>m.name==='StoneCHead_SKIN');assert.equal(headMesh.geometry.attributes.cEyePaintCleanup.count,headMesh.geometry.attributes.position.count);
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.toon.vertexShader,fragmentShader:THREE.ShaderLib.toon.fragmentShader};headMesh.material.onBeforeCompile(shader);assert.ok(shader.vertexShader.includes('vCEyePaintCleanup=cEyePaintCleanup'));assert.ok(shader.fragmentShader.includes('mix(diffuseColor.rgb,cOriginalSkin'));assert.ok(shader.uniforms.cOriginalSkin.value.toArray().every(Number.isFinite));
 const rest=headMesh.geometry.attributes.cEyeRestPosition,paint=headMesh.geometry.attributes.cEyePaintCleanup;
 assert.equal(rest.count,paint.count);let browSamples=0,lowerCleanup=0;
 for(let i=0;i<rest.count;i++){const x=Math.abs(rest.getX(i)),y=rest.getY(i);if(x>.018&&x<.052&&y>=1.536&&y<1.555){assert.equal(paint.getX(i),0,'cleanup damages eyebrow');browSamples++;}if(paint.getX(i)>0)lowerCleanup++;}
 assert.ok(browSamples>20&&lowerCleanup>0,'must check brows while retaining lower-rim cleanup');
 assert.ok(shader.vertexShader.includes('vCEyeRestPosition=cEyeRestPosition'));
 assert.ok(shader.fragmentShader.includes('vCEyePaintCleanup*cProtectBrow'),'fragment interpolation must also protect brow');
 // Every open back margin segment is bridged to its corresponding inner lining.
 for(const lid of lids){const m=lid.userData.stoneCLid,idx=Array.from(lid.geometry.index.array),p=lid.geometry.attributes.position;
  assert.equal(m.wetlineVertexIds.length,m.backMarginVertexIds.length);
  for(let i=0;i<m.wetlineVertexIds.length-1;i++){const a=m.backMarginVertexIds[i],b=m.backMarginVertexIds[i+1],c=m.wetlineVertexIds[i],d=m.wetlineVertexIds[i+1];for(const edge of [[a,c],[b,d],[a,b],[c,d]])assert.ok(idx.some((v,k)=>k%3===0&&edge.every(id=>idx.slice(k,k+3).includes(id))),'unbridged inner lining edge');}
  for(const i of [0,m.wetlineVertexIds.length-1]){const a=new THREE.Vector3().fromBufferAttribute(p,m.backMarginVertexIds[i]),b=new THREE.Vector3().fromBufferAttribute(p,m.wetlineVertexIds[i]);assert.ok(a.distanceTo(b)>1e-4,'eye corner must have posterior lining');}
 }
 const roots=lids.map(m=>m.userData.stoneCLid.rootVertexIds.map(i=>Array.from(m.geometry.attributes.position.array.slice(i*3,i*3+3)))),balls=model.children.filter(m=>m.name==='StoneCEyeWhite'),ballPositions=balls.map(m=>m.geometry.attributes.position.array.slice()),whiteTris=balls.flatMap(tris);let minClearance=Infinity;
 for(const amount of [0,.0625,.125,.25,.375,.5,.625,.75,.875,.9375,1]){
  updateStoneCBlink(model,0,amount);
  for(let n=0;n<lids.length;n++){
   const lid=lids[n],p=lid.geometry.attributes.position.array,normal=lid.geometry.attributes.normal.array;
   lid.userData.stoneCLid.rootVertexIds.forEach((id,i)=>assert.deepEqual(Array.from(p.slice(id*3,id*3+3)),roots[n][i],'root drift'));
   for(let i=0;i<normal.length;i+=3)assert.ok(Math.abs(Math.hypot(...normal.slice(i,i+3))-1)<2e-5,'non-unit lid normal');
   // Vertices and sampled triangle interiors must remain outside the globe.
   const points=[];for(let i=0;i<p.length;i+=3)points.push(Array.from(p.slice(i,i+3)));
   const triangles=tris(lid);for(let i=0;i<triangles.length;i+=5)points.push([0,1,2].map(k=>triangles[i].reduce((s,p)=>s+p[k],0)/3));
   for(let i=0;i<points.length;i+=3){const [x,y,z]=points[i],sphere=frontZ(whiteTris,x,y);if(Number.isFinite(sphere)){minClearance=Math.min(minClearance,z-sphere);assert.ok(z>=sphere-2e-5,'eyelid intersects globe: '+JSON.stringify({edit,amount,x,y,z,sphere}));}}
  }
 }
 assert.ok(minClearance>0,'skin thickness must stay outside the eyeball');
 for(let i=0;i<balls.length;i++)assert.deepEqual(balls[i].geometry.attributes.position.array,ballPositions[i],'blink must never shrink eyes');
 for(const side of [-1,1]){
  const U=lids.find(m=>m.userData.stoneCLid.side===side&&m.userData.stoneCLid.upper),L=lids.find(m=>m.userData.stoneCLid.side===side&&!m.userData.stoneCLid.upper),ids=U.userData.stoneCLid.marginVertexIds,jds=L.userData.stoneCLid.marginVertexIds;
  assert.equal(ids.length,jds.length);for(let i=0;i<ids.length;i++){const a=new THREE.Vector3().fromBufferAttribute(U.geometry.attributes.position,ids[i]),b=new THREE.Vector3().fromBufferAttribute(L.geometry.attributes.position,jds[i]);assert.ok(a.distanceTo(b)<5e-7,'closed margins split');}
 }
 const head=model.children.filter(m=>['StoneCHead_SKIN','StoneC_HAIR'].includes(m.name)).flatMap(tris),cover=lids.flatMap(tris);let checked=0;
 for(const eye of balls){const t=tris(eye);for(let i=0;i<t.length;i+=7){const p=[0,1,2].map(k=>t[i].reduce((s,p)=>s+p[k],0)/3),front=frontZ(whiteTris,p[0],p[1]);if(front>frontZ(head,p[0],p[1])+1e-5){assert.ok(frontZ(cover,p[0],p[1])>front+1e-5,'closed lids leak sclera');checked++;}}}
 assert.ok(checked>5,'no aperture samples');
 if(!Object.keys(edit).length)for(const [yaw,pitch] of [[45,0],[-45,0],[80,0],[35,25]]){
  const Y=yaw*Math.PI/180,P=pitch*Math.PI/180,rotate=triangles=>triangles.map(tri=>tri.map(([x,y,z])=>{const X=x*Math.cos(Y)-z*Math.sin(Y),Z=x*Math.sin(Y)+z*Math.cos(Y);return [X,y*Math.cos(P)-Z*Math.sin(P),y*Math.sin(P)+Z*Math.cos(P)];}));
  const eyeRays=rotate(whiteTris),skinRays=rotate(head),lidRays=rotate(cover);let visible=0;
  for(let i=0;i<eyeRays.length;i+=11){const p=[0,1,2].map(k=>eyeRays[i].reduce((s,p)=>s+p[k],0)/3),front=frontZ(eyeRays,p[0],p[1]);if(front>frontZ(skinRays,p[0],p[1])+1e-5){assert.ok(frontZ(lidRays,p[0],p[1])>=front-1e-5,'oblique closed eyelid leak '+JSON.stringify({yaw,pitch,p,front,head:frontZ(skinRays,p[0],p[1]),lid:frontZ(lidRays,p[0],p[1])}));visible++;}}
  console.log('PASS closed oblique occlusion',{yaw,pitch,apertureRays:visible});
 }

 model.userData.stoneCBlink.mode='blink';for(const motion of ['rest','walk','talk','inspect']){updateCharacterMotion(model,0,motion);updateCharacterMotion(model,.7,motion);assert.equal(model.userData.stoneCBlink.amount,1);}
 model.userData.stoneCBlink.mode='autoBlink';for(const t of [0,2.65,2.72,2.82,3,6.72]){updateCharacterMotion(model,t,'rest');assert.ok(Math.abs(model.userData.stoneCBlink.amount-stoneCBlinkAmount('autoBlink',t))<1e-10);}
 console.log('PASS lids',JSON.stringify(edit),{minClearance,closedApertureRays:checked});disposeHuman(model);
}
assert.equal(stoneCBlinkAmount('blink',100),1);assert.equal(stoneCBlinkAmount('neutral',2.72),0);assert.equal(stoneCBlinkAmount('autoBlink',2.72),1);
console.log('PASS true skin eyelids, fixed roots, globe clearance, closed contact, sclera occlusion and animated timing');
