import {gradeHunyuanSkin,hunyuanSkinGLSL} from './hunyuan-skin.js?v=97';
import * as THREE from 'three';
import {buildHunyuanGraft} from './hunyuan-graft.js?v=99';

export async function loadHunyuanTrialAssets({textures=true,root=new URL('./assets/hunyuan/',import.meta.url)}={}){
 const read=async name=>{const r=await fetch(new URL(name,root));if(!r.ok)throw Error(`混元试样资源加载失败：${name} (${r.status})`);return r.json();};
 const manifest=await read('manifest-v94.json?v=99');
 const [source,fit]=await Promise.all([read(manifest.mesh),read(manifest.fit)]);
 let map=null;
 let pixels=null;
 if(textures){map=await new THREE.TextureLoader().loadAsync(new URL(manifest.baseColor,root).href);map.flipY=false;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;const canvas=document.createElement('canvas');canvas.width=map.image.width;canvas.height=map.image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(map.image,0,0);pixels={width:canvas.width,height:canvas.height,data:ctx.getImageData(0,0,canvas.width,canvas.height).data};}
 return {source,fit,map,pixels,manifest};
}

export function trialBodyTarget(model,fit){
 const body=model.children.find(m=>m.isSkinnedMesh&&m.userData.part==='Body'&&m.name.includes('_SKIN'));
 if(!body)throw Error('混元试拼需要 Stone 身体皮肤与骨骼');
 const g=body.geometry,read=name=>Array.from(g.attributes[name].array);
 return {...fit,bodyParts:[{name:body.name,positions:read('position'),normals:read('normal'),uv:read('uv'),indices:Array.from(g.index.array),skinIndex:read('skinIndex'),skinWeight:read('skinWeight')}],bodyMesh:body};
}

function geometry(part){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(part.normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(part.uv,2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(part.skinIndices,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(part.skinWeights,4));g.setIndex(part.indices);
 if(part.neckBodyBlend)g.setAttribute('neckBodyBlend',new THREE.Float32BufferAttribute(part.neckBodyBlend,1));
 if(part.vertexColors)g.setAttribute('color',new THREE.Float32BufferAttribute(part.vertexColors,3));
 g.computeBoundingBox();g.computeBoundingSphere();return g;
}
export function sampleHunyuanColor(pixels,u,v){
 const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
 const x=Math.max(0,Math.min(1,u))*pixels.width-.5,y=Math.max(0,Math.min(1,v))*pixels.height-.5,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,color=[0,0,0];
 for(const [dx,dy,w] of [[0,0,(1-fx)*(1-fy)],[1,0,fx*(1-fy)],[0,1,(1-fx)*fy],[1,1,fx*fy]]){const k=(Math.max(0,Math.min(pixels.height-1,iy+dy))*pixels.width+Math.max(0,Math.min(pixels.width-1,ix+dx)))*4;for(let c=0;c<3;c++)color[c]+=linear(pixels.data[k+c]/255)*w;}
 return color;
}
function sharedSkinMaterial(bodyMaterial,map=null,vertexColors=false){
 // The recipient uses a toon ramp. Matching albedo and normals is insufficient
 // when head/bridge use a different light response across the same skin seam.
 const m=bodyMaterial.clone();m.userData={};m.color.set(0xffffff);m.map=map;m.vertexColors=vertexColors;
 m.side=THREE.DoubleSide;m.flatShading=false;m.transparent=false;m.opacity=1;m.alphaTest=0;
 m.onBeforeCompile=()=>{};
 if(m.isMeshStandardMaterial){m.roughness=.87;m.metalness=0;}
 return m;
}
function bridgeMaterial(bodyMaterial){
 const m=sharedSkinMaterial(bodyMaterial,null,true);
 m.userData.hunyuanBridge=true;m.userData.bodyColor=bodyMaterial.color.toArray();return m;
}
function donorMaterial(map,bodyMaterial){
 const bodyColor=bodyMaterial.color.clone(),m=sharedSkinMaterial(bodyMaterial,map,false);
 m.userData.hunyuanBodyColor=bodyColor.toArray();
 const skinGain=new THREE.Vector3(1,1,1);m.userData.hunyuanSkinGain=skinGain; m.userData.hunyuanSkinBody=bodyColor;
 m.onBeforeCompile=shader=>{
  shader.uniforms.hunyuanBodyColor={value:bodyColor};shader.uniforms.hunyuanSkinGain={value:skinGain};
  shader.vertexShader='attribute float neckBodyBlend; varying float vHunyuanNeckBlend;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHunyuanNeckBlend=neckBodyBlend;');
  shader.fragmentShader='uniform vec3 hunyuanBodyColor; uniform vec3 hunyuanSkinGain; varying float vHunyuanNeckBlend;\n'+hunyuanSkinGLSL+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=gradeHunyuanSkin(diffuseColor.rgb,hunyuanSkinGain);\ndiffuseColor.rgb=mix(diffuseColor.rgb,hunyuanBodyColor,clamp(vHunyuanNeckBlend,0.,1.));');
 };
 m.customProgramCacheKey=()=> 'hunyuan-skin-color-v97';
 return m;
}

function makeSkinned(model,body,part,material,name){
 const mesh=new THREE.SkinnedMesh(geometry(part),material);mesh.name=name;mesh.userData.part=name;mesh.userData.hunyuanTrial=true;
 mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;model.add(mesh);mesh.bind(body.skeleton,body.bindMatrix.clone());return mesh;
}

/** Attach the trial to the actual runtime body. Existing Stone data stays immutable. */
export function attachHunyuanTrial(model,assets,settings={}){
 settings={...assets.manifest?.defaultSettings,...settings};
 if(!model.userData.hunyuanTrial){
  const removed=model.children.filter(m=>m.isMesh&&(m.userData.part==='Face'||m.userData.part?.startsWith('Hair')||m.userData.part?.endsWith('Wire')));
  const disposed=new Set();for(const m of removed){model.remove(m);if(!disposed.has(m.geometry)){m.geometry.dispose();disposed.add(m.geometry);}}
  const target=trialBodyTarget(model,assets.fit),body=target.bodyMesh;
  const headMaterial=donorMaterial(assets.map,body.material);
  const neckMaterial=bridgeMaterial(body.material);
  const clayMaterial=new THREE.MeshStandardMaterial({color:'#babcc0',roughness:.9,side:THREE.DoubleSide});
  const headClayMaterial=clayMaterial.clone();headClayMaterial.flatShading=false;
  const wireMaterial=new THREE.MeshBasicMaterial({color:'#e7bc61',wireframe:true,depthTest:false,transparent:true,opacity:.7});
  model.userData.materials.push(headMaterial,neckMaterial,clayMaterial,headClayMaterial,wireMaterial);
  model.userData.hunyuanTrial={body,target,headMaterial,neckMaterial,clayMaterial,headClayMaterial,wireMaterial,meshes:[],view:'texture',showSeam:false};
 }
 const trial=model.userData.hunyuanTrial;
 const result=buildHunyuanGraft({source:assets.source,bodyTarget:trial.target,settings});
 // All three skin parts share one target albedo. The donor keeps its painted shadows.
 if(settings.skinColor){
  const color=new THREE.Color(settings.skinColor),reference=new THREE.Color(settings.donorSkinReference||'#d77f4d');
  const bodyMaterial=trial.body.userData.hunyuanOriginalMaterial||trial.body.material;
  bodyMaterial.color.copy(color);trial.neckMaterial.userData.bodyColor=color.toArray();
  trial.headMaterial.userData.hunyuanBodyColor=color.toArray();trial.headMaterial.userData.hunyuanSkinBody.copy(color);
  trial.headMaterial.userData.hunyuanSkinGain.set(color.r/reference.r,color.g/reference.g,color.b/reference.b);
 }
 const skinGain=trial.headMaterial.userData.hunyuanSkinGain.toArray();
 for(const m of trial.meshes){model.remove(m);m.geometry.dispose();}
 // Vertex colors avoid interpolating UVs across unrelated triangle-atlas islands.
 const bodyColor=trial.neckMaterial.userData.bodyColor;
 result.bridge.vertexColors=[];
 result.bridge.neckBodyBlend.forEach((t,i)=>{
  const parent=result.bridge.colorParents?.[i];
  if(parent){const [a,b,f]=parent;result.bridge.vertexColors.push(...[0,1,2].map(k=>result.bridge.vertexColors[a*3+k]*(1-f)+result.bridge.vertexColors[b*3+k]*f));return;}
  let top=assets.pixels?sampleHunyuanColor(assets.pixels,...result.bridge.uv.slice(i*2,i*2+2)):bodyColor;
  top=gradeHunyuanSkin(top,skinGain);
  const headId=i>=result.bridge.bodyVertexIds.length?result.bridge.headVertexIds[i-result.bridge.bodyVertexIds.length]:null;
  const fade=headId!=null?(result.head.neckBodyBlend?.[headId]||0):0;
  top=top.map((v,k)=>v*(1-fade)+bodyColor[k]*fade);
  result.bridge.vertexColors.push(...top.map((v,k)=>v*(1-t)+bodyColor[k]*t));
 });
 // Commit the recipient deformation only after a successful immutable rebuild.
 trial.body.geometry.attributes.position.copyArray(result.body.positions);
 trial.body.geometry.attributes.normal.copyArray(result.body.normals);
 trial.body.geometry.attributes.position.needsUpdate=true;trial.body.geometry.attributes.normal.needsUpdate=true;
 trial.body.geometry.computeBoundingBox();trial.body.geometry.computeBoundingSphere();
 delete model.userData.pantsNormalCache;
 const head=makeSkinned(model,trial.body,result.head,trial.headMaterial,'HunyuanHead');
 const bridge=makeSkinned(model,trial.body,result.bridge,trial.neckMaterial,'HunyuanNeckBridge');
 const wire=makeSkinned(model,trial.body,result.bridge,trial.wireMaterial,'HunyuanSeamWire');wire.renderOrder=20;
 trial.meshes=[head,bridge,wire];trial.result=result;trial.settings={...settings};
 setHunyuanTrialView(model,trial.view,trial.showSeam);
 model.userData.faceY=assets.fit.targets.faceRig.eyes[0][1]+model.position.y;
 model.userData.height=new THREE.Box3().setFromObject(model).max.y;model.updateMatrixWorld(true);
 return result;
}
export function setHunyuanTrialView(model,view='texture',showSeam=false){
 const trial=model?.userData.hunyuanTrial;if(!trial)return;
 trial.view=view;trial.showSeam=showSeam;
 const [head,bridge,wire]=trial.meshes;
 head.material=view==='clay'?trial.headClayMaterial:trial.headMaterial;
 bridge.material=view==='clay'?trial.clayMaterial:trial.neckMaterial;
 wire.visible=!!showSeam;
 // The body uses its existing shader; a color-only clay override is reversible.
 for(const m of model.children.filter(m=>m.isMesh&&!m.userData.hunyuanTrial)){
  if(!m.userData.hunyuanOriginalMaterial)m.userData.hunyuanOriginalMaterial=m.material;
  m.material=view==='clay'?trial.clayMaterial:m.userData.hunyuanOriginalMaterial;
 }
}

// Body's motion pass updates its skin normals. Keep the shared collar attributes equal.
export function syncHunyuanSeamNormals(model){
 const trial=model?.userData.hunyuanTrial;if(!trial?.result)return;
 const normal=trial.body.geometry.attributes.normal,bridge=trial.meshes[1]?.geometry.attributes.normal,wire=trial.meshes[2]?.geometry.attributes.normal;if(!bridge)return;
 trial.result.bridge.bodyVertexIds.forEach((id,i)=>{bridge.setXYZ(i,normal.getX(id),normal.getY(id),normal.getZ(id));wire?.setXYZ(i,normal.getX(id),normal.getY(id),normal.getZ(id));});
 const parents=trial.result.bridge.colorParents;
 if(parents)for(let i=0;i<parents.length;i++){const p=parents[i];if(!p)continue;const [a,b,t]=p,n=[0,1,2].map(k=>bridge.array[a*3+k]*(1-t)+bridge.array[b*3+k]*t),l=Math.hypot(...n)||1;bridge.setXYZ(i,...n.map(v=>v/l));wire?.setXYZ(i,...n.map(v=>v/l));}
 bridge.needsUpdate=true;if(wire)wire.needsUpdate=true;
}
