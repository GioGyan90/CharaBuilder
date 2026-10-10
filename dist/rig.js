import * as THREE from 'three';
// Conforming midpoint splits: retain the author's rest surface/UVs and add
// samples only around the bending knees. Neighbouring triangles share splits.
function refinePantsKnees(geometry,attrs,points,humanoid){
 const p=Array.from(geometry.attributes.position.array),n=Array.from(geometry.attributes.normal.array),uv=Array.from(geometry.attributes.uv.array),j=Array.from(attrs[0].array),w=Array.from(attrs[1].array);
 let index=Array.from(geometry.index.array);
 const near=(a,b)=>{const x=(p[a*3]+p[b*3])*.5,y=(p[a*3+1]+p[b*3+1])*.5,side=x>=0?'left':'right',knee=points[humanoid[side+'LowerLeg']],upper=points[humanoid[side+'UpperLeg']],foot=points[humanoid[side+'Foot']];return Math.abs(y-knee.y)<Math.min(knee.distanceTo(upper),knee.distanceTo(foot))*.40;};
 const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
 function midpoint(a,b){const id=p.length/3;
  for(let k=0;k<3;k++){p.push((p[a*3+k]+p[b*3+k])*.5);n.push((n[a*3+k]+n[b*3+k])*.5);}const length=Math.hypot(...n.slice(id*3,id*3+3))||1;for(let k=0;k<3;k++)n[id*3+k]/=length;
  for(let k=0;k<2;k++)uv.push((uv[a*2+k]+uv[b*2+k])*.5);
  const weights=new Map();for(const v of [a,b])for(let k=0;k<4;k++)weights.set(j[v*4+k],(weights.get(j[v*4+k])||0)+w[v*4+k]*.5);
  const top=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((s,v)=>s+v[1],0)||1;for(let k=0;k<4;k++){j.push(top[k]?.[0]||0);w.push((top[k]?.[1]||0)/sum);}return id;
 }
 for(let pass=0;pass<2;pass++){
  const edges=new Map();for(let t=0;t<index.length;t+=3){const [a,b,c]=index.slice(t,t+3);for(const [x,y] of [[a,b],[b,c],[c,a]])if(near(x,y)){const k=key(x,y);if(!edges.has(k))edges.set(k,midpoint(x,y));}}
  const next=[];for(let t=0;t<index.length;t+=3){const [a,b,c]=index.slice(t,t+3),ab=edges.get(key(a,b)),bc=edges.get(key(b,c)),ca=edges.get(key(c,a)),mask=(ab!==undefined?1:0)+(bc!==undefined?2:0)+(ca!==undefined?4:0);
   if(mask===0)next.push(a,b,c);
   else if(mask===1)next.push(a,ab,c,ab,b,c);
   else if(mask===2)next.push(b,bc,a,bc,c,a);
   else if(mask===4)next.push(c,ca,b,ca,a,b);
   else if(mask===3)next.push(b,bc,ab,a,ab,c,ab,bc,c);
   else if(mask===6)next.push(c,ca,bc,b,bc,a,bc,ca,a);
   else if(mask===5)next.push(a,ab,ca,c,ca,b,ca,ab,b);
   else next.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
  }index=next;
 }
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(index);
 return [new THREE.Uint16BufferAttribute(j,4),new THREE.Float32BufferAttribute(w,4)];
}
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
   const named=source?.skinBoneNames?.map(name=>{const i=rig.bones.findIndex(b=>b.name===name);if(i<0)throw Error('Missing clothing bone '+name);return i;});
   const fitted=source?.skinIndices?{indices:source.skinIndices,weights:source.skinWeights}:null;
   const original=part==='Body'?rig.meshes.Body:part==='Face'?rig.meshes.Face:null;
   const visible=part==='Pants'?new Set(geometry.index.array):null;
   for(let i=0;i<count;i++){
    if(visible&&!visible.has(i)){indices[i*4]=rig.humanoid.hips;weights[i*4]=1;continue;}
    if(fitted){for(let a=0;a<4;a++){indices[i*4+a]=named?named[fitted.indices[i*4+a]]:fitted.indices[i*4+a];weights[i*4+a]=fitted.weights[i*4+a];}continue;}
    if(part?.startsWith('Hair')){indices[i*4]=rig.humanoid.head;weights[i*4]=1;continue;}
    const p=source?source.positions.slice(i*3,i*3+3).map(v=>v/100000):mesh.userData.rigPoints?.[i];
    const owner=original||skin,id=original?i:nearest(p||[0,base.landmarks.neck[1]-.2,0]);
    for(let a=0;a<4;a++){indices[i*4+a]=owner.indices[id*4+a];weights[i*4+a]=owner.weights[id*4+a]/65535;}
    const total=weights.slice(i*4,i*4+4).reduce((a,b)=>a+b,0);for(let a=0;a<4;a++)weights[i*4+a]/=total||1;
   }
   attrs=[new THREE.Uint16BufferAttribute(indices,4),new THREE.Float32BufferAttribute(weights,4)];cache.set(source||mesh,attrs);
  }
  if(part==='Pants'){
   attrs=refinePantsKnees(geometry,attrs,points,rig.humanoid);
   // The donor's body-fitted weights vary sharply around a knee ring. Loose
   // trousers need a continuous thigh/shin transition around the whole tube.
   const p=geometry.attributes.position,indices=attrs[0].array,weights=attrs[1].array;
   for(const i of new Set(geometry.index.array)){
    const side=p.getX(i)>=0?'left':'right',upper=rig.humanoid[side+'UpperLeg'],lower=rig.humanoid[side+'LowerLeg'],foot=rig.humanoid[side+'Foot'];
    const knee=points[lower].y,band=Math.min(points[upper].distanceTo(points[lower]),points[lower].distanceTo(points[foot]))*.28;
    if(Math.abs(p.getY(i)-knee)>=band)continue;
    const t=THREE.MathUtils.smoothstep(p.getY(i),knee-band,knee+band);
    indices.set([upper,lower,0,0],i*4);weights.set([t,1-t,0,0],i*4);
   }
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
 group.updateMatrixWorld(true);group.userData.skeleton.update();updatePantsNormals(group);
}

// GPU skinning blends normal rotations; at bent knees that differs from the deformed
// trouser surface. Rebuild smooth posed normals, then undo the skin normal transform.
export function updatePantsNormals(group){
 if(!group?.userData.skeleton)return;
 let caches=group.userData.pantsNormalCache;
 if(!caches){caches=[];group.traverse(mesh=>{if(!mesh.isSkinnedMesh||mesh.userData.part!=='Pants')return;
  const p=mesh.geometry.attributes.position,used=[...new Set(mesh.geometry.index.array)],lookup=new Map(),canonical=new Int32Array(p.count),sums=[];
  for(const i of used){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*100000)).join(',');if(!lookup.has(key)){lookup.set(key,sums.length);sums.push(new THREE.Vector3());}canonical[i]=lookup.get(key);}
  caches.push({mesh,used,canonical,sums,points:new Float32Array(p.array.length),inverse:new Map(used.map(i=>[i,new THREE.Matrix3()]))});
 });group.userData.pantsNormalCache=caches;}
 const point=new THREE.Vector3(),e1=new THREE.Vector3(),e2=new THREE.Vector3(),normal=new THREE.Vector3(),matrix=new THREE.Matrix4(),bone=new THREE.Matrix4();
 for(const {mesh,used,canonical,sums,points,inverse} of caches){
  const p=mesh.geometry.attributes.position,joints=mesh.geometry.attributes.skinIndex.array,weights=mesh.geometry.attributes.skinWeight.array,n=mesh.geometry.attributes.normal,index=mesh.geometry.index.array;
  for(const i of used){point.fromBufferAttribute(p,i);mesh.applyBoneTransform(i,point);point.toArray(points,i*3);matrix.elements.fill(0);
   for(let a=0;a<4;a++){bone.fromArray(mesh.skeleton.boneMatrices,joints[i*4+a]*16);const w=weights[i*4+a];for(let k=0;k<16;k++)matrix.elements[k]+=bone.elements[k]*w;}
   inverse.get(i).setFromMatrix4(matrix).invert();
  }
  for(const sum of sums)sum.set(0,0,0);
  for(let t=0;t<index.length;t+=3){const a=index[t],b=index[t+1],c=index[t+2];point.fromArray(points,a*3);e1.fromArray(points,b*3).sub(point);e2.fromArray(points,c*3).sub(point);normal.crossVectors(e1,e2);for(const i of [a,b,c])sums[canonical[i]].add(normal);}
  for(const i of used){normal.copy(sums[canonical[i]]).applyMatrix3(inverse.get(i)).normalize();if(normal.lengthSq()>.5)n.setXYZ(i,normal.x,normal.y,normal.z);}
  n.needsUpdate=true;
 }
}
