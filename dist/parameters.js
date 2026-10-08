// Parameters deform the original topology; source vertices are never mutated.
export const parameterDefaults = {
  headSize:50,neckWidth:50,chest:50,waist:50,hips:50,legThickness:50,
  forehead:50,chinLength:50,noseProjection:50,mouthHeight:50
};
export const parameterRanges = {
  headSize:['头部大小','小','大'],neckWidth:['颈部粗细','细','粗'],
  chest:['胸廓尺寸','小','大'],waist:['腰围','细','宽'],hips:['臀围','窄','宽'],legThickness:['腿部粗细','细','粗'],
  forehead:['额头饱满度','平','饱满'],chinLength:['下巴长度','短','长'],
  noseProjection:['鼻梁突出','平','突出'],mouthHeight:['嘴部位置','低','高']
};
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const gaussian=(v,c,s)=>Math.exp(-(((v-c)/s)**2));
export function createDeformer(input,landmarks,scale) {
  const state={...input};
  for(const [key,value] of Object.entries(parameterDefaults))state[key]=Number.isFinite(input[key])?Math.max(0,Math.min(100,input[key])):value;
  const head=landmarks.head,neck=landmarks.neck,hip=landmarks.hips[1];
  const eyeY=(landmarks.leftEye[1]+landmarks.rightEye[1])/2;
  const eyes=[landmarks.leftEye[0],landmarks.rightEye[0]];
  const legDelta=(state.legs-50)*.0008;
  function deform(x,y,z,name) {
    const oldY = y;
    const headScale=1+(state.headSize-50)*.002;
    const headBlend=smooth(neck[1]-.025,neck[1]+.07,y);
    x*=1+(headScale-1)*headBlend;
    z=head[2]+(z-head[2])*(1+(headScale-1)*headBlend);
    y+=(y-neck[1])*(headScale-1)*headBlend;
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
    const legBand=(1-smooth(hip-.14,hip-.02,oldY))*smooth(.10,.25,oldY);
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
