export const faceEditorGroups=[
 {id:'contour',title:'脸型与轮廓',keys:['faceWidth','faceHeight','jaw','cheek','chinWidth','chinLength','forehead'],axes:[['jaw','chinLength','下颌宽度','下巴长度'],['faceWidth','faceHeight','脸部宽度','脸部长度']]},
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
