export {prepareAdultHead,adultHeadNormals,installAdultHeadNormals} from './adult-head.js?v=93';
import {prepareAdultOrbits} from './adult-orbit.js?v=89';
import {regularizeAdultNeckJunction,smoothAdultNeckRoot} from './adult-neck-junction.js?v=89';
import {rebuildAdultNeck} from './adult-neck-loft.js?v=86';
import {relaxNeckSurface} from './adult-neck.js?v=101';
import {createUnderwearData} from './underwear.js?v=50';
// Independent user-reference foundation. No old Stone morph/sculpt data is applied.
const clamp=v=>Math.max(-2,Math.min(2,((v??50)-50)/50));
function eyeMesh(base,name,region,c,width,height,color,materialIndex){
 const positions=[],normals=[],uv=[],indices=[],skinIndices=[],skinWeights=[],faceRegions=[],count=32,rings=4,side=Math.sign(c[0]);
 const add=(dx,dy,r)=>{const dome=name.includes('Iris')?.00020:.0017,z=c[2]-side*.30*dx+.50*dy+dome*(1-r*r),nx=side*.30+2*dome*dx/(width*width),ny=-.50+2*dome*dy/(height*height),len=Math.hypot(nx,ny,1);positions.push(...[c[0]+dx,c[1]+dy,z].map(v=>Math.round(v*1e5)));normals.push(Math.round(nx/len*32767),Math.round(ny/len*32767),Math.round(32767/len));uv.push(0,0);skinIndices.push(base.rig.humanoid.head,0,0,0);skinWeights.push(1,0,0,0);faceRegions.push(region);};
 add(0,0,0);for(let ring=1;ring<=rings;ring++)for(let i=0;i<count;i++){const a=i/count*Math.PI*2,r=ring/rings;add(Math.cos(a)*width*r,Math.sin(a)*height*r,r);}
 for(let i=0;i<count;i++)indices.push(0,1+i,1+(i+1)%count);
 for(let ring=1;ring<rings;ring++)for(let i=0;i<count;i++){const a=1+(ring-1)*count+i,b=1+(ring-1)*count+(i+1)%count,c=1+ring*count+i,d=1+ring*count+(i+1)%count;indices.push(a,c,b,b,c,d);}
 return {material:{name,color,double:false,blend:0,texture:null},mesh:{name:'FaceEyes',positions,normals,uv,skinIndices,skinWeights,faceRegions,groups:[{material:materialIndex,indices}],expressions:{},stoneRebuilt:true}};
}
function socketMeshes(base,c,index){
 const face=base.meshes.find(m=>m.name==='Face'),tri=face.groups.flatMap(g=>g.indices),p=face.positions,side=Math.sign(c[0]),width=.0135,height=.0045,count=48;
 const surface=(x,y)=>{let z=-Infinity;for(let k=0;k<tri.length;k+=3){const a=tri[k]*3,b=tri[k+1]*3,d=tri[k+2]*3,ax=p[a]/1e5,ay=p[a+1]/1e5,bx=p[b]/1e5-ax,by=p[b+1]/1e5-ay,cx=p[d]/1e5-ax,cy=p[d+1]/1e5-ay,det=bx*cy-by*cx;if(Math.abs(det)<1e-12)continue;const u=((x-ax)*cy-(y-ay)*cx)/det,v=(bx*(y-ay)-by*(x-ax))/det;if(u>=0&&v>=0&&u+v<=1)z=Math.max(z,(p[a+2]+u*(p[b+2]-p[a+2])+v*(p[d+2]-p[a+2]))/1e5);}return Number.isFinite(z)?z:c[2];};
 const vertex=(a,r)=>{const dx=Math.cos(a)*width*r,dy=Math.sin(a)*height*r,z=surface(c[0]+dx,c[1]+dy)+.00010;return [c[0]+dx,c[1]+dy,r===1?Math.max(z,c[2]-side*.30*dx+.50*dy+.0005):z];};
 const make=(name,radii,steps,start,end,color)=>{const positions=[],normals=[],uv=[],indices=[],skinIndices=[],skinWeights=[],faceRegions=[];
 for(const r of radii)for(let i=0;i<=steps;i++){const a=start+(end-start)*i/steps,v=vertex(a,r);if(name.includes('Eyeline'))v[2]+=.00035;positions.push(...v.map(v=>Math.round(v*1e5)));normals.push(Math.round(side*.26*32767),-Math.round(.25*32767),Math.round(.932*32767));uv.push(0,0);skinIndices.push(base.rig.humanoid.head,0,0,0);skinWeights.push(1,0,0,0);faceRegions.push('Face:eye'+index);}
 for(let i=0;i<steps;i++){const a=i,b=i+1,c=steps+1+i,d=c+1;indices.push(a,c,b,b,c,d);}return {material:{name,color,double:true,blend:0,texture:null},mesh:{name:'FaceEyes',positions,normals,uv,skinIndices,skinWeights,faceRegions,groups:[{material:0,indices}],expressions:{},stoneRebuilt:true}};
 };
 return [make('StoneEyeLid_SKIN',[1,1.55],count,0,Math.PI*2,[1,1,1,1]),make('Stone_Eyeline',[1.001,1.08],24,0,Math.PI,[.025,.018,.017,1])];
}
function fittedSurface(base,name,conditions,allowance){
 const body=base.meshes.find(m=>m.name==='Body'),positions=[],normals=[],uv=[],skinIndices=[],skinWeights=[],indices=[];
 const blend=(a,b,t)=>{const w={};for(const [j,v] of Object.entries(a.w))w[j]=(w[j]||0)+v*(1-t);for(const [j,v] of Object.entries(b.w))w[j]=(w[j]||0)+v*t;return {p:a.p.map((v,k)=>v+(b.p[k]-v)*t),n:a.n.map((v,k)=>v+(b.n[k]-v)*t),w};};
 for(const group of body.groups)for(let t=0;t<group.indices.length;t+=3){
  let polygon=group.indices.slice(t,t+3).map(id=>{const w={};for(let k=0;k<4;k++)w[body.skinIndices[id*4+k]]=(w[body.skinIndices[id*4+k]]||0)+body.skinWeights[id*4+k];return {p:body.positions.slice(id*3,id*3+3).map(v=>v/1e5),n:body.normals.slice(id*3,id*3+3).map(v=>v/32767),w};});
  for(const fn of conditions){const next=[];for(let k=0;k<polygon.length;k++){const a=polygon[k],b=polygon[(k+1)%polygon.length],fa=fn(a),fb=fn(b);if(fa>=0)next.push(a);if((fa>=0)!==(fb>=0))next.push(blend(a,b,fa/(fa-fb)));}polygon=next;if(polygon.length<3)break;}
  if(polygon.length<3)continue;const start=positions.length/3;
  for(const v of polygon){const len=Math.hypot(...v.n)||1,n=v.n.map(x=>x/len),d=allowance(v.p);positions.push(...v.p.map((p,k)=>Math.round((p+(k===1?0:n[k]*d))*1e5)));normals.push(...n.map(v=>Math.round(v*32767)));uv.push(0,0);const weights=Object.entries(v.w).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=weights.reduce((a,b)=>a+b[1],0)||1;for(let k=0;k<4;k++){skinIndices.push(Number(weights[k]?.[0]||0));skinWeights.push((weights[k]?.[1]||0)/sum);}}
  for(let k=1;k<polygon.length-1;k++)indices.push(start,start+k,start+k+1);
 }
 return {name,positions,normals,uv,skinIndices,skinWeights,groups:[{material:0,indices}],expressions:{},stoneRebuilt:true};
}
export function composeStoneReference(base,state){
 const data={...base,materials:base.materials.map(m=>({...m})),maps:base.materials.map(()=>null),meshes:[]};
 const add=(mesh,material)=>{const id=data.materials.length;data.materials.push(material);data.maps.push(null);data.meshes.push({...mesh,groups:mesh.groups.map(g=>({...g,material:id}))});};
 const l=base.landmarks,eyeY=(l.leftEye[1]+l.rightEye[1])/2;
 const rig={neckY:l.neck[1],rebuilt:true,reference:false,eyes:[l.rightEye,l.leftEye],eyeY,chin:l.faceGuide?.chin??1.452,top:l.faceGuide?.top??1.62,mouth:l.faceGuide?.mouth??[0,1.486,.108],nose:l.faceGuide?.nose??[0,1.545,.130],brows:l.faceGuide?.brows??[[-.028,1.586,.117],[.028,1.586,.117]],headX:0,headZ:l.head[2],gender:'male',preset:{name:'Stone · 参考头部重建脸',eyeScale:1,jawMix:0,adult:false},guide:{jawRatios:[1,1,1,1,1]}};
 data.landmarks={...l,faceRig:rig};
 const body=base.meshes.find(m=>m.name==='Body');const face=base.meshes.find(m=>m.name==='Face');data.meshes.push(body,{...face,faceRegions:Array(face.positions.length/3).fill('Face:skin')});
 if(!l.surfaceStage)for(let i=0;i<2;i++){const c=[...rig.eyes[i]];const blink=state.expression==='blink'?.12:1;for(const [name,region,width,height,z,color] of [['StoneEyeWhite','Face:eye'+i,.014,.0050*blink,0,[.93,.93,.93,1]],['StoneEyeIris','Face:iris'+i,.0035,.0035*blink,.0022,[1,1,1,1]]]){const e=eyeMesh(base,name,region,[c[0],c[1],c[2]+z],width,height,color,data.materials.length);add(e.mesh,e.material);}for(const e of socketMeshes(base,c,i))add(e.mesh,e.material);}
 // The supplied crown is separated into selectable JS sections without moving it.
 const hair=base.meshes.find(m=>m.name==='HairReference');
 for(const [key,part] of [['frontHair','Front'],['backHair','Back'],['sideHair','Side']])if(!l.surfaceStage&&state[key]==='stoneRef'){
  const tri=[];for(const g of hair.groups)for(let t=0;t<g.indices.length;t+=3){const ids=g.indices.slice(t,t+3),c=ids.map(i=>hair.positions.slice(i*3,i*3+3).map(v=>v/1e5)).reduce((a,p)=>a.map((v,j)=>v+p[j]/3),[0,0,0]);const section=Math.abs(c[0])>.047?'Side':c[2]>.005?'Front':'Back';if(section===part)tri.push(...ids);}
  const length=1+clamp(state[key==='frontHair'?'frontLength':key==='backHair'?'backLength':'sideLength'])*.30,volume=1+clamp(state.hairVolume)*.15;const positions=hair.positions.map((v,i)=>i%3===1?Math.round((v/1e5<1.66?1.66+(v/1e5-1.66)*length:v/1e5)*1e5):Math.round((i%3===0?v*volume:(l.head[2]*1e5+(v-l.head[2]*1e5)*volume))));
  data.meshes.push({...hair,positions,name:'Hair'+part,groups:[{material:2,indices:tri}]});
 }
 const cloth=(name)=>({name,color:[1,1,1,1],double:true,blend:0,texture:null});
 if(state.clothes==='underwear')for(const mesh of createUnderwearData(base,state.gender))add(mesh,cloth('Underwear_Bottoms_CLOTH'));
 else{
  const legBones=new Set(Object.entries(base.rig.humanoid).filter(([k])=>/Leg|Foot|Toes/.test(k)).map(([,i])=>i));
  const armBones=new Set(Object.entries(base.rig.humanoid).filter(([k])=>/Arm|Hand|Thumb|Index|Middle|Ring|Little/.test(k)).map(([,i])=>i));
  const influence=(v,set)=>Object.entries(v.w).reduce((s,[j,w])=>s+(set.has(Number(j))?w:0),0);
  const shirt=fittedSurface(base,'Shirt',[v=>v.p[1]-(l.hips[1]-.025-clamp(state.shirtLength)*.055),v=>Math.max(l.neck[1]-.027-v.p[1],Math.hypot(v.p[0],v.p[2]-l.neck[2])-.075),v=>influence(v,armBones)<.4?1:v.p[1]-(1.18-clamp(state.sleeveLength)*.16)],p=>.012+Math.max(0,clamp(state.shirtEase))*.025);add(shirt,cloth('Stone_Shirt_Tops_CLOTH'));
  const collar=fittedSurface(base,'ShirtCollar',[v=>v.p[1]-(l.neck[1]-.055),v=>l.neck[1]-.014-v.p[1],v=>.12-Math.hypot(v.p[0],v.p[2]-l.neck[2])],p=>.018);add(collar,cloth('Stone_Collar_Tops_CLOTH'));
  const pants=fittedSurface(base,'Pants',[v=>l.hips[1]+.035-v.p[1],v=>v.p[1]-.115,v=>.20-influence(v,armBones)],p=>.012+Math.max(0,clamp(state.pantsWidth))*.025);add(pants,cloth('Stone_Pants_Bottoms_CLOTH'));
 }
 if(state.shoes==='shoes')add(fittedSurface(base,'Shoes',[v=>.132-v.p[1]],()=>.010),cloth('Stone_Shoes_CLOTH'));
 return data;
}

// Add shared support edges for the adult upper-trapezius crest. Adjacent
// triangles use the same edge sample, including UV and skin-weight interpolation.
export function refineTrapezius(mesh,neck,options={}){
 const edgeKey=(a,b)=>[a,b].sort((a,b)=>a-b).join(',');
 const marked=new Set();
 for(const g of mesh.groups)for(let i=0;i<g.indices.length;i+=3){
  const ids=g.indices.slice(i,i+3),x=ids.reduce((s,id)=>s+Math.abs(mesh.positions[id*3]/1e5),0)/3,y=ids.reduce((s,id)=>s+mesh.positions[id*3+1]/1e5,0)/3;
  const z=ids.reduce((s,id)=>s+mesh.positions[id*3+2]/1e5,0)/3;
  const upper=!options.neckOnly&&x>.04&&x<.18&&y>neck-.14&&y<neck-.025;
  const dorsal=options.back&&z<-.015&&x<.19&&y>options.hip+.045&&y<neck-.06;
  const neckBand=options.neck&&x<.210&&y>neck-.145&&y<neck+.092&&(y<neck+.025||z<(options.depth||0)+.084);
  if(upper||dorsal||neckBand)for(let k=0;k<3;k++){
   const a=ids[k],b=ids[(k+1)%3],length=Math.hypot(...[0,1,2].map(k=>(mesh.positions[a*3+k]-mesh.positions[b*3+k])/1e5));
   if(upper||(neckBand&&length>.017)||length>.025)marked.add(edgeKey(a,b));
  }
 }
 const start=mesh.positions.length/3,midpoints=new Map();
 const add=ids=>{
  const id=mesh.positions.length/3;
  for(const [field,size] of [['positions',3],['normals',3],['uv',2]])for(let k=0;k<size;k++){
   const v=ids.reduce((s,j)=>s+mesh[field][j*size+k],0)/ids.length;mesh[field].push(field==='positions'?Math.round(v):v);
  }
  const weights={};for(const j of ids)for(let k=0;k<4;k++){const b=mesh.skinIndices[j*4+k];weights[b]=(weights[b]||0)+mesh.skinWeights[j*4+k]/ids.length;}
  const top=Object.entries(weights).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((s,v)=>s+v[1],0)||1;
  for(let k=0;k<4;k++){mesh.skinIndices.push(Number(top[k]?.[0]||0));mesh.skinWeights.push((top[k]?.[1]||0)/sum);}
  mesh.faceRegions.push(mesh.faceRegions[ids[0]]);return id;
 };
 for(const g of mesh.groups){const out=[];for(let i=0;i<g.indices.length;i+=3){
  const ids=g.indices.slice(i,i+3),polygon=[];
  for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3],key=edgeKey(a,b);polygon.push(a);if(marked.has(key)){if(!midpoints.has(key))midpoints.set(key,add([a,b]));polygon.push(midpoints.get(key));}}
  if(polygon.length===3)out.push(...ids);else{const center=add(ids);for(let k=0;k<polygon.length;k++)out.push(polygon[k],polygon[(k+1)%polygon.length],center);}
 }g.indices=out;}
 mesh.trapeziusSupportVertices=mesh.positions.length/3-start;
 if(options.neck)mesh.neckSupportVertices=mesh.trapeziusSupportVertices;
 return mesh;
}

// Exchange complete heads (face + scalp + upper neck) in the body's bind frame.
// Clip actual triangles at the neck, interpolate UVs/weights, and conform the
// donor's lower neck to the recipient cross-section. Source assets stay immutable.
export function graftHead(recipient, donor, bodyBase, headBase, options={}){
 const sourceCut=headBase.landmarks.neck[1]+.015,targetCut=bodyBase.landmarks.neck[1]+.015;
 const shift=[bodyBase.landmarks.neck[0]-headBase.landmarks.neck[0],targetCut-sourceCut,bodyBase.landmarks.neck[2]-headBase.landmarks.neck[2]];
 const bones=headBase.rig.bones.map(b=>bodyBase.rig.bones.findIndex(t=>t.name===b.name));
 if(bones.some(i=>i<0))throw Error('头部骨骼无法匹配');
 function clip(mesh,base,above){
  const result={...mesh,positions:[],normals:[],uv:[],skinIndices:[],skinWeights:[],faceRegions:[],groups:[],expressions:{}};
  const original=base.rig.meshes[mesh.name],cut=above?sourceCut+(options.neckProfile?.008:0):targetCut,cache=new Map();
  const read=id=>{const weights={};for(let k=0;k<4;k++){const j=mesh.skinIndices?.[id*4+k]??original.indices[id*4+k],w=mesh.skinWeights?.[id*4+k]??original.weights[id*4+k]/65535;weights[above?bones[j]:j]=(weights[above?bones[j]:j]||0)+w;}return {key:String(id),p:mesh.positions.slice(id*3,id*3+3).map(v=>v/1e5),n:mesh.normals.slice(id*3,id*3+3),uv:mesh.uv.slice(id*2,id*2+2),w:weights,region:mesh.faceRegions?.[id]||'Face:skin'};};
  const mix=(a,b)=>{const t=(cut-a.p[1])/(b.p[1]-a.p[1]),w={};for(const j of new Set([...Object.keys(a.w),...Object.keys(b.w)]))w[j]=(a.w[j]||0)*(1-t)+(b.w[j]||0)*t;return {key:[a.key,b.key].sort().join(':'),p:a.p.map((v,k)=>k===1?cut:v+(b.p[k]-v)*t),n:a.n.map((v,k)=>v+(b.n[k]-v)*t),uv:a.uv.map((v,k)=>v+(b.uv[k]-v)*t),w,region:a.region};};
  const add=v=>{if(cache.has(v.key))return cache.get(v.key);const id=result.positions.length/3;cache.set(v.key,id);result.positions.push(...v.p.map(x=>Math.round(x*1e5)));result.normals.push(...v.n);result.uv.push(...v.uv);result.faceRegions.push(v.region);const w=Object.entries(v.w).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=w.reduce((s,v)=>s+v[1],0)||1;for(let k=0;k<4;k++){result.skinIndices.push(Number(w[k]?.[0]||0));result.skinWeights.push((w[k]?.[1]||0)/sum);}return id;};
  for(const group of mesh.groups){const indices=[];for(let k=0;k<group.indices.length;k+=3){const polygon=group.indices.slice(k,k+3).map(read),out=[];for(let i=0;i<3;i++){const a=polygon[i],b=polygon[(i+1)%3],inside=v=>above?v.p[1]>=cut:v.p[1]<=cut;if(inside(a))out.push(a);if(inside(a)!==inside(b))out.push(mix(a,b));}if(out.length<3)continue;const ids=out.map(add);for(let i=1;i<ids.length-1;i++)indices.push(ids[0],ids[i],ids[i+1]);}if(indices.length)result.groups.push({...group,indices});}
  return result;
 }
 const body=recipient.meshes.find(m=>m.name==='Body'),skinGroups=body.groups.filter(g=>recipient.materials[g.material].name.includes('_SKIN'));
 const lower=clip({...body,groups:skinGroups},bodyBase,false),center=bodyBase.landmarks.neck;
 if(options.neckProfile){
  // The skeletal neck joint sits below the anatomical neck. Its old cut included
  // the trapezius skirt and expanded the donor collar almost to shoulder width.
  for(let i=0;i<lower.positions.length;i+=3){
   const x=lower.positions[i]/1e5-center[0],y=lower.positions[i+1]/1e5,z=lower.positions[i+2]/1e5-center[2];
   const t=Math.max(0,Math.min(1,(y-(targetCut-.075))/.075)),blend=t*t*(3-2*t);
   const radius=Math.hypot(x/.058,z/.061),scale=radius>1e-6?1+(1/radius-1)*blend:1;
   lower.positions[i]=Math.round((center[0]+x*scale)*1e5);lower.positions[i+2]=Math.round((center[2]+z*scale)*1e5);
  }
 }
 if(options.trapeziusStructure)refineTrapezius(lower,center[1],{back:true,hip:bodyBase.landmarks.hips[1],neck:true,depth:center[2]});
 const ring=[];for(let i=0;i<lower.positions.length;i+=3)if(Math.abs(lower.positions[i+1]/1e5-targetCut)<.000011)ring.push([lower.positions[i]/1e5,lower.positions[i+2]/1e5,i/3]);
 if(options.neckProfile){
  const canonical=new Map(),edgeCounts=new Map();
  const vertex=id=>{const key=lower.positions.slice(id*3,id*3+3).join(',');if(!canonical.has(key))canonical.set(key,id);return canonical.get(key);};
  for(const g of lower.groups)for(let i=0;i<g.indices.length;i+=3){const t=g.indices.slice(i,i+3).map(vertex);for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3];if(a===b)continue;const key=[a,b].sort((a,b)=>a-b).join(',');edgeCounts.set(key,(edgeCounts.get(key)||0)+1);}}
  const boundary=new Set([...edgeCounts].filter(([,n])=>n===1).flatMap(([k])=>k.split(',').map(Number)).filter(id=>lower.positions[id*3+1]/1e5>targetCut-.07));
  ring.splice(0,ring.length,...[...boundary].map(id=>[lower.positions[id*3]/1e5,lower.positions[id*3+2]/1e5,id]));
 }
 const unique=[...new Map(ring.map(p=>[p.slice(0,2).join(','),p])).values()];
 unique.sort((a,b)=>Math.atan2(a[1]-center[2],a[0]-center[0])-Math.atan2(b[1]-center[2],b[0]-center[0]));
 if(unique.length<3)throw Error('身材缺少颈部接口');
 function surface(x,z){
  const dx=x-center[0],dz=z-center[2];
  for(let i=0;i<unique.length;i++){
   const a=unique[i],b=unique[(i+1)%unique.length],ax=a[0]-center[0],az=a[1]-center[2],ex=b[0]-a[0],ez=b[1]-a[1],det=dx*ez-dz*ex;
   if(Math.abs(det)<1e-10)continue;const t=(ax*ez-az*ex)/det,u=(ax*dz-az*dx)/det;
   if(t>0&&u>=-.00001&&u<=1.00001){
    const weights={};for(const [v,factor] of [[a[2],1-u],[b[2],u]])for(let k=0;k<4;k++){const bone=lower.skinIndices[v*4+k];weights[bone]=(weights[bone]||0)+lower.skinWeights[v*4+k]*factor;}
    return {point:[center[0]+t*dx,center[2]+t*dz],weights};
   }
  }
  return {point:[x,z],weights:null};
 }
 const data={...recipient,materials:[...recipient.materials,...donor.materials],maps:[...recipient.maps,...donor.maps],meshes:recipient.meshes.filter(m=>!['Face','FaceEyes','FaceEars','Body'].includes(m.name)&&!m.name.startsWith('Hair'))};
 // Non-skin body groups (e.g. standard shoes) remain on their original surface.
 const other=body.groups.filter(g=>!skinGroups.includes(g));data.meshes.unshift(lower);if(other.length)data.meshes.push({...body,groups:other,name:'BodyAccessories'});
 const offset=recipient.materials.length;
 for(const mesh of donor.meshes.filter(m=>['Body','Face','FaceEyes','FaceEars'].includes(m.name))){
  const groups=mesh.name==='Body'?mesh.groups.filter(g=>donor.materials[g.material].name.includes('_SKIN')):mesh.groups;
  const head=clip({...mesh,groups},headBase,true);if(!head.groups.length)continue;
  for(let i=0;i<head.positions.length;i+=3){let x=head.positions[i]/1e5+shift[0],y=head.positions[i+1]/1e5+shift[1],z=head.positions[i+2]/1e5+shift[2];const liftT=Math.max(0,Math.min(1,(y-targetCut-.008)/.010));y+=(options.headLift||0)*liftT*liftT*(3-2*liftT);const t=Math.max(0,Math.min(1,(y-targetCut-(options.neckProfile?.008:0))/(options.neckProfile?.017:.055))),blend=1-t*t*(3-2*t),fit=surface(x,z),p=fit.point;x+=(p[0]-x)*blend;z+=(p[1]-z)*blend;const forwardT=Math.max(0,Math.min(1,(y-targetCut-.008)/.020));z+=(options.headForward||0)*forwardT*forwardT*(3-2*forwardT);head.positions.splice(i,3,Math.round(x*1e5),Math.round(y*1e5),Math.round(z*1e5));
   // Blend to the recipient's actual seam weights, not a forced neck bone.
   if(fit.weights&&blend>0){const weights={...fit.weights};for(const bone of Object.keys(weights))weights[bone]*=blend;for(let k=0;k<4;k++){const bone=head.skinIndices[i/3*4+k];weights[bone]=(weights[bone]||0)+head.skinWeights[i/3*4+k]*(1-blend);}const top=Object.entries(weights).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((s,v)=>s+v[1],0);head.skinIndices.splice(i/3*4,4,...Array.from({length:4},(_,k)=>Number(top[k]?.[0]||0)));head.skinWeights.splice(i/3*4,4,...Array.from({length:4},(_,k)=>(top[k]?.[1]||0)/sum));}
  }
  if(options.neckProfile&&!options.trapeziusStructure){
   // Bridge the actual two boundaries; projected loops with different samples
   // otherwise leave cracks across unsampled polygon corners.
   const upper=[];for(let i=0;i<head.positions.length;i+=3)if(head.positions[i+1]===Math.round((targetCut+.008)*1e5))upper.push(i/3);
   const angle=id=>Math.atan2(head.positions[id*3+2]/1e5-center[2],head.positions[id*3]/1e5-center[0]);
   const top=[...new Map(upper.map(id=>[head.positions.slice(id*3,id*3+3).join(','),id])).values()].sort((a,b)=>angle(a)-angle(b));
   // Follow mesh connectivity, not polar sorting: small concave sections can
   // reverse angular order, which would leave an unstitched quadrilateral.
   const topSet=new Set(top),edgeCounts=new Map(),adjacent=new Map();
   for(const g of head.groups)for(let i=0;i<g.indices.length;i+=3){const t=g.indices.slice(i,i+3);for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3];if(topSet.has(a)&&topSet.has(b)){const key=[a,b].sort((a,b)=>a-b).join(',');edgeCounts.set(key,(edgeCounts.get(key)||0)+1);}}}
   for(const [key,count] of edgeCounts)if(count===1){const [a,b]=key.split(',').map(Number);if(!adjacent.has(a))adjacent.set(a,[]);if(!adjacent.has(b))adjacent.set(b,[]);adjacent.get(a).push(b);adjacent.get(b).push(a);}
   const ordered=[top[0]];let previous=-1,current=top[0];
   while(ordered.length<top.length){const next=(adjacent.get(current)||[]).filter(id=>id!==previous&&id!==ordered[0]).sort((a,b)=>angle(a)-angle(b))[0];if(next===undefined)break;ordered.push(next);previous=current;current=next;}
   if(ordered.length!==top.length)throw Error('Imported collar is not one connected loop');top.splice(0,top.length,...ordered);
   const bottom=unique.map(p=>{const id=head.positions.length/3,j=p[2];head.positions.push(...lower.positions.slice(j*3,j*3+3));head.normals.push(...lower.normals.slice(j*3,j*3+3));head.uv.push(0,0);head.faceRegions.push('Face:skin');head.skinIndices.push(...lower.skinIndices.slice(j*4,j*4+4));head.skinWeights.push(...lower.skinWeights.slice(j*4,j*4+4));return id;}).sort((a,b)=>angle(a)-angle(b));
   const bottomByPosition=new Map(bottom.map(id=>[head.positions.slice(id*3,id*3+3).join(','),id])),bodyEdges=new Map(),bodyAdjacent=new Map();
   for(const g of lower.groups)for(let i=0;i<g.indices.length;i+=3){const t=g.indices.slice(i,i+3).map(id=>bottomByPosition.get(lower.positions.slice(id*3,id*3+3).join(',')));for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3];if(a!==undefined&&b!==undefined&&a!==b){const key=[a,b].sort((a,b)=>a-b).join(',');bodyEdges.set(key,(bodyEdges.get(key)||0)+1);}}}
   for(const [key,count] of bodyEdges)if(count===1){const [a,b]=key.split(',').map(Number);if(!bodyAdjacent.has(a))bodyAdjacent.set(a,[]);if(!bodyAdjacent.has(b))bodyAdjacent.set(b,[]);bodyAdjacent.get(a).push(b);bodyAdjacent.get(b).push(a);}
   const bodyOrder=[bottom[0]];previous=-1;current=bottom[0];
   while(bodyOrder.length<bottom.length){const next=(bodyAdjacent.get(current)||[]).filter(id=>id!==previous&&id!==bodyOrder[0]).sort((a,b)=>angle(a)-angle(b))[0];if(next===undefined)break;bodyOrder.push(next);previous=current;current=next;}
   if(bodyOrder.length!==bottom.length)throw Error('Body collar is not one connected loop');bottom.splice(0,bottom.length,...bodyOrder);
   if(top.length<3||bottom.length<3)throw Error('Invalid imported neck boundary');
   const indices=head.groups[0].indices;let a=0,b=0;
   while(a<bottom.length||b<top.length){const ai=bottom[a%bottom.length],bi=top[b%top.length],nextA=a<bottom.length?angle(bottom[(a+1)%bottom.length])+(a+1>=bottom.length?Math.PI*2:0):Infinity,nextB=b<top.length?angle(top[(b+1)%top.length])+(b+1>=top.length?Math.PI*2:0):Infinity;
    if(nextA<nextB){indices.push(ai,bi,bottom[(a+1)%bottom.length]);a++;}else{indices.push(ai,bi,top[(b+1)%top.length]);b++;}
   }
   // Keep zipper winding continuous with its neighbours. A radial-normal
   // heuristic reverses sliver faces at concave boundary corners and opens cracks.

  }
  head.name=mesh.name==='Body'?'FaceScalp':mesh.name;head.groups=head.groups.map(g=>({...g,material:g.material+offset}));data.meshes.push(head);
 }
 const landmarkShift=shift.map((v,k)=>v+(k===1?(options.headLift||0):k===2?(options.headForward||0):0));
 const point=p=>p.map((v,k)=>v+landmarkShift[k]),r=donor.landmarks.faceRig;
 data.landmarks={...recipient.landmarks,headJoinY:targetCut,head:point(headBase.landmarks.head),leftEye:point(headBase.landmarks.leftEye),rightEye:point(headBase.landmarks.rightEye),faceRig:{...r,neckY:bodyBase.landmarks.neck[1],eyes:r.eyes.map(point),brows:r.brows.map(point),mouth:point(r.mouth),nose:point(r.nose),eyeY:r.eyeY+landmarkShift[1],chin:r.chin+landmarkShift[1],top:r.top+landmarkShift[1],headX:r.headX+shift[0],headZ:r.headZ+landmarkShift[2]}};
 data.eyeReliefRemoved=donor.eyeReliefRemoved;data.adultHeadPrepared=donor.adultHeadPrepared;
 data.mixedHead=true;
 if(options.trapeziusStructure){rebuildAdultNeck(data);relaxNeckSurface(data);regularizeAdultNeckJunction(data);smoothAdultNeckRoot(data);}
 return data;
}

// Conform clipped triangle edges before deformation: every collinear edge
// vertex must be shared by both neighbours, rather than leaving a T-junction.
export function conformSurface(mesh,indices){
 const count=mesh.positions.length/3,points=Array.from({length:count},(_,i)=>mesh.positions.slice(i*3,i*3+3)),out=[];
 const representatives=[],canonical=new Map();
 for(const id of new Set(indices)){const same=representatives.find(j=>Math.hypot(...points[id].map((v,k)=>v-points[j][k]))<15);if(same!==undefined)canonical.set(id,same);else{representatives.push(id);canonical.set(id,id);}}
 const clean=[],seen=new Set();for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3).map(id=>canonical.get(id)),key=[...tri].sort((a,b)=>a-b).join(',');if(new Set(tri).size<3||seen.has(key))continue;seen.add(key);clean.push(...tri);}indices=clean;
 const active=new Set(indices),edgeCache=new Map();
 const edge=(a,b)=>{const key=[a,b].sort((a,b)=>a-b).join(',');if(edgeCache.has(key)){const ids=edgeCache.get(key);return a<b?ids:[...ids].reverse();}
  const lo=Math.min(a,b),hi=Math.max(a,b),p=points[lo],q=points[hi],d=q.map((v,k)=>v-p[k]),len=d.reduce((n,v)=>n+v*v,0),hits=[];
  if(len>4)for(let id=0;id<count;id++){if(!active.has(id)||id===lo||id===hi)continue;const v=points[id],t=v.reduce((n,x,k)=>n+(x-p[k])*d[k],0)/len;if(t<=.00001||t>=.99999)continue;if(v.every((x,k)=>Math.abs(x-p[k]-d[k]*t)<1.1))hits.push([t,id]);}
  hits.sort((a,b)=>a[0]-b[0]);const ids=hits.map(v=>v[1]);edgeCache.set(key,ids);return a<b?ids:[...ids].reverse();
 };
 for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3),poly=[];for(let k=0;k<3;k++)poly.push(tri[k],...edge(tri[k],tri[(k+1)%3]));if(poly.length===3){out.push(...tri);continue;}
  const center=mesh.positions.length/3;
  for(const [key,stride] of [['positions',3],['normals',3],['uv',2]])for(let k=0;k<stride;k++)mesh[key].push(Math.round(tri.reduce((n,id)=>n+mesh[key][id*stride+k]/3,0)));
  const weights={};for(const id of tri)for(let k=0;k<4;k++){const b=mesh.skinIndices[id*4+k];weights[b]=(weights[b]||0)+mesh.skinWeights[id*4+k]/3;}const w=Object.entries(weights).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=w.reduce((n,v)=>n+v[1],0);for(let k=0;k<4;k++){mesh.skinIndices.push(Number(w[k]?.[0]||0));mesh.skinWeights.push((w[k]?.[1]||0)/sum);}mesh.faceRegions.push(mesh.faceRegions[tri[0]]);
  for(let k=0;k<poly.length;k++)if(poly[k]!==poly[(k+1)%poly.length])out.push(center,poly[k],poly[(k+1)%poly.length]);
 }
 return out;
}

// Cut an almond-shaped aperture into the donor's front surface, then give it
// a recessed lining. The cavity is closed behind the reserved eyeball volume.
export function reserveImportedEyes(donor,state={}){
 donor=prepareAdultOrbits(donor);
 const adult=!!donor.eyeReliefRemoved;
 const source=donor.meshes.find(m=>m.name==='Face');
 // Fit the first dark lining ring behind the actual temple/cheek surface.
 // A constant eye-relative depth protrudes through the receding outer canthus.
 const buriedDepth=(x,y,limit)=>{let front=-Infinity;for(const g of source.groups)for(let i=0;i<g.indices.length;i+=3){const [a,b,c]=g.indices.slice(i,i+3).map(id=>source.positions.slice(id*3,id*3+3).map(v=>v/1e5)),den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-12)continue;const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den;if(u>=0&&v>=0&&u+v<=1)front=Math.max(front,u*a[2]+v*b[2]+(1-u-v)*c[2]);}return Number.isFinite(front)?Math.min(limit,front-.002):limit;};
 const mesh={...source,positions:[],normals:[],uv:[],skinIndices:[],skinWeights:[],faceRegions:[],groups:[],expressions:{}};
 const cache=new Map(),shell=[],lining=[],rim=[],outerSkin=new Set();
 const read=id=>({p:source.positions.slice(id*3,id*3+3).map(v=>v/1e5),n:source.normals.slice(id*3,id*3+3),uv:source.uv.slice(id*2,id*2+2),w:Object.fromEntries(source.skinIndices.slice(id*4,id*4+4).map((b,k)=>[b,source.skinWeights[id*4+k]]).filter(([,w])=>w>0))});
 const mix=(a,b,t)=>({p:a.p.map((v,k)=>v+(b.p[k]-v)*t),n:a.n.map((v,k)=>v+(b.n[k]-v)*t),uv:a.uv.map((v,k)=>v+(b.uv[k]-v)*t),w:Object.fromEntries([...new Set([...Object.keys(a.w),...Object.keys(b.w)])].map(bone=>[bone,(a.w[bone]||0)*(1-t)+(b.w[bone]||0)*t]))});
 const add=v=>{const q=v.p.map(x=>Math.round(x*1e5)),key=q.join(',');if(cache.has(key))return cache.get(key);const id=mesh.positions.length/3;cache.set(key,id);mesh.positions.push(...q);mesh.normals.push(...v.n);mesh.uv.push(...v.uv);mesh.faceRegions.push('Face:skin');const w=Object.entries(v.w).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=w.reduce((s,[,v])=>s+v,0);for(let k=0;k<4;k++){mesh.skinIndices.push(Number(w[k]?.[0]||0));mesh.skinWeights.push((w[k]?.[1]||0)/sum);}return id;};
 const emit=(poly,indices)=>{if(poly.length<3)return;const ids=poly.map(add);for(let k=1;k<ids.length-1;k++)if(new Set([ids[0],ids[k],ids[k+1]]).size===3)indices.push(ids[0],ids[k],ids[k+1]);};
 const eyes=donor.landmarks.faceRig.eyes;
 // Counterclockwise almond: narrower outer corners preserve the stern brow.
 const shape=[[-1,0],[-.60,-.68],[0,-.85],[.62,-.48],[1,.22],[.50,.85],[-.20,1],[-.72,.65]];
 for(const g of source.groups)for(let i=0;i<g.indices.length;i+=3){let pieces=[g.indices.slice(i,i+3).map(read)];
  for(const eye of eyes){const sign=Math.sign(eye[0]),polygon=shape.map(([x,y])=>[eye[0]+x*.020,eye[1]+y*.0055+sign*x*.0017]);const next=[];
   for(const tri of pieces){if(tri.every(v=>v.p[2]<eye[2]-.055)||tri.every(v=>v.p[0]<eye[0]-.021)||tri.every(v=>v.p[0]>eye[0]+.021)||tri.every(v=>v.p[1]<eye[1]-.009)||tri.every(v=>v.p[1]>eye[1]+.009)){next.push(tri);continue;}let inside=tri;
    for(let e=0;e<polygon.length&&inside.length;e++){const a=polygon[e],b=polygon[(e+1)%polygon.length],field=v=>(b[0]-a[0])*(v.p[1]-a[1])-(b[1]-a[1])*(v.p[0]-a[0]),keep=[],outside=[];
     for(let k=0;k<inside.length;k++){const v=inside[k],w=inside[(k+1)%inside.length],fv=field(v),fw=field(w);(fv>=0?keep:outside).push(v);if((fv>=0)!==(fw>=0)){const hit=mix(v,w,fv/(fv-fw));keep.push(hit);outside.push(hit);}}
     if(outside.length>=3)next.push(outside);inside=keep;
    }
   }pieces=next;
  }for(const poly of pieces)emit(poly,shell);
 }
 shell.splice(0,shell.length,...conformSurface(mesh,shell));
 for(const id of shell)outerSkin.add(id);
 // Collapsing sub-pixel clipping slivers may leave an isolated triangular gap.
 // Stitch that loop; the intended eye and collar rings contain many more edges.
 const openEdges=new Map();for(let i=0;i<shell.length;i+=3)for(let k=0;k<3;k++){const a=shell[i+k],b=shell[i+(k+1)%3],key=[a,b].sort((a,b)=>a-b).join(',');if(openEdges.has(key))openEdges.delete(key);else openEdges.set(key,[a,b]);}
 const adjacent=new Map();for(const [a,b] of openEdges.values()){if(!adjacent.has(a))adjacent.set(a,[]);if(!adjacent.has(b))adjacent.set(b,[]);adjacent.get(a).push(b);adjacent.get(b).push(a);}const sealed=new Set();
 for(const [a,b] of openEdges.values()){const c=(adjacent.get(a)||[]).find(id=>id!==b&&(adjacent.get(b)||[]).includes(id));if(c===undefined||[a,b,c].some(id=>adjacent.get(id).length!==2))continue;const key=[a,b,c].sort((a,b)=>a-b).join(',');if(!sealed.has(key)){shell.push(b,a,c);sealed.add(key);}}

 // Find aperture edges geometrically; the original neck opening is excluded.
 const edges=new Map();for(let i=0;i<shell.length;i+=3)for(let k=0;k<3;k++){const a=shell[i+k],b=shell[i+(k+1)%3],key=[a,b].sort((a,b)=>a-b).join(',');const edge=edges.get(key);if(edge)edge.count++;else edges.set(key,{a,b,count:1});}
 for(const eye of eyes){const boundary=[...edges.values()].filter(e=>e.count===1&&[e.a,e.b].every(id=>Math.abs(mesh.positions[id*3]/1e5-eye[0])<.022&&Math.abs(mesh.positions[id*3+1]/1e5-eye[1])<.010&&mesh.positions[id*3+2]/1e5>eye[2]-.055));
  // Adult side walls flare behind the globe, so the dark rear lining cannot
  // curl forward into the outer canthus in a three-quarter view.
  const inner=new Map();const getInner=id=>{if(inner.has(id))return inner.get(id);const p=mesh.positions.slice(id*3,id*3+3).map(v=>v/1e5),theta=Math.atan2((p[1]-eye[1]-Math.sign(eye[0])*(p[0]-eye[0])*.085)/.0055,(p[0]-eye[0])/.020),socket=adult?[eye[0]+Math.cos(theta)*.028,eye[1]+Math.sin(theta)*.021,buriedDepth(eye[0]+Math.cos(theta)*.028,eye[1]+Math.sin(theta)*.021,eye[2]-.016)]:[eye[0]+(p[0]-eye[0])*.82,eye[1]+(p[1]-eye[1])*.82,eye[2]-.020],v={p:socket,n:[0,0,32767],uv:[0,0],w:Object.fromEntries(mesh.skinIndices.slice(id*4,id*4+4).map((b,k)=>[b,mesh.skinWeights[id*4+k]]).filter(([,w])=>w>0))};const index=add(v);inner.set(id,index);return index;};
  for(const {a,b} of boundary){const ai=getInner(a),bi=getInner(b);rim.push(b,a,ai,b,ai,bi);}
  const ids=[...inner.values()];if(!ids.length)throw Error('Eye aperture did not intersect the donor surface');
  const rear=new Map();
  if(adult)for(const id of ids){const p=mesh.positions.slice(id*3,id*3+3).map(v=>v/1e5),rearId=add({p:[p[0],p[1],eye[2]-.050],n:[0,0,32767],uv:[0,0],w:Object.fromEntries(mesh.skinIndices.slice(id*4,id*4+4).map((b,k)=>[b,mesh.skinWeights[id*4+k]]).filter(([,w])=>w>0))});rear.set(id,rearId);}
  if(adult)for(const {a,b} of boundary){const ai=getInner(a),bi=getInner(b),ar=rear.get(ai),br=rear.get(bi);lining.push(bi,ai,ar,bi,ar,br);}
  const first=ids[0],center=add({p:[eye[0],eye[1],eye[2]-(adult?.052:.024)],n:[0,0,32767],uv:[0,0],w:Object.fromEntries(mesh.skinIndices.slice(first*4,first*4+4).map((b,k)=>[b,mesh.skinWeights[first*4+k]]).filter(([,w])=>w>0))});
  for(const {a,b} of boundary)lining.push(adult?rear.get(getInner(b)):getInner(b),adult?rear.get(getInner(a)):getInner(a),center);

 }
 if(adult){
  // Reshape the already conforming skin ring rather than recutting a nearly
  // coincident donor triangle: this keeps all shared boundary vertices exact.
  const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
  for(const id of outerSkin){const p=mesh.positions.slice(id*3,id*3+3).map(v=>v/1e5);let dx=0,dy=0,dz=0;
   for(const eye of eyes){const x=p[0]-eye[0],h=p[1]-eye[1]-Math.sign(eye[0])*x*.085;
    const front=smooth(eye[2]-.035,eye[2]-.015,p[2]);
    dy-=.00155*smooth(0,.0042,h)*(1-smooth(.010,.023,h))*(1-smooth(.016,.027,Math.abs(x)))*front;
    // A ten-percent canthus contraction only reshapes the visible skin ring.
    // The complete globe and the flared inner/rear cavity retain their volume.
    const contraction=(1-smooth(.021,.035,Math.abs(x)))*(1-smooth(.008,.022,Math.abs(h)))*front,shift=-x*.10*contraction;
    // The narrowed canthi need a small forward arc to clear the unchanged
    // convex globe between low-poly triangle vertices, including depth=100.
    dx+=shift;dz-=Math.sign(eye[0])*.35*shift;dz+=.00035*contraction*smooth(.003,.012,Math.abs(x));
   }
   mesh.positions[id*3]+=Math.round(dx*1e5);mesh.positions[id*3+1]+=Math.round(dy*1e5);mesh.positions[id*3+2]+=Math.round((dz-dy*.20)*1e5);
  }
  // Re-bury only the first lining ring against the final skin surface. The
  // canthus warp may otherwise expose a hairline of the old dark side wall.
  for(const id of new Set(lining)){const p=mesh.positions.slice(id*3,id*3+3).map(v=>v/1e5),eye=eyes[p[0]<donor.landmarks.faceRig.headX?0:1];if(p[2]<eye[2]-.045)continue;
   let front=-Infinity;
   for(let i=0;i<shell.length;i+=3){const [a,b,c]=shell.slice(i,i+3).map(j=>mesh.positions.slice(j*3,j*3+3).map(v=>v/1e5)),den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-12)continue;const u=((b[1]-c[1])*(p[0]-c[0])+(c[0]-b[0])*(p[1]-c[1]))/den,v=((c[1]-a[1])*(p[0]-c[0])+(a[0]-c[0])*(p[1]-c[1]))/den;if(u>=0&&v>=0&&u+v<=1)front=Math.max(front,u*a[2]+v*b[2]+(1-u-v)*c[2]);}
   if(Number.isFinite(front))mesh.positions[id*3+2]=Math.min(mesh.positions[id*3+2],Math.floor((front-.002)*1e5));
  }
 }
 mesh.groups=[{material:0,indices:[...shell,...rim]},{material:donor.materials.length,indices:lining}];
 return {...donor,maps:[...donor.materials.map((_,i)=>donor.maps?.[i]||null),null],meshes:[mesh],materials:[...donor.materials,{name:'ImportedEyeSocket',color:[.13,.085,.065,1],double:true,blend:0,texture:null}]};
}

// Low-poly feature pieces use the same donor coordinate frame and head skinning.
export function addImportedFeatures(donor,state={}){
 const original=donor.meshes[0],mesh={...original};
 for(const key of ['positions','normals','uv','skinIndices','skinWeights','faceRegions'])mesh[key]=[...original[key]];
 mesh.groups=original.groups.map(g=>({...g,indices:[...g.indices]}));
 const materials=[...donor.materials],maps=[...donor.maps],rig=donor.landmarks.faceRig;
 const value=k=>Math.max(-1,Math.min(1,((state[k]??50)-50)/50));
 const surface=(x,y,fallback)=>{let z=-Infinity;for(const g of original.groups.filter(g=>g.material===0))for(let i=0;i<g.indices.length;i+=3){const [a,b,c]=g.indices.slice(i,i+3).map(id=>original.positions.slice(id*3,id*3+3).map(v=>v/1e5));const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-12)continue;const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den;if(u>=0&&v>=0&&u+v<=1)z=Math.max(z,u*a[2]+v*b[2]+(1-u-v)*c[2]);}return Number.isFinite(z)?z:fallback;};
 const vertex=(p,n=[0,0,32767],uv=[0,0])=>{const id=mesh.positions.length/3;mesh.positions.push(...p.map(v=>Math.round(v*1e5)));mesh.normals.push(...n);mesh.uv.push(...uv.map(v=>Math.round(v*65535)));mesh.skinIndices.push(donor.rig.humanoid.head,0,0,0);mesh.skinWeights.push(1,0,0,0);mesh.faceRegions.push('Face:detail');return id;};
 const group=(name,color)=>{const g={material:materials.length,indices:[]};materials.push({name,color:[...color,1],double:true,blend:0,texture:null});maps.push(null);mesh.groups.push(g);return g.indices;};
 const adult=donor.reference?.baseFamily==='adultMale';
 const white=group('ImportedEyeWhite',[.88,.86,.80]),iris=group('ImportedEyeIris',[.18,.12,.07]),pupil=group('ImportedPupil',[.012,.009,.007]),brows=group('ImportedFaceBrow',[.05,.04,.035]);
 for(const [index,eye] of rig.eyes.entries()){
  // The adult socket keeps its neutral position; its measured forward clearance is 2 mm.
  const depthValue=value('eyeballDepth'),depth=depthValue*(donor.eyeReliefRemoved&&depthValue>0?.002:.005);
  const sign=index===0?-1:1,center=[eye[0],eye[1],eye[2]-.022+depth];
  const n=16,rows=8,ids=[];
  for(let j=0;j<=rows;j++){const phi=Math.PI*j/rows;for(let k=0;k<n;k++){const a=2*Math.PI*k/n;ids.push(vertex([center[0]+.021*Math.sin(phi)*Math.cos(a),center[1]+.010*Math.cos(phi),center[2]+.015*Math.sin(phi)*Math.sin(a)]));}}
  for(let j=0;j<rows;j++)for(let k=0;k<n;k++){const a=ids[j*n+k],b=ids[j*n+(k+1)%n],c=ids[(j+1)*n+k],d=ids[(j+1)*n+(k+1)%n];if(j>0)white.push(a,c,b);if(j<rows-1)white.push(b,c,d);}
  const gx=value('gazeX')*.006,gy=value('gazeY')*.003+(adult?.0012*(1+Math.min(0,depth)/.005):0),front=eye[2]-.0065+depth;
  // A larger iris sits a little above the lid's neutral centre. The upper lid
  // clips its arc; keep the complete globe rather than flattening the eyeball.
  const disc=(radius,indices,z)=>{const mapped=adult&&indices===iris,c=vertex([eye[0]+gx,eye[1]+gy,z],undefined,mapped?[.5,.5]:[0,0]),ring=[];for(let k=0;k<16;k++){const a=2*Math.PI*k/16;ring.push(vertex([eye[0]+gx+Math.cos(a)*radius,eye[1]+gy+Math.sin(a)*radius,z-.001],undefined,mapped?[.5+Math.cos(a)*.5,.5+Math.sin(a)*.5]:[0,0]));}for(let k=0;k<16;k++)indices.push(c,ring[k],ring[(k+1)%16]);};
  const radius=(adult?.0074:.0065)*(1+value('irisSize')*.45);disc(radius,iris,front+.0005);disc(radius*(adult?.37:.43)*(1+value('pupilSize')*.55),pupil,front+.001);
  const strips=[];
  const browSamples=adult?[...Array.from({length:12},(_,k)=>k/12),21/24,43/48,45/48,23/24,47/48,1].sort((a,b)=>a-b):Array.from({length:13},(_,k)=>k/12);
  for(const t of browSamples){
   const x=.010+.048*t,width=1+value('browWidth')*.30,px=sign*(.031+(x-.031)*width)-.001;
   const y=eye[1]+(t<.73?.003+.015*t/.73:.018-.008*(t-.73)/.27);
   const thick=.008*(1+value('browThickness')*.65)*(t<.90?1:(1-t)/.10);
   const row=(adult?[y,y+thick*.5,y+thick]:[y,y+thick]).map(py=>vertex([px,py,surface(px,py,eye[2]+.006)+(adult?.0008:.0025)]));if(adult&&thick===0)row.fill(row[0]);strips.push(row);
  }
  if(adult){
   // Vertex projection alone can bury a ribbon across a concave bone plane.
   // Fit interior samples too, using the same already-prepared skin surface.
   const triangles=[];for(let k=0;k<strips.length-1;k++)for(let row=0;row<strips[k].length-1;row++){const [a,b]=strips[k].slice(row,row+2),[c,d]=strips[k+1].slice(row,row+2);triangles.push([a,b,c],[b,d,c]);}
   const samples=[[1/3,1/3,1/3],[.5,.5,0],[.5,0,.5],[0,.5,.5]];
   for(let pass=0;pass<4;pass++)for(const tri of triangles){
    if(new Set(tri).size<3)continue;
    let lift=0;for(const w of samples){const p=[0,1,2].map(k=>tri.reduce((sum,id,j)=>sum+mesh.positions[id*3+k]/1e5*w[j],0));lift=Math.max(lift,surface(p[0],p[1],p[2]-.0008)+.0006-p[2]);}
    if(lift>0)for(const id of tri)mesh.positions[id*3+2]+=Math.ceil(lift*1e5);
   }
  }
  for(let k=0;k<strips.length-1;k++)for(let row=0;row<strips[k].length-1;row++){const [a,b]=strips[k].slice(row,row+2),[c,d]=strips[k+1].slice(row,row+2);// Mirroring X reverses winding; both eyebrow ribbons must face outward.
   if(sign<0)brows.push(a,b,c,b,d,c);else brows.push(a,c,b,b,c,d);}

 }
 const upper=group('ImportedUpperLip_SKIN',[1,1,1]),lower=group('ImportedLowerLip_SKIN',[1,1,1]),line=group('ImportedMouthLine',[.13,.065,.043]);
 const mouth=rig.mouth,xs=[-1,-.66,-.30,0,.30,.66,1],seam=[],top=[],bottom=[];
 for(const t of xs){const x=mouth[0]+t*.027,y=mouth[1]+.0015*(1-t*t),z=surface(x,y,mouth[2])+.0012;
  seam.push([x,y,z]);const cupid=.0038+.0022*Math.exp(-(((Math.abs(t)-.30)/.22)**2));
  top.push([x,y+cupid*(1-Math.abs(t))*(1+value('upperLipThickness')*.65),z+.0018*(1-t*t)+value('upperLipProjection')*.003]);
  bottom.push([x,y-.0055*(1-t*t)*(1+value('lowerLipThickness')*.65),z+.0023*(1-t*t)+value('lowerLipProjection')*.003]);
 }
 const ribbon=(a,b,indices)=>{for(let i=0;i<a.length-1;i++){const ids=[a[i],a[i+1],b[i],b[i+1]].map(p=>vertex(p));indices.push(ids[0],ids[2],ids[1],ids[1],ids[2],ids[3]);}};
 ribbon(top,seam,upper);ribbon(seam,bottom,lower);ribbon(seam.map(p=>[p[0],p[1]+.00045,p[2]+.0004]),seam.map(p=>[p[0],p[1]-.00045,p[2]+.0004]),line);
 return {...donor,meshes:[mesh],materials,maps};
}
