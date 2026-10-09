import * as THREE from 'three';
// Authored CC0 meshes: preserve polygons, locks, UVs and normals; only fit/split them.
export const hairDefaults={frontHair:'straight',backHair:'bob',sideHair:'short',braid:'none',frontLength:50,backLength:50,sideLength:50,braidLength:50,hairVolume:50};
export const hairChoices={frontHair:[['none','无前发'],['straight','齐刘海'],['parted','中分刘海'],['swept','层次斜刘海'],['soft','柔顺刘海'],['curtain','弧形刘海'],['sidepart','侧分短发 · 原模型'],['upcomb','上梳短发 · 原模型']],backHair:[['none','无后发'],['short','层次短发'],['bob','波波后发'],['long','直长后发'],['curled','卷曲后发'],['sidepart','侧分短后发'],['upcomb','上梳短后发']],sideHair:[['none','无侧发'],['short','波波侧发'],['layered','层次鬓发'],['long','长鬓发'],['curled','弧形侧发'],['sidepart','侧分短侧发'],['upcomb','上梳短侧发']],braid:[['none','无发辫'],['single','侧卷马尾'],['double','双马尾']]};
export const hairRanges={frontLength:['前发长度','短','长'],backLength:['后发长度','短','长'],sideLength:['侧发长度','短','长'],braidLength:['马尾长度','短','长'],hairVolume:['蓬松度','贴合','蓬松']};
export const classicHairPresets=[
 {label:'侧分短发',gender:'male',reference:'https://opengameart.org/content/side-parting-hairstyle-for-male-model',values:{frontHair:'sidepart',backHair:'sidepart',sideHair:'sidepart',braid:'none'}},
 {label:'上梳短发',gender:'male',reference:'https://opengameart.org/content/upcomb-hair-style-for-male-model',values:{frontHair:'upcomb',backHair:'upcomb',sideHair:'upcomb',braid:'none'}},
 {label:'经典波波',gender:'female',values:{frontHair:'straight',backHair:'bob',sideHair:'short',braid:'none'}},
 {label:'柔顺长发',gender:'female',values:{frontHair:'soft',backHair:'long',sideHair:'long',braid:'none'}},
 {label:'层次短发',values:{frontHair:'swept',backHair:'short',sideHair:'layered',braid:'none'}},
 {label:'双马尾',gender:'female',values:{frontHair:'parted',backHair:'none',sideHair:'none',braid:'double'}},
 {label:'侧卷马尾',gender:'female',values:{frontHair:'curtain',backHair:'curled',sideHair:'curled',braid:'single'}}
];
// Product selection policy, not a statement about who may wear a real hairstyle.
export const genderHairValues={male:{frontHair:['none','swept','sidepart','upcomb'],backHair:['none','short','sidepart','upcomb'],sideHair:['none','layered','sidepart','upcomb'],braid:['none']},female:{frontHair:['none','straight','parted','swept','soft','curtain'],backHair:['none','short','bob','long','curled'],sideHair:['none','short','layered','long','curled'],braid:['none','single','double']}};
export function hairOptionsFor(key,gender){const allowed=genderHairValues[gender]?.[key];return allowed?hairChoices[key].filter(([value])=>allowed.includes(value)):hairChoices[key];}
export function filterHairForGender(input){const out={...input},gender=out.gender==='male'?'male':'female';const fallback=gender==='male'?{frontHair:'sidepart',backHair:'sidepart',sideHair:'sidepart',braid:'none'}:hairDefaults;
 for(const key of ['frontHair','backHair','sideHair','braid'])if(!hairOptionsFor(key,gender).some(([value])=>value===out[key]))out[key]=fallback[key];return out;}
const skullCache=new WeakMap();
const frontOwners={straight:'bob',parted:'female',swept:'uniform',soft:'long',curtain:'classic',sidepart:'sidepart',upcomb:'upcomb'};
const backOwners={short:'uniform',bob:'bob',long:'long',curled:'classic',sidepart:'sidepart',upcomb:'upcomb'};
const sideOwners={short:'bob',layered:'uniform',long:'long',curled:'classic',sidepart:'sidepart',upcomb:'upcomb'};
export function hairAssetIds(input){const state={...hairDefaults,...input};if(['frontHair','backHair','sideHair','braid'].every(k=>state[k]==='none'))return [];return [...new Set([state.gender==='male'?'uniform':'bob',frontOwners[state.frontHair],backOwners[state.backHair],sideOwners[state.sideHair],state.braid==='single'?'classic':state.braid==='double'?'female':null].filter(Boolean))];}
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

const authoredIds=new Set(['sidepart','upcomb']);
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
 for(let i=0;i<source.positions.length;i+=3){const x=source.positions[i]/100000,y=source.positions[i+1]/100000,z=source.positions[i+2]/100000;
  // The whole authored mesh shares one deformation field across all three
  // sections. Length sliders must not tear a shared polygon seam apart.
  const clamp=v=>Math.max(0,Math.min(1,v)),ramp=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
  const back=1-ramp(1,8,z),front=ramp(3,10,z)*(1-ramp(5.5,9,Math.abs(x))),side=Math.max(0,1-front-back),sum=front+back+side;
  const length=1+((front*((state.frontLength??50)-50)+back*((state.backLength??50)-50)+side*((state.sideLength??50)-50))/sum)*.0012;
  const down=y<24?24+(y-24)*length:y;
  positions.push(Math.round(x*sx*100000),Math.round((eye+(down-14)*sy)*100000),Math.round((cz+(z-3)*sz)*100000));
  const n=new THREE.Vector3(source.normals[i]/sx,source.normals[i+1]/(sy*(y<24?length:1)),source.normals[i+2]/sz).normalize();normals.push(...n.toArray().map(v=>Math.round(v*32767)));
 }
 return {...source,name:part==='front'?'HairFront':part==='back'?'HairBack':'HairSide',positions,normals,expressions:{}};
}
export function referenceHairMeshes(assets,input){
 const state={...hairDefaults,...input},target=assets[state.gender],result=[];
 if(['frontHair','backHair','sideHair','braid'].every(k=>state[k]==='none'))return result;
 const keys=[['frontHair','front',frontOwners],['backHair','back',backOwners],['sideHair','side',sideOwners]];
 // A complete authored short hairstyle already includes its own scalp surface.
 if(!keys.every(([key])=>authoredIds.has(state[key]))){const id=state.gender==='male'?'uniform':'bob',owner=assets[id];result.push({owner,mesh:fit(owner,sections(owner,id).cap,target,state,'cap')});}
 for(const [key,part,table] of keys){const id=table[state[key]];if(!id)continue;const owner=assets[id];
  result.push({owner,mesh:authoredIds.has(id)?fitAuthored(owner,authoredSections(owner)[part],target,state,part):fit(owner,sections(owner,id)[part],target,state,part)});
 }
 if(state.braid!=='none'){const id=state.braid==='single'?'classic':'female',owner=assets[id];result.push({owner,mesh:fit(owner,sections(owner,id).tail,target,state,'tail')});}
 return result;
}
