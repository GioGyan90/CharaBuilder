// Stable IDs are persisted in character JSON. Every donor is an explicitly CC0 beta model.
export const hairPresets = {
  female:[['source','双马尾'],['trim','短款双马尾'],['bobPreset','齐耳短发'],['longPreset','直长发'],['wavePreset','侧卷马尾'],['bald','光头']],
  male:[['source','利落短发'],['trim','紧凑短发'],['layeredPreset','层次中短发'],['bald','光头']],
};
export const outfitPresets = {
  female:[['source','日常连衣裙'],['solid','素色连衣裙'],['uniformPreset','衬衫领结 · 短裙'],['classicPreset','古典洋装']],
  male:[['source','连帽上装 · 长裤'],['solid','素色上装 · 长裤'],['uniformPreset','衬衫领带 · 长裤']],
};
export const hairAsset = {bobPreset:'bob',longPreset:'long',wavePreset:'classic',layeredPreset:'uniform'};
export function outfitAsset(state) {return state.clothes==='uniformPreset' ? state.gender==='male'?'uniform':'long' : state.clothes==='classicPreset'?'classic':null;}

// Independent foundation reconstructed from the user-supplied ComfyUI GLB.
export const stonePreset={
 bodySource:'stone',stoneView:'skin',expression:'neutral',name:'Stone · 魁梧熟男',gender:'male',faceSource:'stone',
 height:50,weight:45,shoulders:45,legs:50,headSize:50,neckWidth:50,
 muscleMass:50,trapezius:50,latWidth:50,deltoid:50,
 torsoLength:50,shoulderSlope:50,shoulderDepth:50,backDepth:50,chest:50,chestDepth:50,
 waist:50,abdomen:50,hips:50,hipDepth:50,upperArm:50,forearm:50,handSize:50,thigh:50,calf:50,legSpace:50,ankle:50,footWidth:50,
 faceWidth:50,faceHeight:50,jawWidth:50,jawDepth:50,jawAngle:50,jawHeight:50,
 cheekboneWidth:50,cheekboneHeight:50,cheekboneDepth:50,cheek:50,
 chinWidth:50,chinLength:50,chinProjection:50,
 eyeSize:50,eyeWidth:50,eyeHeight:50,eyeVertical:50,eyeTilt:50,eyeSpace:50,
 browHeight:50,browAngle:50,browThickness:50,browRidge:50,
 nose:50,noseWidth:50,noseProjection:50,mouth:50,mouthThickness:50,mouthCorner:50,
 skin:'#c18e6c',eyeColor:'#718078',hairColor:'#373238',
 // Crown sections come from the same simplified reference surface.
 hair:'modular',frontHair:'none',backHair:'none',sideHair:'none',braid:'none',frontLength:50,backLength:50,sideLength:50,
 clothes:'underwear',shoes:'barefoot',shirt:'#373c49',pants:'#292c31',shoeColor:'#292c31',shirtEase:65
};
