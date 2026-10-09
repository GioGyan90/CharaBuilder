// Clip a fitted garment out of the CC0 adult body surface, with a 2 mm allowance.
function clip(polygon,fn){
 const out=[];for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],fa=fn(a.p),fb=fn(b.p),inside=fa>=0;
  if(inside)out.push(a);
  if(inside!==(fb>=0)){
   const t=fa/(fa-fb);out.push({p:a.p.map((x,j)=>x+(b.p[j]-x)*t),n:a.n.map((x,j)=>x+(b.n[j]-x)*t)});
  }
 }return out;
}
export function createUnderwearData(base){
 const body=base.meshes.find(m=>m.name==='Body'),hip=base.landmarks.hips[1],neck=base.landmarks.neck[1],female=neck<1.40;
 const skin=body.groups.filter(g=>base.materials[g.material].name.includes('_SKIN'));
 function surface(name,conditions){
  const p=[],n=[],uv=[],indices=[];
  for(const group of skin)for(let i=0;i<group.indices.length;i+=3){
   let polygon=group.indices.slice(i,i+3).map(id=>({p:body.positions.slice(id*3,id*3+3).map(v=>v/100000),n:body.normals.slice(id*3,id*3+3).map(v=>v/32767)}));
   for(const fn of conditions){polygon=clip(polygon,fn);if(polygon.length<3)break;}
   if(polygon.length<3)continue;
   const start=p.length/3;
   for(const v of polygon){const len=Math.hypot(...v.n)||1;const normal=v.n.map(x=>x/len);p.push(...v.p.map((x,j)=>Math.round((x+normal[j]*.002)*100000)));n.push(...normal.map(x=>Math.round(x*32767)));uv.push(0,0);}
   for(let j=1;j<polygon.length-1;j++)indices.push(start,start+j,start+j+1);
  }
  return {name,positions:p,normals:n,uv,groups:[{material:0,indices}],expressions:{}};
 }
 const garments=[surface('UnderwearBottom',[
  p=>hip+.055-p[1],p=>p[1]-(female?hip-.14+Math.abs(p[0])*.45:hip-.17),p=>.18-Math.abs(p[0])
 ])];
 if(female){
  garments.push(surface('UnderwearTop',[
   p=>p[1]-(neck-.265),p=>neck-.060-p[1],p=>.13-Math.abs(p[0]),
   p=>neck-.140-p[1]+Math.max(0,1-Math.abs(Math.abs(p[0])-.078)/.019)*.090
  ]));
 }
 return garments;
}
