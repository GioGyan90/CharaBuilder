// Surface-attached anime stubble; multiplicative detail keeps skin HSL editable.
// Coordinates are from the edited face before skinning, so marks follow the rig.
export const stoneDetailGLSL=`
float stoneDetail(vec3 p,vec3 frame,float size,float frontZ,float eyeY){
 float x=abs(p.x-frame.x)/size;
 float bottom=smoothstep(frame.z-.004*size,frame.z+.013*size,p.y);
 float upper=frame.y+(.014-.10*x)*size;
 float beard=bottom*(1.0-smoothstep(upper-.006*size,upper+.007*size,p.y));
 beard*=1.0-smoothstep(.074,.100,x);
 beard*=smoothstep(frontZ+.016*size,frontZ+.045*size,p.z);
 vec2 cell=p.xy/size*vec2(610.0,700.0);
 vec2 id=floor(cell),f=fract(cell);
 float seed=fract(sin(dot(id,vec2(12.9898,78.233)))*43758.5453);
 float hair=(1.0-smoothstep(.10,.24,abs(f.x-(.25+seed*.50))))
           *(1.0-smoothstep(.22,.48,abs(f.y-(.25+fract(seed*7.1)*.50))))*step(.30,seed);
 vec2 q=vec2((p.x-frame.x)/size,(p.y-eyeY)/size);
 vec2 a=vec2(.030,.064),b=vec2(.051,.008),ab=b-a;
 float u=clamp(dot(q-a,ab)/dot(ab,ab),0.0,1.0);
 float distance=length(q-a-u*ab);
 float scar=(1.0-smoothstep(.0010,.0018,distance))*smoothstep(frontZ+.050*size,frontZ+.074*size,p.z);
 float core=1.0-smoothstep(.00025,.00065,distance);
 return (1.0-beard*(.06+.17*hair))*(1.0+scar*(-.18+.24*core));
}
`;
export function installStoneDetail(material,frame,size,frontZ,eyeY){
 const original=material.onBeforeCompile;
 material.userData.stoneFace={frame,size,frontZ,eyeY};
 material.onBeforeCompile=shader=>{
  original(shader);
  shader.uniforms.stoneFrame={value:frame};shader.uniforms.stoneSize={value:size};shader.uniforms.stoneFrontZ={value:frontZ};
  shader.uniforms.stoneEyeY={value:eyeY};
  shader.vertexShader='varying vec3 vStonePosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStonePosition=position;');
  shader.fragmentShader='varying vec3 vStonePosition;\nuniform vec3 stoneFrame;\nuniform float stoneSize;\nuniform float stoneFrontZ;\nuniform float stoneEyeY;\n'+stoneDetailGLSL+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=stoneDetail(vStonePosition,stoneFrame,stoneSize,stoneFrontZ,stoneEyeY);');
 };
 material.customProgramCacheKey=()=> 'stone-parametric-stubble-v32';
}
export const stoneTempleGLSL=`
float stoneTemple(vec3 p,vec3 head,float eyeY,float size){
 float side=smoothstep(.062,.082,abs(p.x-head.x)/size);
 float band=1.0-smoothstep(.016,.055,abs((p.y-eyeY)/size));
 return side*band*.72;
}
`;
export function installStoneTemples(material,head,eyeY,size){
 const original=material.onBeforeCompile;material.userData.stoneHair={head,eyeY,size};
 material.onBeforeCompile=shader=>{
  original(shader);shader.uniforms.stoneHead={value:head};shader.uniforms.stoneHairEye={value:eyeY};shader.uniforms.stoneHairSize={value:size};
  shader.vertexShader='varying vec3 vStoneHair;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStoneHair=position;');
  shader.fragmentShader='varying vec3 vStoneHair;\nuniform vec3 stoneHead;\nuniform float stoneHairEye;\nuniform float stoneHairSize;\n'+stoneTempleGLSL+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grey=max(.22,dot(diffuseColor.rgb,vec3(.299,.587,.114))*1.5);\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(grey),stoneTemple(vStoneHair,stoneHead,stoneHairEye,stoneHairSize));');
 };
 material.customProgramCacheKey=()=> 'stone-grey-temples-v32';
}
