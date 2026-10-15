import {bodyDefaults,bodyRanges,bodyAdjustmentKeys,createBodyDeformer} from './body.js?v=101';
export {bodyAnchors,bodyHandlePoints,bodyAdjustmentKeys} from './body.js?v=101';
import {deformAnimeFace} from './face.js?v=86';
export {buildAnimeFace,headEnvelope,clearHair,importedFaceRegion} from './face.js?v=86';
// Parameters deform the original topology; source vertices are never mutated.
export const adultHeadKeys=['craniumWidth','craniumDepth','facePlaneSoftness'];
export const parameterDefaults = {
  craniumWidth:50,craniumDepth:50,facePlaneSoftness:50,
  ...bodyDefaults,
  eyeballDepth:50,pupilSize:50,gazeX:50,gazeY:50,browWidth:50,upperLipThickness:50,lowerLipThickness:50,upperLipProjection:50,lowerLipProjection:50,
  zygomaticArchDepth:50,jawCornerDepth:50,chinSquareness:50,mentolabialDepth:50,noseBaseDepth:50,upperLipWidth:50,lowerLipWidth:50,submentalDepth:50,foreheadSlope:50,
  midfaceSupport:50,jawBodySupport:50,
  muzzleDepth:50,philtrumDepth:50,philtrumLength:50,
  jawRamus:50,jawBase:50,masseter:50,neckForward:50,neckTendon:50,browSurfaceOffset:50,
  headSize:50,neckWidth:50,chest:50,waist:50,hips:50,legThickness:50,
  templeWidth:50,templeDepth:50,maxillaWidth:50,maxillaHeight:50,maxillaDepth:50,
  forehead:50,chinLength:50,noseProjection:50,mouthHeight:50,
  jawWidth:50,jawDepth:50,jawHeight:50,jawAngle:50,cheekboneWidth:50,cheekboneHeight:50,cheekboneDepth:50,chinProjection:50,
  cheekboneAngle:50,jawTilt:50,chinAngle:50,
  chinSize:50,
  midFaceLength:50,lowerFaceLength:50,cheekboneSharpness:50,eyeDepth:50,noseLength:50,
  browRidgeHeight:50,noseRootDepth:50,noseBridgeWidth:50,noseTipProjection:50,noseTipAngle:50,irisSize:50,
  faceHeight:50,cheek:50,chinWidth:50,eyeWidth:50,eyeHeight:50,eyeVertical:50,eyeTilt:50,browHeight:50,browAngle:50,browThickness:50,browRidge:50,noseWidth:50,noseHeight:50,mouthThickness:50,mouthProjection:50,mouthCorner:50
};
export const parameterRanges = {
  craniumWidth:['颅骨宽度','原宽','宽阔'],craniumDepth:['后脑饱满度','原形','饱满'],facePlaneSoftness:['面部过渡','原切面','平滑大面'],
  ...bodyRanges,
  eyeballDepth:['眼球前后位置','后收','前移'],pupilSize:['瞳孔大小','小','大'],gazeX:['视线左右','左','右'],gazeY:['视线上下','下','上'],browWidth:['眉毛长度','短','长'],upperLipThickness:['上唇厚度','薄','厚'],lowerLipThickness:['下唇厚度','薄','厚'],upperLipProjection:['上唇突出','平','突出'],lowerLipProjection:['下唇突出','平','突出'],
  headSize:['头部大小','小','大'],neckWidth:['颈部粗细','细','粗'],
  chest:['胸廓尺寸','小','大'],waist:['腰围','细','宽'],hips:['臀围','窄','宽'],legThickness:['腿部粗细','细','粗'],
  zygomaticArchDepth:['颧弓厚度', '薄', '厚'],jawCornerDepth:['下颌角前后位置', '后移', '前移'],chinSquareness:['下巴底面方正度', '尖', '方'],mentolabialDepth:['颏唇沟深度', '浅', '深'],noseBaseDepth:['鼻基底支撑', '后收', '前移'],upperLipWidth:['上唇宽度', '窄', '宽'],lowerLipWidth:['下唇宽度', '窄', '宽'],submentalDepth:['颏下体积', '收', '饱满'],foreheadSlope:['额头倾斜', '后倾', '直立'],
  midfaceSupport:['侧脸骨架饱满度','收','饱满'],jawBodySupport:['下颌体承托','窄尖','宽厚'],
  muzzleDepth:['嘴周体积','平','饱满'],philtrumDepth:['人中凹槽','浅','深'],philtrumLength:['人中长度','短','长'],
  jawRamus:['下颌升支高度','短','长'],jawBase:['下颌底缘宽度','收窄','方阔'],masseter:['咬肌体积','薄','厚'],neckForward:['颈部前后位置','后','前'],neckTendon:['胸锁乳突肌','柔和','明显'],browSurfaceOffset:['眉毛贴面间距','贴合','抬起'],
  jawWidth:['下颌宽度','窄','宽'],jawDepth:['下颌深度','后收','前伸'],jawHeight:['下颌位置','低','高'],jawAngle:['下颌转折','柔和','棱角'],
  cheekboneWidth:['颧骨宽度','窄','宽'],cheekboneHeight:['颧骨位置','低','高'],cheekboneDepth:['颧骨前后深度','平','突出'],chinProjection:['下巴前后深度','后收','前伸'],
  faceHeight:['脸部长度','短','长'],cheek:['面颊饱满度','收窄','丰满'],chinWidth:['下巴宽度','窄','宽'],
  eyeWidth:['眼睛宽度','窄','宽'],eyeHeight:['眼睛高度','扁','圆'],eyeVertical:['眼部位置','低','高'],eyeTilt:['眼睛角度','下垂','上扬'],
  cheekboneAngle:['颧骨前后倾角','后倾','前倾'],jawTilt:['下颌前后倾角','后倾','前倾'],chinAngle:['下巴前后倾角','后倾','前倾'],
  chinSize:['下巴整体大小','小','大'],
  midFaceLength:['中庭长度','短','长'],lowerFaceLength:['下庭长度','短','长'],cheekboneSharpness:['颧骨棱角','柔和','硬朗'],eyeDepth:['眼窝深度','后收','前移'],noseLength:['鼻部长度','短','长'],
  irisSize:['虹膜 / 瞳孔比例','小','大'],browRidgeHeight:['眉弓高度','低','高'],noseRootDepth:['鼻根深度','凹','挺'],noseBridgeWidth:['鼻梁宽度','窄','宽'],noseTipProjection:['鼻尖深度','后收','前伸'],noseTipAngle:['鼻尖角度','下垂','上翘'],
  browThickness:['眉毛粗细','细','粗'],browRidge:['眉弓前后深度','平','突出'],browHeight:['眉毛位置','低','高'],browAngle:['眉毛角度','平缓','上挑'],noseWidth:['鼻翼宽度','窄','宽'],noseHeight:['鼻部位置','低','高'],
  mouthThickness:['嘴唇厚度','薄','厚'],mouthProjection:['嘴部突出','平','突出'],mouthCorner:['嘴角形状','下压','上扬'],
  templeWidth:['颞部宽度','收窄','外扩'],templeDepth:['颞部深度','后收','前移'],maxillaWidth:['上颌宽度','窄','宽'],maxillaHeight:['上颌高度','低','高'],maxillaDepth:['上颌前后深度','后收','前伸'],
  forehead:['额头饱满度','平','饱满'],chinLength:['下巴长度','短','长'],
  noseProjection:['鼻梁突出','平','突出'],mouthHeight:['嘴部位置','低','高']
};
export const faceAdjustmentKeys=[...adultHeadKeys,'zygomaticArchDepth','jawCornerDepth','chinSquareness','mentolabialDepth','noseBaseDepth','upperLipWidth','lowerLipWidth','submentalDepth','foreheadSlope','midfaceSupport','jawBodySupport','muzzleDepth','philtrumDepth','philtrumLength','jawRamus','jawBase','masseter','browSurfaceOffset','eyeballDepth','pupilSize','gazeX','gazeY','browWidth','upperLipThickness','lowerLipThickness','upperLipProjection','lowerLipProjection','templeWidth','templeDepth','maxillaWidth','maxillaHeight','maxillaDepth','cheekboneAngle','jawTilt','chinAngle','chinSize','midFaceLength','lowerFaceLength','cheekboneSharpness','eyeDepth','noseLength','browRidgeHeight','noseRootDepth','noseBridgeWidth','noseTipProjection','noseTipAngle','irisSize','faceWidth','jawWidth','jawDepth','jawHeight','jawAngle','cheekboneWidth','cheekboneHeight','cheekboneDepth','chinProjection','eyeSize','eyeSpace','nose','mouth','forehead','chinLength','noseProjection','mouthHeight','faceHeight','cheek','chinWidth','eyeWidth','eyeHeight','eyeVertical','eyeTilt','browHeight','browAngle','browThickness','browRidge','noseWidth','noseHeight','mouthThickness','mouthProjection','mouthCorner'];
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const gaussian=(v,c,s)=>Math.exp(-(((v-c)/s)**2));
export function createDeformer(input,landmarks,scale) {
  const state={...input};
  for(const [key,value] of Object.entries(parameterDefaults))state[key]=Number.isFinite(input[key])?Math.max(adultHeadKeys.includes(key)?0:bodyAdjustmentKeys.includes(key)?-100:faceAdjustmentKeys.includes(key)?-50:0,Math.min(adultHeadKeys.includes(key)?100:bodyAdjustmentKeys.includes(key)?200:faceAdjustmentKeys.includes(key)?150:100,input[key])):value;
  // Legacy coarse jaw maps to width only; never apply both controls.
  if(!Object.hasOwn(input,'jawWidth')&&Number.isFinite(input.jaw))state.jawWidth=Math.max(-50,Math.min(150,input.jaw));
  const head=landmarks.head,neck=landmarks.neck,hip=landmarks.hips[1];
  const eyeY=(landmarks.leftEye[1]+landmarks.rightEye[1])/2;
  const eyes=[landmarks.leftEye[0],landmarks.rightEye[0]];
  const editBody=createBodyDeformer(state,landmarks);
  const legDelta=(state.legs-50)*.0008;
  function deform(x,y,z,name,legSide) {
    if(name.startsWith('Face:iris')&&landmarks.faceRig){
      const eye=landmarks.faceRig.eyes[Number(name.slice(-1))],c=deform(...eye,'Face:eye'+name.slice(-1)),uniform=(1+(state.headSize-50)*.002)*scale*(landmarks.faceRig.preset.irisScale??(landmarks.faceRig.preset.adult?.78:1))*Math.max(.2,1+(state.irisSize-50)*.008);
      return [c[0]+(x-eye[0])*uniform,c[1]+(y-eye[1])*uniform,c[2]+(z-eye[2])*uniform];
    }
    const source=[x,y,z],oldY = y;
    if(name.startsWith('Face:')&&landmarks.faceRig){const edited=deformAnimeFace(x,y,z,state,landmarks.faceRig,name),blend=landmarks.faceRig.preset.foundation?smooth(neck[1]-.12,neck[1]+.026,y):landmarks.headJoinY===undefined?1:smooth(landmarks.headJoinY,landmarks.headJoinY+.055,y);[x,y,z]=source.map((v,k)=>v+(edited[k]-v)*blend);}
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
    if(state.bodySource==='stone'&&state.gender==='male'&&!landmarks.stoneRebuilt&&!(state.characterType==='man'&&state.foundationRevision>=1)){
      // Long muscular neck, continuous with the upper back and lower head.
      const adultNeck=gaussian(oldY,neck[1]-.016,.065)*(1-smooth(neck[1]+.010,neck[1]+.048,oldY))*(1-smooth(.07,.14,Math.abs(source[0])));
      const strength=Math.max(0,Math.min(2,(state.muscleMass-50)/50));
      x*=1+(.18+.06*strength)*adultNeck;
      z=neck[2]+(z-neck[2])*(1+(.12+.04*strength)*adultNeck);
    }
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
    if(landmarks.faceRig?.preset.foundation){
      const nForward=Math.max(-2,Math.min(2,((state.neckForward??50)-50)/50));
      const nTendon=Math.max(-2,Math.min(2,((state.neckTendon??50)-50)/50));
      const rise=smooth(neck[1]-.13,neck[1]+.065,oldY);
      z+=nForward*.035*rise;
      const band=smooth(neck[1]-.115,neck[1]-.065,oldY)*(1-smooth(neck[1]+.025,neck[1]+.085,oldY));
      const path=.025+.22*Math.max(0,oldY-(neck[1]-.10));
      z+=nTendon*.006*gaussian(Math.abs(source[0]),path,.014)*band*smooth(neck[2],neck[2]+.045,source[2]);
    }
    [x,y,z]=editBody(x,y,z,source,legSide);
    y += legDelta*smooth(.02,hip,oldY);
    return [x*scale,(y+.001)*scale,z*scale];
  }
  return deform;
}
// Inverse-transpose Jacobian, expressed as transformed tangent cross products.
// Keeps the author's smooth normals while accounting for shape changes.
export function deformNormal(deform,x,y,z,nx,ny,nz,name,legSide) {
  const nlen=Math.hypot(nx,ny,nz)||1;nx/=nlen;ny/=nlen;nz/=nlen;
  const ax=Math.abs(ny)<.9?0:1,ay=Math.abs(ny)<.9?1:0;
  let tx=ay*nz,ty=-ax*nz,tz=ax*ny-ay*nx;
  const len=Math.hypot(tx,ty,tz)||1;tx/=len;ty/=len;tz/=len;
  const bx=ny*tz-nz*ty,by=nz*tx-nx*tz,bz=nx*ty-ny*tx;
  const e=.0001,p=deform(x,y,z,name,legSide),a=deform(x+tx*e,y+ty*e,z+tz*e,name,legSide),b=deform(x+bx*e,y+by*e,z+bz*e,name,legSide);
  const ux=a[0]-p[0],uy=a[1]-p[1],uz=a[2]-p[2],vx=b[0]-p[0],vy=b[1]-p[1],vz=b[2]-p[2];
  const rx=uy*vz-uz*vy,ry=uz*vx-ux*vz,rz=ux*vy-uy*vx,l=Math.hypot(rx,ry,rz);
  return l>1e-12?[rx/l,ry/l,rz/l]:[nx,ny,nz];
}
