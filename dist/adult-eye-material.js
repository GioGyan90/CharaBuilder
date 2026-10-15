// Small iris tonal map shared by both adult eyes. Geometry supplies the pupil and lid occlusion.
export function adultIrisTextureData(size=96){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1,r=Math.hypot(u,v),a=Math.atan2(v,u);
  const edge=Math.max(0,Math.min(1,(r-.73)/.25)),inner=Math.exp(-(((r-.43)/.19)**2));
  const fibre=(Math.sin(a*39+r*19)+.45*Math.sin(a*71-r*12))*.022;
  // A restrained limbal ring and warm inner iris; no painted pupil or fake specular highlight.
  const tone=Math.max(.30,Math.min(1,.80+.14*inner-.31*edge+fibre));
  const at=(y*size+x)*4,value=Math.round(tone*255);data[at]=data[at+1]=data[at+2]=value;data[at+3]=255;
 }
 return {width:size,height:size,data};
}

export function installAdultIrisMaterial(THREE,material){
 const spec=adultIrisTextureData(),texture=new THREE.DataTexture(spec.data,spec.width,spec.height,THREE.RGBAFormat);
 texture.colorSpace=THREE.NoColorSpace;texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.needsUpdate=true;
 material.map=texture;material.userData.adultIris={width:spec.width,height:spec.height,data:Array.from(spec.data),mode:'linear-luminance'};
 material.userData.ownedAdultIrisTexture=texture;material.needsUpdate=true;
}
