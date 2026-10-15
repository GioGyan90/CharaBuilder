// Clip only material ownership. Every generated point stays on its original triangle.
// Run in source space once, before any skull deformation or skinning.
export function prepareStoneCHair(mesh){
 const original=mesh.groups[0],selectedVertices=new Set(mesh.stoneCHairIndices),skin=[],main=[],side=[];
 const sourceIndexCount=mesh.positions.length/3;
 for(let t=0;t<original.indices.length;t+=3){
  const ids=original.indices.slice(t,t+3);
  if(!selectedVertices.has(ids[0])){skin.push(...ids);continue;}
  const p=ids.map(id=>mesh.positions.slice(id*3,id*3+3).map(v=>v/1e5)),sign=p.reduce((s,v)=>s+v[0],0)<0?-1:1;
  const planes=[v=>sign*v[0]-.060,v=>sign*v[0]+.22*v[2]-.0677,v=>v[2]+.070,v=>1.593+.08*v[2]-v[1]];
  const point=w=>[0,1,2].map(k=>w.reduce((s,v,j)=>s+v*p[j][k],0)),cache=new Map();
  function vertex(w){
   const corner=w.findIndex(v=>v>1-1e-12);if(corner>=0)return ids[corner];
   const key=w.map(v=>v.toFixed(12)).join(',');if(cache.has(key))return cache.get(key);
   const index=mesh.positions.length/3;
   for(const [name,stride] of [['positions',3],['normals',3],['uv',2]])for(let k=0;k<stride;k++)mesh[name].push(w.reduce((s,v,j)=>s+v*mesh[name][ids[j]*stride+k],0));
   const length=Math.hypot(...mesh.normals.slice(-3))||1;for(let k=0;k<3;k++)mesh.normals[mesh.normals.length-3+k]*=32767/length;
   const weights=new Map();for(let j=0;j<3;j++)for(let k=0;k<4;k++){const bone=mesh.skinIndices[ids[j]*4+k];weights.set(bone,(weights.get(bone)||0)+w[j]*mesh.skinWeights[ids[j]*4+k]);}
   const influences=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),total=influences.reduce((s,v)=>s+v[1],0)||1;
   for(let k=0;k<4;k++){mesh.skinIndices.push(influences[k]?.[0]||0);mesh.skinWeights.push((influences[k]?.[1]||0)/total);}mesh.faceRegions.push(mesh.faceRegions[ids[0]]);
   cache.set(key,index);return index;
  }
  function emit(poly,dst){for(let j=1;j<poly.length-1;j++){const a=point(poly[0]),b=point(poly[j]),c=point(poly[j+1]),ab=b.map((v,k)=>v-a[k]),ac=c.map((v,k)=>v-a[k]);if(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])>1e-13)dst.push(vertex(poly[0]),vertex(poly[j]),vertex(poly[j+1]));}}
  let poly=[[1,0,0],[0,1,0],[0,0,1]];
  for(const plane of planes){
   const inside=[],outside=[];
   for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=plane(point(a)),db=plane(point(b)),A=da>=-1e-12,B=db>=-1e-12;(A?inside:outside).push(a);if(A!==B){const q=a.map((v,k)=>v+(b[k]-v)*da/(da-db));inside.push(q);outside.push(q);}}
   emit(outside,main);poly=inside;if(poly.length<3)break;
  }
  emit(poly,side);
 }
 mesh.groups=[{...original,indices:[...skin,...main,...side]}];
 mesh.stoneCSkinIndices=skin;mesh.stoneCHairMainIndices=main;mesh.stoneCSideHairIndices=side;mesh.stoneCHairIndices=[...main,...side];
 mesh.stoneCHairSourceVertexCount=sourceIndexCount;
 return mesh;
}
