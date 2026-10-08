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
    const g=geometry(p,indices),normal=g.attributes.normal.array,positions=[],normals=[],rims=[];
    for(let i=0;i<indices.length;i+=3){
      let polygon=indices.slice(i,i+3).map(id=>({v:[p[id*3]+normal[id*3]*inflate,p[id*3+1]+normal[id*3+1]*inflate,p[id*3+2]+normal[id*3+2]*inflate],n:[normal[id*3],normal[id*3+1],normal[id*3+2]],d:field(p[id*3],p[id*3+1],p[id*3+2])}));
      const clipped=[],cuts=[];
      for(let j=0;j<polygon.length;j++){
        const a=polygon[j],b=polygon[(j+1)%polygon.length];
        if(a.d>=0)clipped.push(a);
        if((a.d>=0)!==(b.d>=0)){const t=a.d/(a.d-b.d);const cut={v:a.v.map((v,k)=>THREE.MathUtils.lerp(v,b.v[k],t)),n:a.n.map((v,k)=>THREE.MathUtils.lerp(v,b.n[k],t))};clipped.push(cut);cuts.push(cut);}
      }
      if(inflate>0&&cuts.length===2){const [a,b]=cuts;const inner=v=>v.v.map((x,k)=>x-v.n[k]*inflate*.95);rims.push(...a.v,...b.v,...inner(b),...a.v,...inner(b),...inner(a));}
      for(let j=1;j<clipped.length-1;j++)for(const v of [clipped[0],clipped[j],clipped[j+1]]){positions.push(...v.v);normals.push(...v.n);}
    }
    g.dispose();const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));out.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));out.normalizeNormals();const m=new THREE.Mesh(out,material);m.castShadow=true;m.receiveShadow=true;group.add(m);
    if(rims.length){const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(rims,3));rg.computeVertexNormals();const rim=new THREE.Mesh(rg,material);rim.castShadow=true;group.add(rim);}
  }
  const tights=bodyIndices; // Shared topology prevents mismatched boundaries during body morphs.
  shirt.side=pants.side=shoe.side=hair.side=THREE.DoubleSide;
  const shirtField=(x,y)=>Math.min(y-waist,neck.y-.13-y,state.clothes==='sport'?shoulder.x*.94-Math.abs(x):Math.max(shoulder.x+.15-Math.abs(x),Math.min(y-elbow.y-.7,shoulder.x+1-Math.abs(x))));
  const pantsField=(x,y)=>Math.min(waist+.06-y,y-ankle,shoulder.x+1-Math.abs(x));
  const shoeField=(x,y)=>Math.min(ankle+.025-y,shoulder.x+1-Math.abs(x));
  // Hide only skin safely inside clothing; retain a skin overlap beneath every hem.
  garmentSurface(bodyIndices,skin,(x,y)=>.045-Math.max(shirtField(x,y),pantsField(x,y),shoeField(x,y)),0);
  garmentSurface(tights,shirt,shirtField,.11);
  garmentSurface(tights,pants,pantsField,.075);
  garmentSurface(tights,shoe,shoeField,.12);
  if(state.clothes==='dress'){
    // Conservative elliptical skirt rings enclose both thighs, including the heavy presets.
    const points=[],faces=[],segments=64,rows=20,bottom=pelvis.y-3.45;
    for(let r=0;r<=rows;r++){
      const t=r/rows,y=THREE.MathUtils.lerp(waist+.10,bottom,t);let rx=0,minZ=Infinity,maxZ=-Infinity;
      for(const id of bodyIds){if(Math.abs(p[id*3+1]-y)<.22&&Math.abs(p[id*3])<shoulder.x+1){rx=Math.max(rx,Math.abs(p[id*3]));minZ=Math.min(minZ,p[id*3+2]);maxZ=Math.max(maxZ,p[id*3+2]);}}
      const cz=(minZ+maxZ)/2;let rz=(maxZ-minZ)/2;
      // Scale the ellipse until every sampled body point is contained, then add fabric ease.
      let fit=1;for(const id of bodyIds){if(Math.abs(p[id*3+1]-y)<.22&&Math.abs(p[id*3])<shoulder.x+1)fit=Math.max(fit,Math.hypot(p[id*3]/Math.max(rx,.1),(p[id*3+2]-cz)/Math.max(rz,.1)));}
      rx=rx*fit+.15+t*.16;rz=rz*fit+.15+t*.14;
      for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2;points.push(Math.sin(a)*rx,y,cz+Math.cos(a)*rz);if(r<rows&&j<segments){const n=r*(segments+1)+j,m=n+segments+1;faces.push(n,m,n+1,n+1,m,m+1);}}
    }
    mesh(new Float32Array(points),faces,shirt);
  }
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
    const eyeY=(eyeL.y+eyeR.y)/2,skullY=top-.80;
    let minZ=Infinity,maxZ=-Infinity;
    for(const id of bodyIds)if(p[id*3+1]>eyeY+.10){minZ=Math.min(minZ,p[id*3+2]);maxZ=Math.max(maxZ,p[id*3+2]);}
    const cz=(minZ+maxZ)/2,center=new THREE.Vector3(0,skullY,cz);
    // Project the cap onto the current sculpted skull; never stretch the cap down to make long hair.
    const upper=[];for(let i=0;i<bodyIndices.length;i+=3){const face=bodyIndices.slice(i,i+3);if(face.some(id=>p[id*3+1]>neck.y-2.1))upper.push(...face);}
    const collisionMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
    const collider=new THREE.Mesh(geometry(p,upper),collisionMaterial);collider.updateMatrixWorld(true);
    const ray=new THREE.Raycaster(),direction=new THREE.Vector3();
    function outside(origin,dir,padding,fallback){ray.set(origin,dir);const hits=ray.intersectObject(collider,false);const distance=hits.length?hits[hits.length-1].distance:fallback;return origin.clone().addScaledVector(dir,distance+padding);}
    const positions=[],indices=[],edge=[],segments=48,rows=18;
    for(let r=0;r<=rows;r++)for(let j=0;j<=segments;j++){
      const phi=j/segments*Math.PI*2,front=Math.cos(phi);
      const end=THREE.MathUtils.lerp(1.13,2.03,1-smooth(-.25,.65,front));
      const theta=r/rows*end;direction.set(Math.sin(theta)*Math.sin(phi),Math.cos(theta),Math.sin(theta)*Math.cos(phi));
      const q=outside(center,direction,.085,.75);positions.push(q.x,q.y,q.z);if(r===rows)edge.push(q);
      if(r<rows&&j<segments){const n=r*(segments+1)+j,m=n+segments+1;indices.push(n,m,n+1,n+1,m,m+1);}
    }
    const cap=mesh(new Float32Array(positions),indices,hair);cap.name='fitted-scalp';
    if(state.hair==='bob'||state.hair==='long'){
      const hp=[],hi=[],rings=16;
      for(let r=0;r<=rings;r++)for(let j=0;j<=segments;j++){
        const phi=j/segments*Math.PI*2,front=Math.cos(phi),t=r/rings,start=edge[j];
        const back=1-smooth(-.35,.30,front);
        const hem=state.hair==='long'?neck.y+.30-1.65*smooth(.0,.70,-front):eyeY-.88;
        const y=THREE.MathUtils.lerp(start.y,Math.min(start.y,hem),t*back);
        const origin=new THREE.Vector3(0,y,cz);direction.set(Math.sin(phi),0,Math.cos(phi));
        const clear=outside(origin,direction,.34,.65);
        const startRadius=Math.hypot(start.x,start.z-cz);let radius=Math.max(startRadius,Math.hypot(clear.x,clear.z-cz));
        // A vertical/angular neighborhood protects the space between hair triangles at the shoulder.
        for(const id of bodyIds){if(Math.abs(p[id*3+1]-y)>.28)continue;const vx=p[id*3],vz=p[id*3+2]-cz,length=Math.hypot(vx,vz);if(length>.01&&(vx*direction.x+vz*direction.z)/length>.977)radius=Math.max(radius,length+.34);}
        const wanted=origin.clone().addScaledVector(direction,radius+.025*Math.sin(t*Math.PI));
        const blend=smooth(0,.16,t);hp.push(THREE.MathUtils.lerp(start.x,wanted.x,blend),y,THREE.MathUtils.lerp(start.z,wanted.z,blend));
        if(r<rings&&j<segments&&front<.30&&Math.cos((j+1)/segments*Math.PI*2)<.30){const n=r*(segments+1)+j,m=n+segments+1;hi.push(n,m,n+1,n+1,m,m+1);}
      }
      const drape=mesh(new Float32Array(hp),hi,hair);drape.name='collision-fitted-hair';
    }
    collider.geometry.dispose();collisionMaterial.dispose();
    if(state.hair==='bun')ell(hair,new THREE.Vector3(0,top+.12,cz-.35),new THREE.Vector3(.38,.36,.35));
  }
  if(state.clothes==='formal'){
    const points=[],faces=[],rows=12;
    for(let r=0;r<=rows;r++){
      const y=neck.y-.43-r/rows*.97;let front=-Infinity;
      for(const id of bodyIds)if(Math.abs(p[id*3])<.23&&Math.abs(p[id*3+1]-y)<.15)front=Math.max(front,p[id*3+2]);
      if(!Number.isFinite(front))front=.7;
      const width=r===rows?.012:.085;points.push(-width,y,front+.18,width,y,front+.18);
      if(r<rows){const n=r*2;faces.push(n,n+2,n+1,n+1,n+2,n+3);}
    }
    dark.side=THREE.DoubleSide;mesh(new Float32Array(points),faces,dark);
  }
  const scale=2.22/(top-floor)*( .92+state.height*.0016 );
  group.scale.setScalar(scale);group.position.y=-floor*scale+.005;
  group.userData={height:(top-floor)*scale,faceY:((eyeL.y+eyeR.y)/2-floor)*scale,source:'MakeHuman hm08 CC0'};
  return group;
}
