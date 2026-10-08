import * as THREE from 'three';

// CC0 VRoid beta HairSample model data, baked into a relaxed pose.
// This is a lightweight static editor, not the VRoid Studio runtime or a VRM exporter.
const assets = {};
const root = new URL('./assets/anime/', import.meta.url);
async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`资源 ${response.status}: ${url}`);
  return response.json();
}
export async function loadHumanAssets({textures = true} = {}) {
  await Promise.all(['female', 'male'].map(async sex => {
    const manifest = await json(new URL(`${sex}-manifest.json`, root));
    const parts = await Promise.all(manifest.parts.map(async path => {
      const response = await fetch(new URL(path, root));
      if (!response.ok) throw Error(`模型分片加载失败: ${path}`);
      return response.text();
    }));
    const bytes = Uint8Array.from(atob(parts.join('')), c => c.charCodeAt(0));
    if (bytes.length !== manifest.bytes) throw Error('模型数据不完整');
    const data = JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    data.maps = textures ? await Promise.all(data.materials.map(async m => {
      if (!m.texture) return null;
      const map = await new THREE.TextureLoader().loadAsync(new URL(m.texture, root).href);
      map.flipY = false; map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      return map;
    })) : [];
    assets[sex] = data;
  }));
}
const smooth = (a,b,x) => {const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const gaussian = (v,c,s) => Math.exp(-(((v-c)/s)**2));
export function createHuman(state) {
  const data = assets[state.gender];
  if (!data) throw Error('日漫模型未载入');
  const group = new THREE.Group();
  const head = data.landmarks.head, neck = data.landmarks.neck;
  const eyeY = (data.landmarks.leftEye[1] + data.landmarks.rightEye[1])/2;
  const eyes = [data.landmarks.leftEye[0], data.landmarks.rightEye[0]];
  const hip = data.landmarks.hips[1];
  const hairSource=data.meshes.find(m=>m.name==='Hair001');
  const top=Math.max(...hairSource.groups.flatMap(g=>g.indices.map(i=>hairSource.positions[i*3+1])))/100000;
  const scale = 2.22/top * (.92 + state.height*.0016);
  const legDelta = (state.legs-50)*.0008;
  const materials = data.materials.map((m,i) => {
    const name = m.name;
    const skin = name.includes('_SKIN'), hair = name.includes('_HAIR'), brow = name.includes('FaceBrow');
    const clothes = name.includes('_CLOTH');
    let color = new THREE.Color().fromArray(m.color);
    if (skin) color.set(state.skin).multiplyScalar(1.07);
    if (hair || brow) color.set(state.hairColor);
    if (clothes) color.set(name.includes('Bottoms') || name.includes('Shoes') ? state.pants : state.shirt);
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
  function deform(x,y,z,name) {
    const oldY = y;
    const headWeight = smooth(neck[1]-.025,neck[1]+.07,y);
    const faceWidth = 1 + (state.faceWidth-50)*.0017;
    x *= 1 + (faceWidth-1)*headWeight;
    if (name==='Face') {
      const jawWeight = gaussian(y,eyeY-.10,.07) * smooth(-.025,.05,z);
      x *= 1 + (state.jaw-50)*.0016*jawWeight;
      // The same continuous deformation acts on skin, lids, brows and iris meshes.
      for (const eyeX of eyes) {
        const weight=gaussian(x,eyeX*faceWidth,.043)*gaussian(y,eyeY,.038)*smooth(-.01,.03,z);
        const size=(state.eyeSize-50)*.0014;
        x += (x-eyeX*faceWidth)*size*weight;
        y += (y-eyeY)*size*weight;
        x += Math.sign(eyeX)*(state.eyeSpace-50)*.000055*weight;
      }
      const noseWeight=gaussian(x,0,.018)*gaussian(y,eyeY-.04,.021)*smooth(.065,.095,z);
      z += (state.nose-50)*.000065*noseWeight;
      const mouthWeight=gaussian(x,0,.032)*gaussian(y,eyeY-.092,.019)*smooth(.03,.07,z);
      x *= 1+(state.mouth-50)*.0018*mouthWeight;
    }
    // Apply body changes to clothing and skin together, preserving their original clearance.
    const torso=gaussian(y,hip+.19,.32)*(1-headWeight);
    x *= 1+(state.weight-45)*.0016*torso;
    z *= 1+(state.weight-45)*.0015*torso;
    x *= 1+(state.shoulders-45)*.0013*gaussian(y,neck[1]-.14,.14)*(1-headWeight);
    if (name==='Hair001' && state.hair==='trim' && state.gender==='female') {
      const below=Math.max(0,eyeY-.04-y);y+=below*.60;
      // Bring the lower side strands inward as the bob is shortened.
      x*=1-.18*smooth(.015,.16,below);
    }
    if (name==='Hair001' && state.hair==='trim' && state.gender==='male') {
      x=head[0]+(x-head[0])*.94;z=head[2]+(z-head[2])*.94;
    }
    y += legDelta*smooth(.02,hip,oldY);
    return [x*scale,(y+.001)*scale,z*scale];
  }
  for (const source of data.meshes) {
    if (source.name==='Hair001' && state.hair==='bald') continue;
    const p=new Float32Array(source.positions.length);
    const expression=source.expressions[state.expression];
    for(let i=0;i<p.length;i+=3) {
      const q=deform((source.positions[i]+(expression?.[i]||0))/100000,(source.positions[i+1]+(expression?.[i+1]||0))/100000,(source.positions[i+2]+(expression?.[i+2]||0))/100000,source.name);
      p.set(q,i);
    }
    for(const part of source.groups) {
      const description=data.materials[part.material].name;
      // EyeExtra is the special closed-eye graphic, only used by the original Extra expression.
      if(description.includes('EyeExtra'))continue;
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.BufferAttribute(p,3));
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(source.uv.map(v=>v/65535),2));
      geometry.setIndex(part.indices);
      // Retain the author's smooth normals across material boundaries.
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(source.normals.map(v=>v/32767),3));
      geometry.computeBoundingSphere();
      const mesh=new THREE.Mesh(geometry,materials[part.material]);mesh.name=description;
      mesh.castShadow=!/Face|Eye|Hair/.test(description);mesh.receiveShadow=false;
      mesh.renderOrder=/Eyeline|Eyelash|EyeHighlight|FaceBrow/.test(description)?2:0;
      group.add(mesh);
    }
  }
  // Materials with no visible primitive still belong to this instance and must be disposed.
  group.userData.materials=materials;
  group.userData.height=(top+legDelta)*scale;
  group.userData.faceY=(eyeY+legDelta+.001)*scale;
  group.userData.model='vroid-beta-hairsample';
  return group;
}
export function disposeHuman(group) {
  group.traverse(o=>o.geometry?.dispose());
  for(const material of group.userData.materials||[]) {material.userData.ownedGradient?.dispose();material.dispose();}
  // Original maps are shared by all character instances and kept in the asset cache.
}
