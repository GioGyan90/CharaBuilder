import * as THREE from 'three';
// CC0 authored locks retain topology, normals and UVs; JS selects and reshapes sections.
export const hairDefaults={frontHair:'straight',backHair:'bob',sideHair:'short',braid:'none',frontLength:50,backLength:50,sideLength:50,braidLength:50,hairVolume:50};
export const hairChoices={frontHair:[['none','无前发'],['straight','齐刘海'],['parted','中分刘海'],['swept','层次斜刘海'],['soft','柔顺刘海'],['curtain','弧形刘海'],['buzz','圆寸顶部'],['crew','军式短顶'],['flattop','平头顶部'],['crop','短碎刘海']],backHair:[['none','无后发'],['short','层次短发'],['bob','波波后发'],['long','直长后发'],['curled','卷曲后发'],['buzz','贴头短后发'],['fade','高渐变后发']],sideHair:[['none','无侧发'],['short','波波侧发'],['layered','层次鬓发'],['long','长鬓发'],['curled','弧形侧发'],['buzz','贴头短侧发'],['fade','高渐变侧发']],braid:[['none','无发辫'],['single','侧卷马尾'],['double','双马尾']]};
export const hairRanges={frontLength:['前发长度','短','长'],backLength:['后发长度','短','长'],sideLength:['侧发长度','短','长'],braidLength:['马尾长度','短','长'],hairVolume:['蓬松度','贴合','蓬松']};
export const classicHairPresets=[
 {label:'圆寸',reference:'https://commons.wikimedia.org/wiki/File:Male_buzzcut.jpg',gender:'male',values:{frontHair:'buzz',backHair:'buzz',sideHair:'buzz',braid:'none'}},
 {label:'军式短发',reference:'https://commons.wikimedia.org/wiki/File:Crew_Cut,_Semi_Short_Taper.jpg',gender:'male',values:{frontHair:'crew',backHair:'fade',sideHair:'fade',braid:'none'}},
 {label:'方正平头',reference:'https://commons.wikimedia.org/wiki/File:PRC_flattop-2.jpg',gender:'male',values:{frontHair:'flattop',backHair:'fade',sideHair:'fade',braid:'none'}},
 {label:'短碎渐变',reference:'https://haircutinspiration.com/french-crop-haircut/#fresh-and-short-french-crop',gender:'male',values:{frontHair:'crop',backHair:'fade',sideHair:'fade',braid:'none'}},
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
 source=subdivideScalp(source,2);
 const p=[],n=[],point=new THREE.Vector3(),closest=new THREE.Vector3(),bary=new THREE.Vector3();
 for(let i=0;i<source.positions.length;i+=3){point.fromArray(source.positions,i).multiplyScalar(.00001);let best=Infinity,hit,position;
  for(const t of triangles){t.triangle.closestPointToPoint(point,closest);const d=point.distanceToSquared(closest);if(d<best){best=d;hit=t;position=closest.clone();}}
  hit.triangle.getBarycoord(position,bary);const normal=hit.normals[0].clone().multiplyScalar(bary.x).addScaledVector(hit.normals[1],bary.y).addScaledVector(hit.normals[2],bary.z).normalize();
  position.addScaledVector(normal,.0012);p.push(...position.toArray().map(v=>Math.round(v*100000)));n.push(...normal.toArray().map(v=>Math.round(v*32767)));
 }
 const result={...source,positions:p,normals:n};closeScalpCache.set(target,result);return result;
}
// Photo-observed profiles and cutting lines. Coordinates are proportions of the
// fitted head (eye to scalp apex), NOT measurements recovered from a single photo.
// See HAIR_REFERENCES.md for image sources, observations and unseen-side assumptions.
const shortProfiles={
 buzz:{deck:[[-1,.65],[-.65,.87],[0,1.012],[.55,.93],[1,.66]],width:[0,.92],density:.66,fade:[[-.15,.22],[.20,.53],[.55,.69],[1,.72]]},
 crew:{deck:[[-1,.68],[-.65,.97],[0,1.07],[.45,1.10],[.82,1.04],[1,.87]],width:[.60,.93],density:.96,fade:[[-.12,.035],[.15,.12],[.38,.42],[.63,.9],[1,1]]},
 flattop:{deck:[[-1,.79],[-.70,1.10],[-.3,1.105],[.20,1.11],[.7,1.105],[1,.98]],width:[.75,.99],density:.96,fade:[[-.12,.09],[.12,.20],[.45,.58],[.74,.96],[1,1]]},
 crop:{deck:[[-1,.70],[-.65,1.04],[0,1.10],[.50,1.025],[.84,.85],[1,.67]],width:[.60,.94],density:.98,fade:[[-.12,.02],[.13,.09],[.40,.35],[.70,.93],[1,1]]}
};
const clip01=v=>Math.max(0,Math.min(1,v));
function sampleProfile(points,t){if(t<=points[0][0])return points[0][1];for(let i=1;i<points.length;i++)if(t<=points[i][0]){const [a,x]=points[i-1],[b,y]=points[i];return x+(y-x)*(t-a)/(b-a);}return points.at(-1)[1];}
function smooth(a,b,v){const t=clip01((v-a)/(b-a));return t*t*(3-2*t);}
function subdivideScalp(source,steps){
 const p=[...source.positions],uv=[...source.uv];let indices=source.groups.flatMap(g=>g.indices);
 for(let step=0;step<steps;step++){const edges=new Map(),out=[];
  function midpoint(a,b){const key=Math.min(a,b)+':'+Math.max(a,b);if(edges.has(key))return edges.get(key);const id=p.length/3;for(let k=0;k<3;k++)p.push((p[a*3+k]+p[b*3+k])/2);for(let k=0;k<2;k++)uv.push((uv[a*2+k]+uv[b*2+k])/2);edges.set(key,id);return id;}
  for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3),ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);out.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}indices=out;
 }
 return {...source,positions:p,uv,normals:new Array(p.length).fill(0),groups:[{material:0,indices}]};
}
function shortMeshes(cap,target,state){
 const base=closeScalp(cap,target),eye=eyeHeight(target),cz=target.landmarks.head[2];
 const height=Math.max(...base.positions.filter((_,i)=>i%3===1))/100000-eye;
 const halfWidth=Math.max(...base.positions.filter((_,i)=>i%3===0).map(v=>Math.abs(v)))/100000;
 const frontZ=Math.max(...base.positions.filter((_,i)=>i%3===2))/100000,backZ=Math.min(...base.positions.filter((_,i)=>i%3===2))/100000;
 const style=shortProfiles[state.frontHair]?state.frontHair:'buzz',profile=shortProfiles[style],positions=[],coverage=[],uv=[];
 const length=.85+(state.frontLength??50)*.003,volume=1+((state.hairVolume??50)-50)*.0008;
 for(let i=0;i<base.positions.length;i+=3){let x=base.positions[i]/100000,y=base.positions[i+1]/100000,z=base.positions[i+2]/100000;
  const nx=Math.abs(x)/halfWidth,ny=(y-eye)/height,nz=z>=cz?(z-cz)/(frontZ-cz):(z-cz)/(cz-backZ);
  const shoulder=1-smooth(...profile.width,nx),topMask=smooth(.40,.85,ny)*shoulder;
  if(style!=='buzz'){const lateralFall=style==='flattop'?.025:style==='crew'?.25:.20;const deck=eye+height*(sampleProfile(profile.deck,nz)-lateralFall*nx*nx);y+=Math.max(0,deck-y)*topMask*length;}
  const amount=style==='buzz'?.0008+.0015*(state.frontLength??50)/100:.0015;
  x+=base.normals[i]/32767*amount;z+=base.normals[i+2]/32767*amount;
  x*=1+(volume-1)*topMask;positions.push(Math.round(x*100000),Math.round(y*100000),Math.round(z*100000));
  // Rounded central hairline, recessed temple corners, close-cut sideburns.
  const hairline=.34+.13*smooth(.45,.82,nx)-.12*smooth(.86,1,nx);
  const edge=(nz>.28)?smooth(hairline-.015,hairline+.055,ny):1;
  const fade=(nx>.55&&state.sideHair==='fade')||(nz<.1&&state.backHair==='fade');
  const density=fade?sampleProfile(profile.fade,ny):profile.density;
  coverage.push(clip01(density*edge));uv.push((x/halfWidth+1)/2,(z-backZ)/(frontZ-backZ));
 }
 const owner={materials:[{name:'ReferenceStubble_HAIR',color:[1,1,1,1],double:true,blend:0,texture:null,shortHair:true}],maps:[]};
 const all=base.groups.flatMap(g=>g.indices),parts={front:[],side:[],back:[]};
 for(let i=0;i<all.length;i+=3){const ids=all.slice(i,i+3);let x=0,y=0;for(const id of ids){x+=positions[id*3]/300000;y+=positions[id*3+1]/300000;}
  const part=y>eye+height*.58?'front':Math.abs(x)>halfWidth*.65?'side':'back';parts[part].push(...ids);
 }
 const names={front:'HairFront',side:'HairSide',back:'HairBack'},result=[];
 for(const part of ['front','side','back'])if(parts[part].length)result.push({owner,mesh:{...base,name:names[part],positions,uv,coverage,normalIndices:all,groups:[{material:0,indices:parts[part]}]}});
 if(style!=='buzz')result.push(referenceShortLocks(style,{eye,cz,height,halfWidth,frontZ,backZ,surface:positions,surfaceIndices:all},state));
 return result;
}
// Explicit cutting guides: crown-to-front lift for crew; forward, irregular blunt
// fringe for crop; upright bristles along a level deck for flattop. No bob reuse.
const shortGuides={
 crew:[[-.81,-.62,.72],[-.62,-.38,.89],[-.41,-.30,.98],[-.20,-.27,1.03],[.02,-.27,1.045],[.23,-.30,1.02],[.44,-.34,.98],[.65,-.42,.88],[.81,-.60,.72]],
 crop:[[-.82,-.58,.51],[-.63,-.40,.48],[-.43,-.31,.50],[-.22,-.27,.465],[.01,-.28,.49],[.22,-.30,.45],[.43,-.35,.49],[.63,-.45,.475],[.82,-.60,.52]],
 flattop:[[-.77,-.5,1.095],[-.56,-.46,1.105],[-.35,-.46,1.105],[-.14,-.44,1.11],[.07,-.45,1.11],[.28,-.45,1.105],[.49,-.47,1.105],[.70,-.51,1.095]]
};
function referenceShortLocks(style,head,state){
 const {eye,cz,height:h,halfWidth:w,frontZ,backZ}=head,positions=[],indices=[],uv=[];
 const length=.85+(state.frontLength??50)*.003;
 const surface=head.surface,triangles=[];
 for(let k=0;k<head.surfaceIndices.length;k+=3){const vertices=head.surfaceIndices.slice(k,k+3).map(i=>new THREE.Vector3(...surface.slice(i*3,i*3+3).map(v=>v/100000)));triangles.push(new THREE.Triangle(...vertices));}
 function onSurface(p){const point=new THREE.Vector3(...p),closest=new THREE.Vector3();let best=Infinity,position,normal;
  for(const triangle of triangles){triangle.closestPointToPoint(point,closest);const d=closest.distanceToSquared(point);if(d<best){best=d;position=closest.clone();normal=triangle.getNormal(new THREE.Vector3());}}
  // Winding differs between donor islands; use the outward head direction.
  const outward=position.clone().sub(new THREE.Vector3(0,eye+h*.25,cz));if(normal.dot(outward)<0)normal.negate();return position.addScaledVector(normal,.002).toArray();
 }
 function lock(points,width,freeTip=false){const start=positions.length/3;
  points.forEach((p,k)=>{if(!(freeTip&&k===points.length-1))p=onSurface(p);const spread=width*(k===points.length-1?(freeTip?.78:.12):k===0?.55:1);for(const side of [-1,0,1]){positions.push(Math.round((p[0]+side*spread)*100000),Math.round((p[1]+(side===0?.0017:0))*100000),Math.round(p[2]*100000));uv.push((side+1)/2,k/(points.length-1));}});
  for(let k=0;k<points.length-1;k++)for(let j=0;j<2;j++){const a=start+k*3+j,b=a+3;indices.push(a,b,a+1,a+1,b,b+1);}
 }
 for(const [column,startZ,tipY] of shortGuides[style]){
  const x=column*w,shoulder=1-Math.abs(column)*.25;
  if(style==='flattop'){
   for(const nz of [-.5,-.22,.06,.34,.62]){const z=cz+nz*(nz>0?frontZ-cz:cz-backZ),y=eye+h*tipY;lock([[x,y-.012*length,z-.005],[x+.001,y-.005,z],[x+.0015,y+.002*length,z+.002]],w*.023);}
  }else{
   // Layered flow follows the observed direction; small overlap breaks a solid cap.
   for(const row of [0,1,2]){const nz=startZ+row*.29,z=cz+nz*(nz>0?frontZ-cz:cz-backZ),rootY=eye+h*sampleProfile(shortProfiles[style].deck,nz)*shoulder;
    const tipZ=style==='crop'?frontZ+.002:frontZ-.014;
    const endY=row===2?(style==='crop'?eye+h*(.34+(tipY-.48)*.5)*length:eye+h*tipY):eye+h*(style==='crop'?.82:1.03)*shoulder;
    let end=[x+.001,endY,tipZ-(2-row)*.019];if(style==='crop'&&row===2){end=onSurface([x+.001,endY,frontZ]);end[1]-=.003;end[2]+=.002;}lock([[x,rootY+.001,z],[x-.002,Math.max(rootY,endY)+.002*length,z+(tipZ-z)*.45],end],w*(style==='crop'&&row===2?.125:style==='crop'?.065:.045),style==='crop'&&row===2);
   }
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions.map(v=>v/100000),3));geometry.setIndex(indices);geometry.computeVertexNormals();const normals=Array.from(geometry.attributes.normal.array,v=>Math.round(v*32767));geometry.dispose();
 return {owner:{materials:[{name:'ReferenceLocks_HAIR',color:[1,1,1,1],double:true,blend:0,texture:null}],maps:[]},mesh:{name:'HairFront',positions,normals,uv,groups:[{material:0,indices}],expressions:{}}};
}
export function referenceHairMeshes(assets,input){
 const state={...hairDefaults,...input},target=assets[state.gender],result=[];
 const bald=['frontHair','backHair','sideHair','braid'].every(k=>state[k]==='none');if(bald)return result;
 const capOwner=assets[state.gender==='male'?'uniform':'bob'];
 const capId=state.gender==='male'?'uniform':'bob';
 const cap=fit(capOwner,sections(capOwner,capId).cap,target,croppedFronts.has(state.frontHair)?{...state,hairVolume:50}:state,'cap');
 if(croppedFronts.has(state.frontHair)){const shorts=shortMeshes(cap,target,state);for(const part of shorts){const key=part.mesh.name==='HairFront'?'frontHair':part.mesh.name==='HairSide'?'sideHair':'backHair';if(key==='frontHair'||croppedSides.has(state[key]))result.push(part);}}
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

function eyeHeight(target){return (target.landmarks.leftEye[1]+target.landmarks.rightEye[1])/2;}
