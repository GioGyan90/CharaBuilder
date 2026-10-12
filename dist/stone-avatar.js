import {createUnderwearData} from './underwear.js?v=45';
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
