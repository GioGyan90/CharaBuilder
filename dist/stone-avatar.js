import {createUnderwearData} from './underwear.js?v=38';
// Independent user-reference foundation. No old Stone morph/sculpt data is applied.
const clamp=v=>Math.max(-2,Math.min(2,((v??50)-50)/50));
function eyeMesh(base,name,region,c,width,height,color,materialIndex){
 const positions=[],normals=[],uv=[],indices=[],skinIndices=[],skinWeights=[],faceRegions=[];
 const count=24;for(let i=0;i<=count;i++){const a=(i-1)/count*Math.PI*2,p=i===0?c:[c[0]+Math.cos(a)*width,c[1]+Math.sin(a)*height,c[2]-.0008];positions.push(...p.map(v=>Math.round(v*1e5)));normals.push(0,0,32767);uv.push(0,0);skinIndices.push(base.rig.humanoid.head,0,0,0);skinWeights.push(1,0,0,0);faceRegions.push(region);}
 for(let i=1;i<count;i++)indices.push(0,i,i+1);indices.push(0,count,1);
 return {material:{name,color,double:true,blend:0,texture:null},mesh:{name:'FaceEyes',positions,normals,uv,skinIndices,skinWeights,faceRegions,groups:[{material:materialIndex,indices}],expressions:{},stoneRebuilt:true}};
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
 const rig={neckY:l.neck[1],rebuilt:true,reference:false,eyes:[l.rightEye,l.leftEye],eyeY,chin:1.452,top:1.62,mouth:[0,1.486,.108],nose:[0,1.545,.130],brows:[[-.028,1.612,.088],[.028,1.612,.088]],headX:0,headZ:l.head[2],gender:'male',preset:{name:'Stone · 白模重建脸',eyeScale:1,jawMix:0,adult:false},guide:{jawRatios:[1,1,1,1,1]}};
 data.landmarks={...l,faceRig:rig};
 const body=base.meshes.find(m=>m.name==='Body');const face=base.meshes.find(m=>m.name==='Face');data.meshes.push(body,{...face,faceRegions:Array(face.positions.length/3).fill('Face:skin')});
 for(let i=0;i<2;i++){const c=[...rig.eyes[i]];const blink=state.expression==='blink'?.12:1;for(const [name,region,width,height,z,color] of [['StoneEyeWhite','Face:eye'+i,.014,.0048*blink,.001,[.93,.93,.93,1]],['StoneEyeIris','Face:iris'+i,.0042,.0042*blink,.003,[1,1,1,1]]]){const e=eyeMesh(base,name,region,[c[0],c[1],c[2]+z],width,height,color,data.materials.length);add(e.mesh,e.material);}}
 // The supplied crown is separated into selectable JS sections without moving it.
 const hair=base.meshes.find(m=>m.name==='HairReference');
 for(const [key,part] of [['frontHair','Front'],['backHair','Back'],['sideHair','Side']])if(state[key]==='stoneRef'){
  const tri=[];for(const g of hair.groups)for(let t=0;t<g.indices.length;t+=3){const ids=g.indices.slice(t,t+3),c=ids.map(i=>hair.positions.slice(i*3,i*3+3).map(v=>v/1e5)).reduce((a,p)=>a.map((v,j)=>v+p[j]/3),[0,0,0]);const section=Math.abs(c[0])>.047?'Side':c[2]>.005?'Front':'Back';if(section===part)tri.push(...ids);}
  const length=1+clamp(state[key==='frontHair'?'frontLength':key==='backHair'?'backLength':'sideLength'])*.30,volume=1+clamp(state.hairVolume)*.15;const positions=hair.positions.map((v,i)=>i%3===1?Math.round((v/1e5<1.66?1.66+(v/1e5-1.66)*length:v/1e5)*1e5):Math.round((i%3===0?v*volume:(l.head[2]*1e5+(v-l.head[2]*1e5)*volume))));
  data.meshes.push({...hair,positions,name:'Hair'+part,groups:[{material:2,indices:tri}]});
 }
 const cloth=(name)=>({name,color:[1,1,1,1],double:true,blend:0,texture:null});
 if(state.clothes==='underwear')for(const mesh of createUnderwearData(base))add(mesh,cloth('Underwear_Bottoms_CLOTH'));
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
