// Eye-specific skin flaps. Roots follow the exact v103 cut boundary; globes never shrink.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const normalCache=new WeakMap();
function rootNormals(head){
 if(normalCache.has(head))return normalCache.get(head);
 const map=new Map();for(let i=0;i<head.positions.length;i+=3){const key=head.positions.slice(i,i+3).map(x=>Math.round(x*100)).join(',');if(!map.has(key))map.set(key,head.normals.slice(i,i+3).map(x=>x/32767));}
 normalCache.set(head,map);return map;
}
const key=p=>p.map(x=>Math.round(x*1e7)).join(',');
function splitRim(spec){
 const points=spec.rim,N=points.length,x=p=>p[0]*spec.side;
 let inner=0,outer=0;for(let i=1;i<N;i++){if(x(points[i])<x(points[inner]))inner=i;if(x(points[i])>x(points[outer]))outer=i;}
 const chain=step=>{const out=[];let i=inner;while(true){out.push(points[i]);if(i===outer)break;i=(i+step+N)%N;}return out;};
 const chains=[chain(1),chain(-1)].sort((a,b)=>b.reduce((s,p)=>s+p[1],0)/b.length-a.reduce((s,p)=>s+p[1],0)/a.length);
 const lo=x(points[inner]),hi=x(points[outer]),u=p=>(x(p)-lo)/(hi-lo);
 const paths=chains.map(path=>path.map(p=>({u:u(p),p})).sort((a,b)=>a.u-b.u));
 function sample(which,t){const path=paths[which];if(t<=0)return [...points[inner]];if(t>=1)return [...points[outer]];let i=1;while(i<path.length-1&&path[i].u<t)i++;const a=path[i-1],b=path[i],w=clamp((t-a.u)/(b.u-a.u||1));return a.p.map((v,k)=>v+(b.p[k]-v)*w);}
 return {paths,sample};
}
export function buildStoneCLids(spec,head,headBone,makeMaterial){
 const {paths,sample}=splitRim(spec),roots=rootNormals(head),result=[],c=spec.center,r=spec.radius;
 for(let side=0;side<2;side++){
  const upper=side===0,label=(upper?'Upper':'Lower')+(spec.side<0?'L':'R');
  const material=makeMaterial('StoneCEyelid'+label+'_SKIN',[1,1,1]);
  const rows=[paths[side].map(p=>p.u),...Array.from({length:3},()=>Array.from({length:65},(_,i)=>i/64))],levels=[0,.22,.62,1],meta=[],front=[],back=[],wetline=[],indices=[];
  for(let j=0;j<rows.length;j++){front[j]=[];for(const u of rows[j]){front[j].push(meta.length);meta.push({u,v:levels[j],back:false});}}
  for(let j=0;j<rows.length;j++){back[j]=[];for(const u of rows[j]){back[j].push(meta.length);meta.push({u,v:levels[j],back:true});}}
  for(const u of rows.at(-1)){wetline.push(meta.length);meta.push({u,v:1,back:true,wetline:true});}
  function point(m,blink){
   if(m.wetline){
    const a=point({u:m.u,v:1,back:true},blink),x=a[0]+(c[0]-a[0])*.018,y=a[1]+(c[1]-a[1])*.018,z=c[2]+Math.sqrt(Math.max(1e-10,r*r-(x-c[0])**2-(y-c[1])**2))+.000035;
    const reach=1-smooth((blink-.85)/.15);return a.map((v,k)=>v+([x,y,z][k]-v)*reach);
   }
   const U=sample(0,m.u),L=sample(1,m.u),root=upper?U:L,gate=Math.sin(Math.PI*m.u),closed=U.map((v,k)=>v*.35+L[k]*.65);
   // Open margins keep a narrow visible skin rim. Both margins share the same closed curve.
   const open=root.map((v,k)=>v+(closed[k]-v)*.035),edge=open.map((v,k)=>v+(closed[k]-v)*blink);
   const edgeSphere=c[2]+Math.sqrt(Math.max(1e-10,r*r-(edge[0]-c[0])**2-(edge[1]-c[1])**2));edge[2]+=(edgeSphere+.00090*gate-edge[2])*smooth(gate/.30);
   const q=root.map((v,k)=>v+(edge[k]-v)*m.v);
   const sphere=c[2]+Math.sqrt(Math.max(1e-10,r*r-(q[0]-c[0])**2-(q[1]-c[1])**2));
   if(m.v>0&&gate>1e-7){q[2]=Math.max(q[2],sphere+.00090*gate)+.00035*Math.sin(Math.PI*m.v)*gate;}
   if(m.back)q[2]-=.00032*smooth(m.v/.2)*gate;
   return q;
  }
  const base=meta.map(m=>point(m,0));
  const face=(a,b,d,backside=false,wall=false)=>{
   const A=base[a],B=base[b],C=base[d],ab=B.map((v,k)=>v-A[k]),ac=C.map((v,k)=>v-A[k]),n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
   if(Math.hypot(...n)<1e-13)return;
   const reverse=wall?n[1]*(upper?-1:1)<0:backside?n[2]>0:n[2]<0;
   indices.push(...(reverse?[a,d,b]:[a,b,d]));
  };
  function connect(rowA,rowB,usA,usB,backside){let a=0,b=0;while(a<rowA.length-1||b<rowB.length-1){if(a<rowA.length-1&&(b===rowB.length-1||usA[a+1]<=usB[b+1])){face(rowA[a],rowA[a+1],rowB[b],backside);a++;}else{face(rowA[a],rowB[b+1],rowB[b],backside);b++;}}}
  for(let j=0;j<rows.length-1;j++){connect(front[j],front[j+1],rows[j],rows[j+1],false);connect(back[j],back[j+1],rows[j],rows[j+1],true);}
  const j=rows.length-1;for(let i=0;i<rows[j].length-1;i++){face(front[j][i],front[j][i+1],back[j][i],false,true);face(front[j][i+1],back[j][i+1],back[j][i],false,true);}
  // Extend behind the movable lip to the globe, including the deep inner canthus.
  // Upper/lower webs share their corner edges; their reach collapses at full closure.
  for(let i=0;i<wetline.length-1;i++){face(back[j][i],back[j][i+1],wetline[i],false,true);face(back[j][i+1],wetline[i+1],wetline[i],false,true);}
  const frames=[];
  for(let f=0;f<=8;f++){
   const positions=meta.map(m=>point(m,f/8)),normals=positions.map(()=>[0,0,0]);
   for(let i=0;i<indices.length;i+=3){const ids=indices.slice(i,i+3),[a,b,c]=ids.map(id=>positions[id]),ab=b.map((v,k)=>v-a[k]),ac=c.map((v,k)=>v-a[k]),n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];for(const id of ids)for(let k=0;k<3;k++)normals[id][k]+=n[k];}
   for(let i=0;i<meta.length;i++){if(meta[i].v===0){const n=roots.get(key(positions[i]));if(n)normals[i]=n.map(v=>v*(meta[i].back?-1:1));}if(Math.hypot(...normals[i])<1e-14)normals[i]=(roots.get(key(positions[i]))||[0,0,1]).map(v=>v*(meta[i].back?-1:1));const len=Math.hypot(...normals[i])||1;normals[i]=normals[i].map(v=>v/len*32767);}
   frames.push({positions:positions.flatMap(p=>p.map(v=>v*1e5)),normals:normals.flat()});
  }
  const count=meta.length,mesh={name:'StoneCEyelid'+label,stoneCEye:true,stoneCLid:{side:spec.side,upper,rootVertexIds:meta.map((m,i)=>m.v===0?i:-1).filter(i=>i>=0),marginVertexIds:front[j],wetlineVertexIds:wetline,backMarginVertexIds:back[j],marginU:rows[j]},positions:frames[0].positions,normals:frames[0].normals,blinkFrames:frames,uv:Array(count*2).fill(0),skinIndices:[],skinWeights:[],faceRegions:Array(count).fill('Face:skin'),expressions:{},groups:[{material,indices}]};
  for(let i=0;i<count;i++){mesh.skinIndices.push(headBone,0,0,0);mesh.skinWeights.push(1,0,0,0);}result.push(mesh);
 }
 return result;
}
// Pure timeline: the clock is supplied by the existing motion player, so pause/restart work.
export function stoneCBlinkAmount(mode,time){
 if(mode==='blink')return 1;if(mode!=='autoBlink')return 0;
 const t=((time%4)+4)%4-2.6;if(t<0||t>=.30)return 0;
 if(t<.10)return smooth(t/.10);if(t<.14)return 1;return 1-smooth((t-.14)/.16);
}
export function updateStoneCBlink(group,time=0,override){
 const state=group?.userData.stoneCBlink;if(!state)return;
 const amount=Number.isFinite(override)?clamp(override):stoneCBlinkAmount(state.mode,time);if(state.amount===amount)return;
 const phase=amount*8,lo=Math.floor(phase),hi=Math.min(8,lo+1),t=phase-lo;
 for(const mesh of state.meshes){const frames=mesh.userData.stoneCBlinkFrames,a=frames[lo],b=frames[hi];
  for(const key of ['position','normal']){const dst=mesh.geometry.attributes[key].array,A=a[key],B=b[key];for(let i=0;i<dst.length;i++)dst[i]=A[i]+(B[i]-A[i])*t;
   if(key==='normal')for(let i=0;i<dst.length;i+=3){const l=Math.hypot(dst[i],dst[i+1],dst[i+2])||1;for(let k=0;k<3;k++)dst[i+k]/=l;}mesh.geometry.attributes[key].needsUpdate=true;
  }
 }
 state.amount=amount;
}
