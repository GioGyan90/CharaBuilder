import {prepareStoneCHair} from './stone-c-hair.js?v=108';
import {buildStoneCLids} from './stone-c-lids.js?v=108';
// C ocular upgrade: clip the old painted eye patch, then fit independent globes.
// The original packed asset is immutable; the patch interpolates all render/rig attributes.
export function prepareStoneCEyes(asset,patch){
 const original=asset.meshes.find(m=>m.name==='Face'),mesh={...original};
 for(const k of ['positions','normals','uv','skinIndices','skinWeights','faceRegions'])mesh[k]=[...original[k]];
 for(const entry of patch.addedVertices){
  const ids=entry.sourceVertexIds,w=entry.barycentric;
  for(const [key,stride] of [['positions',3],['normals',3],['uv',2]])for(let k=0;k<stride;k++)mesh[key].push(ids.reduce((s,id,i)=>s+original[key][id*stride+k]*w[i],0));
  const offset=mesh.normals.length-3,length=Math.hypot(...mesh.normals.slice(offset))||1;for(let k=0;k<3;k++)mesh.normals[offset+k]*=32767/length;
  const influences=new Map();for(let i=0;i<3;i++)for(let k=0;k<4;k++){const b=original.skinIndices[ids[i]*4+k],weight=original.skinWeights[ids[i]*4+k]*w[i];influences.set(b,(influences.get(b)||0)+weight);}
  const top=[...influences].sort((a,b)=>b[1]-a[1]).slice(0,4),total=top.reduce((s,v)=>s+v[1],0)||1;
  for(let k=0;k<4;k++){mesh.skinIndices.push(top[k]?.[0]||0);mesh.skinWeights.push((top[k]?.[1]||0)/total);}
  mesh.faceRegions.push(original.faceRegions[ids[0]]);
 }
 const removed=new Set(patch.removedTriangles),indices=original.groups[0].indices;
 mesh.stoneCHairIndices=asset.hairTriangles.flatMap(t=>indices.slice(t*3,t*3+3));
 const kept=[];for(let i=0;i<indices.length;i+=3)if(!removed.has(i/3))kept.push(...indices.slice(i,i+3));
 mesh.groups=[{...original.groups[0],indices:[...kept,...patch.replacementIndices]}];
 prepareStoneCHair(mesh);
 // Remove baked eye-white/liner remnants just outside the cut. This does not hide geometry.
 mesh.eyePaintCleanup=[];mesh.eyeRestPositions=mesh.positions;
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
 for(let i=0;i<mesh.positions.length;i+=3){const [x,y,z]=mesh.positions.slice(i,i+3).map(v=>v/1e5);let weight=0;
  if(Math.abs(x)>.015&&Math.abs(x)<.055&&y>1.526&&y<1.540&&z>.055){const spec=patch.sockets[x<0?0:1];let distance=Infinity;
   for(let j=0;j<spec.rim.length;j++){const a=spec.rim[j],b=spec.rim[(j+1)%spec.rim.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));distance=Math.min(distance,Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t));}
   const X=Math.abs(x),knots=[[.0178,1.5298],[.027,1.5294],[.036,1.5297],[.045,1.5321],[.0514,1.5351]];let lower=knots[0][1];
   for(let j=1;j<knots.length;j++){const a=knots[j-1],b=knots[j],t=Math.max(0,Math.min(1,(X-a[0])/(b[0]-a[0])));lower+=t*(b[1]-a[1]);}
   weight=(1-smooth(.0009,.0019,distance))*(1-smooth(lower-.00035,lower+.00005,y));
  }mesh.eyePaintCleanup.push(weight);
 }
 return {...asset,eyePatch:patch,meshes:asset.meshes.map(m=>m===original?mesh:m)};
}
const unit=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function composeStoneCEyes(asset,state){
 const materials=[...asset.materials],maps=[...asset.maps],meshes=[...asset.meshes];
 const headBone=asset.meshes.find(m=>m.name==='Face').skinIndices[0];
 const value=k=>Math.max(-1,Math.min(1,((state[k]??50)-50)/50));
 const material=(name,color)=>{const id=materials.length;materials.push({name,color:[...color,1],double:true,blend:0,texture:null});maps.push(null);return id;};
 const white=material('StoneCEyeWhite',[.93,.925,.90]),iris=material('StoneCEyeIris',[1,1,1]),pupil=material('StoneCEyePupil',[.009,.007,.006]);
 function builder(name,mat){
  const m={name,stoneCEye:true,positions:[],normals:[],uv:[],skinIndices:[],skinWeights:[],faceRegions:[],expressions:{},groups:[{material:mat,indices:[]}]};
  const vertex=(p,n=[0,0,1])=>{const i=m.positions.length/3;m.positions.push(...p.map(v=>v*1e5));m.normals.push(...unit(n).map(v=>v*32767));m.uv.push(0,0);m.skinIndices.push(headBone,0,0,0);m.skinWeights.push(1,0,0,0);m.faceRegions.push('Face:skin');return i;};
  const face=(a,b,c)=>m.groups[0].indices.push(a,b,c);
  return {m,vertex,face,done:()=>meshes.push(m)};
 }
 for(const spec of asset.eyePatch.sockets){
  const c=[...spec.center],r=spec.radius;c[2]+=value('eyeballDepth')*.00015;
  const label=spec.side<0?'L':'R',ball=builder('StoneCEye'+label,white),cols=40,rows=24;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const t=Math.PI*j/rows,p=2*Math.PI*i/cols,n=[Math.sin(t)*Math.cos(p),Math.cos(t),Math.sin(t)*Math.sin(p)];ball.vertex(c.map((v,k)=>v+r*n[k]),n);}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;if(j>0)ball.face(a,a+1,b);if(j<rows-1)ball.face(a+1,b+1,b);}ball.done();
  const direction=unit([value('gazeX')*.10,value('gazeY')*.08,1]),right=unit(cross([0,1,0],direction)),up=cross(direction,right);
  function cap(name,mat,radius,lift){
   const cap=builder(name+label,mat),slices=40,rings=4;
   cap.vertex(c.map((v,k)=>v+(r+lift)*direction[k]),direction);
   for(let j=1;j<=rings;j++)for(let i=0;i<slices;i++){
    const rho=radius*j/rings,a=i*2*Math.PI/slices,z=Math.sqrt(r*r-rho*rho),n=c.map((_,k)=>(right[k]*rho*Math.cos(a)+up[k]*rho*Math.sin(a)+direction[k]*z)/r);
    cap.vertex(c.map((v,k)=>v+(r+lift)*n[k]),n);
   }
   for(let i=0;i<slices;i++)cap.face(0,1+i,1+(i+1)%slices);
   for(let j=1;j<rings;j++)for(let i=0;i<slices;i++){const a=1+(j-1)*slices+i,b=1+(j-1)*slices+(i+1)%slices,d=a+slices,e=b+slices;cap.face(a,d,b);cap.face(b,d,e);}cap.done();
  }
  const irisRadius=.0044*(1+value('irisSize')*.30),pupilRadius=Math.min(irisRadius*.65,.00145*(1+value('pupilSize')*.50));
  cap('StoneCEyeIris',iris,irisRadius,.00008);cap('StoneCEyePupil',pupil,pupilRadius,.00016);
  meshes.push(...buildStoneCLids({...spec,center:c},asset.meshes.find(m=>m.name==='Face'),headBone,material));
 }
 return {...asset,materials,maps,meshes};
}
