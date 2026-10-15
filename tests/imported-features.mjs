import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {reserveImportedEyes,addImportedFeatures} from '../dist/stone-avatar.js';
import * as THREE from '../dist/vendor/three.module.js';
const data=JSON.parse(gunzipSync(Buffer.from(await fs.readFile(new URL('../dist/assets/anime/imported-00003.b64',import.meta.url),'utf8'),'base64')));
data.maps=data.materials.map(()=>null);data.meshes=data.meshes.filter(m=>m.name==='Face');
const reserved=reserveImportedEyes(data),base=addImportedFeatures(reserved),mesh=base.meshes[0];
const vertices=(model,name)=>{const m=model.meshes[0],ids=m.groups.filter(g=>model.materials[g.material].name===name).flatMap(g=>g.indices);return [...new Set(ids)].flatMap(id=>m.positions.slice(id*3,id*3+3));};
for(const [key,name] of Object.entries({eyeballDepth:'ImportedEyeWhite',irisSize:'ImportedEyeIris',pupilSize:'ImportedPupil',gazeX:'ImportedEyeIris',gazeY:'ImportedEyeIris',browWidth:'ImportedFaceBrow',browThickness:'ImportedFaceBrow',upperLipThickness:'ImportedUpperLip_SKIN',lowerLipThickness:'ImportedLowerLip_SKIN',upperLipProjection:'ImportedUpperLip_SKIN',lowerLipProjection:'ImportedLowerLip_SKIN'})){
 const a=addImportedFeatures(reserved,{[key]:0}),b=addImportedFeatures(reserved,{[key]:100});assert.notDeepEqual(vertices(a,name),vertices(b,name),key+' has no effect');
 assert.ok(b.meshes[0].positions.every(Number.isFinite));
 if(key.includes('Lip'))assert.deepEqual(vertices(a,'ImportedEyeWhite'),vertices(b,'ImportedEyeWhite'),'lip edit moved eyes');
}
const point=id=>new THREE.Vector3(...mesh.positions.slice(id*3,id*3+3).map(v=>v/1e5));
for(const eye of data.landmarks.faceRig.eyes){const ray=new THREE.Ray(new THREE.Vector3(eye[0],eye[1],eye[2]+.1),new THREE.Vector3(0,0,-1));let z=-Infinity,name='';for(const g of mesh.groups)for(let i=0;i<g.indices.length;i+=3){const hit=ray.intersectTriangle(...g.indices.slice(i,i+3).map(point),false,new THREE.Vector3());if(hit&&hit.z>z){z=hit.z;name=base.materials[g.material].name;}}assert.equal(name,'ImportedPupil','eye center is hidden behind the face');}
assert.equal(base.materials.length,base.maps.length);
console.log('PASS visible pupils, independent lip edits and 11 feature parameter endpoints; assembled donor triangles',mesh.groups.reduce((n,g)=>n+g.indices.length/3,0));
