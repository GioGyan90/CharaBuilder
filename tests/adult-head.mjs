import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
const moduleURL=process.argv[2]?pathToFileURL(process.argv[2]):new URL('../dist/adult-head.js',import.meta.url);
const {prepareAdultHead,adultCraniumPoint,adultStoneContourPoint,adultHeadNormals,installAdultHeadNormals}=await import(moduleURL);
const root=new URL('../dist/assets/anime/',import.meta.url);
async function asset(name){const m=JSON.parse(await fs.readFile(new URL(name+'-manifest.json',root),'utf8')),parts=await Promise.all(m.parts.map(p=>fs.readFile(new URL(p,root),'utf8')));return JSON.parse(gunzipSync(Buffer.from(parts.join(''),'base64')));}
const head=await asset('adult-male'),original=JSON.stringify(head),face=head.meshes.find(m=>m.name==='Face'),r=head.landmarks.faceRig;
const state={characterType:'man',foundationRevision:1,craniumWidth:50,craniumDepth:50,facePlaneSoftness:50};
assert.equal(prepareAdultHead(head,{...state,craniumWidth:0,craniumDepth:0,facePlaneSoftness:0}),head,'all-zero should return the original donor exactly');
for(const foreign of [{...state,characterType:'boy'},{...state,characterType:'girl'},{...state,foundationRevision:0}])assert.equal(prepareAdultHead(head,foreign),head,'calibration leaked into another foundation');
assert.equal(prepareAdultHead({...head,reference:{baseFamily:'other'}},state).adultHeadPrepared,undefined);
const result=prepareAdultHead(head,state),prepared=result.meshes.find(m=>m.name==='Face');
assert.equal(JSON.stringify(head),original,'source asset mutated');
for(const key of ['uv','skinIndices','skinWeights','groups','expressions','faceRegions'])assert.equal(prepared[key],face[key],key+' should remain untouched');
assert.equal(prepared.positions.length,face.positions.length);assert.equal(prepareAdultHead(result,state),result,'repeated preprocessing should be idempotent');
let skullWidthSamples=0,skullDepthSamples=0,protectedSamples=0,maxFairing=0;
for(let id=0;id<face.positions.length/3;id++){
 const p=face.positions.slice(id*3,id*3+3).map(v=>v/1e5),q=prepared.positions.slice(id*3,id*3+3).map(v=>v/1e5),ax=Math.abs(p[0]-r.headX);
 assert.ok(q.every(Number.isFinite));assert.equal(q[1],p[1],'no facial vertical landmark may move');
 if(p[1]>r.eyeY+.040&&ax>.025){assert.ok(Math.abs(q[0]-(r.headX+(p[0]-r.headX)*1.05))<.000006,'upper skull must widen 5% at default');skullWidthSamples++;}
 if(p[1]>r.eyeY+.040&&p[2]<r.headZ+.005){assert.ok(Math.abs(q[2]-(r.headZ+(p[2]-r.headZ)*1.03))<.000006,'posterior skull must deepen 3% at default');skullDepthSamples++;}
 if(p[1]<r.chin+.003||(p[1]<r.eyeY+.010&&ax>.070)||(Math.abs(p[1]-r.eyeY)<.006&&ax<.052&&p[2]>r.headZ+.040)){
  assert.deepEqual(q,p,'mouth/nose/ear/jaw/neck protected coordinate moved');protectedSamples++;
 }
 const c=adultCraniumPoint(p,r,state),b=adultStoneContourPoint(p,r,state);maxFairing=Math.max(maxFairing,Math.abs(q[2]-c[2]-(b[2]-p[2])));
}
assert.ok(skullWidthSamples>20&&skullDepthSamples>10&&protectedSamples>100);
assert.ok(maxFairing>.00005&&maxFairing<.0018,'facial fairing missing or excessive '+maxFairing);
for(const landmark of [...r.eyes,...r.brows,r.nose,r.mouth,[r.headX,r.chin,r.headZ+.075]])assert.deepEqual(adultCraniumPoint(landmark,r,state),landmark,'cranial scale moved a facial anchor');
for(const value of [0,50,100]){
 const h=prepareAdultHead(head,{...state,craniumWidth:value,craniumDepth:value,facePlaneSoftness:value}),s=h.meshes.find(m=>m.name==='Face'),p=Float32Array.from(s.positions,v=>v/1e5),base=Float32Array.from(s.normals,v=>v/32767);
 const n=adultHeadNormals(p,s,h.materials,h.landmarks,{...state,facePlaneSoftness:value},base);
 if(!value){assert.equal(n,null);continue;}
 assert.ok(n.normals.every(Number.isFinite)&&n.smoothWeights.every(v=>v>=0&&v<=1));
 for(const id of n.skinIndices)assert.ok(Math.abs(Math.hypot(...n.normals.slice(id*3,id*3+3))-1)<.00001,'skin normal must be unit length');
 assert.ok(Math.max(...n.smoothWeights)>.8,'broad plane needs smooth normals');
 assert.ok(n.smoothWeights.some(v=>v<.2),'bony ridges need preserved face-normal weight');
 const triNormal=(packed,ids)=>{const [a,b,c]=ids.map(i=>packed.slice(i*3,i*3+3).map(v=>v/1e5)),u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]);return [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];};
 for(const g of face.groups)for(let k=0;k<g.indices.length;k+=3){const ids=g.indices.slice(k,k+3),a=triNormal(face.positions,ids),b=triNormal(s.positions,ids),area=Math.hypot(...a),nextArea=Math.hypot(...b);if(area<1e-12)continue;assert.ok(nextArea>area*.5,'calibration collapsed a source triangle');assert.ok(a.reduce((v,x,j)=>v+x*b[j],0)>0,'calibration inverted a source triangle');}
}
// The helper must preserve existing hooks and keep the old neck blend after its own mix.
const material={userData:{},flatShading:true,customProgramCacheKey(){return 'neck';},onBeforeCompile(shader){shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n// neck-last');}};
installAdultHeadNormals(material);const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <normal_fragment_begin>'};material.onBeforeCompile(shader);
assert.equal(material.flatShading,false);assert.ok(shader.vertexShader.includes('adultSurfaceBlend'));
assert.ok(shader.fragmentShader.indexOf('adultFacetNormal')<shader.fragmentShader.indexOf('// neck-last'),'neck blend must remain last');
assert.ok(material.customProgramCacheKey().includes('neck|stone-adult-surface-v93'));
assert.equal(JSON.stringify(head),original);
console.log('PASS adult cranial calibration, protected facial anchors, zero/isolation, immutable topology, local fairing and chained surface normals',{skullWidthSamples,skullDepthSamples,protectedSamples,maxFairing,calibration:result.adultHeadPrepared});
