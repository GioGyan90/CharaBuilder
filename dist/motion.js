import * as THREE from 'three';
import library from './assets/motion/quaternius.js?v=26';
import {updateCharacterMotion as proceduralMotion,updatePantsNormals} from './rig.js?v=28';
export const motionPresets=[
 {id:'relaxed',label:'放松站姿',source:'Idle_Loop'},
 {id:'talk',label:'交谈手势',source:'Idle_Talking_Loop'},
 {id:'walk',label:'自然步行',source:'Walk_Loop'},
 {id:'formalWalk',label:'挺拔步行',source:'Walk_Formal_Loop'},
 {id:'jog',label:'原地慢跑',source:'Jog_Fwd_Loop'},
 {id:'dance',label:'舞蹈展示',source:'Dance_Loop'},
 {id:'interact',label:'伸手交互（单次）',source:'Interact'},
 {id:'pickUp',label:'拿取手势（单次）',source:'PickUp_Table'},
];
// Reuse authored poses for idle/inspection; only breathing and gaze are additive.
const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const envelope=(t,start,end,ramp=.8)=>ease((t-start)/ramp)*ease((end-t)/ramp);
export function inspectionPhase(time){
 const t=((time%12)+12)%12;
 const hand=envelope(t,1,5.8),body=envelope(t,6.2,11.2);
 return {t,hand,body,source:hand>0?'interact':'talk',weight:Math.max(hand,body),clipTime:hand>0?THREE.MathUtils.clamp((t-1)/4.8,0,1)*library.clips.interact.duration:THREE.MathUtils.clamp((t-6.2)/5,0,1)*library.clips.talk.duration,turn:.12*body*Math.sin((t-6.2)/5*Math.PI*2)};
}
function sample(clip,time,key,out){
 const track=clip.rotations[key];if(!track)return out.identity();
 const t=clip.loop===false?THREE.MathUtils.clamp(time,0,clip.duration):((time%clip.duration)+clip.duration)%clip.duration;
 const phase=t/clip.duration*(clip.frames-1),f=Math.floor(phase),g=Math.min(f+1,clip.frames-1);
 return out.fromArray(track,f*4).normalize().slerp(b.fromArray(track,g*4).normalize(),phase-f);
}
function upperBody(key){return /^(spine|chest|upperChest|neck|head)$/.test(key)||/^(left|right)(Shoulder|UpperArm|LowerArm|Hand|Thumb|Index|Middle|Ring|Little)/.test(key);}
const next={leftUpperArm:'leftLowerArm',rightUpperArm:'rightLowerArm'};
const q=new THREE.Quaternion(),parentQ=new THREE.Quaternion(),wanted=new THREE.Quaternion(),a=new THREE.Quaternion(),b=new THREE.Quaternion(),v=new THREE.Vector3();
// Match digit direction AND palm normal, so thumb/finger bends retain the
// author's plane instead of inheriting an unrelated upper-arm rest rotation.
function digitFrame(direction,normal){
 const x=direction.clone().normalize(),y=normal.clone().addScaledVector(x,-normal.dot(x)).normalize(),z=new THREE.Vector3().crossVectors(x,y).normalize();
 return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
}
function setup(group){
 if(group.userData.motionPlayback)return group.userData.motionPlayback;
 const {bones,humanoid}=group.userData.motion,rest=bones.map(b=>b.position.clone()),alignment=bones.map(()=>new THREE.Quaternion());
 group.updateMatrixWorld(true);
 for(const [key,child] of Object.entries(next)){
  const i=humanoid[key],j=humanoid[child];if(i===undefined||j===undefined)continue;
  const sourceDir=new THREE.Vector3(...library.reference[child]).sub(new THREE.Vector3(...library.reference[key])).normalize();
  const targetDir=bones[j].getWorldPosition(new THREE.Vector3()).sub(bones[i].getWorldPosition(new THREE.Vector3())).normalize();
  a.setFromUnitVectors(sourceDir,targetDir);
  const side=key.startsWith('left')?'left':'right';
  for(const k of ['UpperArm','LowerArm','Hand'])if(humanoid[side+k]!==undefined)alignment[humanoid[side+k]].copy(a);
 }
 for(const side of ['left','right']){
  const source=k=>new THREE.Vector3(...library.reference[side+k]);
  const target=k=>bones[humanoid[side+k]].getWorldPosition(new THREE.Vector3());
  const palm=get=>new THREE.Vector3().crossVectors(get('MiddleProximal').sub(get('Hand')),get('IndexProximal').sub(get('LittleProximal'))).normalize();
  const sourceNormal=palm(source),targetNormal=palm(target);
  for(const digit of ['Thumb','Index','Middle','Ring','Little'])for(const [part,child,previous] of [['Proximal','Intermediate',null],['Intermediate','Distal',null],['Distal',null,'Intermediate']]){
   const key=side+digit+part,i=humanoid[key];if(i===undefined)continue;
   const sourceDir=child?source(digit+child).sub(source(digit+part)):source(digit+part).sub(source(digit+previous));
   const end=bones[i].children.find(b=>b.isBone);
   const targetDir=child?target(digit+child).sub(target(digit+part)):end?end.getWorldPosition(new THREE.Vector3()).sub(target(digit+part)):target(digit+part).sub(target(digit+previous));
   alignment[i].copy(digitFrame(targetDir,targetNormal)).multiply(digitFrame(sourceDir,sourceNormal).invert());
  }
 }
 const byIndex=new Map(Object.entries(humanoid).map(([key,i])=>[i,key])),index=new Map(bones.map((b,i)=>[b,i]));
 const depth=b=>b.parent?.isBone?1+depth(b.parent):0,order=bones.map((_,i)=>i).sort((i,j)=>depth(bones[i])-depth(bones[j]));
 // Visible soles only; foot contact correction does not use donor mesh or alter body parameters.
 const candidates=[];
 group.traverse(m=>{if(!m.isSkinnedMesh)return;const p=m.geometry.attributes.position,used=[...new Set(m.geometry.index.array)];for(const i of used)if(p.getY(i)<.25&&Math.abs(p.getX(i))<.3)candidates.push({mesh:m,i,y:p.getY(i)});});
 const floor=candidates.length?Math.min(...candidates.map(c=>c.y)):0;
 const low=candidates.filter(c=>c.y<floor+.035),soles=[];
 for(const side of [-1,1]){const part=low.filter(c=>Math.sign(c.mesh.geometry.attributes.position.getX(c.i))===side);const step=Math.max(1,Math.floor(part.length/96));for(let i=0;i<part.length;i+=step)soles.push(part[i]);}
 const playback={rest,alignment,byIndex,index,order,soles,floor,baseY:group.position.y,hipsHeight:bones[humanoid.hips]?.getWorldPosition(v).y-group.position.y,world:bones.map(()=>new THREE.Quaternion()),mode:null,from:bones.map(b=>b.quaternion.clone()),fromHip:0,start:0};
 group.userData.motionPlayback=playback;return playback;
}
export function updateCharacterMotion(group,time,mode='idle'){
 if(!group?.userData.motion)return;
 const p=setup(group),{bones,humanoid}=group.userData.motion,custom=mode==='idle'||mode==='inspect',clip=library.clips[custom?'relaxed':mode],inspect=mode==='inspect'?inspectionPhase(time):null;
 if(p.mode!==mode){p.from=bones.map(b=>b.quaternion.clone());p.fromHip=bones[humanoid.hips]?.position.y-p.rest[humanoid.hips]?.y||0;p.mode=mode;p.start=time;}
 group.position.y=p.baseY;for(let i=0;i<bones.length;i++){bones[i].position.copy(p.rest[i]);bones[i].scale.set(1,1,1);}
 if(!clip){proceduralMotion(group,time,mode);return;}
 const clipTime=clip.loop===false?THREE.MathUtils.clamp(time,0,clip.duration):((time%clip.duration)+clip.duration)%clip.duration;
 const phase=clipTime/clip.duration*(clip.frames-1),f=Math.floor(phase),g=Math.min(f+1,clip.frames-1),fraction=phase-f;
 // World deltas from the author's T-pose, then compensate our baked relaxed arms.
 // Reconstruct local rotations through the actual target hierarchy; body lengths stay editable.
 for(const i of p.order){const key=p.byIndex.get(i),track=clip.rotations[key],parent=p.index.get(bones[i].parent);
  parentQ.copy(parent===undefined?new THREE.Quaternion():p.world[parent]);
  if(track){a.fromArray(track,f*4).normalize();b.fromArray(track,g*4).normalize();wanted.copy(a).slerp(b,fraction);if(inspect&&inspect.weight&&upperBody(key)){sample(library.clips[inspect.source],inspect.clipTime,key,q);wanted.slerp(q,inspect.weight);}wanted.multiply(q.copy(p.alignment[i]).invert());bones[i].quaternion.copy(parentQ).invert().multiply(wanted);}
  else bones[i].quaternion.identity();
  p.world[i].copy(parentQ).multiply(bones[i].quaternion);
 }
 const blend=THREE.MathUtils.smoothstep(time-p.start,0,.22),hipDelta=THREE.MathUtils.lerp(clip.hipY[f],clip.hipY[g],fraction)*p.hipsHeight;
 for(let i=0;i<bones.length;i++){wanted.copy(bones[i].quaternion);bones[i].quaternion.copy(p.from[i]).slerp(wanted,blend);}
 bones[humanoid.hips].position.y+=THREE.MathUtils.lerp(p.fromHip,hipDelta,blend);
 if(custom){
  // Small rib-cage expansion follows a 4.8 s breath, over the author's relaxed pose.
  const inhale=(1-Math.cos(time*Math.PI*2/4.8))*.5,amplitude=(inspect?.weight?1-.35*inspect.weight:1)*blend;
  const chest=bones[humanoid.chest];if(chest)chest.scale.set(1+.004*inhale*amplitude,1,1+.007*inhale*amplitude);
  if(inspect){
   const torso=bones[humanoid.upperChest];if(torso)torso.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(0,1,0),inspect.turn*blend));
   group.updateMatrixWorld(true);
   const head=bones[humanoid.head],neck=bones[humanoid.neck];
   if(head&&neck){
    const origin=head.getWorldPosition(new THREE.Vector3()),target=inspect.hand>0?bones[humanoid.leftHand].getWorldPosition(new THREE.Vector3()):bones[humanoid.spine].getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(inspect.turn*.3,0,.20));
    const direction=target.sub(origin),yaw=THREE.MathUtils.clamp(Math.atan2(direction.x,Math.max(.06,direction.z)),-.42,.42),pitch=THREE.MathUtils.clamp(Math.atan2(-direction.y,Math.hypot(direction.x,direction.z)),0,.48),weight=inspect.weight*blend;
    neck.quaternion.multiply(q.setFromEuler(new THREE.Euler(pitch*.30*weight,yaw*.25*weight,0)));
    group.updateMatrixWorld(true);
    const current=head.getWorldQuaternion(new THREE.Quaternion()),look=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0));
    current.slerp(look,weight);head.parent.getWorldQuaternion(parentQ);head.quaternion.copy(parentQ).invert().multiply(current);
   }
  }
 }
 group.updateMatrixWorld(true);group.userData.skeleton.update();
 // Keep the lowest sampled visible sole on its neutral floor. This is height correction,
 // not a full planted-foot IK solver; horizontal root motion is intentionally removed for preview.
 let lowest=Infinity;for(const {mesh,i} of p.soles){v.fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,v);lowest=Math.min(lowest,v.y);}
 if(Number.isFinite(lowest)){group.position.y=p.baseY+p.floor-lowest;group.updateMatrixWorld(true);group.userData.skeleton.update();}
 updatePantsNormals(group);
}
