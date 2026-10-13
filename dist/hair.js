import * as THREE from 'three';
// Library hair meshes and the user-provided Stone extraction; fit/split original strands.
export const hairDefaults={frontHair:'straight',backHair:'bob',sideHair:'short',braid:'none',frontLength:50,backLength:50,sideLength:50,braidLength:50,hairVolume:50,hairlineHeight:50,sideHairColor:'#929590'};
export const hairChoices={frontHair:[['stoneOriginal','Stone · 原版前发'],['none','无前发'],['straight','齐刘海'],['parted','中分刘海'],['swept','层次斜刘海'],['soft','柔顺刘海'],['curtain','弧形刘海'],['sidepart','侧分短发 · 原模型'],['upcomb','上梳短发 · 原模型'],['layered06','分层短发 · culturalibre']],backHair:[['stoneOriginal','Stone · 原版后发'],['none','无后发'],['short','层次短发'],['bob','波波后发'],['long','直长后发'],['curled','卷曲后发'],['sidepart','侧分短后发'],['upcomb','上梳短后发'],['layered06','分层短后发']],sideHair:[['stoneOriginal','Stone · 原版侧发'],['none','无侧发'],['short','波波侧发'],['layered','层次鬓发'],['long','长鬓发'],['curled','弧形侧发'],['sidepart','侧分短侧发'],['upcomb','上梳短侧发'],['layered06','分层短侧发']],braid:[['none','无发辫'],['single','侧卷马尾'],['double','双马尾']]};
export const hairRanges={hairlineHeight:['发际线高度','低','高'],frontLength:['前发长度','短','长'],backLength:['后发长度','短','长'],sideLength:['侧发长度','短','长'],braidLength:['马尾长度','短','长'],hairVolume:['蓬松度','贴合','蓬松']};
export const classicHairPresets=[
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
export const genderHairValues={male:{frontHair:['stoneOriginal','none','swept','sidepart','upcomb','layered06'],backHair:['stoneOriginal','none','short','sidepart','upcomb','layered06'],sideHair:['stoneOriginal','none','layered','sidepart','upcomb','layered06'],braid:['none']},female:{frontHair:['none','straight','parted','swept','soft','curtain'],backHair:['none','short','bob','long','curled'],sideHair:['none','short','layered','long','curled'],braid:['none','single','double']}};
export function hairOptionsFor(key,gender,faceSource){const allowed=genderHairValues[gender]?.[key];return allowed?hairChoices[key].filter(([value])=>allowed.includes(value)&&value!=='stoneRef'):hairChoices[key];}
export function filterHairForGender(input){const out={...input},gender=out.gender==='male'?'male':'female';const fallback=gender==='male'?{frontHair:'sidepart',backHair:'sidepart',sideHair:'sidepart',braid:'none'}:hairDefaults;
 for(const key of ['frontHair','backHair','sideHair'])if(out[key]==='stoneRef')out[key]='none';
 for(const key of ['frontHair','backHair','sideHair','braid'])if(!hairOptionsFor(key,gender,out.faceSource).some(([value])=>value===out[key]))out[key]=fallback[key];return out;}
const skullCache=new WeakMap();
const frontOwners={stoneOriginal:'stone-ref',straight:'bob',parted:'female',swept:'uniform',soft:'long',curtain:'classic',sidepart:'sidepart',upcomb:'upcomb',layered06:'layered06'};
const backOwners={stoneOriginal:'stone-ref',short:'uniform',bob:'bob',long:'long',curled:'classic',sidepart:'sidepart',upcomb:'upcomb',layered06:'layered06'};
const sideOwners={stoneOriginal:'stone-ref',short:'bob',layered:'uniform',long:'long',curled:'classic',sidepart:'sidepart',upcomb:'upcomb',layered06:'layered06'};
export function hairAssetIds(input){const state={...hairDefaults,...input};if(['frontHair','backHair','sideHair','braid'].every(k=>state[k]==='none'))return [];return [...new Set([['frontHair','backHair','sideHair'].every(key=>['sidepart','upcomb','layered06','stoneOriginal'].includes(state[key]))?null:state.gender==='male'?'uniform':'bob',frontOwners[state.frontHair],backOwners[state.backHair],sideOwners[state.sideHair],state.braid==='single'?'classic':state.braid==='double'?'female':null].filter(Boolean))];}
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
function stoneUndercut(owner,target,state,part){
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
 const positions=[],normals=[],uv=[],indices=[],segments=part==='side'?20:16,rows=8;
 const length=((state[part==='side'?'sideLength':'backLength']??50)-50)/50;
 for(const sign of [-1,1]){
  const offset=positions.length/3;
  for(let i=0;i<=segments;i++){
   const a=(part==='side'?.85:2.10)+(part==='side'?1.25:Math.PI-2.10)*i/segments,theta=sign*a;
   const bottom=eye-.050+.055*Math.exp(-(((a-1.45)/.30)**2))-.020*Math.max(0,Math.min(1,(a-1.8)/.8))-length*.022*(1-Math.exp(-(((a-1.50)/.60)**2)));
   for(let j=0;j<=rows;j++){
    const t=j/rows,edgeTheta=theta+sign*.35*t**1.3*(part==='side'?(1-i/segments)**4:0);
    const y=top-.028+(bottom-(top-.028))*t,r=radius(edgeTheta,y)+.0025;
    positions.push(Math.round((cx+Math.sin(edgeTheta)*r)*1e5),Math.round(y*1e5),Math.round((cz+Math.cos(edgeTheta)*r)*1e5));
    normals.push(Math.round(Math.sin(edgeTheta)*32767),0,Math.round(Math.cos(edgeTheta)*32767));uv.push(Math.round(i/segments*65535),Math.round(j/rows*65535));
   }
  }
  for(let i=0;i<segments;i++)for(let j=0;j<rows;j++){const a=offset+i*(rows+1)+j,b=a+rows+1;indices.push(...(sign>0?[a,a+1,b,b,a+1,b+1]:[a,b,a+1,b,b+1,a+1]));}
 }
 const gray=[],dark=[];for(let k=0;k<indices.length;k+=3){const tri=indices.slice(k,k+3),y=tri.reduce((n,i)=>n+positions[i*3+1]/3e5,0);(y<top-.075?gray:dark).push(...tri);}
 return {name:part==='side'?'HairSideUndercut':'HairBackUndercut',positions,normals,uv,groups:[{material:0,indices:gray},{material:1,indices:dark}],expressions:{}};
}
export function referenceHairMeshes(assets,input){
 const state={...hairDefaults,...input},target=assets[state.gender],result=[];
 if(['frontHair','backHair','sideHair','braid'].every(k=>state[k]==='none'))return result;
 const keys=[['frontHair','front',frontOwners],['backHair','back',backOwners],['sideHair','side',sideOwners]];
 // A complete authored short hairstyle already includes its own scalp surface.
 if(!keys.every(([key])=>(authoredIds.has(state[key])||state[key]==='stoneOriginal'))){const id=state.gender==='male'?'uniform':'bob',owner=assets[id];result.push({owner,mesh:fit(owner,sections(owner,id).cap,target,state,'cap')});}
 for(const [key,part,table] of keys){const id=table[state[key]];if(!id)continue;const owner=assets[id];
  if(id==='stone-ref'&&part!=='front'){const mesh=stoneUndercut(owner,target,state,part);result.push({owner:{materials:[{name:'StoneSide_HAIR',color:[1,1,1,1],blend:0,double:true,texture:null},{name:'StoneUnderBase_HAIR',color:[1,1,1,1],blend:0,double:true,texture:null}],maps:[null,null]},mesh});}
  result.push({owner,mesh:id==='stone-ref'?fitStone(owner,stoneSections(owner)[part],target,state,part):authoredIds.has(id)?fitAuthored(owner,authoredSections(owner)[part],target,state,part):fit(owner,sections(owner,id)[part],target,state,part)});
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
