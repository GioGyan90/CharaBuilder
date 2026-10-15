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
 return {...asset,eyePatch:patch,meshes:asset.meshes.map(m=>m===original?mesh:m)};
}
const unit=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function composeStoneCEyes(asset,state){
 const materials=[...asset.materials],maps=[...asset.maps],meshes=[...asset.meshes];
 const headBone=asset.meshes.find(m=>m.name==='Face').skinIndices[0];
 const value=k=>Math.max(-1,Math.min(1,((state[k]??50)-50)/50));
 const material=(name,color)=>{const id=materials.length;materials.push({name,color:[...color,1],double:true,blend:0,texture:null});maps.push(null);return id;};
 const white=material('StoneCEyeWhite',[.93,.925,.90]),iris=material('StoneCEyeIris',[1,1,1]),pupil=material('StoneCEyePupil',[.009,.007,.006]),socket=material('StoneCEyeSocket_SKIN',[1,1,1]);
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
  // Temporary untextured socket lining joins the exact cut rim to the globe.
  // This is a stationary support cuff, not an articulated eyelid or a blink.
  const cuff=builder('StoneCEyeSocket'+label,socket),N=spec.rim.length;
  for(let j=0;j<=2;j++)for(const p of spec.rim){const t=j/2,x=p[0]+(c[0]-p[0])*.025*t,y=p[1]+(c[1]-p[1])*.025*t,z=c[2]+Math.sqrt(Math.max(1e-10,r*r-(x-c[0])**2-(y-c[1])**2))-.0001;const q=[x,y,p[2]+(z-p[2])*t];cuff.vertex(q,[x-c[0],y-c[1],z-c[2]]);}
  for(let j=0;j<2;j++)for(let i=0;i<N;i++){const a=j*N+i,b=j*N+(i+1)%N;const flip=spec.side>0;for(const tri of [[a,b,a+N],[b,b+N,a+N]])cuff.face(...(flip?tri.reverse():tri));}cuff.done();
 }
 return {...asset,materials,maps,meshes};
}
