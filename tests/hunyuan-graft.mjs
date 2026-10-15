import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
const runtime=process.env.HUNYUAN_DIST?pathToFileURL(path.resolve(process.env.HUNYUAN_DIST)+path.sep):new URL('../dist/',import.meta.url);
const base=process.env.CHARAMAKE_DIST?pathToFileURL(path.resolve(process.env.CHARAMAKE_DIST)+path.sep):runtime;
global.fetch=async url=>{try{return new Response(await fs.readFile(new URL(url)),{status:200});}catch{return new Response('',{status:404});}};
const {loadHumanAssets,ensureHumanPresets,createHuman,disposeHuman}=await import(new URL('anime.js',base));
const {updateCharacterMotion:play}=await import(new URL('motion.js',base));
const {gradeHunyuanSkin}=await import(new URL('hunyuan-skin.js',runtime));
const {loadHunyuanTrialAssets,attachHunyuanTrial,setHunyuanTrialView,syncHunyuanSeamNormals,sampleHunyuanColor}=await import(new URL('hunyuan-experiment-model.js',runtime));
const assets=await loadHunyuanTrialAssets({textures:false,root:new URL('assets/hunyuan/',runtime)});
assert.equal(assets.source.indices.length/3,23962);
assert.equal(assets.manifest.sourceSHA256,'78e3cc97ccd15c5b73695c81a26060311fe4e31941accfe1debe5f1d383169cf');
const immutable=createHash('sha256').update(JSON.stringify(assets.source)).digest('hex');
const fixture={width:2,height:2,data:new Uint8Array([255,0,0,255,0,255,0,255,0,0,255,255,255,255,255,255])};
assert.deepEqual(sampleHunyuanColor(fixture,.25,.25),[1,0,0]);
assert.deepEqual(sampleHunyuanColor(fixture,.25,.75),[0,0,1]);
assert.deepEqual(sampleHunyuanColor(fixture,.5,.5),[.5,.5,.5]);
assets.pixels=fixture;
await loadHumanAssets({textures:false});await ensureHumanPresets(assets.fit.state,{textures:false});
const model=createHuman(assets.fit.state),body=model.children.find(m=>m.userData.part==='Body'&&m.name.includes('_SKIN'));
const bodyPositions=Array.from(body.geometry.attributes.position.array),bodyIndices=Array.from(body.geometry.index.array),originalMaterial=body.material;
const result=attachHunyuanTrial(model,assets);
assert.notDeepEqual(Array.from(body.geometry.attributes.position.array),bodyPositions);
for(let i=0;i<bodyPositions.length;i+=3){const x=bodyPositions[i],y=bodyPositions[i+1];if(y<1.60||Math.abs(x)>.29)assert.deepEqual(Array.from(body.geometry.attributes.position.array.slice(i,i+3)),bodyPositions.slice(i,i+3),'neck work escaped into unrelated body');}
assert.deepEqual(model.userData.hunyuanTrial.target.bodyParts[0].positions,bodyPositions,'canonical recipient was mutated');
assert.deepEqual(Array.from(body.geometry.index.array),bodyIndices);
assert.ok(!model.children.some(m=>m.isMesh&&(m.userData.part==='Face'||m.userData.part?.startsWith('Hair'))));
assert.equal(result.report.headTriangles,20759);
assert.equal(result.report.bridgeTriangles,1705);
assert.equal(result.report.neckAnatomy.bridgeProfileRows,4);
const b=result.report.bounds,actualAspect=(b[0][1]-b[0][0])/(b[1][1]-result.landmarks.chin[1]);
assert.ok(Math.abs(actualAspect-427/563)<1e-6,'head width/height must match the measured Stone drawing, not the old eye spacing');
assert.equal(result.report.fitMode,'concept-head-aspect');
assert.equal(model.userData.hunyuanTrial.settings.widthScale,1);
assert.equal(result.bridge.bodyVertexIds.length,140);
const trial=model.userData.hunyuanTrial;
assert.equal(trial.headMaterial.flatShading,false,'corner normals already preserve the generated hard planes');
assert.equal(trial.neckMaterial.map,null,'bridge must never interpolate UVs across unrelated atlas tiles');
assert.equal(trial.neckMaterial.vertexColors,true);
assert.equal(trial.headMaterial.type,originalMaterial.type,'head/recipient shading mismatch');
assert.equal(trial.neckMaterial.type,originalMaterial.type,'bridge/recipient shading mismatch');
assert.equal(trial.headMaterial.gradientMap,originalMaterial.gradientMap,'head toon ramp differs');
assert.equal(trial.neckMaterial.gradientMap,originalMaterial.gradientMap,'bridge toon ramp differs');
assert.equal(trial.headMaterial.userData.ownedGradient,undefined,'cloned material claimed ownership of body texture');
assert.equal(trial.meshes[0].geometry.attributes.neckBodyBlend.count,trial.meshes[0].geometry.attributes.position.count);
const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>\n#include <color_fragment>'};
trial.headMaterial.onBeforeCompile(shader);
assert.ok(shader.vertexShader.includes('vHunyuanNeckBlend=neckBodyBlend'));
assert.ok(shader.fragmentShader.includes('diffuseColor.rgb=mix'));
assert.deepEqual(shader.uniforms.hunyuanBodyColor.value.toArray(),trial.neckMaterial.userData.bodyColor);
assert.equal(originalMaterial.color.getHexString(),assets.manifest.defaultSettings.skinColor.slice(1));
const reference=new THREE.Color(assets.manifest.defaultSettings.donorSkinReference).toArray(),targetColor=originalMaterial.color.toArray(),gain=shader.uniforms.hunyuanSkinGain.value.toArray();
const graded=gradeHunyuanSkin(reference,gain);graded.forEach((v,k)=>assert.ok(Math.abs(v-targetColor[k])<1e-12,'face/body base tone mismatch'));
for(const hex of ['#492f23','#17110d','#dcd8dc']){const c=new THREE.Color(hex).toArray();assert.deepEqual(gradeHunyuanSkin(c,gain),c,'hair/brow/eye-white was tinted');}
const fitSkin=assets.fit.state.skin;
attachHunyuanTrial(model,assets,{skinColor:'#bd7e55'});assert.equal(originalMaterial.color.getHexString(),'bd7e55');
attachHunyuanTrial(model,assets);assert.equal(originalMaterial.color.getHexString(),assets.manifest.defaultSettings.skinColor.slice(1));assert.equal(assets.fit.state.skin,fitSkin,'source skin state was rewritten');

const canonicalHead=Array.from(trial.meshes[0].geometry.attributes.position.array),canonicalBody=Array.from(body.geometry.attributes.position.array);
assert.equal(trial.settings.lowerFaceVolume,.5);assert.equal(trial.settings.sideFaceVolume,.5);
attachHunyuanTrial(model,assets,{lowerFaceVolume:0,sideFaceVolume:0});
assert.notDeepEqual(Array.from(trial.meshes[0].geometry.attributes.position.array),canonicalHead,'face volume controls did not affect head');
assert.deepEqual(Array.from(body.geometry.attributes.position.array),canonicalBody,'face controls altered the shoulder/neck body');
const slimHead=trial.meshes[0].geometry.attributes.position.array;
for(let i=1;i<canonicalHead.length;i+=3)assert.equal(slimHead[i],canonicalHead[i],'face volume altered facial height');
attachHunyuanTrial(model,assets);assert.deepEqual(Array.from(trial.meshes[0].geometry.attributes.position.array),canonicalHead,'face reset accumulated deformation');
assert.equal(trial.settings.scmDefinition,.5);assert.equal(trial.settings.clavicleDefinition,.5);
attachHunyuanTrial(model,assets,{scmDefinition:0,clavicleDefinition:0});
assert.notDeepEqual(Array.from(body.geometry.attributes.position.array),canonicalBody,'anatomy controls did not affect upper chest/neck');
const softHead=trial.meshes[0].geometry.attributes.position.array;
for(let i=0;i<canonicalHead.length;i+=3)if(canonicalHead[i+1]>1.945)assert.deepEqual(Array.from(softHead.slice(i,i+3)),canonicalHead.slice(i,i+3),'SCM/clavicle edits altered upper face/head');
attachHunyuanTrial(model,assets);
assert.deepEqual(Array.from(body.geometry.attributes.position.array),canonicalBody,'SCM/clavicle reset accumulated shape changes');

attachHunyuanTrial(model,assets,{neckStructure:0});assert.deepEqual(Array.from(body.geometry.attributes.position.array),bodyPositions,'zero structure failed to restore canonical body');
attachHunyuanTrial(model,assets);assert.deepEqual(Array.from(body.geometry.attributes.position.array),canonicalBody,'rebuilding accumulated deformation');assert.deepEqual(Array.from(trial.meshes[0].geometry.attributes.position.array),canonicalHead);

const point=(mesh,id)=>{const v=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,id);mesh.applyBoneTransform(id,v);return v.applyMatrix4(mesh.matrixWorld);};
for(const [pose,t] of [['rest',0],['walk',.43]]){
 play(model,0,pose);play(model,t,pose);syncHunyuanSeamNormals(model);model.updateMatrixWorld(true);model.userData.skeleton.update();
 const [head,bridge]=trial.meshes;
 for(let i=0;i<result.bridge.bodyVertexIds.length;i++){
  const id=result.bridge.bodyVertexIds[i];assert.equal(point(body,id).distanceTo(point(bridge,i)),0,'animated body seam separated');
  for(let k=0;k<3;k++){assert.equal(body.geometry.attributes.normal.array[id*3+k],bridge.geometry.attributes.normal.array[i*3+k]);assert.ok(Math.abs(bridge.geometry.attributes.color.array[i*3+k]-trial.neckMaterial.userData.bodyColor[k])<1e-7);}
 }
 result.bridge.headVertexIds.forEach((id,i)=>assert.equal(point(head,id).distanceTo(point(bridge,result.bridge.bodyVertexIds.length+i)),0,'animated head seam separated'));
}
setHunyuanTrialView(model,'clay',true);assert.equal(trial.meshes[0].material,trial.headClayMaterial);assert.equal(trial.meshes[2].visible,true);
setHunyuanTrialView(model,'texture',false);assert.equal(body.material,originalMaterial);assert.equal(trial.meshes[2].visible,false);
const previous=trial.meshes[0];assert.throws(()=>attachHunyuanTrial(model,{...assets,source:{...assets.source,uv:null}}));assert.equal(trial.meshes[0],previous,'a failed rebuild removed the previous valid trial');
assert.equal(createHash('sha256').update(JSON.stringify(assets.source)).digest('hex'),immutable);
disposeHuman(model);
console.log('PASS Hunyuan assets, lower/side face volume controls, fixed facial heights, SCM/clavicle controls and head protection, bounded recipient neck deformation, deterministic reset/rebuild, skin-only grade and unified head/body color, runtime shader neck color, UV color sampling, exact rest/walk collar positions/normals/weights, bridge vertex colors, clay/reset and failed-rebuild retention');
