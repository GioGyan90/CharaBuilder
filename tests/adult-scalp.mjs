import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const base=process.env.CHARAMAKE_DIST?pathToFileURL(process.env.CHARAMAKE_DIST.replace(/[/\\]?$/,'/')):new URL('../dist/',import.meta.url),url=p=>pathToFileURL(p).href;
const scalp=await import(process.env.CHARAMAKE_SCALP_CANDIDATE?url(process.env.CHARAMAKE_SCALP_CANDIDATE):new URL('adult-scalp.js',base));
const THREE=await import(new URL('vendor/three.module.js',base));
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'adult-scalp-v92-'));
let hair=await fs.readFile(process.env.CHARAMAKE_HAIR_CANDIDATE||new URL('hair.js',base),'utf8');hair=hair.replace("'three'",JSON.stringify(new URL('vendor/three.module.js',base).href)).replace(/'\.\/adult-head\.js\?v=\d+'/,JSON.stringify(new URL('adult-head.js',base).href));await fs.writeFile(tmp+'/hair.mjs',hair);
const {referenceHairMeshes}=await import(url(tmp+'/hair.mjs'));
const {prepareAdultHead}=await import(new URL('adult-head.js',base));
const {addImportedFeatures,reserveImportedEyes,graftHead,composeStoneReference}=await import(new URL('stone-avatar.js',base));
async function asset(name){const m=JSON.parse(await fs.readFile(new URL('assets/anime/'+name+'-manifest.json',base),'utf8')),parts=await Promise.all(m.parts.map(p=>fs.readFile(new URL('assets/anime/'+p,base),'utf8'))),d=JSON.parse(gunzipSync(Buffer.from(parts.join(''),'base64')));d.maps=d.materials.map(()=>null);return d;}
const [head,owner,body]=await Promise.all(['adult-male','imported-00003','stone-ref'].map(asset)),original=JSON.stringify([head,owner,body]);
const state={characterType:'man',gender:'male',foundationRevision:1,faceSource:'imported00003',bodySource:'stone',clothes:'underwear',frontHair:'imported00003',sideHair:'imported00003',backHair:'imported00003',braid:'none',frontLength:50,backLength:50,sideLength:50,hairVolume:50,craniumWidth:50,craniumDepth:50,facePlaneSoftness:50,sideHairColor:'#929590'};
const donor=addImportedFeatures(reserveImportedEyes(prepareAdultHead(head,state),state),state),graft=graftHead(composeStoneReference(body,state),donor,body,head,{neckProfile:true,trapeziusStructure:true,headLift:.008,headForward:.028}),r=graft.landmarks.faceRig,target={...body,...graft},assets={male:target,'imported-00003':owner},out=referenceHairMeshes(assets,state);
assert.ok(!out.some(({mesh})=>/Undercut/.test(mesh.name)),'adult still generates the gray shell');
const tris=mesh=>mesh.groups.reduce((sum,g)=>sum+g.indices.length/3,0),crown=out.filter(({mesh})=>mesh.adultCrown).reduce((sum,{mesh})=>sum+tris(mesh),0),cap=out.find(({mesh})=>mesh.name==='HairScalp');
assert.equal(crown,2063,'original black crown changed');assert.ok(cap&&tris(cap.mesh)>0,'black closing cap disappeared');
assert.ok(tris(cap.mesh)<224,'black cap still hides the skin hair layer');
for(const g of cap.mesh.groups)for(let k=0;k<g.indices.length;k+=3){const tri=g.indices.slice(k,k+3).map(id=>cap.mesh.positions.slice(id*3,id*3+3).map((v,j)=>(v-(j===1?60:0))/1e5));for(const w of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){const p=[0,1,2].map(j=>tri.reduce((n,v,i)=>n+v[j]*w[i],0));assert.equal(scalp.adultScalpCoverage(p,r,state),0,'remaining black cap obscures gray hair');}}
const face=graft.meshes.find(m=>m.name==='Face'),attr=scalp.adultScalpAttributes(face);assert.equal(attr.length,face.positions.length);assert.ok(attr.every(Number.isFinite));
let covered=0,earChecked=0,faceChecked=0;
for(let id=0;id<attr.length/3;id++){
 const p=Array.from(attr.slice(id*3,id*3+3)),s=scalp.sampleAdultScalp(p,r,state);assert.ok(s.coverage>=0&&s.coverage<=1);assert.ok(s.color.every(v=>v>=0&&v<=1));if(s.coverage>.5)covered++;
 // Pinna outer vertices identified independently from the donor's lateral extent.
 if(Math.abs(p[0]-r.headX)>.082&&p[1]>r.eyeY-.040&&p[1]<r.eyeY+.027){assert.equal(s.coverage,0,'gray hair paints over an ear '+JSON.stringify({p,eyeY:r.eyeY,headZ:r.headZ}));earChecked++;}
 if(p[2]>r.headZ+.075&&p[1]<r.eyeY+.015){assert.equal(s.coverage,0,'gray hair paints facial features');faceChecked++;}
}
assert.ok(covered>30&&earChecked>15&&faceChecked>100,{covered,earChecked,faceChecked});
const at=(a,y)=>[r.headX+Math.sin(a)*.080,y,r.headZ+Math.cos(a)*.080];
assert.ok(scalp.adultScalpCoverage(at(2.55,r.eyeY),r,state)>.99);
assert.equal(scalp.adultScalpCoverage(at(1.46,r.eyeY+.025),r,state),0,'ear top is covered');
for(let angle=1.1;angle<=2.1;angle+=.05)assert.ok(scalp.adultScalpCoverage(at(angle,r.eyeY+.040),r,state)>.99,'silver scalp strip is disconnected above the ear');
assert.ok(scalp.adultScalpCoverage([r.headX+.083,r.eyeY+.026,r.headZ+.040],r,state)>.99,'ear protection leaves a rectangular corner of bare scalp');
const centerBottom=r.eyeY-.052,edgeBottom=r.eyeY-.027-.025*(2.10-1.90)/(Math.PI-1.90);
assert.ok(edgeBottom-centerBottom>.020,'rear lower edge must form V');
assert.equal(scalp.adultScalpCoverage(at(Math.PI,centerBottom-.001),r,state),0);
assert.ok(scalp.adultScalpCoverage(at(Math.PI,centerBottom+.001),r,state)>.99);
assert.equal(scalp.adultScalpCoverage(at(2.6,r.eyeY),r,{...state,backHair:'none'}),0);
assert.equal(scalp.adultScalpCoverage(at(1.75,r.eyeY+.08),r,{...state,sideHair:'none'}),0);
assert.ok(scalp.adultScalpCoverage(at(Math.PI,centerBottom-.005),r,{...state,backLength:100})>.99);
assert.equal(scalp.adultScalpCoverage(at(Math.PI,centerBottom+.005),r,{...state,backLength:0}),0);
for(const other of [{characterType:'boy'},{characterType:'girl'},{foundationRevision:0},{faceSource:'foundation'},{stoneView:'clay'},{faceStructureView:'wire'},{faceStructureView:'regions'}])assert.equal(scalp.adultScalpCoverage(at(2.55,r.eyeY),r,{...state,...other}),0,'scalp layer leaked out of its route');
const texture=scalp.adultScalpTextureData(),tones=texture.data.filter((_,i)=>i%4===0);assert.equal(texture.data.length,texture.width*texture.height*4);assert.ok(new Set(tones).size>20,'salt/pepper texture is flat gray');assert.ok(tones.reduce((a,b)=>Math.max(a,b),0)-tones.reduce((a,b)=>Math.min(a,b),255)>160,'broad silver/slate blocks need clear contrast');
const material=new THREE.MeshToonMaterial({color:'#c18e6c'});material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n// prior-face-color');};material.customProgramCacheKey=()=> 'prior';
assert.equal(scalp.installAdultScalp(material,THREE,r,state),true);
const source=THREE.ShaderLib.toon,shader={vertexShader:source.vertexShader,fragmentShader:source.fragmentShader,uniforms:{}};material.onBeforeCompile(shader);
assert.ok(shader.vertexShader.includes('vAdultScalpPosition=adultScalpPosition;'));assert.ok(shader.fragmentShader.includes('adultScalpMask(vAdultScalpPosition)'));assert.ok(shader.fragmentShader.includes('// prior-face-color'));assert.equal(material.customProgramCacheKey(),'prior|stone-adult-scalp-v92');
assert.ok(shader.fragmentShader.indexOf('float adultHairMask=')>shader.fragmentShader.indexOf('#include <map_fragment>'),'gray layer must follow existing diffuse map');
assert.equal(material.userData.adultScalp.geometryTrianglesAdded,0);assert.equal(shader.uniforms.adultScalpTexture.value,material.userData.adultScalpTexture);assert.equal(material.userData.adultScalpTexture.colorSpace,THREE.NoColorSpace);
const oldColor=shader.uniforms.adultScalpColor.value.clone();scalp.updateAdultScalp(material,{sideHairColor:'#ab7760'},THREE);assert.notDeepEqual(shader.uniforms.adultScalpColor.value.toArray(),oldColor.toArray());scalp.updateAdultScalp(material,{stoneView:'clay'},THREE);assert.equal(shader.uniforms.adultScalpControls.value.x,0);assert.equal(shader.uniforms.adultScalpControls.value.y,0);
const legacy=[
 [{...state,foundationRevision:0},'59bd74bf8629aaf85faa7174c926dd51440517f3c308345e1c5dd2f3348a4982'],
 [{...state,characterType:'boy',frontLength:25,backLength:80,sideLength:30,hairVolume:25},'790746e7d8f40bf48abe95abdc37045e7beab821fce0311dd97cf26f769e268c'],
 [{...state,characterType:'girl',frontLength:80,backLength:15,sideLength:65,hairVolume:100},'4400c707a248c0c38fbe5668aeb6a249234fd0f4ecb462505f8205a65894c9b9']
];
for(const [s,expected]of legacy){const actual=createHash('sha256').update(JSON.stringify(referenceHairMeshes({male:owner,'imported-00003':owner},s).map(({mesh})=>mesh))).digest('hex');assert.equal(actual,expected,'legacy hair changed');}
assert.equal(JSON.stringify([head,owner,body]),original,'source data mutated');
console.log('PASS adult scalp v92',{crownTriangles:crown,capTriangles:tris(cap.mesh),removedGrayTriangles:288,coveredSkinVertices:covered,earProtectedVertices:earChecked,faceProtectedVertices:faceChecked,napeV:edgeBottom-centerBottom,texture:[texture.width,texture.height],legacyExact:true,sourceImmutable:true});
material.userData.adultScalpTexture.dispose();material.dispose();await fs.rm(tmp,{recursive:true,force:true});
