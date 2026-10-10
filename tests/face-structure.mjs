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
