import {bodyDefaults,bodyRanges,bodyAdjustmentKeys,createBodyDeformer} from './body.js?v=21';
export {bodyAnchors,bodyHandlePoints,bodyAdjustmentKeys} from './body.js?v=21';
import {deformAnimeFace} from './face.js?v=29';
export {buildAnimeFace,headEnvelope,clearHair} from './face.js?v=29';
// Parameters deform the original topology; source vertices are never mutated.
export const parameterDefaults = {
  ...bodyDefaults,
  headSize:50,neckWidth:50,chest:50,waist:50,hips:50,legThickness:50,
  forehead:50,chinLength:50,noseProjection:50,mouthHeight:50,
  jawWidth:50,jawDepth:50,jawHeight:50,jawAngle:50,cheekboneWidth:50,cheekboneHeight:50,cheekboneDepth:50,chinProjection:50,
  faceHeight:50,cheek:50,chinWidth:50,eyeWidth:50,eyeHeight:50,eyeVertical:50,eyeTilt:50,browHeight:50,browAngle:50,noseWidth:50,noseHeight:50,mouthThickness:50,mouthProjection:50,mouthCorner:50
};
export const parameterRanges = {
  ...bodyRanges,
  headSize:['头部大小','小','大'],neckWidth:['颈部粗细','细','粗'],
  chest:['胸廓尺寸','小','大'],waist:['腰围','细','宽'],hips:['臀围','窄','宽'],legThickness:['腿部粗细','细','粗'],
  jawWidth:['下颌宽度','窄','宽'],jawDepth:['下颌深度','后收','前伸'],jawHeight:['下颌位置','低','高'],jawAngle:['下颌转折','柔和','棱角'],
  cheekboneWidth:['颧骨宽度','窄','宽'],cheekboneHeight:['颧骨位置','低','高'],cheekboneDepth:['颧骨突出','平','突出'],chinProjection:['下巴突出','后收','前伸'],
  faceHeight:['脸部长度','短','长'],cheek:['面颊饱满度','收窄','丰满'],chinWidth:['下巴宽度','窄','宽'],
  eyeWidth:['眼睛宽度','窄','宽'],eyeHeight:['眼睛高度','扁','圆'],eyeVertical:['眼部位置','低','高'],eyeTilt:['眼睛角度','下垂','上扬'],
  browHeight:['眉毛位置','低','高'],browAngle:['眉毛角度','平缓','上挑'],noseWidth:['鼻翼宽度','窄','宽'],noseHeight:['鼻部位置','低','高'],
  mouthThickness:['嘴唇厚度','薄','厚'],mouthProjection:['嘴部突出','平','突出'],mouthCorner:['嘴角形状','下压','上扬'],
  forehead:['额头饱满度','平','饱满'],chinLength:['下巴长度','短','长'],
  noseProjection:['鼻梁突出','平','突出'],mouthHeight:['嘴部位置','低','高']
};
export const faceAdjustmentKeys=['faceWidth','jawWidth','jawDepth','jawHeight','jawAngle','cheekboneWidth','cheekboneHeight','cheekboneDepth','chinProjection','eyeSize','eyeSpace','nose','mouth','forehead','chinLength','noseProjection','mouthHeight','faceHeight','cheek','chinWidth','eyeWidth','eyeHeight','eyeVertical','eyeTilt','browHeight','browAngle','noseWidth','noseHeight','mouthThickness','mouthProjection','mouthCorner'];
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const gaussian=(v,c,s)=>Math.exp(-(((v-c)/s)**2));
export function createDeformer(input,landmarks,scale) {
  const state={...input};
  for(const [key,value] of Object.entries(parameterDefaults))state[key]=Number.isFinite(input[key])?Math.max((faceAdjustmentKeys.includes(key)||bodyAdjustmentKeys.includes(key))?-50:0,Math.min((faceAdjustmentKeys.includes(key)||bodyAdjustmentKeys.includes(key))?150:100,input[key])):value;
  // Legacy coarse jaw maps to width only; never apply both controls.
  if(!Object.hasOwn(input,'jawWidth')&&Number.isFinite(input.jaw))state.jawWidth=Math.max(-50,Math.min(150,input.jaw));
  const head=landmarks.head,neck=landmarks.neck,hip=landmarks.hips[1];
  const eyeY=(landmarks.leftEye[1]+landmarks.rightEye[1])/2;
  const eyes=[landmarks.leftEye[0],landmarks.rightEye[0]];
  const editBody=createBodyDeformer(state,landmarks);
  const legDelta=(state.legs-50)*.0008;
  function deform(x,y,z,name) {
    if(name.startsWith('Face:iris')&&landmarks.faceRig){
      const eye=landmarks.faceRig.eyes[Number(name.slice(-1))],c=deform(...eye,'Face:eye'+name.slice(-1)),uniform=(1+(state.headSize-50)*.002)*scale;
      return [c[0]+(x-eye[0])*uniform,c[1]+(y-eye[1])*uniform,c[2]+(z-eye[2])*uniform];
    }
    const source=[x,y,z],oldY = y;
    if(name.startsWith('Face:')&&landmarks.faceRig)[x,y,z]=deformAnimeFace(x,y,z,state,landmarks.faceRig,name);
    const headScale=1+(state.headSize-50)*.002;
    const headBlend=smooth(neck[1]-.025,neck[1]+.07,y);
    x*=1+(headScale-1)*headBlend;
    z=head[2]+(z-head[2])*(1+(headScale-1)*headBlend);
    y+=(y-neck[1])*(headScale-1)*headBlend;
    const headWeight = smooth(neck[1]-.025,neck[1]+.07,y);
    const faceWidth = 1 + (state.faceWidth-50)*.0017;
    x *= 1 + (faceWidth-1)*headWeight;
    if (name==='Face'&&!landmarks.faceRig) {
      const jawWeight = gaussian(y,eyeY-.10,.07) * smooth(-.025,.05,z);
      x *= 1 + (state.jawWidth-50)*.0016*jawWeight;
      // The same continuous deformation acts on skin, lids, brows and iris meshes.
      for (const eyeX of eyes) {
        const weight=gaussian(x,eyeX*faceWidth,.043)*gaussian(y,eyeY,.038)*smooth(-.01,.03,z);
        const size=(state.eyeSize-50)*.0014;
        x += (x-eyeX*faceWidth)*size*weight;
        y += (y-eyeY)*size*weight;
        x += Math.sign(eyeX)*(state.eyeSpace-50)*.000055*weight;
      }
      const forehead=gaussian(y,eyeY+.075,.07)*smooth(.015,.065,z);
      z+=(state.forehead-50)*.00015*forehead;
      const chin=gaussian(y,eyeY-.145,.04)*gaussian(x,0,.055)*smooth(.01,.04,z);
      y-=(state.chinLength-50)*.00018*chin;
      const noseWeight=gaussian(x,0,.018)*gaussian(y,eyeY-.04,.021)*smooth(.065,.095,z);
      z += (state.nose-50)*.000065*noseWeight;
      z+=(state.noseProjection-50)*.00013*noseWeight;
      const mouthWeight=gaussian(x,0,.032)*gaussian(y,eyeY-.092,.019)*smooth(.03,.07,z);
      x *= 1+(state.mouth-50)*.0018*mouthWeight;
      y+=(state.mouthHeight-50)*.00012*mouthWeight;
    }
    const neckBand=gaussian(oldY,neck[1]-.025,.045)*(1-headWeight);
    x*=1+(state.neckWidth-50)*.002*neckBand;
    z*=1+(state.neckWidth-50)*.002*neckBand;
    const central=gaussian(x,0,.20);
    const chest=gaussian(oldY,neck[1]-.22,.115)*central*(1-headWeight);
    const waist=gaussian(oldY,hip+.12,.10)*central*(1-headWeight);
    const pelvis=gaussian(oldY,hip-.025,.13)*central;
    x*=1+(state.chest-50)*.002*chest+(state.waist-50)*.0025*waist+(state.hips-50)*.002*pelvis;
    z*=1+(state.chest-50)*.0025*chest+(state.waist-50)*.002*waist+(state.hips-50)*.002*pelvis;
    const legBand=(1-smooth(hip-.14,hip-.02,oldY))*smooth(.10,.25,oldY)*(1-smooth(.15,.24,Math.abs(source[0])));
    const legCenter=Math.sign(x)*.085;
    x+=(x-legCenter)*(state.legThickness-50)*.002*legBand;
    z*=1+(state.legThickness-50)*.002*legBand;
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
    [x,y,z]=editBody(x,y,z,source);
    y += legDelta*smooth(.02,hip,oldY);
    return [x*scale,(y+.001)*scale,z*scale];
  }
  return deform;
}
// Inverse-transpose Jacobian, expressed as transformed tangent cross products.
// Keeps the author's smooth normals while accounting for shape changes.
export function deformNormal(deform,x,y,z,nx,ny,nz,name) {
  const nlen=Math.hypot(nx,ny,nz)||1;nx/=nlen;ny/=nlen;nz/=nlen;
  const ax=Math.abs(ny)<.9?0:1,ay=Math.abs(ny)<.9?1:0;
  let tx=ay*nz,ty=-ax*nz,tz=ax*ny-ay*nx;
  const len=Math.hypot(tx,ty,tz)||1;tx/=len;ty/=len;tz/=len;
  const bx=ny*tz-nz*ty,by=nz*tx-nx*tz,bz=nx*ty-ny*tx;
  const e=.0001,p=deform(x,y,z,name),a=deform(x+tx*e,y+ty*e,z+tz*e,name),b=deform(x+bx*e,y+by*e,z+bz*e,name);
  const ux=a[0]-p[0],uy=a[1]-p[1],uz=a[2]-p[2],vx=b[0]-p[0],vy=b[1]-p[1],vz=b[2]-p[2];
  const rx=uy*vz-uz*vy,ry=uz*vx-ux*vz,rz=ux*vy-uy*vx,l=Math.hypot(rx,ry,rz);
  return l>1e-12?[rx/l,ry/l,rz/l]:[nx,ny,nz];
}
