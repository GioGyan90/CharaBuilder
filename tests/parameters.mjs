import assert from 'node:assert/strict';
import {createDeformer,deformNormal,parameterDefaults,faceAdjustmentKeys} from '../dist/parameters.js';
const landmarks={head:[0,1.42,0],neck:[0,1.35,0],hips:[0,.94,0],leftEye:[.021,1.48,.02],rightEye:[-.021,1.48,.02]};
const state={...parameterDefaults,legs:50,faceWidth:50,jaw:50,eyeSize:50,eyeSpace:50,nose:50,mouth:50,weight:45,shoulders:45};
const neutral=createDeformer(state,landmarks,1);
for(const point of [[.1,.8,.04],[-.08,1.2,.07],[.025,1.48,.10]])assert.deepEqual(neutral(...point,'Body'),[point[0],point[1]+.001,point[2]]);
const normal=deformNormal((x,y,z)=>[x,y,z],0,0,0,.3,.4,.5,'Face');
normal.forEach((v,i)=>assert.ok(Math.abs(v-[.3,.4,.5][i]/Math.sqrt(.5))<1e-7));
for(const key of Object.keys(parameterDefaults).filter(k=>!faceAdjustmentKeys.includes(k)||['forehead','chinLength','noseProjection','mouthHeight'].includes(k))){
 const changed=createDeformer({...state,[key]:100},landmarks,1);let effect=false;
 for(let y=.2;y<1.7;y+=.03)for(const x of [-.1,-.025,0,.025,.1])for(const z of [.04,.1]){
  const point=changed(x,y,z,'Face');assert.ok(point.every(Number.isFinite));
  if(point.some((v,i)=>Math.abs(v-neutral(x,y,z,'Face')[i])>1e-7))effect=true;
  const skin=changed(x,y,z,'Body'),shirt=changed(x,y,z,'Shirt');assert.deepEqual(skin,shirt);
 }
 assert.ok(effect,key+' has no effect');
}
console.log('PASS neutral shape, normal orientation, each body/face parameter and shared clothing deformation');
