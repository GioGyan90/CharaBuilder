import {faceGuides} from './face-guides.js?v=18';
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const bell=(x,c,r)=>Math.exp(-(((x-c)/r)**2));
const bounded=v=>Math.max(-2,Math.min(2,((Number.isFinite(v)?v:50)-50)/50));
const presets={female:{name:'绫 · 成女脸',eyeScale:1.02,jawMix:.38},male:{name:'隼 · 熟男脸',eyeScale:.90,jawMix:.42,eyeLift:.006,midStretch:.008},stone:{name:'Stone · 硬朗熟男脸',eyeScale:.96,eyeWidthScale:1.08,eyeHeightScale:.58,irisScale:.58,jawMix:.48,mature:true,eyeLift:.012,midStretch:.016}};
function center(points){return [0,1,2].map(a=>(Math.min(...points.map(p=>p[a]))+Math.max(...points.map(p=>p[a])))*.5);}
export function buildAnimeFace(base,gender,reference=true){
 const source=base.meshes.find(m=>m.name==='Face'),guide=faceGuides[gender],preset=reference==='stone'&&gender==='male'?presets.stone:reference?presets[gender]:{name:'原版日漫',eyeScale:1,jawMix:0};
 const points=source.positions.map(v=>v/100000),regions=Array(points.length/3).fill('Face:skin');
 const find=name=>source.groups.filter(g=>base.materials[g.material].name.includes(name));
 const groupPoints=groups=>[...new Set(groups.flatMap(g=>g.indices))].map(id=>points.slice(id*3,id*3+3));
 const eyes=[-1,1].map(sign=>center(groupPoints(find('EyeIris')).filter(p=>Math.sign(p[0])===sign)));
 for(const g of source.groups){const name=base.materials[g.material].name;for(const id of g.indices){if(/EyeIris|EyeHighlight/.test(name))regions[id]='Face:iris'+(points[id*3]<0?'0':'1');else if(/EyeWhite|Eyeline|Eyelash|EyeExtra/.test(name))regions[id]='Face:eye'+(points[id*3]<0?'0':'1');else if(name.includes('FaceBrow'))regions[id]='Face:brow'+(points[id*3]<0?'0':'1');else if(name.includes('FaceMouth'))regions[id]='Face:mouth';}}
 // Weld UV seam duplicates by position. Skin and white share a geometric
 // perimeter; protect it from skeletal edits and use one full eye transform.
 const whiteEdges=new Map();
 for(const g of find('EyeWhite'))for(let k=0;k<g.indices.length;k+=3){
  const ids=g.indices.slice(k,k+3).map(id=>source.positions.slice(id*3,id*3+3).join(','));
  for(let e=0;e<3;e++){const key=[ids[e],ids[(e+1)%3]].sort().join('|');whiteEdges.set(key,(whiteEdges.get(key)||0)+1);}
 }
 const perimeter=new Set([...whiteEdges].filter(([,n])=>n===1).flatMap(([edge])=>edge.split('|')));
 for(const g of find('_SKIN'))for(const id of g.indices)if(perimeter.has(source.positions.slice(id*3,id*3+3).join(',')))regions[id]='Face:socket'+(points[id*3]<0?'0':'1');
 const skin=groupPoints(find('_SKIN')),chin=Math.min(...skin.map(p=>p[1])),top=Math.max(...skin.map(p=>p[1])),mouth=center(groupPoints(find('FaceMouth'))),eyeY=(eyes[0][1]+eyes[1][1])/2;
 const nosePoints=skin.filter(p=>Math.abs(p[0]-base.landmarks.head[0])<.014&&Math.abs(p[1]-(eyeY-.037))<.025);const nose=center(nosePoints);
 const brows=[-1,1].map(sign=>center(groupPoints(find('FaceBrow')).filter(p=>Math.sign(p[0])===sign)));
 const rig={neckY:base.landmarks.neck[1],reference,brows,eyes,eyeY,chin,top,mouth,nose,headX:base.landmarks.head[0],headZ:base.landmarks.head[2],gender,preset,guide};
 // All new faces use the existing anime author's eyelids, iris and face topology.
 // The downloaded head contributes dimensionless jaw measurements only: no neck,
 // realistic scalp, eyeball or photographic texture enters the runtime mesh.
 const materials=base.materials.map(m=>({...m}));
 if(reference)for(const g of find('_SKIN'))materials[g.material]={...materials[g.material],name:'AnimeReferenceFace_'+gender+'_SKIN'};
 const face={...source,positions:[...source.positions],normals:[...source.normals],expressions:source.expressions,faceRegions:regions},earGroups=[];
 const maxX=Math.max(...skin.map(p=>Math.abs(p[0]-rig.headX)));
 face.groups=source.groups.map(g=>{if(!base.materials[g.material].name.includes('_SKIN'))return g;const kept=[],ears=[];for(let k=0;k<g.indices.length;k+=3){const ids=g.indices.slice(k,k+3),c=[0,1,2].map(axis=>ids.reduce((n,i)=>n+points[i*3+axis]/3,0));(Math.abs(c[0]-rig.headX)>maxX*.60&&c[1]>eyeY-.066&&c[1]<eyeY+.042&&c[2]<rig.headZ+.055?ears:kept).push(...ids);}if(ears.length)earGroups.push({...g,indices:ears});return {...g,indices:kept};});
 const meshes=[face];if(earGroups.length){const weights=base.rig.meshes.Face,ids=[...new Set(earGroups.flatMap(g=>g.indices))],index=new Map(ids.map((id,i)=>[id,i])),copy=(values,stride)=>ids.flatMap(id=>values.slice(id*stride,id*stride+stride));meshes.push({...face,name:'FaceEars',positions:copy(face.positions,3),normals:copy(face.normals,3),uv:copy(face.uv,2),faceRegions:ids.map(id=>regions[id]),expressions:Object.fromEntries(Object.entries(face.expressions).map(([name,values])=>[name,copy(values,3)])),groups:earGroups.map(g=>({...g,indices:g.indices.map(id=>index.get(id))})),skinIndices:copy(weights.indices,4),skinWeights:copy(weights.weights,4).map(v=>v/65535)});}
 return {materials,maps:base.maps,meshes,landmarks:{...base.landmarks,faceRig:rig},presetName:preset.name};
}
export function deformAnimeFace(x,y,z,state,rig,region='Face:skin'){
 const {eyeY,chin,headX,headZ,mouth,nose,preset,guide}=rig;
 const source=[x,y,z],front=smooth(headZ+.004,headZ+.042,z),t=(y-chin)/(eyeY-chin);
 // Sample the acquired jaw guide, then blend into the anime preset's envelope.
 if(t>0&&t<1.08){
  const u=Math.max(0,Math.min(4,(t-.18)/.1925)),i=Math.min(3,Math.floor(u));const ratio=guide.jawRatios[i]*(1-(u-i))+guide.jawRatios[i+1]*(u-i);
  const shape=(Math.max(.84,Math.min(1.36,ratio))-1)*preset.jawMix;
  const jawWeight=bell(y,chin+(eyeY-chin)*.42,.055)*front;
  x=headX+(x-headX)*(1+shape*jawWeight+bounded(state.jawWidth)*.24*jawWeight);
 }
 // Independent skeletal silhouette controls, evaluated in the unedited face frame.
 // MakeHuman separates cheek bones/volume/vertical position and chin prominence/
 // width/height/angularity. Adapt those regions to the authored anime topology.
 if(region==='Face:skin'){
  const height=eyeY-chin,side=smooth(.012,.045,Math.abs(source[0]-headX));
  const jawBand=bell(source[1],chin+height*.42,.038)*front*side;
  z+=bounded(state.jawDepth)*.016*jawBand;
  y+=bounded(state.jawHeight)*.003*jawBand;
  // Move the jaw corner outward/downward, tapering to zero at eyes and chin.
  x+=(source[0]-headX)*bounded(state.jawAngle)*.15*jawBand;
  y-=bounded(state.jawAngle)*.001*jawBand;
  const cheekBand=bell(source[1],eyeY-.030,.023)*front*side;
  x+=(source[0]-headX)*bounded(state.cheekboneWidth)*.18*cheekBand;
  y+=bounded(state.cheekboneHeight)*.003*cheekBand;
  z+=bounded(state.cheekboneDepth)*.022*cheekBand;
  const hard=bounded(state.cheekboneSharpness)+(preset.mature?.65:0),crest=bell(source[1],eyeY-.026,.018)*front*side,hollow=bell(source[1],eyeY-.063,.021)*front*side;
  x+=(source[0]-headX)*hard*(.13*crest-.09*hollow);
  z+=hard*(.007*crest-.005*hollow);
  const chinBand=bell(source[0],headX,.028)*bell(source[1],chin+.012,.022)*front;
  z+=bounded(state.chinProjection)*.038*chinBand;
 }
 const eyeId=/^Face:(?:eye|brow|socket)[01]$/.test(region)?Number(region.slice(-1)):null;
 const moveEye=(eye,i,weight)=>{
  const size=(preset.eyeScale-1)+bounded(state.eyeSize)*.36,dx=source[0]-eye[0],dy=source[1]-eye[1],sign=Math.sign(eye[0]-headX);
  const sx=(1+size)*(preset.eyeWidthScale||1)+bounded(state.eyeWidth)*.25,sy=(1+size)*(preset.eyeHeightScale||1)+bounded(state.eyeHeight)*.22;
  const angle=bounded(state.eyeTilt)*.18*sign,tx=dx*Math.max(.12,sx),ty=dy*Math.max(.12,sy);
  x+=(tx*Math.cos(angle)-ty*Math.sin(angle)-dx)*weight+sign*bounded(state.eyeSpace)*.012*weight;
  y+=(tx*Math.sin(angle)+ty*Math.cos(angle)-dy)*weight+(bounded(state.eyeVertical)*.028+(preset.eyeLift||0))*weight;
  z+=bounded(state.eyeDepth)*.016*weight;
 };
 if(eyeId!==null)moveEye(rig.eyes[eyeId],eyeId,1);
 else if(preset.mature&&region==='Face:skin'){const i=source[0]<headX?0:1,eye=rig.eyes[i],w=(1-smooth(.030,.055,Math.abs(source[0]-eye[0])))*(1-smooth(.022,.040,Math.abs(source[1]-eye[1])))*front;moveEye(eye,i,w);}
 else for(let i=0;i<2;i++){const eye=rig.eyes[i];moveEye(eye,i,bell(source[0],eye[0],.042)*bell(source[1],eye[1],.041)*front);}
 for(let i=0;i<2;i++){
  const b=rig.brows[i],ridgeY=b[1]+bounded(state.browRidgeHeight)*.012,w=region==='Face:brow'+i?1:bell(source[0],b[0],.034)*bell(source[1],b[1],.019)*front;
  if(region==='Face:brow'+i)y+=(source[1]-b[1])*(Math.max(.2,1+bounded(state.browThickness)*.55)-1);
  if(region==='Face:skin'){
   const ridge=bell(source[0],b[0],.038)*bell(source[1],ridgeY-.010,.023)*front;
   z+=bounded(state.browRidge)*.009*ridge;
   y+=bounded(state.browRidgeHeight)*.008*ridge;
   if(preset.mature)z+=.010*(ridge-bell(source[0],b[0],.038)*bell(source[1],b[1]-.010,.023)*front);
  }else if(region==='Face:brow'+i){z+=bounded(state.browRidge)*.009;y+=bounded(state.browRidgeHeight)*.012;}
  y+=(bounded(state.browHeight)*.013+(source[0]-b[0])*Math.sign(b[0]-headX)*bounded(state.browAngle)*.30)*w;
 }
 const nw=bell(source[0],headX,.021)*bell(source[1],nose[1],.028)*front;
 // Small anime nose; parameter changes affect both its width and projection.
 x+=(source[0]-headX)*(Math.max(.15,1+bounded(state.nose)*.38+bounded(state.noseWidth)*.35)-1)*nw;
 y+=(bounded(state.noseHeight)*.020-bounded(state.noseLength)*.018)*nw;
 z+=((rig.reference?-.006:0)+bounded(state.nose)*.010+bounded(state.noseProjection)*.020)*nw;
 if(region==='Face:skin'){
  const root=bell(source[0],headX,.014)*bell(source[1],eyeY+.004,.020)*front;
  const bridge=bell(source[0],headX,.014)*bell(source[1],eyeY-.022,.027)*front;
  const tip=bell(source[0],headX,.015)*bell(source[1],nose[1]-.008,.016)*front;
  z+=bounded(state.noseRootDepth)*.012*root+bounded(state.noseTipProjection)*.014*tip;
  x+=(source[0]-headX)*bounded(state.noseBridgeWidth)*.55*bridge;
  y+=bounded(state.noseTipAngle)*.009*tip;
 }
 const mw=region==='Face:mouth'?1:bell(source[0],headX,.037)*bell(source[1],mouth[1],.021)*front;
 x+=(source[0]-mouth[0])*bounded(state.mouth)*.42*mw;
 y+=(bounded(state.mouthHeight)*.014+(source[1]-mouth[1])*bounded(state.mouthThickness)*.40+bounded(state.mouthCorner)*.010*Math.min(1,Math.abs(source[0]-mouth[0])/.022))*mw;

 // Lip relief stays on the authored anime facial plane, including the mouth opening.
 z+=((rig.reference?-.002:0)+bounded(state.mouthProjection)*.012)*mw;
 const cw=bell(source[0],headX,.045)*bell(source[1],chin+.012,.026)*front*(1-smooth(mouth[1]-.020,mouth[1]-.004,source[1]));
 y-=bounded(state.chinLength)*.027*cw;
 x+=(source[0]-headX)*(bounded(state.chinWidth)*.50+bounded(state.chinSize)*.25)*cw;
 y-=bounded(state.chinSize)*.016*cw;
 if(region==='Face:skin')z+=bounded(state.chinSize)*.010*cw;
 const cheekWeight=bell(source[1],eyeY-.046,.033)*front;
 x+=(source[0]-headX)*bounded(state.cheek)*.15*cheekWeight;
 y-=(eyeY-source[1])*bounded(state.faceHeight)*.18*smooth(eyeY+.014,eyeY-.09,source[1])*front;
 const fw=bell(source[1],eyeY+.077,.056)*front;
 z+=bounded(state.forehead)*.010*fw;
 if(preset.mature){
  // Separate mature foundation: keep a real nasal bridge and orbital brow ridge,
  // instead of flattening these planes into the youthful reference face.
  const bridge=bell(source[0],headX,.014)*bell(source[1],eyeY-.013,.041)*front;
  const glabella=bell(source[0],headX,.019)*bell(source[1],eyeY+.020,.027)*front;
  const ridge=rig.brows.reduce((sum,b)=>sum+bell(source[0],b[0],.038)*bell(source[1],b[1]-.010,.025),0)*front;
  if(region==='Face:skin'){
   z+=.003*nw+.012*bridge+.009*glabella+.012*ridge;
   const chinFront=bell(source[0],headX,.035)*bell(source[1],chin+.015,.028)*front;
   z+=.012*chinFront;
   x+=(source[0]-headX)*.08*bell(source[1],chin+.032,.028)*front;
   y-=.002*ridge;
   const lower=(1-smooth(chin,eyeY,source[1]))*front;
   y-=.010*lower;
   const shelf=(1-smooth(chin+.002,chin+.028,source[1]))*front;
   y+=.005*shelf*(1-smooth(.021,.055,Math.abs(source[0]-headX)));
  }
  if(region.startsWith('Face:brow')){
   const b=rig.brows[Number(region.slice(-1))];
   y+=(source[1]-b[1])*.85-.004;
   z+=.012;
  }
 }
 if(preset.adult){
  // Independent adult foundation, measured from DEGUIDER's authored jaw guide.
  // Increase the lower facial height without moving eyes, scalp or neck geometry.
  const h=eyeY-chin,lower=1-smooth(chin,eyeY,source[1]);
  y-=.024*lower*front;
  // A broad chin shelf replaces the adolescent central point. The continuous
  // lift is strongest at the lowest front vertices, not at the jaw corners.
  const shelf=(1-smooth(chin+.002,chin+.028,source[1]))*front;
  y+=.011*shelf*(1-smooth(.021,.055,Math.abs(source[0]-headX)));
  const lowerJaw=bell(source[1],chin+h*.30,.036)*front;
  x=headX+(x-headX)*(1+.06*lowerJaw);
  // Retain the source's nose bridge and lip plane instead of suppressing them
  // with the youthful reference template's flattened relief.
  z+=.006*nw+.002*mw;
  if(region.startsWith('Face:brow')){
   const b=rig.brows[Number(region.slice(-1))];
   y+=(source[1]-b[1])*.15;
  }
 }
 // Continuous feature distribution moves nose, lips and jaw together; neck
 // graft blending is applied later. Socket and white share this exact mapping.
 const middle=1-smooth(mouth[1]-.010,eyeY-.008,source[1]);
 y-=(preset.midStretch||0)*middle*front;
 // Length edits grow away from the protected chin/neck instead of translating
 // the entire jaw down into the neck seam at large positive values.
 const upper=smooth(mouth[1]+.004,eyeY+.006,source[1])*(1-smooth(eyeY+.030,eyeY+.100,source[1]));
 const lowerBand=smooth(chin-.010,mouth[1]+.014,source[1])*(1-smooth(mouth[1]+.014,eyeY+.010,source[1]));
 const midDelta=bounded(state.midFaceLength)*.022,lowDelta=bounded(state.lowerFaceLength)*.016;
 const slope=Math.abs(midDelta)*Math.max(1.5/(eyeY-mouth[1]+.002),1.5/.070)+Math.abs(lowDelta)*Math.max(1.5/(mouth[1]-chin+.024),1.5/(eyeY-mouth[1]-.004));
 const stretchScale=Math.min(1,.82/Math.max(.0001,slope));
 y+=(midDelta*upper+lowDelta*lowerBand)*stretchScale*front;
 if(preset.mature){const lipBand=region==='Face:mouth'?1:(1-smooth(.026,.055,Math.abs(source[0]-headX)))*(1-smooth(.011,.045,Math.abs(source[1]-mouth[1])))*front;y+=.022*lipBand;}
 // Pin only the collar: pinning the entire chin silently saturated chin length.
 if(!rig.rebuilt&&source[1]<Math.min(eyeY-.09,rig.neckY+.026))y=Math.max(rig.neckY+.022,y);
 return [x,y,z];
}
// Keep hair outside the actual edited head rather than the imported donor skull.
// Polar samples retain the forehead/scalp silhouette; sparse bins use nearest samples.
export function headEnvelope(points,indices,centerX,centerZ,chin){
 const bins=new Map(),step=.006,sectors=96;
 const put=(band,sector,r)=>{const key=band+','+sector;bins.set(key,Math.max(bins.get(key)||0,r));};
 // Horizontal slices intersect the actual edited triangles. Vertex-only sampling
 // misses wide polygons and is insufficient when the user shrinks hair volume.
 for(let i=0;i<indices.length;i+=3){
  const triangle=indices.slice(i,i+3).map(id=>[points[id*3]-centerX,points[id*3+1],points[id*3+2]-centerZ]);
  const low=Math.max(chin-.005,Math.min(...triangle.map(p=>p[1]))),high=Math.max(...triangle.map(p=>p[1]));
  for(let band=Math.ceil(low/step);band<=Math.floor(high/step);band++){
   const y=band*step,hits=[];
   for(let edge=0;edge<3;edge++){const a=triangle[edge],b=triangle[(edge+1)%3],dy=b[1]-a[1];if(Math.abs(dy)<1e-8)continue;const t=(y-a[1])/dy;if(t>=0&&t<=1){const hit=[a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t];if(!hits.some(h=>Math.hypot(h[0]-hit[0],h[1]-hit[1])<1e-10))hits.push(hit);}}
   if(hits.length<2)continue;const a=hits[0],e=[hits[1][0]-a[0],hits[1][1]-a[1]];
   for(let sector=0;sector<sectors;sector++){const angle=sector/sectors*2*Math.PI-Math.PI,dx=Math.cos(angle),dz=Math.sin(angle),den=dx*e[1]-dz*e[0];if(Math.abs(den)<1e-9)continue;
    const r=(a[0]*e[1]-a[1]*e[0])/den,t=(a[0]*dz-a[1]*dx)/den;if(r>0&&t>=0&&t<=1)put(band,sector,r);
   }
  }
 }
 return {bins,step,sectors,centerX,centerZ,chin};
}
export function clearHair(points,envelope,part){
 if(part==='HairBraid')return;
 const {bins,step,sectors,centerX,centerZ,chin}=envelope;
 for(let i=0;i<points.length;i+=3){const x=points[i]-centerX,y=points[i+1],z=points[i+2]-centerZ;if(y<chin-.004)continue;const r=Math.hypot(x,z);if(r<1e-6)continue;
  const sector=(Math.round((Math.atan2(z,x)+Math.PI)/(2*Math.PI)*sectors)+sectors)%sectors,band=Math.round(y/step);let radius=0;
  for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++)radius=Math.max(radius,bins.get((band+b)+','+((sector+a+sectors)%sectors))||0);
  const target=radius+.0018;if(radius&&r<target){points[i]=centerX+x/r*target;points[i+2]=centerZ+z/r*target;}
 }
}
