import assert from 'node:assert/strict';
import {deformAnimeFace} from '../dist/face.js';
import {parameterDefaults,createDeformer} from '../dist/parameters.js';
const rig={headX:0,headZ:0,chin:1.30,eyeY:1.43,neckY:1.24,reference:false,preset:{jawMix:0,eyeScale:1},guide:{jawRatios:[1,1,1,1,1]},eyes:[[-.025,1.43,.07],[.025,1.43,.07]],brows:[[-.025,1.46,.07],[.025,1.46,.07]],mouth:[0,1.34,.07],nose:[0,1.39,.08]};
const state={...parameterDefaults,faceWidth:50,eyeSize:50,eyeSpace:50,nose:50,mouth:50};
const points={jaw:[.05,1.355,.07],cheek:[.055,1.4,.07],chin:[0,1.312,.07]};
for(const [key,site,axis] of [['jawDepth','jaw',2],['jawHeight','jaw',1],['cheekboneWidth','cheek',0],['cheekboneHeight','cheek',1],['cheekboneDepth','cheek',2],['chinProjection','chin',2]]){
 const a=deformAnimeFace(...points[site],{...state,[key]:0},rig,'Face:skin'),b=deformAnimeFace(...points[site],{...state,[key]:100},rig,'Face:skin');
 assert.ok(b[axis]-a[axis]>.005,key+' must visibly change the specified axis');
 for(let i=0;i<3;i++)if(i!==axis)assert.equal(b[i],a[i],key+' leaked into another axis');
 for(const region of ['Face:eye0','Face:brow0','Face:mouth'])assert.deepEqual(deformAnimeFace(...points[site],{...state,[key]:150},rig,region),deformAnimeFace(...points[site],state,rig,region),key+' moved facial component');
}
const cheekLow=deformAnimeFace(...points.chin,{...state,cheekboneWidth:0},rig,'Face:skin'),cheekHigh=deformAnimeFace(...points.chin,{...state,cheekboneWidth:100},rig,'Face:skin');assert.equal(cheekLow[0],cheekHigh[0],'cheek width widened the central chin');
const landmarks={head:[0,1.42,0],neck:[0,1.24,0],hips:[0,.94,0],leftEye:rig.eyes[0],rightEye:rig.eyes[1],faceRig:rig};
for(const jaw of [-50,22,150]){
 const {jawWidth,...legacy}=state;
 const old=createDeformer({...legacy,jaw,legs:50,weight:45,shoulders:45},landmarks,1),modern=createDeformer({...state,jawWidth:jaw,legs:50,weight:45,shoulders:45},landmarks,1);
 for(const point of Object.values(points))assert.deepEqual(old(...point,'Face:skin'),modern(...point,'Face:skin'),'legacy geometry changed');
}
for(const value of [-50,150]){
 const extreme={...state,...Object.fromEntries(['jawWidth','jawDepth','jawHeight','jawAngle','cheekboneWidth','cheekboneHeight','cheekboneDepth','chinProjection'].map(k=>[k,value]))};
 for(let y=1.25;y<1.52;y+=.01)for(const x of [-.07,-.03,0,.03,.07])assert.ok(deformAnimeFace(x,y,.07,extreme,rig,'Face:skin').every(Number.isFinite));
}
console.log('PASS structure axes, component isolation, regional chin protection, exact legacy geometry and combined extremes');

// Opposite vertical extremes must not fold the cheek/jaw transition.
for(const jawHeight of [-50,150])for(const jawAngle of [-50,150])for(const cheekboneHeight of [-50,150])for(const faceHeight of [-50,150])for(const x of [.03,.05,.07])for(let y=1.32;y<1.44;y+=.002){
 const mixed={...state,jawHeight,jawAngle,cheekboneHeight,faceHeight};
 const a=deformAnimeFace(x,y,.07,mixed,rig,'Face:skin'),b=deformAnimeFace(x,y+.0001,.07,mixed,rig,'Face:skin');
 assert.ok(b[1]>a[1],'opposite vertical edits fold the cheek/jaw transition');
}
console.log('PASS opposite vertical extremes preserve cheek/jaw surface order');

// New controls move anatomically separate sites; eyebrow position remains separate.
for(const [key,p,axis] of [['browRidgeHeight',rig.brows[0],1],['noseRootDepth',[0,rig.eyeY+.004,.08],2],['noseBridgeWidth',[.010,rig.eyeY-.022,.08],0],['noseTipProjection',[0,rig.nose[1]-.008,.08],2],['noseTipAngle',[0,rig.nose[1]-.008,.08],1]]){
 const region=key==='browRidgeHeight'?'Face:brow0':'Face:skin';
 const a=deformAnimeFace(...p,{...state,[key]:0},rig,region),b=deformAnimeFace(...p,{...state,[key]:100},rig,region);assert.ok(b[axis]-a[axis]>.004,key+' has no visible effect');
 if(key!=='browRidgeHeight')for(const region of ['Face:eye0','Face:mouth'])assert.deepEqual(deformAnimeFace(...p,{...state,[key]:100},rig,region),deformAnimeFace(...p,state,rig,region));
}
console.log('PASS independent brow ridge height, nasal root/bridge/tip axes and eye/mouth isolation');

for(const midFaceLength of [-50,150])for(const lowerFaceLength of [-50,150])for(let y=rig.chin-.015;y<rig.eyeY+.11;y+=.0005){const edit={...state,midFaceLength,lowerFaceLength};const a=deformAnimeFace(.025,y,.07,edit,rig),b=deformAnimeFace(.025,y+.0001,.07,edit,rig);assert.ok(b[1]>a[1],'combined feature lengths folded facial surface');}
console.log('PASS opposing mid/lower-face length extremes preserve vertical surface order');

for(const key of ['chinSize','chinWidth','chinLength'])assert.deepEqual(deformAnimeFace(...rig.mouth,{...state,[key]:150},rig,'Face:mouth'),deformAnimeFace(...rig.mouth,state,rig,'Face:mouth'),'chin edit moved lips: '+key);
console.log('PASS larger chin edits keep mouth fixed');

for(const [key,cy,cz,x] of [['cheekboneAngle',rig.eyeY-.030,.065,.05],['jawTilt',rig.chin+(rig.eyeY-rig.chin)*.42,.055,.05],['chinAngle',rig.chin+.014,.075,.015]]){const pairs=[0,100].map(value=>[-.008,.008].map(dy=>deformAnimeFace(x,cy+dy,cz,{...state,[key]:value},rig)));assert.ok(Math.abs((pairs[0][1][2]-pairs[0][0][2])-(pairs[1][1][2]-pairs[1][0][2]))>.002,key+' must rotate plane instead of just changing depth');for(const region of ['Face:eye0','Face:mouth'])assert.deepEqual(deformAnimeFace(x,cy,cz,{...state,[key]:150},rig,region),deformAnimeFace(x,cy,cz,state,rig,region),key+' moved eyes/lips');}
console.log('PASS three regional plane rotations, separate from depth, with eyes and lips isolated');

for(const key of ['cheekboneAngle','jawTilt','chinAngle'])for(const x of [-.022,0,.022])assert.deepEqual(deformAnimeFace(x,rig.mouth[1],rig.mouth[2],{...state,[key]:150},rig,'Face:skin'),deformAnimeFace(x,rig.mouth[1],rig.mouth[2],state,rig,'Face:skin'),'angle moved lip surface '+key);
console.log('PASS regional angles keep the lip skin plane fixed');
