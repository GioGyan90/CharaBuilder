// Remove the donor's raised eye relief before cutting sockets for separate eyeballs.
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function prepareAdultOrbits(donor){
 if(donor.reference?.baseFamily!=='adultMale'||donor.eyeReliefRemoved)return donor;
 const original=donor.meshes.find(m=>m.name==='Face'),mesh={...original,positions:[...original.positions]};
 const r=donor.landmarks.faceRig;let moved=0,maxRetraction=0;
 for(let id=0;id<mesh.positions.length/3;id++){
  const p=original.positions.slice(id*3,id*3+3).map(v=>v/1e5);let z=p[2];
  for(const eye of r.eyes){
   const dx=p[0]-eye[0],dy=p[1]-eye[1],side=Math.sign(eye[0]-r.headX)||1;
   const weight=(1-smooth(.022,.034,Math.abs(dx)))*smooth(-.032,-.020,dy)*(1-smooth(.018,.030,dy))*smooth(.008,.014,Math.abs(p[0]-r.headX))*smooth(eye[2]-.035,eye[2]-.015,p[2]);
   const orbitalPlane=eye[2]-.003-side*.35*dx+.22*dy;
   z+=(orbitalPlane-z)*weight;
  }
  if(Math.abs(p[2]-z)>1e-7){mesh.positions[id*3+2]=Math.round(z*1e5);moved++;maxRetraction=Math.max(maxRetraction,p[2]-z);}
 }
 return {...donor,meshes:donor.meshes.map(m=>m===original?mesh:m),eyeReliefRemoved:{movedVertices:moved,maxRetraction,pocketRadii:[.025,.014],rearDepth:.050}};
}
