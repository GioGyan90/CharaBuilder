import * as THREE from 'three';
import {createDeformer,deformNormal} from './parameters.js?v=7';
import { hairAsset, outfitAsset } from './presets.js?v=7';

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
      if (!m.texture || !used.has(i)) return null;
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
  await Promise.all([...new Set([hairAsset[state.hair],outfitAsset(state)].filter(Boolean))].map(id=>loadAsset(id,textures)));
}
function compose(state) {
  const base=assets[state.gender],body=assets[outfitAsset(state)]||base,hair=assets[hairAsset[state.hair]]||base;
  if (!base) throw Error('日漫模型未载入');
  const data={...base,materials:[],maps:[],meshes:[]};
  function fitted(mesh){
    const fit=mesh.fits?.[outfitAsset(state)||state.gender];if(!fit)return mesh;
    const positions=[...mesh.positions];for(let k=0;k<fit.indices.length;k++)for(let j=0;j<3;j++)positions[fit.indices[k]*3+j]=fit.positions[k*3+j];
    return {...mesh,positions};
  }
  for(const [owner,name] of [[base,'Face'],[body,'Body'],[hair,'Hair001']]) {
    const offset=data.materials.length;data.materials.push(...owner.materials);data.maps.push(...owner.materials.map((_,i)=>owner.maps[i]||null));
    let source=owner.meshes.find(m=>m.name===name);
    if(name==='Hair001')source=fitted(source);
    const groups=source.groups.filter(g=>name!=='Body'||!owner.materials[g.material].name.includes('_HAIR'));
    data.meshes.push({...source,groups:groups.map(g=>({...g,material:g.material+offset}))});
    if(name==='Hair001' && state.hair!=='bald') {
      const originalCap=owner.meshes.find(m=>m.name==='Body');
      const cap=originalCap?fitted(originalCap):null;
      const capGroups=cap?.groups.filter(g=>owner.materials[g.material].name.includes('_HAIR'))||[];
      if(capGroups.length)data.meshes.push({...cap,name:'HairCap',groups:capGroups.map(g=>({...g,material:g.material+offset}))});
    }
  }
  return data;
}
export function createHuman(state) {
  const data = compose(state);
  const base=assets[state.gender];
  if (!data) throw Error('日漫模型未载入');
  const group = new THREE.Group();
  const eyeY = (data.landmarks.leftEye[1] + data.landmarks.rightEye[1])/2;
  const hairSource=base.meshes.find(m=>m.name==='Hair001');
  const top=Math.max(...hairSource.groups.flatMap(g=>g.indices.map(i=>hairSource.positions[i*3+1])))/100000;
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
      color, map:clothes && state.clothes==='solid' ? null : data.maps[i] || null,
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
    if (source.name==='Hair001' && state.hair==='bald') continue;
    const p=new Float32Array(source.positions.length);
    const expression=source.expressions[state.expression];
    const normals=new Float32Array(p.length);
    for(let i=0;i<p.length;i+=3) {
      const q=deform((source.positions[i]+(expression?.[i]||0))/100000,(source.positions[i+1]+(expression?.[i+1]||0))/100000,(source.positions[i+2]+(expression?.[i+2]||0))/100000,source.name);
      p.set(q,i);
      normals.set(deformNormal(deform,(source.positions[i]+(expression?.[i]||0))/100000,(source.positions[i+1]+(expression?.[i+1]||0))/100000,(source.positions[i+2]+(expression?.[i+2]||0))/100000,...source.normals.slice(i,i+3).map(v=>v/32767),source.name),i);
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
      geometry.computeBoundingSphere();
      const mesh=new THREE.Mesh(geometry,materials[part.material]);mesh.name=description;mesh.userData.texture=data.materials[part.material].texture;mesh.userData.part=source.name;
      mesh.castShadow=!/Face|Eye|Hair/.test(description);mesh.receiveShadow=false;
      mesh.renderOrder=/Eyeline|Eyelash|EyeHighlight|FaceBrow/.test(description)?2:0;
      group.add(mesh);
    }
  }
  // Materials with no visible primitive still belong to this instance and must be disposed.
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
