import {faceGuides} from './face-guides.js?v=18';
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const bell=(x,c,r)=>Math.exp(-(((x-c)/r)**2));
const bounded=v=>Math.max(-2,Math.min(2,((Number.isFinite(v)?v:50)-50)/50));
const presets={female:{name:'绫 · 成女脸',eyeScale:1.02,jawMix:.38},male:{name:'隼 · 熟男脸',eyeScale:.90,jawMix:.42}};
function center(points){return [0,1,2].map(a=>(Math.min(...points.map(p=>p[a]))+Math.max(...points.map(p=>p[a])))*.5);}
export function buildAnimeFace(base,gender,reference=true){
 const source=base.meshes.find(m=>m.name==='Face'),guide=faceGuides[gender],preset=reference?presets[gender]:{name:'原版日漫',eyeScale:1,jawMix:0};
 const points=source.positions.map(v=>v/100000),regions=Array(points.length/3).fill('Face:skin');
 const find=name=>source.groups.filter(g=>base.materials[g.material].name.includes(name));
 const groupPoints=groups=>[...new Set(groups.flatMap(g=>g.indices))].map(id=>points.slice(id*3,id*3+3));
 const eyes=[-1,1].map(sign=>center(groupPoints(find('EyeIris')).filter(p=>Math.sign(p[0])===sign)));
 for(const g of source.groups){const name=base.materials[g.material].name;for(const id of g.indices){if(/EyeIris|EyeWhite|EyeHighlight|Eyeline|Eyelash|EyeExtra/.test(name))regions[id]='Face:eye'+(points[id*3]<0?'0':'1');else if(name.includes('FaceBrow'))regions[id]='Face:brow'+(points[id*3]<0?'0':'1');else if(name.includes('FaceMouth'))regions[id]='Face:mouth';}}
 const skin=groupPoints(find('_SKIN')),chin=Math.min(...skin.map(p=>p[1])),top=Math.max(...skin.map(p=>p[1])),mouth=center(groupPoints(find('FaceMouth'))),eyeY=(eyes[0][1]+eyes[1][1])/2;
 const nosePoints=skin.filter(p=>Math.abs(p[0]-base.landmarks.head[0])<.014&&Math.abs(p[1]-(eyeY-.037))<.025);const nose=center(nosePoints);
 const brows=[-1,1].map(sign=>center(groupPoints(find('FaceBrow')).filter(p=>Math.sign(p[0])===sign)));
 const rig={neckY:base.landmarks.neck[1],reference,brows,eyes,eyeY,chin,top,mouth,nose,headX:base.landmarks.head[0],headZ:base.landmarks.head[2],gender,preset,guide};
 // All new faces use the existing anime author's eyelids, iris and face topology.
 // The downloaded head contributes dimensionless jaw measurements only: no neck,
 // realistic scalp, eyeball or photographic texture enters the runtime mesh.
 const materials=base.materials.map(m=>({...m}));
 if(reference)for(const g of find('_SKIN'))materials[g.material]={...materials[g.material],name:'AnimeReferenceFace_'+gender+'_SKIN'};
 return {materials,maps:base.maps,meshes:[{...source,positions:[...source.positions],normals:[...source.normals],expressions:source.expressions,faceRegions:regions}],landmarks:{...base.landmarks,faceRig:rig},presetName:preset.name};
}
export function deformAnimeFace(x,y,z,state,rig,region='Face:skin'){
 const {eyeY,chin,headX,headZ,mouth,nose,preset,guide}=rig;
 const source=[x,y,z],front=smooth(headZ+.004,headZ+.042,z),t=(y-chin)/(eyeY-chin);
 // Sample the acquired jaw guide, then blend into the anime preset's envelope.
 if(t>0&&t<1.08){
  const u=Math.max(0,Math.min(4,(t-.18)/.1925)),i=Math.min(3,Math.floor(u));const ratio=guide.jawRatios[i]*(1-(u-i))+guide.jawRatios[i+1]*(u-i);
  const shape=(Math.max(.84,Math.min(1.36,ratio))-1)*preset.jawMix;
  const jawWeight=bell(y,chin+(eyeY-chin)*.42,.055)*front;
  x=headX+(x-headX)*(1+shape*jawWeight+bounded(state.jaw)*.24*jawWeight);
 }
 const eyeId=/^Face:(?:eye|brow)[01]$/.test(region)?Number(region.slice(-1)):null;
 const moveEye=(eye,i,weight)=>{
  const size=(preset.eyeScale-1)+bounded(state.eyeSize)*.36,dx=source[0]-eye[0],dy=source[1]-eye[1],sign=Math.sign(eye[0]-headX);
  const sx=1+size+bounded(state.eyeWidth)*.25,sy=1+size+bounded(state.eyeHeight)*.22;
  const angle=bounded(state.eyeTilt)*.18*sign,tx=dx*Math.max(.12,sx),ty=dy*Math.max(.12,sy);
  x+=(tx*Math.cos(angle)-ty*Math.sin(angle)-dx)*weight+sign*bounded(state.eyeSpace)*.012*weight;
  y+=(tx*Math.sin(angle)+ty*Math.cos(angle)-dy)*weight+bounded(state.eyeVertical)*.015*weight;
 };
 if(eyeId!==null)moveEye(rig.eyes[eyeId],eyeId,1);
 else for(let i=0;i<2;i++){const eye=rig.eyes[i];moveEye(eye,i,bell(source[0],eye[0],.042)*bell(source[1],eye[1],.041)*front);}
 for(let i=0;i<2;i++){
  const b=rig.brows[i],w=region==='Face:brow'+i?1:bell(source[0],b[0],.034)*bell(source[1],b[1],.019)*front;
  y+=(bounded(state.browHeight)*.013+(source[0]-b[0])*Math.sign(b[0]-headX)*bounded(state.browAngle)*.30)*w;
 }
 const nw=bell(source[0],headX,.021)*bell(source[1],nose[1],.028)*front;
 // Small anime nose; parameter changes affect both its width and projection.
 x+=(source[0]-headX)*(Math.max(.15,1+bounded(state.nose)*.38+bounded(state.noseWidth)*.35)-1)*nw;
 y+=bounded(state.noseHeight)*.013*nw;
 z+=((rig.reference?-.006:0)+bounded(state.nose)*.010+bounded(state.noseProjection)*.020)*nw;
 const mw=region==='Face:mouth'?1:bell(source[0],headX,.037)*bell(source[1],mouth[1],.021)*front;
 x+=(source[0]-mouth[0])*bounded(state.mouth)*.42*mw;
 y+=(bounded(state.mouthHeight)*.014+(source[1]-mouth[1])*bounded(state.mouthThickness)*.40+bounded(state.mouthCorner)*.010*Math.min(1,Math.abs(source[0]-mouth[0])/.022))*mw;
 // Lip relief stays on the authored anime facial plane, including the mouth opening.
 z+=((rig.reference?-.002:0)+bounded(state.mouthProjection)*.012)*mw;
 const cw=bell(source[0],headX,.045)*bell(source[1],chin+.012,.026)*front;
 y-=bounded(state.chinLength)*.014*cw;
 x+=(source[0]-headX)*bounded(state.chinWidth)*.30*cw;
 const cheekWeight=bell(source[1],eyeY-.046,.033)*front;
 x+=(source[0]-headX)*bounded(state.cheek)*.15*cheekWeight;
 y-=(eyeY-source[1])*bounded(state.faceHeight)*.18*smooth(eyeY+.014,eyeY-.09,source[1])*front;
 const fw=bell(source[1],eyeY+.077,.056)*front;
 z+=bounded(state.forehead)*.010*fw;
 if(source[1]<eyeY-.09)y=Math.max(rig.neckY+.022,y);
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
   for(let edge=0;edge<3;edge++){const a=triangle[edge],b=triangle[(edge+1)%3],dy=b[1]-a[1];if(Math.abs(dy)<1e-8)continue;const t=(y-a[1])/dy;if(t>=0&&t<=1)hits.push([a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t]);}
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
