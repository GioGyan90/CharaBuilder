import * as THREE from 'three';
import {createDeformer,deformNormal} from './parameters.js?v=9';
import {clothingMesh,shirtButtonPoints} from './wardrobe.js?v=9';
import {referenceHairMeshes,hairAssetIds} from './hair.js?v=9';
import {createUnderwearData} from './underwear.js?v=9';

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
    data.maps = textures ? await Promise.all(data.materials.map(async (m,i) => {
      if (!m.texture || !used.has(i) || /_CLOTH/.test(m.name) || (m.name.includes('Body') && m.name.includes('_SKIN'))) return null;
      const map = await new THREE.TextureLoader().loadAsync(new URL(m.texture, root).href);
      map.flipY = false; map.colorSpace = THREE.SRGBColorSpace;map.anisotropy = 4;
      return map;
    })) : [];
    assets[id] = data;
    return data;
  })();
  pending.set(id,promise);
  try {return await promise;} finally {pending.delete(id);}
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
  const face=base.meshes.find(m=>m.name==='Face');add(base,face,face.groups);
  const body=base.meshes.find(m=>m.name==='Body');
  const neck=base.landmarks.neck[1],hip=base.landmarks.hips[1],sleeve=.124+Math.max(0,Math.min(100,state.sleeveLength??50))*(state.gender==='female'?.00276:.00316);
  const skinGroups=body.groups.filter(g=>base.materials[g.material].name.includes('_SKIN')||(state.shoes!=='barefoot'&&base.materials[g.material].name.includes('Shoes')));
  const filtered=skinGroups.map(g=>{
    if(state.clothes==='underwear'||!base.materials[g.material].name.includes('_SKIN'))return g;
    const indices=[];
    for(let i=0;i<g.indices.length;i+=3){
      const ids=g.indices.slice(i,i+3);let covered=0;
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
    const clothes = name.includes('_CLOTH');
    let color = new THREE.Color().fromArray(m.color);
    if (skin) color.set(state.skin).multiplyScalar(1.07);
    if (hair || brow) color.set(state.hairColor);
    if (clothes) color.set(name.includes('Bottoms') || name.includes('Shoes') || name.includes('AccessoryNeck') ? state.pants : state.shirt);
    const overlay = /Eyeline|Eyelash|EyeHighlight|FaceBrow/.test(name);
    const material = new THREE.MeshToonMaterial({
      color, map:clothes || (skin && name.includes('Body')) ? null : data.maps[i] || null,
      side: m.double || hair || overlay ? THREE.DoubleSide : THREE.FrontSide,
      alphaTest: m.blend ? .35 : 0,
      transparent: overlay, depthWrite: !overlay,
    });
    // A broad light band keeps the face soft, while painted iris/eyelash detail remains crisp.
    const gradient = new THREE.DataTexture(new Uint8Array([155,224,255]),3,1,THREE.RedFormat);
    gradient.minFilter=gradient.magFilter=THREE.NearestFilter;gradient.needsUpdate=true;
    material.gradientMap=gradient;
    material.userData.ownedGradient=gradient;
    if (overlay) {material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;}
    return material;
  });
  const deform=createDeformer(state,data.landmarks,scale);
  for (const source of data.meshes) {
    const p=new Float32Array(source.positions.length);
    const expression=source.expressions[state.expression];
    const normals=new Float32Array(p.length);
    let sourceNormals=source.normals;
    if(source.name==='Shirt'||source.name==='Pants'){
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(source.positions.map(v=>v/100000),3));g.setIndex(source.groups.flatMap(g=>g.indices));g.computeVertexNormals();sourceNormals=Array.from(g.attributes.normal.array,v=>v*32767);g.dispose();
    }
    for(let i=0;i<p.length;i+=3) {
      const q=deform((source.positions[i]+(expression?.[i]||0))/100000,(source.positions[i+1]+(expression?.[i+1]||0))/100000,(source.positions[i+2]+(expression?.[i+2]||0))/100000,source.name);
      p.set(q,i);
      normals.set(deformNormal(deform,(source.positions[i]+(expression?.[i]||0))/100000,(source.positions[i+1]+(expression?.[i+1]||0))/100000,(source.positions[i+2]+(expression?.[i+2]||0))/100000,...sourceNormals.slice(i,i+3).map(v=>v/32767),source.name),i);
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
      const mesh=new THREE.Mesh(geometry,materials[part.material]);mesh.name=description;mesh.userData.texture=data.materials[part.material].texture;mesh.userData.part=source.name;
      mesh.castShadow=!/Face|Eye|Hair/.test(description);mesh.receiveShadow=false;
      mesh.renderOrder=/Eyeline|Eyelash|EyeHighlight|FaceBrow/.test(description)?2:0;
      group.add(mesh);
    }
  }
  // Materials with no visible primitive still belong to this instance and must be disposed.
  const buttonMaterial=new THREE.MeshToonMaterial({color:new THREE.Color(state.shirt).multiplyScalar(.73)});
  buttonMaterial.gradientMap=materials[0].gradientMap;materials.push(buttonMaterial);
  const shirtMesh=data.meshes.find(m=>m.name==='Shirt');
  for(const point of shirtMesh?shirtButtonPoints(shirtMesh,data.landmarks):[]){
    const geometry=new THREE.SphereGeometry(.003,8,6);geometry.translate(...point);
    const p=geometry.attributes.position;
    for(let i=0;i<p.count;i++)p.setXYZ(i,...deform(p.getX(i),p.getY(i),p.getZ(i),'Shirt'));
    geometry.computeVertexNormals();const button=new THREE.Mesh(geometry,buttonMaterial);button.name='ShirtButton';button.userData.part='ShirtDetail';group.add(button);
  }
  group.userData.materials=materials;
  const bodySource=data.meshes.find(m=>m.name==='Body');
  let floorY=Infinity;for(const part of bodySource.groups)for(const id of part.indices)floorY=Math.min(floorY,bodySource.positions[id*3+1]/100000);
  group.position.y=-(floorY+.001)*scale;
  group.userData.height=new THREE.Box3().setFromObject(group).max.y;
  group.userData.faceY=deform(0,eyeY,data.landmarks.head[2],'Face')[1]+group.position.y;
  group.userData.model='vroid-beta-parametric';
  group.userData.parameterVersion=1;
  return group;
}
export function disposeHuman(group) {
  group.traverse(o=>o.geometry?.dispose());
  for(const material of group.userData.materials||[]) {material.userData.ownedGradient?.dispose();material.dispose();}
  // Original maps are shared by all character instances and kept in the asset cache.
}
