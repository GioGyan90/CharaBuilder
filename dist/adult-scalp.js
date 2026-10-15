// Adult Stone close-cropped side/back hair. This is a color layer on existing skin,
// not an offset hair shell. All coordinates are the grafted donor's rest-space metres.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const finite=(v,f)=>Number.isFinite(+v)?+v:f;
const SIZE=[512,256],PI=Math.PI;
export function adultScalpEnabled(state={}){
 return state.characterType==='man'&&state.gender==='male'&&state.foundationRevision===1&&state.faceSource==='imported00003'&&(state.sideHair==='imported00003'||state.backHair==='imported00003');
}
function scalpState(state){return {characterType:state.characterType,gender:state.gender,foundationRevision:state.foundationRevision,faceSource:state.faceSource,sideHair:state.sideHair,backHair:state.backHair,sideLength:clamp(finite(state.sideLength,50),0,100),backLength:clamp(finite(state.backLength,50),0,100),hairlineHeight:clamp(finite(state.hairlineHeight,50),0,100),sideHairColor:state.sideHairColor||'#929590',stoneView:state.stoneView,faceStructureView:state.faceStructureView};}
export function adultScalpUV(point,rig){
 const [x,y,z]=point,a=Math.atan2(x-rig.headX,z-rig.headZ),bottom=rig.eyeY-.075;
 return [a/(2*PI)+.5,clamp((y-bottom)/(rig.top-bottom))];
}
export function adultScalpCoverage(point,rig,state={}){
 if(!adultScalpEnabled(state)||state.stoneView==='clay'||['wire','regions'].includes(state.faceStructureView))return 0;
 const [x,y,z]=point,a=Math.abs(Math.atan2(x-rig.headX,z-rig.headZ)),back=smooth(1.95,2.22,a);
 const select=(state.sideHair==='imported00003'?1-back:0)+(state.backHair==='imported00003'?back:0);
 const length=((clamp(finite(state.sideLength,50),0,100)-50)*(1-back)+(clamp(finite(state.backLength,50),0,100)-50)*back)/50;
 const earLift=.054*Math.exp(-(((a-1.50)/.34)**2)),nape=clamp((a-1.90)/(PI-1.90));
 const bottom=rig.eyeY-.027+earLift-.025*nape-length*.012*(1-Math.exp(-(((a-1.46)/.55)**2)));
 const upper=rig.top-.022,down=clamp((upper-y)/Math.max(.015,upper-bottom)),front=.80+.26*down**1.3;
 // The raised lower edge clears the whole pinna; the temple boundary leans back
 // toward the sideburn rather than painting a straight vertical stripe on the cheek.
 const hairline=(clamp(finite(state.hairlineHeight,50),0,100)-50)*.00045*Math.max(0,Math.cos(a))*clamp((rig.top+.025-y)/.065);
 const lower=smooth(bottom-.00045+hairline,bottom+.00045+hairline,y),top=1-smooth(upper-.001,upper+.001,y);
 // The actual pinna fits this small Y/Z ellipse. A curved ear margin avoids
 // the rectangular bare-skin patch produced by independent axis slab limits.
 const earY=(y-(rig.eyeY-.009))/.0335,earZ=(z-(rig.headZ+.014))/.0285;
 const ear=smooth(.078,.081,Math.abs(x-rig.headX))*(1-smooth(1,1.05,Math.hypot(earY,earZ)));
 return clamp(select*smooth(front-.008,front+.008,a)*lower*top*(1-ear));
}
function hash(x,y){let n=Math.imul(x+17,374761393)^Math.imul(y+29,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
let textureData;
export function adultScalpTextureData(){
 if(textureData)return textureData;
 const [width,height]=SIZE,data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=(x+.5)/width,v=(y+.5)/height,a=Math.abs((u-.5)*2*PI),down=1-v;
  // Broad diagonal panels are deliberately much larger than the triangle facets.
  // A restrained salt/pepper grain varies the panels without generating hair cards.
  const sideEnd=1.87+.20*down,backCenter=2.82-.22*down;
  let tone=v>.77?.20:a<1.23+.12*down?.33:a<sideEnd?.92:a<backCenter?.38:.84;
  const noise=hash(x,y),pepper=noise<.05?-.055:noise>.96?.045:0;
  tone=clamp(tone+pepper+(hash(x>>1,y>>1)-.5)*.012);
  const i=(y*width+x)*4,value=Math.round(tone*255);data[i]=value;data[i+1]=value;data[i+2]=value;data[i+3]=255;
 }
 textureData={width,height,data};return textureData;
}
const linear=c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
function colorComponents(value){const m=typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:'#929590';return [1,3,5].map(i=>linear(parseInt(m.slice(i,i+2),16)/255));}
function shadeColor(base,tone){const light=smooth(.48,.90,tone),dark=clamp((.48-tone)/.48);return base.map(v=>Math.max(0,(v*(1-.90*dark))*(1-light*.68)+.78*light*.68));}
export function sampleAdultScalp(point,rig,state={}){
 const uv=adultScalpUV(point,rig),texture=adultScalpTextureData(),x=Math.min(texture.width-1,Math.floor(clamp(uv[0])*texture.width)),y=Math.min(texture.height-1,Math.floor(clamp(uv[1])*texture.height)),tone=texture.data[(y*texture.width+x)*4]/255;
 return {coverage:adultScalpCoverage(point,rig,state),color:shadeColor(colorComponents(state.sideHairColor),tone),uv,tone};
}
export function adultScalpAttributes(source){return Float32Array.from(source.positions,v=>v/1e5);}

// THREE is injected by the caller so the geometry sampler remains usable in Node.
// Geometry needs a vec3 `adultScalpPosition` attribute from adultScalpAttributes().
// Install after other hooks; this chains their shader and program-cache ownership.
export function installAdultScalp(material,THREE,rig,state={}){
 if(!adultScalpEnabled(state)||state.stoneView==='clay'||['wire','regions'].includes(state.faceStructureView))return false;
 if(material.userData.adultScalp){updateAdultScalp(material,state,THREE);return true;}
 const spec=adultScalpTextureData(),texture=new THREE.DataTexture(spec.data.slice(),spec.width,spec.height,THREE.RGBAFormat);
 texture.minFilter=THREE.NearestFilter;texture.magFilter=THREE.NearestFilter;texture.wrapS=THREE.ClampToEdgeWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;texture.generateMipmaps=false;texture.flipY=false;texture.colorSpace=THREE.NoColorSpace;texture.needsUpdate=true;
 const previous=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material),uniforms={adultScalpTexture:{value:texture},adultScalpRig:{value:new THREE.Vector4(rig.headX,rig.headZ,rig.eyeY,rig.top)},adultScalpControls:{value:new THREE.Vector4()},adultScalpHairline:{value:0},adultScalpColor:{value:new THREE.Color()}};
 material.userData.adultScalp={version:92,rig:{headX:rig.headX,headZ:rig.headZ,eyeY:rig.eyeY,top:rig.top},state:scalpState(state),textureSpec:{width:spec.width,height:spec.height,filter:'nearest',pattern:'broad-panels-salt-pepper'},geometryTrianglesAdded:0};
 material.userData.adultScalpUniforms=uniforms;material.userData.adultScalpTexture=texture;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='attribute vec3 adultScalpPosition;\nvarying vec3 vAdultScalpPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAdultScalpPosition=adultScalpPosition;');
  shader.fragmentShader=GLSL+'\n'+shader.fragmentShader;
  // Inject before ordinary diffuse lighting, after any existing face color layers.
  const hook=shader.fragmentShader.includes('#include <alphamap_fragment>')?'#include <alphamap_fragment>':'#include <map_fragment>';
  shader.fragmentShader=shader.fragmentShader.replace(hook,hook+'\nfloat adultHairMask=adultScalpMask(vAdultScalpPosition);\nif(adultHairMask>0.0){vec2 scalpUV=vec2(atan(vAdultScalpPosition.x-adultScalpRig.x,vAdultScalpPosition.z-adultScalpRig.y)/6.28318530718+.5,clamp((vAdultScalpPosition.y-(adultScalpRig.z-.075))/(adultScalpRig.w-(adultScalpRig.z-.075)),0.0,1.0));float scalpTone=texture2D(adultScalpTexture,scalpUV).r;float scalpLight=smoothstep(.48,.90,scalpTone),scalpDark=clamp((.48-scalpTone)/.48,0.0,1.0);vec3 scalpColor=mix(adultScalpColor*(1.0-.90*scalpDark),vec3(.78),scalpLight*.68);diffuseColor.rgb=mix(diffuseColor.rgb,scalpColor,adultHairMask);}');
 };
 material.customProgramCacheKey=()=>cache()+'|stone-adult-scalp-v92';material.needsUpdate=true;updateAdultScalp(material,state,THREE);return true;
}
export function updateAdultScalp(material,state={},THREE){
 const meta=material?.userData?.adultScalp,u=material?.userData?.adultScalpUniforms;if(!meta||!u)return;
 const s=scalpState({...meta.state,...state});meta.state=s;
 u.adultScalpControls.value.set(s.sideHair==='imported00003'?1:0,s.backHair==='imported00003'?1:0,(s.sideLength-50)/50,(s.backLength-50)/50);
 if(s.stoneView==='clay'||['wire','regions'].includes(s.faceStructureView))u.adultScalpControls.value.setX(0).setY(0);
 u.adultScalpHairline.value=(s.hairlineHeight-50)*.00045;u.adultScalpColor.value.set(s.sideHairColor);
}
const GLSL=`varying vec3 vAdultScalpPosition;
uniform sampler2D adultScalpTexture;
uniform vec4 adultScalpRig;
uniform vec4 adultScalpControls;
uniform float adultScalpHairline;
uniform vec3 adultScalpColor;
float adultScalpMask(vec3 p){
 float a=abs(atan(p.x-adultScalpRig.x,p.z-adultScalpRig.y)),back=smoothstep(1.95,2.22,a);
 float select=adultScalpControls.x*(1.0-back)+adultScalpControls.y*back;
 float len=mix(adultScalpControls.z,adultScalpControls.w,back),ear=(a-1.50)/.34,nape=clamp((a-1.90)/(3.14159265359-1.90),0.0,1.0),cut=(a-1.46)/.55;
 float bottom=adultScalpRig.z-.027+.054*exp(-ear*ear)-.025*nape-len*.012*(1.0-exp(-cut*cut));
 float upper=adultScalpRig.w-.022,down=clamp((upper-p.y)/max(.015,upper-bottom),0.0,1.0),front=.80+.26*pow(down,1.3);
 float lift=adultScalpHairline*max(0.0,cos(a))*clamp((adultScalpRig.w+.025-p.y)/.065,0.0,1.0);
 vec2 earYZ=vec2((p.y-(adultScalpRig.z-.009))/.0335,(p.z-(adultScalpRig.y+.014))/.0285);
 float pinna=smoothstep(.078,.081,abs(p.x-adultScalpRig.x))*(1.0-smoothstep(1.0,1.05,length(earYZ)));
 return clamp(select*smoothstep(front-.008,front+.008,a)*smoothstep(bottom-.00045+lift,bottom+.00045+lift,p.y)*(1.0-smoothstep(upper-.001,upper+.001,p.y))*(1.0-pinna),0.0,1.0);
}`;
