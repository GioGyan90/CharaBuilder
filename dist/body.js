import {muscleGuide} from './muscle-guide.js?v=32';
// Regional edits stay on the existing CC0 body topology and its bone landmarks.
export const bodyDefaults={muscleMass:50,trapezius:50,latWidth:50,deltoid:50,torsoLength:50,shoulderSlope:50,shoulderDepth:50,chestDepth:50,bustSize:50,bustHeight:50,backDepth:50,waistHeight:50,abdomen:50,hipDepth:50,hipHeight:50,armLength:50,upperArm:50,forearm:50,handSize:50,thigh:50,calf:50,ankle:50,footLength:50,footWidth:50,legSpace:50};
export const bodyRanges={muscleMass:['肌肉量','少','多'],trapezius:['斜方肌体积','平','厚'],latWidth:['背阔肌宽度','窄','宽'],deltoid:['肩部肌肉','小','大'],torsoLength:['躯干长度','短','长'],shoulderSlope:['肩部倾斜','平肩','溜肩'],shoulderDepth:['肩部厚度','薄','厚'],chestDepth:['胸廓厚度','薄','厚'],bustSize:['胸部丰满度','平','丰满'],bustHeight:['胸部位置','低','高'],backDepth:['背部厚度','薄','厚'],waistHeight:['腰线位置','低','高'],abdomen:['腹部丰满度','平','丰满'],hipDepth:['臀部厚度','薄','厚'],hipHeight:['臀部位置','低','高'],armLength:['手臂长度','短','长'],upperArm:['上臂粗细','细','粗'],forearm:['前臂粗细','细','粗'],handSize:['手掌大小','小','大'],thigh:['大腿粗细','细','粗'],calf:['小腿粗细','细','粗'],ankle:['脚踝粗细','细','粗'],footLength:['脚掌长度','短','长'],footWidth:['脚掌宽度','窄','宽'],legSpace:['双腿间距','近','远']};
export const bodyAdjustmentKeys=['height','weight','shoulders','legs','headSize','neckWidth','chest','waist','hips','legThickness',...Object.keys(bodyDefaults)];
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const bell=(v,c,r)=>Math.exp(-(((v-c)/r)**2));
const norm=v=>Math.max(-2,Math.min(2,((Number.isFinite(v)?v:50)-50)/50));
export function authoredMuscleRatio(t,angle){
 const g=muscleGuide,u=Math.max(0,Math.min(g.rows.length-1,(t-g.low)/(g.high-g.low)*(g.rows.length-1)));
 const row=Math.min(g.rows.length-2,Math.floor(u)),f=u-row;
 const a=((angle+Math.PI)/(2*Math.PI)*g.sectors%g.sectors+g.sectors)%g.sectors,j=Math.floor(a),k=(j+1)%g.sectors,w=a-j;
 return (g.rows[row][j]*(1-w)+g.rows[row][k]*w)*(1-f)+(g.rows[row+1][j]*(1-w)+g.rows[row+1][k]*w)*f;
}
export function bodyAnchors(base){
 const l=base.landmarks,hip=l.hips[1],neck=l.neck[1],rig=base.rig;
 const bone=(name,fallback)=>rig?.bones[rig.humanoid[name]]?.position||fallback;
 return {shoulder:bone('leftUpperArm',[.12,neck-.04,0]),elbow:bone('leftLowerArm',[.22,neck-.24,0]),wrist:bone('leftHand',[.32,hip-.02,.02]),knee:bone('leftLowerLeg',[.06,hip*.58,0]),foot:bone('leftFoot',[.05,.13,-.025])};
}
export function createBodyDeformer(state,l){
 const hip=l.hips[1],neck=l.neck[1],a=l.bodyRig||bodyAnchors({landmarks:l});
 const value=Object.fromEntries(Object.keys(bodyDefaults).map(k=>[k,norm(state[k])]));
 if(Object.values(value).every(v=>v===0))return (x,y,z)=>[x,y,z];
 const waistY=hip+.12+value.waistHeight*.020,hipY=hip-.025+value.hipHeight*.018,bustY=neck-.19+value.bustHeight*.018;
 return (x,y,z,source)=>{
  const [sx,sy,sz]=source,sign=Math.sign(sx)||1,ax=Math.abs(sx);
  const axial=1-smooth(.12,.22,ax),belowHead=1-smooth(neck-.09,neck-.02,sy),front=smooth(-.015,.04,sz),back=1-smooth(-.03,.015,sz);
  const shoulder=bell(sy,neck-.075,.065)*smooth(.045,.15,ax)*belowHead;
  y-=value.shoulderSlope*.024*shoulder;z*=1+value.shoulderDepth*.15*shoulder;
  // Local muscle envelopes follow the author's A-pose landmarks. They do not
  // add abdominal fat or move the skull. Skin and garments share this mapping.
  const upperTorso=bell(sy,neck-.23,.13)*axial*belowHead;
  const lat=bell(sy,neck-.27,.105)*smooth(.045,.10,ax)*axial*belowHead;
  const trap=bell(sy,neck-.082,.045)*bell(ax,.055,.065)*belowHead;
  const shoulderMuscle=bell(sy,a.shoulder[1]-.025,.065)*bell(ax,a.shoulder[0]+.014,.052)*belowHead;
  const t=(sy-hip)/(neck-hip),sculpt=(authoredMuscleRatio(t,Math.atan2(sz-l.hips[2],sx))-1)*value.muscleMass*.85*axial*belowHead*smooth(.01,.10,t);
  x*=1+sculpt+value.latWidth*.16*lat;
  z=l.hips[2]+(z-l.hips[2])*(1+sculpt);
  z-=value.latWidth*.014*lat*back+value.trapezius*.018*trap*back;
  y+=value.trapezius*.016*trap;
  x+=sign*value.deltoid*.010*shoulderMuscle;
  z*=1+value.deltoid*.22*shoulderMuscle;
  const chest=bell(sy,neck-.22,.10)*axial*belowHead;
  z*=1+value.chestDepth*.17*chest;
  z+=value.bustSize*.022*bell(sy,bustY,.065)*axial*front*belowHead;
  y+=value.bustHeight*.012*bell(sy,neck-.19,.065)*axial*front*belowHead;
  z-=value.backDepth*.016*bell(sy,neck-.24,.14)*axial*back*belowHead;
  // Move the waist's continuous envelope rather than a hard band of vertices.
  const originalWaist=bell(sy,hip+.12,.10),movedWaist=bell(sy,waistY,.10);
  const waistShift=(originalWaist-movedWaist)*.12*axial;
  x*=1+waistShift;z*=1+waistShift;
  z+=value.abdomen*.022*bell(sy,hip+.105,.10)*axial*front;
  z-=value.hipDepth*.024*bell(sy,hipY,.105)*axial*back;
  y+=value.hipHeight*.014*bell(sy,hip-.025,.10)*axial;
  const legBlend=(1-smooth(hip-.12,hip+.025,sy))*(1-smooth(.15,.24,ax)),legX=a.knee[0];
  const thigh=bell(sy,(hip+a.knee[1])*.5,.16)*legBlend,calf=bell(sy,(a.knee[1]+a.foot[1])*.5,.14)*legBlend,ankle=bell(sy,a.foot[1]+.025,.055)*legBlend;
  const legScale=((value.thigh*.18+value.muscleMass*.07)*thigh+(value.calf*.20+value.muscleMass*.06)*calf+value.ankle*.15*ankle)*smooth(.006,.025,ax);
  x+=(sx-sign*legX)*legScale;z*=1+legScale;
  const feet=(1-smooth(a.foot[1]-.025,a.foot[1]+.05,sy))*legBlend;
  x+=(sx-sign*a.foot[0])*value.footWidth*.15*feet;
  z+=(sz-a.foot[2])*value.footLength*.18*feet;
  x+=sign*value.legSpace*.012*legBlend*smooth(.014,.04,ax);
  // Project onto the author's A-pose arm, so width changes are radial to the arm.
  const s=a.shoulder,w=a.wrist,v=w.map((q,i)=>q-s[i]),length2=v.reduce((sum,q)=>sum+q*q,0);
  const p=[ax,sy,sz],u=p.reduce((sum,q,i)=>sum+(q-s[i])*v[i],0)/length2;
  const axis=s.map((q,i)=>q+Math.max(0,Math.min(1,u))*v[i]);
  const line=s.map((q,i)=>q+u*v[i]),distance=Math.hypot(...p.map((q,i)=>q-line[i]));
  const armBlend=smooth(s[0]-.025,s[0]+.065,ax)*smooth(-.1,.15,u)*(1-smooth(.08,.16,distance));
  const upper=1-smooth(.40,.65,u),lower=smooth(.35,.65,u)*(1-smooth(.85,1.12,u));
  const radial=((value.upperArm*.20+value.muscleMass*.12)*upper+(value.forearm*.20+value.muscleMass*.08)*lower)*armBlend;
  x+=sign*(p[0]-axis[0])*radial;y+=(p[1]-axis[1])*radial;z+=(p[2]-axis[2])*radial;
  const extension=value.armLength*.10*Math.max(0,Math.min(1,u))*armBlend;
  x+=sign*v[0]*extension;y+=v[1]*extension;z+=v[2]*extension;
  const hand=smooth(.86,1.06,u)*armBlend*value.handSize*.18;
  x+=sign*(p[0]-w[0])*hand;y+=(p[1]-w[1])*hand;z+=(p[2]-w[2])*hand;
  // Lift the head and shoulder region together when changing torso length.
  y+=value.torsoLength*.045*Math.max(smooth(hip,neck-.10,sy),armBlend);
  return [x,y,z];
 };
}
export function bodyHandlePoints(base){
 const l=base.landmarks,a=bodyAnchors(base),hip=l.hips[1],neck=l.neck[1];
 const points=[['proportions',[0,l.head[1]+.13,.02]],['shoulderBody',a.shoulder],['chestBody',[0,neck-.22,.09]],['waistBody',[0,hip+.12,.085]],['pelvisBody',[.08,hip-.02,.085]],['armsBody',a.elbow],['legsBody',[a.knee[0],(a.knee[1]+a.foot[1])*.5,.035]],['feetBody',[a.foot[0],.045,.13]]];
 return points.map(([group,position])=>({group,side:1,position}));
}
