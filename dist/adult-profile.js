// Stone adult baseline: a wider mandibular body above a tapered, slightly forward upper neck.
// Every skin part uses the same source-coordinate field to preserve the shared collar.
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const bell=(v,c,r)=>Math.exp(-(((v-c)/r)**2));
export function createAdultProfileSculpt(state,l){
 if(state.characterType!=='man'||state.foundationRevision<1||state.bodySource!=='stone'||!l.faceRig)return (x,y,z)=>[x,y,z];
 const r=l.faceRig,neck=l.neck[1],zc=l.neck[2],chin=r.chin,cx=r.headX;
 return (x,y,z,source)=>{
  const [sx,sy,sz]=source,ax=Math.abs(sx-cx),sign=Math.sign(sx-cx)||1;
  const jawBand=smooth(chin-.006,chin+.023,sy)*(1-smooth(chin+.054,chin+.080,sy));
  const side=smooth(.014,.034,ax)*(1-smooth(.066,.085,ax));
  const lipGuard=1-bell(sy,r.mouth[1],.019)*(1-smooth(.024,.042,ax))*smooth(zc+.045,zc+.075,sz);
  const bone=jawBand*side*lipGuard*smooth(zc+.005,zc+.045,sz);
  x+=sign*.0040*bone;
  // Protect the anterior jaw and outer ear while narrowing the upper neck column.
  const jawGuard=1-smooth(chin-.012,chin+.010,sy)*smooth(zc+.045,zc+.075,sz);
  const earGuard=1-smooth(.061,.080,ax)*smooth(neck+.035,neck+.075,sy);
  const column=smooth(neck-.045,neck+.012,sy)*(1-smooth(chin+.012,chin+.055,sy))*(1-smooth(.075,.110,ax))*jawGuard*earGuard*(1-bone);
  x-=(sx-l.neck[0])*.075*column;
  z+=.0028*column;
  return [x,y,z];
 };
}
