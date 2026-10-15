// Stone adult head calibration. Positions are donor-space metres unless packed in a mesh.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const bell=(v,c,r)=>Math.exp(-(((v-c)/r)**2));
const gain=(state,key)=>clamp(Number.isFinite(+state[key])?+state[key]:50,0,100)/50;
const adult=state=>state.characterType==='man'&&state.foundationRevision===1;

// Reused by the hair shell: only the upper cranial vault grows, not the facial triangle.
export function adultCraniumPoint(point,r,state={}){
 if(!adult(state))return [...point];
 const [x,y,z]=point,front=smooth(r.headZ+.035,r.headZ+.065,z)*(1-smooth(.025,.045,Math.abs(x-r.headX)));
 const upper=smooth(r.eyeY+.010+.010*front,r.eyeY+.040,y);
 const rear=1-smooth(r.headZ+.005,r.headZ+.055,z);
 return [r.headX+(x-r.headX)*(1+.05*gain(state,'craniumWidth')*upper),y,
  z+(z-r.headZ)*.03*gain(state,'craniumDepth')*upper*rear];
}

// Skin-only masks. A zero weight pins the nose, lips, jaw rim, eyebrow crest and ears.
function planeMask(p,r){
 const [x,y,z]=p,ax=Math.abs(x-r.headX),front=smooth(r.headZ+.050,r.headZ+.083,z);
 const frontal=smooth(r.eyeY+.019,r.eyeY+.035,y)*(1-smooth(r.top-.045,r.top-.015,y))*(1-smooth(.045,.067,ax));
 const underEye=smooth(r.eyeY-.045,r.eyeY-.033,y)*(1-smooth(r.eyeY-.021,r.eyeY-.013,y))*smooth(.016,.024,ax)*(1-smooth(.044,.060,ax));
 const cheek=smooth(r.mouth[1]-.002,r.mouth[1]+.012,y)*(1-smooth(r.eyeY-.043,r.eyeY-.029,y))*smooth(.019,.030,ax)*(1-smooth(.049,.061,ax));
 const jawGuard=smooth(r.chin+.027,r.chin+.047,y),lipGuard=1-bell(y,r.mouth[1],.012)*(1-smooth(.022,.038,ax));
 return Math.max(frontal,underEye,cheek)*front*jawGuard*lipGuard;
}

// Stone's lower face is a mandibular block, rather than a narrow juvenile V.
// Anterior cheek support joins the zygoma to the oral block. Collar, eyes, ears and Y anchors stay fixed.
export function adultStoneContourPoint(point,r,state={}){
 if(!adult(state))return [...point];
 const [x,y,z]=point,dx=x-r.headX,ax=Math.abs(dx),amount=gain(state,'facePlaneSoftness');
 const front=smooth(r.headZ+.045,r.headZ+.085,z),aboveNeck=smooth(r.chin+.003,r.chin+.009,y);
 const chin=bell(y,r.chin+.016,.018)*(1-smooth(.033,.053,ax))*front*aboveNeck;
 const jaw=bell(y,r.chin+.035,.025)*smooth(.022,.039,ax)*(1-smooth(.064,.078,ax))*front*aboveNeck;
 const oral=bell(y,r.mouth[1]+.006,.020)*(1-smooth(.022,.043,ax))*front;
 const nasal=bell(y,r.nose[1]+.001,.010)*(1-smooth(.007,.018,ax))*smooth(r.headZ+.110,r.headZ+.130,z);
 // Fill the broad maxillary/cheek plane, not the bony crest or lip/philtrum centre.
 // Exact orbital and jaw-rim guards keep eye clearance and the adult silhouette.
 const cheek=bell(y,r.nose[1]-.009,.030)*smooth(.012,.026,ax)*(1-smooth(.052,.069,ax))
  *smooth(r.chin+.030,r.chin+.054,y)*(1-smooth(r.eyeY-.029,r.eyeY-.012,y))
  *smooth(r.headZ+.028,r.headZ+.068,z)
  *(1-.80*bell(y,r.eyeY-.025,.009)*bell(ax,.055,.010));
 const lateral=Math.tanh(dx/.007);
 return [x+amount*lateral*(.0026*chin+.0022*jaw+.0007*oral+.0010*cheek),y,
  z+amount*(.0018*oral+.0023*cheek+.0012*chin*smooth(.006,.014,ax)-.0005*chin*(1-smooth(.004,.012,ax))-.0024*nasal)];
}

export function prepareAdultHead(donor,state={}){
 if(donor.reference?.baseFamily!=='adultMale'||!adult(state)||donor.adultHeadPrepared)return donor;
 const width=gain(state,'craniumWidth'),depth=gain(state,'craniumDepth'),softness=gain(state,'facePlaneSoftness');
 if(!width&&!depth&&!softness)return donor;
 const original=donor.meshes.find(m=>m.name==='Face'),r=donor.landmarks.faceRig;
 if(!original||!r)return donor;
 const mesh={...original,positions:[...original.positions]},points=Array.from({length:original.positions.length/3},(_,id)=>original.positions.slice(id*3,id*3+3).map(v=>v/1e5));
 const neighbours=points.map(()=>new Set());
 for(const g of original.groups)for(let k=0;k<g.indices.length;k+=3){const ids=g.indices.slice(k,k+3);for(let j=0;j<3;j++){neighbours[ids[j]].add(ids[(j+1)%3]);neighbours[ids[j]].add(ids[(j+2)%3]);}}
 let moved=0,maxFairing=0;
 for(let id=0;id<points.length;id++){
  const p=points[id],q=adultCraniumPoint(p,r,state),contour=adultStoneContourPoint(p,r,state),mask=planeMask(p,r);
  q[0]+=contour[0]-p[0];q[2]+=contour[2]-p[2];
  if(mask&&softness){
   // A small, single, bilateral one-ring Z relaxation removes scan ripples without shrinkage in X/Y.
   let sum=0,total=0;
   for(const j of neighbours[id]){const n=points[j],d=Math.hypot(n[0]-p[0],n[1]-p[1],n[2]-p[2]);
    const w=Math.exp(-((d/.023)**2))*Math.exp(-(((n[2]-p[2])/.016)**2));sum+=w*n[2];total+=w;}
   const fair=total?clamp((sum/total-p[2])*.34,-.0015,.0015)*mask*softness:0;
   const ax=Math.abs(p[0]-r.headX),support=.0007*softness*bell(p[1],r.mouth[1]+.020,.015)*bell(ax,.027,.015)*smooth(r.headZ+.070,r.headZ+.095,p[2])*smooth(.014,.020,ax);
   q[2]+=fair+support;maxFairing=Math.max(maxFairing,Math.abs(fair+support));
  }
  const packed=q.map(v=>Math.round(v*1e5));
  if(packed.some((v,k)=>v!==original.positions[id*3+k])){mesh.positions.splice(id*3,3,...packed);moved++;}
 }
 const calibration={version:93,movedVertices:moved,maxFairing,craniumWidth:width*50,craniumDepth:depth*50,facePlaneSoftness:softness*50,contour:'mandibular-maxillary-and-oral-support'};
 mesh.adultHeadPrepared=calibration;
 return {...donor,meshes:donor.meshes.map(m=>m===original?mesh:m),adultHeadPrepared:calibration};
}

// Final edited-space normals with donor-space masks. The same shared collar remains untouched.
export function adultHeadNormals(positions,source,materials,landmarks,state={},currentNormals){
 if(!adult(state)||source.name!=='Face'||!source.adultHeadPrepared||!landmarks.faceRig)return null;
 const gainSoft=gain(state,'facePlaneSoftness'),r=landmarks.faceRig,groups=source.groups.filter(g=>materials[g.material]?.name==='Imported00003_Face_SKIN');
 if(!gainSoft||!groups.length)return null;
 const normals=new Float32Array(currentNormals||positions.length),sums=new Float32Array(positions.length),smoothWeights=new Float32Array(positions.length/3),used=new Set(groups.flatMap(g=>g.indices));
 for(const g of groups)for(let k=0;k<g.indices.length;k+=3){const ids=g.indices.slice(k,k+3),a=ids[0]*3,b=ids[1]*3,c=ids[2]*3;
  const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2],vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2];
  const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  for(const id of ids){sums[id*3]+=nx;sums[id*3+1]+=ny;sums[id*3+2]+=nz;}
 }
 for(const id of used){const n=sums.subarray(id*3,id*3+3),len=Math.hypot(...n)||1;for(let k=0;k<3;k++)normals[id*3+k]=n[k]/len;
  const p=source.positions.slice(id*3,id*3+3).map(v=>v/1e5),ax=Math.abs(p[0]-r.headX),front=smooth(r.headZ+.025,r.headZ+.065,p[2]);
  // Broad skin receives smooth interpolation. Only the named bony ridges retain face-normal weight.
  const brow=bell(p[1],r.eyeY+.009,.011)*smooth(.012,.020,ax)*(1-smooth(.054,.068,ax))*front;
  const nasal=(1-smooth(.009,.017,ax))*smooth(r.mouth[1]+.015,r.mouth[1]+.035,p[1])*(1-smooth(r.eyeY+.014,r.eyeY+.027,p[1]))*front;
  const zygoma=bell(p[1],r.eyeY-.025,.009)*bell(ax,.055,.010)*front;
  const jaw=Math.max(bell(p[1],r.chin+.005,.007),bell(p[1],r.chin+.030,.010)*smooth(.030,.055,ax))*front;
  const ridge=Math.max(brow,nasal,zygoma,jaw);
  const skin=smooth(r.chin-.005,r.chin+.012,p[1])*(1-smooth(.062,.081,ax));
  smoothWeights[id]=clamp((.85+.12*planeMask(p,r))*(1-.70*ridge)*skin*Math.min(1,gainSoft*.95));
  // The inherited narrow triangles below the earlobe belong to neck skin, not ear creases.
  const underEar=smooth(r.chin+.018,r.chin+.033,p[1])*(1-smooth(r.eyeY-.037,r.eyeY-.018,p[1]))*smooth(.050,.064,ax)*(1-smooth(.086,.099,ax))*(1-smooth(r.headZ+.012,r.headZ+.042,p[2]));
  smoothWeights[id]=Math.max(smoothWeights[id],.94*underEar*Math.min(1,gainSoft));
 }
 return {normals,smoothWeights,skinIndices:[...used]};
}

// Chain after existing material hooks so face-map color handling remains intact.
export function installAdultHeadNormals(material){
 if(material.userData.adultHeadNormals)return;
 const previous=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
 material.flatShading=false;material.userData.adultHeadNormals=true;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.vertexShader='attribute float adultSurfaceBlend;\nvarying float vAdultSurfaceBlend;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAdultSurfaceBlend=adultSurfaceBlend;');
  shader.fragmentShader='varying float vAdultSurfaceBlend;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nvec3 adultFacetNormal=normalize(cross(dFdx(vViewPosition),dFdy(vViewPosition)));\nnormal=normalize(mix(adultFacetNormal,normal,clamp(vAdultSurfaceBlend,0.0,1.0)));\nnonPerturbedNormal=normal;');
 };
 material.customProgramCacheKey=()=>cache()+'|stone-adult-surface-v93';material.needsUpdate=true;
}
