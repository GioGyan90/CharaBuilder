/** Bind-space shoulder/neck refinement for the independent Hunyuan trial only.
 * One continuous field is applied to donor, collar and recipient, preserving seams.
 * The face and original source arrays stay untouched; no separate muscle shells.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const bell=(x,c,r)=>Math.exp(-(((x-c)/r)**2));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const mix=(a,b,t)=>a.map((v,k)=>v+(b[k]-v)*t);
const unit=n=>{const l=Math.hypot(...n)||1;return n.map(v=>v/l);};
const point=(part,id)=>part.positions.slice(id*3,id*3+3);
function blendWeights(part,a,b,t){
 const sums=new Map();for(const [id,w] of [[a,1-t],[b,t]])for(let k=0;k<4;k++){const j=part.skinIndices[id*4+k];sums.set(j,(sums.get(j)||0)+part.skinWeights[id*4+k]*w);}
 const top=[...sums].filter(([,w])=>w>1e-12).sort((a,b)=>b[1]-a[1]).slice(0,4),total=top.reduce((s,e)=>s+e[1],0);
 return {j:Array.from({length:4},(_,k)=>top[k]?.[0]||0),w:Array.from({length:4},(_,k)=>(top[k]?.[1]||0)/total)};
}
function neckField(p,{chin,neck},strength,{scmDefinition=.5,clavicleDefinition=.5}={}){
 const [x,y,z]=p,c=chin[1],ax=Math.abs(x-neck[0]);
 if(!strength||y<c-.245||y>c+.09||ax>.29)return [...p];
 // Protect all muzzle/chin surfaces, even below the old rig's horizontal chin.
 const jaw=smooth(c-.035,c-.005,y)*smooth(chin[2]-.052,chin[2]-.015,z);
 const neckBand=smooth(c-.105,c-.035,y)*(1-smooth(c+.010,c+.050,y));
 const side=smooth(.012,.055,ax)*(1-smooth(.102,.165,ax));
 const front=smooth(neck[2]+.018,neck[2]+.078,z);
 const back=1-smooth(neck[2]-.018,neck[2]+.045,z);
 const span=1-smooth(.14,.28,ax);
 // A broad neck pillar; volume is added behind the jaw, never to the cheeks.
 let dx=Math.sign(x-neck[0])*.011*neckBand*side*(1-jaw);
 let dz=.010*neckBand*front*(1-jaw)*span;
 // Continuous trapezius fan and raised clavicular root shorten the exposed stalk.
 const root=bell(y,c-.115,.051)*span;
 let dy=.018*root*front*(1-jaw);
 const fan=bell(y,c-.077,.055)*(1-smooth(.17,.28,ax))*back;
 dy+=.007*fan;
 dz-=.005*fan;
 // Preserve v97 at zero; the new default substitutes diagonal muscle planes
 // for the old front-only ridge. High values increase their relief gently.
 const feature=v=>({mix:Math.min(1,2*clamp(v)),gain:Math.min(1,2*clamp(v))+.5*Math.max(0,2*clamp(v)-1)});
 const scmControl=feature(scmDefinition),clavicleControl=feature(clavicleDefinition);
 const along=clamp((y-(c-.13))/.19),scmX=.022+.050*along;
 const oldScm=.0045*bell(ax,scmX,.020)*smooth(c-.17,c-.105,y)*(1-smooth(c+.025,c+.065,y))*front*(1-jaw);
 dz+=oldScm*(1-scmControl.mix);
 // Sternomastoid plane follows the front/side of the neck toward the mastoid.
 const u=clamp((y-(c-.125))/.205),mainX=.020+.060*u,mainZ=.122-.142*u;
 const distance=((ax-mainX)/.024)**2+((z-mainZ)/.042)**2;
 const ends=smooth(c-.155,c-.115,y)*(1-smooth(c+.020,c+.065,y));
 const plane=(1-smooth(.12,1.2,distance))*ends*(1-jaw);
 const direction=unit([Math.sign(x-neck[0])*(.15+.65*u),0,1-.55*u]);
 const sternum=.0085*plane*scmControl.gain;
 dx+=direction[0]*sternum;dz+=direction[2]*sternum;
 // The shallow clavicular foot merges into that plane by the middle neck.
 const footX=.057+.023*u,footZ=.108-.128*u;
 const footDistance=((ax-footX)/.023)**2+((z-footZ)/.040)**2;
 const foot=.0025*(1-smooth(.12,1.2,footDistance))*smooth(c-.145,c-.105,y)*(1-smooth(c-.060,c-.015,y))*(1-jaw)*scmControl.gain;
 dx+=direction[0]*foot;dz+=direction[2]*foot;
 // An S-shaped clavicle ridge separates the upper chest from the neck plane.
 const boneSpan=smooth(.016,.045,ax)*(1-smooth(.22,.29,ax))*front;
 const oldY=c-.125-.022*clamp(ax/.25),oldBone=.0045*bell(y,oldY,.017)*smooth(.014,.035,ax)*(1-smooth(.22,.29,ax))*front;
 const boneY=c-.130+.008*bell(ax,.085,.065)+.010*smooth(.15,.26,ax)-.004*bell(ax,.16,.045);
 const bone=bell(y,boneY,.012)*boneSpan;
 const upperHollow=.0025*bell(y,boneY+.025,.020)*smooth(.065,.10,ax)*(1-smooth(.19,.25,ax))*front;
 const lowerPlane=.0015*bell(y,boneY-.021,.021)*boneSpan;
 dz+=oldBone*(1-clavicleControl.mix)+(.0085*bone-upperHollow-lowerPlane)*clavicleControl.gain;
 dy+=.0015*bone*clavicleControl.gain;
 // A continuous central notch anchors both diagonal feet without paired lumps.
 const notch=(.003+.001*clavicleControl.gain)*bell(ax,0,.025)*bell(y,c-.112,.022)*front;
 dz-=notch;
 return [x+dx*strength,y+dy*strength,z+dz*strength];
}
function transformedNormal(p,n,field){
 const h=.00005,J=[];for(let k=0;k<3;k++){const a=[...p],b=[...p];a[k]+=h;b[k]-=h;const fa=field(a),fb=field(b);J.push(fa.map((v,i)=>(v-fb[i])/(2*h)));}
 const c=[cross(J[1],J[2]),cross(J[2],J[0]),cross(J[0],J[1])];
 return unit([0,1,2].map(k=>c[0][k]*n[0]+c[1][k]*n[1]+c[2][k]*n[2]));
}
/** Add two interior profile rows without changing either boundary connectivity. */
function profileBridge(bridge,center,strength){
 const originalCount=bridge.positions.length/3,originalIndices=bridge.indices.slice(),cache=new Map();
 bridge.colorParents=Array(originalCount).fill(null);
 function at(a,b,t){
  if(t<1e-9)return a;if(t>1-1e-9)return b;
  if(a>b){[a,b]=[b,a];t=1-t;}t=Math.round(t*3)/3;
  const key=`${a}:${b}:${Math.round(t*3)}`;if(cache.has(key))return cache.get(key);
  const pa=point(bridge,a),pb=point(bridge,b),p=mix(pa,pb,t),na=bridge.normals.slice(a*3,a*3+3),nb=bridge.normals.slice(b*3,b*3+3);
  const radial=unit([p[0]-center[0],0,p[2]-center[2]]),dy=pb[1]-pa[1],dr=(pb[0]-pa[0])*radial[0]+(pb[2]-pa[2])*radial[2];
  const slope=n=>clamp(-n[1]/Math.max(.35,n[0]*radial[0]+n[2]*radial[2]),-1.2,1.2);
  const h10=t*t*t-2*t*t+t,h11=t*t*t-t*t,correction=clamp((h10*(slope(na)*dy-dr)+h11*(slope(nb)*dy-dr))*strength,-.0025,.0025);
  p[0]+=radial[0]*correction;p[2]+=radial[2]*correction;
  const id=bridge.positions.length/3,w=blendWeights(bridge,a,b,t);
  bridge.positions.push(...p);bridge.normals.push(...unit(mix(na,nb,t)));bridge.uv.push(...mix(bridge.uv.slice(a*2,a*2+2),bridge.uv.slice(b*2,b*2+2),t));
  bridge.skinIndices.push(...w.j);bridge.skinWeights.push(...w.w);bridge.neckBodyBlend.push(bridge.neckBodyBlend[a]*(1-t)+bridge.neckBodyBlend[b]*t);bridge.colorParents.push([a,b,t]);cache.set(key,id);return id;
 }
 const result=[];
 // Original zipper triangles each have one same-row edge and one opposite-row vertex.
 for(let k=0;k<originalIndices.length;k+=3){
  const tri=originalIndices.slice(k,k+3);let a,b,c;
  for(let j=0;j<3;j++)if(bridge.neckBodyBlend[tri[j]]===bridge.neckBodyBlend[tri[(j+1)%3]]){a=tri[j];b=tri[(j+1)%3];c=tri[(j+2)%3];break;}
  if(a===undefined)throw Error('Neck profile expects original two-row zipper');
  let prevA=a,prevB=b;
  for(const t of [1/3,2/3]){const nextA=at(a,c,t),nextB=at(b,c,t);result.push(prevA,prevB,nextA,prevB,nextB,nextA);prevA=nextA;prevB=nextB;}
  result.push(prevA,prevB,c);
 }
 bridge.indices=result;bridge.profileRows=4;
}
function finishNeckSurface(parts,chin,strength,center){
 if(!strength)return {maxFairingDelta:0};
 const keys=new Map(),nodes=[],maps=[];
 for(const part of parts){const ids=[];for(let i=0;i<part.positions.length;i+=3){const p=part.positions.slice(i,i+3),key=p.map(v=>Math.round(v*1e7)).join(',');let id=keys.get(key);if(id===undefined){id=nodes.length;keys.set(key,id);const jaw=smooth(chin[1]-.035,chin[1]-.005,p[1])*smooth(chin[2]-.052,chin[2]-.015,p[2]);const mask=smooth(chin[1]-.11,chin[1]-.065,p[1])*(1-smooth(chin[1]+.01,chin[1]+.050,p[1]))*(1-smooth(.125,.18,Math.abs(p[0])))*(1-jaw);nodes.push({p,origin:[...p],mask:mask*strength,neighbors:new Set(),limit:.0035});}ids.push(id);}maps.push(ids);
  for(let t=0;t<part.indices.length;t+=3){const tri=part.indices.slice(t,t+3).map(i=>ids[i]);for(let k=0;k<3;k++){nodes[tri[k]].neighbors.add(tri[(k+1)%3]);nodes[tri[k]].neighbors.add(tri[(k+2)%3]);}}
 }
 // Bound movement by incident triangle altitude; dense/skinny zipper faces
 // cannot safely accept a global millimeter cap, even with shared positions.
 parts.forEach((part,j)=>{for(let t=0;t<part.indices.length;t+=3){const ids=part.indices.slice(t,t+3).map(id=>maps[j][id]),p=ids.map(id=>nodes[id].p),e1=p[1].map((v,k)=>v-p[0][k]),e2=p[2].map((v,k)=>v-p[0][k]),area=Math.hypot(...cross(e1,e2)),edge=Math.max(Math.hypot(...e1),Math.hypot(...e2),Math.hypot(...p[2].map((v,k)=>v-p[1][k]))),limit=.10*area/(edge||1);for(const id of ids)nodes[id].limit=Math.min(nodes[id].limit,limit);}});
 // Small, volume-preserving fairing across welded body/bridge/donor vertices.
 for(let pass=0;pass<4;pass++)for(const rate of [.36,-.34]){const next=nodes.map(node=>{if(node.mask<1e-5||!node.neighbors.size)return node.p;const average=[0,1,2].map(k=>[...node.neighbors].reduce((sum,id)=>sum+nodes[id].p[k],0)/node.neighbors.size),p=node.p.map((v,k)=>v+(average[k]-v)*rate*node.mask),d=p.map((v,k)=>v-node.origin[k]),l=Math.hypot(...d),limit=node.limit*node.mask;return l>limit?node.origin.map((v,k)=>v+d[k]*limit/l):p;});nodes.forEach((n,i)=>n.p=next[i]);}
 // Preserve the zipper's strict outward orientation during fairing. At very
 // narrow angular wedges an altitude-safe move can still tilt a radial normal.
 let fairingScale=1;const collar=parts[2],map=maps[2];
 const safe=scale=>{for(let t=0;t<collar.indices.length;t+=3){const p=collar.indices.slice(t,t+3).map(id=>{const n=nodes[map[id]];return mix(n.origin,n.p,scale);}),n=cross(p[1].map((v,k)=>v-p[0][k]),p[2].map((v,k)=>v-p[0][k])),c=[0,1,2].map(k=>(p[0][k]+p[1][k]+p[2][k])/3);if(n[0]*(c[0]-center[0])+n[2]*(c[2]-center[2])<=1e-15)return false;}return true;};
 for(let i=0;i<9&&!safe(fairingScale);i++)fairingScale*=.5;
 if(!safe(fairingScale))fairingScale=0;
 nodes.forEach(n=>n.p=mix(n.origin,n.p,fairingScale));
 let maximum=0;const sums=nodes.map(()=>[0,0,0]);
 parts.forEach((part,j)=>{for(let i=0;i<maps[j].length;i++){const node=nodes[maps[j][i]];part.positions.splice(i*3,3,...node.p);maximum=Math.max(maximum,Math.hypot(...node.p.map((v,k)=>v-node.origin[k])));}for(let t=0;t<part.indices.length;t+=3){const ids=part.indices.slice(t,t+3).map(id=>maps[j][id]),p=ids.map(id=>nodes[id].p),n=cross(p[1].map((v,k)=>v-p[0][k]),p[2].map((v,k)=>v-p[0][k]));for(const id of ids)for(let k=0;k<3;k++)sums[id][k]+=n[k];}});
 parts.forEach((part,j)=>{for(let i=0;i<maps[j].length;i++){const id=maps[j][i],w=nodes[id].mask;if(w>1e-5)part.normals.splice(i*3,3,...unit(mix(part.normals.slice(i*3,i*3+3),unit(sums[id]),w)));}});
 return {maxFairingDelta:maximum,fairingScale};
}
export function refineHunyuanNeck({head,bridge,body,landmarks,targets,settings={}}){
 const strength=clamp(settings.neckStructure??1),originalBody=body;
 body={...body,positions:body.positions.slice(),normals:body.normals.slice()};
 const field=p=>neckField(p,{chin:landmarks.chin,neck:targets.neck},strength,settings);
 let changedBody=0,maxBodyDelta=0,maxDonorDelta=0;
 for(const [kind,part] of [['body',body],['head',head],['bridge',bridge]]){
  for(let i=0;i<part.positions.length;i+=3){const p=part.positions.slice(i,i+3),q=field(p),d=Math.hypot(...q.map((v,k)=>v-p[k]));if(d>1e-10){const n=transformedNormal(p,part.normals.slice(i,i+3),field);part.positions.splice(i,3,...q);part.normals.splice(i,3,...n);if(kind==='body'){changedBody++;maxBodyDelta=Math.max(maxBodyDelta,d);}else if(kind==='head')maxDonorDelta=Math.max(maxDonorDelta,d);}}
 }
 if(strength>0)profileBridge(bridge,targets.neck,strength);
 const surface=finishNeckSurface([body,head,bridge],landmarks.chin,strength,targets.neck);
 // Paint only the low donor neck toward body skin, below protected face/jaw.
 head.neckBodyBlend=[];
 for(let i=0;i<head.positions.length;i+=3){const p=head.positions.slice(i,i+3),h=head.neckHeight[i/3]*(settings.bindYScale??1),jaw=smooth(landmarks.chin[1]-.035,landmarks.chin[1]-.005,p[1])*smooth(landmarks.chin[2]-.052,landmarks.chin[2]-.015,p[2]);head.neckBodyBlend.push(Math.max(1-smooth(0,.082,h),1-smooth(landmarks.chin[1]-.025,landmarks.chin[1]+.045,p[1]))*(1-jaw)*strength);}
 // Endpoints retain their exact body/head coordinates and normal attributes.
 for(let i=0;i<bridge.bodyVertexIds.length;i++){const id=bridge.bodyVertexIds[i];bridge.positions.splice(i*3,3,...point(body,id));bridge.normals.splice(i*3,3,...body.normals.slice(id*3,id*3+3));}
 const offset=bridge.bodyVertexIds.length;
 for(let i=0;i<bridge.headVertexIds.length;i++){const id=bridge.headVertexIds[i];bridge.positions.splice((offset+i)*3,3,...point(head,id));bridge.normals.splice((offset+i)*3,3,...head.normals.slice(id*3,id*3+3));}
 return {body,report:{method:'shared-continuous-neck-field-four-row-profile',...surface,strength,scmDefinition:clamp(settings.scmDefinition??.5),clavicleDefinition:clamp(settings.clavicleDefinition??.5),changedBodyVertices:changedBody,maxBodyDelta,maxDonorDelta,sourceBodyImmutable:body.positions!==originalBody.positions,bridgeProfileRows:bridge.profileRows??2}};
}
