// A common monotone radial profile removes the legacy elliptical collar pinch.
// Repositions both skin meshes together; source Y, weights and all aliases stay exact.
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const clamp=(a,b,v)=>Math.max(a,Math.min(b,v));
export function regularizeAdultNeckJunction(data){
 if(data.neckJunctionRegularized)return data;
 const neck=data.landmarks.neck[1],cx=data.landmarks.neck[0],zc=data.landmarks.neck[2],chin=data.landmarks.faceRig.chin;
 const low=neck-.070,high=neck+.040,span=high-low,levels=[low-.015,low,high,high+.015],segments=levels.map(()=>[]),nodes=new Map();
 for(const mesh of data.meshes.filter(m=>['Body','Face'].includes(m.name)))for(const g of mesh.groups.filter(g=>data.materials[g.material].name.includes('_SKIN')))for(let i=0;i<g.indices.length;i+=3){
  const ids=g.indices.slice(i,i+3),p=ids.map(id=>mesh.positions.slice(id*3,id*3+3).map(v=>v/1e5));
  for(let k=0;k<3;k++){const key=mesh.positions.slice(ids[k]*3,ids[k]*3+3).join(',');if(!nodes.has(key))nodes.set(key,{p:p[k],refs:[]});const node=nodes.get(key);if(!node.refs.some(([m,id])=>m===mesh&&id===ids[k]))node.refs.push([mesh,ids[k]]);}
  for(let level=0;level<levels.length;level++){const y=levels[level];if(Math.min(...p.map(p=>p[1]))>y||Math.max(...p.map(p=>p[1]))<y)continue;const points=[];for(let k=0;k<3;k++){const a=p[k],b=p[(k+1)%3];if((a[1]>=y)===(b[1]>=y))continue;const t=(y-a[1])/(b[1]-a[1]);points.push([a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t]);}if(points.length===2)segments[level].push(points);}
 }
 const count=32;
 const sample=(list,theta)=>{const dx=Math.cos(theta),dz=Math.sin(theta),hits=[];for(const [a,b] of list){const ax=a[0]-cx,az=a[1]-zc,ex=b[0]-a[0],ez=b[1]-a[1],det=dx*ez-dz*ex;if(Math.abs(det)<1e-12)continue;const r=(ax*ez-az*ex)/det,u=(ax*dz-az*dx)/det;if(r>.018&&r<.50&&u>=-1e-6&&u<=1+1e-6)hits.push(r);}return hits.length?Math.min(...hits):null;};
 const radii=Array.from({length:count},(_,i)=>levels.map((_,level)=>sample(segments[level],-Math.PI+i/count*Math.PI*2)));
 const complete=radii.map(r=>r.every(Number.isFinite));if(complete.some(v=>!v))throw Error('Neck junction lacks a closed radial cross-section: '+JSON.stringify(radii.map((r,i)=>[i,r]).filter(([i,r])=>!r.every(Number.isFinite))));
 const interpolate=(theta,index)=>{const f=((theta+Math.PI)/(Math.PI*2)*count+count)%count,i=Math.floor(f),t=f-i;return radii[i][index]*(1-t)+radii[(i+1)%count][index]*t;};
 let moved=0,maxDisplacement=0,sharedMoved=0;
 for(const node of nodes.values()){
  const [x,y,z]=node.p,ax=Math.abs(x-cx);
  const jaw=1-smooth(chin-.020,chin-.004,y)*smooth(zc+.025,zc+.045,z);
  const ear=1-smooth(.061,.074,ax)*smooth(neck+.020,chin+.010,y);
  const weight=smooth(low,low+.025,y)*(1-smooth(high-.020,high,y))*(1-smooth(.095,.150,ax))*jaw*ear;if(!weight)continue;
  const theta=Math.atan2(z-zc,x-cx),r=Math.hypot(x-cx,z-zc);if(r<1e-8)continue;
  const a=interpolate(theta,1),b=interpolate(theta,2),secant=(b-a)/span;
  // Monotone cubic Hermite endpoint slopes avoid a new local neck minimum.
  let ma=(a-interpolate(theta,0))/.015,mb=(interpolate(theta,3)-b)/.015;
  if(Math.abs(secant)<1e-9){ma=0;mb=0;}else{ma=Math.sign(secant)*clamp(0,3*Math.abs(secant),ma*Math.sign(secant));mb=Math.sign(secant)*clamp(0,3*Math.abs(secant),mb*Math.sign(secant));const s=Math.hypot(ma/secant,mb/secant);if(s>3){ma*=3/s;mb*=3/s;}}
  const t=clamp(0,1,(y-low)/span),t2=t*t,t3=t2*t;
  const target=(2*t3-3*t2+1)*a+(t3-2*t2+t)*span*ma+(-2*t3+3*t2)*b+(t3-t2)*span*mb;
  const delta=.012*Math.tanh((target-r)/.012)*weight,scale=(r+delta)/r,q=[Math.round((cx+(x-cx)*scale)*1e5),Math.round(y*1e5),Math.round((zc+(z-zc)*scale)*1e5)];
  if(Math.abs(delta)>1e-7){moved++;maxDisplacement=Math.max(maxDisplacement,Math.abs(delta));if(node.refs.some(([m])=>m.name==='Body')&&node.refs.some(([m])=>m.name==='Face'))sharedMoved++;}
  for(const [mesh,id] of node.refs)mesh.positions.splice(id*3,3,...q);
 }
 data.neckJunctionRegularized={method:'shared-monotone-radial-hermite',samples:count,lowY:low,highY:high,displacementCap:.012,maxDisplacement,moved,sharedMoved,sourceYPreserved:true};
 return data;
}

export function smoothAdultNeckRoot(data){
 if(data.lowerNeckSmoothed)return data;
 const neck=data.landmarks.neck[1],zc=data.landmarks.neck[2],chin=data.landmarks.faceRig.chin,nodes=[],lookup=new Map();
 const node=(mesh,id)=>{const q=mesh.positions.slice(id*3,id*3+3),key=q.join(',');let j=lookup.get(key);if(j===undefined){j=nodes.length;lookup.set(key,j);nodes.push({p:q.map(v=>v/1e5),refs:[],near:new Set()});}if(!nodes[j].refs.some(r=>r[0]===mesh&&r[1]===id))nodes[j].refs.push([mesh,id]);return j;};
 for(const mesh of data.meshes.filter(m=>['Body','Face'].includes(m.name)))for(const g of mesh.groups.filter(g=>data.materials[g.material].name.includes('_SKIN')))for(let i=0;i<g.indices.length;i+=3){const t=g.indices.slice(i,i+3).map(id=>node(mesh,id));for(let k=0;k<3;k++){if(t[k]!==t[(k+1)%3]){nodes[t[k]].near.add(t[(k+1)%3]);nodes[t[(k+1)%3]].near.add(t[k]);}}}
 // Welded Body/Face adjacency removes the inherited paired collar blocks.
 // Keep the fore-jaw clear and leave the posterior trapezius roof intact.
 const weight=nodes.map(({p:[x,y,z]})=>smooth(neck-.160,neck-.105,y)*(1-smooth(neck+.045,neck+.085,y))*(1-smooth(chin-.020,chin-.004,y)*smooth(zc+.030,zc+.050,z))*(.25+.75*smooth(.005,.025,Math.abs(x)))*(1-smooth(.095,.145,Math.abs(x)))*smooth(zc-.025,zc+.020,z));
 const shared=nodes.map(n=>n.refs.some(([m])=>m.name==='Body')&&n.refs.some(([m])=>m.name==='Face'));
 let p=nodes.map(n=>[...n.p]);
 for(let pass=0;pass<35;pass++){const old=p;p=old.map((q,i)=>{if(!weight[i]||!nodes[i].near.size)return q;const near=[...nodes[i].near],mean=[0,1,2].map(k=>near.reduce((s,j)=>s+old[j][k],0)/near.length);return q.map((v,k)=>k===1&&shared[i]?Math.min(nodes[i].p[1],v+.38*weight[i]*(mean[k]-v)):v+.38*weight[i]*(mean[k]-v));});}
 for(let i=0;i<nodes.length;i++)if(weight[i])for(const [mesh,id] of nodes[i].refs)mesh.positions.splice(id*3,3,...p[i].map(v=>Math.round(v*1e5)));
 const displacement=nodes.map((node,i)=>Math.hypot(...node.p.map((v,k)=>v-p[i][k])));
 data.lowerNeckSmoothed={method:'welded-front-neck-root-fairing',iterations:35,moved:displacement.filter(v=>v>.00001).length,maxDisplacement:Math.max(...displacement),sharedMoved:displacement.filter((v,i)=>v>.00001&&shared[i]).length,sharedCollarBelowFaceInfluence:true,posteriorRoofPreserved:true};
 return data;
}
