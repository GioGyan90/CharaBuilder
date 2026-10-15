// Stone adult back: broad anatomical planes on the continuous skin surface.
// Every field uses bind/source coordinates; duplicate UV vertices deform equally.
export const adultBackDefaults={lowerTrapezius:50,scapulaSpine:50,scapulaAngle:50,rearAxillary:50,latTaper:50,erectorSpinae:50};
export const adultBackKeys=Object.keys(adultBackDefaults);
export const adultBackRanges={
 lowerTrapezius:['中下斜方肌体块','浅','厚'],
 scapulaSpine:['肩胛冈转折','柔和','明显'],
 scapulaAngle:['肩胛下角','柔和','明显'],
 rearAxillary:['后腋窝连接','薄','厚'],
 latTaper:['背阔肌下缘收束','柔和','明显'],
 erectorSpinae:['腰背竖脊肌','浅','厚']
};
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const bell=(v,c,r)=>Math.exp(-(((v-c)/r)**2));
const plate=(v,c,r)=>1-smooth(.60,1.20,Math.abs(v-c)/r);
export function createAdultBackSculpt(state,l){
 if(state.characterType!=='man'||state.foundationRevision<1||state.bodySource!=='stone')return (x,y,z)=>[x,y,z];
 const neck=l.neck[1],hip=l.hips[1],h=neck-hip;
 const strength=Object.fromEntries(adultBackKeys.map(k=>[k,Math.max(0,Math.min(2.25,1+((Number.isFinite(state[k])?state[k]:50)-50)/50))]));
 return (x,y,z,source)=>{
  const [sx,sy,sz]=source,ax=Math.abs(sx),sign=Math.sign(sx)||1;
  const rear=(1-smooth(-.045,-.008,sz))*(1-smooth(neck-.09,neck-.06,sy))*smooth(hip+.02,hip+.065,sy)*(1-smooth(.17,.215,ax));
  if(!rear)return [x,y,z];
  const height=(neck-sy)/h;
  // Mid/lower trapezius diamond descends from the medial shoulder into mid-back.
  const diamond=1-smooth(.70,1.18,Math.abs(height-.36)/.30+ax/.105);
  const spinalGap=.70+.30*smooth(.004,.025,ax);
  z-=.011*strength.lowerTrapezius*diamond*spinalGap*rear;
  // Scapular spine runs obliquely towards the rear shoulder, above a broad blade.
  const spineY=neck-h*.265+(ax-.045)*.38;
  const spine=plate(ax,.086,.059)*bell(sy,spineY,.023);
  z-=.0075*strength.scapulaSpine*spine*rear;
  const blade=plate(ax,.082,.037)*bell(height,.40,.135);
  const tip=bell(ax,.074,.026)*bell(height,.505,.070);
  const medialEdge=bell(ax,.041,.013)*bell(height,.40,.115);
  z-=strength.scapulaAngle*(.005*blade+.006*tip-.0015*medialEdge)*rear;
  // Rear axillary fold links the blade, posterior deltoid and upper lat.
  const foldY=neck-h*.42+(ax-.11)*.45;
  const axilla=bell(ax,.140,.037)*bell(sy,foldY,.040);
  z-=.010*strength.rearAxillary*axilla*rear;
  // Lat wedge narrows towards the waist rather than becoming a round back lump.
  const latCenter=.065+.060*smooth(hip+.065,neck-h*.43,sy);
  const wedge=plate(ax,latCenter,.031)*bell(height,.60,.19);
  z-=.010*strength.latTaper*wedge*rear;
  x+=sign*.0045*strength.latTaper*wedge*rear;
  // Paired erectors with a shallow central channel; blend out at the waistband.
  const erectors=bell(ax,.027,.016)*bell(height,.72,.19);
  const channel=bell(ax,0,.011)*bell(height,.60,.30);
  z-=strength.erectorSpinae*(.006*erectors-.0025*channel)*rear;
  return [x,y,z];
 };
}
