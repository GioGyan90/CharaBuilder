import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../dist/vendor/three.module.js';
import {prepareAdultOrbits} from '../dist/adult-orbit.js';
import {reserveImportedEyes} from '../dist/stone-avatar.js';

// Geometry-only regression: the donor eye relief is removed before the actual
// skin aperture and a volume for the separately rendered eyeball are built.
const load = async name => JSON.parse(gunzipSync(Buffer.from(await fs.readFile(new URL('../dist/assets/anime/'+name,import.meta.url),'utf8'),'base64')));
const donor=await load('adult-male-v81.b64'),legacy=await load('imported-00003.b64');
const source=donor.meshes.find(m=>m.name==='Face'),snapshot=JSON.stringify(donor);
const prepared=prepareAdultOrbits(donor),face=prepared.meshes.find(m=>m.name==='Face'),rig=donor.landmarks.faceRig;
assert.notEqual(face.positions,source.positions,'preparation must clone the editable positions');
assert.equal(JSON.stringify(donor),snapshot,'eye preparation changed the immutable source asset');
assert.equal(prepareAdultOrbits(prepared),prepared,'eye preparation must be idempotent');
assert.equal(prepareAdultOrbits(legacy),legacy,'legacy imported head must remain unchanged');
assert.equal(prepareAdultOrbits({...donor,reference:{...donor.reference,baseFamily:'boy'}}).meshes,donor.meshes,'juvenile foundation entered adult eye cleanup');
assert.equal(prepareAdultOrbits({...donor,reference:{...donor.reference,baseFamily:'girl'}}).meshes,donor.meshes,'girl foundation entered adult eye cleanup');
for(const key of ['normals','uv','skinIndices','skinWeights','faceRegions','groups'])assert.deepEqual(face[key],source[key],'preparation changed '+key);
for(let id=0;id<source.positions.length/3;id++){
 assert.equal(face.positions[id*3],source.positions[id*3],'eye cleanup changed X');
 assert.equal(face.positions[id*3+1],source.positions[id*3+1],'eye cleanup changed Y');
}

const point=(m,id)=>m.positions.slice(id*3,id*3+3).map(v=>v/1e5);
const protectedRegions={nose:0,mouth:0,ears:0,forehead:0,collar:0};
for(let id=0;id<source.positions.length/3;id++){
 const p=point(source,id),nearCenter=Math.abs(p[0]-rig.headX);
 const regions={nose:nearCenter<.008&&p[1]>rig.mouth[1]+.008&&p[1]<rig.eyeY+.024,
  mouth:nearCenter<.040&&Math.abs(p[1]-rig.mouth[1])<.018,
  ears:nearCenter>.068&&Math.abs(p[1]-rig.eyeY)<.060,
  forehead:p[1]>rig.eyeY+.031,
  collar:p[1]<rig.neckY+.025};
 for(const [region,inside] of Object.entries(regions))if(inside){protectedRegions[region]++;assert.deepEqual(point(face,id),p,region+' was changed by eye cleanup');}
}
for(const [region,count] of Object.entries(protectedRegions))assert.ok(count>0,'protected region has no coverage: '+region);

const relief=[];
for(const eye of rig.eyes){
 const side=Math.sign(eye[0]-rig.headX)||1,core=[];
 for(let id=0;id<source.positions.length/3;id++){
  const p=point(source,id),q=point(face,id),dx=p[0]-eye[0],dy=p[1]-eye[1];
  if(Math.abs(dx)>.022||dy<-.020||dy>.018||Math.abs(p[0]-rig.headX)<.014||p[2]<eye[2]-.015)continue;
  // This is the fully authored core; the surrounding blend preserves the brow,
  // nasal root and cheek. Check both old ridges and old recesses, not just caps.
  const plane=eye[2]-.003-side*.35*dx+.22*dy;
  core.push({before:p[2]-plane,after:q[2]-plane,move:q[2]-p[2]});
 }
 assert.ok(core.length>=15,'eye cleanup lacks fully flattened core samples');
 assert.ok(core.some(v=>v.before>.010),'fixture no longer covers the old raised eye sculpture');
 assert.ok(core.some(v=>v.before<-.003),'fixture no longer covers the old engraved eye recess');
 assert.ok(core.some(v=>v.move>.003)&&core.some(v=>v.move<-.010),'cleanup only capped or only filled the old relief');
 const residual=Math.max(...core.map(v=>Math.abs(v.after)));
 assert.ok(residual<=.0000051,'old eye relief remains in the core: '+residual);
 relief.push({side:side<0?'left':'right',samples:core.length,oldPeak:Math.max(...core.map(v=>v.before)),oldTrough:Math.min(...core.map(v=>v.before)),residual});
}

const socket=reserveImportedEyes(donor),skin=socket.meshes.find(m=>m.name==='Face');
assert.equal(JSON.stringify(donor),snapshot,'socket cutting changed the immutable source asset');
assert.ok(skin.groups.some(g=>socket.materials[g.material].name==='ImportedEyeSocket'),'recessed socket lining missing');
assert.ok(skin.groups.every(g=>!/(EyeWhite|EyeIris|Pupil)/.test(socket.materials[g.material].name)),'old eyeball surface remained in the skin mesh');

// Quantized geometric edge keys catch cracks even where attribute seams create
// duplicate vertex indices. Both socket walls and rear lining must close.
const edgeCounts=m=>{
 const edges=new Map(),key=id=>m.positions.slice(id*3,id*3+3).join(',');
 for(const g of m.groups)for(let i=0;i<g.indices.length;i+=3){const ids=g.indices.slice(i,i+3).map(key);
  for(let k=0;k<3;k++){if(ids[k]===ids[(k+1)%3])continue;const edge=[ids[k],ids[(k+1)%3]].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}}
 return edges;
};
const sourceEdges=edgeCounts(source),socketEdges=edgeCounts(skin);
const boundary=edges=>[...edges].filter(([,n])=>n===1).map(([edge])=>edge).sort();
assert.deepEqual(boundary(socketEdges),boundary(sourceEdges),'eye cutting left an open crack or altered the existing bottom collar boundary');
assert.ok([...socketEdges.values()].every(n=>n<=2),'eye cutting introduced a nonmanifold geometric edge');

// An ellipse at each vertex alone cannot prove clearance: a large triangle
// may pass through a sphere between its vertices. Transform every complete
// triangle to ellipsoid space and measure its nearest point to the origin.
const radii=[.021,.010,.015],origin=new THREE.Vector3(),closest=new THREE.Vector3(),clearance=[];
for(const depth of [-.005,0,.002])for(const eye of rig.eyes){
 const center=[eye[0],eye[1],eye[2]-.022+depth];let minimum=Infinity,worst=null;
 for(const g of skin.groups)for(let i=0;i<g.indices.length;i+=3){
  const ids=g.indices.slice(i,i+3),p=ids.map(id=>new THREE.Vector3(...point(skin,id).map((v,k)=>(v-center[k])/radii[k])));
  new THREE.Triangle(...p).closestPointToPoint(origin,closest);
  if(closest.length()<minimum){minimum=closest.length();worst={material:socket.materials[g.material].name,indices:ids};}
 }
 assert.ok(minimum>=1,'skin/socket intersects separate eyeball at depth '+depth+' eye '+eye[0]+': '+JSON.stringify({minimum,worst}));
 clearance.push({depth,side:eye[0]<rig.headX?'left':'right',minimum});
}

// With separate eye meshes absent, rays through the aperture must reach the
// rear of the hollow socket, not a retained solid-eye or pupil-shaped relief.
for(const eye of rig.eyes)for(const dx of [-.010,0,.010])for(const dy of [-.001,0,.001]){
 const ray=new THREE.Ray(new THREE.Vector3(eye[0]+dx,eye[1]+dy,eye[2]+.05),new THREE.Vector3(0,0,-1));let front=-Infinity;
 for(const g of skin.groups)for(let i=0;i<g.indices.length;i+=3){
  const p=g.indices.slice(i,i+3).map(id=>new THREE.Vector3(...point(skin,id))),hit=ray.intersectTriangle(...p,false,new THREE.Vector3());
  if(hit)front=Math.max(front,hit.z);
 }
 assert.ok(Number.isFinite(front),'socket rear is unexpectedly open');
 assert.ok(front<=eye[2]-.045,'old eye relief blocks the reserved aperture at '+JSON.stringify({eye:eye[0],dx,dy,front,depth:front-eye[2]}));
}
console.log('PASS adult eye relief removed in both directions; source, juvenile foundations, nasal/mouth/ear/collar regions unchanged; preparation idempotent');
console.log('PASS closed socket boundaries; all skin/lining triangles clear complete eyeballs at depth -5/0/+2mm; aperture rays reach the rear cavity');
console.log(JSON.stringify({relief,protectedRegions,clearance},null,2));
