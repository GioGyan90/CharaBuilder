import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {cameraAngles,cameraYaw,anglePosition,selectedAngle,screenDragSide,moveCameraTarget} from '../dist/view.js';
const target={x:.21,y:1.7,z:-.13},position={x:1.1,y:2,z:3.1};
const distance=Math.hypot(position.x-target.x,position.z-target.z);
for(const angle of cameraAngles){const [x,y,z]=anglePosition(position,target,angle.yaw);const result={x,y,z};assert.equal(y,position.y);assert.ok(Math.abs(Math.hypot(x-target.x,z-target.z)-distance)<1e-10);assert.equal(selectedAngle(cameraYaw(result,target)),angle.id);}
assert.equal(selectedAngle(.2),null);assert.equal(selectedAngle(-Math.PI),'back');
assert.equal(screenDragSide(1,0,'jawWidth'),1);assert.equal(screenDragSide(-1,0,'jawWidth'),-1);assert.equal(screenDragSide(1,Math.PI,'jawWidth'),-1);assert.equal(screenDragSide(-1,Math.PI,'jawWidth'),1);assert.equal(screenDragSide(1,Math.PI/2,'jawDepth'),-1);assert.equal(screenDragSide(1,-Math.PI/2,'jawDepth'),1);
const offset=[position.x-target.x,position.y-target.y,position.z-target.z];moveCameraTarget(position,target,.28);[position.x-target.x,position.y-target.y,position.z-target.z].forEach((v,i)=>assert.ok(Math.abs(v-offset[i])<1e-12));
// Activating/starting another parameter drag must keep OrbitControls live and not reframe.
const text=await fs.readFile(new URL('../dist/app.js',import.meta.url),'utf8');const begin=text.slice(text.indexOf('function beginDirectEdit()'),text.indexOf('function finishDirectEdit()'));
let views=[],syncs=0;const orbit={enabled:false,autoRotate:true},camera={position:{x:1,y:2,z:3}},button={classList:{add(){},remove(){}},setAttribute(){}};
const api=new Function('orbit','camera','$','setView','syncMotionControls','syncHandleVisibility',`let activeTab='face',currentView='face',directFaceEdit=false,motionMode='relaxed',motionTime=10,motionPlaying=true;${begin};return {beginDirectEdit,get:()=>({directFaceEdit,motionMode,motionTime,motionPlaying})};`)(orbit,camera,()=>button,v=>views.push(v),()=>syncs++,()=>{});
api.beginDirectEdit();api.beginDirectEdit();assert.equal(orbit.enabled,true);assert.equal(orbit.autoRotate,false);assert.deepEqual(camera.position,{x:1,y:2,z:3});assert.deepEqual(views,[]);assert.deepEqual(api.get(),{directFaceEdit:true,motionMode:'rest',motionTime:0,motionPlaying:false});assert.equal(syncs,2);
console.log('PASS six camera angles, zoom/elevation/pan preservation, rear/profile drag signs and camera stays enabled across repeated parameter drags');

// Exercise the real vendored OrbitControls, including its pending damping rotation.
const {pathToFileURL,fileURLToPath}=await import('node:url');const os=await import('node:os');const path=await import('node:path');
const dist=fileURLToPath(new URL('../dist/',import.meta.url)),tmp=await fs.mkdtemp(path.join(os.tmpdir(),'charabuilder-view-'));
const controlsText=(await fs.readFile(dist+'vendor/OrbitControls.js','utf8')).replace("'three'",JSON.stringify(pathToFileURL(dist+'vendor/three.module.js').href));
await fs.writeFile(path.join(tmp,'controls.mjs'),controlsText);const THREE=await import(pathToFileURL(dist+'vendor/three.module.js').href);const {OrbitControls}=await import(pathToFileURL(path.join(tmp,'controls.mjs')).href);
const root={addEventListener(){},removeEventListener(){}},canvas={style:{},addEventListener(){},removeEventListener(){},getRootNode:()=>root,ownerDocument:root,clientWidth:700,clientHeight:700};
const realCamera=new THREE.PerspectiveCamera(36,1,.05,100);realCamera.position.set(.5,2,3);const controls=new OrbitControls(realCamera,canvas);controls.target.set(.21,1.7,-.13);controls.enableDamping=true;controls.enablePan=true;controls.update();
const angleFunction=text.slice(text.indexOf('function setCameraAngle('),text.indexOf('function setView('));const snap=new Function('cameraAngles','camera','orbit','$','anglePosition','syncCameraAngles',angleFunction+'return setCameraAngle;')(cameraAngles,realCamera,controls,()=>button,anglePosition,()=>{});
for(const angle of cameraAngles){controls._sphericalDelta.theta=.22;snap(angle.id);const before=realCamera.position.clone();for(let i=0;i<100;i++)controls.update();assert.ok(before.distanceTo(realCamera.position)<1e-10,'pending damping moved the chosen camera angle');assert.equal(selectedAngle(cameraYaw(realCamera.position,controls.target)),angle.id);assert.equal(controls.enabled,true);assert.equal(controls.enableDamping,true);assert.equal(controls.enablePan,true);}
controls.dispose();await fs.rm(tmp,{recursive:true,force:true});console.log('PASS real OrbitControls camera snaps consume damping and preserve editing navigation');
