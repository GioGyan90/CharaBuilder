import * as THREE from 'three';
// Original CC0 beta body weights; fitted garments inherit weights from nearby skin.
export function bindCharacter(group,base,deform){
 const rig=base.rig,bones=rig.bones.map(b=>{const o=new THREE.Bone();o.name=b.name;return o;});
 const points=rig.bones.map(b=>new THREE.Vector3(...deform(...b.position,'Body')));
 rig.bones.forEach((b,i)=>{bones[i].position.copy(points[i]);if(b.parent>=0){bones[i].position.sub(points[b.parent]);bones[b.parent].add(bones[i]);}else group.add(bones[i]);});
 group.updateMatrixWorld(true);
 const skeleton=new THREE.Skeleton(bones);skeleton.calculateInverses();
 const body=base.meshes.find(m=>m.name==='Body'),skin=rig.meshes.Body;
 const cell=.025,grid=new Map(),key=(x,y,z)=>`${x},${y},${z}`;
 const used=new Set(body.groups.filter(g=>base.materials[g.material].name.includes('_SKIN')).flatMap(g=>g.indices));
 for(const i of used){const p=body.positions.slice(i*3,i*3+3).map(v=>v/100000),k=key(...p.map(v=>Math.floor(v/cell)));if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i);}
 function nearest(p){const c=p.map(v=>Math.floor(v/cell));let best=Infinity,id=0;
  for(let r=0;r<5;r++){for(let x=-r;x<=r;x++)for(let y=-r;y<=r;y++)for(let z=-r;z<=r;z++){
   if(r&&Math.max(Math.abs(x),Math.abs(y),Math.abs(z))!==r)continue;
   for(const i of grid.get(key(c[0]+x,c[1]+y,c[2]+z))||[]){let d=0;for(let a=0;a<3;a++)d+=(body.positions[i*3+a]/100000-p[a])**2;if(d<best){best=d;id=i;}}
  }if(best<(Math.max(0,r-1)*cell)**2)break;}
  // Extreme garment parameters may lie beyond the spatial neighbourhood.
  if(!Number.isFinite(best))for(const i of used){let d=0;for(let a=0;a<3;a++)d+=(body.positions[i*3+a]/100000-p[a])**2;if(d<best){best=d;id=i;}}
  return id;
 }
 const cache=new Map();
 for(const mesh of [...group.children]){
  if(!mesh.isMesh)continue;
  const geometry=mesh.geometry,source=mesh.userData.rigSource,part=mesh.userData.part;
  let attrs=cache.get(source||mesh);
  if(!attrs){const count=geometry.attributes.position.count,indices=new Uint16Array(count*4),weights=new Float32Array(count*4);
   const original=part==='Body'?rig.meshes.Body:part==='Face'?rig.meshes.Face:null;
   for(let i=0;i<count;i++){
    if(part?.startsWith('Hair')){indices[i*4]=rig.humanoid.head;weights[i*4]=1;continue;}
    const p=source?source.positions.slice(i*3,i*3+3).map(v=>v/100000):mesh.userData.rigPoints?.[i];
    const owner=original||skin,id=original?i:nearest(p||[0,base.landmarks.neck[1]-.2,0]);
    for(let a=0;a<4;a++){indices[i*4+a]=owner.indices[id*4+a];weights[i*4+a]=owner.weights[id*4+a]/65535;}
    const total=weights.slice(i*4,i*4+4).reduce((a,b)=>a+b,0);for(let a=0;a<4;a++)weights[i*4+a]/=total||1;
   }
   attrs=[new THREE.Uint16BufferAttribute(indices,4),new THREE.Float32BufferAttribute(weights,4)];cache.set(source||mesh,attrs);
  }
  geometry.setAttribute('skinIndex',attrs[0]);geometry.setAttribute('skinWeight',attrs[1]);
  const skinned=new THREE.SkinnedMesh(geometry,mesh.material);skinned.name=mesh.name;skinned.userData=mesh.userData;delete skinned.userData.rigSource;delete skinned.userData.rigPoints;
  skinned.castShadow=mesh.castShadow;skinned.receiveShadow=mesh.receiveShadow;skinned.renderOrder=mesh.renderOrder;
  // Every mesh and bone uses group-local bind space; the parent floor offset is applied later.
  skinned.bind(skeleton,new THREE.Matrix4());skinned.frustumCulled=false;group.remove(mesh);group.add(skinned);
 }
 group.userData.skeleton=skeleton;
 group.userData.motion={bones,humanoid:rig.humanoid};
}
const smooth=t=>t*t*(3-2*t);
function window(t,start,end,ramp=.65){if(t<=start||t>=end)return 0;return smooth(Math.min(1,(t-start)/ramp))*smooth(Math.min(1,(end-t)/ramp));}
export function updateCharacterMotion(group,time,mode='idle'){
 if(!group?.userData.motion)return;
 const {bones,humanoid}=group.userData.motion;
 for(const bone of bones){bone.rotation.set(0,0,0);bone.scale.set(1,1,1);}
 const rotate=(name,x=0,y=0,z=0)=>{const b=bones[humanoid[name]];if(b)b.rotation.set(x,y,z);};
 if(mode!=='rest'){
  const breath=Math.sin(time*1.65),sway=Math.sin(time*.75);
  rotate('spine',.009*breath,0,.009*sway);rotate('chest',-.012*breath,0,-.006*sway);rotate('head',.01*breath,.018*Math.sin(time*.55),0);
  rotate('leftUpperArm',0,0,.009*breath);rotate('rightUpperArm',0,0,-.009*breath);
  if(mode==='inspect'){
   const t=time%12,look=window(t,.5,5),hands=window(t,2,6),turn=window(t,6.5,11.5),direction=Math.sin((t-6.5)/5*Math.PI*2);
   rotate('neck',.18*look,0,0);rotate('head',.2*look,.13*Math.sin(t)*look,0);
   rotate('chest',.045*look,.18*turn*direction,0);
   rotate('leftUpperArm',-.4*hands,0,-.14*hands);rotate('rightUpperArm',-.4*hands,0,.14*hands);
   rotate('leftLowerArm',-.75*hands,0,0);rotate('rightLowerArm',-.75*hands,0,0);
   rotate('leftHand',0,.12*hands,0);rotate('rightHand',0,-.12*hands,0);
   rotate('head',.2*look,.13*Math.sin(t)*look+.25*turn*direction,0);
  }
 }
 group.updateMatrixWorld(true);group.userData.skeleton.update();
}
