import {refineHunyuanFaceVolume} from './hunyuan-face-volume.js?v=99';
import {refineHunyuanNeck} from './hunyuan-neck-anatomy.js?v=98';
/** Experimental Hunyuan graft. Pure arrays, group-local bind space; source data is immutable. */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const average=points=>[0,1,2].map(k=>points.reduce((s,p)=>s+p[k],0)/points.length);
const geometricKey=p=>p.map(x=>Math.round(x*1e7)).join(',');
const positiveAngle=p=>((p+Math.PI*2)%(Math.PI*2));
function weights(entries){const accum=new Map();for(const [j,w] of entries)accum.set(j,(accum.get(j)||0)+w);const top=[...accum].filter(([,w])=>w>1e-10).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((s,x)=>s+x[1],0)||1;return {j:Array.from({length:4},(_,i)=>top[i]?.[0]||0),w:Array.from({length:4},(_,i)=>(top[i]?.[1]||0)/sum)};}
function weightedMix(a,b,t){return weights([...a.j.map((j,i)=>[j,a.w[i]*(1-t)]),...b.j.map((j,i)=>[j,b.w[i]*t])]);}
function pointAt(mesh,id){return mesh.positions.slice(id*3,id*3+3);}
function boundaryLoops(mesh,filter=()=>true){
 const canon=new Map(),ids=new Map(),count=new Map(),direction=new Map();
 for(const id of new Set(mesh.indices)){const key=geometricKey(pointAt(mesh,id));if(!canon.has(key))canon.set(key,id);ids.set(id,canon.get(key));}
 for(let t=0;t<mesh.indices.length;t+=3){const tri=mesh.indices.slice(t,t+3).map(id=>ids.get(id));for(let k=0;k<3;k++){const a=tri[k],b=tri[(k+1)%3];if(a===b)continue;const key=a<b?a+':'+b:b+':'+a;count.set(key,(count.get(key)||0)+1);direction.set(key,[a,b]);}}
 const adj=new Map(),edges=[];for(const [key,n] of count)if(n===1){const [a,b]=direction.get(key);if(!filter(pointAt(mesh,a),pointAt(mesh,b)))continue;edges.push([a,b]);for(const [u,v] of [[a,b],[b,a]]){if(!adj.has(u))adj.set(u,[]);adj.get(u).push(v);}}
 if([...adj.values()].some(v=>v.length!==2))throw Error('Graft boundary is not a closed degree-two loop');
 const seen=new Set(),loops=[];for(const first of adj.keys()){if(seen.has(first))continue;const loop=[];let prev=-1,id=first;while(!seen.has(id)){loop.push(id);seen.add(id);const next=adj.get(id).find(x=>x!==prev);prev=id;id=next;}if(id!==first)throw Error('Graft boundary loop did not close');loops.push(loop);}
 return {loops,edges,count,ids};
}
function loopArea(mesh,loop,center){let area=0;for(let k=0;k<loop.length;k++){const a=pointAt(mesh,loop[k]),b=pointAt(mesh,loop[(k+1)%loop.length]);area+=(a[0]-center[0])*(b[2]-center[2])-(b[0]-center[0])*(a[2]-center[2]);}return area;}
function orderedLoop(mesh,loop,center){let result=[...loop];if(loopArea(mesh,result,center)<0)result.reverse();let start=0,best=Infinity;result.forEach((id,i)=>{const p=pointAt(mesh,id),angle=positiveAngle(Math.atan2(p[2]-center[2],p[0]-center[0]));if(angle<best){best=angle;start=i;}});return [...result.slice(start),...result.slice(0,start)];}
function loopParam(mesh,loop,center){const values=loop.map(id=>{const p=pointAt(mesh,id);return positiveAngle(Math.atan2(p[2]-center[2],p[0]-center[0]));});for(let i=1;i<values.length;i++)if(values[i]<values[i-1]-1e-8)throw Error('颈口截面不能环绕身体中心，请减小头部偏移');if(values.at(-1)-values[0]<5.4)throw Error('颈口裁切没有形成完整环，请调整裁切面');return [...values,values[0]+Math.PI*2].map(v=>v/(Math.PI*2));}
function normalArray(positions,indices){const n=new Array(positions.length).fill(0),sums=new Map();for(let t=0;t<indices.length;t+=3){const ids=indices.slice(t,t+3),p=ids.map(id=>positions.slice(id*3,id*3+3)),q=cross(sub(p[1],p[0]),sub(p[2],p[0]));for(const id of ids)for(let k=0;k<3;k++)n[id*3+k]+=q[k];}for(let i=0;i<n.length;i+=3){const key=geometricKey(positions.slice(i,i+3));if(!sums.has(key))sums.set(key,[0,0,0]);const q=sums.get(key);for(let k=0;k<3;k++)q[k]+=n[i+k];}for(let i=0;i<n.length;i+=3){const q=sums.get(geometricKey(positions.slice(i,i+3))),length=Math.hypot(...q)||1;for(let k=0;k<3;k++)n[i+k]=q[k]/length;}return n;}
function radialSample(body,loop,center,angle){const dx=Math.cos(angle),dz=Math.sin(angle);let chosen=null;for(let i=0;i<loop.length;i++){const a=pointAt(body,loop[i]),b=pointAt(body,loop[(i+1)%loop.length]),ax=a[0]-center[0],az=a[2]-center[2],ex=b[0]-a[0],ez=b[2]-a[2],det=dx*ez-dz*ex;if(Math.abs(det)<1e-12)continue;const r=(ax*ez-az*ex)/det,t=(ax*dz-az*dx)/det;if(r>0&&t>=-1e-8&&t<=1+1e-8&&(!chosen||r>chosen.radius))chosen={point:mix(a,b,clamp(t)),a:loop[i],b:loop[(i+1)%loop.length],t:clamp(t),radius:r};}if(!chosen){let best=loop[0],d=Infinity;for(const id of loop){const p=pointAt(body,id),da=Math.abs(Math.atan2(Math.sin(Math.atan2(p[2]-center[2],p[0]-center[0])-angle),Math.cos(Math.atan2(p[2]-center[2],p[0]-center[0])-angle)));if(da<d){d=da;best=id;}}chosen={point:pointAt(body,best),a:best,b:best,t:0};}const read=id=>({j:body.skinIndex.slice(id*4,id*4+4),w:body.skinWeight.slice(id*4,id*4+4)});return {...chosen,weights:weightedMix(read(chosen.a),read(chosen.b),chosen.t)};}
function clipHead(source,plane,transform){
 const distance=p=>dot(plane.normal,p)-plane.offset;
 const head={positions:[],normals:[],uv:[],indices:[],skinIndices:[],skinWeights:[],neckHeight:[]},cache=new Map();
 const read=id=>({key:String(id),p:source.positions.slice(id*3,id*3+3),n:source.normals?.slice(id*3,id*3+3)||[0,1,0],uv:source.uv.slice(id*2,id*2+2)});
 const interpolate=(a,b)=>{const da=distance(a.p),db=distance(b.p),t=da/(da-db);return {key:[a.key,b.key].sort().join(':'),p:mix(a.p,b.p,t),n:mix(a.n,b.n,t),uv:mix(a.uv,b.uv,t)};};
 const add=v=>{if(cache.has(v.key))return cache.get(v.key);const id=head.positions.length/3;head.positions.push(...transform(v.p));head.neckHeight.push(distance(v.p));head.normals.push(...v.n);head.uv.push(...v.uv);cache.set(v.key,id);return id;};
 for(let t=0;t<source.indices.length;t+=3){const vertices=source.indices.slice(t,t+3).map(read),out=[];for(let k=0;k<3;k++){const a=vertices[k],b=vertices[(k+1)%3],ia=distance(a.p)>=0,ib=distance(b.p)>=0;if(ia)out.push(a);if(ia!==ib)out.push(interpolate(a,b));}if(out.length<3)continue;const ids=out.map(add);for(let k=1;k<ids.length-1;k++){const tri=[ids[0],ids[k],ids[k+1]],p=tri.map(id=>pointAt(head,id));if(Math.hypot(...cross(sub(p[1],p[0]),sub(p[2],p[0])))>1e-13)head.indices.push(...tri);}}
 return head;
}
function bounds(positions){return [0,1,2].map(k=>{let min=Infinity,max=-Infinity;for(let i=k;i<positions.length;i+=3){min=Math.min(min,positions[i]);max=Math.max(max,positions[i]);}return [min,max];});}
/** Source landmarks use source mesh coordinates, Y up, front +Z. eyes, nose, chin required. */
export function buildHunyuanGraft({source,bodyTarget,settings={}}){
 if(!source?.positions||!source?.uv||!source?.indices)throw Error('Hunyuan source requires positions, uv and indices');
 const landmark=source.landmarks||settings.sourceLandmarks;if(!landmark?.eyes||!landmark?.chin||!landmark?.nose)throw Error('Hunyuan source facial endpoints are required');
 const target=bodyTarget.targets,body=bodyTarget.bodyParts[0],srcEyes=average(landmark.eyes),dstEyes=average(target.faceRig.eyes),eyeGap=Math.abs(landmark.eyes[1][0]-landmark.eyes[0][0]),targetGap=Math.abs(target.faceRig.eyes[1][0]-target.faceRig.eyes[0][0]);
 const baseScale=(dstEyes[1]-target.chin[1])/(srcEyes[1]-landmark.chin[1]);
 let left=Infinity,right=-Infinity,top=-Infinity;
 for(let i=0;i<source.positions.length;i+=3)if(source.positions[i+1]>=landmark.chin[1]){left=Math.min(left,source.positions[i]);right=Math.max(right,source.positions[i]);top=Math.max(top,source.positions[i+1]);}
 const sourceHeadAspect=(right-left)/(top-landmark.chin[1]),referenceHeadAspect=settings.headAspect??null;
 // The drawing owns the silhouette. Old rig eye spacing is only a fallback for uncalibrated trials.
 const ys=baseScale*(settings.heightScale??1),xs=(referenceHeadAspect?baseScale*referenceHeadAspect/sourceHeadAspect:targetGap/eyeGap)*(settings.widthScale??1),zs=baseScale*(settings.depthScale??1);
 const shift=[dstEyes[0]-srcEyes[0]*xs,dstEyes[1]-srcEyes[1]*ys+(settings.lift||0),target.faceRig.nose[2]-landmark.nose[2]*zs+(settings.forward||0)];
 const transform=p=>[p[0]*xs+shift[0],p[1]*ys+shift[1],p[2]*zs+shift[2]];
 const bodyBoundary=boundaryLoops(body,(a,b)=>Math.min(a[1],b[1])>target.neck[1]-.02),bodyLoop0=bodyBoundary.loops.sort((a,b)=>b.length-a.length)[0];if(!bodyLoop0)throw Error('Body has no anatomical neck opening');
 const center=[target.neck[0],average(bodyLoop0.map(id=>pointAt(body,id)))[1],target.neck[2]],bodyLoop=orderedLoop(body,bodyLoop0,center);
 const targetCutY=settings.targetCutY??(target.chin[1]-.027),sourceCutY=settings.neckCutY??landmark.neckCutY??(targetCutY-shift[1])/ys,cutPlane=settings.neckCutPlane??landmark.neckCutPlane??{normal:[0,1,0],offset:sourceCutY};
 const head=clipHead(source,cutPlane,transform),cutBindY=sourceCutY*ys+shift[1],blendHeight=settings.neckBlendHeight??.055,neckTop=cutBindY+blendHeight,clearance=settings.collarRise??.022;
 // Fit only the lower donor neck to the actual, irregular recipient ring.
 const neckWarp=(p,height)=>{const sourceY=(p[1]-shift[1])/ys,sourceZ=(p[2]-shift[2])/zs,frontJaw=smooth(landmark.chin[1]-.035,landmark.chin[1]-.008,sourceY)*smooth(landmark.chin[2]-.130,landmark.chin[2]-.075,sourceZ),low=(1-smooth(0,blendHeight,height))*(1-frontJaw),angle=Math.atan2(p[2]-center[2],p[0]-center[0]),sample=radialSample(body,bodyLoop,center,angle),fit=[center[0]+(sample.point[0]-center[0])*.94,sample.point[1]+clearance,center[2]+(sample.point[2]-center[2])*.94],delta=[(fit[0]-p[0])*low,(fit[1]-(p[1]-height))*low,(fit[2]-p[2])*low];return {point:p.map((v,k)=>v+delta[k]),delta,low,sample};};
 let maxNeckAdjustment=0;head.neckBlendWeight=[];for(let i=0;i<head.positions.length;i+=3){const p=head.positions.slice(i,i+3),height=Math.max(0,head.neckHeight[i/3]*ys),warped=neckWarp(p,height);head.positions.splice(i,3,...warped.point);head.neckBlendWeight.push(warped.low);maxNeckAdjustment=Math.max(maxNeckAdjustment,Math.hypot(...warped.delta));const sw=weightedMix(warped.sample.weights,{j:[bodyTarget.humanoid.head,0,0,0],w:[1,0,0,0]},1-warped.low);head.skinIndices.push(...sw.j);head.skinWeights.push(...sw.w);}
 const headBoundary=boundaryLoops(head),candidates=headBoundary.loops.filter(loop=>loop.every(id=>Math.abs(head.neckHeight[id])<1e-7));if(!candidates.length)throw Error('Clipped Hunyuan neck has no closed collar boundary');
 const topLoop=orderedLoop(head,candidates.sort((a,b)=>b.length-a.length)[0],center);
 const bridge={positions:[],normals:[],uv:[],indices:[],skinIndices:[],skinWeights:[],neckBodyBlend:[],bodyVertexIds:[],headVertexIds:[]};
 const bottom=[],upper=[];
 for(const id of bodyLoop){bottom.push(bridge.positions.length/3);bridge.positions.push(...pointAt(body,id));bridge.normals.push(...body.normals.slice(id*3,id*3+3));bridge.skinIndices.push(...body.skinIndex.slice(id*4,id*4+4));bridge.skinWeights.push(...body.skinWeight.slice(id*4,id*4+4));bridge.neckBodyBlend.push(1);bridge.bodyVertexIds.push(id);const p=pointAt(body,id),angle=Math.atan2(p[2]-center[2],p[0]-center[0]);let best=topLoop[0],bestAngle=Infinity;for(const j of topLoop){const q=pointAt(head,j),a=Math.atan2(q[2]-center[2],q[0]-center[0]),d=Math.abs(Math.atan2(Math.sin(a-angle),Math.cos(a-angle)));if(d<bestAngle){bestAngle=d;best=j;}}bridge.uv.push(...head.uv.slice(best*2,best*2+2));}
 for(const id of topLoop){upper.push(bridge.positions.length/3);bridge.positions.push(...pointAt(head,id));bridge.normals.push(...head.normals.slice(id*3,id*3+3));bridge.uv.push(...head.uv.slice(id*2,id*2+2));bridge.skinIndices.push(...head.skinIndices.slice(id*4,id*4+4));bridge.skinWeights.push(...head.skinWeights.slice(id*4,id*4+4));bridge.neckBodyBlend.push(0);bridge.headVertexIds.push(id);}
 const bp=loopParam(body,bodyLoop,center),hp=loopParam(head,topLoop,center),cols=upper.length+1,cost=new Float64Array((bottom.length+1)*cols),previous=new Uint8Array(cost.length);cost.fill(Infinity);cost[0]=0;
 const canFace=tri=>{const p=tri.map(id=>pointAt(bridge,id)),n=cross(sub(p[1],p[0]),sub(p[2],p[0])),c=average(p);return n[0]*(c[0]-center[0])+n[2]*(c[2]-center[2])>1e-15&&Math.hypot(...n)>1e-13;};
 // A monotone dynamic zipper chooses the diagonal that stays outward around
 // the recipient's small nonplanar collar corners. Angular distance penalizes
 // long cross-ring edges while preserving both exact boundary connectivities.
 for(let a=0;a<=bottom.length;a++)for(let b=0;b<=upper.length;b++){const current=a*cols+b;if(!Number.isFinite(cost[current]))continue;const ai=bottom[a%bottom.length],bi=upper[b%upper.length];
  if(a<bottom.length){const next=(a+1)*cols+b,delta=bp[a+1]-hp[b],candidate=cost[current]+delta*delta+1e-8;if(candidate<cost[next]&&canFace([ai,bi,bottom[(a+1)%bottom.length]])){cost[next]=candidate;previous[next]=1;}}
  if(b<upper.length){const next=a*cols+b+1,delta=bp[a]-hp[b+1],candidate=cost[current]+delta*delta+1e-8;if(candidate<cost[next]&&canFace([ai,bi,upper[(b+1)%upper.length]])){cost[next]=candidate;previous[next]=2;}}
 }
 let a=bottom.length,b=upper.length;if(!Number.isFinite(cost[a*cols+b]))throw Error('颈口不能形成朝外的连续连接，请减小头部偏移');const triangles=[];while(a||b){const step=previous[a*cols+b];if(step===1){triangles.push([bottom[(a-1)%bottom.length],upper[b%upper.length],bottom[a%bottom.length]]);a--;}else if(step===2){triangles.push([bottom[a%bottom.length],upper[(b-1)%upper.length],upper[b%upper.length]]);b--;}else throw Error('Invalid neck zipper path');}bridge.indices=triangles.reverse().flat();
 // XZ polygon orientation fixes the bridge outward convention for Y-up character space.
 let radialScore=0;for(let t=0;t<bridge.indices.length;t+=3){const p=bridge.indices.slice(t,t+3).map(id=>pointAt(bridge,id)),n=cross(sub(p[1],p[0]),sub(p[2],p[0])),c=average(p);radialScore+=n[0]*(c[0]-center[0])+n[2]*(c[2]-center[2]);}if(radialScore<0)for(let t=0;t<bridge.indices.length;t+=3)[bridge.indices[t+1],bridge.indices[t+2]]=[bridge.indices[t+2],bridge.indices[t+1]];
 const sourceNormals=head.normals,neckNormals=normalArray(head.positions,head.indices);head.normals=[];
 // Preserve authored flat facial planes outside the fitted neck. A globally
 // recomputed QEM normal field would emphasize reduction artifacts.
 for(let i=0;i<head.positions.length;i+=3){const authored=[sourceNormals[i]/xs,sourceNormals[i+1]/ys,sourceNormals[i+2]/zs],length=Math.hypot(...authored)||1;authored.forEach((v,k)=>authored[k]=v/length);const w=1-head.neckBlendWeight[i/3],n=mix(neckNormals.slice(i,i+3),authored,w),l=Math.hypot(...n)||1;head.normals.push(...n.map(v=>v/l));}
 bridge.normals=normalArray(bridge.positions,bridge.indices);
 // The lower row inherits exact skin normals. At the upper row combine normals
 // once and distribute to every coincident head vertex, including UV seams.
 for(let i=0;i<bodyLoop.length;i++){const id=bodyLoop[i];bridge.normals.splice(i*3,3,...body.normals.slice(id*3,id*3+3));}
 const upperNormals=new Map();for(let i=0;i<topLoop.length;i++){const id=topLoop[i],bi=bodyLoop.length+i,h=head.normals.slice(id*3,id*3+3),b=bridge.normals.slice(bi*3,bi*3+3),n=mix(h,b,.5),length=Math.hypot(...n)||1;n.forEach((v,k)=>n[k]=v/length);upperNormals.set(geometricKey(pointAt(head,id)),n);bridge.normals.splice(bi*3,3,...n);}
 for(let i=0;i<head.positions.length/3;i++){const n=upperNormals.get(geometricKey(pointAt(head,i)));if(n)head.normals.splice(i*3,3,...n);}
 // Shared coordinates + weights guarantee exact equality at rest and under skeleton deformation.
 const endpoint=p=>neckWarp(transform(p),Math.max(0,(dot(cutPlane.normal,p)-cutPlane.offset)*ys)).point;
 const landmarks=Object.fromEntries(Object.entries(landmark).filter(([,p])=>Array.isArray(p)).map(([key,p])=>[key,Array.isArray(p[0])?p.map(endpoint):endpoint(p)]));
 const anatomy=refineHunyuanNeck({head,bridge,body,landmarks,targets:target,settings:{...settings,bindYScale:ys}});
 const faceVolume=refineHunyuanFaceVolume(head,landmarks,settings);
 const report={faceVolume,neckAnatomy:anatomy.report,experimental:true,method:'endpoint-fit-clipped-donor-shared-weight-collar',zipper:'outward-monotone-angular-dynamic',sourceTriangles:source.indices.length/3,headTriangles:head.indices.length/3,bridgeTriangles:bridge.indices.length/3,bodyBoundaryVertices:bodyLoop.length,headBoundaryVertices:topLoop.length,bodyBoundaryLoops:bodyBoundary.loops.length,donorBoundaryLoops:headBoundary.loops.length,sourceCutY,sourceCutPlane:cutPlane,sourceHeadAspect,referenceHeadAspect,fitMode:referenceHeadAspect?'concept-head-aspect':'legacy-eye-spacing',cutBindY,scale:[xs,ys,zs],translation:shift,neckCenter:center,neckBlendHeight:blendHeight,collarRise:clearance,maxNeckAdjustment,bounds:bounds(head.positions),eyeEndpointResidual:landmarks.eyes.map((p,i)=>Math.hypot(...sub(p,target.faceRig.eyes[i]))),chinYResidual:landmarks.chin[1]-target.chin[1],noseZResidual:landmarks.nose[2]-target.faceRig.nose[2],immutableSource:true};
 return {head,bridge,body:anatomy.body,landmarks,report};
}
