// Simplified superficial anatomy: SCM two-headed band, clavicle, fossae and nape.
// Anatomical attachment references and modelling choices: NECK_ANATOMY_STUDY.md.
export const adultNeckDefaults={scmSternal:50,scmClavicular:50,clavicleContour:50,supraclavicularFossa:50,napeTransition:50,throatVolume:50};
export const adultNeckKeys=Object.keys(adultNeckDefaults);
export const adultNeckRanges={
 scmSternal:['胸锁乳突肌胸骨头','柔和','明显'],scmClavicular:['胸锁乳突肌锁骨头','柔和','明显'],
 clavicleContour:['锁骨骨脊','柔和','明显'],supraclavicularFossa:['锁骨上窝与胸骨上窝','浅','深'],
 napeTransition:['后颈扇形连接','柔和','厚'],throatVolume:['前颈喉部体块','平','明显']
};
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const bell=(v,c,r)=>Math.exp(-(((v-c)/r)**2));
const clamp=(a,b,v)=>Math.max(a,Math.min(b,v));
export function createAdultNeckSculpt(state,l){
 if(state.characterType!=='man'||state.foundationRevision<1||state.bodySource!=='stone')return (x,y,z)=>[x,y,z];
 const neck=l.neck[1],zc=l.neck[2],chin=l.faceRig?.chin??neck+.043;
 const gain=k=>clamp(0,2.0,1+((Number.isFinite(state[k])?state[k]:50)-50)/50);
 const strength=Object.fromEntries(adultNeckKeys.map(k=>[k,gain(k)])),scm=gain('neckTendon');
 return (x,y,z,source)=>{
  const [sx,sy,sz]=source,ax=Math.abs(sx),sign=Math.sign(sx)||1;
  const area=smooth(neck-.165,neck-.125,sy)*(1-smooth(neck+.072,neck+.108,sy))*(1-smooth(.19,.225,ax));
  if(!area)return [x,y,z];
  const angle=Math.atan2(ax,sz-zc),front=smooth(zc+.015,zc+.055,sz),back=1-smooth(zc-.015,zc+.012,sz);
  // Fore-jaw and ear silhouettes remain protected while the band reaches mastoid height.
  const jawMask=1-smooth(chin-.012,chin+.012,sy)*smooth(.044,.075,sz)*(1-smooth(.030,.060,ax));
  const earMask=1-smooth(.061,.083,ax)*smooth(neck+.045,neck+.09,sy);
  const bottom=neck-.095,top=neck+.085,t=clamp(0,1,(sy-bottom)/(top-bottom));
  const band=smooth(bottom-.018,bottom+.018,sy)*(1-smooth(top-.018,top+.012,sy))*jawMask*earMask;
  const sternalAngle=.16+1.43*t**.85,clavicularAngle=.64+.95*t;
  const sternal=bell(angle,sternalAngle,.270)*band;
  const clavicular=bell(angle,clavicularAngle,.340)*band*(1-smooth(.55,.82,t));
  // Push along the neck cross-section, so the belly wraps to the side at its top.
  const nx=sx/(.058**2),nz=(sz-zc)/(.061**2),len=Math.hypot(nx,nz)||1;
  const relief=scm*(.0036*strength.scmSternal*sternal+.0024*strength.scmClavicular*clavicular)*area;
  x+=relief*nx/len;z+=relief*nz/len;
  // Broad, shallow S ridge; the medial end blends into the existing sternum volume.
  const u=clamp(0,1,ax/.195),clavY=neck-.085+.033*u+.006*Math.sin(Math.PI*u*1.6);
  const clavicle=bell(sy,clavY,.015)*smooth(.018,.042,ax)*(1-smooth(.174,.210,ax))*front*area;
  z+=.0042*strength.clavicleContour*clavicle;
  y+=.0004*strength.clavicleContour*clavicle;
  const underClavicle=bell(sy,clavY-.020,.014)*smooth(.022,.055,ax)*(1-smooth(.155,.20,ax))*front*area;
  z-=.0010*strength.clavicleContour*underClavicle;
  // Concavities are broad and shallow: they separate attachments without cut seams.
  const fossa=bell(ax,.092,.043)*bell(sy,neck-.032,.030)*(1-smooth(1.25,1.80,angle));
  const notch=bell(ax,0,.012)*bell(sy,neck-.078,.016)*front;
  const depression=(.0030*fossa+.0035*notch)*strength.supraclavicularFossa*area;
  x-=depression*nx/len;z-=depression*nz/len;
  // Laryngeal/strap region is one restrained wedge between the SCM bands.
  const throat=bell(ax,0,.016)*bell(sy,neck+.010,.036)*front*jawMask*area;
  z+=.0035*strength.throatVolume*throat;
  // Nape paired planes flow down and out towards the upper trapezius and scapula.
  const nape=bell(ax,.027,.024)*bell(sy,neck+.019,.068)*back;
  const fan=bell(ax,.065,.045)*bell(sy,neck-.035,.060)*back;
  const channel=bell(ax,0,.010)*bell(sy,neck+.010,.055)*back;
  z-=strength.napeTransition*(.0050*nape+.0035*fan-.0012*channel)*area;
  x+=sign*.0018*strength.napeTransition*fan*area;
  return [x,y,z];
 };
}

// Regularize the inherited collar fan as one welded surface before anatomy relief.
// Shared collar Y stays fixed so head-only facial edits remain zero at the seam.
export function relaxNeckSurface(data){
 const neck=data.landmarks.neck[1],zc=data.landmarks.neck[2],chin=data.landmarks.faceRig.chin;
 const nodes=[],lookup=new Map();
 const node=(mesh,id)=>{const q=mesh.positions.slice(id*3,id*3+3),key=q.join(',');let j=lookup.get(key);if(j===undefined){j=nodes.length;lookup.set(key,j);nodes.push({p:q.map(v=>v/1e5),refs:[],near:new Set()});}if(!nodes[j].refs.some(r=>r[0]===mesh&&r[1]===id))nodes[j].refs.push([mesh,id]);return j;};
 for(const mesh of data.meshes.filter(m=>['Body','Face'].includes(m.name)))for(const g of mesh.groups.filter(g=>data.materials[g.material].name.includes('_SKIN')))for(let i=0;i<g.indices.length;i+=3){const t=g.indices.slice(i,i+3).map(id=>node(mesh,id));for(let k=0;k<3;k++){if(t[k]!==t[(k+1)%3]){nodes[t[k]].near.add(t[(k+1)%3]);nodes[t[(k+1)%3]].near.add(t[k]);}}}
 const weights=nodes.map(({p:[x,y,z]})=>{
  const ax=Math.abs(x),jaw=1-smooth(chin-.014,chin+.008,y)*smooth(.044,.073,z)*(1-smooth(.028,.065,ax));
  const ear=1-smooth(.062,.080,ax)*smooth(neck+.025,neck+.055,y);
  return smooth(neck-.145,neck-.085,y)*(1-smooth(neck+.050,neck+.086,y))*(1-smooth(.095,.155,ax))*jaw*ear;
 });
 const shared=nodes.map(n=>n.refs.some(([m])=>m.name==='Body')&&n.refs.some(([m])=>m.name==='Face'));
 let p=nodes.map(n=>[...n.p]);
 for(let pass=0;pass<10;pass++){
  const factor=pass%2===0?.45:-.35,old=p;p=old.map((q,i)=>{if(!weights[i]||!nodes[i].near.size)return q;const near=[...nodes[i].near],mean=[0,1,2].map(k=>near.reduce((s,j)=>s+old[j][k],0)/near.length);return q.map((v,k)=>k===1&&shared[i]?nodes[i].p[1]:v+factor*weights[i]*(mean[k]-v));});
 }
 for(let i=0;i<nodes.length;i++)if(weights[i])for(const [mesh,id] of nodes[i].refs)mesh.positions.splice(id*3,3,...p[i].map(v=>Math.round(v*1e5)));
 data.neckSurfaceRegularized=true;
 return data;
}
