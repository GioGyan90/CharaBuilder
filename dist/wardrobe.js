// Retain the CC0 shirt/trouser topology; JS controls its cut and fit.
export const wardrobeDefaults={shirtLength:50,sleeveLength:50,shirtEase:50,pantsWidth:50};
export const wardrobeRanges={shirtLength:['衬衫衣长','短','长'],sleeveLength:['袖长','短袖','长袖'],shirtEase:['衬衫宽松度','合身','宽松'],pantsWidth:['裤腿宽度','修身','宽松']};
const clamp=(v,d=50)=>Number.isFinite(v)?Math.max(0,Math.min(100,v)):d;
export function clothingMesh(source,kind,state,sourceLandmarks,targetLandmarks,selectedGroups=source.groups) {
 const values={};for(const k of Object.keys(wardrobeDefaults))values[k]=clamp(state[k]);
 const p=[...source.positions],normals=[...source.normals];
 const srcHip=sourceLandmarks.hips[1],hip=targetLandmarks.hips[1],neck=targetLandmarks.neck[1];
 const feminine=state.gender==='female';
 const sleeveVertices=new Set();
 if(kind==='shirt'){
  const parent=new Map();
  const find=id=>{if(!parent.has(id))parent.set(id,id);let root=id;while(parent.get(root)!==root)root=parent.get(root);while(parent.get(id)!==id){const next=parent.get(id);parent.set(id,root);id=next;}return root;};
  for(const group of selectedGroups)for(let i=0;i<group.indices.length;i+=3){const [a,b,c]=group.indices.slice(i,i+3);parent.set(find(b),find(a));parent.set(find(c),find(a));}
  const components=new Map();for(const id of parent.keys()){const root=find(id);if(!components.has(root))components.set(root,[]);components.get(root).push(id);}
  for(const ids of components.values()){
   const xs=ids.map(id=>p[id*3]/100000),lo=Math.min(...xs),hi=Math.max(...xs);
   // Sleeve shells/cuffs are separate source islands; keep the torso out of sleeve stretching.
   if((lo>.06||hi<-.06)&&Math.max(Math.abs(lo),Math.abs(hi))>(feminine?.17:.20))for(const id of ids)sleeveVertices.add(id);
  }
 }
 // Pants originate in the male CC0 beta sample and are fitted to either body.
 for(let i=0;i<p.length;i+=3){
  let x=p[i]/100000,y=p[i+1]/100000,z=p[i+2]/100000;
  if(kind==='pants'){
   const ratio=hip/srcHip;y*=ratio;
   if(feminine){x*=.97;z*=1.13;}
   const below=Math.max(0,Math.min(1,(hip-y)/.13));
   const center=Math.sign(x)*(.055+.023*Math.max(0,Math.min(1,y/hip)));
   const width=1+(values.pantsWidth-50)*.003;
   x=center+(x-center)*(1+(width-1)*below);z*=1+(width-1)*below;
  }else{
   const hem=Math.max(0,Math.min(1,(neck-.20-y)/.25));
   y-=(values.shirtLength-50)*.0011*hem;
   const centerWeight=Math.exp(-Math.pow(x/.15,4));
   x*=1+values.shirtEase*.00085*centerWeight;
   z*=1+values.shirtEase*.0012*centerWeight;
   // Original short sleeves grow along the relaxed arm direction.
   const side=Math.sign(x),shoulder=.12,sy=neck-.065,dx=Math.abs(x)-shoulder;
   if(sleeveVertices.has(i/3) && dx>0 && y<sy+.025 && y>neck-.25){
    const ux=.4695,uy=-.8829;
    const axial=Math.max(0,dx*ux+(y-sy)*uy);
    const blend=Math.max(0,Math.min(1,dx/.035));
    const extension=Math.max(0,axial-.06)*(values.sleeveLength*(feminine?.043:.046))*blend;
    x+=side*ux*extension;y+=uy*extension;
    // A small allowance keeps the sleeve away from the arm surface.
    x+=side*(-uy)*.003*blend;y+=ux*.003*blend;
   }
  }
  p[i]=Math.round(x*100000);p[i+1]=Math.round(y*100000);p[i+2]=Math.round(z*100000);
 }
 return {...source,name:kind==='shirt'?'Shirt':'Pants',positions:p,normals,expressions:{}};
}

// Shirt front details are independent generated geometry, not painted into a texture.
export function shirtButtonPoints(source,landmarks){
 const used=new Set(source.groups.flatMap(g=>g.indices)),points=[];
 const neck=landmarks.neck[1],hip=landmarks.hips[1];
 for(let k=0;k<6;k++){
  const y=neck-.14-k*((neck-.14)-(hip+.065))/5;
  let z=-Infinity,best=Infinity;
  for(const id of used){
   const x=source.positions[id*3]/100000,py=source.positions[id*3+1]/100000,pz=source.positions[id*3+2]/100000;
   if(Math.abs(x)>.026||pz<0)continue;
   const score=Math.abs(py-y)+Math.abs(x)*.1;
   if(score<best){best=score;z=pz;}
  }
  if(Number.isFinite(z))points.push([0,y,z+.004]);
 }
 return points;
}
