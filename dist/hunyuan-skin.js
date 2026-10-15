/** Skin-only color grading in linear light; geometry and source maps stay immutable. */
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function hunyuanSkinCoverage(c){return smooth(.08,.22,Math.max(...c))*smooth(.01,.07,c[0]-c[1])*smooth(.005,.035,c[1]-c[2]);}
export function gradeHunyuanSkin(color,gain=[1,1,1]){const w=hunyuanSkinCoverage(color);return color.map((v,k)=>v*(1+(gain[k]-1)*w));}
export const hunyuanSkinGLSL=`
float hunyuanSkinCoverage(vec3 c){return smoothstep(.08,.22,max(c.r,max(c.g,c.b)))*smoothstep(.01,.07,c.r-c.g)*smoothstep(.005,.035,c.g-c.b);}
vec3 gradeHunyuanSkin(vec3 c,vec3 gain){return c*mix(vec3(1.),gain,hunyuanSkinCoverage(c));}
`;
