/** Broad lower-face support for the Hunyuan adult. No Y change or source rewrite. */
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const bell=(x,c,r)=>Math.exp(-(((x-c)/r)**2));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
const strength=v=>v<=.5?clamp(v)*2:1+(clamp(v)-.5)*.5;
export function refineHunyuanFaceVolume(head,landmarks,settings={}){
 const lower=clamp(settings.lowerFaceVolume??.5),side=clamp(settings.sideFaceVolume??.5),a=strength(lower),b=strength(side);
 const eyes=landmarks.eyes,cx=(eyes[0][0]+eyes[1][0])*.5,eyeY=(eyes[0][1]+eyes[1][1])*.5,chin=landmarks.chin,mouth=landmarks.mouth,nose=landmarks.nose;
 const scale=(eyeY-chin[1])/.1406821261682243;
 const field=p=>{
  const x=p[0]-cx,y=p[1],z=p[2],ax=Math.abs(x),L=scale;
  if(!(a||b)||y<=chin[1]+.002*L||y>=eyeY-.025*L||ax>=.112*L)return [...p];
  // Keep the actual lip box and central nose fixed, with a soft transition outside.
  if(ax<.026*L&&y>nose[1]-.008*L)return [...p];
  const lip=(1-smooth(.032*L,.065*L,ax))*smooth(mouth[1]-.020*L,mouth[1]-.015*L,y)*(1-smooth(mouth[1]+.015*L,mouth[1]+.023*L,y))*smooth(mouth[2]-.045*L,mouth[2]-.014*L,z);
  const upper=1-smooth(eyeY-.055*L,eyeY-.025*L,y),width=smooth(.028*L,.050*L,ax)*(1-smooth(.082*L,.112*L,ax));
  const front=smooth(chin[2]-.080*L,chin[2]-.045*L,z)*(1-smooth(nose[2]-.032*L,nose[2]-.010*L,z));
  const lowerGate=smooth(chin[1]+.010*L,chin[1]+.030*L,y);
  const jaw=bell(y,mouth[1]-.010*L,.041*L)*bell(z,chin[2]-.025*L,.055*L)*front*lowerGate*upper;
  const sideGate=smooth(chin[1]+.010*L,chin[1]+.035*L,y)*smooth(chin[2]-.170*L,chin[2]-.090*L,z)*(1-smooth(chin[2]+.015*L,chin[2]+.040*L,z));
  const masseter=bell(y,mouth[1]+.020*L,.035*L)*bell(z,chin[2]-.055*L,.068*L)*sideGate*upper;
  const oral=bell(y,mouth[1]+.006*L,.032*L)*bell(z,chin[2]+.005*L,.050*L)*front*lowerGate*upper;
  const chinWing=bell(y,chin[1]+.015*L,.016*L)*smooth(chin[1]+.002*L,chin[1]+.012*L,y)*smooth(.014*L,.028*L,ax)*(1-smooth(.050*L,.065*L,ax))*smooth(chin[2]-.030*L,chin[2]-.012*L,z)*upper;
  const dx=Math.sign(x)*L*(width*(.0048*a*jaw+.0038*b*masseter)+.0022*a*chinWing)*(1-lip);
  const dz=L*width*(.0038*a*oral+.0020*b*masseter*front)*(1-lip);
  return [p[0]+dx,y,z+dz];
 };
 const normal=(p,n)=>{const h=.00004*scale,J=[];for(let k=0;k<3;k++){const a=[...p],b=[...p];a[k]+=h;b[k]-=h;const fa=field(a),fb=field(b);J.push(fa.map((v,i)=>(v-fb[i])/(2*h)));}const c=[cross(J[1],J[2]),cross(J[2],J[0]),cross(J[0],J[1])];return unit([0,1,2].map(k=>c[0][k]*n[0]+c[1][k]*n[1]+c[2][k]*n[2]));};
 let changedVertices=0,maxX=0,maxZ=0,maxDelta=0;
 for(let i=0;i<head.positions.length;i+=3){
  // Original cut vertices and their shared collar normals remain exact.
  if(Math.abs(head.neckHeight[i/3])<1e-7)continue;
  const p=head.positions.slice(i,i+3),q=field(p),dx=q[0]-p[0],dz=q[2]-p[2],d=Math.hypot(dx,dz);
  if(d<1e-12)continue;
  head.positions.splice(i,3,...q);head.normals.splice(i,3,...normal(p,head.normals.slice(i,i+3)));
  changedVertices++;maxX=Math.max(maxX,Math.abs(dx));maxZ=Math.max(maxZ,Math.abs(dz));maxDelta=Math.max(maxDelta,d);
 }
 return {method:'protected-jaw-body-mouth-side-masseter-support',lowerFaceVolume:lower,sideFaceVolume:side,changedVertices,maxX,maxZ,maxDelta,yDisplacement:0};
}
