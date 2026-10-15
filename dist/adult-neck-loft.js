// Replace the inherited donor neck fans with a continuous, regularly sampled loft.
// Coordinates are bind/source positions encoded at 1e5; assets are never mutated.
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const xyz=(m,id)=>m.positions.slice(id*3,id*3+3).map(v=>v/1e5);
const key=(m,id)=>m.positions.slice(id*3,id*3+3).join(',');
const length2=(a,b)=>a.reduce((s,v,k)=>s+(v-b[k])**2,0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function read(m,id){const weights={};for(let k=0;k<4;k++){const b=m.skinIndices[id*4+k],w=m.skinWeights[id*4+k];if(w>0)weights[b]=(weights[b]||0)+w;}return {p:xyz(m,id),n:m.normals.slice(id*3,id*3+3),uv:m.uv.slice(id*2,id*2+2),w:weights};}
function mix(a,b,t){const w={};for(const k of new Set([...Object.keys(a.w),...Object.keys(b.w)]))w[k]=(a.w[k]||0)*(1-t)+(b.w[k]||0)*t;return {p:a.p.map((v,k)=>v+(b.p[k]-v)*t),n:a.n.map((v,k)=>v+(b.n[k]-v)*t),uv:a.uv.map((v,k)=>v+(b.uv[k]-v)*t),w};}
function append(m,v){const id=m.positions.length/3;m.positions.push(...v.p.map(v=>Math.round(v*1e5)));const nl=Math.hypot(...v.n)||1;m.normals.push(...v.n.map(v=>Math.round(v/nl*32767)));m.uv.push(...v.uv.map(Math.round));const w=Object.entries(v.w).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=w.reduce((s,v)=>s+v[1],0)||1;for(let k=0;k<4;k++){m.skinIndices.push(Number(w[k]?.[0]||0));m.skinWeights.push((w[k]?.[1]||0)/sum);}m.faceRegions.push('Face:skin');return id;}
function geometricEdges(mesh,groups){
 const canonical=new Map(),representative=new Map(),edges=new Map();
 const idOf=id=>{const k=key(mesh,id);if(!canonical.has(k)){canonical.set(k,id);representative.set(id,id);}return canonical.get(k);};
 for(const g of groups)for(let i=0;i<g.indices.length;i+=3){const t=g.indices.slice(i,i+3).map(idOf);for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3];if(a===b)continue;const k2=[a,b].sort((a,b)=>a-b).join(',');const e=edges.get(k2);if(e)e.count++;else edges.set(k2,{a,b,count:1});}}
 return [...edges.values()].filter(e=>e.count===1);
}
function loopFromEdges(mesh,edges,label){
 const adj=new Map();for(const {a,b} of edges){if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);adj.get(a).push(b);adj.get(b).push(a);}
 const unused=new Set(adj.keys()),loops=[];
 while(unused.size){const start=unused.values().next().value,loop=[start];let prev=-1,current=start;
  for(let guard=0;guard<=edges.length;guard++){const neighbors=adj.get(current);if(neighbors.length!==2)throw Error(label+' boundary has degree '+neighbors.length+' at '+key(mesh,current));const next=neighbors.find(id=>id!==prev);unused.delete(current);if(next===start)break;if(loop.includes(next))throw Error(label+' boundary revisits vertex');loop.push(next);prev=current;current=next;}
  if(loop.length>=3)loops.push(loop);
 }
 if(loops.length!==1)throw Error(label+' must be one loop, got '+loops.map(l=>l.length).join(','));
 return loops[0];
}
function orient(mesh,loop,c){
 let area=0;for(let i=0;i<loop.length;i++){const a=xyz(mesh,loop[i]),b=xyz(mesh,loop[(i+1)%loop.length]);area+=(a[0]-c[0])*(b[2]-c[2])-(b[0]-c[0])*(a[2]-c[2]);}if(area<0)loop.reverse();
 // Rotate without changing connectivity. Pick the point nearest theta=-pi.
 let start=0,best=Infinity;for(let i=0;i<loop.length;i++){const p=xyz(mesh,loop[i]),a=Math.atan2(p[2]-c[2],p[0]-c[0]),d=Math.abs(Math.atan2(Math.sin(a+Math.PI),Math.cos(a+Math.PI)));if(d<best){best=d;start=i;}}
 return loop.slice(start).concat(loop.slice(0,start));
}
function raySample(mesh,loop,c,theta){
 const dx=Math.cos(theta),dz=Math.sin(theta),hits=[];
 for(let i=0;i<loop.length;i++){const a=read(mesh,loop[i]),b=read(mesh,loop[(i+1)%loop.length]),ax=a.p[0]-c[0],az=a.p[2]-c[2],ex=b.p[0]-a.p[0],ez=b.p[2]-a.p[2],det=dx*ez-dz*ex;if(Math.abs(det)<1e-12)continue;const t=(ax*ez-az*ex)/det,u=(ax*dz-az*dx)/det;if(t>0&&u>=-1e-7&&u<=1+1e-7)hits.push({t,v:mix(a,b,Math.max(0,Math.min(1,u)))});}
 if(!hits.length)throw Error('Neck loop is not radial around its centre at '+theta);
 hits.sort((a,b)=>b.t-a.t);return hits[0].v;
}
function bridge(mesh,a,b,out,obstacles=[]){
 // Dynamic programming chooses a short, monotone strip through both connected loops.
 // It never sorts vertices independently or changes the order of boundary edges.
 const n=a.length,m=b.length,stride=m+1,cost=new Float64Array((n+1)*(m+1)).fill(Infinity),move=new Uint8Array(cost.length);cost[0]=0;
 const pos=id=>xyz(mesh,id);
 const dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0),sub=(a,b)=>a.map((v,k)=>v-b[k]);
 const hit=(a,b,p)=>{const d=sub(b,a),e1=sub(p[1],p[0]),e2=sub(p[2],p[0]),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-14)return false;const s=sub(a,p[0]),u=dot(s,h)/det;if(u<=1e-5||u>=1-1e-5)return false;const q=cross(s,e1),v=dot(d,q)/det;if(v<=1e-5||u+v>=1-1e-5)return false;const t=dot(e2,q)/det;return t>1e-5&&t<1-1e-5;};
 const triangleCost=(u,v,w)=>{const p=pos(u),q=pos(v),r=pos(w),e=q.map((v,k)=>v-p[k]),f=r.map((v,k)=>v-p[k]),area=Math.hypot(...cross(e,f)),points=[p,q,r],ids=[u,v,w];
  if(obstacles.length){const bounds=[0,1,2].map(k=>[Math.min(p[k],q[k],r[k]),Math.max(p[k],q[k],r[k])]);for(const obstacle of obstacles){if(ids.some(id=>obstacle.ids.includes(id))||bounds.some((v,k)=>v[0]>=obstacle.bounds[k][1]||v[1]<=obstacle.bounds[k][0]))continue;if([0,1,2].some(k=>hit(points[k],points[(k+1)%3],obstacle.points)||hit(obstacle.points[k],obstacle.points[(k+1)%3],points)))return Infinity;}}
  return length2(q,r)+.025*Math.max(length2(p,q),length2(p,r),length2(q,r))**2/Math.max(area,1e-10);};
 for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){const base=cost[i*stride+j];if(!Number.isFinite(base))continue;const ai=a[i%n],bj=b[j%m];
  if(i<n){const target=(i+1)*stride+j,c=base+triangleCost(ai,bj,a[(i+1)%n]);if(c<cost[target]){cost[target]=c;move[target]=1;}}
  if(j<m){const target=i*stride+j+1,c=base+triangleCost(ai,bj,b[(j+1)%m]);if(c<cost[target]){cost[target]=c;move[target]=2;}}
 }
 const tris=[];let i=n,j=m;while(i||j){const k=i*stride+j;if(move[k]===1){i--;tris.push([a[i%n],b[j%m],a[(i+1)%n]]);}else if(move[k]===2){j--;tris.push([a[i%n],b[j%m],b[(j+1)%m]]);}else throw Error('Unable to bridge neck loops');}for(const t of tris.reverse())out.push(...t);
}
export function rebuildAdultNeck(data){
 const body=data.meshes.find(m=>m.name==='Body'),original=data.meshes.find(m=>m.name==='Face');if(!body||!original)return data;
 const l=data.landmarks,neck=l.neck[1],zc=l.neck[2],chin=l.faceRig.chin,c=[l.neck[0],neck,zc];
 const primary=original.groups.findIndex(g=>data.materials[g.material]?.name.includes('Imported00003_Face_SKIN'));
 if(primary<0)throw Error('Independent Face skin group is missing');
 const face={...original};for(const f of ['positions','normals','uv','skinIndices','skinWeights','faceRegions'])face[f]=[...original[f]];face.groups=original.groups.map(g=>({...g,indices:[...g.indices]}));
 const field=p=>{
  const ax=Math.abs(p[0]-c[0]),angle=Math.atan2(ax,p[2]-zc);
  const jawGuard=1-smooth(zc+.005,zc+.045,p[2]),earGuard=1-smooth(.068,.076,ax);
  return p[1]-(chin-.012+.090*smooth(.25,1.4,angle)*jawGuard*earGuard);
 };
 const sourceGroup=original.groups[primary],newIndices=[],cache=new Map(),cutIds=new Set();
 const intersection=(a,b,fa,fb)=>{const edge=[a,b].sort((a,b)=>a-b).join(',');if(!cache.has(edge)){const id=append(face,mix(read(original,a),read(original,b),fa/(fa-fb)));cache.set(edge,id);cutIds.add(id);}return cache.get(edge);};
 for(let i=0;i<sourceGroup.indices.length;i+=3){const t=sourceGroup.indices.slice(i,i+3),poly=[];for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],fa=field(xyz(original,a)),fb=field(xyz(original,b));if(fa>=0)poly.push(a);if((fa>=0)!==(fb>=0))poly.push(intersection(a,b,fa,fb));}for(let k=1;k<poly.length-1;k++)if(new Set([poly[0],poly[k],poly[k+1]]).size===3)newIndices.push(poly[0],poly[k],poly[k+1]);}
 face.groups[primary].indices=newIndices;
 const clippedKeys=new Set([...cutIds].map(id=>key(face,id)));
 const upperEdges=geometricEdges(face,[face.groups[primary]]).filter(e=>[e.a,e.b].every(id=>clippedKeys.has(key(face,id))||Math.abs(field(xyz(face,id)))<.00002));
 const upper=orient(face,loopFromEdges(face,upperEdges,'Upper neck'),c);
 const bodyGroups=body.groups.filter(g=>data.materials[g.material]?.name.includes('_SKIN'));
 const lowerEdges=geometricEdges(body,bodyGroups).filter(e=>[e.a,e.b].every(id=>body.positions[id*3+1]/1e5>neck-.075));
 const lowerBody=orient(body,loopFromEdges(body,lowerEdges,'Body neck'),c);
 const lower=lowerBody.map(id=>{const result=append(face,read(body,id));face.positions.splice(result*3,3,...body.positions.slice(id*3,id*3+3));face.skinIndices.splice(result*4,4,...body.skinIndices.slice(id*4,id*4+4));face.skinWeights.splice(result*4,4,...body.skinWeights.slice(id*4,id*4+4));return result;});
 const count=32,rows=[lower],addedStart=face.positions.length/3;
 for(let row=1;row<=4;row++){const t=row/5,ids=[];for(let sector=0;sector<count;sector++){const theta=-Math.PI+sector/count*Math.PI*2,lo=raySample(body,lowerBody,c,theta),hi=raySample(face,upper,c,theta);ids.push(append(face,mix(lo,hi,t)));}rows.push(ids);}rows.push(upper);
 const before=newIndices.length,obstacles=[];for(let i=0;i<before;i+=3){const ids=newIndices.slice(i,i+3),points=ids.map(id=>xyz(face,id));obstacles.push({ids,points,bounds:[0,1,2].map(k=>[Math.min(...points.map(p=>p[k])),Math.max(...points.map(p=>p[k]))])});}
 for(let i=0;i<rows.length-1;i++)bridge(face,rows[i],rows[i+1],newIndices,i===rows.length-2?obstacles:[]);
 face.neckSupportVertices=128;face.trapeziusSupportVertices=Math.max(face.trapeziusSupportVertices||0,128);
 const used=[...new Set(face.groups.flatMap(g=>g.indices))],remap=new Map(used.map((id,i)=>[id,i]));
 const discarded=face.positions.length/3-used.length;
 if(!Object.keys(face.expressions||{}).length){for(const [field,stride] of [['positions',3],['normals',3],['uv',2],['skinIndices',4],['skinWeights',4],['faceRegions',1]]){const prior=face[field];face[field]=used.flatMap(id=>prior.slice(id*stride,id*stride+stride));}for(const group of face.groups)group.indices=group.indices.map(id=>remap.get(id));}
 data.meshes=data.meshes.map(m=>m===original?face:m);
 data.neckTopology={type:'clipped-boundary-regular-loft',upperVertices:upper.length,lowerVertices:lower.length,sectors:count,intermediateRows:4,addedRingVertices:128,discardedUnusedVertices:discarded,removedTriangles:sourceGroup.indices.length/3-before/3,loftTriangles:(newIndices.length-before)/3,clip:{frontY:chin-.012,backY:chin+.078}};
 return data;
}
