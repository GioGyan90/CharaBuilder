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

// Exchange complete heads (face + scalp + upper neck) in the body's bind frame.
// Clip actual triangles at the neck, interpolate UVs/weights, and conform the
// donor's lower neck to the recipient cross-section. Source assets stay immutable.
export function graftHead(recipient, donor, bodyBase, headBase){
 const sourceCut=headBase.landmarks.neck[1]+.015,targetCut=bodyBase.landmarks.neck[1]+.015;
 const shift=[bodyBase.landmarks.neck[0]-headBase.landmarks.neck[0],targetCut-sourceCut,bodyBase.landmarks.neck[2]-headBase.landmarks.neck[2]];
 const bones=headBase.rig.bones.map(b=>bodyBase.rig.bones.findIndex(t=>t.name===b.name));
 if(bones.some(i=>i<0))throw Error('头部骨骼无法匹配');
 function clip(mesh,base,above){
  const result={...mesh,positions:[],normals:[],uv:[],skinIndices:[],skinWeights:[],faceRegions:[],groups:[],expressions:{}};
  const original=base.rig.meshes[mesh.name],cut=above?sourceCut:targetCut,cache=new Map();
  const read=id=>{const weights={};for(let k=0;k<4;k++){const j=mesh.skinIndices?.[id*4+k]??original.indices[id*4+k],w=mesh.skinWeights?.[id*4+k]??original.weights[id*4+k]/65535;weights[above?bones[j]:j]=(weights[above?bones[j]:j]||0)+w;}return {key:String(id),p:mesh.positions.slice(id*3,id*3+3).map(v=>v/1e5),n:mesh.normals.slice(id*3,id*3+3),uv:mesh.uv.slice(id*2,id*2+2),w:weights,region:mesh.faceRegions?.[id]||'Face:skin'};};
  const mix=(a,b)=>{const t=(cut-a.p[1])/(b.p[1]-a.p[1]),w={};for(const j of new Set([...Object.keys(a.w),...Object.keys(b.w)]))w[j]=(a.w[j]||0)*(1-t)+(b.w[j]||0)*t;return {key:[a.key,b.key].sort().join(':'),p:a.p.map((v,k)=>k===1?cut:v+(b.p[k]-v)*t),n:a.n.map((v,k)=>v+(b.n[k]-v)*t),uv:a.uv.map((v,k)=>v+(b.uv[k]-v)*t),w,region:a.region};};
  const add=v=>{if(cache.has(v.key))return cache.get(v.key);const id=result.positions.length/3;cache.set(v.key,id);result.positions.push(...v.p.map(x=>Math.round(x*1e5)));result.normals.push(...v.n);result.uv.push(...v.uv);result.faceRegions.push(v.region);const w=Object.entries(v.w).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=w.reduce((s,v)=>s+v[1],0)||1;for(let k=0;k<4;k++){result.skinIndices.push(Number(w[k]?.[0]||0));result.skinWeights.push((w[k]?.[1]||0)/sum);}return id;};
  for(const group of mesh.groups){const indices=[];for(let k=0;k<group.indices.length;k+=3){const polygon=group.indices.slice(k,k+3).map(read),out=[];for(let i=0;i<3;i++){const a=polygon[i],b=polygon[(i+1)%3],inside=v=>above?v.p[1]>=cut:v.p[1]<=cut;if(inside(a))out.push(a);if(inside(a)!==inside(b))out.push(mix(a,b));}if(out.length<3)continue;const ids=out.map(add);for(let i=1;i<ids.length-1;i++)indices.push(ids[0],ids[i],ids[i+1]);}if(indices.length)result.groups.push({...group,indices});}
  return result;
 }
 const body=recipient.meshes.find(m=>m.name==='Body'),skinGroups=body.groups.filter(g=>recipient.materials[g.material].name.includes('_SKIN'));
 const lower=clip({...body,groups:skinGroups},bodyBase,false),center=bodyBase.landmarks.neck;
 const ring=[];for(let i=0;i<lower.positions.length;i+=3)if(Math.abs(lower.positions[i+1]/1e5-targetCut)<.000011)ring.push([lower.positions[i]/1e5,lower.positions[i+2]/1e5,i/3]);
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
 const data={...recipient,materials:[...recipient.materials,...donor.materials],maps:[...recipient.maps,...donor.maps],meshes:recipient.meshes.filter(m=>!['Face','FaceEyes','Body'].includes(m.name)&&!m.name.startsWith('Hair'))};
 // Non-skin body groups (e.g. standard shoes) remain on their original surface.
 const other=body.groups.filter(g=>!skinGroups.includes(g));data.meshes.unshift(lower);if(other.length)data.meshes.push({...body,groups:other,name:'BodyAccessories'});
 const offset=recipient.materials.length;
 for(const mesh of donor.meshes.filter(m=>['Body','Face','FaceEyes'].includes(m.name))){
  const groups=mesh.name==='Body'?mesh.groups.filter(g=>donor.materials[g.material].name.includes('_SKIN')):mesh.groups;
  const head=clip({...mesh,groups},headBase,true);if(!head.groups.length)continue;
  for(let i=0;i<head.positions.length;i+=3){let x=head.positions[i]/1e5+shift[0],y=head.positions[i+1]/1e5+shift[1],z=head.positions[i+2]/1e5+shift[2];const t=Math.max(0,Math.min(1,(y-targetCut)/.055)),blend=1-t*t*(3-2*t),fit=surface(x,z),p=fit.point;x+=(p[0]-x)*blend;z+=(p[1]-z)*blend;head.positions.splice(i,3,Math.round(x*1e5),Math.round(y*1e5),Math.round(z*1e5));
   // Blend to the recipient's actual seam weights, not a forced neck bone.
   if(fit.weights&&blend>0){const weights={...fit.weights};for(const bone of Object.keys(weights))weights[bone]*=blend;for(let k=0;k<4;k++){const bone=head.skinIndices[i/3*4+k];weights[bone]=(weights[bone]||0)+head.skinWeights[i/3*4+k]*(1-blend);}const top=Object.entries(weights).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((s,v)=>s+v[1],0);head.skinIndices.splice(i/3*4,4,...Array.from({length:4},(_,k)=>Number(top[k]?.[0]||0)));head.skinWeights.splice(i/3*4,4,...Array.from({length:4},(_,k)=>(top[k]?.[1]||0)/sum));}
  }
  head.name=mesh.name==='Body'?'FaceScalp':mesh.name;head.groups=head.groups.map(g=>({...g,material:g.material+offset}));data.meshes.push(head);
 }
 const point=p=>p.map((v,k)=>v+shift[k]),r=donor.landmarks.faceRig;
 data.landmarks={...recipient.landmarks,headJoinY:targetCut,head:point(headBase.landmarks.head),leftEye:point(headBase.landmarks.leftEye),rightEye:point(headBase.landmarks.rightEye),faceRig:{...r,neckY:bodyBase.landmarks.neck[1],eyes:r.eyes.map(point),brows:r.brows.map(point),mouth:point(r.mouth),nose:point(r.nose),eyeY:r.eyeY+shift[1],chin:r.chin+shift[1],top:r.top+shift[1],headX:r.headX+shift[0],headZ:r.headZ+shift[2]}};
 data.mixedHead=true;return data;
}
