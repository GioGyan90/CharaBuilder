import * as THREE from 'three';
// CC0 authored locks retain topology, normals and UVs; JS selects and reshapes sections.
export const hairDefaults={frontHair:'straight',backHair:'bob',sideHair:'short',braid:'none',frontLength:50,backLength:50,sideLength:50,braidLength:50,hairVolume:50};
export const hairChoices={frontHair:[['none','无前发'],['straight','齐刘海'],['parted','中分刘海'],['swept','层次斜刘海'],['soft','柔顺刘海'],['curtain','弧形刘海'],['buzz','圆寸顶部'],['crew','陆军短顶'],['flattop','平头顶部'],['crop','短碎刘海']],backHair:[['none','无后发'],['short','层次短发'],['bob','波波后发'],['long','直长后发'],['curled','卷曲后发'],['buzz','贴头短后发'],['fade','高渐变后发']],sideHair:[['none','无侧发'],['short','波波侧发'],['layered','层次鬓发'],['long','长鬓发'],['curled','弧形侧发'],['buzz','贴头短侧发'],['fade','高渐变侧发']],braid:[['none','无发辫'],['single','侧卷马尾'],['double','双马尾']]};
export const hairRanges={frontLength:['前发长度','短','长'],backLength:['后发长度','短','长'],sideLength:['侧发长度','短','长'],braidLength:['马尾长度','短','长'],hairVolume:['蓬松度','贴合','蓬松']};
export const classicHairPresets=[
 {label:'圆寸',gender:'male',values:{frontHair:'buzz',backHair:'buzz',sideHair:'buzz',braid:'none'}},
 {label:'陆军短发',gender:'male',values:{frontHair:'crew',backHair:'fade',sideHair:'fade',braid:'none'}},
 {label:'方正平头',gender:'male',values:{frontHair:'flattop',backHair:'fade',sideHair:'fade',braid:'none'}},
 {label:'短碎渐变',gender:'male',values:{frontHair:'crop',backHair:'buzz',sideHair:'fade',braid:'none'}},
 {label:'经典波波',values:{frontHair:'straight',backHair:'bob',sideHair:'short',braid:'none'}},
 {label:'柔顺长发',values:{frontHair:'soft',backHair:'long',sideHair:'long',braid:'none'}},
 {label:'层次短发',values:{frontHair:'swept',backHair:'short',sideHair:'layered',braid:'none'}},
 {label:'双马尾',values:{frontHair:'parted',backHair:'none',sideHair:'none',braid:'double'}},
 {label:'侧卷马尾',values:{frontHair:'curtain',backHair:'curled',sideHair:'curled',braid:'single'}}
];
const skullCache=new WeakMap();
const croppedFronts=new Set(['buzz','crew','flattop','crop']),croppedSides=new Set(['buzz','fade']);
const closeScalpCache=new WeakMap();
const frontOwners={straight:'bob',parted:'female',swept:'uniform',soft:'long',curtain:'classic',buzz:'uniform',crew:'uniform',flattop:'uniform',crop:'bob'};
const backOwners={short:'uniform',bob:'bob',long:'long',curled:'classic',buzz:'uniform',fade:'uniform'};
const sideOwners={short:'bob',layered:'uniform',long:'long',curled:'classic',buzz:'uniform',fade:'uniform'};
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
// Project the existing authored scalp onto the CC0 base head surface. This retains
// the donor hairline and topology instead of building a new ellipsoid-shaped head.
function closeScalp(source,target){
 if(closeScalpCache.has(target))return closeScalpCache.get(target);
 const triangles=[],neck=target.landmarks.neck[1];
 for(const mesh of target.meshes.filter(m=>m.name==='Body'||m.name==='Face'))for(const g of mesh.groups.filter(g=>target.materials[g.material].name.includes('_SKIN'))){
  for(let i=0;i<g.indices.length;i+=3){const ids=g.indices.slice(i,i+3);if(ids.some(id=>mesh.positions[id*3+1]/100000<neck+.035))continue;
   const vertices=ids.map(id=>new THREE.Vector3(...mesh.positions.slice(id*3,id*3+3).map(v=>v/100000)));
   const normals=ids.map(id=>new THREE.Vector3(...mesh.normals.slice(id*3,id*3+3).map(v=>v/32767)));
   triangles.push({triangle:new THREE.Triangle(...vertices),normals});
  }
 }
 const p=[],n=[],point=new THREE.Vector3(),closest=new THREE.Vector3(),bary=new THREE.Vector3();
 for(let i=0;i<source.positions.length;i+=3){point.fromArray(source.positions,i).multiplyScalar(.00001);let best=Infinity,hit,position;
  for(const t of triangles){t.triangle.closestPointToPoint(point,closest);const d=point.distanceToSquared(closest);if(d<best){best=d;hit=t;position=closest.clone();}}
  hit.triangle.getBarycoord(position,bary);const normal=hit.normals[0].clone().multiplyScalar(bary.x).addScaledVector(hit.normals[1],bary.y).addScaledVector(hit.normals[2],bary.z).normalize();
  position.addScaledVector(normal,.0035);p.push(...position.toArray().map(v=>Math.round(v*100000)));n.push(...normal.toArray().map(v=>Math.round(v*32767)));
 }
 const result={...source,positions:p,normals:n};closeScalpCache.set(target,result);return result;
}
function shortMeshes(cap,target,state){
 const base=closeScalp(cap,target),eye=(target.landmarks.leftEye[1]+target.landmarks.rightEye[1])/2,cz=target.landmarks.head[2],top=Math.max(...base.positions.filter((_,i)=>i%3===1))/100000;
 const positions=[...base.positions],coverage=[],style=state.frontHair;
 for(let i=0;i<positions.length;i+=3){let x=positions[i]/100000,y=positions[i+1]/100000,z=positions[i+2]/100000;
  const crown=Math.max(0,Math.min(1,(y-(eye+.045))/.080)),front=Math.max(0,Math.min(1,(z-cz+.035)/.13));
  // Crew: longer front, shorter crown; flattop: a level top with rounded shoulders.
  if(style==='crew'||style==='crop')y+=crown*(style==='crew'?.011+.020*front:.014)*(0.7+(state.frontLength??50)*.006);
  if(style==='flattop')y+=(top+.028-y)*crown*crown;
  const volume=Math.max(0,(state.hairVolume??50)-50)*.000025;const length=(y>eye+.08?(state.frontLength??50):Math.abs(x)>.06?(state.sideLength??50):(state.backLength??50))*.000016;
  x+=base.normals[i]/32767*(volume+length);y+=base.normals[i+1]/32767*(volume+length);z+=base.normals[i+2]/32767*(volume+length);positions[i]=Math.round(x*100000);positions[i+2]=Math.round(z*100000);
  positions[i+1]=Math.round(y*100000);
  const side=Math.abs(x)>.060,back=z<cz+.012;
  const fade=(side&&state.sideHair==='fade')||(back&&state.backHair==='fade');
  const density=fade?Math.max(.055,Math.min(1,(y-eye+.010)/.100)):.86;
  coverage.push(crown>.65?1:density);
 }
 const owner={materials:[{name:'CloseCut_HAIR',color:[1,1,1,1],double:true,blend:0,texture:null,shortHair:true}],maps:[]};
 const all=base.groups.flatMap(g=>g.indices),parts={front:[],side:[],back:[]};
 for(let i=0;i<all.length;i+=3){const ids=all.slice(i,i+3);let x=0,y=0,z=0;for(const id of ids){x+=positions[id*3]/300000;y+=positions[id*3+1]/300000;z+=positions[id*3+2]/300000;}
  const part=y>eye+.08?'front':Math.abs(x)>.060?'side':'back';parts[part].push(...ids);
 }
 const names={front:'HairFront',side:'HairSide',back:'HairBack'};
 const result=[];for(const part of ['front','side','back'])if(parts[part].length)result.push({owner,mesh:{...base,name:names[part],positions,coverage,normalIndices:all,groups:[{material:0,indices:parts[part]}]}});
 return result;
}
export function referenceHairMeshes(assets,input){
 const state={...hairDefaults,...input},target=assets[state.gender],result=[];
 const bald=['frontHair','backHair','sideHair','braid'].every(k=>state[k]==='none');if(bald)return result;
 const capOwner=assets[state.gender==='male'?'uniform':'bob'];
 const capId=state.gender==='male'?'uniform':'bob';
 const cap=fit(capOwner,sections(capOwner,capId).cap,target,croppedFronts.has(state.frontHair)?{...state,hairVolume:50}:state,'cap');
 if(croppedFronts.has(state.frontHair)){const shorts=shortMeshes(cap,target,state);for(const part of shorts){const key=part.mesh.name==='HairFront'?'frontHair':part.mesh.name==='HairSide'?'sideHair':'backHair';if(key==='frontHair'||croppedSides.has(state[key]))result.push(part);}if(state.frontHair==='crop'){const owner=assets.bob,locks=fringeLocks(fit(owner,sections(owner,'bob').front,target,{...state,frontLength:50},'front'));const p=[...locks.positions],anchor=eyeHeight(target)+.067;for(let i=0;i<p.length;i+=3)if(p[i+1]/100000<anchor)p[i+1]=Math.round((anchor+(p[i+1]/100000-anchor)*.30)*100000);result.push({owner,mesh:{...locks,positions:p}});}}
 else result.push({owner:capOwner,mesh:cap});
 for(const [key,part,table] of [['frontHair','front',frontOwners],['backHair','back',backOwners],['sideHair','side',sideOwners]]){
  if(key==='frontHair'&&croppedFronts.has(state[key]))continue;
  if((key==='backHair'||key==='sideHair')&&croppedSides.has(state[key])){if(!croppedFronts.has(state.frontHair)){const name=key==='backHair'?'HairBack':'HairSide';result.push(...shortMeshes(cap,target,state).filter(p=>p.mesh.name===name));}continue;}
  const id=table[state[key]];if(!id)continue;const owner=assets[id];const mesh=sections(owner,id)[part];
  result.push({owner,mesh:fit(owner,mesh,target,state,part)});
 }
 if(state.braid!=='none'){
  const id=state.braid==='single'?'classic':'female',owner=assets[id],mesh=sections(owner,id).tail;
  result.push({owner,mesh:fit(owner,mesh,target,state,'tail')});
 }
 return result;
}

function fringeLocks(source){
 const parents=new Map();function root(i){if(!parents.has(i))parents.set(i,i);while(parents.get(i)!==i)i=parents.get(i);return i;}
 for(const g of source.groups)for(let i=0;i<g.indices.length;i+=3){const [a,b,c]=g.indices.slice(i,i+3);parents.set(root(b),root(a));parents.set(root(c),root(a));}
 const components=new Map();for(const id of parents.keys()){const r=root(id);if(!components.has(r))components.set(r,[]);components.get(r).push(id);}
 const keep=new Set();for(const [r,ids] of components){const tips=[...ids].sort((a,b)=>source.positions[a*3+1]-source.positions[b*3+1]).slice(0,Math.max(1,Math.ceil(ids.length*.2)));const x=tips.reduce((s,id)=>s+source.positions[id*3]/100000,0)/tips.length;if(Math.abs(x)<.064)keep.add(r);}
 return compact({...source,groups:source.groups.map(g=>({...g,indices:g.indices.filter((_,i)=>keep.has(root(g.indices[i-i%3])))})).filter(g=>g.indices.length)});
}
function eyeHeight(target){return (target.landmarks.leftEye[1]+target.landmarks.rightEye[1])/2;}
