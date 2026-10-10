export const faceEditorGroups=[
 {id:'contour',title:'脸型与额头',keys:['faceWidth','faceHeight','forehead'],axes:[['faceWidth','faceHeight','脸部宽度','脸部长度']]},
 {id:'cheekbones',title:'颧骨与面颊',keys:['cheekboneWidth','cheekboneHeight','cheekboneDepth','cheek'],axes:[['cheekboneWidth','cheekboneHeight','颧骨宽度','颧骨位置'],['cheek','cheekboneDepth','面颊饱满度','颧骨突出']]},
 {id:'jaw',title:'下颌',keys:['jawWidth','jawDepth','jawHeight','jawAngle'],axes:[['jawWidth','jawHeight','下颌宽度','下颌位置'],['jawWidth','jawDepth','下颌宽度','下颌深度'],['jawAngle','jawDepth','下颌转折','下颌深度']]},
 {id:'chin',title:'下巴',keys:['chinWidth','chinLength','chinProjection'],axes:[['chinWidth','chinLength','下巴宽度','下巴长度'],['chinWidth','chinProjection','下巴宽度','下巴突出']]},
 {id:'eyes',title:'眼睛',keys:['eyeSize','eyeWidth','eyeHeight','eyeSpace','eyeVertical','eyeTilt','eyeColor'],axes:[['eyeSpace','eyeVertical','眼间距','眼部位置'],['eyeWidth','eyeHeight','眼睛宽度','眼睛高度']]},
 {id:'brows',title:'眉毛',keys:['browHeight','browAngle'],axes:[['browAngle','browHeight','眉毛角度','眉毛位置']]},
 {id:'nose',title:'鼻子',keys:['nose','noseWidth','noseHeight','noseProjection'],axes:[['noseWidth','noseHeight','鼻子宽度','鼻部位置'],['noseWidth','noseProjection','鼻子宽度','鼻梁突出']]},
 {id:'mouth',title:'嘴巴',keys:['mouth','mouthHeight','mouthThickness','mouthProjection','mouthCorner'],axes:[['mouth','mouthHeight','嘴巴宽度','嘴部位置'],['mouth','mouthThickness','嘴巴宽度','嘴唇厚度']]},
 {id:'expression',title:'表情',keys:['expression'],axes:[]}
];
export const clampValue=(v,min=-50,max=150)=>Math.max(min,Math.min(max,v));
export function dragValues(initial,dx,dy,axis,{fine=false,side=1,sensitivity=.55}={}){
 const speed=sensitivity*(fine ? .2 : 1);return {[axis[0]]:Math.round(clampValue(initial[axis[0]]+dx*speed*side)),[axis[1]]:Math.round(clampValue(initial[axis[1]]-dy*speed))};
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
 {id:'proportions',title:'整体比例',keys:['height','weight','legs','torsoLength','headSize','neckWidth'],axes:[['weight','height','体型','身高'],['legs','torsoLength','腿长比例','躯干长度']]},
 {id:'shoulderBody',title:'肩部与背部',keys:['shoulders','shoulderSlope','shoulderDepth','backDepth'],axes:[['shoulders','shoulderSlope','肩宽','肩部倾斜'],['shoulderDepth','backDepth','肩部厚度','背部厚度']]},
 {id:'chestBody',title:'胸部',keys:['chest','chestDepth','bustSize','bustHeight'],axes:[['chest','chestDepth','胸廓尺寸','胸廓厚度'],['bustSize','bustHeight','胸部丰满度','胸部位置']]},
 {id:'waistBody',title:'腰部与腹部',keys:['waist','waistHeight','abdomen'],axes:[['waist','waistHeight','腰围','腰线位置'],['waist','abdomen','腰围','腹部丰满度']]},
 {id:'pelvisBody',title:'臀部与胯部',keys:['hips','hipDepth','hipHeight','legSpace'],axes:[['hips','hipHeight','臀围','臀部位置'],['legSpace','hipDepth','双腿间距','臀部厚度']]},
 {id:'armsBody',title:'手臂与手掌',keys:['armLength','upperArm','forearm','handSize'],axes:[['upperArm','armLength','上臂粗细','手臂长度'],['forearm','handSize','前臂粗细','手掌大小']]},
 {id:'legsBody',title:'腿部',keys:['legThickness','thigh','calf','ankle'],axes:[['thigh','calf','大腿粗细','小腿粗细'],['legThickness','ankle','腿部粗细','脚踝粗细']]},
 {id:'feetBody',title:'脚掌',keys:['footLength','footWidth'],axes:[['footWidth','footLength','脚掌宽度','脚掌长度']]},
 {id:'bodyColor',title:'肤色',keys:['skin'],axes:[]}
];
