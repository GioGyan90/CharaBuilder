import {deformNormal} from './parameters.js?v=101';
import {hunyuanSkinGLSL} from './hunyuan-skin.js?v=97';
import {composeStoneCEyes} from './stone-c-eyes.js?v=106';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const normalCache=new WeakMap();
const hairPartitions=new WeakMap();
// Partition original triangles, retaining every position, normal, UV and skin weight.
// Both parts stay in Face deformation space so shared boundary vertices cannot drift.
function splitStoneCHair(mesh,material){
 let groups=hairPartitions.get(mesh);
 if(!groups){
  const original=mesh.groups[0];
  groups=[{...original,indices:mesh.stoneCSkinIndices},{material,indices:mesh.stoneCHairMainIndices},{material:material+1,indices:mesh.stoneCSideHairIndices}];hairPartitions.set(mesh,groups);
 }
 return {...mesh,groups};
}
/** C is a separate adult asset. Never run the old adolescent/adult-head rebuild. */
export function composeStoneC(asset,state){
 asset=composeStoneCEyes(asset,state);
 const r=asset.landmarks.faceRig,w=((state.craniumWidth??50)-50)/50,d=((state.craniumDepth??50)-50)/50;
 const value=k=>Math.max(-1,Math.min(1,((state[k]??50)-50)/50));
 const bell=(x,c,r)=>Math.exp(-(((x-c)/r)**2));
 const field=(x,y,z)=>{
  if(y<=asset.landmarks.headJoinY)return [x,y,z];
  const skull=smooth(r.eyeY-.01,r.eyeY+.08,y),lateral=smooth(.027,.060,Math.abs(x-r.headX));
  let X=r.headX+(x-r.headX)*(1+.08*w*skull*lateral),Y=y,Z=z-.010*d*skull*(1-smooth(r.headZ-.01,r.headZ+.045,z));
  const front=smooth(r.mouth[2]-.025,r.mouth[2]-.008,z),oral=bell(x,r.mouth[0],.026)*front;
  const upper=bell(y,r.mouth[1]+.004,.006)*oral,lower=bell(y,r.mouth[1]-.006,.007)*oral;
  Y+=.003*(value('upperLipThickness')*upper-value('lowerLipThickness')*lower);
  Z+=.004*(value('upperLipProjection')*upper+value('lowerLipProjection')*lower);
  const b=r.brows[x<r.headX?0:1],brow=bell(x,b[0],.030)*bell(y,b[1],.009)*smooth(b[2]-.015,b[2]-.005,z);
  X+=(x-b[0])*.12*value('browWidth')*brow;Y+=(y-b[1])*.35*value('browThickness')*brow;
  return [X,Y,Z];
 };
 const meshes=asset.meshes.map(m=>{
  if(m.name!=='Face'&&!m.stoneCEye)return m;
  if(!w&&!d&&['upperLipThickness','lowerLipThickness','upperLipProjection','lowerLipProjection','browWidth','browThickness','facePlaneSoftness'].every(k=>(state[k]??50)===50))return m;
  if(m.blinkFrames){
   const frames=m.blinkFrames.map(frame=>{const positions=[],normals=[];for(let i=0;i<frame.positions.length;i+=3){const p=frame.positions.slice(i,i+3).map(v=>v/1e5);positions.push(...field(...p).map(v=>v*1e5));normals.push(...deformNormal(field,...p,...frame.normals.slice(i,i+3).map(v=>v/32767),'Face').map(v=>v*32767));}return {positions,normals};});
   return {...m,positions:frames[0].positions,normals:frames[0].normals,blinkFrames:frames};
  }
  const positions=[],normals=[],soft=m.name==='Face'?((state.facePlaneSoftness??50)-50)/50:0;
  let averaged=normalCache.get(m);
  if(!averaged){const sums=new Map(),keys=[];for(let i=0;i<m.positions.length;i+=3){const k=m.positions.slice(i,i+3).map(v=>Math.round(v)).join(',');keys.push(k);if(!sums.has(k))sums.set(k,[0,0,0]);const n=sums.get(k);for(let j=0;j<3;j++)n[j]+=m.normals[i+j];}averaged=keys.map(k=>{const n=sums.get(k),l=Math.hypot(...n)||1;return n.map(v=>v/l);});normalCache.set(m,averaged);}
  for(let i=0;i<m.positions.length;i+=3){const p=m.positions.slice(i,i+3).map(v=>v/1e5),q=field(...p),n=m.normals.slice(i,i+3).map(v=>v/32767);positions.push(...q.map(v=>v*1e5));const mask=smooth(r.chin+.015,r.chin+.04,p[1])*(1-smooth(r.eyeY+.07,r.eyeY+.12,p[1]));if(soft>0)for(let j=0;j<3;j++)n[j]+=(averaged[i/3][j]-n[j])*soft*mask;
   if(soft<0){const t=Math.floor(i/9)*9,a=m.positions.slice(t,t+3),b=m.positions.slice(t+3,t+6).map((v,j)=>v-a[j]),c=m.positions.slice(t+6,t+9).map((v,j)=>v-a[j]),flat=[b[1]*c[2]-b[2]*c[1],b[2]*c[0]-b[0]*c[2],b[0]*c[1]-b[1]*c[0]],l=Math.hypot(...flat)||1;for(let j=0;j<3;j++)n[j]+=(flat[j]/l-n[j])*(-soft)*mask;}
   normals.push(...deformNormal(field,...p,...n,'Face').map(v=>v*32767));}
  return {...m,positions,normals};
 });
 const hairMaterial=asset.materials.length;
 return {...asset,
  materials:[...asset.materials,{name:'StoneC_HAIR',color:[1,1,1,1],double:true,blend:0,texture:null},{name:'StoneCSide_HAIR',color:[1,1,1,1],double:true,blend:0,texture:null}],
  maps:[...asset.maps,null,null],
  meshes:meshes.map((m,i)=>m.name==='Face'?{...m,groups:splitStoneCHair(asset.meshes[i],hairMaterial).groups}:m)};
}
export function installStoneCMaterial(material,THREE,state,kind){
 material.flatShading=false;material.userData.stoneC=kind;material.userData.colorRole=null;
 if(kind==='body')return updateStoneCMaterial(material,THREE,state);
 const skinGain=new THREE.Vector3(1,1,1);material.userData.cSkinGain=skinGain;
 material.color.set('#ffffff');
 material.onBeforeCompile=shader=>{shader.uniforms.cSkinGain={value:skinGain};shader.fragmentShader='uniform vec3 cSkinGain;\n'+hunyuanSkinGLSL+shader.fragmentShader;
  let cleanup='';if(kind==='head'){
   const base=new THREE.Color('#d8946c');shader.uniforms.cOriginalSkin={value:new THREE.Vector3(base.r,base.g,base.b)};
   shader.vertexShader='attribute float cEyePaintCleanup; attribute vec3 cEyeRestPosition; varying float vCEyePaintCleanup; varying vec3 vCEyeRestPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCEyePaintCleanup=cEyePaintCleanup; vCEyeRestPosition=cEyeRestPosition;');
   shader.fragmentShader=`varying float vCEyePaintCleanup; varying vec3 vCEyeRestPosition; uniform vec3 cOriginalSkin;
float cLowerEyePaintLimit(float x){
 float y=1.5298;
 y+=clamp((x-.0178)/.0092,0.,1.)*(-.0004);
 y+=clamp((x-.027)/.009,0.,1.)*.0003;
 y+=clamp((x-.036)/.009,0.,1.)*.0024;
 y+=clamp((x-.045)/.0064,0.,1.)*.003;
 return y;
}\n`+shader.fragmentShader;
   cleanup='\n#ifdef USE_MAP\nfloat cUpperEyePaint= smoothstep(.015,.017,abs(vCEyeRestPosition.x))*(1.-smoothstep(.053,.055,abs(vCEyeRestPosition.x)))*smoothstep(1.530,1.532,vCEyeRestPosition.y)*(1.-smoothstep(1.539,1.540,vCEyeRestPosition.y))*(1.-smoothstep(.091-max(0.,abs(vCEyeRestPosition.x)-.036)*.8,.093-max(0.,abs(vCEyeRestPosition.x)-.036)*.8,vCEyeRestPosition.z))*(1.-smoothstep(.035,.12,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))));\nfloat cProtectBrow=1.-smoothstep(cLowerEyePaintLimit(abs(vCEyeRestPosition.x))-.00035,cLowerEyePaintLimit(abs(vCEyeRestPosition.x))+.00005,vCEyeRestPosition.y);\ndiffuseColor.rgb=mix(diffuseColor.rgb,cOriginalSkin,clamp(max(vCEyePaintCleanup*cProtectBrow,cUpperEyePaint),0.,1.));\n#endif\n';
  }
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>'+cleanup+'\ndiffuseColor.rgb=gradeHunyuanSkin(diffuseColor.rgb,cSkinGain);');};
 material.customProgramCacheKey=()=> 'stone-c-v106-'+kind;
 updateStoneCMaterial(material,THREE,state);
}
export function updateStoneCMaterial(material,THREE,state){
 if(!material.userData.stoneC)return;
 const clay=state.stoneView==='clay';material.userData.stoneClay=clay;
 if(clay){material.color.set('#c6c8ce');if(material.userData.cSkinGain)material.userData.cSkinGain.set(1,1,1);return;}
 if(material.userData.stoneC==='body'){material.color.set(state.skin);return;}
 material.color.set('#ffffff');const color=new THREE.Color(state.skin),base=new THREE.Color('#d8946c');material.userData.cSkinGain.set(color.r/base.r,color.g/base.g,color.b/base.b);
}
