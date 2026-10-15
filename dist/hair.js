import * as THREE from 'three';
import {adultCraniumPoint} from './adult-head.js?v=93';
// Library hair meshes and the user-provided Stone extraction; fit/split original strands.
export const hairDefaults={frontHair:'straight',backHair:'bob',sideHair:'short',braid:'none',frontLength:50,backLength:50,sideLength:50,braidLength:50,hairVolume:50,hairlineHeight:50,sideHairColor:'#929590'};
export const hairChoices={frontHair:[['stoneOriginal','Stone · 原版前发'],['none','无前发'],['straight','齐刘海'],['parted','中分刘海'],['swept','层次斜刘海'],['soft','柔顺刘海'],['curtain','弧形刘海'],['sidepart','侧分短发 · 原模型'],['upcomb','上梳短发 · 原模型'],['layered06','分层短发 · culturalibre']],backHair:[['stoneOriginal','Stone · 原版后发'],['none','无后发'],['short','层次短发'],['bob','波波后发'],['long','直长后发'],['curled','卷曲后发'],['sidepart','侧分短后发'],['upcomb','上梳短后发'],['layered06','分层短后发']],sideHair:[['stoneOriginal','Stone · 原版侧发'],['none','无侧发'],['short','波波侧发'],['layered','层次鬓发'],['long','长鬓发'],['curled','弧形侧发'],['sidepart','侧分短侧发'],['upcomb','上梳短侧发'],['layered06','分层短侧发']],braid:[['none','无发辫'],['single','侧卷马尾'],['double','双马尾']]};
for(const [key,label] of [['frontHair','00003 · 提取前发'],['backHair','00003 · 提取后发'],['sideHair','00003 · 提取侧发']])hairChoices[key].unshift(['imported00003',label]);
export const hairRanges={hairlineHeight:['发际线高度','低','高'],frontLength:['前发长度','短','长'],backLength:['后发长度','短','长'],sideLength:['侧发长度','短','长'],braidLength:['马尾长度','短','长'],hairVolume:['蓬松度','贴合','蓬松']};
export const classicHairPresets=[
 {label:'00003 · 提取发型',gender:'male',values:{frontHair:'imported00003',backHair:'imported00003',sideHair:'imported00003',braid:'none'}},
 {label:'Stone · 原版上梳发',gender:'male',values:{frontHair:'stoneOriginal',backHair:'stoneOriginal',sideHair:'stoneOriginal',braid:'none'}},
 {label:'作者分层短发',gender:'male',reference:'https://www.makehumancommunity.org/node/2479',values:{frontHair:'layered06',backHair:'layered06',sideHair:'layered06',braid:'none'}},
 {label:'侧分短发',gender:'male',reference:'https://opengameart.org/content/side-parting-hairstyle-for-male-model',values:{frontHair:'sidepart',backHair:'sidepart',sideHair:'sidepart',braid:'none'}},
 {label:'上梳短发',gender:'male',reference:'https://opengameart.org/content/upcomb-hair-style-for-male-model',values:{frontHair:'upcomb',backHair:'upcomb',sideHair:'upcomb',braid:'none'}},
 {label:'经典波波',gender:'female',values:{frontHair:'straight',backHair:'bob',sideHair:'short',braid:'none'}},
 {label:'柔顺长发',gender:'female',values:{frontHair:'soft',backHair:'long',sideHair:'long',braid:'none'}},
 {label:'层次短发',values:{frontHair:'swept',backHair:'short',sideHair:'layered',braid:'none'}},
 {label:'双马尾',gender:'female',values:{frontHair:'parted',backHair:'none',sideHair:'none',braid:'double'}},
 {label:'侧卷马尾',gender:'female',values:{frontHair:'curtain',backHair:'curled',sideHair:'curled',braid:'single'}}
];
// Product selection policy, not a statement about who may wear a real hairstyle.
export const genderHairValues={male:{frontHair:['imported00003','stoneOriginal','none','swept','sidepart','upcomb','layered06'],backHair:['imported00003','stoneOriginal','none','short','sidepart','upcomb','layered06'],sideHair:['imported00003','stoneOriginal','none','layered','sidepart','upcomb','layered06'],braid:['none']},female:{frontHair:['none','straight','parted','swept','soft','curtain'],backHair:['none','short','bob','long','curled'],sideHair:['none','short','layered','long','curled'],braid:['none','single','double']}};
export function hairOptionsFor(key,gender,faceSource){const allowed=genderHairValues[gender]?.[key];return allowed?hairChoices[key].filter(([value])=>allowed.includes(value)&&value!=='stoneRef'):hairChoices[key];}
export function filterHairForGender(input){const out={...input},gender=out.gender==='male'?'male':'female';const fallback=gender==='male'?{frontHair:'sidepart',backHair:'sidepart',sideHair:'sidepart',braid:'none'}:hairDefaults;
 for(const key of ['frontHair','backHair','sideHair'])if(out[key]==='stoneRef')out[key]='none';
 for(const key of ['frontHair','backHair','sideHair','braid'])if(!hairOptionsFor(key,gender,out.faceSource).some(([value])=>value===out[key]))out[key]=fallback[key];return out;}
const skullCache=new WeakMap();
const frontOwners={imported00003:'imported-00003',stoneOriginal:'stone-ref',straight:'bob',parted:'female',swept:'uniform',soft:'long',curtain:'classic',sidepart:'sidepart',upcomb:'upcomb',layered06:'layered06'};
const backOwners={imported00003:'imported-00003',stoneOriginal:'stone-ref',short:'uniform',bob:'bob',long:'long',curled:'classic',sidepart:'sidepart',upcomb:'upcomb',layered06:'layered06'};
const sideOwners={imported00003:'imported-00003',stoneOriginal:'stone-ref',short:'bob',layered:'uniform',long:'long',curled:'classic',sidepart:'sidepart',upcomb:'upcomb',layered06:'layered06'};
export function hairAssetIds(input){const state={...hairDefaults,...input};if(['frontHair','backHair','sideHair','braid'].every(k=>state[k]==='none'))return [];return [...new Set([['frontHair','backHair','sideHair'].every(key=>['sidepart','upcomb','layered06','stoneOriginal','imported00003','none'].includes(state[key]))?null:state.gender==='male'?'uniform':'bob',frontOwners[state.frontHair],backOwners[state.backHair],sideOwners[state.sideHair],state.braid==='single'?'classic':state.braid==='double'?'female':null].filter(Boolean))];}
function compact(source){
 const ids=[...new Set(source.groups.flatMap(g=>g.indices))].sort((a,b)=>a-b),index=new Map(ids.map((id,i)=>[id,i]));
 const fits={};for(const [name,fit] of Object.entries(source.fits||{})){
  fits[name]={indices:[],positions:[]};for(let k=0;k<fit.indices.length;k++){const id=fit.indices[k];if(index.has(id)){fits[name].indices.push(index.get(id));fits[name].positions.push(...fit.positions.slice(k*3,k*3+3));}}
 }
 return {...source,fits,positions:ids.flatMap(id=>source.positions.slice(id*3,id*3+3)),normals:ids.flatMap(id=>source.normals.slice(id*3,id*3+3)),uv:ids.flatMap(id=>source.uv.slice(id*2,id*2+2)),groups:source.groups.map(g=>({...g,indices:g.indices.map(id=>index.get(id))})),expressions:{}};
}
function sections(owner,id){
 if(skullCache.has(owner))return skullCache.get(owner);
 const source=owner.meshes.find(m=>m.name==='Hair001'),p=source.positions,eye=owner.landmarks.leftEye[1],cz=owner.landmarks.head[2];
 const parents=new Map();
 function find(i){if(!parents.has(i))parents.set(i,i);let root=i;while(parents.get(root)!==root)root=parents.get(root);while(parents.get(i)!==i){const next=parents.get(i);parents.set(i,root);i=next;}return root;}
 for(const g of source.groups)for(let k=0;k<g.indices.length;k+=3){const [a,b,c]=g.indices.slice(k,k+3);parents.set(find(b),find(a));parents.set(find(c),find(a));}
 const components=new Map();for(const i of parents.keys()){const root=find(i);if(!components.has(root))components.set(root,[]);components.get(root).push(i);}
 const assignment=new Map();
 for(const ids of components.values()){
  const sorted=[...ids].sort((a,b)=>p[a*3+1]-p[b*3+1]);
  const tip=sorted.slice(0,Math.max(1,Math.ceil(ids.length*.22)));
  let x=0,y=0,z=0,maxX=0,lo=Infinity,hi=-Infinity;
  for(const i of ids){maxX=Math.max(maxX,Math.abs(p[i*3]/100000));lo=Math.min(lo,p[i*3+1]/100000);hi=Math.max(hi,p[i*3+1]/100000);}
  for(const i of tip){x+=p[i*3]/100000;y+=p[i*3+1]/100000;z+=p[i*3+2]/100000;}x/=tip.length;y/=tip.length;z/=tip.length;
  let part;
  if(id==='female'&&maxX>.135&&z<cz+.035)part='tail';
  else if(id==='classic'&&maxX>.15&&x>.095)part='tail';
  else if(z>cz+.048&&y>eye-.070&&Math.abs(x)<.09)part='front';
  else if(z>cz+.018&&Math.abs(x)>.054)part='side';
  else part='back';
  for(const i of ids)assignment.set(i,part);
 }
 const result={};for(const part of ['front','back','side','tail']){
  const groups=source.groups.map(g=>({...g,indices:g.indices.filter((_,k)=>assignment.get(g.indices[k-k%3])===part)})).filter(g=>g.indices.length);
  result[part]=compact({...source,groups,expressions:{}});
 }
 const body=owner.meshes.find(m=>m.name==='Body');
 const capPositions=[...body.positions],capFit=body.fits?.[id==='uniform'?'male':'female'];
 if(capFit)for(let k=0;k<capFit.indices.length;k++)for(let j=0;j<3;j++)capPositions[capFit.indices[k]*3+j]=capFit.positions[k*3+j];
 result.cap=compact({...body,positions:capPositions,groups:body.groups.filter(g=>owner.materials[g.material].name.includes('_HAIR'))});
 skullCache.set(owner,result);return result;
}
function fit(owner,source,target,state,part){
 const p=[...source.positions],normals=[...source.normals];
 const garmentFit=part!=='cap'&&state.clothes!=='underwear'?source.fits?.[state.gender==='female'?'long':'uniform']:null;
 if(garmentFit)for(let k=0;k<garmentFit.indices.length;k++)for(let j=0;j<3;j++)p[garmentFit.indices[k]*3+j]=garmentFit.positions[k*3+j];
 const srcMale=owner.landmarks.neck[1]>1.40,targetMale=state.gender==='male';
 const width=srcMale===targetMale?1:targetMale?.96:1/.96;
 const srcEye=(owner.landmarks.leftEye[1]+owner.landmarks.rightEye[1])/2,eye=(target.landmarks.leftEye[1]+target.landmarks.rightEye[1])/2;
 const zShift=target.landmarks.head[2]-owner.landmarks.head[2];
 const value=state[part==='front'?'frontLength':part==='back'?'backLength':part==='side'?'sideLength':'braidLength']??50;
 const length=part==='cap'?1:1+(Math.max(0,Math.min(100,value))-50)*(part==='front'?.003:.005);
 const volume=1+Math.max(part==='cap'?0:-50,Math.max(0,Math.min(100,state.hairVolume??50))-50)*.0012;
 const anchor=part==='tail'?srcEye+.06:srcEye+.035;
 for(let i=0;i<p.length;i+=3){
  let x=p[i]/100000,y=p[i+1]/100000,z=p[i+2]/100000;
  // Crown roots stay anchored; preserve the author's curve, thickness, taper and curl.
  if(y<anchor)y=anchor+(y-anchor)*length;
  x*=width*volume;z=owner.landmarks.head[2]+(z-owner.landmarks.head[2])*volume+zShift;
  y+=eye-srcEye;
  p[i]=Math.round(x*100000);p[i+1]=Math.round(y*100000);p[i+2]=Math.round(z*100000);
  normals[i]=normals[i]/(width*volume);normals[i+1]=normals[i+1]/(p[i+1]/100000<anchor+eye-srcEye?length:1);normals[i+2]=normals[i+2]/volume;
 }
 return {...source,name:part==='cap'?'HairScalp':part==='front'?'HairFront':part==='back'?'HairBack':part==='side'?'HairSide':'HairBraid',positions:p,normals,expressions:{}};
}

const authoredIds=new Set(['sidepart','upcomb','layered06']);
const authoredSectionsCache=new WeakMap();
function authoredSections(owner){
 if(authoredSectionsCache.has(owner))return authoredSectionsCache.get(owner);
 const source=owner.meshes[0],parts={front:[],back:[],side:[]};
 for(const g of source.groups)for(let k=0;k<g.indices.length;k+=3){const ids=g.indices.slice(k,k+3),center=[0,0,0];for(const id of ids)for(let j=0;j<3;j++)center[j]+=source.positions[id*3+j]/300000;
  const [x,y,z]=center,part=z<3?'back':(Math.abs(x)>7.0&&y<24)||z<8&&Math.abs(x)>6.0?'side':'front';parts[part].push(...ids);}
 const result={};for(const part of ['front','back','side'])result[part]={...source,groups:[{material:0,indices:parts[part]}],expressions:{}};
 authoredSectionsCache.set(owner,result);return result;
}
function fitAuthored(owner,source,target,state,part){
 // Affine head fitting preserves the author's silhouette, parting and asymmetry.
 // Source coordinates are the original mesh coordinates in Y-up world space.
 const eye=(target.landmarks.leftEye[1]+target.landmarks.rightEye[1])/2,cz=target.landmarks.head[2];
 const volume=1+((state.hairVolume??50)-50)*.0008;
 const sx=.0095*volume,sy=.0103,sz=.0093*volume;
 const positions=[],normals=[];
 for(let i=0;i<source.positions.length;i+=3){let x=source.positions[i]/100000,y=source.positions[i+1]/100000,z=source.positions[i+2]/100000;
  let nx=source.normals[i],ny=source.normals[i+1],nz=source.normals[i+2];
  // Stone's swept-up variation shortens the author's lower locks and tilts the
  // frontal section, with a continuous seam field. No new locks are generated.
  if(owner.materials[0].name.includes('Layered06')&&state.faceSource==='stone'){
   if(y<22){y=22+(y-22)*.45;ny/=.45;}
   const t=Math.max(0,Math.min(1,(z-3)/7)),angle=.95*t*t*(3-2*t);
   const c=Math.cos(angle),s=Math.sin(angle),dy=y-22,dz=z-3;
   y=22+c*dy+s*dz;z=3-s*dy+c*dz;
   const q=ny;ny=c*q+s*nz;nz=-s*q+c*nz;
  }
  // The whole authored mesh shares one deformation field across all three
  // sections. Length sliders must not tear a shared polygon seam apart.
  const clamp=v=>Math.max(0,Math.min(1,v)),ramp=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
  const back=1-ramp(1,8,z),front=ramp(3,10,z)*(1-ramp(5.5,9,Math.abs(x))),side=Math.max(0,1-front-back),sum=front+back+side;
  const length=1+((front*((state.frontLength??50)-50)+back*((state.backLength??50)-50)+side*((state.sideLength??50)-50))/sum)*.0012;
  const down=y<24?24+(y-24)*length:y;
  positions.push(Math.round(x*sx*100000),Math.round((eye+(down-14)*sy)*100000),Math.round((cz+(z-3)*sz)*100000));
  const n=new THREE.Vector3(nx/sx,ny/(sy*(y<24?length:1)),nz/sz).normalize();normals.push(...n.toArray().map(v=>Math.round(v*32767)));
 }
 return {...source,name:part==='front'?'HairFront':part==='back'?'HairBack':'HairSide',positions,normals,expressions:{}};
}
const stoneSectionsCache=new WeakMap();
function stoneSections(owner){
 if(stoneSectionsCache.has(owner))return stoneSectionsCache.get(owner);
 const source=owner.meshes.find(m=>m.name==='HairReference'),parts={front:[],back:[],side:[]},cz=owner.landmarks.head[2];
 for(const group of source.groups)for(let k=0;k<group.indices.length;k+=3){
  const ids=group.indices.slice(k,k+3),x=ids.reduce((v,i)=>v+source.positions[i*3]/3e5,0),z=ids.reduce((v,i)=>v+source.positions[i*3+2]/3e5,0),angle=Math.abs(Math.atan2(x,z-cz));
  parts[angle<1.05?'front':angle>2.10?'back':'side'].push(...ids);
 }
 const parent=Array.from({length:source.positions.length/3},(_,i)=>i);
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(const g of source.groups)for(let k=0;k<g.indices.length;k+=3)for(let j=1;j<3;j++)parent[root(g.indices[k+j])]=root(g.indices[k]);
 const components=new Map();for(let i=0;i<parent.length;i++){const key=root(i);if(!components.has(key))components.set(key,[]);components.get(key).push(i);}
 const main=[...components.values()].sort((a,b)=>b.length-a.length)[0],positions=[...source.positions];
 for(const ids of components.values()){
  if(ids.length<20||ids.length>100)continue;const anchor=ids.reduce((a,b)=>source.positions[a*3+1]>source.positions[b*3+1]?a:b),y=source.positions[anchor*3+1]/1e5;
  if(source.positions[anchor*3+2]/1e5<cz+.080||y>owner.landmarks.faceGuide.top-.050)continue;
  const crown=main.filter(i=>source.positions[i*3+1]>source.positions[anchor*3+1]+500).reduce((a,b)=>{const distance=i=>[0,1,2].reduce((n,k)=>n+(source.positions[i*3+k]-source.positions[anchor*3+k])**2,0);return distance(a)<distance(b)?a:b;});
  for(const i of ids){const t=Math.max(0,Math.min(1,(source.positions[i*3+1]/1e5-(y-.028))/.028)),w=t*t*(3-2*t);for(let k=0;k<3;k++)positions[i*3+k]+=Math.round((source.positions[crown*3+k]-source.positions[anchor*3+k]+(k===1?800:k===2?-150:0))*w);}
 }
 const fitted={...source,positions};
 const result={};for(const part of ['front','back','side'])result[part]=compact({...fitted,groups:source.groups.map(g=>({...g,indices:parts[part]})),expressions:{}});
 stoneSectionsCache.set(owner,result);return result;
}
function fitStone(owner,source,target,state,part){
 const sourceTop=owner.landmarks.faceGuide.top,targetTop=target.landmarks.faceRig?.top||Math.max(...target.meshes.find(m=>m.name==='Face').positions.filter((_,i)=>i%3===1))/1e5,dy=targetTop-sourceTop,dx=target.landmarks.head[0]-owner.landmarks.head[0],dz=target.landmarks.head[2]-owner.landmarks.head[2];
 const root=targetTop-.045,volume=1+Math.max(-50,Math.min(50,(state.hairVolume??50)-50))*.0016,positions=[];
 const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
 for(let k=0;k<source.positions.length;k+=3){
  let x=source.positions[k]/1e5,y=source.positions[k+1]/1e5+dy,z=source.positions[k+2]/1e5;
  const angle=Math.abs(Math.atan2(x-owner.landmarks.head[0],z-owner.landmarks.head[2])),front=1-smooth(.75,1.50,angle),back=smooth(1.80,2.55,angle),side=1-front-back;
  const length=1+(front*((state.frontLength??50)-50)+back*((state.backLength??50)-50)+side*((state.sideLength??50)-50))*.004;
  y=root+(y-root)*(y>root?1+(length-1)*.35:length);
  x=owner.landmarks.head[0]+(x-owner.landmarks.head[0])*.98*volume+dx;
  z=owner.landmarks.head[2]+(z-owner.landmarks.head[2])*volume+dz;
  positions.push(Math.round(x*1e5),Math.round(y*1e5),Math.round(z*1e5));
 }
 // Bind to whichever head is selected, rather than retaining donor bone IDs.
 return {...source,name:part==='front'?'HairFront':part==='back'?'HairBack':'HairSide',positions,skinIndices:undefined,skinWeights:undefined,expressions:{}};
}
// Short undercut follows the selected skull, with a raised contour around the
// ear and separate temple/nape length controls. The extracted crown is retained.
function stoneUndercut(owner,target,state,part,joined=false,cache){
 const adult=state.characterType==='man'&&state.gender==='male'&&state.foundationRevision===1&&state.faceSource==='imported00003';
 const rig=target.landmarks.faceRig,head=target.landmarks.head;
 const face=target.meshes.find(m=>m.name==='Face'),skin=face.groups.filter(g=>target.materials[g.material]?.name.includes('_SKIN'));
 const triangles=skin.flatMap(g=>g.indices),p=face.positions,cx=head[0],cz=head[2];
 const top=rig?.top||Math.max(...p.filter((_,i)=>i%3===1))/1e5,eye=rig?.eyeY||target.landmarks.leftEye[1];
 const radius=(theta,y)=>{
  const dx=Math.sin(theta),dz=Math.cos(theta);let radius=0;
  for(let k=0;k<triangles.length;k+=3){const hits=[];
   for(let e=0;e<3;e++){const a=triangles[k+e]*3,b=triangles[k+(e+1)%3]*3,ay=p[a+1]/1e5,by=p[b+1]/1e5;if(Math.abs(by-ay)<1e-8)continue;const t=(y-ay)/(by-ay);if(t>=0&&t<=1)hits.push([(p[a]+(p[b]-p[a])*t)/1e5-cx,(p[a+2]+(p[b+2]-p[a+2])*t)/1e5-cz]);}
   if(hits.length<2)continue;const a=hits[0],ex=hits[1][0]-a[0],ez=hits[1][1]-a[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;const r=(a[0]*ez-a[1]*ex)/den,t=(a[0]*dz-a[1]*dx)/den;if(r>0&&t>=0&&t<=1)radius=Math.max(radius,r);
  }
  return radius||.060;
 };
 if(adult&&!joined){
  if(cache?.adult)return cache.adult[part];
  // Fit both partitions together: a vertex outside the skin does not guarantee
  // that the interior of its coarse triangle clears the rounded occiput.
  const pair={side:stoneUndercut(owner,target,state,'side',true),back:stoneUndercut(owner,target,state,'back',true)};
  const vertices=[],byPosition=new Map(),faces=[];
  for(const mesh of Object.values(pair)){const ids=[];for(let i=0;i<mesh.positions.length;i+=3){const key=mesh.positions.slice(i,i+3).join(',');if(!byPosition.has(key)){byPosition.set(key,vertices.length);vertices.push(mesh.positions.slice(i,i+3).map(v=>v/1e5));}ids.push(byPosition.get(key));}
   for(const group of mesh.groups)for(let k=0;k<group.indices.length;k+=3)faces.push(group.indices.slice(k,k+3).map(i=>ids[i]));mesh.adultUndercutVertexIds=ids;
  }
  const barycentric=[[1/3,1/3,1/3],...Array.from({length:5},(_,i)=>Array.from({length:5-i},(_,j)=>[i/4,j/4,1-(i+j)/4])).flat()],padding=Array(vertices.length).fill(0);
  for(let pass=0;pass<3;pass++){const needed=Array(vertices.length).fill(0);for(const face of faces)for(const weights of barycentric){const q=[0,1,2].map(k=>face.reduce((n,id,j)=>n+vertices[id][k]*weights[j],0)),theta=Math.atan2(q[0]-cx,q[2]-cz),r=Math.hypot(q[0]-cx,q[2]-cz),extra=radius(theta,q[1])+.0012-r;if(extra>.00001)for(const id of face)needed[id]=Math.max(needed[id],extra*1.03);}
   if(Math.max(...needed)<.00001)break;for(let id=0;id<vertices.length;id++){if(!needed[id])continue;const p=vertices[id],theta=Math.atan2(p[0]-cx,p[2]-cz);p[0]+=Math.sin(theta)*needed[id];p[2]+=Math.cos(theta)*needed[id];padding[id]+=needed[id];}
  }
  for(const mesh of Object.values(pair)){mesh.positions=mesh.adultUndercutVertexIds.flatMap(id=>vertices[id].map(v=>Math.round(v*1e5)));mesh.adultUndercutClearance={sampleCount:faces.length*barycentric.length,maxCorrection:Math.max(...padding),maxCorrectionPoint:vertices[padding.indexOf(Math.max(...padding))]};delete mesh.adultUndercutVertexIds;}
  if(cache)cache.adult=pair;return pair[part];
 }
 const positions=[],normals=[],uv=[],indices=[],segments=state.faceSource==='imported00003'?(part==='side'?10:8):(part==='side'?20:16),rows=state.faceSource==='imported00003'?4:8;
 const length=((state[part==='side'?'sideLength':'backLength']??50)-50)/50;
 for(const sign of [-1,1]){
  const offset=positions.length/3;
  for(let i=0;i<=segments;i++){
   const a=(part==='side'?.85:2.10)+(part==='side'?1.25:Math.PI-2.10)*i/segments,theta=sign*a;
   const legacyBottom=eye-.050+(state.faceSource==='imported00003'?.098:.055)*Math.exp(-(((a-(state.faceSource==='imported00003'?1.37:1.45))/(state.faceSource==='imported00003'?.48:.30))**2))-.020*Math.max(0,Math.min(1,(a-1.8)/.8))-length*.022*(1-Math.exp(-(((a-1.50)/.60)**2)))-(state.faceSource==='imported00003'&&part==='back'?.016*Math.max(0,(a-2.1)/(Math.PI-2.1)):0);
   // The lower contour is one continuous field across the side/back split.
   // It rises over the ear, then slopes to a short central V at the nape.
   const smooth=(lo,hi,v)=>{const t=Math.max(0,Math.min(1,(v-lo)/(hi-lo)));return t*t*(3-2*t);};
   const earLift=.089*Math.exp(-(((a-1.46)/.40)**2));
   const nape=Math.max(0,Math.min(1,(a-1.90)/(Math.PI-1.90))),shortBottom=eye-.027+earLift-.025*nape;
   const backWeight=smooth(1.85,2.35,a),adultLength=(((state.sideLength??50)-50)*(1-backWeight)+((state.backLength??50)-50)*backWeight)/50;
   const bottom=adult?shortBottom-adultLength*.012*(1-Math.exp(-(((a-1.46)/.55)**2))):legacyBottom;
   for(let j=0;j<=rows;j++){
    const t=j/rows,edgeTheta=theta+sign*.35*t**1.3*(part==='side'?(1-i/segments)**4:0);
    // A narrow lower rim follows the occiput; the raised contour leaves neck skin visible.
    const y=top-.028+(bottom-(top-.028))*t,r=radius(edgeTheta,y)+(adult?(.0027+.0020*smooth(eye-.015,eye+.035,y)):(state.faceSource==='imported00003'?(.005+(part==='back'?.007*Math.sin((a-2.1)/(Math.PI-2.1)*Math.PI/2):0)):.0025));
    positions.push(Math.round((cx+Math.sin(edgeTheta)*r)*1e5),Math.round(y*1e5),Math.round((cz+Math.cos(edgeTheta)*r)*1e5));
    normals.push(Math.round(Math.sin(edgeTheta)*32767),0,Math.round(Math.cos(edgeTheta)*32767));uv.push(Math.round(i/segments*65535),Math.round(j/rows*65535));
   }
  }
  for(let i=0;i<segments;i++)for(let j=0;j<rows;j++){const a=offset+i*(rows+1)+j,b=a+rows+1;indices.push(...(sign>0?[a,a+1,b,b,a+1,b+1]:[a,b,a+1,b,b+1,a+1]));}
 }
 const gray=[],dark=[],light=[],shade=[];
 if(adult){
  // Assign whole low-poly cells to broad salt-and-pepper blocks, rather than
  // alternating every triangle or creating strips of simulated individual hair.
  const halfVertices=(segments+1)*(rows+1);
  for(let k=0;k<indices.length;k+=6){const cell=indices.slice(k,k+6),base=cell[0]%halfVertices,i=Math.floor(base/(rows+1)),j=base%(rows+1),a=(part==='side'?.85:2.10)+(part==='side'?1.25:Math.PI-2.10)*(i+.5)/segments;
   // Shared angular fields make five large panels: dark roots, temple charcoal,
   // broad silver side, slate occiput and a central silver V. Their boundaries
   // lean with the head instead of reading as vertical gray curtain strips.
   const t=(j+.5)/rows,sideEnd=1.87+.20*t,backCenter=2.82-.22*t;
   const bucket=j===0?dark:a<1.23+.12*t?shade:a<sideEnd?light:a<backCenter?gray:light;
   bucket.push(...cell);
  }
 }else for(let k=0;k<indices.length;k+=3){const tri=indices.slice(k,k+3),y=tri.reduce((n,i)=>n+positions[i*3+1]/3e5,0);((state.faceSource==='imported00003'?Math.max(...tri.map(i=>positions[i*3+1]/1e5))>eye+.025:y>=top-.075)?dark:state.faceSource==='imported00003'?(part==='side'?(y>eye+.008?light:gray):(y<eye-.025+Math.abs(tri.reduce((n,i)=>n+positions[i*3]/3e5,0))*.7?light:gray)):gray).push(...tri);}
 return {...(adult?{adultUndercut:true}:{}),name:part==='side'?'HairSideUndercut':'HairBackUndercut',positions,normals,uv,groups:[{material:0,indices:gray},{material:1,indices:dark},...(state.faceSource==='imported00003'?[{material:2,indices:light},{material:3,indices:shade}]:[])],expressions:{}};
}
const adultCrownCache=new WeakMap();
function adultCrownSource(owner){
 if(adultCrownCache.has(owner))return adultCrownCache.get(owner);
 const source=owner.meshes.find(m=>m.name==='HairImported'),p=source.positions,triangles=source.groups.flatMap(g=>g.indices),faces=[],corners=new Map(),threshold=Math.cos(32*Math.PI/180);
 for(let k=0;k<triangles.length;k+=3){const ids=triangles.slice(k,k+3),v=ids.map(i=>new THREE.Vector3(...p.slice(i*3,i*3+3)));const normal=new THREE.Vector3().crossVectors(v[1].clone().sub(v[0]),v[2].clone().sub(v[0])).normalize();faces.push({ids,normal});for(const id of ids){if(!corners.has(id))corners.set(id,[]);corners.get(id).push(k/3);}}
 const positions=[],normals=[],uv=[],sourceVertexIds=[],cornerIds=new Map();
 for(const [id,around]of corners){const parent=around.map((_,i)=>i);const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};for(let a=0;a<around.length;a++)for(let b=a+1;b<around.length;b++){const fa=faces[around[a]],fb=faces[around[b]];if(fa.normal.dot(fb.normal)>threshold&&fa.ids.filter(i=>fb.ids.includes(i)).length>=2)parent[root(b)]=root(a);}
  const groups=new Map();for(let j=0;j<around.length;j++){const key=root(j);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(around[j]);}
  for(const group of groups.values()){const index=positions.length/3,n=new THREE.Vector3();positions.push(...p.slice(id*3,id*3+3));uv.push(...source.uv.slice(id*2,id*2+2));for(const f of group){n.add(faces[f].normal);cornerIds.set(f+','+id,index);}n.normalize();normals.push(...n.toArray().map(v=>Math.round(v*32767)));sourceVertexIds.push(id);}
 }
 const indices=[];for(let f=0;f<faces.length;f++)indices.push(...faces[f].ids.map(id=>cornerIds.get(f+','+id)));
 const result={...source,positions,normals,uv,sourceVertexIds,groups:[{material:1,indices}]};adultCrownCache.set(owner,result);return result;
}
function fitImported(owner,target,state,part){
 const adult=state.characterType==='man'&&state.gender==='male'&&state.foundationRevision===1&&state.faceSource==='imported00003';
 const source=adult?adultCrownSource(owner):owner.meshes.find(m=>m.name==='HairImported'),from=owner.landmarks.head,to=target.landmarks.head;
 const indices=[];
 for(const g of source.groups)for(let k=0;k<g.indices.length;k+=3){
  const ids=g.indices.slice(k,k+3),c=[0,1,2].map(a=>ids.reduce((sum,id)=>sum+source.positions[id*3+a]/3e5,0));
  const section=Math.abs(c[0]-from[0])>.060?'side':c[2]>from[2]?'front':'back';
  if(section===part)indices.push(...ids);
 }
 const top=target.landmarks.faceRig?.top||from[1]+.12;
 const scale=state.faceSource==='imported00003'?1:Math.max(.75,Math.min(1.25,(top-to[1])/(owner.landmarks.faceRig.top-from[1])));
 const positions=[];
 for(let i=0;i<source.positions.length;i+=3){
  const p=source.positions.slice(i,i+3).map(v=>v/1e5),dx=p[0]-from[0],dz=p[2]-from[2];
  // Use the same length field on all three partitions so shared cut vertices
  // cannot separate when front/back/side lengths differ.
  const side=Math.min(1,Math.abs(dx)/.085),front=Math.max(0,Math.min(1,(dz+.045)/.09));
  const length=(state.sideLength??50)*side+((state.frontLength??50)*front+(state.backLength??50)*(1-front))*(1-side);
  const volume=1+((state.hairVolume??50)-50)*.002;
  const q=[to[0]+dx*scale*volume,to[1]+(p[1]-from[1])*scale*(1+(length-50)*.004),to[2]+dz*scale*volume];
  positions.push(...(adult?adultCraniumPoint(q,target.landmarks.faceRig,state):q).map(v=>Math.round(v*1e5))); 
 }
 return {...(adult?{adultCrown:true,sourceVertexIds:source.sourceVertexIds}:{}),name:'Hair'+part[0].toUpperCase()+part.slice(1),positions,normals:source.normals,uv:source.uv,normalIndices:source.groups.flatMap(g=>g.indices),groups:[{material:1,indices}],expressions:{}};
}
export function referenceHairMeshes(assets,input){
 const state={...hairDefaults,...input},target=assets[state.gender],result=[],undercuts={};
 // Adult close-cropped gray hair is painted on the existing head skin. Preserve
 // the extracted black crown and its closing cap, without an offset gray shell.
 const paintScalp=state.characterType==='man'&&state.gender==='male'&&state.foundationRevision===1&&state.faceSource==='imported00003';
 if(['frontHair','backHair','sideHair','braid'].every(k=>state[k]==='none'))return result;
 const keys=[['frontHair','front',frontOwners],['backHair','back',backOwners],['sideHair','side',sideOwners]];
 // A complete authored short hairstyle already includes its own scalp surface.
 if(!keys.every(([key])=>(authoredIds.has(state[key])||['stoneOriginal','imported00003','none'].includes(state[key])))){const id=state.gender==='male'?'uniform':'bob',owner=assets[id];result.push({owner,mesh:fit(owner,sections(owner,id).cap,target,state,'cap')});}
 for(const [key,part,table] of keys){const id=table[state[key]];if(!id)continue;const owner=assets[id];
  if(id==='imported-00003'&&part==='front'&&state.faceSource==='imported00003'){
   const face=target.meshes.find(m=>m.name==='Face'),top=target.landmarks.faceRig.top,indices=[];
   // The original cap is slightly outside the face. Remove only its gray-side
   // coverage, otherwise that black patch would hide the skin's new texture.
   // The complete underlying Face remains the closed scalp in those regions.
   const paintedCap=p=>{const a=Math.abs(Math.atan2(p[0]-target.landmarks.head[0],p[2]-target.landmarks.head[2]));return p[1]<top-.014&&((state.sideHair==='imported00003'&&a>.80&&a<2.25)||(state.backHair==='imported00003'&&a>1.90));};
   for(const g of face.groups.filter(g=>target.materials[g.material]?.name==='Imported00003_Face_SKIN'))for(let k=0;k<g.indices.length;k+=3){const ids=g.indices.slice(k,k+3);
    if(!ids.every(id=>face.positions[id*3+1]/1e5>target.landmarks.faceRig.eyeY+.024+.40*Math.max(0,face.positions[id*3+2]/1e5-target.landmarks.head[2])))continue;
    const tri=ids.map(i=>face.positions.slice(i*3,i*3+3).map(v=>v/1e5)),centroid=[0,1,2].map(j=>tri.reduce((n,p)=>n+p[j]/3,0));
    if(paintScalp&&[...tri,centroid].some(paintedCap))continue;
    indices.push(...ids);
   }
   result.push({owner,mesh:{name:'HairScalp',positions:face.positions.map((v,k)=>k%3===1?v+60:v),normals:face.normals,uv:face.uv,groups:[{material:1,indices}],expressions:{}}});
  }
  if((id==='stone-ref'||(id==='imported-00003'&&state.faceSource==='imported00003'))&&part!=='front'&&!(paintScalp&&id==='imported-00003')){const mesh=stoneUndercut(owner,target,state,part,false,undercuts);result.push({owner:{materials:[{name:id==='imported-00003'?'ImportedBlock_HAIR':'StoneSide_HAIR',color:[1,1,1,1],blend:0,double:true,texture:null},{name:id==='imported-00003'?'ImportedUnderBase_HAIR':'StoneUnderBase_HAIR',color:[1,1,1,1],blend:0,double:true,texture:null},...(id==='imported-00003'?[{name:'ImportedBlockLight_HAIR',color:[1,1,1,1],double:true,texture:null},{name:'ImportedBlockDark_HAIR',color:[1,1,1,1],double:true,texture:null}]:[])],maps:[null,null,null,null]},mesh});}
  result.push({owner,mesh:id==='imported-00003'?fitImported(owner,target,state,part):id==='stone-ref'?fitStone(owner,stoneSections(owner)[part],target,state,part):authoredIds.has(id)?fitAuthored(owner,authoredSections(owner)[part],target,state,part):fit(owner,sections(owner,id)[part],target,state,part)});
 }
 if(state.braid!=='none'){const id=state.braid==='single'?'classic':'female',owner=assets[id];result.push({owner,mesh:fit(owner,sections(owner,id).tail,target,state,'tail')});}
 for(const {mesh} of result){
  const head=target.landmarks.head,face=target.meshes.find(m=>m.name==='Face'),top=target.landmarks.faceRig?.top||Math.max(...face.positions.filter((_,i)=>i%3===1))/1e5;
  const lift=((state.hairlineHeight??50)-50)*.00045+(state.faceSource==='stone'?.010:0);
  if(!lift)continue;
  mesh.positions=mesh.positions.map((v,i)=>{if(i%3!==1)return v;const x=mesh.positions[i-1]/1e5-head[0],z=mesh.positions[i+1]/1e5-head[2],y=v/1e5,front=Math.max(0,z/Math.max(1e-6,Math.hypot(x,z))),crown=Math.max(0,Math.min(1,(top+.025-y)/.065));return Math.round((y+lift*front*crown)*1e5);});
 }
 return result;
}
