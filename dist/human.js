import * as THREE from 'three';

// Mesh topology and sculpted shape deltas: MakeHuman CC0 assets (see THIRD_PARTY.md).
const directory = new URL('./assets/', import.meta.url);
let topology, shapes;
const bases = {};
async function unpack(name) {
  const response = await fetch(new URL(name + '.json.gz', directory));
  if (!response.ok) throw new Error(`人体资源加载失败 (${response.status}): ${name}`);
  const stream = new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
export async function loadHumanAssets() {
  const names = ['human-topology', 'human-shapes'];
  for (const gender of ['female','male']) for (const weight of ['minweight','averageweight','maxweight']) names.push(`${gender}-${weight}`);
  const loaded = await Promise.all(names.map(unpack));
  [topology, shapes] = loaded;
  names.slice(2).forEach((name,i) => { bases[name] = new Float32Array(loaded[i+2].positions.map(v => v / 1000)); });
}
const smooth = (a,b,x) => { const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t); };
function joint(p,name) {
  const ids=topology.joints['joint-'+name];const v=new THREE.Vector3();
  for(const id of ids)v.add(new THREE.Vector3().fromArray(p,id*3));
  return v.divideScalar(ids.length);
}
function applyTarget(p,name,strength) {
  const d=shapes[name];if(!d || !strength)return;
  for(let i=0;i<d.length;i+=4){const at=d[i]*3;p[at]+=d[i+1]*strength/1000;p[at+1]+=d[i+2]*strength/1000;p[at+2]+=d[i+3]*strength/1000;}
}
function bipolar(p,value,prefix,limit=.5) {
  const amount=(value-50)/50;applyTarget(p,prefix+(amount<0?'-decr':'-incr'),Math.abs(amount)*limit);
}
export function humanPositions(state) {
  if(!topology)throw new Error('Human assets not loaded');
  const average=bases[state.gender+'-averageweight'];
  const extreme=bases[state.gender+(state.weight<50?'-minweight':'-maxweight')];
  const amount=Math.abs(state.weight-50)/50*.72;
  const p=new Float32Array(average.length);
  for(let i=0;i<p.length;i++)p[i]=THREE.MathUtils.lerp(average[i],extreme[i],amount);
  bipolar(p,state.faceWidth,'head-scale-horiz',.4);bipolar(p,state.jaw,'chin-width',.6);
  bipolar(p,state.mouth,'mouth-scale-horiz',.55);
  for(const axis of ['depth','horiz','vert'])bipolar(p,state.nose,'nose-scale-'+axis,.4);
  for(const side of ['l','r']){
    bipolar(p,state.eyeSize,side+'-eye-scale',.35);
    applyTarget(p,side+'-eye-trans-'+(state.eyeSpace<50?'in':'out'),Math.abs(state.eyeSpace-50)/50*.45);
  }
  // Restrained, smooth proportion controls on a continuous mesh, including garment helpers.
  const knee=joint(p,'l-knee').y, pelvis=joint(p,'pelvis').y;
  const legChange=(state.legs-50)/50*.55;
  for(let i=0;i<p.length;i+=3){const y=p[i+1];p[i+1]+=legChange*smooth(knee-2,pelvis+1,y);}
  const neck=joint(p,'neck'), shoulder=joint(p,'l-shoulder');
  const shoulderChange=(state.shoulders-50)/50*.16;
  for(let i=0;i<p.length;i+=3){const x=p[i],y=p[i+1];const upper=smooth(pelvis+.5,shoulder.y-.8,y)*(1-smooth(shoulder.y+.1,neck.y+.5,y));p[i]+=Math.sign(x)*Math.min(Math.abs(x),shoulder.x)*shoulderChange*upper;}
  // Keep MakeHuman's neutral A-pose; do not invent joint rotations without a skinning rig.
  return p;
}
function mat(color,roughness=.85){return new THREE.MeshStandardMaterial({color,roughness});}
function geometry(p,indices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();return g;}
export function createHuman(state) {
  const p=humanPositions(state), group=new THREE.Group();
  const skin=mat(state.skin),shirt=mat(state.shirt),pants=mat(state.pants),shoe=mat('#2a2c32'),hair=mat(state.hairColor),white=mat('#ddd8cb'),iris=mat('#536054'),dark=mat('#27262a');
  const neck=joint(p,'neck'),shoulder=joint(p,'l-shoulder'),elbow=joint(p,'l-elbow'),pelvis=joint(p,'pelvis'),eyeL=joint(p,'l-eye'),eyeR=joint(p,'r-eye');
  const bodyIndices=topology.groups.body;
  const bodyIds=[...new Set(bodyIndices)];
  let floor=Infinity,top=-Infinity;
  for(const id of bodyIds){floor=Math.min(floor,p[id*3+1]);top=Math.max(top,p[id*3+1]);}
  const waist=pelvis.y+1.05, ankle=joint(p,'l-ankle').y+.04;
  function mesh(pos,indices,material){const m=new THREE.Mesh(geometry(pos,indices),material);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}

  // Clip garments at exact hems. Keep the continuous body beneath, including hands and feet.
  function garmentSurface(indices,material,field,inflate=.055){
    const g=geometry(p,indices),normal=g.attributes.normal.array,positions=[],normals=[];
    for(let i=0;i<indices.length;i+=3){
      let polygon=indices.slice(i,i+3).map(id=>({v:[p[id*3]+normal[id*3]*inflate,p[id*3+1]+normal[id*3+1]*inflate,p[id*3+2]+normal[id*3+2]*inflate],n:[normal[id*3],normal[id*3+1],normal[id*3+2]],d:field(p[id*3],p[id*3+1],p[id*3+2])}));
      const clipped=[];
      for(let j=0;j<polygon.length;j++){
        const a=polygon[j],b=polygon[(j+1)%polygon.length];
        if(a.d>=0)clipped.push(a);
        if((a.d>=0)!==(b.d>=0)){const t=a.d/(a.d-b.d);clipped.push({v:a.v.map((v,k)=>THREE.MathUtils.lerp(v,b.v[k],t)),n:a.n.map((v,k)=>THREE.MathUtils.lerp(v,b.n[k],t))});}
      }
      for(let j=1;j<clipped.length-1;j++)for(const v of [clipped[0],clipped[j],clipped[j+1]]){positions.push(...v.v);normals.push(...v.n);}
    }
    g.dispose();const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));out.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));out.normalizeNormals();const m=new THREE.Mesh(out,material);m.castShadow=true;m.receiveShadow=true;group.add(m);
  }
  const tights=topology.groups['helper-tights'];
  const shirtField=(x,y)=>Math.min(y-waist,neck.y-.13-y,state.clothes==='sport'?shoulder.x*.94-Math.abs(x):Math.max(shoulder.x+.15-Math.abs(x),Math.min(y-elbow.y-.7,shoulder.x+1-Math.abs(x))));
  const pantsField=(x,y)=>Math.min(waist+.045-y,y-ankle,shoulder.x+1-Math.abs(x));
  const shoeField=(x,y)=>Math.min(ankle+.025-y,shoulder.x+1-Math.abs(x));
  // Hide only skin safely inside clothing; retain a skin overlap beneath every hem.
  garmentSurface(bodyIndices,skin,(x,y)=>.14-Math.max(shirtField(x,y),pantsField(x,y),shoeField(x,y)),0);
  garmentSurface(tights,shirt,shirtField);
  garmentSurface(tights,pants,pantsField);
  garmentSurface(tights,shoe,shoeField,.075);
  if(state.clothes==='dress')garmentSurface(topology.groups['helper-skirt'],shirt,(x,y)=>Math.min(waist+.12-y,y-pelvis.y+3.45),.035);
  // Eye helper topology and eye-joint centers are supplied by MakeHuman and follow facial morphs.
  function ell(material,center,radius){const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),material);m.position.copy(center);m.scale.copy(radius);m.castShadow=true;group.add(m);return m;}
  for(const [side,center] of [['l',eyeL],['r',eyeR]]){
    mesh(p,topology.groups['helper-'+side+'-eye'],white);
    const ids=topology.groups['helper-'+side+'-eye'];let front=-Infinity;for(const id of ids)front=Math.max(front,p[id*3+2]);
    const s=1+(state.eyeSize-50)/50*.12;
    ell(iris,new THREE.Vector3(center.x,center.y,front-.01),new THREE.Vector3(.057*s,.060*s,.015));
    ell(dark,new THREE.Vector3(center.x,center.y,front+.005),new THREE.Vector3(.025*s,.030*s,.008));
    ell(white,new THREE.Vector3(center.x-.018,center.y+.021,front+.013),new THREE.Vector3(.009,.009,.006));
  }
  // Anatomical eyebrows use the actual face surface for depth instead of floating above a sphere.
  for(const center of [eyeL,eyeR]){
    const points=[];for(let i=0;i<7;i++){const x=center.x+(i-3)*.055,y=center.y+.20+.035*Math.sin(i/6*Math.PI);let z=-Infinity;for(const id of bodyIds){if(Math.abs(p[id*3]-x)<.1&&Math.abs(p[id*3+1]-y)<.09)z=Math.max(z,p[id*3+2]);}if(Number.isFinite(z))points.push(new THREE.Vector3(x,y,z+.022));}
    if(points.length>2){const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,.019,6,false),hair);group.add(m);}
  }
  if(state.hair!=='bald'){
    const eyeY=(eyeL.y+eyeR.y)/2;const skullY=top-.76;let skullX=.1,minZ=Infinity,maxZ=-Infinity;
    for(const id of bodyIds){const x=p[id*3],y=p[id*3+1],z=p[id*3+2];if(y>eyeY+.13){skullX=Math.max(skullX,Math.abs(x));minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}}
    const cz=(minZ+maxZ)/2,rx=skullX+.10,rz=(maxZ-minZ)/2+.13,ry=top-skullY+.08;
    const hp=[],hi=[],segments=64,rings=20;
    for(let r=0;r<=rings;r++)for(let j=0;j<=segments;j++){
      const phi=j/segments*Math.PI*2,front=Math.cos(phi),t=r/rings;
      const end=front>.25?1.08+(1-front)*.4:1.85+.15*(-front);
      const theta=t*end;let x=Math.sin(theta)*Math.sin(phi)*rx,z=cz+Math.sin(theta)*Math.cos(phi)*rz,y=skullY+Math.cos(theta)*ry;
      if(state.hair==='bob'||state.hair==='long'){
        const fall=smooth(.60,1,t)*(1-smooth(.15,.55,front));
        y-=fall*(state.hair==='long'?2.3:.78);x*=1+fall*.09;z-=fall*.07;
      }
      const wave=Math.sin(phi*9+.3)*.015*Math.sin(theta);hp.push(x*(1+wave),y,z+wave);
      if(r<rings&&j<segments){const a=r*(segments+1)+j,b=a+segments+1;hi.push(a,b,a+1,a+1,b,b+1);}
    }
    // Parametric cap winding faces outward.
    const hg=geometry(new Float32Array(hp),hi);
    const hm=new THREE.Mesh(hg,hair);hm.castShadow=true;group.add(hm);
    if(state.hair==='bun')ell(hair,new THREE.Vector3(0,top+.08,cz-.4),new THREE.Vector3(.40,.37,.36));
  }
  if(state.clothes==='formal'){
    const knotY=neck.y-.65;let front=.4;for(const id of bodyIds)if(Math.abs(p[id*3])<.18&&Math.abs(p[id*3+1]-knotY)<.18)front=Math.max(front,p[id*3+2]);
    const tie=new THREE.Mesh(new THREE.BoxGeometry(.16,.95,.05),dark);tie.position.set(0,knotY-.36,front+.14);group.add(tie);
  }
  const scale=2.22/(top-floor)*( .92+state.height*.0016 );
  group.scale.setScalar(scale);group.position.y=-floor*scale+.005;
  group.userData={height:(top-floor)*scale,faceY:((eyeL.y+eyeR.y)/2-floor)*scale,source:'MakeHuman hm08 CC0'};
  return group;
}
