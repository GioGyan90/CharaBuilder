function vertexWeights(rig,id){const out={};for(let a=0;a<4;a++){const joint=rig.indices[id*4+a];out[joint]=(out[joint]||0)+rig.weights[id*4+a]/65535;}return out;}
function blendWeights(a,b,t){const out={};for(const [id,w] of Object.entries(a))out[id]=(out[id]||0)+w*(1-t);for(const [id,w] of Object.entries(b))out[id]=(out[id]||0)+w*t;return out;}
// Clip a fitted garment out of the CC0 adult body surface, with a 4.5 mm allowance and interpolated original skin weights.
function clip(polygon,fn){
 const out=[];for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],fa=fn(a.p),fb=fn(b.p),inside=fa>=0;
  if(inside)out.push(a);
  if(inside!==(fb>=0)){
   const t=fa/(fa-fb);out.push({p:a.p.map((x,j)=>x+(b.p[j]-x)*t),n:a.n.map((x,j)=>x+(b.n[j]-x)*t),w:blendWeights(a.w,b.w,t)});
  }
 }return out;
}
export function createUnderwearData(base){
 const body=base.meshes.find(m=>m.name==='Body'),hip=base.landmarks.hips[1],neck=base.landmarks.neck[1],female=neck<1.40;
 const skin=body.groups.filter(g=>base.materials[g.material].name.includes('_SKIN'));
 function surface(name,conditions){
  const p=[],n=[],uv=[],indices=[],skinIndices=[],skinWeights=[];const rig=base.rig?.meshes.Body;const arms=new Set(['leftUpperArm','leftLowerArm','leftHand','rightUpperArm','rightLowerArm','rightHand'].map(k=>base.rig?.humanoid[k]));
  for(const group of skin)for(let i=0;i<group.indices.length;i+=3){
   // The chest-height slice crosses relaxed upper arms too; never turn those into the top.
   if(name==='UnderwearTop'&&rig){if(group.indices.slice(i,i+3).some(id=>{let influence=0;for(let a=0;a<4;a++)if(arms.has(rig.indices[id*4+a]))influence+=rig.weights[id*4+a]/65535;return influence>.4;}))continue;}
   let polygon=group.indices.slice(i,i+3).map(id=>({p:body.positions.slice(id*3,id*3+3).map(v=>v/100000),n:body.normals.slice(id*3,id*3+3).map(v=>v/32767),w:rig?vertexWeights(rig,id):{}}));
   for(const fn of conditions){polygon=clip(polygon,fn);if(polygon.length<3)break;}
   if(polygon.length<3)continue;
   const start=p.length/3;
   for(const v of polygon){const len=Math.hypot(...v.n)||1;const normal=v.n.map(x=>x/len);p.push(...v.p.map((x,j)=>Math.round((x+normal[j]*.0045)*100000)));n.push(...normal.map(x=>Math.round(x*32767)));uv.push(0,0);const weights=Object.entries(v.w).filter(([,w])=>w>0).sort((a,b)=>b[1]-a[1]).slice(0,4),total=weights.reduce((s,[,w])=>s+w,0)||1;for(let a=0;a<4;a++){skinIndices.push(Number(weights[a]?.[0]||0));skinWeights.push((weights[a]?.[1]||0)/total);}}
   for(let j=1;j<polygon.length-1;j++)indices.push(start,start+j,start+j+1);
  }
  return {name,positions:p,normals:n,uv,...(rig?{skinIndices,skinWeights}:{}),groups:[{material:0,indices}],expressions:{}};
 }
 const garments=[surface('UnderwearBottom',[
  p=>hip+.055-p[1],p=>p[1]-(female?hip-.14+Math.abs(p[0])*.45:hip-.17),p=>.18-Math.abs(p[0])
 ])];
 if(female){
  garments.push(surface('UnderwearTop',[
   p=>p[1]-(neck-.265),p=>neck-.145-p[1],p=>.16-Math.abs(p[0])
  ]));
 }
 return garments;
}
