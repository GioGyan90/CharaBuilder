import {bindCharacter} from './rig.js?v=27';
import * as THREE from 'three';
import {createDeformer,deformNormal,buildAnimeFace,headEnvelope,clearHair,bodyAnchors,bodyHandlePoints} from './parameters.js?v=21';
import {clothingMesh,shirtButtonPoints,smoothGarmentNormals} from './wardrobe.js?v=25';
import {referenceHairMeshes,hairAssetIds} from './hair.js?v=16';
import {createUnderwearData} from './underwear.js?v=16';

// CC0 VRoid beta HairSample model data, baked into a relaxed pose.
// This is a lightweight static editor, not the VRoid Studio runtime or a VRM exporter.
const assets = {};
const root = new URL('./assets/anime/', import.meta.url);
async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`资源 ${response.status}: ${url}`);
  return response.json();
}
const pending = new Map();
async function loadAsset(id, textures = true) {
  if (assets[id]) return assets[id];
  if (pending.has(id)) return pending.get(id);
  const promise = (async () => {
    const manifest = await json(new URL(`${id}-manifest.json`, root));
    const parts = await Promise.all(manifest.parts.map(async path => {
      const response = await fetch(new URL(path, root));
      if (!response.ok) throw Error(`模型分片加载失败: ${path}`);
      return response.text();
    }));
    const bytes = Uint8Array.from(atob(parts.join('')), c => c.charCodeAt(0));
    if (bytes.length !== manifest.bytes) throw Error('模型数据不完整');
    const data = JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    const used = new Set(data.meshes.flatMap(m=>m.groups.map(g=>g.material)));
    if(id==='female'||id==='male'){const response=await fetch(new URL(`${id}-rig.b64`,root));if(!response.ok)throw Error('骨骼资源加载失败');const bytes=Uint8Array.from(atob(await response.text()),c=>c.charCodeAt(0));data.rig=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}
    data.maps = textures ? await Promise.all(data.materials.map(async (m,i) => {
      if (!m.texture || !used.has(i) || /_CLOTH/.test(m.name) || (m.name.includes('Body') && m.name.includes('_SKIN'))) return null;
      const map = await new THREE.TextureLoader().loadAsync(new URL(m.texture, root).href);
      if(m.name.includes('_HAIR'))map.userData.hairReference=hairMapReference(map,data,i);
      map.flipY = false; map.colorSpace = THREE.SRGBColorSpace;map.anisotropy = 4;
      return map;
    })) : [];
    assets[id] = data;
    return data;
  })();
  pending.set(id,promise);
  try {return await promise;} finally {pending.delete(id);}
}
// Measure the actual hair UV islands, not unrelated transparent atlas space.
function hairMapReference(map,data,materialIndex){
 try{
  const canvas=document.createElement('canvas'),image=map.image;canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,values=[];
  const linear=c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
  for(const mesh of data.meshes)for(const g of mesh.groups.filter(g=>g.material===materialIndex))for(let i=0;i<g.indices.length;i+=Math.max(3,Math.floor(g.indices.length/180/3)*3)){
   const ids=g.indices.slice(i,i+3);if(ids.length<3)continue;let u=0,v=0;for(const id of ids){u+=mesh.uv[id*2]/65535/3;v+=mesh.uv[id*2+1]/65535/3;}
   const x=Math.max(0,Math.min(canvas.width-1,Math.round(u*(canvas.width-1)))),y=Math.max(0,Math.min(canvas.height-1,Math.round(v*(canvas.height-1)))),k=(y*canvas.width+x)*4;
   if(pixels[k+3]<128)continue;values.push(.299*linear(pixels[k]/255)+.587*linear(pixels[k+1]/255)+.114*linear(pixels[k+2]/255));
  }
  values.sort((a,b)=>a-b);return Math.max(.02,values[Math.floor(values.length*.5)]||.65);
 }catch{return .65;}
}
export async function loadHumanAssets({textures = true} = {}) {
  await Promise.all(['female','male'].map(id=>loadAsset(id,textures)));
}
export async function ensureHumanPresets(state, {textures = true} = {}) {
  const ids=hairAssetIds(state);if(state.clothes!=='underwear')ids.push(...(state.gender==='female'?['long','uniform']:['uniform']));
  await Promise.all([...new Set(ids)].map(id=>loadAsset(id,textures)));
}
function compose(state) {
  const base=assets[state.gender],shirt=assets[state.gender==='female'?'long':'uniform'],pants=assets.uniform;
  if(!base||(state.clothes!=='underwear'&&(!shirt||!pants)))throw Error('服装基础网格未载入');
  const data={...base,materials:[],maps:[],meshes:[]};
  function add(owner,source,groups) {
    const offset=data.materials.length;data.materials.push(...owner.materials);data.maps.push(...owner.materials.map((_,i)=>owner.maps[i]||null));
    data.meshes.push({...source,groups:groups.map(g=>({...g,material:g.material+offset}))});
  }
  const face=base.meshes.find(m=>m.name==='Face');
  const fitted=buildAnimeFace(base,state.gender,state.faceSource==='authored');
  data.landmarks={...base.landmarks,...fitted.landmarks,bodyRig:bodyAnchors(base)};
  for(const mesh of fitted.meshes)add(fitted,mesh,mesh.groups);
  const body=base.meshes.find(m=>m.name==='Body');
  const neck=base.landmarks.neck[1],hip=base.landmarks.hips[1],sleeve=.124+Math.max(0,Math.min(100,state.sleeveLength??50))*(state.gender==='female'?.00276:.00316);
  const skinGroups=body.groups.filter(g=>base.materials[g.material].name.includes('_SKIN')||(state.shoes!=='barefoot'&&base.materials[g.material].name.includes('Shoes')));
  const filtered=skinGroups.map(g=>{
    if(!base.materials[g.material].name.includes('_SKIN'))return g;
    const indices=[];
    for(let i=0;i<g.indices.length;i+=3){
      const ids=g.indices.slice(i,i+3);let covered=0;
      if(state.clothes==='underwear'){indices.push(...ids);continue;}
      for(const id of ids){const x=Math.abs(body.positions[id*3]/100000),y=body.positions[id*3+1]/100000;
        const axial=(x-.12)*.4695+(y-(neck-.065))*(-.8829);
        if((x<.19&&y>.13&&y<hip+.08)||(x<.13&&y>hip&&y<neck-.085)||(x>.13&&y<neck-.045&&axial<sleeve-.025))covered++;
      }
      if(covered!==3)indices.push(...ids);
    }
    return {...g,indices};
  });add(base,body,filtered);
  if(state.clothes==='underwear'){
    for(const mesh of createUnderwearData(base)){
      const bottom=mesh.name==='UnderwearBottom';
      const owner={materials:[{name:bottom?'Underwear_Bottoms_CLOTH':'Underwear_Tops_CLOTH',color:[1,1,1,1],double:true,blend:0,texture:null}],maps:[]};
      add(owner,mesh,mesh.groups);
    }
  }else{
    const shirtBody=shirt.meshes.find(m=>m.name==='Body');
    const shirtGroups=shirtBody.groups.filter(g=>shirt.materials[g.material].name.includes('Tops'));
    add(shirt,clothingMesh(shirtBody,'shirt',state,shirt.landmarks,base.landmarks,shirtGroups),shirtGroups);
    const pantsBody=pants.meshes.find(m=>m.name==='Body');
    const pantsGroups=pantsBody.groups.filter(g=>pants.materials[g.material].name.includes('Bottoms'));
    add(pants,clothingMesh(pantsBody,'pants',state,pants.landmarks,base.landmarks),pantsGroups);
  }
  for(const {owner,mesh} of referenceHairMeshes(assets,state))add(owner,mesh,mesh.groups);
  return data;
}

export function createHuman(state) {
  const data = compose(state);
  const base=assets[state.gender];
  if (!data) throw Error('日漫模型未载入');
  const group = new THREE.Group();
  const eyeY = (data.landmarks.leftEye[1] + data.landmarks.rightEye[1])/2;
  const bodyBase=base.meshes.find(m=>m.name==='Body');
  const skinGroups=bodyBase.groups.filter(g=>base.materials[g.material].name.includes('_SKIN'));
  const top=Math.max(...skinGroups.flatMap(g=>g.indices.map(i=>bodyBase.positions[i*3+1])))/100000+.012;
  const scale = 2.22/top * (.92 + state.height*.0016);
  const materials = data.materials.map((m,i) => {
    const name = m.name;
    const skin = name.includes('_SKIN'), hair = name.includes('_HAIR'), brow = name.includes('FaceBrow');
    const clothes = name.includes('_CLOTH'), iris=name.includes('EyeIris');
    let color = new THREE.Color().fromArray(m.color);
    if (skin) color.set(state.skin).multiplyScalar(1.07);
    if (hair || brow) color.set(state.hairColor);
    if (iris) color.set(state.eyeColor||'#806449');
    if (clothes) color.set(name.includes('Shoes')?(state.shoeColor||state.pants):name.includes('Bottoms')||name.includes('AccessoryNeck')?state.pants:state.shirt);
    const overlay = /Eyeline|Eyelash|EyeHighlight|FaceBrow/.test(name);
    const material = new THREE.MeshToonMaterial({
      color, map:clothes || (skin && name.includes('Body')) ? null : data.maps[i] || null,
      side: m.double || hair || overlay ? THREE.DoubleSide : THREE.FrontSide,
      alphaTest: m.blend ? .35 : 0,
      transparent: overlay, depthWrite: !overlay,
    });
    material.userData.colorRole=skin?'skin':hair||brow?'hairColor':iris?'eyeColor':clothes?(name.includes('Shoes')?'shoeColor':name.includes('Bottoms')||name.includes('AccessoryNeck')?'pants':'shirt'):null;
    if(hair && material.map){
      material.onBeforeCompile=shader=>{
        shader.uniforms.hairMapReference={value:material.map.userData.hairReference||.65};
        shader.fragmentShader='uniform float hairMapReference;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec4 hairDetail=texture2D(map,vMapUv);
  float hairTone=dot(hairDetail.rgb,vec3(0.299,0.587,0.114));
  float neutralHair=clamp(1.0+(hairTone/max(hairMapReference,0.02)-1.0)*0.20,0.80,1.0);
  diffuseColor.rgb *= neutralHair;
  diffuseColor.a *= hairDetail.a;
#endif
`);
      };material.customProgramCacheKey=()=> 'neutral-modular-hair-v13';
    }
if(iris && material.map){
      material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec4 irisDetail = texture2D(map, vMapUv);
  float irisTone = clamp((sqrt(max(0.0,dot(irisDetail.rgb, vec3(0.299,0.587,0.114))))-0.1)*2.5, 0.0, 1.0);
  diffuseColor.rgb *= irisTone;
  diffuseColor.a *= irisDetail.a;
#endif
`);};
      material.customProgramCacheKey=()=> 'editable-iris-v12';
    }
    // The source face map contains a peach skin base. Remove that base in linear
    // space before multiplying by the selected skin color; keep local painted detail.
    if (skin && name.includes('Face') && material.map) {
      const reference = new THREE.Color(state.gender==='female'?'#f3cdb7':'#f3d1b7');
      material.onBeforeCompile = shader => {
        shader.uniforms.faceSkinReference = {value:reference};
        shader.fragmentShader = 'uniform vec3 faceSkinReference;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec4 faceDetail = texture2D(map, vMapUv);
  vec3 neutralDetail = clamp(faceDetail.rgb / max(faceSkinReference, vec3(0.001)), vec3(0.0), vec3(1.0));
  diffuseColor.rgb *= mix(vec3(1.0),neutralDetail,0.65);
  diffuseColor.a *= faceDetail.a;
#endif
`);
      };
      material.customProgramCacheKey = () => name.startsWith('AnimeReference')?'parametric-anime-face-v18':'neutral-face-skin-v11';
      material.userData.faceSkinReference = reference;
    }
    // A broad light band keeps the face soft, while painted iris/eyelash detail remains crisp.
    const gradient = new THREE.DataTexture(new Uint8Array(name.startsWith('AnimeReference')?[145,222,255]:[155,224,255]),3,1,THREE.RedFormat);
    gradient.minFilter=gradient.magFilter=THREE.NearestFilter;gradient.needsUpdate=true;
    material.gradientMap=gradient;
    material.userData.ownedGradient=gradient;
    if (overlay) {material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;}
    return material;
  });
  const deform=createDeformer(state,data.landmarks,scale);
  let envelope=null,editedChin=Infinity;const envelopePoints=[],envelopeIndices=[];
  for (const source of data.meshes) {
    const p=new Float32Array(source.positions.length);
    const expression=source.expressions[state.expression];
    const normals=new Float32Array(p.length);
    let sourceNormals=source.normals;
    if(source.name==='Shirt'||source.name==='Pants'){
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(source.positions.map(v=>v/100000),3));g.setIndex(source.normalIndices||source.groups.flatMap(g=>g.indices));g.computeVertexNormals();sourceNormals=Array.from(g.attributes.normal.array,v=>v*32767);g.dispose();
    }
    for(let i=0;i<p.length;i+=3) {
      const deformPart=source.faceRegions?.[i/3]||source.name;
      const q=deform((source.positions[i]+(expression?.[i]||0))/100000,(source.positions[i+1]+(expression?.[i+1]||0))/100000,(source.positions[i+2]+(expression?.[i+2]||0))/100000,deformPart);
      p.set(q,i);
      normals.set(deformNormal(deform,(source.positions[i]+(expression?.[i]||0))/100000,(source.positions[i+1]+(expression?.[i+1]||0))/100000,(source.positions[i+2]+(expression?.[i+2]||0))/100000,...sourceNormals.slice(i,i+3).map(v=>v/32767),deformPart),i);
    }
    if(source.name==='Pants')normals.set(smoothGarmentNormals(p,source.groups));
    if(data.landmarks.faceRig){
      if(source.name==='Face'||source.name==='Body'){
        const offset=envelopePoints.length/3;envelopePoints.push(...p);
        for(const g of source.groups)if(data.materials[g.material].name.includes('_SKIN')){envelopeIndices.push(...g.indices.map(id=>id+offset));if(source.name==='Face')for(const id of g.indices)editedChin=Math.min(editedChin,p[id*3+1]);}
      }else if(source.name.startsWith('Hair')){
        if(!envelope){const c=deform(...base.landmarks.head,'Body');envelope=headEnvelope(envelopePoints,envelopeIndices,c[0],c[2],editedChin);}
        clearHair(p,envelope,source.name);
        const fitted=new THREE.BufferGeometry();fitted.setAttribute('position',new THREE.BufferAttribute(p,3));fitted.setIndex(source.groups.flatMap(g=>g.indices));fitted.computeVertexNormals();normals.set(fitted.attributes.normal.array);fitted.dispose();
      }
    }
    for(const part of source.groups) {
      const description=data.materials[part.material].name;
      // EyeExtra is the special closed-eye graphic, only used by the original Extra expression.
      if(description.includes('EyeExtra'))continue;
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.BufferAttribute(p,3));
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(source.uv.map(v=>v/65535),2));
      geometry.setIndex(part.indices);
      // Transform smooth source normals with the same parameter deformation.
      geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));
      // Shared buffers also contain hidden shoes/garments; bounds must use visible indices.
      geometry.boundingBox=new THREE.Box3();const vertex=new THREE.Vector3();
      for(const id of part.indices)geometry.boundingBox.expandByPoint(vertex.fromArray(p,id*3));
      geometry.boundingSphere=geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
      const mesh=new THREE.Mesh(geometry,materials[part.material]);mesh.name=description;mesh.userData.texture=data.materials[part.material].texture;mesh.userData.part=source.name;mesh.userData.rigSource=source;
      mesh.castShadow=!/Face|Eye|Hair/.test(description);mesh.receiveShadow=false;
      mesh.renderOrder=/Eyeline|Eyelash|EyeHighlight|FaceBrow/.test(description)?2:0;
      group.add(mesh);
      if(description.startsWith('AnimeReferenceFace')&&description.includes('_SKIN')){
        const outlineGeometry=geometry.clone(),op=outlineGeometry.attributes.position;
        for(let id=0;id<op.count;id++){const taper=Math.max(0,Math.min(1,(source.positions[id*3+1]/100000-base.landmarks.neck[1]-.025)/.04)),width=.00085*scale*taper;op.setXYZ(id,op.getX(id)+normals[id*3]*width,op.getY(id)+normals[id*3+1]*width,op.getZ(id)+normals[id*3+2]*width);}
        const outlineMaterial=new THREE.MeshBasicMaterial({color:'#47352e',side:THREE.BackSide});materials.push(outlineMaterial);
        const outline=new THREE.Mesh(outlineGeometry,outlineMaterial);outline.name='AnimeHeadOutline';outline.userData.part=source.name;outline.userData.rigSource=source;outline.renderOrder=-1;group.add(outline);
      }

    }
  }
  // Materials with no visible primitive still belong to this instance and must be disposed.
  const buttonMaterial=new THREE.MeshToonMaterial({color:new THREE.Color(state.shirt).multiplyScalar(.73)});
  buttonMaterial.userData.colorRole='shirtButton';
  buttonMaterial.gradientMap=materials[0].gradientMap;materials.push(buttonMaterial);
  const shirtMesh=data.meshes.find(m=>m.name==='Shirt');
  for(const point of shirtMesh?shirtButtonPoints(shirtMesh,data.landmarks):[]){
    const geometry=new THREE.SphereGeometry(.003,8,6);geometry.translate(...point);
    const p=geometry.attributes.position;const rigPoints=[];
    for(let i=0;i<p.count;i++){rigPoints.push([p.getX(i),p.getY(i),p.getZ(i)]);p.setXYZ(i,...deform(p.getX(i),p.getY(i),p.getZ(i),'Shirt'));}
    geometry.computeVertexNormals();const button=new THREE.Mesh(geometry,buttonMaterial);button.name='ShirtButton';button.userData.part='ShirtDetail';button.userData.rigPoints=rigPoints;group.add(button);
  }
  const rig=data.landmarks.faceRig;
  group.userData.faceHandles=[
   ...rig.eyes.map((p,i)=>({group:'eyes',side:i===0?-1:1,position:deform(...p,'Face:eye'+i)})),
   {group:'brows',side:1,position:deform(...rig.brows[1],'Face:brow1')},
   {group:'nose',side:1,position:deform(...rig.nose,'Face:skin')},
   {group:'mouth',side:1,position:deform(...rig.mouth,'Face:mouth')},
   {group:'contour',side:1,position:deform(rig.headX,rig.chin,rig.mouth[2],'Face:skin')}
  ];
  group.userData.bodyHandles=bodyHandlePoints(base).map(h=>({...h,position:deform(...h.position,'Body')}));
  bindCharacter(group,base,deform);
  group.userData.materials=materials;
  const bodySource=data.meshes.find(m=>m.name==='Body');
  let floorY=Infinity;for(const part of bodySource.groups)for(const id of part.indices)floorY=Math.min(floorY,bodySource.positions[id*3+1]/100000);
  group.position.y=-(floorY+.001)*scale;
  group.userData.height=new THREE.Box3().setFromObject(group).max.y;
  group.userData.faceY=deform(0,eyeY,data.landmarks.head[2],'Face')[1]+group.position.y;
  group.userData.model='vroid-beta-parametric';
  group.userData.parameterVersion=2;group.userData.facePresetName=data.landmarks.faceRig?.preset.name||'原版日漫';group.userData.faceSource=state.faceSource||'vroid';
  return group;
}
export function disposeHuman(group) {
  group.traverse(o=>o.geometry?.dispose());group.userData.skeleton?.dispose();
  for(const material of group.userData.materials||[]) {material.userData.ownedGradient?.dispose();material.dispose();}
  // Original maps are shared by all character instances and kept in the asset cache.
}

// Color changes update shared materials immediately, without rebuilding geometry or poses.
export function applyHumanColors(group,state){
 if(!group)return;
 for(const material of group.userData.materials||[]){const role=material.userData.colorRole;if(!role)continue;
  material.color.set(role==='shirtButton'?state.shirt:(state[role]||(role==='shoeColor'?state.pants:'#806449')));
  if(role==='skin')material.color.multiplyScalar(1.07);
  if(role==='shirtButton')material.color.multiplyScalar(.73);
 }
}
