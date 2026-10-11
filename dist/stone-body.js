// User-supplied three-view topology study, image(3).png, guides block transitions.
// This edits the existing CC0 VRoid surface, not a mesh extracted from the image.
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const bell=(v,c,r)=>Math.exp(-(((v-c)/r)**2));
const plate=(v,c,r)=>1-smooth(.55,1.35,Math.abs(v-c)/r);
export function sculptStoneBlocks(x,y,z,source,l,a,strength){
 if(!strength)return [x,y,z];
 const [sx,sy,sz]=source,ax=Math.abs(sx),hip=l.hips[1],neck=l.neck[1];
 const head=1-smooth(neck-.075,neck-.020,sy),torso=(1-smooth(.125,.185,ax))*head;
 const front=smooth(.004,.040,sz),back=1-smooth(-.030,.004,sz);
 // Broad pectoral plates and a shallow lower border; no spherical breast lobes.
 const pec=plate(ax,.060,.057)*plate(sy,neck-.174,.066)*torso;
 const sternum=bell(ax,0,.015)*bell(sy,neck-.178,.09)*torso;
 const lowerPec=bell(sy,neck-.245+ax*.20,.014)*plate(ax,.064,.067)*torso;
 z+=strength*(.009*pec-.0035*sternum-.0038*lowerPec)*front;
 // Rib arch and paired abdominal blocks remain subtle at this game's scale.
 const abdomen=bell(sy,hip+.123,.105)*torso;
 let abs=0;for(const h of [.065,.112,.159])abs+=bell(sy,hip+h,.024)*plate(ax,.030,.024);
 z+=strength*(.003*abs-.0018*bell(ax,0,.011)*abdomen)*front;
 const oblique=bell(ax,.095,.027)*bell(sy,hip+.13,.085)*torso;
 x+=Math.sign(sx)*strength*.003*oblique;
 // Scapular planes, long spinal channel and outward taper into the lats.
 const scapula=bell(ax,.077,.050)*bell(sy,neck-.165,.080)*torso;
 const spine=bell(ax,0,.018)*bell(sy,neck-.24,.17)*torso;
 const lat=bell(ax,.100,.042)*bell(sy,neck-.265,.088)*torso;
 z-=strength*(.009*scapula+.007*lat-.0035*spine)*back;
 // Keep the upper shoulder cap broad, without a pointed ridge in profile.
 const cap=bell(sy,neck-.065,.036)*smooth(.085,.145,ax)*(1-smooth(.19,.235,ax));
 y-=strength*.005*cap;
 // Quadriceps and calf fullness are centred between joints, not on the knees.
 const leg=1-smooth(hip-.11,hip-.025,sy),thighY=(hip+a.knee[1])*.5;
 const quad=bell(sy,thighY,.125)*bell(ax,a.knee[0]+.017,.043)*leg;
 const calf=bell(sy,(a.knee[1]+a.foot[1])*.5+.030,.10)*bell(ax,a.knee[0],.050)*leg;
 z+=strength*.007*quad*front;z-=strength*.006*calf*back;
 // Upper-arm front/back volumes follow the actual authored A-pose arm axis.
 const s=a.shoulder,w=a.wrist,v=w.map((q,i)=>q-s[i]),p=[ax,sy,sz];
 const u=p.reduce((sum,q,i)=>sum+(q-s[i])*v[i],0)/v.reduce((sum,q)=>sum+q*q,0);
 const arm=smooth(s[0]-.020,s[0]+.060,ax)*bell(u,.28,.17);
 z+=strength*arm*(.005*front-.004*back);
 return [x,y,z];
}

const cache=new WeakMap();
export function relaxStoneShoulders(positions,source,l){
 const groups=source.groups.filter(g=>g.skinSurface),ids=new Set(groups.flatMap(g=>g.indices));
 const welded=new Map(),vertexKey=new Map(),neighbours=new Map(),neck=l.neck[1];
 for(const id of ids){const key=source.positions.slice(id*3,id*3+3).map(v=>Math.round(v*2)).join(',');vertexKey.set(id,key);if(!welded.has(key))welded.set(key,[]);welded.get(key).push(id);if(!neighbours.has(key))neighbours.set(key,new Set());}
 for(const group of groups)for(let i=0;i<group.indices.length;i+=3){
  const tri=group.indices.slice(i,i+3).map(id=>vertexKey.get(id));for(let k=0;k<3;k++){neighbours.get(tri[k]).add(tri[(k+1)%3]);neighbours.get(tri[k]).add(tri[(k+2)%3]);}
 }
 for(let pass=0;pass<4;pass++){
  const old=new Float32Array(positions);
  for(const [key,list] of welded){
   const id=list[0],ax=Math.abs(source.positions[id*3]/100000),y=source.positions[id*3+1]/100000;
   const weight=smooth(.035,.075,ax)*(1-smooth(.19,.24,ax))*smooth(neck-.15,neck-.11,y)*(1-smooth(neck-.035,neck, y));
   if(!weight)continue;const near=[...neighbours.get(key)].map(k=>welded.get(k)[0]);if(!near.length)continue;
   const mean=[0,1,2].map(k=>near.reduce((sum,j)=>sum+old[j*3+k],0)/near.length);
   for(const j of list)for(let k=0;k<3;k++)positions[j*3+k]=old[id*3+k]+(mean[k]-old[id*3+k])*.45*weight;
  }
 }
}
// Conforming edge splits add real samples where larger author triangles miss a
// chest border / shoulder transition. UV seams and original skin influences stay.
export function refineStoneBody(base){
 const source=base.meshes.find(m=>m.name==='Body');if(cache.has(source))return cache.get(source);
 const p=[...source.positions],n=[...source.normals],uv=[...source.uv],rig=base.rig.meshes.Body;
 const j=[...rig.indices],w=rig.weights.map(v=>v/65535),edge=new Map(),neck=base.landmarks.neck[1],hip=base.landmarks.hips[1];
 for(let i=0;i<w.length;i+=4){const sum=w.slice(i,i+4).reduce((s,q)=>s+q,0)||1;for(let k=0;k<4;k++)w[i+k]/=sum;}
 const skin=source.groups.filter(g=>base.materials[g.material].name.includes('_SKIN'));
 const key=(a,b)=>a<b?a+':'+b:b+':'+a;
 function midpoint(a,b){
  const id=p.length/3;for(let k=0;k<3;k++){p.push((p[a*3+k]+p[b*3+k])*.5);n.push((n[a*3+k]+n[b*3+k])*.5);}
  const len=Math.hypot(...n.slice(id*3,id*3+3))||1;for(let k=0;k<3;k++)n[id*3+k]=n[id*3+k]/len*32767;
  for(let k=0;k<2;k++)uv.push((uv[a*2+k]+uv[b*2+k])*.5);
  const weights=new Map();for(const v of [a,b])for(let k=0;k<4;k++)weights.set(j[v*4+k],(weights.get(j[v*4+k])||0)+w[v*4+k]*.5);
  const top=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((s,q)=>s+q[1],0)||1;
  for(let k=0;k<4;k++){j.push(top[k]?.[0]||0);w.push((top[k]?.[1]||0)/sum);}return id;
 }
 for(const group of skin)for(let t=0;t<group.indices.length;t+=3){
  const tri=group.indices.slice(t,t+3);for(let k=0;k<3;k++){
   const a=tri[k],b=tri[(k+1)%3],x=Math.abs((p[a*3]+p[b*3])*.5/100000),y=(p[a*3+1]+p[b*3+1])*.5/100000;
   const torso=y>hip+.025&&y<neck-.015&&x<.185,leg=y>.22&&y<hip-.06&&x<.15;
   const length=Math.hypot(...[0,1,2].map(k=>(p[a*3+k]-p[b*3+k])/100000));
   if((torso&&length>.018)||(leg&&length>.028)){const e=key(a,b);if(!edge.has(e))edge.set(e,midpoint(a,b));}
  }
 }
 const groups=source.groups.map(group=>{
  if(!skin.includes(group))return group;
  const out=[];for(let t=0;t<group.indices.length;t+=3){
   const [a,b,c]=group.indices.slice(t,t+3),ab=edge.get(key(a,b)),bc=edge.get(key(b,c)),ca=edge.get(key(c,a));
   const mask=(ab!==undefined?1:0)+(bc!==undefined?2:0)+(ca!==undefined?4:0);
   if(mask===0)out.push(a,b,c);else if(mask===1)out.push(a,ab,c,ab,b,c);
   else if(mask===2)out.push(b,bc,a,bc,c,a);else if(mask===4)out.push(c,ca,b,ca,a,b);
   else if(mask===3)out.push(b,bc,ab,a,ab,c,ab,bc,c);
   else if(mask===6)out.push(c,ca,bc,b,bc,a,bc,ca,a);
   else if(mask===5)out.push(a,ab,ca,c,ca,b,ca,ab,b);
   else out.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
  }return {...group,indices:out,skinSurface:true};
 });
 const result={...source,positions:p,normals:n,uv,groups,skinIndices:j,skinWeights:w,refinement:{originalVertices:source.positions.length/3,addedVertices:edge.size}};
 cache.set(source,result);return result;
}
