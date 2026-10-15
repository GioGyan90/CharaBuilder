// Continuous posterior/lateral shoulder roof; no radial neck widening.
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const bell=(v,c,r)=>Math.exp(-(((v-c)/r)**2));
const norm=v=>Math.max(-3,Math.min(3,((Number.isFinite(v)?v:50)-50)/50));
export function createContinuousTrapezius(state,l){
 if(state.characterType!=='man'||state.foundationRevision<1||state.bodySource!=='stone')return (x,y,z)=>[x,y,z];
 const neck=l.neck[1],zc=l.neck[2],volume=Math.max(.10,Math.min(1.8,1+norm(state.trapezius)*.65)),ridge=Math.max(0,Math.min(2,1+norm(state.trapeziusRidge)));
 return (x,y,z,source)=>{
  const [sx,sy,sz]=source,ax=Math.abs(sx),rear=1-smooth(zc-.015,zc+.030,sz);
  const medial=smooth(.025,.055,ax)*(1-smooth(.18,.225,ax));
  const depth=1-smooth(zc+.015,zc+.065,sz);
  // Long upper blend keeps dY/dSourceY positive at the maximum supported gain.
  const vertical=smooth(neck-.165,neck-.095,sy)*(1-smooth(neck-.040,neck+.100,sy));
  // Keep the raised posterior shoulder roof from lifting the lateral neck into a collar.
  const neckColumn=smooth(neck-.100,neck-.005,sy)*smooth(zc-.050,zc+.005,sz)*(1-smooth(.10,.15,ax));
  const sheet=medial*depth*vertical*(1-.72*neckColumn);
  // Highest at the neck root, continuously falling toward the acromion.
  // The old bell centred outside the neck created a second peak and a V valley.
  const roof=1-smooth(.045,.190,ax),crest=bell(ax,.060,.050)*(1-smooth(.12,.19,ax));
  y+=(.024*volume*roof+.006*ridge*crest)*sheet;
  z-=(.0035*volume*roof+.0025*ridge*crest)*sheet*rear;
  return [x,y,z];
 };
}
