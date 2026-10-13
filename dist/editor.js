export const faceHandleIds=['contour','eyes','eyes','brows','brows','cheekbones','cheekbones','nose','mouth','jaw','jaw','chin'];
export const faceEditorGroups=[
 {id:'contour',title:'脸型与额头',keys:['faceWidth','faceHeight','midFaceLength','lowerFaceLength','forehead'],axes:[['faceWidth','faceHeight','脸部宽度','脸部长度'],['midFaceLength','lowerFaceLength','中庭长度','下庭长度']]},
 {id:'cheekbones',title:'颧骨与面颊',keys:['cheekboneWidth','cheekboneHeight','cheekboneDepth','cheekboneAngle','cheekboneSharpness','cheek'],axes:[['cheekboneWidth','cheekboneHeight','颧骨宽度','颧骨位置'],['cheek','cheekboneDepth','面颊饱满度','颧骨前后深度'],['cheekboneDepth','cheekboneAngle','颧骨深度','颧骨倾角']]},
 {id:'jaw',title:'下颌',keys:['jawWidth','jawDepth','jawHeight','jawAngle','jawTilt'],axes:[['jawWidth','jawHeight','下颌宽度','下颌位置'],['jawWidth','jawDepth','下颌宽度','下颌深度'],['jawAngle','jawDepth','下颌转折','下颌深度'],['jawDepth','jawTilt','下颌深度','下颌倾角']]},
 {id:'chin',title:'下巴',keys:['chinSize','chinWidth','chinLength','chinProjection','chinAngle'],axes:[['chinWidth','chinLength','下巴宽度','下巴长度'],['chinWidth','chinProjection','下巴宽度','下巴前后深度'],['chinProjection','chinAngle','下巴深度','下巴倾角']]},
 {id:'eyes',title:'眼睛',keys:['eyeSize','eyeWidth','eyeHeight','eyeSpace','eyeVertical','eyeTilt','eyeDepth','irisSize','eyeColor'],axes:[['eyeSpace','eyeVertical','眼间距','眼部位置'],['eyeWidth','eyeHeight','眼睛宽度','眼睛高度'],['eyeSize','irisSize','眼睛大小','虹膜 / 瞳孔比例'],['eyeDepth','eyeVertical','眼窝深度','眼部位置']]},
 {id:'brows',title:'眉毛',keys:['browHeight','browAngle','browThickness','browRidge','browRidgeHeight'],axes:[['browAngle','browHeight','眉毛角度','眉毛位置'],['browThickness','browRidge','眉毛粗细','眉弓前后深度'],['browRidge','browRidgeHeight','眉弓深度','眉弓高度']]},
 {id:'nose',title:'鼻子',keys:['nose','noseLength','noseWidth','noseHeight','noseProjection','noseRootDepth','noseBridgeWidth','noseTipProjection','noseTipAngle'],axes:[['noseWidth','noseHeight','鼻子宽度','鼻部位置'],['noseBridgeWidth','noseRootDepth','鼻梁宽度','鼻根深度'],['noseTipProjection','noseTipAngle','鼻尖深度','鼻尖角度']]},
 {id:'mouth',title:'嘴巴',keys:['mouth','mouthHeight','mouthThickness','mouthProjection','mouthCorner'],axes:[['mouth','mouthHeight','嘴巴宽度','嘴部位置'],['mouth','mouthThickness','嘴巴宽度','嘴唇厚度']]},
 {id:'expression',title:'表情',keys:['expression'],axes:[]}
];
export const clampValue=(v,min=-50,max=150)=>Math.max(min,Math.min(max,v));
export function dragValues(initial,dx,dy,axis,{fine=false,side=1,sensitivity=.55}={}){
 const limits=bodyEditorGroups.some(g=>g.keys.includes(axis[0]))?[-100,200]:[-50,150];const speed=sensitivity*(fine ? .2 : 1);return {[axis[0]]:Math.round(clampValue(initial[axis[0]]+dx*speed*side,...limits)),[axis[1]]:Math.round(clampValue(initial[axis[1]]-dy*speed,...limits))};
}
// Pointer capture keeps both mouse and touch drags working beyond the pad edges.
export function bindDrag(target,{read,axis,write,begin=()=>{},end=()=>{},side=()=>1,paint=()=>{}}){
 let drag=null;
 target.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();begin();drag={id:e.pointerId,x:e.clientX,y:e.clientY,state:{...read()},axis:[...axis()],side:side()};target.setPointerCapture(e.pointerId);target.classList.add('dragging');});
 target.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();write(dragValues(drag.state,e.clientX-drag.x,e.clientY-drag.y,drag.axis,{fine:e.shiftKey,side:drag.side}));paint();});
 const stop=e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;target.classList.remove('dragging');if(target.hasPointerCapture(e.pointerId))target.releasePointerCapture(e.pointerId);end();};
 target.addEventListener('pointerup',stop);target.addEventListener('pointercancel',stop);target.addEventListener('lostpointercapture',stop);
}

export const bodyEditorGroups=[
 {id:'proportions',title:'整体比例',keys:['height','weight','legs','torsoLength','headSize','neckWidth','muscleMass'],axes:[['weight','height','体型','身高'],['legs','torsoLength','腿长比例','躯干长度']]},
 {id:'shoulderBody',title:'肩部与背部',keys:['shoulders','shoulderSlope','shoulderDepth','backDepth','scapulaVolume','trapezius','latWidth','deltoid'],axes:[['shoulders','shoulderSlope','肩宽','肩部倾斜'],['shoulderDepth','backDepth','肩部厚度','背部厚度'],['latWidth','trapezius','背阔肌宽度','斜方肌体积'],['scapulaVolume','backDepth','肩胛体积','背部厚度'],['deltoid','muscleMass','肩部肌肉','肌肉量']]},
 {id:'chestBody',title:'胸部',keys:['ribWidth','pecVolume','chest','chestDepth','bustSize','bustHeight'],axes:[['chest','chestDepth','胸廓尺寸','胸廓厚度'],['ribWidth','pecVolume','肋廓宽度','胸肌体积'],['bustSize','bustHeight','胸部丰满度','胸部位置']]},
 {id:'waistBody',title:'腰部与腹部',keys:['waist','waistHeight','abdomen'],axes:[['waist','waistHeight','腰围','腰线位置'],['waist','abdomen','腰围','腹部丰满度']]},
 {id:'pelvisBody',title:'臀部与胯部',keys:['hips','hipDepth','hipHeight','gluteVolume','legSpace'],axes:[['hips','hipHeight','臀围','臀部位置'],['legSpace','hipDepth','双腿间距','臀部厚度'],['gluteVolume','hipDepth','臀肌体积','臀部厚度']]},
 {id:'armsBody',title:'手臂与手掌',keys:['armLength','upperArm','forearm','handSize'],axes:[['upperArm','armLength','上臂粗细','手臂长度'],['forearm','handSize','前臂粗细','手掌大小']]},
 {id:'legsBody',title:'腿部',keys:['legThickness','thigh','thighDepth','calf','calfDepth','kneeWidth','ankle'],axes:[['thigh','calf','大腿粗细','小腿粗细'],['thigh','thighDepth','大腿宽度','大腿厚度'],['calf','calfDepth','小腿宽度','小腿厚度'],['kneeWidth','ankle','膝盖宽度','脚踝粗细'],['legThickness','ankle','腿部粗细','脚踝粗细']]},
 {id:'feetBody',title:'脚掌',keys:['footLength','footWidth'],axes:[['footWidth','footLength','脚掌宽度','脚掌长度']]},
 {id:'bodyColor',title:'肤色',keys:['skin'],axes:[]}
];
